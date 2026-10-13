---
title: "Câu hỏi: Well-Architected & CAF"
i18n_status: untranslated
sidebar_position: 2
description: "Tự chấm 6 trụ cột Well-Architected và 6 perspective của CAF."
tags: [aws, clf-c02, quiz, well-architected]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
---

> **Chốt:** Tự trả lời trước khi mở đáp án — câu hỏi map đặc điểm sang trụ cột WAF hoặc perspective CAF là dạng ra đề phổ biến nhất.

Loại câu được ghi rõ ở đầu mỗi câu: **(Multiple choice)** = chọn 1, **(Multiple
response)** = chọn nhiều (đề nói rõ chọn mấy).

---

### Câu 1 (Multiple choice)

Well-Architected Framework hiện có bao nhiêu trụ cột (pillar)?

- A. 4
- B. 5
- C. 6
- D. 7

<details>
<summary>Đáp án</summary>

**C. 6** — Operational Excellence, Security, Reliability, Performance Efficiency, Cost
Optimization và Sustainability. Ban đầu là 5, Sustainability thêm vào sau.

</details>

---

### Câu 2 (Multiple choice)

Một kiến trúc được thiết kế **không có single point of failure** và tự phục hồi sau khi
một AZ gặp sự cố. Đặc điểm này thuộc trụ cột nào?

- A. Performance Efficiency
- B. Reliability
- C. Cost Optimization
- D. Security

<details>
<summary>Đáp án</summary>

**B. Reliability** — khả năng phục hồi sau sự cố và loại bỏ single point of failure là
đặc trưng của Reliability.

</details>

---

### Câu 3 (Multiple choice)

Công ty muốn **tránh trả tiền cho tài nguyên không dùng** và right-sizing các instance
để giảm hóa đơn. Nhu cầu này khớp trụ cột nào?

- A. Cost Optimization
- B. Operational Excellence
- C. Sustainability
- D. Performance Efficiency

<details>
<summary>Đáp án</summary>

**A. Cost Optimization** — chỉ trả cho thứ thực sự dùng, right-sizing, Reserved
Instances/Savings Plans đều thuộc đây.

</details>

---

### Câu 4 (Multiple choice)

Việc **chọn đúng instance type và dùng CDN/cache để giữ độ nhanh khi tải thay đổi**
thuộc trụ cột nào?

- A. Reliability
- B. Performance Efficiency
- C. Cost Optimization
- D. Operational Excellence

<details>
<summary>Đáp án</summary>

**B. Performance Efficiency** — dùng tài nguyên compute hiệu quả và giữ hiệu quả đó khi
nhu cầu thay đổi.

</details>

---

### Câu 5 (Multiple choice)

Trụ cột **mới nhất** được thêm vào Well-Architected Framework, tập trung giảm tác động
môi trường, là trụ cột nào?

- A. Security
- B. Sustainability
- C. Reliability
- D. Operational Excellence

<details>
<summary>Đáp án</summary>

**B. Sustainability** — trụ cột thứ 6, thêm vào năm 2021, nhắm tới giảm tác động môi
trường và dùng tài nguyên tiết kiệm hơn.

</details>

---

### Câu 6 (Multiple choice)

Team dùng **Infrastructure as Code, automate deployment và chạy post-incident review**
để liên tục cải tiến quy trình vận hành. Đây là trụ cột nào?

- A. Operational Excellence
- B. Reliability
- C. Performance Efficiency
- D. Security

<details>
<summary>Đáp án</summary>

**A. Operational Excellence** — vận hành, giám sát và liên tục cải tiến quy trình/thủ
tục; automation và review sau sự cố là dấu hiệu rõ.

</details>

---

### Câu 7 (Multiple choice)

**Least privilege với IAM, mã hóa dữ liệu lúc nghỉ và lúc truyền, bật audit log** là các
best practice của trụ cột nào?

- A. Reliability
- B. Cost Optimization
- C. Security
- D. Sustainability

<details>
<summary>Đáp án</summary>

**C. Security** — bảo vệ dữ liệu, hệ thống, tài sản bằng kiểm soát truy cập và mã hóa.

</details>

---

### Câu 8 (Multiple response — chọn 3)

Đâu là các **design principle** của Well-Architected Framework? (Chọn 3)

- A. Stop guessing capacity
- B. Scale vertically thay vì horizontally
- C. Automate để dễ tạo lại kiến trúc
- D. Giữ các thành phần loosely coupled
- E. Mua dư capacity để phòng xa

<details>
<summary>Đáp án</summary>

**A, C, D.**
- A đúng: không đoán capacity rồi mua dư, để auto scaling lo.
- C đúng: tự động hóa giảm lỗi thao tác tay.
- D đúng: loosely coupled giúp một phần hỏng không kéo sập cả hệ thống.
- B sai: nguyên tắc là scale **horizontally** (nhiều instance nhỏ), không phải vertically.
- E sai: ngược hẳn với "stop guessing capacity".

