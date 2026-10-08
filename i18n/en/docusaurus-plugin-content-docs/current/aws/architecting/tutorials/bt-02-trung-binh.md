---
title: Bài tập — Trung bình (AWS thật)
i18n_status: untranslated
sidebar_position: 20
description: "Mười một bài chứng minh máy đánh giá policy bằng AWS thật: Policy Simulator, explicit deny, permission boundary là phép giao, PassRole, bẫy ForAllValues. IAM miễn phí nên bậc này không tốn tiền."
tags: [tutorial, aws, iam, saa-c03, policy-simulator, permission-boundary, pass-role, cross-account, domain-1]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-08
---

# Bài tập — Trung bình (AWS thật)

> **Chốt:** Bậc này không mô phỏng được, nên làm trên AWS thật — và **IAM trên AWS thật
> miễn phí**: API, role, policy, Policy Simulator, Access Advisor, credential report đều
> $0. Mỗi bài dưới đây là một luật ở [Policy evaluation](../reference/iam-policy-evaluation.md)
> được tự chứng minh bằng tay, không phải đọc rồi tin.

Bậc trước: [Cơ bản](bt-01-co-ban.md) · Bậc sau: [Production](bt-03-production.md)

## Trước khi bắt đầu — ba việc không bỏ qua

IAM miễn phí, nhưng account thật thì không có nút hoàn tiền. Làm xong ba việc này mới gõ
lệnh đầu tiên:

1. **Billing alert $5** — CloudWatch alarm trên metric `EstimatedCharges`, bắt buộc ở
   region `us-east-1` (metric billing chỉ phát ở đó).
2. **MFA cho root** + một IAM user riêng để làm việc. Không dùng root.
3. Biết **lệnh xoá** của mọi thứ mình sắp tạo, trước khi tạo.

:::danger Dùng profile tường minh

Nếu máy bạn đã cấu hình profile mặc định trỏ vào emulator (một lựa chọn an toàn hợp lý),
thì **mọi lệnh ở bậc này phải ghi rõ profile**:

```bash
aws --profile <profile-aws-that> iam list-users
```

