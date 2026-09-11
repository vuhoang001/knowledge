---
title: Declaring sources and checking freshness
sidebar_position: 3
description: "source() is the declaration 'this table isn't mine'. In return you get freshness checks, lineage with a root, and one single place to edit when the source is renamed."
tags: [dbt, source, freshness, lineage, staging]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Declaring sources and checking freshness

> **Takeaway:** `source()` is not a prettier way to write a table name. It is the
> declaration **"another system writes this table; dbt doesn't own it"** — and that
> declaration is what unlocks `dbt source freshness`, lineage with a root, and a single
> place to edit when the source changes schema.

## Learning goal

Declare a complete source, run `dbt source freshness`, and **read a `STALE` result
correctly** — including when it's stale for reasons that aren't a pipeline failure.

## Step 1 — Tell `source()` from `ref()`

| | `source()` | `ref()` |
|---|---|---|
| Who creates the table | another system (Fivetran, Spark, Flink, CDC) | dbt itself |
| Can dbt rebuild it | **no** | yes |
| Where it's declared | a `.yml` file under `models/` | nowhere — inferred from the file name |
| Has `freshness` | yes | no |
| If you use the wrong one | dbt thinks it owns someone else's table | you lose `freshness`, lineage has no root |

The one-line rule: **can dbt rebuild that table? No → `source()`.**

## Step 2 — Declare the source in YAML

Put the file next to the staging models; `sources.yml` is the conventional name.

```yaml
# models/staging/sources.yml
version: 2

sources:
  - name: lab_raw              # the logical name, used in source('lab_raw', ...)
    schema: main               # the REAL schema in the warehouse
    tables:
      - name: su_kien_web
        loaded_at_field: cast(thoi_diem as timestamp)
        freshness:
          warn_after:  {count: 12, period: hour}
          error_after: {count: 24, period: hour}
```

Four fields worth noticing:

- **`name` is not `schema`.** `name` is the alias used in code; `schema` is the real name.
  The source moves schema → you edit exactly this one line.
- **`loaded_at_field` must be a valid SQL expression**, not necessarily a bare column name.
  Here the `thoi_diem` column is a `varchar`, so it needs a `cast`.
- `warn_after` / `error_after` are measured from **the current time**, not from the previous
  run.
- Add `database:` when the source lives in a different database/catalog.

A fuller version for a real environment:

```yaml
sources:
  - name: erp
    database: RAW              # the catalog/database holding the source
    schema: erp_prod
    loader: fivetran           # documentation only; shows up in dbt docs
    tables:
      - name: orders
        identifier: ORDERS_V2  # the REAL name, if it differs from `name`
        description: "Đơn hàng từ ERP, Fivetran đồng bộ 15 phút một lần."
        columns:
          - name: order_id
            tests: [unique, not_null]
```

`identifier` is the escape hatch for ugly source names: your code says
`source('erp', 'orders')` while dbt goes looking for `RAW.erp_prod.ORDERS_V2`.

## Step 3 — Use it in a staging model

```sql
-- models/staging/stg_su_kien.sql
select * from {{ source('lab_raw', 'su_kien_web') }}
```

```bash
dbt run -s stg_su_kien --profiles-dir .
```

```text
02:38:34  Finished running 1 view model in 0 hours 0 minutes and 0.14 seconds (0.14s).
02:38:34  Completed successfully
02:38:34  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

**Only staging models may call `source()`.** That rule is greppable — see
[Layering and naming conventions](../reference/layer-va-dat-ten.md).

## Step 4 — `dbt source freshness`

```bash
dbt source freshness --profiles-dir .
```

Real output on the lab (seed data is from July, run on 2026-09-11):

```text
02:38:37  1 of 1 START freshness of lab_raw.su_kien_web .................................. [RUN]
02:38:37  1 of 1 ERROR STALE freshness of lab_raw.su_kien_web ............................ [ERROR STALE in 0.01s]
02:38:37  Finished running 1 source in 0 hours 0 minutes and 0.14 seconds (0.14s).
02:38:37  [ERROR]: in source su_kien_web (models/staging/sources.yml)
02:38:37    Status: error
```

`ERROR STALE` here is **correct**: `max(thoi_diem)` is 2026-07-05, more than two months
back, far past `error_after: 24 hour`.

That's the most important lesson of this command: **freshness compares against the wall
clock, not against your previous dbt run.** Sample data, a dev environment restored from an
old copy, a source that only loads monthly — all three go `STALE` with nothing broken.

The practical consequence: **don't let `dbt source freshness` block CI on dev.** It belongs
to the production job, run ahead of `dbt build` to decide whether to stop early.

```bash
# In the production job: if the source is stale, stop — don't build wrong numbers
dbt source freshness --target prod && dbt build --target prod
```

## Step 5 — Pick thresholds from the SLA, not from a feeling

| Source's load cadence | `warn_after` | `error_after` | Rationale |
|---|---|---|---|
| Continuous streaming/CDC | 30 minutes | 2 hours | 2 hours behind is a genuine incident |
| 15-minute batches (Fivetran) | 1 hour | 6 hours | leaves room for a few retries |
| Nightly batch | 26 hours | 30 hours | must exceed 24 hours, or every morning is red |
| Monthly load | 32 days | 40 days | measured in cycles, not days |

The most common trap is row three: setting `error_after: 24 hour` for a nightly source →
false alarms every time the job runs ten minutes late. The threshold must be **the cycle
plus the delay you're willing to tolerate**.

## Common errors

| Error | Symptom | Fix |
|---|---|---|
| Using `ref()` for a source table | dbt reports the node isn't found | Switch to `source()` and declare it in YAML |
| Hard-coding `raw.erp.orders` in a model | no error, but lineage has no root | `dbt docs` can't see the source; switch to `source()` |
| `loaded_at_field` pointing at a string column | `Binder Error` / a type comparison error | `cast(... as timestamp)` right inside `loaded_at_field` |
| `loaded_at_field` set to the **business** timestamp instead of the **load** timestamp | freshness measures the wrong thing | Use the `_loaded_at`/`_ingested_at` column the pipeline writes |
| `error_after` shorter than the load cycle | daily false alarms | Threshold > cycle |
| `dbt source freshness` in dev CI | CI goes red because sample data is old | Run it only in the production job |
| A declared source no model uses | no error; an orphaned source | `dbt ls --resource-type source` and cross-check |

## Verifying

```bash
dbt ls --resource-type source                  # which sources are declared
dbt ls --select source:lab_raw+                # every model downstream of a source
dbt source freshness --select source:lab_raw   # check just one source
```

The second command is what you reach for when a source reports an incident: **you instantly
know which reports are affected**.

## Related Topics

- [Sources, seeds and snapshots](../reference/sources-seeds-snapshots.md) — the theory
- [Layering and naming conventions](../reference/layer-va-dat-ten.md) — why only staging may call `source()`
- [Writing your first model with `ref()`](model-dau-tien-voi-ref.md)
- [Setting up CI/CD for a dbt project](ci-cd-cho-dbt.md) — which job `source freshness` belongs to
