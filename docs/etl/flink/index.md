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
updated: 2026-08-11
---
# Flink

**Flink là engine xử lý stream có state.** Khác biệt gốc so với batch: dữ liệu không bao
giờ "hết", nên phải tự định nghĩa *khi nào một cửa sổ tính toán được coi là đủ* — đó là
toàn bộ chuyện event time và watermark. Và vì stream chạy mãi, Flink phải tự giữ **state**
(bộ đếm, cửa sổ, bảng join) và tự khôi phục nó sau khi chết — đó là toàn bộ chuyện
checkpoint.

> **Nhãn kiểm chứng.** Flink cần một cluster; phần lớn output trong `reference/`/`skills/`
> là **số minh hoạ — chưa chạy**, có dán nhãn ngay cạnh. Chỉ [bài tập](tutorials/flink-lab.md)
> dựng cluster Docker mới có output đã chạy. `verified_at` để trống theo luật cứng của kho.

## Mục lục — các component của Flink

| # | Component | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | [Flink là gì](reference/what-is-flink.md) | Stream vs batch, khi nào cần stream thật | 📝 |
| 02 | [Kiến trúc job](reference/architecture.md) | JobManager, TaskManager, slot, parallelism | 📝 |
| 03 | [Event time và watermark](reference/event-time-watermark.md) | Vì sao processing time cho số sai | 📝 |
| 04 | [State và checkpoint](reference/state-and-checkpoint.md) | Nơi giữ state, khôi phục sau khi chết | 📝 |
| 05 | [Exactly-once](reference/exactly-once.md) | Two-phase commit, sink phải hỗ trợ gì | 📝 |
| 06 | [DataStream vs Table/SQL](skills/datastream-vs-table-sql.md) | Chọn API nào cho việc nào | 📝 |
| 07 | [Window](skills/windows.md) | Tumbling, sliding, session, allowed lateness | 📝 |
| 08 | [Savepoint và nâng cấp](skills/savepoint-upgrade.md) | Sửa code mà không mất state; `uid()` | 📝 |
| 09 | [Connector](skills/connectors.md) | Kafka source/sink, Iceberg sink, CDC | 📝 |
| 10 | [Backpressure và tuning](skills/backpressure-tuning.md) | Đọc backpressure, chỉnh parallelism | 📝 |
| — | [Cheatsheet: config và SQL](cheatsheets/config-and-sql.md) | Tra nhanh khi đang làm | 📝 |
| — | [Bài tập: Docker](tutorials/flink-lab.md) | Chạy thật: windowed aggregation, late data | 📝 |

Ký hiệu: ✅ đã chạy tay · 📝 lý thuyết, output minh hoạ · 🟡 mới có khung · ⬜ chưa viết

## Bản đồ khái niệm

| Khái niệm | Là gì | Khi nào chạm tới |
|---|---|---|
| DataStream API | API mức thấp, điều khiển từng event và state | Logic phức tạp, cần kiểm soát state |
| Table/SQL API | Khai báo bằng SQL, Flink tự dịch ra toán tử | Đa số ETL streaming |
| JobManager | Điều phối: lập lịch, checkpoint, khôi phục | Kiến trúc cụm |
| TaskManager | Nơi thật sự chạy toán tử; chứa slot | Kiến trúc cụm, tuning |
| slot / parallelism | Đơn vị tài nguyên / số bản song song của toán tử | Scale job |
| event time | Thời điểm sự việc **xảy ra**, nằm trong dữ liệu | Số phải đúng dù dữ liệu đến muộn |
| watermark | Lời khẳng định "đã hết event trước mốc T" | Quyết định khi nào đóng cửa sổ |
| window | Gom event thành nhóm hữu hạn để tính | Mọi phép tổng hợp trên stream |
| keyed state | State gắn theo key, Flink tự phân vùng | Đếm/join/dedup theo khoá |
| checkpoint | Ảnh chụp state định kỳ để khôi phục tự động | Chịu lỗi |
| savepoint | Ảnh chụp thủ công để nâng cấp/di chuyển job | Đổi code mà giữ state |
| exactly-once | Mỗi event ảnh hưởng kết quả đúng một lần | Số tiền, số đếm không được sai |

## Lộ trình

- [ ] **Hiểu** — giải thích được vì sao processing time cho số sai, và watermark giải quyết gì
- [ ] **Chạy được** — dựng cluster Docker, chạy windowed aggregation bằng Flink SQL, thấy late data bị bỏ hoặc gom ([bài tập](tutorials/flink-lab.md))
- [ ] **Sửa được** — đọc backpressure, chẩn cửa sổ không chạy do watermark, thêm state TTL
- [ ] **Thiết kế được** — chọn window + allowed lateness + sink cho một pipeline exactly-once và bảo vệ được lựa chọn

## Bẫy biết trước

**Event time là chỗ sai nhiều nhất.** Dùng processing time cho tiện thì job chạy mượt và
số sai lặng lẽ — dữ liệu đến muộn bị tính vào cửa sổ sai, không có lỗi nào báo ra. Ba câu
phải thuộc:

1. **Watermark không đợi partition im lặng.** Một nguồn không phát gì có thể giữ watermark
   đứng yên → cửa sổ không bao giờ đóng.
2. **Exactly-once của Flink dừng ở ranh giới sink.** Sink không hỗ trợ 2PC thì kết quả ra
   ngoài vẫn có thể trùng.
3. **State không tự dọn.** Không đặt TTL thì keyed state giữ mọi key mãi mãi → checkpoint
   chậm dần rồi OOM.

## Sai lầm hay gặp

Chi tiết ở [`case-studies/`](case-studies/index.md).

| Sự cố | Bài học |
|---|---|
| [Cửa sổ không chạy](case-studies/cua-so-khong-chay-idle-partition.md) | Partition im lặng giữ watermark đứng yên |
| [Số sai vì processing time](case-studies/so-sai-vi-processing-time.md) | Đến muộn bị gán sai cửa sổ, không lỗi nào báo |
| [State phình](case-studies/state-phinh-thieu-ttl.md) | Thiếu TTL thì state chỉ có tăng |
| [Trùng lặp ở sink](case-studies/trung-lap-vi-sink-khong-transaction.md) | Exactly-once không tự lan tới sink không 2PC |

## Related Topics

- [Kafka](../kafka/index.md) — nguồn vào thường gặp nhất
- [Event time và watermark](reference/event-time-watermark.md) — khái niệm quan trọng nhất
- [Iceberg](../../storage/iceberg/index.md) — nơi Flink ghi ra
- [Data Engineering](../../index.md) — vị trí của Flink trong pipeline

## Nguồn

- [ ] Flink docs — phần *Concepts: Stateful Stream Processing* và *Timely Stream Processing*
- [ ] Stream Processing with Apache Flink (Hueske & Kalavri) — chương time và state
