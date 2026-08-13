---
title: The dashboard says 800, a manual query says 1,000 — and the average is 50% out
sidebar_position: 12
description: "A summary table pre-storing avg then being rolled up a level, and never reloaded when a backdated order arrives."
tags: [case-study, aggregate, additivity, late-arriving, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# The dashboard says 800, a manual query says 1,000 — and the average is 50% out

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** an [aggregate table](../skills/aggregate-fact-table.md) is a copy that can drift
> from the detailed fact. It goes wrong in two independent ways: storing **non-summable** numbers, and **drifting
> away from** the atomic table when data arrives late. This case has both.

## Context

The detailed `fct_don` is slow for the dashboard, so an `agg_ngay` was added, grouped by day. The summary
table stores revenue and the **average order value** — because the dashboard shows both, so it's precomputed
for speed.

```sql
CREATE TABLE fct_don AS
SELECT * FROM (VALUES
  ('D1', DATE '2026-01-05', 100),
  ('D2', DATE '2026-01-05', 100),
  ('D3', DATE '2026-01-05', 100),
  ('D4', DATE '2026-01-06', 500)
) t(so_don, ngay, doanh_thu);

CREATE TABLE agg_ngay_sai AS
SELECT ngay, sum(doanh_thu) AS doanh_thu, avg(doanh_thu) AS tb_moi_don
FROM fct_don GROUP BY ngay;
```

```text
┌────────────┬───────────┬────────────┐
│    ngay    │ doanh_thu │ tb_moi_don │
├────────────┼───────────┼────────────┤
│ 2026-01-05 │       300 │      100.0 │
│ 2026-01-06 │       500 │      500.0 │
└────────────┴───────────┴────────────┘
```

This table is **correct at its own grain**. That's what makes this case so irritating.

## The first symptom — the average order value is 50% out

The weekly dashboard shows an average order value of **300**. An analyst querying by hand gets
**200**.

```sql
SELECT (SELECT round(avg(doanh_thu), 1) FROM fct_don)       AS tu_atomic,
       (SELECT round(avg(tb_moi_don), 1) FROM agg_ngay_sai) AS tu_agg_avg_cua_avg,
       round(100.0 * ((SELECT avg(tb_moi_don) FROM agg_ngay_sai)
                    - (SELECT avg(doanh_thu) FROM fct_don))
             / (SELECT avg(doanh_thu) FROM fct_don), 1)     AS lech_pct;
```

```text
┌───────────┬────────────────────┬──────────┐
│ tu_atomic │ tu_agg_avg_cua_avg │ lech_pct │
├───────────┼────────────────────┼──────────┤
│     200.0 │              300.0 │     50.0 │
└───────────┴────────────────────┴──────────┘
```

## The second symptom — the total is out too

Three weeks later, an order backdated to 5 January reaches the warehouse ([a late arriving fact](../skills/late-arriving.md)).
The atomic fact gets reloaded; nobody touches the summary table.

```sql
INSERT INTO fct_don VALUES ('D5', DATE '2026-01-05', 200);

SELECT (SELECT sum(doanh_thu) FROM fct_don)      AS atomic,
       (SELECT sum(doanh_thu) FROM agg_ngay_sai) AS bang_tong_hop,
       (SELECT sum(doanh_thu) FROM fct_don)
     - (SELECT sum(doanh_thu) FROM agg_ngay_sai) AS chenh,
       round(100.0 * ((SELECT sum(doanh_thu) FROM agg_ngay_sai)
                    - (SELECT sum(doanh_thu) FROM fct_don))
             / (SELECT sum(doanh_thu) FROM fct_don), 1) AS lech_pct;
```

```text
┌────────┬───────────────┬────────┬──────────┐
│ atomic │ bang_tong_hop │ chenh  │ lech_pct │
├────────┼───────────────┼────────┼──────────┤
│   1000 │           800 │    200 │    -20.0 │
└────────┴───────────────┴────────┴──────────┘
```

The dashboard: **800**. The manual query: **1,000**. Both "run correctly against their own table".

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| The analyst wrote a wrong query | Re-read: `avg(doanh_thu)` on the atomic table — nothing wrong |
| The dashboard filters out a day | Removing the time filter still leaves a discrepancy |
| The summary table failed to load that day | The log is green; `agg_ngay` ran on schedule every day |
| Timezones dropping a row into another day | Checking the day boundaries: no shift |
| The BI cache | Clearing the cache: unchanged |

Where the time goes: the two symptoms have **two different causes** but appear together
on one dashboard, so they're investigated as one incident. Only once "why is the average out" is separated from "why is
the total out" does it resolve.

## The real causes

### Cause 1 — averages aren't summable

`avg` isn't an additive fact. Adding up daily averages and dividing by the day count gives
**each day equal weight**, whether that day had 3 orders or 1.

- Correct: (100+100+100+500) / 4 = **200**
- The summary table: (100 + 500) / 2 = **300**

5 January had 3 orders but is weighted the same as a day with 1. See the additivity section in
[Facts and dimensions](../reference/fact-and-dimension.md).

### Cause 2 — mismatched reload windows

`fct_don` reloads the last 30 days; `agg_ngay` is only built for yesterday. Every row arriving
more than a day late enters the atomic table and never the summary. The two layers **gradually drift
apart**, and the divergence only grows rather than self-correcting.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null`, `unique` on `agg_ngay.ngay` | ✅ green |
| `agg_ngay` has every day in the period | ✅ green |
| `doanh_thu > 0` | ✅ green |
| `fct_don` matching the source | ✅ green |
| `agg_ngay` matching `fct_don` | ❌ — **nobody writes this test** |

The first four tests check `agg_ngay` **on its own**. None checks the relationship between the two tables — and that's
the only place the bug exists.

This is the common characteristic of all derived data: **the invariant lives in the relationship to the source, not
inside the table itself.**

## The fix

### Fix 1 — store only summable numbers

Rebuild the summary table, this time with summable numbers only:

```sql
CREATE TABLE agg_ngay AS
SELECT ngay, sum(doanh_thu) AS doanh_thu, count(*) AS so_don
FROM fct_don GROUP BY ngay;

SELECT sum(doanh_thu) AS doanh_thu, sum(so_don) AS so_don,
       round(sum(doanh_thu) * 1.0 / sum(so_don), 1) AS tb_moi_don
FROM agg_ngay;
```

```text
┌───────────┬────────┬────────────┐
│ doanh_thu │ so_don │ tb_moi_don │
├───────────┼────────┼────────────┤
│      1000 │      5 │      200.0 │
└───────────┴────────┴────────────┘
```

Reconciled against the atomic table:

```sql
SELECT round(avg(doanh_thu), 1) AS tb_tu_atomic FROM fct_don;
```

```text
┌──────────────┐
│ tb_tu_atomic │
├──────────────┤
│        200.0 │
└──────────────┘
```

Store **the numerator and the denominator**, and divide at read time. The average now matches the atomic table at every
aggregation level.

### Fix 2 — a reconciliation query, run after every load

The table has just been rebuilt so it currently matches. Simulate the **next** late-arriving row — because
there will always be a next one:

```sql
INSERT INTO fct_don VALUES ('D6', DATE '2026-01-06', 400);

SELECT a.ngay, a.doanh_thu AS agg, f.doanh_thu AS atomic,
       f.doanh_thu - a.doanh_thu AS chenh
FROM agg_ngay a
FULL JOIN (SELECT ngay, sum(doanh_thu) AS doanh_thu FROM fct_don GROUP BY ngay) f
  USING (ngay)
WHERE coalesce(a.doanh_thu, 0) <> coalesce(f.doanh_thu, 0);
```

```text
┌────────────┬────────┬────────┬────────┐
│    ngay    │  agg   │ atomic │ chenh  │
├────────────┼────────┼────────┼────────┤
│ 2026-01-06 │    500 │    900 │    400 │
└────────────┴────────┴────────┴────────┘
```

Returning no rows means the two layers match. Returning a row identifies exactly the day to reload.
Make it a dbt test with `severity: error` — see
[Implementing tests](../../etl/dbt/skills/implementing-tests.md).

### Fix 3 — the summary table's reload window ≥ the atomic table's

If the atomic table reloads 30 days, the summary table must rebuild 30 days too. Narrower is a **guarantee
of drift**.

| | Before | After |
|---|---|---|
| Average order value | 300 (**50% out**) | 200 |
| The dashboard's total | 800 (**−20% out**) | 1,000 |
| Divergence detected by | Users reporting it | A CI test |
| Columns stored in the agg | `sum`, `avg` | `sum`, `count` |

## How to spot it early

1. Any `agg_`/`rollup_` table's DDL containing `avg(`, `median(`, or
   `count(DISTINCT`. None of the three is summable:

```bash
grep -rn "avg(\|median(\|count(distinct" models/marts/agg_*.sql
```

2. There's a summary table with **no** reconciliation query against the atomic one.

3. The summary table's reload window is narrower than the atomic fact's.

4. A user asking *"why does the dashboard's number differ from the one I queried"* — that question is almost always
   a symptom of divergence between the two layers, not of a wrong query.

## Related Topics

- [Aggregate fact tables](../skills/aggregate-fact-table.md) — the two rules broken here
- [Facts and dimensions](../reference/fact-and-dimension.md) — additivity: which column may enter a summary table
- [Late-arriving data](../skills/late-arriving.md) — the reason the two layers drift apart
- [CS: a late fact assigned the wrong region](fact-den-muon-gan-sai-khu-vuc.md) — the same root, a different consequence
