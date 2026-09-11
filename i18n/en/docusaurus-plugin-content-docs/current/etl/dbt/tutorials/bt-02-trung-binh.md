---
title: "dbt exercises — Intermediate"
sidebar_position: 20
description: "Five exercises on what dbt breaks without raising an error: incrementals dropping late edits, tests on the wrong grain, Jinja producing unreadable SQL, snapshots writing the wrong timestamp."
tags: [dbt, bai-tap, incremental, macro, jinja, snapshot, dbt-utils, test]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-11
---

# dbt exercises — Intermediate

> **Takeaway:** this set drills exactly one skill — **spotting failures that raise no error**.
> All five exercises include a step that makes you **create the bug yourself first**, and only
> then fix it. Reading the solution without going through that step teaches nothing.

## Setup

```bash
cd ~/Documents/learn-lab/dbt
./.venv/bin/dbt deps --profiles-dir .
./.venv/bin/dbt seed --profiles-dir .
```

You need `stg_don_hang`, `stg_don_hang_chi_tiet` and `mart_doanh_thu_ngay` from the
[Basic set](bt-01-co-ban.md). Anchors: **15 line items, revenue 10,215,000**.

---

## Exercise T1 — The incremental model drops a late edit

**Task:** four steps, in this order.

1. Write `fct_dong_hang` materialized `incremental`, with `unique_key` set to
   `['don_hang_id', 'dong']`, filtering on `ngay > max(ngay) from {{ this }}`.
2. Run it twice. Prove nothing duplicated.
3. Add **two** rows to the seed, re-seed, and run again:
   ```text
   DH011,1,SP-C,1,900000,2026-07-06
   DH001,1,SP-A,4,150000,2026-07-01
   ```
   The first is a new order; the second is a late edit (`so_luong` 2 → 4, date unchanged).
4. Reconcile the `thanh_tien` totals between `fct_dong_hang` and `stg_don_hang_chi_tiet`.
   Explain the gap, then fix it.

**Hint:** step 4 is the whole point. The row counts will match — don't stop there.

**The answer it must produce** (after step 3, *before* the fix):

```text
┌───────────────────┬─────────┬───────────┐
│       bang        │ so_dong │ doanh_thu │
├───────────────────┼─────────┼───────────┤
│ fct (incremental) │      16 │  11115000 │
│ stg (nguon that)  │      16 │  11415000 │
└───────────────────┴─────────┴───────────┘
```

After the fix, both must read `16 · 11415000`.

<details>
<summary>Solution</summary>

**Steps 1–2:**

```sql
-- models/marts/fct_dong_hang.sql
{{ config(materialized='incremental', unique_key=['don_hang_id', 'dong']) }}

select
    don_hang_id, dong, ma_hang, so_luong, don_gia, thanh_tien, ngay
from {{ ref('stg_don_hang_chi_tiet') }}

{% if is_incremental() %}
where ngay > (select coalesce(max(ngay), date '1900-01-01') from {{ this }})
{% endif %}
```

```text
02:38:51  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.07s]
02:38:54  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.16s]
```

Still 15 rows after two runs — that's `unique_key` at work. Drop `unique_key` and the
strategy falls back to a plain `insert`, so the second run duplicates.

**Steps 3–4 — the important part:**

```text
02:39:11  1 of 1 OK loaded seed file main.don_hang_chi_tiet .............................. [INSERT 16 in 0.06s]
02:39:14  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.11s]
```

No errors. But:

```text
┌─────────────┬───────┬─────────┬──────────┬─────────┬────────────┬────────────┐
│ don_hang_id │ dong  │ ma_hang │ so_luong │ don_gia │ thanh_tien │    ngay    │
├─────────────┼───────┼─────────┼──────────┼─────────┼────────────┼────────────┤
│ DH001       │     1 │ SP-A    │        2 │  150000 │     300000 │ 2026-07-01 │
└─────────────┴───────┴─────────┴──────────┴─────────┴────────────┴────────────┘
```

`so_luong` is still 2. The filter `ngay > max(ngay)` looks at the **business date**; the
corrected `DH001` carries 2026-07-01, below the 2026-07-05 watermark, so it never enters the
batch and the merge never touches it. The gap is exactly `2 × 150,000 = 300,000`.

**The fix — a lookback window:**

```sql
{% if is_incremental() %}
-- A 7-day lookback window: catches late edits, not just new rows.
where ngay >= (select coalesce(max(ngay), date '1900-01-01') - interval 7 day from {{ this }})
{% endif %}
```

