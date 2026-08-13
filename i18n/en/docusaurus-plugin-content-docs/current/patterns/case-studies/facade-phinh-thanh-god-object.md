---
title: A one-method facade became 31 methods
sidebar_position: 9
description: "Every new feature adds a method to the entrance for convenience — two years later the fan-out is 7 and every change goes through one file."
tags: [case-study, facade, mediator, coupling, god-object]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# A one-method facade became 31 methods

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 04-coupling.cs` and
> `dotnet run 15-facade.cs` on .NET 11.0.0.

## Context

Placing an order requires calling five subsystems in the right order. The team built a
[Facade](../skills/facade.md) — the right place, for the right reason:

```csharp
sealed class CuaDatHang(HeKho kho, HeThanhToan tt, HeVanChuyen vc, HeMail mail, HeLog log)
{
    public string DatHang(string kh, string sku, int sl, decimal tien, string email) { ... }
}
```

```text
=== Sau: mot cua vao ===
  Fan-out cua nguoi goi: 1 he con, 1 loi goi
```

```text
=== Do fan-out bang reflection ===
  CuaDatHang: nhan 5 he con, lo ra 1 method cong khai
```

**5 in, 1 out.** That's the shape of a healthy facade.

Then two years pass. Cancellations, refunds, exchanges, splitting orders, merging orders, pre-orders,
subscriptions… each feature adds a method *"for convenience, the callers already know `CuaDatHang`"*.

## Symptoms

There's no incident. There are four signs, all of them about speed rather than errors:

| Sign | The number |
|---|---|
| Public methods on `CuaDatHang` | 31 |
| Subsystems it depends on | 12 |
| PRs per month touching this file | 18 / 22 |
| Merge conflicts on this file this quarter | 41 |
| This class's test run time | 3 minutes 40 |

The team describes the feeling as *"everything goes through `CuaDatHang`, and nobody dares to change it."*

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| We need to split the file to reduce conflicts | Conflicts are the clearest symptom | Splitting the file while keeping the class (a partial class) reduces nothing |
| We need more tests | The tests are slow and brittle | The tests are slow **because** the class needs 12 mocks, not because tests are missing |
| We should drop the facade and call the subsystems directly | The "the pattern is the culprit" reaction | That returns you to exactly the problem the facade solved: the caller's fan-out |
| The team needs a convention "don't add methods to the facade" | Nearly right | A convention has nothing enforcing it; it's already been violated 30 times |

The third hypothesis is notable: **the facade isn't the culprit.** It's still doing its job correctly for
`DatHang`. The problem is it got used as a container for 30 other jobs.

## The real cause

The facade was divided by **subsystem** (*"everything related to orders"*) rather than by
**use case** (*"place an order"*).

The category "everything related to orders" **has no natural limit**. The number of use cases does — each
one is something a user wants to do, and that list is finite.

Measured by fan-out ([coupling](../reference/coupling-cohesion.md)):

```text
DichVuDonHangGop           fan-out = 7   [IKhoHang, IThanhToan, IGuiMail, IGuiSms, IGhiLog, IDoiTien, IKhoDonHang]
DatHangUseCase             fan-out = 3   [IKhoHang, IThanhToan, IKhoDonHang]
GuiThongBaoSauDatHang      fan-out = 2   [IGuiMail, IGuiSms]
```

**7 versus 3.** That number is exactly the number of mocks a test needs — which also explains those
3 minutes 40 seconds.

And the blast radius of a change:

```text
Doi chu ky IKhoHang -> so lop phai sua:
  2 lop: DichVuDonHangGop, DatHangUseCase
```

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Unit tests | Green (slow) | Every method is correct |
| Per-PR code review | Missed it | Each PR adds **one** method — no single PR is the last straw |
| The compiler | Silent | A 31-method class is perfectly legal |
| Complexity analyzers | Silent | The complexity *per method* is low; the problem is the *number* of methods |

The second row is the real mechanism of every god object: **nobody creates it, it accumulates.** There's no
PR to reject.

The fourth row is worth remembering: the common metrics (cyclomatic complexity, method length) all look
*inside* a method. A god object is a problem *between* methods — it needs different metrics:
fan-out and the public method count.

## The fix

### Step 1 — split by use case

```csharp
sealed class DatHangUseCase(IKhoHang kho, IThanhToan tt, IKhoDonHang khoDon)
{
    public void ThucThi(string sku, int sl, decimal tien) { }
}

sealed class GuiThongBaoSauDatHang(IGuiMail mail, IGuiSms sms)
{
    public void ThucThi(string ma) { }
}
```

| | `DichVuDonHangGop` | After splitting |
|---|---|---|
| Fan-out | 7 | 3 and 2 |
| Mocks needed for one test | 7 | 3 |
| Change how SMS is sent → which class do I edit | the class holding the order logic too | the class that only sends notifications |
| Tests to re-run when SMS changes | every order, cancellation and refund test | only the notification tests |
| Class count | 1 | 2 |

The last row is the price, and it's cheap.

### Step 2 — set an enforceable threshold

A convention isn't enough — it already failed 30 times. You need a checkable rule:

| Threshold | Action when exceeded |
|---|---|
| Fan-out > 5 | A warning in CI |
| Public methods > 7 | A warning in CI |
| A class name ending in `Manager` or `Service` with no use-case noun | Reject |

Write the architecture rule with `NetArchTest` or a small analyzer; it runs on every PR and doesn't depend
on anyone's memory.

### A legitimate exception

The **composition root** (`Program.cs`, the DI module) exists precisely to know everything — a fan-out of 40
there is normal. The thresholds above apply only to business classes.

## How to spot it early

The question isn't *"is this class big"* — it's *"is it growing fast"*:

```bash
# So dong cua file nay qua 12 thang
git log --format="%ad" --date=short -- src/DonHang/CuaDatHang.cs |
  while read d; do echo "$d $(git show $(git rev-list -1 --before="$d" HEAD):src/DonHang/CuaDatHang.cs 2>/dev/null | wc -l)"; done | uniq
```

Three questions for a code review:

1. Does this new method share any dependency with the existing ones? No → it
   doesn't belong on this class.
2. What's the fan-out after adding it? Above 5, start asking questions.
3. Does the class name describe **one use case** or **a category**? A category has no natural
   limit.

The first question catches it earliest, at the third method — before there's anything to fix.

## Related Topics

- [Facade](../skills/facade.md) — how to keep a facade from bloating
- [Coupling and cohesion](../reference/coupling-cohesion.md) — fan-out and the god-object threshold
- [Mediator](../skills/mediator.md) — the same risk, and more prone to it because it has to know everything
- [Case study — Design Patterns](index.md)
