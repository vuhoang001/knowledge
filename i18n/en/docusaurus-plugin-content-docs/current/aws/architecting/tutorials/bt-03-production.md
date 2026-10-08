---
title: Exercises — Production
sidebar_position: 30
description: "14 exercises with complete configs: removing static keys, OIDC for GitHub Actions, least privilege derived from CloudTrail, boundaries that stop escalation, SCPs, break-glass with MFA, tag-based access control."
tags: [tutorial, aws, iam, saa-c03, oidc, least-privilege, scp, organizations, break-glass, access-analyzer, identity-center, domain-1]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-10-08
---

# Exercises — Production

> **Takeaway:** The two earlier tiers teach *mechanism*; this one teaches *process*. And
> the production process reduces to one sentence: **there are no long-lived credentials
> anywhere** — people sign in through Identity Center, machines inside AWS use roles,
> machines outside AWS use OIDC. The fourteen exercises below are fourteen ways of carrying
> out that sentence.

Previous tier: [Intermediate](bt-02-trung-binh.md) ·
Theory: [IAM fundamentals](../reference/iam-fundamentals.md) ·
[Policy evaluation](../reference/iam-policy-evaluation.md)

This is also the tier that answers two phrases the SAA-C03 exam leans on — *MOST secure*
and *LEAST operational overhead* — because both usually point at the same answer: get rid
of static keys.

:::info The solutions here are **complete configs**, not yet run against your account

This tier has less output to capture — what needs delivering is the **policy, trust policy,
SCP and workflow** written correctly. The solutions give those files verbatim, along with
the places they go wrong. Paste boxes remain on the exercises that produce measurements.

:::

## Cost — two lines to watch

| Item | Cost |
|---|---|
| IAM, Identity Center, Organizations, SCPs, Policy Simulator, credential reports | **$0** |
| IAM Access Analyzer — **external access** | **$0** · enough for exercise P11 |
| IAM Access Analyzer — **unused access** | **costs money** per role per month — check current pricing before enabling, disable after the lab |
| CloudTrail — the **first** management-event trail per account | **$0** · a second trail and **data events** cost money |
| An EventBridge rule + SNS for the alarm (exercise P10) | close to $0 at lab scale |

The two bold lines are enabled with one click and bill for as long as they run. That is the
entire financial risk of this page.

---

## Part A — Removing long-lived credentials (4 exercises)

### P1. Inventory your static keys

**Problem:** Count every access key that exists in the account. For each one, answer *"can
this be replaced by a role?"*

<details>
<summary>Solution</summary>

```bash
for u in $(aws iam list-users --query 'Users[].UserName' --output text); do
  aws iam list-access-keys --user-name "$u" \
    --query "AccessKeyMetadata[].[UserName,AccessKeyId,Status,CreateDate]" --output text
done
```

Add *last used* to see which ones you can delete right away:

```bash
aws iam get-access-key-last-used --access-key-id <AKIA...> \
  --query 'AccessKeyLastUsed.[LastUsedDate,ServiceName]'
```

```text i18n-prose
(not run yet — paste your account's key table here)
```

Every row is a question to answer, not a line to skim:

| Whose key is this | Replace with |
|---|---|
| A human | **IAM Identity Center** + `aws sso login` — delete the key |
| An app on EC2 | an **instance profile** — delete the key |
| An app on ECS / EKS | a **task role** / **IRSA** — delete the key |
| Lambda | an **execution role** — delete the key |
| CI/CD outside AWS | **OIDC federation** (exercise P2) — delete the key |
| A script on someone's laptop | Identity Center — delete the key |

No cell in the right-hand column says *"leave as is"*. That is the conclusion of the
exercise.

The only case with a remaining reason to keep a static key: a system outside AWS that
**cannot** speak OIDC/SAML. Then the key needs an automatic rotation schedule and must sit
on a user with extremely narrow permissions.

</details>

### P2. OIDC for GitHub Actions — the highest-value exercise here

**Problem:** Let a GitHub Actions workflow obtain AWS credentials with **no** stored
secret.

<details>
<summary>Solution — all three parts</summary>

**1. Register the OIDC provider** (once per account):

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

**2. The role's trust policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:<org>/<repo>:ref:refs/heads/main"
      }
    }
  }]
}
```

**3. The workflow:**

```yaml
permissions:
  id-token: write        # thieu dong nay la khong co OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<account-id>:role/gha-deploy
          aws-region: ap-southeast-1
      - run: aws sts get-caller-identity
