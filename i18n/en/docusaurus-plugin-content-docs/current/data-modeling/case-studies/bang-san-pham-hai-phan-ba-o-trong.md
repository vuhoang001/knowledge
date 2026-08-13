---
title: dim_san_pham 67% empty cells — and no column can be made NOT NULL
sidebar_position: 22
description: "Savings accounts, insurance policies and mobile phones crammed into one dimension; each new product line adds a clutch of columns 90% of the existing rows don't use."
tags: [case-study, supertype, subtype, null-handling, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# `dim_san_pham` 67% empty cells — and no column can be made `NOT NULL`

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** when the "products" in one dimension share no attributes, cramming them into one
> table picks the worst of the bad options — see
> [heterogeneous entities](../skills/heterogeneous-schema.md).

## Context

A financial group sells savings accounts, life insurance and mobile phones on instalments. Kimball's rule
is applied to the letter: *"one conformed `dim_san_pham` for the whole enterprise"*.

```sql
CREATE TABLE dim_sp_gop AS
SELECT * FROM (VALUES
  (1,'TK-001','Tiet kiem', 'Tai chinh', 0.055, 12,   NULL, NULL,  NULL,  NULL),
  (2,'TK-002','Tiet kiem', 'Tai chinh', 0.062, 24,   NULL, NULL,  NULL,  NULL),
  (3,'BH-001','Bao hiem',  'Tai chinh', NULL,  NULL, 500000000, 65, NULL, NULL),
  (4,'DT-001','Dien thoai','Hang hoa',  NULL,  NULL, NULL, NULL, 0.35, 'Den')
) t(sp_sk, ma_sp, loai_sp, nhom_lon,
    lai_suat, ky_han_thang, so_tien_bao_hiem, tuoi_toi_da, trong_luong_kg, mau_sac);
```

The intent is right: every fact points at one dimension, so drill-across works between all the processes.

## Symptoms

No number is wrong. The symptom is that the table is **unusable**, and it gets worse over time.

```sql
SELECT count(*) AS so_dong,
       count(lai_suat)         AS lai_suat,
       count(so_tien_bao_hiem) AS so_tien_bao_hiem,
       count(trong_luong_kg)   AS trong_luong,
       round(100.0 * (count(*)*6 - count(lai_suat) - count(ky_han_thang)
                    - count(so_tien_bao_hiem) - count(tuoi_toi_da)
                    - count(trong_luong_kg) - count(mau_sac))
             / (count(*)*6), 1) AS pct_o_trong
FROM dim_sp_gop;
```

```text
┌─────────┬──────────┬──────────────────┬─────────────┬─────────────┐
│ so_dong │ lai_suat │ so_tien_bao_hiem │ trong_luong │ pct_o_trong │
├─────────┼──────────┼──────────────────┼─────────────┼─────────────┤
│       4 │        2 │                1 │           1 │        66.7 │
└─────────┴──────────┴──────────────────┴─────────────┴─────────────┘
```

**66.7% of cells empty**, and after three years with 40 columns that number is above 90%.

The consequences, in the order they appear:

1. A user opens the table, sees 40 columns, and doesn't know which column applies to which product.
2. **No type-specific column can be made `NOT NULL`** — losing the cheapest layer of checking in the warehouse.
3. `NULL` here means *"not applicable"* but looks exactly like *"missing data"* — you can't
   distinguish a load bug from a design bug.
4. Every new product line means an `ALTER TABLE` on the table every report is using.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| The ETL failed to load an attribute | Checked the source: the insurance system **has no** notion of an interest rate |
| Needing to supplement the data from another source system | No system has it — that attribute doesn't exist for that type |
| A missing master-data management process | Useful, but it doesn't address the empty cells |
| Adding a default value in place of NULL | **Worse** — an interest rate of 0 for insurance is a wrong number, not a blank one |

Where the time goes: treating the empty cells as a **data quality problem**. They aren't. No
data is missing — the attribute **doesn't exist** for that product type.

The redirecting question: *"what's the interest rate of a mobile phone?"* A meaningless question, and
that's exactly the answer.

## The real cause

One dimension is trying to describe **several entity types with disjoint attribute sets**.

Kimball has a name for this situation — *heterogeneous products* — and the treatment isn't
choosing one of the two extremes (one merged table / one independent table per type), but
**both at once**: a supertype for the common part, subtypes for the specific parts.

The "one conformed dimension" rule still holds — it just applies to **the common attributes**.

## Why no test catches it

| Test | The result |
|---|---|
| `unique` on `sp_sk` | ✅ green |
| `not_null` on `ma_sp`, `loai_sp` | ✅ green |
| `not_null` on `lai_suat` | ❌ — **nobody can declare it**, because `NULL` is legitimate |
| `relationships` fact → dim | ✅ green |
| Total revenue matching the source | ✅ green |

The third row is the whole problem: because `NULL` is legitimate in most columns, **no meaningful
constraint can be declared**. The table passes every test, and no test can state what
people actually want: *"a savings product must have an interest rate"*.

After splitting out the subtypes, that sentence **can be declared**, and that's the biggest benefit of
splitting.

## The fix

### Supertype — only the attributes every type has

```sql
CREATE TABLE dim_sp AS
SELECT sp_sk, ma_sp, loai_sp, nhom_lon FROM dim_sp_gop;
```

The fact points at this table. Cross-cutting questions run here, with every type present:

```text
┌───────────┬────────────┬───────────┐
│ nhom_lon  │  loai_sp   │ doanh_thu │
├───────────┼────────────┼───────────┤
│ Tai chinh │ Bao hiem   │      5000 │
│ Tai chinh │ Tiet kiem  │      3000 │
│ Hang hoa  │ Dien thoai │       800 │
└───────────┴────────────┴───────────┘
```

### Subtypes — one table per type, sharing the key

```sql
CREATE TABLE dim_sp_tiet_kiem AS
SELECT sp_sk, ma_sp, lai_suat, ky_han_thang FROM dim_sp_gop WHERE loai_sp = 'Tiet kiem';

CREATE TABLE dim_sp_bao_hiem AS
SELECT sp_sk, ma_sp, so_tien_bao_hiem, tuoi_toi_da FROM dim_sp_gop WHERE loai_sp = 'Bao hiem';
```

```text
┌─────────┬──────────────┬──────────────┬───────────┐
│  ma_sp  │   lai_suat   │ ky_han_thang │ doanh_thu │
├─────────┼──────────────┼──────────────┼───────────┤
│ TK-001  │        0.055 │           12 │      1000 │
│ TK-002  │        0.062 │           24 │      2000 │
└─────────┴──────────────┴──────────────┴───────────┘
```

**No empty cells left**, and `NOT NULL` can be declared for both `lai_suat` and `ky_han_thang`.

### The mandatory invariant

```text
┌───────────────┬───────────┐
│ qua_supertype │ tong_fact │
├───────────────┼───────────┤
│          8800 │      8800 │
└───────────────┴───────────┘
```

The supertype must cover **100%** of the products. A missing type is a type that vanishes from every
cross-cutting report.

| | Before | After |
|---|---|---|
| Empty-cell ratio | 66.7% (and rising) | 0% in each table |
| `NOT NULL` declarable | On no type-specific column | On every column in a subtype |
| Adding a new product line | `ALTER TABLE` on the shared table | Add one subtype table |
| Cross-cutting questions | Possible | Possible (via the supertype) |
| Deep-dive questions | Possible, but full of `NULL` | Possible, on a clean table |

## How to spot it early

1. **Measure the dimension's empty-cell ratio** — run it periodically, set a warning threshold:

```sql
SELECT count(*) AS so_dong,
       count(lai_suat) AS co_lai_suat,
       round(100.0 * (count(*) - count(lai_suat)) / count(*), 1) AS pct_trong
FROM dim_sp_gop;
```

Any column over 50% empty is a candidate for a subtype split.

2. The dimension has a `loai_*` column where **another cluster of columns only holds values when `loai_*`
   equals a particular value** — that's precisely the definition of a subtype.

3. Count the columns that can be made `NOT NULL`. Very few = the table is describing several entity types.

4. Every new product release requires an `ALTER TABLE` on the shared dimension table.

## Related Topics

- [Heterogeneous entities](../skills/heterogeneous-schema.md) — the technique skipped here
- [NULLs in facts and dimensions](../skills/null-handling.md) — "not applicable" differs from "missing data"
- [Conformed dimensions](../skills/conformed-dimension.md) — the supertype is the part that must conform
- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — a subtype is a deliberate snowflake
