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

**B.** Khách hàng — vì EC2 là IaaS nên guest OS nằm bên trong ranh giới của khách.

Shared Responsibility Model chia đôi theo một đường ranh: AWS lo "security **OF** the cloud" (phần cứng, mạng vật lý, hypervisor, cơ sở hạ tầng), khách lo "security **IN** the cloud" (những gì khách cấu hình và chạy bên trên). Với EC2, AWS dừng lại ở hypervisor; mọi thứ từ guest OS trở lên — bao gồm cả bản vá OS, runtime, ứng dụng — là của khách. Đây là ranh giới IaaS kinh điển và cũng là bẫy hay gặp nhất.

- **A (AWS):** sai — AWS chỉ vá tầng hypervisor và dưới; không chạm vào guest OS của khách trên EC2.
- **C (chia đôi):** sai — Shared Responsibility không bao giờ "mỗi bên một nửa" một hạng mục; mỗi hạng mục thuộc hẳn về một bên theo đường ranh.
- **D (nhà cung cấp OS):** sai — nhà cung cấp OS chỉ phát hành bản vá; trách nhiệm *áp dụng* bản vá lên instance là của khách.

📌 Nhớ cho đề: EC2 (IaaS) → khách tự vá OS. So sánh với Câu 17 (RDS managed → AWS vá OS).

</details>

---

**Câu 2 (multiple choice).** Việc nào sau đây thuộc trách nhiệm của **AWS** ("security OF the cloud")?

- A. Cấu hình Security Group
- B. Vá phần cứng vật lý và hypervisor
- C. Phân quyền IAM
- D. Mã hóa dữ liệu trước khi lưu

<details>
<summary>Đáp án</summary>

**B.** Vá phần cứng vật lý và hypervisor là "OF the cloud" — thuộc AWS.

Quy tắc phân biệt nhanh: nếu một việc do khách **cấu hình, chọn, hoặc nhập dữ liệu** thì nó là "IN the cloud" (của khách); nếu nó là **hạ tầng vật lý, mạng lõi, hypervisor** mà khách không bao giờ chạm tới thì là "OF the cloud" (của AWS). Phần cứng và hypervisor nằm hoàn toàn dưới ranh giới, khách không có quyền truy cập, nên đương nhiên là của AWS.

- **A (Security Group):** sai — SG là firewall khách tự cấu hình, luôn là của khách bất kể loại service.
- **C (phân quyền IAM):** sai — ai được làm gì là do khách thiết lập; AWS chỉ cung cấp công cụ IAM.
- **D (mã hóa dữ liệu):** sai — dữ liệu và việc bật mã hóa là của khách ("protect your data").

📌 Nhớ cho đề: AWS chỉ lo phần cứng + mạng vật lý + hypervisor. Mọi cấu hình, IAM, dữ liệu, mã hóa → khách.

</details>

---

**Câu 3 (multiple choice).** Ứng dụng web đang bị **tấn công DDoS** làm nghẽn. Dịch vụ nào bảo vệ?

- A. AWS WAF
- B. Amazon GuardDuty
- C. AWS Shield
- D. Amazon Inspector

<details>
<summary>Đáp án</summary>

**C.** Shield là dịch vụ chống DDoS — từ khóa *DDoS* gắn thẳng với Shield.

Shield bảo vệ ở tầng mạng/transport (L3/L4) chống các kiểu tấn công làm cạn băng thông hoặc tài nguyên kết nối. **Shield Standard** tự bật miễn phí cho mọi tài khoản; **Shield Advanced** trả phí, bổ sung bảo vệ sâu hơn, báo cáo và hỗ trợ đội ứng cứu (DRT). Đừng lẫn với WAF: Shield chặn *làm nghẽn bằng khối lượng*, WAF chặn *nội dung request độc hại*.

