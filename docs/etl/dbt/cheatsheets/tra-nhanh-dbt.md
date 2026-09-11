---
title: Tra nhanh dbt — CLI, Jinja, YAML, materialization
sidebar_position: 1
description: "Bảng tra khi đang gõ lệnh: selector, cú pháp YAML, macro Jinja hay quên, và bảng chọn materialization theo bốn câu hỏi."
tags: [dbt, cheatsheet, cli, jinja, yaml, selector, materialization]
domain: data-engineering
category: technology
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-11
---

# Tra nhanh dbt

> Trang này để **tra khi đang làm**, không để học lần đầu. Chưa hiểu khái niệm thì đọc
> [`reference/`](../reference/index.md) trước.
>
> Mọi lệnh dưới đây chạy trên **dbt-core 1.12.0**. Trên lab của kho này thêm
> `--profiles-dir .` vào mọi lệnh.

## 1. Lệnh CLI

### Lệnh chạy thật

| Lệnh | Làm gì | Ghi chú |
|---|---|---|
| `dbt build` | seed → snapshot → run → test **xen kẽ theo DAG** | **Dùng cái này ở production** |
| `dbt run` | chỉ build model | |
| `dbt test` | chỉ chạy test | |
| `dbt seed` | nạp CSV trong `seeds/` thành bảng | Chỉ cho bảng tra cứu nhỏ |
| `dbt snapshot` | ghi lịch sử SCD2 | **Chạy trước `run`** |
| `dbt source freshness` | kiểm độ tươi của nguồn | Chỉ ở job production |
| `dbt compile` | render Jinja, **không** chạy | Đọc `target/compiled/` |
| `dbt parse` | chỉ parse, sinh `manifest.json` | Rẻ nhất — đặt đầu CI |

`dbt build` khác `dbt run && dbt test` ở chỗ: model A fail test thì mọi thứ **phía sau
A bị skip**, thay vì build xong 400 model bằng dữ liệu hỏng rồi mới biết.

### Lệnh phụ trợ

| Lệnh | Làm gì |
|---|---|
| `dbt debug` | kiểm cấu hình + kết nối |
| `dbt deps` | cài package trong `packages.yml` |
| `dbt deps --upgrade` | cập nhật `package-lock.yml` — hành động **cố ý** |
| `dbt ls` | liệt kê resource theo selector |
| `dbt docs generate` | sinh `index.html` + `catalog.json` |
| `dbt docs serve` | mở trang docs tại `localhost:8080` |
| `dbt clean` | xoá `target/`, `dbt_packages/` |
| `dbt run-operation <macro>` | chạy macro độc lập |
| `dbt retry` | chạy lại đúng phần fail lần trước |

### Cờ hay dùng

| Cờ | Tác dụng |
|---|---|
| `-s` / `--select` | chọn resource (xem §2) |
| `--exclude` | loại trừ |
| `-t` / `--target` | chọn target trong `profiles.yml` |
| `--full-refresh` | build lại incremental từ đầu |
| `--fail-fast` | dừng ngay ở lỗi đầu |
| `--store-failures` | lưu dòng fail vào `<schema>_dbt_test__audit` |
| `--vars '{key: value}'` | truyền biến cho `{{ var() }}` |
| `--threads N` | ghi đè số luồng |
| `--defer --state <dir>` | `ref()` tới model chưa build thì trỏ về production |
| `--empty` | build cấu trúc với 0 dòng — kiểm cột rất nhanh |

## 2. Selector — chọn cái gì để chạy

| Cú pháp | Chọn |
|---|---|
| `stg_don_hang` | đúng model đó |
| `stg_don_hang+` | model đó **và mọi thứ phía sau** |
| `+mart_doanh_thu` | model đó **và mọi thứ phía trước** |
| `+mart_doanh_thu+` | cả hai phía |
| `2+mart_doanh_thu` | phía trước, **giới hạn 2 bậc** |
| `@stg_don_hang` | model phía sau + mọi phụ thuộc của chúng |
| `path:models/marts` | mọi thứ trong thư mục |
| `tag:tai_chinh` | theo tag |
| `source:erp+` | mọi model phía sau một source |
| `config.materialized:incremental` | theo config |
| `resource_type:snapshot` | theo loại resource |
| `state:modified+` | đã đổi so với `--state`, và phía sau |
| `state:new` | resource mới thêm |
| `result:error+` | fail lần trước, và phía sau |

