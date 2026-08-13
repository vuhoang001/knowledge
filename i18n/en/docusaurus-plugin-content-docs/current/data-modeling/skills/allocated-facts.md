---
title: Header/line and fact allocation
sidebar_position: 17
description: "Duplicating an order-level measure down to the line level makes SUM inflate by the line count; allocating by weight keeps the total correct and unlocks P&L by product."
tags: [allocated-facts, header-line, profit-and-loss, grain, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Header/line and fact allocation

> **Takeaway:** an order has measures at **two levels** — the shipping fee belongs to the whole order, the goods
> amount to each line. Duplicating the higher-level number downwards guarantees a wrong `SUM`. The only way to keep
> both a fine grain and a correct total is **allocation by weight**.

## The problem

```sql
CREATE TABLE src_header AS
SELECT * FROM (VALUES ('DH-001', 100000), ('DH-002', 50000)) t(so_don, phi_ship);

CREATE TABLE src_line AS
SELECT * FROM (VALUES
  ('DH-001', 1, 'SP-A', 600000),
  ('DH-001', 2, 'SP-B', 300000),
  ('DH-001', 3, 'SP-C', 100000),
  ('DH-002', 1, 'SP-A', 500000)
) t(so_don, dong_so, san_pham, tien_hang);
```

The truth: **150,000 of shipping**, 1,500,000 of goods.

Three ways to build it, and only one is correct:

| Approach | Grain | The problem |
|---|---|---|
| Two separate facts, joined when needed | Two grains | Joining two facts of different grain → inflation, see the [case study](../case-studies/join-hai-fact-lam-phong-tong.md) |
| One line-grain fact with the header **duplicated** | Order line | `SUM(phi_ship)` inflates by the line count |
| One line-grain fact with the header **allocated** | Order line | The approach Kimball recommends |

### How the duplicating approach fails

```sql
CREATE TABLE fct_sai AS
SELECT l.so_don, l.dong_so, l.san_pham, l.tien_hang, h.phi_ship
FROM src_line l JOIN src_header h USING (so_don);

SELECT sum(tien_hang) AS tien_hang, sum(phi_ship) AS phi_ship_bao_cao,
       sum(phi_ship) - (SELECT sum(phi_ship) FROM src_header) AS phong_them,
       round(100.0 * (sum(phi_ship) - (SELECT sum(phi_ship) FROM src_header))
             / (SELECT sum(phi_ship) FROM src_header), 1) AS phong_pct
FROM fct_sai;
```

```text
┌───────────┬──────────────────┬────────────┬───────────┐
│ tien_hang │ phi_ship_bao_cao │ phong_them │ phong_pct │
├───────────┼──────────────────┼────────────┼───────────┤
│   1500000 │           350000 │     200000 │     133.3 │
└───────────┴──────────────────┴────────────┴───────────┘
```

`tien_hang` is correct while `phi_ship` is **133% inflated**. The same table with one column right and one wrong —
that's what makes it hard to detect: whoever checks sees revenue match and trusts the whole table.

Order `DH-001` has 3 lines, so its 100,000 shipping fee is counted three times.

## The approach — allocation by weight

```sql
CREATE TABLE fct_dung AS
SELECT l.so_don, l.dong_so, l.san_pham, l.tien_hang,
       round(h.phi_ship::DOUBLE * l.tien_hang
             / sum(l.tien_hang) OVER (PARTITION BY l.so_don), 0) AS phi_ship_phan_bo
FROM src_line l JOIN src_header h USING (so_don);
```

```text
┌─────────┬─────────┬──────────┬───────────┬──────────────────┐
│ so_don  │ dong_so │ san_pham │ tien_hang │ phi_ship_phan_bo │
├─────────┼─────────┼──────────┼───────────┼──────────────────┤
│ DH-001  │       1 │ SP-A     │    600000 │          60000.0 │
│ DH-001  │       2 │ SP-B     │    300000 │          30000.0 │
│ DH-001  │       3 │ SP-C     │    100000 │          10000.0 │
│ DH-002  │       1 │ SP-A     │    500000 │          50000.0 │
└─────────┴─────────┴──────────┴───────────┴──────────────────┘
```

```sql
SELECT sum(phi_ship_phan_bo) AS tong_phan_bo,
       (SELECT sum(phi_ship) FROM src_header) AS tong_that,
       sum(phi_ship_phan_bo) - (SELECT sum(phi_ship) FROM src_header) AS chenh_lam_tron
FROM fct_dung;
```

```text
┌──────────────┬───────────┬────────────────┐
│ tong_phan_bo │ tong_that │ chenh_lam_tron │
├──────────────┼───────────┼────────────────┤
│     150000.0 │    150000 │            0.0 │
└──────────────┴───────────┴────────────────┘
```

**Correct summed along any dimension** — by product, by month, by region. The measure is now
additive at line-item grain, exactly as [additivity](../reference/fact-and-dimension.md) requires.

And a question that was previously unanswerable is now answerable:

```sql
SELECT san_pham, sum(tien_hang) AS tien_hang, sum(phi_ship_phan_bo) AS phi_ship,
       round(100.0 * sum(phi_ship_phan_bo) / sum(tien_hang), 2) AS ty_le_phi_pct
FROM fct_dung GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌──────────┬───────────┬──────────┬───────────────┐
│ san_pham │ tien_hang │ phi_ship │ ty_le_phi_pct │
├──────────┼───────────┼──────────┼───────────────┤
│ SP-A     │   1100000 │ 110000.0 │          10.0 │
│ SP-B     │    300000 │  30000.0 │          10.0 │
│ SP-C     │    100000 │  10000.0 │          10.0 │
└──────────┴───────────┴──────────┴───────────────┘
```

### Choosing the allocation basis

Weighting by goods amount is the default, not always the right answer. The basis must reflect **what
actually causes the cost**:

| The header measure | A sensible basis | Why |
|---|---|---|
| Shipping cost | Weight or volume | Carriers charge by weight, not by value |
| Order-wide discount | Goods amount | A discount is computed on value |
| Packaging cost | Item count | Each item is one operation |
| Sales commission | Goods amount | That's how commission is computed |

Choosing the basis is a **business decision**, not a technical one. Record the reason next to
the code — six months later nobody remembers why goods amount was chosen over weight.

**The immovable rule:** whatever basis you choose, `sum(phan_bo)` must equal the original total. Rounding error
goes to each order's largest line.

## P&L by product — allocation on top of allocation

Kimball makes *profit and loss fact tables using allocations* its own section because it's the hardest
application of this technique: **overhead belongs to no order at all** (office salaries,
warehouse rent, brand marketing) and yet must appear in each product's
profit.

```sql
CREATE TABLE chi_phi_chung AS SELECT 300000 AS chi_phi_van_hanh;
CREATE TABLE gia_von AS
SELECT * FROM (VALUES ('SP-A', 0.60), ('SP-B', 0.75), ('SP-C', 0.50)) t(san_pham, ty_le_gia_von);
```

```text
┌──────────┬───────────┬───────────────┬──────────┬───────────────────────┬───────────┐
│ san_pham │ doanh_thu │    gia_von    │ phi_ship │ chi_phi_chung_phan_bo │ loi_nhuan │
├──────────┼───────────┼───────────────┼──────────┼───────────────────────┼───────────┤
│ SP-A     │   1100000 │        660000 │ 110000.0 │              220000.0 │  110000.0 │
│ SP-C     │    100000 │         50000 │  10000.0 │               20000.0 │   20000.0 │
│ SP-B     │    300000 │        225000 │  30000.0 │               60000.0 │  -15000.0 │
└──────────┴───────────┴───────────────┴──────────┴───────────────────────┴───────────┘
```

**`SP-B` loses 15,000** despite 300,000 of revenue — a 75% cost of goods plus overhead pushes it
negative. This is exactly the kind of conclusion only an allocated P&L can produce, and it usually
overturns product-portfolio decisions.

The mandatory reconciliation — the total per-product profit must equal the profit computed in one lump:

```text
┌───────────┬───────────────┬──────────┬───────────────┬────────────────┐
│ doanh_thu │    gia_von    │ phi_ship │ chi_phi_chung │ loi_nhuan_tong │
├───────────┼───────────────┼──────────┼───────────────┼────────────────┤
│   1500000 │        935000 │ 150000.0 │        300000 │       115000.0 │
└───────────┴───────────────┴──────────┴───────────────┴────────────────┘
```

110,000 + 20,000 − 15,000 = **115,000**. Matching.

**The warning Kimball emphasises:** a per-product profit figure is only trustworthy **to the extent the allocation
basis is**. Change the basis and `SP-B` may become profitable. So an allocated P&L table
must always come with a visible `chi_phi_chung_phan_bo` column — so the reader sees which part is
actually measured and which part is convention.

## Trade-offs

| You get | You lose |
|---|---|
| One fact, one grain, correct summed along any dimension | You must choose and defend an allocation basis |
| P&L down to product level | The figure depends on a convention and is easily disputed |
| No joining of two facts of different grain | Rounding error must be handled |
| The header numbers stay queryable (keep the original table) | The same measure stored in two places |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Duplicating the header number onto every line | `SUM` inflates by the line count — [case study](../case-studies/phi-ship-phong-133-phan-tram.md) |
| Allocating without reconciling the total | Rounding error accumulates |
| Splitting evenly instead of by weight | A 10,000đ line bears the same fee as a 1-million one |
| Not recording why the basis was chosen | Six months later nobody can defend the figure |
| Mixing allocated cost with direct cost in one column | You can't separate the measured part from the conventional one |
| Treating an allocated P&L as absolute truth | Cutting a product on the basis of a convention |

## Related Topics

- [Grain](../reference/grain.md) — why you must never mix two grains in one table
- [Degenerate dimensions](degenerate-dimension.md) — `so_don` is what links the header to the lines
- [Bridge tables](bridge-table.md) — the same allocation-factor mechanism for many-to-many relationships
- [Facts and dimensions](../reference/fact-and-dimension.md) — additivity after allocation
- [CS: the shipping fee 133% inflated](../case-studies/phi-ship-phong-133-phan-tram.md)
- [CS: joining two facts inflating the total](../case-studies/join-hai-fact-lam-phong-tong.md)

## References

- Kimball Group — [Header/Line Fact Tables · Allocated Facts · Profit and Loss Fact Tables Using Allocations](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapters 6 and 7
