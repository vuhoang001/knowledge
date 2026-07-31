---
title: Test và data quality trong dbt
sidebar_position: 6
description: Ba tầng test/contract/unit test, bốn cơ chế test, và ca test fail vì test sai chứ không phải dữ liệu sai.
tags: [dbt, testing, data-quality, grain, contract]
domain: data-engineering
category: technology
status: review
difficulty: intermediate
verified_at:          # phần 3 tầng chưa chạy tay. §5 đã chạy 30/07/2026
updated: 2026-07-31
---
# Test và data quality — 3 tầng, không phải chỉ "viết test"

> **Chốt:** Test bắt dữ liệu sai *sau khi* đã tạo ra. Contract chặn schema sai *trước
> khi* tạo. Unit test bắt SQL sai *không cần dữ liệu*. Ba thứ khác nhau, đừng gọi
> chung là "test".

Hỏi "dbt làm data quality thế nào" thì câu trả lời thường gặp là liệt kê 4 test có
sẵn rồi hết. Nhưng 4 cái đó chỉ là một góc nhỏ, và chọn sai tầng thì test xanh mà
dữ liệu vẫn sai.

---

## 1. Tầng TEST — bắt dữ liệu sai sau khi đã tạo

Chạy bằng `dbt test`. Có **4 cơ chế**, khác nhau ở chỗ viết ở đâu và tái dùng được không:

| Cơ chế | Viết ở đâu | Tái dùng | Dùng khi |
|---|---|---|---|
| **Generic có sẵn** | `schema.yml` | ✅ | 90% nhu cầu — 4 cái dưới |
| **Singular** | file `.sql` trong `tests/` | ❌ một lần | luật nghiệp vụ riêng của một bảng |
| **Generic tự viết** | macro `{% test ten() %}` | ✅ | luật lặp lại ở nhiều model |
| **Từ package** | `packages.yml` | ✅ | `dbt_utils`, `dbt_expectations` |

Bốn generic có sẵn: `unique` · `not_null` · `accepted_values` · `relationships`.

**Nguyên tắc của mọi test dbt: câu SQL trả về CÁC DÒNG SAI. Trả 0 dòng = pass.**

Đây là chỗ hay hiểu ngược — viết câu SQL "kiểm tra đúng" là test luôn fail.

```sql
-- tests/doanh_thu_khong_am.sql  → trả dòng nào là dòng đó sai
select * from {{ ref('mart_doanh_thu') }} where thanh_tien < 0
```

## 2. Tầng CONTRACT — chặn schema sai trước khi tạo

Từ dbt 1.5. Khai kiểu dữ liệu trong `schema.yml` với `contract: enforced` — warehouse
**từ chối build** nếu model sinh ra sai kiểu hoặc thiếu cột.

Khác test ở chỗ căn bản: test chạy *sau*, phát hiện thì bảng hỏng đã tồn tại và
dashboard đã đọc nó. Contract chặn *trước*, bảng hỏng không bao giờ ra đời.

Dùng cho model có người khác phụ thuộc vào (mart mà API đọc).

## 3. Tầng UNIT TEST — bắt SQL sai, không cần dữ liệu thật

Từ dbt 1.8. Cho input giả, khai output mong đợi, dbt chạy **logic** của model.

Khác hẳn hai tầng trên: test và contract kiểm **dữ liệu**, unit test kiểm **phép
biến đổi**. Một model tính sai công thức vẫn có thể pass hết `unique`/`not_null` —
dữ liệu hợp lệ, kết quả sai.

Dùng cho model có logic phức tạp: phân loại nhiều nhánh, tính toán theo điều kiện.

---

## 4. Sáu chiều chất lượng — công cụ dbt cho từng chiều

Khung sáu chiều là **khái niệm chung của ngành**, không riêng dbt — nó ở
[Data Quality: Sáu chiều chất lượng](../../data-quality/six-dimensions.md). Ở đây chỉ
ánh xạ sang công cụ dbt tương ứng:

| Chiều | Công cụ dbt |
|---|---|
| **Uniqueness** | `unique`, `dbt_utils.unique_combination_of_columns` |
| **Completeness** | `not_null`, `dbt_utils.not_null_proportion` |
| **Validity** | `accepted_values`, `dbt_utils.accepted_range` |
| **Integrity** | `relationships` |
| **Timeliness** | `dbt source freshness` (khai trên **source**, không phải model) |
| **Accuracy** | **không có test dựng sẵn** — phải viết singular test đối chiếu nguồn |

Hai chiều cuối là hai chiều bị bỏ nhiều nhất và bắt được lỗi đắt nhất. Xem tài liệu
khái niệm để hiểu vì sao.

---

## 5. Trường hợp thật — test fail vì test sai, không phải dữ liệu sai

**Đã chạy thật 30/07/2026** tại `~/Documents/learn-lab/dbt` (dbt 1.12.0 + DuckDB).

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

## 6. Xử lý khi test fail

Không phải cái gì fail cũng phải chặn pipeline:

```yaml
tests:
  - unique:
      config:
        severity: warn          # warn | error
        error_if: ">100"        # ngưỡng: cảnh báo dưới 100, chặn từ 100
        warn_if: ">0"
```

Và **`dbt test --store-failures`** — lưu các dòng fail vào một bảng để soi. Không có
nó thì chỉ biết "37 dòng sai", không biết sai cái gì, và sẽ không ai đi điều tra.

## 7. Thứ tự nên làm (đừng viết test theo cảm hứng)

1. **Xác định GRAIN trước tiên.** Một dòng của bảng này đại diện cho cái gì? Sai
   bước này thì mọi test sau đều sai.
2. `not_null` + `unique` lên đúng grain đó. Grain tổ hợp thì dùng
   `dbt_utils.unique_combination_of_columns`, **không** dùng `unique` một cột.
3. `relationships` cho mọi khoá ngoại.
4. `accepted_values` cho cột trạng thái/phân loại.
5. `source freshness` cho nguồn.
6. Singular test cho luật nghiệp vụ và cho accuracy.
7. Contract cho model có người khác đọc.

## 8. Sai lầm hay mắc

- Đặt `unique` lên cột **tưởng** là khoá → fail, rồi đổ tại dữ liệu thay vì sửa test.
- Viết singular test theo lối "kiểm tra đúng" thay vì "trả về dòng sai" → luôn fail.
- Test hết mọi thứ ở `severity: error` → pipeline đỏ liên tục, rồi bắt đầu bỏ qua
  màu đỏ, và lúc đó test thành vô dụng.
- Quên `freshness` → nguồn chết mà mọi test vẫn xanh.

## Liên kết

- [dbt là gì](what-is-dbt.md) §4 — test biên dịch ra SQL gì
- [Bài tập](../../tutorials/dbt-lab-duckdb.md) bài 3 — chạy lại đúng ca ở §5
- [Mục lục dbt](index.md)
