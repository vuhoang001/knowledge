---
title: "Choosing k on the test set — a score 12.1% too pretty"
sidebar_position: 4
description: "Try 12 values of k and keep the best test score. Measured over 200 splits: the reported number is 12.1% optimistic, and beats the honest one 184 times out of 200."
tags: [test-set, hyperparameter, selection-bias, cross-validation, machine-learning, homl3]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-29
---

# Choosing k on the test set — a score 12.1% too pretty

> **Takeaway:** You do not have to **train** on a set to spoil it. Trying 12 values of
> `k` and keeping the lowest test error is **already fitting one number — the choice
> itself — to that test set**. Measured over 200 splits: the reported number is **12.1%
> optimistic**, and beats the honest one **184 times out of 200**.

## Situation

k-nearest neighbours on the 36-country dataset. `k` is a hyperparameter — there is no
theoretically right value, it has to be chosen by measuring.

The procedure sounds entirely reasonable: try `k` from 1 to 12, keep the one with the best
test score, report that score.

## The first hypothesis — and where it is wrong

> "I never trained on the test set. I only *measured* on it."

True, no training happened. But **making a decision from a set is fitting to that set** —
fitting exactly one parameter: *the choice*. Picking the best of 12 attempts means picking
**the luckiest one on this particular test set**, and luck does not reproduce.

That score is no longer an **unbiased** estimate of the generalization error. It is
**the best of 12 tries**.

## Reproduction

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1, on
`lifesat_full.csv` (36 countries).

One split first, to see the shape:

```text
  k  RMSE test  RMSE cross-val
--------------------------------
  1     0.5673          0.5849
  2     0.5933          0.4975
  3     0.5497          0.4124
  4     0.5095          0.4165
  5     0.4754          0.4033
  6     0.4909          0.4284
  7     0.5118          0.4586
  8     0.4735          0.4978
  9     0.5099          0.5208
 10     0.5091          0.5268
 11     0.5326          0.5821
 12     0.5419          0.6169

chon k bang TEST SET      -> k=8, bao cao RMSE 0.4735
chon k bang CROSS-VAL     -> k=5, RMSE that tren test 0.4754
```

The gap is just **0.0019**. Looking at one split, the mistake appears **harmless** — which
is exactly why it survives in so many projects.

Only across 200 splits does it show:

```python
for seed in range(200):
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=seed)
    te = {k: rmse(yte, KNeighborsRegressor(n_neighbors=k).fit(Xtr, ytr).predict(Xte)) for k in KS}
    cv = {k: -cross_val_score(KNeighborsRegressor(n_neighbors=k), Xtr, ytr,
                              scoring="neg_root_mean_squared_error", cv=4).mean() for k in KS}
    gian.append(te[min(te, key=te.get)])    # chon bang chinh test set
    that.append(te[min(cv, key=cv.get)])    # chon bang cross-val
```

## Result

```text
200 lan chia 70/30 tren 36 nuoc, do 12 gia tri k moi lan

chon k bang TEST SET, roi bao cao diem test do : 0.4182
chon k bang CROSS-VAL, roi bao cao diem test   : 0.4760

do lac quan trung binh                         : 0.0578 RMSE  (12.1% qua dep)
so lan cach gian cho diem 'tot hon'             : 184/200
so lan hai cach chon cung mot k                 : 16/200
```

| | Reported RMSE | What it means |
|---|---|---|
| Choosing `k` on the test set | **0.4182** | The prettiest of 12 tries — **not an estimate** |
| Choosing `k` by cross-validation | **0.4760** | An honest estimate of the generalization error |
| **Optimism** | **0.0578** | **12.1% too pretty** |

And **184 times out of 200** the cheating route produces the "better" number. It almost
**always** makes you look better than you are.

## Mechanism

For each value of `k`, the test score is *true performance* plus *the noise of this
particular test set*. Taking the **minimum** of 12 such numbers selects the one with the
**largest negative noise** — not the one with the best true performance.

The more values you try, the larger the optimism. Here it is 12 values on one feature. A
real `GridSearchCV` often sweeps **hundreds of combinations**, with the same mechanism
acting on the same test set.

Cross-validation is immune because it chooses on folds **cut from the training set**. The
test set never participates in the decision, so when it is finally measured the number is
still honest.

## How to prevent it

```python
# DUNG — chon tren cac fold cat ra tu TRAIN, roi cham test set dung mot lan
gs = GridSearchCV(KNeighborsRegressor(), {"n_neighbors": range(1, 13)},
                  scoring="neg_root_mean_squared_error", cv=5)
gs.fit(X_train, y_train)          # test set chua bi cham
final = gs.best_estimator_        # da tu train lai tren toan bo X_train
print(rmse(y_test, final.predict(X_test)))   # LAN DUY NHAT
```

Three rules:

1. **One set, one question.** The test set answers *"how wrong is the winner"*, and it
   answers **once**.
2. **Count how many times the test set has been touched.** A test set that has decided 50
   questions is no longer an unseen sample. Record that count next to the reported score.
3. **Reporting the cross-validation score as the final result is the same mistake**, one
   level up — see the FAQ in [Testing and validating](../reference/testing-and-validating.md).

## Warning signs in a real project

| Sign | Suspicion |
|---|---|
| Test score better than the cross-validation score | **Very high** — the usual order is reversed |
| A model-selection loop in the code that uses `X_test` | Certain |
| Good offline numbers, much worse in production | Too late, but the right symptom |
| Nobody remembers how many runs touched the test set | The optimism cannot be measured |
| A very large number of hyperparameter combinations swept | Optimism grows with the number of tries |

## Related Topics

- [Testing, validating and the train-dev set](../reference/testing-and-validating.md) — one set one question, and the five-step holdout
- [Instance-based and model-based](../reference/instance-vs-model-based.md) — `k` is a hyperparameter, not a parameter
- [Overfitting and underfitting](../reference/overfitting-underfitting.md) — regularization strength is chosen the same way
- [Case study: selecting features before the split](chon-feature-truoc-khi-tach.md) — same family of error, at the preprocessing step
- [Foundations](../index.md)
