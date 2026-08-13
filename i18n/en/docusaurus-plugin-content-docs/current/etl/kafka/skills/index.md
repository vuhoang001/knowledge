---
title: Skills — Kafka
sidebar_key: kafka-skills
sidebar_position: 0
description: "You've got the reference; now, faced with situation X, what do you do."
tags: [skills, kafka]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Skills — Kafka

Each file assumes the [`reference/`](../reference/index.md) section is understood, and handles **one
specific situation**.

| # | Document | The question it answers | Status |
|---|---|---|---|
| 1 | [Producer tuning](producer-tuning.md) | `acks`, batching, the partitioner, idempotence — what to tune for what | 📝 |
| 2 | [Consumer groups and rebalance](consumer-groups.md) | Committing offsets, `auto.offset.reset`, rebalancing that won't stop | 📝 |
| 3 | [Schema Registry](schema-registry.md) | Avro/Protobuf, compatibility when the schema changes | 📝 |
| 4 | [Kafka Connect and CDC](kafka-connect-cdc.md) | Debezium capturing database changes with no code | 📝 |
| 5 | [Operations and lag](operations-lag.md) | Measuring lag, balancing partitions, reading `kafka-consumer-groups` | 📝 |

## Related Topics

- [Kafka](../index.md) — the topic this directory belongs to
