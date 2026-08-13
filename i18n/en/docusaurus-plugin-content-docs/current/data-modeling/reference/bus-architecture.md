---
title: Bus architecture, the bus matrix and the value chain
sidebar_position: 7
description: "Building an enterprise data warehouse one process at a time without ending up with fragments — the bus matrix is the plan, and it should be data rather than a slide."
tags: [bus-matrix, bus-architecture, value-chain, conformed-dimension, kimball, data-modeling]
domain: data-engineering
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Bus architecture, the bus matrix and the value chain

> **Takeaway:** nobody can build an entire enterprise data warehouse in one go. Bus
> architecture is Kimball's answer to **building one process at a time and still being able to
> join it all up**: one fact at a time, but sharing one agreed
> set of dimensions.

## Why the concept exists

Two symmetrically wrong approaches:

| The approach | The result |
|---|---|
| Build the whole warehouse at once, designing everything before building | Two years later nobody can use anything; the requirements have changed |
| Each department builds its own mart | Fast, and no mart can be joined to any other |

Bus architecture goes between them: **deliver small immediately usable pieces**, but with every piece plugging into
the same "bus" — a shared set of [conformed dimensions](../skills/conformed-dimension.md).
The metaphor is a computer's data bus: a new card plugs in and works, because the interface standard was
agreed in advance.

The condition in exchange: **the dimensions must be designed before the facts**, and designed for the whole
enterprise rather than for one department.

## The bus matrix — it should be a data table

A bus matrix usually lives as a slide and then gets forgotten. To make it usable, let it be **a
table in the warehouse**: rows are business processes, columns are dimensions.

```sql
CREATE TABLE bus_matrix AS
SELECT * FROM (VALUES
  ('Mua hang','Ngay',true), ('Mua hang','Nha cung cap',true),
  ('Mua hang','San pham',true), ('Mua hang','Khach hang',false), ('Mua hang','Kho',true),
  ('Nhap kho','Ngay',true), ('Nhap kho','Nha cung cap',true),
  ('Nhap kho','San pham',true), ('Nhap kho','Khach hang',false), ('Nhap kho','Kho',true),
  ('Ton kho','Ngay',true),  ('Ton kho','Nha cung cap',false),
  ('Ton kho','San pham',true), ('Ton kho','Khach hang',false), ('Ton kho','Kho',true),
  ('Ban hang','Ngay',true), ('Ban hang','Nha cung cap',false),
  ('Ban hang','San pham',true), ('Ban hang','Khach hang',true), ('Ban hang','Kho',true),
  ('Tra hang','Ngay',true), ('Tra hang','Nha cung cap',false),
  ('Tra hang','San pham',true), ('Tra hang','Khach hang',true), ('Tra hang','Kho',false)
) t(quy_trinh, dimension, co_dung);
```

```sql
PIVOT bus_matrix ON dimension USING bool_or(co_dung) GROUP BY quy_trinh;
```

```text
┌───────────┬────────────┬─────────┬─────────┬──────────────┬──────────┐
│ quy_trinh │ Khach hang │   Kho   │  Ngay   │ Nha cung cap │ San pham │
├───────────┼────────────┼─────────┼─────────┼──────────────┼──────────┤
│ Mua hang  │ false      │ true    │ true    │ true         │ true     │
│ Nhap kho  │ false      │ true    │ true    │ true         │ true     │
│ Tra hang  │ true       │ false   │ true    │ false        │ true     │
│ Ton kho   │ false      │ true    │ true    │ false        │ true     │
│ Ban hang  │ true       │ true    │ true    │ false        │ true     │
└───────────┴────────────┴─────────┴─────────┴──────────────┴──────────┘
```

Each row is **one prospective fact table**; each `true` cell is one foreign key. Looking at this table
shows you the whole warehouse's scope at a glance.

### Three questions this table answers immediately

**1. Which dimension must be conformed first?** The one attached to the most processes:

