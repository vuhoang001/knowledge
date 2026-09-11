---
title: Case study — dbt
sidebar_key: dbt-case-studies
sidebar_position: 0
description: "Real incidents already debugged, with the wrong first hypothesis included."
tags: [case-study, dbt]
domain: data-engineering
category: index
doc_type: index
updated: 2026-09-11
---

# Case study — dbt

Real incidents already debugged, with **the wrong first hypothesis** included.

| # | Document | Answers the question | Status |
|---|---|---|---|
| 1 | [AI-generated content wrote the wrong Trino catalog name](ai-sinh-sai-ten-catalog-trino.md) | An afternoon lost to trusting AI-generated documentation — wrong in exactly the hardest place to verify | 🟡 draft |
| 2 | [E-commerce — the incremental model dropped a late-edited order](incremental-mat-don-sua-muon.md) | Row counts match, tests green, revenue still off by 300k | 📝 has real output |
| 3 | [Fintech — the snapshot recorded the wrong timestamp](snapshot-ghi-nham-moc-thoi-gian.md) | `dbt_valid_from` is the job's run time — as-was off by 25% | 📝 has real output |
| 4 | [Marketplace — shipping fees double-counted after a join](phi-ship-cong-lap-sau-join.md) | The join changed the grain; `sum()` on an order-level column inflated it 7% | 📝 has real output |

## Related Topics

- [dbt](../index.md) — the topic this directory belongs to
