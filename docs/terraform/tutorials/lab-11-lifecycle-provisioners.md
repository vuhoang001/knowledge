---
title: "Lab 11 — Lifecycle meta-arguments và provisioners"
sidebar_position: 6
description: "Tự tay đổi thứ tự replace bằng create_before_destroy, chặn một destroy bằng prevent_destroy, giấu một config diff bằng ignore_changes, rồi làm hỏng một provisioner để thấy resource bị tainted dù đã tạo thành công."
tags: [tutorial, terraform, lifecycle, provisioners]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-29
---

# Lab 11 — Lifecycle meta-arguments và provisioners

> **Chạy thật 2026-10-29** — Terraform v1.16.5, provider `hashicorp/local` v2.9.1.
> Gõ theo đúng thứ tự là ra đúng output đã dán. `verified_at` để trống — chờ chủ repo
> tự chạy lại tay.

Yêu cầu: đã làm xong [Lab 0](lab-00-first-apply.md). Lý thuyết:
[Lifecycle Meta-arguments](../skills/lifecycle-meta-arguments.md) ·
[Provisioners](../skills/provisioners.md).

```bash
mkdir tf-lab11 && cd tf-lab11
cat > main.tf << 'EOF'
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

resource "local_file" "cfg" {
  filename = "${path.module}/v1.txt"
  content  = "version=1"
}
EOF
terraform init
terraform apply -auto-approve
```

Đổi `filename` của `local_file` luôn buộc replace (thuộc tính `ForceNew`) — dùng đúng
đặc điểm này cho cả bài để quan sát thứ tự destroy/create, không cần resource phức tạp.

## Bước 1 — mặc định: destroy trước, create sau

```bash
sed -i 's/v1.txt/v2.txt/' main.tf
terraform apply -auto-approve
```

```text
local_file.cfg: Destroying...
local_file.cfg: Destruction complete after 0s
local_file.cfg: Creating...
local_file.cfg: Creation complete after 0s

Apply complete! Resources: 1 added, 0 changed, 1 destroyed.
```

## Bước 2 — `create_before_destroy`: không bao giờ mất cả hai cùng lúc

```hcl title="main.tf (thêm lifecycle vào resource)"
resource "local_file" "cfg" {
  filename = "${path.module}/v2.txt"
  content  = "version=1"

  lifecycle {
    create_before_destroy = true
  }
}
```

```bash
terraform apply -auto-approve   # ap dung lifecycle, chua doi filename
sed -i 's/v2.txt/v3.txt/' main.tf
terraform apply -auto-approve
```

```text
local_file.cfg: Creating...
local_file.cfg: Creation complete after 0s
local_file.cfg (deposed object a57530fd): Destroying...
local_file.cfg: Destruction complete after 0s

Apply complete! Resources: 1 added, 0 changed, 1 destroyed.
```

So với Bước 1: **create chạy trước**, bản cũ (gọi là *deposed object*) mới bị xoá sau.

## Bước 3 — `prevent_destroy`: biến destroy thành lỗi cứng

```hcl title="main.tf (đổi lifecycle)"
resource "local_file" "cfg" {
  filename = "${path.module}/v3.txt"
  content  = "version=1"

  lifecycle {
    prevent_destroy = true
  }
}
```

```bash
terraform apply -auto-approve
terraform destroy -auto-approve
```

```text
Plan: 0 to add, 0 to change, 1 to destroy.

Error: Instance cannot be destroyed

  on main.tf line 10:
  10: resource "local_file" "cfg" {

Resource local_file.cfg has lifecycle.prevent_destroy set, but the plan calls
for this resource to be destroyed. To avoid this error and continue with the
plan, either disable lifecycle.prevent_destroy or reduce the scope of the
plan using the -target option.
```

`destroy` dừng lại **trước khi** động vào resource thật — không phải "hỏi lại", là
chặn cứng.

## Bước 4 — `ignore_changes`: im lặng bỏ qua một phần config diff

