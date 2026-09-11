---
title: "Bài tập dbt — Nâng cao"
sidebar_position: 30
description: "Năm bài về thứ chỉ lộ ra ở production: unit test, SCD2 theo giờ nghiệp vụ, on_schema_change nuốt cột, CI state:modified, và đọc run_results.json."
tags: [dbt, bai-tap, unit-test, scd2, on-schema-change, ci-cd, run-results]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-09-11
---

# Bài tập dbt — Nâng cao

> **Chốt:** bộ này không thêm cú pháp mới. Nó luyện thứ phân biệt người dùng dbt với
> người **vận hành** dbt: chứng minh logic đúng mà không cần dữ liệu thật, dựng lịch sử
> theo giờ nghiệp vụ, và biết project của mình đang tốn thời gian ở đâu.

## Chuẩn bị

Cần hoàn thành [bộ Trung bình](bt-02-trung-binh.md). Mốc dữ liệu: **10 đơn · 15 dòng
hàng · 10.215.000**.

---

## Bài N1 — Unit test: chứng minh logic đúng mà không cần dữ liệu thật

**Đề:** `mart_doanh_thu_ngay` có một chỗ dễ sai: `count(distinct don_hang_id)` sau khi
join làm phồng grain. Viết **unit test** (dbt 1.8+) chứng minh model gộp đúng, với dữ
liệu giả nhét thẳng vào YAML:

- 2 đơn cùng ngày `2026-01-01`, phí ship 1000 và 2000
- 3 dòng hàng: `D1` có 2 dòng (100 + 200), `D2` có 1 dòng (300)
- Kỳ vọng: 1 dòng kết quả — `so_don = 2`, `doanh_thu = 600`

**Trả lời thêm:** vì sao unit test chạy **trước** khi model được build, còn data test
chạy **sau**?

**Đáp số phải ra:**

```text
1 of 7 PASS mart_doanh_thu_ngay::mart_doanh_thu_ngay_gop_dung_ngay ............. [PASS in 0.13s]
```

<details>
<summary>Lời giải</summary>

```yaml
# models/marts/unit_tests.yml
unit_tests:
  - name: mart_doanh_thu_ngay_gop_dung_ngay
    model: mart_doanh_thu_ngay
    given:
      - input: ref('stg_don_hang')
        rows:
          - {don_hang_id: 'D1', ngay_dat: '2026-01-01', phi_ship: 1000}
          - {don_hang_id: 'D2', ngay_dat: '2026-01-01', phi_ship: 2000}
      - input: ref('stg_don_hang_chi_tiet')
        rows:
          - {don_hang_id: 'D1', dong: 1, thanh_tien: 100}
          - {don_hang_id: 'D1', dong: 2, thanh_tien: 200}
          - {don_hang_id: 'D2', dong: 1, thanh_tien: 300}
    expect:
      rows:
        - {ngay: '2026-01-01', so_don: 2, doanh_thu: 600}
```

**Trả lời câu hỏi:** unit test kiểm **logic SQL**, không kiểm dữ liệu — nó thay toàn bộ
input bằng dòng giả, nên không cần bảng thật và chạy được trước khi build. Data test
(`unique`, `not_null`, singular test) kiểm **dữ liệu đang có trong bảng**, nên bắt buộc
phải có bảng rồi.

Nhìn số thứ tự trong output: unit test là `1 of 7` — nó chặn ngay từ đầu, model sai
logic thì không bao giờ được build.

**Khi nào unit test đáng viết:**

| Đáng | Không đáng |
|---|---|
| Logic gộp có khả năng phồng grain | model chỉ `select` đổi tên cột |
| Biểu thức `case when` nhiều nhánh | model chỉ lọc một điều kiện |
| Tính tỷ lệ, phân bổ, chuyển tiền tệ | staging 1:1 với nguồn |
| Model mà số đã từng sai một lần | — |

