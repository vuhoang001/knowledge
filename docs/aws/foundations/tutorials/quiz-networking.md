---
title: "Câu hỏi: Networking"
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

**B. NAT Gateway** — cho private subnet đi *ra* internet một chiều, internet không khởi tạo ngược vào được.

NAT (Network Address Translation) Gateway đặt trong public subnet, dịch địa chỉ private thành public khi EC2 gọi ra ngoài (ví dụ tải update, gọi API công khai). Vì kết nối luôn do bên trong khởi tạo, NAT chỉ cho chiều về của *đúng* kết nối đó quay lại — không ai từ internet mở được kết nối mới vào EC2. Đây chính là mẫu "private nhưng vẫn ra được internet".

- **A. Internet Gateway** sai: IGW là hai chiều, gắn resource vào nó thì internet gọi ngược vào được — vi phạm yêu cầu "không cho internet khởi tạo kết nối vào".
- **C. VPC Peering** sai: chỉ nối hai VPC với nhau trong mạng riêng AWS, hoàn toàn không cho ra internet.
- **D. Transit Gateway** sai: là hub nối nhiều VPC và on-prem lại, cũng không phải cổng ra internet.

📌 Nhớ cho đề: "private subnet cần ra internet một chiều" → **NAT Gateway**.

</details>

---

**Câu 2 (Multiple choice).** Phát biểu nào đúng về **Security Group**?

A. Stateless, hoạt động ở mức subnet
B. Stateful, hoạt động ở mức instance, chỉ có rule allow
C. Có cả rule allow và deny, xử lý theo thứ tự số
D. Mặc định cho toàn bộ inbound

<details>
<summary>Đáp án</summary>

**B. Stateful, hoạt động ở mức instance, chỉ có rule allow** — đúng toàn bộ tính chất cốt lõi của Security Group.

Security Group là tường lửa ảo gắn vào ENI/instance. **Stateful** nghĩa là nó nhớ kết nối: cho chiều đi thì tự cho chiều về. **Chỉ allow** nghĩa là không có cách khai báo "chặn tường minh" một IP — những gì không được allow thì mặc định bị từ chối. Mặc định SG mới chặn mọi inbound và cho mọi outbound.

- **A** sai: stateless + mức subnet là của Network ACL, không phải SG.
- **C** sai: có cả allow/deny và xử lý theo thứ tự số (rule number) cũng là NACL.
- **D** sai: SG mặc định **chặn** toàn bộ inbound, không phải cho qua.

📌 Nhớ cho đề: Security Group = **stateful · mức instance · chỉ allow**. Ngược hoàn toàn với NACL.

</details>

---

**Câu 3 (Multiple choice).** Thành phần nào trong VPC có thể **deny** (chặn tường minh) một dải IP cụ thể?

A. Security Group
B. Route table
C. Network ACL
D. Internet Gateway

<details>
<summary>Đáp án</summary>

**C. Network ACL** — chỉ NACL có rule **deny** để chặn tường minh một IP/dải IP.

NACL là tường lửa ở mức subnet, có cả rule allow và deny, duyệt theo thứ tự số rule (số nhỏ xét trước, gặp rule khớp đầu tiên là dừng). Vì có deny nên đây là nơi duy nhất trong VPC chặn được một địa chỉ cụ thể, ví dụ block một IP đang tấn công.

- **A. Security Group** sai: chỉ có allow, không thể deny tường minh — muốn "chặn" chỉ có cách không allow.
- **B. Route table** sai: quyết định traffic đi đâu (định tuyến), không phải lọc cho/chặn.
- **D. Internet Gateway** sai: là cổng ra/vào internet, không có chức năng lọc theo IP.

📌 Nhớ cho đề: cần **block/deny một IP** → **Network ACL** (SG không deny được).

</details>

---

**Câu 4 (Multiple choice).** Ứng dụng phục vụ user khắp thế giới và cần **giảm latency khi tải nội dung tĩnh** (ảnh, video, file JS/CSS). Dịch vụ nào phù hợp nhất?

A. Route 53
B. AWS Global Accelerator
C. Amazon CloudFront
D. Elastic Load Balancing

