---
title: Compute
i18n_status: untranslated
sidebar_position: 11
description: "Năm họ instance EC2, ba cách chạy container, hai loại serverless. Và ranh giới hay bị bỏ qua: ECS/EKS không tự nghĩa là hết việc quản server."
tags: [aws, clf-c02, ec2, lambda, fargate, ecs, eks, auto-scaling, elb, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Compute

> **Chốt:** Ba bậc trách nhiệm. **EC2** — bạn quản OS. **Container trên EC2** — bạn vẫn
> quản node. **Fargate / Lambda** — không còn server nào để quản. Mọi câu hỏi có cụm
> *"without managing servers"* hoặc *"reduce operational overhead"* đẩy đáp án xuống bậc
> thấp nhất đang khả thi.

## Mục tiêu

Task 3.3 đòi: chọn đúng **loại instance EC2**, chọn đúng **tuỳ chọn container**, chọn đúng
**serverless**, hiểu **auto scaling cho elasticity**, và hiểu **mục đích của load balancer**.

## Tổng quan

### Năm họ instance EC2

| Họ | Tối ưu cho | Dấu hiệu trong đề |
|---|---|---|
| **General purpose** (T, M) | Cân bằng CPU/RAM/mạng | Web server, môi trường dev |
| **Compute optimized** (C) | CPU cao | Xử lý theo lô, mã hoá, game server, HPC |
| **Memory optimized** (R, X) | RAM lớn | Database trong bộ nhớ, cache, phân tích tập lớn |
| **Storage optimized** (I, D) | IOPS cục bộ rất cao | Data warehouse, NoSQL tự dựng, log xử lý tuần tự |
| **Accelerated computing** (P, G, Inf) | GPU / chip chuyên dụng | Huấn luyện ML, suy luận, dựng hình |

Đề không hỏi tên instance cụ thể — nó mô tả workload rồi hỏi **họ nào**. Đọc câu hỏi tìm
chữ: *CPU-intensive* → C · *in-memory / large dataset in RAM* → R · *high local IOPS* → I ·
*machine learning training* → P/G.

### Container: ba lựa chọn, và chỗ bị hiểu sai

| Service | Là gì | Ai quản server |
|---|---|---|
| **Amazon ECR** | Nơi **lưu image** container | — |
| **Amazon ECS** | Orchestrator **của AWS** | Tuỳ launch type |
| **Amazon EKS** | **Kubernetes** được quản | Tuỳ launch type |
| **AWS Fargate** | **Launch type serverless** cho ECS và EKS | **AWS** |

**Fargate không phải đối thủ của ECS/EKS — nó là cách chạy chúng.** ECS/EKS với launch
type EC2 nghĩa là bạn vẫn sở hữu, vá, và trả tiền cho node theo giờ. Với Fargate thì
không còn node. Đây đúng là chỗ
[shared responsibility](shared-responsibility.md) dịch chuyển.

ECS ⇄ EKS trong đề: *đã dùng Kubernetes / cần chuẩn Kubernetes* → **EKS**; không nhắc
Kubernetes, muốn đơn giản nhất → **ECS**.

### Serverless

| Service | Mô hình | Giới hạn đáng nhớ |
|---|---|---|
| **AWS Lambda** | Chạy **hàm** theo sự kiện, trả theo số lần gọi và thời gian chạy | Mỗi lần chạy có **thời gian tối đa 15 phút** |
| **AWS Fargate** | Chạy **container**, không quản node | Không giới hạn kiểu 15 phút |
| **AWS Batch** | Chạy **job theo lô**, tự xếp hàng và cấp tài nguyên | Dành cho lô lớn, chạy lâu |

Ba dòng đó là một bộ phân loại hay ra đề: *event-driven, ngắn* → Lambda · *tiến trình chạy
lâu, đã đóng container* → Fargate · *hàng nghìn job tính toán theo lô* → Batch.

### Các cách chạy khác

| Service | Dùng khi |
|---|---|
| **Amazon Lightsail** | Muốn **giá cố định hằng tháng**, dựng nhanh một web/WordPress — đơn giản hơn EC2 |
| **AWS Elastic Beanstalk** | Có code, muốn AWS tự dựng EC2 + ELB + Auto Scaling |
| **AWS Outposts / Local Zones / Wavelength** | Cần compute ở chỗ đặc biệt — xem [global infrastructure](global-infrastructure.md) |

Lightsail ⇄ EC2: *predictable monthly price, simple* → Lightsail.

### Elastic Load Balancing và Auto Scaling: hai việc, không thay nhau được

| | Elastic Load Balancing | Auto Scaling |
|---|---|---|
| Việc | **Phân phối** traffic tới nhiều target, qua nhiều AZ | **Thêm/bớt** instance theo tải |
| Giải quyết | Một instance chết thì traffic đi chỗ khác; **high availability** | Tải lên thì có thêm máy, tải xuống thì bớt; **elasticity** |
| Có **health check** | Có — bỏ target không lành ra khỏi vòng | Có — thay instance chết |

**Chúng hầu như luôn đi cặp**: ELB đứng trước, Auto Scaling group đứng sau. Nhưng câu hỏi
"AZ sập thì sao" trả lời bằng **nhiều AZ + ELB**, còn "tải tăng gấp mười vào thứ Sáu" trả
lời bằng **Auto Scaling**.

Bốn loại load balancer cần nhận ra tên: **ALB** (HTTP/HTTPS, định tuyến theo đường dẫn),
**NLB** (TCP/UDP, hiệu năng rất cao), **GWLB** (chèn thiết bị kiểm tra), **CLB** (thế hệ cũ).

**AWS Auto Scaling** (khác *EC2 Auto Scaling*) là tầng điều phối scaling cho nhiều loại
tài nguyên, không chỉ EC2. **AWS Compute Optimizer** đọc số liệu thật rồi đề xuất đổi cỡ —
đó là công cụ của [rightsizing](cloud-economics.md).

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| "Dùng ECS nên không phải quản server" | Chỉ đúng với **Fargate**; launch type EC2 thì vẫn phải vá node |
| Chọn **Auto Scaling** cho "chịu được một AZ sập" | Đó là HA ⇒ nhiều AZ + ELB |
| Chọn **ELB** cho "giảm chi phí khi tải thấp" | ELB không bớt instance; đó là Auto Scaling |
| Chọn **Lambda** cho job chạy 2 giờ | Lambda tối đa **15 phút** mỗi lần chạy ⇒ Fargate hoặc Batch |
| Chọn **EC2** cho "chạy code theo sự kiện, không quản hạ tầng" | Đó là Lambda |
| Chọn **compute optimized** cho "giữ tập dữ liệu lớn trong RAM" | Đó là **memory optimized** |
| Chọn **Lightsail** cho kiến trúc cần tinh chỉnh sâu | Lightsail đổi tính linh hoạt lấy sự đơn giản |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Lambda thay EC2 | Không quản server, không trả tiền khi rảnh | Giới hạn thời gian chạy; cold start; khó chuyển sang nơi khác |
| Fargate thay ECS-on-EC2 | Hết việc vá node | Đơn giá tính theo vCPU/RAM thường cao hơn khi tải **đều và cao** |
| EKS thay ECS | Chuẩn Kubernetes, chuyển được giữa các nơi | Phức tạp hơn nhiều, có phí control plane |
| Auto Scaling | Chỉ trả cho tải thật | Phải chọn metric và ngưỡng đúng; scale sai nhịp thì vừa chậm vừa tốn |
| Lightsail thay EC2 | Giá cố định, dựng rất nhanh | Khó mở rộng sang kiến trúc phức tạp |

## Related Topics

- [Global infrastructure](global-infrastructure.md) — Multi-AZ là tiền đề của ELB và Auto Scaling
- [Shared responsibility model](shared-responsibility.md) — ranh giới dịch rõ nhất ở Fargate ⇄ EC2
- [Pricing model](pricing-models.md) — On-Demand, Spot, Reserved, Savings Plans áp lên chính compute này
- [Network](networking.md) — instance nằm trong subnet nào, SG nào
- [Cách triển khai và truy cập](deploy-and-access-methods.md) — Beanstalk dựng sẵn bộ EC2 + ELB + ASG
- [AWS · Foundations](../index.md)
