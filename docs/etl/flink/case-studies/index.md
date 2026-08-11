---
title: Case study — Flink
sidebar_position: 0
description: "Sự cố thật đã debug xong, kèm giả thuyết sai lúc đầu."
tags: [case-study, flink]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Case study — Flink

Sự cố thật hoặc tình huống dựng lại đã debug xong, kèm **giả thuyết sai lúc đầu**.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 1 | [Cửa sổ không bao giờ chạy](cua-so-khong-chay-idle-partition.md) | Một partition im lặng giữ watermark đứng yên → window không đóng | 📝 |
| 2 | [Số sai vì dùng processing time](so-sai-vi-processing-time.md) | Job chạy mượt, số lặng lẽ sai khi dữ liệu đến muộn | 📝 |
| 3 | [State phình vì thiếu TTL](state-phinh-thieu-ttl.md) | Keyed state giữ mọi key mãi mãi → checkpoint chậm dần rồi OOM | 📝 |
| 4 | [Trùng lặp vì sink không transaction](trung-lap-vi-sink-khong-transaction.md) | Exactly-once trong Flink không tự lan tới sink không hỗ trợ 2PC | 📝 |

## Related Topics

- [Flink](../index.md) — chủ đề chứa thư mục này
