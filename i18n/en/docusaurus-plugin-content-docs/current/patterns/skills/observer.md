---
title: Observer
sidebar_position: 19
description: "One place changes, many places learn of it — and two reproducible traps: forget to unsubscribe and the object is never collected, and one throwing observer stops the ones after it."
tags: [observer, behavioral, gof, event, memory-leak]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Observer

> **Takeaway:** In C#, Observer is `event` — the implementation isn't the problem. The two real problems:
> **forgetting `-=` is a memory leak** (proven with a `WeakReference` below), and **one throwing
> observer means the observers after it never run**.

## Goal

Let several places react when one place changes, without the source needing to know how many places are
listening — and without creating the two classic bugs that come with it.

## The original intent (GoF)

Define a one-to-many relationship between objects so that when one object changes state, all its dependents
are notified and updated automatically.

```csharp
sealed class GiaCoPhieu
{
    public event Action<decimal>? Doi;
    public void Dat(decimal g) => Doi?.Invoke(g);
}
```

C#'s `event` **is** the Subject + the Observer list, with `+=` and `-=` built in.

## Worked example — a stock price

Run with `dotnet run 24-observer.cs` on .NET 11.0.0.

### Trap 1 — a memory leak, proven with the GC

```csharp
WeakReference TaoRoiBo(GiaCoPhieu n, bool huy)
{
    var ob = new BangDieuKhien();
    n.Doi += ob.Nhan;
    n.Dat(100m);
    if (huy) n.Doi -= ob.Nhan;
    return new WeakReference(ob);
}
```

This function creates an observer, subscribes, then returns — the `ob` variable goes out of scope. After
`GC.Collect()`, if nobody is holding it any more, `WeakReference.IsAlive` should be `false`.

```text
=== Ro ri bo nho: quen huy dang ky ===
  Sau GC, observer con song? True  <- true nghia la BI RO RI
  So nguoi dang ky con lai: 1
  Co huy dang ky, con song? False
  So nguoi dang ky con lai: 0
```

**`True` means the GC couldn't collect it.** The source (`GiaCoPhieu`) holds the delegate, the delegate
holds the observer's `this` — so as long as the source is alive, every observer that ever subscribed stays
alive.

This is a dangerous class of leak because the direction of dependency is **the opposite of intuition**: you
think the observer depends on the source, but it's the source holding the observer. A `static event` or a
singleton service is enough to keep alive every ViewModel ever opened for the application's whole lifetime.

The full failure case:
[An event holding an object away from the GC](../case-studies/su-kien-giu-doi-tuong-khong-cho-gc.md).

### Trap 2 — one observer throws and the ones after it are skipped

```csharp
n3.Doi += g => log.Add($"A thay {g}");
n3.Doi += g => throw new InvalidOperationException("B hong");
n3.Doi += g => log.Add($"C thay {g}");
```

```text
=== Mot observer nem -> cac observer sau bi bo qua ===
  nem: InvalidOperationException: B hong
  observer da chay: [A thay 101]   <- C khong bao gio chay
```

`Doi?.Invoke(g)` calls the delegates in the list in turn; an exception in the second one means the rest
**never run**. Observer `C` is entirely innocent and entirely skipped.

The practical consequence: the notifier is killed by a receiver's bug, and the receivers that subscribed
later (usually the features added most recently) silently disappear.

### The fix — isolate each observer

```csharp
foreach (var a in _ds)
{
    try { a(g); }
    catch { loi++; }        // isolate: one broken observer doesn't block the ones after it
}
```

```text
=== Cach lam: co lap tung observer ===
  observer da chay: [A thay 101, C thay 101]
  so observer nem loi: 1
```

In real code that `catch` has to **log** rather than swallow — but the principle stands: one listener's
error must not spread to another listener, and must not kill the source.

### Trap 3 — the call order is the subscription order

```text
=== Thu tu goi = thu tu dang ky (khong duoc dua vao) ===
  thu ba -> thu nhat
```

The first-subscribed delegate prints `"thu ba"` and the second prints `"thu nhat"` — and they run in
subscription order, not by name. That sounds obvious, but the subscription order depends on module
initialisation order, and it is **not a contract of any kind**.

If your logic needs B to run after A, Observer is the wrong pattern. Use
[Chain of Responsibility](chain-of-responsibility.md) or call them explicitly in sequence.

### Before and after

