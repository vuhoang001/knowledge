---
title: Real-time fact tables — the hot partition
sidebar_position: 22
description: "Today isn't complete yet but still counts as a whole day — so every average metric jumps all day and settles at midnight."
tags: [real-time, streaming, partition, fact, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Real-time fact tables — the hot partition

> **Takeaway:** real-time data doesn't break the dimensional model, it breaks an **implicit assumption**
> every report relies on: *"each day in the table is a complete day"*. Today
> isn't complete, but the denominator still counts it as 1.

## The problem

```sql
CREATE TABLE fct_ban_chot AS       -- lich su, da chot
SELECT * FROM (VALUES
  (DATE '2026-08-01', 1000), (DATE '2026-08-02', 1200), (DATE '2026-08-03', 900)
) t(ngay, doanh_thu);

CREATE TABLE fct_ban_nong AS       -- hom nay, van dang chay vao
SELECT * FROM (VALUES
  (DATE '2026-08-04', TIME '09:00:00', 200),
  (DATE '2026-08-04', TIME '11:00:00', 150)
) t(ngay, gio, doanh_thu);
```

The *"average daily revenue"* dashboard, run at **11:00**:

```text
┌─────────┬────────┬─────────────┐
│ so_ngay │  tong  │ tb_moi_ngay │
├─────────┼────────┼─────────────┤
│       4 │   3450 │       862.5 │
└─────────┴────────┴─────────────┘
```

The same dashboard, the same query, run at **21:00**:

```text
┌─────────┬────────┬─────────────┐
│ so_ngay │  tong  │ tb_moi_ngay │
├─────────┼────────┼─────────────┤
│       4 │   4200 │      1050.0 │
└─────────┴────────┴─────────────┘
```

**862.5 → 1,050.0.** Nobody changed anything. The morning viewer and the evening viewer argue
about two different numbers for the same metric.

The cause is visible the moment you break it down by day:

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

4 August is only partly filled, but the `count(DISTINCT ngay)` denominator still counts it as **1 complete
day**. Every "average per day", "share of total" and "versus yesterday" metric
is skewed by that partial day — and the amount of skew **changes by the hour**.

## The approach

### 1. Mark the hot partition

Kimball separates the **hot partition** — the not-yet-closed data — from the historical part, both physically
and semantically. The `da_chot` column must travel with the data all the way to the reporting layer:

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

**1,033.3 doesn't change with the hour.** Today's figure still appears, but in its own column labelled
*provisional* — the viewer knows what they're looking at.

### 2. Compare the same time window, not the whole day

To know whether today is good or bad, compare it *up to the same moment* on previous days, not against
whole-day totals:

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

The precondition: the fact must carry **the time**, not just the date. That's why a real-time fact
needs a [time-of-day dimension](../reference/date-dimension.md) separate from
`dim_ngay`.

### 3. The closing mark must be data, not convention

When is a day considered "closed"? Midnight in which timezone? After the load job finishes or
after accounting approves it? The answer must live in a table:

```text
dim_ky_bao_cao(ngay, da_chot, thoi_diem_chot, ai_chot)
```

Without that table, each report defines "today" its own way, and they diverge at exactly the
shift change — the same illness as
[the quarter definition living inside a query](../case-studies/bao-cao-quy-tai-chinh-lech.md).

## The architectural trade-off

| Approach | You get | You lose |
|---|---|---|
| Only report up to the closed day | Absolutely stable numbers | Nothing at all for today |
| A separate labelled hot partition | Both, with the viewer knowing which is which | Queries must filter correctly; two load paths |
| Mixing it straight into the main fact | The simplest | Every metric jumps by the hour |
| Two separate stores (streaming + batch) | Each optimised for its own job | Two metric definitions — destroying [conformed facts](conformed-facts.md) |

The last row is the most expensive architectural trap: building a real-time system entirely separate from the
warehouse, and discovering six months later that *"real-time revenue"* never matches *"warehouse
revenue"*, because the two sides handle cancelled orders differently.

If you're forced to have two paths, you must have **a daily reconciliation query** comparing the two sides
after the day has closed — like the reconciliation query for
[an aggregate table](aggregate-fact-table.md).

## The relationship to late-arriving data

A hot partition only solves *"today's data hasn't all arrived"*. It does **not**
solve *"last week's data just arrived"* — that's [late-arriving data](late-arriving.md),
and it makes even closed days change their numbers.

Two problems, two handlings, usually appearing together:

| | The hot partition | Late-arriving data |
|---|---|---|
| Affects | Today | Closed days in the past |
| Handling | Labelling `da_chot` | Reloading a window + auditing |
| What users see | "A provisional figure" | An old report changing its numbers |

## Trade-offs

| You get | You lose |
|---|---|
| Metrics that don't jump by the hour | Queries must distinguish the two regions |
| Today's figure still available, clearly labelled | Two load paths to keep in sync |
| Accurate same-time-window comparison | The fact must store time, not just the date |
| The closing mark as data | Another table to maintain |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Mixing not-yet-closed data into the main fact | The average jumps all day — [case study](../case-studies/so-hom-nay-nhay-suot-ngay.md) |
| Using `count(DISTINCT ngay)` as the denominator | A partial day counted as a full one |
| Comparing today's total with yesterday's total | It always looks "down" until the end of the day |
| A fact with only dates and no times | You can't compare the same time window |
| Two systems with two metric definitions | The real-time number never matches the warehouse's |
| No "closed" mark in the data | Each report interprets "today" its own way |

## Related Topics

- [Late-arriving data](late-arriving.md) — the parallel problem, affecting closed days
- [Conformed facts](conformed-facts.md) — with two systems, the metric definitions must conform
- [Aggregate fact tables](aggregate-fact-table.md) — the reconciliation query between two layers
- [The date dimension](../reference/date-dimension.md) — a separate time-of-day dimension
- [CS: today's figure jumping all day](../case-studies/so-hom-nay-nhay-suot-ngay.md)

## References

- Kimball Group — [Real-Time Fact Tables](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 20
