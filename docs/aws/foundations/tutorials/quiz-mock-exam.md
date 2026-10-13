---
title: "Đề tổng hợp 65 câu — mô phỏng CLF-C02"
sidebar_position: 13
description: "65 câu trộn 4 domain theo đúng tỷ trọng đề thật, có đáp án và giải thích cuối bài."
tags: [aws, clf-c02, quiz, mock-exam]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-13
---

# Đề tổng hợp 65 câu — mô phỏng CLF-C02

Làm đề trong **90 phút**, tự chấm sau khi xong. Điểm đỗ tương đương **70%** số câu
đúng. **Đừng mở phần đáp án cho tới khi làm hết 65 câu** — tự đoán xong mới soi, như vậy
mới biết chỗ yếu thật.

:::warning Đây là đề TỰ SOẠN để luyện, không phải câu thi thật
Đề này mô phỏng cấu trúc và phong cách CLF-C02 nhưng do mình tự viết, **không phải câu
hỏi thi chính thức**. Phân bố domain, mức khó và mọi con số nhắc tới đều là **ước lượng,
chưa kiểm chứng**. Dùng để làm quen dạng câu và rà khái niệm, không dùng để dự đoán điểm
thi thật.
:::

Phân bố: ~15 câu Cloud Concepts · ~20 câu Security & Compliance · ~22 câu Technology &
Services · ~8 câu Billing/Pricing/Support. Đa số là **multiple choice** (1 đúng); các
câu **multiple response** được ghi rõ "Chọn 2"/"Chọn 3".

---

**Câu 1 — (Multiple choice)**
Một startup muốn tránh phải mua trước phần cứng và chỉ trả tiền cho tài nguyên thực sự
dùng. Đây là lợi ích nào của cloud?

- A. Economies of scale
- B. Trade capital expense for variable expense
- C. Global reach trong vài phút
- D. Tăng tính sẵn sàng (availability)

**Câu 2 — (Multiple choice)**
Trong mô hình Shared Responsibility, ai chịu trách nhiệm vá hệ điều hành (OS patching)
của một EC2 instance?

- A. AWS
- B. Khách hàng
- C. AWS cho instance type cũ, khách hàng cho type mới
- D. Bên thứ ba do AWS chỉ định

**Câu 3 — (Multiple choice)**
Dịch vụ nào cung cấp DNS có tính sẵn sàng cao và khả năng định tuyến dựa trên độ trễ
(latency-based routing)?

- A. CloudFront
- B. Route 53
- C. API Gateway
- D. Global Accelerator

**Câu 4 — (Multiple response — Chọn 2)**
Hai dịch vụ nào thuộc nhóm *serverless compute* (không cần quản lý server)?

- A. EC2
- B. AWS Lambda
- C. AWS Fargate
- D. Amazon Lightsail
- E. EC2 Auto Scaling

**Câu 5 — (Multiple choice)**
Công ty cần phân tích chi tiêu lịch sử và dự báo chi phí tương lai theo service. Công cụ
nào phù hợp nhất?

- A. AWS Budgets
- B. AWS Cost Explorer
- C. AWS Pricing Calculator
- D. AWS Cost and Usage Report (CUR) thô

**Câu 6 — (Multiple choice)**
Loại storage class nào của S3 tối ưu chi phí cho dữ liệu truy cập không thường xuyên
nhưng cần truy xuất nhanh khi cần?

- A. S3 Standard
- B. S3 Standard-IA
- C. S3 Glacier Deep Archive
- D. S3 One Zone-IA cho dữ liệu quan trọng duy nhất

**Câu 7 — (Multiple choice)**
Dịch vụ nào bảo vệ ứng dụng web khỏi các khai thác tầng ứng dụng như SQL injection và
cross-site scripting?

- A. AWS Shield Standard
- B. AWS WAF
- C. Amazon GuardDuty
- D. AWS Network Firewall cho cả tầng 3

