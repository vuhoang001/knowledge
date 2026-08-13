---
title: Composite
sidebar_position: 8
description: "Handle one thing and a group of things through the same interface — and the trap is that a tree with a cycle makes the recursion never stop."
tags: [composite, structural, gof, tree, recursion]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Composite

> **Takeaway:** Composite removes the `if (is a group) ... else ...` line from **every** call site, by
> having leaves and branches implement a shared interface. The price: the tree structure becomes run-time
> data, and **nothing guarantees it's actually a tree** — a cycle drives the recursion into
> `StackOverflow`.

## Goal

Block the kind of code where every operation on a nested structure has to ask itself *"is this one element
or a group?"* — because that question gets repeated in every function, and missing one place is one kind
of wrong.

## The original intent (GoF)

Compose objects into tree structures to represent part–whole hierarchies. Composite lets clients treat
individual objects and groups of objects **uniformly**.

```csharp
interface INut { string Ten { get; } int KichThuoc(); int DemTep(); }

sealed class Tep(string ten, int bytes) : INut { ... }      // la
sealed class ThuMuc(string ten) : INut { ... }              // nhanh, chua List<INut>
```

The crux: `ThuMuc` holds a `List<INut>` — meaning it can hold both `Tep` and other `ThuMuc`s, and it
**doesn't need to know** the difference.

## Worked example — a directory tree

Run with `dotnet run 13-composite.cs` on .NET 11.0.0.

### The same call for a leaf and for a branch

```csharp
foreach (INut n in new INut[] { new Tep("README.md", 800), src, goc })
    Console.WriteLine($"  {n.Ten,-12} kich thuoc = {n.KichThuoc(),6}  so tep = {n.DemTep()}");
```

```text
=== Cung mot loi goi cho la va cho nhanh ===
  README.md    kich thuoc =    800  so tep = 1
  src          kich thuoc =   3500  so tep = 2
  du-an        kich thuoc =   7500  so tep = 4
```

This loop has **not one `if`** about the node's kind. `Tep.DemTep()` returns `1` and
`ThuMuc.DemTep()` sums its children — polymorphism handles the rest.

### Recursion across the whole tree

```csharp
public int KichThuoc() => _con.Sum(c => c.KichThuoc());
```

```text
=== Cay ===
du-an/  (7500 bytes, 4 tep)
  src/  (3500 bytes, 2 tep)
    Program.cs  (2400 bytes)
    Xuong.cs  (1100 bytes)
  test/  (3200 bytes, 1 tep)
    XuongTest.cs  (3200 bytes)
  README.md  (800 bytes)
```

One line of `Sum` handles a tree of any depth. This is Composite's selling point.

### The trap — cycles

Nothing in the types prevents `b` from containing `a` while `a` already contains `b`:

```csharp
var a = new ThuMuc("a");
var b = new ThuMuc("b");
a.Them(new Tep("a.txt", 100));
b.Them(new Tep("b.txt", 250));
a.Them(b);
b.Them(a);                       // cycle: b points back at a
```

```text
=== Chu trinh: thu muc con tro nguoc ve cha ===
  nem: InvalidOperationException: do sau vuot 200 — nghi co chu trinh (that su se la StackOverflow)
```

This example **deliberately** puts a depth counter capping at 200 so it can print a message. Real code has
no such counter, and the result is a `StackOverflowException` — the kind of exception you
**cannot catch** in .NET: the process dies immediately, no `finally` runs, and none of your logging
happens.

### The fix — remember visited nodes

```csharp
public int KichThuocAnToan(HashSet<INut> daTham)
{
    if (!daTham.Add(this)) return 0;
    return _con.Sum(c => c is ThuMuc t ? t.KichThuocAnToan(daTham) : c.KichThuoc());
}
```

```text
=== Co chan chu trinh ===
  kich thuoc = 350
```

350 = 100 + 250, each file counted exactly once despite the structure having a loop.

### Three levels of cycle prevention

| Level | How | Cost |
|---|---|---|
| **Block on add** | `Them()` checks whether the new node is one of its own ancestors | O(depth) per add; this is the level to choose by default |
| **Block on traversal** | A `HashSet` of visited nodes, as above | O(node count) memory per traversal |
| **Block by type** | An immutable tree built bottom-up — children must exist before parents | Cycles become unconstructible; but the tree is hard to edit in place |

The full failure case: [The tree traversal that never stops](../case-studies/duyet-cay-khong-bao-gio-dung.md).

## The most important design trade-off — where `Them()` goes

This is where the GoF say outright there's no correct answer:

