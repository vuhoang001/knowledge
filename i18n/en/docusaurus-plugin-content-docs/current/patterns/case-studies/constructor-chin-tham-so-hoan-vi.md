---
title: Printing 183 sheets became 242
sidebar_position: 3
description: "Two adjacent int parameters swapped in a constructor — compiles cleanly, runs, and every print order wastes 59 extra sheets."
tags: [case-study, builder, constructor, type-safety]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Printing 183 sheets became 242

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 09-builder.cs`
> on .NET 11.0.0.

## Context

An internal document printing service. The print-order class has six parameters, four of them the same
`int` type:

```csharp
sealed class DonInCu(string tep, int soTrang, int soBan, int tuTrang, bool haiMat, bool mauSac)
{
    public int SoToGiay() => (int)Math.Ceiling(soTrang / (haiMat ? 2.0 : 1.0)) * soBan;
}
```

A new feature calls it from somewhere else:

```csharp
var don = new DonInCu("bao-cao.pdf", 3, 121, 1, true, false);
```

## Symptoms

The admin office reports: *"the printer ran out of paper mid-morning, and the sheet count on the cost report
doesn't match."*

```text
  y dinh : tep=bao-cao.pdf soTrang=121 soBan=3 tuTrang=1 haiMat=True mau=False
  go nham: tep=bao-cao.pdf soTrang=3 soBan=121 tuTrang=1 haiMat=True mau=False
  Trinh bien dich bao gi? khong gi ca — ca hai deu hop le
  So to giay: dung=183  nham=242
```

**183 sheets became 242** — 59 extra sheets per order, 32%.

What makes it hard to trace: the system **still prints the correct document**. The content isn't wrong, only
the number of copies and the pages per copy are swapped. With short documents nobody notices.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The printer driver miscounts | The wrong number is in the paper count | Count one order by hand: it matches exactly what the system reported |
| The `Math.Ceiling` formula is wrong for odd numbers | 121 is odd and it's double-sided | Run the formula alone with 121 and 3: it gives 183, correct |
| The user entered it wrong | The easiest thing to blame | The input log shows the user entered exactly 121 pages, 3 copies |
| There are two paths creating a print order, one newly added | Nearly right | Right — but you have to read carefully to see the two swapped parameters |

The first three hypotheses all aim at the *calculation*, because the number is wrong so the calculation looks
like the suspect. The calculation is entirely correct; **its input is wrong**.

## The real cause

`soTrang` and `soBan` are the same `int` type, adjacent, and were called in reverse order.

```csharp
new DonInCu("bao-cao.pdf", 3, 121, ...)   // 3 trang, 121 ban
new DonInCu("bao-cao.pdf", 121, 3, ...)   // 121 trang, 3 ban
```

The compiler has nothing to object to: both are `int`, both are in a valid range. There's no type
distinguishing "page count" from "copy count".

The detail that let it survive review: `ceil(121/2)*3 = 183` and `ceil(3/2)*121 = 242` — two
numbers of **the same order of magnitude**. Nothing looks unusual.

With `bool` it's worse still: swapping `haiMat` and `mauSac` gives a single-sided colour document instead of
double-sided black and white — and a cost many times more than 32%.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| A unit test for `SoToGiay()` | Green | The test calls the constructor in the right order |
| The compiler | Silent | Four parameters of the same `int` type |
| Code review | Missed it | Six numbers on one line and nobody cross-checks the positions |
| Integration tests | Green | They check the document's content, not the copy count |
| Analyzers | Silent | There's no rule about the order of same-typed parameters |

**No tool in the chain has the information to catch this bug**, because that information (which parameter is
which) exists only in the parameter *names*, and the parameter names aren't present at the call site.

## The fix

### The cheapest way — named arguments

```csharp
var don = new DonInCu("bao-cao.pdf", soTrang: 121, soBan: 3, tuTrang: 1, haiMat: true, mauSac: false);
```

Not a line changes in the class. It buys readability immediately, but it **doesn't enforce**:
the next caller is still free not to use the names.

### More solid — an object initializer with `required`

```csharp
var don = new DonIn { Tep = "bao-cao.pdf", SoTrangIn = 121, SoBanIn = 3, HaiMat = true, MauSac = false };
```

```text
=== C# co san: object initializer + required ===
  tep=bao-cao.pdf soTrang=121 soBan=3 haiMat=True mau=False
```

`required` forces an assignment — the compiler blocks it when missing. Every value has a name at the call
site, and **can't not** have one.

### When you need cross-checks — [Builder](../skills/builder.md)

```csharp
var qua = new DonInBuilder("bao-cao.pdf").SoTrang(121).SoBan(3).MatTruocSau().Build();
```

```text
=== Build() la cho kiem tra bat buoc ===
  nem: InvalidOperationException: chua khai SoTrang
  nem: ArgumentOutOfRangeException: SoBan phai >= 1 (Parameter '_soBan')
```

`Build()` is the only place that sees the whole state — where a rule like *"if it's double-sided the page
count must be even"* can go.

### The most thorough way — a distinct type per quantity

```csharp
readonly record struct SoTrang(int Gia Tri);
readonly record struct SoBan(int GiaTri);
```

Now a swap **doesn't compile**. More expensive (many small types, `.GiaTri` everywhere),
but right for quantities that are easily confused: currencies, units of measure, IDs of different
entities.

### A selection table

| Approach | Enforces | Effort | Choose when |
|---|---|---|---|
| Named arguments | no | 0 | A quick fix, one call site |
| `required` + an initializer | yes (forces assignment) | low | **The default** |
| Builder | yes + cross-checks | medium | There are rules between fields |
| Distinct types | yes (blocks swaps) | high | Easily confused quantities used across the whole system |

## How to spot it early

```bash
# Constructor tu 4 tham so tro len co tham so cung kieu lien nhau
grep -rnE 'public [A-Z][A-Za-z]*\((int|decimal|bool|string)[^)]*(int|decimal|bool|string)[^)]*\)' --include=*.cs src/
```

Three questions for a code review:

1. Are there two parameters of **the same type** side by side? That's a place a swap can happen.
2. Does the call site use parameter names? With bare numbers the reader can't verify anything.
3. If you swapped these two parameters, would any test go red? No → write that test first.

The third question is the best and cheapest test: **swap them deliberately and run the tests.** If everything
stays green, you've just found a real hole.

## Related Topics

- [Builder](../skills/builder.md) — building over several steps and where cross-checks go
- [Prototype](../skills/prototype.md) — building a variant from a template configuration
- [Case study — Design Patterns](index.md)
