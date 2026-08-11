---
title: Flink config và SQL
sidebar_position: 1
description: "Config quan trọng theo nhóm và cú pháp watermark/window trong Flink SQL."
tags: [flink, config, flink-sql, watermark, cheatsheet]
domain: data-engineering
category: concept
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Flink config và SQL

> **Chốt:** Tra nhanh — config theo nhóm, cú pháp watermark/window/connector trong SQL, và lệnh CLI. Mọi giá trị mặc định dưới đây là **mặc định tài liệu**, tự kiểm lại theo version đang chạy.

## Config theo nhóm

**Checkpointing**

| Key | Ý nghĩa | Ghi chú |
|---|---|---|
| `execution.checkpointing.interval` | Chu kỳ checkpoint | vd `30 s`; nhỏ quá tốn, lớn quá replay nhiều khi restart |
| `execution.checkpointing.mode` | `EXACTLY_ONCE` \| `AT_LEAST_ONCE` | mặc định tài liệu: `EXACTLY_ONCE` |
| `execution.checkpointing.timeout` | Hết giờ thì huỷ checkpoint | tăng nếu state lớn |
| `execution.checkpointing.unaligned` | Unaligned checkpoint | giảm ảnh hưởng backpressure lên checkpoint, đổi lấy state lớn hơn |
| `execution.checkpointing.min-pause` | Nghỉ tối thiểu giữa hai checkpoint | tránh checkpoint dồn liên tục |

**State backend**

| Key | Ý nghĩa | Ghi chú |
|---|---|---|
| `state.backend` | `hashmap` (heap) \| `rocksdb` (đĩa) | state lớn → `rocksdb` |
| `state.backend.incremental` | Checkpoint tăng dần | chỉ RocksDB; giảm size checkpoint |
| `state.checkpoints.dir` | Nơi lưu checkpoint | thường DFS/S3 |
| (State TTL) | Đặt trong code qua `StateTtlConfig` | không có key global; xem case study state TTL |

**Parallelism / slot**

| Key | Ý nghĩa | Ghi chú |
|---|---|---|
| `parallelism.default` | Parallelism mặc định của job | override per-operator được |
| `taskmanager.numberOfTaskSlots` | Số slot mỗi TaskManager | mỗi slot chạy một slice pipeline |

**Restart strategy**

| Key | Ý nghĩa | Ghi chú |
|---|---|---|
| `restart-strategy.type` | `fixed-delay` \| `exponential-delay` \| `failure-rate` \| `none` | bật checkpointing thường kéo theo restart mặc định |
| `restart-strategy.fixed-delay.attempts` | Số lần thử lại | |
| `restart-strategy.fixed-delay.delay` | Nghỉ giữa các lần | vd `10 s` |

## Flink SQL — watermark

```sql
-- khai watermark ngay trong CREATE TABLE, trên một cột TIMESTAMP(3)
CREATE TABLE orders (
  order_id STRING,
  event_ts TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND  -- cho phép trễ 5s
) WITH ( 'connector' = 'kafka', /* ... */ );
```

## Flink SQL — windowing TVF

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

## Flink SQL — connector chính

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

- [Event time và watermark](../reference/event-time-watermark.md) — ngữ nghĩa của `WATERMARK`
- [State và checkpoint](../reference/state-and-checkpoint.md) — nhóm config checkpointing/state backend
- [Windows](../skills/windows.md) — chọn TUMBLE/HOP/CUMULATE
- [Connectors](../skills/connectors.md) — kafka/upsert-kafka/iceberg và delivery guarantee
- [Flink](../index.md) — chủ đề chứa cheatsheet này
