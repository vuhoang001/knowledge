---
title: Strategy
sidebar_position: 21
description: "Several algorithms with the same purpose, one chosen at run time — and the real test is whether it's chosen by data or there's still an if choosing the strategy."
tags: [strategy, behavioral, gof, open-closed, delegate]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Strategy

> **Takeaway:** Splitting an algorithm into a class **is not yet Strategy**. The real test:
> *does adding a new algorithm require editing old code?* If there's still a `switch` choosing the
> strategy, you've only moved the `if` somewhere else, not removed it.

## Goal

Let the way something is computed (a discount, a shipping fee, a sort order, a compression method) become
**configurable data** rather than a hardcoded branch in the code.

## The original intent (GoF)

Define a family of algorithms, encapsulate each one, and make them interchangeable.
Strategy lets the algorithm vary independently from the clients that use it.

```csharp
interface IGiamGia { decimal Ap(decimal gia); string MoTa { get; } }
```

## Worked example — a discount programme

Run with `dotnet run 26-strategy.cs` on .NET 11.0.0. Base price 1,000,000.

### Three ways of writing the same thing

```text
=== Ba cach viet cung mot thu ===
  if-else       : 800,000
  lop Strategy  : 800,000
  Func (delegate): 800,000
```

The same result. So the question isn't "which way is correct" but "which way earns its cost" —
see the selection table below.

### The part that **is** Strategy: choosing by data

```csharp
var bang = new Dictionary<string, IGiamGia>
{
    ["khong"] = new KhongGiam(),
    ["thanh_vien"] = new GiamPhanTram(10),
    ["vip"] = new GiamVip(),
    ["combo"] = new GiamTheoNguong(500_000m, 100_000m),
};
```

```text
=== Phan Strategy: chon bang DU LIEU, khong bang if ===
  khong        khong giam                          1,000,000
  thanh_vien   giam 10%                              900,000
  vip          giam 20% cho VIP                      800,000
  combo        tru 100,000 khi tu 500,000            900,000
```

### The real benefit — loaded from configuration, with no recompilation

```csharp
var cauHinh = "phan_tram:15";
var moi = TuCauHinh(cauHinh);
bang["khuyen_mai_thang_8"] = moi;
```

```text
=== Them chuong trinh moi tu CAU HINH, khong bien dich lai ===
  nap "phan_tram:15" -> giam 15%: 850,000
  so chuong trinh dang co: 5
```

The August promotion appears **without a single line of code being changed**. This is the dividing line
between real Strategy and Strategy in name only.

### The part that is **not** Strategy: still an `if` to choose

```csharp
IGiamGia ChonBangIf(string loai) => loai switch
{
    "thanh_vien" => new GiamPhanTram(10),
    "vip" => new GiamVip(),
    _ => new KhongGiam()
};
```

```text
=== Phan KHONG phai Strategy: van con if chon strategy ===
  giam 20% cho VIP   <- them loai moi van phai sua ham nay
  giam 20% cho VIP   <- them loai moi chi them mot dong dang ky
```

