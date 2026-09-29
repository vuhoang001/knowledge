---
title: Bad data — the first four challenges
sidebar_position: 5
description: "None of them is fixed by a better algorithm. All four fail silently: the job succeeds, the model trains, numbers come back, and it is still wrong."
tags: [data-quality, sampling-bias, sampling-noise, feature-engineering, missing-values, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Bad data — the first four challenges

> **Takeaway:** When a model disappoints, the culprit is **bad data** or **bad model**.
> All four ways the data goes bad share one dangerous property: **nothing fails** — the
> job succeeds, the model trains, numbers come back, and the model is **confidently wrong
> exactly where nobody sampled**.

## Goal

Check the data **before** blaming the algorithm, and distinguish the two sampling
problems — because **the same action fixes one and worsens the other**.

## Overview

```text
Cai gi co the hong
├── du lieu xau    <- bai nay
│   ├── 1. so luong khong du
│   ├── 2. du lieu khong dai dien
│   ├── 3. chat luong kem
│   └── 4. feature khong lien quan
└── model xau      <- bai sau: overfitting va underfitting
```

These are the data-quality problems you already chase in pipelines, **with one nasty
twist: the model still trains, still returns numbers, and is still wrong.**

### 1 · Insufficient quantity

A toddler needs to be shown an apple a few times. ML algorithms need **thousands** of
examples for simple problems, and often **millions** for hard ones like image or speech
recognition.

The Banko and Brill result the book cites is uncomfortable: on a natural-language
disambiguation task (choosing between "to", "two" and "too" from context), **very
different algorithms performed almost identically once given enough data.**

The detail more memorable than the conclusion: **the ranking flips.** The algorithm that
was worst on small data (Winnow, ~0.75) ends up **best** on large data; the one that was
best at the start (Memory-Based, ~0.83) finishes **last** (0.942).

**Comparing algorithms on a small dataset can mislead you completely.**

The opposite caveat matters too: small and medium datasets are still very common, and
**getting more data is not always cheap or possible.**

### 2 · Nonrepresentative training data

To generalise well, the training data **must represent the cases you want to generalise to.**

Two ways a sample can fail — and **only one of them is fixed by collecting more data**:

| Problem | Cause | Does more data fix it |
|---|---|---|
| **sampling noise** | the sample is **too small**, so it is unrepresentative **by chance** | **Yes** |
| **sampling bias** | the **sampling method** is flawed, so even a large sample is unrepresentative | **No — it just makes the wrong answer more confident** |

**The classic case of sampling bias:** in 1936 the *Literary Digest* mailed a poll to
about **10 million** people, got **2.4 million** answers, and predicted Landon would win
57%. **Roosevelt won with 62%.** A huge sample, picked the wrong way.

> **Before anyone proposes "let's get more data", work out which of the two you have.**
> The same action cures the first and worsens the second.

### 3 · Poor-quality data

Errors, **outliers** (instances far from all the others) and **noise** make the
underlying pattern harder to detect, so cleaning is usually worth the time.

- **Clear outliers** are often best **discarded or fixed by hand**.
- **Instances missing a few features** — say 5% of customers who did not give their age —
  force a choice:

| Option | In SQL terms | The real cost |
|---|---|---|
| Drop the attribute | `DROP COLUMN age` | **Removes a feature for every row** to deal with 5% |
| Drop those instances | `WHERE age IS NOT NULL` | The customers who withheld their age **may not resemble** those who gave it |
| Fill the values, e.g. with the median | `COALESCE(age, median_age)` | Inserts a value **nobody observed**, and quietly makes those rows look average |
| **Train one model with the feature and one without** | build both; rows that have the value go to the first, rows that lack it to the second | **The only one that produces evidence instead of a preference** — and cheap when the model is cheap |

**These four are not interchangeable.** The first three are all undecidable preferences.
The fourth is measurable.

### 4 · Irrelevant features

Garbage in, garbage out. The cure is **feature engineering**:

| Step | In SQL terms |
|---|---|
| Select the most useful existing features | choose which columns go into the `SELECT` |
| Extract new ones by combining or reducing | a derived column, like "wear and tear" from mileage and age |
| Create features from new data | join in a new source |

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — scikit-learn 1.9.1, on the book's dataset.

The 27-country table shows **two of the four** problems.

**Insufficient quantity.** 27 rows is tiny. The book's point: even simple problems need thousands.

**Nonrepresentative data.** Every country in the table has a GDP per capita between
**26,456** (Russia) and **60,236** (United States). Ask the line about a richer country
and it goes badly wrong:

```text
duong tren 27 nuoc: 3.749 + 0.0000678 x GDP
duong tren 36 nuoc: 5.580 + 0.0000233 x GDP

Luxembourg GDP 110,261 — diem that 6.9
   duong 27 nuoc doan: 11.22   <- vuot tran thang 0-10
   duong 36 nuoc doan: 8.15
```

| Country (not in the 27) | GDP per capita | real score | line on 27 rows | line on 36 rows |
|---|---|---|---|---|
| Luxembourg | 110,261 | 6.9 | **11.22** | 8.15 |

**11.22 is above the top of the 0–10 scale.** Adding the 9 missing countries (South
Africa, Colombia, Brazil, Mexico, Chile, Norway, Switzerland, Ireland, Luxembourg) makes
the line **much flatter**: the slope drops from 0.0000678 to 0.0000233 per dollar, and
Luxembourg's prediction falls to 8.15.

Still **1.25 points too high**, because **a straight line cannot bend down at the rich
end**. That is no longer a data problem — it is a model problem, see
[Overfitting and underfitting](overfitting-underfitting.md).

The most important point: **the steep line was not wrong about its own data. It was wrong
about the world**, because the sample it learned from covered only the middle of the range.

**Poor-quality data.** None here: every row has both numbers.

**Irrelevant features.** GDP per capita is the only feature, so there is nothing to select or drop.

## Trade-offs

| Getting more data | Cleaning the data you have |
|---|---|
| Cures sampling noise | Cures noise and outliers |
| **Does not cure sampling bias** | Does not cure missing coverage |
| Expensive, slow, sometimes impossible | Cheaper, but costs human time |

| Drop column | Drop rows | Fill with median | Train two models |
|---|---|---|---|
| Loses a feature for **every** row | Loses rows, **may skew the sample** | Invents an unobserved value | Keeps every row, invents nothing |
| Cheapest | Cheap | Cheap, the default in many tools | Twice the cost, **and the only measurable one** |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Blaming the algorithm before checking the data | Several model swaps, none touching the cause |
| Proposing "more data" when the problem is **bias** | A bigger sample just makes the wrong answer **more confident** |
| Comparing algorithms on a small set and deciding | The ranking flips at scale — see Banko & Brill |
| Filling with the median and forgetting | Those rows **quietly look average**, and nobody knows which they are |
| Trusting the model outside the training range | 11.22 on a 0–10 scale, with no warning |
| Treating "the job succeeded" as evidence the data is fine | **Bad data fails nothing** |

## FAQ

<details>
<summary>I have 30 rows and a model that fits them perfectly. Which problem should worry me most?</summary>

**Insufficient quantity**, and its direct consequence. With 30 rows a flexible model will
**always** find some rule true of every row — and that rule is evidence about those 30
rows, not about the world.

"Fits perfectly" here is almost certainly [overfitting](overfitting-underfitting.md), and
there is no way to detect it until you hold data back — see
[Testing and validating](testing-and-validating.md).

</details>

<details>
<summary>What does standard tooling actually do with empty cells, and what does filling with the median cause later?</summary>

`scikit-learn`'s `SimpleImputer` implements three of the four options above, and adds an
idea the lesson does not mention: an **indicator column** marking which values were filled
(`add_indicator=True`).

That column matters, because it gives back what imputation took away: **the ability to
distinguish "age 35" from "unknown, assumed 35".** If the fact that a customer withheld
their age carries information — and it usually does — the indicator *is* that feature.

</details>

<details>
<summary>How do I know my sample is biased when I have no ground truth to compare against?</summary>

There is no certain test, but three things work: compare the sample's **marginal
distributions** against a known population source; check the **range** of every important
feature (exactly what exposed the problem in the 27-country table — no GDP below 26,456);
and trace the **sampling mechanism** and ask who is systematically excluded.

The *Literary Digest* failed on the third: its mailing list came from car registrations
and telephone directories, in 1936.

</details>

<details>
<summary>How is "bad data" different from the "dirty data" of an everyday pipeline?</summary>

They partly overlap. Dirty data (wrong types, duplicate rows, unexpected nulls) usually
**fails something**, or at least turns a test red.

The first two problems here — **insufficient** and **nonrepresentative** — **cannot be
detected by any test run on the data itself**. The data is perfectly valid. It is just
the wrong data.

</details>

## Related Topics

- [Overfitting and underfitting](overfitting-underfitting.md) — the other branch of the "what can go wrong" tree
- [Testing and validating](testing-and-validating.md) — how to catch these in numbers
- [Instance-based and model-based](instance-vs-model-based.md) — why 11.22 came with no warning
- [Supervised and unsupervised learning](supervised-unsupervised.md) — labels are the expensive part, and wrong labels are worse
- [Data Quality](../../../data-quality/index.md) — six dimensions, applied to the source table
- [Case study: selecting features before the split](../case-studies/chon-feature-truoc-khi-tach.md)

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 1, lesson b09
- Banko & Brill (2001), the data-versus-algorithms result