**Câu 8 — (Multiple choice)**
Pillar nào của AWS Well-Architected Framework tập trung vào khả năng phục hồi và hoạt
động đúng khi có sự cố?

- A. Operational Excellence
- B. Reliability
- C. Performance Efficiency
- D. Cost Optimization

**Câu 9 — (Multiple choice)**
Một ứng dụng cần hàng đợi để tách rời (decouple) producer và consumer, đảm bảo message
không mất khi consumer bận. Dịch vụ nào?

- A. Amazon SNS
- B. Amazon SQS
- C. Amazon Kinesis Data Streams
- D. Amazon MQ chỉ cho giao thức độc quyền

**Câu 10 — (Multiple choice)**
Để truy cập AWS mà KHÔNG lưu long-term credentials trên EC2, cách thực hành tốt nhất là?

- A. Hard-code access key trong code
- B. Gắn IAM role cho EC2 instance
- C. Lưu secret key trong biến môi trường
- D. Dùng tài khoản root cho ứng dụng

**Câu 11 — (Multiple choice)**
Dịch vụ nào dùng machine learning để phát hiện và phân loại dữ liệu nhạy cảm (ví dụ PII)
trong S3?

- A. Amazon Inspector
- B. Amazon Macie
- C. Amazon GuardDuty
- D. AWS Config

**Câu 12 — (Multiple choice)**
Khái niệm "elasticity" trong cloud nghĩa là gì?

- A. Dữ liệu được sao lưu tự động
- B. Tài nguyên tự động co giãn theo nhu cầu
- C. Hệ thống không bao giờ downtime
- D. Giá luôn cố định hàng tháng

**Câu 13 — (Multiple choice)**
Gói AWS Support nào là cấp thấp nhất cung cấp Technical Account Manager (TAM)?

- A. Basic
- B. Developer
- C. Business
- D. Enterprise

**Câu 14 — (Multiple choice)**
Một database cần quan hệ (relational), tương thích MySQL/PostgreSQL với hiệu năng cao và
tự động nhân bản qua nhiều AZ. Dịch vụ phù hợp nhất?

- A. Amazon DynamoDB
- B. Amazon Aurora
- C. Amazon Redshift
- D. Amazon ElastiCache

**Câu 15 — (Multiple response — Chọn 2)**
Hai công cụ nào giúp bạn ước tính chi phí TRƯỚC khi triển khai và theo dõi để không vượt
ngân sách?

- A. AWS Pricing Calculator
- B. AWS Budgets
- C. AWS Trusted Advisor
- D. Amazon CloudWatch Logs
- E. AWS CloudTrail

**Câu 16 — (Multiple choice)**
Sự khác biệt chính giữa Security Group và Network ACL là gì?

- A. Security Group stateless, NACL stateful
- B. Security Group stateful và hoạt động ở instance level; NACL stateless và ở subnet level
- C. Cả hai đều stateful
- D. NACL chỉ cho outbound, Security Group chỉ cho inbound

**Câu 17 — (Multiple choice)**
Dịch vụ nào cho phép chạy container được quản lý mà không cần tự quản lý cụm EC2 bên dưới?

- A. Amazon ECS trên EC2 launch type
- B. AWS Fargate
- C. Amazon EC2
- D. AWS Batch chỉ cho job theo lịch

**Câu 18 — (Multiple choice)**
AWS chịu trách nhiệm cho hạng mục nào sau đây theo Shared Responsibility Model?

- A. Cấu hình Security Group
- B. Mã hóa dữ liệu phía client
- C. Bảo mật vật lý của data center
- D. Quản lý IAM user và policy

**Câu 19 — (Multiple choice)**
Để phân phối nội dung tĩnh và động tới người dùng toàn cầu với độ trễ thấp qua edge
locations, dùng dịch vụ nào?

