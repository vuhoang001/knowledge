---
title: Khởi tạo và cấu hình một dbt project
sidebar_position: 1
description: "Từ pip install tới dbt debug xanh — bốn file quyết định mọi thứ, và ba lỗi kết nối chiếm gần hết thời gian của người mới."
tags: [dbt, setup, profiles, dbt-project-yml, duckdb]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Khởi tạo và cấu hình một dbt project

> **Chốt:** một dbt project chạy được cần đúng **hai** file: `dbt_project.yml` (project
> này là gì) và `profiles.yml` (chạy SQL ở đâu). Mọi lỗi "không chạy được" của người
> mới đều nằm ở file thứ hai.

## Mục tiêu học

Sau bài này bạn phải **tự dựng được** một project từ số 0 tới `dbt debug` báo
`All checks passed!`, và giải thích được từng dòng trong hai file cấu hình — không
copy-paste.

## Bước 1 — Cài adapter, không cài dbt-core một mình

dbt Core không biết nói chuyện với warehouse nào cả. Phần biết nói nằm ở **adapter**.

```bash
python -m venv .venv
source .venv/bin/activate
pip install dbt-core dbt-duckdb      # đổi dbt-duckdb thành dbt-snowflake / dbt-bigquery / dbt-postgres
```

Kiểm ngay:

```bash
dbt --version
```

Output thật trên lab của kho này:

```text
Core:
  - installed: 1.12.0
  - latest:    1.12.4 - Update available!

Plugins:
  - duckdb: 1.10.1 - Update available!
```

Hai số này phải **tương thích nhau**. Adapter cũ hơn core vài minor version thường vẫn
chạy; lệch một major là gãy khi parse.

## Bước 2 — `dbt init` hay tự tạo tay?

`dbt init <ten>` sinh sẵn khung và hỏi thông tin kết nối. Tiện, nhưng nó giấu mất đúng
thứ bạn cần hiểu. Lần đầu nên tự tạo tay bốn thư mục:

```bash
mkdir -p dbt_lab/{models,seeds,tests,macros,snapshots}
cd dbt_lab
```

## Bước 3 — `dbt_project.yml`: project này là gì

```yaml
name: dbt_lab                 # tên project — dùng làm khoá trong khối models: bên dưới
version: '1.0'
profile: dbt_lab              # TRỎ TỚI khối cùng tên trong profiles.yml

model-paths: ['models']
seed-paths: ['seeds']
test-paths: ['tests']
snapshot-paths: ['snapshots']
macro-paths: ['macros']

clean-targets: ['target', 'dbt_packages']   # thứ `dbt clean` được phép xoá

models:
  dbt_lab:                    # phải khớp `name:` ở trên, không phải tên thư mục
    +materialized: view       # mặc định cho toàn project
    staging:
      +schema: staging        # áp cho mọi model trong models/staging/
    marts:
      +schema: marts
      +materialized: table
```

Hai chỗ hay sai:

- **`profile:` trỏ sang `profiles.yml`, không phải tên project.** Trùng tên chỉ là
  thói quen, không bắt buộc.
- **Khoá dưới `models:` là `name:` của project**, không phải tên thư mục `models/`.
  Gõ nhầm thì cấu hình im lặng không áp — không có lỗi nào báo.

## Bước 4 — `profiles.yml`: chạy SQL ở đâu

dbt tìm file này ở `~/.dbt/profiles.yml`. Để ngay trong project cũng được, khi đó phải
thêm `--profiles-dir .` vào mọi lệnh.

```yaml
dbt_lab:                      # khớp `profile:` trong dbt_project.yml
  target: dev                 # target mặc định khi không truyền --target
  outputs:
    dev:
      type: duckdb
      path: lab.duckdb
      threads: 4
```

Bản Snowflake để so sánh — chú ý **không có mật khẩu trong file**:

