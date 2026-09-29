---
title: Testing, validating and the train-dev set
sidebar_position: 7
description: "Each set answers exactly one question. A set is spent the moment you make a decision from it, even if you never trained on it."
tags: [test-set, validation-set, train-dev, cross-validation, no-free-lunch, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Testing, validating and the train-dev set

> **Takeaway:** **A set is spent the moment you make a decision from it** — even if you
> never trained on it. Picking the best of 100 hyperparameter values by test error is
> **already fitting one number** to that test set, and that is how a measured 5% becomes
> 15% in production.

## Goal

Have a mechanical rule instead of intuition: **one set, one question** — and the test
set's question is asked **exactly once**.

## Overview

### Each set answers exactly one question

| Set | Where it comes from | The question it answers |
|---|---|---|
| **training set** | most of the data | none — the model learns from it |
| **validation set** (*dev set*) | held out **from the training set** | which candidate model is best? |
| **test set** | held out, used **once** at the end | what error should I expect on new data? |
| **train-dev set** | held out from the **training data**, only when that data does not look like production | is the model overfitting? |

> Think of the test set as a **sealed reconciliation sample**. You check the final result
> against it **once**. Keep tweaking until that sample matches, and all you have proven is
> **that it matches that sample**.

### Training set and test set

The only way to know how well a model generalises is to **try it on new cases**. Pushing
straight to production works too — but if it is bad, your users complain.

- The error rate on the test set is the **generalization error** (*out-of-sample error*).
- **Low training error with high generalization error is overfitting, stated numerically.**
- A common split is **80/20**. With very large datasets far less than 20% is plenty in
  absolute terms: with 10 million instances, holding out **1%** still gives **100,000** rows.

### Choosing between models without fooling yourself

This is where people go wrong. Train 100 models with 100 hyperparameter values and keep
the one with the lowest test error — **you are adapting the model to that particular test
set**, and the measured 5% becomes 15% in production.

The fix is **holdout validation**:

```text
1. Cat mot phan training set ra lam validation set
2. Train cac model ung vien tren training set da thu nho
3. Chon cai tot nhat tren validation set
4. Train lai ke thang do tren TOAN BO training set
5. Do DUNG MOT LAN tren test set
```

Step 4 is easy to skip and it matters: the winner was chosen using a reduced training set,
so it must be retrained on everything before you publish.

### The validation set has to be the right size

| Validation set | What goes wrong |
|---|---|
| **Too small** | The comparison is **noisy**, so you may crown the wrong candidate |
| **Too large** | The reduced training set is much smaller, so you are comparing models trained on **far less data** than the final model gets |

The book's picture for "too large": **selecting the fastest sprinter to run a marathon.**

**Cross-validation** buys its way out of both, by repeating with many small validation sets
and averaging. The price is stated plainly: **training time multiplied by the number of
validation sets**. What you buy is **a more trustworthy comparison, not a better model.**

### Data mismatch and the train-dev set

One more trap: **data mismatch** — plenty of training data, but it **does not look like**
production data. Andrew Ng's **train-dev set** diagnoses exactly that.

The book's example: a phone app identifying flowers. You can download **millions** of
flower photos from the web, but only about **1,000** were actually taken with the app —
and only those represent production.

| Set | Cut from | Why |
|---|---|---|
| Train | web photos | plentiful |
| **Train-dev** | **web photos** | looks like the training data |
| Dev | **app photos** | must be as representative of production as possible |
| Test | **app photos** | must be as representative of production as possible |

Then evaluate **in order**:

```text
danh gia tren train-dev set (giong du lieu train)
  |-- te  -> OVERFITTING
  |-- tot -> danh gia tren dev set (giong production)
                |-- te -> DATA MISMATCH
```

> **The train-dev set exists because two failures look identical.** A bad dev score alone
> **cannot tell you** whether the model memorised its training data or whether the
> training data simply does not resemble production. The two have **completely different
> cures** — and no amount of regularization fixes the second.

Note the precondition: **you only need a train-dev set when you knowingly trained on data
that is not from production.** The cure for data mismatch is preprocessing the web images
to look more like app images, then retraining.

### The no free lunch theorem

**With no assumptions about the data, no model is better than any other a priori.**
*A priori* means "in advance, before trying".

**Choosing a model is itself an assumption:** pick a linear model and you are assuming the
data is fundamentally linear. In practice you make reasonable assumptions and **evaluate a
handful of models**.

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — scikit-learn 1.9.1, seed `random_state=42`,
on the book's 27 countries.

Holding out 20% as a test set:

```text
tach 80/20 tren 27 nuoc (seed 42): test = ['Germany', 'Israel', 'Russia', 'Slovenia', 'Spain', 'United Kingdom']
   RMSE train (21 nuoc): 0.38
   RMSE test  (6 nuoc): 0.44
   lech nhat: Israel — doan 6.29, that 7.2
```

| | countries | typical miss (RMSE) |
|---|---|---|
| training set | 21 | **0.38** |
| test set | 6 | **0.44** |

The test number — **0.44** — is the **estimate of the generalization error**: how far off
the model will be on countries it never saw. It is **worse** than the training number, as
expected.

The worst test country is **Israel: predicted 6.29, real 7.2**.

**Note the size of that test set: 6 countries.** With 6 points, 0.44 is itself very noisy —
change the seed and it moves. That is precisely the "too small" row of the table above,
and why this 27-row dataset is excellent for teaching and useless for deciding.

## Trade-offs

| A large test set | A small test set |
|---|---|
| A firmer estimate of generalization error | A noisy estimate that moves with the seed |
| Less data left to train on | More data to train on |
| Worth it when data is scarce | Enough when data is plentiful (1% of 10M = 100,000) |

| Holdout validation | Cross-validation |
|---|---|
| Trains once, fast | Trains **many times** — time multiplied |
| Noisy comparison if the set is small | More trustworthy comparison |
| Enough when data is plentiful | Needed when data is scarce |

**Cross-validation buys a more trustworthy comparison, not a better model.**

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Tuning hyperparameters on the test set | **A measured 5% becomes 15% in production** |
| Peeking at the test set "just to look" | Every look that informs a decision spends it |
| Forgetting to retrain the winner on the full training set | Shipping a model trained on less data than necessary |
| Validation set too large | Picking the sprinter to run the marathon |
| Validation set too small | Crowning the wrong candidate out of noise |
| Using a train-dev set when there is no data mismatch | An extra set, training data wasted for nothing |
| Blaming overfitting when it is really data mismatch | Endlessly raising regularization; **no amount fixes it** |
| Reporting a test score without the test set's size | 0.44 on 6 rows and 0.44 on 6,000 rows are different things |

## FAQ

<details>
<summary>Trained on web-scraped photos, production is phone photos. Good on train-dev, bad on dev. Diagnosis?</summary>

**Data mismatch**, not overfitting. It does well on train-dev — a set cut from *the same
web source* — so it did **not** memorise its training data. It does badly on dev, made of
app photos, so the problem is that **the two sources do not match**.

The cure: preprocess the web images to look more like app images and retrain. **More
regularization will not help**, and that is exactly why the train-dev set exists.

</details>

<details>
<summary>If no model is better a priori, why does everyone still start from the same handful of standard models?</summary>

Because **nobody is really making "no assumptions"**. The theorem ranges over **every
conceivable** problem, including ones where the data is random or adversarial.

Real data is not like that: it has structure, it is usually smooth, relationships are
often near-linear or hierarchical. The standard models encode exactly those assumptions.
The theorem is not violated; it simply does not apply to the set of problems people
actually meet.

</details>

<details>
<summary>Can a test set be reused for the next model?</summary>

In theory no, and every reuse makes it **a little less trustworthy**. In practice people
do reuse it, so two mitigations: **refresh the test set periodically** with new data, and
**record how many times it has been touched** — a test set that has decided 50 questions
is no longer an unseen sample.

</details>

<details>
<summary>Why should test error be higher than training error? What if it is lower?</summary>

Higher is normal: the model was optimised on the training set, so it fits it better.

Meaningfully **lower** is almost always a **bug** — usually leakage, or a test set that
happens to be easier. See
[the leakage case study](../case-studies/chon-feature-truoc-khi-tach.md) and the last row
of the [diagnostic table](overfitting-underfitting.md).

With a 6-row test set like the example above, a difference in either direction could be
pure noise.

</details>

<details>
<summary>Can cross-validation replace the test set?</summary>

**No.** Cross-validation replaces the **validation set** — it answers *"which model is
best"*. The test set answers a different question: *"how wrong is the winner really"*.

Using cross-validation to choose a model and then reporting the cross-validation score as
the final result is **the same mistake** as tuning on the test set, one level up.

</details>

## Related Topics

- [Overfitting and underfitting](overfitting-underfitting.md) — low training error plus high test error, stated numerically
- [Bad data](bad-data.md) — unrepresentative data is data mismatch seen from the data side
- [Scikit-Learn's API design](sklearn-api-design.md) — a pipeline keeps the sets from leaking into each other
- [Performance metrics](performance-metrics.md) — "error" only means something once you fix the measure
- [Case study: selecting features before the split](../case-studies/chon-feature-truoc-khi-tach.md)

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 1, lesson b11
- David Wolpert (1996) — *The Lack of A Priori Distinctions Between Learning Algorithms*
