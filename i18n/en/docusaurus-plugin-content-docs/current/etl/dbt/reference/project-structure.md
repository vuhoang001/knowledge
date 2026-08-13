---
title: Cấu trúc một dbt project
i18n_status: untranslated
sidebar_position: 2
description: dbt_project.yml, profiles.yml, target/compiled — thư mục nào chứa gì.
tags: [dbt, configuration, project-structure]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: beginner
verified_at:
updated: 2026-07-31
---
# Cấu trúc một dbt project

> **Chốt (cần kiểm chứng):** `dbt_project.yml` mô tả *dự án*, `profiles.yml` mô tả
> *chỗ kết nối tới*. Tách đôi vì dự án đi vào git, còn thông tin kết nối thì không.


## Thư mục nào bắt buộc

| Thư mục / file | Bắt buộc | Chứa gì |
|---|---|---|
| `dbt_project.yml` | ✅ | Thứ định nghĩa "đây là một dbt project" |
| `models/` | ✅ | Các file `.sql` — đơn vị cơ bản |
| `profiles.yml` | ✅ (ngoài project) | Thông tin **kết nối**. Xem mục dưới |
| `seeds/` | tuỳ | CSV nhỏ nạp thành bảng |
| `tests/` | tuỳ | Singular test |
| `macros/` | tuỳ | Macro và generic test tự viết |
| `snapshots/` | tuỳ | SCD Type 2 |
| `analyses/` | tuỳ | SQL biên dịch được nhưng **không** tạo bảng |
| `target/` | sinh ra | Sản phẩm biên dịch — **gitignore** |
| `dbt_packages/` | sinh ra | Package tải bằng `dbt deps` — **gitignore** |
| `logs/` | sinh ra | Log — **gitignore** |

Giữ nguyên tên mặc định. Mọi tài liệu và mọi câu trả lời trên mạng đều giả định bố cục
này; đổi tên là tự tách mình khỏi cộng đồng.

## `dbt_project.yml` — config theo tầng

```yaml
name: scratch
version: '1.0'
profile: scratch          # trỏ tới tên profile trong profiles.yml

model-paths: ['models']
seed-paths: ['seeds']
macro-paths: ['macros']
snapshot-paths: ['snapshots']

clean-targets: ['target', 'dbt_packages']

models:
  scratch:                # tên project
    +materialized: view   # mặc định cho MỌI model
    marts:                # thư mục models/marts/
      +materialized: table
```

Config **thừa kế theo thư mục**: khai ở `scratch:` áp cho tất cả, khai ở `marts:` đè lên
cho riêng thư mục đó. Dấu `+` phân biệt config của dbt với tên thư mục con.

Thứ tự thắng: `config()` trong model > thư mục con > project. Có bằng chứng ở
[Model và `ref()`](models-and-ref.md).

## `profiles.yml` — và vì sao KHÔNG commit

```yaml
scratch:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: scratch.duckdb
      schema: main
```

**File này chứa thông tin kết nối** — host, user, password, token. Commit là rò rỉ.

Hai chỗ đặt:

| Cách | Khi nào |
|---|---|
| `~/.dbt/profiles.yml` | Mặc định. Mỗi người một bản, nằm ngoài repo |
| `--profiles-dir .` | Lab hoặc CI — file nằm cạnh project, và **phải** trong `.gitignore` |

Trong production, giá trị nhạy cảm khai bằng `{{ env_var('DBT_PASSWORD') }}` để file chỉ
chứa *tên biến*, không chứa giá trị.

Kiểm cấu hình bằng `dbt debug`:

```text
Using profiles.yml file at ./profiles.yml
Using dbt_project.yml file at .../dbt_project.yml
adapter type: duckdb
adapter version: 1.10.1
  profiles.yml file [OK found and valid]
  dbt_project.yml file [OK found and valid]
Connection test: [OK connection ok]
```

Chạy `dbt debug` **trước** khi nghi ngờ bất cứ thứ gì khác. Nó tách bạch "sai kết nối"
với "sai SQL" — hai loại lỗi hay bị lẫn.

## `target/` — `compiled/` khác `run/` chỗ nào

Đây là phân biệt quan trọng nhất khi debug.

```text
target/
├── compiled/          SQL sau khi Jinja render — CHỈ câu SELECT
├── run/               SQL đó đã bọc DDL — thứ thật sự gửi đi
├── manifest.json      dbt BIẾT gì về project (756 KB)
├── catalog.json       warehouse THẬT SỰ có gì (sinh bởi `dbt docs generate`)
├── run_results.json   lần chạy vừa rồi: node nào, bao lâu, pass hay fail
└── partial_parse.msgpack   cache parse, để lần sau khởi động nhanh
```

Cùng một model `stg_hang_hoa`:

```sql
-- target/compiled/... : chỉ SELECT
select * from "scratch"."main"."hang_hoa"
```

```sql
-- target/run/... : có DDL bọc ngoài
create view "scratch"."main"."stg_hang_hoa__dbt_tmp" as (
    select * from "scratch"."main"."hang_hoa"
  );
```

**Debug logic SQL → đọc `compiled/`. Debug lỗi DDL/quyền → đọc `run/`.**

## `.gitignore` tối thiểu

```gitignore
target/
dbt_packages/
logs/
profiles.yml          # nếu để cạnh project
*.duckdb
```

Ba thư mục đầu **tái tạo được**: `dbt deps` + `dbt run` là có lại. Commit chúng chỉ làm
repo phình và tạo conflict vô nghĩa.

## Related Topics

- [Mục lục dbt](index.md)
- [dbt là gì](what-is-dbt.md) §2 — vì sao `target/compiled/` là chỗ quan trọng nhất
