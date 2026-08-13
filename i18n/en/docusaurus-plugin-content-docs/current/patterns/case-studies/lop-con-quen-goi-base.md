---
title: One subclass accepts the broken rows too
sidebar_position: 16
description: "The validation step is virtual and holds shared logic; a subclass overrides it to add its own rule, forgets to call base, and the shared rule disappears without warning."
tags: [case-study, template-method, inheritance, validation]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# One subclass accepts the broken rows too

> **Label: a reconstructed situation.** Every number was really produced by
> `dotnet run 27-template-method.cs` on .NET 11.0.0.

## Context

A pipeline loading data from several sources uses
[Template Method](../skills/template-method.md). The processing skeleton is shared; each source only differs
in how it extracts the code:

```csharp
abstract class NapDeVo
{
    public (int nhan, int loai) Chay(string[] dong)
    {
        foreach (var d in dong)
            if (KiemTra(d)) nhan++; else loai++;
        ...
    }
    protected virtual bool KiemTra(string d) => !string.IsNullOrWhiteSpace(LayMa(d));   // the shared rule
    protected abstract string LayMa(string d);
}
```

The shared rule: **reject rows with no code**. It lives in `KiemTra`, and `KiemTra` is `virtual`.

The JSON source needs an extra rule of its own, so the programmer `override`s it:

```csharp
sealed class NapJsonDeVo : NapDeVo
{
    protected override string LayMa(string d) => d.Split(',')[0];
    protected override bool KiemTra(string d) => d.Length > 0;      // FORGOT to call base
}
```

## Symptoms

Three weeks after the JSON source was added, reports start showing "unknown" rows in every group.

```text
=== Khung de vo: lop con override va quen goi base ===
  NapCsvDeVo       nhan 2 dong, loai 1 dong hong
  NapJsonDeVo      nhan 3 dong, loai 0 dong hong
```

**The same three data rows, one source rejects 1 row, the other rejects 0.** The row with no code flows
through `NapJsonDeVo` and straight into the data store.

The characteristic that makes it hard to trace: **only the JSON source is affected.** The other three sources
still filter correctly, so everyone believes the filtering logic works.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The JSON source's data is dirtier than the others | Only that source has broken rows | It is dirtier — but the pipeline was supposed to filter it, and it does for other sources |
| The database load layer skips the NOT NULL constraint | Broken data got into the store | The code column allows null by design (the business requires it) |
| There's a second load path bypassing the pipeline | The classic | Sweep the logs: every row went through `Chay()` |
| A bug in JSON's `LayMa` | The closest | `LayMa` returns an empty string — **exactly as expected** for a row with no code |

The last hypothesis is the biggest time sink: the debugger confirms `LayMa` works correctly and concludes
the problem is elsewhere. It **is** correct — its result just isn't being used by anyone any more.

## The real cause

`KiemTra` was `override`n as a **replacement**, not an **addition**.

```csharp
protected override bool KiemTra(string d) => d.Length > 0;
//                                            ^ its own rule, but no longer the shared rule
```

The original checks `!string.IsNullOrWhiteSpace(LayMa(d))` — checking whether the **code** is empty. The new
one checks whether the **line** is empty. The line `",thieu ma"` has length 10, so it passes.

Whoever wrote `NapJsonDeVo` wasn't trying to break anything. They needed an extra condition, and `override`
is the obvious way in C#. **Nothing in the language hints that this method contains logic the skeleton
depends on.**

This is Template Method's inherent weakness when using `virtual` for a step with shared logic: the promise
that "subclasses don't change the algorithm's structure" is **not enforced**.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Unit tests for `NapCsvDeVo` | Green | That class doesn't override `KiemTra` |
| Unit tests for `NapJsonDeVo` | Green | The test checks "does the extra rule run" — it does |
| Tests for the `NapDeVo` skeleton | Green | The base class is tested through a fake subclass that doesn't override |
| The compiler | Silent | An `override` that doesn't call `base` is legal |
| Default analyzers | Silent | There's no rule requiring a `base` call |

The lesson: **each subclass is tested on its own, and no subclass is tested against the same set of cases.**

The test that catches this bug is a *contract test* — the same data set run through **every**
subclass, asserting the shared part of the behaviour:

```csharp
[Theory]
[MemberData(nameof(MoiBoNap))]
void Moi_bo_nap_deu_phai_loai_dong_thieu_ma(NapChac bo)
{
    var (nhan, loai) = bo.Chay([",thieu ma", "1,ok"]);
    Assert.Equal(1, loai);
}
```

One test applying to every current **and future** subclass — a new subclass is checked automatically.

## The fix

### Move the shared rule out of the subclass's reach

```csharp
abstract class NapChac
{
    public (int nhan, int loai) Chay(string[] dong)
    {
        foreach (var d in dong)
        {
            var ma = LayMa(d);                                        // the varying step
            if (string.IsNullOrWhiteSpace(ma)) { loai++; continue; }   // the shared rule, out of the subclass's reach
            nhan++;
        }
        ...
    }
    protected abstract string LayMa(string d);
}
```

```text
=== Khung chac: template method sealed, buoc bien thien la abstract ===
  NapCsv           nhan 2 dong, loai 1 dong hong
  NapJson          nhan 2 dong, loai 1 dong hong
```

**Both subclasses now give the same result** on the shared-rule part. A subclass only decides *how to
extract the code*; it has no way to decide *whether an empty code is valid*.

### Three rules

| Rule | Why |
|---|---|
| The template method (`Chay`) is **not** `virtual` | A subclass can't change the sequence |
| A mandatory varying step is `abstract` | The compiler forces an implementation; there's no `base` to forget |
| `virtual` is **only** for hooks with an **empty** body | It holds no shared logic, so there's nothing to lose |

The third rule is the one violated in this case. If subclasses need to add a rule, split it in
two:

```csharp
private bool KiemTraChung(string d) => !string.IsNullOrWhiteSpace(LayMa(d));   // khong ai voi toi
protected virtual bool KiemTraRieng(string d) => true;                         // hook rong

// trong Chay:
if (!KiemTraChung(d) || !KiemTraRieng(d)) { loai++; continue; }
```

Subclasses can override `KiemTraRieng` as much as they like; the shared rule doesn't budge.

### Or: drop the inheritance

```csharp
public static (int nhan, int loai) Chay(string[] dong, Func<string, string> layMa) { ... }
```

```text
=== Cung khung do, viet bang delegate thay vi ke thua ===
  ham thuan       nhan 2 dong, loai 1 dong hong
```

No `base` to forget, no inheritance tree, and the varying step is passed in at the call.
**With one or two varying steps, this is nearly always the better choice.**

## How to spot it early

```bash
# override khong goi base — ung vien dang nghi
grep -rnA5 "protected override" --include=*.cs src/ | grep -B4 "^\s*$" | grep -L "base\."

# virtual method co than KHONG rong trong lop truu tuong
grep -rnE "protected virtual (bool|void|string).*=>" --include=*.cs src/
```

Three questions for a code review:

1. Does this `virtual` method have **logic** in its body? If so, a subclass overriding it will erase that.
2. Does this `override` call `base`? If not, deliberately or forgotten?
3. Is there a test running **the same set of cases** through **every** subclass?

The third question blocks this whole class of bug, and it costs one `[Theory]`.

## Related Topics

- [Template Method](../skills/template-method.md) — the three rules that keep the skeleton intact
- [Composition over inheritance](../reference/composition-over-inheritance.md) — why a delegate usually wins
- [Case study — Design Patterns](index.md)
