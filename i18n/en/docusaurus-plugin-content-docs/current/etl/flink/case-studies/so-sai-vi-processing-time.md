---
title: Wrong numbers from using processing time
sidebar_position: 2
description: "The job runs smoothly while the numbers go quietly wrong: late events are assigned to a window by processing time, with no error reported."
tags: [flink, processing-time, event-time, windowing, correctness]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# Wrong numbers from using processing time

> **Takeaway:** a processing-time window assigns an event to a window by **when Flink processed it**, not by when the event happened — so with lag/retries/backfill, the per-minute numbers go quietly wrong with no error reported.

## Label

**A reconstructed situation** — the figures are **illustrative, not run on a cluster**, but internally consistent.

## Context

The pipeline counts orders in 5-minute windows. Whoever wrote it chose a **processing-time** `TUMBLE` for convenience: no watermark to declare, no timestamp assigner, shorter code, and "most of the time the numbers look right".

## Symptoms

*Illustrative numbers — not run:*

An event happens at **10:59:30** (event time) but because of consumer lag / a retry, Flink processes it at **11:02:00** (processing time). The processing-time window assigns it to the **11:00–11:05** window.

Over the same dataset, the two modes give two results:

| Window | Counted by **event time** (correct) | Counted by **processing time** (this case) |
|---|---|---|
| 10:55–11:00 | 1,000 | 940 |
| 11:00–11:05 | 1,000 | 1,060 |

*(illustrative, not run)* — 60 events from the 10:55 minute "leaked" into the 11:00 one. The total is still 2,000, but **the per-minute allocation is wrong**. The dashboard looks plausible so nobody suspects anything.

## The wrong hypotheses at first

1. **Suspecting data loss.** Counting the whole day by event time vs processing time → **equal**. Nothing lost.
2. **Suspecting duplicates.** Deduplicating by `order_id` → no duplicates. Ruled out.
3. **Suspecting the aggregation formula.** Reviewing the `COUNT` logic → correct. Not the formula.

Where the time went: every hypothesis looked at the *data* and the *arithmetic*, while the error was in **the time axis used to cut the windows**.

## The real cause

A processing-time window depends on **when the machine processes**, not when the event happened. Anything that makes processing time diverge from event time — consumer lag, retries, restarts, backfill, backpressure — pushes events into the wrong window. There's no error because, as far as Flink is concerned, this is processing time behaving correctly.

The decisive evidence: **reprocessing** the same historical data gives **different** numbers from the first run — because on the reprocess every event is handled in a rush and the processing times are entirely different. The result is **non-deterministic**.

## The fix

Switch to an **event-time** window: assign the timestamp from the event itself and declare a watermark.

```java
// DataStream API
WatermarkStrategy<Order> strategy = WatermarkStrategy
    .<Order>forBoundedOutOfOrderness(Duration.ofSeconds(5))
    .withTimestampAssigner((e, ts) -> e.eventTimeMillis); // dùng ts trong event
```

```sql
-- Flink SQL: khai WATERMARK trong CREATE TABLE, rồi TUMBLE theo cột thời gian đó
CREATE TABLE orders (
  order_id STRING,
  amount   DECIMAL(10,2),
  event_ts TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
) WITH ( /* connector ... */ );

SELECT window_start, COUNT(*)
FROM TABLE(TUMBLE(TABLE orders, DESCRIPTOR(event_ts), INTERVAL '5' MINUTES))
GROUP BY window_start, window_end;
```

With event time, the 10:59:30 event always lands in the 10:55–11:00 window whenever it's processed. A reprocess gives **exactly the old numbers** — deterministic.

The trade-off: you have to accept a small delay (waiting for the watermark) and handle late events explicitly (drop or allowed lateness), instead of "out immediately but wrong".

## How to spot it early

**Reprocess a historical interval and compare with the first run.** If the numbers **differ** → the result depends on processing time → it's fundamentally wrong. A correct event-time pipeline must give **the same numbers on every reprocess**.

## Related Topics

- [Event time and watermarks](../reference/event-time-watermark.md) — the difference between event time and processing time, and determinism
- [Windows](../skills/windows.md) — choosing a window's time axis
- [Flink](../index.md) — the topic this case study belongs to
