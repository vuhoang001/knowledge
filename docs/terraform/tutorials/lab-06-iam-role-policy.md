---
title: "Lab 6 — IAM role và policy"
sidebar_position: 7
description: "aws_iam_role với trust policy viết bằng jsonencode, aws_iam_policy giới hạn quyền tới đúng một bucket, gắn bằng aws_iam_role_policy_attachment — verify bằng AWS CLI."
tags: [tutorial, terraform, aws, iam]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Lab 6 — IAM role và policy

> **Chạy thật 2026-10-28** — Terraform 1.16.5, AWS provider 6.70.0, qua LocalStack.

## Đề bài

Một EC2 instance cần quyền đọc (không ghi) đúng một S3 bucket. Dựng: `aws_iam_role`
(cho EC2 assume), `aws_iam_policy` (chỉ `s3:GetObject`/`s3:ListBucket` trên đúng bucket
đó), gắn hai cái lại bằng `aws_iam_role_policy_attachment`.

```bash
mkdir tf-lab2 && cd tf-lab2
cat > main.tf << 'EOF'
variable "localstack_endpoint" {
  type    = string
  default = "http://localhost:4566"
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3  = var.localstack_endpoint
    iam = var.localstack_endpoint
  }
}

resource "aws_s3_bucket" "assets" {
  bucket = "lab2-assets-demo"
}

resource "aws_iam_role" "app" {
  name = "app-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "s3_read" {
  name = "app-s3-read-only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.assets.arn,
        "${aws_s3_bucket.assets.arn}/*",
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "app_s3_read" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.s3_read.arn
}
EOF
```

`jsonencode` chuyển một object HCL thành chuỗi JSON đúng cú pháp IAM policy cần — không
phải tự ghép chuỗi JSON bằng tay, tránh lỗi dấu phẩy/nháy kép.

## Chạy

```bash
terraform init
terraform apply -auto-approve
```

```text
Plan: 4 to add, 0 to change, 0 to destroy.
aws_iam_role.app: Creating...
aws_s3_bucket.assets: Creating...
aws_iam_role.app: Creation complete after 0s [id=app-ec2-role]
aws_s3_bucket.assets: Creation complete after 0s [id=lab2-assets-demo]
aws_iam_policy.s3_read: Creating...
aws_iam_policy.s3_read: Creation complete after 0s [id=arn:aws:iam::000000000000:policy/app-s3-read-only]
aws_iam_role_policy_attachment.app_s3_read: Creating...
aws_iam_role_policy_attachment.app_s3_read: Creation complete after 0s [id=app-ec2-role/arn:aws:iam::000000000000:policy/app-s3-read-only]

Apply complete! Resources: 4 added, 0 changed, 0 destroyed.
```

## Verify bằng AWS CLI

```bash
aws --endpoint-url http://localhost:4566 iam get-role --role-name app-ec2-role
```

```json
{
    "Role": {
        "RoleName": "app-ec2-role",
        "Arn": "arn:aws:iam::000000000000:role/app-ec2-role",
        "AssumeRolePolicyDocument": {
            "Statement": [
                {
                    "Action": "sts:AssumeRole",
                    "Effect": "Allow",
                    "Principal": { "Service": "ec2.amazonaws.com" }
                }
            ],
            "Version": "2012-10-17"
        }
    }
}
```

```bash
aws --endpoint-url http://localhost:4566 iam list-attached-role-policies --role-name app-ec2-role
```

```json
{
    "AttachedPolicies": [
        {
            "PolicyName": "app-s3-read-only",
            "PolicyArn": "arn:aws:iam::000000000000:policy/app-s3-read-only"
        }
    ]
}
```

Trust policy (`assume_role_policy`) và quyền thực tế (`s3_read`) là **hai thứ khác
nhau** — trust policy nói "ai được assume role này" (ở đây: service EC2), còn
`aws_iam_policy` + attachment nói "assume được role rồi thì làm được gì". Nhầm hai cái
này là lỗi IAM phổ biến nhất.

## Dọn dẹp

```bash
terraform destroy -auto-approve
```

## Tự kiểm

1. Nếu sửa `Resource` trong `aws_iam_policy.s3_read` thành `"*"` thay vì chỉ đúng
   bucket, có rủi ro gì?
2. `aws_iam_role_policy_attachment` bị xoá khỏi config (nhưng role và policy vẫn còn)
   — chuyện gì xảy ra với quyền hạn thật của role?

<details>
<summary>Đáp án</summary>

1. Role sẽ đọc được **mọi** bucket S3 trong account, không chỉ bucket định trước —
   vi phạm nguyên tắc least privilege. Luôn giới hạn `Resource` tới đúng ARN cần, không
   dùng `"*"` trừ khi thật sự cần quyền toàn cục.
2. `terraform apply` sẽ **gỡ** attachment đó (destroy đúng resource
   `aws_iam_role_policy_attachment`) — role vẫn tồn tại, policy vẫn tồn tại, nhưng role
   **không còn quyền** từ policy đó nữa. Đây là lý do 3 resource (role/policy/attachment)
   tách riêng: xoá quyền không cần xoá role hay policy.

</details>

## Related Topics

- [Variables, Outputs và Locals](../reference/variables-outputs-locals.md) — `jsonencode` là một function, dùng cùng cách với các expression đã học
- [Lab 5 — S3 với versioning](lab-05-s3-versioning.md)
- [Lab 7 — VPC, subnet và security group](lab-07-vpc-subnet-sg.md) — bài tiếp theo
