---
title: Axis 2 — Batch and online learning
sidebar_position: 3
description: "Full refresh or incremental load, applied to a model. Batch drifts between retrains; online stays fresh but bad data lands straight inside the running system."
tags: [batch-learning, online-learning, model-rot, learning-rate, out-of-core, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Axis 2 — Batch and online learning

> **Takeaway:** This is **full refresh versus incremental load**, applied to a model
> instead of a table. Batch is right on the day it ships and **drifts** until the next
> retrain. Online is always fresh, but bad data is **already inside the parameters of the
> system serving traffic**.

## Goal

Choose a training cadence from a measurable question — *does my world move faster or
slower than I can afford to rebuild* — instead of from the feeling that "online sounds
more modern".

## Overview

### The comparison

| | Batch learning | Online learning |
|---|---|---|
| Like a | **full refresh** — rebuild from all the data | **incremental load** — apply new data as it arrives |
| Trains on | all available data at once, **offline** | instances one at a time, or small **mini-batches** |
| After launch | runs, **learns nothing further** | keeps learning in place |
| New data means | retrain a version **from scratch** | one more fast, cheap learning step |
| Main risk | slow, costly retraining; **model rot** | bad data **degrades the live system** |

### Batch learning: train once, then freeze

Batch learning **cannot learn incrementally**. It must be trained on all available data
at once, offline, then shipped and run without learning further — *offline learning*.

To teach it about new data you retrain a version **from scratch** on everything, old plus
new, and swap it in. This is **usually automatable**, so batch is not automatically
wrong. But it carries two real costs:

1. **Time and compute.** Training on a full dataset can take hours.
2. **Decay.** A batch model's performance **degrades over time**, simply because the
   world changes and the model does not. The book calls this **model rot**, or *data drift*.

It is exactly a **snapshot table**: right on the day it was built, then quietly going
stale. The mitigation is retraining daily or weekly.

Batch also **fails outright** when the dataset is larger than memory, or when the system
must run autonomously on limited resources — a phone app, or a rover on Mars.

> **Batch is not wrong, it just moves the cost into the schedule.** The question is
> rarely *can it be done*, it is **cadence** — the same question you already answer when
> choosing a refresh interval for a derived table. **Model rot lives entirely in that gap.**

### Online learning: learn in small steps

Feed it instances one at a time, or in small **mini-batches**. Each step is fast and
cheap, so the system learns about new data **in place**.

In `scikit-learn` these are the estimators with `partial_fit`: `SGDClassifier`,
`SGDRegressor`, `MiniBatchKMeans`.

**Out-of-core learning** — the same mechanism, for datasets larger than RAM:

```text
tap du lieu lon hon bo nho
  -> nap mot phan   -> mot buoc train
  -> nap phan tiep  -> mot buoc train
  -> ... lap cho toi khi het du lieu
```

Exactly like processing a file bigger than RAM one chunk at a time. **Out-of-core usually
runs offline**, despite the name — which is why the book suggests reading "online" as
**incremental**, not "on the internet".

### The learning rate: a knob with no safe setting

| Learning rate | What you get | What it costs |
|---|---|---|
| **High** | adapts quickly | **forgets old data quickly** |
| **Low** | less sensitive to noise | learns more slowly |

**No value is good at both ends.** The right one depends on *how fast the real pattern
moves* compared with *how noisy the data is* — **two properties of your data, not of the
algorithm**.

The extreme case worth remembering: turn it too high and a spam filter ends up **flagging
only the newest kind of spam it was just shown.**

### The real risk of online is an operational one

With batch, a bad training set is caught **before release**, and you keep serving the
previous model. With online, the bad data is **already inside the parameters** of the
system serving traffic, and performance **slides rather than failing** — so no alert fires.

That is why the book's mitigation is **not a better algorithm** but an operational one:
**watch the input data closely and react to drops in performance.**

## Example

Run for real on 2026-09-29 at `~/learn-lab/ml` — scikit-learn 1.9.1, on the book's dataset.

The chapter 1 model is a **batch** model: training sees all 27 rows at once, then stops learning.

```text
duong tren 27 nuoc: 3.749 + 0.0000678 x GDP
duong tren 36 nuoc: 5.580 + 0.0000233 x GDP
```

The book adds 9 countries (South Africa, Colombia, Brazil, Mexico, Chile, Norway,
Switzerland, Ireland, Luxembourg). A batch system retrains **from scratch** on all 36
rows and gets a new line. **The slope is now about a third** of what it was: 0.0000233
versus 0.0000678.

Until that retraining run happens, the old model **keeps using the old line**:

```text
Luxembourg GDP 110,261 — diem that 6.9
   duong 27 nuoc doan: 11.22   <- vuot tran thang 0-10
   duong 36 nuoc doan: 8.15
```

**11.22 on a 0–10 scale.** That is model rot in its purest form: nothing broken, no error
raised, just a model answering with yesterday's world.

An **online** system would not wait for a full retraining run. Each time a new country
arrived it would take one small learning step, and **the learning rate would decide how
far that step moves the line.**

## Trade-offs

| Batch | Online |
|---|---|
| A **frozen version to compare against** | The model drifts continuously, no reference point |
| Bad data caught **before release** | Bad data **lands inside the running system** |
| Failures are **loud** or blocked in CI | Failures **slide**, no alert fires |
| Needs the whole dataset in memory | Needs only a mini-batch |
| Retraining costs hours and money | Each step is fast and cheap |
| Impossible when data exceeds RAM | Out-of-core solves exactly that |
| Goes stale between retrains | Always fresh |

**You trade a build problem for a monitoring problem.** That is the most compact summary
of this choice.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Choosing online because it sounds modern | One day of bad data destroys the model, **with no previous version to roll back to** |
| Choosing batch and never scheduling the retrain | Model rot: right on ship day, wronger every day after |
| Reading "online" as "on the internet" | Missing out-of-core — it runs offline |
| Setting the learning rate once from principle | There is no safe value; it depends on the data, so measure |
| Deploying online without monitoring inputs | The only mitigation is skipped exactly where it is needed most |
| Comparing two models trained at different times | With online, "the model" is not a fixed object |

## FAQ

<details>
<summary>The model must run on a device that gets new data every second and cannot phone home. Batch or online?</summary>

**Online.** Batch needs a central retraining run and then a push of the new model — which
this device cannot receive. This is also one of the two cases the book names where batch
**fails outright** (the other being a dataset larger than memory).

With a condition attached: you need some way to detect where the model has drifted,
because nobody is watching it.

</details>

<details>
<summary>How is a learning rate actually chosen rather than guessed?</summary>

With a **learning-rate schedule** — a rule that changes the rate during training instead
of holding one constant. `scikit-learn` ships them in stochastic gradient descent, and
`partial_fit` is the call that makes online learning possible.

The starting value still has to be found by measuring.

</details>

<details>
<summary>Is out-of-core learning the same as online learning?</summary>

It uses the **same mechanism** — load a part, take a step — but for a **different purpose,
and usually offline**. Online learning solves *data arriving continuously*; out-of-core
solves *data larger than memory*. One algorithm, two reasons.

</details>

<details>
<summary>How is model rot different from data drift?</summary>

The book uses both words for the same phenomenon: the model standing still while the
world moves on. In practice people often split them: *data drift* is the **input
distribution** changing, *concept drift* is the **relationship between input and label**
changing. Both show up as model rot.

</details>

## Related Topics

- [What Machine Learning is](ml-landscape.md) — axis 2 of three
- [Supervised and unsupervised learning](supervised-unsupervised.md) — axis 1
- [Instance-based and model-based](instance-vs-model-based.md) — axis 3
- [Bad data](bad-data.md) — unrepresentative data is what produced the 11.22 above
- [Testing and validating](testing-and-validating.md) — measuring model rot needs a held-out set

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chapter 1, lesson b06
