---
title: "Lab 9 — import một bucket đã tồn tại"
sidebar_position: 10
description: "Một bucket có sẵn tag thật, tạo ngoài Terraform — tự phát hiện tag đó bằng AWS CLI trước khi viết HCL, rồi import bằng khối import tới khi plan báo No changes."
tags: [tutorial, terraform, import, aws, s3]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Lab 9 — import một bucket đã tồn tại

> **Chạy thật 2026-10-28** — Terraform 1.16.5, AWS provider 6.70.0, qua LocalStack.

Bài này khác ví dụ ở [skill Import](../skills/import.md): ở đây bucket có sẵn một
**tag thật**, và nhiệm vụ của bạn là tự phát hiện ra nó **trước khi** viết HCL — không
phải chỉ import rồi mới phát hiện lệch như skill doc.

## Chuẩn bị — mô phỏng "ai đó đã tạo bucket này trước bạn"

```bash
aws --endpoint-url http://localhost:4566 s3 mb s3://lab5-reports-bucket
aws --endpoint-url http://localhost:4566 s3api put-bucket-tagging \
  --bucket lab5-reports-bucket \
  --tagging 'TagSet=[{Key=CostCenter,Value=analytics}]'
```

## Đề bài

Đưa `lab5-reports-bucket` vào quản lý của Terraform bằng khối `import`, sao cho sau
khi import, `terraform plan` báo **"No changes"** — nghĩa là HCL bạn viết khớp
**chính xác** thực tế, không thiếu, không dư.

**Gợi ý:** đừng viết HCL trước rồi mới import. Kiểm thực tế trước:

```bash
aws --endpoint-url http://localhost:4566 s3api get-bucket-tagging --bucket lab5-reports-bucket
```

```json
{
    "TagSet": [
        { "Key": "CostCenter", "Value": "analytics" }
    ]
}
```

## Thử lần 1 — cố tình viết thiếu tag, xem `plan` nói gì

```hcl
resource "aws_s3_bucket" "reports" {
  bucket = "lab5-reports-bucket"
}

import {
  to = aws_s3_bucket.reports
  id = "lab5-reports-bucket"
}
```

```bash
terraform init
terraform plan
```

```text
      ~ tags                        = {
          - "CostCenter" = "analytics" -> null
        }
      ~ tags_all                    = {
          - "CostCenter" = "analytics" -> null
        }
        ...

Plan: 1 to import, 0 to add, 1 to change, 0 to destroy.
```

`1 to change` — đúng cảnh báo: HCL thiếu tag thật đang tồn tại. `apply` ngay lúc này sẽ
**xoá tag** `CostCenter` khỏi bucket thật (để khớp HCL thiếu sót của bạn) — đây chính
là bài học đã nói ở skill Import: import không tự sinh HCL đúng, bạn phải tự khớp tay.

## Thử lần 2 — sửa đúng, verify ra "No changes"

```hcl
resource "aws_s3_bucket" "reports" {
  bucket = "lab5-reports-bucket"
  tags = {
    CostCenter = "analytics"
  }
}

import {
  to = aws_s3_bucket.reports
  id = "lab5-reports-bucket"
}
```

```bash
terraform apply -auto-approve
```

```text
Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.
aws_s3_bucket.reports: Importing... [id=lab5-reports-bucket]
aws_s3_bucket.reports: Import complete [id=lab5-reports-bucket]

Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed.
```

```bash
terraform plan
```

```text
No changes. Your infrastructure matches the configuration.
```

**"0 to change" ngay từ lần import đầu, và "No changes" ở lần `plan` sau đó** — đây là
tiêu chí "import đúng": không có diff nào xuất hiện ngay sau khi đưa resource vào state.

## Dọn dẹp

```bash
terraform destroy -auto-approve
```

## Tự kiểm

Giả sử bucket thật **còn có thêm** một cấu hình `versioning` đã bật sẵn (do ai đó bật
tay trước khi bạn import), nhưng bạn không kiểm tra trước và viết HCL chỉ có
`aws_s3_bucket` (không có `aws_s3_bucket_versioning`). `plan` sau import sẽ báo gì?

<details>
<summary>Đáp án</summary>

Thực ra: **không báo gì cả** về versioning — vì `aws_s3_bucket_versioning` là một
**resource riêng** (xem Lab 5), tách khỏi `aws_s3_bucket`. Không khai resource đó trong
HCL nghĩa là Terraform **không biết** tới sự tồn tại của cấu hình versioning đó —
`plan` sẽ "No changes" dù versioning thật đang bật, vì Terraform chỉ so sánh những gì
**có mặt trong config**, không tự phát hiện toàn bộ cấu hình thật của bucket. Đây là
lý do import một resource không đồng nghĩa với "quản lý toàn bộ cấu hình liên quan" —
phải tự biết và khai đủ từng resource con liên quan (versioning, lifecycle, policy...).

</details>

## Related Topics

- [Import tài nguyên đã tồn tại](../skills/import.md) — lý thuyết, ví dụ khác (tag sai thay vì tag thiếu)
- [Lab 5 — S3 với versioning](lab-05-s3-versioning.md) — `aws_s3_bucket_versioning` là resource riêng, nhắc tới ở phần Tự kiểm
- [State](../reference/state.md) — vì sao Terraform chỉ biết đúng những gì có trong config
