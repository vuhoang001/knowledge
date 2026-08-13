---
title: Composition over inheritance
sidebar_position: 3
description: "Inheritance multiplies the class count by each axis of variation, composition adds to it — measured for real by the types produced when a fourth axis appears."
tags: [composition, inheritance, oop, decorator, bridge]
domain: backend
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Composition over inheritance

> **Takeaway:** Each new axis of variation **multiplies** the number of subclasses under inheritance,
> but only **adds** a few classes under composition. Measured for real below: 6 → 72 classes versus
> 4 → 11 when three axes are added. That's the entire reason the GoF wrote *"favor object composition
> over class inheritance"* right there in chapter 1.

## Goal

Give a **countable** criterion for deciding between inheritance and composition, instead of the gut
feeling "inheritance is bad" — a statement that is both wrong and useless when you're standing in
front of a real class hierarchy.

## Overview

Two ways to reuse code:

| | Inheritance | Composition |
|---|---|---|
| The relationship | `Vuong` **is a** `ChuNhat` | `LyCaPheCoSua` **has a** `LyCaPhe` inside it |
| When it's fixed | Compile time — hardcoded in the class declaration | Runtime — assembled while running |
| Access into the parent | Sees `protected` too, depends on implementation details | Only sees the public API |
| Adding an axis of variation | Multiplies the class count | Adds to the class count |

That last row is the deciding one, and also the easiest to measure.

## Why you need it — the combinatorial explosion problem

A coffee shop has 2 bases (Espresso, Americano) and customers can add toppings (milk, sugar).
With inheritance, each **combination** has to be a class:

```csharp
abstract class CaPheKeThua { public abstract decimal Gia(); }

sealed class EspressoTron      : CaPheKeThua { public override decimal Gia() => 30000m; }
sealed class EspressoSua       : CaPheKeThua { public override decimal Gia() => 30000m + 8000m; }
sealed class EspressoSuaDuong  : CaPheKeThua { public override decimal Gia() => 30000m + 8000m + 2000m; }
sealed class AmericanoTron     : CaPheKeThua { public override decimal Gia() => 35000m; }
sealed class AmericanoSua      : CaPheKeThua { public override decimal Gia() => 35000m + 8000m; }
sealed class AmericanoSuaDuong : CaPheKeThua { public override decimal Gia() => 35000m + 8000m + 2000m; }
```

Six classes for two drinks. Note the number `8000m` appears in **four** places — add a third base
and it appears in six, and the day the shop raises the milk price you have to fix every one.

## Worked example — the same problem, two arrangements

Run with `dotnet run 03-composition.cs` on .NET 11.0.0.

### The composition way — nested wrapping

```csharp
interface IDoUong { decimal Gia(); string Ten(); }

sealed class Espresso  : IDoUong { public decimal Gia() => 30000m; public string Ten() => "Espresso"; }
sealed class Americano : IDoUong { public decimal Gia() => 35000m; public string Ten() => "Americano"; }

sealed class Sua(IDoUong g)   : IDoUong { public decimal Gia() => g.Gia() + 8000m; public string Ten() => g.Ten() + " + sua"; }
sealed class Duong(IDoUong g) : IDoUong { public decimal Gia() => g.Gia() + 2000m; public string Ten() => g.Ten() + " + duong"; }
```

Four classes. `8000m` appears **once**. The combinations are built at run time:

```csharp
IDoUong[] hopThanh =
{
    new Espresso(),
    new Sua(new Espresso()),
    new Duong(new Sua(new Espresso())),
    new Americano(),
    new Sua(new Americano()),
    new Duong(new Sua(new Americano())),
};
```

### Verification — the price has to match cup for cup

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

