---
title: Coupling and cohesion — the metric patterns actually serve
sidebar_position: 4
description: "Fan-out is countable by reflection and by the number of test doubles you have to build — one concrete number instead of the feeling that this code is messy."
tags: [coupling, cohesion, fan-out, testing, refactoring]
domain: backend
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Coupling and cohesion — the metric patterns actually serve

> **Takeaway:** Every GoF pattern is buying **low coupling** by paying in **a high class count**.
> Know how to measure coupling and you know whether you're getting a good deal. The cheapest and most
> honest measure: **the number of constructor dependencies** — which is also exactly the number of
> test doubles you'll have to build.

## Goal

Replace *"this code is messy"* with a checkable number, so that an argument in a code review has
somewhere to end.

## Overview

Two opposing concepts, measuring two different things:

| | Coupling | Cohesion |
|---|---|---|
| What it measures | **How many** other classes this class knows | Whether the parts inside a class **belong together** |
| You want | Low | High |
| The symptom when wrong | Change one place, five break | Classes named `Manager`, `Helper`, `Utils` |
| Measured by | Fan-out, fan-in | Which field is used by which method |

**They don't trade off against each other.** High cohesion usually *brings about* low coupling — a
class doing exactly one thing needs fewer things. The real trade-off is between coupling and the
**number of classes**.

## Worked example — splitting up a god class

Run with `dotnet run 04-coupling.cs` on .NET 11.0.0.

### Before — one class doing everything

```csharp
sealed class DichVuDonHangGop(
    IKhoHang kho, IThanhToan tt, IGuiMail mail, IGuiSms sms,
    IGhiLog log, IDoiTien doi, IKhoDonHang khoDon)
{
    public void DatHang(string sku, int sl, decimal tien) { }
    public void HuyHang(string ma) { }
    public void HoanTien(string ma) { }
}
```

### After — split by reason to change

```csharp
sealed class DatHangUseCase(IKhoHang kho, IThanhToan tt, IKhoDonHang khoDon)
{
    public void ThucThi(string sku, int sl, decimal tien) { }
}

sealed class GuiThongBaoSauDatHang(IGuiMail mail, IGuiSms sms)
{
    public void ThucThi(string ma) { }
}
```

### Measuring fan-out by reflection, not by hand

```csharp
int FanOut(Type t)
{
    var ctor = t.GetConstructors().OrderByDescending(c => c.GetParameters().Length).First();
    return ctor.GetParameters().Select(p => p.ParameterType).Distinct().Count();
}
```

```text
DichVuDonHangGop           fan-out = 7   [IKhoHang, IThanhToan, IGuiMail, IGuiSms, IGhiLog, IDoiTien, IKhoDonHang]
DatHangUseCase             fan-out = 3   [IKhoHang, IThanhToan, IKhoDonHang]
GuiThongBaoSauDatHang      fan-out = 2   [IGuiMail, IGuiSms]
```

**7 versus 3.** This number isn't an aesthetic matter — it's exactly the number of mocks you must build
to write a unit test for that class. A test for `DichVuDonHangGop` starts with seven lines of
`Substitute.For<...>()` before touching a single meaningful line.

### Measuring the blast radius of a change

The real question in a review: *"if I change `IKhoHang`'s signature, how many classes do I have to edit?"*

```csharp
var canSua = new[] { typeof(DichVuDonHangGop), typeof(DatHangUseCase), typeof(GuiThongBaoSauDatHang) }
    .Where(t => TenPhuThuoc(t).Contains(nameof(IKhoHang))).Select(t => t.Name).ToArray();
```

```text
Doi chu ky IKhoHang -> so lop phai sua:
  2 lop: DichVuDonHangGop, DatHangUseCase
```

This is `IKhoHang`'s **fan-in** — the number of classes depending on it. High fan-in isn't bad (a good
abstraction gets used in many places), but it tells you how expensive changing that interface is.

### Before and after

| | `DichVuDonHangGop` | After splitting |
|---|---|---|
| Fan-out | 7 | 3 and 2 |
| Mocks needed for one test | 7 | 3 |
| Change how SMS is sent → which class do I edit | the class holding the order logic too | the class that only sends notifications |
| Tests to re-run when SMS changes | every order, cancellation and refund test | only the notification tests |
| Class count | 1 | 2 |

That last row is the price. **Buying low coupling with a high class count** — and that is the entire
economic model of design patterns.

A concrete failure from letting fan-out drift freely:
[A facade bloating into a god object](../case-studies/facade-phinh-thanh-god-object.md).

## A diagnostic table by the numbers

The thresholds below are experience, not law — use them to **start a conversation**, not to
block a merge.

| Fan-out | Reads as |
|---|---|
| 0–2 | Normal |
| 3–4 | Still fine if the dependencies are all in the same layer |
| 5–7 | Worth asking: how many reasons does this class have to change? |
| 8+ | Almost certainly a god class, or a composition root in the wrong place |

