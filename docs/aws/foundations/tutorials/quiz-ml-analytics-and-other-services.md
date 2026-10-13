---
title: "Câu hỏi: ML, Analytics & dịch vụ khác"
sidebar_position: 12
description: "Tự chấm phần AI/ML, Analytics và dịch vụ lẻ — map mô tả nhiệm vụ sang đúng dịch vụ."
tags: [aws, clf-c02, quiz, machine-learning, analytics]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
---

> **Chốt:** Tự chấm việc map mô tả nhiệm vụ → đúng dịch vụ AI/ML, Analytics hoặc dịch vụ lẻ. Đọc đề, trả lời, rồi mở `<details>` để đối chiếu.

Phần lớn là multiple choice (chọn 1). Hai câu cuối là multiple response (chọn nhiều) — đã ghi rõ.

---

**Câu 1 (multiple choice).** Ứng dụng cần chuyển file ghi âm cuộc họp thành văn bản. Dịch vụ nào?

A. Polly
B. Transcribe
C. Translate
D. Comprehend

<details>
<summary>Đáp án</summary>

**B. Transcribe.** Transcribe làm speech → text (giọng nói thành chữ). Polly ngược lại (text → speech), Translate để dịch ngôn ngữ, Comprehend để phân tích cảm xúc/entity trong văn bản.

</details>

---

**Câu 2 (multiple choice).** Cần đọc nội dung văn bản ra giọng nói tự nhiên cho ứng dụng đọc sách. Dịch vụ nào?

A. Transcribe
B. Lex
C. Polly
D. Rekognition

<details>
<summary>Đáp án</summary>

**C. Polly.** Polly làm text → speech. Đừng nhầm với Transcribe (chiều ngược lại, speech → text).

</details>

---

**Câu 3 (multiple choice).** Hệ thống review sản phẩm muốn tự động xác định bình luận của khách hàng là tích cực hay tiêu cực. Dịch vụ nào?

A. Comprehend
B. Translate
C. Kendra
D. Personalize

<details>
<summary>Đáp án</summary>

**A. Comprehend.** Comprehend là NLP, làm phân tích cảm xúc (sentiment), trích entity, chủ đề. Từ khóa "tích cực/tiêu cực" = sentiment.

</details>

---

**Câu 4 (multiple choice).** Website cần dịch nội dung từ tiếng Anh sang nhiều ngôn ngữ khác theo thời gian thực. Dịch vụ nào?

A. Comprehend
B. Transcribe
C. Translate
D. Polly

<details>
<summary>Đáp án</summary>

**C. Translate.** Translate chuyên dịch ngôn ngữ (text sang ngôn ngữ khác).

</details>

---

**Câu 5 (multiple choice).** Cần nhận diện vật thể và khuôn mặt trong ảnh người dùng upload. Dịch vụ nào?

A. Textract
B. Rekognition
C. Kendra
D. Comprehend

<details>
<summary>Đáp án</summary>

**B. Rekognition.** Rekognition phân tích ảnh/video. Textract dùng cho tài liệu scan chứa text/form, không phải nhận diện vật thể trong ảnh tự nhiên.

</details>

---

**Câu 6 (multiple choice).** Cần chạy câu lệnh SQL trực tiếp trên dữ liệu đang nằm trong S3 mà không muốn dựng và quản lý server nào. Dịch vụ nào?

A. Redshift
B. EMR
C. Athena
D. Glue

<details>
<summary>Đáp án</summary>

**C. Athena.** Athena query SQL trực tiếp trên S3, serverless. Từ khóa: "SQL" + "S3" + "không server". Redshift là data warehouse (cần cluster), EMR là cụm Hadoop/Spark, Glue là ETL.

</details>

---

**Câu 7 (multiple choice).** Nhóm data engineer cần một dịch vụ ETL serverless kèm data catalog để phát hiện và quản lý schema dữ liệu. Dịch vụ nào?

A. Glue
B. Athena
C. Data Pipeline
D. QuickSight

<details>
<summary>Đáp án</summary>

**A. Glue.** Glue là ETL serverless + Data Catalog. Từ khóa: "ETL" và "data catalog".

</details>

---

**Câu 8 (multiple choice).** Công ty muốn dựng dashboard BI để trực quan hóa dữ liệu bán hàng cho lãnh đạo xem. Dịch vụ nào?

A. Athena
B. QuickSight
C. OpenSearch
D. Kendra

