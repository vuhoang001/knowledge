---
title: Singleton
sidebar_position: 1
description: "Exactly one shared instance — and three measurable reasons why you should nearly always replace it with a DI container's singleton lifetime."
tags: [singleton, creational, gof, dependency-injection]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Singleton

> **Takeaway:** Singleton solves *"there must only be one"*, but the way it solves it is **a global
> variable with a wrapper**. In modern C#, what you need is nearly always
> `services.AddSingleton<T>()` — the same "one instance", but without the three side effects
> below.

## Goal

Learn to separate two questions that get merged into one:

1. *"The system should have exactly one instance of this"* — usually a correct requirement.
2. *"That class manages the only-one part itself, and anyone can call it directly"* — this is the harmful part.

The Singleton pattern answers both at once. A DI container answers the first and drops the
second — which is why it wins.

## The original intent (GoF)

Ensure a class has only one instance, and provide a global point of access to it.

```csharp
sealed class CauHinhSingleton
{
    private static readonly CauHinhSingleton _i = new();
    public static CauHinhSingleton Instance => _i;
    private CauHinhSingleton() { }
}
```

A `private` constructor blocks `new`, and a `static` field holds the single instance. This version is
**thread-safe** thanks to the CLR's guarantees about static field initialisation — a hand-written `if
(_i is null)` version is not; see point 2 below.

## Worked example — three ways it breaks, all three reproducible

Run with `dotnet run 06-singleton.cs` on .NET 11.0.0.

### 1. State leaking between tests

```csharp
void TestA() { CauHinhSingleton.Instance.Dat("moi_truong", "test"); }
void TestB() { /* expecting to read null */ }
```

```text
=== 1. Ro ri trang thai giua cac test ===
 Chay rieng TestB:
  TestB doc: (khong co)  <- ky vong (khong co)
 Chay TestA roi TestB (thu tu alphabet cua test runner):
  TestA doc: test
  TestB doc: test  <- ky vong (khong co)
```

**The same `TestB`, two results.** It's green run alone and red run after `TestA` — the most
time-consuming class of bug, because the symptom depends on **ordering** rather than on the
code. Renaming one test is enough to make it appear or disappear.

The full case: [Tests green alone, red together](../case-studies/test-xanh-rieng-do-chung.md).

### 2. Hand-written lazy initialisation isn't thread-safe

The `if (_i is null)` version that a lot of material still copies:

```csharp
public static KetNoiNgayTho Instance
{
    get
    {
        if (_i is null)
        {
            Thread.Sleep(20);            // simulate slow init: widen the race window
            Interlocked.Increment(ref SoLanTao);
            _i = new KetNoiNgayTho();
        }
        return _i;
    }
}
```

```text
=== 2. Lazy khong khoa — bao nhieu the hien that su duoc tao? ===
  Kieu ngay tho : da goi constructor 8 lan (mong doi 1)
  Dung Lazy<T>  : da goi constructor 1 lan (mong doi 1)
```

**Eight instances.** Eight threads got through the `if` before any of them managed to assign. If the
constructor opens a connection, opens a file, or registers into a registry, you just did that eight
times — and the other seven instances float around until the GC collects them.

The `Thread.Sleep(20)` only **widens** the race window so it happens reliably on every run.
Without it the bug still exists, just more rarely — which means harder to reproduce, not
safer.

The correct way if you do need laziness:

```csharp
private static readonly Lazy<KetNoiLazy> _i = new(() => new KetNoiLazy());
public static KetNoiLazy Instance => _i.Value;
```

`Lazy<T>` defaults to `LazyThreadSafetyMode.ExecutionAndPublication` — exactly one factory
call, with the other threads waiting.

### 3. A hidden dependency — invisible in the constructor

```csharp
sealed class DichVuDatHang
{
    public string MoTa() => $"...{CauHinhSingleton.Instance.Doc("moi_truong")}...";
}
```

```text
=== 3. Phu thuoc an — fan-out khong hien trong constructor ===
  Fan-out theo constructor : 0
  Phu thuoc that su        : 1 (CauHinhSingleton, goi ben trong method)
  doc cau hinh tu singleton: moi_truong=test
```

**Measured fan-out is 0, real fan-out is 1.** Every dependency-analysis tool — including the eye of
a human reading the signature — misses it. This is the worst kind of coupling on the
[coupling](../reference/coupling-cohesion.md#seven-levels-of-coupling-loosest-to-tightest) scale:
*common coupling*, and it's invisible.

### Before and after — replacing it with DI

```csharp
// Program.cs
services.AddSingleton<ICauHinh, CauHinh>();

