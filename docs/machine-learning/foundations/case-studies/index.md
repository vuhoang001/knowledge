---
title: Case study — Foundations
sidebar_position: 0
description: "Sự cố thật đã debug xong, kèm giả thuyết sai lúc đầu và con số trước/sau."
tags: [case-study, machine-learning]
domain: ai
category: index
doc_type: index
updated: 2026-09-29
---

# Case study — Foundations

Mỗi ca đi theo cùng một khung: **tình huống → giả thuyết sai → tái hiện → kết quả →
cơ chế → cách chặn**. Bảng đánh đổi thì đọc xong quên; con số cụ thể thì nhớ.

| # | Case study | Con số đáng nhớ | Minh hoạ cho |
|---|---|---|---|
| 1 | [Chọn feature trước khi tách](chon-feature-truoc-khi-tach.md) | **0.8667** trên dữ liệu ngẫu nhiên thuần tuý (+32,2 điểm %) | [Scikit-Learn API](../reference/sklearn-api-design.md) · [Overfitting](../reference/overfitting-underfitting.md) |
| 2 | [Accuracy 89,81% cho model không làm gì](accuracy-cao-ma-model-vo-dung.md) | **0.8981** accuracy với precision và recall bằng **0** | [Metric hiệu năng](../reference/performance-metrics.md) |
| 3 | [Luxembourg 11,22 trên thang 0–10](luxembourg-11-22.md) | **11,22** cho một thang điểm **0–10**, không cảnh báo nào | [Dữ liệu xấu](../reference/bad-data.md) · [Batch và online](../reference/batch-vs-online.md) · [Instance vs model-based](../reference/instance-vs-model-based.md) |
| 4 | [Chọn k bằng test set](chon-k-bang-test-set.md) | Lạc quan **12,1%**; **184/200** lần con số đẹp hơn sự thật | [Kiểm thử và thẩm định](../reference/testing-and-validating.md) |
| 5 | [k-means không đặt tên được nhóm](k-means-khong-dat-ten-duoc-nhom.md) | Cắt đúng khe **3.453 USD**, và không xuất ra nghĩa nào | [Học có giám sát và không giám sát](../reference/supervised-unsupervised.md) |

## Related Topics

- [Foundations](../index.md) — chủ đề chứa thư mục này
- [Tài liệu](../reference/index.md) — phần lý thuyết mà các ca này minh hoạ
