---
title: Heterogeneous entities — supertype, subtype and measure type
sidebar_position: 21
description: "An insurance product and a phone share no attributes; forcing them into one table leaves 67% of the cells empty. A supertype for cross-cutting questions, subtypes for specific ones."
tags: [supertype, subtype, measure-type, abstract-dimension, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Heterogeneous entities — supertype, subtype and measure type

> **Takeaway:** when the "products" in one dimension **share no attributes**, every
> option is bad in some way. Kimball picks the least bad: **one shared table holding only
> the shared attributes** for cross-cutting questions, plus **one table per kind** for
> specialised questions.

## The problem

A financial group sells savings accounts, life insurance and phones on instalment.
Force them all into one `dim_san_pham`:

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

```text
┌─────────┬──────────┬──────────────────┬─────────────┬─────────────┐
│ so_dong │ lai_suat │ so_tien_bao_hiem │ trong_luong │ pct_o_trong │
├─────────┼──────────┼──────────────────┼─────────────┼─────────────┤
│       4 │        2 │                1 │           1 │        66.7 │
└─────────┴──────────┴──────────────────┴─────────────┴─────────────┘
```

**66.7% of the cells are empty.** And that ratio only rises: each new product line adds 5–10
columns that 90% of the existing rows don't use.

The consequences aren't only wasted space:

- A user opens the table, sees 40 columns, and can't tell which column applies to which product.
- `NOT NULL` can't be set on any column — you lose the cheapest checking layer of all.
- Each new product kind means an `ALTER TABLE` on the table every report already uses.
- `NULL` here means *"not applicable"* but looks identical to *"data missing"* — see
  [NULLs in facts and dimensions](null-handling.md).

## The approach — supertype + subtype

**The supertype**: only the attributes **every kind has**. The fact points at this table.

```sql
CREATE TABLE dim_sp AS
SELECT sp_sk, ma_sp, loai_sp, nhom_lon FROM dim_sp_gop;
```

**The subtypes**: one table per kind, holding only that kind's own attributes, with **the same key** as the
supertype.

```sql
CREATE TABLE dim_sp_tiet_kiem AS
SELECT sp_sk, ma_sp, lai_suat, ky_han_thang FROM dim_sp_gop WHERE loai_sp = 'Tiet kiem';

CREATE TABLE dim_sp_bao_hiem AS
SELECT sp_sk, ma_sp, so_tien_bao_hiem, tuoi_toi_da FROM dim_sp_gop WHERE loai_sp = 'Bao hiem';
```

The cross-cutting question — use the supertype, and every kind is present:

```sql
SELECT s.nhom_lon, s.loai_sp, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_sp s USING (sp_sk)
GROUP BY 1,2 ORDER BY 3 DESC;
```

```text
┌───────────┬────────────┬───────────┐
│ nhom_lon  │  loai_sp   │ doanh_thu │
├───────────┼────────────┼───────────┤
│ Tai chinh │ Bao hiem   │      5000 │
│ Tai chinh │ Tiet kiem  │      3000 │
│ Hang hoa  │ Dien thoai │       800 │
└───────────┴────────────┴───────────┘
```

A kind-specific question — use the subtype, with **no `NULL` column left**:

```sql
SELECT t.ma_sp, t.lai_suat, t.ky_han_thang, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_sp_tiet_kiem t USING (sp_sk)
GROUP BY 1,2,3 ORDER BY 1;
```

```text
┌─────────┬──────────────┬──────────────┬───────────┐
│  ma_sp  │   lai_suat   │ ky_han_thang │ doanh_thu │
├─────────┼──────────────┼──────────────┼───────────┤
│ TK-001  │        0.055 │           12 │      1000 │
│ TK-002  │        0.062 │           24 │      2000 │
└─────────┴──────────────┴──────────────┴───────────┘
```

The mandatory invariant: **the total through the supertype must equal the fact's total** — the supertype must cover 100%
of the products, missing no kind.

```text
┌───────────────┬───────────┐
│ qua_supertype │ tong_fact │
├───────────────┼───────────┤
│          8800 │      8800 │
└───────────────┴───────────┘
```

### Three rules when using supertype/subtype

1. **The fact always points at the supertype**, never at a subtype. Pointing at subtypes means
   needing N facts for N product kinds.
2. **Subtypes share the surrogate key** with the supertype. Don't generate their own keys.
3. **Never `UNION` the subtypes back together and analyse that** — that's returning to the merged table
   full of `NULL`s. For cross-cutting analysis, use the supertype.

## Measure type dimensions

The same problem on the fact side: each product has a different set of **measures** (effective interest rate,
quantity, return rate…). Instead of 50 columns of which each row uses 3, move to a **long-form
fact** — one row per measure type:

```sql
CREATE TABLE dim_loai_so_do AS
SELECT * FROM (VALUES
  (1, 'Doanh thu',      'VND', true),
  (2, 'So luong',       'cai', true),
  (3, 'Ty le tra hang', '%',   false)
) t(so_do_sk, ten_so_do, don_vi, cong_duoc);
```

The `cong_duoc` column is the most important part, because without it:

```sql
SELECT round(sum(gia_tri), 1) AS "sum_tat_ca_vo_nghia", count(*) AS so_dong FROM fct_dai;
```

```text
┌─────────────────────┬─────────┐
│ sum_tat_ca_vo_nghia │ so_dong │
├─────────────────────┼─────────┤
│              3033.0 │       6 │
└─────────────────────┴─────────┘
```

**3,033** = money + a count of items + a percentage. The same class of bug as
[summing several currencies](multi-currency-uom.md), but easier to fall into because a long-form fact
**invites** you to `SUM` the whole column.

With `cong_duoc` you can filter before summing:

```sql
SELECT l.ten_so_do, l.don_vi, l.cong_duoc,
       CASE WHEN l.cong_duoc THEN round(sum(f.gia_tri),1) END AS tong,
       CASE WHEN NOT l.cong_duoc THEN round(avg(f.gia_tri),1) END AS trung_binh
FROM fct_dai f JOIN dim_loai_so_do l USING (so_do_sk)
GROUP BY 1,2,3 ORDER BY 1;
```

```text
┌────────────────┬─────────┬───────────┬───────────────┬────────────┐
│   ten_so_do    │ don_vi  │ cong_duoc │     tong      │ trung_binh │
├────────────────┼─────────┼───────────┼───────────────┼────────────┤
│ Doanh thu      │ VND     │ true      │        3000.0 │       NULL │
│ So luong       │ cai     │ true      │          13.0 │       NULL │
│ Ty le tra hang │ %       │ false     │          NULL │       10.0 │
└────────────────┴─────────┴───────────┴───────────────┴────────────┘
```

### Long or wide?

| | Long-form fact (measure type) | Wide-form fact (a column per measure) |
|---|---|---|
| Adding a measure type | Add rows, no DDL change | `ALTER TABLE` |
| Data types | One `DOUBLE` column for everything — control lost | The right type per column |
| Accidental `SUM` | **Very easy** | Hard — the column name says what it is |
| Row count | N× | 1 |
| Reading it by eye | Hard | Easy |

```text
┌──────────┬──────────────┬──────────────┬────────────────┐
│ san_pham │  doanh_thu   │   so_luong   │ ty_le_tra_hang │
├──────────┼──────────────┼──────────────┼────────────────┤
│ SP-A     │       1000.0 │          5.0 │           12.5 │
│ SP-B     │       2000.0 │          8.0 │            7.5 │
└──────────┴──────────────┴──────────────┴────────────────┘
```

**The default should be wide.** Only move to long-form when the measure set is genuinely sparse and frequently
changing — e.g. IoT sensor data or medical test results, where each entity has only
a handful of hundreds of possible metrics.

## Abstract generic dimensions and hot swappable — two techniques to weigh carefully

Kimball lists two further variants that are rarely the right choice in practice:

**An abstract generic dimension** — a "universal" dimension like `dim_thuc_the(loai, ma,
ten)` for customers, suppliers and employees alike. You get: one table. You lose: every question has to
filter `WHERE loai = ...`, no constraints can be set, and users can't read it. Only use it
when the entity kinds **genuinely** substitute for one another in the same role.

**A hot swappable dimension** — several versions of the same dimension, with each user group
attached to one version (e.g. each brokerage viewing the same securities catalogue under its own
classification). You get: each side has its own view. You lose: **it's no longer conformed**, and the two sides'
numbers aren't comparable — directly destroying what
[conformed dimensions](conformed-dimension.md) exist to protect.

Before choosing either, check whether supertype/subtype solves it. It usually does.

## Trade-offs

| You get | You lose |
|---|---|
| A supertype: cross-cutting questions run on a tidy table | One extra join when you need a specific attribute |
| Subtypes: `NOT NULL` can be set, and the table is readable | More tables to maintain |
| A new product kind = a new subtype table | The new table must be wired into the load process |
| Measure type: adding a measure changes no DDL | Very easy to `SUM` wrongly; data types lost |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| One merged table for every product kind | 67% empty cells and no constraints possible — [case study](../case-studies/bang-san-pham-hai-phan-ba-o-trong.md) |
| The fact pointing at a subtype | You need N facts for N kinds |
| `UNION`ing the subtypes for cross-cutting analysis | Back to a merged table full of `NULL`s |
| A long-form fact with no `cong_duoc` column | `SUM` mixes money, counts and percentages |
| Using an abstract generic dimension for convenience | Nobody can read it and nothing can be constrained |
| Hot swappable while still wanting to compare numbers between sides | Conformance lost, numbers not comparable |

## Related Topics

- [NULLs in facts and dimensions](null-handling.md) — "not applicable" differs from "data missing"
- [Multiple currencies and units of measure](multi-currency-uom.md) — the same mixed-unit summing bug
- [Conformed dimensions](conformed-dimension.md) — what hot swappable trades away
- [Star, snowflake, OBT](../reference/star-snowflake-obt.md) — a subtype is a deliberate snowflake
- [CS: the product table two-thirds empty](../case-studies/bang-san-pham-hai-phan-ba-o-trong.md)

## References

- Kimball Group — [Supertype and Subtype Schemas · Measure Type Dimensions · Abstract Generic Dimensions · Hot Swappable Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapters 10 and 14
