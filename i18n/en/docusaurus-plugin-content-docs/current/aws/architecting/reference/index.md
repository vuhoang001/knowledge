---
title: Reference — Architecting (SAA-C03)
sidebar_key: aws-architecting-reference
sidebar_position: 0
description: "In-depth documents for the SAA-C03 layer. Domain 1 has just opened with two IAM documents: the fundamentals, then the policy evaluation engine."
tags: [reference, aws, saa-c03]
domain: cloud
category: index
doc_type: index
updated: 2026-10-08
---

# Reference — Architecting (SAA-C03)

This layer differs from [foundations](../../foundations/index.md) in one way: foundations
asks *which service*, this layer asks *which service **under this constraint***, and
answers with mechanisms rather than with a catalogue.

## Domain 1 — Design Secure Architectures

| # | Document | Answers | Status |
|---|---|---|---|
| 1 | [IAM fundamentals](iam-fundamentals.md) | **Read first.** What a principal is, the four blocks user/group/role/policy, the anatomy of a policy document and an ARN, the six policy types, diagnosing `AccessDenied` | 📝 |
| 2 | [Policy evaluation](iam-policy-evaluation.md) | For one specific request, how AWS decides to allow or deny it — and the three places permissions narrow without anyone writing a `Deny` | 📝 |

The rest of Domain 1 (encryption, KMS, defence in depth) and the other three domains are
still a planned outline on the [layer home page](../index.md).

## Related Topics

- [IAM exercises](../tutorials/index.md) — three hands-on tiers for the documents above
- [Architecting (SAA-C03)](../index.md) — the layer this group belongs to
- [Reference — Foundations](../../foundations/reference/index.md) — the 19 base-layer documents
