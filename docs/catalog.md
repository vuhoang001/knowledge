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

**151 file mang tri thức · 3 đã kiểm chứng bằng tay.**

## Tài liệu tham chiếu (27)

Giải thích *nó là gì, vì sao, đánh đổi ra sao*.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Exit code và control flow](bash/reference/exit-code-va-control-flow.md) | `bash/reference` | devops | 🟡 draft |
| [File permissions](bash/reference/file-permissions.md) | `bash/reference` | devops | 🟡 draft |
| [Process và job control](bash/reference/process-va-job-control.md) | `bash/reference` | devops | 🟡 draft |
| [Quoting và expansion](bash/reference/quoting-va-expansion.md) | `bash/reference` | devops | 🟡 draft |
| [Shell là gì](bash/reference/shell-la-gi.md) | `bash/reference` | devops | 🟡 draft |
| [Streams và redirection](bash/reference/streams-va-redirection.md) | `bash/reference` | devops | 🟡 draft |
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
| [Chọn pattern nào — đi từ triệu chứng, không từ danh sách](patterns/reference/choosing-a-pattern.md) | `patterns/reference` | backend | 🟡 draft |
| [Composition over inheritance](patterns/reference/composition-over-inheritance.md) | `patterns/reference` | backend | 🟡 draft |
| [Coupling và cohesion — thước đo pattern thật sự phục vụ](patterns/reference/coupling-cohesion.md) | `patterns/reference` | backend | 🟡 draft |
| [SOLID — năm nguyên lý, năm ca hỏng chạy được](patterns/reference/solid.md) | `patterns/reference` | backend | 🟡 draft |
| [Design pattern là gì — và khi nào đừng dùng](patterns/reference/what-is-a-pattern.md) | `patterns/reference` | backend | 🟡 draft |

## Kỹ năng (52)

Kỹ thuật áp dụng vào một tình huống cụ thể — đứng trên phần tài liệu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Điều kiện và vòng lặp](bash/skills/conditionals-va-loops.md) | `bash/skills` | devops | 🟡 draft |
| [Tìm file với find và xargs](bash/skills/find-va-xargs.md) | `bash/skills` | devops | 🟡 draft |
| [Hàm trong bash](bash/skills/functions.md) | `bash/skills` | devops | 🟡 draft |
| [Xử lý văn bản bằng pipeline](bash/skills/text-processing.md) | `bash/skills` | devops | 🟡 draft |
| [Biến, mảng và parameter expansion](bash/skills/variables-arrays-expansion.md) | `bash/skills` | devops | 🟡 draft |
| [Viết script an toàn](bash/skills/viet-script-an-toan.md) | `bash/skills` | devops | 🟡 draft |
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
| [Abstract Factory](patterns/skills/abstract-factory.md) | `patterns/skills` | backend | 🟡 draft |
| [Adapter](patterns/skills/adapter.md) | `patterns/skills` | backend | 🟡 draft |
| [Bridge](patterns/skills/bridge.md) | `patterns/skills` | backend | 🟡 draft |
| [Builder](patterns/skills/builder.md) | `patterns/skills` | backend | 🟡 draft |
| [Chain of Responsibility](patterns/skills/chain-of-responsibility.md) | `patterns/skills` | backend | 🟡 draft |
| [Command](patterns/skills/command.md) | `patterns/skills` | backend | 🟡 draft |
| [Composite](patterns/skills/composite.md) | `patterns/skills` | backend | 🟡 draft |
| [Decorator](patterns/skills/decorator.md) | `patterns/skills` | backend | 🟡 draft |
| [Facade](patterns/skills/facade.md) | `patterns/skills` | backend | 🟡 draft |
| [Factory Method](patterns/skills/factory-method.md) | `patterns/skills` | backend | 🟡 draft |
| [Flyweight](patterns/skills/flyweight.md) | `patterns/skills` | backend | 🟡 draft |
| [Interpreter](patterns/skills/interpreter.md) | `patterns/skills` | backend | 🟡 draft |
| [Iterator](patterns/skills/iterator.md) | `patterns/skills` | backend | 🟡 draft |
| [Mediator](patterns/skills/mediator.md) | `patterns/skills` | backend | 🟡 draft |
| [Memento](patterns/skills/memento.md) | `patterns/skills` | backend | 🟡 draft |
| [Observer](patterns/skills/observer.md) | `patterns/skills` | backend | 🟡 draft |
| [Prototype](patterns/skills/prototype.md) | `patterns/skills` | backend | 🟡 draft |
| [Proxy](patterns/skills/proxy.md) | `patterns/skills` | backend | 🟡 draft |
| [Singleton](patterns/skills/singleton.md) | `patterns/skills` | backend | 🟡 draft |
| [State](patterns/skills/state.md) | `patterns/skills` | backend | 🟡 draft |
| [Strategy](patterns/skills/strategy.md) | `patterns/skills` | backend | 🟡 draft |
| [Template Method](patterns/skills/template-method.md) | `patterns/skills` | backend | 🟡 draft |
| [Visitor](patterns/skills/visitor.md) | `patterns/skills` | backend | 🟡 draft |

