---
title: Five processes, five marts, and no mart joins to any other
sidebar_position: 24
description: "Each team builds its own mart very fast; when a question crossing the value chain finally comes up, it all has to be redone from scratch."
tags: [case-study, bus-matrix, conformed-dimension, value-chain, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Five processes, five marts, and no mart joins to any other

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** building one mart at a time is right. Building one mart at a time **without agreeing the
> dimensions first** buys today's speed by having to redo everything a year later — see
> [bus architecture](../reference/bus-architecture.md).

## Context

A retail company, five business processes: purchasing, goods receipt, inventory, sales, returns.

The approach chosen: each team builds its own mart, delivers fast, proves value. No
dimension-agreement step — that step "slows down the first project".

After a year: five marts, five dashboards, all working, all in use. Each mart has its own
`dim_san_pham` and its own `dim_khach`, derived from its own source, with its own keys.

## Symptoms

The board asks three questions:

1. *"We bought 100, how many sold, how many left in stock, how much shrinkage?"*
2. *"What's the margin by product?"*
3. *"Which product is returned most relative to how much it sells?"*

None of the three **can be answered**. Each mart answers a fragment, and the fragments can't be
reassembled because the product key in the purchasing mart doesn't match the key in the sales mart.

The initial estimate for question 1: "two days". The reality: rebuild a shared `dim_san_pham`, map the
old keys, reload five facts — several months.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| Just needing one join between the marts | The keys don't match — one key system per mart |
| Mapping keys via an intermediate table | Doable, but it has to be done for **every pair of marts** |
| Joining on the business product code | Each mart standardises the code differently (upper case, whitespace, prefixes) |
| Building a new consolidated mart | That *is* redoing it — just under a different name |

Where the time goes: the first two months believing this is an **integration problem** solved by mapping.
With 5 marts, the number of pairs to map is 10, and every mapping must be maintained forever. That cost is larger
than building conformed dimensions from the start.

## The real cause

There's no step for **designing the dimensions before the facts**.

A bus matrix — had one existed — would have shown in the first week that `San pham` attaches to all 5 processes:

```sql
SELECT dimension, count(*) FILTER (WHERE co_dung) AS so_quy_trinh_dung
FROM bus_matrix GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌──────────────┬───────────────────┐
│  dimension   │ so_quy_trinh_dung │
├──────────────┼───────────────────┤
│ Ngay         │                 5 │
│ San pham     │                 5 │
│ Kho          │                 4 │
│ Khach hang   │                 2 │
│ Nha cung cap │                 2 │
└──────────────┴───────────────────┘
```

`Ngay` and `San pham` are **the warehouse's backbone**. Getting these two wrong breaks every cross-cutting
question — and they deserve to be designed once for the whole enterprise before anybody
writes the first fact.

The cost of that step: perhaps two weeks on the first project. The cost of skipping it: several months, a
year later.

## Why no test catches it

| Test | The result |
|---|---|
| Each mart matching its own source system | ✅ green all year |
| `unique`, `not_null` on every key | ✅ green |
| `relationships` within each mart | ✅ green |
| The grain being right in each fact | ✅ green |
| Whether the marts share dimensions | ❌ — **not a data test** |

Every mart is **perfectly correct within its own scope**. This is an architectural bug, and it
only surfaces when somebody asks a question crossing a mart boundary.

What catches it is the bus matrix, and the bus matrix must exist **before** any mart does.

## The fix

### Step 1 — make the bus matrix a table in the warehouse

```sql
CREATE TABLE bus_matrix AS
SELECT * FROM (VALUES
  ('Mua hang','Ngay',true), ('Mua hang','Nha cung cap',true), ('Mua hang','San pham',true),
  ('Mua hang','Khach hang',false), ('Mua hang','Kho',true),
  ('Nhap kho','Ngay',true), ('Nhap kho','Nha cung cap',true), ('Nhap kho','San pham',true),
  ('Nhap kho','Khach hang',false), ('Nhap kho','Kho',true),
  ('Ton kho','Ngay',true), ('Ton kho','Nha cung cap',false), ('Ton kho','San pham',true),
  ('Ton kho','Khach hang',false), ('Ton kho','Kho',true),
  ('Ban hang','Ngay',true), ('Ban hang','Nha cung cap',false), ('Ban hang','San pham',true),
  ('Ban hang','Khach hang',true), ('Ban hang','Kho',true),
  ('Tra hang','Ngay',true), ('Tra hang','Nha cung cap',false), ('Tra hang','San pham',true),
  ('Tra hang','Khach hang',true), ('Tra hang','Kho',false)
) t(quy_trinh, dimension, co_dung);

PIVOT bus_matrix ON dimension USING bool_or(co_dung) GROUP BY quy_trinh;
```

```text
┌───────────┬────────────┬─────────┬─────────┬──────────────┬──────────┐
│ quy_trinh │ Khach hang │   Kho   │  Ngay   │ Nha cung cap │ San pham │
├───────────┼────────────┼─────────┼─────────┼──────────────┼──────────┤
│ Mua hang  │ false      │ true    │ true    │ true         │ true     │
│ Nhap kho  │ false      │ true    │ true    │ true         │ true     │
│ Tra hang  │ true       │ false   │ true    │ false        │ true     │
│ Ton kho   │ false      │ true    │ true    │ false        │ true     │
│ Ban hang  │ true       │ true    │ true    │ false        │ true     │
└───────────┴────────────┴─────────┴─────────┴──────────────┴──────────┘
```

This table also answers *"which questions are impossible"*: you can't ask "inventory by
customer" — that cell is `false` because inventory has no customer dimension.

### Step 2 — turn coverage into a metric you can track

```sql
SELECT count(*) FILTER (WHERE co_dung) AS o_can_conform,
       count(*)                        AS o_toi_da,
       round(100.0 * count(*) FILTER (WHERE co_dung) / count(*), 1) AS mat_do_pct
FROM bus_matrix;
```

```text
┌───────────────┬──────────┬────────────┐
│ o_can_conform │ o_toi_da │ mat_do_pct │
├───────────────┼──────────┼────────────┤
│            18 │       25 │       72.0 │
└───────────────┴──────────┴────────────┘
```

### Step 3 — once conformed, the three questions are answerable by drill-across

```text
┌──────────┬───────┬──────────┬─────────┬────────┬────────┬────────────────────┬──────────────────────┐
│ san_pham │  mua  │ nhap_kho │ con_ton │ da_ban │ bi_tra │ hao_hut_van_chuyen │ chua_giai_thich_duoc │
├──────────┼───────┼──────────┼─────────┼────────┼────────┼────────────────────┼──────────────────────┤
│ SP-A     │   100 │       98 │      30 │     68 │      4 │                  2 │                    0 │
│ SP-B     │    50 │       50 │      12 │     38 │      0 │                  0 │                    0 │
└──────────┴───────┴──────────┴─────────┴────────┴────────┴────────────────────┴──────────────────────┘
```

`hao_hut_van_chuyen = 2` for `SP-A` — bought 100, received 98 — is a question **no single process
can answer**. It only appears when two facts are placed side by side through a shared
dimension.

```text
┌──────────┬──────────┬───────────────┬───────┬──────────┐
│ san_pham │ tien_mua │ doanh_thu_ban │ chenh │ bien_pct │
├──────────┼──────────┼───────────────┼───────┼──────────┤
│ SP-B     │    40000 │         76000 │ 36000 │     90.0 │
│ SP-A     │    60000 │        108000 │ 48000 │     80.0 │
└──────────┴──────────┴───────────────┴───────┴──────────┘
```

| | Before | After |
|---|---|---|
| The three cross-cutting questions | Impossible | Answered by drill-across |
| Key mappings to maintain | 10 pairs | 0 |
| Adding a sixth process | 5 new mappings | Plug into the existing bus |
| Cost paid up front | 0 | ~2 weeks on the first project |

## How to spot it early

1. **Count tables sharing a name across different schemas** — the clearest sign:

```sql
SELECT table_name, count(DISTINCT table_schema) AS so_schema, list(table_schema) AS o_dau
FROM information_schema.tables
WHERE table_name LIKE 'dim_%'
GROUP BY 1 HAVING count(DISTINCT table_schema) > 1;
```

Having `dim_san_pham` in three schemas = three definitions of a product.

2. Ask: *"does the warehouse have a bus matrix, and when was it last updated?"*

3. Try any question crossing two marts. Unanswerable within a day = not conformed.

4. Before building a new mart, ask *"which dimensions does this mart use, and do those dimensions already
   exist?"* — if the answer is "we'll build new ones", stop.

## Related Topics

- [Bus architecture, the bus matrix and the value chain](../reference/bus-architecture.md) — the technique skipped here
- [Conformed dimensions](../skills/conformed-dimension.md) — what the "bus" actually is
- [Conformed facts](../skills/conformed-facts.md) — being joinable still isn't being comparable
- [CS: two marts that can't be joined](hai-mart-khong-ghep-duoc.md) — the same illness at a smaller scale
- [CS: two departments, two revenue numbers](hai-phong-hai-doanh-thu.md) — conformed dimensions and still divergent numbers
