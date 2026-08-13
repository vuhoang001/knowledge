---
title: Kỹ năng — Kafka
sidebar_key: kafka-skills
sidebar_position: 0
description: "Đã nắm reference rồi, giờ gặp tình huống X thì xử lý ra sao."
tags: [skills, kafka]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Kỹ năng — Kafka

Mỗi file giả định phần [`reference/`](../reference/index.md) đã nắm, và xử lý **một
tình huống cụ thể**.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 1 | [Producer tuning](producer-tuning.md) | `acks`, batching, partitioner, idempotence — chỉnh gì cho việc gì | 📝 |
| 2 | [Consumer group và rebalance](consumer-groups.md) | Commit offset, `auto.offset.reset`, rebalance không dừng | 📝 |
| 3 | [Schema Registry](schema-registry.md) | Avro/Protobuf, tương thích khi đổi schema | 📝 |
| 4 | [Kafka Connect và CDC](kafka-connect-cdc.md) | Debezium bắt thay đổi từ database, không cần code | 📝 |
| 5 | [Vận hành và lag](operations-lag.md) | Đo lag, cân partition, đọc `kafka-consumer-groups` | 📝 |

## Related Topics

- [Kafka](../index.md) — chủ đề chứa thư mục này
