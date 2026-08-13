---
title: Six types to do the work of two
sidebar_position: 19
description: "An Abstract Factory built for a single implementation, preparing for a future that never came — four redundant types, and every newcomer loses an afternoon."
tags: [case-study, abstract-factory, over-engineering, yagni, strategy]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Six types to do the work of two

> **Label: a reconstructed situation.** Every number was really produced by
> `dotnet run cs-over-engineer.cs` on .NET 11.0.0.

## Context

A new project needs to store files and push work onto a queue. The infrastructure is Azure.

In the design meeting somebody asks: *"what if we move to AWS later?"* The team agrees to
build an [Abstract Factory](../skills/abstract-factory.md) to "prepare in advance".

```csharp
interface IKho { string Ghi(string ten); }
interface IHangDoi { string Day(string viec); }
interface IXuongLuuTru { IKho TaoKho(); IHangDoi TaoHangDoi(); }

sealed class KhoAzure : IKho { ... }
sealed class HangDoiAzure : IHangDoi { ... }
sealed class XuongLuuTruAzure : IXuongLuuTru { ... }
```

Three years pass. It's still only Azure.

## Symptoms

There's no incident. There are five costs, none of which appears on any report:

```text
=== Ban 'chuan bi cho tuong lai' ===
  so interface : 3   [IXuongLuuTru, IKho, IHangDoi]
  so lop cai   : 3   [XuongLuuTruAzure, KhoAzure, HangDoiAzure]
  so HO san pham thuc su ton tai: 1
  so lan nhay file de doc het luong: 6

=== Ban truc tiep ===
  so kieu: 2   so lan nhay file: 2

=== Ket qua giong nhau, chi phi khac nhau ===
  ket qua khop: True
  kieu thua   : 4
```

**Six types to do the work of two.** And:

| Cost | Observable as |
|---|---|
| A newcomer reading the file-storage flow | 6 file jumps instead of 2 |
| The "why is there a factory?" question during onboarding | Every hiring round, and nobody can answer beyond "to switch clouds" |
| Adding a product type (`IBoNhoDem`) | Edit the factory interface + the factory class, despite there being one implementation |
| Tests | Each test builds a fake factory returning a fake store — two layers of mock for one call |
| Stack traces on failure | Two extra frames carrying no information |

The third cost hurts most, and it's **the inverse of the pattern's promise**: Abstract
Factory makes adding a *family* cheap and adding a *product type* expensive. This project never added a
family, and added product types six times.

## The wrong first hypotheses

Here the "wrong hypotheses" aren't about the cause of an incident, but about the **reasons to keep the status
quo**:

| The argument for keeping it | Why it sounds reasonable | Why it doesn't hold |
|---|---|---|
| "What if we move to AWS tomorrow" | The risk is real | Three years without a move. And if they did move, the current abstraction is **almost certainly wrong** — it was designed when nobody knew how AWS differs |
| "Removing it loses testability" | DI needs interfaces | You can still keep `IKho` and `IHangDoi` — what's redundant is the **factory class**, not the product interfaces |
| "It's already written, removing it is work" | Sunk cost | The cost of keeping it is every read, every onboarding, every added product |
| "It causes no bugs" | True | Over-engineering's cost is never a bug. It's **speed** |

The first argument is the one most worth analysing. It assumes an abstraction built **today** will fit
tomorrow's needs. Abstracting from **one** sample nearly always picks the wrong axis:
you don't know where AWS and Azure differ until you've actually implemented both.

## The real cause

The pattern was chosen based on an **imagined risk**, not on **existing pain**.

Four signs, all present from day one:

| Sign | In this project |
|---|---|
| The interface has **exactly one** implementing class | 3/3 |
| No concrete plan for a second implementation | No ticket, no date |
| The class name carries the pattern's name before there's any logic | `XuongLuuTru` was named in the design meeting |
| A one-branch flow needs explaining to be understood | Every onboarding |

