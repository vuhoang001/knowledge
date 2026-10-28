---
title: "Lab 4 — Import"
sidebar_position: 5
description: "Đưa một container Docker đã chạy TRƯỚC khi có Terraform vào state — và tại sao plan ngay sau import vẫn báo destroy/recreate, chứ không phải No changes."
tags: [tutorial, terraform, import, docker]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-10-28
---

# Lab 4 — Import

> **Chạy thật 2026-10-28** — Terraform v1.16.5, provider `kreuzwerker/docker` v3.x,
> Docker Engine 29.1.3. Bài khó nhất trong bộ — dùng Docker chạy trên **máy của bạn**
> (không cần tài khoản cloud nào), nhưng cần hiểu rõ bốn bài trước.

Yêu cầu: có Docker chạy được (`docker version`), và đã làm [Lab 3](lab-03-state-surgery.md).

## Tình huống

Ai đó (hoặc chính bạn, hồi chưa dùng Terraform) đã gõ `docker run` tạo một container.
Giờ muốn đưa nó vào quản lý bằng Terraform **mà không xoá container cũ đi tạo lại** —
đó là lý do `terraform import` tồn tại. Bài trước đã thấy: config giống hệt resource
thật vẫn ra `plan` muốn destroy/recreate nếu Terraform **không biết** resource đó đã
tồn tại. `import` là cách nói cho Terraform biết.

## Bước 0 — Tạo container "đã có từ trước", không qua Terraform

```bash
docker run -d --name tf-import-demo alpine:latest sleep 3600
docker ps --no-trunc -f name=tf-import-demo
```

Ghi lại `CONTAINER ID` đầy đủ (64 ký tự) — import của provider này **cần ID đầy đủ**,
ID rút gọn 12 ký tự sẽ báo lỗi "Cannot import non-existent remote object".

## Bước 1 — Viết resource block tối thiểu, rồi import

```bash
mkdir tf-import && cd tf-import
cat > main.tf << 'EOF'
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

resource "docker_container" "demo" {
  name  = "tf-import-demo"
  image = "alpine:latest"
}
EOF
terraform init

CID=$(docker ps -qf "name=tf-import-demo" --no-trunc)
terraform import docker_container.demo "$CID"
```

```text
docker_container.demo: Importing from ID "edf8c7d0f36c4e181a1a94d425f485e7a865997872e6f661fd559035addfe451"...
docker_container.demo: Import prepared!
  Prepared docker_container for import
docker_container.demo: Refreshing state... [id=edf8c7d0f36c4e181a1a94d425f485e7a865997872e6f661fd559035addfe451]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.
```

"Import successful" — cảm giác xong việc. **Chưa xong.**

## Bước 2 — `plan` ngay sau import: bất ngờ đầu tiên

```bash
terraform plan
```

```text
-/+ destroy and then create replacement

Terraform will perform the following actions:

  # docker_container.demo must be replaced
-/+ resource "docker_container" "demo" {
      ~ command    = [
          - "sleep",
          - "3600",
        ] -> (known after apply)
      + env        = (known after apply) # forces replacement
      ...
        name       = "tf-import-demo"
    }

Plan: 1 to add, 0 to change, 1 to destroy.
```

**`import` không viết config cho bạn.** Nó chỉ nạp attribute thật vào *state*; resource
block trong `.tf` vẫn là cái bạn tự viết — thiếu `command` nghĩa là Terraform nghĩ bạn
*muốn* xoá command đi, và với container, đổi `command` buộc phải xoá-tạo-lại (không
sửa tại chỗ được). Đây là cách để tìm xem thuộc tính nào đang gây `-/+`:

```bash
terraform plan 2>&1 | grep "forces replacement"
```

```text
+ env        = (known after apply) # forces replacement
```

## Bước 3 — Vá `command`, vẫn chưa hết

Thêm `command` đúng với thật (lấy từ `docker inspect`, không bịa):

```hcl title="main.tf"
resource "docker_container" "demo" {
  name    = "tf-import-demo"
  image   = "alpine:latest"
  command = ["sleep", "3600"]
}
```

```bash
terraform plan 2>&1 | grep "forces replacement"
```

```text
+ env        = (known after apply) # forces replacement
```