Chỉ liệt kê cột **thật sự cần** trong `given` — dbt tự điền `NULL` cho phần còn lại.
Ở đây `ma_hang`, `so_luong` không ảnh hưởng kết quả nên bỏ hẳn.

</details>

---

## Bài N2 — SCD2 theo giờ nghiệp vụ, và as-was khác as-is bao nhiêu

**Đề:** bài T5 cho thấy `dbt snapshot` ghi mốc theo **giờ chạy**, nên không dùng được
cho lịch sử trong quá khứ. Giờ dựng SCD2 **tay** từ bảng `khach_hang_lich_su` (ảnh chụp
hằng ngày, có cột `ngay_trich`), rồi tính doanh thu theo khu vực theo hai cách và so:

1. **as-was** — khu vực của khách **tại ngày đặt đơn**
2. **as-is** — khu vực **hiện tại** của khách

**Gợi ý:** nén ảnh chụp hằng ngày thành khoảng hiệu lực — `lag()` để phát hiện mốc đổi,
`lead()` để đóng khoảng.

**Đáp số phải ra:**

Bảng SCD2 dựng được:

```text
┌──────────┬────────────┬────────────┬────────────┐
│ khach_id │  khu_vuc   │ valid_from │  valid_to  │
├──────────┼────────────┼────────────┼────────────┤
│ C1       │ Mien Bac   │ 2026-07-01 │ 2026-07-03 │
│ C1       │ Mien Nam   │ 2026-07-03 │ NULL       │
│ C2       │ Mien Nam   │ 2026-07-01 │ NULL       │
│ C3       │ Mien Trung │ 2026-07-01 │ NULL       │
│ C4       │ Mien Bac   │ 2026-07-01 │ NULL       │
└──────────┴────────────┴────────────┴────────────┘
```

```text
-- AS-WAS                          -- AS-IS
┌────────────┬───────────┐         ┌────────────┬───────────┐
│  khu_vuc   │ doanh_thu │         │  khu_vuc   │ doanh_thu │
├────────────┼───────────┤         ├────────────┼───────────┤
│ Mien Bac   │   4200000 │         │ Mien Bac   │   1650000 │
│ Mien Nam   │   3915000 │         │ Mien Nam   │   6465000 │
│ Mien Trung │   2100000 │         │ Mien Trung │   2100000 │
└────────────┴───────────┘         └────────────┴───────────┘
```

<details>
<summary>Lời giải</summary>

```sql
-- models/marts/dim_khach_hang_scd2.sql
with anh_chup as (
    select khach_id, ngay_trich, khu_vuc,
           lag(khu_vuc) over (partition by khach_id order by ngay_trich) as khu_vuc_truoc
    from {{ ref('khach_hang_lich_su') }}
),
moc_doi as (
    select * from anh_chup
    where khu_vuc_truoc is null or khu_vuc_truoc <> khu_vuc
)
select
    khach_id,
    khu_vuc,
    ngay_trich as valid_from,
    lead(ngay_trich) over (partition by khach_id order by ngay_trich) as valid_to
from moc_doi
```

```sql
-- as-was
select d.khu_vuc, sum(ct.thanh_tien) as doanh_thu
from {{ ref('stg_don_hang') }} o
join {{ ref('stg_don_hang_chi_tiet') }} ct using (don_hang_id)
join {{ ref('dim_khach_hang_scd2') }} d
  on  d.khach_id = o.khach_id
  and o.ngay_dat >= d.valid_from
  and o.ngay_dat <  coalesce(d.valid_to, date '9999-12-31')
group by 1 order by 1
```

```sql
-- as-is
select k.khu_vuc, sum(ct.thanh_tien) as doanh_thu
from {{ ref('stg_don_hang') }} o
join {{ ref('stg_don_hang_chi_tiet') }} ct using (don_hang_id)
join {{ ref('khach_hang') }} k using (khach_id)
group by 1 order by 1
```