</details>

---

### Câu 9 (Multiple choice)

Công cụ **miễn phí** trong Console cho phép khai báo workload, trả lời câu hỏi theo từng
trụ cột rồi nhận danh sách rủi ro và gợi ý cải thiện, tên là gì?

- A. AWS Trusted Advisor
- B. AWS Well-Architected Tool
- C. AWS Config
- D. AWS Cloud Adoption Framework

<details>
<summary>Đáp án</summary>

**B. AWS Well-Architected Tool** — công cụ miễn phí để tự review kiến trúc theo 6 trụ
cột. (Trusted Advisor cũng cho khuyến nghị nhưng theo các hạng mục khác, không phải công
cụ khai báo workload theo trụ cột.)

</details>

---

### Câu 10 (Multiple choice)

Cloud Adoption Framework (CAF) được dùng cho mục đích gì?

- A. Đánh giá một workload cụ thể theo 6 trụ cột
- B. Giúp cả tổ chức lập kế hoạch và chuyển lên cloud
- C. Cấu hình firewall cho web application
- D. Giám sát chi phí theo thời gian thực

<details>
<summary>Đáp án</summary>

**B** — CAF là khung giúp **tổ chức** chuyển lên cloud (con người, quy trình, quản trị),
không phải để review một kiến trúc cụ thể (đó là Well-Architected Framework). Đáp án C là
AWS WAF (web application firewall) — bẫy trùng tên viết tắt.

</details>

---

### Câu 11 (Multiple choice)

CAF có bao nhiêu perspective, và chúng được chia thành những nhóm nào?

- A. 5 perspective, chia business và technical
- B. 6 perspective, 3 business-focused và 3 technical-focused
- C. 6 trụ cột, không chia nhóm
- D. 4 perspective, tất cả technical

<details>
<summary>Đáp án</summary>

**B. 6 perspective** — 3 business-focused (Business, People, Governance) và 3
technical-focused (Platform, Security, Operations).

</details>

---

### Câu 12 (Multiple choice)

Tổ chức cần **đào tạo lại nhân viên, thay đổi văn hóa và cơ cấu đội ngũ** để sẵn sàng cho
cloud. Nhu cầu này thuộc perspective CAF nào?

- A. Platform
- B. People
- C. Operations
- D. Governance

<details>
<summary>Đáp án</summary>

**B. People** — tập trung vào kỹ năng, đào tạo, văn hóa và quản lý thay đổi về con người.

</details>

---

### Câu 13 (Multiple choice)

Lãnh đạo muốn chắc rằng khoản đầu tư lên cloud **mang lại ROI và khớp với chiến lược kinh
doanh**. Đây là perspective nào của CAF?

- A. Business
- B. Platform
- C. Security
- D. Operations

<details>
<summary>Đáp án</summary>

**A. Business** — giá trị kinh doanh, ROI, khớp mục tiêu công ty; thuộc nhóm
business-focused.

</details>

---

### Câu 14 (Multiple choice)

Việc **xây dựng và vận hành nền tảng hạ tầng cloud, thiết kế kiến trúc hạ tầng** thuộc
perspective nào của CAF?

- A. Governance
- B. People
- C. Platform
- D. Business

<details>
<summary>Đáp án</summary>

**C. Platform** — một trong 3 perspective technical-focused, lo về nền tảng và kiến trúc
hạ tầng.

</details>

---

### Câu 15 (Multiple response — chọn 3)

Những perspective nào của CAF thuộc nhóm **business-focused**? (Chọn 3)

- A. Business
- B. Platform
- C. People
- D. Governance
- E. Operations

<details>
<summary>Đáp án</summary>

**A, C, D** — Business, People, Governance là nhóm business-focused. Platform, Security,
Operations là nhóm technical-focused.

</details>

---

### Câu 16 (Multiple choice)

Câu nào mô tả **đúng** sự khác nhau giữa Well-Architected Framework và Cloud Adoption
Framework?

- A. Cả hai đều dùng để review một workload cụ thể
- B. Well-Architected Framework đánh giá một kiến trúc theo 6 trụ cột; CAF giúp tổ chức chuyển lên cloud theo 6 perspective
- C. CAF là công cụ tính chi phí; Well-Architected Framework là firewall
- D. Cả hai đều có 6 perspective và không có trụ cột

<details>
<summary>Đáp án</summary>

**B** — Well-Architected Framework xoay quanh *kiến trúc/workload* (6 trụ cột); CAF xoay
quanh việc chuyển *tổ chức* lên cloud (6 perspective, 3 business + 3 technical).

</details>

---

## Related Topics

- [Well-Architected Framework & Cloud Adoption Framework](../reference/well-architected-framework.md)
- [Tổng quan AWS cho CLF-C02](../index.md)
