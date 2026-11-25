---
title: Data Sources
sidebar_position: 6
description: "`data` chỉ ĐỌC một thứ đã tồn tại, không quản lý lifecycle của nó — khác resource ở đúng một chữ, nhưng đổi hẳn ý nghĩa; và data luôn đọc ngay lúc plan, không chờ tới apply."
tags: [data-source, terraform]
domain: devops
category: concept
doc_type: reference
status: review
difficulty: beginner
verified_at:
updated: 2026-10-29
---

# Data Sources

> **Chốt:** `resource` nói "tôi muốn thứ này tồn tại, Terraform hãy tạo/sửa/xoá nó".
> `data` nói "thứ này đã tồn tại rồi, tôi chỉ muốn ĐỌC thông tin của nó" — Terraform
> không bao giờ tạo, sửa hay xoá một `data`. Nhầm hai khối này là nhầm "quản lý" với
> "tra cứu".

## Mục tiêu

Trả lời: khi nào dùng `data` thay vì `resource`, và vì sao `terraform plan` có thể
**chết ngay lúc plan** nếu một `data` không tìm thấy đối tượng, trong khi một `resource`
mới thì không bao giờ làm vậy.

## Ví dụ

Chạy thật 2026-10-29 — Terraform v1.16.5, provider `hashicorp/local` v2.9.1.

### Hai state hoàn toàn tách biệt

Thư mục `owner/` tạo một file bằng `resource` — file này **được quản lý** bởi state
của `owner/`:

```hcl
resource "local_file" "config" {
  filename = "${path.module}/../app.conf"
  content  = "port=8080\nenv=staging\n"
}
```

```bash
$ terraform apply -auto-approve
```

```text
local_file.config: Creating...
local_file.config: Creation complete after 0s [id=05b496297ad1b0043b07e3715837593405238bce]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

Thư mục `reader/` (state khác, không biết gì về state của `owner/`) chỉ **đọc** đúng
file đó bằng `data`:

```hcl
data "local_file" "config" {
  filename = "${path.module}/../app.conf"
}

output "raw_content" {
  value = data.local_file.config.content
}
```

```bash
$ terraform plan
```

```text
data.local_file.config: Read complete after 0s [id=05b496297ad1b0043b07e3715837593405238bce]

Changes to Outputs:
  + raw_content = <<-EOT
        port=8080
        env=staging
    EOT
```

So với `plan` của một `resource` mới (luôn là `+ create`, giá trị `(known after
apply)`), `data` không có dòng `+ create` nào cả — nó chỉ **đọc xong ngay lúc plan**
rồi đổ giá trị thẳng vào output. `reader/` không hề "sở hữu" file này: xoá state của
`reader/` không ảnh hưởng gì tới file; xoá state của `owner/` thì Terraform "quên"
quản lý file, nhưng file thật vẫn còn (đúng như bài [State](state.md)).

### `data` đọc ngay lúc plan — thiếu đối tượng là chết plan, không phải chết apply

```bash
$ mv app.conf app.conf.bak   # giả lập "đối tượng không còn tồn tại"
$ terraform plan
```

```text
data.local_file.config: Reading...

Planning failed. Terraform encountered an error while generating this plan.

