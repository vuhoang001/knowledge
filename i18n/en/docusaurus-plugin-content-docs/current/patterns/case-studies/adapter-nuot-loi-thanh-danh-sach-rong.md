---
title: The report is 4.2 million short, with no error
sidebar_position: 5
description: "An adapter's bare catch turns an exchange-rate service incident into null, and null multiplied by 0 produces a wrong number that looks like a right one."
tags: [case-study, adapter, exception-handling, silent-failure]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# The report is 4.2 million short, with no error

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 11-adapter.cs`
> on .NET 11.0.0.

## Context

A revenue report converted into VND. The exchange rates come from a third-party service through an adapter:

```csharp
sealed class AdapterNuotLoi(ThuVienTyGiaBenThuBa tv) : ITyGia
{
    public decimal? LayTyGia(string ma)
    {
        try { return decimal.Parse(tv.FetchRate(ma)); }
        catch { return null; }                       // swallows absolutely everything
    }
}
```

The caller:

```csharp
foreach (var d in dong) t += d.tien * (tg.LayTyGia(d.ma) ?? 0m);
```

These two lines, written six months apart by two people, combine into a hole.

## Symptoms

Accounting reports: *"Q3 revenue is lower than the sales department's figure, but not by much — a few
percent."*

```text
=== Hau qua tren bao cao ===
  Tong voi adapter nuot loi : 4,192,050 VND   <- thieu tien, khong bao gi
  Tong voi adapter dich loi : dung lai — khong tra duoc ty gia cho "XXX"
```

No exception, no log line at `Error` level, no dashboard warning. The report runs to completion, mails on
time, and is **wrong**.

The worst part: it's wrong by a *little*. If half were missing everybody would see it immediately. A few
percent and people start arguing over who's right.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The two departments use two revenue definitions | The classic for mismatched reports | Compare the definitions: they're the same |
| A discrepancy from exchange-rate rounding | The gap is small | Rounding causes discrepancies in the units column, not the millions |
| Some orders are filtered out at the query layer | The right direction for "missing rows" | Count the rows: **identical** on both sides |
| One currency's rate is wrong | Nearly right | Right — but it isn't *wrong*, it's **zero** |

The third hypothesis is the notable one: the debugger checks the **row** count, sees it match, and therefore
drops the "missing data" direction. The data isn't missing — it's being multiplied by 0.

## The real cause

The rate service doesn't have the code `XXX` (a rare currency recently added to the system). It throws
`ExternalRateApiException`.

`catch { return null; }` swallows that exception and returns `null`. The caller has `?? 0m`. The result:
that row contributes **0 VND** to the total.

A chain of three links, each individually "reasonable":

1. The adapter: *"if we can't get it, return `null` and let the caller decide."*
2. The caller: *"`null` means there isn't one, and `?? 0m` to be safe."*
3. The report: sums and prints.

**Nobody is wrong on their own. Put together, money disappears.**

The crux is that a bare `catch` can't distinguish four completely different situations:

| The real situation | After `catch { return null; }` |
|---|---|
| The currency code doesn't exist | `null` |
| The service is down | `null` |
| The token expired | `null` |
| They changed the number format and `Parse` failed | `null` |

The last three are **system incidents** and deserve to stop the pipeline. They're treated as the first
situation.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Adapter unit tests | Green | The tests use valid codes (`USD`, `JPY`) |
| A test for "a non-existent code returns null" | Green | That's precisely the specified behaviour — **the spec is wrong** |
| Report integration tests | Green | The test data has no rare currency |
| Monitoring | Silent | There's no exception to count and no alert to raise |
| Row-count checks | Match | The row is still there, only its value is 0 |

The second row is the deepest lesson: **there's a green test asserting exactly the wrong behaviour.** Tests
don't protect you from a wrong specification.

The fourth row explains why it survived so long: the monitoring system counts exceptions. With no
exception there's nothing to count — the incident is **invisible to the very tool built to see it**.

## The fix

### Step 1 — `catch` the specific type and translate it into your own language

```csharp
sealed class AdapterDichLoi(ThuVienTyGiaBenThuBa tv) : ITyGia
{
    public decimal? LayTyGia(string ma)
    {
        try { return decimal.Parse(tv.FetchRate(ma)); }
        catch (ExternalRateApiException e) { throw new KhongTraCuuDuocTyGia($"khong tra duoc ty gia cho \"{ma}\"", e); }
    }
}
```

```text
=== Adapter dich loi sang ngon ngu cua minh ===
  USD: 25,400.50
  JPY: 165.20
  XXX: nem KhongTraCuuDuocTyGia: khong tra duoc ty gia cho "XXX"
```

Two mandatory details:

- **`catch` the specific type**, not a bare `catch`. `OperationCanceledException` and
  `OutOfMemoryException` must go straight up.
- **Keep the original exception as the inner one.** Not keeping it loses the other side's stack trace.

### Step 2 — separate the two questions at the API design level

| Question | Returns |
|---|---|
| *"This currency has no rate today"* — a legitimate result | `null` / a `Result`, and name the method `ThuLayTyGia` |
| *"We couldn't look it up"* — an incident | Throw |

If the other side's API can't distinguish those two cases, **the adapter is precisely where you must** — via
the HTTP status, their error code, or whatever signal exists.

### Step 3 — drop the `?? 0m` at the caller

`?? 0m` turns "unknown" into "zero". For money, those two are never the same. If you genuinely need to
continue when a rate is missing, then **count and report it**:

```csharp
if (tg.ThuLayTyGia(d.ma) is not { } r) { soDongBoQua++; continue; }
```

and print `soDongBoQua` on the report itself. The silent 0 is the thing that has to go.

### Before and after

| | Swallowing errors | Translating errors |
|---|---|---|
| The service goes down | the report comes out short | the pipeline stops, with an alert |
| A new unsupported currency code | 0 VND, silently | an exception naming the code |
| They change the number format | 0 VND, silently | an exception, seen on day one |
| What monitoring sees | nothing at all | a countable exception |

## How to spot it early

```bash
# catch trong hoac catch Exception rong
grep -rnE "catch\s*\{|catch\s*\(Exception[^)]*\)\s*\{\s*(return|//)" --include=*.cs src/

# ?? 0 tren gia tri tien te
grep -rn "?? 0m\|?? 0M\|GetValueOrDefault()" --include=*.cs src/
```

Three questions for a code review:

1. What type does this `catch` catch? Bare or `Exception` = you're hiding an unknown class of error.
2. Is the default value here **distinguishable** from a real value? `0` for money is
   not.
3. If the external service went down completely, what number would this report produce? If the answer is "a
   smaller one", you have exactly this hole.

The third question catches the most, and can be answered in 30 seconds.

## Related Topics

- [Adapter](../skills/adapter.md) — translating shape, and translating errors
- [Facade](../skills/facade.md) — the same "hide it for tidiness" temptation, the same consequence
- [Case study — Design Patterns](index.md)
