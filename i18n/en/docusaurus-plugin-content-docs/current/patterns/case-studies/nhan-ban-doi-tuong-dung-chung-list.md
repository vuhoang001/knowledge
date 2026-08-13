---
title: Edit the copy, the original changes
sidebar_position: 4
description: "MemberwiseClone and a record's with are both shallow copies — the name separates so everyone believes it worked, while the column list stays shared."
tags: [case-study, prototype, memento, deep-copy, record]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Edit the copy, the original changes

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 10-prototype.cs`
> on .NET 11.0.0.

## Context

A reporting tool lets users "clone a template report and edit it". The report configuration:

```csharp
sealed class CauHinhBaoCao(string ten, List<string> cot, Nguong nguong)
{
    public string Ten { get; set; } = ten;
    public List<string> Cot { get; set; } = cot;
    public Nguong Nguong { get; set; } = nguong;

    public CauHinhBaoCao SaoChepNong() => (CauHinhBaoCao)MemberwiseClone();
}
```

A user opens "Quarterly revenue", clicks *Clone*, renames the copy, adds a `san_pham` column, and raises
the alert threshold from 1,000 to 5,000.

## Symptoms

The **original** report — the one the director signed off and nobody is allowed to change — suddenly has an
extra `san_pham` column and a threshold of 5,000.

```text
=== Sao chep nong (MemberwiseClone) ===
  ban sao: ten="Doanh thu quy - ban sao" cot=[ngay,khu_vuc,san_pham] nguong=5000
  ban GOC: ten="Doanh thu quy" cot=[ngay,khu_vuc,san_pham] nguong=5000
  Cot cua goc bi them chua? CO — hong
  Nguong cua goc bi doi chua? CO — hong
```

Read those first three lines carefully: **`Ten` separated correctly, `Cot` and `Nguong` didn't.**

That's the detail that makes this case hard to trace. The user sees the copy's name differ from the
original's, so they believe the cloning worked. Nobody thinks to check the columns.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The user edited the original by mistake | The easiest | The action log shows they only opened the copy |
| Two tabs overwriting each other | Plausible for a web application | It reproduces with exactly one tab |
| A server-side cache returning the wrong record | The classic | Read straight from the database: the original data **really has** changed |
| `MemberwiseClone` copies nothing at all | Nearly right | Wrong — `Ten` separated correctly, so it **does** copy |

The last hypothesis is the biggest time sink: the debugger sees `Ten` separate correctly and therefore
crosses `MemberwiseClone` off the suspect list.

## The real cause

`MemberwiseClone` copies **each field's value**. For a reference-typed field, that value
is an **address**, not the contents.

| Field | Type | After `MemberwiseClone` |
|---|---|---|
| `Ten` | `string` (immutable) | The same address — but assigning a new `Ten` creates a different string, so it **looks** separated |
| `Cot` | `List<string>` | The same address; `Add` also edits the original list |
| `Nguong` | a class with a setter | The same address; changing `GiaTri` changes both |

**`string` separates not because it was copied, but because it's immutable.** That's exactly the illusion
that fooled both the user and the debugger.

### And `record` + `with` is the same

The team planned to fix it by switching to a `record` — because "records are immutable":

```csharp
record CauHinhRecord(string Ten, List<string> Cot);
var r2 = r1 with { Ten = "Ban sao" };
r2.Cot.Add("khu_vuc");
```

```text
=== record + with cung la sao chep NONG ===
  r1.Cot = [ngay, khu_vuc]
  r2.Cot = [ngay, khu_vuc]
  Cung mot List? True
```

**`ReferenceEquals` returns `True`.** A `record` is immutable at the level of its own reference; it
does nothing about what it points at. A `record` holding a `List<T>` is a mutable object in immutable
clothing — and more dangerous than the old version, because the name `record` creates a false sense of
safety.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| A test for "clone then rename" | Green | It only checks `Ten` — the one field that happens to look right |
| A test for "does the copy have the right columns" | Green | The copy **is** right; it's the original that's wrong |
| The compiler | Silent | `MemberwiseClone` is a legitimate API |
| Analyzers | Silent | There's no rule about shallow versus deep |

The only check that catches it is the kind **few people think to write**: after editing the copy, assert
that **the original didn't change**.

```csharp
[Fact] void Sua_ban_sao_khong_dung_toi_ban_goc()
{
    var goc = MauChuan();
    var sao = goc.SaoChep();
    sao.Cot.Add("moi");
    Assert.DoesNotContain("moi", goc.Cot);       // <- day la assertion bi thieu
}
```

## The fix

### A deep copy

```csharp
public CauHinhBaoCao SaoChepSau() => new(Ten, [.. Cot], Nguong.Ban());
```

```text
=== Sao chep sau ===
  ban sao: ten="Doanh thu quy - ban sao" cot=[ngay,khu_vuc,san_pham] nguong=5000
  ban GOC: ten="Doanh thu quy" cot=[ngay,khu_vuc] nguong=1000
  Cot cua goc bi them chua? khong
  Nguong cua goc bi doi chua? khong
```

### Or: use immutable collections from the start

```csharp
record CauHinhBatBien(string Ten, ImmutableArray<string> Cot);
var i2 = i1 with { Cot = [.. i1.Cot, "khu_vuc"] };
```

```text
=== record voi collection bat bien thi an toan ===
  i1.Cot = [ngay]
  i2.Cot = [ngay, khu_vuc]
```

This is **more thorough**: there's no `Clone` to write wrongly, and no `Add` to call by
mistake. This is the direction to choose for a new design.

### A comparison table

| | `MemberwiseClone` | `record` + `with` | A hand-written deep copy | Immutable collections |
|---|---|---|---|---|
| Immutable fields (`string`, `int`) | separates | separates | separates | separates |
| `List`, `Dictionary` | **shared** | **shared** | separates | nothing to separate |
| Adding a new field and forgetting | can't forget | can't forget | **breaks silently** | can't forget |
| Cost | O(field count) | O(field count) | O(tree size) | O(1) to snapshot |

The third column has its own memorable risk: a hand-written `Clone()` **gets no reminder from the compiler**
when the class gains a field. If you choose it, write a test comparing property counts via reflection.

## How to spot it early

```bash
# Moi cho sao chep nong
grep -rn "MemberwiseClone\|ICloneable" --include=*.cs src/

# record co field kieu collection thay doi duoc
grep -rnE "record .*\(.*(List|Dictionary|HashSet)<" --include=*.cs src/
```

Three questions for a code review:

1. Does this class have a **mutable** reference-typed field? If so, is `Clone` shallow or deep?
2. Is there a test asserting **the original didn't change** after editing the copy?
3. Does this `record` contain a `List<T>`? If so, it isn't as immutable as the name suggests.

## Related Topics

- [Prototype](../skills/prototype.md) — cloning, and the three ways to deep-copy
- [Memento](../skills/memento.md) — the same shallow/deep trap, in an undo context
- [Case study — Design Patterns](index.md)
