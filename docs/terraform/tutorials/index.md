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

Năm bài, từ dễ đến khó. Bài 4 (import) nên làm sau cùng — nó đòi hỏi hiểu rõ bốn bài
trước và cần có Docker trên máy.

| # | Bài lab | Luyện gì | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Lab 0 — vòng đời đầu tiên và phát hiện drift](lab-00-first-apply.md) | `init`/`plan`/`apply`/`destroy` trên resource built-in và một provider thật; tự tay xoá tài nguyên ngoài Terraform để thấy drift | beginner | 📝 output chạy thật |
| 2 | [Lab 1 — Modules](lab-01-modules.md) | Tách cấu hình lặp lại thành module tái sử dụng; `for_each` sinh nhiều instance từ một danh sách | beginner | 📝 output chạy thật |
| 3 | [Lab 2 — State locking](lab-02-state-locking.md) | Tự tay tạo race condition: lệnh thứ hai bị lock chặn ngay, không ghi đè state của lệnh thứ nhất | beginner | 📝 output chạy thật |
| 4 | [Lab 3 — State surgery (mv/rm)](lab-03-state-surgery.md) | Refactor resource có sẵn vào module mà không destroy/recreate; hậu quả thật của `state rm` | intermediate | 📝 output chạy thật |
| 5 | [Lab 4 — Import](lab-04-import.md) | Đưa container Docker tạo bằng tay vào state; vì sao `plan` ngay sau import vẫn báo destroy/recreate | advanced | 📝 output chạy thật |

Ký hiệu: ✅ đã chạy tay và xác nhận (`verified_at` có ngày) · 📝 output chạy thật khi
viết, `verified_at` chờ chủ repo chạy lại tay.

## Related Topics

- [Terraform](../index.md) — chủ đề chứa thư mục này
- [State](../reference/state.md) · [Providers và Resources](../reference/providers-and-resources.md) · [Quy trình Plan/Apply](../reference/plan-apply-workflow.md) — lý thuyết cho cả năm bài
