---
title: Tài liệu — Foundations (CLF-C02)
sidebar_key: aws-foundations-reference
sidebar_position: 0
description: "19 tài liệu, một cái cho mỗi task statement của exam guide. Đọc nhóm này trước."
tags: [reference, aws, clf-c02]
domain: cloud
category: index
doc_type: index
updated: 2026-10-06
---

# Tài liệu — Foundations (CLF-C02)

Giải thích *nó là gì, vì sao, và vì sao service kia sai*. Mỗi file khớp **đúng một task
statement** của exam guide, nên cột *Task* cũng là cột kiểm kê độ phủ.

## Domain 1 — Cloud Concepts (24%)

| # | Tài liệu | Trả lời câu hỏi | Task | TT |
|---|---|---|---|---|
| 1 | [Giá trị của AWS Cloud](cloud-value-proposition.md) | Sáu lợi thế, và cái nào là *kinh tế* còn cái nào là *kỹ thuật* | 1.1 | 🟡 |
| 2 | [Well-Architected Framework](well-architected-framework.md) | Sáu pillar; pillar nào trả lời câu hỏi nào | 1.2 | 🟡 |
| 3 | [Migration và AWS CAF](migration-and-caf.md) | Sáu perspective của CAF, 7 chiến lược R, Snow Family | 1.3 | 🟡 |
| 4 | [Kinh tế cloud](cloud-economics.md) | Fixed vs variable cost, TCO, rightsizing, BYOL | 1.4 | 🟡 |

## Domain 2 — Security and Compliance (30%)

| # | Tài liệu | Trả lời câu hỏi | Task | TT |
|---|---|---|---|---|
| 5 | [Shared responsibility model](shared-responsibility.md) | Ranh giới **dịch chuyển theo service** — EC2 vs RDS vs Lambda | 2.1 | 🟡 |
| 6 | [Governance và compliance](security-governance-compliance.md) | Artifact, CloudTrail, Config, Audit Manager; mã hoá at-rest vs in-transit | 2.2 | 🟡 |
| 7 | [Access management](access-management.md) | User/group/role/policy, MFA, root user, IAM Identity Center | 2.3 | 🟡 |
| 8 | [Thành phần bảo mật](security-components.md) | SG, NACL, WAF, Shield; và bốn service "kiểm tra bảo mật" khác nhau ra sao | 2.4 | 🟡 |

## Domain 3 — Cloud Technology and Services (34%)

| # | Tài liệu | Trả lời câu hỏi | Task | TT |
|---|---|---|---|---|
| 9 | [Cách triển khai và truy cập](deploy-and-access-methods.md) | Console vs CLI vs SDK vs IaC; cloud/hybrid/on-premises; VPN vs Direct Connect | 3.1 | 🟡 |
| 10 | [Global infrastructure](global-infrastructure.md) | Region, AZ, edge location, Local Zone, Wavelength, Outposts | 3.2 | 🟡 |
| 11 | [Compute](compute.md) | Họ instance EC2, container, serverless, Auto Scaling, load balancer | 3.3 | 🟡 |
| 12 | [Database](databases.md) | RDS, Aurora, DynamoDB, MemoryDB, Neptune; DMS và SCT | 3.4 | 🟡 |
| 13 | [Network](networking.md) | VPC, subnet, gateway, SG vs NACL, Route 53, edge service | 3.5 | 🟡 |
| 14 | [Storage](storage.md) | Object/block/file, bảy lớp S3, lifecycle, Storage Gateway, Backup | 3.6 | 🟡 |
| 15 | [AI/ML và analytics](ai-ml-and-analytics.md) | Chín service AI theo *đầu vào → đầu ra*; Athena, Glue, Kinesis, QuickSight | 3.7 | 🟡 |
| 16 | [Nhóm service còn lại](other-service-categories.md) | SQS/SNS/EventBridge/Step Functions, Code*, WorkSpaces, IoT | 3.8 | 🟡 |

## Domain 4 — Billing, Pricing, and Support (12%)

| # | Tài liệu | Trả lời câu hỏi | Task | TT |
|---|---|---|---|---|
| 17 | [Pricing model](pricing-models.md) | On-Demand, RI, Spot, Savings Plans, Dedicated; phí data transfer | 4.1 | 🟡 |
| 18 | [Billing và cost management](billing-and-cost-management.md) | Organizations, Budgets, Cost Explorer, CUR, cost allocation tag | 4.2 | 🟡 |
| 19 | [Support và tài nguyên kỹ thuật](support-and-technical-resources.md) | Năm mức support, Trusted Advisor, Health Dashboard, re:Post, Partner | 4.3 | 🟡 |

Ký hiệu: ✅ chủ repo đã kiểm chứng và điền `verified_at` · 🟡 đã viết, `verified_at` còn
trống · ⬜ chưa viết

## Related Topics

- [Foundations (CLF-C02)](../index.md) — tầng chứa nhóm này, có thứ tự đọc đề xuất
- [Cheatsheet](../cheatsheets/index.md) — bảng tra lúc luyện đề
- [Case study](../case-studies/index.md) — ca chọn sai cụ thể
