---
title: Quản lý dependencies với package
sidebar_position: 8
description: "dbt_utils không phải thư viện tiện ích cho vui — nó là chỗ có sẵn những test mà bạn chắc chắn cần, và một bài học về pin phiên bản."
tags: [dbt, package, dbt-utils, dependencies, dbt-expectations]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Quản lý dependencies với package

> **Chốt:** package dbt **không phải thư viện chạy lúc runtime** — nó là mã nguồn được
> tải về `dbt_packages/` và biên dịch cùng project của bạn. Nghĩa là: không pin phiên
> bản thì một sáng đẹp trời SQL sinh ra khác đi mà không ai đổi dòng code nào.

## Mục tiêu học

Cài được package, dùng được năm macro/test đáng giá nhất của `dbt_utils`, và pin phiên
bản đúng cách để CI không đổi hành vi sau lưng.

## Bước 1 — Khai và cài

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]
```

```bash
dbt deps
```

```text
02:37:07  Installing dbt-labs/dbt_utils
02:37:07  Installed from version 1.4.1
02:37:07  Up to date!
```

Ba nguồn package, ba cách khai:

```yaml
packages:
  # 1. dbt Package Hub — phổ biến nhất
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]

  # 2. Git — package nội bộ công ty
  - git: "https://github.com/cong-ty/dbt-macros-chung.git"
    revision: v1.2.0          # tag hoặc commit SHA — ĐỪNG để nhánh

  # 3. Thư mục local — monorepo nhiều dbt project
  - local: ../dbt_chung
```

## Bước 2 — `package-lock.yml` và vì sao phải commit nó

`dbt deps` sinh ra file khoá:

```yaml
packages:
  - name: dbt_utils
    package: dbt-labs/dbt_utils
    version: 1.4.1
sha1_hash: e6424ba9e5a22487e47f023803aa4f0411946808
```

**Commit file này.** Nó biến `>=1.1.0, <2.0.0` (một khoảng) thành `1.4.1` (một điểm).
Không có nó, máy bạn cài 1.4.1 còn CI cài 1.5.0 — và macro sinh SQL khác đi trong khi
git diff trống trơn.

`.gitignore` phải có `dbt_packages/` (mã tải về, sinh lại được) nhưng **không** có
`package-lock.yml`.

Nâng phiên bản là một hành động **cố ý**:

```bash
dbt deps --upgrade      # cập nhật lock file, rồi review diff như review code
```

## Bước 3 — Năm thứ của `dbt_utils` dùng nhiều nhất

### 1. `unique_combination_of_columns` — test cần ngay từ ngày đầu

Test `unique` của dbt chỉ nhận **một** cột. Bảng có grain tổ hợp thì nó vô dụng.

```yaml
models:
  - name: stg_don_hang_chi_tiet
    tests:
      - dbt_utils.unique_combination_of_columns:
          arguments:
            combination_of_columns: [don_hang_id, dong]
```

```text
02:38:20  2 of 5 PASS dbt_utils_unique_combination_of_columns_stg_don_hang_chi_tiet_don_hang_id__dong  [PASS in 0.08s]
```

Đây là test **chứng minh grain**. Không có nó thì mọi lời khai grain chỉ là lời nói.

### 2. `generate_surrogate_key` — khoá thay thế ổn định

```sql
select
    {{ dbt_utils.generate_surrogate_key(['khach_id']) }} as khach_sk,
    {{ dbt_utils.star(from=ref('khach_hang'), except=['ho_ten']) }}
