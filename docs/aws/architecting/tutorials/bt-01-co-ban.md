---
title: Bài tập — Cơ bản (emulator)
sidebar_position: 10
description: "26 bài IAM có lời giải trên emulator local: danh tính, policy, role, STS, và mô phỏng policy. Kèm bảng đo thứ emulator làm được và thứ nó không thực thi."
tags: [tutorial, aws, iam, saa-c03, emulator, assume-role, policy-simulator, domain-1]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-08
---

# Bài tập — Cơ bản (emulator)

> **Chốt:** Emulator **mô phỏng policy đúng** nhưng **không thực thi** policy. Hai câu đó
> nghe giống nhau mà hệ quả ngược nhau: `simulate-principal-policy` ở đây trả lời đúng cả
> explicit deny, Resource scoping và permission boundary — nên bậc này **học được logic**;
> còn gọi API thật thì một `Deny s3:*` vẫn cho `s3 ls` chạy, nên **không được tin kết quả
> gọi API**.

Lý thuyết: [Policy evaluation](../reference/iam-policy-evaluation.md) ·
Bậc tiếp: [Trung bình](bt-02-trung-binh.md)

## Cách dùng trang này

26 bài, chia năm phần. Mỗi bài có **Đề** rồi tới **Lời giải** gập lại — tự làm trước, mở
ra sau. Output trong lời giải là **output thật**, chạy 08/10/2026 trên emulator, khoá đã
rút gọn. Số `AccessKeyId`, `RoleId`, timestamp của bạn sẽ khác; **hình dạng** phải giống.

## Môi trường

Emulator AWS local (tương thích API AWS) trong Docker, nghe cổng `4566`. Host cụ thể đã
**lược bỏ** vì repo này public — thay bằng `<floci-host>`.

```bash
export AWS_ENDPOINT_URL=http://<floci-host>:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

aws sts get-caller-identity
```

<details>
<summary>Output mong đợi, và một chỗ lệch cần biết ngay</summary>

```text
{
    "UserId": "000000000000",
    "Account": "000000000000",
    "Arn": "arn:aws:iam::000000000000:root"
}
```

Với khoá `test/test`, emulator trả về `:root`. Nhưng khi bạn gọi bằng **access key của một
IAM user** thì nó **có** phản ánh user đó:

```text
{
    "UserId": "000000000000",
    "Account": "000000000000",
    "Arn": "arn:aws:iam::000000000000:user/lab-alice"
}
```

Chỗ lệch là `UserId`: AWS thật trả về ID riêng của principal (`AIDA…` cho user,
`AROA…` cho role), emulator trả về **account ID**. Đừng dựa vào `UserId` ở bậc này.

</details>

---

## Phần A — Danh tính (6 bài)

### A1. Tạo user và đọc lại

**Đề:** Tạo IAM user `lab-alice`. Ghi lại ARN và `UserId` của nó.

<details>
<summary>Lời giải</summary>

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

Hai chi tiết đáng nhớ: `UserId` bắt đầu bằng **`AIDA`** (user), và `Path` mặc định là `/`
— path dùng để nhóm danh tính theo tổ chức (`/engineering/`), và policy có thể khớp theo
path.

</details>

### A2. Access key, và vì sao chỉ thấy secret một lần

**Đề:** Tạo access key cho `lab-alice`, rồi list lại. Giải thích vì sao lần list không có
secret key.

<details>
<summary>Lời giải</summary>

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

`SecretAccessKey` **không có** trong `list-access-keys`, và không có API nào đọc lại được
— AWS chỉ trả nó đúng một lần, lúc tạo. Mất thì không khôi phục, chỉ tạo khoá mới và xoá
khoá cũ. Prefix `AKIA` = khoá dài hạn; `ASIA` = khoá tạm của session (bài C3).

</details>

### A3. Vô hiệu khoá trước khi xoá

**Đề:** Chuyển khoá của `lab-alice` sang `Inactive` rồi kiểm lại. Vì sao nên làm bước này
trước khi xoá khoá trong production?

<details>
<summary>Lời giải</summary>