**Two lines with the same result, differing in the cost of change.** The `switch` version still has to be
edited on every added type — meaning it still violates [Open/Closed](../reference/solid.md#o--openclosed),
only now with four extra classes.

If that's all you did, the original `if-else` is **better**: the same cost of change, four fewer classes.
The failure case:
[Abstract Factory for one implementation](../case-studies/abstract-factory-cho-mot-hien-thuc.md).

### Verified across several price points

```text
=== So sanh ket qua ba cach tren cung bo du lieu ===
         gia       khong    thanh_vien         vip       combo
--------------------------------------------------------------
     100,000     100,000        90,000      80,000     100,000
     400,000     400,000       360,000     320,000     400,000
     600,000     600,000       540,000     480,000     500,000
   2,000,000   2,000,000     1,800,000   1,600,000   1,900,000
```

The `combo` column shows why a strategy needs to be **an object with state** rather than just a
function: `GiamTheoNguong(500_000m, 100_000m)` carries its two configuration parameters with it.

### Before and after

| | `if-else` | Strategy + a registry |
|---|---|---|
| Adding a discount method | edit a function | add 1 class + 1 registration line |
| Loading from configuration at run time | no | yes |
| Testing one formula in isolation | through the shared function | `new GiamVip().Ap(...)` |
| A different programme set per branch office | no | yes |
| Type count | 0 | 1 interface + n classes |
| The compiler checks exhaustiveness | yes (with an `enum`) | no |

## A class or a `Func<>`? A selection table

| Use | When |
|---|---|
| `Func<decimal, decimal>` | One computation, no state, no metadata |
| A class implementing an interface | You need **several methods** (`Ap` + `MoTa`), configuration state, or DI to create it with its dependencies |
| A `record` implementing an interface | As above, and you want the strategy to be comparable/serializable |

In this example, `MoTa` is the reason to choose a class: the interface needs to display the promotion's name,
and a delegate can't carry that information.

**Don't default to a class.** If a strategy has one method and no state,
`Func<>` is the right answer and three times shorter.

## When NOT to use it

| Situation | Why |
|---|---|
| A fixed algorithm list managed by programmers | A `switch` on an `enum` — the compiler checks exhaustiveness |
| There's only one algorithm | There's nothing to be interchangeable with |
| The algorithm needs to know the next one / has transition rules | That's [State](state.md) |
| You still `switch` to choose the strategy, and the list doesn't come from data | Nothing gained over `if-else` |
| You need undo | That's [Command](command.md) |

## Trade-offs

| You gain | You lose |
|---|---|
| Adding an algorithm doesn't touch old code | You lose compile-time exhaustiveness checking |
| Algorithms loadable from configuration, from plugins | A wrong code only fires at run time |
| Each algorithm testable in isolation | Many small classes; reading it the first time means jumping files |
| Swapping the algorithm at run time, per tenant | The caller has to know which to pick — the responsibility moves to them |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Keeping a `switch` to choose the strategy | You haven't removed the `if`, only moved it — plus n extra classes |
| Building an interface + n classes for 2 fixed branches | More code, the same cost of change |
| A stateful, shared, mutable strategy | One request affects another; a strategy should be immutable |
| A strategy interface that's too wide | Some classes have to implement meaningless methods |
| A default branch returning a "do nothing" strategy | A wrong configuration code becomes a silently missing discount |
| The caller casting down to a concrete strategy | It destroys the whole interchangeability |

## FAQ

<details>
<summary>If I'm using a DI container, how do I register the strategies?</summary>

.NET 8+ has keyed services, which are exactly right for this:

```csharp
services.AddKeyedSingleton<IGiamGia, GiamVip>("vip");
services.AddKeyedSingleton<IGiamGia, GiamPhanTram>("thanh_vien");
// noi dung
var s = sp.GetRequiredKeyedService<IGiamGia>(maChuongTrinh);
```

The container becomes the registry and you don't have to write a `Dictionary` yourself. For strategies loaded
from configuration at run time (like the `"phan_tram:15"` example), you still need your own factory.

</details>

<details>
<summary>How do I know a strategy code in the configuration is valid?</summary>

Validate at **startup**, not at use time:

```csharp
foreach (var ma in cauHinh.MaChuongTrinh)
    if (!bang.ContainsKey(ma)) throw new InvalidOperationException($"chua dang ky: {ma}");
```

This is how you get back part of what you lost by dropping the `switch` on an `enum`: a configuration error
fires on the very first run rather than when the first customer places an order.

</details>

<details>
<summary>Can I stack several strategies (both a percentage off and a fixed deduction)?</summary>

You can, and there are two ways with different meanings:

- **A composite strategy**: one class holding a list of strategies and applying them in turn. The order
  matters — 10% off then minus 100k differs from minus 100k then 10% off.
- **[Decorator](decorator.md)**: each strategy wraps another.

Both are correct; what's mandatory is that **the order be an explicit decision**, with a test.

</details>

## Related Topics

- [State](state.md) — the same shape, but with transition rules
- [Bridge](bridge.md) — the same shape, recognised at design time rather than while editing
- [Factory Method](factory-method.md) — the thing that creates the strategies
- [Template Method](template-method.md) — plugging in by inheritance rather than by object
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the Strategy/State/Command distinction table

## References

- GoF — *Design Patterns*, Strategy
- Microsoft — *Keyed services in dependency injection* (.NET 8+)
