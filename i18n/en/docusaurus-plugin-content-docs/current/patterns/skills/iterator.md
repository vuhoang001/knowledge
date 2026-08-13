---
title: Iterator
sidebar_position: 16
description: "Traverse without exposing the internal structure — in C# this pattern is already in the language, so what's worth learning is its two traps."
tags: [iterator, behavioral, gof, ienumerable, lazy, linq]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Iterator

> **Takeaway:** In C#, Iterator **is already part of the language** — `IEnumerable<T>`,
> `foreach`, `yield return`. So what's worth learning isn't "how to implement it" but two traps:
> **mutating the collection you're iterating** and **re-iterating means recomputing**.

## Goal

Traverse a collection without the traverser needing to know whether it's an array, a tree, or results
returned incrementally from an API — and know the two places that mechanism bites back.

## The original intent (GoF)

Provide a way to access the elements of an aggregate sequentially without exposing its internal
representation.

C# already implements it:

```csharp
interface IEnumerable<out T> { IEnumerator<T> GetEnumerator(); }
interface IEnumerator<out T> { T Current { get; } bool MoveNext(); void Reset(); }
```

`foreach` is syntactic sugar for `GetEnumerator()` + `MoveNext()` + `Current`. Writing an
`IEnumerator` by hand is essentially never needed — `yield return` generates it for you.

## Worked examples

Run with `dotnet run 21-iterator.cs` on .NET 11.0.0.

### Trap 1 — mutating the collection you're iterating

```csharp
var ds = new List<string> { "a", "b", "c" };
foreach (var x in ds) if (x == "b") ds.Remove(x);
```

```text
=== Sua collection dang duyet ===
  nem: InvalidOperationException: Collection was modified; enumeration operation may not execute.
```

`List<T>` keeps a `_version` that increments on every mutation; the enumerator compares it on every
`MoveNext()`. **This is good behaviour** — it turns a silent bug (a skipped element, an element visited
twice) into a clear exception.

Both fixes produce the correct result:

```csharp
foreach (var x in ds2.ToArray()) if (x == "b") ds2.Remove(x);          // iterate a copy
for (var i = ds3.Count - 1; i >= 0; i--) if (ds3[i] == "b") ds3.RemoveAt(i);   // iterate backwards
```

```text
=== Cach dung: duyet ban sao, hoac duyet nguoc bang chi so ===
  con lai: [a, c]
  con lai: [a, c]
```

Iterating backwards by index needs no extra allocation — which makes it the default choice for a large
collection.

**A warning:** not every collection throws. `ConcurrentDictionary` allows mutation while iterating and
you get back an **undefined** snapshot — an element added part-way through may or may not appear. There,
no exception will save you.

### A hand-written iterator — traversing a tree

```csharp
public IEnumerable<int> ThuTuGiua()
{
    if (trai is not null) foreach (var v in trai.ThuTuGiua()) yield return v;
    yield return giaTri;
    if (phai is not null) foreach (var v in phai.ThuTuGiua()) yield return v;
}
```

```text
=== Iterator tu viet: duyet cay theo thu tu giua ===
  giua : [1, 3, 4, 5, 7, 8, 9]
  truoc: [5, 3, 1, 4, 8, 7, 9]
  Nguoi goi khong biet gi ve con trai / con phai
```

This is the pattern's original value: **two different traversal orders over the same structure**, while
the caller only sees an `IEnumerable<int>`. No `if` about the tree's shape on the user's side.

### Lazy — computed only as you take

```csharp
IEnumerable<int> DaySo() { for (var i = 1; ; i++) { demGoi++; yield return i * i; } }
var baCaiDau = DaySo().Take(3).ToList();
```

```text
=== Lazy: chi tinh khi lay, dung khi du ===
  3 phan tu dau: [1, 4, 9], so lan sinh = 3
```

An **infinite** loop that only runs 3 times. This is something an array can't do.

### Trap 2 — re-iterating means recomputing

```text
=== Bay cua lazy: duyet lai la tinh lai ===
  Count() = 5, so lan tinh = 5
  Sum()   = 30, so lan tinh = 10   <- tinh lai tu dau
  Sau ToList(): so lan tinh = 15 (khong tang tu 15)
```

**`Count()` then `Sum()` runs the computation twice.** With `Select(x => x * 2)` that's harmless; with
`Select(x => GoiApi(x))` it's double the network calls, and nothing in the code says so.

