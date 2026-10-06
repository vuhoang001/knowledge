---
title: Support và tài nguyên kỹ thuật
i18n_status: untranslated
sidebar_position: 19
description: "Năm mức support theo tên trong exam guide, mốc phân biệt chúng, và nơi tìm tài liệu. Kèm cảnh báo: AWS đã tái cấu trúc gói hỗ trợ, đề vẫn hỏi theo tên cũ."
tags: [aws, clf-c02, support-plans, trusted-advisor, health-dashboard, re-post, partner-network, domain-4]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Support và tài nguyên kỹ thuật

> **Chốt:** Ba mốc phân biệt các gói support, nhớ đúng ba mốc là trả lời được gần hết:
> **Business** là mốc đầu tiên có **24/7 + full Trusted Advisor + hỗ trợ phần mềm bên thứ
> ba**. **Enterprise On-Ramp** là mốc đầu tiên có **pool TAM**. **Enterprise** là mốc có
> **TAM riêng** và phản hồi nhanh nhất.

## Mục tiêu

Task 4.3 đòi: tìm whitepaper/blog/tài liệu, biết **Prescriptive Guidance / Knowledge Center
/ re:Post**, phân biệt các **gói support**, biết vai của **Trusted Advisor**, **Health
Dashboard**, **Health API**, biết **Trust & Safety**, hiểu vai của **AWS Partner Network**
và **Marketplace**, và biết các lựa chọn **trợ giúp kỹ thuật** (Professional Services,
Solutions Architects).

## Tổng quan

### Năm gói support

| Gói | Ai mở được case | 24/7 | Trusted Advisor | TAM | Mốc đáng nhớ |
|---|---|---|---|---|---|
| **Basic** | Không mở được case kỹ thuật | — | Chỉ vài kiểm tra cơ bản | — | **Miễn phí cho mọi account**; có tài liệu, forum, Health Dashboard |
| **Developer** | **Một** người liên hệ | Không — giờ làm việc | Hạn chế | — | Môi trường **dev/test** |
| **Business** | **Không giới hạn** | **Có** | **Đầy đủ** | — | Mốc đầu tiên dùng được cho **production**; có **hỗ trợ phần mềm bên thứ ba** |
| **Enterprise On-Ramp** | Không giới hạn | Có | Đầy đủ | **Pool TAM** | Có **Concierge** cho billing; review kiến trúc |
| **Enterprise** | Không giới hạn | Có | Đầy đủ | **TAM riêng** | Phản hồi nhanh nhất; hỗ trợ sâu nhất |

Thứ tự thời gian phản hồi (nhanh dần): **Developer → Business → Enterprise On-Ramp →
Enterprise**. Mức nghiêm trọng nhất của Enterprise tính bằng **phút**, của Business tính
bằng **giờ**.

:::warning Giá và SLA cụ thể: kiểm lại, đừng học thuộc từ note này

Exam guide CLF-C02 nêu tên đúng **năm** gói trên, và đề vẫn hỏi theo các tên đó. Nhưng
AWS **đã tái cấu trúc danh mục gói hỗ trợ** trên trang bán hàng — tên và bảng so sánh công
khai hiện không trùng khít với năm tên này. Nên:

