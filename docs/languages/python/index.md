---
title: Python cho Data Engineering
description: Phần Python mà hạ tầng dữ liệu thật sự dùng — DAG, file, timezone, và khi nào KHÔNG nên dùng pandas.
tags: [python, airflow, pandas, etl]
domain: data-engineering
category: technology
doc_type: index
status: draft
difficulty: beginner
verified_at:
updated: 2026-07-31
---
# Python

Học phần Python mà **hạ tầng dữ liệu thật sự dùng**: viết DAG Airflow, gọi API,
xử lý file, đóng gói môi trường chạy được lại trên máy khác.

Trạng thái: **chưa bắt đầu**. Nội dung dưới là mục lục dự kiến, chưa file nào được viết.

## Mục lục

| # | Chủ đề | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | Môi trường | `venv`, `pip`, `requirements.txt` — vì sao không cài toàn cục | ⬜ |
| 02 | Kiểu dữ liệu cần dùng | `dict`, `list`, comprehension, unpacking | ⬜ |
| 03 | File và định dạng | CSV, JSON, YAML, Parquet qua `pyarrow` | ⬜ |
| 04 | Ngày giờ và timezone | `datetime`, UTC vs local — nguồn số sai kinh điển | ⬜ |
| 05 | Lỗi và log | `try/except` đúng chỗ, `logging` thay vì `print` | ⬜ |
| 06 | Gọi API | `requests`, retry, phân trang | ⬜ |
| 07 | pandas | Khi nào dùng, và khi nào nên đẩy về SQL thay vì kéo về máy | ⬜ |
| 08 | Viết script chạy lại được | Tham số dòng lệnh, idempotent, chạy hai lần không hỏng | ⬜ |

## Nguyên tắc

**Đẩy việc về warehouse, đừng kéo dữ liệu về Python.** Lỗi hay gặp của người mới:
`SELECT *` rồi lọc bằng pandas. Chạy được với 10 nghìn dòng, chết với 10 triệu.

## Liên kết

- [Airflow](../../orchestration/airflow/index.md) — nơi Python được dùng nhiều nhất
- [SQL](../../databases/sql/index.md) — thứ nên làm việc nặng thay cho Python
