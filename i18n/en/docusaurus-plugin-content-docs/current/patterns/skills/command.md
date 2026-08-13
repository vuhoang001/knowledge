---
title: Command
sidebar_position: 14
description: "Turn a request into an object so it can be undone, queued, recorded — and the trap is an undo that recomputes in reverse by formula instead of storing the old value."
tags: [command, behavioral, gof, undo, cqrs]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Command

> **Takeaway:** Command turns a *function call* into an *object* — which makes it storable,
> queueable and undoable. The biggest trap: a `HoanTac()` that recomputes in reverse by formula rather
> than storing **what actually changed**. The output below shows stock of 10 becoming 24.

## Goal

Separate *who requests* from *who performs*, so you can do three things a plain function call doesn't
allow: defer execution, replay it, and reverse it.

## The original intent (GoF)

Encapsulate a request as an object, thereby letting you parameterise callers with different requests,
queue or log requests, and support undo.

```csharp
interface ILenh { void ThucThi(); void HoanTac(); }
```

Those two methods are the whole pattern. Everything else — a history stack, a queue, macros — is a
consequence.

## Worked example — text editing and stock issuing

Run with `dotnet run 19-command.cs` on .NET 11.0.0.

### Correct undo — storing the old state

```csharp
sealed class VietHoaTatCa(VanBan vb) : ILenh
{
    private string _cu = "";
    public void ThucThi() { _cu = vb.NoiDung; vb.NoiDung = vb.NoiDung.ToUpperInvariant(); }
    public void HoanTac() => vb.NoiDung = _cu;
}
```

```text
=== Undo dung: luu trang thai cu ===
  sau 3 lenh : "XIN CHAO THE GIOI"
  undo       : "Xin chao the gioi"
  undo       : "Xin chao"
  undo       : ""
```

Note that `VietHoaTatCa` does **not** try to "lowercase it back" — that's an inverse operation that
doesn't exist (`"Xin chao"` uppercased then lowercased gives `"xin chao"`, with the wrong X). It stores
the old string.

### Wrong undo — recomputing in reverse by formula

```csharp
sealed class XuatKhoTinhNguoc(TonKho kho, int yeuCau) : ILenh
{
    public void ThucThi() { DaXuat = Math.Min(yeuCau, kho.So); kho.So -= DaXuat; }
    public void HoanTac() => kho.So += yeuCau;          // WRONG: adds back the REQUESTED amount
}
```

```text
=== Undo sai: tinh nguoc bang cong thuc ===
  xuat 4  -> ton 6
  xuat 20 -> ton 0  (chi xuat duoc 6)
  undo    -> ton 20  <- ky vong 6
  undo    -> ton 24  <- ky vong 10
```

**The stock starts at 10 and ends at 24.** The command requested 20 but could only issue 6
(out of stock); `HoanTac` adds 20 back. Fourteen units of goods created out of nothing.

This bug hides well because it **only appears when there's an upper bound** — with ordinary data
(`yeuCau <= kho.So`) then `yeuCau == DaXuat` and everything matches. Tests written with tidy data
stay green forever.

### The fix — store what actually happened

```csharp
sealed class XuatKhoLuuThat(TonKho kho, int yeuCau) : ILenh
{
    private int _daXuat;
    public void ThucThi() { _daXuat = Math.Min(yeuCau, kho.So); kho.So -= _daXuat; }
    public void HoanTac() => kho.So += _daXuat;         // RIGHT: adds back what was ISSUED
}
```

```text
=== Undo dung: luu so da xuat that su ===
  sau 2 lenh -> ton 0
  undo       -> ton 6  <- ky vong 6
  undo       -> ton 10  <- ky vong 10
```

**The rule:** `HoanTac()` must be based on *what happened*, not on *what was requested*.
If `ThucThi()` has any branching at all (clamping a value, skipping, partial failure), recomputing in
reverse by formula is wrong.

