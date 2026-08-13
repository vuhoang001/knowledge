---
title: Case studies — Kafka
sidebar_key: kafka-case-studies
sidebar_position: 0
description: "Real incidents debugged to a conclusion, including the wrong hypotheses along the way."
tags: [case-study, kafka]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Case studies — Kafka

Real incidents or reconstructed situations debugged to a conclusion, including **the wrong hypotheses along the way**.

| # | Document | The question it answers | Status |
|---|---|---|---|
| 1 | [Losing ordering by changing the key](mat-thu-tu-vi-doi-key.md) | Changing the partition key mid-flight puts one entity's events on different partitions | 📝 |
| 2 | [Consumer rebalancing that won't stop](rebalance-lien-tuc.md) | Processing one message beyond `max.poll.interval.ms` → kicked out of the group over and over | 📝 |
| 3 | [Losing data with acks=1](mat-du-lieu-acks-1.md) | The leader dies before a follower copies → a "successfully sent" message vanishes | 📝 |
| 4 | [Compaction not behaving as expected](compaction-khong-nhu-mong-doi.md) | Expecting compaction to delete immediately; old values and tombstones stay for a long time | 📝 |

## Related Topics

- [Kafka](../index.md) — the topic this directory belongs to
