---
title: Source, seed và snapshot
sidebar_position: 4
description: Ba cách đưa dữ liệu không do dbt tính ra vào DAG — và vì sao snapshot không build lại được.
tags: [dbt, source, seed, snapshot, scd, freshness]
domain: data-engineering
category: technology
doc_type: reference
status: review
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


## Ba thứ, ba vai trò khác hẳn nhau

| | `source()` | `seed` | `snapshot` |
|---|---|---|---|
| Dữ liệu đến từ | hệ khác ghi vào | file CSV trong repo | model/source dbt đọc |
| dbt có tạo bảng không | **không** | có | có |
| Chạy bằng | — (chỉ tham chiếu) | `dbt seed` | `dbt snapshot` |
| Tái tạo được không | — | ✅ | ❌ **không bao giờ** |

Dòng cuối là điều quan trọng nhất cả trang.

## `source()` — bảng dbt KHÔNG sở hữu

```yaml
# models/staging/src.yml
version: 2
sources:
  - name: he_nguon
    schema: main
    tables:
      - name: raw_don_hang
        loaded_at_field: nap_luc
        freshness:
          warn_after: {count: 12, period: hour}
          error_after: {count: 24, period: hour}
```

Dùng trong model: `from {{ source('he_nguon', 'raw_don_hang') }}`.

**Vì sao không dùng `ref()`:** `ref()` nói *"dbt tạo ra bảng này"*. Bảng do Spark/Flink/
ingest ghi vào thì dbt không sở hữu — khai nhầm thành `ref()` là dbt tưởng nó chịu trách
nhiệm, và mất luôn `dbt source freshness`.

### `dbt source freshness` — chỗ hay bỏ quên nhất

Nguồn nạp lần cuối 25/07, chạy ngày 31/07:

```text
1 of 1 START freshness of he_nguon.raw_don_hang ......................... [RUN]
1 of 1 ERROR STALE freshness of he_nguon.raw_don_hang ................... [ERROR STALE in 0.01s]
[ERROR]: in source raw_don_hang (models/staging/src.yml)
```

**Vì sao thiếu freshness thì nguồn chết mà mọi test vẫn xanh:** test kiểm *dữ liệu đang
có*. Nguồn ngừng nạp từ hôm qua thì dữ liệu hôm qua vẫn hợp lệ — `not_null` xanh,
`unique` xanh, `relationships` xanh. Chỉ có **freshness** hỏi câu *"dữ liệu này cũ chưa"*.

Đây là chiều **timeliness** trong [sáu chiều chất lượng](../../../data-quality/six-dimensions.md),
và là chiều duy nhất không test nào khác chạm tới.

## `seed` — CSV nhỏ, không phải đường nạp dữ liệu

```bash
dbt seed
```

Đọc CSV trong `seeds/` thành bảng. **Giới hạn quan trọng:** seed đi vào git, nên chỉ hợp
file **nhỏ và ít đổi** — bảng tra cứu tay, danh mục mã, ánh xạ quốc gia.

Không dùng seed để nạp dữ liệu thật. Vài nghìn dòng là repo phình, diff vô nghĩa, và
`dbt seed` chạy hàng phút vì nó `INSERT` từng lô.

Ép kiểu khi dbt đoán sai:

```yaml
seeds:
  scratch:
    hang_hoa:
      +column_types:
        ma_hang: varchar(10)
        gia: decimal(18,2)     # đừng để dbt đoán thành double
```

CSV đổi **cấu trúc** (thêm/bớt cột) thì phải `dbt seed --full-refresh` — nạp thường chỉ
thay nội dung, không thay schema.

## `snapshot` — SCD Type 2, và là thứ duy nhất mất là mất luôn

```sql
-- snapshots/snp_hang_hoa.sql
{% raw %}{% snapshot snp_hang_hoa %}
{{ config(target_schema='snapshots', unique_key='ma_hang',
          strategy='check', check_cols=['nhom']) }}
select ma_hang, ten_hang, nhom from {{ ref('stg_hang_hoa') }}
{% endsnapshot %}{% endraw %}
```