- A. Amazon S3 Transfer Acceleration
- B. Amazon CloudFront
- C. AWS Direct Connect
- D. Elastic Load Balancing

**Câu 20 — (Multiple choice)**
Mô hình giá EC2 nào cho mức chiết khấu cao nhất nhưng instance có thể bị thu hồi khi AWS
cần lại capacity?

- A. On-Demand
- B. Reserved Instances
- C. Spot Instances
- D. Dedicated Hosts

**Câu 21 — (Multiple choice)**
AWS Organizations cho phép áp dụng giới hạn quyền tối đa trên toàn bộ accounts bằng?

- A. IAM policy gắn trực tiếp user
- B. Service Control Policies (SCP)
- C. Resource-based policy
- D. Bucket policy

**Câu 22 — (Multiple choice)**
Dịch vụ nào ghi lại các API call và hoạt động của account để audit (ai làm gì, khi nào)?

- A. Amazon CloudWatch
- B. AWS CloudTrail
- C. AWS Config
- D. VPC Flow Logs

**Câu 23 — (Multiple choice)**
Một ứng dụng web three-tier cần phân phối traffic HTTP/HTTPS tới nhiều EC2 dựa trên
nội dung đường dẫn URL. Loại load balancer nào?

- A. Network Load Balancer
- B. Application Load Balancer
- C. Gateway Load Balancer
- D. Classic Load Balancer bắt buộc

**Câu 24 — (Multiple choice)**
Pillar Cost Optimization của Well-Architected khuyến nghị điều nào sau đây?

- A. Luôn dùng instance lớn nhất để an toàn
- B. Chọn đúng kích thước tài nguyên (right-sizing) và dùng mô hình giá phù hợp
- C. Không bao giờ xóa dữ liệu
- D. Chỉ dùng On-Demand cho mọi workload

**Câu 25 — (Multiple choice)**
Dịch vụ nào giúp lưu trữ và luân phiên (rotate) tự động các thông tin bí mật như mật khẩu
database?

- A. AWS KMS
- B. AWS Secrets Manager
- C. AWS Systems Manager Parameter Store (standard, không rotation)
- D. Amazon S3 với encryption

**Câu 26 — (Multiple choice)**
DynamoDB phù hợp nhất cho trường hợp nào?

- A. Truy vấn phân tích phức tạp trên petabyte dữ liệu
- B. Key-value / document với độ trễ thấp ở quy mô lớn
- C. Join nhiều bảng quan hệ phức tạp
- D. Caching in-memory thuần túy

**Câu 27 — (Multiple response — Chọn 3)**
Ba yếu tố nào là thành phần của AWS Cloud Adoption Framework (CAF) perspectives?

- A. Business
- B. People
- C. Governance
- D. Marketing
- E. Operations

**Câu 28 — (Multiple choice)**
Để giảm độ trễ đọc cho một ứng dụng đọc nhiều (read-heavy) bằng cách lưu kết quả truy vấn
trong bộ nhớ, dùng dịch vụ nào?

- A. Amazon RDS Read Replica
- B. Amazon ElastiCache
- C. Amazon EBS gp3
- D. Amazon EFS

**Câu 29 — (Multiple choice)**
AWS Shield Standard được cung cấp cho khách hàng như thế nào?

- A. Phải mua riêng theo tháng
- B. Tự động, miễn phí cho mọi khách hàng AWS
- C. Chỉ có trong gói Enterprise Support
- D. Chỉ bảo vệ EC2

**Câu 30 — (Multiple choice)**
Một công ty cần một file system dùng chung (shared) cho nhiều EC2 Linux instance đồng
thời. Dịch vụ lưu trữ nào?

- A. Amazon EBS
- B. Amazon EFS
- C. Amazon S3 mount như block device
- D. Instance store

**Câu 31 — (Multiple choice)**
Tài khoản root của AWS nên được bảo vệ bằng cách nào tốt nhất?

