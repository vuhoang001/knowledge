---
title: Visitor
sidebar_position: 23
description: "Add new operations over a tree of fixed types without touching the node classes — in exchange, adding a node type stops every visitor compiling, and that's a good property."
tags: [visitor, behavioral, gof, double-dispatch, expression-tree]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Visitor

> **Takeaway:** Visitor inverts the trade-off: **adding an operation is cheap, adding a node type is
> expensive** — the exact opposite of ordinary inheritance. Only choose it when the set of node types is
> **stable** and the number of operations is still growing. Guess this direction wrong and every new type
> means editing every visitor.

## Goal

Add new operations over a tree (an AST, a document tree, an expression tree) without editing the
node classes each time — because every operation stuffed into a node class is a responsibility that doesn't
belong to it.

## The original intent (GoF)

Represent an operation to be performed on the elements of a structure. Visitor lets you
define a new operation without changing the classes of the elements.

```csharp
interface IVisitor<T> { T Tham(So n); T Tham(Cong n); T Tham(Nhan n); T Tham(Tru n); }
interface INut { T ChoTham<T>(IVisitor<T> v); }

sealed class So(decimal giaTri) : INut
{
    public T ChoTham<T>(IVisitor<T> v) => v.Tham(this);   // <- this is the second half of the double dispatch
}
```

That last line is the whole mechanism: **double dispatch**. The first call selects the *node type*
(ordinary polymorphism), and the second selects the *operation* (overload resolution on the parameter type).
C# has no built-in multiple dispatch, so this detour has to be written by hand.

## Worked example — an arithmetic expression tree

Run with `dotnet run 28-visitor.cs` on .NET 11.0.0. The tree: `3 + (4 * 5)`.

### One tree, several operations — no node class edited

```text
=== Mot cay, ba thao tac — khong lop nut nao bi sua ===
  danh gia : 23
  in       : (3 + (4 * 5))
  dem nut  : 5
```

Three completely different jobs — computing, generating a string, gathering statistics — and the classes
`So`, `Cong` and `Nhan` don't know any of them exist. They have exactly one method: `ChoTham`.

### Adding a fourth operation — one class

```csharp
sealed class DoSau : IVisitor<int>
{
    public int Tham(So n) => 1;
    public int Tham(Cong n) => 1 + Math.Max(n.Trai.ChoTham(this), n.Phai.ChoTham(this));
    ...
}
```

```text
=== Them thao tac thu tu: do sau — chi them MOT lop ===
  do sau   : 3
```

**Not a single line changed in the node classes.** This is the direction Visitor optimises for.

### The opposite direction — adding a new node type

```text
=== Them KIEU NUT moi (Tru) — moi visitor phai bo sung ===
  in: (10 - 4)
  danh gia: 6
  dem nut : 3
  do sau  : 2
  -> them Tru vao IVisitor<T> lam MOI visitor khong bien dich duoc cho toi khi bo sung
     (do la dac diem tot: trinh bien dich bat, khong phai runtime)
```

Adding `Tru` means adding `T Tham(Tru n)` to `IVisitor<T>` — and **all four visitors immediately stop
compiling** until they're updated.

That's a cost, but it's a **compile-time cost**, which is the cheapest kind. Compare it with:

```csharp
decimal DanhGiaBangSwitch(INut n) => n switch
{
    So s => s.GiaTri,
    Cong c => ...,
    Nhan m => ...,
    // forgot Tru
    _ => throw new NotSupportedException($"chua ho tro {n.GetType().Name}")
};
```

```text
=== So sanh: switch tren kieu thi khong ai bat thieu nhanh ===
  DanhGiaBangSwitch(cay)  = 23
  DanhGiaBangSwitch(cay2) -> NotSupportedException: chua ho tro Tru
```

**The same omission, two moments of discovery.** Visitor reports it at build time; the `switch` reports it
at run time, in production, with real data.

### Before and after

| | A method in the node class | A `switch` on the type | Visitor |
|---|---|---|---|
| Adding an operation | edit **every** node class | add 1 function | add 1 class |
| Adding a node type | add 1 class | edit every `switch`, **with nobody reminding you** | edit every visitor, **with the compiler reminding you** |
| What the node classes know about the operations | everything | nothing | only `ChoTham` |
| An operation needing accumulated state | hard | possible | easy (a visitor field) |
| Reading it the first time | easy | easy | hard — double dispatch isn't intuitive |

## Three directions of extension — choose by what changes most

This is the classic *expression problem*, and there's no perfect solution:

| Approach | Adding a **type** | Adding an **operation** |
|---|---|---|
| A method in the node class | cheap | **expensive** — edit every class |
| A `switch` on the type | **expensive and silent** | cheap |
| Visitor | **expensive but loud** | cheap |