- **Học để thi:** dùng đúng năm tên và ba mốc phân biệt ở bảng trên.
- **Dùng để quyết định thật:** mở
  [trang AWS Support plans](https://aws.amazon.com/premiumsupport/plans/) và đọc giá, SLA
  tại thời điểm đó. Không trích số từ note này.

Các con số giá và thời gian phản hồi **cố ý không ghi vào đây** — chúng đổi, và một con số
sai trong kho còn tệ hơn không có số.

:::

### Chọn gói trong đề

| Yêu cầu trong câu hỏi | Gói |
|---|---|
| "chỉ dùng dev/test, một người cần hỏi" | **Developer** |
| "production workload, cần 24/7" | **Business** |
| "cần đầy đủ Trusted Advisor, chi phí thấp nhất có thể" | **Business** |
| "cần hỗ trợ cho phần mềm bên thứ ba trên EC2" | **Business** trở lên |
| "cần TAM chuyên trách" | **Enterprise** |
| "cần hướng dẫn kiến trúc và pool TAM, chưa cần Enterprise" | **Enterprise On-Ramp** |
| "chỉ cần tài liệu và forum" | **Basic** |

### Trusted Advisor, Health Dashboard, Health API

| Thứ | Trả lời |
|---|---|
| **AWS Trusted Advisor** | **Tài khoản của tôi** có lệch thực hành tốt không — 5 trục: cost, performance, security, fault tolerance, **service limits** |
| **AWS Health Dashboard** | **AWS** có đang gặp sự cố ảnh hưởng tới tôi không; và có sự kiện bảo trì nào sắp tới |
| **AWS Health API** | Lấy chính thông tin đó **bằng chương trình** để tự động xử lý |

Ranh giới quyết định đáp án: **vấn đề ở phía tôi** → Trusted Advisor · **vấn đề ở phía
AWS** → Health Dashboard.

### Nơi tìm thông tin

| Nơi | Có gì |
|---|---|
| **AWS Documentation** | Tài liệu chính thức từng service |
| **AWS Whitepapers** | Tài liệu sâu về kiến trúc, bảo mật, tuân thủ |
| **AWS Prescriptive Guidance** | Mẫu, hướng dẫn, kế hoạch **có chỉ dẫn từng bước** |
| **AWS Knowledge Center** | Câu hỏi thường gặp đã có lời giải |
| **AWS re:Post** | Hỏi–đáp cộng đồng do AWS vận hành (thay cho forum cũ) |
| **AWS Blogs** | Tính năng mới, thực hành tốt |
| **AWS Trust & Safety** | Nơi **báo cáo lạm dụng** tài nguyên AWS |

### Trợ giúp có người thật

| Lựa chọn | Nghĩa |
|---|---|
| **AWS Professional Services** | Đội tư vấn của AWS, làm cùng dự án |
| **AWS Solutions Architects** | Kỹ sư AWS tư vấn kiến trúc |
| **AWS Partner Network (APN)** | Hệ sinh thái đối tác: **ISV** (bán software) và **SI** (tích hợp hệ thống) |
| **AWS IQ** | Thuê chuyên gia độc lập cho việc ngắn |
| **AWS Managed Services (AMS)** | AWS **vận hành** hạ tầng thay bạn |
| **AWS Marketplace** | Mua software/service của đối tác, tính vào hoá đơn AWS |

Lợi ích làm **AWS Partner** mà exam guide nêu tên: đào tạo và chứng chỉ cho đối tác, sự
kiện, và **chiết khấu theo khối lượng**.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn **Developer** cho production cần 24/7 | Developer chỉ hỗ trợ trong giờ làm việc |
| Chọn **Enterprise** khi yêu cầu chỉ là "24/7 + full Trusted Advisor, rẻ nhất" | **Business** đã đủ |
| Chọn **Basic** khi cần mở case kỹ thuật | Basic không mở được case kỹ thuật |
| Dùng **Trusted Advisor** để biết "AWS có đang sự cố không" | Đó là **Health Dashboard** |
| Dùng **Health Dashboard** để biết "tôi có Elastic IP nào không dùng" | Đó là **Trusted Advisor** |
| Chọn **Professional Services** cho "báo cáo một EC2 đang tấn công máy tôi" | Đó là **Trust & Safety** |
| Chọn **Marketplace** khi câu hỏi hỏi về **nơi hỏi đáp cộng đồng** | Đó là **re:Post** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Lên Business | 24/7, full Trusted Advisor, hỗ trợ bên thứ ba | Phí tính theo % chi tiêu — tăng theo quy mô |
| Lên Enterprise | TAM riêng, phản hồi nhanh nhất, review chủ động | Chi phí cam kết lớn, chỉ hợp khi downtime rất đắt |
| Dùng AMS | Không cần đội vận hành | Phí cao, giảm quyền tự quyết vận hành |
| Dựa vào Partner/ISV | Có chuyên môn ngay, triển khai nhanh | Thêm nhà cung cấp phải quản; phụ thuộc bên ngoài |

## Related Topics

- [Thành phần bảo mật](security-components.md) — Trusted Advisor trong năm trục, và Trust & Safety
- [Billing và cost management](billing-and-cost-management.md) — trục cost optimization của Trusted Advisor
- [Nhóm service còn lại](other-service-categories.md) — AMS, IQ, Activate for Startups
- [Kinh tế cloud](cloud-economics.md) — chọn mức support cũng là một quyết định TCO
- [AWS · Foundations](../index.md)
