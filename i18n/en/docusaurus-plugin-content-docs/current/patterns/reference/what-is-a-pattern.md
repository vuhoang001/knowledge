---
title: What a design pattern is — and when not to use one
sidebar_position: 1
description: "A pattern is shared vocabulary for a proven way of arranging the relationships between classes — not a library to call, and not a goal to reach."
tags: [design-pattern, gof, oop, refactoring]
domain: backend
category: pattern
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# What a design pattern is — and when not to use one

> **Takeaway:** A pattern is a **shared name** for a way of arranging the relationships between
> classes that many people arrived at after banging their heads on the same problem. Its greatest
> value is the **vocabulary**, not the code. Applying a pattern before you feel real pain is
> manufacturing pain.

## Goal

Block two mistakes that run in opposite directions and cost the same:

1. **Not knowing the pattern** → rewriting a solution that already has a name, getting wrong
   exactly the parts people have been warning about since 1994.
2. **Knowing the pattern too early** → building `IThingFactory` + `AbstractThingProvider` for
   exactly one implementation, and three years later there's still only one.

The second mistake is more common among people who've just finished a patterns book, and harder to
cure — because the code "looks professional".

## Overview

In 1994, four authors (the **Gang of Four** — Gamma, Helm, Johnson, Vlissides) invented nothing at
all. They went and read existing C++ and Smalltalk code, noticed 23 arrangements that kept
recurring, and **gave them names**.

That's the whole story. A pattern has four parts:

| Part | Answers | Example with Strategy |
|---|---|---|
| **Name** | What to call it in a meeting | "Strategy" |
| **Problem** | When to start thinking about it | Several algorithms with the same purpose, chosen at run time |
| **Solution** | How to arrange the classes | Split each algorithm into a class implementing a shared interface |
| **Consequences** | What you gain, what you lose | Gain: add an algorithm without touching old code. Lose: more classes, and the caller has to know which one to pick |

**The "Consequences" part is the part worth reading.** Most material online copies only the first
two along with a UML diagram — you finish knowing how to draw it, not *when not to draw it*.

### The three groups

| Group | Answers the question | Pattern count | Representatives |
|---|---|---|---|
| **Creational** | How does this object **get created** | 5 | Factory Method, Builder |
| **Structural** | How do the objects **fit together** | 7 | Adapter, Decorator |
| **Behavioral** | How do they **talk** to each other | 11 | Strategy, Observer |

A way to remember it: creational answers *"where does it come from"*, structural answers *"how does it fit together"*,
behavioral answers *"who calls whom"*.

## Why you need them — the real value is the vocabulary

Compare two things you might say in a code review:

> *"I think we want an interface here, and then a class per fee type implementing it, and then above
> that a dictionary mapping the type code to the class, and then when we need it we look it up…"*

> *"Use Strategy here."*

The second sentence conveys **more** than the first — because it drags along the "consequences" part
that the listener already knows: there will be more classes, there will need to be a place that
decides which class, and adding a new type won't require touching old code.

That's the reason patterns are worth learning. Not to use more of them, but to **say things more briefly**.

## Worked example — shipping fees for three customer types

The same problem, two arrangements. The code runs as-is with
`dotnet run <file>.cs` on .NET 11.0.0.

### The problem

The shipping fee depends on the customer type:

| Type | Formula |
|---|---|
| `thuong` (standard) | 15,000 VND/kg |
| `than` (loyal) | 15,000 VND/kg, less 10% |
| `vip` | Free for orders from 500,000 VND, otherwise 10,000 VND/kg |

### Option A — `if-else`, and it is **not wrong**

```csharp
decimal PhiIfElse(string loai, decimal tien, int kg) => loai switch
{
    "thuong" => kg * 15000m,
    "than"   => kg * 15000m * 0.9m,
    "vip"    => tien >= 500000m ? 0m : kg * 10000m,
    _        => throw new ArgumentException($"khong biet loai: {loai}")
};
```

