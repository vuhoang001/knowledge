---
title: "Lab: escalating from a switch to Strategy + Decorator"
sidebar_position: 1
description: "Four escalating steps on the same shipping-fee problem, stopping at the cheapest step that solves the problem — really run with dotnet run."
tags: [tutorial, strategy, decorator, refactoring, dotnet]
domain: backend
category: pattern
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Lab: escalating from a `switch` to Strategy + Decorator

> **The goal:** not "learn how to write Strategy", but **learn where to stop**.
> The four steps below solve the same problem at increasing cost; the right step is the first one that
> solves the problem you **actually** have.

## Preparation

You need .NET 10 or later (which supports running a `.cs` file directly). Check:

```bash
dotnet --version
```

```text
11.0.100-preview.1.26104.118
```

Yours:

```text

```

Create any working directory **outside this repo** — for example `~/Documents/learn-lab/patterns`.
Each step is an independent file, run with `dotnet run <name>.cs`.

The first run takes ~40 seconds (restoring packages); subsequent runs under 1 second.

## The problem

Calculate the shipping fee by service type:

| Type | Formula |
|---|---|
| `thuong` (standard) | 15,000 VND/kg |
| `nhanh` (express) | 25,000 VND/kg |
| `hoa toc` (same-day) | 40,000 VND/kg + a 20,000 surcharge |

The requirements will **grow** with each step. That's the point of this lab.

---

## Step 1 — an inline `switch`

**The requirement:** three types, fixed, used in one place.

`lab1.cs`:

```csharp
decimal Phi(string loai, decimal tien, int kg) => loai switch
{
    "thuong" => kg * 15000m,
    "nhanh"  => kg * 25000m,
    "hoa toc" => kg * 40000m + 20000m,
    _ => throw new ArgumentException($"khong biet loai: {loai}")
};

string[] loai = ["thuong", "nhanh", "hoa toc"];
Console.WriteLine($"{"loai",-10}{"2kg",12}{"5kg",12}");
Console.WriteLine(new string('-', 34));
foreach (var l in loai) Console.WriteLine($"{l,-10}{Phi(l, 300000m, 2),12:N0}{Phi(l, 300000m, 5),12:N0}");

try { Phi("duong bien", 300000m, 2); }
catch (Exception e) { Console.WriteLine($"\nloai chua ho tro -> {e.GetType().Name}: {e.Message}"); }
```

```bash
dotnet run lab1.cs
```

```text
loai               2kg         5kg
----------------------------------
thuong          30,000      75,000
nhanh           50,000     125,000
hoa toc        100,000     220,000

loai chua ho tro -> ArgumentException: khong biet loai: duong bien
```

Yours:

```text

```

