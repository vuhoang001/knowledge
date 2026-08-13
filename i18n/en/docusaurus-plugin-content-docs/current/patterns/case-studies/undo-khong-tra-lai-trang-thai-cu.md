---
title: Undo two commands, stock goes from 10 to 24
sidebar_position: 13
description: "HoanTac recomputes in reverse using the requested amount instead of the amount actually issued — only wrong at the bound, so tidy test data never catches it."
tags: [case-study, command, memento, undo, inventory]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Undo two commands, stock goes from 10 to 24

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 19-command.cs`
> on .NET 11.0.0.

## Context

The stock-issuing screen supports undo. Each operation is a
[Command](../skills/command.md):

```csharp
sealed class XuatKhoTinhNguoc(TonKho kho, int yeuCau) : ILenh
{
    public void ThucThi() { DaXuat = Math.Min(yeuCau, kho.So); kho.So -= DaXuat; }
    public void HoanTac() => kho.So += yeuCau;          // WRONG: adds back the REQUESTED amount
}
```

`ThucThi` clamps the value (`Math.Min`) because you can't issue more than you have.
`HoanTac` adds back the **requested** amount.

## Symptoms

The month-end stocktake is off: system stock is higher than physical stock for some SKUs.

```text
=== Undo sai: tinh nguoc bang cong thuc ===
  xuat 4  -> ton 6
  xuat 20 -> ton 0  (chi xuat duoc 6)
  undo    -> ton 20  <- ky vong 6
  undo    -> ton 24  <- ky vong 10
```

**Starts at 10, ends at 24.** Fourteen units of goods created out of nothing.

The symptom isn't uniform: most SKUs still match. Only the ones that have **at some point run out**
diverge — and the team spent a week before spotting that connection.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| Goods receipts recorded twice | System stock is **higher** than physical | Reconcile the receipt notes: the counts match |
| A race between two people issuing the same SKU | The divergence isn't uniform across SKUs | It happens even with only one person operating |
| The physical stocktake miscounted | Blaming the humans | Counted three times, still divergent |
| A rounding error | The classic | Integers, no rounding anywhere |

The turning point: somebody notices that **every divergent SKU is on the "has reported out of stock" list**.
From there to `Math.Min` is a short step.

## The real cause

`ThucThi()` has a **branch**: when the request exceeds the stock, it only issues what's left.

```csharp
DaXuat = Math.Min(yeuCau, kho.So);      // yeuCau = 20, kho.So = 6 -> DaXuat = 6
kho.So -= DaXuat;                       // ton = 0
```

`HoanTac()` knows nothing about that branch. It adds back `yeuCau = 20`.

**The rule violated: `HoanTac()` must be based on *what happened*, not on *what was
requested*.**

The detail that let this bug live so long: when `yeuCau <= kho.So` then `yeuCau == DaXuat` and everything
matches perfectly. The divergence **only appears at the bound** — exactly where test data rarely reaches.

Compare with a correctly written command in the same system:

```csharp
sealed class VietHoaTatCa(VanBan vb) : ILenh
{
    private string _cu = "";
    public void ThucThi() { _cu = vb.NoiDung; vb.NoiDung = vb.NoiDung.ToUpperInvariant(); }
    public void HoanTac() => vb.NoiDung = _cu;
}
```

```text
=== Undo dung: luu trang thai cu ===
  sau 3 lenh : "XIN CHAO THE GIOI"
  undo       : "Xin chao the gioi"
  undo       : "Xin chao"
  undo       : ""
```

This class **doesn't try to recompute in reverse** (lowercasing back is an inverse that doesn't exist). It
stores the old string. Whoever wrote it was forced to think about that because the inverse was obviously
impossible; whoever wrote `XuatKho` wasn't, because the inverse *looks* like it exists.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| A test "issue then undo returns the old number" | Green | It uses stock of 100 and issues 10 — never touching the bound |
| A test "issuing more than stock only issues what's left" | Green | It checks `ThucThi`, not the `HoanTac` afterwards |
| Integration tests | Green | The seed data always has surplus stock |
| The compiler | Silent | `kho.So += yeuCau` is legal |
| A nightly automated stocktake | Absent | This is the thing that should have caught it |

The first row is the lesson: **the right scenario tested with the wrong data.** The "issue then undo"
scenario *is* in the test suite; it just never runs with `yeuCau > kho.So`.

The test that catches this bug is a *property test*:

```csharp
[Property] void Thuc_thi_roi_hoan_tac_luon_ve_trang_thai_ban_dau(int ton, int yeuCau)
{
    var kho = new TonKho(Math.Abs(ton) % 100);
    var truoc = kho.So;
    var l = new XuatKho(kho, Math.Abs(yeuCau) % 200);   // co the vuot ton
    l.ThucThi(); l.HoanTac();
    Assert.Equal(truoc, kho.So);
}
```

The invariant *"execute then undo returns to the initial state"* holds for **every** command, so write it
once and use it for all of them.

## The fix

### Store what actually happened

```csharp
sealed class XuatKhoLuuThat(TonKho kho, int yeuCau) : ILenh
{
    private int _daXuat;
    public void ThucThi() { _daXuat = Math.Min(yeuCau, kho.So); kho.So -= _daXuat; }
    public void HoanTac() => kho.So += _daXuat;         // RIGHT: adds back what was ISSUED
}
```

```text
=== Undo dung: luu so da xuat that su ===
  sau 2 lenh -> ton 0
  undo       -> ton 6  <- ky vong 6
  undo       -> ton 10  <- ky vong 10
```

### Or: switch to a snapshot

```csharp
public void ThucThi() { _truoc = kho.So; kho.So -= Math.Min(yeuCau, kho.So); }
public void HoanTac() => kho.So = _truoc;
```

[Memento](../skills/memento.md) is **always correct**, with no reasoning about inverses needed. The price
is memory proportional to the state's size — for one integer, that's zero.

**The pragmatic rule: start with a snapshot; move to an inverse command only once you've measured memory
being a problem.**

### A decision table

| If `ThucThi()` has | How to write `HoanTac()` |
|---|---|
| No branching, a reversible operation | An inverse command works, but a snapshot is still safer |
| Value clamping (`Min`, `Max`, `Clamp`) | You **must** store the value used, or snapshot |
| An `if` branch | You must store which branch ran, or snapshot |
| The possibility of partial failure | Snapshot |
| Side effects that go outside (email, an API) | **Not undoable** — design a compensating action |

## How to spot it early

```bash
# HoanTac tham chieu tham so constructor thay vi field da luu
grep -rnA3 "public void HoanTac" --include=*.cs src/ | grep -E "\+= (yeuCau|soLuong|tien)\b"
```

Three questions for a code review:

1. Does `ThucThi()` have any branching (`if`, `Min`, `Max`, try/catch)? If so, does `HoanTac()`
   know which branch ran?
2. Does `HoanTac()` use a **parameter** or a **field stored during execution**? A parameter is a smell.
3. Is there a property test "execute then undo returns the old state" running with data **at the bound**?

The second question is the fastest: read `HoanTac()` and see what it references.

## Related Topics

- [Command](../skills/command.md) — the two undo strategies and when to use which
- [Memento](../skills/memento.md) — undo by snapshot, always correct
- [Case study — Design Patterns](index.md)
