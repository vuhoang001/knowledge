---
title: Billing và cost management
sidebar_position: 18
description: "Bốn công cụ chi phí trả bốn câu hỏi khác nhau: sẽ tốn bao nhiêu, đã tốn bao nhiêu, đừng vượt ngưỡng, và chia tiền cho ai. Cộng Organizations và cost allocation tag."
tags: [aws, clf-c02, budgets, cost-explorer, organizations, cost-allocation-tags, cur, domain-4]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Billing và cost management

> **Chốt:** Bốn công cụ, bốn **thời** khác nhau. **Pricing Calculator** — *tương lai*, dự
> toán cái chưa dựng. **Cost Explorer** — *quá khứ*, tiền đã đi đâu. **Budgets** — *tương
> lai gần*, cảnh báo trước khi vượt. **Cost and Usage Report** — *dữ liệu thô* đầy đủ nhất
> để tự phân tích. Nhận ra "thời" của câu hỏi là chọn đúng công cụ.

## Mục tiêu

Task 4.2 đòi: dùng đúng **AWS Budgets**, **Cost Explorer**, **Billing Conductor**; dùng
**Pricing Calculator**; hiểu **consolidated billing của AWS Organizations**; và hiểu
**cost allocation tag** trong quan hệ với **Cost and Usage Report**.

## Tổng quan

### Bốn công cụ, bốn câu hỏi

| Công cụ | Trả lời | Thời |
|---|---|---|
| **AWS Pricing Calculator** | Cấu hình dự kiến này sẽ tốn bao nhiêu | Tương lai |
| **AWS Cost Explorer** | Tiền đã đi đâu, theo service/tag/account; có dự báo | Quá khứ (+ dự báo) |
| **AWS Budgets** | **Cảnh báo** khi chi phí hoặc mức dùng vượt ngưỡng đã đặt | Hiện tại → tương lai gần |
| **AWS Cost and Usage Report (CUR)** | Dữ liệu **chi tiết nhất**, xuất vào S3 để tự phân tích | Quá khứ, thô |

Hai cặp đề thích thử:

- **Pricing Calculator ⇄ Cost Explorer**: *chưa dựng* ⇄ *đã dùng*.
- **Budgets ⇄ Cost Explorer**: *chặn/cảnh báo trước* ⇄ *mổ xẻ sau*. Câu hỏi có chữ **alert**,
  **notify**, **threshold** → **Budgets**.

**AWS Billing Conductor** là công cụ dựng hoá đơn **nội bộ** (chargeback/showback): định
nghĩa nhóm thanh toán và giá riêng cho từng đơn vị trong doanh nghiệp. Dấu hiệu:
*"bill internal business units differently"*.

### AWS Organizations và consolidated billing

| Thứ | Nghĩa |
|---|---|
| **Management account** (payer) | Account gốc, nhận **một hoá đơn** cho cả tổ chức |
| **Member account** | Các account con |
| **OU** (organizational unit) | Nhóm account để áp policy theo nhóm |
| **SCP** | Đặt **trần quyền** cho account con — không cấp quyền |

Ba lợi ích của consolidated billing, đúng thứ tự đề hay hỏi:

1. **Một hoá đơn** cho nhiều account.
2. **Gộp mức dùng để được bậc giá tốt hơn** — ví dụ tổng dung lượng S3 của cả tổ chức đẩy
   vào bậc giá rẻ hơn.
3. **Dùng chung quyền lợi Reserved Instance và Savings Plans** giữa các account.

Và một lợi ích không phải về tiền: **tách workload theo account** là ranh giới cách ly mạnh
nhất trên AWS — xem [governance](security-governance-compliance.md).

### Cost allocation tag

Tag là cặp khoá–giá trị gắn vào tài nguyên. Để tag **hiện trong báo cáo chi phí** thì phải
**kích hoạt nó làm cost allocation tag** trong Billing Console — gắn tag thôi là chưa đủ.