- A. Dùng root cho mọi tác vụ hàng ngày
- B. Bật MFA và hạn chế dùng root, tạo IAM user cho công việc
- C. Chia sẻ root credentials cho cả team
- D. Tắt billing alert để tránh phiền

**Câu 32 — (Multiple choice)**
Dịch vụ nào phù hợp để nhập (ingest) và xử lý dữ liệu streaming thời gian thực quy mô lớn,
ví dụ clickstream?

- A. Amazon SQS
- B. Amazon Kinesis Data Streams
- C. Amazon SNS
- D. AWS Batch

**Câu 33 — (Multiple choice)**
Consolidated billing trong AWS Organizations mang lại lợi ích nào?

- A. Mỗi account phải trả riêng không gộp
- B. Gộp hóa đơn và hưởng volume discount trên tổng usage của các account
- C. Tự động xóa tài nguyên không dùng
- D. Cung cấp TAM miễn phí cho mọi account

**Câu 34 — (Multiple choice)**
Dịch vụ nào tự động đánh giá EC2 và workload để tìm lỗ hổng bảo mật (vulnerabilities) và
phơi nhiễm mạng?

- A. Amazon GuardDuty
- B. Amazon Inspector
- C. Amazon Macie
- D. AWS Trusted Advisor

**Câu 35 — (Multiple choice)**
Deployment model nào kết hợp hạ tầng on-premises với AWS cloud?

- A. Public cloud
- B. Private cloud
- C. Hybrid cloud
- D. Multi-cloud

**Câu 36 — (Multiple choice)**
Để triển khai hạ tầng dưới dạng mã (Infrastructure as Code) bằng template có thể tái sử
dụng, dùng dịch vụ nào?

- A. AWS CloudFormation
- B. AWS Config
- C. AWS CodeDeploy
- D. AWS OpsWorks bắt buộc cho mọi template

**Câu 37 — (Multiple choice)**
Một lập trình viên muốn chạy code để xử lý một file ngay khi nó được upload lên S3, không
quản lý server. Dịch vụ nào?

- A. Amazon EC2
- B. AWS Lambda
- C. AWS Fargate chạy liên tục
- D. Amazon EMR

**Câu 38 — (Multiple choice)**
GuardDuty khác Inspector ở điểm cốt lõi nào?

- A. GuardDuty phát hiện mối đe dọa/hoạt động bất thường từ log; Inspector quét lỗ hổng trên workload
- B. GuardDuty quét lỗ hổng OS; Inspector phát hiện threat từ log
- C. Cả hai giống hệt nhau
- D. GuardDuty chỉ hoạt động on-premises

**Câu 39 — (Multiple choice)**
Khái niệm "high availability" được tăng cường chủ yếu bằng cách nào trong AWS?

- A. Triển khai trên nhiều Availability Zones
- B. Dùng một instance lớn duy nhất
- C. Tắt auto scaling
- D. Chỉ dùng một Region và một AZ

**Câu 40 — (Multiple choice)**
Dịch vụ nào là data warehouse được quản lý, tối ưu cho phân tích (OLAP) trên tập dữ liệu
rất lớn?

- A. Amazon RDS
- B. Amazon Redshift
- C. Amazon DynamoDB
- D. Amazon Aurora

**Câu 41 — (Multiple choice)**
AWS Trusted Advisor đưa ra khuyến nghị trong các hạng mục nào?

- A. Chỉ về chi phí
- B. Cost Optimization, Performance, Security, Fault Tolerance và Service Limits
- C. Chỉ về bảo mật IAM
- D. Chỉ về hiệu năng mạng

**Câu 42 — (Multiple choice)**
IAM policy được đánh giá như thế nào khi có cả Allow và Deny áp dụng cho một hành động?

- A. Allow luôn thắng
- B. Explicit Deny luôn thắng (override mọi Allow)
- C. Tùy thứ tự khai báo
- D. Cả hai bị bỏ qua

