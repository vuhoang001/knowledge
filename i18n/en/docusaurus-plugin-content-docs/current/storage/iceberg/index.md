---
title: Apache Iceberg
description: A table format, not a file format and not an engine — a metadata layer saying which files belong to the table at which point in time.
tags: [iceberg, table-format, lakehouse, time-travel, acid]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Apache Iceberg

**Iceberg is a table format, not a file format and not an engine.** The data is still
Parquet files on object storage; Iceberg adds a metadata layer saying *which files
belong to the table at which point in time*. That's where ACID, time travel and safe schema changes come from.

Status: **not started**. What follows is the planned table of contents; no file has been written yet.

## Contents — Iceberg's components

| # | Component | Answers the question | Status |
|---|---|---|---|
| 01 | What Iceberg is | Table format vs file format vs engine | ⬜ |
| 02 | The metadata tree | metadata file → manifest list → manifest → data file | ⬜ |
| 03 | Snapshots and time travel | Reading the table "as of 3pm yesterday" | ⬜ |
| 04 | Catalogs | REST, Hive, Glue, Polaris — who holds the pointer to the current metadata | ⬜ |
| 05 | Hidden partitioning | Why you don't have to write `WHERE ngay=...` as in Hive | ⬜ |
| 06 | Schema evolution | Renaming/adding/dropping columns without rewriting the data | ⬜ |
| 07 | Copy-on-write vs merge-on-read | The trade-off between fast writes and fast reads | ⬜ |
| 08 | Table maintenance | Compaction, expiring snapshots, removing orphan files | ⬜ |
| 09 | Exercises | Really run, with output | ⬜ |

## Why it matters

Without a table format, "a table" is just *a directory of files* — two jobs writing at once
breaks it, and reading during a write gives you a half-finished result. Iceberg solves exactly that.

Maintenance is the most commonly forgotten part: without compaction the table fills with small files and
queries get slower and slower; without expiring snapshots, storage grows forever.

## Links

- [Trino](../../query-engines/trino/index.md) — the engine that reads Iceberg
- [Flink](../../etl/flink/index.md) — writes into Iceberg
- [dbt](../../etl/dbt/index.md) — transforms on Iceberg through Trino
