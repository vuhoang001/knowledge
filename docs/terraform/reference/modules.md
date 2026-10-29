---
title: Modules
sidebar_position: 5
description: "Module là một thư mục .tf được gọi lại nhiều lần với tham số khác nhau — mỗi lần gọi là một bộ resource riêng, nhận diện trong state bằng tiền tố module.<tên>."
tags: [module, terraform, reuse]
domain: devops
category: concept
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Modules

> **Chốt:** Module không phải một khái niệm riêng biệt — **mọi** thư mục Terraform bạn
> từng chạy `apply` đều đã là một module (gọi là **root module**). "Dùng module" chỉ
> là gọi một thư mục `.tf` khác bằng block `module`, truyền `variable` vào, nhận `output`
> ra — giống gọi hàm, không hơn.

## Mục tiêu

Trả lời: root module và child module khác nhau ở đâu, vì sao gọi cùng một module hai
lần với tham số khác nhau lại ra hai bộ resource độc lập, và resource bên trong module
có địa chỉ gì trong state.

Bài này giả định đã đọc [Variables, Outputs và Locals](variables-outputs-locals.md) —
module chỉ là lớp vỏ dùng lại đúng ba khái niệm đó.

## Tổng quan

| Khái niệm | Là gì |
|---|---|
| **Root module** | Thư mục bạn `cd` vào rồi `terraform init`/`apply` — luôn tồn tại, dù không khai `module` nào |
| **Child module** | Thư mục `.tf` khác, được root (hoặc module khác) gọi bằng `module "<name>" { source = ... }` |
| **Module call** | Một khối `module "<name>" { ... }` — mỗi lần gọi là một **instance** riêng của module đó |

`source` có ba dạng phổ biến: local path (`./modules/x`), Terraform Registry
(`terraform-aws-modules/vpc/aws`), hoặc Git URL. Bài này chỉ demo thật **local path** —
registry/Git cần tải qua mạng, không bắt buộc cho phần lý thuyết này; nếu dùng registry,
cách gọi và cách truyền `variable`/nhận `output` giống hệt, chỉ khác giá trị `source`.

## Ví dụ

Chạy thật 2026-10-28, Terraform 1.16.5, provider `hashicorp/local`.

Module con — tạo N file, tên và số lượng tuỳ tham số truyền vào:

```hcl
# modules/filegen/main.tf
variable "names" {
  type = list(string)
}

variable "prefix" {
  type = string
}

resource "local_file" "greet" {
  for_each = toset(var.names)
  filename = "${var.prefix}-${each.key}.txt"
  content  = "hello from ${var.prefix}/${each.key}"
}

output "filenames" {
  value = [for f in local_file.greet : f.filename]
}
```

Root module gọi module con **hai lần**, tham số khác nhau:

```hcl
# main.tf
module "team_a" {
  source = "./modules/filegen"
  names  = ["web", "api"]
  prefix = "teamA"
}

module "team_b" {
  source = "./modules/filegen"
  names  = ["web"]
  prefix = "teamB"
}

output "team_a_files" {
  value = module.team_a.filenames
}

output "team_b_files" {
  value = module.team_b.filenames
}
```

```bash
terraform init -input=false
terraform apply -input=false -auto-approve
```

```text
module.team_b.local_file.greet["web"]: Creating...
module.team_a.local_file.greet["api"]: Creating...
module.team_a.local_file.greet["web"]: Creating...
module.team_b.local_file.greet["web"]: Creation complete after 0s [id=d405eb77318677581d2f0045f99e089010cb76ff]
module.team_a.local_file.greet["web"]: Creation complete after 0s [id=d466b9336a335b7be5dd74b794980953dc312788]
module.team_a.local_file.greet["api"]: Creation complete after 0s [id=a2f0dca81052252a81476d3f4791d105b20400ff]

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:

team_a_files = [
  "teamA-api.txt",
  "teamA-web.txt",
]
team_b_files = [
  "teamB-web.txt",
]
```

**3 resource, không phải 1** — `team_a` sinh 2 file (`names` có 2 phần tử), `team_b`
sinh 1 file. Cùng một module, hai instance độc lập hoàn toàn.

### Địa chỉ resource trong state có tiền tố `module.<tên>`

