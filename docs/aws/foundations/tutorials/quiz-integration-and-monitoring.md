---
title: "Câu hỏi: Integration & monitoring"
sidebar_position: 9
description: "Tự chấm phần messaging (SQS/SNS/Kinesis) và monitoring (CloudWatch/CloudTrail)."
tags: [aws, clf-c02, quiz, monitoring]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-13
---

> **Chốt:** Tự chấm phần integration & monitoring. Đọc kỹ loại câu (multiple choice =
> một đáp án; multiple response = chọn đúng số lượng ghi trong đề).

## Phần A — Messaging / integration

### Câu 1 (multiple choice)

Cần **decouple** một producer và một consumer sao cho nếu consumer tạm ngừng thì message
không bị mất mà chờ được xử lý sau. Dịch vụ nào phù hợp nhất?

- A. SNS
- B. SQS
- C. Kinesis Data Streams
- D. EventBridge

<details>
<summary>Đáp án</summary>

**B — SQS.** Hàng đợi giữ message lại cho tới khi consumer kéo (pull) về xử lý; consumer
ngừng thì message vẫn nằm chờ. SNS push và không lưu nếu không có subscriber. Kinesis là
cho streaming real-time.

</details>

### Câu 2 (multiple choice)

Bạn muốn một event được **gửi đồng thời tới nhiều subscriber** (fan-out) theo mô hình
pub/sub. Chọn dịch vụ.

- A. SQS
- B. SNS
- C. Amazon MQ
- D. Step Functions

<details>
<summary>Đáp án</summary>

**B — SNS.** Pub/sub, push message từ một topic tới nhiều subscriber cùng lúc (fan-out).
SQS là one-to-one, pull-based.

</details>

### Câu 3 (multiple choice)

Đâu là điểm khác biệt đúng giữa SQS và SNS?

- A. SQS là push, SNS là pull
- B. SQS là one-to-many, SNS là one-to-one
- C. SQS là pull (consumer poll), SNS là push (đẩy tới subscriber)
- D. Cả hai đều lưu message vĩnh viễn như nhau

<details>
<summary>Đáp án</summary>

**C.** SQS: consumer **pull/poll** message từ queue (one-to-one). SNS: **push** message
tới nhiều subscriber (one-to-many, fan-out).

</details>

### Câu 4 (multiple choice)

Hệ thống cần **ingest và phân tích dữ liệu streaming real-time** (clickstream, IoT
telemetry). Dịch vụ nào?

- A. SQS
- B. SNS
- C. Kinesis
- D. CloudTrail

<details>
<summary>Đáp án</summary>

**C — Kinesis.** Nền tảng cho real-time streaming (Data Streams để thu nhận và xử lý,
Firehose để nạp vào S3/Redshift...). SQS/SNS là messaging, không phải streaming analytics.

</details>

### Câu 5 (multiple choice)

Muốn **orchestrate một workflow nhiều bước** (phối hợp nhiều Lambda theo luồng có nhánh
và retry) dưới dạng state machine. Chọn dịch vụ.

- A. Step Functions
- B. EventBridge
- C. API Gateway
- D. SQS

<details>
<summary>Đáp án</summary>

**A — Step Functions.** Orchestrate workflow thành state machine. EventBridge chỉ là
event bus định tuyến event, không điều phối luồng nhiều bước.

</details>

### Câu 6 (multiple choice)

Bạn cần một **event bus serverless** để định tuyến event giữa các AWS service và ứng dụng
SaaS theo rule. Dịch vụ nào?

- A. SNS
- B. EventBridge
- C. Kinesis Firehose
- D. AppSync

<details>
<summary>Đáp án</summary>

**B — EventBridge.** Event bus định tuyến event theo rule, tích hợp sẵn nhiều AWS service
và SaaS.

</details>

### Câu 7 (multiple choice)

Team đang migrate một ứng dụng dùng **RabbitMQ/ActiveMQ** lên AWS và không muốn viết lại
code messaging theo API mới. Dịch vụ nào phù hợp nhất?

- A. SQS
- B. SNS
- C. Amazon MQ
- D. Kinesis Data Streams

<details>
<summary>Đáp án</summary>

**C — Amazon MQ.** Managed broker cho ActiveMQ/RabbitMQ, giữ nguyên giao thức/API chuẩn
công nghiệp nên ít phải viết lại. SQS/SNS buộc dùng API riêng của AWS.

</details>

### Câu 8 (multiple response — chọn 2)

Pattern **fan-out bền (durable)**: một event cần tới nhiều consumer độc lập, mỗi consumer
xử lý theo nhịp riêng và không được mất message. Nên ghép những dịch vụ nào? (Chọn 2)

- A. SNS topic
- B. Nhiều SQS queue subscribe vào topic
- C. CloudTrail
- D. X-Ray
- E. API Gateway

<details>
<summary>Đáp án</summary>

