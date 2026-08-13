---
title: "Advanced fact lab — allocation, cumulatives, summary tables, centipedes"
sidebar_position: 5
description: "Allocating shipping fees then finding a 1-dong rounding gap; summing a cumulative column inflates 3.38×; avg-of-avg is 5.7% out."
tags: [tutorial, allocated-facts, ytd-timespan-facts, aggregate-fact-table, centipede, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Advanced fact lab — allocation, cumulatives, summary tables, centipedes

> **Takeaway:** the first three exercises are all **a numeric column sitting in the wrong place in a fact**. None of the
> columns holds a wrong value; they just don't add up the way people are going to add them.

## Preparation

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

The benchmark: **10 orders · 15 lines · revenue 10,215,000 · shipping fees 400,000**.

## Exercise 1 — Allocating the shipping fee, and one dong disappears

In [the foundations lab](lab-nen-tang-grain-fact-dim.md), exercise 2, replicating `phi_ship` onto every
line inflated it by **77.5%**. The right way is to allocate it in proportion to the goods amount:

```sql
select ct.dong, ct.so_luong*ct.don_gia tien_hang,
       round(h.phi_ship::double * (ct.so_luong*ct.don_gia)
             / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id), 0) phi_ship_phan_bo
from don_hang_chi_tiet ct join don_hang h using (don_hang_id)
where ct.don_hang_id = 'DH003' order by ct.dong;
```

`DH003` has a shipping fee of 90,000 and three goods lines:

```text
┌───────┬───────────┬──────────────────┐
│ dong  │ tien_hang │ phi_ship_phan_bo │
├───────┼───────────┼──────────────────┤
│     1 │    900000 │          41538.0 │
│     2 │    450000 │          20769.0 │
│     3 │    600000 │          27692.0 │
└───────┴───────────┴──────────────────┘
```

41,538 + 20,769 + 27,692 = **89,999**. **One dong** short.

Checked across the whole table:

```text
┌──────────────┬───────────┬────────────────┐
│ tong_phan_bo │ tong_that │ chenh_lam_tron │
├──────────────┼───────────┼────────────────┤
│     399999.0 │    400000 │           -1.0 │
└──────────────┴───────────┴────────────────┘
```

**Allocation's unbreakable law: `sum(phan_bo)` must equal the original total.** Being 1 dong out sounds harmless,
but it makes the reconciliation test **red on every run** — and then somebody will loosen the test's threshold, and from
then on the test catches nothing.

**What to do:** fix it so the total matches exactly — push the rounding error onto the largest line of
each order:

```sql
-- hint: use sum(...) over (partition by don_hang_id) then give the last line the difference
```

See [header/line and allocating facts](../skills/allocated-facts.md) and
[the case study on shipping fees 133% inflated](../case-studies/phi-ship-phong-133-phan-tram.md).

| Your result |
|---|
| |

## Exercise 2 — Choosing the allocation basis: a business decision, not a technical one

Exercise 1 divides by **goods amount**. But the carrier charges by **weight**, not by money.

**What to do:** add a `trong_luong_kg` column to `hang_hoa`, reallocate by weight,
then compare the two result tables. Which product changes rank the most?

| A header measure | The sensible basis | Why |
|---|---|---|
| Shipping fee | Weight / volume | The carrier charges by weight |
| Whole-order discount | Goods amount | The discount is computed on value |
| Packing cost | Item count | Each item is one operation |

Record the reason for the choice **right beside the code** — six months later nobody remembers why goods amount was chosen.

| Your result |
|---|
| |

## Exercise 3 — A cumulative column: 3.38× inflated

Build a table with a ready-made YTD column, exactly as many places do:

```sql
with theo_ngay as (select ngay, sum(so_luong*don_gia) dt from don_hang_chi_tiet group by 1)
select ngay, dt, sum(dt) over (order by ngay) dt_ytd from theo_ngay;
```

This table is **correct on every row**. It breaks on the most natural action of all — dragging the column into a total cell:

```text
┌────────────────┬─────────────┬───────────────┐
│ doanh_thu_that │ sum_cot_ytd │ phong_may_lan │
├────────────────┼─────────────┼───────────────┤
│       10215000 │    34560000 │          3.38 │
└────────────────┴─────────────┴───────────────┘
```

**3.38× inflated** across 5 days. Over 12 months it's about 6.5× — and the factor **changes
with the number of periods on screen**, so there's no fixed ratio to recognise.

`dt_ytd` is non-additive across time, like a balance. The fatal difference: a balance *looks*
unsummable, while `doanh_thu_ytd` **looks exactly like** `doanh_thu`.

**What to do:** drop the column and compute it with a window function at read time. See
[year-to-date and timespan](../skills/ytd-timespan-facts.md) and
[the case study on summing a cumulative column](../case-studies/cong-cot-luy-ke.md).

| Your result |
|---|
| |

## Exercise 4 — A summary table storing `avg`: 5.7% out

```sql
with theo_ngay as (select ngay, avg(so_luong*don_gia) tb from don_hang_chi_tiet group by 1)
select (select avg(so_luong*don_gia) from don_hang_chi_tiet) tu_atomic, avg(tb) avg_cua_avg
from theo_ngay;
```

```text
┌───────────┬─────────────┬──────────┐
│ tu_atomic │ avg_cua_avg │ lech_pct │
├───────────┼─────────────┼──────────┤
│  681000.0 │    642500.0 │     -5.7 │
└───────────┴─────────────┴──────────┘
```

avg-of-avg gives each **day** equal weight, whether that day had 4 lines or 2.

The fix: a summary table **stores only summable numbers** — `sum` and `count`, dividing at read time.

**What to do:** build `agg_ngay(ngay, doanh_thu, so_dong)`, then add a backdated row
to `don_hang_chi_tiet` **without** rebuilding the summary table. Write a reconciliation query that finds
the divergent day. See [aggregate fact tables](../skills/aggregate-fact-table.md) and
[the case study on the summary table with divergent numbers](../case-studies/bang-tong-hop-lech-so.md).

| Your result |
|---|
| |

## Exercise 5 — The centipede: count the foreign keys

Build a fact in the over-normalised style — one dimension per time level:

```sql
create or replace table fct_centipede as
select ct.don_hang_id, ct.dong,
       cast(strftime(ct.ngay,'%Y%m%d') as int) ngay_key,
       cast(strftime(ct.ngay,'%Y%W')  as int)  tuan_key,
       cast(strftime(ct.ngay,'%Y%m')  as int)  thang_key,
       year(ct.ngay)*10+quarter(ct.ngay)       quy_key,
       year(ct.ngay)                           nam_key,
       ct.ma_hang, h.khach_id,
       ct.so_luong*ct.don_gia thanh_tien
from don_hang_chi_tiet ct join don_hang h using (don_hang_id);
```

Seven foreign keys for **three real dimensions** (time, goods, customer).

**The test:** do the four time keys other than `ngay_key` carry any new information? Write a
query proving they're fully derivable from `ngay_key`.

Collapse them into one complete `dim_ngay`, then compare: the number of foreign keys, the number of tables to join, and the number of
**wrong** ways to join that are possible. See [centipede fact tables](../skills/centipede-fact.md) and
[the case study on a fact with eight foreign keys](../case-studies/fact-hai-chuc-khoa-ngoai.md).

| Your result |
|---|
| |

## Exercise 6 — Several units of measure and several currencies

`don_gia` is currently in VND. Add an order in USD:

```sql
insert into don_hang_chi_tiet values ('DH011',1,'SP-C',1,40,'2026-07-06');
```

Now `sum(so_luong*don_gia)` adds VND together with USD — producing a number that's **valid and meaningless**.

**What to do:** add `tien_te` and `ty_gia_ap_dung` columns, freeze **both numbers** in the fact
(local + converted). Then try converting at read time with today's rate and see how much July's revenue
changes. See [several currencies and units of measure](../skills/multi-currency-uom.md) and
[the case study on revenue moving with the exchange rate](../case-studies/doanh-thu-doi-theo-ty-gia.md).

Remember to clean up: `delete from don_hang_chi_tiet where don_hang_id='DH011';`

| Your result |
|---|
| |

## What they share: the column is right, the addition is wrong

| Exercise | The number | Does the column hold a wrong value |
|---|---|---|
| 1 · allocation | 1 dong out from rounding | No |
| 3 · the YTD column | 3.38× inflated | No — every row is correct |
| 4 · avg in an agg | 5.7% out | No — correct at its own grain |
| 6 · adding currencies together | Meaningless | No |

**The one-sentence test before putting any numeric column into a fact:** *"adding this column across any two
rows — is the result meaningful?"*

## Related Topics

- [Header/line and allocating facts](../skills/allocated-facts.md) — exercises 1 and 2
- [Year-to-date and timespan](../skills/ytd-timespan-facts.md) — exercise 3
- [Aggregate fact tables](../skills/aggregate-fact-table.md) — exercise 4
- [Centipede fact tables](../skills/centipede-fact.md) — exercise 5
- [Several currencies and units of measure](../skills/multi-currency-uom.md) — exercise 6
- [Facts and dimensions](../reference/fact-and-dimension.md) — additivity, the basis of the whole lab
