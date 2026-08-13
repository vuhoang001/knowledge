---
title: Case studies — Data Modeling
sidebar_key: data-modeling-case-studies
sidebar_position: 0
description: Twenty-four classic dimensional-model failures, each with symptoms, the wrong hypotheses at first, and the fix.
tags: [case-study, data-modeling]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Case studies — Data Modeling

Twenty-four classic dimensional-model failures. Each follows the same thread:
**symptoms → the wrong hypotheses at first → the real cause → the fix → how to spot it
early**.

> **These are reconstructed situations**, not incidents encountered in this repo — a "real" case study
> as defined in [`ROUTING.md`](https://github.com/vuhoang001/knowledge/blob/main/ROUTING.md)
> must be an incident already debugged. In compensation, **every number was really run on DuckDB**, so
> pasting it back gives exactly the same output.

| # | The incident | The lesson | Related technique |
|---|---|---|---|
| 1 | [The January report changing its numbers in April](bao-cao-qua-khu-tu-doi-so.md) | Type 1 lets a closed past still change | [SCD](../skills/scd.md) |
| 2 | [Revenue 67% inflated by joining two facts](join-hai-fact-lam-phong-tong.md) | Joining two facts of different grain directly duplicates rows | [Grain](../reference/grain.md) |
| 3 | [A dimension 365× bloated after a year](dimension-phinh-365-lan.md) | Type 2 bloats at the fastest-changing column's rate | [Mini-dimensions](../skills/mini-dimension.md) |
| 4 | [Two correct marts that can't answer anything combined](hai-mart-khong-ghep-duoc.md) | Without conformance, a cross-cutting question is impossible | [Conformed dimensions](../skills/conformed-dimension.md) |
| 5 | [Adding an eighth status](them-trang-thai-thu-tam.md) | A business definition living in a `WHERE` has no owner | [Junk dimensions](../skills/junk-dimension.md) |
| 6 | [Half the orders vanished](don-dang-giao-bien-mat.md) | An ordinary `JOIN` wipes out rows with a `NULL` key | [Role-playing dimensions](../skills/role-playing-dimension.md) |
| 7 | [Choosing OBT and then needing as-is](chon-obt-roi-can-as-is.md) | OBT gives as-was for free and loses as-is entirely | [Star/snowflake/OBT](../reference/star-snowflake-obt.md) |
| 8 | [The fiscal quarter 202% out](bao-cao-quy-tai-chinh-lech.md) | `quarter()` answers about calendar quarters — which nobody asked about | [The date dimension](../reference/date-dimension.md) |
| 9 | [The order dim inflating revenue 40%](dim-don-hang-lam-phong-doanh-thu.md) | Not every key deserves a dimension | [Degenerate dimensions](../skills/degenerate-dimension.md) |
| 10 | [The level-3 report losing half the revenue](bao-cao-cap-3-mat-mot-nua.md) | A ragged tree flattened to a fixed depth — shallow branches fall into `NULL` | [Hierarchies](../skills/hierarchy.md) |
| 11 | [The North at zero, 28% of revenue lost](fact-den-muon-gan-sai-khu-vuc.md) | `AND la_hien_tai` nullifies the entire value of Type 2 | [Late-arriving data](../skills/late-arriving.md) |
| 12 | [The dashboard says 800, a manual query says 1,000](bang-tong-hop-lech-so.md) | A summary table storing `avg` and never being reloaded | [Aggregate fact tables](../skills/aggregate-fact-table.md) |
| 13 | [January revenue falling 10% by itself](doanh-thu-doi-theo-ty-gia.md) | Converting currency at read time makes the past move | [Multiple currencies](../skills/multi-currency-uom.md) |
| 14 | [Loaded twice, deleting 10 rows to kill 5](nap-hai-lan-khong-truy-duoc.md) | Without a run trace in the fact, you can only delete by date | [Audit dimensions](../skills/audit-dimension.md) |
| 15 | [Filtering "not cancelled" losing a quarter](loc-khac-huy-mat-mot-phan-tu.md) | `NULL <> 'x'` returns `UNKNOWN`, and `WHERE` keeps only `TRUE` | [NULLs in facts and dimensions](../skills/null-handling.md) |
| 16 | [Two departments, two revenue figures](hai-phong-hai-doanh-thu.md) | The same column name with a different formula — a plausible, meaningless ratio | [Conformed facts](../skills/conformed-facts.md) |
| 17 | [A dashboard full of Y, N and y](co-y-n-tren-dashboard.md) | Source-system codes reaching the report; one concept becoming three groups | [Designing dimension attributes](../skills/dimension-attribute-design.md) |
| 18 | [The shipping fee 133% inflated](phi-ship-phong-133-phan-tram.md) | An order-level measure duplicated down to the line; the goods amount still matches | [Header/line and fact allocation](../skills/allocated-facts.md) |
| 19 | [A fact with eight foreign keys for two dimensions](fact-hai-chuc-khoa-ngoai.md) | Each level of one hierarchy becoming its own dimension | [Centipede fact tables](../skills/centipede-fact.md) |
| 20 | [Summing a running-total column — 2.13× inflated](cong-cot-luy-ke.md) | A YTD column looks identical to an ordinary revenue column | [Year-to-date and timespan](../skills/ytd-timespan-facts.md) |
| 21 | [Summing an aggregate column in a dimension](cong-cot-tong-hop-trong-dim.md) | The column is right, the join is right, the fact is right — and the result is wrong | [Putting behaviour into a dimension](../skills/behavior-dimension.md) |
| 22 | [dim_san_pham 67% empty](bang-san-pham-hai-phan-ba-o-trong.md) | Many entity kinds in one table; no column can be `NOT NULL` | [Heterogeneous entities](../skills/heterogeneous-schema.md) |
| 23 | [Today's figure jumping all day](so-hom-nay-nhay-suot-ngay.md) | An incomplete day still counted as a whole one | [Real-time fact tables](../skills/real-time-fact.md) |
| 24 | [Five marts, none of them joinable](moi-mart-mot-dim-khach.md) | Building marts before agreeing the dimensions | [Bus architecture](../reference/bus-architecture.md) |

## What all twenty-four have in common

**Every technique in Data Modeling's `reference/` and `skills/` has at least one illustrating case
study** — linter rule R15 checks this.

Exactly **one** case has a red test, and that red test is useless: in
[the loaded-twice case](nap-hai-lan-khong-truy-duoc.md), `unique` reports "there are duplicates" but can't say
which row is the surplus. In the other twenty-three:

- The SQL runs correctly
- Every dbt test is green
- The pipeline is green

The error is at **the decision step before the first line of SQL was written**. That's why the
[Reference](../reference/index.md) section is worth reading more carefully than the tooling section.

## Related Topics

- [Data Modeling](../index.md) — the topic this directory belongs to
- [Reference](../reference/index.md) — the underlying concepts behind all four cases
- [Skills](../skills/index.md) — the technique that fixes each case