- **A (WAF):** sai — WAF lọc nội dung HTTP L7 (SQLi/XSS), không phải mục đích chính để hấp thụ DDoS khối lượng lớn.
- **B (GuardDuty):** sai — GuardDuty *phát hiện* mối đe dọa qua phân tích log, không *chặn* traffic tấn công.
- **D (Inspector):** sai — Inspector quét lỗ hổng phần mềm, không liên quan tới tấn công mạng đang diễn ra.

📌 Nhớ cho đề: DDoS → Shield. SQLi/XSS → WAF. Thường đi cặp với nhau nhưng khác tầng.

</details>

---

**Câu 4 (multiple choice).** Cần chặn **SQL injection và XSS** nhắm vào web application (layer 7). Dùng gì?

- A. AWS Shield
- B. AWS WAF
- C. Security Group
- D. AWS Config

<details>
<summary>Đáp án</summary>

**B.** WAF (Web Application Firewall) lọc HTTP/HTTPS ở layer 7 — đúng tầng của SQLi/XSS.

WAF đặt trước CloudFront, ALB hoặc API Gateway và kiểm tra *nội dung* của từng request web theo rule (chuỗi khả nghi, pattern SQLi/XSS, rate limit, chặn theo IP/quốc gia). Vì nó hiểu nội dung HTTP nên mới chặn được tấn công nhắm vào ứng dụng. Có sẵn các managed rule group để bật nhanh.

- **A (Shield):** sai — Shield chống DDoS khối lượng ở L3/L4, không đọc nội dung request để chặn SQLi/XSS.
- **C (Security Group):** sai — SG chỉ lọc theo IP/port/protocol (L4), không hiểu nội dung HTTP nên không thấy được SQLi.
- **D (Config):** sai — Config theo dõi/đánh giá cấu hình tài nguyên, hoàn toàn không phải firewall traffic.

📌 Nhớ cho đề: "layer 7 / SQL injection / XSS / web application" → WAF.

</details>

---

**Câu 5 (multiple choice).** Công ty lo ngại có **PII / dữ liệu nhạy cảm** vô tình nằm trong các **S3 bucket**. Dịch vụ nào phát hiện?

- A. Amazon Macie
- B. Amazon GuardDuty
- C. Amazon Inspector
- D. AWS Secrets Manager

<details>
<summary>Đáp án</summary>

**A.** Macie dùng machine learning quét S3 để tìm và phân loại dữ liệu nhạy cảm / PII.

Macie là dịch vụ chuyên về *dữ liệu* nằm trong S3: nó tự nhận diện PII (số thẻ, số an sinh, thông tin cá nhân), đánh giá bucket có bị public/chưa mã hóa không, rồi báo cáo. Cụm từ khóa cần khớp là **sensitive data / PII + S3** — thấy cả hai là chọn Macie ngay.

- **B (GuardDuty):** sai — GuardDuty phát hiện *hành vi/mối đe dọa* qua log, không soi nội dung dữ liệu trong bucket.
- **C (Inspector):** sai — Inspector quét *lỗ hổng phần mềm* trên compute, không phân loại dữ liệu.
- **D (Secrets Manager):** sai — Secrets Manager *lưu trữ* secret, không quét phát hiện dữ liệu nhạy cảm có sẵn.

📌 Nhớ cho đề: "PII / sensitive data trong S3" → Macie (data discovery).

</details>

---

**Câu 6 (multiple choice).** Muốn **quét lỗ hổng bảo mật (vulnerability/CVE)** trên EC2, container image trong ECR và Lambda. Dịch vụ nào?

- A. Amazon Macie
- B. Amazon Inspector
- C. Amazon Detective
- D. AWS Shield

<details>
<summary>Đáp án</summary>

**B.** Inspector quét vulnerability (CVE) tự động trên EC2, container image trong ECR và Lambda.

Inspector liên tục rà phần mềm trên các tài nguyên compute, đối chiếu với cơ sở dữ liệu CVE và cấu hình phơi nhiễm mạng, rồi chấm điểm rủi ro để ưu tiên vá. Từ khóa cần khớp là **vulnerability / scan / CVE / patch cần vá** trên compute.

