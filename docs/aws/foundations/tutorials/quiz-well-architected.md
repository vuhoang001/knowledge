---
title: "Câu hỏi: Well-Architected & CAF"
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

**C. 6** là đáp án đúng.

Well-Architected Framework (WAF) là bộ nguyên tắc AWS đúc kết để đánh giá và thiết kế
một workload "tốt" trên cloud, chia thành các trụ cột (pillar). Sáu trụ cột hiện nay là:
Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization
và Sustainability. Nhớ chúng là nhớ được "góc nhìn" để soi mọi kiến trúc.

Vì sao các đáp án còn lại sai:
- **A. 4** và **B. 5**: 5 là con số *ban đầu* của framework; Sustainability được thêm
  vào sau nên hiện là 6, không còn 5. Đây là bẫy dành cho người học tài liệu cũ.
- **D. 7**: không có trụ cột thứ 7; con số này chỉ là nhiễu.

📌 Nhớ cho đề: WAF = **6 pillar**. Nếu câu nào nói "5 trụ cột" thì gần như chắc là bẫy
tài liệu cũ — Sustainability là trụ cột thêm vào sau cùng.

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

**B. Reliability** là đáp án đúng.

Reliability là khả năng workload thực hiện đúng chức năng khi cần và tự phục hồi sau sự
cố. Dấu hiệu nhận diện là các từ khóa: loại bỏ single point of failure, tự phục hồi
(self-healing/recover automatically), chịu được việc mất một AZ, backup/restore, và co
giãn để đáp ứng nhu cầu mà không hỏng.

Vì sao các đáp án còn lại sai:
- **A. Performance Efficiency**: nói về dùng tài nguyên compute *hiệu quả* và giữ hiệu
  quả khi tải thay đổi — không phải về chịu lỗi.
- **C. Cost Optimization**: nói về chỉ trả cho thứ thực sự dùng, không liên quan đến
  phục hồi sau sự cố.
- **D. Security**: bảo vệ dữ liệu và hệ thống bằng kiểm soát truy cập, mã hóa — khác với
  khả năng đứng vững khi hạ tầng hỏng.

📌 Nhớ cho đề: cụm **"không có single point of failure"**, **"tự phục hồi"**, **"chịu
được mất 1 AZ"** → luôn là **Reliability**.

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

**A. Cost Optimization** là đáp án đúng.

Cost Optimization là trụ cột lo chuyện chạy hệ thống với chi phí thấp nhất mà vẫn đạt
yêu cầu. Dấu hiệu nhận diện: chỉ trả cho thứ thực sự dùng (pay for what you use),
right-sizing (chọn đúng cỡ instance, không dư), dùng Reserved Instances / Savings Plans,
và tắt tài nguyên nhàn rỗi.

Vì sao các đáp án còn lại sai:
- **B. Operational Excellence**: tập trung vào vận hành và cải tiến quy trình, không
  trực tiếp nhắm vào hóa đơn.
- **C. Sustainability**: giảm tác động môi trường; right-sizing có thể *gián tiếp* giúp
  bền vững, nhưng từ khóa "giảm hóa đơn / tránh trả tiền dư" rõ ràng là chi phí.
- **D. Performance Efficiency**: nói về tốc độ và dùng tài nguyên hiệu quả, không phải
  mục tiêu cắt giảm chi phí.

📌 Nhớ cho đề: cụm **"pay for what you use"**, **"right-sizing"**, **"giảm hóa đơn"**,
**"Reserved/Savings Plans"** → **Cost Optimization**.

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

**B. Performance Efficiency** là đáp án đúng.

Performance Efficiency là dùng tài nguyên compute một cách hiệu quả để đáp ứng yêu cầu
và *giữ* hiệu quả đó khi nhu cầu thay đổi. Dấu hiệu nhận diện: chọn đúng loại tài nguyên
(instance type, loại storage), dùng kiến trúc serverless, tận dụng CDN (CloudFront) và
caching (ElastiCache) để giảm độ trễ, theo dõi và tinh chỉnh khi tải biến động.

Vì sao các đáp án còn lại sai:
- **A. Reliability**: về chịu lỗi và phục hồi, không phải về *tốc độ* hay độ trễ.
- **C. Cost Optimization**: về chi phí; chọn instance ở đây là để *nhanh/hiệu quả*, chứ
  đề không nói rẻ.
- **D. Operational Excellence**: về quy trình vận hành và cải tiến, không phải về hiệu
  năng kỹ thuật của workload.

📌 Nhớ cho đề: cụm **"CDN/cache/CloudFront"**, **"độ trễ/nhanh"**, **"chọn đúng instance
type để đáp ứng tải"** → **Performance Efficiency**.

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

