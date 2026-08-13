---
title: Kafka lab on Docker
sidebar_position: 1
description: "Standing up a 3-broker KRaft cluster with Docker: the sticky partitioner, keys, rebalancing, compaction, acks — with real output."
tags: [kafka, docker, kraft, lab, tutorial]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-12
---

# Kafka lab on Docker

> **Takeaway:** three brokers is the minimum number to learn Kafka properly — one broker can't
> form an ISR and can't show you `min.insync.replicas` blocking a write, which means missing
> exactly the most important part.

**Run this in a lab directory OUTSIDE the repo** (`~/Documents/learn-lab/kafka`), **creating no
files inside this repo.** The knowledge repo only holds `.md`; lab code lives in `~/Documents/learn-lab/`.

```bash
mkdir -p ~/Documents/learn-lab/kafka && cd ~/Documents/learn-lab/kafka
```

> **The output in this document is real**, taken from a run on 2026-08-12 on
> `apache/kafka:4.3.1`, a 3-broker KRaft cluster. The `verified_at` field stays empty until
> the repo owner runs it again by hand — see hard rule #1.

## Trap number one: the scripts aren't on the PATH

The `apache/kafka` image does **not** put the `kafka-*.sh` scripts on the `PATH`. Typing a bare name gets you:

```
OCI runtime exec failed: exec failed: unable to start container process:
exec: "kafka-topics.sh": executable file not found in $PATH
```

Every command in this document uses the full `/opt/kafka/bin/` path. This is an environment detail
that differs between images (`bitnami/kafka` does have them on the PATH) — don't copy commands from
a blog without checking.

## Exercise 0 — Standing up a 3-broker KRaft cluster

From Kafka 4.x there's **no more ZooKeeper**. Each node below is both a broker and a controller
(*combined mode*), using three kinds of listener: `INTERNAL` for brokers talking to each other, `CONTROLLER`
for electing the metadata leader, `EXTERNAL` for access from the host.

`CLUSTER_ID` must be **genuinely generated**, and all three nodes must use **the same value**:

```bash
docker run --rm apache/kafka:4.3.1 /opt/kafka/bin/kafka-storage.sh random-uuid
```

**Result:**

```
skE65zILTdG_Jvi8bxfWHA
```

Create `docker-compose.yml` (replacing `CLUSTER_ID` with the value you just generated):

```yaml
x-kafka-common: &kafka-common
  image: apache/kafka:4.3.1
  environment: &kafka-env
    CLUSTER_ID: skE65zILTdG_Jvi8bxfWHA
    KAFKA_PROCESS_ROLES: broker,controller
    KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
    KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
    KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT
    KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:29093,2@kafka-2:29093,3@kafka-3:29093
    KAFKA_LOG_DIRS: /var/lib/kafka/data
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
    KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
    KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
    KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
    KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"

services:
  kafka-1:
    <<: *kafka-common
    container_name: kafka-1
    hostname: kafka-1
    ports: ["9092:9092"]
    environment:
      <<: *kafka-env
      KAFKA_NODE_ID: 1
      KAFKA_LISTENERS: INTERNAL://:19092,CONTROLLER://:29093,EXTERNAL://:9092
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka-1:19092,EXTERNAL://localhost:9092
    volumes: ["kafka-1-data:/var/lib/kafka/data"]

  kafka-2:
    <<: *kafka-common
    container_name: kafka-2
    hostname: kafka-2
    ports: ["9093:9093"]
    environment:
      <<: *kafka-env
      KAFKA_NODE_ID: 2
      KAFKA_LISTENERS: INTERNAL://:19092,CONTROLLER://:29093,EXTERNAL://:9093
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka-2:19092,EXTERNAL://localhost:9093
    volumes: ["kafka-2-data:/var/lib/kafka/data"]

  kafka-3:
    <<: *kafka-common
    container_name: kafka-3
    hostname: kafka-3
    ports: ["9094:9094"]
    environment:
      <<: *kafka-env
      KAFKA_NODE_ID: 3
      KAFKA_LISTENERS: INTERNAL://:19092,CONTROLLER://:29093,EXTERNAL://:9094
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka-3:19092,EXTERNAL://localhost:9094
    volumes: ["kafka-3-data:/var/lib/kafka/data"]

volumes:
  kafka-1-data:
  kafka-2-data:
  kafka-3-data:
```

