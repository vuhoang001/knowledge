---
title: Overfitting and underfitting
sidebar_position: 6
description: "A bad model in two opposite directions, with cures that run opposite ways. The 'w in the name' rule is right 4 out of 4 and says nothing about the world."
tags: [overfitting, underfitting, regularization, hyperparameter, bias-variance, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Overfitting and underfitting

> **Takeaway:** Overfitting is a model **too complex relative to its data**; underfitting
> is one too simple. The words **"relative to"** carry the whole meaning: **no model is
> too complex on its own** — a curve that overfits 27 countries could be exactly right
> with 27 million rows.

## Goal

Turn *"is this model good"* into a two-way diagnosis, and **know what to fix next** —
because the cures for these two diseases **run in opposite directions**, and the wrong
one makes things worse.

## Overview

### Two ends of one scale

```text
qua don gian  <----- can bang -----> qua phuc tap
UNDERFITTING                         OVERFITTING
sai ngay ca tren               tot tren train,
du lieu train                  te tren du lieu moi
```

### The diagnostic table

| Training error | Test error | Diagnosis | What to fix |
|---|---|---|---|
| High | High | **Underfit** | Stronger model, better features, **less** regularization |
| Low | High | **Overfit** | Simplify, **more data**, less noise, **more** regularization |
| Low | Low | Just right | Stop, do not fiddle |
| High | **Low** | Suspect a bug | Test set leaking into training, or a bad split |

The last row gets skipped: test error meaningfully **below** training error is almost
always a programming error. See the
[leakage case study](../case-studies/chon-feature-truoc-khi-tach.md).

### Overfitting: learning the noise

The model does well on the training data but **generalises poorly**. It happens when the
model is **too complex relative to the amount and noisiness of the data**.

Three cures:

1. **Simplify the model** — fewer parameters, a simpler model class, fewer attributes.
2. **Gather more training data.**
3. **Reduce the noise** — fix errors, remove outliers.

> **Notice that two of the three cures change the *data*, not the model.** Because the
> definition is "complex **relative to** the data", **you are allowed to move either side
> of the comparison.**

### Bias and variance

| | High bias | High variance |
|---|---|---|
| Cause | Wrong assumption about the shape of the data | Too sensitive to individual training samples |
| Symptom | **Underfit** — wrong everywhere, evenly | **Overfit** — change a few rows and the model changes |
| Example | A straight line for curved data | An unbounded decision tree |
| Cured by | A more complex model | More data, regularization |

More complexity means **lower bias, higher variance**. That is the whole of the
"bias/variance trade-off". The optimum is in the middle and **theory will not find it**.

### Regularization and hyperparameters

**Regularization** constrains a model to make it simpler and reduce overfitting; its
strength is set by a **hyperparameter**.

| | Model parameter | Hyperparameter |
|---|---|---|
| Belongs to | the **model** | the **learning algorithm** |
| Example | `theta_0`, `theta_1` | regularization strength, k-NN's `k` |
| Who sets it | **training** | **you**, before training |
| During training | tweaked to fit | **stays fixed** |
| Analogy | a value the job computes | a `--conf` passed at submit time |

**Degrees of freedom — the easiest way to see what regularization does.** The linear model
has two parameters, so the algorithm has **two degrees of freedom**: θ₀ sets the height,
θ₁ sets the slope.

- Force θ₁ = 0 → **one** degree of freedom. It can only move the line up and down, and it
  settles around the **mean**.
- Let θ₁ vary but **require it to stay small** → between one and two. **That is
  regularization.**

> **Regularization is a dial and both ends are failures.** Constrain too little and the
> model traces the noise. Constrain so hard that the slope is pinned near zero and the
> line flattens around the mean: **it cannot overfit and it cannot learn either.** So the
> strength is something you **tune and measure**, never set once from principle — and
> because it is a hyperparameter, **training cannot choose it for you.**

### Underfitting: too simple to learn

The model is too simple to capture the underlying structure, so its predictions are
**wrong even on the training examples**. The cures run the other way:

1. Select a **more powerful** model, with more parameters.
2. Feed **better features** — feature engineering.
3. **Loosen** the constraints by lowering the regularization hyperparameter.

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1, on
the book's 36-country dataset (`lifesat_full.csv`).

### 1 · The "w in the name" rule — the general shape of overfitting

```text
quy tac 'ten co chu w' tren 36 nuoc:
   New Zealand    7.3
   Sweden         7.3
   Norway         7.6
   Switzerland    7.5
   -> 4/4 tren 7, trong khi ca bang chi 12/36 tren 7
```

Give a flexible model an uninformative attribute — **the country's name** — and it may
notice that **every** training country with a *w* in its name scores above 7.

In SQL it has learned `CASE WHEN country LIKE '%w%' THEN 'above 7'`. **Right 4 out of 4.**
Meanwhile only **12 of 36** countries score above 7, so guessing gets it right a third of
the time.

And it is **pure chance**. Nothing says it holds for **Rwanda** or **Zimbabwe**.

> **A rule that is perfect on the training data is evidence about *that data*, not about
> the world.** That is exactly why the next lesson holds data back.

### 2 · A curve that is too flexible

```text
RMSE tren 36 nuoc:  duong thang 0.61   da thuc bac 10 0.29
```

The degree-10 polynomial misses the 36 countries by **0.29** points; the straight line by
**0.61**. The curve looks **twice as good** — until you ask it about incomes it never saw:

| GDP per capita | the degree-10 polynomial predicts |
|---|---|
| 75,000 | 8.13 |
| 80,000 | 8.34 |
| 100,000 | **4.64** |

Between 80,000 and 100,000 the prediction **falls 3.7 points** with nothing in the data to
justify it. The curve followed the noise of 36 points, and **between them it means nothing**.

> **A finding from reproducing this, not in the book.** The book prints very different
> extrapolations (−0.20 at 80,000; **136.25** at 100,000). We reproduced the **RMSE of
> 0.29 exactly**, but the extrapolation turns out to depend **strongly on how the input is
> scaled**:
>
> ```text
> chia 1e4         RMSE train 0.60 | 75k         8.88 | 80k         8.86 | 100k           2.33
> chia 1e5         RMSE train 0.29 | 75k         8.13 | 80k         8.34 | 100k           4.64
> StandardScaler   RMSE train 0.30 | 75k        10.25 | 80k        13.45 | 100k         -64.43
> ```
>
> **That instability is itself the lesson.** Same degree 10, same data — divide the input
> by 1e4 or 1e5 or standardise it and you get **2.33 / 4.64 / −64.43** at the same point.
> An overfit model is not merely wrong; it is **wrong in a way that does not reproduce**,
> because its solution sits in a numerically unstable region.

### 3 · Regularization, in numbers

```text
duong tren 27 nuoc: 3.749 + 0.0000678 x GDP
Ridge (alpha=3e9) tren 27 nuoc: he so 0.0000302 -> Luxembourg 8.64
duong tren 36 nuoc: 5.580 + 0.0000233 x GDP  ->  Luxembourg 8.15
```

| Model | Trained on | Slope | Luxembourg (GDP 110,261, real 6.9) |
|---|---|---|---|
| Plain line | 27 countries | 0.0000678 | **11.22** — above the top of the scale |
| **Ridge, very strong regularization** | **27 countries** | 0.0000302 | **8.64** |
| Plain line | **36 countries** (the fuller truth) | 0.0000233 | 8.15 |

Read the middle row carefully: **Ridge saw exactly the same 27 countries as the steep
line**, but a constraint held its slope down, and it **lands almost where the line that
knew all 36 countries lands** — 8.64 against 8.15, instead of 11.22.

**That is precisely what regularization buys:** fitting the training data **slightly
worse**, generalising **considerably better**.

*(The book prints 0.0000293 and 8.58; we got 0.0000302 and 8.64 — the difference comes
from the specific `alpha`, which the book does not publish. The conclusion is unchanged.)*

## Trade-offs

| A more complex model | A simpler model |
|---|---|
| Low bias — captures nonlinear relationships | High bias — misses real structure |
| High variance — sensitive to noise | Low variance — stable |
| Needs more data to avoid overfitting | Works with little data |
| Hard to explain, **and unstable when extrapolating** | Easy to explain and defend |

| More data | More regularization |
|---|---|
| Fixes overfitting **without adding bias** | Fixes overfitting **by adding bias** |
| Expensive, slow, sometimes impossible | Cheap, just a parameter |
| **Does nothing for underfitting** | **Makes underfitting worse** |

**When you are underfitting, more data is useless.** The most practical conclusion on this
page, and it saves weeks.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Reporting training error only | The degree-10 polynomial looks twice as good as the line |
| Selecting a model on the **test set** | The test set becomes a second training set; the reported number is fiction |
| Going straight for more data on seeing overfitting | Sometimes right, but **check for underfitting first** |
| Treating "excess parameters" as "overfitting" | The words **"relative to"** decide, not the parameter count |
| Setting regularization strength once from principle | Both ends of the dial are failures; measure |
| Looking for a hyperparameter in `fit`'s output | It is not there — training never touches it |
| Trusting an overfit model outside its data range | Not just wrong, but **wrong irreproducibly** |
| Believing a test error lower than the training error | Almost always leakage |

## FAQ

<details>
<summary>A model scores 99% on training and 62% on held-out data. Which problem, and two fixes?</summary>

**Overfitting** — the definition word for word: good on training data, bad on new data.
Any two of the three: **simplify the model** (fewer parameters, fewer features), **gather
more training data**, or **reduce the noise** (fix errors, remove outliers).

A fourth is not in that list but is often cheapest: **increase regularization**.

</details>

<details>
<summary>How is regularization strength chosen, given you may not tune it on the test set?</summary>

With a **validation set** or cross-validation — both carved out of the training set. In
`scikit-learn`, `Ridge` takes `alpha` and `GridSearchCV` searches for it.

The test set is touched **once**, at the end. See [Testing and validating](testing-and-validating.md).

</details>

<details>
<summary>Why is the "w" rule a good example when nobody feeds country names to a model?</summary>

Because it is the **general shape** in its most visible form. Give a flexible model
**enough columns and few enough rows** and it will **always** find a rule true of every
training row.

In a real project, "w" is a customer ID that happens to correlate with the label, a
timestamp encoding load order, or a branch code that only appears in old data. See
[the 86.67%-on-random-data case study](../case-studies/chon-feature-truoc-khi-tach.md) —
same mechanism, 5,000 noise columns.

</details>

<details>
<summary>"Complex relative to the data" — is there a way to estimate the threshold?</summary>

No general formula, but one ratio is worth looking at: **parameters against rows**. The
degree-10 polynomial has 11 parameters for 36 rows — about 3 rows per parameter. The
straight line has 2 for 36 — 18 rows per parameter.

This is a signal, not a threshold. The only certain method is still **measuring on
held-out data**.

</details>

<details>
<summary>Why does the polynomial's extrapolation depend on how the input is scaled?</summary>

`PolynomialFeatures(10)` builds columns from x up to x¹⁰. With GDP around 10⁵, the x¹⁰
column is around 10⁵⁰ — far beyond what 64-bit floats represent stably. The problem
becomes **ill-conditioned**: tiny input changes send the coefficients a long way.

That is also why standard practice is to **always scale before building polynomial
features** — and why `make_pipeline(PolynomialFeatures(d), StandardScaler(),
LinearRegression())` is the ordering worth using.

</details>

## Related Topics

- [Bad data](bad-data.md) — the other branch of the "what can go wrong" tree
- [Testing and validating](testing-and-validating.md) — how to detect both diseases in numbers
- [Instance-based and model-based](instance-vs-model-based.md) — parameter versus hyperparameter
- [Performance metrics](performance-metrics.md) — RMSE and the other measures
- [Scikit-Learn's API design](sklearn-api-design.md) — a pipeline keeps the test set clean
- [Case study: selecting features before the split](../case-studies/chon-feature-truoc-khi-tach.md)

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 1, lesson b10
