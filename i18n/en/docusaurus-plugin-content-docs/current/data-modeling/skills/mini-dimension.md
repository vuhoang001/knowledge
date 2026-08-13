---
title: Mini-dimensions
sidebar_position: 4
description: Splitting a few fast-changing columns out of a large dimension so Type 2 doesn't make the whole table bloat at the fastest column's rate.
tags: [mini-dimension, scd, dimension, data-modeling, kimball]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Mini-dimensions

> **Takeaway:** with a large dimension containing a few fast-changing columns, Type 2 makes **the whole table** bloat at
> the fastest column's rate. Split exactly those columns out into a small table holding **every value
> combination**, and have the fact carry two keys instead of one.

## The goal

To resolve the conflict: you need history for a few attributes, but turning [SCD](scd.md) Type 2 on for the whole
dimension explodes the row count.

## The problem

`dim_khach_hang` has 5 million rows. Within it:

| Column | Change rate |
|---|---|
| `ho_ten`, `ngay_sinh`, `ngay_mo_tk` | almost never changes |
| `nhom_thu_nhap`, `nhom_tuoi` | **every quarter** |

Turn Type 2 on for the whole table: each quarter adds another ~5 million rows. After three years that's 60 million rows
for 5 million customers — and 90% of the rows differ only in two columns.

## The approach

Split the two frequently changing columns into their own table holding **every possible combination**, not every customer:

```text
dim_khach_hang        5.000.000 dòng, Type 1 — ổn định
dim_khach_hang_nhom          20 dòng, bất biến — 5 nhóm thu nhập × 4 nhóm tuổi
fct_don_hang                 khach_sk + khach_nhom_sk
```

The history **no longer** lives in the dimension but in the **fact**: each fact row records which group the
customer was in at the time. That's the reversal compared with Type 2 — and also why this technique
is hard to grasp the first time.

## The worked example

Runs on DuckDB.

### Step 1 — measure before deciding

The numbers here choose for you; this isn't a token check:

```sql
SELECT
  count(*)                                        AS so_khach,
  count(DISTINCT nhom_thu_nhap || '|' || nhom_tuoi) AS so_to_hop,
  count(*) FILTER (WHERE nhom_thu_nhap IS NOT NULL) AS co_du_lieu
FROM dim_khach_hang_raw;
```

With 6 sample customers:

```text
┌──────────┬───────────┬────────────┐
│ so_khach │ so_to_hop │ co_du_lieu │
├──────────┼───────────┼────────────┤
│        6 │         5 │          6 │
└──────────┴───────────┴────────────┘
```

At real scale the numbers are *a few million customers / a few dozen combinations* — that gap is what
makes a mini-dimension worth building.

| What you see | What to do |
|---|---|
| The combination count is **very small** relative to the customer count (dozens vs millions) | A mini-dimension is worth it |
| The combination count approaches the customer count | It can't be split out — that attribute is essentially a key |
| The column changes as slowly as the rest | No mini-dimension needed, ordinary Type 2 will do |

### Step 2 — build the mini-dimension

Generate every combination, **independent** of the existing customer data — because a combination that hasn't
appeared today can still appear next month:

```sql
CREATE TABLE dim_khach_hang_nhom AS
SELECT
  row_number() OVER (ORDER BY tn.nhom, tuoi.nhom) AS khach_nhom_sk,
  tn.nhom   AS nhom_thu_nhap,
  tuoi.nhom AS nhom_tuoi
FROM (VALUES ('Dưới 10tr'),('10-20tr'),('20-50tr'),('50-100tr'),('Trên 100tr')) AS tn(nhom)
CROSS JOIN (VALUES ('18-25'),('26-35'),('36-50'),('Trên 50')) AS tuoi(nhom);
```

This is where it **differs from a junk dimension**: a junk dimension only generates combinations that *actually appear*;
a mini-dimension generates *the whole Cartesian product* because the value set is small and fixed.

### Step 3 — the fact holds two keys

```sql
CREATE TABLE fct_don_hang AS
SELECT
  d.ma_don,
  d.ngay,
  k.khach_sk,           -- ai
  n.khach_nhom_sk,      -- lúc đó thuộc nhóm nào
  d.thanh_tien
FROM don_hang_raw d
JOIN dim_khach_hang k  ON d.ma_khach = k.ma_khach
JOIN dim_khach_hang_nhom n
  ON  d.nhom_thu_nhap_luc_dat = n.nhom_thu_nhap
  AND d.nhom_tuoi_luc_dat     = n.nhom_tuoi;
```

`nhom_..._luc_dat` must come from the source system **as of when the order was placed**. Taking the current
value loses all the history — and that's exactly the bug mini-dimensions exist to avoid.

### Step 4 — the verification query

The *as-was* question: "revenue by income group **at purchase time**".

```sql
SELECT n.nhom_thu_nhap, sum(f.thanh_tien) AS doanh_thu
FROM fct_don_hang f
JOIN dim_khach_hang_nhom n USING (khach_nhom_sk)
GROUP BY n.nhom_thu_nhap
ORDER BY doanh_thu DESC;
```

```text
┌───────────────┬───────────┐
│ nhom_thu_nhap │ doanh_thu │
├───────────────┼───────────┤
│ 50-100tr      │   2000000 │
│ 20-50tr       │    800000 │
│ 10-20tr       │    450000 │
└───────────────┴───────────┘
```

The full mini-dimension is **20 rows** (5 income groups × 4 age groups) even though the sample data only
uses 5 combinations — exactly the point of generating the whole Cartesian product.

### Before and after

| | Type 2 on the whole table | A mini-dimension |
|---|---|---|
| Dimension rows after 3 years | ~60,000,000 | 5,000,000 + 20 |
| Answers the *as-was* question | yes | yes |
| Answers *"which group is this customer in now"* | yes | **you must query the source system** or add a Type 1 column |
| Difficulty to understand | low | high — the history lives in the fact, not the dim |

## Trade-offs

| You get | You lose |
|---|---|
| The main dimension doesn't bloat | The fact gets another key and another join |
| A fixed combination set needing no maintenance | You can't answer "the current group" without adding a column |
| History accurate down to each transaction | A newcomer reading the model won't immediately see why there are two customer keys |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Taking the **current** `nhom_thu_nhap` when loading the fact | All the history is lost — exactly what mini-dimensions exist to keep |
| Putting a high-cardinality column into the mini-dimension | The Cartesian product explodes and the mini-dimension is bigger than the main one |
| Using a mini-dimension when the column changes slowly | An extra join in exchange for nothing — [SCD](scd.md) Type 2 is enough |
| Dropping the `khach_sk` key and keeping only `khach_nhom_sk` | You no longer know **whose** order it was |

## Related Topics

- [SCD](scd.md) — a mini-dimension is Type 4 in that classification
- [Junk dimensions](junk-dimension.md) — also combining small columns, but only generating combinations that exist
- [Facts and dimensions](../reference/fact-and-dimension.md) — why a fast-changing attribute is a sign of a fact
- [Grain](../reference/grain.md) — adding a key to a fact does **not** change its grain
