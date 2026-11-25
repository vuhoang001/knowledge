---
title: Lifecycle Meta-arguments
sidebar_position: 4
description: "create_before_destroy đổi thứ tự replace; prevent_destroy chặn hẳn destroy bằng lỗi; ignore_changes làm Terraform im lặng bỏ qua một diff config dù resource thật không đổi gì. Ba cái vá ba lớp lỗi khác nhau, không thay thế nhau được."
tags: [lifecycle, terraform, create-before-destroy, prevent-destroy, ignore-changes]
domain: devops
category: tool
doc_type: skill
status: review
difficulty: intermediate
verified_at:
updated: 2026-10-29
---

# Lifecycle Meta-arguments

> **Chốt:** Khối `lifecycle {}` không tạo ra hành vi mới — nó chỉ **đổi cách Terraform
> xử lý một replace/destroy đã được quyết định sẵn**. `create_before_destroy` đổi
> **thứ tự**. `prevent_destroy` biến một destroy hợp lệ thành **lỗi**. `ignore_changes`
> làm Terraform **vờ như không thấy** một phần diff config. Ba cái, ba vấn đề khác hẳn
> nhau — ghép nhầm cái này vào tình huống của cái khác không giải quyết được gì.

## Mục tiêu

Thấy tận mắt từng tuỳ chọn đổi output `plan`/`apply` thế nào, trên đúng một resource,
để không còn nhầm "cái nào xử lý tình huống nào".

## Ví dụ — xuyên suốt: một `local_file` bị buộc replace nhiều lần

Chạy thật 2026-10-29 — Terraform v1.16.5, provider `hashicorp/local` v2.9.1. Đổi
`filename` của `local_file` luôn **buộc replace** (thuộc tính này là `ForceNew`) — dùng
đúng đặc điểm này để quan sát thứ tự destroy/create.

### Mặc định: destroy trước, create sau

```hcl
resource "local_file" "cfg" {
  filename = "${path.module}/v1.txt"
  content  = "version=1"
}
```

```bash
$ terraform apply -auto-approve   # doi filename v1.txt -> v2.txt
```

```text
local_file.cfg: Destroying...
local_file.cfg: Destruction complete after 0s
local_file.cfg: Creating...
local_file.cfg: Creation complete after 0s
```

Trong một khoảng ngắn giữa hai dòng này, **không có resource nào tồn tại** — nếu đây
là một server duy nhất chịu traffic, đây chính là khoảng downtime.

### `create_before_destroy` — đảo thứ tự, không bao giờ "mất" cả hai cùng lúc

```hcl
resource "local_file" "cfg" {
  filename = "${path.module}/v2.txt"
  content  = "version=1"

  lifecycle {
    create_before_destroy = true
  }
}
```

```bash
$ terraform apply -auto-approve   # doi filename v2.txt -> v3.txt
```

```text
local_file.cfg: Creating...
local_file.cfg: Creation complete after 0s
local_file.cfg (deposed object a57530fd): Destroying...
local_file.cfg: Destruction complete after 0s
```

Bản mới được tạo **trước**, bản cũ (giờ gọi là *deposed object* — một địa chỉ nội bộ,
tồn tại song song với bản mới trong lúc chuyển giao) mới bị xoá sau. Luôn có ít nhất
một bản tồn tại tại mọi thời điểm. Đánh đổi: cần tài nguyên đủ để tồn tại **cả hai
cùng lúc** — với resource có tên/địa chỉ cố định (ví dụ domain, bucket name toàn cục),
tạo bản mới trước có thể lỗi "đã tồn tại" nếu không đổi được tên.

### `prevent_destroy` — biến destroy thành lỗi cứng

```hcl
resource "local_file" "cfg" {
  filename = "${path.module}/v3.txt"
  content  = "version=1"

  lifecycle {
    prevent_destroy = true
  }
}
```

