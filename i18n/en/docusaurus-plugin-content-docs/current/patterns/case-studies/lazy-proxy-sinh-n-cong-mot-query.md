---
title: One property access becomes 501 queries
sidebar_position: 11
description: "A lazy proxy makes the I/O cost invisible — a loop summing 500 orders runs 501 queries instead of 1, and the code shows no sign of it."
tags: [case-study, proxy, lazy-loading, n-plus-one, performance]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# One property access becomes 501 queries

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run cs-nplus1.cs`
> on .NET 11.0.0.

## Context

The ORM has lazy loading enabled. An order has a relationship to its line items:

```csharp
sealed class DonHang(string ma, GiaLapCsdl db)
{
    private List<Dong>? _chiTiet;
    public List<Dong> ChiTiet => _chiTiet ??= db.NapChiTiet(ma);   // lazy: load on first touch
}
```

Initially this is a real benefit: the order list screen only shows the code and date, never touching the line
items, so it costs no queries.

```text
=== 1. Lazy proxy: tot khi khong dung toi ===
  Liet ke 3 don, khong cham chi tiet: 1 truy van
```

Then product adds a **"Total"** column to the list table. One line of code:

```csharp
foreach (var d in ds) tong += d.ChiTiet.Sum(c => c.Tien);
```

## Symptoms

The order list screen goes from 200ms to 1.2 seconds. No errors, no timeouts, just slow — and slow
**in proportion to the number of rows displayed**, so page 1 (10 orders) is still fine while the
"whole month" filter hangs.

```text
   10 don -> lazy    11 truy van | eager   1 truy van | gap   11.0x | tong khop: True
  100 don -> lazy   101 truy van | eager   1 truy van | gap  101.0x | tong khop: True
  500 don -> lazy   501 truy van | eager   1 truy van | gap  501.0x | tong khop: True
```

```text
Neu moi truy van mat 2ms round-trip:
   10 don -> lazy     22 ms | eager   2 ms
  100 don -> lazy    202 ms | eager   2 ms
  500 don -> lazy   1002 ms | eager   2 ms
```

Note the `tong khop: True` column — **the result is entirely correct**. This isn't a calculation bug;
it's purely the cost.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The database is missing an index | Slow = missing index, the first reflex | `EXPLAIN` on the query: it uses the index, 0.4ms |
| The order list query is too heavy | The right place to look | That query is still 2ms, as before |
| We need caching | It addresses the symptom | Caching 501 queries is still 501 cache lookups |
| There's a network problem to the database | Slowness proportional to row count | The right direction: the **number** of round trips, not the speed of each |

The first three hypotheses all look at *whether one query is fast or slow*. No query is
slow. The problem is that **there are 501 of them**.

The decisive evidence: turn on the ORM's query log and count the lines. 501 nearly identical lines,
differing only in the `ma_don` parameter.

## The real cause

`d.ChiTiet` looks like a property read. It's actually a virtual
[Proxy](../skills/proxy.md): the first touch triggers a query.

In a loop over 500 elements, that's 500 queries — plus 1 for the original list.

**The inherent blind spot: the proxy succeeds so well that the reader can't see there's I/O there.**

```csharp
foreach (var d in ds) tong += d.ChiTiet.Sum(c => c.Tien);
//                             ^^^^^^^^ 500 network round trips here
```

Compare with the eager version, where the cost **appears in the code**:

```csharp
var ds = db.LayDonHangKemChiTiet(...);    // .Include(d => d.ChiTiet) — visible
```

```text
=== 3. Nap san (eager): 1 truy van ===
  Cong tong 750,000: 1 truy van
```

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| A unit test for the total | Green | The result is correct — `tong khop: True` |
| Integration tests | Green | The test data has 3 orders → 4 queries, and nobody notices |
| Code review | Missed it | One `foreach` + `Sum` line, looking like clean code |
| Performance tests | Absent | Few projects have them; and where they exist they usually run on small data |
| The compiler | Silent | A property access is legal |

The second row is the main lesson: **with 3 orders, lazy costs only 4 queries.** The difference is far too
small for anyone to notice. This bug only surfaces at scale, and test suites rarely run at scale.

## The fix

### The urgent fix — eager loading

```csharp
var ds = db.DonHang.Include(d => d.ChiTiet).Where(...).ToList();
```

1 query instead of 501.

**Be careful not to over-`Include`:** eagerly loading three one-to-many relationships in one query creates a
Cartesian product, and one enormous query can be worse than a few small ones. EF Core has
`AsSplitQuery()` for exactly that case.

### The root fix — turn lazy loading off by default

| Approach | Effect |
|---|---|
| Don't enable `UseLazyLoadingProxies` | A missing `Include` becomes an explicit error rather than a silent load |
| Only return DTOs from the query layer, never entities | There's no navigation property for anyone to touch by accident |
| Project directly in the query (`Select` into a DTO) | The database does the summing; not one line item is loaded into memory |

The third is usually best for this case: `Select(d => new { d.Ma, Tong = d.ChiTiet.Sum(c => c.Tien) })`
pushes the sum down to the database — one query and no rows loaded.

### Preventing a recurrence — count queries in a test

```csharp
[Fact] async Task Man_hinh_danh_sach_khong_duoc_vuot_2_truy_van()
{
    var dem = new DemTruyVan();                    // DbCommandInterceptor
    await _mh.Tai(soDong: 500, dem);
    Assert.True(dem.So <= 2, $"chay {dem.So} truy van");
}
```

This is the cheapest kind of test that catches a whole class of bug. The requirement: **run it with a large
enough row count**. A test with 3 orders gives 4 queries and passes any threshold.

### The trade-off table

| | Lazy | Eager (`Include`) | Projected into a DTO |
|---|---|---|---|
| You only need the list, not the details | 1 query | 1 query (with redundant data) | 1 query |
| You need the sum of the details | **N+1** | 1 query | 1 query, the least data |
| The cost appears in the code | **no** | yes | yes |
| Risk of a Cartesian product | no | yes (with several `Include`s) | no |

## How to spot it early

```bash
# Truy cap navigation property trong vong lap
grep -rnE "foreach.*\{[^}]*\.(ChiTiet|Dong|Items)\b" --include=*.cs src/

# Lazy loading co dang bat khong
grep -rn "UseLazyLoadingProxies" --include=*.cs src/
```

Three questions for a code review:

1. Does this line touch a navigation property **inside a loop**?
2. Does the corresponding query have an `Include`, or is it relying on laziness?
3. With 500 rows instead of 5, how many queries does this run? If you can't answer immediately,
   turn on the query log and count.

The third question takes two minutes and catches nearly every N+1.

## Related Topics

- [Proxy](../skills/proxy.md) — the virtual proxy and how to detect N+1
- [Decorator](../skills/decorator.md) — the same shape, a different intent
- [Case study — Design Patterns](index.md)
