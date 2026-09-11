---
title: "dbt exercises — Basic"
sidebar_position: 10
description: "Five exercises from dbt debug to your first mart: a working project, ref(), sources, generic tests, materializations. Each one states the answer it must produce."
tags: [dbt, bai-tap, tutorial, ref, source, test, duckdb]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# dbt exercises — Basic

> **Takeaway:** these five exercises build exactly one thing — **a project that runs, with a
> real DAG and real tests**. Until you've got through this set, everything in the
> Intermediate set is just reading.

## How to use this

Each exercise has four parts: **Task** → **Hint** → **The answer it must produce** →
**Solution**, hidden in a `<details>`. Write your own code first, compare the numbers, and
only open the solution once they match, to compare approaches. **Opening the solution before
trying is reading, not practising.**

## Shared data

Lab: `~/Documents/learn-lab/dbt` — its own venv, `dbt-duckdb`, seeds already there.

```bash
cd ~/Documents/learn-lab/dbt
./.venv/bin/dbt deps --profiles-dir .
./.venv/bin/dbt seed --profiles-dir .
```

The four tables used most in this set:

| Table | Grain | Rows |
|---|---|---|
| `don_hang` | one order | 10 |
| `don_hang_chi_tiet` | one line item within an order | 15 |
| `khach_hang` | one customer | 4 |
| `hang_hoa` | one product | 4 |

Three anchor numbers that stay constant across all three exercise sets:

```text i18n-prose
10 orders · 15 line items · revenue 10,215,000
```

Every output in this file was produced on **dbt-core 1.12.0 + dbt-duckdb 1.10.1**. Another
version may format the log lines differently; the numbers won't change.

---

## Exercise B1 — From zero to a green `dbt debug`

**Task:** create a new dbt project called `bt_co_ban` in a temporary directory, using DuckDB,
with `profiles.yml` inside the project. Goal: `dbt debug` reports `All checks passed!`.

Don't use `dbt init` — write the two config files yourself.

**Hint:** exactly two files decide everything. The `profile:` in the first must match the
block name in the second.

**The answer it must produce:**

```text
  dbt_project.yml file [OK found and valid]
Required dependencies:
 - git [OK found]

Connection:
  database: lab
  schema: main
  path: lab.duckdb
  threads: 4
Registered adapter: duckdb=1.10.1
  Connection test: [OK connection ok]

All checks passed!
```

<details>
<summary>Solution</summary>

```bash
mkdir -p bt_co_ban/{models,seeds,tests,macros,snapshots} && cd bt_co_ban
```

```yaml
# dbt_project.yml
name: bt_co_ban
version: '1.0'
profile: bt_co_ban

model-paths: ['models']
seed-paths: ['seeds']
test-paths: ['tests']
snapshot-paths: ['snapshots']
macro-paths: ['macros']
clean-targets: ['target', 'dbt_packages']

models:
  bt_co_ban:
    +materialized: view
    staging:
      +schema: staging
    marts:
      +schema: marts
```

```yaml
# profiles.yml
bt_co_ban:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: lab.duckdb
      threads: 4
```

```bash
dbt debug --profiles-dir .
```

**Three common mistakes:**

1. `profile: bt_co_ban` in `dbt_project.yml` doesn't match the `bt_co_ban:` key in
   `profiles.yml` → `Could not find profile named ...`.
2. Forgetting `--profiles-dir .` → dbt goes looking for `~/.dbt/profiles.yml`.
3. Writing `staging:` directly at the top level under `models:` (missing the project-name
   level) → **no error is raised**, the config just silently doesn't apply.

Check number 3 with `dbt ls` once you have a model: the schema must be `main_staging`, not
`main`.

</details>

---

## Exercise B2 — Your first model, and reading the SQL dbt really sends

**Task:** write `models/staging/stg_don_hang.sql` reading from the `don_hang` seed, casting
`ngay_dat`, `ngay_giao`, `ngay_nhan` to `date` and `phi_ship` to `bigint`. Then **open the
compiled SQL file** and point out what `{{ ref('don_hang') }}` became.

**Hint:** a model is one `SELECT` — no `create table`, no `;`.

**The answer it must produce:** in `target/compiled/`, the `from` line must be a fully
qualified three-part path:

```sql
with nguon as (
    select * from "lab"."main"."don_hang"
)
```

<details>
<summary>Solution</summary>

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

```bash
dbt run -s stg_don_hang --profiles-dir .
cat target/compiled/bt_co_ban/models/staging/stg_don_hang.sql
```

