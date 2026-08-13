---
title: A fifth format, six missed spots
sidebar_position: 2
description: "Six parallel switches on the same format code, each with a default branch — adding a new type misses six places and raises no exception."
tags: [case-study, factory-method, open-closed, shotgun-surgery]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# A fifth format, six missed spots

> **Label: a reconstructed situation.** Every number was really produced by
> `dotnet run cs-switch-drift.cs` on .NET 11.0.0.

## Context

The report export module supports `pdf`, `excel` and `csv`. Over two years, the format code came to be used
in six different places — each with its own `switch`, written by different people, in different
files:

| `switch` | Returns | Lives in |
|---|---|---|
| `Xuat` | the file extension | `XuatBaoCao.cs` |
| `Ten` | the display name | `GiaoDien/MenuXuat.cs` |
| `Icon` | the icon file | `GiaoDien/Icon.cs` |
| `Quyen` | who may export | `BaoMat/QuyenXuat.cs` |
| `GioiHan` | the size limit | `CauHinh/GioiHan.cs` |
| `Mime` | the content type on download | `Api/TaiVeController.cs` |

The team added `xml` (last year) then `json` (this week).

## Symptoms

A user reports: *"downloading the JSON file opens it in the browser as text instead of downloading, and in
the menu it shows as 'Unknown'."*

```text
ma      xuat      ten         icon        quyen     gioi han    mime                      lech
--------------------------------------------------------------------------------------------------
pdf     pdf       PDF         pdf.svg     moi ai    10MB        application/pdf           -
excel   xlsx      Excel       xls.svg     noi bo    50MB        application/vnd.ms-excel  -
csv     csv       CSV         csv.svg     noi bo    200MB       text/csv                  -
xml     xml       XML         (mac dinh)  noi bo    (mac dinh)  application/xml           2 cho
json    json      (khong ro)  (mac dinh)  noi bo    (mac dinh)  (mac dinh)                4 cho
--------------------------------------------------------------------------------------------------
Tong so cho bi bo sot: 6
So switch song song tren cung mot ma: 6
Khong cho nao nem exception — tat ca deu co nhanh mac dinh.
```

**Six missed spots and not one exception.** And `xml` — added **last year** — is still missing two of
them without anyone knowing.

Note the `gioi han` column: `json` falls into the default value. If that default is 10MB, large JSON reports
get blocked with a meaningless message; if the default is unlimited, that's a security hole.

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| Misconfigured web server | The symptom is about content types | The header is exactly what the code generated; the server doesn't touch it |
| Browser cache | The classic | A different browser, incognito — identical |
| A missing line in `TaiVeController` | Nearly right | Partly right: fix it and the menu and icon are still wrong |
| The fault of whoever added `json` | It seems obvious | That person **had no way of knowing** there were six places |

The third hypothesis is the most dangerous: it fixes the symptom the user reported, closes the ticket, and
leaves the other five places for next time.

## The real cause

The format code is one concept with **six** manifestations, but there is no **single** place holding all
six. Each `switch` has its own `_ =>` branch returning a "safe" value, so a missing entry never
blows up.

This is classic *shotgun surgery*: one conceptual change requiring scattered edits across many files, with
nothing able to enumerate that list of files.

The crux: **the default branch is the culprit, not the saviour.** If all six `switch`es threw instead of
returning a default, `json` would have blown up in the first dev environment.

## Why no test caught it

| Check | Result | Why it couldn't see it |
|---|---|---|
| Unit tests for `XuatBaoCao` | Green | `Xuat("json")` is correct — that's the one `switch` that was updated |
| Integration tests for report export | Green | The file content is correct; the menu and headers aren't in the test |
| The compiler | Silent | A `string` has no exhaustiveness to check; the `_` branch covers everything |
| Coverage tests | 100% | Every branch that **exists** was run — a **missing** branch can't be measured |

That last row is worth remembering: **coverage measures the code you wrote, not the code you should have
written.**

## The fix

### Step 1 — gather the six `switch`es into one class

```csharp
interface IDinhDangXuat
{
    string Ma { get; }
    string PhanMoRong { get; }
    string TenHienThi { get; }
    string Icon { get; }
    string Quyen { get; }
    long GioiHanByte { get; }
    string Mime { get; }
}
```

Now **the compiler** forces every format to implement all seven properties. There's no default branch left
to fall into.

### Step 2 — one registry

```csharp
static class Xuong
{
    private static readonly Dictionary<string, Func<IDinhDangXuat>> _bang = new() { ... };
    public static void DangKy(string ma, Func<IDinhDangXuat> tao) => _bang[ma] = tao;
    public static IDinhDangXuat Tao(string ma) =>
        _bang.TryGetValue(ma, out var f) ? f() : throw new NotSupportedException($"chua dang ky dinh dang: {ma}");
}
```

The measured result after the fix ([Factory Method](../skills/factory-method.md)):

```text
=== Sau: mot dang ky, khong the lech ===
ma      xuat                        ten hien thi        khop?
------------------------------------------------------------------
pdf     %PDF-1.7 (pdf)              pdf                 OK
excel   PK.. xlsx (excel)           excel               OK
csv     a,b,c (csv)                 csv                 OK
So dong lech: 0
```

```text
=== Them dinh dang thu tu: json ===
  json -> {"a":1} (json) / json   (khong sua dong nao cua code cu)
  So dinh dang dang co: 4
```

### Before and after

| | Six `switch`es | One class per format |
|---|---|---|
| Places to edit when adding a format | 6 files, and nobody knows it's 6 | 1 new class + 1 registration line |
| Missing one | the default value, **silently** | it doesn't compile |
| A wrong code (`"pdff"`) | falls into the default | throws, naming the code |
| Formats supplied by a plugin | no | `DangKy` at startup |

### If you don't want a big refactor yet

The cheapest way to buy back most of the value: **switch to an `enum` and drop the default branch**.

```csharp
enum DinhDang { Pdf, Excel, Csv, Xml, Json }

string Mime(DinhDang d) => d switch
{
    DinhDang.Pdf => "application/pdf",
    // ... with no _ branch
};
```

C# warns with `CS8524` when a switch expression isn't exhaustive. Turn on `TreatWarningsAsErrors` and
adding `Json` to the enum will **break the build** in all six places — exactly what you want.

This is the memorable counter-lesson: a `switch` on an `enum` is **safer** than a registry on this
particular point. Only move to a factory when you need to add formats at run time.

## How to spot it early

```bash
# Dem so switch tren cung mot khai niem
grep -rn 'case "pdf"\|"pdf" =>' --include=*.cs src/ | wc -l
```

Three questions for a code review:

1. Where else is this code `switch`ed on? If you can't answer immediately, that *is* the answer.
2. Does the default branch return a value or throw? Returning a value = hiding errors.
3. Is the code's type a `string` or an `enum`? `string` = the compiler can't help you at all.

## Related Topics

- [Factory Method](../skills/factory-method.md) — gathering the "what do we create" decision into one place
- [Abstract Factory](../skills/abstract-factory.md) — when the properties must match as a family
- [SOLID](../reference/solid.md) — a textbook Open/Closed violation
- [Case study — Design Patterns](index.md)
