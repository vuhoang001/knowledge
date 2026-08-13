---
title: One file loaded twice, deleting 10 rows to kill 5 junk ones
sidebar_position: 14
description: "The fact carries no trace of the ETL run, so the only way to delete is by date range — and half the deleted rows are good ones."
tags: [case-study, audit-dimension, data-quality, lineage, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# One file loaded twice, deleting 10 rows to kill 5 junk ones

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** the data will be wrong. What decides whether an incident takes ten minutes or half a day is **whether the fact
> carries a trace of the run that produced it** — see
> [audit dimensions](../skills/audit-dimension.md).

## Context

The nightly load job runs at 02:00 every day, one file per run. On 2 March the job failed mid-way and the
on-call person re-ran it by hand at 09:15 — but re-ran **the previous day's file** because they mistyped the name.

The fact has `ngay`, `doanh_thu`, and nothing else. No column tells you which run a row came
from.

```sql
CREATE TABLE fct_ban AS
  SELECT 'B' || i AS ma_ban, (DATE '2026-01-01' + INTERVAL (i-1) DAY)::DATE AS ngay,
         100 AS doanh_thu, 1 AS audit_sk FROM range(1, 11) t(i)
  UNION ALL
  SELECT 'B' || i, (DATE '2026-01-01' + INTERVAL (i-1) DAY)::DATE, 100, 2 FROM range(11, 21) t(i)
  UNION ALL
  SELECT 'B' || i, (DATE '2026-01-01' + INTERVAL (i-1) DAY)::DATE, 100, 3 FROM range(6, 11) t(i);
```

*(The `audit_sk` column here exists only so this document can verify things — in the real scene it **doesn't
exist**, and that's precisely the problem.)*

## Symptoms

```sql
SELECT count(*) AS dong_trong_kho, sum(doanh_thu) AS doanh_thu_kho,
       20 AS dong_that, 2000 AS doanh_thu_that,
       round(100.0 * (sum(doanh_thu) - 2000) / 2000, 1) AS phong_pct
FROM fct_ban;
```

```text
┌────────────────┬───────────────┬───────────┬────────────────┬───────────┐
│ dong_trong_kho │ doanh_thu_kho │ dong_that │ doanh_thu_that │ phong_pct │
├────────────────┼───────────────┼───────────┼────────────────┼───────────┤
│             25 │          2500 │        20 │           2000 │      25.0 │
└────────────────┴───────────────┴───────────┴────────────────┴───────────┘
```

Revenue **25% inflated**. The cause is guessed fairly quickly — somebody remembers re-running it by
hand that day.

The expensive part isn't the diagnosis but the next question: **what do you delete?**

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| The source emitted duplicates | Reconciling against the original files: 10 rows each, clean |
| An order was recorded twice from the start | The `ma_ban` values in the file don't repeat |
| The nightly job ran twice | The scheduler's log: exactly once |
| Somebody re-ran it by hand | **Correct** — but re-ran *what*, and *which rows* got in? |

The first three hypotheses take about an hour. The correct one **solves nothing**:
knowing it was a manual re-run still doesn't tell you which rows in the warehouse came from that run.

## The real cause

`ma_ban` is **not** unique system-wide — it's only unique within a file. So
`DELETE ... WHERE ma_ban IN (...)` would delete both the original and the duplicate.

No column distinguishes the two loads. The only remaining information in the fact is the **transaction
date**, so the only way to delete is by date range:

```sql
SELECT count(*) AS dong_bi_xoa,
       count(*) FILTER (WHERE audit_sk = 3)  AS thuc_su_la_rac,
       count(*) FILTER (WHERE audit_sk <> 3) AS xoa_nham_dong_tot
FROM fct_ban WHERE ngay BETWEEN DATE '2026-01-06' AND DATE '2026-01-10';
```

```text
┌─────────────┬────────────────┬───────────────────┐
│ dong_bi_xoa │ thuc_su_la_rac │ xoa_nham_dong_tot │
├─────────────┼────────────────┼───────────────────┤
│          10 │              5 │                 5 │
└─────────────┴────────────────┴───────────────────┘
```

**Deleting 10 rows to kill 5 junk ones — half are good rows.** Then you have to reload what was wrongly
deleted, and during that window the reports fall short. A small incident becomes half a day.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on every column | ✅ green |
| `unique` on `ma_ban` | ❌ red — **but it only reports "there are duplicates"** |
| `relationships` to the dimension | ✅ green |
| `doanh_thu > 0` | ✅ green |
| Row count matching the total rows across the source files | ❌ — **nobody writes this test** |

The `unique` test **does** go red. It can say *"there are duplicates"* and can't say *"which row is the
surplus"*. With two rows identical in every column, no information in the table
distinguishes them.

That's the crux: this **isn't a missing-test bug** but a **missing-metadata** bug. A test
can only detect what's present in the data.

## The fix

### Fix 1 — an audit dimension

Each ETL run produces one row; each fact row carries a key pointing back at the run that created it.

```sql
CREATE TABLE dim_audit AS
SELECT * FROM (VALUES
  (1, 'run-2026-03-01-01', TIMESTAMP '2026-03-01 02:00:00', 'file_A.csv', 'v1.4.2', 10, 'ok'),
  (2, 'run-2026-03-02-01', TIMESTAMP '2026-03-02 02:00:00', 'file_B.csv', 'v1.4.2', 10, 'ok'),
  (3, 'run-2026-03-02-02', TIMESTAMP '2026-03-02 09:15:00', 'file_A.csv', 'v1.4.2', 10, 'chay lai tay')
) t(audit_sk, ma_lan_chay, thoi_diem_chay, file_nguon, phien_ban_code, so_dong_nguon, ghi_chu);

SELECT a.audit_sk, a.ma_lan_chay, a.file_nguon, a.ghi_chu,
       count(*) AS dong_nap, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_audit a USING (audit_sk)
GROUP BY 1,2,3,4 ORDER BY 1;
```

```text
┌──────────┬───────────────────┬────────────┬──────────────┬──────────┬───────────┐
│ audit_sk │    ma_lan_chay    │ file_nguon │   ghi_chu    │ dong_nap │ doanh_thu │
├──────────┼───────────────────┼────────────┼──────────────┼──────────┼───────────┤
│        1 │ run-2026-03-01-01 │ file_A.csv │ ok           │       10 │      1000 │
│        2 │ run-2026-03-02-01 │ file_B.csv │ ok           │       10 │      1000 │
│        3 │ run-2026-03-02-02 │ file_A.csv │ chay lai tay │        5 │       500 │
└──────────┴───────────────────┴────────────┴──────────────┴──────────┴───────────┘
```

The fix becomes one statement, exactly 5 rows:

```sql
DELETE FROM fct_ban WHERE audit_sk = 3;
```

```text
┌──────────────┬───────────┐
│ dong_con_lai │ doanh_thu │
├──────────────┼───────────┤
│           20 │      2000 │
└──────────────┴───────────┘
```

### Fix 2 — automatic detection, with nobody needing to suspect it first

```sql
SELECT file_nguon, count(*) AS so_lan_nap, list(ma_lan_chay) AS cac_lan
FROM dim_audit GROUP BY 1 HAVING count(*) > 1;
```

```text
┌────────────┬────────────┬────────────────────────────────────────┐
│ file_nguon │ so_lan_nap │                cac_lan                 │
├────────────┼────────────┼────────────────────────────────────────┤
│ file_A.csv │          2 │ [run-2026-03-01-01, run-2026-03-02-02] │
└────────────┴────────────┴────────────────────────────────────────┘
```

This test can run **immediately after the load**, before anybody looks at a dashboard.

### Fix 3 — the closed-loop equality loaded + rejected = source

Alongside the audit dimension comes an error event schema for the rejected rows:

```sql
SELECT (SELECT count(*) FROM fct_ban) AS da_nap,
       (SELECT count(*) FROM fct_loi) AS bi_loai,
       (SELECT count(*) FROM fct_ban) + (SELECT count(*) FROM fct_loi) AS cong_lai,
       (SELECT sum(so_dong_nguon) FROM dim_audit WHERE audit_sk IN (1,2)) + 3 AS dong_nguon;
```

```text
┌────────┬─────────┬──────────┬────────────┐
│ da_nap │ bi_loai │ cong_lai │ dong_nguon │
├────────┼─────────┼──────────┼────────────┤
│     20 │       3 │       23 │         23 │
└────────┴─────────┴──────────┴────────────┘
```

This equality can't hold by accident. It catches both duplicate loads and silent row
loss.

| | Before | After |
|---|---|---|
| Incident handling time | Half a day | One statement |
| Good rows wrongly deleted | 5 | 0 |
| Duplicate loads detected by | A user reporting an odd number | A test after every load |
| The standing cost | 0 | One `INT` column + one small table |

## How to spot it early

1. The fact table has **no** column like `ma_lan_chay` / `_run_id` / `_loaded_at`. A one-minute
   check:

```sql
DESCRIBE fct_ban;
```

2. The incident-handling procedure contains the words *"delete by date range then reload"*. That's a certain
   sign of no audit dimension — with one, you'd delete by run.

3. Nobody can answer *"which run created this row"* in under a minute.

4. There's no test counting each load's `count(*)` against the declared `so_dong_nguon`.

In dbt, attaching the audit columns to a model takes exactly two lines:

```sql
SELECT ...,
       '{{ invocation_id }}'  AS ma_lan_chay,
       '{{ run_started_at }}' AS thoi_diem_chay
FROM {{ ref('stg_ban') }}
```

## Related Topics

- [Audit dimensions and error event schemas](../skills/audit-dimension.md) — the technique skipped here
- [The six dimensions of data quality](../../data-quality/six-dimensions.md) — the label set for rejection reasons
- [Implementing tests in dbt](../../etl/dbt/skills/implementing-tests.md) — the blocking and detecting layers
- [CS: the summary table with divergent numbers](bang-tong-hop-lech-so.md) — also needing a controlled reload
