---
title: Cheatsheet lệnh Terraform
i18n_status: untranslated
sidebar_position: 1
description: "Bảng tra nhanh lệnh CLI theo nhóm — init/fmt/validate, vòng đời plan/apply/destroy, thao tác state, debug/console."
tags: [cheatsheet, commands, terraform]
domain: devops
category: tool
doc_type: cheatsheet
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-29
---

# Cheatsheet lệnh Terraform

> **Chốt:** Đây là bảng tra khi đang gõ lệnh — cú pháp cốt lõi + một dòng để làm gì.
> Học cơ chế đằng sau thì sang [Tài liệu](../reference/index.md) và
> [Kỹ năng](../skills/index.md).

## Chuẩn bị & kiểm tra

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `init` | `terraform init` | Tải provider, thiết lập backend. Chạy lại khi đổi `required_providers` hoặc backend config. `-upgrade` để tải lại bản mới nhất trong khoảng version cho phép. |
| `fmt` | `terraform fmt -recursive` | Tự format lại indent/spacing theo chuẩn HCL. `-check` chỉ báo file nào sai format, không sửa — dùng trong CI. |
| `validate` | `terraform validate` | Kiểm cú pháp HCL + tham chiếu hợp lệ, **không** cần provider credential, **không** gọi API thật. Xanh không có nghĩa là `plan` sẽ đúng — chỉ là code hợp lệ về mặt cú pháp. |
| `version` | `terraform version` | In version CLI + version mọi provider đã `init`. |

## Vòng đời chính

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `plan` | `terraform plan` | Diff giữa config và state, không đổi gì thật. `-out=tfplan` lưu lại plan để `apply` đúng y plan đó, tránh lệch nếu có ai đổi gì ở giữa. |
| `apply` | `terraform apply` | Thực thi plan. Không có `-auto-approve` thì hỏi xác nhận trước — **đừng bỏ qua bước đọc plan** chỉ vì muốn gõ nhanh. `terraform apply tfplan` chạy đúng plan đã lưu. |
| `destroy` | `terraform destroy` | Xoá toàn bộ resource trong state hiện tại. `-target=<address>` giới hạn phạm vi — dùng tạm lúc gỡ lỗi, không thay cho sửa code đúng. |
| `-replace` | `terraform apply -replace=<address>` | Buộc destroy + create lại đúng một resource, dù config không đổi gì — thay cho lệnh `taint` cũ (đã deprecated từ Terraform 0.15.2). |

## State

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `state list` | `terraform state list` | Liệt kê mọi địa chỉ resource đang có trong state. |
| `state show` | `terraform state show <address>` | In toàn bộ attribute hiện tại của một resource trong state — kể cả attribute không khai trong `.tf`, do provider tự tính. |
| `state mv` | `terraform state mv <old> <new>` | Đổi địa chỉ một resource trong state mà **không** destroy/recreate tài nguyên thật — dùng khi refactor (đổi tên, đưa vào module). Xem [Lab 3 — State surgery](../tutorials/lab-03-state-surgery.md). |
| `state rm` | `terraform state rm <address>` | Xoá một resource khỏi state **nhưng không xoá tài nguyên thật** — Terraform chỉ "quên" quản lý nó. Hay bị hiểu nhầm là destroy. |
| `import` | `terraform import <address> <id>` | Đưa một resource tạo sẵn ngoài Terraform vào state. Chỉ ghi state, **không** tự sinh HCL — phải tự viết `resource` block khớp trước. Xem [skill Import](../skills/import.md). |
| `output` | `terraform output [name]` | In giá trị output đã lưu trong state. `-json` cho dạng máy đọc được. |

## Debug & tra cứu

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `console` | `terraform console` | REPL để thử expression/function (`merge(...)`, `[for ...]`) trước khi đặt vào `.tf` — không đổi state, chỉ đọc. |
| `show` | `terraform show` | In state hiện tại dạng người đọc được. `-json` cho dạng máy đọc, dùng để viết tool phân tích state. |
| `graph` | `terraform graph` | In resource dependency graph dạng DOT — ghép với `dot -Tsvg` ra hình để xem thứ tự tạo thật. |
| `workspace` | `terraform workspace list` / `new` / `select` | Nhiều state độc lập trong cùng một thư mục code — tách môi trường (dev/staging/prod) không cần nhiều thư mục. |
| `TF_LOG` | `TF_LOG=DEBUG terraform apply` | Biến môi trường bật log chi tiết (TRACE/DEBUG/INFO/WARN/ERROR) — dùng khi lỗi không rõ do provider hay do core. |

## Related Topics

- [Quy trình Plan/Apply](../reference/plan-apply-workflow.md) — ba ký hiệu `+ ~ -` mà `plan`/`apply` in ra
- [State](../reference/state.md) — vì sao `state rm`/`import` không đụng tới tài nguyên thật
- [Lab 3 — State surgery](../tutorials/lab-03-state-surgery.md) — dùng `state mv`/`state rm` thật trên một ví dụ
