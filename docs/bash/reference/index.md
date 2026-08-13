---
title: Tài liệu — Bash
sidebar_key: bash-reference
sidebar_position: 0
description: "Nó là gì, vì sao, đánh đổi ra sao. Đọc nhóm này trước khi viết dòng script đầu tiên."
tags: [reference, bash]
domain: devops
category: index
doc_type: index
updated: 2026-08-05
---

# Tài liệu — Bash

Giải thích *nó là gì, vì sao, đánh đổi ra sao*. Sáu khái niệm nền — nắm chúng thì mọi
lệnh và script sau này đọc được; bỏ qua thì cứ dán lệnh trên mạng rồi tự hỏi vì sao hỏng.

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Shell là gì](shell-la-gi.md) | Shell biến văn bản thành tiến trình — bash, sh, zsh khác nhau ở đâu | beginner | 📝 lý thuyết |
| 2 | [Streams và redirection](streams-va-redirection.md) | Ba dòng stdin/stdout/stderr và cách nối lại bằng `>`, `2>&1`, pipe | beginner | 📝 lý thuyết |
| 3 | [Quoting và expansion](quoting-va-expansion.md) | Nháy đơn/kép, word splitting, glob, và thứ tự bash nở biến | intermediate | 📝 lý thuyết |
| 4 | [Exit code và control flow](exit-code-va-control-flow.md) | Vì sao `if cmd` chạy trên thành/bại chứ không phải true/false | beginner | 📝 lý thuyết |
| 5 | [File permissions](file-permissions.md) | Đọc `-rwxr-xr-x`, đổi bằng octal, và `chmod`/`chown`/`umask` | beginner | 📝 lý thuyết |
| 6 | [Process và job control](process-va-job-control.md) | `&`, `jobs`, `nohup`, signal và `kill` — job nền sống chết thế nào | intermediate | 📝 lý thuyết |

Ký hiệu: ✅ đã chạy tay và xác nhận (`verified_at` có ngày) · 📝 lý thuyết — mọi output
đều **chạy thật** khi viết, nhưng `verified_at` còn trống chờ chủ repo chạy lại tay.

## Related Topics

- [Bash](../index.md) — chủ đề chứa thư mục này
- [Kỹ năng](../skills/index.md) — áp dụng những khái niệm này vào tình huống cụ thể