The full failure case: [Undo doesn't restore the old state](../case-studies/undo-khong-tra-lai-trang-thai-cu.md).

### Command is also used for queueing

```text
=== Command con dung de xep hang va chay lai ===
  3 lenh trong hang doi, chua chay: ""
  sau khi chay het: "AB"
```

The commands exist as data **before** running — that's the thing a function call can't do. From here you
get: run later, run on another machine, retry on failure, log to reconstruct state.

### Before and after

| | A direct function call | Command |
|---|---|---|
| Undo | write the inverse logic at each site yourself | `HoanTac()` sits next to `ThucThi()` |
| Queue it, run it later | no | the command is data |
| Record it to replay | you must log by hand in your own format | serialize the command |
| Group several operations into one undo | no | a macro command |
| Class count | 0 | 1 class / operation |
| Reading the flow | visible immediately | you have to open the command class |

## Undo: two strategies

| Approach | Stores what | Suits when |
|---|---|---|
| **The inverse command** (as above) | Enough information to reverse it | Small operations, large state |
| **A snapshot** ([Memento](memento.md)) | The entire state before running | Complex operations, small state |

A snapshot is **always correct** but costs memory proportional to the state's size. An inverse command is
cheap but has to be written correctly — and the output above shows "correctly" is harder than it looks.

**The pragmatic rule:** start with a snapshot. Move to an inverse command only once you've measured
memory being a problem.

## Command in .NET today

| Where you meet it | Shape |
|---|---|
| MediatR / CQRS | `record TaoDonHang(...) : IRequest<KetQua>` + a handler |
| A message queue | The message *is* a serialized command |
| WPF/MAUI's `ICommand` | `Execute` + `CanExecute` |
| A background job (Hangfire) | The job is stored in the DB and run later — a persisted command |

Note that CQRS uses Command **without undo**: it takes the "the request is data" part and drops the
"undoable" part. That's a legitimate and today the most common usage.

## When NOT to use it

| Situation | Why |
|---|---|
| You need no undo, no queueing, no recording | A function call is enough; a command only adds a class |
| Every command has an empty `HoanTac()` | The clearest sign you don't need this pattern |
| The operation can't be reversed (sending an email, calling an external API) | Undo is a promise you can't keep; you must design a compensating action |
| There are only 1–2 operations | An `Action` delegate is far cheaper than a class hierarchy |

The third row is worth remembering: a `HoanTac()` that "sends an apology email" is **not** undo — it's a
compensating action, and it should be named as one.

## Trade-offs

| You gain | You lose |
|---|---|
| Undo/redo has a natural place to live | One class per operation — the class count grows with the operations |
| Requests can be stored, sent, replayed | You have to think about serialization and version compatibility |
| The caller doesn't know who performs it | The execution flow is hard to trace while debugging |
| Grouping into macros, running in batches | The history stack eats memory; you must bound its depth |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| `HoanTac()` recomputing in reverse by formula | Stock of 10 becomes 24 — exactly the output above |
| A command holding a reference to an object that's since been replaced | The undo acts on the old object and nobody notices |
| An unbounded undo stack | A memory leak in a long-running application |
| Undoing a command from the middle of the stack rather than the top | Inconsistent state; undo has to be LIFO |
| A `HoanTac()` for an operation that can't be reversed | A false promise; the user presses undo and nothing happens |
| Stuffing business logic into the command instead of calling the domain | Logic scattered into the application layer |

## FAQ

<details>
<summary>Should I use an <code>Action</code> instead of a command class?</summary>

Yes, when you **need no undo and no serialization**. A `Queue<Action>` is a perfectly legitimate command
queue.

A class wins when you need: the `ThucThi`/`HoanTac` pair, stored state for the undo, metadata (a command
name to display "Undo: Uppercase"), or serializability to send over a queue.

</details>

<details>
<summary>How do I implement redo?</summary>

Two stacks. `HoanTac()` pops from `undo` and pushes onto `redo`; a new command **clears** the
`redo` stack entirely.

That clearing step is easily forgotten, and the consequence is a redo applying an old command to a state
that has since changed — a wrong result with no error.

</details>

<details>
<summary>How does undo work for a macro command (several commands grouped)?</summary>

Undo in **reverse order**:

```csharp
public void HoanTac() { for (var i = _ds.Count - 1; i >= 0; i--) _ds[i].HoanTac(); }
```

And if the macro's `ThucThi()` fails part-way, you have to undo the commands that **did** run
before throwing — otherwise the state sits half-way, worse than either end.

</details>

## Related Topics

- [Memento](memento.md) — the snapshot strategy for undo
- [Chain of Responsibility](chain-of-responsibility.md) — a command travelling through a chain of handlers
- [Strategy](strategy.md) — also encapsulates behaviour, but with no undo and not storable
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the Strategy/State/Command distinction table
- [Prototype](prototype.md) — deep copying is what a macro undo often needs

## References

- GoF — *Design Patterns*, Command
