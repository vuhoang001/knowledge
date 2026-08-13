---
title: "Exercise set 7 — Operations: the date dimension, audit, real-time"
sidebar_position: 16
description: "14 exercises to write yourself: dim_ngay's -1 row, a duplicate load inflating 45.5% and forcing you to delete 10 rows to kill 5, today's incomplete day dragging the average down 4.4%."
tags: [tutorial, bai-tap, date-dimension, audit-dimension, real-time-fact, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Exercise set 7 — Operations

> **Takeaway:** the six earlier sets deal with **the model being right**. This one deals with **a right
> model still producing wrong numbers in production** — because a calendar is data rather than a function, because a job
> runs twice, and because today isn't over yet and is already counted as a complete day.

## Techniques practised in this set

| # | Technique | Source document | Exercises |
|---|---|---|---|
| 1 | The date dimension | [The date dimension](../reference/date-dimension.md) | 5 |
| 2 | Audit dimensions | [Audit dimensions](../skills/audit-dimension.md) | 5 |
| 3 | Real-time fact tables | [Real-time fact tables](../skills/real-time-fact.md) | 4 |

## Preparation

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

This set uses `dim_ngay` (built in [lab 1](star-schema-duckdb.md)), `kho_hang` (**with one divergent
row spreading into the following day**) and `su_kien_web` (**05/07 cut off at 10:00**). See
[the seed appendix](bt-00-seed.md).

---

## Group A — The date dimension

### Exercise A.1 — The `-1` row in `dim_ngay`

**The task:** find the special row in `dim_ngay` and explain what it exists for.

**The answer it must produce:**

```text
┌──────────┬──────┬───────┬──────────────────┐
│ ngay_key │ ngay │ thang │ la_ngay_lam_viec │
├──────────┼──────┼───────┼──────────────────┤
│       -1 │ NULL │  NULL │ NULL             │
└──────────┴──────┴───────┴──────────────────┘
```

<details>
<summary>Solution</summary>

```sql
select * from dim_ngay where thang is null;
```

This is the **unknown member**, and it must exist from `dim_ngay`'s very first day. The reason:
`don_hang` has 2 undelivered orders (`ngay_giao` empty), and a fact **must never** have a `NULL`
foreign key.

The chain of consequences without it:

```text
ngay_giao_key = NULL
  → join dim_ngay mat dong (bo 1 bai C.4)
  → count(*) tren fact tut ma khong ai biet
  → "don dang giao" bien mat khoi moi bao cao
```

One easily-missed detail: the `-1` row's **descriptive** columns should be text, not `NULL`:

```sql
-- better
insert into dim_ngay values (-1, null, null, null, 'Chua giao', 'Khong xac dinh');
```

Leaving the `ngay` column `NULL` is right (there is no date at all), but the display columns should carry text so the
report shows *"Chua giao"* instead of a blank cell. The reader can then tell "not yet delivered" from "a data
bug".

Many warehouses use several special rows, one per reason:

| Key | Meaning |
|---|---|
| `-1` | Hasn't happened (not delivered, not received) |
| `-2` | Not applicable (a cancelled order has no delivery date) |
| `-3` | A source data bug (an unparseable date) |

Three keys instead of one lets you **count each kind separately**, and a spike in `-3` is a signal that
the source is breaking.

</details>

### Exercise A.2 — Working days are data, not a function

**The task:** count days, working days and non-working days per month in `dim_ngay`.

**The answer it must produce:**

```text
┌───────┬─────────┬───────────────┬───────────┐
│ thang │ so_ngay │ ngay_lam_viec │ ngay_nghi │
├───────┼─────────┼───────────────┼───────────┤
│     7 │      31 │            23 │         8 │
│     8 │      31 │            21 │        10 │
│  NULL │       1 │             0 │         0 │
└───────┴─────────┴───────────────┴───────────┘
```

The `NULL` row is exercise A.1's `-1` row — remember to exclude it when totalling.

<details>
<summary>Solution</summary>

```sql
select thang, count(*) so_ngay,
       count(*) filter (where la_ngay_lam_viec) ngay_lam_viec,
       count(*) filter (where not la_ngay_lam_viec) ngay_nghi
from dim_ngay group by 1 order by 1;
```

July has **23** working days, August **21**. No SQL function can produce those two
numbers, because they depend on:

- Weekends — derivable from the date.
- **National public holidays** — not derivable, differing by country.
- **A company's own closure days** — even less derivable.
- **Substitute-day rules** — complicated, changing year to year.

That's the entire reason `dim_ngay` must be a **table**. Writing `dayofweek(ngay) not in (0,6)` is
right for weekends and wrong for everything else — and that wrongness **doesn't surface** until
somebody computes a delivery SLA across a holiday.

A real `dim_ngay` should have 20–40 columns, all of them **precomputed lookup data**:

```text
ngay_key, ngay, thu, tuan_trong_nam, thang, ten_thang, quy,
quy_tai_chinh, nam_tai_chinh, la_ngay_lam_viec, la_ngay_le,
ten_ngay_le, ngay_lam_viec_thu_may_trong_thang, la_cuoi_thang,
la_cuoi_quy, ngay_truoc_do_cung_ky, ...
```

Every column here is a `case when` that **doesn't** have to be rewritten in hundreds of queries. It's the one
dimension where "more columns is better" is nearly always true — it only has a few thousand
rows.

**Build 5–10 years ahead**, don't generate it on demand. A fact with a date outside `dim_ngay`'s
range falls into `-1`, and nobody notices until the new year arrives.

</details>

### Exercise A.3 — A day with no transactions must still appear

**The task:** list revenue from 01/07 to 08/07, **including** days with no sales.

**The answer it must produce:**

```text
┌────────────┬───────────┐
│    ngay    │ doanh_thu │
├────────────┼───────────┤
│ 2026-07-01 │   1350000 │
│ 2026-07-02 │   3150000 │
│ 2026-07-03 │   4200000 │
│ 2026-07-04 │   1095000 │
│ 2026-07-05 │    420000 │
│ 2026-07-06 │         0 │
│ 2026-07-07 │         0 │
│ 2026-07-08 │         0 │
└────────────┴───────────┘
```

**Eight rows, not five.**

<details>
<summary>Solution</summary>

```sql
select d.ngay, coalesce(sum(ct.so_luong*ct.don_gia), 0) doanh_thu
from dim_ngay d
left join don_hang_chi_tiet ct on ct.ngay = d.ngay
where d.ngay between date '2026-07-01' and date '2026-07-08'
group by 1 order by 1;
```

`dim_ngay` comes **first** in the `left join` — that's the crux. A query starting from the fact yields
only 5 rows, and the three days with no sales **vanish from the chart**.

The concrete consequences, not theory:

| The calculation | From 5 rows | From 8 rows | Correct |
|---|---|---|---|
| Average revenue/day | 2,043,000 | 1,276,875 | depends on the question |
| A line chart | **continuous, hiding the 3 empty days** | 3 clear zero points | 8 rows |
| "Was there a day with no sales?" | unanswerable | answerable | 8 rows |

The line chart is the most dangerous place: connecting 05/07 straight to 09/07 looks exactly like an ordinary
declining line, and **nothing on the picture indicates three days were skipped**.

This is `dim_ngay`'s most common application, and also why it must cover **every** day
continuously — with no gaps.

For other dimensions, the equivalent technique is `cross join`ing two dimensions then `left join`ing the
fact:

```sql
select k.khu_vuc, h.nhom, coalesce(sum(f.tien_hang),0) doanh_thu
from (select distinct khu_vuc from khach_hang) k
cross join (select distinct nhom from hang_hoa) h
left join ... group by 1,2;
```

That's how you show all 9 combinations instead of 5, as in
[set 1, exercise D.1](bt-01-nen-tang.md#exercise-d1--one-question-three-layouts).

</details>

### Exercise A.4 — A fiscal quarter isn't a calendar quarter

**The task:** no SQL required. The company's fiscal year starts in **April**. Why is
`quarter(ngay)` wrong, and how do you fix it?

<details>
<summary>Solution</summary>

```sql
-- WRONG: the calendar quarter
select quarter(ngay) quy from dim_ngay;    -- July -> quarter 3

-- RIGHT: precomputed columns in dim_ngay
alter table dim_ngay add column quy_tai_chinh int;
alter table dim_ngay add column nam_tai_chinh int;
update dim_ngay set
  quy_tai_chinh = ((month(ngay) - 4 + 12) % 12) / 3 + 1,
  nam_tai_chinh = case when month(ngay) >= 4 then year(ngay) else year(ngay) - 1 end
where ngay is not null;
```

With a fiscal year starting in April, July belongs to fiscal **quarter 2**, not quarter 3.
A gap of **one quarter** on every financial report.

Three reasons to make it a column in `dim_ngay` rather than writing the formula each time:

**1. The formula is easy to get wrong and fails silently.** `((month - 4 + 12) % 12) / 3 + 1` is an
expression nobody can verify by eye. Writing it in 50 places is 50 chances to get it wrong.

**2. The rule can change.** The company moves its fiscal year to January, or acquires another
company with a different fiscal year. Change one table, not 50 queries.

**3. Not every fiscal year divides evenly by month.** Retail's 4-4-5 calendar splits
quarters into 4-4-5 weeks, and **no formula** goes from date to quarter — it's a pure lookup table.

Point 3 is the decisive one: as long as you still believe "a quarter can be computed from a date", you haven't
met a retail calendar yet.

See [the case study on divergent fiscal-quarter reports](../case-studies/bao-cao-quy-tai-chinh-lech.md).

</details>

### Exercise A.5 — `dim_ngay` and `dim_thoi_gian` are two tables

**The task:** no SQL. `su_kien_web` has `thoi_diem` down to the second. Why not add hours/minutes
to `dim_ngay`?

<details>
<summary>Solution</summary>

The row count if merged:

```text
10 nam x 365 ngay x 86.400 giay  =  315 trieu dong
```

315 million rows for a *dimension*. That isn't a dimension any more, that's a fact table.

Split into two tables:

| Table | Grain | Rows (10 years) | Columns |
|---|---|---|---|
| `dim_ngay` | one day | ~3,650 | `thang`, `quy`, `la_ngay_le`, `nam_tai_chinh` |
| `dim_thoi_gian` | one second within a day | **86,400, fixed** | `gio`, `phut`, `ca_lam_viec`, `khung_gio_cao_diem` |

`dim_thoi_gian` **doesn't depend on the date** — it's 86,400 rows forever, even if the data spans
100 years.

The fact keeps two keys:

```sql
select su_kien_id, khach_id,
       cast(strftime(thoi_diem,'%Y%m%d') as int) ngay_key,
       hour(thoi_diem)*3600 + minute(thoi_diem)*60 + second(thoi_diem) thoi_gian_key
from su_kien_web;
```

With this data, `dim_thoi_gian` answers a question `dim_ngay` can't touch:
*"in which time window are customers most active"* — and that's exactly the kind of question that makes people
want to store the time in the first place.

**When you don't need `dim_thoi_gian`:** when you only need raw hours/minutes, with no attributes like
"morning shift", "peak hour" or "office hours". Then leave the `timestamp` column in the fact
and use functions — because you have nothing to **look up**.

The test is exactly the same as for `dim_ngay`: an attribute **not derivable from the value** (a work
shift, a promotional window) means you need a table; without one, use functions.

</details>

---

## Group B — Audit dimensions

### Exercise B.1 — A duplicate load inflating 45.5%

**The task:** build `fct_nap` simulating two loaded batches, where batch 2 **reloads** `DH003` and `DH005`.
Measure the damage.

**The answer it must produce:**

```text
┌─────────┬───────────┬────────────────┬─────────────────┐
│ so_dong │ doanh_thu │ doanh_thu_that │ phong_phan_tram │
├─────────┼───────────┼────────────────┼─────────────────┤
│      20 │  14865000 │       10215000 │            45.5 │
└─────────┴───────────┴────────────────┴─────────────────┘
```

<details>
<summary>Solution</summary>

```sql
create or replace table fct_nap as
select don_hang_id, dong, ma_hang, so_luong, don_gia, ngay,
       1 lo_nap, timestamp '2026-07-06 02:00:00' nap_luc
from don_hang_chi_tiet
union all
select don_hang_id, dong, ma_hang, so_luong, don_gia, ngay,
       2, timestamp '2026-07-06 06:00:00'
from don_hang_chi_tiet where don_hang_id in ('DH003','DH005');

select count(*) so_dong, sum(so_luong*don_gia) doanh_thu, 10215000 doanh_thu_that,
       round(100.0*(sum(so_luong*don_gia)-10215000)/10215000, 1) phong_phan_tram
from fct_nap;
```

Only 5 surplus rows out of 15, but revenue inflates **45.5%** — because `DH003` (1,950,000) and
`DH005` (2,700,000) are the two biggest orders.

That's a general property of duplicate loads: **the revenue inflation rate isn't the row-count inflation
rate**. 33% surplus rows but 45.5% surplus money. So estimating the damage by counting
rows is wrong.

Three real causes of duplicate loads, none of them rare:

| The cause | The circumstance |
|---|---|
| A job re-run after a failure | it failed at step 9/10, was re-run from the start, and the first 8 steps loaded twice |
| The source resending a file | a partner resends because "the last file was incomplete", when in fact it was complete |
| An overlapping backfill | backfilling June while the daily job keeps running |

None of the three reports an error. Exercise B.2 detects it.

</details>

### Exercise B.2 — Detect duplicates before knowing which batch is wrong

**The task:** find every key appearing more than once, along with how many batches are involved.

**The answer it must produce:**

```text
┌─────────────┬───────┬────────┬───────┐
│ don_hang_id │ dong  │ so_ban │ so_lo │
├─────────────┼───────┼────────┼───────┤
│ DH003       │     1 │      2 │     2 │
│ DH003       │     2 │      2 │     2 │
│ DH003       │     3 │      2 │     2 │
│ DH005       │     1 │      2 │     2 │
│ DH005       │     2 │      2 │     2 │
└─────────────┴───────┴────────┴───────┘
```

<details>
<summary>Solution</summary>

```sql
select don_hang_id, dong, count(*) so_ban, count(distinct lo_nap) so_lo
from fct_nap group by 1,2
having count(*) > 1
order by 1,2;
```

The `so_lo` column is the important one and the one usually omitted. It distinguishes two entirely different things:

| `so_ban` | `so_lo` | The diagnosis |
|---|---|---|
| 2 | **2** | **a duplicate load** — the same row from two batches |
| 2 | **1** | **a wrong grain** — the key you declared isn't unique in the source |

Both make `count(*) > 1`, but the cures are opposites: the first deletes data, the
second redefines the grain. Applying the wrong cure either deletes correct data or keeps incorrect data.

This statement should be a **test running on every build**, and in dbt it's a built-in test:

```yaml
models:
  - name: fct_ban_hang
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [don_hang_id, dong]
```

This test catches both cases above. It's the **cheapest and most valuable** test in any
fact table — and it's exactly the grain check from
[set 1, exercise A.1](bt-01-nen-tang.md#exercise-a1--declare-the-grain-for-all-seven-tables-and-prove-it), this
time running automatically.

</details>

### Exercise B.3 — Without audit: delete 10 rows to kill 5

**The task:** measure how many rows deleting "the duplicate rows" would touch if there were **no** `lo_nap`
column.

**The answer it must produce:**

```text
┌───────────────┬──────────────────┬──────────────┐
│ truoc_khi_xoa │ so_dong_dinh_liu │ so_dong_lo_2 │
├───────────────┼──────────────────┼──────────────┤
│            20 │               10 │            5 │
└───────────────┴──────────────────┴──────────────┘
```

**10 rows implicated, but only 5 worth deleting.**

<details>
<summary>Solution</summary>

```sql
select (select count(*) from fct_nap) truoc_khi_xoa,
       (select count(*) from fct_nap f
        where exists (select 1 from fct_nap g
                      where g.don_hang_id = f.don_hang_id and g.dong = f.dong
                        and g.lo_nap <> f.lo_nap)) so_dong_dinh_liu,
       (select count(*) from fct_nap where lo_nap = 2) so_dong_lo_2;
```

Without a batch-marking column, two copies of the same row are **identical in every
respect** — there's no way to tell the original from the duplicate.

```sql
-- WRONG: deleting both copies -> losing the correct data too
delete from fct_nap f
where exists (select 1 from fct_nap g
              where g.don_hang_id = f.don_hang_id and g.dong = f.dong
                and g.lo_nap <> f.lo_nap);
-- 10 dong bien mat, DH003 va DH005 mat sach
```

The only escape without audit is `row_number()` keeping one copy:

```sql
delete from fct_nap where rowid in (
  select rowid from (select rowid, row_number() over
    (partition by don_hang_id, dong order by rowid) rn from fct_nap) where rn > 1);
```

It **works**, but has three serious problems:

1. **Which copy is kept is arbitrary** — `rowid` has no business meaning. If the two batches hold
   different data (batch 2 being a correction), you may have just kept the old version.
2. **You can't trace** what was deleted, or why.
3. **It isn't reproducible** — re-running it on another copy may give a different result.

Exercise B.4 does it properly.

</details>

### Exercise B.4 — With audit: delete exactly 5 rows

**The task:** use `lo_nap` to delete exactly batch 2 and prove revenue is back to correct.

**The answer it must produce:**

```text
┌─────────┬───────────┬─────────┐
│ so_dong │ doanh_thu │  khop   │
├─────────┼───────────┼─────────┤
│      15 │  10215000 │ true    │
└─────────┴───────────┴─────────┘
```

<details>
<summary>Solution</summary>

```sql
create or replace table fct_da_sua as select * from fct_nap where lo_nap <> 2;

select count(*) so_dong, sum(so_luong*don_gia) doanh_thu,
       sum(so_luong*don_gia) = 10215000 khop
from fct_da_sua;
```

**One `where` clause.** That's the entire value of an audit dimension — and it's only valuable
if that column **was already there before the incident happened**. Adding audit after discovering a duplicate
load is too late.

A complete audit dimension should have six columns, each answering one question:

```sql
create or replace table dim_audit (
  audit_key    int primary key,
  lo_nap       int,           -- which batch
  nap_luc      timestamp,     -- when it ran
  nguon        varchar,       -- from which system
  phien_ban_code varchar,     -- the pipeline's git sha
  so_dong_doc  int,           -- how many rows read
  so_dong_ghi  int            -- how many rows written
);
```

Four questions an audit dimension answers that are **unanswerable** without it:

| The question | The column |
|---|---|
| "Delete the broken batch without touching the correct data" | `lo_nap` |
| "When was this number produced" | `nap_luc` |
| "After the code change, did the number change" | `phien_ban_code` |
| "Did the source send fewer rows than expected" | `so_dong_doc` vs `so_dong_ghi` |

`phien_ban_code` is the most easily forgotten column and the one that saves the most: when somebody asks *"why is
June's number different from June's number last month"*, comparing two `phien_ban_code` values answers it at once.

The cost: **one `int` column per fact row**. See
[the case study on a file loaded twice with no traceability](../case-studies/nap-hai-lan-khong-truy-duoc.md).

</details>

### Exercise B.5 — Inventory reconciliation: one cause, two symptoms

**The task:** reconcile `kho_hang` against quantities sold, and find each item's **first divergent row**.
Opening stock on 01/07: `SP-A` 100 · `SP-B` 50 · `SP-C` 20 · `SP-D` 200.

**The answer it must produce:**

```text
┌─────────┬────────────────────┬──────────────────┐
│ ma_hang │ ngay_lech_dau_tien │ so_dong_bao_lech │
├─────────┼────────────────────┼──────────────────┤
│ SP-B    │ 2026-07-04         │                2 │
└─────────┴────────────────────┴──────────────────┘
```

**Two rows reporting divergence, but only one cause.**

<details>
<summary>Solution</summary>

```sql
with ban as (select ngay, ma_hang, sum(so_luong) da_ban
             from don_hang_chi_tiet group by 1,2),
     dau as (select * from (values ('SP-A',100),('SP-B',50),('SP-C',20),('SP-D',200))
             t(ma_hang, ton_dau)),
     luy as (select k.ngay, k.ma_hang, k.ton_cuoi_ngay,
                    d.ton_dau - sum(coalesce(b.da_ban,0))
                      over (partition by k.ma_hang order by k.ngay) ton_tinh
             from kho_hang k join dau d using (ma_hang)
             left join ban b on b.ngay = k.ngay and b.ma_hang = k.ma_hang)
select ma_hang, min(ngay) ngay_lech_dau_tien, count(*) so_dong_bao_lech
from luy where ton_cuoi_ngay <> ton_tinh
group by 1;
```

`SP-B` on 04/07 records 41 but computes to 40. And because stock is **cumulative**, the error **spreads to
every following day** — 05/07 also reports divergence even though that day's data is perfectly correct.

This is a property of every reconciliation on cumulative numbers, and it changes how you read the result entirely:

```text
So dong bao loi  ≠  So loi that
```

On real data with 400 days, one error on day 3 makes **398 rows** go red. Seeing "398 errors" on a
report is alarming and you start fixing row by row — entirely wrong.

**The rule: with cumulative numbers, always find the FIRST divergent row, never count the total divergent rows.**
The `min(ngay)` in the statement above is exactly that. Fix the first row and every row after it clears itself.

The right presentation for a reconciliation report:

```sql
select ma_hang, min(ngay) lech_tu_ngay,
       arg_min(ton_cuoi_ngay - ton_tinh, ngay) chenh_ban_dau
from luy where ton_cuoi_ngay <> ton_tinh group by 1;
```

One row per item, giving the date and the original gap — not 398 rows.

</details>

---

## Group C — Real-time fact tables

### Exercise C.1 — Today isn't full yet

**The task:** with `su_kien_web`, count events per day along with the first/last moment and the number of minutes
covered.

**The answer it must produce:**

```text
┌────────────┬────────────┬─────────────────────┬─────────────────────┬───────────────┐
│    ngay    │ so_su_kien │         dau         │        cuoi         │ phut_phu_song │
├────────────┼────────────┼─────────────────────┼─────────────────────┼───────────────┤
│ 2026-07-01 │          8 │ 2026-07-01 09:00:00 │ 2026-07-01 14:10:00 │           310 │
│ 2026-07-02 │         11 │ 2026-07-02 08:00:00 │ 2026-07-02 16:00:00 │           480 │
│ 2026-07-03 │          8 │ 2026-07-03 10:00:00 │ 2026-07-03 13:00:00 │           180 │
│ 2026-07-04 │          9 │ 2026-07-04 09:00:00 │ 2026-07-04 20:00:00 │           660 │
│ 2026-07-05 │          7 │ 2026-07-05 08:00:00 │ 2026-07-05 09:50:00 │           110 │
└────────────┴────────────┴─────────────────────┴─────────────────────┴───────────────┘
```

05/07 stops at **09:50**. It's "today", and it isn't finished.

<details>
<summary>Solution</summary>

```sql
with theo_ngay as (
  select cast(thoi_diem as date) ngay, count(*) so_su_kien,
         min(thoi_diem) dau, max(thoi_diem) cuoi
  from su_kien_web group by 1)
select ngay, so_su_kien, dau, cuoi,
       date_diff('minute', dau, cuoi) phut_phu_song
from theo_ngay order by ngay;
```

The `so_su_kien` column **doesn't tell you that**. 05/07 has 7 events and 03/07
has 8 — at a glance the two days look comparable. But 05/07 has only run for **110 minutes** while
03/07 finished its whole day.

This is every real-time table's problem: **the current period is an incomplete period, but it sits in the same
table as the complete ones** — with no column distinguishing them.

Note that `phut_phu_song` isn't a reliable measure either: 03/07 covers only 180 minutes because
customers weren't active, not because data is missing. **Coverage span ≠ completeness.**

Exercise C.2 measures the consequence, exercise C.3 is the way out.

</details>

### Exercise C.2 — The incomplete day drags the average down 4.4%

**The task:** compute the average events per day **with** and **without** the last day.

**The answer it must produce:**

```text
┌───────────────┬──────────────────┬────────────────┐
│ avg_ca_5_ngay │ avg_bo_ngay_cuoi │ lech_phan_tram │
├───────────────┼──────────────────┼────────────────┤
│           8.6 │              9.0 │           -4.4 │
└───────────────┴──────────────────┴────────────────┘
```

<details>
<summary>Solution</summary>

```sql
with theo_ngay as (select cast(thoi_diem as date) ngay, count(*) n from su_kien_web group by 1)
select round(avg(n),2) avg_ca_5_ngay,
       round(avg(n) filter (where ngay < '2026-07-05'),2) avg_bo_ngay_cuoi,
       round(100.0*(avg(n) - avg(n) filter (where ngay < '2026-07-05'))
             / avg(n) filter (where ngay < '2026-07-05'), 1) lech_phan_tram
from theo_ngay;
```

A gap of **4.4%** with data cut only 14 hours short. With data cut earlier — a report running
at 9am — today has only ~1/10 of its events, and the 5-day average is ~18% out.

But the divergence figure **isn't** the main problem. Three heavier consequences:

**1. "Today's" number jumps all day.** Running the report at 9am and at 3pm gives two different results,
and the user concludes "the report isn't trustworthy". Exactly
[the case study on today's number jumping all day](../case-studies/so-hom-nay-nhay-suot-ngay.md).

**2. The comparison against the prior period is always negative.** "Today vs yesterday: −85%" is a false alarm every
morning — and after a few weeks nobody reads the alerts any more.

**3. The trend line always breaks at the last point.** Every chart dips on the final day, giving a false
impression of a downward trend.

All three share one root: **an incomplete period treated as a complete one.**

</details>

### Exercise C.3 — The `ngay_da_day_du` column and three ways to use it

**The task:** add a column marking days whose data is complete, then state three ways a report uses it.

**The answer it must produce:**

```text
┌────────────┬───────┬─────────────────────┬────────────────┐
│    ngay    │   n   │        cuoi         │ ngay_da_day_du │
├────────────┼───────┼─────────────────────┼────────────────┤
│ 2026-07-01 │     8 │ 2026-07-01 14:10:00 │ false          │
│ 2026-07-02 │    11 │ 2026-07-02 16:00:00 │ false          │
│ 2026-07-03 │     8 │ 2026-07-03 13:00:00 │ false          │
│ 2026-07-04 │     9 │ 2026-07-04 20:00:00 │ true           │
│ 2026-07-05 │     7 │ 2026-07-05 09:50:00 │ false          │
└────────────┴───────┴─────────────────────┴────────────────┘
```

This result is **wrong** — only 04/07 is marked complete, while 01–03/07 aren't. Work out why,
and fix it.

<details>
<summary>Solution</summary>

```sql
-- THE WRONG WAY: inferring from the data
with theo_ngay as (
  select cast(thoi_diem as date) ngay, count(*) n, max(thoi_diem) cuoi,
         max(thoi_diem) >= cast(thoi_diem as date) + interval 20 hour ngay_da_day_du
  from su_kien_web group by 1)
select * from theo_ngay order by ngay;
```

This statement infers "the day is complete" from *"is there an event after 20:00"* — and it's wrong because **an absence of
evening events doesn't mean the data is missing**. 01/07 simply had nobody visiting
after 14:00.

**Completeness cannot be inferred from the data itself.** That's this exercise's main lesson, and it
holds for every real-time table: data doesn't know whether it's missing anything.

Completeness is **metadata about the loading process**, which the pipeline must record:

```sql
create or replace table trang_thai_nap (
  ngay date primary key,
  da_chot boolean,          -- the pipeline writes 'true' once the whole day is loaded
  chot_luc timestamp,
  nguon varchar
);
-- the pipeline writes here after finishing the previous day's load
insert into trang_thai_nap values
  ('2026-07-01', true, '2026-07-02 02:00:00', 'web-events'),
  ('2026-07-02', true, '2026-07-03 02:00:00', 'web-events'),
  ('2026-07-03', true, '2026-07-04 02:00:00', 'web-events'),
  ('2026-07-04', true, '2026-07-05 02:00:00', 'web-events'),
  ('2026-07-05', false, null, 'web-events');     -- today, not yet closed
```

Three ways a report uses that column, chosen by audience:

| The way | What it does | Suits |
|---|---|---|
| **Exclude the unclosed period** | `where da_chot` | management reports, KPIs, period comparisons |
| **Show it but mark it** | draw a dashed line, label it *"updating"* | operational dashboards |
| **Extrapolate** | `n / phan_ngay_da_troi_qua` | intraday forecasting |

The third is the most dangerous and needs the clearest label — it creates a number that **isn't real**,
and the reader will remember the number rather than the label.

**The default should be the first.** A user able to ask "why is there no number for today yet" is better than
one who believes a wrong number.

</details>

### Exercise C.4 — Two tables: hot and cold

**The task:** no SQL. Describe the architecture separating the real-time table from the history table.

<details>
<summary>Solution</summary>

```text
fct_su_kien_nong    ← hom nay, ghi lien tuc, khong phan vung, khong nen
fct_su_kien_nguoi   ← da chot, phan vung theo ngay, nen chat, sap xep
v_su_kien           ← view union hai cai
```

```sql
create or replace view v_su_kien as
select *, false la_du_lieu_nong from fct_su_kien_nguoi
union all
select *, true from fct_su_kien_nong;
```

Four differences force the split:

| | The hot table | The cold table |
|---|---|---|
| Writes | continuous, seconds of latency | once a day |
| Compression / partitioning | **none** — it slows writes | tightly compressed, partitioned by day |
| Corrections | frequent | **almost never** |
| Optimised for | fast writes | fast reads |

The hot table optimises for **writing**, the cold one for **reading** — two conflicting goals, so
one table can't do both well.

At midnight, yesterday's data **moves from hot to cold**: written into the cold table, deleted from the hot
one, and `trang_thai_nap.da_chot = true` updated. Those three operations must be in **one transaction**,
or follow exactly that order — the wrong order double-counts data or makes it vanish for a few
minutes.

The `la_du_lieu_nong` column in the view is an important detail: it lets every report filter the unclosed
period with **one** condition, without knowing anything about the two-table architecture.

On a modern lakehouse (Iceberg, Delta) this boundary blurs, because the engine compacts by itself.
But the **concept** doesn't disappear: you still have to know which data is closed, and that's still
metadata written by the pipeline, not something inferable from the data.

See [real-time fact tables](../skills/real-time-fact.md).

</details>

---

## Quick reconciliation table

| The number | What it means | Exercise |
|---|---|---|
| `ngay_key = -1`, `ngay = NULL` | `dim_ngay`'s unknown member | A.1 |
| 23 and 21 working days | the calendar is data, not a function | A.2 |
| 8 rows rather than 5 | a day with no transactions must still appear | A.3 |
| 20 rows · 14,865,000 · **+45.5%** | 5 duplicate rows, 45.5% money inflation | B.1 |
| `so_lo` = 2 | distinguishing a duplicate load from a wrong grain | B.2 |
| **10 rows implicated / 5 worth deleting** | without audit you delete twice as much as needed | B.3 |
| 15 rows · 10,215,000 | with audit: one `where` and it's done | B.4 |
| 2 divergent rows / 1 cause | a cumulative error spreads into the following day | B.5 |
| 8.6 vs 9.0 (−4.4%) | the incomplete day drags the average down | C.2 |
| only 04/07 `true` | **completeness can't be inferred from the data** | C.3 |

## Related Topics

- [Exercise set 6 — Integration](bt-06-tich-hop.md) — the previous set
- [Exercises — Data Modeling](index.md) — the full index
- [The operations lab](lab-van-hanh.md) — the diagnostic version of the same subject
- [Skills — Data Modeling](../skills/index.md) — the theory behind the three techniques above
