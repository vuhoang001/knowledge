---
title: Kỹ năng — dbt
sidebar_key: dbt-skills
sidebar_position: 0
description: "Kỹ thuật áp dụng vào một tình huống cụ thể — đứng trên phần Tài liệu, không thay thế nó."
tags: [skill, dbt]
domain: data-engineering
category: index
doc_type: index
updated: 2026-09-11
---

# Kỹ năng — dbt

Kỹ thuật áp dụng vào một tình huống cụ thể — đứng **trên** phần Tài liệu, không thay thế nó.

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 1 | [Khởi tạo và cấu hình project](khoi-tao-dbt-project.md) | Hai file quyết định mọi thứ, và ba lỗi kết nối của người mới | 📝 có output thật |
| 2 | [Viết model đầu tiên với `ref()`](model-dau-tien-voi-ref.md) | Một file .sql = một SELECT; `ref()` là cạnh của DAG | 📝 có output thật |
| 3 | [Khai báo source và kiểm độ tươi](khai-bao-source.md) | `source()` là lời khai "bảng này không phải của tôi" | 📝 có output thật |
| 4 | [Viết incremental model](viet-incremental-model.md) | Đổi thời gian chạy lấy nghĩa vụ đúng đắn — và bẫy dòng sửa muộn | 📝 có output thật |
| 5 | [Triển khai test](implementing-tests.md) | Sáu loại test: khai ở đâu, cú pháp gì, chạy ra output nào | 📝 có output thật |
| 6 | [Viết macro và dùng Jinja logic](macro-va-jinja.md) | Jinja chạy xong trước khi SQL rời máy — debug ở `target/compiled/` | 📝 có output thật |
| 7 | [Snapshot — bắt lịch sử (SCD2)](snapshot-scd2.md) | Máy ghi âm, không phải máy thời gian | 📝 có output thật |
| 8 | [Quản lý dependencies với package](quan-ly-package.md) | `dbt_utils`, pin phiên bản, và vì sao phải commit lock file | 📝 có output thật |
| 9 | [Viết documentation cho model](viet-documentation.md) | Máy sinh được cấu trúc, không sinh được nghĩa | 🟡 draft |
| 10 | [Thiết lập CI/CD cho dbt project](ci-cd-cho-dbt.md) | `state:modified+` biến CI 40 phút thành 2 phút | 📝 có output thật |

## Related Topics

- [dbt](../index.md) — chủ đề chứa thư mục này
