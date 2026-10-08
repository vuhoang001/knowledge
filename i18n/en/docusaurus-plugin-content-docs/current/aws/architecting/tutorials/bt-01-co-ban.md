---
title: Exercises — Basic (emulator)
sidebar_position: 10
description: "26 IAM exercises with solutions on a local emulator: identities, policies, roles and STS, and policy simulation. Includes a measured table of what the emulator does and does not enforce."
tags: [tutorial, aws, iam, saa-c03, emulator, assume-role, policy-simulator, domain-1]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-08
---

# Exercises — Basic (emulator)

> **Takeaway:** The emulator **simulates policies correctly** but **does not enforce**
> them. Those two sentences sound alike and have opposite consequences:
> `simulate-principal-policy` here answers explicit deny, `Resource` scoping and
> permission boundaries correctly — so this tier **does teach the logic**; but a real API
> call still lets `s3 ls` through under a `Deny s3:*`, so **do not trust the result of an
> API call**.

Theory: [IAM fundamentals](../reference/iam-fundamentals.md) ·
[Policy evaluation](../reference/iam-policy-evaluation.md) ·
Next tier: [Intermediate](bt-02-trung-binh.md)

## How to use this page

26 exercises in five parts. Each one has a **Problem** and then a collapsed **Solution** —
try it first, open it afterwards. The output in the solutions is **real output**, captured
on 2026-10-08 against the emulator, with keys shortened. Your `AccessKeyId`, `RoleId` and
timestamps will differ; the **shape** must match.

## Environment

A local AWS-compatible emulator running in Docker, listening on port `4566`. The specific
host has been **redacted** because this repository is public — substitute your own for
`<floci-host>`.

```bash
export AWS_ENDPOINT_URL=http://<floci-host>:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

aws sts get-caller-identity
```

<details>
<summary>Expected output, and one discrepancy to know up front</summary>

```text
{
    "UserId": "000000000000",
    "Account": "000000000000",
    "Arn": "arn:aws:iam::000000000000:root"
}
```

With the `test/test` key the emulator returns `:root`. But when you call with **an IAM
user's access key** it **does** reflect that user:

```text
{
    "UserId": "000000000000",
    "Account": "000000000000",
    "Arn": "arn:aws:iam::000000000000:user/lab-alice"
}
```

The discrepancy is in `UserId`: real AWS returns the principal's own ID (`AIDA…` for a
user, `AROA…` for a role), the emulator returns the **account ID**. Do not rely on
`UserId` at this tier.

</details>

---

## Part A — Identities (6 exercises)

### A1. Create a user and read it back

**Problem:** Create the IAM user `lab-alice`. Note its ARN and `UserId`.

<details>
<summary>Solution</summary>

```bash
aws iam create-user --user-name lab-alice
```

```text
{
    "User": {
        "Path": "/",
        "UserName": "lab-alice",
        "UserId": "AIDAX0O8LWY2ZYZ5OEUT",
        "Arn": "arn:aws:iam::000000000000:user/lab-alice",
        "CreateDate": "2026-10-08T02:52:22.156323+00:00"
    }
}
```

Two details worth remembering: `UserId` starts with **`AIDA`** (a user), and `Path`
defaults to `/` — paths group identities by organisation (`/engineering/`), and a policy
can match on path.

</details>

### A2. Access keys, and why you only see the secret once

**Problem:** Create an access key for `lab-alice`, then list the keys. Explain why the
listing has no secret key.

<details>
<summary>Solution</summary>

```bash
aws iam create-access-key --user-name lab-alice
```

```text
{
    "AccessKey": {
        "UserName": "lab-alice",
        "AccessKeyId": "AKIA7A5EIQQI4BTX…",
        "Status": "Active",
        "SecretAccessKey": "CqqG6msauH5lPU6EKoOr…  (da rut gon)",
        "CreateDate": "2026-10-08T02:52:22.659469+00:00"
    }
}
```

```bash
aws iam list-access-keys --user-name lab-alice --output table
```

```text
-------------------------------------------------------
|                   ListAccessKeys                    |
+-----------------------------------------------------+
||                 AccessKeyMetadata                 ||
|+--------------+------------------------------------+|
||  AccessKeyId |  AKIA7A5EIQQI4BTX…              ||
||  CreateDate  |  2026-10-08T02:52:22.659469+00:00  ||
||  Status      |  Active                            ||
||  UserName    |  lab-alice                         ||
|+--------------+------------------------------------+|
```

`SecretAccessKey` is **absent** from `list-access-keys`, and no API can read it back — AWS
returns it exactly once, at creation. Lose it and there is no recovery, only creating a new
key and deleting the old one. The `AKIA` prefix marks a long-lived key; `ASIA` marks a
temporary session key (exercise C3).

</details>

### A3. Deactivate before deleting

**Problem:** Set `lab-alice`'s key to `Inactive` and verify it. Why do this step before
deleting a key in production?

<details>
<summary>Solution</summary>

