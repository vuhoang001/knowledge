---
title: SQL
description: "Learn exactly the part dbt and Trino demand you be solid on: grain, joins, window functions, execution plans."
tags: [sql, grain, join, window-function]
domain: data-engineering
category: concept
doc_type: index
status: draft
difficulty: beginner
verified_at:
updated: 2026-07-31
---
# SQL

Don't learn SQL from scratch — learn exactly the part **dbt and Trino demand you be solid on**: window
functions, CTEs, grain, and being able to read an execution plan.

Status: **not started**. What follows is the planned table of contents; no file has been written yet.

## Contents

| # | Topic | Answers the question | Status |
|---|---|---|---|
| 01 | The real execution order | `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` | ⬜ |
| 02 | Grain | What one row represents — the root of every duplication bug | ⬜ |
| 03 | Joins | Inner/left/full, and why a join makes numbers go **up** | ⬜ |
| 04 | Aggregates | `GROUP BY`, `HAVING`, `COUNT(*)` vs `COUNT(cot)` | ⬜ |
| 05 | Window functions | `OVER (PARTITION BY ... ORDER BY ...)`, `ROW_NUMBER` vs `RANK` | ⬜ |
| 06 | CTEs | `WITH`, reading top-down instead of nested subqueries | ⬜ |
| 07 | NULL | Three-valued logic — where `NOT IN` gives a mysteriously empty result | ⬜ |
| 08 | Reading an execution plan | `EXPLAIN ANALYZE` — guessing is a waste of time | ⬜ |

## The focus

**Grain is the most important concept here**, not the syntax. Get the grain wrong and a
join duplicates rows, `SUM` doubles, and a `unique` test fails unjustly — all three have really happened
in [dbt](../../etl/dbt/reference/testing.md) §5.

## Links

- [dbt](../../etl/dbt/index.md) — SQL with a DAG and tests wrapped around it
- [Trino](../../query-engines/trino/index.md) — where the SQL actually runs
