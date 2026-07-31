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
updated: 2026-07-31
---
# Kafka

**Kafka là một cái log, không phải hàng đợi.** Message không biến mất khi đọc xong —
consumer tự giữ vị trí đọc (`offset`) của mình. Đó là khác biệt gốc so với RabbitMQ
và là lý do nhiều consumer group đọc được cùng một dữ liệu độc lập.

Trạng thái: **chưa bắt đầu**. Nội dung dưới là mục lục dự kiến, chưa file nào được viết.

## Mục lục — các component của Kafka

| # | Component | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | Kafka là gì | Log vs queue, khi nào cần và khi nào không | ⬜ |
| 02 | Topic, partition, offset | Đơn vị song song, thứ tự được đảm bảo tới đâu | ⬜ |
| 03 | Producer | `acks`, key → partition, idempotence, batching | ⬜ |
| 04 | Consumer và consumer group | Rebalance, `auto.offset.reset`, commit offset | ⬜ |
| 05 | Replication và độ bền | Leader/follower, ISR, `min.insync.replicas` | ⬜ |
| 06 | Retention và compaction | Xoá theo thời gian vs giữ bản mới nhất mỗi key | ⬜ |
| 07 | Schema Registry | Avro/Protobuf, tương thích ngược khi đổi schema | ⬜ |
| 08 | Kafka Connect và CDC | Debezium — bắt thay đổi từ database | ⬜ |
| 09 | Vận hành | Lag, `kafka-consumer-groups`, cân partition | ⬜ |
| 10 | Bài tập | Chạy thật, có output | ⬜ |

## Nguyên tắc

Đọc hết docs mà chưa từng để một consumer group **rebalance** thì chưa biết gì về
Kafka. Mọi file ở trên phải có output thật dán vào mới được bỏ dấu ⬜.

## Liên kết

- [Flink](../flink/) — thứ đọc Kafka trong pipeline này
- [Data Engineering](../) — vị trí của Kafka trong đường đi của dữ liệu
