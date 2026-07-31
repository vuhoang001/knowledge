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

**19 file mang tri thức · 3 đã kiểm chứng bằng tay.**

## Tài liệu tham chiếu (14)

Giải thích *nó là gì, vì sao, đánh đổi ra sao*.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Quy trình thiết kế 4 bước](data-modeling/reference/design-process.md) | `data-modeling/reference` | data-engineering | 📝 lý thuyết |
| [Fact và Dimension](data-modeling/reference/fact-and-dimension.md) | `data-modeling/reference` | data-engineering | 📝 lý thuyết |
| [Grain](data-modeling/reference/grain.md) | `data-modeling/reference` | data-engineering | ✅ đã chạy tay |
| [Star, Snowflake và One Big Table](data-modeling/reference/star-snowflake-obt.md) | `data-modeling/reference` | data-engineering | 🟡 draft |
| [Surrogate key và Natural key](data-modeling/reference/surrogate-key.md) | `data-modeling/reference` | data-engineering | 🟡 draft |
| [Sáu chiều chất lượng dữ liệu](data-quality/six-dimensions.md) | `data-quality` | data-engineering | 📝 lý thuyết |
| [dbt docs và lineage](etl/dbt/reference/docs-and-lineage.md) | `etl/dbt/reference` | data-engineering | 🟡 draft |
| [Macro, Jinja và package](etl/dbt/reference/macros-jinja-packages.md) | `etl/dbt/reference` | data-engineering | 🟡 draft |
| [Materialization](etl/dbt/reference/materializations.md) | `etl/dbt/reference` | data-engineering | 🟡 draft |
| [Model và ref() — DAG mọc ra từ đâu](etl/dbt/reference/models-and-ref.md) | `etl/dbt/reference` | data-engineering | 🟡 draft |
| [Cấu trúc một dbt project](etl/dbt/reference/project-structure.md) | `etl/dbt/reference` | data-engineering | 🟡 draft |
| [Source, seed và snapshot](etl/dbt/reference/sources-seeds-snapshots.md) | `etl/dbt/reference` | data-engineering | 🟡 draft |
| [Test và data quality trong dbt](etl/dbt/reference/testing.md) | `etl/dbt/reference` | data-engineering | 📝 lý thuyết |
| [dbt là gì và nó thật sự làm gì](etl/dbt/reference/what-is-dbt.md) | `etl/dbt/reference` | data-engineering | ✅ đã chạy tay |

## Kỹ năng (2)

Kỹ thuật áp dụng vào một tình huống cụ thể — đứng trên phần tài liệu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Junk dimension và cột cardinality thấp](data-modeling/skills/junk-dimension.md) | `data-modeling/skills` | data-engineering | 🟡 draft |
| [SCD — Slowly Changing Dimension](data-modeling/skills/scd.md) | `data-modeling/skills` | data-engineering | 📝 lý thuyết |

## Bài tập (1)

Chạy thật, có ô dán output. Chưa chạy thì chưa gọi là học.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Lab dbt trên DuckDB](etl/dbt/tutorials/dbt-lab-duckdb.md) | `etl/dbt/tutorials` | data-engineering | ✅ đã chạy tay |

## Case study (1)

Sự cố thật đã debug xong, kèm giả thuyết sai lúc đầu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
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
