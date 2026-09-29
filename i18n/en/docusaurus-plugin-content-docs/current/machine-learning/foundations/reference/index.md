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

## Chapter 1 — The Machine Learning landscape

The seven files below cover **all 11 theory lessons** of HOML3 chapter 1. Every number was
re-run on **the book's own dataset** (`ageron/data`, `lifesat.csv`).

| # | Document | Answers the question | Lesson | St |
|---|---|---|---|---|
| 1 | [What Machine Learning is, and when it is worth it](ml-landscape.md) | Mitchell's T/E/P; four situations where ML beats hand-written rules | b01, b02 | 🟡 |
| 2 | [Axis 1 — Supervised and unsupervised](supervised-unsupervised.md) | Five kinds of supervision; why the label column is the biggest bill | b03–b05 | 🟡 |
| 3 | [Axis 2 — Batch and online learning](batch-vs-online.md) | Full refresh or incremental load; model rot and the learning rate | b06 | 🟡 |
| 4 | [Axis 3 — Instance-based and model-based](instance-vs-model-based.md) | Cyprus worked by hand both ways; the workflow in ten lines | b07, b08 | 🟡 |
| 5 | [Bad data — the first four challenges](bad-data.md) | Four silent failures; sampling noise versus sampling bias | b09 | 🟡 |
| 6 | [Overfitting and underfitting](overfitting-underfitting.md) | The "w" rule right 4 out of 4; regularization as a dial | b10 | 🟡 |
| 7 | [Testing, validating and the train-dev set](testing-and-validating.md) | One set one question; train-dev separates overfitting from data mismatch | b11 | 🟡 |

## Chapters 2–3 — The end-to-end project and classification

| # | Document | Answers the question | Ch. | St |
|---|---|---|---|---|
| 8 | [Performance metrics](performance-metrics.md) | RMSE/MAE, confusion matrix, precision/recall/F1, ROC-AUC | 2, 3 | 🟡 |
| 9 | [Scikit-Learn's API design](sklearn-api-design.md) | Estimator/Transformer/Predictor; the pipeline blocks leakage | 2 | 🟡 |

## Not written yet

| # | Document | Ch. |
|---|---|---|
| 10 | Linear models and gradient descent | 4 |
| 11 | Regularization — Ridge, Lasso, Elastic Net | 4 |
| 12 | Logistic and Softmax regression | 4 |
| 13 | Support Vector Machines | 5 |
| 14 | Decision trees | 6 |
| 15 | Ensembles | 7 |
| 16 | Dimensionality reduction | 8 |
| 17 | Clustering | 9 |

Symbols: ✅ the repo owner ran it by hand and filled `verified_at` · 🟡 real pasted output,
`verified_at` still empty · ⬜ not written

## Related Topics

- [Foundations](../index.md) — the topic this directory belongs to
- [Case studies](../case-studies/index.md) — every document above has at least one concrete failure
