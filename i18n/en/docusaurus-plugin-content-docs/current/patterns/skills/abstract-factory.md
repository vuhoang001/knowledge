---
title: Abstract Factory
sidebar_position: 3
description: "Create a whole family of products that must match — because mixing two families throws no exception, it just produces a half-light half-dark interface."
tags: [abstract-factory, creational, gof, dependency-inversion]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Abstract Factory

> **Takeaway:** Use it when the products **must match as a family** and mixing them wrongly causes
> no error at all — only a wrong result. Without a "must match" constraint,
> [Factory Method](factory-method.md) is enough and Abstract Factory is just a redundant layer.

## Goal

Block the class of bug with no exception: each component is correct on its own, but wrong when
combined — a dark-theme button beside a light-theme input, or `SqlOrderRepo` beside `MongoCustomerRepo`
inside the same transaction.

## The original intent (GoF)

Provide an interface for creating **families** of related objects, without specifying the concrete classes.

```csharp
interface IXuongGiaoDien
{
    IThanhPhan TaoNut();
    IThanhPhan TaoONhap();
    IThanhPhan TaoMenu();
}
```

What differs from Factory Method is that the interface has **several** creation methods. That isn't a
syntactic detail — it's the whole meaning: a factory commits to the three things it creates working
together.

## Worked example — interface themes

Run with `dotnet run 08-abstract-factory.cs` on .NET 11.0.0.

### Before — the caller picks each piece itself

```csharp
var manhRoi = new IThanhPhan[] { new NutSang(), new ONhapToi(), new MenuSang() };
```

```text
=== Truoc: nguoi goi tu chon tung manh ===
tron tay         [Nut:sang, ONhap:toi, Menu:sang]
                 so theme khac nhau = 2  TRON HO
```

Three `new` lines, all three compile, all three run. Only a user looking at the screen will notice.
**There's nowhere in the code to put an `Assert`** — because nowhere knows about all three components
at once.

### After — one factory per family

```csharp
sealed class XuongSang : IXuongGiaoDien
{
    public IThanhPhan TaoNut()   => new NutSang();
    public IThanhPhan TaoONhap() => new ONhapSang();
    public IThanhPhan TaoMenu()  => new MenuSang();
}

sealed class XuongToi : IXuongGiaoDien
{
    public IThanhPhan TaoNut()   => new NutToi();
    public IThanhPhan TaoONhap() => new ONhapToi();
    public IThanhPhan TaoMenu()  => new MenuToi();
}
```

```text
=== Sau: xuong dung mot ho ===
XuongSang        [Nut:sang, ONhap:sang, Menu:sang]
                 so theme khac nhau = 1  OK
XuongToi         [Nut:toi, ONhap:toi, Menu:toi]
                 so theme khac nhau = 1  OK
```

The caller now receives an `IXuongGiaoDien` and has **no way** to mix families, because it no longer
knows any concrete class name.

### Adding a third family

```text
=== Them ho thu ba: tuong phan cao ===
XuongTuongPhan   [Nut:tuong-phan, ONhap:tuong-phan, Menu:tuong-phan]
                 so theme khac nhau = 1  OK
```

Add one factory class + three component classes. **Not a line changes on the caller's side.**

### Before and after

| | Picking each piece by hand | Abstract Factory |
|---|---|---|
| Mixing families wrongly | compiles, runs, wrong | inexpressible |
| Adding a third family | edit every `new` site | add 1 factory, the caller is unchanged |
| Adding a fourth **component type** (say `TaoBang`) | add one `new` at every site | **edit the interface → edit all 3 factories** |
| Concrete classes the caller knows | 3 × the number of families | 0 |

**The third row is this pattern's inherent weakness**, and there's no dodging it. Abstract Factory makes
adding a *family* cheap and adding a *product type* expensive. Choose it when you believe the number of
families will grow and the product-type list is stable — guessing this direction wrong hurts.

## Recognising it outside user interfaces

