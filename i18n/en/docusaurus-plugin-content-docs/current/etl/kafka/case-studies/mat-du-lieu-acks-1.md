---
title: Losing data with acks=1
sidebar_position: 3
description: "The leader dies before a follower copies — and a message reported as successful vanishes."
tags: [kafka, acks, durability, replication, isr]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Losing data with acks=1

> **Takeaway:** with `acks=1`, the producer counts it a "success" the moment the *leader* receives it — if the leader dies before a follower has replicated, that follower becomes leader and the message vanishes, even though the producer reported OK.

## Label

**A reconstructed situation** — the figures are **illustrative, not run on a cluster**, but internally consistent.

## Context

The `payments` topic has `replication.factor=3`. The producer is configured with `acks=1` (the historical default of many older clients). The application reads the returned `RecordMetadata`, logs "sent successfully" and considers it done.

During one maintenance window / hardware fault, the broker that was **leader** of a few partitions restarted exactly at high load.

## Symptoms

*Illustrative numbers — not run:*

- The end-of-day reconciliation: **the producer logged 1,000,000 records sent**, while the consumer only read **999,987**. A gap of **13 records**.
- All 13 missing records have timestamps inside a **~2 second window around one leader election** (visible in the controller log).
- No error on the producer side — every record got a `RecordMetadata`, with no exception.

## The wrong hypotheses at first

1. **Suspecting the producer never sent them.** On review: the producer had `RecordMetadata` for all 13 records → they *were* sent and *were* received by the leader. Ruled out.
2. **Suspecting the consumer skipped them.** Resetting the offset to re-read the partition from the start — those 13 records still weren't on disk. Not the consumer.
3. **Suspecting retention deleted them.** Checking `retention.ms` — the data was hours old, nowhere near the deletion deadline. Ruled out.

Where the time went: all three hypotheses assumed "the message is on the broker". The truth is it was **never durably written** — the leader received it and died before anybody copied it.

## The real cause

`acks=1` only waits for the **leader** to write to its own log, *not* for the followers. The data-loss chain:

1. The producer sends → the leader writes to its log → returns an ack. The producer reports success.
2. The leader crashes **before** any follower pulls that copy.
3. A follower (which doesn't have the message) becomes the leader.
4. The message doesn't exist on the new leader → lost permanently.

`replication.factor=3` **doesn't save** you, because `acks=1` doesn't wait for replication. Durability is decided by `acks`, not by the replica count alone.

## The fix

1. **Have the producer wait for enough in-sync replicas to confirm:**

   ```properties
   acks=all
   enable.idempotence=true
   ```

2. **Have the topic/broker require at least 2 caught-up replicas:**

   ```properties
   min.insync.replicas=2
   ```

   With `acks=all` + `min.insync.replicas=2`: a write only succeeds when at least 2 replicas hold the message. If the leader dies, the remaining replica (which has the message) becomes leader — nothing lost.

3. **Forbid electing a leader from a stale replica:**

   ```properties
   unclean.leader.election.enable=false
   ```

   This stops a follower *outside* the ISR (missing data) from becoming leader — the remaining route to data loss.

The trade-off: `acks=all` increases write latency and, when the live replica count drops below `min.insync.replicas`, the producer will **fail** (`NotEnoughReplicas`) rather than silently lose data — which is the *correct* behaviour for important data.

## How to spot it early

Reconcile the **sent vs received counts around each leader election**:

```bash
# xem lịch sử đổi leader; nếu số lệch producer/consumer bám sát các mốc này → nghi acks
kafka-topics --bootstrap-server localhost:9092 --describe --topic payments
# so Leader vs Replicas vs Isr: Isr co lại đúng lúc mất dữ liệu là dấu hiệu
```

The earliest warning: alert when `min.insync.replicas` isn't met, and audit every important topic still running `acks=1`.

## Related Topics

- [Replication and durability](../reference/replication-durability.md) — the ISR, `min.insync.replicas`, why `acks` decides durability
- [Producer tuning](../skills/producer-tuning.md) — choosing `acks`, `enable.idempotence`
- [Kafka](../index.md) — the topic this case study belongs to
