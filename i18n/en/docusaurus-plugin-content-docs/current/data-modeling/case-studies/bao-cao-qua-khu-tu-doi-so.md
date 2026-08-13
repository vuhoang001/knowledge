---
title: The January report changing its numbers in April
sidebar_position: 1
description: The same report over the same closed period, re-run and giving different numbers — because the dimension is Type 1.
tags: [case-study, scd, data-modeling, as-was]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: beginner
verified_at:
updated: 2026-07-31
---

# The January report changing its numbers in April

> **A reconstructed situation**, not an incident encountered here. But **every number below
> was really run on DuckDB** — paste it back and you get exactly the same.

> **Takeaway:** a Type 1 dimension makes a report about a **closed past** change with when you run
> it. No exception, no red test, no log. It looks exactly like somebody editing the numbers.

## Context

A revenue-by-region mart. `dim_khach_hang` is Type 1 — an update **overwrites**.

```sql
CREATE TABLE fct_don AS SELECT * FROM (VALUES
 ('DH001', DATE '2026-01-10','KH001',5000000),
 ('DH002', DATE '2026-01-15','KH002',3000000),
 ('DH003', DATE '2026-05-20','KH001',2000000))
 AS t(ma_don, ngay, khach_id, thanh_tien);

CREATE TABLE dim_t1 AS SELECT * FROM (VALUES
 ('KH001','Miền Bắc'),('KH002','Miền Nam')) AS t(khach_id, khu_vuc);
```

The January revenue report, run in **February**:

```sql
SELECT d.khu_vuc, sum(f.thanh_tien) AS doanh_thu
FROM fct_don f JOIN dim_t1 d USING (khach_id)
WHERE f.ngay < DATE '2026-02-01'
GROUP BY 1 ORDER BY 1;
```

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ Miền Bắc │   5000000 │
│ Miền Nam │   3000000 │
└──────────┴───────────┘
```

The boss signs it off. January is closed.

## Symptoms

On 15 March, `KH001` moves south. A staff member updates the record — correct business practice, nobody at fault.

```sql
UPDATE dim_t1 SET khu_vuc = 'Miền Nam' WHERE khach_id = 'KH001';
```

In April, re-running **exactly that report over exactly that period**:

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ Miền Nam │   8000000 │
└──────────┴───────────┘
```

**The North has vanished from the January report.** The South went from 3,000,000 to 8,000,000.

There are no new orders. Not one January row in the fact changed.

## The wrong hypotheses at first

The order people usually suspect things in, and why each is wrong:

| Suspected | Checked by | The result |
|---|---|---|
| A late-loaded January order | `count(*)` on the fact in the period | Unchanged |
| Somebody edited `fct_don` | Comparing the row count and total | Unchanged |
| A wrong date filter | Re-reading the `where` | Correct |
| The pipeline failed | The dbt log | All green |

The time goes because every suspicion points at the **fact**. The fact didn't change — the **dimension**
is where the change was, and nobody thinks a dimension affects the past.

## The real cause

The report filters on `f.ngay` — **the moment of sale**. But `khu_vuc` comes from the dimension in
**its current state**. The query is mixing two different points in time.

Put differently: the query asks *"January revenue"* but inadvertently answers *"January revenue,
grouped by **today's** region"*.

With Type 1, "today's region" is the only thing that exists — the old value was overwritten with no
way to recover it.

## Why no test catches it

| Test | The result |
|---|---|
| `unique` on `khach_id` | ✅ green |
| `not_null` on every column | ✅ green |
| `relationships` fact → dim | ✅ green |
| The fact's row count | ✅ unchanged |
| Total system-wide revenue | ✅ still 10,000,000 |

**The total is right, the detail is wrong.** No money went missing — it just moved from one group to
another. No invariant was broken, so no ready-made test touches it.

The only dimension that catches it is **accuracy** — reconciling against a signed-off copy stored outside the
system. See [the six quality dimensions](../../data-quality/six-dimensions.md).

## The fix

Move `khu_vuc` to [SCD](../skills/scd.md) Type 2, and have the fact hold **the surrogate key of the
version correct at the moment of sale**:

```sql
-- dim Type 2
khach_sk | khach_id | khu_vuc  | valid_from | valid_to   | is_current
1        | KH001    | Miền Bắc | 2024-06-01 | 2026-03-15 | false
2        | KH001    | Miền Nam | 2026-03-15 | 9999-12-31 | true

-- fact tro toi khach_sk, khong phai khach_id
SELECT d.khu_vuc, sum(f.thanh_tien)
FROM fct_don f JOIN dim_scd2 d USING (khach_sk)
WHERE f.ngay < DATE '2026-02-01' GROUP BY 1;
```

Assign `khach_sk` when loading the fact (a *dimension lookup*):

```sql
JOIN dim_scd2 d
  ON  f.khach_id = d.khach_id
  AND f.ngay >= d.valid_from
  AND f.ngay <  d.valid_to
```

Now `DH001` is locked to the North version. Re-run it whenever and it gives 5,000,000.

## How to spot it early

If you haven't hit the incident yet, three signs tell you you're exposed to it:

1. The fact joins the dimension by a **business code** (`khach_id`) rather than a surrogate key.
2. The dimension has no `valid_from` / `valid_to` columns.
3. Nobody has asked *"does this column need as-was or as-is"* — meaning the question was never raised,
   and as-is is the default.

**The one-sentence test:** *"Re-running last quarter's report next year, will it give the same old numbers?"*
If you can't answer with confidence, you're exposed.

## Related Topics

- [SCD](../skills/scd.md) — Type 1 vs Type 2, and when to choose which
- [Change detection for SCD 2](../skills/scd-change-detection.md) — how to build Type 2
- [Surrogate keys](../reference/surrogate-key.md) — why the fact must hold the SK
- [The six quality dimensions](../../data-quality/six-dimensions.md) — the *accuracy* dimension
