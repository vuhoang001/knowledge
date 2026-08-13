---
title: "Exercise set 6 — Integration: conformed dimensions, conformed facts, the bus matrix, multiple currencies"
sidebar_position: 15
description: "18 exercises to write yourself: a group-name join returning 0 rows because of Vietnamese diacritics, drill-across done right, joining two facts losing and inflating at once, and 2 of 7 foreign-currency orders evaporating."
tags: [tutorial, bai-tap, conformed-dimension, conformed-facts, bus-architecture, multi-currency-uom, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Exercise set 6 — Integration

> **Takeaway:** the five earlier sets build **one** model correctly. This set asks a harder question — **can two
> models built separately be joined, and once joined, can the two numbers be compared with each
> other.** Those are two different questions, and the second is the killer.

## Techniques practised in this set

| # | Technique | Source document | Exercises |
|---|---|---|---|
| 1 | Conformed dimensions | [Conformed dimensions](../skills/conformed-dimension.md) | 5 |
| 2 | Conformed facts | [Conformed facts](../skills/conformed-facts.md) | 4 |
| 3 | Bus architecture and the bus matrix | [Bus architecture](../reference/bus-architecture.md) | 4 |
| 4 | Several currencies and units of measure | [Several currencies and units of measure](../skills/multi-currency-uom.md) | 5 |

## Preparation

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

This set uses `hang_hoa` ⟷ `cay_nhom_hang` (**two spellings of the same group name**),
`don_hang` ⟷ `tra_hang` (two facts at different grains), and `don_hang_ngoai_te` ⟷ `ty_gia`
(**one day missing, one currency missing**). See [the seed appendix](bt-00-seed.md).

---

## Group A — Conformed dimensions

### Exercise A.1 — A join returning 0 rows, with no error

**The task:** join `hang_hoa` to `cay_nhom_hang` by group name. Count the result, and count the distinct
groups on each side.

**The answer it must produce:**

```text
┌───────────────┬──────────────────┬─────────────┐
│ join_bang_ten │ so_nhom_hang_hoa │ so_nhom_cay │
├───────────────┼──────────────────┼─────────────┤
│             0 │                3 │           8 │
└───────────────┴──────────────────┴─────────────┘
```

**0 rows.** Both tables have data, the join raises nothing, the result is empty.

<details>
<summary>Solution</summary>

```sql
select (select count(*) from hang_hoa hh
          join cay_nhom_hang cn on cn.ten_nhom = hh.nhom) join_bang_ten,
       (select count(distinct nhom) from hang_hoa) so_nhom_hang_hoa,
       (select count(*) from cay_nhom_hang) so_nhom_cay;
```

This is **the canonical shape of a conformance bug**, and three of its properties make it more
dangerous than anything met so far:

1. **No error is thrown.** Valid SQL, matching types, the join completes.
2. **`0` is a plausible answer.** "No item belongs to a classified group" —
   that's believable.
3. **It only surfaces when somebody reconciles against another source.**

Compared with earlier bugs: inflation makes the total wrong so it has a chance of being caught; lost rows make a `count`
drop. Here **there's nothing to compare against** — unless you go looking.

Exercise A.2 finds the cause.

</details>

### Exercise A.2 — *"Màn hình"* isn't *"Man hinh"*

**The task:** show exactly why the join breaks, by stripping the diacritics and comparing again.

**The answer it must produce:**

```text
┌────────────────┬───────────────┬─────────────────────┐
│ ten_o_hang_hoa │   ten_o_cay   │ khop_sau_khi_bo_dau │
├────────────────┼───────────────┼─────────────────────┤
│ Màn hình       │ Man hinh      │ true                │
│ Máy tính       │ May tinh      │ true                │
│ Thiết bị nhập  │ Thiet bi nhap │ true                │
└────────────────┴───────────────┴─────────────────────┘
```

All three groups match **once the diacritics are stripped**. Two systems, two writing conventions, one entity.

<details>
<summary>Solution</summary>

```sql
select hh.nhom ten_o_hang_hoa, cn.ten_nhom ten_o_cay,
       strip_accents(hh.nhom) = cn.ten_nhom khop_sau_khi_bo_dau
from (select distinct nhom from hang_hoa) hh
left join cay_nhom_hang cn on strip_accents(hh.nhom) = cn.ten_nhom
order by 1;
```

**Don't fix it with `strip_accents` in the join.** That treats the symptom and creates three new
problems:

- You have to remember to use it in **every** query, forever. Forget once and the bug returns.
- No index can be used → every join becomes a full scan.
- It doesn't handle other variants: `"Màn Hình"`, `"MÀN HÌNH"`, `"Man hinh "` (a trailing
  space), `"Màn hình LCD"`.

The right cure is to **conform at the key level, not at the label level**:

```sql
-- 1. the two systems join by CODE, not by NAME
select ... from hang_hoa hh
join hang_hoa_nhom hn using (ma_hang)         -- <- mapping by code
join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id;

-- 2. drop the duplicated label column from hang_hoa
alter table hang_hoa drop column nhom;
```

