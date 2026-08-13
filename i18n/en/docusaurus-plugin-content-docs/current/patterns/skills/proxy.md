---
title: Proxy
sidebar_position: 12
description: "Step in before the real object is touched — a lazy proxy saves 1 query when it isn't used, and produces N+1 when it is."
tags: [proxy, structural, gof, lazy-loading, n-plus-one]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Proxy

> **Takeaway:** A proxy preserves the interface and steps in between — so the caller **doesn't know**
> it's holding a proxy. That's both the strength and the trap: a lazy proxy turns an innocent-looking loop
> into N+1 queries, and the code shows no sign of it.

## Goal

Add control around access to an object — deferring creation, checking permissions, counting, calling over
the network — without editing that object and without editing the caller.

## The original intent (GoF)

Provide a surrogate or placeholder for another object to control access to it.

The four classic variants:

| Kind | Controls what | Example in .NET |
|---|---|---|
| **Virtual** | Defers creation/loading until genuinely needed | EF Core lazy loading, `Lazy<T>` |
| **Protection** | Who may call | A permission check before entry |
| **Remote** | Location — the object lives in another process/machine | A gRPC client, an auto-generated HTTP client |
| **Smart** | Side work on access | Reference counting, logging, timing |

## Worked example — orders and their line items

Run with `dotnet run 17-proxy.cs` on .NET 11.0.0. `GiaLapCsdl` counts the queries.

### 1. A virtual proxy when the data is **not** touched

```csharp
sealed class DonHang(string ma, GiaLapCsdl db)
{
    private List<Dong>? _chiTiet;
    public List<Dong> ChiTiet => _chiTiet ??= db.NapChiTiet(ma);   // lazy: load on first touch
}
```

```text
=== 1. Lazy proxy: tot khi khong dung toi ===
  Liet ke 3 don, khong cham chi tiet: 1 truy van
```

Exactly as advertised: just listing the order codes costs no queries for the line items.

### 2. The same proxy, when the data **is** touched

```csharp
foreach (var d in ds) tong += d.ChiTiet.Sum(c => c.Tien);   // each touch -> 1 query
```

```text
=== 2. Cung lazy proxy: N+1 khi co cham toi ===
  Cong tong 750,000: 4 truy van  (1 + 3 = N+1)
```

**Four queries for three orders.** With 500 orders it's 501 — and the line of code causing it
(`d.ChiTiet`) looks exactly like an ordinary property access.

This is the inherent blind spot: the proxy succeeds so well that the reader **can't see** there's I/O
there. Over a 500-element list, one harmless property lookup becomes 500 network round trips.

### 3. Eager loading

```text
=== 3. Nap san (eager): 1 truy van ===
  Cong tong 750,000: 1 truy van
```

The same result of `750,000`, with **1 query instead of 4**. In EF Core this is
`.Include(d => d.ChiTiet)`.

### 4. A protection proxy

```csharp
sealed class ProxyKiemQuyen(ITaiLieu that, string nguoiDung) : ITaiLieu
{
    private static readonly HashSet<string> _duocPhep = ["giam_doc", "ke_toan"];
    public string Doc() => _duocPhep.Contains(nguoiDung)
        ? that.Doc()
        : throw new UnauthorizedAccessException($"{nguoiDung} khong duoc doc");
}
```

```text
=== 4. Protection proxy ===
  giam_doc  : noi dung cua bang-luong.xlsx
  thuc_tap  : TU CHOI (thuc_tap khong duoc doc)
```

### 5. A smart proxy

```text
=== 5. Smart proxy: dem va do ===
  so lan doc: 4
```

### Before and after

| | No proxy (eager) | Virtual proxy |
|---|---|---|
| Listing 3 orders without viewing line items | 1 query (with redundant data) | 1 query |
| Summing 3 orders | 1 query | **4 queries** |
| Summing 500 orders | 1 query | **501 queries** |
| The load-causing site visible in the code | `.Include(...)` — explicit | `d.ChiTiet` — invisible |
| Memory when you only need the list | loads the line items too | just the list |

The full failure case: [A lazy proxy producing N+1 queries](../case-studies/lazy-proxy-sinh-n-cong-mot-query.md).

## How to detect proxy-induced N+1

