---
title: Backend và state locking
sidebar_position: 3
description: "Backend block không đọc được var.* — phải hard-code hoặc dùng -backend-config. Lock bằng DynamoDB table chặn apply thứ hai bằng lỗi rõ ràng; lock kiểu S3-native (use_lockfile) không chặn được trên LocalStack."
tags: [backend, state, locking, dynamodb, s3, terraform]
domain: devops
category: tool
doc_type: skill
status: review
difficulty: advanced
verified_at:
updated: 2026-10-28
---

# Backend và state locking

> **Chốt:** Chuyển state cục bộ sang backend từ xa (S3...) để nhiều người/CI cùng apply
> an toàn. Nhưng `terraform { backend "s3" { ... } }` là một khối **đặc biệt** — nó
> **không đọc được `var.*`**, vì backend phải xác định *trước khi* Terraform biết giá
> trị biến nào cả. Và lock không tự động "chắc chắn hoạt động" — dưới đây có bằng chứng
> thật một kiểu lock chặn đúng, một kiểu không chặn được trên môi trường test.

## Mục tiêu

Dựng một backend S3 + lock thật (qua LocalStack, miễn phí, an toàn), thấy `init` thật,
thấy state không còn nằm trên máy, và thấy **bằng chứng thật** việc hai `apply` cùng
lúc bị chặn — hoặc không bị chặn, tuỳ cơ chế lock. Giả định đã đọc
[State](../reference/state.md) (trade-off local vs remote state đã nói sơ ở đó).

## Ví dụ — bootstrap backend, rồi chạy đua hai `apply`

Chạy thật 2026-10-28, Terraform 1.16.5, AWS provider 6.70.0, qua LocalStack.

### Bước 1 — tạo S3 bucket + DynamoDB table làm backend (bằng Terraform thường, chưa dùng backend)

```hcl
resource "aws_s3_bucket" "tfstate" {
  bucket = "tf-state-demo"
}

resource "aws_dynamodb_table" "tflock" {
  name         = "tf-lock-demo"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

```bash
terraform apply -auto-approve
```

```text
Plan: 2 to add, 0 to change, 0 to destroy.
aws_s3_bucket.tfstate: Creating...
aws_dynamodb_table.tflock: Creating...
aws_s3_bucket.tfstate: Creation complete after 0s [id=tf-state-demo]
aws_dynamodb_table.tflock: Creation complete after 6s [id=tf-lock-demo]

Apply complete! Resources: 2 added, 0 changed, 0 destroyed.
```

### Bước 2 — backend block KHÔNG đọc được biến — lỗi thật

```hcl
terraform {
  backend "s3" {
    bucket = var.localstack_endpoint   # SAI — backend không nhận var.*
    key    = "app/terraform.tfstate"
  }
}
```

```bash
terraform init
```

```text
Error: Variables not allowed

  on backend.tf line 3, in terraform:
   3:     bucket = var.localstack_endpoint

Variables may not be used here.
```

Phải thay bằng giá trị **hard-code**, hoặc truyền lúc `init` bằng
`-backend-config="bucket=..."` (đọc từ file riêng, không đụng biến của config chính).

### Bước 3 — backend đúng cách, có lock bằng DynamoDB table

```hcl
terraform {
  backend "s3" {
    bucket                      = "tf-state-demo"
    key                         = "app/terraform.tfstate"
    region                      = "us-east-1"
    access_key                  = "test"
    secret_key                  = "test"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    use_path_style               = true
    dynamodb_table               = "tf-lock-demo"
    endpoints = {
      s3       = "http://localhost:4566"
      dynamodb = "http://localhost:4566"
    }
  }
}

resource "terraform_data" "demo" {
  input = "backend-demo"
  provisioner "local-exec" {
    command = "sleep 4"
  }
}
```

```bash
terraform init
```

```text
Successfully configured the backend "s3"! Terraform will automatically
use this backend unless the backend configuration changes.

Terraform has been successfully initialized!
```

`use_path_style = true` là chi tiết bắt buộc riêng cho LocalStack — không có nó, S3
backend cố resolve `tf-state-demo.<host>` (virtual-hosted style) và DNS thất bại, vì
LocalStack phục vụ theo path style (`<host>/tf-state-demo`).

### Bước 4 — hai `apply` cùng lúc, có `sleep 4` để kéo dài cửa sổ ghi

```bash
terraform apply -auto-approve -replace="terraform_data.demo" &   # lệnh 1, chạy nền
sleep 0.5
terraform apply -auto-approve -replace="terraform_data.demo"      # lệnh 2, chạy ngay sau
```

**Lệnh 2 (chạy sau, bị chặn):**

```text
Error: Error acquiring the state lock

Error message: operation error DynamoDB: PutItem, https response error
StatusCode: 400, RequestID: 0e099f31-3f18-4e7b-86c3-50553f078fba,
ConditionalCheckFailedException: The conditional request failed
Lock Info:
  ID:        8fe31ad7-9882-7b6e-cc0c-7c267e36417c
  Path:      tf-state-demo/app/terraform.tfstate
  Operation: OperationTypeApply
  Who:       user@host
  Version:   1.16.5
  Created:   2026-10-28 07:42:25.570052975 +0000 UTC

