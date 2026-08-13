---
title: Memento
sidebar_position: 18
description: "Snapshot state for restoration without breaking encapsulation — and the trap is identical to Prototype's: a shallow snapshot shares a collection with the original."
tags: [memento, behavioral, gof, undo, snapshot]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Memento

> **Takeaway:** Memento lets you save and restore state **without opening up `private`**.
> The trap is identical to [Prototype](prototype.md)'s: a shallow snapshot shares its `List` with the
> original, so "restoring" restores nothing at all — the output below shows the added shape still there
> after an undo.

## Goal

Implement undo/redo or checkpointing without turning every private field public — because that's the price
the naive approach always demands.

## The original intent (GoF)

Without violating encapsulation, capture and externalise an object's internal state so that the object can
later be restored to that state.

Three roles:

| Role | Who | Does what |
|---|---|---|
| **Originator** | `BanThietKe` | Snapshots and restores itself — only it knows the internal structure |
| **Memento** | `BanChup` | Holds the state; **exposes nothing outside** |
| **Caretaker** | `Stack<BanChup>` | Holds it and hands it back; doesn't read it, doesn't edit it |

## Worked example — a design drawing

Run with `dotnet run 23-memento.cs` on .NET 11.0.0.

### The trap — a shallow snapshot

```csharp
public BanChup ChupNong() => new(_ten, _hinh);           // shares the List
```

```text
=== Chup NONG: ban chup dung chung List ===
  hien tai : "ban ve 2" [hinh vuong, hinh tron, mui ten]
  sau khoi phuc: "ban ve 1" [hinh vuong, hinh tron, mui ten]   <- "mui ten" van con
```

**The name restores, the shape list doesn't.** `_ten` is a `string` (immutable) so reassigning it is
enough; `_hinh` is the same `List` the snapshot points at, so `Add("mui ten")` also edits the contents of
the "snapshot".

