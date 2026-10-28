---
title: "Quy trình Plan / Apply"
sidebar_position: 3
description: "Vòng lặp duy nhất của Terraform: viết config, xem trước diff bằng plan, rồi mới apply — và ba ký hiệu +/~/- là toàn bộ ngữ pháp của diff đó."
tags: [plan, apply, terraform, idempotency]
domain: devops
category: concept
doc_type: reference
status: review
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Quy trình Plan / Apply

> **Chốt:** Terraform không có lệnh "sửa trực tiếp". Mọi thay đổi đi qua đúng một vòng
> lặp: sửa `.tf` → `plan` (tính trước sẽ làm gì, chưa làm gì cả) → `apply` (mới thật sự
> làm). Bỏ qua `plan` để `apply` thẳng là bỏ qua đúng bước Terraform tồn tại để cung cấp.

## Mục tiêu

Trả lời: `plan` tính toán dựa trên gì, ba ký hiệu `+ ~ -` nghĩa là gì, và vì sao chạy
`apply` hai lần liên tiếp mà không sửa gì thì lần thứ hai **không làm gì cả**
(idempotency) — đây là tính chất Terraform cố tình thiết kế, không phải trùng hợp.

## Tổng quan

`plan` là một **hàm thuần** theo nghĩa: với cùng config + cùng state + cùng thực tế ở
provider, nó luôn tính ra cùng một diff, và **không thực thi gì** — không gọi
Create/Update/Delete. `apply` thực thi đúng diff đó (hoặc tính lại một diff mới nếu
không truyền file plan đã lưu).

Ba hành động, ba ký hiệu, không có hành động thứ tư:

| Ký hiệu | Hành động | Khi nào |
|---|---|---|
| `+` | create | Resource có trong config, chưa có trong state (hoặc có trong state nhưng thực tế đã mất — xem [State](state.md)) |
| `~` | update in-place | Resource đã tồn tại, chỉ attribute nào đó đổi mà provider hỗ trợ sửa tại chỗ |
| `-` | destroy | Resource có trong state, bị xoá khỏi config |
| `-/+` | destroy rồi create (replace) | Attribute đổi nhưng provider **không** hỗ trợ sửa tại chỗ — ví dụ đổi `availability_zone` của một EC2 instance |

## Ví dụ — một vòng đời đầy đủ

Chạy thật 2026-10-28, resource `terraform_data` (built-in, không cần provider).

**1. Lần đầu — chưa có gì trong state → `create`:**

```text
Terraform will perform the following actions:

  # terraform_data.hello will be created
  + resource "terraform_data" "hello" {
      + id     = (known after apply)
      + input  = "hello-terraform"
      + output = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

**2. `apply` đúng diff đó:**

```text
terraform_data.hello: Creating...
terraform_data.hello: Creation complete after 0s [id=e6be0d31-6314-bc75-2956-d669c741504d]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

hello_output = "hello-terraform"
```

**3. Chạy `plan` lại ngay, không sửa gì — idempotency:**

```text
terraform_data.hello: Refreshing state... [id=e6be0d31-6314-bc75-2956-d669c741504d]

