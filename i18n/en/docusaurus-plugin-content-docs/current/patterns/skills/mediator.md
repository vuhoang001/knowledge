---
title: Mediator
sidebar_position: 17
description: "n components knowing each other is n(n-1)/2 links; through a mediator it's n — 20 UI fields go from 190 to 20, at the cost of a potential god object."
tags: [mediator, behavioral, gof, coupling, cqrs]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Mediator

> **Takeaway:** Mediator turns a web of `n(n-1)/2` links into `n` — but it **doesn't remove the
> complexity, it concentrates it in one place**. That place is the mediator, and it will bloat. Both the
> value and the risk of this pattern are in that one sentence.

## Goal

Block the situation where every component has to hold a reference to every other component — the kind of
code where changing one thing means opening five files, and nobody can draw the diagram.

## The original intent (GoF)

Define an object that encapsulates how a set of objects interact. Mediator reduces coupling by keeping
objects from referring to each other directly.

## Worked example — an order form

Run with `dotnet run 22-mediator.cs` on .NET 11.0.0. Four fields: `so_luong` (quantity), `don_gia`
(unit price), `thanh_tien` (total), `thue` (tax). Changing one must update another.

### Before — the fields call each other

```text
=== Truoc: cac o giao dien tu goi nhau ===
  4 o -> 12 tham chieu (moi lien ket dem 2 lan)
```

```text
so o (n)       tu goi nhau: n(n-1)/2   qua trung gian: n
--------------------------------------------------------
4                                  6                   4
6                                 15                   6
10                                45                  10
20                               190                  20
```

**This is a quadratic function versus a linear one.** At 4 fields, 6 and 4 are close; at 20 fields it's 190
versus 20 — and 190 links means nobody can any longer grasp what affects what.

### After — each field knows only the mediator

```csharp
sealed class FormDonHang : ITrungGian
{
    public void ThongBao(string tenO, string giaTri)
    {
        if (tenO is "so_luong" or "don_gia")
        {
            var tt = decimal.Parse(_o["so_luong"]) * decimal.Parse(_o["don_gia"]);
            _o["thanh_tien"] = tt.ToString("N0");
            _o["thue"] = (tt * 0.1m).ToString("N0");
        }
    }
}
```

```text
=== Sau: moi o chi biet trung gian ===
  dat so_luong=3  -> thanh_tien=0  thue=0
  dat don_gia=150000 -> thanh_tien=450,000  thue=45,000
  dat so_luong=5  -> thanh_tien=750,000  thue=75,000
```

```text
=== Fan-out do bang reflection ===
  ONhap    : biet 1 thu (chi trung gian)
  FormDonHang: biet 1 field
  -> do phuc tap don ve MOT cho: chinh trung gian. Do la ca duoc lan mat.
```

**All the interlocking rules live in one method.** To know "when the unit price changes, what updates",
you read exactly one place — instead of following six cross-references.

### Before and after

| | The fields calling each other | Mediator |
|---|---|---|
| Links with 20 fields | 190 | 20 |
| Fan-out per field | up to 19 | 1 |
| Adding a "volume discount" rule | edit 2–3 fields | edit 1 method |
| Reusing a field on another form | no — it knows the specific fields | yes |
| Reading the interlocking rules | scattered everywhere | one place |
| The mediator class's size | — | **bloats with the rule count** |

That last row is the price, and where this pattern usually breaks. The failure case:
[A facade bloating into a god object](../case-studies/facade-phinh-thanh-god-object.md) — the same
mechanism, and Mediator is more prone to it because it *has* to know everything by design.

## Keeping the mediator from bloating

| Technique | How |
|---|---|
| **One mediator per cohesive group** | `FormDonHang` and `FormThanhToan` are two mediators, not one `FormManager` |
| **The mediator only coordinates and holds no business logic** | Tax calculation lives in `MayTinhThue`; the mediator only calls it and distributes the result |
| **Register by message type** | A `Dictionary<Type, Handler>` instead of a long `switch` — which is exactly the MediatR style |
| **Measure by branch count** | More than ~7 branches in `ThongBao` is a sign to split |

