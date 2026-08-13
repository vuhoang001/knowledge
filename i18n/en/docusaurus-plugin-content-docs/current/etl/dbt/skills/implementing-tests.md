---
title: Implementing tests in dbt
sidebar_position: 1
description: "The six kinds of dbt test — where you declare each, how to write it, what it prints: generic, package, singular, your own generic, unit test, contract."
tags: [dbt, test, data-quality, dbt-utils, unit-test, contract]
domain: data-engineering
category: technology
doc_type: skill
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Implementing tests in dbt

> **Takeaway:** every dbt test is a piece of SQL that **returns the WRONG rows**. Returning 0 rows = pass.
> Get this backwards — writing SQL that "checks the correct rows" — and the test always fails.

[Testing and data quality](../reference/testing.md) explains *the three layers and why*. This page is
the **doing** part: where to declare each, what the syntax is, what output it produces.

All the output below was really run on dbt 1.12.0 + dbt-duckdb 1.10.1 + dbt_utils 1.4.1.

## The six kinds, and which to pick

| Kind | Where you declare it | Reusable | Use when |
|---|---|---|---|
| Built-in generic | `schema.yml` | ✅ | 90% of needs |
| From a package | `schema.yml` + `packages.yml` | ✅ | a common test dbt doesn't ship |
| Singular | a `.sql` file in `tests/` | ❌ one-off | a business rule specific to one table |
| Your own generic | a `{% raw %}{% test %}{% endraw %}` macro in `macros/` | ✅ | a rule repeated across several models |
| Unit test | `schema.yml`, the `unit_tests` section | — | checking **SQL logic**, no real data needed |
| Contract | `config: {contract: {enforced: true}}` | — | blocking a wrong schema **before** the table is created |

The first five run with `dbt test`. Contracts run during `dbt run`.

## 1. Built-in generics — the four of them

```yaml
# models/staging/schema.yml
version: 2

models:
  - name: stg_don_hang
    description: "Một dòng = một dòng hàng trong một đơn. Grain là cặp (don_hang_id, dong)."
    columns:
      - name: don_hang_id
        description: "Mã đơn hàng. KHÔNG unique — một đơn có nhiều dòng."
        data_tests: [not_null]
      - name: ma_hang
        data_tests:
          - not_null
          - relationships:
              to: ref('stg_hang_hoa')
              field: ma_hang
```

| Test | What it catches |
|---|---|
| `not_null` | The column has `NULL`s |
| `unique` | Repeated values |
| `accepted_values` | Values outside the allowed list |
| `relationships` | A foreign key pointing at something that doesn't exist |

> **`data_tests` or `tests`?** From dbt 1.8 onwards the correct name is `data_tests`. `tests` still
> runs but is deprecated.

Run it:

```bash
dbt test --select stg_don_hang
```

```text
1 of 5 PASS dbt_utils_unique_combination_of_columns_stg_don_hang_don_hang_id__dong  [PASS in 0.03s]
2 of 5 PASS not_null_stg_don_hang_don_hang_id .................................. [PASS in 0.02s]
3 of 5 PASS not_null_stg_don_hang_ma_hang ...................................... [PASS in 0.02s]
4 of 5 PASS not_null_stg_don_hang_thanh_tien ................................... [PASS in 0.01s]
5 of 5 PASS relationships_stg_don_hang_ma_hang__ma_hang__ref_stg_hang_hoa_ ..... [PASS in 0.02s]
Done. PASS=5 WARN=0 ERROR=0 SKIP=0 TOTAL=5
```

### What a failing test looks like

Add `unique` to `don_hang_id` — it sounds perfectly reasonable, but it's the **wrong grain**:

```text
6 of 6 FAIL 4 unique_stg_don_hang_don_hang_id .................................. [FAIL 4 in 0.01s]
  Got 4 results, configured to fail if != 0
Done. PASS=5 WARN=0 ERROR=1 SKIP=0 TOTAL=6
```

