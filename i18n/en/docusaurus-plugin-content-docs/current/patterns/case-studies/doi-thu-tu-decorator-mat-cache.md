---
title: The intern can read the payroll
sidebar_position: 8
description: "Swapping one wiring line put the cache outside the permission check — the second read returns from cache and the authorization layer never runs."
tags: [case-study, decorator, proxy, authorization, caching]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# The intern can read the payroll

> **Label: a reconstructed situation.** Every number was really produced by `dotnet run 14-decorator.cs`
> on .NET 11.0.0.

## Context

The HR data store is wrapped by two [Decorators](../skills/decorator.md): a permission check and a
cache.

```csharp
sealed class BocKiemQuyen(IKho trong) : IKho
{
    private static readonly HashSet<string> _duocPhep = ["ke_toan", "giam_doc"];
    public string Doc(string nguoiDung, string ma)
    {
        if (!_duocPhep.Contains(nguoiDung)) throw new UnauthorizedAccessException($"{nguoiDung} khong duoc xem {ma}");
        return trong.Doc(nguoiDung, ma);
    }
}

sealed class BocCache(IKho trong) : IKho { ... }
```

The original wiring:

```csharp
services.AddScoped<IKho, KhoThat>();
services.Decorate<IKho, BocKiemQuyen>();
services.Decorate<IKho, BocCache>();      // <- boc lan cuoi = nam NGOAI cung
```

A "performance optimisation" PR swaps the two `Decorate` lines.

## Symptoms

There are no symptoms.

The system runs faster, with no errors and no alerts. The problem is discovered three months later, when
an intern mentions a colleague's salary figure over lunch.

```text
=== Thu tu A: Cache boc NGOAI KiemQuyen  (cache truoc, kiem sau) ===
  ke toan  doc BL-01: bang luong BL-01 = 82.500.000
  thuc tap doc BL-01: bang luong BL-01 = 82.500.000  [cache]
  so lan kiem quyen that su chay: 1
```

**The permission-check counter stops at 1.** Accounting reads first — legitimately, and the result goes into
the cache. The intern reads afterwards — the cache answers immediately, and `BocKiemQuyen` is **never
called**.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| The permission configuration is wrong | The symptom is about permissions | Check the permission table: `thuc_tap` has no access, exactly as expected |
| There's another endpoint bypassing the check | The classic | Sweep every controller: every route goes through `IKho` |
| Somebody shared a password | The easiest to imagine | The login log shows the intern's own account |
| `BocKiemQuyen` has a bug | Nearly right | Its unit tests are green, and reading the code it's entirely correct |

The last hypothesis is the biggest time sink: the team reads `BocKiemQuyen` over and over, writes more tests
for it, and **every test is green** — because that class isn't wrong at all.

The turning point is the question: *"is the permission layer actually being called?"* Add a counter and
run two consecutive reads and it's obvious.

## The real cause

Both decorators are **correct against their own specifications**:

- `BocCache`: "if it's in the cache, return it and don't call inwards."
- `BocKiemQuyen`: "check the permission, then call inwards."

Composed in the order `Cache(KiemQuyen(kho))`, the first sentence nullifies the second.

The correct order:

```text
=== Thu tu B: KiemQuyen boc NGOAI Cache  (kiem truoc, cache sau) ===
  ke toan  doc BL-01: bang luong BL-01 = 82.500.000
  thuc tap doc BL-01: TU CHOI (thuc_tap khong duoc xem BL-01)
  so lan kiem quyen that su chay: 2
```

And the important part: **the cache loses no effectiveness**.

```text
=== So lan cham kho that (cache co chay khong) ===
  thu tu A: 1   thu tu B: 1
```

Both orders touch the real store **once**. Order B doesn't trade performance for safety — it's simply more
correct. The "performance optimisation" PR optimised nothing.

### The ordering rule

| Decorator group | Position | Why |
|---|---|---|
| Authorization, authentication, input validation | **Outermost** | Must run for every call |
| Logging, timing, tracing | Outside, immediately after authorization | You want to see the rejected calls too |
| Caching | In the middle | After authorization, before retries |
| Retries, circuit breakers, timeouts | **Innermost**, next to the source | Only retry the real operation |

The same mechanism also changes the log line count:

```text
=== Log ngoai vs trong Retry: dem so dong log ===
  Log(Retry(kho)) -> ton kho SP-9 = 42, so dong log = 1
  Retry(Log(kho)) -> ton kho SP-9 = 42, so dong log = 3
```

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Unit tests for `BocKiemQuyen` | Green | That class is correct — it just isn't called |
| Unit tests for `BocCache` | Green | That class is correct too |
| An integration test "the intern is refused" | **Green** | It runs on a fresh container with an empty cache — the first read always goes through the permission check |
| The PR code review | Missed it | The PR only swaps two lines and looks harmless |
| Static security scanning | Silent | There's no rule about decorator ordering |

**The third row is the main lesson.** The integration test *does* check the right scenario, and is still
green — because it only reads **once**. The hole only appears on the **second** read, after somebody
legitimate has warmed the cache.

The correct test would be:

```csharp
[Fact] void Nguoi_khong_co_quyen_bi_tu_choi_ke_ca_khi_cache_da_nong()
{
    var kho = ChuoiThat();                    // dung composition root that
    kho.Doc("ke_toan", "BL-01");              // lam nong cache
    Assert.Throws<UnauthorizedAccessException>(() => kho.Doc("thuc_tap", "BL-01"));
}
```

Two mandatory details: use **the real chain from the composition root** (not hand-built layers),
and **warm the cache first**.

## The fix

### The urgent fix

Swap the `Decorate` order back, with a comment stating why:

```csharp
services.AddScoped<IKho, KhoThat>();
services.Decorate<IKho, BocCache>();          // trong: cache sat nguon
services.Decorate<IKho, BocKiemQuyen>();      // NGOAI CUNG: phai chay cho MOI loi goi.
                                              // Dao thu tu nay = thung phan quyen. Xem test o duoi.
```

And **flush the cache** after deploying — the current cache holds data that was served wrongly.

### The structural fix — put the identity in the cache key

If the cache **has** to be outside for performance reasons, then the cache key must include the user:

```csharp
var khoa = $"{nguoiDung}|{ma}";
```

Then accounting's cache can't serve the intern. In exchange: the hit rate drops sharply, and the cache grows
with the number of users.

**For sensitive data, the correct order (authorization outermost) is nearly always better**, because it
doesn't depend on somebody remembering to put the identity in the key.

### Preventing a recurrence

One test locking the order, running on the real chain, for **every** security boundary. This is the cheap
kind of test that catches exactly the bug unit tests can't see.

## How to spot it early

```bash
# Thu tu Decorate — dong cuoi cung la lop NGOAI cung
grep -rn "Decorate<" --include=*.cs src/
```

Three questions for a code review:

1. Which decorator is **outermost**? If it isn't the permission check, why not?
2. Is there any **short-circuiting** decorator (a cache, a circuit breaker) sitting outside a decorator with a
   security responsibility?
3. Does the authorization test read **twice**? Once means the cache is always empty and the test is meaningless.

## Related Topics

- [Decorator](../skills/decorator.md) — the wrapping order and the layering rule
- [Proxy](../skills/proxy.md) — a protection proxy, in the same position in the chain
- [Case study — Design Patterns](index.md)