No changes. Your infrastructure matches the configuration.
```

**4. Sửa `input` trong config, `plan` lại — lần này là `update in-place`:**

```text
Terraform will perform the following actions:

  # terraform_data.hello will be updated in-place
  ~ resource "terraform_data" "hello" {
        id     = "e6be0d31-6314-bc75-2956-d669c741504d"
      ~ input  = "hello-terraform" -> "hello-terraform-v2"
      ~ output = "hello-terraform" -> (known after apply)
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

**5. Xoá resource khỏi config (hoặc `terraform destroy`) — `destroy`:**

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

Năm bước, đúng vòng lặp: không sửa gì → `No changes`; sửa một attribute sửa-được-tại-chỗ
→ `~`; xoá khỏi config → `-`. Không có bước nào Terraform "đoán" — mọi dòng `+`/`~`/`-`
đều suy ra thẳng từ diff config-vs-state.

## Vì sao `plan` không đáng tin 100% nếu không lưu lại

Chú ý dòng cảnh báo thật xuất hiện sau mọi `plan` không dùng `-out`:

```text
Note: You didn't use the -out option to save this plan, so Terraform can't
guarantee to take exactly these actions if you run "terraform apply" now.
```

Giữa lúc `plan` chạy xong và lúc người xem gõ `apply`, thực tế có thể đã đổi (ai khác
apply trước, hoặc tài nguyên bị sửa ngoài Terraform). `apply` không dùng lại đúng plan
đã xem — nó **tính lại** diff tại thời điểm chạy, trừ khi bạn truyền file đã lưu bằng
`terraform plan -out=tfplan` rồi `terraform apply tfplan`. Đây là cơ chế bắt buộc trong
pipeline CI nghiêm túc: review đúng cái sắp apply, không review một bản có thể đã cũ.

## Trade-offs

| `apply` không review (`-auto-approve`, hoặc apply thẳng không `plan` trước) | `plan` → review → `apply` |
|---|---|
| Nhanh, tiện cho lab/script tự động hoá đã tin tưởng | Có một bước người/CI nhìn thấy đúng cái sắp xảy ra trước khi nó xảy ra |
| Không ai thấy được một `destroy` ngoài ý muốn trước khi nó chạy | Bắt được sớm các trường hợp `-/+` (destroy rồi tạo lại) tưởng là update nhẹ |
| Hợp cho CI đã có gate khác (test, approval ở bước trước) | Bắt buộc khi có nhiều người cùng chạm vào một state |

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| `apply -auto-approve` thành quen tay cả ở môi trường có dữ liệu thật | Một `destroy` ngoài ý muốn (ví dụ sửa `for_each` làm đổi key) chạy luôn, không ai kịp thấy | Chỉ `-auto-approve` trong CI đã có review ở bước khác (PR plan comment, approval gate) |
| Đọc plan chỉ nhìn số tổng (`Plan: 1 to add...`) mà không đọc chi tiết | Bỏ lỡ một dòng `-/+` lẫn giữa nhiều dòng `~` — tưởng là sửa nhẹ, thật ra là xoá-tạo-lại | Luôn lướt từng resource trong plan, không chỉ dòng tổng kết |
| `apply` một plan file đã lưu từ lâu, thực tế đã đổi nhiều | Terraform áp một hành động không còn đúng với thực tế hiện tại | Plan file chỉ đáng tin trong một khoảng thời gian ngắn; `plan` lại nếu đã lâu |

## FAQ

<details>
<summary>Chạy <code>apply</code> hai lần liên tiếp, không sửa gì — lần hai làm gì?</summary>

Không làm gì với hạ tầng. Nó vẫn refresh state, tính lại diff, thấy diff rỗng, báo
"No changes" và dừng — không gọi Create/Update/Delete nào. Đây chính là tính chất
**idempotent**: áp dụng lại nhiều lần một config không đổi phải luôn ra cùng một kết
quả, không nhân bản tài nguyên.

</details>

<details>
<summary><code>-/+</code> (destroy rồi create) khác <code>~</code> (update in-place) ở đâu, và vì sao quan trọng?</summary>

`~` là provider API cho phép sửa tại chỗ (ví dụ đổi tag của một resource). `-/+` là
provider **không** cho sửa attribute đó mà không xoá-tạo-lại (ví dụ đổi tên một resource
không hỗ trợ rename). Quan trọng vì `-/+` trên một resource có dữ liệu (database, volume)
nghĩa là **mất dữ liệu** nếu không có `create_before_destroy` hoặc không backup trước.

</details>

## Related Topics

- [State](state.md) — một trong hai đầu vào mà `plan` so sánh
- [Providers và Resources](providers-and-resources.md) — provider là bên thực thi khi `apply` gọi Create/Update/Delete
- [Lab: vòng đời đầu tiên và phát hiện drift](../tutorials/lab-00-first-apply.md) — tái hiện đúng năm bước ở trên

## References

- HashiCorp — [`terraform plan`](https://developer.hashicorp.com/terraform/cli/commands/plan)
- HashiCorp — [`terraform apply`](https://developer.hashicorp.com/terraform/cli/commands/apply)
