---
title: Pricing model
i18n_status: untranslated
sidebar_position: 17
description: "Năm cách trả tiền cho compute, và câu hỏi duy nhất để chọn: tải này có đoán trước được không, và có chịu được bị thu hồi không. Kèm luật data transfer."
tags: [aws, clf-c02, pricing, reserved-instance, spot, savings-plans, data-transfer, domain-4]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Pricing model

> **Chốt:** Chọn pricing model bằng **hai câu hỏi**, không bằng bảng giá. *Tải có đoán
> trước được không?* — có thì cam kết (RI/Savings Plans). *Workload có chịu được bị tắt
> giữa phiên không?* — có thì **Spot**. Không đoán được và không chịu được gián đoạn thì
> **On-Demand**, và đó là lựa chọn đắt nhất đúng kiểu.

## Mục tiêu

Task 4.1 đòi: so sánh các **compute purchasing option**, mô tả **tính linh hoạt của
Reserved Instance** và hành vi RI trong **AWS Organizations**, hiểu **phí data transfer**
(trong Region, giữa Region, vào và ra), và hiểu cách tính giá của các **lớp storage**.

## Tổng quan

### Năm cách trả tiền cho compute

| Model | Cam kết | Giảm giá | Chọn khi |
|---|---|---|---|
| **On-Demand** | Không | — (giá gốc) | Tải không đoán được; dev/test ngắn; đang thử nghiệm |
| **Reserved Instance** | **1 hoặc 3 năm**, theo cấu hình instance | tới ~72% | Tải đều, biết rõ instance type |
| **Savings Plans** | **1 hoặc 3 năm**, theo **mức chi tiêu $/giờ** | tới ~72% | Tải đều nhưng **instance có thể đổi** |
| **Spot Instance** | Không | tới ~90% | Chịu được bị **thu hồi với thông báo 2 phút** |
| **Dedicated Host / Dedicated Instance** | Tuỳ | — (đắt hơn) | Yêu cầu tuân thủ hoặc **BYOL** cần phần cứng riêng |

Các con số giảm giá là mức AWS công bố; **kiểm lại trên trang pricing trước khi dùng để
tính toán thật** — chúng đổi theo thời gian và theo Region.

Thêm một mục trong exam guide: **Capacity Reservation** — giữ chỗ công suất trong một AZ,
trả tiền dù có dùng hay không. Nó bảo đảm *có máy*, **không** phải để giảm giá.

### Reserved Instance: ba trục cần nhớ

| Trục | Lựa chọn | Hệ quả |
|---|---|---|
| **Kỳ hạn** | 1 năm · 3 năm | 3 năm rẻ hơn |
| **Cách trả** | All Upfront · Partial Upfront · No Upfront | Trả trước nhiều thì rẻ hơn |
| **Loại** | **Standard** · **Convertible** | Standard rẻ hơn; **Convertible đổi được** sang họ instance khác |

**Tính linh hoạt** mà exam guide hỏi: RI **Regional** (không gắn AZ cụ thể) linh hoạt về
AZ và về cỡ trong cùng họ; RI **Zonal** thì giữ chỗ công suất trong một AZ nhưng mất tính
linh hoạt đó.

**RI trong Organizations:** quyền lợi RI **dùng chung được giữa các account** trong cùng
tổ chức khi bật *billing discount sharing* — một account mua, account khác dùng được nếu
khớp cấu hình. Đây là một lý do để gộp hoá đơn; xem
[billing-and-cost-management](billing-and-cost-management.md).

### Savings Plans ⇄ Reserved Instance: ranh giới quyết định

| | Reserved Instance | Savings Plans |
|---|---|---|
| Cam kết theo | **Cấu hình instance** | **Số tiền mỗi giờ** |
| Đổi instance type | Chỉ Convertible RI | **Tự do** trong phạm vi plan |
| Áp cho | EC2 (và RDS, ElastiCache, Redshift, OpenSearch) | EC2, **Lambda**, **Fargate** (Compute Savings Plans) |
| Đơn giản hơn | Không | **Có** |

Trong đề: *"workload đều nhưng chúng tôi sẽ đổi instance family trong năm tới"* →
**Savings Plans**. *"Chạy cố định đúng một cấu hình suốt 3 năm"* → **RI** (rẻ nhất).
*"Cần cả Lambda và Fargate rẻ hơn"* → **Compute Savings Plans**.

### Spot: hiểu đúng rủi ro

Spot dùng **công suất dư** nên rẻ nhất, và AWS **thu hồi** khi cần, báo trước **2 phút**.
Hợp với: xử lý theo lô, render, CI, phân tích dữ liệu, bất cứ gì **chia nhỏ và làm lại
được**. Không hợp với: database, web server phục vụ người dùng, job không có checkpoint.

