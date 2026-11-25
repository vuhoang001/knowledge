---
title: Expressions và Functions
sidebar_position: 7
description: "Conditional, for-expression, splat, dynamic block là bốn cách HCL biến đổi dữ liệu — không có chúng thì mọi config chỉ gõ được giá trị tĩnh, không tính toán được gì."
tags: [expressions, functions, hcl, terraform]
domain: devops
category: concept
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-10-29
---

# Expressions và Functions

> **Chốt:** HCL không phải chỉ để gõ `key = value` tĩnh. Bốn thứ sau biến nó thành một
> ngôn ngữ tính toán thật: **conditional** (`a ? b : c`), **for-expression** (biến một
> list/map thành list/map khác), **splat** (`[*]`, lấy một attribute từ nhiều instance),
> **dynamic block** (sinh nhiều block lồng từ một list/map). Thiếu bốn thứ này, mọi
> `variable` chỉ gõ được giá trị cố định — không tính toán, không lặp được gì.

## Mục tiêu

Trả lời: viết sao để từ MỘT danh sách/map đầu vào, sinh ra nhiều giá trị/nhiều block mà
không copy-paste; và những hàm built-in nào dùng hằng ngày đủ để viết phần lớn config.

## Ví dụ

Chạy thật 2026-10-29 — Terraform v1.16.5, provider `hashicorp/local` v2.9.1,
`hashicorp/docker` (kreuzwerker) v3.x.

### Conditional — `a ? b : c`

```hcl
variable "env" {
  type    = string
  default = "staging"
}

locals {
  tier = var.env == "prod" ? "large" : "small"
}

output "tier" {
  value = local.tier
}
```

```text
tier = "small"
```

Không có `if`/`else` trong HCL — một expression luôn phải *trả về một giá trị*, nên
rẽ nhánh chỉ có dạng ternary này.

### For-expression — biến list/map thành list/map khác

```hcl
variable "names" {
  type    = list(string)
  default = ["anh", "binh", "chi"]
}

locals {
  shout   = [for n in var.names : upper(n)]        # list -> list
  lengths = { for n in var.names : n => length(n) } # list -> map
}

output "shout"   { value = local.shout }
output "lengths" { value = local.lengths }
```

```text
lengths = {
  "anh" = 3
  "binh" = 4
  "chi" = 3
}
shout = [
  "ANH",
  "BINH",
  "CHI",
]
```

Cú pháp quyết định kiểu trả về: `[for ... : x]` ra **list**, `{for ... : k => v}` ra
**map**. Đây chính là thứ dùng ở [Lab 7 — VPC/subnet](../tutorials/lab-07-vpc-subnet-sg.md)
để biến `aws_subnet.this` (một map resource instance, sinh bởi `for_each`) thành
`{ for k, s in aws_subnet.this : k => s.id }` — map tên subnet → id thật.

### Splat — lấy một attribute từ nhiều instance

```hcl
resource "local_file" "multi" {
  for_each = toset(var.names)
  filename = "${path.module}/${each.key}.txt"
  content  = each.key
}

output "all_filenames_splat" {
  value = values(local_file.multi)[*].filename
}
```

```text
all_filenames_splat = [
  "./anh.txt",
  "./binh.txt",
  "./chi.txt",
]
```

`[*]` là cách viết tắt của `[for v in values(local_file.multi) : v.filename]` — dùng
khi chỉ cần **một attribute** từ toàn bộ instance, không cần biến đổi gì thêm.

### Dynamic block — sinh nhiều block lồng từ một list

Một nested block (như `ports` trong `docker_container`) viết tay thì phải lặp lại cả
khối cho mỗi port. `dynamic` sinh nó từ một list/map:

```hcl
variable "port_map" {
  type = list(object({ internal = number, external = number }))
  default = [
    { internal = 80, external = 8080 },
    { internal = 443, external = 8443 },
  ]
}

resource "docker_container" "web" {
  name  = "tf-dynamic-demo"
  image = docker_image.nginx.image_id

  dynamic "ports" {
    for_each = var.port_map
    content {
      internal = ports.value.internal
      external = ports.value.external
    }
  }
}
```

```bash
$ terraform state show docker_container.web
```

```text
    ports {
        external = 8080
        internal = 80
        ip       = "0.0.0.0"
        protocol = "tcp"
    }
    ports {
        external = 8443
        internal = 443
        ip       = "0.0.0.0"
        protocol = "tcp"
    }
```

Hai phần tử trong `var.port_map` sinh ra đúng hai khối `ports {}` lồng trong resource —
thêm phần tử thứ ba vào list là có thêm một khối `ports {}` nữa, không phải sửa resource.

### Bốn hàm dùng hằng ngày — chạy qua `terraform console`

