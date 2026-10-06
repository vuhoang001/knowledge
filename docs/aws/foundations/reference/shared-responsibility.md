---
title: Shared responsibility model
sidebar_position: 5
description: "Security OF the cloud là của AWS, security IN the cloud là của khách. Ranh giới dịch chuyển theo service — EC2, RDS và Lambda chia khác nhau."
tags: [aws, clf-c02, shared-responsibility, security, iaas-paas, domain-2]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Shared responsibility model

> **Chốt:** AWS lo **security *of* the cloud**, khách lo **security *in* the cloud**. Nhưng
> ranh giới **không cố định** — nó dịch theo service. Dùng EC2 thì khách vá OS; dùng RDS
> thì AWS vá OS mà khách vẫn quản user trong database. Đề hỏi đúng chỗ dịch chuyển đó.

## Mục tiêu

Task 2.1 đòi bốn thứ: nhận ra các thành phần của model, nói được **phần của khách**, nói
được **phần của AWS**, và nói được **ranh giới dịch chuyển theo service** (guide nêu tên
RDS, Lambda, EC2).

## Tổng quan

### Hai nửa

| | AWS — *security **of** the cloud* | Khách — *security **in** the cloud* |
|---|---|---|
| Phần cứng | Server, ổ đĩa, thiết bị mạng | — |
| Cơ sở vật chất | Data center, điện, làm mát, an ninh vật lý | — |
| Hạ tầng ảo hoá | Hypervisor, hạ tầng Region/AZ | — |
| Vứt bỏ ổ đĩa an toàn | ✅ | — |
| OS và patch | **Tuỳ service** | **Tuỳ service** |
| Dữ liệu của khách | — | ✅ **Luôn luôn** |
| Phân loại dữ liệu | — | ✅ |
| IAM — user, group, role, policy | — | ✅ **Luôn luôn** |
| Mã hoá phía client, quản khoá | — | ✅ |
| Cấu hình firewall (SG, NACL) | — | ✅ |
| Cấu hình network và truyền | Hạ tầng mạng | Cấu hình của khách |

**Hai dòng không bao giờ dịch chuyển:** *dữ liệu của khách* và *IAM*. Dù dùng service
serverless nhất đi nữa, hai thứ đó vẫn là của khách. Đáp án nào nói AWS quản IAM policy
của bạn là sai, không cần đọc tiếp.

### Ranh giới dịch theo service

| Service | AWS lo | Khách lo |
|---|---|---|
| **EC2** (IaaS) | Phần cứng, hypervisor | **Guest OS + patch**, app, firewall (SG), mã hoá, IAM, dữ liệu |
| **RDS** (managed) | Phần cứng, OS, patch engine DB, backup tự động | **User và quyền trong DB**, cấu hình mạng/SG, mã hoá, dữ liệu, IAM |
| **Lambda** (serverless) | Mọi thứ tới runtime | **Mã nguồn**, IAM role của function, dữ liệu, biến môi trường |
| **S3** (managed) | Hạ tầng lưu trữ, độ bền | **Ai được truy cập**, bucket policy, bật mã hoá, versioning |

Đọc bảng theo chiều từ trên xuống: **càng managed, phần của khách càng hẹp — nhưng không
bao giờ bằng không.** Mô hình này đôi khi gọi là *inherited controls*: khách thừa hưởng
các kiểm soát vật lý và môi trường từ AWS.

### Ba loại kiểm soát

| Loại | Nghĩa | Ví dụ |
|---|---|---|
| **Inherited** | Khách thừa hưởng hoàn toàn từ AWS | An ninh vật lý, kiểm soát môi trường |
| **Shared** | Hai bên làm ở hai tầng khác nhau | Patch (AWS vá hạ tầng, khách vá guest OS) · quản lý cấu hình · nhận thức và đào tạo |
| **Customer specific** | Hoàn toàn của khách | Phân loại dữ liệu, IAM, mã hoá dữ liệu |

### Patch: chỗ dễ nói sai nhất

| Service | Ai vá OS | Ai vá app/engine |
|---|---|---|
| EC2 | **Khách** | Khách |
| RDS | AWS | AWS vá engine; khách chọn **cửa sổ bảo trì** và phiên bản |
| Lambda | AWS | Khách chỉ lo dependency trong package của mình |
| ECS trên EC2 | **Khách** (vá EC2 làm node) | Khách lo image container |
| ECS trên **Fargate** | AWS | Khách lo image container |

Hai dòng cuối là cặp bẫy phổ biến: **ECS không tự nghĩa là không quản server.** Chỉ khi
launch type là **Fargate** thì mới hết việc vá node — xem [compute](compute.md).

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| "AWS lo bảo mật, khách không phải làm gì" | Khách luôn giữ dữ liệu và IAM |
| "Dùng RDS nên AWS quản luôn user trong database" | AWS vá engine, **khách tạo và phân quyền user** |
| "AWS mã hoá dữ liệu của tôi mặc định nên tôi không cần nghĩ" | Khách là người **bật** và chọn cách quản khoá |
| "Dùng container nên không phải vá OS" | Chỉ đúng với **Fargate**; ECS/EKS trên EC2 thì khách vẫn vá node |
| "AWS chịu trách nhiệm nếu security group mở cổng 22 cho cả thế giới" | Cấu hình firewall là của khách — **AWS không sửa cấu hình của bạn** |

## Đánh đổi

| Hướng | Được | Mất |
|---|---|---|
| Đi về phía managed/serverless | Phần bảo mật phải tự lo hẹp lại; AWS vá nhanh hơn người | Ít quyền tinh chỉnh; phụ thuộc lịch bảo trì của AWS |
| Giữ EC2 tự quản | Toàn quyền OS, cài gì cũng được, BYOL dễ | Gánh toàn bộ việc vá — và lỗ hổng chưa vá là **trách nhiệm của khách** |

Trong đề, cụm **"reduce operational overhead"** hầu như luôn đẩy đáp án về phía managed,
chính vì nó đẩy ranh giới này sang phía AWS.

## Related Topics

- [Access management](access-management.md) — IAM, nửa không bao giờ dịch chuyển
- [Governance và compliance](security-governance-compliance.md) — AWS Artifact là nơi lấy bằng chứng cho *phần của AWS*
- [Thành phần bảo mật](security-components.md) — SG, NACL, WAF: công cụ cho *phần của khách*
- [Compute](compute.md) — Fargate ⇄ EC2 launch type, chỗ ranh giới dịch chuyển rõ nhất
- [AWS · Foundations](../index.md)
