---
title: Audit dimensions and error event schemas
sidebar_position: 13
description: "Each fact row carries a key pointing back at the run that produced it — so when the numbers are wrong you delete exactly what must be deleted rather than deleting by date range."
tags: [audit-dimension, error-event, data-quality, lineage, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Audit dimensions and error event schemas

> **Takeaway:** the data will be wrong. The question isn't *"how do I never be wrong"* but
> *"when it is wrong, how long does it take to know which rows are wrong and delete exactly those"*. An audit dimension
> is the answer: each fact row carries a key pointing back at **the ETL run that produced it**.

## The problem

You come in one morning and January's revenue has jumped from 2,000 to 2,500. Nobody changed anything. No test is
red.

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

**25% inflated.** The cause turns out to be entirely mundane: one source file was loaded twice because
somebody re-ran it by hand after the nightly job failed mid-way.

Now the expensive part: **what do you delete?** If the fact carries no trace of the run, the only
remaining information is the transaction date. So the only way to delete is by date range:

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

Deleting 10 rows to kill 5 junk ones — **half of them are good rows**. Then you have to reload what you
wrongly deleted, and while it's reloading the reports fall short. Every small incident becomes half a day.

## The audit dimension

A dimension describing **an ETL run**, not describing the business. Each run produces one row;
each fact row created by that run carries the corresponding `audit_sk`.

```sql
CREATE TABLE dim_audit AS
SELECT * FROM (VALUES
  (1, 'run-2026-03-01-01', TIMESTAMP '2026-03-01 02:00:00', 'file_A.csv', 'v1.4.2', 10, 'ok'),
  (2, 'run-2026-03-02-01', TIMESTAMP '2026-03-02 02:00:00', 'file_B.csv', 'v1.4.2', 10, 'ok'),
  (3, 'run-2026-03-02-02', TIMESTAMP '2026-03-02 09:15:00', 'file_A.csv', 'v1.4.2', 10, 'chay lai tay')
) t(audit_sk, ma_lan_chay, thoi_diem_chay, file_nguon, phien_ban_code, so_dong_nguon, ghi_chu);
```

The same "where are the numbers wrong" question is now answered with one `GROUP BY`:

```sql
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

`file_A.csv` appears twice. And that's detectable **automatically**, without anybody suspecting it
beforehand:

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

The fix is one statement, **exactly 5 rows, touching nothing else**:

```sql
DELETE FROM fct_ban WHERE audit_sk = 3;

SELECT count(*) AS dong_con_lai, sum(doanh_thu) AS doanh_thu FROM fct_ban;
```

```text
┌──────────────┬───────────┐
│ dong_con_lai │ doanh_thu │
├──────────────┼───────────┤
│           20 │      2000 │
└──────────────┴───────────┘
```

**Half a day → one statement.** That's the whole value of this technique.

### The columns worth having

| Column | Used for |
|---|---|
| `ma_lan_chay` | Linking to the orchestrator's log (Airflow's `run_id` / dbt's `invocation_id`) |
| `thoi_diem_chay` | Distinguishing the nightly job from a manual re-run |
| `file_nguon` / `bang_nguon` | Detecting a duplicate load |
| `phien_ban_code` | *"The numbers changed the day we deployed"* — answerable with data |
| `so_dong_nguon` | The denominator for computing an error rate |
| `so_dong_loi`, `diem_chat_luong` | Flagging a suspect data batch |
| `la_nap_lai` | Separating a normal run from a repair run |

The first three are the minimum. If you can only manage one column, make it `ma_lan_chay`.

**Is an audit dimension a dimension or a fact?** Kimball classes it as a dimension because facts point at it
with a foreign key and people filter/group by it. But its grain is *one run*, and the number
of runs grows with time — so don't be surprised when it's bigger than a business dimension.
It's Type 0: once a run is done, its description is never edited.

## Error event schemas

An audit dimension says **which rows got into the warehouse**. The remaining question: **which rows couldn't get in,
and why?**

Every pipeline's default handling — `WHERE cot IS NOT NULL` and move on — makes the rejected data
**evaporate without a trace**. Nobody knows how much was lost, what was lost, or whether the loss rate is rising.

An error event schema is a separate fact for **error events**:

```sql
CREATE TABLE fct_loi AS
SELECT * FROM (VALUES
  (1, 'file_A.csv', 'B-X1', 'khach_id rong',          'completeness'),
  (2, 'file_B.csv', 'B-X2', 'so_tien am',             'validity'),
  (2, 'file_B.csv', 'B-X3', 'khach_id khong ton tai', 'integrity')
) t(audit_sk, file_nguon, ma_ban, ly_do, chieu_chat_luong);

SELECT chieu_chat_luong, count(*) AS so_dong, list(ly_do) AS ly_do
FROM fct_loi GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌──────────────────┬─────────┬──────────────────────────┐
│ chieu_chat_luong │ so_dong │          ly_do           │
├──────────────────┼─────────┼──────────────────────────┤
│ integrity        │       1 │ [khach_id khong ton tai] │
│ completeness     │       1 │ [khach_id rong]          │
│ validity         │       1 │ [so_tien am]             │
└──────────────────┴─────────┴──────────────────────────┘
```

The `chieu_chat_luong` column uses exactly the [six quality dimensions](../../data-quality/six-dimensions.md)
— so data quality is measured with the same yardstick across every table.

Alongside it comes a closed-loop reconciliation, which doesn't exist without an error schema:

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

**Loaded + rejected = source.** That equality is the pipeline's strongest invariant: it can't
hold by accident. Making it a test catches every kind of silent row loss — including
the kind in the [case study where half the orders vanished](../case-studies/don-dang-giao-bien-mat.md).

And because errors are now data, quality becomes a metric trackable over time:

```sql
SELECT a.ma_lan_chay, coalesce(l.so_loi, 0) AS so_loi, a.so_dong_nguon,
       round(100.0 * coalesce(l.so_loi, 0) / a.so_dong_nguon, 1) AS ty_le_loi_pct
FROM dim_audit a
LEFT JOIN (SELECT audit_sk, count(*) AS so_loi FROM fct_loi GROUP BY 1) l USING (audit_sk)
ORDER BY ty_le_loi_pct DESC;
```

```text
┌───────────────────┬────────┬───────────────┬───────────────┐
│    ma_lan_chay    │ so_loi │ so_dong_nguon │ ty_le_loi_pct │
├───────────────────┼────────┼───────────────┼───────────────┤
│ run-2026-03-02-01 │      2 │            10 │          20.0 │
│ run-2026-03-01-01 │      1 │            10 │          10.0 │
│ run-2026-03-02-02 │      0 │            10 │           0.0 │
└───────────────────┴────────┴───────────────┴───────────────┘
```

The alert threshold goes on the last column. A dbt test usually answers *"is there an error or not"*; this column
answers *"are the errors increasing or decreasing"* — a far more useful question for long-term operations.

## The relationship to dbt's three layers

| Layer | Tool | Answers |
|---|---|---|
| Block beforehand | `contract`, `not_null`, `unique` | Can wrong data get in |
| Detect | `dbt test` | After loading, is anything abnormal |
| **Trace** | **an audit dimension + an error schema** | **Which row, from which run, and why it was rejected** |

The first two layers are yes/no questions. The third is what decides whether an incident takes ten minutes or half
a day. The first two layers are detailed in [Implementing tests](../../etl/dbt/skills/implementing-tests.md).

In dbt, the audit columns attach to a model in just a few lines:

```sql
SELECT ...,
       '{{ invocation_id }}'          AS ma_lan_chay,
       '{{ run_started_at }}'         AS thoi_diem_chay
FROM {{ ref('stg_ban') }}
```

## Trade-offs

| You get | You lose |
|---|---|
| Deleting exactly what must be deleted — one statement | Each fact gets 1 key column wider |
| Automatic detection of a duplicate load | You have to generate and maintain `dim_audit` |
| *"Which deploy changed the numbers"* becomes answerable | Audit rows grow with the run count, not with the business |
| Rejected data doesn't disappear | Another error table to clean up periodically |

The real cost is low: one `INT` column in the fact and one small table. Against half a day per
incident, it pays for itself the first time.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| No run trace in the fact | Deleting by date range and losing good rows too — [case study](../case-studies/nap-hai-lan-khong-truy-duoc.md) |
| Only logging to a file, not into a table | You can't join it with the fact and can't trace which row |
| `WHERE … IS NOT NULL` and moving on | Rejected data evaporates and nobody knows how much was lost |
| Having an error table nobody looks at | It becomes a rubbish tip — you need an alert threshold on the rate |
| Writing audit data into a business dimension | Technical metadata mixed with business attributes |
| Not storing `so_dong_nguon` | No denominator, so no error rate |

## Related Topics

- [The six dimensions of data quality](../../data-quality/six-dimensions.md) — the label set for `chieu_chat_luong`
- [Implementing tests in dbt](../../etl/dbt/skills/implementing-tests.md) — the blocking and detecting layers
- [Late-arriving data](late-arriving.md) — a common reason for reloading
- [Aggregate fact tables](aggregate-fact-table.md) — reloading a summary table also needs a trace
- [CS: loaded twice with no way to trace which rows](../case-studies/nap-hai-lan-khong-truy-duoc.md)

## References

- Kimball Group — [Audit Dimensions / Error Event Schemas](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 19
