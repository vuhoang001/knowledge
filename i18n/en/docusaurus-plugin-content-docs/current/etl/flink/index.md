---
title: Apache Flink
description: A stateful stream processing engine — event time and watermarks are where things go wrong most.
tags: [flink, streaming, event-time, watermark, checkpoint]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---
# Flink

**Flink is a stateful stream processing engine.** The root difference from batch: the data never
"ends", so you have to define for yourself *when a computation window counts as complete* — that's
the whole business of event time and watermarks. And because a stream runs forever, Flink has to hold
**state** itself (counters, windows, join tables) and restore it after a failure — that's the whole
business of checkpoints.

> **A note on verification.** Flink needs a cluster; most of the output in `reference/`/`skills/`
> is **illustrative numbers — not run**, labelled as such right next to it. Only the [exercises](tutorials/flink-lab.md),
> which stand up a Docker cluster, have output that's actually been run. `verified_at` stays empty per the repo's hard rule.

## Contents — Flink's components

| # | Component | The question it answers | Status |
|---|---|---|---|
| 01 | [What Flink is](reference/what-is-flink.md) | Stream vs batch, when you genuinely need streaming | 📝 |
| 02 | [Job architecture](reference/architecture.md) | JobManager, TaskManager, slots, parallelism | 📝 |
| 03 | [Event time and watermarks](reference/event-time-watermark.md) | Why processing time gives wrong numbers | 📝 |
| 04 | [State and checkpoints](reference/state-and-checkpoint.md) | Where state is held, restoring after a failure | 📝 |
| 05 | [Exactly-once](reference/exactly-once.md) | Two-phase commit, what the sink must support | 📝 |
| 06 | [DataStream vs Table/SQL](skills/datastream-vs-table-sql.md) | Which API for which job | 📝 |
| 07 | [Windows](skills/windows.md) | Tumbling, sliding, session, allowed lateness | 📝 |
| 08 | [Savepoints and upgrades](skills/savepoint-upgrade.md) | Changing code without losing state; `uid()` | 📝 |
| 09 | [Connectors](skills/connectors.md) | Kafka source/sink, Iceberg sink, CDC | 📝 |
| 10 | [Backpressure and tuning](skills/backpressure-tuning.md) | Reading backpressure, tuning parallelism | 📝 |
| — | [Cheatsheet: config and SQL](cheatsheets/config-and-sql.md) | A quick lookup while you work | 📝 |
| — | [Exercises: Docker](tutorials/flink-lab.md) | Really run: windowed aggregation, late data | 📝 |

Symbols: ✅ run by hand · 📝 theory, illustrative output · 🟡 outline only · ⬜ not written

## Concept map

| Concept | What it is | When you touch it |
|---|---|---|
| DataStream API | The low-level API, controlling each event and its state | Complex logic needing state control |
| Table/SQL API | Declarative SQL, with Flink translating it into operators | Most streaming ETL |
| JobManager | Coordination: scheduling, checkpointing, recovery | Cluster architecture |
| TaskManager | Where operators actually run; holds slots | Cluster architecture, tuning |
| slot / parallelism | The unit of resource / the number of parallel copies of an operator | Scaling a job |
| event time | When the event **happened**, carried in the data | When the numbers must be right even with late data |
| watermark | An assertion that "there are no more events before mark T" | Deciding when to close a window |
| window | Grouping events into a finite set to compute over | Every aggregation on a stream |
| keyed state | State attached to a key, partitioned by Flink | Counting/joining/deduplicating by key |
| checkpoint | A periodic snapshot of state for automatic recovery | Fault tolerance |
| savepoint | A manual snapshot for upgrading/moving a job | Changing code while keeping state |
| exactly-once | Each event affects the result exactly once | Money and counts that mustn't be wrong |

## Learning path

- [ ] **Understand** — be able to explain why processing time gives wrong numbers, and what watermarks solve
- [ ] **Run it** — stand up a Docker cluster, run a windowed aggregation with Flink SQL, and see late data dropped or gathered ([exercises](tutorials/flink-lab.md))
- [ ] **Fix it** — read backpressure, diagnose a window that won't fire because of watermarks, add state TTL
- [ ] **Design it** — choose the window + allowed lateness + sink for an exactly-once pipeline, and defend the choice

## Traps to know in advance

**Event time is where things go wrong most.** Use processing time for convenience and the job runs
smoothly while the numbers go quietly wrong — late data is counted into the wrong window with no error
reported. Three sentences you must know by heart:

1. **Watermarks don't wait for a silent partition.** A source emitting nothing can hold the watermark
   still → the window never closes.
2. **Flink's exactly-once stops at the sink boundary.** With a sink that doesn't support 2PC, the results
   going out can still be duplicated.
3. **State doesn't clean itself.** Without a TTL, keyed state keeps every key forever → checkpoints
   get slower and slower and then OOM.

## Common mistakes

Details in [`case-studies/`](case-studies/index.md).

| Incident | Lesson |
|---|---|
| [The window won't fire](case-studies/cua-so-khong-chay-idle-partition.md) | A silent partition holds the watermark still |
| [Wrong numbers from processing time](case-studies/so-sai-vi-processing-time.md) | Late arrivals get the wrong window, with no error reported |
| [State bloating](case-studies/state-phinh-thieu-ttl.md) | Without a TTL, state only ever grows |
| [Duplicates at the sink](case-studies/trung-lap-vi-sink-khong-transaction.md) | Exactly-once doesn't spread to a non-2PC sink by itself |

## Related Topics

- [Kafka](../kafka/index.md) — the most common input source
- [Event time and watermarks](reference/event-time-watermark.md) — the most important concept
- [Iceberg](../../storage/iceberg/index.md) — where Flink writes out to
- [Data Engineering](../../index.md) — where Flink sits in the pipeline

## Sources

- [ ] The Flink docs — the *Concepts: Stateful Stream Processing* and *Timely Stream Processing* sections
- [ ] Stream Processing with Apache Flink (Hueske & Kalavri) — the chapters on time and state
