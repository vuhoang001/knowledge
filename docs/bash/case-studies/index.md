---
title: Case study — Bash
sidebar_key: bash-case-studies
sidebar_position: 0
description: "Bốn kiểu hỏng script kinh điển, mỗi cái kèm triệu chứng chạy thật, giả thuyết sai lúc đầu, và cách sửa."
tags: [case-study, bash]
domain: devops
category: index
doc_type: index
updated: 2026-08-05
---

# Case study — Bash

Bốn kiểu hỏng script mà ai viết bash lâu cũng gặp. Mỗi bài đi theo cùng một mạch:
**triệu chứng → giả thuyết sai lúc đầu → nguyên nhân thật → cách sửa → dấu hiệu nhận ra sớm**.

> **Tình huống dựng lại**, không phải sự cố đã gặp trong kho này. Bù lại, **mọi lệnh và
> output đều chạy thật trên bash 5.3.9**, gõ lại là ra y hệt.

| # | Sự cố | Bài học | Kỹ thuật liên quan |
|---|---|---|---|
| 1 | [Tên file có dấu cách xoá nhầm cả thư mục](bien-khong-nhay-word-splitting.md) | Biến không nháy kép bị word splitting thành nhiều đối số | [Quoting và expansion](../reference/quoting-va-expansion.md) |
| 2 | [Pipeline xanh giả — lỗi giữa pipe bị nuốt](pipe-nuot-exit-code.md) | Exit code pipeline là của lệnh cuối, không có `pipefail` là mù | [Exit code và control flow](../reference/exit-code-va-control-flow.md) |
| 3 | [Vòng lặp chạy một lần với dấu sao literal](glob-khong-khop.md) | Glob không khớp thì bash để nguyên pattern, không trả rỗng | [Điều kiện và vòng lặp](../skills/conditionals-va-loops.md) |
| 4 | [set -e bật nhưng script vẫn chạy tiếp](set-e-khong-bat.md) | `set -e` có danh sách ngoại lệ dài, không thể tin một mình nó | [Viết script an toàn](../skills/viet-script-an-toan.md) |

## Related Topics

- [Bash](../index.md) — chủ đề chứa thư mục này
- [Viết script an toàn](../skills/viet-script-an-toan.md) — cách chặn cả bốn ca này từ đầu
