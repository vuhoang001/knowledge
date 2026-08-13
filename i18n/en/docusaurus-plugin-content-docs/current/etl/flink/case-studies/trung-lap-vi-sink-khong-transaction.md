---
title: Duplicates from a non-transactional sink
sidebar_position: 4
description: "Checkpoints give internal exactly-once, but an at-least-once sink produces duplicate records after every restart."
tags: [flink, exactly-once, sink, transaction, idempotent]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# Duplicates from a non-transactional sink

> **Takeaway:** `CheckpointingMode.EXACTLY_ONCE` only guarantees exactly-once for **internal state**; if the sink writes out in at-least-once mode, every restart replays and creates **duplicate records at the destination**.

## Label

**A reconstructed situation** — the figures are **illustrative, not run on a cluster**, but internally consistent.

## Context

The job has `EXACTLY_ONCE` checkpointing on and everybody believes this is **end-to-end exactly-once**. The sink writes results out to a Kafka topic / a DB table, but at **at-least-once** (no transaction, not idempotent).

## Symptoms

*Illustrative numbers — not run:*

- Normally the destination record count matches the source.
- Every time the job **restarts** (a deploy, a TaskManager dying, a rebalance), the destination count **jumps** by a small cluster — e.g. +1,500 surplus records around the 14:32 restart.
- The surplus records are **exact copies** of records written earlier, differing only in write time.

There's no error; the job is still EXACTLY_ONCE and the checkpoints are still green.

## The wrong hypotheses at first

1. **Suspecting the source sent duplicates.** Checking the source: each record has a unique key and the source doesn't repeat. Ruled out.
2. **Suspecting a bug in the aggregation logic.** Reviewing the pipeline → the logic is correct, emitting exactly the right record count once in the internal flow. Not the logic.

Where the time went: assuming "with EXACTLY_ONCE on, the whole path to the destination is exactly-once too". The truth: that guarantee **stops at the state boundary** and doesn't spread to the sink by itself.

## The real cause

Flink's exactly-once is about **deterministic state on restore**: on restart the job rolls state back to the last checkpoint and **replays** the records from there. For internal state, a replay is idempotent (it overwrites the state). But for **side effects going out** (already written into an at-least-once sink before the failure), the replay **writes them again** → duplicates at the destination.

For end-to-end exactly-once, the sink must participate in a two-phase (2PC) protocol tied to the checkpoints, **or** it must be idempotent.

## The fix

**1. A transactional Kafka sink (2PC):**

```java
KafkaSink<String> sink = KafkaSink.<String>builder()
    .setBootstrapServers(brokers)
    .setDeliveryGuarantee(DeliveryGuarantee.EXACTLY_ONCE) // dùng transaction, commit theo checkpoint
    .setTransactionalIdPrefix("orders-agg-")
    .setRecordSerializer(/* ... */)
    .build();
```

The reading side must use `isolation.level = read_committed` to see only committed records — otherwise it still reads records from aborted transactions.

**2. An idempotent sink (an upsert by key):** a DB/`upsert-kafka` overwriting by primary key. A replay writes the same key with the same value → no new row is created.

```sql
-- Flink SQL: upsert-kafka khử trùng theo key
CREATE TABLE sink_agg (
  window_start TIMESTAMP(3),
  region STRING,
  cnt BIGINT,
  PRIMARY KEY (window_start, region) NOT ENFORCED
) WITH ('connector' = 'upsert-kafka', /* ... */);
```

**3. An Iceberg sink:** it commits files per checkpoint — the data only "appears" when the checkpoint completes, so a replay between two checkpoints never exposes duplicates.

The trade-off: Kafka transactions increase latency (data is only visible after the checkpoint's commit) and need a sensible `transaction.timeout` configuration. An upsert needs a stable natural key.

## How to spot it early

**Count the destination records around each job restart.** If the destination count **jumps** exactly at the restart marks (a deploy, a failover) → the sink is almost certainly at-least-once. Cross-reference the restart marks in the Flink UI (Job → Exceptions/restart count) against the graph of rows written at the destination.

## Related Topics

- [Exactly-once](../reference/exactly-once.md) — the boundary of Flink's guarantee and 2PC at the sink
- [Connectors](../skills/connectors.md) — DeliveryGuarantee, upsert-kafka, the Iceberg sink
- [Flink](../index.md) — the topic this case study belongs to
