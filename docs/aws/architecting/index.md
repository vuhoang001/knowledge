---
title: Architecting (SAA-C03)
description: "Tầng thiết kế — chưa bắt đầu. Khung bốn domain SAA-C03 dựng trước để biết CLF-C02 còn thiếu gì."
category: technology
doc_type: index
status: draft
updated: 2026-10-06
---

# Architecting (SAA-C03)

> **Chốt:** CLF hỏi *service nào*; SAA hỏi *service nào **với ràng buộc này***. Thêm
> đúng một thứ so với tầng foundations: **con số** — RPO/RTO, ngân sách, latency, IOPS.

Trạng thái: **chưa bắt đầu**. Toàn bộ bảng dưới là mục lục dự kiến, chưa file nào được
viết. Khung dựng sẵn để trả lời được câu *"học CLF xong thì còn thiếu bao nhiêu cho
SAA"* ngay từ hôm nay.

## Bốn domain SAA-C03

| Domain | Trọng số | Nội dung | Trạng thái |
|---|---|---|---|
| 1 — Design Secure Architectures | 30% | IAM nâng cao, mã hoá, bảo mật nhiều tầng | ⬜ |
| 2 — Design Resilient Architectures | 26% | Multi-AZ, multi-Region, DR, decoupling | ⬜ |
| 3 — Design High-Performing Architectures | 24% | Caching, scaling, chọn storage/database theo tải | ⬜ |
| 4 — Design Cost-Optimized Architectures | 20% | Right-sizing, lifecycle, chọn pricing model theo pattern | ⬜ |

:::warning Trọng số cần kiểm lại trước khi học

Bốn con số trên **chưa đối chiếu với exam guide SAA-C03 bản PDF** — khác với trọng số
CLF-C02 ở [trang chủ AWS](../index.md#bốn-domain-và-trọng-số), vốn lấy trực tiếp từ guide
chính thức. Việc đầu tiên khi mở tầng này là tải exam guide SAA-C03 và sửa bảng này.

:::

## Thứ tầng này sẽ thêm so với CLF

| CLF-C02 dạy | SAA-C03 đòi thêm |
|---|---|
| S3 có nhiều storage class | Với truy cập 1 lần/quý và cần lấy trong 5 phút thì chọn class nào |
| Multi-AZ cho HA | RDS Multi-AZ so với read replica — cái nào là HA, cái nào là scale đọc |
| Có SQS và SNS | Fan-out SNS → SQS, và vì sao không nối thẳng |
| Có Reserved Instance và Spot | Kiến trúc nào *chịu được* Spot bị thu hồi giữa phiên |
| IAM có role | Cross-account role, trust policy, và khi nào dùng resource-based policy |

Cột phải là chỗ **lab thật trở thành bắt buộc** — không emulator nào mô phỏng được
failover hay policy evaluation, nên tầng này không học được bằng lab local.

## Related Topics

- [AWS](../index.md) — chủ đề chứa tầng này
- [Foundations (CLF-C02)](../foundations/index.md) — tầng nền, phải xong trước
