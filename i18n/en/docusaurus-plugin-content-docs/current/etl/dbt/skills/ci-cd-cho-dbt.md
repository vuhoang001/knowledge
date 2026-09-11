---
title: Setting up CI/CD for a dbt project
sidebar_position: 10
description: "A CI that rebuilds all 400 models on every PR is a CI nobody uses. state:modified+ is what turns 40 minutes into 2 — and why you must keep production's manifest."
tags: [dbt, ci-cd, github-actions, state-modified, slim-ci, defer]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-09-11
---

# Setting up CI/CD for a dbt project

> **Takeaway:** CI for dbt has exactly one core idea — **compare the current project against
> production's `manifest.json`, then run only what changed plus what sits downstream of it**.
> Everything else is YAML detail.

## Learning goal

Build a pipeline that blocks merges when a model breaks, finishes in minutes rather than
tens of minutes, and never touches production data.

## Step 1 — What dbt CI has to block

| Kind of failure | Caught by | Cost |
|---|---|---|
| Broken SQL syntax, a typo in `ref()` | `dbt parse` | seconds |
| A model that won't build | `dbt run` against a CI schema | minutes |
| Data violating a rule | `dbt test` | minutes |
| Breaking layer/naming conventions | `grep` in CI | seconds |
| Missing descriptions in marts | `dbt ls --output json` | seconds |
| A change that breaks the column contract | `contract: {enforced: true}` | seconds |

Order them by cost and **put the cheap ones first** — failing early costs no warehouse slot.

## Step 2 — `state:modified`, and why it's worth so much

dbt compares the current `manifest.json` against an older one to learn **what changed**.

```bash
mkdir -p prod_manifest && cp target/manifest.json prod_manifest/   # production's manifest
# ... edit models/staging/stg_don_hang.sql ...
dbt ls --select state:modified+ --state ./prod_manifest
```

Real output after editing **exactly one** staging model:

```text
Found 15 seeds, 6 models, 1 snapshot, 9 data tests, 1 source, 604 macros, 1 unit test
dbt_lab.marts.mart_doanh_thu_ngay
dbt_lab.staging.stg_don_hang
dbt_lab.staging.accepted_values_stg_don_hang_trang_thai__moi__dang_giao__hoan_thanh
dbt_lab.marts.khong_am_mart_doanh_thu_ngay_doanh_thu
dbt_lab.marts.not_null_mart_doanh_thu_ngay_ngay
dbt_lab.staging.not_null_stg_don_hang_don_hang_id
dbt_lab.staging.relationships_stg_don_hang_chi_tiet_don_hang_id__don_hang_id__ref_stg_don_hang_
dbt_lab.tong_mart_khop_staging
dbt_lab.marts.unique_mart_doanh_thu_ngay_ngay
dbt_lab.staging.unique_stg_don_hang_don_hang_id
unit_test:dbt_lab.mart_doanh_thu_ngay_gop_dung_ngay
```

Edit one model → dbt works out **the models downstream of it and every related test**. On a
400-model project, `state:modified+` typically selects a few dozen instead of everything.
That's the difference between a 2-minute CI and a 40-minute one — and a 40-minute CI is a CI
nobody waits for.

The accompanying selector syntax:

| Selector | Selects |
|---|---|
| `state:modified` | only the changed nodes |
| `state:modified+` | the changed nodes **and everything downstream** |
| `+state:modified` | the changed nodes and everything upstream |
| `state:new` | newly added nodes |
| `--defer --state ./prod_manifest` | models not built in CI are **read from production** |

`--defer` is the second half: it lets you build a model in the middle of the DAG without
rebuilding everything upstream — a `ref()` to a model absent from the CI schema resolves to
production instead.

## Step 3 — A complete GitHub Actions workflow

```yaml
# .github/workflows/dbt-ci.yml
name: dbt CI
on:
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    env:
      DBT_PROFILES_DIR: ./ci
      SNOWFLAKE_ACCOUNT:  ${{ secrets.SNOWFLAKE_ACCOUNT }}
      SNOWFLAKE_USER:     ${{ secrets.SNOWFLAKE_CI_USER }}
      SNOWFLAKE_PASSWORD: ${{ secrets.SNOWFLAKE_CI_PASSWORD }}
      # One schema per PR — parallel runs don't step on each other
      DBT_CI_SCHEMA: ci_pr_${{ github.event.pull_request.number }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.11'}

      - name: Cài dbt
        run: pip install dbt-core==1.12.0 dbt-snowflake==1.10.0

      - name: Cài package
        run: dbt deps

      # --- Tier 1: cheap, runs first, fails early ---
      - name: Parse
        run: dbt parse

      - name: Quy uoc layer
        run: |
          ! grep -rn --include='*.sql' -iE '\bjoin\b' models/staging/
          ! grep -rn --include='*.sql' 'source(' models/ | grep -v '^models/staging/'

      # --- Tier 2: needs the warehouse ---
      - name: Lay manifest cua production
        run: |
          mkdir -p prod_manifest
          aws s3 cp s3://cty-dbt-artifacts/prod/manifest.json prod_manifest/manifest.json

      - name: Build phan da doi
        run: |
          dbt build --select state:modified+ \
                    --defer --state ./prod_manifest \
                    --target ci

      - name: Don schema cua PR
        if: always()
        run: dbt run-operation drop_schema --args "{schema: $DBT_CI_SCHEMA}"
```

