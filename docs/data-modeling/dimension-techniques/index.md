---
title: Kỹ thuật trên dimension
sidebar_position: 0
description: Các kỹ thuật áp dụng lên nền tảng fact/dimension — xử lý thay đổi, và xử lý cột cardinality thấp.
tags: [data-modeling, dimension, kimball]
domain: data-engineering
category: pattern
doc_type: index
status: stable
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Kỹ thuật trên dimension

Tầng này áp dụng **lên** [Nền tảng](../foundations/index.md), không thay thế nó. Mỗi
file ở đây trả lời một câu hỏi dạng *"đã có fact và dimension rồi, giờ tình huống X thì
xử lý ra sao"*.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | [**SCD**](scd.md) | Giá trị dimension đổi thì lịch sử xử lý thế nào (Type 0–6) | 📝 review |
| 02 | [Junk dimension](junk-dimension.md) | Cột vài giá trị: để thẳng trong fact, tách riêng, hay gộp | 📝 draft |

## Điều kiện vào tầng này

Trước khi đọc bất kỳ file nào ở đây, phải trả lời được ba câu:

1. Grain của fact là gì? — nếu chưa chốt, mọi lựa chọn dưới đây đều không quyết được
2. Cột đang bàn là số đo hay thuộc tính mô tả?
3. Dimension đang dùng surrogate key hay natural key?

Cả ba nằm ở [Nền tảng](../foundations/index.md).

## Còn thiếu

Tầng này sẽ còn nhận thêm: mini-dimension (tách thuộc tính đổi nhanh khỏi dim lớn),
role-playing dimension (một dim đóng nhiều vai trong cùng fact), conformed dimension
(dùng chung giữa nhiều fact), bridge table (quan hệ nhiều-nhiều).

## Related Topics

- [Nền tảng](../foundations/index.md) — tầng dưới, phải chắc trước
- [Bố trí và quy trình](../layout-and-process/index.md) — tầng trên, quyết định ở mức toàn mô hình
- [Data Modeling](../index.md) — bản đồ toàn nhóm