A legitimate exception for high fan-out: the **composition root** (`Program.cs`, the DI module) exists
precisely to know about everything. Don't split it up.

## Seven levels of coupling, loosest to tightest

Ordered so that the further down, the harder to undo:

| Level | Meaning | C# example |
|---|---|---|
| **Data** | Passing exactly the data needed | `Tinh(decimal gia, int sl)` |
| **Stamp** | Passing a whole object but using only a few fields | `Tinh(DonHang d)` that only reads `d.Tien` |
| **Control** | Passing a flag that controls the other side's branching | `Xuat(bool laPdf)` |
| **Common** | Both writing to global state | mutable `static`, [Singleton](../skills/singleton.md) |
| **Content** | Reaching into another class's guts | a `protected` field, reflection into private |

**The first three levels are fixable by changing a method signature.** The last two require a design
change — and `Singleton` sitting at the fourth level is why it's considered an anti-pattern in most contexts.
The failure case: [Tests green alone, red together](../case-studies/test-xanh-rieng-do-chung.md).

## Cohesion — measured by "which field which method uses"

There's no built-in .NET tool measuring LCOM, but the by-eye test is cheap:

1. List the class's fields.
2. For each method, mark the fields it touches.
3. If it splits into **two disjoint groups**, those are two classes glued together.

```text
class BaoCao
  field: dbConn, cache          method: LayDuLieu()    -> dbConn, cache
  field: mau, fontChu           method: VeBieuDo()     -> mau, fontChu
                                method: XuatPdf()      -> mau, fontChu
```

Two completely disjoint groups — `BaoCao` is two classes: one fetching data, one presenting it. This is
also SRP seen from a measurement angle; see [SOLID](solid.md#s--single-responsibility).

**The class name is the earliest indicator.** `OrderManager`, `DataHelper`, `Utils`, `CommonService`
— names that can't say what the class *does*, usually because it does several unrelated things.

## Trade-offs

| What lowering coupling gains you | What you lose |
|---|---|
| The blast radius of a change narrows | More classes, more files |
| Fast tests with fewer mocks | You need DI, and wiring at the composition root |
| Swap an implementation without touching the caller | One more file to jump to while debugging |
| Parallel work across the team gets easier | Newcomers take longer to build a mental map of the whole |

**Where lowering coupling backfires:** when two classes *genuinely* always change together. Forcing them
through an interface only creates an illusion of independence — every change still touches both, plus
the interface.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Lowering coupling by adding an interface for every class | Fan-out doesn't drop, you've only added a layer of indirection |
| Counting fan-out while ignoring `static` and singletons | Hidden dependencies don't appear in the constructor — and those are the most dangerous kind |
| Merging several small classes "to tidy up" | Cohesion drops; the new class has two reasons to change |
| Passing a `bool` flag that controls internal branching | Control coupling — the caller has to know the internal logic |
| Using events to "lower coupling" between two things that always go together | The execution flow disappears from the code; you debug by guessing |

## FAQ

<details>
<summary>Fan-out of 7, but they're all interfaces — is that OK?</summary>

It's still 7 things you have to understand to read that class, and still 7 mocks in the test. An interface
lowers the **level** of coupling (from content down to data), not the **amount** of coupling.

Two different questions: *"how tightly do I depend"* (interfaces help) and *"how many things do I depend
on"* (only splitting the class helps).

</details>

<details>
<summary>My composition root has a fan-out of 40 — how do I fix that?</summary>

You don't. That's the **one** place that should know about everything, because it exists to do the wiring.
Splitting it into several registration modules (`AddDonHang()`, `AddThanhToan()`) is fine, but that's a
file-organisation matter, not a coupling matter.

The thresholds in the table above apply to **business** classes, not to wiring infrastructure.

</details>

<details>
<summary>Can coupling be measured automatically in a .NET project?</summary>

There are a few directions, none of them completely free:

- **A hand-written Roslyn analyzer** — counting referenced types per file, the most accurate.
- **NDepend** — has fan-in/fan-out metrics built in, commercial.
- **Runtime reflection** as in this page's example — only sees dependencies through the constructor,
  missing `static` and `new` inside methods. Cheap, and enough to start a conversation.

The third approach's blind spot is the thing worth remembering: **the most dangerous dependency is the
one that doesn't appear in the signature.**

</details>

## Related Topics

- [SOLID](solid.md) — SRP is cohesion, DIP is coupling, seen from the principles angle
- [What a design pattern is](what-is-a-pattern.md) — patterns buy low coupling with a class count
- [Facade](../skills/facade.md) — lowers the **caller's** fan-out, not the system's
- [Mediator](../skills/mediator.md) — turns n×n relationships into n, and the trap that comes with it
- [Singleton](../skills/singleton.md) — common coupling, the fourth level in the table above
- [Composition over inheritance](composition-over-inheritance.md) — inheritance is the tightest coupling

## References

- Larry Constantine — *Structured Design* (1974), the origin of the seven-level coupling scale
- Robert C. Martin — *Clean Architecture*, the "Component Coupling" section
