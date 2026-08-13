---
title: The exchange request vanishes, nobody reports it
sidebar_position: 12
description: "The approval chain has no terminal link — a new request type falls through the whole chain, returns null, and the caller doesn't check."
tags: [case-study, chain-of-responsibility, silent-failure]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# The exchange request vanishes, nobody reports it

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 18-chain.cs`
> on .NET 11.0.0.

## Context

The refund approval process uses
[Chain of Responsibility](../skills/chain-of-responsibility.md):

```csharp
abstract class NguoiXuLy : INguoiXuLy
{
    public INguoiXuLy? Tiep { get; set; }
    public string? Xu(YeuCau y) => Nhan(y) ? $"{GetType().Name} duyet" : Tiep?.Xu(y);
    protected abstract bool Nhan(YeuCau y);
}
```

| Approver | Accepts when |
|---|---|
| `TruongCa` | the refund is ≤ 1,000,000 |
| `QuanLy` | the refund is ≤ 10,000,000 |
| `GiamDoc` | any refund, no limit |

It ran correctly for a year. Then product added an **exchange** request type, going through the same endpoint.

## Symptoms

Customer support reports: *"the customer says they sent an exchange request but the system has nothing at
all."*

```text
=== Chuoi khong co nguoi chot ===
  hoan tien       200,000 -> TruongCa duyet
  hoan tien     8,000,000 -> QuanLy duyet
  hoan tien    90,000,000 -> GiamDoc duyet
  doi hang         50,000 -> (khong ai xu ly — im lang)
```

The three refund cases run correctly. The exchange request returns `null` — and disappears.

The detail that makes this case unpleasant: **the API returns HTTP 200**. The frontend shows "Request sent".
The customer waits. There's no record in the database, no log line at `Warning` or above, and the
"requests awaiting approval" dashboard doesn't count it.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The frontend isn't sending the request | "There's nothing in the database" | The gateway access log: the request is there, 200 OK |
| The request is filtered at the auth layer | That can be silent | The auth log: it passed normally |
| The queue worker died | The classic | There's nothing in the queue to process — and *that's* the clue |
| A database rollback from a failed transaction | It would explain "no record" | No transaction was ever opened |

The decisive clue is the third hypothesis read backwards: **nothing in the queue** means the code never
reached the step that pushes to the queue. Put a breakpoint right after `Xu(y)` and you see
`null`.

## The real cause

No link in the chain accepts the type `"doi hang"`. The `Tiep?.Xu(y)` at the last link
(`GiamDoc`) returns `null` because `Tiep` is `null`.

The caller:

```csharp
var kq = chuoi.Xu(y);
return Ok(new { thongBao = kq });      // kq = null, van tra 200
```

**Three design decisions, each reasonable alone, combining into a hole:**

1. The chain returns `string?` — a type that permits `null`.
2. The last link returns `null` when nobody accepts — the pattern's default behaviour.
3. The caller doesn't check for `null` — because in a whole year it was never `null`.

The third point is the memorable one: the code is **correct according to experience**, right up to the day
the input set widens.

And here's what `if/else` gives for free and a chain takes away: the final `else` is the place the compiler
(or at least your eye) is forced to think about. A chain has no `else`.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Unit tests per link | Green | Each link accepts/rejects exactly per spec |
| A chain test with the 3 refund levels | Green | All three of those cases have an acceptor |
| A test for the exchange feature | **Absent** | It was added in a different layer; everyone thought the approval chain was a refund matter |
| The compiler | Could have warned | If nullable reference types were on — but the project hasn't enabled them |
| The return type | `string?` | The type **permits** `null`, so nothing is wrong |

The fourth row is the missed opportunity: `<Nullable>enable</Nullable>` would warn at the point where
`kq` is assigned into a field that doesn't accept `null`. One project setting blocks this whole class of bug.

## The fix

### Step 1 — always have a terminal link

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

`ChotSo` accepts everything. In real code it should **log at `Error` level and then throw**, or push
into a queue for manual handling. What matters isn't that it can handle it — it's that **nothing falls out
silently**.

### Step 2 — change the return type so it can't be forgotten

```csharp
abstract record KetQuaDuyet;
sealed record DaDuyet(string BoiAi) : KetQuaDuyet;
sealed record KhongAiNhan(YeuCau Y) : KetQuaDuyet;
```

`string?` invites forgetting the `null` check. A type with two explicit branches forces the caller to
handle both — and the compiler reminds them when a `switch` is missing a branch.

### Step 3 — chain with a `List`, not a `Tiep` pointer

```csharp
foreach (var h in _danhSach) { var r = h.Thu(y); if (r is not null) return r; }
throw new KhongAiXuLy(y);
```

Three benefits: the order is **plainly visible in one place**, a cycle is unconstructible, and the final
`throw` is impossible to forget — it's right there.

### And a trap that comes with it: the order

The same set of links, reordered:

```text
=== Thu tu doi ket qua: dat GiamDoc len dau ===
  hoan tien       200,000 -> GiamDoc duyet
  hoan tien     8,000,000 -> GiamDoc duyet
  hoan tien    90,000,000 -> GiamDoc duyet
```

**Every refund is now approved by the director**, including one of 200,000. No error, no warning —
the business process is wrong while the code runs correctly.

The rule: **the narrowest link goes first**, and write a test locking the order for every business
threshold.

## How to spot it early

```bash
# Chuoi tra ve kieu nullable
grep -rn "?\.Xu(\|Tiep?\." --include=*.cs src/

# Nullable reference types da bat chua
grep -rn "<Nullable>" --include=*.csproj .
```

Three questions for a code review:

1. Does this chain have a link at the end that **accepts everything**?
2. Does the return type distinguish "handled" from "nobody accepted", or are both
   `null`?
3. If a new request type appears tomorrow, where does it go? If the answer is "I don't know",
   that *is* the hole.

## Related Topics

- [Chain of Responsibility](../skills/chain-of-responsibility.md) — the terminal link and the ordering
- [Command](../skills/command.md) — the request made into an object, queueable instead of vanishing
- [Case study — Design Patterns](index.md)
