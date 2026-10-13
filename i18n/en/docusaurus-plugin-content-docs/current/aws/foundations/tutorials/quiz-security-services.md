---
title: "Câu hỏi: Dịch vụ bảo mật"
i18n_status: untranslated
sidebar_position: 10
description: "Tự chấm Shared Responsibility và dịch vụ bảo mật — mô tả tình huống chọn đúng dịch vụ."
tags: [aws, clf-c02, quiz, security]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-13
---

> **Chốt:** Tự chấm trước, mở `<details>` sau. Security là domain nặng nhất (~30%) — hai dạng chính: *ai chịu trách nhiệm* (Shared Responsibility) và *tình huống → dịch vụ nào*.

Lý thuyết đầy đủ ở [Dịch vụ bảo mật & compliance](../reference/security-components.md).

---

**Câu 1 (multiple choice).** Trong Shared Responsibility Model, ai chịu trách nhiệm **vá hệ điều hành (OS) chạy trên một EC2 instance**?

- A. AWS
- B. Khách hàng
- C. Chia đôi, mỗi bên một nửa
- D. Nhà cung cấp OS

<details>
<summary>Đáp án</summary>

**B.** Khách hàng. EC2 là IaaS: AWS lo hạ tầng vật lý và hypervisor, còn OS khách tự cài thì khách tự vá. Đây là bẫy kinh điển.

</details>

---

**Câu 2 (multiple choice).** Việc nào sau đây thuộc trách nhiệm của **AWS** ("security OF the cloud")?

- A. Cấu hình Security Group
- B. Vá phần cứng vật lý và hypervisor
- C. Phân quyền IAM
- D. Mã hóa dữ liệu trước khi lưu

<details>
<summary>Đáp án</summary>

**B.** Phần cứng vật lý, cơ sở hạ tầng và hypervisor là của AWS. A, C, D đều là cấu hình/dữ liệu — của khách hàng.

</details>

---

**Câu 3 (multiple choice).** Ứng dụng web đang bị **tấn công DDoS** làm nghẽn. Dịch vụ nào bảo vệ?

- A. AWS WAF
- B. Amazon GuardDuty
- C. AWS Shield
- D. Amazon Inspector

<details>
<summary>Đáp án</summary>

**C.** Shield chống DDoS. Standard miễn phí và tự bật; Advanced trả phí cho bảo vệ nâng cao. WAF là lọc traffic layer 7 (SQLi/XSS), khác.

</details>

---

**Câu 4 (multiple choice).** Cần chặn **SQL injection và XSS** nhắm vào web application (layer 7). Dùng gì?

- A. AWS Shield
- B. AWS WAF
- C. Security Group
- D. AWS Config

<details>
<summary>Đáp án</summary>

**B.** WAF (Web Application Firewall) lọc HTTP/HTTPS layer 7 theo rule nội dung, chặn SQLi/XSS.

</details>

---

**Câu 5 (multiple choice).** Công ty lo ngại có **PII / dữ liệu nhạy cảm** vô tình nằm trong các **S3 bucket**. Dịch vụ nào phát hiện?

- A. Amazon Macie
- B. Amazon GuardDuty
- C. Amazon Inspector
- D. AWS Secrets Manager

<details>
<summary>Đáp án</summary>

**A.** Macie dùng ML quét S3 để tìm dữ liệu nhạy cảm / PII. Từ khóa *sensitive data + S3* → Macie.

</details>

---

**Câu 6 (multiple choice).** Muốn **quét lỗ hổng bảo mật (vulnerability/CVE)** trên EC2, container image trong ECR và Lambda. Dịch vụ nào?

- A. Amazon Macie
- B. Amazon Inspector
- C. Amazon Detective
- D. AWS Shield

<details>
<summary>Đáp án</summary>

**B.** Inspector quét vulnerability trên EC2/ECR/Lambda. Từ khóa *vulnerability/scan* → Inspector.

</details>

---

**Câu 7 (multiple choice).** Dịch vụ nào phân tích **log (VPC Flow, CloudTrail, DNS)** bằng ML để phát hiện **hành vi bất thường / mối đe dọa**?

- A. Amazon Inspector
- B. AWS Config
- C. Amazon GuardDuty
- D. Amazon Macie

<details>
<summary>Đáp án</summary>

**C.** GuardDuty là threat detection qua phân tích log. Từ khóa *threat / log / hành vi bất thường* → GuardDuty.

</details>

---

**Câu 8 (multiple choice).** Cần lưu mật khẩu database và **tự động xoay vòng (rotate)** nó định kỳ. Dùng gì?

- A. Systems Manager Parameter Store
- B. AWS Secrets Manager
- C. AWS KMS
- D. AWS Artifact

<details>
<summary>Đáp án</summary>

**B.** Secrets Manager lưu secret và **tự rotate**. Parameter Store cũng lưu được secret nhưng không tự xoay vòng.

</details>

---

**Câu 9 (multiple choice).** Yêu cầu compliance đòi **HSM phần cứng riêng, đơn tenant** do khách toàn quyền kiểm soát. Dịch vụ nào?

- A. AWS KMS
- B. AWS CloudHSM
- C. AWS Secrets Manager
- D. Amazon Cognito

<details>
<summary>Đáp án</summary>

**B.** CloudHSM cho HSM phần cứng riêng (FIPS 140-2 Level 3). KMS là software-based, multi-tenant — không đáp ứng yêu cầu HSM chuyên dụng.

</details>

---

**Câu 10 (multiple choice).** Auditor yêu cầu **báo cáo compliance của AWS (SOC, ISO, PCI DSS)**. Lấy ở đâu?