Ke thua     : 6 lop con cho 2 loai x 3 to hop
Composition : 4 lop (2 base + 2 topping)
```

The class count is measured by reflection at run time, not counted by hand:

```csharp
var soLopKeThua = typeof(CaPheKeThua).Assembly.GetTypes().Count(t => t.IsSubclassOf(typeof(CaPheKeThua)));
var soLopHop    = typeof(IDoUong).Assembly.GetTypes().Count(t => t.IsClass && typeof(IDoUong).IsAssignableFrom(t));
```

### Where the gap explodes — adding a third, fourth and fifth axis

The shop adds size (3 levels), hot/iced (2), and whipped cream (2):

```text
chieu them vao             ke thua   composition
------------------------------------------------
+ size (3 muc)                  18             7
+ nong/da (2)                   36             9
+ kem tuoi (2)                  72            11
```

**72 classes versus 11.** And 72 is only the class count — each of those classes copies its own
whole price formula, so the number of places holding the constant `8000m` multiplies along with it.

The formula: inheritance is the **product** `∏ kᵢ`, composition is the **sum** `Σ kᵢ`.

### Before and after

| | Inheritance | Composition |
|---|---|---|
| Classes with 5 axes | 72 | 11 |
| Places holding the milk price | 36 classes | 1 class |
| Adding a new topping | add 36 classes | add 1 class |
| The customer picks the combination at run time | no — combinations are fixed at compile time | yes |
| Ordering milk twice | needs an `EspressoSuaSua` class | `new Sua(new Sua(new Espresso()))` |
| Reading it the first time | flat, easy | you have to follow the nesting |

The second-to-last row is where composition opens up a capability inheritance has **no way** of
reaching without exploding another layer of subclasses.

This is precisely the [Decorator](../skills/decorator.md) pattern. A real failure from picking the
wrong direction: [A hundred subclasses for one feature](../case-studies/mot-tram-lop-con-cho-mot-tinh-nang.md).

## When inheritance is still right

The slogan "favor composition" often gets read as "inheritance is forbidden". Inheritance is the
right tool when **all three** of the following hold:

| Condition | How to check it |
|---|---|
| The relationship genuinely is "is a", and **substitutable** | Apply the Liskov test — see [SOLID](solid.md#l--liskov-substitution) |
| There is only **one** axis of variation | Count the axes: two or more means combinatorial explosion |
| The parent class is **stable**, rarely changing | Subclasses depend on the parent's implementation details; when the parent changes, they break |

An example of correct inheritance: `Exception` → `ArgumentException` → `ArgumentNullException`. One
axis, a tight "is a" relationship, and a parent class that essentially never changes.

An example of wrong inheritance: `NhanVien` → `NhanVienToanThoiGian` / `NhanVienBanThoiGian`. It sounds
reasonable right up to the day someone is simultaneously full-time, a manager, and a project
contractor — three axes, and nobody can change type at run time.

## Trade-offs

| What composition gains you | What you lose |
|---|---|
| The class count adds rather than multiplies | You have to write forwarding (delegation) code — wordier than inheritance |
| Composable at run time, configurable | The composition order becomes significant and **silent** when wrong |
| Depends only on the public API, not the parent's details | Debugging goes through several wrapping layers; deep stack traces |
| One constant in one place | You can't use `base.` to reuse the shared part |

That second row is Decorator's real trap: `new Cache(new Retry(x))` and
`new Retry(new Cache(x))` both compile, both run, and have **completely different semantics**.
See [Swapping the decorator order loses the cache](../case-studies/doi-thu-tu-decorator-mat-cache.md).

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Inheriting to **reuse code**, not to be substitutable | The subclass drags along methods that are meaningless for it |
| Building an inheritance tree for two axes of variation | Combinatorial explosion — 72 classes, as in the table above |
| Putting logic in the parent and letting subclasses `override` selectively | A subclass forgetting to call `base.` breaks silently; see [Template Method](../skills/template-method.md) |
| Composition, but wrapped too deeply (7–8 layers) | Nobody can follow the order; gather it into a factory that builds the standard configurations |
| Using a `protected` field in the parent class | Subclasses depend on implementation details — change the parent and every child breaks |

## FAQ

<details>
<summary>So is an interface a form of inheritance?</summary>

No, and this is a common confusion. **Implementation** inheritance (`class B : A`) drags along both `A`'s
code and its state. Implementing an **interface** (`class B : IA`) drags along only a contract, with no
code at all.

"Favor composition over inheritance" is about the first kind. Implementing several interfaces is
perfectly normal and causes no combinatorial explosion.

</details>

<details>
<summary>C# has <code>record</code> and <code>with</code> now — is composition still needed?</summary>

`with` solves the problem of **copying with modification**, not the problem of **adding behaviour**.
`espresso with { CoSua = true }` requires `IDoUong` to already have a `CoSua` field — meaning every
axis of variation has to be known at design time, exactly what composition avoids.

When the number of axes is fixed and small, a record + `with` really is tidier than a Decorator. When the
axes are open-ended (plugins, per-branch configuration), Decorator still wins.

</details>

<details>
<summary>Delegation is so verbose — does C# have a shorthand?</summary>

There are three levels:

1. **Primary constructors** (C# 12+) — exactly what the example above uses,
   `sealed class Sua(IDoUong g) : IDoUong`, with no separate field or constructor needed.
2. **Expression-bodied members** — `public decimal Gia() => g.Gia() + 8000m;` in one line.
3. **Default interface methods** for the shared forwarding part, if many decorators repeat
   the same forwarding.

There's no automatic delegation mechanism like Kotlin's `by`. That's a real cost, and a legitimate
reason to choose inheritance when there's only one axis.

</details>

<details>
<summary>How do I know how many axes of variation I have?</summary>

List the names of the existing subclasses and look for repeated parts in the names. `EspressoSua`,
`EspressoSuaDuong`, `AmericanoSua` — two groups of words (`Espresso|Americano` and
`Sua|Duong`) crossed with each other, and that's your two axes.

The quick rule: **if a subclass name shows traces of two different categories joined together, you
already have two axes.** At that point think about [Bridge](../skills/bridge.md) or
[Decorator](../skills/decorator.md).

</details>

## Related Topics

- [What a design pattern is](what-is-a-pattern.md) — why the GoF put this principle in chapter 1
- [SOLID](solid.md) — an LSP violation is usually a consequence of misplaced inheritance
- [Decorator](../skills/decorator.md) — the pattern that realises exactly this page's example
- [Bridge](../skills/bridge.md) — splitting two axes of variation into two independent trees
- [Strategy](../skills/strategy.md) — replacing `override` with a pluggable object
- [Coupling and cohesion](coupling-cohesion.md) — inheritance is the tightest form of coupling

## References

- GoF — *Design Patterns*, chapter 1, section 1.6 "Inheritance versus Composition"
- Joshua Bloch — *Effective Java*, "Favor composition over inheritance"
