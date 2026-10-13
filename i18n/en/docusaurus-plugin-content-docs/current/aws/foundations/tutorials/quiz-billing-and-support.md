---
title: "Câu hỏi: Billing & support"
i18n_status: untranslated
sidebar_position: 11
description: "Tự chấm phần quản lý chi phí, Organizations và các gói Support của AWS."
tags: [aws, clf-c02, quiz, billing, support]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
---

> Tự chấm phần billing, pricing, Organizations và Support. Mỗi câu ghi rõ loại (multiple choice = chọn 1, multiple response = chọn nhiều). Đáp án nằm trong `<details>`.

## Câu 1 (multiple choice)

Bạn muốn **nhận cảnh báo khi chi phí tháng vượt 500 USD**. Dùng công cụ nào?

- A. Cost Explorer
- B. AWS Budgets
- C. Pricing Calculator
- D. Cost and Usage Report

<details>
<summary>Đáp án</summary>

**B. AWS Budgets.** Budgets đặt ngưỡng và gửi alert khi vượt (hoặc dự báo sẽ vượt). Cost Explorer chỉ phân tích/trực quan hóa, không "cảnh báo khi vượt".

</details>

## Câu 2 (multiple choice)

Bạn cần **phân tích xu hướng chi phí trong 6 tháng qua** theo từng dịch vụ, có biểu đồ. Công cụ nào phù hợp nhất?

- A. AWS Budgets
- B. Billing Dashboard
- C. Cost Explorer
- D. Trusted Advisor

<details>
<summary>Đáp án</summary>

**C. Cost Explorer.** Đây là công cụ phân tích/trực quan hóa chi phí theo thời gian, lọc theo dịch vụ/tag, có dự báo. Từ khóa "xu hướng/biểu đồ/phân tích" → Cost Explorer.

</details>

## Câu 3 (multiple choice)

Trước khi build một kiến trúc mới, bạn muốn **ước tính chi phí hàng tháng** của nó. Dùng gì?

- A. Cost Explorer
- B. AWS Pricing Calculator
- C. AWS Budgets
- D. Cost Anomaly Detection

<details>
<summary>Đáp án</summary>

**B. AWS Pricing Calculator.** Ước tính chi phí *trước khi dùng* (dự toán/TCO). Cost Explorer và các công cụ còn lại chỉ làm việc với chi phí đã *phát sinh* thật.

</details>

## Câu 4 (multiple choice)

Công ty muốn một **Technical Account Manager (TAM)** đồng hành. Gói Support nào đáp ứng?

- A. Developer
- B. Business
- C. Enterprise
- D. Basic

<details>
<summary>Đáp án</summary>

**C. Enterprise.** TAM **chỉ có ở Enterprise Support**. Business có hỗ trợ 24/7 nhưng *không* có TAM — đây là câu bẫy hay gặp.

</details>

## Câu 5 (multiple choice)

Tổ chức có **nhiều AWS account** và muốn **gộp hóa đơn về một chỗ, đồng thời được chiết khấu theo volume**. Giải pháp?

- A. AWS Control Tower
- B. AWS Organizations với consolidated billing
- C. Cost Allocation Tags
- D. IAM groups

<details>
<summary>Đáp án</summary>

**B. AWS Organizations với consolidated billing.** Gộp hóa đơn và cộng gộp usage của các account để chạm mốc chiết khấu sớm hơn. Chiết khấu đến từ *gộp usage*, không phải từ việc có nhiều account.

</details>

## Câu 6 (multiple choice)

Bạn muốn **đặt trần quyền tối đa** mà một account con trong Organizations được phép sử dụng, bất kể IAM cấp gì. Dùng gì?

- A. IAM policy
- B. Service Control Policy (SCP)
- C. Resource policy
- D. Security group

<details>
<summary>Đáp án</summary>

**B. Service Control Policy (SCP).** SCP đặt *trần* quyền ở mức account/OU. Lưu ý: SCP **không cấp quyền**, chỉ giới hạn — quyền thực tế vẫn phải được IAM cấp.

</details>

## Câu 7 (multiple choice)

Công cụ nào **tự động kiểm tra account theo best practice** của AWS về bảo mật, chi phí, hiệu năng, fault tolerance và service limits?

- A. AWS Config
- B. Trusted Advisor
- C. CloudTrail
- D. Compute Optimizer

<details>
<summary>Đáp án</summary>

**B. Trusted Advisor.** 5 nhóm check: Cost Optimization, Performance, Security, Fault Tolerance, Service Limits/Quotas.

</details>

## Câu 8 (multiple choice)

Phát biểu nào về **Free Tier** là **đúng**?

- A. Mọi dịch vụ đều miễn phí trong 12 tháng đầu
- B. Free Tier gồm ba loại: always free, 12 tháng, và trial
- C. Free Tier chỉ áp dụng cho EC2
- D. Hết Free Tier thì account tự động bị khóa

<details>
<summary>Đáp án</summary>

**B.** Free Tier có ba loại: **always free** (luôn miễn phí trong hạn mức), **12 tháng** (free 12 tháng đầu), và **trial** (dùng thử ngắn hạn). Hết hạn mức thì tính tiền bình thường, không khóa account.

