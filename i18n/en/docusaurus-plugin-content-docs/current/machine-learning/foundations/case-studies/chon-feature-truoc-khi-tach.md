---
title: "Selecting features before the split — 86.67% on random data"
sidebar_position: 1
description: "One misplaced SelectKBest step inflated accuracy from 0.5450 to 0.8667 on data containing no signal at all."
tags: [data-leakage, pipeline, cross-validation, machine-learning, homl3]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-29
---

# Selecting features before the split — 86.67% on random data

> **Takeaway:** A single `SelectKBest(...).fit(X, y)` placed before `train_test_split`
> made a model score **86.67%** on data containing **not one bit of information**. No
> exception, no warning, nothing in the code looking wrong.

## Situation

A binary classification problem on wide data: **200 rows, 5,000 columns**. That
column-to-row ratio is very common in genomics, sensor data, or anywhere people dump
every feature they can think of into a table.

The preprocessing step sounds entirely reasonable: 5,000 columns is too many, so let us
select the best 20 first.

## The first hypothesis — and where it is wrong

> "Feature selection is preprocessing. Preprocessing happens before the split, for tidiness."

True for transformations that **do not look at `y`** — casting types, dropping duplicate
columns. False for anything with `y` in its formula, and `SelectKBest(f_classif)` is
exactly that: it ranks each column by its correlation with the label.

Looking at the `y` of the whole dataset means looking at the `y` of the part that
**will become the test set**.

## Reproduction

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1,
numpy 2.5.3. Seeds `default_rng(42)`, `random_state=42`.

So that nobody can argue "maybe the model did learn something real", the data is
generated to **guarantee there is no signal**:

```python
rng = np.random.default_rng(42)
X = rng.normal(size=(200, 5000))       # 5000 cot nhieu thuan tuy
y = rng.integers(0, 2, size=200)       # nhan tung dong xu
```

`X` and `y` are fully independent. The only correct score is **0.50**.

The wrong version — select features first:

```python
sel = SelectKBest(f_classif, k=20).fit(X, y)
Xtr, Xte, ytr, yte = train_test_split(sel.transform(X), y, test_size=0.3, random_state=42)
bad = LogisticRegression(max_iter=1000).fit(Xtr, ytr).score(Xte, yte)
```

The right version — select features inside the pipeline:

```python
pipe = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression(max_iter=1000))
good = cross_val_score(pipe, X, y, cv=5).mean()
```

## Result

```text
du lieu: 200 dong x 5000 cot nhieu, nhan ngau nhien
diem dung ky vong (doan bua)        : 0.5000

chon feature TRUOC khi tach (SAI)   : 0.8667
chon feature trong pipeline (DUNG)  : 0.5450

ro ri thoi phong diem len            : +32.2 diem phan tram
```

| | Score | Deviation from the truth |
|---|---|---|
| The truth (random data) | 0.5000 | — |
| Feature selection before the split | **0.8667** | **+36.7 points** |
| Feature selection inside the pipeline | 0.5450 | +4.5 points (statistical wobble on 200 samples) |

## Mechanism

Among 5,000 noise columns, some **happen** to correlate with `y` — purely by chance. With
5,000 attempts that is a certainty, not a possibility.

`SelectKBest` run over the whole dataset finds exactly those columns, **including the
accidental correlation living in the 30% that becomes the test set**. After the split the
surviving 20 columns already carry the test set's fingerprint. The model learns no rule —
it exploits a coincidence that the selection step preserved across the train/test boundary.

`cross_val_score` with a pipeline is immune because `SelectKBest` is **refit inside each
fold**, on that fold's training portion only. An accidental correlation found there has
no reason to exist in the held-out part.

## How to prevent it

```python
# DUNG — moi buoc nhin vao y deu nam trong pipeline
pipe = make_pipeline(
    SimpleImputer(),
    StandardScaler(),
    SelectKBest(f_classif, k=20),
    LogisticRegression(max_iter=1000),
)
score = cross_val_score(pipe, X, y, cv=5).mean()
```

The rule to take away, usable without remembering the details:

**Any step with `y` in its formula must live inside the pipeline.** The usual suspects:
feature selection, target encoding, oversampling (SMOTE), label-driven discretisation.

And the broader rule one level up: **anything with a `fit` belongs in the pipeline** —
including steps that never see `y`, like `StandardScaler` and `SimpleImputer`. They leak
far less, but "less" is not "none", and there is no reason to take the risk.

## Warning signs in a real project

| Sign | Suspicion |
|---|---|
| A score far above the business baseline | High |
| Test score **higher** than training score | Very high — almost always leakage |
| Many more columns than rows | High — leakage is amplified here |
| The score collapses once preprocessing moves into the pipeline | **You found it** |
| The model performs far worse in production than offline | Too late, but the right symptom |

The cheapest test: rerun everything with `y` shuffled (`rng.permutation(y)`). The score
must fall back to chance. If it does not, there is leakage — and the test costs one line
of code.

## Related Topics

- [Scikit-Learn's API design](../reference/sklearn-api-design.md) — the three interfaces and why a pipeline blocks this
- [Overfitting and underfitting](../reference/overfitting-underfitting.md) — the diagnostic table, row "test error below training error"
- [Performance metrics](../reference/performance-metrics.md) — a beautiful number that means nothing
- [Foundations](../index.md) — the topic this file belongs to
