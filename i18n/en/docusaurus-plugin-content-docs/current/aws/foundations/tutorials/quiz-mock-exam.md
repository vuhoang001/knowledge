---
title: "Đề tổng hợp 65 câu — mô phỏng CLF-C02"
i18n_status: untranslated
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

1. B — Chuyển từ mua phần cứng trả trước (capital expense) sang chỉ trả theo mức dùng (variable expense) đúng là lợi ích "trade capital expense for variable expense". Economies of scale là hạ giá nhờ quy mô tổng của AWS, còn global reach và availability là lợi ích khác, không nói về mô hình chi phí trả-theo-dùng.
2. B — EC2 thuộc nhóm IaaS: AWS lo hạ tầng vật lý, hypervisor và mạng ("security OF the cloud"), còn khách hàng lo mọi thứ bên trong instance, trong đó có OS patching ("security IN the cloud"). Ranh giới không phụ thuộc instance type cũ hay mới, và AWS không chỉ định bên thứ ba vá OS giúp bạn.
3. B — Route 53 là DNS được quản lý, có tính sẵn sàng cao và hỗ trợ latency-based routing để hướng người dùng tới endpoint có độ trễ thấp nhất. CloudFront là CDN, API Gateway quản lý API, còn Global Accelerator tối ưu đường mạng nhưng không phải dịch vụ DNS.
4. B, C — Lambda chạy code theo sự kiện và Fargate chạy container, cả hai đều serverless — không phải cấp phát hay quản lý server. EC2 và Lightsail đều cần quản lý instance; EC2 Auto Scaling chỉ co giãn số EC2 nên vẫn không serverless.
5. B — Cost Explorer trực quan hóa chi tiêu lịch sử theo service và còn dự báo chi phí tương lai, đúng nhu cầu phân tích + forecast. Pricing Calculator chỉ ước tính trước khi triển khai, Budgets đặt ngưỡng cảnh báo, còn CUR thô là dữ liệu chi tiết chưa trực quan hóa.
6. B — S3 Standard-IA hạ phí lưu trữ cho dữ liệu ít truy cập nhưng vẫn truy xuất nhanh (có phí retrieval). Standard đắt hơn cho dữ liệu nóng, Glacier Deep Archive là archive dài hạn truy xuất chậm, còn One Zone-IA lưu một AZ nên không hợp "dữ liệu quan trọng duy nhất" vì rủi ro mất AZ.
7. B — AWS WAF lọc request tầng 7 theo rule, chặn được SQL injection và XSS. Shield Standard chỉ lo DDoS tầng mạng/vận chuyển, GuardDuty phát hiện threat từ log, còn Network Firewall thiên về tầng 3/4 chứ không phải tấn công tầng ứng dụng.
8. B — Reliability lo khả năng workload phục hồi sau sự cố và tiếp tục hoạt động đúng. Operational Excellence lo vận hành/tự động hóa, Performance Efficiency lo dùng tài nguyên hiệu quả, còn Cost Optimization lo chi phí — không trùng mục tiêu phục hồi.
9. B — SQS là hàng đợi bền vững: message được giữ lại cho tới khi consumer xử lý xong, nên decouple producer/consumer mà không mất message khi consumer bận. SNS là pub/sub fan-out (push, không giữ hàng đợi bền kiểu poll), Kinesis cho streaming, còn MQ hỗ trợ cả giao thức chuẩn chứ không chỉ độc quyền.
10. B — Gắn IAM role cho EC2 để instance nhận credential tạm thời tự động luân phiên, không cần lưu long-term key. Hard-code key, lưu secret trong biến môi trường hay dùng root đều là anti-pattern vì để lộ credential dài hạn.
11. B — Macie dùng machine learning để phát hiện và phân loại dữ liệu nhạy cảm như PII trong S3. Inspector quét lỗ hổng workload, GuardDuty phát hiện threat từ log, còn Config theo dõi cấu hình — không cái nào chuyên phân loại PII.
12. B — Elasticity là khả năng tự động co giãn (thêm/bớt) tài nguyên theo nhu cầu thực. Sao lưu tự động, zero-downtime và giá cố định là khái niệm khác, không phải định nghĩa của elasticity.
13. D — Technical Account Manager (TAM) chỉ đi kèm gói Enterprise (và Enterprise On-Ramp ở mức giới hạn). Basic và Developer không có TAM, còn Business có hỗ trợ 24/7 nhưng vẫn chưa có TAM riêng.
14. B — Aurora là database quan hệ tương thích MySQL/PostgreSQL, hiệu năng cao và tự nhân bản dữ liệu qua nhiều AZ. DynamoDB là NoSQL, Redshift là data warehouse OLAP, còn ElastiCache là cache in-memory — đều không phải RDBMS tương thích MySQL/PostgreSQL.
15. A, B — Pricing Calculator ước tính chi phí TRƯỚC khi triển khai, còn Budgets theo dõi và cảnh báo khi sắp vượt ngân sách — đúng cặp "ước tính trước + theo dõi". Trusted Advisor đưa khuyến nghị tối ưu, CloudWatch Logs và CloudTrail phục vụ giám sát/audit chứ không phải lập ngân sách.
16. B — Security Group hoạt động ở instance level và là stateful (traffic đi ra được tự động cho về); NACL ở subnet level và stateless (phải mở cả chiều ra lẫn vào). Các phương án đảo ngược hoặc gộp sai tính chất stateful/stateless.
17. B — Fargate chạy container mà AWS tự quản lý cụm compute bên dưới, bạn không phải provision hay vá EC2. ECS trên EC2 launch type và EC2 thuần vẫn bắt bạn quản lý instance; Batch dùng cho batch job chứ không chỉ job theo lịch và vẫn cần compute environment.
18. C — Bảo mật vật lý của data center thuộc "security OF the cloud" nên là trách nhiệm AWS. Security Group, mã hóa phía client và quản lý IAM user/policy đều là "security IN the cloud" — phần của khách hàng.
19. B — CloudFront là CDN cache cả nội dung tĩnh lẫn động tại edge locations để giảm độ trễ toàn cầu. S3 Transfer Acceleration chỉ tăng tốc upload lên S3, Direct Connect là kết nối riêng, còn ELB chỉ cân bằng tải trong một Region.
20. C — Spot Instances cho mức chiết khấu cao nhất vì dùng capacity dư, đổi lại AWS có thể thu hồi khi cần. On-Demand và Reserved không bị thu hồi kiểu đó, còn Dedicated Hosts đắt hơn do dành riêng phần cứng vật lý.
21. B — Service Control Policies (SCP) trong AWS Organizations đặt trần quyền tối đa (guardrail) cho các account, không trực tiếp cấp quyền. IAM policy gắn user, resource-based policy và bucket policy chỉ tác động phạm vi hẹp, không áp trần cho cả tổ chức.
22. B — CloudTrail ghi lại mọi API call (ai, làm gì, khi nào) phục vụ audit. CloudWatch lo metric/log hiệu năng, Config theo dõi thay đổi cấu hình tài nguyên, còn VPC Flow Logs chỉ ghi lưu lượng mạng — không ghi API call toàn account.
23. B — Application Load Balancer làm việc ở tầng 7 nên định tuyến được theo path/host của HTTP/HTTPS, hợp với web three-tier. NLB ở tầng 4 không nhìn URL, Gateway LB dành cho thiết bị mạng, còn Classic LB là thế hệ cũ không "bắt buộc".
24. B — Cost Optimization khuyến nghị right-sizing tài nguyên và chọn mô hình giá phù hợp (Reserved/Savings Plans/Spot). Luôn chọn instance lớn nhất, không bao giờ xóa dữ liệu hay chỉ dùng On-Demand đều đi ngược nguyên tắc tiết kiệm.
25. B — Secrets Manager lưu secret và tự động rotate (ví dụ mật khẩu database), tích hợp sẵn với RDS. KMS quản lý khóa mã hóa chứ không lưu secret ứng dụng, Parameter Store standard không tự rotate, còn S3 encryption không phải nơi quản lý secret.
26. B — DynamoDB là NoSQL key-value/document, cho độ trễ thấp ổn định ở quy mô lớn. Phân tích phức tạp petabyte hợp Redshift, join quan hệ hợp RDBMS, còn caching in-memory thuần là việc của ElastiCache.
27. A, B, E — AWS CAF có sáu perspectives: Business, People, Governance, Platform, Security, Operations — nên Business, People và Operations đều đúng. Marketing không nằm trong CAF; Governance cũng là một perspective nhưng đề chỉ yêu cầu chọn ba.
28. B — ElastiCache lưu kết quả truy vấn trong bộ nhớ (in-memory) nên giảm mạnh độ trễ đọc cho app read-heavy. RDS Read Replica chia tải đọc nhưng vẫn truy vấn xuống database, còn EBS gp3 và EFS là lưu trữ, không phải cache.
29. B — Shield Standard được bật tự động và miễn phí cho mọi khách hàng AWS, bảo vệ DDoS cơ bản. Không phải mua riêng, không giới hạn ở gói Enterprise, và không chỉ bảo vệ EC2.
30. B — EFS là shared file system cho phép nhiều EC2 Linux mount đồng thời. EBS thường gắn vào một instance, S3 không mount như block device chuẩn, còn instance store là lưu trữ tạm mất khi instance dừng.
31. B — Thực hành tốt nhất là bật MFA cho root, hạn chế dùng root và tạo IAM user cho công việc hàng ngày. Dùng root cho mọi tác vụ, chia sẻ credential hay tắt billing alert đều làm tăng rủi ro bảo mật.
32. B — Kinesis Data Streams nhập và xử lý dữ liệu streaming thời gian thực quy mô lớn như clickstream. SQS là hàng đợi (không phải stream xử lý realtime nhiều consumer theo thứ tự), SNS là pub/sub, còn Batch dùng cho job xử lý theo lô.
33. B — Consolidated billing gộp hóa đơn của các account và tính volume discount trên tổng usage, nên thường rẻ hơn trả riêng lẻ. Nó không xóa tài nguyên dư và không cấp TAM miễn phí.
34. B — Inspector tự động đánh giá EC2/workload để tìm lỗ hổng phần mềm và phơi nhiễm mạng. GuardDuty phát hiện threat từ log, Macie phân loại dữ liệu nhạy cảm, còn Trusted Advisor đưa khuyến nghị tổng quát — không quét lỗ hổng workload.
35. C — Hybrid cloud kết hợp hạ tầng on-premises với AWS cloud. Public cloud là toàn bộ trên cloud, private cloud là riêng tại chỗ, còn multi-cloud là dùng nhiều nhà cung cấp cloud chứ không nhất thiết có on-premises.
36. A — CloudFormation là Infrastructure as Code: mô tả hạ tầng bằng template tái sử dụng và triển khai nhất quán. Config theo dõi cấu hình, CodeDeploy lo deploy ứng dụng, còn OpsWorks là dịch vụ cấu hình Chef/Puppet, không "bắt buộc cho mọi template".
37. B — Lambda chạy code theo sự kiện (như S3 upload) mà không quản lý server, trả tiền theo lần chạy. EC2 phải tự quản lý, Fargate chạy container liên tục không hợp xử lý theo sự kiện ngắn, còn EMR dành cho big data.
38. A — GuardDuty phát hiện mối đe dọa/hoạt động bất thường bằng cách phân tích log (CloudTrail, VPC Flow Logs, DNS); Inspector quét lỗ hổng trên workload. Phương án B đảo ngược vai trò, hai dịch vụ không giống nhau và GuardDuty không chỉ chạy on-premises.
39. A — High availability trong AWS chủ yếu đến từ triển khai qua nhiều Availability Zones để một AZ hỏng vẫn còn AZ khác. Một instance lớn duy nhất, tắt auto scaling hay chỉ dùng một AZ đều là điểm lỗi đơn (single point of failure).
40. B — Redshift là data warehouse được quản lý, tối ưu cho phân tích OLAP trên tập dữ liệu rất lớn nhờ lưu trữ cột. RDS và Aurora là OLTP quan hệ, còn DynamoDB là NoSQL — đều không tối ưu truy vấn phân tích quy mô warehouse.
41. B — Trusted Advisor đưa khuyến nghị theo năm hạng mục: Cost Optimization, Performance, Security, Fault Tolerance và Service Limits. Các phương án giới hạn chỉ chi phí, chỉ IAM hay chỉ mạng đều hẹp hơn thực tế.
42. B — Trong IAM, explicit Deny luôn override mọi Allow; mặc định là deny ngầm nếu không có Allow. Allow không "luôn thắng", và kết quả không phụ thuộc thứ tự khai báo policy.
43. B — Direct Connect lập kết nối mạng riêng vật lý từ data center tới AWS, băng thông ổn định và ít phụ thuộc internet công cộng. Site-to-Site VPN vẫn đi qua internet, CloudFront là CDN, còn Internet Gateway chỉ cho VPC ra internet.
44. B — SNS là pub/sub fan-out: một message đẩy tới nhiều subscriber cùng lúc (email, SQS, Lambda). SQS là hàng đợi một consumer poll, Kinesis cho streaming, còn Step Functions là điều phối workflow.
45. A, C — Glacier Deep Archive có chi phí lưu trữ thuộc nhóm thấp nhất của S3 và hợp archive dài hạn với thời gian truy xuất dài hơn (hàng giờ). Nó không dùng cho dữ liệu truy cập hàng ngày, không truy xuất tức thời như Standard, và vẫn hỗ trợ mã hóa.
46. B — Elastic Beanstalk là PaaS: bạn đẩy code lên, AWS tự lo EC2, ELB và Auto Scaling bên dưới. CloudFormation là IaC chung, EC2 thuần phải tự cấu hình mọi thứ, còn Lambda là serverless function chứ không phải nền tảng deploy app web đầy đủ.
47. B — CloudWatch thu metric (gồm CPU, và memory qua agent), đặt alarm và gom log của tài nguyên AWS. CloudTrail lo audit API call, Config theo dõi cấu hình, còn X-Ray chuyên trace ứng dụng chứ không "bắt buộc" cho giám sát metric.
48. B — KMS tạo và quản lý khóa mã hóa (encryption keys), tích hợp với nhiều dịch vụ để mã hóa dữ liệu. Giám sát API là CloudTrail, phân phối edge là CloudFront, còn cân bằng tải là ELB.
49. B — Dedicated Hosts cung cấp máy chủ vật lý riêng nên nhìn thấy số socket/core, hợp giấy phép BYOL ràng buộc theo phần cứng vật lý. Spot, Reserved và Savings Plans chỉ là mô hình giá, không đảm bảo quyền kiểm soát phần cứng vật lý cho licensing.
50. B — Region là khu vực địa lý chứa nhiều Availability Zone; mỗi AZ gồm một hoặc nhiều data center tách biệt trong Region đó. Các phương án còn lại đảo ngược quan hệ hoặc coi hai khái niệm là một.
51. B — EC2 Auto Scaling tự thêm/bớt instance theo tải để giữ hiệu năng và tránh trả tiền cho capacity dư. ELB phân phối traffic nhưng không tự đổi số instance, CloudFormation là IaC, còn CloudFront là CDN.
52. B — Security pillar khuyến nghị least privilege (cấp quyền tối thiểu cần thiết) và defense in depth (bảo vệ nhiều lớp). Cấp quyền rộng, tắt logging hay dùng chung một credential đều làm giảm an toàn.
53. B — DynamoDB là NoSQL cho độ trễ mili-giây ở quy mô bất kỳ, hợp ứng dụng mobile có lưu lượng biến động. RDS/Aurora là quan hệ và cần scale khác, còn Redshift là warehouse phân tích — không hợp truy cập mobile tần suất cao.
54. B — AWS Config theo dõi và đánh giá cấu hình tài nguyên theo thời gian, so với quy tắc tuân thủ (compliance rules). Ghi API call là CloudTrail, phân phối nội dung là CloudFront, còn quản lý khóa là KMS.
55. B — io1/io2 (Provisioned IOPS SSD) cho IOPS cao và ổn định, hợp database quan trọng. gp2/gp3 hợp workload chung, còn st1 và sc1 là HDD tối ưu throughput/giá rẻ, không đáp ứng IOPS cao cho database.
56. B — Service Control Policy trong AWS Organizations có thể giới hạn các Region được phép dùng trên tất cả account con. IAM group chỉ gom user, Security Group lọc traffic instance, còn Route 53 là DNS — không cái nào áp guardrail cấp tổ chức.
57. B — Agility nói về khả năng thử nghiệm và triển khai nhanh, rút ngắn time-to-market nhờ cấp tài nguyên tức thời. Giảm giá điện, tăng nhân sự vận hành hay cố định cấu hình không phải trọng tâm của agility.
58. B — Với S3, khách hàng chịu trách nhiệm cấu hình bucket policy/quyền truy cập và mã hóa phía client ("security IN the cloud"). Bảo trì ổ đĩa, vá firmware và vận hành backbone đều thuộc AWS.
59. B — Pricing Calculator ước tính tổng chi phí của một kiến trúc nhiều dịch vụ TRƯỚC khi xây. Cost Explorer và CUR phân tích chi phí đã phát sinh, còn Budgets đặt ngưỡng cảnh báo — không dùng để dựng ước tính kiến trúc mới.
60. A, B — Nhiều Region giúp đặt tài nguyên gần người dùng để giảm độ trễ, và đáp ứng yêu cầu data residency/tuân thủ theo quốc gia. Region không tự loại bỏ phí truyền dữ liệu, không buộc dữ liệu vào một AZ, và không thay thế nhu cầu backup.
61. D — Enterprise Support cho thời gian phản hồi nhanh nhất và các dịch vụ chủ động chuyên sâu (gồm TAM). Basic không có hỗ trợ kỹ thuật, Developer hợp môi trường thử nghiệm, còn Business tuy 24/7 nhưng chưa đạt mức chủ động của Enterprise.
62. B — EBS là block storage gắn vào một EC2 instance và bền vững độc lập với vòng đời instance (còn dữ liệu sau khi stop/terminate tùy cấu hình). Instance store mất khi instance dừng, EFS là file system dùng chung, còn S3 là object storage.
63. B — Savings Plans cam kết một mức chi tiêu nền để được chiết khấu, linh hoạt giữa các instance family, phần đỉnh vượt cam kết trả On-Demand. Chỉ On-Demand thì đắt, chỉ Spot thì bị thu hồi, còn Dedicated Hosts không giải quyết bài toán cam kết nền linh hoạt.
64. B — IAM policy xác định quyền, còn role cho phép cấp quyền tạm thời (credential ngắn hạn) mà không cần lưu long-term key. IAM user không mặc định có mọi quyền, IAM không chỉ dùng cho EC2, và root account vẫn phải được bảo vệ.
65. B — Shield Advanced cung cấp bảo vệ DDoS nâng cao cùng đội ứng phó chuyên trách (DRT) và bảo vệ chi phí khi bị tấn công. Shield Standard chỉ ở mức cơ bản, WAF đơn độc không chống DDoS quy mô lớn, còn Security Group chỉ lọc traffic cơ bản.

</details>

## Related Topics

- [Hub CLF-C02](../index.md) — bản đồ khái niệm và lộ trình ôn thi AWS Cloud Practitioner
- [Reference CLF-C02](../reference/index.md) — tra cứu nhanh dịch vụ và khái niệm theo domain
