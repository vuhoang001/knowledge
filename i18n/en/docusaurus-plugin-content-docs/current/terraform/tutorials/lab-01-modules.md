---
title: "Lab 1 — Modules"
i18n_status: untranslated
sidebar_position: 2
description: "Tách một resource lặp lại thành module tái sử dụng: input qua variable, output trả ra root, for_each để sinh nhiều instance từ một danh sách."
tags: [tutorial, terraform, module]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Lab 1 — Modules

> **Chạy thật 2026-10-28** — Terraform v1.16.5, provider `hashicorp/local` v2.9.1.
> Gõ theo đúng thứ tự là ra đúng output đã dán. `verified_at` để trống — chờ chủ repo
> tự chạy lại tay.

Yêu cầu: đã làm xong [Lab 0](lab-00-first-apply.md) — bài này giả định bạn đã biết
`init`/`plan`/`apply`.

## Vì sao cần module

Viết lặp lại ba lần cùng một khối `resource "local_file"` cho ba người khác nhau là
dấu hiệu cần module: **module là một function** — nhận input qua `variable`, trả output
qua `output`, và có thể gọi nhiều lần với input khác nhau.

## Bước 1 — Viết module

```bash
mkdir -p tf-module/modules/greeting-file && cd tf-module
```

```hcl title="modules/greeting-file/main.tf"
variable "name" {
  type        = string
  description = "Ten nguoi duoc chao"
}

variable "output_dir" {
  type        = string
  description = "Thu muc dat file ket qua"
}

resource "local_file" "greeting" {
  filename = "${var.output_dir}/${var.name}.txt"
  content  = "Xin chao, ${var.name}!"
}

output "path" {
  value = local_file.greeting.filename
}

output "content" {
  value = local_file.greeting.content
}
```

Một module **không có** `terraform {}` hay `provider {}` block — hai thứ đó chỉ khai
ở root module. Module con chỉ khai `variable`/`resource`/`output`.

## Bước 2 — Gọi module từ root, nhiều lần bằng `for_each`

```hcl title="main.tf"
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

locals {
  nhan_vien = ["An", "Binh", "Chi"]
}

module "greeting" {
  for_each   = toset(local.nhan_vien)
  source     = "./modules/greeting-file"
  name       = each.value
  output_dir = "${path.module}/out"
}

output "tat_ca_duong_dan" {
  value = { for k, m in module.greeting : k => m.path }
}
```

```bash
mkdir -p out
terraform init
```

`init` lần này còn làm thêm một việc mới: nạp module con vào `.terraform/modules/` —
để ý dòng `Initializing modules...` ngoài phần provider đã quen ở Lab 0.

## Bước 3 — `plan`: mỗi phần tử của `for_each` là một instance riêng

```bash
terraform plan
```

```text
Terraform will perform the following actions:

  # module.greeting["An"].local_file.greeting will be created
  + resource "local_file" "greeting" {
      + content  = "Xin chao, An!"
      + filename = "./out/An.txt"
      ...
    }

  # module.greeting["Binh"].local_file.greeting will be created
  + resource "local_file" "greeting" {
      + content  = "Xin chao, Binh!"
      + filename = "./out/Binh.txt"
      ...
    }

  # module.greeting["Chi"].local_file.greeting will be created
  + resource "local_file" "greeting" {
      + content  = "Xin chao, Chi!"
      + filename = "./out/Chi.txt"
      ...
    }

Plan: 3 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + tat_ca_duong_dan = {
      + An   = (known after apply)
      + Binh = (known after apply)
      + Chi  = (known after apply)
    }
```

Địa chỉ resource giờ có tiền tố `module.greeting["<key>"]` — **key của `for_each`**,
không phải số thứ tự. Đây là điểm khác biệt quan trọng với `count` (đánh số `[0]`,
`[1]`...): đổi thứ tự list khi dùng `for_each` theo set/map **không** làm resource bị
destroy/recreate, vì Terraform định danh theo key, không theo vị trí.

## Bước 4 — `apply` và kiểm tra output thật

```bash
terraform apply -auto-approve
cat out/An.txt
ls out/
```

```text
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:

tat_ca_duong_dan = {
  "An" = "./out/An.txt"
  "Binh" = "./out/Binh.txt"
  "Chi" = "./out/Chi.txt"
}
```

```text
Xin chao, An!
```

```text
An.txt  Binh.txt  Chi.txt
```

**Kết quả phải ra:** ba file thật trong `out/`, nội dung đúng tên từng người, và output
`tat_ca_duong_dan` gom cả ba đường dẫn thành một map — đọc được thẳng từ root, không
cần biết module con viết thế nào.

## Cái bẫy để dành cho Lab 3

Thử nghĩ: nếu ba resource `local_file.an`, `local_file.binh`, `local_file.chi` đã tồn
tại **ở ngoài root** (không qua module) từ trước, rồi bạn mới nghĩ ra việc tách thành
module như bài này — `plan` sẽ nói gì? Trực giác "chỉ là đổi chỗ code, có gì phải lo"
sai hoàn toàn. [Lab 3 — State surgery](lab-03-state-surgery.md) dựng lại chính xác tình
huống đó.

## Đáp số đối chiếu

| Bước | Hành động mong đợi | Dòng nhận biết |
|---|---|---|
| Bước 3 | 3 resource, địa chỉ có tiền tố `module.greeting["<key>"]` | `Plan: 3 to add, 0 to change, 0 to destroy.` |
| Bước 4 | 3 file thật trong `out/` | `ls out/` ra đúng `An.txt Binh.txt Chi.txt` |

## Related Topics

- [Providers và Resources](../reference/providers-and-resources.md) — lý thuyết nền cho `required_providers` trong module
- [Lab 0 — vòng đời đầu tiên](lab-00-first-apply.md) — bài trước, giả định đã biết `init`/`plan`/`apply`
- [Lab 3 — State surgery](lab-03-state-surgery.md) — xử lý đúng khi refactor resource có sẵn vào module
- [Bài tập — Terraform](index.md) — mục lục bộ bài tập