```

```text i18n-prose
(not run yet — paste the `aws sts get-caller-identity` output from inside Actions here;
 the Arn must be .../assumed-role/gha-deploy/<session>, NOT :user/...)
```

🔴 **The only place you are allowed to get this wrong is `sub`, and getting it wrong loses
the whole exercise:**

| Writing `sub` as | Who can assume your role |
|---|---|
| `repo:<org>/<repo>:ref:refs/heads/main` | ✅ only the `main` branch of that exact repo |
| `repo:<org>/<repo>:*` | every branch **and every pull request** — an outsider opening a PR can run it |
| `StringLike` with `repo:<org>/*` | every repo in the org |
| omitting the `sub` condition entirely | **every GitHub repository in the world** |

That last row is not an exaggeration: the provider
`token.actions.githubusercontent.com` serves all of GitHub. Without pinning `sub` you have
just opened the role to everyone. This is exactly the confused deputy of exercise
[I20 in the intermediate tier](bt-02-trung-binh.md), under a different name.

If you need several branches, use `StringLike` **with a bound**, not a bare `*`:

```json
"StringLike": {
  "token.actions.githubusercontent.com:sub": "repo:<org>/<repo>:ref:refs/heads/release/*"
}
```

Deploying from an environment? Pin the environment, which is tighter than a branch:
`repo:<org>/<repo>:environment:production`.

</details>

### P3. A key-rotation loop with no downtime

**Problem:** One static key **must** be kept. Design a rotation procedure that does not
break the service.

<details>
<summary>Solution</summary>

Five steps, and step 4 is the one people skip:

```text i18n-prose
1. create-access-key           -> the user now has 2 keys (the cap is 2, exercise A6 of tier 1)
2. update everywhere that uses the old key to the new one
3. update-access-key --status Inactive   on the OLD key
4. WAIT — at least one full cycle of every job (a monthly job means waiting a month)
5. nothing broke   -> delete-access-key the old key
   something broke -> update-access-key --status Active   (rollback in one second)
```

Verify step 4 with data, do not guess:

```bash
aws iam get-access-key-last-used --access-key-id <khoa-cu> \
  --query 'AccessKeyLastUsed.LastUsedDate'
```

```text i18n-prose
(not run yet — paste the old key's LastUsedDate before and after going Inactive)
```

`Inactive` **can be reversed**, `delete` cannot. That is the entire reason step 3 exists
separately instead of deleting outright — you buy a rollback path for the price of one
command.

⚠️ The **2 keys per user** cap means a user already holding 2 keys **cannot be rotated** —
you must delete one first, which means losing the rollback path. Keep the rule: normally
**one** key per user, with a second existing only during a rotation.

</details>

### P4. Identity Center instead of IAM users for people

**Problem:** State exactly what has to be done to move a team of 10 from IAM users to
Identity Center, and what is **not** lost in the move.

<details>
<summary>Solution</summary>

| Task | Note |
|---|---|
| Enable Identity Center in the management account | $0 |
| Connect an identity source | the Identity Center directory, or AD, or an external IdP (Okta, Entra ID) |
| Create **permission sets** by function | these are Identity Center's "policies", bound to *group × account* |
| Assign group ↔ account ↔ permission set | three-way, never per person |
| People run `aws sso login` | they receive **temporary** credentials that expire on their own |
| Delete the old IAM users and their keys | the step that gets forgotten ⇒ the old way in stays open |

**What is not lost:** every policy you have already written. Permission sets use the same
policy JSON language, they are still subject to SCPs, and still subject to permission
boundaries. Everything from the two earlier tiers carries over unchanged.

Why this is the *LEAST operational overhead* answer: disabling one person in the IdP
disables them across every account at once. With IAM users you have to go delete them
account by account — and one account will be missed.

</details>

---

## Part B — Least privilege with evidence (3 exercises)

### P5. Narrow a `*:*` role using measurements

**Problem:** Take a role that currently has `Resource: "*"`, `Action: "*"`. Rewrite its
policy to match only what it used over 90 days.

<details>
<summary>Solution — three steps, do not reorder them</summary>

```bash
# 1. service nao role nay thuc su goi?
JOB=$(aws iam generate-service-last-accessed-details \
        --arn arn:aws:iam::<account>:role/<role> --query JobId --output text)
aws iam get-service-last-accessed-details --job-id "$JOB" \
  --query 'ServicesLastAccessed[?TotalAuthenticatedEntities>`0`].[ServiceNamespace,LastAuthenticated]' \
  --output table

# 2. action cu the: Access Advisor chi tra ve muc SERVICE, nen phai lay tu CloudTrail
aws cloudtrail lookup-events --max-results 50 \
  --lookup-attributes AttributeKey=Username,AttributeValue=<ten-role> \
  --query 'Events[].[EventName,EventSource]' --output text | sort -u

# 3. viet lai policy roi MO PHONG truoc khi apply
aws iam simulate-custom-policy --policy-input-list "$(cat policy-moi.json)" \
  --action-names <action-can-cho-1> <action-can-cho-2> <action-phai-chan> \
  --resource-arns <arn>
```

```text i18n-prose
(not run yet — paste the service list from step 1 and the action list from step 2 here)
```

Step 3 is what separates this work from guessing: you hold a **list of actions that must be
allowed** and a **list that must be blocked**, run one command, and compare both columns.
The new policy only gets applied when both columns are correct.

:::warning Access Advisor only sees the past

It reports permissions that **have been used**, not permissions that are **needed**. An
action that runs quarterly, or only during an incident, will not appear and gets cut by
mistake — then breaks at the worst possible time. That is why the window is **90 days** or
more, and why you must ask the service owner about rarely-scheduled code paths before
cutting.

:::

Narrow in stages, never in one jump: `*:*` → restrict the **service** → restrict the
**action** → restrict the **resource** → add **conditions**. Let each stage run for a few
days before tightening further.

</details>

### P6. Find every over-broad policy in the account

**Problem:** List every customer managed policy containing `Action: "*"` or
`Resource: "*"`, and every policy granting broad `iam:PassRole`.

<details>
<summary>Solution</summary>

```bash
aws iam get-account-authorization-details > /tmp/iam.json

# policy co Action: * hoac Resource: *
jq -r '.Policies[] | . as $p | .PolicyVersionList[]
       | select(.IsDefaultVersion) | .Document.Statement[]?
       | select(.Effect=="Allow" and ((.Action=="*") or (.Resource=="*")))
       | $p.PolicyName' /tmp/iam.json | sort -u

# policy cap iam:PassRole
jq -r '.Policies[] | . as $p | .PolicyVersionList[]
       | select(.IsDefaultVersion) | .Document.Statement[]?
       | select((.Action // empty | tostring) | test("iam:PassRole|iam:\\*"))
       | $p.PolicyName' /tmp/iam.json | sort -u
```

```text i18n-prose
(not run yet — paste both lists here)
```

The second list is the more worrying one even though it is usually shorter: every policy on
it is **equivalent to admin** if the `PassRole` `Resource` is `*` (exercise
[I17 of the intermediate tier](bt-02-trung-binh.md)).

Run this monthly, keep the file, and `diff` — every newly granted permission shows up,
including the ones nobody announced.

</details>

### P7. Policy tests in CI

**Problem:** Turn policy review into an automated test that runs on pull requests.

<details>
<summary>Solution</summary>

Every policy in the repository ships with an expectation file:

```text i18n-prose
policies/
  data-reader.json
  data-reader.expect     # action<TAB>resource<TAB>allowed|denied
```

```text
s3:GetObject	arn:aws:s3:::data-lake/public/a.txt	allowed
s3:GetObject	arn:aws:s3:::data-lake/private/a.txt	denied
s3:DeleteObject	arn:aws:s3:::data-lake/public/a.txt	denied
iam:CreateUser	*	denied
```

The CI script:

```bash
fail=0
while IFS=$'\t' read -r action resource want; do
  got=$(aws iam simulate-custom-policy \
          --policy-input-list "$(cat policies/data-reader.json)" \
          --action-names "$action" --resource-arns "$resource" \
          --query 'EvaluationResults[0].EvalDecision' --output text)
  case "$got:$want" in
    allowed:allowed|implicitDeny:denied|explicitDeny:denied) ;;
    *) echo "MISMATCH $action $resource: muon=$want duoc=$got"; fail=1 ;;
  esac
done < policies/data-reader.expect
exit $fail
```

```text i18n-prose
(not run yet — paste the result of one CI run here)
```

The real value: a policy that is **broader than intended** turns CI red. That is the class
of bug reading the JSON by eye does not catch — the reviewer sees
`Allow s3:GetObject` and nods, without noticing `Resource` has been widened to
`data-lake/*`.

The `iam:CreateUser → denied` line in the expectation file looks redundant, but it is the
ratchet that stops the policy widening later: anyone adding `Action: "*"` turns CI red
immediately.

</details>

---

## Part C — Guard rails (4 exercises)

### P8. Permission boundaries that stop escalation

**Problem:** Let developers create their own roles **without** granting themselves more
permissions.

<details>
<summary>Solution — the two-layer pattern</summary>

Layer 1 — the **boundary** defining the permission ceiling for developer-created roles:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:*", "dynamodb:*", "logs:*", "lambda:InvokeFunction"],
    "Resource": "*"
  }]
}
```

Layer 2 — the **developer's** policy, requiring them to attach that boundary when creating
a role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TaoRoleNhungPhaiCoBoundary",
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:PutRolePolicy", "iam:AttachRolePolicy"],
      "Resource": "arn:aws:iam::<account>:role/dev-*",
      "Condition": {
        "StringEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::<account>:policy/dev-boundary"
        }
      }
    },
    {
      "Sid": "KhongDuocThaoBoundary",
      "Effect": "Deny",
      "Action": [
        "iam:DeleteRolePermissionsBoundary",
        "iam:PutRolePermissionsBoundary",
        "iam:DeletePolicy",
        "iam:CreatePolicyVersion",
        "iam:SetDefaultPolicyVersion"
      ],
      "Resource": [
        "arn:aws:iam::<account>:policy/dev-boundary",
        "arn:aws:iam::<account>:role/dev-*"
      ]
    }
  ]
}
```

```text i18n-prose
(not run yet — try creating a role without the boundary, and try editing the boundary
 itself; paste both errors)
```

**The second statement is the decisive one**, and the one that gets left out. Without it a
developer creates a role with the correct boundary — then edits the boundary's contents to
widen it, or detaches the boundary from the role. Granting role-creation without blocking
the path to editing the fence makes the fence decorative.

The `iam:PermissionsBoundary` condition and the `role/dev-*` prefix must come together:
without the prefix, a developer can create a role with any name, including names colliding
with system roles.

</details>

### P9. SCPs — a ceiling for the whole organisation

**Problem:** Write three SCPs: restrict regions, prevent CloudTrail from being disabled,
prevent the security guard rails from being removed.

<details>
<summary>Solution</summary>

**SCP 1 — restrict regions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ChanRegionNgoaiDanhSach",
    "Effect": "Deny",
    "NotAction": [
      "iam:*", "sts:*", "organizations:*", "cloudfront:*",
      "route53:*", "support:*", "budgets:*", "waf:*", "shield:*"
    ],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {"aws:RequestedRegion": ["ap-southeast-1", "us-east-1"]}
    }
  }]
}
```

**SCP 2 — nobody may turn off monitoring:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "KhongTatDuocGiamSat",
    "Effect": "Deny",
    "Action": [
      "cloudtrail:StopLogging",
      "cloudtrail:DeleteTrail",
      "cloudtrail:UpdateTrail",
      "config:DeleteConfigurationRecorder",
      "config:StopConfigurationRecorder",
      "guardduty:DeleteDetector",
      "guardduty:DisassociateFromMasterAccount"
    ],
    "Resource": "*"
  }]
}
```

**SCP 3 — the P8 guard rails cannot be removed:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "BaoVeRoleHeThong",
    "Effect": "Deny",
    "Action": [
      "iam:DeleteRole", "iam:DeleteRolePolicy", "iam:DetachRolePolicy",
      "iam:PutRolePermissionsBoundary", "iam:DeleteRolePermissionsBoundary"
    ],
    "Resource": [
      "arn:aws:iam::*:role/org-security-*",
      "arn:aws:iam::*:role/aws-reserved/*"
    ]
  }]
}
```

```text i18n-prose
(not run yet — use a member account's admin to try breaking all three SCPs; paste the
 three errors here)
```

Three decisive details; get them wrong and you lock yourself out:

- **`NotAction` must list the global services.** IAM, STS, Organizations, CloudFront,
  Route 53, WAF and Shield are global but their endpoints live in `us-east-1`. Blocking all
  regions without excluding them means **you can no longer reach that account's IAM**.
- **SCPs do not apply to the management account.** Test in a member account, otherwise you
  will conclude SCPs do not work.
- **The simulator cannot see SCPs.** `allowed` in the simulator with a real failure ⇒
  suspect an SCP first.

Always attach a new SCP to a **test OU** first, never straight to the root.

</details>

### P10. A break-glass role

**Problem:** A high-privilege role that nobody uses day to day, requires MFA, and raises an
alert when it is used.

<details>
<summary>Solution — three parts</summary>

**1. A trust policy requiring MFA and a short session:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": [
      "arn:aws:iam::<account>:user/oncall-1",
      "arn:aws:iam::<account>:user/oncall-2"
    ]},
    "Action": "sts:AssumeRole",
    "Condition": {
      "Bool": {"aws:MultiFactorAuthPresent": "true"},
      "NumericLessThan": {"aws:MultiFactorAuthAge": "3600"}
    }
  }]
}
```

```bash
aws iam update-role --role-name break-glass --max-session-duration 3600
```

**2. An alert when the role is assumed** — an EventBridge rule matching `AssumeRole` in
CloudTrail:

```json
{
  "source": ["aws.sts"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["sts.amazonaws.com"],
    "eventName": ["AssumeRole"],
    "requestParameters": {
      "roleArn": ["arn:aws:iam::<account>:role/break-glass"]
    }
  }
}
```

Target: an SNS topic with a real human subscribed.

**3. Verify:**

| Attempt | Expected |
|---|---|
| `assume-role` **without** MFA | `AccessDenied` |
| `assume-role` with MFA | succeeds, **and SNS sends the alert** |

```text i18n-prose
(not run yet — paste both, and confirm you received the alert)
```

`aws:MultiFactorAuthAge` is the detail usually left out: without it, a session that
authenticated with MFA eleven hours ago still counts as "has MFA". The `3600` forces
re-authentication close to the moment the high privilege is used.

**The alert, not the policy, is the most important part of this exercise.** High privilege
cannot be forbidden — sometimes it genuinely has to be used. What you need is for **nobody
to use it without someone knowing**.

</details>

### P11. Access Analyzer — resources currently exposed

**Problem:** Find every resource in the account shared outside the account or outside the
Organization.

<details>
<summary>Solution</summary>

```bash
aws accessanalyzer create-analyzer --analyzer-name org-external \
  --type ACCOUNT   # hoac ORGANIZATION neu chay o management account

aws accessanalyzer list-findings \
  --analyzer-arn <arn> \
  --filter '{"status":{"eq":["ACTIVE"]}}' \
  --query 'findings[].[resourceType,resource,isPublic]' --output table
```

```text i18n-prose
(not run yet — paste the finding list here; the target is 0 unintended findings)
```

The `ACCOUNT`/`ORGANIZATION` type covers **external access** and is **free**. It inspects
bucket policies, KMS key policies, role trust policies, SQS policies, Lambda resource
policies and more, and reports which ones let a principal outside your trust boundary in.

For each finding there are exactly three options: **fix** the policy, **archive** the
finding with a reason (if the sharing is intentional), or **delete** the resource. Leaving
a finding ACTIVE without deciding is the worst state — next time nobody knows whether it
was ever reviewed.

⚠️ The **unused access** type is a **different** analyzer and **costs money** per role per
month. Do not enable both in one go and then forget.

</details>

---

## Part D — Advanced patterns (3 exercises)

### P12. Tag-based access control

**Problem:** One policy for N teams, each team seeing only resources with a matching tag.

<details>
<summary>Solution</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ChiThayTaiNguyenCungTeam",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/Team": "${aws:PrincipalTag/Team}"
        }
      }
    },
    {
      "Sid": "TaoMoiThiPhaiGanTagCuaMinh",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestTag/Team": "${aws:PrincipalTag/Team}"
        },
        "Null": {"aws:RequestTag/Team": "false"}
      }
    }
  ]
}
```

```text i18n-prose
(not run yet — tag user A with Team=alpha and user B with Team=beta, try crossing over;
 paste all 4 results)
```

`${aws:PrincipalTag/Team}` is a **policy variable** — it is substituted with the real value
at evaluation time. That is how one policy serves every team instead of N copies.

Three conditions to remember; miss one and there is a hole:

- `aws:ResourceTag` reads the tag **on the resource** — used for actions on things that
  already exist.
- `aws:RequestTag` reads the tag **in a create request** — without enforcing it, a user
  creates untagged resources and then cannot access them either (or worse: untagged
  resources fall outside every restriction).
- `Null: false` requires the tag to be present — the same trap as exercise
  [I18 of the intermediate tier](bt-02-trung-binh.md).

🔴 **A real trade-off:** this model depends on correct tags, and **anyone can edit tags**
unless you stop them. You must also `Deny` `s3:PutBucketTagging` / `ec2:CreateTags` on the
`Team` tag key, otherwise a user simply retags themselves.

</details>

### P13. ABAC with Identity Center

**Problem:** People sign in through an external IdP. How does their `Team` attribute reach
the policy?

<details>
<summary>Solution</summary>

In Identity Center, enable **attribute-based access control** and map IdP attributes to
session tags:

```text i18n-prose
IdP attribute   ->  session tag
  department    ->  Team
  costCenter    ->  CostCenter
```

The permission set then uses `${aws:PrincipalTag/Team}` **exactly as in exercise P12** —
without needing to know who the person is, only what attributes they carry.

```text i18n-prose
(not run yet — paste `aws sts get-caller-identity` plus one command blocked by a wrong Team)
```

Why this is the destination of the whole tier: **no IAM users, no keys, no per-person
policy.** Adding someone to a team in the IdP gives them the right permissions in every
account with nobody editing a policy. Removing them from the team removes the access
immediately.

Limits worth knowing: session tags are **not** usable with every service, and
tag-dependent policies are harder to read than policies listing ARNs — debugging an
`AccessDenied` of this kind takes longer.

</details>

### P14. Periodic review — turning exercises into a habit

**Problem:** Design a monthly IAM review cycle for one account.

<details>
<summary>Solution</summary>

| Cadence | Task | Command / where |
|---|---|---|
| **Monthly** | Credential report: old keys, users without MFA | [I14](bt-02-trung-binh.md) |
| Monthly | Snapshot `get-account-authorization-details`, `diff` against last month | [P6](#p6-find-every-over-broad-policy-in-the-account) |
| Monthly | Access Analyzer: new external-access findings | [P11](#p11-access-analyzer--resources-currently-exposed) |
| **Quarterly** | Access Advisor across every role: services unused for 90 days | [P5](#p5-narrow-a--role-using-measurements) |
| Quarterly | Audit every `iam:PassRole` with `Resource: "*"` | [P6](#p6-find-every-over-broad-policy-in-the-account) |
| **Every PR** | Automated policy tests | [P7](#p7-policy-tests-in-ci) |
| **Every use** | Break-glass alert | [P10](#p10-a-break-glass-role) |

```text i18n-prose
(not run yet — paste the review schedule you set up, and the result of the first review)
```

The left column matters more than the right one: commands can always be looked up, but
**cadence** is what nobody reminds you of. Reviewing once and then stopping is no different
from never reviewing — because permissions only ever widen over time, never narrow by
themselves.

</details>

---

## The six principles that come out of this

Learn these six lines; the exam asks them directly, and production fails exactly here:

1. People → **Identity Center**. Machines inside AWS → **roles**. Machines outside AWS →
   **OIDC**. There is no slot for a long-lived access key.
2. Grant permissions by **role per function**, never per person.
3. Narrow by default and **widen only with evidence** (CloudTrail / Access Advisor) — never
   open `*` and promise to clean up later. That cleanup never happens.
4. `iam:PassRole`, `iam:CreatePolicyVersion` and `iam:UpdateAssumeRolePolicy` are
   **escalation permissions** — grant them as you would grant admin.
5. New policies: **simulate before applying**. Old policies: review on a cadence, not
   forever.
6. The highest privilege must be **hard to use**: break-glass with MFA, with an alert, used
   by nobody day to day.

## Related Topics

- [IAM fundamentals](../reference/iam-fundamentals.md) — the foundation layer
- [Policy evaluation](../reference/iam-policy-evaluation.md) — the mechanisms behind these patterns
- [Exercises — Intermediate](bt-02-trung-binh.md) — previous tier, finish it before P5
- [Exercises — Basic](bt-01-co-ban.md) — first tier, runs free on the emulator
- [Access management](../../foundations/reference/access-management.md) — Identity Center and Secrets Manager at the foundations layer
- [IAM exercises](index.md) — all three tiers
