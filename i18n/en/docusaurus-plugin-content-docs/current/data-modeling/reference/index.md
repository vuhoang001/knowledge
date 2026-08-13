---
title: Reference — Data Modeling
sidebar_key: data-modeling-reference
sidebar_position: 0
description: "Explains what it is, why, and what the trade-offs are. Read this group first."
tags: [reference, data-modeling]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Reference — Data Modeling

Explains *what it is, why, and what the trade-offs are*. Read this group first.

| # | Document | The question it answers | Status |
|---|---|---|---|
| 1 | [Grain](grain.md) | What one row of this table represents — the question to answer first | ✅ run by hand |
| 2 | [Facts and dimensions](fact-and-dimension.md) | The two table kinds in a dimensional model — what's measurable goes in a fact, what' | 📝 theory |
| 3 | [Surrogate keys and natural keys](surrogate-key.md) | Why you don't use a business code directly as a dimension's key — and wh | 🟡 draft |
| 4 | [The 4-step design process](design-process.md) | From a vague business requirement to a working table — in what order | 📝 theory |
| 5 | [Star, snowflake and One Big Table](star-snowflake-obt.md) | Three ways of arranging facts around dimensions — and why the lakehouse revers | 🟡 draft |
| 6 | [The date dimension](date-dimension.md) | Why the calendar has to be a table — fiscal quarters and working days are dat | 📝 theory |
| 7 | [Bus architecture, the bus matrix and the value chain](bus-architecture.md) | Building one process at a time and still being able to join it all up | 📝 theory |

## Related Topics

- [Data Modeling](../index.md) — the topic this directory belongs to