Ghép: **cách nhau bằng dấu cách = HOẶC**, bằng dấu phẩy = **VÀ**.

```bash
dbt build -s tag:tai_chinh tag:hang_ngay          # HOẶC
dbt build -s tag:tai_chinh,config.materialized:table   # VÀ
dbt build -s state:modified+ --exclude resource_type:snapshot
```

## 3. Jinja — thứ hay quên

### Biến có sẵn

| Biến | Là gì |
|---|---|
| `{{ this }}` | model đang build (dùng trong incremental) |
| `{{ target.name }}` | `dev` / `prod` |
| `{{ target.schema }}` · `{{ target.database }}` | nơi đang ghi |
| `{{ run_started_at }}` | thời điểm bắt đầu lần chạy |
| `{{ invocation_id }}` | id của lần chạy |
| `{{ var('x', mac_dinh) }}` | biến từ `dbt_project.yml` / `--vars` |
| `{{ env_var('X') }}` | biến môi trường — **chỉ dùng ở `profiles.yml`** |
| `{{ is_incremental() }}` | true khi chạy tăng dần |
| `{{ execute }}` | false ở lượt parse đầu — guard cho `run_query` |

### Cú pháp

| Viết | Nghĩa |
|---|---|
| `{{ ... }}` | in ra chữ |
| `{% ... %}` | câu lệnh (if/for/set/macro) |
| `{# ... #}` | chú thích, **không** lọt vào SQL |
| `{%- ... -%}` | nuốt khoảng trắng phía có dấu `-` |
| `~` | nối chuỗi (không phải `+`) |
| `loop.index` · `loop.last` | trong `{% for %}` |
| `| lower` · `| replace('a','b')` · `| join(',')` | filter |

### Mẫu hay dùng

```sql
-- Vòng lặp sinh cột
{%- for n in danh_sach %}
    sum(case when nhom = '{{ n }}' then tien else 0 end) as nhom_{{ loop.index }}
    {%- if not loop.last %},{% endif %}
{%- endfor %}

-- Giới hạn dữ liệu ở dev
{% if target.name == 'dev' %} where ngay >= current_date - 7 {% endif %}

-- Lấy danh sách giá trị lúc biên dịch
{%- set nhom = dbt_utils.get_column_values(ref('hang_hoa'), 'nhom') -%}

-- Chạy query lúc biên dịch — LUÔN có guard
{% if execute %}{% set kq = run_query('select 1') %}{% endif %}
```

### Macro `dbt_utils` đáng nhớ

| Macro | Cho cái gì |
|---|---|
| `dbt_utils.generate_surrogate_key([...])` | khoá thay thế ổn định (md5, có `coalesce`) |
| `dbt_utils.star(from=ref('x'), except=[...])` | chọn hết trừ vài cột |
| `dbt_utils.get_column_values(ref('x'), 'cot')` | danh sách giá trị lúc biên dịch |
| `dbt_utils.date_spine(...)` | sinh dãy ngày cho `dim_date` |
| `dbt_utils.union_relations([...])` | gộp nhiều bảng khác cột |
| `dbt_utils.pivot(...)` / `unpivot(...)` | xoay bảng |

## 4. YAML mẫu

### Model + test + doc

```yaml
version: 2

models:
  - name: mart_doanh_thu_ngay
    description: "Doanh thu và số đơn theo ngày đặt. Grain: một dòng một ngày."
    config:
      materialized: table
      tags: ['hang_ngay', 'tai_chinh']
      contract: {enforced: true}
    meta:
      owner: "data-team@cong-ty.vn"
    columns:
      - name: ngay
        description: "Ngày đặt đơn."
        data_type: date
        constraints: [{type: not_null}]
        tests: [unique, not_null]
      - name: doanh_thu
        description: "Tổng thành tiền, chưa gồm phí ship."
        tests:
          - khong_am                      # generic test tự viết
    tests:                                # test cấp bảng
      - dbt_utils.unique_combination_of_columns:
          arguments:
            combination_of_columns: [ngay]
```

