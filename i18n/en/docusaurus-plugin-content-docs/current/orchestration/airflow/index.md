---
title: Apache Airflow
description: Airflow coordinates, it doesn't process — and logical_date is not 'now'.
tags: [airflow, orchestration, dag, scheduling, idempotency]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Apache Airflow

**Airflow coordinates, it doesn't process.** It decides *what runs when and after what*;
the heavy work always lives in another system (Trino, Spark, dbt). An Airflow task that processes data itself
is a sign of using the wrong tool.

Status: **not started**. What follows is the planned table of contents; no file has been written yet.

## Contents — Airflow's components

| # | Component | Answers the question | Status |
|---|---|---|---|
| 01 | What Airflow is | Coordination vs processing, when you need it and when cron is enough | ⬜ |
| 02 | DAG, task, operator | The basic units, and how to declare dependencies | ⬜ |
| 03 | The scheduler and execution date | `logical_date` ≠ the run time — the classic misunderstanding | ⬜ |
| 04 | Backfill and catchup | Running the past without duplicating data | ⬜ |
| 05 | Idempotency | Re-running a task must give the same result — why it's mandatory | ⬜ |
| 06 | Sensors and triggers | Waiting on a file/table, `poke` vs `reschedule`, deferrable | ⬜ |
| 07 | XCom and variables | Passing data between tasks — and why to limit it | ⬜ |
| 08 | Executors | Local, Celery, Kubernetes — how they differ | ⬜ |
| 09 | Retries, SLAs, alerting | A task breaks at 3am — who finds out | ⬜ |
| 10 | Exercises | Really run, with output | ⬜ |

## A trap known in advance

**`logical_date` is not "now".** A DAG running daily at 01:00 on 31/07 has a
`logical_date` of 30/07 — it processes *the interval that just closed*. Writing a task against
`datetime.now()` means a backfill produces wrong numbers and nobody notices.

## Links

- [dbt](../../etl/dbt/index.md) — what Airflow usually calls
- [Trino](../../query-engines/trino/index.md) — where the heavy work actually runs
