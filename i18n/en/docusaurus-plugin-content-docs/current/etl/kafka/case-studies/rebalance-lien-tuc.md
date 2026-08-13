---
title: Consumer rebalancing that won't stop
sidebar_position: 2
description: "Processing a batch for longer than max.poll.interval.ms → treated as dead → a rebalance loop."
tags: [kafka, consumer-group, rebalance, max-poll-interval]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Consumer rebalancing that won't stop

> **Takeaway:** if one processing round between two `poll()` calls takes longer than `max.poll.interval.ms`, the coordinator treats the consumer as dead and kicks it out of the group — the replacement consumer is just as slow, which becomes a rebalance loop and throughput drops to nearly 0.

## Label

**A reconstructed situation** — the figures below are **illustrative, not run on a cluster**, but internally consistent so the reasoning can be followed.

## Context

The `enrich-events` consumer group has 3 consumers reading a 12-partition topic. Inside the processing loop for each record, the consumer calls an **external API** to enrich it. That API is normally ~50ms, but when the other side is slow it goes to several seconds per call.

`max.poll.records` is left at the default (500). `max.poll.interval.ms` is left at the **default 300000** (5 minutes). Which means the consumer has at most 5 minutes to finish processing a batch of up to 500 records before it must call `poll()` again.

## Symptoms

*Illustrative numbers — not run:*

- The consumer log is full of `Attempt to heartbeat failed since group is rebalancing` and `Revoking previously assigned partitions`.
- Lag rises steadily and processing throughput is ~**0 records/minute** while consumer CPU isn't high.
- `kafka-consumer-groups --describe` shows the assignment changing continuously, sometimes with no consumer holding a partition at all (an empty `CONSUMER-ID`).

## The wrong hypotheses at first

1. **Suspecting a flaky network between consumer and broker.** Capturing packets, measuring RTT to the broker — normal. The heartbeat thread was still running steadily (it runs in the background, separate from the processing loop).
2. **Suspecting an overloaded broker.** Checking broker metrics — CPU, disk, request queue all low. The broker was healthy.
3. **Confusing `max.poll.interval.ms` with `session.timeout.ms`.** Tuning `session.timeout.ms` first (default 45000) on the assumption that heartbeats were late. Wrong — heartbeats were still going out steadily thanks to the background thread; what broke was the *poll loop* taking too long.

Where the time went: distinguishing the two timeouts. `session.timeout.ms` is "are heartbeats still being sent"; `max.poll.interval.ms` is "is poll() still being called". Here the heartbeats were fine but poll() was late.

## The real cause

When the external API is slow, processing 500 records × several seconds exceeds the 5 minutes between two `poll()` calls. The coordinator's `max.poll.interval.ms` expires → it treats the consumer as stuck → **kicks it out of the group** → a rebalance → the partitions move to another consumer → that one also hits the slow API → it too exceeds the deadline → the loop is endless. During a rebalance nobody can commit, so lag only rises.

## The fix

1. **Reduce the work per poll round** to be sure of making the deadline:

   ```properties
   max.poll.records=50
   max.poll.interval.ms=600000
   ```

2. **Move the heavy processing out of the poll loop** — poll quickly, push records into a thread pool / internal queue, and commit once they're done. This is the most robust approach; tuning config alone buys time without curing the root cause.

3. **Use the `cooperative-sticky` assignor** so a rebalance doesn't revoke *all* the partitions each time (softening the "stop-the-world" hit):

   ```properties
   partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor
   ```

4. Add a timeout + circuit breaker for the external API so one slow call doesn't push the whole batch past the deadline.

## How to spot it early

A continuously changing assignment is the number-one sign:

```bash
# chạy lặp; nếu CONSUMER-ID / HOST đổi mỗi lần gọi → đang rebalance liên tục
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group enrich-events
```

And measure the time between two `poll()` calls inside the consumer itself (log the delta). A delta approaching `max.poll.interval.ms` is the alarm — don't wait until you're kicked.

## Related Topics

- [Consumer groups and rebalance](../skills/consumer-groups.md) — `max.poll.interval.ms` vs `session.timeout.ms`, assignors
- [Operations and lag](../skills/operations-lag.md) — reading lag and spotting rebalances through `kafka-consumer-groups`
- [Kafka](../index.md) — the topic this case study belongs to
