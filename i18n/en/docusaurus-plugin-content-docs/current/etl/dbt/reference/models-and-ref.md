---
title: Models and ref() — where the DAG comes from
sidebar_position: 3
description: ref() isn't shorthand for a table name, it's the only way to declare a dependency.
tags: [dbt, model, ref, dag, lineage, ephemeral]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Models and `ref()` — where the DAG comes from

> **Takeaway:** one model = one `.sql` file = one `SELECT`. `ref()` isn't shorthand for a table
> name — it's **the only way** to declare a dependency. Write the table name directly and the
> model still runs, but the DAG loses an edge and the lineage lies.

All the output on this page was really run on dbt 1.12.0 + dbt-duckdb 1.10.1.

## What a model is — and what it must not contain

A model is **one `SELECT`**. No `CREATE`, no `INSERT`, no trailing `;`.

The reason: dbt **wraps** your `SELECT` in DDL it generates itself. Write a `CREATE` and you
get `CREATE TABLE ... AS (CREATE TABLE ...)`. A `;` cuts the statement in two, and the wrapping
after it becomes a stray statement.

Put differently: you declare **the result you want**, and dbt handles how to create it. Switching from `view`
to `table` to `incremental` **without editing a character of SQL** — that's what you buy by
giving up the right to write DDL.

## `ref()` builds the DAG

Every time dbt sees `ref('a')` in model `b`, it records an edge `a → b`. From that edge set:

| What dbt can do | Thanks to |
|---|---|
| Know the run order by itself | a topological sort over the DAG |
| Run exactly the affected branch (`--select x+`) | graph traversal |
| Draw the lineage in `dbt docs` | that same graph |
| Report an error when a referenced model disappears | edge validation |

Writing `from lab.main.don_hang_chi_tiet` directly means **the model still runs** — and that's precisely the
danger. Nothing is reported, but dbt may run things in the wrong order and the lineage **lies**.

**The rule with no exceptions: never write a table name directly.**

### What `ref()` compiles into

The model `mart_doanh_thu_ngay.sql` is written:

```sql
select d.ngay, h.nhom, sum(d.thanh_tien) as doanh_thu, count(*) as so_dong
from {{ ref('stg_don_hang') }} d
join {{ ref('stg_hang_hoa') }} h on d.ma_hang = h.ma_hang
group by 1, 2
```

`target/compiled/.../mart_doanh_thu_ngay.sql` — what the warehouse actually receives:

```sql
select d.ngay, h.nhom, sum(d.thanh_tien) as doanh_thu, count(*) as so_dong
from "scratch"."main"."stg_don_hang" d
join "scratch"."main"."stg_hang_hoa" h on d.ma_hang = h.ma_hang
group by 1, 2
```

`ref()` disappears, becoming a fully qualified three-part table name. **Move to a different warehouse and
this naming part changes itself** — which is why you don't hardcode it.

## Naming by layer

| Prefix | Layer | What it does | The usual materialization |
|---|---|---|---|
| `stg_` | staging | 1 source = 1 model. Rename columns, cast types, **no** joins | `view` |
| `int_` | intermediate | A complex intermediate step nobody reads directly | `ephemeral` / `view` |
| `fct_` `dim_` | mart | Tables for end users | `table` / `incremental` |

Why layering is necessary: without `stg_`, every mart casts types and renames columns in its own way —
and by the time two marts produce different numbers, nobody knows which is right. The `stg_` layer is **the
one single place** that defines "what this column means".

## Selecting models to run

Run on a project with the DAG: `don_hang_chi_tiet` (a seed) → `stg_don_hang` → `mart_doanh_thu_ngay`.

```bash
dbt ls --select stg_don_hang+          # itself + everything DOWNSTREAM
```

```text
scratch.marts.mart_doanh_thu_ngay
scratch.staging.stg_don_hang
```

```bash
dbt ls --select +mart_doanh_thu_ngay   # itself + everything UPSTREAM
```

```text
scratch.marts.mart_doanh_thu_ngay
scratch.staging.stg_don_hang
scratch.staging.stg_hang_hoa
scratch.don_hang_chi_tiet
scratch.hang_hoa
```

Note that the upstream version pulls in **the seeds too** — because a seed is also a node in the DAG.

