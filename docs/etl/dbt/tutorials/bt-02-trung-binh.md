---
title: "Bài tập dbt — Trung bình"
sidebar_position: 20
description: "Năm bài về thứ dbt làm hỏng mà không báo lỗi: incremental đánh rơi dòng sửa muộn, test sai grain, Jinja sinh SQL không đọc nổi, snapshot ghi nhầm mốc thời gian."
tags: [dbt, bai-tap, incremental, macro, jinja, snapshot, dbt-utils, test]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-11
---

# Bài tập dbt — Trung bình

> **Chốt:** bộ này luyện đúng một kỹ năng — **phát hiện lỗi không báo lỗi**. Cả năm bài
> đều có một bước bắt bạn **tự tay tạo ra lỗi trước**, rồi mới sửa. Đọc lời giải mà
> không qua bước đó thì không học được gì.

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt
./.venv/bin/dbt deps --profiles-dir .
./.venv/bin/dbt seed --profiles-dir .
```

Cần có sẵn `stg_don_hang`, `stg_don_hang_chi_tiet`, `mart_doanh_thu_ngay` từ
[bộ Cơ bản](bt-01-co-ban.md). Mốc: **15 dòng hàng, doanh thu 10.215.000**.

---

## Bài T1 — Incremental đánh rơi dòng sửa muộn

**Đề:** bốn bước, làm đúng thứ tự.

1. Viết `fct_dong_hang` materialized `incremental`, `unique_key` là
   `['don_hang_id', 'dong']`, lọc theo `ngay > max(ngay) from {{ this }}`.
2. Chạy hai lần. Chứng minh không nhân đôi.
3. Thêm vào seed **hai** dòng rồi seed lại và chạy lại:
   ```text
   DH011,1,SP-C,1,900000,2026-07-06
   DH001,1,SP-A,4,150000,2026-07-01
   ```
   Dòng đầu là đơn mới; dòng sau là bản sửa muộn (`so_luong` 2 → 4, ngày giữ nguyên).
4. Đối chiếu tổng `thanh_tien` giữa `fct_dong_hang` và `stg_don_hang_chi_tiet`. Giải
   thích con số lệch, rồi sửa.

**Gợi ý:** bước 4 là trọng tâm. Số dòng sẽ khớp — đừng dừng ở đó.

**Đáp số phải ra** (sau bước 3, *trước* khi sửa):

```text
┌───────────────────┬─────────┬───────────┐
│       bang        │ so_dong │ doanh_thu │
├───────────────────┼─────────┼───────────┤
│ fct (incremental) │      16 │  11115000 │
│ stg (nguon that)  │      16 │  11415000 │
└───────────────────┴─────────┴───────────┘
```

Sau khi sửa, cả hai phải là `16 · 11415000`.

<details>
<summary>Lời giải</summary>

**Bước 1–2:**

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

```text
02:38:51  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.07s]
02:38:54  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.16s]
```

Sau hai lần chạy vẫn 15 dòng — công của `unique_key`. Bỏ `unique_key` đi thì strategy
rơi về `insert` thuần và lần hai sẽ nhân đôi.

**Bước 3–4 — chỗ quan trọng nhất:**

```text
02:39:11  1 of 1 OK loaded seed file main.don_hang_chi_tiet .............................. [INSERT 16 in 0.06s]
02:39:14  1 of 1 OK created sql incremental model main_marts.fct_dong_hang ............... [OK in 0.11s]
```

Không lỗi nào. Nhưng:

```text
┌─────────────┬───────┬─────────┬──────────┬─────────┬────────────┬────────────┐
│ don_hang_id │ dong  │ ma_hang │ so_luong │ don_gia │ thanh_tien │    ngay    │
├─────────────┼───────┼─────────┼──────────┼─────────┼────────────┼────────────┤
│ DH001       │     1 │ SP-A    │        2 │  150000 │     300000 │ 2026-07-01 │
└─────────────┴───────┴─────────┴──────────┴─────────┴────────────┴────────────┘
```

`so_luong` vẫn là 2. Bộ lọc `ngay > max(ngay)` nhìn **ngày nghiệp vụ**; bản sửa của
`DH001` mang ngày 01/07, thấp hơn mốc 05/07, nên không lọt vào lô → merge không bao giờ
chạm tới nó. Lệch đúng `2 × 150.000 = 300.000`.

**Sửa — cửa sổ nhìn lại:**

```sql
{% if is_incremental() %}
-- Cửa sổ nhìn lại 7 ngày: bắt cả dòng sửa muộn, không chỉ dòng mới.
where ngay >= (select coalesce(max(ngay), date '1900-01-01') - interval 7 day from {{ this }})
{% endif %}
```

```text
┌───────────────────┬─────────┬───────────┐
│       bang        │ so_dong │ doanh_thu │
├───────────────────┼─────────┼───────────┤
│ fct (lookback 7d) │      16 │  11415000 │
│ stg (nguon that)  │      16 │  11415000 │
└───────────────────┴─────────┴───────────┘
```

Cửa sổ chỉ an toàn **vì có `unique_key`** — nạp lại 7 ngày thành merge, không thành
chèn trùng.

**Ba điều phải rút ra:**

1. Số dòng khớp **không** chứng minh dữ liệu đúng. Phải đối chiếu tổng số đo.
2. Không test tiêu chuẩn nào bắt được lỗi này: `unique` pass, `not_null` pass,
   `relationships` pass.
3. Độ rộng cửa sổ phải đo từ dữ liệu (phân vị 99 của độ trễ sửa), không chọn theo cảm
   giác. Phần đuôi dài hơn cửa sổ là lý do vẫn cần `--full-refresh` định kỳ.

</details>

---

## Bài T2 — Hai loại test mà YAML không viết được

**Đề:**

1. Viết **generic test tự viết** tên `khong_am(column_name, cho_phep_null=false)` —
   fail khi cột có giá trị âm, và (tuỳ tham số) khi có `NULL`.
2. Viết **singular test** đối chiếu tổng doanh thu của `mart_doanh_thu_ngay` với tổng
   `thanh_tien` của `stg_don_hang_chi_tiet`.
3. **Cố ý làm hỏng** mart bằng cách cộng thêm `sum(phi_ship)` vào doanh thu, chạy
   `dbt build --store-failures`, rồi đọc bảng lưu dòng sai.

**Gợi ý:** generic test đặt trong `tests/generic/`, singular test đặt thẳng trong
`tests/`. Cả hai đều là "câu SQL trả về **các dòng sai**" — trả về 0 dòng là pass.

**Đáp số phải ra** (bước 3):

```text
4 of 5 FAIL 1 tong_mart_khop_staging ........................................... [FAIL 1 in 0.09s]
[ERROR]: in test tong_mart_khop_staging (tests/tong_mart_khop_staging.sql)
  Got 1 result, configured to fail if != 0
