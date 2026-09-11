---
title: dbt quick reference — CLI, Jinja, YAML, materializations
sidebar_position: 1
description: "The table you check while typing: selectors, YAML syntax, the Jinja bits you keep forgetting, and how to pick a materialization from four questions."
tags: [dbt, cheatsheet, cli, jinja, yaml, selector, materialization]
domain: data-engineering
category: technology
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-11
---

# dbt quick reference

> This page is for **looking things up while working**, not for learning them the first
> time. If the concept isn't clear yet, read [`reference/`](../reference/index.md) first.
>
> Every command below runs on **dbt-core 1.12.0**. On this knowledge base's lab, add
> `--profiles-dir .` to all of them.

## 1. CLI commands

### Commands that really run things

| Command | What it does | Note |
|---|---|---|
| `dbt build` | seed → snapshot → run → test, **interleaved along the DAG** | **Use this one in production** |
| `dbt run` | builds models only | |
| `dbt test` | runs tests only | |
| `dbt seed` | loads CSVs from `seeds/` into tables | Small lookup tables only |
| `dbt snapshot` | records SCD2 history | **Run before `run`** |
| `dbt source freshness` | checks source freshness | Production job only |
| `dbt compile` | renders Jinja, **doesn't** run | Read `target/compiled/` |
| `dbt parse` | parses only, writes `manifest.json` | Cheapest — put it first in CI |

`dbt build` differs from `dbt run && dbt test` in that: if model A fails its test, everything
**downstream of A is skipped**, instead of building all 400 models on broken data before you
find out.

### Supporting commands

| Command | What it does |
|---|---|
| `dbt debug` | checks config plus connection |
| `dbt deps` | installs the packages in `packages.yml` |
| `dbt deps --upgrade` | updates `package-lock.yml` — a **deliberate** act |
| `dbt ls` | lists resources by selector |
| `dbt docs generate` | produces `index.html` + `catalog.json` |
| `dbt docs serve` | opens the docs site on `localhost:8080` |
| `dbt clean` | deletes `target/`, `dbt_packages/` |
| `dbt run-operation <macro>` | runs a macro standalone |
| `dbt retry` | re-runs exactly what failed last time |

### Flags worth knowing

| Flag | Effect |
|---|---|
| `-s` / `--select` | pick resources (see §2) |
| `--exclude` | exclude them |
| `-t` / `--target` | pick a target from `profiles.yml` |
| `--full-refresh` | rebuild an incremental model from scratch |
| `--fail-fast` | stop at the first failure |
| `--store-failures` | save failing rows into `<schema>_dbt_test__audit` |
| `--vars '{key: value}'` | pass variables to `{{ var() }}` |
| `--threads N` | override the thread count |
| `--defer --state <dir>` | a `ref()` to an unbuilt model resolves to production |
| `--empty` | build the structure with 0 rows — a very fast column check |

## 2. Selectors — choosing what to run

| Syntax | Selects |
|---|---|
| `stg_don_hang` | exactly that model |
| `stg_don_hang+` | that model **and everything downstream** |
| `+mart_doanh_thu` | that model **and everything upstream** |
| `+mart_doanh_thu+` | both directions |
| `2+mart_doanh_thu` | upstream, **limited to 2 hops** |
| `@stg_don_hang` | downstream models plus all of their dependencies |
| `path:models/marts` | everything in a directory |
| `tag:tai_chinh` | by tag |
| `source:erp+` | every model downstream of a source |
| `config.materialized:incremental` | by config |
| `resource_type:snapshot` | by resource type |
| `state:modified+` | changed versus `--state`, plus downstream |
| `state:new` | newly added resources |
| `result:error+` | failed last time, plus downstream |

Combining: **a space means OR**, a comma means **AND**.

```bash
dbt build -s tag:tai_chinh tag:hang_ngay          # HOẶC
dbt build -s tag:tai_chinh,config.materialized:table   # VÀ
dbt build -s state:modified+ --exclude resource_type:snapshot
```

## 3. Jinja — the parts you keep forgetting

### Built-in variables

| Variable | What it is |
|---|---|
| `{{ this }}` | the model being built (used in incrementals) |
| `{{ target.name }}` | `dev` / `prod` |
| `{{ target.schema }}` · `{{ target.database }}` | where you're writing |
| `{{ run_started_at }}` | when this invocation began |
| `{{ invocation_id }}` | the id of this run |
| `{{ var('x', default) }}` | a variable from `dbt_project.yml` / `--vars` |
| `{{ env_var('X') }}` | an environment variable — **only in `profiles.yml`** |
| `{{ is_incremental() }}` | true during an incremental run |
| `{{ execute }}` | false on the first parse pass — the guard for `run_query` |

### Syntax