```bash
aws iam update-access-key --user-name lab-alice \
  --access-key-id <AKIA...> --status Inactive
aws iam list-access-keys --user-name lab-alice \
  --query 'AccessKeyMetadata[].[AccessKeyId,Status]' --output text
```

`Inactive` **có thể bật lại**, xoá thì không. Quy trình rotate an toàn là: tạo khoá mới →
cập nhật mọi nơi đang dùng → đặt khoá cũ `Inactive` → **đợi** → nếu không có gì hỏng thì
mới xoá. Đặt `Inactive` là một cú rollback, xoá thì không có đường về.

</details>

### A4. Group, và chỗ quyền thật sự nằm

**Đề:** Tạo group `lab-developers`, cho `lab-alice` vào, attach `ReadOnlyAccess` cho
group. Rồi hỏi *"alice có policy gì"* bằng `list-attached-user-policies`. Dự đoán kết quả
trước khi chạy.

<details>
<summary>Lời giải — và đây là bài bẫy nhỏ đầu tiên</summary>

```bash
aws iam create-group --group-name lab-developers
aws iam add-user-to-group --group-name lab-developers --user-name lab-alice
aws iam attach-group-policy --group-name lab-developers \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

aws iam list-attached-user-policies --user-name lab-alice --output text
```

```text
(khong in ra dong nao)
```

**Rỗng** — và đó là câu trả lời đúng, không phải lỗi. Alice không có policy nào gắn trực
tiếp; quyền nằm ở group.

```bash
aws iam list-groups-for-user --user-name lab-alice --query 'Groups[].GroupName' --output text
aws iam list-attached-group-policies --group-name lab-developers --output text
```

```text
lab-developers
ATTACHEDPOLICIES	arn:aws:iam::aws:policy/ReadOnlyAccess	ReadOnlyAccess
```

⇒ Kiểm quyền thực tế của một user phải đi qua **ba** chỗ: policy gắn trực tiếp, policy qua
group, policy inline. Một chỗ rỗng không nói được gì. Cách nhanh hơn cả ba: dùng
`simulate-principal-policy` (phần D).

</details>

### A5. Tag cho danh tính

**Đề:** Gắn tag `Team=data` cho `lab-alice` rồi đọc lại. Tag này dùng để làm gì trong
policy?

<details>
<summary>Lời giải</summary>

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

Tag trên principal đọc được trong policy bằng condition key **`aws:PrincipalTag/Team`**.
Ghép với `aws:ResourceTag/Team` thì được **tag-based access control**: một policy duy nhất
phục vụ N team, mỗi team chỉ thấy tài nguyên cùng tag. Bài
[P8 ở bậc production](bt-03-production.md) làm đầy đủ mẫu đó.

</details>

### A6. Quota của account

**Đề:** Account này cho tối đa bao nhiêu user, bao nhiêu access key mỗi user, bao nhiêu
version mỗi managed policy? Tìm bằng một lệnh.

<details>
<summary>Lời giải</summary>

```bash
aws iam get-account-summary
```

Trích phần đáng nhớ từ output thật:

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

Ba số hay bị hỏi: **2 access key** mỗi user (đủ để rotate, không đủ để lười),
**5 version** mỗi managed policy (bài B5 chạm trần này), **6144 byte** mỗi managed policy
— policy quá dài là lỗi thật, và là lý do phải tách policy thay vì nhồi một cái khổng lồ.

</details>

---

## Phần B — Policy (6 bài)

### B1. Inline policy đầu tiên

**Đề:** Gắn inline policy cho `lab-alice`: chỉ `s3:GetObject`, chỉ trên
`arn:aws:s3:::lab-bucket/public/*`. Đọc lại để xác nhận.

<details>
<summary>Lời giải</summary>

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

Bốn trường bắt buộc nhớ: `Version` **luôn** là `"2012-10-17"` (không phải ngày hôm nay —
đây là phiên bản *ngôn ngữ policy*, bỏ đi thì một số tính năng condition không hoạt động),
`Effect`, `Action`, `Resource`. `Sid` là nhãn tuỳ chọn nhưng nên có: nó xuất hiện trong
`MatchedStatements` của simulator, giúp biết **statement nào** đã khớp.