- **A (Macie):** sai — Macie làm việc với *dữ liệu* trong S3, không quét lỗ hổng phần mềm.
- **C (Detective):** sai — Detective *điều tra* sự cố (dựng chuỗi sự kiện), không quét CVE chủ động.
- **D (Shield):** sai — Shield chống DDoS, không liên quan tới lỗ hổng phần mềm.

📌 Nhớ cho đề: "vulnerability / CVE / scan EC2-ECR-Lambda" → Inspector.

</details>

---

**Câu 7 (multiple choice).** Dịch vụ nào phân tích **log (VPC Flow, CloudTrail, DNS)** bằng ML để phát hiện **hành vi bất thường / mối đe dọa**?

- A. Amazon Inspector
- B. AWS Config
- C. Amazon GuardDuty
- D. Amazon Macie

<details>
<summary>Đáp án</summary>

**C.** GuardDuty là threat detection: đọc VPC Flow Logs, CloudTrail và DNS logs, dùng ML để phát hiện hành vi bất thường.

GuardDuty chạy ngầm, không cần cài agent, liên tục phân tích các nguồn log sẵn có để bắt dấu hiệu bị xâm nhập: gọi API lạ, kết nối tới IP độc hại, hành vi khai thác tiền ảo... Nó *phát hiện* chứ không *chặn*. Từ khóa cần khớp: **threat detection / phân tích log / hành vi bất thường**.

- **A (Inspector):** sai — Inspector quét lỗ hổng phần mềm, không phân tích log hành vi.
- **B (Config):** sai — Config theo dõi *thay đổi cấu hình* tài nguyên, không phát hiện mối đe dọa từ log.
- **D (Macie):** sai — Macie phân loại *dữ liệu nhạy cảm trong S3*, không phân tích log mạng/API.

📌 Nhớ cho đề: "threat detection từ log (VPC Flow/CloudTrail/DNS)" → GuardDuty. Phát hiện, không chặn.

</details>

---

**Câu 8 (multiple choice).** Cần lưu mật khẩu database và **tự động xoay vòng (rotate)** nó định kỳ. Dùng gì?

- A. Systems Manager Parameter Store
- B. AWS Secrets Manager
- C. AWS KMS
- D. AWS Artifact

<details>
<summary>Đáp án</summary>

**B.** Secrets Manager lưu secret và **tự động rotate** — điểm khác biệt quyết định nằm ở chữ "rotate".

Secrets Manager được thiết kế riêng cho secret (mật khẩu DB, API key): lưu mã hóa bằng KMS, cấp quyền truy xuất qua IAM, và quan trọng nhất là **xoay vòng tự động** theo lịch, kể cả tích hợp sẵn để đổi mật khẩu RDS. Khi đề nhấn mạnh "tự động rotate" thì chỉ có một đáp án.

- **A (Parameter Store):** sai — lưu được secret (SecureString) nhưng **không có rotation tự động** tích hợp sẵn; nó miễn phí, hợp cho config thường.
- **C (KMS):** sai — KMS quản lý *khóa mã hóa*, không lưu trữ chuỗi secret như mật khẩu.
- **D (Artifact):** sai — Artifact là cổng tải báo cáo compliance, không liên quan tới lưu secret.

📌 Nhớ cho đề: "rotate tự động" → Secrets Manager. Chỉ lưu config/secret đơn giản, không cần rotate → Parameter Store.

</details>

---

**Câu 9 (multiple choice).** Yêu cầu compliance đòi **HSM phần cứng riêng, đơn tenant** do khách toàn quyền kiểm soát. Dịch vụ nào?

- A. AWS KMS
- B. AWS CloudHSM
- C. AWS Secrets Manager
- D. Amazon Cognito

<details>
<summary>Đáp án</summary>

**B.** CloudHSM cấp HSM phần cứng dành riêng (single-tenant), đạt FIPS 140-2 Level 3, khách toàn quyền kiểm soát khóa.

