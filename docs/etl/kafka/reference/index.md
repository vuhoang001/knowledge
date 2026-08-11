---
title: Tài liệu — Kafka
sidebar_position: 0
description: "Giải thích nó là gì, vì sao, đánh đổi ra sao. Đọc nhóm này trước."
tags: [reference, kafka]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Tài liệu — Kafka

Giải thích *nó là gì, vì sao, đánh đổi ra sao*. Đọc nhóm này trước khi sang `skills/`.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 1 | [Kafka là gì](what-is-kafka.md) | Log vs queue: vì sao message không mất khi đọc xong | 📝 |
| 2 | [Topic, partition, offset](topic-partition-offset.md) | Đơn vị song song; thứ tự chỉ trong một partition | 📝 |
| 3 | [Replication và độ bền](replication-durability.md) | Leader/follower, ISR, `min.insync.replicas` | 📝 |
| 4 | [Retention và compaction](retention-compaction.md) | Xoá theo thời gian vs giữ bản mới nhất mỗi key | 📝 |
| 5 | [Delivery semantics](delivery-semantics.md) | At-most/at-least/exactly-once; idempotent producer, transaction | 📝 |

Ký hiệu: ✅ đã chạy tay · 📝 lý thuyết, output minh hoạ · 🟡 mới có khung · ⬜ chưa viết

## Related Topics

- [Kafka](../index.md) — chủ đề chứa thư mục này
