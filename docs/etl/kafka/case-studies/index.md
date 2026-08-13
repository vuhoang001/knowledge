---
title: Case study — Kafka
sidebar_key: kafka-case-studies
sidebar_position: 0
description: "Sự cố thật đã debug xong, kèm giả thuyết sai lúc đầu."
tags: [case-study, kafka]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Case study — Kafka

Sự cố thật hoặc tình huống dựng lại đã debug xong, kèm **giả thuyết sai lúc đầu**.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 1 | [Mất thứ tự vì đổi key](mat-thu-tu-vi-doi-key.md) | Đổi partition key giữa chừng làm event cùng thực thể rơi khác partition | 📝 |
| 2 | [Consumer rebalance không dứt](rebalance-lien-tuc.md) | Xử lý một message quá `max.poll.interval.ms` → bị đá khỏi group liên tục | 📝 |
| 3 | [Mất dữ liệu với acks=1](mat-du-lieu-acks-1.md) | Leader chết trước khi follower kịp sao → message đã "gửi thành công" biến mất | 📝 |
| 4 | [Compaction không như mong đợi](compaction-khong-nhu-mong-doi.md) | Tưởng compaction xoá ngay; bản cũ và tombstone vẫn còn rất lâu | 📝 |

## Related Topics

- [Kafka](../index.md) — chủ đề chứa thư mục này
