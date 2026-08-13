---
title: The level-3 category report seeing only half the revenue
sidebar_position: 10
description: "A category tree 1–3 levels deep flattened into three fixed columns; products attached at levels 1 and 2 fall into NULL and get filtered out."
tags: [case-study, hierarchy, ragged-hierarchy, bridge-table, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# The level-3 category report seeing only half the revenue

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** a tree of uneven depth flattened into fixed columns puts its shallow branches into
> `NULL`. BI filters `NULL` by default, and the data **vanishes silently**. See
> [hierarchies](../skills/hierarchy.md).

## Context

A retailer's product category tree. Long-established product lines are subdivided deeply; new
lines haven't been subdivided by anybody yet.

```text
Dien tu (cap 1)
├── Dien thoai (cap 2)
│   └── Smartphone (cap 3)     ← SP-01, doanh thu 500
└── Phu kien (cap 2)           ← SP-02, doanh thu 300
Thoi trang (cap 1)             ← SP-03, doanh thu 200
```

```sql
CREATE TABLE danh_muc AS
SELECT * FROM (VALUES
  (1, 'Dien tu', NULL), (2, 'Dien thoai', 1), (3, 'Smartphone', 2),
  (4, 'Phu kien', 1),   (5, 'Thoi trang', NULL)
) t(dm_id, ten, cha_id);

CREATE TABLE fct_ban AS
SELECT * FROM (VALUES ('SP-01', 3, 500), ('SP-02', 4, 300), ('SP-03', 5, 200))
  t(san_pham, dm_id, doanh_thu);
```

The real total: **1,000**.

The dimension is flattened into three columns — the standard approach for a hierarchy, and the only one
BI drill-down tools understand:

```sql
CREATE TABLE dim_dm_det AS
SELECT l3.dm_id,
       coalesce(l1.ten, l2.ten, l3.ten) AS cap_1,
       CASE WHEN l1.ten IS NOT NULL THEN l2.ten
            WHEN l2.ten IS NOT NULL THEN l3.ten END AS cap_2,
       CASE WHEN l1.ten IS NOT NULL THEN l3.ten END  AS cap_3
FROM danh_muc l3
LEFT JOIN danh_muc l2 ON l3.cha_id = l2.dm_id
LEFT JOIN danh_muc l1 ON l2.cha_id = l1.dm_id;
```

```text
┌───────┬────────────┬────────────┬────────────┐
│ dm_id │   cap_1    │   cap_2    │   cap_3    │
├───────┼────────────┼────────────┼────────────┤
│     1 │ Dien tu    │ NULL       │ NULL       │
│     2 │ Dien tu    │ Dien thoai │ NULL       │
│     3 │ Dien tu    │ Dien thoai │ Smartphone │
│     4 │ Dien tu    │ Phu kien   │ NULL       │
│     5 │ Thoi trang │ NULL       │ NULL       │
└───────┴────────────┴────────────┴────────────┘
```

## Symptoms

The *"revenue by level-3 category"* report shows exactly **one row**: Smartphone 500.

At first nobody questions it — it looks as though the company only sells smartphones at the most detailed
level. The problem surfaces when somebody compares this report's total against total company revenue.

```sql
SELECT sum(f.doanh_thu) FILTER (WHERE d.cap_3 IS NOT NULL) AS vao_bao_cao,
       sum(f.doanh_thu) FILTER (WHERE d.cap_3 IS NULL)     AS bi_bo_ra,
       round(100.0 * sum(f.doanh_thu) FILTER (WHERE d.cap_3 IS NULL)
             / sum(f.doanh_thu), 1)                        AS mat_pct
FROM fct_ban f JOIN dim_dm_det d USING (dm_id);
```

```text
┌─────────────┬──────────┬─────────┐
│ vao_bao_cao │ bi_bo_ra │ mat_pct │
├─────────────┼──────────┼─────────┤
│         500 │      500 │    50.0 │
└─────────────┴──────────┴─────────┘
```

**Half the revenue isn't present in the report.**

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| Products not assigned a category | Checked: every product has a valid `dm_id` |
| The `JOIN` dropping rows because of an orphaned key | A `LEFT JOIN` gives the same result — no rows lost at the join |
| The fact is missing data | `sum(doanh_thu)` on the fact = 1,000, complete |
| BI's filter is misconfigured | **Nearly right** — BI filters `NULL`, but where the `NULL` comes from is the real question |

Where the time goes: everybody looks for **lost rows**. No row is lost — all 3 fact rows
take part in the join. What's lost is the **label**: two of the three rows have no value in the column being
`GROUP BY`ed.

The clarifying question: *"does the row count after the join equal the fact's row count?"* It does. So the problem
isn't the join, it's the column being grouped by.

## The real cause

A **ragged** tree (1–3 levels deep) was modelled with a **fixed depth** structure (exactly 3 levels).

A product attached to a level-2 node (`Phu kien`) or a level-1 node (`Thoi trang`) has no `cap_3` value.
They get `NULL`, and:

- BI hides the `NULL` group by default, or
- whoever wrote the query added `WHERE cap_3 IS NOT NULL` "to clean the report up".

Both routes lead to the same result: data excluded in a way that's entirely valid SQL, with
nothing reported.

The crucial point: **`NULL` here doesn't mean "data missing"**, it means "this branch is only that
deep". Two completely different meanings crammed into the same value.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on the fact's `dm_id` | ✅ green |
| `relationships` fact → the category dim | ✅ green |
| `not_null` on `cap_1` | ✅ green |
| `not_null` on `cap_3` | ❌ — so **nobody writes this test**, because `NULL` is legitimate |
| The fact total matching the source | ✅ green |

The fourth row is the crux. Everybody knows `cap_3` is allowed to be `NULL`, so there's no test
there. And because `NULL` is legitimate, there's no threshold to alarm on when the `NULL` rate hits 50%.

The correct test has to ask at a different layer: *"does the grouped report's total equal the fact's
total?"*

## The fix

Two routes, depending on how ragged the tree is.

### If the tree is only slightly ragged — pull the parent level down

```sql
CREATE TABLE dim_dm_keo AS
SELECT dm_id, cap_1,
       coalesce(cap_2, cap_1)        AS cap_2,
       coalesce(cap_3, cap_2, cap_1) AS cap_3
FROM dim_dm_det;
```

```text
┌────────────┬───────────┐
│   cap_3    │ doanh_thu │
├────────────┼───────────┤
│ Smartphone │       500 │
│ Phu kien   │       300 │
│ Thoi trang │       200 │
└────────────┴───────────┘
```

The total matches 1,000 and BI keeps working as before. What you lose: the `cap_3` column now contains nodes that aren't
genuinely level 3, so *"how many level-3 categories are there"* can no longer be asked of this table.

### If the tree is arbitrarily deep — a path bridge

```sql
CREATE TABLE bridge_dm AS
WITH RECURSIVE duong_di(to_tien_id, con_id, so_cap) AS (
    SELECT dm_id, dm_id, 0 FROM danh_muc
  UNION ALL
    SELECT d.cha_id, p.con_id, p.so_cap + 1
    FROM duong_di p JOIN danh_muc d ON p.to_tien_id = d.dm_id
    WHERE d.cha_id IS NOT NULL
)
SELECT * FROM duong_di;

SELECT t.ten AS danh_muc, sum(f.doanh_thu) AS doanh_thu_ca_nhanh
FROM fct_ban f
JOIN bridge_dm b ON b.con_id = f.dm_id
JOIN danh_muc t  ON t.dm_id  = b.to_tien_id
GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌────────────┬────────────────────┐
│  danh_muc  │ doanh_thu_ca_nhanh │
├────────────┼────────────────────┤
│ Dien tu    │                800 │
│ Smartphone │                500 │
│ Dien thoai │                500 │
│ Phu kien   │                300 │
│ Thoi trang │                200 │
└────────────┴────────────────────┘
```

Correct rollup for **every node**, at every depth. `Dien tu` = 800 = 500 (2 levels away) + 300
(1 level away).

In exchange you must remember: the bridge table **deliberately duplicates rows**, so a whole-table `SUM` gives 2,300.
For a correct total, filter down to one level:

```sql
SELECT sum(f.doanh_thu) AS tong_qua_bridge
FROM fct_ban f
JOIN bridge_dm b ON b.con_id = f.dm_id
JOIN danh_muc t  ON t.dm_id  = b.to_tien_id
WHERE t.cha_id IS NULL;
```

```text
┌─────────────────┐
│ tong_qua_bridge │
├─────────────────┤
│            1000 │
└─────────────────┘
```

| | Fixed flattening | Pulling the parent down | A bridge |
|---|---|---|---|
| Leaf-level reported revenue | 500 (**50% lost**) | 1,000 | 1,000 |
| Adding a new level | Change the DDL + every report | Change the DDL | Change nothing |
| Double-counting risk | No | No | **Yes** |

## How to spot it early

1. Measure the `NULL` rate at the deepest level — that number is worth making a `severity: warn` test:

```sql
SELECT count(*)                                  AS tong,
       count(*) FILTER (WHERE cap_3 IS NULL)     AS thieu_cap_3,
       round(100.0 * count(*) FILTER (WHERE cap_3 IS NULL) / count(*), 1) AS pct
FROM dim_dm_det;
```

2. Reconcile the grouped report's total against the fact's total. A difference = a group is being filtered out.

3. Ask the business: *"does this tree have branches shallower than others?"* Yes = don't flatten to a fixed
   depth.

4. `WHERE cap_N IS NOT NULL` appearing in the codebase — that's data loss written into
   code.

## Related Topics

- [Hierarchies](../skills/hierarchy.md) — the three tree kinds and how to build each
- [Bridge tables](../skills/bridge-table.md) — the same row-duplicating mechanism
- [Grain](../reference/grain.md) — joining a bridge changes the result's grain
- [CS: half the orders vanished](don-dang-giao-bien-mat.md) — also silent data loss, by a different mechanism
