---
title: Bridge tables
sidebar_position: 7
description: A many-to-many relationship between a fact and a dimension — a bridge table with allocation factors so the total doesn't double.
tags: [bridge-table, many-to-many, dimension, data-modeling, kimball]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Bridge tables

> **Takeaway:** when a fact and a dimension are related **many-to-many**, joining directly duplicates rows and
> the total amount inflates. A bridge table solves it, but only with an **allocation
> factor** — and you have to choose in advance: summing to the right total, or summing correctly per member.

## The goal

To handle the situation the basic dimensional model can't take: one fact row belonging to **several**
dimension values at once.

## When you meet it

| Situation | Where the many-to-many is |
|---|---|
| One account with several owners | `fct_giao_dich` ↔ `dim_khach_hang` |
| One product in several categories | `fct_ban_hang` ↔ `dim_danh_muc` |
| One medical record with several diagnoses | `fct_kham_benh` ↔ `dim_chan_doan` |

The sign to look for: the question *"one fact row corresponds to **how many** dimension values"* is answered
with "it varies".

## Why not join directly

A 1,000,000đ transaction on an account with 3 owners. If `fct_giao_dich` joins the
`tai_khoan_chu_so_huu` table directly:

```text
giao_dich | khach   | so_tien
GD001     | KH001   | 1.000.000
GD001     | KH002   | 1.000.000
GD001     | KH003   | 1.000.000
```

`SUM(so_tien)` = **3,000,000**. The transaction was only a million.

This bug is hard to catch because the fact's `count(*)` is still right if counted before the join, and no
ready-made test exists for it.

## The worked example

Runs on DuckDB.

### Step 1 — the source data

```sql
CREATE TABLE fct_giao_dich (giao_dich_id VARCHAR, tai_khoan_id VARCHAR, so_tien DECIMAL(18,2));
INSERT INTO fct_giao_dich VALUES
  ('GD001','TK01', 1000000),
  ('GD002','TK02',  500000),
  ('GD003','TK01',  300000);

-- TK01 co 3 chu, TK02 co 1 chu
CREATE TABLE tai_khoan_chu (tai_khoan_id VARCHAR, ma_khach VARCHAR);
INSERT INTO tai_khoan_chu VALUES
  ('TK01','KH001'), ('TK01','KH002'), ('TK01','KH003'), ('TK02','KH004');
```

### Step 2 — a bridge table with an allocation factor

The `he_so` column is what distinguishes a bridge table from an ordinary link table:

```sql
CREATE TABLE bridge_tai_khoan_khach AS
SELECT
  tai_khoan_id,
  ma_khach,
  1.0 / count(*) OVER (PARTITION BY tai_khoan_id) AS he_so
FROM tai_khoan_chu;
```

`TK01` → each owner gets a factor of `0.333…`; `TK02` → a factor of `1.0`. The factors for each account
always sum to 1 — that's the invariant to preserve.

### Step 3 — two ways of summing, for two different questions

This is where you must **choose**, not where there's a single answer:

```sql
-- A. Có phân bổ: tổng toàn hệ thống ĐÚNG, số của từng khách là phần được chia
SELECT b.ma_khach, sum(f.so_tien * b.he_so) AS gia_tri_phan_bo
FROM fct_giao_dich f
JOIN bridge_tai_khoan_khach b USING (tai_khoan_id)
GROUP BY b.ma_khach
ORDER BY gia_tri_phan_bo DESC;

-- B. Không phân bổ: mỗi khách thấy TOÀN BỘ giao dịch mình liên quan,
--    nhưng KHÔNG được cộng tổng lại
SELECT b.ma_khach, sum(f.so_tien) AS gia_tri_lien_quan
FROM fct_giao_dich f
JOIN bridge_tai_khoan_khach b USING (tai_khoan_id)
GROUP BY b.ma_khach;
```

