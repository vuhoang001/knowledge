---
title: Degenerate dimensions
sidebar_position: 8
description: "Order numbers, invoice numbers, tracking numbers — a business key with no accompanying attributes stays in the fact; don't build a dimension table."
tags: [degenerate-dimension, fact, grain, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Degenerate dimensions

> **Takeaway:** when you've split all of a business key's attributes out into other dimensions and
> **nothing is left but the number itself**, it stays in the fact as an ordinary column.
> Building a dimension table for it creates a table with the same grain as the fact — that is, a second
> fact disguised as a dimension.

## The problem

`fct_ban` has a column `so_don = 'DH-001'`. The Kimball reflex: *"every key in a fact must point to
a dimension"*. So you build `dim_don_hang`.

But try listing what `dim_don_hang` contains:

| The order's attribute | Where it already lives |
|---|---|
| Order date | `dim_ngay` |
| Customer | `dim_khach_hang` |
| Sales channel | `dim_kenh` (or a [junk dimension](junk-dimension.md)) |
| Status | `dim_trang_thai` / a junk dimension |
| Salesperson | `dim_nhan_vien` |
| **The order number** | **… itself** |

The remaining table has only `don_sk` and `so_don`. That's a **degenerate dimension** — a dimension
that's been "drained": the key still has analytical value, but there's no attribute left to describe.

Kimball notates it `DD` in a diagram. The approach: **leave it in the fact**, with no dimension
table and no surrogate key.

## Why building a table for it is wrong

The deciding point is [grain](../reference/grain.md): `dim_don_hang`'s grain is *one
order* — exactly (or nearly) the fact's grain. A proper dimension must be **coarser**
than the fact: 100 thousand customers for 50 million sales rows.

```sql
CREATE TABLE fct_lon     AS SELECT i AS so_don, 100 AS doanh_thu FROM range(1, 5000001) t(i);
CREATE TABLE dim_don_lon AS SELECT i AS don_sk, i AS so_don      FROM range(1, 5000001) t(i);

SELECT (SELECT count(*) FROM fct_lon)     AS dong_fact,
       (SELECT count(*) FROM dim_don_lon) AS dong_dim,
       round(1.0 * (SELECT count(*) FROM dim_don_lon)
                 / (SELECT count(*) FROM fct_lon), 2) AS ty_le;
```

```text
┌───────────┬──────────┬────────┐
│ dong_fact │ dong_dim │ ty_le  │
├───────────┼──────────┼────────┤
│   5000000 │  5000000 │    1.0 │
└───────────┴──────────┴────────┘
```

The ratio is **1.0**. This dimension table compresses nothing, describes nothing, and only adds a join to every
query. Any dimension whose ratio approaches 1 is suspect.

## The worked example — where it goes from redundant to wrong

A redundant table only wastes space. It becomes **wrong numbers** when somebody sees how empty `dim_don_hang`
looks and puts the order status into it, then turns on [SCD](scd.md) Type 2 to keep the status
history — which sounds perfectly reasonable.

### Step 1 — the model after being "completed"

```sql
CREATE TABLE dim_don_hang AS
SELECT * FROM (VALUES
  (1, 'DH-001', 'moi',        DATE '2026-01-01', DATE '2026-01-03'),
  (2, 'DH-001', 'dang_giao',  DATE '2026-01-03', DATE '2026-01-06'),
  (3, 'DH-001', 'hoan_thanh', DATE '2026-01-06', DATE '9999-12-31'),
  (4, 'DH-002', 'moi',        DATE '2026-01-02', DATE '2026-01-05'),
  (5, 'DH-002', 'dang_giao',  DATE '2026-01-05', DATE '9999-12-31'),
  (6, 'DH-003', 'moi',        DATE '2026-01-04', DATE '9999-12-31'),
  (7, 'DH-004', 'hoan_thanh', DATE '2026-01-04', DATE '9999-12-31')
) t(don_sk, so_don, trang_thai, hieu_luc_tu, hieu_luc_den);

CREATE TABLE fct_ban AS
SELECT * FROM (VALUES ('DH-001', 100), ('DH-002', 200), ('DH-003', 300), ('DH-004', 400))
  t(so_don, doanh_thu);
```

```sql
SELECT (SELECT count(*) FROM fct_ban)                    AS dong_fact,
       (SELECT count(*) FROM dim_don_hang)               AS dong_dim,
       (SELECT count(DISTINCT so_don) FROM dim_don_hang) AS so_don_phan_biet;
```

```text
┌───────────┬──────────┬──────────────────┐
│ dong_fact │ dong_dim │ so_don_phan_biet │
├───────────┼──────────┼──────────────────┤
│         4 │        7 │                4 │
└───────────┴──────────┴──────────────────┘
```

The dimension now has **more rows than the fact**. That's a sign visible to the naked eye.

### Step 2 — the first report is already wrong

```sql
SELECT count(*) AS dong_sau_join, sum(f.doanh_thu) AS doanh_thu_bao_cao
FROM fct_ban f JOIN dim_don_hang d USING (so_don);
```

```text
┌───────────────┬───────────────────┐
│ dong_sau_join │ doanh_thu_bao_cao │
├───────────────┼───────────────────┤
│             7 │              1400 │
└───────────────┴───────────────────┘
```

The real revenue is **1,000**. The report gives **1,400** — 40% inflated, because `DH-001` has three status
versions and so gets counted three times.

Looking at the analytical breakdown makes it even harder to suspect, because every row looks plausible:

```sql
SELECT d.trang_thai, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_don_hang d USING (so_don)
GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌────────────┬───────────┐
│ trang_thai │ doanh_thu │
├────────────┼───────────┤
│ moi        │       600 │
│ hoan_thanh │       500 │
│ dang_giao  │       300 │
└────────────┴───────────┘
```

Three rows, every number "looking right", adding up to 1,400. There is no order currently in status
`moi` with revenue of 600 — 600 is the total of orders that **passed through** status
`moi`. Two different questions, and nobody distinguishes them on the dashboard.

### Step 3 — the fix: degenerate + a separate status dimension

```sql
CREATE TABLE dim_trang_thai AS
SELECT * FROM (VALUES (1,'moi'),(2,'dang_giao'),(3,'hoan_thanh')) t(trang_thai_sk, trang_thai);

CREATE TABLE fct_ban_dung AS
SELECT * FROM (VALUES
  ('DH-001', 3, 100), ('DH-002', 2, 200), ('DH-003', 1, 300), ('DH-004', 3, 400)
) t(so_don, trang_thai_sk, doanh_thu);
```

`so_don` stays in the fact as an ordinary column — that's the degenerate dimension. The status becomes
a real dimension (a few rows, reusable, with display labels).

```sql
SELECT t.trang_thai, count(*) AS so_don, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban_dung f JOIN dim_trang_thai t USING (trang_thai_sk)
GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌────────────┬────────┬───────────┐
│ trang_thai │ so_don │ doanh_thu │
├────────────┼────────┼───────────┤
│ hoan_thanh │      2 │       500 │
│ moi        │      1 │       300 │
│ dang_giao  │      1 │       200 │
└────────────┴────────┴───────────┘
```

```sql
SELECT sum(doanh_thu) AS tong, count(DISTINCT so_don) AS so_don FROM fct_ban_dung;
```

```text
┌────────┬────────┐
│  tong  │ so_don │
├────────┼────────┤
│   1000 │      4 │
└────────┴────────┘
```

### Before and after

| | With a Type 2 `dim_don_hang` | Degenerate |
|---|---|---|
| Reported revenue | 1,400 | **1,000** |
| Tables to join | 2 | 2 (but the dim is only 3 rows) |
| Dimension rows | 7 and growing with each status change | 3, immutable |
| Counting orders | `count(DISTINCT so_don)` — easy to forget the `DISTINCT` | `count(*)` |

**So where does the status history go?** That's a process with milestones — belonging to an
**accumulating snapshot**, see [Facts and dimensions](../reference/fact-and-dimension.md) and
[the lab](../tutorials/star-schema-duckdb.md) step 5. A process's history is a fact,
not a dimension.

## Recognising a degenerate dimension

Three questions; if all three are "yes", it's degenerate:

1. Is this column a **business key** people actually use to look things up? (`so_don`
   is; an internal auto-increment `id` isn't — that's only a technical key)
2. Once every attribute is split into other dimensions, **is anything left but the thing itself**?
3. Does its distinct-value count approach the fact's row count?

Common candidates: order numbers, invoice numbers, tracking numbers, consultation numbers, transaction codes, contract
numbers, batch codes.

## What it's for inside the fact

A degenerate dimension isn't a dead column. It's what:

- **Groups rows belonging to one transaction**: `count(DISTINCT so_don)` gives the order count when the grain
  is a line item — the "average basket" metric lives off it.
- **Traces back to the source system** when somebody disputes a number.
- **Links the header to the lines** — see the section below.

```sql
-- gia tri gio hang trung binh, grain fact la mot DONG don
SELECT round(sum(thanh_tien) * 1.0 / count(DISTINCT so_don), 0) AS gio_hang_tb
FROM fct_ban_chi_tiet;
```

## Header/line — where degenerate dimensions usually appear

An order has a header (date, customer, shipping fee) and lines (product, quantity). Three ways to build it:

| Approach | Description | The problem |
|---|---|---|
| Two separate facts | `fct_don_header` + `fct_don_line` | Joining two facts of different grain → inflation, see the [case study](../case-studies/join-hai-fact-lam-phong-tong.md) |
| One line-grain fact with the header duplicated | The shipping fee repeats on every line | `sum(phi_ship)` is wrong by the line count |
| **One line-grain fact with the header allocated** | The shipping fee split by amount weight | The approach Kimball recommends |

In all three, `so_don` is the degenerate dimension linking the lines together. Approach 3 uses exactly the
allocation-factor technique from [bridge tables](bridge-table.md):

```sql
SELECT so_don, dong_so, thanh_tien,
       round(phi_ship * thanh_tien / sum(thanh_tien) OVER (PARTITION BY so_don), 0)
         AS phi_ship_phan_bo
FROM fct_don_line;
```

After allocation, `sum(phi_ship_phan_bo)` over the whole table equals exactly the real total shipping fee —
correct summed along any dimension.

## Trade-offs

| You get | You lose |
|---|---|
| No extra table, no extra join | A long `VARCHAR` column inside your largest table |
| The fact's grain unchanged, no inflation | No compression like an `INT` surrogate key |
| Easy tracing back to the source system | Nowhere to hang an attribute if one appears later |

On storage cost: a string `so_don` across 500 million rows is significant, but a columnar
format (Parquet/Iceberg) dictionary-compresses this column very well. Measure before optimising.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Building `dim_don_hang` then adding status + Type 2 | Fan-out, revenue 40% inflated — [case study](../case-studies/dim-don-hang-lam-phong-doanh-thu.md) |
| Dropping `so_don` from the fact entirely "to keep it tidy" | You lose the ability to count orders and trace back to the source |
| Counting orders with `count(*)` when the grain is a line item | The order count = the line count, inflated by the item count |
| Believing every key in a fact must have a dimension | You spawn a table whose grain equals the fact's |
| Putting the header's shipping fee on every line and then `SUM`ing | The shipping fee multiplies by the order's line count |

## Related Topics

- [Grain](../reference/grain.md) — the "is the dimension coarser than the fact" test
- [Junk dimensions](junk-dimension.md) — the right home for the low-cardinality flags left behind
- [Facts and dimensions](../reference/fact-and-dimension.md) — accumulating snapshots for process history
- [Bridge tables](bridge-table.md) — allocation factors for header/line
- [CS: the order dim inflating revenue 40%](../case-studies/dim-don-hang-lam-phong-doanh-thu.md)
- [The star-schema lab](../tutorials/star-schema-duckdb.md) — step 3 keeps `so_don` in the fact

## References

- Kimball Group — [Degenerate Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapters 3 and 6
