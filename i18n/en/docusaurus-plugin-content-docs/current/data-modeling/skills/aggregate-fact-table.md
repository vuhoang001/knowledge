---
title: Aggregate fact tables and shrunken rollup dimensions
sidebar_position: 11
description: "A summary table speeds queries up, but it's only correct when its numbers are summable and when the shrunken dimension is generated from the original dimension."
tags: [aggregate, shrunken-dimension, conformed-dimension, additivity, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Aggregate fact tables and shrunken rollup dimensions

> **Takeaway:** a summary table is a **copy that can drift** from the detailed fact. Two rules keep
> it correct: store only **summable** numbers (`sum`, `count` — never `avg`), and the
> shrunken dimension must be **generated from** the original dimension rather than retyped.

## Why summary tables exist

The atomic fact has 5 billion rows; the dashboard only asks for revenue by month × region. Scanning 5 billion
rows to return 200 numbers is wasteful. A summary table at a coarser grain solves exactly
that.

Kimball emphasises something easily overlooked: **a summary table doesn't replace the atomic one**. It's an
acceleration layer standing beside it, and it **must be derivable from the atomic table at any time**. Dropping the atomic
table to "save space" loses the ability to answer every unanticipated question — the same kind of
trade-off as in [Star, snowflake, OBT](../reference/star-snowflake-obt.md).

## Rule 1 — store only summable numbers

This is the commonest failure, and it fails right at the first row.

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

This table is correct. It becomes wrong the moment somebody rolls it up a level:

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

**200 or 300?** An average of averages weights each day equally, whether that day had
3 orders or 1. 50% out on a 4-row set — on a real set nobody can guess by how much,
and nobody detects it.

The fix is to drop `avg` and store **the numerator and the denominator**:

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
│       800 │      4 │      200.0 │
└───────────┴────────┴────────────┘
```

The rule: **a summary table contains only additive facts**. Ratios, averages and percentages are
computed **at read time** from two summable columns. See the additivity section in
[Facts and dimensions](../reference/fact-and-dimension.md).

| To have the metric | Store in the summary table |
|---|---|
| Average order value | `sum(doanh_thu)`, `count(*)` |
| Conversion rate | `sum(so_don)`, `sum(so_luot_xem)` |
| Margin % | `sum(doanh_thu)`, `sum(gia_von)` |
| Distinct customers | **Not summable** — see the FAQ |

## Rule 2 — a shrunken rollup dimension must be generated from the original

A quarterly summary table needs a `dim_quy`. The temptation: type a 4-row table by hand, done in
30 seconds. The consequence: two definitions of "quarter" existing in parallel, diverging at exactly the moment
nobody expects — especially when the company has [its own fiscal year](../reference/date-dimension.md).

A shrunken rollup dimension is the original dimension **reduced to a coarser grain**, and it must be
generated with `SELECT DISTINCT` from the original dimension itself:

```sql
CREATE TABLE dim_quy AS
SELECT DISTINCT nam_tai_chinh, quy_tai_chinh,
       'FY' || nam_tai_chinh || '-Q' || quy_tai_chinh AS ten_quy
FROM dim_ngay;
```

```text
┌───────────────┬───────────────┬───────────┐
│ nam_tai_chinh │ quy_tai_chinh │  ten_quy  │
├───────────────┼───────────────┼───────────┤
│          2025 │             4 │ FY2025-Q4 │
│          2026 │             1 │ FY2026-Q1 │
│          2026 │             2 │ FY2026-Q2 │
│          2026 │             3 │ FY2026-Q3 │
└───────────────┴───────────────┴───────────┘
```

Check the conformance condition — the same month must carry the same label in both tables:

```sql
SELECT DISTINCT 'tu dim_ngay' AS nguon,
       'FY' || nam_tai_chinh || '-Q' || quy_tai_chinh AS nhan
FROM dim_ngay WHERE month(ngay) = 1
UNION ALL
SELECT 'tu dim_quy', ten_quy FROM dim_quy
WHERE nam_tai_chinh = 2025 AND quy_tai_chinh = 4;
```

```text
┌─────────────┬───────────┐
│    nguon    │   nhan    │
├─────────────┼───────────┤
│ tu dim_ngay │ FY2025-Q4 │
│ tu dim_quy  │ FY2025-Q4 │
└─────────────┴───────────┘
```

A single distinct result after the `DISTINCT` means the two tables agree. This is exactly the conformance
condition from [conformed dimensions](conformed-dimension.md), applied to the detail ↔ summary pair:
**the shrunken dimension's value set must be a proper subset of the original dimension's.**

Without it, the quarterly report and the daily report add up to two different numbers, and the argument drags
on because both "run correctly" — exactly the [case study of two marts that couldn't be joined](../case-studies/hai-mart-khong-ghep-duoc.md).

## Rule 3 — a summary table drifting from the atomic one

The two rules above ensure correctness at build time. This one deals with what happens afterwards.

The January summary table finished running on 1 February. On 5 March an order backdated to 5 January
reaches the warehouse ([a late arriving fact](late-arriving.md)):

```sql
INSERT INTO fct_don VALUES ('D5', DATE '2026-01-05', 200);

SELECT (SELECT sum(doanh_thu) FROM fct_don)  AS atomic,
       (SELECT sum(doanh_thu) FROM agg_ngay) AS bang_tong_hop,
       (SELECT sum(doanh_thu) FROM fct_don)
     - (SELECT sum(doanh_thu) FROM agg_ngay) AS chenh,
       round(100.0 * ((SELECT sum(doanh_thu) FROM agg_ngay)
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

The dashboard reading the summary table shows **800**; whoever queries the atomic table sees **1,000**. Both
are "right according to their own table", and the meeting will lose half a day.

How to detect it — one reconciliation query, run after every load:

```sql
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
│ 2026-01-05 │    300 │    500 │    200 │
└────────────┴────────┴────────┴────────┘
```

It points straight at the day to reload. Turning this query into a dbt test with `severity: error` is
the only way to keep the two layers in sync long term — see
[Implementing tests](../../etl/dbt/skills/implementing-tests.md).

**The operational rule:** the summary table's reload window must be **equal to or wider than** the atomic
fact's. Narrower is guaranteed drift.

## Consolidated fact tables — a close relative of a different nature

Aggregate and consolidated are easily confused because both "roll up to a coarser grain". The difference is
in **what gets combined**:

| | Aggregate fact table | Consolidated fact table |
|---|---|---|
| What's combined | **One** business process at a coarser grain | **Several** processes brought to the same grain |
| Example | Sales by day → by month | Actual **and** planned revenue, at month × product grain |
| Derivable from | Its own atomic fact | Several different facts |
| Purpose | Speed | **User convenience** — no drilling across by hand |

The consolidated fact exists because of one repeated question: *"how far is actual from
plan"*. Users could [drill across](conformed-dimension.md) the two facts each time,
but if that question comes up daily, pre-building a table is reasonable.

```text
fct_ban_thang_hop_nhat
  thang_key | san_pham_sk | doanh_thu_thuc_te | doanh_thu_ke_hoach | chenh_lech
```

**Three mandatory conditions**; missing one makes the table a source of wrong numbers:

1. **The processes must have [conformed dimensions](conformed-dimension.md)** — otherwise you can't determine
   which row pairs with which.
2. **The metrics must be [conformed facts](conformed-facts.md)** — "revenue" on the actual side and the
   plan side must use the same formula. If the plan includes VAT and the actual doesn't, the
   `chenh_lech` column measures a definitional discrepancy rather than a business one.
3. **Different delays must be handled.** The plan exists from the start of the year; actuals arrive daily. The
   December cell will have a plan and no actual — and `chenh_lech` there is −100%, a number
   arithmetically correct and meaningless in business terms.

Condition 3 is the commonest failure. The approach: add a `co_du_lieu_thuc_te` column and
**don't compute** `chenh_lech` when it's `false` — the same principle as the `da_chot` label in
[real-time fact tables](real-time-fact.md).

## When to build a summary table

| The sign | Build it? |
|---|---|
| The same `GROUP BY` runs hundreds of times a day | Yes |
| A compression ratio ≥ 10× (5 billion rows → 200 million) | Yes |
| Only 2–3× compression | No — it doesn't cover the maintenance cost |
| The questions keep changing and haven't settled | Not yet — wait for the query patterns to take shape |
| The engine already has result caching / self-managed materialized views | Consider using what's there |

The principle: **a summary table is an optimisation, and optimisations must be measured first.** Building it because
"it'll probably be faster" is adding a table you have to keep in sync forever.

## Trade-offs

| You get | You lose |
|---|---|
| Queries orders of magnitude faster | Another table to load and reconcile |
| Lower compute cost for dashboards | The risk of the two layers diverging |
| A coarse, readable grain | You can't answer questions below that grain |
| If conformed correctly, users needn't know it exists | Conform it wrongly and the error spreads to every report |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Storing `avg` in the summary table | An average of averages — 50% out |
| Storing `count(DISTINCT khach)` | Not summable; rolling it up double-counts |
| Typing `dim_thang` / `dim_quy` by hand | Labels diverging from `dim_ngay`, two reports with two numbers |
| A reload window narrower than the atomic one | The table drifts gradually — [case study](../case-studies/bang-tong-hop-lech-so.md) |
| Deleting the atomic fact once the summary exists | You lose the ability to answer new questions, irrecoverably |
| No reconciliation query | You learn about the divergence from users, not from CI |

## FAQ

<details>
<summary>So where does `count(DISTINCT khach)` go?</summary>

It can't be stored in a summary table the ordinary way, because January's and February's distinct customer counts
**don't add up to** the quarter's.

Two routes: (a) recompute from the atomic table when needed — accepting slowness; (b) store an additive
approximate structure such as a HyperLogLog sketch, which modern engines (DuckDB, Trino, BigQuery) all have. Route (b)
gives a few percent of error in exchange for being summable at every level.

</details>

<details>
<summary>Should users see the summary table?</summary>

Kimball advises: **no**. Ideally query rewriting picks the right table and whoever writes the
query only knows the atomic fact. If the platform can't do that (most lakehouses today can't),
then name it clearly (`agg_`) and write the grain into the table description — so nobody accidentally joins the
summary table to the detailed fact and inflates the numbers, as in the [case study on joining two facts](../case-studies/join-hai-fact-lam-phong-tong.md).

</details>

<details>
<summary>Can a summary table replace the atomic fact?</summary>

No. A summary table can only answer questions **at or above** its own grain. Dropping the atomic one
loses the ability to answer every unanticipated question — and new questions are exactly what always
appear.

Kimball says it plainly: an aggregate is **an acceleration layer standing beside** the atomic one, not a
replacement. Ideally whoever writes queries knows only the atomic fact and the engine picks the right table itself.

</details>

## Related Topics

- [Facts and dimensions](../reference/fact-and-dimension.md) — additivity decides which column may enter a summary table
- [Conformed dimensions](conformed-dimension.md) — the conformance condition applied to a shrunken dimension
- [The date dimension](../reference/date-dimension.md) — `dim_quy` must be generated from `dim_ngay`
- [Late-arriving data](late-arriving.md) — the number-one reason a summary table drifts
- [CS: the summary table with divergent numbers](../case-studies/bang-tong-hop-lech-so.md)

## References

- Kimball Group — [Aggregate Fact Tables / Shrunken Rollup Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 15
