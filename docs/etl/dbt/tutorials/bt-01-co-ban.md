---
title: "Bài tập dbt — Cơ bản"
sidebar_position: 10
description: "Năm bài từ dbt debug tới mart đầu tiên: project chạy được, ref(), source, generic test, materialization. Mỗi bài có đáp số phải ra."
tags: [dbt, bai-tap, tutorial, ref, source, test, duckdb]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Bài tập dbt — Cơ bản

> **Chốt:** năm bài này dựng đúng một thứ — **một project chạy được, có DAG thật, có
> test thật**. Chưa qua được bộ này thì mọi thứ ở bộ Trung bình chỉ là đọc.

## Cách dùng

Mỗi bài có bốn phần: **Đề** → **Gợi ý** → **Đáp số phải ra** → **Lời giải** giấu trong
`<details>`. Viết code của bạn trước, so số, trùng rồi mới mở lời giải để đối chiếu
cách làm. **Mở lời giải trước khi thử là đọc, không phải luyện.**

## Dữ liệu dùng chung

Lab: `~/Documents/learn-lab/dbt` — venv riêng, `dbt-duckdb`, seed sẵn.

```bash
cd ~/Documents/learn-lab/dbt
./.venv/bin/dbt deps --profiles-dir .
./.venv/bin/dbt seed --profiles-dir .
```

Bốn bảng dùng nhiều nhất trong bộ này:

| Bảng | Grain | Số dòng |
|---|---|---|
| `don_hang` | một đơn hàng | 10 |
| `don_hang_chi_tiet` | một dòng hàng trong một đơn | 15 |
| `khach_hang` | một khách hàng | 4 |
| `hang_hoa` | một mặt hàng | 4 |

Ba số mốc không đổi trong cả ba bộ bài:

```text i18n-prose
10 đơn · 15 dòng hàng · doanh thu 10.215.000
```

Mọi output trong file này chạy trên **dbt-core 1.12.0 + dbt-duckdb 1.10.1**. Phiên bản
khác có thể đổi định dạng dòng log; con số thì không.

---

## Bài B1 — Dựng project từ số 0 tới `dbt debug` xanh

**Đề:** tạo một dbt project mới tên `bt_co_ban` trong thư mục tạm, dùng DuckDB, file
`profiles.yml` để ngay trong project. Mục tiêu: `dbt debug` báo `All checks passed!`.

Không được dùng `dbt init` — tự viết hai file cấu hình.

**Gợi ý:** đúng hai file quyết định mọi thứ. `profile:` trong file thứ nhất phải khớp
tên khối trong file thứ hai.

**Đáp số phải ra:**

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

<details>
<summary>Lời giải</summary>

```bash
mkdir -p bt_co_ban/{models,seeds,tests,macros,snapshots} && cd bt_co_ban
```

```yaml
# dbt_project.yml
name: bt_co_ban
version: '1.0'
profile: bt_co_ban

model-paths: ['models']
seed-paths: ['seeds']
test-paths: ['tests']
snapshot-paths: ['snapshots']
macro-paths: ['macros']
clean-targets: ['target', 'dbt_packages']

models:
  bt_co_ban:
    +materialized: view
    staging:
      +schema: staging
    marts:
      +schema: marts
```

```yaml
# profiles.yml
bt_co_ban:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: lab.duckdb
      threads: 4
```

```bash
dbt debug --profiles-dir .
```

**Ba chỗ sai hay gặp:**

1. `profile: bt_co_ban` trong `dbt_project.yml` không khớp khoá `bt_co_ban:` trong
   `profiles.yml` → `Could not find profile named ...`.
2. Quên `--profiles-dir .` → dbt đi tìm `~/.dbt/profiles.yml`.
3. Khoá dưới `models:` gõ thành `staging:` ngay cấp một (thiếu tầng tên project) →
   **không lỗi nào báo**, cấu hình im lặng không áp.

Kiểm chỗ số 3 bằng `dbt ls` sau khi có model: schema phải là `main_staging`, không
phải `main`.

</details>

---

## Bài B2 — Model đầu tiên, và đọc SQL dbt thật sự gửi đi

**Đề:** viết `models/staging/stg_don_hang.sql` đọc từ seed `don_hang`, ép `ngay_dat`,
`ngay_giao`, `ngay_nhan` về `date` và `phi_ship` về `bigint`. Sau đó **mở file SQL đã
biên dịch** và chỉ ra `{{ ref('don_hang') }}` đã biến thành chuỗi gì.

**Gợi ý:** model là một câu `SELECT` — không `create table`, không dấu `;`.

**Đáp số phải ra:** trong `target/compiled/`, dòng `from` phải là đường dẫn ba phần đầy
đủ:

```sql
with nguon as (
    select * from "lab"."main"."don_hang"
)
```

<details>
<summary>Lời giải</summary>

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

```bash
dbt run -s stg_don_hang --profiles-dir .
cat target/compiled/bt_co_ban/models/staging/stg_don_hang.sql
```

