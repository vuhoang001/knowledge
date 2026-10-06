---
title: Kinh tế cloud
sidebar_position: 4
description: "Fixed vs variable cost, TCO, rightsizing, BYOL, và lợi ích của managed service. Phần 'cloud rẻ hơn' nói cho đúng — nó không luôn đúng."
tags: [aws, clf-c02, cloud-economics, tco, rightsizing, byol, domain-1]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Kinh tế cloud

> **Chốt:** Lợi thế tiền của cloud **không** nằm ở đơn giá thấp hơn, mà ở hai thứ: không
> phải **bỏ vốn trước**, và không phải trả cho **công suất không dùng**. Workload chạy
> đều 24/7 suốt ba năm có thể đắt hơn trên cloud nếu để On-Demand — và đó chính là lý do
> [Reserved Instance và Savings Plans](pricing-models.md) tồn tại.

## Mục tiêu

Task 1.4 đòi năm thứ: fixed ⇄ variable cost, chi phí của on-premises, **licensing**
(BYOL ⇄ included), **rightsizing**, lợi ích của **automation** và của **managed service**.

## Tổng quan

### Fixed cost và variable cost

| | Fixed cost | Variable cost |
|---|---|---|
| Trả khi nào | **Trước**, một lần lớn | Theo lượng dùng, theo kỳ |
| Ví dụ on-premises | Mua server, xây phòng máy, licence trả một lần | Điện, băng thông |
| Ví dụ trên AWS | Reserved Instance trả trước toàn phần, Dedicated Host | On-Demand instance, S3 theo GB, data transfer out |
| Rủi ro | Mua thừa (tiền chết) hoặc mua thiếu (mất doanh thu) | Hoá đơn tăng khi cấu hình sai |

Cái mà cloud đổi là **dạng** chi phí: *capital expenditure* (CapEx) → *operational
expenditure* (OpEx). Nó **không hứa** tổng tiền thấp hơn — câu đáp án nào nói "always
lower cost" là distractor.

### Bốn loại chi phí on-premises mà cloud loại bỏ

Exam guide đòi "hiểu các chi phí gắn với môi trường on-premises". Bốn nhóm:

| Nhóm | Gồm |
|---|---|
| **Phần cứng** | Server, storage, thiết bị mạng — cộng chu kỳ thay mới 3–5 năm |
| **Cơ sở vật chất** | Mặt bằng, điện, làm mát, nguồn dự phòng, an ninh vật lý |
| **Con người** | Người rack server, vá firmware, thay ổ cứng |
| **Cơ hội bị bỏ** | Thời gian chờ mua sắm — nhiều tuần tới nhiều tháng cho một server |

Nhóm cuối không có trên hoá đơn nào nhưng là nhóm đắt nhất — nó là lý do *agility* được
tính là lợi ích kinh tế chứ không chỉ kỹ thuật.

### TCO: so cái gì với cái gì

**Total Cost of Ownership** = toàn bộ chi phí sở hữu trong một khoảng thời gian, không chỉ
giá mua. So TCO on-premises ⇄ AWS thì phải tính cả bốn nhóm trên, không chỉ tiền server.

Công cụ: **AWS Pricing Calculator** — dựng dự toán cho một cấu hình cụ thể, xuất ra được
để trình bày. Nó **không** đọc hạ tầng hiện có của bạn.

| Câu hỏi | Công cụ |
|---|---|
| Cấu hình dự kiến này sẽ tốn bao nhiêu | **Pricing Calculator** |
| Tháng rồi đã tốn bao nhiêu, vào đâu | **Cost Explorer** |
| Đừng để vượt ngưỡng X | **AWS Budgets** |
| Instance nào đang quá khổ | **Compute Optimizer** |

Bốn dòng đó là một bộ câu hỏi đề rất hay hỏi — chi tiết ở
[billing-and-cost-management](billing-and-cost-management.md).

### Rightsizing