```hcl title="main.tf (đổi lifecycle + content)"
resource "local_file" "cfg" {
  filename = "${path.module}/v3.txt"
  content  = "version=1-comment-moi"

  lifecycle {
    ignore_changes = [content]
  }
}
```

```bash
terraform plan
```

```text
No changes. Your infrastructure matches the configuration.
```

Xoá khối `lifecycle { ignore_changes = [content] }` đi (giữ `content` đã đổi), `plan`
lại đúng config đó:

```text
Plan: 1 to add, 0 to change, 1 to destroy.
```

Cùng một thay đổi `content`, nhưng có `ignore_changes` thì Terraform coi như không có
gì xảy ra. Dọn dẹp phần này trước khi qua provisioner:

```bash
cat > main.tf << 'EOF'
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

resource "local_file" "cfg" {
  filename = "${path.module}/v3.txt"
  content  = "version=1"
}
EOF
terraform destroy -auto-approve
```

## Bước 5 — `local-exec` chạy ngay sau khi resource được tạo

```hcl title="main.tf"
resource "local_file" "cfg" {
  filename = "${path.module}/app.conf"
  content  = "port=8080"

  provisioner "local-exec" {
    command = "echo \"da tao file: ${self.filename}\" >> ${path.module}/provision.log"
  }
}
```

```bash
terraform apply -auto-approve
cat provision.log
```

```text
local_file.cfg: Creating...
local_file.cfg: Provisioning with 'local-exec'...
local_file.cfg: Creation complete after 0s

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

```text
da tao file: ./app.conf
```

## Bước 6 — provisioner thất bại: resource bị *tainted* dù đã tạo xong

```hcl title="main.tf (thêm resource mới)"
resource "local_file" "fail_demo" {
  filename = "${path.module}/fail.conf"
  content  = "x"

  provisioner "local-exec" {
    command = "exit 1"
  }
}
```

```bash
terraform apply -auto-approve
```

```text
local_file.fail_demo: Creating...
local_file.fail_demo: Provisioning with 'local-exec'...

Error: local-exec provisioner error

  with local_file.fail_demo,
  on main.tf line 23, in resource "local_file" "fail_demo":
  23:   provisioner "local-exec" {

Error running command 'exit 1': exit status 1. Output:
```

```bash
ls fail.conf           # file THAT DA duoc tao
terraform plan          # nhung resource bi tainted
```

```text
Plan: 1 to add, 0 to change, 1 to destroy.
```

File `fail.conf` **đã có trên đĩa** — resource provider đã chạy xong trước khi
provisioner lỗi. Nhưng vì provisioner thất bại, Terraform đánh dấu resource này
*tainted*: lần `apply` kế tiếp sẽ **destroy rồi tạo lại từ đầu**, dù phần resource
thật chưa từng sai.

## Đáp số đối chiếu

| Bước | Hành động mong đợi | Dòng nhận biết |
|---|---|---|
| Bước 1 | Destroy rồi mới create | `Destroying...` xuất hiện trước `Creating...` |
| Bước 2 | Create rồi mới destroy bản cũ (deposed) | `Creating...` xuất hiện trước `(deposed object ...): Destroying...` |
| Bước 3 | `destroy` bị chặn bằng lỗi, không xoá gì | `Error: Instance cannot be destroyed` |
| Bước 4 | Đổi `content` nhưng có `ignore_changes` → không thấy gì | `No changes. Your infrastructure matches the configuration.` |
| Bước 6 | Provisioner lỗi làm resource bị buộc destroy/recreate ở lần sau | `Plan: 1 to add, 0 to change, 1 to destroy.` |

## Dọn dẹp

```bash
terraform destroy -auto-approve
```

## Related Topics

- [Lifecycle Meta-arguments](../skills/lifecycle-meta-arguments.md) — lý thuyết cho Bước 1-4
- [Provisioners](../skills/provisioners.md) — lý thuyết cho Bước 5-6
- [Lab 8 — EC2 instance với user_data](lab-08-ec2-instance.md) — ví dụ thay provisioner bằng tham số có sẵn của provider
- [Bài tập — Terraform](index.md) — mục lục bộ bài tập
