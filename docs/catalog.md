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

**24 file mang tri thức · 3 đã kiểm chứng bằng tay.**

## Tài liệu tham chiếu (16)

Giải thích *nó là gì, vì sao, đánh đổi ra sao*.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Junk dimension và cột cardinality thấp](data-modeling/dimension-techniques/junk-dimension.md) | `data-modeling/dimension-techniques` | data-engineering | 🟡 draft |
| [SCD — Slowly Changing Dimension](data-modeling/dimension-techniques/scd.md) | `data-modeling/dimension-techniques` | data-engineering | 📝 lý thuyết |
| [Fact và Dimension](data-modeling/foundations/fact-and-dimension.md) | `data-modeling/foundations` | data-engineering | 📝 lý thuyết |
| [Grain](data-modeling/foundations/grain.md) | `data-modeling/foundations` | data-engineering | ✅ đã chạy tay |
| [Surrogate key và Natural key](data-modeling/foundations/surrogate-key.md) | `data-modeling/foundations` | data-engineering | 🟡 draft |
| [Quy trình thiết kế 4 bước](data-modeling/layout-and-process/design-process.md) | `data-modeling/layout-and-process` | data-engineering | 📝 lý thuyết |
| [Star, Snowflake và One Big Table](data-modeling/layout-and-process/star-snowflake-obt.md) | `data-modeling/layout-and-process` | data-engineering | 🟡 draft |
| [Sáu chiều chất lượng dữ liệu](data-quality/six-dimensions.md) | `data-quality` | data-engineering | 📝 lý thuyết |
| [dbt docs và lineage](etl/dbt/docs-and-lineage.md) | `etl/dbt` | data-engineering | 🟡 draft |
| [Macro, Jinja và package](etl/dbt/macros-jinja-packages.md) | `etl/dbt` | data-engineering | 🟡 draft |
| [Materialization](etl/dbt/materializations.md) | `etl/dbt` | data-engineering | 🟡 draft |
| [Model và ref() — DAG mọc ra từ đâu](etl/dbt/models-and-ref.md) | `etl/dbt` | data-engineering | 🟡 draft |
| [Cấu trúc một dbt project](etl/dbt/project-structure.md) | `etl/dbt` | data-engineering | 🟡 draft |
| [Source, seed và snapshot](etl/dbt/sources-seeds-snapshots.md) | `etl/dbt` | data-engineering | 🟡 draft |
| [Test và data quality trong dbt](etl/dbt/testing.md) | `etl/dbt` | data-engineering | 📝 lý thuyết |
| [dbt là gì và nó thật sự làm gì](etl/dbt/what-is-dbt.md) | `etl/dbt` | data-engineering | ✅ đã chạy tay |

## Bài tập (2)

Chạy thật, có ô dán output. Chưa chạy thì chưa gọi là học.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Lab dbt trên DuckDB](tutorials/dbt-lab-duckdb.md) | `tutorials` | data-engineering | ✅ đã chạy tay |
| [Tutorials](tutorials/index.md) | `tutorials` | — | 🟡 draft |

## Case study (1)

Sự cố thật đã debug xong, kèm giả thuyết sai lúc đầu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Case Studies](case-studies/index.md) | `case-studies` | — | 🟡 draft |

## Cheatsheet (2)

Tra nhanh khi **đang làm** — không dùng để học lần đầu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Cheatsheets](cheatsheets/index.md) | `cheatsheets` | — | 🟡 draft |
| [SCD — Cheatsheet](cheatsheets/scd.md) | `cheatsheets` | data-engineering | 📘 ổn định, chưa chạy tay |

## FAQ (1)

Câu hỏi cắt ngang nhiều chủ đề.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [FAQs](faqs/index.md) | `faqs` | — | 🟡 draft |

## Ví dụ code (1)

Đoạn chạy được nguyên trạng, để copy.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Examples](examples/index.md) | `examples` | — | 🟡 draft |

## Thuật ngữ (1)

Định nghĩa một câu.

| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |
|---|---|---|---|
| [Glossary](glossary/index.md) | `glossary` | — | 🟡 draft |

## Related Topics

- [Mục lục theo chủ đề](index.md) — cùng tập file, gom theo lĩnh vực
- [`ROUTING.md`](https://github.com/vuhoang001/knowledge/blob/main/ROUTING.md) — rule quyết định `doc_type`