**B. Sustainability** là đáp án đúng.

Sustainability là trụ cột thứ 6, được AWS thêm vào năm 2021. Nó nhắm tới giảm tác động
môi trường của workload: dùng tài nguyên tiết kiệm, chọn Region/dịch vụ dùng năng lượng
hiệu quả hơn, giảm lượng tài nguyên cần thiết cho cùng một khối lượng công việc, và tối
ưu để cắt lượng carbon footprint.

Vì sao các đáp án còn lại sai:
- **A. Security**, **C. Reliability**, **D. Operational Excellence**: cả ba đều là trụ
  cột *gốc* của framework, không phải trụ cột "mới nhất". Và không trụ cột nào trong số
  này có mục tiêu môi trường.

📌 Nhớ cho đề: **"mới nhất"** + **"môi trường / giảm tác động / carbon"** → luôn là
**Sustainability** (trụ cột thứ 6).

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

**A. Operational Excellence** là đáp án đúng.

Operational Excellence là trụ cột về *vận hành* hệ thống: chạy, giám sát và liên tục cải
tiến các quy trình, thủ tục để tạo ra giá trị kinh doanh. Dấu hiệu nhận diện:
Infrastructure as Code (coi hạ tầng như code), tự động hóa deployment, thực hiện thay
đổi nhỏ và có thể đảo ngược, và học từ sự cố qua post-incident review (lessons learned).

Vì sao các đáp án còn lại sai:
- **B. Reliability**: tuy automation cũng giúp độ tin cậy, nhưng trọng tâm câu này là
  *cải tiến quy trình vận hành và review sau sự cố* — đó là Operational Excellence.
- **C. Performance Efficiency**: về tốc độ/hiệu năng, không phải quy trình.
- **D. Security**: về bảo vệ dữ liệu và kiểm soát truy cập, không liên quan.

📌 Nhớ cho đề: cụm **"IaC"**, **"automate deployment"**, **"post-incident review /
lessons learned"**, **"cải tiến quy trình"** → **Operational Excellence**.

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

**C. Security** là đáp án đúng.

Security là trụ cột bảo vệ dữ liệu, hệ thống và tài sản bằng kiểm soát truy cập và mã
hóa. Dấu hiệu nhận diện: least privilege (cấp quyền tối thiểu) qua IAM, mã hóa dữ liệu ở
trạng thái nghỉ (at rest) và khi truyền (in transit), bật audit log (CloudTrail), áp
dụng bảo mật ở mọi tầng và có kế hoạch ứng phó sự cố bảo mật.

Vì sao các đáp án còn lại sai:
- **A. Reliability**: về chịu lỗi/phục hồi, không phải kiểm soát truy cập hay mã hóa.
- **B. Cost Optimization**: về chi phí, không liên quan.
- **D. Sustainability**: về môi trường, không liên quan.

📌 Nhớ cho đề: cụm **"least privilege / IAM"**, **"encryption at rest & in transit"**,
**"audit log / CloudTrail"** → **Security**.

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

**A, C, D** là đáp án đúng.

Design principle là các nguyên tắc chung xuyên suốt cả framework, giúp tận dụng đặc tính
của cloud thay vì bê nguyên tư duy data center truyền thống lên. Vài nguyên tắc cốt lõi:
đừng đoán capacity, tự động hóa để thử nghiệm và tạo lại kiến trúc dễ dàng, giảm kết nối
chặt giữa các thành phần, và thiết kế có thể co giãn theo nhu cầu thật.

- **A đúng**: không đoán capacity rồi mua dư; để auto scaling tự tăng/giảm theo nhu cầu
  thực tế.
- **C đúng**: tự động hóa giúp giảm lỗi thao tác tay và dễ tạo lại / thử nghiệm kiến
  trúc.
- **D đúng**: loosely coupled để một thành phần hỏng không kéo sập cả hệ thống, và dễ
  thay đổi từng phần độc lập.

Vì sao hai đáp án còn lại sai:
- **B sai**: nguyên tắc cloud là scale **horizontally** (nhiều instance nhỏ thay cho một
  server to) để tránh single point of failure — ngược với scale vertically.
- **E sai**: mua dư capacity "phòng xa" chính là tư duy bị bác bỏ bởi nguyên tắc "stop
  guessing capacity".

📌 Nhớ cho đề: nguyên tắc cloud luôn ưu tiên **scale horizontally**, **automate**,
**loosely coupled**, **đừng đoán/mua dư capacity**. Câu nào nói "scale vertically" hay
"mua dư để phòng xa" là bẫy.

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

**B. AWS Well-Architected Tool** là đáp án đúng.