**Câu 43 — (Multiple choice)**
Một công ty cần kết nối mạng riêng, băng thông ổn định, ít phụ thuộc internet công cộng,
từ data center tới AWS. Dịch vụ nào?

- A. Site-to-Site VPN qua internet
- B. AWS Direct Connect
- C. CloudFront
- D. Internet Gateway

**Câu 44 — (Multiple choice)**
Để gửi thông báo fan-out tới nhiều subscriber (email, SQS, Lambda) khi một sự kiện xảy
ra, dùng dịch vụ nào?

- A. Amazon SQS
- B. Amazon SNS
- C. Amazon Kinesis
- D. AWS Step Functions

**Câu 45 — (Multiple response — Chọn 2)**
Hai phát biểu nào đúng về S3 Glacier Deep Archive?

- A. Chi phí lưu trữ thuộc nhóm thấp nhất trong các storage class của S3
- B. Dùng cho dữ liệu cần truy cập nhiều lần mỗi ngày
- C. Phù hợp lưu trữ lâu dài (archive) với thời gian truy xuất dài hơn
- D. Có độ trễ truy xuất gần như tức thời như S3 Standard
- E. Không hỗ trợ mã hóa

**Câu 46 — (Multiple choice)**
Managed Platform as a Service nào cho phép deploy ứng dụng web mà không cần tự cấu hình
hạ tầng bên dưới (AWS tự lo EC2, ELB, Auto Scaling)?

- A. AWS CloudFormation
- B. AWS Elastic Beanstalk
- C. Amazon EC2 thuần
- D. AWS Lambda

**Câu 47 — (Multiple choice)**
Để giám sát metric (CPU, memory qua agent), đặt alarm và thu thập log của tài nguyên AWS,
dùng dịch vụ nào?

- A. AWS CloudTrail
- B. Amazon CloudWatch
- C. AWS Config
- D. AWS X-Ray bắt buộc

**Câu 48 — (Multiple choice)**
AWS KMS được dùng cho mục đích chính nào?

- A. Giám sát API call
- B. Tạo và quản lý khóa mã hóa (encryption keys)
- C. Phân phối nội dung edge
- D. Cân bằng tải

**Câu 49 — (Multiple choice)**
Một khách hàng muốn chạy ứng dụng cần giấy phép phần mềm ràng buộc với phần cứng vật lý
chuyên biệt (BYOL theo socket). Mô hình nào?

- A. Spot Instances
- B. Dedicated Hosts
- C. Reserved Instances dạng standard
- D. Savings Plans

**Câu 50 — (Multiple choice)**
Region và Availability Zone khác nhau thế nào?

- A. Region là một data center đơn lẻ, AZ là một Region
- B. Region là khu vực địa lý chứa nhiều AZ; AZ là một hoặc nhiều data center tách biệt trong Region
- C. AZ lớn hơn Region
- D. Chúng giống nhau

**Câu 51 — (Multiple choice)**
Để tự động thêm/bớt EC2 instance theo tải nhằm duy trì hiệu năng và tối ưu chi phí, dùng?

- A. Elastic Load Balancing
- B. EC2 Auto Scaling
- C. AWS CloudFormation
- D. Amazon CloudFront

**Câu 52 — (Multiple choice)**
Pillar Security của Well-Architected khuyến nghị nguyên tắc nào?

- A. Cấp quyền rộng nhất có thể để tránh lỗi
- B. Áp dụng least privilege và bảo vệ theo nhiều lớp (defense in depth)
- C. Tắt logging để tiết kiệm chi phí
- D. Dùng chung một credential cho cả tổ chức

**Câu 53 — (Multiple choice)**
Một công ty cần database không-quan-hệ, hiệu năng mili-giây ở quy mô bất kỳ, cho ứng dụng
mobile với lưu lượng biến động. Dịch vụ phù hợp nhất?

