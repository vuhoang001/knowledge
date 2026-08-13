---
title: Skills — Data Modeling
sidebar_key: data-modeling-skills
sidebar_position: 0
description: "Techniques applied to a specific situation — standing on top of the Reference section, not replacing it."
tags: [skill, data-modeling]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Skills — Data Modeling

Techniques applied to a specific situation — standing **on top of** the Reference section, not replacing it.

| # | Document | The question it answers | Status |
|---|---|---|---|
| 1 | [SCD — Slowly Changing Dimension](scd.md) | When an entity's attribute changes, what value should a historical report use | 📝 theory |
| 2 | [Change detection for SCD 2](scd-change-detection.md) | Knowing which row changed: comparing columns, hashing, `updated_at`, CDC | 🟡 draft |
| 3 | [Junk dimensions and low-cardinality columns](junk-dimension.md) | A status column with a few values: leave it, split it out, or combine | 🟡 draft |
| 4 | [Mini-dimensions](mini-dimension.md) | A large dim with a few fast-changing columns — splitting it so Type 2 doesn't bloat | 🟡 draft |
| 5 | [Role-playing dimensions](role-playing-dimension.md) | One dim playing several roles in the same fact | 🟡 draft |
| 6 | [Conformed dimensions](conformed-dimension.md) | The conditions for being able to add numbers from two different facts | 🟡 draft |
| 7 | [Bridge tables](bridge-table.md) | Many-to-many relationships — allocation factors so the total doesn't inflate | 🟡 draft |
| 8 | [Degenerate dimensions](degenerate-dimension.md) | An order number with no attributes at all — leave it in the fact, don't build a table | 📝 theory |
| 9 | [Hierarchies](hierarchy.md) | An unevenly deep tree: fixed flattening, pulling up the parent level, or a path bridge | 📝 theory |
| 10 | [Late-arriving data](late-arriving.md) | A fact arriving after the dimension changed, and a dimension arriving after the fact | 📝 theory |
| 11 | [Aggregate fact tables](aggregate-fact-table.md) | Summary tables: store only summable numbers, with shrunken dims generated from the originals | 📝 theory |
| 12 | [Multiple currencies and units of measure](multi-currency-uom.md) | Freeze both the original and the converted number into the fact; don't convert at read time | 📝 theory |
| 13 | [Audit dimensions](audit-dimension.md) | Each fact row pointing back at the run that produced it — deleting exactly what must be deleted | 📝 theory |
| 14 | [NULLs in facts and dimensions](null-handling.md) | Three-valued logic makes a filter silently swallow rows | 📝 theory |
| 15 | [Conformed facts](conformed-facts.md) | They join, but are those two numbers comparable with each other | 📝 theory |
| 16 | [Designing dimension attributes](dimension-attribute-design.md) | Textual flags, several hierarchies, drill down, free-text notes | 📝 theory |
| 17 | [Header/line and fact allocation](allocated-facts.md) | Order-level measures down to line level, and P&L by product | 📝 theory |
| 18 | [Centipede fact tables](centipede-fact.md) | A fact with twenty foreign keys for a handful of real dimensions | 📝 theory |
| 19 | [Year-to-date and timespan](ytd-timespan-facts.md) | Don't store a running total; do store a validity interval | 📝 theory |
| 20 | [Putting behaviour into a dimension](behavior-dimension.md) | Aggregate numbers as attributes, dynamic banding, study groups, steps | 📝 theory |
| 21 | [Heterogeneous entities](heterogeneous-schema.md) | Supertype/subtype, measure type — when the kinds share no attributes | 📝 theory |
| 22 | [Real-time fact tables](real-time-fact.md) | Today isn't complete yet but still counts as a day | 📝 theory |

**Reading order:** SCD (1) first, then change detection (2) — these two are a pair: the first says
*how to keep history*, the second says *how you know there's anything to keep*. Late-arriving data
(10) is the third side of that pair: *what happens when the data doesn't arrive on time*. The rest
can be read in any order. Mini-dimensions are really SCD Type 4 looked at more closely.

**Grouped by problem**, if you'd rather read by need than by number:

| What you're facing | Read |
|---|---|
| An attribute changing over time | 1, 2, 4, 10, 19 |
| Which column/table should be split or combined | 3, 5, 8, 16, 18, 21 |
| Many-to-many relationships, hierarchies | 7, 9 |
| Combining numbers from several sources or units | 6, 11, 12, 15 |
| The numbers add up wrongly with nobody reporting an error | 14, 17, 19, 20 |
| The numbers are wrong and you don't know where from | 13 |
| Data that's incomplete, hasn't arrived, or arrived late | 10, 22 |

## Related Topics

- [Data Modeling](../index.md) — the topic this directory belongs to
