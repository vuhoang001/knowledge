---
title: "`count` vs `for_each`"
i18n_status: untranslated
sidebar_position: 2
description: "count đánh số theo chỉ số 0,1,2 — xoá phần tử giữa làm mọi thứ sau nó bị lệch index, một resource bị đổi tên nhầm và một resource khác bị xoá nhầm. for_each đánh theo khoá nên chỉ đúng một resource bị động tới."
tags: [count, for-each, terraform, aws, iam]
domain: devops
category: tool
doc_type: skill
status: review
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# `count` vs `for_each`

> **Chốt:** `count` tạo resource đánh số theo **chỉ số** (`team[0]`, `team[1]`, `team[2]`).
> Xoá phần tử ở giữa danh sách nguồn làm **toàn bộ chỉ số sau nó lệch** — Terraform
> không thấy "một phần tử bị xoá", nó thấy "phần tử ở index đó giờ có tên khác". Hệ quả
> thật, không phải lý thuyết: một resource bị **đổi tên nhầm**, một resource khác (vốn
> không hề đổi) bị **xoá nhầm**. `for_each` tránh hoàn toàn vì đánh theo **khoá** (key),
> không theo vị trí.

## Mục tiêu

Thấy tận mắt cái bẫy index-shift của `count` trên một ví dụ thật, rồi làm lại đúng bài
toán đó bằng `for_each` để thấy sự khác biệt — không phải đọc lý thuyết suông. Giả định
đã đọc [Variables, Outputs và Locals](../reference/variables-outputs-locals.md) (đặc
biệt `for` expression và set/map).

## Ví dụ — xuyên suốt: 3 IAM user, xoá người ở giữa

Chạy thật 2026-10-28, AWS provider 6.70.0, qua LocalStack (miễn phí, an toàn tuyệt đối
để tạo/xoá — xem cấu hình provider ở [Providers và Resources](../reference/providers-and-resources.md)).

### Bước 1 — tạo 3 user bằng `count`

```hcl
variable "usernames" {
  type    = list(string)
  default = ["alice", "bob", "carol"]
}

resource "aws_iam_user" "team" {
  count = length(var.usernames)
  name  = var.usernames[count.index]
}
```

```bash
terraform apply -auto-approve
terraform state list
```

```text
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

aws_iam_user.team[0]
aws_iam_user.team[1]
aws_iam_user.team[2]
```

Ba địa chỉ state: `team[0]` = alice, `team[1]` = bob, `team[2]` = carol — gắn theo
**vị trí trong danh sách**, không gắn theo tên.

### Bước 2 — xoá "bob" (phần tử giữa) khỏi danh sách, xem `plan`

```hcl
variable "usernames" {
  type    = list(string)
  default = ["alice", "carol"]   # bob đã bị xoá khỏi list
}
```

```bash
terraform plan
```

```text
  # aws_iam_user.team[1] will be updated in-place
  ~ resource "aws_iam_user" "team" {
        id                   = "bob"
      ~ name                 = "bob" -> "carol"
        tags                 = {}
        # (6 unchanged attributes hidden)
    }

  # aws_iam_user.team[2] will be destroyed
  # (because index [2] is out of range for count)
  - resource "aws_iam_user" "team" {
      - arn                  = "arn:aws:iam::000000000000:user/carol" -> null
      - id                   = "carol" -> null
      - name                 = "carol" -> null
      - unique_id            = "AIDAR6ISCDAAAKGOFI2R" -> null
        # (1 unchanged attribute hidden)
    }

Plan: 0 to add, 1 to change, 1 to destroy.
```

**Đọc kỹ hai hành động này — đây chính là cái bẫy:**

- `team[1]` (vốn là **bob**) bị **đổi tên thành "carol"** — Terraform không biết "bob
  đã bị xoá khỏi danh sách", nó chỉ thấy "index 1 giờ ứng với giá trị carol".
- `team[2]` (vốn là **carol thật**, user không hề đổi gì) bị **xoá** — vì index 2 không
  còn tồn tại trong danh sách mới.

Kết quả cuối: IAM user "bob" **biến mất danh tính cũ** (bị rename thành carol, giữ
nguyên `unique_id`/quyền hạn cũ của bob), còn IAM user "carol" **thật sự bị xoá** —
dù trong ý định ban đầu, bạn chỉ muốn xoá bob và giữ carol nguyên vẹn. Với resource
không hỗ trợ rename tại chỗ (named tag cố định, DB identifier...), bước 1 ở trên sẽ là
`-/+` (destroy rồi tạo lại) thay vì `~`, nghĩa là **mất dữ liệu** thay vì chỉ lệch tên.

