---
title: Adapter
sidebar_position: 6
description: "Translate a third-party API into the shape you need — and the biggest trap is an adapter swallowing errors, turning a system incident into no data."
tags: [adapter, structural, gof, anti-corruption-layer]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Adapter

> **Takeaway:** An adapter translates an API's *shape* into the shape you need. The hard part isn't
> translating data types — it's translating **errors**. An adapter that swallows exceptions turns a
> system incident into "no data", and a report comes out short of money with nobody knowing.

## Goal

Isolate every place your code touches an external library or service, so that switching providers doesn't
mean editing everywhere — and so that their errors don't bleed into your logic.

## The original intent (GoF)

Convert one class's interface into the interface the caller expects, letting two things that don't
otherwise fit work together.

```csharp
// Cai minh CAN
interface ITyGia { decimal? LayTyGia(string ma); }

// What the third party HAS — returns a string, throws its own exception type
sealed class ThuVienTyGiaBenThuBa
{
    public string FetchRate(string code) => ...;   // throws ExternalRateApiException
}
```

The adapter sits in between. Three things it translates, in increasingly forgettable order: **the data
type** (`string` → `decimal`), **the name** (`FetchRate` → `LayTyGia`), and **the errors**.

## Worked example — exchange rates from an external service

Run with `dotnet run 11-adapter.cs` on .NET 11.0.0.

### An adapter that swallows errors — the most common way to write it, and wrong

```csharp
sealed class AdapterNuotLoi(ThuVienTyGiaBenThuBa tv) : ITyGia
{
    public decimal? LayTyGia(string ma)
    {
        try { return decimal.Parse(tv.FetchRate(ma)); }
        catch { return null; }                       // swallows absolutely everything
    }
}
```

```text
=== Adapter nuot loi ===
  USD: 25,400.50
  JPY: 165.20
  XXX: (khong co du lieu)
```

It looks perfectly reasonable: a non-existent code returns `null`. The problem is that `catch { }` can't
distinguish *"that currency code doesn't exist"* from *"the service is down"*, *"the token expired"*, or
*"the parse failed because they changed the number format"*. All four become `null`.

### The consequence in the report

```csharp
decimal Tong(ITyGia tg, (string ma, decimal tien)[] dong)
{
    decimal t = 0;
    foreach (var d in dong) t += d.tien * (tg.LayTyGia(d.ma) ?? 0m);
    return t;
}
```

```text
=== Hau qua tren bao cao ===
  Tong voi adapter nuot loi : 4,192,050 VND   <- thieu tien, khong bao gi
  Tong voi adapter dich loi : dung lai — khong tra duoc ty gia cho "XXX"
```

**The number 4,192,050 is a wrong number that looks like a right one.** There's no warning flag, no log
line, no `null` for anyone to check. The row `("XXX", 50m)` simply contributed 0 VND.

### An adapter that translates errors into your own language

```csharp
sealed class AdapterDichLoi(ThuVienTyGiaBenThuBa tv) : ITyGia
{
    public decimal? LayTyGia(string ma)
    {
        try { return decimal.Parse(tv.FetchRate(ma)); }
        catch (ExternalRateApiException e) { throw new KhongTraCuuDuocTyGia($"khong tra duoc ty gia cho \"{ma}\"", e); }
    }
}
```

```text
=== Adapter dich loi sang ngon ngu cua minh ===
  USD: 25,400.50
  JPY: 165.20
  XXX: nem KhongTraCuuDuocTyGia: khong tra duoc ty gia cho "XXX"
```

Two important points in those four lines of code:

1. **`catch` on the specific type**, not a bare `catch`. Unrelated failures (out of memory, task
   cancellation) go straight up where they belong.
2. **Keep the original exception as the inner exception.** Not keeping it loses the other side's stack
   trace — and you'll be debugging blind.

### Before and after

| | Swallowing errors | Translating errors |
|---|---|---|
| A wrong currency code | `null` | an exception naming the code |
| The service is down | `null` | an exception, stopping the pipeline |
| They change the number format | `null` | a wrapped `FormatException` |
| The report | comes out short, looking normal | stops, with a message |
| Someone reading the calling code | thinks `null` means "there isn't one" | knows the two states are different |
| Monitoring alerts | nothing to alert on | a countable, alertable exception |

The full failure case:
[An adapter swallowing errors into an empty list](../case-studies/adapter-nuot-loi-thanh-danh-sach-rong.md).

## Three common variants

