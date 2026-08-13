---
title: Prototype
sidebar_position: 5
description: "Clone instead of rebuilding — and the biggest trap is that both MemberwiseClone and a record's with are shallow copies, so editing the copy changes the original."
tags: [prototype, creational, gof, deep-copy, record]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Prototype

> **Takeaway:** Prototype itself is simple — clone an existing object instead of rebuilding it. All the
> difficulty is in **shallow versus deep**, and both `MemberwiseClone` and C#'s `record ... with`
> are **shallow**. The output below shows editing the copy changing the original.

## Goal

Block the most expensive class of copying bug: two variables you think are two objects, in fact sharing
one `List` inside — so whichever one you edit changes both.

## The original intent (GoF)

Create a new object by copying a prototype object, rather than calling a constructor.

The original 1994 reason was *creation is expensive* (file reads, queries, building a tree). The more
common reason in 2026 is *wanting a variant of an existing configuration* — the same mechanism, a
different motive.

## Worked example — a report configuration

Run with `dotnet run 10-prototype.cs` on .NET 11.0.0.

```csharp
sealed class CauHinhBaoCao(string ten, List<string> cot, Nguong nguong)
{
    public string Ten { get; set; } = ten;
    public List<string> Cot { get; set; } = cot;
    public Nguong Nguong { get; set; } = nguong;

    public CauHinhBaoCao SaoChepNong() => (CauHinhBaoCao)MemberwiseClone();
    public CauHinhBaoCao SaoChepSau()  => new(Ten, [.. Cot], Nguong.Ban());
}
```

### The shallow copy — editing the copy changes the original

```csharp
var nong = goc.SaoChepNong();
nong.Ten = "Doanh thu quy - ban sao";
nong.Cot.Add("san_pham");
nong.Nguong.GiaTri = 5000m;
```

```text
=== Sao chep nong (MemberwiseClone) ===
  ban sao: ten="Doanh thu quy - ban sao" cot=[ngay,khu_vuc,san_pham] nguong=5000
  ban GOC: ten="Doanh thu quy" cot=[ngay,khu_vuc,san_pham] nguong=5000
  Cot cua goc bi them chua? CO — hong
  Nguong cua goc bi doi chua? CO — hong
```

Read those first three lines carefully: **`Ten` separated fine, `Cot` and `Nguong` didn't.** That is
precisely the definition of a shallow copy — it copies *each field's value*, and for a reference-typed
field that value is an **address**, not the contents.

`Ten` separated because it's immutable: assigning a new `Ten` creates a different string rather than
editing the old one. This is where the trap gets dangerous — some fields *appear* to separate correctly,
making people believe the whole object did.

### The deep copy

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

