---
title: IAM fundamentals
sidebar_position: 1
description: "IAM from zero: principals, the four building blocks user/group/role/policy, the anatomy of a policy document and an ARN, the six policy types, and how to diagnose AccessDenied."
tags: [aws, iam, saa-c03, policy, role, arn, sts, principal, domain-1]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-08
---

# IAM fundamentals

> **Takeaway:** Every AWS API call carries one question with it: *"**who** wants to do
> **what** to **which resource**, under **what conditions**?"* IAM is the system that
> answers it. Those four bold slots are exactly the four fields you write in a policy —
> `Principal`, `Action`, `Resource`, `Condition` — so learning IAM is really learning to
> write the answer to those four slots.

This document is the **foundation layer**: read it before
[Policy evaluation](iam-policy-evaluation.md) (the evaluation engine) and before working
through the [exercise set](../tutorials/index.md).

## Goal

After reading this you should be able to answer, without looking anything up:

- When to use a **user** and when to use a **role** — and why the answer is almost always
  a role.
- What each field in a policy document does, and what you lose by omitting it.
- How many parts an ARN has, and why an S3 ARN has two empty slots.
- How many **types** of policy exist, which ones **grant** permissions and which only
  **filter**.
- In what order to investigate an `AccessDenied`.

## Overview

### 1. Authentication vs authorization: two different questions

| Question | Name | How AWS answers it |
|---|---|---|
| *Who are you?* | **authentication** | access key, session token, SAML/OIDC assertion, password + MFA |
| *What are you allowed to do?* | **authorization** | policy |

The two layers are **independent**. Successful authentication does **not** mean you are
allowed to do anything — valid credentials with no policy allowing the call give you
`AccessDenied` on everything. Conversely, a policy granting `Action: "*"` is useless if
the credentials are wrong.

Telling the two layers apart means telling two completely different error messages apart:

```text i18n-prose
InvalidClientTokenId / SignatureDoesNotMatch   -> broke at AUTHENTICATION (credentials)
AccessDenied / UnauthorizedOperation           -> broke at AUTHORIZATION (policy)
```

### 2. Principal — the "who" in the question

A **principal** is the entity making the API call. There are four kinds, and they differ
in where the credentials come from:

| Principal | ARN looks like | Credentials |
|---|---|---|
| **IAM user** | `arn:aws:iam::123456789012:user/alice` | long-lived access key, or password + MFA |
| **Assumed role** | `arn:aws:sts::123456789012:assumed-role/deploy/session-1` | **temporary**, issued by STS, expires on its own |
| **AWS service** | `ec2.amazonaws.com`, `lambda.amazonaws.com` | the service assumes a role you hand it |
| **Root user** | `arn:aws:iam::123456789012:root` | the account owner's password |

Note the assumed-role ARN: it belongs to the **`sts`** service, not `iam`, and it contains
the **session name**. That is how CloudTrail can tell two people using the same role apart
— by session name, not by role name.

:::danger The root user

Root owns the account. It is **not** an IAM user, so you **cannot attach a policy** to
rein it in. There is only one correct way to handle it: **enable MFA, create no access
keys, never use it for day-to-day work.** The list of things only root can do is in
[Access management](../../foundations/reference/access-management.md).

:::

### 3. The four building blocks of IAM

#### User — a long-lived identity

Use it for **one specific human**, or for an application **outside** AWS that cannot speak
OIDC/SAML. It has standing credentials: a password (console sign-in) and/or an access key
(API calls).

A limit worth knowing: **2 access keys** per user — enough to rotate, not enough to be
lazy.

🔴 **In production you should have almost no IAM users for people.** Replace them with
**IAM Identity Center** (formerly AWS SSO): one sign-in for many accounts, connectable to
AD or an external IdP, issuing **temporary** credentials. Disabling one person in the IdP
disables them across every account at once.

#### Group — a set of users, only for attaching policies

| A group can | A group **cannot** |
|---|---|
| Contain many users | **Nest inside another group** |
| Hold policies that every member inherits | Be a principal — you cannot put a group in a policy's `Principal` |
| | Have credentials |