AWS Well-Architected Tool là công cụ *miễn phí* trong Console: bạn khai báo một workload,
trả lời bộ câu hỏi theo từng trụ cột, rồi công cụ chấm và trả về danh sách rủi ro
(high/medium risk) kèm gợi ý cải thiện. Đây là cách tự review kiến trúc theo 6 trụ cột
mà không cần chuyên gia.

Vì sao các đáp án còn lại sai:
- **A. AWS Trusted Advisor**: cũng đưa khuyến nghị, nhưng theo các hạng mục riêng (cost,
  performance, security, fault tolerance, service limits) chứ không phải khai báo
  workload và trả lời câu hỏi theo trụ cột.
- **C. AWS Config**: ghi lại và đánh giá *cấu hình* tài nguyên so với rule mong muốn
  (compliance), không phải công cụ review theo trụ cột.
- **D. AWS Cloud Adoption Framework**: là một *khung hướng dẫn* cho cả tổ chức, không
  phải công cụ trong Console.

📌 Nhớ cho đề: cụm **"khai báo workload + trả lời câu hỏi theo trụ cột + miễn phí"** →
**Well-Architected Tool**. Đừng nhầm với Trusted Advisor (khuyến nghị theo hạng mục) hay
Config (đánh giá cấu hình tài nguyên).

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

**B. Giúp cả tổ chức lập kế hoạch và chuyển lên cloud** là đáp án đúng.

Cloud Adoption Framework (CAF) là khung giúp *cả tổ chức* lập kế hoạch và thực hiện hành
trình chuyển lên cloud — tập trung vào con người, quy trình và quản trị, chứ không phải
đánh giá kỹ thuật một kiến trúc. Nó nhìn ở tầng chiến lược/tổ chức, chia thành 6
perspective.

Vì sao các đáp án còn lại sai:
- **A. Đánh giá một workload cụ thể theo 6 trụ cột**: đó là mô tả của *Well-Architected
  Framework*, không phải CAF. Đây là bẫy hoán đổi WAF ↔ CAF hay gặp nhất.
- **C. Cấu hình firewall cho web application**: đó là **AWS WAF** (Web Application
  Firewall) — bẫy trùng tên viết tắt với Well-Architected Framework, chẳng liên quan đến
  CAF.
- **D. Giám sát chi phí theo thời gian thực**: đó là nhiệm vụ của Cost Explorer / AWS
  Budgets, không phải CAF.

📌 Nhớ cho đề: CAF = **tổ chức** chuyển lên cloud (6 perspective). WAF = **workload/kiến
trúc** (6 pillar). AWS WAF = **firewall**. Ba thứ dễ lẫn vì viết tắt gần nhau.

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

**B. 6 perspective, 3 business-focused và 3 technical-focused** là đáp án đúng.

CAF tổ chức năng lực (capability) cần thiết để chuyển lên cloud thành 6 perspective, chia
làm 2 nhóm. Nhóm **business-focused**: Business, People, Governance. Nhóm
**technical-focused**: Platform, Security, Operations.

Vì sao các đáp án còn lại sai:
- **A. 5 perspective**: sai số lượng — CAF có 6, không phải 5.
- **C. 6 trụ cột, không chia nhóm**: CAF dùng từ **perspective** chứ không phải "trụ
  cột" (pillar là của WAF), và chúng *có* chia thành 2 nhóm.
- **D. 4 perspective, tất cả technical**: sai cả số lượng lẫn việc "tất cả technical" —
  một nửa là business-focused.

📌 Nhớ cho đề: CAF = **6 perspective = 3 business (Business, People, Governance) + 3
technical (Platform, Security, Operations)**. Dùng từ "perspective", không phải
"pillar".

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

**B. People** là đáp án đúng.

People perspective (nhóm business-focused) là cầu nối giữa công nghệ và kinh doanh, tập
trung vào yếu tố *con người*: kỹ năng và đào tạo (training), văn hóa tổ chức, cơ cấu đội
ngũ, và quản lý thay đổi (change management) để tổ chức sẵn sàng cho cloud.

Vì sao các đáp án còn lại sai:
- **A. Platform**: lo về nền tảng và kiến trúc *hạ tầng* kỹ thuật, không phải con người.
- **C. Operations**: lo về vận hành dịch vụ cloud sao cho đáp ứng kỳ vọng kinh doanh,
  không phải đào tạo/văn hóa.
- **D. Governance**: lo về quản trị, quản lý rủi ro và tuân thủ — gần với tổ chức nhưng
  là về *kiểm soát/quy tắc*, không phải kỹ năng và văn hóa con người.

