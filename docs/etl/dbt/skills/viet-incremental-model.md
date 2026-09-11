---
title: Viết incremental model
sidebar_position: 4
description: "Chỉ xử lý dòng mới thì nhanh, nhưng đổi lại phải tự trả lời 'dòng sửa muộn thì sao' — và câu trả lời sai không báo lỗi, chỉ làm lệch số."
tags: [dbt, incremental, is-incremental, late-arriving, merge, performance]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-11
---

# Viết incremental model

> **Chốt:** `incremental` đổi **thời gian chạy** lấy **nghĩa vụ đúng đắn**. Từ lúc bật
> nó, bạn tự nhận trách nhiệm trả lời: dòng đến muộn thì sao, dòng bị sửa thì sao, chạy
> lại thì có nhân đôi không. Bỏ trống câu nào thì câu đó thành lỗi im lặng.

## Mục tiêu học

Viết được một incremental model, **tự tay tạo ra lỗi mất dòng sửa muộn**, nhìn thấy số
lệch, rồi sửa bằng cửa sổ nhìn lại — và biết vì sao không có test nào bắt được lỗi đó.

## Bước 1 — Khung tối thiểu

```sql
-- models/marts/fct_dong_hang.sql
{{ config(materialized='incremental', unique_key=['don_hang_id', 'dong']) }}

select
    don_hang_id, dong, ma_hang, so_luong, don_gia, thanh_tien, ngay
from {{ ref('stg_don_hang_chi_tiet') }}

{% if is_incremental() %}
where ngay > (select coalesce(max(ngay), date '1900-01-01') from {{ this }})
{% endif %}
```

Ba mảnh, mỗi mảnh một việc:

| Mảnh | Việc |
|---|---|
| `materialized='incremental'` | Lần đầu → `create table as`. Lần sau → chỉ chèn/merge |
| `is_incremental()` | `false` khi bảng chưa tồn tại hoặc chạy `--full-refresh`. Điều kiện lọc **phải** nằm trong khối này |
| `unique_key` | Khoá để merge. Không khai → dbt chỉ `insert`, chạy lại là **nhân đôi** |

`{{ this }}` là chính bảng đang build — dùng nó để hỏi "tôi đã có tới đâu rồi".

## Bước 2 — Chạy lần đầu và lần hai

```bash
dbt run -s fct_dong_hang --profiles-dir .
```

```text
02:38:51  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.07s]
02:38:51  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Lần hai, không có dữ liệu mới:

```text
02:38:54  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.16s]
02:38:54  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```text
┌─────────┬───────────────┐
│ so_dong │ ngay_moi_nhat │
├─────────┼───────────────┤
│      15 │ 2026-07-05    │
└─────────┴───────────────┘
```

Vẫn 15 dòng — không nhân đôi. Đó là công của `unique_key`.

## Bước 3 — Tự tạo ra lỗi (bước quan trọng nhất của bài này)

Thêm vào nguồn **hai** dòng, mô phỏng đúng đời thật:

```text
DH011,1,SP-C,1,900000,2026-07-06
DH001,1,SP-A,4,150000,2026-07-01
```

Dòng đầu là dòng hoàn toàn mới. Dòng sau là **bản sửa muộn**: `so_luong` đổi từ 2 thành
4, ngày giữ nguyên 01/07.

```bash
dbt seed -s don_hang_chi_tiet --profiles-dir .
dbt run  -s fct_dong_hang     --profiles-dir .
```

```text
02:39:11  1 of 1 OK loaded seed file main.don_hang_chi_tiet .............................. [INSERT 16 in 0.06s]
02:39:14  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.11s]
```

Không có lỗi nào. Nhưng đối chiếu với nguồn:

```text
┌───────────────────┬─────────┬───────────┐
│       bang        │ so_dong │ doanh_thu │
├───────────────────┼─────────┼───────────┤
│ fct (incremental) │      16 │  11115000 │
│ stg (nguon that)  │      16 │  11415000 │
└───────────────────┴─────────┴───────────┘
```

**Số dòng khớp. Số tiền lệch 300.000.** Dòng `DH001` vẫn giữ `so_luong = 2` cũ:

```text
┌─────────────┬───────┬─────────┬──────────┬─────────┬────────────┬────────────┐
│ don_hang_id │ dong  │ ma_hang │ so_luong │ don_gia │ thanh_tien │    ngay    │
├─────────────┼───────┼─────────┼──────────┼─────────┼────────────┼────────────┤
│ DH001       │     1 │ SP-A    │        2 │  150000 │     300000 │ 2026-07-01 │
└─────────────┴───────┴─────────┴──────────┴─────────┴────────────┴────────────┘
```

Vì sao: bộ lọc `ngay > max(ngay)` chỉ nhìn **ngày nghiệp vụ**. Bản sửa của `DH001` vẫn
mang ngày 01/07, nằm dưới mốc 05/07 → không lọt vào lô này → merge không bao giờ chạm
tới nó.

Và **không test nào bắt được**: `unique` pass, `not_null` pass, `relationships` pass,
số dòng khớp. Đây là lý do incremental là nơi hay giấu lỗi nhất trong một dbt project.

## Bước 4 — Sửa bằng cửa sổ nhìn lại

```sql
{% if is_incremental() %}
-- Cửa sổ nhìn lại 7 ngày: bắt cả dòng sửa muộn, không chỉ dòng mới.
where ngay >= (select coalesce(max(ngay), date '1900-01-01') - interval 7 day from {{ this }})
{% endif %}
```

```bash
dbt run -s fct_dong_hang --profiles-dir .
```

