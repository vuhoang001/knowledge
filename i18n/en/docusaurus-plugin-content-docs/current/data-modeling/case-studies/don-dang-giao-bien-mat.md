---
title: Half the orders vanished from the report
sidebar_position: 6
description: The fact has three date columns and joins all three to dim_thoi_gian — every not-yet-delivered order is wiped out, with no error reported.
tags: [case-study, role-playing-dimension, join, null-handling, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Half the orders vanished from the report

> **A reconstructed situation**, not an incident encountered here. **The numbers were really run on DuckDB.**

> **Takeaway:** an ordinary `JOIN` to a dimension **discards every row with a `NULL` key**. If the fact
> has a date column for something that hasn't happened yet (the ship date of an in-transit order), the join
> wipes that group out entirely — and the lost group is usually the **most important** one.

## Context

`fct_don_hang` has three roles of `dim_thoi_gian`: order date, ship date, payment date —
exactly the [role-playing dimension](../skills/role-playing-dimension.md) model.

```sql
CREATE TABLE fct AS SELECT * FROM (VALUES
 ('DH1',20260701,20260705),
 ('DH2',20260702,20260706),
 ('DH3',20260703,NULL),        -- dang giao
 ('DH4',20260704,NULL))        -- dang giao
 AS t(ma_don, ngay_dat_sk, ngay_giao_sk);
```

Four orders:

```text
┌──────────┐
│ tong_don │
├──────────┤
│        4 │
└──────────┘
```

## Symptoms

The "orders by order month and ship month" report — joining both roles:

```sql
SELECT count(*) AS con_lai FROM fct f
JOIN dim_ngay d1 ON f.ngay_dat_sk = d1.ngay_sk
JOIN dim_ngay d2 ON f.ngay_giao_sk = d2.ngay_sk;
```

```text
┌─────────┐
│ con_lai │
├─────────┤
│       2 │
└─────────┘
```

**Four orders become two.** Exactly 50% lost.

And the lost group isn't random — it's **every in-transit order**. Meaning the operations
report, the thing used to track work in progress, is the report that **can't see work in progress**.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| `dim_thoi_gian` is missing dates | Checked: the date range is complete |
| The fact loaded incompletely | The fact's `count(*)` = 4, correct |
| A date filter in the report | There is no filter |
| Orders deleted at the source | No |

Very hard to suspect because **both tables are complete**. The number only falls short *after the join*, and the
join looks entirely ordinary — nobody reads a `JOIN ... ON` and thinks about `NULL`.

A secondary trap: joining just **one** role keeps the number correct. The bug only appears when you join the
second role — the role of an event that **hasn't happened**.

## The real cause

`ngay_giao_sk` is `NULL` for an undelivered order. `JOIN ... ON f.ngay_giao_sk = d2.ngay_sk`
never matches a `NULL` — `NULL = anything` gives `NULL`, not `true`.

This is a direct consequence of SQL's three-valued logic, the same root as the `<>` trap in
[change detection for SCD 2](../skills/scd-change-detection.md).

What makes it a design bug rather than merely a query bug: **the classic dimensional model assumes
every foreign key has a value.** A fact recording a process *in progress* breaks that
assumption — and nothing in the model warns you.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on `ngay_giao_sk` | ❌ **can't be declared** — null is legitimate here |
| `relationships` `ngay_giao_sk` → `dim_ngay` | ✅ green — dbt skips nulls |
| The fact's `count(*)` | ✅ correctly 4 |
| The dimension's `count(*)` | ✅ correct |

Both tables are perfect. The bug arises **at read time**, not write time — exactly like the
[joining two facts](join-hai-fact-lam-phong-tong.md) case.

That's why a mart should be pre-built correctly rather than left for everybody to join themselves.

## The fix

**Approach 1 — a `LEFT JOIN` for the role of an event that may not have happened:**

```sql
SELECT count(*) AS con_lai FROM fct f
JOIN      dim_ngay d1 ON f.ngay_dat_sk  = d1.ngay_sk   -- ngày đặt: luôn có
LEFT JOIN dim_ngay d2 ON f.ngay_giao_sk = d2.ngay_sk;  -- ngày giao: có thể chưa
```

```text
┌─────────┐
│ con_lai │
├─────────┤
│       4 │
└─────────┘
```

**Approach 2 — an "unknown" row in the dimension.** Add a row with key `-1` meaning
*hasn't happened*, and have the fact use `-1` instead of `NULL`:

```text
ngay_sk | ngay       | ghi_chu
-1      | NULL       | Chưa xảy ra
20260701| 2026-07-01 | ...
```

Approach 2 is better for a large system: an ordinary `JOIN` still works everywhere, without depending on
whoever writes a query remembering to use `LEFT JOIN`. In exchange you have to handle `-1` when loading the fact.

**The general rule:** any role corresponding to an event that **may not have happened** must either use a `LEFT JOIN`
or have an "unknown" row. There is no third option.

## How to spot it early

1. The fact has a foreign-key column that **allows `NULL`** — especially `ngay_*_sk` columns for later steps
   in a process.
2. The fact is an **accumulating snapshot** (tracking a multi-step process) — that fact kind
   almost always has unfilled columns.
3. An operations report gives a number **smaller** than intuition suggests, and nobody can prove it.

The cheapest check, run before any report using several roles:

```sql
SELECT count(*) AS tong,
       count(ngay_giao_sk) AS co_ngay_giao,
       count(*) - count(ngay_giao_sk) AS chua_giao
FROM fct;
```

`chua_giao > 0` means every ordinary `JOIN` on that column is silently filtering that group out.

## Related Topics

- [Role-playing dimensions](../skills/role-playing-dimension.md) — several roles in one fact
- [Facts and dimensions](../reference/fact-and-dimension.md) — accumulating snapshots and unfilled columns
- [Change detection for SCD 2](../skills/scd-change-detection.md) — the same root: `NULL` in a comparison
- [Revenue inflated by joining two facts](join-hai-fact-lam-phong-tong.md) — also a read-time bug
