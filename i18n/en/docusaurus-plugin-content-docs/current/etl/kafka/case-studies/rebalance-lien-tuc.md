---
title: Consumer rebalance không dứt
i18n_status: untranslated
sidebar_position: 2
description: "Xử lý một batch lâu hơn max.poll.interval.ms → bị coi là chết → rebalance vòng lặp."
tags: [kafka, consumer-group, rebalance, max-poll-interval]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Consumer rebalance không dứt

> **Chốt:** Nếu một vòng xử lý giữa hai lần `poll()` lâu hơn `max.poll.interval.ms`, coordinator coi consumer là chết và đá khỏi group — consumer thay thế cũng chậm y hệt, thành vòng lặp rebalance, throughput về gần 0.

## Nhãn

**Tình huống dựng lại** — số liệu bên dưới là **minh hoạ, chưa chạy trên cluster**, nhưng nhất quán để lần lại lập luận.

## Bối cảnh

Consumer group `enrich-events` có 3 consumer, đọc topic 12 partition. Trong vòng xử lý mỗi record, consumer gọi một **API bên ngoài** để enrich. API này lúc bình thường ~50ms, nhưng khi bên kia chậm thì lên vài giây/lần.

`max.poll.records` để mặc định (500). `max.poll.interval.ms` để **mặc định 300000** (5 phút). Nghĩa là consumer có tối đa 5 phút để xử lý xong một batch tối đa 500 record rồi phải gọi `poll()` lần nữa.

## Triệu chứng

*Số minh hoạ — chưa chạy:*

- Log consumer đầy dòng `Attempt to heartbeat failed since group is rebalancing` và `Revoking previously assigned partitions`.
- Lag tăng đều, throughput xử lý ~**0 record/phút** trong khi CPU consumer không cao.
- `kafka-consumer-groups --describe` cho thấy assignment đổi liên tục, có lúc không consumer nào giữ partition (`CONSUMER-ID` trống).

## Giả thuyết sai lúc đầu

1. **Nghi network chập chờn giữa consumer và broker.** Đi bắt gói, đo RTT tới broker — bình thường. Heartbeat thread vẫn chạy đều (nó chạy nền, tách khỏi vòng xử lý).
2. **Nghi broker quá tải.** Xem metric broker — CPU, disk, request queue đều thấp. Broker khoẻ.
3. **Nhầm `max.poll.interval.ms` với `session.timeout.ms`.** Đi chỉnh `session.timeout.ms` trước (mặc định 45000) vì nghĩ heartbeat trễ. Không đúng — heartbeat vẫn gửi đều nhờ background thread; cái vỡ là *vòng poll* quá lâu.

Chỗ mất thời gian: phân biệt hai timeout. `session.timeout.ms` là "còn gửi heartbeat không"; `max.poll.interval.ms` là "còn gọi poll() không". Ở đây heartbeat OK nhưng poll() trễ.

## Nguyên nhân thật

Khi API ngoài chậm, xử lý 500 record × vài giây vượt quá 5 phút giữa hai lần `poll()`. Coordinator hết `max.poll.interval.ms` → coi consumer đã treo → **kick khỏi group** → rebalance → partition chuyển cho consumer khác → consumer đó cũng gặp API chậm → lại quá hạn → lặp vô tận. Trong lúc rebalance không ai commit được, nên lag chỉ tăng.

## Cách sửa

1. **Giảm khối lượng mỗi vòng poll** để chắc chắn kịp:

   ```properties
   max.poll.records=50
   max.poll.interval.ms=600000
   ```

2. **Đưa xử lý nặng ra ngoài vòng poll** — poll về nhanh, đẩy record vào một thread pool / hàng đợi nội bộ, commit sau khi xong. Đây là cách bền nhất; chỉ chỉnh config là mua thêm thời gian chứ không chữa gốc.

3. **Dùng `cooperative-sticky` assignor** để rebalance không thu hồi *toàn bộ* partition mỗi lần (giảm cú "stop-the-world"):

   ```properties
   partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor
   ```

4. Thêm timeout + circuit breaker cho API ngoài để một lần chậm không kéo cả batch quá hạn.

## Dấu hiệu nhận ra sớm

Assignment đổi liên tục là dấu hiệu số một:

```bash
# chạy lặp; nếu CONSUMER-ID / HOST đổi mỗi lần gọi → đang rebalance liên tục
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group enrich-events
```

Và đo thời gian giữa hai `poll()` ngay trong consumer (log delta). Delta tiến gần `max.poll.interval.ms` là báo động, đừng đợi tới lúc bị kick.

## Related Topics

- [Consumer group và rebalance](../skills/consumer-groups.md) — `max.poll.interval.ms` vs `session.timeout.ms`, assignor
- [Vận hành và lag](../skills/operations-lag.md) — đọc lag và phát hiện rebalance qua `kafka-consumer-groups`
- [Kafka](../index.md) — chủ đề chứa case study này