from {{ ref('khach_hang') }}
```

Biên dịch ra:

```sql
select
    md5(cast(coalesce(cast(khach_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as khach_sk,
    "khach_id",
  "khu_vuc",
  "hang"
from "lab"."main"."khach_hang"
```

```text
┌──────────────────────────────────┬──────────┬────────────┬───────────┐
│             khach_sk             │ khach_id │  khu_vuc   │   hang    │
├──────────────────────────────────┼──────────┼────────────┼───────────┤
│ 1a2ddc2db4693cfd16d534cde5572cc1 │ C1       │ Mien Nam   │ Bac       │
│ f1a543f5a2c5d49bc5dde298fcf716e4 │ C2       │ Mien Nam   │ Vang      │
│ 3abe124ecc82bf2c2e22e6058f38c50c │ C3       │ Mien Trung │ Bac       │
│ b713e6323a68d3ddabf4855826c50148 │ C4       │ Mien Bac   │ Kim cuong │
└──────────────────────────────────┴──────────┴────────────┴───────────┘
```

Hai chi tiết quan trọng đọc được từ SQL biên dịch:

- **`coalesce` với chuỗi canh gác.** Không có nó, `NULL` trong khoá làm `md5` trả `NULL`
  → mọi dòng thiếu khoá gộp thành một.
- **Hash chứ không phải số tăng dần.** Giá trị **ổn định**: build lại, chạy ở máy khác,
  đổi warehouse đều ra cùng chuỗi. Đó là thứ `row_number()` không cho bạn.

### 3. `star` — chọn hết trừ vài cột

`select *` trong staging là thói quen xấu (thêm cột ở nguồn là trôi xuống mart mà không
ai duyệt), nhưng liệt kê 40 cột cũng không ai làm. `star()` là đường giữa.

### 4. `date_spine` — sinh bảng ngày

```sql
{{ dbt_utils.date_spine(
    datepart="day",
    start_date="cast('2026-01-01' as date)",
    end_date="cast('2027-01-01' as date)"
) }}
```

Đây là xương sống của `dim_date` và của mọi báo cáo cần "ngày không có đơn cũng phải
hiện dòng 0".

### 5. `equality` / `fewer_rows_than` — test đối chiếu hai bảng

```yaml
models:
  - name: fct_dong_hang
    tests:
      - dbt_utils.fewer_rows_than:
          arguments:
            compare_model: ref('stg_don_hang_chi_tiet')
```

Loại test này bắt được thứ `unique`/`not_null` không bao giờ bắt được: **model đánh rơi
dòng**.

## Bước 4 — Các package khác, và khi nào đáng thêm

| Package | Cho cái gì | Cân nhắc |
|---|---|---|
| `dbt_utils` | test + macro nền | **Gần như bắt buộc** |
| `dbt_expectations` | ~60 test kiểu Great Expectations (phân phối, kiểu, regex) | Thêm khi cần data quality sâu; nặng hơn nhiều |
| `codegen` | sinh sẵn YAML/model từ bảng có thật | Tiết kiệm hàng giờ khi khai source 40 bảng |
| `dbt_date` | hàm ngày tháng, múi giờ, lịch tài chính | Khi có lịch tài chính không trùng lịch dương |
| `elementary` | observability: theo dõi test, phát hiện bất thường | Đội đã chạy production ổn định |
| `audit_helper` | so hai bảng khi refactor | **Rất đáng** khi migrate từ hệ cũ |

`codegen` đáng nhắc riêng — nó tiết kiệm đúng phần việc buồn tẻ nhất:

```bash
dbt run-operation generate_source --args '{schema_name: erp_prod, database_name: RAW}'
dbt run-operation generate_base_model --args '{source_name: erp, table_name: orders}'
```

## Lỗi thường gặp

| Lỗi | Triệu chứng | Cách sửa |
|---|---|---|
| Không commit `package-lock.yml` | CI sinh SQL khác máy local, git diff trống | Commit nó |
| `revision:` trỏ vào nhánh `main` | package đổi sau lưng | Trỏ vào tag hoặc SHA |
| Quên `dbt deps` trong CI | `Compilation Error ... 'dbt_utils' is undefined` | Thêm `dbt deps` trước mọi lệnh |
| Commit `dbt_packages/` | repo phình, PR nhiễu | `.gitignore` |
| Macro tự viết trùng tên macro package | dbt lấy nhầm bản, không cảnh báo | Đặt tiền tố công ty |
| Cài `dbt_expectations` chỉ để dùng 1 test | thêm vài trăm macro vào mọi lần parse | Tự viết generic test 5 dòng |
| Version range quá rộng (`>=1.0.0`) | major mới là gãy | Luôn chặn trên `<2.0.0` |

## Kiểm chứng

```bash
dbt deps                                   # cài đúng phiên bản trong lock
dbt ls --resource-type test | wc -l        # test của package đã được nhận diện
cat package-lock.yml                       # phiên bản đang thật sự dùng
ls dbt_packages/                           # mã đã tải về
```

## Related Topics

- [Macro, Jinja và package](../reference/macros-jinja-packages.md) — phần lý thuyết
- [Viết macro và dùng Jinja logic](macro-va-jinja.md) — khi nào tự viết thay vì cài
- [Triển khai test trong dbt](implementing-tests.md) — test của package nằm ở tầng nào
- [Bài tập trung bình](../tutorials/bt-02-trung-binh.md) — bài T4
