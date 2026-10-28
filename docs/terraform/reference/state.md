---
title: State
sidebar_position: 1
description: "Terraform chỉ biết cái nó NHỚ, không phải cái đang thật sự tồn tại ngoài đời — và hai thứ đó lệch nhau là nguồn của hầu hết lỗi khi dùng Terraform."
tags: [state, terraform, drift]
domain: devops
category: concept
doc_type: reference
status: review
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# State

> **Chốt:** Terraform không nói chuyện trực tiếp với "hạ tầng thật" mỗi lần bạn gõ lệnh.
> Nó so sánh config với một file JSON gọi là **state** — bản ghi chép Terraform tự viết
> cho chính nó. Thật và state **lệch nhau** là nguồn gốc của phần lớn bất ngờ khi dùng
> Terraform, và lệch theo cách rất cụ thể, đoán trước được.

## Mục tiêu

Trả lời câu hỏi: khi gõ `terraform plan`, Terraform đang so sánh **cái gì** với
**cái gì**? Không trả lời đúng câu này thì không hiểu được vì sao `plan` đôi khi nói
"No changes" trong khi hạ tầng thật đã đổi, hoặc vì sao xoá nhầm state là mất quyền
quản lý tài nguyên mà không mất tài nguyên.

## Tổng quan

Mỗi lần chạy, Terraform làm ba việc theo thứ tự:

1. **Đọc config** (file `.tf`) — bạn *muốn* gì.
2. **Refresh state** — gọi API thật của provider để hỏi "mấy ID này bây giờ ra sao",
   rồi cập nhật lại state trong bộ nhớ (từ Terraform 0.15 việc này nằm lẫn vào bước 3,
   không còn là lệnh `refresh` tách riêng, nhưng hành vi vẫn vậy).
3. **So sánh** config (muốn) với state đã refresh (hiện có) → sinh ra plan.

Ba đối tượng, không phải hai:

```text
Config (.tf)  ──╮
                 ├──  terraform plan  ──>  diff
State (.tfstate)─╯            ↑
                               │
                   Terraform refresh state bằng
                   cách hỏi provider API — KHÔNG
                   phải đọc config ngược lại
```

**State không phải bản sao của hạ tầng thật — nó là trí nhớ của Terraform về hạ tầng
thật.** Hai thứ lệch nhau khi ai đó sửa/xoá tài nguyên bằng console, CLI của provider,
hoặc một công cụ khác, mà không đi qua Terraform.

## Ví dụ

Chạy thật 2026-10-28, Terraform 1.16.5, provider `hashicorp/local` 2.9.1.

Tạo một resource thật — một file trên đĩa, qua provider `local`:

```hcl
resource "local_file" "greeting" {
  filename = "${path.module}/greeting.txt"
  content  = "hello-terraform"
}
```

```bash
$ terraform apply -auto-approve
```

```text
Terraform will perform the following actions:

  # local_file.greeting will be created
  + resource "local_file" "greeting" {
      + content  = "hello-terraform"
      + filename = "./greeting.txt"
      + id       = (known after apply)
      ...
    }

local_file.greeting: Creating...
local_file.greeting: Creation complete after 0s [id=d3f2a7f35ab9db57fa9caddef8ea95af94207dc7]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

Chạy lại `plan` ngay — không đổi gì cả:

```text
local_file.greeting: Refreshing state... [id=d3f2a7f35ab9db57fa9caddef8ea95af94207dc7]

No changes. Your infrastructure matches the configuration.
```

Giờ xoá file **bằng tay**, không qua Terraform — đúng như ai đó `rm` nhầm, hoặc một
script dọn dẹp khác đụng vào:

```bash
$ rm greeting.txt
$ terraform plan
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

**Đây chính là drift detection.** Bước "Refreshing state" hỏi provider `local`
"file này còn tồn tại không" — provider trả lời "không" — Terraform cập nhật lại hiểu
biết của nó, rồi nhận ra state (sau refresh) không còn khớp config → `+ create`,
không phải "no changes", không phải lỗi. Terraform **không** hỏi "ai xoá, lúc nào, vì
sao" — nó chỉ biết trạng thái hiện tại khác điều bạn muốn, và việc duy nhất nó biết làm
là tạo lại.

## Cấu trúc file state

`terraform.tfstate` là JSON, đọc được bằng mắt nhưng **không được sửa tay**:

```json
{
  "version": 4,
  "terraform_version": "1.16.5",
  "serial": 6,
  "lineage": "920caaa3-a36c-df73-b602-835315220f4b",
  "outputs": {},
  "resources": []
}
```

