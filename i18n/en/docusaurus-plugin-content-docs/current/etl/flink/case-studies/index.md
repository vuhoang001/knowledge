---
title: Case studies — Flink
sidebar_key: flink-case-studies
sidebar_position: 0
description: "Real incidents debugged to a conclusion, including the wrong hypotheses along the way."
tags: [case-study, flink]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Case studies — Flink

Real incidents or reconstructed situations debugged to a conclusion, including **the wrong hypotheses along the way**.

| # | Document | The question it answers | Status |
|---|---|---|---|
| 1 | [A window that never fires](cua-so-khong-chay-idle-partition.md) | One silent partition holds the watermark still → the window doesn't close | 📝 |
| 2 | [Wrong numbers from using processing time](so-sai-vi-processing-time.md) | The job runs smoothly while the numbers go quietly wrong with late data | 📝 |
| 3 | [State bloating for want of a TTL](state-phinh-thieu-ttl.md) | Keyed state keeps every key forever → checkpoints slow down and then OOM | 📝 |
| 4 | [Duplicates from a non-transactional sink](trung-lap-vi-sink-khong-transaction.md) | Flink's exactly-once doesn't spread by itself to a sink without 2PC | 📝 |

## Related Topics

- [Flink](../index.md) — the topic this directory belongs to