| Approach | What to do |
|---|---|
| **Count queries in a test** | An EF Core interceptor counting `CommandExecuted`; assert the query count ≤ a threshold |
| **Turn lazy loading off by default** | EF Core: don't enable `UseLazyLoadingProxies`. A missing `Include` becomes an explicit error rather than a silent load |
| **Log queries in the dev environment** | Seeing 501 identical lines makes it obvious immediately |
| **Forbid touching navigation properties outside the repository** | A clear boundary: where I/O is allowed and where it isn't |

The second row is the strongest measure and also the default recommendation: **with lazy loading off, N+1
can't happen silently** — it turns into an exception or an empty list, and both get caught by tests.

## Proxy and Decorator are shape-identical

| | Proxy | [Decorator](decorator.md) |
|---|---|---|
| Intent | Controlling access | Adding behaviour |
| Does the caller know | Usually not | Yes — they chose the wrapping |
| Number of wrapping layers | Usually 1 | Several, meaningfully stacked |
| Who creates the real object | Usually the proxy | The caller creates it and passes it in |

The last row is the clearest test: if the wrapper **decides for itself when to create** the inner
object, it's a Proxy; if it receives an already-existing object, it leans towards Decorator.

## When NOT to use it

| Situation | Why |
|---|---|
| Creating the real object is already cheap | Laziness only adds a `null` check and a blind spot |
| You need the I/O cost to be visible at the call site | A proxy hides exactly what you want to see |
| Authorization needs rich context (who, what, when) | A proxy only knows what it wraps; use a dedicated authorization layer |
| The object is small and always used | Eager loading is simpler and takes fewer queries |

## Trade-offs

| You gain | You lose |
|---|---|
| Cost is deferred until genuinely needed | The cost becomes **invisible** at the call site → N+1 |
| Add permission checks / logging without editing the original class | One layer of indirection while debugging |
| The caller needs to know nothing | Not knowing also means not being able to control it |
| A remote object is used like a local one | Network failures appear at what looks like a memory access |

That last row is the remote proxy's trap, and the reason the
[Fallacies of Distributed Computing](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing)
open with "the network is reliable": a property lookup has no `try/catch`, but a network
call needs one.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Enabling lazy loading by default across the project | N+1 appears everywhere and nobody notices until production is slow |
| Touching a navigation property inside a loop | 1 + N queries — exactly the output in section 2 above |
| A proxy swallowing the real object's errors | Like [an adapter swallowing errors](adapter.md); data goes missing with nobody knowing |
| A lazy proxy that isn't thread-safe | Two threads touching it → two loads, or corrupted state |
| Putting the permission check after the cache | See [Decorator](decorator.md#order-a--cache-wrapping-outside-the-permission-check) — a hole in authorization |
| A proxy holding a reference to a heavy object after it's no longer needed | A memory leak; the real object never gets collected |

## FAQ

<details>
<summary>Is <code>Lazy&lt;T&gt;</code> a proxy?</summary>

It's precisely a virtual proxy, in library form. The difference: `Lazy<T>` **doesn't implement T's
interface**, so the caller has to write `.Value` — the cost becomes **visible**.

That's an advantage, not a defect. `lazy.Value` inside a loop looks suspicious;
`d.ChiTiet` does not.

</details>

<details>
<summary>Should EF Core lazy loading be enabled?</summary>

By default **no**, and that's the right choice for most projects. The reason is in the section 2 output:
it turns a cost into something invisible.

Enable it when: the domain model is complex, most code paths don't touch the relationships, and you
**already have** query-counting tests to block regressions. Without that last part, don't enable it.

</details>

<details>
<summary>Writing a proxy for a 20-method interface means typing it 20 times?</summary>

Three ways out:

1. **Split the interface smaller** — usually the right answer, see
   [ISP](../reference/solid.md#i--interface-segregation).
2. **`DispatchProxy`**, built into .NET — generates a proxy at run time via reflection. The price:
   slower, no compile-time checking, unfriendly to AOT.
3. **A source generator** — generates the code at compile time, keeping both the speed and the type checking.

</details>

## Related Topics

- [Decorator](decorator.md) — the same shape, a different intent
- [Adapter](adapter.md) — wraps but **changes** the interface
- [Facade](facade.md) — a simpler entrance for several things
- [Flyweight](flyweight.md) — also stands in the middle, but to save memory
- [Singleton](singleton.md) — `Lazy<T>` is the safe initialisation route for both

## References

- GoF — *Design Patterns*, Proxy
- Microsoft — *Lazy Loading of Related Data* (EF Core)
