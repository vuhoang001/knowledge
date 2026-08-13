---
title: Reference — Flink
sidebar_key: flink-reference
sidebar_position: 0
description: "Explains what it is, why, and what the trade-offs are. Read this group first."
tags: [reference, flink]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Reference — Flink

Explains *what it is, why, and what the trade-offs are*. Read this group before moving on to `skills/`.

| # | Document | The question it answers | Status |
|---|---|---|---|
| 1 | [What Flink is](what-is-flink.md) | Stream vs batch; dataflow, bounded vs unbounded | 📝 |
| 2 | [Job architecture](architecture.md) | JobManager, TaskManager, slots, parallelism, operator chaining | 📝 |
| 3 | [Event time and watermarks](event-time-watermark.md) | Why processing time gives wrong numbers; what a watermark is | 📝 |
| 4 | [State and checkpoints](state-and-checkpoint.md) | Where state is held, checkpoint barriers, recovery after a failure | 📝 |
| 5 | [Exactly-once](exactly-once.md) | Two-phase commit; what the sink must support to achieve it | 📝 |

Symbols: ✅ run by hand · 📝 theory, illustrative output · 🟡 outline only · ⬜ not written

## Related Topics

- [Flink](../index.md) — the topic this directory belongs to
