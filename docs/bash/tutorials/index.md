---
title: Bài tập — Bash
sidebar_key: bash-tutorials
sidebar_position: 0
description: "Lab chạy thật + 73 bài tự chấm từ dễ đến nâng cao, phủ toàn bộ reference/skills của chủ đề Bash — mỗi câu có đáp số thật, lời giải giấu trong <details>."
tags: [tutorials, bash]
domain: devops
category: index
doc_type: index
updated: 2026-10-28
---

# Bài tập — Bash

Lab chạy thật: mỗi lệnh đã chạy trên máy khi viết, output dán lại nguyên văn. Gõ theo là
ra đúng như vậy (sai lệch nhỏ nếu máy bạn dùng GNU coreutils thay vì uutils).

> **Hai tầng.** Bài 1-4 là **lab chẩn đoán** — bày sẵn bẫy rồi giải thích, mỗi lab một
> chuỗi liên tục. Bộ 1-7 (bài 5-11) là **73 bài tự chấm** ngắn — mỗi câu độc lập: đề
> → đáp số thật → lời giải giấu trong `<details>`, từ dễ (exit code) đến khó (`set -e`
> không bắt lỗi trong `if`, bẫy `while read` mất dòng cuối).

## Lab chẩn đoán

| # | Bài lab | Luyện gì | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Lab: xử lý văn bản bằng pipeline](bash-lab-text-processing.md) | Trả lời câu hỏi thật từ một `access.log` mẫu bằng `grep`/`awk`/`sort`/`uniq` | beginner | 📝 output chạy thật |
| 2 | [Lab: viết script bash đầu tiên](bash-lab-first-script.md) | Từ `hello.sh` tới script có tham số, `set -euo pipefail`, hàm và debug `bash -x` | beginner | 📝 output chạy thật |
| 3 | [Lab: regex và sed](bash-lab-regex-va-sed.md) | `grep -E`/`-F` lọc dòng, `sed` chuẩn hoá CSV, và bẫy thay ký tự lan ra cả dòng | intermediate | 📝 output chạy thật |
| 4 | [Lab: mock kiểm tra CLI tổng hợp](bash-lab-forensics-mock.md) | Chuỗi 8 bước phụ thuộc nhau: `ps`/`chmod` → `grep` → `sed` → `awk` → seal SHA-256 | advanced | 📝 output chạy thật |

## Bộ bài tập tự chấm — 73 câu, 7 bộ

| # | Bộ | Phủ kỹ thuật | Số câu | Mức |
|---|---|---|---|---|
| 5 | [Bộ 1 — Nền tảng](bt-01-nen-tang.md) | exit code, `&&`/`\|\|` short-circuit, redirect, `pipefail`, command substitution | 10 | beginner |
| 6 | [Bộ 2 — Quoting và expansion](bt-02-quoting-expansion.md) | word splitting, glob, `nullglob`, parameter expansion, `[` vs `[[` | 10 | beginner |
| 7 | [Bộ 3 — Permissions và process](bt-03-permissions-process.md) | `chmod` octal, `umask`, background job, `wait`, `kill`, `trap`, PPID | 10 | intermediate |
| 8 | [Bộ 4 — Text processing](bt-04-text-processing.md) | `grep`/`awk`/`sed`/`cut`/`sort`/`uniq`/`tr`/`paste`, bẫy chọn nhầm cột | 12 | intermediate |
| 9 | [Bộ 5 — Regex](bt-05-regex.md) | BRE vs ERE, anchor, character class, bẫy `.` không escape | 11 | intermediate |
| 10 | [Bộ 6 — Variables, arrays, functions](bt-06-variables-arrays-functions.md) | `local`, `return` vs `echo`, associative array, `unset` phần tử, `export` | 10 | intermediate |
| 11 | [Bộ 7 — Control flow và script an toàn](bt-07-control-flow-an-toan.md) | `set -euo pipefail` (và giới hạn của nó), `case`, `while read`, `trap EXIT` | 10 | advanced |

**73 bài, phủ hết 7 reference + 6 skills của chủ đề Bash.** Làm theo đúng thứ tự 1 → 7
— bộ 6-7 giả định đã quen cú pháp cơ bản ở bộ 1-2.

Ký hiệu: ✅ đã chạy tay và xác nhận (`verified_at` có ngày) · 📝 output chạy thật khi
viết, `verified_at` chờ chủ repo chạy lại tay.

## Related Topics

- [Bash](../index.md) — chủ đề chứa thư mục này
- [Xử lý văn bản bằng pipeline](../skills/text-processing.md) — lý thuyết cho lab 1, bộ 4
- [Viết script an toàn](../skills/viet-script-an-toan.md) — lý thuyết cho lab 2, bộ 7
- [Regex cơ bản](../reference/regex-co-ban.md) — lý thuyết cho lab 3, bộ 5
- [Process và job control](../reference/process-va-job-control.md) — lý thuyết cho lab 4, bộ 3
- [Biến, mảng và parameter expansion](../skills/variables-arrays-expansion.md) · [Functions](../skills/functions.md) — lý thuyết cho bộ 2, bộ 6