| Written | Meaning |
|---|---|
| `{{ ... }}` | print text |
| `{% ... %}` | a statement (if/for/set/macro) |
| `{# ... #}` | a comment, **never** reaches the SQL |
| `{%- ... -%}` | swallow whitespace on the side carrying the `-` |
| `~` | string concatenation (not `+`) |
| `loop.index` · `loop.last` | inside a `{% for %}` |
| `| lower` · `| replace('a','b')` · `| join(',')` | filters |

### Patterns worth memorising

```sql
-- A loop generating columns
{%- for n in danh_sach %}
    sum(case when nhom = '{{ n }}' then tien else 0 end) as nhom_{{ loop.index }}
    {%- if not loop.last %},{% endif %}
{%- endfor %}

-- Limiting data in dev
{% if target.name == 'dev' %} where ngay >= current_date - 7 {% endif %}

-- Fetching a value list at compile time
{%- set nhom = dbt_utils.get_column_values(ref('hang_hoa'), 'nhom') -%}

-- Running a query at compile time — ALWAYS with the guard
{% if execute %}{% set kq = run_query('select 1') %}{% endif %}
```

### `dbt_utils` macros worth remembering

| Macro | For what |
|---|---|
| `dbt_utils.generate_surrogate_key([...])` | a stable surrogate key (md5, with a `coalesce`) |
| `dbt_utils.star(from=ref('x'), except=[...])` | select everything except a few columns |
| `dbt_utils.get_column_values(ref('x'), 'cot')` | a value list at compile time |
| `dbt_utils.date_spine(...)` | generate a date series for `dim_date` |
| `dbt_utils.union_relations([...])` | union tables with differing columns |
| `dbt_utils.pivot(...)` / `unpivot(...)` | rotate a table |

## 4. YAML templates

### Model + tests + docs

```yaml
version: 2

models:
  - name: mart_doanh_thu_ngay
    description: "Doanh thu và số đơn theo ngày đặt. Grain: một dòng một ngày."
    config:
      materialized: table
      tags: ['hang_ngay', 'tai_chinh']
      contract: {enforced: true}
    meta:
      owner: "data-team@cong-ty.vn"
    columns:
      - name: ngay
        description: "Ngày đặt đơn."
        data_type: date
        constraints: [{type: not_null}]
        tests: [unique, not_null]
      - name: doanh_thu
        description: "Tổng thành tiền, chưa gồm phí ship."
        tests:
          - khong_am                      # generic test tự viết
    tests:                                # test cấp bảng
      - dbt_utils.unique_combination_of_columns:
          arguments:
            combination_of_columns: [ngay]
```

> **dbt 1.12:** generic test parameters go under an `arguments:` key. The old form (parameters
> directly under the test name) still runs but prints
> `MissingArgumentsPropertyInGenericTestDeprecation`.

### The four built-in generic tests

```yaml
columns:
  - name: don_hang_id
    tests:
      - unique
      - not_null
      - accepted_values:
          arguments:
            values: ['moi', 'dang_giao', 'hoan_thanh']
      - relationships:
          arguments:
            to: ref('stg_don_hang')
            field: don_hang_id
```

Adjusting severity and thresholds:

```yaml
      - not_null:
          config:
            severity: warn        # error | warn
            error_if: ">100"
            warn_if:  ">0"
            where: "ngay >= current_date - 30"   # chỉ kiểm dữ liệu gần đây
```

### Source

```yaml
sources:
  - name: erp
    database: RAW
    schema: erp_prod
    tables:
      - name: orders
        identifier: ORDERS_V2          # tên thật nếu khác `name`
        loaded_at_field: cast(_loaded_at as timestamp)
        freshness:
          warn_after:  {count: 1,  period: hour}
          error_after: {count: 26, period: hour}
```

### Snapshot (YAML syntax, dbt 1.9+)

```yaml
snapshots:
  - name: snap_khach_hang
    relation: source('erp', 'customers')
    config:
      unique_key: khach_id
      strategy: check                  # hoặc timestamp + updated_at: cot
      check_cols: [khu_vuc, hang]
```

### Unit test

```yaml
unit_tests:
  - name: gop_dung_ngay
    model: mart_doanh_thu_ngay
    given:
      - input: ref('stg_don_hang')
        rows: [{don_hang_id: 'D1', ngay_dat: '2026-01-01'}]
      - input: ref('stg_don_hang_chi_tiet')
        rows: [{don_hang_id: 'D1', dong: 1, thanh_tien: 100}]
    expect:
      rows: [{ngay: '2026-01-01', so_don: 1, doanh_thu: 100}]
```

### `dbt_project.yml` — config per directory

```yaml
models:
  ten_project:                     # PHẢI khớp `name:` của project
    +materialized: view
    +on_schema_change: append_new_columns
    staging:
      +schema: staging
    marts:
      +schema: marts
      +materialized: table
      +tags: ['marts']
```

Precedence when the same config is declared in several places:

```text i18n-prose
config() in the model  >  schema.yml  >  dbt_project.yml
```

