---
title: Snapshots — capturing change history (SCD Type 2)
sidebar_position: 7
description: "dbt snapshot can only record history STARTING from its first run, and dbt_valid_from is the run time rather than the business time — two facts that decide everything else."
tags: [dbt, snapshot, scd2, slowly-changing-dimension, lich-su]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-11
---

# Snapshots — capturing change history (SCD Type 2)

> **Takeaway:** `dbt snapshot` is **a tape recorder, not a time machine**. It can only
> record changes that happen *after* its first run, and the timestamp it writes is **the
> time the snapshot ran**, not when the thing actually changed in the business. Those two
> sentences decide how you must use it.

## Learning goal

Build an SCD2 snapshot, run it twice with the data changing in between, read
`dbt_valid_from`/`dbt_valid_to`, and be able to state exactly which question a snapshot
**cannot** answer.

## Step 1 — Declaring a snapshot (YAML syntax, dbt 1.9+)

Since dbt 1.9, snapshots are declared in a `.yml` file instead of a `{% snapshot %}` block
inside a `.sql`. The old syntax still runs but is deprecated.

```yaml
# snapshots/snap_khach_hang.yml
snapshots:
  - name: snap_khach_hang
    relation: ref('khach_hang')      # or source('erp', 'customers')
    config:
      unique_key: khach_id
      strategy: check
      check_cols: [khu_vuc, hang]
```

Four fields you must understand:

| Field | Meaning | What goes wrong |
|---|---|---|
| `relation` | the table to track | — |
| `unique_key` | the **business** key, not a surrogate key | Duplicate keys → the snapshot generates junk rows |
| `strategy` | `check` or `timestamp` | see Step 5 |
| `check_cols` | which columns, when changed, count as a new version | List a fast-changing column and the table bloats |

## Step 2 — The first run

```bash
dbt snapshot --profiles-dir .
```

```text
02:40:27  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.09s]
02:40:27  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

The snapshot table now has 4 rows — exactly the number of customers in the source, all with
`dbt_valid_to = NULL`.

## Step 3 — Change the data, run a second time

Customer `C1` moves from *Mien Nam* to *Mien Bac* and is upgraded to tier *Vang*:

```bash
dbt seed -s khach_hang --profiles-dir .
dbt snapshot --profiles-dir .
```

```text
02:40:34  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.16s]
02:40:34  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```text
┌──────────┬──────────┬─────────┬────────────────────────────┬────────────────────────────┐
│ khach_id │ khu_vuc  │  hang   │       dbt_valid_from       │        dbt_valid_to        │
├──────────┼──────────┼─────────┼────────────────────────────┼────────────────────────────┤
│ C1       │ Mien Nam │ Bac     │ 2026-09-11 09:40:27.653852 │ 2026-09-11 09:40:34.225211 │
│ C1       │ Mien Bac │ Vang    │ 2026-09-11 09:40:34.225211 │ NULL                       │
└──────────┴──────────┴─────────┴────────────────────────────┴────────────────────────────┘
```

Table total: 5 rows (4 customers, with `C1` having 2 versions).

**Look hard at those two timestamps.** `09:40:27` and `09:40:34` are when I ran the two
`dbt snapshot` commands, 7 seconds apart. The customer did not move region at 9:40 in the
morning — the snapshot doesn't know that and can't know it. All it knows is *"between the two
times I looked, the value was different"*.

## Step 4 — The four `dbt_*` columns and how to join them

| Column | Meaning |
|---|---|
| `dbt_scd_id` | a hash of the key plus the timestamp — the version's **surrogate key** |
| `dbt_updated_at` | the timestamp dbt compares against |
| `dbt_valid_from` | when this version took effect |
| `dbt_valid_to` | when it stopped. `NULL` = **currently in effect** |

An *as-was* join — the value **at the time of the event**:

```sql
select f.don_hang_id, f.ngay_dat, k.khu_vuc
from {{ ref('fct_don_hang') }} f
join {{ ref('snap_khach_hang') }} k
  on  f.khach_id = k.khach_id
  and f.ngay_dat >= k.dbt_valid_from
  and f.ngay_dat <  coalesce(k.dbt_valid_to, timestamp '9999-12-31')
```