```yaml
cong_ty:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      password: "{{ env_var('SNOWFLAKE_PASSWORD') }}"
      role: TRANSFORMER
      warehouse: WH_DBT_DEV
      database: ANALYTICS_DEV
      schema: dbt_hoang        # schema cá nhân — mỗi dev một schema riêng
      threads: 8
    prod:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER_PROD') }}"
      password: "{{ env_var('SNOWFLAKE_PASSWORD_PROD') }}"
      role: TRANSFORMER_PROD
      warehouse: WH_DBT_PROD
      database: ANALYTICS
      schema: analytics
      threads: 16
```

`profiles.yml` **là file duy nhất trong dbt được render Jinja trước khi parse** — đó là
lý do `env_var()` dùng được ở đây. Tên biến môi trường thì bịa được, **giá trị thì
không**: `account`, `warehouse`, `role`, `database` phải lấy từ người quản trị
warehouse hoặc từ output lệnh thật, không đoán. Đây đúng chỗ đã mất một buổi trong
[case study tên catalog](../case-studies/ai-sinh-sai-ten-catalog-trino.md).

## Bước 5 — `dbt debug`, và chỉ tin khi nó xanh

```bash
dbt debug --profiles-dir .
```

Output thật:

```text
  dbt_project.yml file [OK found and valid]
Required dependencies:
 - git [OK found]

Connection:
  database: lab
  schema: main
  path: lab.duckdb
  threads: 4
Registered adapter: duckdb=1.10.1
  Connection test: [OK connection ok]

All checks passed!
```

Ba dòng đáng đọc kỹ: `database`, `schema`, `Connection test`. Hai dòng đầu là **nơi
model của bạn sẽ hạ cánh** — nhìn nhầm chỗ này là sau đó đi tìm bảng ở database khác.

## Bước 6 — `.gitignore`

```gitignore
target/
dbt_packages/
logs/
*.duckdb
.venv/
```

`target/` chứa SQL đã biên dịch và `manifest.json` — sinh lại được, đừng commit.
Commit vào là mỗi PR có 400 file thay đổi.

## Lỗi thường gặp

| Lỗi | Thông báo điển hình | Nguyên nhân thật |
|---|---|---|
| `Could not find profile named 'x'` | dbt không tìm thấy khối trong `profiles.yml` | `profile:` trong `dbt_project.yml` khác tên khối trong `profiles.yml`, hoặc quên `--profiles-dir .` |
| `Credentials in profile "x", target "dev" invalid` | thiếu/sai trường của adapter | Thiếu `account`/`warehouse`; hoặc `env_var()` chưa export |
| Model chạy xong mà không tìm thấy bảng | không có lỗi nào | Nhìn nhầm `database`/`schema` trong `dbt debug` |
| Cấu hình dưới `models:` không có tác dụng | im lặng | Khoá con không khớp `name:` của project |
| `Runtime Error ... database is locked` | DuckDB | Có process khác (một `python` đang mở `lab.duckdb`) giữ file. Đóng nó |
| `dbt: command not found` sau khi mở terminal mới | — | Quên `source .venv/bin/activate` |

> **Bẫy im lặng nguy hiểm nhất** là dòng thứ tư: gõ sai khoá dưới `models:` thì dbt
> **không báo gì**, chỉ là mọi model rơi về mặc định. Kiểm bằng `dbt ls` xem schema có
> đúng không, đừng kiểm bằng mắt.

## Kiểm chứng đã xong

```bash
dbt debug --profiles-dir .     # All checks passed!
dbt ls --profiles-dir .        # liệt kê được resource (dù chưa có model nào)
dbt parse --profiles-dir .     # parse sạch, sinh target/manifest.json
```

Ba lệnh xanh thì phần cấu hình xong. Từ đây trở đi mọi lỗi là lỗi SQL của bạn, không
phải lỗi môi trường — tách được hai loại này là nửa công việc debug.

## Related Topics

- [Cấu trúc một dbt project](../reference/project-structure.md) — thư mục nào chứa gì
- [Viết model đầu tiên với `ref()`](model-dau-tien-voi-ref.md) — bước tiếp theo
- [dbt Core và dbt Cloud](../reference/dbt-core-vs-cloud.md) — bản Cloud lo giúp bước 4
- [Bài tập cơ bản](../tutorials/bt-01-co-ban.md) — bài 1 chạy đúng quy trình này
