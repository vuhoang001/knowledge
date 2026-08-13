---
title: The 23 GoF patterns — quick lookup
sidebar_position: 1
description: "A one-page table: the intent, the signs to use it, the signs not to, and the incarnations already in .NET."
tags: [cheatsheet, design-pattern, gof, dotnet]
domain: backend
category: pattern
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# The 23 GoF patterns — quick lookup

This page is for looking things up **while coding**, not for learning them the first time. To learn, read
[What a design pattern is](../reference/what-is-a-pattern.md) then
[Which pattern to choose](../reference/choosing-a-pattern.md).

## Creational — where objects come from

| Pattern | In one line | Use when | Don't when | Already in .NET |
|---|---|---|---|---|
| [Singleton](../skills/singleton.md) | Exactly one instance | The object is immutable and stateless | You have a DI container — use `AddSingleton` | `Lazy<T>` |
| [Factory Method](../skills/factory-method.md) | One place decides which class to `new` | The type is chosen by data at run time | The list is fixed — use a `switch` on an `enum` | Keyed services (.NET 8+) |
| [Abstract Factory](../skills/abstract-factory.md) | A whole matching family | Mixing families causes silent wrongness | The products are independent | Per-environment DI registration modules |
| [Builder](../skills/builder.md) | Built over several steps, validated in `Build()` | There are cross-checks between fields | You only need parameter names — use `required` + an object initializer | `WebApplication.CreateBuilder` |
| [Prototype](../skills/prototype.md) | Clone rather than rebuild | Construction is expensive and you need many variants | The object is immutable — sharing suffices | `record` + `with` (**shallow!**) |

## Structural — how they fit together

| Pattern | In one line | Use when | Don't when | Already in .NET |
|---|---|---|---|---|
| [Adapter](../skills/adapter.md) | Change an API's shape to fit | You use an external library from ≥2 places | You own both sides | Extension methods (a light form) |
| [Bridge](../skills/bridge.md) | Two axes become two trees | Subclass names combine 2 categories | You only have one axis | — |
| [Composite](../skills/composite.md) | Leaves and branches share an interface | A structure nested several levels deep | Only one level — `List<T>` suffices | The `Expression` tree |
| [Decorator](../skills/decorator.md) | Wrap to add behaviour | Logging/caching/retries that can be switched on and off | One behaviour, always on | `Stream`, middleware, `DelegatingHandler` |
| [Facade](../skills/facade.md) | One door for many steps | ≥2 places repeat the same sequence | There's only one call site | — |
| [Flyweight](../skills/flyweight.md) | Share the common part | You've **measured** and found the RAM cost | You haven't measured | String interning, `ArrayPool<T>` |
| [Proxy](../skills/proxy.md) | Step in before the real object is touched | Laziness, permission checks, remote calls | The object is small and always used | `Lazy<T>`, EF lazy loading, `DispatchProxy` |

## Behavioral — who calls whom

| Pattern | In one line | Use when | Don't when | Already in .NET |
|---|---|---|---|---|
| [Chain of Responsibility](../skills/chain-of-responsibility.md) | Whoever accepts it stops | Several approval levels, configurable | 2–3 fixed branches | The middleware pipeline |
| [Command](../skills/command.md) | The request is an object | You need undo, queueing, replay | `HoanTac()` would be empty | `ICommand`, MediatR, message queues |
| [Interpreter](../skills/interpreter.md) | A small language becomes a tree | The rules are written by **users** | A programmer writes them — use `Expression<T>` | `System.Linq.Expressions` |
| [Iterator](../skills/iterator.md) | Traverse without exposing the structure | Always — it's already in the language | — | `IEnumerable<T>`, `yield return` |
| [Mediator](../skills/mediator.md) | n×n becomes n | ≥4 interlocking components | A one-way relationship — use Observer | MediatR (a different nature) |
| [Memento](../skills/memento.md) | A snapshot for restoring | Undo, checkpoints | The state is very large | `ImmutableList<T>` |
| [Observer](../skills/observer.md) | One changes, many learn of it | The number of listeners varies | The order of reactions matters | `event`, `IObservable<T>` |
| [State](../skills/state.md) | A state knows where it can go | There are transition rules to enforce | There are no transition rules — it's a field | — |
| [Strategy](../skills/strategy.md) | Choose the algorithm at run time | Chosen by **data** | There's still a `switch` doing the choosing | `Func<>`, keyed services |
| [Template Method](../skills/template-method.md) | Fixed skeleton, a few open steps | ≥3 related varying steps | 1 step — use a delegate | `HostedService` |
| [Visitor](../skills/visitor.md) | Add operations over a tree | The type set is **stable**, operations are growing | The type set is still changing | `ExpressionVisitor` |

## The commonly confused pairs — a one-question test

| Pair | Ask |
|---|---|
| Adapter ↔ Facade | Remove the middle class: does the caller write **1 line** (Adapter) or **7 lines** (Facade)? |
| Decorator ↔ Proxy | Does wrapping two of the same kind make sense? Yes → Decorator |
| Strategy ↔ State | Do two consecutive calls give the same result? Yes → Strategy |
| Strategy ↔ Template Method | Can it be changed at run time? Yes → Strategy |
| Composite ↔ Decorator | How many children? Many → Composite. One → Decorator |
| Mediator ↔ Observer | Does the thing in the middle have coordination **rules**? Yes → Mediator |
| Builder ↔ Abstract Factory | Building **one** complex object or **a family** of objects? |
| Memento ↔ Prototype | Is the copy for parallel use (Prototype) or for storing away (Memento)? |

## Four signs you're using a pattern too early

1. The interface has **exactly one** implementing class, with no plan for a second.
2. You name things `XxxFactory`/`XxxStrategy` **before** writing the logic.
3. There's still a `switch` choosing between the classes you just split out.
4. You have to draw a diagram to explain a flow that in fact has only one branch.

**The Rule of Three:** write it directly the first time, put up with it the second, abstract on the third.

## A cost-of-change table

Whichever column is cheap is the direction that pattern optimises — choose by which axis changes more.

| Organisation | Adding a new **type** | Adding a new **operation** |
|---|---|---|
| A method in the class | cheap | expensive — edit every class |
| A `switch` on the type | expensive, **silent** | cheap |
| [Visitor](../skills/visitor.md) | expensive, **the compiler reminds you** | cheap |
| [Strategy](../skills/strategy.md) + a registry | cheap | expensive — edit the interface |

## Related Topics

- [Which pattern to choose](../reference/choosing-a-pattern.md) — reverse lookup from a symptom
- [Skills](../skills/index.md) — the 23 detailed pages
- [What a design pattern is](../reference/what-is-a-pattern.md) — and when not to use one
- [SOLID](../reference/solid.md) — the reason behind most of the table above
