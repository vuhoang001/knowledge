---
title: The structure of a dbt project
sidebar_position: 2
description: dbt_project.yml, profiles.yml, target/compiled — which directory holds what.
tags: [dbt, configuration, project-structure]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: beginner
verified_at:
updated: 2026-07-31
---
# The structure of a dbt project

> **Takeaway (needs verifying):** `dbt_project.yml` describes the *project*, `profiles.yml` describes
> *what to connect to*. They're split in two because the project goes into git and the connection details
> don't.


## Which directories are mandatory

| Directory / file | Mandatory | Holds what |
|---|---|---|
| `dbt_project.yml` | ✅ | The thing that defines "this is a dbt project" |
| `models/` | ✅ | The `.sql` files — the basic unit |
| `profiles.yml` | ✅ (outside the project) | The **connection** details. See the section below |
| `seeds/` | optional | Small CSVs loaded as tables |
| `tests/` | optional | Singular tests |
| `macros/` | optional | Macros and your own generic tests |
| `snapshots/` | optional | SCD Type 2 |
| `analyses/` | optional | SQL that compiles but does **not** create a table |
| `target/` | generated | Compilation output — **gitignore it** |
| `dbt_packages/` | generated | Packages downloaded by `dbt deps` — **gitignore it** |
| `logs/` | generated | Logs — **gitignore it** |

Keep the default names. Every piece of documentation and every answer online assumes this layout;
renaming them cuts you off from the community.

## `dbt_project.yml` — configuration by layer

```yaml
name: scratch
version: '1.0'
profile: scratch          # points at the profile name in profiles.yml

model-paths: ['models']
seed-paths: ['seeds']
macro-paths: ['macros']
snapshot-paths: ['snapshots']

clean-targets: ['target', 'dbt_packages']

models:
  scratch:                # the project name
    +materialized: view   # the default for EVERY model
    marts:                # the models/marts/ directory
      +materialized: table
```

Configuration **inherits by directory**: declared at `scratch:` it applies to everything, declared at
`marts:` it overrides for that directory alone. The `+` distinguishes a dbt config from a subdirectory name.

Precedence: `config()` in the model > subdirectory > project. There's evidence in
[Models and `ref()`](models-and-ref.md).

## `profiles.yml` — and why NOT to commit it

```yaml
scratch:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: scratch.duckdb
      schema: main
```

**This file holds connection details** — host, user, password, token. Committing it is a leak.

Two places to put it:

| Approach | When |
|---|---|
| `~/.dbt/profiles.yml` | The default. One per person, outside the repo |
| `--profiles-dir .` | A lab or CI — the file sits next to the project, and **must** be in `.gitignore` |

In production, declare sensitive values with `{{ env_var('DBT_PASSWORD') }}` so the file only
holds *variable names*, not values.

Check the configuration with `dbt debug`:

```text
Using profiles.yml file at ./profiles.yml
Using dbt_project.yml file at .../dbt_project.yml
adapter type: duckdb
adapter version: 1.10.1
  profiles.yml file [OK found and valid]
  dbt_project.yml file [OK found and valid]
Connection test: [OK connection ok]
```

Run `dbt debug` **before** suspecting anything else. It separates "wrong connection"
from "wrong SQL" — two kinds of error that often get confused.

## `target/` — how `compiled/` differs from `run/`

This is the most important distinction when debugging.

```text
target/
├── compiled/          SQL sau khi Jinja render — CHỈ câu SELECT
├── run/               SQL đó đã bọc DDL — thứ thật sự gửi đi
├── manifest.json      dbt BIẾT gì về project (756 KB)
├── catalog.json       warehouse THẬT SỰ có gì (sinh bởi `dbt docs generate`)
├── run_results.json   lần chạy vừa rồi: node nào, bao lâu, pass hay fail
└── partial_parse.msgpack   cache parse, để lần sau khởi động nhanh
```

The same model `stg_hang_hoa`:

```sql
-- target/compiled/... : only the SELECT
select * from "scratch"."main"."hang_hoa"
```

```sql
-- target/run/... : with the DDL wrapped around it
create view "scratch"."main"."stg_hang_hoa__dbt_tmp" as (
    select * from "scratch"."main"."hang_hoa"
  );
```

**Debugging SQL logic → read `compiled/`. Debugging a DDL or permission error → read `run/`.**

## The minimum `.gitignore`

```gitignore
target/
dbt_packages/
logs/
profiles.yml          # nếu để cạnh project
*.duckdb
```

The first three directories are **reproducible**: `dbt deps` + `dbt run` brings them back. Committing them
only bloats the repo and creates meaningless conflicts.

## Related Topics

- [dbt contents](index.md)
- [What dbt is](what-is-dbt.md) §2 — why `target/compiled/` is the most important place
