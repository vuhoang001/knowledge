---
title: Model và ref() — DAG mọc ra từ đâu
i18n_status: untranslated
sidebar_position: 3
description: ref() không phải cách viết tắt tên bảng mà là cách duy nhất khai báo phụ thuộc.
tags: [dbt, model, ref, dag, lineage, ephemeral]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Model và `ref()` — DAG mọc ra từ đâu

> **Chốt:** một model = một file `.sql` = một câu `SELECT`. `ref()` không phải cách viết
> tắt tên bảng — nó là **cách duy nhất** khai báo phụ thuộc. Viết thẳng tên bảng thì
> model vẫn chạy, nhưng DAG mất một cạnh và lineage nói dối.

Mọi output trong trang này chạy thật trên dbt 1.12.0 + dbt-duckdb 1.10.1.

## Model là gì — và không được chứa gì

Một model là **một câu `SELECT`**. Không `CREATE`, không `INSERT`, không dấu `;` cuối.

Lý do: dbt **bọc** câu `SELECT` của bạn vào DDL do nó sinh ra. Bạn viết `CREATE` thì
thành `CREATE TABLE ... AS (CREATE TABLE ...)`. Dấu `;` cắt câu làm đôi, phần bọc phía
sau thành câu rời.

Nói cách khác: bạn khai **kết quả muốn có**, dbt lo cách tạo ra nó. Đổi từ `view` sang
`table` sang `incremental` mà **không sửa một chữ SQL nào** — đó là thứ mua được bằng
việc từ bỏ quyền viết DDL.

## `ref()` dựng nên DAG

Mỗi lần dbt thấy `ref('a')` trong model `b`, nó ghi một cạnh `a → b`. Từ tập cạnh đó:

| dbt làm được | Nhờ đâu |
|---|---|
| Tự biết thứ tự chạy | sắp topo trên DAG |
| Chạy đúng nhánh bị ảnh hưởng (`--select x+`) | duyệt đồ thị |
| Vẽ lineage trong `dbt docs` | chính đồ thị đó |
| Báo lỗi khi model bị trỏ tới biến mất | kiểm cạnh |

Viết thẳng `from lab.main.don_hang_chi_tiet` thì **model vẫn chạy** — và đó mới là chỗ
nguy hiểm. Không báo gì, nhưng dbt có thể chạy sai thứ tự, và lineage **nói dối**.

**Quy tắc không có ngoại lệ: không bao giờ viết tên bảng thẳng.**

### `ref()` biên dịch thành gì

Model `mart_doanh_thu_ngay.sql` viết:

```sql
select d.ngay, h.nhom, sum(d.thanh_tien) as doanh_thu, count(*) as so_dong
from {{ ref('stg_don_hang') }} d
join {{ ref('stg_hang_hoa') }} h on d.ma_hang = h.ma_hang
group by 1, 2
```

`target/compiled/.../mart_doanh_thu_ngay.sql` — thứ warehouse thật sự nhận:

```sql
select d.ngay, h.nhom, sum(d.thanh_tien) as doanh_thu, count(*) as so_dong
from "scratch"."main"."stg_don_hang" d
join "scratch"."main"."stg_hang_hoa" h on d.ma_hang = h.ma_hang
group by 1, 2
```

`ref()` biến mất, thành tên bảng đầy đủ ba phần. **Chuyển sang warehouse khác thì phần
tên này tự đổi** — đó là lý do không hardcode.

## Đặt tên theo tầng

| Tiền tố | Tầng | Làm gì | Materialization hay dùng |
|---|---|---|---|
| `stg_` | staging | 1 nguồn = 1 model. Đổi tên cột, ép kiểu, **không** join | `view` |
| `int_` | intermediate | Bước trung gian phức tạp, không ai đọc trực tiếp | `ephemeral` / `view` |
| `fct_` `dim_` | mart | Bảng cho người dùng cuối | `table` / `incremental` |

Vì sao phải tầng hoá: không có `stg_`, mỗi mart tự ép kiểu và đổi tên theo cách riêng —
đến lúc hai mart ra số khác nhau thì không biết bên nào đúng. Tầng `stg_` là **một chỗ
duy nhất** định nghĩa "cột này nghĩa là gì".

## Chọn model để chạy

Chạy trên project có DAG: `don_hang_chi_tiet` (seed) → `stg_don_hang` → `mart_doanh_thu_ngay`.

```bash
dbt ls --select stg_don_hang+          # chính nó + mọi thứ XUÔI dòng
```

```text
scratch.marts.mart_doanh_thu_ngay
scratch.staging.stg_don_hang
```

```bash
dbt ls --select +mart_doanh_thu_ngay   # chính nó + mọi thứ NGƯỢC dòng
```

```text
scratch.marts.mart_doanh_thu_ngay
scratch.staging.stg_don_hang
scratch.staging.stg_hang_hoa
scratch.don_hang_chi_tiet
scratch.hang_hoa
```

Chú ý bản ngược dòng kéo về **cả seed** — vì seed cũng là node trong DAG.

