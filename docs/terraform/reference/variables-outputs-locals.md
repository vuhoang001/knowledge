---
title: Variables, Outputs và Locals
sidebar_position: 4
description: "variable là đầu vào, output là đầu ra, locals là biến trung gian không ai truyền được từ ngoài — và validation chỉ chạy lúc plan/apply, không chạy lúc init."
tags: [variable, output, locals, expression, terraform]
domain: devops
category: concept
doc_type: reference
status: review
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Variables, Outputs và Locals

> **Chốt:** `variable` là cổng nhận giá trị từ ngoài vào module, `output` là cổng trả
> giá trị ra, `locals` là biến tính toán nội bộ — **không ai từ ngoài truyền được vào
> locals**. Nhầm cả ba là nguyên nhân phổ biến nhất của câu hỏi "sao sửa `-var` mà
> không có tác dụng".

## Mục tiêu

Trả lời: giá trị của một `variable` được quyết định bởi nguồn nào khi có nhiều nguồn
cùng lúc (CLI, file `.tfvars`, biến môi trường), vì sao `sensitive = true` không mã hoá
gì cả, và bốn loại expression tối thiểu cần biết trước khi đọc
[Modules](modules.md) hoặc viết [`count` vs `for_each`](../skills/count-vs-for-each.md).

## Tổng quan

| Khái niệm | Vai trò | Ai gán giá trị |
|---|---|---|
| `variable` | Đầu vào | Người gọi (CLI, file, env var, hoặc module cha) |
| `output` | Đầu ra | Terraform tự tính từ resource/local, đưa ra ngoài |
| `locals` | Biến trung gian | Chỉ tính từ expression trong chính module đó — không nhận giá trị từ ngoài |

## Ví dụ

Chạy thật 2026-10-28, Terraform 1.16.5, resource `terraform_data` (built-in).

```hcl
variable "env" {
  type        = string
  description = "Môi trường: dev, staging hoặc prod"
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env phai la mot trong: dev, staging, prod."
  }
}

variable "name" {
  type        = string
  description = "Tên resource, không có default — bắt buộc truyền"
}

locals {
  resource_name = "${var.env}-${var.name}"
}

resource "terraform_data" "demo" {
  input = local.resource_name
}

output "resource_name" {
  value = local.resource_name
}

output "secret_greeting" {
  value     = "shh-${var.name}"
  sensitive = true
}
```

### Không truyền `var.name` — lỗi ngay ở `plan`, không phải lúc `apply`

```bash
terraform plan -input=false
```

```text
Error: No value for required variable

  on main.tf line 12:
  12: variable "name" {

The root module input variable "name" is not set, and has no default value.
Use a -var or -var-file command line argument to provide a value for this
variable.
```

Không có `default` và không chạy trong terminal tương tác (không TTY để hỏi) → lỗi
ngay, không âm thầm dùng chuỗi rỗng.

### Ba nguồn giá trị, một thứ tự ưu tiên — kiểm bằng cách chạy thật, không đoán

**1. `terraform.tfvars` tự động load**, không cần `-var-file`:

```bash
echo 'name = "demo-tfvars"' > terraform.tfvars
terraform plan -input=false | grep resource_name
```

```text
  + resource_name   = "dev-demo-tfvars"
```

**2. `-var` trên CLI thắng `terraform.tfvars`:**

```bash
terraform plan -input=false -var="name=demo-cli" | grep resource_name
```

```text
  + resource_name   = "dev-demo-cli"
```

**3. Biến môi trường `TF_VAR_<name>` — chỉ thắng khi KHÔNG có `terraform.tfvars`:**

```bash
rm -f terraform.tfvars
TF_VAR_name="demo-envvar" terraform plan -input=false | grep resource_name
```

```text
  + resource_name   = "dev-demo-envvar"
```

Bật lại `terraform.tfvars` cùng lúc với env var đang set — **tfvars thắng**:

```bash
echo 'name = "demo-tfvars"' > terraform.tfvars
TF_VAR_name="demo-envvar" terraform plan -input=false | grep resource_name
```

```text
  + resource_name   = "dev-demo-tfvars"
```

**Thứ tự ưu tiên đã kiểm chứng thật:** `-var`/`-var-file` trên CLI > `terraform.tfvars`/
`*.auto.tfvars` > `TF_VAR_*` > `default` trong `variable` block.

### `validation` — chặn ngay ở `plan`, với thông báo tự viết

```bash
terraform plan -input=false -var="name=x" -var="env=qa"
```

```text
Error: Invalid value for variable

  on main.tf line 1:
   1: variable "env" {
    ├────────────────
    │ var.env is "qa"

env phai la mot trong: dev, staging, prod.

This was checked by the validation rule at main.tf:6,3-13.
```

`validation` chạy lúc Terraform *đánh giá* giá trị biến (plan/apply/console) — **không**
chạy lúc `init`, vì `init` chỉ tải provider/module, chưa đọc giá trị biến nào.

### `sensitive = true` — ẩn ở CLI, KHÔNG ẩn trong state

```bash
terraform apply -input=false -auto-approve
```

```text
  + secret_greeting = (sensitive value)
terraform_data.demo: Creating...
terraform_data.demo: Creation complete after 0s [id=ccbd62e0-89f5-5399-371f-79cbf28c56d7]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

resource_name = "dev-demo-tfvars"
secret_greeting = <sensitive>
```

