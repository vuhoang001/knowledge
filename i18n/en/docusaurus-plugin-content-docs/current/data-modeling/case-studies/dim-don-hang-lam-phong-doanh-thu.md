---
title: Building dim_don_hang "properly per Kimball", and revenue inflates 40%
sidebar_position: 9
description: "The order number gets split into its own dimension and then Type 2 is turned on for the status — each order multiplies by its number of status changes."
tags: [case-study, degenerate-dimension, scd, grain, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Building `dim_don_hang` "properly per Kimball", and revenue inflates 40%

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** not every key in a fact needs a dimension. A key drained of all its
> attributes stays in the fact — that's a
> [degenerate dimension](../skills/degenerate-dimension.md). Building a table for it creates a
> table with the same grain as the fact, and that table will duplicate rows.

## Context

A design review. Somebody comments: *"`fct_ban` has a `so_don` column pointing at no
dimension — the normalisation isn't finished."* It sounds very convincing, and it's true of every other key
in the table.

`dim_don_hang` is born. But the table has only `don_sk` and `so_don` — it looks empty. So `trang_thai`
is moved from the fact into it, and because the status changes over time, [SCD](../skills/scd.md)
Type 2 is turned on to keep the history. Every decision in that chain is reasonable.

```sql
CREATE TABLE dim_don_hang AS
SELECT * FROM (VALUES
  (1, 'DH-001', 'moi',        DATE '2026-01-01', DATE '2026-01-03'),
  (2, 'DH-001', 'dang_giao',  DATE '2026-01-03', DATE '2026-01-06'),
  (3, 'DH-001', 'hoan_thanh', DATE '2026-01-06', DATE '9999-12-31'),
  (4, 'DH-002', 'moi',        DATE '2026-01-02', DATE '2026-01-05'),
  (5, 'DH-002', 'dang_giao',  DATE '2026-01-05', DATE '9999-12-31'),
  (6, 'DH-003', 'moi',        DATE '2026-01-04', DATE '9999-12-31'),
  (7, 'DH-004', 'hoan_thanh', DATE '2026-01-04', DATE '9999-12-31')
) t(don_sk, so_don, trang_thai, hieu_luc_tu, hieu_luc_den);

CREATE TABLE fct_ban AS
SELECT * FROM (VALUES ('DH-001', 100), ('DH-002', 200), ('DH-003', 300), ('DH-004', 400))
  t(so_don, doanh_thu);
```

Real revenue: **1,000** across 4 orders.

## Symptoms

The dashboard reports revenue of **1,400**.

```sql
SELECT count(*) AS dong_sau_join, sum(f.doanh_thu) AS doanh_thu_bao_cao
FROM fct_ban f JOIN dim_don_hang d USING (so_don);
```

```text
┌───────────────┬───────────────────┐
│ dong_sau_join │ doanh_thu_bao_cao │
├───────────────┼───────────────────┤
│             7 │              1400 │
└───────────────┴───────────────────┘
```

**40% inflated.** What makes this case even more irritating: the detail table still looks entirely plausible.

```sql
SELECT d.trang_thai, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_don_hang d USING (so_don)
GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌────────────┬───────────┐
│ trang_thai │ doanh_thu │
├────────────┼───────────┤
│ moi        │       600 │
│ hoan_thanh │       500 │
│ dang_giao  │       300 │
└────────────┴───────────┘
```

Three rows, three round numbers. Only their total is wrong. And nobody adds three rows up in their
head while looking at a dashboard.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| Duplicate orders in the source data | `count(DISTINCT so_don)` in the source = 4, clean |
| The ETL ran twice | Checking the log: it ran exactly once |
| `fct_ban` was loaded twice | `count(*) FROM fct_ban` = 4, correct |
| Some join is missing a condition | **Nearly right** — but the join condition *appears* complete: `USING (so_don)` |

A whole session goes into examining `fct_ban`, because the default reflex is "inflated numbers mean the fact
duplicated". The fact is entirely clean — **the dimension is the duplicating side**.

One query redirects the whole investigation:

```sql
SELECT (SELECT count(*) FROM fct_ban)                    AS dong_fact,
       (SELECT count(*) FROM dim_don_hang)               AS dong_dim,
       (SELECT count(DISTINCT so_don) FROM dim_don_hang) AS so_don_phan_biet;
```

```text
┌───────────┬──────────┬──────────────────┐
│ dong_fact │ dong_dim │ so_don_phan_biet │
├───────────┼──────────┼──────────────────┤
│         4 │        7 │                4 │
└───────────┴──────────┴──────────────────┘
```

**The dimension has more rows than the fact.** With a proper dimension, that number should be hundreds of
times smaller than the fact.

## The real cause

Two bugs stacked on each other:

1. **`so_don` doesn't deserve its own dimension.** Once every order attribute is split out
   (`dim_ngay`, `dim_khach`, `dim_kenh`), `dim_don_hang` has nothing left but the order number
   itself. Its grain equals the fact's grain — it's a second fact disguised as a dimension.

2. **Type 2 on that table turns 1 order into N rows.** A `USING (so_don)` join has no time
   condition, so each order matches every one of its status versions. `DH-001` has 3
   versions → counted 3 times.

This is the same class of fan-out as [joining two facts inflating the total](join-hai-fact-lam-phong-tong.md),
except the duplicating side wears the name "dimension", so nobody suspects it.

The figure 1,400 = 100×3 + 200×2 + 300×1 + 400×1.

## Why no test catches it

| Test | The result |
|---|---|
| `unique` on `dim_don_hang.don_sk` | ✅ green |
| `not_null` on `so_don` in both tables | ✅ green |
| `relationships` fact → dim | ✅ green |
| `unique_combination_of_columns [so_don, hieu_luc_tu]` | ✅ green |
| `unique` on `fct_ban.so_don` | ✅ green |

Each table is correct. The error only appears **after the join** — and no default test
runs over a join's result.

The only test that catches it is one few people write: *"total revenue after joining the dimension must
equal total revenue in the fact"*.

## The fix

`so_don` goes back into the fact as an ordinary column. The status becomes a real dimension — a few rows,
reusable.

```sql
CREATE TABLE dim_trang_thai AS
SELECT * FROM (VALUES (1,'moi'),(2,'dang_giao'),(3,'hoan_thanh')) t(trang_thai_sk, trang_thai);

CREATE TABLE fct_ban_dung AS
SELECT * FROM (VALUES
  ('DH-001', 3, 100), ('DH-002', 2, 200), ('DH-003', 1, 300), ('DH-004', 3, 400)
) t(so_don, trang_thai_sk, doanh_thu);

SELECT t.trang_thai, count(*) AS so_don, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban_dung f JOIN dim_trang_thai t USING (trang_thai_sk)
GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌────────────┬────────┬───────────┐
│ trang_thai │ so_don │ doanh_thu │
├────────────┼────────┼───────────┤
│ hoan_thanh │      2 │       500 │
│ moi        │      1 │       300 │
│ dang_giao  │      1 │       200 │
└────────────┴────────┴───────────┘
```

```text
┌────────┬────────┐
│  tong  │ so_don │
├────────┼────────┤
│   1000 │      4 │
└────────┴────────┘
```

**And the status history?** It isn't lost — it moves to its proper home, an
**accumulating snapshot**: one row per order, with timestamp milestone columns updated in place as
the order progresses. See [Facts and dimensions](../reference/fact-and-dimension.md) and
[the lab, step 5](../tutorials/star-schema-duckdb.md).

The history of a **process** is a fact. Only the history of an **entity** is a Type 2
dimension.

| | Before | After |
|---|---|---|
| Reported revenue | 1,400 | **1,000** |
| Dimension rows | 7, growing with each status change | 3, immutable |
| Answering "where is the order stuck" | Yes, but with wrong numbers | Yes, in the accumulating snapshot |

## How to spot it early

1. **The dimension-rows / fact-rows ratio approaching 1.** This is the strongest sign:

```sql
SELECT 'dim_don_hang' AS bang,
       count(*) AS dong_dim,
       (SELECT count(*) FROM fct_ban) AS dong_fact,
       round(1.0 * count(*) / (SELECT count(*) FROM fct_ban), 2) AS ty_le
FROM dim_don_hang;
```

A ratio > 0.5 is suspect; ≥ 1 is almost certainly wrong.

2. There's a table named `dim_<singular noun for a transaction>`: `dim_don_hang`, `dim_hoa_don`,
   `dim_giao_dich`.

3. An invariant test you should already have: the total after a join must equal the total before it.

```sql
SELECT (SELECT sum(doanh_thu) FROM fct_ban)                      AS truoc_join,
       (SELECT sum(f.doanh_thu) FROM fct_ban f
        JOIN dim_don_hang d USING (so_don))                      AS sau_join;
```

Two different numbers means fan-out, whatever the other table happens to be called.

## Related Topics

- [Degenerate dimensions](../skills/degenerate-dimension.md) — the correct technique for this case
- [Grain](../reference/grain.md) — the "is the dimension coarser than the fact" test
- [SCD](../skills/scd.md) — Type 2 used in the right place causes no fan-out
- [Facts and dimensions](../reference/fact-and-dimension.md) — accumulating snapshots for process history
- [CS: joining two facts inflating the total](join-hai-fact-lam-phong-tong.md) — the same row-duplicating mechanism
