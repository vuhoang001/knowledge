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
updated: 2026-09-11
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

## Lấy thông tin cụm của bạn

Tài liệu này **cố ý không ghi host hay tên catalog cụ thể nào** — mỗi cụm Trino một
khác, và chép tên từ tài liệu người khác là cách mất một buổi debug nhanh nhất.

Cụm của bạn tên gì thì hỏi chính nó:

```sql
SHOW CATALOGS;                  -- có đúng những catalog nào
SHOW SCHEMAS FROM <catalog>;    -- trong catalog đó có schema nào
SHOW TABLES FROM <catalog>.<schema>;
```

Chép output về rồi mới viết vào `profiles.yml`. Đừng đoán tên: `iceberg`, `hive`,
`lakehouse` nghe rất hợp lý nhưng **là tên connector, không phải tên catalog** — catalog
tên gì là do người dựng cụm đặt.

Đây đúng là chỗ từng mất một buổi debug dbt trong khi lỗi chỉ nằm ở tên catalog. Xem
[dbt § Sai lầm đã mắc](../../etl/dbt/index.md#sai-lầm-đã-mắc).

## Liên kết

- [Iceberg](../../storage/iceberg/index.md) — thứ Trino đọc
- [dbt](../../etl/dbt/index.md) — sinh SQL cho Trino chạy