**A và B.** SNS fan-out ra nhiều SQS queue: SNS broadcast, mỗi SQS queue cho một consumer
xử lý độc lập và giữ message bền. Đây là pattern kinh điển kết hợp push (SNS) với độ bền
của queue (SQS).

</details>

### Câu 9 (multiple choice)

Bạn muốn tạo và quản lý một **REST/HTTP API** làm cửa trước cho backend Lambda. Dịch vụ?

- A. AppSync
- B. API Gateway
- C. EventBridge
- D. SNS

<details>
<summary>Đáp án</summary>

**B — API Gateway.** Tạo/publish/quản lý REST & HTTP API. AppSync là cho GraphQL.

</details>

## Phần B — Monitoring / observability

### Câu 10 (multiple choice)

Bạn cần biết **ai đã gọi API nào, khi nào, từ đâu** trong account để phục vụ audit và
điều tra bảo mật. Dịch vụ nào?

- A. CloudWatch
- B. CloudTrail
- C. X-Ray
- D. AWS Health Dashboard

<details>
<summary>Đáp án</summary>

**B — CloudTrail.** Ghi lại mọi API call (ai làm gì, khi nào) — audit, governance,
compliance. Nhớ: **Trail** = dấu vết để lại.

</details>

### Câu 11 (multiple choice)

Bạn muốn **theo dõi CPU của EC2 và đặt alarm** khi vượt ngưỡng để kích hoạt Auto Scaling.
Dịch vụ nào?

- A. CloudTrail
- B. CloudWatch
- C. X-Ray
- D. EventBridge

<details>
<summary>Đáp án</summary>

**B — CloudWatch.** Metrics (CPU...) + alarms theo ngưỡng + hành động (Auto Scaling, SNS).
CloudWatch = "chuyện gì đang xảy ra với tài nguyên".

</details>

### Câu 12 (multiple choice)

Trong một kiến trúc microservices, một request đi qua nhiều service và bạn cần **tìm xem
khâu nào chậm/lỗi** bằng cách lần theo trace của request. Dịch vụ nào?

- A. CloudWatch Logs
- B. CloudTrail
- C. X-Ray
- D. Kinesis

<details>
<summary>Đáp án</summary>

**C — X-Ray.** Distributed tracing: lần theo request xuyên nhiều service để debug và tìm
bottleneck.

</details>

### Câu 13 (multiple choice)

Phát biểu nào **đúng** về khác biệt giữa CloudWatch và CloudTrail?

- A. CloudWatch ghi lịch sử API call; CloudTrail đo metric hiệu năng
- B. CloudWatch đo metric/log/alarm (hiệu năng); CloudTrail ghi lịch sử API call (audit)
- C. Cả hai đều chỉ dùng để audit
- D. CloudTrail dùng để đặt alarm còn CloudWatch dùng để tracing

<details>
<summary>Đáp án</summary>

**B.** CloudWatch = performance/metrics/log/alarm. CloudTrail = audit/API history (ai làm
gì). Đây là cặp phân biệt cực hay ra đề.

</details>

### Câu 14 (multiple choice)

Bạn muốn xem **tình trạng sức khoẻ của các dịch vụ AWS** và các sự kiện/bảo trì ảnh hưởng
tới tài nguyên của mình. Dịch vụ nào?

- A. CloudWatch Dashboards
- B. AWS Health Dashboard
- C. CloudTrail
- D. X-Ray

<details>
<summary>Đáp án</summary>

**B — AWS Health Dashboard.** Hiển thị sức khoẻ dịch vụ AWS và sự kiện ảnh hưởng tới tài
nguyên của bạn.

</details>

### Câu 15 (multiple response — chọn 2)

Những khả năng nào sau đây thuộc về **CloudWatch**? (Chọn 2)

- A. Thu thập metric và đặt alarm theo ngưỡng
- B. Tập trung và lưu log từ ứng dụng/EC2/Lambda
- C. Ghi lại ai đã gọi API nào để audit
- D. Distributed tracing qua nhiều microservice
- E. Managed GraphQL API

<details>
<summary>Đáp án</summary>

**A và B.** Metrics/alarms và Logs là của CloudWatch. C là CloudTrail, D là X-Ray, E là
AppSync.

</details>

### Câu 16 (multiple choice)

Auditor hỏi: "Ba tháng trước ai đã tạo security group này và từ IP nào?" Bạn tra ở đâu?

- A. CloudWatch Metrics
- B. CloudWatch Dashboards
- C. CloudTrail
- D. X-Ray

<details>
<summary>Đáp án</summary>

**C — CloudTrail.** Lịch sử API call (ai, khi nào, từ đâu) là đúng việc của CloudTrail,
không phải CloudWatch.

</details>

## Related Topics

- [Integration & monitoring](../reference/other-service-categories.md)
- [AWS — index](../index.md)
