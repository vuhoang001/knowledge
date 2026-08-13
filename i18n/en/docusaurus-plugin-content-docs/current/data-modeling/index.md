---
title: Data Modeling
i18n_status: untranslated
description: Thiết kế bảng — grain, fact/dimension, SCD, và quy trình đi từ yêu cầu nghiệp vụ tới bảng chạy được.
tags: [data-modeling, kimball]
domain: data-engineering
category: concept
doc_type: index
status: stable
difficulty: intermediate
updated: 2026-07-31
---

# Data Modeling

**Đây là nhóm *khái niệm*, không phải công nghệ.** Không có lệnh nào để chạy, không có
phiên bản nào để nâng cấp. Kimball viết những thứ này năm 1996 và chúng vẫn đúng nguyên
trên Iceberg + Trino năm 2026 — trong khi công cụ đã đổi ba thế hệ.

Vì thế đây là phần **mất giá chậm nhất** trong cả kho. Học dbt mà không biết grain là
học cách gõ lệnh; biết grain rồi thì đổi sang công cụ nào cũng làm được.

> Chỗ này trả lời câu **"thiết kế bảng thế nào"**, không phải "chạy bằng gì". Phần chạy
> bằng gì nằm ở [dbt](../etl/dbt/index.md), [Iceberg](../storage/iceberg/index.md),
> [Trino](../query-engines/trino/index.md).

## Nội dung

Năm nhóm chuẩn — **mọi chủ đề trong kho đều dùng đúng bộ này**.

### [Tài liệu](reference/index.md) — nó là gì, vì sao, đánh đổi ra sao

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Grain](reference/grain.md) | Một dòng của bảng này đại diện cho **cái gì** | beginner | ✅ đã gặp thật |
| 2 | [Fact và Dimension](reference/fact-and-dimension.md) | Hai loại bảng; ba loại fact và additivity | beginner | 📝 review |
| 3 | [Surrogate key và Natural key](reference/surrogate-key.md) | Vì sao không dùng thẳng mã nghiệp vụ | intermediate | 📝 draft |
| 4 | [Quy trình thiết kế 4 bước](reference/design-process.md) | Từ yêu cầu nghiệp vụ tới bảng — theo thứ tự nào | intermediate | 📝 review |
| 5 | [Star, Snowflake, OBT](reference/star-snowflake-obt.md) | Ba cách bố trí; đo thật chi phí OBT, và chỗ Data Vault đứng | intermediate | 📝 review |
| 6 | [Date dimension](reference/date-dimension.md) | Vì sao lịch phải là bảng — quý tài chính, ngày lễ, múi giờ | beginner | 📝 draft |
| 7 | [Bus architecture và bus matrix](reference/bus-architecture.md) | Dựng từng quy trình một mà cuối cùng vẫn ghép lại được | intermediate | 📝 draft |

