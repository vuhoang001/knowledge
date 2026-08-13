---
title: Case study — Design Patterns
sidebar_key: patterns-case-studies
sidebar_position: 0
description: "Nineteen ways things break when a pattern is used in the wrong place, each with numeric symptoms, the wrong first hypothesis, and the fix."
tags: [case-study, design-pattern]
domain: backend
category: index
doc_type: index
updated: 2026-08-04
---

# Case study — Design Patterns

Nineteen kinds of failure. Each one follows the same thread: **symptom → the wrong first hypothesis
→ the real cause → why no test caught it → the fix → how to spot it early**.

> **These are reconstructed situations**, not incidents that happened in this knowledge base. In
> exchange, **every number was really produced by `dotnet run <file>.cs` on .NET 11.0.0** — paste it
> back and you get the same thing.

| # | Incident | Lesson | Related technique |
|---|---|---|---|
| 1 | [Tests green alone, red together](test-xanh-rieng-do-chung.md) | A singleton is global state; measured fan-out is 0, the real one is 1 | [Singleton](../skills/singleton.md) |
| 2 | [A fifth format, six missed spots](them-loai-thu-nam-sua-bay-cho.md) | The default branch is the culprit, not the saviour | [Factory Method](../skills/factory-method.md) |
| 3 | [Printing 183 sheets became 242](constructor-chin-tham-so-hoan-vi.md) | Two same-typed parameters side by side are a place to get swapped | [Builder](../skills/builder.md) |
| 4 | [Edit the copy, the original changes](nhan-ban-doi-tuong-dung-chung-list.md) | `record with` is a shallow copy too | [Prototype](../skills/prototype.md) |
| 5 | [The report is 4.2 million short, with no error](adapter-nuot-loi-thanh-danh-sach-rong.md) | `catch { return null; }` turns an incident into wrong data | [Adapter](../skills/adapter.md) |
| 6 | [One more option, 36 more classes](mot-tram-lop-con-cho-mot-tinh-nang.md) | Inheritance multiplies, composition adds: 72 versus 11 | [Bridge](../skills/bridge.md) |
| 7 | [The process dies leaving no log](duyet-cay-khong-bao-gio-dung.md) | `StackOverflowException` can't be caught — it must be prevented, not handled | [Composite](../skills/composite.md) |
| 8 | [The intern can read the payroll](doi-thu-tu-decorator-mat-cache.md) | Caching outside the permission check is a hole in authorization | [Decorator](../skills/decorator.md) |
| 9 | [A one-method facade became 31 methods](facade-phinh-thanh-god-object.md) | Grouping by category has no limit; grouping by use case does | [Facade](../skills/facade.md) |
| 10 | [Colour one cell, the whole table turns red](flyweight-chia-se-nham-trang-thai.md) | A shared object **must** be immutable | [Flyweight](../skills/flyweight.md) |
| 11 | [One property access becomes 501 queries](lazy-proxy-sinh-n-cong-mot-query.md) | A proxy hides I/O cost too well | [Proxy](../skills/proxy.md) |
| 12 | [The exchange request vanishes, nobody reports it](request-roi-qua-het-chain.md) | A chain has no `else` — you have to add the terminal link yourself | [Chain of Responsibility](../skills/chain-of-responsibility.md) |
| 13 | [Undo two commands, stock goes from 10 to 24](undo-khong-tra-lai-trang-thai-cu.md) | `HoanTac` has to rely on what happened, not on what was requested | [Command](../skills/command.md) |
| 14 | [8.4 MB leaked after 2000 screen opens](su-kien-giu-doi-tuong-khong-cho-gc.md) | The source holds the observer, not the other way round | [Observer](../skills/observer.md) |
| 15 | [Shipped before the customer paid](chuyen-trang-thai-trai-phep.md) | A transition rule that isn't in the code doesn't exist | [State](../skills/state.md) |
| 16 | [One subclass accepts the broken rows too](lop-con-quen-goi-base.md) | A `virtual` with shared logic in it is a trap; hooks must be empty | [Template Method](../skills/template-method.md) |
| 17 | [One more operator, six places to change](them-node-moi-sua-moi-visitor.md) | Does the compiler remind you, or does production | [Visitor](../skills/visitor.md) |
| 18 | [The nightly job dies on one `RemoveAll`](sua-list-dang-duyet.md) | `IEnumerable` isn't a collection, it's a recipe | [Iterator](../skills/iterator.md) |
| 19 | [Six types to do the work of two](abstract-factory-cho-mot-hien-thuc.md) | Over-engineering makes **every** quality metric look better | [Abstract Factory](../skills/abstract-factory.md) |

## What all nineteen have in common

Read them all and four motifs repeat:

| Motif | Appears in cases |
|---|---|
| **A default branch hiding an error** — `_ =>` returning a "safe" value instead of throwing | 2, 5, 12, 17 |
| **Unintended reference sharing** — shallow instead of deep, or shared instead of immutable | 1, 4, 10 |
| **Cost becoming invisible** — wrapping order, query count, recomputation count | 8, 11, 18 |
| **A rule with no owner** — living in a document or in someone's head, not in the code | 2, 9, 15, 16 |

And a bigger commonality: **of the 19 cases, only 3 throw an exception.** The other sixteen run
green, produce a wrong result or a wrong cost, and are discovered by a human rather than by a
tool.

That's why the *"why no test caught it"* section is in every one of them.

## Related Topics

- [Design Patterns](../index.md) — the topic this directory belongs to
- [Skills](../skills/index.md) — the 23 GoF patterns
- [Reference](../reference/index.md) — the foundations
- [Cheatsheet: the 23 GoF](../cheatsheets/gof-23.md) — the one-page table
