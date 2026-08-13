---
title: Choosing OBT, and six months later the boss asks an as-is question
sidebar_position: 7
description: One Big Table gives as-was for free, but the question "by current region" has no way of being answered.
tags: [case-study, obt, star-schema, scd, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Choosing OBT, and six months later the boss asks an as-is question

> **A reconstructed situation**, not an incident encountered here. **The numbers were really run on DuckDB.**

> **Takeaway:** [OBT](../reference/star-snowflake-obt.md) answers as-was for free and **loses
> as-is entirely**. Choosing OBT as the only place data is stored locks you into exactly one kind of question
> — and you don't know in advance which kind you'll need.

## Context

A lakehouse, Parquet, well-compressed columns. Measurement shows OBT costs barely more space than a star, and
queries are faster because there are no joins. The decision: **flatten everything into one table**.

```sql
CREATE TABLE obt AS SELECT * FROM (VALUES
 ('DH1',DATE '2026-01-10','KH01','Nguyễn A','Miền Bắc',5000000),
 ('DH2',DATE '2026-02-15','KH01','Nguyễn A','Miền Bắc',3000000),
 ('DH3',DATE '2026-06-20','KH01','Nguyễn A','Miền Nam',2000000),
 ('DH4',DATE '2026-06-25','KH02','Trần B',  'Miền Nam',4000000))
 AS t(ma_don, ngay, khach_id, ho_ten, khu_vuc, tien);
```

The first six months go well. The as-was question is answered for free:

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ Miền Bắc │   8000000 │
│ Miền Nam │   6000000 │
└──────────┴───────────┘
```

Correct — `KH01` bought in the North and then moved south, and OBT preserves the region **at purchase time**.

## Symptoms

The boss asks:

> *"For the customers currently in the South, how much have they bought in total, all time?"*

That's an **as-is** question — grouping by *current* region, not by region at purchase. Try it:

```sql
SELECT khach_id, count(DISTINCT khu_vuc) AS so_khu_vuc_khac_nhau
FROM obt GROUP BY 1;
```

```text
┌──────────┬──────────────────────┐
│ khach_id │ so_khu_vuc_khac_nhau │
├──────────┼──────────────────────┤
│ KH01     │                    2 │
│ KH02     │                    1 │
└──────────┴──────────────────────┘
```

`KH01` has **two** regions in the OBT. Which is the current one? **OBT doesn't know.** It has only
discrete snapshots and no notion of "the current version".

## The wrong hypothesis at first

**"Take each customer's most recent row and you have the current region."** It sounds perfectly reasonable:

```sql
SELECT khach_id, khu_vuc, ngay FROM obt
WHERE (khach_id, ngay) IN (SELECT khach_id, max(ngay) FROM obt GROUP BY 1);
```

```text
┌──────────┬──────────┬────────────┐
│ khach_id │ khu_vuc  │    ngay    │
├──────────┼──────────┼────────────┤
│ KH01     │ Miền Nam │ 2026-06-20 │
│ KH02     │ Miền Nam │ 2026-06-25 │
└──────────┴──────────┴────────────┘
```

It looks right. **But it's only right for customers who are still buying.**

For a customer who stopped buying in 2024, the "most recent row" holds the region **as of 2024** — not the
present. They may have moved twice since. And OBT **has no way of knowing**, because that
information only enters the OBT when there's a transaction.

This is where the hypothesis becomes dangerous: it's **right for most rows**, so spot-checking a few customers
looks fine — and it's wrong for exactly the churned customers, the group the question usually targets.

## The real cause

OBT embeds attributes into the fact **at write time**. The consequences:

| | OBT has | OBT lacks |
|---|---|---|
| The value at transaction time | ✅ | |
| The current value | | ❌ |
| When the value changed | | ❌ |
| The value on an arbitrary date | | ❌ |

The last three rows require the notion of a **version** — `valid_from` / `valid_to` — which OBT doesn't have
and can't derive. See [SCD](../skills/scd.md).

**Columnar storage can't rescue this.** Compression solves the storage cost; it doesn't create information
that was never recorded.

## Why no test catches it

| Test | The result |
|---|---|
| `not_null` on every column | ✅ green |
| `unique` on `ma_don` | ✅ green |
| Total revenue | ✅ correct |

Nothing is wrong with the OBT. It's doing exactly what it was designed to do.

This is the class of "bug" tests **in principle** can't catch: the needed data **was never
recorded**. No invariant is broken — there's just a question that can't be answered.

## The fix

It can't be fixed with a query. You have to **change the model**, and that's why it's expensive.

The correct approach — a hybrid model:

```text
nguồn → silver: star schema, dim Type 2 đầy đủ    ← nguồn sự thật
      → gold:   OBT dẹt cho từng use case BI      ← sản phẩm dẫn xuất
```

With silver holding a Type 2 `dim_khach_hang`, both questions are answerable:

```sql
-- as-was: khu vuc luc mua
JOIN dim_khach_hang d ON f.khach_sk = d.khach_sk

-- as-is: khu vuc hien tai
JOIN dim_khach_hang d ON f.khach_id = d.khach_id AND d.is_current
```

**The cost of fixing it late:** no source can rebuild the lost history. The past six months contain only
discrete snapshots — a Type 2 built from today only has history **from today**. Everything before that
is lost permanently.

There's also a smaller but persistent cost: fixing a typo in a customer's name means rewriting every
row for that customer.

```text
┌──────────────────┐
│ so_dong_phai_sua │
├──────────────────┤
│                3 │
└──────────────────┘
```

Three rows in the toy example. At real scale it's millions.

## How to spot it early

1. You have an **OBT as the only place data is stored**, with no star schema behind it.
2. Nobody has asked *"does this column need as-was or as-is"* for each attribute.
3. There are descriptive attributes (region, tier, segment) embedded straight into the OBT with **no**
   corresponding dimension in a layer below.

**The one-sentence test, runnable today:**

```sql
SELECT count(*) AS so_khach_da_doi_thuoc_tinh FROM (
  SELECT khach_id FROM obt GROUP BY 1 HAVING count(DISTINCT khu_vuc) > 1
);
```

A result greater than 0 means that attribute **does change over time** — and you aren't storing its
history in a queryable form.

## Related Topics

- [Star, snowflake, OBT](../reference/star-snowflake-obt.md) — the three layouts, with the cost really measured
- [SCD](../skills/scd.md) — what OBT lacks: the notion of a version
- [Historical reports changing their own numbers](bao-cao-qua-khu-tu-doi-so.md) — the inverse case: only as-is, as-was lost
- [Grain](../reference/grain.md) — OBT doesn't change the fact's grain, only how attributes are stored
