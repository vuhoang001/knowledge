---
title: Viết model đầu tiên với ref()
sidebar_position: 2
description: "Một file .sql = một SELECT = một bảng. ref() không phải cách viết tắt tên bảng mà là cách duy nhất dbt biết thứ tự chạy."
tags: [dbt, model, ref, dag, staging]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Viết model đầu tiên với `ref()`

> **Chốt:** model là **một câu `SELECT`, không có `CREATE`, không có `;`**. dbt bọc
> phần DDL. Và `ref()` là **cạnh của DAG** — viết thẳng tên bảng thì model vẫn chạy,
> chỉ là dbt mất khả năng biết thứ tự. Đó là loại hỏng không báo lỗi.

## Mục tiêu học

Viết được hai model nối nhau, đọc được SQL mà dbt thật sự gửi đi, và chứng minh được
bằng lệnh rằng `ref()` đã tạo ra một cạnh phụ thuộc.

## Bước 1 — Một model là một `SELECT`

```sql
-- models/staging/stg_don_hang.sql
with nguon as (
    select * from {{ ref('don_hang') }}
)
select
    don_hang_id,
    khach_id,
    cast(ngay_dat  as date) as ngay_dat,
    cast(ngay_giao as date) as ngay_giao,
    cast(ngay_nhan as date) as ngay_nhan,
    trang_thai,
    cast(phi_ship as bigint) as phi_ship
from nguon
```

Ba thứ **không** có trong file, và không được thêm vào:

| Không viết | Vì sao |
|---|---|
| `create table ... as` | dbt sinh phần này theo materialization. Viết tay là ghi đè lựa chọn đó |
| dấu `;` cuối câu | dbt bọc câu này vào một câu lớn hơn; dấu `;` ở giữa làm hỏng cú pháp |
| tên schema/database cứng | môi trường dev và prod khác schema — cứng là chạy nhầm chỗ |

Tên model = **tên file**, không phải tên trong `select`. `stg_don_hang.sql` →
`ref('stg_don_hang')`.

## Bước 2 — Model thứ hai, nối bằng `ref()`

```sql
-- models/staging/stg_don_hang_chi_tiet.sql
select
    don_hang_id,
    dong,
    ma_hang,
    cast(so_luong as bigint) as so_luong,
    cast(don_gia  as bigint) as don_gia,
    cast(so_luong as bigint) * cast(don_gia as bigint) as thanh_tien,
    cast(ngay as date) as ngay
from {{ ref('don_hang_chi_tiet') }}
```

```sql
-- models/marts/mart_doanh_thu_ngay.sql
{{ config(materialized='table') }}

select
    dh.ngay_dat                    as ngay,
    count(distinct dh.don_hang_id) as so_don,
    sum(ct.thanh_tien)             as doanh_thu
from {{ ref('stg_don_hang') }} dh
join {{ ref('stg_don_hang_chi_tiet') }} ct using (don_hang_id)
group by 1
```

## Bước 3 — Chạy, và đọc thứ tự trong output

```bash
dbt run --profiles-dir .
```

```text
02:37:53  1 of 3 START sql view model main_staging.stg_don_hang .......................... [RUN]
02:37:53  2 of 3 START sql view model main_staging.stg_don_hang_chi_tiet ................. [RUN]
02:37:53  1 of 3 OK created sql view model main_staging.stg_don_hang ..................... [OK in 0.07s]
02:37:53  2 of 3 OK created sql view model main_staging.stg_don_hang_chi_tiet ............ [OK in 0.07s]
02:37:53  3 of 3 START sql table model main_marts.mart_doanh_thu_ngay .................... [RUN]
02:37:53  3 of 3 OK created sql table model main_marts.mart_doanh_thu_ngay ............... [OK in 0.04s]
02:37:53  Done. PASS=3 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=3
```

Đọc ra được hai điều quan trọng:

- **Hai model staging chạy song song** (cùng `1 of 3`/`2 of 3` START một nhịp) —
  chúng không phụ thuộc nhau.
- **`mart_doanh_thu_ngay` chờ tới khi cả hai xong.** Không ai khai thứ tự này ở đâu
  cả; nó suy ra từ hai `ref()`.

