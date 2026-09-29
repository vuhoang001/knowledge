---
title: Overfitting and underfitting
sidebar_position: 2
description: "Memorising is not learning. Measure it as the gap between training and test error, against the noise floor."
tags: [overfitting, underfitting, bias-variance, regularization, homl3]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Overfitting and underfitting

> **Takeaway:** A model's job is not to fit the training data — it is to fit data it has
> **never seen**. Low training error with high test error is **overfitting**; both high is
> **underfitting**. Look at only one of the two numbers and you cannot tell which you have.

## Goal

Turn the vague question *"is this model good"* into a two-number measurement, and derive
from those two numbers **what to fix next** — instead of guessing.

## Overview

### Three numbers, not one

| Number | Meaning | How to read it |
|---|---|---|
| **Training error** | How well the model fits what it has seen | High = the model is too weak |
| **Test error** | How well it fits new data | This is the real number |
| **Noise floor** | The lowest error **theoretically** achievable | No honest model goes below it |

The noise floor is the one most often forgotten. If the labels carry noise with standard
deviation 1.0, then an RMSE of 1.0 is **perfect**, not mediocre. Chasing RMSE 0.3 means
memorising noise.

### The diagnostic table

| Training error | Test error | Diagnosis | What to do |
|---|---|---|---|
| High | High | **Underfit** | Stronger model, more features, less regularization |
| Low | High | **Overfit** | More data, fewer features, more regularization |
| Low | Low | Just right | Stop, do not fiddle further |
| High | **Low** | Suspicious — usually a bug | Test set leaking into training, or a bad split |

The last row is the one people skip. Test error meaningfully **below** training error is
almost always a programming error, not luck.

### Bias and variance

Two different causes of error, and they **pull in opposite directions**:

| | High bias | High variance |
|---|---|---|
| Cause | Wrong assumption about the shape of the data | Too sensitive to individual training samples |
| Symptom | Underfit — wrong everywhere, evenly | Overfit — change a few rows and the model changes |
| Example | A straight line for curved data | A decision tree with no depth limit |
| Cured by | A more complex model | More data, regularization |

**Increase model complexity and bias falls while variance rises.** That is the entire
content of the "bias/variance trade-off". The optimum sits in the middle, and **theory
will not find it for you** — you have to measure.

### Regularization: deliberately holding the model back

Regularization means **deliberately making the model worse on the training set** so it
does better on the test set. Three common forms, detailed under Regularization:

- Constraining the parameters (Ridge, Lasso)
- Constraining the structure (a tree's `max_depth`)
- Stopping early (early stopping)

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1,
numpy 2.5.3. Seeds `default_rng(42)` and `random_state=42`.

The data is generated from a **degree-2** polynomial plus Gaussian noise with `sigma = 1.0`.
Because the true formula is known, the answer is known too: degree 2 is correct, and RMSE
1.0 is the floor.

```python
rng = np.random.default_rng(42)
X = rng.uniform(-3, 3, size=(60, 1))
y = 0.5 * X[:, 0] ** 2 + X[:, 0] + 2 + rng.normal(0, 1, 60)   # bac 2 + nhieu
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=42)

for d in (1, 2, 3, 10, 25):
    m = make_pipeline(PolynomialFeatures(d), StandardScaler(), LinearRegression()).fit(Xtr, ytr)
```

```text
san nhieu ly thuyet (do lech chuan cua nhieu) = 1.000 — khong mo hinh nao xuong duoi ma con dung

 bac  RMSE train  RMSE test  chenh lech  chan doan
----------------------------------------------------------
   1       1.304      1.735       0.431  underfit (train > san nhieu)
   2       0.722      0.845       0.123  vua
   3       0.707      0.797       0.089  vua
  10       0.583      0.813       0.231  vua
  25       0.550      2.414       1.864  overfit
```

Four things are readable here, none of them visible from a single number:

1. **Degree 1 underfits.** Training RMSE 1.304 is **above the noise floor of 1.0** — the
   model has not even learned what is learnable. Adding data here is pointless.
2. **Degree 2 is the right answer**, and indeed it shows the smallest train/test gap among
   the reasonable candidates (0.123).
3. **Degree 10 holds up surprisingly well** — test RMSE 0.813. Excess parameters are not
   automatically a disaster while the data still suffices.
4. **Degree 25 collapses.** Train 0.550 (already below the noise floor — the signature of
   memorised noise), test 2.414. **Test error is 4.4× the training error.**

Note the most important number: at degree 25 the **training RMSE is the best of the whole
table**. Anyone reporting only training error would conclude degree 25 is the best model.

## Trade-offs

| A more complex model | A simpler model |
|---|---|
| Low bias — captures nonlinear relationships | High bias — misses real structure |
| High variance — sensitive to noise | Low variance — stable |
| Needs more data to avoid overfitting | Works with little data |
| Hard to explain | Easy to explain and defend to the business |

| More data | More regularization |
|---|---|
| Fixes overfitting **without adding bias** | Fixes overfitting **by adding bias** |
| Expensive, slow, sometimes impossible | Cheap, just a parameter |
| **Does nothing for underfitting** | Makes underfitting worse |

**When you are underfitting, more data is useless.** This is the most practical
conclusion in this whole page, and it saves weeks: measure training error first, and if
it sits above the noise floor, do not go asking for more data.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Reporting training error only | Degree 25 looks like the best model — see the example |
| Not estimating the noise floor | Chasing an impossible RMSE and memorising noise |
| Selecting a model on the **test set** | The test set becomes a second training set; the reported score is fiction |
| Going straight for more data on seeing overfitting | Sometimes right, but check for underfitting first |
| Treating "excess parameters" as "overfitting" | Degree 10 above was fine; what matters is the parameter-to-data ratio |
| Believing a test error lower than training error | Almost always leakage — see [Scikit-Learn's API design](sklearn-api-design.md) |

## FAQ

<details>
<summary>How do I estimate the noise floor when I don't know the generating formula?</summary>

There is no exact method, but three usable approximations: the error a **human** makes at
the same task; the disagreement between two repeated measurements of the same object; or
the error of the best known model on the same dataset. A rough number beats no number —
without one you cannot tell when to stop.

</details>

<details>
<summary>If selecting on the test set is wrong, what do I select on?</summary>

A **validation set** or cross-validation, both carved out of the training data. The test
set may be touched exactly **once**, at the very end, to report. Touch it repeatedly and
the reported number stops meaning anything — see Cross-validation.

</details>

<details>
<summary>How big does the train/test gap have to be before it counts as overfitting?</summary>

There is no universal threshold, because it depends on the noise floor. What works: track
the **ratio** of test to training error as complexity grows. In the example above that
ratio goes 1.33 → 1.17 → 1.13 → 1.39 → **4.39**. Where it jumps is where you stop.

</details>

<details>
<summary>What is a train-dev set and when do I need one?</summary>

When the training data comes from a different distribution than production (say: trained
on web images, running on phone photos). Carve an extra slice out of *training* and call
it train-dev. High error on train-dev = overfitting; low error on train-dev but high on
the real dev set = **distribution mismatch**, not overfitting. Those two have completely
different cures.

</details>

## Related Topics

- [The Machine Learning landscape](ml-landscape.md) — the problem type decides how you split the data
- [Performance metrics](performance-metrics.md) — "error" only means something once you fix the measure
- [Scikit-Learn's API design](sklearn-api-design.md) — a pipeline is what keeps the test set clean
- [Case study: selecting features before the split](../case-studies/chon-feature-truoc-khi-tach.md) — a falsely low test error
- [Foundations](../index.md) — the topic this file belongs to

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapters 1 and 4
