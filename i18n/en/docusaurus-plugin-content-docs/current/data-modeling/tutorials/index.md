---
title: Exercises — Data Modeling
sidebar_key: data-modeling-tutorials
sidebar_position: 0
description: "Really run, with boxes to paste output into. If you couldn't run it, you haven't learnt it."
tags: [tutorial, data-modeling]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Exercises — Data Modeling

Really run, with boxes to paste output into. If you couldn't run it, you haven't learnt it.

> **Three tiers, three roles.** Exercises 1–7 are **diagnostic labs** — the trap is laid out and then explained.
> Exercise 8 is **26 self-marked exercises** on the original seed. Exercises 9–16 are **a set covering all 29
> techniques**, each with a question, a real answer figure, and a hidden solution.
>
> The recommended path: the labs (1–7) → self-marking (8) → the full set (10–16), consulting the seed in exercise 9.

## Tiers 1–2 — the diagnostic labs and the self-marked exercises

| # | Exercise | What you can do afterwards | Duration |
|---|---|---|---|
| 1 | [Building a star schema from scratch with DuckDB](star-schema-duckdb.md) | Walk all four design steps on real data: `dim_ngay`, a Type 2 dimension, a transaction fact, an accumulating snapshot, drilling across — with the four mandatory checks | ~20 min |
| 2 | [SCD Type 2 with a dbt snapshot](scd-bang-dbt-snapshot.md) | Build Type 2 with `dbt snapshot`, then break it yourself: the theoretically correct as-was join returns **0 rows** — and why | ~30 min |
| 3 | [The foundations lab — four ways to inflate a number](lab-nen-tang-grain-fact-dim.md) | Reproduce then fix: mixed grain (+77.5%), joining two facts, a dim with the fact's grain (+44.1%), joining Type 2 by natural key (+26.9%) | ~40 min |
| 4 | [The dimension lab — four ways to lose rows](lab-dimension.md) | A `NULL` key losing 17.3%, a `<>` filter swallowing rows, a flattened tree abandoning shallow branches | ~40 min |
| 5 | [The advanced-fact lab — allocation, running totals, summary tables](lab-fact-nang-cao.md) | A 1đ rounding error, a YTD column 3.38× inflated, avg-of-avg 5.7% out, a 7-key centipede | ~50 min |
| 6 | [The integration lab — combinable, but comparable?](lab-tich-hop.md) | Two revenue definitions 3.9% apart; a three-pass drill-across; the bus matrix as a measurable table | ~40 min |
| 7 | [The operations lab — how long does it take to know the numbers are wrong](lab-van-hanh.md) | A duplicate load inflating 25%; without auditing, deleting 10 rows to kill 5; the hot partition | ~40 min |
| 8 | [**26 exercises with answer figures**](bai-tap-co-dap-so.md) | **You write it, the answer is given, the solution is hidden** — self-marking with nobody to ask | ~90 min |

## Tier 3 — the exercise set covering all 29 techniques

Each set practises 3–5 techniques, with 4–6 exercises per technique. Every exercise has the same structure:
**the question** → **the answer figure to produce** (real DuckDB output) → **the solution** hidden in a `<details>`.

| # | Set | Techniques covered | Exercises |
|---|---|---|---|
| 9 | [The seed appendix](bt-00-seed.md) | ten new tables and each one's deliberate trap | 🗂️ reference |
| 10 | [Set 1 — Foundations](bt-01-nen-tang.md) | grain · fact/dimension · surrogate keys · star/snowflake/OBT · the 4-step process | 23 |
| 11 | [Set 2 — Dimensions over time](bt-02-dimension-thoi-gian.md) | SCD 1/2/3/6 · change detection · mini-dimensions · role-playing · late-arriving data | 22 |
| 12 | [Set 3 — Columns and tables](bt-03-cot-va-bang.md) | junk dimensions · degenerate · centipede · attribute design · NULL | 23 |
| 13 | [Set 4 — Relationships and trees](bt-04-quan-he-va-cay.md) | bridge tables · hierarchies · heterogeneous entities | 16 |
| 14 | [Set 5 — Advanced facts](bt-05-fact-nang-cao.md) | allocation · YTD/timespan · summary tables · behaviour in a dimension | 19 |
| 15 | [Set 6 — Integration](bt-06-tich-hop.md) | conformed dimensions · conformed facts · the bus matrix · multi-currency | 18 |
| 16 | [Set 7 — Operations](bt-07-van-hanh.md) | the date dimension · audit dimensions · real-time facts | 14 |

**135 exercises, covering all 7 documents in `reference/` and the 22 skills in `skills/`.** Look up
technique → exercise in the table below.

## Which technique is practised where

