---
title: Bridge
sidebar_position: 7
description: "Two axes of variation split into two independent trees — 8 reports × 6 formats is 48 classes with inheritance, 14 with a bridge."
tags: [bridge, structural, gof, composition]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Bridge

> **Takeaway:** When subclass names combine **two categories** (`DoanhThuPdf`, `TonKhoExcel`), you
> have two axes of variation inside one inheritance tree. Bridge splits them into two trees and
> links them with a reference — `n × m` classes become `n + m`.

## Goal

Block a combinatorial explosion **before it happens**, in cases where the problem's structure already
reveals two independent dimensions from the start.

## The original intent (GoF)

Decouple an abstraction from its implementation, so the two can vary independently.

That phrasing is hard to use. The usable version: **find two nouns in the subclass names.**

```text
DoanhThuPdf     →  {DoanhThu, TonKho, CongNo} × {Pdf, Excel, Csv}
TonKhoExcel        └── truc "noi dung"          └── truc "dinh dang"
```

Those two axes don't depend on each other: adding a format has nothing to do with the report content, and
vice versa. That's the necessary condition for Bridge to make sense.

## Worked example — reports × export formats

Run with `dotnet run 12-bridge.cs` on .NET 11.0.0.

### Before — one class per combination

```csharp
abstract class BaoCaoKeThua { public abstract string Xuat(); }

sealed class DoanhThuPdf   : BaoCaoKeThua { public override string Xuat() => "%PDF <doanh thu>"; }
sealed class DoanhThuExcel : BaoCaoKeThua { public override string Xuat() => "PK.. <doanh thu>"; }
sealed class TonKhoPdf     : BaoCaoKeThua { public override string Xuat() => "%PDF <ton kho>"; }
sealed class TonKhoExcel   : BaoCaoKeThua { public override string Xuat() => "PK.. <ton kho>"; }
```

```text
=== Truoc: moi to hop mot lop ===
  DoanhThuPdf        -> %PDF <doanh thu>
  DoanhThuExcel      -> PK.. <doanh thu>
  TonKhoPdf          -> %PDF <ton kho>
  TonKhoExcel        -> PK.. <ton kho>
  So lop: 4
```

Note that the string `"%PDF "` appears in **two** classes. The PDF packaging logic is duplicated — and
with a third report it becomes three copies.

### After — the content plugs into the exporter

```csharp
interface IBoXuat { string Boc(string noiDung); }
sealed class XuatPdf   : IBoXuat { public string Boc(string n) => $"%PDF <{n}>"; }
sealed class XuatExcel : IBoXuat { public string Boc(string n) => $"PK.. <{n}>"; }

abstract class BaoCao(IBoXuat bo)
{
    protected IBoXuat Bo => bo;              // <- this is the "bridge"
    public abstract string Xuat();
}
sealed class BaoCaoDoanhThu(IBoXuat bo) : BaoCao(bo) { public override string Xuat() => Bo.Boc("doanh thu"); }
sealed class BaoCaoTonKho(IBoXuat bo)   : BaoCao(bo) { public override string Xuat() => Bo.Boc("ton kho"); }
```

```text
=== Sau: noi dung cam vao bo xuat ===
  BaoCaoDoanhThu     -> %PDF <doanh thu>
  BaoCaoDoanhThu     -> PK.. <doanh thu>
  BaoCaoTonKho       -> %PDF <ton kho>
  BaoCaoTonKho       -> PK.. <ton kho>
  So lop: 6
```

**At 2×2 scale, Bridge has more classes (6 versus 4).** This needs saying plainly: with two axes of two
values each, Bridge *loses*. It only pays off from 3×3 upwards.

### Where it does pay off

```text
n bao cao x m dinh dang      ke thua    bridge
----------------------------------------------
2 x 2                              4         4
3 x 3                              9         6
5 x 4                             20         9
8 x 6                             48        14
```

(The "bridge" column is `n + m`; the "inheritance" column is `n × m`.)

### Adding one format and one report

```text
=== Them mot dinh dang (CSV) va mot bao cao (Cong no) ===
  csv: cong no
  csv: doanh thu
  %PDF <cong no>
```

Add `XuatCsv` (1 class) and `BaoCaoCongNo` (1 class) — two classes — and immediately you have **6**
usable combinations. With inheritance, six combinations means six hand-written classes.

### Before and after

