---
title: Policy evaluation
sidebar_position: 2
description: "The IAM evaluation engine — the order of checks, why boundaries and SCPs are an intersection, and the three places permissions narrow without anyone writing a Deny."
tags: [aws, saa-c03, iam, policy-evaluation, permission-boundary, scp, cross-account, pass-role, domain-1]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-08
---

# Policy evaluation

> **Takeaway:** Effective permissions are an **intersection**, not a sum. A request is
> allowed only if it clears **all four** gates — SCP, permission boundary, identity
> policy, resource policy — and meets **no** explicit `Deny` at any of them. Adding an
> `Allow` has never opened something that is being narrowed at a different gate.

[IAM fundamentals](iam-fundamentals.md) covers the building blocks. This document answers
the harder question, the one SAA-C03 Domain 1 asks: **for one specific request, how does
AWS decide to allow it or not.**

## Goal

After reading this you should be able to answer without looking it up: when a user with
`AdministratorAccess` still gets `AccessDenied`, **how many** things could be causing it,
and in what order to check them.

## Overview

### The five rules that decide everything

| # | Rule | What it means in practice |
|---|---|---|
| 1 | **Deny by default** (implicit deny) | No matching `Allow` ⇒ denied. Nobody has to write a `Deny`. |
| 2 | **An explicit `Deny` always wins** | One matching `Deny` ends it. No `Allow` can rescue it, not even `AdministratorAccess`. |
| 3 | **SCPs and permission boundaries only FILTER, they never GRANT** | A boundary allowing `s3:*` with an identity policy that says nothing about S3 ⇒ still no permissions. |
| 4 | **Same account:** either the identity *or* the resource policy allowing is enough.<br/>**Cross-account:** you need **both**. | A bucket policy alone can open access for a principal in the same account; cross-account it cannot. |
| 5 | **A role has no standing credentials** | `AssumeRole` returns **three** values: AccessKeyId + SecretAccessKey + **SessionToken**. Missing the third is the most common hand-rolled mistake. |

### Evaluation order — investigate incidents in exactly this order

```text i18n-prose
request
  │
  ├─ 1. SCP (if the account is in Organizations)   -> fails here and it stops; logs stay vague
  ├─ 2. Permission boundary (if the principal has one) -> fails here and it stops
  ├─ 3. Identity-based policy (user/group/role)    -+
  ├─ 4. Resource-based policy (bucket policy, …)   -+-> rule 4 above
  ├─ 5. Session policy (if passed at AssumeRole)   -> another intersection
  └─ An explicit Deny at ANY step -> denied immediately, the rest is skipped
```

This order is why *"I am an admin and still get `AccessDenied`"* has **five** suspects, and
four of the five are **not in the user's policy**. Starting with the user's policy is the
slowest route.

### The three places permissions narrow without anyone writing a `Deny`

This is the most counter-intuitive part — all three are an **intersection**, not a `Deny`:

| Mechanism | Scope | Formula | Remember it as |
|---|---|---|---|
| **SCP** | every principal in a member account of Organizations | permissions = SCP ∩ identity policy | *A ceiling over the whole account.* Even an admin in a member account cannot exceed it. Does not apply to the management account. |
| **Permission boundary** | one specific user or role | permissions = boundary ∩ identity policy | *A fence around one person.* Used so developers can create roles without granting themselves more. |
| **Session policy** | one `AssumeRole` session | permissions = session policy ∩ the role's permissions | *A temporary shrink.* Hand a third party fewer permissions than the role itself. |

None of the three ever **grants** anything. A boundary allowing `s3:*` while the identity
policy only allows `dynamodb:*` means the effective permission set is **`dynamodb:*`
blocked entirely by the boundary** — that is, **no permissions at all**. The intersection
of two disjoint sets is empty.

### `iam:PassRole` — the most underestimated escalation permission

