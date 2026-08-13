---
title: NULLs in facts and in dimensions
sidebar_position: 14
description: "NULL in a measure column, a key column and a dimension attribute breaks in three different ways — and three-valued logic makes a filter silently swallow rows."
tags: [null-handling, fact, dimension, data-quality, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# NULLs in facts and in dimensions

> **Takeaway:** SQL doesn't use two-valued logic but **three-valued** — true, false, and *unknown*.
> `WHERE trang_thai <> 'huy'` also excludes the `NULL` rows, because "we don't know whether it's `huy`"
> is **not** "true". Nothing reports an error, only the total falls short.

## Three places NULL appears, three different consequences

| Where the NULL is | What Kimball says | The consequence of leaving it |
|---|---|---|
| **A measure column in a fact** | Permitted, and usually correct | `SUM` skips it — correct; `AVG` skips it — usually **not what the asker meant** |
| **A foreign key column in a fact** | **Absolutely forbidden** | The `JOIN` throws the whole row away |
| **An attribute in a dimension** | Should be replaced with a meaningful label | The BI filter hides the group, and `NOT IN` returns empty |

The last two rows are where numbers are lost. The first is where numbers are misunderstood.

## The worked example

Five orders, one with an undetermined status, three with no notion of a discount.

```sql
CREATE TABLE fct_don AS
SELECT * FROM (VALUES
  ('D1', 'hoan_thanh', 200, 50),
  ('D2', 'hoan_thanh', 300, 0),
  ('D3', 'huy',        200, NULL),
  ('D4', NULL,         200, NULL),   -- trang thai chua xac dinh
  ('D5', 'hoan_thanh', 100, NULL)
) t(so_don, trang_thai, doanh_thu, giam_gia);
```

The truth: **5 orders, 1,000 of revenue.**

### Trap 1 — `<>` swallows the NULL rows

The business question: *"the revenue of orders that weren't cancelled"*. The SQL everybody writes:

```sql
SELECT count(*) AS so_dong, sum(doanh_thu) AS doanh_thu
FROM fct_don WHERE trang_thai <> 'huy';
```

```text
┌─────────┬───────────┐
│ so_dong │ doanh_thu │
├─────────┼───────────┤
│       3 │       600 │
└─────────┴───────────┘
```

Order `D3` was cancelled (200) — correctly excluded. But `D4` (200) **also vanishes**, even though it wasn't
cancelled at all. `NULL <> 'huy'` gives `UNKNOWN`, and `WHERE` keeps only `TRUE` rows.

It should have been 800. **25% short.**

```sql
SELECT count(*) AS so_dong, sum(doanh_thu) AS doanh_thu
FROM fct_don WHERE trang_thai IS DISTINCT FROM 'huy';
```

```text
┌─────────┬───────────┐
│ so_dong │ doanh_thu │
├─────────┼───────────┤
│       4 │       800 │
└─────────┴───────────┘
```

`IS DISTINCT FROM` treats `NULL` as a comparable value. Another way: `WHERE
coalesce(trang_thai,'(chua xac dinh)') <> 'huy'` — longer, but the intent is obvious to any reader.

**The surest approach is never getting into that situation:** group and look, don't filter and trust.

```sql
SELECT coalesce(trang_thai, '(chua xac dinh)') AS trang_thai,
       count(*) AS so_don, sum(doanh_thu) AS doanh_thu
FROM fct_don GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌─────────────────┬────────┬───────────┐
│   trang_thai    │ so_don │ doanh_thu │
├─────────────────┼────────┼───────────┤
│ hoan_thanh      │      3 │       600 │
│ huy             │      1 │       200 │
│ (chua xac dinh) │      1 │       200 │
└─────────────────┴────────┴───────────┘
```

Three groups adding up to exactly 1,000. The third group **appears** rather than vanishing.

### Trap 2 — NULL in a measure: `SUM` and `AVG` don't agree

```sql
SELECT count(*)                            AS so_dong,
       count(giam_gia)                     AS so_dong_co_giam_gia,
       sum(giam_gia)                       AS tong_giam_gia,
       round(avg(giam_gia), 1)             AS avg_bo_qua_null,
       round(avg(coalesce(giam_gia,0)), 1) AS avg_coi_null_la_0
FROM fct_don;
```

```text
┌─────────┬─────────────────────┬───────────────┬─────────────────┬───────────────────┐
│ so_dong │ so_dong_co_giam_gia │ tong_giam_gia │ avg_bo_qua_null │ avg_coi_null_la_0 │
├─────────┼─────────────────────┼───────────────┼─────────────────┼───────────────────┤
│       5 │                   2 │            50 │            25.0 │              10.0 │
└─────────┴─────────────────────┴───────────────┴─────────────────┴───────────────────┘
```

**25.0 or 10.0?** Both are correct — for two different questions:

- 25.0 = *"among the orders that **had** a discount applied, what was the average discount"*
- 10.0 = *"across **all** orders, what was the average discount per order"*

`AVG` chooses the first by default. Nobody on the dashboard knows that.

And this is the distinction that must be made clear:

```sql
SELECT count(*) FILTER (WHERE giam_gia = 0)     AS co_do_va_bang_0,
       count(*) FILTER (WHERE giam_gia IS NULL) AS khong_co_khai_niem_giam_gia,
       count(*) FILTER (WHERE giam_gia > 0)     AS co_giam_gia
FROM fct_don;
```

```text
┌─────────────────┬─────────────────────────────┬─────────────┐
│ co_do_va_bang_0 │ khong_co_khai_niem_giam_gia │ co_giam_gia │
├─────────────────┼─────────────────────────────┼─────────────┤
│               1 │                           3 │           1 │
└─────────────────┴─────────────────────────────┴─────────────┘
```

> **`0` means "measured, and the result was zero". `NULL` means "there was nothing to measure".**

Order `D2` was considered for a discount and got 0đ. The other three weren't in any promotion
programme. Turning every `NULL` into `0` **erases that distinction**, and the denominator of every
promotion rate is wrong forever.

The principle: **keep `NULL` in a measure column when the measurement genuinely doesn't exist**; force it to `0`
only when `0` really is the business truth.

### Trap 3 — NULL in a dimension attribute

```sql
CREATE TABLE dim_khach AS
SELECT * FROM (VALUES (1,'C1','Mien Bac'), (2,'C2',NULL), (3,'C3','Mien Nam'))
  t(khach_sk, khach_id, khu_vuc);
CREATE TABLE fct_ban AS
SELECT * FROM (VALUES (1,100), (2,500), (3,400)) t(khach_sk, doanh_thu);
```

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ NULL     │       500 │
│ Mien Nam │       400 │
│ Mien Bac │       100 │
└──────────┴───────────┘
```

The largest group — **500/1,000, half the revenue** — carries the label `NULL`. In most
BI tools that group is hidden by default or shown as an empty cell readers skim past.

Worse, the value list for building a filter is also short:

```sql
SELECT count(DISTINCT khu_vuc) AS so_khu_vuc_BI_thay,
       count(DISTINCT coalesce(khu_vuc, '(chua co)')) AS so_nhom_that
FROM dim_khach;
```

```text
┌────────────────────┬──────────────┐
│ so_khu_vuc_BI_thay │ so_nhom_that │
├────────────────────┼──────────────┤
│                  2 │            3 │
└────────────────────┴──────────────┘
```

`COUNT(DISTINCT)` skips `NULL`. The filter offers 2 choices for 3 real groups, and **selecting both
still doesn't give the correct total**.

The fix is one `UPDATE`, and it's worth doing right when the dimension is built:

```sql
UPDATE dim_khach SET khu_vuc = '(chua co)' WHERE khu_vuc IS NULL;
```

```text
┌───────────┬───────────┐
│  khu_vuc  │ doanh_thu │
├───────────┼───────────┤
│ (chua co) │       500 │
│ Mien Nam  │       400 │
│ Mien Bac  │       100 │
└───────────┴───────────┘
```

The label should **say why it's empty**, because different reasons need different actions:
`(chua co)` · `(khong ap dung)` · `(loi du lieu nguon)`. Those three labels lead to three entirely different actions;
the word `NULL` leads to none.

### Trap 4 — `NOT IN` meeting a NULL returns empty

```sql
SELECT count(*) AS so_dong_tra_ve
FROM fct_ban f
WHERE f.khach_sk NOT IN (SELECT khach_sk FROM dim_khach WHERE ... UNION ALL SELECT NULL);
```

```text
┌────────────────┐
│ so_dong_tra_ve │
├────────────────┤
│              0 │
└────────────────┘
```

Just **one** `NULL` in the subquery list makes `NOT IN` return empty for every row — with no
error and no warning. This is why a "find the orphaned rows" query so often silently reports *"there are no
orphaned rows"* when in fact there are plenty.

Use `NOT EXISTS` or `LEFT JOIN ... WHERE x IS NULL` instead of `NOT IN`. Always.

## A foreign key in a fact must absolutely never be NULL

The three traps above are recoverable. A `NULL` key loses the row right at the `JOIN`:

| Instead of `NULL` | Use a special row |
|---|---|
| Who it is isn't known yet | `khach_sk = 0` → `"(chua biet)"` — an [inferred member](late-arriving.md) |
| Hasn't happened yet | `ngay_key = -1` → `"Chua xay ra"` — [the date dimension](../reference/date-dimension.md) |
| Not applicable | `sk = -2` → `"(khong ap dung)"` |

The failure case is detailed in the [case study where half the orders vanished](../case-studies/don-dang-giao-bien-mat.md).

## Trade-offs

| You get | You lose |
|---|---|
| Meaningful labels: the missing-data group appears | The dimension has "artificial" labels to explain |
| No row lost at the `JOIN` | You must manage the special key rows (0, −1, −2) |
| Keeping `NULL` in a measure: distinguishing "0" from "not measured" | Query writers must know `AVG` skips `NULL` |
| `IS DISTINCT FROM` is safe | Longer, and few people know it |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| `WHERE cot <> 'x'` when the column allows `NULL` | Rows lost silently — [case study](../case-studies/loc-khac-huy-mat-mot-phan-tu.md) |
| `NOT IN (subquery)` where the subquery contains a `NULL` | It returns empty, with no error |
| Turning every `NULL` into `0` in a measure | Losing the distinction between "measured as 0" and "not measured" |
| Leaving `NULL` in a dimension attribute | BI hides the group; the filter is missing a choice |
| Leaving `NULL` in a fact's foreign key | The `JOIN` throws the row away |
| Trusting `COUNT(DISTINCT)` to count groups | It's missing exactly the `NULL` group |

## How to spot it early

```sql
-- 1. Cot dimension nao dang co NULL, va bao nhieu %
SELECT 'khu_vuc' AS cot,
       count(*) FILTER (WHERE khu_vuc IS NULL) AS so_null,
       round(100.0 * count(*) FILTER (WHERE khu_vuc IS NULL) / count(*), 1) AS pct
FROM dim_khach;

-- 2. Khoa ngoai NULL trong fact — phai luon bang 0
SELECT count(*) FROM fct_ban WHERE khach_sk IS NULL;

-- 3. Tong sau khi loc + tong bi loc = tong truoc khi loc
```

Query 3 is an invariant worth making a test: every filter in a mart must add back up to the original
total. Not adding back up means a group is falling out.

## Related Topics

- [Late-arriving data](late-arriving.md) — inferred members for an unknown key
- [The date dimension](../reference/date-dimension.md) — the `-1` row for a milestone that hasn't happened
- [The six dimensions of data quality](../../data-quality/six-dimensions.md) — completeness measures exactly this
- [CS: filtering "not cancelled" losing a quarter of the revenue](../case-studies/loc-khac-huy-mat-mot-phan-tu.md)
- [CS: half the orders vanished](../case-studies/don-dang-giao-bien-mat.md)

## References

- Kimball Group — [Nulls in Fact Tables / Null Attributes in Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 3
