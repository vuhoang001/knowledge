---
title: dbt là gì và nó thật sự làm gì
i18n_status: untranslated
sidebar_position: 1
description: "Nhìn tận mắt SQL mà dbt sinh ra: ref() biến thành gì, test biên dịch thành gì."
tags: [dbt, ref, jinja, compiled-sql]
domain: data-engineering
category: technology
doc_type: reference
status: stable
difficulty: beginner
verified_at: 2026-07-30
updated: 2026-07-31
---
# dbt là gì và nó thật sự làm gì

> **Chốt:** dbt không có engine và không chuyển dữ liệu. Nó nhận file `.sql` của bạn,
> dán thêm vài thứ, ra SQL thuần, rồi gửi cho warehouse chạy. Tất cả những gì còn
> lại — DAG, test, tài liệu — đều mọc ra từ một hàm duy nhất: `ref()`.

Toàn bộ output trong bài này là **chạy thật** ngày 30/07/2026 tại
`~/Documents/learn-lab/dbt` (dbt 1.12.0 + DuckDB). Không có đoạn nào mô tả suông.

---

## 1. Vấn đề trước khi có dbt

Bạn có dữ liệu thô trong warehouse và cần biến nó thành bảng dùng được. Cách cũ:
một thư mục đầy file SQL, chạy tay theo thứ tự.

Bốn thứ hỏng ngay:

- **Thứ tự nằm trong đầu người viết.** `mart_doanh_thu.sql` phải chạy sau
  `stg_don_hang.sql`, nhưng không chỗ nào ghi điều đó. Người mới vào chạy sai thứ tự
  là ra bảng rỗng mà không hiểu vì sao.
- **Sửa một cột không biết cái gì gãy.** Không có bản đồ phụ thuộc.
- **Không có test.** Dữ liệu sai chỉ lộ ra khi ai đó nhìn dashboard và thấy lạ.
- **Chạy ở đâu là viết cứng trong SQL.** Tên database/schema nằm rải trong hàng chục
  file; đổi môi trường là sửa tay từng cái.

dbt giải quyết đúng bốn cái đó. Không hơn.

---

## 2. dbt thật sự làm gì — nhìn tận mắt

Đây là chỗ hiểu sai thì mọi thứ sau sai theo, nên xem output thật.

**File tôi viết** (`models/vidu/vd_don_hang.sql`):

```sql
select
    don_hang_id,
    dong,
    ma_hang,
    so_luong,
    don_gia,
    so_luong * don_gia as thanh_tien
from {{ ref('don_hang_chi_tiet') }}
```

**Chạy:** `dbt run --select vd_don_hang`

```
1 of 1 START sql view model main.vd_don_hang ......... [RUN]
1 of 1 OK created sql view model main.vd_don_hang .... [OK in 0.11s]
Completed successfully
```

**SQL dbt THẬT SỰ gửi đi** (`target/compiled/dbt_lab/models/vidu/vd_don_hang.sql`):

```sql
select
    don_hang_id,
    dong,
    ma_hang,
    so_luong,
    don_gia,
    so_luong * don_gia as thanh_tien
from "lab"."main"."don_hang_chi_tiet"
```

**Khác nhau đúng một chỗ:** `{{ ref('don_hang_chi_tiet') }}` → `"lab"."main"."don_hang_chi_tiet"`.

Hết. Đó là toàn bộ phép màu.

dbt cũng không tự chạy `CREATE VIEW` — nó bọc câu SELECT trên vào `create view ... as`
rồi đưa cho DuckDB. **DuckDB làm việc, dbt chỉ soạn câu lệnh.**

> **Ghi nhớ đường dẫn `target/compiled/`.** Mọi lỗi khó của dbt đều sáng ra ở đó, vì
> đó là thứ warehouse thật sự nhận được. Đoán mò trước khi mở nó là phí thời gian.

---

## 3. `ref()` — hàm quan trọng nhất, và nó không phải để viết tắt

Nhìn qua thì `ref('x')` chỉ là cách viết gọn tên bảng. Sai. Nó là **cách duy nhất
bạn khai báo phụ thuộc**.

Mỗi lần dbt thấy `ref('a')` trong model `b`, nó ghi một cạnh `a → b`. Từ tập cạnh đó:

| dbt làm được | Nhờ đâu |
|---|---|
| tự biết thứ tự chạy | sắp topo trên DAG |
| chạy đúng nhánh bị ảnh hưởng (`--select x+`) | duyệt đồ thị |
| vẽ sơ đồ lineage trong `dbt docs` | chính đồ thị đó |
| báo lỗi khi model bị trỏ tới biến mất | kiểm cạnh |

Viết thẳng `from lab.main.don_hang_chi_tiet` thì **model vẫn chạy** — và đó mới là
chỗ nguy hiểm. Nó chạy được, không báo gì, nhưng DAG mất một cạnh: dbt có thể chạy
sai thứ tự, và sơ đồ lineage **nói dối bạn**.

Quy tắc không có ngoại lệ: **không bao giờ viết tên bảng thẳng.**

### `ref()` với `source()`

| | Trỏ tới | Ai tạo ra bảng đó |
|---|---|---|
| `ref('x')` | model do dbt tạo | dbt |
| `source('nhom', 'x')` | bảng có sẵn | người khác (Spark, Flink, ingest) |

