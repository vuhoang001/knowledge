---
title: Migration và AWS CAF
i18n_status: untranslated
sidebar_position: 3
description: "Sáu perspective của Cloud Adoption Framework, bảy chiến lược R, và Snow Family. Task statement mới của CLF-C02 so với C01."
tags: [aws, clf-c02, migration, cloud-adoption-framework, snow-family, domain-1]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Migration và AWS CAF

> **Chốt:** CAF chia việc chuyển lên cloud thành **sáu perspective**, và ba trong số đó
> *không phải việc của kỹ sư* — People, Governance, Business. Đề hỏi đúng chỗ đó, vì nó
> là chỗ người học kỹ thuật bỏ qua.

**Đây là task statement mới của CLF-C02.** Appendix B của exam guide ghi rõ: 1.3 được
*thêm vào*, không có nội dung nào bị xoá so với CLF-C01. Tài liệu ôn thi viết cho C01
thiếu đúng phần này.

## Mục tiêu

Task 1.3 đòi hai thứ: hiểu **lợi ích của AWS CAF**, và chọn được **chiến lược migration
phù hợp** (ví dụ database replication, AWS Snowball).

## Tổng quan

### Sáu perspective của AWS CAF

| Perspective | Ai lo | Nó trả lời |
|---|---|---|
| **Business** | Lãnh đạo, tài chính | Cloud mang lại kết quả kinh doanh nào, đo bằng gì |
| **People** | HR, quản lý | Kỹ năng và cơ cấu nhóm cần đổi thế nào |
| **Governance** | PMO, tài chính, kiểm toán | Quản rủi ro, chi phí, tuân thủ ra sao |
| **Platform** | Kiến trúc, hạ tầng | Dựng nền tảng cloud và chuyển workload lên bằng cách nào |
| **Security** | Bảo mật, tuân thủ | Đạt mục tiêu bảo mật và tuân thủ ra sao |
| **Operations** | Vận hành | Chạy, theo dõi, phục hồi service ra sao |

**Ba cái đầu là *người và tổ chức*; ba cái sau là *kỹ thuật*.** Nhớ theo cặp đó nhanh hơn
nhớ sáu cái rời.

Bốn lợi ích mà exam guide nêu tên: **giảm rủi ro kinh doanh**, **cải thiện ESG**, **tăng
doanh thu**, **tăng hiệu quả vận hành**. Hai cái giữa đáng để ý — chúng không phải lợi
ích kỹ thuật, và đề có thể hỏi thẳng.

### Bảy chiến lược "R"

| Chiến lược | Nghĩa | Khi nào chọn |
|---|---|---|
| **Retire** | Bỏ hẳn | Không ai dùng nữa — thường 10–20% danh mục |
| **Retain** | Giữ nguyên on-premises | Chưa chuyển được: licence, phần cứng đặc thù, vừa đầu tư |
| **Rehost** | "Lift and shift" — bê nguyên lên EC2 | Cần nhanh, không đổi app |
| **Relocate** | Chuyển nguyên hạ tầng ảo hoá (ví dụ VMware) | Giữ hypervisor, đổi chỗ đặt |
| **Replatform** | "Lift, tinker and shift" — đổi một phần | Chuyển DB tự quản sang **RDS**, giữ app |
| **Repurchase** | Mua SaaS thay thế | Đổi CRM tự dựng sang SaaS |
| **Refactor** | Viết lại theo cloud-native | Cần elasticity/serverless mà app cũ không chịu được |

Thứ tự công sức tăng dần: `Retire < Retain < Rehost < Relocate < Replatform < Repurchase
< Refactor`. Đề thường mô tả ràng buộc rồi hỏi chiến lược — chú ý hai cụm:

- **"with minimal changes" / "as quickly as possible"** → Rehost.
- **"reduce operational overhead" / "stop managing the database"** → Replatform (sang
  managed service).

### Service cho migration

| Service | Việc của nó |
|---|---|
| **AWS Application Discovery Service** | Kiểm kê server on-premises trước khi chuyển — cấu hình, hiệu năng, phụ thuộc |
| **AWS Migration Hub** | Một chỗ theo dõi tiến độ mọi luồng migration |
| **AWS Application Migration Service** | Rehost: nhân bản server đang chạy lên AWS |
| **AWS DMS** | Chuyển database, **nguồn vẫn chạy trong lúc chuyển** |
| **AWS SCT** | Đổi schema khi sang **engine khác** (Oracle → PostgreSQL) |
| **AWS Snow Family** | Chuyển dữ liệu lớn **ngoài đường truyền**, bằng thiết bị vật lý |
| **AWS Transfer Family** | SFTP/FTPS/FTP đưa file vào S3 — không phải migration một lần |
| **AWS Elastic Disaster Recovery** | Nhân bản để **phục hồi thảm hoạ**, không phải để chuyển nhà |

**DMS và SCT luôn đi cặp trong đề:** cùng engine thì chỉ DMS; **khác engine** thì SCT đổi
schema trước, DMS chuyển dữ liệu sau.

### Snow Family: chọn theo dung lượng

| Thiết bị | Quy mô | Dấu hiệu trong đề |
|---|---|---|
| **Snowcone** | Nhỏ nhất, bền, mang được | Vị trí hẹp, không gian hạn chế, drone/xe |
| **Snowball Edge** | Hàng chục TB | *petabyte-scale* không khả thi qua đường truyền |
| **Snowmobile** | Tới exabyte, xe container | *exabyte*, chuyển cả data center |

Dấu hiệu nhận ra câu hỏi Snow: **băng thông thấp + dữ liệu lớn + thời hạn**. Nếu câu hỏi
nói "limited bandwidth" hoặc "would take months over the network" thì đáp án là Snow, chứ
không phải Direct Connect — Direct Connect mất **hàng tuần để lắp** và vẫn bị giới hạn
băng thông.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn **Direct Connect** cho "chuyển 500 TB một lần" | Đó là đường truyền *lâu dài*, không phải phương tiện chuyển một lần |
| Chọn **DMS** cho Oracle → PostgreSQL mà không có SCT | Khác engine thì schema phải đổi trước |
| Gọi **Rehost** là Replatform | Rehost **không đổi gì** trong app; Replatform đổi một thành phần |
| Cho rằng CAF chỉ gồm phần kỹ thuật | Ba trong sáu perspective là Business, People, Governance |
| Chọn **Elastic Disaster Recovery** cho migration | Nó cho DR; rehost là Application Migration Service |

## Đánh đổi

| Chiến lược | Được | Mất |
|---|---|---|
| Rehost | Nhanh nhất, rủi ro thấp | Không nhận được lợi ích cloud nào — vẫn trả tiền cho VM chạy 24/7 |
| Replatform | Bỏ được việc vận hành DB | Phải sửa cấu hình, test lại, có thể mất tính năng engine cũ |
| Refactor | Khai thác hết elasticity, chi phí thấp nhất về lâu dài | Đắt và lâu nhất; rủi ro cao nhất |

**Mẫu thực tế trong đề:** rehost trước để kịp hạn đóng data center, refactor sau. Câu hỏi
có hai mốc thời gian thường muốn đúng mẫu này.

## Related Topics

- [Well-Architected Framework](well-architected-framework.md) — framework *kỹ thuật*, CAF là framework *tổ chức*
- [Kinh tế cloud](cloud-economics.md) — TCO là lý lẽ cho perspective Business
- [Database](databases.md) — DMS, SCT, và lựa chọn managed vs tự dựng trên EC2
- [Storage](storage.md) — Snow Family đổ dữ liệu vào S3
- [AWS · Foundations](../index.md)