> **dbt 1.12:** tham số của generic test khai dưới khoá `arguments:`. Cú pháp cũ (tham
> số nằm thẳng dưới tên test) vẫn chạy nhưng in cảnh báo
> `MissingArgumentsPropertyInGenericTestDeprecation`.

### Bốn generic test có sẵn

```yaml
columns:
  - name: don_hang_id
    tests:
      - unique
      - not_null
      - accepted_values:
          arguments:
            values: ['moi', 'dang_giao', 'hoan_thanh']
      - relationships:
          arguments:
            to: ref('stg_don_hang')
            field: don_hang_id
```

Chỉnh mức độ và ngưỡng:

```yaml
      - not_null:
          config:
            severity: warn        # error | warn
            error_if: ">100"
            warn_if:  ">0"
            where: "ngay >= current_date - 30"   # chỉ kiểm dữ liệu gần đây
```

### Source

```yaml
sources:
  - name: erp
    database: RAW
    schema: erp_prod
    tables:
      - name: orders
        identifier: ORDERS_V2          # tên thật nếu khác `name`
        loaded_at_field: cast(_loaded_at as timestamp)
        freshness:
          warn_after:  {count: 1,  period: hour}
          error_after: {count: 26, period: hour}
```

### Snapshot (cú pháp YAML, dbt 1.9+)

```yaml
snapshots:
  - name: snap_khach_hang
    relation: source('erp', 'customers')
    config:
      unique_key: khach_id
      strategy: check                  # hoặc timestamp + updated_at: cot
      check_cols: [khu_vuc, hang]
```

### Unit test

```yaml
unit_tests:
  - name: gop_dung_ngay
    model: mart_doanh_thu_ngay
    given:
      - input: ref('stg_don_hang')
        rows: [{don_hang_id: 'D1', ngay_dat: '2026-01-01'}]
      - input: ref('stg_don_hang_chi_tiet')
        rows: [{don_hang_id: 'D1', dong: 1, thanh_tien: 100}]
    expect:
      rows: [{ngay: '2026-01-01', so_don: 1, doanh_thu: 100}]
```

### `dbt_project.yml` — cấu hình theo thư mục

```yaml
models:
  ten_project:                     # PHẢI khớp `name:` của project
    +materialized: view
    +on_schema_change: append_new_columns
    staging:
      +schema: staging
    marts:
      +schema: marts
      +materialized: table
      +tags: ['marts']
```

Thứ tự ưu tiên khi cùng một config khai ở nhiều chỗ:

```text i18n-prose
config() trong model  >  schema.yml  >  dbt_project.yml
```

## 5. Materialization — chọn cái nào

| | `view` | `table` | `incremental` | `ephemeral` |
|---|---|---|---|---|
| dbt tạo ra | `CREATE VIEW` | `CREATE TABLE AS` | lần đầu table, sau đó merge/insert | **không gì cả** — nhét thành CTE |
| Thời gian build | ~0 | theo kích thước | theo phần mới | 0 |
| Thời gian query | tính lại mỗi lần | nhanh | nhanh | tính theo model cha |
| Tốn chỗ | không | có | có | không |
| Độ phức tạp | thấp | thấp | **cao** | thấp |
| Query trực tiếp được | có | có | có | **không** |
| Hợp với | staging | marts nhỏ/vừa | fact lớn | bước trung gian |

Bốn câu hỏi **trước khi** gõ `materialized='incremental'`:

1. Cột nào cho biết "dòng này mới"? Nó có đáng tin không?
2. Nguồn có sửa lùi quá khứ không? Muộn nhất bao lâu? → độ rộng cửa sổ nhìn lại
3. Khoá tự nhiên của grain là gì? → `unique_key`
4. Chạy lại giữa chừng có nhân đôi không?

Trả lời được cả bốn thì dùng. Không thì dùng `table` — chậm mà đúng.

### Config của incremental

```sql
{{ config(
    materialized='incremental',
    incremental_strategy='merge',        -- append | merge | delete+insert | insert_overwrite
    unique_key=['don_hang_id', 'dong'],
    on_schema_change='append_new_columns'
) }}

{% if is_incremental() %}
where ngay >= (select coalesce(max(ngay), date '1900-01-01') - interval 7 day from {{ this }})
{% endif %}
```

