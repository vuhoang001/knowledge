---
title: Performance metrics
sidebar_position: 3
description: "RMSE, MAE, precision, recall, F1, ROC-AUC — which ones tell the truth and which ones lie when the classes are imbalanced."
tags: [metrics, precision, recall, roc-auc, confusion-matrix, homl3]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Performance metrics

> **Takeaway:** Accuracy is the **only** metric everyone knows and the one that is
> **wrong most often**. On imbalanced data a model that does nothing at all still scores
> 89.81% — a real number, produced by the run below.

## Goal

Pick the measure **before** training, and pick the one that reflects the business cost.
This is the **P** in Mitchell's definition from [The ML landscape](ml-landscape.md) — get
it wrong and everything afterwards optimises the wrong thing.

## Overview

### Regression: RMSE or MAE

| | RMSE | MAE |
|---|---|---|
| Formula | Root of the mean **squared** error | Mean **absolute** error |
| Punishes large errors | **Heavily** — squared | Evenly |
| Sensitive to outliers | Very | Not very |
| Use when | A large error is a disaster | The data has many outliers |

**RMSE is always ≥ MAE.** The gap between them is itself a signal about outliers: close
together means errors are spread evenly; RMSE much larger means a few very bad cases are
dragging it up.

### Classification: start from the confusion matrix

Every binary classification metric is a fraction built from these four cells:

```text
                 Dự đoán: Không    Dự đoán: Có
Thực tế: Không        TN               FP        <- FP: báo động giả
Thực tế: Có           FN               TP        <- FN: bỏ sót
```

| Metric | Formula | Answers |
|---|---|---|
| **Accuracy** | `(TP+TN) / total` | What share did it get right |
| **Precision** | `TP / (TP+FP)` | Of the ones it **flagged**, how many were real |
| **Recall** | `TP / (TP+FN)` | Of the ones that **were** real, how many did it catch |
| **F1** | Harmonic mean of the two above | A single number when you need to compare fast |

A way to never mix them up: **precision reads down the predicted column, recall reads
across the actual row.** Precision's denominator is what the model *said*; recall's is
what actually *is*.

### Why accuracy lies

Accuracy has `TN` in its numerator. When the negative class is 90% of the data, `TN`
swamps everything else and the number becomes a measurement of *"is the negative class
large"* rather than *"is the model good"*.

**Neither precision nor recall contains `TN` anywhere.** That is precisely why they
survive class imbalance.

### The precision / recall trade-off

A classifier does not really return a label — it returns a **score**, then cuts at a
threshold. Move the threshold up: precision rises, recall falls. Move it down: the
reverse. **Changing the threshold can never raise both** — for that you need a different
model.

Which side to favour is a **business** question, not a technical one:

| Problem | Favour | Why |
|---|---|---|
| Filtering videos as child-safe | **Precision** | Letting one bad video through is worse than blocking ten good ones |
| Cancer screening | **Recall** | A miss costs a life; a false alarm costs one repeat test |
| Card fraud detection | Depends on cost | Blocking real customers loses them; missing fraud loses money |

### ROC-AUC, and when not to use it

ROC plots **recall** (TPR) against the **false alarm rate** (FPR) at every threshold. AUC
is the area under it: 1.0 is perfect, 0.5 is random guessing.

**The trap:** FPR has `TN` in its denominator. When the negative class is huge, FPR stays
tiny even as FP grows, so the ROC curve looks misleadingly good. The rule from HOML3:
**if the positive class is rare, or you care more about FP than FN, use the
precision/recall curve instead of ROC.**

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1.
Seed `random_state=42`.

The `load_digits` dataset, reframed as the binary question *"is this the digit 5"* — the
positive class is about 10%.

```python
X, y = load_digits(return_X_y=True)
y5 = (y == 5)
Xtr, Xte, ytr, yte = train_test_split(X, y5, test_size=0.3, random_state=42, stratify=y5)

dummy = DummyClassifier(strategy="most_frequent").fit(Xtr, ytr)   # luon doan "khong"
sgd   = SGDClassifier(random_state=42, max_iter=1000).fit(Xtr, ytr)
```

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

Read it closely:

1. **`DummyClassifier` scores 89.81% accuracy** without learning anything — it returns
   `False` for every image. If a report says only "accuracy 89.8%", the reader has no way
   to know the model is worthless.
