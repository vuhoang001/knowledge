---
title: Sáu chiều chất lượng dữ liệu
sidebar_position: 1
description: Khung chung của ngành để biết mình đang bỏ sót chiều nào — uniqueness, completeness, validity, integrity, timeliness, accuracy.
tags: [data-quality, testing, accuracy, freshness]
domain: data-engineering
category: concept
doc_type: reference
status: review
difficulty: beginner
verified_at:
updated: 2026-07-31
---

# Sáu chiều chất lượng dữ liệu

> **Chốt:** Năm chiều đầu có test dựng sẵn nên ai cũng làm. **Accuracy** — chiều thứ sáu
> — không có test dựng sẵn, và nó là chiều duy nhất bắt được lỗi kiểu "số sai nhưng mọi
> thứ đều xanh". Năm chiều kia xanh hết mà accuracy sai thì số vẫn sai.

## Mục tiêu

Cho một danh sách kiểm để biết **mình đang bỏ sót gì**. Không có khung này thì người ta
viết `unique` với `not_null` rồi tin là đã "làm data quality".

## Tổng quan

Khung chung của ngành dữ liệu, **không phụ thuộc công cụ**:

| Chiều | Câu hỏi | Có test dựng sẵn | Hay bị bỏ quên |
|---|---|---|---|
| **Uniqueness** | Có trùng không | ✅ | |
| **Completeness** | Có thiếu không | ✅ | |
| **Validity** | Giá trị có hợp lệ không | ✅ | |
| **Integrity** | Khoá ngoại có trỏ đúng không | ✅ | |
| **Timeliness** | Dữ liệu có cũ quá không | ✅ | ⚠️ rất hay quên |
| **Accuracy** | Có khớp sự thật không | ❌ **không có** | ⚠️ đau nhất |

## Vì sao Accuracy khác hẳn năm chiều kia

Năm chiều đầu kiểm **hình dạng** của dữ liệu: không trùng, không rỗng, đúng kiểu, khoá
trỏ đúng chỗ. Chúng trả lời được bằng cách nhìn vào *chính bảng đó*.

Accuracy hỏi *"con số này có đúng với thực tế không"* — và không bảng nào tự trả lời
được câu đó. Cách duy nhất: **đối chiếu với một nguồn khác**.

```sql
-- Tổng doanh thu mart phải bằng tổng ở hệ nguồn.
-- Trả về dòng nào là chênh lệch đó — trả 0 dòng = pass.
select
    m.thang,
    m.tong_mart,
    s.tong_nguon,
    m.tong_mart - s.tong_nguon as chenh_lech
from {{ ref('mart_doanh_thu_thang') }} m
join {{ source('his', 'tong_hop_thang') }} s using (thang)
where abs(m.tong_mart - s.tong_nguon) > 1
```

**Đây là test duy nhất bắt được lỗi nhân bản do join sai** — ví dụ khi fact join vào
[dimension SCD Type 2](../data-modeling/dimension-techniques/scd.md#common-mistakes) bằng natural key. Lúc đó
`unique` xanh, `not_null` xanh, `relationships` xanh, số dòng fact đúng — chỉ có tổng tiền
gấp đôi.

## Timeliness — chiều hay bị quên nhất

Nguồn ngừng cập nhật thì **mọi test khác vẫn xanh**, vì dữ liệu *cũ* vẫn *hợp lệ*. Không
trùng, không rỗng, kiểu đúng — chỉ là nó của tuần trước.

Cách duy nhất bắt được: khai ngưỡng tươi trên **source**, không phải trên model.

```yaml
sources:
  - name: his
    tables:
      - name: don_hang
        loaded_at_field: updated_at
        freshness:
          warn_after:  {count: 6,  period: hour}
          error_after: {count: 24, period: hour}
```

## Thứ tự nên làm

Đừng viết test theo cảm hứng — theo thứ tự này:

1. **Xác định [grain](../data-modeling/foundations/grain.md) trước tiên.** Sai bước này thì mọi test
   sau đều sai.
2. `not_null` + `unique` lên **đúng grain đó**. Grain tổ hợp thì dùng test tổ hợp,
   **không** dùng `unique` một cột.
3. Kiểm khoá ngoại (integrity) cho mọi quan hệ.
4. Kiểm miền giá trị (validity) cho cột trạng thái/phân loại.
5. Kiểm độ tươi (timeliness) cho **mọi** source.
6. Test đối chiếu (accuracy) cho các con số có người ra quyết định dựa vào.

Bước 5 và 6 là hai bước bị bỏ nhiều nhất, và cũng là hai bước bắt được lỗi đắt nhất.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Coi 4 test có sẵn là đã "làm data quality" | Bỏ trắng timeliness và accuracy — đúng hai chiều đắt nhất |
| Test hết mọi thứ ở mức `error` | Pipeline đỏ liên tục → người ta bắt đầu bỏ qua màu đỏ → test thành vô dụng |
| Không lưu dòng fail | Chỉ biết "37 dòng sai", không biết sai gì, và sẽ không ai đi điều tra |
| Quên `freshness` | Nguồn chết mà mọi test vẫn xanh |

## FAQ

<details>
<summary>Test xanh hết mà số trên dashboard vẫn sai — nghi gì?</summary>

Theo thứ tự: (1) sai [grain](../data-modeling/foundations/grain.md) → nhân bản do join;
(2) thiếu accuracy → không có gì đối chiếu với nguồn; (3) thiếu timeliness → dữ liệu cũ.
Ba nguyên nhân này chiếm gần hết các ca "xanh mà sai".

</details>

<details>
<summary>Sáu chiều này có phải chuẩn chính thức không?</summary>

Không có một chuẩn duy nhất — DAMA-DMBOK liệt kê nhiều chiều hơn, có tài liệu gộp còn
bốn. Sáu chiều ở đây là bộ dùng được nhất trong thực tế. Giá trị nằm ở chỗ **có một danh
sách để soi**, không nằm ở con số sáu.

</details>

## Related Topics

- [dbt: testing](../etl/dbt/testing.md) — công cụ hiện thực hoá các chiều này
- [Grain](../data-modeling/foundations/grain.md) — bước 0 của mọi test
- [SCD](../data-modeling/dimension-techniques/scd.md) — nơi accuracy bắt được lỗi năm chiều kia bỏ qua

## References

- DAMA-DMBOK — *Data Quality Dimensions*
- dbt docs — *Tests*, *Source freshness*