**Điều phải rút ra:** `ref()` không phải cách viết tắt tên bảng. Nó biên dịch ra đường
dẫn **đúng môi trường hiện tại** — đổi `--target prod` thì cùng file này ra đường dẫn
khác. Đó là lý do không bao giờ viết cứng tên schema trong model.

Phân biệt hai thư mục: `target/compiled/` là SQL sau khi render Jinja (copy dán vào
warehouse chạy được ngay); `target/run/` là SQL đã bọc `create view as ...`.

</details>

---

## Bài B3 — Model thứ hai và cột dẫn xuất

**Đề:** viết `stg_don_hang_chi_tiet` với một cột dẫn xuất `thanh_tien = so_luong *
don_gia`. Ép `so_luong`, `don_gia` về `bigint` trước khi nhân.

Sau đó trả lời bằng SQL: bảng có bao nhiêu dòng, tổng `thanh_tien` là bao nhiêu.

**Gợi ý:** phép nhân này phải nằm **đúng một chỗ** trong cả project. Đặt nó ở tầng
staging là để các mart sau không ai phải viết lại.

**Đáp số phải ra:**

```text
┌─────────┬───────────┐
│ so_dong │ doanh_thu │
├─────────┼───────────┤
│      15 │  10215000 │
└─────────┴───────────┘
```

<details>
<summary>Lời giải</summary>

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

**Vì sao phải `cast` trước khi nhân:** `so_luong` và `don_gia` đọc từ CSV ra là
`INTEGER` — tức 32 bit (kiểm bằng `describe main.don_hang_chi_tiet`). Với dữ liệu lab thì nhân xong vẫn nhỏ,
không tràn — nhưng `int32` chỉ chứa tới ~2,1 tỷ, mà tiền VND chạm ngưỡng đó rất sớm:
một đơn 3 tỷ đồng là tràn. DuckDB tự nới kết quả lên `int128`; warehouse khác thì không
nhất thiết. Ép kiểu ở staging là chỗ rẻ nhất để phòng — **chưa chạy thử trên Postgres,
đây là suy luận từ giới hạn kiểu, không phải output quan sát được.**

**Vì sao `thanh_tien` thuộc staging chứ không thuộc mart:** nó là phép tính *hiển
nhiên* từ hai cột cùng dòng, không phải luật nghiệp vụ. Ranh giới: nếu phải hỏi ai đó
"quy tắc là gì" thì nó thuộc mart; nếu nhìn là biết thì thuộc staging.

</details>

---

## Bài B4 — Mart đầu tiên, và đọc thứ tự chạy

**Đề:** viết `models/marts/mart_doanh_thu_ngay.sql` materialized thành `table`, gộp
doanh thu và số đơn theo `ngay_dat`. Chạy `dbt run` **toàn bộ** và chỉ ra trong output
chỗ nào chứng minh dbt tự biết thứ tự.

**Gợi ý:** không ai khai thứ tự ở đâu cả. Nó suy ra từ `ref()`.

**Đáp số phải ra:**

```text
1 of 3 START sql view model main_staging.stg_don_hang .......................... [RUN]
2 of 3 START sql view model main_staging.stg_don_hang_chi_tiet ................. [RUN]
1 of 3 OK created sql view model main_staging.stg_don_hang ..................... [OK in 0.07s]
2 of 3 OK created sql view model main_staging.stg_don_hang_chi_tiet ............ [OK in 0.07s]
3 of 3 START sql table model main_marts.mart_doanh_thu_ngay .................... [RUN]
3 of 3 OK created sql table model main_marts.mart_doanh_thu_ngay ............... [OK in 0.04s]
Done. PASS=3 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=3
```

```text
┌────────────┬────────┬───────────┐
│    ngay    │ so_don │ doanh_thu │
├────────────┼────────┼───────────┤
│ 2026-07-01 │      2 │   1350000 │
│ 2026-07-02 │      2 │   3150000 │
│ 2026-07-03 │      2 │   4200000 │
│ 2026-07-04 │      2 │   1095000 │
│ 2026-07-05 │      2 │    420000 │
└────────────┴────────┴───────────┘
```

<details>
<summary>Lời giải</summary>

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

**Chỗ chứng minh dbt tự biết thứ tự:** hai model staging cùng `START` một nhịp (song
song, chúng không phụ thuộc nhau), còn `mart_doanh_thu_ngay` chỉ `START` sau khi cả hai
báo `OK`.

**Bẫy `count(distinct)`:** sau khi join, mỗi đơn xuất hiện nhiều dòng (theo số dòng
hàng). `count(don_hang_id)` sẽ ra 15 thay vì 10. Đây là bẫy grain kinh điển — join làm
phồng grain, và mọi hàm gộp sau đó phải tính tới điều đó.

Kiểm nhanh:

```sql
select sum(so_don), sum(doanh_thu) from main_marts.mart_doanh_thu_ngay;
-- phải ra 10 và 10215000
```

</details>

---

## Bài B5 — Source và generic test

**Đề:** hai phần.

1. Khai một source tên `lab_raw` trỏ vào schema `main`, bảng `su_kien_web`, có
   `freshness` cảnh báo sau 12 giờ và lỗi sau 24 giờ. Viết `stg_su_kien` dùng
   `source()`.
