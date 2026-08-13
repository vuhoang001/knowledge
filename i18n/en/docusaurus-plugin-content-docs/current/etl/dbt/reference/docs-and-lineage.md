---
title: dbt docs and lineage
sidebar_position: 8
description: The lineage graph is exactly as accurate as your discipline with ref().
tags: [dbt, docs, lineage, exposures]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Docs and lineage — impact analysis before you change anything

> **Takeaway:** `dbt docs` isn't a decorative feature. The lineage graph is **the same
> DAG** dbt uses to order the run — so it's exactly as accurate as your discipline with
> `ref()`. Write table names directly and the graph lies.


## How `manifest.json` differs from `catalog.json`

`dbt docs generate` produces both. They answer two entirely different questions:

| | `manifest.json` | `catalog.json` |
|---|---|---|
| Answers | what dbt **knows** about your project | what the warehouse **actually has** |
| Produced by | every dbt command | only `dbt docs generate` |
| Source | reading the `.sql` and `.yml` files | querying `information_schema` |
| Real size | 756 KB | much smaller |

Measured on a 4-model project:

```text
manifest.json  nodes: 16 | sources: 1 | macros: 605
catalog.json   nodes: 7
```

`manifest` has 16 nodes because it counts tests, seeds, snapshots and unit tests too. The 605 macros include
dbt's own macros and `dbt_utils`'s.

Inside one node of `manifest`:

```text
depends_on: ['seed.scratch.don_hang_chi_tiet']
description: Một dòng = **một dòng hàng trong một đơn**. Grain là cặp `(...)`
```

Inside the same node in `catalog`:

```text
cot that trong warehouse: don_hang_id, dong, ma_hang, so_luong, don_gia, thanh_tien, ngay
kieu cua thanh_tien: INTEGER
```

**`manifest` is intent, `catalog` is reality.** A mismatch means the model changed and hasn't been
re-run — and `dbt docs` shows both side by side, so you spot it immediately.

## Column descriptions → showing up in docs

```yaml
models:
  - name: stg_don_hang
    columns:
      - name: don_hang_id
        description: "Mã đơn hàng. KHÔNG unique — một đơn có nhiều dòng."
```

That description goes into `manifest.json` and then onto the docs page. It's the **only** place that answers
*"what does this column mean"* without having to ask whoever wrote it.

### `{% raw %}{% docs %}{% endraw %}` — long descriptions, reused in several places

Declare it once in `models/docs/docs.md`:

```markdown
{% raw %}{% docs mo_ta_grain %}
Một dòng = **một dòng hàng trong một đơn**. Grain là cặp `(don_hang_id, dong)`,
không phải `don_hang_id`.
{% enddocs %}{% endraw %}
```

Call it anywhere:

```yaml
    description: "{% raw %}{{ doc('mo_ta_grain') }}{% endraw %}"
```

Check `manifest.json` after `dbt docs generate` — it's been rendered:

```text
description da render doc(): Một dòng = **một dòng hàng trong một đơn**. Grain là cặp `(d
```

Use it when the same definition appears in several models. Change one place and everywhere follows —
exactly the one-piece-of-knowledge-in-one-place principle.

## `dbt docs serve` — and hosting it for the team

```bash
dbt docs generate    # sinh manifest.json + catalog.json + index.html
dbt docs serve       # mở web server cục bộ, mặc định cổng 8080
```

`dbt docs serve` only runs on your machine. To let the whole team see it, note that **the page is static** — push
`target/index.html` plus the two JSON files to any static host: GitHub Pages, S3, nginx.
Usually wired into CI: regenerate and deploy on every merge into `main`.

## `state:modified` — CI running only the changed part

This is the most pragmatic reason to care about `manifest.json`.

Save the previous run's manifest, change **one** model, then compare:

```bash
cp target/manifest.json state/
# sửa models/staging/stg_don_hang.sql
dbt ls --select state:modified+ --state state --resource-type model
```

```text
scratch.marts.mart_doanh_thu_ngay
scratch.marts.mart_jinja
scratch.staging.stg_don_hang
```

Compared with running everything:

```text
scratch.marts.mart_doanh_thu_ngay
scratch.marts.mart_jinja
scratch.staging.stg_don_hang
scratch.staging.stg_hang_hoa
```

**3 instead of 4.** `stg_hang_hoa` didn't change and isn't downstream of the changed model, so it's
skipped.

On a 4-model project the saving is negligible. On a 400-model project, changing one staging model means
`state:modified+` runs a few dozen instead of four hundred — the difference between a 2-minute CI and a
40-minute one.

The precondition: you need the **previous run's** `manifest.json` as the baseline. Usually stored as a
CI artifact, or taken from the most recent production deploy.

## `exposures` — declaring who reads your models

dbt's DAG stops at the last model. But in reality there are dashboards, APIs and notebooks reading that
table — and dbt **knows nothing** about them.

```yaml
exposures:
  - name: dashboard_doanh_thu
    type: dashboard
    maturity: high
    url: https://bi.congty.vn/dashboards/12
    owner: {name: Nhóm BI, email: bi@congty.vn}
    depends_on:
      - ref('mart_doanh_thu_ngay')
```

The real value: `dbt ls --select +exposure:dashboard_doanh_thu` tells you **everything that dashboard
depends on**. Before dropping a column, that command answers *"what dashboard does dropping this
break"* — something you'd otherwise only learn once somebody complains.

## Why this matters more than it looks

`dbt docs` looks like "documentation for prettiness". In fact these three things are **operational tools**:

| Thing | The question it answers |
|---|---|
| The lineage graph | "What breaks if I change this column" |
| `state:modified` | "What does CI need to re-run" |
| `exposures` | "Who depends on this table outside dbt" |

All three are **impact-analysis** questions, and without them the answer is guesswork.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Not writing a `description` | Nobody knows what the column means, including you six months later |
| Only running `dbt docs serve` locally | Only you can see it; you have to deploy the static page |
| Not saving a `manifest.json` baseline | You can't use `state:modified`, and CI runs everything |
| Ignoring `exposures` | You only learn you broke a dashboard after dropping the column |
| Copying the same description into several models | Fix one place and the others drift; use `{% raw %}{% docs %}{% endraw %}` |

## Related Topics

- [dbt contents](index.md)
- [Models and `ref()`](models-and-ref.md) — where the DAG comes from
- [Exercises](../tutorials/dbt-lab-duckdb.md) exercise 4
