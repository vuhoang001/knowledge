---
title: "Dimension lab — dates, roles, NULLs and flags: four ways to lose rows"
sidebar_position: 4
description: "Undelivered orders vanishing from the report, a negative filter swallowing rows, coded flags splitting groups wrongly — reproduce then fix."
tags: [tutorial, date-dimension, role-playing-dimension, null-handling, junk-dimension, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Dimension lab — dates, roles, NULLs and flags: four ways to lose rows

> **Takeaway:** the previous lab made numbers **inflate**. This lab makes them **fall short** — more dangerous, because a
> shortfall is invisible. A vanished row leaves no trace at all on the report.

## Preparation

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

The reconciliation benchmark: **10 orders · 15 lines · 10,215,000**.

What's worth noticing in `don_hang`: two orders are **not yet delivered**.

```text
┌─────────────┬──────────┬────────────┬───────────┬────────────┐
│ don_hang_id │ khach_id │  ngay_dat  │ ngay_giao │ trang_thai │
├─────────────┼──────────┼────────────┼───────────┼────────────┤
│ DH006       │ C4       │ 2026-07-03 │ NULL      │ moi        │
│ DH009       │ C2       │ 2026-07-05 │ NULL      │ moi        │
└─────────────┴──────────┴────────────┴───────────┴────────────┘
```

These two `NULL` rows are the source of the first three exercises.

## Exercise 1 — Joining on the delivery date: losing 17.3% of revenue

A perfectly ordinary business question: *"revenue by delivery month"*.

```sql
select count(*) dong_con_lai, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
where h.ngay_giao is not null;
```

```text
┌──────────────┬───────────┬───────────┬────────────────┬─────────┐
│ dong_con_lai │ dong_that │ doanh_thu │ doanh_thu_that │ hut_pct │
├──────────────┼───────────┼───────────┼────────────────┼─────────┤
│           13 │        15 │   8445000 │       10215000 │   -17.3 │
└──────────────┴───────────┴───────────┴────────────────┴─────────┘
```

Drop the `where` and join `dim_ngay` directly on `ngay_giao` and **the result is identical** — a plain
`JOIN` discards rows with a `NULL` key by itself, with nobody writing a condition.

> Revenue falls **17.3%** short and the report looks perfectly normal: no odd rows, no empty
> cells, no warning.

**What to do:** this is [the case study "half the orders vanished"](../case-studies/don-dang-giao-bien-mat.md).
Fix it with the `-1` row in the [date dimension](../reference/date-dimension.md): add a row
labelled *"Hasn't happened"*, and let the fact **never** hold `NULL` in a key column.

| Your result |
|---|
| |

## Exercise 2 — Build a `dim_ngay` with a `-1` row

```sql
create or replace table dim_ngay as
with lich as (select (date '2026-07-01' + interval (i) day)::date ngay from range(0,62) t(i))
select cast(strftime(ngay,'%Y%m%d') as integer) ngay_key, ngay,
       strftime(ngay,'%d/%m/%Y') ngay_hien_thi,
       ['CN','T2','T3','T4','T5','T6','T7'][dayofweek(ngay)+1] thu_ten,
       dayofweek(ngay) not in (0,6) la_ngay_lam_viec
from lich
union all
select -1, null, 'Chua xay ra', null, null;
```

Then load the fact with `coalesce`, letting no `NULL` into a key:

```sql
coalesce(cast(strftime(h.ngay_giao,'%Y%m%d') as integer), -1) as ngay_giao_key
```

**What to do:** re-run exercise 1 with the new `dim_ngay`. The total must return to **10,215,000**, and
the two undelivered orders appear as a *"Chua xay ra"* group instead of vanishing.

| Your result |
|---|
| |

## Exercise 3 — Three roles for the same `dim_ngay`

`don_hang` has `ngay_dat`, `ngay_giao` and `ngay_nhan` — all pointing at one calendar table.

**Don't** copy `dim_ngay` into three tables. Build three **clearly-named views**:

```sql
create or replace view dim_ngay_dat as
  select ngay_key ngay_dat_key, ngay ngay_dat, thu_ten thu_dat,
         la_ngay_lam_viec dat_ngay_lam_viec from dim_ngay;

create or replace view dim_ngay_giao as
  select ngay_key ngay_giao_key, ngay ngay_giao, thu_ten thu_giao,
         la_ngay_lam_viec giao_ngay_lam_viec from dim_ngay;
```

**Renaming the columns is the most important part**, not a matter of aesthetics: it lets `select *`
avoid name collisions, and a reader of the query sees `thu_giao` and understands immediately.

**What to do:** write the query *"which order weekday most often gets delivered at the weekend"*. If you
have to trace back to see which table `d1` is, you're missing the views. See
[role-playing dimensions](../skills/role-playing-dimension.md).

| Your result |
|---|
| |

## Exercise 4 — A negative filter swallowing the NULL row

`trang_thai` in `don_hang` has no `NULL`, so first **make one**:

```sql
update don_hang set trang_thai = null where don_hang_id = 'DH009';
```

Now run two statements, both meaning *"the orders not yet complete"*:

```sql
select count(*) from don_hang where trang_thai <> 'hoan_thanh';
select count(*) from don_hang where trang_thai is distinct from 'hoan_thanh';
```

**Predict before running:** are the two numbers equal?

<details>
<summary>Why they differ</summary>

`NULL <> 'hoan_thanh'` returns `UNKNOWN`, not `TRUE`. And `WHERE` keeps only `TRUE`
rows — so `DH009` is excluded from **both** groups: it isn't "complete", and it doesn't
land in "not complete" either.

Adding the two groups **doesn't** give the table's total. That's an invariant worth making a test.

</details>

See [NULLs in facts and dimensions](../skills/null-handling.md) and
[the case study on filtering "not cancelled"](../case-studies/loc-khac-huy-mat-mot-phan-tu.md).

Remember to restore: `update don_hang set trang_thai='moi' where don_hang_id='DH009';`

| Your result |
|---|
| |

## Exercise 5 — One status column: leave it inline or split out a dimension?

```text
┌────────────┬────────┐        ┌───────────┬──────────┐
│ trang_thai │ so_don │        │   hang    │ so_khach │
├────────────┼────────┤        ├───────────┼──────────┤
│ hoan_thanh │      6 │        │ Bac       │        2 │
│ dang_giao  │      2 │        │ Kim cuong │        1 │
│ moi        │      2 │        │ Vang      │        1 │
└────────────┴────────┘        └───────────┴──────────┘
```

Three values, no accompanying attributes. Per [junk dimensions](../skills/junk-dimension.md):
**leave it inline in the fact** — creating a 3-row table and joining it in every query pays a fee and buys
nothing.

The threshold flips when the question *"revenue from **valid** orders"* appears. At that point the status
has attributes:

```sql
create or replace table dim_trang_thai as
select * from (values
  ('moi',        true,  false),
  ('dang_giao',  true,  false),
  ('hoan_thanh', true,  true),
  ('huy',        false, false)
) t(trang_thai, la_don_hop_le, la_don_chot);
```

**What to do:** add a fourth status `huy` to one order, then answer *"revenue from
valid orders"* — once with a hardcoded `where trang_thai in (...)`, once with
`where la_don_hop_le`. Which survives a fifth status? See
[the case study on adding an eighth status](../case-studies/them-trang-thai-thu-tam.md).

| Your result |
|---|
| |

## Exercise 6 — Coded flags and hierarchies

`khach_hang.hang` currently holds readable text (`Bac`, `Vang`, `Kim cuong`) — right per
[designing dimension attributes](../skills/dimension-attribute-design.md). Try breaking it:

```sql
create or replace table dim_khach_ma as
select khach_id, ho_ten,
       case hang when 'Bac' then 'B' when 'Vang' then 'V' else 'K' end hang_ma
from khach_hang;
```

Run a report by `hang_ma` and ask yourself: does the reader know what `K` is? And what if the source
types a lower-case `k` somewhere?

**Hierarchies:** `hang_hoa.nhom` has only one level so far. Build a two-level tree with a shallow branch:

```sql
create or replace table danh_muc as
select * from (values
  (1,'Thiet bi',null),(2,'Thiet bi nhap',1),(3,'Man hinh',1),(4,'May tinh',null)
) t(dm_id, ten, cha_id);
```

Attach `SP-C` (a laptop) directly to `May tinh` (level 1), and `SP-A`/`SP-D` to `Thiet bi nhap`
(level 2). Flatten into `cap_1`/`cap_2` then report by `cap_2` — what percentage of revenue
lands in the `NULL` cell? See [hierarchies](../skills/hierarchy.md) and
[the case study on the level-3 report](../case-studies/bao-cao-cap-3-mat-mot-nua.md).

| Your result |
|---|
| |

## What they share: every bug in this lab makes numbers **fall short**

| Exercise | The shortfall | Why nobody sees it |
|---|---|---|
| 1 · a `NULL` key | −17.3% | `JOIN` discards rows without reporting it |
| 4 · a `<>` filter | loses the `NULL` row | Three-valued logic; `WHERE` keeps only `TRUE` |
| 6 · a flattened tree | the shallow branch lands in `NULL` | BI hides the `NULL` group by default |

**The shared invariant for all three:** the total of every group must equal the table's total. Not adding up
means rows are falling outside.

## Related Topics

- [The date dimension](../reference/date-dimension.md) — exercises 1 and 2
- [Role-playing dimensions](../skills/role-playing-dimension.md) — exercise 3
- [NULLs in facts and dimensions](../skills/null-handling.md) — exercise 4
- [Junk dimensions](../skills/junk-dimension.md) — exercise 5
- [Designing dimension attributes](../skills/dimension-attribute-design.md) · [Hierarchies](../skills/hierarchy.md) — exercise 6
- [The foundations lab](lab-nen-tang-grain-fact-dim.md) — four ways to inflate numbers
