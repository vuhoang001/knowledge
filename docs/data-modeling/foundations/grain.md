---
title: Grain
sidebar_position: 1
description: Một dòng của bảng này đại diện cho cái gì — câu hỏi phải trả lời trước khi viết dòng SQL đầu tiên.
tags: [grain, data-modeling, kimball]
domain: data-engineering
category: concept
doc_type: reference
status: review
difficulty: beginner
verified_at: 2026-07-30      # đã gặp thật ở lab dbt
updated: 2026-07-31
---

# Grain

> **Chốt:** Grain là câu trả lời cho *"một dòng của bảng này đại diện cho cái gì?"*.
> Trả lời được bằng **một câu tiếng Việt rõ ràng** thì mọi thứ sau đó đúng theo. Chưa
> trả lời được mà đã viết SQL thì mọi thứ sau đó sai theo.

## Mục tiêu

Chặn lớp lỗi tốn kém nhất trong data engineering: **nhân bản dòng và test sai** — cả
hai đều bắt nguồn từ việc không biết một dòng nghĩa là gì.

## Tổng quan

Grain phải là một câu **cụ thể tới mức không cãi được**:

| ❌ Mơ hồ | ✅ Rõ |
|---|---|
| "bảng đơn hàng" | "một **dòng hàng** trong một đơn hàng" |
| "bảng khách hàng" | "một **phiên bản** của một khách hàng" (nếu SCD Type 2) |
| "doanh thu" | "doanh thu của **một sản phẩm** trong **một ngày** tại **một cửa hàng**" |

Cột nào ghép lại xác định duy nhất một dòng thì đó là grain. Bảng `don_hang_chi_tiet`
có grain là *cặp* `(don_hang_id, dong)` — không phải `don_hang_id`.

**Hệ quả trực tiếp:** grain quyết định test nào đúng, join nào an toàn, và `SUM` nào
ra số thật.

## Ví dụ

Chạy thật 30/07/2026 tại `~/Documents/learn-lab/dbt` (dbt 1.12.0 + DuckDB).

```text
don_hang_id,dong,ma_hang,so_luong,don_gia
DH001,1,SP-A,2,150000
DH001,2,SP-B,1,300000     ← cùng DH001, dòng 2
DH003,1,SP-C,1,900000
DH003,2,SP-A,3,150000
DH003,3,SP-B,2,300000     ← DH003 có 3 dòng
```

Đặt `unique` lên `don_hang_id` — nghe rất hợp lý, "mã đơn hàng phải là duy nhất":

```text
1 of 1 FAIL 4 unique_vd_don_hang_don_hang_id ......... [FAIL 4]
Got 4 results, configured to fail if != 0
```

**Dữ liệu hoàn toàn đúng. Test sai.** Grain là `(don_hang_id, dong)`, không phải
`don_hang_id`. Sửa đúng:

```yaml
tests:
  - dbt_utils.unique_combination_of_columns:
      combination_of_columns: [don_hang_id, dong]
```

```text
Done. PASS=3 WARN=0 ERROR=0 SKIP=0 TOTAL=3
```

## Trade-offs

| Grain mịn hơn | Grain thô hơn |
|---|---|
| Giữ được mọi chi tiết, cộng lên bất cứ mức nào cũng được | Bảng nhỏ, query nhanh |
| Bảng lớn, query chậm hơn | **Mất chi tiết vĩnh viễn** — không tách nhỏ lại được |

**Quy tắc Kimball: luôn chọn grain mịn nhất có thể.** Cộng lên thì lúc nào cũng được;
tách nhỏ ra thì không. Cùng một bất đối xứng như [SCD Type 1 vs Type 2](../dimension-techniques/scd.md#trade-offs).

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Đặt `unique` lên cột **tưởng** là khoá | Test fail, rồi đổ tại dữ liệu thay vì sửa test |
| Join hai bảng khác grain mà không cộng trước | Dòng nhân bản → `SUM` gấp đôi, không có lỗi nào báo |
| Trộn hai grain trong một bảng (dòng tổng + dòng chi tiết) | Mọi phép cộng đều sai gấp đôi |
| Không viết grain vào tài liệu | Người sau đoán sai, và họ không biết là mình đang đoán |

## FAQ

<details>
<summary>Làm sao biết grain của một bảng có sẵn mà không có tài liệu?</summary>

Thử: `SELECT cot_a, cot_b, COUNT(*) FROM bang GROUP BY 1,2 HAVING COUNT(*) > 1`.
Trả về 0 dòng thì `(cot_a, cot_b)` là ứng viên grain. Nhưng vẫn phải hỏi nghiệp vụ —
dữ liệu hôm nay không trùng không có nghĩa là ngày mai không trùng.

</details>

<details>
<summary>Grain và primary key có phải một không?</summary>

Gần như. Grain là *khái niệm* ("một dòng nghĩa là gì"), primary key là *cột hiện thực
hoá* khái niệm đó. Bảng SCD Type 2 là chỗ chúng tách nhau rõ nhất: grain là "một phiên
bản của một khách", PK là surrogate key — một cột nhân tạo không mang nghĩa nghiệp vụ nào.

</details>

<details>
<summary>Test <code>unique</code> pass nhưng số vẫn sai — liên quan gì tới grain?</summary>

Có. `unique` trên một cột không nói gì về bảng có grain tổ hợp. Xác định grain TRƯỚC
khi viết test, đừng viết test rồi suy ra grain.

</details>

## Related Topics

- [SCD](../dimension-techniques/scd.md) — Type 2 làm **đổi grain** của dimension
- [Fact và Dimension](fact-and-dimension.md) — mỗi loại bảng có kiểu grain riêng
- [Quy trình thiết kế](../layout-and-process/design-process.md) — grain là **bước 2**, trước cả việc chọn cột
- [dbt: testing](../../etl/dbt/testing.md) — nơi grain sai lộ ra
- [SQL](../../databases/sql/index.md) — join nhân bản dòng là hệ quả của grain sai

## References

- Kimball & Ross — *The Data Warehouse Toolkit*, "Declare the grain" (bước 2 trong 4 bước)