- A. Amazon RDS for MySQL
- B. Amazon DynamoDB
- C. Amazon Redshift
- D. Amazon Aurora Serverless chỉ cho SQL phức tạp

**Câu 54 — (Multiple choice)**
AWS Config dùng chủ yếu để làm gì?

- A. Ghi lại API call cho audit
- B. Theo dõi và đánh giá cấu hình tài nguyên theo thời gian và so với quy tắc tuân thủ
- C. Phân phối nội dung
- D. Quản lý khóa mã hóa

**Câu 55 — (Multiple choice)**
Loại EBS volume nào phù hợp cho workload cần IOPS cao, ổn định cho database quan trọng?

- A. gp2/gp3 (General Purpose SSD)
- B. io1/io2 (Provisioned IOPS SSD)
- C. st1 (Throughput Optimized HDD)
- D. sc1 (Cold HDD)

**Câu 56 — (Multiple choice)**
Một tổ chức muốn giới hạn các Region được phép dùng trên tất cả account con. Dùng công cụ
nào?

- A. IAM group
- B. Service Control Policy trong AWS Organizations
- C. Security Group
- D. Route 53 policy

**Câu 57 — (Multiple choice)**
Khái niệm "agility" khi dùng cloud chủ yếu nói về điều gì?

- A. Giảm giá điện data center
- B. Thử nghiệm và triển khai nhanh, rút ngắn thời gian ra thị trường
- C. Tăng số nhân viên vận hành
- D. Cố định cấu hình hạ tầng

**Câu 58 — (Multiple choice)**
Khách hàng chịu trách nhiệm cho hạng mục nào trong Shared Responsibility Model khi dùng
Amazon S3?

- A. Bảo trì phần cứng ổ đĩa
- B. Cấu hình bucket policy và quyền truy cập, mã hóa phía client
- C. Vá firmware của storage
- D. Vận hành mạng lưới backbone của AWS

**Câu 59 — (Multiple choice)**
Để hiểu tổng chi phí ước tính của một kiến trúc dự kiến gồm nhiều dịch vụ TRƯỚC khi xây,
công cụ nào?

- A. AWS Cost Explorer
- B. AWS Pricing Calculator
- C. AWS Budgets
- D. AWS Cost and Usage Report

**Câu 60 — (Multiple response — Chọn 2)**
Hai lợi ích nào đến từ việc dùng AWS Regions trải rộng toàn cầu?

- A. Giảm độ trễ bằng cách đặt tài nguyên gần người dùng
- B. Đáp ứng yêu cầu data residency/tuân thủ theo quốc gia
- C. Tự động loại bỏ mọi chi phí truyền dữ liệu
- D. Buộc mọi dữ liệu nằm trong một AZ duy nhất
- E. Loại bỏ nhu cầu backup

**Câu 61 — (Multiple choice)**
Gói AWS Support nào phù hợp cho môi trường production quan trọng cần phản hồi nhanh nhất
và các dịch vụ chủ động chuyên sâu?

- A. Basic
- B. Developer
- C. Business
- D. Enterprise

**Câu 62 — (Multiple choice)**
Dịch vụ nào cung cấp block storage gắn vào MỘT EC2 instance, bền vững độc lập với vòng
đời instance?

- A. Instance store
- B. Amazon EBS
- C. Amazon EFS
- D. Amazon S3

**Câu 63 — (Multiple choice)**
Một ứng dụng đột biến tải theo mùa, muốn trả On-Demand cho phần đỉnh nhưng cam kết dùng
mức nền để tiết kiệm linh hoạt giữa các instance family. Mô hình giá nào?

- A. Chỉ On-Demand
- B. Savings Plans
- C. Chỉ Spot
- D. Dedicated Hosts

**Câu 64 — (Multiple choice)**
Phát biểu nào về IAM là ĐÚNG?

