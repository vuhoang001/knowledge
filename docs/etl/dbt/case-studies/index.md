---
title: Case study — dbt
sidebar_position: 0
description: Sự cố dbt thật đã debug xong, kèm giả thuyết sai lúc đầu.
tags: [case-study, dbt]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Case study — dbt

Sự cố **thật**, đã debug xong. Mỗi bài ghi cả **giả thuyết sai lúc đầu**, không chỉ cách
đúng cuối cùng — chỗ mất thời gian nằm ở giả thuyết sai, không nằm ở lời giải.

| Ngày | Sự cố | Bài học |
|---|---|---|
| 30/07/2026 | [AI sinh sai tên catalog Trino](ai-sinh-sai-ten-catalog-trino.md) | Chi tiết môi trường phải kiểm bằng lệnh, không bằng cách đọc |

## Một ca nằm ở chỗ khác, có chủ ý

Ca **`unique` trên `don_hang_id`** (30/07/2026) nằm trong
[Test và data quality §5](../testing.md), không tách ra đây.

Lý do: nó là ví dụ mà cả file `testing.md` được dựng quanh — tách ra thì file đó mất
phần chứng minh, và kho có hai bản của cùng một câu chuyện. Luật cứng #3: một kiến thức
một chỗ. Trang này dẫn tới, không chép lại.

## Related Topics

- [dbt](../index.md) — chủ đề chứa thư mục này
- [Test và data quality](../testing.md) — chứa ca thứ hai