2. **Its precision, recall and F1 are all 0** — these three unmask it immediately,
   because none of them counts `TN`.
3. **The Dummy's ROC-AUC is exactly 0.5000** — the value of random guessing. That is why
   AUC is easy to read: it has an absolute reference point, and accuracy does not.
4. **SGD's confusion matrix says more than any aggregate**: only 1 false alarm, but
   **3 misses**. Recall (0.9455) sits below precision (0.9811) exactly as the matrix
   shows. In a medical screen, those 3 misses would be the number to report.

**The gap from 89.81% to 0.00% between two ways of measuring the same model** is the
entire reason this page exists.

## Trade-offs

| High precision | High recall |
|---|---|
| Few false alarms | Few misses |
| Misses many real cases | Many false alarms, costly to triage |
| Fits: content moderation, unattended automation | Fits: medical screening, security |

| ROC-AUC | Precision-Recall AUC |
|---|---|
| Has an absolute 0.5 reference | The reference is the positive-class rate, which shifts with the data |
| **Falsely optimistic when positives are rare** | Honest when positives are rare |
| Comparable across datasets with different class rates | Hard to compare across datasets |

| An aggregate metric (F1) | The confusion matrix |
|---|---|
| One number, ranks models fast | Four numbers, tells you **how** it is wrong |
| Hides FP/FN imbalance | Points straight at 3 FN vs 1 FP |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Reporting accuracy on imbalanced data | 89.81% for a model that does nothing — see the example |
| Fixing the metric **after** training | You pick whichever makes the model look best — self-deception |
| Using F1 when FP and FN have very different costs | F1 treats both errors as equal; reality rarely does |
| Using ROC-AUC when the positive class is extremely rare | A falsely pretty curve; use the precision/recall curve |
| Comparing model A's precision to model B's recall | Two different scales, the comparison is meaningless |
| Forgetting `stratify` when splitting | Class rates drift between train and test, and every metric drifts with them |

## FAQ

<details>
<summary>If I can only pick one metric, which?</summary>

Ask the reverse question: **which kind of mistake costs more?** Answer that and the
metric follows — expensive FP means precision, expensive FN means recall. Genuinely equal
means F1. If you cannot answer it, the problem is not yet framed, and training a model
right now is premature.

</details>

<details>
<summary>How is F1 different from the average of precision and recall?</summary>

F1 is the **harmonic** mean, which punishes imbalance. Precision 1.0 and recall 0.0: the
arithmetic mean gives 0.5 (sounds passable), F1 gives **0.0** (accurate — the model
catches nothing). That is why F1 is not fooled by `DummyClassifier`.

</details>

<details>
<summary>Why is <code>DummyClassifier</code> worth running?</summary>

Because it gives you the **floor**. If the real model does not clearly beat the dummy,
either the features are useless or there is a bug. It costs one line of code and blocks a
whole category of self-deception. Think of it as `SELECT COUNT(*)` before trusting a JOIN.

</details>

<details>
<summary>Does changing the threshold make the model better?</summary>

No — it only **moves you along** the precision/recall curve you already have. Shifting the
whole curve upward requires different features or a different algorithm. But tuning the
threshold is still very much worth doing, because the default of 0.5 is almost never the
right cut for a real problem.

</details>

<details>
<summary>How do precision and recall work for multiclass problems?</summary>

Compute them per class and then aggregate: `macro` (unweighted mean across classes — a
rare class counts as much as a common one), `weighted` (weighted by support), `micro`
(pool all TP/FP/FN first). If the rare class is what you care about use `macro`, not
`weighted` — the latter buries the rare class just like accuracy does.

</details>

## Related Topics

- [The Machine Learning landscape](ml-landscape.md) — the metric is the **P** in T/E/P
- [Overfitting and underfitting](overfitting-underfitting.md) — which split you measure on decides whether the number is real
- [Scikit-Learn's API design](sklearn-api-design.md) — the `scoring=` argument to cross-validation
- [Case study: 89.81% accuracy for a model that does nothing](../case-studies/accuracy-cao-ma-model-vo-dung.md)
- [Data Quality](../../../data-quality/index.md) — wrong labels make every metric wrong

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 2 (RMSE/MAE) and chapter 3 (classification)
