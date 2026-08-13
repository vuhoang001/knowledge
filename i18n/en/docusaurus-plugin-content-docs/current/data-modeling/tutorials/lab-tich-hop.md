---
title: "Integration lab — joinable, but is it comparable"
sidebar_position: 6
description: "Two revenue definitions differing by 3.9%; a correct drill-across for return rate by region; the bus matrix as a table you can measure."
tags: [tutorial, conformed-dimension, conformed-facts, bus-matrix, drill-across, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Integration lab — joinable, but is it comparable

> **Takeaway:** conformed dimensions make two facts **joinable**. Conformed facts decide whether the two
> numbers you join are **comparable**. Miss the first half and you know you're stuck; miss the second
> half and you have a number and you believe it.

## Preparation

You need `scd_khach_hang` from [the SCD lab](scd-bang-dbt-snapshot.md). The benchmark: **10,215,000**.

## Exercise 1 — Two definitions of "revenue", differing by 3.9%

The sales team counts the goods amount. The finance team counts what the customer paid in total (including shipping).

```sql
with ban as (select don_hang_id, sum(so_luong*don_gia) tien_hang from don_hang_chi_tiet group by 1)
select sum(b.tien_hang) doanh_thu_thuan,
       sum(b.tien_hang + h.phi_ship) tong_tien_khach_tra
from ban b join don_hang h using (don_hang_id);
```

```text
┌─────────────────┬─────────────────────┬────────┬──────────┐
│ doanh_thu_thuan │ tong_tien_khach_tra │ chenh  │ lech_pct │
├─────────────────┼─────────────────────┼────────┼──────────┤
│        10215000 │            10615000 │ 400000 │      3.9 │
└─────────────────┴─────────────────────┴────────┴──────────┘
```

Both are **correct in their own context**. The problem isn't that two definitions coexist
— every business has several notions of revenue. The problem is that when they **share the name
`doanh_thu`**, nobody thinks to check.

**What to do:** give them two different names, keep `phi_ship` as its own column, then write a
closed-loop reconciliation query:

```sql
-- actual gap - explainable gap = 0
select sum(tong_tien_khach_tra) - sum(doanh_thu_thuan) - sum(phi_ship) as con_lai from ...;
```

The last column being 0 is a test worth setting up: it **cannot be 0 by accident**. See
[conformed facts](../skills/conformed-facts.md) and
[the case study on two departments, two revenue numbers](../case-studies/hai-phong-hai-doanh-thu.md).

| Your result |
|---|
| |

## Exercise 2 — Drill-across: return rate by region

A question crossing two facts (`don_hang_chi_tiet` and `tra_hang`) through a shared dimension
(`scd_khach_hang`). Three passes, in this order:

```sql
with d as (select *, dbt_valid_from = min(dbt_valid_from) over (partition by khach_id) la_ban_dau
           from scd_khach_hang),
kv as (select h.don_hang_id, d.khu_vuc from don_hang h join d on d.khach_id = h.khach_id
       and h.ngay_dat >= case when d.la_ban_dau then timestamp '1900-01-01' else d.dbt_valid_from end
       and h.ngay_dat <  coalesce(d.dbt_valid_to, timestamp '9999-12-31')),
ban as (select kv.khu_vuc, sum(ct.so_luong*ct.don_gia) dt        -- pass 1
        from don_hang_chi_tiet ct join kv using (don_hang_id) group by 1),
tra as (select kv.khu_vuc, sum(t.gia_tri_tra) tra                -- pass 2
        from tra_hang t join kv using (don_hang_id) group by 1)
select coalesce(ban.khu_vuc, tra.khu_vuc) khu_vuc,               -- pass 3
       coalesce(ban.dt,0) doanh_thu, coalesce(tra.tra,0) gia_tri_tra,
       round(100.0*coalesce(tra.tra,0)/nullif(ban.dt,0),1) ty_le_tra_pct
from ban full join tra on ban.khu_vuc = tra.khu_vuc order by 2 desc;
```

```text
┌────────────┬───────────┬─────────────┬───────────────┐
│  khu_vuc   │ doanh_thu │ gia_tri_tra │ ty_le_tra_pct │
├────────────┼───────────┼─────────────┼───────────────┤
│ Mien Bac   │   4395000 │      600000 │          13.7 │
│ Mien Nam   │   3720000 │      900000 │          24.2 │
│ Mien Trung │   2100000 │           0 │           0.0 │
└────────────┴───────────┴─────────────┴───────────────┘
```

Revenue adds up to **10,215,000**, matching the source. And the business answer appears: the South has a
return rate **nearly double** the North's.

**Three things easy to get wrong in pass 3:**

| The mistake | The consequence |
|---|---|
| `INNER JOIN` instead of `FULL JOIN` | Mien Trung (with no returns) **vanishes** |
| Forgetting `coalesce(...,0)` | The missing group becomes `NULL` and can't be summed |
| Forgetting `nullif` in the denominator | Division by 0 if some region has returns only |

**What to do:** try all three mistakes and see how the result changes. See
[conformed dimensions](../skills/conformed-dimension.md#this-technique-has-a-name-multipass-sql).

| Your result |
|---|
| |

## Exercise 3 — The bus matrix as a table, not a slide

```sql
create or replace table bus_matrix as
select * from (values
  ('Ban hang','Ngay',true), ('Ban hang','Khach hang',true),
  ('Ban hang','Hang hoa',true), ('Ban hang','Don hang',true),
  ('Tra hang','Ngay',true), ('Tra hang','Khach hang',true),
  ('Tra hang','Hang hoa',false), ('Tra hang','Don hang',true),
  ('Giao hang','Ngay',true), ('Giao hang','Khach hang',true),
  ('Giao hang','Hang hoa',false), ('Giao hang','Don hang',true)
) t(quy_trinh, dimension, co_dung);
```

Three questions this table answers immediately:

```sql
-- 1. Which dimension must conform FIRST?
select dimension, count(*) filter (where co_dung) so_quy_trinh
from bus_matrix group by 1 order by 2 desc;

-- 2. The warehouse's conformed coverage
select count(*) filter (where co_dung) o_can_conform, count(*) o_toi_da,
       round(100.0*count(*) filter (where co_dung)/count(*),1) mat_do_pct from bus_matrix;

-- 3. Which question is IMPOSSIBLE? -> the false cells
select quy_trinh, dimension from bus_matrix where not co_dung;
```

A `false` cell is **not a to-do item** — it tells you which question is impossible by nature
(a return isn't tied to any particular item in this data).

**What to do:** add a fourth process (`Nhap kho`) to the matrix and recompute the density. Does it
rise or fall? What does that mean? See [bus architecture](../reference/bus-architecture.md).

| Your result |
|---|
| |

## Exercise 4 — Break a conformed dimension, then fix it yourself

Build two customer dimensions "belonging to two teams", each splitting regions differently:

```sql
create or replace table dim_khach_ban_hang as
  select khach_id, khu_vuc from khach_hang;                    -- Mien Bac/Nam/Trung

create or replace table dim_khach_cskh as
  select khach_id,
         case when khu_vuc='Mien Bac' then 'HN' else 'Khac' end kv_cskh
  from khach_hang;                                             -- HN/Khac
```

**What to do:** try answering *"which region has the highest return rate"* when each fact uses
a different dimension. You'll find it isn't **hard — it's impossible**: the two sides don't speak
the same language about "region".

The three conditions for being conformed — check each one:

| Condition | Checked by |
|---|---|
| The same surrogate key | Both facts pointing at **the same table** |
| The same value set | `SELECT DISTINCT` on both sides, `EXCEPT` both ways = 0 rows |
| The same business definition | **Asking a person** — SQL can't check it |

See [the case study on two marts that can't be joined](../case-studies/hai-mart-khong-ghep-duoc.md)
and [five marts that can't be joined](../case-studies/moi-mart-mot-dim-khach.md).

| Your result |
|---|
| |

## Related Topics

- [Conformed dimensions](../skills/conformed-dimension.md) — exercises 2 and 4
- [Conformed facts](../skills/conformed-facts.md) — exercise 1
- [Bus architecture, the bus matrix and the value chain](../reference/bus-architecture.md) — exercise 3
- [The SCD lab](scd-bang-dbt-snapshot.md) — builds the `scd_khach_hang` used in exercise 2
