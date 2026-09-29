---
title: "Luxembourg 11.22 on a 0–10 scale"
sidebar_position: 3
description: "A model answers confidently outside the range it ever saw, above the top of the scale, with no warning of any kind."
tags: [extrapolation, sampling-bias, model-rot, machine-learning, homl3, chuong-1]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Luxembourg 11.22 on a 0–10 scale

> **Takeaway:** A perfectly sound linear model, trained on perfectly clean data, returns
> **11.22** for a **0–10** scale. No exception, no warning. **A model does not know when
> it is guessing.**

## Situation

Géron's life-satisfaction dataset: 27 countries, one feature (GDP per capita), one label
(a 0–10 score). No empty cells, no outliers, no type errors. By every ordinary
data-quality criterion, **this table is clean**.

Model: `LinearRegression`. Question: what does Luxembourg score?

## The first hypothesis — and where it is wrong

> "The data is clean and the model is simple, so the prediction will be reasonable."

It is wrong because *"clean"* and *"representative"* are **two different properties**, and
no data-quality test run on the table itself detects the second.

Every country in the 27 rows has a GDP per capita between **26,456** (Russia) and
**60,236** (United States). Luxembourg is **110,261** — nearly double the highest ever seen.

## Reproduction

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1, on
the book's own dataset (`ageron/data`).

```python
s27 = pd.read_csv("lifesat.csv")        # 27 nuoc
s36 = pd.read_csv("lifesat_full.csv")   # 36 nuoc, them ca dau ngheo lan dau giau
l27 = LinearRegression().fit(X27, y27)
l36 = LinearRegression().fit(X36, y36)
```

## Result

```text
duong tren 27 nuoc: 3.749 + 0.0000678 x GDP
duong tren 36 nuoc: 5.580 + 0.0000233 x GDP

Luxembourg GDP 110,261 — diem that 6.9
   duong 27 nuoc doan: 11.22   <- vuot tran thang 0-10
   duong 36 nuoc doan: 8.15
```

| Model | Trained on | Slope | Luxembourg | Error |
|---|---|---|---|---|
| Straight line | 27 countries | 0.0000678 | **11.22** | **+4.32**, and **above the top of the scale** |
| Straight line | 36 countries | 0.0000233 | 8.15 | +1.25 |
| *The truth* | — | — | *6.9* | — |

The slope falls to **about a third** once the 9 missing countries are added.

## Mechanism

**Three different failures stacked on top of each other**, each its own lesson:

**1 · Sampling bias — the sample does not cover the range.** Those 27 countries are not a
random sample of the world; they are its middle. The steep line **was not wrong about its
own data** — it fits those 27 points well. **It was wrong about the world.**

**2 · Extrapolation — a straight line has no notion of a boundary.** The line carries no
information about *where its evidence stopped*. Asked at 110,261, it multiplies and adds
and answers. Asked at 200,000 it would answer too. **There is nowhere in the model's
structure to say "I don't know".**

**3 · Model rot — and even after the fix it is still wrong.** The line trained on 36
countries brings the prediction down to 8.15, but that is still **1.25 points too high**.
That remainder is **no longer a data problem** — it is a model problem: a straight line
**cannot bend down at the rich end**, and the data does bend (the United States is the
richest of the 27 and scores below both Denmark and Australia).

Three failures, three different places to fix. Fixing the first and assuming you are done
is how you lose another round.

## How to prevent it

**1 · Record the range of every feature at training time, and check it at prediction time.**

```python
lo, hi = X_train.min(axis=0), X_train.max(axis=0)
# luu lo/hi cung voi model; luc serve thi canh bao neu dau vao nam ngoai
```

This is the cheapest check on this page and almost nobody does it. It turns a confident
answer into a warning.

**2 · Check the ceiling and floor of the scale.** If the label lives on a 0–10 scale then
**11.22 must be an alert**, not a value. Constraining the output's domain is the cheapest
possible test, and it catches this instantly.

**3 · Plot the data before choosing a model form.** The scatter plot shows the
relationship **flattening at the rich end**. A straight line cannot follow that shape, and
this is visible **before** training.

**4 · Ask "who is missing from this sample" before asking "is this sample big enough".**
See [Bad data](../reference/bad-data.md): more data cures sampling noise and **does not**
cure sampling bias.

## Warning signs in a real project

| Sign | Suspicion |
|---|---|
| A prediction outside the label's valid domain | **Certainly a problem** |
| Serving-time inputs outside the training range | High |
| A linear model on data that saturates or has a ceiling | High |
| Good offline, much worse for one customer segment | High — that segment may be absent from training |
| Nobody recorded the feature ranges at training time | Nothing can be detected at all |

## Related Topics

- [Bad data](../reference/bad-data.md) — sampling bias, and why more data does not cure it
- [Batch and online learning](../reference/batch-vs-online.md) — model rot: answering with yesterday's world
- [Instance-based and model-based](../reference/instance-vs-model-based.md) — a model does not know when it is guessing
- [Overfitting and underfitting](../reference/overfitting-underfitting.md) — the residual 1.25 is underfitting, not a data fault
- [Foundations](../index.md)