Done. PASS=4 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5
```

```text
┌──────────┬──────────┐
│   mart   │ staging  │
├──────────┼──────────┤
│ 10925000 │ 10215000 │
└──────────┴──────────┘
```

<details>
<summary>Lời giải</summary>

```sql
-- tests/generic/khong_am.sql
{% test khong_am(model, column_name, cho_phep_null=false) %}
select {{ column_name }}
from {{ model }}
where {{ column_name }} < 0
{% if not cho_phep_null %}
   or {{ column_name }} is null
{% endif %}
{% endtest %}
```

```sql
-- tests/tong_mart_khop_staging.sql
with a as (select sum(doanh_thu)  t from {{ ref('mart_doanh_thu_ngay') }}),
     b as (select sum(thanh_tien) t from {{ ref('stg_don_hang_chi_tiet') }})
select a.t as mart, b.t as staging
from a, b
where a.t <> b.t
```

```yaml
# models/marts/schema.yml
version: 2
models:
  - name: mart_doanh_thu_ngay
    description: "Doanh thu và số đơn theo ngày đặt. Grain: một dòng một ngày."
    columns:
      - name: ngay
        description: "Ngày đặt đơn."
        tests: [unique, not_null]
      - name: doanh_thu
        description: "Tổng thành tiền của các dòng hàng trong ngày, chưa gồm phí ship."
        tests:
          - khong_am