```text
┌───────────────────┬─────────┬───────────┐
│       bang        │ so_dong │ doanh_thu │
├───────────────────┼─────────┼───────────┤
│ fct (lookback 7d) │      16 │  11415000 │
│ stg (nguon that)  │      16 │  11415000 │
└───────────────────┴─────────┴───────────┘
```

The window is only safe **because `unique_key` exists** — re-reading 7 days becomes a merge
rather than duplicate inserts.

**Three things you must take away:**

1. A matching row count does **not** prove the data is right. You have to reconcile the
   measure totals.
2. No standard test catches this: `unique` passes, `not_null` passes, `relationships` passes.
3. The window width must be measured from data (the 99th percentile of edit lag), not chosen
   by feel. A tail longer than the window is why you still need a periodic `--full-refresh`.

</details>

---

## Exercise T2 — The two kinds of test YAML can't express

**Task:**

1. Write a **custom generic test** called `khong_am(column_name, cho_phep_null=false)` — it
   fails when the column has negative values, and (depending on the parameter) when it has
   `NULL`s.
2. Write a **singular test** reconciling `mart_doanh_thu_ngay`'s total revenue against the
   total `thanh_tien` in `stg_don_hang_chi_tiet`.
3. **Deliberately break** the mart by adding `sum(phi_ship)` to revenue, run
   `dbt build --store-failures`, and read the table holding the failing rows.

**Hint:** generic tests go in `tests/generic/`, singular tests directly in `tests/`. Both are
"a SQL statement returning **the wrong rows**" — returning 0 rows is a pass.

**The answer it must produce** (step 3):

```text
4 of 5 FAIL 1 tong_mart_khop_staging ........................................... [FAIL 1 in 0.09s]
[ERROR]: in test tong_mart_khop_staging (tests/tong_mart_khop_staging.sql)
  Got 1 result, configured to fail if != 0
Done. PASS=4 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5
```

```text
┌──────────┬──────────┐
│   mart   │ staging  │
├──────────┼──────────┤
│ 10925000 │ 10215000 │
└──────────┴──────────┘
```

<details>
<summary>Solution</summary>

```sql
-- tests/generic/khong_am.sql
{% test khong_am(model, column_name, cho_phep_null=false) %}
select {{ column_name }}
from {{ model }}
where {{ column_name }} < 0
{% if not cho_phep_null %}
   or {{ column_name }} is null
{% endif %}
{% endtest %}
```

```sql
-- tests/tong_mart_khop_staging.sql
with a as (select sum(doanh_thu)  t from {{ ref('mart_doanh_thu_ngay') }}),
     b as (select sum(thanh_tien) t from {{ ref('stg_don_hang_chi_tiet') }})
select a.t as mart, b.t as staging
from a, b
where a.t <> b.t
```

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

**Why the gap is exactly 710,000:** the shipping fee is an attribute of the **order**, but
after joining to the line-item table each order spans several rows → `sum(phi_ship)` adds the
fee once per line item. This is a grain trap, not a dbt trap.

**Two things you must take away:**

1. `--store-failures` writes the failing rows into the `<schema>_dbt_test__audit` schema — on
   the lab, `main_dbt_test__audit`. That's the difference between "the test is red" and
   "knowing what it's red about".
2. A singular test reconciling totals is the **only** guardrail against the class of bug in
   exercise T1. It scans the whole table, so it's expensive: tag it `tags: ['hang_ngay']` and
   run it nightly, not on every PR.

</details>

---

## Exercise T3 — Jinja generating columns, and whitespace

**Task:** write `mart_pivot_nhom`, pivoting revenue by **product group**, where the list of
groups **must not be hard-coded** — it has to be read from the `hang_hoa` table at compile
time. Units: millions of dong, rounded to 2 decimals, using a `vnd()` macro you write.

Then open `target/compiled/` and **compare the two versions**: before and after using `{%-` /
`-%}`.

**Hint:** `dbt_utils.get_column_values()`.

**The answer it must produce:**

```text
┌────────────┬────────┬────────┬────────┐
│    ngay    │ nhom_1 │ nhom_2 │ nhom_3 │
├────────────┼────────┼────────┼────────┤
│ 2026-07-01 │   1.05 │    0.3 │    0.0 │
│ 2026-07-02 │   0.45 │    1.8 │    0.9 │
│ 2026-07-03 │    1.5 │    0.0 │    2.7 │
│ 2026-07-04 │    0.2 │    0.9 │    0.0 │
│ 2026-07-05 │   0.42 │    0.0 │    0.0 │
└────────────┴────────┴────────┴────────┘
```

<details>
<summary>Solution</summary>

```sql
-- macros/vnd.sql
{%- macro vnd(cot) -%}
round({{ cot }} / 1000000.0, 2)
{%- endmacro -%}
```