A group is an **organizational** tool, not an identity. The practical consequence: asking
*"what policies does this user have?"* with `list-attached-user-policies` returns
**empty** when the permissions live on the group — see
[exercise A4](../tutorials/bt-01-co-ban.md#a4-group-and-where-permissions-actually-live).

⇒ Checking a user's real permissions means checking **three** places: directly attached
policies, policies via groups, and inline policies.

#### Role — an identity with no standing credentials

This is the most important block, and the answer to most *"which approach is most
secure?"* questions.

A role has **no** access key. Anyone who wants to use it must **assume** it, and receives
**temporary** credentials that expire on their own. There is nothing left lying around to
leak.

Every role carries **two** policies, and confusing them is a common mistake:

| Policy on a role | Answers | Changed with |
|---|---|---|
| **Trust policy** (= the role's resource-based policy) | *who may enter this role* | `update-assume-role-policy` |
| **Permission policy** | *what this role may do* | `attach-role-policy` / `put-role-policy` |

Three situations that call for a role:

```text i18n-prose
1. Service calls service   EC2/Lambda/ECS needs to read S3
                           -> trust policy for "Service": "ec2.amazonaws.com"
2. Cross-account           a user in account A reads a bucket in account B
                           -> trust policy for "AWS": "arn:aws:iam::<A>:root"
3. Federation              people signing in with Google/AD/Okta, CI running on GitHub
                           -> trust policy for "Federated": "<oidc-provider>"
```

:::tip Instance profile — the wrapper that lets EC2 hold a role

EC2 does **not** take a role directly; it takes an **instance profile**, a wrapper holding
exactly one role. Lambda, ECS tasks and CodeBuild take a role directly. The console
creates the instance profile implicitly, so many people never learn it exists — then build
the same thing with the CLI or Terraform and hit *"Invalid IAM Instance Profile name"*
even though the role exists.

:::

#### Policy — a JSON document saying allowed/not allowed

Three ways to attach one, differing in where the policy **lives**:

| Type | Has its own ARN | Reusable | Versioned |
|---|---|---|---|
| **AWS managed** (`arn:aws:iam::aws:policy/ReadOnlyAccess`) | ✅ | every account | AWS maintains it |
| **Customer managed** (`arn:aws:iam::<account>:policy/…`) | ✅ | within the account | ✅ up to 5 |
| **Inline** (embedded in one identity) | ❌ | ❌ dies with the identity | ❌ |

⚠️ **AWS managed policies are usually broader than you need** — convenient to start with,
contrary to least privilege. `ReadOnlyAccess` grants `s3:GetObject` on **`*`**, so it
**overrides** every narrow policy you carefully wrote. This is the most common way least
privilege fails: not because your policy is wrong, but because a broad managed policy is
still hanging off a group you forgot about.

### 4. Anatomy of a policy document

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadPublicPrefix",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/public/*"
      ],
      "Condition": {
        "Bool": {"aws:SecureTransport": "true"}
      }
    }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `Version` | ✅ | The **policy language** version, not the date you wrote it. Always `"2012-10-17"`; the older `"2008-10-17"` does not support policy variables |
| `Statement` | ✅ | Array of "sentences". A policy usually has several |
| `Sid` | ❌ | Label for the statement. Appears in the simulator's `MatchedStatements` ⇒ worth having |
| `Effect` | ✅ | `Allow` or `Deny` |
| `Action` | ✅* | The operation: `<service>:<Operation>`, supports `*` (`s3:Get*`) |
| `Resource` | ✅* | ARN of the resource being acted on |
| `Principal` | resource-based only | **Who** — exists only in resource-based policies and trust policies |
| `Condition` | ❌ | Conditions that must hold for the statement to apply |

\* `Action` can be replaced by `NotAction`, and `Resource` by `NotResource`, meaning
*"everything EXCEPT…"*. Used mainly in `Deny` statements and SCPs; `NotAction` with
`Allow` is a dangerous pattern, because it grants everything except a list — including AWS
services that launch in the future.

Read a statement as one sentence, always in that order:

> **Effect** `Allow` — **Action** `s3:GetObject` — **Resource** `my-bucket/public/*` —
> **Condition** only over TLS

:::warning S3 `Resource` has two forms and they are not interchangeable

```text i18n-prose
arn:aws:s3:::my-bucket        <- actions on the BUCKET  (s3:ListBucket, s3:GetBucketPolicy)
arn:aws:s3:::my-bucket/*      <- actions on OBJECTS     (s3:GetObject, s3:PutObject)
```

Writing `s3:ListBucket` against an object ARN is the classic silent mistake: the policy is
valid, it saves fine, and `aws s3 ls` still returns `AccessDenied`.

:::

### 5. Anatomy of an ARN

An ARN (Amazon Resource Name) is a resource's address, always **6 parts** separated by `:`

```text i18n-prose
arn : aws : s3 :              :              : my-bucket/public/*
 1     2     3        4              5                  6
 |     |     |        |              |                  +- the resource
 |     |     |        |              +- account id      <- S3 leaves EMPTY
 |     |     |        +- region                         <- S3 leaves EMPTY
 |     |     +- service
 |     +- partition: aws | aws-cn | aws-us-gov
 +- always "arn"
```

