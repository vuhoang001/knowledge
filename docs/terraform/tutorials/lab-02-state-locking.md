---
title: "Lab 2 — State locking"
sidebar_position: 3
description: "Tự tay tạo ra một cuộc đụng độ: hai lệnh terraform cùng đọc/ghi một state tại một thời điểm, và thấy lock chặn lệnh thứ hai thay vì để chúng ghi đè nhau."
tags: [tutorial, terraform, state, locking]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Lab 2 — State locking

> **Chạy thật 2026-10-28** — Terraform v1.16.5. Chỉ cần resource built-in
> (`terraform_data`), không cần provider nào, không cần mạng.

Yêu cầu: đã làm [Lab 0](lab-00-first-apply.md). Bài này chỉ cần một máy, một terminal
— không cần hai người, không cần backend cloud nào. **Ngay cả `local` backend mặc định
(file trên đĩa) cũng có lock**, và đó chính là thứ bài này chứng minh.

## Vì sao cần locking

[State](../reference/state.md) là trí nhớ duy nhất của Terraform. Hai lệnh cùng đọc
state, cùng tính diff, rồi cùng ghi lại **tại cùng một thời điểm** sẽ ghi đè nhau —
lệnh chạy xong sau cùng "thắng", và những gì lệnh kia làm biến mất khỏi hiểu biết của
Terraform mà không có lỗi nào báo. Lock tồn tại để biến race condition đó thành một
lỗi nhìn thấy được, thay vì một lần ghi đè âm thầm.

## Bước 1 — Một resource chạy đủ lâu để có "khoảng hở"

Dùng `provisioner "local-exec"` chạy `sleep 6` để kéo dài thời gian `apply` — đủ để
chèn một lệnh thứ hai vào giữa.

```bash
mkdir tf-lock && cd tf-lock
cat > main.tf << 'EOF'
resource "terraform_data" "slow" {
  input = "hello"
  provisioner "local-exec" {
    command = "sleep 6"
  }
}
EOF
terraform init
```

## Bước 2 — Chạy `apply` ở nền, rồi chạy lệnh thứ hai NGAY LÚC nó đang giữ lock

```bash
terraform apply -auto-approve > apply1.log 2>&1 &
sleep 1.5
terraform plan
```

```text
Error: Error acquiring the state lock

Error message: resource temporarily unavailable
Lock Info:
  ID:        1b2bc345-6eaf-5e97-f5cc-02b58f0e3eeb
  Path:      terraform.tfstate
  Operation: OperationTypeApply
  Who:       hoanggggf@hoanggggf
  Version:   1.16.5
  Created:   2026-10-28 07:33:16.777192825 +0000 UTC
  Info:      


Terraform acquires a state lock to protect the state from being written
by multiple users at the same time. Please resolve the issue above and try
again. For most commands, you can disable locking with the "-lock=false"
flag, but this is not recommended.
```

**Kết quả phải ra:** lệnh thứ hai (`plan`) **từ chối chạy ngay lập tức**, không đợi,
không chạy đè — nó biết đã có một `Operation: OperationTypeApply` đang giữ lock, kèm
**ai đang giữ** (`Who`), **từ lúc nào** (`Created`), và dừng lại trước khi tính bất cứ
diff nào. Đây chính xác là cơ chế ngăn hai người (hoặc một người chạy nhầm hai lần)
ghi đè state của nhau.

## Bước 3 — Đợi lệnh đầu xong, chạy lại lệnh thứ hai

```bash
wait
cat apply1.log
```

```text
terraform_data.slow: Creating...
terraform_data.slow: Provisioning with 'local-exec'...
terraform_data.slow (local-exec): Executing: ["/bin/sh" "-c" "sleep 6"]
terraform_data.slow: Creation complete after 6s [id=999c7b28-0ce1-e1b7-b202-91182d937dd3]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

Lock đã nhả ngay khi `apply` xong. `terraform plan` chạy lại lúc này sẽ vào bình
thường, không còn lỗi.

## `-lock=false` — tại sao cảnh báo "not recommended" không phải lời doạ suông

Dòng cuối thông báo lỗi gợi ý `-lock=false` như một cách "vượt qua". Đó là tắt hẳn cơ
chế bảo vệ, không phải chờ bớt lâu hơn: hai lệnh `apply -lock=false` chạy đúng lúc nhau
sẽ **cùng đọc** state cũ, cùng tính diff dựa trên state cũ, rồi **lần lượt ghi đè**
state của nhau — đúng kịch bản mà lock tồn tại để chặn. Chỉ dùng cờ này khi chắc chắn
không có lệnh nào khác đang chạm vào state đó (ví dụ: backend không hỗ trợ lock, và bạn
tự đảm bảo bằng quy trình bên ngoài).

## Vì sao local backend là chưa đủ khi có nhiều máy

Lock ở bài này hoạt động vì `local` backend dùng file lock (`flock`) ngay trên đĩa —
chỉ có tác dụng khi mọi lệnh **chạy trên cùng một máy**, cùng thấy cùng một file. Hai
người ở hai máy khác nhau, mỗi người giữ một bản `terraform.tfstate` riêng, thì không
ai thấy lock của ai — mỗi người tưởng mình là người duy nhất. Đây là lý do mọi backend
từ xa dùng thật (S3 + DynamoDB, Terraform Cloud, Postgres backend...) đều phải **tự
cài thêm cơ chế lock phân tán** tương đương — không phải tính năng phụ, mà là điều kiện
để backend đó dùng được với nhiều người/CI.

## Dọn dẹp

```bash
terraform destroy -auto-approve
```

## Đáp số đối chiếu

| Bước | Hành động mong đợi | Dòng nhận biết |
|---|---|---|
| Bước 2 | Lệnh thứ hai bị chặn ngay, không chạy đè | `Error: Error acquiring the state lock` kèm `Lock Info` |
| Bước 3 | Lệnh đầu hoàn tất, lock tự nhả | `Apply complete! Resources: 1 added, 0 changed, 0 destroyed.` |

## Related Topics

- [State](../reference/state.md) — vì sao state cần được bảo vệ khỏi ghi đồng thời
- [Quy trình Plan / Apply](../reference/plan-apply-workflow.md) — `apply` là bên giữ lock trong suốt thời gian chạy
- [Lab 0 — vòng đời đầu tiên](lab-00-first-apply.md) — bài trước
- [Bài tập — Terraform](index.md) — mục lục bộ bài tập
