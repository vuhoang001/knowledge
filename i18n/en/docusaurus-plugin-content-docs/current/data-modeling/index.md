---
title: Data Modeling
description: Designing tables — grain, fact/dimension, SCD, and the process from a business requirement to a working table.
tags: [data-modeling, kimball]
domain: data-engineering
category: concept
doc_type: index
status: stable
difficulty: intermediate
updated: 2026-07-31
---

# Data Modeling

**This is a *conceptual* group, not a technology.** There are no commands to run and no
versions to upgrade. Kimball wrote these things in 1996 and they still hold exactly
on Iceberg + Trino in 2026 — while the tooling has gone through three generations.

That makes this the **slowest-depreciating** part of the whole knowledge base. Learning dbt without knowing grain is
learning to type commands; know grain and you can do the job with any tool.

> This is where the question **"how do I design the table"** gets answered, not "what do I run it on". The what-to-run-it-on
> part is in [dbt](../etl/dbt/index.md), [Iceberg](../storage/iceberg/index.md),
> [Trino](../query-engines/trino/index.md).

## Contents

The five standard groups — **every topic in the repo uses exactly this set**.

### [Reference](reference/index.md) — what it is, why, and what the trade-offs are

| # | Document | The question it answers | Level | Status |
|---|---|---|---|---|
| 1 | [Grain](reference/grain.md) | **What** one row of this table represents | beginner | ✅ really encountered |
| 2 | [Facts and dimensions](reference/fact-and-dimension.md) | The two table kinds; the three fact kinds and additivity | beginner | 📝 review |
| 3 | [Surrogate keys and natural keys](reference/surrogate-key.md) | Why you don't use a business code directly | intermediate | 📝 draft |
| 4 | [The 4-step design process](reference/design-process.md) | From a business requirement to a table — in what order | intermediate | 📝 review |
| 5 | [Star, snowflake, OBT](reference/star-snowflake-obt.md) | Three layouts; measuring OBT's real cost, and where Data Vault stands | intermediate | 📝 review |
| 6 | [The date dimension](reference/date-dimension.md) | Why the calendar has to be a table — fiscal quarters, holidays, timezones | beginner | 📝 draft |
| 7 | [Bus architecture and the bus matrix](reference/bus-architecture.md) | Building one process at a time and still being able to join it all up | intermediate | 📝 draft |

### [Skills](skills/index.md) — techniques applied on top of the above

| # | Document | The question it answers | Level | Status |
|---|---|---|---|---|
| 1 | [**SCD**](skills/scd.md) | How history is handled when a value changes (Type 0–7) | intermediate | 📝 review |
| 2 | [Change detection for SCD 2](skills/scd-change-detection.md) | Knowing which row changed: comparing columns, hashing, `updated_at`, CDC | advanced | 📝 draft |
| 3 | [Junk dimensions](skills/junk-dimension.md) | A status column with a few values: leave it, split it out, or combine | intermediate | 📝 draft |
| 4 | [Mini-dimensions](skills/mini-dimension.md) | A large dim with a few fast-changing columns — splitting it so Type 2 doesn't bloat | advanced | 📝 draft |
| 5 | [Role-playing dimensions](skills/role-playing-dimension.md) | One dim playing several roles in the same fact | intermediate | 📝 draft |
| 6 | [Conformed dimensions](skills/conformed-dimension.md) | The conditions for adding numbers from two different facts | advanced | 📝 draft |
| 7 | [Bridge tables](skills/bridge-table.md) | Many-to-many relationships — totals that don't double | advanced | 📝 draft |
| 8 | [Degenerate dimensions](skills/degenerate-dimension.md) | The order number: staying in the fact or getting its own table | intermediate | 📝 draft |
| 9 | [Hierarchies](skills/hierarchy.md) | An unevenly deep tree — flattened, parent-level pulled up, or a path bridge | advanced | 📝 draft |
| 10 | [Late-arriving data](skills/late-arriving.md) | A fact arriving after the dimension changed, and vice versa | advanced | 📝 draft |
| 11 | [Aggregate fact tables](skills/aggregate-fact-table.md) | Summary tables: what's stored, and why they drift | intermediate | 📝 draft |
| 12 | [Multiple currencies and units of measure](skills/multi-currency-uom.md) | A measure with a unit makes the number column alone meaningless | intermediate | 📝 draft |
| 13 | [Audit dimensions](skills/audit-dimension.md) | Tracing which row was produced by which run | intermediate | 📝 draft |
| 14 | [NULLs in facts and dimensions](skills/null-handling.md) | Three-valued logic makes a filter silently swallow rows | intermediate | 📝 draft |
| 15 | [Conformed facts](skills/conformed-facts.md) | Once they join, are those two numbers comparable | intermediate | 📝 draft |
| 16 | [Designing dimension attributes](skills/dimension-attribute-design.md) | Textual flags, several hierarchies, drill down, notes | beginner | 📝 draft |
| 17 | [Header/line and fact allocation](skills/allocated-facts.md) | Order-level measures down to line level, and P&L by product | advanced | 📝 draft |
| 18 | [Centipede fact tables](skills/centipede-fact.md) | A fact with twenty foreign keys for a handful of real dimensions | intermediate | 📝 draft |
| 19 | [Year-to-date and timespan](skills/ytd-timespan-facts.md) | Don't store a running total; do store a validity interval | intermediate | 📝 draft |
| 20 | [Putting behaviour into a dimension](skills/behavior-dimension.md) | Aggregate numbers, dynamic banding, study groups, steps | advanced | 📝 draft |
| 21 | [Heterogeneous entities](skills/heterogeneous-schema.md) | Supertype/subtype when the kinds share no attributes | advanced | 📝 draft |
| 22 | [Real-time fact tables](skills/real-time-fact.md) | Today isn't complete yet but still counts as a day | advanced | 📝 draft |

