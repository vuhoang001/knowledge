---
title: AI/ML và analytics
i18n_status: untranslated
sidebar_position: 15
description: "Chín service AI nhớ theo đầu vào → đầu ra, không nhớ theo tên. Và sáu service analytics chia theo vai trong một pipeline dữ liệu."
tags: [aws, clf-c02, sagemaker, rekognition, athena, glue, kinesis, quicksight, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# AI/ML và analytics

> **Chốt:** Nhóm AI nhớ theo **đầu vào → đầu ra**, không nhớ theo tên: ảnh→nhãn là
> Rekognition, chữ→giọng là Polly, giọng→chữ là Transcribe, PDF→dữ liệu là Textract. Nhóm
> analytics nhớ theo **vai trong pipeline**: Kinesis nhận, Glue biến đổi, S3 chứa, Athena
> truy vấn, QuickSight vẽ.

## Mục tiêu

Task 3.7 đòi đúng hai thứ: biết **từng service AI/ML làm việc gì**, và nhận ra **service
cho data analytics**. Không đòi biết cách train model.

## Tổng quan

### Chín service AI, bảng đầu vào → đầu ra

| Service | Đầu vào | Đầu ra |
|---|---|---|
| **Amazon Rekognition** | Ảnh, video | Nhãn vật thể, mặt người, nội dung không phù hợp |
| **Amazon Textract** | Tài liệu scan, PDF, form | **Chữ và dữ liệu có cấu trúc** (bảng, cặp khoá–giá trị) |
| **Amazon Transcribe** | Âm thanh, giọng nói | **Chữ** |
| **Amazon Polly** | Chữ | **Giọng nói** |
| **Amazon Translate** | Chữ ngôn ngữ A | Chữ ngôn ngữ B |
| **Amazon Comprehend** | Chữ | **Ý nghĩa**: thực thể, cảm xúc, chủ đề, ngôn ngữ |
| **Amazon Lex** | Hội thoại (chữ/giọng) | **Chatbot** — hiểu ý định và trả lời |
| **Amazon Kendra** | Câu hỏi + kho tài liệu | **Tìm kiếm thông minh** trong tài liệu nội bộ |
| **Amazon SageMaker** | Dữ liệu của bạn | **Model do bạn train** — dựng, train, deploy |

Hai cặp đề thích thử:

- **Transcribe ⇄ Polly** — ngược chiều nhau. *Chuyển audio cuộc họp thành văn bản* →
  Transcribe. *Đọc bài viết thành audio* → Polly.
- **Textract ⇄ Rekognition** — cùng nhận ảnh. *Rút dữ liệu từ hoá đơn/form* → Textract.
  *Nhận diện vật thể hay mặt người* → Rekognition.

Và một ranh giới lớn: **SageMaker là nơi tự train**; tám service kia là **model đã train
sẵn, gọi qua API**. Câu hỏi nói *"without machine learning expertise"* thì đáp án **không
phải** SageMaker.

### Analytics, theo vai trong pipeline

| Vai | Service | Một dòng |
|---|---|---|
| **Nhận dữ liệu thời gian thực** | **Amazon Kinesis** | Stream dữ liệu — log, clickstream, telemetry |
| Nhận dữ liệu bằng Kafka | **Amazon MSK** | Apache Kafka được quản |
| **Biến đổi + catalog** | **AWS Glue** | ETL serverless và **Data Catalog** cho schema |
| **Truy vấn tại chỗ** | **Amazon Athena** | SQL **thẳng trên S3**, serverless, trả theo lượng dữ liệu quét |
| **Kho phân tích** | **Amazon Redshift** | Data warehouse cho truy vấn phức tạp, quy mô lớn |
| **Xử lý dữ liệu lớn** | **Amazon EMR** | Hadoop/Spark được quản |
| **Tìm kiếm và log analytics** | **Amazon OpenSearch Service** | Tìm kiếm, phân tích log, dashboard |
| **Trực quan hoá** | **Amazon QuickSight** | BI dashboard |
| **Dữ liệu của bên thứ ba** | **AWS Data Exchange** | Mua/đăng ký tập dữ liệu ngoài |

Ba ranh giới hay ra đề:

- **Athena ⇄ Redshift.** Truy vấn **thỉnh thoảng**, dữ liệu đã ở S3, không muốn dựng gì →
  **Athena**. Truy vấn **liên tục, phức tạp, hiệu năng cao** → **Redshift**.
- **Kinesis ⇄ SQS.** Kinesis là **stream** (nhiều consumer đọc lại được, giữ theo thời
  gian); SQS là **hàng đợi** (một consumer lấy ra là mất). Xem
  [nhóm service còn lại](other-service-categories.md).
- **Glue ⇄ EMR.** ETL serverless, không quản cluster → Glue. Cần Spark/Hadoop và quyền tinh
  chỉnh → EMR.

### Một pipeline mẫu, để nhớ cả nhóm bằng một hình

```text i18n-prose
nguon  ->  Kinesis   ->  S3 (data lake)  ->  Glue (ETL + catalog)
                                              |
                                              +-> Athena   (SQL tai cho)
                                              +-> Redshift (kho phan tich)
                                                      |
                                                      +-> QuickSight (dashboard)
```

Đọc một lượt là trả lời được phần lớn câu hỏi dạng *"service nào nằm ở bước này"*.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn **SageMaker** cho "không có chuyên môn ML" | Đó là các service AI gọi API sẵn |
| Chọn **Rekognition** cho "rút dữ liệu từ hoá đơn" | Đó là **Textract** |
| Chọn **Comprehend** cho "dịch sang tiếng Nhật" | Đó là **Translate** |
| Chọn **Kendra** cho "chatbot đặt phòng" | Đó là **Lex** |
| Chọn **Redshift** cho "truy vấn SQL vài lần một tuần trên dữ liệu đã ở S3" | Đó là **Athena** — không phải dựng cluster |
| Chọn **Athena** cho dashboard BI đông người dùng, truy vấn liên tục | Đó là **Redshift** (+ QuickSight) |
| Chọn **Glue** khi câu hỏi nói rõ cần **Spark có kiểm soát** | Đó là **EMR** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Service AI sẵn thay tự train | Dùng ngay, không cần dữ liệu huấn luyện | Không tuỳ biến được cho miền đặc thù |
| SageMaker | Model đúng bài toán của mình | Cần dữ liệu, kỹ năng, và thời gian |
| Athena thay Redshift | Không hạ tầng, trả theo lượng quét | Truy vấn nặng lặp lại thì tốn hơn; hiệu năng kém ổn định hơn |
| Glue thay EMR | Serverless, bớt vận hành | Ít quyền tinh chỉnh engine; khó với job rất đặc thù |
| Kinesis thay batch | Dữ liệu tươi theo giây | Phức tạp hơn; phải xử lý thứ tự và trùng lặp |

## Related Topics

- [Database](databases.md) — Redshift (OLAP) ⇄ RDS (OLTP), và DynamoDB
- [Storage](storage.md) — S3 là nền của mọi pipeline analytics ở đây
- [Nhóm service còn lại](other-service-categories.md) — SQS, SNS, EventBridge, Step Functions
- [ETL](../../../etl/index.md) — phiên bản tự dựng của Glue/Kinesis trong kho này
- [Machine Learning](../../../machine-learning/index.md) — phần lý thuyết đằng sau SageMaker
- [AWS · Foundations](../index.md)