**Đọc kết quả.** Khách `C1` chuyển *Mien Bac → Mien Nam* ngày 03/07. `C1` có ba đơn:
`DH001` (01/07), `DH003` (02/07), `DH007` (04/07).

| Cách tính | Mien Bac | Mien Nam | Ghi chú |
|---|---|---|---|
| as-was | 4.200.000 | 3.915.000 | DH001 + DH003 tính về Bắc, DH007 về Nam |
| as-is | 1.650.000 | 6.465.000 | cả ba đơn của C1 tính về Nam |
| **Chênh** | **2.550.000** | 2.550.000 | 25% tổng doanh thu |

Tổng hai cách đều là **10.215.000** — không mất tiền, chỉ là tiền nằm ở vùng khác.

**Ba điều phải rút ra:**

1. **Chênh 25% chỉ với một khách chuyển vùng một lần.** Trên dữ liệu thật với hàng
   nghìn khách, đây là loại chênh làm hai phòng ban cãi nhau cả tuần.
2. **Không có cách nào đúng phổ quát.** Phòng kinh doanh muốn as-was (đánh giá vùng lúc
   bán được). Phòng marketing muốn as-is (nhắm khách theo vùng hiện tại). Quyết định là
   **nghiệp vụ**, không phải kỹ thuật — và phải ghi vào `description` của model.
3. **`coalesce(valid_to, '9999-12-31')` là bắt buộc.** `x < NULL` ra `NULL` chứ không
   ra `true`, nên thiếu nó là mất sạch dòng hiện hành và as-was trả về ít hơn as-is một
   cách khó hiểu.

**Vì sao phải dựng tay thay vì `dbt snapshot`:** ảnh chụp hằng ngày có `ngay_trich` —
một mốc **nghiệp vụ** thật. `dbt snapshot` chỉ có mốc giờ chạy. Khi nguồn đã giữ sẵn
lịch sử thì dựng tay cho ra mốc đúng; `dbt snapshot` là phương án khi nguồn **không**
giữ gì cả.

</details>

---

## Bài N3 — `on_schema_change` nuốt cột mới

**Đề:**

1. Build `fct_dong_hang` (incremental) như bài T1.
2. Thêm một cột `_nap_luc` vào model: `'{{ run_started_at }}' as _nap_luc`.
3. Chạy `dbt run` — **không** dùng `--full-refresh`. Liệt kê cột của bảng.
4. Thêm `on_schema_change='append_new_columns'` vào `config()`, chạy lại, liệt kê cột.
5. Giải thích vì sao bước 3 không báo lỗi nào.

**Đáp số phải ra:**

Sau bước 3 — `on_schema_change` còn ở mặc định `ignore`:

```text
['don_hang_id', 'dong', 'ma_hang', 'so_luong', 'don_gia', 'thanh_tien', 'ngay']
```

Sau bước 4 — đã đổi sang `append_new_columns`:

```text
['don_hang_id', 'dong', 'ma_hang', 'so_luong', 'don_gia', 'thanh_tien', 'ngay', '_nap_luc']
```

Cả hai lần `dbt run` đều báo:

```text
Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

<details>
<summary>Lời giải</summary>

```sql
{{ config(
    materialized='incremental',
    unique_key=['don_hang_id', 'dong'],
    on_schema_change='append_new_columns'
) }}

select don_hang_id, dong, ma_hang, so_luong, don_gia, thanh_tien, ngay,
       '{{ run_started_at }}' as _nap_luc
