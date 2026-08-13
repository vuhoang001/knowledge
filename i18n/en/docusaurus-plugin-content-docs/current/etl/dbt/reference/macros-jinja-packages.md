---
title: Macro, Jinja và package
i18n_status: untranslated
sidebar_position: 7
description: Jinja chạy trước khi SQL rời máy — và ngưỡng nào thì nên viết macro.
tags: [dbt, jinja, macro, dbt-utils]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Macro, Jinja, package — khi SQL bắt đầu bị copy-paste

> **Chốt:** Jinja là template engine chạy **trước** khi SQL rời máy bạn. Mọi thứ
> `{{ }}` và `{% %}` biến mất trong `target/compiled/` — warehouse không bao giờ
> thấy chúng.


## Ba cú pháp Jinja

| Cú pháp | Tên | Làm gì | Có trong SQL compile |
|---|---|---|---|
| `{{ ... }}` | expression | **In ra** giá trị | ✅ kết quả |
| `{% ... %}` | statement | Câu lệnh: `if`, `for`, `set`, `macro` | ❌ chỉ tác dụng |
| `{# ... #}` | comment | Chú thích | ❌ biến mất hoàn toàn |

Chứng minh — model này:

```sql
{{ config(materialized='table', post_hook="...") }}
-- {% raw %}{# day la chu thich Jinja, KHONG xuat hien trong SQL compile #}{% endraw %}
select
    don_hang_id,
    {% raw %}{{ dinh_dang_tien('thanh_tien') }}{% endraw %} as tien_doc_duoc,
    '{% raw %}{{ target.name }}{% endraw %}' as chay_o_target,
    '{% raw %}{{ var("moi_truong", "chua_khai") }}{% endraw %}' as bien_var
from {% raw %}{{ ref('stg_don_hang') }}{% endraw %}
```

biên dịch thành:

```sql
-- 
select
    don_hang_id,
    
    round(thanh_tien / 1000.0, 1) || 'k'
 as tien_doc_duoc,
    'dev' as chay_o_target,
    'chua_khai' as bien_var
from "scratch"."main"."stg_don_hang"
```

Chú ý dòng `-- ` còn trơ lại: chú thích `{% raw %}{# #}{% endraw %}` bị xoá sạch, chỉ còn dấu `--` của SQL.

## Viết macro

```sql
-- macros/tien_te.sql
{% raw %}{% macro dinh_dang_tien(cot) %}
    round({{ cot }} / 1000.0, 1) || 'k'
{% endmacro %}{% endraw %}
```

Gọi bằng `{% raw %}{{ dinh_dang_tien('thanh_tien') }}{% endraw %}`. Macro **sinh ra chuỗi SQL**, không
chạy gì cả — nó là template text, không phải hàm của database.

Hệ quả: macro sai cú pháp thì lỗi xuất hiện ở **SQL đã compile**, không ở chỗ bạn viết
macro. Luôn đọc `target/compiled/` khi macro có vẻ sai.

Generic test tự viết cũng là macro, bọc bằng `{% raw %}{% test %}{% endraw %}` — xem
[Triển khai test](../skills/implementing-tests.md).

## Bốn biến hay dùng

| Biến | Là gì | Ví dụ giá trị thật |
|---|---|---|
| `{% raw %}{{ this }}{% endraw %}` | Chính model đang chạy | `"scratch"."main"."mart_incr"` |
| `{% raw %}{{ target.name }}{% endraw %}` | Target đang dùng | `dev` |
| `{% raw %}{{ var('x', 'mặc định') }}{% endraw %}` | Biến khai trong `dbt_project.yml` hoặc `--vars` | `chua_khai` |
| `{% raw %}{{ env_var('DBT_X') }}{% endraw %}` | Biến môi trường | — |

`{% raw %}{{ this }}{% endraw %}` là thứ làm `incremental` hoạt động được — xem
[Materialization](materializations.md).

Truyền `var` từ dòng lệnh đè lên mặc định:

```bash
dbt compile --select mart_jinja --vars '{moi_truong: production}'
```

```sql
    'dev' as chay_o_target,
    'production' as bien_var
```

