---
title: Apache Kafka
description: Kafka is a log, not a queue — messages don't vanish once they've been read.
tags: [kafka, streaming, message-bus, cdc]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---
# Kafka

**Kafka is an append-only log, not a queue.** Messages don't vanish once they've been read — each
consumer holds its own reading position (`offset`). That's the root difference from RabbitMQ, and the
reason several consumer groups can read the same data independently. Misunderstand this point and
everything after it goes wrong: you'll go looking for "who took my message" while it's still sitting on disk.

> **A note on verification.** This knowledge base requires output to be **really run**. Kafka needs a cluster,
> so most of the output in the `reference/`/`skills/` groups is **illustrative numbers — not run**,
> labelled as such right next to it. Only the [exercises](tutorials/kafka-lab.md), which stand up a real broker
> with Docker, have output that's actually been run. `verified_at` stays empty until the repo owner runs it by hand.

## Contents — Kafka's components

| # | Component | The question it answers | Status |
|---|---|---|---|
| 01 | [What Kafka is](reference/what-is-kafka.md) | Log vs queue, when you need it and when you don't | 📝 |
| 02 | [Topic, partition, offset](reference/topic-partition-offset.md) | The unit of parallelism, how far ordering is guaranteed | 📝 |
| 03 | [Replication and durability](reference/replication-durability.md) | Leader/follower, ISR, `min.insync.replicas` | 📝 |
| 04 | [Retention and compaction](reference/retention-compaction.md) | Deleting by time vs keeping the latest per key | 📝 |
| 05 | [Delivery semantics](reference/delivery-semantics.md) | At-most/at-least/exactly-once; idempotence, transactions | 📝 |
| 06 | [Producer tuning](skills/producer-tuning.md) | `acks`, batching, key → partition, idempotence | 📝 |
| 07 | [Consumer groups and rebalance](skills/consumer-groups.md) | Rebalance, `auto.offset.reset`, committing offsets | 📝 |
| 08 | [Schema Registry](skills/schema-registry.md) | Avro/Protobuf, backward compatibility when the schema changes | 📝 |
| 09 | [Kafka Connect and CDC](skills/kafka-connect-cdc.md) | Debezium — capturing changes from a database | 📝 |
| 10 | [Operations and lag](skills/operations-lag.md) | Lag, `kafka-consumer-groups`, balancing partitions | 📝 |
| — | [Cheatsheet: CLI and config](cheatsheets/cli-and-config.md) | Quick lookup for commands and config while you work | 📝 |
| — | [Exercises: Docker](tutorials/kafka-lab.md) | Really run: produce, consume, rebalance, compaction | 📝 |

Symbols: ✅ run by hand · 📝 theory, illustrative output · 🟡 outline only · ⬜ not written

## Concept map

| Concept | What it is | When you touch it |
|---|---|---|
| topic | A named stream of messages, split into partitions | The unit of data organisation |
| partition | An ordered log — the unit of parallelism **and** the unit of ordering | When you want to scale or to preserve ordering |
| offset | A message's sequence number within a partition; held by the consumer | Re-reading, rewinding, measuring lag |
| producer | The writing side; picks the partition via the key, picks durability via `acks` | Getting data in |
| consumer group | A set of consumers dividing a topic's partitions among themselves | Reading in parallel, fault tolerance |
| replication factor | How many copies each partition has; the leader serves, followers copy | Surviving a broker failure |
| ISR | The set of replicas currently keeping up with the leader | Decides when a message counts as "durable" |
| retention | How long / how many bytes to keep before deleting by time | Keeping the log from growing without bound |
| log compaction | Keep **the latest value per key**, don't delete by time | "Current state" topics (CDC) |
| Schema Registry | A store of Avro/Protobuf schemas; enforces compatibility | Several teams reading the same topic |
| Kafka Connect | A framework for pulling/pushing data with no code; Debezium for CDC | Connecting database ↔ Kafka |
| consumer lag | The gap between the latest offset and the offset read | The number-one health metric |

## Learning path

- [ ] **Understand** — be able to explain why Kafka is a log rather than a queue, and that ordering is only guaranteed within one partition
- [ ] **Run it** — stand up a Docker broker, produce/consume, and see a consumer group **rebalance** with your own eyes ([exercises](tutorials/kafka-lab.md))
- [ ] **Fix it** — read consumer lag, diagnose continuous rebalancing, choose the right `acks` for a durability requirement
- [ ] **Design it** — choose the partition count, the key, and retention vs compaction for a real use case, and defend the choice

## Principles

Read all the docs without ever letting a consumer group **rebalance** and you know nothing about Kafka.
Three sentences you must know by heart:

1. **Ordering only within one partition.** If you need ordering per entity, that entity's messages must
   share one key → the same partition.
2. **`acks=all` + `min.insync.replicas=2` is what durable means.** `acks=1` loses data when the leader dies
   at the wrong moment.
3. **The consumer holds the offset, not the broker.** Re-reading the past is entirely normal.

## Common mistakes

Details in [`case-studies/`](case-studies/index.md).

| Incident | Lesson |
|---|---|
| [Losing ordering by changing the key](case-studies/mat-thu-tu-vi-doi-key.md) | Ordering is tied to the partition, the partition is tied to the key |
| [Rebalancing that never ends](case-studies/rebalance-lien-tuc.md) | Processing for longer than `max.poll.interval.ms` gets you kicked out of the group |
| [Losing data with acks=1](case-studies/mat-du-lieu-acks-1.md) | "Sent successfully" with `acks=1` doesn't mean durable |
| [Compaction not behaving as expected](case-studies/compaction-khong-nhu-mong-doi.md) | Compaction is a background process, not an immediate delete |

## Related Topics

- [Flink](../flink/index.md) — the engine that reads Kafka and does stateful stream processing
- [Schema Registry](skills/schema-registry.md) — the data contract between teams
- [Iceberg](../../storage/iceberg/index.md) — where Kafka usually flows to, via Flink
- [Data Engineering](../../index.md) — where Kafka sits on the data's journey

## Sources

- [ ] Kafka: The Definitive Guide (Confluent) — the chapters on the log, replication, exactly-once
- [ ] The official kafka.apache.org docs — read *Design* before *Configuration*
