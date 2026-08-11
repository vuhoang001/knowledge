---
title: Lab Flink SQL trên Docker
sidebar_position: 1
description: "Dựng Flink cluster + SQL Client bằng Docker: windowed aggregation, watermark, late data — tự chạy."
tags: [flink, flink-sql, docker, lab, watermark]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Lab Flink SQL trên Docker

> **Chốt:** Dựng một Flink cluster tối thiểu bằng Docker, dùng `datagen` connector (không cần Kafka) để tận mắt thấy windowed aggregation, watermark tiến, và late data bị bỏ.

:::warning Chạy ngoài repo
Làm lab này trong **thư mục lab NGOÀI repo**: `~/Documents/learn-lab/flink`. **KHÔNG tạo file lab trong repo knowledge này** — `.gitignore` chỉ chặn một số artifact, còn `docker-compose.yml` thì không.
:::

Mọi ô **Kết quả** dưới đây để trống — tự chạy rồi dán output vào. Chưa chạy thì chưa gọi là học.

## 0. Chuẩn bị

`image` Flink và số version dưới đây là **ví dụ — tự kiểm version** trước khi chạy (xem tag hiện có trên Docker Hub `apache/flink`). Lab dùng `datagen` connector nên **không cần Kafka**.

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

## Bài 1 — Dựng cluster, mở UI, vào SQL Client

```bash
cd ~/Documents/learn-lab/flink
docker compose up -d
# mở http://localhost:8081  (Flink UI — cổng 8081 là mặc định tài liệu)

# vào SQL Client trong container jobmanager
docker compose exec jobmanager ./bin/sql-client.sh
```

**Kết quả:** ⬜ chưa chạy

## Bài 2 — CREATE TABLE với datagen source + WATERMARK

`datagen` tự sinh dữ liệu, có thể cấu hình để timestamp lệch nhau — đủ để thấy watermark và late data.

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

**Kết quả:** ⬜ chưa chạy

## Bài 3 — TUMBLE window count

Đếm số đơn theo cửa sổ event-time 10 giây.

```sql
SET 'sql-client.execution.result-mode' = 'table';

SELECT window_start, window_end, COUNT(*) AS cnt
FROM TABLE(
  TUMBLE(TABLE orders, DESCRIPTOR(event_ts), INTERVAL '10' SECONDS)
)
GROUP BY window_start, window_end;
```

Quan sát: mỗi cửa sổ chỉ ra kết quả **sau khi watermark vượt qua `window_end`** — có độ trễ nhỏ so với thời gian thực.

**Kết quả:** ⬜ chưa chạy

## Bài 4 — Tạo late data và quan sát bị bỏ

Cho `datagen` sinh timestamp lệch quá watermark (event "cũ" hơn allowed lateness) để thấy event bị coi là late.

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

Với lateness chỉ 2s nhưng event lùi tới 30s: nhiều event tới **sau khi** watermark đã đóng cửa sổ của chúng → bị **bỏ**, không được đếm. So tổng đếm với tổng số dòng sinh ra để thấy phần thiếu.

**Kết quả:** ⬜ chưa chạy

## Bài 5 — Bật checkpoint, kill taskmanager, xem khôi phục

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

**Giới hạn:** với SQL Client, job kết thúc khi session đóng; để job sống độc lập qua restart cần submit dạng detached (`flink run -d`) hoặc application mode. Ở lab này chỉ **quan sát cơ chế restart + restore từ checkpoint**, không phải bài kiểm chứng exactly-once end-to-end (cần sink transaction — xem case study sink).

**Kết quả:** ⬜ chưa chạy

## Dọn dẹp

```bash
docker compose down -v
```

## Related Topics

- [Event time và watermark](../reference/event-time-watermark.md) — vì sao window đợi watermark, late data
- [State và checkpoint](../reference/state-and-checkpoint.md) — cơ chế checkpoint/restore ở bài 5
- [Windows](../skills/windows.md) — TUMBLE và các window TVF
- [Connectors](../skills/connectors.md) — datagen và các source khác
- [Flink](../index.md) — chủ đề chứa lab này