| Loại | Ai tạo |
|---|---|
| **AWS-generated** | AWS tạo, tiền tố `aws:` (ví dụ `aws:createdBy`) |
| **User-defined** | Bạn tạo (ví dụ `Project`, `Environment`, `CostCenter`) |

Hệ quả thực tế: **tag chỉ có tác dụng từ lúc kích hoạt trở đi** — nó **không** hồi tố cho
chi phí đã phát sinh. Đây là lý do đặt quy ước tag ngay từ ngày đầu.

**AWS Resource Groups và Tag Editor** là chỗ gắn/sửa tag hàng loạt.

### Những thứ còn lại nên nhận ra tên

| Service | Một dòng |
|---|---|
| **AWS Marketplace** | Mua software của bên thứ ba, **tính vào hoá đơn AWS** |
| **AWS Compute Optimizer** | Đọc số liệu thật, đề xuất đổi cỡ — công cụ của rightsizing |
| **AWS Trusted Advisor** | Trong năm trục có **cost optimization**: instance dùng dưới mức, Elastic IP không gắn |
| **AWS Cost Anomaly Detection** | Phát hiện chi phí tăng bất thường |
| **Billing alarm qua CloudWatch** | Cách cổ điển để báo khi hoá đơn vượt mốc |

### Việc đầu tiên trên một account mới

Thứ tự này là cái nên làm trước khi dựng bất cứ gì, và cũng là mẫu câu hỏi hay gặp:

1. Bật **MFA cho root**, không tạo access key cho root — xem [access-management](access-management.md).
2. Tạo **AWS Budgets** với ngưỡng nhỏ và email cảnh báo.
3. Đặt **quy ước tag** rồi **kích hoạt cost allocation tag**.
4. Kiểm **Free Tier usage alerts**.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Dùng **Cost Explorer** để dự toán hệ thống chưa dựng | Đó là **Pricing Calculator** |
| Dùng **Cost Explorer** để nhận email khi vượt ngưỡng | Đó là **Budgets** |
| Cho rằng gắn tag là tự nhiên thấy trong báo cáo | Phải **kích hoạt** làm cost allocation tag |
| Cho rằng tag kích hoạt sẽ áp hồi tố | Chỉ áp từ lúc kích hoạt |
| Cho rằng **SCP cấp quyền** cho account con | SCP đặt **trần**; IAM mới cấp |
| Chọn **Organizations** cho "chia hoá đơn nội bộ theo giá riêng" | Đó là **Billing Conductor** |
| Chọn **CUR** khi câu hỏi muốn xem nhanh trên giao diện | CUR là dữ liệu thô vào S3 ⇒ Cost Explorer |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Nhiều account trong Organizations | Cách ly mạnh, gộp giá, dùng chung RI | Phức tạp hơn: IAM, mạng, và quản vòng đời account |
| Budgets với ngưỡng chặt | Biết sớm, tránh hoá đơn sốc | Nhiều cảnh báo nhiễu nếu ngưỡng đặt sai |
| CUR vào S3 + Athena | Phân tích chi phí sâu nhất, tự do | Phải dựng pipeline và tự xây báo cáo |
| Tag chi tiết | Chia được tiền theo đội/dự án | Chỉ có giá trị nếu **cưỡng chế được** — tag thiếu là báo cáo thiếu |

## Related Topics

- [Pricing model](pricing-models.md) — RI, Savings Plans, Spot, và phí data transfer
- [Kinh tế cloud](cloud-economics.md) — TCO và rightsizing, phần lý lẽ
- [Governance và compliance](security-governance-compliance.md) — Organizations, SCP, Control Tower
- [Support và tài nguyên kỹ thuật](support-and-technical-resources.md) — mức support nào mở hết Trusted Advisor
- [Case study: access key của root lọt ra ngoài](../case-studies/root-access-key-lot-ra-ngoai.md)
- [AWS · Foundations](../index.md)