</details>

### B2. Phân biệt ba loại policy

**Đề:** Tạo **customer managed policy** cùng nội dung B1, attach cho group, rồi xoá inline
của B1. Nêu khác biệt giữa AWS managed / customer managed / inline.

<details>
<summary>Lời giải</summary>

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

| Loại | ARN | Dùng lại được | Có version |
|---|---|---|---|
| AWS managed | `arn:aws:iam::aws:policy/…` | ✅ mọi account | AWS quản |
| Customer managed | `arn:aws:iam::<account>:policy/…` | ✅ trong account | ✅ tối đa 5 |
| Inline | không có ARN riêng | ❌ chết cùng danh tính | ❌ |

`PolicyId` bắt đầu bằng **`ANPA`**. Chuỗi prefix đáng học thuộc vì đọc log nhanh hơn:
`AIDA` user · `AGPA` group · `AROA` role · `ANPA` policy · `AIPA` instance profile ·
`AKIA` khoá dài hạn · `ASIA` khoá tạm.

</details>

### B3. Mở rộng policy cho đúng — `ListBucket` ở ARN khác

**Đề:** Policy B1 chỉ cho `GetObject`. Giờ cần `aws s3 ls s3://lab-bucket/public/` chạy
được. Sửa policy. **Bẫy:** `s3:ListBucket` không nhận ARN object.

<details>
<summary>Lời giải</summary>

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

Hai ARN, **không** phải một. `s3:ListBucket` là hành động **trên bucket** nên ARN của nó
là `arn:aws:s3:::lab-bucket` (không có `/*`); `s3:GetObject` là hành động **trên object**
nên cần `/public/*`. Viết `ListBucket` với ARN object là lỗi im lặng kinh điển: policy
hợp lệ, lưu được, nhưng `ls` vẫn `AccessDenied`.

Muốn chặt hơn nữa thì giới hạn `ListBucket` theo prefix bằng condition
`s3:prefix` — nhưng đó là phần của [bậc trung bình](bt-02-trung-binh.md).

</details>

### B4. Version của managed policy

**Đề:** Tạo version mới cho `lab-read-public` (nội dung B3), đặt làm default, rồi list
version. Version cũ còn không?

<details>
<summary>Lời giải</summary>

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

Version cũ **vẫn còn**, chỉ không phải default. Đó là cơ chế rollback của IAM:

```bash
aws iam set-default-policy-version \
  --policy-arn arn:aws:iam::000000000000:policy/lab-read-public --version-id v1
```

⚠️ Trần là **5 version** (bài A6). Đụng trần thì `create-policy-version` lỗi, phải
`delete-policy-version` bớt — và đây là lỗi hay gặp ở pipeline tự động cập nhật policy.

</details>

### B5. Ai đang dùng policy này?

**Đề:** Trước khi xoá một managed policy, làm sao biết nó còn đang gắn vào đâu?

<details>
<summary>Lời giải</summary>

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

Ba danh sách rỗng ⇒ xoá được. Còn phần tử nào thì `delete-policy` sẽ lỗi — IAM **không**
cho xoá policy đang được gắn, phải detach hết trước. Trường `AttachmentCount` trong
`get-policy` cho cùng thông tin dưới dạng một con số.

</details>

### B6. Viết policy có `Condition`

**Đề:** Viết một policy đơn chứa ba condition hay gặp nhất: bắt TLS, khoá region, bắt MFA.

<details>
<summary>Lời giải</summary>

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

Ba chỗ dễ sai:

- Giá trị boolean viết trong **ngoặc kép**: `"false"`, không phải `false`.
- Hai statement đầu dùng `Deny` + điều kiện **phủ định** (`SecureTransport: false`,
  `StringNotEquals`). Viết thành `Allow` + điều kiện xác định là **không tương đương**:
  `Allow` không chặn được ai, vì luật mặc định đã là deny.