### The other three groups

| Group | Contents |
|---|---|
| [Exercises](tutorials/index.md) | **7 labs really run** — a star schema, SCD, the foundations, dimensions, advanced facts, integration, operations |
| [Cheatsheets](cheatsheets/index.md) | [SCD — a quick lookup](cheatsheets/scd.md) |
| [Case studies](case-studies/index.md) | **24 cases** — every technique above has at least one concrete way it broke |

Symbols: ✅ run by hand and confirmed · 📝 theory, with `verified_at` still empty

The `#` column is the learning order **within each group**, and also the `sidebar_position`. Those two
must match — a mismatch means the sidebar leads readers down the wrong path.

**Reference or Skill?** Reference answers *"what it is"*; Skills answer *"faced with situation
X, what do you do"*. SCD and junk dimensions both assume you already know grain and
fact/dimension — so they're skills, not foundations.

## Why "Reference" and "Skills" are separated

Knowing what SCD Type 2 is (the concept) does **not** mean knowing when to use it
(the practice). Most documentation only teaches the first half — listing Type 1/2/3 with a table
example, and stopping. The second half is where the money goes:

- Choosing Type 2 for a column that changes daily → the dimension bloats a hundredfold and queries slow down.
- Choosing Type 1 for a column used to split reports → **historical reports change their own numbers**, and nobody
  knows why this week's June differs from last week's June.

Neither mistake is a **technical** one. The SQL is right, the tests are green, the pipeline is green. The error is at
the decision step, before the first line of SQL was written.

## Learning Path

```text
SQL (join, group by)
      ↓
Grain                    ← bắt đầu ở đây
      ↓
Fact và Dimension
      ↓
Surrogate key · Date dimension · Degenerate dimension
      ↓
SCD                      ← trọng tâm
      ↓
Quy trình thiết kế 4 bước
      ↓
Lab: dựng star schema bằng DuckDB   ← chạy thật ở đây
      ↓
Star / Snowflake / OBT
      ↓
Kỹ thuật theo tình huống: cây phân cấp, dữ liệu về muộn,
bảng tổng hợp, nhiều tiền tệ, audit dimension
      ↓
Triển khai bằng dbt snapshot
```

**The shortest route to being useful: Grain → Fact/Dimension → SCD → the process → the lab.**

## A map against Kimball's technique list

This repo follows [the Kimball Group's dimensional modeling technique list](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/).
The table below shows how far the coverage goes — so you can see what's missing without reopening the
original page to compare.

| Kimball technique group | Techniques | Covered | Missing |
|---|---|---|---|
| Fundamental concepts | 9 | 9 | — |
| Basic fact tables | 10 | 10 | — |
| Basic dimensions | 14 | 14 | — |
| Integration via conformed dimensions | 7 | 7 | — |
| SCD | 8 | 8 | — |
| Hierarchies | 3 | 3 | — |
| Advanced fact tables | 13 | 13 | — |
| Advanced dimensions | 14 | 12 | dimension-to-dimension joins and behavior tag time series are only covered as a section, with no case study of their own |
| Special-purpose schemas | 3 | 3 | — |

All **81 techniques** in Kimball's list have a place in the repo. The two techniques in the second-to-last row
are written as a section inside another file rather than their own file — they're rare enough
that building a dedicated case study would mean inventing a situation, and rule [R15](https://github.com/vuhoang001/knowledge/blob/main/ROUTING.md)
exists to prevent exactly that.

Covering the whole list is **not** an end in itself. The value is that each technique comes
with a concrete failure carrying real numbers — you forget a trade-off table, but you remember a figure.

## Related Topics

- [Data Quality](../data-quality/index.md) — verifying a model after you've built it
- [dbt](../etl/dbt/index.md) — the tool that realises it
- [SQL](../databases/sql/index.md) — the foundation of everything here
- [The SCD cheatsheet](cheatsheets/scd.md)
- [Glossary](../glossary/index.md)
