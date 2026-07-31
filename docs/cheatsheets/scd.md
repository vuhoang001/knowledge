---
title: SCD — Cheatsheet
sidebar_position: 1
description: Bảng tra nhanh Slowly Changing Dimension khi đang làm việc.
tags: [scd, cheatsheet, data-modeling]
domain: data-engineering
category: cheatsheet
status: stable
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# SCD — Cheatsheet

Tài liệu đầy đủ: [docs/data-modeling/dimension-techniques/scd.md](../data-modeling/dimension-techniques/scd.md)

## Chọn Type nào

| Tình huống | Type |
|---|---|
| Đổi là dữ liệu hỏng (ngày mở tài khoản) | **0** |
| Sửa lỗi chính tả, chuẩn hoá viết hoa | **1** |
| Không ai `GROUP BY` theo cột này | **1** |
| Báo cáo quá khứ dùng giá trị **bây giờ** (as-is) | **1** |
| Báo cáo quá khứ dùng giá trị **lúc đó** (as-was) | **2** |
| Đổi hằng tháng + dimension lớn | **4** |
| Cần cả as-was lẫn as-is trong một query | **6** |
| Hai cách phân loại song song sau một lần tổ chức lại | **3** |
| **Phân vân, không hỏi được ai** | **2** |

## Bộ cột Type 2

```text
khach_sk        BIGINT      PK — mỗi phiên bản một giá trị
khach_hang_id   VARCHAR     natural key — LẶP LẠI qua các phiên bản
...thuộc tính...
valid_from      DATE
valid_to        DATE        '9999-12-31' cho dòng hiện tại — KHÔNG dùng NULL
is_current      BOOLEAN
is_deleted      BOOLEAN     nguồn xoá cứng thì đánh dấu, đừng xoá dòng
```

## Dimension lookup — gán SK lúc nạp fact

```sql
join dim_khach_hang d
  on  f.khach_hang_id = d.khach_hang_id
  and f.ngay >= d.valid_from
  and f.ngay <  d.valid_to
```

Với dbt snapshot (`dbt_valid_to` là `NULL`):

```sql
  and f.ngay < coalesce(d.dbt_valid_to, '9999-12-31')
```

## Test bắt buộc

```yaml
tests:
  - unique: {column_name: khach_sk}
  - dbt_utils.unique_combination_of_columns:
      combination_of_columns: [khach_hang_id, valid_from]
  - dbt_utils.expression_is_true:
      expression: "valid_from < valid_to"
```

Cộng thêm **một singular test đối chiếu tổng với nguồn** — đây là test duy nhất bắt
được lỗi nhân bản do join sai.

## dbt snapshot

```sql
{% snapshot dim_khach_hang %}
{{ config(
    target_schema='snapshots',
    unique_key='khach_hang_id',
    strategy='timestamp',
    updated_at='updated_at'
) }}
select * from {{ source('crm', 'khach_hang') }}
{% endsnapshot %}
```

```bash
dbt snapshot                 # KHÔNG build lại được — chạy sai là lịch sử sai vĩnh viễn
```

| Strategy | Dùng khi |
|---|---|
| `timestamp` | Nguồn có cột `updated_at` đáng tin |
| `check` | Không có cột thời gian — so từng cột trong `check_cols` |

## Bốn lỗi chết người

| Lỗi | Dấu hiệu |
|---|---|
| Fact join natural key | Doanh thu **nhân đôi**, mọi test vẫn xanh |
| `where is_current = true` khi cần as-was | Số quá khứ đổi theo hiện tại |
| `valid_to` = `NULL` | Dữ liệu **mới nhất** biến mất khỏi báo cáo |
| Type 2 cho cột đổi hằng ngày | Dimension phình gấp trăm lần |

## Câu hỏi phải hỏi nghiệp vụ

> "Khách chuyển từ Miền Bắc vào Nam. Doanh thu tháng 1 của họ hiện ở vùng nào?"

Đừng hỏi "anh muốn SCD Type mấy".