<details>
<summary>Đáp án</summary>

**C. Amazon CloudFront** — CDN cache nội dung tĩnh ở Edge Location gần user.

CloudFront là Content Delivery Network: nó copy (cache) nội dung tĩnh ra hàng trăm Edge Location toàn cầu, nên user lấy file từ điểm gần mình thay vì gọi về origin ở một Region xa. Đó chính là cách giảm latency cho ảnh/video/JS/CSS.

- **A. Route 53** sai: là DNS, chỉ phân giải tên miền thành IP — không chứa/tăng tốc nội dung.
- **B. Global Accelerator** sai: tối ưu *đường đi* của traffic qua backbone AWS nhưng **không cache** nội dung; hợp với app động/non-HTTP hơn là phát file tĩnh.
- **D. Elastic Load Balancing** sai: phân phối traffic giữa các target trong một Region, không phải mạng phân phối nội dung toàn cầu.

📌 Nhớ cho đề: "static content + giảm latency toàn cầu" → **CloudFront** (CDN, cache ở Edge).

</details>

---

**Câu 5 (Multiple choice).** Công ty cần một kết nối **riêng, vật lý, ổn định và nhất quán** từ data center on-prem tới AWS, không đi qua internet. Chọn gì?

A. Site-to-Site VPN
B. AWS Direct Connect
C. VPC Peering
D. Internet Gateway

<details>
<summary>Đáp án</summary>

**B. AWS Direct Connect** — đường cáp riêng vật lý tới AWS, không qua internet.

Direct Connect là liên kết mạng chuyên dụng giữa data center on-prem và AWS, băng thông nhất quán và latency ổn định vì không chia sẻ với internet công cộng. Dùng khi cần throughput lớn, ổn định, hoặc tránh internet vì lý do tuân thủ/bảo mật.

- **A. Site-to-Site VPN** sai: là hầm mã hóa (IPsec) chạy *trên* internet — thiết lập nhanh, rẻ, nhưng độ ổn định/latency phụ thuộc internet công cộng.
- **C. VPC Peering** sai: nối hai VPC trong AWS với nhau, không liên quan đến kết nối on-prem.
- **D. Internet Gateway** sai: chỉ là cổng ra/vào internet của VPC, không phải kết nối riêng tới on-prem.

📌 Nhớ cho đề: "riêng · vật lý · không qua internet" → **Direct Connect**. "Hầm mã hóa qua internet" → **VPN**.

</details>

---

**Câu 6 (Multiple choice).** Dịch vụ nào là **DNS managed** của AWS, dùng để phân giải tên miền và đăng ký domain?

A. Amazon CloudFront
B. AWS Direct Connect
C. Amazon Route 53
D. Elastic Load Balancing

<details>
<summary>Đáp án</summary>

**C. Amazon Route 53** — dịch vụ DNS managed của AWS (số 53 chính là port của DNS).

Route 53 phân giải tên miền thành IP, cho đăng ký/mua domain, và có các routing policy (latency, weighted, failover, geolocation) cùng health check để điều hướng user tới endpoint khỏe mạnh/gần nhất.

- **A. CloudFront** sai: là CDN phân phối nội dung, không phải DNS.
- **B. Direct Connect** sai: là kết nối mạng riêng tới on-prem.
- **D. Elastic Load Balancing** sai: phân phối traffic giữa các target, không phân giải tên miền.

📌 Nhớ cho đề: DNS managed + đăng ký domain của AWS → **Route 53**.

</details>

---

**Câu 7 (Multiple choice).** Traffic tới một ứng dụng web tăng vọt lúc cao điểm và giảm sâu lúc đêm. Công ty muốn số EC2 **tự tăng/giảm theo tải**. Dùng gì?

A. Auto Scaling Group
B. Network Load Balancer
C. Amazon CloudFront
D. VPC Endpoint

<details>
<summary>Đáp án</summary>

**A. Auto Scaling Group** — tự động thêm/bớt EC2 theo tải.

ASG duy trì số lượng EC2 trong khoảng min/max, dựa trên metric (CPU, số request...) để scale out khi tải tăng và scale in khi tải giảm. Nhờ đó app vừa đủ khả dụng lúc cao điểm vừa không trả tiền cho máy thừa lúc đêm — đúng tinh thần elasticity.