**What you must take away:** `ref()` is not shorthand for a table name. It compiles to a path
**correct for the current environment** — switch to `--target prod` and the same file
produces a different path. That's why you never hard-code a schema name in a model.

Tell the two directories apart: `target/compiled/` is SQL after Jinja is rendered (paste it
straight into the warehouse and it runs); `target/run/` is the same SQL wrapped in
`create view as ...`.

</details>

---

## Exercise B3 — A second model and a derived column

**Task:** write `stg_don_hang_chi_tiet` with a derived column `thanh_tien = so_luong *
don_gia`. Cast `so_luong` and `don_gia` to `bigint` before multiplying.

Then answer with SQL: how many rows does the table have, and what is the total `thanh_tien`?

**Hint:** this multiplication must live in **exactly one place** in the whole project. Putting
it in staging is what stops every downstream mart from rewriting it.

**The answer it must produce:**

```text
┌─────────┬───────────┐
│ so_dong │ doanh_thu │
├─────────┼───────────┤
│      15 │  10215000 │
└─────────┴───────────┘
```

<details>
<summary>Solution</summary>

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

**Why cast before multiplying:** `so_luong` and `don_gia` come out of the CSV as `INTEGER` —
32-bit (check with `describe main.don_hang_chi_tiet`). With the lab data the product stays
small, so nothing overflows — but `INTEGER` only holds up to about 2.1 billion, and VND
amounts reach that quickly: a single 3-billion-dong order overflows. DuckDB widens the result
to `int128` on its own; other warehouses don't necessarily. Casting in staging is the cheapest
place to prevent it — **not tried on Postgres; this is reasoning from type limits, not an
observed output.**

**Why `thanh_tien` belongs to staging and not to a mart:** it's an *obvious* calculation from
two columns of the same row, not a business rule. The boundary: if you have to ask someone
"what's the rule here", it belongs in a mart; if you can see it at a glance, it belongs in
staging.

</details>

---

## Exercise B4 — Your first mart, and reading the run order

**Task:** write `models/marts/mart_doanh_thu_ngay.sql` materialized as a `table`, aggregating
revenue and order count by `ngay_dat`. Run `dbt run` on **everything** and point out what in
the output proves dbt worked out the order for itself.

**Hint:** nobody declares that order anywhere. It's inferred from `ref()`.

**The answer it must produce:**

```text
1 of 3 START sql view model main_staging.stg_don_hang .......................... [RUN]
2 of 3 START sql view model main_staging.stg_don_hang_chi_tiet ................. [RUN]
1 of 3 OK created sql view model main_staging.stg_don_hang ..................... [OK in 0.07s]
2 of 3 OK created sql view model main_staging.stg_don_hang_chi_tiet ............ [OK in 0.07s]
3 of 3 START sql table model main_marts.mart_doanh_thu_ngay .................... [RUN]
3 of 3 OK created sql table model main_marts.mart_doanh_thu_ngay ............... [OK in 0.04s]
Done. PASS=3 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=3
```

```text
┌────────────┬────────┬───────────┐
│    ngay    │ so_don │ doanh_thu │
├────────────┼────────┼───────────┤
│ 2026-07-01 │      2 │   1350000 │
│ 2026-07-02 │      2 │   3150000 │
│ 2026-07-03 │      2 │   4200000 │
│ 2026-07-04 │      2 │   1095000 │
│ 2026-07-05 │      2 │    420000 │
└────────────┴────────┴───────────┘
```

<details>
<summary>Solution</summary>

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