- `aws:MultiFactorAuthPresent` **không có** trong request của một số service gọi gián tiếp
  — lúc đó điều kiện không khớp và `Allow` không áp. Cần chắc thì thêm
  `"Null": {"aws:MultiFactorAuthPresent": "false"}`.

</details>

---

## Phần C — Role và STS (5 bài)

### C1. Role cho service, và instance profile

**Đề:** Tạo role `lab-ec2-role` mà EC2 assume được, rồi tạo instance profile và cho role
vào. Vì sao EC2 cần thêm instance profile mà Lambda thì không?

<details>
<summary>Lời giải</summary>

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

**Instance profile là cái vỏ bọc role để gắn được vào một EC2 instance** — EC2 không nhận
role trực tiếp. Lambda, ECS task, CodeBuild thì nhận role thẳng, không cần vỏ này. Console
tạo instance profile ngầm nên nhiều người không biết nó tồn tại, rồi dựng bằng
CLI/Terraform là gặp lỗi *"Invalid IAM Instance Profile name"* dù role có thật.

Một instance profile chứa **tối đa một** role.

</details>

### C2. Trust policy cho account, và `AssumeRole`

**Đề:** Tạo role `lab-assume` mà chính account này assume được, rồi assume nó.

<details>
<summary>Lời giải</summary>

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

**Ba** giá trị + hạn dùng. `:root` trong trust policy **không** nghĩa là root user — nó
nghĩa *"account này"*, và khi viết vậy thì principal còn phải có `sts:AssumeRole` trong
identity policy của mình (trên AWS thật). Ghi đích danh
`arn:aws:iam::<account>:user/lab-alice` thì không cần điều kiện thứ hai.

:::tip `--role-session-name` tối thiểu 2 ký tự

Một ký tự thì `aws-cli` chặn ngay ở client:
`Invalid length for parameter RoleSessionName, value: 1, valid min length: 2`.
Tên session đi vào CloudTrail nên production hãy đặt có nghĩa (`deploy-ci-1234`), đó là
thứ duy nhất phân biệt ai đang dùng cùng một role.

:::

</details>

### C3. Dùng credential tạm cho đúng

**Đề:** Lấy credential từ C2 rồi gọi `sts get-caller-identity` **bằng** credential đó,
trong một subshell để không rò biến ra ngoài.

<details>
<summary>Lời giải</summary>

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

Thứ tự field của `--output text` là `AccessKeyId · Expiration · SecretAccessKey ·
SessionToken` — tức cột 1, **3**, 4, không phải 1, 2, 3. Đây là lỗi hay gặp khi viết
script bằng tay; dùng `--query 'Credentials.AccessKeyId'` riêng từng cái thì an toàn hơn.

Thiếu `AWS_SESSION_TOKEN` thì AWS thật trả `InvalidClientTokenId` — thông báo không hề
gợi ý rằng bạn quên biến thứ ba.

</details>

### C4. Giới hạn thời gian và session policy

**Đề:** Assume role với hạn **15 phút**, và một lần nữa với **session policy** chỉ cho
`s3:ListAllMyBuckets`. Session policy làm gì?

<details>
<summary>Lời giải</summary>

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

Gọi lúc `02:53` → hết hạn `03:08`, đúng 15 phút.

```bash
cat > /tmp/sess.json <<'EOF'
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":"s3:ListAllMyBuckets","Resource":"*"}]}
EOF

aws sts assume-role --role-arn arn:aws:iam::000000000000:role/lab-assume \
  --role-session-name sess2 --policy file:///tmp/sess.json \
  --query 'Credentials.AccessKeyId'
```

Session policy là **phép giao thứ ba** (sau SCP và boundary): quyền của session =
quyền của role **∩** session policy. Nó **không cấp** gì — truyền session policy cho
`s3:*` mà role không có S3 thì session vẫn không có S3.

Dùng thật khi nào: trao credential tạm cho bên thứ ba, hoặc một dịch vụ của bạn phát
credential cho từng tenant — mỗi tenant một session policy hẹp hơn role chung.
`--duration-seconds` trần theo `MaxSessionDuration` của role (mặc định 3600).

</details>

### C5. Sửa trust policy của role đang chạy