```

**Vì sao lệch đúng 710.000:** phí ship là thuộc tính của **đơn**, nhưng sau khi join
với bảng chi tiết mỗi đơn có nhiều dòng → `sum(phi_ship)` cộng phí ship lặp theo số
dòng hàng. Đây là bẫy grain, không phải bẫy dbt.

**Hai điều phải rút ra:**

1. `--store-failures` ghi dòng sai vào schema `<schema>_dbt_test__audit` — ở lab là
   `main_dbt_test__audit`. Đó là khác biệt giữa "test đỏ" và "biết đỏ vì cái gì".
2. Singular test đối chiếu tổng là **cái chắn duy nhất** cho loại lỗi ở bài T1. Nó chạy
   trên toàn bảng nên đắt: gắn `tags: ['hang_ngay']` và cho chạy ở job đêm, đừng nhét
   vào CI mỗi PR.

</details>

---

## Bài T3 — Jinja sinh cột động, và khoảng trắng

**Đề:** viết `mart_pivot_nhom` pivot doanh thu theo **nhóm hàng**, nhưng danh sách nhóm
**không được viết cứng** — phải đọc từ bảng `hang_hoa` lúc biên dịch. Đơn vị: triệu
đồng, làm tròn 2 chữ số, dùng một macro `vnd()` tự viết.

Sau đó mở `target/compiled/` và **so hai bản**: trước và sau khi dùng `{%-` / `-%}`.

**Gợi ý:** `dbt_utils.get_column_values()`.

**Đáp số phải ra:**

```text
┌────────────┬────────┬────────┬────────┐
│    ngay    │ nhom_1 │ nhom_2 │ nhom_3 │
├────────────┼────────┼────────┼────────┤
│ 2026-07-01 │   1.05 │    0.3 │    0.0 │
│ 2026-07-02 │   0.45 │    1.8 │    0.9 │
│ 2026-07-03 │    1.5 │    0.0 │    2.7 │
│ 2026-07-04 │    0.2 │    0.9 │    0.0 │
│ 2026-07-05 │   0.42 │    0.0 │    0.0 │
└────────────┴────────┴────────┴────────┘
```

<details>
<summary>Lời giải</summary>

```sql
-- macros/vnd.sql
{%- macro vnd(cot) -%}
round({{ cot }} / 1000000.0, 2)
{%- endmacro -%}
```

```sql
-- models/marts/mart_pivot_nhom.sql
{%- set nhom = dbt_utils.get_column_values(ref('hang_hoa'), 'nhom') -%}

select
    ct.ngay
    {%- for n in nhom %},
    {{ vnd("sum(case when hh.nhom = '" ~ n ~ "' then ct.thanh_tien else 0 end)") }} as nhom_{{ loop.index }}
    {%- endfor %}
from {{ ref('stg_don_hang_chi_tiet') }} ct
join {{ ref('hang_hoa') }} hh using (ma_hang)
group by 1
order by 1
```

Compiled ra:

```sql
select
    ct.ngay,
    round(sum(case when hh.nhom = 'Thiết bị nhập' then ct.thanh_tien else 0 end) / 1000000.0, 2) as nhom_1,
    round(sum(case when hh.nhom = 'Màn hình' then ct.thanh_tien else 0 end) / 1000000.0, 2) as nhom_2,
    round(sum(case when hh.nhom = 'Máy tính' then ct.thanh_tien else 0 end) / 1000000.0, 2) as nhom_3
from "lab"."main_staging"."stg_don_hang_chi_tiet" ct
join "lab"."main"."hang_hoa" hh using (ma_hang)
group by 1
order by 1
```

Bản **không** kiểm soát khoảng trắng compiled ra thế này — chạy được, nhưng đây chính
là file bạn sẽ mở ra để debug:

```sql
select
    ct.ngay,
    
    
    round(sum(case when hh.nhom = 'Thiết bị nhập' then ct.thanh_tien else 0 end) / 1000000.0, 2)
 as "thiết_bị_nhập",
