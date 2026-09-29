---
title: What Machine Learning is, and when it is worth it
sidebar_position: 1
description: "Mitchell's T/E/P definition turns a wish into three things you can go and fetch; four situations where ML beats hand-written rules."
tags: [machine-learning, mitchell, supervised, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# What Machine Learning is, and when it is worth it

> **Takeaway:** Machine Learning is programming by **example** instead of by **rule** —
> the arrow turns around. And a problem only exists once you can name **all three** of
> T, E and P. Miss one and what you have is a *wish*, not an ML problem.

## Goal

Have a test that is **destructive on purpose**: three questions that kill most "let's
use AI for this" requests inside a single meeting, instead of after a quarter.

## Overview

### The arrow turns around

```text
Lập trình truyền thống:  dữ liệu + luật     ->  chương trình  ->  đáp án
Machine Learning:        dữ liệu + đáp án   ->  training      ->  luật (model)
```

In SQL terms: traditional programming is you writing the `CASE WHEN` rules yourself.
Machine Learning is you handing over rows that **already have the answer column filled
in**, and training works out that `CASE WHEN` for itself.

### Two definitions, and only one of them is usable

| | The statement | What it is for |
|---|---|---|
| **Arthur Samuel, 1959** | The field that gives computers the ability to learn without being explicitly programmed | Explaining the *idea* to an outsider |
| **Tom Mitchell, 1997** | A program learns from experience **E** with task **T** and performance measure **P**, if its performance on T — measured by P — improves with E | **Deciding whether you can start at all** |

Samuel's definition says what ML *is*. Mitchell's says whether you *have a problem to
begin with*. Only the second one is measurable.

### The three blanks you must fill

| Letter | What you must be able to name | In the spam filter |
|---|---|---|
| **T** — task | The job to be done | Label an email *spam* / *not spam* |
| **E** — experience | The data it learns from; one example is a *training instance* | Emails users have already labelled |
| **P** — performance measure | The yardstick it will be judged by | Share of emails classified correctly |

**Most ML requests die at E or at P** — nobody has the labelled data, or nobody agrees
what "better" means. Finding that out costs one meeting; finding it out late costs a quarter.

> **P is not a report you read afterwards, it is the target.** The definition says
> performance improves *as measured by P*, so **whatever P ignores, the system is free
> to be bad at**. The spam filter's P above — share classified correctly — treats
> *letting one spam through* and *blocking one real email* as **the same mistake**. For
> a mail system those are not the same mistake at all. Choosing P is a **design
> decision**, not a formality.

### Data alone is not experience

Downloading all of Wikipedia is an enormous amount of data, and **nothing has been
learned**: there is no T and no P improving with it.

This is precisely the boundary that gets crossed in data work: landing a big table in
the lake makes **no report more accurate** on the day it arrives. "We have the data" has
never on its own been an argument that a model is possible.

### Four situations where ML beats hand-written rules

| Situation | Why ML wins |
|---|---|
| The existing solution is a long list of hand-tuned rules | ML shortens the code and simplifies maintenance |
| **There is no good traditional solution at all** | Speech recognition — nobody can write rules separating "one" from "two" across every speaker and every noisy room |
| **Fluctuating environments** | Retrain on fresh data; this is the sharpest advantage |
| Insight into large or complex data | Open the model up and read what it learned — **data mining** |

**The third situation differs from the other three in kind.** In the other three, ML is
*a better tool for the same job*. Here it is **a different operating model**. A
rule-based filter needs a human to notice that spammers now write "For U" instead of
"4U" and to patch it. A retrained filter closes that loop itself.

The price: **the system now changes without anyone deciding it should** — exactly why
later sections spend so long on bad data and on monitoring.

### When ML is *not* the answer

**When the rules are short and stable.** The table below is a real comparison, not a
hypothetical.

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1, on
**the book's own dataset** (`ageron/data`, `lifesat.csv`, 27 countries).

A person could write this rule by hand: *if GDP per capita is above 40,000 USD predict
7, otherwise predict 6.* One `CASE WHEN`. Against the line training finds:

| Country | GDP per capita | real score | the hand rule | the trained line |
|---|---|---|---|---|
| Hungary | 31,008 | 5.6 | 6 | 5.85 |
| Israel | 38,341 | 7.2 | 6 | 6.35 |
| Denmark | 55,938 | 7.6 | 7 | 7.54 |
| United States | 60,236 | 6.9 | 7 | 7.83 |

```text
sai so tuyet doi trung binh tren 27 nuoc: 0.3125
lech nhieu nhat: United States — du doan 7.83, that 6.9
```

The hand rule misses by **0.33** points on average; the trained line by **0.31**. With
*one* input column and *27* rows, a one-line `CASE WHEN` is nearly a match for an entire model.

**That is the point.** ML does not pay off here. It pays off when the rules must be long
(a spam filter needs hundreds, not one), or when the rules **go stale**: when the book
adds 9 more countries, the line simply retrains on 36 rows, while the hand rule needs a
person to notice and rewrite it.

## Trade-offs

| Hand-written rules | A trained model |
|---|---|
| Cheap to write once | Expensive to set up |
| **Expensive to keep correct** | **Cheap to refresh** |
| Readable, arguable with the business | You have to trust a table of numbers |
| Changes only when someone edits them | Changes at every retrain |
| Right until the world moves | Keeps up with the world, whether you wanted it to or not |

**The deciding question is not "is this problem hard" but "how fast does the right
answer change".** Where the rules are short and stable, hand-written rules are still the
better engineering.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Starting a project without being able to name **P** | You optimise the wrong thing; a "good" model the business cannot use |
| Picking P because it is easy to compute, not because it reflects cost | The system is free to be bad exactly where P does not look |
| Treating "we have the data" as evidence ML is possible | Without T and P that is data, not E |
| Using ML for a one-line rule | One more system to feed, to trade 0.33 for 0.31 |
| Choosing ML because "the environment changes" without building monitoring | The system changes itself and nobody knows into what |
| Planning around "we'll just read what the model learned" | Easy for a spam filter, hard for many model types |

## FAQ

<details>
<summary>What is wrong with the spam filter's P — the share classified correctly?</summary>

It treats both kinds of error as equal. Letting a spam through annoys the user; blocking
a real email can lose a contract. The right measure separates the two — which is exactly
precision and recall in [Performance metrics](performance-metrics.md).

This is the concrete case of the general rule: **whatever P ignores, the system is free
to be bad at.**

</details>

<details>
<summary>Where is the line between "data mining" and "machine learning"?</summary>

The way the book uses them: data mining is the **purpose** (digging through large data
for patterns nobody knew about), machine learning is the **tool** that is very good at
it. Opening a trained spam filter and reading the list of words it treats as the best
predictors of spam — that is data mining, and it sometimes reveals correlations nobody
suspected.

With the book's caveat attached: easy for a spam filter, **tricky for many model types**.
Do not plan a project on the assumption you will be able to read the model.

</details>

<details>
<summary>I have data but no labels. Is that enough to start?</summary>

Not if the problem is supervised. Being able to name T and P while E does not exist yet
means **the project plan is really a labelling plan** — and that is usually the expensive
part. See [Supervised and unsupervised learning](supervised-unsupervised.md), the section
on the cost of the label column and two ways to buy it more cheaply.

</details>

<details>
<summary>What are the three axes for sorting ML systems?</summary>

The book sorts every ML system along three **independent** axes — a system always has all three:

| Axis | Question | Detail in |
|---|---|---|
| 1 | How much supervision | [Supervised and unsupervised](supervised-unsupervised.md) |
| 2 | Trains once or keeps training | [Batch and online](batch-vs-online.md) |
| 3 | Compares or generalises | [Instance-based and model-based](instance-vs-model-based.md) |

</details>

## Related Topics

- [Supervised and unsupervised learning](supervised-unsupervised.md) — axis 1, and the cost of the label column
- [Batch and online learning](batch-vs-online.md) — axis 2
- [Instance-based and model-based](instance-vs-model-based.md) — axis 3, with Cyprus worked by hand
- [Bad data: the first four challenges](bad-data.md) — E goes wrong in four ways
- [Performance metrics](performance-metrics.md) — the **P**, and why getting it wrong ruins everything
- [Data Quality](../../../data-quality/index.md) — no P survives a dirty E

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 1, lessons b01 and b02
- Tom Mitchell — *Machine Learning* (1997), the T/E/P definition
- Arthur Samuel (1959), the informal definition
