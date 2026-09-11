---
title: Writing documentation for a model
sidebar_position: 9
description: "A description in YAML isn't decoration — it's the only place that records grain, units and business rules, none of which lineage can infer."
tags: [dbt, documentation, schema-yml, docs-block, meta, dbt-docs]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Writing documentation for a model

> **Takeaway:** `dbt docs` generates **structure** on its own (which columns, what types,
> what depends on what) — it can never generate **meaning** (what one row is, whether this
> number is net of VAT, why that filter is there). Documenting means writing exactly the part
> a machine can't guess. Restating what the machine already knows is waste, and it will drift.

## Learning goal

Write a `schema.yml` that someone else can read six months from now and use the table
correctly, generate the `dbt docs` site, and know where "documented enough" stops.

## Step 1 — Three mandatory sentences per model

Every model, no exceptions, must answer three questions in its `description`:

1. **Grain** — what does one row of this table represent?
2. **Source and scope** — where does the data come from, what has been filtered out?
3. **Warning** — what is easy to get wrong about this table?

```yaml
# models/marts/schema.yml
version: 2

models:
  - name: mart_doanh_thu_ngay
    description: "Doanh thu và số đơn theo ngày đặt. Grain: một dòng một ngày."
    columns:
      - name: ngay
        description: "Ngày đặt đơn."
        tests: [unique, not_null]
      - name: doanh_thu
        description: "Tổng thành tiền của các dòng hàng trong ngày, chưa gồm phí ship."
        tests:
          - khong_am
```

That "excluding shipping fees" clause is the textbook example of something **only a human can
write**. Without it, the next person will add shipping fees in and wonder why the number
disagrees with accounting.

## Step 2 — Where "documented enough" stops

Requiring every column to be documented is a reliable way to get nothing documented. A
practical threshold:

| Subject | Required level |
|---|---|
| A marts model | description + **every column** |
| A `stg_`/`int_` model | a model-level description; columns only when the name isn't self-explanatory |
| Key columns (`*_id`, `*_sk`) | always — say what it's the key of, natural or surrogate |
| Measure columns | always — **units, what's been deducted, additivity** |
| `ngay_*` columns | always — business date or load date, which time zone |
| Obvious columns (`ten_hang`) | skip |

The three middle rows are where 90% of misunderstandings happen.

## Step 3 — `docs` blocks: write once, use in many places

For long descriptions, or ones repeated across models, pull them out:

```markdown
<!-- models/marts/docs.md -->
{% docs khach_id %}
Mã khách hàng từ hệ ERP (**natural key**, không phải surrogate key).

- Định dạng `C<số>`, ví dụ `C1`.
- **Không** duy nhất trong `snap_khach_hang` — ở đó một khách có nhiều phiên bản,
  khoá là `dbt_scd_id`.
{% enddocs %}
```

```yaml
columns:
  - name: khach_id
    description: "{{ doc('khach_id') }}"
```

Use this when the same column appears in ≥3 models — the same threshold as for macros. Below
that, writing it inline reads better.

## Step 4 — `meta`: information machines can read

`description` is for people; `meta` is for machines.

```yaml
models:
  - name: mart_doanh_thu_ngay
    description: "Doanh thu và số đơn theo ngày đặt. Grain: một dòng một ngày."
    meta:
      owner: "data-team@cong-ty.vn"
      mat_do_cap_nhat: "hằng ngày 06:00 GMT+7"
      do_nhay_cam: "noi_bo"
      dashboard: "Doanh thu tổng quan"
    config:
      tags: ['hang_ngay', 'tai_chinh']
```

`meta` shows up in `dbt docs` and lives in `manifest.json` — meaning it is **queryable**.
That's how you answer "which tables have no owner" without reading them by hand:

```bash
dbt ls --output json --output-keys name meta | grep -v owner
```

`tags` are different from `meta`: they are a **selector** for choosing what to run.

```bash
dbt build --select tag:tai_chinh
dbt test  --select tag:hang_ngay
```

## Step 5 — Generating and reading the docs site

```bash
dbt docs generate
```

```text
02:41:45  Concurrency: 4 threads (target='dev')
02:41:45  Building catalog
02:41:45  Catalog written to .../target/catalog.json
```

```bash
dbt docs serve --port 8080        # open localhost:8080
```

Three files land in `target/`, each with its own role:

| File | What it is | Used for |
|---|---|---|
| `manifest.json` | **intent** — every model/test/source you declared | state comparison for CI, metadata queries |
| `catalog.json` | **reality** — the columns and types actually present in the warehouse | reconciling declarations against reality |
| `index.html` | a static site combining the two | host it anywhere |

Telling `manifest` from `catalog` is a common confusion. Declare a column in YAML that
doesn't really exist and `manifest` has it while `catalog` doesn't — the docs site greys it
out.

`dbt docs generate` **must run after a successful `dbt run`**, because `catalog.json` reads
metadata from the real tables. Run it against a blank environment and the catalog is empty.

## Step 6 — Make documentation mandatory rather than well-intentioned

Documentation with nothing enforcing it is empty six months later. Two mechanisms; use both.

**1. Contracts** — a declared column becomes a contract, and the wrong type fails:

```yaml
models:
  - name: mart_doanh_thu_ngay
    config:
      contract: {enforced: true}
    columns:
      - name: ngay
        data_type: date
        constraints: [{type: not_null}]
      - name: doanh_thu
        data_type: bigint
```

**2. A CI check** — a marts model missing a description blocks the merge:

```bash
dbt ls --select path:models/marts --output json --output-keys name description \
  | grep '"description": ""' && echo 'THIEU DESCRIPTION' && exit 1
```

## Common errors

| Error | Consequence |
|---|---|
| `description: "The revenue table"` | Adds nothing beyond the table name |
| Not stating the **grain** | The next person joins wrong and totals inflate — the most expensive failure |
| Not stating a measure's **units** | VND or thousands of VND, net of VAT or not — a 10× discrepancy |
| Restating the data type in the description | `catalog.json` already has it; the doc only creates a place to drift |
| `dbt docs generate` before `dbt run` | an empty catalog, columns greyed out |
| Documentation saying one thing, the model doing another | Worse than no documentation — readers trust the doc |
| Documenting `stg_` tables better than `marts` | Backwards priority; marts are what outsiders read |
| Using `meta` instead of `tags` to select resources | `meta` is not a selector |

## Verifying

```bash
dbt docs generate && dbt docs serve
dbt ls --output json --output-keys name description tags | head
python -c "import json;m=json.load(open('target/manifest.json'));print(len(m['nodes']))"
```

## Related Topics

- [dbt docs and lineage](../reference/docs-and-lineage.md) — the theory, plus `state:modified`
- [Grain](../../../data-modeling/reference/grain.md) — the single most important sentence to put in a description
- [Implementing tests in dbt](implementing-tests.md) — a contract is a test at the structural layer
- [Setting up CI/CD for a dbt project](ci-cd-cho-dbt.md) — making documentation mandatory