from {{ ref('stg_don_hang_chi_tiet') }}
{% if is_incremental() %}
where ngay >= (select coalesce(max(ngay), date '1900-01-01') - interval 7 day from {{ this }})
{% endif %}
```

**Vì sao bước 3 không báo lỗi:** với model incremental, dbt **không** tạo lại bảng —
nó chèn/merge vào bảng đã có. Câu `insert` được sinh theo **cột của bảng đích**, không
theo cột của `select`. Cột thừa trong `select` bị bỏ qua. Mặc định `on_schema_change`
là `ignore`, nên dbt cố ý im lặng.

Đây là lỗi tốn giờ điển hình: `dbt run` xanh, code có cột, bảng không có cột, và không
có gì để grep.

**Bốn giá trị:**

| Giá trị | Hành vi | Dùng khi |
|---|---|---|
| `ignore` (mặc định) | bỏ cột mới, im lặng | không bao giờ nên giữ mặc định |
| `append_new_columns` | thêm cột mới, dòng cũ `null` | mặc định nên dùng |
| `sync_all_columns` | thêm **và xoá** cột theo model | model là nguồn sự thật duy nhất |
| `fail` | dừng và báo lỗi | bảng có hợp đồng chặt với hệ khác |

**Lưu ý về `append_new_columns`:** cột mới thêm vào, nhưng **dòng cũ mang `NULL`** —
`_nap_luc` chỉ có giá trị cho các dòng nạp từ lần này trở đi. Muốn cột đầy đủ toàn bảng
thì vẫn phải `dbt run --full-refresh -s fct_dong_hang`.

Đặt mặc định cho toàn project để không phải nhớ:

```yaml
# dbt_project.yml
models:
  dbt_lab:
    +on_schema_change: append_new_columns
```

</details>

---

## Bài N4 — CI chỉ chạy phần đã đổi

**Đề:**

1. Chạy `dbt build` để có `target/manifest.json`, copy nó vào `prod_manifest/` giả làm
   manifest của production.
2. Sửa **đúng một** model staging (ví dụ đổi `trang_thai` thành `upper(trang_thai)`).
3. Chạy `dbt ls --select state:modified+ --state ./prod_manifest`.
4. **Trả lời:** vì sao danh sách có cả `mart_doanh_thu_ngay` và cả những test bạn không
   đụng vào?
5. Viết bước GitHub Actions dùng kết quả đó, kèm hai thứ bắt buộc: schema riêng cho mỗi
   PR, và bước dọn chạy cả khi CI fail.

**Đáp số phải ra:**

```text
Found 15 seeds, 6 models, 1 snapshot, 9 data tests, 1 source, 604 macros, 1 unit test
dbt_lab.marts.mart_doanh_thu_ngay
dbt_lab.staging.stg_don_hang
dbt_lab.staging.accepted_values_stg_don_hang_trang_thai__moi__dang_giao__hoan_thanh
dbt_lab.marts.khong_am_mart_doanh_thu_ngay_doanh_thu
dbt_lab.marts.not_null_mart_doanh_thu_ngay_ngay
dbt_lab.staging.not_null_stg_don_hang_don_hang_id
dbt_lab.staging.relationships_stg_don_hang_chi_tiet_don_hang_id__don_hang_id__ref_stg_don_hang_
dbt_lab.tong_mart_khop_staging
dbt_lab.marts.unique_mart_doanh_thu_ngay_ngay
dbt_lab.staging.unique_stg_don_hang_don_hang_id
unit_test:dbt_lab.mart_doanh_thu_ngay_gop_dung_ngay
```

<details>
<summary>Lời giải</summary>

```bash
dbt build --profiles-dir .
mkdir -p prod_manifest && cp target/manifest.json prod_manifest/
sed -i 's/trang_thai,/upper(trang_thai) as trang_thai,/' models/staging/stg_don_hang.sql
dbt ls --select state:modified+ --state ./prod_manifest --profiles-dir .
```

**Trả lời câu hỏi 4:** dấu `+` phía sau `state:modified` nghĩa là **"và mọi thứ phía
sau trong DAG"**. `mart_doanh_thu_ngay` `ref()` tới `stg_don_hang` nên nó nằm phía sau.
Test đi kèm cả hai model cũng nằm phía sau — test luôn là con của model nó kiểm.

Đó chính là điều bạn muốn: sửa một model thì phải kiểm lại **mọi thứ có thể vỡ vì nó**,
chứ không chỉ chính nó.

```yaml
      - name: Lay manifest cua production
        run: |
          mkdir -p prod_manifest
          aws s3 cp s3://cty-dbt-artifacts/prod/manifest.json prod_manifest/manifest.json

      - name: Build phan da doi
        env:
          DBT_CI_SCHEMA: ci_pr_${{ github.event.pull_request.number }}
        run: |
          dbt build --select state:modified+ \
                    --defer --state ./prod_manifest \
                    --target ci

      - name: Don schema cua PR
        if: always()
        run: dbt run-operation drop_schema --args "{schema: ci_pr_${{ github.event.pull_request.number }}}"
