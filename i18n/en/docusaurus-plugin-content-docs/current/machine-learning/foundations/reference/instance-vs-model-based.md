---
title: Axis 3 — Instance-based and model-based
sidebar_position: 4
description: "Two ways to answer a case you have never seen. Cyprus worked by hand both ways, and the whole workflow in ten lines of Scikit-Learn."
tags: [instance-based, model-based, knn, linear-regression, scikit-learn, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Axis 3 — Instance-based and model-based

> **Takeaway:** Two ways to **generalise** to a case never seen. Instance-based **keeps
> the examples** and measures similarity. Model-based **throws the examples away** and
> keeps a few numbers. This is the most important axis, because it decides **what has to
> travel to production**.

## Goal

Understand what *generalising* means through an example you can work out by hand, and see
that switching between the two families in `scikit-learn` is **two lines of code**.

## Overview

### Generalising is the real goal

**Generalize** means performing well on instances the system has **never seen**. Almost
every ML task is prediction, so that is the real target.

> **Good performance on the training data is *necessary* but **not sufficient*** — just as
> a report that is only right for the months you tested is not finished.

That bites hardest on instance-based learning, which **can look excellent on the training
data for the trivial reason that the training data is what it memorised.**

### The two ways

```text
Instance-based:  giu lai cac vi du  ->  so sanh ca moi voi chung
Model-based:     khop mot model     ->  ap model len ca moi
```

| | Instance-based | Model-based |
|---|---|---|
| Learns by | **memorising** the training examples | building a **model** of them |
| Predicts by | a **similarity measure** | applying the model |
| Algorithm here | k-nearest neighbours | linear regression |
| Cyprus | **≈ 6.33** from the three closest countries | **6.30** from the fitted line |

### Instance-based: learning by heart

A spam filter built this way flags emails **identical** to ones already flagged. Slightly
less trivially, it also flags emails **similar** to known spam — which requires a
**similarity measure**. A very basic one: **count the words two emails share**.

For k-nearest neighbours, `k` is how many of the closest examples it looks at. The whole
Cyprus prediction reads **exactly like a query**:

```sql
SELECT AVG(life_satisfaction)              -- khoang 6.33
FROM (
  SELECT life_satisfaction
  FROM countries
  ORDER BY ABS(gdp_per_capita - 37655)     -- Cyprus: 37,655 USD
  LIMIT 3                                  -- k = 3
) AS nearest;
```

> **With no model, every assumption lives in the similarity measure.** Instance-based
> learning fits nothing, so every design decision sits in two places: **how you measure
> similarity** and **how many neighbours you look at**. Change the measure and every
> prediction changes, **with no training step to point at**. The assumptions did not
> disappear — they **moved into the distance function**.

### Model-based: four steps, and the whole book is these four steps

1. **Study the data.** Plot GDP against life satisfaction and notice the trend.
2. **Select a model.** The plot looks roughly linear, so pick a two-parameter linear model:

   ```text
   life satisfaction = theta_0 + theta_1 x GDP per capita
   ```

3. **Train it.** Find the parameter values that fit best, which requires a measure of fit:

   | Measure of fit | It measures | Training pushes it |
   |---|---|---|
   | **utility function** | how **good** the model is | **up** |
   | **cost function** | how **bad** the model is | **down** |

4. **Apply the model to predict** on new cases. This is **inference**.

**Reading the formula, piece by piece:**

| Piece | Say it as | What it is | In the code |
|---|---|---|---|
| life_satisfaction | — | the number predicted, a 0–10 score | `model.predict(...)` |
| `theta_0` | "theta zero" | the starting value: the prediction when GDP is 0 | `model.intercept_` |
| `theta_1` | "theta one" | the slope: score gained per extra dollar | `model.coef_` |
| GDP_per_capita | — | the input | `X` |

In plain words: **prediction = starting value + slope × GDP**.

### Parameter and hyperparameter — do not mix them up

| | Model parameter | Hyperparameter |
|---|---|---|
| Belongs to | the **model** | the **learning algorithm** |
| Example | `theta_0`, `theta_1` | k-NN's `k`, regularization strength |
| Who sets it | **training** | **you**, before training |
| During training | tweaked to fit the data | **stays fixed** |
| Analogy | a value the job computes | a `--conf` you pass at submit time |

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1, on
**the book's own dataset** (`lifesat.csv`, 27 countries). Every number below matches the
book **digit for digit**.

### How training gets those two numbers

One input, so it can be done by hand — and it has an **exact answer computed in one pass**:
no iteration, no randomness. That is why running training twice gives **identical values**.

```text
theta_0 = 3.7490   theta_1 = 0.0000677890
buoc 1: GDP tb = 41,564.5   diem tb = 6.5667
buoc 2: tong tich   = 163,499.4
buoc 3: tong binh phuong = 2,411,886,717.9
buoc 4: theta_1 = 0.0000677890
buoc 5: theta_0 = 3.7490
```

| Step | What it does | Result |
|---|---|---|
| 1 | Average GDP and average score of the 27 countries | 41,564.5 and 6.5667 |
| 2 | For each country multiply (GDP − 41,564.5) by (score − 6.5667), sum all 27 | **163,499.4** — how far GDP and score move together |
| 3 | For each country square (GDP − 41,564.5), sum all 27 | **2,411,886,717.9** — how spread out GDP is |
| 4 | θ₁ = step 2 ÷ step 3 | **0.0000678** |
| 5 | θ₀ = mean score − θ₁ × mean GDP | **3.749** |

So **10,000 more dollars of GDP goes with 0.0000678 × 10,000 = 0.68 points** of life satisfaction.

### Cyprus: one question, two answers

```text
Cyprus, linear      : 6.30166
Cyprus, kNN k=1     : 7.20000
Cyprus, kNN k=3     : 6.33333
Cyprus, kNN k=5     : 6.26000

5 nuoc gan Cyprus nhat:
   Israel           38,341  cach     686  diem 7.2
   Lithuania        36,732  cach     923  diem 5.9
   Slovenia         36,548  cach   1,107  diem 5.9
   Italy            38,992  cach   1,337  diem 6.0
   Spain            36,215  cach   1,440  diem 6.3
```

| Method | The arithmetic | Result |
|---|---|---|
| **The line** | 3.749 + 0.0000678 × 37,655.2 | **6.30** |
| **k = 1** | Israel alone | **7.20** |
| **k = 3** | (7.2 + 5.9 + 5.9) ÷ 3 | **6.33** |
| **k = 5** | (7.2 + 5.9 + 5.9 + 6.0 + 6.3) ÷ 5 | **6.26** |

The line uses **all 27 countries at once**, through its two learned numbers. k-NN uses
**three**, and keeps all 27 in order to do it.

> **Why two methods can both be right and still disagree.** The line says 6.30; k-NN says
> 6.33. **Neither is *the answer*** — they answer slightly different questions: *what the
> overall trend says at 37,655 USD*, versus *what the most similar countries actually
> score*. Close agreement is **weak evidence** that the pattern is real. A large
> disagreement would be telling you something about the **shape of the data**, not that
> one method is broken.

Notice how `k` moves the answer: **7.20 → 6.33 → 6.26**. `k` is a hyperparameter — **you**
choose it, training never touches it.

### The whole workflow in ten lines

```python
import pandas as pd
from sklearn.linear_model import LinearRegression

lifesat = pd.read_csv("lifesat.csv")
X = lifesat[["GDP per capita (USD)"]].values   # 2 chieu: 27 dong x 1 cot
y = lifesat[["Life satisfaction"]].values

model = LinearRegression()
model.fit(X, y)
print(model.predict([[37_655.2]]))             # Cyprus
```

Switching to instance-based is **exactly two lines**:

```python
from sklearn.neighbors import KNeighborsRegressor
model = KNeighborsRegressor(n_neighbors=3)
```

Everything around it — loading, shaping `X` and `y`, `fit`, `predict` — is **unchanged**.
That uniform interface is Scikit-Learn's central design idea, and it is why the rest of
the book can move quickly through many algorithms. Detail in
[Scikit-Learn's API design](sklearn-api-design.md).

> **The detail that trips everyone: the double square brackets.**
> `lifesat[["GDP per capita (USD)"]]` — one pair returns a **flat column**, two pairs
> return a **table that happens to have one column**. Scikit-Learn insists `X` be
> table-shaped, because the moment you use two inputs instead of one, **nothing else in
> your code has to change**. Single brackets produce a shape error much later, and the
> message is not helpful.

### A model does not know when it is guessing

Change `37_655.2` to something far outside the range it saw — say 200,000 — and it
**still answers confidently**, because a straight line has no notion of where its
evidence stopped.

**That is a habit of mind worth forming now**, not in chapter 4. See [Bad data](bad-data.md)
for the concrete number: 11.22 on a 0–10 scale.

## Trade-offs

| | Instance-based (k-NN) | Model-based (Linear) |
|---|---|---|
| At `fit` | barely anything — just **stores data** | optimises, takes time |
| At `predict` | **slow** — must scan the training data | fast — a few multiplications |
| Deployment carries | **the entire training set** | a few dozen numbers |
| Privacy | **ships the raw data to production** | ships none |
| Explainability | "because it resembles these 3 cases" | "because the coefficient is 0.0000678" |
| Assumptions live in | the **distance function** — no training step to inspect | the chosen model form |
| High-dimensional data | collapses (curse of dimensionality) | holds up better |
| Curved data | follows any shape | only the shape you chose |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Trusting an instance-based model's training score | It **memorised** that set; a high score is a tautology |
| Choosing k-NN and only then noticing it ships the raw data | A privacy violation found just before deployment |
| Treating two equally-scoring models as interchangeable | They answer two different questions |
| Changing the similarity measure without treating it as changing the model | Every prediction changes, with no training step to trace |
| Forgetting the double brackets for `X` | A shape error much later with a useless message |
| Asking a model outside its data range and believing the answer | **A model does not know when it is guessing** |
| Confusing the hyperparameter `k` with a learned parameter | Looking for `k` in `fit`'s output — it is not there |

## FAQ

<details>
<summary>Explain the difference between a utility function and a cost function in one sentence.</summary>

A utility function measures how **good** the model is and training pushes it **up**; a
cost function measures how **bad** it is and training pushes it **down**. Same job,
opposite sign.

</details>

<details>
<summary>The slope says 10,000 more dollars of GDP goes with 0.68 more points. Does money cause happiness?</summary>

That number is **correlation**, not causation. To claim "causes" you would need to rule
out confounders (education, healthcare and inequality all track GDP), a causal mechanism,
and ideally an intervention.

Note that this very dataset already contains evidence against the simple reading: the
**United States is the richest country in the 27 and scores below both Denmark and
Australia**, which are poorer. The relationship clearly **flattens or breaks at the top end.**

</details>

<details>
<summary>Is instance-based ever the right choice?</summary>

Yes, when the decision boundary is irregular and follows no formula, and the data is
dense. k-NN **assumes nothing** about the shape of the data — both its strength and its
weakness.

It is also a **baseline worth running**: if a complex model cannot beat k-NN, the problem
is in the features, not the algorithm.

</details>

<details>
<summary>Why does linear regression's <code>fit</code> give identical results on a rerun when many models do not?</summary>

For a straight line with one input the parameter search has an **exact answer computed in
one pass** — the five lines of arithmetic above. No iteration, no randomness.

Models using gradient descent or random initialisation differ, which is why seeds must be
recorded.

</details>

<details>
<summary>What is the right value of k?</summary>

There is no universal answer — it is a hyperparameter, **chosen by measuring**. On this
dataset k = 1 gives 7.20 (listening only to Israel), k = 3 gives 6.33, k = 5 gives 6.26.
Small k tracks noise; large k flattens the real pattern.

And **never choose k on the test set** — see [Testing and validating](testing-and-validating.md).

</details>

## Related Topics

- [What Machine Learning is](ml-landscape.md) — axis 3 of three
- [Scikit-Learn's API design](sklearn-api-design.md) — three interfaces, and why switching models is two lines
- [Bad data](bad-data.md) — unseen ranges, and the 11.22
- [Overfitting and underfitting](overfitting-underfitting.md) — training performance is necessary but not sufficient
- [Testing and validating](testing-and-validating.md) — how to measure generalisation honestly
- [Performance metrics](performance-metrics.md) — the measure of fit, written up properly

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 1, lessons b07 and b08 (Example 1-1)
