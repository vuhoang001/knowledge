---
title: Exercises — Intermediate (real AWS)
sidebar_position: 20
description: "20 exercises with solutions on real AWS — the part the emulator cannot do: policy enforcement, cross-account, SCPs, credential reports, Access Advisor, PassRole. IAM is free, so this tier costs $0."
tags: [tutorial, aws, iam, saa-c03, policy-simulator, permission-boundary, pass-role, cross-account, scp, domain-1]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-08
---

# Exercises — Intermediate (real AWS)

> **Takeaway:** The [basic tier](bt-01-co-ban.md) already taught most of the logic — the
> emulator simulates policies correctly. What it **cannot** do comes down to four groups,
> and those four groups are the entire content of this page: **enforcement** (a real
> `AccessDenied`), **multiple accounts** (cross-account, SCPs), **account audits**
> (credential reports, Access Advisor), and **condition keys that need real context**
> (MFA, TLS, region, IP).

Previous tier: [Basic](bt-01-co-ban.md) · Next tier: [Production](bt-03-production.md) ·
Theory: [IAM fundamentals](../reference/iam-fundamentals.md) ·
[Policy evaluation](../reference/iam-policy-evaluation.md)

:::info The solutions on this page are **expected results**, not captured output

Unlike the basic tier — where every output is real, captured against the emulator — this
tier needs a real AWS account, so the solutions give the **expected result with the
reasoning**, and every exercise has a **paste box** for your own output. Paste your real
output in before calling an exercise done; an empty box means you have not learned it.

:::

## Before you start — three things not to skip

IAM is free, but a real account has no refund button.

1. A **$5 billing alert** — a CloudWatch alarm on the `EstimatedCharges` metric,
   **required** in region `us-east-1` (billing metrics are only published there).
2. **MFA on root** plus a separate IAM user for day-to-day work. Do not use root.
3. Know the **delete command** for everything you are about to create, before creating it.

:::danger Use an explicit profile, or you are testing against the emulator

If your machine's default profile points at the emulator (a reasonable safety choice), then
every command here must name a profile:

```bash
aws --profile <profile-aws-that> iam list-users
```

