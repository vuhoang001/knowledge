---
title: Managing dependencies with packages
sidebar_position: 8
description: "dbt_utils isn't a nice-to-have utility library — it's where the tests you will definitely need already live, plus a lesson about pinning versions."
tags: [dbt, package, dbt-utils, dependencies, dbt-expectations]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Managing dependencies with packages

> **Takeaway:** a dbt package is **not a library that runs at runtime** — it is source code
> downloaded into `dbt_packages/` and compiled together with your project. Which means: if
> you don't pin the version, one fine morning the generated SQL is different and nobody
> changed a line of code.

## Learning goal

Install a package, use the five most valuable macros/tests in `dbt_utils`, and pin versions
correctly so CI doesn't change behaviour behind your back.

## Step 1 — Declare and install

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]
```

```bash
dbt deps
```

```text
02:37:07  Installing dbt-labs/dbt_utils
02:37:07  Installed from version 1.4.1
02:37:07  Up to date!
```

Three sources of packages, three ways to declare them:

```yaml
packages:
  # 1. dbt Package Hub — the most common
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]

  # 2. Git — an internal company package
  - git: "https://github.com/cong-ty/dbt-macros-chung.git"
    revision: v1.2.0          # a tag or a commit SHA — NOT a branch

  # 3. A local directory — a monorepo with several dbt projects
  - local: ../dbt_chung
```

## Step 2 — `package-lock.yml`, and why it must be committed

`dbt deps` produces a lock file:

```yaml
packages:
  - name: dbt_utils
    package: dbt-labs/dbt_utils
    version: 1.4.1
sha1_hash: e6424ba9e5a22487e47f023803aa4f0411946808
```

**Commit this file.** It turns `>=1.1.0, <2.0.0` (a range) into `1.4.1` (a point). Without
it, your machine installs 1.4.1 while CI installs 1.5.0 — and the macros generate different
SQL while the git diff is empty.

`.gitignore` must contain `dbt_packages/` (downloaded code, regenerable) but **not**
`package-lock.yml`.

Upgrading is a **deliberate** act:

```bash
dbt deps --upgrade      # update the lock file, then review the diff like code
```

## Step 3 — The five most-used things in `dbt_utils`

### 1. `unique_combination_of_columns` — the test you need on day one

dbt's `unique` test accepts only **one** column. For a table with a composite grain it is
useless.

```yaml
models:
  - name: stg_don_hang_chi_tiet
    tests:
      - dbt_utils.unique_combination_of_columns:
          arguments:
            combination_of_columns: [don_hang_id, dong]
```

```text
02:38:20  2 of 5 PASS dbt_utils_unique_combination_of_columns_stg_don_hang_chi_tiet_don_hang_id__dong  [PASS in 0.08s]
```

This is the test that **proves the grain**. Without it, every claim about grain is just
words.

### 2. `generate_surrogate_key` — a stable surrogate key

```sql
select
    {{ dbt_utils.generate_surrogate_key(['khach_id']) }} as khach_sk,
    {{ dbt_utils.star(from=ref('khach_hang'), except=['ho_ten']) }}
