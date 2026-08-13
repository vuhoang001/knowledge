---
title: Reference — Design Patterns
sidebar_key: patterns-reference
sidebar_position: 0
description: "The foundations to get down before the 23 patterns — what a pattern is, SOLID, composition, coupling, and how to look one up from a symptom."
tags: [reference, design-pattern]
domain: backend
category: index
doc_type: index
updated: 2026-08-04
---

# Reference — Design Patterns

Explains *what it is, why, and what the trade-offs are*. Read this group first — all 23 patterns
under [Skills](../skills/index.md) assume the first four files here are understood.

| # | Document | Answers the question | Level | Status |
|---|---|---|---|---|
| 1 | [What a design pattern is](what-is-a-pattern.md) | What a pattern is, the three groups, and **when not to use one** | beginner | 📝 theory |
| 2 | [SOLID](solid.md) | Five principles, each with a violation that produces a real bug | intermediate | 📝 theory |
| 3 | [Composition over inheritance](composition-over-inheritance.md) | Why inheritance multiplies classes while composition adds them | intermediate | 📝 theory |
| 4 | [Coupling and cohesion](coupling-cohesion.md) | Measuring fan-out with reflection — the metric patterns serve | intermediate | 📝 theory |
| 5 | [Which pattern to choose](choosing-a-pattern.md) | Looking up a pattern name from a symptom in the code | intermediate | 📝 theory |

**The shortest path:** read 1 → 5. Those two are enough to start looking things up; 2, 3 and 4 are the
part that explains *why* the patterns look the way they do.

## Related Topics

- [Design Patterns](../index.md) — the topic this directory belongs to
- [Skills](../skills/index.md) — the 23 GoF patterns
- [Case study](../case-studies/index.md) — a failure illustrating each file above
