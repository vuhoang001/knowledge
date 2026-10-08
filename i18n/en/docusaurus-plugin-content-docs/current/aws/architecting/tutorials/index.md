---
title: Exercises — IAM
sidebar_key: aws-architecting-tutorials
sidebar_position: 0
description: "60 IAM exercises with solutions, three tiers: emulator (26, real output), real AWS (20), production (14). IAM on real AWS is free, so all three tiers cost close to $0."
tags: [tutorial, aws, iam, saa-c03]
domain: cloud
category: index
doc_type: index
updated: 2026-10-08
---

# Exercises — IAM

**60 exercises, each with a collapsed solution** — try it first, open it afterwards. The
three tiers are split by **where they run**, because where an exercise runs decides what it
can teach.

| # | Document | Count | Runs on | Content | Solutions |
|---|---|---|---|---|---|
| 10 | [Basic](bt-01-co-ban.md) | 26 | local emulator, free | identities · policies · roles & STS · **simulation** · measured traps | ✅ **real output** |
| 20 | [Intermediate](bt-02-trung-binh.md) | 20 | **real AWS**, $0 | real enforcement · advanced simulation · cross-account & SCPs · account audits · policy traps | 📝 expected + paste box |
| 30 | [Production](bt-03-production.md) | 14 | **real AWS**, $0 | removing static keys · OIDC · least privilege from CloudTrail · boundaries & SCPs · break-glass · ABAC | 📝 full configs |

Solutions in tier 10 are **real output** captured on 2026-10-08 against the emulator. The
two later tiers need your own AWS account, so their solutions are **expected results with
reasoning** plus full configs, and each exercise has a paste box — an empty box means you
have not done the exercise yet.

Read the theory first: [IAM fundamentals](../reference/iam-fundamentals.md), then
[Policy evaluation](../reference/iam-policy-evaluation.md).

## Suggested order

```text i18n-prose
Theory (reference)           ~30 min   able to answer the 5 self-check questions
10 Basic   A1-A6 B1-B6       1 session identities + policies, syntax in your fingers
           C1-C5             1 session roles, instance profiles, STS
           D1-D6             1 session SIMULATION — the most important part
           E1-E3             30 min    the trap: simulation right, API lets it through
--- finish the 3 cost-safety steps before moving to real AWS ---
20 Intermediate  I1-I20      2-3 sessions
30 Production    P1-P14      3-4 sessions  (P9, P13 need a second account)
```

🔴 **Why tier 10 does more than you would expect.** Measured by hand on 2026-10-08:
`simulate-principal-policy` **works** on the emulator and **evaluates correctly** —
including `Resource` scoping, policies inherited through groups,
`explicitDeny` ⇄ `implicitDeny`, and permission boundaries. So most of the logic is learned
**for free** in tier 10.

**The only thing the emulator cannot do is enforce:** for the same principal holding
`Deny s3:*`, `simulate-principal-policy` returns `explicitDeny` (correct) while a real
`aws s3 ls` **succeeds** (wrong). That is exercise
[E1](bt-01-co-ban.md#e1-the-big-trap-the-simulator-says-deny-the-api-lets-it-through), and
the reason tier 20 exists. The full measurement table:
[E3](bt-01-co-ban.md#e3-measure-for-yourself-which-commands-the-emulator-supports).

Write down every exercise where your **prediction was wrong**. The ones you got right
teach nothing more.

## Related Topics

- [IAM fundamentals](../reference/iam-fundamentals.md) — read before tier 10
- [Policy evaluation](../reference/iam-policy-evaluation.md) — the theory for all three tiers
- [Architecting (SAA-C03)](../index.md) — the layer this directory belongs to
- [Access management](../../foundations/reference/access-management.md) — the four IAM blocks at the foundations layer