```bash
$ echo 'merge({a=1,b=2},{b=3,c=4})' | terraform console
```

```text
{
  "a" = 1
  "b" = 3
  "c" = 4
}
```

`merge` gộp nhiều map, **key trùng thì map sau thắng** (`b` thành `3`, không phải `2`).

```bash
$ echo 'join(",", ["a","b","c"])' | terraform console
```

```text
"a,b,c"
```

```bash
$ echo 'lookup({a=1,b=2}, "c", "khong-co")' | terraform console
```

```text
"khong-co"
```

`lookup(map, key, default)` — đọc map an toàn, trả `default` nếu thiếu key, thay vì lỗi.

```bash
$ echo 'try({a=1}["b"], "fallback-ok")' | terraform console
```

```text
"fallback-ok"
```

```bash
$ echo '{a=1}["b"]' | terraform console   # khong boc try()
```

```text
Error: Invalid index

The given key does not identify an element in this collection value.
```

`try()` chỉ bắt được lỗi **runtime** (index không tồn tại, attribute optional thiếu
giá trị...). Nó **không** cứu được lỗi cấu hình — tham chiếu một `variable` chưa khai
báo vẫn làm `terraform console`/`plan` chết thẳng, dù có bọc `try()` hay không, vì đó
là lỗi phát hiện lúc parse config, trước khi có giá trị nào để "thử".

## Trade-offs

| Công cụ | Dùng khi | Không dùng khi |
|---|---|---|
| Conditional `? :` | Một giá trị, hai lựa chọn | Nhiều hơn hai nhánh — lồng ternary đọc rất khó, nên chuyển sang `lookup`/map tra cứu |
| For-expression | Biến đổi TOÀN BỘ list/map theo một quy tắc | Chỉ cần lọc/lấy một phần tử đơn — dùng index/`lookup` trực tiếp cho rõ |
| Splat `[*]` | Chỉ cần một attribute từ nhiều instance | Cần biến đổi giá trị đó (ví dụ `upper()`) — quay lại for-expression đầy đủ |
| Dynamic block | Số lượng nested block **do dữ liệu quyết định** (biến theo input) | Số block cố định, biết trước — viết tay rõ hơn, dynamic chỉ thêm độ khó đọc |

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| Lồng ternary 2-3 tầng (`a ? (b ? x : y) : z`) | Đọc không nổi, dễ đảo nhầm điều kiện | Chuyển sang map tra cứu (`local.config_by_env[var.env]`) khi có hơn hai nhánh |
| Dùng `for` để chỉ lọc/lấy một phần tử | Code dài hơn cần thiết, chạy qua toàn bộ list chỉ để lấy một giá trị | Dùng `lookup()`, index trực tiếp, hoặc `one()` nếu chắc chỉ có một kết quả |
| Bọc `try()` quanh một lỗi **cấu hình** (biến không tồn tại, sai tên resource) | `try()` không cứu được, lỗi vẫn nổ — tưởng đã an toàn | Chỉ dùng `try()` cho lỗi runtime thật (index/optional attribute), không phải lỗi đặt sai tên |
| `dynamic` cho một block **luôn chỉ có một phần tử cố định** | Thêm một tầng gián tiếp không cần thiết, khó đọc hơn viết tay | Viết thẳng block đó, để `dynamic` lại cho trường hợp số lượng thật sự biến động |

## FAQ

<details>
<summary>For-expression có lọc được phần tử không, hay chỉ biến đổi?</summary>

Lọc được, bằng mệnh đề `if` ở cuối: `[for n in var.names : n if length(n) > 3]` chỉ giữ
tên dài hơn 3 ký tự. Cùng cú pháp áp dụng cho dạng map.

</details>

<details>
<summary>Splat <code>[*]</code> có dùng được trên map (kết quả của <code>for_each</code>) không?</summary>

Không trực tiếp — `[*]` chỉ áp lên **list/tuple**. Với map (resource dùng `for_each`),
phải chuyển qua `values(...)` trước (như ví dụ trên) hoặc dùng for-expression dạng đầy
đủ `[for v in local_file.multi : v.filename]`.

</details>

## Related Topics

- [Data Sources](data-sources.md) — thường kết hợp for-expression để biến kết quả đọc được thành danh sách dùng tiếp
- [Modules](modules.md) — `for_each` trên module cũng sinh ra map, splat/for-expression áp dụng y hệt
- [`count` vs `for_each`](../skills/count-vs-for-each.md) — `for_each` là nguồn dữ liệu phổ biến nhất cho for-expression/splat ở trên

## References

- HashiCorp — [Expressions docs](https://developer.hashicorp.com/terraform/language/expressions)
- HashiCorp — [Built-in Functions](https://developer.hashicorp.com/terraform/language/functions)