Six lines, understandable in one pass, with no other file to open. **With three types and one
call site, this is the correct code.** Anyone telling you to replace it with a pattern is applying
patterns as ritual.

### Option B — Strategy

```csharp
interface IPhiShip { decimal Tinh(decimal tien, int kg); }

sealed class PhiThuong    : IPhiShip { public decimal Tinh(decimal tien, int kg) => kg * 15000m; }
sealed class PhiThanThiet : IPhiShip { public decimal Tinh(decimal tien, int kg) => kg * 15000m * 0.9m; }
sealed class PhiVip       : IPhiShip { public decimal Tinh(decimal tien, int kg) => tien >= 500000m ? 0m : kg * 10000m; }

var bang = new Dictionary<string, IPhiShip>
{
    ["thuong"] = new PhiThuong(),
    ["than"]   = new PhiThanThiet(),
    ["vip"]    = new PhiVip(),
};
decimal PhiStrategy(string loai, decimal tien, int kg) => bang[loai].Tinh(tien, kg);
```

### Verification — same input, same output

This is the mandatory check for **every** application of a pattern: a refactor that changes behaviour
isn't a refactor, it's a rewrite.

```csharp
foreach (var c in cases)
{
    var a = PhiIfElse(c.loai, c.tien, c.kg);
    var b = PhiStrategy(c.loai, c.tien, c.kg);
    Console.WriteLine($"{c.loai,-8}{c.tien,12:N0}{c.kg,4}{a,12:N0}{b,12:N0}   {(a == b ? "OK" : "LECH"),-5}");
}
```

```text
loai       tien hang  kg     if-else    strategy   khop
---------------------------------------------------------
thuong       200,000   2      30,000      30,000   OK
than         200,000   2      27,000      27,000   OK
vip          200,000   2      20,000      20,000   OK
vip          600,000   2           0           0   OK
---------------------------------------------------------
So dong lech: 0

if-else : 1 ham, 3 nhanh, 0 kieu moi
strategy: 1 interface, 3 lop, 0 nhanh
```

### Before and after

| | `if-else` | Strategy |
|---|---|---|
| Types you must open to understand it | 1 | 4 |
| Adding a fourth type | edit 1 function | add 1 class + 1 registration line |
| Testing the VIP formula in isolation | must go through the shared function | `new PhiVip().Tinh(...)` |
| Fee types configured by the user at run time | impossible | possible |
| Reading it the first time | 6 lines, one place | 4 places, jumping back and forth |

**The tipping point is in the last two rows.** As long as the list of types is decided by a programmer
and used in one place, `if-else` wins. Once the fee type becomes **data** — configurable, toggleable,
different per branch — the `switch` starts spreading across files and Strategy earns its cost.

The concrete failure from letting a `switch` spread: [A fifth type, seven places to change](../case-studies/them-loai-thu-nam-sua-bay-cho.md).
The opposite failure — building an abstraction for exactly one implementation:
[Abstract Factory for one implementation](../case-studies/abstract-factory-cho-mot-hien-thuc.md).

## When NOT to use a pattern

This section matters as much as everything above. Three signs you're applying a pattern too early:

| Sign | Why it's a smell |
|---|---|
| The interface has **exactly one** implementing class, and there's no plan for a second | An interface exists to have several implementations. With one, it's just an extra file to jump to |
| You name a class `XxxFactory`, `XxxStrategy`, `XxxManager` **before** writing the logic | A pattern name is something you *recognise afterwards*, not something you *decide upfront* |
| You have to draw a diagram to explain a flow to a colleague that in fact only has one branch | The cognitive cost has already exceeded the problem's cost |

**The practical rule — the Rule of Three.** Write it directly the first time. The second time you meet
the same problem, copy it and put up with it. Only on the third do you abstract — by then you have three
real samples telling you where the axis of variation actually is. Abstracting from **one** sample nearly
always picks the wrong axis.

