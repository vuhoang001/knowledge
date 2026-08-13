---
title: Shipping fees 133% inflated — one right column, one wrong, in the same table
sidebar_position: 18
description: "An order-level measure replicated onto every order line; the goods amount still matches, so nobody suspects the table."
tags: [case-study, allocated-facts, header-line, grain, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Shipping fees 133% inflated — one right column, one wrong, in the same table

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** an order has measures at two levels. Pulling an order-level number down onto each order line
> multiplies it by the line count — see [header/line and allocating facts](../skills/allocated-facts.md).

## Context

`fct_ban`'s grain is **one order line** — the right decision, the finest the source
permits. But the shipping fee sits at **order level**, not line level.

```sql
CREATE TABLE src_header AS
SELECT * FROM (VALUES ('DH-001', 100000), ('DH-002', 50000)) t(so_don, phi_ship);

CREATE TABLE src_line AS
SELECT * FROM (VALUES
  ('DH-001', 1, 'SP-A', 600000),
  ('DH-001', 2, 'SP-B', 300000),
  ('DH-001', 3, 'SP-C', 100000),
  ('DH-002', 1, 'SP-A', 500000)
) t(so_don, dong_so, san_pham, tien_hang);
```

The truth: shipping fees **150,000**, goods 1,500,000.

How it's loaded: join the header onto the lines so as to "have all the information in one table".

```sql
CREATE TABLE fct_sai AS
SELECT l.so_don, l.dong_so, l.san_pham, l.tien_hang, h.phi_ship
FROM src_line l JOIN src_header h USING (so_don);
```

## Symptoms

The monthly shipping-cost report says **350,000**; the carrier's invoice says 150,000.

```sql
SELECT sum(tien_hang) AS tien_hang, sum(phi_ship) AS phi_ship_bao_cao,
       sum(phi_ship) - (SELECT sum(phi_ship) FROM src_header) AS phong_them,
       round(100.0 * (sum(phi_ship) - (SELECT sum(phi_ship) FROM src_header))
             / (SELECT sum(phi_ship) FROM src_header), 1) AS phong_pct
FROM fct_sai;
```

```text
┌───────────┬──────────────────┬────────────┬───────────┐
│ tien_hang │ phi_ship_bao_cao │ phong_them │ phong_pct │
├───────────┼──────────────────┼────────────┼───────────┤
│   1500000 │           350000 │     200000 │     133.3 │
└───────────┴──────────────────┴────────────┴───────────┘
```

What makes this case irritating: **`tien_hang` is entirely correct** (1,500,000, matching the source). One
right column, one wrong one, in the same table, from the same `SELECT`.

The reviewer opens the table, sees revenue matching, and concludes the table is fine.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| The carrier undercharged | Reconciled against the waybills: the carrier is right |
| Some order shipped several times | Checked: one delivery per order |
| A surcharge missing from the invoice | There are no surcharges |
| The ETL loaded duplicates | `count(*)` = 4 rows, exactly the number of order lines |
| The header table being wrong | `sum(phi_ship)` on the header = 150,000, correct |

Where the time goes: the "ETL loaded duplicates" hypothesis is dismissed too early, because **the row count is
right**. No row is surplus — only a **value** is repeated across several rows.

The redirecting question: *"the shipping fee is a measure of what — of the order line or of the order?"*

## The real cause

`fct_sai`'s grain is **one order line**. `phi_ship` is a measure at the grain of **one order**.

Mixing two grains into one table means the coarser grain's number is repeated across every row of the finer
grain. `DH-001` has 3 lines → its 100,000 shipping fee is counted three times.

350,000 = 100,000 × 3 + 50,000 × 1.

This is a variant of the same illness as
[joining two facts inflating the total](join-hai-fact-lam-phong-tong.md) — the difference being that here the grain
mixing happens **at load time**, so nobody sees a dangerous join in the reporting layer.

## Why no test catches it

| Test | The result |
|---|---|
| `unique_combination_of_columns [so_don, dong_so]` | ✅ green — the grain is **right** |
| `not_null` on every column | ✅ green |
| `sum(tien_hang)` matching the source | ✅ green |
| `relationships` to `dim_san_pham` | ✅ green |
| `sum(phi_ship)` matching `src_header` | ❌ — **nobody writes it** |

The first row is the trap: the grain test is **green**, because the table's grain really is `(so_don, dong_so)`
and it is unique. A correct grain doesn't guarantee **every column belongs to that grain**.

This is the kind of bug that needs a test for **each measure column coming from a higher level**, not one
test for the whole table.

## The fix — allocate proportionally

```sql
CREATE TABLE fct_dung AS
SELECT l.so_don, l.dong_so, l.san_pham, l.tien_hang,
       round(h.phi_ship::DOUBLE * l.tien_hang
             / sum(l.tien_hang) OVER (PARTITION BY l.so_don), 0) AS phi_ship_phan_bo
FROM src_line l JOIN src_header h USING (so_don);
```

```text
┌─────────┬─────────┬──────────┬───────────┬──────────────────┐
│ so_don  │ dong_so │ san_pham │ tien_hang │ phi_ship_phan_bo │
├─────────┼─────────┼──────────┼───────────┼──────────────────┤
│ DH-001  │       1 │ SP-A     │    600000 │          60000.0 │
│ DH-001  │       2 │ SP-B     │    300000 │          30000.0 │
│ DH-001  │       3 │ SP-C     │    100000 │          10000.0 │
│ DH-002  │       1 │ SP-A     │    500000 │          50000.0 │
└─────────┴─────────┴──────────┴───────────┴──────────────────┘
```

```text
┌──────────────┬───────────┬────────────────┐
│ tong_phan_bo │ tong_that │ chenh_lam_tron │
├──────────────┼───────────┼────────────────┤
│     150000.0 │    150000 │            0.0 │
└──────────────┴───────────┴────────────────┘
```

**150,000, matching the invoice.** And now it adds up correctly along any dimension — including one that
previously couldn't be asked:

```text
┌──────────┬───────────┬──────────┬───────────────┐
│ san_pham │ tien_hang │ phi_ship │ ty_le_phi_pct │
├──────────┼───────────┼──────────┼───────────────┤
│ SP-A     │   1100000 │ 110000.0 │          10.0 │
│ SP-B     │    300000 │  30000.0 │          10.0 │
│ SP-C     │    100000 │  10000.0 │          10.0 │
└──────────┴───────────┴──────────┴───────────────┘
```

| | Before | After |
|---|---|---|
| Reported shipping fees | 350,000 (**133% inflated**) | 150,000 |
| Column renamed | `phi_ship` | `phi_ship_phan_bo` — the name says this is an allocated number |
| Shipping fees by product | Not computable | Computable |

Renaming the column is the easily-skipped but important part: `phi_ship_phan_bo` tells the reader this is a
number **following a convention**, not a direct measure.

## How to spot it early

1. **An invariant for every column coming from a higher level** — this is the must-have test:

```sql
SELECT (SELECT sum(phi_ship_phan_bo) FROM fct_dung) AS trong_fact,
       (SELECT sum(phi_ship) FROM src_header)       AS trong_nguon;
```

2. Whether the fact has any column that's **identical across every row of the same order**:

```sql
SELECT so_don, count(*) AS so_dong, count(DISTINCT phi_ship) AS so_gia_tri_phi_ship
FROM fct_sai GROUP BY 1 HAVING count(*) > 1;
```

`so_gia_tri_phi_ship = 1` with `so_dong > 1` is the sign of a higher-level measure being repeated.

3. Ask, for each measure column: *"is this a measure of one order line, or of the whole order?"* An answer
   of "the whole order" while the column sits in an order-line-grain table = allocate it or take it out.

## Related Topics

- [Header/line and allocating facts](../skills/allocated-facts.md) — the technique skipped here
- [Grain](../reference/grain.md) — every measure column must belong to the declared grain
- [Bridge tables](../skills/bridge-table.md) — the same allocation-factor mechanism
- [CS: joining two facts inflating the total](join-hai-fact-lam-phong-tong.md) — the same grain-mixing illness
