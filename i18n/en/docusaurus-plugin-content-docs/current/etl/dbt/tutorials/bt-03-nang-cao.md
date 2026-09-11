---
title: "dbt exercises — Advanced"
sidebar_position: 30
description: "Five exercises on what only surfaces in production: unit tests, SCD2 on business time, on_schema_change swallowing a column, CI with state:modified, and reading run_results.json."
tags: [dbt, bai-tap, unit-test, scd2, on-schema-change, ci-cd, run-results]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-09-11
---

# dbt exercises — Advanced

> **Takeaway:** this set introduces no new syntax. It drills what separates someone who
> *uses* dbt from someone who **operates** it: proving logic without real data, building
> history on business time, and knowing where your project spends its time.

## Setup

Finish the [Intermediate set](bt-02-trung-binh.md) first. Data anchors: **10 orders · 15 line
items · 10,215,000**.

---

## Exercise N1 — Unit tests: proving logic without real data

**Task:** `mart_doanh_thu_ngay` contains one easy mistake: `count(distinct don_hang_id)` after
a join that inflates the grain. Write a **unit test** (dbt 1.8+) proving the model aggregates
correctly, with fake data declared inline in YAML:

- 2 orders on the same date `2026-01-01`, shipping fees 1000 and 2000
- 3 line items: `D1` has 2 rows (100 + 200), `D2` has 1 row (300)
- Expected: 1 result row — `so_don = 2`, `doanh_thu = 600`

**Also answer:** why do unit tests run **before** the model is built, while data tests run
**after**?

**The answer it must produce:**

```text
1 of 7 PASS mart_doanh_thu_ngay::mart_doanh_thu_ngay_gop_dung_ngay ............. [PASS in 0.13s]
```

<details>
<summary>Solution</summary>

```yaml
# models/marts/unit_tests.yml
unit_tests:
  - name: mart_doanh_thu_ngay_gop_dung_ngay
    model: mart_doanh_thu_ngay
    given:
      - input: ref('stg_don_hang')
        rows:
          - {don_hang_id: 'D1', ngay_dat: '2026-01-01', phi_ship: 1000}
          - {don_hang_id: 'D2', ngay_dat: '2026-01-01', phi_ship: 2000}
      - input: ref('stg_don_hang_chi_tiet')
        rows:
          - {don_hang_id: 'D1', dong: 1, thanh_tien: 100}
          - {don_hang_id: 'D1', dong: 2, thanh_tien: 200}
          - {don_hang_id: 'D2', dong: 1, thanh_tien: 300}
    expect:
      rows:
        - {ngay: '2026-01-01', so_don: 2, doanh_thu: 600}
```

**Answer to the question:** a unit test checks **SQL logic**, not data — it replaces every
input with fake rows, so it needs no real tables and can run before the build. A data test
(`unique`, `not_null`, a singular test) checks **the data sitting in the table**, so the table
must already exist.

Look at the index in the output: the unit test is `1 of 7` — it blocks from the very front, so
a model with broken logic never gets built.

**When a unit test is worth writing:**

| Worth it | Not worth it |
|---|---|
| Aggregation logic that could inflate the grain | a model that only renames columns |
| A `case when` with many branches | a model with a single filter |
| Ratios, allocations, currency conversion | staging that is 1:1 with the source |
| A model whose numbers have been wrong once before | — |

List only the columns you **actually need** in `given` — dbt fills the rest with `NULL`. Here
`ma_hang` and `so_luong` don't affect the result, so they're left out entirely.

</details>

---

## Exercise N2 — SCD2 on business time, and how far as-was differs from as-is

**Task:** exercise T5 showed that `dbt snapshot` writes timestamps from **the run clock**, so
it can't serve history in the past. Now build SCD2 **by hand** from the `khach_hang_lich_su`
table (daily snapshots, with a `ngay_trich` column), then compute revenue by region two ways
and compare:

1. **as-was** — the customer's region **on the order date**
2. **as-is** — the customer's **current** region

**Hint:** collapse daily snapshots into validity ranges — `lag()` to detect change points,
`lead()` to close the ranges.

**The answer it must produce:**

The SCD2 table you build:

```text
┌──────────┬────────────┬────────────┬────────────┐
│ khach_id │  khu_vuc   │ valid_from │  valid_to  │
├──────────┼────────────┼────────────┼────────────┤
│ C1       │ Mien Bac   │ 2026-07-01 │ 2026-07-03 │
│ C1       │ Mien Nam   │ 2026-07-03 │ NULL       │
│ C2       │ Mien Nam   │ 2026-07-01 │ NULL       │
│ C3       │ Mien Trung │ 2026-07-01 │ NULL       │
│ C4       │ Mien Bac   │ 2026-07-01 │ NULL       │
└──────────┴────────────┴────────────┴────────────┘
```