> A pattern is **medicine**, not a **vitamin**. Prescribing medicine to a healthy person harms them.

More thoroughly, on getting from a symptom to a pattern: [Which pattern to choose](choosing-a-pattern.md).

## Trade-offs

| You gain | You lose |
|---|---|
| Shared vocabulary — one word instead of a paragraph of description | Someone who doesn't know the word reads the code more slowly |
| The point of variation is isolated; adding a variant doesn't touch old code | More types, more files, one more jump while debugging |
| Each piece can be tested in isolation | The execution flow spreads over several classes, and stack traces get longer |
| Configurable at run time | Errors move from *compile time* to *runtime* (a dictionary lookup missing its key) |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Learning patterns by learning the UML diagrams | You draw the right shape and use it in the wrong place — because the "consequences" aren't in the picture |
| Treating the number of patterns used as a code-quality metric | The code triples in size and solves no additional problem |
| Using pattern names as a suffix on every class (`OrderManagerFactoryStrategy`) | The name talks about *the implementation*, not *what it does* — six months later you can't find it |
| Refactoring to a pattern without a test holding the behaviour | You change behaviour and nobody knows; see the "khop" column in the example above |
| Assuming patterns are an OOP thing so functional languages don't need them | Strategy in C# is often just a `Func<decimal, decimal>`; the pattern is still there, only the name changes |

## FAQ

<details>
<summary>C# has delegates, so does Strategy still need a class?</summary>

Usually not. `Func<decimal, int, decimal>` does exactly `IPhiShip`'s job with far less code.

A class only wins when the strategy needs **more than one method** (say `Tinh` and `MoTa`), needs
**its own state** (thresholds, configuration), or needs to be **created by the DI container** along with
its dependencies. If none of those three apply, a delegate is the default choice.

</details>

<details>
<summary>Are the 23 GoF patterns still valid in 2026?</summary>

Most of them, but **unevenly**. Three groups:

- **Still fully valuable:** Strategy, Observer, Decorator, Adapter, Composite, Command.
- **Swallowed by the language:** Iterator (`IEnumerable` + `foreach`), Template Method
  (usually replaced by a delegate), Prototype (`record` with `with`).
- **Now an anti-pattern in most contexts:** Singleton — see
  [Singleton](../skills/singleton.md); nearly always better replaced by a DI container's singleton
  lifetime.

</details>

<details>
<summary>Should I learn all 23 at once, or as needed?</summary>

Skim all 23 once to **know they exist and what they're called** — that's the vocabulary part, cheap
and immediately useful. Don't try to remember the details.

Learn them deeply as needed: when you hit a specific symptom in your own code, open
[Which pattern to choose](choosing-a-pattern.md), look up the symptom, and then read that one carefully.

</details>

<details>
<summary>How do patterns differ from architecture (MVC, Clean Architecture)?</summary>

They differ in **scale**. A GoF pattern is about the relationships between a handful of classes — you
can see the whole thing in one file. Architecture is about the relationships between layers and modules —
one file shows you nothing.

They overlap rather than exclude each other: a Clean Architecture system is still full of
Strategy, Adapter and Command inside.

</details>

## Related Topics

- [SOLID](solid.md) — the five principles that most patterns are a direct consequence of
- [Composition over inheritance](composition-over-inheritance.md) — the original principle the GoF repeat over and over
- [Coupling and cohesion](coupling-cohesion.md) — the metric patterns actually serve
- [Which pattern to choose](choosing-a-pattern.md) — from a code symptom to a pattern name
- [Strategy](../skills/strategy.md) — the pattern used as the example on this page
- [Cheatsheet: the 23 GoF](../cheatsheets/gof-23.md) — the one-page lookup table

## References

- Gamma, Helm, Johnson, Vlissides — *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), chapter 1
- Fowler — *Refactoring*, the "When should we refactor" section (the Rule of Three)
