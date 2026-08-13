---
title: Macros, Jinja and packages
sidebar_position: 7
description: Jinja runs before the SQL leaves your machine — and the threshold for writing a macro.
tags: [dbt, jinja, macro, dbt-utils]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Macros, Jinja, packages — when SQL starts getting copy-pasted

> **Takeaway:** Jinja is a template engine that runs **before** the SQL leaves your machine. Everything in
> `{{ }}` and `{% %}` disappears in `target/compiled/` — the warehouse never
> sees it.


## The three Jinja syntaxes

| Syntax | Name | What it does | Present in the compiled SQL |
|---|---|---|---|
| `{{ ... }}` | expression | **Prints** a value | ✅ the result |
| `{% ... %}` | statement | Statements: `if`, `for`, `set`, `macro` | ❌ only its effect |
| `{# ... #}` | comment | A comment | ❌ disappears entirely |

The proof — this model:

```sql
{{ config(materialized='table', post_hook="...") }}
-- {% raw %}{# day la chu thich Jinja, KHONG xuat hien trong SQL compile #}{% endraw %}
select
    don_hang_id,
    {% raw %}{{ dinh_dang_tien('thanh_tien') }}{% endraw %} as tien_doc_duoc,
    '{% raw %}{{ target.name }}{% endraw %}' as chay_o_target,
    '{% raw %}{{ var("moi_truong", "chua_khai") }}{% endraw %}' as bien_var
from {% raw %}{{ ref('stg_don_hang') }}{% endraw %}
```

compiles into:

```sql
-- 
select
    don_hang_id,
    
    round(thanh_tien / 1000.0, 1) || 'k'
 as tien_doc_duoc,
    'dev' as chay_o_target,
    'chua_khai' as bien_var
from "scratch"."main"."stg_don_hang"
```

Note the bare `-- ` line left behind: the `{% raw %}{# #}{% endraw %}` comment is wiped out, leaving only SQL's `--`.

## Writing a macro

```sql
-- macros/tien_te.sql
{% raw %}{% macro dinh_dang_tien(cot) %}
    round({{ cot }} / 1000.0, 1) || 'k'
{% endmacro %}{% endraw %}
```

Call it with `{% raw %}{{ dinh_dang_tien('thanh_tien') }}{% endraw %}`. A macro **produces a SQL string**; it doesn't
run anything — it's template text, not a database function.

The consequence: a macro with a syntax error surfaces in the **compiled SQL**, not where you wrote the
macro. Always read `target/compiled/` when a macro looks wrong.

Your own generic tests are also macros, wrapped in `{% raw %}{% test %}{% endraw %}` — see
[Implementing tests](../skills/implementing-tests.md).

## The four commonly used variables

| Variable | What it is | An example real value |
|---|---|---|
| `{% raw %}{{ this }}{% endraw %}` | The model currently running | `"scratch"."main"."mart_incr"` |
| `{% raw %}{{ target.name }}{% endraw %}` | The target in use | `dev` |
| `{% raw %}{{ var('x', 'default') }}{% endraw %}` | A variable declared in `dbt_project.yml` or `--vars` | `chua_khai` |
| `{% raw %}{{ env_var('DBT_X') }}{% endraw %}` | An environment variable | — |

`{% raw %}{{ this }}{% endraw %}` is what makes `incremental` work — see
[Materializations](materializations.md).

Passing a `var` from the command line to override the default:

```bash
dbt compile --select mart_jinja --vars '{moi_truong: production}'
```

```sql
    'dev' as chay_o_target,
    'production' as bien_var
```

Use `var()` for things that change **per run** (a backfill's start date, a feature flag). Use
`env_var()` for things that **must not go into git** (passwords, tokens).

## `run_query()` — running SQL at compile time

Unlike everything above: it **asks the warehouse right at compile time** and then uses the result to generate SQL.

```sql
{% raw %}{% macro cot_cua(ten_bang) %}
    {% set truy_van %}
        select column_name from information_schema.columns
        where table_name = '{{ ten_bang }}' order by ordinal_position
    {% endset %}
    {% set kq = run_query(truy_van) %}
    {% if execute %}{{ log("Cot cua " ~ ten_bang ~ ": " ~ kq.columns[0].values() | join(", "), info=True) }}{% endif %}
{% endmacro %}{% endraw %}
```

```bash
dbt run-operation cot_cua --args '{ten_bang: stg_don_hang}'
```

```text
Cot cua stg_don_hang: don_hang_id, dong, ma_hang, so_luong, don_gia, thanh_tien, ngay
```

The `{% raw %}{% if execute %}{% endraw %}` is mandatory: dbt parses the project in **two passes**, and the first pass
isn't connected to the warehouse, so `run_query` returns `None`. Omitting it gives a baffling error at parse time.

Use it when you need to generate SQL from the **real column list** — a dynamic pivot, for example, or
selecting every column except a few.

## Hooks — running around a model

```sql
{{ config(post_hook="{% raw %}{{ log('post-hook chay sau khi tao ' ~ this, info=True) }}{% endraw %}") }}
```

```text
post-hook chay sau khi tao "scratch"."main"."mart_jinja"
1 of 1 OK created sql table model main.mart_jinja ................ [OK in 0.07s]
```

| Hook | Runs when | Used for |
|---|---|---|
| `pre-hook` | before the model | setting session variables, locking a table |
| `post-hook` | after the model | `GRANT`, `ANALYZE`, calling an API |
| `on-run-start` / `on-run-end` | at the start/end of the whole run | summary logging, notifications |

Granting permissions is the most common use: `post_hook="grant select on {% raw %}{{ this }}{% endraw %} to role_bi"`.

## `packages.yml` + `dbt deps`

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]
```

```bash
dbt deps
```

```text
Installing dbt-labs/dbt_utils
Installed from version 1.4.1
```

| Package | Used for |
|---|---|
| `dbt_utils` | Shared tests and macros — needed from day one |
| `dbt_expectations` | A Great Expectations-style test suite |
| `codegen` | Generating `schema.yml` from existing tables |

Pin the version with a range (`>=1.1.0, <2.0.0`); don't hard-pin one and don't leave it open.
`package-lock.yml` is generated after `dbt deps` — **commit it** so the whole team is on the same version.

`dbt_packages/` should be **gitignored** — it's a download directory, reproducible with `dbt deps`.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Reading a macro error in the macro file instead of `target/compiled/` | Looking in the wrong place; a macro only produces a string |
| Forgetting `{% raw %}{% if execute %}{% endraw %}` around `run_query` | A baffling error on the first parse pass |
| Using `var()` for a password | It goes into git; you must use `env_var()` |
| Writing a macro after copy-pasting only **twice** | Abstracting too early, harder to read than the duplication |
| Not committing `package-lock.yml` | A different package version on every machine |
| Committing `dbt_packages/` | A bloated repo and meaningless conflicts |

## Related Topics

- [dbt contents](index.md)
- [What dbt is](what-is-dbt.md) §2 — Jinja disappearing in `target/compiled/`
- [Testing and data quality](testing.md) §1 — writing your own generic tests
