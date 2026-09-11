---
title: Khai báo source và kiểm tra độ tươi
sidebar_position: 3
description: "source() là lời khai 'bảng này không phải của tôi'. Đổi lại được freshness, lineage đủ gốc, và một chỗ duy nhất để sửa khi nguồn đổi tên."
tags: [dbt, source, freshness, lineage, staging]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Khai báo source và kiểm tra độ tươi

> **Chốt:** `source()` không phải cách viết tên bảng cho đẹp. Nó là lời khai **"bảng
> này do hệ thống khác ghi, dbt không sở hữu"** — và chính lời khai đó mở ra
> `dbt source freshness`, lineage có gốc, và một chỗ duy nhất phải sửa khi nguồn đổi
> tên schema.

## Mục tiêu học

Khai được một source đầy đủ, chạy được `dbt source freshness`, và **đọc đúng** kết quả
`STALE` — kể cả khi nó stale vì lý do không phải lỗi pipeline.

## Bước 1 — Phân biệt `source()` với `ref()`

| | `source()` | `ref()` |
|---|---|---|
| Bảng do ai tạo | hệ thống khác (Fivetran, Spark, Flink, CDC) | chính dbt |
| dbt có build lại được không | **không** | có |
| Khai ở đâu | file `.yml` trong `models/` | không cần khai, suy từ tên file |
| Có `freshness` không | có | không |
| Nhầm sang loại kia thì sao | dbt tưởng nó sở hữu bảng người khác | mất `freshness`, lineage cụt gốc |

Quy tắc một dòng: **dbt có build lại được bảng đó không? Không → `source()`.**

## Bước 2 — Khai source trong YAML

File đặt cạnh các model staging, đặt tên gì cũng được — `sources.yml` là quy ước.

```yaml
# models/staging/sources.yml
version: 2

sources:
  - name: lab_raw              # tên logic, dùng trong source('lab_raw', ...)
    schema: main               # schema THẬT trong warehouse
    tables:
      - name: su_kien_web
        loaded_at_field: cast(thoi_diem as timestamp)
        freshness:
          warn_after:  {count: 12, period: hour}
          error_after: {count: 24, period: hour}
```

Bốn trường đáng chú ý:

- **`name` khác `schema`.** `name` là bí danh dùng trong code; `schema` là tên thật.
  Nguồn đổi schema → sửa đúng một dòng này.
- **`loaded_at_field` phải là một biểu thức SQL hợp lệ**, không nhất thiết là tên cột
  trần. Ở đây cột `thoi_diem` là `varchar` nên phải `cast`.
- `warn_after` / `error_after` tính từ **giờ hiện tại**, không phải từ lần chạy trước.
- Thêm `database:` khi nguồn nằm ở database/catalog khác.

Bản đầy đủ hơn cho môi trường thật:

```yaml
sources:
  - name: erp
    database: RAW              # catalog/database chứa nguồn
    schema: erp_prod
    loader: fivetran           # chỉ là ghi chú, hiện trong dbt docs
    tables:
      - name: orders
        identifier: ORDERS_V2  # tên THẬT nếu khác `name`
        description: "Đơn hàng từ ERP, Fivetran đồng bộ 15 phút một lần."
        columns:
          - name: order_id
            tests: [unique, not_null]
```

`identifier` là van cứu khi nguồn có tên xấu: code viết `source('erp', 'orders')`,
dbt đi tìm `RAW.erp_prod.ORDERS_V2`.

## Bước 3 — Dùng trong model staging

```sql
-- models/staging/stg_su_kien.sql
select * from {{ source('lab_raw', 'su_kien_web') }}
```

```bash
dbt run -s stg_su_kien --profiles-dir .
```

