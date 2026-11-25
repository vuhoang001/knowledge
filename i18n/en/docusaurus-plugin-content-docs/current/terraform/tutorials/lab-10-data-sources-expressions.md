---
title: "Lab 10 — Data sources và expressions"
i18n_status: untranslated
sidebar_position: 5
description: "Một state tạo file inventory, một state KHÁC chỉ đọc nó bằng data + jsondecode, lọc/biến đổi bằng for-expression, rồi sinh resource từ kết quả đó bằng for_each và đọc lại bằng splat."
tags: [tutorial, terraform, data-source, expressions]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-29
---

# Lab 10 — Data sources và expressions

> **Chạy thật 2026-10-29** — Terraform v1.16.5, provider `hashicorp/local` v2.9.1.
> Gõ theo đúng thứ tự là ra đúng output đã dán. `verified_at` để trống — chờ chủ repo
> tự chạy lại tay.

Yêu cầu: đã làm xong [Lab 0](lab-00-first-apply.md). Lý thuyết:
[Data Sources](../reference/data-sources.md) · [Expressions và Functions](../reference/expressions-and-functions.md).

## Bước 1 — một state tạo "inventory", đóng vai hệ thống khác

```bash
mkdir -p tf-lab10/tf-data-lab && cd tf-lab10/tf-data-lab
```

```hcl title="main.tf"
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

resource "local_file" "inventory" {
  filename = "${path.module}/inventory.json"
  content = jsonencode({
    servers = [
      { name = "web-1", role = "frontend", cpu = 2 },
      { name = "web-2", role = "frontend", cpu = 2 },
      { name = "db-1", role = "database", cpu = 4 },
    ]
  })
}
```

```bash
terraform init
terraform apply -auto-approve
```

```text
local_file.inventory: Creating...
local_file.inventory: Creation complete after 0s

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

File `inventory.json` giờ tồn tại, **được quản lý bởi state của `tf-data-lab/`**.
Bước sau giả định một team/hệ thống khác, dùng state hoàn toàn riêng, chỉ muốn **đọc**
file này — không được, và không cần, quyền quản lý nó.

## Bước 2 — đọc bằng `data`, biến đổi bằng `for`-expression

```bash
cd .. && mkdir tf-report && cd tf-report
```

```hcl title="main.tf"
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

data "local_file" "inventory" {
  filename = "${path.module}/../tf-data-lab/inventory.json"
}

locals {
  servers     = jsondecode(data.local_file.inventory.content).servers
  frontend    = [for s in local.servers : s.name if s.role == "frontend"]
  cpu_by_name = { for s in local.servers : s.name => s.cpu }
  total_cpu   = sum([for s in local.servers : s.cpu])
}

output "frontend_servers" {
  value = local.frontend
}

output "cpu_by_name" {
  value = local.cpu_by_name
}

output "total_cpu" {
  value = local.total_cpu
}
```

```bash
terraform init
terraform apply -auto-approve
```

```text
Apply complete! Resources: 0 added, 0 changed, 0 destroyed.

Outputs:

cpu_by_name = {
  "db-1" = 4
  "web-1" = 2
  "web-2" = 2
}
frontend_servers = [
  "web-1",
  "web-2",
]
total_cpu = 8
```

Đọc kỹ ba output:

- `frontend_servers` dùng `for ... if ...` — **lọc** trước khi lấy tên, chỉ giữ server
  có `role == "frontend"`.
- `cpu_by_name` dùng `{for ... : k => v}` — biến list server thành **map** tên→cpu, tra
  cứu trực tiếp bằng key thay vì phải lặp lại tìm trong list.
- `total_cpu` dùng `sum([for ...])` — for-expression ra list số, hàm `sum()` cộng dồn.

Toàn bộ bước này **không có resource nào được tạo** (`0 added`) — `data` chỉ đọc,
không quản lý gì.

## Bước 3 — sinh resource từ đúng kết quả vừa tính, đọc lại bằng splat

```hcl title="main.tf (thêm vào cuối)"
resource "local_file" "frontend_marker" {
  for_each = toset(local.frontend)
  filename = "${path.module}/${each.key}.ready"
  content  = "cpu=${local.cpu_by_name[each.key]}"
}

output "marker_files_splat" {
  value = values(local_file.frontend_marker)[*].filename
}
```

```bash
terraform apply -auto-approve
```

```text
Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

Outputs:

marker_files_splat = [
  "./web-1.ready",
  "./web-2.ready",
]
```

Chỉ **2 resource** được tạo (đúng 2 server `frontend`, không phải 3) — `for_each` lấy
trực tiếp từ `local.frontend`, danh sách đã lọc ở Bước 2. `db-1` (role `database`)
không có file `.ready` nào, đúng như kỳ vọng.

## Bước 4 — `data` đọc ngay lúc `plan`: nguồn biến mất là chết `plan`, không phải chết `apply`

```bash
mv ../tf-data-lab/inventory.json ../tf-data-lab/inventory.json.bak
terraform plan
```

```text
Error: Read local file data source error

  with data.local_file.inventory,
  on main.tf line 10, in data "local_file" "inventory":
  10: data "local_file" "inventory" {

The file at given path cannot be read.

Original Error: open ./../tf-data-lab/inventory.json: no such file or
directory
```

So với một `resource` (chỉ báo `+ create`, không bao giờ lỗi kiểu này ở `plan`),
`data` phải đọc được **ngay lúc `plan`** để có giá trị dùng cho mọi expression phía
sau — thiếu nguồn làm cả `plan` chết tại chỗ, trước khi `apply` chạy bất cứ gì. Trả
file lại đúng tên để dọn dẹp bình thường:

```bash
mv ../tf-data-lab/inventory.json.bak ../tf-data-lab/inventory.json
```

## Đáp số đối chiếu

| Bước | Hành động mong đợi | Dòng nhận biết |
|---|---|---|
| Bước 2 | `data` không tạo resource nào, chỉ đổ giá trị vào output | `Resources: 0 added, 0 changed, 0 destroyed.` |
| Bước 3 | Đúng 2 resource, khớp số server `frontend` sau khi lọc | `Resources: 2 added, 0 changed, 0 destroyed.` |
| Bước 4 | Mất file nguồn làm `plan` lỗi ngay, không phải `apply` | `Error: Read local file data source error` |

## Dọn dẹp

```bash
terraform destroy -auto-approve
cd ../tf-data-lab && terraform destroy -auto-approve
```

## Related Topics

- [Data Sources](../reference/data-sources.md) — lý thuyết: vì sao `data` đọc ngay lúc `plan`, khác resource
- [Expressions và Functions](../reference/expressions-and-functions.md) — lý thuyết: conditional, for-expression, splat, dynamic block
- [Lab 0 — vòng đời đầu tiên](lab-00-first-apply.md) — bài trước, giả định đã biết `init`/`plan`/`apply`
- [Bài tập — Terraform](index.md) — mục lục bộ bài tập
