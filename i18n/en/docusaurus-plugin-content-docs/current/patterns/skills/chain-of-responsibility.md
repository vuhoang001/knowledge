---
title: Chain of Responsibility
sidebar_position: 13
description: "A chain of handlers where whoever accepts it stops — and two traps: nobody accepting is silent, and reordering makes every request fall into the first link."
tags: [chain-of-responsibility, behavioral, gof, middleware]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Chain of Responsibility

> **Takeaway:** The sender doesn't know who will handle it — that's both the strength and the trap. Two
> things have to be decided explicitly: the **order** of the links, and **what happens when nobody
> accepts**. Skipping the second means requests vanish without a trace.

## Goal

Replace a long `if/else if` chain — where each branch is a different *handler* — with a
list you can compose at run time.

## The original intent (GoF)

Avoid coupling the sender of a request to its receiver by giving several objects a chance to handle it.
Chain them and pass the request along the chain until someone handles it.

```csharp
abstract class NguoiXuLy : INguoiXuLy
{
    public INguoiXuLy? Tiep { get; set; }
    public string? Xu(YeuCau y) => Nhan(y) ? $"{GetType().Name} duyet" : Tiep?.Xu(y);
    protected abstract bool Nhan(YeuCau y);
}
```

## Worked example — approving refunds by limit

Run with `dotnet run 18-chain.cs` on .NET 11.0.0.

| Approver | Accepts when |
|---|---|
| `TruongCa` (shift lead) | the refund is ≤ 1,000,000 |
| `QuanLy` (manager) | the refund is ≤ 10,000,000 |
| `GiamDoc` (director) | any refund, no limit |

### Trap 1 — nobody accepts, and nothing reports it

```text
=== Chuoi khong co nguoi chot ===
  hoan tien       200,000 -> TruongCa duyet
  hoan tien     8,000,000 -> QuanLy duyet
  hoan tien    90,000,000 -> GiamDoc duyet
  doi hang         50,000 -> (khong ai xu ly — im lang)
```

The first three lines are correct. The fourth is an *exchange* request — no link in this chain accepts
it, and the `Tiep?.Xu(y)` at the last link returns `null`.

**That `null` goes straight out.** If the caller doesn't check, the exchange request disappears:
no error, no log, no dead-letter queue. The customer waits forever with no response.

### The fix — always have a terminal link

```csharp
var chuoi2 = Noi(new TruongCa(), new QuanLy(), new GiamDoc(), new ChotSo());
```

```text
=== Chuoi co nguoi chot o cuoi ===
  hoan tien       200,000 -> TruongCa duyet
  hoan tien     8,000,000 -> QuanLy duyet
  hoan tien    90,000,000 -> GiamDoc duyet
  doi hang         50,000 -> ChotSo duyet
```

`ChotSo` accepts everything. In real code it should **log and then throw**, or push into a queue for
manual handling — what matters isn't that it can handle it, but that **nothing falls out silently**.

The return type should say so too: `string?` invites forgetting the `null` check. A
`KetQua` type with two explicit branches (`DaXuLy` / `KhongAiNhan`) forces the caller to handle both.

### Trap 2 — the order decides the result

```csharp
var chuoi3 = Noi(new GiamDoc(), new TruongCa(), new QuanLy(), new ChotSo());
```

```text
=== Thu tu doi ket qua: dat GiamDoc len dau ===
  hoan tien       200,000 -> GiamDoc duyet
  hoan tien     8,000,000 -> GiamDoc duyet
  hoan tien    90,000,000 -> GiamDoc duyet
  doi hang         50,000 -> ChotSo duyet
```

**Every refund is now approved by the director**, including one of 200,000 VND. No error, no
warning — the chain still works exactly as defined, it's just that the business process is now wrong.

The rule: **the narrowest link goes first.** And because the order is an invisible business decision
living in the wiring code, it needs its own test.

The full failure case: [The request falls through the whole chain](../case-studies/request-roi-qua-het-chain.md).

### Before and after

