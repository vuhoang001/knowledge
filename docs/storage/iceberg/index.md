---
title: Apache Iceberg
description: Table format, không phải file format và không phải engine — lớp metadata cho biết file nào thuộc bảng lúc nào.
tags: [iceberg, table-format, lakehouse, time-travel, acid]
domain: data-engineering
category: technology
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Apache Iceberg

**Iceberg là table format, không phải file format và không phải engine.** Dữ liệu vẫn
là file Parquet trên object storage; Iceberg thêm một lớp metadata cho biết *file nào
thuộc bảng ở thời điểm nào*. Từ đó mới có ACID, time travel và đổi schema an toàn.

Trạng thái: **chưa bắt đầu**. Nội dung dưới là mục lục dự kiến, chưa file nào được viết.

## Mục lục — các component của Iceberg

| # | Component | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | Iceberg là gì | Table format vs file format vs engine | ⬜ |
| 02 | Cây metadata | metadata file → manifest list → manifest → data file | ⬜ |
| 03 | Snapshot và time travel | Đọc bảng "lúc 3 giờ chiều hôm qua" | ⬜ |
| 04 | Catalog | REST, Hive, Glue, Polaris — ai giữ con trỏ metadata hiện tại | ⬜ |
| 05 | Hidden partitioning | Vì sao không phải viết `WHERE ngay=...` như Hive | ⬜ |
| 06 | Schema evolution | Đổi tên/thêm/xoá cột mà không viết lại dữ liệu | ⬜ |
| 07 | Copy-on-write vs merge-on-read | Đánh đổi giữa ghi nhanh và đọc nhanh | ⬜ |
| 08 | Bảo trì bảng | Compaction, expire snapshot, xoá file mồ côi | ⬜ |
| 09 | Bài tập | Chạy thật, có output | ⬜ |

## Vì sao quan trọng

Không có table format thì "một bảng" chỉ là *một thư mục file* — hai job ghi cùng lúc
là hỏng, và đọc trong lúc đang ghi là ra kết quả nửa vời. Iceberg giải đúng chỗ đó.

Bảo trì hay bị bỏ quên nhất: không compaction thì bảng đầy file nhỏ và query chậm
dần, không expire snapshot thì storage phình mãi.

## Liên kết

- [Trino](../../query-engines/trino/index.md) — engine đọc Iceberg
- [Flink](../../etl/flink/index.md) — ghi vào Iceberg
- [dbt](../../etl/dbt/index.md) — transform trên Iceberg qua Trino
