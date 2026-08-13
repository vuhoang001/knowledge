---
title: The date dimension
sidebar_position: 6
description: "Why the calendar has to be a table and not a date column — fiscal quarters, holidays and working days are data, not functions."
tags: [date-dimension, dimension, calendar, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# The date dimension

> **Takeaway:** SQL's date functions only know the **Gregorian calendar**. Everything a business actually
> asks about — fiscal quarters, sales weeks, holidays, working days, peak seasons — is **that
> organisation's data**, not derivable from the date number itself. So it has to live
> in a table.

## The goal

To answer the question people often think is redundant: *"we already have a `ngay DATE` column, what do we need
`dim_ngay` for?"*

The short answer: because `quarter('2026-01-15')` returns `1`, while for a company whose fiscal year starts
on 1 April, January 2026 is **Q4 of FY2025**. SQL has no way of knowing that.

## Overview

The date dimension is the **only** dimension in a dimensional model that you *generate* rather than
*extract*: no source system hands you this table, and it never changes after
being generated. Kimball classes it among the basic dimension techniques, and in practice it's the
most-joined table in the whole warehouse.

| With only a `ngay DATE` column | With a `dim_ngay` |
|---|---|
| `quarter(ngay)` — the calendar quarter | `quy_tai_chinh` — **this company's** quarter |
| No idea which day is a holiday | `la_ngay_le`, `ten_ngay_le` |
| No idea which day is a working day | `la_ngay_lam_viec` |
| Display labels formatted in every query | `ngay_hien_thi`, `thang_ten` — typed once |
| A "hasn't happened yet" date must be `NULL` | A `-1` key row, so the join keeps the row |
| Filtering `WHERE ngay >= …` recomputed by each report | `la_30_ngay_gan_nhat` — one column |

That last point is the most important organisationally: **a business definition lives in one single
place**. Changing the fiscal calendar means editing one table, not hunting down 40 `WHERE` clauses. This is
exactly the trap described in the [case study "adding an eighth status"](../case-studies/them-trang-thai-thu-tam.md).

## The worked example

A company selling seasonally, with a **fiscal year starting 1 April**. Revenue in April–June is three
times that of the early months of the calendar year.

### Step 1 — the source data

```sql
CREATE TABLE fct_ban AS
SELECT ngay,
       CASE WHEN month(ngay) BETWEEN 4 AND 6 THEN 3 ELSE 1 END
       * (100 + (day(ngay) * 7) % 50) AS doanh_thu
FROM (SELECT (DATE '2026-01-01' + INTERVAL (i) DAY)::DATE AS ngay
      FROM range(0, 181) t(i));
```

```text
┌─────────┬────────┐
│ so_ngay │  tong  │
├─────────┼────────┤
│     181 │  45432 │
└─────────┴────────┘
```

### Step 2 — the question that kills the no-dim_ngay approach

*"What was revenue last Q1?"*

```sql
SELECT sum(doanh_thu) FILTER (WHERE quarter(ngay) = 1) AS quy1_theo_lich,
       sum(doanh_thu) FILTER (WHERE ngay BETWEEN '2026-04-01' AND '2026-06-30')
                                                      AS quy1_tai_chinh,
       round(100.0 * (sum(doanh_thu) FILTER (WHERE ngay BETWEEN '2026-04-01' AND '2026-06-30')
                    - sum(doanh_thu) FILTER (WHERE quarter(ngay) = 1))
             / sum(doanh_thu) FILTER (WHERE quarter(ngay) = 1), 1) AS lech_pct
FROM fct_ban;
```

```text
┌────────────────┬────────────────┬──────────┐
│ quy1_theo_lich │ quy1_tai_chinh │ lech_pct │
├────────────────┼────────────────┼──────────┤
│          11286 │          34146 │    202.6 │
└────────────────┴────────────────┴──────────┘
```

The same question in words, two numbers **202.6% apart**. `quarter()` isn't wrong — it correctly answers
the question *"which calendar quarter"*, it's just that nobody asked that question.

The stopgap fix is to type `BETWEEN '2026-04-01' AND '2026-06-30'` straight into the query. It runs
correctly exactly once, for exactly one quarter, and **nobody can find it again** when next month needs a
different quarter.

### Step 3 — building dim_ngay

```sql
CREATE TABLE dim_ngay AS
WITH lich AS (
  SELECT (DATE '2026-01-01' + INTERVAL (i) DAY)::DATE AS ngay FROM range(0, 365) t(i)
), le AS (
  SELECT unnest([DATE '2026-01-01', DATE '2026-02-16', DATE '2026-02-17', DATE '2026-02-18',
                 DATE '2026-02-19', DATE '2026-02-20', DATE '2026-04-26', DATE '2026-04-30',
                 DATE '2026-05-01', DATE '2026-09-02']) AS ngay
)
SELECT
  CAST(strftime(ngay, '%Y%m%d') AS INTEGER)                        AS ngay_key,
  ngay,
  strftime(ngay, '%d/%m/%Y')                                       AS ngay_hien_thi,
  ['CN','T2','T3','T4','T5','T6','T7'][dayofweek(ngay) + 1]        AS thu_ten,
  month(ngay)                                                      AS thang,
  quarter(ngay)                                                    AS quy_lich,
  (((month(ngay) + 8) % 12) // 3) + 1                              AS quy_tai_chinh,
  CASE WHEN month(ngay) >= 4 THEN year(ngay) ELSE year(ngay) - 1 END AS nam_tai_chinh,
  dayofweek(ngay) IN (0, 6)                                        AS la_cuoi_tuan,
  ngay IN (SELECT ngay FROM le)                                    AS la_ngay_le,
  NOT (dayofweek(ngay) IN (0, 6) OR ngay IN (SELECT ngay FROM le)) AS la_ngay_lam_viec
FROM lich;
```

```text
┌──────────┬───────────────┬─────────┬──────────┬───────────────┬────────────┬──────────────────┐
│ ngay_key │ ngay_hien_thi │ thu_ten │ quy_lich │ quy_tai_chinh │ la_ngay_le │ la_ngay_lam_viec │
├──────────┼───────────────┼─────────┼──────────┼───────────────┼────────────┼──────────────────┤
│ 20260101 │ 01/01/2026    │ T5      │        1 │             4 │ true       │ false            │
│ 20260102 │ 02/01/2026    │ T6      │        1 │             4 │ false      │ true             │
│ 20260103 │ 03/01/2026    │ T7      │        1 │             4 │ false      │ false            │
│ 20260104 │ 04/01/2026    │ CN      │        1 │             4 │ false      │ false            │
│ 20260105 │ 05/01/2026    │ T2      │        1 │             4 │ false      │ true             │
└──────────┴───────────────┴─────────┴──────────┴───────────────┴────────────┴──────────────────┘
```

Note that `quy_lich` = 1 while `quy_tai_chinh` = 4 on the same row. That's exactly what SQL
can't work out for itself.

### Step 4 — the old question, now answerable with a GROUP BY

```sql
SELECT d.nam_tai_chinh, d.quy_tai_chinh, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_ngay d USING (ngay)
GROUP BY 1, 2 ORDER BY 1, 2;
```

```text
┌───────────────┬───────────────┬───────────┐
│ nam_tai_chinh │ quy_tai_chinh │ doanh_thu │
├───────────────┼───────────────┼───────────┤
│          2025 │             4 │     11286 │
│          2026 │             1 │     34146 │
└───────────────┴───────────────┴───────────┘
```

No hardcoded dates anywhere. Changing the fiscal calendar = editing `dim_ngay`, and every report is
automatically correct.

### Step 5 — what only dim_ngay can do: working days

*"What did we sell per day on average in February?"* — Tết falls in February and the shop was
closed for 5 days.

```sql
SELECT count(*)                                          AS ngay_trong_thang,
       count(*) FILTER (WHERE d.la_ngay_lam_viec)        AS ngay_lam_viec,
       sum(f.doanh_thu)                                  AS tong,
       round(sum(f.doanh_thu) * 1.0 / count(*), 1)       AS tb_moi_ngay,
       round(sum(f.doanh_thu) * 1.0
             / count(*) FILTER (WHERE d.la_ngay_lam_viec), 1) AS tb_ngay_lam_viec
FROM fct_ban f JOIN dim_ngay d USING (ngay)
WHERE d.thang = 2;
```

```text
┌──────────────────┬───────────────┬────────┬─────────────┬──────────────────┐
│ ngay_trong_thang │ ngay_lam_viec │  tong  │ tb_moi_ngay │ tb_ngay_lam_viec │
├──────────────────┼───────────────┼────────┼─────────────┼──────────────────┤
│               28 │            15 │   3542 │       126.5 │            236.1 │
└──────────────────┴───────────────┴────────┴─────────────┴──────────────────┘
```

**126.5 or 236.1?** Compare February's performance against March using the first column and February
always looks bad — not because sales were poor, but because the denominator counts the closed days. Without
`dim_ngay` the figure 236.1 **doesn't exist**, and nobody knows it's missing either.

## The columns you should have

| Group | Column | Why |
|---|---|---|
| Key | `ngay_key INT` as `YYYYMMDD` | See the smart-key section below |
| Calendar | `ngay`, `thang`, `quy_lich`, `nam` | The foundation |
| Display | `ngay_hien_thi`, `thu_ten`, `thang_ten` | Format once, not in 40 queries |
| Fiscal | `nam_tai_chinh`, `quy_tai_chinh`, `tuan_tai_chinh` | What SQL can't derive |
| Working calendar | `la_cuoi_tuan`, `la_ngay_le`, `ten_ngay_le`, `la_ngay_lam_viec` | The denominator of every average metric |
| Navigation | `ngay_lam_viec_thu_may_trong_thang`, `ngay_cuoi_thang` | Reports on "the 3rd working day" |
| Relative | `la_30_ngay_gan_nhat`, `la_thang_hien_tai` | Must be **refreshed per run schedule** |

The last group is the sole exception to the "a date dimension never changes" rule: relative columns
must be recomputed daily. The trade-off: convenient for BI, but it makes the table non-immutable —
re-running an old report gives a different answer. If that's unacceptable, let BI compute it instead.

### The `YYYYMMDD` smart key — the permitted exception to surrogate keys

[Surrogate keys](surrogate-key.md) say a dimension's key should be meaningless. The date dimension is
**the exception Kimball endorses**: the key is the integer `20260110`.

| You get | You lose |
|---|---|
| Partitioning the fact by `ngay_key` without a join | A key that carries meaning — breaking the general principle |
| Reading the raw data and still understanding it | You can't change the calendar (nobody does) |
| Easy special rows: `-1` = hasn't happened | |

In exchange: **a date dimension never has Type 2** — 2026-01-10 has no second version.

### The special row for a date that "hasn't happened"

An accumulating snapshot (see [Facts and dimensions](fact-and-dimension.md)) has columns like
`ngay_giao` still empty because the order hasn't shipped. Leaving it `NULL` means an ordinary `JOIN` throws the whole
row away — exactly the failure in the [case study "half the orders vanished"](../case-studies/don-dang-giao-bien-mat.md).

The approach: add a row with key `-1` labelled `"Chưa xảy ra"` and **never leave a `NULL` in a fact's key
column**.

```sql
INSERT INTO dim_ngay
SELECT -1, NULL, 'Chua xay ra', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL;
```

### Time of day is a separate dimension

Don't stuff 86,400 seconds into the date dimension. A year is 365 rows; a year × the seconds in a day is
31.5 million rows. Split it into `dim_gio_trong_ngay` (1,440 rows if the grain is a minute) with
columns like `ca_lam_viec`, `khung_gio_cao_diem`, and have the fact carry both keys.

### Several timezones — one event, two dates

A retail chain has stores in Hanoi and in Berlin. A transaction at 23:30 Hanoi time is
17:30 the same day in Berlin — but at 00:30 Hanoi time it's still **the previous
day** in Berlin.

The question *"what was revenue on 10 January"* has two correct answers, and they serve
two different people:

| Who's asking | Needs | Why |
|---|---|---|
| The store manager | **Local** time | Shifts and peak hours at that store |
| Head office | One **unified** reference (UTC or head-office time) | Adding global revenue needs the same day boundary |

Kimball's advice is exactly the same as for [multiple currencies](../skills/multi-currency-uom.md):
**the fact carries both key sets**, frozen at load time.

```sql
CREATE TABLE fct_ban (
  ngay_key_dia_phuong  INTEGER,   -- quan ly cua hang dung
  gio_key_dia_phuong   INTEGER,
  ngay_key_utc         INTEGER,   -- tap doan dung, cong duoc toan cau
  gio_key_utc          INTEGER,
  cua_hang_sk          INTEGER,
  doanh_thu            DECIMAL
);
```

Both point at **one** `dim_ngay` — it's still a conformed dimension, it's just the fact playing
two roles ([role-playing](../skills/role-playing-dimension.md)).

Each store's timezone is **an attribute of `dim_cua_hang`**, not of `dim_ngay`
— the calendar doesn't know where it's being read. And you must store the IANA zone name (`Asia/Ho_Chi_Minh`),
not a numeric offset (`+07:00`): the offset changes with daylight saving in many countries, while the zone
name doesn't.

The accompanying rule: **never mix the two key sets in one `GROUP BY`**, and every report
must state which set it's using. Missing that note is the origin of the argument about
"what was revenue on the 10th, actually".

## Trade-offs

| You get | You lose |
|---|---|
| The fiscal-calendar definition lives in one single place | Another table to generate and maintain |
| "Working day" and "holiday" questions become answerable | Holidays must be loaded by hand every year (the lunar calendar has no formula) |
| Consistent display labels across every report | Relative columns break immutability |
| A join to a small table, almost always in cache | One more join in every query |

The join cost is essentially zero: 365 rows a year, 20 years is 7,300 rows — every engine
broadcasts it.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| No `dim_ngay`, using `quarter()` directly | The fiscal quarter is wrong — see the [case study](../case-studies/bao-cao-quy-tai-chinh-lech.md) |
| Only generating to the end of this year | Orders shipping next year fall out of every report |
| Leaving `NULL` in a fact's date key column | `JOIN` wipes the rows out and totals silently fall short |
| Stuffing hours/minutes/seconds into the same table | 31.5 million rows instead of 365 |
| Adding relative columns then treating the table as immutable | Re-running an old report gives a different number |
| Each mart building its own calendar | Two marts' "Q1" mean different things — see [conformed dimensions](../skills/conformed-dimension.md) |

## FAQ

<details>
<summary>How far ahead should I generate?</summary>

Backwards: to the data's first transaction date. Forwards: at least **2–3 years**, because
contracts, delivery schedules and forecasts all point at dates that haven't arrived. Generating 20 years is only 7,300
rows — far cheaper than discovering the shortfall later.

</details>

<details>
<summary>How do you compute Vietnamese lunar-calendar holidays?</summary>

There's no formula in SQL. That's exactly why it has to be **data**: loaded from a
holiday table maintained by a person, once a year. The `la_ngay_le` column is generated from that table, not
from a function.

</details>

<details>
<summary>If I use OBT do I still need a date dimension?</summary>

Yes — only the attachment changes: the calendar columns get **flattened straight into the big table** rather than joined. But
the definition still has to be generated from one place, otherwise each big table gets its own understanding of
"quarter". See [Star, snowflake, OBT](star-snowflake-obt.md).

</details>

<details>
<summary>Is a date dimension ever role-playing?</summary>

Almost always. An orders fact has `ngay_dat_key`, `ngay_giao_key`, `ngay_nhan_key`
— the same `dim_ngay` playing three roles. How to name each role is in
[Role-playing dimensions](../skills/role-playing-dimension.md).

</details>

## Related Topics

- [Role-playing dimensions](../skills/role-playing-dimension.md) — one `dim_ngay` playing several roles in the same fact
- [Facts and dimensions](fact-and-dimension.md) — accumulating snapshots and their still-empty date milestones
- [Surrogate keys](surrogate-key.md) — why `ngay_key` is allowed to carry meaning
- [Aggregate fact tables](../skills/aggregate-fact-table.md) — `dim_thang` must be generated *from* `dim_ngay`
- [CS: the fiscal-quarter report 202% out](../case-studies/bao-cao-quy-tai-chinh-lech.md)
- [The star-schema lab](../tutorials/star-schema-duckdb.md) — step 1 is building `dim_ngay`

## References

- Kimball Group — [Calendar Date Dimension](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 3
