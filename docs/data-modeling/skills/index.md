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
| 8 | [Degenerate dimension](degenerate-dimension.md) | Số đơn hàng không có thuộc tính nào — ở lại fact, đừng dựng bảng | 📝 lý thuyết |
| 9 | [Cây phân cấp](hierarchy.md) | Cây sâu không đều: dẹt cố định, kéo cấp cha, hay bridge đường đi | 📝 lý thuyết |
| 10 | [Dữ liệu về muộn](late-arriving.md) | Fact về sau khi dimension đã đổi, và dimension về sau fact | 📝 lý thuyết |
| 11 | [Aggregate fact table](aggregate-fact-table.md) | Bảng tổng hợp: chỉ lưu số cộng được, dim rút gọn sinh từ dim gốc | 📝 lý thuyết |
| 12 | [Nhiều tiền tệ và đơn vị đo](multi-currency-uom.md) | Chốt cả số gốc lẫn số quy đổi vào fact, đừng quy đổi lúc đọc | 📝 lý thuyết |
| 13 | [Audit dimension](audit-dimension.md) | Mỗi dòng fact trỏ về lần chạy sinh ra nó — xoá đúng thứ phải xoá | 📝 lý thuyết |
| 14 | [NULL trong fact và dimension](null-handling.md) | Logic ba trị làm bộ lọc âm thầm nuốt dòng | 📝 lý thuyết |
| 15 | [Conformed facts](conformed-facts.md) | Ghép được rồi, nhưng hai số đó có so được với nhau không | 📝 lý thuyết |
| 16 | [Thiết kế thuộc tính dimension](dimension-attribute-design.md) | Cờ dạng chữ, nhiều cây phân cấp, drill down, ghi chú tự do | 📝 lý thuyết |
| 17 | [Header/line và phân bổ fact](allocated-facts.md) | Số đo cấp đơn xuống cấp dòng, và P&L theo sản phẩm | 📝 lý thuyết |
| 18 | [Centipede fact table](centipede-fact.md) | Fact hai chục khoá ngoại cho vài chiều thật | 📝 lý thuyết |
| 19 | [Year-to-date và timespan](ytd-timespan-facts.md) | Luỹ kế thì đừng lưu; khoảng hiệu lực thì phải lưu | 📝 lý thuyết |
| 20 | [Đưa hành vi vào dimension](behavior-dimension.md) | Số tổng hợp làm thuộc tính, phân khoảng động, nhóm nghiên cứu, step | 📝 lý thuyết |
| 21 | [Thực thể không đồng nhất](heterogeneous-schema.md) | Supertype/subtype, measure type — khi các loại không chung thuộc tính | 📝 lý thuyết |
| 22 | [Real-time fact table](real-time-fact.md) | Ngày hôm nay chưa đầy nhưng vẫn được đếm là một ngày | 📝 lý thuyết |

**Thứ tự đọc:** SCD (1) trước, rồi Phát hiện thay đổi (2) — hai file này là một cặp: cái
đầu nói *giữ lịch sử thế nào*, cái sau nói *làm sao biết có gì để giữ*. Dữ liệu về muộn
(10) là vế thứ ba của cặp đó: *chuyện gì xảy ra khi dữ liệu không về đúng lúc*. Các cái
còn lại đọc thứ tự nào cũng được. Mini-dimension chính là SCD Type 4 nhìn kỹ hơn.

**Nhóm theo bài toán**, nếu muốn đọc theo nhu cầu thay vì theo số:

| Đang gặp | Đọc |
|---|---|
| Thuộc tính đổi theo thời gian | 1, 2, 4, 10, 19 |
| Cột/bảng nào nên tách, nên gộp | 3, 5, 8, 16, 18, 21 |
| Quan hệ nhiều-nhiều, cây phân cấp | 7, 9 |
| Ghép số từ nhiều nguồn, nhiều đơn vị | 6, 11, 12, 15 |
| Số cộng ra sai mà không ai báo lỗi | 14, 17, 19, 20 |
| Số sai mà không biết sai từ đâu | 13 |
| Dữ liệu chưa đầy, chưa tới, hoặc tới muộn | 10, 22 |

## Related Topics

- [Data Modeling](../index.md) — chủ đề chứa thư mục này