```text
┌───────────────────┬─────────┬───────────┐
│       bang        │ so_dong │ doanh_thu │
├───────────────────┼─────────┼───────────┤
│ fct (lookback 7d) │      16 │  11415000 │
│ stg (nguon that)  │      16 │  11415000 │
└───────────────────┴─────────┴───────────┘
```

Khớp. Cửa sổ hoạt động vì `unique_key` biến việc nạp lại 7 ngày thành **merge**, không
phải chèn trùng.

Chọn độ rộng cửa sổ bằng **dữ liệu, không bằng cảm giác** — đo xem lịch sử sửa muộn kéo
dài bao lâu:

```sql
select date_diff('day', ngay, _cap_nhat_luc) as tre_ngay, count(*)
from nguon group by 1 order by 1 desc limit 20;
```

Chọn phân vị 99 của cột `tre_ngay`, rồi thêm biên. Phần đuôi dài hơn cửa sổ thì đó là
lý do vẫn cần một `--full-refresh` định kỳ.

## Bước 5 — Chọn chiến lược

| `incremental_strategy` | Cơ chế | Dùng khi | Cần `unique_key` |
|---|---|---|---|
| `append` | chỉ `insert` | log/sự kiện chỉ thêm, không bao giờ sửa | không |
| `merge` | `MERGE` theo khoá | mặc định trên Snowflake/BigQuery/Databricks/DuckDB | **có** |
| `delete+insert` | xoá lô cũ rồi chèn | warehouse không có `MERGE` tốt | có |
| `insert_overwrite` | ghi đè nguyên partition | BigQuery/Spark có partition rõ ràng | không, nhưng cần `partition_by` |

```sql
{{ config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key=['don_hang_id', 'dong'],
    on_schema_change='append_new_columns'
) }}
```

`on_schema_change` quyết định chuyện gì xảy ra khi model thêm cột:

| Giá trị | Hành vi |
|---|---|
| `ignore` (mặc định) | cột mới **bị bỏ im lặng** — bẫy phổ biến |
| `append_new_columns` | thêm cột mới, dòng cũ để `null` |
| `sync_all_columns` | thêm và **xoá** cột theo model |
| `fail` | dừng và báo lỗi |

Mặc định `ignore` là chỗ hay mất giờ: thêm cột vào model, chạy `dbt run`, xanh, nhưng
cột không xuất hiện trong bảng.

## Bước 6 — Khi nào KHÔNG nên incremental

Bật incremental quá sớm là một trong những quyết định đắt nhất trong dbt project.

| Tình huống | Nên dùng |
|---|---|
| Bảng < vài triệu dòng, build < 1 phút | `table` — đơn giản, luôn đúng |
| Bảng có logic đổi thường xuyên | `table` — mỗi lần đổi logic là phải full-refresh, mất hết cái lợi |
| Nguồn hay sửa lùi quá khứ xa | `table`, hoặc incremental + full-refresh hằng tuần |
| Fact lớn, chỉ thêm, logic ổn định | **`incremental`** |

Bốn câu hỏi phải trả lời **trước khi** gõ `materialized='incremental'`:

1. Cột nào cho biết "dòng này mới"? Nó có đáng tin không?
2. Nguồn có sửa lùi quá khứ không? Muộn nhất bao lâu?
3. Khoá tự nhiên của grain là gì? (→ `unique_key`)
4. Chạy lại giữa chừng thì có nhân đôi không?

## Lỗi thường gặp

| Lỗi | Triệu chứng | Cách sửa |
|---|---|---|
| Quên `unique_key` với strategy `merge` | dữ liệu nhân đôi sau mỗi lần chạy | Khai `unique_key` |
| Bộ lọc nằm **ngoài** `is_incremental()` | lần chạy đầu ra bảng rỗng hoặc thiếu | Đưa vào trong khối `{% if %}` |
| `where ngay > max(ngay)` — lớn hơn thật sự | mất dòng cùng ngày với mốc | Dùng `>=` kèm `unique_key`, hoặc cửa sổ |
| Không xử lý dòng sửa muộn | **số lệch, không lỗi** | Cửa sổ nhìn lại (Bước 4) |
| Đổi logic model mà quên `--full-refresh` | dòng cũ giữ logic cũ, dòng mới logic mới | `dbt run --full-refresh -s <model>` |
| `on_schema_change` để mặc định | cột mới biến mất im lặng | `append_new_columns` |
| Lọc theo `current_date` thay vì `max(...) from {{ this }}` | job chạy trễ qua nửa đêm là mất nguyên ngày | Luôn hỏi `{{ this }}` |
| Test chỉ có `unique`/`not_null` | không bắt được lỗi lệch tổng | Thêm singular test đối chiếu tổng với staging |

Dòng cuối là cái chắn thật sự cho incremental:

```sql
-- tests/tong_fct_khop_staging.sql
with a as (select sum(thanh_tien) t from {{ ref('fct_dong_hang') }}),
     b as (select sum(thanh_tien) t from {{ ref('stg_don_hang_chi_tiet') }})
select a.t as fct, b.t as staging from a, b where a.t <> b.t
```

Test này chạy trên toàn bảng nên đắt — cho nó `tags: ['hang_ngay']` và chạy ở job đêm,
đừng nhét vào CI mỗi PR.

## Related Topics

- [Materialization](../reference/materializations.md) — bốn loại, chọn theo tiêu chí nào
- [Triển khai test trong dbt](implementing-tests.md) — viết singular test đối chiếu tổng
- [Case study — incremental đánh rơi đơn sửa muộn](../case-studies/incremental-mat-don-sua-muon.md)
- [Late arriving](../../../data-modeling/skills/late-arriving.md) — vấn đề này ở tầng mô hình
- [Bài tập trung bình](../tutorials/bt-02-trung-binh.md) — bài T1
