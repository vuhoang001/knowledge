---
title: Trino
description: Query engine phân tán, không lưu dữ liệu — đọc từ nhiều nguồn qua connector.
tags: [trino, query-engine, federation, explain-analyze]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Trino

**Trino là query engine, không lưu dữ liệu.** Nó đọc từ nơi khác (Iceberg, Hive,
PostgreSQL, Kafka) qua connector, tính trong bộ nhớ, trả kết quả. Không có bảng nào
"của Trino".

Trạng thái: **chưa bắt đầu**. Nội dung dưới là mục lục dự kiến, chưa file nào được viết.

## Mục lục — các component của Trino

| # | Component | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | Trino là gì | Query engine vs warehouse, khi nào hợp | ⬜ |
| 02 | Kiến trúc | Coordinator, worker, stage, split, task | ⬜ |
| 03 | Catalog, schema, table | `SHOW CATALOGS` — ba tầng tên gọi | ⬜ |
| 04 | Connector | Iceberg, Hive, PostgreSQL — federation nghĩa là gì | ⬜ |
| 05 | Đọc `EXPLAIN ANALYZE` | Chỗ duy nhất biết query chậm ở đâu | ⬜ |
| 06 | Join và phân phối dữ liệu | Broadcast vs partitioned, thứ tự join | ⬜ |
| 07 | Predicate pushdown | Vì sao lọc sớm mới nhanh, khi nào pushdown hụt | ⬜ |
| 08 | Bộ nhớ và spill | Query chết vì hết memory — chỉnh gì | ⬜ |
| 09 | Bài tập | Chạy thật, có output | ⬜ |

## Ghi nhớ về cụm đang chạy

Trino ở `192.168.100.60:8080`. Catalog thật (chạy `SHOW CATALOGS` ngày 30/07/2026):
`hdos_silver`, `polaris`, `polaris_silver`, `system` — **không có catalog tên `iceberg`**.

Nhầm chỗ này từng mất một buổi debug dbt trong khi lỗi nằm ở tên catalog. Xem
[dbt § Sai lầm đã mắc](../../etl/dbt/index.md#sai-lầm-đã-mắc).

## Liên kết

- [Iceberg](../../storage/iceberg/index.md) — thứ Trino đọc
- [dbt](../../etl/dbt/index.md) — sinh SQL cho Trino chạy
