---
title: A dashboard full of Y, N and y — one binary concept becoming three groups
sidebar_position: 17
description: "Coded flags go straight from the source system onto the report; lower case and upper case split into two rows, and nobody can read what any column means."
tags: [case-study, dimension, attribute, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# A dashboard full of `Y`, `N` and `y` — one binary concept becoming three groups

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** a dimension is **the data warehouse's user interface**. Passing source-system codes
> straight onto reports forces everyone reading a report to learn the source system's language — see
> [designing dimension attributes](../skills/dimension-attribute-design.md).

## Context

`dim_san_pham` is loaded with `SELECT *` from the ERP's product table. Fast, little code, and
every source column is present.

```sql
CREATE TABLE dim_sp_ma AS
SELECT * FROM (VALUES
  (1, 'SP-A', 'Y', 1, 'A'), (2, 'SP-B', 'N', 0, 'B'),
  (3, 'SP-C', 'Y', 1, 'A'), (4, 'SP-D', 'y', 0, 'C')
) t(sp_sk, san_pham, hang_moi, khuyen_mai, phan_loai_abc);
```

## Symptoms

The *"revenue by stock condition and promotion"* report:

```text
┌──────────┬────────────┬───────────┐
│ hang_moi │ khuyen_mai │ doanh_thu │
├──────────┼────────────┼───────────┤
│ Y        │          1 │       700 │
│ N        │          0 │       300 │
│ y        │          0 │       100 │
└──────────┴────────────┴───────────┘
```

Three problems in three rows:

1. **`Y` and `y` are separate groups.** One concept, its revenue split in two.
2. `khuyen_mai` is `1`/`0` — the reader has to guess which direction means "yes".
3. No row explains itself. Does `N` mean "not new stock" or "undetermined"?

The sales director asks *"how much do new products contribute"*. The dashboard's answer is
700 — 100 short, the `y` row.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| Some product has no flag assigned | Checked: all 4 products have a value |
| BI splitting groups because of whitespace | `trim()` changes nothing |
| The ETL loading one row wrongly | Reconciled against the source: the source really is `'y'` |
| The source system having two similar fields | There's only one column |

Where the time goes: everybody looks for a **technical bug**. There is none — the source system
genuinely holds a lower-case `'y'` in one row, typed by hand by a data-entry clerk years ago.

```sql
SELECT count(DISTINCT hang_moi) AS so_gia_tri_hang_moi,
       list(DISTINCT hang_moi)  AS cac_gia_tri
FROM dim_sp_ma;
```

```text
┌─────────────────────┬─────────────────────┐
│ so_gia_tri_hang_moi │     cac_gia_tri     │
├─────────────────────┼─────────────────────┤
│                   3 │ [Y, N, y]           │
└─────────────────────┴─────────────────────┘
```

**Three values for a binary concept.** This query is the thing to have run at the very start.

## The real cause

The dimension is loaded **as-is** from the source system, with no standardisation layer.

The source system is allowed to be messy — it's optimised for writing, and it has lived 10 years with
hand-typed data. The warehouse is **not** allowed to be messy, because it's optimised for reading and every
odd value is a surplus row on the director's report.

The right place to standardise is **the dimension layer**, once, for every report thereafter.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on `hang_moi` | ✅ green |
| `unique` on `sp_sk` | ✅ green |
| `relationships` fact → dim | ✅ green |
| `accepted_values: ['Y','N']` | ❌ red — **if anybody declares it** |
| Total revenue matching the source | ✅ green |

The fourth row is the only test that catches it, and it's almost never declared for a flag column —
people set `accepted_values` for order statuses, rarely for a `Y/N` column that looks
self-evident.

Total revenue is still exactly 1,100. No row is lost; they're just **grouped wrongly**.

## The fix

### Decode right in the dimension layer

```sql
CREATE TABLE dim_sp AS
SELECT sp_sk, san_pham,
       CASE upper(hang_moi) WHEN 'Y' THEN 'Hang moi' ELSE 'Hang thuong' END AS tinh_trang_hang,
       CASE khuyen_mai WHEN 1 THEN 'Dang khuyen mai' ELSE 'Khong khuyen mai' END AS tinh_trang_km,
       CASE phan_loai_abc WHEN 'A' THEN 'A - ban chay'
                          WHEN 'B' THEN 'B - trung binh'
                          ELSE 'C - ban cham' END AS nhom_abc
FROM dim_sp_ma;
```

```text
┌─────────────────┬──────────────────┬───────────┐
│ tinh_trang_hang │  tinh_trang_km   │ doanh_thu │
├─────────────────┼──────────────────┼───────────┤
│ Hang moi        │ Dang khuyen mai  │       700 │
│ Hang thuong     │ Khong khuyen mai │       300 │
│ Hang moi        │ Khong khuyen mai │       100 │
└─────────────────┴──────────────────┴───────────┘
```

`upper()` merges `Y` and `y`. The answer for the director is now **800**, and needs no accompanying
footnote.

| | Before | After |
|---|---|---|
| "New stock" revenue | 700 (100 short) | **800** |
| Groups for one binary concept | 3 | 2 |
| The reader needing a legend | Yes | No |
| Where decoding happens | Every dashboard does its own | One place, the dimension layer |

Alongside: **keep the original code column** (`ma_hang_moi`) in the dimension for reconciling against the source
system, but don't hand it to end users.

## How to spot it early

1. List the distinct values of every flag column in the dimension — run it once while building, and
   make it a test afterwards:

```sql
SELECT 'hang_moi' AS cot, count(DISTINCT hang_moi) AS so_gia_tri,
       list(DISTINCT hang_moi) AS cac_gia_tri
FROM dim_sp_ma;
```

More values than expected = fragmentation already present.

2. Have `accepted_values` on every flag and code column in the dimension.

3. Grep for `CASE WHEN` in the dashboard layer — each one is a definition living in the wrong place:

```bash
grep -rn "CASE WHEN" dashboards/ | wc -l
```

4. Look at any report at all: is there a cell that needs a legend to read?

## Related Topics

- [Designing dimension attributes](../skills/dimension-attribute-design.md) — the technique skipped here
- [Junk dimensions](../skills/junk-dimension.md) — where to gather many low-cardinality flags
- [NULLs in facts and dimensions](../skills/null-handling.md) — a label for an empty value
- [CS: adding an eighth status](them-trang-thai-thu-tam.md) — the same illness: unmanaged business codes