```sql
-- models/marts/mart_pivot_nhom.sql
{%- set nhom = dbt_utils.get_column_values(ref('hang_hoa'), 'nhom') -%}

select
    ct.ngay
    {%- for n in nhom %},
    {{ vnd("sum(case when hh.nhom = '" ~ n ~ "' then ct.thanh_tien else 0 end)") }} as nhom_{{ loop.index }}
    {%- endfor %}
from {{ ref('stg_don_hang_chi_tiet') }} ct
join {{ ref('hang_hoa') }} hh using (ma_hang)
group by 1
order by 1
```

Compiles to:

```sql
select
    ct.ngay,
    round(sum(case when hh.nhom = 'Thiết bị nhập' then ct.thanh_tien else 0 end) / 1000000.0, 2) as nhom_1,
    round(sum(case when hh.nhom = 'Màn hình' then ct.thanh_tien else 0 end) / 1000000.0, 2) as nhom_2,
    round(sum(case when hh.nhom = 'Máy tính' then ct.thanh_tien else 0 end) / 1000000.0, 2) as nhom_3
from "lab"."main_staging"."stg_don_hang_chi_tiet" ct
join "lab"."main"."hang_hoa" hh using (ma_hang)
group by 1
order by 1
```

The version **without** whitespace control compiles to this — it runs, but this is the file
you'll open to debug:

```sql
select
    ct.ngay,
    
    
    round(sum(case when hh.nhom = 'Thiết bị nhập' then ct.thanh_tien else 0 end) / 1000000.0, 2)
 as "thiết_bị_nhập",
```

**Three things you must take away:**

1. `get_column_values` **runs a real query at compile time**. The `hang_hoa` table must exist
   before parsing — CI on a blank environment breaks right here.
2. The model's column count **changes by itself** when the source gains a new product group.
   Convenient, but the column contract is no longer stable — a downstream dashboard can break
   without anyone editing a line of code.
3. Naming the columns `nhom_{{ loop.index }}` rather than using the group name is deliberate:
   group names contain spaces and accents, which become identifiers that need quoting and
   break easily.

</details>

---

## Exercise T4 — `dbt_utils`: surrogate keys and grain tests

**Task:**

1. Write `dim_khach_hang` with a `khach_sk` column generated by `generate_surrogate_key`, and
   the remaining columns pulled in with `star()` excluding `ho_ten`.
2. Open the compiled SQL and explain **why** the macro wraps the key column in `coalesce`.
3. Add a `dbt_utils.fewer_rows_than` test on `fct_dong_hang` against
   `stg_don_hang_chi_tiet`, and explain which class of bug it catches that `unique` cannot.

**The answer it must produce:**

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

<details>
<summary>Solution</summary>

```sql
-- models/marts/dim_khach_hang.sql
select
    {{ dbt_utils.generate_surrogate_key(['khach_id']) }} as khach_sk,
    {{ dbt_utils.star(from=ref('khach_hang'), except=['ho_ten']) }}
from {{ ref('khach_hang') }}
```

Compiled:

```sql
select
    md5(cast(coalesce(cast(khach_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as khach_sk,
    "khach_id",
  "khu_vuc",
  "hang"
from "lab"."main"."khach_hang"
```

**Why the `coalesce`:** `md5(NULL)` returns `NULL`. Without the sentinel string, every row
missing a key collapses into a single `NULL` — and the subsequent join turns into a Cartesian
product. The string `'_dbt_utils_surrogate_key_null_'` guarantees that `NULL` still hashes to
a distinct value.

**Why a hash rather than `row_number()`:** a hash is **stable** — rebuild it, run it on
another machine, switch warehouses, and you get the same value. `row_number()` changes on
every build, and a fact pointing at the old surrogate key immediately points at the wrong row.

```yaml
models:
  - name: fct_dong_hang
    tests:
      - dbt_utils.fewer_rows_than:
          arguments:
            compare_model: ref('stg_don_hang_chi_tiet')
```

**Which class of bug this catches:** *a model dropping rows*. `unique`, `not_null` and
`relationships` all inspect **the rows that are there**; none of them knows about rows that
should be there and aren't. A join that accidentally became `inner`, an over-eager `where` —
both sail through every standard test.

**About `star()`:** it's the middle road between `select *` (a new column at the source flows
straight into the mart, unreviewed) and listing 40 columns by hand. In exchange, the columns
are generated at compile time, so the real table must exist — the same CI constraint as
exercise T3.

</details>

---

## Exercise T5 — Whose timestamp does a snapshot record?

**Task:**