```

**Ba điều phải rút ra:**

1. `get_column_values` **chạy một query thật lúc biên dịch**. Bảng `hang_hoa` phải tồn
   tại trước khi parse — CI trên môi trường trắng sẽ gãy ở đây.
2. Số cột của model **tự đổi** khi nguồn có nhóm hàng mới. Tiện, nhưng hợp đồng cột
   không còn ổn định — dashboard phía sau có thể vỡ mà không ai sửa dòng code nào.
3. Đặt tên cột `nhom_{{ loop.index }}` thay vì lấy tên nhóm làm tên cột là cố ý: tên
   nhóm có dấu và khoảng trắng, biến thành định danh phải quote và rất dễ vỡ.

</details>

---

## Bài T4 — `dbt_utils`: khoá thay thế và test grain

**Đề:**

1. Viết `dim_khach_hang` với cột `khach_sk` sinh bằng `generate_surrogate_key`, các cột
   còn lại lấy bằng `star()` trừ `ho_ten`.
2. Mở compiled SQL, chỉ ra **vì sao** macro bọc `coalesce` quanh cột khoá.
3. Thêm test `dbt_utils.fewer_rows_than` cho `fct_dong_hang` so với
   `stg_don_hang_chi_tiet`, và giải thích test này bắt được loại lỗi nào mà `unique`
   không bắt được.

**Đáp số phải ra:**

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

<details>
<summary>Lời giải</summary>

```sql
-- models/marts/dim_khach_hang.sql
select
    {{ dbt_utils.generate_surrogate_key(['khach_id']) }} as khach_sk,
    {{ dbt_utils.star(from=ref('khach_hang'), except=['ho_ten']) }}
