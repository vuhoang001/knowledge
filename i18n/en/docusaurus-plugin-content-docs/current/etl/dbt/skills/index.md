---
title: Skills — dbt
sidebar_key: dbt-skills
sidebar_position: 0
description: "Techniques applied to a concrete situation — standing on top of the Reference group, not replacing it."
tags: [skill, dbt]
domain: data-engineering
category: index
doc_type: index
updated: 2026-09-11
---

# Skills — dbt

Techniques applied to a concrete situation — standing **on top of** the Reference group, not replacing it.

| # | Document | Answers the question | Status |
|---|---|---|---|
| 1 | [Setting up and configuring a project](khoi-tao-dbt-project.md) | Two files decide everything, and the three connection errors that eat a beginner's time | 📝 has real output |
| 2 | [Writing your first model with `ref()`](model-dau-tien-voi-ref.md) | One .sql file = one SELECT; `ref()` is the edge of the DAG | 📝 has real output |
| 3 | [Declaring sources and checking freshness](khai-bao-source.md) | `source()` is the declaration "this table isn't mine" | 📝 has real output |
| 4 | [Writing an incremental model](viet-incremental-model.md) | Trading run time for correctness obligations — and the late-arriving trap | 📝 has real output |
| 5 | [Implementing tests](implementing-tests.md) | The six kinds of test: where to declare them, what syntax, what output they produce | 📝 has real output |
| 6 | [Writing macros and Jinja logic](macro-va-jinja.md) | Jinja finishes before the SQL leaves your machine — debug in `target/compiled/` | 📝 has real output |
| 7 | [Snapshots — capturing history (SCD2)](snapshot-scd2.md) | A tape recorder, not a time machine | 📝 has real output |
| 8 | [Managing dependencies with packages](quan-ly-package.md) | `dbt_utils`, pinning versions, and why the lock file must be committed | 📝 has real output |
| 9 | [Writing documentation for a model](viet-documentation.md) | Machines generate structure, never meaning | 🟡 draft |
| 10 | [Setting up CI/CD for a dbt project](ci-cd-cho-dbt.md) | `state:modified+` turns a 40-minute CI into a 2-minute one | 📝 has real output |

## Related Topics

- [dbt](../index.md) — the topic this directory belongs to