| | `if/else if` | Chain |
|---|---|---|
| Adding an approval level | edit a function | add 1 class + 1 wiring line |
| Reordering | edit a function | change the wiring order |
| Configuring per branch office | no | wire a different chain per branch |
| No branch matches | `else` — the compiler makes you think about it | returns `null` **silently** |
| Reading the flow | all visible in one function | you have to find the wiring site |

The fourth row is the thing to remember: a chain **loses** what `if/else` gives for free — mandatory
attention on the final branch.

## Two variants

| Variant | Behaviour | Use when |
|---|---|---|
| **Stop at the first acceptor** | As in the example above | Approvals, routing, authorization |
| **Go through the whole chain, everyone runs** | No early `return` | A processing pipeline: authenticate → log → compress |

The second variant is exactly ASP.NET Core's **middleware**, and it's closer to
[Decorator](decorator.md) than to the original Chain of Responsibility. The difference: middleware has the
right *not* to call the next one (short-circuiting), which puts it between the two patterns.

## When NOT to use it

| Situation | Why |
|---|---|
| Only 2–3 fixed branches | A `switch` reads directly and the compiler checks exhaustiveness |
| You always know for certain who handles it | Call it directly; a chain only adds indirection |
| You need **several** handlers running and aware of each other's results | See [Mediator](mediator.md) or a stateful pipeline |
| The order must not be wrong and nobody remembers it | If you still use it, you must have a test locking the order |

## Trade-offs

| You gain | You lose |
|---|---|
| Add/remove/reorder handlers without touching old code | The order becomes an invisible decision at the wiring site |
| The sender doesn't know who handles it | Debugging is harder: you must walk the chain to see who accepted |
| The chain is configurable per environment, per tenant | Nothing guarantees anyone accepts |
| Each handler is testable in isolation | The traversal cost is linear in the chain's length |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| No terminal link at the end | Requests vanish silently — exactly the first output |
| Returning `null` for "nobody accepted" | The caller forgets to check; use a more explicit result type |
| Putting a broad link first | Everything falls into it — exactly the third output |
| A link holding its own state between requests | One request affects another; links should be stateless |
| A chain with a cycle (A → B → A) | Infinite recursion |
| A link that both handles it and calls the next | Two links handle it; the "whoever accepts it stops" semantics break |

## FAQ

<details>
<summary>How does Chain of Responsibility differ from Decorator?</summary>

The right to stop. In a [Decorator](decorator.md), every wrapping layer runs and calls the next — skipping
one is a bug. In a chain, **stopping early is normal behaviour**.

The consequence: a decorator doesn't change the business result (it only adds logging or caching); a chain
decides the result itself.

</details>

<details>
<summary>Chain it with a <code>Tiep</code> pointer or with a <code>List</code>?</summary>

A `List` + a loop is nearly always better in application code:

```csharp
foreach (var h in _danhSach) { var r = h.Thu(y); if (r is not null) return r; }
throw new KhongAiXuLy(y);
```

The reasons: the order is **plainly visible** in one place rather than inferred by following pointers; a
cycle becomes unconstructible; and there's no `Tiep` state on the handlers themselves (so they're reusable
across several chains).

The GoF's `Tiep` pointer version makes more sense when the chain is built dynamically, in pieces, in
several places.

</details>

<details>
<summary>How do I test the chain's order?</summary>

Write tests targeting **the real chain built from the composition root**, not each individual link:

```csharp
[Fact] void Hoan_tien_nho_phai_do_truong_ca_duyet()
    => Assert.Equal("TruongCa duyet", ChuoiThat().Xu(new YeuCau("hoan tien", 200_000m)));
```

One test per business threshold. These tests are cheap and catch exactly the reordering bug — the kind of
bug that unit tests of individual links will never see.

</details>

## Related Topics

- [Decorator](decorator.md) — also a chain, but every link runs
- [Command](command.md) — the request made into an object, often used alongside a chain
- [Mediator](mediator.md) — when you need coordination rather than just forwarding
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the symptom lookup table
- [SOLID](../reference/solid.md) — an incarnation of O

## References

- GoF — *Design Patterns*, Chain of Responsibility
- Microsoft — *ASP.NET Core Middleware*
