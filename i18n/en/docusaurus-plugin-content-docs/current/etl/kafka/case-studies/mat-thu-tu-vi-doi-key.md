---
title: Losing ordering by changing the partition key
sidebar_position: 1
description: "Changing the key mid-flight puts one entity's events on different partitions — and ordering breaks."
tags: [kafka, partition-key, ordering, producer]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Losing ordering by changing the partition key

> **Takeaway:** ordering is only guaranteed *within one partition*, and the key decides the partition — changing the key mid-flight is scattering one entity's events across several partitions with your own hands, and ordering breaks immediately.

## Label

**A reconstructed situation** — not a real production incident. The numbers below are **illustrative, not run on a cluster**, but internally consistent so the reasoning can be followed.

## Context

The `user-events` topic has **6 partitions**. The producer originally set `key = user_id`, so all of a user's events always landed in the same partition → consumers saw `create` and then `update`, in the right order.

An apparently harmless change: someone edited the producer to "spread the load more evenly", switching to `key = null` (round-robin) — or `key = event_type`. From that moment, two events for the same `user_id` could land on two different partitions.

## Symptoms

*Illustrative numbers — not run:*

- Downstream reported ~**0.3%** of users with state "update before create" — for instance, a just-created user showing `status=updated` with no preceding `created` record.
- It only happened for users with **several events close together** (within a few hundred ms); users with sparse events showed nothing.
- `kafka-consumer-groups --describe` showed even lag with no partition backed up abnormally.

## The wrong hypotheses at first

1. **Suspecting a multi-threaded consumer.** Thinking the consumer processed across several threads and so reordered things. Time was lost forcing the consumer back to single-threaded — still wrong. (Because the root cause was on the producer side, not the consumer.)
2. **Suspecting clock skew between services.** Comparing `event_time` between producer and consumer, adjusting NTP. Irrelevant — Kafka guarantees ordering by *offset within a partition*, not by timestamp.

Where the time went: both hypotheses looked at the consumer side, while the ordering had already broken *before* the consumer read anything.

## The real cause

Kafka's ordering only exists **inside one partition**. There's no such thing as "ordering across a whole topic". The partition is chosen by `hash(key) % num_partitions` (when there's a key), or round-robin/sticky (when `key=null`).

Changing the key from `user_id` to `null`/`event_type` means two events for the same user no longer share a partition → the consumer reads them from two independent partitions, with nothing forcing `create` to arrive before `update`.

## The fix

1. **Fix the key to the entity whose ordering you need.** Events for the same user get `key = user_id`. This is a contract, not an optimisation detail — don't change it to "balance the load".

   ```properties
   # producer: key phải ổn định theo thực thể cần thứ tự
   # (đặt ở tầng ứng dụng khi build ProducerRecord, không phải config)
   ```

2. **If you're forced to change the partitioning** (changing the partition count, changing the key): you must **drain** — stop the producer, let consumers read the backlog dry, and only then change. Changing it live is guaranteed to leave a window where old events (old partition) and new ones (new partition) overlap.

3. If load is skewed because some users are too hot (a hot key), solve it with **more partitions + a composite key** (`user_id` + a bucket) rather than dropping the key.

## How to spot it early

Check straight away which partitions a suspect `user_id` appears in:

```bash
# Với mỗi partition, đọc và grep user_id — nếu >1 partition có nó thì thứ tự đã vỡ
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic user-events --partition 0 --from-beginning --timeout-ms 5000 \
  --property print.partition=true | grep '"user_id":"U123"'
```

If the same `user_id` appears in several partitions → the key isn't stable. The guardrail: review every change to key-selection logic as if it were a schema change.

## Related Topics

- [Topic, partition, offset](../reference/topic-partition-offset.md) — why ordering is only within one partition
- [Producer tuning](../skills/producer-tuning.md) — key → partition, and the trade-offs in choosing a key
- [Kafka](../index.md) — the topic this case study belongs to
