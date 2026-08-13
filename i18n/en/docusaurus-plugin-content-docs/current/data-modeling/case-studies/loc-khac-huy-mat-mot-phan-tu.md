---
title: Filtering "not cancelled" losing a quarter of the revenue
sidebar_position: 15
description: "WHERE trang_thai <> 'huy' also excludes the NULL rows, because three-valued logic treats 'unknown' as distinct from 'true'."
tags: [case-study, null-handling, filter, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Filtering "not cancelled" losing a quarter of the revenue

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** `NULL <> 'huy'` doesn't return `TRUE`, it returns `UNKNOWN` — and `WHERE` only
> keeps `TRUE`. See [NULLs in facts and dimensions](../skills/null-handling.md).

## Context

Five orders. One (`D4`) was just created and hasn't been through approval, so its `trang_thai` is still empty.

```sql
CREATE TABLE fct_don AS
SELECT * FROM (VALUES
  ('D1', 'hoan_thanh', 200, 50),
  ('D2', 'hoan_thanh', 300, 0),
  ('D3', 'huy',        200, NULL),
  ('D4', NULL,         200, NULL),
  ('D5', 'hoan_thanh', 100, NULL)
) t(so_don, trang_thai, doanh_thu, giam_gia);
```

The truth: **5 orders, 1,000 of revenue**. Exactly 1 order was cancelled (200), so the
"not cancelled" revenue should be **800**.

## Symptoms

The revenue dashboard says **600**. Accounting's report says 800.

```sql
SELECT count(*) AS so_dong, sum(doanh_thu) AS doanh_thu
FROM fct_don WHERE trang_thai <> 'huy';
```

```text
┌─────────┬───────────┐
│ so_dong │ doanh_thu │
├─────────┼───────────┤
│       3 │       600 │
└─────────┴───────────┘
```

Three rows instead of four. **25% short**, and the shortfall changes daily with the number of orders awaiting approval
— so nobody finds a pattern.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| A cancelled order accounting hasn't updated | Reconciled: exactly 1 cancelled order on both sides |
| The dashboard adds a date condition | Removing every other filter still gives 600 |
| The ETL loaded incompletely | `count(*) FROM fct_don` = 5, complete |
| A duplicate order wrongly deduplicated | There are no duplicates |

Where the time goes: a whole session examining the **data**, while the bug is in the **filter**. Anybody reading
`WHERE trang_thai <> 'huy'` nods along — it reads exactly like the English "status other than
cancelled".

The redirecting question: *"does adding up the revenue of every status group give 1,000?"*

## The real cause

SQL uses **three-valued logic**: `TRUE`, `FALSE`, `UNKNOWN`.

`NULL <> 'huy'` isn't `TRUE` but `UNKNOWN` — because if you don't know the status, you can't assert
it differs from `'huy'`. The `WHERE` clause keeps only rows evaluating to `TRUE`, so `D4`
is excluded along with `D3`.

This **isn't SQL's fault** — it's consistent with the logic. It just doesn't match how a person reading
that statement understands it.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on `doanh_thu` | ✅ green |
| `not_null` on `trang_thai` | ❌ — but **nobody declares it**, because empty is legitimate |
| `accepted_values` for `trang_thai` | ✅ green (skipping `NULL` by default) |
| The `fct_don` total matching the source | ✅ green |
| The row count matching the source | ✅ green |

The third row is worth remembering: dbt's `accepted_values` **skips `NULL`** unless configured otherwise.
So even the value-list test doesn't see the problem.

The source table is entirely correct. The bug arises in the reporting layer, where data tests can't reach.

## The fix

### The immediate fix — say explicitly where NULL goes

```sql
SELECT count(*) AS so_dong, sum(doanh_thu) AS doanh_thu
FROM fct_don WHERE trang_thai IS DISTINCT FROM 'huy';
```

```text
┌─────────┬───────────┐
│ so_dong │ doanh_thu │
├─────────┼───────────┤
│       4 │       800 │
└─────────┴───────────┘
```

### The root fix — group and look, don't filter and trust

```sql
SELECT coalesce(trang_thai, '(chua xac dinh)') AS trang_thai,
       count(*) AS so_don, sum(doanh_thu) AS doanh_thu
FROM fct_don GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌─────────────────┬────────┬───────────┐
│   trang_thai    │ so_don │ doanh_thu │
├─────────────────┼────────┼───────────┤
│ hoan_thanh      │      3 │       600 │
│ huy             │      1 │       200 │
│ (chua xac dinh) │      1 │       200 │
└─────────────────┴────────┴───────────┘
```

600 + 200 + 200 = 1,000. The `(chua xac dinh)` group **appears** rather than vanishing, and the
viewer decides for themselves where it belongs.

### The deepest fix — don't let NULL into the dimension

An undetermined status should be **a value** (`'cho_duyet'`), not `NULL`. See
[designing dimension attributes](../skills/dimension-attribute-design.md).

| | Before | After |
|---|---|---|
| Reported revenue | 600 (**25% short**) | 800 |
| Orders awaiting approval | Vanished | Shown as a group |
| Divergence detected by | Accounting reconciling | The group totals matching the table total |

## How to spot it early

1. **The most important invariant:** the sum of all the groups must equal the table's total.

```sql
SELECT (SELECT sum(doanh_thu) FROM fct_don) AS tong_bang,
       (SELECT sum(doanh_thu) FROM fct_don WHERE trang_thai <> 'huy')
     + (SELECT sum(doanh_thu) FROM fct_don WHERE trang_thai = 'huy') AS tong_cac_nhom;
```

Two different numbers = rows are falling outside every group.

2. Grep for negative filters on nullable columns:

```bash
grep -rn "<>\|!=\|NOT IN" models/marts/ | head
```

3. Count the `NULL`s in every column used for filtering — make it a `severity: warn` test with a threshold.

## Related Topics

- [NULLs in facts and dimensions](../skills/null-handling.md) — the four traps of three-valued logic
- [Designing dimension attributes](../skills/dimension-attribute-design.md) — a label instead of `NULL`
- [The six dimensions of data quality](../../data-quality/six-dimensions.md) — completeness
- [CS: half the orders vanished](don-dang-giao-bien-mat.md) — the same family: rows lost silently
