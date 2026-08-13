---
title: Shipped before the customer paid
sidebar_position: 15
description: "An enum plus ifs has nowhere to hold the transition rules — an unpaid order can be shipped, a shipped one cancelled, and then shipped a second time."
tags: [case-study, state, strategy, state-machine, workflow]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Shipped before the customer paid

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 25-state.cs`
> on .NET 11.0.0.

## Context

The order lifecycle has four states, stored in a `varchar` column:

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

The business-correct process: `Moi → DaThanhToan → DaGiao`, cancellable in the first two states, with
`DaGiao` and `DaHuy` as terminal states.

That process lives in a Confluence document. It doesn't live in the code.

## Symptoms

Three separate incidents in one quarter, initially unconnected by anyone:

| Incident | Count |
|---|---|
| Orders shipped without payment | 34 orders, 41 million uncollected |
| Shipped orders cancelled, the customer refunded but keeping the goods | 6 orders |
| Orders given a shipping note **twice**, with the warehouse issuing goods twice | 11 orders |

```text
=== Enum + if: khong ai giu luat chuyen ===
  giao khi chua thanh toan     -> trang thai = DaGiao
  huy khi da giao              -> trang thai = DaHuy
  giao lai lan hai             -> trang thai = DaGiao
```

**Three illegal transitions in a row, with no exception.**

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| Staff aren't following the process | Three different incidents, all involving users | They did click wrongly — but the system **allowed** it, so that isn't the root cause |
| Insufficient training | The natural consequence of the above | Retrain: incidents drop 60%, not to 0 |
| We need a confirmation dialog | The most popular solution | Users click OK reflexively; the incidents return after three weeks |
| A race between two tabs | It would explain the "shipped twice" case | It happens with one person and one tab too |

The first three solutions all aim at **people**. They reduce the symptoms but can't eliminate them, because
they don't touch the thing that permits the incident.

The question that opens the right direction: *"where in the code does it say you can't ship an unpaid
order?"* The answer: **nowhere.**

## The real cause

The transition rules **don't exist in the code**. They exist in people's heads and in a
document.

To enforce them with `enum + if`, every operation would have to check the current state itself:

```csharp
if (thao == "Giao")
{
    if (TrangThai != "DaThanhToan") throw ...;
    TrangThai = "DaGiao";
}
```

And that condition would have to be repeated in **every** place touching the state: shipping, cancelling,
refunding, printing the invoice, issuing from the warehouse, sending notifications. Six places, six authors,
six different moments.

**Missing one is a hole** — and nothing can enumerate that list of six places.

This is the same family as the [six parallel `switch`es](them-loai-thu-nam-sua-bay-cho.md) case: one concept
with no single place owning it.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| A test "pay then ship" | Green | The happy path, following the process |
| A test "cancel a new order" | Green | Also legitimate |
| Tests for the **illegal** transitions | **Absent** | Nobody writes tests for something that shouldn't be possible |
| The compiler | Silent | `TrangThai = "DaGiao"` is a legal string assignment |
| The data type | `string` | No constraint at all |

The third row is the crux. The test suite covers **what the system can do**, not
**what it must not do**. For a state machine, the number of **illegal** transitions usually exceeds the
number of legal ones — and they're the part that isn't tested.

With 4 states × 3 operations = 12 possible transitions, only 4 are legal. The other eight are eight
holes nobody has looked at.

## The fix

### Put the rules inside each state

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

All three incidents from the Symptoms section are blocked, and **the caller needs to know no rules** — so
there's nowhere to miss.

### A bonus benefit: the transition table becomes enumerable

```text
=== Bang chuyen trang thai hop le ===
tu            thao tac    toi
----------------------------------------
Moi           ThanhToan   DaThanhToan
Moi           Huy         DaHuy
DaThanhToan   Giao        DaGiao
DaThanhToan   Huy         DaHuy
```

This table is **generated from the code**, not hand-written. Checking it against the business is immediate:
four rows, exactly four legal transitions. Before this, nobody had any way of asserting what the system was
actually permitting.

### If you don't want 4 classes — a transition table

When the states only differ in *where they can go*, not in *what they do*:

```csharp
private static readonly Dictionary<(string, string), string> _chuyen = new()
{
    [("Moi", "ThanhToan")] = "DaThanhToan",
    [("Moi", "Huy")] = "DaHuy",
    [("DaThanhToan", "Giao")] = "DaGiao",
    [("DaThanhToan", "Huy")] = "DaHuy",
};

public void Lam(string thao) =>
    TrangThai = _chuyen.TryGetValue((TrangThai, thao), out var toi)
        ? toi
        : throw new InvalidOperationException($"tu \"{TrangThai}\" khong lam duoc \"{thao}\"");
```

Four lines of data, fully enforced, and printable. **For 4–10 states this is usually the best balance
point** — and it's the option commonly forgotten between `enum + if` and State classes.

### Remember to handle loading from the database

```csharp
private static ITrangThai Tu(string ten) => ten switch
{
    "Moi" => new Moi(), "DaThanhToan" => new DaThanhToan(),
    "DaGiao" => new DaGiao(), "DaHuy" => new DaHuy(),
    _ => throw new InvalidOperationException($"trang thai la: {ten}")
};
```

The default branch **must throw**. An unknown state in the database is a sign of corrupt data — possibly
those very 51 orders from the Symptoms section — not something to ignore.

## How to spot it early

```sql
-- Dem cac chuyen trang thai da tung xay ra trong lich su
SELECT tu, thao_tac, toi, count(*) AS so_lan
FROM lich_su_don_hang
GROUP BY 1, 2, 3
ORDER BY so_lan;
```

Compare this table with the legal transition table. Any row appearing in the data but not in the legal table
is a hole that has **already been exercised**.

Three questions for a code review:

1. Where in the code does it say this transition is legal? If you can't point at a line, the rule
   doesn't exist.
2. How many places assign `TrangThai =`? More than 1 means the rule is already scattered.
3. Are there tests for the **illegal** transitions? The illegal ones usually outnumber the legal ones two to
   one.

## Related Topics

- [State](../skills/state.md) — the three implementations and choosing by scale
- [Strategy](../skills/strategy.md) — the same shape, and why it can't substitute here
- [Case study — Design Patterns](index.md)
