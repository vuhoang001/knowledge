---
title: dbt (data build tool)
description: SQL transforms with a DAG and tests — the T in ELT. dbt generates SQL, the warehouse runs SQL.
tags: [dbt, elt, transformation, data-engineering]
domain: data-engineering
category: technology
doc_type: index
status: review
difficulty: intermediate
verified_at: 2026-07-30
lab: ~/Documents/learn-lab/dbt
updated: 2026-07-31
---
# dbt (data build tool)

**dbt has no engine and moves no data.** It compiles SQL + Jinja into plain SQL and then sends it to the
warehouse to run. It's the **T** in ELT — not the E, not the L.

Get this wrong and everything follows: you'll go looking for "dbt is slow" when you should be looking
in the warehouse, and you'll think dbt can replace Spark/Flink.

**Lab:** `~/Documents/learn-lab/dbt` — its own venv, `dbt-duckdb`, seeds ready.
Run it with: `.venv/bin/dbt <command> --profiles-dir .`

## Contents — dbt's components

| # | Component | Answers the question | Status |
|---|---|---|---|
| 01 | [What dbt is](reference/what-is-dbt.md) | What it actually does, and what `ref()` and tests are | ✅ run |
| 02 | [The project structure](reference/project-structure.md) | `dbt_project.yml`, `profiles.yml`, `target/` | 📝 has real output |
| 03 | [Models and `ref()`](reference/models-and-ref.md) | The basic unit, and where the DAG comes from | 📝 has real output |
| 04 | [Sources, seeds, snapshots](reference/sources-seeds-snapshots.md) | Where data comes in from when it isn't a model | 📝 has real output |
| 05 | [Materializations](reference/materializations.md) | `view` / `table` / `incremental` / `ephemeral` | 📝 has real output |
| 06 | [Testing and data quality](reference/testing.md) | The 3 layers: test · contract · unit test | 📝 theory, not yet run |
| 07 | [Macros, Jinja, packages](reference/macros-jinja-packages.md) | When SQL starts getting copy-pasted | 📝 has real output |
| 08 | [Docs and lineage](reference/docs-and-lineage.md) | `dbt docs`, and impact analysis when changing a column | 📝 has real output |
| 09 | [Exercises](tutorials/dbt-lab-duckdb.md) | Really run, with the output pasted back | 🔄 in progress |

Symbols: ✅ run by hand · 📝 theory, unverified · 🔄 in progress · ⬜ not written

## The concept map

| Concept | What it is | When to use it |
|---|---|---|
| `model` | One `.sql` file = one `SELECT` → becomes a view/table | The basic unit; everything revolves around it |
| `ref()` | Points at another model | **Always**, instead of writing a table name — it's what builds the DAG |
| `source()` | Points at an existing table dbt didn't create | A table written by Spark/Flink/an ingest job |
| materialization | `view` / `table` / `incremental` / `ephemeral` | Decides what dbt creates |
| `incremental` | Process only new rows instead of rebuilding the whole table | Large fact tables |
| generic test | `unique`, `not_null`, `accepted_values`, `relationships` | Declared in YAML, covers 90% of needs |
| singular test | A `.sql` file returning **the offending rows** | Your own business rules |
| `seed` | A small CSV → a table | Hand-maintained lookup tables |
| `snapshot` | Captures changes over time (SCD2) | Slowly changing dimensions |
| macro / Jinja | A function that generates SQL | When you start copy-pasting SQL |
| `dbt_utils` | The community test/macro package | `unique_combination_of_columns` — needed right away |
| `dbt docs` | Generates a website + a lineage diagram | Handover, impact analysis |

## The learning path

- [x] **Understand** — be able to explain why dbt doesn't replace Spark, and what `ref()` is for
- [ ] **Run it** — models running on the DuckDB lab, with `dbt run` + `dbt test` green (exercises 1–3)
- [ ] **Fix it** — debug ≥3 real errors yourself, and be able to read `target/compiled/` (exercises 4–6)
- [ ] **Design it** — move those same models onto Trino, choose a materialization and defend the choice (exercise 7)

## Check yourself

Close the document, answer out loud, and only then open the answer.

<details>
<summary>1. Does dbt move data?</summary>

No. It compiles SQL and sends it to the warehouse to run. It has no computation engine of its own.
It's the T in ELT.

</details>

<details>
<summary>2. Why use <code>ref()</code> instead of writing the table name directly?</summary>

`ref()` is the only thing that tells dbt about a dependency. Write the table name directly and the DAG loses
an edge → dbt may run things in the wrong order, and the lineage lies. The danger is that **the model still
runs**, reporting no error at all.

</details>

<details>
<summary>3. What's the difference between <code>source()</code> and <code>ref()</code>?</summary>

`source()` = a table dbt did NOT create (written by Spark/Flink). `ref()` = a model dbt created
itself. Confuse them and dbt thinks it owns somebody else's table, and you also lose
`dbt source freshness`.

</details>

<details>
<summary>4. When <code>view</code>, when <code>table</code>, when <code>incremental</code>?</summary>

`view` — cheap, always fresh, but recomputed on every query; suits the staging layer.
`table` — fully rebuilt on every run; suits small and medium marts.
`incremental` — only appends new rows; suits large facts, in exchange for handling late-arriving edits yourself.

</details>

<details>
<summary>5. The <code>unique</code> test passes but the numbers are still wrong — what do I suspect first?</summary>

Suspect that you tested the wrong grain. A `unique` on exactly one column says nothing about a table with a
composite grain. Establish the grain BEFORE writing tests.

</details>

<details>
<summary>6. Where do I look to see the actual SQL dbt sent?</summary>

`target/compiled/`. That's the SQL after Jinja has rendered — what the warehouse actually receives.

</details>

## Mistakes already made

The details are in [`case-studies/`](case-studies/index.md) — this page only lists them.

| Date | Incident | Lesson |
|---|---|---|
| 2026-07-30 | [The AI generated the wrong Trino catalog name](case-studies/ai-sinh-sai-ten-catalog-trino.md) | Environment details must be verified by running a command, not by reading |
| 2026-07-30 | [`unique` on `don_hang_id`](reference/testing.md#5-a-real-case--the-test-fails-because-the-test-is-wrong-not-the-data) | Establish the grain before writing tests — the test was wrong, not the data |

## Sources

- [ ] docs.getdbt.com — the *Build your DAG* section (read it all, don't skip)
- [ ] `dbt_utils` — read the list of available tests before writing your own
- [ ] `dbt-trino` README — the Iceberg configuration section (saved for exercise 7)

## Related in this knowledge base

Documents about dbt that **aren't in this directory** — they live by *document type*
(`doc_type`) rather than by topic:

| Type | Document | Use when |
|---|---|---|
| Exercises | [dbt lab — DuckDB](tutorials/dbt-lab-duckdb.md) | really running it, with a box to paste output |
| Case study | *(none yet)* | a real dbt incident has been debugged |
| Cheatsheet | *(none yet)* | working, and needing a quick syntax lookup |
| Skills | [Implementing tests](skills/implementing-tests.md) | needing to write real tests, not understand the concept |

To see everything carrying this tag: **[`/tags/dbt`](/tags/dbt)** — that page gathers it all regardless
of directory.

## Links

- [Trino](../../query-engines/trino/index.md) — the target we move onto in exercise 7
- [Iceberg](../../storage/iceberg/index.md) — the table format under Trino
- [SQL](../../databases/sql/index.md) — the foundation of everything here
