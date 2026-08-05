---
title: Kỹ năng — Bash
sidebar_position: 0
description: "Gặp tình huống X thì xử lý ra sao — giả định đã nắm phần Tài liệu, tập trung vào kỹ thuật áp dụng."
tags: [skills, bash]
domain: devops
category: index
doc_type: index
updated: 2026-08-05
---

# Kỹ năng — Bash

Mỗi file bắt đầu bằng *"đã hiểu khái niệm rồi, giờ gặp việc này thì làm thế nào"*. Giả
định bạn đã đọc [Tài liệu](../reference/index.md) — nhất là quoting và exit code.

| # | Kỹ năng | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Xử lý văn bản bằng pipeline](text-processing.md) | Ghép `grep`/`awk`/`sed`/`sort`/`uniq` trả lời câu hỏi từ log và file | intermediate | 📝 lý thuyết |
| 2 | [Tìm file với find và xargs](find-va-xargs.md) | Duyệt cây thư mục, chạy lệnh hàng loạt, an toàn với tên có dấu cách | intermediate | 📝 lý thuyết |
| 3 | [Biến, mảng và parameter expansion](variables-arrays-expansion.md) | Gán biến, mảng, default và cắt chuỗi mà không cần gọi `sed` | intermediate | 📝 lý thuyết |
| 4 | [Điều kiện và vòng lặp](conditionals-va-loops.md) | `if`/`case`, `for`/`while`, `[[ ]]`, và đọc file theo dòng đúng cách | beginner | 📝 lý thuyết |
| 5 | [Hàm trong bash](functions.md) | Tham số, trả kết quả qua `echo` vs exit code, và `local` | intermediate | 📝 lý thuyết |
| 6 | [Viết script an toàn](viet-script-an-toan.md) | `set -euo pipefail`, quoting, `trap` dọn dẹp — khung mọi script | advanced | 📝 lý thuyết |

Ký hiệu: ✅ đã chạy tay và xác nhận · 📝 lý thuyết — output chạy thật, `verified_at` chờ chủ repo.

## Related Topics

- [Bash](../index.md) — chủ đề chứa thư mục này
- [Tài liệu](../reference/index.md) — nền khái niệm cho nhóm này
- [Bài tập](../tutorials/index.md) — luyện tay những kỹ năng này
