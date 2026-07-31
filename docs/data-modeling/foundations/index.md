---
title: Nền tảng
sidebar_position: 0
description: Ba khái niệm phải nắm trước mọi thứ khác trong data modeling.
tags: [data-modeling, kimball]
domain: data-engineering
category: concept
status: stable
difficulty: beginner
verified_at:
updated: 2026-07-31
---

# Nền tảng

Ba khái niệm ở tầng này **không phụ thuộc lẫn nhau theo chiều ngang, nhưng mọi thứ ở
tầng trên đều đứng trên chúng.** Chưa chắc phần này thì đọc [Kỹ thuật trên
dimension](../dimension-techniques/index.md) chỉ là học thuộc tên gọi.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | [Grain](grain.md) | Một dòng của bảng này đại diện cho **cái gì** | ✅ đã gặp thật |
| 02 | [Fact và Dimension](fact-and-dimension.md) | Hai loại bảng, ba loại fact, vì sao tách | 📝 review |
| 03 | [Surrogate key và Natural key](surrogate-key.md) | Vì sao không dùng thẳng mã nghiệp vụ làm khoá | 📝 draft |

## Vì sao ba cái này ở cùng một tầng

Chúng là **thứ không đổi khi đổi công cụ**. Grain đúng như nhau trên Postgres, DuckDB,
Iceberg. Sai một trong ba thì mọi kỹ thuật ở tầng trên đều vô nghĩa: chọn SCD Type mấy
không cứu được một bảng khai sai grain.

## Related Topics

- [Kỹ thuật trên dimension](../dimension-techniques/index.md) — tầng kế tiếp
- [Data Modeling](../index.md) — bản đồ toàn nhóm