A bare `aws` here calls the emulator and **always comes back green** — meaning you believe
you are verifying enforcement while you are verifying precisely the thing that has no
enforcement. Same class of mistake as exercise
[E1](bt-01-co-ban.md#e1-the-big-trap-the-simulator-says-deny-the-api-lets-it-through),
except caused by machine configuration rather than by the emulator.

:::

Below, `aws` is written plainly for brevity; add your own `--profile`.

## What this whole page costs

| Item | Cost |
|---|---|
| IAM API, users, groups, roles, policies, boundaries | **$0** |
| `simulate-principal-policy`, `simulate-custom-policy`, Policy Simulator (console) | **$0** |
| `generate-credential-report`, Access Advisor, `get-account-authorization-details` | **$0** |
| AWS Organizations + SCPs | **$0** (needs ≥2 accounts; creating another account is also $0) |
| CloudTrail — the **first** management-event trail per account | **$0** · a second trail and **data events** cost money |
| An empty S3 bucket used as a policy target | ~$0 at lab scale |

Only two lines need watching: CloudTrail **data events**, and any EC2/Lambda an exercise
asks you to create (exercise I17) — delete those immediately afterwards.

---

## Part A — Enforcement: a real `AccessDenied` (5 exercises)

### I1. Redo the trap exercise, this time on real AWS

**Problem:** Create a user whose only policy is an inline `Deny s3:*`, get an access key,
call `s3 ls`. Compare with
[E1 in the basic tier](bt-01-co-ban.md#e1-the-big-trap-the-simulator-says-deny-the-api-lets-it-through).

<details>
<summary>Solution</summary>

```bash
aws iam create-user --user-name lab-deny
cat > /tmp/deny.json <<'EOF'
{"Version":"2012-10-17","Statement":[
  {"Effect":"Deny","Action":"s3:*","Resource":"*"}]}
EOF
aws iam put-user-policy --user-name lab-deny \
  --policy-name deny-s3 --policy-document file:///tmp/deny.json
aws iam create-access-key --user-name lab-deny
# roi dung khoa do:
aws s3 ls
```

Expected:

```text
An error occurred (AccessDenied) when calling the ListBuckets operation:
Access Denied
```

Your paste box:

```text i18n-prose
(not run yet — paste here)
```

| Route | Emulator | Real AWS |
|---|---|---|
| `simulate-principal-policy` | `explicitDeny` ✅ | `explicitDeny` ✅ |
| A real API call | succeeds ❌ | `AccessDenied` ✅ |

Exactly one line differs across the whole table — and that is why this page exists.
Everything else you already learned for free in the previous tier.

</details>

### I2. An explicit deny beats even `AdministratorAccess`

**Problem:** A user holds `AdministratorAccess` **and** an inline `Deny s3:DeleteObject`.
Try to delete an object.

<details>
<summary>Solution</summary>

```bash
aws iam attach-user-policy --user-name lab-admin-test \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
cat > /tmp/deny-del.json <<'EOF'
{"Version":"2012-10-17","Statement":[
  {"Effect":"Deny","Action":"s3:DeleteObject","Resource":"*"}]}
EOF
aws iam put-user-policy --user-name lab-admin-test \
  --policy-name no-delete --policy-document file:///tmp/deny-del.json
# bang khoa cua lab-admin-test:
aws s3 rm s3://<bucket>/a.txt
```

Expected: `AccessDenied`, even though the user is a full admin.

```text i18n-prose
(not run yet — paste here)
```

This pattern **is used for real** to build "admin but may not delete data": grant
`AdministratorAccess`, then `Deny` a set of destructive actions (`s3:DeleteBucket`,
`rds:DeleteDBInstance`, `cloudtrail:StopLogging`). Far simpler than enumerating every
`Allow` needed, and tight exactly where it matters.

</details>

### I3. `implicitDeny` vs `explicitDeny` in the error message

**Problem:** Two users — one missing the permission, one under an explicit `Deny` — both
call `s3 ls`. Can you tell them apart from the error message?

<details>
<summary>Solution</summary>

Expected: **no**. Both return `AccessDenied`, word for word. The API does not tell you
whether it was *a missing allow* or *a deny*.

```text i18n-prose
(not run yet — paste both outputs here to see for yourself that they are identical)
```

⇒ This is why `simulate-principal-policy` is not a convenience but the **primary
diagnostic tool**: it is the only source that distinguishes the two cases, and the two
cases are fixed in opposite ways (add an `Allow` ⇄ remove a `Deny`).

Real AWS has one more route: some services return an **encoded authorization failure
message**, decoded with

```bash
aws sts decode-authorization-message --encoded-message <chuoi>
```

This names **which statement** denied the call. Not every service returns that string, but
when one does it saves hours.

</details>

### I4. A permission boundary that really blocks

**Problem:** A user with `AdministratorAccess` and a boundary of only
`AmazonS3FullAccess`. Try `ec2 describe-instances` and `s3 ls`.

<details>
<summary>Solution</summary>

```bash
aws iam put-user-permissions-boundary --user-name lab-bound \
  --permissions-boundary arn:aws:iam::aws:policy/AmazonS3FullAccess
```

| Command | Expected | Why |
|---|---|---|
| `aws s3 ls` | ✅ succeeds | admin ∩ boundary(S3) = S3 |
| `aws ec2 describe-instances` | ❌ `AccessDenied` | the boundary does not allow EC2 |

```text i18n-prose
(not run yet — paste both here)
```

And check the place where the emulator is wrong (exercise
[D5](bt-01-co-ban.md#d5-permission-boundary--an-intersection-you-can-prove)):

```bash
aws iam get-user --user-name lab-bound --query 'User.PermissionsBoundary'
```

Expected on real AWS:

```text
{
    "PermissionsBoundaryType": "Policy",
    "PermissionsBoundaryArn": "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}
```

The emulator returns `null` here. Paste the real output in so you have the comparison.

</details>

### I5. The intersection of two disjoint sets

**Problem:** A boundary of `AmazonS3FullAccess`, and an identity policy of **only**
`AmazonDynamoDBFullAccess`. Predict both commands before running them.

<details>
<summary>Solution</summary>

| Command | What most people predict | Actual |
|---|---|---|
| `aws s3 ls` | ✅ (the boundary allows S3) | ❌ `AccessDenied` |
| `aws dynamodb list-tables` | ✅ (the policy allows DynamoDB) | ❌ `AccessDenied` |

**Both are blocked.** The boundary allows S3 but the identity policy never granted S3 —
and a boundary **grants** nothing. The identity policy allows DynamoDB but the boundary
does not let it through. The intersection of two disjoint sets is empty.

```text i18n-prose
(not run yet — paste both here)
```

You already proved this **for free** in
[D5 of the basic tier](bt-01-co-ban.md#d5-permission-boundary--an-intersection-you-can-prove)
with the simulator. Repeating it here only shows that enforcement agrees with the
simulation — and gives you numbers from your own account.

</details>

---

## Part B — Advanced simulation (4 exercises)

### I6. `simulate-custom-policy` — the one the emulator lacks

**Problem:** Simulate a policy that is **not attached to anyone**. Why is this command more
valuable than `simulate-principal-policy` in CI?

<details>
<summary>Solution</summary>

```bash
aws iam simulate-custom-policy \
  --policy-input-list "$(cat /tmp/p-read-public.json)" \
  --action-names s3:GetObject s3:PutObject \
  --resource-arns arn:aws:s3:::lab-bucket/private/a.txt \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output table
```

Expected: `s3:GetObject → implicitDeny` (the policy only allows `public/*`),
`s3:PutObject → implicitDeny`.

```text i18n-prose
(not run yet — paste here)
```

The decisive difference:

| Command | Needs the policy attached | Where it is used |
|---|---|---|
| `simulate-principal-policy` | ✅ yes | incident diagnosis: *"why is this user blocked"* |
| `simulate-custom-policy` | ❌ no | **CI/CD**: checking a policy in a pull request **before** it is applied |

`simulate-custom-policy` is the command that turns "review the policy by eye" into an
**automated test**. The pattern: for every policy in the repository keep a list of actions
that *must be allowed* and *must be denied*, run this command in CI, compare against the
expectation. A policy that is broader than intended turns CI red — something reading the
JSON by eye does not catch.

</details>

### I7. Condition keys that need context: `--context-entries`

**Problem:** A policy allowing `s3:DeleteObject` only with MFA. Simulate twice: with MFA
and without.

<details>
<summary>Solution</summary>

```bash
cat > /tmp/p-mfa.json <<'EOF'
{"Version":"2012-10-17","Statement":[{
  "Effect":"Allow","Action":"s3:DeleteObject","Resource":"*",
  "Condition":{"Bool":{"aws:MultiFactorAuthPresent":"true"}}}]}
EOF

for v in true false; do
  echo "--- MFA=$v"
  aws iam simulate-custom-policy \
    --policy-input-list "$(cat /tmp/p-mfa.json)" \
    --action-names s3:DeleteObject \
    --resource-arns 'arn:aws:s3:::lab-bucket/a.txt' \
    --context-entries "ContextKeyName=aws:MultiFactorAuthPresent,ContextKeyType=boolean,ContextKeyValues=$v" \
    --query 'EvaluationResults[].EvalDecision' --output text
done
```

Expected: `MFA=true → allowed` · `MFA=false → implicitDeny`.

```text i18n-prose
(not run yet — paste both here)
```

`--context-entries` is the **only** way to test a condition key without building the real
context (no need to enable MFA, to call from that IP, or to set up that VPC endpoint). The
three keys most worth simulating: `aws:MultiFactorAuthPresent`, `aws:SourceIp`,
`aws:SecureTransport`.

On the emulator this command returns `UnsupportedOperation` — see the
[measurement table](bt-01-co-ban.md#e3-measure-for-yourself-which-commands-the-emulator-supports).

</details>

### I8. `MissingContextValues` — the silent trap

**Problem:** Run I7 again but **without** `--context-entries`. Read the
`MissingContextValues` field.

<details>
<summary>Solution</summary>

Expected:

```text
{
    "EvalDecision": "implicitDeny",
    "MissingContextValues": ["aws:MultiFactorAuthPresent"]
}
```

```text i18n-prose
(not run yet — paste here)
```

A non-empty `MissingContextValues` means **the simulation result is not trustworthy** — the
simulator is missing information needed to evaluate the condition, and defaults to treating
it as not matching. Many people read `implicitDeny` and go off to fix the policy, when the
policy is not wrong — only the context is missing.

A habit worth forming: always `--query` for `MissingContextValues` too, not just
`EvalDecision`.

</details>

### I9. Policy Simulator in the console

**Problem:** Redo I6 through the https://policysim.aws.amazon.com/ interface. What does the
GUI add over the CLI?

<details>
<summary>Solution</summary>

The console gives three things the CLI does not:

1. **It points at the matching statement**, highlighted in the JSON — faster than reading
   `MatchedStatements`.
2. **Edit the policy inside the simulator** and rerun, without applying it to the account.
   A faster trial-and-error loop than the CLI.
3. It suggests **condition keys you are missing** for the selected action.

But the CLI wins on one decisive point: **it runs in CI** (exercise I6). Use the console to
*write* policies, the CLI to *guard* them.

:::warning The simulator cannot see SCPs

`simulate-*` and the Policy Simulator evaluate identity policies, resource policies and
boundaries. They do **not** apply Organizations SCPs. ⇒ `allowed` in the simulator can
still be a real `AccessDenied` when the account sits under a restrictive SCP. Exercise I13
proves this by hand.

:::

</details>

---

## Part C — Multiple accounts (4 exercises)

### I10. Cross-account: two places to change

**Problem:** Account **B** owns a bucket. Let a role in account **A** read it. List exactly
what must change.

<details>
<summary>Solution</summary>

**Two** places; miss one and it does not work — this is rule 4 applied cross-account.

In **B** (the resource owner), the bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ChoAccountADoc",
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::<account-A>:role/lab-reader"},
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::bucket-cua-B",
      "arn:aws:s3:::bucket-cua-B/*"
    ]
  }]
}
```

In **A** (the caller), the identity policy of role `lab-reader`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::bucket-cua-B",
      "arn:aws:s3:::bucket-cua-B/*"
    ]
  }]
}
```

```text i18n-prose
(not run yet — paste the output of `aws s3 ls s3://bucket-cua-B` from A's role here)
```

A diagnostic exercise to go with it: **remove** the identity policy in A and retry →
`AccessDenied`. Restore it, then **remove** the bucket policy in B and retry → also
`AccessDenied`. Two identical errors, two causes in two different accounts. That is why
cross-account incidents take so long: the person in A cannot read B's policies.

⚠️ With S3 there is a third place people forget: **Block Public Access** and
**bucket owner enforced** can block before policies are even evaluated.

</details>

### I11. Role chaining between two accounts

**Problem:** A user in A assumes a role in B, then uses those credentials to call B's APIs.

<details>
<summary>Solution</summary>

The trust policy of the role in **B**:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::<account-A>:root"},
    "Action": "sts:AssumeRole",
    "Condition": {"StringEquals": {"sts:ExternalId": "<chuoi-bi-mat>"}}
  }]
}
```

The identity policy in **A**:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "sts:AssumeRole",
    "Resource": "arn:aws:iam::<account-B>:role/lab-cross"
  }]
}
```

```bash
aws sts assume-role \
  --role-arn arn:aws:iam::<account-B>:role/lab-cross \
  --role-session-name from-a --external-id <chuoi-bi-mat>
