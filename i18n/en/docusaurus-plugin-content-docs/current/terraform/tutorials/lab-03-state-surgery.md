---
title: "Lab 3 — State surgery (mv/rm)"
i18n_status: untranslated
sidebar_position: 4
description: "Refactor code đã có resource chạy thật vào module mà KHÔNG destroy/recreate — terraform state mv; và hậu quả thật của terraform state rm khi disown một resource."
tags: [tutorial, terraform, state, refactor]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Lab 3 — State surgery (mv/rm)

> **Chạy thật 2026-10-28** — Terraform v1.16.5, provider `hashicorp/local` v2.9.1.

Yêu cầu: đã làm [Lab 0](lab-00-first-apply.md) và [Lab 1 — Modules](lab-01-modules.md).
Bài này dựng lại đúng cái bẫy đã hẹn ở cuối Lab 1: refactor code **đã có resource chạy
thật** vào module.

## Bước 1 — Hai resource viết thẳng ở root, đã `apply`

```bash
mkdir -p tf-surgery/out && cd tf-surgery
cat > main.tf << 'EOF'
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

resource "local_file" "an" {
  filename = "${path.module}/out/An.txt"
  content  = "Xin chao, An!"
}

resource "local_file" "binh" {
  filename = "${path.module}/out/Binh.txt"
  content  = "Xin chao, Binh!"
}
EOF
terraform init
terraform apply -auto-approve
terraform state list
```

```text
Apply complete! Resources: 2 added, 0 changed, 0 destroyed.
```

```text
local_file.an
local_file.binh
```

Hai file thật đã tồn tại trên đĩa, Terraform đang quản lý đúng hai resource này.

## Bước 2 — Refactor vào module, giống Lab 1 — rồi `plan` TRƯỚC khi sửa gì về state

```bash
mkdir -p modules/greeting-file
cat > modules/greeting-file/main.tf << 'EOF'
variable "name" {
  type = string
}
variable "output_dir" {
  type = string
}

resource "local_file" "greeting" {
  filename = "${var.output_dir}/${var.name}.txt"
  content  = "Xin chao, ${var.name}!"
}
EOF
```

```hcl title="main.tf — thay the hai resource rời bang module"
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

locals {
  nhan_vien = ["An", "Binh"]
}

module "greeting" {
  for_each   = toset(local.nhan_vien)
  source     = "./modules/greeting-file"
  name       = each.value
  output_dir = "${path.module}/out"
}
```

```bash
terraform init
terraform plan
```

```text
  # local_file.an will be destroyed
  # local_file.binh will be destroyed
  # module.greeting["An"].local_file.greeting will be created
  # module.greeting["Binh"].local_file.greeting will be created

Plan: 2 to add, 0 to change, 2 to destroy.
```

**Đây chính là cái bẫy.** Nội dung hai file **không đổi một chữ** — cùng tên, cùng
`content`. Nhưng với Terraform, `local_file.an` và
`module.greeting["An"].local_file.greeting` là **hai địa chỉ khác nhau hoàn toàn**,
không liên quan gì tới nhau trong state. Nó không biết "đây là đổi chỗ code", nó chỉ
thấy một địa chỉ cũ không còn trong config (→ destroy) và một địa chỉ mới chưa có
trong state (→ create). `apply` plan này thật sẽ xoá rồi tạo lại file — với
`local_file` thì vô hại, nhưng với một database hay một volume thật thì đây là **mất
dữ liệu**.

## Bước 3 — Sửa đúng: `terraform state mv`

```bash
terraform state mv 'local_file.an' 'module.greeting["An"].local_file.greeting'
terraform state mv 'local_file.binh' 'module.greeting["Binh"].local_file.greeting'
```

```text
Move "local_file.an" to "module.greeting[\"An\"].local_file.greeting"
Successfully moved 1 object(s).
Move "local_file.binh" to "module.greeting[\"Binh\"].local_file.greeting"
Successfully moved 1 object(s).
```

```bash
terraform state list
terraform plan
```

```text
module.greeting["An"].local_file.greeting
module.greeting["Binh"].local_file.greeting
```

```text
No changes. Your infrastructure matches the configuration.
```

**Kết quả phải ra:** `No changes` — và nếu bạn `terraform state show` resource này,
`id` (hash của content) **giữ nguyên y hệt** trước và sau `mv`. `state mv` chỉ đổi
*địa chỉ Terraform dùng để gọi resource*, không chạm gì vào resource thật — khác hẳn
"đổi tên rồi recreate".

## Bước 4 — `terraform state rm`: disown, và hậu quả thật

```bash
terraform state rm 'module.greeting["Binh"].local_file.greeting'
cat out/Binh.txt
terraform plan
```

```text
Removed module.greeting["Binh"].local_file.greeting
Successfully removed 1 resource instance(s).
```

```text
Xin chao, Binh!
```

```text
  # module.greeting["Binh"].local_file.greeting will be created
  + resource "local_file" "greeting" {
      + content  = "Xin chao, Binh!"
      + filename = "./out/Binh.txt"
      ...
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

File `Binh.txt` **vẫn còn nguyên trên đĩa** — `state rm` không đụng vào tài nguyên
thật, nó chỉ xoá một dòng trong "sổ sách" của Terraform. Nhưng config vẫn khai resource
này, nên `plan` tiếp theo thấy "chưa có trong state" → muốn **tạo mới**. Với `local_file`
thì tạo mới chỉ là ghi đè cùng nội dung, vô hại. Với một resource mà provider không cho
trùng tên (ví dụ một S3 bucket, một DNS record) thì `apply` plan này sẽ **lỗi "đã tồn
tại"** — và tệ hơn, nếu provider cho tạo trùng, bạn sẽ có hai tài nguyên không ai biết
cái nào Terraform đang thật sự quản lý.

## Cách quay lại sau khi `state rm` nhỡ tay

Có hai đường, tuỳ bạn còn nhớ resource đó từng ở địa chỉ nào trong state cũ hay không:

- Nếu còn resource tương đương để quản lý lại từ đầu: [`terraform import`](lab-04-import.md) —
  xem Lab 4.
- Nếu `state rm` chỉ vài giây trước và chưa `apply` gì: resource thật chưa hề bị động
  tới, nên cách an toàn nhất là **import lại đúng resource đó**, không phải `apply`
  plan "create" ở trên.

## Đáp số đối chiếu

| Bước | Hành động mong đợi | Dòng nhận biết |
|---|---|---|
| Bước 2 | Refactor không state mv → destroy + create | `Plan: 2 to add, 0 to change, 2 to destroy.` |
| Bước 3 | `state mv` → hội tụ, không đổi gì | `No changes. Your infrastructure matches the configuration.` |
| Bước 4 | `state rm` → file thật còn, Terraform muốn tạo lại | `Plan: 1 to add, 0 to change, 0 to destroy.` dù file đã tồn tại |

## Related Topics

- [State](../reference/state.md) — vì sao địa chỉ trong state không tự suy ra được từ code
- [Lab 1 — Modules](lab-01-modules.md) — bài dựng ra cấu hình bị refactor ở đây
- [Lab 4 — Import](lab-04-import.md) — đưa một resource không có trong state (hoặc vừa bị `rm`) vào lại
- [Bài tập — Terraform](index.md) — mục lục bộ bài tập
