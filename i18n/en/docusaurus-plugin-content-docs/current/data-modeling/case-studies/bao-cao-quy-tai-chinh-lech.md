---
title: The board meeting's Q1 is 202% out from the dashboard's Q1
sidebar_position: 8
description: "With no date dimension, the dashboard uses SQL's quarter() — while the company's fiscal year starts on 1 April."
tags: [case-study, date-dimension, calendar, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# The board meeting's Q1 is 202% out from the dashboard's Q1

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** `quarter()` answers about **calendar** quarters. No business asks that question.
> Without a [date dimension](../reference/date-dimension.md), two departments use two
> definitions of "quarter" and nobody knows.

## Context

A company selling seasonally, peaking in April–June. **The fiscal year starts on 1 April** — it's
in the articles of association, everybody in finance knows it, and it appears nowhere in the data
warehouse.

The simplest model possible: one fact, one `ngay DATE` column. No `dim_ngay`, because "we already
have a date column, what's another table for".

```sql
CREATE TABLE fct_ban AS
SELECT ngay,
       CASE WHEN month(ngay) BETWEEN 4 AND 6 THEN 3 ELSE 1 END
       * (100 + (day(ngay) * 7) % 50) AS doanh_thu
FROM (SELECT (DATE '2026-01-01' + INTERVAL (i) DAY)::DATE AS ngay
      FROM range(0, 181) t(i));
```

```text
┌─────────┬────────┐
│ so_ngay │  tong  │
├─────────┼────────┤
│     181 │  45432 │
└─────────┴────────┘
```

## Symptoms

The July board meeting. Finance's slide: *"Q1 revenue reached 34,146"*.
The dashboard on the big screen: **11,286**.

Nobody made a typo, nobody mistyped. Two numbers under the same "Q1" label, three times apart.

```sql
SELECT sum(doanh_thu) FILTER (WHERE quarter(ngay) = 1) AS quy1_theo_lich,
       sum(doanh_thu) FILTER (WHERE ngay BETWEEN '2026-04-01' AND '2026-06-30')
                                                      AS quy1_tai_chinh,
       round(100.0 * (sum(doanh_thu) FILTER (WHERE ngay BETWEEN '2026-04-01' AND '2026-06-30')
                    - sum(doanh_thu) FILTER (WHERE quarter(ngay) = 1))
             / sum(doanh_thu) FILTER (WHERE quarter(ngay) = 1), 1) AS lech_pct
FROM fct_ban;
```

```text
┌────────────────┬────────────────┬──────────┐
│ quy1_theo_lich │ quy1_tai_chinh │ lech_pct │
├────────────────┼────────────────┼──────────┤
│          11286 │          34146 │    202.6 │
└────────────────┴────────────────┴──────────┘
```

**202.6% out** — and this is the peak-season quarter, meaning the dashboard is reporting the low
season under the name "Q1".

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| The dashboard filters out some orders | Counting rows: matching the source 100% |
| A cancelled order counted on one side | There are no cancelled orders in the period |
| Timezones skewing dates at the boundary | Checking the month boundaries: correct on both sides |
| Finance added it up wrongly | **Wrong** — they added correctly, they just added April, May and June |

Half a session is lost because both sides go looking for a **data bug**. There is no data bug. The same
row set, the same `SUM`, differing only in **which rows count as being in Q1**.

The clarifying question should have been the first one: *"which months does your Q1 consist of?"*

## The real cause

The dashboard writes `GROUP BY quarter(ngay)`. That SQL function only knows the Gregorian calendar: Q1 =
January, February, March.

For this company, FY2026's Q1 is **April, May, June**. January 2026 actually belongs to
**FY2025's Q4**.

Nowhere in the data warehouse records that. The fiscal calendar exists in people's
heads, in finance's Excel file, and in the articles of association — three places SQL
can't read.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on `ngay` | ✅ green |
| Total revenue matching the source | ✅ green |
| `accepted_values` for `quarter(ngay)` — `[1,2,3,4]` | ✅ green |
| Matching row counts | ✅ green |

Everything is green, because **the data isn't wrong**. What's wrong is that a business concept ("a quarter") is
derived by a technical function rather than declared as data.

No test can catch a definition that **doesn't exist in the warehouse**.

## The fix

Put the fiscal calendar into [`dim_ngay`](../reference/date-dimension.md) — turning it from implicit
knowledge into a column:

```sql
CREATE TABLE dim_ngay AS
SELECT (DATE '2026-01-01' + INTERVAL (i) DAY)::DATE                   AS ngay,
       (((month((DATE '2026-01-01' + INTERVAL (i) DAY)) + 8) % 12) // 3) + 1
                                                                      AS quy_tai_chinh,
       CASE WHEN month((DATE '2026-01-01' + INTERVAL (i) DAY)) >= 4
            THEN year((DATE '2026-01-01' + INTERVAL (i) DAY))
            ELSE year((DATE '2026-01-01' + INTERVAL (i) DAY)) - 1 END AS nam_tai_chinh
FROM range(0, 365) t(i);

SELECT d.nam_tai_chinh, d.quy_tai_chinh, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_ngay d USING (ngay)
GROUP BY 1, 2 ORDER BY 1, 2;
```

```text
┌───────────────┬───────────────┬───────────┐
│ nam_tai_chinh │ quy_tai_chinh │ doanh_thu │
├───────────────┼───────────────┼───────────┤
│          2025 │             4 │     11286 │
│          2026 │             1 │     34146 │
└───────────────┴───────────────┴───────────┘
```

Both old numbers are still there, but now they **carry different labels**: 11,286 is FY2025-Q4 and
34,146 is FY2026-Q1. There are no longer two different things both called "Q1".

### Before and after

| | Before | After |
|---|---|---|
| The quarter definition lives in | The `quarter()` function + people's memory | A column in `dim_ngay` |
| Changing the fiscal calendar | Fix every query using `quarter()` | Fix one table |
| Two departments getting two numbers | Yes, with nobody noticing | Impossible — the same table |
| "Working day", "holiday" | Unanswerable | Add a column and you're done |

## How to spot it early

1. **Anywhere** in the codebase calls `quarter()`, `year()` or `week()` to split reports into
   periods.
2. There are hardcoded dates like `BETWEEN '2026-04-01' AND '2026-06-30'` in queries.
3. No table named `dim_ngay` / `dim_date` exists in the warehouse.
4. Ask two people in two departments *"which months is Q1"* and get two answers.

A quick check in the repo:

```bash
grep -rn "quarter(\|date_trunc('quarter'\|EXTRACT(QUARTER" models/ | wc -l
```

A result greater than 0 with no `dim_ngay` in the warehouse means you're almost certainly in this case.

## Related Topics

- [The date dimension](../reference/date-dimension.md) — the technique skipped here
- [Conformed dimensions](../skills/conformed-dimension.md) — one definition shared by every mart
- [Aggregate fact tables](../skills/aggregate-fact-table.md) — `dim_quy` must be generated from `dim_ngay`
- [CS: adding an eighth status](them-trang-thai-thu-tam.md) — the same illness: a business definition living in a query
