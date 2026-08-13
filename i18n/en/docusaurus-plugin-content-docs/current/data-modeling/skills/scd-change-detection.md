---
title: Change detection for SCD Type 2
sidebar_position: 2
description: "Four ways of knowing which row changed: comparing each column, hashing, updated_at, CDC — with each one's traps and how to apply the changes."
tags: [scd, change-detection, hash, cdc, dbt-snapshot, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Change detection for SCD Type 2

> **Takeaway:** [SCD](scd.md) Type 2 says *history must be kept*; this page says *how you know which row
> changed*. Hashing is the most usable approach, but only once you've avoided four traps — each of which
> fails **silently**: either missing a real change, or generating a fake version on every run.

## The goal

`scd.md` gives the five-step algorithm, of which step 3 is *"has it changed"*. This page is that step
3, written out enough to implement.

## The shared data for every example

Every snippet below uses this table. **All the output on this page is the result of
really running on DuckDB 1.5.5**, not an illustration.

```sql
-- Anh chup nguon hom nay
CREATE TABLE stg_khach_hang (
  khach_hang_id VARCHAR, ho_ten VARCHAR, khu_vuc VARCHAR,
  han_muc DECIMAL(18,2), updated_at TIMESTAMP
);
INSERT INTO stg_khach_hang VALUES
  ('KH001','Nguyễn A','Miền Nam', 50000000, TIMESTAMP '2026-07-31 08:00:00'),
  ('KH002','Trần B',  NULL,       30000000, TIMESTAMP '2026-07-01 08:00:00'),
  ('KH003','Lê C',    'Miền Bắc', 20000000, TIMESTAMP '2026-07-31 09:00:00');

-- Dimension dang co (phien ban hien tai)
CREATE TABLE dim_khach_hang (
  khach_sk INTEGER, khach_hang_id VARCHAR, ho_ten VARCHAR, khu_vuc VARCHAR,
  han_muc DECIMAL(18,2), row_hash VARCHAR,
  valid_from DATE, valid_to DATE, is_current BOOLEAN
);
INSERT INTO dim_khach_hang VALUES
  (1,'KH001','Nguyễn A','Miền Bắc', 50000000, NULL, DATE '2026-01-01', DATE '9999-12-31', true),
  (2,'KH002','Trần B',  'Miền Trung',30000000, NULL, DATE '2026-01-01', DATE '9999-12-31', true),
  (3,'KH004','Phạm D',  'Miền Nam', 10000000, NULL, DATE '2026-01-01', DATE '9999-12-31', true);
```

Read the three deliberate differences carefully:

| Customer | What happened |
|---|---|
| `KH001` | Changed region North → South. **Must** generate a new version |
| `KH002` | Region Central → `NULL`. **Must** generate a new version — this is the trap case |
| `KH003` | A new customer, not yet in the dim |
| `KH004` | In the dim but **gone** from the source — deleted? |

## Approach 1 — comparing each column

### The `NULL` trap, proved in two statements

```sql
SELECT
  NULL <> 'Miền Trung'                  AS so_sanh_thuong,
  NULL IS DISTINCT FROM 'Miền Trung'    AS so_sanh_dung;
```

```text
┌────────────────┬──────────────┐
│ so_sanh_thuong │ so_sanh_dung │
├────────────────┼──────────────┤
│ NULL           │ true         │
└────────────────┴──────────────┘
```

The first column gives `NULL`, not `true`. And `WHERE NULL` is treated as false → the row
never reaches the result.

### The consequence on real data

```sql
-- SAI: dung <>
SELECT s.khach_hang_id
FROM stg_khach_hang s JOIN dim_khach_hang t
  ON s.khach_hang_id = t.khach_hang_id AND t.is_current
WHERE s.khu_vuc <> t.khu_vuc OR s.han_muc <> t.han_muc;

-- DUNG: dung IS DISTINCT FROM
SELECT s.khach_hang_id
FROM stg_khach_hang s JOIN dim_khach_hang t
  ON s.khach_hang_id = t.khach_hang_id AND t.is_current
WHERE s.khu_vuc IS DISTINCT FROM t.khu_vuc
   OR s.han_muc IS DISTINCT FROM t.han_muc;
```

```text
Câu SAI (<>)              Câu ĐÚNG (IS DISTINCT FROM)
┌───────────────┐         ┌───────────────┐
│ khach_hang_id │         │ khach_hang_id │
├───────────────┤         ├───────────────┤
│ KH001         │         │ KH001         │
└───────────────┘         │ KH002         │
                          └───────────────┘
```

The first catches `KH001` and **misses `KH002`**. The second catches both. `KH002` loses its history
permanently, with no error reported.

This approach is correct but doesn't scale: 30 columns means 30 clauses, and adding a column without updating it is a silent miss.

## Approach 2 — hashing, and its four traps

### Trap 1: `NULL` makes two different value sets collide

```sql
SELECT
  concat_ws('|', 'a', NULL, 'c') AS co_null,
  concat_ws('|', 'a', 'c')       AS khong_null,
  concat_ws('|', 'a', NULL, 'c') = concat_ws('|', 'a', 'c') AS dung_nhau;
```

```text
┌─────────┬────────────┬───────────┐
│ co_null │ khong_null │ dung_nhau │
├─────────┼────────────┼───────────┤
│ a|c     │ a|c        │ true      │
└─────────┴────────────┴───────────┘
```

`dung_nhau` comes out **`true`** — that's the trap: `concat_ws` **skips** `NULL`, so
`('a', NULL, 'c')` and `('a','c')` produce the same string → the same hash → a real change is treated as
no change. Fix it with a `coalesce` to a fixed token:

```sql
SELECT concat_ws('|', 'a', coalesce(NULL,'<NULL>'), 'c') = concat_ws('|', 'a', 'c') AS con_dung_nhau;
```

```text
┌───────────────┐
│ con_dung_nhau │
├───────────────┤
│ false         │
└───────────────┘
```

### Trap 2: column boundaries

```sql
SELECT
  md5(concat('ab','c'))          = md5(concat('a','bc'))          AS khong_separator,
  md5(concat_ws('|','ab','c'))   = md5(concat_ws('|','a','bc'))   AS co_separator;
```

```text
┌─────────────────┬──────────────┐
│ khong_separator │ co_separator │
├─────────────────┼──────────────┤
│ true            │ false        │
└─────────────────┴──────────────┘
```

`khong_separator` comes out `true`: `'ab'+'c'` and `'a'+'bc'` both become `'abc'`. Two **completely
different** value sets with the same hash.

The separator must be a character **that never appears in the data**. If the data might contain `|`,
switch to a rarer character — or append each column's length:

```sql
SELECT md5(concat_ws('|', length('ab'), 'ab', length('c'), 'c'));
```

### Trap 3: number and date formatting

```sql
SELECT
  md5(cast(1.0 AS VARCHAR))                              = md5(cast(1.00 AS VARCHAR)) AS so,
  md5(cast(DATE '2026-01-01' AS VARCHAR))                = md5(cast(TIMESTAMP '2026-01-01 00:00:00' AS VARCHAR)) AS ngay;
```

```text
┌─────────┬─────────┐
│   so    │  ngay   │
├─────────┼─────────┤
│ false   │ false   │
└─────────┴─────────┘
```

Both come out `false` — **two values equal in business terms with different hashes**. The consequence is
the inverse of trap 1: generating a **fake version** every time the source changes a column type, and the
dimension bloating with nobody understanding why. Normalise before hashing:

```sql
md5(concat_ws('|',
  coalesce(cast(round(han_muc, 2) AS VARCHAR), '<NULL>'),
  coalesce(strftime(ngay_mo_tk, '%Y-%m-%d'),   '<NULL>')
))
```

### Trap 4: column order

```sql
SELECT md5(concat_ws('|','A','B')) = md5(concat_ws('|','B','A')) AS doi_thu_tu;
```

```text
┌────────────┐
│ doi_thu_tu │
├────────────┤
│ false      │
└────────────┘
```

It comes out `false`. Meaning that changing the column order inside `concat_ws` makes **every old hash
worthless**, and the next run generates a new version for **every** row in the dimension. Lock the order down; if
you're forced to change it, backfill the old hashes before running.

### The hash you actually use

```sql
CREATE OR REPLACE VIEW stg_khach_hang_hashed AS
SELECT *,
  md5(concat_ws('|',
    coalesce(ho_ten, '<NULL>'),
    coalesce(khu_vuc, '<NULL>'),
    coalesce(cast(round(han_muc, 2) AS VARCHAR), '<NULL>')
  )) AS row_hash
FROM stg_khach_hang;

SELECT khach_hang_id, khu_vuc, row_hash FROM stg_khach_hang_hashed ORDER BY khach_hang_id;
```

```text
┌───────────────┬──────────┬──────────────────────────────────┐
│ khach_hang_id │ khu_vuc  │             row_hash             │
├───────────────┼──────────┼──────────────────────────────────┤
│ KH001         │ Miền Nam │ c0133d007a9a4add915f1c52e9df0ff8 │
│ KH002         │ NULL     │ df3d45b9d55c2f9aa4df57b22bb63133 │
│ KH003         │ Miền Bắc │ 3d9430864824a7b3d55222f407f83da6 │
└───────────────┴──────────┴──────────────────────────────────┘
```

**Store `row_hash` in the dimension itself** rather than recomputing it from the source each time — that way a comparison
is one equality on one indexable column, instead of rehashing the whole source.

## Approach 3 — `updated_at` from the source

The cheapest, but it depends on the source telling the truth. Two ways of lying, both silent:

| What the source does | The consequence |
|---|---|
| `UPDATE`s without changing `updated_at` | **The change is lost permanently** |
| `touch`es the record with unchanged content | A fake version is generated |

```sql
-- Loc bang updated_at (re), nhung VAN hash de xac nhan (dung)
WITH ung_vien AS (
  SELECT * FROM stg_khach_hang_hashed
  WHERE updated_at >= TIMESTAMP '2026-07-31 00:00:00'   -- watermark lan chay truoc
)
SELECT u.khach_hang_id, u.row_hash, t.row_hash AS hash_cu
FROM ung_vien u
LEFT JOIN dim_khach_hang t ON u.khach_hang_id = t.khach_hang_id AND t.is_current
WHERE t.row_hash IS DISTINCT FROM u.row_hash;
```

```text
┌───────────────┬──────────┬──────────┐
│ khach_hang_id │ hash_moi │ hash_cu  │   ← rút gọn 8 ký tự đầu cho dễ đọc
├───────────────┼──────────┼──────────┤
│ KH001         │ c0133d00 │ f1505cf0 │   ← đã đổi
│ KH003         │ 3d943086 │ NULL     │   ← khách mới
└───────────────┴──────────┴──────────┘
```

This is the safe way to use it: `updated_at` to **reduce the data scanned**, and the hash to **confirm there
really was a change**. Cheap and correct.

Note that this example only scans `KH001` and `KH003` (updated today), **skipping `KH002`**. If the
source doesn't update `updated_at` when the region changes to `NULL`, that's exactly the first kind of
lie — and that's why you shouldn't use `updated_at` alone.

## Approach 4 — catching `DELETE`s

All three approaches above compare *the current snapshot*, so **none of them can see that `KH004` has vanished**.
Without CDC, compare the key sets:

```sql
SELECT t.khach_hang_id AS co_trong_dim_mat_o_nguon
FROM dim_khach_hang t
LEFT JOIN stg_khach_hang s ON t.khach_hang_id = s.khach_hang_id
WHERE t.is_current AND s.khach_hang_id IS NULL;
```

```text
┌──────────────────────────┐
│ co_trong_dim_mat_o_nguon │
├──────────────────────────┤
│ KH004                    │
└──────────────────────────┘
```

It returns `KH004`. But **don't close the row immediately** — one failed extraction producing incomplete data
looks exactly like a "mass delete". Set a safety threshold:

```sql
SELECT
  (SELECT count(*) FROM stg_khach_hang)                        AS nguon,
  (SELECT count(*) FROM dim_khach_hang WHERE is_current)       AS dim_hien_tai,
  1.0 * (SELECT count(*) FROM stg_khach_hang)
      / (SELECT count(*) FROM dim_khach_hang WHERE is_current) AS ty_le;
```

```text
┌───────┬──────────────┬────────┐
│ nguon │ dim_hien_tai │ ty_le  │
├───────┼──────────────┼────────┤
│     3 │            3 │    1.0 │
└───────┴──────────────┴────────┘
```

If the ratio falls below the threshold (say 0.9), **stop the pipeline** and don't close the rows. CDC
(Debezium reading the transaction log) doesn't have this problem because it sees real `DELETE` events.

## Applying the changes — two steps, not one `MERGE`

```sql
-- Buoc 1: dong cac dong da doi
UPDATE dim_khach_hang t
SET valid_to = DATE '2026-07-31', is_current = false
FROM stg_khach_hang_hashed s
WHERE t.khach_hang_id = s.khach_hang_id
  AND t.is_current
  AND t.row_hash IS DISTINCT FROM s.row_hash;

-- Buoc 2: chen phien ban moi + khach hoan toan moi
INSERT INTO dim_khach_hang
SELECT
  (SELECT coalesce(max(khach_sk), 0) FROM dim_khach_hang)
    + row_number() OVER (ORDER BY s.khach_hang_id),
  s.khach_hang_id, s.ho_ten, s.khu_vuc, s.han_muc, s.row_hash,
  DATE '2026-07-31', DATE '9999-12-31', true
FROM stg_khach_hang_hashed s
LEFT JOIN dim_khach_hang t
  ON t.khach_hang_id = s.khach_hang_id AND t.is_current
WHERE t.khach_hang_id IS NULL OR t.row_hash IS DISTINCT FROM s.row_hash;
```

The dimension after the run:

```text
┌──────────┬───────────────┬────────────┬────────────┬────────────┬────────────┐
│ khach_sk │ khach_hang_id │  khu_vuc   │ valid_from │  valid_to  │ is_current │
├──────────┼───────────────┼────────────┼────────────┼────────────┼────────────┤
│        1 │ KH001         │ Miền Bắc   │ 2026-01-01 │ 2026-07-31 │ false      │
│        4 │ KH001         │ Miền Nam   │ 2026-07-31 │ 9999-12-31 │ true       │
│        2 │ KH002         │ Miền Trung │ 2026-01-01 │ 2026-07-31 │ false      │
│        5 │ KH002         │ NULL       │ 2026-07-31 │ 9999-12-31 │ true       │
│        6 │ KH003         │ Miền Bắc   │ 2026-07-31 │ 9999-12-31 │ true       │
│        3 │ KH004         │ Miền Nam   │ 2026-01-01 │ 9999-12-31 │ true       │
└──────────┴───────────────┴────────────┴────────────┴────────────┴────────────┘
```

`KH001` and `KH002` each have two versions, with the old row closed on the right date. `KH003` came in new.
`KH004` is **still `is_current`** — the apply step doesn't touch it, because delete detection is
a separate matter in approach 4.

**The order is mandatory: close first, insert second.** The other way round, step 1 also closes the row just inserted
by step 2, and the dimension has no `is_current` row left for that customer.

### Verification

```sql
-- Moi natural key co dung MOT dong is_current
SELECT khach_hang_id, count(*) FROM dim_khach_hang
WHERE is_current GROUP BY khach_hang_id HAVING count(*) <> 1;

-- Khong co khoang thoi gian long nguoc
SELECT * FROM dim_khach_hang WHERE valid_from >= valid_to;
```

```text
Test 1                     Test 2
┌───────────────┬─────────┐  ┌─────────────┐
│ khach_hang_id │ so_dong │  │ so_dong_loi │
├───────────────┼─────────┤  ├─────────────┤
└───────────────┴─────────┘  │           0 │
        0 rows               └─────────────┘
```

Both must return **0 rows**.

## In dbt

`snapshot`'s two strategies correspond exactly to two of the approaches above:

| Strategy | Equivalent to | When |
|---|---|---|
| `check` + `check_cols` | comparing each column / hashing | The source has no trustworthy `updated_at` |
| `timestamp` + `updated_at` | the time column | The source is trustworthy and the data is large |

```yaml
{% raw %}
{% snapshot snp_khach_hang %}
{{ config(
    target_schema='snapshots',
    unique_key='khach_hang_id',
    strategy='check',
    check_cols=['ho_ten', 'khu_vuc', 'han_muc']
) }}
select * from {{ source('crm', 'khach_hang') }}
{% endsnapshot %}
{% endraw %}
```

`check_cols='all'` is convenient but dangerous: adding one meaningless technical column to the source makes
**every row generate a new version**. List the columns explicitly.

And to repeat the warning in [SCD](scd.md#common-mistakes): `snapshot` is the **only** thing
in dbt that isn't reproducible. A wrong model gets `dbt run` again; a snapshot run wrongly once loses
that piece of history for good.

## Three traps belonging to no single approach

### Late-arriving data

```sql
-- SAI: valid_from = ngay chay pipeline
SET valid_from = current_date

-- DUNG: valid_from = thoi diem nghiep vu
SET valid_from = s.ngay_hieu_luc
```

A record arriving three days late assigned `current_date` means a fact joining by
`ngay >= valid_from and ngay < valid_to` matches **the wrong version** for those three days.

### Idempotency

```sql
-- Chay lai buoc 1 + 2 lan thu hai trong cung ngay, roi dem:
SELECT khach_hang_id, count(*) FROM dim_khach_hang GROUP BY khach_hang_id ORDER BY 2 DESC;
```

Re-running both steps a second time on the same day: **6 rows before, 6 rows after.**

```text
┌───────────────┬──────────────┐
│ khach_hang_id │ so_phien_ban │
├───────────────┼──────────────┤
│ KH001         │            2 │
│ KH002         │            2 │
│ KH003         │            1 │
│ KH004         │            1 │
└───────────────┴──────────────┘
```

The row count **must not increase**. The `row_hash IS DISTINCT FROM` condition takes care of that — but
only if the hash is stable, i.e. traps 3 and 4 have already been avoided.

### Overlapping intervals

Already covered in the Verification section above. Run it after **every** load, not just the first.

## Trade-offs

| Approach | You get | You lose |
|---|---|---|
| Comparing each column | Simple, self-explanatory | Doesn't scale; add a column and forget and it's missed |
| Hashing | One comparison column, indexable | Four traps, each failing silently |
| `updated_at` | The cheapest, scanning the least | It depends on the source telling the truth |
| CDC | Catches `DELETE`s and intermediate states | Heavy infrastructure, complex to operate |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Using `<>` instead of `IS DISTINCT FROM` | Every `NULL`-related change is missed |
| `concat` without a separator | Two different value sets share a hash |
| Not `coalesce`ing `NULL` before hashing | A `NULL` hash, or a collision with a shorter set |
| Not normalising numbers/dates | A fake version each time the source changes a column type |
| Changing the column order in the hash | The whole dimension generates new versions at once |
| Inserting first and closing second | No `is_current` row left at all |
| Closing "deleted" rows without a threshold | One failed extraction closes the entire dimension |
| `check_cols='all'` | Adding a technical column makes every row generate a new version |

## Related Topics

- [SCD](scd.md) — Types 0–7 and the five-step algorithm; this page is step 3 written out in full
- [Surrogate keys](../reference/surrogate-key.md) — the key issued to each new version
- [Grain](../reference/grain.md) — a Type 2 dimension's grain is *one version*, not *one entity*
- [dbt: sources, seeds, snapshots](../../etl/dbt/reference/sources-seeds-snapshots.md) — the implementing tool
- [The six quality dimensions](../../data-quality/six-dimensions.md) — the time-interval test belongs to the *consistency* dimension