**The data is right, the test is wrong.** The grain is the *pair* `(don_hang_id, dong)`. This is exactly a
case really encountered — see the [case study](../reference/testing.md).

### Seeing **which rows** are wrong

`FAIL 4` only says there are 4 results. To know which rows:

```bash
dbt test --select stg_don_hang --store-failures
```

dbt writes the results into the `<schema>_dbt_test__audit` schema:

```text
┌──────────────┬───────────┐
│ unique_field │ n_records │
├──────────────┼───────────┤
│ DH001        │         2 │
│ DH003        │         3 │
│ DH005        │         2 │
│ DH007        │         2 │
└──────────────┴───────────┘
```

Four orders have several line items — exactly as the business describes.

### What a test actually compiles into

`target/compiled/.../unique_stg_don_hang_don_hang_id.sql`:

```sql
select
    don_hang_id as unique_field,
    count(*) as n_records
from "scratch"."main"."stg_don_hang"
where don_hang_id is not null
group by don_hang_id
having count(*) > 1
```

Exactly the principle: **return the wrong rows**. Reading this file removes all mystery from any test.

## 2. From a package — `dbt_utils`

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]
```

```bash
dbt deps        # Installed from version 1.4.1
```

Declare it at **model level** (belonging to no column) or at column level:

```yaml
models:
  - name: stg_don_hang
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [don_hang_id, dong]   # the right test for a composite grain
    columns:
      - name: thanh_tien
        data_tests:
          - dbt_utils.accepted_range: {min_value: 0, inclusive: false}
```

`unique_combination_of_columns` is the test you need **immediately** for any table with a composite grain —
something a single-column `unique` can't do.

## 3. Singular test — a rule specific to one table

A `.sql` file in `tests/`. Nothing else to declare; dbt picks it up itself.

```sql
-- tests/thanh_tien_khop_so_luong_don_gia.sql
-- Returns THE WRONG ROWS. 0 rows = pass.
select don_hang_id, dong, so_luong, don_gia, thanh_tien,
       so_luong * don_gia as thanh_tien_dung
from {{ ref('stg_don_hang') }}
where thanh_tien <> so_luong * don_gia
```

```text
9 of 9 PASS thanh_tien_khop_so_luong_don_gia ................................... [PASS in 0.01s]
```

Use it when the rule applies to **one** table only. Catching yourself copying this file to a second table is
the sign you should move to kind 4.

## 4. Your own generic — when the rule repeats

A macro in `macros/`, wrapped in `{% raw %}{% test %}{% endraw %}`:

```sql
-- macros/test_khong_am.sql
{% raw %}{% test khong_am(model, column_name) %}
select {{ column_name }} as gia_tri_sai, count(*) as so_dong
from {{ model }}
where {{ column_name }} < 0
group by 1
{% endtest %}{% endraw %}
```

dbt passes the two parameters `model` and `column_name` in itself. Use it like a built-in test:

```yaml
      - name: thanh_tien
        data_tests:
          - not_null
          - khong_am
```

```text
4 of 9 PASS khong_am_stg_don_hang_thanh_tien ................................... [PASS in 0.01s]
```

> dbt 1.12 emits a `MissingArgumentsPropertyInGenericTestDeprecation` warning for your own generic
> tests that don't declare `arguments:`. It still runs, but you should add it when upgrading.

## 5. `severity` — warning instead of blocking

Not every failure deserves to stop the pipeline:

```yaml
      - name: so_luong
        data_tests:
          - dbt_utils.accepted_range:
              min_value: 1
              config: {severity: warn}      # warn, don't block
