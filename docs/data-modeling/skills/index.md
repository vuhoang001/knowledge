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
| 2 | [Phát hiện thay đổi cho SCD 2](scd-change-detection.md) | Biết dòng nào đã đổi: so cột, hash, `updated_at`, CDC | 🟡 draft |
| 3 | [Junk dimension và cột cardinality thấp](junk-dimension.md) | Cột trạng thái vài giá trị: để thẳng, tách riêng, hay gộp | 🟡 draft |
| 4 | [Mini-dimension](mini-dimension.md) | Dim lớn có vài cột đổi nhanh — tách sao cho Type 2 không phình | 🟡 draft |
| 5 | [Role-playing dimension](role-playing-dimension.md) | Một dim đóng nhiều vai trong cùng fact | 🟡 draft |
| 6 | [Conformed dimension](conformed-dimension.md) | Điều kiện để cộng được số từ hai fact khác nhau | 🟡 draft |
| 7 | [Bridge table](bridge-table.md) | Quan hệ nhiều-nhiều — hệ số phân bổ để tổng không phồng | 🟡 draft |

**Thứ tự đọc:** SCD (1) trước, rồi Phát hiện thay đổi (2) — hai file này là một cặp: cái
đầu nói *giữ lịch sử thế nào*, cái sau nói *làm sao biết có gì để giữ*. Năm cái còn lại
đọc thứ tự nào cũng được. Mini-dimension chính là SCD Type 4 nhìn kỹ hơn.

## Related Topics

- [Data Modeling](../index.md) — chủ đề chứa thư mục này
