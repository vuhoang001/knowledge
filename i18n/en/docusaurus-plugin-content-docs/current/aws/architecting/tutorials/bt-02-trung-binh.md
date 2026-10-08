---
title: Bài tập — Trung bình (AWS thật)
i18n_status: untranslated
sidebar_position: 20
description: "20 bài có lời giải trên AWS thật — phần emulator không làm được: thực thi policy, cross-account, SCP, credential report, Access Advisor, PassRole. IAM miễn phí nên bậc này $0."
tags: [tutorial, aws, iam, saa-c03, policy-simulator, permission-boundary, pass-role, cross-account, scp, domain-1]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-08
---

# Bài tập — Trung bình (AWS thật)

> **Chốt:** Bậc [cơ bản](bt-01-co-ban.md) đã dạy được phần lớn logic — emulator mô phỏng
> policy đúng. Thứ nó **không** làm được chỉ còn bốn nhóm, và bốn nhóm đó là toàn bộ nội
> dung trang này: **thực thi** (`AccessDenied` thật), **nhiều account** (cross-account,
> SCP), **soát account** (credential report, Access Advisor), và **condition key cần ngữ
> cảnh thật** (MFA, TLS, region, IP).

Bậc trước: [Cơ bản](bt-01-co-ban.md) · Bậc sau: [Production](bt-03-production.md) ·
Lý thuyết: [Policy evaluation](../reference/iam-policy-evaluation.md)

:::info Lời giải ở trang này là **kỳ vọng**, không phải output đã chụp

Khác bậc cơ bản — nơi mọi output là thật, chạy trên emulator — bậc này cần một account AWS
thật nên lời giải ghi **kết quả kỳ vọng kèm lý do**, và mỗi bài có **ô dán output** của
bạn. Dán output thật vào rồi mới coi là xong bài; ô còn trống nghĩa là chưa học.

:::

## Trước khi bắt đầu — ba việc không bỏ qua

IAM miễn phí, nhưng account thật không có nút hoàn tiền.

1. **Billing alert $5** — CloudWatch alarm trên metric `EstimatedCharges`, **bắt buộc**
   region `us-east-1` (metric billing chỉ phát ở đó).
2. **MFA cho root** + một IAM user riêng để làm việc. Không dùng root.
3. Biết **lệnh xoá** của mọi thứ sắp tạo, trước khi tạo.

:::danger Dùng profile tường minh, nếu không bạn đang kiểm chứng trên emulator

Nếu profile mặc định của máy trỏ vào emulator (một lựa chọn an toàn hợp lý), thì mọi lệnh
ở đây phải ghi rõ profile:

```bash
aws --profile <profile-aws-that> iam list-users
```

