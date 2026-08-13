---
title: Kafka CLI and config
sidebar_position: 1
description: "A lookup table of the kafka-* commands and the important configs by group."
tags: [kafka, cli, config, cheatsheet]
domain: data-engineering
category: concept
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Kafka CLI and config

> **Takeaway:** a quick lookup while you work. Every default listed below is the **documented default** — re-check it with `--describe` on your own cluster before trusting it.

Assumes `--bootstrap-server localhost:9092` (port **9092** is the common default). The command name may be `kafka-topics.sh` or `kafka-topics` depending on the packaging.

## Commands by group

### Topics

| Task | Command |
|---|---|
| Create a topic | `kafka-topics --create --topic t --partitions 6 --replication-factor 3 --bootstrap-server localhost:9092` |
| List | `kafka-topics --list --bootstrap-server localhost:9092` |
| Show details (leader/ISR) | `kafka-topics --describe --topic t --bootstrap-server localhost:9092` |
| Change the partition count | `kafka-topics --alter --topic t --partitions 12 --bootstrap-server localhost:9092` |
| Change a topic config | `kafka-configs --alter --entity-type topics --entity-name t --add-config retention.ms=604800000 --bootstrap-server localhost:9092` |
| Delete a topic | `kafka-topics --delete --topic t --bootstrap-server localhost:9092` |

> Decreasing partitions is **not** possible — only increasing. And increasing also breaks the old key distribution (see the change-the-key case study).

### Produce / consume

| Task | Command |
|---|---|
| Send by hand | `kafka-console-producer --topic t --bootstrap-server localhost:9092` |
| Send with a key | `kafka-console-producer --topic t --property parse.key=true --property key.separator=: --bootstrap-server localhost:9092` |
| Read from the beginning | `kafka-console-consumer --topic t --from-beginning --bootstrap-server localhost:9092` |
| Read with key + partition | `kafka-console-consumer --topic t --from-beginning --property print.key=true --property print.partition=true --bootstrap-server localhost:9092` |
| Read within a group | `kafka-console-consumer --topic t --group g --bootstrap-server localhost:9092` |

### Consumer groups

| Task | Command |
|---|---|
| List groups | `kafka-consumer-groups --list --bootstrap-server localhost:9092` |
| Show lag + assignment | `kafka-consumer-groups --describe --group g --bootstrap-server localhost:9092` |
| Reset offsets to the start (dry run) | `kafka-consumer-groups --reset-offsets --to-earliest --group g --topic t --dry-run --bootstrap-server localhost:9092` |
| Reset and write (`--execute`) | replace `--dry-run` with `--execute` |
| Reset to a point in time | `--reset-offsets --to-datetime 2026-08-11T00:00:00.000 --group g --topic t --execute ...` |

> `--reset-offsets` only runs when **no consumer is active** in the group.

### Reassigning partitions (balancing brokers)

| Task | Command |
|---|---|
| Generate a plan | `kafka-reassign-partitions --generate --topics-to-move-json-file topics.json --broker-list "1,2,3" --bootstrap-server localhost:9092` |
| Execute | `kafka-reassign-partitions --execute --reassignment-json-file plan.json --bootstrap-server localhost:9092` |
| Check progress | `kafka-reassign-partitions --verify --reassignment-json-file plan.json --bootstrap-server localhost:9092` |

## Config by group

Default notation: **(documented default)** — it can differ by version, so always confirm.

### Producer

| Config | Meaning | Documented default |
|---|---|---|
| `acks` | Who must confirm the write: `0`/`1`/`all` | `all` (newer clients) / `1` (historical) |
| `enable.idempotence` | Prevents duplicate writes on retry | `true` (newer clients) |
| `linger.ms` | Waiting to gather a batch before sending | `0` |
| `batch.size` | The maximum batch size per partition (bytes) | `16384` |
| `compression.type` | `none`/`gzip`/`snappy`/`lz4`/`zstd` | `none` |

> `acks=all` + `min.insync.replicas>=2` is what durable means (see the `acks=1` case study).

### Consumer

| Config | Meaning | Documented default |
|---|---|---|
| `group.id` | The consumer group name | (must be set) |
| `auto.offset.reset` | With no offset yet: `earliest`/`latest`/`none` | `latest` |
| `enable.auto.commit` | Commits offsets periodically by itself | `true` |
| `max.poll.records` | The maximum records per `poll()` | `500` |
| `max.poll.interval.ms` | The maximum gap between two `poll()` calls before being kicked | `300000` |
| `session.timeout.ms` | How long without a heartbeat before being treated as dead | `45000` |

> `max.poll.interval.ms` (is it still polling) differs from `session.timeout.ms` (is it still heartbeating) — see the rebalance case study.

### Topic / broker

| Config | Meaning | Documented default |
|---|---|---|
| `replication.factor` | The number of copies per partition | (set at topic creation) |
| `min.insync.replicas` | The minimum in-sync replicas for an `acks=all` write to succeed | `1` |
| `retention.ms` | How long messages are kept (the delete policy) | `604800000` (7 days) |
| `cleanup.policy` | `delete` / `compact` / `compact,delete` | `delete` |
| `segment.ms` | How long before a segment is closed | `604800000` |
| `min.cleanable.dirty.ratio` | The minimum dirty ratio for the cleaner to compact | `0.5` |
| `delete.retention.ms` | How long tombstones are kept on a compacted topic | `86400000` (1 day) |
| `unclean.leader.election.enable` | Lets a replica outside the ISR become leader (losing data) | `false` |

## Related Topics

- [Producer tuning](../skills/producer-tuning.md) — explains `acks`, idempotence, batching
- [Replication and durability](../reference/replication-durability.md) — the ISR, `min.insync.replicas`
- [Retention and compaction](../reference/retention-compaction.md) — delete vs compact, tombstones
- [Kafka](../index.md) — the topic this cheatsheet belongs to