| Variant | Shape | Use when |
|---|---|---|
| **Object adapter** | The adapter *contains* the target object | The default. Composition, swappable at run time |
| **Class adapter** | The adapter *inherits* the target object | C# has single inheritance only, so it's rare; and it drags in [inheritance's problems](../reference/composition-over-inheritance.md) |
| **Two-way adapter** | Implements both interfaces | When two systems must both see each other; rare, and hard to maintain |

In .NET, an `Extension method` is a lightweight kind of adapter: it "adds" a method to an existing type
without editing that type. But it can't swap the implementation at run time, so it doesn't replace a real
adapter when you need to plug in a fake for testing.

## Adapter and the anti-corruption layer

A one-class adapter is a tactic. When a whole external system pours in, what you need is an
**anti-corruption layer** (the DDD term): a layer of several adapters + your own model, ensuring their
*concepts* don't leak into yours.

Signs you need to escalate from an adapter to an ACL:

| Sign | Means |
|---|---|
| Their DTO types appear in your business function signatures | Their model has already leaked in |
| You have to copy their enum into your code to compare against it | Their vocabulary is becoming your vocabulary |
| Switching providers means editing more than 3 files outside the integration directory | The boundary has been breached |

## When NOT to use it

| Situation | Why |
|---|---|
| You own both sides and can edit them | Fix the interface directly; don't add a permanent translation layer |
| The library already has a sensible interface | An adapter forwarding 1:1 is dead code |
| It's used in exactly one place, once | Call it directly; an adapter earns its cost from 2 call sites up |

## Trade-offs

| You gain | You lose |
|---|---|
| Switching providers edits one class | One more layer, one more jump while debugging |
| You can test the logic without the external service | You must maintain the mapping when their API changes |
| Their types and exceptions don't leak into your code | You can lose information if the mapping isn't rich enough |
| One single place to add retries, caching, logging | Easy to bloat into a place that holds business logic |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| `catch { return null; }` | A system incident becomes "no data" — the 4,192,050 report above |
| `catch (Exception)` instead of the specific type | Swallows `OperationCanceledException` and `OutOfMemoryException` too |
| Throwing a new exception without keeping the inner one | Loses the other side's stack trace; you debug by guessing |
| Letting their DTO types escape past the adapter | Switching providers means editing everywhere — the adapter loses all its value |
| Stuffing business logic into the adapter | The logic sits in the integration layer where nobody will find it |
| An adapter forwarding 1:1 with no translation | A completely redundant layer |

## FAQ

<details>
<summary>How does Adapter differ from Facade?</summary>

An adapter changes the **shape** of *one* thing to fit what you need — the number of things is unchanged,
the interface changes.

A [Facade](facade.md) **hides** *several* things behind a simpler entrance — the number
drops, and the new interface is one you invented rather than one matching something existing.

The test: if removing the intermediate class still lets the caller write the same line of code (only with a
different method name), it's an Adapter. If the caller would have to write 7 lines, it's a Facade.

</details>

<details>
<summary>Return <code>null</code> or throw when something isn't found?</summary>

Separate two different questions:

- *"Not found"* is a **legitimate result** → return `null` or an `Option`/`Result`, and name the
  method clearly (`ThuLayTyGia`).
- *"Couldn't look it up"* is an **incident** → throw.

The mistake in the example above isn't returning `null`, it's **merging both** into the same `null`.
If the other side's API can't distinguish those two cases, the adapter is precisely where you must — by
reading the HTTP status, their error code, or whatever signal exists.

</details>

<details>
<summary>Should I write adapters for the standard library (<code>HttpClient</code>, <code>DateTime</code>)?</summary>

Yes, for the **non-deterministic** things: time, randomness, the filesystem, the network. Not to switch
providers, but for testing — see
[DIP](../reference/solid.md#d--dependency-inversion).

No, for pure computation and immutable things (`Math`, `string`). There's nothing to fake there.

</details>

## Related Topics

- [Facade](facade.md) — hiding many things, not changing one thing's shape
- [Decorator](decorator.md) — the same wrapping shape, but **preserving** the interface
- [Proxy](proxy.md) — also preserves the interface, but to control access
- [Bridge](bridge.md) — designs two axes up front; Adapter is firefighting after the fact
- [SOLID](../reference/solid.md) — an incarnation of D and I

## References

- GoF — *Design Patterns*, Adapter
- Eric Evans — *Domain-Driven Design*, "Anticorruption Layer"
