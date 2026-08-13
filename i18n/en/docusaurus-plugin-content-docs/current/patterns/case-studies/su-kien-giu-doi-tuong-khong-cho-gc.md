---
title: 8.4 MB leaked after 2000 screen opens
sidebar_position: 14
description: "The event source holds the reference to the observer, not the other way round — forget -= and every screen ever opened lives forever and still receives notifications."
tags: [case-study, observer, memory-leak, event, garbage-collection]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# 8.4 MB leaked after 2000 screen opens

> **Label: a reconstructed situation.** Every number was really produced by
> `dotnet run cs-observer-leak.cs` and `dotnet run 24-observer.cs` on .NET 11.0.0.

## Context

An internal desktop application. A global filter service emits an event when the user changes the filter
conditions; each screen subscribes to update itself:

```csharp
sealed class BoLoc
{
    public event Action<string>? Doi;
    public void Phat(string s) => Doi?.Invoke(s);
}

// trong ManHinhVm
_boLoc.Doi += CapNhat;
```

The `BoLoc` service is a singleton living for the whole application. The screens open and close
constantly.

## Symptoms

Three signs, appearing gradually over a shift:

1. Memory rises steadily and never falls — after 6 hours of work the application holds 2.3 GB.
2. The application gets slower: changing the filter takes 20ms at 9am and 400ms at 4pm.
3. Occasionally a strange error from a screen that's **already closed** — the stack trace points at the
   ViewModel of a tab the user closed that morning.

```text
=== Mo va dong man hinh 2000 lan, KHONG huy dang ky ===
  so nguoi dang ky con lai : 2,000
  bo nho tang             : 8,384,400 bytes

=== Cung 2000 lan, CO huy dang ky ===
  so nguoi dang ky con lai : 0
  bo nho tang             : 4,344 bytes
```

**8,384,400 bytes versus 4,344 bytes** — nearly 2000× apart, exactly the number of screen opens.

The second sign is explained here:

```text
=== Chi phi moi lan phat su kien ===
  mot lan Phat() goi 2,000 handler — trong do phan lon la man hinh da dong
```

Every filter change calls 2000 handlers — 1999 of them belonging to screens no longer displayed.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| An unbounded image cache | Steadily rising memory smells like a cache | Turn the image cache off: it rises identically |
| The GC doesn't run because there's plenty of RAM | It would explain "never falls" | Force `GC.Collect()`: no drop |
| There's a `static` list holding the ViewModels | The right kind of cause | `grep static` finds nothing relevant |
| A reference cycle between View and ViewModel | Plausible for MVVM | .NET's GC handles reference cycles — that is **not** a cause of leaks in .NET |

The last hypothesis is worth discussing: many people bring experience from reference counting (COM,
old Objective-C). .NET's GC is mark-and-sweep, and **a reference cycle by itself doesn't leak** — only a
reference from a live root does.

And that's the clue: what is the "live root" here?

## The real cause

**The event source holds the reference to the observer, not the other way round.**

```text
BoLoc (singleton, song mai)
   └── event Doi
          └── delegate
                 └── Target = ManHinhVm   ← tham chieu MANH
```

As long as `BoLoc` is alive, every `ManHinhVm` that ever subscribed cannot be collected.

This direction of dependency is **counter-intuitive**. The programmer thinks "the screen uses the service,
so the screen depends on the service". In memory terms it's the reverse.

Proved directly with a `WeakReference`:

```csharp
WeakReference TaoRoiBo(GiaCoPhieu n, bool huy)
{
    var ob = new BangDieuKhien();
    n.Doi += ob.Nhan;
    n.Dat(100m);
    if (huy) n.Doi -= ob.Nhan;
    return new WeakReference(ob);
}
```

```text
=== Ro ri bo nho: quen huy dang ky ===
  Sau GC, observer con song? True  <- true nghia la BI RO RI
  So nguoi dang ky con lai: 1
  Co huy dang ky, con song? False
  So nguoi dang ky con lai: 0
```

