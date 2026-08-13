---
title: Decorator
sidebar_position: 9
description: "Add behaviour without touching the original class — and the wrapping order changes the semantics: put the cache outside the permission check and an intern can read the payroll."
tags: [decorator, structural, gof, composition, cross-cutting]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Decorator

> **Takeaway:** Decorator adds behaviour by wrapping while preserving the interface — so several layers
> can be stacked. The price is that **the wrapping order becomes an invisible design decision**:
> both orders compile, both run, and one of the two punches a hole in your authorization.

## Goal

Add cross-cutting concerns — logging, caching, retries, timing, permission checks — to a service without
editing that service class, and without multiplying the class count by the combinations.

## The original intent (GoF)

Attach additional responsibilities to an object **at run time**. Decorator is a flexible alternative to
inheritance for extending functionality.

```csharp
interface IKho { string Doc(string nguoiDung, string ma); }

sealed class BocCache(IKho trong) : IKho          // implements the same interface
{
    private readonly Dictionary<string, string> _cache = [];
    public string Doc(string nguoiDung, string ma) { ... trong.Doc(...) ... }
}
```

Three mandatory characteristics: **implement the same interface** as the thing it wraps, **hold a
reference** to that thing, and **forward the call** inwards.

## Worked example — a payroll data store

Run with `dotnet run 14-decorator.cs` on .NET 11.0.0. Two decorators: `BocCache` and
`BocKiemQuyen`. Only `ke_toan` and `giam_doc` may view the payroll.

### Order A — Cache wrapping **outside** the permission check

```csharp
IKho a = new BocCache(new BocKiemQuyen(kho));
```

```text
=== Thu tu A: Cache boc NGOAI KiemQuyen  (cache truoc, kiem sau) ===
  ke toan  doc BL-01: bang luong BL-01 = 82.500.000
  thuc tap doc BL-01: bang luong BL-01 = 82.500.000  [cache]
  so lan kiem quyen that su chay: 1
```

**The intern can read the payroll.** Accounting reads first, the result goes into the cache; the next time
the cache answers immediately and **the permission layer is never called** — the counter stops at 1.

This isn't an implementation bug. Both `BocCache` and `BocKiemQuyen` are correct against their own
specifications. The bug is in the **order**, and the order lives on one line in `Program.cs` that no
test looks at.

### Order B — the permission check wrapping **outside** the cache

```csharp
IKho b = new BocKiemQuyen(new BocCache(kho));
```

```text
=== Thu tu B: KiemQuyen boc NGOAI Cache  (kiem truoc, cache sau) ===
  ke toan  doc BL-01: bang luong BL-01 = 82.500.000
  thuc tap doc BL-01: TU CHOI (thuc_tap khong duoc xem BL-01)
  so lan kiem quyen that su chay: 2
```

The permission check runs **every time**, and the cache still works at the layer below:

```text
=== So lan cham kho that (cache co chay khong) ===
  thu tu A: 1   thu tu B: 1
```

Both orders touch the real store only once — **the cache loses no effectiveness** by sitting inside.
This is the important point: order B doesn't trade performance for safety, it's simply more
correct.

### The rule that follows

| Decorator group | Position | Why |
|---|---|---|
| Authorization, authentication, input validation | **Outermost** | Must run for every call, never skipped by a cache |
| Logging, timing, tracing | Outside, immediately after authorization | You want to see the rejected calls too |
| Caching | In the middle | After authorization, before retries |
| Retries, circuit breakers, timeouts | **Innermost**, next to the source | Only retry the real operation, not the already-cached part |

### The order also changes the log line count

```text
=== Log ngoai vs trong Retry: dem so dong log ===
  Log(Retry(kho)) -> ton kho SP-9 = 42, so dong log = 1
  Retry(Log(kho)) -> ton kho SP-9 = 42, so dong log = 3
```

The same pair of decorators, the same returned result, **1 log line versus 3**. Which is correct depends
on the question you want the log to answer: *"how many requests were there"* (outside) or *"how many times
did we touch the external system"* (inside).

### Before and after

| | Editing the original class | Decorator |
|---|---|---|
| Adding a cache | edit `KhoThat` | add 1 class, don't touch `KhoThat` |
| Cache on in this environment, off in that one | add an `if` flag in the original class | change one wiring line |
| Testing `KhoThat` in isolation | you must disable the cache with a flag | `KhoThat` doesn't know the cache exists |
| Combinations of cache × retry × log | 2³ = 8 `if` branches | 3 classes, composed at run time |
| The order of application | plainly visible in the code | **invisible**, living at the wiring site |

