---
title: Facade
sidebar_position: 10
description: "One entrance to a multi-step subsystem — cutting the caller's fan-out from 5 to 1, and the trap is the facade bloating into a god object."
tags: [facade, structural, gof, coupling]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Facade

> **Takeaway:** A facade lowers the **caller's** fan-out, not the system's complexity — the complexity
> only moves. It's worth building when several callers repeat the same sequence; it becomes a burden when
> it turns into the single entrance for everything.

## Goal

Block the situation where every call site has to remember *"call these 5 subsystems in exactly this
order"* — and each site remembers it wrong in its own way.

## The original intent (GoF)

Provide a unified interface to a set of interfaces in a subsystem. Facade defines a higher-level
interface that makes the subsystem **easier to use**.

Note the words "easier to use", not "completely hidden". A facade does **not forbid** direct access to
the subsystem — that's the core difference from an encapsulation layer.

## Worked example — placing an order across 5 subsystems

Run with `dotnet run 15-facade.cs` on .NET 11.0.0.

### Before — the caller assembles it itself

```csharp
log.Ghi("bat dau");
if (!kho.Giu("SP-01", 2)) Console.WriteLine("  het hang");
var maGd = tt.Tru("KH-9", 600_000m);
var maVd = vc.Dat("KH-9", "SP-01", 2);
kho.ChotGiu("SP-01", 2);
mail.Gui("kh9@example.com", $"don da dat, van don {maVd}");
log.Ghi("xong");
```

```text
=== Truoc: nguoi goi phai biet 5 lop va dung thu tu ===
  ket qua: gd=GD-1001 vd=VD-77
  Fan-out cua nguoi goi: 5 he con, 7 loi goi, thu tu bat buoc
```

Seven calls, and **the order is mandatory but expressed nowhere at all**: reserving the stock has to come
before charging the payment, and confirming the reservation has to come after booking the shipment. The
second caller will swap two lines, and nothing will warn them.

### After — one entrance

```csharp
sealed class CuaDatHang(HeKho kho, HeThanhToan tt, HeVanChuyen vc, HeMail mail, HeLog log)
{
    public string DatHang(string kh, string sku, int sl, decimal tien, string email)
    {
        log.Ghi("bat dau");
        if (!kho.Giu(sku, sl)) throw new HetHangException($"het hang: {sku}");
        var maGd = tt.Tru(kh, tien);
        var maVd = vc.Dat(kh, sku, sl);
        kho.ChotGiu(sku, sl);
        mail.Gui(email, $"don da dat, van don {maVd}");
        log.Ghi("xong");
        return $"gd={maGd} vd={maVd}";
    }
}
```

```text
=== Sau: mot cua vao ===
  ket qua: gd=GD-1001 vd=VD-77
  Fan-out cua nguoi goi: 1 he con, 1 loi goi
```

```text
=== Do fan-out bang reflection ===
  CuaDatHang: nhan 5 he con, lo ra 1 method cong khai
```

**5 in, 1 out.** That's the shape of a healthy facade: many dependencies, little surface.
See [coupling and cohesion](../reference/coupling-cohesion.md) for why a fan-out of 5 is acceptable
here — it's composition, not a god class.

### A facade can't hide the subsystem's errors

```text
=== Facade KHONG giau duoc loi cua he con ===
  nem: HetHangException: het hang: SP-01
```

