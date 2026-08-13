---
title: Reference — Kafka
sidebar_key: kafka-reference
sidebar_position: 0
description: "Explains what it is, why, and what the trade-offs are. Read this group first."
tags: [reference, kafka]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Reference — Kafka

Explains *what it is, why, and what the trade-offs are*. Read this group before moving on to `skills/`.

| # | Document | The question it answers | Status |
|---|---|---|---|
| 1 | [What Kafka is](what-is-kafka.md) | Log vs queue: why messages aren't lost once read | 📝 |
| 2 | [Topic, partition, offset](topic-partition-offset.md) | The unit of parallelism; ordering only within one partition | 📝 |
| 3 | [Replication and durability](replication-durability.md) | Leader/follower, ISR, `min.insync.replicas` | 📝 |
| 4 | [Retention and compaction](retention-compaction.md) | Deleting by time vs keeping the latest per key | 📝 |
| 5 | [Delivery semantics](delivery-semantics.md) | At-most/at-least/exactly-once; the idempotent producer, transactions | 📝 |

Symbols: ✅ run by hand · 📝 theory, illustrative output · 🟡 outline only · ⬜ not written

## Related Topics

- [Kafka](../index.md) — the topic this directory belongs to
