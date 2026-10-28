---
title: Bài tập — Bash
sidebar_key: bash-tutorials
sidebar_position: 0
description: "Lab chạy thật, gõ theo là ra đúng output đã dán — luyện tay pipeline xử lý văn bản, regex/sed, viết script, và một chuỗi forensics 8 bước tổng hợp."
tags: [tutorials, bash]
domain: devops
category: index
doc_type: index
updated: 2026-10-28
---

# Bài tập — Bash

Lab chạy thật: mỗi lệnh đã chạy trên máy khi viết, output dán lại nguyên văn. Gõ theo là
ra đúng như vậy (sai lệch nhỏ nếu máy bạn dùng GNU coreutils thay vì uutils).

| # | Bài lab | Luyện gì | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Lab: xử lý văn bản bằng pipeline](bash-lab-text-processing.md) | Trả lời câu hỏi thật từ một `access.log` mẫu bằng `grep`/`awk`/`sort`/`uniq` | beginner | 📝 output chạy thật |
| 2 | [Lab: viết script bash đầu tiên](bash-lab-first-script.md) | Từ `hello.sh` tới script có tham số, `set -euo pipefail`, hàm và debug `bash -x` | beginner | 📝 output chạy thật |
| 3 | [Lab: regex và sed](bash-lab-regex-va-sed.md) | `grep -E`/`-F` lọc dòng, `sed` chuẩn hoá CSV, và bẫy thay ký tự lan ra cả dòng | intermediate | 📝 output chạy thật |
| 4 | [Lab: mock kiểm tra CLI tổng hợp](bash-lab-forensics-mock.md) | Chuỗi 8 bước phụ thuộc nhau: `ps`/`chmod` → `grep` → `sed` → `awk` → seal SHA-256 | advanced | 📝 output chạy thật |

Ký hiệu: ✅ đã chạy tay và xác nhận (`verified_at` có ngày) · 📝 output chạy thật khi
viết, `verified_at` chờ chủ repo chạy lại tay.

## Lộ trình làm 4 lab

Làm theo đúng thứ tự trên — lab 3 giả định đã xong lab 1 (text-processing), lab 4 là
bài tổng hợp cuối, ghép cả bốn nhóm kỹ năng (`process`, `regex`, `sed`, `awk`) vào một
chuỗi dài, nên để tới cuối cùng.

## Related Topics

- [Bash](../index.md) — chủ đề chứa thư mục này
- [Xử lý văn bản bằng pipeline](../skills/text-processing.md) — lý thuyết cho lab 1
- [Viết script an toàn](../skills/viet-script-an-toan.md) — lý thuyết cho lab 2
- [Regex cơ bản](../reference/regex-co-ban.md) — lý thuyết cho lab 3
- [Process và job control](../reference/process-va-job-control.md) — một phần nền cho lab 4
