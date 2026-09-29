---
title: Scikit-Learn's API design
sidebar_position: 4
description: "Three interfaces — Estimator, Transformer, Predictor — and why a pipeline is the only thing that keeps the test set from leaking."
tags: [scikit-learn, pipeline, estimator, transformer, data-leakage, homl3]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Scikit-Learn's API design

> **Takeaway:** The whole library has only **three interfaces**, and they compose.
> Composing them with `Pipeline` is not about tidy code — it is the **mechanical** thing
> that stops the test set leaking into the training set. Do it by hand and it leaks,
> silently.

## Goal

Understand why everything in `scikit-learn` has the same three methods, and turn that
understanding into one operational rule: **every data transformation belongs inside a
pipeline.**

## Overview

### The three interfaces

| Interface | Method | Job | Example |
|---|---|---|---|
| **Estimator** | `fit(X, y)` | Learn parameters from data, store them in attributes ending in `_` | everything |
| **Transformer** | `transform(X)` | Transform data using the learned parameters | `StandardScaler`, `SimpleImputer` |
| **Predictor** | `predict(X)` | Produce predictions | `LinearRegression`, `SGDClassifier` |

A class can play several roles. `StandardScaler` is Estimator + Transformer.
`LinearRegression` is Estimator + Predictor. `PCA` is all three.

**The trailing-underscore convention carries real meaning, it is not style:**

| Name | Meaning | Example |
|---|---|---|
| `alpha` (no underscore) | **Hyperparameter** — you set it, before fitting | `Ridge(alpha=1.0)` |
| `coef_` (trailing underscore) | **Learned parameter** — exists only after `fit` | `lin.coef_` |

The name tells you who is responsible for that number. Reading `coef_` before `fit`
raises `NotFittedError` — deliberately, so the mistake surfaces early.

### Why `fit` and `transform` must stay separate

This is where the whole design pays off:

```python
scaler.fit(X_train)          # HOC trung binh va do lech chuan — chi tu train
X_train_s = scaler.transform(X_train)
X_test_s  = scaler.transform(X_test)   # AP DUNG so da hoc, KHONG hoc lai
```

The test set must be processed with **parameters learned from the training set**, because
in production there is no "test set" — there are only individual records arriving alone.
Learning parameters from the test set is pretending to know the future.

`fit_transform(X_train)` is shorthand for the first two lines. **There is no
`fit_transform` for the test set** — if you are typing it for test data, that is a bug.

### Pipeline: making the rule impossible to forget

```python
pipe = make_pipeline(SimpleImputer(), StandardScaler(), LogisticRegression())
pipe.fit(X_train, y_train)     # fit tung buoc, dung thu tu, chi tren train
pipe.predict(X_test)           # transform bang tham so cu, roi predict
```

`Pipeline` calls `fit_transform` on every step but the last, and only `transform` when
predicting. More importantly: hand the pipeline to `cross_val_score` and **each fold
refits all the preprocessing on that fold's own training portion**. Nobody remembers to
do that by hand across five folds.

### `ColumnTransformer` — one branch per column type

```python
ColumnTransformer([
    ("num", make_pipeline(SimpleImputer(), StandardScaler()), cot_so),
    ("cat", OneHotEncoder(handle_unknown="ignore"), cot_chu),
])
```

This is the only compact way to keep mixed data inside **one** object that has a `fit`.
One object means one thing to `joblib.dump`, and that artifact holds **both the
preprocessing and the model** — the thing that directly prevents training/serving skew.

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1,
numpy 2.5.3. Seeds `default_rng(42)` and `random_state=42`.

The data is **entirely random**: 200 rows × 5,000 noise columns, labels from a coin flip.
No signal exists, so the correct score **must be 0.50**.

```python
rng = np.random.default_rng(42)
X = rng.normal(size=(200, 5000))       # 5000 cot nhieu thuan tuy
y = rng.integers(0, 2, size=200)       # nhan tung dong xu

# SAI — chon 20 cot "tot nhat" tren TOAN BO du lieu, roi moi tach
sel = SelectKBest(f_classif, k=20).fit(X, y)
Xtr, Xte, ytr, yte = train_test_split(sel.transform(X), y, test_size=0.3, random_state=42)
bad = LogisticRegression(max_iter=1000).fit(Xtr, ytr).score(Xte, yte)

# DUNG — chon feature nam TRONG pipeline, chi fit tren phan train cua moi fold
pipe = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression(max_iter=1000))
good = cross_val_score(pipe, X, y, cv=5).mean()
```

```text
du lieu: 200 dong x 5000 cot nhieu, nhan ngau nhien
diem dung ky vong (doan bua)        : 0.5000

chon feature TRUOC khi tach (SAI)   : 0.8667
chon feature trong pipeline (DUNG)  : 0.5450

ro ri thoi phong diem len            : +32.2 diem phan tram
```