```text
-- AS-WAS                          -- AS-IS
┌────────────┬───────────┐         ┌────────────┬───────────┐
│  khu_vuc   │ doanh_thu │         │  khu_vuc   │ doanh_thu │
├────────────┼───────────┤         ├────────────┼───────────┤
│ Mien Bac   │   4200000 │         │ Mien Bac   │   1650000 │
│ Mien Nam   │   3915000 │         │ Mien Nam   │   6465000 │
│ Mien Trung │   2100000 │         │ Mien Trung │   2100000 │
└────────────┴───────────┘         └────────────┴───────────┘
```

<details>
<summary>Solution</summary>

```sql
-- models/marts/dim_khach_hang_scd2.sql
with anh_chup as (
    select khach_id, ngay_trich, khu_vuc,
           lag(khu_vuc) over (partition by khach_id order by ngay_trich) as khu_vuc_truoc
    from {{ ref('khach_hang_lich_su') }}
),
moc_doi as (
    select * from anh_chup
    where khu_vuc_truoc is null or khu_vuc_truoc <> khu_vuc
)
select
    khach_id,
    khu_vuc,
    ngay_trich as valid_from,
    lead(ngay_trich) over (partition by khach_id order by ngay_trich) as valid_to
from moc_doi
```

```sql
-- as-was
select d.khu_vuc, sum(ct.thanh_tien) as doanh_thu
from {{ ref('stg_don_hang') }} o
join {{ ref('stg_don_hang_chi_tiet') }} ct using (don_hang_id)
join {{ ref('dim_khach_hang_scd2') }} d
  on  d.khach_id = o.khach_id
  and o.ngay_dat >= d.valid_from
  and o.ngay_dat <  coalesce(d.valid_to, date '9999-12-31')
group by 1 order by 1
```

```sql
-- as-is
select k.khu_vuc, sum(ct.thanh_tien) as doanh_thu
from {{ ref('stg_don_hang') }} o
join {{ ref('stg_don_hang_chi_tiet') }} ct using (don_hang_id)
join {{ ref('khach_hang') }} k using (khach_id)
group by 1 order by 1
```

**Reading the result.** Customer `C1` moved *Mien Bac → Mien Nam* on 2026-07-03. `C1` has
three orders: `DH001` (07-01), `DH003` (07-02), `DH007` (07-04).

| Method | Mien Bac | Mien Nam | Note |
|---|---|---|---|
| as-was | 4,200,000 | 3,915,000 | DH001 + DH003 count to the North, DH007 to the South |
| as-is | 1,650,000 | 6,465,000 | all three of C1's orders count to the South |
| **Difference** | **2,550,000** | 2,550,000 | 25% of total revenue |

Both methods total **10,215,000** — no money is lost, it just sits in a different region.

**Three things you must take away:**

1. **A 25% swing from one customer moving once.** On real data with thousands of customers,
   this is the kind of discrepancy that keeps two departments arguing for a week.
2. **Neither method is universally right.** Sales wants as-was (crediting the region that made
   the sale). Marketing wants as-is (targeting by current region). The decision is **business**,
   not technical — and it must be written into the model's `description`.
3. **`coalesce(valid_to, '9999-12-31')` is mandatory.** `x < NULL` yields `NULL`, not `true`,
   so omitting it loses every current row and as-was mysteriously returns less than as-is.

**Why build it by hand instead of using `dbt snapshot`:** the daily snapshots already carry
`ngay_trich` — a real **business** timestamp. `dbt snapshot` only has the run clock. When the
source already keeps history, building by hand gives you the right timestamps; `dbt snapshot`
is the fallback for when the source keeps nothing at all.

</details>

---

## Exercise N3 — `on_schema_change` swallowing a new column

**Task:**

1. Build `fct_dong_hang` (incremental) as in exercise T1.
2. Add a column `_nap_luc` to the model: `'{{ run_started_at }}' as _nap_luc`.
3. Run `dbt run` — **without** `--full-refresh`. List the table's columns.
4. Add `on_schema_change='append_new_columns'` to `config()`, run again, list the columns.
5. Explain why step 3 raised no error.

**The answer it must produce:**

After step 3 — `on_schema_change` still at its `ignore` default:

```text
['don_hang_id', 'dong', 'ma_hang', 'so_luong', 'don_gia', 'thanh_tien', 'ngay']
```

After step 4 — switched to `append_new_columns`:

```text
['don_hang_id', 'dong', 'ma_hang', 'so_luong', 'don_gia', 'thanh_tien', 'ngay', '_nap_luc']
```

Both `dbt run` invocations report:

