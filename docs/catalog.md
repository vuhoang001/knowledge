---
title: Thư viện — gom theo loại tài liệu
sidebar_position: 1
description: "Mọi file trong kho gom về một chỗ, chia theo loại: tài liệu, bài tập, case study, cheatsheet."
tags: [catalog, index]
category: index
doc_type: index
updated: 2026-07-31
---

# Thư viện — gom theo loại tài liệu

> **File này sinh tự động** bằng `npm run catalog`. Đừng sửa tay — linter R14 so
> lại với frontmatter thật và chặn CI nếu lệch.

[`docs/index.md`](index.md) gom theo **chủ đề**. Trang này gom theo **dạng tài liệu**.
Cùng một tập file, hai đường vào. Cần cắt theo chủ đề *và* dạng cùng lúc thì dùng
trang tag, ví dụ [`/tags/data-modeling`](/tags/data-modeling).

**67 file mang tri thức · 3 đã kiểm chứng bằng tay.**

## Tài liệu tham chiếu (16)

Giải thích *nó là gì, vì sao, đánh đổi ra sao*.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Bus architecture, bus matrix và value chain](data-modeling/reference/bus-architecture.md) | `data-modeling/reference` | data-engineering | 🟡 draft |
| [Date dimension](data-modeling/reference/date-dimension.md) | `data-modeling/reference` | data-engineering | 🟡 draft |
| [Quy trình thiết kế 4 bước](data-modeling/reference/design-process.md) | `data-modeling/reference` | data-engineering | 📝 lý thuyết |
| [Fact và Dimension](data-modeling/reference/fact-and-dimension.md) | `data-modeling/reference` | data-engineering | 📝 lý thuyết |
| [Grain](data-modeling/reference/grain.md) | `data-modeling/reference` | data-engineering | ✅ đã chạy tay |
| [Star, Snowflake và One Big Table](data-modeling/reference/star-snowflake-obt.md) | `data-modeling/reference` | data-engineering | 📝 lý thuyết |
| [Surrogate key và Natural key](data-modeling/reference/surrogate-key.md) | `data-modeling/reference` | data-engineering | 🟡 draft |
| [Sáu chiều chất lượng dữ liệu](data-quality/six-dimensions.md) | `data-quality` | data-engineering | 📝 lý thuyết |
| [dbt docs và lineage](etl/dbt/reference/docs-and-lineage.md) | `etl/dbt/reference` | data-engineering | 📝 lý thuyết |
| [Macro, Jinja và package](etl/dbt/reference/macros-jinja-packages.md) | `etl/dbt/reference` | data-engineering | 📝 lý thuyết |
| [Materialization](etl/dbt/reference/materializations.md) | `etl/dbt/reference` | data-engineering | 📝 lý thuyết |
| [Model và ref() — DAG mọc ra từ đâu](etl/dbt/reference/models-and-ref.md) | `etl/dbt/reference` | data-engineering | 📝 lý thuyết |
| [Cấu trúc một dbt project](etl/dbt/reference/project-structure.md) | `etl/dbt/reference` | data-engineering | 📝 lý thuyết |
| [Source, seed và snapshot](etl/dbt/reference/sources-seeds-snapshots.md) | `etl/dbt/reference` | data-engineering | 📝 lý thuyết |
| [Test và data quality trong dbt](etl/dbt/reference/testing.md) | `etl/dbt/reference` | data-engineering | 📝 lý thuyết |
| [dbt là gì và nó thật sự làm gì](etl/dbt/reference/what-is-dbt.md) | `etl/dbt/reference` | data-engineering | ✅ đã chạy tay |

## Kỹ năng (23)

