---
title: Thành phần bảo mật
sidebar_position: 8
description: "Security group, network ACL, WAF, Shield — bốn tầng chặn ở bốn chỗ khác nhau. Và bốn service 'kiểm tra bảo mật' nghe giống nhau nhưng trả lời bốn câu khác nhau."
tags: [aws, clf-c02, security-group, network-acl, waf, shield, trusted-advisor, domain-2]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Thành phần bảo mật

> **Chốt:** Bốn công cụ chặn ở bốn tầng khác nhau. **Security group** lọc ở *instance*,
> chỉ có allow. **Network ACL** lọc ở *subnet*, có cả deny. **WAF** lọc ở *tầng ứng dụng*
> (HTTP). **Shield** chống *DDoS*. Câu hỏi có chữ "block a specific IP" thì đáp án là
> NACL — vì SG **không có rule deny**.

## Mục tiêu

Task 2.4 đòi: mô tả tính năng bảo mật của AWS (SG, NACL, WAF), biết có sản phẩm bảo mật
của bên thứ ba trên **Marketplace**, biết **tìm thông tin bảo mật ở đâu**, và biết service
nào dùng để **phát hiện vấn đề** (guide nêu tên Trusted Advisor).

## Tổng quan

### Bốn tầng chặn

| Công cụ | Chặn ở | Có deny? | Trạng thái | Việc của nó |
|---|---|---|---|---|
| **Security group** | ENI của instance | **Không** — chỉ allow | **Stateful** — trả lời được tự động | Mở cổng cho đúng nguồn |
| **Network ACL** | Biên subnet | **Có** allow và deny | **Stateless** — phải mở cả hai chiều | Chặn một IP/dải, hàng rào cấp subnet |
| **AWS WAF** | HTTP(S) — ALB, CloudFront, API Gateway | Có | — | Chặn SQL injection, XSS, bot, theo rate |
| **AWS Shield** | Tầng mạng/vận chuyển | — | — | Chống **DDoS**; Standard bật mặc định miễn phí, Advanced trả phí |

Ba hệ quả hay ra đề:

- **"Chặn một IP đang tấn công"** → NACL. Thêm rule vào SG không chặn được gì, vì SG
  không biểu đạt được "không cho".
- **SG stateful** nên chỉ cần mở inbound; trả lời ra tự động được. **NACL stateless** nên
  quên rule outbound là kết nối treo — lỗi im lặng, rất khó lần ra.
- **Shield Standard** luôn bật và **không phải trả thêm tiền**. Chỉ Advanced mới có phí,
  kèm đội phản ứng và bảo vệ hoá đơn trước đợt tấn công.

Chi tiết VPC và cách SG/NACL ngồi trong đó: [networking](networking.md).

### Bốn service "kiểm tra bảo mật", bốn câu hỏi

Đây là nhóm bị trộn nhiều nhất trong Domain 2:

| Service | Trả lời câu hỏi | Phạm vi |
|---|---|---|
| **AWS Trusted Advisor** | Tài khoản của tôi có lệch **thực hành tốt** không | 5 trục: cost, performance, security, fault tolerance, service limits |
| **Amazon Inspector** | Workload của tôi có **lỗ hổng** đã biết không | EC2, container image trong ECR, Lambda |
| **Amazon GuardDuty** | Có ai đang **hành động đáng ngờ** không | Phân tích log: CloudTrail, VPC Flow Logs, DNS |
| **AWS Config** | **Cấu hình** có lệch rule tôi đặt không | Trạng thái và lịch sử cấu hình tài nguyên |

Mẹo phân biệt nhanh bằng chủ ngữ của câu hỏi: *tài khoản* → Trusted Advisor · *phần mềm*
→ Inspector · *kẻ xâm nhập* → GuardDuty · *cấu hình* → Config.

**Trusted Advisor còn liên quan tới Domain 4**: nó cảnh báo cả instance dùng dưới mức và
**service limit** sắp đạt. Mức Basic/Developer chỉ xem được một phần kiểm tra; đầy đủ cần
**Business** trở lên — xem [support](support-and-technical-resources.md).

