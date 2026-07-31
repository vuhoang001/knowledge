---
title: Tài liệu — dbt
sidebar_position: 0
description: "Giải thích nó là gì, vì sao, đánh đổi ra sao. Đọc nhóm này trước."
tags: [reference, dbt]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Tài liệu — dbt

Giải thích *nó là gì, vì sao, đánh đổi ra sao*. Đọc nhóm này trước.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 1 | [dbt là gì và nó thật sự làm gì](what-is-dbt.md) | Nhìn tận mắt SQL mà dbt sinh ra: ref() biến thành gì, test biên dịch  | ✅ đã chạy tay |
| 2 | [Cấu trúc một dbt project](project-structure.md) | dbt_project.yml, profiles.yml, target/compiled — thư mục nào chứa gì. | 🟡 draft |
| 3 | [Model và ref() — DAG mọc ra từ đâu](models-and-ref.md) | ref() không phải cách viết tắt tên bảng mà là cách duy nhất khai báo p | 🟡 draft |
| 4 | [Source, seed và snapshot](sources-seeds-snapshots.md) | Ba cách đưa dữ liệu không do dbt tính ra vào DAG — và vì sao snapshot  | 🟡 draft |
| 5 | [Materialization](materializations.md) | view, table, incremental, ephemeral — cùng một SELECT, khác thứ dbt bọ | 🟡 draft |
| 6 | [Test và data quality trong dbt](testing.md) | Ba tầng test/contract/unit test, bốn cơ chế test, và ca test fail vì t | 📝 lý thuyết |
| 7 | [Macro, Jinja và package](macros-jinja-packages.md) | Jinja chạy trước khi SQL rời máy — và ngưỡng nào thì nên viết macro. | 🟡 draft |
| 8 | [dbt docs và lineage](docs-and-lineage.md) | Sơ đồ lineage chính xác đúng bằng mức bạn dùng ref() kỷ luật. | 🟡 draft |

## Related Topics

- [dbt](../index.md) — chủ đề chứa thư mục này
