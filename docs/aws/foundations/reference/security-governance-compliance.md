---
title: Governance và compliance
sidebar_position: 6
description: "Artifact lấy báo cáo tuân thủ, CloudTrail ghi ai làm gì, Config ghi cấu hình đổi thế nào, CloudWatch đo số liệu. Bốn service bốn câu hỏi khác nhau."
tags: [aws, clf-c02, cloudtrail, config, artifact, kms, encryption, domain-2]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Governance và compliance

> **Chốt:** Bốn service nghe giống nhau, bốn câu hỏi khác nhau. **CloudTrail** = *ai đã
> gọi API nào*. **Config** = *cấu hình tài nguyên đã đổi thế nào, và có đúng quy định
> không*. **CloudWatch** = *số liệu và log của ứng dụng*. **Artifact** = *tải báo cáo
> SOC/ISO của AWS*. Phân biệt được bốn cái này là phân biệt được phần lớn Domain 2.

## Mục tiêu

Task 2.2 đòi: tìm thông tin tuân thủ ở đâu, hiểu lợi ích của mã hoá, biết **log nằm ở
đâu**, nhận ra service phục vụ governance, và biết yêu cầu tuân thủ **khác nhau giữa các
service**.

## Tổng quan

### Bốn service, bốn câu hỏi

| Service | Trả lời | Dấu hiệu trong đề |
|---|---|---|
| **AWS CloudTrail** | **Ai** đã làm gì, khi nào, từ IP nào — lịch sử **API call** | *who*, *audit*, *API activity*, *forensics* |
| **AWS Config** | **Cấu hình** tài nguyên hiện tại và lịch sử thay đổi; có lệch rule không | *configuration history*, *compliance rule*, *drift* |
| **Amazon CloudWatch** | **Số liệu**, log, alarm, dashboard | *metric*, *alarm*, *monitor performance*, *log* |
| **AWS Artifact** | Nơi **tải** báo cáo tuân thủ của AWS (SOC, ISO, PCI) và thoả thuận | *download report*, *auditor asks for evidence* |

Cặp hay lẫn nhất là **CloudTrail ⇄ Config**: *hành động của người* ⇄ *trạng thái của vật*.
"Ai đã xoá security group đó" là CloudTrail. "Security group đó có từng mở cổng 22 ra
internet không" là Config.

Cặp thứ hai: **CloudWatch ⇄ CloudTrail**: *hiệu năng* ⇄ *hành động*. CPU 95% là CloudWatch;
ai `TerminateInstances` là CloudTrail.

### Các service phát hiện và đánh giá

| Service | Nó tìm gì | Nhìn vào đâu |
|---|---|---|
| **Amazon GuardDuty** | **Hoạt động đe doạ** đang diễn ra — phát hiện xâm nhập | Log: CloudTrail, VPC Flow Logs, DNS |
| **Amazon Inspector** | **Lỗ hổng** trong EC2, container image, Lambda | Quét phần mềm và cấu hình mạng |
| **Amazon Macie** | **Dữ liệu nhạy cảm** trong S3 (PII) | Nội dung object |
| **Amazon Detective** | **Điều tra nguyên nhân** sau khi có phát hiện | Gom và dựng đồ thị từ log |
| **AWS Security Hub** | **Gom mọi phát hiện** về một chỗ, chấm theo tiêu chuẩn | Kết quả của các service trên |
| **AWS Audit Manager** | Tự động thu thập **bằng chứng** cho một bộ kiểm soát | Tài nguyên + log của bạn |

Bốn dòng đầu rất hay bị trộn. Một câu nhớ: **GuardDuty tìm *kẻ đang làm*, Inspector tìm
*chỗ có thể bị làm*, Macie tìm *thứ đáng bị lấy*, Detective trả lời *vì sao*.**

**Artifact ⇄ Audit Manager** cũng là một cặp: Artifact cho bằng chứng **của AWS** (phần
hạ tầng); Audit Manager thu bằng chứng **của bạn** (phần cấu hình và tài nguyên). Đúng
theo hai nửa của [shared responsibility](shared-responsibility.md).

### Mã hoá: hai trạng thái, một service quản khoá

| Trạng thái | Nghĩa | Cơ chế điển hình |
|---|---|---|
| **In transit** | Dữ liệu đang đi trên đường | TLS/HTTPS; chứng chỉ do **ACM** phát và tự gia hạn |
| **At rest** | Dữ liệu đang nằm trên đĩa | S3/EBS/RDS bật mã hoá, khoá do **KMS** quản |

