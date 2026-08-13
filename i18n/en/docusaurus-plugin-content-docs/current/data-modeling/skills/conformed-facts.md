---
title: Conformed facts — the same name must mean the same thing
sidebar_position: 15
description: "Conformed dimensions let you combine numbers along a dimension; conformed facts decide whether those two numbers are comparable."
tags: [conformed-facts, conformed-dimension, metric, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Conformed facts — the same name must mean the same thing

> **Takeaway:** [conformed dimensions](conformed-dimension.md) make two facts **combinable** along a
> dimension. Conformed facts decide whether the two combined numbers are **comparable**. Two columns
> both named `doanh_thu` with two different formulas is a worse bug than two differently named columns, because
> nobody thinks to check.

## The problem

Two marts, two teams, the same column name `doanh_thu`:

```sql
CREATE TABLE src_don AS
SELECT * FROM (VALUES
  ('D1', 1000.0, 100.0,  50.0, 30.0),
  ('D2', 2000.0, 200.0,   0.0, 30.0),
  ('D3', 1500.0, 150.0, 150.0,  0.0)
) t(so_don, tien_hang, vat, giam_gia, phi_ship);

-- Mart Ban hang: doanh thu = tien hang - giam gia
CREATE VIEW mart_ban_hang AS
SELECT so_don, tien_hang - giam_gia AS doanh_thu FROM src_don;

-- Mart Tai chinh: doanh thu = tien hang - giam gia + VAT + phi ship
CREATE VIEW mart_tai_chinh AS
SELECT so_don, tien_hang - giam_gia + vat + phi_ship AS doanh_thu FROM src_don;
```

Both definitions are **correct in their own context**. The sales team excludes VAT because VAT
isn't the company's money; the finance team totals the money coming into the account. Neither is wrong.

```sql
SELECT (SELECT sum(doanh_thu) FROM mart_ban_hang)  AS doanh_thu_mart_ban_hang,
       (SELECT sum(doanh_thu) FROM mart_tai_chinh) AS doanh_thu_mart_tai_chinh,
       (SELECT sum(doanh_thu) FROM mart_tai_chinh)
     - (SELECT sum(doanh_thu) FROM mart_ban_hang)  AS chenh,
       round(100.0 * ((SELECT sum(doanh_thu) FROM mart_tai_chinh)
                    - (SELECT sum(doanh_thu) FROM mart_ban_hang))
             / (SELECT sum(doanh_thu) FROM mart_ban_hang), 1) AS lech_pct;
```

```text
┌─────────────────────────┬──────────────────────────┬───────┬──────────┐
│ doanh_thu_mart_ban_hang │ doanh_thu_mart_tai_chinh │ chenh │ lech_pct │
├─────────────────────────┼──────────────────────────┼───────┼──────────┤
│                  4300.0 │                   4810.0 │ 510.0 │     11.9 │
└─────────────────────────┴──────────────────────────┴───────┴──────────┘
```

**11.9% apart** between two tables in the same company, for the same month, from the same source.

### Where it goes from annoying to dangerous

The discrepancy is at least visible. What isn't visible is when somebody **takes the numerator from one mart
and the denominator from the other**:

```sql
WITH x AS (
  SELECT (SELECT sum(doanh_thu) FROM mart_ban_hang)  AS ban_hang,
         (SELECT sum(doanh_thu) FROM mart_tai_chinh) AS tai_chinh
)
SELECT round(100.0 * ban_hang / tai_chinh, 1) AS "ty_le_%_tuong_nhu_co_nghia" FROM x;
```

```text
┌────────────────────────────┐
│ ty_le_%_tuong_nhu_co_nghia │
├────────────────────────────┤
│                       89.4 │
└────────────────────────────┘
```

**89.4%** — a number that looks perfectly plausible, sits inside the expected range, and **measures
nothing at all**. It's only measuring the share taken by VAT and shipping, wearing a "conversion rate" label.

No test catches a ratio that sits inside a plausible range.

## The conditions for a conformed fact

Per Kimball, two facts **conform** when all four of the following hold:

| Condition | How to check it |
|---|---|
| The same **business definition** | Write the formulas out, put them side by side, read them aloud |
| The same **unit** | Currency, unit of measure — see [multiple currencies](multi-currency-uom.md) |
| The same **recognition moment** | At order time, at delivery, or at payment |
| The same **exception handling** | Whether cancelled, returned and internal orders count |

Fail **one** of them and you are **obliged to rename**. This is the shortest rule in all of
dimensional modeling:

> **If it doesn't conform, it can't share the name.**

Renaming isn't a failure — it's the only way for a reader to know what they're holding.

## The approach

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

Both metrics live in one place, generated from the same row set, and **the constituent components
are present too**. That's the important part: keeping `vat`, `phi_ship` and `giam_gia` as their own columns lets
any future definition be recomputed without touching the source.

### Step 2 — a closed-loop reconciliation

The two metrics must differ by **exactly** the explainable components, no more and no less:

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

The last column being 0 is worth making a test. It can't be 0 by accident, and it
turns *"two teams got two numbers"* from an argument into a subtraction.

### Step 3 — a metric registry

Metric definitions must be **queryable data**, not oral tradition:

```sql
CREATE TABLE dang_ky_chi_so AS
SELECT * FROM (VALUES
  ('doanh_thu_thuan',     'tien_hang - giam_gia',                  'Ban hang, Marketing'),
  ('tong_tien_khach_tra', 'tien_hang - giam_gia + vat + phi_ship', 'Tai chinh, CSKH'),
  ('vat',                 'thue GTGT dau ra',                      'Tai chinh')
) t(ten_chi_so, cong_thuc, ai_dung);
```

```text
┌─────────────────────┬───────────────────────────────────────┬─────────────────────┐
│     ten_chi_so      │               cong_thuc               │       ai_dung       │
├─────────────────────┼───────────────────────────────────────┼─────────────────────┤
│ doanh_thu_thuan     │ tien_hang - giam_gia                  │ Ban hang, Marketing │
│ tong_tien_khach_tra │ tien_hang - giam_gia + vat + phi_ship │ Tai chinh, CSKH     │
│ vat                 │ thue GTGT dau ra                      │ Tai chinh           │
└─────────────────────┴───────────────────────────────────────┴─────────────────────┘
```

In dbt, this table's natural home is `schema.yml` (column descriptions) or the semantic layer —
as long as it lives **in the same repo as the code computing the metric**, so the two don't drift apart.

## The relationship to conformed dimensions

The two techniques solve two halves of the same problem:

| | Conformed dimensions | Conformed facts |
|---|---|---|
| Answers | Can two facts be **combined** | Are the two combined numbers **comparable** |
| When wrong | The cross-cutting question is impossible | There's an answer, and it's wrong |
| Detection | Easy — the join returns no rows | **Hard** — the numbers still look fine |
| See | [Conformed dimensions](conformed-dimension.md) | This file |

The second half is more dangerous for exactly that reason: without conformed dimensions you *know* you're
stuck. Without conformed facts you have a number and you believe it.

## Trade-offs

| You get | You lose |
|---|---|
| Two teams' numbers become comparable | You must negotiate definitions — a human job, not SQL's |
| Renaming makes the intent clear so nobody confuses them | Longer names (`doanh_thu_thuan` instead of `doanh_thu`) |
| Keeping the constituent components | The fact gets a few columns wider |
| The closed-loop reconciliation becomes a test | You have to write and maintain that test |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Two marts with the same `doanh_thu` column and different formulas | The numbers are 12% apart and nobody knows which to trust — [case study](../case-studies/hai-phong-hai-doanh-thu.md) |
| Taking the numerator from one mart and the denominator from another | A plausible, meaningless ratio |
| Storing only the result and dropping the components | You can't recompute when the definition changes |
| Definitions living in people's heads | Somebody leaving loses the definition |
| Conforming the dimensions and considering it done | Combinable but not comparable |
| The same name with a different recognition moment | It diverges seasonally and looks like a business trend |

## Related Topics

- [Conformed dimensions](conformed-dimension.md) — the other half of the integration problem
- [Bus architecture and the bus matrix](../reference/bus-architecture.md) — where you declare what must conform
- [Multiple currencies and units of measure](multi-currency-uom.md) — the same unit is one of the four conditions
- [CS: two departments, two revenue figures](../case-studies/hai-phong-hai-doanh-thu.md)
- [CS: two marts that couldn't be joined](../case-studies/hai-mart-khong-ghep-duoc.md)

## References

- Kimball Group — [Conformed Facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapter 4