When you tell a service *"run as this role"* (attaching a role to EC2, setting a role for
a Lambda, giving an ECS task a role), AWS checks **two** permissions:

1. Permission to call the API itself — `lambda:CreateFunction`.
2. **`iam:PassRole`** for the exact role being handed over.

Without the second, the call fails even though the first is in place. And more important:
**anyone with broad `iam:PassRole` effectively holds the broadest role they can hand
over** — they create a Lambda carrying an admin role and run code inside it. That is why
`iam:PassRole` with `Resource: "*"` must be granted as if granting admin, not as a minor
extra.

Same family: `iam:CreatePolicyVersion` (rewriting the contents of an attached policy),
`iam:AttachUserPolicy`, `iam:UpdateAssumeRolePolicy`.

### Trust policy — the only policy that decides *who gets in*

A trust policy is the **role's resource-based policy**. Two conditions must hold at once:

- The role's trust policy must `Allow` that principal to `sts:AssumeRole`.
- If the trust policy names the **account root** (`arn:aws:iam::<account>:root`) rather
  than the principal itself, the principal also needs `sts:AssumeRole` in its own identity
  policy.

Naming the user's or role's ARN explicitly in the trust policy removes the need for the
second condition. Cross-account always needs both sides — exactly rule 4.

### Confused deputy, and the two condition keys that stop it

When a trust policy opens up to a **service** (`"Service": "glue.amazonaws.com"`), you are
saying *"this service may assume my role"* — but that service also serves other accounts.
With no conditions, a stranger can ask that same service to use your role.

```json
{
  "Effect": "Allow",
  "Principal": {"Service": "glue.amazonaws.com"},
  "Action": "sts:AssumeRole",
  "Condition": {
    "StringEquals": {"aws:SourceAccount": "<your-account-id>"},
    "ArnLike":      {"aws:SourceArn": "arn:aws:glue:<region>:<account-id>:job/*"}
  }
}
```

`aws:SourceAccount` + `aws:SourceArn` pin it down to *"only when the call originates from
my own resources"*. This is the mandatory pattern for every service role, not an option.

### The operator trap: `ForAllValues` over an empty set

Two multi-value operators with **opposite** meanings, and one of them has a back door:

| Operator | True when |
|---|---|
| `ForAnyValue:` | **at least one** value in the request matches |
| `ForAllValues:` | **every** value in the request matches — **and the empty set also satisfies it** |

That bold clause is the trap. The policy below *looks like* it requires tags, but in fact
it allows a request that **sends no tags at all**:

```json
{
  "Effect": "Allow",
  "Action": "ec2:RunInstances",
  "Resource": "*",
  "Condition": {
    "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]}
  }
}
```

With no tags present, "every tag is in the list" is **true**. Fix it by requiring the key
to exist:

```json
"Condition": {
  "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]},
  "Null": {"aws:TagKeys": "false"}
}
```

`Null: "false"` means *"this key must exist in the request"*. Leaving it out is a real bug,
a common one in code review, and **nothing reports it as an error**.

### Condition keys that come up in the exam

| Key | Used to |
|---|---|
| `aws:PrincipalOrgID` | Open up to a whole Organization without listing account IDs |
| `aws:SourceAccount` · `aws:SourceArn` | Prevent confused deputy on a service role |
| `aws:MultiFactorAuthPresent` | Require MFA for dangerous actions, break-glass roles |
| `aws:SecureTransport` | Block non-TLS access (`Deny` when `false`) |
| `aws:RequestedRegion` | Restrict which regions may be used — usually set in an SCP |
| `aws:PrincipalTag` ⇄ `aws:ResourceTag` | Tag-based access control: one policy for many teams |

## Example

Hands-on exercises for everything on this page live in the
[**exercise directory**](../tutorials/index.md) — three tiers: syntax on the emulator,
evaluation logic on real AWS, then production patterns.

