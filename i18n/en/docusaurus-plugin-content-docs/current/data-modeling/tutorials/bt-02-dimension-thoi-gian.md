---
title: "Exercise set 2 — Dimensions over time: SCD, change detection, mini-dims, role-playing, late arrivals"
sidebar_position: 11
description: "22 exercises to write yourself: building Type 2 from daily extracts, catching three ways updated_at lies, splitting out a mini-dimension, dim_ngay's three roles, and assigning keys to a late-arriving fact."
tags: [tutorial, bai-tap, scd, scd-change-detection, mini-dimension, role-playing-dimension, late-arriving, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Exercise set 2 — Dimensions over time

> **Takeaway:** the five techniques in this set answer **one** question from five angles —
> *the attribute has changed; which value should a report about the past use?* Get the angle wrong and you still get a
> correct number, just correct for a different question.

## Techniques practised in this set

| # | Technique | Source document | Exercises |
|---|---|---|---|
| 1 | SCD Type 1/2/3/6 | [SCD](../skills/scd.md) | 5 |
| 2 | Change detection | [Change detection for SCD 2](../skills/scd-change-detection.md) | 5 |
| 3 | Mini-dimensions | [Mini-dimensions](../skills/mini-dimension.md) | 4 |
| 4 | Role-playing dimensions | [Role-playing dimensions](../skills/role-playing-dimension.md) | 4 |
| 5 | Late-arriving data | [Late-arriving data](../skills/late-arriving.md) | 4 |

## Preparation

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

This set lives on `khach_hang_lich_su` — 4 customers × 5 days, see
[the seed appendix](bt-00-seed.md#khach_hang_lich_sucsv). Several exercises reuse the `dim_khach_t2`
built in [set 1, exercise C.2](bt-01-nen-tang.md#exercise-c2--build-a-type-2-dimension-from-daily-extracts);
if you don't have it, go back and build it first.

---

## Group A — SCD Type 1, 2, 3, 6

### Exercise A.1 — Three kinds of SCD, three row counts

**The task:** count the rows of a customer dimension under three treatments: Type 1 (overwrite, no
history), Type 2 **on the slow columns only** (`khu_vuc`, `hang`), and Type 2 **on every column**.

**The answer it must produce:**

```text
┌───────────────────┬─────────┐
│       kieu        │ so_dong │
├───────────────────┼─────────┤
│ Type 1 (ghi de)   │       4 │
│ Type 2 (cot cham) │       6 │
│ Type 2 (moi cot)  │      18 │
└───────────────────┴─────────┘
```

**4 → 6 → 18.** Change only the list of triggering columns and the dim triples.

<details>
<summary>Solution</summary>

```sql
select 'Type 1 (ghi de)' kieu, count(distinct khach_id) so_dong from khach_hang_lich_su
union all select 'Type 2 (cot cham)', count(*) from dim_khach_t2
union all select 'Type 2 (moi cot)', count(*)
  from (select distinct khach_id, khu_vuc, hang, nhom_tuoi, khoang_thu_nhap, diem_tin_dung
        from khach_hang_lich_su);
```

Over 5 days, the gap between 6 and 18 doesn't sound alarming. Scale it up to real size and it changes
the nature of the problem entirely:

| | 4 customers × 5 days | 1 million customers × 3 years |
|---|---|---|
| Type 1 | 4 | 1 million |
| Type 2 on slow columns | 6 | ~3 million |
| Type 2 on every column | 18 | **~1 billion** |

The billion figure isn't scaremongering — it's the arithmetic consequence of letting a daily-changing column
(`diem_tin_dung`) into the trigger list. See
[the case study on a dimension 365× bloated](../case-studies/dimension-phinh-365-lan.md).

**What to do every time you build Type 2:** write out the trigger-column list explicitly,
right in the code — and defend it in review. That list is the most expensive design decision in the whole
dimension.

</details>

### Exercise A.2 — As-was and as-is: 2.55 million moving from North to South

**The task:** compute revenue by `khu_vuc` **twice**: (a) *as-was* — the customer's region **at
order time**; (b) *as-is* — the **current** region. Put them side by side with a difference column.

**The answer it must produce:**

```text
┌────────────┬─────────┬─────────┬──────────┐
│  khu_vuc   │ as_was  │  as_is  │  chenh   │
├────────────┼─────────┼─────────┼──────────┤
│ Mien Bac   │ 4200000 │ 1650000 │ -2550000 │
│ Mien Nam   │ 3915000 │ 6465000 │  2550000 │
│ Mien Trung │ 2100000 │ 2100000 │        0 │
└────────────┴─────────┴─────────┴──────────┘
```

Both columns total **10,215,000**. Neither is wrong — but the North differs by
**2.55 million**, i.e. **154%** against itself.

<details>
<summary>Solution</summary>

```sql
with tien as (
  select h.don_hang_id, h.khach_id, h.ngay_dat, sum(ct.so_luong*ct.don_gia) tien
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1,2,3)
select coalesce(w.khu_vuc, i.khu_vuc) khu_vuc,
       coalesce(w.as_was,0) as_was, coalesce(i.as_is,0) as_is,
       coalesce(i.as_is,0)-coalesce(w.as_was,0) chenh
from (select d.khu_vuc, sum(t.tien) as_was
      from tien t join dim_khach_t2 d
        on d.khach_id = t.khach_id
       and t.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den
      group by 1) w
full join (select d.khu_vuc, sum(t.tien) as_is
           from tien t join dim_khach_t2 d
             on d.khach_id = t.khach_id and d.la_hien_tai
           group by 1) i using (khu_vuc)
order by 1;
```

The whole difference comes from **one** customer: `C1` moved from the North to the South on
03/07, taking two old orders `DH001` (600,000) and `DH003` (1,950,000) = **2,550,000**.

Which question uses which number:

| The business question | Uses |
|---|---|
| "How much did the North branch sell in July?" | **as-was** — that branch really did sell it |
| "How much have today's Southern customers ever bought?" | **as-is** — analysis over the current customer set |
| "Why does this month's June report differ from last month's?" | you're using **as-is** while thinking it's as-was |

The danger isn't choosing wrong, it's **not knowing which one you're using**. In an
as-is report the past figures **change themselves** every time the dimension updates — see
[the case study on historical reports changing their own numbers](../case-studies/bao-cao-qua-khu-tu-doi-so.md).

Write it straight into the column name or the report title: `doanh_thu_theo_khu_vuc_luc_dat_hang`.

</details>

### Exercise A.3 — Three integrity checks for Type 2

**The task:** write **one** statement returning three numbers that must all be zero: the number of version pairs with
**overlapping** validity intervals, the number of customers whose **current-version count isn't 1**, and the number of **gaps**
between consecutive versions.

**The answer it must produce:**

```text
┌──────────────────┬───────────────────────────┬───────────┐
│ so_cap_chong_lan │ khach_sai_so_ban_hien_tai │ so_cho_ho │
├──────────────────┼───────────────────────────┼───────────┤
│                0 │                         0 │         0 │
└──────────────────┴───────────────────────────┴───────────┘
```

These three zeros should be a **test running on every build**, not a query run once and
forgotten.

<details>
<summary>Solution</summary>

```sql
select
  (select count(*) from dim_khach_t2 a join dim_khach_t2 b
     on a.khach_id = b.khach_id and a.khach_key < b.khach_key
    and a.hieu_luc_tu <= b.hieu_luc_den and b.hieu_luc_tu <= a.hieu_luc_den) so_cap_chong_lan,
  (select count(*) from (select khach_id, count(*) filter (where la_hien_tai) n
                         from dim_khach_t2 group by 1) where n <> 1) khach_sai_so_ban_hien_tai,
  (select count(*) from (select khach_id, hieu_luc_den,
                                lead(hieu_luc_tu) over (partition by khach_id order by hieu_luc_tu) tiep
                         from dim_khach_t2)
    where tiep is not null and tiep <> hieu_luc_den + interval 1 day) so_cho_ho;
```

The three checks catch three different bugs, each breaking in its own way:

| The check | The bug it catches | The symptom if skipped |
|---|---|---|
| **Overlap** | two versions in force on the same day | the as-was join returns **2 rows** → revenue doubles |
| **Current-version count ≠ 1** | forgetting to close the old version, or closing them all | as-is returns **doubles** or **0 rows** |
| **Gaps** | a day covered by no version | that day's fact falls into `-1`, **lost from the report** |

The overlap condition `a.tu <= b.den and b.tu <= a.den` is the standard form for two intervals intersecting.
Writing `a.tu between b.tu and b.den` **misses half** the cases — an interval b sitting entirely
inside a slips through.

In dbt these three become three singular tests in `tests/`. See
[SCD](../skills/scd.md) and [the SCD lab with dbt snapshots](scd-bang-dbt-snapshot.md).

</details>

### Exercise A.4 — Type 3: a "previous value" column

**The task:** for each customer, take the **current** version plus a `khu_vuc_truoc` column — the value
immediately before — and the change date. That's Type 3.

**The answer it must produce:**

```text
┌──────────┬──────────────────┬───────────────┬────────────┐
│ khach_id │ khu_vuc_hien_tai │ khu_vuc_truoc │  ngay_doi  │
├──────────┼──────────────────┼───────────────┼────────────┤
│ C1       │ Mien Nam         │ Mien Bac      │ 2026-07-03 │
│ C2       │ Mien Nam         │ NULL          │ 2026-07-01 │
│ C3       │ Mien Trung       │ Mien Trung    │ 2026-07-04 │
│ C4       │ Mien Bac         │ NULL          │ 2026-07-01 │
└──────────┴──────────────────┴───────────────┴────────────┘
```

Two rows in this table **expose exactly where Type 3 breaks**. Find both.

<details>
<summary>Solution</summary>

```sql
select khach_id, khu_vuc khu_vuc_hien_tai,
       lag(khu_vuc) over (partition by khach_id order by hieu_luc_tu) khu_vuc_truoc,
       hieu_luc_tu ngay_doi
from dim_khach_t2 qualify la_hien_tai order by khach_id;
```

**Break one — `C3`:** `khu_vuc_truoc` = `Mien Trung`, identical to the current value. Because
`C3` changed `hang` (Silver → Gold), not `khu_vuc`. Type 3 has **one `_truoc` column per
attribute**, and that column is "consumed" by any change to the record. Looking at this table,
the reader concludes "C3 used to be in Mien Trung and then moved to Mien Trung" — nonsense.

**Break two — `C2` and `C4`:** `khu_vuc_truoc` is `NULL` because they've never changed. Any
query of the form `where khu_vuc_truoc <> khu_vuc` will **silently exclude** these two customers (three-valued
logic). It has to be `is distinct from`.

And a third break, not visible here because the data is too short: Type 3 remembers **one** step only.
When a customer changes region a second time, the first step is lost forever.

So Type 3 suits only one narrow situation: **a rare, planned change where you need to compare
old/new side by side** — for example a once-a-year sales-territory restructure, when reports need to be viewed
by both the old and the new territories. Outside that case, use Type 2.

</details>

### Exercise A.5 — Type 6: history and the present on one row

**The task:** extend `dim_khach_t2` into Type 6 — each row carrying **both** `khu_vuc_luc_do` (that
version's value) **and** `khu_vuc_hien_tai` (the customer's latest value).

**The answer it must produce:**

```text
┌───────────┬──────────┬────────────────┬──────────────────┬─────────────┬──────────────┐
│ khach_key │ khach_id │ khu_vuc_luc_do │ khu_vuc_hien_tai │ hieu_luc_tu │ hieu_luc_den │
├───────────┼──────────┼────────────────┼──────────────────┼─────────────┼──────────────┤
│         1 │ C1       │ Mien Bac       │ Mien Nam         │ 2026-07-01  │ 2026-07-02   │
│         2 │ C1       │ Mien Nam       │ Mien Nam         │ 2026-07-03  │ 9999-12-31   │
│         3 │ C2       │ Mien Nam       │ Mien Nam         │ 2026-07-01  │ 9999-12-31   │
│         4 │ C3       │ Mien Trung     │ Mien Trung       │ 2026-07-01  │ 2026-07-03   │
│         5 │ C3       │ Mien Trung     │ Mien Trung       │ 2026-07-04  │ 9999-12-31   │
│         6 │ C4       │ Mien Bac       │ Mien Bac         │ 2026-07-01  │ 9999-12-31   │
└───────────┴──────────┴────────────────┴──────────────────┴─────────────┴──────────────┘
```

Only **row 1** has two different columns. That's the entire value of Type 6.

<details>
<summary>Solution</summary>

```sql
select d.khach_key, d.khach_id, d.khu_vuc khu_vuc_luc_do,
       (select c.khu_vuc from dim_khach_t2 c
        where c.khach_id = d.khach_id and c.la_hien_tai) khu_vuc_hien_tai,
       d.hieu_luc_tu, d.hieu_luc_den
from dim_khach_t2 d order by d.khach_id, d.hieu_luc_tu;
```

Type 6 = Type 1 + Type 2 + Type 3 in one table. The fact joins **once** by
`khach_key`, and the reader then **picks the column**:

```sql
-- one join, two viewpoints
select khu_vuc_luc_do,    sum(tien) from ... -- as-was, gives 4,200,000 for Mien Bac
select khu_vuc_hien_tai,  sum(tien) from ... -- as-is,  gives 1,650,000
```

That's the real advantage: exercise A.2 had to write **two** different join styles, while here you just change a
column name. A BI user will never write the `between ... and ...` condition correctly, but
changing a column is something anybody can do.

The price: the `_hien_tai` column must be **updated across every old version** whenever the customer changes.
One change for `C1` means `update`ing both of C1's rows. That's a bulk overwrite on a large
table — on Iceberg/Delta that's a file rewrite, and it isn't cheap.

**The choosing rule:** an attribute where **both viewpoints are asked for regularly** gets Type
6. Everything else gets Type 2, forcing the user to say which they want.

</details>

---

## Group B — Change detection

### Exercise B.1 — Three detection methods, one truth

**The task:** for the two slow columns `khu_vuc` and `hang`, count the real changes from 02/07 onwards, then
compare against what **`updated_at`** reports and what a **hash** reports. Include the number of changes `updated_at`
**misses** and **reports spuriously**.

**The answer it must produce:**

```text
┌─────────┬────────────────┬──────────┬───────────────────┬─────────────────────┬──────────┐
│ su_that │ updated_at_bao │ hash_bao │ updated_at_BO_SOT │ updated_at_BAO_THUA │ hash_sai │
├─────────┼────────────────┼──────────┼───────────────────┼─────────────────────┼──────────┤
│       2 │              3 │        2 │                 1 │                   2 │        0 │
└─────────┴────────────────┴──────────┴───────────────────┴─────────────────────┴──────────┘
```

**`updated_at` reports 3 when the truth is 2 — and of those 3, only 1 is right.** The hash is
exactly right.

<details>
<summary>Solution</summary>

```sql
with x as (
  select ngay_trich, khach_id,
    (lag(khu_vuc) over w is distinct from khu_vuc
     or lag(hang) over w is distinct from hang) su_that,
    (lag(updated_at) over w is distinct from updated_at) theo_updated_at,
    (lag(md5(khu_vuc||'|'||hang)) over w is distinct from md5(khu_vuc||'|'||hang)) theo_hash
  from khach_hang_lich_su window w as (partition by khach_id order by ngay_trich))
select count(*) filter (where su_that) su_that,
       count(*) filter (where theo_updated_at) updated_at_bao,
       count(*) filter (where theo_hash) hash_bao,
       count(*) filter (where su_that and not theo_updated_at) updated_at_BO_SOT,
       count(*) filter (where not su_that and theo_updated_at) updated_at_BAO_THUA,
       count(*) filter (where su_that <> theo_hash) hash_sai
from x where ngay_trich > '2026-07-01';
```

The hash is **never** wrong, because it's computed over exactly the content being tracked — it can't
disagree with the truth, it *is* the truth compressed.

`updated_at` is wrong because it's **a promise from the source system**, and the source system made no promise
to the warehouse. One hand-run `UPDATE` bypassing the trigger, one batch job `touch`ing the whole table, and
the promise is broken.

The only condition under which to trust `updated_at`: it's produced by **CDC reading the transaction log**
(Debezium, binlog). Then it isn't a column the application writes but a trace the database writes —
an entirely different level of reliability.

</details>

### Exercise B.2 — Name every row where `updated_at` lies

**The task:** list **each row** where `updated_at` disagrees with the truth, labelled `BO SOT` /
`BAO THUA` / `khop`.

**The answer it must produce:**

```text
┌────────────┬──────────┬────────────┬─────────┬─────────┬─────────────────┬──────────┐
│ ngay_trich │ khach_id │  khu_vuc   │  hang   │ su_that │ theo_updated_at │ ket_luan │
├────────────┼──────────┼────────────┼─────────┼─────────┼─────────────────┼──────────┤
│ 2026-07-03 │ C1       │ Mien Nam   │ Bac     │ true    │ false           │ BO SOT   │
│ 2026-07-04 │ C1       │ Mien Nam   │ Bac     │ false   │ true            │ BAO THUA │
│ 2026-07-03 │ C2       │ Mien Nam   │ Vang    │ false   │ true            │ BAO THUA │
│ 2026-07-04 │ C3       │ Mien Trung │ Vang    │ true    │ true            │ khop     │
└────────────┴──────────┴────────────┴─────────┴─────────┴─────────────────┴──────────┘
```

<details>
<summary>Solution</summary>

```sql
with x as (
  select ngay_trich, khach_id, khu_vuc, hang, updated_at,
    (lag(khu_vuc) over w is distinct from khu_vuc
     or lag(hang) over w is distinct from hang) su_that,
    (lag(updated_at) over w is distinct from updated_at) theo_updated_at
  from khach_hang_lich_su window w as (partition by khach_id order by ngay_trich))
select ngay_trich, khach_id, khu_vuc, hang, su_that, theo_updated_at,
       case when su_that and not theo_updated_at then 'BO SOT'
            when not su_that and theo_updated_at then 'BAO THUA' else 'khop' end ket_luan
from x where ngay_trich > '2026-07-01' and (su_that or theo_updated_at)
order by khach_id, ngay_trich;
```

Three stories, three consequences:

**`C1` on 03/07 — `BO SOT`.** The customer really moved region while `updated_at` sat still at `2026-06-28`.
A pipeline trusting `updated_at` **won't create a new version**, and every order from 03/07 gets assigned to
the North. This bug is **completely silent** — no row missing, no total off,
just the wrong region.

**`C1` on 04/07 — `BAO THUA`.** `updated_at` moves to `2026-07-04` but neither slow column
changed (`khoang_thu_nhap` did). A pipeline trusting `updated_at` creates a spurious third version.
From then on `C1` has 3 versions, and the as-was join still returns one row so **nobody notices** —
the dim just bloats.

**`C2` on 03/07 — pure `BAO THUA`.** Not one column changed, yet `updated_at` moved.
This is the trace of a batch job `touch`ing the whole table — very common in older source systems.

Note that `C1` appears in **both** kinds of error, on consecutive days. So a statistic like *"`updated_at`
is 90% accurate"* is meaningless: the wrong and the right aren't randomly distributed,
they cling to exactly the customers who change most.

</details>

### Exercise B.3 — Choosing the trigger columns: one decision, three results

**The task:** count the Type 2 versions produced under **three** different trigger-column lists:
`khu_vuc` alone; `khu_vuc` + `hang`; and all 5 business columns.

**The answer it must produce:**

```text
┌──────────────────────────────┬─────────┐
│           kich_hoat          │ so_dong │
├──────────────────────────────┼─────────┤
│ 1. chi khu_vuc               │       5 │
│ 2. khu_vuc + hang            │       6 │
│ 3. toan bo 5 cot nghiep vu   │      18 │
└──────────────────────────────┴─────────┘
```

<details>
<summary>Solution</summary>

```sql
select '1. chi khu_vuc' kich_hoat, count(*) so_dong
  from (select distinct khach_id, khu_vuc from khach_hang_lich_su)
union all select '2. khu_vuc + hang', count(*)
  from (select distinct khach_id, khu_vuc, hang from khach_hang_lich_su)
union all select '3. toan bo 5 cot nghiep vu', count(*)
  from (select distinct khach_id, khu_vuc, hang, nhom_tuoi, khoang_thu_nhap, diem_tin_dung
        from khach_hang_lich_su);
```

The way to choose isn't "which column is important" but **"which attribute must a report about the past
get right as of the time"**. Ask each column exactly one question:

> *If this column changes, is last month's report allowed to change its numbers with it?*

| Column | The answer | Type |
|---|---|---|
| `khu_vuc` | No — the old branch's revenue must stay put | **2** |
| `hang` | No — the loyalty programme is computed on the tier at the time | **2** |
| `ho_ten` | Yes — fixing a spelling fixes it everywhere | **1** |
| `nhom_tuoi`, `khoang_thu_nhap` | History needed, but they change fast | **a mini-dimension** |
| `diem_tin_dung` | This is a measure, not an attribute | **put it in the fact** |

The 18 in row 3 is the price of **not asking that question** — cramming everything into Type 2 to be
"safe". It isn't safe, it's just expensive.

</details>

### Exercise B.4 — Hashing: two traps when concatenating

**The task:** compute a hash for two different value sets whose concatenation is **identical**,
and one set containing `NULL`. Prove both make the hash wrong.

**The answer it must produce:**

```text
┌─────────┬─────────┬─────────┬──────────────────────────────────┐
│    a    │    b    │   noi   │             hash_sai             │
├─────────┼─────────┼─────────┼──────────────────────────────────┤
│ Mien    │ Bac     │ MienBac │ 20a4935c32b2fe4c8ab55965e6d4ea4d │
│ M       │ ienBac  │ MienBac │ 20a4935c32b2fe4c8ab55965e6d4ea4d │
└─────────┴─────────┴─────────┴──────────────────────────────────┘
```

Two rows, two different value sets, **the same hash**. And the second trap:

```text
┌───────────┐
│ hash_null │
├───────────┤
│ NULL      │
└───────────┘
```

<details>
<summary>Solution</summary>

```sql
-- TRAP 1: concatenating with no separator
select a, b, a||b noi, md5(a||b) hash_sai
from (values ('Mien','Bac'), ('M','ienBac')) t(a,b);

-- TRAP 2: one NULL column makes the whole hash NULL
select md5('Mien Bac' || '|' || null) hash_null;
```

**Trap 1 — a missing separator.** `'Mien'||'Bac'` and `'M'||'ienBac'` give the same string
`MienBac`, so the same hash. Two different records are treated as identical → **a missed
change**. On real data this happens with product codes and warehouse codes concatenated together.

**Trap 2 — `NULL` swallowing the whole string.** `'abc' || NULL` is `NULL` in SQL, so `md5(...)`
is `NULL` too. And `NULL <> NULL` is never `true` → every row containing `NULL` is **never
treated as changed**.

The right way, covering both:

```sql
md5(coalesce(khu_vuc,'~') || '|' || coalesce(hang,'~'))
```

The `|` must be a character that **cannot appear in the data**; the `~` for `NULL` must differ from
the empty string, or `NULL` and `''` would hash the same.

dbt has a macro that does this correctly:

```sql
{{ dbt_utils.generate_surrogate_key(['khu_vuc', 'hang']) }}
```

Using the macro instead of hand-concatenating is the cheapest way to avoid both traps. See
[change detection](../skills/scd-change-detection.md).

</details>

### Exercise B.5 — Detecting a **vanished** record

**The task:** suppose the 05/07 extract **no longer contains** `C4` (the customer was deleted at the source). Write a
statement detecting the vanished record, and answer: what should Type 2 do about it?

**The answer it must produce:**

```text
┌──────────┬─────────────┬────────────┐
│ khach_id │ lan_cuoi_co │  ket_luan  │
├──────────┼─────────────┼────────────┤
│ C4       │ 2026-07-04  │ BIEN MAT   │
└──────────┴─────────────┴────────────┘
```

<details>
<summary>Solution</summary>

```sql
with ngay_cuoi as (select max(ngay_trich) d from khach_hang_lich_su),
     gia_lap as (select * from khach_hang_lich_su
                 where not (ngay_trich = (select d from ngay_cuoi) and khach_id = 'C4'))
select khach_id, max(ngay_trich) lan_cuoi_co, 'BIEN MAT' ket_luan
from gia_lap group by 1
having max(ngay_trich) < (select d from ngay_cuoi);
```

This is the hole **every** change-detection method above misses. `updated_at`, hashing and
column comparison all compare *an existing row* with *the previous row*. A row that's **gone** has nothing
to compare against, so nothing gets reported.

The consequence: a customer deleted at the source stays `la_hien_tai = true` in the dim, **forever**. The
"active customers" report rises steadily and never falls.

Three ways to handle it, chosen by business need:

| The approach | What it does | When |
|---|---|---|
| **Soft delete** | close the version (`hieu_luc_den` = the last day seen), `la_hien_tai=false` | the default — preserves history for old facts |
| **A flag column** | add `da_xoa = true`, keep `la_hien_tai` | when you need to count deleted customers too |
| **A real delete** | `delete` from the dim | **almost never** — old facts lose their foreign key |

The precondition for any of them: the extract must be a **full snapshot**. If the source only
sends changed records (incremental), then "absent" doesn't mean "deleted" — it only
means "unchanged". Confusing the two wipes out the dimension.

**Always state clearly whether the source is full or incremental, right beside the loading code.** See
[late-arriving data](../skills/late-arriving.md).

</details>

---

## Group C — Mini-dimensions

### Exercise C.1 — Prove you must split: 6 × 6 or 6 + 6

**The task:** count the distinct combinations of the **slow columns** (`khu_vuc`, `hang`) and of the
**fast-changing demographic columns** (`nhom_tuoi`, `khoang_thu_nhap`, banded `diem_tin_dung`). Then compare the two
architectures: cramming into one dim, or splitting into two.

**The answer it must produce:**

```text
┌───────────────────────────────┬─────────────┬───────┐
│             cach              │ so_dong_dim │ tong  │
├───────────────────────────────┼─────────────┼───────┤
│ Type 2 moi cot (mot dim)      │          18 │    18 │
│ dim cham + mini-dim (hai dim) │           6 │    12 │
└───────────────────────────────┴─────────────┴───────┘
```

18 against 12 isn't impressive. The real question: **by what law do these two numbers grow?**

<details>
<summary>Solution</summary>

```sql
select 'Type 2 moi cot (mot dim)' cach, 18 so_dong_dim, 18 tong
union all select 'dim cham + mini-dim (hai dim)', 6, (select 6 + count(*) from dim_nhan_khau);
```

This is where small data hides the essence. The growth laws are entirely different:

```text
mot dim  :  so_ban_cham  ×  so_to_hop_nhan_khau     ← NHAN
hai dim  :  so_ban_cham  +  so_to_hop_nhan_khau     ← CONG
```

With `S` slow versions and `M` demographic combinations:

| | 6 × 6 | 1 million customers × 50 combinations |
|---|---|---|
| One dim (multiply) | 36 | **50 million rows** |
| Two dims (add) | 12 | **1,000,050 rows** |

Multiplication versus addition — that's why mini-dimensions exist, not "saving 6 rows".

And the demographic combinations have a **ceiling**: `nhom_tuoi` (5) × `khoang_thu_nhap` (4) × score bands (5)
= at most 100 rows, **however many customers there are**. A mini-dimension is a small table that stays still,
while the customer dim stays large.

</details>

### Exercise C.2 — Build a mini-dimension by banding

**The task:** build `dim_nhan_khau` holding every distinct combination of `nhom_tuoi`,
`khoang_thu_nhap`, and **banded** `diem_tin_dung` (`600-699`, `700-749`, `750-799`,
`800-849`).

**The answer it must produce:**

```text
┌───────────────┬───────────┬─────────────────┬──────────┐
│ nhan_khau_key │ nhom_tuoi │ khoang_thu_nhap │ dai_diem │
├───────────────┼───────────┼─────────────────┼──────────┤
│             1 │ 25-34     │ 10-20tr         │ 700-749  │
│             2 │ 25-34     │ 20-30tr         │ 700-749  │
│             3 │ 25-34     │ tren-30tr       │ 800-849  │
│             4 │ 35-44     │ 20-30tr         │ 750-799  │
│             5 │ 45-54     │ 10-20tr         │ 700-749  │
│             6 │ 45-54     │ 5-10tr          │ 600-699  │
└───────────────┴───────────┴─────────────────┴──────────┘
```

**6 rows.** Without banding, leaving `diem_tin_dung` raw, you'd get 18.

<details>
<summary>Solution</summary>

```sql
create or replace table dim_nhan_khau as
select row_number() over (order by nhom_tuoi, khoang_thu_nhap, dai_diem) nhan_khau_key, *
from (select distinct nhom_tuoi, khoang_thu_nhap,
             case when diem_tin_dung < 700 then '600-699'
                  when diem_tin_dung < 750 then '700-749'
                  when diem_tin_dung < 800 then '750-799'
                  else '800-849' end dai_diem
      from khach_hang_lich_su);

select * from dim_nhan_khau order by nhan_khau_key;
```

**Banding is a technique in itself.** Raw `diem_tin_dung` has 18 values across 5 days and would have
hundreds within a year — the mini-dimension would lose its "small and still" quality entirely. Banded
into 4, the ceiling is fixed forever.

Three rules when banding:

1. **The bands must be set by the business, not by data percentiles.** Bands from `ntile(4)` will **change their
   boundaries on every re-run**, and old reports can't be reproduced.
2. **The bands must cover everything, including beyond the edges.** The `else '800-849'` above is a bug waiting
   to fire — a score of 900 would fall wrongly into that band. Write `else 'tren-800'`.
3. **Changing a band changes the keys.** Adding a band creates new keys for every affected combination; old
   facts still point at the old keys. So the band table itself needs version history if the business changes it often.

</details>

### Exercise C.3 — A fact with two keys, and the question one dim cannot answer

**The task:** build a sales fact pointing at **both** keys — `khach_key` (the slow dim) and
`nhan_khau_key` (the mini-dim) at order time. Then compute revenue by `dai_diem`.

**The answer it must produce:**

```text
┌──────────┬────────┬───────────┐
│ dai_diem │ so_don │ doanh_thu │
├──────────┼────────┼───────────┤
│ 600-699  │      1 │   1200000 │
│ 700-749  │      4 │   3645000 │
│ 750-799  │      3 │   3720000 │
│ 800-849  │      2 │   1650000 │
└──────────┴────────┴───────────┘
```

The 4 rows total **10,215,000**, and `so_don` totals 10. A missing `600-699` band means you're
joining by the customer's **current** band rather than the band at order time.

<details>
<summary>Solution</summary>

```sql
with lich as (
  select ngay_trich, khach_id,
         case when diem_tin_dung < 700 then '600-699'
              when diem_tin_dung < 750 then '700-749'
              when diem_tin_dung < 800 then '750-799'
              else '800-849' end dai_diem,
         nhom_tuoi, khoang_thu_nhap
  from khach_hang_lich_su),
tien as (select h.don_hang_id, h.khach_id, h.ngay_dat, sum(ct.so_luong*ct.don_gia) tien
         from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1,2,3)
select nk.dai_diem, count(*) so_don, sum(t.tien) doanh_thu
from tien t
join lich l on l.khach_id = t.khach_id and l.ngay_trich = t.ngay_dat
join dim_nhan_khau nk on nk.nhom_tuoi = l.nhom_tuoi
                     and nk.khoang_thu_nhap = l.khoang_thu_nhap
                     and nk.dai_diem = l.dai_diem
group by 1 order by 1;
```

The crux: the fact freezes `nhan_khau_key` **at the order date**, exactly as it freezes
`khach_key`. That makes *"which score band was the customer in at purchase time"* answerable **without the customer
dim bloating by a single row**.

It's also the question Type 1 on `diem_tin_dung` **can't** answer: overwriting leaves only
the current score, and every old order gets assigned today's score.

Three possibilities, three architectures:

| The question | What you need |
|---|---|
| "Which band is this customer in **now**?" | Type 1 suffices |
| "Which band were they in at **purchase** time?" | a mini-dim + a key in the fact |
| "How has this customer's score **evolved**?" | a separate fact for credit scores |

The third row is a reminder: when a question starts with *"how has it evolved"*, what you need is a
**fact table**, not a dimension.

</details>

### Exercise C.4 — What a mini-dimension takes away

**The task:** no SQL. Answer: after splitting `nhom_tuoi` into a mini-dimension, which query becomes
**markedly harder** than with everything in one table?

<details>
<summary>Solution</summary>

Three things are lost:

**1. Combined slow × fast filtering is no longer in one table.** The question *"Diamond-tier customers in
the 25-34 age group"* previously needed only a `where` on one dim; now it has to go via the fact to join two dims:

```sql
-- no longer doable directly on the dim
select count(distinct f.khach_key)
from fct_ban_hang f
join dim_khach_t2 d  on d.khach_key = f.khach_key
join dim_nhan_khau n on n.nhan_khau_key = f.nhan_khau_key
where d.hang = 'Kim cuong' and n.nhom_tuoi = '25-34';
```

And this only counts customers **with transactions**. A Diamond-tier customer who hasn't bought anything has
no fact row, so they **vanish from the result**. That's a change of semantics, not
merely longer syntax.

**2. BI users have to understand why there are two customer tables.** This is the real cost and the one usually
overlooked. In a drag-and-drop tool, two dimensions both about customers are a permanent source of
confusion.

**3. A customer's "current" demographic state lives nowhere at all.** It exists only
as a key on fact rows.

The cure for all three: add `nhan_khau_key_hien_tai` to the customer dim — a pointer to the
latest combination. That's **Type 4 with an outrigger**, and it restores all three capabilities at the price of
one column to maintain.

**The pragmatic conclusion:** a mini-dimension is **a solution to a scale problem**. Until you can measure
the dim bloating, don't split — you'd be paying the complexity price for a problem you don't have.
See [Mini-dimensions](../skills/mini-dimension.md).

</details>

---

## Group D — Role-playing dimensions

### Exercise D.1 — One `dim_ngay`, three roles in one statement

**The task:** join `don_hang` to `dim_ngay` **three times** — `ngay_dat`, `ngay_giao`, `ngay_nhan` —
then compute the processing days and the shipping days.

**The answer it must produce:**

```text
┌─────────────┬────────────┬────────────┬────────────┬────────────┬─────────────────┐
│ don_hang_id │  ngay_dat  │ ngay_giao  │ ngay_nhan  │ ngay_xu_ly │ ngay_van_chuyen │
├─────────────┼────────────┼────────────┼────────────┼────────────┼─────────────────┤
│ DH001       │ 2026-07-01 │ 2026-07-03 │ 2026-07-05 │          2 │               2 │
│ DH002       │ 2026-07-01 │ 2026-07-02 │ 2026-07-04 │          1 │               2 │
│ DH003       │ 2026-07-02 │ 2026-07-05 │ 2026-07-09 │          3 │               4 │
│ DH004       │ 2026-07-02 │ 2026-07-04 │ NULL       │          2 │            NULL │
│ DH005       │ 2026-07-03 │ 2026-07-06 │ 2026-07-08 │          3 │               2 │
│ DH006       │ 2026-07-03 │ NULL       │ NULL       │       NULL │            NULL │
│ DH007       │ 2026-07-04 │ 2026-07-07 │ 2026-07-10 │          3 │               3 │
│ DH008       │ 2026-07-04 │ 2026-07-06 │ NULL       │          2 │            NULL │
│ DH009       │ 2026-07-05 │ NULL       │ NULL       │       NULL │            NULL │
│ DH010       │ 2026-07-05 │ 2026-07-08 │ 2026-07-11 │          3 │               3 │
└─────────────┴────────────┴────────────┴────────────┴────────────┴─────────────────┘
```

Use `left join`. How many orders do you lose switching to a plain `join`?

<details>
<summary>Solution</summary>

```sql
select h.don_hang_id, dd.ngay ngay_dat, dg.ngay ngay_giao, dn.ngay ngay_nhan,
       dg.ngay - dd.ngay ngay_xu_ly, dn.ngay - dg.ngay ngay_van_chuyen
from don_hang h
left join dim_ngay dd on dd.ngay = h.ngay_dat
left join dim_ngay dg on dg.ngay = h.ngay_giao
left join dim_ngay dn on dn.ngay = h.ngay_nhan
order by 1;
```

Switching to a plain `join` **loses 4 orders** — every unreceived order (`DH004`, `DH006`, `DH008`,
`DH009`) disappears from the report. With an accumulating snapshot, the *incomplete* orders are exactly the ones
people care about most, so an `inner join` here is a serious bug.

Two ways to do role-playing more cleanly than writing aliases every time:

```sql
-- (a) a view per role — BI users see three clearly-named tables
create or replace view dim_ngay_dat as
  select ngay_key ngay_dat_key, ngay ngay_dat, thang thang_dat,
         la_ngay_lam_viec ngay_dat_la_ngay_lam_viec from dim_ngay;

-- (b) a -1 key instead of NULL, so a plain join is safe
select coalesce(cast(strftime(ngay_giao,'%Y%m%d') as int), -1) ngay_giao_key from don_hang;
```

Approach (a) matters more than it looks: if all three roles use a column named `thang`, a user dragging
"Month" into a report **won't know which month they've taken**. Renaming columns by role is the
only way to prevent that bug. See
[Role-playing dimensions](../skills/role-playing-dimension.md).

</details>

### Exercise D.2 — Calendar days and working days: `DH003` differs 3×

**The task:** for the delivered orders, compute **in parallel** the calendar days and the **working**
days between order and delivery, using `dim_ngay`'s `la_ngay_lam_viec` column.

**The answer it must produce:**

```text
┌─────────────┬────────────┬────────────┬───────────┬───────────────┐
│ don_hang_id │  ngay_dat  │ ngay_giao  │ ngay_lich │ ngay_lam_viec │
├─────────────┼────────────┼────────────┼───────────┼───────────────┤
│ DH001       │ 2026-07-01 │ 2026-07-03 │         2 │             2 │
│ DH002       │ 2026-07-01 │ 2026-07-02 │         1 │             1 │
│ DH003       │ 2026-07-02 │ 2026-07-05 │         3 │             1 │
│ DH004       │ 2026-07-02 │ 2026-07-04 │         2 │             1 │
│ DH005       │ 2026-07-03 │ 2026-07-06 │         3 │             1 │
│ DH007       │ 2026-07-04 │ 2026-07-07 │         3 │             2 │
│ DH008       │ 2026-07-04 │ 2026-07-06 │         2 │             1 │
│ DH010       │ 2026-07-05 │ 2026-07-08 │         3 │             3 │
└─────────────┴────────────┴────────────┴───────────┴───────────────┘
```

`DH003` took **3 calendar days but only 1 working day**. Those two figures lead to opposite
conclusions about delivery performance.

<details>
<summary>Solution</summary>

```sql
select h.don_hang_id, h.ngay_dat, h.ngay_giao,
       h.ngay_giao - h.ngay_dat ngay_lich,
       (select count(*) from dim_ngay d
        where d.ngay > h.ngay_dat and d.ngay <= h.ngay_giao and d.la_ngay_lam_viec) ngay_lam_viec
from don_hang h where h.ngay_giao is not null order by 1;
```

This is why **`dim_ngay` must be a table, not a set of date functions**. No SQL function
knows 04/07 and 05/07 are non-working days — that's **data**, and it differs by
country, by company, by year.

The averages expose it further: `avg(ngay_lich)` = 2.5 while `avg(ngay_lam_viec)`
= 1.5. An SLA commitment of *"delivery within 2 days"* — met or missed depends entirely on which
counting you use, and **the contract usually doesn't say**.

Note the condition `d.ngay > h.ngay_dat and d.ngay <= h.ngay_giao`: open at the start, closed at the end. Using
`between` counts the order date too → every order gains a day. An off-by-one like this
never shows up when you look at the total.

See [The date dimension](../reference/date-dimension.md).

</details>

### Exercise D.3 — A dimension playing two roles: employee and manager

**The task:** `nhan_vien` has an `nv_quan_ly_id` pointing back at the same table. List each employee with their
manager's name and grade.

**The answer it must produce:**

```text
┌─────────┬───────────┬─────────────┬────────────┬─────────────┐
│  nv_id  │ nhan_vien │   cap_bac   │  quan_ly   │ cap_bac_ql  │
├─────────┼───────────┼─────────────┼────────────┼─────────────┤
│ NV01    │ Vu Van E  │ Nhan vien   │ Do Thi F   │ Truong nhom │
│ NV02    │ Do Thi F  │ Truong nhom │ Ngo Thi H  │ Giam doc    │
│ NV03    │ Bui Van G │ Nhan vien   │ Ngo Thi H  │ Giam doc    │
│ NV04    │ Ngo Thi H │ Giam doc    │ (khong co) │ -           │
└─────────┴───────────┴─────────────┴────────────┴─────────────┘
```

<details>
<summary>Solution</summary>

```sql
select nv.nv_id, nv.ho_ten nhan_vien, nv.cap_bac,
       coalesce(ql.ho_ten,'(khong co)') quan_ly,
       coalesce(ql.cap_bac,'-') cap_bac_ql
from nhan_vien nv
left join nhan_vien ql on ql.nv_id = nv.nv_quan_ly_id
order by nv.nv_id;
```

The difference from `dim_ngay`'s three roles: here the two roles sit in **the same table**, linked by a
self-referencing key. The technique is the same (alias + `left join`), but the trap differs:

**`left join` is mandatory.** `NV04` has no manager; an `inner join` loses the director from
every report — and the director is usually exactly the row people want to see.

**It only goes up one level.** This statement answers "who is the direct manager", not
"all the people above" or "the total revenue of NV04's whole reporting line". For that you need a recursive
CTE or a hierarchy bridge — [set 4](bt-04-quan-he-va-cay.md)'s exercises.

In a dimensional model, `nv_quan_ly_id` should be an **outrigger** pointing at the same `dim_nhan_vien`.
Don't normalise it into a separate `dim_quan_ly` — it's the same set of entities, and splitting it
gives two tables to keep in sync.

</details>

### Exercise D.4 — Every role is right, it just answers a different question

**The task:** count orders per month **three times**, each by a different date role. The three results
must differ — explain which question each number answers.

**The answer it must produce:**

```text
┌───────────────┬────────┐
│      vai      │ so_don │
├───────────────┼────────┤
│ theo ngay dat │     10 │
│ theo ngay giao│      8 │
│ theo ngay nhan│      6 │
└───────────────┴────────┘
```

<details>
<summary>Solution</summary>

```sql
select 'theo ngay dat' vai, count(ngay_dat) so_don from don_hang
union all select 'theo ngay giao', count(ngay_giao) from don_hang
union all select 'theo ngay nhan', count(ngay_nhan) from don_hang;
```

**10 / 8 / 6.** Three numbers, none of them wrong:

| The role | Answers | Who asks |
|---|---|---|
| `ngay_dat` | "How many orders did July bring in?" | sales, marketing |
| `ngay_giao` | "How many orders shipped in July?" | operations, the warehouse |
| `ngay_nhan` | "How many orders had revenue recognised in July?" | accounting |

This is the source of a very time-consuming kind of argument: accounting says July had 6 orders,
sales says 10, and **both are right**. That meeting only ends when somebody asks
"which date are we counting by".

The prevention, cheap and effective: **never put a column simply named `ngay` or `thang` on a
report**. Always `thang_dat_hang`, `thang_giao_hang`, `thang_ghi_nhan`. A longer name in
exchange for nobody having to ask.

See [the case study on two departments, two revenue numbers](../case-studies/hai-phong-hai-doanh-thu.md).

</details>

---

## Group E — Late-arriving data

### Exercise E.1 — A late-arriving fact: which moment do you assign the key from

**The task:** three late-arriving fact rows (`DHX1` C1 on 02/07, `DHX2` C3 on 01/07, `DHX3` C9 on
03/07). Assign `khach_key` **two ways** — as-of `ngay_dat`, and by the current version — then
put them side by side.

```sql
create or replace table fct_den_muon as
select * from (values ('DHX1','C1', date '2026-07-02', 500000),
                      ('DHX2','C3', date '2026-07-01', 300000),
                      ('DHX3','C9', date '2026-07-03', 700000))
t(don_hang_id, khach_id, ngay_dat, tien);
```

**The answer it must produce:**

```text
┌─────────────┬──────────┬────────────┬────────────┬──────────────┬────────────────┬──────────────────┐
│ don_hang_id │ khach_id │  ngay_dat  │ as_of_DUNG │ hien_tai_SAI │ khu_vuc_as_of  │ khu_vuc_hien_tai │
├─────────────┼──────────┼────────────┼────────────┼──────────────┼────────────────┼──────────────────┤
│ DHX1        │ C1       │ 2026-07-02 │          1 │            2 │ Mien Bac       │ Mien Nam         │
│ DHX2        │ C3       │ 2026-07-01 │          4 │            5 │ Mien Trung     │ Mien Trung       │
│ DHX3        │ C9       │ 2026-07-03 │         -1 │           -1 │ Khong xac dinh │ Khong xac dinh   │
└─────────────┴──────────┴────────────┴────────────┴──────────────┴────────────────┴──────────────────┘
```

<details>
<summary>Solution</summary>

```sql
select f.don_hang_id, f.khach_id, f.ngay_dat,
  coalesce((select d.khach_key from dim_khach_t2 d
            where d.khach_id = f.khach_id
              and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den), -1) as_of_DUNG,
  coalesce((select d.khach_key from dim_khach_t2 d
            where d.khach_id = f.khach_id and d.la_hien_tai), -1) hien_tai_SAI,
  coalesce((select d.khu_vuc from dim_khach_t2 d
            where d.khach_id = f.khach_id
              and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den), 'Khong xac dinh') khu_vuc_as_of,
  coalesce((select d.khu_vuc from dim_khach_t2 d
            where d.khach_id = f.khach_id and d.la_hien_tai), 'Khong xac dinh') khu_vuc_hien_tai
from fct_den_muon f order by 1;
```

Three rows, three lessons:

**`DHX1` — the only wrong one, and it's silent.** The order happened on 02/07, when C1 was still in the North
(`khach_key` = 1). Assigning by the current version gives `khach_key` = 2, the South. Revenue of 500,000
runs to the wrong branch — **no error, no warning, the total still right**.

**`DHX2` — the two ways give different keys but the same region.** C3 has 2 versions
(keys 4 and 5) but changed `hang`, not `khu_vuc`. A report by region sees no
difference; a report by customer tier does. **The bug appears only on the report you don't check.**

**`DHX3` — a customer who doesn't exist.** Both ways give `-1`, and that's correct behaviour: the
fact row still loads, the money still enters the total, it just isn't attributable to a customer yet.

The rule: **a late-arriving fact must look the dimension up by the event's date, not by the load date.** That's
exactly why a Type 2 dimension must keep validity intervals — without them there's no
"back then" to look up.

See [Late-arriving data](../skills/late-arriving.md) and
[the case study on a late fact assigned the wrong region](../case-studies/fact-den-muon-gan-sai-khu-vuc.md).

</details>

### Exercise E.2 — `inner join` swallowing 46.7% of the money

**The task:** measure the damage of loading `fct_den_muon` with an `inner join` to the dimension instead of a
`left join` + a `-1` key.

**The answer it must produce:**

```text
┌──────────┬────────────┬──────────┬────────────────┐
│ fact_goc │ inner_join │ tien_goc │ tien_sau_inner │
├──────────┼────────────┼──────────┼────────────────┤
│        3 │          2 │  1500000 │         800000 │
└──────────┴────────────┴──────────┴────────────────┘
```

**700,000 out of 1,500,000 evaporates — 46.7%.**

<details>
<summary>Solution</summary>

```sql
select (select count(*) from fct_den_muon) fact_goc,
       (select count(*) from fct_den_muon f join dim_khach_t2 d
         on d.khach_id = f.khach_id
        and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den) inner_join,
       (select sum(tien) from fct_den_muon) tien_goc,
       (select sum(f.tien) from fct_den_muon f join dim_khach_t2 d
         on d.khach_id = f.khach_id
        and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den) tien_sau_inner;
```

`DHX3` (customer `C9`) isn't in the dimension so the `inner join` drops it outright. In a real
system, `C9` is a customer who registered this morning while the dimension-loading job runs at midnight — **not
rare at all, but an everyday occurrence**.

The right loading, in two steps:

```sql
-- 1. always left join; no match means -1
insert into fct_ban_hang
select f.don_hang_id, coalesce(d.khach_key, -1) khach_key, f.tien
from staging_fact f
left join dim_khach_t2 d on d.khach_id = f.khach_id
                        and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den;

-- 2. an alert test when -1 exceeds the threshold
select count(*) so_dong_mo_coi from fct_ban_hang where khach_key = -1;
```

Step 2 is the important part: `-1` **isn't a rubbish bin**. It's a queue. If there's a
`-1` there must be an alert, and a reconciliation job for when the dimension catches up
(*a late-arriving dimension*).

Without the alert, `-1` silently swallows data exactly as an `inner join` does, except the money
total is still right so it's even harder to spot.

</details>

### Exercise E.3 — A late-arriving dimension: patching the `-1` keys

**The task:** suppose `C9` appears in the dimension **after** the fact has loaded with `-1`. Write the
`update` patching in the right version by `ngay_dat`, plus the before/after checks.

<details>
<summary>Solution</summary>

```sql
-- 1. the dimension catches up: C9 appears
insert into dim_khach_t2
select 7, 'C9', 'Khach moi', 'Mien Nam', 'Bac', date '2026-07-01', date '9999-12-31', true;

-- 2. count before patching
select count(*) filter (where khach_key = -1) mo_coi_truoc from fct_den_muon_da_gan;

-- 3. patch, still as-of rather than taking the current version
update fct_den_muon_da_gan f
set khach_key = (select d.khach_key from dim_khach_t2 d
                 where d.khach_id = f.khach_id
                   and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den)
where f.khach_key = -1
  and exists (select 1 from dim_khach_t2 d
              where d.khach_id = f.khach_id
                and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den);

-- 4. count again
select count(*) filter (where khach_key = -1) mo_coi_sau from fct_den_muon_da_gan;
```

Three details decide right from wrong:

**Step 3 must still be as-of.** The biggest temptation when patching is to grab the current version and be done.
Doing that reproduces exercise E.1's bug exactly, just a few days later.

**The `exists` is mandatory.** Without it, rows that still don't match get `update`d to `NULL`
— worse than `-1`, because `-1` at least can be counted.

**A late record's validity interval must reach back into the past.** `hieu_luc_tu` is the date the customer
**genuinely began to exist** (01/07), not the date the dimension learned about them (today).
Set it wrong and old facts can never match.

One last point: an `update` on a large fact table is an expensive operation. So many places choose
another way — **leave the `-1` and join through a mapping table** refreshed daily. Trading write
cost for read cost; which to choose depends on the frequency of each.

</details>

### Exercise E.4 — A late fact making a closed report change its numbers

**The task:** no SQL. Order `DHX1` (500,000, dated 02/07) arrives on 10/07, after the monthly report has
already gone to the board. List the options and their consequences.

<details>
<summary>Solution</summary>

Three options, none of them free:

| The approach | The 02/07 report | Pro | Con |
|---|---|---|---|
| **Load it to the event date** | changes from X to X+500,000 | the numbers always reflect the truth | the report already sent **changes itself** |
| **Load it to the discovery date (10/07)** | unchanged | the report already sent stays immutable | 02/07 is permanently wrong |
| **Two date columns** | depends which column the reader picks | correct both ways | a more complex model, and users must be taught |

The third is what financial systems use, and it has a name: **bi-temporal**. The fact keeps
two independent time axes:

```text
ngay_su_kien   = 2026-07-02   ← chuyen do xay ra khi nao
ngay_ghi_nhan  = 2026-07-10   ← ta biet ve no khi nao
```

With those two columns you can answer all three questions, including the hardest:

```sql
-- "the 02/07 report as we saw it on 05/07" — reconstructing the report already sent
select sum(tien) from fct_ban_hang
where ngay_su_kien = date '2026-07-02' and ngay_ghi_nhan <= date '2026-07-05';
```

That statement is what saves you when somebody asks *"last week this report showed a different number, who changed it?"*.
Without `ngay_ghi_nhan` that question is **unanswerable** — and it becomes a hopeless
investigation rather than a query.

**The rule:** a fact that can arrive late (payments, returns, accounting adjustments) needs both
axes from day one. Adding `ngay_ghi_nhan` after two years of data is impossible — the historical
data doesn't carry that information.

See [Late-arriving data](../skills/late-arriving.md) and
[the case study on today's number jumping all day](../case-studies/so-hom-nay-nhay-suot-ngay.md).

</details>

---

## Quick reconciliation table

| The number | What it means | Exercise |
|---|---|---|
| 4 / 6 / 18 | Type 1 / Type 2 on slow columns / Type 2 on every column | A.1 |
| 4,200,000 vs 1,650,000 | the North as-was vs as-is, 2.55 million apart | A.2 |
| 0 / 0 / 0 | overlaps / wrong current-version count / gaps | A.3 |
| 2 real · 3 reported · 1 missed · 2 spurious | `updated_at` against the truth | B.1 |
| 6 demographic combinations | a mini-dim: adding instead of multiplying | C.1, C.2 |
| 10 / 8 / 6 | counting orders by three date roles | D.4 |
| 3 vs 1 days | `DH003` in calendar days versus working days | D.2 |
| key 1 rather than 2 | a late fact must be looked up as-of | E.1 |
| 700,000 / 46.7% | `inner join` swallowing an orphan fact | E.2 |

## Related Topics

- [Exercise set 1 — Foundations](bt-01-nen-tang.md) — the previous set
- [Exercise set 3 — Columns and tables](bt-03-cot-va-bang.md) — the next set
- [The seed appendix](bt-00-seed.md) — `khach_hang_lich_su` and the three ways `updated_at` lies
- [Skills — Data Modeling](../skills/index.md) — the theory behind the five techniques above
