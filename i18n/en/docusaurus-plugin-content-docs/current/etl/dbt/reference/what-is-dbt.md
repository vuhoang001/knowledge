---
title: What dbt is and what it actually does
sidebar_position: 1
description: "See with your own eyes the SQL dbt generates: what ref() becomes, what a test compiles into."
tags: [dbt, ref, jinja, compiled-sql]
domain: data-engineering
category: technology
doc_type: reference
status: stable
difficulty: beginner
verified_at: 2026-07-30
updated: 2026-07-31
---
# What dbt is and what it actually does

> **Takeaway:** dbt has no engine and moves no data. It takes your `.sql` files,
> pastes a few things in, produces plain SQL, and sends it to the warehouse to run. Everything else that
> remains — the DAG, the tests, the documentation — grows out of a single function: `ref()`.

All the output in this page was **really run** on 2026-07-30 at
`~/Documents/learn-lab/dbt` (dbt 1.12.0 + DuckDB). Not one section is a bare description.

---

## 1. The problem before dbt existed

You have raw data in the warehouse and need to turn it into usable tables. The old way:
a directory full of SQL files, run by hand in order.

Four things break immediately:

- **The order lives in the author's head.** `mart_doanh_thu.sql` has to run after
  `stg_don_hang.sql`, but nowhere says so. A newcomer running them in the wrong order
  gets an empty table without understanding why.
- **Changing a column, with no idea what breaks.** There's no dependency map.
- **No tests.** Wrong data only surfaces when somebody looks at a dashboard and finds it odd.
- **Where it runs is hardcoded into the SQL.** Database and schema names are scattered across dozens
  of files; changing environment means editing each one by hand.

dbt solves exactly those four. Nothing more.

---

## 2. What dbt actually does — seen with your own eyes

This is where getting it wrong makes everything after it wrong, so look at the real output.

**The file I wrote** (`models/vidu/vd_don_hang.sql`):

```sql
select
    don_hang_id,
    dong,
    ma_hang,
    so_luong,
    don_gia,
    so_luong * don_gia as thanh_tien
from {{ ref('don_hang_chi_tiet') }}
```

**Run:** `dbt run --select vd_don_hang`

```
1 of 1 START sql view model main.vd_don_hang ......... [RUN]
1 of 1 OK created sql view model main.vd_don_hang .... [OK in 0.11s]
Completed successfully
```

**The SQL dbt ACTUALLY sent** (`target/compiled/dbt_lab/models/vidu/vd_don_hang.sql`):

```sql
select
    don_hang_id,
    dong,
    ma_hang,
    so_luong,
    don_gia,
    so_luong * don_gia as thanh_tien
from "lab"."main"."don_hang_chi_tiet"
```

**Exactly one thing differs:** `{{ ref('don_hang_chi_tiet') }}` → `"lab"."main"."don_hang_chi_tiet"`.

That's it. That's the whole magic.

dbt doesn't run the `CREATE VIEW` itself either — it wraps the SELECT above in `create view ... as`
and hands it to DuckDB. **DuckDB does the work; dbt only composes the statement.**

> **Remember the path `target/compiled/`.** Every hard dbt problem becomes clear there, because
> it's what the warehouse actually receives. Guessing before opening it is a waste of time.

---

## 3. `ref()` — the most important function, and it isn't shorthand

At a glance, `ref('x')` looks like a shorthand for a table name. Wrong. It's **the only way
you declare a dependency**.

Every time dbt sees `ref('a')` in model `b`, it records an edge `a → b`. From that edge set:

| What dbt can do | Thanks to |
|---|---|
| know the run order by itself | a topological sort over the DAG |
| run exactly the affected branch (`--select x+`) | graph traversal |
| draw the lineage diagram in `dbt docs` | that same graph |
| report an error when a referenced model disappears | edge validation |

Writing `from lab.main.don_hang_chi_tiet` directly means **the model still runs** — and that's
precisely the danger. It runs, reports nothing, but the DAG has lost an edge: dbt may run things in
the wrong order, and the lineage diagram **lies to you**.

The rule with no exceptions: **never write a table name directly.**

### `ref()` versus `source()`

| | Points at | Who created that table |
|---|---|---|
| `ref('x')` | a model dbt created | dbt |
| `source('group', 'x')` | an existing table | somebody else (Spark, Flink, an ingest job) |

Confuse these and dbt thinks it owns somebody else's table — and you also lose the ability
to check source freshness (`dbt source freshness`).

---

## 4. What a test really is — also just SQL

A test in dbt sounds like a separate mechanism. It isn't. Look at the real output.

**Declared in `schema.yml`:**

```yaml
models:
  - name: vd_don_hang
    columns:
      - name: don_hang_id
        tests: [unique]
```

**dbt compiles that into:**

```sql
select
    don_hang_id as unique_field,
    count(*) as n_records
from "lab"."main"."vd_don_hang"
where don_hang_id is not null
group by don_hang_id
having count(*) > 1
```

It's just a `GROUP BY ... HAVING count > 1`.

**The principle behind every dbt test: the SQL returns THE OFFENDING ROWS. 0 rows returned = pass.**

Understand that and you'll never write a singular test wrongly again — you write a query that finds the
broken rows, not one that checks the correct ones.

---

## 5. A real case: the test fails because the test is wrong, not the data

This is the most common and most expensive mistake.

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

## 6. Other cases you'll meet

| Symptom | The usual cause | Where to look |
|---|---|---|
| The model runs but the table is empty | a missed join, or a `WHERE` filtering everything out | `target/compiled/` then run that query by hand |
| "dbt is slow" | the warehouse is slow, not dbt | `EXPLAIN` in the warehouse |
| You change a model and the table doesn't change | it's a `table` and you forgot to `dbt run` again | `dbt run --select x+` |
| The tests are green but the numbers are wrong | the **accuracy** dimension is missing — no test compares against the source | a singular reconciliation test |
| The lineage is missing an edge | a table name written directly instead of `ref()` | `dbt docs generate` |
| The source is dead while every test is green | `dbt source freshness` is missing | add `freshness` to the source |

---

## 7. What to remember if you can only remember three sentences

1. **dbt generates SQL, the warehouse runs SQL.** If it's slow, look in the warehouse.
2. **`ref()` is what builds the DAG.** Writing a table name directly breaks the DAG with no error.
3. **A test is SQL returning the offending rows.** On failure, suspect the grain first and the data second.

---

## Links

- [dbt contents](index.md) — the concept map and the other components
- [Models and `ref()`](models-and-ref.md) — going deeper on §3
- [Testing and data quality](testing.md) — going deeper on §4–5
- [Exercises](../tutorials/dbt-lab-duckdb.md) — run everything above again yourself