**Đề:** Đổi trust policy của `lab-assume` từ account sang service `ec2.amazonaws.com`, rồi
đọc lại. Lệnh này khác `put-role-policy` ở đâu?

<details>
<summary>Lời giải</summary>

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

Hai policy khác nhau hoàn toàn, dễ lẫn vì cùng gắn trên role:

| Lệnh | Sửa gì | Trả lời câu |
|---|---|---|
| `update-assume-role-policy` | **trust policy** | *ai được vào role này* |
| `put-role-policy` / `attach-role-policy` | **permission policy** | *role này làm được gì* |

`update-assume-role-policy` **ghi đè toàn bộ**, không merge. Xoá mất principal đang dùng
là tự khoá chính mình ra ngoài role — nên production luôn đọc policy hiện tại, sửa, rồi
ghi lại cả khối. Và `iam:UpdateAssumeRolePolicy` là **quyền leo thang**: ai có nó trên một
role admin thì tự thêm mình vào trust policy là xong.

</details>

---

## Phần D — Mô phỏng: nơi học logic (6 bài)

🔴 **Phần quan trọng nhất của bậc này.** `simulate-principal-policy` **chạy được** trên
emulator và **đánh giá đúng** — đã kiểm 08/10/2026. Nên toàn bộ logic ở
[Policy evaluation](../reference/iam-policy-evaluation.md) học được ngay đây, miễn phí.

Lệnh dùng xuyên suốt phần này:

```bash
sim() {
  aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::000000000000:user/lab-alice \
    --action-names "$1" --resource-arns "$2" \
    --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
}
```

### D1. Ba kết quả có thể xảy ra

**Đề:** Alice đang có `ReadOnlyAccess` qua group. Mô phỏng ba action và giải thích ba kết
quả khác nhau: `ec2:DescribeInstances`, `iam:CreateUser`, và `s3:GetObject` khi alice còn
một inline `Deny s3:*`.

<details>
<summary>Lời giải</summary>

```text
--- ec2:DescribeInstances  *                              -> allowed
--- iam:CreateUser         *                              -> implicitDeny
--- s3:GetObject           arn:aws:s3:::lab-bucket/pub... -> explicitDeny
```

| Kết quả | Nghĩa | Sửa bằng cách |
|---|---|---|
| `allowed` | có `Allow` khớp, không `Deny` nào khớp | — |
| `implicitDeny` | **không** `Allow` nào khớp | thêm `Allow` |
| `explicitDeny` | có `Deny` khớp | **phải bỏ `Deny`** — thêm `Allow` vô dụng |

Ba giá trị này là toàn bộ nội dung của luật 1 và luật 2. Phân biệt được
`implicitDeny` ⇄ `explicitDeny` là phân biệt được *"thiếu quyền"* ⇄ *"bị cấm"* — hai sự cố
nhìn giống nhau trong log mà cách sửa ngược nhau.

Lưu ý `ec2:DescribeInstances` ra `allowed` cũng chứng minh simulator **giải quyết cả
policy qua group**, không chỉ policy gắn trực tiếp.

</details>

### D2. Explicit deny thắng — chứng minh bằng hai lần chạy

**Đề:** Chứng minh luật 2 bằng cách chạy cùng một mô phỏng hai lần, chỉ khác việc có inline
`Deny s3:*` hay không.

<details>
<summary>Lời giải — output thật, hai lần chạy</summary>

Lần 1, alice có cả `ReadOnlyAccess` (cho `s3:GetObject`) **và** inline `Deny s3:*`:

```text
s3:GetObject    arn:aws:s3:::lab-bucket/public/a.txt    explicitDeny
s3:DeleteObject arn:aws:s3:::lab-bucket/public/a.txt    explicitDeny
```

Bỏ đúng một policy:

```bash
aws iam delete-user-policy --user-name lab-alice --policy-name lab-deny-s3
```

Lần 2, cùng lệnh mô phỏng:

```text
s3:GetObject    arn:aws:s3:::lab-bucket/public/a.txt    allowed
```