```bash
terraform state list
```

```text
module.team_a.local_file.greet["api"]
module.team_a.local_file.greet["web"]
module.team_b.local_file.greet["web"]
```

Đây là lý do gọi module hai lần không đụng nhau: `module.team_a.local_file.greet["web"]`
và `module.team_b.local_file.greet["web"]` là hai *địa chỉ khác nhau*, dù tên resource
(`local_file.greet["web"]`) y hệt bên trong từng module. `terraform state mv` khi tách
module cũng thao tác trên chính các địa chỉ có tiền tố này.

### Đổi `source` mà không `init` lại — Terraform chặn thẳng, không chạy ngầm sai

```bash
# sửa source trong main.tf từ ./modules/filegen sang ./modules/filegen2
terraform plan -input=false
```

```text
Error: Module source has changed

  on main.tf line 2, in module "team_a":
   2:   source = "./modules/filegen2"

The source address was changed since this module was installed. Run
"terraform init" to install all modules required by this configuration.
```

Đây là tin tốt hơn nhiều người tưởng: Terraform **không** âm thầm dùng module cũ — nó
chặn bằng lỗi rõ ràng, buộc `terraform init` (hoặc `-upgrade`/`-reconfigure` khi cần tải
lại từ registry) trước khi cho `plan` tiếp.

## Trade-offs

| Không dùng module (lặp code) | Tách thành module |
|---|---|
| Đọc trực tiếp, không phải nhảy qua file khác để hiểu | Phải mở thêm file để thấy `module` thực sự làm gì |
| Sửa một chỗ phải tìm-thay mọi nơi lặp lại | Sửa một chỗ (trong module), mọi instance dùng cùng logic đều đổi theo |
| Hợp cho cấu hình nhỏ, 1-2 resource, không lặp lại | Hợp khi cùng một "khối hạ tầng" (ví dụ: VPC chuẩn, một bộ S3+IAM) được tạo lại nhiều lần với tham số khác |

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| Thiếu `source` trong block `module` | Lỗi cú pháp ngay, không `init` được | `source` là argument bắt buộc, không có default |
| Nhồi quá nhiều logic/resource không liên quan vào một module | Module khó đọc, khó tái sử dụng — mất đúng lợi ích đáng ra có | Một module nên làm **một khối hạ tầng** có ranh giới rõ (ví dụ: "một VPC", không phải "toàn bộ hạ tầng công ty") |
| Tưởng sửa `source` rồi `plan` thẳng là được | Terraform chặn bằng lỗi "Module source has changed" (xem ví dụ trên) — không phải chạy sai mà là chặn cứng | `terraform init` lại sau mỗi lần đổi `source` |

## FAQ

<details>
<summary>Module con có tự thấy biến/local của root module không?</summary>

Không. Module con chỉ nhận đúng những gì root truyền vào qua argument của khối `module`
(khớp với `variable` khai trong module con) — không có biến nào "rò" từ ngoài vào trong
một cách ngầm định. Đây là lý do interface giữa root và module con luôn rõ ràng, đọc
một module là đủ hiểu nó cần gì, không phải đọc cả cây gọi.

</details>

<details>
<summary>Dùng module local path hay module từ Terraform Registry?</summary>

Local path (`./modules/x`) hợp khi module chỉ dùng trong chính project đó, không chia
sẻ ra ngoài. Registry (`terraform-aws-modules/vpc/aws`...) hợp khi cần một khối hạ tầng
chuẩn, đã được cộng đồng kiểm chứng, và không muốn tự viết/duy trì lại (ví dụ VPC AWS
đầy đủ NAT, route table — rất nhiều chi tiết dễ sai nếu viết tay từ đầu).

</details>

## Related Topics

- [Variables, Outputs và Locals](variables-outputs-locals.md) — nền tảng mà module tái sử dụng
- [State](state.md) — vì sao resource trong module có tiền tố `module.<tên>` trong state
- [`count` vs `for_each`](../skills/count-vs-for-each.md) — kỹ thuật dùng ngay trong ví dụ module trên (`for_each = toset(var.names)`)

## References

- HashiCorp — [Modules](https://developer.hashicorp.com/terraform/language/modules)
- Terraform Registry — [Modules](https://registry.terraform.io/browse/modules)
