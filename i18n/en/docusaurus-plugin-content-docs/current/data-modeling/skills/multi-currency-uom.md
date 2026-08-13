---
title: Multiple currencies and multiple units of measure
sidebar_position: 12
description: "A measure with a unit makes the number column alone meaningless: freeze both the original and the converted value into the fact; don't convert at read time."
tags: [multi-currency, unit-of-measure, fact, additivity, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Multiple currencies and multiple units of measure

> **Takeaway:** a numeric column with no unit attached will `SUM` **successfully** and **usually
> meaninglessly**. The cure is the same for currencies and units of measure: the fact freezes **two numbers** —
> the original value in the business unit, and the value converted into the standard unit, converted
> with the factor **as of the transaction date**.

## The problem — two different bugs

### Bug 1: summing straight across several units

```sql
CREATE TABLE fct_ban_tho AS
SELECT * FROM (VALUES
  ('O1', DATE '2026-01-10', 'VND', 24000000.0),
  ('O2', DATE '2026-01-15', 'USD',     1000.0),
  ('O3', DATE '2026-02-20', 'VND', 48000000.0)
) t(so_don, ngay, tien_te, so_tien);

SELECT sum(so_tien) AS "tong_(khong_co_don_vi)", count(DISTINCT tien_te) AS so_loai_tien
FROM fct_ban_tho;
```

```text
┌────────────────────────┬──────────────┐
│ tong_(khong_co_don_vi) │ so_loai_tien │
├────────────────────────┼──────────────┤
│             72001000.0 │            2 │
└────────────────────────┴──────────────┘
```

**72,001,000** — what unit is that number in? None at all. But it's a valid number,
renders beautifully on a dashboard, and nothing warns you. This is the most dangerous bug in this
group because it **never errors**.

### Bug 2: converting at read time with today's rate

Having avoided bug 1, the usual fix is to keep the exchange rates in a separate table and join at
report time. Join to the **current** rate by mistake and the past starts moving.

```sql
CREATE TABLE ty_gia AS
SELECT * FROM (VALUES
  (DATE '2026-01-01', 'VND', 24000.0),
  (DATE '2026-02-01', 'VND', 25000.0),
  (DATE '2026-08-01', 'VND', 30000.0),
  (DATE '2026-01-01', 'USD',     1.0),
  (DATE '2026-02-01', 'USD',     1.0),
  (DATE '2026-08-01', 'USD',     1.0)
) t(thang, tien_te, doi_ra_usd);
```

January's revenue in USD, computed two ways:

```sql
WITH luc_gd AS (
  SELECT sum(f.so_tien / g.doi_ra_usd) AS usd
  FROM fct_ban_tho f JOIN ty_gia g
    ON g.tien_te = f.tien_te AND g.thang = date_trunc('month', f.ngay)
  WHERE date_trunc('month', f.ngay) = DATE '2026-01-01'
), hom_nay AS (
  SELECT sum(f.so_tien / g.doi_ra_usd) AS usd
  FROM fct_ban_tho f JOIN ty_gia g
    ON g.tien_te = f.tien_te AND g.thang = DATE '2026-08-01'
  WHERE date_trunc('month', f.ngay) = DATE '2026-01-01'
)
SELECT round((SELECT usd FROM luc_gd), 2)  AS thang1_usd_luc_gd,
       round((SELECT usd FROM hom_nay), 2) AS thang1_usd_ty_gia_hom_nay,
       round(100.0 * ((SELECT usd FROM hom_nay) - (SELECT usd FROM luc_gd))
             / (SELECT usd FROM luc_gd), 1) AS lech_pct;
```

```text
┌───────────────────┬───────────────────────────┬──────────┐
│ thang1_usd_luc_gd │ thang1_usd_ty_gia_hom_nay │ lech_pct │
├───────────────────┼───────────────────────────┼──────────┤
│            2000.0 │                    1800.0 │    -10.0 │
└───────────────────┴───────────────────────────┴──────────┘
```

January's revenue **falls 10% by itself** with no transaction changing. Next month the rate moves
again and the number changes again. The same mechanism as
[historical reports changing their own numbers](../case-studies/bao-cao-qua-khu-tu-doi-so.md), except that
there the culprit was SCD Type 1 and here it's the exchange rate.

## The approach — the fact freezes both numbers

Kimball says it plainly: the fact table stores **both the value in the transaction currency and the value in the
corporate standard currency**, converted at load time.

```sql
CREATE TABLE fct_ban AS
SELECT f.so_don, f.ngay, f.tien_te,
       f.so_tien                          AS so_tien_ban_dia,
       round(f.so_tien / g.doi_ra_usd, 2) AS so_tien_usd,
       g.doi_ra_usd                       AS ty_gia_ap_dung
FROM fct_ban_tho f JOIN ty_gia g
  ON g.tien_te = f.tien_te AND g.thang = date_trunc('month', f.ngay);
```

```text
┌─────────┬────────────┬─────────┬─────────────────┬─────────────┬────────────────┐
│ so_don  │    ngay    │ tien_te │ so_tien_ban_dia │ so_tien_usd │ ty_gia_ap_dung │
├─────────┼────────────┼─────────┼─────────────────┼─────────────┼────────────────┤
│ O1      │ 2026-01-10 │ VND     │      24000000.0 │      1000.0 │        24000.0 │
│ O2      │ 2026-01-15 │ USD     │          1000.0 │      1000.0 │            1.0 │
│ O3      │ 2026-02-20 │ VND     │      48000000.0 │      1920.0 │        25000.0 │
└─────────┴────────────┴─────────┴─────────────────┴─────────────┴────────────────┘
```

Three columns, three different roles:

| Column | Who it answers for | Why it must exist |
|---|---|---|
| `so_tien_ban_dia` | Branch accounting, reconciling with the source | This is the transaction's **real number** |
| `so_tien_usd` | Head office, comparing between countries | Summable across every country |
| `ty_gia_ap_dung` | Whoever verifies it | Without it nobody can reproduce the calculation |

`tien_te` is a [degenerate dimension](degenerate-dimension.md), or points at
`dim_tien_te` if you need a name, a symbol, or a decimal-place count.

The corporate report is now **immutable** — re-run it whenever and it gives one number:

```sql
SELECT date_trunc('month', ngay)::DATE AS thang, sum(so_tien_usd) AS doanh_thu_usd
FROM fct_ban GROUP BY 1 ORDER BY 1;
```

```text
┌────────────┬───────────────┐
│   thang    │ doanh_thu_usd │
├────────────┼───────────────┤
│ 2026-01-01 │        2000.0 │
│ 2026-02-01 │        1920.0 │
└────────────┴───────────────┘
```

While the local question stays intact:

```sql
SELECT tien_te, sum(so_tien_ban_dia) AS tong_ban_dia
FROM fct_ban GROUP BY 1 ORDER BY 1;
```

```text
┌─────────┬───────────────┐
│ tien_te │ tong_ban_dia  │
├─────────┼───────────────┤
│ USD     │        1000.0 │
│ VND     │    72000000.0 │
└─────────┴───────────────┘
```

The accompanying rule: **never `SUM(so_tien_ban_dia)` without a `GROUP BY tien_te`.**

### If the business needs both conversion styles

Finance sometimes needs both *"the rate at transaction time"* (per accounting standards) and *"the budget
period's fixed rate"* (to compare plan against actual, eliminating exchange-rate movement).
Those are **two different facts** — add a column, don't replace one:

```text
so_tien_ban_dia                 -- goc, khong cong qua tien te
so_tien_usd_luc_gd              -- ty gia ngay giao dich
so_tien_usd_ty_gia_ngan_sach    -- ty gia chot dau nam
```

Don't let two definitions fight over one column. That's the fastest way to make nobody trust the table.

## Multiple units of measure — the same problem in different clothes

The warehouse counts in cases, retail counts in cans, manufacturing measures in litres. Three departments, three
units, one event.

The common wrong approach: **one fact row per unit of measure**.

```sql
WITH tach_dong AS (
  SELECT ma_giao, 'thung' AS don_vi, so_thung::DOUBLE AS so_luong FROM fct_giao_hang
  UNION ALL SELECT ma_giao, 'lon', so_thung * lon_moi_thung FROM fct_giao_hang
  UNION ALL SELECT ma_giao, 'lit', so_thung * lon_moi_thung * lit_moi_lon FROM fct_giao_hang
)
SELECT count(*) AS so_dong, round(sum(so_luong), 1) AS "sum(so_luong)_vo_nghia"
FROM tach_dong;
```

```text
┌─────────┬────────────────────────┐
│ so_dong │ sum(so_luong)_vo_nghia │
├─────────┼────────────────────────┤
│       9 │                  523.0 │
└─────────┴────────────────────────┘
```

3 shipments become 9 rows, and the `SUM` gives 523 — adding cases to cans to litres. The fact's
[grain](../reference/grain.md) has just been destroyed: one row is no longer one shipment.

Kimball's approach: **one single set of numbers + the conversion factors right in the fact row.**

```sql
CREATE TABLE fct_giao_hang AS
SELECT * FROM (VALUES
  ('G1', 10, 24, 0.33),
  ('G2',  3, 24, 0.33),
  ('G3',  5, 12, 0.50)
) t(ma_giao, so_thung, lon_moi_thung, lit_moi_lon);

SELECT sum(so_thung)                                         AS thung,
       sum(so_thung * lon_moi_thung)                         AS lon,
       round(sum(so_thung * lon_moi_thung * lit_moi_lon), 1) AS lit
FROM fct_giao_hang;
```

```text
┌────────┬────────┬───────────────┐
│ thung  │  lon   │      lit      │
├────────┼────────┼───────────────┤
│     18 │    372 │         133.0 │
└────────┴────────┴───────────────┘
```

The grain stays **one row per shipment**, and each department gets its own unit with one
multiplication. Note that `G3` has 12 cans per case rather than 24 — the factor **belongs to each row**,
not a global constant. That's exactly why it must live in the fact: packaging specifications
change per batch, and an old batch must keep its own factor.

Wrap it in a view for end users:

```sql
CREATE VIEW v_giao_hang AS
SELECT ma_giao, so_thung,
       so_thung * lon_moi_thung               AS so_lon,
       so_thung * lon_moi_thung * lit_moi_lon AS so_lit
FROM fct_giao_hang;
```

## Trade-offs

| You get | You lose |
|---|---|
| Immutable historical reports | The fact gets a few columns wider |
| Summable across every country / department | You need a correct rate table at load time |
| The conversion is traceable (`ty_gia_ap_dung`) | If a rate is retroactively corrected, the fact must be reloaded |
| The grain isn't destroyed | Readers have to know which column is summable |

On the third row: if January's rate is corrected in March, January's fact must be reloaded. That's
a conscious trade-off — in exchange for **every other run giving the same result**. Record that
reload with an [audit dimension](audit-dimension.md).

## Common Mistakes

| Mistake | Consequence |
|---|---|
| `SUM`ming the amount column straight across several currencies | A meaningless number, with nothing reporting an error |
| Converting at read time with the current rate | The past changes its numbers — [case study](../case-studies/doanh-thu-doi-theo-ty-gia.md) |
| Storing only the converted number and dropping the local one | You can't reconcile with the source or with branch accounting |
| Not storing `ty_gia_ap_dung` | Nobody can reproduce the calculation when there's a dispute |
| One fact row per unit of measure | The grain is destroyed and `SUM` mixes units |
| Treating the conversion factor as a global constant | Packaging specs change → the whole history is wrong |

## Related Topics

- [Facts and dimensions](../reference/fact-and-dimension.md) — additivity: which column may be `SUM`med
- [Grain](../reference/grain.md) — splitting rows by unit of measure destroys the grain
- [Degenerate dimensions](degenerate-dimension.md) — `tien_te` usually needs no table of its own
- [Audit dimensions](audit-dimension.md) — recording the reload when a rate is retroactively corrected
- [CS: January revenue moving with the exchange rate](../case-studies/doanh-thu-doi-theo-ty-gia.md)

## References

- Kimball Group — [Multiple Currency Facts / Multiple Units of Measure Facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapters 6 and 12
