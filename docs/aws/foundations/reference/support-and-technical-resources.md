---
title: Support và tài nguyên kỹ thuật
sidebar_position: 19
description: "Bốn gói support theo tên trong exam guide bản 2026, mốc phân biệt chúng, bảng đối chiếu với ba gói cũ sắp ngừng, và nơi tìm tài liệu."
tags: [aws, clf-c02, support-plans, business-support-plus, trusted-advisor, health-dashboard, re-post, partner-network, domain-4]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-14
---

# Support và tài nguyên kỹ thuật

> **Chốt:** Ba mốc phân biệt các gói support, nhớ đúng ba mốc là trả lời được gần hết:
> **Business Support+** là mốc đầu tiên **mở được case kỹ thuật không giới hạn, 24/7, có
> full Trusted Advisor**. **Enterprise** là mốc có **TAM riêng**. **Unified Operations**
> là mốc cao nhất, phản hồi nhanh nhất. Danh mục này **mới** — ba tên cũ (Developer,
> Business, Enterprise On-Ramp) ngừng **01/01/2027**.

## Mục tiêu

Task 4.3 đòi: tìm whitepaper/blog/tài liệu, biết **Prescriptive Guidance / Knowledge Center
/ re:Post**, phân biệt các **gói support**, biết vai của **Trusted Advisor**, **Health
Dashboard**, **Health API**, biết **Trust & Safety**, hiểu vai của **AWS Partner Network**
và **Marketplace**, và biết các lựa chọn **trợ giúp kỹ thuật** (Professional Services,
Solutions Architects).

## Tổng quan

### Bốn mức support theo exam guide bản 2026

Exam guide liệt kê theo đúng thứ tự này: *customer service and communities* → **Basic
Support** → **AWS Business Support+** → **AWS Enterprise Support** → **AWS Unified
Operations**.

| Mức | Ai mở được case | 24/7 | Trusted Advisor | TAM | Mốc đáng nhớ |
|---|---|---|---|---|---|
| **Customer service và cộng đồng** | — | — | — | — | Có với **mọi** account: tài liệu, whitepaper, re:Post, hỏi về **billing và tài khoản** |
| **Basic Support** | Không mở được case **kỹ thuật** | — | Chỉ vài kiểm tra cơ bản | — | **Miễn phí cho mọi account**; có Health Dashboard |
| **Business Support+** | **Không giới hạn** | **Có** | **Đầy đủ** | — | Mốc đầu tiên dùng được cho **production**; **hỗ trợ phần mềm bên thứ ba**; trợ lý AI |
| **Enterprise Support** | Không giới hạn | Có | Đầy đủ | **TAM riêng** | Thêm **AWS Security Incident Response** không tính phí riêng; review chủ động |
| **Unified Operations** | Không giới hạn | Có | Đầy đủ | **Đội chuyên trách toàn cầu** | Mức **cao nhất**, cho workload sống còn; phản hồi nhanh nhất |

Thời gian phản hồi **chặt dần** theo đúng thứ tự đó. Hai ranh giới có điểm trong đề:
**mở được case kỹ thuật** bắt đầu từ Business Support+, và **TAM riêng** bắt đầu từ
Enterprise.

:::warning Ba tên cũ vẫn còn trong đề cũ — và ngừng ngày 01/01/2027

AWS đã gộp danh mục. Nếu bạn gặp tài liệu ôn thi hoặc câu hỏi dùng tên cũ, đối chiếu bảng
này:

| Tên cũ | Trạng thái | Đi về đâu |
|---|---|---|
| **Developer** | Ngừng **01/01/2027** | Nâng lên **Business Support+** |
| **Business** | Ngừng **01/01/2027** | Nâng lên **Business Support+** |
| **Enterprise On-Ramp** | Ngừng **01/01/2027** | Trong năm 2026 khách được **tự động nâng lên Enterprise**; AWS hạ mức giá tối thiểu của Enterprise xuống dưới mức cũ của On-Ramp |