### Tìm thông tin bảo mật ở đâu

| Nơi | Có gì |
|---|---|
| **AWS Artifact** | Tải báo cáo tuân thủ: SOC, ISO, PCI DSS |
| **AWS Security Center** (trang bảo mật của AWS) | Tài liệu, thực hành tốt, thông báo |
| **AWS Security Blog** | Bài viết và cảnh báo mới |
| **AWS Knowledge Center** | Câu hỏi thường gặp đã có lời giải |
| **AWS Trust & Safety** | Nơi **báo cáo lạm dụng** tài nguyên AWS |
| **AWS Marketplace** | Sản phẩm bảo mật **của bên thứ ba** — firewall, WAF, antivirus |

Hai dòng cuối đều có trong exam guide và đều hay bị bỏ qua. "Tôi phát hiện một EC2 đang
quét cổng máy tôi" → báo cho **Trust & Safety**. "Chúng tôi cần đúng firewall của hãng X"
→ **Marketplace**.

### Các service bảo mật còn lại cần nhận ra tên

| Service | Một dòng |
|---|---|
| **AWS Network Firewall** | Firewall có trạng thái ở biên **VPC**, lọc được cả theo domain |
| **AWS Firewall Manager** | Áp quy tắc WAF/Shield/Network Firewall trên **nhiều account** |
| **Amazon Macie** | Tìm **dữ liệu nhạy cảm** (PII) trong S3 |
| **Amazon Detective** | **Điều tra** nguyên nhân sau một finding |
| **AWS Security Hub** | **Gom** finding từ nhiều service, chấm theo tiêu chuẩn |
| **AWS Directory Service** | Active Directory được quản trên AWS |
| **AWS RAM** | Chia sẻ tài nguyên giữa các account |
| **AWS KMS** / **CloudHSM** | Quản khoá mã hoá — xem [governance](security-governance-compliance.md) |

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Dùng **security group** để chặn một IP cụ thể | SG chỉ có allow — phải dùng **NACL** |
| Quên rule outbound của NACL | NACL **stateless**; thiếu chiều về là kết nối treo |
| Chọn **Shield** cho tấn công SQL injection | Đó là tầng ứng dụng → **WAF** |
| Chọn **WAF** cho "làm ngập băng thông" | Đó là DDoS → **Shield** |
| Trả tiền để "bật Shield Standard" | Nó đã bật sẵn, miễn phí |
| Chọn **Inspector** cho "tài khoản có lệch best practice" | Đó là **Trusted Advisor** |
| Chọn **GuardDuty** cho "liệt kê lỗ hổng CVE trên EC2" | Đó là **Inspector** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Chặn ở NACL thay vì SG | Chặn được cả dải, trước khi gói vào instance | Stateless ⇒ dễ sai; rule đánh số, khó đọc khi nhiều |
| Thêm WAF trước ALB | Lọc được tấn công tầng 7, có managed rule sẵn | Phí theo rule và theo request; rule sai là chặn người dùng thật |
| Shield Advanced | Có đội phản ứng, được bảo vệ chi phí khi bị tấn công | Phí cam kết cao — chỉ hợp khi downtime đắt hơn nhiều |
| Mua sản phẩm trên Marketplace | Dùng đúng công cụ đã quen, triển khai nhanh | Thêm một nhà cung cấp phải vận hành và vá |

## Related Topics

- [Network](networking.md) — VPC, subnet, nơi SG và NACL thật sự ngồi
- [Governance và compliance](security-governance-compliance.md) — GuardDuty, Inspector, Macie, Security Hub, mã hoá
- [Access management](access-management.md) — IAM, và vì sao Trusted Advisor nhắc MFA cho root
- [Support và tài nguyên kỹ thuật](support-and-technical-resources.md) — mức support nào mở hết Trusted Advisor
- [Case study: security group không chặn được một IP](../case-studies/security-group-khong-chan-duoc-ip.md)
- [AWS · Foundations](../index.md)
