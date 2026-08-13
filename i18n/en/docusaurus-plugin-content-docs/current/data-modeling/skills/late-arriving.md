---
title: Late-arriving data — late arriving facts and dimensions
sidebar_position: 10
description: "A fact arriving after the dimension changed, or a dimension arriving after the fact: two inverse cases, two different fixes, and the same consequence if ignored."
tags: [late-arriving, scd, etl, dimension, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Late-arriving data — late arriving facts and dimensions

> **Takeaway:** every ETL implicitly assumes *"the data arrives when it happened"*. That assumption is wrong
> in every real system. The two kinds of lateness — a late fact, a late dimension — break in two
> inverse ways, and neither **produces an error**.

## Two cases, distinguished by what arrives late

| | A late arriving **fact** | A late arriving **dimension** |
|---|---|---|
| What happens | A 10 January transaction only reaches the warehouse on 5 March | The fact references a customer the dimension doesn't have yet |
| How it breaks | It's assigned to the **current dimension version** instead of the version at transaction time | The `JOIN` wipes the fact row out, or the key is orphaned |
| The symptom | An old period's numbers change, and attributes are assigned wrongly | The total falls short with nobody knowing by how much |
| The fix | Join on the **transaction date**, not on `la_hien_tai` | An **inferred member** — a placeholder row |

Both are consequences of the model having [SCD](scd.md) Type 2: if the dimension doesn't keep
history, there's no "right version" to choose wrongly.

## The worked example

Customer `C1` moves from the North to the South on 2026-02-01. Four transactions, of which `B1`
happened on 10 January but **only reached the warehouse 54 days later**, and `B4` belongs to customer `C3` whose record hasn't
arrived yet.

```sql
CREATE TABLE dim_khach AS
SELECT * FROM (VALUES
  (1, 'C1', 'Mien Bac', DATE '2025-01-01', DATE '2026-02-01', false),
  (2, 'C1', 'Mien Nam', DATE '2026-02-01', DATE '9999-12-31', true),
  (3, 'C2', 'Mien Nam', DATE '2025-01-01', DATE '9999-12-31', true)
) t(khach_sk, khach_id, khu_vuc, hieu_luc_tu, hieu_luc_den, la_hien_tai);

-- ngay_gd = luc viec xay ra; ngay_nhan = luc dong du lieu ve toi kho
CREATE TABLE stg_ban AS
SELECT * FROM (VALUES
  ('B1', 'C1', DATE '2026-01-10', DATE '2026-03-05', 1000),  -- fact ve muon 54 ngay
  ('B2', 'C1', DATE '2026-02-15', DATE '2026-02-15',  500),
  ('B3', 'C2', DATE '2026-01-20', DATE '2026-01-20',  300),
  ('B4', 'C3', DATE '2026-01-25', DATE '2026-01-25',  700)   -- C3 chua co trong dim
) t(ma_ban, khach_id, ngay_gd, ngay_nhan, doanh_thu);
```

The truth: **2,500** across **4 rows**.

### Step 1 — the ETL written on instinct

The commonest join in every codebase: take the dimension's current version.

```sql
SELECT d.khu_vuc, sum(s.doanh_thu) AS doanh_thu, count(*) AS so_dong
FROM stg_ban s JOIN dim_khach d
  ON d.khach_id = s.khach_id AND d.la_hien_tai
GROUP BY 1 ORDER BY 1;
```

```text
┌──────────┬───────────┬─────────┐
│ khu_vuc  │ doanh_thu │ so_dong │
├──────────┼───────────┼─────────┤
│ Mien Nam │      1800 │       3 │
└──────────┴───────────┴─────────┘
```

Two bugs at once, neither reported:

1. **The North vanishes from the report.** `C1`'s 1,000 of January revenue is attributed to the
   South, because the ETL asked *"where is C1 now"* instead of *"where was C1 then"*.
2. **A row is lost entirely**: `B4` can't find `C3`, and the `JOIN` throws away 700.

```sql
SELECT sum(s.doanh_thu) AS tong_vao_kho, 4 - count(*) AS dong_bi_mat
FROM stg_ban s JOIN dim_khach d ON d.khach_id = s.khach_id AND d.la_hien_tai;
```

```text
┌──────────────┬─────────────┐
│ tong_vao_kho │ dong_bi_mat │
├──────────────┼─────────────┤
│         1800 │           1 │
└──────────────┴─────────────┘
```

**1,800 / 2,500 — 28% short.** The pipeline is green, with no exception and no red test.

### Step 2 — fixing the late-fact case: join on the transaction date

Drop `la_hien_tai` and use the validity interval:

```sql
SELECT d.khu_vuc, sum(s.doanh_thu) AS doanh_thu, count(*) AS so_dong
FROM stg_ban s JOIN dim_khach d
  ON d.khach_id = s.khach_id
 AND s.ngay_gd >= d.hieu_luc_tu AND s.ngay_gd < d.hieu_luc_den
GROUP BY 1 ORDER BY 1;
```

```text
┌──────────┬───────────┬─────────┐
│ khu_vuc  │ doanh_thu │ so_dong │
├──────────┼───────────┼─────────┤
│ Mien Bac │      1000 │       1 │
│ Mien Nam │       800 │       2 │
└──────────┴───────────┴─────────┘
```

The North is back with exactly 1,000. This is *as-was* — what Type 2 exists to serve, and
also what gets thrown away the moment an ETL writes `WHERE la_hien_tai`.

`B4` is still missing.

### Step 3 — fixing the late-dimension case: an inferred member

When a fact points at a key that doesn't exist yet, **don't drop the fact row and don't wait**. Insert a
placeholder dimension row — Kimball calls it an *inferred member*:

```sql
INSERT INTO dim_khach VALUES
  (4, 'C3', 'Chua biet', DATE '1900-01-01', DATE '9999-12-31', true);
```

```text
┌───────────┬───────────┬─────────┐
│  khu_vuc  │ doanh_thu │ so_dong │
├───────────┼───────────┼─────────┤
│ Chua biet │       700 │       1 │
│ Mien Bac  │      1000 │       1 │
│ Mien Nam  │       800 │       2 │
└───────────┴───────────┴─────────┘
```

```sql
SELECT sum(s.doanh_thu) AS tong, count(*) AS so_dong
FROM stg_ban s JOIN dim_khach d
  ON d.khach_id = s.khach_id
 AND s.ngay_gd >= d.hieu_luc_tu AND s.ngay_gd < d.hieu_luc_den;
```

```text
┌────────┬─────────┐
│  tong  │ so_dong │
├────────┼─────────┤
│   2500 │       4 │
└────────┴─────────┘
```

**2,500 / 4 rows.** Matching the source.

The important point: `Chua biet` **appears on the report**. Missing data becomes a visible
row rather than an invisible gap — that's what makes it entirely different from dropping the row.

### Step 4 — when the real record arrives

An inferred member is filled in **Type 1 style, in place**, creating no new version:

```sql
UPDATE dim_khach SET khu_vuc = 'Mien Trung' WHERE khach_id = 'C3';
```

```text
┌────────────┬───────────┐
│  khu_vuc   │ doanh_thu │
├────────────┼───────────┤
│ Mien Bac   │      1000 │
│ Mien Nam   │       800 │
│ Mien Trung │       700 │
└────────────┴───────────┘
```

The fact **doesn't need reloading** — it still points at `khach_sk = 4`. This is exactly why an inferred
member must keep its surrogate key rather than getting a new one when the record arrives.

If you used Type 2 for this fill-in, you'd have a `Chua biet` version existing forever
in the history — meaningless, because `Chua biet` was never a truth about the customer; it's a state of
**the data warehouse**, not of the customer.

## Measuring the delay — turning an assumption into a number

You can't handle what you don't measure. Add `ngay_nhan` (or `_loaded_at`) to staging and measure:

```sql
SELECT ma_ban, ngay_gd, ngay_nhan, ngay_nhan - ngay_gd AS tre_ngay
FROM stg_ban ORDER BY tre_ngay DESC;
```

```text
┌─────────┬────────────┬────────────┬──────────┐
│ ma_ban  │  ngay_gd   │ ngay_nhan  │ tre_ngay │
├─────────┼────────────┼────────────┼──────────┤
│ B1      │ 2026-01-10 │ 2026-03-05 │       54 │
│ B2      │ 2026-02-15 │ 2026-02-15 │        0 │
│ B3      │ 2026-01-20 │ 2026-01-20 │        0 │
│ B4      │ 2026-01-25 │ 2026-01-25 │        0 │
└─────────┴────────────┴────────────┴──────────┘
```

The number decides the reload window of an incremental model:

```sql
SELECT round(100.0 * sum(doanh_thu) FILTER (WHERE date_trunc('month', ngay_nhan)
                                               > date_trunc('month', ngay_gd))
             / sum(doanh_thu), 1) AS pct_ve_sau_khi_chot_ky
FROM stg_ban;
```

```text
┌────────────────────────┐
│ pct_ve_sau_khi_chot_ky │
├────────────────────────┤
│                   40.0 │
└────────────────────────┘
```

**40% of revenue arrives after the period is closed.** With that number, an incremental model reloading only
the last 7 days will be permanently short — see [materializations](../../etl/dbt/reference/materializations.md).
The reload window must be wider than the 99th-percentile delay, not wider than the average delay.

## The effect on summary tables

A late fact also skews an [aggregate fact table](aggregate-fact-table.md): the January summary
table finished running on 1 February, and the row arriving on 5 March has nobody to recompute it. Both layers must reload
the same window, otherwise they drift apart.

## Trade-offs

| You get | You lose |
|---|---|
| Joining on the validity interval → correct as-was | An inequality join, slower than a plain key join |
| An inferred member → no rows lost | The report has a `Chua biet` group to explain |
| Measuring `tre_ngay` → a grounded reload window | You must carry `ngay_nhan` through the whole pipeline |
| A wide reload window | More computation on every run |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| `JOIN … AND d.la_hien_tai` for historical facts | Attributes assigned wrongly and old periods changing numbers — [case study](../case-studies/fact-den-muon-gan-sai-khu-vuc.md) |
| An `INNER JOIN` to the dimension | A fact with an unknown key is silently thrown away |
| Parking fact rows in a "waiting" table and forgetting them | The data sits there forever and the total never matches |
| Using Type 2 to fill an inferred member | A `Chua biet` version exists forever in the history |
| An incremental window narrower than the real delay | Late-arriving rows are never loaded |
| Not distinguishing `ngay_gd` from `ngay_nhan` | You can't measure the delay, and every decision becomes guesswork |

## How to spot it early

```sql
-- 1. Fact tro toi khoa khong co trong dimension
SELECT count(*) FROM fct_ban f
LEFT JOIN dim_khach d ON d.khach_id = f.khach_id
WHERE d.khach_id IS NULL;

-- 2. Bao nhieu dong roi vao inferred member va co giam khong
SELECT date_trunc('month', ngay_gd) AS thang, count(*) AS dong_chua_biet
FROM fct_ban WHERE khach_sk IN (SELECT khach_sk FROM dim_khach WHERE khu_vuc = 'Chua biet')
GROUP BY 1 ORDER BY 1;

-- 3. Tong cua mot ky da chot co doi giua hai lan chay khong
```

Query 3 is worth making a periodic test: snapshot the totals of closed periods and compare on each
run. A change = late-arriving data, and you know exactly which day.

## Related Topics

- [SCD](scd.md) — Type 2 and validity intervals are the foundation of the fix
- [Change detection for SCD 2](scd-change-detection.md) — knowing which row changed
- [The date dimension](../reference/date-dimension.md) — the `-1` row for a milestone that hasn't happened
- [Aggregate fact tables](aggregate-fact-table.md) — summary tables drifting because of late facts
- [CS: a late fact assigned the wrong region](../case-studies/fact-den-muon-gan-sai-khu-vuc.md)
- [CS: half the orders vanished](../case-studies/don-dang-giao-bien-mat.md) — the same `JOIN`-drops-rows mechanism

## References

- Kimball Group — [Late Arriving Facts / Late Arriving Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 19
