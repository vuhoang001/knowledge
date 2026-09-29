---
title: "k-means cuts in the right place, and cannot say what the groups mean"
sidebar_position: 5
description: "The algorithm finds real structure in 27 countries and puts the cut somewhere sensible, then stops — 'poorer' and 'richer' is the reader's reading, not the output."
tags: [clustering, unsupervised, k-means, machine-learning, homl3, chuong-1]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# k-means cuts in the right place, and cannot say what the groups mean

> **Takeaway:** Drop the label column and k-means still finds real structure and puts the
> cut somewhere sensible. But it **outputs no meaning at all**. "Poorer" and "richer" is
> what *we* read into it. **That is exactly what the missing label column costs.**

## Situation

The same 27-country table, but with **the life-satisfaction column deleted**. What remains:
a country name and a GDP per capita. No labels, so no supervised problem exists.

Question: is anything useful still possible?

## The first hypothesis — and where it is wrong

> "Run clustering and you get segments, then just use the segment names."

The first half is right, the second is not. Clustering returns **numeric group labels** —
`0`, `1` — and **membership lists**. It does not return `"poorer"`, does not return
`"emerging market"`, does not return any words at all.

Deeper: **there is no answer key**, so the question *"is this clustering correct"* **has no
answer** the way *"is this email correctly classified"* does.

## Reproduction

Run for real on 2026-09-29 at `~/learn-lab/ml` — scikit-learn 1.9.1, seed `random_state=42`,
on `lifesat.csv` with the label column removed.

```python
km = KMeans(n_clusters=2, random_state=42, n_init=10).fit(X)   # X = chi cot GDP
```

## Result

```text
k-means 2 nhom:
   nhom: 16 nuoc | thap nhat Russia 26,456 | cao nhat New Zealand 42,404 | tam 34,751
   nhom: 11 nuoc | thap nhat Canada 45,857 | cao nhat United States 60,236 | tam 51,475
```

| group | countries | lowest GDP | highest GDP | centre |
|---|---|---|---|---|
| 1 | 16 | Russia, 26,456 | New Zealand, 42,404 | 34,751 |
| 2 | 11 | Canada, 45,857 | United States, 60,236 | 51,475 |

**Nobody told the algorithm where to cut.** It placed the cut in the largest gap — between
New Zealand (42,404) and Canada (45,857), a **3,453 dollar** gap, wider than any other in
that region.

Compared against the label that was hidden: 11 countries score 7 or above and 16 score
below 7 — **the same 11/16 split**. An interesting coincidence, but **not the same set of
countries**, and the algorithm has no way to know that.

## Mechanism

k-means optimises exactly one thing: **the total squared distance from each point to its
group's centre**. It puts the cut where that number is smallest — that is, in the largest gap.

That objective is **purely geometric**. Nowhere in it is "rich", "poor", "developed market",
or any human concept encoded. The structure it finds is **real**; the **meaning** does not
exist in the output.

## The cost, stated precisely

| Supervised has | Unsupervised does not |
|---|---|
| An answer key — "correct" is measurable | Nothing to compare against |
| Class names chosen by people in advance | Groups have only ordinal numbers |
| Absolute metrics (accuracy, RMSE) | Only intrinsic metrics (silhouette) or indirect evaluation |

So unsupervised results tend to be judged by **whether they help the next step** — the
reasoning the book uses to justify dimensionality reduction: the supervised algorithm
afterwards runs **faster, and is sometimes more accurate**.

## How to use it properly

**1 · Treat clustering as hypothesis generation, not conclusion.** It says *where the
boundaries are*. What those boundaries *mean* is a question a person must answer.

**2 · Always have a person name the groups, and record the basis.** "Group 2 = high
income" is an **interpretation**, and it must be written down somewhere so it can be
argued with six months later.

**3 · Check whether the cut is stable.** Change the seed, change `k`, add a few rows. The
New Zealand / Canada cut is stable because it sits in a real gap. A cut that jumps around
when the seed changes is a cut with nothing behind it.

**4 · If you end up needing labels anyway, consider semi-supervised.** Cluster first,
hand-label **one representative per cluster**, then propagate — see
[Supervised and unsupervised learning](../reference/supervised-unsupervised.md).

## Warning signs in a real project

| Sign | Problem |
|---|---|
| Segment names appear in reports and nobody remembers who chose them | An interpretation has become "the truth" |
| Changing the seed changes membership a lot | The cut is not in a real gap |
| `k` was chosen because "the business wants 4 segments" | Legitimate, but it must be recorded as a business constraint, not a finding |
| Nobody measured silhouette or checked the cut | There is no evidence the groups are real |

## Related Topics

- [Supervised and unsupervised learning](../reference/supervised-unsupervised.md) — the four unsupervised families, and the cost of the label column
- [What Machine Learning is](../reference/ml-landscape.md) — T/E/P: unsupervised has no absolute P
- [Testing and validating](../reference/testing-and-validating.md) — with no labels, "evaluation" means something else entirely
- [Foundations](../index.md)
