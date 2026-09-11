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
updated: 2026-09-11
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
| 09 | [dbt Core and dbt Cloud](reference/dbt-core-vs-cloud.md) | Same engine, different shell — choose by the piece your team is missing | 🟡 draft |
| 10 | [Layering and naming](reference/layer-va-dat-ten.md) | staging → intermediate → marts: three rules, all greppable | 📝 has real output |

## Contents — skills (being able to do it, not just understand it)

| # | Skill | Answers the question | Status |
|---|---|---|---|
| 01 | [Setting up a project](skills/khoi-tao-dbt-project.md) | From `pip install` to a green `dbt debug` | 📝 has real output |
| 02 | [First model with `ref()`](skills/model-dau-tien-voi-ref.md) | One `SELECT`, no `create`, no `;` | 📝 has real output |
| 03 | [Declaring sources](skills/khai-bao-source.md) | `source()` + `freshness`, and why `STALE` isn't always a failure | 📝 has real output |
| 04 | [Incremental models](skills/viet-incremental-model.md) | The four questions to answer before turning it on | 📝 has real output |
| 05 | [Implementing tests](skills/implementing-tests.md) | Six kinds of test, where to declare them, what output they give | 📝 has real output |
| 06 | [Macros and Jinja](skills/macro-va-jinja.md) | Jinja runs first; debug in `target/compiled/` | 📝 has real output |
| 07 | [SCD2 snapshots](skills/snapshot-scd2.md) | A tape recorder, not a time machine | 📝 has real output |
| 08 | [Managing packages](skills/quan-ly-package.md) | `dbt_utils`, and why the lock file must be committed | 📝 has real output |
| 09 | [Writing documentation](skills/viet-documentation.md) | Grain, units, warnings — what a machine can't infer | 🟡 draft |
| 10 | [CI/CD for dbt](skills/ci-cd-cho-dbt.md) | `state:modified+ --defer` | 📝 has real output |

## Contents — exercises, quick reference, incidents

| # | Document | Answers the question | Status |
|---|---|---|---|
| EX | [dbt lab on DuckDB](tutorials/dbt-lab-duckdb.md) | Seven exercises from `dbt debug` to Trino | ✅ run by hand |
| EX | [Exercises — Basic](tutorials/bt-01-co-ban.md) | 5 exercises, each with the answer it must produce | 📝 has real output |
| EX | [Exercises — Intermediate](tutorials/bt-02-trung-binh.md) | 5 exercises on errors that raise no error | 📝 has real output |
| EX | [Exercises — Advanced](tutorials/bt-03-nang-cao.md) | 5 exercises that only surface in production | 📝 has real output |
| CH | [dbt quick reference](cheatsheets/tra-nhanh-dbt.md) | CLI, selectors, Jinja, YAML, materializations, naming | 📝 has real output |
| CS | [The incremental model dropped a late-edited order](case-studies/incremental-mat-don-sua-muon.md) | Off by 300k while the row count still matched | 📝 has real output |
| CS | [The snapshot recorded the wrong timestamp](case-studies/snapshot-ghi-nham-moc-thoi-gian.md) | as-was off by 25% | 📝 has real output |
| CS | [Shipping fees double-counted after a join](case-studies/phi-ship-cong-lap-sau-join.md) | Inflated 7% because the join changed the grain | 📝 has real output |

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
| 2026-09-11 | [The incremental model dropped a late-edited order](case-studies/incremental-mat-don-sua-muon.md) | A matching row count doesn't prove the data is right — reconcile the measure totals |
| 2026-09-11 | [The snapshot recorded the wrong timestamp](case-studies/snapshot-ghi-nham-moc-thoi-gian.md) | `dbt_valid_from` is the job's run time, not business time |
| 2026-09-11 | [Shipping fees double-counted after a join](case-studies/phi-ship-cong-lap-sau-join.md) | After every join, ask again: what is one row now? |

## Sources

- [ ] docs.getdbt.com — the *Build your DAG* section (read it all, don't skip)
- [ ] `dbt_utils` — read the list of available tests before writing your own
- [ ] `dbt-trino` README — the Iceberg configuration section (saved for exercise 7)

## Related in this knowledge base

Documents about dbt that **aren't in this directory** — they live by *document type*
(`doc_type`) rather than by topic:

| Type | Document | Use when |
|---|---|---|
| Exercises | [Basic](tutorials/bt-01-co-ban.md) · [Intermediate](tutorials/bt-02-trung-binh.md) · [Advanced](tutorials/bt-03-nang-cao.md) · [DuckDB lab](tutorials/dbt-lab-duckdb.md) | really running it, with the answer it must produce |
| Case study | [three reconstructed incidents](case-studies/index.md) | a real dbt incident has been debugged |
| Cheatsheet | [dbt quick reference](cheatsheets/tra-nhanh-dbt.md) | working, and needing a quick syntax lookup |
| Skills | [ten skills](skills/index.md) | needing to be able to do it, not understand the concept |

To see everything carrying this tag: **[`/tags/dbt`](/tags/dbt)** — that page gathers it all regardless
of directory.

## Links

- [Trino](../../query-engines/trino/index.md) — the target we move onto in exercise 7
- [Iceberg](../../storage/iceberg/index.md) — the table format under Trino
- [SQL](../../databases/sql/index.md) — the foundation of everything here
