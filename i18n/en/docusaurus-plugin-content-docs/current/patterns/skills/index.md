---
title: Skills — the 23 GoF patterns
sidebar_key: patterns-skills
sidebar_position: 0
description: "The twenty-three Gang of Four patterns, each with a runnable C# failure case and a when-not-to-use-it section."
tags: [skill, design-pattern, gof]
domain: backend
category: index
doc_type: index
updated: 2026-08-04
---

# Skills — the 23 GoF patterns

Each page answers *"how do I handle situation X"*, and assumes the
[Reference](../reference/index.md) group is understood. Every example runs with
`dotnet run <file>.cs` on .NET 11.0.0.

**Every page has a *When NOT to use it* section.** That's the section to read first — most of the
damage done by design patterns comes from applying the right recipe in the wrong place.

## Creational — how objects **get created**

| # | Pattern | Which problem it solves | Level | Status |
|---|---|---|---|---|
| 1 | [Singleton](singleton.md) | Exactly one instance — and why you should nearly always use DI instead | beginner | 📝 theory |
| 2 | [Factory Method](factory-method.md) | A `switch` to `new` spreading across many places and then drifting apart | beginner | 📝 theory |
| 3 | [Abstract Factory](abstract-factory.md) | One product family that has to match; mixing families raises no error | intermediate | 📝 theory |
| 4 | [Builder](builder.md) | A constructor with many same-typed parameters, where a swap still compiles | beginner | 📝 theory |
| 5 | [Prototype](prototype.md) | Cloning an object — and the shallow-copy trap, `record with` included | intermediate | 📝 theory |

## Structural — how they **fit together**

| # | Pattern | Which problem it solves | Level | Status |
|---|---|---|---|---|
| 6 | [Adapter](adapter.md) | A third-party API that doesn't fit — and the trap of an adapter swallowing errors | beginner | 📝 theory |
| 7 | [Bridge](bridge.md) | Two axes of variation: `n × m` classes become `n + m` | advanced | 📝 theory |
| 8 | [Composite](composite.md) | Treating one thing and a group of things alike; and cycles in the tree | intermediate | 📝 theory |
| 9 | [Decorator](decorator.md) | Adding behaviour without touching the original class — wrapping order changes the semantics | intermediate | 📝 theory |
| 10 | [Facade](facade.md) | One entrance to a multi-step subsystem; and the trap of bloating into a god object | beginner | 📝 theory |
| 11 | [Flyweight](flyweight.md) | Hundreds of thousands of near-identical objects eating all the RAM | advanced | 📝 theory |
| 12 | [Proxy](proxy.md) | Stepping in before the real object is touched; lazy proxies and N+1 | intermediate | 📝 theory |

## Behavioral — how they **talk** to each other

| # | Pattern | Which problem it solves | Level | Status |
|---|---|---|---|---|
| 13 | [Chain of Responsibility](chain-of-responsibility.md) | A chain of handlers; and a request falling silently through the whole chain | intermediate | 📝 theory |
| 14 | [Command](command.md) | Making a request into an object so it can be undone, queued, replayed | intermediate | 📝 theory |
| 15 | [Interpreter](interpreter.md) | A small configurable language; one tree, many outputs | advanced | 📝 theory |
| 16 | [Iterator](iterator.md) | Traversing without exposing the structure; mutating while iterating, and lazy recomputation | beginner | 📝 theory |
| 17 | [Mediator](mediator.md) | `n(n-1)/2` links become `n` — and the mediator bloating | intermediate | 📝 theory |
| 18 | [Memento](memento.md) | Snapshotting state for undo, without breaking encapsulation | intermediate | 📝 theory |
| 19 | [Observer](observer.md) | One place changes, many places learn of it; a memory leak when you forget to unsubscribe | intermediate | 📝 theory |
| 20 | [State](state.md) | Transition rules get a place where they can be enforced | intermediate | 📝 theory |
| 21 | [Strategy](strategy.md) | Choosing an algorithm with data rather than an `if` | beginner | 📝 theory |
| 22 | [Template Method](template-method.md) | A fixed skeleton with a few varying steps; and the trap of forgetting to call `base` | intermediate | 📝 theory |
| 23 | [Visitor](visitor.md) | Adding operations over a tree of fixed types without touching the node classes | advanced | 📝 theory |

## The six to read first if you only have time for six

[Strategy](strategy.md) · [Adapter](adapter.md) · [Decorator](decorator.md) ·
[Observer](observer.md) · [Factory Method](factory-method.md) · [Composite](composite.md)

These six account for most of the times you'll actually meet a pattern in everyday .NET code, and
five of the six are already in the BCL (`Stream` is a Decorator, `event` is an Observer,
`IEnumerable` is an Iterator).

## Three to read so you know to **avoid** them

| Pattern | Why |
|---|---|
| [Singleton](singleton.md) | Nearly always better replaced by a DI container's singleton lifetime |
| [Interpreter](interpreter.md) | Rarely the right fit; `Expression<T>` is usually the answer |
| [Visitor](visitor.md) | Expensive while the set of types is still changing; a `switch` expression covers most cases |

## Related Topics

- [Design Patterns](../index.md) — the topic this directory belongs to
- [Reference](../reference/index.md) — the foundations, read first
- [Which pattern to choose](../reference/choosing-a-pattern.md) — looking one up from a symptom
- [Cheatsheet: the 23 GoF](../cheatsheets/gof-23.md) — the one-page table
- [Case study](../case-studies/index.md) — a concrete failure for each pattern
