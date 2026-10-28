---
title: "Lab 0 — vòng đời đầu tiên và phát hiện drift"
i18n_status: untranslated
sidebar_position: 1
description: "init, plan, apply, destroy trên một resource built-in và một resource qua provider thật — rồi tự tay xoá tài nguyên ngoài Terraform để tận mắt thấy drift detection."
tags: [tutorial, terraform, state, drift]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Lab 0 — vòng đời đầu tiên và phát hiện drift

> **Chạy thật 2026-10-28** — Terraform v1.16.5, linux_amd64, provider `hashicorp/local`
> v2.9.1. Gõ theo đúng thứ tự là ra đúng output đã dán. `verified_at` để trống — chờ
> chủ repo tự chạy lại tay.

Yêu cầu: có `terraform` CLI (`terraform version`). Phần 2 cần mạng một lần để
`init` tải provider.

## Phần 1 — vòng đời đầy đủ, không cần provider nào

`terraform_data` là resource **built-in** (xem [Providers và Resources](../reference/providers-and-resources.md))
— không cần `init` tải gì, chạy được cả khi không có mạng.

```bash
mkdir tf-lab && cd tf-lab
cat > main.tf << 'EOF'
terraform {
  required_version = ">= 1.0"
}

resource "terraform_data" "hello" {
  input = "hello-terraform"
}

output "hello_output" {
  value = terraform_data.hello.output
}
EOF
```

### Bước 1 — `init`

```bash
terraform init
```

```text
Initializing the backend...

Initializing provider plugins...
- terraform.io/builtin/terraform is built in to Terraform

Terraform has been successfully initialized!
```

### Bước 2 — `plan`: chưa có gì trong state → `create`

```bash
terraform plan
```

```text
Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # terraform_data.hello will be created
  + resource "terraform_data" "hello" {
      + id     = (known after apply)
      + input  = "hello-terraform"
      + output = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + hello_output = (known after apply)
```

### Bước 3 — `apply`

```bash
terraform apply -auto-approve
```

```text
terraform_data.hello: Creating...
terraform_data.hello: Creation complete after 0s [id=e6be0d31-6314-bc75-2956-d669c741504d]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

hello_output = "hello-terraform"
```

**Kết quả phải ra:** `hello_output = "hello-terraform"`. ID của bạn sẽ khác (UUID sinh
ngẫu nhiên) — đó là bình thường.

### Bước 4 — `plan` lại, không sửa gì: idempotency

```bash
terraform plan
```

```text
terraform_data.hello: Refreshing state... [id=e6be0d31-6314-bc75-2956-d669c741504d]

No changes. Your infrastructure matches the configuration.
```

### Bước 5 — sửa `input`, `plan` lại: `update in-place`

```bash
sed -i 's/hello-terraform/hello-terraform-v2/' main.tf
terraform plan
```

```text
terraform_data.hello: Refreshing state... [id=e6be0d31-6314-bc75-2956-d669c741504d]

Terraform will perform the following actions:

  # terraform_data.hello will be updated in-place
  ~ resource "terraform_data" "hello" {
        id     = "e6be0d31-6314-bc75-2956-d669c741504d"
      ~ input  = "hello-terraform" -> "hello-terraform-v2"
      ~ output = "hello-terraform" -> (known after apply)
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

```bash
terraform apply -auto-approve
```

```text
terraform_data.hello: Modifying... [id=e6be0d31-6314-bc75-2956-d669c741504d]
terraform_data.hello: Modifications complete after 0s [id=e6be0d31-6314-bc75-2956-d669c741504d]

Apply complete! Resources: 0 added, 1 changed, 0 destroyed.

Outputs:

hello_output = "hello-terraform-v2"
```

### Bước 6 — `destroy`

```bash
terraform destroy -auto-approve
```

```text
Terraform will perform the following actions:

  # terraform_data.hello will be destroyed
  - resource "terraform_data" "hello" {
      - id     = "e6be0d31-6314-bc75-2956-d669c741504d" -> null
      - input  = "hello-terraform-v2" -> null
      - output = "hello-terraform-v2" -> null
    }

