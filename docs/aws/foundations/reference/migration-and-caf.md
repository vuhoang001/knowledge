---
title: Migration và AWS CAF
sidebar_position: 3
description: "Sáu perspective của Cloud Adoption Framework, bảy chiến lược R, và sáu service migration in-scope. Task statement mới của CLF-C02 so với C01."
tags: [aws, clf-c02, migration, cloud-adoption-framework, migration-evaluator, domain-1]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-14
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
phù hợp** (exam guide bản 2026 lấy ví dụ *database replication*).

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
| **AWS Application Discovery Service** | **Kiểm kê kỹ thuật** server on-premises trước khi chuyển — cấu hình, hiệu năng, phụ thuộc |
| **Migration Evaluator** | **Dựng business case**: ước tính chi phí chạy trên AWS trước khi quyết định chuyển |
| **AWS Migration Hub** | Một chỗ **theo dõi tiến độ** mọi luồng migration |
| **AWS Application Migration Service** | Rehost: nhân bản server đang chạy lên AWS |
| **AWS DMS** | Chuyển database, **nguồn vẫn chạy trong lúc chuyển** |
| **AWS SCT** | Đổi schema khi sang **engine khác** (Oracle → PostgreSQL) |
| **AWS Snow Family†** | Chuyển dữ liệu lớn **ngoài đường truyền**, bằng thiết bị vật lý |
| **AWS Transfer Family†** | SFTP/FTPS/FTP đưa file vào S3 — không phải migration một lần |
| **AWS Elastic Disaster Recovery** | Nhân bản để **phục hồi thảm hoạ**, không phải để chuyển nhà |

**DMS và SCT luôn đi cặp trong đề:** cùng engine thì chỉ DMS; **khác engine** thì SCT đổi
schema trước, DMS chuyển dữ liệu sau.

Ba service đầu bảng cũng là một bộ ba hay bị trộn, và chúng trả lời ba câu khác nhau:
**Migration Evaluator** = *có đáng chuyển không, tốn bao nhiêu* (trước khi quyết định) ·
**Application Discovery Service** = *đang có những gì, phụ thuộc nhau ra sao* (kiểm kê) ·
**Migration Hub** = *đã chuyển tới đâu rồi* (theo dõi).

`†` ngoài phạm vi exam guide CLF-C02 bản 2026 — xem mục ngay dưới. Sáu service Migration
in-scope: Application Discovery Service, Application Migration Service, DMS, Migration
Evaluator, Migration Hub, SCT. (Elastic Disaster Recovery in-scope nhưng xếp vào nhóm
**Storage**.)

### Snow Family†: đã rời phạm vi thi, đọc để không nhầm

:::warning Snow Family không còn trong danh sách in-scope

Exam guide CLF-C02 bản 2026 **đã bỏ hẳn AWS Snow Family** khỏi nhóm Migration and Transfer.
Dịch vụ cũng đang bị khai tử: Snowcone ngừng bán **12/11/2024**; Snowball Edge chỉ còn phục
vụ khách hiện hữu từ **07/11/2025**; AWS **ngừng hỗ trợ Snowball ở mọi Region thương mại từ
31/12/2026**. Snowmobile đã ngừng cung cấp.

Giữ mục này lại vì tài liệu ôn thi cũ và ngân hàng câu hỏi trôi nổi vẫn đầy Snowball — cần
nhận ra tên để **không chọn nhầm**, không phải để chọn.

:::

| Thiết bị | Quy mô | Trạng thái |
|---|---|---|
| **Snowcone** | Nhỏ nhất, bền, mang được — vị trí hẹp, drone/xe | Ngừng bán 12/11/2024 |
| **Snowball Edge** | Tới hàng trăm TB mỗi thiết bị; ghép nhiều thiết bị cho quy mô petabyte | Chỉ khách cũ; hết hỗ trợ 31/12/2026 |
| **Snowmobile** | Tới exabyte, xe container | Đã ngừng |

**Đừng giữ phản xạ cũ.** Tình huống *"limited bandwidth"* / *"would take months over the
network"* trước đây có đáp án là Snow; trong danh mục in-scope bản 2026 **không còn đáp án
nào cho tình huống đó** — nên nếu nó xuất hiện, đọc kỹ các lựa chọn thay vì tìm chữ "Snow".
Đường truyền lâu dài vẫn là [Direct Connect](networking.md), nhưng Direct Connect mất **hàng
tuần để lắp** và không phải phương tiện chuyển một lần.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn **Migration Hub** cho "kiểm kê server và phụ thuộc trước khi chuyển" | Migration Hub chỉ **theo dõi tiến độ**; kiểm kê là **Application Discovery Service** |
| Chọn **Application Discovery Service** cho "ước tính chi phí chạy trên AWS để trình lãnh đạo" | Đó là **Migration Evaluator** — business case, không phải kiểm kê kỹ thuật |
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
- [Storage](storage.md) — đích đến của hầu hết dữ liệu migration là S3
- [AWS · Foundations](../index.md)
