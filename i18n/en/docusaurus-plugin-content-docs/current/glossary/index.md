---
title: Glossary
description: Terms used throughout the knowledge base — a one-line definition plus a link to the full document.
tags: [glossary]
category: index
doc_type: index
updated: 2026-07-31
---

# Glossary

**One-line** definitions. Follow the link when you need depth. The English terms are kept
as-is — six months from now you'll type `grain`, `incremental`, `rebalance`, not a
translation of them.

## Data Modeling

| Term | In one line | Details |
|---|---|---|
| **Grain** | What a single row of the table represents | [→](../data-modeling/reference/grain.md) |
| **Fact** | Table of measurable numbers, long and narrow, grows every day | [→](../data-modeling/reference/fact-and-dimension.md) |
| **Dimension** | Table describing an entity, short and wide, changes slowly | [→](../data-modeling/reference/fact-and-dimension.md) |
| **SCD** | How to handle history when a dimension attribute changes | [→](../data-modeling/skills/scd.md) |
| **as-was / as-is** | A report using the value *back then* / the value *right now* | [→](../data-modeling/skills/scd.md) |
| **Natural key** | The identifier the source system generates (`KH001`) | [→](../data-modeling/reference/surrogate-key.md) |
| **Surrogate key** | The identifier the warehouse generates, carrying no business meaning | [→](../data-modeling/reference/surrogate-key.md) |
| **Conformed dimension** | A dimension shared across several business processes | [→](../data-modeling/skills/conformed-dimension.md) |
| **Bus matrix** | A process × dimension matrix, to see what is shared | [→](../data-modeling/reference/design-process.md) |
| **Star schema** | Fact in the middle, flattened dimensions around it | [→](../data-modeling/reference/star-snowflake-obt.md) |
| **OBT** | One Big Table — every attribute embedded in the fact, no joins | [→](../data-modeling/reference/star-snowflake-obt.md) |
| **Additive** | A measure that sums along every dimension | [→](../data-modeling/reference/fact-and-dimension.md) |
| **Semi-additive** | A measure that doesn't sum over time (an end-of-day balance) | [→](../data-modeling/reference/fact-and-dimension.md) |
| **Late-arriving dimension** | The fact arrives before the dimension → no surrogate key to look up yet | [→](../data-modeling/skills/scd.md) |

## Data Quality

| Term | In one line | Details |
|---|---|---|
| **Accuracy** | Do the numbers match reality — the one dimension with no ready-made test | [→](../data-quality/six-dimensions.md) |
| **Timeliness** | Is the data too old — the source is dead and the tests are still green | [→](../data-quality/six-dimensions.md) |
| **Contract** | Declare column types so the warehouse **refuses to build** when a model's schema is wrong | [→](../data-quality/index.md) |
| **Singular test** | A `.sql` file returning **the offending rows**; 0 rows = pass | [→](../etl/dbt/reference/testing.md) |

## dbt

| Term | In one line | Details |
|---|---|---|
| **model** | One `.sql` file = one `SELECT` → becomes a view/table | [→](../etl/dbt/reference/models-and-ref.md) |
| **`ref()`** | The only way to declare a dependency — what builds the DAG | [→](../etl/dbt/reference/models-and-ref.md) |
| **`source()`** | Points at a table dbt does **not** create | [→](../etl/dbt/reference/sources-seeds-snapshots.md) |
| **materialization** | What dbt wraps around your `SELECT` | [→](../etl/dbt/reference/materializations.md) |
| **incremental** | Process only new rows instead of rebuilding the whole table | [→](../etl/dbt/reference/materializations.md) |
| **snapshot** | dbt's tool for implementing SCD Type 2 — **cannot be rebuilt** | [→](../etl/dbt/reference/sources-seeds-snapshots.md) |
| **`target/compiled/`** | The SQL after Jinja rendering — what the warehouse actually receives | [→](../etl/dbt/reference/what-is-dbt.md) |

## Lakehouse

| Term | In one line | Details |
|---|---|---|
| **Table format** | A metadata layer saying which files belong to the table at which point in time | [→](../storage/iceberg/index.md) |
| **Time travel** | Read the table as it stood at a past point in time | [→](../storage/iceberg/index.md) |
| **Catalog** | Where the pointer to a table's current metadata is kept | [→](../storage/iceberg/index.md) |
| **Consumer group** | A group of Kafka consumers splitting partitions, each keeping its own offset | [→](../etl/kafka/index.md) |
| **Watermark** | The mark where Flink considers "all data up to this time has arrived" | [→](../etl/flink/index.md) |
| **`logical_date`** | The data period Airflow is processing — **not** the run time | [→](../orchestration/airflow/index.md) |

---

**Rule for adding an entry:** a term enters the glossary once it appears in **≥2 documents**.
If it's used in only one place, define it there and don't let the glossary bloat.