Kỹ thuật áp dụng vào một tình huống cụ thể — đứng trên phần tài liệu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Aggregate fact table và shrunken rollup dimension](data-modeling/skills/aggregate-fact-table.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Header/line và phân bổ fact](data-modeling/skills/allocated-facts.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Audit dimension và error event schema](data-modeling/skills/audit-dimension.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Đưa hành vi vào dimension](data-modeling/skills/behavior-dimension.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Bridge table](data-modeling/skills/bridge-table.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Centipede fact table và dimension-to-dimension join](data-modeling/skills/centipede-fact.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Conformed dimension](data-modeling/skills/conformed-dimension.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Conformed facts — cùng tên phải cùng nghĩa](data-modeling/skills/conformed-facts.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Degenerate dimension](data-modeling/skills/degenerate-dimension.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Thiết kế thuộc tính dimension](data-modeling/skills/dimension-attribute-design.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Thực thể không đồng nhất — supertype, subtype và measure type](data-modeling/skills/heterogeneous-schema.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Cây phân cấp — cố định, hơi lệch và lệch hẳn](data-modeling/skills/hierarchy.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Junk dimension và cột cardinality thấp](data-modeling/skills/junk-dimension.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Dữ liệu về muộn — late arriving fact và dimension](data-modeling/skills/late-arriving.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Mini-dimension](data-modeling/skills/mini-dimension.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Nhiều loại tiền tệ và nhiều đơn vị đo](data-modeling/skills/multi-currency-uom.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [NULL trong fact và trong dimension](data-modeling/skills/null-handling.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Real-time fact table — phân vùng nóng](data-modeling/skills/real-time-fact.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Role-playing dimension](data-modeling/skills/role-playing-dimension.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Phát hiện thay đổi cho SCD Type 2](data-modeling/skills/scd-change-detection.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [SCD — Slowly Changing Dimension](data-modeling/skills/scd.md) | `data-modeling/skills` | data-engineering | 📝 lý thuyết |
| [Year-to-date và timespan trong fact](data-modeling/skills/ytd-timespan-facts.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [Triển khai test trong dbt](etl/dbt/skills/implementing-tests.md) | `etl/dbt/skills` | data-engineering | 📝 lý thuyết |

## Bài tập (2)

Chạy thật, có ô dán output. Chưa chạy thì chưa gọi là học.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Dựng một star schema từ đầu bằng DuckDB](data-modeling/tutorials/star-schema-duckdb.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| [Lab dbt trên DuckDB](etl/dbt/tutorials/dbt-lab-duckdb.md) | `etl/dbt/tutorials` | data-engineering | ✅ đã chạy tay |

## Case study (25)

Sự cố thật đã debug xong, kèm giả thuyết sai lúc đầu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [dim_san_pham 67% ô trống — và không cột nào đặt được NOT NULL](data-modeling/case-studies/bang-san-pham-hai-phan-ba-o-trong.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Dashboard báo 800, query tay ra 1.000 — và trung bình lệch 50%](data-modeling/case-studies/bang-tong-hop-lech-so.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Báo cáo theo danh mục cấp 3 chỉ thấy một nửa doanh thu](data-modeling/case-studies/bao-cao-cap-3-mat-mot-nua.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Báo cáo tháng 1 tự đổi số vào tháng 4](data-modeling/case-studies/bao-cao-qua-khu-tu-doi-so.md) | `data-modeling/case-studies` | data-engineering | 📝 lý thuyết |
| [Quý 1 trong họp hội đồng lệch 202% so với quý 1 trên dashboard](data-modeling/case-studies/bao-cao-quy-tai-chinh-lech.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Chọn OBT xong, sáu tháng sau sếp hỏi câu as-is](data-modeling/case-studies/chon-obt-roi-can-as-is.md) | `data-modeling/case-studies` | data-engineering | 📝 lý thuyết |
| [Dashboard đầy Y, N và y — một khái niệm nhị phân thành ba nhóm](data-modeling/case-studies/co-y-n-tren-dashboard.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Cột luỹ kế bị kéo vào ô "tổng" — doanh thu phồng 2,13 lần](data-modeling/case-studies/cong-cot-luy-ke.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Cột "tổng chi tiêu" trong dimension, cộng sau khi join fact — phồng gần 2 lần](data-modeling/case-studies/cong-cot-tong-hop-trong-dim.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Dựng dim_don_hang cho "đúng chuẩn Kimball", doanh thu phồng 40%](data-modeling/case-studies/dim-don-hang-lam-phong-doanh-thu.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Dimension phồng 365 lần sau một năm](data-modeling/case-studies/dimension-phinh-365-lan.md) | `data-modeling/case-studies` | data-engineering | 📝 lý thuyết |
| [Doanh thu tháng 1 tự giảm 10% vào tháng 8, không giao dịch nào thay đổi](data-modeling/case-studies/doanh-thu-doi-theo-ty-gia.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Một nửa số đơn biến mất khỏi báo cáo](data-modeling/case-studies/don-dang-giao-bien-mat.md) | `data-modeling/case-studies` | data-engineering | 📝 lý thuyết |
| [Doanh thu Miền Bắc bằng 0, và 28% doanh thu biến mất](data-modeling/case-studies/fact-den-muon-gan-sai-khu-vuc.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Fact tám khoá ngoại cho hai chiều thật](data-modeling/case-studies/fact-hai-chuc-khoa-ngoai.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Hai mart đúng, ghép lại thì không trả lời được câu nào](data-modeling/case-studies/hai-mart-khong-ghep-duoc.md) | `data-modeling/case-studies` | data-engineering | 📝 lý thuyết |
| [Hai phòng, hai con số doanh thu, cùng một cột tên "doanh_thu"](data-modeling/case-studies/hai-phong-hai-doanh-thu.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Doanh thu phồng 67% vì join hai bảng fact](data-modeling/case-studies/join-hai-fact-lam-phong-tong.md) | `data-modeling/case-studies` | data-engineering | 📝 lý thuyết |
| [Lọc "khác huỷ" làm mất một phần tư doanh thu](data-modeling/case-studies/loc-khac-huy-mat-mot-phan-tu.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Năm quy trình, năm mart, và không mart nào ghép được với mart nào](data-modeling/case-studies/moi-mart-mot-dim-khach.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Một file nạp hai lần, xoá 10 dòng để diệt 5 dòng rác](data-modeling/case-studies/nap-hai-lan-khong-truy-duoc.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Phí ship phồng 133% — một cột đúng, một cột sai, cùng một bảng](data-modeling/case-studies/phi-ship-phong-133-phan-tram.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Doanh thu trung bình mỗi ngày nhảy từ 862 lên 1.050 trong cùng một ngày](data-modeling/case-studies/so-hom-nay-nhay-suot-ngay.md) | `data-modeling/case-studies` | data-engineering | 🟡 draft |
| [Thêm trạng thái thứ tám, năm báo cáo sai năm kiểu](data-modeling/case-studies/them-trang-thai-thu-tam.md) | `data-modeling/case-studies` | data-engineering | 📝 lý thuyết |
| [Nội dung AI sinh ghi sai tên catalog Trino](etl/dbt/case-studies/ai-sinh-sai-ten-catalog-trino.md) | `etl/dbt/case-studies` | data-engineering | 📘 ổn định, chưa chạy tay |

## Cheatsheet (1)

Tra nhanh khi **đang làm** — không dùng để học lần đầu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [SCD — Cheatsheet](data-modeling/cheatsheets/scd.md) | `data-modeling/cheatsheets` | data-engineering | 📘 ổn định, chưa chạy tay |

## FAQ (0)

Câu hỏi cắt ngang nhiều chủ đề.

*Chưa có file nào.*

## Ví dụ code (0)

Đoạn chạy được nguyên trạng, để copy.

*Chưa có file nào.*

## Thuật ngữ (0)

Định nghĩa một câu.

*Chưa có file nào.*

## Related Topics

- [Mục lục theo chủ đề](index.md) — cùng tập file, gom theo lĩnh vực
- [`ROUTING.md`](https://github.com/vuhoang001/knowledge/blob/main/ROUTING.md) — rule quyết định `doc_type`