**86.67% accuracy on data containing not one bit of information.** No exception was
raised, no warning printed, and nothing in the code looks wrong.

The mechanism: `SelectKBest` looks at all 200 rows to pick the 20 columns that
**happen to correlate with the label**. Among 5,000 noise columns there are always a few
dozen such columns — purely by chance. That accidental correlation is present in the part
that will become the test set too. By the time you split, it is too late: **information
about the test set has already entered the column-selection step.**

The correct version scores 0.5450 — as expected around chance, the remainder being
statistical wobble on 200 samples.

This example uses feature selection because the effect is starkest, but **the same
mechanism applies to `StandardScaler`, `SimpleImputer`, `PCA` and every target
encoding** — only the magnitude differs. A leaking scaler typically inflates the score by
a few percent, which is small enough that nobody suspects it and large enough to pick the
wrong model.

## Trade-offs

| Using a Pipeline | Doing each step by hand |
|---|---|
| You cannot forget to `transform` the test set | You must remember, everywhere |
| Cross-validation refits preprocessing per fold | Leaks on every fold, silently |
| One artifact holds preprocessing and model | Two separate things, easy to version-drift at serving |
| Slightly harder to debug — which step failed | You see each step directly |
| Grid search can tune preprocessing hyperparameters too | Not cleanly possible |

| `Pipeline` | `make_pipeline` |
|---|---|
| You name the steps — needed in `param_grid` | Names generated from class names, faster to type |
| Prefer it when grid searching | Fine for exploratory code |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| `fit_transform` on **all** of X before splitting | Leakage; the example above inflates the score by +32.2 points |
| `scaler.fit(X_test)` | The same error, more visible, still common |
| Preprocessing outside the pipeline, then `cross_val_score` | Leaks on **every** fold, and CV cannot detect it |
| Saving the model without the scaler | Training/serving skew — right model, wrong output |
| `OneHotEncoder` without `handle_unknown="ignore"` | Production raises an exception on an unseen value |
| Reading `coef_` before `fit` | `NotFittedError` — deliberate design, do not swallow it in a `try` |

## FAQ

<details>
<summary>Why is fitting a scaler on the whole dataset cheating? It is only a mean.</summary>

Because that mean **contains information from the test set**. In production a new record
arrives alone and you have no way to know the future's mean. A score computed with
information unavailable at serving time is a score that will not reproduce. The effect
of a scaler alone is usually small — and that is exactly what makes it dangerous: small
enough not to arouse suspicion, large enough to pick the wrong model.

</details>

<details>
<summary>I need a transformation sklearn doesn't have — how do I make it pipeline-compatible?</summary>

Subclass `BaseEstimator` and `TransformerMixin`, implement `fit` (returning `self`) and
`transform`. `TransformerMixin` gives you `fit_transform` for free, `BaseEstimator` gives
`get_params`/`set_params` — which grid search needs. Add `get_feature_names_out` if you
want to keep column names through the transformation.

</details>

<details>
<summary>Does cross-validation protect me from leakage by itself?</summary>

**Only if every preprocessing step is inside the pipeline you hand it.** Transform the
data first and then call `cross_val_score` and CV saves nothing — it is splitting
**already-contaminated** data. That is precisely what the example above measures: 0.8667
versus 0.5450.

</details>

<details>
<summary>Where do I put <code>SMOTE</code> or class rebalancing?</summary>

In the pipeline, and applied **only to each fold's training portion** — use
`imblearn.pipeline` instead of `sklearn.pipeline`, since the original does not allow a
step that changes the row count. Oversampling before the split is one of the worst forms
of leakage: copies of the same row end up on both sides.

</details>

<details>
<summary>Why does <code>predict</code> take no <code>y</code>?</summary>

Because that is the entire point of the problem. `y` appears only in `fit` and in the
scoring functions. If you find yourself needing `y` at prediction time, the design has a
problem — usually a feature computed from the label has slipped into the feature set.

</details>

## Related Topics

- [The Machine Learning landscape](ml-landscape.md) — every algorithm shares these three interfaces
- [Overfitting and underfitting](overfitting-underfitting.md) — leakage produces a falsely low test error
- [Performance metrics](performance-metrics.md) — the `scoring=` passed to cross-validation
- [Case study: selecting features before the split](../case-studies/chon-feature-truoc-khi-tach.md) — the failure behind this very example
- [Python](../../../languages/python/index.md) — NumPy underlies `X`

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 2
- Buitinck et al. — *API design for machine learning software* (2013), the paper describing these three interfaces
