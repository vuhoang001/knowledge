# Bộ rule định tuyến

Trả lời đúng một câu hỏi: **một mẩu kiến thức mới thì đi vào đâu, và mang metadata gì.**

Cưỡng chế bằng `npm run lint` ([`scripts/lint-docs.mjs`](scripts/lint-docs.mjs)), chạy
trong CI trước `npm run build`. Rule không có thứ cưỡng chế thì sáu tháng nữa lại lệch —
sidebar sắp theo alphabet suốt bốn tháng mà không ai biết là ví dụ.

## Ba trục phân loại

Sai lầm dễ nhất là nhét mọi thứ vào một trường rồi tưởng đã phân loại. Ba trục dưới đây
**độc lập nhau** — một file luôn có cả ba, và không trục nào suy ra được trục khác.

| Trục | Trả lời | Quyết định | Trường |
|---|---|---|---|
| **Loại tài liệu** | Nó là *dạng* gì? | **Thư mục gốc** | `category` (xem nợ kỹ thuật bên dưới) |
| **Lĩnh vực** | Nó thuộc mảng nào? | Thư mục con cấp 1 | `domain` |
| **Loại tri thức** | Nó là *kiểu* hiểu biết nào? | Không quyết định chỗ — dùng để lọc | `category` |

## Trục 1 — Loại tài liệu quyết định thư mục gốc

Đi từ trên xuống, dừng ở dòng đầu tiên đúng:

| Hỏi | Đúng thì vào |
|---|---|
| Chưa hiểu, mới quăng về? | `inbox/` |
| Chạy được, có output dán lại được? | `docs/tutorials/` |
| Một sự cố thật đã debug xong? | `docs/case-studies/` |
| Bảng tra khi **đang làm**, không dùng để học lần đầu? | `docs/cheatsheets/` |
| Định nghĩa một câu cho một thuật ngữ? | `docs/glossary/` |
| Câu hỏi cắt ngang nhiều chủ đề? | `docs/faqs/` |
| Đoạn code chạy nguyên trạng, để copy? | `docs/examples/` |
| Giải thích *nó là gì, vì sao, đánh đổi ra sao*? | `docs/<domain>/` |

Dòng cuối là mặc định. Nếu phân vân giữa `docs/` và `tutorials/`: có **output thật dán
vào** thì là tutorial, không thì là docs.

## Trục 2 — Lĩnh vực quyết định thư mục con

`docs/<domain>/` với `domain` khớp trường frontmatter cùng tên: `data-engineering`,
`backend`, `devops`, `ai`, …

Gắn với một công nghệ cụ thể thì xuống một tầng: `docs/<domain>/<công nghệ>/`.
Ví dụ `docs/etl/dbt/`. **Tối đa ba tầng dưới `docs/`** — cần tầng thứ tư nghĩa là
component đó nên tách thành công nghệ riêng.

## Trục 3 — Tầng học, khi một thư mục vượt ~5 file

Đây là rule sinh ra từ sự cố thật: `docs/data-modeling/` phẳng với 7 file, sidebar sắp
alphabet, nên "Quy trình thiết kế 4 bước" (bước 6/7) hiện trước "Grain" (bước 1), và
`junk-dimension` — một kỹ thuật hẹp — đứng ngang hàng với `fact-and-dimension` là khái
niệm nền.

Khi một thư mục vượt khoảng 5 file, chia theo **quan hệ phụ thuộc**, không theo chủ đề:

| Tầng | Phép thử | Ví dụ ở `data-modeling/` |
|---|---|---|
| 1. Nền tảng | Bỏ nó đi thì các tầng trên **không đọc được** | `foundations/` — grain, fact/dimension, surrogate key |
| 2. Kỹ thuật | Xử lý một tình huống **trên** một mô hình đã có | `dimension-techniques/` — SCD, junk dimension |
| 3. Toàn cục | Quyết định thứ áp cho **nhiều bảng cùng lúc** | `layout-and-process/` — star/OBT, quy trình 4 bước |

Tên thư mục tiếng Anh kebab-case; nhãn tiếng Việt đặt trong `_category_.json`.

**Phép thử "cùng cấp":** hai file cùng tầng khi có thể đọc theo thứ tự nào cũng được.
Nếu A phải đọc trước B mới hiểu B, chúng không cùng cấp.

## Thứ tự học phải khai ở hai chỗ, và phải khớp

| Chỗ | Cách khai |
|---|---|
| Bảng mục lục trong `index.md` | cột `#` |
| Sidebar | `sidebar_position` trong frontmatter |

Thiếu `sidebar_position` là Docusaurus sắp theo alphabet — im lặng, không lỗi nào báo.
Linter chặn (R5, R10).

## Frontmatter

```yaml
---
title: Junk dimension và cột cardinality thấp
sidebar_position: 2              # khớp cột # trong index.md
description: "Một câu — thứ dùng để tìm lại file này"
tags: [junk-dimension, dimension, kimball]
domain: data-engineering
category: concept                # concept | technology | pattern | tool
status: draft                    # draft | review | stable
difficulty: intermediate         # beginner | intermediate | advanced
verified_at:                     # TRỐNG cho tới khi chạy tay và thấy output
updated: 2026-07-31
---
```

`description` chứa dấu `:` thì **phải quote** — không quote là build chết (R3).

## Rule linter cưỡng chế

**ERROR — chặn CI:**

| # | Rule |
|---|---|
| R1 | Frontmatter đủ trường bắt buộc |
| R2 | `category`/`status`/`difficulty` thuộc tập giá trị hợp lệ |
| R3 | `description` chứa `:` phải quote |
| R4 | `verified_at` trống hoặc đúng dạng `YYYY-MM-DD` |
| R5 | File nội dung phải có `sidebar_position` |
| R6 | Không mồ côi — `index.md` cùng thư mục phải trỏ tới |
| R9 | Tối đa ba tầng dưới `docs/` |
| R10 | `sidebar_position` không trùng trong cùng thư mục |
| R11 | Thư mục có `_category_.json` phải có ít nhất một `.md` |

**WARN — không chặn, là nợ cần trả dần:**

| # | Rule |
|---|---|
| R2b | `category` đang gánh cả loại tài liệu lẫn loại tri thức |
| R7 | File có trong manifest `docs/index.md` |
| R8 | File có mục `## Related Topics` |

## Nợ kỹ thuật đã biết

**`category` đang gánh hai trục.** Nó chứa lẫn lộn loại tri thức (`concept`,
`technology`, `pattern`, `tool`) và loại tài liệu (`cheatsheet`, `faq`, `example`,
`reference`, `tutorial`, `case-study`). Vì thế không lọc được câu hỏi kiểu *"cho tôi mọi
`concept` về data-engineering"* — các cheatsheet về cùng chủ đề không mang nhãn đó.

Cách sửa: thêm trường `doc_type` cho trục tài liệu, trả `category` về đúng một việc.
Chạm 8 file. Linter đang báo WARN (R2b) chứ chưa chặn, để việc này làm được lúc rảnh.
