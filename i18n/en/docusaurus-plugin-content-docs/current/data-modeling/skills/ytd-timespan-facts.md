---
title: Year-to-date and timespan in a fact
sidebar_position: 19
description: "A pre-stored running-total column in a fact is a double-counting trap; conversely, a validity interval stored in the fact is what keeps historical prices from changing."
tags: [year-to-date, timespan, additivity, fact, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Year-to-date and timespan in a fact

> **Takeaway:** two techniques both push *time* into the fact and give opposite results. A
> **running-total** (`YTD`) column is a **non-summable** number sitting among summable ones — almost always
> to be dropped. A **validity interval** column is the reverse: without it, the past changes its own numbers.

## Year-to-date: don't store it, compute it at read time

```sql
CREATE TABLE fct_thang AS
SELECT thang, doanh_thu,
       sum(doanh_thu) OVER (ORDER BY thang) AS doanh_thu_ytd
FROM (VALUES (1, 100), (2, 200), (3, 150), (4, 300)) t(thang, doanh_thu);
```

```text
┌───────┬───────────┬───────────────┐
│ thang │ doanh_thu │ doanh_thu_ytd │
├───────┼───────────┼───────────────┤
│     1 │       100 │           100 │
│     2 │       200 │           300 │
│     3 │       150 │           450 │
│     4 │       300 │           750 │
└───────┴───────────┴───────────────┘
```

This table is **correct**. Every row is accurate. It fails at the most natural action a BI
user takes with a numeric column: dragging it into the "total" box.

```sql
SELECT sum(doanh_thu)     AS doanh_thu_that,
       sum(doanh_thu_ytd) AS sum_cua_cot_ytd,
       round(1.0 * sum(doanh_thu_ytd) / sum(doanh_thu), 2) AS phong_may_lan
FROM fct_thang;
```

```text
┌────────────────┬─────────────────┬───────────────┐
│ doanh_thu_that │ sum_cua_cot_ytd │ phong_may_lan │
├────────────────┼─────────────────┼───────────────┤
│            750 │            1600 │          2.13 │
└────────────────┴─────────────────┴───────────────┘
```

**2.13× inflated** — and with 12 months it inflates about 6.5×. January gets counted 4 times,
February three times, and so on.

`doanh_thu_ytd` is **non-additive along the time dimension**, exactly like a balance in a
[periodic snapshot](../reference/fact-and-dimension.md). But one difference makes it more
dangerous: a balance *looks* non-summable (everybody knows adding 12 months of balances is
absurd), while `doanh_thu_ytd` **looks identical** to `doanh_thu`.

To read it correctly you must read **one row** and never aggregate:

```sql
SELECT thang, doanh_thu_ytd FROM fct_thang WHERE thang = 4;
```

```text
┌───────┬───────────────┐
│ thang │ doanh_thu_ytd │
├───────┼───────────────┤
│     4 │           750 │
└───────┴───────────────┘
```

### The approach — drop the column, use a window function

```sql
SELECT thang, doanh_thu,
       sum(doanh_thu) OVER (ORDER BY thang) AS ytd_tinh_luc_doc
FROM fct_thang ORDER BY thang;
```

```text
┌───────┬───────────┬──────────────────┐
│ thang │ doanh_thu │ ytd_tinh_luc_doc │
├───────┼───────────┼──────────────────┤
│     1 │       100 │              100 │
│     2 │       200 │              300 │
│     3 │       150 │              450 │
│     4 │       300 │              750 │
└───────┴───────────┴──────────────────┘
```

The same result, but the running-total column **doesn't exist in the table**, so nobody can add it wrongly.
Every modern engine has window functions; that's no longer a valid reason to pre-store it.

**The only exception:** the BI tool doesn't support window functions and the dataset is too large to recompute.
Then store the YTD in a **separate, clearly named table** (`agg_ytd_thang`), not mixed into the atomic
fact, and note in the table description that the column must not be `SUM`med.

The same argument as not storing `avg` in an
[aggregate table](aggregate-fact-table.md): **store summable numbers and compute the rest at read time.**

## Timespan tracking: this one you must store

The opposite direction. The fact records **a state valid over a time interval** —
a selling price, a credit limit, a fee level — with `hieu_luc_tu` / `hieu_luc_den` right in the fact.

```sql
CREATE TABLE fct_gia AS
SELECT * FROM (VALUES
  ('SP-A', 100, DATE '2026-01-01', DATE '2026-03-01'),
  ('SP-A', 150, DATE '2026-03-01', DATE '2026-06-01'),
  ('SP-A', 300, DATE '2026-06-01', DATE '9999-12-31'),
  ('SP-B', 500, DATE '2026-01-01', DATE '9999-12-31')
) t(san_pham, gia, hieu_luc_tu, hieu_luc_den);
```

The price at the moment of sale:

```sql
SELECT b.san_pham, b.ngay, b.so_luong, g.gia, b.so_luong * g.gia AS thanh_tien
FROM fct_ban b JOIN fct_gia g
  ON g.san_pham = b.san_pham
 AND b.ngay >= g.hieu_luc_tu AND b.ngay < g.hieu_luc_den
ORDER BY b.ngay;
```

```text
┌──────────┬────────────┬──────────┬───────┬────────────┐
│ san_pham │    ngay    │ so_luong │  gia  │ thanh_tien │
├──────────┼────────────┼──────────┼───────┼────────────┤
│ SP-A     │ 2026-02-10 │        3 │   100 │        300 │
│ SP-A     │ 2026-04-15 │        2 │   150 │        300 │
│ SP-B     │ 2026-05-05 │        1 │   500 │        500 │
│ SP-A     │ 2026-07-20 │        4 │   300 │       1200 │
└──────────┴────────────┴──────────┴───────┴────────────┘
```

Substituting the current price instead:

```text
┌──────────────────┬───────────────────┬──────────┐
│ dung_gia_luc_ban │ dung_gia_hien_tai │ lech_pct │
├──────────────────┼───────────────────┼──────────┤
│             2300 │              3200 │     39.1 │
└──────────────────┴───────────────────┴──────────┘
```

**39.1% out.** The same mechanism as [SCD](scd.md) Type 2 and as
[exchange rates](multi-currency-uom.md), except applied to the fact itself rather than a dimension.

### Two invariants to check

A validity interval is only trustworthy when there are **no gaps and no overlaps**. Fail either and a
date-based join will lose rows or duplicate them.

```sql
SELECT san_pham, count(*) AS so_khoang,
       count(*) FILTER (WHERE hieu_luc_tu >= hieu_luc_den) AS khoang_nguoc,
       max(hieu_luc_den) AS phu_toi
FROM fct_gia GROUP BY 1 ORDER BY 1;
```

```text
┌──────────┬───────────┬──────────────┬────────────┐
│ san_pham │ so_khoang │ khoang_nguoc │  phu_toi   │
├──────────┼───────────┼──────────────┼────────────┤
│ SP-A     │         3 │            0 │ 9999-12-31 │
│ SP-B     │         1 │            0 │ 9999-12-31 │
└──────────┴───────────┴──────────────┴────────────┘
```

And check continuity with `lead()`:

```sql
WITH x AS (
  SELECT san_pham, hieu_luc_tu, hieu_luc_den,
         lead(hieu_luc_tu) OVER (PARTITION BY san_pham ORDER BY hieu_luc_tu) AS ke_tiep_tu
  FROM fct_gia
)
SELECT san_pham, hieu_luc_den, ke_tiep_tu,
       CASE WHEN ke_tiep_tu IS NULL THEN 'cuoi chuoi'
            WHEN ke_tiep_tu = hieu_luc_den THEN 'lien tuc'
            WHEN ke_tiep_tu > hieu_luc_den THEN 'CO KHOANG TRONG'
            ELSE 'CHONG LAN' END AS tinh_trang
FROM x ORDER BY san_pham, hieu_luc_tu;
```

```text
┌──────────┬──────────────┬────────────┬────────────┐
│ san_pham │ hieu_luc_den │ ke_tiep_tu │ tinh_trang │
├──────────┼──────────────┼────────────┼────────────┤
│ SP-A     │ 2026-03-01   │ 2026-03-01 │ lien tuc   │
│ SP-A     │ 2026-06-01   │ 2026-06-01 │ lien tuc   │
│ SP-A     │ 9999-12-31   │ NULL       │ cuoi chuoi │
│ SP-B     │ 9999-12-31   │ NULL       │ cuoi chuoi │
└──────────┴──────────────┴────────────┴────────────┘
```

This query is worth making a dbt test — it catches both gaps and overlaps in a single
scan.

### The half-open convention `[tu, den)`

The previous interval's `hieu_luc_den` **exactly equals** the next interval's `hieu_luc_tu`, and the join
condition uses `>= tu AND < den`. This convention removes every argument about "which price applies on the
day the price changed" and turns the continuity check into an equality comparison.

Using `<=` at both ends creates a one-day overlap at every boundary — the classic bug, and it
duplicates exactly the rows falling on a transition day.

## Fact table surrogate key

Kimball keeps a small, often-overlooked technique separate: **adding a surrogate key for the fact row
itself** (`ban_sk BIGINT`, auto-incrementing).

| When it's worth adding | Why |
|---|---|
| The fact gets `UPDATE`d (an accumulating snapshot, a timespan) | You have a unique handle to point at when editing |
| You need to reload individual rows rather than batches | `DELETE ... WHERE ban_sk IN (...)` |
| A child table points back at the fact row | You need a single key rather than a 6-column composite |
| Tracing within the load process | Pairs with an [audit dimension](audit-dimension.md) |

When you **don't** need it: the fact is `INSERT`-only and nothing points at it. Adding a key then just
costs 8 bytes a row for nothing.

Note: this key does **not** replace declaring the grain. A unique `ban_sk` doesn't prove the
grain is right — two rows duplicating the grain still have two different `ban_sk` values. The grain check must still
run on the business-key combination, see [grain](../reference/grain.md).

## Trade-offs

| You get | You lose |
|---|---|
| Dropping the YTD column: nobody can add it wrongly | Each query has to write a window function |
| A timespan in the fact: historical prices immutable | An inequality join, slower than a key join |
| The `[tu, den)` convention | Discipline required everywhere you write and everywhere you read |
| A fact surrogate key: editing/reloading individual rows | 8 bytes a row, and a sequence to generate |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Storing a YTD column in the atomic fact | `SUM` inflates 2–6× — [case study](../case-studies/cong-cot-luy-ke.md) |
| Naming a running-total column like an ordinary one | Nobody knows which column may be summed |
| A timespan using `<=` at both ends | A one-day overlap duplicating rows at every transition |
| Not checking for gaps / overlaps | A date-based join loses rows with no error reported |
| Joining the price with the current record | Historical revenue 39% out |
| Believing a unique `ban_sk` means the grain is right | A duplicated grain still passes a `unique` test |

## Related Topics

- [Facts and dimensions](../reference/fact-and-dimension.md) — additivity, and periodic snapshots being non-additive over time too
- [Aggregate fact tables](aggregate-fact-table.md) — the same rule: store only summable numbers
- [SCD](scd.md) — validity intervals applied to a dimension
- [Multiple currencies](multi-currency-uom.md) — freezing the value as of the transaction
- [CS: summing a running-total column](../case-studies/cong-cot-luy-ke.md)

## References

- Kimball Group — [Year-to-Date Facts · Timespan Tracking in Fact Tables · Fact Table Surrogate Keys](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapters 3 and 4