| `on_schema_change` | Cột mới trong model thì… |
|---|---|
| `ignore` (**mặc định**) | bị bỏ **im lặng** |
| `append_new_columns` | thêm vào, dòng cũ `null` |
| `sync_all_columns` | thêm và **xoá** theo model |
| `fail` | dừng, báo lỗi |

## 6. Quy ước đặt tên

| Tầng | Tiền tố | Một model = | Materialization |
|---|---|---|---|
| staging | `stg_` | **đúng một** bảng nguồn | `view` |
| intermediate | `int_` | một bước biến đổi có tên | `ephemeral` |
| marts | `dim_` | một thực thể | `table` |
| marts | `fct_` | một sự kiện, **giữ nguyên grain** | `incremental` |
| marts | `mart_` | một báo cáo, **đã `group by`** | `table` |

Ba luật, cả ba grep được:

```bash
grep -rn --include='*.sql' -iE '\bjoin\b' models/staging/          # staging không join
grep -rn --include='*.sql' 'source(' models/ | grep -v '^models/staging/'   # chỉ staging gọi source()
grep -rn --include='*.sql' 'group by' models/marts/fct_*.sql       # fct_ không được gộp
```

| Thứ khác | Quy ước |
|---|---|
| Tên file = tên model | `stg_don_hang.sql` → `ref('stg_don_hang')` |
| Tên model | **toàn cục** — không được trùng giữa hai thư mục |
| Khoá nghiệp vụ | `<thực thể>_id` |
| Khoá thay thế | `<thực thể>_sk` |
| Cột boolean | `la_*` / `co_*` |
| Cột ngày | `ngay_*`; timestamp `*_luc` |
| Cột kỹ thuật | tiền tố `_`: `_nap_luc`, `_batch_id` |
| Số thứ tự trong tên file | **không** — dbt xếp theo DAG |

## 7. Thư mục `target/`

| File | Là gì | Dùng khi |
|---|---|---|
| `compiled/` | SQL sau khi render Jinja | Debug logic — dán thẳng vào warehouse |
| `run/` | SQL đã bọc DDL | Xem dbt tạo object kiểu gì |
| `manifest.json` | **ý định** — mọi thứ đã khai | `state:modified`, truy vấn metadata |
| `catalog.json` | **hiện thực** — cột/kiểu thật trong warehouse | Đối chiếu khai báo với thực tế |
| `run_results.json` | thời gian và trạng thái từng node | Tìm model chậm |
| `index.html` | trang docs tĩnh | Đem host ở đâu cũng được |

```bash
# 5 node chậm nhất
python -c "
import json;r=json.load(open('target/run_results.json'))
[print(f\"{t['execution_time']:8.3f}s  {t['unique_id']}\")
 for t in sorted(r['results'],key=lambda x:-x['execution_time'])[:5]]"
```

## 8. Bảy lỗi im lặng — không báo gì, chỉ làm sai

| Lỗi | Hậu quả | Phát hiện bằng |
|---|---|---|
| Viết cứng tên bảng thay `ref()` | DAG mất cạnh, lineage nói dối | `dbt ls --select +model` thiếu node |
| Khoá dưới `models:` không khớp `name:` project | cấu hình không áp | `dbt ls` xem schema |
| `on_schema_change: ignore` | cột mới biến mất | `describe <bảng>` |
| Incremental không xử lý sửa muộn | **số lệch**, dòng vẫn khớp | singular test đối chiếu tổng |
| Join quên `coalesce(dbt_valid_to, ...)` | mất dòng hiện hành | as-was ra ít hơn as-is |
| `unique` trên bảng có grain tổ hợp | test sai, không phải dữ liệu sai | `unique_combination_of_columns` |
| Không có `--state` trong CI | CI chạy cả project | đếm node CI ≈ tổng số model |

## Related Topics

- [dbt — bản đồ khái niệm](../index.md)
- [Tài liệu dbt](../reference/index.md) — phần giải thích vì sao
- [Kỹ năng dbt](../skills/index.md) — hướng dẫn từng bước
- [Bài tập](../tutorials/index.md) — chạy thật, có đáp số