One hand-measured result belongs here because it shapes how you should study. On the local
AWS emulator, **the same policy gives two opposite answers** depending on how you ask:

| How you ask | For a principal whose only policy is `Deny s3:*` | Correct? |
|---|---|---|
| `aws iam simulate-principal-policy` | `explicitDeny` | ✅ |
| A real API call (`aws s3 ls` with that key) | **succeeds**, `rc=0` | ❌ |

⇒ The emulator **has** a policy evaluation engine but **does not wire it into the request
path**. The consequence for studying this page is very concrete: `simulate-principal-policy`
there correctly evaluates `Resource` scoping, policies inherited through groups,
`explicitDeny` ⇄ `implicitDeny` **and permission boundaries** — so **most of the logic on
this page can be learned for free**. The only thing you must take to real AWS is
**enforcement**, along with the four commands the emulator does not support
(`simulate-custom-policy`, `generate-credential-report`,
`get-account-authorization-details`, `generate-service-last-accessed-details`).

The full measurement table with real output:
[basic exercises](../tutorials/bt-01-co-ban.md#e3-measure-for-yourself-which-commands-the-emulator-supports).

:::warning One silent discrepancy in the emulator

`put-user-permissions-boundary` **does take effect** in simulation, but reading it back
with `get-user --query User.PermissionsBoundary` returns `null`. So auditing boundaries
with `get-user` on the emulator will report *"no boundary"* when there is one. Real AWS
returns the full `PermissionsBoundaryArn`.

:::

In any case **IAM on real AWS is free** — the API, roles, policies, Policy Simulator,
credential reports and Access Advisor all cost $0 — so there is no cost reason to avoid the
second tier.

## Exam traps

| Trap | Why it is wrong |
|---|---|
| Adding an `Allow` to open something under an explicit `Deny` | Rule 2 — `Deny` wins, permanently |
| Thinking a permission boundary **grants** permissions | Rule 3 — it is an intersection, it grants nothing |
| Thinking an SCP grants permissions to a member account | Also rule 3 — an SCP is a ceiling, not a source |
| Fixing cross-account access by editing only the bucket policy | Rule 4 — cross-account needs **both** sides |
| Granting `iam:PassRole` with `Resource: "*"` as a minor extra | Equivalent to granting admin |
| A trust policy open to a service with no `aws:SourceArn` | Confused deputy |
| `ForAllValues` to "require tags" | The empty set satisfies it; the `Null` check is missing |
| Using temporary credentials but forgetting `SessionToken` | Rule 5 — three values, not two |
| Believing a policy is tight because the emulator lab did not complain | The emulator does not enforce policies |

## Trade-offs

| Decision | You gain | You lose |
|---|---|---|
| A permission boundary on every role developers can create | Self-service without escalation | One more layer to explain; `AccessDenied` gets harder to read |
| SCPs restricting regions and services | A hard ceiling for the whole org, even for admins | Needs Organizations; block the wrong thing and nobody in the account can fix it |
| Least privilege derived from CloudTrail | Evidence-based, cuts genuinely unused permissions | Only shows what **has** been used — a quarterly action gets cut by mistake |
| Tag-based access control | One policy for N teams instead of N copies | Depends on correct tags; a wrong tag is a wrong permission, and anyone can edit tags |
| Simulating before applying | Catches bugs before they become incidents | The simulator **cannot see** SCPs or boundaries — green there can still be red in production |

## Related Topics

- [IAM fundamentals](iam-fundamentals.md) — the foundation layer: principals, the four blocks, policy and ARN anatomy
- [Access management](../../foundations/reference/access-management.md) — the CLF-C02 layer: root user, Identity Center
- [Governance and compliance](../../foundations/reference/security-governance-compliance.md) — SCPs and Organizations at the service-recognition level
- [IAM exercises](../tutorials/index.md) — three hands-on tiers
- [Architecting (SAA-C03)](../index.md) — the layer this document belongs to