| Technique | Set |
|---|---|
| [Grain](../reference/grain.md) · [Facts and dimensions](../reference/fact-and-dimension.md) · [Surrogate keys](../reference/surrogate-key.md) · [Star/snowflake/OBT](../reference/star-snowflake-obt.md) · [The 4-step process](../reference/design-process.md) | [Set 1](bt-01-nen-tang.md) |
| [SCD](../skills/scd.md) · [Change detection](../skills/scd-change-detection.md) · [Mini-dimensions](../skills/mini-dimension.md) · [Role-playing](../skills/role-playing-dimension.md) · [Late-arriving data](../skills/late-arriving.md) | [Set 2](bt-02-dimension-thoi-gian.md) |
| [Junk dimensions](../skills/junk-dimension.md) · [Degenerate](../skills/degenerate-dimension.md) · [Centipede](../skills/centipede-fact.md) · [Dimension attributes](../skills/dimension-attribute-design.md) · [NULL](../skills/null-handling.md) | [Set 3](bt-03-cot-va-bang.md) |
| [Bridge tables](../skills/bridge-table.md) · [Hierarchies](../skills/hierarchy.md) · [Heterogeneous entities](../skills/heterogeneous-schema.md) | [Set 4](bt-04-quan-he-va-cay.md) |
| [Fact allocation](../skills/allocated-facts.md) · [YTD and timespan](../skills/ytd-timespan-facts.md) · [Aggregate facts](../skills/aggregate-fact-table.md) · [Behaviour in a dimension](../skills/behavior-dimension.md) | [Set 5](bt-05-fact-nang-cao.md) |
| [Conformed dimensions](../skills/conformed-dimension.md) · [Conformed facts](../skills/conformed-facts.md) · [Bus architecture](../reference/bus-architecture.md) · [Multi-currency](../skills/multi-currency-uom.md) | [Set 6](bt-06-tich-hop.md) |
| [The date dimension](../reference/date-dimension.md) · [Audit dimensions](../skills/audit-dimension.md) · [Real-time facts](../skills/real-time-fact.md) | [Set 7](bt-07-van-hanh.md) |

The labs run in a venv outside the repo: `~/Documents/learn-lab/dbt/.venv/bin/python`. Every SQL statement is
self-contained, so pasting it straight into DuckDB runs.

**An empty *Your result* box means it hasn't been run.** Only fill in `verified_at` once it has.

## The data shared by labs 2–7

The tier-3 exercise set uses **ten further tables** — the full contents and each table's trap are in
[the seed appendix](bt-00-seed.md). The five original tables below are still the foundation, and **the four
landmark numbers never change**.

The lab code lives **outside the repo** (`~/Documents/learn-lab/dbt`, see `CLAUDE.md`), so the seed contents are
copied here to make it rebuildable from zero. The four original numbers to remember:

```text
10 don · 15 dong · doanh thu 10.215.000 · phi ship 400.000
```

<details>
<summary><code>seeds/khach_hang.csv</code> — the source of the SCD snapshot</summary>

```csv
khach_id,ho_ten,khu_vuc,hang
C1,Nguyen Van A,Mien Bac,Bac
C2,Tran Thi B,Mien Nam,Vang
C3,Le Van C,Mien Trung,Bac
C4,Pham Thi D,Mien Bac,Kim cuong
```

`C1` is the customer used to demonstrate Type 2 — lab 2 changes `Mien Bac` → `Mien Nam`.

</details>

<details>
<summary><code>seeds/don_hang.csv</code> — the header, with a shipping fee and undelivered orders</summary>

```csv
don_hang_id,khach_id,ngay_dat,ngay_giao,ngay_nhan,trang_thai,phi_ship
DH001,C1,2026-07-01,2026-07-03,2026-07-05,hoan_thanh,60000
DH002,C2,2026-07-01,2026-07-02,2026-07-04,hoan_thanh,30000
DH003,C1,2026-07-02,2026-07-05,2026-07-09,hoan_thanh,90000
DH004,C3,2026-07-02,2026-07-04,,dang_giao,30000
DH005,C2,2026-07-03,2026-07-06,2026-07-08,hoan_thanh,45000
DH006,C4,2026-07-03,,,moi,30000
DH007,C1,2026-07-04,2026-07-07,2026-07-10,hoan_thanh,25000
DH008,C3,2026-07-04,2026-07-06,,dang_giao,30000
DH009,C2,2026-07-05,,,moi,30000
DH010,C4,2026-07-05,2026-07-08,2026-07-11,hoan_thanh,30000
```

Two deliberate traps: `phi_ship` is at **order level** (lab 3 exercise 2, lab 5 exercise 1), and `DH006`/`DH009`
are **undelivered** → an empty `ngay_giao` (lab 4 exercise 1).

</details>

<details>
<summary><code>seeds/tra_hang.csv</code> — a second fact for drilling across</summary>

```csv
ma_tra,don_hang_id,ngay_tra,gia_tri_tra
TR01,DH003,2026-07-12,300000
TR02,DH003,2026-07-15,150000
TR03,DH005,2026-07-14,900000
TR04,DH010,2026-07-16,150000
```

The trap: `DH003` was returned **twice** → joining the two facts directly doubles it (lab 3 exercise 3).

</details>

`seeds/don_hang_chi_tiet.csv` (15 rows) and `seeds/hang_hoa.csv` already exist in the lab from
earlier — see [the dbt exercises](../../etl/dbt/tutorials/dbt-lab-duckdb.md).

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

## Related Topics

- [Data Modeling](../index.md) — the topic this directory belongs to
