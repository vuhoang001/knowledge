---
title: Materializations
sidebar_position: 5
description: view, table, incremental, ephemeral — the same SELECT, a different thing dbt wraps around it.
tags: [dbt, materialization, incremental, view, table, ephemeral]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Materializations — what dbt creates

> **Takeaway:** A materialization is **how dbt wraps your `SELECT` into DDL**. The same
> SQL, one config line changed, becomes a view, a table, or an incrementally loaded table — without editing
> a character of SQL. That is the entire value of giving up the right to write `CREATE` yourself.

All the output on this page was really run on dbt 1.12.0 + dbt-duckdb 1.10.1.

## The four kinds

| Kind | What dbt generates | Build cost | Query cost | Suits |
|---|---|---|---|---|
| `view` | `CREATE VIEW` | essentially 0 | **recomputed every time** | staging |
| `table` | `CREATE TABLE AS` | a full rebuild | cheap | small and medium marts |
| `incremental` | `INSERT` (+ `DELETE`) of the new part | only the new part | cheap | large facts |
| `ephemeral` | nothing at all — inlined as a CTE | 0 | computed inside the parent query | intermediate steps |

## The evidence: the same SELECT, different DDL

`target/run/` holds the DDL dbt **actually** sent.

`view`:

```sql
create view "scratch"."main"."stg_don_hang__dbt_tmp" as (
    select
    don_hang_id, dong, ma_hang, so_luong, don_gia,
    so_luong * don_gia as thanh_tien,
    cast(ngay as date) as ngay
from "scratch"."main"."don_hang_chi_tiet"
```

`table`:

```sql
    create  table
      "scratch"."main"."mart_doanh_thu_ngay__dbt_tmp"
    as (
      select d.ngay, h.nhom, sum(d.thanh_tien) as doanh_thu, count(*) as so_dong
```

Note the `__dbt_tmp` suffix: dbt builds a temporary table and only then renames it. That way a model that
fails to build **doesn't destroy the table in use** — report readers still see the old version rather than
an empty table.

## `incremental` — the part most worth learning

```sql
{{ config(materialized='incremental', unique_key='don_hang_id') }}
select don_hang_id, sum(thanh_tien) as tong, max(ngay) as ngay
from {{ ref('stg_don_hang') }}
{% raw %}{% if is_incremental() %}
where ngay > (select coalesce(max(ngay), '1900-01-01') from {{ this }})
{% endif %}{% endraw %}
group by 1
```

### The first run — the table doesn't exist yet

`target/compiled/`:

```sql
select don_hang_id, sum(thanh_tien) as tong, max(ngay) as ngay
from "scratch"."main"."stg_don_hang"

group by 1
```

`is_incremental()` returns **false**, and the `where` block **disappears entirely**.

### The second run — the table now exists

```sql
select don_hang_id, sum(thanh_tien) as tong, max(ngay) as ngay
from "scratch"."main"."stg_don_hang"

where ngay > (select coalesce(max(ngay), '1900-01-01') from "scratch"."main"."mart_incr")

group by 1
```

The `where` block appears, and `{{ this }}` has become the target table's name. This is why you **must read
`target/compiled/`** when debugging incremental models: the same `.sql` file produces two different
queries depending on the warehouse's state.

### What dbt does with that result

Because there's a `unique_key`, the second run's DDL:

```sql
delete from "scratch"."main"."mart_incr"
insert into "scratch"."main"."mart_incr" ("don_hang_id", "tong", "ngay")
```

**Delete then insert**, not a plain insert. Drop the `unique_key` and only the `insert` remains — an existing
row gets **duplicated** rather than updated.

`incremental_strategy` decides this pair of statements: `append` (insert only),
`delete+insert` (dbt-duckdb's default when there's a `unique_key`), `merge` (for warehouses supporting
`MERGE`, like Snowflake and BigQuery).

## Four questions to answer before choosing `incremental`

`incremental` is the only kind that introduces **state** into the pipeline, so it's the only one that can
be silently wrong. `view` and `table` rebuild from scratch and therefore always match the model.

| Question | If you can't answer it |
|---|---|
| How are late-arriving rows handled? | Filtering by `max(ngay)` **permanently misses** rows with an older date |
| What about rows `UPDATE`d at the source? | Without a `unique_key` you duplicate; with one, you must be sure it really is unique |
| How often do you `--full-refresh`? | Errors accumulate and nobody notices |
| What happens when the schema changes? | By default dbt **ignores new columns**; you need `on_schema_change` |

If you can't answer all four, use `table`. It's slower but it **never fails silently**.

## Which kind to choose

```text i18n-prose
Is the model heavy?
├─ No   → view          (the default, cheapest, always fresh)
└─ Yes
   ├─ Nobody reads it directly        → ephemeral
   ├─ A rebuild is still acceptable   → table
   └─ A rebuild takes too long
      └─ Can you answer all 4 questions above? → incremental
                                              otherwise → table
```

**The default should be `view`.** Change to `table` when you've **measured** it as slow, not when you're
guessing — the lab's `dbt_project.yml` is set up exactly that way.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| `incremental` without a `unique_key` when the source has `UPDATE`s | Rows silently duplicate and totals inflate |
| Filtering `is_incremental()` by the target table's `max(ngay)` | Late-arriving rows are permanently missed |
| Forgetting to wrap `{% raw %}{% if is_incremental() %}{% endraw %}` | The first run references `{{ this }}` when the table doesn't exist yet → an error |
| Choosing `incremental` because it "sounds faster" | You add state and new ways to be wrong, with no measured benefit |
| `table` for the staging layer | A full rebuild every time, in exchange for nothing |
| Never running `--full-refresh` | Errors accumulate; you should have it on a schedule |

## Related Topics

- [Models and `ref()`](models-and-ref.md) — `ephemeral` inlined as a CTE, with evidence
- [What dbt is](what-is-dbt.md) — why dbt wraps a `SELECT` into DDL
- [Sources, seeds, snapshots](sources-seeds-snapshots.md) — a `snapshot` is completely different and can't be reproduced
- [Testing and data quality](testing.md) — tests are what catch an `incremental` running wrongly
- [Exercises](../tutorials/dbt-lab-duckdb.md) exercise 5
