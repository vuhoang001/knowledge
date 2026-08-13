---
title: A cumulative column dragged into the "total" cell — revenue inflated 2.13×
sidebar_position: 20
description: "A YTD column pre-stored in the fact looks exactly like an ordinary revenue column, and the BI user drags both into the same place."
tags: [case-study, year-to-date, additivity, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# A cumulative column dragged into the "total" cell — revenue inflated 2.13×

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** `doanh_thu_ytd` is a number that's **non-additive across time** sitting right beside an
> additive one, and **looking exactly like it**. See
> [year-to-date and timespan](../skills/ytd-timespan-facts.md).

## Context

The board wants to see the year-to-date figure. The BI tool in use doesn't support window
functions, so the data team precomputes it and stores it in the fact — a reasonable decision at the time.

```sql
CREATE TABLE fct_thang AS
SELECT thang, doanh_thu,
       sum(doanh_thu) OVER (ORDER BY thang) AS doanh_thu_ytd
FROM (VALUES (1, 100), (2, 200), (3, 150), (4, 300)) t(thang, doanh_thu);
```

```text
┌───────┬───────────┬───────────────┐
│ thang │ doanh_thu │ doanh_thu_ytd │
├───────┼───────────┼───────────────┤
│     1 │       100 │           100 │
│     2 │       200 │           300 │
│     3 │       150 │           450 │
│     4 │       300 │           750 │
└───────┴───────────┴───────────────┘
```

This table is **correct on every row**. The YTD dashboard runs well for six months.

## Symptoms

A new dashboard is born. Its author drags `doanh_thu_ytd` into the total cell — because the name has
"revenue" in it, and it's a numeric column.

```sql
SELECT sum(doanh_thu)     AS doanh_thu_that,
       sum(doanh_thu_ytd) AS sum_cua_cot_ytd,
       round(1.0 * sum(doanh_thu_ytd) / sum(doanh_thu), 2) AS phong_may_lan
FROM fct_thang;
```

```text
┌────────────────┬─────────────────┬───────────────┐
│ doanh_thu_that │ sum_cua_cot_ytd │ phong_may_lan │
├────────────────┼─────────────────┼───────────────┤
│            750 │            1600 │          2.13 │
└────────────────┴─────────────────┴───────────────┘
```

**2.13× inflated** across 4 months. With 12 months, the inflation factor is about 6.5 — and it **changes
with the number of months on screen**, so there's no fixed ratio to recognise.

Filter to 3 months and the inflation differs; filter to 12 months and it differs again. That's why nobody spots
it by "seeing a familiar number off by a fixed proportion".

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| The fact loaded duplicates | `count(*)` = 4, correct |
| Some join causing fan-out | The query has one table and no joins at all |
| An order recorded twice | Reconciled against the source: clean |
| Overlapping date filters | There are no date filters |

Where the time goes: the reflex "inflated number = duplicated rows" leads the whole investigation to hunt for
surplus rows. There are none — **the column is the wrong thing**, and it's wrong by nature rather than
because of the data.

The redirecting question: *"does adding this column up mean anything?"*

## The real cause

`doanh_thu_ytd` already **contains** the earlier months' values. Adding the whole column up counts
January four times, February three times and March twice.

1,600 = 100 + 300 + 450 + 750.

By classification, this is a number **non-additive across the time dimension** — the same kind as a
[periodic snapshot](../reference/fact-and-dimension.md) balance. But one difference makes
it far more dangerous:

> Everybody knows adding up 12 months of **balances** is nonsense. Nobody thinks adding up **cumulative
> revenue** is nonsense — because the name contains the word "revenue".

The column name has hidden its own nature.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on `doanh_thu_ytd` | ✅ green |
| `doanh_thu_ytd >= doanh_thu` | ✅ green |
| `doanh_thu_ytd` increasing month by month | ✅ green |
| December's value matching the annual total | ✅ green |
| Whether users add the column up | ❌ — **not checkable from the data side** |

The first four tests are green because **the column is entirely correct**. The bug arises where a user decides
what to do with it — a place no data test reaches.

The only prevention is **designing so it can't be misused**.

## The fix

### The root fix — drop the column, compute at read time

```sql
SELECT thang, doanh_thu,
       sum(doanh_thu) OVER (ORDER BY thang) AS ytd_tinh_luc_doc
FROM fct_thang ORDER BY thang;
```

```text
┌───────┬───────────┬──────────────────┐
│ thang │ doanh_thu │ ytd_tinh_luc_doc │
├───────┼───────────┼──────────────────┤
│     1 │       100 │              100 │
│     2 │       200 │              300 │
│     3 │       150 │              450 │
│     4 │       300 │              750 │
└───────┴───────────┴──────────────────┘
```

The same result for the YTD dashboard, but the column **doesn't exist in the table** so nobody can drag it
by mistake. Every BI tool today supports window functions — the original reason for pre-storing it
has expired.

### If you must store it

Three measures, do all three:

1. **Move it to its own table** `agg_ytd_thang`, don't mix it into the atomic fact.
2. **Give it a self-incriminating name**: `doanh_thu_luy_ke_khong_cong`.
3. **Read one row only, never aggregate**:

```sql
SELECT thang, doanh_thu_ytd FROM fct_thang WHERE thang = 4;
```

```text
┌───────┬───────────────┐
│ thang │ doanh_thu_ytd │
├───────┼───────────────┤
│     4 │           750 │
└───────┴───────────────┘
```

| | Before | After |
|---|---|---|
| The new dashboard's total | 1,600 (**2.13× inflated**) | 750 |
| Non-additive columns in the fact | Present, unlabelled | None |
| The YTD dashboard | Works | Still works |

## How to spot it early

1. Look for non-additive columns sitting in a fact — cumulatives, balances, averages, ratios:

```bash
grep -rn "ytd\|luy_ke\|running_\|cumulative\|_avg\|_rate\|_pct" models/marts/*.sql
```

2. **The one-sentence test for every new numeric column:** *"does adding this column across any two rows
   produce a meaningful result?"* Meaningless → it mustn't sit beside an additive column without a
   label.

3. Reconcile the total of every numeric column against the source:

```sql
SELECT sum(doanh_thu) AS cong_duoc, sum(doanh_thu_ytd) AS khong_cong_duoc
FROM fct_thang;
```

Any column whose sum matches no business figure at all = a column that shouldn't be summed.

## Related Topics

- [Year-to-date and timespan](../skills/ytd-timespan-facts.md) — the technique skipped here
- [Facts and dimensions](../reference/fact-and-dimension.md) — the three levels of additivity
- [Aggregate fact tables](../skills/aggregate-fact-table.md) — the same rule: store only summable numbers
- [CS: the summary table with divergent numbers](bang-tong-hop-lech-so.md) — the same illness with an `avg` column
