---
title: Case study — dbt
sidebar_key: dbt-case-studies
sidebar_position: 0
description: "Sự cố thật đã debug xong, kèm giả thuyết sai lúc đầu."
tags: [case-study, dbt]
domain: data-engineering
category: index
doc_type: index
updated: 2026-09-11
---

# Case study — dbt

Sự cố thật đã debug xong, kèm **giả thuyết sai lúc đầu**.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 1 | [Nội dung AI sinh ghi sai tên catalog Trino](ai-sinh-sai-ten-catalog-trino.md) | Một buổi mất vì tin tài liệu do AI sinh — sai ở đúng chỗ khó kiểm nhất | 🟡 draft |
| 2 | [E-commerce — incremental đánh rơi đơn sửa muộn](incremental-mat-don-sua-muon.md) | Số dòng khớp, test xanh, doanh thu vẫn lệch 300k | 📝 có output thật |
| 3 | [Fintech — snapshot ghi nhầm mốc thời gian](snapshot-ghi-nham-moc-thoi-gian.md) | `dbt_valid_from` là giờ chạy job — as-was lệch 25% | 📝 có output thật |
| 4 | [Marketplace — phí ship cộng lặp sau join](phi-ship-cong-lap-sau-join.md) | Join làm phồng grain, `sum()` cột cấp đơn phồng 7% | 📝 có output thật |

## Related Topics

- [dbt](../index.md) — chủ đề chứa thư mục này
