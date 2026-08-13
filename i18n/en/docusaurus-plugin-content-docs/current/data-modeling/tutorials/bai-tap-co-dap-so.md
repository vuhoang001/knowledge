---
title: "26 exercises with answers — write them yourself, mark them yourself"
sidebar_position: 8
description: "Each exercise has a task, the number it must produce, and a hidden solution. Write your SQL first, compare the number, and only then open the solution."
tags: [tutorial, bai-tap, grain, scd, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# 26 exercises with answers — write them yourself, mark them yourself

> **Takeaway:** the seven labs are **diagnostic** — I lay the trap out and then explain it. This file is the
> reverse: **you write, the answer is given up front, and you know whether you're right without asking anybody**.

## How to use it

Each exercise has three parts:

1. **The task** — what to do
2. **The answer it must produce** — the exact number; matching it means you're right
3. **The solution** — hidden in a `<details>`, **open it only after trying**

Opening the solution before writing is reading, not practising. Getting it wrong a few times before getting it right sticks
for six months; reading the solution is forgotten in six minutes.

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

The data and the reconciliation benchmarks are on [the exercises page](index.md#the-data-shared-by-labs-27).
**10 orders · 15 lines · 10,215,000 · shipping fees 400,000.**

---

## Set 1 — Grain and fact/dimension

### Exercise 1.1 — Prove the grain with SQL, not with words

**The task:** write **one** statement returning three numbers: the row count, the count of distinct `don_hang_id`, and the count of distinct
composite keys — plus a boolean column concluding whether the grain is right.

**The answer:**

```text
┌─────────┬────────┬─────────────┬────────────┐
│ so_dong │ so_don │ khoa_to_hop │ grain_dung │
├─────────┼────────┼─────────────┼────────────┤
│      15 │     10 │          15 │ true       │
└─────────┴────────┴─────────────┴────────────┘
```

<details>
<summary>Solution</summary>

```sql
select count(*) so_dong,
       count(distinct don_hang_id) so_don,
       count(distinct (don_hang_id, dong)) khoa_to_hop,
       count(*) = count(distinct (don_hang_id, dong)) grain_dung
from don_hang_chi_tiet;
```

`so_don` = 10 ≠ 15 proves `don_hang_id` is **not** a key. Declaring `unique` on it is a
wrong test, not wrong data — see [Grain](../reference/grain.md).

</details>

### Exercise 1.2 — Which order has the most lines

**The task:** the three orders with the most goods lines, plus each order's value.

**The answer:**

```text
┌─────────────┬─────────┬─────────┐
│ don_hang_id │ so_dong │ gia_tri │
├─────────────┼─────────┼─────────┤
│ DH003       │       3 │ 1950000 │
│ DH001       │       2 │  600000 │
│ DH005       │       2 │ 2700000 │
└─────────────┴─────────┴─────────┘
```

<details>
<summary>Solution</summary>

```sql
select don_hang_id, count(*) so_dong, sum(so_luong*don_gia) gia_tri
from don_hang_chi_tiet group by 1 order by 2 desc, 1 limit 3;
```

`DH003` has three lines — remember that number, it's the culprit in every inflation exercise later on.

</details>

### Exercise 1.3 — The average basket, and the denominator trap

**The task:** compute the average value of **one order**. Then recompute it with `count(*)` instead of
`count(distinct ...)` and compare the two numbers.

**The answer:**

```text
┌───────────┬────────┬─────────────┬─────────┬────────────────────┐
│ doanh_thu │ so_don │ gio_hang_tb │ so_dong │ neu_dung_count_sao │
├───────────┼────────┼─────────────┼─────────┼────────────────────┤
│  10215000 │     10 │   1021500.0 │      15 │           681000.0 │
└───────────┴────────┴─────────────┴─────────┴────────────────────┘
```

<details>
<summary>Solution</summary>

```sql
select sum(so_luong*don_gia) doanh_thu,
       count(distinct don_hang_id) so_don,
       round(sum(so_luong*don_gia)*1.0/count(distinct don_hang_id), 0) gio_hang_tb,
       count(*) so_dong,
       round(sum(so_luong*don_gia)*1.0/count(*), 0) neu_dung_count_sao
from don_hang_chi_tiet;
```

**1,021,500 or 681,000?** The grain is *the order line*, so `count(*)` counts lines, not
orders. This is exactly why a [degenerate dimension](../skills/degenerate-dimension.md) must stay
in the fact — without `don_hang_id` you can't count orders.

</details>

### Exercise 1.4 — Counting orders by status: where `count(*)` goes wrong

**The task:** join `don_hang` to `don_hang_chi_tiet`, count orders by status **both**
ways, and put them side by side.

**The answer:**

```text
┌────────────┬─────────┬──────────┐
│ trang_thai │ dem_sao │ dem_dung │
├────────────┼─────────┼──────────┤
│ hoan_thanh │      11 │        6 │
│ dang_giao  │       2 │        2 │
│ moi        │       2 │        2 │
└────────────┴─────────┴──────────┘
```

<details>
<summary>Solution</summary>

```sql
select h.trang_thai, count(*) dem_sao, count(distinct h.don_hang_id) dem_dung
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
group by 1 order by 3 desc;
```

`hoan_thanh` inflates from 6 to **11** because the completed orders are the ones with the most lines.
The other two groups don't diverge — so if you only look at `dang_giao` and `moi` you conclude the query is
right. The bug appears only in the group you don't check.

</details>

### Exercise 1.5 — Revenue by customer, with no inflation

**The task:** revenue and order count per customer.

**The answer:**

```text
┌──────────┬───────────┬────────┐
│ khach_id │ doanh_thu │ so_don │
├──────────┼───────────┼────────┤
│ C2       │   3720000 │      3 │
│ C1       │   2745000 │      3 │
│ C3       │   2100000 │      2 │
│ C4       │   1650000 │      2 │
└──────────┴───────────┴────────┘
```

The four rows total **10,215,000**. Not matching means your join is replicating.

<details>
<summary>Solution</summary>

```sql
select h.khach_id, sum(ct.so_luong*ct.don_gia) doanh_thu,
       count(distinct h.don_hang_id) so_don
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
group by 1 order by 2 desc;
```

Joining `don_hang` (order grain) to `chi_tiet` (line grain) is **safe for the money column**, because the money
sits at the fine grain. It only breaks when you sum a column belonging to the coarse grain — see exercise 4.1.

</details>

---

## Set 2 — Dimensions

### Exercise 2.1 — Build a `dim_ngay` with a `-1` row

**The task:** generate a calendar from 01/07/2026, 62 days, plus a `-1` row for the *hasn't happened* milestone.

**The answer:** `63` rows, of which `1` has `ngay_key = -1`.

<details>
<summary>Solution</summary>

```sql
create or replace table dim_ngay as
with lich as (select (date '2026-07-01' + interval (i) day)::date ngay from range(0,62) t(i))
select cast(strftime(ngay,'%Y%m%d') as integer) ngay_key, ngay, month(ngay) thang,
       dayofweek(ngay) not in (0,6) la_ngay_lam_viec
from lich
union all select -1, null, null, null;
```

The `-1` row must exist **before** the fact is loaded — without it, the ETL is forced to leave `NULL` in the
key column and the `JOIN` throws the row away. See [the date dimension](../reference/date-dimension.md).

</details>

### Exercise 2.2 — Working days in July

**The task:** how many days does July 2026 have, and how many are working days?

**The answer:**

```text
┌─────────┬───────────────┐
│ so_ngay │ ngay_lam_viec │
├─────────┼───────────────┤
│      31 │            23 │
└─────────┴───────────────┘
```

### Exercise 2.3 — Two denominators, two conclusions

**The task:** average revenue per day in July — computed twice, once divided by the calendar day count
and once by the working day count.

**The answer:**

```text
┌──────────┬──────────────────┬──────────────────┐
│   tong   │ tb_moi_ngay_lich │ tb_ngay_lam_viec │
├──────────┼──────────────────┼──────────────────┤
│ 10215000 │         329516.0 │         444130.0 │
└──────────┴──────────────────┴──────────────────┘
```

<details>
<summary>The solution, and why it matters</summary>

```sql
select sum(ct.so_luong*ct.don_gia) tong,
       round(sum(ct.so_luong*ct.don_gia)*1.0
             /(select count(*) from dim_ngay where thang=7), 0) tb_moi_ngay_lich,
       round(sum(ct.so_luong*ct.don_gia)*1.0
             /(select count(*) from dim_ngay where thang=7 and la_ngay_lam_viec), 0) tb_ngay_lam_viec
from don_hang_chi_tiet ct join dim_ngay d on d.ngay = ct.ngay;
```

**329,516 or 444,130?** A gap of **35%**, and both are "right" — only the denominator differs. Compare a month
with many public holidays against an ordinary month using the first column and the holiday month always looks bad.

Without `dim_ngay` the number 444,130 **doesn't exist**, and nobody even knows it's
missing.

</details>

### Exercise 2.4 — Where do the undelivered orders land

**The task:** revenue by `ngay_giao_key`, using `coalesce(..., -1)`. How many rows and how much money are in the
`-1` group?

**The answer:**

```text
┌───────────────┬─────────┬───────────┐
│ ngay_giao_key │ so_dong │ doanh_thu │
├───────────────┼─────────┼───────────┤
│            -1 │       2 │   1770000 │
│      20260702 │       1 │    750000 │
│      20260703 │       2 │    600000 │
└───────────────┴─────────┴───────────┘
```

<details>
<summary>Solution</summary>

```sql
select coalesce(cast(strftime(h.ngay_giao,'%Y%m%d') as integer), -1) ngay_giao_key,
       count(*) so_dong, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
group by 1 order by 1;
```

**1,770,000 — 17.3% of revenue** sits in the *not yet delivered* group. Drop the `coalesce` and the `JOIN` to
`dim_ngay` swallows them all, and the report looks perfectly normal. See
[the case study on half the orders vanishing](../case-studies/don-dang-giao-bien-mat.md).

</details>

---

## Set 3 — SCD

You need `scd_khach_hang` from [the SCD lab](scd-bang-dbt-snapshot.md).

### Exercise 3.1 — The snapshot's grain

**The task:** how many rows does the snapshot have, for how many customers? Which customer has more than one
version?

**The answer:** `5` rows / `4` customers. `C1` has `2` versions.

<details>
<summary>Solution</summary>

```sql
select count(*) so_dong, count(distinct khach_id) so_khach from scd_khach_hang;
select khach_id, count(*) so_phien_ban from scd_khach_hang group by 1 having count(*) > 1;
```

The grain is *one version of one customer* — so `unique(khach_id)` must FAIL, and that's the right
failure.

</details>

### Exercise 3.2 — As-was and as-is: the same money, a different conclusion

**The task:** revenue for `C1` alone, computed twice — by the region **at purchase time** and by the
**current** region.

**The answer:**

```text
┌──────────────────┬──────────┬─────────┐
│       cach       │ khu_vuc  │   dt    │
├──────────────────┼──────────┼─────────┤
│ as-was (luc mua) │ Mien Bac │ 2745000 │
│ as-is (hien tai) │ Mien Nam │ 2745000 │
└──────────────────┴──────────┴─────────┘
```

<details>
<summary>The solution and the crux</summary>

```sql
-- as-is: the current version
join scd_khach_hang d on d.khach_id = h.khach_id and d.dbt_valid_to is null

-- as-was: the version in effect at the order date (with the first version backfilled)
with d as (select *, dbt_valid_from = min(dbt_valid_from) over (partition by khach_id) la_ban_dau
           from scd_khach_hang)
join d on d.khach_id = h.khach_id
 and h.ngay_dat >= case when d.la_ban_dau then timestamp '1900-01-01' else d.dbt_valid_from end
 and h.ngay_dat <  coalesce(d.dbt_valid_to, timestamp '9999-12-31')
```

**Identical money — 2,745,000. Only the region changes.**

That's what makes this class of bug the most dangerous: every **total**-reconciliation test is green, because not a
dong is lost. The money is merely assigned to the wrong dimension member. To catch it you need a separate *as-was*
test: `C1`'s July revenue must sit in the North.

</details>

### Exercise 3.3 — Check the validity intervals

**The task:** write a query detecting overlapping intervals in the snapshot.

**The answer:** `0` overlapping intervals.

<details>
<summary>Solution</summary>

```sql
with x as (select khach_id, dbt_valid_to,
                  lead(dbt_valid_from) over (partition by khach_id order by dbt_valid_from) ke
           from scd_khach_hang)
select count(*) so_khoang_chong_lan from x where ke is not null and ke <> dbt_valid_to;
```

This statement catches **both** bugs in one scan: `ke > dbt_valid_to` is a gap (a fact landing
in it loses its row), `ke < dbt_valid_to` is an overlap (doubling rows).

</details>

---

## Set 4 — Advanced facts

### Exercise 4.1 — Allocate the shipping fee by item

**The task:** allocate `phi_ship` (order level) onto each line in proportion to the goods amount, then aggregate by
item. Also compute the shipping fee as a share of revenue.

**The answer:**

```text
┌─────────┬───────────┬──────────────────┬───────────┐
│ ma_hang │ tien_hang │ phi_ship_phan_bo │ ty_le_pct │
├─────────┼───────────┼──────────────────┼───────────┤
│ SP-A    │   3300000 │         160000.0 │      4.85 │
│ SP-B    │   3000000 │         117692.0 │      3.92 │
│ SP-C    │   3600000 │          86538.0 │       2.4 │
│ SP-D    │    315000 │          35769.0 │     11.36 │
└─────────┴───────────┴──────────────────┴───────────┘
```

<details>
<summary>The solution — and the insight it yields</summary>

```sql
with pb as (
  select ct.ma_hang, ct.so_luong*ct.don_gia tien_hang,
         h.phi_ship::double * (ct.so_luong*ct.don_gia)
           / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id) phi
  from don_hang_chi_tiet ct join don_hang h using (don_hang_id))
select ma_hang, sum(tien_hang) tien_hang, round(sum(phi),0) phi_ship_phan_bo,
       round(100.0*sum(phi)/sum(tien_hang),2) ty_le_pct
from pb group by 1 order by 3 desc;
```

**`SP-D` carries shipping fees worth 11.36% of its revenue** — nearly 5× `SP-C`'s (2.4%). This is a business
conclusion that **doesn't exist** while the shipping fee still sits at order level: a cheap wireless mouse that
costs as much to ship as an expensive item.

Note that the `over (partition by ct.don_hang_id)` window sits **inside the CTE**, not nested in
`sum()` — DuckDB (and every engine) forbids calling a window inside an aggregate.

</details>

### Exercise 4.2 — YTD computed at read time

**The task:** revenue by day, plus a cumulative column — **without** storing that column in the table.

**The answer:**

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

<details>
<summary>Solution</summary>

```sql
select ngay, sum(so_luong*don_gia) dt,
       sum(sum(so_luong*don_gia)) over (order by ngay) dt_ytd
from don_hang_chi_tiet group by ngay order by ngay;
```

`sum(sum(...)) over (...)` looks odd but is right: the inner `sum()` is the `GROUP BY`
aggregate, and the outer `sum() over` runs **after** the grouping.

The last row equals the total exactly — that's the quick check. And because this column **isn't in the table**,
nobody can drag it into a total cell by mistake and inflate 3.38× as in
[the advanced fact lab](lab-fact-nang-cao.md), exercise 3.

</details>

### Exercise 4.3 — A summary table: what to store so the average stays right

**The task:** build `agg_ngay` storing `sum` and `count`. From it, compute the average per row two ways —
right and wrong — then compare.

**The answer:**

```text
┌───────────┬─────────┬──────────┬────────────────────┐
│ doanh_thu │ so_dong │ tb_dung  │ tb_sai_avg_cua_avg │
├───────────┼─────────┼──────────┼────────────────────┤
│  10215000 │      15 │ 681000.0 │           642500.0 │
└───────────┴─────────┴──────────┴────────────────────┘
```

<details>
<summary>Solution</summary>

```sql
with agg as (select ngay, sum(so_luong*don_gia) dt, count(*) n
             from don_hang_chi_tiet group by 1)
select sum(dt) doanh_thu, sum(n) so_dong,
       round(sum(dt)*1.0/sum(n), 0) tb_dung,
       round(avg(dt*1.0/n), 0)      tb_sai_avg_cua_avg
from agg;
```

A gap of **5.7%**. `avg(dt/n)` gives each **day** equal weight, whether that day had 4 lines
or 2. The rule: a summary table **stores only summable numbers**, dividing at read time. See
[aggregate fact tables](../skills/aggregate-fact-table.md).

</details>

---

## Set 5 — Integration

### Exercise 5.1 — Return rate by item

**The task:** `tra_hang` has only `don_hang_id`, no `ma_hang`. Allocate the returned value onto each
item proportionally, then compute returns as a share of revenue.

**The answer:**

```text
┌─────────┬───────────┬─────────────┬───────────────┐
│ ma_hang │ doanh_thu │ tra_phan_bo │ ty_le_tra_pct │
├─────────┼───────────┼─────────────┼───────────────┤
│ SP-C    │   3600000 │   1107692.0 │          30.8 │
│ SP-A    │   3300000 │    253846.0 │           7.7 │
│ SP-B    │   3000000 │    138462.0 │           4.6 │
│ SP-D    │    315000 │         0.0 │           0.0 │
└─────────┴───────────┴─────────────┴───────────────┘
```

<details>
<summary>Solution</summary>

```sql
with pb as (
  select ct.ma_hang, ct.don_hang_id, ct.so_luong*ct.don_gia tien_hang,
         (ct.so_luong*ct.don_gia)*1.0
           / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id) ty_trong
  from don_hang_chi_tiet ct),
ban as (select ma_hang, sum(tien_hang) dt from pb group by 1),
tra as (select pb.ma_hang, sum(t.gia_tri_tra * pb.ty_trong) tra
        from tra_hang t join pb using (don_hang_id) group by 1)
select coalesce(ban.ma_hang, tra.ma_hang) ma_hang, ban.dt doanh_thu,
       round(coalesce(tra.tra,0),0) tra_phan_bo,
       round(100.0*coalesce(tra.tra,0)/nullif(ban.dt,0),1) ty_le_tra_pct
from ban full join tra on ban.ma_hang = tra.ma_hang
order by 4 desc nulls last;
```

**`SP-C` is returned at 30.8%** — nearly a third of its revenue. That's a product-quality signal,
and it only appears when you combine two facts through a shared dimension
([drill-across](../skills/conformed-dimension.md)).

Note the `FULL JOIN` + `coalesce` + `nullif` — three things mandatory in the combining pass; miss any one
and you lose a group or divide by 0.

</details>

### Exercise 5.2 — The closed-loop conformed-fact reconciliation

**The task:** write one statement proving that `tong_tien_khach_tra − doanh_thu_thuan` is explained
**entirely** by `phi_ship`.

**The answer:** `0`.

<details>
<summary>Solution</summary>

```sql
with ban as (select don_hang_id, sum(so_luong*don_gia) tien_hang
             from don_hang_chi_tiet group by 1)
select sum(b.tien_hang + h.phi_ship) - sum(b.tien_hang) - sum(h.phi_ship) con_lai
from ban b join don_hang h using (don_hang_id);
```

Being 0 **cannot happen by accident**. Making this statement a test turns the "two teams, two numbers"
argument into a subtraction in CI. See
[conformed facts](../skills/conformed-facts.md).

</details>

---

## Set 6 — Operations

### Exercise 6.1 — Detect a duplicate load when you *don't yet know* which batch is wrong

Set up the situation:

```sql
create or replace table fct_audit as select *, 1 audit_sk from don_hang_chi_tiet;
insert into fct_audit select *, 3 from don_hang_chi_tiet where don_hang_id in ('DH001','DH003');
```

**The task:** suppose you **don't** know `audit_sk = 3` is the surplus batch. Write a query finding which orders have
more records than they should.

**The answer:**

```text
┌─────────────┬────────────┐
│ don_hang_id │ so_ban_ghi │
├─────────────┼────────────┤
│ DH001       │          4 │
│ DH003       │          6 │
└─────────────┴────────────┘
```

`DH001` really has 2 lines and `DH003` has 3 — both are doubled.

<details>
<summary>Solution</summary>

```sql
select don_hang_id, count(*) so_ban_ghi
from fct_audit group by 1
having count(*) > (select count(*) from don_hang_chi_tiet ct
                   where ct.don_hang_id = fct_audit.don_hang_id)
order by 1;
```

This query **only works because the source table is still there to reconcile against**. In production the source
has usually been overwritten — which is why you need `audit_sk` **before** the incident happens, rather
than investigating afterwards. See [audit dimensions](../skills/audit-dimension.md).

</details>

### Exercise 6.2 — Delete exactly the right rows, no more

**The task:** delete the surplus batch, then prove the warehouse is back to correct.

**The answer:**

```text
┌──────────────┬───────────┐
│ dong_con_lai │ doanh_thu │
├──────────────┼───────────┤
│           15 │  10215000 │
└──────────────┴───────────┘
```

<details>
<summary>Solution</summary>

```sql
delete from fct_audit where audit_sk = 3;
select count(*) dong_con_lai, sum(so_luong*don_gia) doanh_thu from fct_audit;
```

**One statement, exactly 5 rows.** Compare with deleting by date range in
[the operations lab](lab-van-hanh.md), exercise 2 — 10 rows deleted, half of them good ones.

</details>

---

## Quick reconciliation table

Once you've done them all, self-check with this table. Any number that's off, go back to the matching exercise.

| The number | Value | Exercise |
|---|---|---|
| `don_hang_chi_tiet` grain | `(don_hang_id, dong)` — 15 lines / 10 orders | 1.1 |
| Average basket | 1,021,500 (not 681,000) | 1.3 |
| `hoan_thanh` orders | 6 (not 11) | 1.4 |
| Working days in July | 23 / 31 | 2.2 |
| Average per working day | 444,130 (not 329,516) | 2.3 |
| Undelivered revenue | 1,770,000 — **17.3%** | 2.4 |
| `C1` as-was vs as-is | both 2,745,000, different regions | 3.2 |
| Shipping fee carried by `SP-D` | **11.36%** of revenue | 4.1 |
| Average per line | 681,000 (not 642,500) | 4.3 |
| `SP-C` return rate | **30.8%** | 5.1 |
| Conformed-fact reconciliation | 0 | 5.2 |

## Related Topics

- [The seven diagnostic labs](index.md) — traps laid out and then explained; this file is the reverse
- [Grain](../reference/grain.md) · [Facts and dimensions](../reference/fact-and-dimension.md) — set 1
- [The date dimension](../reference/date-dimension.md) · [NULLs in facts and dimensions](../skills/null-handling.md) — set 2
- [SCD](../skills/scd.md) · [Late-arriving data](../skills/late-arriving.md) — set 3
- [Header/line and allocating facts](../skills/allocated-facts.md) · [Aggregate fact tables](../skills/aggregate-fact-table.md) — set 4
- [Conformed dimensions](../skills/conformed-dimension.md) · [Conformed facts](../skills/conformed-facts.md) — set 5
- [Audit dimensions](../skills/audit-dimension.md) — set 6