Two deliberate details:

- **`KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"`** — mistype a topic name and you get an error immediately,
  instead of silently creating a ghost topic and then wondering why there's no data.
- **`KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0`** — rebalance immediately, without waiting to gather more
  consumers. Only suitable for a lab; leave production at the default (3000) to avoid a rebalance storm at startup.

```bash
docker compose up -d
docker exec kafka-1 /opt/kafka/bin/kafka-metadata-quorum.sh \
  --bootstrap-server kafka-1:19092 describe --status
```

**Result:**

```
ClusterId:              skE65zILTdG_Jvi8bxfWHA
LeaderId:               2
LeaderEpoch:            1
HighWatermark:          51
MaxFollowerLag:         0
MaxFollowerLagTimeMs:   241
CurrentVoters:          [{"id": 1, ...}, {"id": 2, ...}, {"id": 3, ...}]
CurrentObservers:       []
```

All 3 voters present, `MaxFollowerLag: 0` — a healthy quorum. The cluster came up in **2 seconds**.

## Exercise 1 — Where the replicas are, and who's the leader

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic demo --partitions 3 --replication-factor 3

docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --describe --topic demo
```

**Result:**

```
Topic: demo  PartitionCount: 3  ReplicationFactor: 3  Configs: min.insync.replicas=1
  Topic: demo  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3  Elr:   LastKnownElr:
  Topic: demo  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1  Elr:   LastKnownElr:
  Topic: demo  Partition: 2  Leader: 3  Replicas: 3,1,2  Isr: 3,1,2  Elr:   LastKnownElr:
```

Reading the columns:

| Column | Meaning | Why it's worth looking at |
|---|---|---|
| `Leader` | The broker serving **all** writes and **all** reads for that partition | Spread evenly across 1/2/3 — pile all three onto one broker and it carries 100% of the traffic |
| `Replicas` | The list of copies, **the first element being the preferred leader** | When a broker dies and comes back, Kafka wants to return leadership to it |
| `Isr` | The replicas currently keeping up with the leader | **The first line to look at when you suspect trouble** — a shrinking ISR is the earliest sign of illness |
| `Elr` | *Eligible Leader Replicas*, new in Kafka 4.x | Replicas eligible to become leader when the whole ISR is lost; empty = healthy |
| `min.insync.replicas=1` | The default | **A dangerous configuration** — exercise 6 shows why |

The rule to take away: **both writes and reads go only through the leader**, and followers merely pull the data
to match. Allow follower reads and a read straight after a write may not see what you just wrote.

## Exercise 2 — Without a key it is NOT round-robin

This is the point almost every Vietnamese-language document (and an earlier version of this very file) gets wrong.

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic t-sticky --partitions 3 --replication-factor 3

printf 'm1\nm2\nm3\nm4\nm5\nm6\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic t-sticky

docker exec kafka-1 /opt/kafka/bin/kafka-get-offsets.sh \
  --bootstrap-server kafka-1:19092 --topic t-sticky --time latest
```

**Result:**

```
t-sticky:0:0
t-sticky:1:0
t-sticky:2:6
```

Per-message round-robin would have to be `2 / 2 / 2`. In reality **all 6 went into one partition,
with the other two absolutely empty**.

Since Kafka 2.4 (KIP-480) the producer uses a **sticky partitioner**: it sticks to one partition until
the batch is full or `linger.ms` expires, sends the whole cluster of messages, and only then switches
partition for the next batch. Round-robin at the **batch** level, not the message level. The pragmatic reason:
per-message round-robin with 3 partitions = 3 small batches = 3 network requests; sticking to one partition = 1 big
batch = 1 request.

Run the command above a few times: the partition chosen is **different each time** — in this run it
landed on partition 2, while an earlier run on a different topic gave partition 1. Random, not fixed.

**The lesson:** testing a few dozen messages and concluding *"the data is evenly distributed"* is a **wrong** conclusion.

## Exercise 3 — With a key it's deterministic

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic t-keys --partitions 3 --replication-factor 3

# send the same 9 keys TWICE, with different values
printf 'k1:v\nk2:v\nk3:v\nk4:v\nk5:v\nk6:v\nk7:v\nk8:v\nk9:v\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic t-keys \
  --property parse.key=true --property key.separator=:

