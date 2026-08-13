---
title: Conformed dimensions
sidebar_position: 6
description: A dimension shared between several facts with the same key and the same meaning — the precondition for adding numbers from two different business processes.
tags: [conformed-dimension, bus-matrix, dimension, data-modeling, kimball]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Conformed dimensions

> **Takeaway:** two facts are only comparable with each other when they use **the same** dimension —
> the same key **and the same definition**. Without that condition, every report combining two business
> processes is adding two different things, with no error reported.

## The goal

To answer the question: why does combining "revenue by region" and "return rate by region" produce a
meaningless number, even though both run correctly.

## The problem

Two teams build two marts:

```text
Team bán hàng:  fct_don_hang    →  dim_khach_hang_ban_hang  (khu_vuc: Bắc/Trung/Nam)
Team CSKH:      fct_tra_hang    →  dim_khach_hang_cskh      (khu_vuc: HN/HCM/Khác)
```

Each mart runs correctly. But the question *"which region has the highest return rate"* is
**unanswerable** — the two sides don't speak the same language about "region", and the customer keys
differ too.

This isn't a technical error. No SQL is wrong and no test is red. It went wrong the moment the two teams
each built their own dimension.

## The conditions for being conformed

A dimension is conformed between two facts when **all three** hold:

| Condition | Checked by |
|---|---|
| The same surrogate key | `khach_sk` in fact A and fact B pointing at the same table |
| The same attribute set with the same names | `khu_vuc` having the same value list in both |
| The same **business definition** | "region" = where it's delivered, or where they registered? It must be one |

The third condition is the hardest because it can't be checked with SQL — you have to ask people.

**A shrunken form counts too:** a dimension at a coarser grain is still conformed if its attribute
set is a **proper subset** of the full one. `dim_thang` is conformed with `dim_ngay` if
`thang`, `quy`, `nam` are defined identically.

## The bus matrix — the tool for seeing what's missing

Draw the fact × dimension matrix. An empty cell is a place not yet conformed:

| | dim_khach_hang | dim_hang_hoa | dim_thoi_gian | dim_kho |
|---|---|---|---|---|
| `fct_don_hang` | ✅ | ✅ | ✅ | — |
| `fct_tra_hang` | ✅ | ✅ | ✅ | ✅ |
| `fct_ton_kho` | — | ✅ | ✅ | ✅ |

Read it by **column**: `dim_hang_hoa` covers all three facts → you can compare revenue, returns and
inventory for the same product. `dim_khach_hang` doesn't cover `fct_ton_kho` — and rightly so, inventory
has no customer at all.

Draw this table **before** building the second mart. Drawing it afterwards means you're already fixing things.

## The worked example

### Step 1 — detecting that it isn't conformed

```sql
-- hai dimension co cung tap gia tri khong?
SELECT 'ban_hang' AS nguon, khu_vuc, count(*) FROM dim_khach_hang_ban_hang GROUP BY khu_vuc
UNION ALL
SELECT 'cskh', khu_vuc, count(*) FROM dim_khach_hang_cskh GROUP BY khu_vuc
ORDER BY khu_vuc;
```

```text
┌──────────┬──────────┬───────┐
│  nguon   │ khu_vuc  │   n   │
├──────────┼──────────┼───────┤
│ ban_hang │ Miền Bắc │     1 │
│ ban_hang │ Miền Nam │     2 │
│ cskh     │ HCM      │     1 │
│ cskh     │ HN       │     1 │
│ cskh     │ Khác     │     1 │
└──────────┴──────────┴───────┘
```

The two value sets **share not a single element**. Hard evidence: not conformed.

Differing value sets are hard evidence of non-conformance. Identical value sets are **not enough** —
you still have to ask about the definition.

### Step 2 — one shared dimension

```sql
CREATE TABLE dim_khach_hang AS
SELECT
  row_number() OVER (ORDER BY ma_khach) AS khach_sk,
  ma_khach,
  ho_ten,
  khu_vuc            -- MỘT định nghĩa duy nhất, thống nhất giữa hai team
FROM khach_hang_raw;
```

Both facts point at this table. A team needing its own attribute **adds a column**, rather than building
a second table.

### Step 3 — drilling across, what a conformed dimension unlocks

Combining two facts of different grain: aggregate each side to **the same level** separately, and only then combine.

