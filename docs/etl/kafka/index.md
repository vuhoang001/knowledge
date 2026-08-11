---
title: Apache Kafka
description: Kafka là một cái log, không phải hàng đợi — message không biến mất khi đọc xong.
tags: [kafka, streaming, message-bus, cdc]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---
# Kafka

**Kafka là một cái log ghi-thêm (append-only), không phải hàng đợi.** Message không
biến mất khi đọc xong — consumer tự giữ vị trí đọc (`offset`) của mình. Đó là khác biệt
gốc so với RabbitMQ, và là lý do nhiều consumer group đọc được cùng một dữ liệu một cách
độc lập. Hiểu sai chỗ này thì mọi thứ sau sai theo: sẽ đi tìm "message bị ai lấy mất"
trong khi nó vẫn nằm nguyên trên đĩa.

> **Nhãn kiểm chứng.** Kho này bắt output phải là **chạy thật**. Kafka cần một cluster
> nên phần lớn output trong nhóm `reference/`/`skills/` là **số minh hoạ — chưa chạy**,
> có dán nhãn ngay cạnh. Chỉ [bài tập](tutorials/kafka-lab.md) dựng broker thật bằng
> Docker mới có output đã chạy. `verified_at` để trống cho tới khi chủ repo chạy tay.

## Mục lục — các component của Kafka

| # | Component | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | [Kafka là gì](reference/what-is-kafka.md) | Log vs queue, khi nào cần và khi nào không | 📝 |
| 02 | [Topic, partition, offset](reference/topic-partition-offset.md) | Đơn vị song song, thứ tự đảm bảo tới đâu | 📝 |
| 03 | [Replication và độ bền](reference/replication-durability.md) | Leader/follower, ISR, `min.insync.replicas` | 📝 |
| 04 | [Retention và compaction](reference/retention-compaction.md) | Xoá theo thời gian vs giữ bản mới nhất mỗi key | 📝 |
| 05 | [Delivery semantics](reference/delivery-semantics.md) | At-most/at-least/exactly-once; idempotence, transaction | 📝 |
| 06 | [Producer tuning](skills/producer-tuning.md) | `acks`, batching, key → partition, idempotence | 📝 |
| 07 | [Consumer group và rebalance](skills/consumer-groups.md) | Rebalance, `auto.offset.reset`, commit offset | 📝 |
| 08 | [Schema Registry](skills/schema-registry.md) | Avro/Protobuf, tương thích ngược khi đổi schema | 📝 |
| 09 | [Kafka Connect và CDC](skills/kafka-connect-cdc.md) | Debezium — bắt thay đổi từ database | 📝 |
| 10 | [Vận hành và lag](skills/operations-lag.md) | Lag, `kafka-consumer-groups`, cân partition | 📝 |
| — | [Cheatsheet: CLI và config](cheatsheets/cli-and-config.md) | Tra nhanh lệnh và config khi đang làm | 📝 |
| — | [Bài tập: Docker](tutorials/kafka-lab.md) | Chạy thật: produce, consume, rebalance, compaction | 📝 |

Ký hiệu: ✅ đã chạy tay · 📝 lý thuyết, output minh hoạ · 🟡 mới có khung · ⬜ chưa viết

## Bản đồ khái niệm

| Khái niệm | Là gì | Khi nào chạm tới |
|---|---|---|
| topic | Một luồng message có tên, chia thành partition | Đơn vị tổ chức dữ liệu |
| partition | Một log có thứ tự — đơn vị song song **và** đơn vị thứ tự | Muốn scale hoặc muốn giữ thứ tự |
| offset | Số thứ tự của một message trong partition; consumer tự giữ | Đọc lại, tua, đo lag |
| producer | Bên ghi; chọn partition qua key, chọn độ bền qua `acks` | Đưa dữ liệu vào |
| consumer group | Nhóm consumer chia nhau các partition của topic | Đọc song song, chịu lỗi |
| replication factor | Mỗi partition có mấy bản; leader phục vụ, follower sao | Chịu lỗi broker |
| ISR | Tập replica đang bắt kịp leader | Quyết định message được coi là "bền" |
| retention | Giữ message bao lâu / bao nhiêu byte rồi xoá theo thời gian | Log không phình vô hạn |
| log compaction | Giữ **bản mới nhất mỗi key**, không xoá theo thời gian | Topic dạng "trạng thái hiện tại" (CDC) |
| Schema Registry | Kho schema Avro/Protobuf; ràng buộc tương thích | Nhiều team đọc chung một topic |
| Kafka Connect | Framework kéo/đẩy dữ liệu không cần code; Debezium cho CDC | Nối database ↔ Kafka |
| consumer lag | Khoảng cách giữa offset mới nhất và offset đã đọc | Chỉ số sức khoẻ số một |

## Lộ trình

- [ ] **Hiểu** — giải thích được vì sao Kafka là log chứ không phải queue, và thứ tự chỉ được đảm bảo trong một partition
- [ ] **Chạy được** — dựng broker Docker, produce/consume, thấy một consumer group **rebalance** tận mắt ([bài tập](tutorials/kafka-lab.md))
- [ ] **Sửa được** — đọc được consumer lag, chẩn được rebalance liên tục, chọn đúng `acks` cho yêu cầu độ bền
- [ ] **Thiết kế được** — chọn số partition, chọn key, chọn retention vs compaction cho một use case thật và bảo vệ được lựa chọn

## Nguyên tắc

Đọc hết docs mà chưa từng để một consumer group **rebalance** thì chưa biết gì về Kafka.
Ba câu phải thuộc:

1. **Thứ tự chỉ trong một partition.** Cần thứ tự theo một thực thể thì message của thực
   thể đó phải cùng một key → cùng một partition.
2. **`acks=all` + `min.insync.replicas=2` mới là bền.** `acks=1` mất dữ liệu khi leader
   chết đúng lúc.
3. **Consumer giữ offset, không phải broker.** Đọc lại quá khứ là chuyện bình thường.

## Sai lầm hay gặp

Chi tiết ở [`case-studies/`](case-studies/index.md).

| Sự cố | Bài học |
|---|---|
| [Mất thứ tự vì đổi key](case-studies/mat-thu-tu-vi-doi-key.md) | Thứ tự gắn với partition, partition gắn với key |
| [Rebalance không dứt](case-studies/rebalance-lien-tuc.md) | Xử lý lâu hơn `max.poll.interval.ms` là bị đá khỏi group |
| [Mất dữ liệu với acks=1](case-studies/mat-du-lieu-acks-1.md) | "Gửi thành công" với `acks=1` không có nghĩa là bền |
| [Compaction không như mong đợi](case-studies/compaction-khong-nhu-mong-doi.md) | Compaction là quá trình nền, không phải xoá tức thì |

## Related Topics

- [Flink](../flink/index.md) — engine đọc Kafka và xử lý stream có state
- [Schema Registry](skills/schema-registry.md) — hợp đồng dữ liệu giữa các team
- [Iceberg](../../storage/iceberg/index.md) — đích Kafka thường chảy vào qua Flink
- [Data Engineering](../../index.md) — vị trí của Kafka trong đường đi của dữ liệu

## Nguồn

- [ ] Kafka: The Definitive Guide (Confluent) — chương log, replication, exactly-once
- [ ] Tài liệu chính thức kafka.apache.org — phần *Design* đọc trước phần *Configuration*
