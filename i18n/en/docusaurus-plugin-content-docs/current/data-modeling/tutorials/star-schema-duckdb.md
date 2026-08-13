---
title: Building a star schema from scratch with DuckDB
sidebar_position: 1
description: "Walk Kimball's four design steps on real data: dim_ngay, a Type 2 dimension, a transaction fact, an accumulating snapshot, then drill-across — with output you can paste back."
tags: [tutorial, star-schema, duckdb, kimball, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Building a star schema from scratch with DuckDB

> **Takeaway:** reading ten theory files is worth less than building a working model and then breaking
> it yourself. This one goes from three raw source tables to a verifiable star schema in about
> 20 minutes, with nothing to install beyond DuckDB.

## Preparation

The lab lives **outside** this repo (see `CLAUDE.md`). Run it with the existing venv:

```bash
~/Documents/learn-lab/dbt/.venv/bin/python -c "import duckdb; print(duckdb.__version__)"
```

```text
1.5.5
```

Every SQL statement below runs as-is in an in-memory DuckDB session. The quickest way is to
paste each block into a `.py` file with `duckdb.connect()`, or open the DuckDB CLI
and paste directly.

**An empty *Your result* cell means it hasn't been run.** Once you've run it, paste the output in — and only then
fill in `verified_at` at the top of the file.

## The problem

An online shop. The business asks three questions:

1. Revenue by customer region — **by the region at purchase time**, not the current one.
2. Which stage orders are stuck at, and how long on average until they reach the customer.
3. Return rate by region.

Three questions, three different table shapes. That's why this tutorial doesn't stop at one fact.

## Step 0 — the source data

Three tables, exactly as source systems usually have them: an order header table, an order line table, and a customer
table that already carries a change history.

```sql
CREATE TABLE src_don AS
SELECT * FROM (VALUES
  ('DH-001', 'C1', DATE '2026-01-10', DATE '2026-01-12', DATE '2026-01-15', 'hoan_thanh', 'web'),
  ('DH-002', 'C1', DATE '2026-02-05', DATE '2026-02-06', NULL,              'dang_giao',  'app'),
  ('DH-003', 'C2', DATE '2026-01-20', NULL,              NULL,              'moi',        'web'),
  ('DH-004', 'C3', DATE '2026-02-18', DATE '2026-02-19', DATE '2026-02-25', 'hoan_thanh', 'app')
) t(so_don, khach_id, ngay_dat, ngay_giao, ngay_nhan, trang_thai, kenh);

CREATE TABLE src_dong_don AS
SELECT * FROM (VALUES
  ('DH-001', 1, 'SP-A', 2, 150000),
  ('DH-001', 2, 'SP-B', 1, 300000),
  ('DH-002', 1, 'SP-A', 3, 150000),
  ('DH-003', 1, 'SP-C', 1, 900000),
  ('DH-004', 1, 'SP-B', 2, 300000),
  ('DH-004', 2, 'SP-C', 1, 900000)
) t(so_don, dong_so, san_pham_id, so_luong, don_gia);

-- C1 moved from Mien Bac to Mien Nam on 01/02/2026
CREATE TABLE src_khach AS
SELECT * FROM (VALUES
  ('C1', 'Nguyen A', 'Mien Bac',   DATE '2025-01-01', DATE '2026-02-01'),
  ('C1', 'Nguyen A', 'Mien Nam',   DATE '2026-02-01', DATE '9999-12-31'),
  ('C2', 'Tran B',   'Mien Nam',   DATE '2025-01-01', DATE '9999-12-31'),
  ('C3', 'Le C',     'Mien Trung', DATE '2025-06-01', DATE '9999-12-31')
) t(khach_id, ho_ten, khu_vuc, hieu_luc_tu, hieu_luc_den);
```

Write down the source numbers **before starting** — this is the reconciliation benchmark for every step that follows:

```sql
SELECT (SELECT count(*) FROM src_don)                    AS don,
       (SELECT count(*) FROM src_dong_don)               AS dong_don,
       (SELECT sum(so_luong * don_gia) FROM src_dong_don) AS doanh_thu_nguon;
```

```text
┌───────┬──────────┬─────────────────┐
│  don  │ dong_don │ doanh_thu_nguon │
├───────┼──────────┼─────────────────┤
│     4 │        6 │         3450000 │
└───────┴──────────┴─────────────────┘
```

| Your result |
|---|
| |

## The four design steps before typing any DDL

Per [the four-step design process](../reference/design-process.md), finish this table before
writing `CREATE TABLE`:

| Step | The decision |
|---|---|
| 1. Business process | **Sales** (not "revenue reporting" — a report is an output, not a process) |
| 2. Grain | **One line of one order** — the finest the source permits |
| 3. Dimensions | Date (playing several roles), Customer (Type 2 — the business asks "at purchase time"), Product, Channel |
| 4. Facts | `so_luong`, `don_gia`, `thanh_tien` — all three additive |

Question 2 (which stage orders are stuck at) has a **different grain**: one row per *order*, not per
*order line*. A different grain means a different fact — that's step 5.

## Step 1 — dim_ngay

```sql
CREATE TABLE dim_ngay AS
WITH lich AS (
  SELECT (DATE '2026-01-01' + INTERVAL (i) DAY)::DATE AS ngay FROM range(0, 365) t(i)
)
SELECT CAST(strftime(ngay, '%Y%m%d') AS INTEGER)                 AS ngay_key,
       ngay,
       strftime(ngay, '%d/%m/%Y')                                AS ngay_hien_thi,
       ['CN','T2','T3','T4','T5','T6','T7'][dayofweek(ngay) + 1] AS thu_ten,
       month(ngay)                                               AS thang,
       'Thang ' || month(ngay) || '/' || year(ngay)               AS thang_ten,
       quarter(ngay)                                             AS quy,
       dayofweek(ngay) NOT IN (0, 6)                             AS la_ngay_lam_viec
FROM lich
UNION ALL
SELECT -1, NULL, 'Chua xay ra', NULL, NULL, 'Chua xay ra', NULL, NULL;
```

That last `UNION ALL` row is the easily-forgotten one: key `-1` for the **hasn't-happened** milestone. Order `DH-003`
isn't delivered, and leaving `NULL` would make the `JOIN` throw that whole order out of the report.

```sql
SELECT ngay_key, ngay_hien_thi, thu_ten, thang_ten, la_ngay_lam_viec
FROM dim_ngay WHERE ngay_key IN (-1, 20260110, 20260215) ORDER BY ngay_key;
```

```text
┌──────────┬───────────────┬─────────┬──────────────┬──────────────────┐
│ ngay_key │ ngay_hien_thi │ thu_ten │  thang_ten   │ la_ngay_lam_viec │
├──────────┼───────────────┼─────────┼──────────────┼──────────────────┤
│       -1 │ Chua xay ra   │ NULL    │ Chua xay ra  │ NULL             │
│ 20260110 │ 10/01/2026    │ T7      │ Thang 1/2026 │ false            │
│ 20260215 │ 15/02/2026    │ CN      │ Thang 2/2026 │ false            │
└──────────┴───────────────┴─────────┴──────────────┴──────────────────┘
```

| Your result |
|---|
| |

Why the calendar must be a table, in detail: [the date dimension](../reference/date-dimension.md).

## Step 2 — dim_khach, Type 2

```sql
CREATE TABLE dim_khach AS
SELECT row_number() OVER (ORDER BY khach_id, hieu_luc_tu) AS khach_sk,
       khach_id, ho_ten, khu_vuc, hieu_luc_tu, hieu_luc_den,
       hieu_luc_den = DATE '9999-12-31' AS la_hien_tai
FROM src_khach
UNION ALL
SELECT 0, '(chua biet)', '(chua biet)', '(chua biet)',
       DATE '1900-01-01', DATE '9999-12-31', true;
```

```text
┌──────────┬─────────────┬─────────────┬─────────────┬──────────────┬─────────────┐
│ khach_sk │  khach_id   │   khu_vuc   │ hieu_luc_tu │ hieu_luc_den │ la_hien_tai │
├──────────┼─────────────┼─────────────┼─────────────┼──────────────┼─────────────┤
│        0 │ (chua biet) │ (chua biet) │ 1900-01-01  │ 9999-12-31   │ true        │
│        1 │ C1          │ Mien Bac    │ 2025-01-01  │ 2026-02-01   │ false       │
│        2 │ C1          │ Mien Nam    │ 2026-02-01  │ 9999-12-31   │ true        │
│        3 │ C2          │ Mien Nam    │ 2025-01-01  │ 9999-12-31   │ true        │
│        4 │ C3          │ Mien Trung  │ 2025-06-01  │ 9999-12-31   │ true        │
└──────────┴─────────────┴─────────────┴─────────────┴──────────────┴─────────────┘
```

| Your result |
|---|
| |

Two details worth remembering:

- `C1` has **two rows** — one customer, two versions. A Type 2 dimension's grain is
  *one version*, not *one customer*. See [SCD](../skills/scd.md).
- The `khach_sk = 0` row is the shelter for a non-matching key
  (an [inferred member](../skills/late-arriving.md)) — thanks to it, the fact never needs a
  `NULL` key.

## Step 3 — the transaction fact

The decisive point is the join condition: **in effect at the order date**, not
`la_hien_tai`.

```sql
CREATE TABLE fct_ban AS
SELECT d.so_don,                                              -- degenerate dimension
       dd.dong_so,
       CAST(strftime(d.ngay_dat, '%Y%m%d') AS INTEGER)        AS ngay_dat_key,
       coalesce(k.khach_sk, 0)                                AS khach_sk,
       dd.san_pham_id,
       d.kenh,
       dd.so_luong,
       dd.don_gia,
       dd.so_luong * dd.don_gia                               AS thanh_tien
FROM src_don d
JOIN src_dong_don dd USING (so_don)
LEFT JOIN dim_khach k
  ON k.khach_id = d.khach_id
 AND d.ngay_dat >= k.hieu_luc_tu AND d.ngay_dat < k.hieu_luc_den;
```

```text
┌─────────┬─────────┬──────────────┬──────────┬─────────────┬──────────┬────────────┐
│ so_don  │ dong_so │ ngay_dat_key │ khach_sk │ san_pham_id │ so_luong │ thanh_tien │
├─────────┼─────────┼──────────────┼──────────┼─────────────┼──────────┼────────────┤
│ DH-001  │       1 │     20260110 │        1 │ SP-A        │        2 │     300000 │
│ DH-001  │       2 │     20260110 │        1 │ SP-B        │        1 │     300000 │
│ DH-002  │       1 │     20260205 │        2 │ SP-A        │        3 │     450000 │
│ DH-003  │       1 │     20260120 │        3 │ SP-C        │        1 │     900000 │
│ DH-004  │       1 │     20260218 │        4 │ SP-B        │        2 │     600000 │
│ DH-004  │       2 │     20260218 │        4 │ SP-C        │        1 │     900000 │
└─────────┴─────────┴──────────────┴──────────┴─────────────┴──────────┴────────────┘
```

| Your result |
|---|
| |

Notice `DH-001` carrying `khach_sk = 1` (the North) while `DH-002` carries `khach_sk = 2` (the South)
— **the same customer `C1`**. That's as-was at work.

And `so_don` stays in the fact as an ordinary column, with no `dim_don_hang`:
a [degenerate dimension](../skills/degenerate-dimension.md).

## Step 4 — the four mandatory checks

This is the part usually skipped, and also the part most worth keeping. Run it after **every** model
rebuild.

### 4.1 Is the grain really unique

```sql
SELECT count(*) AS so_dong,
       count(DISTINCT (so_don, dong_so)) AS so_khoa_phan_biet,
       count(*) = count(DISTINCT (so_don, dong_so)) AS grain_dung
FROM fct_ban;
```

```text
┌─────────┬───────────────────┬────────────┐
│ so_dong │ so_khoa_phan_biet │ grain_dung │
├─────────┼───────────────────┼────────────┤
│       6 │                 6 │ true       │
└─────────┴───────────────────┴────────────┘
```

`grain_dung = false` means some join has replicated rows — stop, don't go on.

### 4.2 Does the total match the source

```sql
SELECT (SELECT sum(thanh_tien) FROM fct_ban)              AS tong_fact,
       (SELECT sum(so_luong * don_gia) FROM src_dong_don) AS tong_nguon,
       (SELECT sum(thanh_tien) FROM fct_ban)
     - (SELECT sum(so_luong * don_gia) FROM src_dong_don) AS chenh;
```

```text
┌───────────┬────────────┬────────┐
│ tong_fact │ tong_nguon │ chenh  │
├───────────┼────────────┼────────┤
│   3450000 │    3450000 │      0 │
└───────────┴────────────┴────────┘
```

### 4.3 Are there orphan keys

```sql
SELECT count(*) FILTER (WHERE khach_sk = 0)      AS khoa_khong_khop,
       count(*) FILTER (WHERE d.ngay_key IS NULL) AS ngay_khong_khop
FROM fct_ban f LEFT JOIN dim_ngay d ON d.ngay_key = f.ngay_dat_key;
```

```text
┌─────────────────┬─────────────────┐
│ khoa_khong_khop │ ngay_khong_khop │
├─────────────────┼─────────────────┤
│               0 │               0 │
└─────────────────┴─────────────────┘
```

### 4.4 Is as-was correct

```sql
SELECT f.so_don, k.khach_id, k.khu_vuc, sum(f.thanh_tien) AS thanh_tien
FROM fct_ban f JOIN dim_khach k USING (khach_sk)
WHERE k.khach_id = 'C1'
GROUP BY 1,2,3 ORDER BY 1;
```

```text
┌─────────┬──────────┬──────────┬────────────┐
│ so_don  │ khach_id │ khu_vuc  │ thanh_tien │
├─────────┼──────────┼──────────┼────────────┤
│ DH-001  │ C1       │ Mien Bac │     600000 │
│ DH-002  │ C1       │ Mien Nam │     450000 │
└─────────┴──────────┴──────────┴────────────┘
```

| Your result (4.1 → 4.4) |
|---|
| |

**Break-the-model exercise:** change the join condition in step 3 to `AND k.la_hien_tai`, rebuild,
then run 4.4. Both orders will land in the South — 1,050,000 assigned to the wrong region, while 4.1, 4.2 and 4.3 stay
green. That's exactly [the late-arriving fact case study](../case-studies/fact-den-muon-gan-sai-khu-vuc.md).

## Step 5 — an accumulating snapshot for the second question

*"Which stage are orders stuck at"* can't be answered from `fct_ban`, because its grain is **the order line**.
You need a second fact, at the grain of **one order**, carrying the milestones and the *lag facts*.

```sql
CREATE TABLE fct_don_vong_doi AS
SELECT d.so_don,
       CAST(strftime(d.ngay_dat, '%Y%m%d') AS INTEGER)                AS ngay_dat_key,
       coalesce(CAST(strftime(d.ngay_giao, '%Y%m%d') AS INTEGER), -1) AS ngay_giao_key,
       coalesce(CAST(strftime(d.ngay_nhan, '%Y%m%d') AS INTEGER), -1) AS ngay_nhan_key,
       coalesce(k.khach_sk, 0)                                        AS khach_sk,
       date_diff('day', d.ngay_dat, d.ngay_giao)                      AS ngay_cho_giao,
       date_diff('day', d.ngay_giao, d.ngay_nhan)                     AS ngay_van_chuyen,
       date_diff('day', d.ngay_dat, d.ngay_nhan)                      AS tong_thoi_gian,
       (SELECT sum(so_luong * don_gia) FROM src_dong_don x
        WHERE x.so_don = d.so_don)                                    AS gia_tri_don
FROM src_don d
LEFT JOIN dim_khach k
  ON k.khach_id = d.khach_id
 AND d.ngay_dat >= k.hieu_luc_tu AND d.ngay_dat < k.hieu_luc_den;
```

```text
┌─────────┬──────────────┬───────────────┬───────────────┬──────────┬────────────┬───────┐
│ so_don  │ ngay_dat_key │ ngay_giao_key │ ngay_nhan_key │ cho_giao │ van_chuyen │ tong  │
├─────────┼──────────────┼───────────────┼───────────────┼──────────┼────────────┼───────┤
│ DH-001  │     20260110 │      20260112 │      20260115 │        2 │          3 │     5 │
│ DH-002  │     20260205 │      20260206 │            -1 │        1 │       NULL │  NULL │
│ DH-003  │     20260120 │            -1 │            -1 │     NULL │       NULL │  NULL │
│ DH-004  │     20260218 │      20260219 │      20260225 │        1 │          6 │     7 │
└─────────┴──────────────┴───────────────┴───────────────┴──────────┴────────────┴───────┘
```

Three characteristics make this table quite unlike a transaction fact:

- **Rows are `UPDATE`d**, not only `INSERT`ed. When an order is delivered, the existing row is updated.
- A milestone that hasn't happened carries key `-1` rather than `NULL` — thanks to the row added in step 1.
- `ngay_cho_giao` and `ngay_van_chuyen` are **lag facts**: the gap between two milestones, precomputed
  at load time so nobody has to subtract dates in BI.

The process scorecard, which is what the business actually needs:

```sql
SELECT count(*)                                            AS tong_don,
       count(*) FILTER (WHERE ngay_giao_key = -1)          AS chua_giao,
       count(*) FILTER (WHERE ngay_giao_key <> -1
                          AND ngay_nhan_key = -1)          AS dang_tren_duong,
       count(*) FILTER (WHERE ngay_nhan_key <> -1)         AS da_nhan,
       round(avg(tong_thoi_gian), 1)                       AS tb_ngay_hoan_tat
FROM fct_don_vong_doi;
```

```text
┌──────────┬───────────┬─────────────────┬─────────┬──────────────────┐
│ tong_don │ chua_giao │ dang_tren_duong │ da_nhan │ tb_ngay_hoan_tat │
├──────────┼───────────┼─────────────────┼─────────┼──────────────────┤
│        4 │         1 │               1 │       2 │              6.0 │
└──────────┴───────────┴─────────────────┴─────────┴──────────────────┘
```

| Your result |
|---|
| |

`tb_ngay_hoan_tat = 6.0` counts only the 2 received orders — `avg` skips `NULL`. That's the **right**
behaviour here (you can't know how long an unfinished order will take), but it must be stated on the report,
or the reader takes it for the average of all 4 orders.

## Step 6 — drill-across for the third question

Add a returns fact, sharing `dim_khach`:

```sql
CREATE TABLE fct_tra_hang AS
SELECT * FROM (VALUES
  ('DH-001', CAST(20260120 AS INTEGER), 1, 150000),
  ('DH-001', CAST(20260125 AS INTEGER), 1, 150000),
  ('DH-004', CAST(20260301 AS INTEGER), 4, 900000)
) t(so_don, ngay_tra_key, khach_sk, gia_tri_tra);
```

**The wrong way — joining the two facts directly:**

```sql
SELECT count(*) AS dong_sau_join,
       sum(f.thanh_tien) AS doanh_thu_sau_khi_join_thang,
       (SELECT sum(thanh_tien) FROM fct_ban) AS doanh_thu_that
FROM fct_ban f JOIN fct_tra_hang t USING (so_don);
```

```text
┌───────────────┬──────────────────────────────┬────────────────┐
│ dong_sau_join │ doanh_thu_sau_khi_join_thang │ doanh_thu_that │
├───────────────┼──────────────────────────────┼────────────────┤
│             6 │                      2700000 │        3450000 │
└───────────────┴──────────────────────────────┴────────────────┘
```

Two errors at once: `DH-001` is doubled because it was returned twice, while `DH-002` and `DH-003`
vanish for having no return line. The number 2,700,000 isn't the revenue of anything at all.

**The right way — aggregate each fact to the same grain first, then combine:**

```sql
WITH ban AS (
  SELECT k.khu_vuc, sum(f.thanh_tien) AS doanh_thu
  FROM fct_ban f JOIN dim_khach k USING (khach_sk) GROUP BY 1
), tra AS (
  SELECT k.khu_vuc, sum(t.gia_tri_tra) AS gia_tri_tra
  FROM fct_tra_hang t JOIN dim_khach k USING (khach_sk) GROUP BY 1
)
SELECT coalesce(ban.khu_vuc, tra.khu_vuc)   AS khu_vuc,
       coalesce(ban.doanh_thu, 0)           AS doanh_thu,
       coalesce(tra.gia_tri_tra, 0)         AS gia_tri_tra,
       round(100.0 * coalesce(tra.gia_tri_tra, 0)
             / nullif(ban.doanh_thu, 0), 1) AS ty_le_tra_pct
FROM ban FULL JOIN tra ON ban.khu_vuc = tra.khu_vuc
ORDER BY 2 DESC;
```

```text
┌────────────┬───────────┬─────────────┬───────────────┐
│  khu_vuc   │ doanh_thu │ gia_tri_tra │ ty_le_tra_pct │
├────────────┼───────────┼─────────────┼───────────────┤
│ Mien Trung │   1500000 │      900000 │          60.0 │
│ Mien Nam   │   1350000 │           0 │           0.0 │
│ Mien Bac   │    600000 │      300000 │          50.0 │
└────────────┴───────────┴─────────────┴───────────────┘
```

| Your result |
|---|
| |

Revenue adds up to 3,450,000, matching the source. `FULL JOIN` keeps even the region with no return
line. This is **drill-across**, and its precondition is that both facts use **the same**
`dim_khach` — see [conformed dimensions](../skills/conformed-dimension.md).

## The final model

```text
                  dim_ngay ────┬──── ngay_dat_key
                     │         ├──── ngay_giao_key    (role-playing)
                     │         ├──── ngay_nhan_key
                     │         └──── ngay_tra_key
                     │
   fct_ban ──────────┼────────── dim_khach (Type 2, conformed)
   (grain: dong don) │                │
                     │                │
   fct_don_vong_doi ─┘                │
   (grain: mot don, accumulating)     │
                                      │
   fct_tra_hang ──────────────────────┘
   (grain: mot lan tra)

   so_don: degenerate dimension, co mat trong ca ba fact
```

Three facts, one shared set of dimensions. That's the shape of a mature
[star schema](../reference/star-snowflake-obt.md): facts grow per business
process, while dimensions get reused.

## Exercises to do yourself

| # | The task | The technique needed |
|---|---|---|
| 1 | Change the step-3 join to `la_hien_tai`, re-run 4.4 and explain the divergence | [Late-arriving data](../skills/late-arriving.md) |
| 2 | Add order `DH-005` for customer `C9` who isn't in `src_khach` — keeping the total matching | [Inferred members](../skills/late-arriving.md) |
| 3 | Build `agg_thang_khu_vuc`, then add a backdated order and find the divergence | [Aggregate fact tables](../skills/aggregate-fact-table.md) |
| 4 | Add a header-level shipping fee and allocate it onto the order lines so `SUM` is right | [Degenerate dimensions](../skills/degenerate-dimension.md) |
| 5 | Add `dim_audit`, attach `audit_sk` to all three facts, load `src_don` twice then delete exactly the second load | [Audit dimensions](../skills/audit-dimension.md) |

Exercises 1 and 5 are the two most worth doing — they show when the model breaks, not merely
when it works.

## Related Topics

- [The four-step design process](../reference/design-process.md) — the frame of this whole tutorial
- [Grain](../reference/grain.md) — the step-2 decision, governing everything after it
- [The date dimension](../reference/date-dimension.md) — step 1
- [SCD](../skills/scd.md) — step 2
- [Degenerate dimensions](../skills/degenerate-dimension.md) — `so_don` in step 3
- [Conformed dimensions](../skills/conformed-dimension.md) — step 6's precondition
- [The dbt lab with DuckDB](../../etl/dbt/tutorials/dbt-lab-duckdb.md) — rebuilding this model with dbt
