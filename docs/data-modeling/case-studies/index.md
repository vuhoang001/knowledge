---
title: Case study — Data Modeling
sidebar_position: 0
description: Hai mươi tư kiểu hỏng kinh điển của mô hình chiều, mỗi cái kèm triệu chứng, giả thuyết sai lúc đầu, và cách sửa.
tags: [case-study, data-modeling]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Case study — Data Modeling

Hai mươi tư kiểu hỏng kinh điển của mô hình chiều. Mỗi bài đi theo cùng một mạch:
**triệu chứng → giả thuyết sai lúc đầu → nguyên nhân thật → cách sửa → dấu hiệu nhận ra
sớm**.

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
| 8 | [Quý tài chính lệch 202%](bao-cao-quy-tai-chinh-lech.md) | `quarter()` trả lời quý dương lịch — không ai hỏi câu đó | [Date dimension](../reference/date-dimension.md) |
| 9 | [Dim đơn hàng làm phồng doanh thu 40%](dim-don-hang-lam-phong-doanh-thu.md) | Không phải khoá nào cũng đáng có dimension | [Degenerate dimension](../skills/degenerate-dimension.md) |
| 10 | [Báo cáo cấp 3 mất một nửa doanh thu](bao-cao-cap-3-mat-mot-nua.md) | Cây lệch bị dẹt cố định — nhánh nông rơi vào `NULL` | [Cây phân cấp](../skills/hierarchy.md) |
| 11 | [Miền Bắc bằng 0, mất 28% doanh thu](fact-den-muon-gan-sai-khu-vuc.md) | `AND la_hien_tai` vô hiệu hoá toàn bộ giá trị của Type 2 | [Dữ liệu về muộn](../skills/late-arriving.md) |
| 12 | [Dashboard 800, query tay 1.000](bang-tong-hop-lech-so.md) | Bảng tổng hợp lưu `avg` và không được nạp lại | [Aggregate fact table](../skills/aggregate-fact-table.md) |
| 13 | [Doanh thu tháng 1 tự giảm 10%](doanh-thu-doi-theo-ty-gia.md) | Quy đổi tiền tệ lúc đọc làm quá khứ di động | [Nhiều tiền tệ](../skills/multi-currency-uom.md) |
| 14 | [Nạp hai lần, xoá 10 dòng để diệt 5](nap-hai-lan-khong-truy-duoc.md) | Fact không mang dấu vết lần chạy thì chỉ xoá được theo ngày | [Audit dimension](../skills/audit-dimension.md) |
| 15 | [Lọc "khác huỷ" mất một phần tư](loc-khac-huy-mat-mot-phan-tu.md) | `NULL <> 'x'` trả về `UNKNOWN`, và `WHERE` chỉ giữ `TRUE` | [NULL trong fact và dimension](../skills/null-handling.md) |
| 16 | [Hai phòng, hai con số doanh thu](hai-phong-hai-doanh-thu.md) | Cùng tên cột, khác công thức — tỷ lệ tính ra hợp lý và vô nghĩa | [Conformed facts](../skills/conformed-facts.md) |
| 17 | [Dashboard đầy Y, N và y](co-y-n-tren-dashboard.md) | Mã hệ nguồn đi thẳng ra báo cáo; một khái niệm thành ba nhóm | [Thiết kế thuộc tính dimension](../skills/dimension-attribute-design.md) |
| 18 | [Phí ship phồng 133%](phi-ship-phong-133-phan-tram.md) | Số đo cấp đơn nhân bản xuống dòng đơn; tiền hàng vẫn khớp | [Header/line và phân bổ fact](../skills/allocated-facts.md) |
| 19 | [Fact tám khoá ngoại cho hai chiều](fact-hai-chuc-khoa-ngoai.md) | Mỗi cấp của một cây thành một dimension riêng | [Centipede fact table](../skills/centipede-fact.md) |
| 20 | [Cộng cột luỹ kế — phồng 2,13 lần](cong-cot-luy-ke.md) | Cột YTD trông y hệt cột doanh thu thường | [Year-to-date và timespan](../skills/ytd-timespan-facts.md) |
| 21 | [Cộng cột tổng hợp trong dimension](cong-cot-tong-hop-trong-dim.md) | Cột đúng, join đúng, fact đúng — kết quả sai | [Đưa hành vi vào dimension](../skills/behavior-dimension.md) |
| 22 | [dim_san_pham 67% ô trống](bang-san-pham-hai-phan-ba-o-trong.md) | Nhiều loại thực thể một bảng; không cột nào đặt được `NOT NULL` | [Thực thể không đồng nhất](../skills/heterogeneous-schema.md) |
| 23 | [Số hôm nay nhảy suốt ngày](so-hom-nay-nhay-suot-ngay.md) | Ngày chưa đầy vẫn được đếm là một ngày trọn vẹn | [Real-time fact table](../skills/real-time-fact.md) |
| 24 | [Năm mart, không mart nào ghép được](moi-mart-mot-dim-khach.md) | Dựng mart trước khi thống nhất dimension | [Bus architecture](../reference/bus-architecture.md) |

## Điểm chung của cả hai mươi tư

**Mọi kỹ thuật trong `reference/` và `skills/` của Data Modeling đều có ít nhất một case
study minh hoạ** — linter R15 kiểm điều này.

Chỉ đúng **một** ca có test đỏ, và test đỏ đó vô dụng: ở
[ca nạp hai lần](nap-hai-lan-khong-truy-duoc.md), `unique` báo "có trùng" nhưng không nói
được dòng nào là bản thừa. Hai mươi ba ca còn lại:

- SQL chạy đúng
- Test dbt xanh hết
- Pipeline xanh

Sai ở **bước quyết định trước khi viết dòng SQL đầu tiên**. Đó là lý do phần
[Nền tảng](../reference/index.md) đáng đọc kỹ hơn phần công cụ.

## Related Topics

- [Data Modeling](../index.md) — chủ đề chứa thư mục này
- [Tài liệu](../reference/index.md) — khái niệm nền của cả bốn ca
- [Kỹ năng](../skills/index.md) — kỹ thuật sửa từng ca
