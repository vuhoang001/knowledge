---
title: Designing dimension attributes
sidebar_position: 16
description: "Y/N flags and 1/0 codes make reports unreadable; several parallel hierarchies living in one dimension; the right home for free-text notes."
tags: [dimension, attribute, hierarchy, drill-down, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Designing dimension attributes

> **Takeaway:** a dimension isn't a place to store data, it's **the data warehouse's user
> interface**. Every label on a report comes from here. `Y`, `1`, `A` are the source system's
> language; a report has to speak human.

## The three jobs a dimension attribute must do

| The job | Kimball calls it | When it fails |
|---|---|---|
| Providing labels to filter and group by | Flags & indicators as textual attributes | Reports full of `Y`/`N`/`1`/`0` |
| Providing a path from general down to detail | Drilling down · multiple hierarchies | You can't drill, or only in one direction |
| Holding free-text descriptions | Text comments | Notes end up in the fact, destroying the grain |

## Trap 1 — coded flags

```sql
CREATE TABLE dim_sp_ma AS
SELECT * FROM (VALUES
  (1, 'SP-A', 'Y', 1, 'A'), (2, 'SP-B', 'N', 0, 'B'),
  (3, 'SP-C', 'Y', 1, 'A'), (4, 'SP-D', 'y', 0, 'C')
) t(sp_sk, san_pham, hang_moi, khuyen_mai, phan_loai_abc);
```

The report comes out like this:

```text
┌──────────┬────────────┬───────────┐
│ hang_moi │ khuyen_mai │ doanh_thu │
├──────────┼────────────┼───────────┤
│ Y        │          1 │       700 │
│ N        │          0 │       300 │
│ y        │          0 │       100 │
└──────────┴────────────┴───────────┘
```

Three problems in a three-row table:

1. **`Y` and `y` become two groups.** The same concept, two separate rows.
2. **`1` and `0` in the `khuyen_mai` column** — the reader has to guess whether `1` means yes or no.
3. **It isn't self-explanatory.** A column named `hang_moi` with the value `N` — "not a new product"? Or
   "undetermined"?

```sql
SELECT count(DISTINCT hang_moi) AS so_gia_tri_hang_moi,
       list(DISTINCT hang_moi)  AS cac_gia_tri
FROM dim_sp_ma;
```

```text
┌─────────────────────┬─────────────┐
│ so_gia_tri_hang_moi │ cac_gia_tri │
├─────────────────────┼─────────────┤
│                   3 │ [Y, N, y]   │
└─────────────────────┴─────────────┘
```

**Three values for a binary concept.** This is where the data starts fragmenting, and it
spreads to every report using that column.

### The fix — decode at the dimension layer

```sql
CREATE TABLE dim_sp AS
SELECT sp_sk, san_pham,
       CASE upper(hang_moi) WHEN 'Y' THEN 'Hang moi' ELSE 'Hang thuong' END AS tinh_trang_hang,
       CASE khuyen_mai WHEN 1 THEN 'Dang khuyen mai' ELSE 'Khong khuyen mai' END AS tinh_trang_km,
       CASE phan_loai_abc WHEN 'A' THEN 'A - ban chay'
                          WHEN 'B' THEN 'B - trung binh'
                          ELSE 'C - ban cham' END AS nhom_abc
FROM dim_sp_ma;
```

```text
┌─────────────────┬──────────────────┬───────────┐
│ tinh_trang_hang │  tinh_trang_km   │ doanh_thu │
├─────────────────┼──────────────────┼───────────┤
│ Hang moi        │ Dang khuyen mai  │       700 │
│ Hang thuong     │ Khong khuyen mai │       300 │
│ Hang moi        │ Khong khuyen mai │       100 │
└─────────────────┴──────────────────┴───────────┘
```

The same data, and the report is now readable without a legend. `Y` and `y` group together correctly.

Three rules to take away:

- **Decode once, at the dimension layer** — not in each query or each
  dashboard. This is also why a dashboard shouldn't contain `CASE WHEN`.
- **A label must be self-explanatory standing alone.** `Hang thuong` reads; `N` doesn't.
- **Keep the original code in its own column** (`ma_hang_moi`) for reconciling with the source — but
  end users don't see it.

Flags with few values that usually travel together belong in a [junk dimension](junk-dimension.md).

## Several hierarchies in one dimension

A product is viewed several ways depending on who's asking. The sales team classifies by product line;
accounting classifies by account type. Kimball calls this **multiple hierarchies**, and the handling
is simpler than people expect: **add columns, not tables.**

```sql
CREATE TABLE dim_sp_2cay AS
SELECT * FROM (VALUES
  (1, 'SP-A', 'Dien tu',    'Dien thoai', 'Hang hoa', 'Tai san ngan han'),
  (2, 'SP-B', 'Dien tu',    'Phu kien',   'Hang hoa', 'Tai san ngan han'),
  (3, 'SP-C', 'Dich vu',    'Bao hanh',   'Dich vu',  'Doanh thu khac'),
  (4, 'SP-D', 'Thoi trang', 'Ao',         'Hang hoa', 'Tai san ngan han')
) t(sp_sk, san_pham, nganh_hang, nhom_hang, loai_ke_toan, muc_bao_cao_tc);
```

The sales tree:

```text
┌────────────┬───────────┐
│ nganh_hang │ doanh_thu │
├────────────┼───────────┤
│ Dien tu    │       800 │
│ Dich vu    │       200 │
│ Thoi trang │       100 │
└────────────┴───────────┘
```

The accounting tree — **the same dimension, the same fact, with nothing extra joined**:

```text
┌──────────────┬───────────┐
│ loai_ke_toan │ doanh_thu │
├──────────────┼───────────┤
│ Hang hoa     │       900 │
│ Dich vu      │       200 │
└──────────────┴───────────┘
```

The invariant to check: the two trees group differently but **the totals must match**.

```sql
SELECT (SELECT sum(f.doanh_thu) FROM fct_ban f JOIN dim_sp_2cay d USING (sp_sk)) AS tong,
       (SELECT count(DISTINCT nganh_hang)   FROM dim_sp_2cay) AS so_nhom_cay_ban_hang,
       (SELECT count(DISTINCT loai_ke_toan) FROM dim_sp_2cay) AS so_nhom_cay_ke_toan;
```

```text
┌────────┬──────────────────────┬─────────────────────┐
│  tong  │ so_nhom_cay_ban_hang │ so_nhom_cay_ke_toan │
├────────┼──────────────────────┼─────────────────────┤
│   1100 │                    3 │                   2 │
└────────┴──────────────────────┴─────────────────────┘
```

800 + 200 + 100 = 900 + 200 = **1,100**. Two ways of dividing it, one total. A tree that adds up to a different number
has products unassigned, or assigned to two branches.

**The condition:** each tree must be **exhaustive and non-overlapping** — each product belongs to exactly one
branch in each tree. If a product belongs to several branches of the same tree, that's no longer
a hierarchy but a many-to-many relationship → a [bridge table](bridge-table.md).

For a tree of uneven depth, see [hierarchies](hierarchy.md).

## Drilling down isn't really a feature

Kimball emphasises something easily overlooked: **drilling down is just adding a column to the `GROUP BY`.**

```sql
GROUP BY nganh_hang                        -- muc tong quat
GROUP BY nganh_hang, nhom_hang             -- drill xuong mot cap
GROUP BY nganh_hang, nhom_hang, san_pham   -- toi chi tiet
```

No configuration, no OLAP engine. The practical consequence: **the more descriptive attributes a dimension has,
the deeper you can drill**. A 5-column dimension limits users more
than any tool limit does.

This is why Kimball advises dimensions be **wide and flat** — 50–100 columns is normal, not
a sign of poor design.

## Text comments — where free-text notes go

Note fields (`ly_do_huy`, `ghi_chu_giao_hang`) often get stuffed straight into the fact. Three problems:
it's a long string in the largest table, it can't be grouped, and it's usually duplicated.

| The case | The right home |
|---|---|
| Repeated notes with few distinct values | A small dimension the fact points a key at |
| Notes almost unique per row | Its own table keyed by the degenerate dimension (`so_don`) |
| You need to filter/group by the content | **Extract it into a structured attribute** — don't group by free text |

The last row is the most important: if users want *"count cancelled orders by reason"* then the reason
must be a **coded catalogue**, not text typed by hand. Free text is for reading, not
for grouping.

## Trade-offs

| You get | You lose |
|---|---|
| Textual labels: reports readable immediately | More space than a one-character code (dictionary compression handles that) |
| Several trees in one dimension | A wide dimension; each tree must stay exhaustive and non-overlapping |
| A wide dimension → deep drilling | Many columns to maintain and describe |
| Notes separated from the fact | One extra join when you need to read them |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Letting `Y`/`N`/`1`/`0` reach the report | Unreadable; `Y` and `y` become two groups — [case study](../case-studies/co-y-n-tren-dashboard.md) |
| Decoding with `CASE WHEN` in each dashboard | Each dashboard has its own interpretation; fix one place and miss nine |
| Building a separate table for each hierarchy | An unnecessary snowflake — adding columns is enough |
| A dimension with only a few columns "to keep it tidy" | Users can't drill and have to raise a ticket for a column |
| Grouping reports by free-text notes | Every typo becomes its own group |
| Stuffing long notes into the fact | The largest table bloats with a column nobody groups by |

## Related Topics

- [Junk dimensions](junk-dimension.md) — gathering several low-cardinality flags into one place
- [Hierarchies](hierarchy.md) — when the tree has uneven depth
- [Star, snowflake, OBT](../reference/star-snowflake-obt.md) — why dimensions should be flat
- [NULLs in facts and dimensions](null-handling.md) — what label to give an empty attribute
- [CS: a dashboard full of Y, N and y](../case-studies/co-y-n-tren-dashboard.md)

## References

- Kimball Group — [Flags and Indicators as Textual Attributes / Multiple Hierarchies / Drilling Down / Text Comments](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 3