from {{ ref('khach_hang') }}
```

Compiles to:

```sql
select
    md5(cast(coalesce(cast(khach_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as khach_sk,
    "khach_id",
  "khu_vuc",
  "hang"
from "lab"."main"."khach_hang"
```

```text
┌──────────────────────────────────┬──────────┬────────────┬───────────┐
│             khach_sk             │ khach_id │  khu_vuc   │   hang    │
├──────────────────────────────────┼──────────┼────────────┼───────────┤
│ 1a2ddc2db4693cfd16d534cde5572cc1 │ C1       │ Mien Nam   │ Bac       │
│ f1a543f5a2c5d49bc5dde298fcf716e4 │ C2       │ Mien Nam   │ Vang      │
│ 3abe124ecc82bf2c2e22e6058f38c50c │ C3       │ Mien Trung │ Bac       │
│ b713e6323a68d3ddabf4855826c50148 │ C4       │ Mien Bac   │ Kim cuong │
└──────────────────────────────────┴──────────┴────────────┴───────────┘
```

Two important details readable straight off the compiled SQL:

- **A `coalesce` with a sentinel string.** Without it, a `NULL` in the key makes `md5` return
  `NULL` → every row missing a key collapses into one.
- **A hash, not a counter.** The value is **stable**: rebuild it, run it on another machine,
  move warehouses, and you get the same string. That's what `row_number()` can never give
  you.

### 3. `star` — select everything except a few columns

`select *` in staging is a bad habit (a new column at the source flows down into the mart
with nobody reviewing it), but nobody lists 40 columns by hand either. `star()` is the middle
road.

### 4. `date_spine` — generating a date table

```sql
{{ dbt_utils.date_spine(
    datepart="day",
    start_date="cast('2026-01-01' as date)",
    end_date="cast('2027-01-01' as date)"
) }}
```

This is the backbone of `dim_date` and of every report that needs "days with no orders must
still show a zero row".

### 5. `equality` / `fewer_rows_than` — tests that reconcile two tables

```yaml
models:
  - name: fct_dong_hang
    tests:
      - dbt_utils.fewer_rows_than:
          arguments:
            compare_model: ref('stg_don_hang_chi_tiet')
```

This class of test catches what `unique`/`not_null` never will: **a model dropping rows**.

## Step 4 — Other packages, and when they earn their place

| Package | For what | Consideration |
|---|---|---|
| `dbt_utils` | baseline tests + macros | **Practically mandatory** |
| `dbt_expectations` | ~60 Great Expectations-style tests (distributions, types, regex) | Add it when you need deep data quality; much heavier |
| `codegen` | generates YAML/models from real tables | Saves hours when declaring 40 source tables |
| `dbt_date` | date/time helpers, time zones, fiscal calendars | When the fiscal calendar differs from the Gregorian one |
| `elementary` | observability: test tracking, anomaly detection | Teams already running steadily in production |
| `audit_helper` | comparing two tables during a refactor | **Very worthwhile** when migrating off a legacy system |

`codegen` deserves a special mention — it saves exactly the most tedious part of the job:

```bash
dbt run-operation generate_source --args '{schema_name: erp_prod, database_name: RAW}'
dbt run-operation generate_base_model --args '{source_name: erp, table_name: orders}'
```

## Common errors

| Error | Symptom | Fix |
|---|---|---|
| Not committing `package-lock.yml` | CI generates different SQL than local, git diff is empty | Commit it |
| `revision:` pointing at the `main` branch | the package changes behind your back | Point at a tag or a SHA |
| Forgetting `dbt deps` in CI | `Compilation Error ... 'dbt_utils' is undefined` | Add `dbt deps` before everything else |
| Committing `dbt_packages/` | a bloated repo, noisy PRs | `.gitignore` |
| A hand-written macro colliding with a package macro | dbt picks the wrong one, no warning | Use a company prefix |
| Installing `dbt_expectations` for a single test | hundreds of extra macros on every parse | Write a 5-line generic test yourself |
| A version range that's too wide (`>=1.0.0`) | a new major version breaks you | Always cap with `<2.0.0` |

## Verifying

```bash
dbt deps                                   # install exactly what the lock file says
dbt ls --resource-type test | wc -l        # the package's tests are recognised
cat package-lock.yml                       # the version actually in use
ls dbt_packages/                           # the downloaded code
```

## Related Topics

- [Macros, Jinja and packages](../reference/macros-jinja-packages.md) — the theory
- [Writing macros and using Jinja logic](macro-va-jinja.md) — when to write instead of install
- [Implementing tests in dbt](implementing-tests.md) — which layer package tests sit at
- [Intermediate exercises](../tutorials/bt-02-trung-binh.md) — exercise T4