Nguồn: [Developer, Business, and Enterprise On-Ramp end of support](https://docs.aws.amazon.com/awssupport/latest/user/support-plans-eos.html)
· [AWS Support transformation](https://aws.amazon.com/about-aws/whats-new/2025/12/aws-support-transformation-ai-powered-operations/).

Các con số **giá và thời gian phản hồi cố ý không ghi vào đây** — chúng đổi, và một con số
sai trong kho còn tệ hơn không có số. Cần số thật thì mở
[trang AWS Support plans](https://aws.amazon.com/premiumsupport/plans/) tại thời điểm đó.

:::

### Chọn gói trong đề

| Yêu cầu trong câu hỏi | Gói |
|---|---|
| "chỉ cần tài liệu và cộng đồng" | **Basic** |
| "có câu hỏi về hoá đơn, chưa cần hỗ trợ kỹ thuật" | **Basic** — customer service có sẵn |
| "production workload, cần 24/7" | **Business Support+** |
| "cần đầy đủ Trusted Advisor, chi phí thấp nhất có thể" | **Business Support+** |
| "cần hỗ trợ cho phần mềm bên thứ ba trên EC2" | **Business Support+** trở lên |
| "cần TAM chuyên trách" | **Enterprise** |
| "workload sống còn, cần đội chuyên trách và phản hồi nhanh nhất" | **Unified Operations** |

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
| **AWS Support Center** | Nơi **mở và theo dõi case** — cửa vào của mọi gói có hỗ trợ kỹ thuật |
| **AWS Trust & Safety** | Nơi **báo cáo lạm dụng** tài nguyên AWS |

### Trợ giúp có người thật

| Lựa chọn | Nghĩa |
|---|---|
| **AWS Professional Services** | Đội tư vấn của AWS, làm cùng dự án |
| **AWS Solutions Architects** | Kỹ sư AWS tư vấn kiến trúc |
| **AWS Partner Network (APN)** | Hệ sinh thái đối tác: **ISV** (bán software) và **SI** (tích hợp hệ thống) |
| **AWS IQ†** | Thuê chuyên gia độc lập cho việc ngắn |
| **AWS Managed Services (AMS)†** | AWS **vận hành** hạ tầng thay bạn |
| **AWS Marketplace** | Mua software/service của đối tác, tính vào hoá đơn AWS |

Lợi ích làm **AWS Partner** mà exam guide nêu tên: đào tạo và chứng chỉ cho đối tác, sự
kiện, và **chiết khấu theo khối lượng**.

`†` không nằm trong danh sách in-scope của exam guide bản 2026 — biết để **không chọn nhầm**.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn **Enterprise** khi yêu cầu chỉ là "24/7 + full Trusted Advisor, rẻ nhất" | **Business Support+** đã đủ |
| Chọn **Unified Operations** cho một workload production bình thường | Mức đó dành cho hệ thống sống còn; chi phí không tương xứng |
| Vẫn học theo **Developer / Enterprise On-Ramp** | Hai gói đó ngừng **01/01/2027**; guide bản 2026 không còn nêu tên |
| Chọn **Basic** khi cần mở case kỹ thuật | Basic không mở được case kỹ thuật |
| Dùng **Trusted Advisor** để biết "AWS có đang sự cố không" | Đó là **Health Dashboard** |
| Dùng **Health Dashboard** để biết "tôi có Elastic IP nào không dùng" | Đó là **Trusted Advisor** |
| Chọn **Professional Services** cho "báo cáo một EC2 đang tấn công máy tôi" | Đó là **Trust & Safety** |
| Chọn **Marketplace** khi câu hỏi hỏi về **nơi hỏi đáp cộng đồng** | Đó là **re:Post** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Lên Business Support+ | 24/7, full Trusted Advisor, hỗ trợ bên thứ ba | Phí tính theo % chi tiêu — tăng theo quy mô |
| Lên Enterprise | TAM riêng, phản hồi nhanh nhất, review chủ động | Chi phí cam kết lớn, chỉ hợp khi downtime rất đắt |
| Dùng AMS† | Không cần đội vận hành | Phí cao, giảm quyền tự quyết vận hành |
| Dựa vào Partner/ISV | Có chuyên môn ngay, triển khai nhanh | Thêm nhà cung cấp phải quản; phụ thuộc bên ngoài |

## Related Topics

- [Thành phần bảo mật](security-components.md) — Trusted Advisor trong năm trục, và Trust & Safety
- [Billing và cost management](billing-and-cost-management.md) — trục cost optimization của Trusted Advisor
- [Nhóm service còn lại](other-service-categories.md) — nhóm Customer Enablement, in-scope chỉ có AWS Support
- [Kinh tế cloud](cloud-economics.md) — chọn mức support cũng là một quyết định TCO
- [AWS · Foundations](../index.md)
