---
title: Global infrastructure
sidebar_position: 10
description: "Region, Availability Zone, edge location — và bốn thứ dễ lẫn: Local Zone, Wavelength, Outposts, CloudFront. Nền của mọi câu hỏi về high availability."
tags: [aws, clf-c02, region, availability-zone, edge-location, outposts, high-availability, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Global infrastructure

> **Chốt:** **Region** là một vùng địa lý; trong đó có **nhiều Availability Zone** cách
> nhau về vật lý và **không chia sẻ điểm lỗi đơn**. High availability = **nhiều AZ**.
> Disaster recovery, chủ quyền dữ liệu, độ trễ cho người dùng xa = **nhiều Region**.
> Hai câu đó là hai câu hỏi khác nhau, và đó là nửa số câu HA trong đề.

## Mục tiêu

Task 3.2 đòi: quan hệ Region ⇄ AZ ⇄ edge location, cách đạt HA bằng nhiều AZ, hiểu rằng
**AZ không chia sẻ single point of failure**, biết khi nào dùng **nhiều Region**, và lợi
ích của **edge location**.

## Tổng quan

### Ba tầng

| Tầng | Là gì | Dùng để |
|---|---|---|
| **Region** | Một vùng địa lý, gồm **nhiều AZ** (thường ≥3) | Chọn chỗ đặt dữ liệu và workload |
| **Availability Zone** | Một hoặc nhiều data center, nguồn/mạng/làm mát **độc lập**, cách nhau về vật lý nhưng nối bằng đường độ trễ thấp | **Chịu lỗi** trong một Region |
| **Edge location** / Point of Presence | Hàng trăm điểm, gần người dùng cuối | **Cache** nội dung, giảm độ trễ |

Hai tính chất của AZ cần nhớ nguyên văn: **cách nhau đủ xa để một thảm hoạ không đánh cả
hai**, và **gần nhau đủ để đồng bộ với độ trễ thấp**. Cả hai đồng thời — đó là lý do
Multi-AZ khả thi mà Multi-Region thì phải tính đến độ trễ.

### Chọn Region theo bốn tiêu chí

| Tiêu chí | Nghĩa |
|---|---|
| **Tuân thủ / chủ quyền dữ liệu** | Luật buộc dữ liệu nằm trong một quốc gia — tiêu chí **cứng**, xét trước |
| **Độ trễ tới người dùng** | Gần người dùng thì nhanh hơn |
| **Giá** | Giá **khác nhau giữa các Region** cho cùng một service |
| **Service có sẵn** | Service mới không ra mắt đồng thời ở mọi Region |

### Multi-AZ ⇄ Multi-Region: dùng cho hai việc khác nhau

| Yêu cầu trong câu hỏi | Đáp án |
|---|---|
| "chịu được một data center/AZ sập" | **Nhiều AZ** |
| "chịu được cả một Region sập" | **Nhiều Region** |
| "dữ liệu phải ở trong nước" | **Chọn Region** cụ thể |
| "người dùng ở châu Âu thấy chậm" | **Nhiều Region**, hoặc **CloudFront** |
| "disaster recovery / business continuity" | **Nhiều Region** |

Multi-Region đắt và phức tạp hơn hẳn: phải nhân bản dữ liệu qua khoảng cách lớn, và
**data transfer giữa các Region có phí** — xem [pricing-models](pricing-models.md).

### Bốn loại hạ tầng "ngoài Region" dễ lẫn

| Thứ | Nó ở đâu | Dùng khi |
|---|---|---|
| **Edge location** (CloudFront) | Hàng trăm PoP toàn cầu | Cache nội dung tĩnh/động gần người dùng |
| **AWS Local Zones** | Phần mở rộng của Region, đặt **gần một thành phố lớn** | Cần **vài ms** cho người dùng ở đô thị đó |
| **AWS Wavelength** | Trong hạ tầng của **nhà mạng 5G** | Ứng dụng di động cần độ trễ cực thấp qua 5G |
| **AWS Outposts** | **Tủ rack AWS đặt trong data center của khách** | Phải chạy tại chỗ: độ trễ nội bộ, dữ liệu không được ra ngoài |

Phân biệt bằng *ai sở hữu chỗ đặt*: AWS (edge, Local Zone) · nhà mạng (Wavelength) ·
**khách** (Outposts).

### Hai service edge dễ lẫn

| Service | Tối ưu cái gì | Giao thức |
|---|---|---|
| **Amazon CloudFront** | **Cache nội dung** ở edge | HTTP/HTTPS — web, video, API |
| **AWS Global Accelerator** | **Đường đi mạng** tới ứng dụng, cho IP tĩnh toàn cầu | TCP/UDP — kể cả không phải web |

Trong đề: *cache static content* → CloudFront · *static anycast IP, non-HTTP protocol,
failover nhanh giữa Region* → Global Accelerator.

### High availability trong thực tế

Ba tầng xếp từ rẻ tới đắt:

1. **Nhiều AZ trong một Region** — mặc định của mọi kiến trúc HA. ELB phân tải qua AZ,
   Auto Scaling thay instance chết, RDS Multi-AZ có standby ở AZ khác.
2. **Nhiều Region** — chịu được mất cả Region; cần nhân bản dữ liệu và chuyển hướng DNS
   (Route 53).
3. **Edge** — không phải HA, mà là **độ trễ**; nhưng cũng giảm tải cho origin.

Một số service **vốn đã là toàn cầu / nhiều AZ sẵn**: S3 (độ bền trên nhiều AZ),
DynamoDB, Route 53, CloudFront, IAM. Chúng không cần bạn tự dựng HA.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| "Một AZ là một data center" | Một AZ có thể gồm **nhiều** data center |
| Dùng nhiều Region để chống **một AZ** sập | Quá mức và đắt — Multi-AZ là đủ |
| Dùng nhiều AZ để đáp ứng **chủ quyền dữ liệu** | Đó là chuyện chọn **Region** |
| Chọn **CloudFront** cho giao thức không phải HTTP | Đó là **Global Accelerator** |
| Chọn **Local Zones** cho "dữ liệu không được rời data center của chúng tôi" | Đó là **Outposts** |
| Cho rằng mọi service có ở mọi Region | Không — service mới ra mắt theo từng Region |
| Cho rằng giá giống nhau mọi Region | Giá khác nhau theo Region |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Multi-AZ | Chịu lỗi hạ tầng, độ trễ đồng bộ thấp | Nhân đôi tài nguyên ⇒ tăng chi phí |
| Multi-Region | Chịu mất cả Region, phục vụ người dùng xa | Đắt, phức tạp, **phí data transfer liên Region**, phải xử lý nhất quán dữ liệu |
| Thêm CloudFront | Giảm độ trễ, giảm tải origin, giảm phí egress từ origin | Phải nghĩ về invalidation và TTL; nội dung cũ có thể còn được phục vụ |
| Outposts | Dữ liệu ở tại chỗ, API giống AWS | Phần cứng vật lý, cam kết dài, mất tính đàn hồi vô hạn |

## Related Topics

- [Giá trị của AWS Cloud](cloud-value-proposition.md) — global reach, HA và elasticity là ba lợi thế khác nhau
- [Compute](compute.md) — ELB và Auto Scaling là cơ chế thật của HA trong một Region
- [Network](networking.md) — subnet nằm trong **một** AZ; Route 53 chuyển hướng giữa Region
- [Storage](storage.md) — S3 bền trên nhiều AZ mặc định; cross-Region replication
- [Pricing model](pricing-models.md) — data transfer liên Region và trong Region tính tiền khác nhau
- [AWS · Foundations](../index.md)