This is a commonly misunderstood point. A facade simplifies **how you call**, it doesn't make the subsystem
error-free. A facade swallowing errors to "look simple" repeats exactly the mistake of
[an adapter swallowing errors](adapter.md#an-adapter-that-swallows-errors--the-most-common-way-to-write-it-and-wrong).

### Before and after

| | The caller assembling it | Facade |
|---|---|---|
| The caller's fan-out | 5 | 1 |
| Number of calls | 7 | 1 |
| The order of the steps | each call site remembers it | one single place |
| Adding a step (recording loyalty points) | edit every call site | edit 1 place |
| Can still call the subsystems directly | — | **yes**, and that's a characteristic, not a defect |
| Class count | 5 | 6 |

## A facade is not an encapsulation layer

This distinction matters because the two get conflated:

| | Facade | Encapsulation layer |
|---|---|---|
| Direct subsystem access | Permitted | Blocked (`internal`, module boundaries) |
| Purpose | Convenience for the common case | Protecting business invariants |
| The rare case | The caller drops down to the subsystem | You must add a method to the layer |

**A facade is a convenience, not a law.** If you *need* to forbid direct access (say, to guarantee every
stock deduction writes an audit record), a facade isn't enough — you have to use the language's visibility
and module boundaries.

## The trap — the facade bloating into a god object

A facade starts with 1 method. Six months later it has 30, because every new feature "just adds a method
to the entrance for convenience".

| Sign | The worrying threshold |
|---|---|
| Public method count | Above ~7 |
| Number of subsystems depended on | Above ~7 |
| Any method called from exactly one place | It isn't a "common case" — it doesn't belong on the facade |
| A class name with `Manager`, `Service`, `Helper` and no business noun | You're grouping by layer, not by use case |

**The cure: split by use case, not by subsystem.** `CuaDatHang`, `CuaHuyDon`,
`CuaHoanTien` — each with a fan-out of 2–4, each with one reason to change. That's also
[SRP](../reference/solid.md#s--single-responsibility) applied to a facade.

The full failure case: [A facade bloating into a god object](../case-studies/facade-phinh-thanh-god-object.md).

## When NOT to use it

| Situation | Why |
|---|---|
| The subsystem is 1–2 classes and the sequence is obvious | The facade just forwards — a redundant layer |
| There's only **one** call site | The sequence already lives in exactly one place |
| Every caller needs a different sequence | The facade will grow flag parameters; see [Command](command.md) |
| You need to *forbid* direct subsystem access | A facade can't forbid — use module boundaries |

## Trade-offs

| You gain | You lose |
|---|---|
| The caller's fan-out drops sharply | One more class; the complexity moves rather than disappearing |
| The step sequence has exactly one owner | A facade easily bloats into a god object |
| Changing the subsystems doesn't affect callers | The facade becomes a bottleneck: every change goes through it |
| The common case is one tidy line | The rare case has to drop to the subsystem — two entrances coexist |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Letting the facade swallow the subsystem's exceptions | Errors become "did nothing at all"; see [Adapter](adapter.md) |
| Stuffing business logic into the facade | The facade becomes a place holding business rules that nobody thinks to look in |
| One facade for the whole application | A god object; fan-out 20+, and every change touches it |
| Adding flag parameters to serve several variants | Control coupling; `DatHang(..., bool guiMail, bool tinhDiem)` |
| A facade calling a facade calling a facade | Three forwarding layers, none of which adds value |
| Treating the facade as the only way to use the subsystem, then being surprised when someone calls directly | A facade doesn't forbid; if you need to forbid, use `internal` |

## FAQ

<details>
<summary>How does Facade differ from Adapter?</summary>

An adapter changes the **shape** of one API to fit what you need — the target interface is dictated by
somebody else. A facade creates a **new, simpler** interface of your own invention, standing in front of
several things.

The test: remove the intermediate class and the caller can still write one line (only with a different
name) → Adapter. They'd have to write seven lines → Facade.

</details>

<details>
<summary>Should a facade be an interface?</summary>

Yes, if you need to replace it with a fake in the calling class's tests. No, if the facade is only a place
to gather the sequence and your tests target it directly.

Don't create `ICuaDatHang` just because "there must be an interface" — with exactly one implementation
that's one redundant file to jump to; see
[when not to use a pattern](../reference/what-is-a-pattern.md#when-not-to-use-a-pattern).

</details>

<details>
<summary>Are a facade and a use case / application service the same thing?</summary>

Very close, and in Clean Architecture they usually coincide: an application service
coordinates several things to complete one use case, exactly like a facade.

The difference is the **rule for dividing them up**. A GoF facade groups by *subsystem*; a use case groups by
*what the user wants to do*. The second resists bloat far better — because the number of use cases has a
natural limit, whereas "everything related to orders" does not.

</details>

## Related Topics

- [Adapter](adapter.md) — changes one API's shape, doesn't hide several APIs
- [Mediator](mediator.md) — also stands in the middle, but two-way and the parties know about it
- [Coupling and cohesion](../reference/coupling-cohesion.md) — fan-out, and the god-object threshold
- [SOLID](../reference/solid.md) — SRP is what stops a facade bloating
- [Command](command.md) — when every caller needs a different sequence

## References

- GoF — *Design Patterns*, Facade
