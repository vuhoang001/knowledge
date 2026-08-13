---
title: Số sai vì dùng processing time
i18n_status: untranslated
sidebar_position: 2
description: "Job chạy mượt, số lặng lẽ sai: event đến muộn bị gán vào cửa sổ theo giờ xử lý, không lỗi nào báo."
tags: [flink, processing-time, event-time, windowing, correctness]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# Số sai vì dùng processing time

> **Chốt:** Processing-time window gán event vào cửa sổ theo **lúc Flink xử lý**, không theo lúc sự kiện xảy ra — khi có lag/retry/backfill, số trong từng phút lặng lẽ sai mà không lỗi nào báo.

## Nhãn

**Tình huống dựng lại** — số liệu là **minh hoạ, chưa chạy trên cluster**, nhưng nhất quán trong bài.

## Bối cảnh

Pipeline đếm số đơn theo cửa sổ 5 phút. Người viết chọn **processing-time** `TUMBLE` cho tiện: không cần khai watermark, không cần timestamp assigner, code ngắn hơn, và "phần lớn thời gian số trông đúng".

## Triệu chứng

*Số minh hoạ — chưa chạy:*

Một event xảy ra lúc **10:59:30** (event time) nhưng do consumer lag / retry, Flink xử lý lúc **11:02:00** (processing time). Processing-time window gán nó vào cửa sổ **11:00–11:05**.

So cùng một tập dữ liệu, hai chế độ cho hai kết quả:

| Cửa sổ | Đếm theo **event time** (đúng) | Đếm theo **processing time** (bài này) |
|---|---|---|
| 10:55–11:00 | 1.000 | 940 |
| 11:00–11:05 | 1.000 | 1.060 |

*(minh hoạ, chưa chạy)* — 60 event của phút 10:55 bị "chảy" sang phút 11:00. Tổng vẫn 2.000, nhưng **phân bổ theo phút sai**. Dashboard nhìn hợp lý nên không ai nghi.

## Giả thuyết sai lúc đầu

1. **Nghi mất dữ liệu.** Đếm tổng cả ngày event-time vs processing-time → **bằng nhau**. Không mất.
2. **Nghi trùng.** Dedup theo `order_id` → không có bản trùng. Loại.
3. **Nghi sai công thức gộp.** Rà lại logic `COUNT` → đúng. Không phải công thức.

Chỗ mất thời gian: mọi giả thuyết soi vào *dữ liệu* và *phép tính*, trong khi lỗi nằm ở **trục thời gian dùng để chia cửa sổ**.

## Nguyên nhân thật

Processing-time window phụ thuộc **thời điểm máy xử lý**, không phải thời điểm sự kiện. Bất cứ thứ gì làm processing time lệch event time — consumer lag, retry, restart, backfill, backpressure — đều đẩy event sang nhầm cửa sổ. Không có lỗi vì với Flink đây là hành vi đúng của processing time.

Bằng chứng quyết định: **chạy lại (reprocess)** cùng dữ liệu lịch sử cho ra số **khác** lần chạy đầu — vì lần reprocess, mọi event được xử lý dồn, processing time hoàn toàn khác. Kết quả **không tất định**.

## Cách sửa

Chuyển sang **event-time** window: gán timestamp từ chính sự kiện và khai watermark.

```java
// DataStream API
WatermarkStrategy<Order> strategy = WatermarkStrategy
    .<Order>forBoundedOutOfOrderness(Duration.ofSeconds(5))
    .withTimestampAssigner((e, ts) -> e.eventTimeMillis); // dùng ts trong event
```

```sql
-- Flink SQL: khai WATERMARK trong CREATE TABLE, rồi TUMBLE theo cột thời gian đó
CREATE TABLE orders (
  order_id STRING,
  amount   DECIMAL(10,2),
  event_ts TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
) WITH ( /* connector ... */ );

SELECT window_start, COUNT(*)
FROM TABLE(TUMBLE(TABLE orders, DESCRIPTOR(event_ts), INTERVAL '5' MINUTES))
GROUP BY window_start, window_end;
```

Với event time, event 10:59:30 luôn vào cửa sổ 10:55–11:00 dù xử lý lúc nào. Reprocess ra **đúng số cũ** — tất định.

Đánh đổi: cần chấp nhận độ trễ nhỏ (chờ watermark) và xử lý event late tường minh (drop hoặc allowed lateness), thay vì "ra ngay nhưng sai".

## Dấu hiệu nhận ra sớm

**Chạy lại một khoảng lịch sử và so với lần đầu.** Nếu số **khác** → kết quả phụ thuộc processing time → sai bản chất. Một pipeline event-time đúng phải cho **cùng số mỗi lần reprocess**.

## Related Topics

- [Event time và watermark](../reference/event-time-watermark.md) — khác biệt event time vs processing time, và tính tất định
- [Windows](../skills/windows.md) — chọn trục thời gian cho window
- [Flink](../index.md) — chủ đề chứa case study này