## Bước 4 — Nhìn tận mắt SQL dbt gửi đi

Đây là thói quen phải hình thành ngay từ model đầu tiên:

```bash
cat target/compiled/dbt_lab/models/staging/stg_don_hang.sql
```

```sql
with nguon as (
    select * from "lab"."main"."don_hang"
)
select
    don_hang_id,
    khach_id,
    cast(ngay_dat  as date) as ngay_dat,
    cast(ngay_giao as date) as ngay_giao,
    cast(ngay_nhan as date) as ngay_nhan,
    trang_thai,
    cast(phi_ship as bigint) as phi_ship
from nguon
```

`{{ ref('don_hang') }}` đã biến thành `"lab"."main"."don_hang"` — **đường dẫn đầy đủ,
đúng môi trường hiện tại**. Đổi `--target prod` thì cùng file này biên dịch ra đường
dẫn khác. Đó là toàn bộ giá trị của `ref()`.

Phân biệt hai thư mục:

| Thư mục | Chứa gì | Dùng khi |
|---|---|---|
| `target/compiled/` | SQL sau khi render Jinja, **chưa** bọc DDL | Debug logic SQL — copy dán thẳng vào warehouse chạy được |
| `target/run/` | SQL đã bọc `create table as ...` | Xem dbt thật sự tạo object kiểu gì |

## Bước 5 — Chứng minh cạnh DAG có thật

Không tin bằng mắt; hỏi dbt:

```bash
dbt ls --select stg_don_hang+          # model này và mọi thứ phía sau nó
dbt ls --select +mart_doanh_thu_ngay   # model này và mọi thứ nó phụ thuộc
```

Nếu bạn thay `{{ ref('stg_don_hang') }}` bằng `main_staging.stg_don_hang` viết cứng,
model **vẫn chạy** — nhưng `dbt ls --select +mart_doanh_thu_ngay` sẽ không còn liệt kê
`stg_don_hang`. Đó là cách phát hiện.

## Lỗi thường gặp

| Lỗi | Triệu chứng | Cách sửa |
|---|---|---|
| Viết cứng tên bảng thay vì `ref()` | **Không lỗi.** Model chạy, số đúng, DAG sai | grep `from\s+\w+\.\w+` trong `models/` |
| `Model 'model.x.y' depends on a node named 'z' which was not found` | dbt fail lúc parse | Gõ sai tên trong `ref()` — tên là **tên file**, không có `.sql` |
| `Found a cycle` | parse fail | Hai model `ref()` lẫn nhau. dbt không cho, và đúng |
| Thêm `;` cuối model | lỗi cú pháp khó hiểu ở warehouse | Bỏ `;` |
| Thêm `create table` trong model | bảng tạo ra sai chỗ hoặc lỗi | Bỏ đi, dùng `config(materialized=...)` |
| Đặt `ref()` trong dấu nháy: `'{{ ref("x") }}'` | dbt coi là chuỗi, không phải bảng | Bỏ nháy |
| Hai file model trùng tên ở hai thư mục | `Found two resources with the name` | Tên model là **toàn cục**, không theo thư mục |

## Bài kiểm nhỏ trước khi sang bài sau

Trả lời miệng, rồi kiểm bằng lệnh:

1. Model của tôi hạ cánh ở database nào, schema nào? → `dbt debug`, `dbt run` output.
2. `mart_doanh_thu_ngay` phụ thuộc mấy model? → `dbt ls --select +mart_doanh_thu_ngay`.
3. SQL thật sự gửi đi trông thế nào? → `target/compiled/`.

## Related Topics

- [Model và `ref()` — DAG mọc ra từ đâu](../reference/models-and-ref.md) — phần lý thuyết
- [Tổ chức layer và quy ước đặt tên](../reference/layer-va-dat-ten.md) — model mới nên nằm tầng nào
- [Khai báo source](khai-bao-source.md) — khi bảng không do dbt tạo ra
- [Bài tập cơ bản](../tutorials/bt-01-co-ban.md) — bài 2 và 3
