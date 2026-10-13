---
title: "Câu hỏi: Networking"
i18n_status: untranslated
sidebar_position: 8
description: "Tự chấm phần VPC, SG vs NACL, Route 53, CloudFront, ELB/ASG."
tags: [aws, clf-c02, quiz, networking]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-13
---

> **Chốt:** Tự trả lời trước khi mở `<details>`. Phần SG vs NACL và "chọn dịch vụ theo tình huống" là thứ hay ra đề nhất — làm tới khi khớp phản xạ.

Ghi rõ loại mỗi câu: **Multiple choice** = chọn 1; **Multiple response** = chọn nhiều (đề nói rõ chọn mấy).

---

**Câu 1 (Multiple choice).** Một công ty muốn các EC2 trong private subnet tải được bản update từ internet nhưng **không** cho internet khởi tạo kết nối vào chúng. Nên dùng gì?

A. Internet Gateway
B. NAT Gateway
C. VPC Peering
D. Transit Gateway

<details>
<summary>Đáp án</summary>

**B. NAT Gateway.** NAT cho private subnet đi **ra** internet một chiều; internet không gọi ngược vào được. Internet Gateway (A) là hai chiều, dùng cho public subnet.

</details>

---

**Câu 2 (Multiple choice).** Phát biểu nào đúng về **Security Group**?

A. Stateless, hoạt động ở mức subnet
B. Stateful, hoạt động ở mức instance, chỉ có rule allow
C. Có cả rule allow và deny, xử lý theo thứ tự số
D. Mặc định cho toàn bộ inbound

<details>
<summary>Đáp án</summary>

**B.** Security Group **stateful**, gắn ở **mức instance**, **chỉ có allow**. Mô tả ở A và C là của Network ACL. Mặc định SG chặn toàn bộ inbound (D sai).

</details>

---

**Câu 3 (Multiple choice).** Thành phần nào trong VPC có thể **deny** (chặn tường minh) một dải IP cụ thể?

A. Security Group
B. Route table
C. Network ACL
D. Internet Gateway

<details>
<summary>Đáp án</summary>

**C. Network ACL.** Chỉ NACL có cả allow và deny. Security Group chỉ có allow nên không chặn tường minh một IP được.

</details>

---

**Câu 4 (Multiple choice).** Ứng dụng phục vụ user khắp thế giới và cần **giảm latency khi tải nội dung tĩnh** (ảnh, video, file JS/CSS). Dịch vụ nào phù hợp nhất?

A. Route 53
B. AWS Global Accelerator
C. Amazon CloudFront
D. Elastic Load Balancing

<details>
<summary>Đáp án</summary>

**C. Amazon CloudFront.** Đây là CDN, cache nội dung tĩnh ở Edge Location gần user để giảm latency. Global Accelerator (B) tối ưu định tuyến nhưng **không cache** nội dung.

</details>

---

**Câu 5 (Multiple choice).** Công ty cần một kết nối **riêng, vật lý, ổn định và nhất quán** từ data center on-prem tới AWS, không đi qua internet. Chọn gì?

A. Site-to-Site VPN
B. AWS Direct Connect
C. VPC Peering
D. Internet Gateway

<details>
<summary>Đáp án</summary>

**B. AWS Direct Connect.** Đường riêng vật lý, băng thông ổn định, không qua internet. Site-to-Site VPN (A) là hầm mã hóa đi qua internet, kém ổn định hơn.

</details>

---

**Câu 6 (Multiple choice).** Dịch vụ nào là **DNS managed** của AWS, dùng để phân giải tên miền và đăng ký domain?

A. Amazon CloudFront
B. AWS Direct Connect
C. Amazon Route 53
D. Elastic Load Balancing

<details>
<summary>Đáp án</summary>

**C. Amazon Route 53.** Dịch vụ DNS managed (số 53 là port của DNS).

</details>

---

**Câu 7 (Multiple choice).** Traffic tới một ứng dụng web tăng vọt lúc cao điểm và giảm sâu lúc đêm. Công ty muốn số EC2 **tự tăng/giảm theo tải**. Dùng gì?

A. Auto Scaling Group
B. Network Load Balancer
C. Amazon CloudFront
D. VPC Endpoint

<details>
<summary>Đáp án</summary>

**A. Auto Scaling Group.** ASG tự động thêm/bớt EC2 theo tải (CPU, số request), giúp đúng chi phí và duy trì khả dụng.

</details>

---

**Câu 8 (Multiple choice).** Cần cân bằng tải cho một web app với **routing theo path và host** (ví dụ `/api` tới nhóm này, `/images` tới nhóm khác). Loại ELB nào phù hợp?

A. Classic Load Balancer
B. Network Load Balancer
C. Application Load Balancer
D. Gateway Load Balancer

<details>
<summary>Đáp án</summary>

