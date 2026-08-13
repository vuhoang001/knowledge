---
title: "Foundations lab — grain, fact/dimension, keys: four ways to inflate numbers"
sidebar_position: 3
description: "Reproduce four classic inflation cases yourself on one dataset, then fix each one — every number really run."
tags: [tutorial, grain, fact, dimension, surrogate-key, degenerate-dimension, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Foundations lab — grain, fact/dimension, keys: four ways to inflate numbers

> **Takeaway:** the four exercises below all inflate revenue, all **raise no error**,
> and all stem from one unanswered question: *what is one row of this table*.

## Preparation

```bash
cd ~/Documents/learn-lab/dbt
./.venv/bin/dbt seed --profiles-dir .
```

The four baseline numbers — **write them down**; every exercise below reconciles against them:

```text
┌───────┬──────────┬───────────┬──────────┐
│  don  │ dong_don │ doanh_thu │ phi_ship │
├───────┼──────────┼───────────┼──────────┤
│    10 │       15 │  10215000 │   400000 │
└───────┴──────────┴───────────┴──────────┘
```

Open DuckDB on the lab file itself:

```bash
./.venv/bin/python -c "import duckdb; duckdb.connect('lab.duckdb').sql('...').show()"
```

## Exercise 1 — Measure the grain, don't guess it

Don't look at the table name and infer. Count:

```sql
select count(*) so_dong,
       count(distinct don_hang_id) so_don,
       count(distinct (don_hang_id, dong)) so_khoa_to_hop
from don_hang_chi_tiet;
```

```text
┌─────────┬────────┬────────────────┐
│ so_dong │ so_don │ so_khoa_to_hop │
├─────────┼────────┼────────────────┤
│      15 │     10 │             15 │
└─────────┴────────┴────────────────┘
```

`so_khoa_to_hop` equals `so_dong` → the grain is **`(don_hang_id, dong)`**.
`so_don` is only 10 → `don_hang_id` is **not** a key.

Write the grain as one sentence before going any further:

> *"One row of `don_hang_chi_tiet` is **one goods line within one order**."*

| Your result |
|---|
| |

**What to do:** declare a `unique` test on `don_hang_id` in `schema.yml` and run
`dbt test`. It FAILS. Is the data wrong or the test? See [Grain](../reference/grain.md).

## Exercise 2 — Mixing two grains: shipping fees 77.5% inflated

`don_hang` has `phi_ship` at **order level**. `don_hang_chi_tiet` is at **line level**. Join and sum:

```sql
select sum(h.phi_ship) phi_ship_bao_cao
from don_hang h join don_hang_chi_tiet ct using (don_hang_id);
```

```text
┌──────────────────┬───────────────┬───────────┐
│ phi_ship_bao_cao │ phi_ship_that │ phong_pct │
├──────────────────┼───────────────┼───────────┤
│           710000 │        400000 │      77.5 │
└──────────────────┴───────────────┴───────────┘
```

But `sum(so_luong*don_gia)` in that same statement is still **exactly** 10,215,000.

> **One right column, one wrong, in the same table.** The reviewer sees revenue matching
> and trusts the whole table.

**What to do:** which order is multiplied the most? (hint: `DH003` has 3 lines). The fix is
proportional allocation — see [header/line and allocating facts](../skills/allocated-facts.md)
and [the case study on shipping fees 133% inflated](../case-studies/phi-ship-phong-133-phan-tram.md).

| Your result |
|---|
| |

## Exercise 3 — Joining two facts directly: inflating and losing at once

```sql
select count(*) dong_sau_join, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang_chi_tiet ct join tra_hang t using (don_hang_id);
```

```text
┌───────────────┬────────────────────┬────────────────┐
│ dong_sau_join │ doanh_thu_sau_join │ doanh_thu_that │
├───────────────┼────────────────────┼────────────────┤
│             9 │            6750000 │       10215000 │
└───────────────┴────────────────────┴────────────────┘
```

The number 6,750,000 is **not the revenue of anything at all**:

- `DH003` was returned **twice** → its lines are double-counted
- 7 orders have **no** return line → they vanish from the result

Two errors in opposite directions, so the total both inflates and falls short, and nobody can guess which way.

The right way — aggregate each side separately **to the same level**, then combine:

```sql
with ban as (select don_hang_id, sum(so_luong*don_gia) dt from don_hang_chi_tiet group by 1),
     tra as (select don_hang_id, sum(gia_tri_tra) tra from tra_hang group by 1)
select coalesce(sum(ban.dt),0) doanh_thu, coalesce(sum(tra.tra),0) gia_tri_tra
from ban full join tra using (don_hang_id);
```

```text
┌───────────┬─────────────┐
│ doanh_thu │ gia_tri_tra │
├───────────┼─────────────┤
│  10215000 │     1500000 │
└───────────┴─────────────┘
```

Matching the source. This is **multipass SQL** — see
[conformed dimensions](../skills/conformed-dimension.md#this-technique-has-a-name-multipass-sql)
and [the case study on joining two facts](../case-studies/join-hai-fact-lam-phong-tong.md).

**What to do:** change `FULL JOIN` to `INNER JOIN` and run it again. How many orders are lost? Why is
`FULL` the right one?

| Your result |
|---|
| |

## Exercise 4 — Building a dimension for the order number: 44.1% inflated

The reflex "every key in a fact must point at a dimension" leads to `dim_don_hang`. Measure first:

```sql
select (select count(*) from don_hang) dong_dim,
       (select count(*) from don_hang_chi_tiet) dong_fact;
```

```text
┌──────────┬───────────┬────────┐
│ dong_dim │ dong_fact │ ty_le  │
├──────────┼───────────┼────────┤
│       10 │        15 │   0.67 │
└──────────┴───────────┴────────┘
```

A ratio of **0.67** — a genuine dimension should be orders of magnitude smaller than the fact. Already suspicious.

Now do what everybody does next: the table looks too bare so `trang_thai` gets shoved in, and because
status changes over time, Type 2 gets turned on:

```sql
create or replace table dim_don_type2 as
select * from (values
 ('DH003','moi'),('DH003','dang_giao'),('DH003','hoan_thanh'),
 ('DH001','moi'),('DH001','hoan_thanh'),
 ('DH002','hoan_thanh'),('DH004','dang_giao'),('DH005','hoan_thanh'),
 ('DH006','moi'),('DH007','hoan_thanh'),('DH008','dang_giao'),
 ('DH009','moi'),('DH010','hoan_thanh')
) t(don_hang_id, trang_thai);
```

```text
┌──────────┬─────────────┬────────────────────┬────────────────┬───────────┐
│ dong_dim │ so_don_that │ doanh_thu_sau_join │ doanh_thu_that │ phong_pct │
├──────────┼─────────────┼────────────────────┼────────────────┼───────────┤
│       13 │          10 │           14715000 │       10215000 │      44.1 │
└──────────┴─────────────┴────────────────────┴────────────────┴───────────┘
```

**The dimension now has more rows than there are real orders** (13 vs 10) — a sign visible to the naked eye.

The fix: `don_hang_id` stays in the fact as an ordinary column
(a [degenerate dimension](../skills/degenerate-dimension.md)); the status becomes its own small
dimension; and the process history belongs to an **accumulating snapshot**, not to a
dimension. See [the case study on the order dim inflating 40%](../case-studies/dim-don-hang-lam-phong-doanh-thu.md).

| Your result |
|---|
| |

## Exercise 5 — Joining a Type 2 dimension by natural key: 26.9% inflated

You need to do [the SCD lab](scd-bang-dbt-snapshot.md) first to have `scd_khach_hang` with two
versions of `C1`.

```sql
select sum(ct.so_luong*ct.don_gia) doanh_thu, count(*) dong_sau_join
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
join scd_khach_hang d on d.khach_id = h.khach_id;   -- missing the time condition
```

```text
┌────────────────────┬────────────────┬───────────────┬───────────┐
│ doanh_thu_sau_join │ doanh_thu_that │ dong_sau_join │ dong_that │
├────────────────────┼────────────────┼───────────────┼───────────┤
│           12960000 │       10215000 │            22 │        15 │
└────────────────────┴────────────────┴───────────────┴───────────┘
```

See who the error lands on:

```text
┌──────────┬──────────────┬───────────────┐
│ khach_id │ so_phien_ban │ dong_sau_join │
├──────────┼──────────────┼───────────────┤
│ C1       │            2 │            14 │  ← 7 dong that, nhan doi
│ C2       │            1 │             4 │
│ C3       │            1 │             2 │
│ C4       │            1 │             2 │
└──────────┴──────────────┴───────────────┘
```

Only `C1` is doubled — exactly by its version count. That's why the fact must point at
**the surrogate key of the right version**, not at the natural key. See
[Surrogate keys](../reference/surrogate-key.md).

| Your result |
|---|
| |

## What all five exercises share

| Exercise | Inflation | Does anything report an error |
|---|---|---|
| 2 · mixing two grains | +77.5% (the `phi_ship` column only) | No — the other column is still right |
| 3 · joining two facts | inflating and falling short at once | No |
| 4 · a dim with the same grain as the fact | +44.1% | No |
| 5 · joining Type 2 by natural key | +26.9% | No |

**No case has a red test.** The SQL runs, the pipeline is green, the numbers are wrong. That's why the
`count(*) = count(distinct <grain key>)` check must run **before** any addition.

## Related Topics

- [Grain](../reference/grain.md) — exercises 1 and 2
- [Facts and dimensions](../reference/fact-and-dimension.md) — which column belongs to which table
- [Degenerate dimensions](../skills/degenerate-dimension.md) — exercise 4
- [Surrogate keys](../reference/surrogate-key.md) — exercise 5
- [SCD Type 2 with dbt snapshots](scd-bang-dbt-snapshot.md) — builds the `scd_khach_hang` used in exercise 5
- [A star schema in plain SQL](star-schema-duckdb.md) — rebuilding the correct model from scratch
