---
title: Average revenue per day jumping from 862 to 1,050 within the same day
sidebar_position: 23
description: "Today isn't full yet but the denominator still counts it as a whole day; the metric settles at midnight and drops again the next morning."
tags: [case-study, real-time, partition, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Average revenue per day jumping from 862 to 1,050 within the same day

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** real-time data doesn't break dimensional modelling, it breaks an implicit assumption every
> report relies on — *"every day in the table is a day already complete"*. See
> [real-time fact tables](../skills/real-time-fact.md).

## Context

The warehouse has just connected a streaming feed so executives can watch intraday revenue. The simplest way
to connect it: push events into the same fact table the reports already use.

```sql
CREATE TABLE fct_ban_chot AS       -- history, closed
SELECT * FROM (VALUES
  (DATE '2026-08-01', 1000), (DATE '2026-08-02', 1200), (DATE '2026-08-03', 900)
) t(ngay, doanh_thu);

CREATE TABLE fct_ban_nong AS       -- today, still flowing in
SELECT * FROM (VALUES
  (DATE '2026-08-04', TIME '09:00:00', 200),
  (DATE '2026-08-04', TIME '11:00:00', 150)
) t(ngay, gio, doanh_thu);
```

## Symptoms

The *"average revenue per day"* dashboard, captured at **11:00**:

```text
┌─────────┬────────┬─────────────┐
│ so_ngay │  tong  │ tb_moi_ngay │
├─────────┼────────┼─────────────┤
│       4 │   3450 │       862.5 │
└─────────┴────────┴─────────────┘
```

The same dashboard, the same query, captured at **21:00**:

```text
┌─────────┬────────┬─────────────┐
│ so_ngay │  tong  │ tb_moi_ngay │
├─────────┼────────┼─────────────┤
│       4 │   4200 │      1050.0 │
└─────────┴────────┴─────────────┘
```

**862.5 → 1,050.0** within the same day, with nobody changing anything.

The operational consequence: the morning meeting uses one number, the report sent that evening uses another. And every
morning the metric "drops" against the previous evening — so the sales team keeps asking *"what happened
yesterday?"* when nothing happened at all.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| The streaming feed losing the morning's data | Counted the events: nothing lost, it just hasn't arrived |
| A job deleting and reloading mid-day | The log: no job ran between the two captures |
| The BI cache returning a stale number | Cleared the cache: unchanged |
| A timezone offset between the two sources | Checked: the same timezone |
| Revenue genuinely being volatile | True — but that's **the nature of intraday**, not a bug |

Where the longest stretch of time goes: the "data loss" hypothesis. The whole team checks the streaming feed for
three days, and the feed is perfectly healthy.

The redirecting question: *"what is the denominator of this division?"*

## The real cause

```text
┌────────────┬───────────┬────────────┐
│    ngay    │ doanh_thu │ trang_thai │
├────────────┼───────────┼────────────┤
│ 2026-08-01 │      1000 │ da chot    │
│ 2026-08-02 │      1200 │ da chot    │
│ 2026-08-03 │       900 │ da chot    │
│ 2026-08-04 │      1100 │ DANG CHAY  │
└────────────┴───────────┴────────────┘
```

The denominator `count(DISTINCT ngay)` = 4. But 4 August is only **partly full** — at 11:00 it has
only 350 of its eventual 1,100.

The numerator rises all day, the denominator sits still at 4 → the quotient rises all day.

This is neither a data bug nor a query bug. It's **an implicit assumption being broken**: every
formula of the form "average per day", "share of total", "versus the prior period" implicitly
assumes every day in the set has ended.

That assumption held for years while the warehouse only loaded in nightly batches — and it died the day
the streaming feed was connected.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on every column | ✅ green |
| No day missing from the series | ✅ green |
| `doanh_thu > 0` | ✅ green |
| The total matching the source feed | ✅ green |
| Whether today's data is complete | ❌ — **no such concept exists in the warehouse** |

The first four are green because the data is correct. The last row doesn't exist because the warehouse
**stores nowhere** the marker "this day is closed".

A test running at 02:00 is green too, and at that hour it's even right — because the previous day is full.

## The fix

### Fix 1 — mark the hot partition, and carry the label all the way to the report

```sql
WITH tat_ca AS (
  SELECT ngay, doanh_thu, true AS da_chot FROM fct_ban_chot
  UNION ALL SELECT ngay, doanh_thu, false FROM fct_ban_nong
)
SELECT count(DISTINCT ngay) FILTER (WHERE da_chot)      AS so_ngay_da_chot,
       sum(doanh_thu) FILTER (WHERE da_chot)            AS tong_da_chot,
       round(sum(doanh_thu) FILTER (WHERE da_chot) * 1.0
             / count(DISTINCT ngay) FILTER (WHERE da_chot), 1) AS tb_moi_ngay_on_dinh,
       sum(doanh_thu) FILTER (WHERE NOT da_chot)        AS hom_nay_tam_tinh
FROM tat_ca;
```

```text
┌─────────────────┬──────────────┬─────────────────────┬──────────────────┐
│ so_ngay_da_chot │ tong_da_chot │ tb_moi_ngay_on_dinh │ hom_nay_tam_tinh │
├─────────────────┼──────────────┼─────────────────────┼──────────────────┤
│               3 │         3100 │              1033.3 │             1100 │
└─────────────────┴──────────────┴─────────────────────┴──────────────────┘
```

**1,033.3, unchanged hour to hour.** Today's number still shows, but in its own column labelled *provisional*
— executives can still follow it intraday without confusing it with the stable metric.

### Fix 2 — compare the same time window, not whole days

```sql
SELECT 'hom nay den 11h' AS moc,
       (SELECT sum(doanh_thu) FROM fct_ban_nong WHERE gio <= TIME '11:00:00') AS doanh_thu
UNION ALL
SELECT 'hom nay den 21h',
       (SELECT sum(doanh_thu) FROM fct_ban_nong WHERE gio <= TIME '21:00:00');
```

```text
┌─────────────────┬───────────┐
│       moc       │ doanh_thu │
├─────────────────┼───────────┤
│ hom nay den 11h │       350 │
│ hom nay den 21h │      1100 │
└─────────────────┴───────────┘
```

To know whether today is good or bad, compare it **up to the same moment** in earlier days. The precondition:
the fact must carry **a time**, not just a date.

### Fix 3 — the closing marker must be data

```text
dim_ky_bao_cao(ngay, da_chot, thoi_diem_chot, ai_chot)
```

Without this table, every report defines "today" its own way.

| | Before | After |
|---|---|---|
| The morning vs evening metric | 862.5 vs 1,050.0 | **1,033.3 all day** |
| Today's number | Mixed in, unlabelled | Its own column, labelled *provisional* |
| Versus yesterday | Always looks "down" until end of day | Compared over the same window |

## How to spot it early

1. Run the same dashboard twice a few hours apart and compare. A stable metric must be **unchanged**.

2. Find every place using `count(DISTINCT ngay)` or a day `count(*)` as a denominator:

```bash
grep -rn "count(distinct.*ngay\|count(distinct.*date" models/marts/
```

3. Check whether the last day in the fact is today:

```sql
SELECT max(ngay) AS ngay_moi_nhat, current_date AS hom_nay,
       max(ngay) = current_date AS co_du_lieu_chua_chot
FROM fct_ban;
```

`true` with no `da_chot` column = you're in this case.

4. Ask: *"does the warehouse record anywhere which days are closed?"* No = every report guesses for itself.

## Related Topics

- [Real-time fact tables](../skills/real-time-fact.md) — the technique skipped here
- [Late-arriving data](../skills/late-arriving.md) — the parallel problem, affecting closed days
- [The date dimension](../reference/date-dimension.md) — a separate time-of-day dimension
- [Conformed facts](../skills/conformed-facts.md) — with two systems, the metrics must conform