```

```text i18n-prose
(not run yet — paste the Credentials here)
```

**What `sts:ExternalId` is and when it is mandatory:** when you are a **third party** (a
SaaS, a consultancy) given a role by many customers. Without `ExternalId`, customer X can
make you use customer Y's role. This is confused deputy in cross-account form — AWS
requires every SaaS to use it.

⚠️ **Role chaining** (using temporary credentials to assume another role) is capped at
**1 hour**, and a larger `--duration-seconds` is silently ignored rather than rejected.

</details>

### I12. Opening up to a whole organisation in one line

**Problem:** A bucket must be readable by **every** account in the Organization, without
listing account IDs. Write the condition.

<details>
<summary>Solution</summary>

```json
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::bucket-chung/*",
  "Condition": {
    "StringEquals": {"aws:PrincipalOrgID": "o-xxxxxxxxxx"}
  }
}
```

```text i18n-prose
(not run yet — paste a test from an account inside the org and one outside it)
```

`aws:PrincipalOrgID` replaces the whole account-ID list, and **updates itself** when the
organisation adds an account. Without it, every new account means editing every bucket
policy — exactly the kind of task that gets forgotten.

🔴 **`Principal: "*"` plus the org condition is the correct pattern, but writing it without
the condition opens the bucket to the entire internet.** This is the single most common
cause of "public S3 bucket" incidents. Always write the `Condition` **at the same time** as
`Principal: "*"`, never "later".

</details>

### I13. SCP — a ceiling even an admin cannot exceed

**Problem:** In Organizations, attach an SCP to a member account blocking every region
except `ap-southeast-1` and `us-east-1`. Then use that account's **admin** to create an EC2
instance in `eu-west-1`.

<details>
<summary>Solution</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ChanRegionNgoaiDanhSach",
    "Effect": "Deny",
    "NotAction": [
      "iam:*", "sts:*", "organizations:*", "cloudfront:*",
      "route53:*", "support:*", "budgets:*"
    ],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "aws:RequestedRegion": ["ap-southeast-1", "us-east-1"]
      }
    }
  }]
}
```

Expected: the member account's admin **cannot** create an EC2 instance in `eu-west-1`, and
gets `AccessDenied` or `UnauthorizedOperation`.

```text i18n-prose
(not run yet — paste here)
```

Three decisive details:

- **`NotAction` must list the global services.** IAM, STS, Organizations, CloudFront and
  Route 53 are global but their endpoints live in `us-east-1`; blocking all regions without
  excluding them **locks you out of that account's IAM**. This exclusion list is not
  optional.
- An SCP **does not apply to the management account** — test in a member account, otherwise
  you will conclude SCPs do not work.
- The simulator **cannot see SCPs** (exercise I9). `allowed` in the simulator with a real
  failure ⇒ suspect an SCP first.

</details>

---

## Part D — Account audits (3 exercises)

### I14. Credential report

**Problem:** Pull the account-wide credential report, find every key not rotated in more
than 90 days and every user without MFA.

<details>
<summary>Solution</summary>

```bash
aws iam generate-credential-report
aws iam get-credential-report --query Content --output text | base64 -d > /tmp/cred.csv
column -s, -t /tmp/cred.csv | less -S
```

The five columns worth reading: `user`, `mfa_active`, `password_last_used`,
`access_key_1_last_rotated`, `access_key_1_last_used_date`.

```bash
# user chua bat MFA (bo dong root va header)
awk -F, 'NR>1 && $4=="false" {print $1}' /tmp/cred.csv
```

```text i18n-prose
(not run yet — paste here)
```

Two conclusions usually appear on the very first run: there are keys **never used at all**
(delete them immediately), and keys **used recently but rotated long ago** (the highest
risk, deal with them first).

This command does **not** exist on the emulator.

</details>

### I15. Access Advisor — which permissions were never used

**Problem:** For one role, list the services it has **never called**.

<details>
<summary>Solution</summary>

```bash
JOB=$(aws iam generate-service-last-accessed-details \
        --arn arn:aws:iam::<account>:role/<role> \
        --query JobId --output text)
aws iam get-service-last-accessed-details --job-id "$JOB" \
  --query 'ServicesLastAccessed[?TotalAuthenticatedEntities==`0`].ServiceNamespace' \
  --output text
```

```text i18n-prose
(not run yet — paste here)
```

The returned list is a set of **candidates to cut** — not yet a decision to cut.

:::warning Access Advisor only sees the past

It reports permissions that **have been used**, not permissions that are **needed**. An
action that runs quarterly, or only during an incident, will not appear and gets cut by
mistake — then breaks at the worst possible time. The observation window should be
**90 days** or more, and before cutting you must ask the service owner whether there is a
rarely-scheduled code path.

:::

Change `==` to `>` in the `--query` to see the other direction: which services **are** in
use, and when they were last called. That is the input to exercise
[P5 in the production tier](bt-03-production.md).

</details>

### I16. The account's entire IAM in one command

**Problem:** Export every user, group, role and policy with their contents — so you can
diff two points in time.

<details>
<summary>Solution</summary>

```bash
aws iam get-account-authorization-details > /tmp/iam-$(date +%F).json
jq '.Policies | length, (.[0] | keys)' /tmp/iam-*.json
```

```text i18n-prose
(not run yet — paste here)
```

This is a **snapshot of the account's entire IAM** in one file. Two uses:

- **Diff over time:** save it weekly, `diff` two files → see every permission change,
  including the ones nobody announced.
- **Offline audit:** grep for every policy containing `"Action": "*"` or
  `"Resource": "*"`, or every policy containing `iam:PassRole`.

```bash
jq -r '.Policies[] | select(.PolicyVersionList[]?.Document.Statement[]?
       | select(.Action=="*" or .Resource=="*")) | .PolicyName' /tmp/iam-*.json
```

This command does **not** exist on the emulator.

</details>

---

## Part E — Policy traps (4 exercises)

### I17. `iam:PassRole`

**Problem:** A user holds `lambda:CreateFunction` but **not** `iam:PassRole`. Try creating
a Lambda with a role.

<details>
<summary>Solution</summary>

Expected:

```text
An error occurred (AccessDeniedException) when calling the CreateFunction operation:
User: arn:aws:iam::...:user/lab-nopass is not authorized to perform: iam:PassRole
on resource: arn:aws:iam::...:role/lambda-exec
```

```text i18n-prose
(not run yet — paste here)
```

Two permissions for **one** action: `lambda:CreateFunction` **and** `iam:PassRole` for that
exact role.

🔴 **And here is the more important part:** add `iam:PassRole` with `Resource: "*"` and try
again — now the user can create a Lambda carrying **any** role, including an admin role,
and run code inside it. In other words, **broad `iam:PassRole` is equivalent to admin**.

The correct way to grant it — pinned to specific roles, and to the receiving service:

```json
{
  "Effect": "Allow",
  "Action": "iam:PassRole",
  "Resource": "arn:aws:iam::<account>:role/lambda-exec-*",
  "Condition": {
    "StringEquals": {"iam:PassedToService": "lambda.amazonaws.com"}
  }
}
```

`iam:PassedToService` prevents the same role from being handed to a different service.

</details>

### I18. The `ForAllValues` empty-set trap

**Problem:** A policy that *looks like* it requires tags on `RunInstances`. Call it
**without any tags**. Predict.

<details>
<summary>Solution</summary>

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

Expected: the request **goes through** — because "every tag is in the list" is **true** for
the empty set.

Fixed with one line:

```json
"Condition": {
  "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]},
  "Null": {"aws:TagKeys": "false"}
}
```

| Run | Policy | Request with no tags | Expected |
|---|---|---|---|
| 1 | `ForAllValues` only | `RunInstances` | PASS — not what you wanted |
| 2 | plus `Null: false` | `RunInstances` | FAIL — what you wanted |

```text i18n-prose
(not run yet — paste both runs here)
```

Use `simulate-custom-policy` (exercise I6) to run this and you **never create an instance**
— no cost, and faster.

`Null: {"aws:TagKeys": "false"}` reads as *"this key must exist in the request"*. Leaving
it out is a real bug, common in code review, and **nothing reports it as an error**.

</details>

### I19. `ForAnyValue` vs `ForAllValues`

**Problem:** With the same list `["Project","Owner"]`, a request sends the tags `Project`
and `Secret`. What do the two operators return?

<details>
<summary>Solution</summary>

| Operator | True when | With `{Project, Secret}` |
|---|---|---|
| `ForAnyValue:` | **at least one** value matches | ✅ matches (`Project` is in the list) |
| `ForAllValues:` | **every** value matches | ❌ does not match (`Secret` is not) |

```text i18n-prose
(not run yet — paste both simulate results here)
```

⇒ To express *"only these tags may be used"* you want **`ForAllValues`** (plus `Null`).
Using `ForAnyValue` there permits arbitrary extra tags as long as one valid tag is present
— which is almost no restriction at all.

Remember it as: `ForAnyValue` **loosens**, `ForAllValues` **tightens**.

</details>

### I20. Confused deputy on a service role

**Problem:** A trust policy open to `glue.amazonaws.com` with no conditions. Describe the
attack, then fix it.

<details>
<summary>Solution</summary>

**The attack:** `glue.amazonaws.com` serves **every** AWS account. An unconditional trust
policy says *"whenever Glue calls, let it into my role"* — so an attacker creates a Glue
job **in their own account**, points it at your role, and Glue (the trusted intermediary —
the *deputy*) uses your role on their behalf.

Fix:

```json
{
  "Effect": "Allow",
  "Principal": {"Service": "glue.amazonaws.com"},
  "Action": "sts:AssumeRole",
  "Condition": {
    "StringEquals": {"aws:SourceAccount": "<account-id-cua-ban>"},
    "ArnLike": {"aws:SourceArn": "arn:aws:glue:<region>:<account-id>:job/*"}
  }
}
```

```text i18n-prose
(not run yet — paste a real service-role trust policy from your account, and say whether
 it has both keys)
```

These two keys pin it down to *"only when the call originates from my own resources"*. This
is the **mandatory pattern** for every service role, not an option — and it is the same
idea as `sts:ExternalId` (exercise I11) in cross-account form, and as the OIDC `sub`
(exercise [P2](bt-03-production.md)) in federation form.

Three names, one vulnerability: **trusting an intermediary without pinning down where the
call came from.**

</details>

---

## Cleanup

IAM incurs no charges, but live users and keys are a **risk**, not a cost:

```bash
for U in lab-deny lab-admin-test lab-bound lab-nopass; do
  aws iam delete-user-permissions-boundary --user-name $U 2>/dev/null
  for p in $(aws iam list-user-policies --user-name $U --query 'PolicyNames[]' --output text 2>/dev/null); do
    aws iam delete-user-policy --user-name $U --policy-name "$p"
  done
  for a in $(aws iam list-attached-user-policies --user-name $U --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null); do
    aws iam detach-user-policy --user-name $U --policy-arn "$a"
  done
  for k in $(aws iam list-access-keys --user-name $U --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null); do
    aws iam delete-access-key --user-name $U --access-key-id "$k"
  done
  aws iam delete-user --user-name $U
done
```

If any exercise created EC2 instances, Lambdas or a NAT Gateway, follow the separate
checklist — **those cost real money**, unlike IAM. And remember to remove the SCP from
exercise I13 if you no longer need it: a wrong SCP left in place is how you lock yourself
out later.

## Related Topics

- [IAM fundamentals](../reference/iam-fundamentals.md) — the foundation layer
- [Policy evaluation](../reference/iam-policy-evaluation.md) — every exercise above proves one of its rules
- [Exercises — Basic](bt-01-co-ban.md) — previous tier; most of the logic is already learned there, for free
- [Exercises — Production](bt-03-production.md) — next tier: process, not mechanism
- [IAM exercises](index.md) — all three tiers
