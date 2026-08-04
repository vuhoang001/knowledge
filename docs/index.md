---
title: Second Brain — Mục lục
description: Manifest phẳng — mọi file trong docs/ với một câu chốt và trạng thái kiểm chứng. Đọc file này là biết đi đâu.
slug: /
tags: [index, manifest]
category: concept
doc_type: index
status: stable
updated: 2026-07-31
---

# Mục lục `docs/`

Trang này liệt kê **mọi file** trong `docs/` ở một chỗ, để không phải mở lần lượt từng
`index.md` con. Mỗi thư mục công nghệ vẫn có `index.md` riêng với bản đồ khái niệm và
lộ trình chi tiết — trang này chỉ trả lời *"thứ tôi cần nằm ở file nào"*.

**Ký hiệu:** ✅ đã chạy tay · 📝 lý thuyết, chưa kiểm chứng · 🟡 mới có khung + bẫy · 🗂️ mục lục

> **Hai đường vào cùng một tập file.** Trang này gom theo **chủ đề**. Muốn gom theo
> **dạng tài liệu** — tài liệu tham chiếu / bài tập / case study / cheatsheet — thì xem
> [`catalog.md`](catalog.md). Muốn cắt theo cả hai cùng lúc thì dùng trang tag, ví dụ
> [`/tags/data-modeling`](/tags/data-modeling).

## Data Modeling

Thiết kế bảng. Đọc [`grain`](data-modeling/reference/grain.md) trước mọi thứ khác.