```text
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

<details>
<summary>Solution</summary>

```sql
{{ config(
    materialized='incremental',
    unique_key=['don_hang_id', 'dong'],
    on_schema_change='append_new_columns'
) }}

select don_hang_id, dong, ma_hang, so_luong, don_gia, thanh_tien, ngay,
       '{{ run_started_at }}' as _nap_luc
from {{ ref('stg_don_hang_chi_tiet') }}
{% if is_incremental() %}
where ngay >= (select coalesce(max(ngay), date '1900-01-01') - interval 7 day from {{ this }})
{% endif %}
```

**Why step 3 raised no error:** for an incremental model, dbt **doesn't recreate** the table —
it inserts/merges into the existing one. The `insert` statement is generated from the
**target table's** columns, not from the `select`'s columns. Extra columns in the `select` are
skipped. `on_schema_change` defaults to `ignore`, so dbt stays deliberately silent.

This is the classic hour-eating bug: `dbt run` is green, the code has the column, the table
doesn't, and there's nothing to grep for.

**The four values:**

| Value | Behaviour | Use when |
|---|---|---|
| `ignore` (default) | drops the new column, silently | never worth keeping as the default |
| `append_new_columns` | adds the new column, old rows `null` | the sensible default |
| `sync_all_columns` | adds **and drops** columns to match the model | the model is the single source of truth |
| `fail` | stops with an error | the table has a strict contract with another system |

**A caveat about `append_new_columns`:** the column is added, but **old rows carry `NULL`** —
`_nap_luc` only has values for rows loaded from this point on. To populate it across the whole
table you still need `dbt run --full-refresh -s fct_dong_hang`.

Set the default project-wide so you don't have to remember:

```yaml
# dbt_project.yml
models:
  dbt_lab:
    +on_schema_change: append_new_columns
```

</details>

---

## Exercise N4 — A CI that only runs what changed

**Task:**

1. Run `dbt build` to produce `target/manifest.json`, and copy it into `prod_manifest/` as a
   stand-in for production's manifest.
2. Edit **exactly one** staging model (for instance change `trang_thai` to
   `upper(trang_thai)`).
3. Run `dbt ls --select state:modified+ --state ./prod_manifest`.
4. **Answer:** why does the list include `mart_doanh_thu_ngay` and tests you never touched?
5. Write the GitHub Actions step that uses this, including the two mandatory pieces: a
   per-PR schema, and a cleanup step that runs even when CI fails.

**The answer it must produce:**

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

<details>
<summary>Solution</summary>

```bash
dbt build --profiles-dir .
mkdir -p prod_manifest && cp target/manifest.json prod_manifest/
sed -i 's/trang_thai,/upper(trang_thai) as trang_thai,/' models/staging/stg_don_hang.sql
dbt ls --select state:modified+ --state ./prod_manifest --profiles-dir .
```

**Answer to question 4:** the trailing `+` on `state:modified` means **"and everything
downstream in the DAG"**. `mart_doanh_thu_ngay` has a `ref()` to `stg_don_hang`, so it's
downstream. The tests attached to both models are downstream too — a test is always a child of
the model it checks.

Which is exactly what you want: change one model and you must re-check **everything it could
break**, not just the model itself.

```yaml
      - name: Lay manifest cua production
        run: |
          mkdir -p prod_manifest
          aws s3 cp s3://cty-dbt-artifacts/prod/manifest.json prod_manifest/manifest.json

      - name: Build phan da doi
        env:
          DBT_CI_SCHEMA: ci_pr_${{ github.event.pull_request.number }}
        run: |
          dbt build --select state:modified+ \
                    --defer --state ./prod_manifest \
                    --target ci

      - name: Don schema cua PR
        if: always()
        run: dbt run-operation drop_schema --args "{schema: ci_pr_${{ github.event.pull_request.number }}}"
```

**Three things you must take away:**

1. **`--defer` is the second half.** It lets you build a model in the middle of the DAG
   without rebuilding everything upstream: a `ref()` to a model absent from the CI schema
   resolves to production.
2. **`if: always()`** — a failing CI still has to clean up. Without it, the warehouse fills
   with `ci_pr_*` schemas nobody dares delete.
3. **Production's `manifest.json` must be an artifact of the production job**, uploaded to S3
   after each successful build. It isn't in git, and using a stale manifest makes
   `state:modified` over-report.

**How to tell `--state` is broken:** count the nodes CI runs. If it's close to the total model
count, the manifest isn't being loaded, and you're paying for a full CI while believing you
have a slim one.

```bash
dbt ls --select state:modified+ --state ./prod_manifest | wc -l
```

</details>

---

## Exercise N5 — Where is the project spending its time?

**Task:** run `dbt build`, then write a script that reads `target/run_results.json` and prints
the 5 slowest nodes plus the total time. Then answer: given those results, where is optimising
profitable, and where is it wasted effort?

**Hint:** `run_results.json`, the `results` array, the `execution_time` (seconds) and
`unique_id` fields.

**The answer it must produce** (exact numbers vary by machine; the **shape** of the
distribution is what must match):

```text
   0.395s  snapshot.dbt_lab.snap_khach_hang
   0.249s  model.dbt_lab.dim_khach_hang
   0.201s  model.dbt_lab.fct_dong_hang
   0.179s  model.dbt_lab.stg_don_hang
   0.175s  model.dbt_lab.stg_don_hang_chi_tiet
