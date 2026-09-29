---
title: Foundations (Scikit-Learn)
description: "ML foundations — HOML3 chapters 1–9: metrics, linear models, SVM, trees, ensembles, PCA, clustering."
category: concept
doc_type: index
status: draft
updated: 2026-09-29
---

# Foundations — Scikit-Learn

**Chapters 1–9 of HOML3.** All of it runs with `scikit-learn` on a laptop. No GPU, no
hand-written training loop, no `tensorflow`.

It is also the part that **pays off fastest**. On tabular data — what a Data Engineer
meets every day — the gradient boosting of chapter 7 usually beats a neural network, and
trains in minutes.

Status: **not started**. The tables below are a planned table of contents.

## Contents

The five standard groups — same as every other topic in this repo.

### Reference — what it is, why, what the trade-off is

| # | Document | Answers the question | Ch. | Level | St |
|---|---|---|---|---|---|
| 1 | ML landscape | Supervised/unsupervised, batch/online, instance- vs model-based | 1 | beginner | ⬜ |
| 2 | Overfitting and underfitting | Why memorising differs from learning, and bias/variance | 1 | beginner | ⬜ |
| 3 | Performance metrics | RMSE vs MAE; precision, recall, F1, ROC-AUC — which one, when | 2, 3 | beginner | ⬜ |
| 4 | Scikit-Learn's API design | Estimator, Transformer, Predictor — why everything composes into a pipeline | 2 | beginner | ⬜ |
| 5 | Linear models and gradient descent | Normal equation vs batch/stochastic/mini-batch GD | 4 | intermediate | ⬜ |
| 6 | Regularization | Ridge, Lasso, Elastic Net, early stopping — which one zeroes features out | 4 | intermediate | ⬜ |
| 7 | Logistic and Softmax regression | From a weighted sum to a probability, and to many classes at once | 4 | intermediate | ⬜ |
| 8 | Support Vector Machines | Large margin, soft margin, and what the kernel trick actually avoids | 5 | advanced | ⬜ |
| 9 | Decision trees | Greedy CART, Gini vs entropy, and why trees are high-variance | 6 | intermediate | ⬜ |
| 10 | Ensembles | Bagging, pasting, boosting, stacking — why many weak models make a strong one | 7 | intermediate | ⬜ |
| 11 | Dimensionality reduction | Curse of dimensionality, projection vs manifold, PCA and explained variance | 8 | advanced | ⬜ |
| 12 | Clustering | k-means, DBSCAN, Gaussian mixtures — and where each one stops working | 9 | intermediate | ⬜ |

### Skills — what to do when you hit situation X

| # | Document | Answers the question | Ch. | Level | St |
|---|---|---|---|---|---|
| 1 | Framing the problem | The 8-step checklist: supervised or not, online or batch, measured how | 2 | beginner | ⬜ |
| 2 | Splitting off a test set | Stratified sampling, and why a random `train_test_split` skews the strata | 2 | beginner | ⬜ |
| 3 | Handling missing values | Drop rows, drop columns, or `SimpleImputer` — and who gets to fit that imputer | 2 | beginner | ⬜ |
| 4 | Encoding categorical features | Ordinal vs one-hot; what to do when cardinality is high | 2 | beginner | ⬜ |
| 5 | Feature scaling | Standard vs min-max; log or quantile transforms for heavy tails | 2 | beginner | ⬜ |
| 6 | Writing custom transformers | The `fit`/`transform`/`get_feature_names_out` contract you must keep | 2 | intermediate | ⬜ |
| 7 | Composing pipelines | `ColumnTransformer` — one branch per column type, exactly one `fit` | 2 | intermediate | ⬜ |
| 8 | Cross-validation | Why a single validation split is not enough to trust | 2 | beginner | ⬜ |
| 9 | Hyperparameter search | Grid vs randomized search — and what each one really costs | 2 | intermediate | ⬜ |
| 10 | Choosing a classification threshold | Slide the threshold along the precision/recall curve to what the business can absorb | 3 | intermediate | ⬜ |
| 11 | Error analysis | Reading the confusion matrix to decide *what to fix next*, not just to report | 3 | intermediate | ⬜ |
| 12 | Multilabel and multioutput | One image, many labels; one output, many dimensions | 3 | intermediate | ⬜ |
| 13 | Reading learning curves | Two curves converging high = underfit; a gap = overfit. Diagnose before fixing | 4 | intermediate | ⬜ |
| 14 | Choosing a regularizer | Ridge by default; Lasso when you suspect useless features; Elastic Net when features correlate | 4 | intermediate | ⬜ |
| 15 | Keeping trees from growing too deep | `max_depth`, `min_samples_leaf` — regularization for a nonparametric model | 6 | intermediate | ⬜ |
| 16 | Choosing k for clustering | Inertia always drops, so it is a trap; the silhouette score is sharper | 9 | intermediate | ⬜ |
| 17 | Semi-supervised labelling | Cluster first, label representatives, then propagate — saves manual labelling | 9 | advanced | ⬜ |
| 18 | Anomaly detection | Gaussian mixtures, Isolation Forest — and the anomaly vs novelty boundary | 9 | advanced | ⬜ |
| 19 | Which algorithm to pick | A decision table by dataset size, feature count, and interpretability needs | 1–9 | intermediate | ⬜ |

### The other three groups

| Group | Planned content |
|---|---|
| Exercises | 8 hands-on labs — end-to-end project (ch2), MNIST (ch3), gradient descent from scratch (ch4), SVM decision boundary (ch5), tree vs forest (ch6–7), PCA image compression (ch8), image segmentation by clustering (ch9), plus an exercise set with answers drawn from the end-of-chapter exercises |
| Cheatsheets | Scikit-Learn API · Metric formulas · Algorithm picker |
| Case studies | 8 cases — scaling before the split, a useless 99% accuracy, data snooping, a random split skewing strata, one-hot blowing up the column count, inertia picking the wrong k, grid search touching the test set, a tree memorising noise |

Symbols: ✅ run by hand and confirmed · 📝 theory, `verified_at` still empty · ⬜ not written

The `#` column is the learning order **within each group**, and also the `sidebar_position`.

## Reference or Skill?

The same boundary as data-modeling: **Reference** answers *"what it is"*, **Skills**
answer *"what to do when you hit situation X"*.

Knowing the precision/recall formula is a concept. Knowing **which threshold is
acceptable for this problem** is a skill — and that is what decides whether the model is
usable. A spam filter tuned for high recall blocks real mail; tuned for high precision it
lets spam through. There is no universally right answer, only one that is right for a
specific business cost.

## Related Topics

- [Machine Learning](../index.md) — the parent topic and shared learning path
- [Deep Learning](../deep-learning/index.md) — chapters 10–19, what comes next
- [Python](../../languages/python/index.md) — NumPy and pandas
- [Data Quality](../../data-quality/index.md) — dirty input, dirty model
