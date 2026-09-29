---
title: The Machine Learning landscape
sidebar_position: 1
description: "Four axes for classifying a model — labelled or not, trained once or continuously, comparing or generalising — and why the last one decides everything."
tags: [machine-learning, supervised, unsupervised, online-learning, homl3]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# The Machine Learning landscape

> **Takeaway:** Machine Learning is programming by **example** instead of by **rule**.
> Every algorithm in this section differs on only four axes: *are there labels*, *does it
> train once or keep training*, *does it compare against old data or extract a rule*, and
> *who is accountable when it is wrong*.

## Goal

Be able to answer **"what kind of problem is this"** before picking an algorithm. Pick
the wrong kind and everything downstream — the metric, the split, the evaluation — is
wrong with it, and wrong **silently**: the code runs, the numbers look good, nothing errors.

## Overview

### What ML is, stated precisely

Tom Mitchell's 1997 definition, useful because it is **measurable**:

> A program learns from experience **E** with respect to task **T** and performance
> measure **P**, if its performance on T — measured by P — **improves with E**.

Those three letters are the three questions to answer before writing any code:

| Letter | Question | Spam-filter example |
|---|---|---|
| **T** | What is the task | Label an email *spam* / *not spam* |
| **E** | What does it learn from | 10,000 emails already labelled by humans |
| **P** | What measures it | Share of spam blocked, and share of real mail blocked by mistake |

**If you cannot state P, you cannot do ML.** This is what gets skipped most often:
"build a churn prediction model" is not a problem statement, because it never says
*which kind of mistake is worse*.

### Axis 1 — Labelled or not

| Kind | Training data | Answers | Example |
|---|---|---|---|
| **Supervised** | Has labels `y` | "What is the value/class of this" | House-price regression, spam filtering |
| **Unsupervised** | No labels | "What structure does this data have" | Customer segmentation, anomaly detection |
| **Semi-supervised** | Few labels + many unlabelled | Like supervised, but labels are expensive | Google Photos recognising faces |
| **Self-supervised** | No labels, **generates its own** | "Guess the hidden part" | Language models, BERT |
| **Reinforcement** | No labels, has **rewards** | "Which action pays off long-term" | Game playing, robot control |

The boundary most often confused is **self-supervised vs unsupervised**. Masking a word
in a sentence and asking the model to guess it — the data has no human-assigned labels,
but the problem is still supervised, because the label is **generated mechanically from
the data itself**. That is why language models can train on the whole internet without
anyone labelling anything.

### Axis 2 — Train once or keep training

| | Batch (offline) | Online (incremental) |
|---|---|---|
| How it learns | Train on all the data, then freeze | Feed it chunks, update as you go |
| New data | Retrain **from scratch** | Feed it in, no retraining |
| Resources | Needs the whole dataset in RAM/disk | Needs only a mini-batch |
| Risk | The model goes stale, *model rot* | **Bad data can ruin the model in minutes** |

In `scikit-learn`, online learning means estimators with `partial_fit`:
`SGDClassifier`, `SGDRegressor`, `MiniBatchKMeans`.

**The trap in online learning is operational, not technical.** A broken sensor sending
garbage at 2 a.m. will drag the model while nobody is watching. Batch learning has one
thing online learning does not: **a frozen model version to compare against**. So the
default should be batch, and you switch to online only when the data genuinely does not
fit in memory.

### Axis 3 — Instance-based or model-based

This is the **most important** axis, because it decides what you have to ship.

| | Instance-based | Model-based |
|---|---|---|
| How it generalises | Compares the new point to **memorised** points | Extracts **parameters**, then throws the training data away |
| At `fit` time | Barely does anything — just stores data | Optimises, takes time |
| At `predict` time | Slow — must scan the training data | Fast — a handful of multiplications |
| What deployment carries | **The entire training set** | A few dozen numbers |
| Example | k-Nearest Neighbors | Linear/Logistic Regression, neural networks |

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1,
numpy 2.5.3. Seed `random_state=42`.

Two models on the same `load_diabetes` dataset: one model-based, one instance-based.

