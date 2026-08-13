---
title: SOLID — five principles, five runnable failures
sidebar_position: 2
description: "The five principles that most design patterns are a direct consequence of — each with a violation that produces a real bug, not a bare description."
tags: [solid, srp, ocp, lsp, isp, dip, oop]
domain: backend
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# SOLID — five principles, five runnable failures

> **Takeaway:** SOLID isn't five separate laws. All five serve exactly one goal:
> **narrowing the blast radius of a change**. Learning patterns before SOLID is learning the leaves;
> more than half the GoF patterns are just a concrete way of preserving **O** and **D**.

## Goal

Answer the question *"why is this code hard to change"* with five specific diagnoses instead of one
gut feeling. Each principle below comes with a snippet that **produces a real failure** — because
SOLID is taught with far too many metaphors, and you can't debug a metaphor.

## Overview

| Letter | Name | The diagnostic question | When the violation surfaces |
|---|---|---|---|
| **S** | Single Responsibility | For **how many different reasons** does this class change? | Changing the report format breaks the calculation |
| **O** | Open/Closed | Does adding a new type require **editing** old code? | A `switch` throwing in its `default` branch |
| **L** | Liskov Substitution | Replace the parent with the child — is the calling code still correct? | The test passes with the parent, fails with the child |
| **I** | Interface Segregation | Does an implementing class have to throw `NotSupported`? | A `NotSupportedException` at run time |
| **D** | Dependency Inversion | Does this class go and find its dependencies, or are they handed in? | You can't write a unit test at all |

**Read the table by its third column.** Those are five questions you can actually use in a code review;
the other three columns are just naming.

## Worked examples

All the code below lives in **one** file, run with `dotnet run 02-solid.cs` on
.NET 11.0.0. Each section has the violation and the fix, run side by side for direct comparison.

### S — Single Responsibility

**The violation:** one class both computes money and writes a file.

```csharp
sealed class HoaDonGopChung((decimal gia, int sl)[] dong)
{
    public decimal TinhVaXuat(string duong)
    {
        decimal t = 0;
        foreach (var d in dong) t += d.gia * d.sl;
        File.WriteAllText(duong, $"TONG: {t}");   // I/O mixed into the calculation
        return t;
    }
}
```

**The fix:** separate the calculation from the I/O.

```csharp
static class HoaDonTach
{
    public static decimal Tong((decimal gia, int sl)[] dong)
    {
        decimal t = 0;
        foreach (var d in dong) t += d.gia * d.sl;
        return t;
    }
}
```

```text
=== S — Single Responsibility ===
Tong (tinh chung voi I/O): 350,000
File duoc ghi ra chua? True  <- de test phep cong phai ghi file
Tong (tach): 350,000  — test duoc khong cham dia
```

The two numbers are equal. **What differs isn't the result, it's the price of verifying that
result.** The line `File duoc ghi ra chua? True` is the proof: to test the addition you're
forced to touch the disk, clean up files, and the test becomes slow and brittle.

The clearest way to state SRP isn't "one class does one thing" — that's too vague to
use. Robert Martin's original is: **"a class should have only one reason to change"**. The class
above has two: accounting changes the formula, and IT changes the file format.

### O — Open/Closed

**The violation:** adding a new shape requires editing the `switch`.

```csharp
decimal DienTichSwitch(object h) => h switch
{
    ChuNhat r => r.Rong * r.Cao,
    // forgot to add TamGiac
    _ => throw new NotSupportedException($"chua ho tro {h.GetType().Name}")
};
```

```text
=== O — Open/Closed ===
switch nem: NotSupportedException: chua ho tro TamGiac
da hinh: TamGiac = 12
```