printf 'k1:lan2\nk2:lan2\nk3:lan2\nk4:lan2\nk5:lan2\nk6:lan2\nk7:lan2\nk8:lan2\nk9:lan2\n' | \
docker exec -i kafka-1 /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server kafka-1:19092 --topic t-keys \
  --property parse.key=true --property key.separator=:

docker exec kafka-1 /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka-1:19092 \
  --topic t-keys --from-beginning --timeout-ms 6000 \
  --property print.partition=true --property print.key=true 2>/dev/null \
  | grep '^Partition' | awk '{print $2"\t"$3"\t-> "$1}' | sort
```

**Result:**

```
k1  lan2  -> Partition:2      k4  lan2  -> Partition:1      k7  lan2  -> Partition:1
k1  v     -> Partition:2      k4  v     -> Partition:1      k7  v     -> Partition:1
k2  lan2  -> Partition:0      k5  lan2  -> Partition:0      k8  lan2  -> Partition:2
k2  v     -> Partition:0      k5  v     -> Partition:0      k8  v     -> Partition:2
k3  lan2  -> Partition:1      k6  lan2  -> Partition:1      k9  lan2  -> Partition:2
k3  v     -> Partition:1      k6  v     -> Partition:1      k9  v     -> Partition:2
```

**9 out of 9 repeat exactly** — that's `murmur2(key) % partition_count`, with no randomness. Running it
on a completely new topic gives identical results, because the hash depends only on the **key** and the
**partition count**, not on the topic.

Note the distribution: **p0 has 2 keys, p1 has 4, p2 has 3**. The hash only promises to be *deterministic*, it
**does not promise to be *balanced*** with a small number of keys. One hot key taking 40% of the traffic makes
that partition a bottleneck, and Kafka can't save you — it's obliged to honour the "same key, same partition" rule.

**The deadly trap:** the modulus is the *partition count*. Add a partition ⇒ the whole mapping changes ⇒ ordering
by key **breaks permanently**, irreversibly. See the
[case study on losing ordering by changing the key](../case-studies/mat-thu-tu-vi-doi-key.md).

## Exercise 4 — Consumer groups and rebalancing

You need **3 terminals**. Terminals A and B run consumers in the same group `g1`, terminal C observes.

```bash
# Terminals A and B — run THIS SAME command, with the same --group g1
docker exec -it kafka-1 /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server kafka-1:19092 --topic demo --group g1 --property print.partition=true

# Terminal C — see how the group divides the partitions
docker exec kafka-1 /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka-1:19092 --describe --group g1
```

**Result** — with only **one** consumer, it holds all 3 partitions:

```
GROUP  TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
g1     demo   0          0               0               0    console-consumer-5e1b35cd-...
g1     demo   1          12              12              0    console-consumer-5e1b35cd-...
g1     demo   2          0               0               0    console-consumer-5e1b35cd-...
```

**Result** — after starting a second consumer, partition 2 **changes owner** to `...90bf879f`:

```
g1     demo   0          0               0               0    console-consumer-5e1b35cd-...
g1     demo   1          12              12              0    console-consumer-5e1b35cd-...
g1     demo   2          0               0               0    console-consumer-90bf879f-...
```

Ctrl-C the second consumer, wait ~5 seconds and run `--describe` again: the partition returns to the remaining
consumer. That's a **rebalance**.

### The consumer runs but prints nothing?

It isn't stuck. **`--from-beginning` only takes effect when the group has NEVER committed an offset.**
Once the group has a stored position, that flag is ignored, the consumer jumps straight to the end of the log
and waits for new messages. The fix: send more messages, or rewind the group to the start (exercise 7).

### The core rule

Within **one** consumer group, a partition belongs to **exactly one** consumer. Which implies
**the maximum useful consumer count = the partition count** — a 4th consumer on a 3-partition topic will
sit idle. To scale further you have to add partitions, and adding partitions breaks the key mapping from
exercise 3. These two constraints are joined at the hip and must be decided **before** you go to production. See the
[continuous rebalancing case study](../case-studies/rebalance-lien-tuc.md).

## Exercise 5 — Compaction keeps the latest value per key

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic state --partitions 1 --replication-factor 3 \
  --config cleanup.policy=compact --config segment.ms=1000 \
  --config min.cleanable.dirty.ratio=0.01 --config max.compaction.lag.ms=1000

printf 'k1:v1\nk1:v2\nk1:v3\nk2:w1\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic state \
  --property parse.key=true --property key.separator=:

docker exec kafka-1 /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka-1:19092 \
  --topic state --from-beginning --timeout-ms 5000 \
  --property print.key=true --property print.offset=true
```

