---
title: Operations and consumer lag
sidebar_position: 5
description: "Consumer lag is the number-one health metric; measuring and diagnosing it with kafka-consumer-groups."
tags: [consumer-lag, operations, monitoring, partitions, reassignment]
domain: data-engineering
category: concept
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

> **Takeaway:** consumer lag = log-end-offset − committed-offset; it's the number-one health metric of a Kafka pipeline, and `kafka-consumer-groups --describe` is the first place you look when something is slow.

Assumes you've got [topic, partition, offset](../reference/topic-partition-offset.md) and [consumer groups](consumer-groups.md). This is how to measure health and diagnose bad numbers.

## What consumer lag is and why it's number one

Lag is defined **per partition**, precisely as the difference of two offsets:

```text
lag(partition) = LEO (log-end-offset, message mới nhất broker có)
                 − committed-offset (consumer group đã commit tới)
lag(group)     = tổng lag của mọi partition group đang giữ
```

Note the distinction: the LEO is the **offset to be written next** (the log's tail), while the committed-offset is the offset the consumer has **committed** — not necessarily the offset it has read (it may have read further without committing). So lag reflects **confirmed processing** progress, not reading progress.

Lag is **the number of messages the consumer owes**. Why it's the most important metric:

- Lag steady around a low level → the consumer keeps up with the producer. Healthy.
- Lag **rising steadily** → the consumer is slower than the producer, and sooner or later it'll be seriously late.
- Lag spiking → something's wrong (a dead consumer, continuous rebalancing, a producer burst).

One number, directly reflecting the downstream experience (how stale the data is). Measure it and you've measured health.

## Measuring with kafka-consumer-groups

```bash
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group orders-consumer
```

Illustrative output, not run:

```text
# Output minh hoạ — chưa chạy (không dựng được cluster)
GROUP            TOPIC    PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG   CONSUMER-ID       HOST
orders-consumer  orders   0          15230           15240           10    consumer-1-abc    /10.0.0.11
orders-consumer  orders   1          15100           18900           3800  consumer-2-def    /10.0.0.12
orders-consumer  orders   2          15220           15225           5     consumer-1-abc    /10.0.0.11
```

> `localhost:9092` is Kafka's common **default** port, not your real host — replace it with your actual bootstrap server.

Reading the columns:

| Column | Meaning |
|---|---|
| `CURRENT-OFFSET` | The group's committed-offset for this partition (how far it's processed & committed) |
| `LOG-END-OFFSET` | The LEO — the log's tail, the newest message the broker has |
| `LAG` | `LOG-END-OFFSET − CURRENT-OFFSET` |
| `CONSUMER-ID` | The member currently holding this partition. **Empty** = no member holds it (the group is dead or hasn't joined) |
| `HOST` | The member's host |

In the example: partition 1 has a lag of 3800 while the other two are near 0. That's **load skew** or one partition with a hot key — not the whole group being slow. Look per partition, not just at the total. If `CONSUMER-ID` is empty while `LAG` is large, it means **nobody is reading** that partition — an entirely different alarm from "reading but slowly".

## The important metrics via JMX

The `--describe` command is a manual snapshot; continuous monitoring must go through the broker's and clients' JMX metrics:

| Metric | Where | Meaning / alarm |
|---|---|---|
| `records-lag-max` | Consumer client | The largest lag across the partitions this consumer holds; a steady rise → the consumer is struggling |
| `under-replicated-partitions` | Broker | The number of partitions with ISR < replication factor; above 0 for long → fault tolerance lost |
| `offline-partitions-count` | Controller | Partitions with no leader; above 0 is a red alert, nothing can be read or written |
| `active-controller-count` | Broker | The cluster-wide total must be exactly 1; anything else → a controller incident |
| `request latency` (produce/fetch p99) | Broker | A spike → the broker is overloaded, disk/network congested |
| `isr-shrinks-rate` / `isr-expands-rate` | Broker | The ISR shrinking/expanding continuously → replicas can't keep up |

- **Under-replicated partitions**: a replica has fallen behind or a broker dropped. Sustained → fault tolerance is lost, and with a high `min.insync.replicas` it can **block producers entirely** (`acks=all` lacking enough in-sync replicas to confirm).
- **Offline partitions**: a partition with no leader — nothing can be read or written. A red alert.

Both can also be checked quickly with `kafka-topics --describe` (comparing the `Isr` column against `Replicas`).

### Monitoring tools

- **Burrow** (LinkedIn): dedicated to tracking consumer lag, evaluating group health by **trend** (not just an absolute threshold) — good for lag alerting.
- **Cruise Control** (LinkedIn): automatic cluster balancing — it detects load skew and generates/runs a reassignment plan, with throttling included. It replaces writing `plan.json` by hand.

## Symptom → cause → where to look

| Symptom | Likely cause | Where to look |
|---|---|---|
| Lag rising steadily on every partition | The consumer is slower than the producer (insufficient capacity) | `records-lag-max`, consumer CPU, a slow downstream |
| Lag on only one/a few partitions | A hot key, a skewed distribution | LAG per partition, the key distribution |
| Large lag with an empty `CONSUMER-ID` | No member holds the partition (the group is dead/hasn't joined) | `--describe`, consumer logs, how many instances are running |
| Lag sawtoothing | Continuous rebalancing | [continuous rebalancing](../case-studies/rebalance-lien-tuc.md), the rebalance logs |
| Lag spiking then recovering | A producer burst | Producer throughput over time |
| Producers blocked / write errors | Under-replicated + `min.insync.replicas` | `under-replicated-partitions`, the ISR |
| Nothing can be read or written at all | Offline partitions | `offline-partitions-count`, the controller |
| Fetch/produce slow across the board | The broker is overloaded | `request latency` p99, broker disk/network |

## Scaling consumers: the partition-count trap

To consume faster you add consumers to the group. But:

> The maximum useful consumer count = **the partition count**. Consumer N+1 (N = the partition count) **sits idle** — it's assigned no partition at all.

If you already have 6 partitions and 6 consumers and still have lag, adding a 7th is pointless — it just waits, and even causes one more rebalance when it joins. At that point you have to **increase the partition count** first (then scale consumers), or optimise each consumer's processing speed. Remember the warning in [producer tuning](producer-tuning.md): increasing the partition count changes `hash(key) % N` and affects per-key ordering.

## Partition reassignment and throttling

When adding brokers or when load is skewed between brokers, move replicas with:

```bash
# 1. Sinh kế hoạch đề xuất
kafka-reassign-partitions --bootstrap-server localhost:9092 \
  --topics-to-move-json-file topics.json --broker-list "1,2,3,4" --generate

# 2. Chạy kế hoạch, KÈM throttle để không bão hoà mạng
kafka-reassign-partitions --bootstrap-server localhost:9092 \
  --reassignment-json-file plan.json --execute \
  --throttle 50000000   # ~50 MB/s, số minh hoạ — chỉnh theo băng thông thật

# 3. Kiểm tiến độ và gỡ throttle khi xong
kafka-reassign-partitions --bootstrap-server localhost:9092 \
  --reassignment-json-file plan.json --verify
```

A reassignment **copies data over the network** between brokers to balance data and leadership. Without throttling, that copying competes for bandwidth with real production traffic — produce/fetch slow down and lag rises. Always `--throttle` and do it outside peak hours; remember `--verify` to remove the throttle when it's done (a throttle left hanging squeezes ordinary replication too).

## Sizing partitions by throughput

Choosing the partition count isn't "more is better" — many partitions add metadata cost, file handles, and longer rebalances. The sizing principle by target throughput (illustrative, not run):

```text
# Số minh hoạ — chưa chạy
Throughput mục tiêu:        600 MB/s
Throughput một partition
  (giới hạn bởi consumer):  ~50 MB/s   (đo từ benchmark của bạn)
→ số partition tối thiểu = 600 / 50 = 12

Đối chiếu phía producer:
  một partition ghi được:   ~100 MB/s
→ producer cần tối thiểu = 600 / 100 = 6

Lấy max(12, 6) = 12, cộng dư để scale → chọn ~16–18
```

The rough rules:

- `partition count ≥ max(target/per-partition-consumer-throughput, target/per-partition-producer-throughput)`.
- `partition count ≥ the peak consumer count` you plan to run.
- Leave headroom to scale — because **increasing partitions is easy, decreasing isn't**, and increasing breaks per-key ordering.

## Common Mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Adding consumers beyond the partition count | The surplus sit idle and lag doesn't fall | Increase partitions first, then scale |
| Only looking at total lag | Missing one hot partition | Look at LAG per partition |
| Ignoring an empty `CONSUMER-ID` | Assuming lag means slowness when in fact nobody is reading | Check which member holds the partition |
| Ignoring sustained under-replication | Fault tolerance lost, producers possibly blocked | Watch the ISR, deal with a dropped broker early |
| Reassigning at peak hours without throttling | Bandwidth crushed, real traffic affected | Throttle, do it off-peak, `--verify` to remove the throttle |

## FAQ

<details>
<summary>Does lag of 0 always mean healthy?</summary>

Not necessarily. Lag 0 can mean the consumer is keeping up, but it can also mean the consumer is dead and no producer is writing anything. Look at it together with throughput and `CONSUMER-ID` in `--describe`: with no active consumer, lag 0 is an illusion.

</details>

<details>
<summary>Should lag alerts use an absolute threshold or a trend?</summary>

A trend is more reliable. An absolute threshold depends on each topic's throughput. Alerting when lag **rises continuously** over a period catches the problem earlier than waiting for it to hit a fixed number. That's exactly why Burrow evaluates by trend.

</details>

<details>
<summary>Are committed-offset and current-offset in --describe the same thing?</summary>

`CURRENT-OFFSET` in the output *is* the group's committed-offset — the offset committed, not the most recently read one. A consumer may have read further without committing, and the lag shown still counts against what was committed.

</details>

## Related Topics

- [Topic, partition, offset](../reference/topic-partition-offset.md)
- [Consumer groups and rebalance](consumer-groups.md)
- [Producer tuning](producer-tuning.md)
- [Replication and durability](../reference/replication-durability.md)
- [Case study — continuous rebalancing](../case-studies/rebalance-lien-tuc.md)
- [Kafka index](../index.md)
