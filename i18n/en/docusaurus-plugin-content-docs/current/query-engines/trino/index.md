---
title: Trino
description: A distributed query engine that stores no data — reading from many sources through connectors.
tags: [trino, query-engine, federation, explain-analyze]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-11
---
# Trino

**Trino is a query engine; it stores no data.** It reads from elsewhere (Iceberg, Hive,
PostgreSQL, Kafka) through connectors, computes in memory, and returns the result. No table is
"Trino's".

Status: **not started**. What follows is the planned table of contents; no file has been written yet.

## Contents — Trino's components

| # | Component | Answers the question | Status |
|---|---|---|---|
| 01 | What Trino is | Query engine vs warehouse, and when it fits | ⬜ |
| 02 | The architecture | Coordinator, worker, stage, split, task | ⬜ |
| 03 | Catalog, schema, table | `SHOW CATALOGS` — the three naming levels | ⬜ |
| 04 | Connectors | Iceberg, Hive, PostgreSQL — what federation means | ⬜ |
| 05 | Reading `EXPLAIN ANALYZE` | The only place that tells you where a query is slow | ⬜ |
| 06 | Joins and data distribution | Broadcast vs partitioned, and join order | ⬜ |
| 07 | Predicate pushdown | Why filtering early is what makes it fast, and when pushdown fails | ⬜ |
| 08 | Memory and spilling | A query dies out of memory — what do you tune | ⬜ |
| 09 | Exercises | Really run, with output | ⬜ |

## Getting your own cluster's details

This page **deliberately names no host and no specific catalog** — every Trino cluster is different,
and copying names out of somebody else's documentation is the fastest way to lose an afternoon
debugging.

Ask the cluster itself what it is called:

```sql
SHOW CATALOGS;                  -- exactly which catalogs exist
SHOW SCHEMAS FROM <catalog>;    -- which schemas live in that catalog
SHOW TABLES FROM <catalog>.<schema>;
```

Copy the output back, and only then write it into `profiles.yml`. Don't guess names: `iceberg`,
`hive`, `lakehouse` all read plausibly but **they are connector names, not catalog names** — what a
catalog is called is chosen by whoever built the cluster.

This is exactly the spot that once cost an afternoon of debugging dbt while the error was nothing but
a catalog name. See [dbt § Mistakes already made](../../etl/dbt/index.md#mistakes-already-made).

## Links

- [Iceberg](../../storage/iceberg/index.md) — what Trino reads
- [dbt](../../etl/dbt/index.md) — generates the SQL Trino runs
