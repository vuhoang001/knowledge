---
title: Network
sidebar_position: 13
description: "VPC, subnet, bốn loại gateway, SG so với NACL, Route 53 và hai service edge. Subnet nằm trong đúng một AZ — đó là gốc của mọi thiết kế HA."
tags: [aws, clf-c02, vpc, subnet, nat-gateway, route-53, cloudfront, security-group, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Network

> **Chốt:** **VPC** là mạng riêng của bạn trong **một Region**; **subnet** nằm trong **đúng
> một AZ**. Public subnet = subnet có route ra **Internet Gateway**. Đó là định nghĩa thật —
> không phải "subnet có tên là public".

## Mục tiêu

Task 3.5 đòi: thành phần của VPC (subnet, gateway), bảo mật trong VPC (**SG ⇄ NACL**), mục
đích của **Route 53**, các **edge service**, và các **tuỳ chọn kết nối** vào AWS.

## Tổng quan

### Các thành phần của VPC

| Thành phần | Phạm vi | Việc của nó |
|---|---|---|
| **VPC** | Một **Region** | Mạng riêng ảo, có dải CIDR riêng |
| **Subnet** | Một **AZ** duy nhất | Chia dải địa chỉ; là đơn vị đặt tài nguyên |
| **Route table** | VPC / subnet | Quyết định gói đi đâu — **đây là thứ làm subnet thành public** |
| **Internet Gateway (IGW)** | VPC | Cho tài nguyên có IP công cộng đi ra và vào internet |
| **NAT Gateway** | Một AZ | Cho tài nguyên trong **private** subnet **đi ra** internet, không cho vào |
| **Virtual Private Gateway** | VPC | Đầu AWS của **Site-to-Site VPN** |
| **VPC Endpoint** | VPC | Gọi service AWS (ví dụ S3) **không qua internet** |
| **VPC Peering / Transit Gateway** | Giữa các VPC | Nối VPC với nhau (Transit Gateway cho nhiều VPC/account) |

**Subnet nằm trong một AZ** là câu có hệ quả lớn nhất ở đây: muốn Multi-AZ thì phải có
**ít nhất một subnet ở mỗi AZ**. Mọi kiến trúc HA trong đề đều bắt đầu từ đó.

**NAT Gateway tính tiền theo giờ và theo GB xử lý**, và **không thuộc Free Tier** — đây là
nguồn hoá đơn bất ngờ phổ biến nhất của người mới.

### Security group ⇄ Network ACL

| | Security group | Network ACL |
|---|---|---|
| Gắn vào | ENI / instance | **Subnet** |
| Rule | **Chỉ allow** | Allow **và deny** |
| Trạng thái | **Stateful** — gói về được tự động cho qua | **Stateless** — phải mở cả hai chiều |
| Đánh giá | Mọi rule, hợp lại | **Theo số thứ tự**, khớp đầu tiên thì dừng |
| Mặc định | Deny hết inbound, allow hết outbound | NACL mặc định allow hết cả hai chiều |

Ba kết luận cho đề:

- **Chặn một IP** → NACL. SG không biểu đạt được "deny".
- **Mở một cổng cho một nhóm máy** → SG, và SG có thể trỏ tới **SG khác** làm nguồn.
- Kết nối "đi được mà không về được" → gần như luôn là **quên outbound rule của NACL**.

Chi tiết WAF, Shield, Network Firewall: [security-components](security-components.md).

### Route 53

DNS được quản, và ba việc nó làm:

| Việc | Nghĩa |
|---|---|
| Đăng ký và host domain | Registrar + authoritative DNS |
| **Routing policy** | simple · weighted · latency-based · failover · geolocation · multivalue |
| **Health check** | Phát hiện endpoint chết và chuyển hướng |

Trong đề: **"chuyển người dùng sang Region khác khi Region chính sập"** → Route 53 **failover
routing** + health check. **"Người dùng tới endpoint gần nhất"** → latency-based routing.

### Hai service edge

| Service | Tối ưu | Giao thức | Dấu hiệu |
|---|---|---|---|
| **Amazon CloudFront** | **Cache** nội dung ở edge location | HTTP/HTTPS | *static content*, *video*, *cache*, *reduce origin load* |
| **AWS Global Accelerator** | **Đường đi mạng** + IP tĩnh toàn cầu | TCP/UDP | *static anycast IP*, *non-HTTP*, *fast regional failover* |

**Amazon API Gateway** cũng nằm trong nhóm Networking của exam guide: nó là cửa vào cho
API — xác thực, throttling, phiên bản — thường đứng trước Lambda.

### Kết nối từ ngoài vào AWS

| Cách | Đặc điểm |
|---|---|
| Internet công cộng | Mặc định, không chuẩn bị |
| **AWS Site-to-Site VPN** | Mã hoá, qua internet, dựng **trong vài giờ** |
| **AWS Direct Connect** | Đường vật lý riêng, băng thông và độ trễ **ổn định**, lắp đặt **nhiều tuần** |
| **AWS Client VPN** | Cho từng người dùng kết nối vào VPC |

Xem thêm [cách triển khai và truy cập](deploy-and-access-methods.md) — ba dấu hiệu quyết
định giữa VPN, Direct Connect và Snow Family.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Dùng **SG** để chặn một IP tấn công | SG chỉ có allow ⇒ **NACL** |
| Quên rule outbound của NACL | NACL stateless ⇒ kết nối treo, không báo lỗi gì |
| Cho rằng một subnet trải trên nhiều AZ | Một subnet thuộc **đúng một** AZ |
| Dùng **IGW** cho private subnet ra internet | Đó là **NAT Gateway** (private không có IP công cộng) |
| Cho rằng NAT Gateway miễn phí | Tính theo giờ + theo GB, **không thuộc Free Tier** |
| Chọn **CloudFront** cho giao thức TCP/UDP không phải web | Đó là **Global Accelerator** |
| Chọn **Direct Connect** để "nối hai VPC" | Đó là **VPC Peering** hoặc **Transit Gateway** |
| Truy cập S3 từ private subnet bằng cách mở NAT | Rẻ và kín hơn: **VPC Endpoint** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Private subnet + NAT Gateway | Tài nguyên không phơi ra internet | Phí NAT theo giờ và theo GB; NAT trong một AZ là một điểm lỗi |
| VPC Endpoint thay NAT cho S3 | Không qua internet, giảm phí data transfer | Phải cấu hình thêm; endpoint interface có phí riêng |
| NACL ngoài SG | Thêm một hàng rào cấp subnet | Stateless ⇒ dễ tự chặn mình; rule đánh số khó đọc |
| Direct Connect | Băng thông, độ trễ ổn định | Phí cố định, lắp lâu; cần VPN dự phòng để khỏi thành điểm lỗi |
| Transit Gateway thay nhiều peering | Một chỗ định tuyến, đỡ rối khi nhiều VPC | Có phí theo attachment và theo lượng dữ liệu |

## Related Topics

- [Global infrastructure](global-infrastructure.md) — subnet ⇄ AZ, và vì sao Multi-AZ bắt đầu từ subnet
- [Thành phần bảo mật](security-components.md) — SG, NACL, WAF, Shield xếp thành bốn tầng
- [Compute](compute.md) — ELB phân tải qua các subnet ở nhiều AZ
- [Cách triển khai và truy cập](deploy-and-access-methods.md) — VPN, Direct Connect, hybrid
- [Case study: security group không chặn được một IP](../case-studies/security-group-khong-chan-duoc-ip.md)
- [AWS · Foundations](../index.md)
