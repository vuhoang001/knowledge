---
title: Source, seed và snapshot
sidebar_position: 4
description: Ba cách đưa dữ liệu không do dbt tính ra vào DAG — và vì sao snapshot không build lại được.
tags: [dbt, source, seed, snapshot, scd, freshness]
domain: data-engineering
category: technology
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Source, seed, snapshot — dữ liệu vào từ đâu khi không phải model

> **Chốt:** ba cách đưa dữ liệu *không do dbt tính ra* vào DAG. Nhầm giữa chúng là
> dbt tưởng nó sở hữu bảng của người khác.

| | Trỏ tới / tạo ra | Ai tạo bảng | Dùng khi |
|---|---|---|---|
| `source()` | bảng đã có sẵn | người khác (Spark, Flink, ingest) | đầu vào của cả DAG |
| `seed` | CSV trong repo → bảng | dbt | bảng tra cứu tay, nhỏ, ít đổi |
| `snapshot` | bảng lịch sử SCD2 | dbt | dimension đổi chậm, cần biết "hồi đó giá trị là gì" |

## Cần trả lời

### source
- [ ] Khai trong YAML thế nào — `sources:` → `tables:`
- [ ] `dbt source freshness` — `warn_after` / `error_after`, cần cột `loaded_at_field`
- [ ] Vì sao thiếu freshness thì **nguồn chết mà mọi test vẫn xanh**

### seed
- [ ] Giới hạn: chỉ hợp file nhỏ, **không** dùng để nạp dữ liệu thật
- [ ] Ép kiểu cột bằng `column_types` khi dbt đoán sai
- [ ] `dbt seed --full-refresh` khi CSV đổi cấu trúc

### snapshot
- [ ] `strategy: timestamp` vs `strategy: check` — chọn theo cái gì
- [ ] `unique_key` sai thì hỏng ra sao (nhân bản lịch sử)
- [ ] Cột dbt tự thêm: `dbt_valid_from`, `dbt_valid_to`, `dbt_scd_id`
- [ ] **Snapshot không build lại được** — chạy sai một lần là lịch sử sai vĩnh viễn

## Ghi khi đã chạy

<!-- Dán output thật vào đây. -->

## Liên kết

- [Mục lục dbt](index.md)
- [Model và `ref()`](models-and-ref.md)
- [Test và data quality](testing.md) §4 — chiều **Timeliness** chính là `source freshness`