KMS và CloudHSM đều quản lý khóa mã hóa nhưng khác mô hình: **KMS** là multi-tenant, khóa do AWS quản lý một phần, tiện và tích hợp sâu — đủ cho hầu hết nhu cầu. **CloudHSM** là thiết bị HSM vật lý đơn tenant chỉ của riêng bạn, dùng khi compliance bắt buộc phải có HSM chuyên dụng và bạn tự nắm toàn bộ. Từ khóa khớp: **dedicated / single-tenant HSM / toàn quyền kiểm soát**.

- **A (KMS):** sai — KMS là software-based, multi-tenant; không đáp ứng yêu cầu HSM phần cứng riêng.
- **C (Secrets Manager):** sai — lưu secret, không phải thiết bị quản lý khóa mã hóa.
- **D (Cognito):** sai — Cognito lo đăng nhập người dùng cuối, hoàn toàn khác mảng key management.

📌 Nhớ cho đề: "dedicated HSM / single-tenant / FIPS Level 3" → CloudHSM. Mặc định, tiện → KMS.

</details>

---

**Câu 10 (multiple choice).** Auditor yêu cầu **báo cáo compliance của AWS (SOC, ISO, PCI DSS)**. Lấy ở đâu?

- A. AWS Config
- B. AWS CloudTrail
- C. AWS Artifact
- D. AWS Audit Manager

<details>
<summary>Đáp án</summary>

**C.** Artifact là cổng self-service để *tải* báo cáo compliance của AWS như SOC, ISO, PCI DSS.

Artifact trả lời câu hỏi "chứng minh hạ tầng AWS *đã được chứng nhận* ra sao" — nó chứa sẵn các báo cáo kiểm toán bên thứ ba và hợp đồng (như BAA). Đây là tài liệu về phần "OF the cloud" mà AWS đã đạt, bạn chỉ tải về đưa auditor. Từ khóa khớp: **tải báo cáo compliance có sẵn (SOC/ISO/PCI)**.

- **A (Config):** sai — Config theo dõi cấu hình tài nguyên *của bạn*, không cung cấp báo cáo chứng nhận của AWS.
- **B (CloudTrail):** sai — CloudTrail ghi lại API call, là bằng chứng hoạt động chứ không phải báo cáo compliance.
- **D (Audit Manager):** sai — Audit Manager giúp *tự thu thập bằng chứng* để lập báo cáo của bạn; còn *tải báo cáo có sẵn của AWS* là Artifact (đáp án sát từ khóa nhất).

📌 Nhớ cho đề: "tải báo cáo SOC/ISO/PCI của AWS" → Artifact.

</details>

---

**Câu 11 (multiple choice).** Muốn biết **ai đã gọi API gì** trên tài khoản AWS (audit trail các hành động). Dùng gì?

- A. AWS CloudTrail
- B. AWS Config
- C. Amazon CloudWatch
- D. AWS Artifact

<details>
<summary>Đáp án</summary>

**A.** CloudTrail ghi lại mọi API call: **ai** (identity) đã làm **gì**, **khi nào**, **từ đâu**.

CloudTrail là sổ nhật ký hành động trên tài khoản — mọi thao tác qua console, CLI, SDK đều sinh ra một event. Dùng để điều tra "ai xóa bucket này", audit truy cập, phát hiện hoạt động bất thường. Cặp dễ lẫn là CloudTrail vs Config: **CloudTrail = ai làm gì (hành động)**, **Config = tài nguyên đang cấu hình ra sao (trạng thái)**.

- **B (Config):** sai — Config ghi *trạng thái và thay đổi cấu hình*, không ghi ai gọi API nào.
- **C (CloudWatch):** sai — CloudWatch là metric/log vận hành (hiệu năng, cảnh báo), không phải audit trail hành động người dùng.
- **D (Artifact):** sai — Artifact chỉ là nơi tải báo cáo compliance.

📌 Nhớ cho đề: "ai gọi API gì / audit trail hành động" → CloudTrail.

</details>

---

**Câu 12 (multiple choice).** Dịch vụ nào theo dõi **thay đổi cấu hình** tài nguyên theo thời gian và đánh giá chúng có **tuân rule compliance** không?

