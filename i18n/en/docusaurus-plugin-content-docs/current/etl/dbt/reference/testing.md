---
title: Testing and data quality in dbt
sidebar_position: 6
description: The three layers test/contract/unit test, the four test mechanisms, and the case where a test fails because the test is wrong rather than the data.
tags: [dbt, testing, data-quality, grain, contract]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:          # the 3-layer part hasn't been run by hand. §5 was run 2026-07-30
updated: 2026-07-31
---
# Testing and data quality — 3 layers, not just "write tests"

> **Takeaway:** Tests catch wrong data *after* it's been created. Contracts block a wrong schema *before*
> creation. Unit tests catch wrong SQL *with no data at all*. Three different things; don't call
> them all "tests".

Ask "how does dbt do data quality" and the usual answer lists the 4 built-in tests and stops.
But those 4 are one small corner, and choosing the wrong layer means the tests are green while the
data is still wrong.

---

## 1. The TEST layer — catching wrong data after it's created

Run with `dbt test`. There are **4 mechanisms**, differing in where you write them and whether they're reusable:

| Mechanism | Where you write it | Reusable | Use when |
|---|---|---|---|
| **Built-in generic** | `schema.yml` | ✅ | 90% of needs — the 4 below |
| **Singular** | a `.sql` file in `tests/` | ❌ one-off | a business rule specific to one table |
| **Your own generic** | a `{% test ten() %}` macro | ✅ | a rule repeated across several models |
| **From a package** | `packages.yml` | ✅ | `dbt_utils`, `dbt_expectations` |

The four built-in generics: `unique` · `not_null` · `accepted_values` · `relationships`.

**The principle behind every dbt test: the SQL returns THE OFFENDING ROWS. 0 rows returned = pass.**

This is where people get it backwards — write SQL that "checks the correct rows" and the test always fails.

```sql
-- tests/doanh_thu_khong_am.sql  → any row returned is a wrong row
select * from {{ ref('mart_doanh_thu') }} where thanh_tien < 0
```

## 2. The CONTRACT layer — blocking a wrong schema before creation

Since dbt 1.5. Declare the data types in `schema.yml` with `contract: enforced`, and the warehouse
**refuses to build** if the model produces the wrong type or is missing a column.

It differs from a test fundamentally: a test runs *afterwards*, so by the time it fires the broken table
already exists and a dashboard has already read it. A contract blocks *beforehand*, and the broken table is
never born.

Use it for models other people depend on (a mart an API reads).

## 3. The UNIT TEST layer — catching wrong SQL with no real data

Since dbt 1.8. Give it fake inputs, declare the expected output, and dbt runs the model's **logic**.

Completely different from the two layers above: tests and contracts check the **data**, a unit test checks the
**transformation**. A model with the wrong formula can still pass every `unique`/`not_null` —
the data is valid and the result is wrong.

Use it for models with complex logic: multi-branch classification, conditional calculations.

---

## 4. The six quality dimensions — dbt's tool for each

The six-dimension framework is **an industry-wide concept**, not dbt-specific — it's in
[Data Quality: the six dimensions](../../../data-quality/six-dimensions.md). Here we only
map them onto the corresponding dbt tools:

| Dimension | The dbt tool |
|---|---|
| **Uniqueness** | `unique`, `dbt_utils.unique_combination_of_columns` |
| **Completeness** | `not_null`, `dbt_utils.not_null_proportion` |
| **Validity** | `accepted_values`, `dbt_utils.accepted_range` |
| **Integrity** | `relationships` |
| **Timeliness** | `dbt source freshness` (declared on the **source**, not the model) |
| **Accuracy** | **no built-in test** — you must write a singular test reconciling against the source |

The last two are the most often skipped and catch the most expensive bugs. See the conceptual document
to understand why.

---

## 5. A real case — the test fails because the test is wrong, not the data

**Really run 2026-07-30** at `~/Documents/learn-lab/dbt` (dbt 1.12.0 + DuckDB).

The seed data: `don_hang_chi_tiet` — 15 rows, where each order has **several line items**:

```
don_hang_id,dong,ma_hang,so_luong,don_gia
DH001,1,SP-A,2,150000
DH001,2,SP-B,1,300000     ← cùng DH001, dòng 2
DH003,1,SP-C,1,900000
DH003,2,SP-A,3,150000
DH003,3,SP-B,2,300000     ← DH003 có 3 dòng
```

Putting `unique` on `don_hang_id` sounds perfectly reasonable — "the order code must be unique":

```
1 of 1 FAIL 4 unique_vd_don_hang_don_hang_id ......... [FAIL 4]
Got 4 results, configured to fail if != 0
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 TOTAL=1
```

Four orders have several lines → 4 results returned → fail.

**The data is entirely correct. The test is wrong.**

The cause: the **grain** was never established — what does one row of this table represent?
Not "one order", but "**one line item within one order**". The grain is the
*pair* `(don_hang_id, dong)`.

**The correct fix** — using `dbt_utils`:

```yaml
models:
  - name: vd_don_hang
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [don_hang_id, dong]
    columns:
      - name: don_hang_id
        tests: [not_null]
      - name: thanh_tien
        tests:
          - dbt_utils.accepted_range: {min_value: 0, inclusive: false}
```

```
1 of 3 PASS dbt_utils_accepted_range_vd_don_hang_thanh_tien ......... [PASS]
2 of 3 PASS dbt_utils_unique_combination_of_columns_..._dong ........ [PASS]
3 of 3 PASS not_null_vd_don_hang_don_hang_id ........................ [PASS]
Done. PASS=3 WARN=0 ERROR=0 SKIP=0 TOTAL=3
```

You need `packages.yml` + `dbt deps` first:

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]
```

> **The lesson is broader than dbt:** when a test fails, the first question isn't "where is the data
> wrong" but **"am I testing the right grain"**. Get that direction wrong and you either blame the
> data unfairly, or worse — change the data to match a wrong test.

---

## 6. Handling a failing test

Not everything that fails should block the pipeline:

```yaml
tests:
  - unique:
      config:
        severity: warn          # warn | error
        error_if: ">100"        # threshold: warn below 100, block from 100
        warn_if: ">0"
```

And **`dbt test --store-failures`** — save the failing rows into a table to inspect. Without
it you only know "37 rows are wrong", not what's wrong, and nobody will investigate.

## 7. The order to do it in (don't write tests as they occur to you)

1. **Establish the GRAIN first.** What does one row of this table represent? Get this
   step wrong and every test after it is wrong.
2. `not_null` + `unique` on that exact grain. For a composite grain use
   `dbt_utils.unique_combination_of_columns`, **not** a single-column `unique`.
3. `relationships` for every foreign key.
4. `accepted_values` for status and category columns.
5. `source freshness` for the sources.
6. Singular tests for business rules and for accuracy.
7. Contracts for models other people read.

## 8. Common mistakes

- Putting `unique` on a column you **assumed** was the key → it fails, and then you blame the data instead of fixing the test.
- Writing a singular test in the "check the correct rows" style rather than "return the wrong rows" → it always fails.
- Setting every test to `severity: error` → the pipeline is permanently red, then people start ignoring
  red, and at that point the tests are useless.
- Forgetting `freshness` → the source dies while every test stays green.

## Links

- [What dbt is](what-is-dbt.md) §4 — what SQL a test compiles into
- [Exercises](../tutorials/dbt-lab-duckdb.md) exercise 3 — re-run exactly the case in §5
- [dbt contents](index.md)
