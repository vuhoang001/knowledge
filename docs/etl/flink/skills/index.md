---
title: Kỹ năng — Flink
sidebar_position: 0
description: "Đã nắm reference rồi, giờ gặp tình huống X thì xử lý ra sao."
tags: [skills, flink]
domain: data-engineering
category: index
doc_type: index
updated: 2026-08-11
---

# Kỹ năng — Flink

Mỗi file giả định phần [`reference/`](../reference/index.md) đã nắm, và xử lý **một
tình huống cụ thể**.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 1 | [DataStream vs Table/SQL API](datastream-vs-table-sql.md) | Chọn API nào cho việc nào, và cái giá của mỗi lựa chọn | 📝 |
| 2 | [Window](windows.md) | Tumbling, sliding, session; allowed lateness và side output | 📝 |
| 3 | [Savepoint và nâng cấp job](savepoint-upgrade.md) | Sửa code mà không mất state; vì sao cần `uid()` | 📝 |
| 4 | [Connector](connectors.md) | Kafka source/sink, Iceberg sink, CDC — nối Flink với thế giới | 📝 |
| 5 | [Backpressure và tuning](backpressure-tuning.md) | Đọc backpressure, chỉnh parallelism, state backend | 📝 |

## Related Topics

- [Flink](../index.md) — chủ đề chứa thư mục này