```sql
SELECT dimension, count(*) FILTER (WHERE co_dung) AS so_quy_trinh_dung
FROM bus_matrix GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌──────────────┬───────────────────┐
│  dimension   │ so_quy_trinh_dung │
├──────────────┼───────────────────┤
│ Ngay         │                 5 │
│ San pham     │                 5 │
│ Kho          │                 4 │
│ Khach hang   │                 2 │
│ Nha cung cap │                 2 │
└──────────────┴───────────────────┘
```

`Ngay` and `San pham` attach to all 5 processes — get those two wrong and the whole warehouse is wrong. That's
the order to spend effort in, and it's grounded rather than instinctive.

**2. How tightly linked is the warehouse right now?**

```sql
SELECT count(*) FILTER (WHERE co_dung) AS o_can_conform,
       count(*)                        AS o_toi_da,
       round(100.0 * count(*) FILTER (WHERE co_dung) / count(*), 1) AS mat_do_pct
FROM bus_matrix;
```

```text
┌───────────────┬──────────┬────────────┐
│ o_can_conform │ o_toi_da │ mat_do_pct │
├───────────────┼──────────┼────────────┤
│            18 │       25 │       72.0 │
└───────────────┴──────────┴────────────┘
```

**72%** — a metric you can track over time. Rising density means the warehouse is increasingly
linked; more facts sharing more dimensions.

