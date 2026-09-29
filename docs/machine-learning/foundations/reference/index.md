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

## Chương 1 — Bản đồ Machine Learning

Bảy file dưới phủ **trọn vẹn 11 bài lý thuyết** của chương 1 HOML3. Mọi con số đều chạy
lại trên **chính bộ dữ liệu của sách** (`ageron/data`, `lifesat.csv`).

| # | Tài liệu | Trả lời câu hỏi | Bài | TT |
|---|---|---|---|---|
| 1 | [Machine Learning là gì, và khi nào đáng dùng](ml-landscape.md) | T/E/P của Mitchell; bốn tình huống ML thắng luật viết tay | b01, b02 | 🟡 |
| 2 | [Trục 1 — Học có giám sát, không giám sát](supervised-unsupervised.md) | Năm kiểu giám sát; vì sao cột nhãn là hoá đơn lớn nhất | b03–b05 | 🟡 |
| 3 | [Trục 2 — Batch và online learning](batch-vs-online.md) | Full refresh hay incremental load; model rot và learning rate | b06 | 🟡 |
| 4 | [Trục 3 — Instance-based và model-based](instance-vs-model-based.md) | Cyprus tính tay hai cách; workflow trong mười dòng | b07, b08 | 🟡 |
| 5 | [Dữ liệu xấu — bốn thử thách đầu tiên](bad-data.md) | Bốn kiểu hỏng im lặng; sampling noise vs sampling bias | b09 | 🟡 |
| 6 | [Overfitting và underfitting](overfitting-underfitting.md) | Quy tắc "chữ w" đúng 4/4; regularization như một núm vặn | b10 | 🟡 |
| 7 | [Kiểm thử, thẩm định và train-dev set](testing-and-validating.md) | Một tập, một câu hỏi; train-dev tách overfit khỏi data mismatch | b11 | 🟡 |

## Chương 2–3 — Dự án end-to-end và phân loại

| # | Tài liệu | Trả lời câu hỏi | Chương | TT |
|---|---|---|---|---|
| 8 | [Metric hiệu năng](performance-metrics.md) | RMSE/MAE, confusion matrix, precision/recall/F1, ROC-AUC | 2, 3 | 🟡 |
| 9 | [Thiết kế API của Scikit-Learn](sklearn-api-design.md) | Estimator/Transformer/Predictor; pipeline chặn rò rỉ | 2 | 🟡 |

## Chưa viết

| # | Tài liệu | Chương |
|---|---|---|
| 10 | Linear models và gradient descent | 4 |
| 11 | Regularization — Ridge, Lasso, Elastic Net | 4 |
| 12 | Logistic và Softmax regression | 4 |
| 13 | Support Vector Machine | 5 |
| 14 | Decision tree | 6 |
| 15 | Ensemble | 7 |
| 16 | Giảm chiều | 8 |
| 17 | Clustering | 9 |

Ký hiệu: ✅ chủ repo đã chạy tay và điền `verified_at` · 🟡 có output chạy thật dán lại,
`verified_at` còn trống · ⬜ chưa viết

## Related Topics

- [Foundations](../index.md) — chủ đề chứa thư mục này
- [Case study](../case-studies/index.md) — mỗi tài liệu ở trên có ít nhất một ca hỏng cụ thể