`:::` is **not a typo** — those are two empty slots in a row. S3 leaves region and account
empty because **bucket names are globally unique**. Most other services do not:

```text i18n-prose
arn:aws:s3:::my-bucket                                  <- S3: 2 empty slots
arn:aws:iam::123456789012:user/alice                    <- IAM: no region (IAM is global)
arn:aws:ec2:ap-southeast-1:123456789012:instance/i-abc  <- EC2: all 6 slots
arn:aws:sts::123456789012:assumed-role/deploy/sess-1    <- a role session
```

Wildcards in the resource part:

| Written as | Matches |
|---|---|
| `my-bucket/public/*` | every object under `public/`, subfolders included |
| `my-bucket/public/a.txt` | exactly one object |
| `role/dev-*` | every role whose name starts with `dev-` |
| `*` | every resource — used when a service has no per-resource ARN (`sts:GetCallerIdentity`) |

### 6. Credentials: which kinds, and how long they live

| Kind | Prefix | Lifetime | Needs `SessionToken` |
|---|---|---|---|
| IAM user access key | `AKIA…` | **unlimited** until deleted | ❌ |
| Credentials from `AssumeRole` | `ASIA…` | 15 minutes – 12 hours | ✅ |
| Credentials from `GetSessionToken` | `ASIA…` | 15 minutes – 36 hours | ✅ |
| Identity Center credentials | `ASIA…` | per session configuration | ✅ |

Recognising the prefix makes reading logs faster: `AKIA` = long-lived key (risk),
`ASIA` = temporary key (good). And the ID prefixes: `AIDA` user · `AGPA` group ·
`AROA` role · `ANPA` policy · `AIPA` instance profile.

Temporary credentials have **three** parts, not two:

```bash
export AWS_ACCESS_KEY_ID=ASIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...        # omit this line -> InvalidClientTokenId
```

Forgetting `AWS_SESSION_TOKEN` is the single most common mistake when using a role by
hand, and the error message gives no hint that you left out a third variable.

### 7. Request context — what AWS knows about each call

Every request carries a set of **condition keys** that policies can read. This is the
source of every `Condition`:

| Key | Carries |
|---|---|
| `aws:PrincipalArn` · `aws:PrincipalAccount` · `aws:PrincipalOrgID` | who is calling |
| `aws:PrincipalTag/<Key>` | the principal's tags |
| `aws:RequestedRegion` | which region the call went to |
| `aws:SecureTransport` | whether TLS was used |
| `aws:SourceIp` · `aws:VpcSourceIp` | where the call came from |
| `aws:MultiFactorAuthPresent` · `aws:MultiFactorAuthAge` | whether MFA was used, and how long ago |
| `aws:ResourceTag/<Key>` | tags on the target resource |
| `aws:RequestTag/<Key>` · `aws:TagKeys` | tags sent along in a create request |
| `aws:CurrentTime` · `aws:TokenIssueTime` | timing |
| `<service>:…` e.g. `s3:prefix`, `iam:PassedToService` | per-service keys |

:::danger A key that is absent makes the condition not match

Some keys appear **only in some requests**. `aws:MultiFactorAuthPresent` is absent from a
service's indirect calls; `aws:TagKeys` is absent if the request sends no tags. An absent
key means the condition **does not hold** ⇒ the `Allow` does not apply — or worse, with
`ForAllValues`, the condition holds **by accident** (the empty set).

Pin it down with `Null`:

```json
"Condition": {
  "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]},
  "Null": {"aws:TagKeys": "false"}
}
```

`"Null": {"<key>": "false"}` reads as *"this key **must** be present in the request"*.

:::

### 8. The six policy types — which grant, which only filter

This is the most important table in the document:

| Policy type | Attached to | **Grants** permissions | Scope |
|---|---|---|---|
| **Identity-based** | user, group, role | ✅ **yes** | that principal |
| **Resource-based** (bucket policy, trust policy, KMS key policy…) | a resource | ✅ **yes** | that resource |
| **Permission boundary** | user, role | ❌ filters only | that principal |
| **SCP** (Organizations) | OU / account | ❌ filters only | every principal in the account |
| **Session policy** | passed at `AssumeRole` time | ❌ filters only | one session |
| **ACL** (S3, legacy) | a resource | ✅ yes | — avoid; use policies |

**Only the first two grant anything.** The three in the middle are an **intersection** —
they narrow, never widen. The concrete consequence: a boundary allowing `s3:*` while the
identity policy says nothing about S3 still leaves you with **no** S3 permissions. The
intersection of two disjoint sets is empty.

Remember it as one sentence: **identity and resource policies open doors; boundaries, SCPs
and session policies only lower the door frame.**