Gõ `aws` trần ở đây sẽ gọi vào emulator và **luôn cho kết quả xanh** — tức là bạn nghĩ
mình đang kiểm chứng trên AWS thật trong khi không. Đây là cùng một lớp lỗi với bài
[I9](bt-01-co-ban.md#i9--bài-bẫy-bắt-buộc-làm), chỉ khác là lần này do cấu hình máy.

:::

Dưới đây viết `aws` cho gọn; bạn tự thêm `--profile` của mình.

## Mười một bài

| # | Bài | Chứng minh luật nào | Xong khi |
|---|---|---|---|
| I10 | Làm lại I9 trên AWS thật: user chỉ có `Deny s3:*` → gọi `s3 ls` | Luật 2 | nhận `AccessDenied` **thật**, đối chiếu với kết quả emulator |
| I11 | **Policy Simulator** trên console: mô phỏng policy I4, thử `GetObject` trên `public/a.txt` rồi `private/a.txt` | Luật 1 | một allowed, một **implicitDeny** — không tạo tài nguyên nào |
| I12 | Mô phỏng bằng CLI: `simulate-custom-policy` và `simulate-principal-policy` | Luật 1, 2 | `EvalDecision` trả `allowed` / `implicitDeny` / `explicitDeny` |
| I13 | User có `AdministratorAccess` + thêm inline `Deny s3:DeleteObject` → thử xoá object | Luật 2 | thất bại **dù đang là admin** |
| I14 | Bucket policy allow, identity policy không nói gì → thử đọc (cùng account) | Luật 4 | đọc được — resource policy một mình là đủ |
| I15 | Thêm bucket policy `Deny` với `Condition aws:SecureTransport: false` → gọi qua HTTP | Luật 2 + condition | bị chặn khi không TLS |
| I16 | **Permission boundary:** user có `AdministratorAccess`, boundary chỉ allow `s3:*` → thử `ec2 describe-instances` | Luật 3 | bị chặn ⇒ tự chứng minh boundary là **phép giao** |
| I17 | Boundary allow `s3:*`, identity policy allow **chỉ** `dynamodb:*` → thử cả hai service | Luật 3 | **cả hai đều chặn** — giao của hai tập rời là rỗng |
| I18 | **`iam:PassRole`:** user không có `iam:PassRole` thử `lambda create-function --role <role-arn>` | PassRole | thất bại dù có `lambda:CreateFunction` |
| I19 | **Confused deputy:** trust policy cho một service, có rồi không có `aws:SourceAccount` + `aws:SourceArn` | Trust policy | diễn đạt được bằng lời tấn công mà hai key đó ngăn |
| I20 | **Bẫy toán tử:** policy dùng `ForAllValues:StringEquals` trên `aws:TagKeys`, gọi `RunInstances` **không gửi tag nào** | Bẫy tập rỗng | request **PASS** ⇒ thêm `Null` check rồi thử lại, lần này FAIL |

## Mẫu I12 — mô phỏng không tạo tài nguyên nào

Hai lệnh này là cách duy nhất kiểm chứng policy mà không phải dựng gì, và chúng
**không tồn tại trên emulator** (xem
[bảng đo](bt-01-co-ban.md#lệnh-iam-nào-emulator-đỡ-được)).

```bash
aws iam simulate-custom-policy \
  --policy-input-list "$(cat /tmp/p-read-public.json)" \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::lab-bucket/private/a.txt \
  --query 'EvaluationResults[].{action:EvalActionName,decision:EvalDecision}'
```

Ô dán output:

```text
(chưa chạy — dán output I12 vào đây; kỳ vọng decision = implicitDeny)
```

Rồi đổi `private/` thành `public/` và chạy lại — cùng policy, hai kết quả khác nhau. Đó
là toàn bộ ý nghĩa của trường `Resource`.

Phiên bản dùng cho principal có thật trong account:

```bash
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::<account-id>:user/dev-alice \
  --action-names s3:GetObject s3:DeleteObject \
  --resource-arns arn:aws:s3:::lab-bucket/public/a.txt
```

:::warning Simulator không thấy SCP và boundary

`simulate-*` đánh giá identity policy và resource policy. Nó **không** áp SCP của
Organizations, và tuỳ trường hợp không áp permission boundary. ⇒ *allowed* ở simulator
vẫn có thể là `AccessDenied` thật. Simulator dùng để bắt lỗi **trong** policy bạn viết,
không dùng để kết luận request sẽ qua.

:::

## Mẫu I17 — giao của hai tập rời nhau

Bài này một mình dạy xong luật 3, và là bài nhiều người đoán sai nhất.

```bash
# boundary: chi cho S3
aws iam put-user-permissions-boundary --user-name dev-bob \
  --permissions-boundary arn:aws:iam::aws:policy/AmazonS3FullAccess

# identity policy: chi cho DynamoDB
aws iam attach-user-policy --user-name dev-bob \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

Dự đoán trước khi chạy, rồi điền:

| Lệnh gọi bằng khoá của `dev-bob` | Dự đoán | Thực tế |
|---|---|---|
| `aws s3 ls` | | |
| `aws dynamodb list-tables` | | |

Đáp án đúng là **cả hai đều `AccessDenied`**: boundary chặn DynamoDB, còn S3 thì identity
policy chưa bao giờ cấp. Boundary **không cấp** quyền S3 — nó chỉ *cho phép nếu có*.

## Mẫu I20 — bẫy `ForAllValues`

Gắn policy này rồi gọi `RunInstances` **không kèm tag nào**:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ec2:RunInstances",
    "Resource": "*",
    "Condition": {
      "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]}
    }
  }]
}
```

Request **được cho qua**, vì "mọi tag đều nằm trong danh sách" là đúng với tập rỗng.
Thêm một dòng rồi thử lại:

```json
"Condition": {
  "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]},
  "Null": {"aws:TagKeys": "false"}
}
```

| Lần | Policy | Request không tag | Kết quả |
|---|---|---|---|
| 1 | chỉ `ForAllValues` | `RunInstances` | PASS — ngoài ý muốn |
| 2 | thêm `Null: false` | `RunInstances` | FAIL — đúng ý muốn |

Hai lần chạy này là bằng chứng gọn nhất cho cả nhóm toán tử nhiều giá trị. Dùng
`simulate-custom-policy` để thử thì không phải tạo instance nào.

## Hai lệnh soát miễn phí, nên biết từ bậc này

```bash
aws iam generate-credential-report          # roi:
aws iam get-credential-report --query Content --output text | base64 -d
```

CSV trả về có cột `password_last_used`, `access_key_1_last_rotated`,
`mfa_active` — đọc một lần là thấy ngay account đang nợ gì. Lệnh này **không chạy được
trên emulator**.

Và *last accessed information* (Access Advisor) — nền của bài
[P3 ở bậc production](bt-03-production.md):

```bash
aws iam generate-service-last-accessed-details --arn <arn-cua-role>
aws iam get-service-last-accessed-details --job-id <job-id>
```

## Dọn dẹp

IAM không phát sinh phí nên không gấp, nhưng user và khoá còn sống **là rủi ro**, không
phải chi phí:

```bash
aws iam delete-user-permissions-boundary --user-name dev-bob
aws iam detach-user-policy --user-name dev-bob \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
# xoa het access key truoc khi xoa user — xem lenh o bac Co ban
aws iam delete-user --user-name dev-bob
```

Nếu bài nào tạo thêm EC2, Lambda hay bucket thì theo checklist dọn dẹp riêng — **những
cái đó có tiền thật**, khác IAM.

## Related Topics

- [Policy evaluation](../reference/iam-policy-evaluation.md) — mỗi bài ở trên chứng minh một luật trong đó
- [Bài tập — Cơ bản](bt-01-co-ban.md) — bậc trước, cú pháp trên emulator
- [Bài tập — Production](bt-03-production.md) — bậc sau, mẫu dùng thật
- [Bài tập IAM](index.md) — ba bậc