**Result** — reading **immediately** after sending, all three values of `k1` are still there:

```
Offset:0  k1  v1
Offset:1  k1  v2
Offset:2  k1  v3
Offset:3  k2  w1
```

Send more so the segment being written closes, then wait ~30 seconds for the log cleaner to run:

```bash
printf 'k3:z1\nk4:z2\nk1:v4\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic state \
  --property parse.key=true --property key.separator=:
sleep 30
```

**Result** — reading again:

```
Offset:2  k1  v3
Offset:3  k2  w1
Offset:4  k3  z1
Offset:5  k4  z2
Offset:6  k1  v4
```

Two important things, both of which tend to alarm people:

1. **Offsets 0 and 1 have vanished** — `k1:v1` and `k1:v2` were cleaned up. A compacted log has **offset
   gaps**; offsets still increase monotonically but are **no longer contiguous**. Any code assuming
   `offset + 1` is the next message will be wrong.
2. **`k1` still appears TWICE** (offset 2 and offset 6). Compaction only promises *"the latest value of
   each key will not be deleted"*, it **does not promise** *"each key has exactly one value left"*. The
   segment being written is never compacted, so the newest value is always out of the cleaner's reach.

The consequence for whoever writes the consumer: reading a compacted topic must **take the value with the largest
offset for each key**, never assuming the first occurrence of a key is its final value. The details are in the
[case study on compaction not behaving as expected](../case-studies/compaction-khong-nhu-mong-doi.md).

## Exercise 6 — `acks` and `min.insync.replicas`

The most important exercise, and the reason you had to stand up 3 brokers.

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic dur2 --partitions 1 --replication-factor 3 \
  --config min.insync.replicas=3
```

**Result** — while healthy, the ISR has all 3:

```
Topic: dur2  Partition: 0  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1  Elr:   LastKnownElr:
```

Write a message while healthy (the console producer defaults to `acks=all`):

```bash
printf 'msg-khoe\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic dur2

docker exec kafka-1 /opt/kafka/bin/kafka-get-offsets.sh \
  --bootstrap-server kafka-1:19092 --topic dur2 --time latest
```

**Result:** `dur2:0:1` — it went in normally.

### Kill one broker

```bash
docker stop kafka-3
sleep 22
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --describe --topic dur2
```

**Result** — the ISR shrinks from 3 to 2, and broker 3 falls into `Elr`:

```
Topic: dur2  Partition: 0  Leader: 2  Replicas: 2,3,1  Isr: 2,1  Elr: 3  LastKnownElr:
```

### Writing with `acks=all` while the ISR is short

```bash
printf 'msg-acks-all-luc-yeu\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic dur2
```

**Result** — blocked outright, three retries and then given up:

```
WARN [Producer clientId=console-producer] Got error produce response ... on topic-partition
dur2-0, retrying (2 attempts left). Error: NOT_ENOUGH_REPLICAS
```

The broker log states the cause plainly:

```
ERROR [ReplicaManager broker=1] Error processing append operation on partition dur2-0
org.apache.kafka.common.errors.NotEnoughReplicasException: The size of the current ISR : 2
is insufficient to satisfy the min.isr requirement of 3 for partition dur2-0
```

The offset stays at `dur2:0:1`. **That message never exists** — the producer knows it failed.

### Writing with `acks=1` in the same circumstances

```bash
printf 'msg-acks-1-luc-yeu\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic dur2 \
  --request-required-acks 1
```

**Result** — the producer reports **no error at all**, treating it as a success. But the offset is still `dur2:0:1`
and the consumer can only read:

```
Offset:0  msg-khoe
```

The message just written **can't be read**. It's in the leader's log but the *high watermark* hasn't
moved, because the ISR (2) doesn't meet `min.insync.replicas` (3) — and a consumer may only read up to the
high watermark.

### Bring the broker back

```bash
docker start kafka-3
sleep 25
```

**Result** — the ISR returns to 3, the high watermark jumps `1 → 2`, and the hidden message appears:

```
Topic: dur2  Partition: 0  Leader: 2  Replicas: 2,3,1  Isr: 1,2,3  Elr:   LastKnownElr:

