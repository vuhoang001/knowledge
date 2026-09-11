---
title: Writing an incremental model
sidebar_position: 4
description: "Processing only new rows is fast, but in exchange you must answer 'what about a late edit' yourself — and the wrong answer raises no error, it just skews the numbers."
tags: [dbt, incremental, is-incremental, late-arriving, merge, performance]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-11
---

# Writing an incremental model

> **Takeaway:** `incremental` trades **run time** for **correctness obligations**. From the
> moment you turn it on, you take responsibility for answering: what about rows arriving
> late, what about rows being edited, will a re-run duplicate anything. Any question you
> leave blank becomes a silent bug.

## Learning goal

Write an incremental model, **create the dropped-late-edit bug with your own hands**, watch
the numbers diverge, then fix it with a lookback window — and understand why no test catches
it.

## Step 1 — The minimal skeleton

```sql
-- models/marts/fct_dong_hang.sql
{{ config(materialized='incremental', unique_key=['don_hang_id', 'dong']) }}

select
    don_hang_id, dong, ma_hang, so_luong, don_gia, thanh_tien, ngay
from {{ ref('stg_don_hang_chi_tiet') }}

{% if is_incremental() %}
where ngay > (select coalesce(max(ngay), date '1900-01-01') from {{ this }})
{% endif %}
```

Three pieces, one job each:

| Piece | Job |
|---|---|
| `materialized='incremental'` | First run → `create table as`. Later runs → insert/merge only |
| `is_incremental()` | `false` when the table doesn't exist yet or you pass `--full-refresh`. The filter **must** live inside this block |
| `unique_key` | The key to merge on. Omit it and dbt only `insert`s — a re-run **duplicates** |

`{{ this }}` is the table currently being built — use it to ask "how far have I got".

## Step 2 — Run it twice

```bash
dbt run -s fct_dong_hang --profiles-dir .
```

```text
02:38:51  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.07s]
02:38:51  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

A second time, with no new data:

```text
02:38:54  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.16s]
02:38:54  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```text
┌─────────┬───────────────┐
│ so_dong │ ngay_moi_nhat │
├─────────┼───────────────┤
│      15 │ 2026-07-05    │
└─────────┴───────────────┘
```

Still 15 rows — no duplication. That's `unique_key` doing its job.

## Step 3 — Create the bug yourself (the most important step here)

Add **two** rows to the source, mirroring exactly what happens in real life:

```text
DH011,1,SP-C,1,900000,2026-07-06
DH001,1,SP-A,4,150000,2026-07-01
```

The first is a brand-new row. The second is a **late edit**: `so_luong` changes from 2 to 4
while the date stays at 2026-07-01.

```bash
dbt seed -s don_hang_chi_tiet --profiles-dir .
dbt run  -s fct_dong_hang     --profiles-dir .
```

```text
02:39:11  1 of 1 OK loaded seed file main.don_hang_chi_tiet .............................. [INSERT 16 in 0.06s]
02:39:14  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.11s]
```

No errors. But reconcile against the source:

```text
┌───────────────────┬─────────┬───────────┐
│       bang        │ so_dong │ doanh_thu │
├───────────────────┼─────────┼───────────┤
│ fct (incremental) │      16 │  11115000 │
│ stg (nguon that)  │      16 │  11415000 │
└───────────────────┴─────────┴───────────┘
```

**The row counts match. The money is off by 300,000.** The `DH001` row still carries the old
`so_luong = 2`:

```text
┌─────────────┬───────┬─────────┬──────────┬─────────┬────────────┬────────────┐
│ don_hang_id │ dong  │ ma_hang │ so_luong │ don_gia │ thanh_tien │    ngay    │
├─────────────┼───────┼─────────┼──────────┼─────────┼────────────┼────────────┤
│ DH001       │     1 │ SP-A    │        2 │  150000 │     300000 │ 2026-07-01 │
└─────────────┴───────┴─────────┴──────────┴─────────┴────────────┴────────────┘
```

Why: the filter `ngay > max(ngay)` only looks at the **business date**. The corrected version
of `DH001` still carries 2026-07-01, below the 2026-07-05 watermark → it never enters the
batch → the merge never touches it.

And **no test catches it**: `unique` passes, `not_null` passes, `relationships` passes, the
row count matches. This is why incremental models are the best hiding place for bugs in a
dbt project.

## Step 4 — Fix it with a lookback window

```sql
{% if is_incremental() %}
-- A 7-day lookback window: catches late edits, not just new rows.
where ngay >= (select coalesce(max(ngay), date '1900-01-01') - interval 7 day from {{ this }})
{% endif %}
```

```bash
dbt run -s fct_dong_hang --profiles-dir .
```