2. Thêm generic test: `unique` + `not_null` cho `stg_don_hang.don_hang_id`,
   `accepted_values` cho `trang_thai`, `relationships` từ chi tiết về đơn, và
   `dbt_utils.unique_combination_of_columns` chứng minh grain của bảng chi tiết.

Chạy `dbt test`, tất cả phải xanh.

**Gợi ý:** `loaded_at_field` phải là biểu thức SQL hợp lệ — cột `thoi_diem` trong seed
là `varchar`. Và trên dbt 1.12, tham số của generic test khai dưới khoá `arguments:`.

**Đáp số phải ra:**

```text
Done. PASS=5 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5
```

<details>
<summary>Lời giải</summary>

```yaml
# models/staging/sources.yml
version: 2

sources:
  - name: lab_raw
    schema: main
    tables:
      - name: su_kien_web
        loaded_at_field: cast(thoi_diem as timestamp)
        freshness:
          warn_after:  {count: 12, period: hour}
          error_after: {count: 24, period: hour}
```

```sql
-- models/staging/stg_su_kien.sql
select * from {{ source('lab_raw', 'su_kien_web') }}
```

```yaml
# models/staging/schema.yml
version: 2

models:
  - name: stg_don_hang
    columns:
      - name: don_hang_id
        tests: [unique, not_null]
      - name: trang_thai
        tests:
          - accepted_values:
              arguments:
                values: ['moi', 'dang_giao', 'hoan_thanh']

  - name: stg_don_hang_chi_tiet
    columns:
      - name: don_hang_id
        tests:
          - relationships:
              arguments:
                to: ref('stg_don_hang')
                field: don_hang_id
    tests:
      - dbt_utils.unique_combination_of_columns:
          arguments:
            combination_of_columns: [don_hang_id, dong]
```

**Ba điều phải rút ra:**

**1. `arguments:` là cú pháp mới.** Khai kiểu cũ (tham số nằm thẳng dưới tên test) vẫn
chạy trên dbt 1.12 nhưng in ra cảnh báo:

```text
[WARNING][DeprecationsSummary]: Deprecated functionality
Summary of encountered deprecations:
- MissingArgumentsPropertyInGenericTestDeprecation: 2 occurrences
```

**2. `unique` trên `don_hang_id` của bảng chi tiết sẽ FAIL — và đó là test sai, không
phải dữ liệu sai.** Thử đi rồi xem:

```text
[ERROR]: in test unique_stg_don_hang_chi_tiet_don_hang_id (models/staging/schema.yml)
  Got 4 results, configured to fail if != 0
```

Grain của bảng là `(don_hang_id, dong)`, không phải `don_hang_id`. Đó là lý do phải
dùng `unique_combination_of_columns`. **Xác định grain trước khi viết test.**

**3. `dbt source freshness` ở đây sẽ `ERROR STALE` — và cũng đúng:**

```text
1 of 1 ERROR STALE freshness of lab_raw.su_kien_web ............................ [ERROR STALE in 0.01s]
```

Seed có dữ liệu tháng 7, hôm nay là tháng 9. Freshness so với **đồng hồ treo tường**,
không so với lần chạy dbt trước. Vì thế đừng để lệnh này chặn CI ở môi trường dev — nó
thuộc về job production.

</details>

---

## Tự kiểm trước khi sang bộ Trung bình

Trả lời miệng, không mở tài liệu:

<details>
<summary>1. Vì sao model không được có <code>create table</code> và dấu <code>;</code>?</summary>

dbt sinh phần DDL theo materialization đã khai. Viết tay là ghi đè lựa chọn đó, và
`;` ở giữa làm hỏng câu SQL mà dbt bọc bên ngoài.

</details>

<details>
<summary>2. Thay <code>ref()</code> bằng tên bảng viết cứng thì hỏng ở đâu?</summary>

**Không hỏng gì thấy được** — model vẫn chạy, số vẫn đúng. Thứ mất là một cạnh trong
DAG: dbt có thể chạy sai thứ tự, `dbt ls --select +model` không còn liệt kê đủ, và
lineage nói dối. Loại hỏng không báo lỗi.

</details>

<details>
<summary>3. <code>source()</code> khác <code>ref()</code> ở chỗ nào?</summary>

`source()` = bảng dbt **không** tạo ra và không build lại được. Đổi lại có
`dbt source freshness` và lineage có gốc. Quy tắc: dbt build lại được không? Không →
`source()`.

</details>

<details>
<summary>4. Test <code>unique</code> pass mà số vẫn sai thì nghi gì trước?</summary>

Nghi mình test sai grain. `unique` trên một cột không nói gì về bảng có grain tổ hợp.

</details>

## Related Topics

- [Khởi tạo và cấu hình một dbt project](../skills/khoi-tao-dbt-project.md) — bài B1
- [Viết model đầu tiên với `ref()`](../skills/model-dau-tien-voi-ref.md) — bài B2, B4
- [Khai báo source](../skills/khai-bao-source.md) — bài B5
- [Bài tập trung bình](bt-02-trung-binh.md) — bộ tiếp theo