**Choose by which axis is more stable.** A language's AST has a fixed node set with operations growing
forever (type checking, optimisation, code generation, formatting) → Visitor. A system adding a new product
type every month but with only two operations → don't.

## Modern C# has narrowed the gap

Pattern matching with a `switch` expression over a closed hierarchy is far better than in the GoF's
time:

```csharp
decimal DanhGia(INut n) => n switch
{
    So s => s.GiaTri,
    Cong c => DanhGia(c.Trai) + DanhGia(c.Phai),
    Nhan m => DanhGia(m.Trai) * DanhGia(m.Phai),
    Tru t => DanhGia(t.Trai) - DanhGia(t.Phai),
};
```

Far shorter and immediately readable. What's still missing is **exhaustiveness checking**: C# has no closed
union types, so the compiler can't assert you've covered everything. It only warns when there's no default
branch — and that warning is easy to ignore.

**The recommendation:** with 3–5 node types and a few operations, use a `switch` expression and turn on
`TreatWarningsAsErrors`. Only climb up to Visitor when the number of operations exceeds the number of types,
or when the operations come from another assembly (plugins).

The full failure case: [Adding a new node, editing every visitor](../case-studies/them-node-moi-sua-moi-visitor.md).

## When NOT to use it

| Situation | Why |
|---|---|
| The set of node types is still changing | Every new type means editing every visitor |
| There are only 1–2 operations | A method in the node class or a `switch` is far simpler |
| The team isn't familiar with double dispatch | The cost of explaining exceeds the benefit |
| The operation needs access to a node's `private` members | A visitor only sees the public API — you'd have to widen the node's surface |
| The structure isn't a tree or graph | Visitor was born for hierarchical structures |

## Trade-offs

| You gain | You lose |
|---|---|
| Adding an operation doesn't touch the node classes | Adding a node type edits every visitor |
| An operation is gathered in one place, readable end to end | The logic is separated from the data — you jump back and forth |
| A visitor can hold accumulated state easily | Double dispatch is hard for newcomers to follow |
| The compiler catches a missing branch | The node classes must expose enough publicly for the visitor to work |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Using Visitor while the type set is still changing | Every new type is a full sweep of edits |
| Adding a default branch to a visitor "to be safe" | You lose the main benefit — the compiler no longer catches it |
| Nodes deciding whether to traverse children, or leaving it to the visitor | Two traversal styles mixed; pick one and be consistent |
| A stateful visitor reused across trees | State from the previous traversal leaks in |
| Using reflection instead of double dispatch | Slow, loses type checking, and unfriendly to AOT |
| A non-generic `ChoTham` with a separate visitor per return type | Doubles the interface count; use `IVisitor<T>` |

The third row is worth deciding early: **who controls the traversal?** If nodes traverse their children
(`Cong.ChoTham` calls `Trai.ChoTham`), the visitor can't control the order and can't stop early. If the
visitor traverses (as in this example), each visitor has to write the descent itself — duplicated code but
more flexible.

## FAQ

<details>
<summary>Why double dispatch instead of just calling <code>visitor.Tham(nut)</code>?</summary>

Because C# resolves overloads on the parameter's **static** type. With an `INut nut`, the call
`v.Tham(nut)` doesn't compile (there's no `Tham(INut)`) — or if there were, it would always call that one
regardless of the real type.

`nut.ChoTham(v)` goes through **dynamic** polymorphism to reach the correct node class, and there `this`
already has a concrete static type (`So`), so `v.Tham(this)` resolves to the right overload. Two steps, each
a different kind of dispatch — hence *double dispatch*.

</details>

<details>
<summary>Is there a Visitor already in .NET?</summary>

Yes: `System.Linq.Expressions.ExpressionVisitor`. EF Core uses it to translate LINQ expression trees
into SQL, and you subclass it to intervene in a query.

That's also the textbook example of the right conditions for using it: `Expression`'s node type set is
**very stable** (defined by .NET), while the number of operations over it is unbounded.

</details>

<details>
<summary>Can Visitor be used with <code>record</code> and pattern matching?</summary>

It can, and the combination is often good: `record`s for the nodes (immutable, with destructuring), Visitor
for the heavy operations, and `switch` expressions for the light ones.

There's no rule forcing you to pick one. What to avoid is **both doing the same job** — two code paths for
the same operation will drift apart sooner or later.

</details>

## Related Topics

- [Composite](composite.md) — the tree structure Visitor walks over
- [Interpreter](interpreter.md) — Visitor is how you add operations to an expression tree
- [Iterator](iterator.md) — handles the *traversal order*; Visitor handles *what to do at each node*
- [Strategy](strategy.md) — a visitor is also a pluggable algorithm
- [SOLID](../reference/solid.md) — O along the operation axis, violating O along the type axis

## References

- GoF — *Design Patterns*, Visitor
- Microsoft — *ExpressionVisitor Class*
