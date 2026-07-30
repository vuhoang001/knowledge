---
type: note
tags: [dbt, data-quality, testing]
next-review:
updated: 2026-07-30
---

# Data quality trong dbt có 3 tầng, không phải chỉ "viết test"

> **Chốt:** Test bắt dữ liệu sai *sau khi* đã tạo ra. Contract chặn schema sai *trước
> khi* tạo. Unit test bắt SQL sai *không cần dữ liệu*. Ba thứ khác nhau, đừng gọi
> chung là "test".

## Vấn đề

Hỏi "dbt làm data quality thế nào" thì câu trả lời thường gặp là liệt kê 4 test có
sẵn rồi hết. Nhưng 4 cái đó chỉ là một góc nhỏ, và chọn sai tầng thì test xanh mà
dữ liệu vẫn sai.

## Tầng 1 — TEST: bắt dữ liệu sai sau khi đã tạo

Chạy bằng `dbt test`. Có **4 cơ chế**, khác nhau ở chỗ viết ở đâu và tái dùng được không:

| Cơ chế | Viết ở đâu | Tái dùng | Dùng khi |
|---|---|---|---|
| **Generic có sẵn** | `schema.yml` | ✅ | 90% nhu cầu — 4 cái dưới |
| **Singular** | file `.sql` trong `tests/` | ❌ một lần | luật nghiệp vụ riêng của một bảng |
| **Generic tự viết** | macro `{% test ten() %}` | ✅ | luật lặp lại ở nhiều model |
| **Từ package** | `packages.yml` | ✅ | `dbt_utils`, `dbt_expectations` |

Bốn generic có sẵn: `unique` · `not_null` · `accepted_values` · `relationships`.

**Singular test là SQL trả về CÁC DÒNG SAI.** Trả 0 dòng = pass. Đây là chỗ hay hiểu
ngược — viết câu SQL "kiểm tra đúng" là test luôn fail.

```sql
-- tests/doanh_thu_khong_am.sql  → trả dòng nào là dòng đó sai
select * from {{ ref('mart_doanh_thu') }} where thanh_tien < 0
```

## Tầng 2 — CONTRACT: chặn schema sai trước khi tạo

Từ dbt 1.5. Khai kiểu dữ liệu trong `schema.yml` với `contract: enforced` — warehouse
**từ chối build** nếu model sinh ra sai kiểu hoặc thiếu cột.

Khác test ở chỗ căn bản: test chạy *sau*, phát hiện thì bảng hỏng đã tồn tại và
dashboard đã đọc nó. Contract chặn *trước*, bảng hỏng không bao giờ ra đời.

Dùng cho model có người khác phụ thuộc vào (mart mà API đọc).

## Tầng 3 — UNIT TEST: bắt SQL sai, không cần dữ liệu thật

Từ dbt 1.8. Cho input giả, khai output mong đợi, dbt chạy **logic** của model.

Khác hẳn hai tầng trên: test và contract kiểm **dữ liệu**, unit test kiểm **phép
biến đổi**. Một model tính sai công thức vẫn có thể pass hết `unique`/`not_null` —
dữ liệu hợp lệ, kết quả sai.

Dùng cho model có logic phức tạp: phân loại nhiều nhánh, tính toán theo điều kiện.

## Sáu chiều chất lượng — bản đồ để biết mình đang bỏ sót gì

Đây là khung chung của ngành dữ liệu, không riêng dbt. Soi vào để thấy lỗ hổng:

| Chiều | Câu hỏi | Công cụ dbt |
|---|---|---|
| **Uniqueness** | có trùng không | `unique`, `dbt_utils.unique_combination_of_columns` |
| **Completeness** | có thiếu không | `not_null`, `dbt_utils.not_null_proportion` |
| **Validity** | giá trị có hợp lệ không | `accepted_values`, `dbt_utils.accepted_range` |
| **Integrity** | khoá ngoại có trỏ đúng không | `relationships` |
| **Timeliness** | dữ liệu có cũ quá không | `dbt source freshness` |
| **Accuracy** | có khớp sự thật không | **singular test đối chiếu** — khó nhất |

**Accuracy là chiều không có test dựng sẵn** và cũng là chiều đau nhất. Cách duy
nhất: đối chiếu với nguồn khác (tổng doanh thu mart phải bằng tổng ở hệ nguồn). Năm
chiều kia xanh hết mà accuracy sai thì số vẫn sai.

**Timeliness hay bị quên nhất.** `dbt source freshness` với `warn_after`/`error_after`
— nếu nguồn ngừng cập nhật, mọi test khác vẫn xanh vì dữ liệu *cũ* vẫn *hợp lệ*.

## Xử lý khi test fail

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

## Thứ tự nên làm (đừng viết test theo cảm hứng)

1. **Xác định GRAIN trước tiên.** Một dòng của bảng này đại diện cho cái gì? Sai
   bước này thì mọi test sau đều sai — xem [[phan-trang-client-vs-server]] cho cùng
   lớp lỗi ở chỗ khác.
2. `not_null` + `unique` lên đúng grain đó. Grain tổ hợp thì dùng
   `dbt_utils.unique_combination_of_columns`, **không** dùng `unique` một cột.
3. `relationships` cho mọi khoá ngoại.
4. `accepted_values` cho cột trạng thái/phân loại.
5. `source freshness` cho nguồn.
6. Singular test cho luật nghiệp vụ và cho accuracy.
7. Contract cho model có người khác đọc.

## Sai lầm hay mắc

- Đặt `unique` lên cột **tưởng** là khoá → fail, rồi đổ tại dữ liệu thay vì sửa test.
- Viết singular test theo lối "kiểm tra đúng" thay vì "trả về dòng sai" → luôn fail.
- Test hết mọi thứ ở `severity: error` → pipeline đỏ liên tục, rồi bắt đầu bỏ qua
  màu đỏ, và lúc đó test thành vô dụng.
- Quên `freshness` → nguồn chết mà mọi test vẫn xanh.

## Chưa kiểm chứng

Nội dung trên **chưa chạy tay**. Kiểm bằng bài 3 trong [dbt](../03-topics/dbt.md)
tại `~/Documents/learn-lab/dbt` — đặt `unique` lên `don_hang_id` (grain thật là cặp
`don_hang_id, dong`), xem nó fail, rồi sửa bằng `unique_combination_of_columns`.

Chạy xong thì xoá mục này và ghi kết quả vào ô "Kết quả" của bài 3.

## Liên kết

- [dbt](../03-topics/dbt.md) — module chủ
- [[phan-trang-client-vs-server]] — cùng lớp lỗi: áp khuôn chung lên dữ liệu khác grain
