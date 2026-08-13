---
title: Builder
sidebar_position: 4
description: "A constructor with many same-typed parameters still compiles when two are swapped — 183 sheets of paper become 242, with no warning at all."
tags: [builder, creational, gof, fluent-api]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Builder

> **Takeaway:** Builder buys two things a constructor doesn't give you: **a name for each parameter**
> and **one place to cross-check before the object comes into existence**. If you only need the first,
> C# already has object initializers with `required` — much cheaper.

## Goal

Block two failures of a many-parameter constructor:

1. **Swapping two same-typed parameters** — compiles cleanly, runs wrong.
2. **The object coming into existence in an invalid state** — because nowhere checks the combination of
   parameters.

## Worked example — a document print order

Run with `dotnet run 09-builder.cs` on .NET 11.0.0.

### Before — a 6-parameter constructor, 4 of them the same `int` type

```csharp
sealed class DonInCu(string tep, int soTrang, int soBan, int tuTrang, bool haiMat, bool mauSac)
{
    public int SoToGiay() => (int)Math.Ceiling(soTrang / (haiMat ? 2.0 : 1.0)) * soBan;
}
```

Calling it correctly, and with two parameters swapped:

```csharp
var dung = new DonInCu("bao-cao.pdf", 121, 3, 1, true, false);
var nham = new DonInCu("bao-cao.pdf", 3, 121, 1, true, false);   // swapped soTrang <-> soBan
```

```text
=== Truoc: constructor 6 tham so, 4 cai cung kieu int ===
  y dinh : tep=bao-cao.pdf soTrang=121 soBan=3 tuTrang=1 haiMat=True mau=False
  go nham: tep=bao-cao.pdf soTrang=3 soBan=121 tuTrang=1 haiMat=True mau=False
  Trinh bien dich bao gi? khong gi ca — ca hai deu hop le
  So to giay: dung=183  nham=242
```

**183 sheets of paper become 242**, with not one warning. With `bool` it's worse still — `true, false`
and `false, true` look so alike that a code review misses them too.

### After — a builder, where each step has a name

```csharp
sealed class DonInBuilder(string tep)
{
    private int _soTrang = -1, _soBan = 1;
    private bool _haiMat, _mau;

    public DonInBuilder SoTrang(int n)   { _soTrang = n; return this; }
    public DonInBuilder SoBan(int n)     { _soBan = n; return this; }
    public DonInBuilder MatTruocSau()    { _haiMat = true; return this; }
    public DonInBuilder InMau()          { _mau = true; return this; }

    public DonIn Build()
    {
        if (_soTrang < 0) throw new InvalidOperationException("chua khai SoTrang");
        if (_soBan <= 0) throw new ArgumentOutOfRangeException(nameof(_soBan), "SoBan phai >= 1");
        return new DonIn { Tep = tep, SoTrangIn = _soTrang, SoBanIn = _soBan, HaiMat = _haiMat, MauSac = _mau };
    }
}
```

```text
=== Sau: builder, moi buoc co ten ===
  tep=bao-cao.pdf soTrang=121 soBan=3 haiMat=True mau=False
  So to giay: 183
```

Swapping `SoTrang` and `SoBan` is now inexpressible — the method name *is* the parameter
name.

### `Build()` is where the mandatory checks go

```text
=== Build() la cho kiem tra bat buoc ===
  nem: InvalidOperationException: chua khai SoTrang
  nem: ArgumentOutOfRangeException: SoBan phai >= 1 (Parameter '_soBan')
```

This is the value an object initializer **doesn't** have: one single point that sees the whole state,
running after every step has been called. A cross-check like *"if `HaiMat` then `SoTrang` must be
even"* can only go here.

### But C# already has half the solution

```csharp
var qua2 = new DonIn { Tep = "bao-cao.pdf", SoTrangIn = 121, SoBanIn = 3, HaiMat = true, MauSac = false };
```

```text
=== C# co san: object initializer + required ===
  tep=bao-cao.pdf soTrang=121 soBan=3 haiMat=True mau=False   <- du cho truong hop khong can kiem tra cheo
```

