---
title: Compaction not behaving as expected
sidebar_position: 4
description: "Expecting a compacted topic to keep only the latest value immediately; old values and tombstones stay for a long time."
tags: [kafka, log-compaction, tombstone, retention]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Compaction not behaving as expected

> **Takeaway:** compaction is a **background** process, not an immediate delete — the active segment isn't compacted, tombstones stay for `delete.retention.ms`, so consumers must tolerate several values per key rather than assuming "one value per key".

## Label

**A reconstructed situation** — the figures are **illustrative, not run on a cluster**, but internally consistent.

## Context

The `user-profile` topic is configured with `cleanup.policy=compact` and used as a **state table**: one record per user, `key=user_id`, with the latest profile as the value. A service starting up reads the topic from the beginning to build an in-memory cache, assuming "each key has only one value — the latest".

## Symptoms

*Illustrative numbers — not run:*

- Reading from the start of the topic, the service sees user `U1` appear **4 times** with 4 different values (the old ones), not once.
- User `U9` was deleted (a tombstone `key=U9, value=null` was sent) **2 days ago** but a re-reading consumer still sees `U9` records — both the valued version and the tombstone.
- If the cache takes the *first value encountered* rather than the last → the profile displays **stale** data.

## The wrong hypotheses at first

1. **Suspecting a wrong key** — thinking the producer set keys inconsistently so compaction couldn't merge them. On review: the keys were correct, genuinely the same `U1`.
2. **Suspecting the producer sent duplicates.** There were indeed several values, but they were *updates over time* (the profile changed 4 times), not a duplicate-send bug.

Where the time went: the assumption that "compacted = only the latest value, immediately". Wrong. Compaction converges to one value per key *eventually*, and even then doesn't absolutely guarantee exactly 1.

## The real cause

Log compaction is a **background cleaner**, not synchronous with writing:

- **The active segment is never compacted.** Every record being written to the current segment stays intact, including several values for the same key.
- **The cleaner doesn't run until it's "dirty" enough.** `min.cleanable.dirty.ratio` (default ~0.5) decides the minimum dirty ratio that triggers compaction; `segment.ms`/`segment.bytes` decide when a new segment closes and becomes a candidate.
- **Tombstones deliberately stay for a while.** `delete.retention.ms` (default ~86400000 = 1 day) keeps tombstones long enough for every consumer to see "this key was deleted" before the tombstone is cleaned up — so `U9` still appears.

The conclusion: **consumers must not assume one-value-per-key**. Compaction reduces long-term storage *at most*; it isn't a contract that "a read always sees exactly one value".

## The fix

The *right* fix is in the consumer; config tuning is only secondary:

1. **Make the consumer idempotent per key, taking the largest offset.** Reading from the start of the topic, always overwrite by key; the value that arrives later (a larger offset) wins. A tombstone (`value=null`) → remove the key from the cache.

   ```java
   // giả mã: bản sau ghi đè bản trước; null = xoá
   if (record.value() == null) cache.remove(record.key());
   else cache.put(record.key(), record.value());   // offset lớn hơn tới sau → thắng
   ```

2. **If you want compaction to run sooner/tighter** (a supporting measure, not a substitute for point 1):

   ```properties
   cleanup.policy=compact
   segment.ms=600000            # đóng segment thường xuyên hơn để có ứng viên compact
   min.cleanable.dirty.ratio=0.1
   delete.retention.ms=3600000  # rút ngắn thời gian giữ tombstone (cẩn thận: consumer chậm có thể lỡ)
   ```

   A warning: shortening `delete.retention.ms` too far → a slow-reading consumer may **not see the tombstone in time** → and keep a deleted record forever. This is a trade-off, not an "optimise" button.

## How to spot it early

Re-read from the start and count the values per key:

```bash
# nếu một key xuất hiện >1 lần, hoặc thấy value rỗng (tombstone) → consumer PHẢI xử lý được
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic user-profile --from-beginning \
  --property print.key=true --property print.value=true --timeout-ms 5000
```

A consumer health test: deliberately send 3 values for the same key and let the service build its cache — if the result isn't the last value, the consumer's assumption is wrong.

## Related Topics

- [Retention and compaction](../reference/retention-compaction.md) — compaction vs delete, tombstones, `min.cleanable.dirty.ratio`
- [Kafka](../index.md) — the topic this case study belongs to
