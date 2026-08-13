---
title: Sources, seeds and snapshots
sidebar_position: 4
description: Three ways to bring data dbt didn't compute into the DAG — and why a snapshot can't be rebuilt.
tags: [dbt, source, seed, snapshot, scd, freshness]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Sources, seeds, snapshots — where data comes in from when it isn't a model

> **Takeaway:** three ways to bring data *dbt didn't compute* into the DAG. Confuse them and
> dbt thinks it owns somebody else's table.

| | Points at / creates | Who creates the table | Use when |
|---|---|---|---|
| `source()` | an existing table | somebody else (Spark, Flink, an ingest job) | the input to the whole DAG |
| `seed` | a CSV in the repo → a table | dbt | a hand-maintained lookup table, small, rarely changing |
| `snapshot` | an SCD2 history table | dbt | a slowly changing dimension where you need to know "what the value was back then" |


## Three things, three completely different roles

| | `source()` | `seed` | `snapshot` |
|---|---|---|---|
| The data comes from | another system writing it | a CSV file in the repo | a dbt model/source it reads |
| Does dbt create the table | **no** | yes | yes |
| Run with | — (a reference only) | `dbt seed` | `dbt snapshot` |
| Reproducible | — | ✅ | ❌ **never** |

That last row is the most important thing on this page.

## `source()` — a table dbt does NOT own

```yaml
# models/staging/src.yml
version: 2
sources:
  - name: he_nguon
    schema: main
    tables:
      - name: raw_don_hang
        loaded_at_field: nap_luc
        freshness:
          warn_after: {count: 12, period: hour}
          error_after: {count: 24, period: hour}
```

Used in a model: `from {{ source('he_nguon', 'raw_don_hang') }}`.

**Why not `ref()`:** `ref()` says *"dbt created this table"*. A table written by Spark/Flink/an
ingest job isn't owned by dbt — declaring it as a `ref()` makes dbt think it's responsible, and you also lose
`dbt source freshness`.

### `dbt source freshness` — the most commonly forgotten thing

The source was last loaded on 25/07, run on 31/07:

```text
1 of 1 START freshness of he_nguon.raw_don_hang ......................... [RUN]
1 of 1 ERROR STALE freshness of he_nguon.raw_don_hang ................... [ERROR STALE in 0.01s]
[ERROR]: in source raw_don_hang (models/staging/src.yml)
```

**Why a missing freshness check means the source can die while every test stays green:** tests check *the data
that's there*. If the source stopped loading yesterday, yesterday's data is still valid — `not_null` green,
`unique` green, `relationships` green. Only **freshness** asks *"is this data stale"*.

This is the **timeliness** dimension from the [six quality dimensions](../../../data-quality/six-dimensions.md),
and the only dimension no other test touches.

## `seed` — small CSVs, not a data-loading route

```bash
dbt seed
```

Reads the CSVs in `seeds/` into tables. **An important limit:** seeds go into git, so they only suit
**small, rarely changing** files — hand-maintained lookup tables, code lists, country mappings.

Don't use seeds to load real data. A few thousand rows bloats the repo, produces meaningless diffs, and
`dbt seed` takes minutes because it `INSERT`s batch by batch.

Force the types when dbt guesses wrongly:

```yaml
seeds:
  scratch:
    hang_hoa:
      +column_types:
        ma_hang: varchar(10)
        gia: decimal(18,2)     # don't let dbt guess double
```

When a CSV's **structure** changes (adding/removing a column), you need `dbt seed --full-refresh` — an
ordinary load only replaces the contents, not the schema.

## `snapshot` — SCD Type 2, and the only thing that's gone for good once lost

```sql
-- snapshots/snp_hang_hoa.sql
{% raw %}{% snapshot snp_hang_hoa %}
{{ config(target_schema='snapshots', unique_key='ma_hang',
          strategy='check', check_cols=['nhom']) }}
select ma_hang, ten_hang, nhom from {{ ref('stg_hang_hoa') }}
{% endsnapshot %}{% endraw %}
```

The first run:

```text
┌─────────┬───────────────┬────────────────────────────┬──────────────┐
│ ma_hang │     nhom      │       dbt_valid_from       │ dbt_valid_to │
├─────────┼───────────────┼────────────────────────────┼──────────────┤
│ SP-A    │ Thiết bị nhập │ 2026-07-31 14:42:14.520136 │ NULL         │
│ SP-B    │ Màn hình      │ 2026-07-31 14:42:14.520136 │ NULL         │
└─────────┴───────────────┴────────────────────────────┴──────────────┘
```

Change `SP-A`'s `nhom` to `Phụ kiện` and run `dbt snapshot` again:

```text
┌─────────┬───────────────┬────────────────────────────┬────────────────────────────┐
│ ma_hang │     nhom      │       dbt_valid_from       │        dbt_valid_to        │
├─────────┼───────────────┼────────────────────────────┼────────────────────────────┤
│ SP-A    │ Thiết bị nhập │ 2026-07-31 14:42:14.520136 │ 2026-07-31 14:42:42.204027 │
│ SP-A    │ Phụ kiện      │ 2026-07-31 14:42:42.204027 │ NULL                       │
└─────────┴───────────────┴────────────────────────────┴────────────────────────────┘
```

The old row is **closed** and a new one opens. This is exactly [SCD](../../../data-modeling/skills/scd.md)
Type 2 done for you by dbt — the four columns `dbt_valid_from` / `dbt_valid_to` / `dbt_scd_id` /
`dbt_updated_at` are added by dbt itself.

### `strategy: check` or `timestamp`

| Strategy | Needs | Choose when |
|---|---|---|
| `check` + `check_cols` | nothing extra | The source has **no** trustworthy timestamp column |
| `timestamp` + `updated_at` | a trustworthy timestamp column | The source maintains that column properly, and the data is large |

The four ways of detecting changes and each one's trap are in
[Change detection for SCD 2](../../../data-modeling/skills/scd-change-detection.md).

`check_cols: all` is convenient but dangerous: add one meaningless technical column to the source and
**every row gets a new version**. List the columns explicitly.

### Why snapshots need more care than anything else

If a model is wrong, `dbt run` again. **If a snapshot is wrong, the history already recorded is gone for good**
— no source can rebuild it, because that history only exists inside the snapshot table itself.

The practical consequences:

- Test-run it on a **copy** before the first production run.
- Schedule it to run **regularly**. A snapshot missing one day loses that day's changes permanently.
- Don't casually change `check_cols` — changing the column set changes the definition of "what counts as a change".

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Using `ref()` for a table another system writes | dbt thinks it owns the table; you lose `source freshness` |
| Declaring a source without declaring `freshness` | The source dies while every test stays green |
| Using seeds to load real data | A bloated repo, and `dbt seed` taking minutes |
| Letting dbt guess a seed's column types | Money becomes a `double`, with rounding errors when summed |
| `check_cols: all` | Adding a technical column gives every row a new version |
| Running a snapshot for the first time straight on production | If it's wrong, the history is lost permanently |
| Running snapshots irregularly | You lose the changes of the days you missed |

## Related Topics

- [dbt contents](index.md)
- [Models and `ref()`](models-and-ref.md)
- [Testing and data quality](testing.md) §4 — the **Timeliness** dimension *is* `source freshness`