| Syntax | Meaning |
|---|---|
| `x` | exactly model `x` |
| `x+` | `x` and everything depending on it (downstream) |
| `+x` | `x` and everything it depends on (upstream) |
| `x+2` | downstream but **only 2 steps** |
| `tag:daily` | every model carrying that tag |
| `state:modified` | models changed relative to an earlier `manifest.json` — the basis of CI |

`+x` is the command you need when **debugging**: rebuild the exact chain that produced a wrong table.
`x+` is the command you need when **fixing**: re-run everything affected by a change.

## `config()` in the model or `dbt_project.yml`?

`dbt_project.yml` declares `marts` as `table`:

```yaml
models:
  scratch:
    +materialized: view
    marts:
      +materialized: table
```

The model `marts/mart_test_config.sql` declares the opposite:

```sql
{{ config(materialized='view') }}
select 1 as x
```

The result in the warehouse:

```text
┌──────────────────┬────────────┐
│    table_name    │ table_type │
├──────────────────┼────────────┤
│ mart_test_config │ VIEW       │
└──────────────────┴────────────┘
```

**`config()` in the model wins.** The precedence order: closer to the model wins —
`config()` in the file > subdirectory configuration > project configuration.

The practical consequence: set sensible defaults in `dbt_project.yml` and use `config()` only for
**exceptions** — and each use should carry a comment saying why, because it's breaking the default.

## `ephemeral` — a model that doesn't exist in the warehouse

```sql
{{ config(materialized='ephemeral') }}
select don_hang_id, thanh_tien from {{ ref('stg_don_hang') }}
```

The model using it compiles into:

```sql
with __dbt__cte__stg_eph as (
select don_hang_id, thanh_tien from "scratch"."main"."stg_don_hang"
) select don_hang_id, sum(thanh_tien) as tong from __dbt__cte__stg_eph group by 1
```

It gets **inlined as a CTE**. Checking in the warehouse:

```text
┌─────────────────────┬────────────┐
│     table_name      │ table_type │
├─────────────────────┼────────────┤
│ don_hang_chi_tiet   │ BASE TABLE │
│ hang_hoa            │ BASE TABLE │
│ mart_doanh_thu_ngay │ BASE TABLE │
│ mart_dung_eph       │ BASE TABLE │
│ stg_don_hang        │ VIEW       │
│ stg_hang_hoa        │ VIEW       │
└─────────────────────┴────────────┘
```

`stg_eph` is **not in the list**. It only exists at compile time.

The trade-off: a tidier warehouse, but you **can't query it directly** and can't debug it in
isolation. Use it for intermediate steps nobody needs to read; don't use it if you'll have to open it up and
look.

## Cycles in the DAG

Two models pointing at each other:

```sql
-- stg_vong_a.sql
select 1 as x from {{ ref('stg_vong_b') }}
-- stg_vong_b.sql
select 1 as x from {{ ref('stg_vong_a') }}
```

`dbt run` stops immediately and runs **no model at all**:

```text
Found a cycle: model.scratch.stg_vong_b --> model.scratch.stg_vong_a
```

This is one of the few errors dbt catches at the graph level, before touching the warehouse. It catches it
because `ref()` declares the dependency explicitly — write the table name directly and dbt **can't see the
cycle**, so the tables get built in an arbitrary order.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Writing a table name directly instead of `ref()` | The model still runs, the DAG loses an edge, the lineage lies, and things may run in the wrong order |
| Having `CREATE`/`INSERT`/`;` inside a model | dbt wraps its DDL around it → broken SQL |
| Joining in the `stg_` layer | You lose the "one source, one model" property and the staging layer stops serving its purpose |
| Sprinkling `config()` everywhere | Reading `dbt_project.yml` no longer tells you how a model runs |
| `ephemeral` for a model you need to debug | You can't query it directly and have to read the compiled SQL to understand it |

## Related Topics

- [What dbt is](what-is-dbt.md) — `ref()` for the first time, and the compiled SQL
- [Materializations](materializations.md) — how to choose `view`/`table`/`incremental`/`ephemeral`
- [The project structure](project-structure.md) — where `target/compiled/` lives
- [Sources, seeds, snapshots](sources-seeds-snapshots.md) — how `source()` differs from `ref()`
- [Exercises](../tutorials/dbt-lab-duckdb.md) exercise 4