The `hang_hoa_nhom` table is precisely the **conformed dimension key mapping**, and step 2 matters as
much as step 1: as long as `hang_hoa.nhom` exists, somebody will join by it.

**The rule:** labels are for **reading**, codes are for **joining**. Two systems only conform when they share
**codes**; sharing labels is the illusion of conformance, and it shatters the day somebody fixes a spelling.

See [the case study on two marts that can't be joined](../case-studies/hai-mart-khong-ghep-duoc.md).

</details>

### Exercise A.3 — Tests catching a conformance bug before it spreads

**The task:** write three tests detecting a non-conformed dimension.

<details>
<summary>Solution</summary>

```sql
-- 1. ORPHANS: any code in the mapping table absent from the source dim
select hn.nhom_id from hang_hoa_nhom hn
left join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id
where cn.nhom_id is null;

-- 2. COVERAGE: any item not yet assigned a group
select hh.ma_hang from hang_hoa hh
left join hang_hoa_nhom hn using (ma_hang)
where hn.ma_hang is null;

-- 3. LABEL DRIFT: the same code with different labels across the two sources
select cn.nhom_id, cn.ten_nhom ten_chuan, hh.nhom ten_o_nguon_khac
from cay_nhom_hang cn
join hang_hoa_nhom hn on hn.nhom_id = cn.nhom_id
join hang_hoa hh on hh.ma_hang = hn.ma_hang
where strip_accents(hh.nhom) is distinct from cn.ten_nhom
  and hh.nhom is not null;
```

The three tests catch three different stages of the same illness:

| Test | What it catches | If skipped |
|---|---|---|
| Orphans | a code pointing at a non-existent row | the join loses rows |
| Coverage | an entity not yet mapped | the report is missing a group |
| Label drift | **conformance drifting** | two reports, two labels |

Test 3 is the most important and the most often skipped, because it catches the bug **before** it causes damage.
The codes still match so every join still runs; only the labels start to drift. By the time somebody joins by label
it's too late.

In dbt, all three are a `relationships` test plus singular tests:

```yaml
models:
  - name: hang_hoa_nhom
    columns:
      - name: nhom_id
        tests:
          - relationships:
              to: ref('cay_nhom_hang')
              field: nhom_id
      - name: ma_hang
        tests: [not_null, unique]
```

dbt's `relationships` test is exactly test 1. The other two you write yourself.

</details>

### Exercise A.4 — What conformed means, precisely

**The task:** no SQL. Two marts both have a `dim_khach`. What conditions make them conformed?

<details>
<summary>Solution</summary>

**Conformed doesn't mean "identical".** It means **one is a correct subset of the other, in the
shared part**.

Three conditions, in order of how mandatory they are:

**1. The same key, the same meaning.** `khach_key = 1001` must be **the same customer** in both
marts. This is absolute — without it everything else is meaningless.

**2. Shared attributes must have the same values and the same labels.** If both have `khu_vuc`, the values
must be the same, and so must the spelling (exercise A.2).

**3. Type-specific attributes are allowed.** The marketing mart has `phan_khuc_quang_cao`, the sales
mart doesn't — **still conformed**. That's what a *shrunken dimension* means.

What is **not** a condition:

| The misunderstanding | The reality |
|---|---|
| "They must have the same row count" | a regional mart holds only that region's customers — still conformed |
| "They must have the same column count" | specific attributes are allowed |
| "They must be the same physical table" | copies are fine, as long as they derive from **one source** |
| "They must have the same freshness" | they may differ, but **you must know they differ** |

The last row is the most practical trap: two marts conforming structurally, but one loaded
at 02:00 and the other at 06:00. A report run at 04:00 gives two different numbers, and **nothing
is wrong with the design** — what's wrong is that nobody published the freshness.

The cheapest check: add `nap_luc` to every dimension and **require it to be shown on the report**.

</details>

### Exercise A.5 — Who owns a conformed dimension

**The task:** no SQL. Three teams all need `dim_khach`. Who builds it, who changes it?

<details>
<summary>Solution</summary>

**One team owns it, the others use it.** Nothing else works — and this is an
organisational problem, not a technical one.

Three common models, and each one's outcome:

| The model | How it works | The outcome |
|---|---|---|
| **Each team builds its own** | whoever needs it makes it | 3 divergent `dim_khach` within 6 months |
| **A central team owns it** | one team builds it, the others subscribe | slow, but **genuinely conformed** |
| **Federated with a contract** | one team owns it, with a public schema contract | the best balance |

Model 1 is the default when **nobody decides anything** — and it always wins unless somebody actively
blocks it. That's precisely
[the case study on a customer dim per mart](../case-studies/moi-mart-mot-dim-khach.md).

With model 3, the "contract" must state four things clearly:

```yaml
# contracts/dim_khach.yml
so_huu: team-crm
khoa: khach_key            # KHONG BAO GIO doi nghia
scd: type-2 tren (khu_vuc, hang)
nap: hang ngay 02:00 UTC+7
thuoc_tinh_cam_doi:        # doi thi phai bao truoc 1 sprint
  - khach_key
  - khach_id
  - khu_vuc
```

And the most important thing, usually forgotten: **the owning team must be obliged to respond** when another
team needs an extra attribute. Ownership without service means the other teams build their own copies —
and you're back to model 1, just slower.

</details>

---

## Group B — Conformed facts

### Exercise B.1 — Drill-across: aggregate first, combine after

**The task:** combine `don_hang` (sales) with `tra_hang` (returns) by customer, computing the return
rate. The two facts are at **different grains**.

**The answer it must produce:**

```text
┌──────────┬───────────┬─────────────┬────────────┬───────────┐
│ khach_id │ doanh_thu │ gia_tri_tra │ so_lan_tra │ ty_le_tra │
├──────────┼───────────┼─────────────┼────────────┼───────────┤
│ C1       │   2745000 │      450000 │          2 │      16.4 │
│ C2       │   3720000 │      900000 │          1 │      24.2 │
│ C3       │   2100000 │           0 │          0 │       0.0 │
│ C4       │   1650000 │      150000 │          1 │       9.1 │
└──────────┴───────────┴─────────────┴────────────┴───────────┘
```

The `doanh_thu` column totals **10,215,000**, and `gia_tri_tra` totals **1,500,000**. Both match
the original totals.

<details>
<summary>Solution</summary>

```sql
with ban as (
  select h.khach_id, sum(ct.so_luong*ct.don_gia) doanh_thu,
         count(distinct h.don_hang_id) so_don
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1),
tra as (
  select h.khach_id, sum(t.gia_tri_tra) gia_tri_tra, count(*) so_lan_tra
  from tra_hang t join don_hang h using (don_hang_id) group by 1)
select coalesce(b.khach_id, r.khach_id) khach_id,
       coalesce(b.doanh_thu,0) doanh_thu,
       coalesce(r.gia_tri_tra,0) gia_tri_tra,
       coalesce(r.so_lan_tra,0) so_lan_tra,
       round(100.0 * coalesce(r.gia_tri_tra,0) / nullif(b.doanh_thu,0), 1) ty_le_tra
from ban b full join tra r using (khach_id)
order by 1;
```

This is **drill-across**, and three details decide whether it's right:

**1. Aggregate each fact to the shared grain BEFORE combining.** Both the `ban` and `tra` CTEs aggregate to
the grain *one customer*. Only once both sides share a grain may you combine them.

**2. `full join`, not `inner join`.** `C3` never returned anything. An `inner join`
loses `C3` from the report — and a "return rate by customer" report missing the customers at
0% makes every average wrong.

**3. `nullif(...,0)` in the denominator.** A customer with returns but zero revenue (a gift order) would
cause division by zero. `nullif` turns it into `NULL` instead of an error.

Compare with the wrong way in exercise B.2 to see why these three details aren't trivia.

</details>

### Exercise B.2 — Joining two facts directly: losing and inflating at once

**The task:** join `don_hang_chi_tiet` straight to `tra_hang`, and measure both sides.

**The answer it must produce:**

```text
┌────────────────┬────────────────┬──────────┬────────────────────┐
│ doanh_thu_that │ neu_join_thang │ tra_that │ tra_neu_join_thang │
├────────────────┼────────────────┼──────────┼────────────────────┤
│       10215000 │        6750000 │  1500000 │            3300000 │
└────────────────┴────────────────┴──────────┴────────────────────┘
```

**Revenue LOSES 34%, returned value INFLATES 120% — in the same query.**

<details>
<summary>Solution</summary>

```sql
select (select sum(so_luong*don_gia) from don_hang_chi_tiet) doanh_thu_that,
       (select sum(ct.so_luong*ct.don_gia)
        from don_hang_chi_tiet ct join tra_hang t using (don_hang_id)) neu_join_thang,
       (select sum(gia_tri_tra) from tra_hang) tra_that,
       (select sum(t.gia_tri_tra)
        from don_hang_chi_tiet ct join tra_hang t using (don_hang_id)) tra_neu_join_thang;
```

Two errors in opposite directions, at once:

**34% of revenue lost** — the `inner join` drops the 7 orders with no returns. Only 3 orders (`DH003`,
`DH005`, `DH010`) survive.

**120% inflation in returned value** — `DH003` has **2 returns** and **3 goods lines** → 6 result
rows, so each return is counted 3 times.

This is what makes joining two facts directly more dangerous than any other bug in this series: **the two
errors mask each other**. A reviewer looks at the total, sees "about right" and doesn't suspect anything, because one
error pulls down while the other pushes up.

**The absolute rule: never join two fact tables directly.** Always:

```text
1. Gom moi fact ve grain chung        (bang cac dimension chung)
2. Ghep bang FULL JOIN tren grain do
```

The only exception: two facts at **exactly the same grain** with a 1:1 relationship — but then
they ought to be one table.

See [the case study on joining two facts inflating the total](../case-studies/join-hai-fact-lam-phong-tong.md).

</details>

### Exercise B.3 — Joinable doesn't mean comparable

**The task:** no SQL. Two facts already conform on their dimensions and can be joined. What further conditions make
the two **measures** comparable with each other?

<details>
<summary>Solution</summary>

This is the part the bus matrix does **not** guarantee. Conformed *dimensions* allow **joining**;
conformed *facts* allow **comparing**. Four conditions:

**1. The same business definition.** Does sales' `doanh_thu` include the shipping fee? Does it subtract
discounts? Does `gia_tri_tra` include refunded shipping? Two divergent definitions make the return rate
wrong with **no way to detect it from the data**.

**2. The same unit.** Are both pre-tax VND, or is one post-tax? Group D is entirely about this.

**3. The same handling of edge cases.** Do cancelled orders count towards revenue? How does a return on a
cancelled order count?

**4. The same time anchor.** Sales counts by `ngay_dat`, returns by `ngay_tra` — so July's return
rate includes goods sold in June and returned in July. That may be the intent, but
**it must be a conscious intent**.

The only enforcement that works: **the same name means the same thing, a different meaning means a different name**.

```text
doanh_thu_gop          = tien hang, chua tru gi
doanh_thu_thuan        = tru chiet khau va tra hang
doanh_thu_co_phi_ship  = cong phi ship
```

Three columns, three names, nobody confused. As opposed to all three being called `doanh_thu` in three different
marts — in which case the reconciliation meeting runs for several sessions and nobody is wrong.

See [Conformed facts](../skills/conformed-facts.md) and
[the case study on two departments, two revenue numbers](../case-studies/hai-phong-hai-doanh-thu.md).

</details>

### Exercise B.4 — The closed-loop reconciliation between two facts

**The task:** write a check proving exercise B.1's drill-across neither lost nor inflated any number.

<details>
<summary>Solution</summary>

```sql
with ban as (select h.khach_id, sum(ct.so_luong*ct.don_gia) doanh_thu
             from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1),
     tra as (select h.khach_id, sum(t.gia_tri_tra) gia_tri_tra
             from tra_hang t join don_hang h using (don_hang_id) group by 1),
     ghep as (select coalesce(b.khach_id, r.khach_id) khach_id,
                     coalesce(b.doanh_thu,0) doanh_thu,
                     coalesce(r.gia_tri_tra,0) gia_tri_tra
              from ban b full join tra r using (khach_id))
select sum(doanh_thu) tu_ghep_doanh_thu,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) goc_doanh_thu,
       sum(gia_tri_tra) tu_ghep_tra,
       (select sum(gia_tri_tra) from tra_hang) goc_tra,
       sum(doanh_thu) = (select sum(so_luong*don_gia) from don_hang_chi_tiet)
         and sum(gia_tri_tra) = (select sum(gia_tri_tra) from tra_hang) khep_kin
from ghep;
```

The `khep_kin` column must be `true`. This is **the mandatory check for every drill-across**, and the
reason it's mandatory: exercise B.2 showed the divergence can happen in **both directions at once**, so
checking one direction isn't enough.

Three variants to remember:

| What you check | The bug it catches |
|---|---|
| Each measure's total **after combining** = the original total | inflation or loss from the join |
| The row count after combining = the size of the **union** of the two sides | `inner join` instead of `full join` |
| No `NULL` in the combining key column | a non-conformed key |

In dbt, write it as a test comparing two `ref()`s:

```sql
-- tests/drill_across_khep_kin.sql
select 'doanh_thu' so_do, sum(doanh_thu) tu_ghep,
       (select sum(tien_hang) from {{ ref('fct_ban_hang') }}) goc
from {{ ref('rpt_ban_va_tra') }}
having sum(doanh_thu) <> (select sum(tien_hang) from {{ ref('fct_ban_hang') }})
```

This kind of test must run **on the final report table**, not only on the fact. A correct fact with an
incorrect report is the most frequent situation of all.

</details>

---

## Group C — Bus architecture and the bus matrix

### Exercise C.1 — A bus matrix you can measure with SQL

**The task:** build a bus matrix for six processes × five dimensions, as a `true`/`false` table.

**The answer it must produce:**

```text
┌──────────────┬──────────┬───────────┬──────────┬─────────┬─────────────┐
│  quy_trinh   │ dim_ngay │ dim_khach │ dim_hang │ dim_nv  │ dim_tien_te │
├──────────────┼──────────┼───────────┼──────────┼─────────┼─────────────┤
│ Ban hang     │ true     │ true      │ true     │ true    │ false       │
│ Tra hang     │ true     │ true      │ false    │ false   │ false       │
│ Giao hang    │ true     │ true      │ false    │ false   │ false       │
│ Ton kho      │ true     │ false     │ true     │ false   │ false       │
│ Su kien web  │ true     │ true      │ true     │ false   │ false       │
│ Don ngoai te │ true     │ true      │ false    │ false   │ true        │
└──────────────┴──────────┴───────────┴──────────┴─────────┴─────────────┘
```

<details>
<summary>Solution</summary>

```sql
select 'Ban hang' quy_trinh, true dim_ngay, true dim_khach, true dim_hang,
       true dim_nv, false dim_tien_te
union all select 'Tra hang',     true, true,  false, false, false
union all select 'Giao hang',    true, true,  false, false, false
union all select 'Ton kho',      true, false, true,  false, false
union all select 'Su kien web',  true, true,  true,  false, false
union all select 'Don ngoai te', true, true,  false, false, true;
```

Three things you read off immediately, each of them an architectural decision:

**The `dim_ngay` column is all `true`.** It's the most important conformed dimension — build it once,
share it, and **no mart may have its own copy**. With two `dim_ngay` carrying two definitions
of the fiscal quarter, every quarterly report has to ask "whose quarter".

**`dim_hang` is absent from "Tra hang".** This isn't a design choice — it's a **gap in the source
data**: `tra_hang` only records at order level, never which item was returned. The bus matrix makes
that gap visible **before** somebody asks for "return rate by item".

**`dim_tien_te` has only one `true`.** A dimension used by only one process **doesn't need
conforming yet** — there's nothing to join it with. Investing effort to conform it now is premature.

A bus matrix isn't a decorative diagram. It's a **construction plan**: every `true` cell is a
foreign key that must exist, and every column with many `true`s is a dimension that must conform
first.

</details>

### Exercise C.2 — Reading off which pairs of processes can drill across

**The task:** from the bus matrix, determine which pairs of processes can be combined and along which axes.

**The answer it must produce:**

```text
┌─────────────────────────┬──────────────────────┬────────────────┐
│          cap            │      dim_chung       │ drill_across   │
├─────────────────────────┼──────────────────────┼────────────────┤
│ Ban hang / Tra hang     │ ngay, khach          │ duoc, 2 truc   │
│ Ban hang / Ton kho      │ ngay, hang           │ duoc, 2 truc   │
│ Ban hang / Su kien web  │ ngay, khach, hang    │ duoc, 3 truc   │
│ Tra hang / Ton kho      │ ngay                 │ chi theo ngay  │
│ Ton kho / Don ngoai te  │ ngay                 │ chi theo ngay  │
└─────────────────────────┴──────────────────────┴────────────────┘
```

<details>
<summary>Solution</summary>

Read from the bus matrix: two processes can be combined along the **intersection** of the dimensions they share.

```sql
-- check that "Ban hang / Su kien web" combines along 3 axes
with ban as (select h.khach_id, ct.ma_hang, h.ngay_dat ngay,
                    sum(ct.so_luong*ct.don_gia) doanh_thu
             from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
             group by 1,2,3),
     xem as (select khach_id, ma_hang, cast(thoi_diem as date) ngay, count(*) so_luot_xem
             from su_kien_web where loai_su_kien='xem' group by 1,2,3)
select coalesce(b.khach_id,x.khach_id) khach_id,
       coalesce(b.ma_hang,x.ma_hang) ma_hang,
       coalesce(b.doanh_thu,0) doanh_thu, coalesce(x.so_luot_xem,0) so_luot_xem
from ban b full join xem x using (khach_id, ma_hang, ngay)
order by 3 desc limit 5;
```

Two things matter more than the table above:

**The number of shared axes decides which questions are answerable.** "Ban hang / Su kien web" share 3 axes
so you can ask *"how many times did this customer view this product before buying"*. "Tra hang / Ton
kho" share only `ngay` so you can only ask *"which day had both high returns and high stock"* — far
coarser.

**Sharing `dim_ngay` is the minimum, and it's always there.** So "can these two processes be
combined" is nearly always "yes". The right question is **"at what level of detail can they be combined"**, and the table
above answers exactly that.

And being joinable still isn't being comparable — that's group B.

</details>

### Exercise C.3 — The value chain: the order to build in

**The task:** no SQL. In what order should the six processes be built?

<details>
<summary>Solution</summary>

Arranged by **value chain** — the flow of value through the business:

```text
Ton kho  →  Su kien web  →  Ban hang  →  Giao hang  →  Tra hang
   (co hang)   (khach xem)   (chot don)   (van chuyen)  (hoan)
```

But **don't** build in that order. The build order follows three criteria, in descending priority:

**1. Whichever process has the most dimensions → build it first.** *Ban hang* uses all 4 dimensions.
Building it conforms all 4 at once, and every later process just reuses them. Building *Ton
kho* first conforms only 2, and you still have to conform 2 more afterwards.

**2. Whichever process hurts the business most → prioritise.** A warehouse with no users
dies, however beautiful the design.

**3. Whichever process has the readiest source data → do it early.** *Su kien web* at 43 rows/5 days
is the largest and dirtiest source — leave it for later.

The proposed order: **Ban hang → Tra hang → Giao hang → Ton kho → Su kien web → Don ngoai te**.

What you must **not** do: build all six in parallel with six teams. That's the surest way to get
six different `dim_khach` — and conforming after six versions exist costs many times more than
conforming from the start.

**The bus matrix is precisely the tool for avoiding that**: it lets you build **one process at a
time** while still guaranteeing they can be combined, because each new process may only use dimensions already
conformed, or must conform its own new one.

See [Bus architecture](../reference/bus-architecture.md).

</details>

### Exercise C.4 — A new `true` cell appears

**The task:** no SQL. The business asks for *"return rate by item"* — meaning the
`Tra hang × dim_hang` cell must become `true`. What do you do?

<details>
<summary>Solution</summary>

That cell is `false` because **the source data doesn't have it**, not because the model is lacking. So there's no
way to fix it in SQL. Four options, ordered by honesty:

**1. Fix the source system** — add item detail to the return slip. The most correct, the slowest,
and **with no historical data**. Only from the day of the fix onwards.

**2. Allocate by order proportion** — divide `gia_tri_tra` down to the items in proportion to the goods amount
in the order, exactly the technique of [set 5, exercise A.1](bt-05-fact-nang-cao.md):

```sql
select ct.ma_hang,
       sum(t.gia_tri_tra * ct.so_luong*ct.don_gia
           / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id)) tra_uoc_tinh
from tra_hang t join don_hang_chi_tiet ct using (don_hang_id) group by 1;
```

This number is an **estimate**, and must carry a name that says so: `tra_uoc_tinh`, not
`gia_tri_tra`. If a customer returned exactly the 900,000 laptop in order `DH003`, the allocation still
spreads it evenly across the keyboard too — entirely wrong at item level.

**3. Accept that it's unanswerable**, and say why. This option is undervalued:
"we don't have this data, here's how to get it" is more honest than an estimated number
that nobody remembers is an estimate six months later.

**4. Combine 1 + 3** — answer "not yet, we're fixing the source, it'll be there from next month", and while
waiting, provide the number at order level.

**What's forbidden:** producing the allocated number from option 2 and naming it as if it were real. That's how an
estimated number becomes "the truth" across a whole company, with nobody able to trace its origin.

The bus matrix earns its keep here because it **recorded that cell as `false` from the start** — so when somebody
asks, the answer is ready immediately, with no investigation.

</details>

---

## Group D — Several currencies and units of measure

### Exercise D.1 — Three ways to join the rate table, three order counts

**The task:** count the foreign-currency orders surviving a rate join, two ways: joining on
`(ngay, tien_te)`, and joining by **validity interval with an added `VND` = 1 row**.

**The answer it must produce:**

```text
┌─────────┬──────────────┬────────────────────┐
│ don_goc │ c1_join_bang │ c2_timespan_co_VND │
├─────────┼──────────────┼────────────────────┤
│       7 │            5 │                  7 │
└─────────┴──────────────┴────────────────────┘
```

**5 out of 7 — losing 28.6%.** Two orders lost for two different reasons.

<details>
<summary>Solution</summary>

```sql
with tg as (
  select tien_te, ngay hieu_luc_tu,
         coalesce((lead(ngay) over (partition by tien_te order by ngay) - interval 1 day)::date,
                  date '9999-12-31') hieu_luc_den, ty_gia
  from ty_gia
  union all select 'VND', date '2000-01-01', date '9999-12-31', 1)   -- <- the most important row
select (select count(*) from don_hang_ngoai_te) don_goc,
       (select count(*) from don_hang_ngoai_te d
          join ty_gia t on t.ngay = d.ngay_dat and t.tien_te = d.tien_te) c1_join_bang,
       (select count(*) from don_hang_ngoai_te d
          join tg on tg.tien_te = d.tien_te
                 and d.ngay_dat between tg.hieu_luc_tu and tg.hieu_luc_den) c2_timespan_co_VND;
```

Two orders lost, two causes:

**`DN03` (EUR, 04/07)** — the `ty_gia` table **has no EUR row for 04/07**. Cured with
validity intervals: the 03/07 rate stays in effect through 04/07.

**`DN07` (VND, 1,500,000)** — **the base currency isn't in the rate table**. This is the
classic bug and very easily missed, because it sounds obvious: "why would VND need a rate".

It does, because every order must travel the **same** conversion path. Without a `VND = 1` row you have to
write `case when tien_te='VND' then so_tien else so_tien*ty_gia end` in **every** query,
and somebody will forget.

**The rule:** the rate table must contain **the reporting currency at rate 1**, in effect from before
all data through `9999-12-31`. One row, and it eliminates an entire class of bug.

</details>

### Exercise D.2 — Freeze both the original and the converted amount

**The task:** build a foreign-currency fact holding **all three**: the original amount, the rate used, and the
converted amount.

**The answer it must produce:**

```text
┌──────────────┬─────────┬─────────────┬────────┬─────────────┐
│ don_ngoai_id │ tien_te │ so_tien_goc │ ty_gia │ so_tien_vnd │
├──────────────┼─────────┼─────────────┼────────┼─────────────┤
│ DN01         │ USD     │         400 │  25400 │    10160000 │
│ DN02         │ EUR     │         250 │  27650 │     6912500 │
│ DN03         │ EUR     │         300 │  27700 │     8310000 │
│ DN04         │ USD     │         150 │  25500 │     3825000 │
│ DN05         │ USD     │         220 │  25550 │     5621000 │
│ DN06         │ EUR     │         180 │  27900 │     5022000 │
│ DN07         │ VND     │     1500000 │      1 │     1500000 │
└──────────────┴─────────┴─────────────┴────────┴─────────────┘
```

The converted total = **41,350,500 VND**, all 7 orders present.

<details>
<summary>Solution</summary>

```sql
with tg as (
  select tien_te, ngay hieu_luc_tu,
         coalesce((lead(ngay) over (partition by tien_te order by ngay) - interval 1 day)::date,
                  date '9999-12-31') hieu_luc_den, ty_gia
  from ty_gia
  union all select 'VND', date '2000-01-01', date '9999-12-31', 1)
select d.don_ngoai_id, d.tien_te, d.so_tien so_tien_goc, tg.ty_gia,
       d.so_tien * tg.ty_gia so_tien_vnd
from don_hang_ngoai_te d
join tg on tg.tien_te = d.tien_te and d.ngay_dat between tg.hieu_luc_tu and tg.hieu_luc_den
order by 1;
```

**Three columns, not one.** Each serves a purpose the others can't:

| Column | Used for | Losing it means |
|---|---|---|
| `so_tien_goc` | reconciling with the source system and the customer | you can't reconcile |
| `ty_gia` | **traceability** — why this number came out | you can't explain it |
| `so_tien_vnd` | summing, reporting totals | you must convert at read time |

The `ty_gia` column is the most often dropped and the most needed. Without it, when somebody asks *"why did
this order come out as 8,310,000"*, you have to go back to the rate table — and the rate table may have been
edited (the source resent it, a month-end adjustment). At that point the old number is **not reproducible**.

**The rule: convert at load time, not at read time.** Converting at read time means today's report and
yesterday's report give different numbers because the rate has been updated — exactly
[the case study on revenue moving with the exchange rate](../case-studies/doanh-thu-doi-theo-ty-gia.md).

</details>

### Exercise D.3 — Which rate: at the transaction or at period end

**The task:** compute the converted total **two ways** — at the transaction-date rate, and at the
10/07 rate — then compare.

**The answer it must produce:**

```text
┌─────────┬──────────┬──────────────┬─────────────────────┬────────┐
│ tien_te │ tong_goc │ theo_ngay_gd │ theo_ty_gia_cuoi_ky │ chenh  │
├─────────┼──────────┼──────────────┼─────────────────────┼────────┤
│ EUR     │      730 │     20244500 │            20403500 │ 159000 │
│ USD     │      770 │     19606000 │            19712000 │ 106000 │
│ VND     │  1500000 │      1500000 │             1500000 │      0 │
└─────────┴──────────┴──────────────┴─────────────────────┴────────┘
```

A gap of **265,000 VND** on 41.35 million — 0.64%. Small, but it **isn't an error**.

<details>
<summary>Solution</summary>

```sql
with tg as (
  select tien_te, ngay hieu_luc_tu,
         coalesce((lead(ngay) over (partition by tien_te order by ngay) - interval 1 day)::date,
                  date '9999-12-31') hieu_luc_den, ty_gia
  from ty_gia union all select 'VND', date '2000-01-01', date '9999-12-31', 1),
cuoi_ky as (select tien_te, ty_gia from ty_gia where ngay = date '2026-07-10'
            union all select 'VND', 1)
select d.tien_te, sum(d.so_tien) tong_goc,
       sum(d.so_tien * tg.ty_gia) theo_ngay_gd,
       sum(d.so_tien * ck.ty_gia) theo_ty_gia_cuoi_ky,
       sum(d.so_tien * ck.ty_gia) - sum(d.so_tien * tg.ty_gia) chenh
from don_hang_ngoai_te d
join tg on tg.tien_te = d.tien_te and d.ngay_dat between tg.hieu_luc_tu and tg.hieu_luc_den
join cuoi_ky ck on ck.tien_te = d.tien_te
group by 1 order by 1;
```

Both numbers are right, for two different questions — and **accounting uses both, each with its own name**:

| The method | The name | It answers |
|---|---|---|
| The **transaction-date** rate | *transaction rate* | "at the time of sale, what was this order worth in VND" |
| The **period-end** rate | *closing rate* | "today, what is this balance worth in VND" |
| The difference | **an FX gain/loss** | the impact of exchange-rate movement |

The `chenh` column at 265,000 is **not an error to fix** — it's an **FX gain**, a number with
accounting meaning that must be reported separately.

That's why the fact must keep `so_tien_goc` and `ty_gia` (exercise D.2): with those two columns you can compute
**both** methods at any time. Keeping only `so_tien_vnd` permanently loses the ability to
recompute at another rate.

For long reporting periods there's a third method: **the period average rate**. Three methods, and which to choose is
accounting policy — you must ask, not guess.

</details>

### Exercise D.4 — Units of measure: the same problem in different clothes

**The task:** no SQL required. `so_luong` for `SP-A` (a keyboard) and `SP-C` (a laptop) are both in
"units". But what happens if the source sends one figure in **boxes of 10**?

<details>
<summary>Solution</summary>

```sql
select sum(so_luong) tong_so_luong from don_hang_chi_tiet;   -- 43 "units"?
```

The number 43 only means something if **every row shares a unit**. One row recorded in boxes makes 43
a meaningless number — and **nothing in the data indicates it**.

This is **the same problem as currencies**, only dressed differently:

| | Currencies | Units of measure |
|---|---|---|
| The original figure | `so_tien` + `tien_te` | `so_luong` + `don_vi` |
| The conversion factor | a rate, **changing daily** | a factor, **usually fixed** |
| The normalised figure | `so_tien_vnd` | `so_luong_cai` |
| The trap | a rate missing for one day | **the `don_vi` column missing entirely** |

The unit-of-measure trap is **worse** than the currency trap in one respect: currencies usually have a `tien_te` column so the
bug surfaces at the join; units of measure usually have **no column at all**, because "everyone knows it's units".

The right structure, exactly like exercise D.2:

```sql
create or replace table fct_ban_hang as
select ..., so_luong so_luong_goc, don_vi_goc, he_so_quy_doi,
       so_luong * he_so_quy_doi so_luong_cai
from ...;
```

And for a product sold in several units (by weight, metre, litre), the conversion factor is an **attribute of the
item**, living in `dim_hang_hoa` — not a constant in the code.

**The last and hardest trap:** the conversion factor **can change over time** (a manufacturer changes
the packaging from 10 to 12 per box). At that point it needs validity intervals, exactly like a rate —
and the unit-of-measure problem becomes **precisely** the currency problem, with no difference left.

</details>

### Exercise D.5 — Three tests for every multi-currency fact

**The task:** write three tests protecting a fact that carries conversions.

<details>
<summary>Solution</summary>

```sql
-- 1. NO ROW MISSING A RATE
select don_ngoai_id, tien_te, ngay_dat from fct_ngoai_te where ty_gia is null;

-- 2. THE CONVERSION IS RIGHT: so_tien_vnd must equal so_tien_goc * ty_gia
select don_ngoai_id, so_tien_goc, ty_gia, so_tien_vnd,
       so_tien_goc * ty_gia du_kien
from fct_ngoai_te
where abs(so_tien_vnd - so_tien_goc * ty_gia) > 1;

-- 3. THE RATE IS IN A PLAUSIBLE RANGE: catches unit errors (thousands vs units)
select tien_te, min(ty_gia) nho_nhat, max(ty_gia) lon_nhat,
       round(max(ty_gia)*1.0/min(ty_gia), 2) bien_dong
from fct_ngoai_te group by 1
having max(ty_gia)*1.0/min(ty_gia) > 1.5;
```

Test 3 is the most valuable and the least often written. It catches the kind of bug the other two don't
see: **the source changing units**.

If one day the source sends the USD rate as `25.4` instead of `25400` (switching from VND to thousands of VND),
then:

- Test 1 passes — `ty_gia` isn't `NULL`.
- Test 2 passes — `so_tien_vnd = so_tien_goc * 25.4`, the multiplication matches.
- **Revenue drops 1000×**, and no test blocks it.

Test 3 catches it because the `max/min` spread jumps. The `1.5` threshold is an example — it must be set from each
currency's real volatility, and for a stable currency the threshold should be far tighter
(`1.1`).

The general principle, applicable to any measure with a multiplier: **test the value and the *magnitude*.**
Checking that the formula is right isn't enough — you must check the result falls in the range people
expect. See [Several currencies and units of measure](../skills/multi-currency-uom.md).

</details>

---

## Quick reconciliation table

| The number | What it means | Exercise |
|---|---|---|
| **0 rows** | *"Màn hình"* ≠ *"Man hinh"* — joining by label | A.1, A.2 |
| 16.4 / 24.2 / 0.0 / 9.1 % | drill-across done right: aggregate first, then `full join` | B.1 |
| 6,750,000 (−34%) and 3,300,000 (+120%) | joining two facts directly: losing and inflating at once | B.2 |
| `dim_ngay` all `true` | the most important conformed dimension | C.1 |
| `Tra hang × dim_hang` = `false` | a source-data gap, not a model bug | C.1, C.4 |
| 5 / 7 orders (−28.6%) | one day's rate missing + no `VND` = 1 row | D.1 |
| 41,350,500 VND | the converted total with all 7 orders | D.2 |
| a gap of 265,000 | an **FX gain**, not an error | D.3 |

## Related Topics

- [Exercise set 5 — Advanced facts](bt-05-fact-nang-cao.md) — the previous set
- [Exercise set 7 — Operations](bt-07-van-hanh.md) — the final set
- [The integration lab](lab-tich-hop.md) — the diagnostic version of the same subject
- [Skills — Data Modeling](../skills/index.md) — the theory behind the four techniques above
