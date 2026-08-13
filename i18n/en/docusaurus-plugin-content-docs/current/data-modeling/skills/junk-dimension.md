---
title: Junk dimensions and low-cardinality columns
sidebar_position: 3
description: "A status column with a few values: leave it in the fact, split out its own dimension, or combine — and how to decide."
tags: [junk-dimension, degenerate-dimension, dimension, data-modeling, kimball]
domain: data-engineering
category: concept
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Junk dimensions and low-cardinality columns

> **Takeaway:** a column with seven values does **not** deserve its own dimension table — unless it
> carries attributes with it. Several such columns should all be combined into **one** junk dimension;
> don't make a table per column.

## The goal

To give a decidable rule for the commonest column type the books say least about: `trang_thai`,
`kenh_ban`, `loai_thanh_toan`, `co_khuyen_mai` — a few values, repeated across a million fact
rows, with no obvious home.

## Ask about grain first, not about splitting or combining

The question "its own dimension or combined" comes **second**. The first question is *whose status this
is* — get that wrong and every choice below is wrong.

| The status belongs to | Example | Which way to go |
|---|---|---|
| An **entity**, changing over time | A customer: active → suspended → closed | [SCD](scd.md) Type 2 on the main dim. Not this page's business |
| An **event**, frozen at write time | An order at payment: succeeded / failed | Read on |
| A **process**, changing continuously over a lifetime | An order: placed → packed → shipped → received | An accumulating snapshot fact, one timestamp column per step. See [Facts and dimensions](../reference/fact-and-dimension.md#the-three-kinds-of-fact) |

The commonest trap is treating the third row like the second: stuffing the current `trang_thai` into
a column in the fact and then `UPDATE`ing it each time the order moves on. At that point the fact is no longer a
record of events, and **last month's report changes its own numbers** when an old order changes status.

## The four options

Assume you've established this is an attribute of the event, frozen at write time.

| Approach | When to choose it | The price |
|---|---|---|
| **Leave it in the fact** (a degenerate dimension) | Exactly one column, just a label, with no accompanying attributes | Renaming the label means `UPDATE`ing a million rows; the repeated text costs space |
| **Its own small dimension** | The status **carries attributes**: a group, a sort order, a "counts as revenue" flag | One more join in every query |
| **A junk dimension** | From ~3 low-cardinality columns upwards | You have to generate and maintain the combination table; it's hard to understand on first reading |
| **SCD Type 2 on the main dim** | The status is an attribute of the entity and needs history | The dim bloats at the status-change rate |

**With exactly one seven-value column and no accompanying attributes: leave it in the fact.**
Creating a seven-row table and joining it in every query just to turn `3` into `"Đã giao"` is paying for a
join and buying nothing — there's no attribute to filter on and no group to roll up to.

The threshold reverses the moment a question like *"revenue by status group"* or
*"count only the statuses considered closed"* appears. At that point the status has attributes, and
its own dimension earns its fee.

## What a junk dimension is

When a fact has four low-cardinality columns, the naive approach is four tiny dimension tables and four keys
in the fact. A junk dimension combines them into **one** combination table with **one** key:

```text
dim_junk_don_hang
junk_sk | trang_thai   | kenh_ban | loai_thanh_toan | co_khuyen_mai
1       | Đã giao      | Online   | Thẻ             | false
2       | Đã giao      | Online   | Thẻ             | true
3       | Đã giao      | Online   | COD             | false
...
```

The fact holds just `junk_sk` in place of the four columns. Seven statuses × three channels × four payment
types × two flags = 168 rows — smaller than even the tiniest customer dimension.

**Only generate the combinations that actually appear in the data**, don't pre-generate the whole Cartesian
product. With four columns the two are equivalent, but add one 50-value column and the Cartesian
product explodes to 8,400 rows, most of which are never used.

## The worked example — retail orders

Runs as-is on DuckDB. The same problem runs from raw data to the verification query,
so you can see what the decision changes rather than just reading a description.

### The source data

```sql
CREATE TABLE don_hang_raw (
  ma_don          VARCHAR,
  ngay            DATE,
  ma_khach        VARCHAR,
  trang_thai      VARCHAR,   -- 7 giá trị
  kenh_ban        VARCHAR,   -- 3 giá trị
  loai_thanh_toan VARCHAR,   -- 4 giá trị
  co_khuyen_mai   BOOLEAN,   -- 2 giá trị
  thanh_tien      DECIMAL(18,2)
);

INSERT INTO don_hang_raw VALUES
  ('DH001','2026-07-01','KH01','Đã giao',      'Online','Thẻ', false, 300000),
  ('DH002','2026-07-01','KH02','Đã giao',      'Online','COD', true,  150000),
  ('DH003','2026-07-02','KH01','Đã huỷ',       'Cửa hàng','Tiền mặt', false, 90000),
  ('DH004','2026-07-02','KH03','Đang giao',    'App','Ví điện tử', true, 220000),
  ('DH005','2026-07-03','KH02','Hoàn hàng',    'Online','Thẻ', false, 300000);
```

### Step 1 — count the cardinality before deciding

This is the deciding step, not a checking step. The numbers here choose the option for you:

```sql
SELECT
  count(DISTINCT trang_thai)      AS n_trang_thai,
  count(DISTINCT kenh_ban)        AS n_kenh,
  count(DISTINCT loai_thanh_toan) AS n_thanh_toan,
  count(DISTINCT co_khuyen_mai)   AS n_co_km,
  count(*)                        AS n_dong
FROM don_hang_raw;
```

```text
┌──────────────┬────────┬──────────────┬─────────┬────────┐
│ n_trang_thai │ n_kenh │ n_thanh_toan │ n_co_km │ n_dong │
├──────────────┼────────┼──────────────┼─────────┼────────┤
│            4 │      3 │            4 │       2 │      5 │
└──────────────┴────────┴──────────────┴─────────┴────────┘
```

Four low-cardinality columns → by the table below, a **junk dimension**.

Read the result by this rule:

| What you see | What to do |
|---|---|
| Only one low-cardinality column with no accompanying attributes | Leave it in the fact and stop here |
| One column but you need a group/order/flag | Its own small dimension |
| Three or more columns, each under ~20 values | A junk dimension — carry on to step 2 |
| A column exceeding a few hundred values | That column does **not** go into the junk; give it its own dimension |

### Step 2 — build the junk dimension from real combinations

`SELECT DISTINCT` over the real data, **not** a `CROSS JOIN` of the catalogues:

```sql
CREATE TABLE dim_junk_don_hang AS
SELECT
  row_number() OVER (ORDER BY trang_thai, kenh_ban, loai_thanh_toan, co_khuyen_mai) AS junk_sk,
  trang_thai,
  kenh_ban,
  loai_thanh_toan,
  co_khuyen_mai,
  -- thuộc tính suy diễn: thứ đáng tiền của một dimension, fact không tự có
  trang_thai IN ('Đã giao','Đang giao')            AS la_don_hop_le,
  trang_thai IN ('Đã huỷ','Hoàn hàng','Thất bại')  AS la_don_that_bai
FROM (SELECT DISTINCT trang_thai, kenh_ban, loai_thanh_toan, co_khuyen_mai
      FROM don_hang_raw);
```

The last two columns are why a junk dimension is worth building. `la_don_hop_le` is defined **once
in one place**; without it each report rewrites the status list in its own
`WHERE`, and by the time an eighth status is added, each report is wrong in a different way.

### Step 3 — the fact points at one key

```sql
CREATE TABLE fct_don_hang AS
SELECT
  r.ma_don,
  r.ngay,
  r.ma_khach,
  j.junk_sk,          -- thay cho bốn cột
  r.thanh_tien
FROM don_hang_raw r
JOIN dim_junk_don_hang j
  ON  r.trang_thai      = j.trang_thai
  AND r.kenh_ban        = j.kenh_ban
  AND r.loai_thanh_toan = j.loai_thanh_toan
  AND r.co_khuyen_mai   = j.co_khuyen_mai;
```

`JOIN` rather than `LEFT JOIN` is deliberate: if a fact row matches no combination, the
row count drops and you know immediately. `LEFT JOIN` would hide that bug as a null `junk_sk`.

### Before and after

| | Before | After |
|---|---|---|
| Descriptive columns in the fact | 4 (`trang_thai`, `kenh_ban`, `loai_thanh_toan`, `co_khuyen_mai`) | 1 (`junk_sk`) |
| Data types repeated per row | 3 strings + 1 boolean | 1 integer |
| The "valid order" definition | scattered through each report's `WHERE` | one column in the dimension |
| Adding an 8th status | each report changed differently | add a row to the dimension |

### Step 4 — the verification query

The business question *"revenue from valid orders, split by channel"* — which the
"leave it in the fact" option can't answer without hardcoding the status list:

```sql
SELECT j.kenh_ban, sum(f.thanh_tien) AS doanh_thu
FROM fct_don_hang f
JOIN dim_junk_don_hang j USING (junk_sk)
WHERE j.la_don_hop_le
GROUP BY j.kenh_ban
ORDER BY doanh_thu DESC;
```

```text
┌──────────┬───────────────┐
│ kenh_ban │   doanh_thu   │
├──────────┼───────────────┤
│ Online   │     450000.00 │
│ App      │     220000.00 │
└──────────┴───────────────┘
```

`Cửa hàng` doesn't appear — the only order through that channel was "Đã huỷ", so `la_don_hop_le`
excludes it. Correct per the business, and **without hardcoding the status list** in the query.

And one mandatory test — the fact's row count must equal the source's; a difference means the join duplicated:

```sql
SELECT
  (SELECT count(*) FROM don_hang_raw)  AS nguon,
  (SELECT count(*) FROM fct_don_hang)  AS fact;
```

```text
┌───────┬───────┐
│ nguon │ fact  │
├───────┼───────┤
│     5 │     5 │
└───────┴───────┘
```

Equal — the join duplicated no rows.

## Trade-offs

| You get | You lose |
|---|---|
| A narrower fact — four keys down to one | Another layer of indirection that a newcomer won't grasp immediately |
| Adding a new flag column doesn't change the fact schema | You need a combination-generating/topping-up step in the pipeline |
| Filtering on several conditions only scans one tiny dimension | It can't be reused in another fact with a different column set |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Creating a seven-row dimension for a pure label column | A surplus join in every query, buying no analytical capability |
| Generating the full Cartesian product and then adding a high-cardinality column | The table explodes, with most rows matching no fact |
| Stuffing a changing status into a Type 2 customer dim | Each status change generates a new customer version — the dim bloats, and its grain is no longer "one customer" |
| Treating a lifecycle status as a dimension attribute | Historical reports change their own numbers, with no error reported |
| Using the business status code directly as the key | The business renumbering the codes breaks the key — see [Surrogate keys](../reference/surrogate-key.md) |

## FAQ

<details>
<summary>Do seven statuses need a surrogate key?</summary>

If it stays in the fact, there's no key at all — just a text or code column.

If it's split into a dimension, then yes: keep `trang_thai_sk` as the key, and keep **both** the business
code and the display name as ordinary columns. The reason is the same as for any other dimension, see
[Surrogate keys](../reference/surrogate-key.md).

</details>

<details>
<summary>What do I do when an eighth status is added?</summary>

Left in the fact: nothing.

Its own dimension: add a row.

A junk dimension: add that status's new combinations with the other columns. This is why
you should generate combinations from the real data rather than declaring them — the generation step catches new values by itself.

</details>

<details>
<summary>The fact already has status columns; is switching to a junk dimension worth it?</summary>

Only when there are three or more low-cardinality columns and the fact is large enough for row width to be a
real problem. For one column it isn't worth it — changing a fact's schema is expensive, and you'd get exactly one
extra join in return.

</details>

## Related Topics

- [Facts and dimensions](../reference/fact-and-dimension.md) — the root rule: which column belongs to which table
- [Grain](../reference/grain.md) — you must establish the grain before asking about splitting or combining
- [SCD](scd.md) — when the status belongs to the entity and needs history
- [Surrogate keys](../reference/surrogate-key.md) — the key for the dimension you split out
- [Star, snowflake, OBT](../reference/star-snowflake-obt.md) — a junk dimension is still a star, not a snowflake
- [The design process](../reference/design-process.md) — step 3 chooses the dimensions

## References

- Kimball & Ross — *The Data Warehouse Toolkit*, chapter 3 (junk dimensions) and chapter 4