Dùng `var()` cho thứ đổi theo **lần chạy** (ngày bắt đầu backfill, cờ bật/tắt). Dùng
`env_var()` cho thứ **không được vào git** (mật khẩu, token).

## `run_query()` — chạy SQL lúc compile

Khác mọi thứ ở trên: nó **hỏi warehouse ngay lúc biên dịch**, rồi dùng kết quả để sinh SQL.

```sql
{% raw %}{% macro cot_cua(ten_bang) %}
    {% set truy_van %}
        select column_name from information_schema.columns
        where table_name = '{{ ten_bang }}' order by ordinal_position
    {% endset %}
    {% set kq = run_query(truy_van) %}
    {% if execute %}{{ log("Cot cua " ~ ten_bang ~ ": " ~ kq.columns[0].values() | join(", "), info=True) }}{% endif %}
{% endmacro %}{% endraw %}
```

```bash
dbt run-operation cot_cua --args '{ten_bang: stg_don_hang}'
```

```text
Cot cua stg_don_hang: don_hang_id, dong, ma_hang, so_luong, don_gia, thanh_tien, ngay
```

`{% raw %}{% if execute %}{% endraw %}` bắt buộc: dbt parse project **hai lượt**, lượt đầu chưa kết nối
warehouse nên `run_query` trả `None`. Thiếu nó là lỗi khó hiểu ở lượt parse.

Dùng khi cần sinh SQL theo **danh sách cột thật** — ví dụ pivot động, hoặc `select` mọi
cột trừ vài cột.

## Hook — chạy quanh model

```sql
{{ config(post_hook="{% raw %}{{ log('post-hook chay sau khi tao ' ~ this, info=True) }}{% endraw %}") }}
```

```text
post-hook chay sau khi tao "scratch"."main"."mart_jinja"
1 of 1 OK created sql table model main.mart_jinja ................ [OK in 0.07s]
```

| Hook | Chạy khi | Dùng cho |
|---|---|---|
| `pre-hook` | trước model | set biến session, khoá bảng |
| `post-hook` | sau model | `GRANT`, `ANALYZE`, gọi API |
| `on-run-start` / `on-run-end` | đầu/cuối cả lần chạy | log tổng, thông báo |

Cấp quyền là ca dùng phổ biến nhất: `post_hook="grant select on {% raw %}{{ this }}{% endraw %} to role_bi"`.

## `packages.yml` + `dbt deps`

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]
```

```bash
dbt deps
```

```text
Installing dbt-labs/dbt_utils
Installed from version 1.4.1
```

| Package | Dùng để |
|---|---|
| `dbt_utils` | Test và macro dùng chung — cần ngay từ đầu |
| `dbt_expectations` | Bộ test kiểu Great Expectations |
| `codegen` | Sinh sẵn `schema.yml` từ bảng có thật |

Khoá version bằng khoảng (`>=1.1.0, <2.0.0`), đừng ghim cứng một số cũng đừng để trống.
`package-lock.yml` sinh ra sau `dbt deps` — **commit nó** để cả nhóm cùng version.

`dbt_packages/` thì **gitignore** — đó là thư mục tải về, tái tạo bằng `dbt deps`.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Đọc lỗi macro ở file macro thay vì `target/compiled/` | Tìm nhầm chỗ; macro chỉ sinh chuỗi |
| Quên `{% raw %}{% if execute %}{% endraw %}` quanh `run_query` | Lỗi khó hiểu ở lượt parse đầu |
| Dùng `var()` cho mật khẩu | Vào git; phải dùng `env_var()` |
| Viết macro khi mới copy-paste **hai** lần | Trừu tượng hoá sớm, khó đọc hơn cả bản lặp |
| Không commit `package-lock.yml` | Mỗi máy một version package |
| Commit `dbt_packages/` | Repo phình, conflict vô nghĩa |

## Related Topics

- [Mục lục dbt](index.md)
- [dbt là gì](what-is-dbt.md) §2 — Jinja biến mất ở `target/compiled/`
- [Test và data quality](testing.md) §1 — generic test tự viết