| Service | Việc |
|---|---|
| **AWS KMS** | Tạo và quản khoá mã hoá; tích hợp sẵn với hầu hết service lưu trữ |
| **AWS CloudHSM** | Module phần cứng **dành riêng**, khách **toàn quyền kiểm soát khoá** — chọn khi quy định đòi FIPS/HSM riêng |
| **AWS Certificate Manager (ACM)** | Phát và tự gia hạn chứng chỉ TLS cho ELB, CloudFront, API Gateway |
| **AWS Secrets Manager** | Lưu **mật khẩu, khoá API**, có **tự động rotate** |

Ranh giới hay hỏi: **KMS ⇄ CloudHSM** (AWS quản khoá trong môi trường dùng chung ⇄ khách
toàn quyền trên HSM riêng), và **Secrets Manager ⇄ Parameter Store** (có rotate tự động
và tốn phí ⇄ lưu tham số, mức cơ bản miễn phí) — xem [access-management](access-management.md).

### Governance ở cấp tổ chức

| Service | Việc |
|---|---|
| **AWS Organizations** | Nhiều account thành một cây, có **SCP** (service control policy) đặt trần quyền |
| **AWS Control Tower** | Dựng sẵn môi trường nhiều account theo thực hành tốt, kèm **guardrail** |
| **AWS Service Catalog** | Danh mục sản phẩm đã được duyệt để người trong tổ chức tự triển khai |
| **AWS Firewall Manager** | Áp quy tắc WAF/Shield/Network Firewall trên nhiều account cùng lúc |
| **AWS RAM** | Chia sẻ tài nguyên giữa các account |

**SCP không cấp quyền** — nó chỉ **giới hạn** quyền tối đa mà IAM trong account con có thể
có. Đây là điểm đề hỏi: SCP + IAM policy là *giao* của hai tập, không phải *hợp*.

### Log nằm ở đâu

| Loại log | Ở đâu |
|---|---|
| API call trên account | **CloudTrail** (lưu được vào S3, CloudWatch Logs) |
| Log ứng dụng, log hệ thống | **CloudWatch Logs** |
| Lưu lượng mạng trong VPC | **VPC Flow Logs** |
| Truy cập vào bucket S3 | **S3 server access logs** / CloudTrail data events |
| Lịch sử cấu hình tài nguyên | **AWS Config** |

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Dùng **CloudWatch** để biết ai xoá tài nguyên | Đó là CloudTrail |
| Dùng **CloudTrail** để biết cấu hình đã lệch chuẩn | Đó là Config (hoặc Security Hub cho điểm tuân thủ) |
| Dùng **Artifact** để chứng minh *cấu hình của bạn* đạt chuẩn | Artifact chỉ có báo cáo **của AWS**; phần của bạn là Audit Manager |
| Chọn **Inspector** cho "phát hiện truy cập bất thường từ IP lạ" | Đó là GuardDuty |
| Chọn **Macie** cho "quét lỗ hổng EC2" | Macie xem **dữ liệu nhạy cảm trong S3** |
| Cho rằng **SCP cấp quyền** | SCP đặt **trần**; quyền vẫn phải do IAM policy cấp |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Bật Config trên mọi tài nguyên | Có lịch sử cấu hình để truy vết | Tốn phí theo số configuration item — không miễn phí |
| Bật GuardDuty | Phát hiện mối đe doạ không cần dựng gì | Phí theo lượng log phân tích; vẫn cần người xử lý finding |
| CloudHSM thay KMS | Toàn quyền kiểm soát khoá, đạt yêu cầu HSM riêng | Đắt hơn hẳn, và **tự chịu trách nhiệm nếu mất khoá** |
| Secrets Manager thay Parameter Store | Rotate tự động | Tốn phí theo secret |

## Related Topics

- [Shared responsibility model](shared-responsibility.md) — Artifact ⇄ Audit Manager chia theo đúng hai nửa đó
- [Access management](access-management.md) — IAM, MFA, Secrets Manager, Parameter Store
- [Thành phần bảo mật](security-components.md) — SG, NACL, WAF, Shield, Trusted Advisor
- [Billing và cost management](billing-and-cost-management.md) — Organizations còn là đơn vị gộp hoá đơn
- [AWS · Foundations](../index.md)