An *as-is* join — the **current** value:

```sql
join {{ ref('snap_khach_hang') }} k
  on f.khach_id = k.khach_id and k.dbt_valid_to is null
```

The `coalesce(..., '9999-12-31')` is mandatory: the current row's `dbt_valid_to` is `NULL`,
and `x < NULL` evaluates to `NULL` rather than `true` → you lose every current row. This is
mistake number one when using snapshots.

## Step 5 — `check` or `timestamp`

| | `strategy: check` | `strategy: timestamp` |
|---|---|---|
| How change is detected | compares each column in `check_cols` | compares the source's `updated_at` column |
| What the source must have | nothing | a **trustworthy** `updated_at` |
| Cost | higher (comparing many columns) | cheap |
| Risk | missing a column you forgot to list in `check_cols` | the source forgets to bump `updated_at` → **changes lost silently** |

```yaml
config:
  unique_key: khach_id
  strategy: timestamp
  updated_at: cap_nhat_luc
```

`check_cols: all` exists but is rarely right — it turns every technical column
(`_fivetran_synced`, `etl_batch_id`) into a reason to create a new version, so the table grows
with the number of pipeline runs rather than the number of real changes.

## Step 6 — Two facts to state out loud before anyone trusts a snapshot

**1. Snapshots aren't retroactive.** Run it for the first time today and history starts
today. Everything before that collapses into a single row carrying the current value. There
is no way to recover it — unless the source keeps history somewhere else.

The practical consequence: **turn snapshots on for every important dimension NOW, even if
nobody has asked about history yet.** Turning it on the day somebody asks means you're
already months of data too late.

**2. A snapshot is data that cannot be regenerated.** Everything else in dbt can be rebuilt
from the source: drop the table, `dbt build`, done. A snapshot table can't — it is the only
record of what the source *used to* look like.

| Consequence | What you must do |
|---|---|
| `dbt build --full-refresh` wipes snapshots too | Exclude them: `dbt build --exclude resource_type:snapshot` |
| Snapshots must be in the backup schedule | Treat them as business tables, not derived tables |
| Never let snapshots write into a developer's personal schema | Give them their own schema with restricted write access |
| The run cadence sets the resolution of your history | Running daily means you can never see two changes on the same day |

## Common errors

| Error | Symptom | Fix |
|---|---|---|
| Forgetting `coalesce(dbt_valid_to, ...)` in the join | every current row disappears, as-was returns 0 rows | Add the `coalesce` |
| Believing `dbt_valid_from` is business time | historical reports skew with the job schedule | For business time you must build SCD2 by hand from a source with `updated_at` |
| `unique_key` isn't unique in the source | the snapshot generates junk rows, no error | Test `unique` on the source **before** snapshotting |
| `check_cols: all` | the table grows with every ETL run | List only the business columns |
| `--full-refresh` across the project | **history lost permanently** | `--exclude resource_type:snapshot` |
| Snapshotting a model that already filters | history only covers what passed the filter | Point the snapshot straight at `source()` where possible |
| Running the snapshot after `dbt run` in the same job | models read a snapshot that's one beat stale | `dbt snapshot` **first**, then `dbt run` |

The correct order in a production job:

```bash
dbt source freshness      # if the source is stale, stop early
dbt snapshot              # record history FIRST
dbt build                 # only then build the models that read it
```

## Related Topics

- [SCD — Slowly Changing Dimension](../../../data-modeling/skills/scd.md) — the theory of all eight types
- [Sources, seeds and snapshots](../reference/sources-seeds-snapshots.md)
- [SCD with dbt snapshot](../../../data-modeling/tutorials/scd-bang-dbt-snapshot.md) — the lab, already run
- [Case study — the snapshot recorded the wrong timestamp](../case-studies/snapshot-ghi-nham-moc-thoi-gian.md)
- [Intermediate exercises](../tutorials/bt-02-trung-binh.md) — exercise T5