Gõ `aws` trần ở đây sẽ gọi emulator và **luôn ra kết quả xanh** — tức bạn nghĩ mình đang
kiểm chứng enforcement trong khi đang kiểm chứng đúng cái thứ không có enforcement. Cùng
lớp lỗi với bài [E1](bt-01-co-ban.md#e1-bài-bẫy-lớn-mô-phỏng-nói-deny-api-vẫn-cho-qua),
chỉ khác là lần này do cấu hình máy chứ không do emulator.

:::

Dưới đây viết `aws` cho gọn; bạn tự thêm `--profile`.

## Chi phí của cả trang

| Thứ | Phí |
|---|---|
| IAM API, user, group, role, policy, boundary | **$0** |
| `simulate-principal-policy`, `simulate-custom-policy`, Policy Simulator (console) | **$0** |
| `generate-credential-report`, Access Advisor, `get-account-authorization-details` | **$0** |
| AWS Organizations + SCP | **$0** (cần ≥2 account; tạo account thêm cũng $0) |
| CloudTrail — trail quản lý event **đầu tiên** mỗi account | **$0** · trail thứ hai và **data event** có phí |
| S3 bucket rỗng dùng làm đích cho policy | ~$0 ở mức lab |

Chỉ hai dòng cần canh: **data event** của CloudTrail, và bất cứ EC2/Lambda nào bài tập yêu
cầu tạo (bài I18) — xoá ngay sau khi xong.

---

## Phần A — Thực thi: `AccessDenied` thật (5 bài)

### I1. Làm lại bài bẫy, lần này trên AWS thật

**Đề:** Tạo user chỉ có inline `Deny s3:*`, lấy access key, gọi `s3 ls`. So kết quả với
[E1 bậc cơ bản](bt-01-co-ban.md#e1-bài-bẫy-lớn-mô-phỏng-nói-deny-api-vẫn-cho-qua).

<details>
<summary>Lời giải</summary>

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

Kỳ vọng:

```text
An error occurred (AccessDenied) when calling the ListBuckets operation:
Access Denied
```

Ô dán output của bạn:

```text
(chưa chạy — dán vào đây)
```

| Đường | Emulator | AWS thật |
|---|---|---|
| `simulate-principal-policy` | `explicitDeny` ✅ | `explicitDeny` ✅ |
| Gọi API thật | thành công ❌ | `AccessDenied` ✅ |

Một dòng duy nhất khác nhau trong cả bảng — và đó là lý do trang này tồn tại. Mọi thứ
khác bạn đã học xong miễn phí ở bậc trước.

</details>

### I2. Explicit deny thắng cả `AdministratorAccess`

**Đề:** User có `AdministratorAccess` **và** một inline `Deny s3:DeleteObject`. Thử xoá
một object.

<details>
<summary>Lời giải</summary>

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

Kỳ vọng: `AccessDenied`, dù user là admin đầy đủ.

```text
(chưa chạy — dán vào đây)
```

Mẫu này **được dùng thật** để tạo "admin nhưng không được xoá dữ liệu": cấp
`AdministratorAccess` rồi `Deny` một nhóm hành động phá hoại (`s3:DeleteBucket`,
`rds:DeleteDBInstance`, `cloudtrail:StopLogging`). Đơn giản hơn nhiều so với liệt kê mọi
`Allow` cần thiết, và chặt ở đúng chỗ quan trọng.

</details>

### I3. `implicitDeny` ⇄ `explicitDeny` trong thông báo lỗi

**Đề:** Hai user — một thiếu quyền, một bị `Deny` tường minh — cùng gọi `s3 ls`. Thông báo
lỗi có phân biệt được không?

<details>
<summary>Lời giải</summary>

Kỳ vọng: **không**. Cả hai đều ra `AccessDenied`, cùng câu chữ. API không nói cho bạn biết
đó là *thiếu allow* hay *bị deny*.

```text
(chưa chạy — dán cả hai output vào đây để tự thấy chúng giống nhau)
```

⇒ Đây là lý do `simulate-principal-policy` không phải tiện nghi mà là **công cụ chẩn đoán
chính**: nó là nguồn duy nhất phân biệt được hai ca này, và hai ca đó sửa theo hai cách
ngược nhau (thêm `Allow` ⇄ bỏ `Deny`).

Trên AWS thật còn một đường nữa: một số service trả về **encoded authorization failure
message**, giải mã bằng

```bash
aws sts decode-authorization-message --encoded-message <chuoi>
```

Lệnh này cho biết **statement nào** đã từ chối. Không phải service nào cũng trả chuỗi đó,
nhưng khi có thì nó tiết kiệm hàng giờ.

</details>

### I4. Permission boundary chặn thật

**Đề:** User có `AdministratorAccess`, boundary chỉ `AmazonS3FullAccess`. Thử
`ec2 describe-instances` và `s3 ls`.

<details>
<summary>Lời giải</summary>

```bash
aws iam put-user-permissions-boundary --user-name lab-bound \
  --permissions-boundary arn:aws:iam::aws:policy/AmazonS3FullAccess
```

| Lệnh | Kỳ vọng | Vì sao |
|---|---|---|
| `aws s3 ls` | ✅ thành công | admin ∩ boundary(S3) = S3 |
| `aws ec2 describe-instances` | ❌ `AccessDenied` | boundary không cho EC2 |

```text
(chưa chạy — dán cả hai vào đây)
```

Và kiểm luôn chỗ emulator sai (bài
[D5](bt-01-co-ban.md#d5-permission-boundary--phép-giao-chứng-minh-được)):

```bash
aws iam get-user --user-name lab-bound --query 'User.PermissionsBoundary'
```

Kỳ vọng trên AWS thật:

```text
{
    "PermissionsBoundaryType": "Policy",
    "PermissionsBoundaryArn": "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}
```

Emulator trả `null` ở đây. Dán output thật vào để có đối chứng.

</details>

### I5. Giao của hai tập rời nhau

**Đề:** Boundary `AmazonS3FullAccess`, identity policy **chỉ** `AmazonDynamoDBFullAccess`.
Dự đoán cả hai lệnh trước khi chạy.

<details>
<summary>Lời giải</summary>

| Lệnh | Dự đoán của nhiều người | Đúng |
|---|---|---|
| `aws s3 ls` | ✅ (vì boundary cho S3) | ❌ `AccessDenied` |
| `aws dynamodb list-tables` | ✅ (vì policy cho DynamoDB) | ❌ `AccessDenied` |

**Cả hai đều chặn.** Boundary cho S3 nhưng identity policy chưa bao giờ cấp S3 — và
boundary **không cấp**. Identity policy cho DynamoDB nhưng boundary không cho qua. Giao
của hai tập rời nhau là tập rỗng.

```text
(chưa chạy — dán cả hai vào đây)
```

Bạn đã chứng minh bài này **miễn phí** ở
[D5 bậc cơ bản](bt-01-co-ban.md#d5-permission-boundary--phép-giao-chứng-minh-được) bằng
simulator. Làm lại ở đây chỉ để thấy enforcement khớp với mô phỏng — và để có số liệu
riêng của account mình.

</details>

---

## Phần B — Mô phỏng nâng cao (4 bài)

### I6. `simulate-custom-policy` — thứ emulator không có

**Đề:** Mô phỏng một policy **chưa gắn cho ai**. Vì sao lệnh này đáng giá hơn
`simulate-principal-policy` trong CI?

<details>
<summary>Lời giải</summary>

```bash
aws iam simulate-custom-policy \
  --policy-input-list "$(cat /tmp/p-read-public.json)" \
  --action-names s3:GetObject s3:PutObject \
  --resource-arns arn:aws:s3:::lab-bucket/private/a.txt \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output table
```

Kỳ vọng: `s3:GetObject → implicitDeny` (policy chỉ cho `public/*`),
`s3:PutObject → implicitDeny`.

```text
(chưa chạy — dán vào đây)
```

Khác biệt quyết định:

| Lệnh | Cần policy đã gắn | Dùng ở đâu |
|---|---|---|
| `simulate-principal-policy` | ✅ có | chẩn đoán sự cố: *"vì sao user này bị chặn"* |
| `simulate-custom-policy` | ❌ không | **CI/CD**: kiểm policy trong pull request **trước khi** nó được apply |

`simulate-custom-policy` là lệnh biến "review policy bằng mắt" thành một **test tự động**.
Mẫu dùng: với mỗi policy trong repo, giữ một danh sách action *phải cho* và *phải chặn*,
chạy lệnh này trong CI, so với kỳ vọng. Policy mở rộng hơn dự định sẽ làm CI đỏ — điều mà
đọc JSON bằng mắt không bắt được.

</details>

### I7. Condition key cần ngữ cảnh: `--context-entries`

**Đề:** Policy cho `s3:DeleteObject` chỉ khi có MFA. Mô phỏng hai lần: có MFA và không.

<details>
<summary>Lời giải</summary>

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

Kỳ vọng: `MFA=true → allowed` · `MFA=false → implicitDeny`.

```text
(chưa chạy — dán cả hai vào đây)
```

`--context-entries` là cách **duy nhất** kiểm condition key mà không phải dựng ngữ cảnh
thật (không cần bật MFA, không cần gọi từ IP đó, không cần VPC endpoint đó). Ba key hay
cần mô phỏng nhất: `aws:MultiFactorAuthPresent`, `aws:SourceIp`, `aws:SecureTransport`.

Trên emulator lệnh này trả `UnsupportedOperation` — xem
[bảng đo](bt-01-co-ban.md#e3-tự-đo-xem-emulator-đỡ-được-lệnh-nào).

</details>

### I8. `MissingContextValues` — cái bẫy im lặng

**Đề:** Chạy lại I7 nhưng **không** truyền `--context-entries`. Đọc trường
`MissingContextValues`.

<details>
<summary>Lời giải</summary>

Kỳ vọng:

```text
{
    "EvalDecision": "implicitDeny",
    "MissingContextValues": ["aws:MultiFactorAuthPresent"]
}
```

```text
(chưa chạy — dán vào đây)
```

`MissingContextValues` không rỗng nghĩa là **kết quả mô phỏng không đáng tin** — simulator
đang thiếu thông tin để đánh giá điều kiện, và nó mặc định coi như không khớp. Nhiều người
đọc `implicitDeny` rồi đi sửa policy, trong khi policy không sai — chỉ thiếu context.

Thói quen nên có: luôn `--query` cả `MissingContextValues`, không chỉ `EvalDecision`.

</details>

### I9. Policy Simulator trên console

**Đề:** Làm lại I6 bằng giao diện https://policysim.aws.amazon.com/. Giao diện cho thêm gì
so với CLI?

<details>
<summary>Lời giải</summary>

Console cho ba thứ CLI không có:

1. **Chỉ ra statement nào đã khớp**, highlight ngay trên JSON — nhanh hơn đọc
   `MatchedStatements`.
2. **Sửa policy ngay trong simulator** rồi chạy lại, không cần apply vào account. Vòng lặp
   thử–sai nhanh hơn CLI.
3. Gợi ý **condition key còn thiếu** cho action đang chọn.

Nhưng CLI thắng ở một chỗ quyết định: **chạy được trong CI** (bài I6). Dùng console để
*viết* policy, dùng CLI để *canh* policy.

:::warning Simulator không thấy SCP

`simulate-*` và Policy Simulator đánh giá identity policy, resource policy, boundary. Chúng
**không** áp SCP của Organizations. ⇒ `allowed` ở simulator vẫn có thể là `AccessDenied`
thật khi account nằm dưới một SCP siết. Bài I17 chứng minh bằng tay.

:::

</details>

---

## Phần C — Nhiều account (4 bài)

### I10. Cross-account: phải sửa hai chỗ

**Đề:** Account **B** có bucket. Cho một role ở account **A** đọc được bucket đó. Liệt kê
đúng những chỗ phải sửa.

<details>
<summary>Lời giải</summary>

**Hai** chỗ, thiếu một là không chạy — đây là luật 4 với khác account.

Ở **B** (chủ tài nguyên), bucket policy:

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

Ở **A** (bên gọi), identity policy của role `lab-reader`:

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

```text
(chưa chạy — dán output `aws s3 ls s3://bucket-cua-B` từ role của A vào đây)
```

Bài tập chẩn đoán kèm theo: **xoá** identity policy ở A, thử lại → `AccessDenied`. Khôi
phục, rồi **xoá** bucket policy ở B, thử lại → cũng `AccessDenied`. Hai lần lỗi giống nhau,
hai nguyên nhân ở hai account khác nhau. Đó là lý do sự cố cross-account tốn thời gian:
người ở A không đọc được policy của B.

⚠️ Với S3 còn một chỗ thứ ba hay bị quên: **Block Public Access** và **bucket owner
enforced** có thể chặn trước khi policy được xét.

</details>

### I11. Role chaining giữa hai account

**Đề:** User ở A assume role ở B rồi dùng credential đó gọi API của B.

<details>
<summary>Lời giải</summary>

Trust policy của role ở **B**:

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

Identity policy ở **A**:

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

```text
(chưa chạy — dán Credentials vào đây)
```

**`sts:ExternalId` là gì và khi nào bắt buộc:** khi bạn là bên **thứ ba** (SaaS, công ty
tư vấn) được nhiều khách hàng trao role. Không có `ExternalId` thì khách hàng X có thể
khiến bạn dùng role của khách hàng Y. Đây là confused deputy ở dạng cross-account — AWS
yêu cầu mọi SaaS dùng nó.

⚠️ **Role chaining** (dùng role tạm để assume role khác) giới hạn **1 giờ**, và
`--duration-seconds` lớn hơn sẽ bị bỏ qua chứ không báo lỗi.

</details>

### I12. Mở cho cả tổ chức bằng một dòng

**Đề:** Bucket cần cho **mọi** account trong Organizations đọc, không muốn liệt kê từng
account ID. Viết điều kiện.

<details>
<summary>Lời giải</summary>

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

```text
(chưa chạy — dán kết quả thử từ 1 account trong org và 1 account ngoài org)
```

`aws:PrincipalOrgID` thay cả danh sách account ID, và **tự cập nhật** khi tổ chức thêm
account. Không có nó thì mỗi lần mở account mới phải sửa mọi bucket policy — đúng kiểu
việc sẽ bị quên.

🔴 **`Principal: "*"` + điều kiện org là mẫu đúng, nhưng viết thiếu điều kiện là mở
bucket cho toàn Internet.** Đây là nguyên nhân phổ biến nhất của sự cố "S3 bucket công
khai". Luôn viết `Condition` **cùng lúc** với `Principal: "*"`, không để lần sau.

</details>

### I13. SCP — trần mà admin cũng không vượt

**Đề:** Trong Organizations, gắn SCP chặn mọi region ngoài `ap-southeast-1` và
`us-east-1` cho một member account. Rồi dùng **admin** của account đó tạo EC2 ở
`eu-west-1`.

<details>
<summary>Lời giải</summary>

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

Kỳ vọng: admin của member account **không** tạo được EC2 ở `eu-west-1`, nhận `AccessDenied`
hoặc `UnauthorizedOperation`.

```text
(chưa chạy — dán vào đây)
```

Ba chi tiết quyết định:

- **`NotAction` chứa các service global.** IAM, STS, Organizations, CloudFront, Route 53
  là global nhưng endpoint của chúng nằm ở `us-east-1`; chặn hết region thì **tự khoá mình
  ra khỏi IAM** của account đó. Danh sách loại trừ này không phải tuỳ chọn.
- SCP **không áp lên management account** — test phải làm ở member account, nếu không bạn
  sẽ kết luận SCP không hoạt động.
- Simulator **không thấy SCP** (bài I9). `allowed` ở simulator mà thực tế đỏ ⇒ nghi SCP
  trước tiên.

</details>

---

## Phần D — Soát account (3 bài)

### I14. Credential report

**Đề:** Lấy báo cáo credential của cả account, tìm mọi khoá chưa rotate quá 90 ngày và mọi
user chưa bật MFA.

<details>
<summary>Lời giải</summary>

```bash
aws iam generate-credential-report
aws iam get-credential-report --query Content --output text | base64 -d > /tmp/cred.csv
column -s, -t /tmp/cred.csv | less -S
```

Năm cột đáng đọc: `user`, `mfa_active`, `password_last_used`,
`access_key_1_last_rotated`, `access_key_1_last_used_date`.

```bash
# user chua bat MFA (bo dong root va header)
awk -F, 'NR>1 && $4=="false" {print $1}' /tmp/cred.csv
```

```text
(chưa chạy — dán vào đây)
```

Hai kết luận thường rút ra ngay lần chạy đầu: có khoá **chưa dùng lần nào** (xoá được
luôn), và có khoá **dùng gần đây nhưng rotate từ rất lâu** (rủi ro cao nhất, xử lý trước).

Lệnh này **không có** trên emulator.

</details>

### I15. Access Advisor — quyền nào chưa dùng bao giờ

**Đề:** Với một role, liệt kê service nó **chưa gọi lần nào**.

<details>
<summary>Lời giải</summary>

```bash
JOB=$(aws iam generate-service-last-accessed-details \
        --arn arn:aws:iam::<account>:role/<role> \
        --query JobId --output text)
aws iam get-service-last-accessed-details --job-id "$JOB" \
  --query 'ServicesLastAccessed[?TotalAuthenticatedEntities==`0`].ServiceNamespace' \
  --output text
```

```text
(chưa chạy — dán vào đây)
```

Danh sách trả về là **ứng viên để cắt** — chưa phải quyết định cắt.

:::warning Access Advisor chỉ thấy quá khứ

Nó báo quyền **đã dùng**, không phải quyền **cần**. Action chỉ chạy theo quý, hoặc chỉ chạy
khi có sự cố, sẽ không xuất hiện và bị cắt oan — rồi hỏng đúng lúc tệ nhất. Cửa sổ quan
sát nên là **90 ngày** trở lên, và trước khi cắt phải hỏi chủ service xem có đường chạy
theo lịch thưa.

:::

Đổi `==` thành `>` trong `--query` để xem chiều ngược lại: service nào **đang** dùng, dùng
lần cuối lúc nào. Đó là input của bài
[P3 bậc production](bt-03-production.md).

</details>

### I16. Toàn bộ IAM của account trong một lệnh

**Đề:** Xuất mọi user, group, role, policy kèm nội dung — để diff giữa hai thời điểm.

<details>
<summary>Lời giải</summary>

```bash
aws iam get-account-authorization-details > /tmp/iam-$(date +%F).json
jq '.Policies | length, (.[0] | keys)' /tmp/iam-*.json
```

```text
(chưa chạy — dán vào đây)
```

Đây là **snapshot toàn bộ IAM** của account trong một file. Hai cách dùng:

- **Diff theo thời gian:** lưu hàng tuần, `diff` hai file → thấy mọi thay đổi quyền, kể cả
  thay đổi không ai báo.
- **Audit offline:** grep tìm mọi policy có `"Action": "*"` hoặc `"Resource": "*"`, hoặc
  mọi policy chứa `iam:PassRole`.

```bash
jq -r '.Policies[] | select(.PolicyVersionList[]?.Document.Statement[]?
       | select(.Action=="*" or .Resource=="*")) | .PolicyName' /tmp/iam-*.json
```

Lệnh này **không có** trên emulator.

</details>

---

## Phần E — Bẫy policy (4 bài)

### I17. `iam:PassRole`

**Đề:** User có `lambda:CreateFunction` nhưng **không** có `iam:PassRole`. Thử tạo Lambda
với một role.

<details>
<summary>Lời giải</summary>

Kỳ vọng:

```text
An error occurred (AccessDeniedException) when calling the CreateFunction operation:
User: arn:aws:iam::...:user/lab-nopass is not authorized to perform: iam:PassRole
on resource: arn:aws:iam::...:role/lambda-exec
```

```text
(chưa chạy — dán vào đây)
```

Hai quyền cho **một** hành động: `lambda:CreateFunction` **và** `iam:PassRole` cho đúng
role đó.

🔴 **Và đây là phần quan trọng hơn:** thêm `iam:PassRole` với `Resource: "*"` rồi thử lại
— lần này user tạo được Lambda mang **bất kỳ** role, kể cả role admin, rồi chạy code trong
đó. Tức là **`iam:PassRole` rộng tương đương quyền admin**.

Cách cấp đúng — khoá theo role cụ thể, và khoá luôn service được nhận:

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

`iam:PassedToService` chặn việc dùng cùng role cho service khác.

</details>

### I18. Bẫy `ForAllValues` trên tập rỗng

**Đề:** Policy *trông như* bắt buộc gắn tag khi `RunInstances`. Gọi **không kèm tag**. Dự
đoán.

<details>
<summary>Lời giải</summary>

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

Kỳ vọng: request **được cho qua** — vì "mọi tag đều nằm trong danh sách" là **đúng** với
tập rỗng.

Sửa bằng một dòng:

```json
"Condition": {
  "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]},
  "Null": {"aws:TagKeys": "false"}
}
```

| Lần | Policy | Request không tag | Kỳ vọng |
|---|---|---|---|
| 1 | chỉ `ForAllValues` | `RunInstances` | PASS — ngoài ý muốn |
| 2 | thêm `Null: false` | `RunInstances` | FAIL — đúng ý muốn |

```text
(chưa chạy — dán cả hai lần vào đây)
```

Dùng `simulate-custom-policy` (bài I6) để chạy bài này thì **không phải tạo instance nào**
— không tốn tiền, và nhanh hơn.

`Null: {"aws:TagKeys": "false"}` đọc là *"key này phải tồn tại trong request"*. Thiếu nó là
lỗi thật, hay gặp trong code review, và **không có lệnh nào báo đỏ**.

</details>

### I19. `ForAnyValue` ⇄ `ForAllValues`

**Đề:** Cùng danh sách `["Project","Owner"]`, request gửi tag `Project` và `Secret`. Hai
toán tử cho kết quả gì?

<details>
<summary>Lời giải</summary>

| Toán tử | Đúng khi | Với `{Project, Secret}` |
|---|---|---|
| `ForAnyValue:` | **ít nhất một** giá trị khớp | ✅ khớp (`Project` có trong list) |
| `ForAllValues:` | **mọi** giá trị đều khớp | ❌ không khớp (`Secret` ngoài list) |

```text
(chưa chạy — dán hai kết quả simulate vào đây)
```

⇒ Muốn nói *"chỉ được dùng đúng những tag này"* thì là **`ForAllValues`** (+ `Null`).
Dùng `ForAnyValue` ở đó là cho phép kèm thêm tag tuỳ ý miễn có một tag hợp lệ — tức là
gần như không giới hạn gì.

Nhớ bằng câu: `ForAnyValue` **nới**, `ForAllValues` **siết**.

</details>

### I20. Confused deputy ở service role

**Đề:** Trust policy mở cho `glue.amazonaws.com` không điều kiện. Diễn đạt tấn công, rồi
sửa.

<details>
<summary>Lời giải</summary>

**Tấn công:** `glue.amazonaws.com` phục vụ **mọi** account AWS. Trust policy không điều
kiện nói *"bất cứ khi nào Glue gọi tới, cho vào role của tôi"* — nên kẻ tấn công tạo một
Glue job **trong account của họ**, cấu hình nó trỏ vào role của bạn, và Glue (bên được tin
tưởng — *deputy*) sẽ dùng role của bạn thay họ.

Sửa:

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

```text
(chưa chạy — dán trust policy thật của một service role trong account bạn, và nói nó
 có đủ hai key chưa)
```

Hai key này khoá lại *"chỉ khi lời gọi phát sinh từ tài nguyên của chính tôi"*. Đây là
**mẫu bắt buộc** cho mọi service role, không phải tuỳ chọn — và cùng một ý tưởng với
`sts:ExternalId` (bài I11) ở dạng cross-account, với `sub` của OIDC (bài
[P2](bt-03-production.md)) ở dạng federation.

Ba tên gọi, một lỗ hổng: **tin một trung gian mà không khoá nguồn gốc lời gọi.**

</details>

---

## Dọn dẹp

IAM không phát sinh phí, nhưng user và khoá còn sống **là rủi ro**, không phải chi phí:

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

Nếu bài nào đã tạo EC2, Lambda hay NAT Gateway thì theo checklist riêng — **những cái đó
có tiền thật**, khác IAM. Và nhớ gỡ SCP của bài I13 nếu không còn dùng: SCP sai để lại là
cách tự chặn chính mình về sau.

## Related Topics

- [Policy evaluation](../reference/iam-policy-evaluation.md) — mỗi bài ở trên chứng minh một luật trong đó
- [Bài tập — Cơ bản](bt-01-co-ban.md) — bậc trước; phần lớn logic đã học xong miễn phí ở đó
- [Bài tập — Production](bt-03-production.md) — bậc sau: quy trình, không còn cơ chế
- [Bài tập IAM](index.md) — ba bậc
