---
title: Tests green alone, red together
sidebar_position: 1
description: "A singleton keeping state between tests — the same test gives two results depending on run order, and renaming a test is enough to make it appear or disappear."
tags: [case-study, singleton, testing, coupling]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Tests green alone, red together

> **Label: a reconstructed situation.** Not an incident that happened in this knowledge base. In exchange,
> every number was really produced by `dotnet run 06-singleton.cs` on .NET 11.0.0.

## Context

An order service reads its configuration through a classic singleton:

```csharp
sealed class CauHinhSingleton
{
    private static readonly CauHinhSingleton _i = new();
    public static CauHinhSingleton Instance => _i;
    private readonly Dictionary<string, string> _kho = new();
    private CauHinhSingleton() { }
    public void Dat(string k, string v) => _kho[k] = v;
    public string? Doc(string k) => _kho.TryGetValue(k, out var v) ? v : null;
}
```

The test suite has two tests. `TestA` sets the environment to `"test"` and checks it reads back.
`TestB` checks that when nobody has set anything, `Doc("moi_truong")` returns `null`.

## Symptoms

Run `TestB` alone — green:

```text
 Chay rieng TestB:
  TestB doc: (khong co)  <- ky vong (khong co)
```

Run both in alphabetical order (the default for most test runners) — `TestB` is red:

```text
 Chay TestA roi TestB (thu tu alphabet cua test runner):
  TestA doc: test
  TestB doc: test  <- ky vong (khong co)
```

**The same line of code, two results.** And it's red on CI while green on the dev machine (running one test
with the "Run this test" button).

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| CI has a different environment variable from the dev machine | The symptom only appears on CI | Set the same variable on the dev machine and it's still green when running one test |
| The tests run in parallel and race | The test runner parallelises by class by default | Turn parallelism off and it's still red — because this is **ordering**, not a race |
| `Dictionary` isn't thread-safe | It genuinely isn't | Running sequentially is still red |
| A build cache | The classic | `dotnet clean` changes nothing |

The biggest time sink is the first hypothesis: it's right about *where* the symptom appears, so it feels
like you're on the right track. But it confuses the cause with the circumstances.

## The real cause

`CauHinhSingleton.Instance` is **one instance for the whole process**. The test runner runs every
test in the same process, so `TestA` and `TestB` share exactly one `Dictionary`.

What `TestA` writes, `TestB` reads.

The decisive proof: rename `TestA` to `TestZ`. The alphabetical order flips, and `TestB` goes green
again — **without changing a single line of production code**.

When a bug changes behaviour because you changed a test's *name*, the cause is almost certainly shared
state between tests.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Unit tests per class | Green | Each test is correct when run alone |
| Code review | Didn't notice | `Instance` is a familiar shape, "everyone writes it like that" |
| Dependency analysis through constructors | **Fan-out = 0** | The singleton doesn't appear in any signature |
| Static analyzers | Silent | There's no rule forbidding `static` |

The measured table:

```text
=== 3. Phu thuoc an — fan-out khong hien trong constructor ===
  Fan-out theo constructor : 0
  Phu thuoc that su        : 1 (CauHinhSingleton, goi ben trong method)
```

**Measured fan-out is 0, real fan-out is 1.** This is the most dangerous kind of
[coupling](../reference/coupling-cohesion.md#seven-levels-of-coupling-loosest-to-tightest):
the *common* level, and invisible to every tool that reads signatures.

## The fix

### The common mistake: adding a `Reset()` back door

```csharp
public void Reset() => _kho.Clear();      // dung trong test
```

It makes the tests green, but: this back door **will** get called from production code sooner or later, and
every new test has to remember to call it in `Setup`. You've traded a silent bug for a convention with
nothing enforcing it.

### The right way: hand the dependency in through the constructor

```csharp
// Program.cs
services.AddSingleton<ICauHinh, CauHinh>();

// Lop dung
sealed class DichVuDatHang(ICauHinh cauHinh)
{
    public string MoTa() => $"...{cauHinh.Doc("moi_truong")}...";
}
```

| | Before | After |
|---|---|---|
| Instances at run time in production | 1 | 1 |
| Instances in the test suite | 1 (shared) | 1 **per test** |
| Measured fan-out | 0 | 1 — exactly the real value |
| Renaming a test changes the result | yes | no |

**The first two rows are the point:** the "only one instance" requirement isn't lost at all. The scope of
"one" moves from *one process* to *one container* — and in production there's still only
one container.

## How to spot it early

Runnable today:

```bash
# 1. Dao thu tu test — bo test tot phai xanh o moi thu tu
dotnet test --  xunit.execution.DisableParallelization=true

# 2. Tim moi trang thai tinh thay doi duoc
grep -rn "static.*Dictionary\|static.*List\|public static.*{ get; set; }" --include=*.cs src/
```

Three questions for a code review:

1. Does this class have any **mutable** `static` field?
2. Do its tests depend on run order — try renaming one and see?
3. Does the constructor-counted fan-out equal the real fan-out, or is there an `X.Instance`
   call inside a method?

The third question catches the most, because it aims at exactly what the tools don't look at.

## Related Topics

- [Singleton](../skills/singleton.md) — the pattern that caused this, and when it's still right
- [Coupling and cohesion](../reference/coupling-cohesion.md) — common coupling and hidden fan-out
- [SOLID](../reference/solid.md) — DIP is the way out
- [Case study — Design Patterns](index.md)
