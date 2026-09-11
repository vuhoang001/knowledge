---
title: Writing your first model with ref()
sidebar_position: 2
description: "One .sql file = one SELECT = one table. ref() isn't shorthand for a table name, it's the only way dbt learns the run order."
tags: [dbt, model, ref, dag, staging]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Writing your first model with `ref()`

> **Takeaway:** a model is **one `SELECT`, with no `CREATE` and no `;`**. dbt wraps the DDL
> around it. And `ref()` is **an edge in the DAG** — write the table name literally and the
> model still runs, dbt just loses the ability to know the order. That is the kind of
> breakage that raises no error.

## Learning goal

Write two chained models, read the SQL dbt actually sends, and prove with a command that
`ref()` really created a dependency edge.

## Step 1 — A model is a `SELECT`

```sql
-- models/staging/stg_don_hang.sql
with nguon as (
    select * from {{ ref('don_hang') }}
)
select
    don_hang_id,
    khach_id,
    cast(ngay_dat  as date) as ngay_dat,
    cast(ngay_giao as date) as ngay_giao,
    cast(ngay_nhan as date) as ngay_nhan,
    trang_thai,
    cast(phi_ship as bigint) as phi_ship
from nguon
```

Three things that are **not** in the file, and must not be added:

| Don't write | Why |
|---|---|
| `create table ... as` | dbt generates this from the materialization. Writing it by hand overrides that choice |
| a trailing `;` | dbt wraps this statement inside a larger one; a `;` in the middle breaks the syntax |
| a hard-coded schema/database | dev and prod use different schemas — hard-coding runs against the wrong one |

The model's name is the **file name**, not a name inside the `select`. `stg_don_hang.sql` →
`ref('stg_don_hang')`.

## Step 2 — A second model, wired with `ref()`

```sql
-- models/staging/stg_don_hang_chi_tiet.sql
select
    don_hang_id,
    dong,
    ma_hang,
    cast(so_luong as bigint) as so_luong,
    cast(don_gia  as bigint) as don_gia,
    cast(so_luong as bigint) * cast(don_gia as bigint) as thanh_tien,
    cast(ngay as date) as ngay
from {{ ref('don_hang_chi_tiet') }}
```

```sql
-- models/marts/mart_doanh_thu_ngay.sql
{{ config(materialized='table') }}

select
    dh.ngay_dat                    as ngay,
    count(distinct dh.don_hang_id) as so_don,
    sum(ct.thanh_tien)             as doanh_thu
from {{ ref('stg_don_hang') }} dh
join {{ ref('stg_don_hang_chi_tiet') }} ct using (don_hang_id)
group by 1
```

## Step 3 — Run it, and read the order in the output

```bash
dbt run --profiles-dir .
```

```text
02:37:53  1 of 3 START sql view model main_staging.stg_don_hang .......................... [RUN]
02:37:53  2 of 3 START sql view model main_staging.stg_don_hang_chi_tiet ................. [RUN]
02:37:53  1 of 3 OK created sql view model main_staging.stg_don_hang ..................... [OK in 0.07s]
02:37:53  2 of 3 OK created sql view model main_staging.stg_don_hang_chi_tiet ............ [OK in 0.07s]
02:37:53  3 of 3 START sql table model main_marts.mart_doanh_thu_ngay .................... [RUN]
02:37:53  3 of 3 OK created sql table model main_marts.mart_doanh_thu_ngay ............... [OK in 0.04s]
02:37:53  Done. PASS=3 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=3
```

Two important things are readable here:

- **The two staging models run in parallel** (both `START` in the same instant) — they don't
  depend on each other.
- **`mart_doanh_thu_ngay` waits for both to finish.** Nobody declared that order anywhere;
  it was inferred from the two `ref()` calls.

## Step 4 — See the SQL dbt actually sends

This is the habit to form with your very first model:

```bash
cat target/compiled/dbt_lab/models/staging/stg_don_hang.sql
```

```sql
with nguon as (
    select * from "lab"."main"."don_hang"
)
select
    don_hang_id,
    khach_id,
    cast(ngay_dat  as date) as ngay_dat,
    cast(ngay_giao as date) as ngay_giao,
    cast(ngay_nhan as date) as ngay_nhan,
    trang_thai,
    cast(phi_ship as bigint) as phi_ship
from nguon
```

`{{ ref('don_hang') }}` became `"lab"."main"."don_hang"` — **a fully qualified path, correct
for the current environment**. Switch to `--target prod` and the same file compiles to a
different path. That is the entire value of `ref()`.

Tell the two directories apart:

| Directory | Contains | Use it for |
|---|---|---|
| `target/compiled/` | SQL after Jinja is rendered, **without** the DDL wrapper | Debugging SQL logic — paste it straight into the warehouse |
| `target/run/` | SQL already wrapped in `create table as ...` | Seeing what object dbt actually creates |

## Step 5 — Prove the DAG edge exists

Don't trust your eyes; ask dbt:

```bash
dbt ls --select stg_don_hang+          # this model and everything downstream
dbt ls --select +mart_doanh_thu_ngay   # this model and everything it depends on
```

If you replace `{{ ref('stg_don_hang') }}` with a hard-coded `main_staging.stg_don_hang`,
the model **still runs** — but `dbt ls --select +mart_doanh_thu_ngay` will no longer list
`stg_don_hang`. That's how you detect it.

## Common errors

| Error | Symptom | Fix |
|---|---|---|
| Hard-coding a table name instead of `ref()` | **No error.** The model runs, numbers are right, the DAG is wrong | grep `from\s+\w+\.\w+` in `models/` |
| `Model 'model.x.y' depends on a node named 'z' which was not found` | dbt fails at parse time | A typo in `ref()` — the name is the **file name**, without `.sql` |
| `Found a cycle` | parse failure | Two models `ref()` each other. dbt refuses, and it's right |
| A trailing `;` in a model | a confusing syntax error from the warehouse | Remove the `;` |
| A `create table` inside a model | the table lands in the wrong place, or errors | Remove it; use `config(materialized=...)` |
| Quoting `ref()`: `'{{ ref("x") }}'` | dbt treats it as a string, not a table | Remove the quotes |
| Two model files with the same name in different directories | `Found two resources with the name` | Model names are **global**, not per-directory |

## A short check before moving on

Answer out loud, then verify with a command:

1. Which database and schema does my model land in? → `dbt debug`, `dbt run` output.
2. How many models does `mart_doanh_thu_ngay` depend on? → `dbt ls --select +mart_doanh_thu_ngay`.
3. What does the SQL actually sent look like? → `target/compiled/`.

## Related Topics

- [Models and `ref()` — where the DAG comes from](../reference/models-and-ref.md) — the theory
- [Layering and naming conventions](../reference/layer-va-dat-ten.md) — which layer a new model belongs in
- [Declaring sources](khai-bao-source.md) — when the table isn't created by dbt
- [Basic exercises](../tutorials/bt-01-co-ban.md) — exercises 2 and 3