Error: Read local file data source error

  with data.local_file.config,
  on main.tf line 10, in data "local_file" "config":
  10: data "local_file" "config" {

The file at given path cannot be read.

Original Error: open ./../app.conf: no such file or directory
```

Một `resource` mới không bao giờ lỗi kiểu này ở `plan` — nó chỉ *đề xuất* tạo. Một
`data` thì phải **đọc được ngay** để Terraform biết giá trị, nên thiếu đối tượng làm
`plan` chết tại chỗ, trước khi `apply` chạy bất cứ gì.

## Trade-offs

| | `resource` | `data` |
|---|---|---|
| Terraform có quản lý lifecycle không | Có — tạo/sửa/xoá theo diff | Không — chỉ đọc, không bao giờ tạo/sửa/xoá |
| Khi nào đọc giá trị | Lúc `apply` (nhiều attribute `(known after apply)` ở `plan`) | Ngay lúc `plan` |
| Thiếu đối tượng thì sao | Không áp dụng — nó *tạo ra* đối tượng | `plan` lỗi ngay, dừng hoàn toàn |
| `destroy` có xoá đối tượng thật không | Có | Không — chỉ xoá khỏi state của `data`, đối tượng thật (do nơi khác quản lý) không bị động tới |

## Khi nào dùng `data`

- Đọc thông tin do **một state Terraform khác** tạo ra, không nằm trong state hiện tại
  (ví dụ AMI mới nhất do team khác build, VPC đã có từ trước).
- Đọc thông tin **không do Terraform tạo** (file có sẵn trên máy, secret trong Vault,
  danh sách AZ mà cloud cung cấp — `data "aws_availability_zones" "available" {}`).
- Tra cứu giá trị **tính toán phía provider** mà bạn không muốn hard-code (AMI ID mới
  nhất của Ubuntu, account ID hiện tại — `data "aws_caller_identity" "current" {}`).

**Đừng dùng `data` để đọc một resource chính bạn vừa tạo trong cùng config** — cứ tham
chiếu trực tiếp `resource.ten.attribute`, Terraform tự biết thứ tự tạo trước nhờ resource
graph. Thêm một `data` trỏ vào resource của chính mình chỉ tạo phụ thuộc vòng không cần
thiết.

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| Dùng `data` để đọc resource tự quản lý trong cùng config, thay vì tham chiếu trực tiếp | Terraform phải đọc lại đúng thứ nó vừa biết, đôi khi tạo phụ thuộc thừa | Tham chiếu `resource.ten.attribute` trực tiếp |
| Đặt `data` phụ thuộc vào một resource ở **lần apply đầu tiên**, trước khi resource đó tồn tại | `plan` lỗi vì đối tượng chưa có | Tạo resource trước (apply riêng, hoặc `depends_on`), hoặc dùng `data` trỏ tới thứ có sẵn từ trước, không phải thứ sắp tạo trong cùng lần apply |
| Tưởng `terraform destroy` xoá luôn đối tượng mà một `data` đang đọc | Không — `data` không sở hữu gì để xoá; nhầm lẫn này khiến người dùng tưởng đã dọn sạch nhưng tài nguyên thật (và tiền) vẫn còn | Nhớ: chỉ `resource` mới có quyền xoá đối tượng thật |

## FAQ

<details>
<summary>Vì sao <code>data</code> không có <code>count</code>/<code>for_each</code> giống nhau hoàn toàn với <code>resource</code>?</summary>

Có — `data` nhận `count` và `for_each` giống `resource` để đọc nhiều đối tượng cùng loại
(ví dụ đọc thông tin của N subnet có sẵn). Khác biệt duy nhất là `data` không có khối
`lifecycle` với các tuỳ chọn áp cho việc *thay đổi* (như `create_before_destroy`) — vì
nó không tạo/sửa/xoá gì để mà sắp thứ tự.

</details>

<details>
<summary>Dữ liệu từ <code>data</code> có bị lưu vào state không?</summary>

Có — giá trị đọc được lưu vào state tại thời điểm `apply` gần nhất, để các lần `plan`
sau không phải đọc lại nếu không cần. Nhưng khác resource, state của `data` chỉ là
**bản sao để tham khảo** — xoá nó khỏi state (`terraform state rm`) không ảnh hưởng gì
tới đối tượng thật, Terraform chỉ cần đọc lại ở lần `plan` kế tiếp.

</details>

## Related Topics

- [State](state.md) — vì sao `data` không "sở hữu" gì trong state, khác hẳn `resource`
- [Providers và Resources](providers-and-resources.md) — `data` cũng thuộc một provider, cũng cần `required_providers`
- [Expressions và Functions](expressions-and-functions.md) — thường kết hợp `data` với `for`-expression để biến kết quả đọc được thành danh sách/map dùng tiếp

## References

- HashiCorp — [Data Sources docs](https://developer.hashicorp.com/terraform/language/data-sources)
