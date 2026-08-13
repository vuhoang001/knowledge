---
title: "Exercise set 3 — Columns and tables: junk, degenerate, centipedes, attributes, NULL"
sidebar_position: 12
description: "23 exercises to write yourself: merging flags into a junk dimension, proving a degenerate must stay in the fact, dismantling a 19-foreign-key fact, and catching NULL swallowing rows via NOT IN."
tags: [tutorial, bai-tap, junk-dimension, degenerate-dimension, centipede-fact, dimension-attribute-design, null-handling, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Exercise set 3 — Columns and tables

> **Takeaway:** this set answers a single question — **where should this column live**. Inline in the
> fact, merged into one table, split out on its own, or dropped. Four options, and choosing wrong raises
> no error.

## Techniques practised in this set

| # | Technique | Source document | Exercises |
|---|---|---|---|
| 1 | Junk dimensions | [Junk dimensions](../skills/junk-dimension.md) | 5 |
| 2 | Degenerate dimensions | [Degenerate dimensions](../skills/degenerate-dimension.md) | 4 |
| 3 | Centipede fact tables | [Centipede fact tables](../skills/centipede-fact.md) | 4 |
| 4 | Designing dimension attributes | [Designing dimension attributes](../skills/dimension-attribute-design.md) | 5 |
| 5 | NULLs in facts and dimensions | [NULLs in facts and dimensions](../skills/null-handling.md) | 5 |

## Preparation

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

This set uses `don_hang` (status flags) and `giao_dich_tai_chinh` (a `NULL` forest) — see
[the seed appendix](bt-00-seed.md).

---

## Group A — Junk dimensions

### Exercise A.1 — Measure cardinality before deciding

**The task:** count the distinct values of four order-level flags: `trang_thai`, `da_giao`
(`ngay_giao is not null`), `da_nhan` (`ngay_nhan is not null`), `phi_ship_cao`
(`phi_ship >= 60000`).

**The answer it must produce:**

```text
┌──────────────┬────────────┐
│      co      │ so_gia_tri │
├──────────────┼────────────┤
│ trang_thai   │          3 │
│ da_giao      │          2 │
│ da_nhan      │          2 │
│ phi_ship_cao │          2 │
└──────────────┴────────────┘
```

All four are **low cardinality**. That's the necessary condition for a junk dimension — but not sufficient.

<details>
<summary>Solution</summary>

```sql
select 'trang_thai' co, count(distinct trang_thai) so_gia_tri from don_hang
union all select 'da_giao', count(distinct (ngay_giao is not null)) from don_hang
union all select 'da_nhan', count(distinct (ngay_nhan is not null)) from don_hang
union all select 'phi_ship_cao', count(distinct (phi_ship >= 60000)) from don_hang;
```

Low cardinality is a **necessary** condition, not a sufficient one. Two more questions to ask
before merging:

1. **Do the flags belong to the same entity?** All four describe *one order*. If one
   flag described the customer and another described the item, merging them would be wrong — they belong to two
   different dimensions.
2. **Is any flag really a dimension of its own that's growing?** `trang_thai` has 3 values
   today; if the business is about to add a returns process with 12 sub-statuses and its own
   attributes, then it's a `dim_trang_thai`, not a fragment of a junk.

The pragmatic threshold: **≤ ~20 values and no attributes of its own** makes it a junk candidate.
Above that threshold, build its own dimension.

</details>

### Exercise A.2 — 4 real combinations, 24 theoretical ones

**The task:** count the four-flag combinations that **actually appear** in the data, alongside the number of
**theoretical** combinations (3 × 2 × 2 × 2).

**The answer it must produce:**

```text
┌────────┬────────────────┬──────────────────┐
│ so_don │ to_hop_thuc_te │ to_hop_ly_thuyet │
├────────┼────────────────┼──────────────────┤
│     10 │              4 │               24 │
└────────┴────────────────┴──────────────────┘
```

**4 out of 24.** This is the number that decides how you build the junk dimension.

<details>
<summary>Solution</summary>

```sql
with co as (select trang_thai,
                   ngay_giao is not null da_giao,
                   ngay_nhan is not null da_nhan,
                   phi_ship >= 60000 phi_cao
            from don_hang)
select count(*) so_don,
       count(distinct (trang_thai, da_giao, da_nhan, phi_cao)) to_hop_thuc_te,
       3*2*2*2 to_hop_ly_thuyet
from co;
```

The 4/24 ratio = **17%** isn't accidental — the flags are **mutually dependent**:

```text
trang_thai='moi'        →  da_giao PHAI la false, da_nhan PHAI la false
trang_thai='dang_giao'  →  da_giao PHAI la true,  da_nhan PHAI la false
trang_thai='hoan_thanh' →  da_giao PHAI la true,  da_nhan PHAI la true
```

The three statuses already lock `da_giao` and `da_nhan` down, so only `phi_cao` is free → at most
6 valid combinations, and this data uses 4.

Two ways to build a junk dimension, chosen by this ratio:

| The approach | When | The risk |
|---|---|---|
| **Only the combinations seen** (4 rows) | sparse combinations, as here | you must **add a row when a new combination appears** at load time |
| **Pre-generate every combination** (24 rows) | dense combinations, few flags | the table holds meaningless rows (`moi` + `da_nhan`) |

At 17%, pre-generating is wasteful and confusing — 20 never-used rows sitting in the BI
filter list. Choose the first approach.

</details>

### Exercise A.3 — Build the junk dimension

**The task:** build `dim_junk_don` holding exactly the real combinations, with a `junk_key`.

**The answer it must produce:**

```text
┌──────────┬────────────┬─────────┬─────────┬─────────┐
│ junk_key │ trang_thai │ da_giao │ da_nhan │ phi_cao │
├──────────┼────────────┼─────────┼─────────┼─────────┤
│        1 │ dang_giao  │ true    │ false   │ false   │
│        2 │ hoan_thanh │ true    │ true    │ false   │
│        3 │ hoan_thanh │ true    │ true    │ true    │
│        4 │ moi        │ false   │ false   │ false   │
└──────────┴────────────┴─────────┴─────────┴─────────┘
```

<details>
<summary>Solution</summary>

```sql
create or replace table dim_junk_don as
select row_number() over (order by trang_thai, da_giao, da_nhan, phi_cao) junk_key, *
from (select distinct trang_thai,
             ngay_giao is not null da_giao,
             ngay_nhan is not null da_nhan,
             phi_ship >= 60000 phi_cao
      from don_hang);

select * from dim_junk_don order by junk_key;
```

The table reads immediately: `hoan_thanh` appears twice because of high/low shipping fees; `moi` has only
one form because an undelivered order can't have been received.

**One mistake to avoid:** the `da_giao`, `da_nhan` and `phi_cao` columns are `boolean`. On a
report, `true`/`false` is hard to read and untranslatable. Replace with text:

```sql
case when ngay_giao is not null then 'Da giao' else 'Chua giao' end da_giao
```

It sounds trivial, but that's the difference between a BI filter reading *"da_giao: true"* and
*"Delivery status: Delivered"*. Exercises A.5 and D.2 go into it further.

**The second, heavier mistake:** `phi_cao = phi_ship >= 60000` buries the 60,000 threshold in the
dimension. Change the threshold and **every existing `junk_key` changes meaning**, while old facts point at the old meaning.
A business threshold that changes often shouldn't go into a junk — leave `phi_ship` in the fact and band
it at read time.

</details>

### Exercise A.4 — Four ways to store, four costs

**The task:** compare the rows to store across: four separate dimensions, one junk dimension of real combinations,
one junk dimension of all combinations, and leaving the four columns inline in the fact.

**The answer it must produce:**

```text
┌───────────────────────────────────────┬─────────┐
│                 cach                  │ so_dong │
├───────────────────────────────────────┼─────────┤
│ bon dim rieng                         │       9 │
│ mot junk dim (to hop thuc te)         │       4 │
│ mot junk dim (moi to hop)             │      24 │
│ de thang trong fact (15 dong x 4 cot) │      60 │
└───────────────────────────────────────┴─────────┘
```

<details>
<summary>Solution</summary>

```sql
select 'bon dim rieng' cach, 3+2+2+2 so_dong
union all select 'mot junk dim (to hop thuc te)', (select count(*) from dim_junk_don)
union all select 'mot junk dim (moi to hop)', 24
union all select 'de thang trong fact (15 dong x 4 cot)', 15*4;
```

But **the row count isn't the real reason**. Four separate dimensions cost only 9 rows — cheaper than a junk
with 24. The real reason lies in the **fact table**:

| The approach | Columns in the fact | Joins to filter all 4 flags |
|---|---|---|
| 4 separate dims | 4 foreign keys | **4 joins** |
| 1 junk dim | **1 foreign key** | **1 join** |
| Inline | 4 string columns | 0 joins, but the strings repeat on every row |

With a 500-million-row fact, four `int` foreign keys are **8 GB** in keys alone. One key is
2 GB. And each join is one shuffle.

A junk dimension trades **four tiny dimensions and four joins** for **one tiny table and one
join**. That's the purpose — clearing foreign keys out of the fact, which leads straight to the centipede
problem in group C.

The "inline in the fact" approach (60 cells) isn't wrong for small data, and in practice many lakehouses
choose it because columnar storage plus compression makes the repetition cost near zero. The trade-off: no central place to define
the labels, and every query writes its own `case when`.

</details>

### Exercise A.5 — Where does it break when a new status appears

**The task:** no SQL. The business adds a `da_huy` status. How does a junk dimension built from "real
combinations" break, and how do you fix it?

<details>
<summary>Solution</summary>

The sequence of events, in the order it happens:

1. Order `DH011` arrives with `trang_thai = 'da_huy'`, `da_giao = false`, `phi_cao = false`.
2. The combination `('da_huy', false, false, false)` **isn't in** `dim_junk_don`.
3. The fact-loading job `left join`s to the junk dim → no match → `junk_key = -1`.
4. The report by status shows `Khong xac dinh`, or the order vanishes if somebody used an
   `inner join`.

**No error is thrown.** The cancelled order simply doesn't appear where it should.

The fix, in order of priority:

```sql
-- 1. LOAD THE JUNK DIM BEFORE THE FACT, every run: add new combinations if absent
insert into dim_junk_don
select (select coalesce(max(junk_key),0) from dim_junk_don)
         + row_number() over (order by trang_thai, da_giao, da_nhan, phi_cao),
       s.*
from (select distinct trang_thai, ngay_giao is not null da_giao,
             ngay_nhan is not null da_nhan, phi_ship >= 60000 phi_cao
      from don_hang) s
where not exists (select 1 from dim_junk_don d
                  where d.trang_thai = s.trang_thai and d.da_giao = s.da_giao
                    and d.da_nhan = s.da_nhan and d.phi_cao = s.phi_cao);

-- 2. A BLOCKING TEST: are there any orphan rows
select count(*) so_dong_mo_coi from fct_ban_hang where junk_key = -1;
```

The order in step 1 is mandatory: **the dimension always loads before the fact**. Reverse it and every new
combination becomes `-1` in that run, and the next run doesn't fix it by itself.

Step 2 is what turns a silent bug into a noisy one. A junk dimension without this test will
sooner or later let a new status slip through unnoticed.

This is precisely the shape of
[the case study on adding an eighth status](../case-studies/them-trang-thai-thu-tam.md).

</details>

---

## Group B — Degenerate dimensions

### Exercise B.1 — Prove `don_hang_id` has no attributes

**The task:** prove with SQL that building a `dim_don_hang` from `don_hang_id` would give a table with
**exactly as many rows as** the header table — a 1:1 ratio.

**The answer it must produce:**

```text
┌─────────────┬─────────────────────┬───────────┐
│ so_dong_dim │ so_dong_fact_header │ ty_le_1_1 │
├─────────────┼─────────────────────┼───────────┤
│          10 │                  10 │ true      │
└─────────────┴─────────────────────┴───────────┘
```

<details>
<summary>Solution</summary>

```sql
select count(*) so_dong_dim,
       (select count(*) from don_hang) so_dong_fact_header,
       count(*) = (select count(*) from don_hang) ty_le_1_1
from (select distinct don_hang_id from don_hang);
```

**1:1 is the incriminating evidence.** A dimension is meaningful when it **collapses many fact rows into
few attribute rows** — 500 million sales rows into 10,000 customers. A 1:1 ratio means it
collapses nothing.

Building `dim_don_hang` gives you this table:

```sql
-- dim_don_hang, neu dung dai
don_hang_key | don_hang_id
-------------|------------
           1 | DH001
           2 | DH002
```

One key column pointing at one code column. No attribute to filter, group or describe by. In exchange
for **one join** on every query that needs the order number.

Note the distinction from `don_hang` (the header table): that table **does** have attributes (`trang_thai`,
`phi_ship`, three date columns) but they belong in three different places — a junk dimension,
measures, and role-playing `dim_ngay`. After distributing them all, `don_hang_id` **is left alone**.

That's exactly the definition of a degenerate dimension: a business code that **survives after every
attribute has gone to its proper place**. It stays in the fact, needing no table.

</details>

### Exercise B.2 — Without the degenerate you count wrongly

**The task:** compute the average order value, **with** and **without** `don_hang_id` in the
fact. Point out the wrong one.

**The answer it must produce:**

```text
┌───────────┬────────┬─────────────┬─────────┬────────────────────┐
│ doanh_thu │ so_don │ gio_hang_tb │ so_dong │ neu_khong_co_ma_don│
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
       round(sum(so_luong*don_gia)*1.0/count(*), 0) neu_khong_co_ma_don
from don_hang_chi_tiet;
```

**1,021,500 or 681,000** — 33% apart, and both are an "average value" if you only read
the column name.

Without `don_hang_id` in the fact, `count(distinct don_hang_id)` can't be written, so
the only remaining denominator is `count(*)` = the number of **goods lines**. The answer becomes "the average value
of one goods line", while the question was "of one order".

That's why a degenerate dimension **must live in the fact**, and not as a convenience:

| The question | Requires |
|---|---|
| The average basket | `count(distinct don_hang_id)` |
| Average items per order | `count(*) / count(distinct don_hang_id)` |
| The share of orders with more than 1 item | grouping by `don_hang_id` |
| Tracing back to the source system | `don_hang_id` to look up in OLTP |

All four are **impossible** if the order code leaves the fact. See
[Degenerate dimensions](../skills/degenerate-dimension.md).

</details>

### Exercise B.3 — How many degenerate dimensions does one fact have

**The task:** list every column in `don_hang_chi_tiet` that's a degenerate dimension, and explain
why `dong` is one too.

**The answer it must produce:**

```text
┌─────────────┬─────────────────────────────────┐
│     cot     │            phan_loai            │
├─────────────┼─────────────────────────────────┤
│ don_hang_id │ degenerate (ma don)             │
│ dong        │ degenerate (so thu tu trong don)│
│ ma_hang     │ khoa ngoai -> dim_hang_hoa      │
│ ngay        │ khoa ngoai -> dim_ngay          │
│ so_luong    │ so do                           │
│ don_gia     │ so do                           │
└─────────────┴─────────────────────────────────┘
```

<details>
<summary>Solution</summary>

```sql
select column_name cot,
       case column_name
         when 'don_hang_id' then 'degenerate (ma don)'
         when 'dong'        then 'degenerate (so thu tu trong don)'
         when 'ma_hang'     then 'khoa ngoai -> dim_hang_hoa'
         when 'ngay'        then 'khoa ngoai -> dim_ngay'
         else 'so do' end phan_loai
from information_schema.columns
where table_schema='main' and table_name='don_hang_chi_tiet'
order by ordinal_position;
```

`dong` is degenerate because it satisfies exactly the two conditions: **it's a business code** and **it has no
accompanying attributes**. "Line 2" has no colour, no group, no description — it's just
a sequence number within the order.

And it's genuinely useful: `(don_hang_id, dong)` is the fact's natural key, used for the grain check in
[set 1, exercise A.1](bt-01-nen-tang.md#exercise-a1--declare-the-grain-for-all-seven-tables-and-prove-it)
and for reconciling back to the source system.

A fact having **several** degenerates is normal. A real retail fact typically has: the invoice number, the
line number, the sales-shift number, the card transaction ID, the coupon number. Five code columns, not one
of which deserves a table.

**The quick way to spot them:** a column ending in `_id` / `_no` / `_ma` for which you **can't describe
a second attribute** is a degenerate.

</details>

### Exercise B.4 — When a degenerate **must** become a real dimension

**The task:** no SQL. State three situations where `don_hang_id` should be promoted to a real
dimension.

<details>
<summary>Solution</summary>

**1. When an order has its own attributes with nowhere else to live.** For example: the ordering channel,
a whole-order promotion code, a customer note, a contract type. At that point it isn't
"bare" any more — having attributes makes it a dimension.

A boundary to be careful about: `trang_thai` and `phi_ship` **don't** count, because they have better
homes elsewhere (a junk dimension and measures).

**2. When several facts at several grains all point at the order.** Sales (line grain), delivery
(order grain), payment (transaction grain), returns (return-event grain). Four facts all needing order-level
attributes makes a shared `dim_don_hang` sensible — otherwise those attributes are copied four
times and the four copies will diverge.

**3. When the order needs Type 2.** If the business asks *"what contract type was the order under at
delivery time"*, you need history over time → you need a dimension with validity intervals. A degenerate
can't hold history because it's just a string in the fact.

Conversely, the most common trap is **building a dimension purely to have somewhere to point a foreign key so
the diagram looks tidy**. The result is a table 1:1 with the fact, an extra join on every query, and not one
more question answered — precisely
[the case study on the order dim inflating revenue](../case-studies/dim-don-hang-lam-phong-doanh-thu.md).

**The one-sentence test:** *"Does this dimension table have far fewer rows than the fact table?"* If not,
don't build it.

</details>

---

## Group C — Centipede fact tables

### Exercise C.1 — Build a 19-foreign-key centipede

**The task:** build `fct_con_ret` — a sales fact with **19 columns ending in `_key`**, the kind
people build when "every dimension needs its own key".

**The answer it must produce:**

```text
┌─────────────┬───────────────┬─────────────┐
│ so_cot_tong │ so_khoa_ngoai │ so_cot_khac │
├─────────────┼───────────────┼─────────────┤
│          24 │            19 │           5 │
└─────────────┴───────────────┴─────────────┘
```

**19 foreign keys, 5 other columns.** This fact is almost entirely keys.

<details>
<summary>Solution</summary>

```sql
create or replace table fct_con_ret as
select ct.don_hang_id, ct.dong,
  cast(strftime(h.ngay_dat,'%Y%m%d') as int) ngay_dat_key,
  coalesce(cast(strftime(h.ngay_giao,'%Y%m%d') as int),-1) ngay_giao_key,
  coalesce(cast(strftime(h.ngay_nhan,'%Y%m%d') as int),-1) ngay_nhan_key,
  cast(strftime(h.ngay_dat,'%Y') as int) nam_key,
  cast(quarter(h.ngay_dat) as int) quy_key,
  cast(strftime(h.ngay_dat,'%Y%m') as int) thang_key,
  cast(week(h.ngay_dat) as int) tuan_key,
  cast(dayofweek(h.ngay_dat) as int) thu_key,
  h.khach_id khach_key, k.khu_vuc khu_vuc_key, k.hang hang_khach_key,
  ct.ma_hang ma_hang_key, hh.nhom nhom_key, hn.nhom_id nhom_id_key,
  nd.nv_id nv_key, nv.phong_ban phong_ban_key, nv.cap_bac cap_bac_key,
  h.trang_thai trang_thai_key, (h.ngay_giao is not null) da_giao_key,
  ct.so_luong, ct.don_gia, ct.so_luong*ct.don_gia tien_hang
from don_hang_chi_tiet ct join don_hang h using (don_hang_id)
join khach_hang k using (khach_id) join hang_hoa hh using (ma_hang)
join hang_hoa_nhom hn using (ma_hang)
left join (select don_hang_id, min(nv_id) nv_id from nhan_vien_don group by 1) nd using (don_hang_id)
left join nhan_vien nv on nv.nv_id = nd.nv_id;

select count(*) so_cot_tong,
       count(*) filter (where column_name like '%_key') so_khoa_ngoai,
       count(*) filter (where column_name not like '%_key') so_cot_khac
from information_schema.columns where table_name='fct_con_ret';
```

Every column **had its own plausible reason** when it was added — that's exactly how a centipede
grows legs. Nobody sits down to design a 19-key fact; it grows, one column per sprint, and
each column is justified with "the report needs to filter by quarter".

Note the `left join` for the employee with `min(nv_id)`: the `nhan_vien_don` table is many-to-many
so it has to be forced to one row, and **that forcing has already lost data** — keeping only the employee with the
smallest code. That's a centipede's side symptom: trying to cram a many-to-many relationship into one foreign
key.

</details>

### Exercise C.2 — The 19 keys are really 5 dimensions

**The task:** group the 19 keys into the real dimensions they belong to.

**The answer it must produce:**

```text
┌───────────────┬──────────────┬────────────────────────────────────────────────────────────┐
│   dimension   │ khoa_bi_tach │                          cac_khoa                          │
├───────────────┼──────────────┼────────────────────────────────────────────────────────────┤
│ dim_ngay      │            8 │ ngay_dat, ngay_giao, ngay_nhan, nam, quy, thang, tuan, thu │
│ dim_khach     │            3 │ khach, khu_vuc, hang_khach                                 │
│ dim_hang_hoa  │            3 │ ma_hang, nhom, nhom_id                                     │
│ dim_nhan_vien │            3 │ nv, phong_ban, cap_bac                                     │
│ junk_don      │            2 │ trang_thai, da_giao                                        │
│ TONG          │           19 │ 19 khoa ngoai -> 5 dimension that                          │
└───────────────┴──────────────┴────────────────────────────────────────────────────────────┘
```

**19 → 5.** And of those 5, only 3 are independent roles of `dim_ngay`.

<details>
<summary>Solution</summary>

```sql
select 'dim_ngay' dimension, 8 khoa_bi_tach,
       'ngay_dat, ngay_giao, ngay_nhan, nam, quy, thang, tuan, thu' cac_khoa
union all select 'dim_khach', 3, 'khach, khu_vuc, hang_khach'
union all select 'dim_hang_hoa', 3, 'ma_hang, nhom, nhom_id'
union all select 'dim_nhan_vien', 3, 'nv, phong_ban, cap_bac'
union all select 'junk_don', 2, 'trang_thai, da_giao'
union all select 'TONG', 19, '19 khoa ngoai -> 5 dimension that';
```

Three kinds of "surplus leg", each arising from a different misunderstanding:

**Kind 1 — an attribute promoted to a key.** `nam_key`, `quy_key`, `thang_key`,
`tuan_key`, `thu_key` are all **columns of `dim_ngay`**, not dimensions. With
`ngay_dat_key` you can reach all five via one join. This is the most common kind, and
5 of the 19 legs.

**Kind 2 — a dimension attribute pulled up into the fact.** `khu_vuc_key` and `hang_khach_key` are
columns of `dim_khach`; `nhom_key` and `nhom_id_key` are columns of `dim_hang_hoa`;
`phong_ban_key` and `cap_bac_key` are columns of `dim_nhan_vien`. Six more legs.

This kind is worse than kind 1 because it **breaks Type 2**: which region is `khu_vuc_key` in the fact
— the one at order time or the current one? Nobody can answer, because it was copied at load time without recording
which version.

**Kind 3 — genuine roles.** `ngay_dat`, `ngay_giao` and `ngay_nhan` are **legitimate role-playing** —
three keys pointing at `dim_ngay` with three different meanings. Keep them.

After the clean-up, the fact has **6 foreign keys**: three date roles, customer, item, employee, plus
`junk_key`. From 19 down to 7.

</details>

### Exercise C.3 — Dismantle the centipede, check the numbers don't change

**The task:** build `fct_sach` with only 7 foreign keys, then prove it answers the **same** question
the centipede answers — revenue by quarter and department.

**The answer it must produce:**

```text
┌───────┬────────────┬───────────┐
│  quy  │ phong_ban  │ doanh_thu │
├───────┼────────────┼───────────┤
│     3 │ Kinh doanh │   7515000 │
│     3 │ Ho tro     │   2700000 │
└───────┴────────────┴───────────┘
```

The two rows total **10,215,000**. Note that this figure is only correct because every order has an employee;
any row where `nv_key` is `NULL` drops out of the `inner join`.

<details>
<summary>Solution</summary>

```sql
-- a clean fact: 7 foreign keys instead of 19
create or replace table fct_sach as
select ct.don_hang_id, ct.dong,
  cast(strftime(h.ngay_dat,'%Y%m%d') as int) ngay_dat_key,
  coalesce(cast(strftime(h.ngay_giao,'%Y%m%d') as int),-1) ngay_giao_key,
  coalesce(cast(strftime(h.ngay_nhan,'%Y%m%d') as int),-1) ngay_nhan_key,
  h.khach_id khach_key, ct.ma_hang ma_hang_key, nd.nv_id nv_key,
  j.junk_key,
  ct.so_luong, ct.don_gia, ct.so_luong*ct.don_gia tien_hang
from don_hang_chi_tiet ct join don_hang h using (don_hang_id)
left join (select don_hang_id, min(nv_id) nv_id from nhan_vien_don group by 1) nd using (don_hang_id)
left join dim_junk_don j on j.trang_thai = h.trang_thai
                        and j.da_giao = (h.ngay_giao is not null)
                        and j.da_nhan = (h.ngay_nhan is not null)
                        and j.phi_cao = (h.phi_ship >= 60000);

-- the old question, answered by a join instead of a pre-stored column
select d.quy, nv.phong_ban, sum(f.tien_hang) doanh_thu
from fct_sach f
join (select ngay_key, quarter(ngay) quy from dim_ngay) d on d.ngay_key = f.ngay_dat_key
join nhan_vien nv on nv.nv_id = f.nv_key
group by 1,2 order by 3 desc;
```

The same answer, with **7 keys instead of 19**. What's lost is two joins; what's gained:

| | The centipede (19 keys) | Clean (7 keys) |
|---|---|---|
| Width per row | ~19 keys | ~7 keys |
| Changing the "fiscal quarter" definition | change **the whole fact** | change **1 row of `dim_ngay`** |
| Is `khu_vuc` as-was or as-is | **undetermined** | decided by `khach_key`, unambiguously |
| Adding a new customer attribute | add a column to the fact | add a column to the dim, the fact untouched |

The second row is the most valuable. A fiscal year starting in April rather than January is
very common; with the centipede, `quy_key` is already hardcoded into 500 million rows. See
[the case study on divergent fiscal-quarter reports](../case-studies/bao-cao-quy-tai-chinh-lech.md).

</details>

### Exercise C.4 — What threshold counts as too many

**The task:** no SQL. How many foreign keys make a fact a centipede?

<details>
<summary>Solution</summary>

**There's no count-based threshold.** A 25-key fact can still be clean if those 25 dimensions really are
independent; an 8-key fact is still a centipede if 5 of them are attributes of the same
dimension.

The right test is to ask **one** question of each key:

> *Can this key be derived from another key in the same fact?*

Derivable → it's an **attribute**, not a dimension. Throw it out.

```text
thang_key   suy ra tu ngay_dat_key   →  VUT
khu_vuc_key suy ra tu khach_key      →  VUT
ngay_giao   KHONG suy ra tu ngay_dat →  GIU (vai doc lap)
```

Three signs of early detection, before you even count:

1. **Several keys sharing a prefix** (`ngay_*`, `khach_*`, `sp_*`) — except genuine role-playing.
2. **A key that's an aggregate level of another key** (`nam`, `quy`, `thang` beside `ngay`).
3. **Adding a column to the fact every time there's a new filtering request** — the most telling sign, and the
   root cause.

Sign 3 matters more than the other two: a centipede is a **symptom of process**, not
of design. A team that adds a column rather than adding an attribute to a dimension will grow legs on its fact
steadily, however well the original designer worked.

See [Centipede fact tables](../skills/centipede-fact.md) and
[the case study on a fact with twenty foreign keys](../case-studies/fact-hai-chuc-khoa-ngoai.md).

</details>

---

## Group D — Designing dimension attributes

### Exercise D.1 — Cryptic codes into readable text

**The task:** for `don_hang.trang_thai`, produce two extra columns: a full description and a higher-level
reporting group.

**The answer it must produce:**

```text
┌────────────┬────────┬──────────────────────┬──────────────┐
│ trang_thai │ so_don │        mo_ta         │ nhom_bao_cao │
├────────────┼────────┼──────────────────────┼──────────────┤
│ hoan_thanh │      6 │ Da giao thanh cong   │ Da chot      │
│ dang_giao  │      2 │ Dang van chuyen      │ Chua chot    │
│ moi        │      2 │ Moi tao - chua xu ly │ Chua chot    │
└────────────┴────────┴──────────────────────┴──────────────┘
```

<details>
<summary>Solution</summary>

```sql
select trang_thai, count(*) so_don,
       case trang_thai when 'moi' then 'Moi tao - chua xu ly'
                       when 'dang_giao' then 'Dang van chuyen'
                       when 'hoan_thanh' then 'Da giao thanh cong' end mo_ta,
       case when trang_thai='hoan_thanh' then 'Da chot' else 'Chua chot' end nhom_bao_cao
from don_hang group by 1 order by 2 desc;
```

The two added columns solve two different problems:

**`mo_ta`** so the reader doesn't have to guess. `dang_giao` and `moi` can still be inferred; but real
data is full of codes like `ST_03`, `PND`, `X`. The code's author knows, the report's reader doesn't,
and they will guess wrong.

**`nhom_bao_cao`** is a *rollup* — several codes gathered into one group. This is what lets the board
see "closed / not closed" without needing to know there are three statuses.

**The crux: both columns must live in the `dim`, not in the query.** Writing
`case when` inside each report means each report groups differently, and six months later there are four definitions
of "closed". In the dimension there's only one, changed in one place.

That's why a dimension should be **wide and rich in descriptive columns**. A 50-column dimension is normal
and good; it's still small because it has few rows.

</details>

### Exercise D.2 — Flags must be text, not `true`/`false`

**The task:** compare two representations of the same flag, then group revenue by it.

**The answer it must produce:**

```text
┌──────────────┬────────────────────┬────────┬───────────┐
│ dang_boolean │    dang_chu        │ so_don │ doanh_thu │
├──────────────┼────────────────────┼────────┼───────────┤
│ true         │ Da giao            │      8 │   8445000 │
│ false        │ Chua giao          │      2 │   1770000 │
└──────────────┴────────────────────┴────────┴───────────┘
```

<details>
<summary>Solution</summary>

```sql
with t as (
  select h.don_hang_id, h.ngay_giao is not null dang_boolean,
         case when h.ngay_giao is not null then 'Da giao' else 'Chua giao' end dang_chu,
         sum(ct.so_luong*ct.don_gia) tien
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1,2,3)
select dang_boolean, dang_chu, count(*) so_don, sum(tien) doanh_thu
from t group by 1,2 order by 1 desc;
```

Three reasons for text, in order of seriousness:

**1. The BI filter shows exactly what the user needs to pick.** A `true`/`false` list forces the
user to remember what `true` means for **each** column. With 10 flag columns in one dimension, that's
10 conventions to remember.

**2. Inverting a column's meaning is a silent bug.** Renaming `da_giao` to `chua_giao` while forgetting to invert the values makes
every report 100% wrong and **nothing changes on screen** — still `true`/`false`.
With text, `'Da giao'` on the wrong row is visible immediately.

**3. Three states, not two.** A `boolean` has no room for "undetermined".
Does `ngay_giao is null` mean *not yet delivered*, or *delivered but not yet recorded*? With text you
just add `'Khong ro'`; with a `boolean` you have to allow `NULL`, and `NULL` drags in
the whole of group E's problems.

The pragmatic convention: name a flag column after the **question**, and make the values the **answers**:

```text
trang_thai_giao_hang : 'Da giao' | 'Chua giao' | 'Khong ro'
```

</details>

### Exercise D.3 — Several hierarchies in one dimension

**The task:** `dim_hang_hoa` needs **two** parallel hierarchies: the product-group tree
(`cay_nhom_hang`) and a price tree (`Cao cap` / `Pho thong`). Build a dimension with both and
compute revenue by each tree.

**The answer it must produce:**

```text
┌─────────┬──────────────────┬───────────────────┬───────────┬───────────┐
│ ma_hang │     ten_hang     │   nhom_san_pham   │ phan_khuc │ doanh_thu │
├─────────┼──────────────────┼───────────────────┼───────────┼───────────┤
│ SP-A    │ Bàn phím cơ      │ Thiet bi nhap     │ Pho thong │   3300000 │
│ SP-B    │ Màn hình 24 inch │ Man hinh          │ Pho thong │   3000000 │
│ SP-C    │ Laptop 14 inch   │ Laptop van phong  │ Cao cap   │   3600000 │
│ SP-D    │ Chuột không dây  │ Thiet bi ngoai vi │ Pho thong │    315000 │
└─────────┴──────────────────┴───────────────────┴───────────┴───────────┘
```

The total = **10,215,000**.

<details>
<summary>Solution</summary>

```sql
select hh.ma_hang, hh.ten_hang, cn.ten_nhom nhom_san_pham,
       case when max(ct.don_gia) >= 500000 then 'Cao cap' else 'Pho thong' end phan_khuc,
       sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang_chi_tiet ct
join hang_hoa hh using (ma_hang)
join hang_hoa_nhom hn using (ma_hang)
join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id
group by 1,2,3 order by 1;
```

The two trees **coexist in one dimension** without conflict, because they're two independent ways of grouping
the same set of items:

```text
Cay san pham : Cong nghe > May tinh > Laptop > Laptop van phong
Cay phan khuc: Cao cap | Pho thong
```

This is where many people go wrong: seeing two trees, they split into two dimensions. Splitting is **wrong**, because
both describe *the item* — their grains are identical. Two dimensions at the same grain are
two tables to keep in sync with no benefit.

A real dimension typically has 3–5 parallel trees: product group, price segment, supplier,
lifecycle (new/selling/discontinued), marketing group. Each tree is a few columns, all in one table.

**What to be careful about:** the `500000` threshold in the `case when` is a business threshold buried
in code. If it changes often it must be a **lookup table**, not a constant — the same reason
as the `phi_cao` threshold in exercise A.3.

</details>

### Exercise D.4 — An empty attribute: `Khong xac dinh`, not `NULL`

**The task:** count items by group, using a `left join` to keep items not yet assigned a
group, and replace `NULL` with text.

**The answer it must produce:**

```text
┌───────────────────┬─────────┐
│       nhom        │ so_hang │
├───────────────────┼─────────┤
│ Laptop van phong  │       1 │
│ Man hinh          │       1 │
│ Thiet bi ngoai vi │       1 │
│ Thiet bi nhap     │       1 │
└───────────────────┴─────────┘
```

<details>
<summary>Solution</summary>

```sql
select coalesce(cn.ten_nhom, 'Khong xac dinh') nhom, count(*) so_hang
from hang_hoa hh
left join hang_hoa_nhom hn using (ma_hang)
left join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id
group by 1 order by 2 desc, 1;
```

In this data all 4 items have a group so `Khong xac dinh` doesn't appear. Remove one
row from `hang_hoa_nhom` and it shows up immediately — and **that's the thing being proved**:
an item without a group is still counted.

The rule for every dimension attribute: **never leave `NULL`**. Replace it with text, and choose
the text by the **reason** for the emptiness:

| The replacement text | Meaning |
|---|---|
| `Khong xac dinh` | there is a value but we don't know it |
| `Khong ap dung` | this attribute has no meaning for this row |
| `Chua gan` | awaiting the business to fill it in |

Distinguishing these three matters because they're handled differently: `Chua gan` is work to be
done, `Khong ap dung` isn't.

Why not leave `NULL`: it disappears from BI filters, breaks `group by` in some tools,
and drags in the whole of group E's three-valued logic. In a **fact**, `NULL` in a measure can be
acceptable — that distinction is exercise E.1's content.

</details>

### Exercise D.5 — Drill down without changing the query

**The task:** write **one** statement returning revenue at **all three** levels — overall, by group,
by item — using `grouping sets`.

**The answer it must produce:**

```text
┌───────────────────┬─────────┬───────────┬──────────┐
│       nhom        │ ma_hang │ doanh_thu │   muc    │
├───────────────────┼─────────┼───────────┼──────────┤
│ Laptop van phong  │ SP-C    │   3600000 │ mat hang │
│ Man hinh          │ SP-B    │   3000000 │ mat hang │
│ Thiet bi ngoai vi │ SP-D    │    315000 │ mat hang │
│ Thiet bi nhap     │ SP-A    │   3300000 │ mat hang │
│ Laptop van phong  │ NULL    │   3600000 │ nhom     │
│ Man hinh          │ NULL    │   3000000 │ nhom     │
│ Thiet bi ngoai vi │ NULL    │    315000 │ nhom     │
│ Thiet bi nhap     │ NULL    │   3300000 │ nhom     │
│ NULL              │ NULL    │  10215000 │ tong     │
└───────────────────┴─────────┴───────────┴──────────┘
```

<details>
<summary>Solution</summary>

```sql
select cn.ten_nhom nhom, ct.ma_hang, sum(ct.so_luong*ct.don_gia) doanh_thu,
       case when grouping(cn.ten_nhom)=1 then 'tong'
            when grouping(ct.ma_hang)=1 then 'nhom'
            else 'mat hang' end muc
from don_hang_chi_tiet ct
join hang_hoa_nhom hn using (ma_hang)
join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id
group by grouping sets ((), (cn.ten_nhom), (cn.ten_nhom, ct.ma_hang))
order by muc, nhom;
```

The `tong` row = **10,215,000**, and the four `nhom` rows total exactly that too. This is a free
check: if the three levels don't add up, the hierarchy has an item assigned to two groups,
or an item with no group.

`grouping sets` lets **one** query serve all three levels instead of three queries or three
summary tables. For BI, that's the data for a chart you can click to drill into without
calling the backend again.

`grouping(col)` returns 1 when that column is **rolled up** on this row — that's the only way to distinguish
"NULL because we're aggregating" from "NULL because the data is empty". Without the `muc` column, those two kinds of `NULL`
blend together and the reader can't tell them apart.

See [Designing dimension attributes](../skills/dimension-attribute-design.md) and
[Hierarchies](../skills/hierarchy.md) — practised in depth in [set 4](bt-04-quan-he-va-cay.md).

</details>

---

## Group E — NULLs in facts and dimensions

### Exercise E.1 — One column, five counts, five results

**The task:** with `giao_dich_tai_chinh.phi_giao_dich` (9 of 12 rows are `NULL`), compute: the row
count, the count with values, the total, the average per SQL, and the average treating `NULL` as 0.

**The answer it must produce:**

```text
┌─────────┬────────────┬────────┬────────────┬──────────────────┐
│ so_dong │ co_gia_tri │  tong  │ tb_bo_null │ tb_coi_null_la_0 │
├─────────┼────────────┼────────┼────────────┼──────────────────┤
│      12 │          3 │  77000 │    25666.7 │           6416.7 │
└─────────┴────────────┴────────┴────────────┴──────────────────┘
```

**25,666.7 or 6,416.7?** A factor of **4**, and both are called "the average transaction
fee".

<details>
<summary>Solution</summary>

```sql
select count(*) so_dong, count(phi_giao_dich) co_gia_tri, sum(phi_giao_dich) tong,
       round(avg(phi_giao_dich),1) tb_bo_null,
       round(sum(phi_giao_dich)*1.0/count(*),1) tb_coi_null_la_0
from giao_dich_tai_chinh;
```

Two SQL details to know by heart:

**`count(*)` counts rows, `count(col)` counts non-`NULL` values.** 12 against 3. This is the most
common source of a wrong denominator in any report.

**`avg()` skips `NULL` in both numerator and denominator.** `avg` = 77,000/3, not 77,000/12. SQL
doesn't ask whether you wanted that.

Which number is right depends on what `NULL` **means**:

| If `NULL` means | The right number | Because |
|---|---|---|
| "This transaction **has no** fee" | 6,416.7 | no fee = a fee of 0 |
| "The fee is **unknown**" | 25,666.7 | you must not invent 0 for the unknown |

In this table, `nap_tien` and `gui_tiet_kiem` **genuinely have no** fee — so 6,416.7 is the right
figure for "average fee per transaction", while 25,666.7 is right for "average fee per
**fee-bearing** transaction".

**The rule for facts:** a measure where `NULL` means "none" should be **set to 0 at load time**. Leaving
`NULL` forces every reader to guess, and they'll guess differently.

Keep `NULL` only when it genuinely means "unknown" — and then it must be stated in the table's
documentation.

</details>

### Exercise E.2 — A filter silently swallowing 9 rows

**The task:** count the rows satisfying `phi_giao_dich <> 22000`, those satisfying `= 22000`, and those that are `NULL`.
Prove the three **don't** add up to the total.

**The answer it must produce:**

```text
┌────────┬────────────┬────────────┬─────────┐
│ tat_ca │ khac_22000 │ bang_22000 │ la_null │
├────────┼────────────┼────────────┼─────────┤
│     12 │          2 │          1 │       9 │
└────────┴────────────┴────────────┴─────────┘
```

**2 + 1 = 3, not 12.** Nine rows belong to no group.

<details>
<summary>Solution</summary>

```sql
select (select count(*) from giao_dich_tai_chinh) tat_ca,
       (select count(*) from giao_dich_tai_chinh where phi_giao_dich <> 22000) khac_22000,
       (select count(*) from giao_dich_tai_chinh where phi_giao_dich = 22000) bang_22000,
       (select count(*) from giao_dich_tai_chinh where phi_giao_dich is null) la_null;
```

`NULL <> 22000` returns neither `TRUE` nor `FALSE` — it returns **`UNKNOWN`**. And
`WHERE` keeps a row only when the condition is `TRUE`. So the 9 `NULL` rows **are excluded from both
branches**.

Ordinary intuition says "not 22000" is the complement of "equals 22000". SQL says no:

```text
bang_22000  ∪  khac_22000  ≠  tat_ca
3           ≠  12
```

This is the most dangerous form because it's **silent and plausible**. A "transactions with unusual fees" report
filtering `<> 22000` returns 2 rows, and nobody questions the number 2.

Written correctly, three ways:

```sql
where phi_giao_dich is distinct from 22000        -- 11 dong, coi NULL la khac
where coalesce(phi_giao_dich, -1) <> 22000        -- 11 dong, ro y do
where phi_giao_dich <> 22000 or phi_giao_dich is null  -- 11 dong, dai nhung ro nhat
```

All three give **11**, and 11 + 1 = 12. Closed.

See [the case study on filtering "not cancelled" losing a quarter](../case-studies/loc-khac-huy-mat-mot-phan-tu.md).

</details>

### Exercise E.3 — `NOT IN` returning 0 rows

**The task:** count the orders with **no** financial transaction, three ways: `not in`,
`not in` with `NULL` filtered out, and `not exists`.

**The answer it must produce:**

```text
┌────────────────┬───────────────┬─────────────────┐
│ not_in_co_null │ not_in_da_loc │ dung_not_exists │
├────────────────┼───────────────┼─────────────────┤
│              0 │             7 │               7 │
└────────────────┴───────────────┴─────────────────┘
```

**`NOT IN` returns 0 when the right answer is 7.** Not a distortion — completely wrong.

<details>
<summary>Solution</summary>

```sql
select
  (select count(*) from don_hang
    where don_hang_id not in (select don_hang_id from giao_dich_tai_chinh)) not_in_co_null,
  (select count(*) from don_hang
    where don_hang_id not in (select don_hang_id from giao_dich_tai_chinh
                              where don_hang_id is not null)) not_in_da_loc,
  (select count(*) from don_hang h
    where not exists (select 1 from giao_dich_tai_chinh g
                      where g.don_hang_id = h.don_hang_id)) dung_not_exists;
```

`giao_dich_tai_chinh` has 9 rows with a `NULL` `don_hang_id` (deposits, withdrawals and savings
deposits tied to no order). `NOT IN` against a set containing `NULL` **always** returns empty, because:

```text
'DH001' not in ('DH002', NULL, ...)
  = 'DH001' <> 'DH002'  AND  'DH001' <> NULL  AND ...
  = TRUE                AND  UNKNOWN          AND ...
  = UNKNOWN                                     ← khong bao gio TRUE
```

Just **one** `NULL` in the subquery is enough to kill the entire result. And 9 `NULL`s or 1 `NULL`
have identical consequences.

The frightening part: the query runs in 5ms, raises nothing, and returns `0`. And `0` is a
**perfectly plausible** answer to "how many orders are unpaid" — so nobody checks
it.

**The pragmatic rule: don't use `NOT IN` with a subquery. Use `NOT EXISTS`.**

`NOT EXISTS` handles `NULL` correctly because it asks "is there a matching row", and `NULL = 'DH001'`
doesn't match. `LEFT JOIN ... WHERE ... IS NULL` is also correct and usually faster on a distributed
engine.

</details>

### Exercise E.4 — `NULL` can't join with `NULL`

**The task:** self-join `don_hang` on `ngay_giao` with `=` and with `is not distinct from`. Compare
the row counts.

**The answer it must produce:**

```text
┌───────────┬──────────────────────┐
│ join_bang │ join_is_not_distinct │
├───────────┼──────────────────────┤
│        10 │                   14 │
└───────────┴──────────────────────┘
```

<details>
<summary>Solution</summary>

```sql
select (select count(*) from don_hang a join don_hang b
          on a.ngay_giao = b.ngay_giao) join_bang,
       (select count(*) from don_hang a join don_hang b
          on a.ngay_giao is not distinct from b.ngay_giao) join_is_not_distinct;
```

`=` drops the 2 undelivered orders entirely (`DH006`, `DH009`); `is not distinct from` treats
`NULL = NULL` as a match so those 2 orders match each other **and themselves** → 2 × 2 = 4 extra
rows.

Two opposite conclusions, and either can be what you want:

| The operator | Does `NULL` match `NULL`? | Use when |
|---|---|---|
| `=` | No | joining a foreign key — **the right default** |
| `is not distinct from` | Yes | comparing versions, detecting changes |

In data loading you need both, in two different places:

```sql
-- JOINING a foreign key: use '=' (NULL shouldn't match anything)
left join dim_khach d on d.khach_id = f.khach_id

-- COMPARING changed/unchanged: use 'is distinct from' (practised in set 2, SCD)
case when lag(khu_vuc) over w is distinct from khu_vuc then 1 else 0 end
```

Using `<>` on the second line **misses every change involving `NULL`** — a column going from empty
to populated won't create a new Type 2 version. This is exactly the trap of
[set 1, exercise C.2](bt-01-nen-tang.md#exercise-c2--build-a-type-2-dimension-from-daily-extracts).

</details>

### Exercise E.5 — Where `NULL` is allowed and where it's forbidden

**The task:** no SQL. Build a table: where is `NULL` allowed in a dimensional model.

<details>
<summary>Solution</summary>

| The position | Is `NULL` allowed? | Replace with | Why |
|---|---|---|---|
| **A foreign key in a fact** | **Absolutely forbidden** | key `-1` | the join loses rows, `count` drops, you can't filter |
| **A fact measure — "none"** | Not advisable | `0` | `avg`/`sum` give two different results (exercise E.1) |
| **A fact measure — "unknown"** | **Allowed** | keep `NULL` | `0` is inventing a number; `avg` skipping it is the right behaviour |
| **A dimension attribute** | Not advisable | `'Khong xac dinh'` | it disappears from BI filters (exercise D.4) |
| **A dimension's primary key** | **Absolutely forbidden** | — | it isn't a key any more |
| **A Type 2's `hieu_luc_den`** | Not advisable | `9999-12-31` | `between` can't catch `NULL` |

The second and third rows look contradictory but aren't — they distinguish by **meaning**,
and that's the whole problem: SQL's `NULL` lumps *"none"*, *"unknown"* and
*"not applicable"* into one symbol. A dimensional model separates them by **agreeing a
convention up front, recording it, and enforcing it with tests**.

Three tests worth having on every fact table:

```sql
-- 1. no foreign key is NULL
select count(*) from fct_ban_hang where khach_key is null or ngay_dat_key is null;

-- 2. no foreign key is orphaned (pointing at a non-existent row)
select count(*) from fct_ban_hang f
left join dim_khach_t2 d on d.khach_key = f.khach_key where d.khach_key is null;

-- 3. the -1 rate doesn't exceed the threshold
select round(100.0*count(*) filter (where khach_key = -1)/count(*),2) ty_le_mo_coi
from fct_ban_hang;
```

Test 3 is the most important and the most often skipped: `-1` is indeed a legitimate home, but a **rising** `-1`
rate is a sign the dimension pipeline is breaking. Not measuring means not knowing.

See [NULLs in facts and dimensions](../skills/null-handling.md).

</details>

---

## Quick reconciliation table

| The number | What it means | Exercise |
|---|---|---|
| 4 / 24 | real versus theoretical flag combinations | A.2 |
| 9 / 4 / 24 / 60 | four ways to store flags, four costs | A.4 |
| 10 = 10, a 1:1 ratio | proof that `don_hang_id` is degenerate | B.1 |
| 1,021,500 vs 681,000 | losing the degenerate makes the denominator 33% wrong | B.2 |
| 19 → 5 dimensions | the centipede: 19 keys belonging to 5 real dimensions | C.2 |
| 25,666.7 vs 6,416.7 | `avg` skipping `NULL` versus treating `NULL` as 0 | E.1 |
| 2 + 1 ≠ 12 | a `<>` filter swallowing 9 `NULL` rows | E.2 |
| **0 instead of 7** | `NOT IN` meeting `NULL` returns empty | E.3 |
| 10 vs 14 | `=` versus `is not distinct from` | E.4 |

## Related Topics

- [Exercise set 2 — Dimensions over time](bt-02-dimension-thoi-gian.md) — the previous set
- [Exercise set 4 — Relationships and trees](bt-04-quan-he-va-cay.md) — the next set
- [The seed appendix](bt-00-seed.md) — `giao_dich_tai_chinh` and its `NULL` forest
- [Skills — Data Modeling](../skills/index.md) — the theory behind the five techniques above
