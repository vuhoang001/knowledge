---
title: January revenue falling 10% in August, with no transaction changing
sidebar_position: 13
description: "The fact only stores the local amount; the report converts at read time with the current rate — so the past moves with the exchange rate."
tags: [case-study, multi-currency, fact, additivity, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# January revenue falling 10% in August, with no transaction changing

> **A reconstructed situation**, not an incident encountered here. Every number below was really run
> on DuckDB.

> **Takeaway:** an amount of money only means something with a unit **and** a conversion moment. If the fact only stores
> the local amount, every corporate report has to convert for itself — and if it converts at today's
> rate, the past will change its numbers every month. See
> [multiple currencies](../skills/multi-currency-uom.md).

## Context

The company sells in Vietnam and the US. The fact stores exactly what the source system emits: the amount in the
transaction currency, plus the currency code.

```sql
CREATE TABLE fct_ban_tho AS
SELECT * FROM (VALUES
  ('O1', DATE '2026-01-10', 'VND', 24000000.0),
  ('O2', DATE '2026-01-15', 'USD',     1000.0),
  ('O3', DATE '2026-02-20', 'VND', 48000000.0)
) t(so_don, ngay, tien_te, so_tien);

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

The corporate report converts to USD, joining the rate table at run time.

## The first symptom — a meaningless number that looks perfectly normal

Before the exchange-rate business surfaces, there's a dashboard showing **72,001,000** labelled "Total
revenue".

```sql
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

24 million VND + 1,000 USD + 48 million VND = 72,001,000 **of what?** Of nothing at all. But it's
a valid number, nicely formatted, with nothing warning you.

## The second symptom — a moving past

The January report run in February gave **2,000 USD**. The same report, re-run in August, gives
**1,800 USD**.

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

A closed month, already reported to the board, **falls 10% by itself**. And next month the rate moves
again and it changes once more.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| A January order cancelled afterwards | Checked: no order was cancelled, `count(*)` unchanged |
| The ETL deleted a row on reload | Comparing row counts between the two runs: identical |
| A return recorded as reducing revenue | There's no returns fact in the period |
| The rate table had its historical data edited | **Wrong** — the rate table edited nothing, it only **added** an August row |

Where the time goes: everybody looks for the row that **changed**. No row changed. The row count is the same,
the local amounts are the same. What changed is **the multiplier chosen at query time**.

The redirecting question: *"does the VND total change?"* No. So the problem is in the conversion step,
not in the data.

## The real cause

The fact doesn't store the converted value. So each report has to join to `ty_gia` itself, and the join
condition is whatever the query's author decided.

Somebody wrote `g.thang = (SELECT max(thang) FROM ty_gia)` — taking the latest rate. That statement is
**correct for the question "what would it be if converted today"**, and **wrong for every historical
report**.

The root error sits a layer deeper: deciding *"which rate applies to this transaction"* is a
**fact about the transaction** that must be frozen once at load time. Pushing it to read time lets each
reader choose a different answer.

The same mechanism as [historical reports changing their own numbers](bao-cao-qua-khu-tu-doi-so.md) — there the culprit
is SCD Type 1, here it's the exchange rate. Both are *"a past value looked up through the current
state"*.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on `so_tien`, `tien_te` | ✅ green |
| `accepted_values` for `tien_te` — `[VND, USD]` | ✅ green |
| `so_tien > 0` | ✅ green |
| `relationships` fact → `ty_gia` | ✅ green |
| The VND total matching the source | ✅ green |

Every invariant holds. The rate table is correct too — it only gains new rows, exactly as it's
supposed to.

The bug lives in **the join inside the reporting layer**, where data tests can't reach. The only test that
catches it: snapshotting the totals of closed periods and comparing on each run.

## The fix

The fact freezes **both numbers** at load time, along with the rate used:

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

The corporate report is now immutable — re-run it however many times and it gives one number:

```text
┌────────────┬───────────────┐
│   thang    │ doanh_thu_usd │
├────────────┼───────────────┤
│ 2026-01-01 │        2000.0 │
│ 2026-02-01 │        1920.0 │
└────────────┴───────────────┘
```

While the branch accountants' local question is still answerable:

```text
┌─────────┬───────────────┐
│ tien_te │ tong_ban_dia  │
├─────────┼───────────────┤
│ USD     │        1000.0 │
│ VND     │    72000000.0 │
└─────────┴───────────────┘
```

The `ty_gia_ap_dung` column is the one most easily dismissed as redundant and the most valuable when there's a dispute:
without it, nobody can reproduce the calculation that was used.

| | Before | After |
|---|---|---|
| January revenue (USD) | Changes with the report's run date | 2,000, fixed |
| `SUM`ming the amount column | A meaningless number | A total per currency |
| Reproducing the conversion | Impossible | `ty_gia_ap_dung` |
| Where the rate is decided | The reporting layer, differently per person | The load layer, once |

## How to spot it early

1. The fact has an amount column but **no** converted column:

```sql
SELECT count(DISTINCT tien_te) AS so_loai_tien FROM fct_ban_tho;
```

Greater than 1 with only one amount column in the table means you already have the problem.

2. Grep the reporting layer for rate joins using the latest value:

```bash
grep -rn "max(thang)\|current_date\|order by thang desc limit 1" models/marts/
```

3. Snapshot the totals of closed periods and compare on each run — this test catches both this case and
   [the SCD Type 1 case](bao-cao-qua-khu-tu-doi-so.md):

```sql
-- luu lai, so voi lan chay truoc
SELECT date_trunc('month', ngay)::DATE AS thang, sum(so_tien_usd) AS doanh_thu_usd
FROM fct_ban WHERE ngay < date_trunc('month', current_date) GROUP BY 1;
```

4. Somebody `SUM`ming the amount column without a `GROUP BY tien_te`.

## Related Topics

- [Multiple currencies and units of measure](../skills/multi-currency-uom.md) — the technique skipped here
- [Facts and dimensions](../reference/fact-and-dimension.md) — additivity: which column may be `SUM`med
- [CS: historical reports changing their own numbers](bao-cao-qua-khu-tu-doi-so.md) — the same "look up the past through the present" illness
- [Audit dimensions](../skills/audit-dimension.md) — recording the reload when a rate is retroactively corrected