```text
02:38:34  Finished running 1 view model in 0 hours 0 minutes and 0.14 seconds (0.14s).
02:38:34  Completed successfully
02:38:34  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

**Chỉ model tầng staging được gọi `source()`.** Luật này grep được — xem
[Tổ chức layer](../reference/layer-va-dat-ten.md).

## Bước 4 — `dbt source freshness`

```bash
dbt source freshness --profiles-dir .
```

Output thật trên lab (seed có dữ liệu tháng 7, chạy ngày 11/09/2026):

```text
02:38:37  1 of 1 START freshness of lab_raw.su_kien_web .................................. [RUN]
02:38:37  1 of 1 ERROR STALE freshness of lab_raw.su_kien_web ............................ [ERROR STALE in 0.01s]
02:38:37  Finished running 1 source in 0 hours 0 minutes and 0.14 seconds (0.14s).
02:38:37  [ERROR]: in source su_kien_web (models/staging/sources.yml)
02:38:37    Status: error
```

`ERROR STALE` ở đây **đúng**: `max(thoi_diem)` là 2026-07-05, cách hiện tại hơn hai
tháng, vượt `error_after: 24 hour`.

Đây là bài học quan trọng nhất của lệnh này: **freshness so với đồng hồ treo tường,
không so với lần chạy dbt trước.** Dữ liệu mẫu, môi trường dev khôi phục từ bản sao cũ,
nguồn chỉ nạp theo tháng — cả ba đều `STALE` mà pipeline không hỏng gì.

Hệ quả thực dụng: **đừng để `dbt source freshness` chặn CI trên môi trường dev.** Nó
thuộc về job production, chạy trước `dbt build` để biết nên dừng sớm hay không.

```bash
# Trong job production: nguồn ôi thì dừng luôn, đừng build ra số sai
dbt source freshness --target prod && dbt build --target prod
```

## Bước 5 — Chọn ngưỡng bằng SLA, không bằng cảm giác

| Nhịp nạp của nguồn | `warn_after` | `error_after` | Lý do |
|---|---|---|---|
| Streaming/CDC liên tục | 30 phút | 2 giờ | trễ 2 giờ là sự cố thật |
| Batch 15 phút (Fivetran) | 1 giờ | 6 giờ | cho phép vài lần retry |
| Batch hằng đêm | 26 giờ | 30 giờ | phải > 24 giờ, nếu không sáng nào cũng đỏ |
| Nạp theo tháng | 32 ngày | 40 ngày | tính theo chu kỳ, không theo ngày |

Bẫy hay gặp nhất là dòng thứ ba: đặt `error_after: 24 hour` cho nguồn chạy hằng đêm →
báo động giả mỗi khi job chạy trễ 10 phút. Ngưỡng phải là **chu kỳ + biên độ trễ chấp
nhận được**.

## Lỗi thường gặp

| Lỗi | Triệu chứng | Cách sửa |
|---|---|---|
| Dùng `ref()` cho bảng nguồn | dbt báo không tìm thấy node | Đổi sang `source()` và khai trong YAML |
| Viết cứng `raw.erp.orders` trong model | không lỗi, nhưng lineage cụt gốc | `dbt docs` không thấy nguồn; đổi sang `source()` |
| `loaded_at_field` trỏ vào cột chuỗi | `Binder Error` / lỗi so sánh kiểu | `cast(... as timestamp)` ngay trong `loaded_at_field` |
| `loaded_at_field` là thời điểm **nghiệp vụ** thay vì thời điểm **nạp** | freshness đo nhầm thứ | Dùng cột `_loaded_at`/`_ingested_at` do pipeline ghi |
| `error_after` nhỏ hơn chu kỳ nạp | báo động giả hằng ngày | Ngưỡng > chu kỳ |
| `dbt source freshness` trong CI dev | CI đỏ vì dữ liệu mẫu cũ | Chỉ chạy ở job production |
| Khai source nhưng không model nào dùng | không lỗi; source mồ côi | `dbt ls --resource-type source` rồi đối chiếu |

## Kiểm chứng

```bash
dbt ls --resource-type source                  # source nào đã khai
dbt ls --select source:lab_raw+                # mọi model phía sau một source
dbt source freshness --select source:lab_raw   # chỉ kiểm một nguồn
```

Lệnh thứ hai là thứ dùng khi nguồn báo sự cố: **biết ngay báo cáo nào bị ảnh hưởng**.

## Related Topics

- [Source, seed và snapshot](../reference/sources-seeds-snapshots.md) — phần lý thuyết
- [Tổ chức layer và quy ước đặt tên](../reference/layer-va-dat-ten.md) — vì sao chỉ staging được gọi `source()`
- [Viết model đầu tiên với `ref()`](model-dau-tien-voi-ref.md)
- [CI/CD cho dbt project](ci-cd-cho-dbt.md) — nên đặt `source freshness` ở job nào
