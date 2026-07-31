---
title: Surrogate key và Natural key
sidebar_position: 3
description: Vì sao không dùng thẳng mã nghiệp vụ làm khoá của dimension — và vì sao SCD Type 2 bắt buộc phải có surrogate key.
tags: [surrogate-key, natural-key, data-modeling, kimball]
domain: data-engineering
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Surrogate key và Natural key

> **Chốt:** Natural key là mã của **hệ nguồn** (`KH001`). Surrogate key là mã của
> **warehouse** — không mang nghĩa nghiệp vụ nào, và chính vì thế nó không bị hệ nguồn
> làm hỏng. [SCD Type 2](../dimension-techniques/scd.md) không tồn tại được nếu thiếu nó.

## Mục tiêu

Trả lời câu hỏi hay bị coi là thừa: *"đã có `khach_hang_id` rồi, thêm `khach_sk` làm gì?"*

## Tổng quan

| | Natural key | Surrogate key |
|---|---|---|
| Ví dụ | `KH001`, số CMND, mã SKU | `1`, `2`, `3` (hoặc hash) |
| Ai sinh ra | Hệ nguồn | Warehouse |
| Mang nghĩa | Có | **Không** — và đó là ưu điểm |
| Trên dim Type 2 | **Lặp lại** qua các phiên bản | Duy nhất mỗi phiên bản |
| Fact trỏ vào | ❌ | ✅ |

## Vì sao cần

- **Hệ nguồn đổi mã.** Sáp nhập công ty, đổi ERP, đổi định dạng mã — natural key đổi
  theo, và mọi fact trỏ vào nó thành mồ côi.
- **Nhiều nguồn cùng một thực thể.** Khách hàng có mã ở CRM và mã khác ở hệ bán hàng.
  Surrogate key là chỗ hợp nhất chúng.
- **SCD Type 2 bắt buộc.** Một khách có nhiều dòng → natural key không còn là khoá.
  Không có SK thì fact không cách nào trỏ tới *đúng phiên bản*.
- **Join số nguyên nhanh hơn join chuỗi.** Lợi ích nhỏ nhất, hay bị nêu đầu tiên.

## Cần trả lời

- [ ] Sinh SK bằng gì: dãy tăng dần vs hash (`dbt_utils.generate_surrogate_key`) —
      hash hợp với hệ phân tán vì không cần trạng thái tập trung
- [ ] Dòng đặc biệt: `-1` = "Chưa xác định", `-2` = "Không áp dụng" — vì sao cần
- [ ] `dim_thoi_gian` là ngoại lệ: SK dạng `20260110` đọc được bằng mắt
- [ ] Có nên giữ natural key trong fact không (giữ để truy vết, nhưng **không join bằng nó**)

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Fact join bằng natural key trên dim Type 2 | Doanh thu nhân đôi — xem [SCD](../dimension-techniques/scd.md#common-mistakes) |
| Để SK là `NULL` khi chưa tìm thấy dimension | Inner join làm **mất dòng** fact; dùng `-1` thay vì `NULL` |
| Gán ý nghĩa vào SK ("SK bắt đầu bằng 9 là khách VIP") | Mất đúng thứ làm SK có giá trị: sự vô nghĩa |

## Related Topics

- [SCD](../dimension-techniques/scd.md) — nơi SK trở thành bắt buộc
- [Fact và Dimension](fact-and-dimension.md) — SK là thứ nối hai loại bảng
- [Grain](grain.md)

## References

- Kimball & Ross — *The Data Warehouse Toolkit*, "Surrogate Keys"
