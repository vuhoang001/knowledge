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
> làm hỏng. [SCD Type 2](../skills/scd.md) không tồn tại được nếu thiếu nó.

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

## Bốn loại khoá, không phải hai

Kimball tách rõ hơn cặp natural/surrogate, và sự phân biệt này chỉ lộ ra khi dimension đã
có [SCD](../skills/scd.md) Type 2:

| Loại khoá | Là gì | Ví dụ | Duy nhất theo |
|---|---|---|---|
| **Natural key** | Mã của hệ nguồn | `KH001` từ CRM | Một thực thể **trong một hệ nguồn** |
| **Durable key** | Mã bền của warehouse cho **một thực thể xuyên mọi phiên bản** | `khach_durable_id = 42` | Một thực thể, mãi mãi |
| **Surrogate key** | Khoá của **một phiên bản** dimension | `khach_sk = 137` | Một dòng dimension |
| **Supernatural key** | Durable key khi natural key **không đáng tin** | mã do warehouse cấp sau khi khớp trùng | Một thực thể sau khi hợp nhất |

Ba câu hỏi phân biệt chúng:

```sql
-- "Doanh thu cua don nay, luc do khach o khu vuc nao?"   -> surrogate key
-- "Tong doanh thu ca doi cua khach nay?"                 -> durable key
-- "Ma nay ung voi ban ghi nao ben CRM?"                  -> natural key
```

**Vì sao cần durable key riêng.** Trên dim Type 2, một khách có N dòng và N surrogate key.
Gộp doanh thu cả đời khách thì phải gộp theo cái gì? Natural key làm được — cho tới khi hệ
nguồn đổi mã, hoặc khách tồn tại ở hai hệ nguồn với hai mã. Durable key là cột không bao
giờ đổi, do warehouse cấp và giữ.

```sql
CREATE TABLE dim_khach (
  khach_sk        BIGINT,      -- moi phien ban mot gia tri
  khach_durable   BIGINT,      -- mot khach mot gia tri, xuyen moi phien ban
  khach_id_crm    VARCHAR,     -- natural key, giu de truy vet
  ...
);
```

**Supernatural key** là durable key trong trường hợp khó nhất: natural key **không tin
được** — số CMND nhập sai, khách đăng ký hai lần bằng hai email. Warehouse chạy khớp trùng
rồi tự cấp một mã bền cho thực thể đã hợp nhất. Kimball nhấn mạnh: từ lúc đó, **mã đó mới
là danh tính**, natural key chỉ còn là dữ liệu tham chiếu.

## Khoá thay thế cho chính dòng fact

Fact cũng có thể có surrogate key của riêng nó (`ban_sk`). Khi nào đáng thêm và khi nào
không — xem [year-to-date và timespan](../skills/ytd-timespan-facts.md#fact-table-surrogate-key).

Lưu ý quan trọng: `ban_sk` duy nhất **không** chứng minh grain đúng. Hai dòng trùng grain
vẫn có hai `ban_sk` khác nhau và vẫn qua được test `unique`.

## Cần trả lời

- [ ] Sinh SK bằng gì: dãy tăng dần vs hash (`dbt_utils.generate_surrogate_key`) —
      hash hợp với hệ phân tán vì không cần trạng thái tập trung
- [ ] Dòng đặc biệt: `-1` = "Chưa xác định", `-2` = "Không áp dụng" — vì sao cần
- [ ] `dim_thoi_gian` là ngoại lệ: SK dạng `20260110` đọc được bằng mắt
- [ ] Có nên giữ natural key trong fact không (giữ để truy vết, nhưng **không join bằng nó**)

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Fact join bằng natural key trên dim Type 2 | Doanh thu nhân đôi — xem [SCD](../skills/scd.md#common-mistakes) |
| Để SK là `NULL` khi chưa tìm thấy dimension | Inner join làm **mất dòng** fact; dùng `-1` thay vì `NULL` |
| Gán ý nghĩa vào SK ("SK bắt đầu bằng 9 là khách VIP") | Mất đúng thứ làm SK có giá trị: sự vô nghĩa |
| Không có durable key trên dim Type 2 | Không gộp được "cả đời khách" khi hệ nguồn đổi mã |
| Dùng natural key làm durable key | Sáp nhập hệ nguồn là mất danh tính thực thể |
| Tin `fact_sk` duy nhất là grain đúng | Grain trùng vẫn qua được test `unique` |

## Related Topics

- [SCD](../skills/scd.md) — nơi SK trở thành bắt buộc, và nơi durable key trở nên cần
- [Fact và Dimension](fact-and-dimension.md) — SK là thứ nối hai loại bảng
- [Year-to-date và timespan](../skills/ytd-timespan-facts.md) — khoá thay thế cho dòng fact
- [Grain](grain.md)

## References

- Kimball & Ross — *The Data Warehouse Toolkit*, "Surrogate Keys"
