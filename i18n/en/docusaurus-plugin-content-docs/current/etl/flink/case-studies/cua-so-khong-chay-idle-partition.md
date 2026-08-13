---
title: Cửa sổ không bao giờ chạy vì partition im lặng
i18n_status: untranslated
sidebar_position: 1
description: "Một Kafka partition không phát gì giữ watermark đứng yên — window không đóng, kết quả không ra."
tags: [flink, watermark, idle-partition, event-time, windowing]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# Cửa sổ không bao giờ chạy vì partition im lặng

> **Chốt:** Watermark toàn cục lấy **min** của mọi partition; một partition im lặng thì watermark của nó không tiến, kéo watermark toàn cục đứng yên — window event-time không bao giờ đủ điều kiện đóng, và kết quả không bao giờ ra.

## Nhãn

**Tình huống dựng lại** — số liệu là **minh hoạ, chưa chạy trên cluster**, nhưng nhất quán trong bài.

## Bối cảnh

Job đọc topic `orders` có **6 partition**, mỗi partition mang đơn của một khu vực. Pipeline gộp doanh số theo cửa sổ event-time 5 phút (`TUMBLE`), đẩy ra dashboard.

Ban ngày mọi khu vực đều có traffic, dashboard cập nhật đều. Ban đêm, một khu vực (partition) gần như **không có đơn nào** trong nhiều giờ.

## Triệu chứng

*Số minh hoạ — chưa chạy:*

- Ban đêm dashboard **đứng im**: cửa sổ 5 phút cuối cùng ra lúc 23:05, sau đó không có dòng mới nào cho tới sáng.
- Job vẫn **RUNNING**, không exception, không restart. Records-in vẫn nhích (các partition khác vẫn có đơn).
- Khi khu vực im lặng có đơn trở lại lúc ~06:00, **một loạt** cửa sổ dồn của cả đêm bất ngờ ra cùng lúc.

## Giả thuyết sai lúc đầu

1. **Nghi job treo.** Xem UI: subtask vẫn RUNNING, throughput dương. Không treo.
2. **Nghi checkpoint fail.** Checkpoint vẫn hoàn tất đúng interval, size ổn định. Loại.
3. **Nghi sink chặn.** Test ghi thẳng vài dòng vào sink — sink nhận bình thường. Không phải sink.

Chỗ mất thời gian: cả ba giả thuyết giả định "có kết quả nhưng bị kẹt đâu đó trên đường ra". Sự thật là **kết quả chưa bao giờ được sinh ra** — window operator chưa nhận đủ watermark để trigger.

## Nguyên nhân thật

Watermark của một operator nhiều đầu vào là **min các watermark đầu vào** — để không đóng cửa sổ sớm mà bỏ sót dữ liệu từ đầu vào chậm nhất.

Mỗi partition sinh watermark riêng. Partition im lặng **không có event mới** nên watermark của nó **không tiến**. Window operator lấy min → watermark toàn cục dính ở mốc cũ → điều kiện `watermark ≥ window end` không bao giờ đạt → window không trigger.

Đây là hành vi **đúng theo thiết kế**, không phải bug: Flink không thể biết partition kia "hết dữ liệu" hay chỉ "tạm im".

## Cách sửa

Đánh dấu source **idle** sau một khoảng lặng, để nó tạm rút khỏi phép tính min watermark:

```java
// DataStream API
WatermarkStrategy<Order> strategy = WatermarkStrategy
    .<Order>forBoundedOutOfOrderness(Duration.ofSeconds(5))
    .withTimestampAssigner((e, ts) -> e.eventTimeMillis)
    .withIdleness(Duration.ofMinutes(1)); // partition im lặng >1 phút → coi là idle
```

```sql
-- Flink SQL: đặt qua config của bảng/pipeline
SET 'table.exec.source.idle-timeout' = '60000'; -- 60s, đơn vị ms
```

Sau khi bật `withIdleness`, partition im lặng quá ngưỡng bị bỏ khỏi min → watermark toàn cục tiến theo các partition còn hoạt động → window đóng đúng nhịp.

Đánh đổi: nếu partition "idle" thật ra chỉ chậm và sau đó có event **cũ**, event đó có thể tới sau khi watermark đã vượt qua và bị coi là **late**. Chọn `idle-timeout` đủ lớn so với độ trễ thực tế của luồng chậm nhất.

## Dấu hiệu nhận ra sớm

Theo dõi **`currentOutputWatermark` theo từng subtask** trong Flink UI hoặc metrics:

```text
subtask 0: currentOutputWatermark = 2026-08-11 06:00:00
subtask 3: currentOutputWatermark = 2026-08-11 23:05:00  <-- đứng yên
```

Một subtask có watermark **không tăng** trong khi các subtask khác tiến đều = gần như chắc chắn có partition idle. Đặt alert khi độ lệch watermark giữa subtask vượt ngưỡng.

## Related Topics

- [Event time và watermark](../reference/event-time-watermark.md) — vì sao watermark lấy min, và cơ chế idleness
- [Windows](../skills/windows.md) — điều kiện trigger của window event-time
- [Flink](../index.md) — chủ đề chứa case study này
