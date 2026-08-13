---
title: State
sidebar_position: 20
description: "An enum plus ifs has nowhere to hold the transition rules — an unpaid order can still be shipped, a shipped one can still be cancelled, and there's no error."
tags: [state, behavioral, gof, state-machine, workflow]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# State

> **Takeaway:** The difference between an `enum` and State isn't "fewer `if`s". It's having a place that
> **holds the transition rules**. With an `enum`, those rules live nowhere at all — so an unpaid order can
> still be shipped, a shipped one can still be cancelled, and nothing warns you.

## Goal

Turn "which state can an order move to from which" from an implicit convention everyone has to remember
into something **the code can enforce**.

## The original intent (GoF)

Allow an object to change its behaviour when its internal state changes. The object appears to have changed
class.

```csharp
interface ITrangThai { string Ten { get; } ITrangThai Lam(string thao); }
```

The important detail: `Lam` **returns the next state**. That's where the transition rules live — each state
knows for itself where it can go.

## Worked example — an order's lifecycle

Run with `dotnet run 25-state.cs` on .NET 11.0.0.

The correct process: `Moi → DaThanhToan → DaGiao` (new → paid → shipped), cancellable from the first two states.

### Before — an `enum` plus `if`s

```csharp
sealed class DonEnum
{
    public string TrangThai { get; private set; } = "Moi";
    public void Lam(string thao)
    {
        if (thao == "ThanhToan") TrangThai = "DaThanhToan";
        if (thao == "Giao") TrangThai = "DaGiao";        // checks nothing
        if (thao == "Huy") TrangThai = "DaHuy";          // checks nothing
    }
}
```

```text
=== Enum + if: khong ai giu luat chuyen ===
  giao khi chua thanh toan     -> trang thai = DaGiao
  huy khi da giao              -> trang thai = DaHuy
  giao lai lan hai             -> trang thai = DaGiao
```

**Three illegal transitions in a row, with no error.** The goods ship before payment, a shipped order gets
cancelled, and then it ships a second time.

Note this is **not** sloppy implementation. To block it, each `if` would need a condition on the current
state — and that condition would have to be repeated in **every** method touching the state: cancel,
refund, print the invoice, issue from stock. Miss one and there's a hole.

### After — each state knows where it can go

```csharp
sealed class Moi : ITrangThai
{
    public string Ten => "Moi";
    public ITrangThai Lam(string t) => t switch
    {
        "ThanhToan" => new DaThanhToan(),
        "Huy" => new DaHuy(),
        _ => throw new InvalidOperationException($"tu \"Moi\" khong lam duoc \"{t}\"")
    };
}
```

```text
=== State: moi trang thai biet minh di dau duoc ===
  giao khi chua thanh toan     -> TU CHOI: tu "Moi" khong lam duoc "Giao"
  thanh toan                   -> DaThanhToan
  giao                         -> DaGiao
  huy khi da giao              -> TU CHOI: tu "DaGiao" khong lam duoc "Huy" — day la trang thai cuoi
  giao lai lan hai             -> TU CHOI: tu "DaGiao" khong lam duoc "Giao" — day la trang thai cuoi
```

Three illegal operations blocked, two legal ones run. **The rules live in the state classes, not in the
caller** — so there's nowhere to miss.

### An unexpected benefit — the transition table becomes enumerable

```text
=== Bang chuyen trang thai hop le ===
tu            thao tac    toi
----------------------------------------
Moi           ThanhToan   DaThanhToan
Moi           Huy         DaHuy
DaThanhToan   Giao        DaGiao
DaThanhToan   Huy         DaHuy
```

This table is **generated from the code itself**, not written by hand as documentation:

```csharp
foreach (var tt in ds)
    foreach (var thao in new[] { "ThanhToan", "Giao", "Huy" })
    { try { toi = tt.Lam(thao); } catch (InvalidOperationException) { } ... }
```

That's something `enum + if` can't give you: a **self-describing** state machine. This table can be checked
against the business, put into documentation, or turned into tests.

### Before and after

| | `enum` + `if` | State |
|---|---|---|
| An illegal transition | runs normally | throws, with a clear message |
| Where the transition rules live | nowhere | in each state class |
| Adding a new state | find every relevant `if` | add 1 class; the old classes refuse it themselves |
| Enumerating the transition table | read the code and guess | generated automatically |
| Class count | 1 | 1 + the number of states |
| Reading it the first time | all visible in one file | you must open each state |
| Persisting to a database | one `varchar` column | one column + a mapping to classes |

