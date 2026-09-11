---
title: Setting up and configuring a dbt project
sidebar_position: 1
description: "From pip install to a green dbt debug — the four files that decide everything, and the three connection errors that eat most of a beginner's time."
tags: [dbt, setup, profiles, dbt-project-yml, duckdb]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Setting up and configuring a dbt project

> **Takeaway:** a working dbt project needs exactly **two** files: `dbt_project.yml` (what
> this project is) and `profiles.yml` (where to run the SQL). Every beginner's "it won't
> run" is in the second one.

## Learning goal

After this you must be able to **build a project yourself** from zero to `dbt debug`
reporting `All checks passed!`, and explain every line of both config files — no
copy-pasting.

## Step 1 — Install an adapter, not dbt-core alone

dbt Core doesn't know how to talk to any warehouse. The part that knows lives in the
**adapter**.

```bash
python -m venv .venv
source .venv/bin/activate
pip install dbt-core dbt-duckdb      # swap dbt-duckdb for dbt-snowflake / dbt-bigquery / dbt-postgres
```

Check immediately:

```bash
dbt --version
```

Real output on this knowledge base's lab:

```text
Core:
  - installed: 1.12.0
  - latest:    1.12.4 - Update available!

Plugins:
  - duckdb: 1.10.1 - Update available!
```

Those two numbers must be **compatible**. An adapter a few minor versions behind core
usually still runs; a whole major version apart breaks at parse time.

## Step 2 — `dbt init` or build it by hand?

`dbt init <name>` scaffolds the project and prompts for connection details. Convenient, but
it hides exactly the part you need to understand. The first time, create the four
directories by hand:

```bash
mkdir -p dbt_lab/{models,seeds,tests,macros,snapshots}
cd dbt_lab
```

## Step 3 — `dbt_project.yml`: what this project is

```yaml
name: dbt_lab                 # the project name — the key used in the models: block below
version: '1.0'
profile: dbt_lab              # POINTS AT the block of the same name in profiles.yml

model-paths: ['models']
seed-paths: ['seeds']
test-paths: ['tests']
snapshot-paths: ['snapshots']
macro-paths: ['macros']

clean-targets: ['target', 'dbt_packages']   # what `dbt clean` is allowed to delete

models:
  dbt_lab:                    # must match `name:` above, NOT the models/ directory name
    +materialized: view       # default for the whole project
    staging:
      +schema: staging        # applies to every model under models/staging/
    marts:
      +schema: marts
      +materialized: table
```

Two places people get wrong:

- **`profile:` points into `profiles.yml`, not at the project name.** Using the same name
  is a habit, not a requirement.
- **The key under `models:` is the project's `name:`**, not the `models/` directory name.
  Mistype it and the config silently doesn't apply — no error is raised.

## Step 4 — `profiles.yml`: where to run the SQL

dbt looks for this at `~/.dbt/profiles.yml`. Keeping it inside the project also works, in
which case every command needs `--profiles-dir .`.

```yaml
dbt_lab:                      # matches `profile:` in dbt_project.yml
  target: dev                 # the default target when --target isn't passed
  outputs:
    dev:
      type: duckdb
      path: lab.duckdb
      threads: 4
```

A Snowflake version for comparison — note there's **no password in the file**:

```yaml
cong_ty:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      password: "{{ env_var('SNOWFLAKE_PASSWORD') }}"
      role: TRANSFORMER
      warehouse: WH_DBT_DEV
      database: ANALYTICS_DEV
      schema: dbt_hoang        # a personal schema — one per developer
      threads: 8
    prod:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER_PROD') }}"
      password: "{{ env_var('SNOWFLAKE_PASSWORD_PROD') }}"
      role: TRANSFORMER_PROD
      warehouse: WH_DBT_PROD
      database: ANALYTICS
      schema: analytics
      threads: 16
```

`profiles.yml` **is the one dbt file rendered through Jinja before parsing** — which is why
`env_var()` works here. You can invent environment variable *names*, but **never the
values**: `account`, `warehouse`, `role`, `database` must come from whoever administers the
warehouse or from the output of a real command. This is precisely where an afternoon was
lost in the [catalog-name case study](../case-studies/ai-sinh-sai-ten-catalog-trino.md).

## Step 5 — `dbt debug`, and only believe it when it's green

```bash
dbt debug --profiles-dir .
```

Real output:

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

Three lines deserve a careful read: `database`, `schema`, `Connection test`. The first two
are **where your models will land** — misread them and you'll spend the afternoon looking
for a table in the wrong database.

## Step 6 — `.gitignore`

```gitignore
target/
dbt_packages/
logs/
*.duckdb
.venv/
```

`target/` holds compiled SQL and `manifest.json` — regenerable, don't commit it. Commit it
and every PR shows 400 changed files.

## Common errors

| Error | Typical message | The real cause |
|---|---|---|
| `Could not find profile named 'x'` | dbt can't find the block in `profiles.yml` | `profile:` in `dbt_project.yml` differs from the block name in `profiles.yml`, or you forgot `--profiles-dir .` |
| `Credentials in profile "x", target "dev" invalid` | a required adapter field is missing or wrong | Missing `account`/`warehouse`; or `env_var()` was never exported |
| The model runs but the table can't be found | no error at all | You misread `database`/`schema` in `dbt debug` |
| Config under `models:` has no effect | silence | The child key doesn't match the project's `name:` |
| `Runtime Error ... database is locked` | DuckDB | Another process (a `python` still holding `lab.duckdb`) has the file. Close it |
| `dbt: command not found` in a fresh terminal | — | You forgot `source .venv/bin/activate` |

> **The most dangerous silent trap** is row four: mistype the key under `models:` and dbt
> **says nothing** — every model just falls back to the defaults. Check it with `dbt ls` and
> look at the schema; don't check it by eye.

## Confirming you're done

```bash
dbt debug --profiles-dir .     # All checks passed!
dbt ls --profiles-dir .        # lists resources (even with no models yet)
dbt parse --profiles-dir .     # parses cleanly, writes target/manifest.json
```

Three green commands means configuration is finished. From here on, every error is an error
in your SQL, not in your environment — and separating those two categories is half of all
debugging.

## Related Topics

- [The structure of a dbt project](../reference/project-structure.md) — which directory holds what
- [Writing your first model with `ref()`](model-dau-tien-voi-ref.md) — the next step
- [dbt Core and dbt Cloud](../reference/dbt-core-vs-cloud.md) — Cloud handles step 4 for you
- [Basic exercises](../tutorials/bt-01-co-ban.md) — exercise 1 walks this exact process