| | A direct call | Observer |
|---|---|---|
| The source knows who listens | yes | no |
| Adding a listener | edit the source | `+=` somewhere else |
| Execution order | explicit in the code | subscription order, not guaranteed |
| One listener fails | only it fails | **blocks the ones after it** |
| Lifetime | irrelevant | the source holds the listener — a leak if you forget `-=` |
| Tracing the flow while debugging | read it directly | you must find every `+=` |

## How to prevent the leak, in order of preference

| Approach | When |
|---|---|
| **Unsubscribe in `Dispose`** | The default. If a class subscribes to events, it should be `IDisposable` |
| **The observer's lifetime equals the source's** | No unsubscribe needed — for example both are singletons |
| **The weak event pattern** | When you don't control the observer's lifetime (a UI framework) |
| **`IObservable<T>` + `IDisposable`** | Rx returns an `IDisposable` from `Subscribe` — forcing you to think about stopping |

The last one is notable: `IObservable<T>` designs the API so that **unsubscribing is something you hold
in your hand**, rather than a `-=` call that's easy to forget somewhere else.

## When NOT to use it

| Situation | Why |
|---|---|
| There's one fixed listener | Call it directly — the flow is readable and there's no leak |
| The order of the reactions matters | Observer guarantees no order |
| You need the listener's result | An event is one-way; use a call with a return value |
| The reaction must be in the same transaction | Listeners run synchronously but their failures are hard to fold into a transaction |
| A cascade of events (A → B → C → A) | An event loop, extremely hard to trace |

## Trade-offs

| You gain | You lose |
|---|---|
| The source doesn't know who listens — add and remove freely | The execution flow disappears from the code; you debug by hunting `+=` |
| Several reactions to one change | No guaranteed order |
| Loosely coupled modules | A memory leak if you forget `-=` |
| It's built into the language (`event`) | One failing observer blocks the rest |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Forgetting `-=` when the observer's life ends | A leak — `IsAlive` still `True` as in the output above |
| Subscribing to a `static event` | The observer lives for the whole process lifetime |
| Not isolating listeners' exceptions | Listeners that subscribed later never run |
| `+=` the same handler twice | The handler runs twice; `-=` only removes one |
| Relying on subscription order | Changing module initialisation order changes behaviour |
| A listener doing heavy work synchronously | The source is blocked; consider pushing onto a queue |
| `Doi.Invoke(g)` without the `?.` | A `NullReferenceException` when nobody has subscribed |

The fourth row is worth remembering: `+=` with the same handler twice is common when a view gets
re-initialised — and the symptom is "the email was sent twice", not "an error".

## FAQ

<details>
<summary>Use <code>event</code>, <code>IObservable&lt;T&gt;</code>, or a message bus?</summary>

| | Scope | Unsubscribing | Suits when |
|---|---|---|---|
| `event` | In-process, one-to-many | `-=`, easy to forget | Simple, few listeners |
| `IObservable<T>` (Rx) | In-process | Returns an `IDisposable` — harder to forget | You need to filter, combine, throttle an event stream |
| A message bus / queue | Across processes | Configuration | You need durability, retries, several services |

Work down from the top and choose the first one that suffices.

</details>

<details>
<summary>How does the weak event pattern work?</summary>

The source holds a `WeakReference` to the observer rather than a strong reference. When the observer is
collected, the corresponding entry in the list becomes empty and gets cleaned up on the next publish.

The price: significantly more complexity, and **behaviour that depends on the GC** — an observer may stop
receiving notifications at an unpredictable moment. Only use it when you genuinely don't control the
lifetime; for code you own, a correct `Dispose` is always better.

</details>

<details>
<summary>How does Observer differ from Mediator?</summary>

See [Mediator](mediator.md#faq): Observer is one-way and the source doesn't know who listens;
Mediator is two-way and the mediator knows everyone and has coordination rules.

If you find yourself writing an `if` inside a handler to decide "in this case do nothing" —
coordination logic is leaking into the observer, and Mediator may be the right place for it.

</details>

## Related Topics

- [Mediator](mediator.md) — two-way, with coordination rules
- [Chain of Responsibility](chain-of-responsibility.md) — when order and the right to stop matter
- [Command](command.md) — the event made into an object, queueable
- [Coupling and cohesion](../reference/coupling-cohesion.md) — events lower coupling but make the flow invisible
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the symptom lookup table

## References

- GoF — *Design Patterns*, Observer
- Microsoft — *Observer Design Pattern* (.NET), `IObservable<T>` / `IObserver<T>`
