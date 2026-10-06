---
title: Case study — Foundations (CLF-C02)
i18n_status: untranslated
sidebar_key: aws-foundations-case-studies
sidebar_position: 0
description: "Ba ca chọn sai service, mỗi ca có hậu quả đo được — bảng đánh đổi đọc xong quên, một ca hỏng thì nhớ."
tags: [case-study, aws, clf-c02]
domain: cloud
category: index
doc_type: index
updated: 2026-10-06
---

# Case study — Foundations (CLF-C02)

Mỗi case study ở đây là **một ca chọn sai service**, và chọn sai vì *biết cả hai service
nhưng không biết ranh giới giữa chúng*. Đó đúng là chỗ đề CLF-C02 nhắm vào.

| # | Case study | Triệu chứng | Minh hoạ cho |
|---|---|---|---|
| 1 | [Security group không chặn được một IP](security-group-khong-chan-duoc-ip.md) | Thêm rule mãi mà IP kia vẫn vào được | [networking](../reference/networking.md) · [security-components](../reference/security-components.md) |
| 2 | [Lifecycle đẩy xuống Deep Archive rồi cần gấp](s3-lifecycle-roi-can-gap.md) | File 30 ngày tuổi mất 12 giờ mới lấy ra được, kèm phí lạ | [storage](../reference/storage.md) |
| 3 | [Access key của root user lọt ra ngoài](root-access-key-lot-ra-ngoai.md) | Hoá đơn nhảy, và không có cách nào giới hạn quyền sau khi lọt | [access-management](../reference/access-management.md) · [billing-and-cost-management](../reference/billing-and-cost-management.md) |

**Cả ba đều là tình huống dựng lại**, không phải sự cố thật của chủ repo — nhãn này ghi
rõ trong từng file. Số nào chạy được trên emulator local thì có output dán lại; số nào
thuộc về AWS thật (phí, thời gian restore) thì ghi nhãn *số niêm yết, chưa chạy*.

## Related Topics

- [Foundations (CLF-C02)](../index.md) — tầng chứa nhóm này
- [Tài liệu](../reference/index.md) — kỹ thuật mà các ca này minh hoạ