`required string Tep` forces an assignment — the compiler blocks it when missing. Every property
has its name right at the call site. **For most cases this is the right answer, not
Builder.**

### A selection table

| Need | The cheapest way |
|---|---|
| Just names for the parameters | An object initializer |
| A few fields must be present | `required` — checked at **compile time** |
| Cross-checks between fields | A builder with `Build()`, or validation in the constructor |
| Built over several steps, in different places in the code | Builder |
| The same builder producing several *representations* (HTML/PDF from one description) | Pure GoF Builder, with a `Director` |
| An immutable object, complex configuration, reusing a base configuration | Builder |

The second-to-last row is the original GoF version, rare in application code. The most common one in .NET
is the last row: `WebApplication.CreateBuilder(args)`, `new DbContextOptionsBuilder()`,
`new HttpRequestMessage` with a chain of `.With...()`.

## When NOT to use it

| Situation | Why |
|---|---|
| Fewer than 4 parameters, of different types | The constructor reads directly and can't be confused |
| No cross-checks at all | `required` + an object initializer does it all with far less code |
| The object can be modified after creation | A builder only earns its cost when the result is immutable; otherwise just assign properties |
| Purely to "look professional" | Twice the code for the same object |

## Trade-offs

| You gain | You lose |
|---|---|
| Every value has a name at the call site | Twice the writing: one method per field |
| One place to cross-check before the object exists | "Missing field" errors move from compile time to runtime |
| The target object stays immutable | The builder itself has mutable state — don't share it across threads |
| Built up gradually across several functions and classes | The reader has to find `Build()` to see what a complete object looks like |

**That second row is a notable trade-off in the opposite direction:** `required` catches errors at
compile time, `Build()` at run time. Builder only wins when the validation rule is more complex than
"must be present".

## Common Mistakes

| Mistake | Consequence |
|---|---|
| No `Build()`, returning the object under construction directly | You lose the checking point — a half-built object escapes |
| `Build()` returning the same instance on every call | Two places thinking they have their own object share one; editing one changes the other |
| Sharing a builder across threads | The internal state races and the objects come out mixed up |
| Methods returning `void` instead of `this` | You lose the call chain — which is most of the reason for using a builder |
| Using a builder for a 3-field object | Twice the code, nothing bought |
| Copying default values into both the builder and the target class | Two sources of truth, drifting apart without your noticing |

## FAQ

<details>
<summary>Can Builder and a record's <code>with</code> be used together?</summary>

They can, and it's the tidiest combination when you need "take the standard configuration and change a few
things":

```csharp
var chuan = CauHinhChuan();          // record bat bien
var rieng = chuan with { SoBan = 5 };
```

Builder comes in when the construction needs several conditional steps (`if (coLogo) b.ThemLogo()`) —
`with` can't express that flow concisely.

Note that `with` is a **shallow** copy — see [Prototype](prototype.md).

</details>

<details>
<summary>Should the builder be nested inside the target class (<code>DonIn.Builder</code>)?</summary>

Yes, if the builder is only used to construct that class. The real benefit: the builder is allowed to touch
the target's `private` setters, so the target doesn't need public `init` accessors — nobody
outside the builder can construct a half-built object.

What you lose is a longer file and two classes that must change together.

</details>

<details>
<summary>The original GoF Builder has a <code>Director</code> — do I need it?</summary>

Rarely. A `Director` exists to reuse the **construction sequence** across several different
builders: the same "read the description → build the header → build the body → build the footer" sequence
applied to `BuilderHtml` and `BuilderPdf`.

If there's only one output representation, the `Director` is a class doing nothing but calling a few
methods in order. Drop it.

</details>

## Related Topics

- [Prototype](prototype.md) — cloning an already-built object instead of rebuilding from scratch
- [Factory Method](factory-method.md) — choosing *which class*, not building over *several steps*
- [Abstract Factory](abstract-factory.md) — a family of objects, not one complex object
- [Composite](composite.md) — a builder is often used to construct a composite tree
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the symptom lookup table

## References

- GoF — *Design Patterns*, Builder
- Joshua Bloch — *Effective Java*, "Consider a builder when faced with many constructor parameters"
