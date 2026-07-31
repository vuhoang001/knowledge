---
title: Materialization
sidebar_position: 5
description: view, table, incremental, ephemeral — cùng một SELECT, khác thứ dbt bọc quanh nó.
tags: [dbt, materialization, incremental, view, table, ephemeral]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Materialization — dbt tạo ra cái gì

> **Chốt:** Materialization là **cách dbt bọc câu `SELECT` của bạn thành DDL**. Cùng một
> SQL, đổi một dòng config là ra view, bảng, hay bảng nạp dần — không sửa một chữ SQL.
> Đó là toàn bộ giá trị của việc từ bỏ quyền tự viết `CREATE`.

Mọi output trong trang này chạy thật trên dbt 1.12.0 + dbt-duckdb 1.10.1.

## Bốn loại

| Loại | dbt sinh ra | Chi phí build | Chi phí query | Hợp với |
|---|---|---|---|---|
| `view` | `CREATE VIEW` | gần như 0 | **tính lại mỗi lần** | staging |
| `table` | `CREATE TABLE AS` | build lại toàn bộ | rẻ | mart nhỏ/vừa |
| `incremental` | `INSERT` (+ `DELETE`) phần mới | chỉ phần mới | rẻ | fact lớn |
| `ephemeral` | không gì cả — nhúng thành CTE | 0 | tính trong câu cha | bước trung gian |

## Bằng chứng: cùng SELECT, khác DDL

`target/run/` chứa DDL dbt **thật sự** gửi đi.

`view`:

```sql
create view "scratch"."main"."stg_don_hang__dbt_tmp" as (
    select
    don_hang_id, dong, ma_hang, so_luong, don_gia,
    so_luong * don_gia as thanh_tien,
    cast(ngay as date) as ngay
from "scratch"."main"."don_hang_chi_tiet"
```

`table`:

```sql
    create  table
      "scratch"."main"."mart_doanh_thu_ngay__dbt_tmp"
    as (
      select d.ngay, h.nhom, sum(d.thanh_tien) as doanh_thu, count(*) as so_dong
```

Chú ý hậu tố `__dbt_tmp`: dbt dựng bảng tạm rồi mới đổi tên. Nhờ vậy model build lỗi
**không phá bảng đang dùng** — người đọc báo cáo vẫn thấy bản cũ thay vì thấy bảng trống.

## `incremental` — chỗ đáng học nhất

```sql
{{ config(materialized='incremental', unique_key='don_hang_id') }}
select don_hang_id, sum(thanh_tien) as tong, max(ngay) as ngay
from {{ ref('stg_don_hang') }}
{% raw %}{% if is_incremental() %}
where ngay > (select coalesce(max(ngay), '1900-01-01') from {{ this }})
{% endif %}{% endraw %}
group by 1
```

### Lần chạy đầu — bảng chưa tồn tại

`target/compiled/`:

```sql
select don_hang_id, sum(thanh_tien) as tong, max(ngay) as ngay
from "scratch"."main"."stg_don_hang"

group by 1
```

`is_incremental()` trả **false**, khối `where` **biến mất hoàn toàn**.

### Lần chạy thứ hai — bảng đã có

```sql
select don_hang_id, sum(thanh_tien) as tong, max(ngay) as ngay
from "scratch"."main"."stg_don_hang"

where ngay > (select coalesce(max(ngay), '1900-01-01') from "scratch"."main"."mart_incr")

group by 1
```

Khối `where` xuất hiện, `{{ this }}` đã thành tên bảng đích. Đây là lý do **phải đọc
`target/compiled/`** khi debug incremental: cùng một file `.sql` sinh ra hai câu khác
nhau tuỳ trạng thái warehouse.

### dbt làm gì với kết quả đó

Vì có `unique_key`, DDL lần 2:

```sql
delete from "scratch"."main"."mart_incr"
insert into "scratch"."main"."mart_incr" ("don_hang_id", "tong", "ngay")
```

**Xoá rồi chèn**, không phải chèn thẳng. Bỏ `unique_key` thì chỉ còn `insert` — dòng đã
tồn tại bị **nhân đôi** thay vì cập nhật.

`incremental_strategy` quyết định cặp lệnh này: `append` (chỉ insert),
`delete+insert` (mặc định của dbt-duckdb khi có `unique_key`), `merge` (warehouse hỗ trợ
`MERGE` như Snowflake, BigQuery).

## Bốn câu hỏi phải trả lời trước khi chọn `incremental`

`incremental` là loại duy nhất đưa **trạng thái** vào pipeline, nên là loại duy nhất có
thể sai âm thầm. `view` và `table` build lại từ đầu nên luôn khớp model.

| Câu hỏi | Không trả lời được thì |
|---|---|
| Dòng đến muộn xử lý sao? | Lọc theo `max(ngay)` **bỏ sót vĩnh viễn** dòng có ngày cũ hơn |
| Dòng bị `UPDATE` ở nguồn? | Không `unique_key` là nhân bản; có thì phải chắc nó thật sự unique |
| Bao lâu `--full-refresh` một lần? | Sai tích luỹ, không ai phát hiện |
| Schema đổi thì sao? | Mặc định dbt **bỏ qua cột mới**; cần `on_schema_change` |

Chưa trả lời được cả bốn thì dùng `table`. Chậm hơn nhưng **không bao giờ sai âm thầm**.

## Chọn loại nào

```text
Model có nặng không?
├─ Không  → view          (mặc định, rẻ nhất, luôn tươi)
└─ Có
   ├─ Không ai đọc trực tiếp        → ephemeral
   ├─ Build lại vẫn chấp nhận được  → table
   └─ Build lại quá lâu
      └─ Trả lời được cả 4 câu trên? → incremental
                                     ngược lại → table
```

**Mặc định nên là `view`.** Đổi sang `table` khi **đo được** là chậm, không phải khi
đoán — `dbt_project.yml` của lab đặt đúng như vậy.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| `incremental` không `unique_key` khi nguồn có `UPDATE` | Dòng nhân đôi âm thầm, tổng phồng |
| Lọc `is_incremental()` theo `max(ngay)` của bảng đích | Dòng đến muộn bị bỏ sót vĩnh viễn |
| Quên bọc `{% raw %}{% if is_incremental() %}{% endraw %}` | Lần chạy đầu tham chiếu `{{ this }}` khi bảng chưa tồn tại → lỗi |
| Chọn `incremental` vì "nghe nhanh hơn" | Thêm trạng thái, thêm cách sai, chưa đo được lợi ích |
| `table` cho tầng staging | Build lại toàn bộ mỗi lần, không đổi lấy gì |
| Không bao giờ `--full-refresh` | Sai tích luỹ; nên có lịch định kỳ |

## Related Topics

- [Model và `ref()`](models-and-ref.md) — `ephemeral` nhúng thành CTE, có bằng chứng
- [dbt là gì](what-is-dbt.md) — vì sao dbt bọc `SELECT` thành DDL
- [Source, seed, snapshot](sources-seeds-snapshots.md) — `snapshot` khác hẳn, không tái tạo được
- [Test và data quality](testing.md) — test là thứ bắt được `incremental` chạy sai
- [Bài tập](../tutorials/dbt-lab-duckdb.md) bài 5