Plan: 0 to add, 0 to change, 1 to destroy.

terraform_data.hello: Destroying...
terraform_data.hello: Destruction complete after 0s

Destroy complete! Resources: 1 destroyed.
```

**Kiểm tra cuối phần 1:** `cat terraform.tfstate` phải có `"resources": []` — state rỗng,
không còn tài nguyên nào được quản lý.

## Phần 2 — một provider thật, và tự tay tạo drift

Phần này dùng provider `hashicorp/local` — tạo một **file thật trên đĩa**, để có thể
tự tay làm nó "lệch" khỏi state giống một người khác vô tình xoá mất tài nguyên.

```bash
cat > main.tf << 'EOF'
terraform {
  required_version = ">= 1.0"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

resource "local_file" "greeting" {
  filename = "${path.module}/greeting.txt"
  content  = "hello-terraform"
}
EOF
rm -f terraform.tfstate* .terraform.lock.hcl
rm -rf .terraform
terraform init
```

```text
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/local versions matching "~> 2.5"...
- Installing hashicorp/local v2.9.1...
- Installed hashicorp/local v2.9.1 (signed by HashiCorp)

Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that Terraform can guarantee to make the same selections by default when
you run "terraform init" in the future.

Terraform has been successfully initialized!
```

Lần này `init` thật sự tải provider qua mạng — khác hẳn Phần 1.

```bash
terraform apply -auto-approve
cat greeting.txt
```

```text
local_file.greeting: Creating...
local_file.greeting: Creation complete after 0s [id=d3f2a7f35ab9db57fa9caddef8ea95af94207dc7]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

```text
hello-terraform
```

File `greeting.txt` giờ thật sự nằm trên đĩa, không chỉ trong state.

### Tự tay gây drift — xoá file, KHÔNG dùng Terraform

```bash
rm greeting.txt
terraform plan
```

```text
local_file.greeting: Refreshing state... [id=d3f2a7f35ab9db57fa9caddef8ea95af94207dc7]

Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # local_file.greeting will be created
  + resource "local_file" "greeting" {
      + content  = "hello-terraform"
      + filename = "./greeting.txt"
      + id       = (known after apply)
      ...
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

**Đây là điểm mấu chốt của cả bài lab.** Config không đổi một chữ nào. Nhưng `plan`
báo `+ create`, không phải `No changes` — vì bước "Refreshing state" đã hỏi provider
"file này còn không", nhận câu trả lời "không còn", và nhận ra thực tế không khớp state
nữa. Terraform không phân biệt được "ai đó lỡ tay xoá" với "file chưa từng được tạo" —
nó chỉ thấy một khoảng trống cần lấp lại, và hành động duy nhất nó biết làm là tạo lại.

`terraform apply -auto-approve` ở bước này sẽ tạo lại `greeting.txt` — dọn dẹp bằng
`terraform destroy -auto-approve` khi xong bài.

## Đáp số đối chiếu

| Bước | Hành động mong đợi | Dòng nhận biết |
|---|---|---|
| Phần 1, bước 2 | create | `Plan: 1 to add, 0 to change, 0 to destroy.` |
| Phần 1, bước 4 | không làm gì | `No changes. Your infrastructure matches the configuration.` |
| Phần 1, bước 5 | update in-place | `Plan: 0 to add, 1 to change, 0 to destroy.` |
| Phần 1, bước 6 | destroy | `Destroy complete! Resources: 1 destroyed.` |
| Phần 2, sau `rm greeting.txt` | create (drift) | `Plan: 1 to add, 0 to change, 0 to destroy.` — dù config không đổi |

## Related Topics

- [State](../reference/state.md) — lý thuyết cho phần drift detection ở Phần 2
- [Providers và Resources](../reference/providers-and-resources.md) — lý thuyết cho sự khác biệt giữa hai phần của bài lab
- [Quy trình Plan / Apply](../reference/plan-apply-workflow.md) — lý thuyết cho các bước `plan`/`apply` ở Phần 1
- [Bài tập — Terraform](index.md) — mục lục bộ bài tập
