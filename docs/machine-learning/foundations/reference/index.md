---
title: Tài liệu — Foundations
sidebar_position: 0
description: "Giải thích nó là gì, vì sao, đánh đổi ra sao. Đọc nhóm này trước."
tags: [reference, machine-learning]
domain: ai
category: index
doc_type: index
updated: 2026-09-29
---

# Tài liệu — Foundations

Giải thích *nó là gì, vì sao, đánh đổi ra sao*. Đọc nhóm này trước.

| # | Tài liệu | Trả lời câu hỏi | Chương | Trạng thái |
|---|---|---|---|---|
| 1 | [Bản đồ Machine Learning](ml-landscape.md) | Bốn trục phân loại; instance-based vs model-based quyết định artifact lúc deploy | 1 | 🟡 có số chạy thật |
| 2 | [Overfitting và underfitting](overfitting-underfitting.md) | Bảng chẩn đoán hai chiều, sàn nhiễu, và vì sao thêm dữ liệu không chữa underfit | 1, 4 | 🟡 có số chạy thật |
| 3 | [Metric hiệu năng](performance-metrics.md) | RMSE/MAE, confusion matrix, precision/recall/F1, ROC-AUC — cái nào nói dối khi nào | 2, 3 | 🟡 có số chạy thật |
| 4 | [Thiết kế API của Scikit-Learn](sklearn-api-design.md) | Estimator/Transformer/Predictor, và vì sao pipeline là thứ chặn rò rỉ | 2 | 🟡 có số chạy thật |
| 5 | Linear models và gradient descent | Normal equation vs batch/stochastic/mini-batch GD | 4 | ⬜ |
| 6 | Regularization | Ridge, Lasso, Elastic Net, early stopping | 4 | ⬜ |
| 7 | Logistic và Softmax regression | Từ tổng có trọng số tới xác suất | 4 | ⬜ |
| 8 | Support Vector Machine | Large margin, soft margin, kernel trick | 5 | ⬜ |
| 9 | Decision tree | CART, Gini vs entropy, variance cao | 6 | ⬜ |
| 10 | Ensemble | Bagging, boosting, stacking | 7 | ⬜ |
| 11 | Giảm chiều | Curse of dimensionality, PCA | 8 | ⬜ |
| 12 | Clustering | k-means, DBSCAN, Gaussian mixture | 9 | ⬜ |

Ký hiệu: ✅ chủ repo đã chạy tay và điền `verified_at` · 🟡 có output chạy thật dán lại,
`verified_at` còn trống · ⬜ chưa viết

## Related Topics

- [Foundations](../index.md) — chủ đề chứa thư mục này
- [Case study](../case-studies/index.md) — mỗi tài liệu ở trên có ít nhất một ca hỏng cụ thể
