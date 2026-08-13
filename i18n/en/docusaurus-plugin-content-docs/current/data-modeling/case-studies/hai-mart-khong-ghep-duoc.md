---
title: Two correct marts that together can't answer anything
sidebar_position: 4
description: The sales team and the customer-service team each built their own dim_khach_hang — making any question cutting across the two impossible.
tags: [case-study, conformed-dimension, bus-matrix, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Two correct marts that together can't answer anything

> **A reconstructed situation**, not an incident encountered here. **Every number was really run.**

> **Takeaway:** when two marts each build their own dimension, **each side runs correctly**, but a
> question cutting across the two is impossible. This is the most expensive technical debt in a data
> warehouse, and it **has no symptoms** until somebody asks the first such question.

## Context

Two teams, two quarters, two independent projects. Nobody did anything wrong.

```sql
-- Team ban hang, quy 1
CREATE TABLE dim_kh_ban AS SELECT * FROM (VALUES
 ('KH01','Miền Bắc'),('KH02','Miền Nam'),('KH03','Miền Nam')) AS t(ma_khach, khu_vuc);

-- Team CSKH, quy 2 — khong biet team kia da lam gi
CREATE TABLE dim_kh_cskh AS SELECT * FROM (VALUES
 ('C-01','HN'),('C-02','HCM'),('C-03','HCM')) AS t(ma_kh_cskh, khu_vuc);
```

Each mart runs perfectly. The sales team:

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ Miền Bắc │   5000000 │
│ Miền Nam │   5000000 │
└──────────┴───────────┘
```

The customer-service team:

```text
┌─────────┬───────────┐
│ khu_vuc │ so_ticket │
├─────────┼───────────┤
│ HCM     │        13 │
│ HN      │        12 │
└─────────┴───────────┘
```

Both were signed off. Both are correct.

## Symptoms

Six months later the boss asks a perfectly ordinary question:

> *"Which region has high revenue and also a high support-ticket count? Are we selling
> a lot where we serve people badly?"*

Try combining the two region value sets:

```sql
SELECT b.khu_vuc AS kv_ban_hang, h.khu_vuc AS kv_cskh
FROM (SELECT DISTINCT khu_vuc FROM dim_kh_ban) b
FULL OUTER JOIN (SELECT DISTINCT khu_vuc FROM dim_kh_cskh) h ON b.khu_vuc = h.khu_vuc;
```

```text
┌─────────────┬─────────┐
│ kv_ban_hang │ kv_cskh │
├─────────────┼─────────┤
│ Miền Bắc    │ NULL    │
│ Miền Nam    │ NULL    │
│ NULL        │ HCM     │
│ NULL        │ HN      │
└─────────────┴─────────┘
```

**Not a single value matches.** Four rows, none of which has both columns.

And worse: the customer keys differ too (`KH01` vs `C-01`) — there's no way to know whether `KH01`
and `C-01` are the same person.

The boss's question is **unanswerable**, even though the data has been complete for six months.

## The wrong hypotheses at first

| The proposal | Why it doesn't solve it |
|---|---|
| "Write a region mapping table" | HN is in the North — but which region is "Other" in? The mapping **doesn't exist** |
| "Join by customer name" | Duplicate names, different capitalisation, with and without diacritics |
| "Normalise one side to match the other" | The right direction, but which side is the standard? Both are serving live reports |
| "Build a third mart merging both" | You still have to answer "what does region mean" first |

The crux: this **isn't a technical problem**. It's the problem of **two teams never having agreed
a definition**, and no SQL can solve that.

## The real cause

The two dimensions **aren't conformed**. They break all three conditions:

| Condition | Status |
|---|---|
| The same surrogate key | ❌ `KH01` vs `C-01` |
| The same attribute value set | ❌ North/Central/South vs HN/HCM/Other |
| The same business definition | ❌ where it's delivered vs where they registered for support |

The third condition is the root, and it's the one **not checkable with SQL**. The two sides use
the same word — "region" — for two different concepts.

Worth noting: if the two sides happened to use **the same value set** with different definitions, the situation
would be **even more dangerous** — the numbers would add up, produce a plausible result, and be wrong. Here at
least it breaks visibly.

## Why no test catches it

| Test | The result |
|---|---|
| Every test in the sales mart | ✅ green |
| Every test in the customer-service mart | ✅ green |
| `relationships` within each mart | ✅ green |

There is no test **spanning the two marts**, because they're two separate projects with two separate
`schema.yml` files, usually in two separate repos.

This is the class of bug tooling can't help with — only **process** can.

## The fix

One shared dimension with the definition agreed once:

```sql
CREATE TABLE dim_khach_hang AS
SELECT row_number() OVER (ORDER BY ma_khach) AS khach_sk,
       ma_khach, ho_ten,
       khu_vuc            -- MỘT định nghĩa duy nhất
FROM khach_hang_raw;
```

Both facts point at this table via `khach_sk`. A team needing its own attribute **adds a
column**, rather than building a second table.

After that the boss's question is answerable by *drilling across* — see
[Conformed dimensions](../skills/conformed-dimension.md).

**The cost of fixing it late:** reloading both facts to assign `khach_sk`, fixing every running
report, and persuading two teams to abandon their own table. Done from the start it's just **one meeting**.

## How to spot it early

1. There are **two tables describing the same entity** under different names (`dim_khach_hang_ban_hang`,
   `dim_kh_cskh`).
2. A new mart is built **without reusing** any existing dimension.
3. Nobody has drawn a **bus matrix** — the fact × dimension table.

The cheapest check, runnable today:

```sql
-- hai dimension co cung tap gia tri khong?
SELECT 'ban_hang' AS nguon, khu_vuc FROM dim_kh_ban
UNION ALL SELECT 'cskh', khu_vuc FROM dim_kh_cskh
ORDER BY 2;
```

Differing value sets are hard evidence. **Matching ones still aren't enough** — you have to ask about the
definition.

**What to do before building the second mart:** draw the bus matrix. Its empty cells are where the pain will be
six months later.

## Related Topics

- [Conformed dimensions](../skills/conformed-dimension.md) — the three conditions, the bus matrix, drilling across
- [The 4-step design process](../reference/design-process.md) — the bus matrix sits at step 1
- [Surrogate keys](../reference/surrogate-key.md) — a shared key is the first condition
- [The six quality dimensions](../../data-quality/six-dimensions.md) — the *consistency* dimension
