---
title: Hierarchies — fixed, slightly ragged and fully ragged
sidebar_position: 9
description: "A category tree or org chart with uneven depth: a fixed flattened table loses rows, while a path bridge makes rollup correct at every level."
tags: [hierarchy, ragged-hierarchy, bridge-table, dimension, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Hierarchies — fixed, slightly ragged and fully ragged

> **Takeaway:** for a tree of **even** depth, flattening into columns (`cap_1`, `cap_2`, `cap_3`) is the
> fastest and most understandable approach. Flatten a tree of **uneven** depth and every leaf-level report
> silently abandons part of the data — while the total still looks plausible.

## Three tree kinds, three approaches

Kimball separates the three cases clearly; choosing wrongly at the start is the source of all the trouble that follows:

| Kind | Characteristics | How to build it |
|---|---|---|
| **Fixed depth** | Every branch exactly N levels, each level with its own name | Flatten into N columns in the dimension |
| **Slightly ragged** | Depth 2–4, a small spread, with a known upper bound | Flatten to the deepest level + pull the parent level down to fill the gaps |
| **Ragged** | Arbitrary depth, changing over time (an org chart, a chart of accounts) | A **path bridge** (a closure table) |

The one-sentence test: *"if a level were inserted in the middle tomorrow, what would have to change?"* If the answer is
"the DDL and every report", you're using fixed depth for a ragged tree.

## The worked example

A product category tree, depth 1 to 3 — entirely normal in retail: big product lines
get subdivided, while new lines haven't been yet.

```text
Dien tu (1)
├── Dien thoai (2)
│   └── Smartphone (3)     ← SP-01, doanh thu 500
└── Phu kien (2)           ← SP-02, doanh thu 300
Thoi trang (1)             ← SP-03, doanh thu 200
```

```sql
CREATE TABLE danh_muc AS
SELECT * FROM (VALUES
  (1, 'Dien tu',    NULL),
  (2, 'Dien thoai', 1),
  (3, 'Smartphone', 2),
  (4, 'Phu kien',   1),
  (5, 'Thoi trang', NULL)
) t(dm_id, ten, cha_id);

CREATE TABLE fct_ban AS
SELECT * FROM (VALUES
  ('SP-01', 3, 500),   -- gan o la cap 3
  ('SP-02', 4, 300),   -- gan o la cap 2
  ('SP-03', 5, 200)    -- gan o la cap 1
) t(san_pham, dm_id, doanh_thu);
```

The real total: **1,000**.

### Approach 1 — flattening to a fixed 3 levels

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

The table looks fine. The problem appears in the first leaf-level report:

```sql
SELECT coalesce(d.cap_3, '(khong co cap 3)') AS cap_3, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_dm_det d USING (dm_id)
GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌──────────────────┬───────────┐
│      cap_3       │ doanh_thu │
├──────────────────┼───────────┤
│ Smartphone       │       500 │
│ (khong co cap 3) │       500 │
└──────────────────┴───────────┘
```

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

**Half the revenue** falls into the `NULL` bucket. In BI, a `NULL` bucket is usually filtered by default or
skimmed past by the viewer — so the report shows 500 and nobody sees where the other 500 went.

### Approach 2 — pulling the parent level down (slightly ragged)

The cheapest fix for a **slightly** ragged tree: fill the `NULL` with the level above's own value.

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

The total matches 1,000 again, the `NULL` is gone, and every BI drill-down works.

**What you have to accept:** the `cap_3` column now contains nodes that aren't genuinely level 3. The question
*"how many level-3 categories are there"* is no longer answerable from this table. A reasonable trade-off when the depth
spread is 1–2 levels with a known upper bound; entirely wrong when the tree can be arbitrarily deep.

### Approach 3 — a path bridge, for a fully ragged tree

Generate every (ancestor → descendant) pair, including the node itself at distance 0:

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
```

```text
┌────────────┬────────────┬────────┬────────────┬────────┐
│ to_tien_id │  to_tien   │ con_id │    con     │ so_cap │
├────────────┼────────────┼────────┼────────────┼────────┤
│          1 │ Dien tu    │      1 │ Dien tu    │      0 │
│          1 │ Dien tu    │      2 │ Dien thoai │      1 │
│          1 │ Dien tu    │      4 │ Phu kien   │      1 │
│          1 │ Dien tu    │      3 │ Smartphone │      2 │
│          2 │ Dien thoai │      2 │ Dien thoai │      0 │
│          2 │ Dien thoai │      3 │ Smartphone │      1 │
│          3 │ Smartphone │      3 │ Smartphone │      0 │
│          4 │ Phu kien   │      4 │ Phu kien   │      0 │
│          5 │ Thoi trang │      5 │ Thoi trang │      0 │
└────────────┴────────────┴────────┴────────────┴────────┘
```

Now you can roll up for **any node**, at any depth, in exactly one statement:

```sql
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

`Dien tu` = 800 = 500 (Smartphone, 2 levels away) + 300 (Phu kien, 1 level away). With no extra
configuration.

**An important note:** this table **deliberately** duplicates rows — summing the whole `doanh_thu_ca_nhanh`
column gives 2,300, not 1,000. That's the nature of a bridge, exactly the warning in
[bridge tables](bridge-table.md). For a correct total, filter down to a single level:

```sql
SELECT sum(f.doanh_thu) AS tong_qua_bridge
FROM fct_ban f
JOIN bridge_dm b ON b.con_id = f.dm_id
JOIN danh_muc t  ON t.dm_id  = b.to_tien_id
WHERE t.cha_id IS NULL;          -- chi cac node goc
```

```text
┌─────────────────┐
│ tong_qua_bridge │
├─────────────────┤
│            1000 │
└─────────────────┘
```

### The three approaches compared

| | Fixed flattening | Pulling the parent down | A path bridge |
|---|---|---|---|
| Leaf-level reported revenue | 500 (**50% lost**) | 1,000 | 1,000 |
| Rollup for a mid-tree node | Only nodes with their own level | Yes, but the labels are muddled | Every node |
| Adding a new level | Change the DDL + every report | Change the DDL | **Change nothing** |
| The report's SQL | `GROUP BY cap_2` | `GROUP BY cap_2` | One extra join |
| Double-counting risk | No | No | **Yes** — you must filter `so_cap` or a level |
| BI drill-down out of the box | Yes | Yes | Needs configuring |

## Which to choose when

```text
Do sau co co dinh va on dinh khong?
├── Co  → det co dinh (cap_1..cap_N). Don gian nhat, dung nhat.
└── Khong
     ├── Chenh 1–2 cap, biet truoc can tren, it doi
     │    → keo cap cha xuong. Re, BI dung duoc ngay.
     └── Sau tuy y, hoac cau truc doi theo thoi gian
          → bridge duong di. Ton mot join, doi lai khong bao gio phai sua DDL.
```

An HR org chart and an accounting chart of accounts **always** belong in the last branch. Don't try to flatten
them.

## A tree that changes over time

A bridge solves depth, not time. If `Phu kien` gets moved under `Thoi trang` next month, what happens
to last month's report?

That's exactly the [SCD](scd.md) question, applied to the bridge table: add `hieu_luc_tu` /
`hieu_luc_den` to each path pair, then join on the transaction date.

```sql
SELECT t.ten, sum(f.doanh_thu)
FROM fct_ban f
JOIN bridge_dm b ON b.con_id = f.dm_id
                AND f.ngay >= b.hieu_luc_tu AND f.ngay < b.hieu_luc_den
JOIN danh_muc t ON t.dm_id = b.to_tien_id
GROUP BY 1;
```

Without those two columns, one restructuring of the tree means **all the reporting history changes its numbers** —
the same mechanism as the [case study on historical reports changing their own numbers](../case-studies/bao-cao-qua-khu-tu-doi-so.md).

## Trade-offs

| You get | You lose |
|---|---|
| A bridge: correct rollup at every level, no DDL changes | One extra join, and **you must understand the double-counting risk** |
| Flattening: BI drill-down works immediately, nothing to teach anybody | It dies when the tree is ragged — silent data loss |
| Pulling the parent down: cheap, and the total matches | The level labels no longer mean what they say |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Fixed flattening for a ragged tree | The leaf-level report loses 50% of revenue — [case study](../case-studies/bao-cao-cap-3-mat-mot-nua.md) |
| Filtering `WHERE cap_3 IS NOT NULL` "to keep it clean" | It formalises the data loss |
| `SUM`ming the whole table after joining a bridge | Double counting — 2,300 instead of 1,000 |
| A bridge with no validity columns | One tree restructuring changes all the reporting history |
| Recursion without cycle protection | A tree with a cycle makes the query run forever |

## Related Topics

- [Bridge tables](bridge-table.md) — the same row-duplicating mechanism, for many-to-many relationships
- [SCD](scd.md) — when the tree structure itself changes over time
- [Star, snowflake, OBT](../reference/star-snowflake-obt.md) — flattening a tree is a form of denormalisation
- [Grain](../reference/grain.md) — joining a bridge changes the result's grain, which must be redeclared
- [CS: the level-3 report losing half the revenue](../case-studies/bao-cao-cap-3-mat-mot-nua.md)

## References

- Kimball Group — [Ragged/Variable Depth Hierarchies](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 7