| Cú pháp | Nghĩa |
|---|---|
| `x` | đúng model `x` |
| `x+` | `x` và mọi thứ phụ thuộc vào nó (xuôi dòng) |
| `+x` | `x` và mọi thứ nó phụ thuộc (ngược dòng) |
| `x+2` | xuôi dòng nhưng **chỉ 2 bước** |
| `tag:daily` | mọi model mang tag đó |
| `state:modified` | model đổi so với một `manifest.json` trước — nền của CI |

`+x` là câu lệnh cần khi **debug**: dựng lại đúng chuỗi sinh ra một bảng sai.
`x+` là câu lệnh cần khi **sửa**: chạy lại mọi thứ bị ảnh hưởng bởi thay đổi.

## `config()` trong model hay `dbt_project.yml`?

`dbt_project.yml` khai `marts` là `table`:

```yaml
models:
  scratch:
    +materialized: view
    marts:
      +materialized: table
```

Model `marts/mart_test_config.sql` khai ngược lại:

```sql
{{ config(materialized='view') }}
select 1 as x
```

Kết quả trong warehouse:

```text
┌──────────────────┬────────────┐
│    table_name    │ table_type │
├──────────────────┼────────────┤
│ mart_test_config │ VIEW       │
└──────────────────┴────────────┘
```

**`config()` trong model thắng.** Thứ tự ưu tiên: càng gần model càng thắng —
`config()` trong file > cấu hình thư mục con > cấu hình project.

Hệ quả thực dụng: đặt mặc định hợp lý ở `dbt_project.yml`, chỉ dùng `config()` cho
**ngoại lệ** — và mỗi lần dùng nên có comment nói vì sao, vì nó đang phá mặc định.

## `ephemeral` — model không tồn tại trong warehouse

```sql
{{ config(materialized='ephemeral') }}
select don_hang_id, thanh_tien from {{ ref('stg_don_hang') }}
```

Model dùng nó biên dịch ra:

```sql
with __dbt__cte__stg_eph as (
select don_hang_id, thanh_tien from "scratch"."main"."stg_don_hang"
) select don_hang_id, sum(thanh_tien) as tong from __dbt__cte__stg_eph group by 1
```

Bị **nhúng thành CTE**. Kiểm trong warehouse:

```text
┌─────────────────────┬────────────┐
│     table_name      │ table_type │
├─────────────────────┼────────────┤
│ don_hang_chi_tiet   │ BASE TABLE │
│ hang_hoa            │ BASE TABLE │
│ mart_doanh_thu_ngay │ BASE TABLE │
│ mart_dung_eph       │ BASE TABLE │
│ stg_don_hang        │ VIEW       │
│ stg_hang_hoa        │ VIEW       │
└─────────────────────┴────────────┘
```

`stg_eph` **không có trong danh sách**. Nó chỉ tồn tại lúc biên dịch.

Đánh đổi: gọn warehouse, nhưng **không query trực tiếp được** và không debug riêng
được. Dùng cho bước trung gian không ai cần đọc; đừng dùng nếu bạn sẽ phải mở nó ra xem.

## Vòng trong DAG

Hai model trỏ vào nhau:

```sql
-- stg_vong_a.sql
select 1 as x from {{ ref('stg_vong_b') }}
-- stg_vong_b.sql
select 1 as x from {{ ref('stg_vong_a') }}
```

`dbt run` dừng ngay, **không chạy model nào**:

```text
Found a cycle: model.scratch.stg_vong_b --> model.scratch.stg_vong_a
```

Đây là một trong ít lỗi dbt bắt được ở mức đồ thị, trước khi chạm warehouse. Bắt được
vì `ref()` khai báo phụ thuộc tường minh — viết thẳng tên bảng thì dbt **không thấy
vòng**, và bảng sẽ được dựng theo thứ tự tuỳ hứng.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Viết thẳng tên bảng thay vì `ref()` | Model vẫn chạy, DAG mất cạnh, lineage nói dối, có thể chạy sai thứ tự |
| Có `CREATE`/`INSERT`/`;` trong model | dbt bọc DDL của nó ra ngoài → SQL hỏng |
| Join ở tầng `stg_` | Mất tính "một nguồn một model", tầng staging hết tác dụng |
| Rắc `config()` khắp nơi | Không đọc `dbt_project.yml` là không biết model chạy kiểu gì |
| `ephemeral` cho model cần debug | Không query trực tiếp được, phải đọc SQL compile để hiểu |

## Related Topics

- [dbt là gì](what-is-dbt.md) — `ref()` lần đầu, và SQL compile
- [Materialization](materializations.md) — `view`/`table`/`incremental`/`ephemeral` chọn thế nào
- [Cấu trúc project](project-structure.md) — `target/compiled/` nằm ở đâu
- [Source, seed, snapshot](sources-seeds-snapshots.md) — `source()` khác `ref()` chỗ nào
- [Bài tập](../tutorials/dbt-lab-duckdb.md) bài 4
