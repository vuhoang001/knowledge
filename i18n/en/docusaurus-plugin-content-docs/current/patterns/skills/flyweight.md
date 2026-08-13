---
title: Flyweight
sidebar_position: 11
description: "Separate the shared intrinsic state from the per-instance extrinsic state — measured for real at 112 MB down to 24 MB for 500,000 data cells."
tags: [flyweight, structural, gof, memory, performance]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Flyweight

> **Takeaway:** Flyweight is the **only GoF pattern whose goal is purely memory**.
> Don't use it until you've **measured** and seen the number. Measured for real below: 500,000 data cells,
> 112 MB down to 24 MB — but only because the shared state made up most of each object.

## Goal

Reduce memory when there are **very many** near-identical objects, by recognising that most of their
content is a copy of the same few values.

## The original intent (GoF)

Use sharing to support large numbers of fine-grained objects efficiently.

The core concept is splitting the state in two:

| Kind | Meaning | Spreadsheet cell example |
|---|---|---|
| **Intrinsic** | Context-independent, **shareable** | Number format, font, font size, colour, alignment |
| **Extrinsic** | Unique to each instance | The cell's value |

Split correctly, `n` objects only hold the extrinsic part + one reference to the shared intrinsic
part.

## Worked example — 500,000 spreadsheet cells

Run with `dotnet run 16-flyweight.cs` on .NET 11.0.0. Measured with `GC.GetTotalMemory(true)`
before and after allocation.

### Before — each cell holds everything

```csharp
sealed class ODuLieuNang(decimal giaTri, string dinhDang, string font, int coChu, string mau, string canLe)
{
    public decimal GiaTri = giaTri;
    public string DinhDang = dinhDang;
    public string Font = font;
    public int CoChu = coChu;
    public string Mau = mau;
    public string CanLe = canLe;
}
```

Importantly, each cell **allocates its own strings**, exactly as when loading row by row from a database —
not string literals the CLR has already interned:

```csharp
string Rieng(string s) => new(s.AsSpan());
day[i] = new ODuLieuNang(i * 1000m, Rieng("#,##0.00"), Rieng("Arial"), 11, Rieng("#333333"), Rieng("phai"));
```

### After — a shared style store

```csharp
sealed class ODuLieuNhe(decimal giaTri, KieuO kieu)
{
    public decimal GiaTri = giaTri;
    public KieuO Kieu = kieu;
}

static class KhoKieu
{
    private static readonly Dictionary<string, KieuO> _kho = [];
    public static KieuO Lay(string dinhDang, string font, int coChu, string mau, string canLe)
    {
        var khoa = $"{dinhDang}|{font}|{coChu}|{mau}|{canLe}";
        if (_kho.TryGetValue(khoa, out var k)) return k;
        return _kho[khoa] = new KieuO(dinhDang, font, coChu, mau, canLe);
    }
}
```

### The measured result

```text
=== 500,000 o du lieu, moi o co dinh dang hien thi ===
  Khong flyweight: 111,986,656 bytes  (224.0 bytes/o)
  Co flyweight   : 23,996,928 bytes  (48.0 bytes/o)

  Ty le: 4.67x
  So doi tuong kieu that su ton tai: 1 (cho 500,000 o)
```

**112 MB down to 24 MB.** One `KieuO` object serves half a million cells.

```text
=== Kho kieu tra ve CUNG mot the hien ===
  ReferenceEquals(k1, k2) = True
  So kieu sau khi xin them: 1
```

`ReferenceEquals` returning `True` is the proof the mechanism works — asking twice for the same set of
attributes returns the same object, and the store's style count doesn't grow.

### Before and after

| | Without flyweight | Flyweight |
|---|---|---|
| Memory / cell | 224 bytes | 48 bytes |
| Total for 500,000 cells | 112 MB | 24 MB |
| Style objects | 500,000 | 1 |
| Changing the font for the whole sheet | walk 500,000 cells | change 1 object (if permitted) — or ask for a new style |
| Changing the font for **one** cell | assign directly | you must ask for a different `KieuO` — **you must not edit the shared one** |
| Code complexity | low | plus a store, plus keys, plus a lifetime to think about |

**That second-to-last row is the main trap.** The shared object must be **immutable**; editing it edits it
for everyone pointing at it. The failure case:
[Flyweight sharing the wrong state](../case-studies/flyweight-chia-se-nham-trang-thai.md).

### This number depends heavily on the intrinsic / extrinsic ratio

If each cell had only one shared string instead of four, the saving ratio drops sharply. The rough formula:

```text
tiet kiem ≈ (kich thuoc phan noi tai) / (kich thuoc ca object)
```

That's why you must **measure first**: the same pattern with the same object count can give 4.67x
or 1.05x depending on the shape of the data.

## Flyweight is already in .NET

| Mechanism | Is a flyweight for |
|---|---|
| String interning | String literals — every `"abc"` in an assembly is the same object |
| `string.Intern()` | Strings computed at run time, deliberately put in the shared table |
| Boxing caches for `bool`, `byte`, small `int` | Some boxed values get reused |
| `ArrayPool<T>` / `MemoryPool<T>` | Not strictly flyweight but the same motive: reuse instead of allocate |

**Be careful with `string.Intern()`:** an interned string is **never reclaimed** for the whole
lifetime of the process. Interning user input is a genuine way to leak memory.

## When NOT to use it

| Situation | Why |
|---|---|
| You haven't measured and just "feel like it uses a lot of RAM" | Flyweight adds a whole infrastructure layer; don't pay that for a hypothesis |
| Fewer than a few tens of thousands of objects | The saving can't repay the complexity |
| The intrinsic part is small relative to the whole object | The saving ratio is close to 1 |
| The objects need to **change** the shared part | Impossible; the shared part has to be immutable |
| A more suitable data structure already exists | For example columnar data (`decimal[]` + an `int[]` of style indices) — less memory and faster |

That last row deserves serious consideration: for tabular data, moving to a **columnar** layout usually
beats flyweight in both memory and traversal speed.

## Trade-offs

| You gain | You lose |
|---|---|
| Memory drops in proportion to the intrinsic part | A store, keys, and one table lookup |
| Fewer objects → lighter GC | The store holds references forever → you must think about lifetime and leaks |
| Better cache locality when traversing | One more pointer hop to reach an attribute |
| Comparing styles with `ReferenceEquals`, very fast | The shared object is **required** to be immutable — easy to violate silently |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Giving the shared object a setter | Editing one place changes everything — a very hard bug to trace |
| An unbounded flyweight store with keys derived from user data | A memory leak; the store grows larger than what it saves |
| Using `string.Intern()` on input data | The strings are never reclaimed |
| Applying it without measuring | You pay the complexity and get a 3% saving |
| A static store that isn't thread-safe | A race when several threads ask for a new style — use a `ConcurrentDictionary` |
| Putting extrinsic state into the shared object | Two cells with different values share the same object — wrong data |

## FAQ

<details>
<summary>How do I measure memory correctly in .NET?</summary>

`GC.GetTotalMemory(forceFullCollection: true)` before and after, as in this page's example — enough
for a relative comparison, and remember `GC.KeepAlive` so the array isn't collected part-way through.

For more precision: `GC.GetTotalAllocatedBytes(precise: true)` measures total allocated (including
already-collected), or use BenchmarkDotNet with `[MemoryDiagnoser]` — it can break allocations down
by GC generation.

The absolute numbers always depend on the platform (64-bit, pointer size, padding). What you can trust
is the **ratio**.

</details>

<details>
<summary>Is Flyweight a cache?</summary>

No, though it looks like one. A cache trades **memory for time** and is allowed to forget (eviction).
Flyweight trades **one table lookup for memory** and **must not forget** — forgetting means two cells
that were sharing suddenly become two different objects.

The design consequence: a flyweight store usually has no TTL, and therefore you must bound the number of
keys that can be created.

</details>

<details>
<summary>Can a <code>record</code> be used as a flyweight?</summary>

Yes, and it fits rather well: a `record` is immutable already, and it has value-based
`Equals`/`GetHashCode` so it works as a `Dictionary` key without hand-building a key string:

```csharp
record KieuO(string DinhDang, string Font, int CoChu, string Mau, string CanLe);
private static readonly ConcurrentDictionary<KieuO, KieuO> _kho = new();
public static KieuO Lay(KieuO mau) => _kho.GetOrAdd(mau, mau);
```

In exchange: you have to create a temporary `KieuO` on every lookup — cheap, but not free inside a hot
loop.

</details>

## Related Topics

- [Prototype](prototype.md) — the opposite direction: cloning instead of sharing
- [Singleton](singleton.md) — also "one shared instance", but for one specific object
- [Proxy](proxy.md) — also stands in the middle, but to control rather than to save
- [Composite](composite.md) — leaf nodes in a large tree are a common place to apply flyweight
- [Coupling and cohesion](../reference/coupling-cohesion.md) — a static store is common coupling

## References

- GoF — *Design Patterns*, Flyweight
- Microsoft — *String.Intern Method*, the Remarks section (the lifetime warning)