**This is the correct code for the requirement as given.** Six lines, one place, understandable in one pass.
Anyone telling you to replace it with a pattern is applying patterns as ritual — see
[when not to use a pattern](../reference/what-is-a-pattern.md#when-not-to-use-a-pattern).

**Only climb to step 2 when a new requirement appears.**

---

## Step 2 — a delegate lookup table

**The new requirement:** *"marketing wants to add a service type without waiting for the next release."*

A `switch` can't meet that — the list of types has to become **data**.

`lab2.cs`:

```csharp
var bang = new Dictionary<string, Func<decimal, int, decimal>>
{
    ["thuong"]  = (tien, kg) => kg * 15000m,
    ["nhanh"]   = (tien, kg) => kg * 25000m,
    ["hoa toc"] = (tien, kg) => kg * 40000m + 20000m,
};

decimal Phi(string loai, decimal tien, int kg) =>
    bang.TryGetValue(loai, out var f) ? f(tien, kg) : throw new ArgumentException($"khong biet loai: {loai}");

// add a new type WITHOUT editing a line above
bang["duong bien"] = (tien, kg) => kg * 8000m;
```

```text
loai               2kg         5kg
----------------------------------
thuong          30,000      75,000
nhanh           50,000     125,000
hoa toc        100,000     220,000

sau khi them "duong bien": 40,000
so loai dang co: 4
```

Yours:

```text

```

**Not one class was created.** This is already Strategy structurally — a `Func<>` *is* a
strategy. The first three lines still produce exactly the step-1 numbers: a refactor must not change behaviour.

What you just lost: a `switch` on an `enum` gets exhaustiveness-checked by the compiler, a lookup table
doesn't. In exchange: adding a type at run time.

**Only climb to step 3 when a `Func<>` isn't enough.**

---

## Step 3 — Strategy with classes

**The new requirement:** *"the interface must show the service programme's name, and the configuration is read
from a file."*

Now each strategy needs **two** things (`Tinh` and `MoTa`) and carries **configuration state** — the two
conditions where a class beats a delegate.

`lab3.cs`:

```csharp
interface IPhiShip { decimal Tinh(decimal tien, int kg); string MoTa { get; } }

sealed class TheoCan(decimal donGia, string ten) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => kg * donGia;
    public string MoTa => $"{ten} ({donGia:N0}/kg)";
}

sealed class TheoCanCongPhuPhi(decimal donGia, decimal phuPhi, string ten) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => kg * donGia + phuPhi;
    public string MoTa => $"{ten} (+{phuPhi:N0})";
}
```

Loading from a configuration string:

```csharp
(string, IPhiShip) Nap(string dong)
{
    var p = dong.Split('|');
    return p[1] switch
    {
        "theo can" => (p[0], new TheoCan(decimal.Parse(p[2]), p[3])),
        "phu phi"  => (p[0], new TheoCanCongPhuPhi(decimal.Parse(p[2]), decimal.Parse(p[3]), p[4])),
        _ => throw new NotSupportedException(p[1])
    };
}
```

```text
ma        mo ta                          2kg         5kg
--------------------------------------------------------
thuong    Giao thuong (15,000/kg)      30,000      75,000
nhanh     Giao nhanh (25,000/kg)      50,000     125,000
hoa toc   Hoa toc (+20,000)          100,000     220,000
nap "duong bien|theo can|8000|Duong bien" -> Duong bien (8,000/kg): 40,000
nap "sieu toc|phu phi|60000|30000|Sieu toc" -> Sieu toc (+30,000): 330,000
so loai dang co: 5
```

Yours:

```text

```

Note that **two classes serve five service types**. `TheoCan` is reused three times with three different
configurations — that's the difference from "one class per type", and where Strategy genuinely earns its
return.

### Getting back what you lost: validation at startup

Steps 2 and 3 trade compile-time checking for flexibility. Get part of it back by validating
**at startup** rather than at use time:

```text
=== Kiem tra luc khoi dong: ma trong cau hinh phai da dang ky ===
  nhanh        OK
  duong bo     CHUA DANG KY — nem ngay luc khoi dong
```

Yours:

```text

```

A configuration error now fires on the first run, not on the customer's first order.

---

## Step 4 — Decorators stacked on Strategy

**The new requirement:** *"free shipping for orders from 500,000, and the fee must not exceed 80,000, and
those two rules must be switchable independently."*

Stuffing that into each strategy duplicates code across every class. This is exactly
[Decorator](../skills/decorator.md)'s place.

`lab4.cs`:

```csharp
sealed class MienPhiTuNguong(IPhiShip trong, decimal nguong) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => tien >= nguong ? 0m : trong.Tinh(tien, kg);
    public string MoTa => $"{trong.MoTa} + mien phi tu {nguong:N0}";
}

sealed class TranPhi(IPhiShip trong, decimal tran) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => Math.Min(trong.Tinh(tien, kg), tran);
    public string MoTa => $"{trong.MoTa} + tran {tran:N0}";
}

sealed class GiamPhanTram(IPhiShip trong, int pt) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => trong.Tinh(tien, kg) * (100 - pt) / 100m;
    public string MoTa => $"{trong.MoTa} + giam {pt}%";
}
```

```text
cau hinh              300k/2kg    300k/5kg    600k/2kg    600k/5kg
------------------------------------------------------------------
goc                     50,000     125,000      50,000     125,000
mien phi >=500k         50,000     125,000           0           0
tran 80k                50,000      80,000      50,000      80,000
tran(giam 50%)          25,000      62,500      25,000      62,500
giam 50%(tran)          25,000      40,000      25,000      40,000
```

Yours:

```text

```

### Step 4's main lesson — the wrapping order is a business decision

The last two rows use **the same set of decorators**, differing only in order:

```text
Hai dong cuoi cung mot bo decorator, khac thu tu:
    300,000/2kg  tran(giam)=   25,000  giam(tran)=   25,000  khop
    300,000/5kg  tran(giam)=   62,500  giam(tran)=   40,000  LECH 22,500
    600,000/2kg  tran(giam)=   25,000  giam(tran)=   25,000  khop
    600,000/5kg  tran(giam)=   62,500  giam(tran)=   40,000  LECH 22,500
```

Yours:

```text

```

**A 22,500 VND difference per order**, and both orders compile, run, and raise no warning at all.

Note the two "khop" rows: at 2kg the base fee (50,000) doesn't reach the cap, so the two orders coincide.
**A test written with 2kg orders will be green for both orders** — and that's why test cases have to be chosen
right at the boundary.

The business question: *is the discount applied before or after the cap?* There's no technical
answer; you have to ask. And once you have the answer, **write a test locking it in**.

---

## Summary — where to stop

| Step | Approach | What it buys | What it costs | Stop here when |
|---|---|---|---|---|
| 1 | `switch` | The simplest, compiler-checked exhaustiveness | Adding a type means editing code | The list is fixed, one call site |
| 2 | A `Func<>` table | Adding a type at run time | You lose compile-time checking | The strategy only needs one computation |
| 3 | Strategy classes | Several methods, configuration state, loading from a file | More types, more file jumps | You need `MoTa`, you need configuration |
| 4 | + Decorators | Cross-cutting rules switchable independently | **The order becomes an invisible decision** | You have ≥2 cross-cutting rules |

**Only climb a step when the previous one can't meet a specific requirement.** Climbing up is always easy;
climbing back down isn't, because the whole team has got used to the abstraction.

## Exercises

1. Add a `"tiet kiem"` type (10,000/kg, with 5,000 off for orders from 3kg) to **step 1** and
   **step 3**. Count the lines you have to edit on each side.
2. In step 4, write a test asserting the `tran(giam)` order is the correct one, using the 5kg case. Check that
   the test goes red when you swap the order.
3. In step 3, what would it take for `Nap()` to no longer have a `switch`? A hint: see
   [Factory Method](../skills/factory-method.md) — and ask yourself whether it's worth it.
4. Time 1 million `Phi()` calls in step 1 and step 3. Is the difference big enough to factor into a design
   decision?

Exercise 4 is the most worthwhile: most "patterns make it slow" arguments evaporate once there's a number.

## Related Topics

- [Strategy](../skills/strategy.md) — the main pattern of steps 2 and 3
- [Decorator](../skills/decorator.md) — step 4's pattern, and the ordering trap
- [Which pattern to choose](../reference/choosing-a-pattern.md) — reverse lookup from a symptom
- [What a design pattern is](../reference/what-is-a-pattern.md) — the Rule of Three
- [Cheatsheet: the 23 GoF](../cheatsheets/gof-23.md) — the one-page table
