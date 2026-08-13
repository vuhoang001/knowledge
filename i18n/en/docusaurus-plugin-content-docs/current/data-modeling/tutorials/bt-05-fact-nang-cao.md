---
title: "Exercise set 5 — Advanced facts: allocation, cumulatives, summary tables, behaviour"
sidebar_position: 14
description: "19 exercises to write yourself: an allocation losing 1 dong then closing exactly, a YTD column inflating 3.38×, avg-of-avg 5.7% out, and the Diamond-tier customer with the lowest spend."
tags: [tutorial, bai-tap, allocated-facts, ytd-timespan-facts, aggregate-fact-table, behavior-dimension, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Exercise set 5 — Advanced facts

> **Takeaway:** the four techniques here are all about **numbers sitting at the wrong grain**. None holds a wrong value;
> they just don't add up the way people are going to add them — and `sum()` never refuses.

## Techniques practised in this set

| # | Technique | Source document | Exercises |
|---|---|---|---|
| 1 | Header/line and allocating facts | [Header/line and allocating facts](../skills/allocated-facts.md) | 5 |
| 2 | Year-to-date and timespan | [Year-to-date and timespan](../skills/ytd-timespan-facts.md) | 5 |
| 3 | Aggregate fact tables | [Aggregate fact tables](../skills/aggregate-fact-table.md) | 4 |
| 4 | Putting behaviour into a dimension | [Putting behaviour into a dimension](../skills/behavior-dimension.md) | 5 |

## Preparation

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

The benchmark: **10 orders · 15 lines · revenue 10,215,000 · shipping fees 400,000**.

---

## Group A — Allocating a header-level measure

### Exercise A.1 — Allocate by goods amount, and one dong disappears

**The task:** `phi_ship` sits at **order** level, the other measures at **line** level. Allocate the shipping fee onto
each line in proportion to the goods amount, then sum it up and compare against 400,000.

**The answer it must produce:**

```text
┌──────────────┬───────────┬────────┐
│ tong_phan_bo │ tong_that │ chenh  │
├──────────────┼───────────┼────────┤
│     399999.0 │    400000 │   -1.0 │
└──────────────┴───────────┴────────┘
```

**Exactly one dong short.** Sounds harmless — exercise A.2 explains why it isn't.

<details>
<summary>Solution</summary>

```sql
with pb as (
  select ct.don_hang_id, ct.dong, ct.so_luong*ct.don_gia tien_hang,
         round(h.phi_ship::double * (ct.so_luong*ct.don_gia)
               / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id)) phi_pb
  from don_hang_chi_tiet ct join don_hang h using (don_hang_id))
select sum(phi_pb) tong_phan_bo, 400000 tong_that, sum(phi_pb) - 400000 chenh from pb;
```

The culprit is `round()`. `DH003`'s 90,000 fee divided across three lines in the ratio 900k : 450k :
600k:

```text
41538,46...  →  round  →  41538
20769,23...  →  round  →  20769
27692,30...  →  round  →  27692
                          ------
                          89999   ← thieu 1
```

There's no choice of integers for the three lines whose total is exactly 90,000 **and** where each line
is the rounding of the correct proportion. That's a **mathematical property**, not a bug — so it can't be
fixed by writing `round` more cleverly.

Why 1 dong is serious: it makes the reconciliation test **red on every run**. And a habitually red test
means somebody will, within a month, loosen the threshold to `abs(chenh) < 100`, then
`< 10000` — and from then on the test catches nothing.

Exercise A.2 fixes it to close exactly.

</details>

### Exercise A.2 — Push the rounding error onto the largest line

**The task:** fix it so `sum(phi_phan_bo)` equals **exactly** 400,000, by pushing the remainder onto the line
with the largest goods amount in each order.

**The answer it must produce:**

```text
┌──────────────┬───────────┬────────┐
│ tong_phan_bo │ tong_that │ chenh  │
├──────────────┼───────────┼────────┤
│     400000.0 │    400000 │    0.0 │
└──────────────┴───────────┴────────┘
```

<details>
<summary>Solution</summary>

```sql
with pb as (
  select ct.don_hang_id, ct.dong, ct.so_luong*ct.don_gia tien_hang, h.phi_ship,
         round(h.phi_ship::double * (ct.so_luong*ct.don_gia)
               / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id)) phi_pb,
         row_number() over (partition by ct.don_hang_id
                            order by ct.so_luong*ct.don_gia desc, ct.dong) hang
  from don_hang_chi_tiet ct join don_hang h using (don_hang_id)),
sua as (
  select *, case when hang = 1
                 then phi_pb + (phi_ship - sum(phi_pb) over (partition by don_hang_id))
                 else phi_pb end phi_cuoi
  from pb)
select sum(phi_cuoi) tong_phan_bo, 400000 tong_that, sum(phi_cuoi) - 400000 chenh from sua;
```

This technique has a name: **largest remainder** — pick one line as the "carrier line" and push the whole
rounding error onto it.

Three requirements; miss any one and it breaks:

**1. The carrier line must be the largest.** Pushing 1 dong onto the 41,538 line is a 0.002% distortion; pushing it onto
a 100-dong line is a 1% distortion. Choosing the largest line minimises the relative distortion.

**2. The ordering must be deterministic.** `order by tien_hang desc, dong` — the `dong` column is the tie-breaker.
Without it, two lines with the same goods amount can swap between runs, and **the same
data gives two different results**. On an incremental table, that's data changing its own numbers.

**3. It must be frozen into the table, not recomputed at read time.** The `phi_ship_phan_bo` column is a decided
value and must live in the fact. Recomputing on each read means each report picks its own carrier
line.

Now the reconciliation test becomes usable:

```sql
-- test: the allocation must close EXACTLY
select don_hang_id from fct_ban_hang
group by 1 having sum(phi_ship_phan_bo) <> max(phi_ship_goc);
```

`<>` rather than `abs(...) < threshold` — because now it genuinely closes.

</details>

### Exercise A.3 — Change the allocation basis, change the result

**The task:** allocate the shipping fee by **quantity** instead of by goods amount, then compare the two results
per item.

**The answer it must produce:**

```text
┌─────────┬───────────┬───────────────┬──────────┐
│ ma_hang │ theo_tien │ theo_so_luong │  chenh   │
├─────────┼───────────┼───────────────┼──────────┤
│ SP-A    │  160000.0 │      187500.0 │  27500.0 │
│ SP-B    │  117692.0 │      110000.0 │  -7692.0 │
│ SP-C    │   86538.0 │       60000.0 │ -26538.0 │
│ SP-D    │   35769.0 │       42500.0 │   6731.0 │
└─────────┴───────────┴───────────────┴──────────┘
```

`SP-C` differs by **-26,538** — down 31%. The same 400,000, two ways of dividing it, two conclusions
about per-product profitability.

<details>
<summary>Solution</summary>

```sql
with tien as (
  select ct.don_hang_id, ct.ma_hang, ct.so_luong, ct.so_luong*ct.don_gia th, h.phi_ship
  from don_hang_chi_tiet ct join don_hang h using (don_hang_id)),
pb as (
  select ma_hang,
         phi_ship::double * th / sum(th) over (partition by don_hang_id) theo_tien,
         phi_ship::double * so_luong / sum(so_luong) over (partition by don_hang_id) theo_so_luong
  from tien)
select ma_hang, round(sum(theo_tien)) theo_tien, round(sum(theo_so_luong)) theo_so_luong,
       round(sum(theo_so_luong) - sum(theo_tien)) chenh
from pb group by 1 order by 1;
```

Both columns total 400,000. Both are "right". But they answer two different questions,
and **the business decisions based on them will be opposites**:

`SP-C` (a laptop, 900,000 each, 3 sold) carries **86,538** by amount but only **60,000**
by quantity. If SP-C's margin is thin, these two divisions decide whether it shows a profit or a
loss on a per-product P&L.

Choosing the basis is a **business decision**, and each cost type has its own basis:

| A header measure | The basis | Why |
|---|---|---|
| Shipping fee | **weight / volume** | the carrier charges by weight, not by money |
| Whole-order discount | **goods amount** | the discount is computed on value |
| Packing cost | **item count** | each item is one operation |
| Order handling fee | **divided evenly** | the cost doesn't depend on the contents |

This lab has no `trong_luong_kg` so allocating by amount is an approximation. **Record the reason for the choice
right beside the code** — six months later nobody remembers why goods amount was chosen, and a successor will
change it because "by weight makes more sense", and then every historical report changes its numbers.

</details>

### Exercise A.4 — Don't allocate: keep two fact tables

**The task:** no SQL required. Instead of allocating, keep two facts at two grains. State how, and
when to choose it.

<details>
<summary>Solution</summary>

```sql
-- fact 1: LINE grain — only line-level measures
create or replace table fct_dong as
select don_hang_id, dong, ma_hang, ngay, so_luong, don_gia, so_luong*don_gia tien_hang
from don_hang_chi_tiet;

-- fact 2: ORDER grain — only order-level measures
create or replace table fct_don as
select don_hang_id, khach_id, ngay_dat, ngay_giao, ngay_nhan, phi_ship
from don_hang;
```

Each measure lives in exactly **one** place, at its own grain. No allocation, no rounding
error, no basis to choose.

Questions crossing the two grains aggregate **before** joining:

```sql
-- RIGHT: aggregate each side to the order grain, then combine
select d.khach_id, sum(l.tien_hang) tien_hang, sum(d.phi_ship) phi_ship
from fct_don d
join (select don_hang_id, sum(tien_hang) tien_hang from fct_dong group by 1) l
  using (don_hang_id)
group by 1;
```

**When to choose this:**

| | Allocation | Two facts |
|---|---|---|
| You need a **per-product** P&L | **mandatory** | impossible |
| You only need total cost by order/customer/month | overkill | **right and cheap** |
| The allocation basis is **contentious** | one number per department | **avoids the argument** |
| Reconciling with the accounting ledger | requires a closure check | **always matches** |

The third row deserves the most thought. An allocation always carries a business assumption, and that assumption
will be challenged — usually just when the report is being used to evaluate somebody.

**The rule:** don't allocate until somebody **actually asks** a question that requires allocation to
answer. Allocating pre-emptively "for completeness" creates a number you'll defend forever. See
[the case study on shipping fees 133% inflated](../case-studies/phi-ship-phong-133-phan-tram.md).

</details>

### Exercise A.5 — Three mandatory checks for every allocation

**The task:** write three tests for an allocated column: closure per order, non-negativity, and no lost rows.

<details>
<summary>Solution</summary>

```sql
-- 1. CLOSURE: each order's allocated total = the original figure
select don_hang_id, sum(phi_ship_phan_bo) tong_pb, max(phi_ship_goc) goc
from fct_ban_hang group by 1 having sum(phi_ship_phan_bo) <> max(phi_ship_goc);

-- 2. NON-NEGATIVE: a negative factor or a 0 denominator produces a meaningless value
select don_hang_id, dong, phi_ship_phan_bo
from fct_ban_hang where phi_ship_phan_bo < 0;

-- 3. NO LOST ROWS: every fact row has an allocated value
select count(*) so_dong_thieu from fct_ban_hang where phi_ship_phan_bo is null;
```

Test 3 catches the subtlest trap: **an order whose total goods amount is zero**. Then the allocation ratio's
denominator is 0, and:

```text
90000 * 0 / 0  →  NaN hoac NULL, tuy engine
```

A zero-goods order sounds absurd but is real: gift orders, warranty-exchange orders, orders discounted
100%. They still have a shipping fee.

The cure must be decided **in advance**:

```sql
case when sum(tien_hang) over (partition by don_hang_id) = 0
     then phi_ship / count(*) over (partition by don_hang_id)   -- chia deu
     else phi_ship * tien_hang / sum(tien_hang) over (partition by don_hang_id)
end
```

Dividing evenly is a reasonable choice here, but it **must be a conscious choice**,
not a `NULL` falling out and somebody `coalesce(..., 0)`ing everything back to green.

These three tests must run **before** the table is published, not after somebody reports
a divergent number.

</details>

---

## Group B — Year-to-date and timespan

### Exercise B.1 — The cumulative column inflating 3.38×

**The task:** build a per-day table with a `dt_ytd` column, then sum that column — exactly what
every BI tool does when the column is dragged into a total cell.

**The answer it must produce:**

```text
┌────────────────┬─────────────┬───────────────┐
│ doanh_thu_that │ sum_cot_ytd │ phong_may_lan │
├────────────────┼─────────────┼───────────────┤
│       10215000 │    34560000 │          3.38 │
└────────────────┴─────────────┴───────────────┘
```

<details>
<summary>Solution</summary>

```sql
with theo_ngay as (select ngay, sum(so_luong*don_gia) dt from don_hang_chi_tiet group by 1),
     ytd as (select ngay, dt, sum(dt) over (order by ngay) dt_ytd from theo_ngay)
select (select sum(dt) from theo_ngay) doanh_thu_that,
       sum(dt_ytd) sum_cot_ytd,
       round(sum(dt_ytd) * 1.0 / (select sum(dt) from theo_ngay), 2) phong_may_lan
from ytd;
```

The `ytd` table is **correct on every row** — 05/07's cumulative is 10,215,000, exactly right. It only breaks when
it's summed.

The inflation factor is 3.38 over 5 days. With `n` periods the factor is about `(n+1)/2` — 12 months gives **~6.5×**,
365 days gives **~183×**. And because the factor **changes with the number of periods on screen**, there's no fixed
ratio to recognise by eye.

Comparing with a bank balance — also non-additive across time — shows why YTD is more
dangerous:

| | An account balance | `doanh_thu_ytd` |
|---|---|---|
| Summing across time | meaningless | meaningless |
| Does the user **recognise** it as meaningless | yes — "summing 5 days of balances" sounds wrong immediately | **no** — it looks exactly like `doanh_thu` |

That's the fatal difference. The column name `doanh_thu_ytd` suggests it's revenue, and revenue
is summable. See [the case study on summing a cumulative column](../case-studies/cong-cot-luy-ke.md).

</details>

### Exercise B.2 — Compute the cumulative at read time

**The task:** drop the YTD column from the table and compute it with a window function at read time.

**The answer it must produce:**

```text
┌────────────┬─────────┬──────────┐
│    ngay    │   dt    │  dt_ytd  │
├────────────┼─────────┼──────────┤
│ 2026-07-01 │ 1350000 │  1350000 │
│ 2026-07-02 │ 3150000 │  4500000 │
│ 2026-07-03 │ 4200000 │  8700000 │
│ 2026-07-04 │ 1095000 │  9795000 │
│ 2026-07-05 │  420000 │ 10215000 │
└────────────┴─────────┴──────────┘
```

The last row = **10,215,000**. That's the check: the closing cumulative must equal the total.

<details>
<summary>Solution</summary>

```sql
with theo_ngay as (select ngay, sum(so_luong*don_gia) dt from don_hang_chi_tiet group by 1)
select ngay, dt, sum(dt) over (order by ngay) dt_ytd from theo_ngay order by ngay;
```

Same numbers, computed elsewhere. And the important difference: **the `dt` column is summable, the `dt_ytd` column
isn't** — but now `dt_ytd` exists only in the query result, not in a table for somebody to
drag by mistake.

The rule for every cumulative:

```text
Luy ke (YTD, MTD, running total)  →  DUNG luu. Tinh luc doc.
Khoang hieu luc (tu ... den ...)  →  PHAI luu. Khong tinh lai duoc.
```

The two halves are opposites, and that's why they share one exercise. A cumulative is a **function of data you
already have**, recomputable at any time; a validity interval is a **historical fact**, and losing it loses it
forever.

If YTD genuinely is needed for performance reasons, name it so it can't be summed by mistake:

```text
doanh_thu_ytd                    ← nguy hiem
doanh_thu_luy_ke_khong_duoc_cong ← xau, nhung an toan
```

Or better: keep it in a separate view the BI tool doesn't import.

</details>

### Exercise B.3 — Timespan: validity intervals rescue order `DN03`

**The task:** `ty_gia` **has no EUR row for 04/07**, so an equality `join` loses order `DN03`. Build the
rate table as **validity intervals** and join with `between`.

**The answer it must produce:**

```text
┌──────────────┬────────────┬─────────┬─────────┬────────┬─────────────┬──────────────┬─────────────┐
│ don_ngoai_id │  ngay_dat  │ tien_te │ so_tien │ ty_gia │ hieu_luc_tu │ hieu_luc_den │ quy_doi_vnd │
├──────────────┼────────────┼─────────┼─────────┼────────┼─────────────┼──────────────┼─────────────┤
│ DN01         │ 2026-07-01 │ USD     │     400 │  25400 │ 2026-07-01  │ 2026-07-01   │    10160000 │
│ DN02         │ 2026-07-02 │ EUR     │     250 │  27650 │ 2026-07-02  │ 2026-07-02   │     6912500 │
│ DN03         │ 2026-07-04 │ EUR     │     300 │  27700 │ 2026-07-03  │ 2026-07-04   │     8310000 │
│ DN04         │ 2026-07-05 │ USD     │     150 │  25500 │ 2026-07-05  │ 2026-07-05   │     3825000 │
│ DN05         │ 2026-07-08 │ USD     │     220 │  25550 │ 2026-07-08  │ 2026-07-08   │     5621000 │
│ DN06         │ 2026-07-09 │ EUR     │     180 │  27900 │ 2026-07-09  │ 2026-07-09   │     5022000 │
│ DN07         │ 2026-07-03 │ VND     │ 1500000 │   NULL │ NULL        │ NULL         │        NULL │
└──────────────┴────────────┴─────────┴─────────┴────────┴─────────────┴──────────────┴─────────────┘
```

`DN03` is **rescued** — it takes the 03/07 rate, in effect through 04/07. `DN07` is still
`NULL`, and that's [set 6](bt-06-tich-hop.md)'s exercise.

<details>
<summary>Solution</summary>

```sql
with tg as (
  select tien_te, ngay hieu_luc_tu,
         coalesce((lead(ngay) over (partition by tien_te order by ngay) - interval 1 day)::date,
                  date '9999-12-31') hieu_luc_den,
         ty_gia
  from ty_gia)
select d.don_ngoai_id, d.ngay_dat, d.tien_te, d.so_tien, tg.ty_gia,
       tg.hieu_luc_tu, tg.hieu_luc_den, d.so_tien * tg.ty_gia quy_doi_vnd
from don_hang_ngoai_te d
left join tg on tg.tien_te = d.tien_te
            and d.ngay_dat between tg.hieu_luc_tu and tg.hieu_luc_den
order by d.don_ngoai_id;
```

This is **turning an event table into an interval table** — the same technique used to build the
[Type 2 dim in set 1](bt-01-nen-tang.md#exercise-c2--build-a-type-2-dimension-from-daily-extracts),
applied here to exchange rates.

Note the `DN03` row: `hieu_luc_tu = 03/07`, `hieu_luc_den = 04/07` — an interval **two days
long**, because 04/07 has no new rate row. That's exactly the correct semantics of a
rate: **it stays in force until a new price arrives**.

With an equality `join` on `tg.ngay = d.ngay_dat`, `DN03` vanishes **without a trace**. And this
is the general shape of an entire class of bug:

| The data type | Its nature | The right join |
|---|---|---|
| Exchange rates, list prices, tax rates | **intervals** — in force until changed | `between` |
| Transactions, events | **points** — happening once | `=` |

Mistaking an interval for a point loses rows whenever the source doesn't send a value for a day — a
weekend, a public holiday, or simply the source job failing one day.

</details>

### Exercise B.4 — Balances: semi-additive across time

**The task:** with `kho_hang` (end-of-day stock), compute three ways of aggregating across time and point out which
one is usable.

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
select ma_hang, sum(ton_cuoi_ngay) cong_bay_ngay,
       max_by(ton_cuoi_ngay, ngay) ton_cuoi_ky,
       round(avg(ton_cuoi_ngay),1) ton_tb
from kho_hang group by 1 order by 1;
```

This exercise deliberately repeats [set 1, exercise A.4](bt-01-nen-tang.md#exercise-a4--snapshots-summing-along-time-is-meaningless)
— because `ton_cuoi_ngay` and `doanh_thu_ytd` are **the same illness**, and recognising
that matters more than remembering each individual case:

```text
Additive        : cong duoc theo MOI chieu           (doanh_thu, so_luong)
Semi-additive   : cong duoc TRU chieu thoi gian      (ton kho, so du, YTD)
Non-additive    : khong cong duoc theo chieu nao     (ty le, don gia, lai suat)
```

These three categories must be **documented per numeric column**, because SQL doesn't distinguish them.
The most practical way is to record it in dbt's `schema.yml`:

```yaml
columns:
  - name: ton_cuoi_ngay
    description: >
      SEMI-ADDITIVE. Cong duoc theo mat hang/kho.
      KHONG cong duoc theo ngay — dung max_by(ngay) hoac avg.
```

And enforce it at the BI layer by declaring `aggregation: last_value` for that column, if the tool
supports it. Where you can't enforce it, at least document it — because this column will be summed by
mistake; the only question is when.

</details>

### Exercise B.5 — Which numbers to store, which to compute

**The task:** no SQL. Build a decision table for six measures.

<details>
<summary>Solution</summary>

| Measure | Store or compute | Why |
|---|---|---|
| `tien_hang` (quantity × unit price) | **store** | atomic, additive, the source of everything else |
| `doanh_thu_ytd` | **compute** | a function of existing data; storing it invites mis-summing |
| `phi_ship_phan_bo` | **store** | the result of a **decision** (the basis, the carrier line) — recomputing may differ |
| `ty_le_tra_hang` | **compute** | non-additive; storing the ratio loses the numerator/denominator |
| `hieu_luc_tu` / `hieu_luc_den` | **store** | a historical fact, unrecoverable once lost |
| `ton_cuoi_ngay` | **store** | not derivable from transactions if there are receipts/issues outside the system |

The rules that fall out, in three sentences:

**Store what can't be recomputed.** Validity intervals, snapshots, the results of business decisions.

**Compute what can be recomputed.** Cumulatives, ratios, rankings, percentiles.

**When in doubt, store the numerator and the denominator, not the quotient.** `ty_le_tra_hang` = 0.12 is a dead
end; storing `gia_tri_tra` and `doanh_thu` lets you compute the ratio at **any** aggregation level. Exercise
C.2 proves it numerically.

The only exception to "compute what can be recomputed": when recomputing is too expensive and the result is
**immutable**. Then store it, but name the column and document it so nobody sums it wrongly.

</details>

---

## Group C — Aggregate fact tables

### Exercise C.1 — A summary table storing `avg`: 5.7% out

**The task:** build a per-day summary table with `avg` pre-stored, then compute the whole-period average from it and
compare against the figure from the atomic table.

**The answer it must produce:**

```text
┌────────────────────────────────┬─────────────┐
│             nguon              │ tb_moi_dong │
├────────────────────────────────┼─────────────┤
│ tu atomic                      │    681000.0 │
│ tu agg: sum(tong)/sum(so_dong) │    681000.0 │
│ tu agg: avg(tong/so_dong) SAI  │    642500.0 │
└────────────────────────────────┴─────────────┘
```

**642,500 against 681,000 — 5.7% out.**

<details>
<summary>Solution</summary>

```sql
create or replace table agg_ngay as
select ngay, sum(so_luong*don_gia) tong_tien, count(*) so_dong,
       count(distinct don_hang_id) so_don
from don_hang_chi_tiet group by 1;

select 'tu atomic' nguon, round(avg(so_luong*don_gia),1) tb_moi_dong from don_hang_chi_tiet
union all select 'tu agg: sum(tong)/sum(so_dong)', round(sum(tong_tien)*1.0/sum(so_dong),1) from agg_ngay
union all select 'tu agg: avg(tong/so_dong) SAI', round(avg(tong_tien*1.0/so_dong),1) from agg_ngay;
```

**Avg-of-avg is wrong because each day has a different line count.** 05/07 has only 2 lines but is
weighted the same as 02/07 with 4.

```text
avg(a/b) ≠ sum(a)/sum(b)   khi b khong deu nhau
```

That's why a summary table **must store the numerator and denominator separately**, never the quotient:

| What you store | Can you recompute the correct `avg`? |
|---|---|
| `avg_tien` | **no** — the denominator is gone |
| `tong_tien` + `so_dong` | **yes** — `sum/sum` |

The general principle: **a summary table may only store additive numbers**. `sum`, `count`, `min`,
`max` are fine. `avg`, ratios, percentages and percentiles are not — they must be **derived**
from the additive numbers at read time.

`count(distinct ...)` is the borderline case worth remembering: the `so_don` column in `agg_ngay`
**can't be summed across days** if an order spans several days. Here each order fits within one
day so `sum(so_don)` = 10 happens to be right — exercise C.2 checks.

</details>

### Exercise C.2 — Reconcile the summary table against atomic

**The task:** check `agg_ngay` matches the atomic table, for both total money and order count.

**The answer it must produce:**

```text
┌──────────┬───────────┬────────┬─────────────┬─────────────┐
│  tu_agg  │ tu_atomic │ chenh  │ cong_so_don │ so_don_that │
├──────────┼───────────┼────────┼─────────────┼─────────────┤
│ 10215000 │  10215000 │      0 │          10 │          10 │
└──────────┴───────────┴────────┴─────────────┴─────────────┘
```

Both pairs match. But the second pair matches by **luck**, not by correctness.

<details>
<summary>Solution</summary>

```sql
select (select sum(tong_tien) from agg_ngay) tu_agg,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) tu_atomic,
       (select sum(tong_tien) from agg_ngay)
         - (select sum(so_luong*don_gia) from don_hang_chi_tiet) chenh,
       (select sum(so_don) from agg_ngay) cong_so_don,
       (select count(distinct don_hang_id) from don_hang_chi_tiet) so_don_that;
```

`sum(tong_tien)` matches because money is **additive** — summing per day then summing the days always
equals summing directly.

`sum(so_don)` matches **only because in this data every order fits inside one day**. Add one
order with lines on two days and the two sides diverge immediately: `agg` counts it twice, atomic once.

That's why `count(distinct)` **must not be stored in a summary table** — or, if it is,
it must be documented as usable only at exactly the aggregated level, never summed to a higher level.

Three ways out when you genuinely need distinct counts at several levels:

| The approach | The trade-off |
|---|---|
| A separate summary table for **each** level needed | many tables, more space, exactly correct |
| Store a HyperLogLog sketch | summable, ~2% error |
| Go back to atomic when you need `distinct` | slow, but always right |

And this reconciliation test must **run on every summary-table build**. A summary table diverging from
atomic is the worst kind of bug: two reports on the same subject give two numbers, and the user loses
faith in both — exactly
[the case study on the summary table with divergent numbers](../case-studies/bang-tong-hop-lech-so.md).

</details>

### Exercise C.3 — A shrunken dimension must derive from the source dimension

**The task:** no SQL required. A summary table by `nhom` needs a shrunken `dim_nhom`. Why
**must** it derive from `dim_hang_hoa` rather than being built separately?

<details>
<summary>Solution</summary>

```sql
-- RIGHT: derive from the source dim
create or replace table dim_nhom as
select distinct nhom_id, ten_nhom from cay_nhom_hang
where nhom_id in (select nhom_id from hang_hoa_nhom);

-- WRONG: built separately from another source
create or replace table dim_nhom_sai as
select * from (values ('N5','Thiet bi nhap'), ('N6','Man hinh')) t(nhom_id, ten_nhom);
```

The second table is **correct today**. It goes wrong the day somebody renames a group in `cay_nhom_hang`
and forgets to rename it here. From that day on:

```text
Bao cao chi tiet (tu dim_hang_hoa)  →  "Thiet bi hien thi"
Bao cao tong hop (tu dim_nhom_sai)  →  "Man hinh"
```

Two reports, two labels for the same group, and **nobody knows which is right**. Worse: if
`nhom_id` also diverges, the two reports' totals differ, and the investigation takes days.

This is Kimball's **shrunken dimension** principle: a summary table's dimension must be a
**genuine subset** of the detailed dimension — the same keys, the same labels, produced by
`select distinct` from the source table.

Three conditions for a summary table to count as **valid**:

1. **The shrunken dimension derives from the source dimension**, not built separately.
2. **It contains only additive numbers** (exercise C.1).
3. **It has a reconciliation test against atomic** (exercise C.2).

Miss any one and the summary table isn't "a faster copy of the truth" — it's
**a second truth**, and with two truths one is always wrong.

</details>

### Exercise C.4 — Is a summary table worth building

**The task:** no SQL. State the conditions under which a summary table earns its keep.

<details>
<summary>Solution</summary>

**Measure first, build second.** A summary table is an optimisation, and an unmeasured optimisation is technical debt
paid in advance.

Three numbers to measure:

| What you measure | The threshold for building |
|---|---|
| **The compression ratio** = atomic rows / summary rows | ≥ 10× |
| **The frequency** of queries at exactly that level | daily or more |
| **The current query time** | slow enough for users to complain |

For this lab: 15 atomic rows → 5 rows per day. A ratio of **3×**. Not worth it — and that's the honest
answer, even though the exercise just built it.

A summary table's real cost isn't storage but **three things you must maintain forever**:

1. **A second pipeline** that must run in the right order after atomic, and can fail.
2. **A reconciliation test** that must run every time, and somebody must handle it going red.
3. **The question "which table do I use"** for every report author, forever.

Point 3 is the most often overlooked. A user who doesn't know which table to pick will pick wrong, and
a wrong report will be believed because "it came out of the warehouse".

**The order to try, before building a summary table:**

```text
1. Phan vung theo ngay + cot hoa (Parquet/Iceberg)  →  thuong du
2. Sap xep/cluster theo cot hay loc                  →  re, khong them bang
3. Materialized view engine tu duy tri               →  khong co pipeline thu hai
4. Bang tong hop tu quan ly                          →  chi khi 1-3 khong du
```

The first three **don't create a second truth**. Only go to step 4 once you've measured and the first three
aren't enough. See [Aggregate fact tables](../skills/aggregate-fact-table.md).

</details>

---

## Group D — Putting behaviour into a dimension

### Exercise D.1 — Behavioural attributes aggregated from the fact

**The task:** build `dim_khach_hanh_vi` — a customer dimension with extra attributes **computed from
the fact**: order count, total spend, last purchase, spend segment, days since last purchase.

**The answer it must produce:**

```text
┌──────────┬───────────┬────────┬──────────┬─────────────────────┬───────────────────┐
│ khach_id │   hang    │ so_don │ tong_chi │    phan_khuc_chi    │ so_ngay_khong_mua │
├──────────┼───────────┼────────┼──────────┼─────────────────────┼───────────────────┤
│ C2       │ Vang      │      3 │  3720000 │ Chi tieu cao        │                 0 │
│ C1       │ Bac       │      3 │  2745000 │ Chi tieu trung binh │                 1 │
│ C3       │ Bac       │      2 │  2100000 │ Chi tieu trung binh │                 1 │
│ C4       │ Kim cuong │      2 │  1650000 │ Chi tieu thap       │                 0 │
└──────────┴───────────┴────────┴──────────┴─────────────────────┴───────────────────┘
```

**`C4` is Diamond tier but spends the least.** That isn't a data bug — it's the entire
reason this technique exists.

<details>
<summary>Solution</summary>

```sql
create or replace table dim_khach_hanh_vi as
with tk as (
  select h.khach_id, count(distinct h.don_hang_id) so_don,
         sum(ct.so_luong*ct.don_gia) tong_chi, max(h.ngay_dat) lan_cuoi
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1)
select k.khach_id, k.ho_ten, k.hang, tk.so_don, tk.tong_chi, tk.lan_cuoi,
       case when tk.tong_chi >= 3000000 then 'Chi tieu cao'
            when tk.tong_chi >= 2000000 then 'Chi tieu trung binh'
            else 'Chi tieu thap' end phan_khuc_chi,
       date '2026-07-05' - tk.lan_cuoi so_ngay_khong_mua
from khach_hang k join tk using (khach_id);

select khach_id, hang, so_don, tong_chi, phan_khuc_chi, so_ngay_khong_mua
from dim_khach_hanh_vi order by tong_chi desc;
```

The `hang` and `phan_khuc_chi` columns are **two entirely different kinds of attribute**:

| | `hang` | `phan_khuc_chi` |
|---|---|---|
| Source | **assigned** by the business | **computed** from the fact |
| Changes when | somebody decides | the data changes |
| Trustworthy | yes, it's policy | yes, it's a measured fact |

`C4`'s contradiction between the two columns is precisely **a valuable finding**: the customer is classed Diamond
(perhaps from old history, from a relationship, from one large order last year) but currently spends the
least. Without the behavioural column this contradiction is invisible.

**Three traps to know before doing this:**

1. **`date '2026-07-05'` is hardcoded.** Re-run it tomorrow and `so_ngay_khong_mua` doesn't change
   — wrong. It must be the run date, or a column computed at read time.
2. **The dimension now depends on the fact.** The load order inverts: fact first, dimension second. That's
   an exception to the normal rule and must be stated in the pipeline.
3. **It changes every day.** Exactly [set 2, exercise B.5](bt-02-dimension-thoi-gian.md)'s problem —
   turning on Type 2 for these columns bloats the dim. Exercise D.2 is the way out.

</details>

### Exercise D.2 — Dynamic banding at read time

**The task:** instead of freezing the segment into the dimension, compute it **at read time** with `ntile` and
`percent_rank`.

**The answer it must produce:**

```text
┌──────────┬──────────┬───────────────┬─────────┐
│ khach_id │ tong_chi │ nua_tren_duoi │ phan_vi │
├──────────┼──────────┼───────────────┼─────────┤
│ C2       │  3720000 │             1 │   100.0 │
│ C1       │  2745000 │             1 │    67.0 │
│ C3       │  2100000 │             2 │    33.0 │
│ C4       │  1650000 │             2 │     0.0 │
└──────────┴──────────┴───────────────┴─────────┘
```

<details>
<summary>Solution</summary>

```sql
with tk as (
  select h.khach_id, sum(ct.so_luong*ct.don_gia) tong_chi
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1)
select khach_id, tong_chi,
       ntile(2) over (order by tong_chi desc) nua_tren_duoi,
       round(100.0 * percent_rank() over (order by tong_chi), 0) phan_vi
from tk order by tong_chi desc;
```

The fundamental difference from exercise D.1:

| | A fixed threshold (D.1) | A dynamic percentile (D.2) |
|---|---|---|
| What `C4` is | "Chi tieu thap" **permanently** in the dim | "the bottom half" **relative to the current set** |
| Inflation pushing everyone past the threshold | everyone becomes "Chi tieu cao" | the proportions stay the same |
| Comparing two periods | **possible** | **impossible** — "the top half" means something different each period |
| Storing it in the dim | fine | **not advisable** |

The third row is the decisive reason. Percentiles **aren't comparable across time**: "the top 25%
in June" and "the top 25% in July" are two different sets with two different thresholds, and a line
chart connecting those two points is a meaningless chart.

**The rule:**

```text
Nguong CO DINH (nghiep vu dat)  →  chot vao dim, so sanh duoc qua thoi gian
Phan vi DONG   (tinh tu du lieu) →  tinh luc doc, KHONG chot vao dim
```

Freezing a percentile into a dimension is a serious bug because it **changes itself whenever the table is
rebuilt**: a customer who did nothing jumps from "the top 25%" down to "the top 50%" purely because new customers
arrived. Historical reports change their numbers, and nobody can trace why.

</details>

### Exercise D.3 — A step dimension: position in the funnel

**The task:** with `su_kien_web`, number each event's step within its session (one customer, one
day), then break down the event types by step.

**The answer it must produce:**

```text
┌───────┬────────────┬───────┬──────────┬────────────┐
│ buoc  │ so_su_kien │  xem  │ them_gio │ thanh_toan │
├───────┼────────────┼───────┼──────────┼────────────┤
│     1 │         13 │    13 │        0 │          0 │
│     2 │         10 │     0 │       10 │          0 │
│     3 │         10 │     3 │        1 │          6 │
│     4 │          5 │     1 │        3 │          1 │
│     5 │          3 │     1 │        0 │          2 │
│     6 │          1 │     0 │        1 │          0 │
│     7 │          1 │     0 │        0 │          1 │
└───────┴────────────┴───────┴──────────┴────────────┘
```

**Step 1 is always `xem`, step 2 is always `them_gio`.** Only from step 3 does it branch.

<details>
<summary>Solution</summary>

```sql
with b as (
  select khach_id, cast(thoi_diem as date) ngay, loai_su_kien, thoi_diem,
         row_number() over (partition by khach_id, cast(thoi_diem as date)
                            order by thoi_diem) buoc,
         count(*) over (partition by khach_id, cast(thoi_diem as date)) tong_buoc
  from su_kien_web)
select buoc, count(*) so_su_kien,
       count(*) filter (where loai_su_kien='xem') xem,
       count(*) filter (where loai_su_kien='them_gio') them_gio,
       count(*) filter (where loai_su_kien='thanh_toan') thanh_toan
from b group by 1 order by 1;
```

`buoc` is a **step dimension** — an attribute describing *the event's position in a sequence*,
not the event itself.

It answers a class of question the raw event table can't:

| The question | Needs `buoc` |
|---|---|
| At which step do customers give up? | yes |
| How many steps before an order closes? | yes |
| Which step loses the most people? | yes |
| Total view count | no |

The `tong_buoc` column (a countdown) is also worth storing: it lets you ask *"how many steps was this event from the
end of the session"* — useful for analysing what happens right before abandonment.

**The trap:** `buoc` depends on the **session definition**. Here a session = customer × day; switching to a
30-minute inactivity cut (as in
[set 1, exercise B.4](bt-01-nen-tang.md#exercise-b4--the-grain-of-a-session-decides-the-cart-abandonment-number)) changes every
number in the table. So the session definition must be settled **first**, and documented on the table.

</details>

### Exercise D.4 — A study group: a frozen set of customers

**The task:** no SQL required. Marketing wants to track *"the customers who bought in July"*
over the next 6 months. Why can't you use a dynamic filter?

<details>
<summary>Solution</summary>

```sql
-- WRONG: a dynamic filter — the customer set changes every run
select ... from fct_ban_hang f join dim_khach k using (khach_key)
where k.lan_mua_cuoi between '2026-07-01' and '2026-07-31';

-- RIGHT: freeze the customer set into a table
create or replace table nhom_nc_thang7 as
select distinct khach_id, date '2026-08-01' ngay_chot,
       'Da mua trong thang 7/2026' tieu_chi
from don_hang where ngay_dat between date '2026-07-01' and date '2026-07-31';
```

A dynamic filter breaks because **the customer set changes itself**:

- A late-arriving fact (set 2, exercise E.1) adds customers to the group after the study has begun.
- Customers deleted/merged at the source drop out of the group.
- Somebody changes the definition of `lan_mua_cuoi` and the whole group changes.

And once the set changes, **the before/after comparison loses its meaning** — you don't know whether the difference comes
from customer behaviour or from the set having changed.

This is called a **study group** or *static cohort*: a table holding only keys, frozen at a
moment in time, with its criteria and its cut-off date.

```sql
-- use: join it like a dimension
select d.thang, count(distinct f.khach_id) khach_con_hoat_dong, sum(f.tien_hang)
from fct_ban_hang f
join nhom_nc_thang7 n on n.khach_id = f.khach_id
join dim_ngay d on d.ngay_key = f.ngay_dat_key
group by 1 order by 1;
```

Three things you **must** store alongside: `ngay_chot`, the `tieu_chi` in words, and the SQL statement that produced
it. Without all three, nobody can reproduce the group six months later, and the study's results
can't be verified.

A study-group table is **immutable**. Need a new group? Create a new table, don't edit the old one.

</details>

### Exercise D.5 — Behaviour in the dimension or left in the fact

**The task:** no SQL. When do you put a behavioural attribute into a dimension, and when do you leave it
in the fact?

<details>
<summary>Solution</summary>

| The question | The right place |
|---|---|
| "Revenue by **spend segment**" | **the dimension** — you need to filter/group |
| "How much has this customer spent" | **compute from the fact** — don't store it |
| "Revenue from customers **who were VIP at purchase time**" | a **Type 2** dimension |
| "A customer's spend trajectory by month" | **its own fact** — grain customer × month |

The test: **a behavioural attribute should only enter a dimension when it's used to *slice* the data,
not to *view* it.**

Slicing (`group by`, `where`) → the dimension. Viewing (one number for one customer) → compute from the fact.

Three risks of putting behaviour into a dimension, in order of danger:

**1. A dependency cycle.** The dimension depends on the fact, the fact joins the dimension. The wrong load order means
the report uses **yesterday's** segments on **today's** fact — one day out, silently.

**2. Numbers changing themselves.** The segment is computed from data up to the present, so June's report run today
differs from June's report run last month. This is
[the case study on historical reports changing their own numbers](../case-studies/bao-cao-qua-khu-tu-doi-so.md) in
another guise.

**3. The dim bloating if Type 2 is on.** A column changing daily in a Type 2 dim = one version per
day per customer.

The way to avoid all three: **freeze the segment into the fact at load time**, as a `phan_khuc_luc_mua` column. The fact is
immutable, the dimension doesn't bloat, and the question *"which segment was the customer in at purchase time"* is
answerable — the same solution as
[the mini-dimension in set 2](bt-02-dimension-thoi-gian.md#exercise-c3--a-fact-with-two-keys-and-the-question-one-dim-cannot-answer).

See [Putting behaviour into a dimension](../skills/behavior-dimension.md).

</details>

---

## Quick reconciliation table

| The number | What it means | Exercise |
|---|---|---|
| 399,999 (1 dong short) | rounding in an allocation | A.1 |
| 400,000 closing exactly | pushing the error onto the largest line | A.2 |
| `SP-C` −26,538 | change the allocation basis, change the profit conclusion | A.3 |
| 34,560,000 / **3.38×** | summing a YTD column | B.1 |
| `DN03` rescued | a timespan `between` instead of an equality join | B.3 |
| 420 / 78 / 84.0 | semi-additive across time | B.4 |
| 681,000 vs **642,500** (−5.7%) | avg-of-avg | C.1 |
| `sum(so_don)` = 10 | matching by luck, not by correctness | C.2 |
| `C4` Diamond / lowest spend | an assigned tier ≠ measured behaviour | D.1 |
| step 1 = `xem`, step 2 = `them_gio` | a step dimension | D.3 |

## Related Topics

- [Exercise set 4 — Relationships and trees](bt-04-quan-he-va-cay.md) — the previous set
- [Exercise set 6 — Integration](bt-06-tich-hop.md) — the next set
- [The advanced fact lab](lab-fact-nang-cao.md) — the diagnostic version of the same four techniques
- [Skills — Data Modeling](../skills/index.md) — the theory behind the four techniques above
