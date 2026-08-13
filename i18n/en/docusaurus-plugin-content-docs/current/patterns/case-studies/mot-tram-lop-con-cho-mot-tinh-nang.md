---
title: One more option, 36 more classes
sidebar_position: 6
description: "A two-axis inheritance tree multiplies with every new dimension — 6 classes become 72 after three options, while composition goes from 4 to 11."
tags: [case-study, bridge, decorator, composition, inheritance]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# One more option, 36 more classes

> **Label: a reconstructed situation.** Every number was really produced by
> `dotnet run 03-composition.cs` and `dotnet run 12-bridge.cs` on .NET 11.0.0.

## Context

A coffee chain's ordering system. Initially two bases and two toppings, with one class per
combination:

```csharp
abstract class CaPheKeThua { public abstract decimal Gia(); }

sealed class EspressoTron      : CaPheKeThua { public override decimal Gia() => 30000m; }
sealed class EspressoSua       : CaPheKeThua { public override decimal Gia() => 30000m + 8000m; }
sealed class EspressoSuaDuong  : CaPheKeThua { public override decimal Gia() => 30000m + 8000m + 2000m; }
sealed class AmericanoTron     : CaPheKeThua { public override decimal Gia() => 35000m; }
sealed class AmericanoSua      : CaPheKeThua { public override decimal Gia() => 35000m + 8000m; }
sealed class AmericanoSuaDuong : CaPheKeThua { public override decimal Gia() => 35000m + 8000m + 2000m; }
```

Six classes. Ran fine for two years.

## Symptoms

Marketing asks for three features in one quarter: **size** (3 levels), **hot/iced**, and **whipped
cream**.

```text
chieu them vao             ke thua   composition
------------------------------------------------
+ size (3 muc)                  18             7
+ nong/da (2)                   36             9
+ kem tuoi (2)                  72            11
```

**From 6 classes to 72.** The team's initial estimate for the "size" feature was two days; it took
two weeks.

And a second, worse symptom: the shop raises the milk price from 8,000 to 9,000.

```text
Ke thua     : 6 lop con cho 2 loai x 3 to hop
Composition : 4 lop (2 base + 2 topping)
```

With 72 classes, the constant `8000m` appears in **36** places. Miss one and one drink combination is
priced wrong — and no test covers all 72 combinations.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The team is short-staffed | The estimate was off by 7× | Adding people makes it slower: 72 classes get divided up and each person misses a case |
| We need code generation | It addresses the "lots of typing" symptom | Generating 72 classes is still 72 classes to read, build and test |
| We need a price table in the database | The right direction | Half right — but it drops the part where the drinks *behave* differently |
| Refactor by extracting a shared base class | The first OOP instinct | Doesn't help: the problem isn't duplicated code, it's the **number of combinations** |

The last hypothesis is the biggest time sink. The team added two intermediate base-class layers, the
duplication dropped a little, and **the class count didn't drop by one** — because each combination still
needs a leaf class.

## The real cause

The inheritance tree is encoding **several axes of variation** in a single dimension.

```text
EspressoSuaDuong
└── Espresso | Americano       ← truc "nen"
    └── Sua | Duong            ← truc "topping"
```

Inheritance has only **one** axis. Every added axis has to be multiplied by all existing ones:

```text
so lop = ∏ kᵢ        (ke thua)
so lop = Σ kᵢ        (composition)
```

With 5 axes of size 2–3, the product is 72 while the sum is 11.

**The sign was in the class names from the start:** `EspressoSuaDuong` combines two different
categories. That's an indicator of two axes, and it appeared as early as the third class — two years before
the problem exploded.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Unit tests per class | Green | Each class is correct on its own |
| Coverage | High | Every class that **exists** is tested |
| Per-PR code review | Missed it | Each PR only adds a few classes — nobody sees the curve |
| The compiler | Silent | 72 classes is perfectly legal |

This is the class of problem that **isn't a bug**. There's nothing wrong to catch; only a cost growing
multiplicatively, and cost isn't something tests measure.

The one visible indicator is **speed**: the same kind of request ("add one option") takes longer and
longer. That's data available in every work-tracking system, and almost nobody looks at it.

## The fix

### Direction 1 — [Decorator](../skills/decorator.md) for additive toppings

```csharp
interface IDoUong { decimal Gia(); string Ten(); }

sealed class Espresso  : IDoUong { public decimal Gia() => 30000m; public string Ten() => "Espresso"; }
sealed class Sua(IDoUong g)   : IDoUong { public decimal Gia() => g.Gia() + 8000m; public string Ten() => g.Ten() + " + sua"; }
sealed class Duong(IDoUong g) : IDoUong { public decimal Gia() => g.Gia() + 2000m; public string Ten() => g.Ten() + " + duong"; }
```

Verify the prices didn't change — the mandatory check for every refactor:

```text
mon                        ke thua   composition   khop
--------------------------------------------------------------
Espresso                    30,000        30,000   OK
Espresso + sua              38,000        38,000   OK
Espresso + sua + duong      40,000        40,000   OK
Americano                   35,000        35,000   OK
Americano + sua             43,000        43,000   OK
Americano + sua + duong     45,000        45,000   OK
--------------------------------------------------------------
So dong lech: 0
```

`8000m` is now in **one** place. And `new Sua(new Sua(new Espresso()))` — a double milk — works
without needing an `EspressoSuaSua` class.

### Direction 2 — [Bridge](../skills/bridge.md) when the two axes are two independent systems

For the reports × export formats problem (the same structure, a different context):

```text
n bao cao x m dinh dang      ke thua    bridge
----------------------------------------------
2 x 2                              4         4
3 x 3                              9         6
5 x 4                             20         9
8 x 6                             48        14
```

**Note the first row: at 2×2, Bridge doesn't pay off.** That's why this bug is hard to catch early — at
small scale, inheritance genuinely is simpler. It only becomes wrong when the third axis appears.

### Which direction to choose

| The problem's shape | Use |
|---|---|
| The options are **additive**, stackable, in any number | [Decorator](../skills/decorator.md) |
| Two independent **systems**, each side choosing exactly one | [Bridge](../skills/bridge.md) |
| The options are pure data with no distinct behaviour | A configuration `record` + a calculation function |

## How to spot it early

```bash
# Ten lop con ghep tu hai danh muc — dau hieu hai truc
ls src/**/*.cs | grep -iE "(Espresso|Americano)(Sua|Duong)"
```

Three questions for a code review, usable from the **third** subclass onwards:

1. Does the subclass name combine **two different categories**?
2. If you add an option with `k` values, does the class count **multiply** or **add**?
3. How many classes does one business constant (the milk price) appear in? More than 2 is already duplication.

The second question can be answered in a minute and is the most important — it turns a feeling ("this code
has rather a lot of classes") into a forecast with a number.

## Related Topics

- [Composition over inheritance](../reference/composition-over-inheritance.md) — the product versus sum formula
- [Bridge](../skills/bridge.md) — splitting two axes into two trees
- [Decorator](../skills/decorator.md) — additive, stackable options
- [Case study — Design Patterns](index.md)
