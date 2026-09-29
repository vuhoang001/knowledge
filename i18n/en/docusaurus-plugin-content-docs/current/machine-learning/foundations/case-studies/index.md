---
title: Case studies — Foundations
sidebar_position: 0
description: "Real incidents, already debugged, with the wrong first hypothesis and before/after numbers."
tags: [case-study, machine-learning]
domain: ai
category: index
doc_type: index
updated: 2026-09-29
---

# Case studies — Foundations

Every case follows the same frame: **situation → wrong hypothesis → reproduction →
result → mechanism → how to prevent it**. You forget trade-off tables; you remember numbers.

| # | Case study | The number to remember | Illustrates |
|---|---|---|---|
| 1 | [Selecting features before the split](chon-feature-truoc-khi-tach.md) | **0.8667** on pure random data (+32.2 percentage points) | [Scikit-Learn API](../reference/sklearn-api-design.md) · [Overfitting](../reference/overfitting-underfitting.md) |
| 2 | [89.81% accuracy for a model that does nothing](accuracy-cao-ma-model-vo-dung.md) | **0.8981** accuracy with precision and recall both **0** | [Performance metrics](../reference/performance-metrics.md) |
| 3 | [Luxembourg 11.22 on a 0–10 scale](luxembourg-11-22.md) | **11.22** for a **0–10** scale, with no warning | [Bad data](../reference/bad-data.md) · [Batch and online](../reference/batch-vs-online.md) · [Instance vs model-based](../reference/instance-vs-model-based.md) |
| 4 | [Choosing k on the test set](chon-k-bang-test-set.md) | **12.1%** optimistic; the prettier number wins **184/200** times | [Testing and validating](../reference/testing-and-validating.md) |
| 5 | [k-means cannot name the groups](k-means-khong-dat-ten-duoc-nhom.md) | Cuts the real **3,453 USD** gap, and outputs no meaning | [Supervised and unsupervised](../reference/supervised-unsupervised.md) |

## Related Topics

- [Foundations](../index.md) — the topic this directory belongs to
- [Reference](../reference/index.md) — the theory these cases illustrate