`ReadOnlyAccess` **không đổi** suốt hai lần. Thứ duy nhất đổi là một `Deny`. Đó là bằng
chứng cho câu *"thêm `Allow` không mở được thứ đang bị `Deny` tường minh"* — và nó chạy
miễn phí trong 2 giây.

</details>

### D3. Trường `Resource` thật sự làm gì

**Đề:** Để alice **chỉ** còn inline `Allow s3:GetObject` trên `lab-bucket/public/*`
(detach `ReadOnlyAccess` khỏi group). Rồi mô phỏng `public/a.txt` và `private/a.txt`.

<details>
<summary>Lời giải</summary>

```bash
aws iam detach-group-policy --group-name lab-developers \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
```

```text
s3:GetObject  arn:aws:s3:::lab-bucket/public/a.txt   allowed
s3:GetObject  arn:aws:s3:::lab-bucket/private/a.txt  implicitDeny
```

Cùng một policy, cùng một action, **hai kết quả** — khác nhau duy nhất ở ARN tài nguyên.
Đó là toàn bộ ý nghĩa của `Resource`.

:::warning Vì sao phải detach `ReadOnlyAccess` trước

Nếu không detach, cả hai đều ra `allowed` — vì `ReadOnlyAccess` cho `s3:GetObject` trên
`*`, nó **phủ** mất giới hạn prefix của inline policy. Đây là bài học thứ hai, quan trọng
hơn bài học thứ nhất: **một managed policy rộng gắn song song làm vô nghĩa mọi policy hẹp
bạn viết công phu.** Least privilege hỏng không phải vì bạn viết policy sai, mà vì còn một
`ReadOnlyAccess` treo ở group mà bạn quên.

:::

</details>

### D4. Nhiều action một lần

**Đề:** Với trạng thái D3, mô phỏng bốn action cùng lúc trên `public/a.txt` và đọc bảng.

<details>
<summary>Lời giải</summary>

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

Đây là **cách đọc một policy nhanh nhất** — nhanh hơn đọc JSON. Thói quen nên có: viết
policy xong, liệt kê 5–10 action mà bạn *muốn* cho và *không* muốn cho, chạy một lệnh, đối
chiếu cả cột. Policy sai thường sai ở chỗ *cho nhiều hơn dự định*, mà đọc JSON thì không
thấy — chỉ bảng này thấy.

`s3:ListBucket` ra `implicitDeny` ở đây là **đúng** — nó cần ARN bucket, không phải ARN
object (bài B3).

</details>

### D5. Permission boundary — phép giao, chứng minh được

**Đề:** Alice đang `allowed` cho `s3:GetObject` trên `public/*`. Gắn permission boundary
chỉ cho **DynamoDB**, rồi mô phỏng lại cùng action. Dự đoán trước.

<details>
<summary>Lời giải — bài hay nhất của bậc này</summary>