**Where the output proves dbt knows the order:** the two staging models `START` in the same
instant (in parallel — they don't depend on each other), while `mart_doanh_thu_ngay` only
`START`s after both report `OK`.

**The `count(distinct)` trap:** after the join, each order appears on several rows (one per
line item). `count(don_hang_id)` would give 15 instead of 10. This is the classic grain trap
— a join inflates the grain, and every aggregate after it must account for that.

A quick check:

```sql
select sum(so_don), sum(doanh_thu) from main_marts.mart_doanh_thu_ngay;
-- phải ra 10 và 10215000
```

</details>

---

## Exercise B5 — Sources and generic tests

**Task:** two parts.

1. Declare a source called `lab_raw` pointing at schema `main`, table `su_kien_web`, with
   `freshness` warning after 12 hours and erroring after 24. Write `stg_su_kien` using
   `source()`.
2. Add generic tests: `unique` + `not_null` on `stg_don_hang.don_hang_id`, `accepted_values`
   on `trang_thai`, `relationships` from line items back to orders, and
   `dbt_utils.unique_combination_of_columns` proving the line-item table's grain.

Run `dbt test`; everything must be green.

**Hint:** `loaded_at_field` must be a valid SQL expression — the `thoi_diem` column in the
seed is a `varchar`. And on dbt 1.12, generic test parameters go under an `arguments:` key.

**The answer it must produce:**

```text
Done. PASS=5 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5
```

<details>
<summary>Solution</summary>

```yaml
# models/staging/sources.yml
version: 2

sources:
  - name: lab_raw
    schema: main
    tables:
      - name: su_kien_web
        loaded_at_field: cast(thoi_diem as timestamp)
        freshness:
          warn_after:  {count: 12, period: hour}
          error_after: {count: 24, period: hour}
```

```sql
-- models/staging/stg_su_kien.sql
select * from {{ source('lab_raw', 'su_kien_web') }}
```

```yaml
# models/staging/schema.yml
version: 2

models:
  - name: stg_don_hang
    columns:
      - name: don_hang_id
        tests: [unique, not_null]
      - name: trang_thai
        tests:
          - accepted_values:
              arguments:
                values: ['moi', 'dang_giao', 'hoan_thanh']

  - name: stg_don_hang_chi_tiet
    columns:
      - name: don_hang_id
        tests:
          - relationships:
              arguments:
                to: ref('stg_don_hang')
                field: don_hang_id
    tests:
      - dbt_utils.unique_combination_of_columns:
          arguments:
            combination_of_columns: [don_hang_id, dong]
```

**Three things you must take away:**

**1. `arguments:` is the new syntax.** The old form (parameters directly under the test name)
still runs on dbt 1.12 but prints a warning:

```text
[WARNING][DeprecationsSummary]: Deprecated functionality
Summary of encountered deprecations:
- MissingArgumentsPropertyInGenericTestDeprecation: 2 occurrences
```

**2. `unique` on the line-item table's `don_hang_id` will FAIL — and that's a wrong test, not
wrong data.** Try it and see:

```text
[ERROR]: in test unique_stg_don_hang_chi_tiet_don_hang_id (models/staging/schema.yml)
  Got 4 results, configured to fail if != 0
```

The table's grain is `(don_hang_id, dong)`, not `don_hang_id`. That's why you need
`unique_combination_of_columns`. **Establish the grain before writing the test.**

**3. `dbt source freshness` here will report `ERROR STALE` — and that's also correct:**

```text
1 of 1 ERROR STALE freshness of lab_raw.su_kien_web ............................ [ERROR STALE in 0.01s]
```

The seed holds July data and today is September. Freshness compares against **the wall
clock**, not against your previous dbt run. So don't let this command block CI in dev — it
belongs to the production job.

</details>

---

## Self-check before moving to Intermediate

Answer out loud, with the docs closed:

<details>
<summary>1. Why must a model contain no <code>create table</code> and no <code>;</code>?</summary>

dbt generates the DDL from the declared materialization. Writing it by hand overrides that
choice, and a `;` in the middle breaks the statement dbt wraps around yours.

</details>

<details>
<summary>2. What breaks if you replace <code>ref()</code> with a hard-coded table name?</summary>

**Nothing you can see** — the model still runs and the numbers are still right. What's lost
is an edge in the DAG: dbt may run things in the wrong order, `dbt ls --select +model` stops
listing everything, and lineage lies. The kind of breakage that raises no error.

</details>

<details>
<summary>3. How does <code>source()</code> differ from <code>ref()</code>?</summary>

`source()` = a table dbt **doesn't** create and can't rebuild. In exchange you get
`dbt source freshness` and lineage with a root. The rule: can dbt rebuild it? No →
`source()`.

</details>

<details>
<summary>4. A <code>unique</code> test passes but the numbers are still wrong — what do you suspect first?</summary>

Suspect that you tested the wrong grain. `unique` on one column says nothing about a table
with a composite grain.

</details>

## Related Topics

- [Setting up and configuring a dbt project](../skills/khoi-tao-dbt-project.md) — exercise B1
- [Writing your first model with `ref()`](../skills/model-dau-tien-voi-ref.md) — exercises B2, B4
- [Declaring sources](../skills/khai-bao-source.md) — exercise B5
- [Intermediate exercises](bt-02-trung-binh.md) — the next set