**C. Application Load Balancer.** ALB hoạt động ở **layer 7 (HTTP/HTTPS)**, routing theo path/host/header. NLB (B) ở layer 4 không hiểu HTTP path.

</details>

---

**Câu 9 (Multiple choice).** Ứng dụng cần throughput cực cao, latency cực thấp ở **layer 4 (TCP/UDP)** và một **IP tĩnh**. Chọn ELB nào?

A. Application Load Balancer
B. Network Load Balancer
C. Classic Load Balancer
D. Gateway Load Balancer

<details>
<summary>Đáp án</summary>

**B. Network Load Balancer.** NLB ở layer 4, throughput rất cao, latency rất thấp, hỗ trợ IP tĩnh.

</details>

---

**Câu 10 (Multiple choice).** Muốn EC2 trong private subnet truy cập **Amazon S3** mà traffic **không đi ra internet**. Dùng gì?

A. NAT Gateway
B. Internet Gateway
C. VPC Endpoint (PrivateLink)
D. Site-to-Site VPN

<details>
<summary>Đáp án</summary>

**C. VPC Endpoint (PrivateLink).** Cho phép truy cập dịch vụ AWS qua mạng AWS, không ra internet, không cần IGW/NAT. Với S3 dùng Gateway Endpoint.

</details>

---

**Câu 11 (Multiple response — chọn 2).** Hai phát biểu nào đúng về **Network ACL**?

A. Stateful
B. Stateless
C. Hoạt động ở mức subnet
D. Chỉ có rule allow
E. Hoạt động ở mức instance

<details>
<summary>Đáp án</summary>

**B và C.** NACL **stateless** và hoạt động ở **mức subnet**. NACL có cả allow và deny (D sai). Mức instance (E) là của Security Group.

</details>

---

**Câu 12 (Multiple choice).** Một công ty có nhiều VPC và muốn một **hub trung tâm** nối tất cả lại (và cả on-prem) thay cho mạng lưới peering chằng chịt. Dùng gì?

A. VPC Peering
B. Transit Gateway
C. Internet Gateway
D. CloudFront

<details>
<summary>Đáp án</summary>

**B. Transit Gateway.** Mô hình hub-and-spoke, dễ mở rộng. VPC Peering (A) là non-transitive, đấu lưới đầy đủ sẽ phình nhanh khi nhiều VPC.

</details>

---

**Câu 13 (Multiple choice).** Nhận định nào về **CloudFront** và **Global Accelerator** là đúng?

A. Cả hai đều cache nội dung ở Edge
B. CloudFront cache nội dung tĩnh; Global Accelerator định tuyến qua mạng AWS, không cache
C. Global Accelerator là CDN, CloudFront là DNS
D. Cả hai chỉ chạy trong một Region

<details>
<summary>Đáp án</summary>

**B.** CloudFront là CDN (cache ở Edge); Global Accelerator tối ưu định tuyến qua backbone AWS nhưng **không cache** nội dung.

</details>

---

**Câu 14 (Multiple response — chọn 2).** Hai cách nào giúp bảo vệ CloudFront khỏi tấn công?

A. Tích hợp AWS WAF
B. Tích hợp AWS Shield
C. Dùng Route 53 làm firewall
D. Bật NAT Gateway
E. Dùng Classic Load Balancer

<details>
<summary>Đáp án</summary>

**A và B.** CloudFront tích hợp **AWS WAF** (lọc tấn công tầng ứng dụng) và **AWS Shield** (chống DDoS) ngay tại Edge.

</details>

---

**Câu 15 (Multiple choice).** Trong một VPC, điều gì quyết định một subnet là **public** hay **private**?

A. Kích thước dải IP của subnet
B. Route table của subnet có đường ra Internet Gateway hay không
C. Số lượng EC2 trong subnet
D. Loại Security Group gắn vào

<details>
<summary>Đáp án</summary>

**B.** Subnet là public khi route table của nó có đường trỏ về Internet Gateway; nếu không thì là private.

</details>

---

**Câu 16 (Multiple choice).** Một EC2 có Security Group cho phép outbound ra internet. Request đi ra, phản hồi trả về. Vì sao phản hồi được chấp nhận dù không có rule inbound tương ứng?

A. Vì Security Group là stateless
B. Vì Security Group là stateful, tự cho chiều về của kết nối đã được phép đi ra
C. Vì Network ACL mở toàn bộ inbound
D. Vì NAT Gateway tự thêm rule

<details>
<summary>Đáp án</summary>

**B.** Security Group **stateful**: traffic đi ra được phép thì chiều về của chính kết nối đó tự động cho qua, không cần khai báo inbound riêng. (NACL stateless thì mới cần mở cả hai chiều.)

</details>

---

## Related Topics

- [Networking & content delivery](../reference/networking.md)
- [Mục lục AWS](../index.md)