```bash
$ terraform destroy -auto-approve
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

Lỗi nổ ra ở `plan`/`apply`, **trước khi** động vào resource thật — khác hẳn
"xác nhận rồi mới hỏi lại", đây là chặn cứng không cho qua. Dùng cho resource có hậu
quả phá hoại nếu xoá nhầm (database production, state bucket).

### `ignore_changes` — im lặng bỏ qua một phần config diff

```hcl
resource "local_file" "cfg" {
  filename = "${path.module}/v3.txt"
  content  = "version=1-comment-moi"   # da sua content trong config

  lifecycle {
    ignore_changes = [content]
  }
}
```

```bash
$ terraform plan
```

```text
No changes. Your infrastructure matches the configuration.
```

**So sánh, bỏ `ignore_changes` đi** rồi `plan` lại chính config vừa đổi `content`:

```text
Plan: 1 to add, 0 to change, 1 to destroy.
```

Cùng một thay đổi config (`content` khác giá trị cũ), nhưng có `ignore_changes` thì
Terraform **không hề thấy** — kể cả khi thay đổi đó đáng ra buộc replace. Dùng khi một
attribute bị sửa bởi **thứ khác ngoài Terraform** (autoscaling tự đổi `desired_count`,
image bị rebuild tự động) và bạn không muốn Terraform "sửa lại" nó mỗi lần `apply`.

## Trade-offs

| Tuỳ chọn | Vá lớp lỗi nào | Giá phải trả |
|---|---|---|
| `create_before_destroy` | Downtime khi replace resource duy nhất phục vụ traffic | Cần tồn tại được cả hai bản cùng lúc (tên/địa chỉ không được cố định tuyệt đối) |
| `prevent_destroy` | Xoá nhầm resource quan trọng qua một đổi config vô ý | Phải tắt nó đi (sửa code, không chỉ `-target`) mới xoá được *hợp lệ* khi thật sự cần |
| `ignore_changes` | Terraform liên tục "sửa lại" một attribute do hệ thống khác quản lý | Terraform **không còn kiểm soát** attribute đó — drift ở đây sẽ không bao giờ hiện ra ở `plan` |

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| Dùng `ignore_changes` để "cho qua" một lỗi không hiểu, thay vì vì có hệ thống khác quản lý attribute đó thật | Drift thật (ví dụ ai đó đổi tay) không bao giờ bị phát hiện nữa, kể cả khi bạn MUỐN biết | Chỉ `ignore_changes` cho đúng attribute có lý do rõ ràng bị thay đổi bên ngoài; audit định kỳ bằng cách tạm bỏ nó và `plan` xem lệch bao nhiêu |
| Tưởng `prevent_destroy` chặn luôn cả `terraform state rm` | Không — `state rm` chỉ xoá khỏi state, không qua logic `lifecycle`; resource thật vẫn còn nhưng Terraform đã "quên" quản lý, không có gì ngăn ai đó destroy nó sau khi đã rm khỏi state | Hiểu `prevent_destroy` chỉ chặn đúng hành động "Terraform tự destroy", không bảo vệ khỏi mọi cách resource biến mất |
| `create_before_destroy` trên resource có **tên toàn cục duy nhất** (bucket S3, domain) | Bản mới tạo trước bị lỗi "đã tồn tại" vì bản cũ (cùng tên) chưa bị xoá | Chỉ dùng khi resource có cách tồn tại song song (tên sinh tự động, hoặc thật sự đổi tên được) |

## FAQ

<details>
<summary>Ba tuỳ chọn này có dùng chung được trong một khối <code>lifecycle {}</code> không?</summary>

Được — `lifecycle {}` nhận cả `create_before_destroy`, `prevent_destroy`,
`ignore_changes` cùng lúc nếu tình huống cần cả ba. Chúng xử lý ba khâu khác nhau
(thứ tự, chặn destroy, bỏ qua diff) nên không xung đột logic với nhau.

</details>

<details>
<summary><code>ignore_changes = all</code> khác gì liệt kê từng attribute?</summary>

`ignore_changes = all` bỏ qua **toàn bộ** thay đổi của resource đó, không riêng một
attribute — sau lần tạo đầu, Terraform coi như resource này "đứng yên" vĩnh viễn trừ
khi bị xoá khỏi state rồi import lại. Rất hiếm khi cần tới mức này; liệt kê đúng
attribute cụ thể để giữ khả năng kiểm soát phần còn lại.

</details>

## Related Topics

- [Quy trình Plan/Apply](../reference/plan-apply-workflow.md) — `lifecycle` can thiệp đúng vào bước Terraform quyết định hành động nào cho mỗi resource
- [State](../reference/state.md) — `ignore_changes` làm một phần config không còn khớp với state mà Terraform chủ động bỏ qua
- [Provisioners](provisioners.md) — một provisioner thất bại ở lần tạo cũng buộc resource bị *tainted*, hành xử giống lớp replace ở đây

## References

- HashiCorp — [`lifecycle` meta-argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