See also [when not to use a pattern](../reference/what-is-a-pattern.md#when-not-to-use-a-pattern).

And the most notable point: **the factory class buys nothing over the DI container.**

```csharp
services.AddSingleton<IKho, KhoAzure>();
services.AddSingleton<IHangDoi, HangDoiAzure>();
```

Those two lines already guarantee the whole set matches, because the whole set is registered in one place.
Moving to AWS means changing those two lines. The factory class is **one more layer on top of a layer already
doing that job**.

Abstract Factory only wins when the family is chosen **at run time, by data** — for example choosing an
infrastructure set by the request's tenant. In this project, the choice happens at startup.

## Why nothing caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Tests | Green | The code is correct — it's just redundant |
| Code review | Approved | It looks "professional"; objecting to an abstraction is a hard thing to say in a review |
| Analyzers | Silent | There's no rule forbidding a single-implementation interface |
| Code quality metrics | Good | Low coupling, high cohesion — every metric looks fine |

The last row is the deepest lesson: **over-engineering makes every quality metric look better.**
Fan-out is lower, each class is smaller, per-method complexity is lower. No automated metric distinguishes
"a well-placed abstraction" from "a redundant abstraction".

The only measurable thing is **time**: how long it takes a newcomer to understand this flow, and how long it
takes to add a product type.

## The fix

### Remove the redundant layer, keep the useful one

```csharp
// Bo: IXuongLuuTru, XuongLuuTruAzure
// Giu: IKho, IHangDoi  (can cho test va cho DI)

services.AddSingleton<IKho, KhoAzure>();
services.AddSingleton<IHangDoi, HangDoiAzure>();
```

Four types become two. Testability is unchanged. The ability to switch providers is unchanged — in fact
**better**, because there aren't two layers to keep in sync.

### Climb the ladder in order

When you genuinely need to switch infrastructure, climb step by step:

| Step | When |
|---|---|
| 1. `new KhoAzure()` directly | You don't need isolated tests yet |
| 2. `IKho` + DI registration | You need tests — **where most projects should stop** |
| 3. Two registration modules (`AddAzure()`, `AddAws()`) | You have **two** real implementations |
| 4. Abstract Factory | Choosing the family **at run time**, by data (multi-tenant) |

This project jumped straight from step 1 to step 4 on the strength of one question in a meeting.

**Climbing one step up is always easy. Climbing back down isn't** — because the whole team has got used to
the abstraction, and removing it gets read as "making the code worse".

### The Rule of Three

Write it directly the first time. The second time you meet the same problem, copy it and put up with it. Only
on the third do you abstract — by then you have three real samples telling you where the axis of variation is.

The details are in [Which pattern to choose](../reference/choosing-a-pattern.md#when-the-right-answer-is-no-pattern-at-all)
and [Strategy](../skills/strategy.md#the-part-that-is-not-strategy-still-an-if-to-choose) — which describes
another common variant of this same mistake.

## How to spot it early

```bash
# Interface chi co MOT lop cai
for i in $(grep -rhoP 'interface \K\w+' --include=*.cs src/); do
  n=$(grep -rc ": .*\b$i\b" --include=*.cs src/ | awk -F: '{s+=$2} END {print s}')
  [ "$n" = "1" ] && echo "$i — 1 lop cai"
done
```

Three questions to ask **before** writing an abstraction:

1. What is the second implementation called? If you can't name it, it doesn't exist yet.
2. Which quarter's plan is it in? No date = no need.
3. Does the DI container already do this? For most infrastructure-choice cases, the answer is **yes**.

The first question is the most effective one in a design meeting: it turns *"what if later…"* into a
checkable proposition.

## Related Topics

- [What a design pattern is](../reference/what-is-a-pattern.md) — when not to use one, and the Rule of Three
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the escalation ladder and where to stop
- [Abstract Factory](../skills/abstract-factory.md) — when it's genuinely right
- [Strategy](../skills/strategy.md) — another common variant of the same mistake
- [Case study — Design Patterns](index.md)