from {{ ref('khach_hang') }}
```

Compiled:

```sql
select
    md5(cast(coalesce(cast(khach_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as khach_sk,
    "khach_id",
  "khu_vuc",
  "hang"
from "lab"."main"."khach_hang"
```

**Vì sao có `coalesce`:** `md5(NULL)` trả `NULL`. Không có chuỗi canh gác thì mọi dòng
thiếu khoá gộp chung thành một `NULL` — và join sau đó biến thành tích Descartes. Chuỗi
`'_dbt_utils_surrogate_key_null_'` bảo đảm `NULL` vẫn sinh ra một hash phân biệt.

**Vì sao hash chứ không phải `row_number()`:** hash **ổn định** — build lại, chạy ở máy
khác, đổi warehouse đều ra cùng giá trị. `row_number()` đổi mỗi lần build, và fact trỏ
vào surrogate key cũ lập tức trỏ nhầm dòng.

```yaml
models:
  - name: fct_dong_hang
    tests:
      - dbt_utils.fewer_rows_than:
          arguments:
            compare_model: ref('stg_don_hang_chi_tiet')
```

**Test này bắt loại lỗi nào:** *model đánh rơi dòng*. `unique`, `not_null`,
`relationships` đều kiểm **dòng đang có**; không cái nào biết dòng đáng lẽ phải có mà
không có. Một `join` thành `inner` do sơ ý, một `where` quá tay — cả hai đều pass hết
test tiêu chuẩn.

**Về `star()`:** nó là đường giữa giữa `select *` (thêm cột ở nguồn là trôi thẳng xuống
mart, không ai duyệt) và liệt kê 40 cột bằng tay. Đổi lại, cột được sinh lúc biên dịch
nên phải có bảng thật — cùng ràng buộc CI như bài T3.

</details>

---

## Bài T5 — Snapshot ghi mốc thời gian của ai?

**Đề:**

1. Khai `snap_khach_hang` theo cú pháp YAML (dbt 1.9+), strategy `check`, theo dõi
   `khu_vuc` và `hang`.
2. Chạy snapshot lần một.
3. Sửa seed: `C1` chuyển `Mien Nam → Mien Bac` và lên hạng `Bac → Vang`. Seed lại, chạy
   snapshot lần hai.
4. Đọc `dbt_valid_from` của hai phiên bản. **Trả lời:** hai mốc đó là thời điểm gì? Nếu
   khách thật sự chuyển vùng từ ngày 03/07 thì snapshot có biết không?

**Đáp số phải ra:**

```text
┌──────────┬──────────┬─────────┬────────────────────────────┬────────────────────────────┐
│ khach_id │ khu_vuc  │  hang   │       dbt_valid_from       │        dbt_valid_to        │
├──────────┼──────────┼─────────┼────────────────────────────┼────────────────────────────┤
│ C1       │ Mien Nam │ Bac     │ 2026-09-11 09:40:27.653852 │ 2026-09-11 09:40:34.225211 │
│ C1       │ Mien Bac │ Vang    │ 2026-09-11 09:40:34.225211 │ NULL                       │
└──────────┴──────────┴─────────┴────────────────────────────┴────────────────────────────┘
```

Tổng bảng: 5 dòng (4 khách, `C1` có 2 phiên bản).

<details>
<summary>Lời giải</summary>

```yaml
# snapshots/snap_khach_hang.yml
snapshots:
  - name: snap_khach_hang
    relation: ref('khach_hang')
    config:
      unique_key: khach_id
      strategy: check
      check_cols: [khu_vuc, hang]
```

```text
02:40:27  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.09s]
02:40:34  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.16s]
```

**Trả lời câu hỏi bước 4:** hai mốc `09:40:27` và `09:40:34` là **giờ tôi chạy hai lệnh
`dbt snapshot`**, cách nhau 7 giây. Chúng không liên quan gì tới thời điểm nghiệp vụ.

Snapshot **không biết** khách chuyển vùng ngày 03/07. Nó chỉ biết *"giữa hai lần tôi
nhìn, giá trị đã khác"*. `dbt snapshot` là máy ghi âm, không phải máy thời gian.

**Hệ quả cho join as-was.** Toàn bộ đơn hàng trong lab là tháng 7, còn snapshot bắt đầu
từ tháng 9 — nên join kiểu này ra **0 dòng**:

```sql
join {{ ref('snap_khach_hang') }} k
  on  f.khach_id = k.khach_id
  and f.ngay_dat >= k.dbt_valid_from
  and f.ngay_dat <  coalesce(k.dbt_valid_to, timestamp '9999-12-31')
```

Muốn lịch sử theo **giờ nghiệp vụ** thì phải dựng SCD2 tay từ một nguồn có ngày nghiệp
vụ — đó là bài [N4 ở bộ Nâng cao](bt-03-nang-cao.md).

**Bốn điều phải rút ra:**

1. `coalesce(dbt_valid_to, ...)` là bắt buộc khi join: `x < NULL` ra `NULL`, không ra
   `true` → mất sạch dòng hiện hành.
2. Snapshot **không hồi tố**. Bật ngày nào thì lịch sử bắt đầu ngày đó. Vì thế bật cho
   mọi dimension quan trọng **ngay**, đừng đợi tới lúc có người hỏi.
3. Bảng snapshot là **dữ liệu không sinh lại được** — phải nằm trong lịch backup, và
   `dbt build --full-refresh` phải kèm `--exclude resource_type:snapshot`.
4. Nhịp chạy quyết định độ phân giải: chạy hằng ngày thì hai lần đổi trong cùng một
   ngày chỉ ghi được một.

</details>

---

## Tự kiểm trước khi sang bộ Nâng cao

<details>
<summary>1. Incremental có số dòng khớp nguồn thì đã đúng chưa?</summary>

Chưa. Bài T1: 16 dòng khớp 16 dòng, nhưng tổng lệch 300.000 vì dòng sửa muộn không
lọt vào lô. Phải đối chiếu **tổng số đo**, không chỉ số dòng.

</details>

<details>
<summary>2. Generic test và singular test khác nhau ở đâu?</summary>

Generic test là **macro có tham số**, khai trong YAML, tái dùng cho nhiều cột/model.
Singular test là **một file `.sql` cho một tình huống cụ thể**, không tham số. Cả hai
đều trả về *các dòng sai*; 0 dòng là pass.

</details>

<details>
<summary>3. Vì sao surrogate key nên là hash chứ không phải số tăng dần?</summary>

Hash ổn định qua các lần build và qua các môi trường. Số tăng dần đổi mỗi lần build,
và fact trỏ vào key cũ lập tức trỏ nhầm dòng.

</details>

<details>
<summary>4. <code>dbt_valid_from</code> là thời điểm gì?</summary>

Thời điểm **chạy `dbt snapshot`**, không phải thời điểm nghiệp vụ. Nhầm chỗ này thì
báo cáo lịch sử lệch theo lịch chạy job.

</details>

## Related Topics

- [Viết incremental model](../skills/viet-incremental-model.md) — bài T1
- [Triển khai test trong dbt](../skills/implementing-tests.md) — bài T2
- [Viết macro và dùng Jinja logic](../skills/macro-va-jinja.md) — bài T3
- [Quản lý dependencies với package](../skills/quan-ly-package.md) — bài T4
- [Snapshot — bắt lịch sử thay đổi](../skills/snapshot-scd2.md) — bài T5
- [Bài tập nâng cao](bt-03-nang-cao.md) — bộ tiếp theo