- **B. Network Load Balancer** sai: *phân phối* traffic tới các EC2 có sẵn, nhưng không tự tạo/xóa EC2. ELB thường đi *kèm* ASG chứ không thay thế.
- **C. CloudFront** sai: là CDN cache nội dung ở Edge, không điều chỉnh số lượng EC2.
- **D. VPC Endpoint** sai: cho phép vào dịch vụ AWS qua mạng riêng, không liên quan tới scaling.

📌 Nhớ cho đề: "tự tăng/giảm số EC2 theo tải" → **Auto Scaling Group**.

</details>

---

**Câu 8 (Multiple choice).** Cần cân bằng tải cho một web app với **routing theo path và host** (ví dụ `/api` tới nhóm này, `/images` tới nhóm khác). Loại ELB nào phù hợp?

A. Classic Load Balancer
B. Network Load Balancer
C. Application Load Balancer
D. Gateway Load Balancer

<details>
<summary>Đáp án</summary>

**C. Application Load Balancer** — ELB layer 7, hiểu HTTP nên routing được theo path/host/header.

ALB hoạt động ở **layer 7 (HTTP/HTTPS)**, nên nó đọc được nội dung request: path (`/api`, `/images`), host header, query, cookie... và dùng listener rule để chuyển từng loại request tới target group phù hợp. Đây là lựa chọn mặc định cho web app hiện đại/microservice.

- **A. Classic Load Balancer** sai: thế hệ cũ, không có content-based routing theo path/host.
- **B. Network Load Balancer** sai: ở layer 4 (TCP/UDP), chỉ thấy IP/port, không đọc được HTTP path nên không routing theo path/host được.
- **D. Gateway Load Balancer** sai: dùng để đưa traffic qua các virtual appliance (firewall, IDS/IPS), không phải cân bằng tải web theo path.

📌 Nhớ cho đề: "routing theo path/host/header" → **ALB (layer 7)**.

</details>

---

**Câu 9 (Multiple choice).** Ứng dụng cần throughput cực cao, latency cực thấp ở **layer 4 (TCP/UDP)** và một **IP tĩnh**. Chọn ELB nào?

A. Application Load Balancer
B. Network Load Balancer
C. Classic Load Balancer
D. Gateway Load Balancer

<details>
<summary>Đáp án</summary>

**B. Network Load Balancer** — ELB layer 4, throughput rất cao, latency rất thấp, hỗ trợ IP tĩnh.

NLB hoạt động ở **layer 4 (TCP/UDP)**, không bóc tách HTTP nên overhead thấp, chịu được hàng triệu request/giây với độ trễ cực thấp. Nó cấp **IP tĩnh** cho mỗi AZ (và cho gán Elastic IP) — hợp với trường hợp client cần whitelist một IP cố định hoặc traffic không phải HTTP.

- **A. Application Load Balancer** sai: ở layer 7, mạnh về routing HTTP nhưng overhead cao hơn và **không** cấp IP tĩnh mặc định.
- **C. Classic Load Balancer** sai: thế hệ cũ, hiệu năng/tính năng thua NLB, không phải lựa chọn cho layer 4 hiệu năng cao.
- **D. Gateway Load Balancer** sai: chuyên đưa traffic qua virtual appliance an ninh, không phải LB layer 4 tổng quát.

📌 Nhớ cho đề: "layer 4 · throughput cao · latency thấp · IP tĩnh" → **NLB**.

</details>

---

**Câu 10 (Multiple choice).** Muốn EC2 trong private subnet truy cập **Amazon S3** mà traffic **không đi ra internet**. Dùng gì?

A. NAT Gateway
B. Internet Gateway
C. VPC Endpoint (PrivateLink)
D. Site-to-Site VPN

<details>
<summary>Đáp án</summary>

**C. VPC Endpoint (PrivateLink)** — vào dịch vụ AWS qua mạng nội bộ AWS, không ra internet.