1. Declare `snap_khach_hang` using the YAML syntax (dbt 1.9+), strategy `check`, tracking
   `khu_vuc` and `hang`.
2. Run the snapshot once.
3. Edit the seed: `C1` moves `Mien Nam → Mien Bac` and is upgraded `Bac → Vang`. Re-seed and
   run the snapshot a second time.
4. Read `dbt_valid_from` for the two versions. **Answer:** what moment do those timestamps
   represent? If the customer really moved region on 2026-07-03, does the snapshot know?

**The answer it must produce:**

```text
┌──────────┬──────────┬─────────┬────────────────────────────┬────────────────────────────┐
│ khach_id │ khu_vuc  │  hang   │       dbt_valid_from       │        dbt_valid_to        │
├──────────┼──────────┼─────────┼────────────────────────────┼────────────────────────────┤
│ C1       │ Mien Nam │ Bac     │ 2026-09-11 09:40:27.653852 │ 2026-09-11 09:40:34.225211 │
│ C1       │ Mien Bac │ Vang    │ 2026-09-11 09:40:34.225211 │ NULL                       │
└──────────┴──────────┴─────────┴────────────────────────────┴────────────────────────────┘
```

Table total: 5 rows (4 customers, `C1` with 2 versions).

<details>
<summary>Solution</summary>

```yaml
# snapshots/snap_khach_hang.yml
snapshots:
  - name: snap_khach_hang
    relation: ref('khach_hang')
    config:
      unique_key: khach_id
      strategy: check
      check_cols: [khu_vuc, hang]
```

```text
02:40:27  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.09s]
02:40:34  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.16s]
```

**Answer to step 4:** those two timestamps, `09:40:27` and `09:40:34`, are **when I ran the
two `dbt snapshot` commands**, 7 seconds apart. They have nothing to do with business time.

The snapshot **does not know** the customer moved on 2026-07-03. All it knows is *"between
the two times I looked, the value was different"*. `dbt snapshot` is a tape recorder, not a
time machine.

**What that means for an as-was join.** Every order in the lab is from July, while the
snapshot's validity ranges start in September — so this join returns **0 rows**:

```sql
join {{ ref('snap_khach_hang') }} k
  on  f.khach_id = k.khach_id
  and f.ngay_dat >= k.dbt_valid_from
  and f.ngay_dat <  coalesce(k.dbt_valid_to, timestamp '9999-12-31')
```

For history on **business time**, you have to build SCD2 by hand from a source that carries
business dates — that's [exercise N4 in the Advanced set](bt-03-nang-cao.md).

**Four things you must take away:**

1. `coalesce(dbt_valid_to, ...)` is mandatory in the join: `x < NULL` yields `NULL`, not
   `true` → you lose every current row.
2. Snapshots are **not retroactive**. History starts the day you turn them on. So turn them
   on for every important dimension **now**, don't wait for someone to ask.
3. A snapshot table is **data that cannot be regenerated** — it has to be in the backup
   schedule, and `dbt build --full-refresh` must carry
   `--exclude resource_type:snapshot`.
4. The run cadence sets the resolution: run daily and two changes on the same day record as
   one.

</details>

---

## Self-check before moving to Advanced

<details>
<summary>1. If an incremental model's row count matches the source, is it correct?</summary>

No. In exercise T1, 16 rows matched 16 rows while the total was off by 300,000, because the
late edit never entered the batch. You must reconcile the **measure totals**, not just the
row count.

</details>

<details>
<summary>2. How does a generic test differ from a singular test?</summary>

A generic test is a **macro with parameters**, declared in YAML and reusable across many
columns and models. A singular test is **one `.sql` file for one specific situation**, with
no parameters. Both return *the wrong rows*; 0 rows is a pass.

</details>

<details>
<summary>3. Why should a surrogate key be a hash rather than a counter?</summary>

A hash is stable across rebuilds and across environments. A counter changes on every build,
and a fact pointing at the old key immediately points at the wrong row.

</details>

<details>
<summary>4. What moment is <code>dbt_valid_from</code>?</summary>

The moment **`dbt snapshot` ran**, not the business moment. Get that wrong and historical
reports skew with the job schedule.

</details>

## Related Topics

- [Writing an incremental model](../skills/viet-incremental-model.md) — exercise T1
- [Implementing tests in dbt](../skills/implementing-tests.md) — exercise T2
- [Writing macros and using Jinja logic](../skills/macro-va-jinja.md) — exercise T3
- [Managing dependencies with packages](../skills/quan-ly-package.md) — exercise T4
- [Snapshots — capturing change history](../skills/snapshot-scd2.md) — exercise T5
- [Advanced exercises](bt-03-nang-cao.md) — the next set
