---
title: Centipede fact tables and dimension-to-dimension joins
sidebar_position: 18
description: "A fact with twenty foreign keys because each level of one hierarchy was split into its own dimension — the classic sign of normalising in the wrong place."
tags: [centipede, dimension, snowflake, outrigger, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Centipede fact tables and dimension-to-dimension joins

> **Takeaway:** a fact with 20–30 foreign keys is almost always **one hierarchy split into
> several dimensions**. Day, week, month, quarter and year aren't five dimensions — they're five
> **columns of one** dimension.

## Recognising a centipede

Kimball calls it a *centipede* because the diagram has dozens of legs radiating from the fact.

```sql
CREATE TABLE fct_centipede AS
SELECT 20260110 AS ngay_key, 202602 AS tuan_key, 202601 AS thang_key,
       20261 AS quy_key, 2026 AS nam_key,
       1 AS sp_key, 1 AS nhom_key, 1 AS nganh_key,
       1000 AS doanh_thu;
```

```text
┌───────────────┐
│ so_khoa_ngoai │
├───────────────┤
│             8 │
└───────────────┘
```

Eight foreign keys for a simple sales fact. When in reality there are only **two dimensions**: time
and product.

Even the simplest report has to join three tables:

```sql
SELECT t.thang_ten, n.nganh_ten, sum(f.doanh_thu) AS doanh_thu
FROM fct_centipede f
JOIN dim_thang t ON t.thang_key = f.thang_key
JOIN dim_nganh n ON n.nganh_key = f.nganh_key
GROUP BY 1,2;
```

```text
┌──────────────┬───────────┬───────────┐
│  thang_ten   │ nganh_ten │ doanh_thu │
├──────────────┼───────────┼───────────┤
│ Thang 1/2026 │ Dien tu   │      1000 │
└──────────────┴───────────┴───────────┘
```

### The test: can this column be derived from that one?

```sql
SELECT ngay,
       strftime(ngay, '%Y-W%W')        AS tuan_suy_ra,
       strftime(ngay, '%Y%m')::INT     AS thang_suy_ra,
       year(ngay) * 10 + quarter(ngay) AS quy_suy_ra,
       year(ngay)                      AS nam_suy_ra
FROM dim_ngay;
```

```text
┌────────────┬─────────────┬──────────────┬────────────┬────────────┐
│    ngay    │ tuan_suy_ra │ thang_suy_ra │ quy_suy_ra │ nam_suy_ra │
├────────────┼─────────────┼──────────────┼────────────┼────────────┤
│ 2026-01-10 │ 2026-W01    │       202601 │      20261 │       2026 │
└────────────┴─────────────┴──────────────┴────────────┴────────────┘
```

The other four keys are **derivable from `ngay_key`**. They carry no new information — they just
widen the fact and force every query into extra joins.

> **The one-sentence test:** if key B is always determinable from key A, then B is **an attribute
> of dimension A**, not a dimension of its own.

## The fix — one dimension per genuine dimension

```sql
CREATE TABLE dim_ngay_day_du AS
SELECT 20260110 AS ngay_key, DATE '2026-01-10' AS ngay,
       'Tuan 02/2026' AS tuan_ten, 'Thang 1/2026' AS thang_ten,
       'Q1/2026' AS quy_ten, 2026 AS nam;

CREATE TABLE dim_sp_day_du AS
SELECT 1 AS sp_key, 'SP-A' AS san_pham, 'Dien thoai' AS nhom_ten, 'Dien tu' AS nganh_ten;

CREATE TABLE fct_gon AS
SELECT 20260110 AS ngay_key, 1 AS sp_key, 1000 AS doanh_thu;
```

```sql
SELECT d.thang_ten, s.nganh_ten, sum(f.doanh_thu) AS doanh_thu
FROM fct_gon f
JOIN dim_ngay_day_du d USING (ngay_key)
JOIN dim_sp_day_du   s USING (sp_key)
GROUP BY 1,2;
```

```text
┌──────────────┬───────────┬───────────┐
│  thang_ten   │ nganh_ten │ doanh_thu │
├──────────────┼───────────┼───────────┤
│ Thang 1/2026 │ Dien tu   │      1000 │
└──────────────┴───────────┴───────────┘
```

The same result, **two foreign keys instead of eight**, two joins instead of three, and a narrower fact in the
warehouse's largest table.

| | Before | After |
|---|---|---|
| Foreign keys in the fact | 8 | **2** |
| Tables for the time dimension | 5 | **1** |
| Tables for the product dimension | 3 | **1** |
| Drilling from month to day | Join another table | Add a column to the `GROUP BY` |

The last point is the biggest benefit people forget: once combined, **drilling down becomes
free** — see [designing dimension attributes](dimension-attribute-design.md).

## How many foreign keys is too many?

Kimball gives a pragmatic number: **most fact tables should have fewer than 20 foreign keys**,
and most sit in the 5–15 range. Past that, check three things in order:

1. **Is a hierarchy being split?** (day/week/month, product/group/line, district/province/region)
   → combine them. This is the cause of most cases.
2. **Is there a cluster of low-cardinality flags?** → gather them into a [junk dimension](junk-dimension.md).
3. **Are there many genuinely independent keys?** → the grain may be mixing several business
   processes into one table; split the fact.

Those three questions resolve nearly every centipede.

## Dimension-to-dimension joins

When combining, you occasionally meet a case where one dimension **points at another** rather than being flattened
all the way — Kimball calls it a *dimension-to-dimension join*, and when the pointed-at table is small it's
called an *outrigger*.

```sql
CREATE TABLE dim_khu_vuc AS
SELECT * FROM (VALUES (1,'Mien Bac','Bac'), (2,'Mien Nam','Nam')) t(kv_key, khu_vuc, mien);
CREATE TABLE dim_khach AS
SELECT * FROM (VALUES (1,'C1',1), (2,'C2',2), (3,'C3',1)) t(khach_sk, khach_id, kv_key);
```

```sql
SELECT kv.mien, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban2 f
JOIN dim_khach k USING (khach_sk)
JOIN dim_khu_vuc kv USING (kv_key)
GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌─────────┬───────────┐
│  mien   │ doanh_thu │
├─────────┼───────────┤
│ Bac     │       400 │
│ Nam     │       200 │
└─────────┴───────────┘
```

It runs correctly. But there's a **temporal** trap this structure hides:

```sql
SELECT count(*) AS so_dong_fact_bi_anh_huong
FROM fct_ban2 f JOIN dim_khach k USING (khach_sk) WHERE k.kv_key = 1;
```

```text
┌───────────────────────────┐
│ so_dong_fact_bi_anh_huong │
├───────────────────────────┤
│                         2 │
└───────────────────────────┘
```

If `dim_khu_vuc` changes the label `'Mien Bac'` to `'Khu vuc 1'`, **all the reporting history changes
with it** — even with full [SCD](scd.md) Type 2 on `dim_khach`. Type 2 only protects the columns
**inside itself**; a column in an outrigger table sits outside that protection.

This is a variant of [historical reports changing their own numbers](../case-studies/bao-cao-qua-khu-tu-doi-so.md),
and it's harder to see because the model *looks like* it did Type 2 properly.

### When to accept an outrigger, when to flatten

| Accept an outrigger | Flatten into the dimension |
|---|---|
| The pointed-at table **almost never changes** (administrative catalogues, country codes) | The attribute changes and you need as-was |
| Several dimensions share it → it becomes conformed | Only one dimension uses it |
| It has its own deep hierarchy | Only a few columns |
| Centralised updating is the goal | Historical reporting is the goal |

Kimball's default remains **flatten**. An outrigger is a justified exception, not a default
— the same argument as for [snowflake](../reference/star-snowflake-obt.md).

## Trade-offs

| You get | You lose |
|---|---|
| A narrow fact, fewer joins, faster queries | A wide dimension with repeated data |
| Drilling down becomes another `GROUP BY` column | Changing a label means changing many rows |
| A readable diagram | The "normalisation" DBAs are used to |
| An outrigger: update in one place | An outrigger: it breaks Type 2's as-was |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| One dimension per time level | A fact with 8+ foreign keys, and every query joining 3–5 tables — [case study](../case-studies/fact-hai-chuc-khoa-ngoai.md) |
| One dimension per product level | You can't drill if a join is missing |
| Putting a frequently changing column in an outrigger | Type 2 loses its effect and history changes its numbers |
| Normalising a fact the way you'd normalise OLTP | Correct database theory, the wrong analytical purpose |
| Treating a large foreign-key count as a "richly dimensioned model" | It's usually just one hierarchy chopped up |

## Related Topics

- [Star, snowflake, OBT](../reference/star-snowflake-obt.md) — an outrigger is a local snowflake
- [Junk dimensions](junk-dimension.md) — gathering low-cardinality flags to reduce the foreign-key count
- [The date dimension](../reference/date-dimension.md) — one table for every time level
- [Designing dimension attributes](dimension-attribute-design.md) — drilling down is just adding a column
- [CS: a fact with twenty foreign keys](../case-studies/fact-hai-chuc-khoa-ngoai.md)

## References

- Kimball Group — [Centipede Fact Tables / Dimension-to-Dimension Table Joins / Outrigger Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapters 3 and 6
