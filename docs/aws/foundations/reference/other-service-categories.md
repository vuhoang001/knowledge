---
title: Nhóm service còn lại
sidebar_position: 16
description: "Bảy nhóm service mà task 3.8 gom lại: tích hợp ứng dụng, ứng dụng nghiệp vụ, hỗ trợ khách hàng, developer tools, end-user computing, frontend/mobile, IoT."
tags: [aws, clf-c02, sqs, sns, eventbridge, step-functions, workspaces, iot, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Nhóm service còn lại

> **Chốt:** Task 3.8 là **một bài kiểm tra từ vựng**, không phải bài kiểm tra chiều sâu.
> Mỗi service chỉ cần **một dòng đúng**. Chỗ duy nhất cần hiểu thật là ba service nhắn tin
> — **SQS, SNS, EventBridge** — vì chúng rất hay bị trộn.

## Mục tiêu

Task 3.8 liệt kê thẳng bảy nhóm và yêu cầu **chọn đúng service** cho: gửi thông điệp và
cảnh báo, nhu cầu ứng dụng nghiệp vụ, hỗ trợ khách hàng của AWS, phát triển/deploy/
troubleshoot ứng dụng, đưa màn hình máy ảo tới người dùng, dựng frontend và mobile, quản
thiết bị IoT.

## Tổng quan

### Tích hợp ứng dụng — nhóm duy nhất cần hiểu kỹ

| Service | Mô hình | Dùng khi |
|---|---|---|
| **Amazon SQS** | **Hàng đợi**, một thông điệp cho **một** consumer | Tách hai thành phần; chịu được tải đột biến; thử lại được |
| **Amazon SNS** | **Pub/sub**, một thông điệp tới **nhiều** subscriber | Thông báo, fan-out, gửi email/SMS/HTTP |
| **Amazon EventBridge** | **Event bus**, định tuyến theo **nội dung sự kiện** và theo lịch | Nối service AWS và SaaS theo sự kiện; chạy theo schedule |
| **AWS Step Functions** | **Máy trạng thái** — điều phối nhiều bước | Workflow nhiều bước, có nhánh, có thử lại, có trạng thái |

Ba ranh giới quyết định đáp án:

- **SQS ⇄ SNS**: *một người nhận và xử lý* ⇄ *nhiều người cùng nhận*. Mẫu kinh điển là
  **fan-out**: SNS → nhiều SQS, mỗi SQS cho một hệ thống hạ nguồn.
- **SNS ⇄ EventBridge**: *gửi thông báo* ⇄ *định tuyến sự kiện theo nội dung, có nhiều
  nguồn AWS/SaaS sẵn*.
- **Step Functions ⇄ Lambda thuần**: *luồng nhiều bước có trạng thái, cần thấy đang ở đâu*
  ⇄ *một việc, một hàm*. Câu hỏi có *orchestrate*, *workflow*, *multiple steps* → Step
  Functions.

Và cặp đã nói ở [analytics](ai-ml-and-analytics.md): **SQS ⇄ Kinesis** là *hàng đợi, lấy
ra là mất* ⇄ *stream, giữ lại và đọc lại được*.

### Developer tools

| Service | Một dòng |
|---|---|
| **AWS CodeCommit** | Git repository được quản |
| **AWS CodeBuild** | Build và chạy test |
| **AWS CodeDeploy** | Đưa bản build lên EC2/Lambda/ECS |
| **AWS CodePipeline** | **Nối** các bước trên thành CI/CD |
| **AWS CodeArtifact** | Lưu package/dependency (npm, Maven, pip) |
| **AWS CodeStar** | Mẫu dựng nhanh một project có sẵn pipeline |
| **AWS Cloud9** | IDE trên trình duyệt |
| **AWS CloudShell** | Shell có sẵn CLI trong Console |
| **AWS X-Ray** | **Truy vết request** qua nhiều service — tìm chỗ chậm, tìm lỗi |
| **AWS AppConfig** | Đổi cấu hình ứng dụng **đang chạy**, không deploy lại |

Một dòng đáng nhớ riêng: **X-Ray là "tại sao request này chậm"**, khác CloudWatch ("số liệu
tổng thể") và CloudTrail ("ai gọi API nào").

### Ứng dụng nghiệp vụ và hỗ trợ khách hàng

| Service | Một dòng |
|---|---|
| **Amazon Connect** | **Contact center** trên cloud — tổng đài, IVR |
| **Amazon SES** | Gửi email số lượng lớn (giao dịch, marketing) |
| **AWS Support** | Các gói hỗ trợ — xem [support](support-and-technical-resources.md) |
| **AWS Managed Services (AMS)** | AWS **vận hành** hạ tầng thay bạn |
| **AWS IQ** | Thuê chuyên gia AWS độc lập cho việc ngắn |
| **AWS Activate for Startups** | Credit và tài nguyên cho startup |

**Connect ⇄ SES**: *cuộc gọi khách hàng* ⇄ *email*.

### End-user computing

| Service | Một dòng |
|---|---|
| **Amazon WorkSpaces** | **Desktop ảo** (DaaS) cho nhân viên |
| **Amazon WorkSpaces Web** | Truy cập web nội bộ an toàn từ trình duyệt |
| **Amazon AppStream 2.0** | **Stream một ứng dụng** cụ thể, không phải cả desktop |

**WorkSpaces ⇄ AppStream**: *cả desktop* ⇄ *một app*.

### Frontend web và mobile

| Service | Một dòng |
|---|---|
| **AWS Amplify** | Dựng và host web/mobile app full-stack |
| **AWS AppSync** | API **GraphQL** được quản, có đồng bộ dữ liệu real-time |
| **AWS Device Farm** | Test app trên **thiết bị thật** trên cloud |

### IoT

| Service | Một dòng |
|---|---|
| **AWS IoT Core** | Kết nối và quản thiết bị, nhận telemetry |
| **AWS IoT Greengrass** | Chạy logic **ngay trên thiết bị** khi mạng kém hoặc cần phản ứng tại chỗ |

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn **SQS** cho "nhiều hệ thống cùng nhận một sự kiện" | Hàng đợi ⇒ một consumer; cần **SNS** (hoặc SNS → nhiều SQS) |
| Chọn **SNS** cho "đệm tải để không mất request khi hạ nguồn chậm" | Đệm là việc của **SQS** |
| Chọn **Lambda** cho "điều phối 8 bước có nhánh và thử lại" | Đó là **Step Functions** |
| Chọn **CloudWatch** cho "request này chậm ở service nào" | Đó là **X-Ray** |
| Chọn **CodeDeploy** cho "nối build, test, deploy thành một luồng" | Đó là **CodePipeline** |
| Chọn **WorkSpaces** cho "chỉ cần stream một ứng dụng CAD" | Đó là **AppStream 2.0** |
| Chọn **IoT Core** cho "xử lý tại chỗ khi mất mạng" | Đó là **IoT Greengrass** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Tách bằng SQS | Hạ nguồn sập thì thông điệp vẫn nằm trong hàng đợi | Thêm độ trễ; phải xử lý thông điệp trùng và thứ tự |
| EventBridge thay gọi trực tiếp | Thêm consumer mà không sửa producer | Luồng trở nên khó lần theo; cần đặt tên và quy ước sự kiện |
| Step Functions | Thấy được đang ở bước nào, thử lại có kiểm soát | Có phí theo bước; luồng rất đơn giản thì là thừa |
| AMS | Không cần đội vận hành | Phí cao, và mất một phần quyền tự quyết về vận hành |

## Related Topics

- [AI/ML và analytics](ai-ml-and-analytics.md) — Kinesis ⇄ SQS, và phần analytics
- [Compute](compute.md) — Lambda là thứ hầu hết các service ở đây gọi tới
- [Cách triển khai và truy cập](deploy-and-access-methods.md) — CloudShell, Cloud9, IaC
- [Support và tài nguyên kỹ thuật](support-and-technical-resources.md) — AWS Support, AMS, IQ, Activate
- [AWS · Foundations](../index.md)