- A. AWS CloudTrail
- B. AWS Config
- C. AWS Security Hub
- D. AWS Shield

<details>
<summary>Đáp án</summary>

**B.** Config ghi lại lịch sử cấu hình của từng tài nguyên và đánh giá chúng theo rule (compliant / non-compliant).

Config trả lời "tài nguyên của tôi *hiện đang* cấu hình thế nào, đã *thay đổi* ra sao theo thời gian, và có *lệch chuẩn* không". Bạn định nghĩa Config Rules (ví dụ: S3 bucket không được public, EBS phải mã hóa) và Config liên tục chấm. Nhớ cặp đối lập: Config = *trạng thái cấu hình*, CloudTrail = *hành động API*.

- **A (CloudTrail):** sai — CloudTrail ghi *ai gọi API gì*, không đánh giá cấu hình có tuân rule hay không.
- **C (Security Hub):** sai — Security Hub *tổng hợp* phát hiện bảo mật từ nhiều dịch vụ (gồm cả Config), không phải nơi trực tiếp theo dõi thay đổi cấu hình từng tài nguyên.
- **D (Shield):** sai — Shield chống DDoS, không liên quan tới cấu hình tài nguyên.

📌 Nhớ cho đề: "thay đổi cấu hình + compliance rule" → Config.

</details>

---

**Câu 13 (multiple choice).** Ứng dụng mobile cần cho **người dùng cuối đăng nhập** (sign-up, sign-in, social login). Dịch vụ nào?

- A. AWS IAM
- B. Amazon Cognito
- C. AWS Directory Service
- D. AWS Secrets Manager

<details>
<summary>Đáp án</summary>

**B.** Cognito quản lý đăng nhập cho **người dùng cuối của ứng dụng** — sign-up, sign-in, và social login (Google, Facebook...).

Phân biệt mấu chốt: IAM dành cho người/dịch vụ **vận hành chính tài khoản AWS** (dev, admin, service role), còn Cognito dành cho **khách hàng dùng app của bạn**. Cognito cung cấp User Pools (kho người dùng app) và Identity Pools (cấp credential AWS tạm cho app). Thấy "end-user / mobile app / sign-up / social login" là chọn Cognito.

- **A (IAM):** sai — IAM quản lý danh tính *trong* tài khoản AWS, không phải end-user của ứng dụng.
- **C (Directory Service):** sai — Directory Service là Active Directory quản lý trên AWS (nhân viên/máy doanh nghiệp), không cho end-user app công cộng.
- **D (Secrets Manager):** sai — lưu secret, không quản lý đăng nhập.

📌 Nhớ cho đề: "end-user app đăng nhập / social login" → Cognito. Người vận hành AWS → IAM.

</details>

---

**Câu 14 (multiple choice).** Cần **chứng chỉ SSL/TLS** cho website, quản lý và gia hạn tự động, miễn phí cho dịch vụ AWS. Dùng gì?

- A. AWS KMS
- B. AWS Certificate Manager (ACM)
- C. AWS CloudHSM
- D. AWS WAF

<details>
<summary>Đáp án</summary>

**B.** ACM cấp, quản lý và **tự động gia hạn** chứng chỉ SSL/TLS, miễn phí khi dùng với dịch vụ AWS (ELB, CloudFront, API Gateway).

ACM xử lý toàn bộ vòng đời chứng chỉ TLS để bật HTTPS — tức là mã hóa **in transit**. Điểm bán hàng chính là tự gia hạn, tránh sự cố website chết vì chứng chỉ hết hạn. Từ khóa khớp: **SSL/TLS certificate / HTTPS / tự gia hạn**.

- **A (KMS):** sai — KMS quản lý *khóa mã hóa dữ liệu* (thường là at rest), không cấp chứng chỉ TLS.
- **C (CloudHSM):** sai — CloudHSM là thiết bị HSM quản lý khóa chuyên dụng, không phải nơi quản lý chứng chỉ công cộng.
- **D (WAF):** sai — WAF lọc nội dung request L7, không liên quan tới cấp chứng chỉ.

