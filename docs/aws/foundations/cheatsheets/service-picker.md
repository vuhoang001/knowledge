---
title: Từ khoá → service
sidebar_position: 1
description: "Bảng tra một chiều: thấy cụm từ này trong câu hỏi thì nghĩ tới service này. Dùng lúc luyện đề, không dùng lúc học lần đầu."
tags: [aws, clf-c02, cheatsheet, service-picker]
domain: cloud
category: tool
doc_type: cheatsheet
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Từ khoá → service

> **Cách dùng:** đọc câu hỏi, **tìm cụm từ**, tra bảng. Bảng này chỉ ghi kết luận — vì sao
> thì ở [Tài liệu](../reference/index.md). Không học bảng này trước khi hiểu nhóm service.

## Những cặp bị trộn nhiều nhất

Học mười dòng này trước mọi dòng khác — chúng chiếm phần lớn số câu mất điểm.

| Nghe thấy | Không phải | Mà là |
|---|---|---|
| *block a specific IP* | Security group | **Network ACL** |
| *who deleted that resource* | CloudWatch | **CloudTrail** |
| *has this config ever drifted* | CloudTrail | **AWS Config** |
| *scale read traffic for the database* | Multi-AZ | **Read replica** |
| *database survives an AZ failure* | Read replica | **Multi-AZ** |
| *survive an AZ outage* | Auto Scaling | **Nhiều AZ + ELB** |
| *handle traffic spikes* | ELB | **Auto Scaling** |
| *will change instance family later* | Reserved Instance | **Savings Plans** |
| *account is missing best practices* | Inspector | **Trusted Advisor** |
| *is AWS itself having an outage* | Trusted Advisor | **Health Dashboard** |

## Compute

| Nghe thấy | Service |
|---|---|
| *run code without managing servers*, *event-driven*, ngắn | **Lambda** |
| chạy container, **không** quản node | **Fargate** (launch type của ECS/EKS) |
| cần chuẩn **Kubernetes** | **EKS** |
| orchestrator container, đơn giản nhất | **ECS** |
| *predictable monthly price*, web nhỏ, WordPress | **Lightsail** |
| đưa code lên, AWS tự dựng EC2+ELB+ASG | **Elastic Beanstalk** |
| hàng nghìn **job theo lô** | **AWS Batch** |
| *CPU-intensive* | họ **C** (compute optimized) |
| *large dataset in memory*, cache lớn | họ **R/X** (memory optimized) |
| *very high local IOPS* | họ **I/D** (storage optimized) |
| *ML training*, GPU | họ **P/G** (accelerated) |
| chạy **tại chỗ khách**, API giống AWS | **Outposts** |
| độ trễ vài ms cho **một thành phố** | **Local Zones** |
| độ trễ cực thấp qua **5G** | **Wavelength** |

## Storage

| Nghe thấy | Service / lớp |
|---|---|
| object storage, data lake, backup, web tĩnh | **S3** |
| ổ đĩa cho **một** EC2, cần còn sau khi stop | **EBS** |
| ổ tạm, cực nhanh, **mất khi stop** | **instance store** |
| **nhiều** máy Linux mount cùng lúc | **EFS** |
| file share **Windows/SMB**, hoặc **Lustre/HPC** | **FSx** |
| *unknown or changing access pattern* | **S3 Intelligent-Tiering** |
| thưa truy cập, cần **ngay** | **S3 Standard-IA** |
| thưa truy cập, **tái tạo được**, rẻ hơn | **S3 One Zone-IA** |
| archive nhưng cần **mili giây** | **Glacier Instant Retrieval** |
| archive, chờ phút→giờ được | **Glacier Flexible Retrieval** |
| *lowest cost*, chờ **nhiều giờ** được, giữ 7–10 năm | **Glacier Deep Archive** |
| app on-premises cần đọc nhanh dữ liệu trên AWS | **Storage Gateway** |
| một chỗ đặt chính sách backup cho nhiều service | **AWS Backup** |
| **WORM**, không cho xoá trong N năm | **S3 Object Lock** |

## Database

| Nghe thấy | Service |
|---|---|
| quan hệ, SQL, app MySQL/PostgreSQL có sẵn | **RDS** |
| quan hệ, thông lượng cao, cloud-native | **Aurora** |
| NoSQL, *single-digit millisecond*, quy mô rất lớn | **DynamoDB** |
| **cache** session, giảm tải DB | **ElastiCache** |
| in-memory nhưng **bền**, làm nguồn chính | **MemoryDB** |
| **đồ thị**, quan hệ giữa các thực thể | **Neptune** |
| data warehouse, truy vấn phức tạp quy mô petabyte | **Redshift** |
| chuyển DB, nguồn **vẫn chạy** | **DMS** |
| chuyển **khác engine** (Oracle → PostgreSQL) | **SCT** + DMS |

## Network và edge

