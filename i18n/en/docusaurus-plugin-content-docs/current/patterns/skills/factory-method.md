---
title: Factory Method
sidebar_position: 2
description: "Gather the decision of which class to new into one place — because two parallel switches drift apart sooner or later, and the output below shows how."
tags: [factory-method, creational, gof, open-closed]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Factory Method

> **Takeaway:** The problem isn't the `switch` — the problem is the **second** `switch` on the same
> type code, in a different file, edited by a different person. A factory gathers the "what do we
> create" decision into one place so a second one can't exist.

## Goal

Block *shotgun surgery*: adding a new type means remembering to edit exactly seven places, and the
person adding the type doesn't know where those seven places are.

## The original intent (GoF)

Define an interface for creating an object, but let subclasses decide which class gets created.

In modern C#, the original GoF form (an abstract parent + `override CreateProduct()`) is far less
common than two pragmatic variants:

| Variant | Shape | Use when |
|---|---|---|
| **Static factory method** | `DonHang.TuGioHang(...)` | Naming one way of creating; several constructors with the same signature |
| **Factory + a registry** | `Xuong.Tao("pdf")` | The type is chosen by **data** at run time |
| **Pure GoF** | `abstract IBoXuat Tao();` + subclass override | A framework wants the subclass to decide |

What follows uses the second variant, because that's the one that solves the pain from the
*Goal* section.

## Worked example — exporting a report in three formats

Run with `dotnet run 07-factory-method.cs` on .NET 11.0.0.

### Before — two parallel `switch`es on the same code

```csharp
string XuatSwitch(string m) => m switch
{
    "pdf"   => "%PDF-1.7 (pdf)",
    "excel" => "PK.. xlsx (excel)",
    "csv"   => "a,b,c (csv)",
    _       => throw new NotSupportedException(m)
};

// the second switch — "csv" was added above but forgotten here
string TenHienThiSwitch(string m) => m switch
{
    "pdf"   => "PDF",
    "excel" => "Excel",
    _       => "Khong ro"
};
```

Whoever added `csv` edited the first function, tried it, saw the exported file was right, and merged.
The second function is in another file — it **doesn't error**, it has a `_` branch and returns
`"Khong ro"`.

```text
=== Truoc: hai switch song song, mot cai quen cap nhat ===
ma      xuat                        ten hien thi        khop?
------------------------------------------------------------------
pdf     %PDF-1.7 (pdf)              PDF                 OK
excel   PK.. xlsx (excel)           Excel               OK
csv     a,b,c (csv)                 Khong ro            LECH
So dong lech: 1
```

**No exception at all.** A user sees one "Khong ro" line in the interface and reports it three weeks
later.

### After — a single registry

```csharp
interface IBoXuat { string Xuat(); string TenHienThi { get; } }

sealed class XuatPdf   : IBoXuat { public string Xuat() => "%PDF-1.7 (pdf)";    public string TenHienThi => "pdf"; }
sealed class XuatExcel : IBoXuat { public string Xuat() => "PK.. xlsx (excel)"; public string TenHienThi => "excel"; }
sealed class XuatCsv   : IBoXuat { public string Xuat() => "a,b,c (csv)";       public string TenHienThi => "csv"; }

static class Xuong
{
    private static readonly Dictionary<string, Func<IBoXuat>> _bang = new()
    {
        ["pdf"]   = () => new XuatPdf(),
        ["excel"] = () => new XuatExcel(),
        ["csv"]   = () => new XuatCsv(),
    };
    public static void DangKy(string ma, Func<IBoXuat> tao) => _bang[ma] = tao;
    public static IBoXuat Tao(string ma) =>
        _bang.TryGetValue(ma, out var f) ? f() : throw new NotSupportedException($"chua dang ky dinh dang: {ma}");
}
```

```text
=== Sau: mot dang ky, khong the lech ===
ma      xuat                        ten hien thi        khop?
------------------------------------------------------------------
pdf     %PDF-1.7 (pdf)              pdf                 OK
excel   PK.. xlsx (excel)           excel               OK
csv     a,b,c (csv)                 csv                 OK
So dong lech: 0
```

**It can't drift, because there's no longer a second place to drift.** Both the content and the display
name live in the same class; adding a format means adding one class implementing both — enforced by the
compiler.

### Adding a fourth format

```csharp
Xuong.DangKy("json", () => new XuatJson());
```