Chọn **đúng cỡ** tài nguyên cho tải thật, rồi điều chỉnh liên tục. Không phải việc làm
một lần: tải đổi thì cỡ phải đổi.

Điểm quan trọng với đề: rightsizing **chỉ khả thi trên cloud** vì đổi cỡ là một lệnh API,
còn trên on-premises thì đổi cỡ nghĩa là mua máy khác. Service đọc số liệu thật rồi đề
xuất cỡ: **AWS Compute Optimizer**; **Trusted Advisor** cũng báo instance dùng dưới mức.

### Licensing: BYOL ⇄ included

| Mô hình | Nghĩa | Khi nào |
|---|---|---|
| **License included** | Giá instance đã gồm licence (ví dụ Windows Server, SQL Server) | Không có licence sẵn, hoặc muốn gọn |
| **BYOL** | Mang licence đang có sang dùng | Đã mua licence dài hạn, hoặc licence rẻ hơn giá AWS gộp |

BYOL thường đòi **Dedicated Host** vì nhiều licence tính theo *socket/core vật lý* và
đòi nhìn thấy phần cứng. Đó là lý do Dedicated Host xuất hiện trong danh sách
[pricing model](pricing-models.md) chứ không chỉ là một tuỳ chọn hiệu năng.

**AWS License Manager** là service theo dõi và cưỡng chế điều kiện licence — gặp câu
"track license usage to stay compliant" thì đáp án là nó.

### Automation và managed service — hai nguồn tiết kiệm không nằm ở đơn giá

| Nguồn | Cơ chế tiết kiệm | Service exam guide nêu tên |
|---|---|---|
| **Automation** | Hạ công sức provisioning và cấu hình; bỏ lỗi tay | **CloudFormation** (IaC) |
| **Managed service** | AWS gánh vá OS, backup, HA — bớt người, bớt downtime | **RDS**, **ECS**, **EKS**, **DynamoDB** |

Managed service **không** luôn có đơn giá rẻ hơn tự dựng trên EC2. Thứ nó cắt là **chi
phí vận hành** — và trong đề, cụm từ báo hiệu nó là **"reduce operational overhead"**.
Cụm đó là một trong vài cụm quyết định đáp án; xem [cheatsheet văn phong](../cheatsheets/exam-wording.md).

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| "Cloud always costs less" | Không có trong exam guide, và không đúng với tải đều dài hạn để On-Demand |
| Dùng **Cost Explorer** để dự toán hệ thống chưa dựng | Cost Explorer xem **quá khứ**; dự toán là Pricing Calculator |
| Hiểu rightsizing là "mua cỡ lớn cho chắc" | Ngược lại — và đó là nguồn lãng phí số một |
| Chọn BYOL mà không nhắc Dedicated Host | Nhiều licence đòi phần cứng riêng |
| Cho rằng managed service luôn có đơn giá thấp hơn EC2 tự dựng | Nó cắt **chi phí vận hành**, không hứa cắt đơn giá |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| OpEx thay CapEx | Không chôn vốn, bỏ được rủi ro mua thừa | Hoá đơn **biến động** — cần Budgets và alarm làm hàng rào |
| Managed service | Bớt người vận hành, bớt lỗi | Mất quyền tinh chỉnh; bị khoá vào API của AWS |
| BYOL | Dùng hết licence đã mua | Thường buộc Dedicated Host ⇒ mất tính linh hoạt về cỡ |
| Rightsizing liên tục | Cắt lãng phí thật | Thành việc định kỳ phải có người làm, hoặc phải tự động hoá |

## Related Topics

- [Giá trị của AWS Cloud](cloud-value-proposition.md) — ba lợi thế kinh tế, nói bằng lời
- [Pricing model](pricing-models.md) — On-Demand, RI, Spot, Savings Plans, Dedicated Host
- [Billing và cost management](billing-and-cost-management.md) — Budgets, Cost Explorer, CUR, tag
- [Migration và AWS CAF](migration-and-caf.md) — TCO là lý lẽ của perspective Business
- [AWS · Foundations](../index.md)
