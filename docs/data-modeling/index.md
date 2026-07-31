---
title: Data Modeling
description: Thiết kế bảng — grain, fact/dimension, SCD, và quy trình đi từ yêu cầu nghiệp vụ tới bảng chạy được.
tags: [data-modeling, kimball]
domain: data-engineering
category: concept
doc_type: index
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

Năm nhóm chuẩn — **mọi chủ đề trong kho đều dùng đúng bộ này**.

### [Tài liệu](reference/index.md) — nó là gì, vì sao, đánh đổi ra sao

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Grain](reference/grain.md) | Một dòng của bảng này đại diện cho **cái gì** | beginner | ✅ đã gặp thật |
| 2 | [Fact và Dimension](reference/fact-and-dimension.md) | Hai loại bảng, 3 loại fact, vì sao tách | beginner | 📝 review |
| 3 | [Surrogate key và Natural key](reference/surrogate-key.md) | Vì sao không dùng thẳng mã nghiệp vụ | intermediate | 📝 draft |
| 4 | [Quy trình thiết kế 4 bước](reference/design-process.md) | Từ yêu cầu nghiệp vụ tới bảng — theo thứ tự nào | intermediate | 📝 review |
| 5 | [Star, Snowflake, OBT](reference/star-snowflake-obt.md) | Ba cách bố trí, đánh đổi giữa chúng | intermediate | 📝 draft |

### [Kỹ năng](skills/index.md) — kỹ thuật áp dụng lên phần trên

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [**SCD**](skills/scd.md) | Giá trị đổi thì lịch sử xử lý thế nào (Type 0–6) | intermediate | 📝 review |
| 2 | [Junk dimension](skills/junk-dimension.md) | Cột trạng thái vài giá trị: để thẳng, tách riêng, hay gộp | intermediate | 📝 draft |

### Ba nhóm còn lại

| Nhóm | Nội dung |
|---|---|
| [Bài tập](tutorials/index.md) | *(chưa có bài riêng cho data modeling)* |
| [Cheatsheet](cheatsheets/index.md) | [SCD — tra nhanh](cheatsheets/scd.md) |
| [Case study](case-studies/index.md) | *(chưa có)* |

Ký hiệu: ✅ đã chạy tay và xác nhận · 📝 lý thuyết, `verified_at` còn trống

Cột `#` là thứ tự học **trong từng nhóm**, và cũng là `sidebar_position`. Hai chỗ này
phải khớp — lệch là sidebar dẫn người đọc đi sai đường.

**Tài liệu hay Kỹ năng?** Tài liệu trả lời *"nó là gì"*; Kỹ năng trả lời *"gặp tình
huống X thì xử lý ra sao"*. SCD và junk dimension đều giả định bạn đã biết grain và
fact/dimension — nên chúng là kỹ năng, không phải nền tảng.

## Vì sao tách "Tài liệu" và "Kỹ năng"

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
- [Cheatsheet SCD](cheatsheets/scd.md)
- [Glossary](../glossary/index.md)
