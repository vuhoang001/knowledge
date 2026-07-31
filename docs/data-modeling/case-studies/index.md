---
title: Case study — Data Modeling
sidebar_position: 0
description: Bảy kiểu hỏng kinh điển của mô hình chiều, mỗi cái kèm triệu chứng, giả thuyết sai lúc đầu, và cách sửa.
tags: [case-study, data-modeling]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Case study — Data Modeling

Bảy kiểu hỏng kinh điển của mô hình chiều. Mỗi bài đi theo cùng một mạch: **triệu chứng
→ giả thuyết sai lúc đầu → nguyên nhân thật → cách sửa → dấu hiệu nhận ra sớm**.

> **Đây là tình huống dựng lại**, không phải sự cố đã gặp trong kho này — case study
> "thật" theo định nghĩa của [`ROUTING.md`](https://github.com/vuhoang001/knowledge/blob/main/ROUTING.md)
> phải là sự cố đã debug xong. Bù lại, **mọi con số đều chạy thật trên DuckDB**, dán lại
> là ra y hệt.

| # | Sự cố | Bài học | Kỹ thuật liên quan |
|---|---|---|---|
| 1 | [Báo cáo tháng 1 tự đổi số vào tháng 4](bao-cao-qua-khu-tu-doi-so.md) | Type 1 làm quá khứ đóng sổ vẫn đổi được | [SCD](../skills/scd.md) |
| 2 | [Doanh thu phồng 67% vì join hai fact](join-hai-fact-lam-phong-tong.md) | Hai fact khác grain join thẳng là nhân bản dòng | [Grain](../reference/grain.md) |
| 3 | [Dimension phồng 365 lần sau một năm](dimension-phinh-365-lan.md) | Type 2 phình theo nhịp cột đổi nhanh nhất | [Mini-dimension](../skills/mini-dimension.md) |
| 4 | [Hai mart đúng, ghép lại không trả lời được](hai-mart-khong-ghep-duoc.md) | Không conformed thì câu hỏi cắt ngang là bất khả thi | [Conformed dimension](../skills/conformed-dimension.md) |
| 5 | [Thêm trạng thái thứ tám](them-trang-thai-thu-tam.md) | Định nghĩa nghiệp vụ nằm trong `WHERE` thì không có chủ | [Junk dimension](../skills/junk-dimension.md) |
| 6 | [Một nửa số đơn biến mất](don-dang-giao-bien-mat.md) | `JOIN` thường loại sạch dòng có khoá `NULL` | [Role-playing dimension](../skills/role-playing-dimension.md) |
| 7 | [Chọn OBT rồi cần as-is](chon-obt-roi-can-as-is.md) | OBT cho as-was miễn phí, mất hẳn as-is | [Star/Snowflake/OBT](../reference/star-snowflake-obt.md) |

## Điểm chung của cả bảy

**Mọi kỹ thuật trong `reference/` và `skills/` của Data Modeling đều có ít nhất một case
study minh hoạ** — linter R15 kiểm điều này.

Không ca nào có **test đỏ, exception, hay log lỗi**. Cả bảy đều:

- SQL chạy đúng
- Test dbt xanh hết
- Pipeline xanh

Sai ở **bước quyết định trước khi viết dòng SQL đầu tiên**. Đó là lý do phần
[Nền tảng](../reference/index.md) đáng đọc kỹ hơn phần công cụ.

## Related Topics

- [Data Modeling](../index.md) — chủ đề chứa thư mục này
- [Tài liệu](../reference/index.md) — khái niệm nền của cả bốn ca
- [Kỹ năng](../skills/index.md) — kỹ thuật sửa từng ca