### Ba luật về data transfer

| Hướng | Có phí? |
|---|---|
| **Vào** AWS (inbound/ingress) | **Miễn phí** trong hầu hết trường hợp |
| **Ra** internet (egress) | **Có phí**, theo GB — thường là khoản bất ngờ lớn nhất |
| **Giữa hai Region** | **Có phí** |
| **Giữa hai AZ** trong cùng Region | **Có phí** (ở phần lớn trường hợp) |
| **Trong cùng AZ**, dùng IP private | Thường **miễn phí** |

Câu đáng nhớ: **đưa dữ liệu vào thì rẻ, lấy ra thì tốn.** Đó cũng là lý do CloudFront và
VPC Endpoint xuất hiện trong các câu hỏi tối ưu chi phí — chúng giảm lượng dữ liệu đi qua
đường tốn tiền.

### Giá storage: tính theo nhiều chiều

| Chiều | Nghĩa |
|---|---|
| **Dung lượng** ($/GB-tháng) | Lớp lạnh hơn thì rẻ hơn |
| **Số request** | PUT/GET tính tiền; lớp lạnh có đơn giá request cao hơn |
| **Phí lấy ra** (retrieval) | Chỉ các lớp IA/Glacier |
| **Thời gian lưu tối thiểu** | 30 ngày (IA) · 90 (Glacier Flexible) · **180 (Deep Archive)** |
| **Data transfer out** | Theo GB ra internet |

Hệ quả: **lớp lạnh không luôn rẻ hơn.** Dữ liệu bị đọc thường xuyên để ở Glacier có thể
đắt hơn để ở Standard — phí lấy ra ăn hết phần tiết kiệm. Xem [storage](storage.md).

### Free Tier: ba dạng

| Dạng | Nghĩa |
|---|---|
| **Always free** | Luôn miễn phí trong hạn mức (ví dụ Lambda 1 triệu request/tháng) |
| **12 months free** | Miễn phí 12 tháng đầu kể từ khi mở account (ví dụ 750 giờ EC2 t-class/tháng) |
| **Trials** | Dùng thử ngắn hạn cho một số service |

Thứ **không** thuộc Free Tier mà người mới hay bị tính tiền: **NAT Gateway**, **Elastic IP
không gắn vào gì**, snapshot để lâu, và **data transfer out** vượt hạn mức.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn **Spot** cho database production | Có thể bị thu hồi sau 2 phút báo trước |
| Chọn **RI** khi câu hỏi nói sẽ đổi instance type | Đó là **Savings Plans** (hoặc Convertible RI) |
| Chọn **Reserved Instance** cho Lambda | RI không áp cho Lambda ⇒ **Compute Savings Plans** |
| Cho rằng **data transfer vào** AWS có phí | Vào thì gần như luôn miễn phí |
| Cho rằng giữa hai AZ thì miễn phí | Có phí ở phần lớn trường hợp |
| Chọn **Dedicated Host** để tiết kiệm | Nó đắt hơn; lý do dùng là tuân thủ hoặc **BYOL** |
| Cho rằng Glacier luôn rẻ hơn | Phí lấy ra + thời gian lưu tối thiểu có thể lật ngược |
| Cho rằng **Capacity Reservation** là để giảm giá | Nó bảo đảm **có công suất**, không giảm giá |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| On-Demand | Linh hoạt tuyệt đối, không cam kết | Đơn giá cao nhất |
| RI 3 năm All Upfront | Rẻ nhất trong các mức cam kết | Khoá 3 năm; đổi hướng kiến trúc là mất tiền |
| Savings Plans | Rẻ gần như RI mà linh hoạt instance | Vẫn là cam kết $/giờ — dùng dưới mức thì vẫn trả |
| Spot | Rẻ nhất tuyệt đối | Phải thiết kế chịu được gián đoạn; không đoán được thời điểm |
| Dedicated Host | Thoả yêu cầu tuân thủ, dùng được licence cũ | Đắt, kém linh hoạt về cỡ |

## Related Topics

- [Kinh tế cloud](cloud-economics.md) — TCO, rightsizing, BYOL, fixed ⇄ variable cost
- [Billing và cost management](billing-and-cost-management.md) — Budgets, Cost Explorer, Organizations, tag
- [Compute](compute.md) — các model này áp lên chính EC2, Lambda, Fargate ở đó
- [Storage](storage.md) — bảy lớp S3 và cơ cấu giá của chúng
- [Global infrastructure](global-infrastructure.md) — phí data transfer liên Region, liên AZ
- [AWS · Foundations](../index.md)
