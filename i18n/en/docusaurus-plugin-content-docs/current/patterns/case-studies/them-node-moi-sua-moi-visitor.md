---
title: One more operator, six places to change
sidebar_position: 17
description: "Visitor catches a missing branch at compile time, a switch on the type catches it at run time in production — the same omission, two very different prices."
tags: [case-study, visitor, interpreter, expression-problem]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# One more operator, six places to change

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 28-visitor.cs`
> on .NET 11.0.0.

## Context

A reporting tool lets users write calculation formulas. A formula is parsed into an expression
tree ([Interpreter](../skills/interpreter.md)), and six operations run over that tree:
evaluation, redisplay, SQL generation, node counting, depth calculation, type checking.

The original tree has three node kinds: `So`, `Cong`, `Nhan`. The six operations were written as `switch`es
on the type:

```csharp
decimal DanhGiaBangSwitch(INut n) => n switch
{
    So s => s.GiaTri,
    Cong c => DanhGiaBangSwitch(c.Trai) + DanhGiaBangSwitch(c.Phai),
    Nhan m => DanhGiaBangSwitch(m.Trai) * DanhGiaBangSwitch(m.Phai),
    _ => throw new NotSupportedException($"chua ho tro {n.GetType().Name}")
};
```

This sprint adds a subtraction operator: `Tru`.

## Symptoms

A user saves a formula containing a subtraction. It saves successfully. Then the report runs:

```text
=== So sanh: switch tren kieu thi khong ai bat thieu nhanh ===
  DanhGiaBangSwitch(cay)  = 23
  DanhGiaBangSwitch(cay2) -> NotSupportedException: chua ho tro Tru
```

A `NotSupportedException` in production, in a nightly job, with a customer's formula.

And that's the operation that **does** have a throwing default branch. Three other operations have default
branches returning a "safe" value — they don't throw, they just produce wrong results: `DemNut` undercounts,
`DoSau` returns 1, and `SinhSql` skips the subtraction branch and generates a `WHERE` clause **missing a
condition**.

The SQL with a missing condition is the worst case: it runs, returns data, and that data is more than it
should be.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The parser builds the wrong tree | The exception says "chua ho tro" | Dump the tree: the structure is correct, with a `Tru` node in the right place |
| A service wasn't deployed | Only the nightly job fails | The same version on every node |
| Whoever added `Tru` was careless | It seems obvious | They updated **two** operations — the two the tests cover |
| We just need to add a branch to `DanhGia` | It fixes the reported symptom | Three more operations are silently wrong |

The last hypothesis is the most dangerous: it closes the ticket. Six weeks later a SQL report with wrong
numbers is discovered — the same cause, a different symptom.

## The real cause

Adding a **node type** requires editing **every operation**, and nothing can enumerate the list of
operations.

This is the *expression problem*: no organisation is cheap in both directions.

| Organisation | Adding a **type** | Adding an **operation** |
|---|---|---|
| A method in the node class | cheap | **expensive** — edit every class |
| A `switch` on the type | **expensive and silent** | cheap |
| [Visitor](../skills/visitor.md) | **expensive but loud** | cheap |

The project picked the middle row because at first the operations grew fast while the node types were stable.
That choice was **right** — the problem is the `_ =>` branch, not the `switch`.

**The default branch turns "the compiler reminds you" into "production reminds you".**

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| A test for `DanhGia` with subtraction | Green | Whoever added `Tru` updated this operation |
| A test for `InRa` with subtraction | Green | Also updated |
| Tests for `SinhSql`, `DemNut`, `DoSau` with subtraction | **Absent** | Nobody knew they had to be written — there's no list of operations |
| The compiler | Silent | The `_` branch covers every type |
| Coverage | High | Every branch that **exists** runs |

The third row is the real mechanism: whoever added `Tru` updated the operations they **knew about**. They had
no way of knowing there were four more.

## The fix

### Move to Visitor — let the compiler hold the list

```csharp
interface IVisitor<T>
{
    T Tham(So n);
    T Tham(Cong n);
    T Tham(Nhan n);
    T Tham(Tru n);          // <- add this line
}
```

```text
=== Them KIEU NUT moi (Tru) — moi visitor phai bo sung ===
  in: (10 - 4)
  danh gia: 6
  dem nut : 3
  do sau  : 2
  -> them Tru vao IVisitor<T> lam MOI visitor khong bien dich duoc cho toi khi bo sung
     (do la dac diem tot: trinh bien dich bat, khong phai runtime)
```

**Adding one line to the interface produces six compile errors.** The cost is still "edit six places", but it
moves from *runtime in production* to *build time on a dev machine* — and it can't be missed.

The other direction stays cheap:

```text
=== Them thao tac thu tu: do sau — chi them MOT lop ===
  do sau   : 3
```

### Or, more cheaply: drop the default branch

If you don't want to move to Visitor yet, the root fix is to **delete the `_ =>`**:

```csharp
decimal DanhGia(INut n) => n switch
{
    So s => s.GiaTri,
    Cong c => DanhGia(c.Trai) + DanhGia(c.Phai),
    Nhan m => DanhGia(m.Trai) * DanhGia(m.Phai),
    Tru t => DanhGia(t.Trai) - DanhGia(t.Phai),
};
```

C# warns with `CS8509` when a switch expression isn't exhaustive. Turn on `TreatWarningsAsErrors` and
you get nearly all of Visitor's benefit for a fraction of the effort.

**The limitation:** C# has no closed union types, so the compiler only *warns* based on analysis, it can't
*assert* exhaustiveness. For a hierarchy that could be inherited from another assembly, that warning isn't
enough.

### A selection table

| Situation | Choose |
|---|---|
| 3–5 node types, a few operations, an internal hierarchy | A switch expression with **no** default branch + `TreatWarningsAsErrors` |
| The number of operations exceeds the number of types, and the types are stable | [Visitor](../skills/visitor.md) |
| The operations come from another assembly (plugins) | Visitor |
| The type set is still changing a lot | **Don't** use Visitor — every new type is a full sweep of edits |

### And: a default branch returning a value is the worst

Of the three non-throwing operations, they all return a "safe value". For `SinhSql`, "safe" means skipping the
condition — and the result is a query returning **more data than it should**. That's a security
bug, not just a calculation bug.

**If you must have a default branch, it has to throw.**

## How to spot it early

```bash
# switch tren kieu co nhanh mac dinh
grep -rnE "_ =>" --include=*.cs src/ | grep -v "throw"

# Dem so cho switch tren cung mot hierarchy
grep -rn "Cong c =>\|is Cong" --include=*.cs src/ | wc -l
```

Three questions for a code review when adding a type to a hierarchy:

1. How many places `switch` on this hierarchy? If you can't answer immediately, that *is* the answer.
2. Do those `switch`es have default branches? Yes = the compiler can't help you at all.
3. Does the default branch return a value or throw? Returning a value = the bug will be silent.

## Related Topics

- [Visitor](../skills/visitor.md) — the expression problem and the three directions of extension
- [Interpreter](../skills/interpreter.md) — the expression tree Visitor walks over
- [Case study — Design Patterns](index.md)
