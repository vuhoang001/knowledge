---
title: A fact with eight foreign keys for two real dimensions
sidebar_position: 19
description: "Every time level and every product level split into its own dimension; every report has to join 3–5 tables to ask one simple question."
tags: [case-study, centipede, dimension, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# A fact with eight foreign keys for two real dimensions

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** day, week, month, quarter and year aren't five dimensions — they're five **columns of
> one** dimension. See [centipede fact tables](../skills/centipede-fact.md).

## Context

The model was designed by a DBA used to normalising OLTP. The principle applied: *"one table per
entity, no repeated data"*. Applied to a warehouse, it produces this:

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

Eight foreign keys, eight dimension tables. On normalisation grounds it's unimpeachable: not one value
is repeated.

## Symptoms

There's no numbers incident. The symptom is **friction**, accumulating gradually and attributed by nobody
to any cause:

- Even the simplest question needs a 3-table join:

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

- A BI user opens the model, sees 8 tables, and doesn't know where to start.
- Drilling from month down to day needs **another join**, not another column.
- Each analyst picks a different set of joins; two people get two results because one forgot to
  join `dim_nhom`.

What's lost is **the speed of answering a question**, something that appears on no operational dashboard.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| Queries slow for want of an index | Added indexes, slightly faster, the friction untouched |
| Users not trained | Training done, and a week later they ask how to join again |
| Needing a semantic layer to cover it up | Useful, but it only **hides** the problem |
| The warehouse needing an upgrade | It isn't a resource problem |

Where the time goes: treating this as a **tooling or people problem**. Both directions cost
money and address nothing at the root.

The redirecting question: *"are these eight keys really eight independent dimensions?"*

## The real cause

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

Four time keys **fully derivable** from `ngay_key`. The same for the three product keys:
`nhom_key` and `nganh_key` derive from `sp_key`.

Eight foreign keys represent **exactly two dimensions**: time and product.

Normalisation is right for a transactional system, where the goal is **writing fast and without
contradiction**. A warehouse optimises for **reading and understanding**, so it deliberately accepts repeated data in
dimensions. Applying one side's principle to the other is the origin of every centipede.

## Why no test catches it

| Test | The result |
|---|---|
| `relationships` for all 8 keys | ✅ all green |
| `not_null` for all 8 keys | ✅ green |
| `unique` on each dimension | ✅ green |
| Total revenue matching the source | ✅ green |
| Whether the number of foreign keys is reasonable | ❌ — **not a kind of data test** |

Every number is correct. This isn't a data bug but a **structural** one, and its consequences are measured
in person-hours, not in numbers in a table.

What catches it is a **design review**, or one simple lint rule: *"a fact with more than 20
foreign keys must be justified"*.

## The fix

Collapse to one dimension per real dimension:

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

The same result.

| | Before | After |
|---|---|---|
| Foreign keys in the fact | 8 | **2** |
| Tables for the time dimension | 5 | 1 |
| Tables for the product dimension | 3 | 1 |
| Drilling month → day | Another join | Another `GROUP BY` column |
| Possible ways to join wrongly | Many | Practically none |

The last row is the real benefit: with only two tables left to join, **there's nowhere left to join wrongly**.

## How to spot it early

1. Count each fact's foreign keys — over 20 needs justifying:

```sql
SELECT table_name, count(*) AS so_cot_key
FROM information_schema.columns
WHERE column_name LIKE '%_key' OR column_name LIKE '%_sk'
GROUP BY 1 ORDER BY 2 DESC;
```

2. Look for dimensions where **one's key derives from another's**. Having `dim_thang` and
   `dim_ngay` at the same time is a certain sign.

3. Ask a BI user to write the simplest query — count the tables they have to join.

4. On the diagram, count the "legs" radiating from the fact. Over 20 legs is a centipede.

## Related Topics

- [Centipede fact tables](../skills/centipede-fact.md) — the technique skipped here
- [The date dimension](../reference/date-dimension.md) — one table for every time level
- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — why dimensions should be flat
- [Junk dimensions](../skills/junk-dimension.md) — another way to cut the foreign-key count