**The compiler warns you about nothing at all.** The failure fires at run time, in production, with a
type whose author didn't know they had something to change. That is exactly what OCP exists to
block: *open for extension* (add a class), *closed for modification* (don't touch old code).

This is also the problem that [Factory Method](../skills/factory-method.md),
[Strategy](../skills/strategy.md) and [Visitor](../skills/visitor.md) solve in three different
directions.

### L — Liskov Substitution

The classic square / rectangle example. Mathematically a square **is** a rectangle,
so the inheritance sounds perfectly reasonable:

```csharp
class ChuNhat { public virtual int Rong { get; set; } public virtual int Cao { get; set; } public int DienTich => Rong * Cao; }

class Vuong : ChuNhat
{
    public override int Rong { get => base.Rong; set { base.Rong = value; base.Cao = value; } }
    public override int Cao  { get => base.Cao;  set { base.Rong = value; base.Cao = value; } }
}

void KiemTraDienTich(ChuNhat h)
{
    h.Rong = 5;
    h.Cao = 4;
    // expecting 20
}
```

```text
=== L — Liskov Substitution ===
ChuNhat  rong=5 cao=4 -> ky vong 20, thuc te 20  OK
Vuong    rong=5 cao=4 -> ky vong 20, thuc te 16  VI PHAM LSP
```

**20 and 16.** The function `KiemTraDienTich` takes a `ChuNhat`, knows nothing about `Vuong`, and is
still wrong. That's the definition of a Liskov violation: the child class **narrows** the parent's
contract (here: "setting `Rong` doesn't touch `Cao`").

The lesson isn't "don't use inheritance" but: **an "is a" relationship in mathematics
is not automatically a "substitutable for" relationship in code.** A parent's contract includes
things that aren't written in the method signatures.

### I — Interface Segregation

**The violation:** one fat interface, and a cheap printer forced to implement `Fax` too.

```csharp
interface IMayInDayDu { void In(string s); void Fax(string s); void Quet(string s); }

sealed class MayInGiaRe : IMayInDayDu
{
    public void In(string s) => Console.WriteLine($"in: {s}");
    public void Fax(string s) => throw new NotSupportedException("may nay khong co fax");
    public void Quet(string s) => throw new NotSupportedException("may nay khong co scanner");
}
```

```text
=== I — Interface Segregation ===
in: bao cao
nem luc chay: NotSupportedException: may nay khong co fax
```

**A `throw new NotSupportedException` inside a class implementing an interface is a sign ISP is being
violated, with almost no exceptions.** It says the interface describes an imaginary device rather
than the real devices.

The fix: split it into `IMayIn`, `IMayFax`, `IMayQuet`. A multifunction machine implements all three, a
cheap one implements one. At that point the *compiler* blocks calling `Fax` on a machine with no fax —
the error moves from runtime back to compile time.

Note that ISP is also a form of LSP violation: `MayInGiaRe` isn't substitutable for `IMayInDayDu`
everywhere. These five principles overlap much more than the way they're usually taught suggests.

### D — Dependency Inversion

**The violation:** a class fetching the system time itself.

```csharp
sealed class ChaoBuocCung
{
    public string Chao() => DateTime.Now.Hour < 12 ? "Chao buoi sang" : "Chao buoi chieu";
}
```

**The fix:** take the time source from outside.

```csharp
interface IDongHo { int Gio { get; } }
sealed class ChaoTiemPhuThuoc(IDongHo dh)
{
    public string Chao() => dh.Gio < 12 ? "Chao buoi sang" : "Chao buoi chieu";
}
```

```text
=== D — Dependency Inversion ===
Buoc cung DateTime.Now -> chao: "Chao buoi sang"  (doi theo gio chay may)
Tiem IDongHo 6h  -> chao: "Chao buoi sang"
Tiem IDongHo 20h -> chao: "Chao buoi chieu"
```

The first line is the frightening one: **its result depends on when you run it.** A test for
`ChaoBuocCung` will be green in the morning and red in the afternoon — and whoever hits it at 13:00 will
spend half an hour blaming the CI machine.

The two lines after it produce two different results **within the same program run**, because the
time source has become a parameter.

`DateTime.Now`, `Guid.NewGuid()`, `Random`, `Environment.MachineName`, and every network call are all
the same kind of hidden dependency. They're the most common reason for flaky tests.

## How SOLID relates to the GoF patterns

| Principle | Patterns that are an incarnation of it |
|---|---|
| **O** | [Strategy](../skills/strategy.md), [Factory Method](../skills/factory-method.md), [Decorator](../skills/decorator.md), [Visitor](../skills/visitor.md) |
| **D** | [Abstract Factory](../skills/abstract-factory.md), [Bridge](../skills/bridge.md), [Adapter](../skills/adapter.md) |
| **S** | [Command](../skills/command.md), [Mediator](../skills/mediator.md), [Facade](../skills/facade.md) |
| **I** | [Adapter](../skills/adapter.md), [Facade](../skills/facade.md) |
| **L** | No pattern "implements" L — it's a constraint on every use of inheritance |

This table explains why you should read this page **before** reading the 23 patterns: a pattern is a
*recipe*, SOLID is the *reason*.

## Trade-offs

| You gain | You lose |
|---|---|
| The blast radius of a change narrows | More files — SRP always produces more classes |
| Each piece is testable without infrastructure | You need a DI container, or a great many hand-passed parameters |
| Errors move from runtime back to compile time (I, O) | Types and interfaces proliferate; reading it the first time is slower |
| Swap an implementation without touching the caller (D) | One more file to jump to while debugging; longer stack traces |

**Where SOLID backfires:** one-off scripts, prototypes, and code that will have exactly one
implementation forever. Applying DIP to a 40-line `Main` is inventing work for yourself.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Reading SRP as "one class, one method" | Hundreds of one-method classes appear, and *cohesion* drops rather than rising |
| Building an interface for every class "to follow DIP" | `IOrderService` has exactly one `OrderService` — one more file to jump to, no extra capability |
| Treating inheritance as the default way to reuse | An L violation like the square example; see [Composition over inheritance](composition-over-inheritance.md) |
| Implementing an interface and then throwing `NotSupportedException` | An I violation; the error moves from compile time to runtime, the wrong direction |
| Using `DateTime.Now` in business logic | Tests that flake with the time of day, as in the D output above |
| Applying SOLID to code with no tests | Refactoring with no safety net — you change behaviour and nobody knows |

## FAQ

<details>
<summary>SRP says "one reason to change" — how do I count reasons?</summary>

Count by **person**, not by technique. Ask: *"who is going to ask for this class to be changed?"*

The `HoaDonGopChung` class above has two: accounting (changing the formula) and IT (changing the
file format). Two different people, two different change rhythms, two reasons. Split it.

If there's only one person and one rhythm, then even a class doing five things still has one reason to change.

</details>

<details>
<summary>How do I fix an LSP violation, other than dropping the inheritance?</summary>

Three directions, in order of preference:

1. **Drop the inheritance relationship.** Have `Vuong` and `ChuNhat` both implement `IHinh` with a `DienTich()`
   method, with neither inheriting from the other. This is the right answer in most cases.
2. **Make the parent immutable.** If `ChuNhat` has no setters the problem disappears — the LSP
   violation here arises from *mutation*, not from geometry.
3. **Loosen the parent's contract.** Document that "setting `Rong` may change `Cao`". Rarely workable,
   because it pushes the burden onto every caller.

</details>

<details>
<summary>Are DIP and Dependency Injection the same thing?</summary>

No. DIP is a **principle** (high-level modules shouldn't depend on low-level ones; both should depend
on an abstraction). DI is a **technique** for achieving it (handing dependencies in through the
constructor). A DI container is a **tool** for automating that technique.

You can follow DIP without any container — passing them by hand through the constructor in
`Program.cs` is enough, and for a small project that's the better choice.

</details>

<details>
<summary>Should I split interfaces down to one method each?</summary>

No. ISP says an interface must match **the caller's needs**, not that smaller is always
better. If every caller uses both `Doc` and `Ghi`, then an `IKho` combining the two is correct.

The test: does any implementing class have to throw `NotSupportedException`? If not, the interface
fits.

</details>

## Related Topics

- [What a design pattern is](what-is-a-pattern.md) — a pattern is the recipe, SOLID is the reason
- [Composition over inheritance](composition-over-inheritance.md) — the way out of an LSP violation
- [Coupling and cohesion](coupling-cohesion.md) — what SOLID is really optimising
- [Strategy](../skills/strategy.md) · [Factory Method](../skills/factory-method.md) — incarnations of O
- [Adapter](../skills/adapter.md) — an incarnation of D and I

## References

- Robert C. Martin — *Agile Software Development: Principles, Patterns, and Practices*
- Barbara Liskov — *Data Abstraction and Hierarchy* (1987), the source of the letter L
