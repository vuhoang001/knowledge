---
title: Putting behaviour into a dimension
sidebar_position: 20
description: "Aggregate numbers as dimension attributes, dynamic banding, study groups and step dimensions — four ways of segmenting, one shared double-counting trap."
tags: [behavior-tag, study-group, value-banding, step-dimension, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Putting behaviour into a dimension

> **Takeaway:** *"a high-spending customer"* is a question about a **fact**, but people want to use
> it to **filter and group** — that is, use it as a dimension. The four techniques below solve that
> problem, and all four share one trap: **an aggregate number sitting in a dimension must not be
> `SUM`med after joining the fact.**

## The shared data

```sql
CREATE TABLE fct_ban AS
SELECT * FROM (VALUES
  ('C1', DATE '2026-01-10',  2000), ('C1', DATE '2026-03-15',  6000),
  ('C2', DATE '2026-02-01',   300),
  ('C3', DATE '2026-01-20', 50000), ('C3', DATE '2026-05-11', 30000),
  ('C4', DATE '2026-06-01',   900)
) t(khach_id, ngay, doanh_thu);
```

## 1. Aggregated facts as dimension attributes

Lifting an aggregate number into the dimension so you can filter/group without scanning the fact:

```sql
CREATE TABLE dim_khach AS
SELECT khach_id, sum(doanh_thu) AS tong_chi_tieu, count(*) AS so_lan_mua,
       max(ngay) AS lan_mua_gan_nhat
FROM fct_ban GROUP BY 1;
```

```text
┌──────────┬───────────────┬────────────┬──────────────────┐
│ khach_id │ tong_chi_tieu │ so_lan_mua │ lan_mua_gan_nhat │
├──────────┼───────────────┼────────────┼──────────────────┤
│ C1       │          8000 │          2 │ 2026-03-15       │
│ C2       │           300 │          1 │ 2026-02-01       │
│ C3       │         80000 │          2 │ 2026-05-11       │
│ C4       │           900 │          1 │ 2026-06-01       │
└──────────┴───────────────┴────────────┴──────────────────┘
```

Very convenient: *"revenue from customers whose total spend exceeds 5,000"* becomes a `WHERE` on the
dimension rather than an aggregating subquery over the fact.

### The trap

Summing this column **inside the dimension** is correct:

```text
┌───────────────┬───────────────────┐
│ sum_trong_dim │ tong_that_tu_fact │
├───────────────┼───────────────────┤
│         89200 │             89200 │
└───────────────┴───────────────────┘
```

Summing it **after joining the fact** breaks:

```sql
SELECT sum(d.tong_chi_tieu) AS sum_sau_khi_join_fact,
       (SELECT sum(doanh_thu) FROM fct_ban) AS tong_that,
       round(1.0 * sum(d.tong_chi_tieu)
             / (SELECT sum(doanh_thu) FROM fct_ban), 2) AS phong_may_lan
FROM fct_ban f JOIN dim_khach d USING (khach_id);
```

```text
┌───────────────────────┬───────────┬───────────────┐
│ sum_sau_khi_join_fact │ tong_that │ phong_may_lan │
├───────────────────────┼───────────┼───────────────┤
│                177200 │     89200 │          1.99 │
└───────────────────────┴───────────┴───────────────┘
```

**Nearly 2× inflated** — each customer is counted once per fact row they have. This is the same fan-out
mechanism as [the order dim inflating revenue](../case-studies/dim-don-hang-lam-phong-doanh-thu.md),
except that here the duplicating side is the *fact*, and the multiplied column is the dimension's *aggregate*.

Three defences, use all three:

- **A self-incriminating name**: `tong_chi_tieu_khong_cong` or an `attr_` prefix.
- **State clearly in the column description** that it's only for filtering and grouping.
- **An invariant test**: `sum(the_aggregate_column)` in the dimension must equal `sum(the_source_column)` in the
  fact; if a user sums it after a join, the number will differ.

### The refresh cadence

This column **changes daily**. Turning on [SCD](scd.md) Type 2 for it is a direct road to a
[dimension 365× bloated](../case-studies/dimension-phinh-365-lan.md). Two correct options:
Type 1 (overwrite, keeping only the current value), or splitting it into a
[mini-dimension](mini-dimension.md) if you genuinely need as-was.

## 2. Dynamic value banding

Segmenting customers by threshold. The wrong way is `CASE WHEN` scattered across dashboards; the right way
is **one threshold table**:

```sql
CREATE TABLE dai_gia_tri AS
SELECT * FROM (VALUES
  ('Nho',     0,    1000),
  ('Vua',  1000,   10000),
  ('Lon', 10000, 1000000)
) t(ten_dai, tu, den);

SELECT b.ten_dai, count(*) AS so_khach, sum(d.tong_chi_tieu) AS chi_tieu
FROM dim_khach d JOIN dai_gia_tri b
  ON d.tong_chi_tieu >= b.tu AND d.tong_chi_tieu < b.den
GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌─────────┬──────────┬──────────┐
│ ten_dai │ so_khach │ chi_tieu │
├─────────┼──────────┼──────────┤
│ Lon     │        1 │    80000 │
│ Vua     │        1 │     8000 │
│ Nho     │        2 │     1200 │
└─────────┴──────────┴──────────┘
```

Marketing wants the middle band split? **Edit the table, without changing a line of SQL**:

```sql
UPDATE dai_gia_tri SET den = 5000 WHERE ten_dai = 'Vua';
INSERT INTO dai_gia_tri VALUES ('Lon vua', 5000, 10000);
```

```text
┌─────────┬──────────┬──────────┐
│ ten_dai │ so_khach │ chi_tieu │
├─────────┼──────────┼──────────┤
│ Lon     │        1 │    80000 │
│ Lon vua │        1 │     8000 │
│ Nho     │        2 │     1200 │
└─────────┴──────────┴──────────┘
```

The threshold table needs exactly the same invariants as a [timespan](ytd-timespan-facts.md) — no gaps, no
overlaps:

```text
┌─────────┬─────────┬────────────┬────────────┐
│ ten_dai │   den   │ dai_sau_tu │ tinh_trang │
├─────────┼─────────┼────────────┼────────────┤
│ Nho     │    1000 │       1000 │ lien tuc   │
│ Vua     │    5000 │       5000 │ lien tuc   │
│ Lon vua │   10000 │      10000 │ lien tuc   │
│ Lon     │ 1000000 │       NULL │ dai cuoi   │
└─────────┴─────────┴────────────┴────────────┘
```

Leave a gap and any customer falling into it **vanishes from the segmentation report**; overlap and they
get counted twice. Neither reports an error.

**A trade-off to state plainly:** editing the threshold table makes **old reports change their numbers**. If you need
comparability over time, the threshold table must have `hieu_luc_tu`/`hieu_luc_den` — the same handling as SCD.

## 3. Behavior study groups

A **fixed set of keys**, chosen by behaviour at a point in time and then tracked afterwards.

```sql
CREATE TABLE nhom_nghien_cuu AS
SELECT 'Khach mua thang 1/2026' AS ten_nhom, khach_id
FROM (SELECT DISTINCT khach_id FROM fct_ban
      WHERE date_trunc('month', ngay) = DATE '2026-01-01');
```

```text
┌────────────────────────┬──────────┐
│        ten_nhom        │ khach_id │
├────────────────────────┼──────────┤
│ Khach mua thang 1/2026 │ C1       │
│ Khach mua thang 1/2026 │ C3       │
└────────────────────────┴──────────┘
```

```sql
SELECT date_trunc('month', f.ngay)::DATE AS thang, sum(f.doanh_thu) AS chi_tieu_cua_nhom
FROM fct_ban f JOIN nhom_nghien_cuu n USING (khach_id)
GROUP BY 1 ORDER BY 1;
```

```text
┌────────────┬───────────────────┐
│   thang    │ chi_tieu_cua_nhom │
├────────────┼───────────────────┤
│ 2026-01-01 │             52000 │
│ 2026-03-01 │              8000 │
│ 2026-05-01 │             30000 │
└────────────┴───────────────────┘
```

This is cohort analysis, and the crucial point is that the table holds only **keys**, copying no data.
That's what lets it join to **any** fact — sales, returns, customer service — without ever
diverging from the source.

If instead of storing keys you stored the condition (`WHERE thang = 1`), the membership set would differ
on each run whenever historical data was corrected — and the whole cohort comparison would lose its meaning.

## 4. Step dimensions

An event's position within **the sequence of events of the same entity**:

```sql
CREATE TABLE fct_buoc AS
SELECT khach_id, ngay, doanh_thu,
       row_number() OVER (PARTITION BY khach_id ORDER BY ngay) AS buoc_thu_may,
       count(*)     OVER (PARTITION BY khach_id)               AS tong_so_buoc
FROM fct_ban;

SELECT buoc_thu_may, count(*) AS so_don, sum(doanh_thu) AS doanh_thu,
       round(avg(doanh_thu), 0) AS gia_tri_tb
FROM fct_buoc GROUP BY 1 ORDER BY 1;
```

```text
┌──────────────┬────────┬───────────┬────────────┐
│ buoc_thu_may │ so_don │ doanh_thu │ gia_tri_tb │
├──────────────┼────────┼───────────┼────────────┤
│            1 │      4 │     53200 │    13300.0 │
│            2 │      2 │     38000 │    19000.0 │
└──────────────┴────────┴───────────┴────────────┘
```

The question *"is the second order bigger than the first"* — here 19,000 against 13,300 — is only
answerable with this column. Without it, users write their own window functions and each writes
a different one.

The standard applications: which step in the sales funnel, which page in a session, which visit
number for a patient.

`tong_so_buoc` lets you ask the inverse: *"among sessions with exactly 3 steps, what is step 2"*.

**Note:** both columns must be recomputed when there's [late-arriving data](late-arriving.md) — one
backdated transaction shifts the sequence number of every transaction after it.

## Behavior tag time series

A variant of (1): instead of a number, store **a series of labels over time** —
`'AABBCA'` meaning that over the last 6 months the customer was at levels A, A, B, B, C, A.

The strength: finding behaviour patterns with string matching (`LIKE '%CC%'` = two consecutive months of dropping
a tier). The weakness: the string must be updated each period, and every analysis over it **isn't summable**
— exactly the trap in section 1.

Only build it when you genuinely have a pattern-detection problem; otherwise a monthly customer-tier
fact is both simpler and summable.

## Trade-offs

| You get | You lose |
|---|---|
| Filtering/grouping by behaviour without scanning the fact | The aggregate column mustn't be summed after a join |
| A threshold table: changing segments without changing code | Changing a threshold makes old reports change numbers |
| A study group: a stable cohort joinable to any fact | It must be generated and clearly named |
| A step dimension: sequence analysis becomes a `GROUP BY` | It must be recomputed when data arrives late |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| `SUM`ming the aggregate column after joining the fact | Inflation by the row count — [case study](../case-studies/cong-cot-tong-hop-trong-dim.md) |
| Type 2 for an aggregate column that changes daily | The dimension bloats — [case study](../case-studies/dimension-phinh-365-lan.md) |
| `CASE WHEN` banding scattered across dashboards | Each dashboard has its own segmentation definition |
| A threshold table with gaps or overlaps | Customers vanish or get counted twice |
| A study group storing a condition rather than keys | The membership set changes on each run |
| Not recomputing steps when data arrives late | The sequence numbers are wrong from the insertion point onwards |

## Related Topics

- [Mini-dimensions](mini-dimension.md) — the right home for a fast-changing attribute needing as-was
- [SCD](scd.md) — why Type 1 is the choice for an aggregate column
- [Aggregate fact tables](aggregate-fact-table.md) — the same rule about summable numbers
- [Year-to-date and timespan](ytd-timespan-facts.md) — a threshold table needs the same invariants as a timespan
- [CS: summing an aggregate column in a dimension](../case-studies/cong-cot-tong-hop-trong-dim.md)

## References

- Kimball Group — [Aggregated Facts as Dimension Attributes · Dynamic Value Banding · Behavior Study Groups · Behavior Tag Time Series · Step Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 8
