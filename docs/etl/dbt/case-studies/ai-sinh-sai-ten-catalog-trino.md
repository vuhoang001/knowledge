---
title: Nội dung AI sinh ghi sai tên catalog Trino
sidebar_position: 1
description: Một buổi mất vì tin tài liệu do AI sinh — sai ở đúng chỗ khó kiểm nhất là chi tiết môi trường.
tags: [dbt, trino, case-study, verified-at, ai-generated]
domain: data-engineering
category: technology
doc_type: case-study
status: stable
difficulty: beginner
verified_at:
updated: 2026-07-31
---

# Nội dung AI sinh ghi sai tên catalog Trino

> **Chốt:** Nội dung AI sinh đọc rất thuyết phục và sai ở đúng chỗ khó kiểm nhất — chi
> tiết cụ thể của môi trường. Đây là lý do mỗi file trong kho có `verified_at`, và trống
> nghĩa là chưa tin được.

**Ngày:** 30/07/2026 · **Mất:** khoảng một buổi

## Bối cảnh

Đang dựng module dbt, cần cấu hình `profiles.yml` trỏ sang Trino. Bản đầu của tài liệu
do AI sinh ghi:

> *"`profiles.yml` trỏ `192.168.100.60:8080`, catalog `iceberg`"*

Làm theo y nguyên. `dbt debug` fail.

## Giả thuyết sai lúc đầu

Nghi cấu hình dbt — sai cú pháp `profiles.yml`, sai `--profiles-dir`, sai version
adapter, thiếu quyền. Mất một buổi đi loanh quanh trong dbt.

**Lỗi nằm ở chỗ khác hẳn.**

## Cái thật sự sai

Chạy `SHOW CATALOGS` trên Trino `.60`:

```
hdos_silver
polaris
polaris_silver
system
```

**Không hề có catalog tên `iceberg`.** Cái tên đó AI bịa ra — nó là tên *thường gặp*
trong tài liệu Trino trên mạng, không phải tên thật của môi trường này.

## Vì sao khó bắt

| Thứ AI sinh sai | Bắt được không |
|---|---|
| Cú pháp SQL sai | ✅ chạy là báo lỗi ngay |
| Tên hàm không tồn tại | ✅ báo lỗi ngay |
| **Tên catalog / host / schema của môi trường** | ❌ đọc rất hợp lý, chỉ sai khi chạy thật |

Loại thứ ba nguy hiểm nhất vì nó **đúng về hình thức**. Không ai đọc `catalog: iceberg`
mà thấy nghi ngờ — trong khi đó chính là dòng sai.

## Bài học — không phải về dbt

Bài học nằm ở chính kho này, không phải ở dbt hay Trino:

- **`verified_at` trống nghĩa là chưa ai chạy thật.** Đọc với thái độ nghi ngờ.
- **Chi tiết môi trường phải kiểm bằng lệnh, không kiểm bằng cách đọc.** `SHOW CATALOGS`,
  `SHOW SCHEMAS`, `dbt debug` — chạy trước, chép output về, rồi mới viết vào tài liệu.
- Đây là lý do luật cứng #1 và #2 của kho tồn tại: không tự điền `verified_at`, không
  dán output bịa.

## Related Topics

- [dbt](../index.md) — chủ đề chứa case study này
- [Trino](../../../query-engines/trino/index.md) — hệ thống bị ghi sai tên catalog
- [dbt là gì](../reference/what-is-dbt.md) — phần cấu hình kết nối
