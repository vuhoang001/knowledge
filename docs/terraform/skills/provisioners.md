---
title: Provisioners
sidebar_position: 5
description: "local-exec/remote-exec là đường cùng khi provider không có resource tương ứng cho việc cần làm, không phải lựa chọn đầu tiên — và một provisioner thất bại ở lần tạo làm resource bị tainted, buộc apply sau phải destroy/recreate dù resource thật đã tạo xong."
tags: [provisioners, local-exec, terraform]
domain: devops
category: tool
doc_type: skill
status: review
difficulty: intermediate
verified_at:
updated: 2026-10-29
---

# Provisioners

> **Chốt:** Provisioner chạy một lệnh shell **gắn vào vòng đời của một resource** —
> nhưng Terraform không theo dõi được lệnh đó làm gì, không biết cách tính diff cho
> nó, và không tự rollback nếu nó thất bại giữa đường. Mọi provider tốt có resource
> riêng cho việc bạn cần (`user_data`, `aws_s3_bucket_policy`...) nên luôn ưu tiên đó
> trước — provisioner là lối thoát cho đúng phần còn lại không có resource nào làm được.

## Mục tiêu

Thấy tận mắt: provisioner chạy khi nào, và điều gì xảy ra với resource khi nó thất bại
— đây là phần hay bị hiểu sai nhất.

## Ví dụ

Chạy thật 2026-10-29 — Terraform v1.16.5, provider `hashicorp/local` v2.9.1.

### `local-exec` chạy ngay sau khi resource được tạo

```hcl
resource "local_file" "cfg" {
  filename = "${path.module}/app.conf"
  content  = "port=8080"

  provisioner "local-exec" {
    command = "echo \"da tao file: ${self.filename}\" >> ${path.module}/provision.log"
  }
}
```

```bash
$ terraform apply -auto-approve
```

```text
local_file.cfg: Creating...
local_file.cfg: Provisioning with 'local-exec'...
local_file.cfg (local-exec): Executing: ["/bin/sh" "-c" "echo \"da tao file: ./app.conf\" >> ./provision.log"]
local_file.cfg: Creation complete after 0s

$ cat provision.log
da tao file: ./app.conf
```

`self.filename` đọc attribute của **chính resource đang được provision** — cách duy
nhất provisioner "biết" gì về resource nó gắn vào, vì nó không phải là một resource
riêng có thể tham chiếu bằng địa chỉ thường.

### Provisioner thất bại → resource bị *tainted*, dù đã tạo thành công

```hcl
resource "local_file" "fail_demo" {
  filename = "${path.module}/fail.conf"
  content  = "x"

  provisioner "local-exec" {
    command = "exit 1"
  }
}
```

```bash
$ terraform apply -auto-approve
```

```text
local_file.fail_demo: Creating...
local_file.fail_demo: Provisioning with 'local-exec'...
local_file.fail_demo (local-exec): Executing: ["/bin/sh" "-c" "exit 1"]

Error: local-exec provisioner error

  with local_file.fail_demo,
  on main.tf line 14, in resource "local_file" "fail_demo":
  14:   provisioner "local-exec" {

Error running command 'exit 1': exit status 1. Output:
```

File `fail.conf` **thật ra đã được tạo** trên đĩa (resource provider đã chạy xong) —
nhưng vì provisioner thất bại ngay sau đó, Terraform đánh dấu resource này **tainted**.
Chạy `plan` lần sau:

```bash
$ terraform plan
```

```text
Plan: 1 to add, 0 to change, 1 to destroy.
```

Resource vẫn còn trong state, file vẫn còn trên đĩa — nhưng Terraform **buộc
destroy/recreate toàn bộ** ở lần apply kế tiếp, vì nó không có cách nào biết provisioner
đã làm những gì trước khi lỗi, nên coi cả resource là không đáng tin, phải làm lại từ
đầu. Đây là lý do provisioner thất bại nguy hiểm hơn một resource thường thất bại:
resource thường thất bại thì **không được tạo** (dễ hiểu); resource + provisioner thất
bại thì **resource đã tạo nhưng vẫn bị coi là hỏng**.