The third technique is the step from a GoF Mediator to a CQRS-style Mediator, and it changes the pattern's
nature entirely — see the next section.

## Two kinds of Mediator that get conflated

| | GoF Mediator | MediatR / CQRS-style Mediator |
|---|---|---|
| The parties | Know each other through the mediator, and the mediator knows all | The sender doesn't know who handles it; one handler per message |
| What the mediator holds | The interlocking rules | **Nothing at all** — only routing |
| Does it bloat | Yes, with the rule count | No — the rules live in the handlers |
| The problem it solves | The n×n web | Separating the sender from the handler |

**These are two different patterns wearing the same name.** MediatR does not solve the GoF's n×n problem;
it's a dispatcher. Using it and believing you've lowered coupling between components is a common
misunderstanding — it only turns a direct call into an indirect call via a message type.

## When NOT to use it

| Situation | Why |
|---|---|
| Fewer than ~4 components | 3 components is 3 links; a mediator adds a layer that buys nothing |
| A one-way, one-to-many relationship | [Observer](observer.md) is simpler |
| The components aren't genuinely interlocked | Forcing them through a mediator creates a false dependency |
| There are very many complex interlocking rules | The mediator becomes a god object; consider a state machine or a rules engine |

## Trade-offs

| You gain | You lose |
|---|---|
| `n` links instead of `n(n-1)/2` | The mediator knows everything — high fan-out by design |
| The interlocking rules in one readable place | The mediator bloats with the rule count |
| Components become reusable in other contexts | One more layer of indirection when tracing a flow |
| Changing a rule doesn't touch the components | The mediator becomes a bottleneck: every change goes through it |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| One mediator for the whole application | A god object; fan-out 20+, and every change touches it |
| Stuffing business logic into the mediator | Business rules living in the coordination layer, where nobody looks |
| Components still keeping cross-references "for convenience" | Both routes exist; the web returns but is harder to see |
| The mediator calling back the component that sent the notification | An infinite notification loop |
| Using MediatR and believing you've lowered n×n coupling | That's a dispatcher, not a GoF Mediator |
| The mediator holding shared state for every component | It becomes a place that holds global state |

The fourth row has a concrete fix: add a `_dangXuLy` flag, or pass the sender in and skip it when
redistributing.

## FAQ

<details>
<summary>How does Mediator differ from Observer?</summary>

Direction and knowledge. [Observer](observer.md) is **one-to-many, one-way**: the source emits a signal
and **doesn't know** who's listening. Mediator is **many-to-many, two-way**: the mediator knows
everyone and actively coordinates who does what.

The test: if you need "when A changes, B and C recalculate, but if B is locked then C doesn't
recalculate" — that's a rule, and you need Mediator. If it's just "whoever cares can listen" — Observer.

</details>

<details>
<summary>How does Mediator differ from Facade?</summary>

The direction of calls. [Facade](facade.md) is one-way: caller → facade → subsystem, and the subsystem
**doesn't know** the facade exists. Mediator is two-way: components actively notify the mediator, and the
mediator calls back into them.

The consequence: remove the facade and the subsystem still works; remove the mediator and the components
lose contact entirely.

</details>

<details>
<summary>Should the mediator be an interface?</summary>

Yes, and this is the important point: the components depend on `ITrungGian`, not on
`FormDonHang`. That's what lets the same input field be used on several forms, and be tested with a fake
mediator.

If a component knows the mediator's concrete type, you've only turned an `n×n` web into an
`n×1` web with the same tightness.

</details>

## Related Topics

- [Observer](observer.md) — one-way, the source doesn't know who's listening
- [Facade](facade.md) — one-way, the subsystem doesn't know the facade
- [Coupling and cohesion](../reference/coupling-cohesion.md) — fan-out and the god-object threshold
- [Chain of Responsibility](chain-of-responsibility.md) — forwarding rather than coordinating
- [Command](command.md) — a message sent through a mediator is usually a command

## References

- GoF — *Design Patterns*, Mediator
