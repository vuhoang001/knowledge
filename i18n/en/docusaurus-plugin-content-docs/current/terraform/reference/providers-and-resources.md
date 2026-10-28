---
title: Providers và Resources
i18n_status: untranslated
sidebar_position: 2
description: "Provider là plugin biết nói chuyện với một API cụ thể; resource là lời khai \"tôi muốn thứ này tồn tại\" — Terraform tự nó không biết tạo gì cả."
tags: [provider, resource, terraform]
domain: devops
category: concept
doc_type: reference
status: review
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Providers và Resources

> **Chốt:** Terraform core (file nhị phân `terraform`) không biết cách tạo một EC2
> instance, một file, hay bất cứ thứ gì cả. Nó chỉ biết đọc HCL, dựng graph phụ thuộc,
> và gọi đúng hàm Create/Read/Update/Delete của **provider**. Provider mới là nơi chứa
> logic "làm sao để tạo ra cái này thật".

## Mục tiêu

Trả lời: khi viết `resource "aws_instance" "web" { ... }`, ai thật sự thực thi việc
tạo máy, và vì sao `terraform init` phải tải thứ gì đó trước khi `plan` chạy được.

## Tổng quan

Ba khái niệm xếp lồng vào nhau:

| Khái niệm | Là gì | Ví dụ |
|---|---|---|
| **Provider** | Plugin (binary riêng, tải qua registry) biết gọi API của một hệ thống | `hashicorp/aws`, `hashicorp/local`, `hashicorp/github` |
| **Resource** | Một khối khai báo trong provider đó — "loại thứ" provider biết quản lý | `aws_instance`, `local_file`, `github_repository` |
| **Resource instance** | Một resource block, sau khi áp `count`/`for_each`, ứng với 0..N thực thể thật | `aws_instance.web[0]`, `aws_instance.web[1]` |

**Một ngoại lệ đáng nhớ:** `terraform_data` không thuộc provider nào — nó là resource
**built-in** của Terraform core, không cần `terraform init` tải gì, dùng để lưu một
giá trị tuỳ ý trong state hoặc buộc một hành động chạy lại (kết hợp `replace_triggered_by`).
Phần lớn resource bạn dùng hằng ngày thì **thuộc một provider** và cần `init`.

## Ví dụ

Chạy thật 2026-10-28. Hai cách khởi tạo khác hẳn nhau tuỳ resource thuộc provider nào.

### Không cần provider — `terraform_data` (built-in)

```hcl
resource "terraform_data" "hello" {
  input = "hello-terraform"
}
```

```bash
$ terraform init
```

```text
Initializing the backend...

Initializing provider plugins...
- terraform.io/builtin/terraform is built in to Terraform

Terraform has been successfully initialized!
```

Không có bước tải gì — `terraform.io/builtin/terraform` nằm sẵn trong chính binary
`terraform`.

### Cần provider — `local_file` (plugin `hashicorp/local`)

```hcl
terraform {
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
```

```bash
$ terraform init
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
```

Lần này `init` thật sự tải một binary provider riêng (`hashicorp/local` 2.9.1) từ
registry, và ghi lại phiên bản chính xác đã chọn vào `.terraform.lock.hcl`.

## `required_providers` và lock file

`required_providers` khai *khoảng* version được phép (`~> 2.5` = từ 2.5.0 tới dưới
3.0.0). `.terraform.lock.hcl` ghi *phiên bản cụ thể* đã được chọn lần `init` đầu, kèm
checksum của binary provider đó.

| File | Vai trò | Có nên commit vào Git không |
|---|---|---|
| `required_providers` (trong `.tf`) | Cho phép dải version nào | Có — là code |
| `.terraform.lock.hcl` | Ghim đúng một version đã verify, cho mọi máy/CI dùng chung | **Có** — HashiCorp khuyến nghị commit, khác với `.terraform/` (thư mục cache binary, không commit) |

Không commit lock file thì máy bạn và pipeline CI có thể tải hai version khác nhau của
cùng một provider — plan chạy ra khác nhau mà không ai sửa gì trong code.

## Trade-offs

| Resource built-in (`terraform_data`, `terraform_remote_state`) | Resource qua provider |
|---|---|
| Không cần `init` tải gì, chạy offline | Cần tải provider — cần mạng lần `init` đầu |
| Phạm vi rất hẹp: lưu giá trị, trigger lại, đọc state khác | Phạm vi là toàn bộ API của hệ thống đích (AWS có hơn 1.000 resource type) |
| Không có khái niệm "credential" | Hầu hết cần cấu hình xác thực trong `provider` block (access key, token, kubeconfig...) |

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| Không commit `.terraform.lock.hcl` | CI tải version provider khác máy dev → plan khác nhau không rõ lý do | Luôn commit file này, giống `package-lock.json` |
| Để nhiều `provider` block cùng loại không có `alias` khi cần đa region/đa account | Terraform áp provider mặc định cho resource không khai alias — dễ tạo nhầm region | Đặt `alias` rõ ràng, resource nào dùng provider nào phải khai bằng tham số `provider =` |
| Đưa credential thật (access key) thẳng vào `provider` block rồi commit | Credential lộ trong Git history vĩnh viễn | Dùng biến môi trường chuẩn của provider (`AWS_ACCESS_KEY_ID`...) hoặc vault, không hard-code |
| Tưởng đổi `version` trong `required_providers` là xong | `init` không tự nâng version nếu lock file còn ghim bản cũ | `terraform init -upgrade` để tải lại và cập nhật lock file |

## FAQ

<details>
<summary>Một resource có thể "thuộc" nhiều provider không?</summary>

Không. Mỗi resource type (`aws_instance`, `local_file`...) gắn cứng với đúng một
provider nguồn (`hashicorp/aws`, `hashicorp/local`). Nhưng một file `.tf` có thể dùng
nhiều resource từ nhiều provider khác nhau cùng lúc — đó là cách Terraform tạo hạ tầng
"lai" (ví dụ: tạo DNS record ở Cloudflare đồng thời với EC2 instance ở AWS).

</details>

<details>
<summary>Vì sao <code>terraform init</code> phải chạy lại sau khi sửa <code>required_providers</code>?</summary>

`init` là bước duy nhất tải/cập nhật provider binary và ghi lock file. Sửa
`required_providers` mà không `init` lại thì Terraform vẫn dùng provider đã tải trước
đó — có thể không khớp version mới khai, và `plan`/`apply` sẽ báo lỗi hoặc dùng sai bản.

</details>

## Related Topics

- [State](state.md) — nơi attribute do provider trả về được lưu lại
- [Quy trình Plan/Apply](plan-apply-workflow.md) — provider là bên thực thi Create/Update/Delete trong mỗi bước apply
- [Lab: vòng đời đầu tiên và phát hiện drift](../tutorials/lab-00-first-apply.md) — chạy cả hai ví dụ trên

## References

- HashiCorp — [Providers docs](https://developer.hashicorp.com/terraform/language/providers)
- Terraform Registry — [hashicorp/local](https://registry.terraform.io/providers/hashicorp/local/latest)