Chạy lần đầu:

```text
┌─────────┬───────────────┬────────────────────────────┬──────────────┐
│ ma_hang │     nhom      │       dbt_valid_from       │ dbt_valid_to │
├─────────┼───────────────┼────────────────────────────┼──────────────┤
│ SP-A    │ Thiết bị nhập │ 2026-07-31 14:42:14.520136 │ NULL         │
│ SP-B    │ Màn hình      │ 2026-07-31 14:42:14.520136 │ NULL         │
└─────────┴───────────────┴────────────────────────────┴──────────────┘
```

Đổi `nhom` của `SP-A` thành `Phụ kiện` rồi `dbt snapshot` lại:

```text
┌─────────┬───────────────┬────────────────────────────┬────────────────────────────┐
│ ma_hang │     nhom      │       dbt_valid_from       │        dbt_valid_to        │
├─────────┼───────────────┼────────────────────────────┼────────────────────────────┤
│ SP-A    │ Thiết bị nhập │ 2026-07-31 14:42:14.520136 │ 2026-07-31 14:42:42.204027 │
│ SP-A    │ Phụ kiện      │ 2026-07-31 14:42:42.204027 │ NULL                       │
└─────────┴───────────────┴────────────────────────────┴────────────────────────────┘
```

Dòng cũ **đóng lại**, dòng mới mở ra. Đây chính là [SCD](../../../data-modeling/skills/scd.md)
Type 2 do dbt làm hộ — bốn cột `dbt_valid_from` / `dbt_valid_to` / `dbt_scd_id` /
`dbt_updated_at` dbt tự thêm.

### `strategy: check` hay `timestamp`

| Strategy | Cần gì | Chọn khi |
|---|---|---|
| `check` + `check_cols` | không cần gì thêm | Nguồn **không** có cột thời gian đáng tin |
| `timestamp` + `updated_at` | cột thời gian đáng tin | Nguồn cập nhật cột đó đàng hoàng, và dữ liệu lớn |

Bốn cách phát hiện thay đổi và bẫy của từng cách ở
[Phát hiện thay đổi cho SCD 2](../../../data-modeling/skills/scd-change-detection.md).

`check_cols: all` tiện nhưng nguy hiểm: thêm một cột kỹ thuật vô nghĩa vào nguồn là
**mọi dòng sinh version mới**. Liệt kê cột tường minh.

### Vì sao snapshot phải cẩn thận hơn mọi thứ khác

Model sai thì `dbt run` lại. **Snapshot sai thì phần lịch sử đã ghi mất luôn** — không
có nguồn nào dựng lại được, vì lịch sử đó chỉ tồn tại trong chính bảng snapshot.

Hệ quả thực hành:

- Chạy thử trên **bản sao** trước khi chạy lần đầu ở production.
- Đặt lịch chạy **đều đặn**. Snapshot bỏ lỡ một ngày là mất thay đổi của ngày đó vĩnh viễn.
- Không sửa `check_cols` bừa — đổi tập cột là đổi định nghĩa "thế nào là thay đổi".

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Dùng `ref()` cho bảng hệ khác ghi | dbt tưởng nó sở hữu bảng; mất `source freshness` |
| Khai source nhưng không khai `freshness` | Nguồn chết mà mọi test vẫn xanh |
| Dùng seed nạp dữ liệu thật | Repo phình, `dbt seed` chạy hàng phút |
| Để dbt đoán kiểu cột seed | Số tiền thành `double`, sai số khi cộng |
| `check_cols: all` | Thêm cột kỹ thuật là mọi dòng sinh version mới |
| Snapshot chạy lần đầu thẳng trên production | Sai là mất lịch sử vĩnh viễn |
| Snapshot chạy không đều | Mất thay đổi của những ngày bỏ lỡ |

## Related Topics

- [Mục lục dbt](index.md)
- [Model và `ref()`](models-and-ref.md)
- [Test và data quality](testing.md) §4 — chiều **Timeliness** chính là `source freshness`
