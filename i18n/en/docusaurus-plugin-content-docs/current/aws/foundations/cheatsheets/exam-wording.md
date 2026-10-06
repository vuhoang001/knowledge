---
title: Văn phong đề AWS
i18n_status: untranslated
sidebar_position: 2
description: "Khi hai đáp án đều đúng về kỹ thuật, chữ trong câu hỏi quyết định. Bảng giải mã các cụm viết hoa và các mẫu distractor hay gặp."
tags: [aws, clf-c02, cheatsheet, exam-strategy]
domain: cloud
category: tool
doc_type: cheatsheet
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Văn phong đề AWS

> **Chốt:** Đề AWS gần như không hỏi "cái nào đúng" — nó hỏi **"cái nào đúng *nhất* theo
> một tiêu chí đã nêu trong câu"**. Tiêu chí đó thường là **một từ viết hoa**. Bỏ qua từ đó
> là chọn một đáp án đúng-nhưng-không-được-điểm.

## Các từ quyết định, viết hoa trong đề

| Cụm | Nó đang hỏi | Ưu tiên đáp án |
|---|---|---|
| **MOST cost-effective** | Rẻ nhất mà vẫn đáp ứng yêu cầu | Spot/lớp lạnh/serverless — **nhưng phải còn thoả ràng buộc khác** |
| **LEAST operational overhead** | Ít việc vận hành nhất | **Managed / serverless**: Lambda, Fargate, RDS, DynamoDB |
| **LEAST operational effort** | Như trên | Như trên |
| **MOST secure** | An toàn nhất | Role thay access key · mã hoá · least privilege · private subnet |
| **MOST highly available** | Chịu lỗi tốt nhất | **Nhiều AZ**; nếu nói chịu mất Region thì nhiều Region |
| **MOST scalable** | Mở rộng tốt nhất | Serverless, DynamoDB, S3 |
| **FASTEST / lowest latency** | Nhanh nhất | CloudFront, cache, Local Zones, Global Accelerator |
| **MINIMUM downtime** | Ít gián đoạn nhất | Multi-AZ, blue/green, read replica promote |
| **without managing servers** | Không quản server | **Lambda · Fargate · S3 · DynamoDB · Athena** |
| **in minutes / immediately** | Phải nhanh để triển khai | VPN (không phải Direct Connect) |
| **one-time / repeatable** | Một lần ⇄ lặp lại | Console ⇄ **CloudFormation** |

**Hai cụm hay đi cùng nhau và đối nhau:** *MOST cost-effective* và *MOST highly available*.
HA tốn tiền. Khi cả hai cùng xuất hiện, đáp án là phương án **rẻ nhất trong số các phương
án còn thoả HA** — không phải phương án rẻ nhất tuyệt đối.

## Năm mẫu distractor hay gặp

| Mẫu | Ví dụ | Vì sao sai |
|---|---|---|
| **Service đúng nhóm, sai việc** | Dùng CloudWatch để biết *ai* xoá tài nguyên | Đúng nhóm monitoring, sai câu hỏi — đó là CloudTrail |
| **Giải pháp đúng nhưng quá mức** | Multi-Region cho yêu cầu chỉ là chịu một AZ sập | Thừa và đắt ⇒ sai với *cost-effective* |
| **Giải pháp cũ/thủ công** | Tự dựng script backup trên EC2 | Có service làm sẵn ⇒ sai với *operational overhead* |
| **Từ tuyệt đối** | *always*, *never*, *100% guaranteed*, *unlimited* | Tài liệu AWS hiếm khi nói tuyệt đối |
| **Lưu credential dài hạn** | Lưu access key vào instance/biến môi trường | Luôn có đáp án **role** tốt hơn |

Dòng cuối là mẫu đáng nhớ nhất: trong mọi câu về quyền truy cập giữa các service AWS, đáp án
có chữ **role** thắng đáp án có chữ **access key** gần như không có ngoại lệ.

## Dịch yêu cầu nghiệp vụ thành ràng buộc kỹ thuật

| Câu hỏi nói | Nghĩa kỹ thuật |
|---|---|
| *data must stay in Germany* | Chọn **Region**, không phải AZ |
| *survive the loss of a data center* | **Nhiều AZ** |
| *survive the loss of a Region* | **Nhiều Region** + Route 53 failover |
| *users in Asia report slow load times* | **CloudFront**, hoặc thêm Region |
| *spiky, unpredictable traffic* | **Auto Scaling**, hoặc serverless |
| *steady-state workload for 3 years* | **Reserved Instance / Savings Plans** |
| *can tolerate interruption* | **Spot** |
| *audit requires 7-year retention* | **Glacier Deep Archive** + **Object Lock** |
| *retrieve within minutes* | **không** Deep Archive |
| *we don't know the access pattern* | **S3 Intelligent-Tiering** |
| *decouple the components* | **SQS** (hoặc SNS nếu nhiều người nhận) |
| *existing corporate directory* | **IAM Identity Center** / Directory Service |
| *millions of app users sign in* | **Cognito** |
| *limited bandwidth, 500 TB, deadline* | **Snow Family** |
| *stop managing the database* | **RDS** / Aurora / DynamoDB |

## Chiến thuật làm bài

| Việc | Vì sao |
|---|---|
| **Không để trống câu nào** | Bỏ trống tính là sai, và **không có điểm trừ khi đoán** |
| Đọc **câu hỏi cuối cùng** trước, rồi mới đọc đoạn mô tả | Biết mình đang tìm tiêu chí gì thì đọc mô tả nhanh hơn nhiều |
| Khoanh chữ viết hoa trước khi xem đáp án | Đó là tiêu chí chấm |
| Loại hai đáp án **sai nhóm** trước | Còn hai đáp án thì đọc lại đúng cái chữ viết hoa |
| Gặp câu lạ hoàn toàn thì đoán rồi đi tiếp | **15 trong 65 câu không tính điểm** — đừng để một câu lạ phá nhịp |
| Câu *multiple response* đếm đúng số đáp án được yêu cầu | Chọn thiếu/thừa là sai cả câu |

## Related Topics

- [Từ khoá → service](service-picker.md) — tra service sau khi đã hiểu câu hỏi đòi gì
- [AWS](../../index.md) — các con số của kỳ thi: 50 câu tính điểm, pass 700
- [Cheatsheet — Foundations](index.md)