```

| `severity` | Result |
|---|---|
| `error` (the default) | `dbt test` exits non-zero → CI red, the pipeline stops |
| `warn` | Reports `WARN`, exits 0 → carries on |

Use `warn` for a "should be true" rule you aren't sure about, or for old data you haven't finished cleaning.
There's also `error_if`/`warn_if` on a row-count threshold, e.g. `error_if: ">100"`.

## 6. Unit test — checking logic, no real data needed

The five kinds above check **data**. A unit test checks **SQL**: give it made-up input, compare against the
expected output.

```yaml
unit_tests:
  - name: test_thanh_tien_nhan_dung
    model: mart_doanh_thu_ngay
    given:
      - input: ref('stg_don_hang')
        rows:
          - {ngay: '2026-07-01', ma_hang: 'SP-A', thanh_tien: 300000}
          - {ngay: '2026-07-01', ma_hang: 'SP-A', thanh_tien: 200000}
      - input: ref('stg_hang_hoa')
        rows:
          - {ma_hang: 'SP-A', nhom: 'Điện tử'}
    expect:
      rows:
        - {ngay: '2026-07-01', nhom: 'Điện tử', doanh_thu: 500000, so_dong: 2}
```

```text
1 of 1 PASS mart_doanh_thu_ngay::test_thanh_tien_nhan_dung ..................... [PASS in 0.11s]
```

The biggest value: **it runs when there's no data yet**, and it catches the rare case the real data happens
not to contain. Declare only the columns the model uses — you don't have to declare the full schema.

## 7. Contract — blocking a wrong schema **before** the table is created

The five kinds above run **after** the table has been created. A contract runs during `dbt run`:

```yaml
models:
  - name: mart_doanh_thu_ngay
    config:
      contract: {enforced: true}
    columns:
      - name: ngay
        data_type: date
      - name: nhom
        data_type: varchar
      - name: doanh_thu
        data_type: int128
      - name: so_dong
        data_type: bigint
```

Matching declarations run normally. Declare the wrong type (`varchar` for a column returning a number):

```text
Compilation Error in model mart_doanh_thu_ngay
  This model has an enforced contract that failed.
  Please ensure the name, data_type, and number of columns in your contract
  match the columns in your model's definition.
  | column_name | definition_type | contract_type | mismatch_reason    |
  | doanh_thu   | HUGEINT         | VARCHAR       | data type mismatch |
```

**The table is not created.** That's the core difference: a test catches the error *after* the wrong data is
already sitting in the warehouse; a contract blocks it *before*.

Use it for tables other people depend on — a contract is a promise about the schema, and dbt enforces
that promise.

## The order to do it in

Don't write tests as they occur to you. The order for a new model:

1. **Establish the grain first.** Get this step wrong and every test after it is wrong — the `unique` case above.
2. `not_null` for keys and for the columns used to join.
3. `unique` for the **real** key — for a composite grain use `unique_combination_of_columns`.
4. `relationships` for every foreign key.
5. `accepted_values` for category columns.
6. A singular test for a rule specific to the business; promote it to a generic once it repeats across tables.
7. A contract for tables other people depend on.
8. A unit test for complex logic (window functions, allocation, multi-step calculations).

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Writing a test in the "check the correct rows" style | It always fails — a test must return **the wrong rows** |
| Single-column `unique` on a table with a composite grain | It fails even though the data is right; you must use `unique_combination_of_columns` |
| Not using `--store-failures` when debugging | You only know "FAIL 4", not which 4 rows |
| Leaving every test at `severity: error` | The pipeline stops over a rule you weren't sure about |
| Having tests but no contract | A table with the wrong schema still gets created and downstream users take the hit |
| Declaring every column in a unit test | Pointlessly long — only the columns the model actually uses are needed |
| Writing tests before establishing the grain | The test is wrong and you think the data is |

## Related Topics

- [Testing and data quality](../reference/testing.md) — the three layers and why, with a real case
- [Models and `ref()`](../reference/models-and-ref.md) — `target/compiled/` is where you read a test's SQL
- [Materializations](../reference/materializations.md) — tests are what catch an `incremental` running wrongly
- [Grain](../../../data-modeling/reference/grain.md) — must be established before writing tests
- [The six quality dimensions](../../../data-quality/six-dimensions.md) — which dimensions tests cover, which they miss