| Trường | Ý nghĩa |
|---|---|
| `serial` | Tăng mỗi lần state đổi — dùng để phát hiện hai người apply cùng lúc ghi đè nhau |
| `lineage` | ID của "dòng dõi" state này — đổi backend mà lineage không khớp thì Terraform từ chối, tránh trộn nhầm hai state không liên quan |
| `resources[]` | Mỗi resource trong config tương ứng một hoặc nhiều "instance" ở đây, kèm toàn bộ attribute đã biết (không chỉ ID) |

Vì sao không sửa tay: `serial`/`lineage` là cơ chế chống ghi đè, và attribute trong
`resources[]` phải khớp đúng *shape* mà provider mong đợi — sai một dấu phẩy hay một
kiểu dữ liệu là lần `apply` tiếp theo lỗi khó hiểu, hoặc tệ hơn, Terraform tưởng
resource đã đổi và đi sửa/xoá nhầm tài nguyên thật. Muốn đổi state thì dùng lệnh
`terraform state <subcommand>` (`mv`, `rm`, `show`, `list`) — xem phần Kỹ năng (đang
viết) — không mở file ra gõ tay.

## Trade-offs

| State cục bộ (`terraform.tfstate` trên máy) | State từ xa (backend: S3, Terraform Cloud, ...) |
|---|---|
| Không cần dựng gì thêm, chạy ngay | Cần dựng backend trước khi `init` |
| Chỉ một người apply được cùng lúc — không ai khác thấy state | Nhiều người/CI cùng apply được, có **lock** chống ghi đè |
| Mất file = mất toàn bộ khả năng quản lý tài nguyên đó bằng Terraform | State được lưu bền, có versioning (S3 + DynamoDB lock, hoặc Terraform Cloud) |
| Hợp cho học, lab, prototype | Bắt buộc cho bất cứ gì chạy thật với nhiều người chạm vào |

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| Sửa tay file `.tfstate` | `apply` lỗi lạ, hoặc Terraform xoá/sửa nhầm tài nguyên thật | Dùng `terraform state mv/rm`, không mở file ra gõ |
| Commit `terraform.tfstate` vào Git | State thường chứa **plaintext** của attribute nhạy cảm (password khởi tạo DB, private key) — xem Common Mistakes ở `providers-and-resources` | `.gitignore` `*.tfstate*`, dùng backend từ xa |
| Không có backend remote khi có >1 người chạy | Hai lần `apply` song song ghi đè `serial`, một bên "thắng" làm bên kia mất tác dụng âm thầm | Backend hỗ trợ lock (S3+DynamoDB, Terraform Cloud) ngay từ ngày đầu, không đợi tới lúc có người thứ hai |
| Xoá resource ngoài Terraform rồi quên | `plan` lần sau báo `+ create` — tưởng là bug, thật ra là drift detection đang làm đúng việc | Đọc kỹ `plan`: action `+` sau khi không đổi config nghĩa là thực tế đã mất, không phải Terraform "bịa" việc |

## FAQ

<details>
<summary>Xoá <code>terraform.tfstate</code> thì tài nguyên thật có bị xoá theo không?</summary>

Không. Tài nguyên thật (VM, file, bucket...) vẫn còn nguyên — Terraform chỉ **mất trí
nhớ** về nó. Hệ quả: `terraform apply` lần sau sẽ cố **tạo mới** resource trùng tên,
và với nhiều provider điều đó nghĩa là tạo trùng hoặc lỗi "đã tồn tại". Muốn Terraform
quản lý lại tài nguyên cũ phải `terraform import`.

</details>

<details>
<summary><code>terraform plan</code> báo "No changes" — điều đó chứng minh được gì?</summary>

Chỉ chứng minh: config khớp với state **sau khi đã refresh từ provider**. Nó không
chứng minh hạ tầng "đúng" theo nghĩa nghiệp vụ — ví dụ một security group mở `0.0.0.0/0`
mà config cũ đã viết vậy thì `plan` vẫn "No changes", dù đó là một lỗi bảo mật.

</details>

<details>
<summary>State lưu attribute nào — chỉ ID, hay toàn bộ?</summary>

Toàn bộ attribute Terraform biết về resource đó, không chỉ ID. Đó là lý do `terraform
show` đọc được đầy đủ thông tin mà không cần gọi lại provider, và cũng là lý do state
là nơi dữ liệu nhạy cảm (password, token sinh ra lúc tạo) bị lưu plaintext nếu không
cẩn thận.

</details>

## Related Topics

- [Providers và Resources](providers-and-resources.md) — ai sinh ra attribute nằm trong state
- [Quy trình Plan/Apply](plan-apply-workflow.md) — state là một trong ba đầu vào của mọi `plan`
- [Lab: vòng đời đầu tiên và phát hiện drift](../tutorials/lab-00-first-apply.md) — chạy lại đúng ví dụ trên

## References

- HashiCorp — [Terraform State docs](https://developer.hashicorp.com/terraform/language/state)
- HashiCorp — [Backend configuration](https://developer.hashicorp.com/terraform/language/backend)
