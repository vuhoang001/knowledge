---
title: SCD Type 2 with dbt snapshots — and the trap no book mentions
sidebar_position: 2
description: "Build SCD Type 2 with dbt snapshots, then break it yourself: the theoretically correct as-was join returns 0 rows, and why."
tags: [tutorial, scd, dbt, snapshot, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# SCD Type 2 with dbt snapshots — and the trap no book mentions

> **Takeaway:** dbt handles the muscle work of [SCD](../skills/scd.md) Type 2 — the four columns
> `dbt_valid_from` / `dbt_valid_to` / `dbt_scd_id` / `dbt_updated_at` are generated automatically.
> But it **only records history from your first run onwards**. Any fact predating that moment is covered
> by no version at all — and the as-was join returns **nothing** instead of raising an error.

## Preparation

The lab lives **outside the repo** (see `CLAUDE.md`): `~/Documents/learn-lab/dbt`.

```bash
cd ~/Documents/learn-lab/dbt
./.venv/bin/dbt --version      # dbt-core 1.12.0 · dbt-duckdb 1.10.1
```

The four seeds used here — `khach_hang` is the snapshot's source:

```csv
# seeds/khach_hang.csv
khach_id,ho_ten,khu_vuc,hang
C1,Nguyen Van A,Mien Bac,Bac
C2,Tran Thi B,Mien Nam,Vang
C3,Le Van C,Mien Trung,Bac
C4,Pham Thi D,Mien Bac,Kim cuong
```

`don_hang` (10 orders, with `khach_id` and `ngay_dat` in **July**) and
`don_hang_chi_tiet` (15 lines, totalling **10,215,000**) are the facts. Remember that total — every exercise
below reconciles against it.

```bash
./.venv/bin/dbt seed --profiles-dir .
```

## Exercise 1 — Declare the snapshot, and the three decisions that are *a person's*

dbt generates the columns for you. Three things it **can't** decide:

| What you declare | What it means | What goes wrong |
|---|---|---|
| `unique_key` | The entity's natural key | The wrong key → every run creates a new version for every row |
| `check_cols` | **Which** columns are having their history kept | Declaring `'all'` turns Type 2 on even for a column that changes daily |
| `strategy` | `check` (compare columns) or `timestamp` (trust the source's `updated_at`) | `timestamp` while the source lies → [changes lost forever](../skills/scd-change-detection.md) |

```sql
-- snapshots/scd_khach_hang.sql
{% snapshot scd_khach_hang %}
{{ config(
     target_schema='main',
     unique_key='khach_id',
     strategy='check',
     check_cols=['khu_vuc', 'hang'],
     invalidate_hard_deletes=True
) }}
select khach_id, ho_ten, khu_vuc, hang from {{ ref('khach_hang') }}
{% endsnapshot %}
```

Add `snapshot-paths: ['snapshots']` to `dbt_project.yml`, then:

```bash
./.venv/bin/dbt snapshot --profiles-dir .
```

```text
┌──────────┬────────────┬────────────────────────────┬──────────────┐
│ khach_id │  khu_vuc   │       dbt_valid_from       │ dbt_valid_to │
├──────────┼────────────┼────────────────────────────┼──────────────┤
│ C1       │ Mien Bac   │ 2026-08-04 14:56:48.759859 │ NULL         │
│ C2       │ Mien Nam   │ 2026-08-04 14:56:48.759859 │ NULL         │
│ C3       │ Mien Trung │ 2026-08-04 14:56:48.759859 │ NULL         │
│ C4       │ Mien Bac   │ 2026-08-04 14:56:48.759859 │ NULL         │
└──────────┴────────────┴────────────────────────────┴──────────────┘
```

**Look closely at `dbt_valid_from`: that's *when you ran the command*, not when the data happened.**
Remember this — exercise 4 comes back to it.

| Your result |
|---|
| |

## Exercise 2 — Change one value, re-run, watch the version appear

Edit `seeds/khach_hang.csv`, changing `C1` from `Mien Bac` to `Mien Nam`:

```bash
./.venv/bin/dbt seed --profiles-dir . -s khach_hang
./.venv/bin/dbt snapshot --profiles-dir .
```

```text
┌──────────┬────────────┬──────────┬────────────┐
│ khach_id │  khu_vuc   │    tu    │    den     │
├──────────┼────────────┼──────────┼────────────┤
│ C1       │ Mien Bac   │ 14:56:48 │ 14:57:12   │
│ C1       │ Mien Nam   │ 14:57:12 │ (hien tai) │
│ C2       │ Mien Nam   │ 14:56:48 │ (hien tai) │
│ C3       │ Mien Trung │ 14:56:48 │ (hien tai) │
│ C4       │ Mien Bac   │ 14:56:48 │ (hien tai) │
└──────────┴────────────┴──────────┴────────────┘
```

`C1` has **two rows**. The table's grain has just changed from *one customer* to
*[one version of one customer](../reference/grain.md)* — and `unique` on `khach_id`
will FAIL from now on, exactly as it should.

| Your result |
|---|
| |

## Exercise 3 — The wrong join: `dbt_valid_to is null`

This is the one everybody writes instinctively, because it's short and it runs:

```sql
join scd_khach_hang d on d.khach_id = h.khach_id and d.dbt_valid_to is null
```

```text
┌────────────┬───────────┬────────┐
│  khu_vuc   │ doanh_thu │ so_don │
├────────────┼───────────┼────────┤
│ Mien Nam   │   6465000 │      6 │
│ Mien Trung │   2100000 │      2 │
│ Mien Bac   │   1650000 │      2 │
└────────────┴───────────┴────────┘
```

The total is **10,215,000** — matching the source. No row lost, no test red.

But all three of `C1`'s July orders are assigned to **the South**, while in July `C1` was still in
the North. This is precisely [the case study "the North is zero"](../case-studies/fact-den-muon-gan-sai-khu-vuc.md),
reproduced by hand.

**The question:** what did that single `and d.dbt_valid_to is null` clause nullify, out of everything you just
went to the trouble of building in exercises 1–2?

## Exercise 4 — The "correct" join, and it returns **0 rows**

Fix it to match the theory — match the version in effect **at the order date**:

```sql
join scd_khach_hang d on d.khach_id = h.khach_id
 and h.ngay_dat >= d.dbt_valid_from
 and h.ngay_dat <  coalesce(d.dbt_valid_to, timestamp '9999-12-31')
```

```text
┌─────────┬───────────┬────────┐
│ khu_vuc │ doanh_thu │ so_don │
├─────────┼───────────┼────────┤
└─────────┴───────────┴────────┘
             0 rows
```

**Not a single row.** The SQL is right, the model is right, and the result is empty.

Stop and answer for yourself before reading on: *why?*

<details>
<summary>Answer</summary>

The `dbt_valid_from` of **every** first version is `2026-08-04` — when you first ran
`dbt snapshot`. The orders, meanwhile, are in **July**.

Every fact predates that moment, so **no version covers them**.

> dbt snapshot does **not** reconstruct past history. It starts recording from the first run.
> You only have history from the day you remembered to turn it on.

This is the real reason to run `dbt snapshot` **from a project's first day**, even when
nobody has asked an as-was question yet — every day of delay is a day of history lost forever, with no way
to get it back.

</details>

| Your result |
|---|
| |

## Exercise 5 — The fix: the first version takes effect from the infinite past

The standard treatment when you turn snapshots on late — treat each entity's **earliest** record as having
been true from before the warehouse existed:

```sql
with d as (
  select *,
         dbt_valid_from = min(dbt_valid_from) over (partition by khach_id) as la_ban_dau
  from scd_khach_hang
)
...
join d on d.khach_id = h.khach_id
 and h.ngay_dat >= case when d.la_ban_dau then timestamp '1900-01-01' else d.dbt_valid_from end
 and h.ngay_dat <  coalesce(d.dbt_valid_to, timestamp '9999-12-31')
```

```text
┌────────────┬───────────┬────────┐
│  khu_vuc   │ doanh_thu │ so_don │
├────────────┼───────────┼────────┤
│ Mien Bac   │   4395000 │      5 │
│ Mien Nam   │   3720000 │      3 │
│ Mien Trung │   2100000 │      2 │
└────────────┴───────────┴────────┘
```

The mandatory check — the total and the row count must match the source:

```text
┌──────────┬─────────┐
│   tong   │ so_dong │
├──────────┼─────────┤
│ 10215000 │      15 │
└──────────┴─────────┘
```

### Three numbers worth remembering

| | Exercise 3 (wrong) | Exercise 5 (right) | The gap |
|---|---|---|---|
| The North | 1,650,000 | **4,395,000** | **62%** short |
| The South | 6,465,000 | 3,720,000 | 74% inflated |
| The total | 10,215,000 | 10,215,000 | **matching in both** |

The last row is the lesson: **a matching total proves nothing.** The revenue is merely *assigned to the wrong
dimension member*, not lost — so every total-reconciliation test is green.

| Your result |
|---|
| |

## Exercise 6 — `check_cols` and the `'all'` trap

Change `check_cols=['khu_vuc', 'hang']` to `check_cols='all'`, then edit one customer's
`ho_ten` (add diacritics, fix a spelling) and re-run the snapshot.

**Predict before running:** does a new version get created? Should it?

Compare against [SCD](../skills/scd.md#when-to-use-which): fixing a spelling in a name is **Type 1**
— nobody splits a report by name. Declaring `'all'` forces that column to keep history too, and the
dimension bloats at the pace of its fastest-changing column. See
[a dimension 365× bloated](../case-studies/dimension-phinh-365-lan.md).

| Your result |
|---|
| |

## Exercise 7 — What about a delete at the source?

`invalidate_hard_deletes=True` was turned on in exercise 1. Delete the `C4` row from the seed, re-run the
snapshot, then check:

```sql
select khach_id, khu_vuc, dbt_valid_to from scd_khach_hang where khach_id = 'C4';
```

**The question:** is that row **deleted** or **closed off**? And why does that choice matter to the
facts pointing at it?

| Your result |
|---|
| |

## Self-check before moving on

Four checks worth running after **every** model rebuild:

```sql
-- 1. The snapshot's grain: one version of one customer
select count(*) = count(distinct (khach_id, dbt_valid_from)) as grain_dung from scd_khach_hang;

-- 2. No overlapping validity intervals
with x as (select khach_id, dbt_valid_to,
                  lead(dbt_valid_from) over (partition by khach_id order by dbt_valid_from) ke
           from scd_khach_hang)
select count(*) as so_khoang_chong_lan from x where ke is not null and ke <> dbt_valid_to;

-- 3. The fact total matching the source (10,215,000)
-- 4. No fact row lost after the join (15 rows)
```

Three and four are the two most important, and they **don't** detect the bug in exercise 3 —
which is why you also need a separate *as-was* check: `C1`'s July revenue must
sit in the North.

## Related Topics

- [SCD](../skills/scd.md) — Types 0–7 and the decision tree per column
- [Change detection for SCD 2](../skills/scd-change-detection.md) — how to choose `strategy`, and hashing's four traps
- [Late-arriving data](../skills/late-arriving.md) — why `la_hien_tai` breaks as-was
- [Grain](../reference/grain.md) — a snapshot changes the dimension's grain
- [CS: the North is zero](../case-studies/fact-den-muon-gan-sai-khu-vuc.md) — exercise 3 is that case
- [CS: a dimension 365× bloated](../case-studies/dimension-phinh-365-lan.md) — exercise 6 is that case
- [The plain-SQL star schema lab](star-schema-duckdb.md) — the same model, without dbt