```

**Ba điều phải rút ra:**

1. **`--defer` là mảnh thứ hai.** Nó cho phép build một model giữa DAG mà không build
   lại toàn bộ phía trước: `ref()` tới model không có trong schema CI sẽ trỏ về
   production.
2. **`if: always()`** — CI fail vẫn phải dọn. Thiếu nó thì sau vài tháng warehouse đầy
   schema `ci_pr_*` không ai dám xoá.
3. **`manifest.json` production phải là artifact của job production**, đẩy lên S3 sau
   mỗi lần build thành công. Nó không có sẵn trong git, và dùng manifest cũ thì
   `state:modified` báo thừa.

**Cách biết `--state` đang hỏng:** đếm số node CI chạy. Nếu nó xấp xỉ tổng số model thì
manifest không được nạp, và bạn đang trả tiền cho một CI đầy đủ mà tưởng là CI tinh
gọn.

```bash
dbt ls --select state:modified+ --state ./prod_manifest | wc -l
```

</details>

---

## Bài N5 — Project đang tốn thời gian ở đâu

**Đề:** chạy `dbt build`, rồi viết script đọc `target/run_results.json` in ra 5 node
chậm nhất và tổng thời gian. Sau đó trả lời: với kết quả thu được, tối ưu chỗ nào là có
lãi, chỗ nào là lãng phí công?

**Gợi ý:** `run_results.json`, mảng `results`, trường `execution_time` (giây) và
`unique_id`.

**Đáp số phải ra** (số cụ thể khác theo máy; **hình dạng** phân bố mới là thứ phải
giống):

```text
   0.395s  snapshot.dbt_lab.snap_khach_hang
   0.249s  model.dbt_lab.dim_khach_hang
   0.201s  model.dbt_lab.fct_dong_hang
   0.179s  model.dbt_lab.stg_don_hang
   0.175s  model.dbt_lab.stg_don_hang_chi_tiet
tong: 3.114 s · 33 node
```

<details>
<summary>Lời giải</summary>

```python
import json
r = json.load(open('target/run_results.json'))
top = sorted(r['results'], key=lambda x: -x['execution_time'])[:5]
for t in top:
    print(f"{t['execution_time']:8.3f}s  {t['unique_id']}")
print("tong:", round(sum(x['execution_time'] for x in r['results']), 3), "s ·",
      len(r['results']), "node")