VPC Endpoint cho phép EC2 trong private subnet gọi dịch vụ AWS (S3, DynamoDB, nhiều service khác) qua đường mạng riêng của AWS, không cần IGW hay NAT và traffic không hề ra internet công cộng. Riêng S3 và DynamoDB dùng **Gateway Endpoint**; các dịch vụ khác dùng **Interface Endpoint** (chính là PrivateLink).

- **A. NAT Gateway** sai: vẫn *đi ra internet* (một chiều) để tới S3 — vi phạm yêu cầu "không ra internet", và tốn phí NAT.
- **B. Internet Gateway** sai: đẩy traffic ra internet, lại còn phơi subnet ra hai chiều.
- **D. Site-to-Site VPN** sai: là hầm nối on-prem với AWS, không liên quan tới gọi S3 từ trong VPC.

📌 Nhớ cho đề: "EC2 private gọi S3 mà không ra internet" → **VPC Endpoint** (S3 = Gateway Endpoint).

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

**B và C** — Network ACL là **stateless** và hoạt động ở **mức subnet**.

NACL lọc traffic ra/vào ở ranh giới subnet. **Stateless** nghĩa là nó không nhớ kết nối: cho chiều đi thì vẫn phải khai báo riêng rule cho chiều về, nếu không phản hồi sẽ bị chặn. NACL duyệt rule theo thứ tự số và có cả allow lẫn deny.

- **A. Stateful** sai: đó là Security Group; NACL stateless.
- **D. Chỉ có rule allow** sai: NACL có cả allow và deny (chỉ-allow là đặc điểm của SG).
- **E. Mức instance** sai: NACL ở mức subnet; mức instance là Security Group.

📌 Nhớ cho đề: NACL = **stateless · mức subnet · có allow+deny**. SG = stateful · mức instance · chỉ allow.

</details>

---

**Câu 12 (Multiple choice).** Một công ty có nhiều VPC và muốn một **hub trung tâm** nối tất cả lại (và cả on-prem) thay cho mạng lưới peering chằng chịt. Dùng gì?

A. VPC Peering
B. Transit Gateway
C. Internet Gateway
D. CloudFront

<details>
<summary>Đáp án</summary>

**B. Transit Gateway** — hub trung tâm (hub-and-spoke) nối nhiều VPC và on-prem.

Transit Gateway là một "router" trung tâm: mỗi VPC và kết nối on-prem chỉ cần gắn vào nó một lần, thay vì phải peering từng cặp. Mô hình này dễ mở rộng và dễ quản lý khi số VPC tăng.

- **A. VPC Peering** sai: là kết nối 1-1 và **non-transitive** (A↔B, A↔C không tự cho B↔C), nên nhiều VPC sẽ phình thành lưới đầy đủ (full mesh) chằng chịt — đúng thứ câu hỏi muốn tránh.
- **C. Internet Gateway** sai: là cổng internet, không nối các VPC với nhau.
- **D. CloudFront** sai: là CDN, không liên quan đến kết nối giữa VPC.

📌 Nhớ cho đề: "hub nối nhiều VPC + on-prem, tránh full-mesh peering" → **Transit Gateway**.

</details>

---

**Câu 13 (Multiple choice).** Nhận định nào về **CloudFront** và **Global Accelerator** là đúng?

A. Cả hai đều cache nội dung ở Edge
B. CloudFront cache nội dung tĩnh; Global Accelerator định tuyến qua mạng AWS, không cache
C. Global Accelerator là CDN, CloudFront là DNS
D. Cả hai chỉ chạy trong một Region

<details>
<summary>Đáp án</summary>

**B. CloudFront cache nội dung tĩnh; Global Accelerator định tuyến qua mạng AWS, không cache** — đúng khác biệt cốt lõi.

Cả hai đều dùng Edge Location toàn cầu nhưng khác mục đích. **CloudFront** là CDN: *cache* nội dung (nhất là static) gần user để giảm latency và tải origin. **Global Accelerator** không cache gì — nó đưa traffic vào backbone AWS sớm nhất có thể và tối ưu *đường đi* tới endpoint, hợp với app động/non-HTTP, cấp 2 IP tĩnh anycast.

