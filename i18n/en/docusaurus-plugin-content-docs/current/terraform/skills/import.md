---
title: Import tài nguyên đã tồn tại
i18n_status: untranslated
sidebar_position: 1
description: "terraform import chỉ đưa resource vào state — nó không sinh HCL cho bạn. Viết HCL sai một attribute, plan ngay sau đó báo update, không phải lỗi import."
tags: [import, terraform, state, aws]
domain: devops
category: tool
doc_type: skill
status: review
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Import tài nguyên đã tồn tại

> **Chốt:** `terraform import` (hoặc khối `import` từ 1.5+) chỉ làm một việc — ghi
> resource đã tồn tại thật vào **state**. Nó **không** đọc attribute thật rồi tự viết
> HCL cho bạn. Nếu HCL bạn viết tay không khớp 100% thực tế, `plan` ngay sau import sẽ
> báo một diff — đó không phải lỗi của import, mà là bạn đang thấy đúng chỗ lệch.

## Mục tiêu

Dùng khi có tài nguyên đã tạo **ngoài** Terraform (console, CLI, script khác) và muốn
Terraform quản lý nó tiếp mà không `destroy`/`recreate`. Bài này giả định đã đọc
[State](../reference/state.md) (import chỉ sửa state) và
[Variables, Outputs và Locals](../reference/variables-outputs-locals.md).

## Ví dụ — import một S3 bucket tạo ngoài Terraform

Chạy thật 2026-10-28, Terraform 1.16.5, AWS provider 6.70.0, nhắm vào một endpoint
LocalStack (giả lập AWS, miễn phí, không phải tài khoản AWS thật — xem cấu hình
provider mẫu trong [Providers và Resources](../reference/providers-and-resources.md)).

**1. Tạo bucket bằng AWS CLI — không đụng Terraform:**

```bash
aws --endpoint-url http://localhost:4566 s3 mb s3://import-demo-bucket
```

```text
make_bucket: import-demo-bucket
```

**2. Viết HCL khớp tay, rồi import bằng CLI `terraform import`:**

```hcl
resource "aws_s3_bucket" "demo" {
  bucket = "import-demo-bucket"
}
```

```bash
terraform import aws_s3_bucket.demo import-demo-bucket
```

```text
aws_s3_bucket.demo: Importing from ID "import-demo-bucket"...
aws_s3_bucket.demo: Import prepared!
  Prepared aws_s3_bucket for import
aws_s3_bucket.demo: Refreshing state... [id=import-demo-bucket]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.
```

### HCL thiếu một attribute thật — thấy ngay ở `plan` kế tiếp

Thêm một `tags` vào HCL mà bucket thật **không có** (mô phỏng tình huống ngược — viết
HCL sai khác thực tế):

```hcl
resource "aws_s3_bucket" "demo" {
  bucket = "import-demo-bucket"
  tags = {
    Owner = "team-x"
  }
}
```

```bash
terraform plan
```

```text
Terraform will perform the following actions:

  # aws_s3_bucket.demo will be updated in-place
  ~ resource "aws_s3_bucket" "demo" {
        id                          = "import-demo-bucket"
      ~ tags                        = {
          + "Owner" = "team-x"
        }
      ~ tags_all                    = {
          + "Owner" = "team-x"
        }
        # (14 unchanged attributes hidden)
        # (3 unchanged blocks hidden)
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

`import` không báo lỗi gì khi chạy — attribute `tags` chỉ đơn giản **không tồn tại**
trong state vừa import (vì bucket thật không có tag). Lệch nằm ở `plan` sau đó, dưới
dạng `~ update in-place`, đúng như một thay đổi bình thường — Terraform không phân biệt
được "đây là do tôi viết sai HCL khi import" với "đây là một thay đổi thật tôi muốn áp".

### `import` block (Terraform 1.5+) — làm trong code, review được qua `plan`

Cách CLI ở trên chạy một lệnh, không nằm trong file `.tf`, nên không review qua PR được.
Từ 1.5, có thể khai `import` ngay trong code:

```hcl
resource "aws_s3_bucket" "demo2" {
  bucket = "import-demo-bucket-2"
}

import {
  to = aws_s3_bucket.demo2
  id = "import-demo-bucket-2"
}
```

```bash
terraform plan
```

```text
  # aws_s3_bucket.demo2 will be imported
    resource "aws_s3_bucket" "demo2" {
        arn                         = "arn:aws:s3:::import-demo-bucket-2"
        bucket                      = "import-demo-bucket-2"
        id                          = "import-demo-bucket-2"
        ...
    }

Plan: 1 to import, 0 to add, 1 to change, 0 to destroy.
```

```bash
terraform apply -auto-approve
```

```text
aws_s3_bucket.demo2: Importing... [id=import-demo-bucket-2]
aws_s3_bucket.demo2: Import complete [id=import-demo-bucket-2]

Apply complete! Resources: 1 imported, 0 added, 1 changed, 0 destroyed.
```

`plan` hiện rõ **trước** những gì sẽ import, giống review một thay đổi bình thường —
đây là khác biệt chính so với CLI `terraform import` (chạy xong mới biết kết quả). Sau
khi `apply`, khối `import` có thể xoá khỏi code — nó chỉ cần chạy một lần.

## Trade-offs

| `terraform import` (CLI) | Khối `import` (1.5+) |
|---|---|
| Một lệnh, không nằm trong `.tf`, không review qua PR | Nằm trong code, `plan` cho thấy trước khi `apply`, review được như mọi thay đổi khác |
| Chạy được trên version cũ | Cần Terraform ≥ 1.5 |
| Phải tự nhớ đã import cái gì (không có dấu vết trong code) | Có dấu vết trong code tới khi ai đó dọn khối `import` đi |

## Common Mistakes

- **Tưởng import tự sinh HCL.** Nó không sinh gì cả — bạn phải tự viết `resource` block
  khớp tay trước khi import (hoặc dùng `terraform plan -generate-config-out=...` ở
  Terraform mới hơn để nó gợi ý khung HCL, nhưng vẫn phải tự kiểm lại).
- **Quên kiểm `plan` ngay sau import.** Một diff nhỏ xuất hiện (như ví dụ `tags` trên)
  rất dễ bị hiểu nhầm là "import add tags" trong khi thực tế là "HCL bạn viết sai khác
  thực tế, giờ Terraform muốn sửa thực tế theo HCL sai đó".
- **Import rồi apply ngay không đọc `plan`.** Nếu diff sau import là `-/+` (destroy rồi
  tạo lại) vì một attribute không sửa tại chỗ được, `apply` ngay sẽ xoá tài nguyên thật
  bạn vừa định giữ lại.

## FAQ

<details>
<summary>Import một resource đã có vào state, rồi `destroy` — tài nguyên thật có mất không?</summary>

Có — sau khi import, Terraform coi resource đó là của mình, `destroy` sẽ xoá thật, y
hệt resource do chính Terraform tạo ra. Import không gắn nhãn "resource mượn, không
được xoá" nào cả.

</details>

## Related Topics

- [State](../reference/state.md) — import chỉ ghi vào đây, không đụng gì khác
- [Variables, Outputs và Locals](../reference/variables-outputs-locals.md)
- [Lab 9 — import một bucket đã tồn tại](../tutorials/lab-09-import-existing-bucket.md) — bài thực hành độc lập, tình huống khác ví dụ trên

## References

- HashiCorp — [`terraform import`](https://developer.hashicorp.com/terraform/cli/import)
- HashiCorp — [Import block](https://developer.hashicorp.com/terraform/language/import)