## Bài tập (20)

Chạy thật, có ô dán output. Chưa chạy thì chưa gọi là học.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| ['Lab: viết script bash đầu tiên'](bash/tutorials/bash-lab-first-script.md) | `bash/tutorials` | devops | 🟡 draft |
| ['Lab: xử lý văn bản bằng pipeline'](bash/tutorials/bash-lab-text-processing.md) | `bash/tutorials` | devops | 🟡 draft |
| ["26 bài tập có đáp số — tự viết, tự chấm"](data-modeling/tutorials/bai-tap-co-dap-so.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Phụ lục seed — mười bảng cho bộ bài tập"](data-modeling/tutorials/bt-00-seed.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Bài tập bộ 1 — Nền tảng: grain, fact/dim, surrogate key, star/OBT"](data-modeling/tutorials/bt-01-nen-tang.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Bài tập bộ 2 — Dimension theo thời gian: SCD, phát hiện thay đổi, mini-dim, role-playing, về muộn"](data-modeling/tutorials/bt-02-dimension-thoi-gian.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Bài tập bộ 3 — Cột và bảng: junk, degenerate, con rết, thuộc tính, NULL"](data-modeling/tutorials/bt-03-cot-va-bang.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Bài tập bộ 4 — Quan hệ và cây: bridge, phân cấp, thực thể không đồng nhất"](data-modeling/tutorials/bt-04-quan-he-va-cay.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Bài tập bộ 5 — Fact nâng cao: phân bổ, luỹ kế, bảng tổng hợp, hành vi"](data-modeling/tutorials/bt-05-fact-nang-cao.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Bài tập bộ 6 — Tích hợp: conformed dimension, conformed facts, bus matrix, đa tiền tệ"](data-modeling/tutorials/bt-06-tich-hop.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Bài tập bộ 7 — Vận hành: date dimension, audit, real-time"](data-modeling/tutorials/bt-07-van-hanh.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Lab dimension — ngày, vai, NULL và cờ: bốn cách làm mất dòng"](data-modeling/tutorials/lab-dimension.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Lab fact nâng cao — phân bổ, luỹ kế, bảng tổng hợp, con rết"](data-modeling/tutorials/lab-fact-nang-cao.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Lab nền tảng — grain, fact/dimension, khoá: bốn cách làm phồng số"](data-modeling/tutorials/lab-nen-tang-grain-fact-dim.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Lab tích hợp — ghép được nhưng có so được không"](data-modeling/tutorials/lab-tich-hop.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| ["Lab vận hành — khi số sai, mất bao lâu để biết dòng nào sai"](data-modeling/tutorials/lab-van-hanh.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| [SCD Type 2 bằng dbt snapshot — và cái bẫy không sách nào nói](data-modeling/tutorials/scd-bang-dbt-snapshot.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| [Dựng một star schema từ đầu bằng DuckDB](data-modeling/tutorials/star-schema-duckdb.md) | `data-modeling/tutorials` | data-engineering | 🟡 draft |
| [Lab dbt trên DuckDB](etl/dbt/tutorials/dbt-lab-duckdb.md) | `etl/dbt/tutorials` | data-engineering | ✅ đã chạy tay |
| ["Lab: leo thang từ switch tới Strategy + Decorator"](patterns/tutorials/refactor-switch-sang-pattern.md) | `patterns/tutorials` | backend | 🟡 draft |

## Case study (48)

Sự cố thật đã debug xong, kèm giả thuyết sai lúc đầu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Tên file có dấu cách xoá nhầm cả thư mục](bash/case-studies/bien-khong-nhay-word-splitting.md) | `bash/case-studies` | devops | 🟡 draft |
| [Vòng lặp chạy một lần với dấu sao literal](bash/case-studies/glob-khong-khop.md) | `bash/case-studies` | devops | 🟡 draft |
| [Pipeline xanh giả — lỗi giữa pipe bị nuốt](bash/case-studies/pipe-nuot-exit-code.md) | `bash/case-studies` | devops | 🟡 draft |
| ['set -e bật nhưng script vẫn chạy tiếp sau lỗi'](bash/case-studies/set-e-khong-bat.md) | `bash/case-studies` | devops | 🟡 draft |
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
| [Sáu kiểu để làm việc của hai kiểu](patterns/case-studies/abstract-factory-cho-mot-hien-thuc.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Báo cáo thiếu 4,2 triệu, không có lỗi nào](patterns/case-studies/adapter-nuot-loi-thanh-danh-sach-rong.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Giao hàng trước khi khách trả tiền](patterns/case-studies/chuyen-trang-thai-trai-phep.md) | `patterns/case-studies` | backend | 🟡 draft |
| [In 183 tờ giấy thành 242](patterns/case-studies/constructor-chin-tham-so-hoan-vi.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Thực tập sinh đọc được bảng lương](patterns/case-studies/doi-thu-tu-decorator-mat-cache.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Tiến trình chết không để lại log nào](patterns/case-studies/duyet-cay-khong-bao-gio-dung.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Facade một method thành 31 method](patterns/case-studies/facade-phinh-thanh-god-object.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Tô đỏ một ô, cả bảng đỏ theo](patterns/case-studies/flyweight-chia-se-nham-trang-thai.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Một dòng truy cập property thành 501 truy vấn](patterns/case-studies/lazy-proxy-sinh-n-cong-mot-query.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Một lớp con nhận cả dòng dữ liệu hỏng](patterns/case-studies/lop-con-quen-goi-base.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Thêm một tuỳ chọn, sinh thêm 36 lớp](patterns/case-studies/mot-tram-lop-con-cho-mot-tinh-nang.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Sửa bản sao, bản gốc đổi theo](patterns/case-studies/nhan-ban-doi-tuong-dung-chung-list.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Yêu cầu đổi hàng biến mất, không ai báo](patterns/case-studies/request-roi-qua-het-chain.md) | `patterns/case-studies` | backend | 🟡 draft |
| [8,4 MB rò rỉ sau 2000 lần mở màn hình](patterns/case-studies/su-kien-giu-doi-tuong-khong-cho-gc.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Job đêm chết vì một dòng RemoveAll](patterns/case-studies/sua-list-dang-duyet.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Test xanh khi chạy riêng, đỏ khi chạy chung](patterns/case-studies/test-xanh-rieng-do-chung.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Thêm định dạng thứ năm, sáu chỗ bỏ sót](patterns/case-studies/them-loai-thu-nam-sua-bay-cho.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Thêm một toán tử, sáu nơi phải sửa](patterns/case-studies/them-node-moi-sua-moi-visitor.md) | `patterns/case-studies` | backend | 🟡 draft |
| [Hoàn tác hai lệnh, tồn kho từ 10 thành 24](patterns/case-studies/undo-khong-tra-lai-trang-thai-cu.md) | `patterns/case-studies` | backend | 🟡 draft |

## Cheatsheet (4)

Tra nhanh khi **đang làm** — không dùng để học lần đầu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Cheatsheet lệnh bash](bash/cheatsheets/commands.md) | `bash/cheatsheets` | devops | 🟡 draft |
| [Cheatsheet toán tử test và expansion](bash/cheatsheets/test-operators-va-expansion.md) | `bash/cheatsheets` | devops | 🟡 draft |
| [SCD — Cheatsheet](data-modeling/cheatsheets/scd.md) | `data-modeling/cheatsheets` | data-engineering | 📘 ổn định, chưa chạy tay |
| [23 pattern GoF — tra nhanh](patterns/cheatsheets/gof-23.md) | `patterns/cheatsheets` | backend | 🟡 draft |

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