📌 Nhớ cho đề: cụm **"đào tạo / kỹ năng / văn hóa / cơ cấu đội ngũ / change
management"** → **People**.

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

**A. Business** là đáp án đúng.

Business perspective (nhóm business-focused) đảm bảo khoản đầu tư lên cloud *tạo ra giá
trị kinh doanh*: đo được ROI, khớp với chiến lược và mục tiêu của công ty, và giúp các
bên liên quan về kinh doanh (stakeholder) cập nhật năng lực để đạt mục tiêu đó.

Vì sao các đáp án còn lại sai:
- **B. Platform**: về xây dựng và vận hành nền tảng hạ tầng kỹ thuật, không phải giá trị
  kinh doanh.
- **C. Security**: về bảo vệ dữ liệu và tuân thủ, không phải ROI.
- **D. Operations**: về vận hành dịch vụ cloud hằng ngày, không phải chiến lược kinh
  doanh.

📌 Nhớ cho đề: cụm **"ROI"**, **"giá trị kinh doanh"**, **"khớp chiến lược công ty"** →
**Business**.

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

**C. Platform** là đáp án đúng.

Platform perspective (nhóm technical-focused) lo việc xây dựng một nền tảng cloud có khả
năng mở rộng, cấp doanh nghiệp (enterprise-grade): thiết kế kiến trúc hạ tầng, tạo môi
trường cloud, và hiện đại hóa workload sao cho hạ tầng đáp ứng được nhu cầu kỹ thuật.

Vì sao các đáp án còn lại sai:
- **A. Governance**: về quản trị, quản lý rủi ro, tuân thủ và danh mục đầu tư — không
  phải thiết kế hạ tầng.
- **B. People**: về con người, kỹ năng, văn hóa — không phải kỹ thuật hạ tầng.
- **D. Business**: về giá trị kinh doanh và ROI — không phải nền tảng kỹ thuật.

📌 Nhớ cho đề: cụm **"nền tảng / hạ tầng / kiến trúc kỹ thuật / xây môi trường cloud"** →
**Platform** (một trong 3 perspective technical-focused).

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

**A, C, D** là đáp án đúng.

CAF chia 6 perspective thành 2 nhóm. Nhóm **business-focused** gồm **Business, People,
Governance** — lo về giá trị kinh doanh, con người và quản trị/tuân thủ. Nhóm
**technical-focused** gồm Platform, Security, Operations — lo về hạ tầng, bảo mật kỹ
thuật và vận hành dịch vụ.

- **A. Business đúng**: giá trị kinh doanh, ROI.
- **C. People đúng**: kỹ năng, văn hóa, con người.
- **D. Governance đúng**: quản trị, quản lý rủi ro, tuân thủ.

Vì sao hai đáp án còn lại sai:
- **B. Platform**: thuộc nhóm *technical*-focused, không phải business.
- **E. Operations**: thuộc nhóm *technical*-focused, không phải business.

📌 Nhớ cho đề: business-focused = **Business, People, Governance (BPG)**;
technical-focused = **Platform, Security, Operations (PSO)**. Mẹo: nhóm business thiên về
*người và tổ chức*, nhóm technical thiên về *hệ thống*.

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

**B** là đáp án đúng.

Hai framework giải quyết hai câu hỏi khác nhau. Well-Architected Framework xoay quanh
*một kiến trúc/workload cụ thể* và đánh giá nó theo **6 trụ cột (pillar)**. CAF xoay
quanh việc đưa *cả tổ chức* lên cloud và tổ chức theo **6 perspective** (3 business + 3
technical). Nói gọn: WAF = kiến trúc, CAF = tổ chức.

Vì sao các đáp án còn lại sai:
- **A. Cả hai đều review một workload cụ thể**: chỉ WAF review workload; CAF làm ở tầng
  tổ chức, không review một workload.
- **C. CAF là công cụ tính chi phí; WAF là firewall**: cả hai vế đều sai — CAF không
  phải công cụ chi phí, và "firewall" là AWS WAF (Web Application Firewall), khác hẳn
  Well-Architected Framework dù viết tắt giống.
- **D. Cả hai đều có 6 perspective và không có trụ cột**: sai — WAF dùng **trụ cột**
  (pillar), chỉ CAF mới dùng **perspective**.

📌 Nhớ cho đề: **WAF = workload + 6 pillar; CAF = tổ chức + 6 perspective**. Đáp án nào
gán "perspective" cho WAF hoặc gọi WAF là firewall đều là bẫy.

</details>

---

## Related Topics

- [Well-Architected Framework & Cloud Adoption Framework](../reference/well-architected-framework.md)
- [Tổng quan AWS cho CLF-C02](../index.md)
