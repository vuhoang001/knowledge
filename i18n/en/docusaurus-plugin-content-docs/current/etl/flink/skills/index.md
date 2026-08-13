---
title: Skills — Flink
sidebar_key: flink-skills
sidebar_position: 0
description: "You've got the reference; now, faced with situation X, what do you do."
tags: [skills, flink]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Skills — Flink

Each file assumes the [`reference/`](../reference/index.md) section is understood, and handles **one
specific situation**.

| # | Document | The question it answers | Status |
|---|---|---|---|
| 1 | [DataStream vs Table/SQL API](datastream-vs-table-sql.md) | Which API for which job, and the price of each choice | 📝 |
| 2 | [Windows](windows.md) | Tumbling, sliding, session; allowed lateness and side outputs | 📝 |
| 3 | [Savepoints and upgrading a job](savepoint-upgrade.md) | Changing code without losing state; why you need `uid()` | 📝 |
| 4 | [Connectors](connectors.md) | Kafka source/sink, Iceberg sink, CDC — connecting Flink to the world | 📝 |
| 5 | [Backpressure and tuning](backpressure-tuning.md) | Reading backpressure, tuning parallelism and the state backend | 📝 |

## Related Topics

- [Flink](../index.md) — the topic this directory belongs to