How the four gates combine, and in what order they are evaluated, is the subject of
[Policy evaluation](iam-policy-evaluation.md).

### 9. Diagnosing `AccessDenied` — the order to check

`AccessDenied` has **five** suspects, and four of them are **not in the user's policy**.
Starting from the user's policy is the slowest route:

```text i18n-prose
1. Organizations SCP           <- the simulator CANNOT see this one
2. Permission boundary         <- check with get-user / get-role
3. Identity policy             <- 3 places: direct, via group, inline
4. Resource policy             <- bucket policy, trust policy, KMS key policy
5. Session policy              <- if you are using temporary credentials
```

Two tools answer faster than reading JSON:

```bash
# what the current policies allow — three outcomes: allowed / implicitDeny / explicitDeny
aws iam simulate-principal-policy \
  --policy-source-arn <principal-arn> \
  --action-names s3:GetObject --resource-arns <resource-arn>

# some services return an encoded message; decoding it names the deciding statement
aws sts decode-authorization-message --encoded-message <string>
```

| Simulator result | Meaning | Fix by |
|---|---|---|
| `allowed` | an `Allow` matched, no `Deny` matched | — |
| `implicitDeny` | **no** `Allow` matched (missing permission) | adding an `Allow` |
| `explicitDeny` | a `Deny` matched (forbidden) | **removing the `Deny`** — adding an `Allow` is useless |

Telling `implicitDeny` from `explicitDeny` is telling *"missing permission"* from
*"forbidden"* — two incidents that look **identical** in the error message but are fixed in
opposite ways.

## Example

Everything in this document has hands-on exercises in the
[**basic tier**](../tutorials/bt-01-co-ban.md) — 26 exercises on a local emulator, free,
with solutions that include real output. The map between the sections above and the
exercises:

| Section above | Exercises |
|---|---|
| §3 User, access keys | A1 · A2 · A3 |
| §3 Group — permissions do not live on the user | **A4** |
| §3 Policy — the three types | B1 · B2 · B5 |
| §4 Policy anatomy, the two forms of an S3 `Resource` | B1 · **B3** · D3 · D4 |
| §4 `Condition` | B6 |
| §3 Role, instance profile, trust policy | C1 · C2 · C5 |
| §6 Temporary credentials, `SessionToken` | C3 · C4 |
| §8 A boundary is an intersection | **D5** |
| §9 The simulator's three outcomes | **D1** · D2 |

The four bold exercises teach something reading cannot replace.

## Exam traps

| Trap | Why it is wrong |
|---|---|
| Storing an access key in a config file on EC2 | Use an **IAM role** + instance profile |
| Using the root user for day-to-day work | Root cannot be reined in with a policy — only MFA + no keys |
| Nesting a group inside a group | IAM groups **do not nest** |
| Putting a group in a policy's `Principal` | A group is **not** a principal |
| Thinking a permission boundary or SCP **grants** permissions | Both only **filter** — §8 |
| Adding an `Allow` to open something under an explicit `Deny` | `Deny` wins, permanently |
| `s3:ListBucket` against an object ARN (`bucket/*`) | `ListBucket` acts on the **bucket** |
| Using temporary credentials but forgetting `AWS_SESSION_TOKEN` | Temporary credentials have **three** parts |
| Writing today's date in `Version` | That is the **language** version, always `2012-10-17` |
| Choosing **Cognito** for employee sign-in across accounts | That is **IAM Identity Center** |
| `NotAction` with `Allow` to "allow everything except a few things" | Grants AWS services that launch later too |

## Trade-offs

| Decision | You gain | You lose |
|---|---|---|
| Roles instead of access keys | No long-lived credential to leak | Must understand trust policies; harder to debug |
| Identity Center instead of IAM users | One place to manage; disabling a person covers every account | One more layer to build and operate |
| AWS managed instead of customer managed policies | Fast, AWS keeps them current with new services | **Broader than needed** — and they override your narrow policies |
| Inline instead of managed policies | A clear one-to-one relationship that dies with the identity | No reuse, no versions, no rollback |
| Policies attached to groups | Change one place, applies to the whole group | Auditing one user means checking three places |
| Many small statements instead of one large one | Readable, and `Sid` points at the match | You hit the 6144-byte policy limit sooner |

## Related Topics

- [Access management](../../foundations/reference/access-management.md) — the CLF-C02 layer: root user, Identity Center, Secrets Manager
- [Policy evaluation](iam-policy-evaluation.md) — next step: the four gates, evaluation order, `PassRole`, confused deputy
- [IAM exercises](../tutorials/index.md) — 60 exercises with solutions, three tiers
- [Architecting (SAA-C03)](../index.md) — the layer this document belongs to