The rule: **freeze it once with `ToList()`/`ToArray()` if you intend to iterate twice or more.**
After freezing, the computation count stops rising — the last line of the output.

The full failure case: [Mutating the list you're iterating](../case-studies/sua-list-dang-duyet.md).

### Before and after

| | Returning `List<T>` | Returning `IEnumerable<T>` |
|---|---|---|
| Computation | immediate, all of it | as you take, piece by piece |
| Iterating twice | cheap | **recomputes from scratch** |
| Infinite sequences | no | yes |
| Memory | holds the whole set | just the current element |
| Can the caller mutate the result | yes — it exposes the internal structure | no |
| When exceptions occur | at the call | during iteration — **far from the cause** |

That last row is the third common trap: a function `IEnumerable<T> Doc(string tep)` using
`yield return` will **not throw** when the file doesn't exist until somebody starts iterating —
possibly in a different layer, after a `try/catch` has already closed.

## When NOT to return `IEnumerable<T>`

| Situation | Return |
|---|---|
| The caller will almost certainly iterate several times | `IReadOnlyList<T>` |
| You need to know the count | `IReadOnlyCollection<T>` — has `Count` without iterating |
| The result comes from a database whose connection will close | Freeze with `ToList()` before returning |
| You want exceptions to occur at the call site | Freeze, or split the validation out of the `yield` part |

That last row has its own technique: split the function in two, with the outer function validating the
arguments and then calling the inner one (`private IEnumerable<T> DocLoi(...)`) containing the `yield`.
Validation runs immediately, and the iteration stays lazy.

## Trade-offs

| You gain | You lose |
|---|---|
| The traverser doesn't know the internal structure | No random access; no `[i]` |
| Several traversal orders over one structure | Each order is a method, easily drifting into several places |
| Laziness — infinite sequences, memory savings | Re-iterating recomputes; exceptions occur far from the call |
| It composes with LINQ | An allocation cost for the state machine on each iteration |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Mutating the collection inside a `foreach` | `InvalidOperationException` (lucky) or undefined results (unlucky) |
| Iterating an `IEnumerable` several times | Recomputation — double the API/DB calls, silently |
| Returning an `IEnumerable` from a repository and then closing the connection | Iterating after the connection closes → a throw where nobody expects it |
| `yield return` in a function that validates its arguments | The validation doesn't run until iteration |
| Recursively traversing a tree with nested `yield`s | O(depth) cost for **each** element; very slow on a deep tree |
| Implementing `IEnumerator` by hand | Essentially never needed; `yield return` is more correct and shorter |

That second-to-last row is worth remembering for deep trees: each nested `yield return` has to pass through
every enumerator layer above it. For a deep tree, use an explicit stack rather than recursion.

## FAQ

<details>
<summary>When do I use <code>IAsyncEnumerable&lt;T&gt;</code>?</summary>

When each element needs an asynchronous operation to fetch: reading lines from the network, paginating an
API, reading a stream.

```csharp
await foreach (var d in DocTungTrang(ct)) { ... }
```

It keeps the laziness advantage without blocking a thread. And it keeps both traps above — re-iterating
still means calling the API again.

</details>

<details>
<summary>Is <code>yield return</code> expensive?</summary>

The compiler generates a state machine class; each `GetEnumerator()` call allocates an
instance. In a hot loop running millions of times, that cost is measurable.

The way out when you genuinely need it: return a hand-written struct enumerator (as `List<T>.Enumerator`
does), or use `Span<T>` if the data is contiguous. Only do this after measuring.

</details>

<details>
<summary>Why is <code>Reset()</code> in the interface when nobody uses it?</summary>

It's a legacy of COM interop. For an iterator generated by `yield return`, `Reset()` throws
`NotSupportedException`.

The correct way to "reset" is to call `GetEnumerator()` again — that is, to start a new `foreach`. Which is
exactly why "re-iterating means recomputing".

</details>

## Related Topics

- [Composite](composite.md) — the tree structure Iterator is often used to traverse
- [Visitor](visitor.md) — operations over a tree; Iterator handles the *order*, Visitor handles *what to do*
- [Strategy](strategy.md) — several traversal orders are several traversal strategies
- [Interpreter](interpreter.md) — traversing an expression tree
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the symptom lookup table

## References

- GoF — *Design Patterns*, Iterator
- Microsoft — *Iterators* (C# programming guide)
