---
title: Revenue 67% inflated by joining two fact tables
sidebar_position: 2
description: Reconciling orders against payments with one join — the total jumps from 1.5 to 2.5 million. With the three fan-trap forms, header-detail and the chasm trap.
tags: [case-study, fact, grain, fan-trap, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Revenue 67% inflated by joining two fact tables

> **A reconstructed situation**, not an incident encountered here. **Every number was really run on
> DuckDB.**

> **Takeaway:** joining two facts of different grain directly **duplicates rows**. The "one" side repeats
> once per row on the "many" side, and every `sum()` over that side inflates.

## Context

You need a report on *"which orders have been fully paid"*. There are two fact tables:

```sql
CREATE TABLE fct_don_hang AS SELECT * FROM (VALUES
 ('DH001', DATE '2026-07-01', 1000000),
 ('DH002', DATE '2026-07-02',  500000))
 AS t(ma_don, ngay, thanh_tien);          -- grain: MỘT ĐƠN

CREATE TABLE fct_thanh_toan AS SELECT * FROM (VALUES
 ('DH001','TT-1', 400000),
 ('DH001','TT-2', 600000),                 -- DH001 trả làm 2 lần
 ('DH002','TT-3', 500000))
 AS t(ma_don, ma_tt, so_tien);            -- grain: MỘT LẦN THANH TOÁN
```

The real totals, checked per table:

```text
┌──────────┬─────────┐
│ tong_don │ tong_tt │
├──────────┼─────────┤
│  1500000 │ 1500000 │
└──────────┴─────────┘
```

Matching. Both sides are correct.

## Symptoms

The join sounds entirely reasonable:

```sql
SELECT sum(d.thanh_tien) AS tong_don_hang, sum(t.so_tien) AS tong_thanh_toan
FROM fct_don_hang d JOIN fct_thanh_toan t USING (ma_don);
```

```text
┌───────────────────┬─────────────────┐
│ tong_don_hang_SAI │ tong_thanh_toan │
├───────────────────┼─────────────────┤
│           2500000 │         1500000 │
└───────────────────┴─────────────────┘
```

**Revenue of 1,500,000 becomes 2,500,000** — 67% inflated. While the payment total stays correct.

What makes it irritating: *one* of the two columns is right. Had both been wrong, it would have been suspected immediately.

## The wrong hypotheses at first

| Suspected | Why | The reality |
|---|---|---|
| The payment data is duplicated | The order total inflated | No — the payment total is still exactly 1.5m |
| There are duplicate orders in the source | The number is higher than expected | `count(distinct ma_don)` = 2, correct |
| The `JOIN` condition is wrong | The first reflex | `ma_don` really is the joining key |
| A wrong money data type | Common enough | Irrelevant |

The time goes looking for **dirty data**. The data is entirely clean — the **query** is what's wrong.

## The real cause

Expand the join to see the individual rows:

```text
ma_don | thanh_tien | ma_tt | so_tien
DH001  |  1000000   | TT-1  | 400000    ← 1.000.000 xuất hiện lần 1
DH001  |  1000000   | TT-2  | 600000    ← 1.000.000 xuất hiện lần 2
DH002  |   500000   | TT-3  | 500000
```

`DH001` has **two** payments, so its order row repeats **twice**. `sum()`
adds 1,000,000 twice → 2,000,000, plus 500,000 → 2,500,000.

This is a **fan trap**: a one-to-many join followed by summing on the "one" side.

The root is [grain](../reference/grain.md): `fct_don_hang` has the grain *one order* while
`fct_thanh_toan` has the grain *one payment*. They're **not at the same grain**, so they can't be
joined directly.

## Why no test catches it

| Test | The result |
|---|---|
| `unique` on `fct_don_hang`'s `ma_don` | ✅ green |
| `unique` on `fct_thanh_toan`'s `ma_tt` | ✅ green |
| `relationships` payments → orders | ✅ green |
| `not_null` on every column | ✅ green |

Both **tables** are perfect. The bug is in **the query reading them** — and dbt tests only check
tables, not end users' queries.

This is why a mart table must be pre-built correctly rather than left for everybody to join themselves.

## The fix

**Aggregate to the same grain first, then combine:**

```sql
WITH tt AS (
  SELECT ma_don, sum(so_tien) AS da_tra
  FROM fct_thanh_toan GROUP BY 1        -- đưa về grain MỘT ĐƠN
)
SELECT sum(d.thanh_tien) AS tong_don_hang, sum(tt.da_tra) AS tong_thanh_toan
FROM fct_don_hang d JOIN tt USING (ma_don);
```

```text
┌───────────────┬─────────────────┐
│ tong_don_hang │ tong_thanh_toan │
├───────────────┼─────────────────┤
│       1500000 │         1500000 │
└───────────────┴─────────────────┘
```

Both correct. The principle: **aggregate the "many" side to the "one" side's grain before joining.**

A second approach, when you need several dimensions: aggregate each fact separately to **the same
level** and then combine on the shared dimension — called *drilling across*, see
[Conformed dimensions](../skills/conformed-dimension.md).

## The three forms, recognised so you can avoid them

The case above is form 1. The other two share the root cause but present differently.

### Form 1 — the fan trap: one-to-many, summing on the "one" side

Presented above. The characteristic: **only one of the two columns is wrong**, so it's easily missed.

### Form 2 — header ↔ detail: the commonest form in practice

An order has a shipping fee at the **order** level and line items at the **line** level:

```sql
CREATE TABLE fct_don  AS SELECT * FROM (VALUES
 ('DH1',30000),('DH2',50000)) AS t(ma_don, phi_ship);          -- grain: MỘT ĐƠN

CREATE TABLE fct_dong AS SELECT * FROM (VALUES
 ('DH1','SP-A',300000),('DH1','SP-B',200000),('DH1','SP-C',100000),
 ('DH2','SP-A',400000)) AS t(ma_don, ma_hang, thanh_tien);     -- grain: MỘT DÒNG
```

The real shipping fee: **80,000**. Join and sum:

```text
┌──────────────┬───────────────┐
│ phi_ship_SAI │ hang_hoa_dung │
├──────────────┼───────────────┤
│       140000 │       1000000 │
└──────────────┴───────────────┘
```

`DH1` has 3 line items, so its 30,000 shipping fee is added **three times**. The goods amount is right, because it
was already at line grain.

This is the most dangerous form in practice because **the two tables look like they ought to be joined** —
they both describe the same order. But they're at two different grains.

**The fix:** don't put the shipping fee in the same report as the item detail. Or allocate the shipping
fee down to line level (weighted by goods amount) — the same idea as
[the bridge table's factor](../skills/bridge-table.md).

### Form 3 — the chasm trap: two **unrelated** facts connected through a shared dimension

The worst form, and the hardest to spot.

```sql
CREATE TABLE fct_ban    AS SELECT * FROM (VALUES
 ('KH1',1000000),('KH1',2000000),('KH2',500000)) AS t(ma_khach, doanh_thu);

CREATE TABLE fct_ho_tro AS SELECT * FROM (VALUES
 ('KH1',1),('KH1',1),('KH1',1),('KH2',1))       AS t(ma_khach, ticket);
```

These two facts have **no relationship at all** — one records sales transactions, the other support
tickets. They merely happen to both reference `dim_khach_hang`.

The real values: revenue **3,500,000**, tickets **4**.

```sql
SELECT sum(b.doanh_thu), sum(h.ticket), count(*) AS so_dong_sau_join
FROM dim_kh k JOIN fct_ban b USING (ma_khach) JOIN fct_ho_tro h USING (ma_khach);
```

```text
┌───────────────┬────────────┬──────────────────┐
│ doanh_thu_SAI │ ticket_SAI │ so_dong_sau_join │
├───────────────┼────────────┼──────────────────┤
│       9500000 │          7 │                7 │
└───────────────┴────────────┴──────────────────┘
```

**Both columns are wrong.** `KH1` has 2 sales rows × 3 support rows = **6 Cartesian rows**.

The key difference from a fan trap:

| | Fan trap | Chasm trap |
|---|---|---|
| Relationship between the facts | yes (one-to-many) | **none** |
| Columns affected | one | **both** |
| Rows after the join | a sum | **a product** |
| Easy to spot | moderately | **hard** — one wrong column raises suspicion, two wrong columns look like dirty data |

**The fix** — aggregate each fact to customer level separately, then combine:

```sql
WITH b AS (SELECT ma_khach, sum(doanh_thu) AS doanh_thu FROM fct_ban    GROUP BY 1),
     h AS (SELECT ma_khach, sum(ticket)    AS ticket    FROM fct_ho_tro GROUP BY 1)
SELECT sum(b.doanh_thu) AS doanh_thu, sum(h.ticket) AS ticket
FROM b FULL OUTER JOIN h USING (ma_khach);
```

```text
┌───────────┬────────┐
│ doanh_thu │ ticket │
├───────────┼────────┤
│   3500000 │      4 │
└───────────┴────────┘
```

`FULL OUTER JOIN` rather than `JOIN`: a customer who only bought and never called support, or vice
versa, must still appear. This is precisely **drilling across** — see
[Conformed dimensions](../skills/conformed-dimension.md).

### The general rule for all three forms

> **Never put two `fct_` tables in the same `FROM` without aggregating first.**
> Aggregate each fact to the same level, and only then combine on the shared dimension.

## How to spot it early

1. The query has **two tables whose names start with `fct_`** in one `FROM` — the strongest
   sign, valid for all three forms.
2. There's a `sum()` over a column from the table on the "one" side of a one-to-many relationship.
3. The total comes out **larger** than expected but at an odd, non-round multiple.

**The cheapest test:** count the rows before and after the join. An increase means duplication happened.

```sql
SELECT (SELECT count(*) FROM fct_don_hang) AS truoc,
       (SELECT count(*) FROM fct_don_hang d JOIN fct_thanh_toan t USING (ma_don)) AS sau;
```

## Related Topics

- [Grain](../reference/grain.md) — the root: two facts of different grain
- [Facts and dimensions](../reference/fact-and-dimension.md) — why you don't join a fact to a fact
- [Conformed dimensions](../skills/conformed-dimension.md) — drilling across, the correct way to combine
- [Bridge tables](../skills/bridge-table.md) — deliberate duplication, and the allocation factor that fixes it