```text
=== Them dinh dang thu tu: json ===
  json -> {"a":1} (json) / json   (khong sua dong nao cua code cu)
  So dinh dang dang co: 4
```

This is the [Open/Closed principle](../reference/solid.md#o--openclosed) showing up as a number:
extend by **adding**, not by **editing**.

### Before and after

| | Two `switch`es | Factory + registry |
|---|---|---|
| Places to edit when adding a format | every `switch` on that code — nobody knows how many there are | 1 new class + 1 registration line |
| What happens if you miss one | it returns the default value, **silently** | there's no "one place" to miss |
| Formats supplied by a plugin | impossible | `DangKy` at startup |
| A wrong code (`"pdff"`) | falls into the `_` branch | throws `NotSupportedException` naming the code |
| The compiler can check exhaustiveness | yes, if you use an `enum` + switch expression | no — the error moves to runtime |

**The last row is the real price.** With an `enum` and a switch expression, C# warns when a branch is
missing. A registry trades that away for run-time extensibility. If the list of types is fixed and
managed by programmers, a `switch` on an `enum` is **safer** than a factory.

The full failure case: [A fifth type, seven places to change](../case-studies/them-loai-thu-nam-sua-bay-cho.md).

## When NOT to use it

| Situation | What to do instead |
|---|---|
| Exactly one implementation, with no second in sight | `new` it directly. See the [failure case](../case-studies/abstract-factory-cho-mot-hien-thuc.md) |
| A fixed list of types, used in one place | A `switch` on an `enum` — the compiler checks exhaustiveness |
| You already have a DI container | `IServiceProvider.GetRequiredKeyedService<IBoXuat>("pdf")` — .NET 8+ has keyed services built in |
| You only need to name one way of constructing | A static factory method, no interface needed |

The third row is worth remembering: in ASP.NET Core, **keyed services are already the factory pattern,
built in**. Hand-writing `Xuong` is usually rebuilding something the container already has.

## Trade-offs

| You gain | You lose |
|---|---|
| A single place that knows "which code makes which class" | One more layer of indirection when reading the code |
| Adding a type doesn't touch old code (OCP) | You lose compile-time exhaustiveness checking |
| Types loadable from configuration, from plugins | "Not registered" errors only fire at run time |
| Each type is testable in isolation | Many small classes instead of one `switch` function |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Still keeping a second `switch` somewhere else (display name, icon, permission) | Exactly the bug in the first output — silent drift |
| The factory returning a concrete type rather than the interface | The caller has to `switch` on the type again — nothing gained |
| A default branch returning a "safe" value instead of throwing | A configuration error becomes wrong data, many times harder to trace |
| The factory `new`-ing the product's dependencies itself | The factory becomes an implicit composition root; take an `IServiceProvider` or a `Func<>` instead |
| Using a factory for a class with no variants | One redundant file to jump to |

## FAQ

<details>
<summary>How does Factory Method differ from Abstract Factory?</summary>

Factory Method creates **one** product. Abstract Factory creates **a family** of products that must
match each other (button + input + menu of the same theme).

The test: if creating one item wrongly on its own still leaves the system working correctly, you need
Factory Method. If mixing two families causes breakage, you need [Abstract Factory](abstract-factory.md).

</details>

<details>
<summary>Register a <code>Func&lt;IBoXuat&gt;</code> or a <code>Type</code>?</summary>

`Func<>` is nearly always better: it lets you pass dependencies into the product via a closure, and it
needs no reflection.

Registering a `Type` and then `Activator.CreateInstance` only makes sense when the type list is loaded from
string-based configuration. In exchange: you lose compile-time checking, it's slower, and it's unfriendly to
trimming/AOT.

</details>

<details>
<summary>Should the factory be <code>static</code>?</summary>

In the example above `Xuong` is `static` for brevity, but that drags in exactly the problem of
[Singleton](singleton.md): the registry is global state, and any test calling `DangKy`
affects other tests.

In real code, make it an ordinary class registered as `AddSingleton<IXuongBoXuat>` — the same
effect, without the leaking between tests.

</details>

## Related Topics

- [Abstract Factory](abstract-factory.md) — when you need a whole matching family
- [Builder](builder.md) — when creation has many steps rather than many types
- [Strategy](strategy.md) — the factory creates them, the strategy uses them
- [SOLID](../reference/solid.md) — a direct incarnation of O
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the symptom lookup table

## References

- GoF — *Design Patterns*, Factory Method
- Microsoft — *Keyed services in dependency injection* (.NET 8+)
