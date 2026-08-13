---
title: Reference — dbt
sidebar_key: dbt-reference
sidebar_position: 0
description: "Explains what it is, why, and what the trade-offs are. Read this group first."
tags: [reference, dbt]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Reference — dbt

Explains *what it is, why, and what the trade-offs are*. Read this group first.

| # | Document | Answers the question | Status |
|---|---|---|---|
| 1 | [What dbt is and what it actually does](what-is-dbt.md) | See with your own eyes the SQL dbt generates: what ref() becomes, what a test compiles  | ✅ run by hand |
| 2 | [The structure of a dbt project](project-structure.md) | dbt_project.yml, profiles.yml, target/compiled — which directory holds what. | 🟡 draft |
| 3 | [Models and ref() — where the DAG comes from](models-and-ref.md) | ref() isn't shorthand for a table name, it's the only way to declare a d | 🟡 draft |
| 4 | [Sources, seeds and snapshots](sources-seeds-snapshots.md) | Three ways to bring data dbt didn't compute into the DAG — and why a snapshot  | 🟡 draft |
| 5 | [Materializations](materializations.md) | view, table, incremental, ephemeral — the same SELECT, a different thing dbt wra | 🟡 draft |
| 6 | [Testing and data quality in dbt](testing.md) | The three layers test/contract/unit test, the four test mechanisms, and a test failing because t | 📝 theory |
| 7 | [Macros, Jinja and packages](macros-jinja-packages.md) | Jinja runs before the SQL leaves your machine — and the threshold for writing a macro. | 🟡 draft |
| 8 | [dbt docs and lineage](docs-and-lineage.md) | The lineage diagram is exactly as accurate as your discipline with ref(). | 🟡 draft |

## Related Topics

- [dbt](../index.md) — the topic this directory belongs to