// Lop dung
sealed class DichVuDatHang(ICauHinh cauHinh)
{
    public string MoTa() => $"...{cauHinh.Doc("moi_truong")}...";
}
```

| | Self-managed Singleton | `AddSingleton` |
|---|---|---|
| Instances at run time | 1 | 1 |
| The dependency appears in the signature | no | **yes** |
| Replacing it with a fake in a test | requires adding a `Reset()` back door | pass it straight into the constructor |
| State leaking between tests | yes | no — each test builds its own container |
| Changing to "one instance per tenant" | rewrite the class | change one registration line |

**The first two rows are identical — that's the whole point.** You lose nothing on the "only one"
requirement; you only drop the "anyone can call it directly" part.

## When a (self-managed) Singleton is still right

| Case | Why it's acceptable |
|---|---|
| An **immutable**, stateless object, say a constant lookup table | There's nothing to leak between tests |
| Code with no DI container and no intention of having one (a script, a small tool) | The cost of setting up a container exceeds the benefit |
| The framework requires it (some older .NET extension points) | There's no choice |

Note all three revolve around **having no mutable state**. As long as a Singleton can `set`
anything, the three problems above remain intact.

## Trade-offs

| You gain | You lose |
|---|---|
| Certainty of exactly one instance | Global state — leaking between tests, between requests |
| Access from anywhere, no need to pass parameters | The dependency doesn't appear in the signature; measured fan-out is wrong |
| Lazy initialisation, only paid for when actually used | Hand-writing laziness opens a race window — 8 instances, as in the output above |
| Less code than DI for a small project | Changing the lifetime (per-request, per-tenant) requires rewriting the class |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Writing laziness as an unlocked `if (_i is null)` | Several instances under concurrent load — 8/8 runs in the output above |
| Letting a Singleton hold mutable state | Tests depend on run order; the bug only appears in CI |
| Adding a `Reset()` so it can be tested | That back door gets called from production code sooner or later |
| Using a Singleton as the place to put everything shared | It becomes a *service locator* — every class depends on everything, unmeasurably |
| `AddSingleton` on a class holding a `DbContext` (which is scoped) | Data leaks between requests, and `DbContext` isn't thread-safe |
| Hand-writing double-checked locking and forgetting `volatile` | On weak memory architectures you can observe a partially constructed object |

That second-to-last row is a .NET-specific trap and a common one: **a dependency's lifetime must not be
longer than the lifetime of the thing holding it.**

## FAQ

<details>
<summary>So is <code>static readonly</code> a Singleton?</summary>

In effect, yes: one instance, global access. In problems, also yes: the same three side
effects as above.

The only difference is that `static readonly` is more honest — it doesn't pretend to be a design
pattern. If the object is immutable, both are fine; if it has state, both are a problem.

</details>

<details>
<summary>Why doesn't <code>AddSingleton</code> leak state between tests?</summary>

Because the scope of "one instance" is **one container**, not one process. Each test builds its own
`ServiceProvider`, so each test has its own `CauHinh`.

At the same time, a real running application has only one container, so there's still exactly one
instance. This is precisely where DI separates the two questions from the *Goal* section.

</details>

<details>
<summary>If a Singleton is thread-safe, is there anything left to worry about?</summary>

Yes. "Thread-safe initialisation" only guarantees **it's created once**. It says nothing about
several threads reading and writing the state inside it afterwards.

The `CauHinhSingleton` in the example above uses a `Dictionary` — safe when only read, broken when
several threads write. To be safe it has to be a `ConcurrentDictionary`, or immutable.

</details>

<details>
<summary>Is a Singleton logger a problem?</summary>

A logger is the most acceptable case, because it's essentially stateless and nobody writes assertions
against it. But `ILogger<T>` injected through the constructor is still better in one specific way: it lets
you **capture the log in a test** to verify "a warning is written when X happens" — something you can't do
with a global logger.

</details>

## Related Topics

- [Coupling and cohesion](../reference/coupling-cohesion.md) — common coupling, the fourth level
- [SOLID](../reference/solid.md) — Singleton violates D systematically
- [Abstract Factory](abstract-factory.md) — the factory itself is usually registered as a singleton
- [Facade](facade.md) — often made into a singleton, and often bloats because of it
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the symptom lookup table

## References

- GoF — *Design Patterns*, Singleton
- Microsoft — *Dependency injection in .NET*, the "Service lifetimes" section
