---
title: Design Patterns
description: "The 23 Gang of Four patterns in C#, each with a runnable failure case and a when-not-to-use-it section."
tags: [design-pattern, gof, oop, backend]
domain: backend
category: pattern
doc_type: index
status: draft
difficulty: intermediate
updated: 2026-08-04
---

# Design Patterns

**This is a group of *concepts*, not a technology.** The Gang of Four wrote these in 1994 in C++
and Smalltalk, and they still describe C# code accurately in 2026 — while the language has been
through thirteen versions.

That makes this a **slowly depreciating** area, like [Data Modeling](../data-modeling/index.md).
Learning a framework is learning which commands to type; knowing why Decorator exists means you'll
recognise it in whatever language you move to.

> This place answers the question **"how do I arrange the classes"**, not "what do I run it with". Every
> example is written in C# because it needs a concrete language to be runnable, not because the patterns
> belong to C#.

**A warning right at the top of the page:** most of the damage done by design patterns comes not from
not knowing them, but from applying the right recipe in the wrong place. Every page in this knowledge
base has a *When NOT to use it* section, and
[failure case 19](case-studies/abstract-factory-cho-mot-hien-thuc.md) is devoted entirely to that mistake.

## Contents

The five standard groups — **every topic in this knowledge base uses exactly this set**.

### [Reference](reference/index.md) — what it is, why, what the trade-offs are

| # | Document | Answers the question | Level | Status |
|---|---|---|---|---|
| 1 | [What a design pattern is](reference/what-is-a-pattern.md) | What a pattern is, the three groups, and **when not to use one** | beginner | 📝 theory |
| 2 | [SOLID](reference/solid.md) | Five principles, each with a violation that produces a real bug | intermediate | 📝 theory |
| 3 | [Composition over inheritance](reference/composition-over-inheritance.md) | Inheritance multiplies classes, composition adds them — 72 versus 11 | intermediate | 📝 theory |
| 4 | [Coupling and cohesion](reference/coupling-cohesion.md) | Measuring fan-out with reflection; the metric patterns serve | intermediate | 📝 theory |
| 5 | [Which pattern to choose](reference/choosing-a-pattern.md) | Looking up a pattern name from a symptom in the code | intermediate | 📝 theory |

### [Skills](skills/index.md) — the 23 GoF patterns

| Group | Answers the question | Patterns |
|---|---|---|
| **Creational** (1–5) | Where objects **come from** | [Singleton](skills/singleton.md) · [Factory Method](skills/factory-method.md) · [Abstract Factory](skills/abstract-factory.md) · [Builder](skills/builder.md) · [Prototype](skills/prototype.md) |
| **Structural** (6–12) | How they **fit into** each other | [Adapter](skills/adapter.md) · [Bridge](skills/bridge.md) · [Composite](skills/composite.md) · [Decorator](skills/decorator.md) · [Facade](skills/facade.md) · [Flyweight](skills/flyweight.md) · [Proxy](skills/proxy.md) |
| **Behavioral** (13–23) | **Who calls whom** | [Chain of Responsibility](skills/chain-of-responsibility.md) · [Command](skills/command.md) · [Interpreter](skills/interpreter.md) · [Iterator](skills/iterator.md) · [Mediator](skills/mediator.md) · [Memento](skills/memento.md) · [Observer](skills/observer.md) · [State](skills/state.md) · [Strategy](skills/strategy.md) · [Template Method](skills/template-method.md) · [Visitor](skills/visitor.md) |

### The other three groups

| Group | Contents |
|---|---|
| [Exercises](tutorials/index.md) | [Escalating from a `switch` to Strategy + Decorator](tutorials/refactor-switch-sang-pattern.md) — four steps, and knowing which one to stop at |
| [Cheatsheet](cheatsheets/index.md) | [The 23 GoF patterns — quick lookup](cheatsheets/gof-23.md) |
| [Case study](case-studies/index.md) | **19 cases** — every pattern has at least one failure with numbers |

Symbols: ✅ run by hand and confirmed · 📝 theory, `verified_at` still empty

## Why "Reference" and "Skills" are separate

Knowing what Strategy is (the concept) does **not** mean knowing when to use it (the practice).
Most material online only teaches the first half — copy the UML diagram with one example, and done.
The second half is where the money goes:

- Use Strategy for a flow that **has transition rules** → the rules end up scattered across every
  caller, and [an unpaid order can still be shipped](case-studies/chuyen-trang-thai-trai-phep.md).
- Build an Abstract Factory for **one** implementation → four redundant types, and three years later
  still one implementation.

Neither mistake is **a technical mistake**. The code is correct, the tests are green, every quality
metric looks good. The error was in the decision made before the first line was written.

## Learning Path

```text i18n-prose
C# basics (interfaces, inheritance, delegates)
      ↓
What a design pattern is    ← start here
      ↓
SOLID
      ↓
Composition over inheritance · Coupling and cohesion
      ↓
Strategy · Factory Method · Adapter · Decorator     ← the four you meet most
      ↓
Lab: escalating from a switch to Strategy + Decorator   ← you actually run things here
      ↓
Which pattern to choose (looking one up from a symptom)
      ↓
The other 19 patterns, read as needed
      ↓
Case studies: read them before applying a pattern, not after
```

**The shortest path to something usable:** *What a design pattern is* → *Which pattern to choose* → the Lab.
Those first two pages are enough to start looking things up; the other 23 pages are reference material,
not a course to read front to back.

## Coverage against the GoF list

| GoF group | Pattern count | Covered | Has its own case study |
|---|---|---|---|
| Creational | 5 | 5 | 5 |
| Structural | 7 | 7 | 7 |
| Behavioral | 11 | 11 | 11 |

All **23 patterns** have their own page, and every page has at least one case study pointing at it.
The foundations (SOLID, coupling, composition) are covered too.

Covering the whole list is **not** a goal in itself. The value is that each pattern comes with a
really-run failure case with numbers in it — you forget a trade-off table, but you remember a number.

## Three to read so you know to **avoid** them

| Pattern | Why |
|---|---|
| [Singleton](skills/singleton.md) | Nearly always better replaced by a DI container's singleton lifetime |
| [Interpreter](skills/interpreter.md) | Rarely the right fit; `Expression<T>` is usually the answer |
| [Visitor](skills/visitor.md) | Expensive while the set of types is still changing; a `switch` expression covers most cases |

## The environment the examples run in

Every example in this knowledge base runs as a .NET **file-based app**, with no project to create:

```bash
dotnet run vi-du.cs
```

It needs .NET 10 or later. The version used to produce the output in this knowledge base:

```text
11.0.100-preview.1.26104.118
```

The first run takes ~40 seconds (restoring packages), and subsequent runs under 1 second. Put the lab
file **outside this repo**, for example `~/Documents/learn-lab/patterns`.

## Related Topics

- [Data Modeling](../data-modeling/index.md) — the same kind of slowly depreciating knowledge
- [Glossary](../glossary/index.md)
