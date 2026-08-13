---
title: SCD — Cheatsheet
sidebar_position: 1
description: A quick lookup table for Slowly Changing Dimensions while you work.
tags: [scd, cheatsheet, data-modeling]
domain: data-engineering
category: concept
doc_type: cheatsheet
status: stable
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# SCD — Cheatsheet

The full document: [docs/data-modeling/dimension-techniques/scd.md](../skills/scd.md)

## Which Type to choose

| Situation | Type |
|---|---|
| A change means corrupt data (the account-opening date) | **0** |
| Fixing a typo, normalising capitalisation | **1** |
| Nobody `GROUP BY`s this column | **1** |
| Historical reports use the value **now** (as-is) | **1** |
| Historical reports use the value **then** (as-was) | **2** |
| Changes monthly + a large dimension | **4** |
| You need both as-was and as-is in one query | **6** |
| Two parallel classifications after a reorganisation | **3** |
| **Unsure, and nobody to ask** | **2** |

## The Type 2 column set

```text
khach_sk        BIGINT      PK — mỗi phiên bản một giá trị
khach_hang_id   VARCHAR     natural key — LẶP LẠI qua các phiên bản
...thuộc tính...
valid_from      DATE
valid_to        DATE        '9999-12-31' cho dòng hiện tại — KHÔNG dùng NULL
is_current      BOOLEAN
is_deleted      BOOLEAN     nguồn xoá cứng thì đánh dấu, đừng xoá dòng
```

## Dimension lookup — assigning the SK when loading the fact

```sql
join dim_khach_hang d
  on  f.khach_hang_id = d.khach_hang_id
  and f.ngay >= d.valid_from
  and f.ngay <  d.valid_to
```

With a dbt snapshot (where `dbt_valid_to` is `NULL`):

```sql
  and f.ngay < coalesce(d.dbt_valid_to, '9999-12-31')
```

## The mandatory tests

```yaml
tests:
  - unique: {column_name: khach_sk}
  - dbt_utils.unique_combination_of_columns:
      combination_of_columns: [khach_hang_id, valid_from]
  - dbt_utils.expression_is_true:
      expression: "valid_from < valid_to"
```

Plus **a singular test reconciling the total against the source** — that's the only test that catches
duplication caused by a wrong join.

## dbt snapshot

```sql
{% snapshot dim_khach_hang %}
{{ config(
    target_schema='snapshots',
    unique_key='khach_hang_id',
    strategy='timestamp',
    updated_at='updated_at'
) }}
select * from {{ source('crm', 'khach_hang') }}
{% endsnapshot %}
```

```bash
dbt snapshot                 # KHÔNG build lại được — chạy sai là lịch sử sai vĩnh viễn
```

| Strategy | Use when |
|---|---|
| `timestamp` | The source has a trustworthy `updated_at` column |
| `check` | No time column — compare each column in `check_cols` |

## The four deadly mistakes

| Mistake | The sign |
|---|---|
| The fact joins on the natural key | Revenue **doubles**, and every test stays green |
| `where is_current = true` when you need as-was | Historical numbers change with the present |
| `valid_to` = `NULL` | The **newest** data vanishes from reports |
| Type 2 for a column that changes daily | The dimension bloats a hundredfold |

## The question to ask the business

> "A customer moves from the North to the South. Which region does their January revenue sit in now?"

Don't ask "which SCD Type do you want".
