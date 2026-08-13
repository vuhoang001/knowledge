---
title: Role-playing dimensions
sidebar_position: 5
description: One dimension playing several roles in the same fact — use views with meaningful names, don't duplicate the table.
tags: [role-playing-dimension, dimension, data-modeling, kimball]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Role-playing dimensions

> **Takeaway:** the same dimension is referenced several times by a fact with **different meanings**
> (order date, ship date, payment date). The solution is **views with meaningful names**, not
> copying the table, and not aliasing at query time.

## The goal

To answer a very common question: the fact has three date columns — do I need three `dim_thoi_gian` tables?
No. But nor should you leave whoever writes the query to fend for themselves.

## The problem

```text
fct_don_hang
ma_don | ngay_dat_sk | ngay_giao_sk | ngay_thanh_toan_sk | thanh_tien
```

All three columns point back at `dim_thoi_gian`. Left like that, every query has to write:

```sql
FROM fct_don_hang f
JOIN dim_thoi_gian d1 ON f.ngay_dat_sk = d1.ngay_sk
JOIN dim_thoi_gian d2 ON f.ngay_giao_sk = d2.ngay_sk
```

`d1` and `d2` say nothing. Reading it again six months later, or somebody else reading it, means confusion.
And everybody aliases differently — while a BI tool usually **can't** alias at all.

## Three approaches, only one correct

| Approach | Verdict |
|---|---|
| Copy `dim_thoi_gian` into three physical tables | **Wrong.** Three copies of the data must stay in sync; changing the quarter definition means changing three places |
| Leave it and let each query alias | **Wrong.** It pushes the naming onto the reader; BI tools can't do it |
| **Views with meaningful names over the same table** | Correct |

## The worked example

Runs on DuckDB.

### Step 1 — the base dimension, a single table

```sql
CREATE TABLE dim_thoi_gian AS
SELECT
  CAST(strftime(d, '%Y%m%d') AS INTEGER) AS ngay_sk,
  d                                      AS ngay,
  year(d)                                AS nam,
  quarter(d)                             AS quy,
  month(d)                               AS thang,
  dayofweek(d) IN (0, 6)                 AS la_cuoi_tuan
FROM range(DATE '2026-01-01', DATE '2027-01-01', INTERVAL 1 DAY) AS t(d);
```

### Step 2 — one view per role

```sql
CREATE VIEW dim_ngay_dat AS
SELECT ngay_sk AS ngay_dat_sk, ngay AS ngay_dat, nam AS nam_dat,
       quy AS quy_dat, thang AS thang_dat, la_cuoi_tuan AS dat_cuoi_tuan
FROM dim_thoi_gian;

CREATE VIEW dim_ngay_giao AS
SELECT ngay_sk AS ngay_giao_sk, ngay AS ngay_giao, nam AS nam_giao,
       quy AS quy_giao, thang AS thang_giao, la_cuoi_tuan AS giao_cuoi_tuan
FROM dim_thoi_gian;
```

**Renaming the columns in the view is the most important part**, not a matter of aesthetics. Thanks to it,
`SELECT *` produces no name collisions, and whoever reads the query sees `quy_dat` and understands immediately —
without tracing back to see what `d1` was.

In dbt, each view is a `materialized: view` model referring to `ref('dim_thoi_gian')`.

### Step 3 — a query readable without comments

```sql
SELECT dd.quy_dat, dg.thang_giao, count(*) AS so_don
FROM fct_don_hang f
JOIN dim_ngay_dat  dd USING (ngay_dat_sk)
JOIN dim_ngay_giao dg USING (ngay_giao_sk)
GROUP BY dd.quy_dat, dg.thang_giao
ORDER BY dd.quy_dat;
```

```text
┌─────────┬────────────┬────────┐
│ quy_dat │ thang_giao │ so_don │
├─────────┼────────────┼────────┤
│       1 │          1 │      1 │
│       1 │          3 │      2 │
│       2 │          4 │      1 │
└─────────┴────────────┴────────┘
```

Immediately readable: ordered in Q1 but 2 of those orders only shipped in March. The same result as the
`d1`/`d2` alias version, but this one **explains itself**.

Compared with the `d1`/`d2` alias version: the same result, but this one **explains itself**.

### Before and after

| | Aliases in the query | Role-playing views |
|---|---|---|
| Data tables | 1 | 1 — a view costs no space |
| The reader understands immediately | no | yes |
| A BI tool can drag and drop it | hard | yes |
| Changing the quarter definition | one place | one place |

## When you DON'T need it

If the fact references the dimension only **once**, there are no roles to distinguish — building views
just adds a pointless layer of indirection.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Copying the dimension into several physical tables | Three copies to keep in sync; sooner or later they diverge |
| Creating the view but **not** renaming the columns | `SELECT *` collides on names, and you still can't tell which column belongs to which role |
| Naming the view after the table (`dim_thoi_gian_2`) | It solves nothing — the name still carries no meaning |
| Forgetting `dim_ngay_giao` for orders **not yet shipped** | The join loses rows; you need an "unknown" row in the dimension or a deliberate `LEFT JOIN` |

That last row is a real trap: an unshipped order has a null `ngay_giao_sk`. An ordinary `JOIN` will **wipe
out** in-progress orders from the report, with no error reported.

## Related Topics

- [Facts and dimensions](../reference/fact-and-dimension.md) — why you need `dim_thoi_gian` rather than a date column
- [Conformed dimensions](conformed-dimension.md) — sharing between several **facts**, distinct from several **roles** in one fact
- [Surrogate keys](../reference/surrogate-key.md) — the key every role points back at
- [Star, snowflake, OBT](../reference/star-snowflake-obt.md) — role views are still a star, not a snowflake