| File | Trả lời câu hỏi | TT |
|---|---|---|
| [data-modeling/index](data-modeling/index.md) | Bản đồ khái niệm + thứ tự đọc | 🗂️ |
| [grain](data-modeling/reference/grain.md) | Một dòng của bảng này đại diện cho cái gì | ✅ |
| [fact-and-dimension](data-modeling/reference/fact-and-dimension.md) | Cái gì vào fact, cái gì vào dimension; ba loại fact và additivity | 📝 |
| [scd](data-modeling/skills/scd.md) | Thuộc tính đổi thì báo cáo quá khứ dùng giá trị nào — tám cách (Type 0–7) | 📝 |
| [scd-change-detection](data-modeling/skills/scd-change-detection.md) | Bốn cách biết dòng nào đã đổi, và bốn bẫy của hash | 🟡 |
| [junk-dimension](data-modeling/skills/junk-dimension.md) | Cột cardinality thấp: để thẳng trong fact, tách dimension, hay gộp chung | 🟡 |
| [mini-dimension](data-modeling/skills/mini-dimension.md) | Tách cột đổi nhanh khỏi dim lớn — lịch sử chuyển sang fact | 🟡 |
| [role-playing-dimension](data-modeling/skills/role-playing-dimension.md) | Một dim nhiều vai — dùng view có tên rõ nghĩa, không copy bảng | 🟡 |
| [conformed-dimension](data-modeling/skills/conformed-dimension.md) | Cùng khoá và cùng nghĩa thì mới ghép được số giữa hai fact | 🟡 |
| [bridge-table](data-modeling/skills/bridge-table.md) | Nhiều-nhiều: hệ số phân bổ để tổng không phồng | 🟡 |
| [design-process](data-modeling/reference/design-process.md) | Từ yêu cầu nghiệp vụ mơ hồ tới bảng chạy được, bốn bước | 📝 |
| [star-snowflake-obt](data-modeling/reference/star-snowflake-obt.md) | Ba cách bố trí; đo thật OBT vs star: 0.76x hay 10.23x tuỳ cardinality | 📝 |
| [date-dimension](data-modeling/reference/date-dimension.md) | Vì sao lịch phải là bảng — quý tài chính lệch 202% nếu dùng `quarter()` | 📝 |
| [degenerate-dimension](data-modeling/skills/degenerate-dimension.md) | Số đơn hàng ở lại fact; dựng dim cho nó là tạo bảng cùng grain với fact | 📝 |
| [hierarchy](data-modeling/skills/hierarchy.md) | Cây sâu không đều: dẹt cố định mất 50% dòng, bridge đường đi thì không | 📝 |
| [late-arriving](data-modeling/skills/late-arriving.md) | Fact về muộn gán sai phiên bản dim; dim về muộn thì dùng inferred member | 📝 |
| [aggregate-fact-table](data-modeling/skills/aggregate-fact-table.md) | Bảng tổng hợp chỉ lưu số cộng được; dim rút gọn sinh từ dim gốc | 📝 |
| [multi-currency-uom](data-modeling/skills/multi-currency-uom.md) | Chốt cả số bản địa lẫn số quy đổi vào fact, kèm tỷ giá đã dùng | 📝 |
| [audit-dimension](data-modeling/skills/audit-dimension.md) | Mỗi dòng fact trỏ về lần chạy sinh ra nó; error event schema cho dòng bị loại | 📝 |
| [Lab: star schema DuckDB](data-modeling/tutorials/star-schema-duckdb.md) | Dựng 3 fact + dim dùng chung từ dữ liệu thô, kèm 4 phép kiểm bắt buộc | 📝 |
| [bus-architecture](data-modeling/reference/bus-architecture.md) | Bus matrix là bảng dữ liệu, không phải slide; value chain và drill-across dọc chuỗi | 📝 |
| [null-handling](data-modeling/skills/null-handling.md) | `NULL <> 'x'` trả về `UNKNOWN` — bộ lọc nuốt dòng mà không báo | 📝 |
| [conformed-facts](data-modeling/skills/conformed-facts.md) | Cùng tên phải cùng nghĩa; không conform thì bắt buộc đổi tên | 📝 |
| [dimension-attribute-design](data-modeling/skills/dimension-attribute-design.md) | Cờ dạng chữ, nhiều cây phân cấp song song, drill down, text comment | 📝 |
| [allocated-facts](data-modeling/skills/allocated-facts.md) | Header/line, phân bổ theo tỷ trọng, và P&L tới cấp sản phẩm | 📝 |
| [centipede-fact](data-modeling/skills/centipede-fact.md) | 8 khoá ngoại cho 2 chiều thật; outrigger phá as-was của Type 2 | 📝 |
| [ytd-timespan-facts](data-modeling/skills/ytd-timespan-facts.md) | Luỹ kế đừng lưu, khoảng hiệu lực phải lưu; khoá thay thế cho dòng fact | 📝 |
| [behavior-dimension](data-modeling/skills/behavior-dimension.md) | Số tổng hợp làm thuộc tính, phân khoảng động, study group, step | 📝 |
| [heterogeneous-schema](data-modeling/skills/heterogeneous-schema.md) | Supertype/subtype, measure type dimension, và hai kỹ thuật nên tránh | 📝 |
| [real-time-fact](data-modeling/skills/real-time-fact.md) | Phân vùng nóng: ngày chưa đầy vẫn được đếm là một ngày trọn vẹn | 📝 |
| [CS: báo cáo quá khứ tự đổi số](data-modeling/case-studies/bao-cao-qua-khu-tu-doi-so.md) | Type 1 làm báo cáo đã đóng sổ đổi số khi chạy lại | 📝 |
| [CS: join hai fact phồng tổng](data-modeling/case-studies/join-hai-fact-lam-phong-tong.md) | Hai fact khác grain join thẳng — doanh thu phồng 67% | 📝 |
| [CS: dimension phồng 365 lần](data-modeling/case-studies/dimension-phinh-365-lan.md) | Type 2 cho cột đổi hằng ngày: 100k khách thành 36,5tr dòng | 📝 |
| [CS: hai mart không ghép được](data-modeling/case-studies/hai-mart-khong-ghep-duoc.md) | Thiếu conformed dimension — câu hỏi cắt ngang bất khả thi | 📝 |
| [CS: thêm trạng thái thứ tám](data-modeling/case-studies/them-trang-thai-thu-tam.md) | Danh sách trạng thái hardcode trong WHERE — hụt 21% doanh thu | 📝 |
| [CS: một nửa số đơn biến mất](data-modeling/case-studies/don-dang-giao-bien-mat.md) | `JOIN` loại sạch đơn chưa giao — 4 đơn còn 2 | 📝 |
| [CS: chọn OBT rồi cần as-is](data-modeling/case-studies/chon-obt-roi-can-as-is.md) | OBT không có khái niệm phiên bản, as-is bất khả thi | 📝 |
| [CS: quý tài chính lệch 202%](data-modeling/case-studies/bao-cao-quy-tai-chinh-lech.md) | `quarter()` trả lời quý dương lịch — không ai hỏi câu đó | 📝 |
| [CS: dim đơn hàng phồng 40%](data-modeling/case-studies/dim-don-hang-lam-phong-doanh-thu.md) | Dimension có grain bằng fact thì nó nhân bản dòng | 📝 |
| [CS: báo cáo cấp 3 mất một nửa](data-modeling/case-studies/bao-cao-cap-3-mat-mot-nua.md) | Cây lệch bị dẹt cố định — nhánh nông rơi vào `NULL` rồi bị lọc | 📝 |
| [CS: Miền Bắc bằng 0](data-modeling/case-studies/fact-den-muon-gan-sai-khu-vuc.md) | `AND la_hien_tai` vô hiệu hoá Type 2; `INNER JOIN` mất 28% doanh thu | 📝 |
| [CS: dashboard 800, query tay 1.000](data-modeling/case-studies/bang-tong-hop-lech-so.md) | Bảng tổng hợp lưu `avg` và không được nạp lại cùng cửa sổ | 📝 |
| [CS: doanh thu tự giảm 10%](data-modeling/case-studies/doanh-thu-doi-theo-ty-gia.md) | Quy đổi tiền tệ lúc đọc làm quá khứ di động theo tỷ giá | 📝 |
| [CS: nạp hai lần, không truy được](data-modeling/case-studies/nap-hai-lan-khong-truy-duoc.md) | Không có audit dimension thì chỉ xoá được theo khoảng ngày | 📝 |
| [CS: lọc "khác huỷ" mất 1/4](data-modeling/case-studies/loc-khac-huy-mat-mot-phan-tu.md) | Logic ba trị: `NULL <> 'huy'` không phải `TRUE` | 📝 |
| [CS: hai phòng hai doanh thu](data-modeling/case-studies/hai-phong-hai-doanh-thu.md) | Cùng tên cột khác công thức — tỷ lệ 89,4% hợp lý và vô nghĩa | 📝 |
| [CS: dashboard đầy Y, N và y](data-modeling/case-studies/co-y-n-tren-dashboard.md) | Mã hệ nguồn ra thẳng báo cáo; một khái niệm thành ba nhóm | 📝 |
| [CS: phí ship phồng 133%](data-modeling/case-studies/phi-ship-phong-133-phan-tram.md) | Số đo cấp đơn nhân bản xuống dòng đơn, tiền hàng vẫn khớp | 📝 |
| [CS: fact tám khoá ngoại](data-modeling/case-studies/fact-hai-chuc-khoa-ngoai.md) | Mỗi cấp của một cây thành một dimension riêng | 📝 |
| [CS: cộng cột luỹ kế](data-modeling/case-studies/cong-cot-luy-ke.md) | Cột YTD trông y hệt cột doanh thu — phồng 2,13 lần | 📝 |
| [CS: cộng cột tổng hợp trong dim](data-modeling/case-studies/cong-cot-tong-hop-trong-dim.md) | Cột đúng, join đúng, fact đúng — kết quả phồng 1,99 lần | 📝 |
| [CS: dim_san_pham 67% ô trống](data-modeling/case-studies/bang-san-pham-hai-phan-ba-o-trong.md) | Nhiều loại thực thể một bảng, không đặt được `NOT NULL` | 📝 |
| [CS: số hôm nay nhảy suốt ngày](data-modeling/case-studies/so-hom-nay-nhay-suot-ngay.md) | Ngày chưa đầy vẫn là mẫu số 1 — 862,5 lúc 11h, 1.050 lúc 21h | 📝 |
| [CS: năm mart không ghép được](data-modeling/case-studies/moi-mart-mot-dim-khach.md) | Dựng mart trước khi thống nhất dimension | 📝 |
| [surrogate-key](data-modeling/reference/surrogate-key.md) | Vì sao không dùng thẳng mã nghiệp vụ làm khoá dimension | 🟡 |

