---
title: dbt lab on DuckDB
sidebar_position: 1
description: Seven exercises really run, from dbt debug to switching to Trino — each with a box to paste output into.
tags: [dbt, duckdb, tutorial, lab, hands-on]
domain: data-engineering
category: technology
doc_type: tutorial
status: review
difficulty: beginner
verified_at: 2026-07-30       # exercises 1–3 have been run
lab: ~/Documents/learn-lab/dbt
updated: 2026-07-31
---
# dbt exercises

Do these in `~/Documents/learn-lab/dbt`. For each one, **really run it and paste the output into the
Result box**. Reading and understanding doesn't count.

> **Why the lab uses DuckDB rather than Trino `.60`.** Learning dbt on Trino means learning three
> things at once — dbt, Trino, Iceberg — and every error has three suspects, so you can't tell a
> misunderstanding of dbt from a cluster misconfiguration. DuckDB has no server, the whole warehouse is
> one file, and deleting it puts you back at zero. You switch to Trino in exercise 7, once dbt is no longer a variable.

The seed data is ready: `don_hang_chi_tiet.csv` (15 rows, orders with several line items) and
`hang_hoa.csv` (4 items). Small enough to inspect by eye — deliberately.

---

## Exercise 1 — Getting connected

**What to do:**

```bash
cd ~/Documents/learn-lab/dbt
.venv/bin/dbt debug --profiles-dir .
.venv/bin/dbt seed  --profiles-dir .
```

**Done when:** `All checks passed!` and the two seed tables are in `lab.duckdb`. Open that file with
`duckdb lab.duckdb` then `SELECT * FROM don_hang_chi_tiet;` to see the data for yourself.

**Result:** ✅ 2026-07-30 — pass.

---

## Exercise 2 — Your first model, and seeing what dbt GENERATES

**What to do:** create `models/stg_don_hang.sql`, just a `SELECT` from the seed, renaming columns and adding
a computed column `thanh_tien = so_luong * don_gia`. Run `dbt run`, then **open
`target/compiled/dbt_lab/models/stg_don_hang.sql`**.

**Done when:** you can compare the file you wrote against the file dbt generated, and say exactly what dbt
changed.

> This is where the core mental model becomes something you can see, rather than words on a page. Don't
> skip opening `target/compiled/`.

**Result:** ✅ 2026-07-30 — exactly one difference: `{{ ref(...) }}` → `"lab"."main"."don_hang_chi_tiet"`.
Details in [01-dbt-la-gi.md](../reference/what-is-dbt.md) §2.

---

## Exercise 3 — A test catching a grain error

**What to do:** add `models/schema.yml` and put a `unique` test on `stg_don_hang`'s `don_hang_id`.
Run `dbt test`.

**Done when:** the test **FAILS** — and you can explain why that's a wrong test rather than wrong data.
Then fix it to the right grain (hint: which *pair* of columns is the real grain?).

> The most important exercise in the whole module. Exactly the class of error that skews dashboard
> numbers without anybody noticing.

**Result:** ✅ 2026-07-30 — `FAIL 4`, the real grain is `(don_hang_id, dong)`.
The full output is in [06-test-va-data-quality.md](../reference/testing.md) §5.

---

## Exercise 4 — `ref()` builds the DAG

**What to do:** add `stg_hang_hoa.sql`, then `mart_doanh_thu_theo_nhom.sql` joining the two models through
`ref()`. Run `dbt run`, then `dbt docs generate && dbt docs serve`.

**Done when:** you rename `stg_don_hang.sql` and see dbt **report a dependency error** rather than running
regardless. Then try replacing `ref()` with the table name directly — and watch the DAG lose an edge.

**Result:**

---

## Exercise 5 — Materializations

**What to do:** switch the mart to `table`, then to `incremental` with `is_incremental()`. Run it twice
and compare the row count and the timing.

**Done when:** you can say what happens when an **old** order gets modified, and what `--full-refresh`
solves.

**Result:**

---

## Exercise 6 — The three data-quality layers

**What to do:** add a singular test in `tests/`, turn on `contract: enforced` for the mart, then write a
unit test for the `thanh_tien` formula.

**Done when:** you deliberately break each layer in turn and see **that exact layer** catch it:
wrong data → the test catches it; wrong column type → the contract blocks it before the build; wrong formula
→ the unit test catches it even though the data is valid.

**Result:**

---

## Exercise 7 — Switching to Trino

**Only do this after exercises 1–6 are finished.** Switch `profiles.yml` to `dbt-trino` pointing at
`.60:8080`. Re-run those same models.

**Done when:** you can say what had to change and what stayed the same — that's the real answer to
"how warehouse-independent is dbt".

> ⚠ The catalogs on `.60` are named `hdos_silver` / `polaris_silver`; there is **no catalog named
> `iceberg`**. See the "Mistakes already made" section in the [README](../index.md).

**Result:**

## Links

- [dbt contents](../index.md)
- [Trino](../../../query-engines/trino/index.md) — needed for exercise 7
