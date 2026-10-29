---
title: Bài tập — Terraform
sidebar_key: terraform-tutorials
sidebar_position: 0
description: "Chạy thật, có ô dán output. Lab 0-4 dùng provider local/Docker; Lab 5-9 chạy trên AWS thật qua LocalStack (miễn phí, an toàn tuyệt đối)."
tags: [tutorial, terraform]
domain: devops
category: index
doc_type: index
updated: 2026-10-28
---

# Bài tập — Terraform

Chạy thật, có ô dán output. Chưa chạy được thì chưa gọi là học.

Mười bài, từ dễ đến khó. Lab 0-4 tập trung vào **cơ chế state/module/lock** bằng
provider `local`/Docker, không cần cloud. Lab 5-9 áp cùng các kỹ thuật đó lên **AWS
thật** qua LocalStack — xem cấu hình provider mẫu ở
[Providers và Resources](../reference/providers-and-resources.md). Lab 4 (import
container Docker) cần Docker trên máy; Lab 9 (import S3 bucket) không cần.

| # | Bài lab | Luyện gì | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Lab 0 — vòng đời đầu tiên và phát hiện drift](lab-00-first-apply.md) | `init`/`plan`/`apply`/`destroy` trên resource built-in và một provider thật; tự tay xoá tài nguyên ngoài Terraform để thấy drift | beginner | 📝 output chạy thật |
| 2 | [Lab 1 — Modules](lab-01-modules.md) | Tách cấu hình lặp lại thành module tái sử dụng; `for_each` sinh nhiều instance từ một danh sách | beginner | 📝 output chạy thật |
| 3 | [Lab 2 — State locking](lab-02-state-locking.md) | Tự tay tạo race condition: lệnh thứ hai bị lock chặn ngay, không ghi đè state của lệnh thứ nhất | beginner | 📝 output chạy thật |
| 4 | [Lab 3 — State surgery (mv/rm)](lab-03-state-surgery.md) | Refactor resource có sẵn vào module mà không destroy/recreate; hậu quả thật của `state rm` | intermediate | 📝 output chạy thật |
| 5 | [Lab 4 — Import](lab-04-import.md) | Đưa container Docker tạo bằng tay vào state; vì sao `plan` ngay sau import vẫn báo destroy/recreate | advanced | 📝 output chạy thật |
| 6 | [Lab 5 — S3 bucket với versioning](lab-05-s3-versioning.md) | `variable` theo môi trường, `output` ARN, verify bằng AWS CLI | beginner | 📝 output chạy thật |
| 7 | [Lab 6 — IAM role và policy](lab-06-iam-role-policy.md) | `jsonencode` cho trust policy + policy, `aws_iam_role_policy_attachment` | beginner | 📝 output chạy thật |
| 8 | [Lab 7 — VPC, subnet và security group](lab-07-vpc-subnet-sg.md) | `for_each` trên map CIDR, security group với nhiều `ingress` rule | intermediate | 📝 output chạy thật |
| 9 | [Lab 8 — EC2 instance với user_data](lab-08-ec2-instance.md) | `user_data` thay provisioner; verify đúng API (`describe-instance-attribute`) | beginner | 📝 output chạy thật |
| 10 | [Lab 9 — import một bucket đã tồn tại](lab-09-import-existing-bucket.md) | Tự phát hiện attribute thật trước khi viết HCL, import tới khi `plan` báo "No changes" | intermediate | 📝 output chạy thật |

Ký hiệu: ✅ đã chạy tay và xác nhận (`verified_at` có ngày) · 📝 output chạy thật khi
viết, `verified_at` chờ chủ repo chạy lại tay.

## Related Topics

- [Terraform](../index.md) — chủ đề chứa thư mục này
- [State](../reference/state.md) · [Providers và Resources](../reference/providers-and-resources.md) · [Quy trình Plan/Apply](../reference/plan-apply-workflow.md) — lý thuyết cho mọi lab
- [Variables, Outputs và Locals](../reference/variables-outputs-locals.md) · [Modules](../reference/modules.md) — lý thuyết cho Lab 1, 5-9
- [Kỹ năng](../skills/index.md) — Import, `count` vs `for_each`, Backend/locking — đào sâu thêm trên AWS, dùng trực tiếp ở Lab 6-9