The full failure case: [Swapping the decorator order punches a hole in authorization](../case-studies/doi-thu-tu-decorator-mat-cache.md).

## Decorator in real .NET

| Where you meet it | Example |
|---|---|
| `Stream` | `new GZipStream(new BufferedStream(new FileStream(...)))` — a decorator chain exactly |
| ASP.NET Core middleware | Each middleware wraps the next; the `app.Use...` order *is* the wrapping order |
| `HttpClient` `DelegatingHandler` | Retries, logging, adding headers — the same mechanism |
| DI container | Scrutor: `services.Decorate<IKho, BocCache>()` |

ASP.NET Core middleware is the most memorable example, because its official documentation devotes a whole
section to warning about **order** — the same lesson as above, at framework scale.

## When NOT to use it

| Situation | Why |
|---|---|
| There's only one added behaviour, and it's always on | Writing it into the original class reads more easily |
| You need to add a **new method**, not modify an existing one | Decorator preserves the interface; see [Visitor](visitor.md) or an extension method |
| Wrapping more than 4–5 layers | Nobody can reason out the correct order; gather it into a factory that builds the standard configurations |
| The added behaviour needs state shared between the wrapping layers | Decorators are independent by design; use [Mediator](mediator.md) or merge them |

## Trade-offs

| You gain | You lose |
|---|---|
| The original class knows nothing about caching/logging/retries | The wrapping order is an invisible decision that no test naturally catches |
| Turning each concern on and off by configuration | Long, hard-to-read stack traces |
| `2ⁿ` configurations from `n` classes | Debugging goes through n forwarding layers |
| Each concern is testable in isolation | Nowhere sees the whole final behaviour |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Putting the cache outside the permission check | A hole in authorization — exactly the order-A output above |
| Putting retries outside the cache | Retrying the already-cached part; meaningless and it corrupts your metrics |
| A decorator changing the interface (adding a method) | It can no longer wrap; that's an Adapter, not a Decorator |
| Forgetting to call `trong.Doc(...)` on one branch | The chain breaks silently and the behaviour disappears |
| A stateful decorator registered with the wrong lifetime | A singleton cache wrapping a scoped service → data leaks between requests |
| Having no test for the wiring **order** | Order is the easiest thing to get wrong and the least tested thing |

That last row is the concrete action to take: write a test that builds the exact chain from the real
composition root, then asserts *"a user without permission is refused even when the data is already in the
cache"*.

## FAQ

<details>
<summary>How does Decorator differ from Proxy?</summary>

In shape: identically — the same interface, holding a reference, forwarding the call.

In intent: Decorator **adds behaviour** and the caller *deliberately chooses* how many layers to wrap.
[Proxy](proxy.md) **controls access** and the caller usually *doesn't know* it's holding a
proxy.

The test: does wrapping two of the same kind make sense? `Cache(Cache(x))` is meaningless → Proxy.
`Log(Retry(x))` is meaningful → Decorator.

</details>

<details>
<summary>With many decorators, where do I wire them up neatly?</summary>

Use Scrutor with the DI container:

```csharp
services.AddScoped<IKho, KhoThat>();
services.Decorate<IKho, BocCache>();        // boc lan 1
services.Decorate<IKho, BocKiemQuyen>();    // boc lan 2 — nam NGOAI cung
```

The `Decorate` order goes **inside out**: the last call is the outermost layer. This is exactly the place
people get wrong, so write a comment right there stating the intended order.

</details>

<details>
<summary>If the interface has 15 methods, does the decorator have to write 15 forwarding methods?</summary>

Yes, and that's a sign the interface is too wide — see
[ISP](../reference/solid.md#i--interface-segregation). Two ways out:

1. Split the interface by caller need, and decorate the small one.
2. Use `DispatchProxy` (built into .NET) to generate a dynamic proxy — paying with reflection,
   losing compile-time checking, and struggling with AOT.

Way 1 is nearly always better.

</details>

## Related Topics

- [Proxy](proxy.md) — the same shape, a different intent
- [Composite](composite.md) — also a tree, but many children instead of one
- [Composition over inheritance](../reference/composition-over-inheritance.md) — Decorator is this principle incarnate
- [Adapter](adapter.md) — wraps but **changes** the interface
- [Chain of Responsibility](chain-of-responsibility.md) — also a chain, but each link may stop it

## References

- GoF — *Design Patterns*, Decorator
- Microsoft — *ASP.NET Core Middleware*, the "Middleware order" section
