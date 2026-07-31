---
title: Bố trí và quy trình
sidebar_position: 0
description: Quyết định ở mức toàn mô hình — bố trí các bảng ra sao, và đi từ yêu cầu nghiệp vụ tới thiết kế theo thứ tự nào.
tags: [data-modeling, star-schema, kimball]
domain: data-engineering
category: pattern
status: stable
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Bố trí và quy trình

Hai tầng dưới nói về **một bảng**. Tầng này nói về **cả mô hình**: các bảng xếp cạnh
nhau ra sao, và làm thế nào để đi từ một yêu cầu nghiệp vụ mơ hồ tới bộ bảng đó.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | [Quy trình thiết kế 4 bước](design-process.md) | Từ yêu cầu nghiệp vụ tới bảng — theo thứ tự nào | 📝 review |
| 02 | [Star, Snowflake, OBT](star-snowflake-obt.md) | Ba cách bố trí, đánh đổi giữa chúng | 📝 draft |

## Vì sao quy trình đứng trước bố trí

Chọn star hay OBT là **kết quả** của quy trình, không phải điểm xuất phát. Chọn hình
dạng trước rồi nhét nghiệp vụ vào sau là cách chắc chắn nhất để ra một mô hình đúng về
kỹ thuật và vô dụng về nghiệp vụ.

## Related Topics

- [Kỹ thuật trên dimension](../dimension-techniques/index.md) — tầng dưới
- [Data Modeling](../index.md) — bản đồ toàn nhóm
- [dbt](../../etl/dbt/index.md) — công cụ hiện thực hoá thiết kế
