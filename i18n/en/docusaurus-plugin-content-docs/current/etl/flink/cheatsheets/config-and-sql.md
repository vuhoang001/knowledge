---
title: Flink config and SQL
sidebar_position: 1
description: "The important configs by group and the watermark/window syntax in Flink SQL."
tags: [flink, config, flink-sql, watermark, cheatsheet]
domain: data-engineering
category: concept
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Flink config and SQL

> **Takeaway:** a quick lookup — config by group, the watermark/window/connector syntax in SQL, and the CLI commands. Every default below is the **documented default**; check it yourself against the version you're running.

## Config by group

**Checkpointing**

| Key | Meaning | Notes |
|---|---|---|
| `execution.checkpointing.interval` | The checkpointing interval | e.g. `30 s`; too small is costly, too large replays a lot on restart |
| `execution.checkpointing.mode` | `EXACTLY_ONCE` \| `AT_LEAST_ONCE` | documented default: `EXACTLY_ONCE` |
| `execution.checkpointing.timeout` | Cancels the checkpoint when time runs out | raise it if the state is large |
| `execution.checkpointing.unaligned` | Unaligned checkpoints | reduces backpressure's impact on checkpointing, in exchange for larger state |
| `execution.checkpointing.min-pause` | The minimum pause between two checkpoints | avoids back-to-back checkpoints |

**State backend**

| Key | Meaning | Notes |
|---|---|---|
| `state.backend` | `hashmap` (heap) \| `rocksdb` (disk) | large state → `rocksdb` |
| `state.backend.incremental` | Incremental checkpoints | RocksDB only; reduces checkpoint size |
| `state.checkpoints.dir` | Where checkpoints are stored | usually DFS/S3 |
| (State TTL) | Set in code via `StateTtlConfig` | there's no global key; see the state TTL case study |

**Parallelism / slots**

| Key | Meaning | Notes |
|---|---|---|
| `parallelism.default` | The job's default parallelism | overridable per operator |
| `taskmanager.numberOfTaskSlots` | The slots per TaskManager | each slot runs one pipeline slice |

**Restart strategy**

| Key | Meaning | Notes |
|---|---|---|
| `restart-strategy.type` | `fixed-delay` \| `exponential-delay` \| `failure-rate` \| `none` | enabling checkpointing usually brings a default restart strategy with it |
| `restart-strategy.fixed-delay.attempts` | The number of retries | |
| `restart-strategy.fixed-delay.delay` | The pause between attempts | e.g. `10 s` |

## Flink SQL — watermarks

```sql
-- khai watermark ngay trong CREATE TABLE, trên một cột TIMESTAMP(3)
CREATE TABLE orders (
  order_id STRING,
  event_ts TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND  -- cho phép trễ 5s
) WITH ( 'connector' = 'kafka', /* ... */ );
```

## Flink SQL — windowing TVFs

```sql
-- TUMBLE: cửa sổ cố định, không chồng
SELECT window_start, window_end, COUNT(*)
FROM TABLE(TUMBLE(TABLE orders, DESCRIPTOR(event_ts), INTERVAL '5' MINUTES))
GROUP BY window_start, window_end;

-- HOP: cửa sổ trượt (size 10m, slide 5m → chồng nhau)
FROM TABLE(HOP(TABLE orders, DESCRIPTOR(event_ts), INTERVAL '5' MINUTES, INTERVAL '10' MINUTES))

-- CUMULATE: cửa sổ tích luỹ (step 1m tới max 1h → dashboard "từ đầu giờ tới giờ")
FROM TABLE(CUMULATE(TABLE orders, DESCRIPTOR(event_ts), INTERVAL '1' MINUTES, INTERVAL '1' HOUR))
```

## Flink SQL — the main connectors

```sql
-- kafka: append stream
WITH ('connector'='kafka', 'topic'='orders', 'properties.bootstrap.servers'='...',
      'format'='json', 'scan.startup.mode'='latest-offset')

-- upsert-kafka: cần PRIMARY KEY; ghi đè theo key (idempotent sink)
WITH ('connector'='upsert-kafka', 'topic'='agg', 'key.format'='json', 'value.format'='json')

-- iceberg: commit theo checkpoint
WITH ('connector'='iceberg', 'catalog-name'='...', 'warehouse'='...')
```

## CLI

```bash
flink run -d job.jar                          # submit detached
flink list                                    # liệt kê job đang chạy (lấy JobID)
flink stop --savepoint /path/sp <JobID>       # dừng có savepoint (graceful)
flink run --fromSavepoint /path/sp job.jar    # khôi phục từ savepoint
flink cancel <JobID>                          # huỷ không savepoint
```

## Related Topics

- [Event time and watermarks](../reference/event-time-watermark.md) — the semantics of `WATERMARK`
- [State and checkpoints](../reference/state-and-checkpoint.md) — the checkpointing/state-backend config groups
- [Windows](../skills/windows.md) — choosing TUMBLE/HOP/CUMULATE
- [Connectors](../skills/connectors.md) — kafka/upsert-kafka/iceberg and delivery guarantees
- [Flink](../index.md) — the topic this cheatsheet belongs to