## Data Quality

| File | Trả lời câu hỏi | TT |
|---|---|---|
| [data-quality/index](data-quality/index.md) | Ba tầng bảo vệ dữ liệu, không phụ thuộc công cụ | 🗂️ |
| [six-dimensions](data-quality/six-dimensions.md) | Uniqueness, completeness, validity, integrity, timeliness, accuracy | 📝 |

## ETL & Streaming

### dbt — [`etl/dbt/`](etl/dbt/index.md)

Lab ở `~/Documents/learn-lab/dbt` (ngoài repo): venv riêng, `dbt-duckdb`, seed sẵn.

| # | File | Trả lời câu hỏi | TT |
|---|---|---|---|
| — | [etl/dbt/index](etl/dbt/index.md) | Bản đồ khái niệm + lộ trình | 🗂️ |
| 01 | [what-is-dbt](etl/dbt/reference/what-is-dbt.md) | SQL mà dbt sinh ra thật sự trông thế nào | ✅ |
| 02 | [project-structure](etl/dbt/reference/project-structure.md) | `dbt_project.yml`, `profiles.yml`; `compiled/` khác `run/` chỗ nào | 📝 |
| 03 | [models-and-ref](etl/dbt/reference/models-and-ref.md) | `ref()` là cách duy nhất khai báo phụ thuộc; DAG selector, ephemeral, vòng | 📝 |
| 04 | [sources-seeds-snapshots](etl/dbt/reference/sources-seeds-snapshots.md) | source freshness, seed, và vì sao snapshot mất là mất luôn | 📝 |
| 05 | [materializations](etl/dbt/reference/materializations.md) | Cùng SELECT khác DDL; `is_incremental()` trước/sau, bốn câu hỏi | 📝 |
| 06 | [testing](etl/dbt/reference/testing.md) | Ba tầng: test · contract · unit test | 📝 |
| 07 | [macros-jinja-packages](etl/dbt/reference/macros-jinja-packages.md) | Jinja biến mất trong SQL compile; macro, run_query, hook | 📝 |
| 08 | [docs-and-lineage](etl/dbt/reference/docs-and-lineage.md) | manifest = ý định, catalog = hiện thực; `state:modified` cho CI | 📝 |
| SK | [skills/implementing-tests](etl/dbt/skills/implementing-tests.md) | Sáu loại test dbt: generic, package, singular, tự viết, unit test, contract | 📝 |
| CS | [case-studies/ai-sinh-sai-ten-catalog-trino](etl/dbt/case-studies/ai-sinh-sai-ten-catalog-trino.md) | Vì sao `verified_at` tồn tại — AI bịa tên catalog, mất một buổi | 📝 |

