---
title: Apache Flink
description: Engine xử lý stream có state — event time và watermark là chỗ sai nhiều nhất.
tags: [flink, streaming, event-time, watermark, checkpoint]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: advanced
verified_at:
updated: 2026-07-31
---
# Flink

**Flink là engine xử lý stream có state.** Khác biệt gốc so với batch: dữ liệu không
bao giờ "hết", nên phải tự định nghĩa *khi nào một cửa sổ tính toán được coi là đủ* —
đó là toàn bộ chuyện event time và watermark.

Trạng thái: **chưa bắt đầu**. Nội dung dưới là mục lục dự kiến, chưa file nào được viết.

## Mục lục — các component của Flink

| # | Component | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | Flink là gì | Stream vs batch, khi nào cần stream thật | ⬜ |
| 02 | Kiến trúc job | JobManager, TaskManager, slot, parallelism | ⬜ |
| 03 | DataStream API vs Table/SQL API | Chọn cái nào cho việc nào | ⬜ |
| 04 | Event time và watermark | Vì sao processing time cho số sai | ⬜ |
| 05 | Window | Tumbling, sliding, session, allowed lateness | ⬜ |
| 06 | State và checkpoint | Nơi giữ state, khôi phục sau khi chết | ⬜ |
| 07 | Savepoint và nâng cấp job | Sửa code mà không mất state | ⬜ |
| 08 | Connector | Kafka source/sink, Iceberg sink, CDC | ⬜ |
| 09 | Exactly-once | Two-phase commit, sink phải hỗ trợ gì | ⬜ |
| 10 | Bài tập | Chạy thật, có output | ⬜ |

## Bẫy biết trước

**Event time là chỗ sai nhiều nhất.** Dùng processing time cho tiện thì job chạy
mượt và số sai lặng lẽ — dữ liệu đến muộn bị tính vào cửa sổ sai, không có lỗi nào
báo ra.

## Liên kết

- [Kafka](../kafka/) — nguồn vào thường gặp nhất
- [Iceberg](../../storage/iceberg/index.md) — nơi Flink ghi ra
