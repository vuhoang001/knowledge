---
title: Axis 1 — Supervised, unsupervised, and everything between
sidebar_position: 2
description: "Five kinds of supervision sorted by one question: where does the learning signal come from, and who pays for it."
tags: [supervised, unsupervised, semi-supervised, self-supervised, reinforcement-learning, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Axis 1 — Supervised, unsupervised, and everything between

> **Takeaway:** Five kinds of supervision differ on exactly one thing — **where the
> learning signal comes from**. And since the algorithms are free and raw rows are often
> nearly free, **the label column is the expensive part**. A supervised project plan is
> really a labelling plan.

## Goal

Name the problem correctly before picking an algorithm, and know the **labelling bill**
up front instead of discovering it mid-project.

## Overview

### The summary table: where the signal comes from

| Kind | The learning signal comes from | Who pays |
|---|---|---|
| **Supervised** | A label on **every** instance | People — the most expensive |
| **Semi-supervised** | A small labelled part, the rest unlabelled | People, but far less |
| **Self-supervised** | Labels **manufactured from the unlabelled data itself** | Nobody |
| **Unsupervised** | No labels at all | Nobody |
| **Reinforcement** | The **rewards and penalties** the agent's own actions earn | The environment |

The first four sit on one scale: *how much human labelling is needed*. **Reinforcement
learning is not on that scale at all** — its signal is produced by *acting*, so it needs
an **environment to act in**, not a dataset to read.

### Supervised: every row already has the answer

The training set has the input columns **plus an answer column** called the **label**.
Training teaches the model to fill that column in for rows where it is still empty.

Two jobs, differing only in **what the answer column holds**:

| | Classification | Regression |
|---|---|---|
| Predicts | a **class** | a **number**, called a *target* |
| Book example | a spam filter | a car's price |

These two are **not as separate as they look**. Logistic regression carries the word
"regression" but is used for classification, because it outputs a *probability* of
belonging to a class — say a 20% chance of being spam. To turn a probability into a
class you pick a cut-off: 0.5 or above is spam, below is ham.

**Read the two words as two questions about the label column, not as two toolboxes.**
Let the label decide, not the algorithm.

### Vocabulary: several words for the same thing

| Thing | Other names | Note |
|---|---|---|
| **feature** | *predictor*, *attribute* | an input column, e.g. a car's mileage |
| **label** | *target* | *target* is commoner in regression, *label* in classification |

The word `feature` is used at **two zoom levels**, and the book uses both in consecutive sentences:

- one cell: *"this car's mileage feature is 15,000"*
- the whole column: *"the mileage feature is strongly correlated with price"*

Harmless in speech, **dangerous in code**: the second can only be computed over every
row, the first is a single value. Decide which zoom level a sentence means before you
turn it into code.

### The price of supervision

Algorithms are free. Raw rows are often nearly free. **The answers are not.** That is the
whole content of this section, and it sets the size of most supervised projects.

The next two kinds exist for exactly this reason — both are ways to buy the same label
column with less human work.

### Unsupervised: four families, four questions

The rows look the same as in supervised learning; **the label column is simply missing**.

| Family | The question it asks |
|---|---|
| **Clustering** | Which groups of similar instances exist? |
| **Visualisation / dimensionality reduction** | Can it be plotted, or simplified without losing much? |
| **Anomaly / novelty detection** | What does not belong? |
| **Association rule learning** | Which attributes go together? |

**Clustering** is a `GROUP BY` where *the algorithm invents the grouping column itself*.

**Dimensionality reduction is lossy on purpose.** Merging mileage and age into one "wear
and tear" feature throws away the ability to ask about either separately, and you accept
that for speed and sometimes accuracy. The word holding it up is **correlated**: features
that move together carry overlapping information, so merging costs little. It **stops
being safe** when the two columns were only moving together *in this particular sample*.

**Anomaly vs novelty** is the same job with different data hygiene:

| | Anomaly detection | Novelty detection |
|---|---|---|
| Spots | unusual instances | instances of a kind **never seen** |
| Trained on | mostly normal instances | a training set **completely free** of the kind it must flag |
| A new Chihuahua photo, when 1% of training dog photos are Chihuahuas | **may be flagged** — rare and different | **not flagged** — Chihuahuas were in training |

**The choice between the two is made when you assemble the training data, not when you
pick an algorithm.**

### With no answer key, "good" has to be defined

There is no label column, so nothing to compare against: *"is this clustering correct?"*
**has no answer** the way *"is this email correctly classified?"* does. That is the real
difference from supervised learning.

So unsupervised results tend to be judged by **whether they help something downstream** —
the book's own justification for dimensionality reduction: the supervised algorithm
afterwards runs **faster, and is sometimes more accurate**.

### Semi-supervised: label a few, not all

The photo service is the everyday example:

```text
1. phan khong giam sat: phan cum anh
      nguoi A xuat hien o anh 1, 5, 11
      nguoi B xuat hien o anh 2, 5, 7
2. phan cua ban: mot nhan cho moi nguoi ("nguoi A la ...")
3. dich vu dat ten cho toan bo cum
```

Most semi-supervised algorithms are **combinations of unsupervised and supervised ones**
underneath.

### Self-supervised: the data labels itself

Generate a **fully labelled** dataset from a **completely unlabelled** one, then train on
it with ordinary supervised techniques.

The book's example: mask a random patch out of every image in a large photo set and train
a model to reconstruct it. **The masked image is the input, the original is the answer.**
Nobody writes a label; the data supplies its own.

The trick is that the model learns **representations useful far beyond** that artificial
task. A model trained to repair images turns out to be a good starting point for
**classifying** them, after *fine-tuning* — training a little more on the task you
actually care about. Reusing a model this way is **transfer learning**, one of the most
important ideas in modern ML.

> **The limit follows from the same logic:** the invented task **must demand the kind of
> understanding the real task needs**, or nothing worth reusing gets learned.

### Reinforcement: learning from rewards

```text
agent ----- thuc hien hanh dong ----> moi truong
  ^                                       |
  +---- quan sat + thuong hoac phat ------+
```

The learning system, the **agent**, observes an environment, selects and performs
**actions**, and gets **rewards** back (or **penalties** — negative rewards). It must
learn for itself the best strategy, the **policy** — a rulebook of *"in this situation,
do this"*, **learned rather than written**. The `CASE WHEN` nobody had to write.

**What makes it hard is timing:** the reward for a good action can arrive long after the
action, so the agent must work out *which of many earlier choices earned it*. Walking
robots and AlphaGo are the standard examples precisely because both take long chains of
actions before any score arrives.

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — scikit-learn 1.9.1, on the book's
27-country dataset.

**One table, two supervised problems:**

| Country | GDP per capita (the feature) | Life satisfaction (the label) |
|---|---|---|
| Russia | 26,456 | 5.8 |
| Poland | 32,238 | 6.1 |
| Finland | 47,261 | 7.6 |

- Predicting the score (5.8 / 6.1 / 7.6 — any number on the 0–10 scale) is **regression**.
- Turn the label into two classes, *"7 or above"* and *"below 7"*, and **the same table**
  becomes **classification**: 11 countries in the first class, 16 in the second. Russia
  and Poland are "below 7"; Finland is "7 or above".

**The same table with the label column deleted becomes unsupervised.** Running k-means
asking for 2 groups:

| group | countries | lowest GDP | highest GDP | centre |
|---|---|---|---|---|
| 1 | 16 | Russia, 26,456 | New Zealand, 42,404 | 34,751 |
| 2 | 11 | Canada, 45,857 | United States, 60,236 | 51,475 |

Nobody told the algorithm where to cut; it put the cut between New Zealand (42,404) and
Canada (45,857). And it **cannot tell you what the groups *mean***. "Poorer" and "richer"
is *our* reading, not something the algorithm outputs.

**That is exactly what the missing label column costs: the algorithm finds structure, and
a person has to name it.**

**Self-supervised has no honest case in this table — and seeing why is the best way to
pin the idea down.** Hide Hungary's score (5.6), train a line on the other 26 countries,
and ask it about Hungary: it answers **5.87**. That is **not** self-supervised. The 5.6
is a label **people already produced** (a survey result), so this is ordinary supervised
learning with one row held aside. Self-supervised starts from data with **no** labels and
*manufactures* them.

## Trade-offs

| Supervised | Unsupervised |
|---|---|
| There is an answer key — "correct" is measurable | No answer key; "good" must be defined |
| The label column is the biggest bill | No labelling cost |
| Results are defensible to the business | Results need a person to name and interpret them |

| Semi-supervised | Self-supervised |
|---|---|
| Ask a human for a few labels, spread them over machine-found clusters | Manufacture labels from data you already have |
| Works when the data has clear cluster structure | Works when the invented task forces the right learning |
| The few labels still have to be right | No human labels to get wrong |

| Anomaly detection | Novelty detection |
|---|---|
| Tolerates a few odd cases in training | Demands a training set **completely clean** of the target kind |
| Easier to assemble data for | Harder, but separates "rare" from "new" |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Planning a supervised project without planning the labelling | You discover the biggest bill mid-project |
| Reading "classification vs regression" as two sets of algorithms | You miss logistic regression, and that one algorithm often does both |
| Mixing the two zoom levels of `feature` in one piece of code | Computing a column statistic and using it as a single row's value |
| Treating self-supervised as unsupervised | Forgetting you still need a test set like any supervised problem |
| Merging two correlated columns without checking the correlation holds | Losing real information to a coincidence of the sample |
| Choosing novelty detection but training on data containing the target kind | It silently becomes anomaly detection and nobody knows |
| Expecting clustering to name the groups | It does not, and it does not warn you that it did not |

## FAQ

<details>
<summary>My problem has labels, but very few and very expensive — what now?</summary>

That is semi-supervised. The pragmatic recipe from HOML3 chapter 9: **cluster the
unlabelled data first, hand-label one representative per cluster, then propagate the
label across the cluster.**

For the same hand-labelling effort this usually beats labelling that many rows at random
by a wide margin — because each label buys more rows.

</details>

<details>
<summary>Why does a made-up task teach something real?</summary>

Nobody needs image patches restored. The masking task is useful because **filling the
hole forces the model to learn what images are generally like** — and that knowledge
carries over to the job you do care about after fine-tuning.

The limit follows from the same logic: the invented task must **demand the kind of
understanding** the real task needs. Masking one random pixel forces nothing.

</details>

<details>
<summary>Why is a photo service's face grouping semi-supervised rather than unsupervised?</summary>

The clustering part is unsupervised, but **the last step needs exactly one human label per
cluster** to name it. Drop that step and the service can only say "these three photos are
the same person", not who. That handful of labels is the "semi".

</details>

<details>
<summary>With no answer key, how does anyone decide a clustering is good, or how many clusters to ask for?</summary>

Two routes. **Intrinsic:** the silhouette score — how clearly each point belongs to its
own group rather than a neighbouring one. **Extrinsic and more pragmatic:** does it make
the downstream step better?

</details>

<details>
<summary>Is reinforcement learning on the same scale as the other four?</summary>

No, and that matters. The other four differ by **how much human labelling** they need. RL
does not read data — it **acts** and gets scored. It needs an **environment**, not a
dataset. That is why the book draws it as a separate loop.

</details>

## Related Topics

- [What Machine Learning is](ml-landscape.md) — T/E/P, and the three sorting axes
- [Batch and online learning](batch-vs-online.md) — axis 2
- [Instance-based and model-based](instance-vs-model-based.md) — axis 3
- [Bad data](bad-data.md) — wrong labels are worse than no labels
- [Performance metrics](performance-metrics.md) — classification and regression are measured with different yardsticks
- [Data Quality](../../../data-quality/index.md)

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 1, lessons b03, b04 and b05
