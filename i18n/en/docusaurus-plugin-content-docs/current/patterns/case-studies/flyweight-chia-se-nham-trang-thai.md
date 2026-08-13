---
title: Colour one cell, the whole table turns red
sidebar_position: 10
description: "A flyweight's shared style object has a setter — editing one cell edits it for everyone pointing at it, and 6 of 6 cells change colour."
tags: [case-study, flyweight, immutability, shared-state]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Colour one cell, the whole table turns red

> **Label: a reconstructed situation.** Every number was really produced by
> `dotnet run cs-flyweight-mutable.cs` on .NET 11.0.0.

## Context

A web spreadsheet with 500,000 cells. Memory is a real problem, and
[Flyweight](../skills/flyweight.md) solved it correctly:

```text
=== 500,000 o du lieu, moi o co dinh dang hien thi ===
  Khong flyweight: 111,986,656 bytes  (224.0 bytes/o)
  Co flyweight   : 23,996,928 bytes  (48.0 bytes/o)
  Ty le: 4.67x
```

112 MB down to 24 MB. The style store:

```csharp
sealed class KieuO { public required string DinhDang { get; set; } public required string Mau { get; set; } }

sealed class KhoKieu
{
    private readonly Dictionary<string, KieuO> _kho = [];
    public KieuO Lay(string dd, string mau) { ... return _kho[k] = new KieuO { DinhDang = dd, Mau = mau }; }
}
```

The next sprint, a "change a cell's text colour" feature is added.

## Symptoms

A user colours **one** cell red. The entire column — in fact every cell using the same format —
turns red.

```text
=== Truoc khi doi ===
          0.00 [#333333]
      1,000.00 [#333333]
      2,000.00 [#333333]
  so doi tuong kieu: 1

=== Nguoi dung to DO o thu 3 ===
          0.00 [#ff0000]
      1,000.00 [#ff0000]
      2,000.00 [#ff0000]
      3,000.00 [#ff0000]
  so o bi doi mau: 6 / 6   <- ky vong 1
```

**6 of 6 cells changed colour**, where 1 was expected.

On a real 500,000-cell sheet, one colouring action changes hundreds of thousands of cells — and the user
has no way to undo back to the previous state, because the information "which cell was originally which
colour" has been overwritten.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The wrong range was selected — the user highlighted the whole column | The easiest | It reproduces with exactly one cell selected, `selection.length == 1` in the log |
| The rendering shares a style at the CSS layer | The right kind of symptom | Inspect the DOM: each cell has its own inline style, and **that value is already red** |
| The colour-change event is emitted to several cells | Plausible for an event architecture | Count the handler calls: exactly one |
| The render cache wasn't invalidated | The classic | Turn the render cache off and it's still red |

The first three hypotheses all aim at the **presentation layer**, because the symptom is about colour. The
data was already wrong at the model layer.

## The real cause

`KieuO` is an object **shared** between 500,000 cells, and it has a **setter**.

```csharp
o[2].Kieu.Mau = "#ff0000";           // sua doi tuong DUNG CHUNG
```

That line doesn't edit cell 2. It edits **the style object every cell is pointing at**.

This is the direct flip side of the thing that saved 88 MB: if 500,000 cells all point at one
object, then editing that object edits it for all 500,000.

**Flyweight's entire value rests on one assumption: the shared object is immutable.**
That assumption is written down nowhere, and whoever added the colour feature had no way of
knowing.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Memory-saving tests | Green | It still saves 4.67x — in fact it **saves more**, because no new style is created |
| A test for "changing a cell's colour changes that cell's colour" | Green | That cell **does** change colour. The assertion is correct but incomplete |
| A test that the flyweight returns the same instance | Green | `ReferenceEquals` is still `True` — exactly as designed |
| The compiler | Silent | A `set` on a property is legal |
| The colour-change PR review | Missed it | One assignment line, looking harmless |

The second row is the lesson: **a correct assertion that isn't enough.** The test needs the negative half
too — *"the other cells didn't change"*:

```csharp
[Fact] void Doi_mau_mot_o_khong_dung_toi_o_khac()
{
    var bang = TaoBang(6);
    bang[2].DoiMau("#ff0000");
    Assert.Equal(1, bang.Count(o => o.Mau == "#ff0000"));   // <- ve bi thieu
}
```

The first row is even more notable: the memory metric **improves** while the bug is happening, because no
new style object is created. The metric you use to prove the pattern is working is the very metric hiding
the bug.

## The fix

### Make the shared object immutable

```csharp
record KieuOBatBien(string DinhDang, string Mau);

sealed class KhoKieuBatBien
{
    private readonly Dictionary<KieuOBatBien, KieuOBatBien> _kho = [];
    public KieuOBatBien Lay(string dd, string mau)
    {
        var mau2 = new KieuOBatBien(dd, mau);
        if (_kho.TryGetValue(mau2, out var v)) return v;
        return _kho[mau2] = mau2;
    }
}
```

Changing the colour now means **asking for a different style**, not editing the existing one:

```csharp
o2[2] = o2[2] with { Kieu = kho2.Lay("#,##0.00", "#ff0000") };
```

```text
=== Cach dung: kieu bat bien, xin kieu MOI ===
          0.00 [#333333]
      1,000.00 [#333333]
      2,000.00 [#ff0000]
      3,000.00 [#333333]
  so o bi doi mau: 1 / 6
  so doi tuong kieu: 2
```

**1 of 6 cells changed colour**, and the style store grew from 1 to 2 — exactly as expected.

The `record` here does two things at once: it's immutable, and it has value-based `Equals`/`GetHashCode`
so it can be used directly as a `Dictionary` key without hand-building a key string.

### Enforce immutability rather than relying on convention

| Level | How |
|---|---|
| Weak | A comment `// KHONG duoc sua — dung chung` |
| Medium | `init`-only properties, or `readonly` fields |
| Strong | A `record` with read-only properties, or a `readonly record struct` |
| Strongest | The store returns a getter-only interface, with the implementing class `internal` |

A comment isn't a mechanism. From "medium" up, the compiler rejects the line
`o[2].Kieu.Mau = ...`.

### Watch the store's size

With immutable styles, each new combination creates an object. If users pick colours freely
(16 million values), the store can grow larger than what it saves:

```csharp
if (_kho.Count > NGUONG) { /* canh bao, hoac chuyen sang khong flyweight */ }
```

This is a trade-off to monitor, not one to choose once.

## How to spot it early

```bash
# Doi tuong dung chung co setter
grep -rnB3 "Dictionary<.*, Kieu\|_kho\[" --include=*.cs src/ | grep "set;"
```

Three questions for a code review:

1. Is this object **shared** between several owners? If so, does it have any `set`?
2. Is there a test asserting **the other elements didn't change** after an operation?
3. Does the flyweight store have a size limit, and where do its keys come from?

The second question is the one that catches this case, and it applies equally to
[Prototype](../skills/prototype.md) and [Memento](../skills/memento.md) — the same family of bug.

## Related Topics

- [Flyweight](../skills/flyweight.md) — separating intrinsic and extrinsic state
- [Prototype](../skills/prototype.md) — the same family of bug: unintended reference sharing
- [Case study — Design Patterns](index.md)