📌 Nhớ cho đề: "SSL/TLS certificate / HTTPS / auto-renew" → ACM.

</details>

---

**Câu 15 (multiple choice).** Dịch vụ nào **tổng hợp và chuẩn hóa cảnh báo** từ GuardDuty, Inspector, Macie về một bảng điều khiển chung?

- A. Amazon Detective
- B. AWS Security Hub
- C. AWS Config
- D. Amazon CloudWatch

<details>
<summary>Đáp án</summary>

**B.** Security Hub gom và chuẩn hóa phát hiện bảo mật từ nhiều dịch vụ (GuardDuty, Inspector, Macie...) về một dashboard, kèm chấm điểm compliance.

Security Hub là "bảng điều khiển bảo mật tổng" — thay vì mở từng dịch vụ, bạn có một nơi duy nhất thấy toàn bộ finding ở định dạng chuẩn (AWS Security Finding Format) và điểm tuân chuẩn theo các framework (CIS, PCI...). Từ khóa khớp: **tổng hợp / aggregate / central dashboard**.

- **A (Detective):** sai — Detective để *điều tra sâu* một finding (dựng chuỗi sự kiện tìm root cause), không phải nơi tổng hợp cảnh báo.
- **C (Config):** sai — Config chỉ lo cấu hình tài nguyên, không gom cảnh báo bảo mật từ nhiều dịch vụ.
- **D (CloudWatch):** sai — CloudWatch là giám sát metric/log vận hành, không chuẩn hóa security finding.

📌 Nhớ cho đề: "tổng hợp cảnh báo từ nhiều dịch vụ bảo mật" → Security Hub. Điều tra sâu một vụ → Detective.

</details>

---

**Câu 16 (multiple response — chọn 2).** Những việc nào thuộc trách nhiệm của **khách hàng** ("security IN the cloud")?

- A. Cấu hình phân quyền IAM
- B. Vá hypervisor
- C. Mã hóa dữ liệu của mình (at rest / in transit)
- D. Bảo mật vật lý trung tâm dữ liệu

<details>
<summary>Đáp án</summary>

**A và C.** Phân quyền IAM và mã hóa dữ liệu đều là những thứ khách tự cấu hình → "IN the cloud".

Áp đúng quy tắc: việc nào khách **cấu hình / chọn / nhập** là của khách; việc nào là **hạ tầng vật lý và hypervisor** mà khách không chạm tới là của AWS. IAM (ai được làm gì) và việc bật mã hóa dữ liệu đều do khách quyết định nên thuộc khách, bất kể chạy trên service nào.

- **B (vá hypervisor):** sai — hypervisor nằm dưới ranh giới, luôn là trách nhiệm của AWS.
- **D (bảo mật vật lý datacenter):** sai — an ninh vật lý trung tâm dữ liệu là "OF the cloud", của AWS.

📌 Nhớ cho đề: khách = cấu hình + IAM + dữ liệu + mã hóa. AWS = vật lý + hypervisor.

</details>

---

**Câu 17 (multiple choice).** Với **Amazon RDS (managed)**, ai chịu trách nhiệm **vá hệ điều hành và database engine**?

- A. AWS
- B. Khách hàng
- C. Khách hàng vá OS, AWS vá engine
- D. Không bên nào — tự động không cần vá

<details>
<summary>Đáp án</summary>

**A.** AWS — vì RDS là managed service nên AWS lo vá cả guest OS lẫn database engine.

Đây là điểm cốt lõi: ranh giới Shared Responsibility **dịch theo loại service**. Càng managed, AWS gánh càng nhiều. Với RDS, khách không có quyền SSH vào OS nền nên AWS vá OS + engine (trong cửa sổ bảo trì). Khách vẫn giữ phần "IN the cloud" còn lại: schema/dữ liệu, tài khoản DB và phân quyền, Security Group, và bật mã hóa. Với Lambda (serverless) AWS còn gánh thêm cả runtime — khách chỉ lo code và IAM.