### [Kỹ năng](skills/index.md) — kỹ thuật áp dụng lên phần trên

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [**SCD**](skills/scd.md) | Giá trị đổi thì lịch sử xử lý thế nào (Type 0–7) | intermediate | 📝 review |
| 2 | [Phát hiện thay đổi cho SCD 2](skills/scd-change-detection.md) | Biết dòng nào đã đổi: so cột, hash, `updated_at`, CDC | advanced | 📝 draft |
| 3 | [Junk dimension](skills/junk-dimension.md) | Cột trạng thái vài giá trị: để thẳng, tách riêng, hay gộp | intermediate | 📝 draft |
| 4 | [Mini-dimension](skills/mini-dimension.md) | Dim lớn có vài cột đổi nhanh — tách sao cho Type 2 không phình | advanced | 📝 draft |
| 5 | [Role-playing dimension](skills/role-playing-dimension.md) | Một dim đóng nhiều vai trong cùng fact | intermediate | 📝 draft |
| 6 | [Conformed dimension](skills/conformed-dimension.md) | Điều kiện để cộng số từ hai fact khác nhau | advanced | 📝 draft |
| 7 | [Bridge table](skills/bridge-table.md) | Quan hệ nhiều-nhiều — tổng không bị nhân đôi | advanced | 📝 draft |
| 8 | [Degenerate dimension](skills/degenerate-dimension.md) | Số đơn hàng: ở lại fact hay dựng bảng riêng | intermediate | 📝 draft |
| 9 | [Cây phân cấp](skills/hierarchy.md) | Cây sâu không đều — dẹt, kéo cấp cha, hay bridge đường đi | advanced | 📝 draft |
| 10 | [Dữ liệu về muộn](skills/late-arriving.md) | Fact về sau khi dimension đã đổi, và ngược lại | advanced | 📝 draft |
| 11 | [Aggregate fact table](skills/aggregate-fact-table.md) | Bảng tổng hợp: cái gì được lưu, và vì sao nó trôi | intermediate | 📝 draft |
| 12 | [Nhiều tiền tệ và đơn vị đo](skills/multi-currency-uom.md) | Số đo có đơn vị thì cột số một mình là vô nghĩa | intermediate | 📝 draft |
| 13 | [Audit dimension](skills/audit-dimension.md) | Truy được dòng nào do lần chạy nào sinh ra | intermediate | 📝 draft |
| 14 | [NULL trong fact và dimension](skills/null-handling.md) | Logic ba trị làm bộ lọc âm thầm nuốt dòng | intermediate | 📝 draft |
| 15 | [Conformed facts](skills/conformed-facts.md) | Ghép được rồi, hai số đó có so được không | intermediate | 📝 draft |
| 16 | [Thiết kế thuộc tính dimension](skills/dimension-attribute-design.md) | Cờ dạng chữ, nhiều cây phân cấp, drill down, ghi chú | beginner | 📝 draft |
| 17 | [Header/line và phân bổ fact](skills/allocated-facts.md) | Số đo cấp đơn xuống cấp dòng, và P&L theo sản phẩm | advanced | 📝 draft |
| 18 | [Centipede fact table](skills/centipede-fact.md) | Fact hai chục khoá ngoại cho vài chiều thật | intermediate | 📝 draft |
| 19 | [Year-to-date và timespan](skills/ytd-timespan-facts.md) | Luỹ kế thì đừng lưu; khoảng hiệu lực thì phải lưu | intermediate | 📝 draft |
| 20 | [Đưa hành vi vào dimension](skills/behavior-dimension.md) | Số tổng hợp, phân khoảng động, nhóm nghiên cứu, step | advanced | 📝 draft |
| 21 | [Thực thể không đồng nhất](skills/heterogeneous-schema.md) | Supertype/subtype khi các loại không chung thuộc tính | advanced | 📝 draft |
| 22 | [Real-time fact table](skills/real-time-fact.md) | Ngày hôm nay chưa đầy nhưng vẫn được đếm là một ngày | advanced | 📝 draft |

### Ba nhóm còn lại

| Nhóm | Nội dung |
|---|---|
| [Bài tập](tutorials/index.md) | **7 lab chạy thật** — star schema, SCD, nền tảng, dimension, fact nâng cao, tích hợp, vận hành |
| [Cheatsheet](cheatsheets/index.md) | [SCD — tra nhanh](cheatsheets/scd.md) |
| [Case study](case-studies/index.md) | **24 ca** — mỗi kỹ thuật ở trên có ít nhất một ca hỏng cụ thể |

Ký hiệu: ✅ đã chạy tay và xác nhận · 📝 lý thuyết, `verified_at` còn trống

Cột `#` là thứ tự học **trong từng nhóm**, và cũng là `sidebar_position`. Hai chỗ này
phải khớp — lệch là sidebar dẫn người đọc đi sai đường.

**Tài liệu hay Kỹ năng?** Tài liệu trả lời *"nó là gì"*; Kỹ năng trả lời *"gặp tình
huống X thì xử lý ra sao"*. SCD và junk dimension đều giả định bạn đã biết grain và
fact/dimension — nên chúng là kỹ năng, không phải nền tảng.