The theme example is the textbook one, but the places you actually meet it are far more numerous:

| Context | The product family | What happens if mixed |
|---|---|---|
| Several database kinds | `IKetNoi`, `ILenh`, `IGiaoDich` of the same provider | Provider A's transaction can't wrap provider B's command |
| Several environments | `IKho`, `IHangDoi`, `ILuuTru` in real / in-memory versions | The test uses the real store and a fake queue — a meaningless result |
| Multi-region | Date + currency formatting and sort order | An American-style date beside Vietnamese-style money |
| Multi-tenant | The fee rules + limits + email templates per tenant | Tenant A's fee calculation sending tenant B's email template |

The second row is why `IXuongHaTang` shows up a lot in test code — and also why it usually **doesn't**
need to exist: the DI container does exactly that job when you register a different set of services for the
test environment.

## When NOT to use it

| Situation | Why |
|---|---|
| The products are **not** required to match | Use a separate [Factory Method](factory-method.md) per type |
| There's only one family, with no second in sight | A redundant layer — see the [failure case](../case-studies/abstract-factory-cho-mot-hien-thuc.md) |
| The product-type list is still changing a lot | Every added type means editing every factory |
| You already have a DI container with a registration module per environment | The container *is* the abstract factory; rewriting it is duplication |

## Trade-offs

| You gain | You lose |
|---|---|
| Families can't be mixed — the mismatch is blocked by design | Adding a product type means editing the interface and **every** factory |
| The caller knows no concrete class | Many classes: `families × types` + the factories |
| Swap a whole family with one registration line | Hard to see which real product is running while debugging |
| Adding a new family doesn't touch the caller | If there's only one family, every cost above is a net loss |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Using it when the products are independent | A false constraint — you're forced to create all three when you need one |
| Letting one `new` of a concrete class slip through | Enough to reproduce the family-mixing bug; and no test will catch it |
| The factory containing business logic | A factory should only *create*; logic there is logic nobody will find |
| One factory interface with 12 creation methods | Most callers need 2 — a violation of [ISP](../reference/solid.md#i--interface-segregation) |
| Building an abstract factory for exactly one implementation | Four new types, no added capability |

## FAQ

<details>
<summary>The DI container already does this — do I still need Abstract Factory?</summary>

Usually not. `AddScoped<IKho, KhoSql>()` for the real environment and `KhoTrongBoNho` for
tests already guarantees the whole set matches, because the whole set is registered in one place.

Abstract Factory is still needed when the family is chosen **at run time, by data** — for example
choosing a rule set by the current request's tenant. The container decides at startup; a factory
decides at run time.

</details>

<details>
<summary>Can I use generics to avoid writing so many factories?</summary>

Partly: `IXuong<TTheme>` with a type constraint reduces the repetition. But it moves the family
choice to **compile time**, losing exactly the run-time choice that was the reason for using this
pattern.

Use generics when the family is known at compile time; use an ordinary factory when the family comes from
configuration.

</details>

<details>
<summary>How do I stop someone still calling <code>new NutSang()</code> directly?</summary>

Three levels, increasingly strict:

1. Make the concrete classes `internal` and only the interface `public` — code outside the assembly
   can't `new` them.
2. Add an analyzer/architecture rule (for example `NetArchTest`) blocking references to the concrete
   classes' namespace from outside.
3. Make the classes `private nested` inside the factory itself — the strictest, and the hardest
   to test in isolation.

Level 1 is a good balance point for most projects.

</details>

## Related Topics

- [Factory Method](factory-method.md) — when you need one product, not a family
- [Builder](builder.md) — one complex object over several steps, not several objects
- [Bridge](bridge.md) — also splits two axes, but on the structural side rather than the creational one
- [Singleton](singleton.md) — a factory is usually registered with a singleton lifetime
- [SOLID](../reference/solid.md) — an incarnation of D

## References

- GoF — *Design Patterns*, Abstract Factory
