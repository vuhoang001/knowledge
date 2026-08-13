---
title: The process dies leaving no log
sidebar_position: 7
description: "One folder pointing back at its parent creates a cycle in the composite tree — a StackOverflowException can't be caught, runs no finally, and writes no log."
tags: [case-study, composite, iterator, recursion, stack-overflow]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# The process dies leaving no log

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 13-composite.cs`
> on .NET 11.0.0.

## Context

A document management service uses [Composite](../skills/composite.md) for its folder tree:

```csharp
interface INut { string Ten { get; } int KichThuoc(); int DemTep(); }

sealed class ThuMuc(string ten) : INut
{
    private readonly List<INut> _con = [];
    public void Them(INut n) => _con.Add(n);
    public int KichThuoc() => _con.Sum(c => c.KichThuoc());
}
```

Working fine:

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

A new feature lets users **drag and drop** folders to reorganise them.

## Symptoms

The nightly folder-size worker starts dying. The symptoms:

- The process vanishes from the process list.
- **Not one log line** at `Error` or `Fatal` level.
- The last log line is `"bat dau tinh dung luong"`.
- No `finally` runs — the database connection is left dangling, the distributed lock isn't released.
- The health check reports the service dead after 30 seconds.

On the dev environment it can't be reproduced.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The container's OOM killer | The process vanishes with no log | `dmesg` shows nothing; there's plenty of RAM headroom |
| A deadlock, then killed by the health check | No logs is characteristic of a hang | A thread dump shows **one** thread running very deep |
| The database connection dropped | The last log is right before a query | That query succeeded — it's in the database's own log |
| A bug in LINQ's `Sum()` | Desperation | No |

The decisive evidence is a **thread dump**: a call stack with thousands of nested `KichThuoc`
frames. That's when `StackOverflowException` comes into view — and simultaneously explains
why there are no logs.

## The real cause

The drag-and-drop feature lets a user drop folder `a` **inside** folder `b` while
`b` is already inside `a`.

```csharp
var a = new ThuMuc("a");
var b = new ThuMuc("b");
a.Them(b);
b.Them(a);                       // cycle: b points back at a
```

The structure is no longer a tree. `KichThuoc()` recurses infinitely.

```text
=== Chu trinh: thu muc con tro nguoc ve cha ===
  nem: InvalidOperationException: do sau vuot 200 — nghi co chu trinh (that su se la StackOverflow)
```

*(The example above deliberately caps at depth 200 so it can print a message. Real code has no such
counter.)*

**Why there are no logs:** a `StackOverflowException` in .NET (since 2.0) **cannot be caught**.
No `catch`, no `finally`, no `AppDomain.UnhandledException`. The runtime terminates the process
immediately — because there's no stack left to run a handler on.

That's why the symptom looks like a `kill -9`, and why all three initial hypotheses aimed at the
infrastructure.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| A unit test for `KichThuoc()` | Green | The test data is a real tree with no cycle |
| A test for the drag-and-drop feature | Green | It checks "did the folder move", not the resulting structure |
| The data types | No help | `List<INut>` can hold anything, ancestors included |
| The compiler | Silent | There's no notion of "tree" in the type system |
| Load tests | Green | They generate random valid trees |

The real blind spot: **`Them()` is where the bug is created, but `KichThuoc()` is where it explodes.**
The two are hours and one restart apart — so nobody connects them.

## The fix

### The urgent fix — block on traversal

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

350 = 100 + 250: each file counted exactly once despite the structure having a loop. The process stops dying.

But the data is still corrupt — it just doesn't explode.

### The right fix — block on **add**

```csharp
public void Them(INut n)
{
    if (n is ThuMuc t && (t == this || t.ChuaSau(this)))
        throw new InvalidOperationException($"khong the them \"{n.Ten}\" vao \"{Ten}\": tao chu trinh");
    _con.Add(n);
}
```

The error now appears **at the drag-and-drop action**, with a message the user can understand, instead of
at 2am in a different worker.

### Three levels of prevention, chosen by context

| Level | How | Cost | Choose when |
|---|---|---|---|
| Block on add | Check ancestors inside `Them()` | O(depth) per add | **The default** |
| Block on traversal | A `HashSet` of visited nodes | O(node count) memory per traversal | The tree comes from a source you don't control |
| Block by type | An immutable tree built bottom-up | You can't edit the tree in place | The structure is built once |

You should do **both of the first two**: level one blocks corrupt data being created, level two protects you
from corrupt data already sitting in the database.

### And: drop the recursion for trees from external sources

```csharp
var stack = new Stack<INut>([goc]);
while (stack.Count > 0) { ... }
```

The memory moves from the call stack (~1 MB) onto the heap. For a tree uploaded by a **user**, recursion
is a DoS vector: a tree 100,000 levels deep is enough to kill the process without any cycle at all.

## How to spot it early

```sql
-- Neu cay luu trong CSDL: tim chu trinh bang de quy co gioi han
WITH RECURSIVE duong(id, cha, sau) AS (
  SELECT id, cha_id, 1 FROM thu_muc WHERE cha_id IS NULL
  UNION ALL
  SELECT t.id, t.cha_id, d.sau + 1 FROM thu_muc t JOIN duong d ON t.cha_id = d.id
  WHERE d.sau < 100
)
SELECT count(*) FROM duong WHERE sau >= 100;   -- > 0 la nghi co chu trinh
```

Three questions for a code review:

1. Does `Them()` check whether the new node is one of its own ancestors?
2. Is there any recursive function running over a structure built by **users**?
3. If the process dies of a `StackOverflow`, what evidence do you have? (The correct answer:
   *none* — so it has to be prevented, it can't be detected afterwards.)

## Related Topics

- [Composite](../skills/composite.md) — the pattern that caused this, and the three levels of cycle prevention
- [Iterator](../skills/iterator.md) — traversing with an explicit stack instead of recursion
- [Case study — Design Patterns](index.md)
