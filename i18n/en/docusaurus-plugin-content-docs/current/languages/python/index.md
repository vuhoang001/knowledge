---
title: Python for Data Engineering
description: The part of Python data infrastructure actually uses — DAGs, files, timezones, and when NOT to use pandas.
tags: [python, airflow, pandas, etl]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: beginner
verified_at:
updated: 2026-07-31
---
# Python

Learn the part of Python that **data infrastructure actually uses**: writing Airflow DAGs, calling APIs,
handling files, and packaging an environment that runs again on another machine.

Status: **not started**. What follows is the planned table of contents; no file has been written yet.

## Contents

| # | Topic | Answers the question | Status |
|---|---|---|---|
| 01 | The environment | `venv`, `pip`, `requirements.txt` — why not to install globally | ⬜ |
| 02 | The data types you need | `dict`, `list`, comprehensions, unpacking | ⬜ |
| 03 | Files and formats | CSV, JSON, YAML, Parquet via `pyarrow` | ⬜ |
| 04 | Dates, times and timezones | `datetime`, UTC vs local — the classic source of wrong numbers | ⬜ |
| 05 | Errors and logging | `try/except` in the right place, `logging` instead of `print` | ⬜ |
| 06 | Calling APIs | `requests`, retries, pagination | ⬜ |
| 07 | pandas | When to use it, and when to push the work back to SQL instead of pulling data to your machine | ⬜ |
| 08 | Writing re-runnable scripts | Command-line arguments, idempotency, running twice without breaking | ⬜ |

## The principle

**Push the work to the warehouse; don't pull the data into Python.** The common beginner mistake:
`SELECT *` and then filter with pandas. It works with 10 thousand rows and dies with 10 million.

## Links

- [Airflow](../../orchestration/airflow/index.md) — where Python is used most
- [SQL](../../databases/sql/index.md) — what should do the heavy work instead of Python
