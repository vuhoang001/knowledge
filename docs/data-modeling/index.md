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

Ba tầng, đọc từ dưới lên. **Tầng trên đứng trên tầng dưới** — không phải ba nhóm ngang
hàng để chọn cái nào cũng được.

### [1. Nền tảng](foundations/index.md) — không đổi khi đổi công cụ

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 01 | [Grain](foundations/grain.md) | Một dòng của bảng này đại diện cho **cái gì** | beginner | ✅ đã gặp thật |
| 02 | [Fact và Dimension](foundations/fact-and-dimension.md) | Hai loại bảng, 3 loại fact, vì sao tách | beginner | 📝 review |
| 03 | [Surrogate key và Natural key](foundations/surrogate-key.md) | Vì sao không dùng thẳng mã nghiệp vụ | intermediate | 📝 draft |

### [2. Kỹ thuật trên dimension](dimension-techniques/index.md) — áp dụng lên tầng 1

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 04 | [**SCD**](dimension-techniques/scd.md) | Giá trị đổi thì lịch sử xử lý thế nào (Type 0–6) | intermediate | 📝 review |
| 05 | [Junk dimension](dimension-techniques/junk-dimension.md) | Cột trạng thái vài giá trị: để thẳng, tách riêng, hay gộp | intermediate | 📝 draft |

### [3. Bố trí và quy trình](layout-and-process/index.md) — mức toàn mô hình

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 06 | [Quy trình thiết kế 4 bước](layout-and-process/design-process.md) | Từ yêu cầu nghiệp vụ tới bảng — theo thứ tự nào | intermediate | 📝 review |
| 07 | [Star, Snowflake, OBT](layout-and-process/star-snowflake-obt.md) | Ba cách bố trí, đánh đổi giữa chúng | intermediate | 📝 draft |

Ký hiệu: ✅ đã chạy tay và xác nhận · 📝 lý thuyết, `verified_at` còn trống

Cột `#` là **thứ tự học** chạy xuyên cả ba tầng, và cũng là thứ tự sidebar
(`sidebar_position` trong frontmatter). Hai chỗ này phải khớp nhau — lệch là sidebar dẫn
người đọc đi sai đường.

**Cách phân tầng:** một file thuộc tầng 1 nếu bỏ nó đi thì các tầng trên không đọc được;
thuộc tầng 2 nếu nó xử lý một tình huống *trên* một mô hình đã có; thuộc tầng 3 nếu nó
quyết định thứ áp cho **nhiều bảng cùng lúc** chứ không phải một bảng.

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