This is exactly the mechanism seen in [Prototype](prototype.md#the-shallow-copy--editing-the-copy-changes-the-original),
and it's more dangerous here: the user presses undo, sees the name revert, **believes the undo
ran**, and only discovers the shape is still there several operations later.

### A deep snapshot

```csharp
public BanChup Chup() => new(_ten, [.. _hinh]);          // a DEEP copy
```

```text
=== Chup SAU ===
  hien tai : "ban ve 2" [hinh vuong, hinh tron, mui ten]
  sau khoi phuc: "ban ve 1" [hinh vuong, hinh tron]
```

### Multi-step undo

```text
=== Undo nhieu buoc bang stack memento ===
  them A -> "ban ve 1" [A]
  them B -> "ban ve 1" [A, B]
  them C -> "ban ve 1" [A, B, C]
  undo   -> "ban ve 1" [A, B]
  undo   -> "ban ve 1" [A]
  undo   -> "ban ve 1" []
```

Snapshot **before** each operation and push onto the stack. Undo is a pop and a restore. No inverse logic
has to be written — that's the advantage over
[Command with inverse commands](command.md#undo-two-strategies).

### Encapsulation stays intact

```text
=== Nguoi giu memento KHONG doc duoc ruot ===
  So property cong khai cua BanChup: 0
  -> lich su chi giu va tra lai, khong sua duoc noi dung
```

`BanChup` declares its properties `internal`, and it's a class nested inside
`BanThietKe`. The result: a `Stack<BanChup>` can hold it, but **can't read anything inside**
— exactly the pattern's intent.

In C# there are three levels for achieving this:

| Approach | Who can read the internals |
|---|---|
| A nested class with `private` members | Only the originator |
| A nested class with `internal` members | The whole assembly (as in this example) |
| A public empty interface + an `internal` implementing class | Only the originator, and a caretaker in another assembly can still hold it |

### Before and after

| | Opening up `private` to save it | Memento |
|---|---|---|
| The caretaker can read the state | yes | no |
| Adding a new field to the originator | every saving site must be edited | only `Chup`/`KhoiPhuc` |
| Who's responsible for the deep copy | scattered across the saving sites | the originator — exactly the place that knows the structure |
| Memory | the same | the same |
| Complex undo | you must write inverse logic | not needed |

## Memory cost — this pattern's real problem

Each memento is a complete copy. With images, large documents, or spreadsheets, 50 undo steps is
50 copies.

| Technique | The idea | In exchange |
|---|---|---|
| **Bound the depth** | Keep the last 20 steps | You can't undo further back |
| **Incremental snapshots** | Store only what changed since the previous one | Restoring means replaying a chain of deltas |
| **Shared immutable structures** | `ImmutableList` shares the unchanged part | Writing is slightly slower |
| **Switch to inverse commands** | See [Command](command.md) | You must write the inverse logic correctly |

The third is the good default in modern .NET: `ImmutableList<T>` shares its internal
structure, so a snapshot is O(1) and duplicates no data.

## When NOT to use it

| Situation | Why |
|---|---|
| Very large state, very small operations | Snapshotting everything to undo one character is wasteful; use an inverse command |
| The object is already immutable | No snapshot needed — keeping the old reference is enough |
| The state lives outside the process (a database, a file) | Memento can't restore what it doesn't own |
| You only need one step of undo | One `_truocDo` field is enough |

## Trade-offs

| You gain | You lose |
|---|---|
| Encapsulation stays intact — the caretaker can't read the internals | Memory linear in the number of undo steps |
| Restoration is always correct, with no inverse logic to write | A deep snapshot costs time with large state |
| Adding a field only edits `Chup`/`KhoiPhuc` | Forgetting to add a field to `Chup` breaks it **silently** |
| Suits checkpointing, not just undo | Can't restore side effects that went outside |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| A shallow snapshot of state containing a collection | Undo doesn't undo — exactly the first output |
| Adding a new field and forgetting to include it in `Chup()` | That field isn't restored; the bug appears very late |
| Letting the caretaker read or edit the memento | You lose the entire reason for the pattern |
| An unbounded undo stack | A memory leak in a long-running application |
| Restoring and then not clearing the redo stack | The redo applies an old command to new state |
| Believing a memento can restore side effects too | An email already sent or a file already written doesn't come back |

The second row has a way to block it: write a test using reflection to count the originator's fields and
compare against the memento's — it goes red the moment somebody adds a field and forgets.

## FAQ

<details>
<summary>How does Memento differ from Prototype? Both copy.</summary>

The purpose and the direction. [Prototype](prototype.md) copies to **create a new object used in
parallel**; a memento copies to **return the old object to its old state**.

The design consequence: a Prototype's copy is a first-class citizen (used like an ordinary object); a
memento is deliberately **unusable** — it exists only to be stored and handed back.

</details>

<details>
<summary>Can I use serialization (JSON) as a memento?</summary>

You can, and it's convenient: one line, no field forgotten. In exchange you get exactly the drawbacks
listed under [Prototype](prototype.md#three-ways-to-deep-copy-in-c): slow, losing non-serializable
fields, losing the real type of a polymorphic object.

Suitable for sparse checkpoints (an autosave every 5 minutes). Not suitable for per-operation undo.

</details>

<details>
<summary>What about undo across several objects at once?</summary>

Each object snapshots itself, and the caretaker holds a *set* of mementos for one step:

```csharp
record BuocUndo(BanThietKe.BanChup Ve, BangMau.BanChup Mau);
```

The requirement: snapshot **all of them** at the same consistent moment, and restore **all of them**
together. Restoring half leaves a hybrid state, worse than not undoing at all.

</details>

## Related Topics

- [Command](command.md) — the other undo strategy: inverse commands
- [Prototype](prototype.md) — the same shallow/deep trap, a different purpose
- [Iterator](iterator.md) — traversing the memento history
- [State](state.md) — mementos are often used to save a state machine's state
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the symptom lookup table

## References

- GoF — *Design Patterns*, Memento