Vẫn là `env` — dù bạn **không** khai `env` trong config. Đây là một quirk thật của
provider `kreuzwerker/docker`: `terraform import` của resource `docker_container`
**không đọc `env` vào state**, nên nó luôn ở trạng thái "chưa biết", và vì `env` là
thuộc tính buộc replace khi đổi, Terraform luôn coi đây là một thay đổi cần xoá-tạo-lại
— bất kể bạn viết gì. Đọc kỹ dòng `# forces replacement` sau mỗi lần `plan` là cách duy
nhất phát hiện được việc này; đọc dòng tổng `Plan: 1 to add, 0 to change, 1 to destroy`
không nói cho bạn biết tại sao.

## Bước 4 — Giải quyết bằng `lifecycle.ignore_changes`

Thuộc tính provider không reconcile đúng sau import thì nói với Terraform "đừng so sánh
cột này nữa":

```hcl title="main.tf"
resource "docker_container" "demo" {
  name    = "tf-import-demo"
  image   = "alpine:latest"
  command = ["sleep", "3600"]

  lifecycle {
    ignore_changes = [
      env, runtime, security_opts, shm_size, hostname, ipc_mode,
      log_driver, stop_timeout, entrypoint, working_dir,
      storage_opts, sysctls, tmpfs,
    ]
  }
}
```

```bash
terraform plan
```

```text
~ resource "docker_container" "demo" {
      + attach                                      = false
      + container_read_refresh_timeout_milliseconds = 15000
        id                                          = "edf8c7d0f36c..."
      + logs                                        = false
      + must_run                                    = true
        name                                        = "tf-import-demo"
      + remove_volumes                              = true
      + start                                       = true
      + wait                                        = false
      + wait_timeout                                = 60
        # (41 unchanged attributes hidden)
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

Từ `-/+ destroy and then create replacement` xuống `~ update in-place` — vẫn còn
"thay đổi", nhưng giờ là Terraform **bổ sung giá trị default** vào state (những tham số
`must_run`, `start`... mà `docker run` tay không set tường minh), không còn xoá container
thật. `apply` plan này an toàn.

```bash
terraform apply -auto-approve
terraform plan
```

```text
No changes. Your infrastructure matches the configuration.
```

**Kết quả phải ra:** container `tf-import-demo` vẫn là container bạn tạo ở Bước 0
(cùng ID, chưa hề bị xoá-tạo-lại suốt cả quá trình), và giờ `plan` mới thật sự hội tụ
về `No changes`.

## Bài học, không phải sự cố của riêng Docker provider

| Bước sai nếu bỏ qua | Hậu quả |
|---|---|
| Tin "Import successful" là xong | `plan` ngay sau đó có thể vẫn muốn destroy/recreate — **luôn `plan` ngay sau `import`**, không `apply` mù |
| Không đọc dòng `# forces replacement` | Tưởng cả plan là một khối thay đổi lớn, không thấy đúng thuộc tính gây replace |
| Cố viết config khớp 100% mọi attribute provider trả về | Một số attribute (như `env` ở đây) không được provider đưa vào state lúc import dù resource đang chạy có nó — không có config nào khớp được, chỉ `ignore_changes` mới dừng được vòng lặp |
| Không kiểm tra *trước* khi `apply` lần đầu sau import | Lần `apply` đầu sau import nên luôn là loại `~`/không đổi, không bao giờ là `-/+` |

## Dọn dẹp

```bash
terraform destroy -auto-approve
docker rm -f tf-import-demo 2>/dev/null || true
```

## Đáp số đối chiếu

| Bước | Hành động mong đợi | Dòng nhận biết |
|---|---|---|
| Bước 1 | Import thành công | `Import successful!` |
| Bước 2 | Plan ngay sau import KHÔNG phải No changes | `-/+ destroy and then create replacement` |
| Bước 3 | Vá `command` chưa đủ, vẫn do `env` | `+ env = (known after apply) # forces replacement` |
| Bước 4 | `ignore_changes` → update in-place → apply → hội tụ | `No changes. Your infrastructure matches the configuration.` |

## Related Topics

- [State](../reference/state.md) — import chỉ ghi vào state, không ghi config
- [Providers và Resources](../reference/providers-and-resources.md) — mỗi provider tự quyết attribute nào đọc được lúc import
- [Lab 3 — State surgery](lab-03-state-surgery.md) — cách quay lại sau một lần `state rm` nhỡ tay
- [Bài tập — Terraform](index.md) — mục lục bộ bài tập
