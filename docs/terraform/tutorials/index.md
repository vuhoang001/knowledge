---
title: Bài tập — Terraform
sidebar_key: terraform-tutorials
sidebar_position: 0
description: "Chạy thật, có ô dán output. Chưa chạy được thì chưa gọi là học."
tags: [tutorial, terraform]
domain: devops
category: index
doc_type: index
updated: 2026-10-28
---

# Bài tập — Terraform

Chạy thật, có ô dán output. Chưa chạy được thì chưa gọi là học.

| # | Bài lab | Luyện gì | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Lab 0 — vòng đời đầu tiên và phát hiện drift](lab-00-first-apply.md) | `init`/`plan`/`apply`/`destroy` trên resource built-in và một provider thật; tự tay xoá tài nguyên ngoài Terraform để thấy drift | beginner | 📝 output chạy thật |

Bốn bài dưới đang ở dạng **mục lục dự kiến** — chưa viết, chưa có file:

| # | Bài lab (dự kiến) | Luyện gì |
|---|---|---|
| 2 | Modules | Tách một cấu hình lặp lại thành module tái sử dụng, input/output giữa module và root |
| 3 | Remote state + locking | Chuyển state cục bộ sang backend thật, hai người apply cùng lúc bị lock chặn |
| 4 | Import | Đưa một tài nguyên đã tạo sẵn ngoài Terraform vào state mà không recreate |
| 5 | State surgery | `terraform state mv`/`rm` khi tách module hoặc đổi tên resource mà không destroy/recreate |

Ký hiệu: ✅ đã chạy tay và xác nhận (`verified_at` có ngày) · 📝 output chạy thật khi
viết, `verified_at` chờ chủ repo chạy lại tay.

## Related Topics

- [Terraform](../index.md) — chủ đề chứa thư mục này
- [State](../reference/state.md) · [Providers và Resources](../reference/providers-and-resources.md) · [Quy trình Plan/Apply](../reference/plan-apply-workflow.md) — lý thuyết cho lab 1
