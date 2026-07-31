---
title: dbt docs và lineage
sidebar_position: 8
description: Sơ đồ lineage chính xác đúng bằng mức bạn dùng ref() kỷ luật.
tags: [dbt, docs, lineage, exposures]
domain: data-engineering
category: technology
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Docs và lineage — rà tác động trước khi sửa

> **Chốt:** `dbt docs` không phải tính năng trang trí. Sơ đồ lineage là **cùng một
> DAG** mà dbt dùng để xếp thứ tự chạy — nên nó chính xác đúng bằng mức bạn dùng
> `ref()` kỷ luật. Viết tên bảng thẳng thì sơ đồ nói dối.

## Cần trả lời

- [ ] `dbt docs generate` sinh ra `catalog.json` + `manifest.json` — mỗi cái chứa gì
- [ ] `dbt docs serve` — trang web tĩnh, host ở đâu để cả nhóm xem
- [ ] Mô tả cột trong `schema.yml` → hiện lên docs
- [ ] `{% docs ten %}` trong `models/docs.md` — mô tả dài dùng lại nhiều chỗ
- [ ] `--select state:modified+` với `manifest.json` cũ — CI chỉ chạy phần đổi
- [ ] `exposures` — khai báo dashboard/API nào đang đọc model nào

## Vì sao quan trọng hơn vẻ ngoài

Câu hỏi thật cần trả lời hằng ngày: **"tôi sửa cột này thì cái gì gãy?"**

Không có lineage thì câu trả lời là grep toàn repo rồi đoán. Có lineage thì:

```bash
dbt run --select mart_doanh_thu+     # chạy nó và MỌI THỨ phụ thuộc nó
dbt ls  --select +mart_doanh_thu     # liệt kê mọi thứ NÓ phụ thuộc vào
```

`exposures` đẩy thêm một bước: DAG kéo dài ra khỏi warehouse tới tận dashboard, nên
biết được sửa model này thì báo cáo nào của ai bị ảnh hưởng.

## Ghi khi đã chạy

<!-- Bài 4 trong 09-bai-tap.md có bước `dbt docs generate && dbt docs serve`. -->

## Liên kết

- [Mục lục dbt](index.md)
- [Model và `ref()`](models-and-ref.md) — DAG đến từ đâu
- [Bài tập](../../tutorials/dbt-lab-duckdb.md) bài 4
