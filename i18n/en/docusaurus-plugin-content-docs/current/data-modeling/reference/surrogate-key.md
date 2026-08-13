---
title: Surrogate keys and natural keys
sidebar_position: 3
description: Why you don't use a business code directly as a dimension's key — and why SCD Type 2 requires a surrogate key.
tags: [surrogate-key, natural-key, data-modeling, kimball]
domain: data-engineering
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Surrogate keys and natural keys

> **Takeaway:** a natural key is the **source system's** code (`KH001`). A surrogate key is the
> **warehouse's** code — carrying no business meaning, and precisely because of that it can't be broken by
> the source system. [SCD Type 2](../skills/scd.md) can't exist without one.

## The goal

To answer the question people often think is redundant: *"we already have `khach_hang_id`, what's `khach_sk` for?"*

## Overview

| | Natural key | Surrogate key |
|---|---|---|
| Example | `KH001`, an ID number, a SKU code | `1`, `2`, `3` (or a hash) |
| Who generates it | The source system | The warehouse |
| Carries meaning | Yes | **No** — and that's the advantage |
| On a Type 2 dim | **Repeats** across versions | Unique per version |
| Facts point at | ❌ | ✅ |

## Why you need one

- **Source systems change their codes.** A company merger, an ERP change, a code-format change — the natural key
  changes with it, and every fact pointing at it is orphaned.
- **Several sources for the same entity.** A customer has one code in the CRM and a different one in the sales
  system. The surrogate key is where they're unified.
- **SCD Type 2 requires it.** One customer has several rows → the natural key is no longer a key.
  Without an SK, a fact has no way of pointing at *the right version*.
- **Integer joins are faster than string joins.** The smallest benefit, and the one usually cited first.

## Four kinds of key, not two

Kimball separates them more finely than the natural/surrogate pair, and the distinction only surfaces once a dimension has
[SCD](../skills/scd.md) Type 2:

| Key kind | What it is | Example | Unique per |
|---|---|---|---|
| **Natural key** | The source system's code | `KH001` from the CRM | One entity **within one source system** |
| **Durable key** | The warehouse's durable code for **one entity across all its versions** | `khach_durable_id = 42` | One entity, forever |
| **Surrogate key** | The key of **one version** of a dimension | `khach_sk = 137` | One dimension row |
| **Supernatural key** | A durable key when the natural key **isn't trustworthy** | a warehouse-issued code after duplicate matching | One entity after consolidation |

Three questions distinguish them:

```sql
-- "Doanh thu cua don nay, luc do khach o khu vuc nao?"   -> surrogate key
-- "Tong doanh thu ca doi cua khach nay?"                 -> durable key
-- "Ma nay ung voi ban ghi nao ben CRM?"                  -> natural key
```

**Why you need a separate durable key.** On a Type 2 dim, one customer has N rows and N surrogate keys.
What do you group by to aggregate a customer's lifetime revenue? The natural key works — until the source
system changes its codes, or the customer exists in two source systems under two codes. The durable key is a column that never
changes, issued and held by the warehouse.

```sql
CREATE TABLE dim_khach (
  khach_sk        BIGINT,      -- moi phien ban mot gia tri
  khach_durable   BIGINT,      -- mot khach mot gia tri, xuyen moi phien ban
  khach_id_crm    VARCHAR,     -- natural key, giu de truy vet
  ...
);
```

A **supernatural key** is a durable key in the hardest case: the natural key **can't be
trusted** — an ID number typed wrongly, a customer registering twice with two emails. The warehouse runs duplicate
matching and then issues its own durable code for the consolidated entity. Kimball emphasises: from that point,
**that code is the identity**, and the natural key is merely reference data.

## A surrogate key for the fact row itself

A fact can also have its own surrogate key (`ban_sk`). When it's worth adding and when it
isn't — see [year-to-date and timespan](../skills/ytd-timespan-facts.md#fact-table-surrogate-key).

An important note: a unique `ban_sk` does **not** prove the grain is right. Two rows duplicating the grain
still have two different `ban_sk` values and still pass a `unique` test.

## Still to answer

- [ ] What to generate SKs with: an incrementing sequence vs a hash (`dbt_utils.generate_surrogate_key`) —
      a hash suits a distributed system because it needs no centralised state
- [ ] The special rows: `-1` = "Unknown", `-2` = "Not applicable" — why you need them
- [ ] `dim_thoi_gian` is the exception: an SK like `20260110` is readable by eye
- [ ] Whether to keep the natural key in the fact (keep it for traceability, but **never join on it**)

## Common Mistakes

| Mistake | Consequence |
|---|---|
| A fact joining by natural key on a Type 2 dim | Revenue doubles — see [SCD](../skills/scd.md#common-mistakes) |
| Leaving the SK `NULL` when the dimension wasn't found | An inner join **loses** fact rows; use `-1` instead of `NULL` |
| Assigning meaning to the SK ("an SK starting with 9 is a VIP customer") | You lose exactly what makes an SK valuable: its meaninglessness |
| No durable key on a Type 2 dim | You can't aggregate "the customer's lifetime" when the source system changes its codes |
| Using the natural key as the durable key | A source-system merger loses the entity's identity |
| Believing a unique `fact_sk` means the grain is right | A duplicated grain still passes a `unique` test |

## Related Topics

- [SCD](../skills/scd.md) — where an SK becomes mandatory, and where a durable key becomes necessary
- [Facts and dimensions](fact-and-dimension.md) — the SK is what connects the two table kinds
- [Year-to-date and timespan](../skills/ytd-timespan-facts.md) — a surrogate key for the fact row
- [Grain](grain.md)

## References

- Kimball & Ross — *The Data Warehouse Toolkit*, "Surrogate Keys"