**3. Which question is impossible?** A `false` cell tells you immediately: you can't ask *"inventory by
customer"*, because inventory has no customer dimension. Knowing that in advance is far cheaper than
discovering it three months later — see the [case study of two marts that couldn't be joined](../case-studies/hai-mart-khong-ghep-duoc.md).

## The value chain — why the row order matters

The processes in a bus matrix aren't discrete; they link into a **value chain**:

```text
Mua hang → Nhap kho → Ton kho → Ban hang → Tra hang
```

Each step is its own fact, with its own grain and its own data cadence. But because they share
`dim_san_pham`, they can **drill across** along the chain:

```sql
SELECT coalesce(m.san_pham, b.san_pham)     AS san_pham,
       m.so_luong                           AS mua,
       n.so_luong                           AS nhap_kho,
       t.so_luong                           AS con_ton,
       b.so_luong                           AS da_ban,
       coalesce(r.so_luong, 0)              AS bi_tra,
       m.so_luong - n.so_luong              AS hao_hut_van_chuyen,
       n.so_luong - t.so_luong - b.so_luong AS chua_giai_thich_duoc
FROM fct_mua m
FULL JOIN fct_nhap n USING (san_pham)
FULL JOIN fct_ton  t USING (san_pham)
FULL JOIN fct_ban  b USING (san_pham)
FULL JOIN fct_tra  r USING (san_pham)
ORDER BY 1;
```

```text
┌──────────┬───────┬──────────┬─────────┬────────┬────────┬────────────────────┬──────────────────────┐
│ san_pham │  mua  │ nhap_kho │ con_ton │ da_ban │ bi_tra │ hao_hut_van_chuyen │ chua_giai_thich_duoc │
├──────────┼───────┼──────────┼─────────┼────────┼────────┼────────────────────┼──────────────────────┤
│ SP-A     │   100 │       98 │      30 │     68 │      4 │                  2 │                    0 │
│ SP-B     │    50 │       50 │      12 │     38 │      0 │                  0 │                    0 │
└──────────┴───────┴──────────┴─────────┴────────┴────────┴────────────────────┴──────────────────────┘
```

The last two columns are the reason this whole architecture exists. `hao_hut_van_chuyen = 2` for `SP-A` —
100 bought, 98 received — is a question **no single process can answer**. It only
appears when you place two facts side by side through a shared dimension.

`chua_giai_thich_duoc = 0` is an invariant worth turning into a test: receipts must equal inventory plus
sales. Anything other than 0 means there's shrinkage, or a fact hasn't been fully loaded.

And the margin — computable only when both ends of the chain conform:

```text
┌──────────┬──────────┬───────────────┬───────┬──────────┐
│ san_pham │ tien_mua │ doanh_thu_ban │ chenh │ bien_pct │
├──────────┼──────────┼───────────────┼───────┼──────────┤
│ SP-B     │    40000 │         76000 │ 36000 │     90.0 │
│ SP-A     │    60000 │        108000 │ 48000 │     80.0 │
└──────────┴──────────┴───────────────┴───────┴──────────┘
```

**Note:** this is drilling across — aggregating each fact to the same grain **first**, and only then combining.
Joining two facts of different grain directly is the failure in
[joining two facts inflates the total](../case-studies/join-hai-fact-lam-phong-tong.md).

## The opportunity/stakeholder matrix — which to build first

The bus matrix says *what can be joined to what*. The opportunity matrix says *which to build
first*: rows are still processes, columns are **departments**.

```sql
SELECT quy_trinh, count(*) FILTER (WHERE quan_tam) AS so_phong_ban_quan_tam,
       list(phong_ban) FILTER (WHERE quan_tam)     AS ai_dung
FROM opportunity GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌───────────┬───────────────────────┬───────────────────────────────────────┐
│ quy_trinh │ so_phong_ban_quan_tam │                ai_dung                │
├───────────┼───────────────────────┼───────────────────────────────────────┤
│ Tra hang  │                     3 │ [Kinh doanh, Marketing, Van hanh kho] │
│ Ban hang  │                     3 │ [Kinh doanh, Tai chinh, Marketing]    │
│ Ton kho   │                     2 │ [Tai chinh, Van hanh kho]             │
└───────────┴───────────────────────┴───────────────────────────────────────┘
```

The two tables are used together: the bus matrix gives the **technical cost** (how many dimensions
must be conformed), and the opportunity matrix gives the **value** (how many departments will use it). Build
first what many people use and what needs few new dimensions.

## Graceful extension — how far a dimensional model can be extended

Kimball puts *graceful extensions* among the fundamental concepts because it's why bus architecture
works: the following four changes **don't break** running reports:

| The change | Why it doesn't break |
|---|---|
| Adding an **attribute** to a dimension | Old queries don't select that column |
| Adding a **measure** to a fact (same grain) | The old `SELECT` doesn't touch it |
| Adding a **dimension** to a fact (same grain) | Old rows point at the "not applicable" row |
| Adding a **new fact** using existing dimensions | Nothing touches the old facts |

What **does** break, with no way of avoiding it: **changing an existing fact's grain**. This is why
[grain](grain.md) is the most expensive decision in the whole model — everything else can be fixed
incrementally.

The practical consequence: when torn between a fine grain and a coarse one, **always choose finer**. Rolling up
is always possible; splitting down means rebuilding from scratch.

## Trade-offs

| You get | You lose |
|---|---|
| Delivering immediately usable pieces | You must agree the dimensions **first**, which is organisational work |
| Every mart can be joined later | The first project spends extra time building conformed dimensions |
| The bus matrix as a table → measurable, queryable | It has to be updated when the warehouse changes |
| Extensions don't break what exists | Unless you change the grain — for which there's no way back |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Each department building its own `dim_khach` | No mart can be joined — [case study](../case-studies/moi-mart-mot-dim-khach.md) |
| Doing the bus matrix once and leaving it in a slide | Six months later it doesn't match reality |
| Building the facts first and conforming the dimensions after | Every already-loaded foreign key must be fixed |
| Choosing the first process by "who shouted loudest" | It may be the process the fewest people use |
| Joining two facts in the value chain directly | An inflated total — you must drill across |
| Choosing a coarse grain "to keep it tidy" | It can't be extended, and must be rebuilt |

## Related Topics

- [Conformed dimensions](../skills/conformed-dimension.md) — what the "bus" actually is
- [Conformed facts](../skills/conformed-facts.md) — joining them is one thing, comparing them is another
- [The 4-step design process](design-process.md) — the bus matrix is step 1's output
- [Grain](grain.md) — the one thing that can't be extended gracefully
- [CS: a dim_khach per mart](../case-studies/moi-mart-mot-dim-khach.md)
- [CS: two marts that couldn't be joined](../case-studies/hai-mart-khong-ghep-duoc.md)

## References

- Kimball Group — [Enterprise Data Warehouse Bus Architecture · Bus Matrix · Value Chain · Opportunity/Stakeholder Matrix · Graceful Extensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chapters 4 and 16