Four design decisions in that file:

1. **One schema per PR** (`ci_pr_123`) — two concurrent PRs can't overwrite each other.
2. **Cleanup in the last step with `if: always()`** — a failing CI still has to clean up, or
   the warehouse fills with junk schemas within months.
3. **Production's `manifest.json` pulled from S3** — it is an artifact of the production job,
   not something that lives in git.
4. **Pinned dbt versions** (`dbt-core==1.12.0`) — CI must not upgrade itself.

## Step 4 — The production job

```yaml
# .github/workflows/dbt-prod.yml
name: dbt production
on:
  schedule: [{cron: '0 23 * * *'}]     # 23:00 UTC = 06:00 GMT+7
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install dbt-core==1.12.0 dbt-snowflake==1.10.0
      - run: dbt deps

      - name: Kiem do tuoi cua nguon
        run: dbt source freshness --target prod

      - name: Ghi lich su truoc
        run: dbt snapshot --target prod

      - name: Build
        run: dbt build --target prod --fail-fast

      - name: Sinh docs va day manifest len S3
        if: always()
        run: |
          dbt docs generate --target prod
          aws s3 cp target/manifest.json s3://cty-dbt-artifacts/prod/manifest.json
          aws s3 sync target/ s3://cty-dbt-docs/ --exclude '*' \
            --include 'index.html' --include 'manifest.json' --include 'catalog.json'
```

The order of the three middle commands is **mandatory and cannot be swapped**:

```text
source freshness  →  snapshot  →  build
```

`snapshot` must run **before** `build`, because mart models read the snapshot table. Swap
them and today's report uses yesterday's history — off by one beat, with no error raised.

## Step 5 — `dbt build`, not `run` then `test`

```bash
dbt run && dbt test      # WRONG in production
dbt build                # RIGHT
```

The difference: `dbt build` **interleaves along the DAG** — model A finishes, A's tests run
immediately; A fails its test and everything downstream is **skipped**. With `run && test`,
all 400 models have already been built (on broken data) before you learn A was wrong.

Add `--fail-fast` to stop at the first failure instead of continuing down independent
branches.

## Step 6 — Four numbers worth tracking

| Metric | Where from | Worrying when |
|---|---|---|
| CI duration | the GitHub Actions log | > 10 minutes and people start merging carelessly |
| Models run per CI | `dbt ls --select state:modified+ \| wc -l` | ≈ the total model count → `--state` is broken |
| Tests failing in production | `run_results.json` | any |
| Slowest model | `run_results.json`, `execution_time` | the top 5 exceed 50% of the total |

```bash
python - <<'PY'
import json
r = json.load(open('target/run_results.json'))
top = sorted(r['results'], key=lambda x: -x['execution_time'])[:5]
for t in top:
    print(f"{t['execution_time']:8.1f}s  {t['unique_id']}")
PY
```

## Common errors

| Error | Consequence | Fix |
|---|---|---|
| Not using `--state` | CI runs the whole project, 40 minutes | Store production's manifest as an artifact |
| CI writing into the production schema | real data corrupted | A separate `ci` target with its own database/schema |
| Every PR sharing one CI schema | two PRs collide | Schema named after the PR number |
| Never cleaning up CI schemas | the warehouse fills with junk | A cleanup step with `if: always()` |
| `dbt run && dbt test` | everything builds before you learn it's wrong | `dbt build` |
| Forgetting `dbt deps` | `'dbt_utils' is undefined` | Add a package install step |
| Not pinning the dbt version | CI changes behaviour behind your back | `dbt-core==1.12.0` |
| `--full-refresh` in CI or the nightly job | **snapshot history lost** | `--exclude resource_type:snapshot` |
| Secrets committed inside `profiles.yml` | leaked credentials | `env_var()` plus CI secrets |
| `dbt source freshness` running in dev CI | CI red because the sample data is old | Production job only |

## Related Topics

- [dbt docs and lineage](../reference/docs-and-lineage.md) — `manifest.json` is intent, `catalog.json` is reality
- [dbt Core and dbt Cloud](../reference/dbt-core-vs-cloud.md) — Cloud sells this CI piece ready-made
- [Snapshots — capturing change history](snapshot-scd2.md) — why snapshots must run first
- [Managing dependencies with packages](quan-ly-package.md) — pinning versions
- [Advanced exercises](../tutorials/bt-03-nang-cao.md) — exercise N5
