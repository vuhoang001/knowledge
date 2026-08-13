---
title: Delivery semantics
sidebar_position: 5
description: "At-most/at-least/exactly-once — the real protocol mechanism: PID + epoch + sequence, the transaction coordinator, markers, and the Kafka-only boundary."
tags: [delivery-semantics, exactly-once, idempotent-producer, transactions, eos, producer-id, transaction-coordinator]
domain: data-engineering
category: concept
doc_type: reference
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# Delivery semantics

> **Takeaway:** Kafka's "exactly-once" is a **specific protocol mechanism** — an idempotent producer (PID + epoch + sequence, with broker dedup per partition) plus transactions (coordinator + markers + last-stable-offset) — and it only holds **within Kafka→Kafka**. Write out to an external sink that isn't idempotent/transactional and you still get duplicates. There's no free end-to-end magic.

The three delivery levels are one of the places marketing has blurred the most. "Exactly-once" sounds like an absolute guarantee; in reality it's a specific mechanism with specific boundaries. Misunderstanding those boundaries is the source of an awful lot of duplicate data "for no apparent reason".

## The three levels

- **At-most-once**: each message is processed **0 or 1 times** — never duplicated, but it can be lost. How: **commit the offset BEFORE processing**. Crash after the commit and before processing finishes → that message is dropped. Use it when losing a few records is acceptable and duplicates absolutely are not (certain kinds of metrics).
- **At-least-once** (Kafka's default): each message is processed **one or more times** — never lost, but it can be duplicated. How: **process first, then commit the offset**. Crash after processing and before committing → on restart it re-reads from the old offset → **a duplicate**. Producer retries also cause duplicates. This is the default because "better duplicated than lost".
- **Exactly-once**: each message has an effect **exactly once**. Not "sent exactly once" (the network makes that impossible) but "the result is *as if* it were processed exactly once".

The pragmatic boundary: most systems should **design for at-least-once + idempotent consumers**. That's usually cheaper and more robust than EOS, and it holds even when writing to external sinks.

## The idempotent producer at the protocol level

`enable.idempotence=true` prevents **duplicates caused by producer retries**. Look deeper at the protocol to see why it only prevents exactly that kind of duplicate:

- When a producer first enables idempotence, the broker issues it a **Producer ID (PID)** and an **epoch** (starting at 0).
- Every record the producer sends carries a **sequence number** — incrementing, **per partition** (not globally). The first record to partition P carries seq 0, the next seq 1, …
- The broker (the partition's leader) **remembers the last sequence written** for each `(PID, epoch, partition)`. When it receives a record:
  - Seq = (last_seq + 1) → write it, update last_seq.
  - Seq = last_seq (exactly what was just written) → a **retry**: the broker already wrote it but the ack was lost on the way back → the broker **skips it** (dedup) and returns an ack as if it had written it. No duplicate is created.
  - Seq > last_seq + 1 (a gap) → **`OutOfOrderSequenceException`**: an earlier batch was lost or hasn't arrived. The producer has to handle it (usually fatal, requiring reinitialisation).

```text
Broker dedup theo (PID, epoch, partition, sequence):

producer gửi:  seq=5  ──►  broker ghi, last_seq=5, ack ──► (ack rớt)
producer retry: seq=5 ──►  broker thấy seq==last_seq → BỎ QUA, ack lại
                            → không có bản trùng
```

**The window of 5 in-flight requests**: idempotence requires `max.in.flight.requests.per.connection` to be **less than or equal to 5**. The broker only tracks dedup within a window; beyond 5 unacked requests at once it can't guarantee both ordering and dedup. (Without idempotence, setting in-flight above 1 with retries enabled can even **reorder** messages on retry — idempotence with the window of 5 preserves both ordering and dedup.)

**The limits of this guarantee** — deliberately narrow:

- It only prevents duplicates *from one producer* *on retry* *into one partition*. It does nothing about duplicates caused by a consumer re-reading or by application logic.
- **When the PID changes, the guarantee is gone.** A PID isn't durable across a producer restart by default: a producer that dies and comes back gets a **new PID**, and the broker treats it as a different producer → no dedup against the old PID → **a retry across the restart boundary can still duplicate**. This is why a durable "read-process-write" needs transactions (with a stable `transactional.id`), not just idempotence.

## Transactions at the protocol level

`transactional.id` gives you an **atomic multi-partition write + offset commit**. The mechanism:

- The producer declares a `transactional.id` (a stable name per role/instance). On initialisation it calls `initTransactions()` → finding the **transaction coordinator** (a broker chosen by hashing the `transactional.id` into the partitions of the internal `__transaction_state` topic).
- The coordinator issues/recovers the **PID** bound to that `transactional.id` and **increments the epoch**. Incrementing the epoch is exactly the **fencing** mechanism: a zombie producer carrying the same `transactional.id` but an old epoch is **refused** (fenced) by the coordinator → preventing a double write from an old instance that hasn't quite died.
- Within a transaction: `beginTransaction()` → `send()` to several partitions → (optionally) `sendOffsetsToTransaction()` → `commitTransaction()` or `abortTransaction()`.
- The coordinator writes the transaction state into **`__transaction_state`** (open, the participating partitions, commit/abort) — which is itself a durable log, so the coordinator can recover after a crash.
- On commit/abort, the coordinator writes **transaction markers** (a control record: COMMIT or ABORT) into **every partition** the transaction touched. A marker is a special record sitting right in the data log, marking "every record of this PID up to here belongs to a committed/aborted transaction".

### Last Stable Offset + `isolation.level=read_committed`

On the reading side, a consumer sets `isolation.level=read_committed` to **only read messages from committed transactions**. The filtering mechanism is based on the **Last Stable Offset (LSO)**:

- The LSO = the highest offset where **every transaction below it has ended** (has a commit/abort marker). Records of an **open** transaction sit **above** the LSO.
- A `read_committed` consumer may only read up to the **LSO**, not the log-end-offset. Records in an open transaction are "held back" — they don't appear until the transaction commits (then they appear) or aborts (then they're filtered out thanks to the ABORT marker).
- The broker also sends the list of **aborted transactions** with the fetch response so the consumer can filter out the records of aborted transactions.

The default is `read_uncommitted` — which will read records that later get aborted, breaking EOS. **Enabling producer transactions and forgetting to switch the consumer to `read_committed` is a common silent bug.**

```properties
# Ví dụ minh hoạ — chưa chạy trên cluster:
# producer — EOS read-process-write
enable.idempotence=true
transactional.id=orders-enricher-1
acks=all
max.in.flight.requests.per.connection=5
# consumer đầu ra
isolation.level=read_committed
```

## Read-process-write (EOS)

The core model of exactly-once *within Kafka*: read from topic A → process → write to topic B → **and** commit A's offset, all **atomically**. The crucial part is `sendOffsetsToTransaction()`: the consume offset commit does **not** take the ordinary commit path but **sits inside the transaction itself** — it writes the offset into `__consumer_offsets` as part of the transaction. So either "write the output to B + commit A's offset" both succeed, or both are aborted. There's no half state of "B written but A's offset not committed" (causing duplicates) or the reverse (causing loss).

**EOS v1 vs v2 (KIP-447)** in brief: v1 forced **one `transactional.id` per input partition** → the producer count grew with the partition count, and rebalancing was expensive. v2 (KIP-447) lets **one producer serve several input partitions** safely, because the coordinator tracks a consumer-group-generation → producer mapping and fences more precisely. The result: EOS is much cheaper and scales far better; modern stream processors use v2.

### The transaction flow

```mermaid
sequenceDiagram
  participant Pr as Producer (txn.id)
  participant Co as Transaction Coordinator
  participant Pb as Partition of topic B
  participant Off as __consumer_offsets

  Pr->>Co: initTransactions() → issues PID, epoch++ (fencing)
  Pr->>Co: beginTransaction()
  Pr->>Pb: send(records)  (sits ABOVE the last-stable-offset, invisible to read_committed)
  Pr->>Co: sendOffsetsToTransaction(offsets, groupId)
  Pr->>Co: commitTransaction()
  Co->>Pb: write the COMMIT marker
  Co->>Off: write the offset (inside the transaction) + COMMIT marker
  Note over Pb,Off: the LSO advances → read_committed consumers now see the records
```

## Failure scenarios

| Incident | What happens | Why it's still correct |
|---|---|---|
| The producer dies **mid**-transaction (before commit) | The transaction has no COMMIT marker → it hangs until the coordinator's `transaction.timeout.ms` expires → **abort** | The records already written sit above the LSO and are filtered out by the ABORT marker; `read_committed` never sees them → no half effect |
| A zombie producer (presumed dead) revives and keeps writing | The new instance already called `initTransactions()` → **the epoch incremented**; the coordinator **fences** the old producer (lower epoch) → refuses its writes | Only one epoch is valid at a time → no double write |
| An ack is lost and the producer retries (idempotent) | The broker sees the duplicate seq → skips it, acks again | Dedup by (PID, partition, seq) → no duplicate |
| The producer restarts with a new PID (idempotence only, no txn) | The broker can't link it to the old PID → **duplicates are possible** across the restart boundary | This is exactly why you need `transactional.id` for durability across restarts |
| The coordinator (broker) dies | A new coordinator re-reads `__transaction_state` to recover open transactions and finish the commit/abort | `__transaction_state` is a durable, replicated log |

## The most important boundary: Kafka→Kafka, not end-to-end

Kafka's EOS guarantees things **within Kafka**: read a topic → process → write a topic + commit the offset, atomically. **The moment you write to a sink outside Kafka** (a DB, S3, Elasticsearch, an API), that guarantee **no longer applies automatically** — because transaction markers, the LSO and the coordinator only live inside Kafka. The sink must itself be **idempotent** (writing the same key several times gives the same result, e.g. an upsert by primary key) or **transactional** (a two-phase commit coordinated with Kafka) for exactly-once to actually reach the destination.

This is why stream processors like **Flink** have their own exactly-once mechanism based on **checkpoints + two-phase commit** to the sink, coordinated with Kafka's transactions: Flink uses a transactional producer to write to Kafka, and for external sinks it uses `TwoPhaseCommitSinkFunction` to tie the commit to the checkpoint barrier. For EOS *all the way to the sink* you have to look at the whole chain, not just Kafka. See [Flink exactly-once](../../flink/reference/exactly-once.md).

## The relevant config table

| Config | Side | Common default | What it does | When to change it |
|---|---|---|---|---|
| `enable.idempotence` | producer | `true` (newer Kafka) | Enables PID + sequence, with broker dedup of retries | Almost always leave it on; only turn it off for a very specific reason |
| `acks` | producer | `all` (when idempotence is on) | Wait for every ISR to ack — the precondition of durability and EOS | Keep `all` for EOS; `1`/`0` only when loss is acceptable |
| `max.in.flight.requests.per.connection` | producer | 5 | The number of concurrent unacked requests per connection | Keep it at 5 or below with idempotence on |
| `transactional.id` | producer | (unset) | Enables transactions + fencing durable across restarts | Set it when doing read-process-write EOS; it must be stable per role |
| `transaction.timeout.ms` | producer | 60000 (a common default) | The coordinator aborts a transaction that hangs too long | Increase it if processing batches take long; keep it below the broker's `transaction.max.timeout.ms` |
| `isolation.level` | consumer | `read_uncommitted` | `read_committed` to read only committed data (filtered by the LSO) | Set `read_committed` whenever the upstream side uses transactions |
| `retries` | producer | very large / `MAX_INT` | The retry count — idempotence makes retries safe | Rarely needs changing with idempotence on |

## When NOT to enable exactly-once

- **The sink is naturally idempotent already** (an upsert by key into a DB): at-least-once + upsert gives the same correct result as EOS at much lower cost. Enabling transactions pays throughput/latency for nothing.
- **Throughput is the top priority**: transactions add overhead (markers written into every participating partition, coordinator coordination), and latency rises with the commit interval because `read_committed` only sees data after a commit. With very large streams, weigh it carefully.
- **A simple one-hop pipeline writing into an idempotent store**: you don't need the transaction machinery.

## Trade-offs

| You get | You lose | In exchange for |
|---|---|---|
| No duplicates within Kafka (EOS) | Lower throughput, latency rising with the commit interval | A correctness guarantee |
| Atomic read-process-write | Operational complexity (transactional.id, coordinator, fencing) | Less downstream deduplication |
| Safe retries (idempotent producer) | Very little overhead — so keep it on almost always | Retry safety |
| `read_committed` sees only committed data | Higher read latency: data "appears" only after the commit marker | Clean reads, never seeing aborted data |

## Common Mistakes

| Mistake | Consequence | Prevented by |
|---|---|---|
| Enabling transactions, forgetting `read_committed` | The consumer reads aborted messages too → still duplicating | Setting `isolation.level=read_committed` |
| Thinking Kafka EOS = exactly-once to an external sink | Duplicates in the DB/S3 "for no apparent reason" | The sink must be idempotent/transactional; look at the whole chain |
| A `transactional.id` that isn't stable per instance/role | Losing fencing (the epoch can't be linked), zombie double writes | Assigning a stable, unique `transactional.id` per role |
| Enabling only idempotence and expecting durability across restarts | The PID changes on restart → still duplicating across the restart boundary | Using transactions with a `transactional.id` for read-process-write |
| `max.in.flight` above 5 with idempotence on | Outside the dedup window → possible duplicates/reordering | Keeping `max.in.flight` at 5 or below |
| Using EOS when the sink is already idempotent | Paying overhead for nothing | At-least-once + upsert by key |

