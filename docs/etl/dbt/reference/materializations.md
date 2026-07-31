---
title: Materialization
sidebar_position: 5
description: view, table, incremental, ephemeral — cùng một SELECT, khác thứ dbt bọc quanh nó.
tags: [dbt, materialization, incremental]
domain: data-engineering
category: technology
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Materialization — dbt tạo ra cái gì

> **Chốt:** cùng một câu `SELECT`, đổi materialization là đổi thứ dbt bọc quanh nó
> trước khi gửi đi. Model không đổi một chữ, kết quả trong warehouse khác hẳn.

| Kiểu | dbt sinh ra | Đánh đổi | Hợp với |
|---|---|---|---|
| `view` | `CREATE VIEW` | rẻ khi build, tính lại mỗi lần query | tầng staging |
| `table` | `CREATE TABLE AS` | query nhanh, build lại **toàn bộ** mỗi lần | mart nhỏ/vừa |
| `incremental` | `INSERT`/`MERGE` phần mới | nhanh nhất, nhưng **tự lo dữ liệu sửa muộn** | fact lớn |
| `ephemeral` | không tạo gì — nhúng thành CTE | không debug được, không query được | bước trung gian dùng một lần |

## Cần trả lời

- [ ] `is_incremental()` trả `true` khi nào — lần chạy đầu thì sao
- [ ] `unique_key` — thiếu nó thì `incremental` chỉ append, có nó thì upsert
- [ ] `incremental_strategy`: `append` / `merge` / `delete+insert`, warehouse nào hỗ trợ cái nào
- [ ] `--full-refresh` giải quyết gì, và **khi nào bắt buộc** phải chạy
- [ ] Late-arriving data: đơn hàng **cũ** bị sửa lại thì `incremental` bỏ sót ra sao
- [ ] `on_schema_change` — thêm cột vào model incremental đang chạy

## Bẫy đã biết

**`incremental` là kiểu duy nhất mà bảng có thể sai mà không ai báo.** `view` và
`table` build lại từ đầu nên luôn khớp với model; `incremental` giữ lại dữ liệu cũ,
nên logic sai hôm nay để lại dấu vết vĩnh viễn cho tới lần `--full-refresh` kế tiếp.

## Ghi khi đã chạy

<!-- Bài 5 trong 09-bai-tap.md — chạy hai lần, so số dòng và thời gian. -->

## Liên kết

- [Mục lục dbt](index.md)
- [Bài tập](../tutorials/dbt-lab-duckdb.md) bài 5
