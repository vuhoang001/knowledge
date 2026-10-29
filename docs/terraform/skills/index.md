---
title: Kỹ năng — Terraform
sidebar_key: terraform-skills
sidebar_position: 0
description: "Gặp tình huống X thì xử lý ra sao — giả định đã nắm phần Tài liệu, tập trung vào kỹ thuật áp dụng trên AWS thật (qua LocalStack)."
tags: [skills, terraform]
domain: devops
category: index
doc_type: index
updated: 2026-10-28
---

# Kỹ năng — Terraform

Mỗi file bắt đầu bằng *"đã hiểu khái niệm rồi, giờ gặp việc này thì làm thế nào"*. Giả
định bạn đã đọc [Tài liệu](../reference/index.md) — nhất là
[Variables, Outputs và Locals](../reference/variables-outputs-locals.md). Ba bài dưới
đều chạy thật trên AWS qua LocalStack (giả lập AWS, miễn phí, an toàn tuyệt đối để
tạo/xoá — xem cấu hình provider ở
[Providers và Resources](../reference/providers-and-resources.md)).

| # | Kỹ năng | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Import tài nguyên đã tồn tại](import.md) | Đưa resource tạo sẵn ngoài Terraform vào state mà không recreate — và vì sao HCL sai lệch sau đó mới hiện ra | intermediate | 📝 output chạy thật |
| 2 | [`count` vs `for_each`](count-vs-for-each.md) | Xoá phần tử giữa danh sách — `count` đổi tên nhầm một resource và xoá nhầm một resource khác; `for_each` chỉ động đúng resource bị xoá | intermediate | 📝 output chạy thật |
| 3 | [Backend và state locking](backend-va-locking.md) | Backend không đọc được `var.*`; lock bằng DynamoDB table chặn đúng, lock `use_lockfile` không chặn được trên LocalStack | advanced | 📝 output chạy thật |

Một số kỹ thuật khác (Lifecycle meta-argument, Remote state làm data source, Secrets
trong state, Provisioners, State surgery nâng cao) vẫn ở dạng mục lục dự kiến trong
[bản đồ chủ đề](../index.md) — chưa có file riêng ở đây (một phần đã có **lab minh hoạ**
trong [Bài tập](../tutorials/index.md): Modules, State locking, State surgery, Import).

Ký hiệu: ✅ đã chạy tay và xác nhận · 📝 output chạy thật khi viết, `verified_at` chờ
chủ repo chạy lại tay.

## Related Topics

- [Terraform](../index.md) — chủ đề chứa thư mục này
- [Tài liệu](../reference/index.md) — nền khái niệm cho nhóm này
- [Bài tập](../tutorials/index.md) — luyện tay các kỹ năng này trên nhiều resource AWS hơn