## FAQ

<details>
<summary>What's the difference between the idempotent producer and transactions?</summary>

The idempotent producer prevents duplicates caused by **one producer's retries into one partition** (PID + sequence, dedup at the broker). Transactions give **atomicity across several partitions + the offset commit** (coordinator + markers + epoch fencing), and durability across producer restarts thanks to `transactional.id`. Full EOS within Kafka needs both; enabling transactions usually pulls idempotence in with it.

</details>

<details>
<summary>Is at-least-once + an idempotent consumer equivalent to exactly-once?</summary>

In terms of the end result, usually yes — and it's the cheapest, most robust, most common approach. If every downstream effect is idempotent by key (an upsert), reprocessing a message doesn't change the result. Many teams choose this over Kafka's transaction machinery, especially when the destination is an external sink.

</details>

<details>
<summary>Why does `read_committed` make data "appear" later?</summary>

Because a `read_committed` consumer only reads up to the last-stable-offset — records of an open transaction sit above the LSO and are held back until a COMMIT marker arrives. So read latency is tied to the transactional producer's commit interval: infrequent commits → data appears later but throughput is better; frequent commits → lower latency but more markers.

</details>

## Related Topics

- [Topic, partition, offset](topic-partition-offset.md) — last-stable-offset, high-watermark, committed offset
- [Replication and durability](replication-durability.md) — acks=all is a precondition of EOS
- [Retention and log compaction](retention-compaction.md) — compacted changelogs in stateful processing
- [Flink exactly-once](../../flink/reference/exactly-once.md) — EOS to an external sink via checkpoints + 2PC
- [Operations: lag](../skills/operations-lag.md) — tracking consumer lag with EOS on
- [Kafka](../index.md) — the parent topic
