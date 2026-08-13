---
title: "Exercise set 1 — Foundations: grain, fact/dim, surrogate keys, star/OBT"
sidebar_position: 10
description: "23 exercises to write yourself across 5 foundational techniques: declaring the grain of 7 tables, classifying measures, generating surrogate keys, comparing star with OBT, running the full four-step process."
tags: [tutorial, bai-tap, grain, fact-and-dimension, surrogate-key, star-schema, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Exercise set 1 — Foundations

> **Takeaway:** the five techniques in this set are what every later exercise assumes you already have. If you
> can't declare the grain, every number downstream is a matter of luck.

## Techniques practised in this set

| # | Technique | Source document | Exercises |
|---|---|---|---|
| 1 | Grain | [Grain](../reference/grain.md) | 5 |
| 2 | Facts and dimensions | [Facts and dimensions](../reference/fact-and-dimension.md) | 5 |
| 3 | Surrogate keys | [Surrogate keys and natural keys](../reference/surrogate-key.md) | 5 |
| 4 | Star / Snowflake / OBT | [Star, Snowflake and One Big Table](../reference/star-snowflake-obt.md) | 4 |
| 5 | The four-step design process | [The four-step design process](../reference/design-process.md) | 4 |

## How to use it

Each exercise has three parts: **the task** → **the answer it must produce** → **the solution**, hidden in a `<details>`.

Write your SQL first. Compare the numbers. If they match, open the solution to compare approaches; if they don't,
fix it until they do. **Opening the solution before trying is reading, not practising.**

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

The data: [the shared seeds](index.md#the-data-shared-by-labs-27) plus the ten new tables in
[the seed appendix](bt-00-seed.md). The four baseline numbers don't change:

```text
10 don · 15 dong · doanh thu 10.215.000 · phi ship 400.000
```

---

## Group A — Grain

### Exercise A.1 — Declare the grain for all seven tables, and prove it

**The task:** write **one** statement returning, for each table: the row count, the count of distinct composite
keys, and a boolean column concluding whether the declared grain is right. The seven tables: `don_hang`,
`don_hang_chi_tiet`, `nhan_vien_don`, `kho_hang`, `ty_gia`, `khach_hang_lich_su`,
`su_kien_web`.

Before writing SQL, declare each table's grain in words — **what does one row of this table
represent**. Only then translate that sentence into `count(distinct ...)`.

**The answer it must produce:**

```text
┌────────────────────┬─────────┬─────────┬────────────┐
│        bang        │ so_dong │ so_khoa │ grain_dung │
├────────────────────┼─────────┼─────────┼────────────┤
│ don_hang           │      10 │      10 │ true       │
│ don_hang_chi_tiet  │      15 │      15 │ true       │
│ khach_hang_lich_su │      20 │      20 │ true       │
│ kho_hang           │      20 │      20 │ true       │
│ nhan_vien_don      │      17 │      17 │ true       │
│ su_kien_web        │      43 │      43 │ true       │
│ ty_gia             │      19 │      19 │ true       │
└────────────────────┴─────────┴─────────┴────────────┘
```

All seven `grain_dung` columns must be `true`. Any `false` means **the grain you declared is wrong**,
not that the data is wrong.

<details>
<summary>Solution</summary>

```sql
select 'don_hang' bang, count(*) so_dong, count(distinct don_hang_id) so_khoa,
       count(*)=count(distinct don_hang_id) grain_dung from don_hang
union all select 'don_hang_chi_tiet', count(*), count(distinct (don_hang_id,dong)),
       count(*)=count(distinct (don_hang_id,dong)) from don_hang_chi_tiet
union all select 'nhan_vien_don', count(*), count(distinct (don_hang_id,nv_id)),
       count(*)=count(distinct (don_hang_id,nv_id)) from nhan_vien_don
union all select 'kho_hang', count(*), count(distinct (ngay,ma_hang)),
       count(*)=count(distinct (ngay,ma_hang)) from kho_hang
union all select 'ty_gia', count(*), count(distinct (ngay,tien_te)),
       count(*)=count(distinct (ngay,tien_te)) from ty_gia
union all select 'khach_hang_lich_su', count(*), count(distinct (ngay_trich,khach_id)),
       count(*)=count(distinct (ngay_trich,khach_id)) from khach_hang_lich_su
union all select 'su_kien_web', count(*), count(distinct su_kien_id),
       count(*)=count(distinct su_kien_id) from su_kien_web
order by 1;
```

The grain in words, against the key:

| Table | One row is | The key |
|---|---|---|
| `don_hang` | one order | `don_hang_id` |
| `don_hang_chi_tiet` | one goods line within one order | `(don_hang_id, dong)` |
| `nhan_vien_don` | one employee's participation in one order | `(don_hang_id, nv_id)` |
| `kho_hang` | one item's end-of-day stock | `(ngay, ma_hang)` |
| `ty_gia` | one currency's rate on one day | `(ngay, tien_te)` |
| `khach_hang_lich_su` | one snapshot of one customer on one day | `(ngay_trich, khach_id)` |
| `su_kien_web` | one event | `su_kien_id` |

**The most important sentence:** three tables have a composite key including a time column
(`kho_hang`, `ty_gia`, `khach_hang_lich_su`). That's the signature of a **snapshot** table — the same
entity repeating each period. Summing straight across periods is wrong, see exercise A.4.

</details>

### Exercise A.2 — A key that looks unique but isn't

**The task:** for the five candidate keys below, write one statement checking which is genuinely unique:

```text
su_kien_web (khach_id, thoi_diem)
tra_hang (don_hang_id)
nhan_vien_don (don_hang_id)
kho_hang (ma_hang)
khach_hang_lich_su (khach_id)
```

**The answer it must produce:**

```text
┌──────────────────────────────────┬─────────┬─────────┬──────────┐
│             ung_vien             │ so_dong │ so_khoa │ duy_nhat │
├──────────────────────────────────┼─────────┼─────────┼──────────┤
│ khach_hang_lich_su (khach_id)    │      20 │       4 │ false    │
│ kho_hang (ma_hang)               │      20 │       4 │ false    │
│ nhan_vien_don (don_hang_id)      │      17 │      10 │ false    │
│ su_kien_web (khach_id,thoi_diem) │      43 │      43 │ true     │
│ tra_hang (don_hang_id)           │       4 │       3 │ false    │
└──────────────────────────────────┴─────────┴─────────┴──────────┘
```

**Only one of the five is unique.** The other four are four different kinds of multiplicity — being able to name
all four means you understand grain.

<details>
<summary>Solution</summary>

```sql
select 'su_kien_web (khach_id,thoi_diem)' ung_vien, count(*) so_dong,
       count(distinct (khach_id,thoi_diem)) so_khoa,
       count(*)=count(distinct (khach_id,thoi_diem)) duy_nhat from su_kien_web
union all select 'tra_hang (don_hang_id)', count(*), count(distinct don_hang_id),
       count(*)=count(distinct don_hang_id) from tra_hang
union all select 'nhan_vien_don (don_hang_id)', count(*), count(distinct don_hang_id),
       count(*)=count(distinct don_hang_id) from nhan_vien_don
union all select 'kho_hang (ma_hang)', count(*), count(distinct ma_hang),
       count(*)=count(distinct ma_hang) from kho_hang
union all select 'khach_hang_lich_su (khach_id)', count(*), count(distinct khach_id),
       count(*)=count(distinct khach_id) from khach_hang_lich_su
order by 1;
```

Four kinds of multiplicity, four different consequences:

| The candidate | Multiplied by | If you join by it |
|---|---|---|
| `tra_hang (don_hang_id)` | `DH003` returned **twice** | order rows double |
| `nhan_vien_don (don_hang_id)` | 1 order across **3 employees** | revenue replicated per employee |
| `kho_hang (ma_hang)` | each item across **5 days** | ×5 — see exercise A.3 |
| `khach_hang_lich_su (khach_id)` | each customer with **5 snapshots** | customer history ×5 |

`su_kien_web (khach_id, thoi_diem)` being unique is **luck**, not design: this data
happens to have no two events in the same second. That's exactly why the table still needs `su_kien_id` —
don't rely on a timestamp as a key.

</details>

### Exercise A.3 — Mixing grains: multiplied exactly 5×

**The task:** somebody needs *"revenue with stock levels"* so they join `don_hang_chi_tiet` to `kho_hang`
by `ma_hang`. Measure the damage: rows before/after and revenue before/after.

**The answer it must produce:**

```text
┌──────────┬──────────┬──────────┬────────────┐
│ dong_goc │ sau_join │ tien_goc │ tien_phong │
├──────────┼──────────┼──────────┼────────────┤
│       15 │       75 │ 10215000 │   51075000 │
└──────────┴──────────┴──────────┴────────────┘
```

Exactly **5×**. Answer for yourself: why 5 and not some other number?

<details>
<summary>Solution</summary>

```sql
select (select count(*) from don_hang_chi_tiet) dong_goc,
       (select count(*) from don_hang_chi_tiet ct join kho_hang k using (ma_hang)) sau_join,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) tien_goc,
       (select sum(ct.so_luong*ct.don_gia)
        from don_hang_chi_tiet ct join kho_hang k using (ma_hang)) tien_phong;
```

Because `kho_hang` has **5 days** per item. The join omits the date column, so each sales row
matches all 5 stock snapshots.

The factor of 5 is obvious here because the data is small. In reality, with `kho_hang` holding 400 days the factor is
400 — but **nobody spots 400**, people just see "this month's revenue is unusually
large". The fix is to join on the full key:

```sql
-- right: join the full (ma_hang, ngay)
select ct.don_hang_id, ct.dong, ct.so_luong*ct.don_gia tien_hang, k.ton_cuoi_ngay
from don_hang_chi_tiet ct
join kho_hang k on k.ma_hang = ct.ma_hang and k.ngay = ct.ngay;
```

**The rule:** when joining two tables, the join key must **cover the whole grain of the coarser table**. Missing
one key column is replication, not filtering. See [Grain](../reference/grain.md).

</details>

### Exercise A.4 — Snapshots: summing along time is meaningless

**The task:** for `kho_hang`, compute three numbers per item: the sum of `ton_cuoi_ngay` across the 5 days,
the closing stock, and the average stock. Only **two of the three** are usable numbers.

**The answer it must produce:**

```text
┌─────────┬───────────────┬─────────────┬────────┐
│ ma_hang │ cong_bay_ngay │ ton_cuoi_ky │ ton_tb │
├─────────┼───────────────┼─────────────┼────────┤
│ SP-A    │           420 │          78 │   84.0 │
│ SP-B    │           217 │          41 │   43.4 │
│ SP-C    │            87 │          16 │   17.4 │
│ SP-D    │           992 │         193 │  198.4 │
└─────────┴───────────────┴─────────────┴────────┘
```

<details>
<summary>Solution</summary>

```sql
select ma_hang,
       sum(ton_cuoi_ngay) cong_bay_ngay,
       max_by(ton_cuoi_ngay, ngay) ton_cuoi_ky,
       round(avg(ton_cuoi_ngay),1) ton_tb
from kho_hang group by 1 order by 1;
```

`cong_bay_ngay` is **garbage**: "SP-D has 992 in stock" is untrue at any moment —
the warehouse has never held more than 200 SP-D. It's adding the same goods up five times.

This is **semi-additive**: summable by item, by warehouse, by region — but
**not summable across time**. Across time you take the closing value, or the average,
depending on the business question:

| The question | The right number |
|---|---|
| "How many are left now?" | `ton_cuoi_ky` |
| "How much stock did we hold on average this period?" | `ton_tb` |
| "What's the total stock across 5 days?" | **a wrong question** — it has no business meaning |

The trap: `sum()` **raises no error**. Dragging the column into a BI total cell gives 992, and nothing
on screen says that number is meaningless. See
[Facts and dimensions](../reference/fact-and-dimension.md).

</details>

### Exercise A.5 — Changing the grain from line to order: which columns can come along

**The task:** build a table at the grain of **one row per order** from `don_hang` ⋈ `don_hang_chi_tiet`, keeping
four numbers: the order count, total goods amount, total shipping fee, total line count. All four must match the baselines.

**The answer it must produce:**

```text
┌────────┬────────────────┬───────────────┬──────────────┐
│ so_don │ tong_tien_hang │ tong_phi_ship │ tong_so_dong │
├────────┼────────────────┼───────────────┼──────────────┤
│     10 │       10215000 │        400000 │           15 │
└────────┴────────────────┴───────────────┴──────────────┘
```

Getting `phi_ship` = 775,000 means you used `sum` where `max` was needed.

<details>
<summary>Solution</summary>

```sql
select count(*) so_don, sum(tien_hang) tong_tien_hang,
       sum(phi_ship) tong_phi_ship, sum(so_dong) tong_so_dong
from (select h.don_hang_id,
             max(h.phi_ship)              phi_ship,   -- order grain: TAKE ONE
             sum(ct.so_luong*ct.don_gia)  tien_hang,  -- line grain: SUM
             count(*)                     so_dong
      from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
      group by 1);
```

When rolling up from a fine grain to a coarse one, each column takes **one of two paths**, and taking the wrong
path is a wrong number:

| The column's grain | The aggregate | Getting it wrong gives |
|---|---|---|
| Line (`so_luong*don_gia`) | `sum` | — |
| Order (`phi_ship`, `trang_thai`, `khach_id`) | `max` / `any_value` | `sum` → 77.5% inflated |

400,000 and 775,000 differ exactly because multi-line orders count the shipping fee several times. `DH003`
has three lines so its 90,000 becomes 270,000. See [the foundations lab, exercise 2](lab-nen-tang-grain-fact-dim.md)
and [the case study on shipping fees 133% inflated](../case-studies/phi-ship-phong-133-phan-tram.md).

</details>

---

## Group B — Facts and dimensions

### Exercise B.1 — Classify every column of `don_hang`

**The task:** get `don_hang`'s column list from `information_schema`, then classify each column into
one of four groups: **a dimension foreign key**, **a degenerate dimension**, **a measure (fact)**,
**an attribute that should be split into a dimension**.

**The answer it must produce (the column list):**

```text
┌─────────────┬───────────┐
│ column_name │ data_type │
├─────────────┼───────────┤
│ don_hang_id │ VARCHAR   │
│ khach_id    │ VARCHAR   │
│ ngay_dat    │ DATE      │
│ ngay_giao   │ DATE      │
│ ngay_nhan   │ DATE      │
│ trang_thai  │ VARCHAR   │
│ phi_ship    │ INTEGER   │
└─────────────┴───────────┘
```

<details>
<summary>Solution</summary>

```sql
select column_name, data_type from information_schema.columns
where table_schema='main' and table_name='don_hang' order by ordinal_position;
```

The correct classification:

| Column | The group | Why |
|---|---|---|
| `don_hang_id` | **a degenerate dimension** | a business code with no attributes → stays in the fact, build no table |
| `khach_id` | a dimension foreign key | points at `dim_khach` |
| `ngay_dat` / `ngay_giao` / `ngay_nhan` | dimension foreign keys | three **roles** of the same `dim_ngay` → role-playing |
| `trang_thai` | an attribute to split out | low cardinality (3 values) → a junk dimension |
| `phi_ship` | **a measure** | summable, but at the **order** grain — exercise A.5's trap |

Three date columns pointing at one dimension is [role-playing](../skills/role-playing-dimension.md);
`trang_thai` merged with other flags becomes a [junk dimension](../skills/junk-dimension.md);
`don_hang_id` is a [degenerate dimension](../skills/degenerate-dimension.md). Three techniques,
one seven-column table.

</details>

### Exercise B.2 — Semi-additive: summable across, not down

**The task:** for `kho_hang`, compute total stock and **stock value** (`ton_cuoi_ngay * gia_von`) per
day. This is the **valid** summing direction — the opposite of exercise A.4.

**The answer it must produce:**

```text
┌────────────┬──────────┬─────────────┐
│    ngay    │ tong_ton │ gia_tri_ton │
├────────────┼──────────┼─────────────┤
│ 2026-07-01 │      362 │    37170000 │
│ 2026-07-02 │      352 │    35050000 │
│ 2026-07-03 │      339 │    32200000 │
│ 2026-07-04 │      335 │    31680000 │
│ 2026-07-05 │      328 │    31410000 │
└────────────┴──────────┴─────────────┘
```

<details>
<summary>Solution</summary>

```sql
select ngay, sum(ton_cuoi_ngay) tong_ton, sum(ton_cuoi_ngay*gia_von) gia_tri_ton
from kho_hang group by 1 order by 1;
```

The same `ton_cuoi_ngay` column, the same `sum` function — exercise A.4 gave garbage, this gives a usable number.
The difference is the **summing direction**:

```text
cong theo MAT HANG trong mot ngay  →  hop le   (362 = tong ton kho ngay 01/07)
cong theo NGAY cho mot mat hang    →  vo nghia (420 = cong 5 lan cung mot dong hang)
```

So a semi-additive table must **state the forbidden summing direction in the table's documentation** — because SQL
has no way to forbid it. Some places name the column `ton_cuoi_ngay_khong_cong_theo_ngay`;
ugly, but it saves many afternoons.

`gia_tri_ton` falls steadily from 37.17 million to 31.41 million over the 5 days — that's the goods sold.

</details>

### Exercise B.3 — A factless fact table: a table with no measures

**The task:** break `su_kien_web` down by `loai_su_kien`, with the distinct customer count and **the number of rows
with a `ma_hang`** and **the number with a `don_hang_id`**. Show that this table has no measure column.

**The answer it must produce:**

```text
┌──────────────┬────────────┬──────────┬────────────┬────────┐
│ loai_su_kien │ so_su_kien │ so_khach │ co_ma_hang │ co_don │
├──────────────┼────────────┼──────────┼────────────┼────────┤
│ xem          │         18 │        4 │         18 │      0 │
│ them_gio     │         15 │        4 │         15 │      0 │
│ thanh_toan   │         10 │        4 │          0 │     10 │
└──────────────┴────────────┴──────────┴────────────┴────────┘
```

**43 events, not one money column.** So is it a fact or a dimension?

<details>
<summary>Solution</summary>

```sql
select loai_su_kien, count(*) so_su_kien, count(distinct khach_id) so_khach,
       count(ma_hang) co_ma_hang, count(don_hang_id) co_don
from su_kien_web group by 1 order by 2 desc;
```

It's a **fact** — a factless fact table. The signature isn't "has numeric columns" but
**"each row is an event happening at a moment, pointing at several dimensions"**.

Its measure is `count(*)`. That's precisely why it answers questions a money-bearing table
can't: *how many views don't lead to a purchase*, *how many products a customer views before
closing*. See [Facts and dimensions](../reference/fact-and-dimension.md).

Note the column structure: `ma_hang` appears only on `xem`/`them_gio`, `don_hang_id` only on
`thanh_toan` — **no row has both**. That's the smell of
[heterogeneous entities](../skills/heterogeneous-schema.md), practised in set 4.

</details>

### Exercise B.4 — The grain of a session decides the cart-abandonment number

**The task:** count the sessions, the sessions with a purchase, the **abandoned-cart** sessions (a `them_gio` with no
`thanh_toan`), and the **view-only** sessions. Do it **twice**: (a) treating one session = one customer, one
day; (b) cutting sessions at a **30-minute** gap.

**The answer it must produce — approach (a), sessions by day:**

```text
┌──────────┬──────────────┬────────┬─────────┐
│ so_phien │ phien_co_mua │ bo_gio │ chi_xem │
├──────────┼──────────────┼────────┼─────────┤
│       13 │           10 │      0 │       3 │
└──────────┴──────────────┴────────┴─────────┘
```

**Approach (b), sessions by a 30-minute gap:**

```text
┌──────────┬────────┬────────┬─────────┐
│ so_phien │ co_mua │ bo_gio │ chi_xem │
├──────────┼────────┼────────┼─────────┤
│       14 │     10 │      0 │       4 │
└──────────┴────────┴────────┴─────────┘
```

<details>
<summary>Solution</summary>

Approach (a) — a session = customer × day:

```sql
with phien as (
  select khach_id, cast(thoi_diem as date) ngay,
         max(case when loai_su_kien='thanh_toan' then 1 else 0 end) co_mua,
         sum(case when loai_su_kien='them_gio' then 1 else 0 end) so_them_gio
  from su_kien_web group by 1,2)
select count(*) so_phien, sum(co_mua) phien_co_mua,
       sum(case when so_them_gio>0 and co_mua=0 then 1 else 0 end) bo_gio,
       sum(case when so_them_gio=0 and co_mua=0 then 1 else 0 end) chi_xem
from phien;
```

Approach (b) — cutting at a gap:

```sql
with co_khoang as (
  select *, case when thoi_diem - lag(thoi_diem) over w > interval 30 minute
                   or lag(thoi_diem) over w is null then 1 else 0 end phien_moi
  from su_kien_web window w as (partition by khach_id order by thoi_diem)),
danh_so as (select *, sum(phien_moi) over (partition by khach_id order by thoi_diem) phien
            from co_khoang),
tom as (select khach_id, phien,
               max(case when loai_su_kien='thanh_toan' then 1 else 0 end) co_mua,
               sum(case when loai_su_kien='them_gio' then 1 else 0 end) so_them_gio
        from danh_so group by 1,2)
select count(*) so_phien, sum(co_mua) co_mua,
       sum(case when so_them_gio>0 and co_mua=0 then 1 else 0 end) bo_gio,
       sum(case when so_them_gio=0 and co_mua=0 then 1 else 0 end) chi_xem
from tom;
```

**13 sessions or 14?** Both are right — under two different definitions of *session*. That's
the lesson: **the grain of a "session" is a business decision, not a fact sitting
in the data.**

The divergent row is `C3` on 02/07: they bought at 15:10, then came back at 16:00 to look at `SP-C`. Approach (a) merges
that into one "purchasing" session; approach (b) splits it in two — the second being **view-only**.

`bo_gio` = 0 under both approaches: in this dataset, anybody who adds to cart closes the order. That zero
is a real result, not a broken query — verify it by listing each session
before believing it.

The table must settle the session definition **in its documentation**, because nothing in the data says whether
30 minutes or 24 hours is right.

</details>

### Exercise B.5 — A measure hiding in a dimension

**The task:** for `khach_hang_lich_su`, count per customer: how many distinct `diem_tin_dung`
values, the min/max, and how many distinct `(khu_vuc, hang)` combinations.

**The answer it must produce:**

```text
┌──────────┬────────────┬──────────┬──────────┬────────────────┐
│ khach_id │ so_gia_tri │ nho_nhat │ lon_nhat │ so_to_hop_cham │
├──────────┼────────────┼──────────┼──────────┼────────────────┤
│ C1       │          4 │      700 │      712 │              2 │
│ C2       │          4 │      780 │      788 │              1 │
│ C3       │          4 │      650 │      702 │              2 │
│ C4       │          5 │      820 │      840 │              1 │
└──────────┴────────────┴──────────┴──────────┴────────────────┘
```

**The question:** `diem_tin_dung` sits in the customer table. Is it a dimension attribute or
a measure?

<details>
<summary>Solution</summary>

```sql
select khach_id, count(distinct diem_tin_dung) so_gia_tri,
       min(diem_tin_dung) nho_nhat, max(diem_tin_dung) lon_nhat,
       count(distinct khu_vuc||'|'||hang) so_to_hop_cham
from khach_hang_lich_su group by 1 order by 1;
```

It's **a measure in disguise**. The evidence is in the last two columns: over 5 days, the slow
attributes (`khu_vuc`, `hang`) produce only **1–2** combinations, while `diem_tin_dung` produces **4–5** values
— i.e. nearly **one a day**.

The consequence of leaving it in the dim with Type 2 on: the customer dimension produces 4–5 rows per
**each** customer just because the credit score moved a few points. With 1 million customers and 365 days the dim
bloats to hundreds of millions of rows — exactly
[the case study on a dimension 365× bloated](../case-studies/dimension-phinh-365-lan.md).

Three ways out, practised in depth in set 2:

| The approach | The result |
|---|---|
| Split into a [mini-dimension](../skills/mini-dimension.md) by band (`700-749`, `750-799`…) | the main dim stays still |
| Put it in the fact as a measure at transaction time | history traceable per order |
| Type 1 — overwrite, no history | you lose the ability to answer "what was the score back then" |

The general sign: **a dimension attribute that changes at nearly the pace of the fact isn't a
dimension attribute.**

</details>

---

## Group C — Surrogate keys

### Exercise C.1 — Generate surrogate keys with an "unknown" row

**The task:** build `dim_khach_sk` from `khach_hang`: surrogate keys starting at **1001**, plus a
**-1** row for the unknown value.

**The answer it must produce:**

```text
┌───────────┬──────────┬────────────────┬────────────────┬────────────────┐
│ khach_key │ khach_id │     ho_ten     │    khu_vuc     │      hang      │
├───────────┼──────────┼────────────────┼────────────────┼────────────────┤
│        -1 │ N/A      │ Khong xac dinh │ Khong xac dinh │ Khong xac dinh │
│      1001 │ C1       │ Nguyen Van A   │ Mien Nam       │ Bac            │
│      1002 │ C2       │ Tran Thi B     │ Mien Nam       │ Vang           │
│      1003 │ C3       │ Le Van C       │ Mien Trung     │ Bac            │
│      1004 │ C4       │ Pham Thi D     │ Mien Bac       │ Kim cuong      │
└───────────┴──────────┴────────────────┴────────────────┴────────────────┘
```

<details>
<summary>Solution</summary>

```sql
create or replace table dim_khach_sk as
select 1000 + row_number() over (order by khach_id) khach_key,
       khach_id, ho_ten, khu_vuc, hang
from khach_hang
union all
select -1, 'N/A', 'Khong xac dinh', 'Khong xac dinh', 'Khong xac dinh';

select * from dim_khach_sk order by khach_key;
```

Two easily-missed details:

**Start at 1001, not 1.** A single-digit key looks like a business code, and then somebody
will join `khach_key = 1` to `khach_id = '1'`. Starting from a number that can't be confused is a cheap
and effective convention.

**The -1 row must exist from day one.** It isn't rubbish — it's where the fact points when the
dimension has no matching record, and thanks to it **every foreign key in the fact is
`NOT NULL`**. With that constraint, `count(*)` on the fact never drops because of a join.

</details>

### Exercise C.2 — Build a Type 2 dimension from daily extracts

**The task:** from `khach_hang_lich_su` (20 snapshots), build `dim_khach_t2` keeping history **only for
the two slow columns** `khu_vuc` and `hang`. Each version has `hieu_luc_tu`, `hieu_luc_den`,
`la_hien_tai`. The version in force closes with `9999-12-31`.

**The answer it must produce:**

```text
┌───────────┬──────────┬────────────┬───────────┬─────────────┬──────────────┬─────────────┐
│ khach_key │ khach_id │  khu_vuc   │   hang    │ hieu_luc_tu │ hieu_luc_den │ la_hien_tai │
├───────────┼──────────┼────────────┼───────────┼─────────────┼──────────────┼─────────────┤
│         1 │ C1       │ Mien Bac   │ Bac       │ 2026-07-01  │ 2026-07-02   │ false       │
│         2 │ C1       │ Mien Nam   │ Bac       │ 2026-07-03  │ 9999-12-31   │ true        │
│         3 │ C2       │ Mien Nam   │ Vang      │ 2026-07-01  │ 9999-12-31   │ true        │
│         4 │ C3       │ Mien Trung │ Bac       │ 2026-07-01  │ 2026-07-03   │ false       │
│         5 │ C3       │ Mien Trung │ Vang      │ 2026-07-04  │ 9999-12-31   │ true        │
│         6 │ C4       │ Mien Bac   │ Kim cuong │ 2026-07-01  │ 9999-12-31   │ true        │
└───────────┴──────────┴────────────┴───────────┴─────────────┴──────────────┴─────────────┘
```

**4 customers → 6 rows.** Getting 20 rows means you're keeping history on *every* column, including
`diem_tin_dung` — go back to exercise B.5.

<details>
<summary>Solution</summary>

```sql
create or replace table dim_khach_t2 as
with danh_dau as (
  select ngay_trich, khach_id, ho_ten, khu_vuc, hang,
         case when lag(khu_vuc) over w is distinct from khu_vuc
                or lag(hang)    over w is distinct from hang then 1 else 0 end doi
  from khach_hang_lich_su
  window w as (partition by khach_id order by ngay_trich)),
ver as (select *, sum(doi) over (partition by khach_id order by ngay_trich) v from danh_dau),
gom as (select khach_id, v, any_value(ho_ten) ho_ten, any_value(khu_vuc) khu_vuc,
               any_value(hang) hang, min(ngay_trich) tu
        from ver group by khach_id, v)
select row_number() over (order by khach_id, tu) khach_key,
       khach_id, ho_ten, khu_vuc, hang, tu hieu_luc_tu,
       coalesce((lead(tu) over (partition by khach_id order by tu) - interval 1 day)::date,
                date '9999-12-31') hieu_luc_den,
       lead(tu) over (partition by khach_id order by tu) is null la_hien_tai
from gom;
```

Three techniques combined:

1. **`is distinct from`** instead of `<>` — `<>` returns `NULL` when one side is `NULL`, so a row changing
   from `NULL` to a value would **not** be flagged. This is the classic silent bug.
2. **`sum(doi) over (...)`** turns the change flag into a **version number** — the gap-and-islands trick.
3. **`lead(...) - 1 day`** closes the previous version's interval at the day before the next version,
   so the intervals **neither overlap nor gap**.

Choosing only the two columns `khu_vuc` and `hang` for the change condition is the most important decision — that's
the **Type 2 trigger-column list**, and it must be written out explicitly. See
[SCD](../skills/scd.md) and [change detection](../skills/scd-change-detection.md).

</details>

### Exercise C.3 — Joining a Type 2 dim by natural key: 47% inflated

**The task:** measure the damage of joining `don_hang` to `dim_khach_t2` **by `khach_id` alone**, ignoring
the validity intervals.

**The answer it must produce:**

```text
┌─────────┬──────────┬──────────┬────────────┐
│ don_goc │ sau_join │ tien_goc │ tien_phong │
├─────────┼──────────┼──────────┼────────────┤
│      10 │       15 │ 10215000 │   15060000 │
└─────────┴──────────┴──────────┴────────────┘
```

Revenue inflates **47.4%**. Answer for yourself: why isn't it a flat 2×?

<details>
<summary>Solution</summary>

```sql
select (select count(*) from don_hang) don_goc,
       (select count(*) from don_hang h join dim_khach_t2 d using (khach_id)) sau_join,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) tien_goc,
       (select sum(ct.so_luong*ct.don_gia)
        from don_hang h
        join don_hang_chi_tiet ct using (don_hang_id)
        join dim_khach_t2 d on d.khach_id = h.khach_id) tien_phong;
```

Because **only `C1` and `C3` have two versions**; `C2` and `C4` have one. C1/C3's orders double,
C2/C4's stay put → the inflation factor is 1.474, a number that's **not round and not
guessable**. That's what makes it dangerous: a 2× inflation makes everybody suspicious, a 47% inflation looks like
"we sold well this month".

Three correct ways to join, depending on the question:

```sql
-- as-was: the customer's state AT ORDER TIME
join dim_khach_t2 d on d.khach_id = h.khach_id
                   and h.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den

-- as-is: the customer's CURRENT state
join dim_khach_t2 d on d.khach_id = h.khach_id and d.la_hien_tai

-- best: the fact stores the surrogate key, no date-based re-join
join dim_khach_t2 d on d.khach_key = f.khach_key
```

The third is why surrogate keys exist: **freeze the version into the fact at load time**, so that at
read time nobody has the chance to join wrongly. See
[Surrogate keys](../reference/surrogate-key.md) and
[the case study on historical reports changing their own numbers](../case-studies/bao-cao-qua-khu-tu-doi-so.md).

</details>

### Exercise C.4 — The -1 key makes "not delivered" countable

**The task:** `don_hang` has 2 undelivered orders (empty `ngay_giao`). Build a `ngay_giao_key` in
`YYYYMMDD` form, using `-1` when not delivered. Prove that `= -1` plus `<> -1` equals the total order count.

**The answer it must produce:**

```text
┌──────────┬───────────┬─────────┐
│ tong_don │ chua_giao │ da_giao │
├──────────┼───────────┼─────────┤
│       10 │         2 │       8 │
└──────────┴───────────┴─────────┘
```

```text
┌────────┬───────────────┬─────────┬───────────────┐
│ tat_ca │ loc_khac_tru1 │ la_tru1 │ neu_dung_null │
├────────┼───────────────┼─────────┼───────────────┤
│     10 │             8 │       2 │             8 │
└────────┴───────────────┴─────────┴───────────────┘
```

<details>
<summary>Solution</summary>

```sql
select count(*) tong_don,
       sum(case when ngay_giao is null then 1 else 0 end) chua_giao,
       count(ngay_giao) da_giao
from don_hang;

with f as (select don_hang_id,
                  coalesce(cast(strftime(ngay_giao,'%Y%m%d') as int), -1) ngay_giao_key
           from don_hang)
select count(*) tat_ca,
       (select count(*) from f where ngay_giao_key <> -1) loc_khac_tru1,
       (select count(*) from f where ngay_giao_key = -1)  la_tru1,
       (select count(*) from don_hang where ngay_giao <> date '9999-12-31') neu_dung_null
from f;
```

**8 + 2 = 10. Closed.** That's the entire value of the `-1` key: the two groups complement each other, no
row evaporates, and `chua_giao` **appears as a group on the report** instead of vanishing.

The `neu_dung_null` column at 8 is evidence of the other side: `ngay_giao <> '9999-12-31'` returns
`NULL` for the 2 undelivered orders, and `NULL` isn't `TRUE` so they're **silently excluded**.
No error, no warning — just two orders that never appear.

With `NULL`, every comparison swallows rows. With `-1`, every comparison keeps them.
See [NULLs in facts and dimensions](../skills/null-handling.md) and
[the case study on orders in transit vanishing](../case-studies/don-dang-giao-bien-mat.md).

</details>

### Exercise C.5 — Hash keys: what you gain, what you lose

**The task:** generate keys with `md5` over `(khach_id, khu_vuc, hang)` for `dim_khach_t2`, alongside
a numeric surrogate key. Then answer: where does a hash key **break** with this table?

**The answer it must produce:**

```text
┌──────────┬────────────┬───────────┬──────────────────────────────────┐
│ khach_id │  khu_vuc   │   hang    │             hash_key             │
├──────────┼────────────┼───────────┼──────────────────────────────────┤
│ C1       │ Mien Bac   │ Bac       │ 9fa39d984b7aa21f983b58e0a1f0bf56 │
│ C1       │ Mien Nam   │ Bac       │ eb643a852689a4f2f0d3e9dc21e591f0 │
│ C2       │ Mien Nam   │ Vang      │ eae98a48319cf3c079705e6222c0f58e │
│ C3       │ Mien Trung │ Bac       │ e6ff8cc98395ad32d9227e1aeaf283ca │
│ C3       │ Mien Trung │ Vang      │ a326bd8326b9a904483aa5ad0450e0dc │
│ C4       │ Mien Bac   │ Kim cuong │ 78abe1707b6d9ed027d60e9f3e28ff2e │
└──────────┴────────────┴───────────┴──────────────────────────────────┘
```

<details>
<summary>Solution</summary>

```sql
select khach_id, khu_vuc, hang, md5(khach_id||'|'||khu_vuc||'|'||hang) hash_key
from dim_khach_t2 order by khach_id, hieu_luc_tu limit 6;
```

**The gain:** the key can be computed **in parallel, without reading the target table** — reloading an old batch still gives
the same key, so no central sequence is needed. Very suited to a lakehouse.

**The loss, and it's heavy with this table:** a hash over `(khach_id, khu_vuc, hang)` **can't
distinguish two versions with the same values**. If C1 goes `Mien Bac` → `Mien Nam` → back to
`Mien Bac`, version 1 and version 3 will have **the same hash**, and Type 2 breaks.

The fix: put the time marker into the hash — `md5(khach_id||'|'||hieu_luc_tu)`. Now the key depends
on the version rather than on the content.

Three differences to remember:

| | A sequence | A hash |
|---|---|---|
| Computable in parallel with no central key | no | **yes** |
| Stable on reload | no | **yes** |
| Width | 8 bytes | 16–32 bytes, slower joins |
| The trap | — | **key collisions when a value returns** |

And one trap shared by both `md5` and `||`: if any column is `NULL` the whole string becomes
`NULL` and the hash becomes `NULL`. Always wrap in `coalesce(col, '')` before concatenating.

</details>

---

## Group D — Star, Snowflake, One Big Table

### Exercise D.1 — One question, three layouts

**The task:** compute revenue by `khu_vuc` × `nhom` **twice**: (a) from the star schema —
`don_hang_chi_tiet` joined to `don_hang`, `khach_hang`, `hang_hoa`; (b) from the `obt_ban_hang` table
built in exercise D.3, with no joins. The two results must match row for row.

**The answer it must produce (both ways):**

```text
┌────────────┬───────────────┬───────────┐
│  khu_vuc   │     nhom      │ doanh_thu │
├────────────┼───────────────┼───────────┤
│ Mien Nam   │ Máy tính      │   3600000 │
│ Mien Trung │ Màn hình      │   2100000 │
│ Mien Nam   │ Thiết bị nhập │   1965000 │
│ Mien Bac   │ Thiết bị nhập │   1650000 │
│ Mien Nam   │ Màn hình      │    900000 │
└────────────┴───────────────┴───────────┘
```

The 5 rows total 10,215,000.

<details>
<summary>Solution</summary>

```sql
-- (a) the star: 3 joins from the fact
select k.khu_vuc, hh.nhom, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang_chi_tiet ct
join don_hang   h  using (don_hang_id)
join khach_hang k  using (khach_id)
join hang_hoa   hh using (ma_hang)
group by 1,2 order by 3 desc;

-- (b) the OBT: 0 joins
select khu_vuc, nhom, sum(tien_hang) doanh_thu
from obt_ban_hang group by 1,2 order by 3 desc;
```

An exact match. So **the result isn't the criterion for choosing between star and OBT** — both give
the right answer. The criterion lies elsewhere, measured in exercises D.3 and D.4.

One detail: there are only **5** `khu_vuc × nhom` combinations, not 3 × 3 = 9. A star schema
produces no row for a combination that sold nothing. If a report needs to show the zero-revenue combinations too,
you must `cross join` the two dimensions then `left join` the fact — that exercise is in set 6.

</details>

### Exercise D.2 — Snowflake: flattening a hierarchy with a recursive CTE

**The task:** `cay_nhom_hang` stores parent–child relationships (`nhom_cha_id`). Write a recursive CTE returning
each group with its **level** and its **full path** from the root.

**The answer it must produce:**

```text
┌─────────┬───────┬──────────────────────────────────────────────────┐
│ nhom_id │  cap  │                    duong_dan                     │
├─────────┼───────┼──────────────────────────────────────────────────┤
│ N1      │     1 │ Cong nghe                                        │
│ N2      │     2 │ Cong nghe > May tinh                             │
│ N4      │     3 │ Cong nghe > May tinh > Laptop                    │
│ N8      │     4 │ Cong nghe > May tinh > Laptop > Laptop van phong │
│ N3      │     2 │ Cong nghe > Thiet bi ngoai vi                    │
│ N6      │     3 │ Cong nghe > Thiet bi ngoai vi > Man hinh         │
│ N5      │     3 │ Cong nghe > Thiet bi ngoai vi > Thiet bi nhap    │
│ N7      │     1 │ Hang thanh ly                                    │
└─────────┴───────┴──────────────────────────────────────────────────┘
```

Note: **two roots** (`N1`, `N7`) and a maximum depth of **4**.

<details>
<summary>Solution</summary>

```sql
with recursive duong as (
  select nhom_id, ten_nhom, nhom_cha_id, 1 cap, ten_nhom duong_dan
  from cay_nhom_hang where nhom_cha_id is null
  union all
  select c.nhom_id, c.ten_nhom, c.nhom_cha_id, d.cap+1, d.duong_dan || ' > ' || c.ten_nhom
  from cay_nhom_hang c join duong d on c.nhom_cha_id = d.nhom_id)
select nhom_id, cap, duong_dan from duong order by duong_dan;
```

The anchor is `nhom_cha_id is null` — catching **every** root, so `N7` isn't missed even though it
doesn't sit under `N1`. Writing the anchor as `where nhom_id = 'N1'` loses the whole `Hang thanh ly` branch,
and nothing reports it.

This is the **snowflake** shape: the product-group dimension normalised into its own table with a
parent key. Reading it requires recursion; renaming needs **one** row changed — the exact opposite of OBT
in exercise D.4.

</details>

### Exercise D.3 — Build the OBT and measure its cost

**The task:** build `obt_ban_hang` — one flat table merging the order lines, the orders, the customers, the items
and the full group path. Then measure: the row count, the revenue, the **column count**, and how many times each item's
description string repeats.

**The answer it must produce:**

```text
┌─────────┬───────────┬────────┐
│ so_dong │ doanh_thu │ so_cot │
├─────────┼───────────┼────────┤
│      15 │  10215000 │     17 │
└─────────┴───────────┴────────┘
```

```text
┌──────────────────┬────────────┬───────────────────────────────────────────────────────────────────┐
│     ten_hang     │ so_lan_lap │                             mau_chuoi                             │
├──────────────────┼────────────┼───────────────────────────────────────────────────────────────────┤
│ Bàn phím cơ      │          6 │ Bàn phím cơ | Cong nghe > Thiet bi ngoai vi > Thiet bi nhap       │
│ Màn hình 24 inch │          4 │ Màn hình 24 inch | Cong nghe > Thiet bi ngoai vi > Man hinh       │
│ Laptop 14 inch   │          3 │ Laptop 14 inch | Cong nghe > May tinh > Laptop > Laptop van phong │
│ Chuột không dây  │          2 │ Chuột không dây | Cong nghe > Thiet bi ngoai vi                   │
└──────────────────┴────────────┴───────────────────────────────────────────────────────────────────┘
```

<details>
<summary>Solution</summary>

```sql
create or replace table obt_ban_hang as
with recursive duong as (
  select nhom_id, ten_nhom, nhom_cha_id, 1 cap, ten_nhom duong_dan
  from cay_nhom_hang where nhom_cha_id is null
  union all
  select c.nhom_id, c.ten_nhom, c.nhom_cha_id, d.cap+1, d.duong_dan || ' > ' || c.ten_nhom
  from cay_nhom_hang c join duong d on c.nhom_cha_id = d.nhom_id)
select ct.don_hang_id, ct.dong, h.ngay_dat, h.trang_thai, h.phi_ship,
       k.khach_id, k.ho_ten, k.khu_vuc, k.hang khach_hang_muc,
       hh.ma_hang, hh.ten_hang, hh.nhom, d.duong_dan nhom_day_du, d.cap do_sau_nhom,
       ct.so_luong, ct.don_gia, ct.so_luong*ct.don_gia tien_hang
from don_hang_chi_tiet ct
join don_hang   h  using (don_hang_id)
join khach_hang k  using (khach_id)
join hang_hoa   hh using (ma_hang)
join hang_hoa_nhom hn using (ma_hang)
join duong      d  on d.nhom_id = hn.nhom_id;

select count(*) so_dong, sum(tien_hang) doanh_thu,
       (select count(*) from information_schema.columns
        where table_name='obt_ban_hang') so_cot
from obt_ban_hang;

select ten_hang, count(*) so_lan_lap, ten_hang || ' | ' || nhom_day_du mau_chuoi
from obt_ban_hang group by 1,3 order by 2 desc;
```

**15 rows, 17 columns** — exactly the source fact's row count. An OBT **doesn't** inflate rows, provided
every join is many-to-one. That's the vital condition: one many-to-many relationship
(like `nhan_vien_don`) slipping in and the OBT inflates immediately, as set 4 will prove.

The cost is in the `so_lan_lap` column: the string *"Cong nghe > May tinh > Laptop > Laptop van phong"*
is stored **3 times**, *"Bàn phím cơ …"* **6 times**. With 15 rows it doesn't matter. With 500
million fact rows that's tens of GB of repetition — and more important still is exercise D.4.

</details>

### Exercise D.4 — Renaming one product group: how many rows to change

**The task:** the business renames *"Man hinh"* to *"Thiet bi hien thi"*. Count the rows to change
in three places: `obt_ban_hang`, `cay_nhom_hang`, and the flat `nhom` column in `hang_hoa`.

**The answer it must produce:**

```text
┌─────────────────────────┬───────────────┐
│          bang           │ dong_phai_sua │
├─────────────────────────┼───────────────┤
│ obt_ban_hang            │             4 │
│ cay_nhom_hang           │             1 │
│ hang_hoa (cot nhom det) │             0 │
└─────────────────────────┴───────────────┘
```

The last row gives **0** — that isn't a query bug. Work out why.

<details>
<summary>Solution</summary>

```sql
select 'obt_ban_hang' bang, count(*) dong_phai_sua
from obt_ban_hang where nhom_day_du like '%Man hinh%'
union all select 'cay_nhom_hang', count(*) from cay_nhom_hang where ten_nhom='Man hinh'
union all select 'hang_hoa (cot nhom det)', count(*) from hang_hoa where nhom='Man hinh';
```

**4 rows against 1** — on real data that's *"a few hundred million rows"* against *"one
row"*. This is OBT's real trade-off, not storage:

| | Star / Snowflake | OBT |
|---|---|---|
| Reading | 1–3 joins | 0 joins |
| Renaming one dimension label | `update` 1 row | `update` the whole fact table |
| Applying SCD Type 2 | natural | practically impossible |

**And as for the last row being 0:** `hang_hoa.nhom` writes *"Màn hình"* — **with Vietnamese diacritics** — while
`cay_nhom_hang.ten_nhom` writes *"Man hinh"* — **without**. Two systems, two spellings of
the same group, and `=` doesn't match.

This is precisely the illness [conformed dimensions](../skills/conformed-dimension.md) exist to
cure, and set 6 will catch it with SQL. Remember its shape: **the query runs, no error, returns
0 rows, and 0 rows looks exactly like "there's nothing to change".**

</details>

---

## Group E — The four-step design process

### Exercise E.1 — Steps 1 & 2: list the business processes and declare the grain

**The task:** this warehouse has six business processes. For each, declare: the name, the grain in words, the current
row count, and the **fact type** (transaction / periodic snapshot / accumulating snapshot /
factless / bridge).

**The answer it must produce:**

```text
┌──────────────┬─────────────────────────────┬─────────┬────────────────────────┐
│  quy_trinh   │            grain            │ so_dong │       loai_fact        │
├──────────────┼─────────────────────────────┼─────────┼────────────────────────┤
│ Ban hang     │ mot dong hang trong mot don │      15 │ transaction            │
│ Tra hang     │ mot lan tra cua mot don     │       4 │ transaction            │
│ Giao hang    │ mot don hang                │      10 │ accumulating snapshot  │
│ Ton kho      │ mot mat hang mot ngay       │      20 │ periodic snapshot      │
│ Su kien web  │ mot su kien                 │      43 │ transaction (factless) │
│ Phan cong NV │ mot NV tren mot don         │      17 │ bridge                 │
└──────────────┴─────────────────────────────┴─────────┴────────────────────────┘
```

<details>
<summary>Solution</summary>

```sql
select 'Ban hang' quy_trinh, 'mot dong hang trong mot don' grain,
       (select count(*) from don_hang_chi_tiet) so_dong, 'transaction' loai_fact
union all select 'Tra hang', 'mot lan tra cua mot don',
       (select count(*) from tra_hang), 'transaction'
union all select 'Giao hang', 'mot don hang',
       (select count(*) from don_hang), 'accumulating snapshot'
union all select 'Ton kho', 'mot mat hang mot ngay',
       (select count(*) from kho_hang), 'periodic snapshot'
union all select 'Su kien web', 'mot su kien',
       (select count(*) from su_kien_web), 'transaction (factless)'
union all select 'Phan cong NV', 'mot NV tren mot don',
       (select count(*) from nhan_vien_don), 'bridge';
```

A detail worth pausing on: **`don_hang` appears in two roles**. It's the *source* of the
"Ban hang" process (at header level), and the *fact* of the "Giao hang" process — an accumulating snapshot
with three milestones `ngay_dat` → `ngay_giao` → `ngay_nhan`, each updated as the order
advances.

That's why step 1 must come **before** step 2: the same source table can yield two
fact tables at two different grains, and only once you've picked the process can you declare the grain.

Getting the order wrong — declaring the grain before picking the process — is the fastest way to build a
"merge everything" table that answers no question properly.

</details>

### Exercise E.2 — Step 3: which dimension works for which process

**The task:** build a **bus matrix** as a table: six processes × the dimensions (`Ngay`, `Khach`,
`Hang hoa`, `Nhan vien`, `Tien te`), marking `X` where the dimension applies.

This exercise has no SQL — **write the table by hand** then compare with the solution. Wherever you fill it in
wrongly is exactly where you'll build the model wrongly.

<details>
<summary>Solution</summary>

| Process | Ngay | Khach | Hang hoa | Nhan vien | Tien te |
|---|---|---|---|---|---|
| Sales | X | X | X | X | — |
| Returns | X | X | — | — | — |
| Delivery | X | X | — | — | — |
| Inventory | X | — | X | — | — |
| Web events | X | X | X | — | — |
| Foreign-currency orders | X | X | — | — | X |

Three things you can read off this table:

**`Ngay` appears in every row.** That's the sign it's the most important conformed dimension —
and also why `dim_ngay` must be built once and shared, not one copy per mart.

**`Hang hoa` is absent from "Returns".** Not because the business doesn't need it, but because `tra_hang`
only records at the **order** level, never which item was returned. That's a **source-data gap**
— and the bus matrix reveals it. The consequence: "return rate by item" is unanswerable without
allocation, and set 5 does exactly that.

**Two processes sharing ≥2 dimensions can have their numbers compared.** "Sales" and "Returns"
share `Ngay` + `Khach` → drill-across works. "Inventory" and "Web events" share only
`Ngay` + `Hang hoa` → still combinable, but along those two axes only.

See [Bus architecture](../reference/bus-architecture.md); practised in depth in set 6.

</details>

### Exercise E.3 — Step 4: a fact table may contain only two kinds of column

**The task:** check whether `obt_ban_hang` satisfies the rule *"a fact table contains only foreign keys +
measures"*. List the **violating** columns, and explain why an OBT is allowed to violate it.

<details>
<summary>Solution</summary>

```sql
select column_name, data_type from information_schema.columns
where table_schema='main' and table_name='obt_ban_hang' order by ordinal_position;
```

Of the 17 columns, only **5** are legitimate under the fact rule:

| The group | Columns |
|---|---|
| Foreign keys | `khach_id`, `ma_hang`, `ngay_dat` |
| Degenerate | `don_hang_id`, `dong` |
| **Measures** | `so_luong`, `don_gia`, `tien_hang`, `phi_ship` |
| **Violations — dimension attributes** | `ho_ten`, `khu_vuc`, `khach_hang_muc`, `ten_hang`, `nhom`, `nhom_day_du`, `do_sau_nhom`, `trang_thai` |

Eight violating columns. That **is the definition** of an OBT, not a bug: an OBT deliberately shoves dimension
attributes into the fact to avoid joins.

Permitted, under exactly three conditions — missing one breaks it:

1. Every join that builds it is **many-to-one** (exercise D.3).
2. No attribute history is needed — **no Type 2** (exercise D.4).
3. The attributes are **rarely renamed** (exercise D.4 again).

For a `star`, rather than checking by eye, check with a test:

```sql
-- every column that isn't a key or a measure is a violation
select count(*) so_cot_vi_pham from information_schema.columns
where table_name = 'fct_ban_hang'
  and column_name not like '%_key'
  and column_name not in ('don_hang_id','dong','so_luong','don_gia','tien_hang');
```

Make this a test running on every build and nobody can slip `ten_khach` into the fact
again. See [The four-step design process](../reference/design-process.md).

</details>

### Exercise E.4 — Run the full four steps for a new request

**The task:** the business request: *"Show me how much each employee sold, by month."*
Walk all four steps, writing each one out, before writing any SQL.

This is a **design** exercise, not a SQL one. Write the four steps down first.

<details>
<summary>Solution</summary>

**Step 1 — the business process:** Sales. *Not* "an employee report" — a report is an
output, and a process is what produces the data.

**Step 2 — the grain:** one goods line within one order. Keep the finest grain; **don't** declare
"one employee one month" — pre-aggregating by month loses the ability to answer every other question.

**Step 3 — the dimensions:** `Ngay`, `Khach`, `Hang hoa`, `Nhan vien`.

**Step 4 — the measures:** `so_luong`, `tien_hang`.

And here's where this exercise lays its trap: **`Nhan vien` isn't a many-to-one relationship with an order.**
Exercise A.2 already measured it — 17 `nhan_vien_don` rows for 10 orders. A direct join inflates:

```sql
-- WRONG: inflated because one order has several employees
select nv.ho_ten, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang_chi_tiet ct
join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id)
group by 1;
```

The right way is through a **bridge table with allocation weights**:

```sql
-- RIGHT: multiply by the weight, the total doesn't inflate
select nv.ho_ten, round(sum(ct.so_luong*ct.don_gia * nd.he_so)) doanh_thu
from don_hang_chi_tiet ct
join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id)
group by 1 order by 2 desc;
```

Run both and compare the totals — you'll find the "right" version's total **still doesn't** equal
10,215,000. Why is for set 4 to answer: one order in `nhan_vien_don` has weights totalling
**something other than 1**. That's the [bridge table](../skills/bridge-table.md) exercise.

Step 4's lesson: **identifying the measures is when you discover the many-to-many relationship**, not
when you write the report.

</details>

---

## Quick reconciliation table

| The number | What it means | Exercise |
|---|---|---|
| 10 · 15 · 10,215,000 · 400,000 | the four baselines every exercise must match | A.5 |
| 75 rows · 51,075,000 | mixing grains with `kho_hang` → ×5 | A.3 |
| 420 / 78 / 84.0 | semi-additive: summed down / closing / average | A.4 |
| 13 or 14 sessions | the grain of a "session" is a business decision | B.4 |
| 4–5 values vs 1–2 combinations | `diem_tin_dung` is a measure in disguise | B.5 |
| 4 customers → 6 rows | Type 2 on the slow columns only | C.2 |
| 15 rows · 15,060,000 (+47.4%) | joining Type 2 by natural key | C.3 |
| 8 + 2 = 10 | the `-1` key closes, `NULL` doesn't | C.4 |
| 4 vs 1 rows to change | OBT vs snowflake when renaming a label | D.4 |
| 0 rows | *"Màn hình"* ≠ *"Man hinh"* — the conformance trap | D.4 |

## Related Topics

- [Exercises — Data Modeling](index.md) — the exercise sets' index
- [Exercise set 2 — Dimensions over time](bt-02-dimension-thoi-gian.md) — the next set
- [The seed appendix](bt-00-seed.md) — the contents of the seven new tables
- [Reference — Data Modeling](../reference/index.md) — the theory behind the five techniques above