## 5. Materializations — which one to pick

| | `view` | `table` | `incremental` | `ephemeral` |
|---|---|---|---|---|
| What dbt creates | `CREATE VIEW` | `CREATE TABLE AS` | a table first, then merge/insert | **nothing** — inlined as a CTE |
| Build time | ~0 | proportional to size | proportional to the new part | 0 |
| Query time | recomputed every time | fast | fast | computed inside the parent model |
| Storage | none | yes | yes | none |
| Complexity | low | low | **high** | low |
| Directly queryable | yes | yes | yes | **no** |
| Suits | staging | small/medium marts | large facts | intermediate steps |

Four questions **before** typing `materialized='incremental'`:

1. Which column tells you "this row is new"? Is it trustworthy?
2. Does the source edit the past? How late? → the lookback window width
3. What is the natural key of the grain? → `unique_key`
4. Does an interrupted re-run duplicate anything?

Answer all four and go ahead. Otherwise use `table` — slow but correct.

### Incremental config

```sql
{{ config(
    materialized='incremental',
    incremental_strategy='merge',        -- append | merge | delete+insert | insert_overwrite
    unique_key=['don_hang_id', 'dong'],
    on_schema_change='append_new_columns'
) }}

{% if is_incremental() %}
where ngay >= (select coalesce(max(ngay), date '1900-01-01') - interval 7 day from {{ this }})
{% endif %}
```

| `on_schema_change` | A new column in the model is… |
|---|---|
| `ignore` (**default**) | dropped **silently** |
| `append_new_columns` | added, old rows `null` |
| `sync_all_columns` | added **and removed** to match the model |
| `fail` | stops with an error |

## 6. Naming conventions

| Layer | Prefix | One model = | Materialization |
|---|---|---|---|
| staging | `stg_` | **exactly one** source table | `view` |
| intermediate | `int_` | one named transformation step | `ephemeral` |
| marts | `dim_` | one entity | `table` |
| marts | `fct_` | one event, **native grain preserved** | `incremental` |
| marts | `mart_` | one report, **already `group by`-ed** | `table` |

Three rules, all three greppable:

```bash
grep -rn --include='*.sql' -iE '\bjoin\b' models/staging/          # staging không join
grep -rn --include='*.sql' 'source(' models/ | grep -v '^models/staging/'   # chỉ staging gọi source()
grep -rn --include='*.sql' 'group by' models/marts/fct_*.sql       # fct_ không được gộp
```

| Other conventions | Rule |
|---|---|
| File name = model name | `stg_don_hang.sql` → `ref('stg_don_hang')` |
| Model names | **global** — must not collide across directories |
| Business key | `<entity>_id` |
| Surrogate key | `<entity>_sk` |
| Boolean columns | `la_*` / `co_*` |
| Date columns | `ngay_*`; timestamps `*_luc` |
| Technical columns | prefixed `_`: `_nap_luc`, `_batch_id` |
| Numbering in file names | **no** — dbt orders by the DAG |

## 7. The `target/` directory

| File | What it is | Use when |
|---|---|---|
| `compiled/` | SQL after Jinja is rendered | Debugging logic — paste straight into the warehouse |
| `run/` | SQL already wrapped in DDL | Seeing what object dbt creates |
| `manifest.json` | **intent** — everything you declared | `state:modified`, metadata queries |
| `catalog.json` | **reality** — real columns/types in the warehouse | Reconciling declarations against reality |
| `run_results.json` | per-node timing and status | Finding slow models |
| `index.html` | the static docs site | Host it anywhere |

```bash
# 5 node chậm nhất
python -c "
import json;r=json.load(open('target/run_results.json'))
[print(f\"{t['execution_time']:8.3f}s  {t['unique_id']}\")
 for t in sorted(r['results'],key=lambda x:-x['execution_time'])[:5]]"
```

## 8. Seven silent failures — no error, just wrong

| Failure | Consequence | Detected by |
|---|---|---|
| Hard-coding a table name instead of `ref()` | the DAG loses an edge, lineage lies | `dbt ls --select +model` is missing a node |
| The key under `models:` not matching the project `name:` | config never applies | `dbt ls`, inspect the schema |
| `on_schema_change: ignore` | new columns vanish | `describe <table>` |
| An incremental not handling late edits | **numbers skew**, rows still match | a singular test reconciling totals |
| A join missing `coalesce(dbt_valid_to, ...)` | current rows disappear | as-was returns less than as-is |
| `unique` on a table with a composite grain | the test is wrong, not the data | `unique_combination_of_columns` |
| No `--state` in CI | CI runs the whole project | CI node count ≈ total model count |

## Related Topics

- [dbt — the concept map](../index.md)
- [dbt reference](../reference/index.md) — the part that explains why
- [dbt skills](../skills/index.md) — step-by-step guides
- [Exercises](../tutorials/index.md) — really run, with the answers
