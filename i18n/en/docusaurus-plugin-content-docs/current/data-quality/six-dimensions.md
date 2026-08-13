---
title: The six dimensions of data quality
sidebar_position: 1
description: The industry's shared framework for knowing which dimension you're missing — uniqueness, completeness, validity, integrity, timeliness, accuracy.
tags: [data-quality, testing, accuracy, freshness]
domain: data-engineering
category: concept
doc_type: reference
status: review
difficulty: beginner
verified_at:
updated: 2026-07-31
---

# The six dimensions of data quality

> **Takeaway:** The first five dimensions have ready-made tests, so everybody does them. **Accuracy** — the
> sixth — has no ready-made test, and it's the only dimension that catches the class of bug where "the
> numbers are wrong but everything is green". If the other five are all green and accuracy is wrong, the
> numbers are still wrong.

## Goal

Provide a checklist for knowing **what you're missing**. Without this framework people
write `unique` and `not_null` and then believe they've "done data quality".

## Overview

The data industry's shared framework, **independent of any tool**:

| Dimension | The question | Has a ready-made test | Commonly forgotten |
|---|---|---|---|
| **Uniqueness** | Are there duplicates | ✅ | |
| **Completeness** | Is anything missing | ✅ | |
| **Validity** | Are the values legitimate | ✅ | |
| **Integrity** | Do the foreign keys point at the right thing | ✅ | |
| **Timeliness** | Is the data too old | ✅ | ⚠️ very often forgotten |
| **Accuracy** | Does it match reality | ❌ **none exists** | ⚠️ the most painful |

## Why Accuracy is completely different from the other five

The first five check the data's **shape**: no duplicates, nothing empty, the right types, keys pointing at
the right place. They can be answered by looking at *that table alone*.

Accuracy asks *"is this number true of the real world"* — and no table can answer that
by itself. The only way: **reconcile against another source**.

```sql
-- Tổng doanh thu mart phải bằng tổng ở hệ nguồn.
-- Trả về dòng nào là chênh lệch đó — trả 0 dòng = pass.
select
    m.thang,
    m.tong_mart,
    s.tong_nguon,
    m.tong_mart - s.tong_nguon as chenh_lech
from {{ ref('mart_doanh_thu_thang') }} m
join {{ source('his', 'tong_hop_thang') }} s using (thang)
where abs(m.tong_mart - s.tong_nguon) > 1
```

**This is the only test that catches duplication from a wrong join** — for example when a fact joins to a
[Type 2 SCD dimension](../data-modeling/skills/scd.md#common-mistakes) on the natural key. At that point
`unique` is green, `not_null` is green, `relationships` is green, and the fact's row count is right — only the
money total is doubled.

## Timeliness — the most forgotten dimension

When a source stops updating, **every other test stays green**, because *old* data is still *valid*. No
duplicates, nothing empty, the right types — it's just last week's.

The only way to catch it: declare a freshness threshold on the **source**, not on the model.

```yaml
sources:
  - name: his
    tables:
      - name: don_hang
        loaded_at_field: updated_at
        freshness:
          warn_after:  {count: 6,  period: hour}
          error_after: {count: 24, period: hour}
```

## The order to do them in

Don't write tests as they occur to you — follow this order:

1. **Establish the [grain](../data-modeling/reference/grain.md) first.** Get this step wrong and every test
   after it is wrong.
2. `not_null` + `unique` on **that exact grain**. For a composite grain use a composite test,
   **not** a single-column `unique`.
3. Check the foreign keys (integrity) for every relationship.
4. Check the value domains (validity) for status and category columns.
5. Check freshness (timeliness) on **every** source.
6. Reconciliation tests (accuracy) for the numbers people make decisions on.

Steps 5 and 6 are the two most often skipped, and also the two that catch the most expensive bugs.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Treating the 4 built-in tests as "data quality done" | Timeliness and accuracy left blank — exactly the two most expensive dimensions |
| Setting every test to `error` severity | The pipeline is permanently red → people start ignoring red → the tests become useless |
| Not storing the failing rows | You only know "37 rows are wrong", not what's wrong, and nobody will investigate |
| Forgetting `freshness` | The source dies while every test stays green |

## FAQ

<details>
<summary>Every test is green but the dashboard number is still wrong — what do I suspect?</summary>

In order: (1) the wrong [grain](../data-modeling/reference/grain.md) → duplication from a join;
(2) missing accuracy → there's nothing reconciling against the source; (3) missing timeliness → stale data.
Those three causes account for nearly every "green but wrong" case.

</details>

<details>
<summary>Are these six dimensions an official standard?</summary>

There's no single standard — DAMA-DMBOK lists more dimensions, and some material condenses them to
four. The six here are the set that's most usable in practice. The value is in **having a list to check
against**, not in the number six.

</details>

## Related Topics

- [dbt: testing](../etl/dbt/reference/testing.md) — the tool that realises these dimensions
- [Grain](../data-modeling/reference/grain.md) — step 0 of every test
- [SCD](../data-modeling/skills/scd.md) — where accuracy catches what the other five miss

## References

- DAMA-DMBOK — *Data Quality Dimensions*
- dbt docs — *Tests*, *Source freshness*
