---
title: "Operations lab — when the numbers are wrong, how long until you know which row is wrong"
sidebar_position: 7
description: "A duplicate load inflating 25%; with no audit dimension, deleting by date loses 5 good rows out of 10; hot partitions and multi-entity-type tables."
tags: [tutorial, audit-dimension, real-time, heterogeneous-schema, data-quality, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Operations lab — when the numbers are wrong, how long until you know which row is wrong

> **Takeaway:** the five earlier labs ask *"is the model right"*. This lab asks a different question: **the data
> will be wrong — when it is, how long does it take you to know which row is wrong and to delete exactly that much?**

## Exercise 1 — A duplicate load: 25% inflated

Simulating the real case exactly: the nightly job failed mid-way, the on-call person re-ran it by hand but took the wrong batch.

```sql
create or replace table fct_audit as select *, 1 as audit_sk from don_hang_chi_tiet;
insert into fct_audit select *, 3 from don_hang_chi_tiet where don_hang_id in ('DH001','DH003');
```

```text
┌────────────────┬───────────┬───────────┬────────────────┬───────────┐
│ dong_trong_kho │ dong_that │ doanh_thu │ doanh_thu_that │ phong_pct │
├────────────────┼───────────┼───────────┼────────────────┼───────────┤
│             20 │        15 │  12765000 │       10215000 │      25.0 │
└────────────────┴───────────┴───────────┴────────────────┴───────────┘
```

Diagnosis is usually quick — somebody remembers re-running it by hand. **The expensive part is the next
question: what do you delete?**

## Exercise 2 — Without `audit_sk`: delete 10 rows to kill 5

If the fact carries no trace of the run, the only remaining information is **which order**.
So the only way to delete is by range:

```sql
select count(*) dong_bi_xoa,
       count(*) filter (where audit_sk = 3)  thuc_su_la_rac,
       count(*) filter (where audit_sk <> 3) xoa_nham_dong_tot
from fct_audit where don_hang_id in ('DH001','DH003');
```

```text
┌─────────────┬────────────────┬───────────────────┐
│ dong_bi_xoa │ thuc_su_la_rac │ xoa_nham_dong_tot │
├─────────────┼────────────────┼───────────────────┤
│          10 │              5 │                 5 │
└─────────────┴────────────────┴───────────────────┘
```

**Half the deleted rows are good rows.** Then you have to reload what was wrongly deleted, and meanwhile
the reports fall short. A small incident becomes half a day.

**Note:** `unique` on the key **does** go red in this case — but it only says *"there are duplicates"*,
not **which row is the surplus**. With two rows identical in every column, no information
in the table distinguishes them. This is **not a missing-test bug but a missing-metadata
bug**.

| Your result |
|---|
| |

## Exercise 3 — With `audit_sk`: one statement, exactly 5 rows

```sql
select audit_sk, count(*) dong, sum(so_luong*don_gia) doanh_thu
from fct_audit group by 1 order by 1;
```

```text
┌──────────┬───────┬───────────┐
│ audit_sk │ dong  │ doanh_thu │
├──────────┼───────┼───────────┤
│        1 │    15 │  10215000 │
│        3 │     5 │   2550000 │
└──────────┴───────┴───────────┘
```

```sql
delete from fct_audit where audit_sk = 3;   -- exactly 5 rows, and no others
```

**What to do:** build `dim_audit(audit_sk, ma_lan_chay, thoi_diem_chay, file_nguon,
so_dong_nguon)`, then write a query that **automatically detects** a batch loaded twice:

```sql
select file_nguon, count(*) so_lan_nap from dim_audit group by 1 having count(*) > 1;
```

This can run **immediately after the load**, before anybody has a chance to look at a dashboard. See
[audit dimensions](../skills/audit-dimension.md) and
[the case study on a file loaded twice](../case-studies/nap-hai-lan-khong-truy-duoc.md).

| Your result |
|---|
| |

## Exercise 4 — The closed-loop equality: loaded + rejected = source

Build `fct_loi` for the rejected rows, with `chieu_chat_luong` following
[the six dimensions of quality](../../data-quality/six-dimensions.md):

```sql
create or replace table fct_loi as
select * from (values
  (1,'DH-X1','khach_id rong','completeness'),
  (2,'DH-X2','so_tien am','validity')
) t(audit_sk, ma_dong, ly_do, chieu_chat_luong);
```

Then check the strongest invariant in the whole pipeline:

```sql
select (select count(*) from fct_audit) da_nap,
       (select count(*) from fct_loi)   bi_loai,
       (select count(*) from fct_audit) + (select count(*) from fct_loi) cong_lai;
```

It **cannot hold by accident**. Writing `WHERE cot IS NOT NULL` and moving on means the rejected data
**evaporates without a trace** — nobody knows how much was lost, or whether the rate is rising.

| Your result |
|---|
| |

## Exercise 5 — Hot partitions: the metric jumps all day

Add "today, not yet closed" data:

```sql
create or replace table fct_hom_nay as
select 'DH999' don_hang_id, current_date ngay, 500000 doanh_thu, false da_chot;
```

Then compute "average revenue per day" across both history and today.

**What to do:** run that query and record the result. Add one more row for today and run it again.
The number changes — even though no historical day changed.

The cause: the denominator `count(distinct ngay)` counts today as **a whole day** while
it's only partly full. The fix: carry the `da_chot` column all the way to the reporting layer, and compute
the stable metric on closed days only.

See [real-time fact tables](../skills/real-time-fact.md) and
[the case study on today's number jumping all day](../case-studies/so-hom-nay-nhay-suot-ngay.md).

| Your result |
|---|
| |

## Exercise 6 — A table merging several entity types

`hang_hoa` currently holds only physical goods. Add a **service** — it has no weight, while
physical goods have no term:

```sql
create or replace table san_pham_gop as
select * from (values
  ('SP-A','Ban phim co','Hang hoa',   0.9,  null),
  ('SP-C','Laptop',     'Hang hoa',   1.8,  null),
  ('DV-1','Bao hanh 12t','Dich vu',   null, 12),
  ('DV-2','Cai dat tai nha','Dich vu',null, 1)
) t(ma, ten, loai, trong_luong_kg, thoi_han_thang);
```

**What to do:** measure the empty-cell ratio. Then split out a supertype (`ma`, `ten`, `loai` — which every type
has) and subtypes (one table per type, with its own attributes). After splitting, which constraint
becomes declarable that wasn't before?

<details>
<summary>Answer</summary>

`NOT NULL` on `trong_luong_kg` in the goods table, and on `thoi_han_thang` in the
services table. On the merged table **no column** can take it, because `NULL` is legitimate in most columns —
losing the cheapest layer of checking in the warehouse.

</details>

See [heterogeneous entities](../skills/heterogeneous-schema.md) and
[the case study on dim_san_pham being 67% empty](../case-studies/bang-san-pham-hai-phan-ba-o-trong.md).

| Your result |
|---|
| |

## Three layers of protection — this lab is the third

| Layer | Tooling | Answers |
|---|---|---|
| Blocking | `contract`, `not_null`, `unique` | Can wrong data get in |
| Detecting | `dbt test` | After loading, is there an anomaly |
| **Tracing** | **audit dimension + error schema** | **Which row, from which run, and why was it rejected** |

The first two layers answer yes/no questions. The third decides whether an incident costs **ten minutes or half a day**.

## Related Topics

- [Audit dimensions and error event schemas](../skills/audit-dimension.md) — exercises 1–4
- [Real-time fact tables](../skills/real-time-fact.md) — exercise 5
- [Heterogeneous entities](../skills/heterogeneous-schema.md) — exercise 6
- [Six dimensions of data quality](../../data-quality/six-dimensions.md) — the labels for `fct_loi`
- [Implementing tests in dbt](../../etl/dbt/skills/implementing-tests.md) — the first two layers
