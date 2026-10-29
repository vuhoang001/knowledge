---
title: "Lab 5 — S3 bucket với versioning"
sidebar_position: 6
description: "variable cho tên bucket theo môi trường, output ARN, verify bằng AWS CLI — bài lab AWS đầu tiên, chạy qua LocalStack."
tags: [tutorial, terraform, aws, s3]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Lab 5 — S3 bucket với versioning

> **Chạy thật 2026-10-28** — Terraform 1.16.5, AWS provider 6.70.0, qua LocalStack
> (endpoint mặc định `http://localhost:4566`, đổi nếu bạn chạy ở host khác).

Yêu cầu: `terraform`, `aws` CLI, và LocalStack đang chạy (`docker run -p 4566:4566
localstack/localstack` nếu chưa có).

## Đề bài

Tạo một S3 bucket tên theo môi trường (`<env>-assets-demo`), bật **versioning**, và
`output` ra ARN của bucket. Áp dụng đúng [Variables, Outputs và Locals](../reference/variables-outputs-locals.md).

```bash
mkdir tf-lab1 && cd tf-lab1
cat > main.tf << 'EOF'
variable "localstack_endpoint" {
  type    = string
  default = "http://localhost:4566"
}

variable "env" {
  type        = string
  description = "Môi trường: dev, staging, prod"
  default     = "dev"
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3 = var.localstack_endpoint
  }
}

resource "aws_s3_bucket" "assets" {
  bucket = "${var.env}-assets-demo"
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

output "bucket_arn" {
  value = aws_s3_bucket.assets.arn
}
EOF
```

## Chạy

```bash
terraform init
terraform apply -auto-approve
```

```text
Plan: 2 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + bucket_arn = (known after apply)
aws_s3_bucket.assets: Creating...
aws_s3_bucket.assets: Creation complete after 0s [id=dev-assets-demo]
aws_s3_bucket_versioning.assets: Creating...
aws_s3_bucket_versioning.assets: Creation complete after 1s [id=dev-assets-demo]

Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

Outputs:

bucket_arn = "arn:aws:s3:::dev-assets-demo"
```

## Verify bằng AWS CLI — không chỉ tin `apply`

```bash
aws --endpoint-url http://localhost:4566 s3api get-bucket-versioning --bucket dev-assets-demo
```

```text
{
    "Status": "Enabled"
}
```

`apply` báo thành công không chứng minh config *đúng ý nghiệp vụ* — luôn kiểm lại bằng
một công cụ khác (ở đây AWS CLI) để chắc trạng thái thật khớp điều bạn định làm.

## Dọn dẹp

```bash
terraform destroy -auto-approve
```

## Tự kiểm

1. Đổi `var.env` thành `"staging"` rồi `apply` lại — chuyện gì xảy ra với bucket cũ
   (`dev-assets-demo`)? Nó có bị đổi tên không, hay bị tạo mới?
2. Thêm `-var="env=prod"` khi `apply` — bucket nào được dùng?

<details>
<summary>Đáp án</summary>

1. Vẫn đúng một địa chỉ state `aws_s3_bucket.assets`, nhưng `plan` báo
   `# aws_s3_bucket.assets must be replaced` với ký hiệu `-/+ destroy and then create
   replacement`, vì `bucket` là attribute **forces replacement** (không hỗ trợ rename
   tại chỗ trên S3 thật). Bucket cũ (`dev-assets-demo`) **bị `destroy` thật** trong cùng
   lần `apply` đó, rồi bucket mới (`staging-assets-demo`) được tạo — không phải chỉ
   "đổi tên", và không phải tạo thêm một bucket song song với bucket cũ còn sống.
2. `-var` trên CLI thắng `default` trong `variable` — dùng `prod-assets-demo`.

</details>

## Related Topics

- [Variables, Outputs và Locals](../reference/variables-outputs-locals.md) — lý thuyết cho `variable`/`output` ở bài này
- [State](../reference/state.md) — vì sao đổi tên bucket là destroy/create, không phải rename
- [Lab 6 — IAM role và policy](lab-06-iam-role-policy.md) — bài tiếp theo
