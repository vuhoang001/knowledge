---
title: Foundations (CLF-C02)
i18n_status: untranslated
description: "19 tài liệu khớp 19 task statement của CLF-C02. Mục tiêu là nhận diện service đúng tên, không phải triển khai."
category: technology
doc_type: index
status: draft
updated: 2026-10-06
---

# Foundations (CLF-C02)

> **Chốt:** Tầng này học **bề rộng**. Một tài liệu ở đây đạt yêu cầu khi nó trả lời được
> *"service nào, và vì sao ba cái kia sai"* — không cần biết cách dựng.

Phạm vi đúng bằng [exam guide CLF-C02](../index.md#nguồn): 4 domain, 19 task statement.
Không thêm service ngoài danh sách in-scope — thêm vào là học thừa, mà đề không hỏi.

## Thứ tự đọc

Bốn domain **không** đọc theo thứ tự 1→4. Domain 3 (danh mục service) là thứ mọi domain
khác tham chiếu tới, nên nó phải đến sớm; còn Domain 4 (billing) chỉ có nghĩa sau khi đã
biết EC2 và S3 là gì.

| Lượt | Đọc gì | Vì sao thứ tự này |
|---|---|---|
| 1 | 1.1 → 1.2 → 3.2 | Vì sao cloud, rồi Region/AZ — nền của mọi câu về HA |
| 2 | 2.1 → 2.3 | Shared responsibility rồi IAM — 30% điểm, và là chỗ trượt phổ biến nhất |
| 3 | 3.3 → 3.6 → 3.4 → 3.5 | Compute → storage → database → network, theo chiều phụ thuộc |
| 4 | 4.1 → 4.2 → 4.3 | Pricing chỉ hiểu được sau khi biết instance và storage class |
| 5 | 2.2 → 2.4 → 3.1 → 3.7 → 3.8 → 1.3 → 1.4 | Phần bề rộng còn lại — học bằng cheatsheet |

## Ba nhóm tài liệu

| Nhóm | Dùng khi | Số file |
|---|---|---|
| [**Tài liệu**](reference/index.md) | Học lần đầu — 19 file, một file một task statement | 19 |
| [**Cheatsheet**](cheatsheets/index.md) | Ôn sát ngày thi, và lúc luyện đề | 2 |
| [**Case study**](case-studies/index.md) | Một ca chọn sai cụ thể, có số | 3 |

Không có nhóm `skills/` ở tầng này **có chủ đích**: `skills/` trả lời *gặp tình huống X
thì xử lý ra sao*, mà CLF-C02 ghi rõ *implementation* và *troubleshooting* **ngoài phạm
vi**. Nhóm đó sẽ xuất hiện ở tầng [Architecting](../architecting/index.md).

## Related Topics

- [AWS](../index.md) — chủ đề chứa tầng này, có bảng độ phủ 19 task
- [Architecting (SAA-C03)](../architecting/index.md) — tầng tiếp theo
- [Tài liệu](reference/index.md) · [Cheatsheet](cheatsheets/index.md) · [Case study](case-studies/index.md)
