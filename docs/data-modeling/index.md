---
title: Data Modeling
description: Thiết kế bảng — grain, fact/dimension, SCD, và quy trình đi từ yêu cầu nghiệp vụ tới bảng chạy được.
tags: [data-modeling, kimball]
domain: data-engineering
category: concept
status: stable
difficulty: intermediate
updated: 2026-07-31
---

# Data Modeling

**Đây là nhóm *khái niệm*, không phải công nghệ.** Không có lệnh nào để chạy, không có
phiên bản nào để nâng cấp. Kimball viết những thứ này năm 1996 và chúng vẫn đúng nguyên
trên Iceberg + Trino năm 2026 — trong khi công cụ đã đổi ba thế hệ.

Vì thế đây là phần **mất giá chậm nhất** trong cả kho. Học dbt mà không biết grain là
học cách gõ lệnh; biết grain rồi thì đổi sang công cụ nào cũng làm được.

> Chỗ này trả lời câu **"thiết kế bảng thế nào"**, không phải "chạy bằng gì". Phần chạy
> bằng gì nằm ở [dbt](../etl/dbt/index.md), [Iceberg](../storage/iceberg/index.md),
> [Trino](../query-engines/trino/index.md).

## Nội dung

### Khái niệm — bảng trông ra sao

| Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|
| [Grain](grain.md) | Một dòng của bảng này đại diện cho **cái gì** | beginner | ✅ đã gặp thật |
| [Fact và Dimension](fact-and-dimension.md) | Hai loại bảng, 3 loại fact, vì sao tách | beginner | 📝 review |
| [Surrogate key và Natural key](surrogate-key.md) | Vì sao không dùng thẳng mã nghiệp vụ | intermediate | 📝 draft |
| [**SCD**](scd.md) | Giá trị đổi thì lịch sử xử lý thế nào (Type 0–6) | intermediate | 📝 review |
| [Junk dimension](junk-dimension.md) | Cột trạng thái vài giá trị: để thẳng, tách riêng, hay gộp | intermediate | 📝 draft |
| [Star, Snowflake, OBT](star-snowflake-obt.md) | Ba cách bố trí, đánh đổi giữa chúng | intermediate | 📝 draft |

### Cách làm — làm sao ra được thiết kế đó

| Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|
| [Quy trình thiết kế 4 bước](design-process.md) | Từ yêu cầu nghiệp vụ tới bảng — theo thứ tự nào | intermediate | 📝 review |

Ký hiệu: ✅ đã chạy tay và xác nhận · 📝 lý thuyết, `verified_at` còn trống

## Vì sao chia đôi "khái niệm" và "cách làm"

Biết SCD Type 2 là gì (khái niệm) **không** đồng nghĩa với biết khi nào nên dùng nó
(cách làm). Phần lớn tài liệu chỉ dạy vế đầu — liệt kê Type 1/2/3 kèm ví dụ bảng, rồi
hết. Vế thứ hai mới là chỗ mất tiền:

- Chọn Type 2 cho cột đổi hằng ngày → dimension phình gấp trăm lần, query chậm dần.
- Chọn Type 1 cho cột dùng để chia báo cáo → **báo cáo quá khứ tự đổi số**, và không ai
  biết vì sao tháng 6 tuần này khác tháng 6 tuần trước.

Cả hai lỗi đều **không phải lỗi kỹ thuật**. SQL đúng, test xanh, pipeline xanh. Sai ở
bước quyết định trước khi viết dòng SQL đầu tiên.

## Learning Path

```text
SQL (join, group by)
      ↓
Grain                    ← bắt đầu ở đây
      ↓
Fact và Dimension
      ↓
Surrogate key
      ↓
SCD                      ← trọng tâm
      ↓
Quy trình thiết kế 4 bước
      ↓
Star / Snowflake / OBT
      ↓
Triển khai bằng dbt snapshot
```

**Đường ngắn nhất tới chỗ dùng được: Grain → Fact/Dimension → SCD → Quy trình.**

## Related Topics

- [Data Quality](../data-quality/index.md) — kiểm chứng mô hình sau khi dựng
- [dbt](../etl/dbt/index.md) — công cụ hiện thực hoá
- [SQL](../databases/sql/index.md) — nền của mọi thứ ở đây
- [Cheatsheet SCD](../cheatsheets/scd.md)
- [Glossary](../glossary/index.md)