```bash
aws iam put-user-permissions-boundary --user-name lab-alice \
  --permissions-boundary arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

Mô phỏng lại, output thật ba bước liên tiếp:

```text
truoc khi gan boundary          -> allowed
sau khi gan boundary DynamoDB   -> implicitDeny
sau delete-user-permissions-boundary -> allowed
```

Identity policy cho S3, boundary cho DynamoDB ⇒ **giao bằng rỗng** ⇒ không quyền nào. Và
boundary **không cấp** DynamoDB: alice vẫn không gọi được DynamoDB, vì identity policy
chưa bao giờ cho.

:::danger Chỗ lệch đã đo — boundary đọc lại ra rỗng

```bash
aws iam get-user --user-name lab-alice --query 'User.PermissionsBoundary'
```

```text
null
```

Boundary **có hiệu lực** trong mô phỏng nhưng **không hiện ra** khi đọc lại. Trên AWS thật
trường này trả về `{"PermissionsBoundaryType": "Policy", "PermissionsBoundaryArn": "..."}`.

⇒ Trên emulator, đừng dùng `get-user`/`get-role` để kiểm kê boundary — nó sẽ báo "không có
boundary nào" trong khi có. Đây đúng là loại lệch tạo ra kết luận sai mà không báo lỗi.

:::

</details>

### D6. Thêm resource-based policy vào mô phỏng

**Đề:** Mô phỏng `s3:GetObject` trên `private/a.txt` **kèm** bucket policy, bằng
`--resource-policy`.

<details>
<summary>Lời giải</summary>

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

`--resource-policy` là cách kiểm luật 4 (identity policy **hoặc** resource policy, cùng
account) mà không phải tạo bucket thật. Kết quả `implicitDeny` ở trên là đúng vì bucket
policy dùng trong bài chỉ có `Deny` theo điều kiện TLS, không có `Allow` nào.

Bài tập mở rộng: thêm một statement `Allow` cho principal alice vào bucket policy rồi chạy
lại — kết quả phải thành `allowed` **dù identity policy của alice không cho** `private/*`.
Đó là luật 4 hiện ra bằng số.

</details>

---

## Phần E — Bẫy và giới hạn đã đo (3 bài)

### E1. Bài bẫy lớn: mô phỏng nói deny, API vẫn cho qua

**Đề:** Gắn cho alice inline `Deny s3:*`. Mô phỏng `s3:GetObject` → đã biết là
`explicitDeny` (bài D2). Giờ **gọi API thật** bằng access key của alice. Dự đoán trước khi
chạy.

<details>
<summary>Lời giải — output thật, và đây là lý do bậc 2 tồn tại</summary>

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

**Cả ba lệnh thành công, `rc=0`.** Trên AWS thật cả ba phải là `AccessDenied`.

Và chỗ đáng giá nhất của bài này: **cùng một policy, hai câu trả lời ngược nhau trên cùng
một emulator.**

| Đường | Kết quả | Đúng không |
|---|---|---|
| `simulate-principal-policy` | `explicitDeny` | ✅ đúng |
| Gọi API thật | thành công, `rc=0` | ❌ sai |

⇒ Emulator **có** máy đánh giá policy, nhưng **không mắc nó vào đường xử lý request**.
Kết luận dùng được: ở bậc này, **tin simulator, không tin kết quả gọi API.** Và vì enforcement
là thứ duy nhất không mô phỏng được, nó là thứ duy nhất phải mang sang
[AWS thật](bt-02-trung-binh.md).

</details>

### E2. Bucket policy cũng chỉ được lưu, không được thực thi

**Đề:** Gắn bucket policy `Deny` mọi `s3:*` khi `aws:SecureTransport=false`, rồi gọi
`s3 ls` qua endpoint **HTTP thuần**. Dự đoán.

<details>
<summary>Lời giải</summary>

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

Policy **lưu đúng nguyên văn**:

```text
{"Version":"2012-10-17","Statement":[{"Sid":"DenyInsecureTransport","Effect":"Deny",
"Principal":"*","Action":"s3:*","Resource":["arn:aws:s3:::lab-bucket",
"arn:aws:s3:::lab-bucket/*"],"Condition":{"Bool":{"aws:SecureTransport":"false"}}}]}
```

Endpoint của lab là `http://` ⇒ `aws:SecureTransport` là `false` ⇒ phải bị `Deny`:

```bash
aws s3 ls s3://lab-bucket
```

```text
(rc=0, khong loi)
```

Cho qua. Cùng bản chất với E1, chỉ khác là lần này ở **resource-based policy**.

Giá trị thật của bài: statement này là **mẫu bắt buộc** cho mọi bucket production. Bạn
luyện viết nó đúng ở đây miễn phí, rồi kiểm chứng hiệu lực trên AWS thật ở bài
[I15 bậc trung bình](bt-02-trung-binh.md).

</details>

### E3. Tự đo xem emulator đỡ được lệnh nào

**Đề:** Đừng tin bảng dưới. Tự chạy từng lệnh và phân loại ✅ / ❌. Vì sao bài này đáng làm?

<details>
<summary>Lời giải — bảng đo thật 08/10/2026</summary>

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

| Nhóm | Lệnh | Emulator |
|---|---|---|
| Danh tính | `create/list/get` user · group · role · access key · instance profile · tag | ✅ |
| Policy | `put/get/delete-user-policy` · `create-policy` · `create-policy-version` · `set-default-policy-version` · `list-entities-for-policy` | ✅ |
| Role & STS | `create-role` · `update-assume-role-policy` · `assume-role` (+ `--duration-seconds`, + `--policy`) · `get-session-token` | ✅ |
| Resource policy | `put-bucket-policy` / `get-bucket-policy` | ✅ lưu đúng |
| Account | `get-account-summary` · `update-account-password-policy` · `list-open-id-connect-providers` | ✅ |
| **Mô phỏng** | **`simulate-principal-policy`** | ✅ **đánh giá đúng** — Action/Resource scoping, policy qua group, explicit ⇄ implicit deny, permission boundary, `--resource-policy` |
| Boundary | `put-user-permissions-boundary` | ⚠️ có hiệu lực trong mô phỏng · `get-user` đọc lại ra **null** |
| **Thực thi** | gọi API thật với principal bị `Deny` | ❌ **vẫn cho qua** (bài E1, E2) |
| Mô phỏng rời | `simulate-custom-policy` | ❌ `UnsupportedOperation` |
| Soát account | `generate-credential-report` | ❌ `UnsupportedOperation` |
| Soát account | `get-account-authorization-details` | ❌ `UnsupportedOperation` |
| Soát quyền | `generate-service-last-accessed-details` | ❌ `UnsupportedOperation` |

Output thật của một lệnh không hỗ trợ:

```text
aws: [ERROR]: An error occurred (UnsupportedOperation) when calling the
SimulateCustomPolicy operation: Operation SimulateCustomPolicy is not supported.
```

**Vì sao bài này đáng làm:** bảng này chính là **ranh giới giữa bậc 1 và bậc 2**, và nó
không nằm trong tài liệu nào của emulator — chỉ có cách tự probe. Tôi từng viết bảng này
sai: kết luận `simulate-principal-policy` không hỗ trợ **vì suy ra** từ việc
`simulate-custom-policy` lỗi, mà không chạy thử. Thực tế hai lệnh khác nhau hoàn toàn, và
cái quan trọng hơn thì chạy được. Suy ra thay vì đo là cách nhanh nhất để sai.

</details>

---

## Dọn dẹp

Xoá theo thứ tự phụ thuộc — `delete-user` lỗi nếu user còn khoá, còn group, còn inline
policy, còn boundary:

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

# managed policy: phai xoa version khong-default truoc
P=arn:aws:iam::000000000000:policy/lab-read-public
for v in $(aws iam list-policy-versions --policy-arn $P \
           --query 'Versions[?!IsDefaultVersion].VersionId' --output text); do
  aws iam delete-policy-version --policy-arn $P --version-id "$v"
done
aws iam delete-policy --policy-arn $P

aws s3 rb s3://lab-bucket --force
```

Soát sạch — cả năm phải rỗng:

```bash
aws iam list-users     --query 'Users[].UserName'       --output text
aws iam list-groups    --query 'Groups[].GroupName'     --output text
aws iam list-roles     --query 'Roles[].RoleName'       --output text
aws iam list-policies --scope Local --query 'Policies[].PolicyName' --output text
aws iam list-instance-profiles \
  --query 'InstanceProfiles[].InstanceProfileName' --output text
```

:::tip Thứ tự xoá này cũng là một bài học

Nó phản ánh **đồ thị phụ thuộc** của IAM. Trên AWS thật, xoá role mà quên detach policy,
hoặc xoá instance profile trước khi remove role, cho ra lỗi `DeleteConflict` — và trong
Terraform thì thành `destroy` treo giữa đường. Nhớ thứ tự này tiết kiệm được một buổi.

:::

## Related Topics

- [Policy evaluation](../reference/iam-policy-evaluation.md) — lý thuyết của bậc này
- [Bài tập — Trung bình](bt-02-trung-binh.md) — bậc tiếp: thực thi thật, cross-account, SCP
- [Access management](../../foundations/reference/access-management.md) — bốn khối IAM ở tầng nền
- [Bài tập IAM](index.md) — ba bậc
