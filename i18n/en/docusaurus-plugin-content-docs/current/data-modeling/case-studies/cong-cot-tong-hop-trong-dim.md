---
title: A "total spend" column in the dimension, summed after joining the fact — nearly 2× inflated
sidebar_position: 21
description: "An aggregate placed as a dimension attribute is very handy for filtering, and inflates by the fact's row count the moment somebody sums it."
tags: [case-study, behavior-tag, dimension, additivity, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# A "total spend" column in the dimension, summed after joining the fact — nearly 2× inflated

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** putting an aggregate onto a dimension for **filtering and grouping** is the right technique. It
> becomes a trap the moment somebody **sums** it after joining the fact — see
> [putting behaviour into a dimension](../skills/behavior-dimension.md).

## Context

Marketing needs to filter *"customers with total spend above 5,000"* in every report. Writing a
fact-aggregating subquery each time is slow and everybody writes it differently, so the data team puts it on the dimension.

```sql
CREATE TABLE fct_ban AS
SELECT * FROM (VALUES
  ('C1', DATE '2026-01-10',  2000), ('C1', DATE '2026-03-15',  6000),
  ('C2', DATE '2026-02-01',   300),
  ('C3', DATE '2026-01-20', 50000), ('C3', DATE '2026-05-11', 30000),
  ('C4', DATE '2026-06-01',   900)
) t(khach_id, ngay, doanh_thu);

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

The truth: **89,200**. And summing the dimension's column gives exactly that number:

```text
┌───────────────┬───────────────────┐
│ sum_trong_dim │ tong_that_tu_fact │
├───────────────┼───────────────────┤
│         89200 │             89200 │
└───────────────┴───────────────────┘
```

This column is **correct**. That's what makes the next step so hard to suspect.

## Symptoms

An analyst builds a *"revenue by customer segment"* report. They need both revenue and the customer
attributes, so they join the fact to the dim — and sum the dim's column because it's right there named
"total spend".

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

**Nearly 2× inflated.** The inflation factor equals the **average purchase count** of the customers in the
report — so it differs with every filter and every time window. There's no fixed ratio to
recognise.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| `dim_khach` holding duplicate customers | `count(*)` = `count(DISTINCT khach_id)` = 4 |
| The fact loaded duplicates | Reconciled against the source: 6 rows, correct |
| A wrong join condition | `USING (khach_id)` — the right key |
| The dim's column computed wrongly | Summed inside the dim it gives **exactly** 89,200 |

The last hypothesis is what confuses everybody most: **the column is right, the join is right, the fact is right** —
and the result is wrong.

The redirecting question: *"after the join, how many rows does each customer occupy?"*

## The real cause

`tong_chi_tieu` is **an attribute of one customer**; its grain is *one customer*. After joining
the fact, the result's grain is *one transaction* — customer `C1` has 2 transactions so
`8000` appears twice, and the same for `C3`.

177,200 = 8,000×2 + 300×1 + 80,000×2 + 900×1.

This is classic fan-out, the same mechanism as
[the order dim inflating revenue](dim-don-hang-lam-phong-doanh-thu.md) but in the opposite direction:
there the **dimension** replicates fact rows; here the **fact** replicates the dimension's value.

What both share: a value at a coarse grain being summed at a fine grain.

## Why no test catches it

| Test | The result |
|---|---|
| `unique` on `dim_khach.khach_id` | ✅ green |
| `sum(tong_chi_tieu)` in the dim = `sum(doanh_thu)` in the fact | ✅ green — **and this is the right test!** |
| `relationships` fact → dim | ✅ green |
| `not_null` on every column | ✅ green |
| The fact's grain | ✅ green |

The second row is this case's most memorable point: **the correct invariant test is still green**, because that
invariant only holds when summing *inside the dimension*. No test can check **where** a user sums
it.

This is the kind of bug you block with **design and naming**, not with tests.

## The fix

### Fix 1 — a self-incriminating name

```sql
CREATE TABLE dim_khach AS
SELECT khach_id,
       sum(doanh_thu) AS attr_tong_chi_tieu,     -- attr_ prefix: for filtering/grouping only
       count(*)       AS attr_so_lan_mua,
       max(ngay)      AS attr_lan_mua_gan_nhat
FROM fct_ban GROUP BY 1;
```

The `attr_` prefix (or a `_khong_cong` suffix) is the cheapest guardrail: somebody dragging the column into a
total cell hesitates for a second — enough to ask.

### Fix 2 — use it for its purpose: filter, don't sum

```sql
-- RIGHT: filter by the attribute, sum the FACT's column
SELECT sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_khach d USING (khach_id)
WHERE d.attr_tong_chi_tieu > 5000;

-- RIGHT: sum the DIM's column, without joining the fact
SELECT count(*) AS so_khach, sum(attr_tong_chi_tieu) AS tong
FROM dim_khach WHERE attr_tong_chi_tieu > 5000;
```

The one-sentence rule: **once you've joined the fact, sum only the fact's columns.**

### Fix 3 — write it into the column description

In dbt, `schema.yml` is where this sentence lives alongside the code:

```yaml
- name: attr_tong_chi_tieu
  description: >
    Tong chi tieu tich luy cua khach. CHI dung de LOC va NHOM.
    KHONG duoc SUM sau khi join voi fact — se phong theo so giao dich.
```

| | Before | After |
|---|---|---|
| The report's total | 177,200 (**1.99× inflated**) | 89,200 |
| Column name | `tong_chi_tieu` | `attr_tong_chi_tieu` |
| Warning to the user | None | The column name + the description |

## An accompanying trap

`attr_tong_chi_tieu` **changes every day**. Turning on [SCD](../skills/scd.md) Type 2 for it is a
straight road to [a dimension 365× bloated](dimension-phinh-365-lan.md).

Use Type 1 (overwrite), or split it into a [mini-dimension](../skills/mini-dimension.md) if you
genuinely need as-was.

## How to spot it early

1. Look for dimension columns whose names carry an aggregate meaning:

```bash
grep -rn "sum(\|count(\|max(\|avg(" models/marts/dim_*.sql
```

Each hit is a column needing careful naming and description.

2. **The two-way invariant** — run both, they must differ:

```sql
SELECT (SELECT sum(attr_tong_chi_tieu) FROM dim_khach) AS cong_trong_dim,
       (SELECT sum(d.attr_tong_chi_tieu) FROM fct_ban f
        JOIN dim_khach d USING (khach_id))            AS cong_sau_join;
```

Knowing in advance that these two numbers differ is knowing the trap in advance.

3. On the dashboard, is any cell summing a column that came from a dimension table?

## Related Topics

- [Putting behaviour into a dimension](../skills/behavior-dimension.md) — the technique misused here
- [Grain](../reference/grain.md) — a join changes the result's grain
- [Mini-dimensions](../skills/mini-dimension.md) — the right place for fast-changing attributes
- [CS: the order dim inflating revenue](dim-don-hang-lam-phong-doanh-thu.md) — fan-out in the opposite direction
- [CS: a dimension 365× bloated](dimension-phinh-365-lan.md) — the accompanying Type 2 trap