```bash
aws iam update-access-key --user-name lab-alice \
  --access-key-id <AKIA...> --status Inactive
aws iam list-access-keys --user-name lab-alice \
  --query 'AccessKeyMetadata[].[AccessKeyId,Status]' --output text
```

`Inactive` **can be reversed**; deletion cannot. The safe rotation sequence is: create the
new key → update everywhere that uses it → set the old key `Inactive` → **wait** → only
delete once nothing has broken. Setting `Inactive` buys you a rollback; deleting leaves you
no way back.

</details>

### A4. Group, and where permissions actually live

**Problem:** Create the group `lab-developers`, put `lab-alice` in it, attach
`ReadOnlyAccess` to the group. Then ask *"what policies does alice have?"* with
`list-attached-user-policies`. Predict the result before you run it.

<details>
<summary>Solution — and this is the first small trap</summary>

```bash
aws iam create-group --group-name lab-developers
aws iam add-user-to-group --group-name lab-developers --user-name lab-alice
aws iam attach-group-policy --group-name lab-developers \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

aws iam list-attached-user-policies --user-name lab-alice --output text
```

```text i18n-prose
(prints no lines at all)
```

**Empty** — and that is the correct answer, not an error. Alice has no directly attached
policy; the permissions live on the group.

```bash
aws iam list-groups-for-user --user-name lab-alice --query 'Groups[].GroupName' --output text
aws iam list-attached-group-policies --group-name lab-developers --output text
```

```text
lab-developers
ATTACHEDPOLICIES	arn:aws:iam::aws:policy/ReadOnlyAccess	ReadOnlyAccess
```

⇒ Checking a user's real permissions means going through **three** places: directly
attached policies, policies via groups, and inline policies. One empty place tells you
nothing. A faster way than all three: `simulate-principal-policy` (Part D).

</details>

### A5. Tags on identities

**Problem:** Tag `lab-alice` with `Team=data` and read it back. What is this tag for in a
policy?

<details>
<summary>Solution</summary>

```bash
aws iam tag-user --user-name lab-alice --tags Key=Team,Value=data
aws iam list-user-tags --user-name lab-alice --output table
```

```text
---------------------
|   ListUserTags    |
+-------------------+
||      Tags       ||
|+-------+---------+|
||  Key  |  Value  ||
|+-------+---------+|
||  Team |  data   ||
|+-------+---------+|
```

A tag on a principal is readable in a policy through the condition key
**`aws:PrincipalTag/Team`**. Pair it with `aws:ResourceTag/Team` and you get
**tag-based access control**: a single policy serving N teams, each seeing only resources
with a matching tag. Exercise [P12 in the production tier](bt-03-production.md) builds the
full pattern.

</details>

### A6. Account quotas

**Problem:** How many users does this account allow, how many access keys per user, how
many versions per managed policy? Find out with one command.

<details>
<summary>Solution</summary>

```bash
aws iam get-account-summary
```

The parts worth remembering, from the real output:

```text
    "UsersQuota": 5000,
    "GroupsQuota": 300,
    "GroupsPerUserQuota": 10,
    "RolesQuota": 1000,
    "PoliciesQuota": 1500,
    "VersionsPerPolicyQuota": 5,
    "AccessKeysPerUserQuota": 2,
    "AttachedPoliciesPerUserQuota": 10,
    "AttachedPoliciesPerRoleQuota": 20,
    "PolicySizeQuota": 6144,
    "AssumeRolePolicySizeQuota": 2048,
```

Three numbers come up often: **2 access keys** per user (enough to rotate, not enough to be
lazy), **5 versions** per managed policy (exercise B4 hits this ceiling), and
**6144 bytes** per managed policy — an over-long policy is a real failure, and the reason
to split policies rather than cram one enormous document.

</details>

---

## Part B — Policies (6 exercises)

### B1. Your first inline policy

**Problem:** Attach an inline policy to `lab-alice`: only `s3:GetObject`, and only on
`arn:aws:s3:::lab-bucket/public/*`. Read it back to confirm.

<details>
<summary>Solution</summary>

```bash
cat > /tmp/p-read-public.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ReadPublicOnly",
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::lab-bucket/public/*"
  }]
}
EOF

aws iam put-user-policy --user-name lab-alice \
  --policy-name lab-inline --policy-document file:///tmp/p-read-public.json
aws iam list-user-policies --user-name lab-alice --output text
```

```text
POLICYNAMES	lab-inline
```

Four fields to commit to memory: `Version` is **always** `"2012-10-17"` (not today's date —
this is the version of the *policy language*, and dropping it disables some condition
features), plus `Effect`, `Action` and `Resource`. `Sid` is optional but worth having: it
shows up in the simulator's `MatchedStatements`, telling you **which statement** matched.

Note the three slashes in `file:///tmp/...` — two belong to `file://` and the third is the
root of the Linux path. Two slashes makes it a relative path and the command fails with
`No such file or directory`.

