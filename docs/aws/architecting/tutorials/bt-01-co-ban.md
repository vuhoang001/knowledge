---
title: Bài tập — Cơ bản (emulator)
sidebar_position: 10
description: "Chín bài IAM trên emulator AWS local: user, group, role, policy, assume-role. Kèm bảng đo lệnh nào emulator đỡ được, và một bài bẫy cố tình cho sai."
tags: [tutorial, aws, iam, saa-c03, emulator, assume-role, domain-1]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-08
---

# Bài tập — Cơ bản (emulator)

> **Chốt:** Bậc này luyện **cú pháp và tên lệnh**, không luyện logic. Emulator nhận policy
> rồi bỏ qua khi xét request — nên mọi lệnh ở đây "xanh" đều **không** chứng minh được gì
> về quyền. Bài [I9](#i9--bài-bẫy-bắt-buộc-làm) tồn tại để bạn tự thấy điều đó.

Lý thuyết: [Policy evaluation](../reference/iam-policy-evaluation.md) ·
Bậc tiếp: [Trung bình](bt-02-trung-binh.md)

## Môi trường

Emulator AWS local (tương thích API AWS) chạy trong Docker, nghe cổng `4566`. Host và
đường dẫn cụ thể đã **lược bỏ** vì repo này public — thay bằng `<floci-host>`, bạn tự
điền host của mình.

```bash
export AWS_ENDPOINT_URL=http://<floci-host>:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

aws sts get-caller-identity        # smoke test
```

Smoke test phải ra account `000000000000` và arn `:root` — emulator luôn trả hai giá trị
này, **không** phản ánh principal đang dùng. Đây là chỗ lệch đầu tiên so với AWS thật.

## Chín bài

| # | Bài | Xong khi |
|---|---|---|
| I1 | Tạo user `dev-alice`, tạo access key cho user đó, list lại | `list-users` thấy alice · `list-access-keys` ra 1 khoá |
| I2 | Tạo group `developers`, add alice vào, attach managed `ReadOnlyAccess` cho group | `get-group` thấy alice · `list-attached-group-policies` ra 1 policy |
| I3 | Viết **inline policy** cho alice: chỉ `s3:GetObject` trên `arn:aws:s3:::lab-bucket/public/*` | `get-user-policy` trả đúng JSON vừa viết |
| I4 | Tạo **customer managed policy** cùng nội dung I3, attach cho group, detach inline của I3 | `list-policies --scope Local` thấy policy · `list-user-policies` rỗng |
| I5 | Tạo role `lab-ec2-role` trust cho `ec2.amazonaws.com`, attach policy I4 | `get-role` trả về `AssumeRolePolicyDocument` đúng |
| I6 | Tạo role `lab-assume-role` trust cho account `000000000000`, rồi `sts assume-role` | nhận đủ **ba** khoá tạm, có `SessionToken` |
| I7 | Dùng ba khoá tạm của I6 gọi `s3 ls` trong một subshell | lệnh chạy bằng credential tạm, không dùng khoá gốc |
| I8 | Viết policy có `Condition`: `aws:SecureTransport`, `aws:RequestedRegion`, `aws:MultiFactorAuthPresent` | `get-policy-version` trả đúng khối `Condition` |
| I9 | **Bài bẫy** — xem mục riêng bên dưới | bạn *dự đoán sai* kết quả |

### Mẫu cho I3

```bash
cat > /tmp/p-read-public.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ReadPublicPrefixOnly",
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::lab-bucket/public/*"
  }]
}
EOF

aws iam put-user-policy --user-name dev-alice \
  --policy-name read-public --policy-document file:///tmp/p-read-public.json
aws iam get-user-policy --user-name dev-alice --policy-name read-public
```

Ô dán output của bạn:

```text
(chưa chạy — dán output I3 vào đây)
```

### Mẫu cho I6

Trust policy ghi **account root** nên theo
[luật trust policy](../reference/iam-policy-evaluation.md#trust-policy--policy-duy-nhất-quyết-định-ai-được-vào),
principal còn cần `sts:AssumeRole` trong identity policy của mình — trên AWS thật. Emulator
bỏ qua điều kiện đó, và đó chính là chỗ lệch.

```bash
cat > /tmp/trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::000000000000:root"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role --role-name lab-assume-role \
  --assume-role-policy-document file:///tmp/trust.json

aws sts assume-role --role-arn arn:aws:iam::000000000000:role/lab-assume-role \
  --role-session-name lab-session --query Credentials
```

Output thật, chạy 08/10/2026 trên emulator (giá trị khoá đã rút gọn):

```text
{
    "AccessKeyId": "ASIABTHHD8P16WV0YQZY",
    "SecretAccessKey": "tUzvsT3bqf4o4vbf...",
    "SessionToken": "eDm7geChxuzKbbtt2rvQ2olhIJpYBwGv5bKob1CMnFjsXSbEJB1N58...",
    "Expiration": "2026-10-08T03:10:04.166710+00:00"
}
```

Ba giá trị + `Expiration`. Prefix `ASIA` (không phải `AKIA`) là dấu hiệu credential tạm —
nhận ra prefix này là đọc được log nhanh hơn người khác.

:::tip `--role-session-name` tối thiểu 2 ký tự

Đặt tên một ký tự thì CLI chặn ngay ở client, chưa gọi tới server:
`Invalid length for parameter RoleSessionName, value: 1, valid min length: 2`.
Lỗi này là của `aws-cli`, không phải của emulator.

:::

### I7 — dùng credential tạm cho đúng

Chạy trong **subshell** để ba biến không rò ra shell chính:

```bash
(
  creds=$(aws sts assume-role \
    --role-arn arn:aws:iam::000000000000:role/lab-assume-role \
    --role-session-name lab-session --query Credentials --output text)
  export AWS_ACCESS_KEY_ID=$(echo "$creds" | cut -f1)
  export AWS_SECRET_ACCESS_KEY=$(echo "$creds" | cut -f3)
  export AWS_SESSION_TOKEN=$(echo "$creds" | cut -f4)
  aws sts get-caller-identity
  aws s3 ls
)
```

Quên `AWS_SESSION_TOKEN` là lỗi phổ biến nhất khi dùng role bằng tay — AWS thật trả
`InvalidClientTokenId`, rất khó đoán ra nguyên nhân từ thông báo đó.

## I9 — bài bẫy, bắt buộc làm

Gắn cho alice **đúng một** policy `Deny s3:*`, rồi lấy khoá của alice gọi `s3 ls`.

```bash
cat > /tmp/p-deny-all-s3.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{"Effect": "Deny", "Action": "s3:*", "Resource": "*"}]
}
EOF
aws iam put-user-policy --user-name dev-alice \
  --policy-name deny-s3 --policy-document file:///tmp/p-deny-all-s3.json
# roi dung access key cua alice goi:
aws s3 ls
```

**Dự đoán trước khi chạy:** theo luật 2
([explicit deny thắng](../reference/iam-policy-evaluation.md#năm-luật-quyết-định-mọi-thứ)),
phải bị chặn.

**Thực tế trên emulator:** cho qua.

Kết quả đã đo tay 06/10/2026, cùng bản chất, trên user chỉ có `ReadOnlyAccess`:

```text
make_bucket: test-least-privilege
{
    "User": {
        "UserName": "should-be-denied",
        "Arn": "arn:aws:iam::000000000000:user/should-be-denied",
        ...
```

Cả `s3 mb` lẫn `iam create-user` **thành công** — trên AWS thật cả hai phải là
`AccessDenied`. Chi tiết ca này ở
[Access management · mục ví dụ](../../foundations/reference/access-management.md).

**Đây không phải bug của bài tập.** Emulator chấp nhận credential nhưng không chạy máy
đánh giá policy. Ghi lại cảm giác *"lab xanh mà thực ra sai"* — nó là cái bẫy đắt nhất
của việc học bằng mô phỏng, và là lý do [bậc Trung bình](bt-02-trung-binh.md) phải làm
trên AWS thật.

## Lệnh IAM nào emulator đỡ được

Probe thật 08/10/2026, không phỏng đoán. `aws-cli/2.x`, endpoint local:

| Lệnh | Emulator |
|---|---|
| `create-user` · `create-group` · `add-user-to-group` | ✅ |
| `attach-group-policy` (kể cả managed `arn:aws:iam::aws:policy/*`) | ✅ |
| `put-user-policy` / `get-user-policy` (inline) | ✅ trả lại đúng JSON |
| `create-policy` (customer managed) | ✅ |
| `create-access-key` | ✅ ra `AKIA...` |
| `create-role` + `sts assume-role` | ✅ ra `ASIA...` + `SessionToken` + `Expiration` |
| `put-user-permissions-boundary` | ⚠️ **nhận lệnh** — nhưng không thực thi khi xét request |
| `iam simulate-custom-policy` | ❌ `UnsupportedOperation` |
| `iam simulate-principal-policy` | ❌ `UnsupportedOperation` |
| `iam generate-credential-report` | ❌ `UnsupportedOperation` |
| `iam get-account-authorization-details` | ❌ `UnsupportedOperation` |

Output thật của một trong bốn lệnh không hỗ trợ:

```text
aws: [ERROR]: An error occurred (UnsupportedOperation) when calling the
SimulateCustomPolicy operation: Operation SimulateCustomPolicy is not supported.
```

**Đọc bảng này theo chiều ngược lại mới thấy điều đáng nói:** bốn lệnh emulator không đỡ
được đúng là bốn lệnh dùng để **kiểm chứng** quyền. Thứ nó làm tốt là tạo và đọc lại
object IAM; thứ nó không làm là trả lời *"policy này có đủ chặt không"*.

## Dọn dẹp

Xoá theo thứ tự phụ thuộc, nếu không `delete-user` sẽ báo user còn đính kèm:

```bash
aws iam delete-user-policy --user-name dev-alice --policy-name read-public
for k in $(aws iam list-access-keys --user-name dev-alice \
           --query 'AccessKeyMetadata[].AccessKeyId' --output text); do
  aws iam delete-access-key --user-name dev-alice --access-key-id "$k"
done
aws iam remove-user-from-group --group-name developers --user-name dev-alice
aws iam detach-group-policy --group-name developers \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
aws iam delete-group --group-name developers
aws iam delete-user  --user-name dev-alice
aws iam delete-role  --role-name lab-assume-role
```

Soát sạch:

```bash
aws iam list-users  --query 'Users[].UserName'   --output text
aws iam list-roles  --query 'Roles[].RoleName'   --output text
aws iam list-policies --scope Local --query 'Policies[].PolicyName' --output text
```

Cả ba rỗng là xong.

## Related Topics

- [Policy evaluation](../reference/iam-policy-evaluation.md) — lý thuyết của bậc này
- [Bài tập — Trung bình](bt-02-trung-binh.md) — bậc tiếp, chạy trên AWS thật
- [Access management](../../foundations/reference/access-management.md) — bốn khối IAM ở tầng nền
- [Bài tập IAM](index.md) — ba bậc