- **A** sai: Global Accelerator không cache nội dung.
- **C** sai: ngược vai — CloudFront là CDN, Global Accelerator không phải DNS (DNS là Route 53).
- **D** sai: cả hai đều là dịch vụ toàn cầu (global), không bó trong một Region.

📌 Nhớ cho đề: **CloudFront = cache (CDN)**; **Global Accelerator = tối ưu định tuyến, không cache**.

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

**A và B** — CloudFront tích hợp **AWS WAF** và **AWS Shield** ngay tại Edge.

**AWS WAF** lọc tấn công tầng ứng dụng (layer 7): SQL injection, XSS, bad bot, rate-based rule... **AWS Shield** chống DDoS (Shield Standard tự động, Shield Advanced trả phí có bảo vệ sâu hơn). Đặt ở Edge nghĩa là traffic xấu bị chặn trước khi tới origin.

- **C. Route 53 làm firewall** sai: Route 53 là DNS, không phải firewall lọc tấn công web.
- **D. NAT Gateway** sai: chỉ để private subnet ra internet một chiều, không bảo vệ gì cho CloudFront.
- **E. Classic Load Balancer** sai: là LB thế hệ cũ, không phải lớp phòng thủ tấn công.

📌 Nhớ cho đề: bảo vệ CloudFront/edge → **WAF** (layer 7) + **Shield** (DDoS).

</details>

---

**Câu 15 (Multiple choice).** Trong một VPC, điều gì quyết định một subnet là **public** hay **private**?

A. Kích thước dải IP của subnet
B. Route table của subnet có đường ra Internet Gateway hay không
C. Số lượng EC2 trong subnet
D. Loại Security Group gắn vào

<details>
<summary>Đáp án</summary>

**B. Route table của subnet có đường ra Internet Gateway hay không** — đó là điều kiện duy nhất.

Public/private không phải một thuộc tính bật/tắt của subnet mà do **route table** quyết định: nếu route table của subnet có một route (thường `0.0.0.0/0`) trỏ về Internet Gateway thì subnet đó là public; không có thì là private. (Instance còn cần public IP để thực sự ra/vào internet.)

- **A. Kích thước dải IP** sai: dải lớn hay nhỏ không liên quan tới public/private.
- **C. Số lượng EC2** sai: không ảnh hưởng gì đến tính chất định tuyến.
- **D. Loại Security Group** sai: SG lọc traffic ở mức instance, không quyết định subnet là public hay private.

📌 Nhớ cho đề: public subnet = **route table có đường tới Internet Gateway**.

</details>

---

**Câu 16 (Multiple choice).** Một EC2 có Security Group cho phép outbound ra internet. Request đi ra, phản hồi trả về. Vì sao phản hồi được chấp nhận dù không có rule inbound tương ứng?

A. Vì Security Group là stateless
B. Vì Security Group là stateful, tự cho chiều về của kết nối đã được phép đi ra
C. Vì Network ACL mở toàn bộ inbound
D. Vì NAT Gateway tự thêm rule

<details>
<summary>Đáp án</summary>

**B. Vì Security Group là stateful, tự cho chiều về của kết nối đã được phép đi ra.**

**Stateful** nghĩa là SG theo dõi trạng thái kết nối: khi một request đi ra được outbound rule cho phép, SG tự động cho phép traffic trả về của *chính kết nối đó* quay vào, không cần bạn khai báo inbound rule riêng. Đây là khác biệt lớn nhất với NACL.

- **A. Stateless** sai: nếu SG stateless thì mới phải khai báo cả hai chiều — nhưng SG stateful nên không phải.
- **C. Network ACL mở toàn bộ inbound** sai: câu hỏi nói về SG; và NACL (stateless) mới là thứ cần mở cả hai chiều, không phải lý do ở đây.
- **D. NAT Gateway tự thêm rule** sai: NAT dịch địa chỉ, không hề chỉnh sửa rule của Security Group.

📌 Nhớ cho đề: SG cho phản hồi quay về tự động vì **stateful**; NACL stateless phải mở cả chiều về (thường là dải ephemeral port).

</details>

---

## Related Topics

- [Networking & content delivery](../reference/networking.md)
- [Mục lục AWS](../index.md)
