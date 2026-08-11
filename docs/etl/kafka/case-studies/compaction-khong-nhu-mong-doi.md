---
title: Compaction không như mong đợi
sidebar_position: 4
description: "Tưởng compacted topic chỉ giữ bản mới nhất tức thì; bản cũ và tombstone còn rất lâu."
tags: [kafka, log-compaction, tombstone, retention]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Compaction không như mong đợi

> **Chốt:** Compaction là quá trình chạy **nền**, không phải xoá tức thì — active segment không bị compact, tombstone còn theo `delete.retention.ms`, nên consumer phải chịu được nhiều bản mỗi key thay vì giả định "một bản/key".

## Nhãn

**Tình huống dựng lại** — số liệu là **minh hoạ, chưa chạy trên cluster**, nhất quán trong bài.

## Bối cảnh

Topic `user-profile` cấu hình `cleanup.policy=compact`, dùng làm **bảng trạng thái**: mỗi user một record, `key=user_id`, value là profile mới nhất. Một service khởi động đọc topic từ đầu để dựng cache trong bộ nhớ, giả định "mỗi key chỉ có một bản — bản mới nhất".

## Triệu chứng

*Số minh hoạ — chưa chạy:*

- Service đọc từ đầu topic thấy user `U1` xuất hiện **4 lần** với 4 value khác nhau (các bản cũ), không phải 1.
- User `U9` đã xoá (gửi tombstone `key=U9, value=null`) từ **2 ngày trước** nhưng consumer đọc lại vẫn thấy record `U9` — cả bản có value lẫn tombstone.
- Nếu cache lấy *bản đầu tiên gặp* thay vì bản cuối → profile hiển thị dữ liệu **cũ**.

## Giả thuyết sai lúc đầu

1. **Nghi key sai** — nghĩ producer đặt key không nhất quán nên compaction không gộp. Kiểm lại: key đúng, cùng `U1` thật.
2. **Nghi producer gửi trùng.** Đúng là có nhiều bản, nhưng đó là *cập nhật theo thời gian* (profile đổi 4 lần), không phải bug gửi trùng.

Chỗ mất thời gian: giả định "compacted = chỉ còn bản mới nhất, ngay lập tức". Sai. Compaction *cuối cùng* mới hội tụ về một bản/key, và cũng không đảm bảo tuyệt đối chỉ còn đúng 1.

## Nguyên nhân thật

Log compaction là **background cleaner**, không đồng bộ với lúc ghi:

- **Active segment không bao giờ bị compact.** Mọi record đang ghi vào segment hiện hành đều còn nguyên, kể cả nhiều bản cùng key.
- **Chưa "dirty" đủ thì cleaner không chạy.** `min.cleanable.dirty.ratio` (mặc định ~0.5) quyết định tỉ lệ log bẩn tối thiểu mới kích hoạt compact; `segment.ms`/`segment.bytes` quyết định khi nào segment mới đóng lại để thành ứng viên.
- **Tombstone còn lại một thời gian có chủ đích.** `delete.retention.ms` (mặc định ~86400000 = 1 ngày) giữ tombstone đủ lâu để mọi consumer kịp thấy "key này đã xoá" trước khi tombstone bị dọn — nên `U9` vẫn xuất hiện.

Kết luận: **consumer không được giả định một-bản-mỗi-key**. Compaction giảm *tối đa* dung lượng dài hạn, không phải một hợp đồng "đọc lúc nào cũng đúng một bản".

## Cách sửa

Sửa *đúng* nằm ở consumer, chỉnh config chỉ là phụ:

1. **Consumer idempotent theo key, lấy bản offset lớn nhất.** Đọc từ đầu topic thì luôn ghi đè theo key; bản đến sau (offset lớn hơn) thắng. Tombstone (`value=null`) → xoá key khỏi cache.

   ```java
   // giả mã: bản sau ghi đè bản trước; null = xoá
   if (record.value() == null) cache.remove(record.key());
   else cache.put(record.key(), record.value());   // offset lớn hơn tới sau → thắng
   ```

2. **Muốn compaction chạy sớm/gọn hơn** (phụ trợ, không thay được điểm 1):

   ```properties
   cleanup.policy=compact
   segment.ms=600000            # đóng segment thường xuyên hơn để có ứng viên compact
   min.cleanable.dirty.ratio=0.1
   delete.retention.ms=3600000  # rút ngắn thời gian giữ tombstone (cẩn thận: consumer chậm có thể lỡ)
   ```

   Cảnh báo: rút `delete.retention.ms` quá ngắn → consumer đọc chậm có thể **không kịp thấy tombstone** → giữ record đã xoá mãi. Đây là đánh đổi, không phải nút "tối ưu".

## Dấu hiệu nhận ra sớm

Đọc lại từ đầu và đếm số bản mỗi key:

```bash
# nếu một key xuất hiện >1 lần, hoặc thấy value rỗng (tombstone) → consumer PHẢI xử lý được
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic user-profile --from-beginning \
  --property print.key=true --property print.value=true --timeout-ms 5000
```

Test sức khoẻ consumer: cố tình gửi 3 bản cùng một key rồi cho service dựng cache — nếu kết quả không phải bản cuối, consumer đang giả định sai.

## Related Topics

- [Retention và compaction](../reference/retention-compaction.md) — compaction vs delete, tombstone, `min.cleanable.dirty.ratio`
- [Kafka](../index.md) — chủ đề chứa case study này