Offset:0  msg-khoe
Offset:1  msg-acks-1-luc-yeu
```

`msg-acks-all-luc-yeu` **never appears** — exactly as designed.

### The takeaway

| | `acks=all` | `acks=1` |
|---|---|---|
| When the ISR is short | **Refuses**, the producer gets `NOT_ENOUGH_REPLICAS` | **Accepts**, the producer thinks it succeeded |
| Does the application know it lost data? | **Yes** — it can retry or report an error | **No** — it moves on in silence |
| Does the data survive if the leader dies right after? | Yes, it's on ≥ `min.isr` copies | **No guarantee** |

`acks=1` isn't "slightly faster". It's **trading correctness for silence**: you lose the ability to know
you just lost data. See the
[case study on losing data with acks=1](../case-studies/mat-du-lieu-acks-1.md).

The pair `acks=all` + `min.insync.replicas=2` (with RF=3) is the correct durable configuration: it survives
**one** broker dying while still accepting writes, and never accepts a write when only one copy remains.

> **Not run:** the experiment of killing the **leader** right after writing with `acks=1` to prove the
> data is **lost outright** (not merely temporarily hidden) wasn't done this time — it requires controlling
> the moment the followers fetch. In the lab above the leader didn't die, so the data was still there.

## Exercise 7 — Measuring lag and rewinding offsets

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic t-lag --partitions 1 --replication-factor 3

seq 1 100 | docker exec -i kafka-1 /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server kafka-1:19092 --topic t-lag

# let the group read exactly 10 messages then stop
docker exec kafka-1 /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka-1:19092 \
  --topic t-lag --group g-lag --max-messages 10 --from-beginning

docker exec kafka-1 /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka-1:19092 --describe --group g-lag
```

**Result:**

```
GROUP  TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
g-lag  t-lag  0          10              100             90   -
```

`LAG = LOG-END-OFFSET − CURRENT-OFFSET = 90` — the number of messages owed. This is **the number-one
health metric**: steadily rising lag means the consumer is processing slower than the write rate, and it
will break sooner or later.

Rewind to the start of the log:

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka-1:19092 \
  --group g-lag --topic t-lag --reset-offsets --to-earliest --execute
```

**Result:**

```
GROUP  TOPIC  PARTITION  NEW-OFFSET
g-lag  t-lag  0          0

GROUP  TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
g-lag  t-lag  0          0               100             100
```

If the group still has a running consumer, this command **refuses**:

```
Error: Assignments can only be reset if the group 'g1' is inactive,
but the current state is Stable
```

Kafka forbids rewinding offsets out from under a running consumer. Stop every consumer and rewind again.

Change `--execute` to `--dry-run` to preview without changing anything. Re-reading the past is **normal**
with Kafka — fix a bug, rewind and reprocess from the start; stand up a new service and read the whole
history. With a queue that would be unthinkable.

## Appendix — deprecation warnings in Kafka 4.3.1

The commands above print warnings, **not errors**, but you should know them to migrate gradually:

| Currently using | Will be dropped, replaced by |
|---|---|
| `--property` (console consumer) | `--formatter-property` |
| `--property` (console producer) | `--reader-property` |
| `--producer-property` | `--command-property` |

Note that `--producer-property acks=1` has **no effect** on the console producer — you must use the
dedicated `--request-required-acks 1` flag. This is the place where you can easily lose half a day
assuming `acks=1` is also blocked by `min.insync.replicas`.

## Cleanup

```bash
cd ~/Documents/learn-lab/kafka
docker compose down -v   # -v also removes the data volumes
```

## Related Topics

- [Consumer groups and rebalance](../skills/consumer-groups.md) — the theory for exercise 4
- [Retention and compaction](../reference/retention-compaction.md) — the theory for exercise 5
- [Replication and durability](../reference/replication-durability.md) — the theory for exercise 6
- [Delivery semantics](../reference/delivery-semantics.md) — `acks`, idempotence, transactions
- [Kafka CLI and config](../cheatsheets/cli-and-config.md) — a quick lookup for the commands used in the lab
- [Kafka](../index.md) — the topic these exercises belong to
