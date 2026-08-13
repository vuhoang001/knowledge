---
title: Mất dữ liệu với acks=1
i18n_status: untranslated
sidebar_position: 3
description: "Leader chết trước khi follower kịp sao chép — message đã báo thành công biến mất."
tags: [kafka, acks, durability, replication, isr]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Mất dữ liệu với acks=1

> **Chốt:** Với `acks=1`, producer coi là "thành công" ngay khi *leader* nhận — nếu leader chết trước khi follower kịp replicate, follower lên leader và message đó biến mất, dù producer đã báo OK.

## Nhãn

**Tình huống dựng lại** — số liệu là **minh hoạ, chưa chạy trên cluster**, nhưng nhất quán trong bài.

## Bối cảnh

Topic `payments` có `replication.factor=3`. Producer cấu hình `acks=1` (mặc định lịch sử của nhiều client cũ). Ứng dụng đọc `RecordMetadata` trả về, log "gửi thành công" và coi như xong.

Trong một lần bảo trì / lỗi phần cứng, broker đang là **leader** của một vài partition bị restart đúng lúc tải cao.

## Triệu chứng

*Số minh hoạ — chưa chạy:*

- Đối soát cuối ngày: **producer log gửi 1.000.000 record**, consumer chỉ đọc được **999.987**. Lệch **13 record**.
- Toàn bộ 13 record lệch có timestamp nằm trong **cửa sổ ~2 giây quanh một lần leader election** (thấy trong controller log).
- Không có lỗi nào phía producer — mọi record đều nhận `RecordMetadata`, không exception.

## Giả thuyết sai lúc đầu

1. **Nghi producer không gửi.** Rà lại: producer có `RecordMetadata` cho cả 13 record → *đã* gửi và *đã* được leader nhận. Loại.
2. **Nghi consumer bỏ sót.** Reset offset đọc lại từ đầu partition — vẫn không có 13 record đó trên đĩa. Không phải consumer.
3. **Nghi retention xoá mất.** Kiểm `retention.ms` — dữ liệu mới vài giờ, chưa tới hạn xoá. Loại.

Chỗ mất thời gian: cả ba giả thuyết giả định "message có trên broker". Sự thật là nó **chưa bao giờ được ghi bền** — leader nhận rồi chết trước khi ai sao chép.

## Nguyên nhân thật

`acks=1` chỉ chờ **leader** ghi vào log của nó, *không* chờ follower. Chuỗi mất dữ liệu:

1. Producer gửi → leader ghi vào log → trả ack. Producer báo thành công.
2. Leader crash **trước khi** follower kéo bản sao đó.
3. Một follower (chưa có message đó) lên làm leader.
4. Message không tồn tại ở leader mới → mất vĩnh viễn.

`replication.factor=3` **không cứu** được, vì `acks=1` không đợi replicate. Độ bền do `acks` quyết định, không phải chỉ do số replica.

## Cách sửa

1. **Producer chờ đủ replica trong ISR xác nhận:**

   ```properties
   acks=all
   enable.idempotence=true
   ```

2. **Topic/broker bắt buộc tối thiểu 2 replica bắt kịp:**

   ```properties
   min.insync.replicas=2
   ```

   Với `acks=all` + `min.insync.replicas=2`: ghi chỉ thành công khi ít nhất 2 replica có message. Leader chết thì replica còn lại (đã có message) lên leader — không mất.

3. **Cấm bầu leader từ replica lạc hậu:**

   ```properties
   unclean.leader.election.enable=false
   ```

   Ngăn một follower *ngoài* ISR (thiếu dữ liệu) được lên leader — đó là con đường mất dữ liệu còn lại.

Đánh đổi: `acks=all` tăng latency ghi và, khi số replica sống tụt dưới `min.insync.replicas`, producer sẽ **fail** (`NotEnoughReplicas`) thay vì âm thầm mất — đây là hành vi *đúng* cho dữ liệu quan trọng.

## Dấu hiệu nhận ra sớm

Đối soát **đếm gửi vs nhận quanh mỗi lần leader election**:

```bash
# xem lịch sử đổi leader; nếu số lệch producer/consumer bám sát các mốc này → nghi acks
kafka-topics --bootstrap-server localhost:9092 --describe --topic payments
# so Leader vs Replicas vs Isr: Isr co lại đúng lúc mất dữ liệu là dấu hiệu
```

Cảnh báo sớm nhất: alert khi `min.insync.replicas` không đạt, và kiểm mọi topic quan trọng đang chạy `acks=1`.

## Related Topics

- [Replication và độ bền](../reference/replication-durability.md) — ISR, `min.insync.replicas`, vì sao `acks` quyết định độ bền
- [Producer tuning](../skills/producer-tuning.md) — chọn `acks`, `enable.idempotence`
- [Kafka](../index.md) — chủ đề chứa case study này
