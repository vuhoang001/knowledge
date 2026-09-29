---
title: Reference — Foundations
sidebar_position: 0
description: "What it is, why, and what the trade-off is. Read this group first."
tags: [reference, machine-learning]
domain: ai
category: index
doc_type: index
updated: 2026-09-29
---

# Reference — Foundations

Explains *what it is, why, and what the trade-off is*. Read this group first.

| # | Document | Answers the question | Ch. | Status |
|---|---|---|---|---|
| 1 | [The Machine Learning landscape](ml-landscape.md) | Four classification axes; instance- vs model-based decides what you ship | 1 | 🟡 real numbers |
| 2 | [Overfitting and underfitting](overfitting-underfitting.md) | A two-way diagnostic table, the noise floor, and why more data never fixes underfitting | 1, 4 | 🟡 real numbers |
| 3 | [Performance metrics](performance-metrics.md) | RMSE/MAE, confusion matrix, precision/recall/F1, ROC-AUC — which one lies, and when | 2, 3 | 🟡 real numbers |
| 4 | [Scikit-Learn's API design](sklearn-api-design.md) | Estimator/Transformer/Predictor, and why a pipeline is what blocks leakage | 2 | 🟡 real numbers |
| 5 | Linear models and gradient descent | Normal equation vs batch/stochastic/mini-batch GD | 4 | ⬜ |
| 6 | Regularization | Ridge, Lasso, Elastic Net, early stopping | 4 | ⬜ |
| 7 | Logistic and Softmax regression | From a weighted sum to a probability | 4 | ⬜ |
| 8 | Support Vector Machines | Large margin, soft margin, the kernel trick | 5 | ⬜ |
| 9 | Decision trees | CART, Gini vs entropy, high variance | 6 | ⬜ |
| 10 | Ensembles | Bagging, boosting, stacking | 7 | ⬜ |
| 11 | Dimensionality reduction | Curse of dimensionality, PCA | 8 | ⬜ |
| 12 | Clustering | k-means, DBSCAN, Gaussian mixtures | 9 | ⬜ |

Symbols: ✅ the repo owner ran it by hand and filled `verified_at` · 🟡 real pasted output,
`verified_at` still empty · ⬜ not written

## Related Topics

- [Foundations](../index.md) — the topic this directory belongs to
- [Case studies](../case-studies/index.md) — every document above has at least one concrete failure