| | Combinatorial inheritance | Bridge |
|---|---|---|
| Classes at 8 × 6 | 48 | 14 |
| The PDF packaging logic lives in | 8 classes | 1 class |
| Adding a 7th format | +8 classes | +1 class |
| Choosing the format at run time | no — combinations are fixed | yes |
| Classes at 2 × 2 | 4 | 6 |
| Reading it the first time | flat, all visible at once | you must follow a reference into the other tree |

The full failure case:
[A hundred subclasses for one feature](../case-studies/mot-tram-lop-con-cho-mot-tinh-nang.md).

## Bridge and Strategy look identical

Both are "plug one object into another object". They differ in **intent**, and the intent decides
when you come to recognise you need them:

| | Bridge | [Strategy](strategy.md) |
|---|---|---|
| When you recognise it | At **design** time — you see the two axes coming | At **editing** time — you see an `if` chain choosing an algorithm |
| The plugged-in part is | A whole implementation system, usually with several methods | One algorithm, usually one method |
| Does it change at run time | Usually not — chosen once at construction | Yes, that's the point |
| The abstraction side | Has its own inheritance tree, rich in logic | Usually just one context class |

In practice the boundary is blurry, and that **doesn't matter** — both lead to the same code. What
matters is recognising there are two axes.

## When NOT to use it

| Situation | Why |
|---|---|
| There's only one axis of variation | Ordinary inheritance or Strategy is enough; Bridge adds a useless layer |
| Two axes but one has exactly **one** value | Wait until there's a second value — the Rule of Three |
| 2×2 scale with no growth expected | 6 classes versus 4; a net loss |
| The two axes **depend on each other** (some combinations are meaningless) | Bridge permits every combination; forbidden ones have to be blocked at run time |

That last row is notable: if `BaoCaoLuong` **must not** be exported as CSV, Bridge can't express that
constraint — you have to check at run time, and the compiler loses its ability to help.

## Trade-offs

| You gain | You lose |
|---|---|
| `n + m` classes instead of `n × m` | At small scale, more classes |
| Each axis varies independently; two people edit two different files | One reference to follow while reading |
| Choosing the combination at run time | Invalid combinations aren't blocked by the compiler |
| The implementation (the exporter) is reusable elsewhere | You have to get the bridging interface right from the start |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Applying Bridge when there's only one axis | A redundant layer, and the second axis may never appear |
| A bridging interface that's too wide (exposing one implementation's details) | Other implementations must throw `NotSupported` — a violation of [ISP](../reference/solid.md#i--interface-segregation) |
| Letting the abstraction side know the implementation's concrete type | The bridge is nullified; you're back to tight coupling |
| Confusing Bridge with Adapter | Adapter is firefighting for an existing API; Bridge is deliberate design |
| Using Bridge for two interdependent axes | It produces meaningless combinations with nothing to block them |

## FAQ

<details>
<summary>How do I know I have two axes rather than one?</summary>

Write out every subclass name and look for the repeated parts:

```text
DoanhThuPdf, DoanhThuExcel, TonKhoPdf, TonKhoExcel
```

Two groups of words (`DoanhThu|TonKho` and `Pdf|Excel`) crossed **completely** means two axes. If you only
have `DoanhThuPdf` and `TonKhoExcel` without the other two combinations, they may genuinely
depend on each other — check with the business before splitting.

</details>

<details>
<summary>What about three axes?</summary>

Bridge nested in Bridge: `BaoCao` → `IBoXuat` → `INenLuuTru`. It works, but three layers of indirection
is the threshold where most readers give up.

With three axes or more, consider moving to a **data** model: one configuration object describing the
combination, and one execution function reading that configuration. Fewer classes, and the combination
becomes something you can validate as data.

</details>

<details>
<summary>Does C# need an abstract <code>BaoCao</code> class, or is an interface enough?</summary>

An interface is enough when the abstraction side has no shared code. An abstract class earns its cost when
there really is a shared part (say pagination or numbering logic) that every report needs.

The example above uses an `abstract class` to keep the `Bo` reference in one place. If that's the only such
line, a primary constructor on each class is enough too.

</details>

## Related Topics

- [Composition over inheritance](../reference/composition-over-inheritance.md) — the same problem, seen from the principle
- [Strategy](strategy.md) — the same shape, a different intent
- [Abstract Factory](abstract-factory.md) — often used to create the right (abstraction, implementation) pair
- [Adapter](adapter.md) — firefighting for an existing API, not deliberate design
- [Decorator](decorator.md) — also wraps, but with the same interface and stackable

## References

- GoF — *Design Patterns*, Bridge