The full failure case: [An illegal state transition](../case-studies/chuyen-trang-thai-trai-phep.md).

## Three implementations, chosen by scale

| Approach | Number of states | Pro | Con |
|---|---|---|---|
| **`enum` + a central `switch`** | 2–3, simple rules | The least code, all visible in one place | Not enforced if there are several entry points |
| **A transition table** `Dictionary<(State, Action), State>` | 4–10 | The rules are **data**, printable, configurable | Can't attach per-state behaviour |
| **State classes (GoF)** | Many, each with its own behaviour | Behaviour and transition rules in the same place | Many classes; state shared between them must go through the context |

**The transition table is the most overlooked sweet spot.** If the states only differ in *where they can
go*, not in *what they do*, then a transition table is far tidier and still enforces the rules:

```csharp
private static readonly Dictionary<(string, string), string> _chuyen = new()
{
    [("Moi", "ThanhToan")] = "DaThanhToan",
    [("Moi", "Huy")] = "DaHuy",
    [("DaThanhToan", "Giao")] = "DaGiao",
    [("DaThanhToan", "Huy")] = "DaHuy",
};
```

## When NOT to use State classes

| Situation | Why |
|---|---|
| 2–3 states with a single entry point | A `switch` is enough and reads faster |
| The states have no distinct behaviour | A transition table is tidier |
| There are no transition rules (every state can reach every state) | That's a field, not a state machine |
| The "state" is really a selectable algorithm | That's [Strategy](strategy.md) |

## Trade-offs

| You gain | You lose |
|---|---|
| Illegal transitions blocked at the source | The class count grows with the number of states |
| The transition rules in one place per state | Seeing the whole state machine means opening several files |
| Adding a state doesn't touch the existing states | Adding a new **action** means editing every state |
| The transition table is auto-generated and checkable against the business | Persisting/loading from a database needs a string ↔ class mapping |

The third row is the familiar two-way trade-off: State makes adding a *state* easy and adding an *action*
hard — exactly the inverse of [Visitor](visitor.md).

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Using an `enum` for a process that has transition rules | Illegal transitions run silently — the first output |
| Letting the caller check the state before calling | The rules scatter everywhere; miss one and there's a hole |
| A state holding a reference to the next state at construction | A dependency cycle; create the next state inside `Lam` instead |
| A state holding business data (an amount, an order code) | Transitioning loses the data; data belongs to the context |
| Forgetting to handle loading the state from the database | A loaded order starts at `Moi` even though it shipped |
| Allowing a transition to itself without thinking | Is `DaGiao → DaGiao` idempotent or an error? You have to decide explicitly |

That last row is worth thinking about before writing the first line of code: is calling `Giao` twice an
error, or a harmless repeat? The answer differs for a system with retries and one without.

## FAQ

<details>
<summary>How does State differ from Strategy?</summary>

See the full table in [Which pattern to choose](../reference/choosing-a-pattern.md#worked-example--evidence-the-three-patterns-dont-substitute-for-each-other).

In short: State **knows the next state** and transitions itself; Strategy knows nothing about the other
strategies and the caller chooses. Call the same method twice: Strategy gives the same result,
State gives a different one.

</details>

<details>
<summary>How do I persist the state to a database?</summary>

Store the **state's name** as a string, with a function mapping string → class on load:

```csharp
private static ITrangThai Tu(string ten) => ten switch
{
    "Moi" => new Moi(), "DaThanhToan" => new DaThanhToan(),
    "DaGiao" => new DaGiao(), "DaHuy" => new DaHuy(),
    _ => throw new InvalidOperationException($"trang thai la: {ten}")
};
```

Two requirements: **don't store the enum's ordinal** (inserting a new value in the middle changes the
meaning of old data), and **the default branch must throw** — an unknown state in the database means corrupt
data, not something to ignore.

</details>

<details>
<summary>Is there a state-machine library for .NET?</summary>

Yes (Stateless is the most popular). They let you declare the transition rules as configuration, with
guard conditions, entry/exit actions, and nested states included.

Worth using when the machine has more than ~6 states or you need those features. Below that, a
hand-written transition table has fewer dependencies and is good enough.

</details>

## Related Topics

- [Strategy](strategy.md) — the same shape, without transition rules
- [Memento](memento.md) — saving and restoring a state machine's state
- [Command](command.md) — the operation that causes a transition, undoable
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the State/Strategy/Command distinction table
- [SOLID](../reference/solid.md) — adding a state without touching old code is O

## References

- GoF — *Design Patterns*, State