```python
X, y = load_diabetes(return_X_y=True)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

lin = LinearRegression().fit(Xtr, ytr)
knn = KNeighborsRegressor(n_neighbors=5).fit(Xtr, ytr)
```

```text
so mau train / test        : 353 / 89
so tham so LinearRegression: 11
so tham so KNeighbors      : 0  (luu lai 28240 byte du lieu train)

MAE LinearRegression : 42.79
MAE KNeighbors(k=5)  : 42.77

chenh lech du doan giua hai mo hinh: trung binh 26.70, lon nhat 88.89
```

Read those three numbers carefully, because they are the whole lesson:

1. **The MAEs are all but identical — 42.79 and 42.77.** On a scoreboard these two models
   are interchangeable.
2. **But per sample they disagree by 26.70 on average, and by up to 88.89** — roughly as
   large as their own error. Two "equivalent" models are **giving genuinely different
   answers about the same patient**.
3. **The deployment costs are nothing alike**: 11 numbers versus 28,240 bytes of real
   patient data that has to travel to production.

Equal scores do **not** mean equivalent models. If the training data holds personal
information, point 3 alone rules k-NN out.

## Trade-offs

| | Instance-based (k-NN) | Model-based (Linear) |
|---|---|---|
| Training | Instant | Takes time |
| Prediction | Slow, grows with training-set size | Constant |
| Artifact size | The whole dataset | A few dozen bytes |
| Privacy | **Ships the raw data to production** | Ships none |
| Explainability | "Because it resembles these 5 cases" | "Because the BMI coefficient is 0.4" |
| High-dimensional data | Collapses — see the curse of dimensionality | Holds up better |

| | Batch | Online |
|---|---|---|
| Control | A frozen version to compare against | The model drifts continuously |
| Bad data | Caught at the next training run | **Damage is immediate and hard to trace** |
| Data larger than RAM | Not possible | Possible |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Picking an algorithm before fixing **P** (the measure) | You optimise the wrong thing; a "good" model the business cannot use |
| Treating self-supervised as unsupervised | You forget you still need a test set like any supervised problem |
| Using online learning because it sounds modern | One day of bad data destroys the model, with no previous version to roll back to |
| Choosing k-NN and only then noticing it ships the raw data | A privacy violation discovered right before deployment |
| Concluding two models are equivalent because they score the same | As above — they disagree by 88.89 on individual cases |

## FAQ

<details>
<summary>My problem has labels, but very few and very expensive ones — what now?</summary>

That is exactly semi-supervised. The pragmatic recipe from HOML3 chapter 9: cluster the
unlabelled data first, hand-label **one representative per cluster**, then propagate that
label across the cluster. For the same hand-labelling effort, this usually beats labelling
the same number of instances at random by a wide margin.

</details>

<details>
<summary>When is ML <strong>not</strong> the answer?</summary>

When a hand-written rule is shorter and stable. If the business rule is "orders above 10
million need approval", do not train a model — write an `if`. ML earns its keep when the
rules are **too many, too changeable, or impossible for anyone to write down** (image
recognition is the classic: nobody can write the rules that describe "a cat").

</details>

<details>
<summary>Is instance-based ever better than model-based?</summary>

Yes, when the decision boundary is irregular and follows no formula, and the data is
dense enough. k-NN assumes nothing about the shape of the data — which is both its
strength and its weakness. It is also a baseline worth running: if a complex model cannot
beat k-NN, the problem is in the features, not the algorithm.

</details>

<details>
<summary>Do I have to memorise all four axes?</summary>

No. Remember **axis 3** (instance vs model-based), because it decides your deployment
artifact, and remember that **P must be fixed first**. Look the other two up when needed.

</details>

## Related Topics

- [Overfitting and underfitting](overfitting-underfitting.md) — the biggest challenge once the problem type is right
- [Performance metrics](performance-metrics.md) — the **P** in Mitchell's definition
- [Scikit-Learn's API design](sklearn-api-design.md) — every algorithm above shares the same three interfaces
- [Foundations](../index.md) — the topic this file belongs to
- [Data Quality](../../../data-quality/index.md) — no **P** survives a dirty **E**

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 1
- Tom Mitchell — *Machine Learning* (1997), the T/E/P definition
