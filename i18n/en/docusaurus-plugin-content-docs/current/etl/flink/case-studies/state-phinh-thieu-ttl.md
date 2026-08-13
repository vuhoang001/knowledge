---
title: State bloating for want of a TTL
sidebar_position: 3
description: "Keyed state keeps every key forever — checkpoints slow down and then the TaskManager OOMs."
tags: [flink, state, ttl, checkpoint, rocksdb]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# State bloating for want of a TTL

> **Takeaway:** keyed state with no TTL keeps **every key that ever appeared, forever**; with an unbounded key space (order_id, session_id) the state only grows — checkpoints slow down over time and then the TaskManager OOMs.

## Label

**A reconstructed situation** — the figures are **illustrative, not run on a cluster**, but internally consistent.

## Context

The job does **deduplication**: keeping a `ValueState<Boolean>` per `order_id` to drop duplicate records. Each new `order_id` creates a state entry. An `order_id` is **never reused** — so the key space is effectively unbounded, growing with the order volume.

Nobody set a TTL, because the job worked fine at first while the state was still small.

## Symptoms

*Illustrative numbers — not run:*

- **Week 1:** checkpoint size ~200 MB, duration ~3 s. Fine.
- **Week 4:** checkpoint size ~4 GB, duration ~40 s. Still "working".
- **Week 8:** checkpoints start **timing out** (exceeding `execution.checkpointing.timeout`), then the TaskManager **OOMs** and restarts, and restoring from a huge checkpoint is also slow → a downward spiral.

The checkpoint size and duration graphs rise **almost linearly with time**, not with load.

## The wrong hypotheses at first

1. **Suspecting a temporary RAM shortage.** Raising the TaskManager heap → it **postponed** it a few weeks then OOMed again at a higher level. Buying time only.
2. **Suspecting a data spike.** Reviewing input throughput → **stable**, with no burst. Ruled out.
3. **Suspecting wrong checkpoint config.** Tuning the interval/timeout → the size still grew, only moving the point of death. Not checkpoint config.

Where the time went: every hypothesis treated this as a **resource/momentary** problem, when it was a **systematic state leak** — state only added, never removed.

## The real cause

The state is **unbounded**: each new key adds an entry, with no mechanism to delete old ones. With an unbounded key space, total state → infinity over time. A checkpoint has to capture all the state → its size and duration rise with it → eventually exceeding memory / the timeout.

This isn't a Flink bug; it's a **missing lifecycle for the state**. Flink keeps exactly what it was told to keep.

## The fix

**1. Set a TTL on the state** so old entries are cleaned up:

```java
StateTtlConfig ttl = StateTtlConfig
    .newBuilder(Time.days(7))                       // sống 7 ngày
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanupInRocksdbCompactFilter(1000)            // dọn trong lúc RocksDB compaction
    .build();

ValueStateDescriptor<Boolean> desc =
    new ValueStateDescriptor<>("seen", Boolean.class);
desc.enableTimeToLive(ttl);
```

**2. Use the RocksDB state backend** for large state (spilling to disk rather than keeping everything on the heap):

```properties
state.backend: rocksdb
state.backend.incremental: true   # checkpoint tăng dần, chỉ chụp phần thay đổi
```

**3. Redesign for bounded state** where you can: deduplicate over a limited time window instead of "remembering every order_id forever" — you only need to prevent duplicates over a reasonable interval (e.g. 24h).

The trade-off: a TTL means that past the threshold, an old `order_id` returning is **no longer** treated as a duplicate. Pick a TTL long enough to cover the realistic late-arrival/replay window.

## How to spot it early

Track **checkpoint size and duration over time** (the Flink UI → Checkpoints, or the `lastCheckpointSize`, `lastCheckpointDuration` metrics). A line **rising linearly regardless of load** = the state is leaking. Catching it early is far cheaper than waiting for the OOM: alert when the checkpoint size exceeds a threshold or rises steadily for several weeks running.

## Related Topics

- [State and checkpoints](../reference/state-and-checkpoint.md) — the keyed-state lifecycle, TTL, the RocksDB backend
- [Backpressure tuning](../skills/backpressure-tuning.md) — how checkpoint size/duration affects a job's health
- [Flink](../index.md) — the topic this case study belongs to