```

**Đọc kết quả này:** 5 node chậm nhất cộng lại là 1,199s trên tổng 3,114s — khoảng
**38%**. Phần còn lại rải đều trên 28 node.

Kết luận: **không có điểm nghẽn.** Trên lab này tối ưu là lãng phí công — mọi node đều
dưới nửa giây, và dữ liệu chỉ có 15 dòng.

Ngưỡng để biết khi nào nên tối ưu thật:

| Hình dạng phân bố | Kết luận |
|---|---|
| Top 5 chiếm **> 50%** tổng | Có điểm nghẽn rõ — tối ưu đúng 5 node đó |
| Top 5 chiếm ~30–40%, dàn đều | Không có điểm nghẽn; muốn nhanh thì tăng `threads` hoặc dọn model chết |
| Một node chiếm **> 25%** một mình | Ứng viên số một cho `incremental` |
| Tổng thời gian test > tổng thời gian model | Test đang quét toàn bảng — xem lại singular test |

Bốn hướng tối ưu, theo thứ tự đáng thử:

1. **Xoá model không ai dùng.** Rẻ nhất, và mọi project chạy trên 1 năm đều có.
   Đối chiếu `manifest.json` với log truy vấn của warehouse.
2. **Tăng `threads`** trong `profiles.yml`. Chỉ có tác dụng khi DAG **rộng**; DAG hình
   chuỗi thì tăng threads không đổi gì.
3. **Chuyển model chậm nhất sang `incremental`** — nhưng đọc kỹ
   [bài T1](bt-02-trung-binh.md) trước: nó đổi thời gian chạy lấy nghĩa vụ đúng đắn.
4. **Đổi `view` thành `table`** ở tầng mà mọi model sau đều đọc lại. Đo trước và sau,
   đừng đoán.

**Về `run_results.json` trong production:** đẩy nó lên S3 sau mỗi lần chạy giống như
`manifest.json`. Có chuỗi file đó là dựng được biểu đồ "model nào đang chậm dần theo
tháng" — thứ cho bạn hành động **trước** khi job đêm tràn qua giờ làm việc.

</details>

---

## Tự kiểm — bốn câu hay gặp trong phỏng vấn

<details>
<summary>1. Unit test khác data test ở đâu, và khi nào dùng cái nào?</summary>

Unit test kiểm **logic SQL** với dữ liệu giả khai trong YAML, chạy **trước** khi build,
không cần bảng thật. Data test kiểm **dữ liệu thật đang nằm trong bảng**, chạy sau.

Unit test cho model có logic dễ sai (gộp, `case when` nhiều nhánh, phân bổ). Data test
cho mọi model.

</details>

<details>
<summary>2. Vì sao không dùng <code>dbt snapshot</code> cho mọi nhu cầu lịch sử?</summary>

Vì mốc nó ghi là **giờ chạy snapshot**, không phải giờ nghiệp vụ, và nó **không hồi
tố**. Khi nguồn đã giữ sẵn lịch sử (ảnh chụp hằng ngày, CDC có `valid_from`) thì dựng
SCD2 tay cho ra mốc đúng. `dbt snapshot` là phương án khi nguồn không giữ gì cả.

</details>

<details>
<summary>3. CI cho dbt làm sao để không mất 40 phút mỗi PR?</summary>

`dbt build --select state:modified+ --defer --state <manifest production>`. So với
manifest của production để chỉ chạy phần đã đổi và phần phía sau nó; `--defer` cho
`ref()` trỏ về production với phần chưa build. Kèm schema riêng theo số PR và bước dọn
`if: always()`.

</details>

<details>
<summary>4. Model thêm cột mà bảng incremental không có cột đó — chuyện gì đã xảy ra?</summary>

`on_schema_change` đang ở mặc định `ignore`. dbt sinh `insert` theo cột của **bảng
đích**, cột thừa trong `select` bị bỏ im lặng. Sửa: `append_new_columns`, và
`--full-refresh` nếu muốn cột có giá trị cho cả dòng cũ.

</details>

## Related Topics

- [Triển khai test trong dbt](../skills/implementing-tests.md) — bài N1
- [Snapshot — bắt lịch sử thay đổi](../skills/snapshot-scd2.md) — bài N2
- [SCD — Slowly Changing Dimension](../../../data-modeling/skills/scd.md) — as-was và as-is
- [Viết incremental model](../skills/viet-incremental-model.md) — bài N3
- [Thiết lập CI/CD cho dbt project](../skills/ci-cd-cho-dbt.md) — bài N4
- [Materialization](../reference/materializations.md) — bài N5
