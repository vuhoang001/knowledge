---
title: Adding an eighth status, and five reports wrong in five different ways
sidebar_position: 5
description: The status list hardcoded in each report's WHERE — the business adds one status and each report goes wrong differently.
tags: [case-study, junk-dimension, dimension, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: beginner
verified_at:
updated: 2026-07-31
---

# Adding an eighth status, and five reports wrong in five different ways

> **A reconstructed situation**, not an incident encountered here. **The numbers were really run on DuckDB.**

> **Takeaway:** a business definition scattered through each report's `WHERE` has **no
> owner**. Add one value and each report goes wrong differently, with nobody knowing which reports were fixed.

## Context

`trang_thai` sits directly in the fact — following the advice in
[Junk dimensions](../skills/junk-dimension.md) for a single label column.

Each report writes its own "which orders count as revenue" condition:

```sql
SELECT sum(tien) AS doanh_thu FROM don
WHERE trang_thai IN ('Đã giao','Đang giao');
```

```text
┌───────────────────┐
│ doanh_thu_bao_cao │
├───────────────────┤
│           1500000 │
└───────────────────┘
```

It ran correctly for two years.

## Symptoms

The business adds the status **"Partially delivered"** — the customer received part of the order with the
rest in transit. The revenue for the received part **must still count**.

Nobody updates the reports. The correct figure should be:

```text
┌────────────────┐
│ doanh_thu_dung │
├────────────────┤
│        1900000 │
└────────────────┘
```

**400,000 missing — 21% short.** And there's no error.

What makes it worse than one wrong number: **five reports, five authors, five different status
lists**. Once discovered, you have to hunt down every `WHERE` in every dashboard,
every notebook, every model — with no way of being sure you found them all.

## The wrong hypotheses at first

| Suspected | The result |
|---|---|
| Orders lost during loading | The fact's `count(*)` matches the source |
| A wrong exchange rate / currency unit | No, exactly one group of orders is wrong |
| A skewed date filter | No |
| Somebody edited the data | No |

The suspicion focuses on the **data**. The data is complete — the **definition** is what's out of date.

The correct diagnosis only arrives when somebody runs `SELECT DISTINCT trang_thai` and sees a value
they've never met.

## The real cause

The question *"which orders count as revenue"* is a **business definition**. It's being
stored in the worst place possible: **repeated inside every query**.

The consequences:

- There's no single place to fix.
- There's no way to enumerate "the places needing fixing".
- No test protects it, because each copy is internally consistent.

## Why no test catches it

| Test | The result |
|---|---|
| `accepted_values` on `trang_thai` | ⚠️ **catches it** — if it's declared, and if somebody updates the list |
| `not_null`, `unique` | ✅ green |
| Total revenue against the source | ❌ nobody built it, because the "source" also uses the old definition |

`accepted_values` is the **only** test with a chance — but it only reports *"there's an unknown value"*,
not *"your report is missing that value"*. And if whoever added the status also
updated `accepted_values`, the test goes green again, silent as before.

## The fix

Move the definition into the **dimension** as a flag column:

```sql
CREATE TABLE dim_tt AS SELECT * FROM (VALUES
 ('Đã giao',true),('Đang giao',true),('Giao một phần',true),
 ('Đã huỷ',false),('Hoàn hàng',false)) AS t(trang_thai, la_don_hop_le);
```

Every report becomes:

```sql
SELECT sum(d.tien) AS doanh_thu
FROM don d JOIN dim_tt t USING (trang_thai)
WHERE t.la_don_hop_le;
```

```text
┌───────────┐
│ doanh_thu │
├───────────┤
│   1900000 │
└───────────┘
```

**Correct, and self-correcting.** Adding a ninth status needs only one row added to the dimension —
every report follows, with nobody having to remember anything.

This is exactly the reversal threshold [Junk dimensions](../skills/junk-dimension.md) mentions:
*a status column is worth splitting out when it **carries attributes***. `la_don_hop_le` is that attribute.

## How to spot it early

1. The same value list appears in the `WHERE` of **more than two** queries.
2. Somebody has to ask *"which statuses count as revenue?"* — meaning the answer doesn't
   live in the data.
3. `SELECT DISTINCT` on a categorical column returns a value you don't recognise.

The cheapest check, run periodically:

```sql
SELECT trang_thai, count(*) FROM don GROUP BY 1 ORDER BY 2 DESC;
```

An unfamiliar value appearing is the signal to audit every report — **before** somebody notices the shortfall.

## Related Topics

- [Junk dimensions](../skills/junk-dimension.md) — when a status column is worth splitting out
- [Facts and dimensions](../reference/fact-and-dimension.md) — a derived attribute belongs to the dimension
- [Implementing tests](../../etl/dbt/skills/implementing-tests.md) — `accepted_values` and its limits
