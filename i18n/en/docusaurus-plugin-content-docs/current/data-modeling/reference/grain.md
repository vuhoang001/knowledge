---
title: Grain
sidebar_position: 1
description: What one row of this table represents — the question you must answer before writing the first line of SQL.
tags: [grain, data-modeling, kimball]
domain: data-engineering
category: concept
doc_type: reference
status: review
difficulty: beginner
verified_at: 2026-07-30      # really encountered in the dbt lab
updated: 2026-07-31
---

# Grain

> **Takeaway:** grain is the answer to *"what does one row of this table represent?"*.
> Answer it in **one clear sentence** and everything after it follows correctly. Write SQL before
> you can answer it and everything after it follows incorrectly.

## The goal

To block the most expensive class of error in data engineering: **row duplication and wrong tests** — both
of which stem from not knowing what a row means.

## Overview

The grain must be a sentence **specific enough to be indisputable**:

| ❌ Vague | ✅ Clear |
|---|---|
| "the orders table" | "one **line item** within one order" |
| "the customers table" | "one **version** of one customer" (if SCD Type 2) |
| "revenue" | "the revenue of **one product** on **one day** at **one store**" |

Whichever columns together uniquely identify a row — that's the grain. The `don_hang_chi_tiet` table
has the grain of the *pair* `(don_hang_id, dong)` — not `don_hang_id`.

**The direct consequence:** grain decides which tests are right, which joins are safe, and which `SUM`
gives a real number.

## The example

Really run 2026-07-30 at `~/Documents/learn-lab/dbt` (dbt 1.12.0 + DuckDB).

```text
don_hang_id,dong,ma_hang,so_luong,don_gia
DH001,1,SP-A,2,150000
DH001,2,SP-B,1,300000     ← cùng DH001, dòng 2
DH003,1,SP-C,1,900000
DH003,2,SP-A,3,150000
DH003,3,SP-B,2,300000     ← DH003 có 3 dòng
```

Putting `unique` on `don_hang_id` sounds perfectly reasonable — "the order code must be unique":

```text
1 of 1 FAIL 4 unique_vd_don_hang_don_hang_id ......... [FAIL 4]
Got 4 results, configured to fail if != 0
```

**The data is entirely correct. The test is wrong.** The grain is `(don_hang_id, dong)`, not
`don_hang_id`. The correct fix:

```yaml
tests:
  - dbt_utils.unique_combination_of_columns:
      combination_of_columns: [don_hang_id, dong]
```

```text
Done. PASS=3 WARN=0 ERROR=0 SKIP=0 TOTAL=3
```

## Trade-offs

| A finer grain | A coarser grain |
|---|---|
| Keeps every detail, and can be rolled up to any level | A small table, fast queries |
| A large table, slower queries | **Detail lost permanently** — it can't be split back down |

**Kimball's rule: always choose the finest grain you can.** Rolling up is always possible;
splitting back down is not. The same asymmetry as [SCD Type 1 vs Type 2](../skills/scd.md#trade-offs).

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Putting `unique` on a column you **assume** is the key | The test fails, and then the data gets blamed instead of the test getting fixed |
| Joining two tables of different grain without aggregating first | Rows duplicate → `SUM` doubles, with no error reported |
| Mixing two grains in one table (total rows + detail rows) | Every addition is doubly wrong |
| Not writing the grain into the documentation | Whoever comes next guesses wrongly, and doesn't know they're guessing |

## FAQ

<details>
<summary>How do I find the grain of an existing table with no documentation?</summary>

Try: `SELECT cot_a, cot_b, COUNT(*) FROM bang GROUP BY 1,2 HAVING COUNT(*) > 1`.
If it returns 0 rows then `(cot_a, cot_b)` is a grain candidate. But you still have to ask the business —
today's data having no duplicates doesn't mean tomorrow's won't.

</details>

<details>
<summary>Are grain and the primary key the same thing?</summary>

Almost. Grain is the *concept* ("what a row means"), and the primary key is the *column realising*
that concept. An SCD Type 2 table is where they separate most clearly: the grain is "one version
of one customer", while the PK is a surrogate key — an artificial column with no business meaning at all.

</details>

<details>
<summary>The <code>unique</code> test passes but the numbers are still wrong — what has that to do with grain?</summary>

Everything. `unique` on one column says nothing about a table with a composite grain. Establish the grain BEFORE
writing tests; don't write tests and then infer the grain.

</details>

## Related Topics

- [SCD](../skills/scd.md) — Type 2 **changes the grain** of a dimension
- [Facts and dimensions](fact-and-dimension.md) — each table kind has its own kind of grain
- [The design process](design-process.md) — grain is **step 2**, before choosing any columns
- [dbt: testing](../../etl/dbt/reference/testing.md) — where a wrong grain surfaces
- [SQL](../../databases/sql/index.md) — a join duplicating rows is a consequence of a wrong grain

## References

- Kimball & Ross — *The Data Warehouse Toolkit*, "Declare the grain" (step 2 of the 4 steps)