Terraform acquires a state lock to protect the state from being written
by multiple users at the same time. Please resolve the issue above and try
again. For most commands, you can disable locking with the "-lock=false"
flag, but this is not recommended.
```

**Lệnh 1 (chạy trước) chạy xong bình thường, không lỗi gì** — nó giữ lock suốt 4 giây
`sleep`, lệnh 2 cố giữ lock cùng lúc và bị `ConditionalCheckFailedException` — đúng cơ
chế **compare-and-swap** trên DynamoDB (ghi item `LockID` có điều kiện "chưa tồn tại").

### Phát hiện quan trọng: `use_lockfile` (lock kiểu S3-native, không cần DynamoDB) KHÔNG chặn được trên LocalStack

Terraform bản mới có tuỳ chọn `use_lockfile = true` thay cho `dynamodb_table` (báo
"deprecated" ở ví dụ trên) — cơ chế này dùng **conditional write** (`If-None-Match`)
thẳng trên S3, không cần DynamoDB riêng. Chạy lại đúng kịch bản đua ở Bước 4 nhưng đổi
`dynamodb_table` thành `use_lockfile = true`:

```text
# Cả hai lệnh apply đều chạy xong, KHÔNG có lỗi lock nào xuất hiện
Apply complete! Resources: 1 added, 0 changed, 1 destroyed.
Apply complete! Resources: 1 added, 0 changed, 1 destroyed.
```

**Không chặn được** — rất có thể vì S3 implementation của LocalStack (bản đang dùng để
test) chưa hỗ trợ đầy đủ conditional write `If-None-Match` mà `use_lockfile` cần.
Đây là hạn chế của **môi trường test (LocalStack)**, không phải của Terraform hay cơ
chế `use_lockfile` tự nó — trên S3 thật (AWS), `use_lockfile` được quảng bá hoạt động
đúng. **Bài học thực dụng:** đừng tin một cơ chế lock chỉ vì đọc tài liệu nói nó tồn tại
— luôn tự chạy đúng kịch bản đua (hai `apply` cùng lúc, có độ trễ để tăng khả năng
chạm) trên đúng môi trường định dùng trước khi tin tưởng giao cho CI nhiều người chạy.

## Trade-offs

| `dynamodb_table` (cũ, deprecated nhưng phổ biến) | `use_lockfile` (mới, S3-native) |
|---|---|
| Cần dựng thêm một DynamoDB table riêng | Không cần tài nguyên phụ, chỉ cần S3 |
| Đã kiểm chứng ổn định lâu năm, chạy đúng trên LocalStack ở bài này | Mới hơn, cần S3 hỗ trợ đầy đủ conditional write — chạy sai thầm lặng nếu backend S3 không hỗ trợ (xem phát hiện trên) |
| Terraform cảnh báo "Deprecated Parameter" khi dùng | Được khuyến nghị thay thế, nhưng cảnh báo không đồng nghĩa nó luôn hoạt động đúng mọi nơi |

## Common Mistakes

- **Đưa biến vào `backend` block.** Luôn lỗi "Variables not allowed" — dùng giá trị
  hard-code hoặc `-backend-config` khi `init`.
- **Quên `use_path_style`/tương đương khi backend nhắm vào S3-compatible không phải AWS
  thật** (LocalStack, MinIO...) — lỗi DNS khó hiểu như ví dụ ở Bước 3 nếu thiếu.
- **Tin một cơ chế lock chỉ vì tài liệu nói nó hoạt động**, không tự test race thật trên
  đúng backend sẽ dùng — xem phát hiện `use_lockfile` trên LocalStack ở trên.
- **`-lock=false` thành phản xạ** khi gặp lỗi lock, thay vì tìm hiểu ai đang giữ lock
  (`Who`, `Created` trong thông báo lỗi) — bỏ qua lock đúng lúc có người khác đang ghi
  là cách chắc chắn nhất để hỏng state.

## FAQ

<details>
<summary>Đổi từ `dynamodb_table` sang `use_lockfile` có cần làm gì với DynamoDB table cũ không?</summary>

Table cũ không tự xoá, và không ảnh hưởng gì nếu không còn backend nào trỏ tới nó —
có thể giữ lại (phòng rollback) hoặc xoá tay sau khi chắc chắn không còn backend nào
dùng `dynamodb_table` đó nữa.

</details>

## Related Topics

- [State](../reference/state.md) — trade-off local vs remote state
- [Providers và Resources](../reference/providers-and-resources.md) — cấu hình provider AWS trỏ LocalStack dùng chung ở bài này
- [Lab 6 — IAM role và policy](../tutorials/lab-06-iam-role-policy.md)

## References

- HashiCorp — [S3 Backend](https://developer.hashicorp.com/terraform/language/backend/s3)
- HashiCorp — [State locking](https://developer.hashicorp.com/terraform/language/state/locking)
