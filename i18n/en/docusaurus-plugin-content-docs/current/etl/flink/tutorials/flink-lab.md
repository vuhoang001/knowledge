---
title: Flink SQL lab on Docker
sidebar_position: 1
description: "Standing up a Flink cluster + SQL Client with Docker: windowed aggregation, watermarks, late data — run it yourself."
tags: [flink, flink-sql, docker, lab, watermark]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Flink SQL lab on Docker

> **Takeaway:** stand up a minimal Flink cluster with Docker and use the `datagen` connector (no Kafka needed) to see windowed aggregation, watermarks advancing, and late data being dropped with your own eyes.

:::warning Run this outside the repo
Do this lab in a **lab directory OUTSIDE the repo**: `~/Documents/learn-lab/flink`. **Don't create lab files inside this knowledge repo** — `.gitignore` only blocks certain artifacts, and `docker-compose.yml` isn't one of them.
:::

Every **Result** box below is empty — run it yourself and paste the output in. If you haven't run it, you haven't learnt it.

## 0. Preparation

The Flink `image` and version number below are **an example — check the version yourself** before running (see the existing tags on Docker Hub under `apache/flink`). The lab uses the `datagen` connector, so **no Kafka is needed**.

```yaml title="~/Documents/learn-lab/flink/docker-compose.yml (ví dụ, tự kiểm version)"
services:
  jobmanager:
    image: apache/flink:1.20-scala_2.12   # ví dụ — tự kiểm tag
    ports:
      - "8081:8081"                        # Flink UI, cổng mặc định tài liệu
    command: jobmanager
    environment:
      - |
        FLINK_PROPERTIES=
        jobmanager.rpc.address: jobmanager
  taskmanager:
    image: apache/flink:1.20-scala_2.12
    depends_on:
      - jobmanager
    command: taskmanager
    scale: 1
    environment:
      - |
        FLINK_PROPERTIES=
        jobmanager.rpc.address: jobmanager
        taskmanager.numberOfTaskSlots: 4
```

## Exercise 1 — Stand up the cluster, open the UI, enter the SQL Client

```bash
cd ~/Documents/learn-lab/flink
docker compose up -d
# mở http://localhost:8081  (Flink UI — cổng 8081 là mặc định tài liệu)

# vào SQL Client trong container jobmanager
docker compose exec jobmanager ./bin/sql-client.sh
```

**Result:** ⬜ not run

## Exercise 2 — CREATE TABLE with a datagen source + WATERMARK

`datagen` generates data itself and can be configured to make timestamps diverge — enough to see watermarks and late data.

```sql
CREATE TABLE orders (
  order_id  BIGINT,
  region    STRING,
  event_ts  TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
) WITH (
  'connector' = 'datagen',
  'rows-per-second' = '10',
  'fields.region.length' = '2',
  'fields.order_id.kind' = 'sequence',
  'fields.order_id.start' = '1',
  'fields.order_id.end'   = '1000000'
);

-- xem thử vài dòng
SELECT * FROM orders LIMIT 10;
```

**Result:** ⬜ not run

## Exercise 3 — A TUMBLE window count

Count orders in 10-second event-time windows.

```sql
SET 'sql-client.execution.result-mode' = 'table';

SELECT window_start, window_end, COUNT(*) AS cnt
FROM TABLE(
  TUMBLE(TABLE orders, DESCRIPTOR(event_ts), INTERVAL '10' SECONDS)
)
GROUP BY window_start, window_end;
```

Watch: each window only produces a result **after the watermark passes its `window_end`** — a small delay relative to real time.

**Result:** ⬜ not run

## Exercise 4 — Create late data and watch it be dropped

Have `datagen` produce timestamps diverging beyond the watermark (events "older" than the allowed lateness) to see events treated as late.

```sql
-- bảng mới: đẩy event_ts lùi ngẫu nhiên để tạo dữ liệu đến muộn
CREATE TABLE orders_late (
  order_id  BIGINT,
  event_ts  TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '2' SECOND  -- lateness nhỏ
) WITH (
  'connector' = 'datagen',
  'rows-per-second' = '10',
  'fields.event_ts.max-past' = '30000'  -- có event lùi tới 30s (ví dụ; tự kiểm option theo version)
);

SELECT window_start, COUNT(*) AS cnt
FROM TABLE(TUMBLE(TABLE orders_late, DESCRIPTOR(event_ts), INTERVAL '10' SECONDS))
GROUP BY window_start, window_end;
```

With a lateness of only 2s but events reaching 30s into the past: many events arrive **after** the watermark has closed their window → they're **dropped** and not counted. Compare the total count against the number of rows generated to see what's missing.

**Result:** ⬜ not run

## Exercise 5 — Enable checkpointing, kill a taskmanager, watch the recovery

```sql
-- trong SQL Client, bật checkpointing cho session
SET 'execution.checkpointing.interval' = '5 s';
SET 'execution.checkpointing.mode' = 'EXACTLY_ONCE';
-- rồi submit lại một query có state (vd TUMBLE count) để nó chạy nền
```

```bash
# ở terminal khác: giết một taskmanager
docker compose kill taskmanager
docker compose up -d --scale taskmanager=1   # dựng lại
# xem Flink UI 8081: job restart, restore từ checkpoint cuối
```

**The limit:** with the SQL Client, the job ends when the session closes; for a job to live independently across a restart you need to submit it detached (`flink run -d`) or in application mode. In this lab you only **observe the restart + restore-from-checkpoint mechanism**, not an end-to-end exactly-once verification (which needs a transactional sink — see the sink case study).

**Result:** ⬜ not run

## Cleanup

```bash
docker compose down -v
```

## Related Topics

- [Event time and watermarks](../reference/event-time-watermark.md) — why a window waits for the watermark, and late data
- [State and checkpoints](../reference/state-and-checkpoint.md) — the checkpoint/restore mechanism in exercise 5
- [Windows](../skills/windows.md) — TUMBLE and the other window TVFs
- [Connectors](../skills/connectors.md) — datagen and other sources
- [Flink](../index.md) — the topic this lab belongs to
