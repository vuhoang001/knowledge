---
title: A window that never fires because of a silent partition
sidebar_position: 1
description: "One Kafka partition emitting nothing holds the watermark still — the window doesn't close and no result comes out."
tags: [flink, watermark, idle-partition, event-time, windowing]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# A window that never fires because of a silent partition

> **Takeaway:** the global watermark takes the **min** over every partition; a silent partition's watermark doesn't advance, holding the global watermark still — an event-time window never becomes eligible to close, and the result never comes out.

## Label

**A reconstructed situation** — the figures are **illustrative, not run on a cluster**, but internally consistent.

## Context

The job reads the `orders` topic with **6 partitions**, each partition carrying one region's orders. The pipeline aggregates sales into 5-minute event-time windows (`TUMBLE`) and pushes them to a dashboard.

During the day every region has traffic and the dashboard updates steadily. At night, one region (partition) has **almost no orders** for hours.

## Symptoms

*Illustrative numbers — not run:*

- At night the dashboard **freezes**: the last 5-minute window came out at 23:05, and then no new rows until morning.
- The job is still **RUNNING**, with no exception and no restart. Records-in still ticks up (the other partitions still have orders).
- When the silent region has orders again around 06:00, **a whole batch** of the night's backed-up windows suddenly emerges at once.

## The wrong hypotheses at first

1. **Suspecting the job was hung.** Checking the UI: the subtasks were still RUNNING with positive throughput. Not hung.
2. **Suspecting checkpoint failures.** Checkpoints were still completing on schedule with a stable size. Ruled out.
3. **Suspecting the sink was blocking.** Testing a few direct writes into the sink — it accepted them normally. Not the sink.

Where the time went: all three hypotheses assumed "there are results but they're stuck somewhere on the way out". The truth was that **the results were never produced** — the window operator hadn't received a watermark high enough to trigger.

## The real cause

The watermark of a multi-input operator is the **min of its input watermarks** — so as not to close a window early and miss data from the slowest input.

Each partition generates its own watermark. A silent partition has **no new events** so its watermark **doesn't advance**. The window operator takes the min → the global watermark sticks at an old mark → the condition `watermark ≥ window end` is never met → the window never triggers.

This is behaviour that's **correct by design**, not a bug: Flink can't know whether the other partition is "out of data" or merely "temporarily quiet".

## The fix

Mark the source **idle** after a period of silence, so it temporarily withdraws from the min-watermark computation:

```java
// DataStream API
WatermarkStrategy<Order> strategy = WatermarkStrategy
    .<Order>forBoundedOutOfOrderness(Duration.ofSeconds(5))
    .withTimestampAssigner((e, ts) -> e.eventTimeMillis)
    .withIdleness(Duration.ofMinutes(1)); // partition im lặng >1 phút → coi là idle
```

```sql
-- Flink SQL: đặt qua config của bảng/pipeline
SET 'table.exec.source.idle-timeout' = '60000'; -- 60s, đơn vị ms
```

Once `withIdleness` is on, a partition silent beyond the threshold is dropped from the min → the global watermark advances with the still-active partitions → windows close on schedule.

The trade-off: if the "idle" partition was really just slow and then has **old** events, those events may arrive after the watermark has passed and be treated as **late**. Pick an `idle-timeout` large enough relative to the real delay of the slowest stream.

## How to spot it early

Track **`currentOutputWatermark` per subtask** in the Flink UI or the metrics:

```text
subtask 0: currentOutputWatermark = 2026-08-11 06:00:00
subtask 3: currentOutputWatermark = 2026-08-11 23:05:00  <-- đứng yên
```

One subtask with a watermark that **isn't increasing** while the others advance steadily = almost certainly an idle partition. Set an alert when the watermark spread between subtasks exceeds a threshold.

## Related Topics

- [Event time and watermarks](../reference/event-time-watermark.md) — why the watermark takes the min, and the idleness mechanism
- [Windows](../skills/windows.md) — the trigger condition of an event-time window
- [Flink](../index.md) — the topic this case study belongs to
