---
title: Two departments, two revenue numbers, the same column named "doanh_thu"
sidebar_position: 16
description: "The sales mart and the finance mart are each correct by their own definition; together they differ by 11.9%, and a ratio computed across the two means nothing."
tags: [case-study, conformed-facts, metric, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Two departments, two revenue numbers, the same column named `doanh_thu`

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** [conformed dimensions](../skills/conformed-dimension.md) make two marts **joinable**.
> Without [conformed facts](../skills/conformed-facts.md) they're joinable but
> **not comparable** — and that's a far more dangerous state than being stuck.

## Context

Two marts, built six months apart, by two different teams, from the same source table.

```sql
CREATE TABLE src_don AS
SELECT * FROM (VALUES
  ('D1', 1000.0, 100.0,  50.0, 30.0),
  ('D2', 2000.0, 200.0,   0.0, 30.0),
  ('D3', 1500.0, 150.0, 150.0,  0.0)
) t(so_don, tien_hang, vat, giam_gia, phi_ship);

CREATE VIEW mart_ban_hang  AS SELECT so_don, tien_hang - giam_gia AS doanh_thu FROM src_don;
CREATE VIEW mart_tai_chinh AS SELECT so_don, tien_hang - giam_gia + vat + phi_ship AS doanh_thu FROM src_don;
```

Both teams did their own job correctly. Sales excludes VAT because it isn't the company's money;
finance totals the actual money hitting the account. **Neither is wrong.**

## Symptoms

At the management meeting, two slides, two numbers for last month:

```text
┌─────────────────────────┬──────────────────────────┬───────┬──────────┐
│ doanh_thu_mart_ban_hang │ doanh_thu_mart_tai_chinh │ chenh │ lech_pct │
├─────────────────────────┼──────────────────────────┼───────┼──────────┤
│                  4300.0 │                   4810.0 │ 510.0 │     11.9 │
└─────────────────────────┴──────────────────────────┴───────┴──────────┘
```

A gap of **11.9%**. But that isn't the worst part.

A week later somebody builds a "revenue conversion rate" dashboard, taking the numerator from the sales
mart and the denominator from the finance mart:

```text
┌────────────────────────────┐
│ ty_le_%_tuong_nhu_co_nghia │
├────────────────────────────┤
│                       89.4 │
└────────────────────────────┘
```

**89.4%** — comfortably inside the expected range, stable across months, and **measuring
nothing at all**. It's measuring the share of VAT and shipping fees in the gross amount.

That metric runs for six months before anybody asks for its formula.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| One mart loaded incompletely | `count(*)` matches on both sides, and matches the source |
| Different data periods (one a day behind) | Same date range, same row count |
| One side filters out cancelled orders | There are no cancelled orders in the period |
| A rounding error | 510 out of 4,300 — far too large for rounding |
| One side computes it wrongly | **Wrong** — both compute their own formula correctly |

Where the longest stretch of time goes: everybody looks for **which side is wrong**. Neither is. The right
question is *"are the two sides measuring two different things?"* — and that question only gets asked once
somebody puts the two definitions side by side.

## The real cause

Two columns with the same name `doanh_thu`, two formulas:

```text
mart_ban_hang  : tien_hang - giam_gia
mart_tai_chinh : tien_hang - giam_gia + vat + phi_ship
```

The gap of **510 = VAT 450 + shipping 60** — 100% explained.

The problem isn't that two definitions exist; every business has several notions of
revenue. The problem is that **they share a name**, so nobody thinks to check.

Had the two columns been named `doanh_thu_thuan` and `tong_tien_khach_tra`, the dashboard's author would
have stopped in the first second.

## Why no test catches it

| Test | The result |
|---|---|
| Each mart matching the source table | ✅ green on both |
| `not_null`, `unique` on the keys | ✅ green |
| `doanh_thu > 0` | ✅ green |
| The conversion rate lying within `[0, 100]` | ✅ green — **89.4 is perfectly valid** |
| The two marts sharing one definition of `doanh_thu` | ❌ — **no such test concept exists** |

The fourth row is the crux: a metric that's **wrong but inside a plausible range** can't be caught by any
threshold-style test. Data tests check data; they can't check **meaning**.

## The fix

### Step 1 — two concepts, two names, one table

```sql
CREATE TABLE fct_ban AS
SELECT so_don, tien_hang, giam_gia, vat, phi_ship,
       tien_hang - giam_gia                  AS doanh_thu_thuan,
       tien_hang - giam_gia + vat + phi_ship AS tong_tien_khach_tra
FROM src_don;
```

```text
┌─────────────────┬─────────────────────┬───────┬──────────┬──────────┐
│ doanh_thu_thuan │ tong_tien_khach_tra │  vat  │ phi_ship │ giam_gia │
├─────────────────┼─────────────────────┼───────┼──────────┼──────────┤
│          4300.0 │              4810.0 │ 450.0 │     60.0 │    200.0 │
└─────────────────┴─────────────────────┴───────┴──────────┴──────────┘
```

Keep the constituent parts as well — so the third definition, when it arrives, needn't
change the source.

### Step 2 — turn the gap into a subtraction

```sql
SELECT sum(tong_tien_khach_tra) - sum(doanh_thu_thuan) AS chenh_thuc_te,
       sum(vat) + sum(phi_ship)                        AS chenh_giai_thich_duoc,
       sum(tong_tien_khach_tra) - sum(doanh_thu_thuan)
     - (sum(vat) + sum(phi_ship))                      AS con_lai_khong_giai_thich_duoc
FROM fct_ban;
```

```text
┌───────────────┬───────────────────────┬───────────────────────────────┐
│ chenh_thuc_te │ chenh_giai_thich_duoc │ con_lai_khong_giai_thich_duoc │
├───────────────┼───────────────────────┼───────────────────────────────┤
│         510.0 │                 510.0 │                           0.0 │
└───────────────┴───────────────────────┴───────────────────────────────┘
```

The last column being 0 is **the test to set up**. It can't be 0 by accident, and it turns the story of
"two teams arguing" into one CI line.

### Step 3 — a metric registry

```text
┌─────────────────────┬───────────────────────────────────────┬─────────────────────┐
│     ten_chi_so      │               cong_thuc               │       ai_dung       │
├─────────────────────┼───────────────────────────────────────┼─────────────────────┤
│ doanh_thu_thuan     │ tien_hang - giam_gia                  │ Ban hang, Marketing │
│ tong_tien_khach_tra │ tien_hang - giam_gia + vat + phi_ship │ Tai chinh, CSKH     │
│ vat                 │ thue GTGT dau ra                      │ Tai chinh           │
└─────────────────────┴───────────────────────────────────────┴─────────────────────┘
```

## How to spot it early

1. **The same column name appearing in several marts** — check via metadata, no code reading needed:

```sql
SELECT column_name, count(DISTINCT table_name) AS so_bang, list(table_name) AS o_dau
FROM information_schema.columns
WHERE column_name IN ('doanh_thu','revenue','gmv')
GROUP BY 1 HAVING count(DISTINCT table_name) > 1;
```

2. Ask two people in two departments *"does revenue include VAT"* and get two answers.

3. Any metric that's **a ratio between two different tables** — each one deserves a check.

4. Nowhere records a metric's formula other than the SQL code.

## Related Topics

- [Conformed facts](../skills/conformed-facts.md) — the four conditions for two facts to be comparable
- [Conformed dimensions](../skills/conformed-dimension.md) — the other half of the problem
- [Bus architecture and the bus matrix](../reference/bus-architecture.md) — where you declare what must conform
- [CS: two marts that can't be joined](hai-mart-khong-ghep-duoc.md) — a missing conformed dimension
