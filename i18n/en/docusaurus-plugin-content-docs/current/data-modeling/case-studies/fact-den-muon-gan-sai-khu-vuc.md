---
title: The North's revenue is zero, and 28% of revenue has vanished
sidebar_position: 11
description: "The ETL joins the dimension by la_hien_tai: late-arriving transactions get the current region, while customers with no record yet are thrown away by the JOIN."
tags: [case-study, late-arriving, scd, etl, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# The North's revenue is zero, and 28% of revenue has vanished

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** one line of `AND d.la_hien_tai` in the ETL throws away all of SCD Type 2's value,
> and an `INNER JOIN` to the dimension throws away every fact arriving before its record. These two bugs
> almost always travel together — see [late-arriving data](../skills/late-arriving.md).

## Context

The warehouse got the hard part right: `dim_khach` is [SCD](../skills/scd.md) Type 2, keeping the full
region history. Customer `C1` moved from the North to the South on 2026-02-01, and both versions
are intact in the table.

```sql
CREATE TABLE dim_khach AS
SELECT * FROM (VALUES
  (1, 'C1', 'Mien Bac', DATE '2025-01-01', DATE '2026-02-01', false),
  (2, 'C1', 'Mien Nam', DATE '2026-02-01', DATE '9999-12-31', true),
  (3, 'C2', 'Mien Nam', DATE '2025-01-01', DATE '9999-12-31', true)
) t(khach_sk, khach_id, khu_vuc, hieu_luc_tu, hieu_luc_den, la_hien_tai);

CREATE TABLE stg_ban AS
SELECT * FROM (VALUES
  ('B1', 'C1', DATE '2026-01-10', DATE '2026-03-05', 1000),  -- ve muon 54 ngay
  ('B2', 'C1', DATE '2026-02-15', DATE '2026-02-15',  500),
  ('B3', 'C2', DATE '2026-01-20', DATE '2026-01-20',  300),
  ('B4', 'C3', DATE '2026-01-25', DATE '2026-01-25',  700)   -- C3 chua co ho so
) t(ma_ban, khach_id, ngay_gd, ngay_nhan, doanh_thu);
```

The truth: **2,500** across 4 rows.

Two mundane details: the branch sends data slowly, so `B1` happened on 10 January but only reached the
warehouse on 5 March; and `B4` belongs to customer `C3` whose CRM record hasn't synced across yet.

## Symptoms

The revenue-by-region report in March:

```text
┌──────────┬───────────┬─────────┐
│ khu_vuc  │ doanh_thu │ so_dong │
├──────────┼───────────┼─────────┤
│ Mien Nam │      1800 │       3 │
└──────────┴───────────┴─────────┘
```

Three things wrong at once, and none of them announces itself:

1. **The North has vanished from the report** — not showing zero, but having no row at all.
2. The total is down to 1,800 out of 2,500 — **28% short**.
3. The North's January revenue has been moved to the South, so the South looks better.

```sql
SELECT sum(s.doanh_thu) AS tong_vao_kho, 4 - count(*) AS dong_bi_mat
FROM stg_ban s JOIN dim_khach d ON d.khach_id = s.khach_id AND d.la_hien_tai;
```

```text
┌──────────────┬─────────────┐
│ tong_vao_kho │ dong_bi_mat │
├──────────────┼─────────────┤
│         1800 │           1 │
└──────────────┴─────────────┘
```

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| The North genuinely sold nothing | Asked the branch: January had sales and invoices |
| A dashboard filter blocking the North | Removing every filter still shows no row |
| `dim_khach` lost the North row | `SELECT * FROM dim_khach` — the row is intact, `khach_sk = 1` |
| The fact loaded incompletely | `count(*) FROM stg_ban` = 4, staging is complete |

Where the longest stretch of time goes: **the dimension has all the data, staging has all the data, but the
warehouse doesn't.** Meaning the loss happens in the load step itself — where few people look because it's
"just one join".

The redirecting question: *"why was the North row in `dim_khach` never used once?"*

## The real cause

The ETL's join:

```sql
FROM stg_ban s JOIN dim_khach d
  ON d.khach_id = s.khach_id AND d.la_hien_tai
```

Two words in that statement cause both bugs:

**`AND d.la_hien_tai`** — the ETL asks *"which region is C1 in **now**"*. For `B1` (a 10 January
transaction), the correct answer is *"C1 was in the North then"*. The entire purpose of Type 2 is
nullified by one clause.

That bug only surfaces with a late-arriving fact: `B1` was loaded on 5 March, after `C1` had already moved.
If the data arrives on time, this wrong clause still gives the right answer — so it **survives
every round of testing**.

**`JOIN`** (inner) — `C3` isn't in `dim_khach`, so `B4` matches no row and is
thrown away silently. The same mechanism as [half the orders vanishing](don-dang-giao-bien-mat.md).

## Why no test catches it

| Test | The result |
|---|---|
| `unique` on `dim_khach.khach_sk` | ✅ green |
| `not_null` on every fact key | ✅ green |
| `relationships` fact → `dim_khach` | ✅ green — **the excluded rows aren't there to be checked** |
| No overlapping validity intervals | ✅ green |
| `accepted_values` for `khu_vuc` | ✅ green |

The third row is the most memorable trap: a referential-integrity test only checks **the rows that made it into
the warehouse**. A row discarded by an `INNER JOIN` is never checked, because it doesn't exist.

The only test that catches it: **reconciling the row count and the total amount between staging and the warehouse** —
something you must write yourself, absent from the standard test set.

## The fix

### Fix 1 — join on the transaction date

```sql
SELECT d.khu_vuc, sum(s.doanh_thu) AS doanh_thu, count(*) AS so_dong
FROM stg_ban s JOIN dim_khach d
  ON d.khach_id = s.khach_id
 AND s.ngay_gd >= d.hieu_luc_tu AND s.ngay_gd < d.hieu_luc_den
GROUP BY 1 ORDER BY 1;
```

```text
┌──────────┬───────────┬─────────┐
│ khu_vuc  │ doanh_thu │ so_dong │
├──────────┼───────────┼─────────┤
│ Mien Bac │      1000 │       1 │
│ Mien Nam │       800 │       2 │
└──────────┴───────────┴─────────┘
```

The North is back with exactly 1,000.

### Fix 2 — an inferred member for the customer with no record

```sql
INSERT INTO dim_khach VALUES
  (4, 'C3', 'Chua biet', DATE '1900-01-01', DATE '9999-12-31', true);
```

```text
┌───────────┬───────────┬─────────┐
│  khu_vuc  │ doanh_thu │ so_dong │
├───────────┼───────────┼─────────┤
│ Chua biet │       700 │       1 │
│ Mien Bac  │      1000 │       1 │
│ Mien Nam  │       800 │       2 │
└───────────┴───────────┴─────────┘
```

```text
┌────────┬─────────┐
│  tong  │ so_dong │
├────────┼─────────┤
│   2500 │       4 │
└────────┴─────────┘
```

**2,500 / 4 rows** — matching the source.

The important point: the `Chua biet` group **appears on the report**. Missing data becomes something
visible instead of a gap nobody knows about. When `C3`'s record arrives, overwrite in place
(Type 1) and the fact needn't be reloaded:

```sql
UPDATE dim_khach SET khu_vuc = 'Mien Trung' WHERE khach_id = 'C3';
```

```text
┌────────────┬───────────┐
│  khu_vuc   │ doanh_thu │
├────────────┼───────────┤
│ Mien Bac   │      1000 │
│ Mien Nam   │       800 │
│ Mien Trung │       700 │
└────────────┴───────────┘
```

### Before and after

| | Before | After |
|---|---|---|
| Total revenue | 1,800 (**28% short**) | 2,500 |
| The North | No row | 1,000 |
| Customers with no record | Rows lost | Shown as `Chua biet` |
| Type 2's value | Nullified | Used for its actual purpose |

## How to spot it early

1. **Grep the whole codebase** — the cheapest check and the one that catches the most:

```bash
grep -rn "la_hien_tai\|is_current\|dbt_valid_to is null" models/
```

Every occurrence inside a **fact** model deserves review. Inside a *current-state view* model it's
correct; inside a historical fact-loading model it's almost always wrong.

2. Measure the data delay — turning the "arrives on time" assumption into a number:

```sql
SELECT round(100.0 * sum(doanh_thu) FILTER (WHERE date_trunc('month', ngay_nhan)
                                               > date_trunc('month', ngay_gd))
             / sum(doanh_thu), 1) AS pct_ve_sau_khi_chot_ky
FROM stg_ban;
```

```text
┌────────────────────────┐
│ pct_ve_sau_khi_chot_ky │
├────────────────────────┤
│                   40.0 │
└────────────────────────┘
```

**40% of revenue arrives after the period is closed.** That number decides the reload window of an
incremental model — see [materializations](../../etl/dbt/reference/materializations.md).

3. Reconcile staging ↔ warehouse after every load:

```sql
SELECT (SELECT count(*) FROM stg_ban) AS staging,
       (SELECT count(*) FROM fct_ban) AS kho;
```

A difference of one row means a row was thrown away by the `JOIN`.

4. Snapshot the totals of **closed** periods and compare on each run. A change = late-arriving data.

## Related Topics

- [Late-arriving data](../skills/late-arriving.md) — the technique skipped here
- [SCD](../skills/scd.md) — Type 2 only has value if the ETL joins on the transaction date
- [The date dimension](../reference/date-dimension.md) — the `-1` row for a milestone that hasn't happened
- [CS: half the orders vanished](don-dang-giao-bien-mat.md) — the same `INNER JOIN` row-dropping mechanism
- [CS: historical reports changing their own numbers](bao-cao-qua-khu-tu-doi-so.md) — the inverse consequence of the same decision
