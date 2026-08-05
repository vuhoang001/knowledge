---
title: Bash
description: Shell scripting từ nền tảng tới script chạy được — streams, quoting, exit code, và những cạm bẫy làm hỏng script trong im lặng.
tags: [bash, shell, scripting, devops]
domain: devops
category: technology
doc_type: index
status: draft
difficulty: beginner
updated: 2026-08-05
---

# Bash

**Đây là công nghệ, nhưng phần mất giá chậm nhất của nó là *khái niệm*.** Cú pháp `awk`
có thể quên, nhưng hiểu *một dòng lệnh biến thành tiến trình thế nào*, *ba streams nối
vào nhau ra sao*, *vì sao không bọc nháy kép là hỏng* — những thứ đó đúng nguyên từ bash
1989 tới nay, và đúng cả trên zsh lẫn sh.

> Kho này viết lại từ [behitek/hoc-bash](https://github.com/behitek/hoc-bash) — nhưng
> nguồn đó **liệt kê lệnh**, còn ở đây mỗi mục trả lời *vì sao* và *cạm bẫy ở đâu*. Bash
> không khó vì nhiều lệnh; nó khó vì **hỏng trong im lặng**: script vẫn exit 0 trong khi
> bước quan trọng đã fail. Bốn [case study](case-studies/index.md) là bốn kiểu im lặng đó.

## Nội dung

Năm nhóm chuẩn — **mọi chủ đề trong kho đều dùng đúng bộ này**.

### [Tài liệu](reference/index.md) — nó là gì, vì sao, đánh đổi ra sao

| # | Tài liệu | Trả lời câu hỏi | Mức |
|---|---|---|---|
| 1 | [Shell là gì](reference/shell-la-gi.md) | Shell biến văn bản thành tiến trình; bash vs sh vs zsh | beginner |
| 2 | [Streams và redirection](reference/streams-va-redirection.md) | stdin/stdout/stderr và cách nối lại | beginner |
| 3 | [Quoting và expansion](reference/quoting-va-expansion.md) | Word splitting, glob, và vì sao luôn `"$var"` | intermediate |
| 4 | [Exit code và control flow](reference/exit-code-va-control-flow.md) | `if` chạy trên thành/bại, không phải true/false | beginner |
| 5 | [File permissions](reference/file-permissions.md) | Đọc `-rwxr-xr-x`, đổi bằng octal | beginner |
| 6 | [Process và job control](reference/process-va-job-control.md) | `&`, `nohup`, signal, `kill` | intermediate |

### [Kỹ năng](skills/index.md) — gặp tình huống X thì làm sao

| # | Kỹ năng | Trả lời câu hỏi | Mức |
|---|---|---|---|
| 1 | [Xử lý văn bản bằng pipeline](skills/text-processing.md) | `grep`/`awk`/`sed`/`sort`/`uniq` ghép lại | intermediate |
| 2 | [Tìm file với find và xargs](skills/find-va-xargs.md) | Duyệt cây, chạy hàng loạt, an toàn với tên có dấu cách | intermediate |
| 3 | [Biến, mảng và parameter expansion](skills/variables-arrays-expansion.md) | Default, substring, thay chuỗi không cần `sed` | intermediate |
| 4 | [Điều kiện và vòng lặp](skills/conditionals-va-loops.md) | `[[ ]]`, `case`, và `while read` đọc file đúng cách | beginner |
| 5 | [Hàm trong bash](skills/functions.md) | `echo` trả dữ liệu, `return` trả exit code, `local` | intermediate |
| 6 | [Viết script an toàn](skills/viet-script-an-toan.md) | `set -euo pipefail`, quoting, `trap` — khung mọi script | advanced |

### Ba nhóm còn lại

| Nhóm | Nội dung |
|---|---|
| [Bài tập](tutorials/index.md) | **2 lab chạy thật** — pipeline trên `access.log`, và viết script từ `hello` tới có `trap` |
| [Cheatsheet](cheatsheets/index.md) | [Lệnh theo nhóm](cheatsheets/commands.md) · [Toán tử test và expansion](cheatsheets/test-operators-va-expansion.md) |
| [Case study](case-studies/index.md) | **4 ca** — word splitting, pipe nuốt exit code, glob không khớp, `set -e` không bắt |

**Tài liệu hay Kỹ năng?** Tài liệu trả lời *"nó là gì"*; Kỹ năng trả lời *"gặp tình
huống X thì xử lý ra sao"*. `text-processing` và `viet-script-an-toan` đều giả định bạn
đã biết quoting và exit code — nên chúng là kỹ năng, không phải nền tảng.

## Learning Path

```text
Shell là gì            ← bắt đầu ở đây
      ↓
Streams và redirection   ·   File permissions
      ↓
Quoting và expansion     ← chỗ hầu hết bug đến từ đây
      ↓
Exit code và control flow
      ↓
Điều kiện, vòng lặp · Biến, mảng · Hàm
      ↓
Lab: xử lý văn bản   ·   Lab: script đầu tiên   ← chạy thật ở đây
      ↓
Viết script an toàn (set -euo pipefail, trap)
      ↓
Đọc bốn case study — để nhận ra cạm bẫy TRƯỚC khi nó cắn
```

**Đường ngắn nhất tới chỗ dùng được:** Shell → Streams → Quoting → Exit code → Lab script.

## Vì sao quoting và exit code là trọng tâm

Biết mười lệnh mới **không** cứu bạn khỏi hai lỗi đắt nhất của bash, vì cả hai đều **không
báo lỗi**:

- Không bọc nháy kép quanh biến → tên file có dấu cách phá vòng lặp, `rm` xoá nhầm. SQL
  đúng, cú pháp đúng, chạy sạch — cho tới đúng file định mệnh.
- Pipeline thiếu `set -o pipefail` → lệnh giữa pipe fail nhưng script exit 0, báo thành
  công trong khi backup rỗng.

Đây là lý do năm nhóm ở trên đặt [Quoting](reference/quoting-va-expansion.md) và
[Exit code](reference/exit-code-va-control-flow.md) làm nền, và dành hẳn bốn case study
cho các kiểu hỏng im lặng.

## Related Topics

- [DevOps](../devops/index.md) — bash là keo dán của mọi thứ vận hành
- [Networking](../networking/index.md) — `ssh`, `scp`, `curl` sống ở đây
- [Glossary](../glossary/index.md)
