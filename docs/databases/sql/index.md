---
title: SQL
description: "Học đúng phần mà dbt và Trino bắt phải chắc: grain, join, window function, execution plan."
tags: [sql, grain, join, window-function]
domain: data-engineering
category: concept
doc_type: index
status: draft
difficulty: beginner
verified_at:
updated: 2026-07-31
---
# SQL

Không học SQL từ đầu — học đúng phần mà **dbt và Trino bắt phải chắc**: window
function, CTE, grain, và đọc được execution plan.

Trạng thái: **chưa bắt đầu**. Nội dung dưới là mục lục dự kiến, chưa file nào được viết.

## Mục lục

| # | Chủ đề | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | Thứ tự thực thi thật | `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` | ⬜ |
| 02 | Grain | Một dòng đại diện cho cái gì — gốc của mọi lỗi nhân bản | ⬜ |
| 03 | Join | Inner/left/full, và vì sao join làm số **tăng** lên | ⬜ |
| 04 | Aggregate | `GROUP BY`, `HAVING`, `COUNT(*)` vs `COUNT(cot)` | ⬜ |
| 05 | Window function | `OVER (PARTITION BY ... ORDER BY ...)`, `ROW_NUMBER` vs `RANK` | ⬜ |
| 06 | CTE | `WITH`, đọc từ trên xuống thay vì subquery lồng | ⬜ |
| 07 | NULL | Ba giá trị logic — chỗ `NOT IN` cho kết quả rỗng bí ẩn | ⬜ |
| 08 | Đọc execution plan | `EXPLAIN ANALYZE` — đoán mò là phí thời gian | ⬜ |

## Trọng tâm

**Grain là khái niệm quan trọng nhất ở đây**, không phải cú pháp. Sai grain thì
join nhân bản dòng, `SUM` ra số gấp đôi, và test `unique` fail oan — cả ba đều đã gặp
thật ở [dbt](../../etl/dbt/reference/testing.md) §5.

## Liên kết

- [dbt](../../etl/dbt/index.md) — SQL có DAG và test bọc quanh
- [Trino](../../query-engines/trino/index.md) — nơi SQL thật sự chạy
