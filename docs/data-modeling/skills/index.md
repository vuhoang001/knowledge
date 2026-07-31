---
title: Kỹ năng — Data Modeling
sidebar_position: 0
description: "Kỹ thuật áp dụng vào một tình huống cụ thể — đứng trên phần Tài liệu, không thay thế nó."
tags: [skill, data-modeling]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Kỹ năng — Data Modeling

Kỹ thuật áp dụng vào một tình huống cụ thể — đứng **trên** phần Tài liệu, không thay thế nó.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 1 | [SCD — Slowly Changing Dimension](scd.md) | Khi thuộc tính của một thực thể thay đổi, báo cáo về quá khứ nên dùng  | 📝 lý thuyết |
| 2 | [Junk dimension và cột cardinality thấp](junk-dimension.md) | Cột trạng thái vài giá trị: để thẳng trong fact, tách dimension riêng | 🟡 draft |
| 3 | [Mini-dimension](mini-dimension.md) | Dim lớn có vài cột đổi nhanh — tách sao cho Type 2 không phình | 🟡 draft |
| 4 | [Role-playing dimension](role-playing-dimension.md) | Một dim đóng nhiều vai trong cùng fact (ngày đặt / giao / thanh toán) | 🟡 draft |
| 5 | [Conformed dimension](conformed-dimension.md) | Điều kiện để cộng được số từ hai fact khác nhau | 🟡 draft |
| 6 | [Bridge table](bridge-table.md) | Quan hệ nhiều-nhiều — hệ số phân bổ để tổng không phồng | 🟡 draft |

**Thứ tự đọc:** SCD trước, vì bốn kỹ thuật sau đều tham chiếu tới nó. Mini-dimension
chính là SCD Type 4 nhìn kỹ hơn.

## Related Topics

- [Data Modeling](../index.md) — chủ đề chứa thư mục này
