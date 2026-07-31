---
title: Macro, Jinja và package
sidebar_position: 7
description: Jinja chạy trước khi SQL rời máy — và ngưỡng nào thì nên viết macro.
tags: [dbt, jinja, macro, dbt-utils]
domain: data-engineering
category: technology
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Macro, Jinja, package — khi SQL bắt đầu bị copy-paste

> **Chốt:** Jinja là template engine chạy **trước** khi SQL rời máy bạn. Mọi thứ
> `{{ }}` và `{% %}` biến mất trong `target/compiled/` — warehouse không bao giờ
> thấy chúng.

## Cần trả lời

- [ ] `{{ }}` (in ra) vs `{% %}` (câu lệnh) vs `{# #}` (chú thích)
- [ ] Viết macro: `{% macro ten(args) %}` trong `macros/`, gọi bằng `{{ ten() }}`
- [ ] Generic test tự viết: `{% test ten(model, column_name) %}` — trả về **dòng sai**
- [ ] `{{ this }}`, `{{ target.name }}`, `{{ var() }}`, `{{ env_var() }}`
- [ ] `run_query()` / `statement` — chạy SQL **lúc compile** để lấy danh sách cột
- [ ] Hook: `pre-hook` / `post-hook` / `on-run-end`
- [ ] `packages.yml` + `dbt deps` — cài `dbt_utils`, `dbt_expectations`, `codegen`

## Nguyên tắc

**Đọc `dbt_utils` trước khi tự viết macro.** Phần lớn thứ định viết đã có sẵn ở đó,
đã được kiểm chứng trên nhiều warehouse. Macro tự viết là thứ phải tự bảo trì.

**Jinja làm SQL khó đọc rất nhanh.** Ngưỡng nên nhớ: viết macro khi cùng một đoạn
SQL lặp ở **≥3 chỗ**, không phải 2. Trước ngưỡng đó, copy-paste rẻ hơn abstraction sai.

## Macro cần ngay

| Macro | Của gói | Làm gì |
|---|---|---|
| `unique_combination_of_columns` | `dbt_utils` | test grain tổ hợp — thứ `unique` không làm được |
| `accepted_range` | `dbt_utils` | chặn giá trị vô lý (`thanh_tien < 0`) |
| `star` | `dbt_utils` | `SELECT *` nhưng loại vài cột |
| `generate_schema_name` | dbt built-in | ghi đè quy tắc đặt tên schema theo môi trường |

## Ghi khi đã chạy

<!-- Dán macro tự viết đầu tiên + output `target/compiled/` của nó vào đây. -->

## Liên kết

- [Mục lục dbt](index.md)
- [dbt là gì](what-is-dbt.md) §2 — Jinja biến mất ở `target/compiled/`
- [Test và data quality](testing.md) §1 — generic test tự viết