```text
┌───────────────────┬─────────┬───────────┐
│       bang        │ so_dong │ doanh_thu │
├───────────────────┼─────────┼───────────┤
│ fct (lookback 7d) │      16 │  11415000 │
│ stg (nguon that)  │      16 │  11415000 │
└───────────────────┴─────────┴───────────┘
```

Matching. The window is safe only because `unique_key` turns re-reading 7 days into a
**merge** rather than duplicate inserts.

Choose the window width from **data, not intuition** — measure how long late edits actually
trail:

```sql
select date_diff('day', ngay, _cap_nhat_luc) as tre_ngay, count(*)
from nguon group by 1 order by 1 desc limit 20;
```

Take the 99th percentile of `tre_ngay` and add margin. A tail longer than the window is
exactly why you still need a periodic `--full-refresh`.

## Step 5 — Choosing a strategy

| `incremental_strategy` | Mechanism | Use when | Needs `unique_key` |
|---|---|---|---|
| `append` | `insert` only | append-only logs/events that are never edited | no |
| `merge` | `MERGE` on the key | the default on Snowflake/BigQuery/Databricks/DuckDB | **yes** |
| `delete+insert` | delete the old batch, then insert | warehouses without a good `MERGE` | yes |
| `insert_overwrite` | overwrite whole partitions | BigQuery/Spark with clear partitioning | no, but needs `partition_by` |

```sql
{{ config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key=['don_hang_id', 'dong'],
    on_schema_change='append_new_columns'
) }}
```

`on_schema_change` decides what happens when the model gains a column:

| Value | Behaviour |
|---|---|
| `ignore` (default) | the new column is **silently dropped** — a common trap |
| `append_new_columns` | adds the new column, old rows get `null` |
| `sync_all_columns` | adds **and removes** columns to match the model |
| `fail` | stops with an error |

The `ignore` default is where hours go: you add a column to the model, run `dbt run`, it's
green, and the column never appears in the table.

## Step 6 — When NOT to go incremental

Turning incremental on too early is one of the most expensive decisions in a dbt project.

| Situation | Use |
|---|---|
| Table under a few million rows, builds in under a minute | `table` — simple and always right |
| Logic that changes often | `table` — every logic change forces a full refresh, erasing the benefit |
| A source that frequently edits the distant past | `table`, or incremental plus a weekly full refresh |
| A large, append-only fact with stable logic | **`incremental`** |

Four questions to answer **before** typing `materialized='incremental'`:

1. Which column tells you "this row is new"? Is it trustworthy?
2. Does the source edit the past? How late, at the latest?
3. What is the natural key of the grain? (→ `unique_key`)
4. If the run is interrupted and restarted, does anything duplicate?

## Common errors

| Error | Symptom | Fix |
|---|---|---|
| No `unique_key` with the `merge` strategy | data duplicates on every run | Declare `unique_key` |
| The filter sitting **outside** `is_incremental()` | the first run produces an empty or incomplete table | Move it inside the `{% if %}` block |
| `where ngay > max(ngay)` — strictly greater | rows sharing the watermark date are lost | Use `>=` plus `unique_key`, or a window |
| Not handling late edits | **numbers skew, no error** | A lookback window (Step 4) |
| Changing model logic and forgetting `--full-refresh` | old rows keep old logic, new rows the new logic | `dbt run --full-refresh -s <model>` |
| Leaving `on_schema_change` at its default | new columns vanish silently | `append_new_columns` |
| Filtering on `current_date` instead of `max(...) from {{ this }}` | a job that runs past midnight loses a whole day | Always ask `{{ this }}` |
| Only having `unique`/`not_null` tests | nothing catches a skewed total | Add a singular test reconciling totals against staging |

That last row is the real guardrail for incremental models:

```sql
-- tests/tong_fct_khop_staging.sql
with a as (select sum(thanh_tien) t from {{ ref('fct_dong_hang') }}),
     b as (select sum(thanh_tien) t from {{ ref('stg_don_hang_chi_tiet') }})
select a.t as fct, b.t as staging from a, b where a.t <> b.t
```

That test scans the whole table, so it's expensive — give it `tags: ['hang_ngay']` and run it
in the nightly job, not on every PR.

## Related Topics

- [Materializations](../reference/materializations.md) — the four kinds and how to choose
- [Implementing tests in dbt](implementing-tests.md) — writing the reconciliation test
- [Case study — the incremental model dropped a late-edited order](../case-studies/incremental-mat-don-sua-muon.md)
- [Late arriving](../../../data-modeling/skills/late-arriving.md) — this problem at the modelling layer
- [Intermediate exercises](../tutorials/bt-02-trung-binh.md) — exercise T1