- A. IAM user luôn có mọi quyền mặc định
- B. IAM policy xác định quyền; role cho phép cấp quyền tạm thời không dùng long-term key
- C. IAM chỉ dùng cho EC2
- D. Root account không cần bảo vệ vì AWS tự lo

**Câu 65 — (Multiple choice)**
Một công ty cần giảm thiểu rủi ro tấn công DDoS lớn ở tầng ứng dụng với bảo vệ nâng cao
và hỗ trợ ứng phó chuyên trách. Dịch vụ nào?

- A. AWS Shield Standard
- B. AWS Shield Advanced
- C. AWS WAF đơn độc
- D. Security Group

---

## Đáp án & giải thích

<details>
<summary>Mở đáp án 65 câu</summary>

1. B — Trả theo mức dùng thay vì đầu tư phần cứng trước chính là "trade capital expense for variable expense".
2. B — EC2 là IaaS; khách hàng chịu trách nhiệm OS patching, AWS lo hạ tầng vật lý bên dưới.
3. B — Route 53 là DNS được quản lý, hỗ trợ latency-based routing; CloudFront là CDN.
4. B, C — Lambda và Fargate là serverless; EC2/Lightsail cần quản lý instance.
5. B — Cost Explorer phân tích chi tiêu lịch sử và dự báo; Pricing Calculator chỉ ước tính trước, Budgets đặt ngưỡng.
6. B — Standard-IA cho dữ liệu ít truy cập nhưng truy xuất nhanh; Glacier Deep Archive là archive dài hạn.
7. B — WAF lọc tấn công tầng 7 (SQLi, XSS); Shield lo DDoS, GuardDuty phát hiện threat.
8. B — Reliability lo phục hồi và hoạt động đúng khi có sự cố.
9. B — SQS là message queue bền vững để decouple; SNS là pub/sub fan-out.
10. B — Gắn IAM role cho EC2 cấp credential tạm, không hard-code key.
11. B — Macie dùng ML phân loại dữ liệu nhạy cảm (PII) trong S3.
12. B — Elasticity là khả năng co giãn tài nguyên tự động theo nhu cầu.
13. D — TAM chỉ có ở gói Enterprise (Enterprise On-Ramp/Enterprise); Business không có TAM riêng.
14. B — Aurora tương thích MySQL/PostgreSQL, hiệu năng cao, nhân bản nhiều AZ.
15. A, B — Pricing Calculator ước tính trước, Budgets theo dõi ngưỡng; Trusted Advisor và CloudWatch/CloudTrail khác mục đích.
16. B — Security Group stateful ở instance level; NACL stateless ở subnet level.
17. B — Fargate chạy container không cần quản lý cụm EC2 bên dưới.
18. C — Bảo mật vật lý data center là trách nhiệm của AWS ("security OF the cloud").
19. B — CloudFront là CDN phân phối qua edge locations với độ trễ thấp.
20. C — Spot cho chiết khấu cao nhất nhưng có thể bị thu hồi.
21. B — SCP đặt giới hạn quyền tối đa (guardrail) trên các account trong Organizations.
22. B — CloudTrail ghi lại API call cho audit; CloudWatch lo metric/log, Config lo cấu hình.
23. B — ALB định tuyến tầng 7 theo path/host của HTTP/HTTPS.
24. B — Cost Optimization khuyến nghị right-sizing và chọn mô hình giá phù hợp.
25. B — Secrets Manager lưu và tự động rotate secret; Parameter Store standard không tự rotate.
26. B — DynamoDB là key-value/document NoSQL, độ trễ thấp ở quy mô lớn.
27. A, B, E — CAF perspectives gồm Business, People, Governance, Platform, Security, Operations; Marketing không thuộc.
28. B — ElastiCache cache in-memory giảm độ trễ đọc; Read Replica giúp nhưng không in-memory.
29. B — Shield Standard tự động và miễn phí cho mọi khách hàng AWS.
30. B — EFS là shared file system cho nhiều EC2 Linux đồng thời; EBS gắn một instance.
31. B — Bật MFA cho root, hạn chế dùng root, tạo IAM user cho công việc hàng ngày.
32. B — Kinesis Data Streams nhập và xử lý streaming thời gian thực quy mô lớn.
33. B — Consolidated billing gộp hóa đơn và hưởng volume discount trên tổng usage.
34. B — Inspector đánh giá workload tìm lỗ hổng và phơi nhiễm mạng.
35. C — Hybrid cloud kết hợp on-premises với AWS cloud.
36. A — CloudFormation là IaC bằng template tái sử dụng được.
37. B — Lambda chạy theo sự kiện (S3 upload) không quản lý server.
38. A — GuardDuty phát hiện threat từ log; Inspector quét lỗ hổng trên workload.
39. A — Triển khai qua nhiều AZ là cách chính tăng high availability.
40. B — Redshift là data warehouse tối ưu OLAP trên dữ liệu lớn.
41. B — Trusted Advisor khuyến nghị Cost, Performance, Security, Fault Tolerance, Service Limits.
42. B — Trong IAM, explicit Deny luôn override mọi Allow.
43. B — Direct Connect cho kết nối riêng, băng thông ổn định, ít phụ thuộc internet.
44. B — SNS fan-out thông báo tới nhiều subscriber (email, SQS, Lambda).
45. A, C — Glacier Deep Archive chi phí lưu thấp nhất, dùng archive dài hạn, truy xuất chậm hơn.
46. B — Elastic Beanstalk là PaaS deploy app mà AWS tự lo EC2/ELB/Auto Scaling.
47. B — CloudWatch thu metric, đặt alarm, gom log; CloudTrail lo API audit.
48. B — KMS tạo và quản lý encryption keys.
49. B — Dedicated Hosts cho phép BYOL ràng buộc với phần cứng vật lý theo socket.
50. B — Region là khu vực địa lý chứa nhiều AZ; AZ gồm một hay nhiều data center tách biệt.
51. B — EC2 Auto Scaling tự thêm/bớt instance theo tải.
52. B — Security pillar khuyến nghị least privilege và defense in depth.
53. B — DynamoDB NoSQL mili-giây ở quy mô bất kỳ, hợp ứng dụng mobile lưu lượng biến động.
54. B — Config theo dõi, đánh giá cấu hình tài nguyên theo thời gian và so quy tắc tuân thủ.
55. B — io1/io2 (Provisioned IOPS) cho IOPS cao ổn định cho database quan trọng.
56. B — SCP trong Organizations giới hạn Region được phép trên các account con.
57. B — Agility là triển khai/thử nghiệm nhanh, rút ngắn time-to-market.
58. B — Với S3, khách hàng lo bucket policy/quyền truy cập và mã hóa phía client.
59. B — Pricing Calculator ước tính tổng chi phí kiến trúc trước khi xây.
60. A, B — Nhiều Region giúp giảm độ trễ (gần người dùng) và đáp ứng data residency.
61. D — Enterprise Support cho phản hồi nhanh nhất và dịch vụ chủ động chuyên sâu (gồm TAM).
62. B — EBS là block storage gắn một instance, bền vững độc lập vòng đời instance.
63. B — Savings Plans cam kết mức nền linh hoạt giữa instance family, phần đỉnh trả On-Demand.
64. B — IAM policy xác định quyền; role cấp quyền tạm thời không dùng long-term key.
65. B — Shield Advanced cho bảo vệ DDoS nâng cao và hỗ trợ ứng phó chuyên trách.

</details>

## Related Topics

- [Hub CLF-C02](../index.md) — bản đồ khái niệm và lộ trình ôn thi AWS Cloud Practitioner
- [Reference CLF-C02](../reference/index.md) — tra cứu nhanh dịch vụ và khái niệm theo domain