</details>

### B2. Telling the three policy types apart

**Problem:** Create a **customer managed policy** with the same contents as B1, attach it
to the group, then delete B1's inline policy. State the difference between AWS managed,
customer managed and inline.

<details>
<summary>Solution</summary>

```bash
aws iam create-policy --policy-name lab-read-public \
  --policy-document file:///tmp/p-read-public.json
```

```text
{
    "Policy": {
        "PolicyName": "lab-read-public",
        "PolicyId": "ANPA5P7M1OZE75RNDX1E",
        "Arn": "arn:aws:iam::000000000000:policy/lab-read-public",
        "Path": "/",
        "DefaultVersionId": "v1",
        "AttachmentCount": 0,
        "IsAttachable": true,
        ...
```

```bash
aws iam attach-group-policy --group-name lab-developers \
  --policy-arn arn:aws:iam::000000000000:policy/lab-read-public
aws iam delete-user-policy --user-name lab-alice --policy-name lab-inline
```

| Type | ARN | Reusable | Versioned |
|---|---|---|---|
| AWS managed | `arn:aws:iam::aws:policy/…` | ✅ every account | AWS maintains |
| Customer managed | `arn:aws:iam::<account>:policy/…` | ✅ within the account | ✅ up to 5 |
| Inline | no ARN of its own | ❌ dies with the identity | ❌ |

`PolicyId` starts with **`ANPA`**. The prefix set is worth memorising because it speeds up
reading logs: `AIDA` user · `AGPA` group · `AROA` role · `ANPA` policy ·
`AIPA` instance profile · `AKIA` long-lived key · `ASIA` temporary key.

</details>

### B3. Widening a policy correctly — `ListBucket` uses a different ARN

**Problem:** The B1 policy only allows `GetObject`. Now make
`aws s3 ls s3://lab-bucket/public/` work. **Trap:** `s3:ListBucket` does not accept an
object ARN.

