---
title: "Exercise set 4 — Relationships and trees: bridges, hierarchies, heterogeneous entities"
sidebar_position: 13
description: "16 exercises to write yourself: a many-to-many bridge inflating 72%, finding the order whose weights total 0.9, a ragged tree cutting off the deep branch, and a supertype table 63.9% empty."
tags: [tutorial, bai-tap, bridge-table, hierarchy, heterogeneous-schema, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Exercise set 4 — Relationships and trees

> **Takeaway:** the three techniques here all handle the same thing a star schema has no room for —
> **relationships that aren't many-to-one**. Many-to-many, unevenly deep, and types sharing no
> attributes. Cramming them into a star inflates numbers or loses rows.

## Techniques practised in this set

| # | Technique | Source document | Exercises |
|---|---|---|---|
| 1 | Bridge tables | [Bridge tables](../skills/bridge-table.md) | 6 |
| 2 | Hierarchies | [Hierarchies](../skills/hierarchy.md) | 5 |
| 3 | Heterogeneous entities | [Heterogeneous entities](../skills/heterogeneous-schema.md) | 5 |

## Preparation

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Three main tables: `nhan_vien_don` (a bridge, with **one order whose weights don't close**),
`cay_nhom_hang` (a tree with **two roots, depth 1→4**), `giao_dich_tai_chinh` (four types, each
filling different columns). See [the seed appendix](bt-00-seed.md).

---

## Group A — Bridge tables

### Exercise A.1 — Joining straight through the bridge: 72% inflated

**The task:** measure the damage of joining `don_hang_chi_tiet` to `nhan_vien_don` **without**
multiplying by the weight.

**The answer it must produce:**

```text
┌──────────┬──────────┬──────────┬────────────┐
│ dong_goc │ sau_join │ tien_goc │ tien_phong │
├──────────┼──────────┼──────────┼────────────┤
│       15 │       26 │ 10215000 │   17565000 │
└──────────┴──────────┴──────────┴────────────┘
```

**72% inflated.** And as always, the inflation factor isn't round so it doesn't look like a bug.

<details>
<summary>Solution</summary>

```sql
select (select count(*) from don_hang_chi_tiet) dong_goc,
       (select count(*) from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id)) sau_join,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) tien_goc,
       (select sum(ct.so_luong*ct.don_gia)
        from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id)) tien_phong;
```

The difference from the inflation kinds met in set 1: here **there's no error in the SQL at all**.
The right key, the right condition. The problem is that the *order → employee* relationship is
**many-to-many**, and a star schema has no way to represent that with one foreign key.

Three common wrong approaches, and why each is still wrong:

| The approach | The problem |
|---|---|
| Take `min(nv_id)` per order | data lost — 7 assignment rows vanish |
| Add `nv_1_key`, `nv_2_key`, `nv_3_key` to the fact | what about an order with 4 people; and you can't group |
| Replicate the fact row per employee | that's the 26 rows above — inflation |

The right way is to **keep the bridge and carry an allocation weight**, exercise A.2.

</details>

### Exercise A.2 — Multiply by the weight, and find the total is still wrong

**The task:** compute allocated revenue per employee by multiplying by `he_so`. Then sum it up
and compare against 10,215,000.

**The answer it must produce:**

```text
┌───────────┬───────────────────┐
│  ho_ten   │ doanh_thu_phan_bo │
├───────────┼───────────────────┤
│ Bui Van G │         3660000.0 │
│ Vu Van E  │         3345000.0 │
│ Do Thi F  │         2400000.0 │
│ Ngo Thi H │          720000.0 │
└───────────┴───────────────────┘
```

```text
┌──────────────┬───────────┬──────────┐
│ tong_phan_bo │ tong_that │  chenh   │
├──────────────┼───────────┼──────────┤
│   10125000.0 │  10215000 │ -90000.0 │
└──────────────┴───────────┴──────────┘
```

Even after multiplying by the weight, it's still **90,000 short**. Work out why.

<details>
<summary>Solution</summary>

```sql
select nv.ho_ten, round(sum(ct.so_luong*ct.don_gia * nd.he_so)) doanh_thu_phan_bo
from don_hang_chi_tiet ct
join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id)
group by 1 order by 2 desc;

select round(sum(ct.so_luong*ct.don_gia * nd.he_so)) tong_phan_bo, 10215000 tong_that,
       round(sum(ct.so_luong*ct.don_gia * nd.he_so)) - 10215000 chenh
from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id);
```

Weights **fix the inflation** but **don't guarantee closure by themselves**. Multiplying by the weight is a necessary
condition, not a sufficient one.

This is where bridge tables are far more dangerous than the other techniques: after multiplying by the weight, the number
**looks right** — no more 72% inflation, the total is close to the real total, everything seems fine. A
0.88% error drowns in any report.

And it only surfaces when you **actively reconcile against an independent total**. Without reconciling you
never know.

Exercise A.3 finds the culprit.

</details>

### Exercise A.3 — Find the order whose weights don't close

**The task:** write a statement finding every order whose `sum(he_so)` differs from 1.

**The answer it must produce:**

```text
┌─────────────┬────────────┬───────┐
│ don_hang_id │ tong_he_so │ so_nv │
├─────────────┼────────────┼───────┤
│ DH008       │        0.9 │     2 │
└─────────────┴────────────┴───────┘
```

Exactly one order. `DH008` is worth 900,000, and 10% short = **90,000** — matching exercise A.2's
gap exactly.

<details>
<summary>Solution</summary>

```sql
select don_hang_id, round(sum(he_so),2) tong_he_so, count(*) so_nv
from nhan_vien_don
group by 1
having abs(sum(he_so) - 1.0) > 0.001
order by 1;
```

Two details decide whether this statement is usable:

**`abs(...) > 0.001` rather than `<> 1.0`.** `he_so` is a float; `0.5 + 0.3 + 0.2`
in IEEE 754 does **not** equal exactly `1.0`. An equality comparison is a false alarm for perfectly
ordinary orders — and then somebody turns the alert off, and from then on nothing gets caught.

**`having` rather than `where`.** The condition applies to the group, not the row.

This statement must be a **test running on every build**, not a query run once:

```sql
-- dbt: tests/bridge_he_so_khep_kin.sql
select don_hang_id, sum(he_so) tong
from {{ ref('nhan_vien_don') }}
group by 1
having abs(sum(he_so) - 1.0) > 0.001
```

dbt treats a test as failed when the query **returns rows**. So the statement above returns 1 row → the build goes red →
nobody has time to build a report on wrong data.

Without this test, `DH008` lives in the system forever, and every month somebody loses
half a day working out where the 0.88% went.

</details>

### Exercise A.4 — Fixing the weights: normalise at read time or at write time

**The task:** fix it so the allocated total equals exactly 10,215,000, **two ways**: normalising the weights at read time,
and patching the source data.

**The answer it must produce (both ways):**

```text
┌──────────────┬───────────┬───────┐
│ tong_phan_bo │ tong_that │ chenh │
├──────────────┼───────────┼───────┤
│     10215000 │  10215000 │     0 │
└──────────────┴───────────┴───────┘
```

<details>
<summary>Solution</summary>

```sql
-- WAY 1: normalise at read time — divide by that order's own weight total
with he_so_chuan as (
  select don_hang_id, nv_id,
         he_so / sum(he_so) over (partition by don_hang_id) he_so_chuan
  from nhan_vien_don)
select round(sum(ct.so_luong*ct.don_gia * h.he_so_chuan)) tong_phan_bo,
       10215000 tong_that,
       round(sum(ct.so_luong*ct.don_gia * h.he_so_chuan)) - 10215000 chenh
from don_hang_chi_tiet ct join he_so_chuan h using (don_hang_id);
```

```sql
-- WAY 2: patch the source — raise NV03's he_so on DH008 from 0.4 to 0.5
update nhan_vien_don set he_so = 0.5 where don_hang_id='DH008' and nv_id='NV03';
```

**Which is right depends on what `0.9` means** — and that's a business question, not a
technical one:

| If `0.9` means | The right way | Why |
|---|---|---|
| **A data-entry error** — it should have been 1.0 | patch the source | fix the root, don't mask the symptom |
| **10% belongs to another channel** (a partner, automation) | add a row `nv_id = 'KHAC'` with weight 0.1 | the total closes and **the truth is preserved** |
| **Relative weights**, not percentages | normalise at read time | the weights were never meant to sum to 1 |

Normalising at read time is **the most dangerous temptation** of the three: it makes every number match
immediately, so it looks like a completed fix. But if `0.9` really is a data-entry error, you've just
**hidden a bug** — and next month an order with weight `2.5` gets silently normalised into
validity too.

The rule: **if you normalise at read time, keep exercise A.3's test anyway.** Normalising makes the report
usable now; the test makes somebody go and fix the root.

</details>

### Exercise A.5 — Two questions, two ways to use a bridge

**The task:** compute, per employee: **allocated** revenue (multiplied by the weight) and
**influenced** revenue (every order they took part in, unweighted). Put them side by side.

**The answer it must produce:**

```text
┌───────────┬─────────────────┬─────────────────────┐
│  ho_ten   │ so_don_tham_gia │ doanh_thu_anh_huong │
├───────────┼─────────────────┼─────────────────────┤
│ Vu Van E  │               6 │             5850000 │
│ Bui Van G │               3 │             5100000 │
│ Do Thi F  │               5 │             4245000 │
│ Ngo Thi H │               3 │             2370000 │
└───────────┴─────────────────┴─────────────────────┘
```

The `doanh_thu_anh_huong` column totals **17,565,000** — exactly the "72% inflated" figure from exercise A.1.

<details>
<summary>Solution</summary>

```sql
select nv.ho_ten, count(distinct nd.don_hang_id) so_don_tham_gia,
       sum(ct.so_luong*ct.don_gia) doanh_thu_anh_huong
from don_hang_chi_tiet ct
join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id)
group by 1 order by 3 desc;
```

**The "inflated" number from exercise A.1 turns out to be a legitimate number** — for a different question:

| The question | The calculation | The total |
|---|---|---|
| "How much revenue did each employee **bring in**?" | multiply by the weight | 10,215,000 ✅ |
| "How much revenue did each employee **have a hand in**?" | unweighted | 17,565,000 |

The second column is called **impact analysis**, and it **deliberately** doesn't add up. That's something
to state right beside it, because a reader's reflex is always to drag the column into a total cell.

Notice the ranking changes: by influenced revenue, `Bui Van G` is second with only 3
orders; by allocated revenue he's **first** (3,660,000). Because `Bui Van G` worked order
`DH005` alone — the biggest order, 2,700,000.

Two different rankings from the same bridge. If you're using it to compute bonuses, you must settle up front
which column — and that's HR's decision, not the SQL author's.

</details>

### Exercise A.6 — A bridge with validity intervals

**The task:** no SQL. `nhan_vien_don` currently has no time dimension. What happens when an employee
**changes department** mid-period, and how do you fix the model?

<details>
<summary>Solution</summary>

`NV01` is in *Kinh doanh*. Suppose they move to *Ho tro* on 04/07. Now ask *"revenue
by department"*:

```sql
select nv.phong_ban, round(sum(ct.so_luong*ct.don_gia * nd.he_so))
from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id) group by 1;
```

This assigns **all** of `NV01`'s revenue, including orders from 01/07, to their
**current** department. That's exactly [set 2](bt-02-dimension-thoi-gian.md)'s as-was/as-is problem, this
time hiding inside a bridge.

Three layers of fix, and it matters that you distinguish which illness each cures:

**Layer 1 — make `dim_nhan_vien` Type 2.** Fixes the "which department when" problem. The fact freezes
`nv_key` (the version) rather than `nv_id`.

**Layer 2 — give the bridge validity intervals.** Fixes a different problem: *assignments* also change over
time. Order `DH003` was initially `NV01`'s at 0.5, then handed over leaving 0.3:

```csv
don_hang_id,nv_id,he_so,hieu_luc_tu,hieu_luc_den
DH003,NV01,0.5,2026-07-02,2026-07-09
DH003,NV01,0.3,2026-07-10,9999-12-31
```

Now the bridge **is itself a Type 2**, and every query needs a time condition —
including exercise A.3's closure check, which now has to check closure **at each point in time**.

**Layer 3 — freeze the weight into the fact at load time.** Drop the read-time join entirely: each fact row carries
`nv_key` and `he_so_da_chot` already. Expensive at write time, but historical reports are **permanently
immutable**, and nobody gets a chance to join wrongly.

Layer 3 is what commission systems use, for a very practical reason: **commission already paid
cannot change**. See [Bridge tables](../skills/bridge-table.md).

</details>

---

## Group B — Hierarchies

### Exercise B.1 — Flattening to a fixed three levels: losing the deep branch, gaping on the shallow one

**The task:** flatten `cay_nhom_hang` into **exactly three columns** `cap1`, `cap2`, `cap3`, then point out
which item gets cut off and which gapes.

**The answer it must produce:**

```text
┌─────────┬────────┬───────────┬───────────────────┬───────────────┬──────────────────────────┐
│ ma_hang │ do_sau │   cap1    │       cap2        │     cap3      │          mat_gi          │
├─────────┼────────┼───────────┼───────────────────┼───────────────┼──────────────────────────┤
│ SP-D    │      2 │ Cong nghe │ Thiet bi ngoai vi │ (khong co)    │ -                        │
│ SP-A    │      3 │ Cong nghe │ Thiet bi ngoai vi │ Thiet bi nhap │ -                        │
│ SP-B    │      3 │ Cong nghe │ Thiet bi ngoai vi │ Man hinh      │ -                        │
│ SP-C    │      4 │ Cong nghe │ May tinh          │ Laptop        │ BI CAT: Laptop van phong │
└─────────┴────────┴───────────┴───────────────────┴───────────────┴──────────────────────────┘
```

**Two illnesses at once:** `SP-D` gapes at level 3, `SP-C` loses level 4.

<details>
<summary>Solution</summary>

```sql
with recursive duong as (
  select nhom_id, ten_nhom, nhom_cha_id, 1 cap, [ten_nhom] duong
  from cay_nhom_hang where nhom_cha_id is null
  union all
  select c.nhom_id, c.ten_nhom, c.nhom_cha_id, d.cap+1, list_append(d.duong, c.ten_nhom)
  from cay_nhom_hang c join duong d on c.nhom_cha_id = d.nhom_id)
select hh.ma_hang, d.cap do_sau,
       d.duong[1] cap1,
       coalesce(d.duong[2],'(khong co)') cap2,
       coalesce(d.duong[3],'(khong co)') cap3,
       case when d.cap > 3 then 'BI CAT: ' || d.duong[4] else '-' end mat_gi
from hang_hoa hh join hang_hoa_nhom hn using (ma_hang)
join duong d on d.nhom_id = hn.nhom_id
order by d.cap;
```

This is how **most** warehouses do hierarchies, and it breaks in two opposite
directions:

**A branch shallower than the fixed level count → a gap.** `SP-D` has only 2 levels. Leaving `cap3` as
`NULL` makes `group by cap3` gather it into a `NULL` group; filling `'(khong co)'` makes the report show a fake group.
The only right way is to **pull the parent level's value down** (`cap3 = 'Thiet bi ngoai vi'`) — called
*ragged fill-down*, and it keeps the total right while repeating the labels.

**A branch deeper than the fixed level count → loss.** `SP-C` belongs to *Laptop van phong* but the columns only reach
*Laptop*. The revenue **isn't lost** — it's still inside *Laptop*. What's lost is **the ability
to look deeper**, and it's lost **silently**: the report still totals 10,215,000, it's just that nobody
knows another level exists.

The deeper point: **the level count is data, not a constant.** Today it's 4; next year the business
adds a level and you must change the schema, change every report, and reload history. Exercise B.2 is the way out.

</details>

### Exercise B.2 — A path bridge: one table for every level

**The task:** build `bridge_nhom` — every *(ancestor, descendant)* pair with its distance, **including the
self-pointing pairs** (distance 0).

**The answer it must produce:**

```text
┌────────┬────────────┬────────┐
│ so_cap │ so_to_tien │ tu_tro │
├────────┼────────────┼────────┤
│     19 │          8 │      8 │
└────────┴────────────┴────────┘
```

8 groups generate **19 relationship pairs**, of which 8 are self-pointing.

<details>
<summary>Solution</summary>

```sql
create or replace table bridge_nhom as
with recursive tt as (
  select nhom_id to_tien, nhom_id con, 0 khoang_cach from cay_nhom_hang
  union all
  select t.to_tien, c.nhom_id, t.khoang_cach + 1
  from tt t join cay_nhom_hang c on c.nhom_cha_id = t.con)
select * from tt;

select count(*) so_cap, count(distinct to_tien) so_to_tien,
       count(*) filter (where khoang_cach = 0) tu_tro
from bridge_nhom;
```

This structure has a name: a **path enumeration bridge**, or *closure table*. It stores **every
path** in the tree, not just direct parent–child relationships.

The self-pointing pair (`khoang_cach = 0`) is the most easily forgotten detail and omitting it breaks things: without it,
`Man hinh` isn't its own ancestor, so *"revenue for Man hinh and all its child
groups"* **won't count `Man hinh`'s own revenue**.

Three properties that make it beat fixed flattening:

| | Fixed flattening | A path bridge |
|---|---|---|
| Level count | **hardcoded** in the schema | unlimited |
| Adding a level | change the schema + reload | add a row to the tree, rebuild the bridge |
| A ragged tree | gaps or cuts | handled correctly, no fill-down needed |
| The cost | — | a bigger table, one extra `join` step |

The bridge's size grows with **depth × node count**, not with the square — a 100,000-node tree
6 levels deep gives about 400,000 rows. Still small next to a fact.

</details>

### Exercise B.3 — Rolling up to every level with the bridge

**The task:** use `bridge_nhom` to compute revenue for **every** group, each including its descendants.

**The answer it must produce:**

```text
┌─────────┬───────────────────┬────────┬───────────┐
│ to_tien │     ten_nhom      │ so_don │ doanh_thu │
├─────────┼───────────────────┼────────┼───────────┤
│ N1      │ Cong nghe         │     10 │  10215000 │
│ N3      │ Thiet bi ngoai vi │      9 │   6615000 │
│ N4      │ Laptop            │      2 │   3600000 │
│ N8      │ Laptop van phong  │      2 │   3600000 │
│ N2      │ May tinh          │      2 │   3600000 │
│ N5      │ Thiet bi nhap     │      6 │   3300000 │
│ N6      │ Man hinh          │      4 │   3000000 │
└─────────┴───────────────────┴────────┴───────────┘
```

Seven rows, not eight. **Where did `N7` go?**

<details>
<summary>Solution</summary>

```sql
select b.to_tien, cn.ten_nhom,
       count(distinct ct.don_hang_id) so_don,
       sum(ct.so_luong*ct.don_gia) doanh_thu
from bridge_nhom b
join cay_nhom_hang cn on cn.nhom_id = b.to_tien
join hang_hoa_nhom hn on hn.nhom_id = b.con
join don_hang_chi_tiet ct on ct.ma_hang = hn.ma_hang
group by 1,2 order by 4 desc;
```

**`N7` (Hang thanh ly) has no items**, so the `inner join` drops it. That's correct SQL
behaviour but **wrong for the business**: the report needs to show *Hang thanh ly — 0*, not
hide it. A reader can't tell "a group with zero revenue" from "a group that doesn't
exist". Fix it with a `left join` from `cay_nhom_hang`.

Three things to read off this table:

**`N1` = 10,215,000 = all the revenue.** Correct, because every item sits under *Cong nghe*.
This is a free check on the tree: **the root must equal the total**.

**`N2` = `N4` = `N8` = 3,600,000.** Three consecutive levels with the same number because there's only one item
(`SP-C`) in that branch. A single-child branch is normal, not a bug.

**The rows do NOT add up to the total.** 6,615,000 + 3,600,000 + … is far larger than 10,215,000,
because each item is counted at **every one of its ancestor levels**. That's the nature of a tree
rollup — and it's why this table **must not** be handed to a BI tool without locking the viewing level.

This is exactly [the case study on summing a cumulative column](../case-studies/cong-cot-luy-ke.md), in
space rather than in time.

</details>

### Exercise B.4 — The org tree: summing revenue for a whole reporting line

**The task:** use a recursive CTE on `nhan_vien.nv_quan_ly_id` to compute, per person, the allocated
revenue of **themselves and their entire reporting line**.

**The answer it must produce:**

```text
┌───────────┬─────────────┬──────────────────┬───────────────┐
│  ho_ten   │   cap_bac   │ doanh_thu_ca_nha │ so_nguoi_duoi │
├───────────┼─────────────┼──────────────────┼───────────────┤
│ Ngo Thi H │ Giam doc    │       10125000.0 │             4 │
│ Do Thi F  │ Truong nhom │        5745000.0 │             2 │
│ Bui Van G │ Nhan vien   │        3660000.0 │             1 │
│ Vu Van E  │ Nhan vien   │        3345000.0 │             1 │
└───────────┴─────────────┴──────────────────┴───────────────┘
```

`Ngo Thi H` gives **10,125,000** — not 10,215,000. Still exercise A.3's `DH008`.

<details>
<summary>Solution</summary>

```sql
with recursive cay as (
  select nv_id goc, nv_id duoi from nhan_vien
  union all
  select c.goc, nv.nv_id from cay c join nhan_vien nv on nv.nv_quan_ly_id = c.duoi),
phan_bo as (
  select nd.nv_id, sum(ct.so_luong*ct.don_gia * nd.he_so) tien
  from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id)
  group by 1)
select nv.ho_ten, nv.cap_bac,
       round(sum(p.tien),1) doanh_thu_ca_nha,
       count(distinct c.duoi) so_nguoi_duoi
from cay c
join nhan_vien nv on nv.nv_id = c.goc
left join phan_bo p on p.nv_id = c.duoi
group by 1,2 order by 3 desc;
```

This is **two nested bridges**, and the order of work matters:

1. `cay` — a path bridge over the org tree (like exercise B.2, different data).
2. `phan_bo` — aggregate revenue per employee **first**, already weight-multiplied.
3. Join the two.

**Aggregating first is mandatory.** Joining `cay` straight onto `nhan_vien_don` and only then `sum`ming multiplies each
assignment row by the number of ancestors in the tree → inflation again, on top of exercise A.1's
inflation.

The general rule with several many-to-many relationships: **aggregate back to a single grain each time, never
join two bridges and only then aggregate.**

And the `DH008` error is still there — it spreads through every downstream calculation. One wrong seed row skews
the director's whole commission report. That's why exercise A.3's test must run **before** everything else.

</details>

### Exercise B.5 — Detecting a cycle in the tree

**The task:** no SQL required. `NV01` manages `NV02`, `NV02` manages `NV04`, and suppose somebody
sets `NV04` to manage `NV01`. What happens, and how do you detect it?

<details>
<summary>Solution</summary>

Exercise B.4's recursive CTE will **run forever** — or more precisely: until memory runs out,
or until the engine's recursion limit. DuckDB and Postgres don't detect cycles by themselves.

Two ways to stop it, and you should have **both**:

```sql
-- WAY 1: limit the depth, blocking it at run time
with recursive cay as (
  select nv_id goc, nv_id duoi, 0 sau from nhan_vien
  union all
  select c.goc, nv.nv_id, c.sau + 1
  from cay c join nhan_vien nv on nv.nv_quan_ly_id = c.duoi
  where c.sau < 10)                    -- <- the block
select * from cay;

-- WAY 2: carry the path along, dropping any row that loops back
with recursive cay as (
  select nv_id goc, nv_id duoi, [nv_id] duong from nhan_vien
  union all
  select c.goc, nv.nv_id, list_append(c.duong, nv.nv_id)
  from cay c join nhan_vien nv on nv.nv_quan_ly_id = c.duoi
  where not list_contains(c.duong, nv.nv_id))   -- <- cycle detection
select * from cay;
```

Way 1 is cheap and always stops it, but **silently truncates** a genuinely deeper-than-10-level tree. Way 2
is semantically correct but costs more.

And both only **block**, they don't **report**. You need a separate test:

```sql
-- test: nobody is their own ancestor along a path longer than 0
select goc from cay where goc = duoi and sau > 0;
```

A cycle in an org tree sounds impossible, but it really happens every
time there's a restructure: A temporarily manages B while B is A's manager, and somebody forgets
to undo it. A product-category tree is even easier — one mistaken drag-and-drop in the admin
interface will do it.

**The rule:** every self-referencing tree needs a no-cycle test, and that test must run **before**
any recursive CTE that uses it. See [Hierarchies](../skills/hierarchy.md).

</details>

---

## Group C — Heterogeneous entities

### Exercise C.1 — Measure the `NULL` forest: 63.9% empty cells

**The task:** with `giao_dich_tai_chinh`, count the populated cells across the **six varying columns**
(`so_tien`, `ky_han_thang`, `lai_suat`, `ma_the`, `phi_giao_dich`, `don_hang_id`), by
`loai_gd`. Then compute the table's overall empty-cell ratio.

**The answer it must produce:**

```text
┌────────────────┬─────────┬─────────┬────────┬──────────┬────────┬───────┬──────────┐
│    loai_gd     │ so_dong │ so_tien │ ky_han │ lai_suat │ ma_the │  phi  │ don_hang │
├────────────────┼─────────┼─────────┼────────┼──────────┼────────┼───────┼──────────┤
│ gui_tiet_kiem  │       2 │       2 │      2 │        2 │      0 │     0 │        0 │
│ nap_tien       │       3 │       3 │      0 │        0 │      0 │     0 │        0 │
│ rut_tien       │       3 │       3 │      0 │        0 │      0 │     3 │        0 │
│ thanh_toan_the │       4 │       4 │      0 │        0 │      4 │     0 │        3 │
└────────────────┴─────────┴─────────┴────────┴──────────┴────────┴───────┴──────────┘
```

```text
┌───────────────────┬────────┬─────────┐
│ phan_tram_o_trong │ tong_o │ so_dong │
├───────────────────┼────────┼─────────┤
│              63.9 │     72 │      12 │
└───────────────────┴────────┴─────────┘
```

**Nearly two thirds of the table is empty cells.** And one cell "should be populated but isn't" — find it.

<details>
<summary>Solution</summary>

```sql
select loai_gd, count(*) so_dong,
       count(so_tien) so_tien, count(ky_han_thang) ky_han, count(lai_suat) lai_suat,
       count(ma_the) ma_the, count(phi_giao_dich) phi, count(don_hang_id) don_hang
from giao_dich_tai_chinh group by 1 order by 1;

select round(100.0 * (count(*)*6 -
         (count(so_tien)+count(ky_han_thang)+count(lai_suat)
          +count(ma_the)+count(phi_giao_dich)+count(don_hang_id)))
       / (count(*)*6), 1) phan_tram_o_trong,
       count(*)*6 tong_o, count(*) so_dong
from giao_dich_tai_chinh;
```

**The anomalous cell: `thanh_toan_the` has 4 rows but only 3 `don_hang_id`.** That's `GD12` —
a card payment tied to no order (outside the system).

This detail matters because it distinguishes two kinds of `NULL` that look identical:

| The kind of `NULL` | Example | Meaning |
|---|---|---|
| **Structural** | `ky_han_thang` on a `nap_tien` | the attribute **doesn't apply** to this type |
| **Data** | `don_hang_id` on `GD12` | the attribute **does apply** but is missing |

A structural `NULL` is an inevitable consequence of cramming several types into one table — no amount of
filling in data fixes it. A data `NULL` is either **a bug** or **a legitimate business case**, and it
must be investigated separately.

A one-wide-table design **can't distinguish the two**, and that's its biggest weakness —
bigger than wasted space. Exercises C.2 and C.3 are the two ways out.

</details>

### Exercise C.2 — Three ways to store, three cell costs

**The task:** compare three architectures — one wide table (supertype), four split tables (subtype), and
measure-type (EAV) — by cells allocated, cells populated, and cells empty.

**The answer it must produce:**

```text
┌───────────────────────────┬────────────┬──────────────┬─────────┐
│           cach            │ o_cap_phat │ o_co_du_lieu │ o_trong │
├───────────────────────────┼────────────┼──────────────┼─────────┤
│ mot bang rong (supertype) │         72 │           26 │      46 │
│ tach 4 bang (subtype)     │         27 │           26 │       1 │
│ measure-type (EAV)        │         38 │           19 │       0 │
└───────────────────────────┴────────────┴──────────────┴─────────┘
```

EAV has **19** data cells rather than 26. Where did seven cells go?

<details>
<summary>Solution</summary>

```sql
create or replace table gd_eav as
select gd_id, ngay, khach_id, loai_gd, 'so_tien' thuoc_tinh, so_tien::double gia_tri
  from giao_dich_tai_chinh where so_tien is not null
union all select gd_id, ngay, khach_id, loai_gd, 'ky_han_thang', ky_han_thang::double
  from giao_dich_tai_chinh where ky_han_thang is not null
union all select gd_id, ngay, khach_id, loai_gd, 'lai_suat', lai_suat::double
  from giao_dich_tai_chinh where lai_suat is not null
union all select gd_id, ngay, khach_id, loai_gd, 'phi_giao_dich', phi_giao_dich::double
  from giao_dich_tai_chinh where phi_giao_dich is not null;
```

**The seven lost cells are `ma_the` (4) and `don_hang_id` (3)** — they're **strings**, while EAV's
`gia_tri` column is a `double`.

That's EAV's fatal weakness, and it's easily overlooked when people are seduced by the "0 empty
cells" figure. Three cures, all three ugly:

| The cure | The problem |
|---|---|
| Add a `gia_tri_chu` column | every row now has an empty cell → the advantage is gone |
| Force everything to strings | types lost, `sum()` needs a `cast`, and a type error goes uncaught |
| Keep strings in a separate table | now two tables, more complex than subtyping |

So **EAV only fits when every attribute shares a type** — typically measurement readings
(sensors, medical indicators, financial figures). Mix in a string attribute and EAV loses its
advantage.

The full comparison:

| | Supertype | Subtype | EAV |
|---|---|---|---|
| Empty cells | **46 (63.9%)** | 1 | 0 |
| The query *"total by type"* | 1 table, easy | **`union` of 4 tables** | 1 table, needs a `pivot` |
| Adding a new type | add a column, change every query | **add a table** | **no schema change** |
| Data types | correct | correct | **lost** |
| The constraint "type X must have column Y" | not enforceable | **`NOT NULL` enforces it** | no |

</details>

### Exercise C.3 — Splitting out subtypes, and the price of `union`

**The task:** split `giao_dich_tai_chinh` into four subtype tables, then rewrite the query *"total money
per customer"* — which was one line of SQL on the wide table.

**The answer it must produce:**

```text
┌──────────┬───────────┬───────┐
│ khach_id │ tong_tien │ so_gd │
├──────────┼───────────┼───────┤
│ C1       │  27195000 │     4 │
│ C3       │  13900000 │     3 │
│ C4       │   9500000 │     2 │
│ C2       │   3900000 │     3 │
└──────────┴───────────┴───────┘
```

<details>
<summary>Solution</summary>

```sql
create or replace table gd_nap_tien as
  select gd_id, ngay, khach_id, so_tien from giao_dich_tai_chinh where loai_gd='nap_tien';
create or replace table gd_rut_tien as
  select gd_id, ngay, khach_id, so_tien, phi_giao_dich from giao_dich_tai_chinh where loai_gd='rut_tien';
create or replace table gd_tiet_kiem as
  select gd_id, ngay, khach_id, so_tien, ky_han_thang, lai_suat
  from giao_dich_tai_chinh where loai_gd='gui_tiet_kiem';
create or replace table gd_the as
  select gd_id, ngay, khach_id, so_tien, ma_the, don_hang_id
  from giao_dich_tai_chinh where loai_gd='thanh_toan_the';

-- the cross-cutting question: it has to be unioned back
with tat_ca as (
  select khach_id, so_tien from gd_nap_tien
  union all select khach_id, so_tien from gd_rut_tien
  union all select khach_id, so_tien from gd_tiet_kiem
  union all select khach_id, so_tien from gd_the)
select khach_id, sum(so_tien) tong_tien, count(*) so_gd
from tat_ca group by 1 order by 2 desc;
```

This is subtyping's **real trade-off**, and it's counter-intuitive: splitting the tables makes
*each type* cleaner but makes *every question crossing the types* harder.

```text
Cau hoi trong MOT loai   ("ky han gui tiet kiem trung binh")  →  subtype THANG
Cau hoi CAT NGANG loai   ("tong tien theo khach")             →  supertype THANG
```

And the ratio between those two kinds of question decides the architecture. If 90% of reports are cross-cutting, splitting into
four tables is making your daily life harder to save 46 empty cells.

**The pragmatic solution most warehouses use: both.**

```sql
-- the wide table as the source of truth, subtype views per type
create or replace view v_gd_tiet_kiem as
  select gd_id, ngay, khach_id, so_tien, ky_han_thang, lai_suat
  from giao_dich_tai_chinh where loai_gd = 'gui_tiet_kiem';
```

Store one wide table (accepting structural `NULL`s), then create a view per subtype. Cross-cutting
questions read the base table; per-type questions read the view and **see no inapplicable column**.

What's lost: a view can't enforce `NOT NULL`. Compensate with a test:

```sql
-- every savings transaction must have a term and a rate
select gd_id from giao_dich_tai_chinh
where loai_gd = 'gui_tiet_kiem' and (ky_han_thang is null or lai_suat is null);
```

</details>

### Exercise C.4 — Querying the EAV form

**The task:** with `gd_eav`, produce statistics by `thuoc_tinh`, then `pivot` back to the wide form for
`gui_tiet_kiem` alone.

**The answer it must produce:**

```text
┌───────────────┬─────────┬────────────┐
│  thuoc_tinh   │ so_dong │    tong    │
├───────────────┼─────────┼────────────┤
│ ky_han_thang  │       2 │       18.0 │
│ lai_suat      │       2 │       12.3 │
│ phi_giao_dich │       3 │    77000.0 │
│ so_tien       │      12 │ 54495000.0 │
└───────────────┴─────────┴────────────┘
```

The `lai_suat` row totals **12.3** — does that number mean anything?

<details>
<summary>Solution</summary>

```sql
select thuoc_tinh, count(*) so_dong, round(sum(gia_tri),1) tong
from gd_eav group by 1 order by 1;

-- pivot back to the wide form
select gd_id, khach_id,
       max(gia_tri) filter (where thuoc_tinh='so_tien') so_tien,
       max(gia_tri) filter (where thuoc_tinh='ky_han_thang') ky_han_thang,
       max(gia_tri) filter (where thuoc_tinh='lai_suat') lai_suat
from gd_eav where loai_gd='gui_tiet_kiem'
group by 1,2 order by 1;
```

**`sum(lai_suat)` = 12.3 is a meaningless number** — it adds 5.8% to 6.5%. An interest rate is a ratio,
non-additive, exactly like the avg-of-avg problem in [set 5](bt-05-fact-nang-cao.md).

And this is **EAV's most dangerous weakness**, worse even than losing data types: every
attribute lives in one `gia_tri` column, so `sum(gia_tri)` **always runs** even when you're
adding money to interest rates to terms.

In the wide form, adding those two columns together takes deliberate effort. In EAV, forgetting one `where
thuoc_tinh = ...` is enough:

```sql
-- LOOKS RIGHT, actually adds money + term + rate + fee
select khach_id, sum(gia_tri) from gd_eav group by 1;
```

Guard against it by making it mandatory: **never `sum(gia_tri)` without a `where
thuoc_tinh`**, and add a `don_vi` column (`VND`, `thang`, `phan_tram`) so the error surfaces when grouping.

See [Heterogeneous entities](../skills/heterogeneous-schema.md).

</details>

### Exercise C.5 — Which to choose

**The task:** no SQL. For three situations, choose the architecture and explain.

1. Four transaction types, stable for years, 90% of reports cutting across the types.
2. Insurance products, 20–40 attributes specific to each type, a new type every quarter.
3. IoT sensors, 200 metrics, new metrics added constantly, all of them numeric.

<details>
<summary>Solution</summary>

**1 → Supertype (one wide table).** The types are stable so the column count won't grow; 90% is cross-cutting so
`union` would appear in most queries. 46 empty cells is the cheapest price of the three.
Add a view per type as in exercise C.3.

**2 → Subtype (split tables).** 20–40 specific attributes × 4 types is a **160-column** wide table
where each row fills only a quarter. Worse: a new type each quarter means **adding 30 columns to an
existing table** — an expensive operation on a large table, and every `select *` gets wider.

With subtypes, a new type is a **new table**, touching nothing already running. That's the most important
advantage here, not the empty cells.

**3 → EAV (measure-type).** This is the case EAV **was designed for**: every value the same
numeric type, a large and open attribute count, and new attributes not allowed to change the schema.
The type-loss weakness from exercise C.2 doesn't apply because there are no string attributes.

You still need `don_vi` and a ban on bare `sum(gia_tri)` as in exercise C.4.

**The condensed decision tree:**

```text
Thuoc tinh moi co lam DOI SCHEMA khong duoc chap nhan?
├─ Co  → EAV, neu MOI gia tri cung kieu
│         khong cung kieu → subtype
└─ Khong
   ├─ It thuoc tinh rieng (<10) + hay cat ngang  → SUPERTYPE
   └─ Nhieu thuoc tinh rieng (>20)               → SUBTYPE
```

What to remember: **all three are right**, and choosing wrong doesn't make the numbers wrong — it only makes
everything afterwards more expensive. That's the hardest kind of decision to fix, because no symptom reports that
you chose wrong.

</details>

---

## Quick reconciliation table

| The number | What it means | Exercise |
|---|---|---|
| 15 → 26 rows, +72% | a bridge join without the weight | A.1 |
| 10,125,000, 90,000 short | weighted and still wrong because of `DH008` | A.2 |
| `DH008` weights total 0.9 | the culprit, found with `having` | A.3 |
| 17,565,000 | **influenced** revenue — deliberately unsummable | A.5 |
| `SP-D` gapes, `SP-C` is cut | fixed flattening breaks at both ends | B.1 |
| 19 pairs / 8 self-pointing | a path bridge for the tree | B.2 |
| `N1` = 10,215,000 | the tree's root must equal the total | B.3 |
| 63.9% empty cells | the supertype table's `NULL` forest | C.1 |
| 72 / 27 / 38 cells | supertype vs subtype vs EAV | C.2 |
| `sum(lai_suat)` = 12.3 | EAV lets you add mismatched units | C.4 |

## Related Topics

- [Exercise set 3 — Columns and tables](bt-03-cot-va-bang.md) — the previous set
- [Exercise set 5 — Advanced facts](bt-05-fact-nang-cao.md) — the next set
- [The seed appendix](bt-00-seed.md) — `nhan_vien_don`, `cay_nhom_hang`, `giao_dich_tai_chinh`
- [Skills — Data Modeling](../skills/index.md) — the theory behind the three techniques above