- **B (khách hàng):** sai — đó là trường hợp EC2 (IaaS), nơi khách tự quản OS; RDS thì không.
- **C (chia OS/engine):** sai — Shared Responsibility không chẻ nhỏ một hạng mục kiểu này; cả OS và engine của RDS đều là AWS.
- **D (không cần vá):** sai — vẫn phải vá, chỉ là AWS làm thay trong cửa sổ bảo trì.

📌 Nhớ cho đề: ranh giới dịch theo service — EC2 (khách vá OS) < RDS (AWS vá OS+engine) < Lambda (AWS vá cả runtime).

</details>

---

**Câu 18 (multiple choice).** Sau một sự cố bảo mật, team cần **điều tra sâu, dựng lại chuỗi sự kiện để tìm root cause**. Dịch vụ nào phù hợp nhất?

- A. Amazon GuardDuty
- B. Amazon Detective
- C. Amazon Inspector
- D. AWS Shield

<details>
<summary>Đáp án</summary>

**B.** Detective để điều tra sâu — nó dựng sẵn đồ thị quan hệ từ log để bạn lần ngược chuỗi sự kiện tìm root cause.

Cặp dễ lẫn là GuardDuty vs Detective và ranh giới rất rõ theo động từ: **GuardDuty *phát hiện*** (bắn ra cảnh báo "có bất thường"), còn **Detective *điều tra*** (sau cảnh báo đó, đào xem chuyện gì đã xảy ra, liên đới ra sao, từ đâu). Từ khóa khớp: **investigate / root cause / dựng lại chuỗi sự kiện**.

- **A (GuardDuty):** sai — GuardDuty *phát hiện* mối đe dọa chứ không phải công cụ điều tra sâu sau sự cố.
- **C (Inspector):** sai — Inspector quét lỗ hổng phần mềm, không điều tra sự cố.
- **D (Shield):** sai — Shield chống DDoS, không liên quan tới điều tra forensics.

📌 Nhớ cho đề: *phát hiện* → GuardDuty · *điều tra sâu / root cause* → Detective.

</details>

---

**Câu 19 (multiple choice).** Về **penetration testing** trên AWS, phát biểu nào đúng?

- A. Mọi loại pentest đều bị cấm tuyệt đối
- B. Có thể tự pentest một số dịch vụ (EC2, RDS, Lambda...) trên tài nguyên của mình mà không cần xin phép trước, trong phạm vi chính sách
- C. Phải luôn xin phép AWS trước mọi trường hợp
- D. Chỉ AWS mới được phép pentest hệ thống của khách

<details>
<summary>Đáp án</summary>

**B.** AWS cho phép tự pentest một tập dịch vụ được duyệt (EC2, RDS, Lambda...) trên tài nguyên *của chính bạn*, không cần xin phép trước, miễn tuân chính sách.

Chính sách pentest của AWS liệt kê các service được phép tự kiểm thử mà không cần phê duyệt, nhưng kèm ranh giới: chỉ trên tài nguyên của bạn, không được làm kiểu DDoS/flood. Nếu phát hiện lạm dụng hoặc hoạt động khả nghi (của bạn hoặc nhắm vào bạn) thì báo **AWS Abuse team**.

- **A (cấm tuyệt đối):** sai — AWS cho phép pentest trong khuôn khổ, không cấm hết.
- **C (luôn phải xin phép trước):** sai — với tập service được duyệt thì *không* cần xin phép trước.
- **D (chỉ AWS mới được):** sai — khách được tự pentest tài nguyên của mình trong phạm vi chính sách.

📌 Nhớ cho đề: tự pentest service được duyệt trên tài nguyên của mình — không cần xin phép trước; lạm dụng thì báo AWS Abuse team.

</details>

---

## Related Topics

- [Dịch vụ bảo mật & compliance](../reference/security-components.md)
- [Mục lục AWS](../index.md)