<details>
<summary>Solution</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ReadPublicOnly",
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::lab-bucket",
      "arn:aws:s3:::lab-bucket/public/*"
    ]
  }]
}
```

Two ARNs, **not** one. `s3:ListBucket` acts **on the bucket**, so its ARN is
`arn:aws:s3:::lab-bucket` (no `/*`); `s3:GetObject` acts **on objects**, so it needs
`/public/*`. Writing `ListBucket` with an object ARN is the classic silent failure: the
policy is valid, it saves, and `ls` still returns `AccessDenied`.

To tighten it further you can restrict `ListBucket` by prefix with the `s3:prefix`
condition — but that belongs to the [intermediate tier](bt-02-trung-binh.md).

</details>

### B4. Versions of a managed policy

**Problem:** Create a new version of `lab-read-public` (the B3 contents), make it the
default, then list the versions. Is the old version still there?

<details>
<summary>Solution</summary>

```bash
aws iam create-policy-version \
  --policy-arn arn:aws:iam::000000000000:policy/lab-read-public \
  --policy-document file:///tmp/p-v2.json --set-as-default

aws iam list-policy-versions \
  --policy-arn arn:aws:iam::000000000000:policy/lab-read-public \
  --query 'Versions[].[VersionId,IsDefaultVersion]' --output text
```

```text
v1	False
v2	True
```

The old version **is still there**, just no longer the default. That is IAM's rollback
mechanism:

```bash
aws iam set-default-policy-version \
  --policy-arn arn:aws:iam::000000000000:policy/lab-read-public --version-id v1
```

⚠️ The ceiling is **5 versions** (exercise A6). Hit it and `create-policy-version` fails
until you `delete-policy-version` — a common failure in pipelines that update policies
automatically.

</details>

### B5. Who is using this policy?

**Problem:** Before deleting a managed policy, how do you find out where it is still
attached?

<details>
<summary>Solution</summary>

```bash
aws iam list-entities-for-policy \
  --policy-arn arn:aws:iam::000000000000:policy/lab-read-public
```

```text
{
    "PolicyGroups": [],
    "PolicyUsers": [],
    "PolicyRoles": []
}
```

Three empty lists ⇒ safe to delete. Any entry and `delete-policy` fails — IAM **refuses**
to delete a policy that is still attached, so you must detach everything first. The
`AttachmentCount` field in `get-policy` gives the same information as a single number.

</details>

### B6. Writing a policy with `Condition`

**Problem:** Write one policy containing the three most common conditions: require TLS,
restrict regions, require MFA.

<details>
<summary>Solution</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyKhongTLS",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": "*",
      "Condition": {"Bool": {"aws:SecureTransport": "false"}}
    },
    {
      "Sid": "ChiRegionDuocPhep",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {"aws:RequestedRegion": ["ap-southeast-1", "us-east-1"]}
      }
    },
    {
      "Sid": "XoaThiPhaiCoMFA",
      "Effect": "Allow",
      "Action": "s3:DeleteObject",
      "Resource": "*",
      "Condition": {"Bool": {"aws:MultiFactorAuthPresent": "true"}}
    }
  ]
}
```

Three easy mistakes:

- Boolean values go in **quotes**: `"false"`, not `false`.
- The first two statements use `Deny` with a **negated** condition
  (`SecureTransport: false`, `StringNotEquals`). Writing them as `Allow` with a positive
  condition is **not equivalent**: an `Allow` blocks nobody, because the default is already
  deny.
- `aws:MultiFactorAuthPresent` is **absent** from some services' indirect calls — then the
  condition does not match and the `Allow` does not apply. To be certain, add
  `"Null": {"aws:MultiFactorAuthPresent": "false"}`.

</details>

---

## Part C — Roles and STS (5 exercises)

### C1. A role for a service, and the instance profile

**Problem:** Create a role `lab-ec2-role` that EC2 can assume, then create an instance
profile and put the role in it. Why does EC2 need the extra instance profile when Lambda
does not?

<details>
<summary>Solution</summary>

```bash
cat > /tmp/trust-ec2.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ec2.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role --role-name lab-ec2-role \
  --assume-role-policy-document file:///tmp/trust-ec2.json
```

```text
{
    "Role": {
        "RoleName": "lab-ec2-role",
        "RoleId": "AROASGTDAP8N0LQ3070U",
        "Arn": "arn:aws:iam::000000000000:role/lab-ec2-role",
        "AssumeRolePolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "ec2.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        },
        "MaxSessionDuration": 3600
    }
}
```

```bash
aws iam create-instance-profile --instance-profile-name lab-ec2-profile
aws iam add-role-to-instance-profile \
  --instance-profile-name lab-ec2-profile --role-name lab-ec2-role
aws iam get-instance-profile --instance-profile-name lab-ec2-profile \
  --query 'InstanceProfile.Roles[].RoleName'
```

```text
[
    "lab-ec2-role"
]
```

**An instance profile is the wrapper that lets a role be attached to an EC2 instance** —
EC2 does not take a role directly. Lambda, ECS tasks and CodeBuild do, with no wrapper.
The console creates the instance profile implicitly, so many people never learn it exists,
then build the same thing with the CLI or Terraform and hit *"Invalid IAM Instance Profile
name"* even though the role exists.

One instance profile holds **at most one** role.

</details>

### C2. A trust policy for an account, and `AssumeRole`

**Problem:** Create a role `lab-assume` that this account can assume, then assume it.

<details>
<summary>Solution</summary>

```bash
cat > /tmp/trust-acct.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::000000000000:root"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role --role-name lab-assume \
  --assume-role-policy-document file:///tmp/trust-acct.json

aws sts assume-role \
  --role-arn arn:aws:iam::000000000000:role/lab-assume \
  --role-session-name sess1 --query Credentials
```

```text
{
    "AccessKeyId": "ASIABTHHD8P16WV0YQZY",
    "SecretAccessKey": "tUzvsT3bqf4o4vbf...",
    "SessionToken": "eDm7geChxuzKbbtt2rvQ2olhIJpYBwGv5bKob1CMnFjsXSbEJB1N58...",
    "Expiration": "2026-10-08T03:10:04.166710+00:00"
}
```

**Three** values plus an expiry. `:root` in a trust policy does **not** mean the root user
— it means *"this account"*, and when written that way the principal must also hold
`sts:AssumeRole` in its own identity policy (on real AWS). Naming
`arn:aws:iam::<account>:user/lab-alice` explicitly removes that second requirement.

:::tip `--role-session-name` needs at least 2 characters

With one character `aws-cli` rejects it client-side:
`Invalid length for parameter RoleSessionName, value: 1, valid min length: 2`.
The session name lands in CloudTrail, so in production make it meaningful
(`deploy-ci-1234`) — it is the only thing distinguishing two people using the same role.

:::

</details>

### C3. Using temporary credentials correctly

**Problem:** Take the credentials from C2 and call `sts get-caller-identity` **with** them,
inside a subshell so the variables do not leak out.

<details>
<summary>Solution</summary>

```bash
(
  creds=$(aws sts assume-role \
    --role-arn arn:aws:iam::000000000000:role/lab-assume \
    --role-session-name sess-tam --query Credentials --output text)
  export AWS_ACCESS_KEY_ID=$(echo "$creds" | cut -f1)
  export AWS_SECRET_ACCESS_KEY=$(echo "$creds" | cut -f3)
  export AWS_SESSION_TOKEN=$(echo "$creds" | cut -f4)
  aws sts get-caller-identity
)
```

The field order of `--output text` is `AccessKeyId · Expiration · SecretAccessKey ·
SessionToken` — that is columns 1, **3**, 4, not 1, 2, 3. A common bug in hand-written
scripts; querying each value separately with `--query 'Credentials.AccessKeyId'` is safer.

Omit `AWS_SESSION_TOKEN` and real AWS returns `InvalidClientTokenId` — a message that
gives no hint you left out the third variable.

</details>

### C4. Duration limits and session policies

**Problem:** Assume the role with a **15 minute** lifetime, and once more with a
**session policy** allowing only `s3:ListAllMyBuckets`. What does a session policy do?

<details>
<summary>Solution</summary>

```bash
aws sts assume-role --role-arn arn:aws:iam::000000000000:role/lab-assume \
  --role-session-name sess1 --duration-seconds 900 \
  --query 'Credentials.[AccessKeyId,Expiration]'
```

```text
[
    "ASIAG5CVIAD5NKAWNZQH",
    "2026-10-08T03:08:04.128293+00:00"
]
```

Called at `02:53` → expires `03:08`, exactly 15 minutes.

```bash
cat > /tmp/sess.json <<'EOF'
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":"s3:ListAllMyBuckets","Resource":"*"}]}
EOF

aws sts assume-role --role-arn arn:aws:iam::000000000000:role/lab-assume \
  --role-session-name sess2 --policy file:///tmp/sess.json \
  --query 'Credentials.AccessKeyId'
```

A session policy is the **third intersection** (after SCPs and boundaries): the session's
permissions = the role's permissions **∩** the session policy. It **grants** nothing —
passing a session policy for `s3:*` when the role has no S3 still leaves the session
without S3.

When it is used for real: handing temporary credentials to a third party, or a service of
yours issuing credentials per tenant — each tenant getting a session policy narrower than
the shared role. `--duration-seconds` is capped by the role's `MaxSessionDuration`
(3600 by default).

</details>

### C5. Changing the trust policy of a live role

**Problem:** Change `lab-assume`'s trust policy from the account to the service
`ec2.amazonaws.com`, then read it back. How does this command differ from
`put-role-policy`?

<details>
<summary>Solution</summary>

```bash
aws iam update-assume-role-policy --role-name lab-assume \
  --policy-document file:///tmp/trust-ec2.json
aws iam get-role --role-name lab-assume --query 'Role.AssumeRolePolicyDocument'
```

```text
{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ec2.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
}
```

Two completely different policies, easy to confuse because both sit on the role:

| Command | Changes | Answers |
|---|---|---|
| `update-assume-role-policy` | the **trust policy** | *who may enter this role* |
| `put-role-policy` / `attach-role-policy` | the **permission policy** | *what this role may do* |

`update-assume-role-policy` **overwrites the whole document**, it does not merge. Deleting
the principal currently in use locks you out of your own role — so in production, always
read the current policy, edit it, and write the whole block back. And
`iam:UpdateAssumeRolePolicy` is an **escalation permission**: anyone holding it on an admin
role simply adds themselves to the trust policy.

</details>

---

## Part D — Simulation: where the logic is learned (6 exercises)

🔴 **The most important part of this tier.** `simulate-principal-policy` **does work** on
the emulator and **evaluates correctly** — measured 2026-10-08. So all of the logic in
[Policy evaluation](../reference/iam-policy-evaluation.md) can be learned right here, for
free.

The helper used throughout this part:

```bash
sim() {
  aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::000000000000:user/lab-alice \
    --action-names "$1" --resource-arns "$2" \
    --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
}
```

### D1. The three possible outcomes

**Problem:** Alice currently has `ReadOnlyAccess` through her group. Simulate three actions
and explain the three different outcomes: `ec2:DescribeInstances`, `iam:CreateUser`, and
`s3:GetObject` while alice still has an inline `Deny s3:*`.

<details>
<summary>Solution</summary>

```text
--- ec2:DescribeInstances  *                              -> allowed
--- iam:CreateUser         *                              -> implicitDeny
--- s3:GetObject           arn:aws:s3:::lab-bucket/pub... -> explicitDeny
```

| Outcome | Meaning | Fix by |
|---|---|---|
| `allowed` | an `Allow` matched and no `Deny` matched | — |
| `implicitDeny` | **no** `Allow` matched | adding an `Allow` |
| `explicitDeny` | a `Deny` matched | **removing the `Deny`** — adding an `Allow` is useless |

These three values are the whole of rules 1 and 2. Telling `implicitDeny` from
`explicitDeny` is telling *"missing permission"* from *"forbidden"* — two incidents that
look alike in the logs and are fixed in opposite ways.

Note that `ec2:DescribeInstances` returning `allowed` also proves the simulator **resolves
policies inherited through groups**, not only directly attached ones.

</details>

### D2. Explicit deny wins — proved with two runs

**Problem:** Prove rule 2 by running the same simulation twice, differing only in whether
the inline `Deny s3:*` is present.

<details>
<summary>Solution — real output, two runs</summary>

Run 1, alice has both `ReadOnlyAccess` (which allows `s3:GetObject`) **and** an inline
`Deny s3:*`:

```text
s3:GetObject    arn:aws:s3:::lab-bucket/public/a.txt    explicitDeny
s3:DeleteObject arn:aws:s3:::lab-bucket/public/a.txt    explicitDeny
```

Remove exactly one policy:

```bash
aws iam delete-user-policy --user-name lab-alice --policy-name lab-deny-s3
```

Run 2, same simulation command:

```text
s3:GetObject    arn:aws:s3:::lab-bucket/public/a.txt    allowed
```

`ReadOnlyAccess` was **unchanged** across both runs. The only thing that changed was one
`Deny`. That is the evidence for *"adding an `Allow` cannot open something under an
explicit `Deny`"* — and it runs for free in two seconds.

</details>

### D3. What the `Resource` field actually does

**Problem:** Reduce alice to **only** the inline `Allow s3:GetObject` on
`lab-bucket/public/*` (detach `ReadOnlyAccess` from the group). Then simulate
`public/a.txt` and `private/a.txt`.

<details>
<summary>Solution</summary>

```bash
aws iam detach-group-policy --group-name lab-developers \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
```

```text
s3:GetObject  arn:aws:s3:::lab-bucket/public/a.txt   allowed
s3:GetObject  arn:aws:s3:::lab-bucket/private/a.txt  implicitDeny
```

The same policy, the same action, **two outcomes** — differing only in the resource ARN.
That is the entire meaning of `Resource`.

:::warning Why `ReadOnlyAccess` had to be detached first

Without detaching, both come back `allowed` — because `ReadOnlyAccess` grants
`s3:GetObject` on `*`, which **overrides** the prefix restriction in your inline policy.
This is the second lesson, and the more important one: **a broad managed policy attached
in parallel makes every narrow policy you carefully wrote meaningless.** Least privilege
fails not because you wrote the policy wrong, but because a `ReadOnlyAccess` is still
hanging off a group you forgot about.

:::

</details>

### D4. Several actions at once

**Problem:** With the state from D3, simulate four actions at once against `public/a.txt`
and read the table.

<details>
<summary>Solution</summary>

```bash
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::000000000000:user/lab-alice \
  --action-names s3:GetObject s3:PutObject s3:DeleteObject s3:ListBucket \
  --resource-arns 'arn:aws:s3:::lab-bucket/public/a.txt' \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output table
```

```text
-------------------------------------
|      SimulatePrincipalPolicy      |
+------------------+----------------+
|  s3:GetObject    |  allowed       |
|  s3:PutObject    |  implicitDeny  |
|  s3:DeleteObject |  implicitDeny  |
|  s3:ListBucket   |  implicitDeny  |
+------------------+----------------+
```

This is **the fastest way to read a policy** — faster than reading the JSON. A habit worth
forming: once a policy is written, list 5–10 actions you *want* allowed and *want* denied,
run one command, and compare the whole column. Policies usually go wrong by *granting more
than intended*, which reading JSON does not reveal — only this table does.

`s3:ListBucket` returning `implicitDeny` here is **correct** — it needs the bucket ARN, not
an object ARN (exercise B3).

</details>

### D5. Permission boundary — an intersection you can prove

**Problem:** Alice is currently `allowed` for `s3:GetObject` on `public/*`. Attach a
permission boundary allowing only **DynamoDB**, then simulate the same action again.
Predict first.

<details>
<summary>Solution — the best exercise in this tier</summary>

```bash
aws iam put-user-permissions-boundary --user-name lab-alice \
  --permissions-boundary arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

Simulating again, real output across three consecutive steps:

```text
truoc khi gan boundary          -> allowed
sau khi gan boundary DynamoDB   -> implicitDeny
sau delete-user-permissions-boundary -> allowed
```

The identity policy allows S3, the boundary allows DynamoDB ⇒ **the intersection is
empty** ⇒ no permissions at all. And the boundary **grants** no DynamoDB either: alice
still cannot call DynamoDB, because the identity policy never allowed it.

:::danger A measured discrepancy — the boundary reads back empty

```bash
aws iam get-user --user-name lab-alice --query 'User.PermissionsBoundary'
```

```text
null
```

The boundary **takes effect** in simulation but **does not appear** when read back. On
real AWS this field returns
`{"PermissionsBoundaryType": "Policy", "PermissionsBoundaryArn": "..."}`.

⇒ On the emulator, do not use `get-user`/`get-role` to audit boundaries — it will report
"no boundary" when there is one. This is exactly the kind of discrepancy that produces a
wrong conclusion with no error message.

:::

</details>

### D6. Adding a resource-based policy to the simulation

**Problem:** Simulate `s3:GetObject` on `private/a.txt` **together with** a bucket policy,
using `--resource-policy`.

<details>
<summary>Solution</summary>

```bash
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::000000000000:user/lab-alice \
  --action-names s3:GetObject \
  --resource-arns 'arn:aws:s3:::lab-bucket/private/a.txt' \
  --resource-policy "$(cat /tmp/bucket-policy.json)" \
  --query 'EvaluationResults[].EvalDecision' --output text
```

```text
implicitDeny
```

`--resource-policy` is how you check rule 4 (identity policy **or** resource policy, same
account) without creating a real bucket. The `implicitDeny` above is correct, because the
bucket policy used in this exercise contains only a TLS-conditional `Deny` and no `Allow`.

Extension exercise: add an `Allow` statement for principal alice to the bucket policy and
run it again — the result must become `allowed` **even though alice's identity policy does
not allow** `private/*`. That is rule 4 showing up as data.

</details>

---

## Part E — Traps and measured limits (3 exercises)

### E1. The big trap: the simulator says deny, the API lets it through

**Problem:** Attach the inline `Deny s3:*` to alice. Simulating `s3:GetObject` already
gives `explicitDeny` (exercise D2). Now **call the real API** with alice's access key.
Predict before you run.

<details>
<summary>Solution — real output, and the reason tier 2 exists</summary>

```bash
(
  export AWS_ACCESS_KEY_ID=<AKIA-cua-alice>
  export AWS_SECRET_ACCESS_KEY=<secret-cua-alice>
  unset AWS_SESSION_TOKEN
  aws sts get-caller-identity
  aws s3 ls
  aws s3 mb s3://lab-should-fail
  aws iam create-user --user-name lab-should-be-denied
)
```

```text
--- sts get-caller-identity ---
{
    "UserId": "000000000000",
    "Account": "000000000000",
    "Arn": "arn:aws:iam::000000000000:user/lab-alice"
}
rc=0
--- s3 ls (phai bi Deny) ---
2026-10-07 16:38:22 thu-nghiem
rc=0
--- s3 mb (phai bi Deny) ---
make_bucket: lab-should-fail
rc=0
--- iam create-user (ReadOnly thi phai Deny) ---
{
    "User": {
        "UserName": "lab-should-be-denied",
        "Arn": "arn:aws:iam::000000000000:user/lab-should-be-denied",
        ...
rc=0
```

**All three calls succeeded, `rc=0`.** On real AWS all three must be `AccessDenied`.

And here is the most valuable part of this exercise: **the same policy, two opposite
answers, on the same emulator.**

| Route | Result | Correct? |
|---|---|---|
| `simulate-principal-policy` | `explicitDeny` | ✅ correct |
| A real API call | succeeds, `rc=0` | ❌ wrong |

⇒ The emulator **has** a policy evaluation engine but **does not wire it into the request
path**. A usable conclusion: at this tier, **trust the simulator, not the result of an API
call.** And because enforcement is the only thing that cannot be simulated, it is the only
thing you must take to [real AWS](bt-02-trung-binh.md).

</details>

### E2. Bucket policies are stored too, not enforced

**Problem:** Attach a bucket policy that denies all `s3:*` when
`aws:SecureTransport=false`, then call `s3 ls` over a **plain HTTP** endpoint. Predict.

<details>
<summary>Solution</summary>

```bash
aws s3 mb s3://lab-bucket
cat > /tmp/bucket-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyInsecureTransport",
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": ["arn:aws:s3:::lab-bucket", "arn:aws:s3:::lab-bucket/*"],
    "Condition": {"Bool": {"aws:SecureTransport": "false"}}
  }]
}
EOF
aws s3api put-bucket-policy --bucket lab-bucket --policy file:///tmp/bucket-policy.json
aws s3api get-bucket-policy --bucket lab-bucket --query Policy --output text
```

The policy **is stored verbatim**:

```text
{"Version":"2012-10-17","Statement":[{"Sid":"DenyInsecureTransport","Effect":"Deny",
"Principal":"*","Action":"s3:*","Resource":["arn:aws:s3:::lab-bucket",
"arn:aws:s3:::lab-bucket/*"],"Condition":{"Bool":{"aws:SecureTransport":"false"}}}]}
```

The lab endpoint is `http://` ⇒ `aws:SecureTransport` is `false` ⇒ it must be denied:

```bash
aws s3 ls s3://lab-bucket
```

```text i18n-prose
(rc=0, no error)
```

It goes through. Same nature as E1, except this time in a **resource-based policy**.

The real value of this exercise: this statement is a **mandatory pattern** for every
production bucket. You practise writing it correctly here for free, then verify that it
actually takes effect on real AWS in exercise
[I15 of the intermediate tier](bt-02-trung-binh.md).

</details>

### E3. Measure for yourself which commands the emulator supports

**Problem:** Do not trust the table below. Run each command yourself and classify it
✅ / ❌. Why is this exercise worth doing?

<details>
<summary>Solution — the real measurement, 2026-10-08</summary>

```bash
for c in "iam get-account-summary" \
         "iam list-open-id-connect-providers" \
         "iam simulate-custom-policy --policy-input-list {} --action-names s3:GetObject --resource-arns *" \
         "iam generate-credential-report" \
         "iam get-account-authorization-details" \
         "iam generate-service-last-accessed-details --arn <arn>"; do
  echo "--- $c"; aws $c >/dev/null 2>&1 && echo ok || echo FAIL
done
```

| Group | Command | Emulator |
|---|---|---|
| Identities | `create/list/get` user · group · role · access key · instance profile · tag | ✅ |
| Policies | `put/get/delete-user-policy` · `create-policy` · `create-policy-version` · `set-default-policy-version` · `list-entities-for-policy` | ✅ |
| Roles & STS | `create-role` · `update-assume-role-policy` · `assume-role` (+ `--duration-seconds`, + `--policy`) · `get-session-token` | ✅ |
| Resource policy | `put-bucket-policy` / `get-bucket-policy` | ✅ stored correctly |
| Account | `get-account-summary` · `update-account-password-policy` · `list-open-id-connect-providers` | ✅ |
| **Simulation** | **`simulate-principal-policy`** | ✅ **evaluates correctly** — Action/Resource scoping, policies via groups, explicit vs implicit deny, permission boundaries, `--resource-policy` |
| Boundary | `put-user-permissions-boundary` | ⚠️ takes effect in simulation · `get-user` reads back **null** |
| **Enforcement** | a real API call by a principal under a `Deny` | ❌ **still goes through** (exercises E1, E2) |
| Standalone simulation | `simulate-custom-policy` | ❌ `UnsupportedOperation` |
| Account audit | `generate-credential-report` | ❌ `UnsupportedOperation` |
| Account audit | `get-account-authorization-details` | ❌ `UnsupportedOperation` |
| Permission audit | `generate-service-last-accessed-details` | ❌ `UnsupportedOperation` |

Real output from one of the unsupported commands:

```text
aws: [ERROR]: An error occurred (UnsupportedOperation) when calling the
SimulateCustomPolicy operation: Operation SimulateCustomPolicy is not supported.
```

**Why this exercise is worth doing:** this table *is* the **boundary between tier 1 and
tier 2**, and it appears in no emulator documentation — the only way to get it is to probe
for yourself. I got this table wrong once: I concluded `simulate-principal-policy` was
unsupported **by inference** from `simulate-custom-policy` failing, without testing it. The
two commands are entirely different, and the more important one works. Inferring instead of
measuring is the fastest way to be wrong.

</details>

---

## Cleanup

Delete in dependency order — `delete-user` fails while the user still has keys, groups,
inline policies or a boundary:

```bash
U=lab-alice
aws iam delete-user-permissions-boundary --user-name $U
for p in $(aws iam list-user-policies --user-name $U --query 'PolicyNames[]' --output text); do
  aws iam delete-user-policy --user-name $U --policy-name "$p"
done
for k in $(aws iam list-access-keys --user-name $U \
           --query 'AccessKeyMetadata[].AccessKeyId' --output text); do
  aws iam delete-access-key --user-name $U --access-key-id "$k"
done
for g in $(aws iam list-groups-for-user --user-name $U \
           --query 'Groups[].GroupName' --output text); do
  aws iam remove-user-from-group --group-name "$g" --user-name $U
done
aws iam delete-user --user-name $U

aws iam delete-group --group-name lab-developers
aws iam remove-role-from-instance-profile \
  --instance-profile-name lab-ec2-profile --role-name lab-ec2-role
aws iam delete-instance-profile --instance-profile-name lab-ec2-profile
aws iam delete-role --role-name lab-ec2-role
aws iam delete-role --role-name lab-assume

# managed policy: delete the non-default versions first
P=arn:aws:iam::000000000000:policy/lab-read-public
for v in $(aws iam list-policy-versions --policy-arn $P \
           --query 'Versions[?!IsDefaultVersion].VersionId' --output text); do
  aws iam delete-policy-version --policy-arn $P --version-id "$v"
done
aws iam delete-policy --policy-arn $P

aws s3 rb s3://lab-bucket --force
```

Verify it is clean — all five must be empty:

```bash
aws iam list-users     --query 'Users[].UserName'       --output text
aws iam list-groups    --query 'Groups[].GroupName'     --output text
aws iam list-roles     --query 'Roles[].RoleName'       --output text
aws iam list-policies --scope Local --query 'Policies[].PolicyName' --output text
aws iam list-instance-profiles \
  --query 'InstanceProfiles[].InstanceProfileName' --output text
```

:::tip This deletion order is a lesson in itself

It reflects IAM's **dependency graph**. On real AWS, deleting a role without detaching its
policies, or deleting an instance profile before removing the role, returns
`DeleteConflict` — and in Terraform it becomes a `destroy` that hangs halfway. Remembering
this order saves you an afternoon.

:::

## Related Topics

- [IAM fundamentals](../reference/iam-fundamentals.md) — read this first if any term above is unfamiliar
- [Policy evaluation](../reference/iam-policy-evaluation.md) — the theory behind this tier
- [Exercises — Intermediate](bt-02-trung-binh.md) — next tier: real enforcement, cross-account, SCPs
- [Access management](../../foundations/reference/access-management.md) — the four IAM blocks at the base layer
- [IAM exercises](index.md) — all three tiers
