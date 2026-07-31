---
title: Apache Airflow
description: Airflow điều phối, không xử lý — và logical_date không phải 'bây giờ'.
tags: [airflow, orchestration, dag, scheduling, idempotency]
domain: data-engineering
category: technology
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Apache Airflow

**Airflow điều phối, không xử lý.** Nó quyết định *cái gì chạy lúc nào và sau cái gì*;
việc nặng luôn nằm ở hệ khác (Trino, Spark, dbt). Task Airflow mà tự xử lý dữ liệu là
dấu hiệu dùng sai công cụ.

Trạng thái: **chưa bắt đầu**. Nội dung dưới là mục lục dự kiến, chưa file nào được viết.

## Mục lục — các component của Airflow

| # | Component | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | Airflow là gì | Điều phối vs xử lý, khi nào cần và khi nào cron là đủ | ⬜ |
| 02 | DAG, task, operator | Đơn vị cơ bản, cách khai phụ thuộc | ⬜ |
| 03 | Scheduler và execution date | `logical_date` ≠ lúc chạy — chỗ hiểu sai kinh điển | ⬜ |
| 04 | Backfill và catchup | Chạy bù quá khứ mà không nhân đôi dữ liệu | ⬜ |
| 05 | Idempotency | Chạy lại một task phải ra cùng kết quả — vì sao bắt buộc | ⬜ |
| 06 | Sensor và trigger | Chờ file/bảng, `poke` vs `reschedule`, deferrable | ⬜ |
| 07 | XCom và biến | Truyền dữ liệu giữa task — và vì sao nên hạn chế | ⬜ |
| 08 | Executor | Local, Celery, Kubernetes — khác nhau chỗ nào | ⬜ |
| 09 | Retry, SLA, cảnh báo | Task hỏng lúc 3 giờ sáng thì ai biết | ⬜ |
| 10 | Bài tập | Chạy thật, có output | ⬜ |

## Bẫy biết trước

**`logical_date` không phải "bây giờ".** DAG chạy hằng ngày lúc 01:00 ngày 31/07 có
`logical_date` là 30/07 — nó xử lý *dữ liệu của khoảng vừa đóng*. Viết task theo
`datetime.now()` là backfill ra số sai và không ai phát hiện.

## Liên kết

- [dbt](../../etl/dbt/index.md) — thứ Airflow thường gọi
- [Trino](../../query-engines/trino/index.md) — nơi việc nặng thật sự chạy
