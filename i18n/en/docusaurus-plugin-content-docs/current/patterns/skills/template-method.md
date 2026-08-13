---
title: Template Method
sidebar_position: 22
description: "A fixed skeleton with a few steps left to the subclass — and the trap is a subclass overriding a step that holds shared logic and forgetting to call base, making the validation rule disappear."
tags: [template-method, behavioral, gof, inheritance, hook]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Template Method

> **Takeaway:** Template Method is Strategy plugged in by **inheritance** rather than by object — so it
> inherits inheritance's weaknesses too. The specific trap: a subclass `override`s a step holding shared
> logic and forgets to call `base`, and the validation rule disappears while **the compiler says nothing**.

## Goal

Keep a process's skeleton in one place and allow variation only in a few steps — without letting the
variation delete the skeleton's invariant part.

## The original intent (GoF)

Define the skeleton of an algorithm in one operation, deferring some steps to subclasses.
Template Method lets subclasses redefine certain steps **without changing the algorithm's structure**.

The phrase "without changing the structure" is the pattern's promise, and also exactly where it tends to
break that promise.

## Worked example — loading data, filtering out broken rows

Run with `dotnet run 27-template-method.cs` on .NET 11.0.0.

The data: three rows, of which `",thieu ma"` is missing its code and **must be rejected**.

### A fragile skeleton — the step with shared logic is `virtual`

```csharp
abstract class NapDeVo
{
    public (int nhan, int loai) Chay(string[] dong) { ... KiemTra(d) ... }
    protected virtual bool KiemTra(string d) => !string.IsNullOrWhiteSpace(LayMa(d));   // the shared rule
    protected abstract string LayMa(string d);
}

sealed class NapJsonDeVo : NapDeVo
{
    protected override string LayMa(string d) => d.Split(',')[0];
    protected override bool KiemTra(string d) => d.Length > 0;      // FORGOT to call base -> the shared rule is gone
}
```

```text
=== Khung de vo: lop con override va quen goi base ===
  NapCsvDeVo       nhan 2 dong, loai 1 dong hong
  NapJsonDeVo      nhan 3 dong, loai 0 dong hong
```

**Two subclasses, two different results on the same data.** `NapJsonDeVo` accepts the row with no
code, because it added its own rule (`d.Length > 0`) and **replaced** the shared rule instead of adding
to it.

Whoever wrote `NapJsonDeVo` wasn't trying to break anything — they needed an extra condition and
`override` is the obvious way. No warning, no error. Broken data flows into the system.

### A solid skeleton — the varying step is `abstract`, the shared rule isn't `virtual`

```csharp
abstract class NapChac
{
    public (int nhan, int loai) Chay(string[] dong)
    {
        foreach (var d in dong)
        {
            var ma = LayMa(d);                                        // the varying step
            if (string.IsNullOrWhiteSpace(ma)) { loai++; continue; }   // the shared rule, out of the subclass's reach
            nhan++;
        }
        ...
    }
    protected abstract string LayMa(string d);
}
```

```text
=== Khung chac: template method sealed, buoc bien thien la abstract ===
  NapCsv           nhan 2 dong, loai 1 dong hong
  NapJson          nhan 2 dong, loai 1 dong hong
```

**Both subclasses now give the same result** on the shared-rule part. A subclass only gets to decide
*how to extract the code*, not *whether an empty code is valid*.

Three rules follow:

| Rule | Why |
|---|---|
| The template method (`Chay`) is `public` and **not** `virtual` | A subclass can't change the sequence |
| A **mandatory** varying step is `abstract` | The compiler forces an implementation; there's no `base` to forget |
| An **optional** step is `virtual` with an empty body (a hook) | It holds no shared logic, so there's nothing to lose |

The third rule is the crux: **`virtual` is for empty hooks only.** A step holding shared logic that is
still `virtual` is the trap in the first output.

The full failure case: [The subclass forgets to call base](../case-studies/lop-con-quen-goi-base.md).

### The same skeleton, written with a delegate

```csharp
static class NapBangHam
{
    public static (int nhan, int loai) Chay(string[] dong, Func<string, string> layMa) { ... }
}
```

```text
=== Cung khung do, viet bang delegate thay vi ke thua ===
  ham thuan       nhan 2 dong, loai 1 dong hong
```

The same result, with **no classes at all**. No `base` to forget, no inheritance tree, and the varying step
is passed in at the call — selectable at run time.

**With one or two varying steps, this is nearly always the better choice in modern C#.**
Template Method by inheritance only wins when there are several tightly related steps sharing state with
each other.