`IsAlive == True` after `GC.Collect()` is undeniable evidence: the object has left every
scope and still wasn't collected.

The third sign (errors from a closed screen) follows from the same thing: the handler is still being called,
and it touches resources that have already been `Dispose`d.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| ViewModel unit tests | Green | Each test creates a VM and finishes; nobody checks whether it gets collected |
| UI tests opening/closing screens | Green | They check the interface, not the memory |
| The compiler | Silent | A `+=` without a `-=` is legal |
| Default analyzers | Silent | There's no rule requiring `+=`/`-=` to balance |
| A profiler | **Catches it** | But only when somebody actively runs one |

The last row is the important point: the tool that sees this bug exists and works well. It just isn't
in the automated pipeline.

The test that catches it:

```csharp
[Fact] void ViewModel_phai_duoc_thu_hoi_sau_khi_dong()
{
    var yeu = Tao_roi_dong();                 // tao VM, dang ky, Dispose, roi bo
    GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect();
    Assert.False(yeu.IsAlive);
}
```

One such test per screen type, running in CI.

## The fix

### The standard way — unsubscribe in `Dispose`

```csharp
sealed class ManHinhVm : IDisposable
{
    private readonly BoLoc _boLoc;
    public ManHinhVm(BoLoc boLoc) { _boLoc = boLoc; _boLoc.Doi += CapNhat; }
    public void Dispose() => _boLoc.Doi -= CapNhat;
}
```

**The rule: any class that subscribes to an event must be `IDisposable`.** That's a rule an analyzer can
check, without relying on anyone's memory.

A trap that comes with it: the `-=` must remove **the same delegate**. If you subscribed with a lambda, you
have to keep the variable:

```csharp
_handler = s => CapNhat(s);
_boLoc.Doi += _handler;
// ...
_boLoc.Doi -= _handler;        // a new lambda would remove NOTHING
```

### The safer way — an API that forces you to think about stopping

```csharp
_dangKy = _boLoc.Subscribe(CapNhat);   // returns IDisposable
// ...
_dangKy.Dispose();
```

`IObservable<T>` (Rx) returns an `IDisposable` from `Subscribe`. The difference isn't in the mechanism but in
**the API design**: you're holding something, and the compiler or analyzer reminds you to deal with it.
A `-=` gives you nothing to hold.

### When you don't control the lifetime — weak events

The source holds a `WeakReference` to the observer. Only use this when you genuinely don't control the
lifetime (some UI frameworks), because it trades for an unpleasant behaviour: the observer may **stop
receiving notifications** at an unpredictable moment, decided by the GC.

### A selection table

| Situation | Approach |
|---|---|
| The observer's lifetime is shorter than the source's | `Dispose` + `-=` — **the default** |
| Both lifetimes are equal (both singletons) | No unsubscribe needed |
| You need to filter, combine or throttle the event stream | `IObservable<T>` + `IDisposable` |
| You don't control the observer's lifetime | Weak events |

## How to spot it early

```bash
# Dang ky su kien ma lop khong IDisposable
grep -rln "+= " --include=*.cs src/ | xargs grep -L "IDisposable"

# Dang ky bang lambda — khong go duoc
grep -rnE "\.\w+ \+= (\(|\w+ =>)" --include=*.cs src/
```

Three questions for a code review:

1. Does this class have a `+=`? If so, is it `IDisposable` with a matching `-=`?
2. Does the event source live **longer** than the subscriber? (a singleton, a `static`) If so, a leak is
   certain rather than a risk.
3. Did you subscribe with a method group or a lambda? With a lambda the `-=` removes nothing.

The second question is the decisive one: **the source outliving the observer** is precisely the sufficient
condition for a leak.

## Related Topics

- [Observer](../skills/observer.md) — the three event traps in C#
- [Mediator](../skills/mediator.md) — a singleton mediator hits exactly this problem
- [Case study — Design Patterns](index.md)
