---
title: "Fintech — the snapshot recorded run time, and the as-was report was off by 25%"
sidebar_position: 3
description: "dbt snapshot configured right, run right, joined with the right syntax — and the historical report was still wrong, because dbt_valid_from is the job's clock, not the business clock."
tags: [dbt, snapshot, scd2, case-study, as-was, fintech, lich-su]
domain: data-engineering
category: pattern
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-09-11
---

# Fintech — the snapshot recorded run time

> **Takeaway:** `dbt snapshot` writes `dbt_valid_from` from **the moment the snapshot ran**,
> not from the moment the business event happened. When the question is *"which region was
> this customer in when they placed the order"*, the snapshot answers wrong — or answers with
> nothing — and there is no join syntax to fix.

> **On authenticity.** The business context is a reconstruction. **The snapshot output and both
> as-was/as-is revenue tables are real numbers**, produced on the lab at
> `~/Documents/learn-lab/dbt` (dbt-core 1.12.0 + dbt-duckdb 1.10.1). `verified_at` is empty
> because the repo owner hasn't re-run it.

## Context

A fintech company segments customers by **region** and **membership tier**. Both change over
time: customers move house, customers get upgraded.

The revenue-by-region report was used by two departments with two different meanings — and
nobody had written that difference down:

| Department | Their actual question | Needs |
|---|---|---|
| Sales | "which region is selling?" | **as-was** — the customer's region *on the transaction date* |
| Marketing | "which region do we send the promo to?" | **as-is** — the *current* region |

The data team turned on `dbt snapshot` for the customer table, assuming that covered the
as-was side.

## Symptoms

Once built, the as-was report returned **0 rows**. No error, no warning — just an empty table.

## The wrong first hypotheses

**Hypothesis 1: the join is missing a `coalesce`.** This is the number-one snapshot mistake —
the current row's `dbt_valid_to` is `NULL`, and `x < NULL` evaluates to `NULL` rather than
`true`, so every current row disappears.

```sql
-- thiếu coalesce: mất dòng hiện hành
and f.ngay_dat < k.dbt_valid_to
```

Adding the `coalesce`:

```sql
and f.ngay_dat < coalesce(k.dbt_valid_to, timestamp '9999-12-31')
```

Still **0 rows**. The hypothesis is technically correct but wasn't the cause here.

**Hypothesis 2: the snapshot never ran.** Checked: the table has data, with 2 versions for the
customer who changed region. Ruled out.

**Hypothesis 3: a type mismatch comparing `date` against `timestamp`.** Both sides were cast
explicitly. Still 0 rows. Ruled out.

The turning point came when somebody simply printed the two timestamp columns and looked at
them.

## Reproducing it

```yaml
# snapshots/snap_khach_hang.yml
snapshots:
  - name: snap_khach_hang
    relation: ref('khach_hang')
    config:
      unique_key: khach_id
      strategy: check
      check_cols: [khu_vuc, hang]
```

Run once, change the data (`C1`: *Mien Nam → Mien Bac*, tier *Bac → Vang*), run a second time:

```text
02:40:27  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.09s]
02:40:34  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.16s]
```

```text
┌──────────┬──────────┬─────────┬────────────────────────────┬────────────────────────────┐
│ khach_id │ khu_vuc  │  hang   │       dbt_valid_from       │        dbt_valid_to        │
├──────────┼──────────┼─────────┼────────────────────────────┼────────────────────────────┤
│ C1       │ Mien Nam │ Bac     │ 2026-09-11 09:40:27.653852 │ 2026-09-11 09:40:34.225211 │
│ C1       │ Mien Bac │ Vang    │ 2026-09-11 09:40:34.225211 │ NULL                       │
└──────────┴──────────┴─────────┴────────────────────────────┴────────────────────────────┘
```

**There's the cause, staring straight back.** `09:40:27` and `09:40:34` are **7 seconds**
apart — exactly the gap between the two commands I typed. The customer did not change region
at 9:40 in the morning on 2026-09-11.

Every order in the system is from **July**. The snapshot's validity ranges start in
**September**. No order falls inside any range → the join returns 0 rows.

## Root cause

`dbt snapshot` is **a tape recorder, not a time machine**. All it knows is *"between the two
times I looked, the value was different"*. Two consequences:

1. **Not retroactive.** History starts the day you turn it on. Everything before that collapses
   into one row carrying the current value.
2. **Resolution equals run cadence.** Run it daily and two changes on the same day record as
   one.

## The fix — build SCD2 from business timestamps

The source here **already keeps history**: `khach_hang_lich_su` holds daily snapshots with a
`ngay_trich` column — a real business timestamp. Collapse the daily snapshots into validity
ranges:

```sql
-- models/marts/dim_khach_hang_scd2.sql
with anh_chup as (
    select khach_id, ngay_trich, khu_vuc,
           lag(khu_vuc) over (partition by khach_id order by ngay_trich) as khu_vuc_truoc
    from {{ ref('khach_hang_lich_su') }}
),
moc_doi as (
    select * from anh_chup
    where khu_vuc_truoc is null or khu_vuc_truoc <> khu_vuc
)
select
    khach_id,
    khu_vuc,
    ngay_trich as valid_from,
    lead(ngay_trich) over (partition by khach_id order by ngay_trich) as valid_to
from moc_doi
```

```text
┌──────────┬────────────┬────────────┬────────────┐
│ khach_id │  khu_vuc   │ valid_from │  valid_to  │
├──────────┼────────────┼────────────┼────────────┤
│ C1       │ Mien Bac   │ 2026-07-01 │ 2026-07-03 │
│ C1       │ Mien Nam   │ 2026-07-03 │ NULL       │
│ C2       │ Mien Nam   │ 2026-07-01 │ NULL       │
│ C3       │ Mien Trung │ 2026-07-01 │ NULL       │
│ C4       │ Mien Bac   │ 2026-07-01 │ NULL       │
└──────────┴────────────┴────────────┴────────────┘
```

The boundaries are now **2026-07-01 and 2026-07-03** — real business dates, in the same period
as the orders.

```sql
-- as-was
select d.khu_vuc, sum(ct.thanh_tien) as doanh_thu
from {{ ref('stg_don_hang') }} o
join {{ ref('stg_don_hang_chi_tiet') }} ct using (don_hang_id)
join {{ ref('dim_khach_hang_scd2') }} d
  on  d.khach_id = o.khach_id
  and o.ngay_dat >= d.valid_from
  and o.ngay_dat <  coalesce(d.valid_to, date '9999-12-31')
group by 1 order by 1
```

## Result — and the number that started the argument

```text
-- AS-WAS                          -- AS-IS
┌────────────┬───────────┐         ┌────────────┬───────────┐
│  khu_vuc   │ doanh_thu │         │  khu_vuc   │ doanh_thu │
├────────────┼───────────┤         ├────────────┼───────────┤
│ Mien Bac   │   4200000 │         │ Mien Bac   │   1650000 │
│ Mien Nam   │   3915000 │         │ Mien Nam   │   6465000 │
│ Mien Trung │   2100000 │         │ Mien Trung │   2100000 │
└────────────┴───────────┘         └────────────┴───────────┘
```

| | Mien Bac | Mien Nam | Mien Trung | Total |
|---|---|---|---|---|
| as-was | 4,200,000 | 3,915,000 | 2,100,000 | 10,215,000 |
| as-is | 1,650,000 | 6,465,000 | 2,100,000 | 10,215,000 |
| **Difference** | **−2,550,000** | **+2,550,000** | 0 | 0 |

**2,550,000 out of 10,215,000 — 25%.** From **one** customer moving **once**. The total is
unchanged: no money disappeared, it's sitting in a different region.

On real data with thousands of customers, this is exactly the kind of discrepancy that keeps
two departments in meetings for three sessions with nobody being wrong.

## Lessons

1. **`dbt_valid_from` is the job's clock.** Say this out loud before anyone builds a historical
   report on top of a snapshot.
2. **If the source already keeps history, build SCD2 by hand.** `dbt snapshot` is the option
   for when the source keeps **nothing** — it is not the default answer to every history
   requirement.
3. **Turn snapshots on for every important dimension NOW.** They aren't retroactive; the day
   someone asks, you're already months of data too late.
4. **as-was versus as-is is a business decision, not a technical one.** Both are right for their
   own question. The data team's job is to **write down in the `description`** which question a
   model answers — and ideally to build both, under different names.
5. **`coalesce(valid_to, '9999-12-31')` is mandatory**, even though it wasn't the cause here.
   `x < NULL` yields `NULL`, not `true`.
6. **A snapshot table can't be regenerated.** It has to be in the backup schedule, and
   `dbt build --full-refresh` must carry `--exclude resource_type:snapshot`.

## Related Topics

- [Snapshots — capturing change history](../skills/snapshot-scd2.md) — how to do it right
- [SCD — Slowly Changing Dimension](../../../data-modeling/skills/scd.md) — as-was and as-is
- [SCD with dbt snapshot](../../../data-modeling/tutorials/scd-bang-dbt-snapshot.md) — the lab, already run
- [Advanced exercises](../tutorials/bt-03-nang-cao.md) — exercise N2 reconstructs this whole case
