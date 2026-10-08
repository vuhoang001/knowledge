---
title: Architecting (SAA-C03)
description: "The design layer — Domain 1 has just opened with IAM fundamentals and policy evaluation. The other three domains are still an outline."
category: technology
doc_type: index
status: draft
updated: 2026-10-08
---

# Architecting (SAA-C03)

> **Takeaway:** CLF asks *which service*; SAA asks *which service **under this
> constraint***. It adds exactly one thing over the foundations layer: **numbers** —
> RPO/RTO, budget, latency, IOPS.

Status: **Domain 1 has just opened.** The IAM part now has documents and three tiers of
exercises; the other three domains are still a planned outline. The outline exists so that
*"how much is left after CLF before SAA?"* has an answer today.

## Two document groups

| Group | Use when | Files |
|---|---|---|
| [**Reference**](reference/index.md) | Learning a mechanism for the first time | 2 |
| [**Exercises**](tutorials/index.md) | Hands-on — three tiers: emulator → real AWS → production | 3 |

This layer **does** have a `tutorials/` group, unlike [foundations](../foundations/index.md)
which deliberately does not: CLF-C02 states that *implementation* is out of scope, while
SAA-C03 does not — and the IAM material below is the first place hands-on work becomes
mandatory.

## The four SAA-C03 domains

| Domain | Weight | Content | Status |
|---|---|---|---|
| 1 — Design Secure Architectures | 30% | [IAM fundamentals](reference/iam-fundamentals.md) ✅ · [policy evaluation](reference/iam-policy-evaluation.md) ✅ · encryption, defence in depth ⬜ | 🔄 |
| 2 — Design Resilient Architectures | 26% | Multi-AZ, multi-Region, DR, decoupling | ⬜ |
| 3 — Design High-Performing Architectures | 24% | Caching, scaling, choosing storage/database by load | ⬜ |
| 4 — Design Cost-Optimized Architectures | 20% | Right-sizing, lifecycle, choosing a pricing model by pattern | ⬜ |

:::warning These weights need checking before you study

The four numbers above have **not been reconciled with the SAA-C03 exam guide PDF** —
unlike the CLF-C02 weights on the [AWS home page](../index.md#bốn-domain-và-trọng-số),
which come straight from the official guide. The first task when opening this layer is to
download the SAA-C03 exam guide and correct this table.

:::

## What this layer adds over CLF

| CLF-C02 teaches | SAA-C03 additionally demands |
|---|---|
| S3 has several storage classes | For access once a quarter with a 5-minute retrieval need, which class |
| Multi-AZ for HA | RDS Multi-AZ vs a read replica — which is HA, which scales reads |
| SQS and SNS exist | SNS → SQS fan-out, and why you do not wire them directly |
| Reserved Instances and Spot exist | Which architecture *survives* a Spot reclaim mid-session |
| IAM has roles | [Cross-account roles, trust policies, and when to use a resource-based policy](reference/iam-policy-evaluation.md) |

The right-hand column is where **real labs become mandatory** — no emulator can simulate
failover or policy evaluation, so this layer cannot be learned with a local lab alone. That
has now been **measured by hand** for the IAM part rather than assumed: see the
[table of which commands the emulator supports](tutorials/bt-01-co-ban.md#e3-measure-for-yourself-which-commands-the-emulator-supports).

## Related Topics

- [AWS](../index.md) — the topic containing this layer
- [Foundations (CLF-C02)](../foundations/index.md) — the base layer, finish it first
- [Reference](reference/index.md) · [Exercises](tutorials/index.md) — the two groups in this layer