| Nghe thấy | Service |
|---|---|
| private subnet cần **ra** internet | **NAT Gateway** |
| tài nguyên public cần ra/vào internet | **Internet Gateway** |
| gọi S3/DynamoDB **không qua internet** | **VPC Endpoint** |
| DNS, *route users to nearest Region*, failover | **Route 53** |
| **cache** nội dung gần người dùng | **CloudFront** |
| **IP tĩnh toàn cầu**, TCP/UDP, failover nhanh | **Global Accelerator** |
| cửa vào cho API, throttling, xác thực | **API Gateway** |
| mã hoá, dựng **trong vài giờ** | **Site-to-Site VPN** |
| băng thông và độ trễ **ổn định**, lắp **nhiều tuần** | **Direct Connect** |
| nối **nhiều** VPC và account | **Transit Gateway** |

## Security

| Nghe thấy | Service |
|---|---|
| *download SOC/ISO/PCI report* | **Artifact** |
| thu bằng chứng tuân thủ **của tôi** | **Audit Manager** |
| phát hiện **hoạt động đe doạ** từ log | **GuardDuty** |
| quét **lỗ hổng** EC2/container/Lambda | **Inspector** |
| tìm **PII** trong S3 | **Macie** |
| **điều tra** nguyên nhân sau finding | **Detective** |
| **gom** finding nhiều service về một chỗ | **Security Hub** |
| chặn SQL injection, XSS, bot, rate | **WAF** |
| chống **DDoS** | **Shield** (Standard miễn phí) |
| quản **khoá mã hoá** | **KMS** |
| HSM **riêng**, khách toàn quyền khoá | **CloudHSM** |
| chứng chỉ TLS, **tự gia hạn** | **ACM** |
| lưu mật khẩu, **tự rotate** | **Secrets Manager** |
| lưu tham số, mức cơ bản **miễn phí** | **Parameter Store** |
| SSO cho **nhiều account** | **IAM Identity Center** |
| đăng nhập cho **người dùng của app** | **Cognito** |
| Active Directory được quản | **Directory Service** |
| đặt **trần quyền** cho account con | **SCP** (Organizations) |

## Tích hợp, dev tools, khác

| Nghe thấy | Service |
|---|---|
| hàng đợi, đệm tải, **một** consumer | **SQS** |
| pub/sub, **nhiều** subscriber, email/SMS | **SNS** |
| định tuyến **sự kiện** theo nội dung, theo lịch | **EventBridge** |
| **workflow** nhiều bước, có nhánh và retry | **Step Functions** |
| request này **chậm ở đâu** | **X-Ray** |
| nối build–test–deploy thành luồng | **CodePipeline** |
| đổi **cấu hình** app đang chạy | **AppConfig** |
| **desktop ảo** cho nhân viên | **WorkSpaces** |
| stream **một ứng dụng** | **AppStream 2.0** |
| contact center, tổng đài | **Connect** |
| gửi **email** số lượng lớn | **SES** |
| API **GraphQL** | **AppSync** |
| host web/mobile full-stack | **Amplify** |
| test trên **thiết bị thật** | **Device Farm** |
| quản thiết bị IoT | **IoT Core** |
| xử lý **ngay trên thiết bị**, mạng kém | **IoT Greengrass** |

## AI/ML và analytics

| Nghe thấy | Service |
|---|---|
| ảnh/video → nhãn, mặt người | **Rekognition** |
| tài liệu scan → **dữ liệu có cấu trúc** | **Textract** |
| giọng → chữ | **Transcribe** |
| chữ → giọng | **Polly** |
| dịch | **Translate** |
| chữ → cảm xúc, thực thể, chủ đề | **Comprehend** |
| **chatbot** | **Lex** |
| **tìm kiếm** trong tài liệu nội bộ | **Kendra** |
| tự **train model** | **SageMaker** |
| stream dữ liệu thời gian thực | **Kinesis** |
| Kafka được quản | **MSK** |
| ETL serverless + **catalog** | **Glue** |
| SQL **thẳng trên S3**, không hạ tầng | **Athena** |
| Spark/Hadoop có kiểm soát | **EMR** |
| tìm kiếm + phân tích log | **OpenSearch** |
| **dashboard** BI | **QuickSight** |
| mua tập dữ liệu ngoài | **Data Exchange** |

## Chi phí và support

| Nghe thấy | Công cụ |
|---|---|
| **dự toán** cái chưa dựng | **Pricing Calculator** |
| tiền **đã** đi đâu, theo tag/service | **Cost Explorer** |
| **cảnh báo** khi vượt ngưỡng | **Budgets** |
| dữ liệu chi phí **thô nhất** vào S3 | **Cost and Usage Report** |
| chia hoá đơn **nội bộ** theo giá riêng | **Billing Conductor** |
| một hoá đơn, gộp bậc giá, dùng chung RI | **Organizations** |
| đề xuất **đổi cỡ** từ số liệu thật | **Compute Optimizer** |
| chi phí tăng **bất thường** | **Cost Anomaly Detection** |
| 24/7 + full Trusted Advisor, rẻ nhất | **Business Support** |
| **TAM riêng** | **Enterprise Support** |
| hỏi–đáp cộng đồng | **re:Post** |
| **báo cáo lạm dụng** tài nguyên AWS | **Trust & Safety** |

## Related Topics

- [Văn phong đề AWS](exam-wording.md) — khi hai service đều hợp, chữ nào trong câu hỏi quyết định
- [Tài liệu](../reference/index.md) — vì sao, và vì sao service kia sai
- [Cheatsheet — Foundations](index.md)