### Bước 3 — làm lại đúng bài toán bằng `for_each`

```hcl
variable "usernames" {
  type    = set(string)
  default = ["alice", "bob", "carol"]
}

resource "aws_iam_user" "team" {
  for_each = var.usernames
  name     = each.key
}
```

```bash
terraform apply -auto-approve
terraform state list
```

```text
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

aws_iam_user.team["alice"]
aws_iam_user.team["bob"]
aws_iam_user.team["carol"]
```

Địa chỉ state giờ gắn theo **tên**, không theo vị trí. Xoá "bob" khỏi set:

```hcl
default = ["alice", "carol"]
```

```bash
terraform plan
```

```text
  # aws_iam_user.team["bob"] will be destroyed
  # (because key ["bob"] is not in for_each map)
  - resource "aws_iam_user" "team" {
      - id                   = "bob" -> null
      - name                 = "bob" -> null
      - unique_id            = "AIDACKQ6U127G8UHWJLA" -> null
        # (1 unchanged attribute hidden)
    }

Plan: 0 to add, 0 to change, 1 to destroy.
```

**Chỉ đúng một hành động: xoá `team["bob"]`.** `team["alice"]` và `team["carol"]`
không xuất hiện trong plan — vì key của chúng vẫn còn trong set, Terraform không có lý
do động tới.

## Trade-offs

| `count` | `for_each` |
|---|---|
| Cú pháp ngắn hơn khi N phần tử giống nhau, thứ tự không quan trọng | Cần key (string/map) — dài hơn một chút khi chỉ cần N bản giống nhau |
| **Nguy hiểm** khi xoá/chèn phần tử giữa danh sách — toàn bộ index sau đó lệch | An toàn khi thêm/xoá phần tử bất kỳ — chỉ đúng phần tử đó bị động tới |
| Không dùng được map, chỉ dùng được số lượng hoặc list theo index | Dùng được với `set(string)` hoặc `map(...)`, key có ngữ nghĩa rõ ràng |
| Hợp khi N là một số cố định không đổi (ví dụ luôn đúng 2 AZ) | Hợp khi danh sách phần tử có thể thêm/xoá theo thời gian (user, bucket theo tên...) |

## Common Mistakes

- **Dùng `count` cho danh sách người dùng/tài nguyên có tên, có thể thêm/xoá theo thời
  gian.** Đây chính là bẫy ở ví dụ trên — bất cứ danh sách nào không phải "N bản giống
  nhau cố định" nên dùng `for_each`.
- **Đổi `list` thành `set`/`map` mà không đổi cách tham chiếu.** `count.index` không
  tồn tại trong `for_each` — phải đổi sang `each.key`/`each.value`, đổi nửa vời làm lỗi
  cú pháp ngay ở `plan`.
- **Dùng `for_each` với một `list` chưa convert qua `toset()`/map.** `for_each` không
  nhận trực tiếp `list` thường (chỉ nhận `set(string)` hoặc `map`) — phải
  `for_each = toset(var.list)` nếu nguồn là list.

## FAQ

<details>
<summary>Nếu dùng `count` và thực tế chỉ THÊM phần tử vào CUỐI danh sách (không xoá, không chèn giữa) thì có an toàn không?</summary>

An toàn hơn nhiều — thêm vào cuối chỉ sinh thêm index mới (`team[3]`), không làm lệch
các index cũ. Bẫy chỉ xảy ra khi **xoá hoặc chèn vào giữa**. Nhưng vì không kiểm soát
được ai sẽ sửa danh sách đó trong tương lai, quy tắc an toàn chung vẫn là: nếu phần tử
có *danh tính* (tên, không phải chỉ số lượng), dùng `for_each` ngay từ đầu.

</details>

## Related Topics

- [Variables, Outputs và Locals](../reference/variables-outputs-locals.md) — `for` expression và `set`/`map` dùng ở ví dụ trên
- [Modules](../reference/modules.md) — ví dụ module cũng dùng `for_each` bên trong
- [Lab 7 — VPC, subnet và security group](../tutorials/lab-07-vpc-subnet-sg.md) — áp dụng `for_each` trên subnet theo CIDR

## References

- HashiCorp — [`count`](https://developer.hashicorp.com/terraform/language/meta-arguments/count)
- HashiCorp — [`for_each`](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each)
