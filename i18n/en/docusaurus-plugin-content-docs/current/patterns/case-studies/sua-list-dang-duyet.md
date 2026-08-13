---
title: The nightly job dies on one RemoveAll
sidebar_position: 18
description: "An InvalidOperationException from mutating a collection while iterating is the lucky case — the genuinely dangerous one is a lazy IEnumerable iterated twice, doubling the API calls."
tags: [case-study, iterator, ienumerable, lazy, linq]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# The nightly job dies on one `RemoveAll`

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 21-iterator.cs`
> on .NET 11.0.0.

## Context

A nightly cleanup job: walk the list of pending records and drop the expired ones.

```csharp
foreach (var x in ds)
    if (DaQuaHan(x)) ds.Remove(x);
```

Three months without a problem — because in those three months, no record ever expired.

## Symptoms — the easy part

```text
=== Sua collection dang duyet ===
  nem: InvalidOperationException: Collection was modified; enumeration operation may not execute.
```

The job dies, with a clear exception and a stack trace pointing at the exact line. Fixing it takes five
minutes.

**This is the lucky case.** `List<T>` keeps a `_version` that increments on each mutation, and the enumerator
compares it on every `MoveNext()` — it **deliberately** turns a silent bug into an exception.

Two fixes, both correct:

```csharp
foreach (var x in ds2.ToArray()) if (x == "b") ds2.Remove(x);          // iterate a copy
for (var i = ds3.Count - 1; i >= 0; i--) if (ds3[i] == "b") ds3.RemoveAt(i);   // iterate backwards
```

```text
=== Cach dung: duyet ban sao, hoac duyet nguoc bang chi so ===
  con lai: [a, c]
  con lai: [a, c]
```

## Symptoms — the hard part

That same week, the team notices the third-party API bill has doubled. With no errors at all.

The code:

```csharp
var canGui = danhSach.Where(x => x.CanThongBao).Select(x => GoiApiLayEmail(x));
_logger.LogInformation("Se gui {So} thong bao", canGui.Count());
foreach (var e in canGui) Gui(e);
```

```text
=== Bay cua lazy: duyet lai la tinh lai ===
  Count() = 5, so lan tinh = 5
  Sum()   = 30, so lan tinh = 10   <- tinh lai tu dau
  Sau ToList(): so lan tinh = 15 (khong tang tu 15)
```

**`Count()` then iterating = computing twice.** With `Select(x => x * 2)` that's harmless. With
`Select(x => GoiApiLayEmail(x))` it's double the API calls — and the log line added "to make it easier to
follow" is exactly what caused it.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The job runs twice (a duplicated cron) | Exactly double | The logs show exactly one run per night |
| The HTTP client's retries | Double is the number for one retry | There are no errors to retry; every call returns 200 |
| The third party is billing wrongly | Blaming outward | Our own logs also count double |
| There are two places calling the API | Nearly right | Only one place in the code — but it **runs** twice |

The decisive evidence: add a counter inside the `Select` and see it come out at exactly twice the element
count.

## The real cause

`IEnumerable<T>` is **lazy**. `Where` and `Select` compute nothing — they build a machine that will
compute **every time** somebody iterates.

`canGui.Count()` is one iteration. `foreach (var e in canGui)` is the second.

This is the direct flip side of what makes laziness useful:

```text
=== Lazy: chi tinh khi lay, dung khi du ===
  3 phan tu dau: [1, 4, 9], so lan sinh = 3
```

An **infinite** sequence runs only 3 times because of `Take(3)`. That same mechanism makes `Count()` +
`foreach` run 2n times.

**`IEnumerable<T>` isn't a collection. It's a recipe for producing one.**

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| A unit test "sends the right list" | Green | The result is correct — it just costs double |
| An integration test with a fake API | Green | The mock returns immediately and nobody counts the calls |
| Code review | Missed it | A `Count()` for a log line is a good habit and looks harmless |
| The compiler | Silent | Iterating an `IEnumerable` several times is legal |
| Analyzers | There's a rule | `CA1851` (*possible multiple enumeration*) — but it isn't enabled |

The last row is the missed opportunity: .NET **already has** an analyzer for this bug. Enabling one line in
`.editorconfig` blocks it.

## The fix

### Freeze it once

```csharp
var canGui = danhSach.Where(x => x.CanThongBao).Select(x => GoiApiLayEmail(x)).ToList();
```

```text
  Sau ToList(): so lan tinh = 15 (khong tang tu 15)
```

After freezing, the computation count doesn't rise however many times you iterate.

**The rule: if you intend to iterate twice or more, `ToList()` immediately.**

### Choose a return type that states the intent

| The caller needs | Return |
|---|---|
| One iteration, possibly very many elements | `IEnumerable<T>` |
| A `Count` | `IReadOnlyCollection<T>` |
| Several iterations, index access | `IReadOnlyList<T>` |
| A result from a database whose connection will close | `ToList()` **before returning** |

That last row is its own class of bug: returning an `IEnumerable` from a repository and then closing the
connection, so the caller iterating afterwards gets an exception in a completely unrelated place.

### Enable the analyzer

```ini
# .editorconfig
dotnet_diagnostic.CA1851.severity = error
```

### And the third trap: exceptions happen late

```csharp
IEnumerable<string> Doc(string tep)
{
    if (!File.Exists(tep)) throw new FileNotFoundException(tep);   // does NOT run immediately
    foreach (var d in File.ReadLines(tep)) yield return d;
}
```

A function containing `yield return` **runs not one line** until somebody iterates. The `FileNotFoundException`
will be thrown at the iteration site — possibly in another layer, after a `try/catch` has already closed.

The fix: split it into two functions.

```csharp
IEnumerable<string> Doc(string tep)
{
    if (!File.Exists(tep)) throw new FileNotFoundException(tep);   // chay ngay
    return DocLoi(tep);
}
private IEnumerable<string> DocLoi(string tep) { foreach (...) yield return ...; }
```

## How to spot it early

```bash
# Sua collection trong foreach
grep -rnA5 "foreach" --include=*.cs src/ | grep -E "\.(Remove|Add|Clear)\("

# Count() roi duyet lai
grep -rnB2 -A5 "\.Count()" --include=*.cs src/ | grep -A3 "foreach"
```

Three questions for a code review:

1. How many times is this `IEnumerable` variable iterated? More than 1 needs a `ToList()`.
2. Is there I/O inside the `Select`/`Where` (an API, a database, a file)? If so, re-iterating means re-calling.
3. Does this `IEnumerable`-returning function contain a `yield return`? If so, does the argument validation
   run immediately?

## Related Topics

- [Iterator](../skills/iterator.md) — the two `IEnumerable` traps in C#
- [Composite](../skills/composite.md) — tree traversal, where laziness is most common
- [Case study — Design Patterns](index.md)