Nhầm chỗ này thì dbt tưởng nó sở hữu bảng của người khác — và bạn mất luôn khả năng
kiểm tra độ tươi của nguồn (`dbt source freshness`).

---

## 4. Test thật ra là gì — cũng chỉ là SQL

Test trong dbt nghe như một cơ chế riêng. Không phải. Xem output thật.

**Khai trong `schema.yml`:**

```yaml
models:
  - name: vd_don_hang
    columns:
      - name: don_hang_id
        tests: [unique]
```

**dbt biên dịch nó thành:**

```sql
select
    don_hang_id as unique_field,
    count(*) as n_records
from "lab"."main"."vd_don_hang"
where don_hang_id is not null
group by don_hang_id
having count(*) > 1
```

Chỉ là một câu `GROUP BY ... HAVING count > 1`.

**Nguyên tắc của mọi test dbt: câu SQL trả về CÁC DÒNG SAI. Trả 0 dòng = pass.**

Hiểu điều này thì viết singular test không bao giờ sai nữa — bạn viết câu tìm dòng
hỏng, không phải câu kiểm tra dòng đúng.

---

## 5. Trường hợp thật: test fail vì test sai, không phải dữ liệu sai

Đây là lỗi hay gặp nhất và đắt nhất.

Dữ liệu seed: `don_hang_chi_tiet` — 15 dòng, mỗi đơn hàng có **nhiều dòng hàng**:

```
don_hang_id,dong,ma_hang,so_luong,don_gia
DH001,1,SP-A,2,150000
DH001,2,SP-B,1,300000     ← cùng DH001, dòng 2
DH003,1,SP-C,1,900000
DH003,2,SP-A,3,150000
DH003,3,SP-B,2,300000     ← DH003 có 3 dòng
```

Đặt `unique` lên `don_hang_id` — nghe rất hợp lý, "mã đơn hàng phải là duy nhất":

```
1 of 1 FAIL 4 unique_vd_don_hang_don_hang_id ......... [FAIL 4]
Got 4 results, configured to fail if != 0
Done. PASS=0 WARN=0 ERROR=1 SKIP=0 TOTAL=1
```

Bốn đơn hàng có nhiều dòng → 4 kết quả trả về → fail.

**Dữ liệu hoàn toàn đúng. Test sai.**

Nguyên nhân: chưa xác định **grain** — một dòng của bảng này đại diện cho cái gì?
Không phải "một đơn hàng", mà là "**một dòng hàng trong một đơn hàng**". Grain là
*cặp* `(don_hang_id, dong)`.

**Sửa đúng** — dùng `dbt_utils`:

```yaml
models:
  - name: vd_don_hang
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [don_hang_id, dong]
    columns:
      - name: don_hang_id
        tests: [not_null]
      - name: thanh_tien
        tests:
          - dbt_utils.accepted_range: {min_value: 0, inclusive: false}
```

```
1 of 3 PASS dbt_utils_accepted_range_vd_don_hang_thanh_tien ......... [PASS]
2 of 3 PASS dbt_utils_unique_combination_of_columns_..._dong ........ [PASS]
3 of 3 PASS not_null_vd_don_hang_don_hang_id ........................ [PASS]
Done. PASS=3 WARN=0 ERROR=0 SKIP=0 TOTAL=3
```

Cần `packages.yml` + `dbt deps` trước:

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]
```

> **Bài học rộng hơn dbt:** khi test fail, câu hỏi đầu tiên không phải "dữ liệu sai ở
> đâu" mà **"mình có đang test đúng grain không"**. Nhầm chiều này thì hoặc đổ oan
> cho dữ liệu, hoặc tệ hơn — sửa dữ liệu cho khớp một cái test sai.

---

## 6. Những trường hợp khác sẽ gặp

| Hiện tượng | Nguyên nhân thường gặp | Nhìn ở đâu |
|---|---|---|
| Model chạy nhưng bảng rỗng | join hụt, hoặc `WHERE` lọc sạch | `target/compiled/` rồi chạy tay câu đó |
| "dbt chậm" | warehouse chậm, không phải dbt | `EXPLAIN` ở warehouse |
| Đổi model mà bảng không đổi | đang `table` mà quên `dbt run` lại | `dbt run --select x+` |
| Test xanh mà số vẫn sai | thiếu chiều **accuracy** — không có test nào so với nguồn | singular test đối chiếu |
| Lineage thiếu cạnh | viết tên bảng thẳng thay vì `ref()` | `dbt docs generate` |
| Nguồn chết mà mọi test xanh | thiếu `dbt source freshness` | thêm `freshness` vào source |

---

## 7. Điều nên nhớ nếu chỉ nhớ được ba câu

1. **dbt sinh SQL, warehouse chạy SQL.** Chậm thì tìm ở warehouse.
2. **`ref()` là thứ dựng nên DAG.** Viết tên bảng thẳng là phá DAG mà không báo lỗi.
3. **Test là SQL trả về dòng sai.** Fail thì nghi grain trước, nghi dữ liệu sau.

---

## Liên kết

- [Mục lục dbt](index.md) — bản đồ khái niệm và các component khác
- [Model và `ref()`](models-and-ref.md) — đào sâu phần §3
- [Test và data quality](testing.md) — đào sâu phần §4–5
- [Bài tập](../tutorials/dbt-lab-duckdb.md) — chạy lại tất cả những gì ở trên