</details>

## Câu 9 (multiple choice)

Bạn cần **báo cáo chi phí chi tiết nhất**, từng dòng usage, xuất ra S3 để phân tích sâu bằng Athena. Dùng gì?

- A. Billing Dashboard
- B. Cost Explorer
- C. Cost and Usage Report (CUR)
- D. AWS Budgets

<details>
<summary>Đáp án</summary>

**C. Cost and Usage Report (CUR).** Đây là nguồn dữ liệu chi phí chi tiết nhất, xuất ra S3. Cost Explorer trực quan nhưng không chi tiết tới mức từng dòng như CUR.

</details>

## Câu 10 (multiple choice)

Theo nguyên tắc giá của AWS, chi phí **data transfer** thường phát sinh ở chiều nào?

- A. Dữ liệu đi vào AWS (IN)
- B. Dữ liệu đi ra Internet/ra region khác (OUT)
- C. Cả IN và OUT đều tính như nhau
- D. Data transfer luôn miễn phí

<details>
<summary>Đáp án</summary>

**B. Data transfer OUT.** Đưa dữ liệu *vào* AWS (IN) thường miễn phí; cái tốn tiền là dữ liệu đi *ra*.

</details>

## Câu 11 (multiple choice)

Bạn muốn **dựng nhanh một môi trường multi-account** với OU, guardrails, logging theo best practice ngay từ đầu. Dịch vụ nào?

- A. AWS Organizations (tự cấu hình thủ công)
- B. AWS Control Tower
- C. AWS Config
- D. IAM Identity Center

<details>
<summary>Đáp án</summary>

**B. AWS Control Tower.** Dựng sẵn landing zone multi-account chuẩn (tự tạo Organizations, OU, guardrails, logging, SSO...). Organizations là nền tảng bên dưới nhưng phải tự ghép từng mảnh.

</details>

## Câu 12 (multiple choice)

Gói Support nào **bắt đầu có hỗ trợ kỹ thuật 24/7 qua phone/chat**?

- A. Basic
- B. Developer
- C. Business
- D. Chỉ Enterprise

<details>
<summary>Đáp án</summary>

**C. Business.** 24/7 phone/chat có từ **Business trở lên**. Developer chỉ có hỗ trợ qua email trong giờ hành chính; Basic không có hỗ trợ kỹ thuật.

</details>

## Câu 13 (multiple response — chọn 2)

Những phát biểu nào về **consolidated billing** trong AWS Organizations là **đúng**? (Chọn 2)

- A. Gộp hóa đơn của mọi account về một chỗ
- B. Cộng gộp usage để được chiết khấu theo volume
- C. Tự động cấp thêm quyền IAM cho account con
- D. Thay thế hoàn toàn nhu cầu dùng IAM

<details>
<summary>Đáp án</summary>

**A và B.** Consolidated billing gộp hóa đơn và cộng gộp usage để chạm mốc chiết khấu sớm hơn. Nó **không** liên quan tới cấp quyền (C sai) và **không** thay thế IAM (D sai).

</details>

## Câu 14 (multiple response — chọn 2)

Hai tính năng nào **chỉ** (hoặc bắt đầu) có ở các gói cao hơn? (Chọn 2)

- A. Technical Account Manager — chỉ Enterprise
- B. Full Trusted Advisor checks — từ Business trở lên
- C. AWS Health Dashboard — chỉ Enterprise
- D. Truy cập documentation — chỉ Business

<details>
<summary>Đáp án</summary>

**A và B.** TAM chỉ ở Enterprise; full Trusted Advisor checks từ Business trở lên. AWS Health Dashboard và documentation có sẵn cho mọi gói (kể cả Basic), nên C và D sai.

</details>

## Câu 15 (multiple choice)

Công cụ nào dùng **machine learning để phát hiện chi phí bất thường** và cảnh báo?

- A. Cost Anomaly Detection
- B. Cost Explorer
- C. Trusted Advisor
- D. Compute Optimizer

<details>
<summary>Đáp án</summary>

**A. Cost Anomaly Detection.** Dùng ML phát hiện pattern chi phí bất thường rồi cảnh báo. Compute Optimizer thì khuyến nghị rightsizing resource (khác mục đích).

</details>

## Câu 16 (multiple choice)

Bạn muốn biết **AWS có đang gặp sự cố ở region nào không, và có sự kiện nào ảnh hưởng trực tiếp tới resource của account mình không**. Xem ở đâu?

- A. CloudWatch
- B. AWS Health Dashboard
- C. Trusted Advisor
- D. CloudTrail

<details>
<summary>Đáp án</summary>

**B. AWS Health Dashboard.** Phần service health cho trạng thái chung các dịch vụ; phần your account health (Personal Health Dashboard) cho sự kiện ảnh hưởng *trực tiếp* tới resource của bạn.

</details>

## Related Topics

- [Billing, pricing & support](../reference/billing-and-cost-management.md)
- [Mục lục AWS](../index.md)