- A. AWS Config
- B. AWS CloudTrail
- C. AWS Artifact
- D. AWS Audit Manager

<details>
<summary>Đáp án</summary>

**C.** Artifact là cổng tải báo cáo compliance (SOC/ISO/PCI). Config theo dõi cấu hình; CloudTrail ghi API call.

</details>

---

**Câu 11 (multiple choice).** Muốn biết **ai đã gọi API gì** trên tài khoản AWS (audit trail các hành động). Dùng gì?

- A. AWS CloudTrail
- B. AWS Config
- C. Amazon CloudWatch
- D. AWS Artifact

<details>
<summary>Đáp án</summary>

**A.** CloudTrail ghi lại API call / ai làm gì. Config theo dõi *thay đổi cấu hình*; CloudWatch là metric/log vận hành.

</details>

---

**Câu 12 (multiple choice).** Dịch vụ nào theo dõi **thay đổi cấu hình** tài nguyên theo thời gian và đánh giá chúng có **tuân rule compliance** không?

- A. AWS CloudTrail
- B. AWS Config
- C. AWS Security Hub
- D. AWS Shield

<details>
<summary>Đáp án</summary>

**B.** Config = cấu hình đang ra sao và có lệch chuẩn không. Đừng lẫn với CloudTrail (API call).

</details>

---

**Câu 13 (multiple choice).** Ứng dụng mobile cần cho **người dùng cuối đăng nhập** (sign-up, sign-in, social login). Dịch vụ nào?

- A. AWS IAM
- B. Amazon Cognito
- C. AWS Directory Service
- D. AWS Secrets Manager

<details>
<summary>Đáp án</summary>

**B.** Cognito quản lý đăng nhập người dùng cuối cho app. IAM dùng cho người/dịch vụ *vận hành* tài khoản AWS — không phải end-user của app.

</details>

---

**Câu 14 (multiple choice).** Cần **chứng chỉ SSL/TLS** cho website, quản lý và gia hạn tự động, miễn phí cho dịch vụ AWS. Dùng gì?

- A. AWS KMS
- B. AWS Certificate Manager (ACM)
- C. AWS CloudHSM
- D. AWS WAF

<details>
<summary>Đáp án</summary>

**B.** ACM cấp và tự gia hạn chứng chỉ SSL/TLS (mã hóa in transit).

</details>

---

**Câu 15 (multiple choice).** Dịch vụ nào **tổng hợp và chuẩn hóa cảnh báo** từ GuardDuty, Inspector, Macie về một bảng điều khiển chung?

- A. Amazon Detective
- B. AWS Security Hub
- C. AWS Config
- D. Amazon CloudWatch

<details>
<summary>Đáp án</summary>

**B.** Security Hub gom cảnh báo bảo mật từ nhiều dịch vụ và chấm điểm compliance. Detective dùng để điều tra sâu root cause.

</details>

---

**Câu 16 (multiple response — chọn 2).** Những việc nào thuộc trách nhiệm của **khách hàng** ("security IN the cloud")?

- A. Cấu hình phân quyền IAM
- B. Vá hypervisor
- C. Mã hóa dữ liệu của mình (at rest / in transit)
- D. Bảo mật vật lý trung tâm dữ liệu

<details>
<summary>Đáp án</summary>

**A và C.** Phân quyền IAM và mã hóa dữ liệu là của khách hàng. B (hypervisor) và D (cơ sở vật lý) là của AWS.

</details>

---

**Câu 17 (multiple choice).** Với **Amazon RDS (managed)**, ai chịu trách nhiệm **vá hệ điều hành và database engine**?

- A. AWS
- B. Khách hàng
- C. Khách hàng vá OS, AWS vá engine
- D. Không bên nào — tự động không cần vá

<details>
<summary>Đáp án</summary>

**A.** RDS là managed service: AWS lo vá OS và engine. Khách vẫn lo cấu hình, phân quyền, dữ liệu và bật mã hóa. (Khác hẳn EC2 — ở EC2 khách tự vá OS.)

</details>

---

**Câu 18 (multiple choice).** Sau một sự cố bảo mật, team cần **điều tra sâu, dựng lại chuỗi sự kiện để tìm root cause**. Dịch vụ nào phù hợp nhất?

- A. Amazon GuardDuty
- B. Amazon Detective
- C. Amazon Inspector
- D. AWS Shield

<details>
<summary>Đáp án</summary>

**B.** Detective dùng để điều tra, phân tích quan hệ và dựng lại chuỗi sự kiện. GuardDuty *phát hiện* mối đe dọa; Detective *điều tra* nó.

</details>

---

**Câu 19 (multiple choice).** Về **penetration testing** trên AWS, phát biểu nào đúng?

- A. Mọi loại pentest đều bị cấm tuyệt đối
- B. Có thể tự pentest một số dịch vụ (EC2, RDS, Lambda...) trên tài nguyên của mình mà không cần xin phép trước, trong phạm vi chính sách
- C. Phải luôn xin phép AWS trước mọi trường hợp
- D. Chỉ AWS mới được phép pentest hệ thống của khách

<details>
<summary>Đáp án</summary>

**B.** AWS cho phép tự pentest một số dịch vụ trên tài nguyên của chính bạn mà không cần xin phép trước, miễn tuân chính sách. Lạm dụng tài nguyên thì báo **AWS Abuse team**.

</details>

---

## Related Topics

- [Dịch vụ bảo mật & compliance](../reference/security-components.md)
- [Mục lục AWS](../index.md)