`[.. Cot]` is a collection expression (C# 12) — building a new `List` with the same elements.
`Nguong.Ban()` clones itself. The original keeps `[ngay,khu_vuc]` and `1000`.

### `record` + `with` is **also** a shallow copy

This is the most commonly overlooked part, because `record` is advertised as "immutable":

```csharp
record CauHinhRecord(string Ten, List<string> Cot);

var r1 = new CauHinhRecord("Doanh thu quy", new List<string> { "ngay" });
var r2 = r1 with { Ten = "Ban sao" };
r2.Cot.Add("khu_vuc");
```

```text
=== record + with cung la sao chep NONG ===
  r1.Cot = [ngay, khu_vuc]
  r2.Cot = [ngay, khu_vuc]
  Cung mot List? True
```

**`ReferenceEquals(r1.Cot, r2.Cot)` returns `True`.** A `record` is immutable at the level of *its own
reference*; it does nothing about what it points at. A `record` holding a `List<T>`
is a mutable object in immutable clothing.

The fix: use an immutable collection.

```csharp
record CauHinhBatBien(string Ten, ImmutableArray<string> Cot);

var i1 = new CauHinhBatBien("Doanh thu quy", ["ngay"]);
var i2 = i1 with { Cot = [.. i1.Cot, "khu_vuc"] };
```

```text
=== record voi collection bat bien thi an toan ===
  i1.Cot = [ngay]
  i2.Cot = [ngay, khu_vuc]
```

### Before and after

| | Shallow | Deep |
|---|---|---|
| `string`, `int`, `decimal` | separates correctly | separates correctly |
| `List`, `Dictionary`, child objects | **shared** | separates correctly |
| Cost | O(number of fields) | O(size of the tree) |
| Writing it | one line of `MemberwiseClone` | you must handle each reference-typed field |
| Cycles in the object graph | doesn't care | **infinite recursion** unless you track visited nodes |
| Safe to hand the copy to another thread | no | yes |

## Three ways to deep-copy in C#

| Way | Pro | Con |
|---|---|---|
| **Writing it by hand**, field by field | Fastest, complete control | Add a field and forget to update `Clone` and it breaks silently |
| **Serialize then deserialize** (`System.Text.Json`) | One line, no field forgotten | Slow; loses non-serializable fields; loses the real type of a polymorphic object |
| **Using immutable records from the start** | No copying needed at all | Has to be designed in early; allocation cost when changing a lot |

The "con" column of the first way is a real and common bug: **a hand-written `Clone()` gets no reminder
from the compiler when the class gains a new field.** If you choose that way, write a test comparing the
property count via reflection with the number of assignment lines in `Clone` — or choose the third way.

## When NOT to use it

| Situation | What to do instead |
|---|---|
| A fully immutable object | No copying needed — sharing the reference is safe |
| Creation is cheap | A constructor is clearer than `Clone()`; see [Builder](builder.md) |
| You only need to change one or two fields | `record` + `with`, provided every field is immutable |
| The object holds an OS resource (a file handle, a connection) | Cloning a handle is meaningless; use a factory |

## Trade-offs

| You gain | You lose |
|---|---|
| No need to re-run an expensive construction | You must maintain `Clone` in parallel with the field list |
| You can clone an object without knowing its concrete type | `MemberwiseClone` bypasses the constructor — internal invariants can break |
| Building a variant from a template configuration | Shallow/deep is an invisible decision at the call site |
| An independent copy, thread-safe (if deep) | A deep copy costs memory and time linear in the tree |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Thinking `MemberwiseClone` is a deep copy | The copy shares a collection — exactly the first output above |
| Thinking `record` + `with` gives an independent object | `ReferenceEquals` returns `True`; a very hard bug to trace because a `record` "looks immutable" |
| Adding a new field and forgetting to update `Clone()` | The new field ends up shared; the bug shows up weeks later |
| Deep-copying a graph containing a cycle | `StackOverflowException` |
| Implementing `ICloneable` | That interface **doesn't say whether it's shallow or deep** — Microsoft recommends against using it |
| Deep-copying with JSON for a class with inheritance | The copy loses the derived type and becomes the base type |

That fifth row is worth remembering: `ICloneable` is one of the few BCL interfaces that Microsoft itself
advises avoiding — because its contract is ambiguous in exactly the place that matters most.

## FAQ

<details>
<summary>How do I know whether a class needs a shallow or a deep copy?</summary>

Ask one question: *"are the copy and the original allowed to affect each other?"*

- The copy is a **snapshot** for comparing later → deep.
- The copy is **another view** of the same data → shallow, and it should be named
  `TaoKhungNhin()` rather than called `Clone()`.

When in doubt, choose deep: it's more expensive, but when it's wrong you find out immediately, whereas a
wrong shallow copy shows up weeks later.

</details>

<details>
<summary>Is deep-copying with JSON acceptable in production?</summary>

Fine for small configuration objects copied rarely. Not fine inside a hot loop —
serialize + deserialize is orders of magnitude more expensive than assigning fields.

Three blind spots to know before choosing it: `private` fields without setters are lost; polymorphic types
lose their real type; types without a converter (like `IntPtr`) throw.

</details>

<details>
<summary>How does Prototype relate to the "registry of prototypes" in the GoF book?</summary>

It does. The GoF also describe a *prototype manager*: a lookup table from a key to a prototype object, with
`Tao(khoa)` returning a copy of the prototype.

That shape is almost identical to a [Factory Method](factory-method.md) with a registry — differing in
exactly one point: a factory **calls a constructor**, a prototype registry **clones an
already-configured prototype**. Choose prototype when the configured prototype is the expensive part to build.

</details>

## Related Topics

- [Builder](builder.md) — building from scratch rather than cloning
- [Memento](memento.md) — also snapshots state, but to restore rather than to create anew
- [Flyweight](flyweight.md) — the opposite direction: **sharing** instead of cloning
- [Composition over inheritance](../reference/composition-over-inheritance.md) — `record` and `with`
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the symptom lookup table

## References

- GoF — *Design Patterns*, Prototype
- Microsoft — *ICloneable Interface*, the Remarks section (recommending against use)