<details>
<summary>Đáp án</summary>

**B. QuickSight.** QuickSight là dịch vụ BI / dashboard của AWS. Từ khóa: "BI", "dashboard", "trực quan hóa".

</details>

---

**Câu 9 (multiple choice).** Cần xây một chatbot có thể hiểu ngôn ngữ tự nhiên và trả lời khách hàng. Dịch vụ nào?

A. Polly
B. Comprehend
C. Lex
D. Connect

<details>
<summary>Đáp án</summary>

**C. Lex.** Lex xây chatbot / giao diện giọng nói (công nghệ đứng sau Alexa).

</details>

---

**Câu 10 (multiple choice).** Phòng kế toán muốn tự động trích các trường dữ liệu từ hàng nghìn hóa đơn scan (PDF ảnh). Dịch vụ nào?

A. Rekognition
B. Textract
C. Comprehend
D. Kendra

<details>
<summary>Đáp án</summary>

**B. Textract.** Textract trích text và dữ liệu có cấu trúc (form, bảng) từ tài liệu scan. Rekognition dùng cho ảnh/video chứ không chuyên trích text từ tài liệu.

</details>

---

**Câu 11 (multiple choice).** Cần chạy workload xử lý big data trên cụm Apache Spark và Hadoop được managed. Dịch vụ nào?

A. Athena
B. Glue
C. EMR
D. Redshift

<details>
<summary>Đáp án</summary>

**C. EMR.** EMR là Hadoop/Spark managed trên cụm máy. Từ khóa: "Hadoop", "Spark".

</details>

---

**Câu 12 (multiple choice).** Doanh nghiệp muốn triển khai call center trên cloud để nhân viên nhận và xử lý cuộc gọi khách hàng. Dịch vụ nào?

A. Amazon Connect
B. SES
C. Pinpoint
D. Lex

<details>
<summary>Đáp án</summary>

**A. Amazon Connect.** Connect là dịch vụ call center / contact center trên cloud.

</details>

---

**Câu 13 (multiple choice).** Nhóm phát triển muốn tự build, train và deploy một mô hình machine learning tùy biến của riêng họ. Dịch vụ nào?

A. Rekognition
B. SageMaker
C. Forecast
D. Comprehend

<details>
<summary>Đáp án</summary>

**B. SageMaker.** SageMaker là nền tảng tổng quát để build / train / deploy model ML tùy biến. Các dịch vụ còn lại là AI managed gọi API sẵn, không phải để tự train model riêng.

</details>

---

**Câu 14 (multiple choice).** Công ty cần gửi lượng lớn email xác nhận giao dịch (transactional email) từ ứng dụng. Dịch vụ nào?

A. Pinpoint
B. SES
C. Connect
D. SNS

<details>
<summary>Đáp án</summary>

**B. SES (Simple Email Service).** SES chuyên gửi email. Pinpoint thiên về chiến dịch marketing đa kênh có nhắm đối tượng.

</details>

---

**Câu 15 (multiple response — chọn 2).** Bộ ba dịch vụ Analytics nào thường đi cùng một luồng: chuẩn bị dữ liệu, query, rồi trực quan hóa? Chọn **2** dịch vụ dùng để **query SQL trên S3** và **tạo dashboard BI**.

A. Athena
B. EMR
C. QuickSight
D. MSK
E. Data Pipeline

<details>
<summary>Đáp án</summary>

**A. Athena** và **C. QuickSight.** Athena để query SQL serverless trên S3; QuickSight để dựng dashboard BI từ kết quả. (Glue thường là bước ETL/catalog đứng trước, nhưng không có trong các lựa chọn.)

</details>

---

**Câu 16 (multiple response — chọn 2).** Chọn **2** dịch vụ thuộc nhóm AI/ML managed chuyên xử lý **ngôn ngữ/giọng nói** (không phải ảnh, không phải tự train model).

A. Rekognition
B. Polly
C. SageMaker
D. Transcribe
E. QuickSight

<details>
<summary>Đáp án</summary>

**B. Polly** (text → speech) và **D. Transcribe** (speech → text). Rekognition xử lý ảnh/video, SageMaker là nền tảng tự train model, QuickSight là BI.

</details>

---

## Related Topics

- [Machine Learning, Analytics & dịch vụ khác (reference)](../reference/ai-ml-and-analytics.md)
- [Trang hub AWS](../index.md)