```text
A. Có phân bổ                      B. Không phân bổ
┌──────────┬─────────────────┐     ┌──────────┬───────────────────┐
│ ma_khach │ gia_tri_phan_bo │     │ ma_khach │ gia_tri_lien_quan │
├──────────┼─────────────────┤     ├──────────┼───────────────────┤
│ KH004    │        500000.0 │     │ KH001    │        1300000.00 │
│ KH001    │       433333.33 │     │ KH002    │        1300000.00 │
│ KH002    │       433333.33 │     │ KH003    │        1300000.00 │
│ KH003    │       433333.33 │     │ KH004    │         500000.00 │
└──────────┴─────────────────┘     └──────────┴───────────────────┘
   tổng = 1.800.000 ✅                tổng = 4.400.000 ❌
```

The real total is **1,800,000**. Column A adds up correctly; column B adds up to 4,400,000 — inflated
by a factor of 2.4. Both are **correct for their own question**; the error is adding up the wrong column.

| Business question | Use approach |
|---|---|
| "Total system-wide sales" | **A** — B will inflate |
| "How much money is this customer involved with" | **B** — A divides it up and doesn't reflect involvement |
| A report with both | Two separate columns, **named differently** |

The naming is the most important part. Call them both `doanh_thu` and sooner or later somebody adds the wrong one.

### Step 4 — the mandatory tests

The invariants must be checked, not trusted:

```sql
-- 1. tong he so moi tai khoan phai bang 1
SELECT tai_khoan_id, sum(he_so) AS tong
FROM bridge_tai_khoan_khach GROUP BY tai_khoan_id HAVING abs(sum(he_so) - 1.0) > 1e-9;

-- 2. tong sau phan bo phai bang tong goc
SELECT
  (SELECT sum(so_tien) FROM fct_giao_dich)                               AS goc,
  (SELECT sum(f.so_tien * b.he_so) FROM fct_giao_dich f
     JOIN bridge_tai_khoan_khach b USING (tai_khoan_id))                 AS sau_phan_bo;
```

```text
Test 1 — tong he so <> 1        Test 2 — tong truoc/sau
┌──────────────┬────────┐       ┌───────────────┬─────────────┐
│ tai_khoan_id │  tong  │       │      goc      │ sau_phan_bo │
├──────────────┼────────┤       ├───────────────┼─────────────┤
└──────────────┴────────┘       │    1800000.00 │   1800000.0 │
        0 rows                  └───────────────┴─────────────┘
```

Test 1 returns no rows and test 2's two figures match — the bridge is healthy.

If test 1 returns any row, the bridge is broken. If test 2 diverges, transactions are lost or multiplied — usually
because an account has no owner in the bridge.

### Before and after

| | Joining directly | A bridge with factors |
|---|---|---|
| System-wide `SUM` | 3× for a 3-owner account | correct |
| Filtering by one customer | works | works |
| Rows returned | duplicated | duplicated (the nature of many-to-many) |
| A protective test | none | the factors sum to 1 |

## When NOT to use it

- **A fixed, small count** (always exactly 2 owners) → two columns `chu_1_sk`, `chu_2_sk` are simpler.
- **You only need one representative value** (the primary account holder) → an ordinary key, no bridge needed.
- **A many-to-many between two dimensions**, not involving a fact → its own hierarchy table.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| A bridge with no `he_so` | The total inflates, with no way to fix it afterwards |
| Summing the unallocated column and reporting it as revenue | Wrong numbers with no error reported — the most dangerous |
| Factors that don't sum to 1 | The total silently diverges; you must have a test |
| Using a bridge when the count is fixed | Pointless complication |
| An account with no owner in the bridge | The `JOIN` loses the transaction — use a `LEFT JOIN` or add an "unknown" row |

## Related Topics

- [Facts and dimensions](../reference/fact-and-dimension.md) — the basic model assumes one-to-many
- [Grain](../reference/grain.md) — a bridge does **not** change the fact's grain
- [Junk dimensions](junk-dimension.md) — also adding a side table, but for low-cardinality columns
- [The six quality dimensions](../../data-quality/six-dimensions.md) — the *accuracy* dimension, the only place that catches an inflated sum
