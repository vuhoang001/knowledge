---
title: "89.81% accuracy for a model that does nothing"
sidebar_position: 2
description: "A DummyClassifier always answering 'no' scores 0.8981 on imbalanced data, while its precision and recall are both zero."
tags: [metrics, accuracy, precision, recall, class-imbalance, homl3]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# 89.81% accuracy for a model that does nothing

> **Takeaway:** A classifier that returns `False` for **every** input scores an accuracy
> of **0.8981**. That same model has precision, recall and F1 all equal to **0.0000**.
> All four numbers are correct — only three of them are honest.

## Situation

Handwritten digit recognition, reduced to a binary question: *"is this image the digit
5"*. This is exactly the opening problem of HOML3 chapter 3.

The positive class — the digit 5 — is about **10%** of the data. Nine images out of ten
are **not** a 5.

## The first hypothesis — and where it is wrong

> "Accuracy near 90%, so this model is usable."

Accuracy counts `TN` (correctly identified negatives) too. When the negative class is 90%
of the data, `TN` dominates the numerator and accuracy becomes a measurement of *"is the
negative class large"* — a fact about the **data**, not about the **model**.

## Reproduction

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1.
Seed `random_state=42`.

```python
X, y = load_digits(return_X_y=True)
y5 = (y == 5)
Xtr, Xte, ytr, yte = train_test_split(X, y5, test_size=0.3, random_state=42, stratify=y5)

dummy = DummyClassifier(strategy="most_frequent").fit(Xtr, ytr)   # luon doan "khong"
sgd   = SGDClassifier(random_state=42, max_iter=1000).fit(Xtr, ytr)
```

`DummyClassifier(strategy="most_frequent")` **learns nothing** — it counts which class is
more common in the training set and returns that forever.

## Result

```text
ty le lop duong trong train: 0.1010  (127/1257)
ty le lop duong trong test : 0.1019  (55/540)

DummyClassifier (luon doan 'khong')
   accuracy : 0.8981
   precision: 0.0000
   recall   : 0.0000
   F1       : 0.0000

SGDClassifier
   accuracy : 0.9926
   precision: 0.9811
   recall   : 0.9455
   F1       : 0.9630

confusion matrix cua SGDClassifier  [[TN FP] [FN TP]]:
[[484   1]
 [  3  52]]

ROC-AUC cua SGDClassifier: 0.9972
ROC-AUC cua Dummy        : 0.5000
```

| Metric | Dummy | SGD | Does it unmask the Dummy |
|---|---|---|---|
| Accuracy | **0.8981** | 0.9926 | ❌ No — 89.81% sounds usable |
| Precision | 0.0000 | 0.9811 | ✅ Yes |
| Recall | 0.0000 | 0.9455 | ✅ Yes |
| F1 | 0.0000 | 0.9630 | ✅ Yes |
| ROC-AUC | 0.5000 | 0.9972 | ✅ Yes — and 0.5 is the absolute random-guess mark |

## Mechanism

The test set holds 540 images, 55 of them a 5 and 485 not.

`DummyClassifier` returns `False` for all 540:

```text
TN = 485    FP = 0
FN = 55     TP = 0
```

- Accuracy = `(0 + 485) / 540` = **0.8981** — `TN` alone carries the entire number.
- Precision = `0 / (0 + 0)` → defined as 0. **`TN` appears nowhere.**
- Recall = `0 / (0 + 55)` = 0. No `TN` either.

That is the whole mechanism: **precision and recall survive class imbalance because their
formulas contain no `TN`.**

## The second number worth noticing

Look at `SGDClassifier`'s confusion matrix:

```text
[[484   1]
 [  3  52]]
```

Only **1 false alarm** but **3 misses**. That is why recall (0.9455) sits below precision
(0.9811). F1 = 0.9630 merges the two and **hides that imbalance**.

For digit recognition this is harmless. If that same matrix came from a cancer screening
system, the number at the top of the report would have to be **3 missed cases**, not
"F1 = 0.96".

## How to prevent it

1. **Always run `DummyClassifier` as the floor.** One line of code. If the real model does
   not clearly beat it, either the features are useless or there is a bug.

   ```python
   DummyClassifier(strategy="most_frequent").fit(Xtr, ytr).score(Xte, yte)
   ```

2. **Report the class rate alongside every metric.** "Accuracy 0.8981" is meaningless
   without "the positive class is 10.19%".

3. **Never report accuracy alone** on an imbalanced problem. The minimum is precision,
   recall, and the confusion matrix.

4. **Do not forget `stratify=y`** when splitting. Without it the class rates drift between
   train and test, and every metric drifts with them irreproducibly.

## Related Topics

- [Performance metrics](../reference/performance-metrics.md) — the full formulas and how to choose a metric
- [The Machine Learning landscape](../reference/ml-landscape.md) — the metric is **P**, fixed before training
- [Case study: selecting features before the split](chon-feature-truoc-khi-tach.md) — the other kind of beautiful, meaningless number
- [Foundations](../index.md) — the topic this file belongs to