```sql
WITH ban AS (
  SELECT k.khu_vuc, sum(f.thanh_tien) AS doanh_thu
  FROM fct_don_hang f JOIN dim_khach_hang k USING (khach_sk)
  GROUP BY k.khu_vuc
),
tra AS (
  SELECT k.khu_vuc, sum(t.gia_tri_tra) AS gia_tri_tra
  FROM fct_tra_hang t JOIN dim_khach_hang k USING (khach_sk)
  GROUP BY k.khu_vuc
)
SELECT b.khu_vuc, b.doanh_thu, COALESCE(t.gia_tri_tra, 0) AS gia_tri_tra,
       ROUND(100.0 * COALESCE(t.gia_tri_tra, 0) / b.doanh_thu, 2) AS ty_le_tra_pct
FROM ban b LEFT JOIN tra t USING (khu_vuc)
ORDER BY ty_le_tra_pct DESC;
```

```text
┌──────────┬───────────┬─────────────┬───────────────┐
│ khu_vuc  │ doanh_thu │ gia_tri_tra │ ty_le_tra_pct │
├──────────┼───────────┼─────────────┼───────────────┤
│ Miền Bắc │   5000000 │      500000 │          10.0 │
│ Miền Nam │   5000000 │      400000 │           8.0 │
└──────────┴───────────┴─────────────┴───────────────┘
```

This is exactly the question *"which region has the highest return rate"* from the top of the page — **unanswerable**
when the two marts use two separate dimensions.

Do **not** join `fct_don_hang` directly to `fct_tra_hang`. Joining two facts of different grain
directly duplicates rows — see [Facts and dimensions](../reference/fact-and-dimension.md).

### This technique has a name: multipass SQL

Kimball calls the pattern above **multipass SQL to avoid fact-to-fact table joins**, and makes it
a technique in its own right because it's a **hard rule**, not an optimisation tip:

> **Never join two fact tables directly.** Aggregate each fact separately to the same
> level, and only then combine the results.

Three passes, in exactly this order:

| Pass | What it does | Why they can't be combined |
|---|---|---|
| 1 | Aggregate fact A by the shared dimensions | A's grain is *one order line* |
| 2 | Aggregate fact B by **exactly** those dimensions | B's grain is *one return* |
| 3 | `FULL JOIN` the two results on the shared keys | Only here are both sides at the same grain |

Three easy mistakes in pass 3:

- **Use `FULL JOIN`, not `INNER`.** A region with sales but no returns yet gets thrown away by an
  `INNER JOIN` — the report loses a group and nobody knows.
- **`coalesce(...,0)` for the missing side.** No return rows means 0, not `NULL`
  — see [NULLs in facts and dimensions](null-handling.md).
- **`nullif` in the denominator.** Dividing by 0 when a region has returns but no revenue yet.

The first two passes **must aggregate by the same column set**. Aggregating pass 1 by `khu_vuc` and pass 2
by `khu_vuc, thang` combines into a meaningless number — and the SQL still runs.

The fan-out that happens when this rule is ignored has concrete numbers in
[the case study of joining two facts inflating the total](../case-studies/join-hai-fact-lam-phong-tong.md),
and a runnable example in [the lab, step 6](../tutorials/star-schema-duckdb.md).

### Before and after

| | Two separate dimensions | Conformed |
|---|---|---|
| Each mart runs correctly | yes | yes |
| Combining the two marts | **impossible** | drill across |
| Changing the region definition | two places, easily diverging | one place |
| Detecting divergence | nothing reports it | a `relationships` test catches it |

## Trade-offs

| You get | You lose |
|---|---|
| Numbers combinable across business processes | You must agree the definitions **first** — a human job, not SQL's |
| One place to fix | One team changing it affects another |
| The bus matrix shows the gaps | A shared table easily becomes the place everybody adds columns |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| The same column name with a different definition | The most dangerous — the numbers add up but **mean the wrong thing**, with nothing reported |
| Each mart building its own dimension "to be quick" | The largest technical debt in a data warehouse; the longer you leave it, the more expensive |
| Joining two facts directly because there's a shared dimension | Rows duplicate — you must aggregate to the same level first |
| Treating "conformed" as "the same table name" | The same name with different values is still not conformed |

## Related Topics

- [Facts and dimensions](../reference/fact-and-dimension.md) — why you don't join a fact directly to a fact
- [The 4-step design process](../reference/design-process.md) — the bus matrix sits at the choose-the-business-process step
- [Surrogate keys](../reference/surrogate-key.md) — a shared key is the first condition
- [Role-playing dimensions](role-playing-dimension.md) — several **roles** in one fact, distinct from several **facts** sharing one
- [The six quality dimensions](../../data-quality/six-dimensions.md) — the *consistency* dimension is precisely this
