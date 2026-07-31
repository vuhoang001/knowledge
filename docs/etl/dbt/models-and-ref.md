---
title: Model và ref() — DAG mọc ra từ đâu
sidebar_position: 3
description: ref() không phải cách viết tắt tên bảng mà là cách duy nhất khai báo phụ thuộc.
tags: [dbt, model, ref, dag, lineage]
domain: data-engineering
category: technology
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Model và `ref()` — DAG mọc ra từ đâu

> **Chốt:** một model = một file `.sql` = một câu `SELECT`. `ref()` không phải cách
> viết tắt tên bảng — nó là **cách duy nhất** khai báo phụ thuộc. Xem
> [01-dbt-la-gi.md](what-is-dbt.md) §3 cho phần đã kiểm chứng.

## Cần trả lời

- [ ] Model không được có `CREATE`, `INSERT`, dấu `;` — vì sao
- [ ] Đặt tên theo tầng: `stg_` → `int_` → `fct_`/`dim_`/`mart_`, và vì sao tầng hoá
- [ ] Cú pháp chọn model: `--select x`, `x+`, `+x`, `x+2`, `tag:abc`, `state:modified`
- [ ] `{{ config() }}` trong model vs khai trong `dbt_project.yml` — cái nào thắng
- [ ] Chuyện gì xảy ra khi có **vòng** trong DAG
- [ ] `ephemeral` — model không tồn tại trong warehouse, bị nhúng thành CTE

## Đã biết chắc

Mỗi lần dbt thấy `ref('a')` trong model `b`, nó ghi một cạnh `a → b`. Từ tập cạnh đó:

| dbt làm được | Nhờ đâu |
|---|---|
| tự biết thứ tự chạy | sắp topo trên DAG |
| chạy đúng nhánh bị ảnh hưởng (`--select x+`) | duyệt đồ thị |
| vẽ sơ đồ lineage trong `dbt docs` | chính đồ thị đó |
| báo lỗi khi model bị trỏ tới biến mất | kiểm cạnh |

Viết thẳng `from lab.main.don_hang_chi_tiet` thì **model vẫn chạy** — và đó mới là
chỗ nguy hiểm. Không báo gì, nhưng DAG mất một cạnh: dbt có thể chạy sai thứ tự, và
lineage **nói dối bạn**.

**Quy tắc không có ngoại lệ: không bao giờ viết tên bảng thẳng.**

## Ghi khi đã chạy

<!-- Bài 4 trong 09-bai-tap.md. Dán output `dbt run --select x+` và ảnh DAG vào đây. -->

## Liên kết

- [Mục lục dbt](index.md)
- [Source, seed, snapshot](sources-seeds-snapshots.md) — `source()` khác `ref()` chỗ nào
- [Bài tập](../../tutorials/dbt-lab-duckdb.md) bài 4