### Before and after

| | `virtual` with shared logic | `abstract` + a locked skeleton | A delegate |
|---|---|---|---|
| A subclass can delete the shared rule | **yes** | no | there's no rule to delete |
| The compiler catches a missing step | no | **yes** | yes (a required parameter) |
| Choosing the variant at run time | no | no | **yes** |
| Several steps sharing state | easy | easy | must be passed or captured |
| Classes for n variants | n+1 | n+1 | 0 |

## Template Method versus Strategy — which to choose

| | Template Method | [Strategy](strategy.md) |
|---|---|---|
| Plugged in by | Inheritance (compile time) | An object (runtime) |
| Changeable at run time | no | yes |
| Sharing common code | via the parent class, easy | you must arrange it yourself |
| Number of varying steps | Several, related | Usually one |
| The risk | A subclass breaking the skeleton | The caller choosing the wrong strategy |

The pragmatic rule: **one varying step → a delegate or Strategy. Three or more tightly related steps →
Template Method.** In between, choose by whether you need to change it at run time.

## When NOT to use it

| Situation | Why |
|---|---|
| Only one varying step | A delegate is shorter and has no `base` trap |
| You need to change the variant at run time | Inheritance is fixed at compile time |
| The variants only use part of the skeleton | Subclasses have to implement meaningless steps; see [ISP](../reference/solid.md#i--interface-segregation) |
| The inheritance tree is already 3 levels deep | Nobody can trace which step runs at which level |

## Trade-offs

| You gain | You lose |
|---|---|
| The step sequence has exactly one owner | Inheritance — the tightest coupling between two classes |
| The shared code isn't duplicated | Subclasses depend on the parent's implementation details |
| Adding a variant only means implementing the steps | Not changeable at run time |
| Reading the parent class shows the whole process | Reading the subclass shows **nothing** of the process — you must open the parent |

That last row is a real cognitive cost: whoever edits `NapJson` can't see `Chay` anywhere. That's why the
Hollywood Principle ("don't call us, we'll call you") is both an advantage and a source of confusion.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Making a step with shared logic `virtual` | A subclass forgets `base` → the rule vanishes with no warning |
| Making the template method `virtual` | A subclass overrides the sequence itself — the pattern loses all meaning |
| Too many hooks (8–10 extension points) | Nobody knows which step runs when |
| The parent class calling a `virtual` method in its constructor | The subclass code runs before its own fields are initialised |
| A `protected` step being changed to `public` | An internal step becomes public API; you can't take it back |
| Using inheritance purely to reuse code | See [Composition over inheritance](../reference/composition-over-inheritance.md) |

The fourth row is a C#/.NET-specific trap and very hard to trace: calling a virtual method in a constructor
runs the subclass's version while the subclass's fields are still `null`/`0`.

## FAQ

<details>
<summary>How do I stop a subclass overriding the template method?</summary>

Don't mark it `virtual` — in C# methods are non-virtual by default. If the template method
overrides one from another parent, use `sealed override`:

```csharp
public sealed override void Chay() { ... }
```

And if the class only has one level of subclasses, make them `sealed class` so nobody inherits
further.

</details>

<details>
<summary>An empty hook or an abstract step — how do I choose?</summary>

Ask: *if the subclass doesn't implement it, is the process still correct?*

- Still correct → a **hook**: `virtual` with an empty body (`protected virtual void TruocKhiNap() { }`).
- Not correct → **`abstract`**, so the compiler enforces it.

The common mistake is using `virtual` with a body that **has logic** for the second case — precisely the
trap at the top of this page.

</details>

<details>
<summary>How is Template Method written for async?</summary>

The varying step returns a `Task<T>` and the template method is `async`:

```csharp
public async Task<KetQua> ChayAsync(CancellationToken ct)
{
    var ma = await LayMaAsync(d, ct);
    ...
}
protected abstract Task<string> LayMaAsync(string d, CancellationToken ct);
```

Remember to pass the `CancellationToken` down into every step — forget one and the process can't be
cancelled, which is the kind of bug that only surfaces while the system is shutting down.

</details>

## Related Topics

- [Strategy](strategy.md) — plugged in by object rather than by inheritance
- [Composition over inheritance](../reference/composition-over-inheritance.md) — why a delegate usually wins
- [Factory Method](factory-method.md) — often one step inside a template method
- [Decorator](decorator.md) — adding behaviour without touching inheritance
- [SOLID](../reference/solid.md) — an LSP violation is this pattern's main risk

## References

- GoF — *Design Patterns*, Template Method
