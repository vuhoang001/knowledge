---
title: "Seed appendix — ten tables for the exercise sets"
sidebar_position: 9
description: "The full contents of ten new CSV seeds, with each table's deliberate trap and the technique it serves."
tags: [tutorial, seed, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Seed appendix — ten tables for the exercise sets

> **Takeaway:** the five original seeds suffice to teach grain and SCD, but not bridges, hierarchies,
> multiple currencies or heterogeneous entities. The ten tables below fill exactly that gap —
> and **not one of them changes the four baseline numbers**.

## The four baseline numbers that must not change

```text
10 don · 15 dong · doanh thu 10.215.000 · phi ship 400.000
```

Check them at any time:

```sql
select count(distinct don_hang_id) so_don,
       (select count(*) from don_hang_chi_tiet) so_dong,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) doanh_thu,
       (select sum(phi_ship) from don_hang) phi_ship
from don_hang;
```

```text
┌────────┬─────────┬───────────┬──────────┐
│ so_don │ so_dong │ doanh_thu │ phi_ship │
├────────┼─────────┼───────────┼──────────┤
│     10 │      15 │  10215000 │   400000 │
└────────┴─────────┴───────────┴──────────┘
```

Any of the four being off means a seed has been edited — `dbt seed --full-refresh` returns to the original.

## Load everything

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

```text
Done. PASS=15 WARN=0 ERROR=0 SKIP=0 NO-OP=0 TOTAL=15
```

Fifteen seeds = the five original tables + the ten below.

## Lookup: which table teaches which technique

| Seed | Rows | Main technique | The deliberate trap |
|---|---|---|---|
| `nhan_vien` | 4 | role-playing, a self-referencing tree | `NV04` has no manager → `NULL` |
| `nhan_vien_don` | 17 | bridge table | `DH008`'s weights total **0.9** |
| `cay_nhom_hang` | 8 | a ragged deep hierarchy | two roots; depth 1→4 |
| `hang_hoa_nhom` | 4 | hierarchy, snowflake | `SP-D` hangs at level 2 |
| `khach_hang_lich_su` | 20 | SCD, change detection, mini-dim | three ways `updated_at` lies |
| `ty_gia` | 19 | multiple currencies | **EUR missing for 04/07** |
| `don_hang_ngoai_te` | 7 | multiple currencies | `DN07` is `VND`, absent from `ty_gia` |
| `kho_hang` | 20 | semi-additive, periodic snapshot | `SP-B` from 04/07 is **+1** off, spreading to 05/07 |
| `su_kien_web` | 43 | factless, real-time, behaviour | 05/07 **cut off at 10:00** |
| `giao_dich_tai_chinh` | 12 | heterogeneous entities | each type fills different columns |

---

## `nhan_vien.csv`

An employee dimension with a self-referencing key `nv_quan_ly_id` — used for the org-tree exercises.

```csv
nv_id,ho_ten,phong_ban,cap_bac,nv_quan_ly_id
NV01,Vu Van E,Kinh doanh,Nhan vien,NV02
NV02,Do Thi F,Kinh doanh,Truong nhom,NV04
NV03,Bui Van G,Ho tro,Nhan vien,NV04
NV04,Ngo Thi H,Kinh doanh,Giam doc,
```

**The trap:** `NV04` has an empty `nv_quan_ly_id`. A recursive CTE anchored on `where nv_quan_ly_id is null`
runs correctly; one anchored on `where cap_bac = 'Giam doc'` breaks the moment there's a second director.

## `nhan_vien_don.csv`

A many-to-many bridge: one order can be closed by several employees, each with a weight.

```csv
don_hang_id,nv_id,vai_tro,he_so
DH001,NV01,chinh,1.0
DH002,NV01,chinh,0.5
DH002,NV02,ho_tro,0.5
DH003,NV01,chinh,0.5
DH003,NV02,ho_tro,0.3
DH003,NV04,ho_tro,0.2
DH004,NV02,chinh,1.0
DH005,NV03,chinh,1.0
DH006,NV01,chinh,0.6
DH006,NV03,ho_tro,0.4
DH007,NV02,chinh,1.0
DH008,NV01,chinh,0.5
DH008,NV03,ho_tro,0.4
DH009,NV04,chinh,1.0
DH010,NV01,chinh,0.3
DH010,NV02,ho_tro,0.3
DH010,NV04,ho_tro,0.4
```

**The trap:** `DH008`'s weights are **0.5 + 0.4 = 0.9**. The other nine orders close at 1.0. Multiplying by the weight
and summing will **lose 10% of DH008's value** — and nothing reports an error. This is set 4's
"check the weights close" exercise.

17 rows for 10 orders is also proof that `don_hang_id` is **not** this table's key.

## `cay_nhom_hang.csv`

A product-group hierarchy, in parent–child form.

```csv
nhom_id,ten_nhom,nhom_cha_id
N1,Cong nghe,
N2,May tinh,N1
N3,Thiet bi ngoai vi,N1
N4,Laptop,N2
N5,Thiet bi nhap,N3
N6,Man hinh,N3
N7,Hang thanh ly,
N8,Laptop van phong,N4
```

The tree shape:

```text
N1 Cong nghe
├── N2 May tinh
│   └── N4 Laptop
│       └── N8 Laptop van phong      cap 4
└── N3 Thiet bi ngoai vi
    ├── N5 Thiet bi nhap             cap 3
    └── N6 Man hinh                  cap 3
N7 Hang thanh ly                     cap 1, goc rieng
```

**Two traps:** the tree has **two roots** (`N1` and `N7`) — a wrong recursive anchor loses a whole branch;
and the depth runs from 1 to 4 — flattening to a fixed three levels breaks.

## `hang_hoa_nhom.csv`

Attaches items to the tree. Kept separate from `hang_hoa` so the old flat `nhom` column survives, for the
comparison exercises.

```csv
ma_hang,nhom_id
SP-A,N5
SP-B,N6
SP-C,N8
SP-D,N3
```

**The trap:** `SP-D` hangs at **level 2** while `SP-C` is at level 4. A ragged tree in the proper sense.

**The second, heavier trap:** `hang_hoa.nhom` writes *"Màn hình"* **with diacritics**, while
`cay_nhom_hang.ten_nhom` writes *"Man hinh"* **without**. Joining the two tables by group name returns
**0 rows**, no error. That's set 6's conformed-dimension exercise.

## `khach_hang_lich_su.csv`

A **once-daily** customer extract, 4 customers × 5 days. This is the source for building SCD
Type 2 yourself without `dbt snapshot`.

```csv
ngay_trich,khach_id,ho_ten,khu_vuc,hang,nhom_tuoi,khoang_thu_nhap,diem_tin_dung,updated_at
2026-07-01,C1,Nguyen Van A,Mien Bac,Bac,25-34,10-20tr,700,2026-06-28
2026-07-01,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,780,2026-06-30
2026-07-01,C3,Le Van C,Mien Trung,Bac,45-54,5-10tr,650,2026-06-25
2026-07-01,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,820,2026-06-20
2026-07-02,C1,Nguyen Van A,Mien Bac,Bac,25-34,10-20tr,705,2026-06-28
2026-07-02,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,782,2026-06-30
2026-07-02,C3,Le Van C,Mien Trung,Bac,45-54,5-10tr,655,2026-06-25
2026-07-02,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,825,2026-06-20
2026-07-03,C1,Nguyen Van A,Mien Nam,Bac,25-34,10-20tr,705,2026-06-28
2026-07-03,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,782,2026-07-03
2026-07-03,C3,Le Van C,Mien Trung,Bac,45-54,5-10tr,655,2026-06-25
2026-07-03,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,830,2026-06-20
2026-07-04,C1,Nguyen Van A,Mien Nam,Bac,25-34,20-30tr,710,2026-07-04
2026-07-04,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,785,2026-07-03
2026-07-04,C3,Le Van C,Mien Trung,Vang,45-54,10-20tr,700,2026-07-04
2026-07-04,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,835,2026-06-20
2026-07-05,C1,Nguyen Van A,Mien Nam,Bac,25-34,20-30tr,712,2026-07-04
2026-07-05,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,788,2026-07-03
2026-07-05,C3,Le Van C,Mien Trung,Vang,45-54,10-20tr,702,2026-07-04
2026-07-05,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,840,2026-06-20
```

This is the trappiest table in the whole repo. **Three ways `updated_at` lies**, each breaking
something different:

| Customer | What happened | `updated_at` | What it breaks |
|---|---|---|---|
| `C1` | On 03/07 `khu_vuc` **really changed** `Mien Bac`→`Mien Nam` | **doesn't move** | trusting `updated_at` → **missing** the change |
| `C2` | On 03/07 **no column changed** | **moves** to `2026-07-03` | trusting `updated_at` → a **surplus version** |
| `C4` | `diem_tin_dung` changes **every day** | frozen since 20/06 | trusting the column → the dim bloats **5×** over one column |
| `C3` | On 04/07 `hang` `Bac`→`Vang` | moves correctly | the only case that runs smoothly |

The two columns `nhom_tuoi` and `khoang_thu_nhap` are mini-dimension material;
`diem_tin_dung` is a measure in disguise.

## `ty_gia.csv`

Daily exchange rates, two currencies.

```csv
ngay,tien_te,ty_gia
2026-07-01,USD,25400
2026-07-02,USD,25400
2026-07-03,USD,25450
2026-07-04,USD,25450
2026-07-05,USD,25500
2026-07-06,USD,25500
2026-07-07,USD,25500
2026-07-08,USD,25550
2026-07-09,USD,25600
2026-07-10,USD,25600
2026-07-01,EUR,27600
2026-07-02,EUR,27650
2026-07-03,EUR,27700
2026-07-05,EUR,27750
2026-07-06,EUR,27800
2026-07-07,EUR,27800
2026-07-08,EUR,27850
2026-07-09,EUR,27900
2026-07-10,EUR,27950
```

**The trap:** there's **no `EUR` row for `2026-07-04`** — 19 rows rather than 20. An `inner join`
on `(ngay, tien_te)` will **silently swallow** order `DN03`. The cure is an as-of join taking the nearest
preceding rate, not an equality join.

## `don_hang_ngoai_te.csv`

Orders denominated in foreign currency, kept separate from `don_hang` so the four baseline numbers don't change.

```csv
don_ngoai_id,khach_id,ngay_dat,tien_te,so_tien
DN01,C1,2026-07-01,USD,400
DN02,C2,2026-07-02,EUR,250
DN03,C3,2026-07-04,EUR,300
DN04,C4,2026-07-05,USD,150
DN05,C1,2026-07-08,USD,220
DN06,C2,2026-07-09,EUR,180
DN07,C3,2026-07-03,VND,1500000
```

**Two traps:** `DN03` falls exactly on the day the EUR rate is missing; and `DN07` is denominated in `VND` — **a base
currency absent from `ty_gia`** — so an inner join loses that row too. That's 2 of 7
orders evaporating, i.e. **28.6%** of foreign-currency revenue.

## `kho_hang.csv`

A periodic snapshot: each item's end-of-day stock, with cost of goods.

```csv
ngay,ma_hang,ton_cuoi_ngay,gia_von
2026-07-01,SP-A,93,90000
2026-07-01,SP-B,49,200000
2026-07-01,SP-C,20,650000
2026-07-01,SP-D,200,30000
2026-07-02,SP-A,90,90000
2026-07-02,SP-B,43,200000
2026-07-02,SP-C,19,650000
2026-07-02,SP-D,200,30000
2026-07-03,SP-A,80,90000
2026-07-03,SP-B,43,200000
2026-07-03,SP-C,16,650000
2026-07-03,SP-D,200,30000
2026-07-04,SP-A,79,90000
2026-07-04,SP-B,41,200000
2026-07-04,SP-C,16,650000
2026-07-04,SP-D,199,30000
2026-07-05,SP-A,78,90000
2026-07-05,SP-B,41,200000
2026-07-05,SP-C,16,650000
2026-07-05,SP-D,193,30000
```

Opening stock on 01/07: `SP-A` 100 · `SP-B` 50 · `SP-C` 20 · `SP-D` 200.

**The trap:** the stock decrease **matches** the quantity sold on every row except `SP-B` on 04/07 — it should be 40
but reads 41.

Reconciliation will report **two** divergent rows, not one: 04/07 and 05/07, because the error carries
into the following day. One cause, two symptoms. Set 7's exercise is finding the **first** divergent
row — fixing it makes both symptoms disappear at once.

This table is also a textbook semi-additive example: summing across items is right, summing across days
gives a meaningless number.

## `su_kien_web.csv`

A factless fact — 43 events, no money column at all.

```csv
su_kien_id,khach_id,thoi_diem,loai_su_kien,ma_hang,don_hang_id
E001,C1,2026-07-01 09:00:00,xem,SP-A,
E002,C1,2026-07-01 09:05:00,them_gio,SP-A,
E003,C1,2026-07-01 09:10:00,xem,SP-B,
E004,C1,2026-07-01 09:12:00,them_gio,SP-B,
E005,C1,2026-07-01 09:20:00,thanh_toan,,DH001
E006,C2,2026-07-01 14:00:00,xem,SP-A,
E007,C2,2026-07-01 14:03:00,them_gio,SP-A,
E008,C2,2026-07-01 14:10:00,thanh_toan,,DH002
E009,C1,2026-07-02 08:00:00,xem,SP-C,
E010,C1,2026-07-02 08:04:00,them_gio,SP-C,
E011,C1,2026-07-02 08:10:00,xem,SP-A,
E012,C1,2026-07-02 08:11:00,them_gio,SP-A,
E013,C1,2026-07-02 08:15:00,xem,SP-B,
E014,C1,2026-07-02 08:16:00,them_gio,SP-B,
E015,C1,2026-07-02 08:30:00,thanh_toan,,DH003
E016,C3,2026-07-02 15:00:00,xem,SP-B,
E017,C3,2026-07-02 15:02:00,them_gio,SP-B,
E018,C3,2026-07-02 15:10:00,thanh_toan,,DH004
E019,C3,2026-07-02 16:00:00,xem,SP-C,
E020,C2,2026-07-03 10:00:00,xem,SP-C,
E021,C2,2026-07-03 10:05:00,them_gio,SP-C,
E022,C2,2026-07-03 10:06:00,them_gio,SP-C,
E023,C2,2026-07-03 10:20:00,thanh_toan,,DH005
E024,C4,2026-07-03 11:00:00,xem,SP-A,
E025,C4,2026-07-03 11:02:00,them_gio,SP-A,
E026,C4,2026-07-03 11:15:00,thanh_toan,,DH006
E027,C1,2026-07-03 13:00:00,xem,SP-D,
E028,C1,2026-07-04 09:00:00,xem,SP-D,
E029,C1,2026-07-04 09:02:00,them_gio,SP-D,
E030,C1,2026-07-04 09:05:00,xem,SP-A,
E031,C1,2026-07-04 09:06:00,them_gio,SP-A,
E032,C1,2026-07-04 09:15:00,thanh_toan,,DH007
E033,C3,2026-07-04 10:00:00,xem,SP-B,
E034,C3,2026-07-04 10:01:00,them_gio,SP-B,
E035,C3,2026-07-04 10:10:00,thanh_toan,,DH008
E036,C2,2026-07-04 20:00:00,xem,SP-C,
E037,C2,2026-07-05 08:00:00,xem,SP-D,
E038,C2,2026-07-05 08:02:00,them_gio,SP-D,
E039,C2,2026-07-05 08:10:00,thanh_toan,,DH009
E040,C4,2026-07-05 09:00:00,xem,SP-A,
E041,C4,2026-07-05 09:01:00,them_gio,SP-A,
E042,C4,2026-07-05 09:30:00,thanh_toan,,DH010
E043,C1,2026-07-05 09:50:00,xem,SP-C,
```

Events per day: 01/07 **8** · 02/07 **11** · 03/07 **8** · 04/07 **9** · 05/07 **7**.

**The trap:** 05/07 is **cut off at 10:00** — it's "today", not yet full. But it's still counted
as a complete day, so every per-day `avg` gets dragged down by it. That's set 7's real-time
fact exercise.

`ma_hang` appears only on `xem`/`them_gio`, `don_hang_id` only on `thanh_toan` — no row
has both.

## `giao_dich_tai_chinh.csv`

Four transaction types in one table, each filling a different set of columns.

```csv
gd_id,ngay,khach_id,loai_gd,so_tien,ky_han_thang,lai_suat,ma_the,phi_giao_dich,don_hang_id
GD01,2026-07-01,C1,nap_tien,5000000,,,,,
GD02,2026-07-01,C2,thanh_toan_the,2400000,,,THE-9012,,DH002
GD03,2026-07-02,C1,gui_tiet_kiem,20000000,6,5.8,,,
GD04,2026-07-02,C3,nap_tien,3000000,,,,,
GD05,2026-07-03,C2,rut_tien,1000000,,,,22000,
GD06,2026-07-03,C4,thanh_toan_the,1500000,,,THE-3344,,DH006
GD07,2026-07-04,C1,thanh_toan_the,195000,,,THE-1122,,DH007
GD08,2026-07-04,C3,gui_tiet_kiem,10000000,12,6.5,,,
GD09,2026-07-05,C2,rut_tien,500000,,,,11000,
GD10,2026-07-05,C4,nap_tien,8000000,,,,,
GD11,2026-07-06,C1,rut_tien,2000000,,,,44000,
GD12,2026-07-06,C3,thanh_toan_the,900000,,,THE-5566,,
```

Which column belongs to which type:

| `loai_gd` | Columns filled | Always empty |
|---|---|---|
| `nap_tien` | `so_tien` | `ky_han_thang`, `lai_suat`, `ma_the`, `phi_giao_dich` |
| `rut_tien` | `so_tien`, `phi_giao_dich` | `ky_han_thang`, `lai_suat`, `ma_the` |
| `gui_tiet_kiem` | `so_tien`, `ky_han_thang`, `lai_suat` | `ma_the`, `phi_giao_dich` |
| `thanh_toan_the` | `so_tien`, `ma_the`, `don_hang_id` | `ky_han_thang`, `lai_suat`, `phi_giao_dich` |

**The trap:** `GD12` is a `thanh_toan_the` with **no `don_hang_id`** — a payment outside the
order system. Anybody assuming "every card payment matches an order" loses this row on an
inner join.

This is set 4's supertype/subtype exercise: keep one table full of `NULL`, split into four tables, or
use a measure type.

## Related Topics

- [Exercises — Data Modeling](index.md) — the exercise sets' index
- [Exercise set 1 — Foundations](bt-01-nen-tang.md) — the first set using these tables