## Vì sao tách "Tài liệu" và "Kỹ năng"

Biết SCD Type 2 là gì (khái niệm) **không** đồng nghĩa với biết khi nào nên dùng nó
(cách làm). Phần lớn tài liệu chỉ dạy vế đầu — liệt kê Type 1/2/3 kèm ví dụ bảng, rồi
hết. Vế thứ hai mới là chỗ mất tiền:

- Chọn Type 2 cho cột đổi hằng ngày → dimension phình gấp trăm lần, query chậm dần.
- Chọn Type 1 cho cột dùng để chia báo cáo → **báo cáo quá khứ tự đổi số**, và không ai
  biết vì sao tháng 6 tuần này khác tháng 6 tuần trước.

Cả hai lỗi đều **không phải lỗi kỹ thuật**. SQL đúng, test xanh, pipeline xanh. Sai ở
bước quyết định trước khi viết dòng SQL đầu tiên.

## Learning Path

```text
SQL (join, group by)
      ↓
Grain                    ← bắt đầu ở đây
      ↓
Fact và Dimension
      ↓
Surrogate key · Date dimension · Degenerate dimension
      ↓
SCD                      ← trọng tâm
      ↓
Quy trình thiết kế 4 bước
      ↓
Lab: dựng star schema bằng DuckDB   ← chạy thật ở đây
      ↓
Star / Snowflake / OBT
      ↓
Kỹ thuật theo tình huống: cây phân cấp, dữ liệu về muộn,
bảng tổng hợp, nhiều tiền tệ, audit dimension
      ↓
Triển khai bằng dbt snapshot
```

**Đường ngắn nhất tới chỗ dùng được: Grain → Fact/Dimension → SCD → Quy trình → Lab.**

## Bản đồ so với danh sách kỹ thuật Kimball

Kho này bám theo [danh sách kỹ thuật mô hình chiều của Kimball Group](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/).
Bảng dưới cho biết đang phủ tới đâu — để biết cái gì còn thiếu mà không phải mở lại trang
gốc đối chiếu.

| Nhóm kỹ thuật Kimball | Số kỹ thuật | Đã phủ | Còn thiếu |
|---|---|---|---|
| Khái niệm nền | 9 | 9 | — |
| Fact table cơ bản | 10 | 10 | — |
| Dimension cơ bản | 14 | 14 | — |
| Tích hợp qua conformed dimension | 7 | 7 | — |
| SCD | 8 | 8 | — |
| Cây phân cấp | 3 | 3 | — |
| Fact table nâng cao | 13 | 13 | — |
| Dimension nâng cao | 14 | 12 | dimension-to-dimension join và behavior tag time series mới ở mức một mục, chưa có case study riêng |
| Schema chuyên dụng | 3 | 3 | — |

Toàn bộ **81 kỹ thuật** trong danh sách Kimball đã có chỗ trong kho. Hai kỹ thuật ở dòng
áp chót được viết như một mục bên trong file khác thay vì file riêng — chúng hiếm gặp tới
mức dựng case study riêng sẽ là bịa tình huống, và luật [R15](https://github.com/vuhoang001/knowledge/blob/main/ROUTING.md)
tồn tại để chặn đúng việc đó.

Phủ hết danh sách **không** phải mục tiêu tự thân. Giá trị nằm ở chỗ mỗi kỹ thuật đều đi
kèm một ca hỏng có số chạy thật — đọc bảng đánh đổi thì quên, nhớ được là con số.

## Related Topics

- [Data Quality](../data-quality/index.md) — kiểm chứng mô hình sau khi dựng
- [dbt](../etl/dbt/index.md) — công cụ hiện thực hoá
- [SQL](../databases/sql/index.md) — nền của mọi thứ ở đây
- [Cheatsheet SCD](cheatsheets/scd.md)
- [Glossary](../glossary/index.md)