tong: 3.114 s · 33 node
```

<details>
<summary>Solution</summary>

```python
import json
r = json.load(open('target/run_results.json'))
top = sorted(r['results'], key=lambda x: -x['execution_time'])[:5]
for t in top:
    print(f"{t['execution_time']:8.3f}s  {t['unique_id']}")
print("tong:", round(sum(x['execution_time'] for x in r['results']), 3), "s ·",
      len(r['results']), "node")
```

**Reading this result:** the 5 slowest nodes add up to 1.199s out of a 3.114s total — about
**38%**. The remainder is spread evenly across 28 nodes.

Conclusion: **there is no bottleneck.** On this lab, optimising is wasted effort — every node
is under half a second and the data is 15 rows.

Thresholds for knowing when optimisation is real:

| Shape of the distribution | Conclusion |
|---|---|
| Top 5 exceeds **50%** of the total | A clear bottleneck — optimise exactly those 5 nodes |
| Top 5 around 30–40%, spread evenly | No bottleneck; for speed, raise `threads` or delete dead models |
| A single node exceeds **25%** alone | The prime candidate for `incremental` |
| Total test time exceeds total model time | Tests are scanning whole tables — revisit the singular tests |

Four optimisation directions, in the order worth trying:

1. **Delete models nobody uses.** Cheapest, and every project over a year old has some.
   Cross-check `manifest.json` against the warehouse query log.
2. **Raise `threads`** in `profiles.yml`. Only helps when the DAG is **wide**; a chain-shaped
   DAG doesn't care.
3. **Move the slowest model to `incremental`** — but read [exercise T1](bt-02-trung-binh.md)
   first: it trades run time for correctness obligations.
4. **Turn a `view` into a `table`** at the layer every downstream model re-reads. Measure
   before and after; don't guess.

**About `run_results.json` in production:** upload it to S3 after every run, just like
`manifest.json`. With a series of those files you can chart "which models are getting slower
month over month" — the thing that lets you act **before** the nightly job spills into working
hours.

</details>

---

## Self-check — four questions that come up in interviews

<details>
<summary>1. How does a unit test differ from a data test, and when do you use each?</summary>

A unit test checks **SQL logic** against fake data declared in YAML, runs **before** the build,
and needs no real table. A data test checks **the real data in the table** and runs after.

Unit tests for models with error-prone logic (aggregation, multi-branch `case when`,
allocation). Data tests for every model.

</details>

<details>
<summary>2. Why not use <code>dbt snapshot</code> for every history requirement?</summary>

Because the timestamp it records is **the snapshot run time**, not business time, and it is
**not retroactive**. When the source already keeps history (daily snapshots, CDC with
`valid_from`), building SCD2 by hand gives correct timestamps. `dbt snapshot` is the fallback
for when the source keeps nothing.

</details>

<details>
<summary>3. How do you keep dbt CI from taking 40 minutes per PR?</summary>

`dbt build --select state:modified+ --defer --state <production manifest>`. Compare against
production's manifest so you only run what changed plus what's downstream; `--defer` points
`ref()` at production for anything not built. Add a per-PR schema and a cleanup step with
`if: always()`.

</details>

<details>
<summary>4. The model gained a column but the incremental table doesn't have it — what happened?</summary>

`on_schema_change` is at its `ignore` default. dbt generates the `insert` from the **target
table's** columns, so the extra column in the `select` is silently dropped. Fix:
`append_new_columns`, plus `--full-refresh` if you want the column populated for old rows.

</details>

## Related Topics

- [Implementing tests in dbt](../skills/implementing-tests.md) — exercise N1
- [Snapshots — capturing change history](../skills/snapshot-scd2.md) — exercise N2
- [SCD — Slowly Changing Dimension](../../../data-modeling/skills/scd.md) — as-was and as-is
- [Writing an incremental model](../skills/viet-incremental-model.md) — exercise N3
- [Setting up CI/CD for a dbt project](../skills/ci-cd-cho-dbt.md) — exercise N4
- [Materializations](../reference/materializations.md) — exercise N5
