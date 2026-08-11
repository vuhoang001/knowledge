---
title: Mất thứ tự vì đổi partition key
sidebar_position: 1
description: "Đổi key giữa chừng làm event cùng thực thể rơi khác partition — thứ tự vỡ."
tags: [kafka, partition-key, ordering, producer]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Mất thứ tự vì đổi partition key

> **Chốt:** Thứ tự chỉ được đảm bảo *trong một partition*, và key quyết định partition — đổi key giữa chừng là tự tay rải event của cùng một thực thể ra nhiều partition, thứ tự vỡ ngay.

## Nhãn

**Tình huống dựng lại** — không phải sự cố production có thật. Các con số bên dưới là **minh hoạ, chưa chạy trên cluster**, nhưng nhất quán trong nội bộ bài để lần lại được lập luận.

## Bối cảnh

Topic `user-events` có **6 partition**. Producer ban đầu đặt `key = user_id`, nên mọi event của một user luôn rơi vào cùng một partition → consumer thấy `create` rồi mới `update`, đúng thứ tự.

Một thay đổi tưởng vô hại: có người sửa producer để "phân bố đều hơn", đổi thành `key = null` (round-robin) — hoặc `key = event_type`. Từ lúc đó, hai event của cùng một `user_id` có thể rơi hai partition khác nhau.

## Triệu chứng

*Số minh hoạ — chưa chạy:*

- Downstream báo ~**0.3%** user có state "update trước create" — ví dụ user vừa tạo đã thấy `status=updated` mà không có bản `created` trước đó.
- Chỉ xảy ra với user có **nhiều event sát nhau** (trong vài trăm ms); user thưa event thì không thấy.
- `kafka-consumer-groups --describe` cho lag đều, không có partition nào tồn đọng bất thường.

## Giả thuyết sai lúc đầu

1. **Nghi consumer đa luồng.** Nghĩ consumer xử lý song song nhiều thread nên đảo thứ tự. Mất thời gian ép consumer về single-thread — vẫn sai. (Vì gốc rễ nằm ở phía producer, không phải consumer.)
2. **Nghi clock skew giữa các service.** Đi so `event_time` giữa producer và consumer, chỉnh NTP. Không liên quan — Kafka đảm bảo thứ tự theo *offset trong partition*, không theo timestamp.

Chỗ mất thời gian: cả hai giả thuyết đều nhìn vào phía consumer, trong khi thứ tự đã vỡ *trước khi* consumer đọc.

## Nguyên nhân thật

Thứ tự của Kafka chỉ tồn tại **bên trong một partition**. Không có khái niệm "thứ tự toàn topic". Partition được chọn bằng `hash(key) % num_partitions` (khi có key), hoặc round-robin/sticky (khi `key=null`).

Đổi key từ `user_id` sang `null`/`event_type` nghĩa là hai event của cùng user không còn chung partition → consumer đọc chúng từ hai partition độc lập, không có gì ràng buộc `create` phải tới trước `update`.

## Cách sửa

1. **Cố định key theo thực thể cần giữ thứ tự.** Event của cùng một user thì `key = user_id`. Đây là hợp đồng, không phải chi tiết tối ưu — đừng đổi để "cân tải".

   ```properties
   # producer: key phải ổn định theo thực thể cần thứ tự
   # (đặt ở tầng ứng dụng khi build ProducerRecord, không phải config)
   ```

2. **Nếu buộc phải đổi cách phân partition** (đổi số partition, đổi key): phải **drain** — dừng producer, để consumer đọc hết tồn đọng, rồi mới đổi. Đổi nóng chắc chắn có cửa sổ event cũ (partition cũ) và mới (partition mới) chồng nhau.

3. Nếu tải lệch vì một số user quá nóng (hot key), giải bằng **tăng partition + key phức hợp** (`user_id` + bucket) chứ không bỏ key.

## Dấu hiệu nhận ra sớm

Kiểm ngay một `user_id` nghi vấn nằm ở mấy partition:

```bash
# Với mỗi partition, đọc và grep user_id — nếu >1 partition có nó thì thứ tự đã vỡ
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic user-events --partition 0 --from-beginning --timeout-ms 5000 \
  --property print.partition=true | grep '"user_id":"U123"'
```

Nếu cùng một `user_id` xuất hiện ở nhiều partition → key không ổn định. Chốt chặn: review mọi thay đổi tới logic chọn key như thay đổi schema.

## Related Topics

- [Topic, partition, offset](../reference/topic-partition-offset.md) — vì sao thứ tự chỉ trong một partition
- [Producer tuning](../skills/producer-tuning.md) — key → partition, và đánh đổi khi chọn key
- [Kafka](../index.md) — chủ đề chứa case study này