## Khi nào thật sự cần provisioner

- Provider không có resource cho đúng việc cần làm, và không có cách nào khác (ví dụ
  chạy một script khởi tạo mà chính resource không hỗ trợ tham số tương đương).
- Thao tác **một lần, gắn chặt vào thời điểm tạo/xoá** một resource cụ thể, không áp
  dụng được cho resource khác trong cùng loại.

## Khi nào KHÔNG cần — đã có resource/tham số thay thế tốt hơn

| Việc hay dùng `provisioner` | Thay bằng |
|---|---|
| Chạy script setup trên EC2 lúc boot | `user_data` (tham số có sẵn của `aws_instance`) — xem [Lab 8](../tutorials/lab-08-ec2-instance.md) |
| Gắn policy vào bucket/role | Resource policy riêng (`aws_s3_bucket_policy`, `aws_iam_role_policy_attachment`) |
| Chờ một service sẵn sàng rồi mới tạo resource tiếp theo | `depends_on` cộng với cơ chế health-check của chính provider, không phải `local-exec` chạy `sleep`/`curl` đoán mò |

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| Dùng `provisioner` cho việc provider đã có resource/tham số riêng | Terraform không track được thay đổi đó qua state — `plan` không bao giờ báo đúng drift của phần provisioner làm | Luôn tìm resource/tham số tương đương trước; `provisioner` là lựa chọn cuối |
| Không xử lý trường hợp provisioner thất bại giữa đường | Resource bị *tainted*, apply sau destroy/recreate toàn bộ — có thể mất dữ liệu nếu resource đó không chỉ là config (ví dụ một database) | Giữ lệnh trong provisioner **idempotent** và nhỏ gọn; cân nhắc `on_failure = continue` nếu lệnh đó không quan trọng tới mức phải tainted cả resource |
| Dùng provisioner để chờ/đoán một service đã sẵn sàng (`sleep 30`) | Không đáng tin — service có thể chưa sẵn sàng sau 30s trên máy chậm, hoặc đã sẵn sàng từ giây thứ 2 làm apply chậm không cần thiết | Dùng cơ chế chờ có thật của hệ thống đích (health check endpoint, `aws_eip_association` phụ thuộc đúng resource) thay vì đoán thời gian |

## FAQ

<details>
<summary><code>on_failure = continue</code> làm gì khác với mặc định?</summary>

Mặc định (`on_failure = fail`), provisioner lỗi làm cả `apply` lỗi và resource bị
tainted như ví dụ trên. `on_failure = continue` bỏ qua lỗi của riêng provisioner đó,
coi `apply` vẫn thành công — dùng khi lệnh trong provisioner chỉ là "tốt thì tốt", không
phải điều kiện bắt buộc để resource được coi là tạo đúng.

</details>

<details>
<summary><code>remote-exec</code> khác <code>local-exec</code> ở đâu?</summary>

`local-exec` chạy lệnh trên **máy đang gõ `terraform apply`**. `remote-exec` chạy lệnh
**trên chính resource vừa tạo** (cần kết nối được, ví dụ SSH vào một EC2 instance vừa
lên) — nên `remote-exec` luôn cần một khối `connection {}` khai cách kết nối, còn
`local-exec` thì không.

</details>

## Related Topics

- [Lifecycle Meta-arguments](lifecycle-meta-arguments.md) — resource bị *tainted* do provisioner thất bại hành xử giống một resource buộc replace
- [Providers và Resources](../reference/providers-and-resources.md) — vì sao luôn nên tìm resource/tham số của provider trước khi dùng provisioner
- [Lab 8 — EC2 instance với user_data](../tutorials/lab-08-ec2-instance.md) — ví dụ thật về việc thay provisioner bằng tham số có sẵn

## References

- HashiCorp — [Provisioners docs](https://developer.hashicorp.com/terraform/language/resources/provisioners/syntax)
