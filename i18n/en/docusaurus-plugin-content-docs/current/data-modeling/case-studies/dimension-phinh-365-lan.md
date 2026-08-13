---
title: A dimension 365× bloated after a year
sidebar_position: 3
description: Turning SCD Type 2 on for a column that changes daily — 100 thousand customers become 36.5 million rows, and queries slow steadily.
tags: [case-study, scd, mini-dimension, fact, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# A dimension 365× bloated after a year

> **A reconstructed situation**, not an incident encountered here. The arithmetic below was really run.

> **Takeaway:** [SCD](../skills/scd.md) Type 2 bloats at **the rate of the fastest-changing column**
> in the table. Turning Type 2 on for a column that changes daily turns the dimension into a fact.

## Context

`dim_khach_hang`, 100 thousand customers. The business requirement: *"the report must reflect the customer's
tier at the moment of purchase"*. Entirely legitimate — that's as-was, exactly Type 2's job.

Type 2 gets turned on for the whole table. The table contains:

| Column | Change rate |
|---|---|
| `ho_ten`, `ngay_sinh` | almost never changes |
| `khu_vuc` | once every few years |
| `hang_khach` | **daily** — recomputed from the last 30 days' spend |

## Symptoms

Three months later: queries slow gradually, not suddenly. Six months: the report overruns its window. The arithmetic
shows why:

```sql
WITH tham_so AS (SELECT 100000 AS so_khach, 365 AS so_ngay)
SELECT so_khach                 AS dong_neu_type1,
       so_khach * so_ngay       AS dong_neu_type2_doi_hang_ngay,
       so_khach * 2             AS dong_neu_type2_doi_2_lan_nam
FROM tham_so;
```

```text
┌────────────────┬──────────────────────────────┬──────────────────────────────┐
│ dong_neu_type1 │ dong_neu_type2_doi_hang_ngay │ dong_neu_type2_doi_2_lan_nam │
├────────────────┼──────────────────────────────┼──────────────────────────────┤
│         100000 │                     36500000 │                       200000 │
└────────────────┴──────────────────────────────┴──────────────────────────────┘
```

**36.5 million rows** instead of 100 thousand. Whereas with only `khu_vuc` as Type 2 it would be just
**200 thousand**.

A difference of **182×** — and it comes from exactly one column placed wrongly.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| A missing index / partition | Added, slightly faster, still slowing |
| The warehouse needs upgrading | Upgraded, buying a few months |
| Badly written queries | A little to optimise, but that isn't the problem |
| Natural data growth | **Wrong** — the customer count isn't growing, only the dimension's row count |

The classic misdiagnosis: treating this as an **infrastructure problem**. Upgrading buys time
but the row count still grows linearly with the days, so it only postpones rather than solves.

The clarifying question: *"is the customer count growing?"* No. So this isn't about data
growth — it's about **the model generating rows**.

## The real cause

`hang_khach` is **not a dimension attribute**. It's **a continuously recomputed measure** —
that is, a fact.

The test in [Facts and dimensions](../reference/fact-and-dimension.md): *will you `SUM` this column
or `GROUP BY` it?* `hang_khach` gets a `GROUP BY` — sounding like a dimension. But there's a second, more
important test:

> **How fast does this column change?** Faster than the rate at which people ask about it, and it doesn't
> belong in a dimension.

Nobody asks *"what tier was the customer at 9am on 14 March"*. But Type 2 records **every**
change, including the ones nobody needs.

## Why no test catches it

| Test | The result |
|---|---|
| `unique` on `khach_sk` | ✅ green |
| `unique_combination_of_columns [khach_id, valid_from]` | ✅ green |
| `valid_from < valid_to` | ✅ green |
| No overlapping intervals | ✅ green |

**The dimension is entirely correct.** It's doing exactly what it was asked to: recording every change.
No invariant is broken.

This is the class of bug no test catches because it **isn't a data bug** — it's a design
decision bug, and the consequence appears gradually over time rather than immediately.

## The fix

Three options, according to the column's real nature:

| What the column really is | The handling |
|---|---|
| A continuously changing measure | Move it to a **fact** — each fact row records the value at the time |
| A few fast-changing columns among otherwise stable ones | A [mini-dimension](../skills/mini-dimension.md) |
| Only the current value is needed | Type 1 for that column, Type 2 for the rest |

For `hang_khach`, the tidiest is a **mini-dimension**:

```text
dim_khach_hang        100.000 dòng, Type 2 chỉ cho khu_vuc  → 200.000 sau 1 năm
dim_khach_hang_hang        ~5 dòng, bất biến — mọi hạng có thể có
fct_don_hang               khach_sk + khach_hang_sk
```

The tier history moves from the dimension into the **fact**: each order records what tier the customer
was. It still answers as-was, without the dimension bloating.

**36.5 million → 200 thousand rows**, with the same analytical capability.

## How to spot it early

1. There's a column in the dimension that's **recomputed on a schedule** (a score, a tier, a segment, a forecast).
2. The dimension's row count grows **steadily by the day**, not by the number of entities.
3. The ratio of `dimension rows / distinct entities` exceeds ~10 and is still rising.

A quick check:

```sql
SELECT count(*) AS so_dong,
       count(DISTINCT khach_id) AS so_khach,
       round(1.0 * count(*) / count(DISTINCT khach_id), 1) AS dong_moi_khach
FROM dim_khach_hang;
```

`dong_moi_khach` rising month on month is a certain sign. Make this query a
`severity: warn` test with a threshold, see [Implementing tests](../../etl/dbt/skills/implementing-tests.md).

## Related Topics

- [SCD](../skills/scd.md) — Type 2 and the which-Type table
- [Mini-dimensions](../skills/mini-dimension.md) — the concrete fix, with a runnable example
- [Facts and dimensions](../reference/fact-and-dimension.md) — the test for which table a column belongs to
- [Grain](../reference/grain.md) — a Type 2 dim's grain is *one version*, not *one customer*