```bash
terraform show -json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['values']['outputs'])"
```

```text
{'resource_name': {'sensitive': False, 'value': 'dev-demo-tfvars', 'type': 'string'}, 'secret_greeting': {'sensitive': True, 'value': 'shh-demo-tfvars', 'type': 'string'}}
```

`terraform show -json` đọc thẳng ra `shh-demo-tfvars` — plaintext. `sensitive` chỉ là cờ
nói với CLI *"đừng in ra màn hình"*; state và `show -json` vẫn trả đủ giá trị thật. Đúng
điểm đã nói ở [State](state.md): state lưu toàn bộ attribute Terraform biết, không có
khái niệm mã hoá riêng cho `sensitive`.

## Bốn expression cần biết trước khi đọc Modules / `count` vs `for_each`

Chạy thật bằng `terraform console` (REPL, không đụng state):

```text
$ echo '[for n in ["web","api","db"] : upper(n)]' | terraform console
[
  "WEB",
  "API",
  "DB",
]

$ echo 'var.env == "prod" ? "critical" : "normal"' | terraform console
"normal"

$ echo '{for n in ["web","api"] : n => "${var.env}-${n}"}' | terraform console
{
  "api" = "dev-api"
  "web" = "dev-web"
}

$ echo '[{name="a", port=80}, {name="b", port=81}][*].name' | terraform console
[
  "a",
  "b",
]
```

| Expression | Cú pháp | Dùng khi |
|---|---|---|
| String interpolation | `"${var.env}-${var.name}"` | Ghép chuỗi — cũng chạy được không cần `${}` nếu cả biểu thức chỉ có một expression |
| Conditional | `cond ? a : b` | Chọn 1 trong 2 giá trị theo điều kiện (ví dụ size instance theo `env`) |
| `for` (list/map) | `[for x in list : expr]` / `{for x in list : k => v}` | Biến đổi một danh sách/map thành danh sách/map khác — nền của `for_each` |
| Splat `[*]` | `list[*].attribute` | Lấy một attribute từ mọi phần tử trong list — ngắn hơn viết `for` khi chỉ cần trích một field |

## Trade-offs

| `variable` | `locals` |
|---|---|
| Giá trị đến từ bên ngoài, đổi được không sửa code | Giá trị cố định theo expression, đổi phải sửa `.tf` |
| Cần khai `type`, nên dùng cho thứ người gọi *cần* quyết định (tên, size, region) | Dùng cho thứ *tính được* từ variable khác — tránh lặp lại expression ở nhiều resource |
| Có thể có `validation` để chặn giá trị sai ngay từ đầu | Không có validation riêng — sai thì lỗi ở chỗ dùng, khó truy hơn |

## Common Mistakes

- **Viết hoa/thường sai tên biến môi trường.** `TF_VAR_Name` (hoa chữ N) **không** khớp
  `variable "name"` — Terraform chỉ nhận đúng `TF_VAR_name`, phân biệt hoa thường.
- **Tưởng `validation` chạy lúc `init`.** Không — `init` không đọc giá trị biến nào cả,
  lỗi validation chỉ xuất hiện ở `plan`/`apply`/`console`.
- **Tưởng `sensitive = true` là mã hoá.** Nó chỉ ẩn ở CLI; ai đọc được state file hoặc
  chạy `terraform show -json` đều thấy plaintext — xem ví dụ trên.
- **Nhầm `locals` là nơi nhận giá trị từ CLI.** `-var` chỉ gán được cho `variable`,
  không có cú pháp nào gán trực tiếp vào `locals`.

## FAQ

<details>
<summary>Vì sao nên dùng `locals` thay vì lặp lại `"${var.env}-${var.name}"` ở mọi resource?</summary>

Một lần tính, nhiều nơi dùng. Đổi convention đặt tên (ví dụ thêm prefix công ty) chỉ
sửa một chỗ trong `locals`, không phải tìm-thay mọi resource đang lặp lại expression đó.

</details>

<details>
<summary>File `.tfvars` có nên commit vào Git không?</summary>

Tuỳ nội dung. File chỉ chứa giá trị không nhạy cảm (`env = "dev"`, `instance_count = 3`)
nên commit, dùng chung cho team. File chứa secret (password, token) thì **không** commit
— dùng biến môi trường `TF_VAR_*`, hoặc một secret manager, giống nguyên tắc đã nói ở
Common Mistakes của [Providers và Resources](providers-and-resources.md) về credential.

</details>

## Related Topics

- [State](state.md) — nơi `output` (kể cả `sensitive`) bị lưu plaintext
- [Modules](modules.md) — cách `variable`/`output` trở thành giao diện giữa root và module con
- [`count` vs `for_each`](../skills/count-vs-for-each.md) — áp dụng trực tiếp `for` expression và map
- [Lab 5 — S3 với versioning](../tutorials/lab-05-s3-versioning.md) — bài thực hành dùng `variable`/`output` trên AWS thật

## References

- HashiCorp — [Input Variables](https://developer.hashicorp.com/terraform/language/values/variables)
- HashiCorp — [Output Values](https://developer.hashicorp.com/terraform/language/values/outputs)
- HashiCorp — [Local Values](https://developer.hashicorp.com/terraform/language/values/locals)
- HashiCorp — [Expressions](https://developer.hashicorp.com/terraform/language/expressions)