Bài tập chạy thật: [`etl/dbt/tutorials/dbt-lab-duckdb.md`](etl/dbt/tutorials/dbt-lab-duckdb.md).

### Streaming

| File | Chốt một câu | TT |
|---|---|---|
| [etl/kafka/index](etl/kafka/index.md) | Kafka là một cái log, không phải hàng đợi — message không mất khi đọc xong | 🟡 |
| [etl/flink/index](etl/flink/index.md) | Engine stream có state; event time và watermark là chỗ sai nhiều nhất | 🟡 |

## Storage · Query Engines · Orchestration

| File | Chốt một câu | TT |
|---|---|---|
| [storage/iceberg/index](storage/iceberg/index.md) | Table format — lớp metadata, không phải file format, không phải engine | 🟡 |
| [query-engines/trino/index](query-engines/trino/index.md) | Query engine phân tán, không lưu dữ liệu; đọc nhiều nguồn qua connector | 🟡 |
| [orchestration/airflow/index](orchestration/airflow/index.md) | Airflow điều phối, không xử lý — `logical_date` không phải "bây giờ" | 🟡 |

## Nền tảng

| File | Chốt một câu | TT |
|---|---|---|
| [databases/sql/index](databases/sql/index.md) | Phần SQL mà dbt và Trino bắt phải chắc: grain, join, window function, plan | 🟡 |
| [languages/python/index](languages/python/index.md) | Phần Python hạ tầng dữ liệu thật sự dùng — và khi nào **không** nên dùng pandas | 🟡 |

## Thư mục đã dựng, chưa có nội dung

[concepts](concepts/) · [architecture](architecture/) · [patterns](patterns/) ·
[algorithms](algorithms/) · [protocols](protocols/) · [tools](tools/) ·
[backend](backend/) · [frontend](frontend/) · [devops](devops/) · [cloud](cloud/) ·
[ai](ai/) · [security](security/) · [networking](networking/)

Mỗi thư mục có `_category_.json` (nhãn + thứ tự sidebar) và một `index.md` giữ chỗ —
Docusaurus báo lỗi nếu một category rỗng.

## Loại tài liệu khác

**Bài tập, case study, cheatsheet nằm *trong* từng chủ đề**, không gom ở thư mục toàn
cục nữa — mở dbt là thấy luôn bài tập và case study của dbt.

| Dạng | Ở đâu | Ví dụ |
|---|---|---|
| Bài tập | `docs/<chủ đề>/tutorials/` | [etl/dbt/tutorials/](etl/dbt/tutorials/index.md) |
| Case study | `docs/<chủ đề>/case-studies/` | [etl/dbt/case-studies/](etl/dbt/case-studies/index.md) |
| Cheatsheet | `docs/<chủ đề>/cheatsheets/` | [data-modeling/cheatsheets/](data-modeling/cheatsheets/index.md) |
| FAQ | toàn cục — cắt ngang nhiều chủ đề | [faqs/](faqs/index.md) |
| Thuật ngữ | toàn cục — cắt ngang nhiều chủ đề | [glossary/](glossary/index.md) |

`inbox/`, `templates/` và `anki/` nằm **ngoài** `docs/` nên không lên site — chúng phục
vụ việc vận hành repo và ôn tập, không phải nội dung tri thức. `anki/` chứa 313 thẻ TSV
sinh từ data-modeling và dbt; xem `anki/README.md`.

## Đường đi phụ thuộc

Học theo chiều mũi tên — cái sau giả định cái trước đã chắc.

```mermaid
graph TD
  SQL[SQL] --> DM[Data Modeling]
  DM --> DQ[Data Quality]
  SQL --> DBT[dbt]
  DM --> DBT
  DQ --> DBT
  PY[Python] --> AF[Airflow]
  AF --> DBT
  KAFKA[Kafka] --> FLINK[Flink]
  FLINK --> ICE[Iceberg]
  ICE --> TRINO[Trino]
  DBT --> TRINO
```