| Approach | You gain | You lose |
|---|---|---|
| `Them`/`Xoa` on the **shared interface** | The caller treats every node alike, completely transparently | `Tep.Them()` has to throw `NotSupportedException` — a violation of [ISP](../reference/solid.md#i--interface-segregation) |
| `Them`/`Xoa` only on the **branch class** | Type-safe, no meaningless methods | The caller has to cast / type-check when it wants to edit the tree |

**The pragmatic recommendation:** put them on the branch class. The reason: *reading* the tree
(`KichThuoc`, `DemTep`) is what gets called everywhere and needs to be uniform; *editing* the tree usually
happens in one construction site, and that site knows perfectly well whether it's holding a branch or a leaf.

The example on this page follows that — `Them` only exists on `ThuMuc`.

## Recognising it outside directory trees

| Context | Leaf | Branch |
|---|---|---|
| Filter conditions | `Cot > 5` | `And(...)`, `Or(...)` |
| Permissions | A single permission | A permission group / role |
| UI | A button, a label | A panel, a layout |
| Org structure | An employee | A department |
| An order | A product | A combo / bundle |

The first row is where Composite and [Interpreter](interpreter.md) meet: a filter expression tree is both
a Composite (the structure) and an Interpreter (the semantics).

## When NOT to use it

| Situation | Why |
|---|---|
| The structure has only **one** level of nesting | A `List<T>` is usually enough; Composite adds an interface that buys nothing |
| Leaves and branches have completely different operation sets | Forcing a shared interface produces a flood of `NotSupported` |
| You need operations that differ by node type, not uniform ones | See [Visitor](visitor.md) |
| The tree is very deep (thousands of levels) | Recursion overflows the stack; you must traverse with an explicit loop + stack |

## Trade-offs

| You gain | You lose |
|---|---|
| No more `if (is a group)` at every call site | The shared interface must be the common denominator — easily becoming too wide or too narrow |
| Adding a new node type doesn't touch the traversal code | Nothing guarantees the structure really is a tree |
| One line of recursion handles any depth | A cycle → `StackOverflow`, uncatchable |
| The structure is built at run time, from configuration | Hard to know what shape the tree has while debugging |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Not blocking cycles | The process dies of `StackOverflowException` — no logging, no `finally` |
| Putting `Them`/`Xoa` on the shared interface and throwing in the leaf | The error moves from compile time to runtime |
| Recomputing `KichThuoc()` on every call over a large tree | O(n) per read; you need a cache and to **invalidate that cache when the tree changes** |
| Letting child nodes hold a back-reference to the parent without managing it | Leaks when the tree is discarded; and it makes cycles very easy |
| Recursing over a tree loaded from user input | A user supplying a 100,000-level-deep tree is a DoS vector |

The third row is notable in the example above: the `In()` function calls `KichThuoc()` and `DemTep()` at
each node, so the tree gets traversed repeatedly. With a small tree that's fine; with a real one it's
O(n × depth).

## FAQ

<details>
<summary>How does Composite differ from Decorator? Both wrap.</summary>

The number of children. [Decorator](decorator.md) wraps **exactly one** object with the purpose of *adding
behaviour*. Composite holds **many** children with the purpose of *aggregating structure*.

The practical consequence: a decorator chain is always a straight line; a composite tree branches.

</details>

<details>
<summary>How do I traverse a very deep tree without overflowing the stack?</summary>

Replace the recursion with a loop and an explicit stack:

```csharp
var stack = new Stack<INut>([goc]);
var tong = 0;
while (stack.Count > 0)
{
    var n = stack.Pop();
    if (n is ThuMuc t) foreach (var c in t.Con) stack.Push(c);
    else tong += n.KichThuoc();
}
```

The memory moves from the call stack (limited to ~1 MB) onto the heap. Add a `HashSet` blocking cycles
and you have a version that's safe for data coming from outside.

</details>

<details>
<summary>Should I cache the size at each branch?</summary>

Yes, when the tree is read more than it's edited — the common case. But you have to solve **cache
invalidation**: `Them()` must clear its own cache *and every ancestor's*, so branches need a
reference up to the parent.

A parent reference in turn makes cycles easier to create. If you go this way, blocking cycles inside
`Them()` becomes mandatory rather than optional.

</details>

## Related Topics

- [Decorator](decorator.md) — wraps one, doesn't hold many
- [Iterator](iterator.md) — how to traverse a tree without exposing its internal structure
- [Visitor](visitor.md) — adding new operations over the tree without editing the node classes
- [Interpreter](interpreter.md) — a composite tree carrying the semantics of a small language
- [Builder](builder.md) — often used to construct a composite tree neatly

## References

- GoF — *Design Patterns*, Composite
