---
title: "Câu hỏi: ML, Analytics & dịch vụ khác"
i18n_status: untranslated
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

**B. Transcribe** — Transcribe làm speech → text, tức biến giọng nói trong file âm thanh thành văn bản.

Nhóm AI managed xử lý ngôn ngữ/giọng nói của AWS chia theo chiều dữ liệu: Transcribe (âm thanh vào, chữ ra), Polly (chữ vào, âm thanh ra), Translate (chữ một ngôn ngữ vào, chữ ngôn ngữ khác ra), Comprehend (chữ vào, phân tích ý nghĩa ra). Đề nói "file ghi âm → văn bản" là đúng mô tả Transcribe.

- **A. Polly** sai: Polly đi chiều ngược lại, text → speech (đọc chữ ra giọng nói), không nhận âm thanh làm đầu vào.
- **C. Translate** sai: Translate dịch văn bản sang ngôn ngữ khác; đầu vào của nó đã là văn bản chứ không phải âm thanh.
- **D. Comprehend** sai: Comprehend phân tích văn bản (sentiment, entity, chủ đề), cũng nhận đầu vào là văn bản, không chuyển âm thanh thành chữ.

📌 Nhớ cho đề: "ghi âm / giọng nói / audio → văn bản" = **Transcribe**.

</details>

---

**Câu 2 (multiple choice).** Cần đọc nội dung văn bản ra giọng nói tự nhiên cho ứng dụng đọc sách. Dịch vụ nào?

A. Transcribe
B. Lex
C. Polly
D. Rekognition

<details>
<summary>Đáp án</summary>

**C. Polly** — Polly làm text → speech, biến văn bản thành giọng nói tự nhiên, đúng nhu cầu "đọc sách thành tiếng".

Polly và Transcribe là một cặp đối xứng hay bị hoán đổi trong đề: nhớ Polly có chữ "P" như "phát ra tiếng nói" (chữ → tiếng), còn Transcribe là chép lại lời nói thành chữ.

- **A. Transcribe** sai: đi chiều ngược lại (speech → text), dùng cho phụ đề/biên bản chứ không đọc chữ ra tiếng.
- **B. Lex** sai: Lex dùng để xây chatbot / hiểu ý định hội thoại, không phải dịch vụ chuyên đọc văn bản ra giọng nói.
- **D. Rekognition** sai: Rekognition phân tích ảnh/video, không liên quan đến âm thanh hay văn bản.

📌 Nhớ cho đề: "đọc văn bản ra giọng nói tự nhiên" = **Polly** (text → speech).

</details>

---

**Câu 3 (multiple choice).** Hệ thống review sản phẩm muốn tự động xác định bình luận của khách hàng là tích cực hay tiêu cực. Dịch vụ nào?

A. Comprehend
B. Translate
C. Kendra
D. Personalize

<details>
<summary>Đáp án</summary>

**A. Comprehend** — Comprehend là dịch vụ NLP làm sentiment analysis (tích cực / tiêu cực / trung tính), ngoài ra còn trích entity, key phrase, chủ đề và ngôn ngữ.

Mấu chốt phân biệt trong nhóm xử lý ngôn ngữ: Comprehend "hiểu" ý nghĩa của văn bản, còn Translate chỉ chuyển ngôn ngữ, không đánh giá cảm xúc. Từ khóa "tích cực/tiêu cực" gần như luôn ánh xạ thẳng tới sentiment của Comprehend.

- **B. Translate** sai: chỉ dịch ngôn ngữ, không phân tích cảm xúc của câu.
- **C. Kendra** sai: Kendra là dịch vụ enterprise search (tìm kiếm thông minh trong tài liệu nội bộ), không chấm điểm cảm xúc.
- **D. Personalize** sai: Personalize đưa ra gợi ý/recommendation cá nhân hóa, không phân tích sentiment của bình luận.

📌 Nhớ cho đề: "tích cực / tiêu cực / sentiment / entity trong văn bản" = **Comprehend**.

</details>

---

**Câu 4 (multiple choice).** Website cần dịch nội dung từ tiếng Anh sang nhiều ngôn ngữ khác theo thời gian thực. Dịch vụ nào?

A. Comprehend
B. Transcribe
C. Translate
D. Polly

<details>
<summary>Đáp án</summary>

**C. Translate** — Translate chuyên dịch văn bản từ ngôn ngữ này sang ngôn ngữ khác, hỗ trợ dịch theo thời gian thực cho ứng dụng và website.

Ba dịch vụ dễ nhầm đều thao tác trên văn bản nhưng khác mục đích: Translate đổi *ngôn ngữ*, Comprehend đổi văn bản thành *phân tích ý nghĩa*, Polly đổi văn bản thành *giọng nói*. Đề nhấn "từ tiếng Anh sang nhiều ngôn ngữ khác" là đúng Translate.

- **A. Comprehend** sai: phân tích sentiment/entity, không dịch ngôn ngữ.
- **B. Transcribe** sai: chuyển âm thanh thành chữ, đầu vào là audio chứ không phải văn bản cần dịch.
- **D. Polly** sai: đọc văn bản thành giọng nói, không đổi ngôn ngữ.

📌 Nhớ cho đề: "dịch văn bản sang ngôn ngữ khác" = **Translate**.

</details>

---

**Câu 5 (multiple choice).** Cần nhận diện vật thể và khuôn mặt trong ảnh người dùng upload. Dịch vụ nào?

A. Textract
B. Rekognition
C. Kendra
D. Comprehend

<details>
<summary>Đáp án</summary>

**B. Rekognition** — Rekognition phân tích ảnh và video: nhận diện vật thể, cảnh, khuôn mặt, nội dung không phù hợp, và so khớp khuôn mặt.

Hai dịch vụ "nhìn vào hình ảnh" dễ bị lẫn là Rekognition và Textract: Rekognition hiểu *nội dung thị giác* (có con mèo, có khuôn mặt ai), còn Textract chỉ đọc *chữ và form* trên tài liệu. Đề nói "vật thể và khuôn mặt trong ảnh" là đúng Rekognition.

- **A. Textract** sai: Textract chuyên trích text/bảng/form từ tài liệu scan, không nhận diện vật thể hay khuôn mặt trong ảnh tự nhiên.
- **C. Kendra** sai: Kendra là enterprise search trên tài liệu, không xử lý ảnh.
- **D. Comprehend** sai: Comprehend là NLP trên văn bản, không liên quan tới ảnh.

📌 Nhớ cho đề: "nhận diện vật thể / khuôn mặt trong ảnh/video" = **Rekognition**.

</details>

---

**Câu 6 (multiple choice).** Cần chạy câu lệnh SQL trực tiếp trên dữ liệu đang nằm trong S3 mà không muốn dựng và quản lý server nào. Dịch vụ nào?

A. Redshift
B. EMR
C. Athena
D. Glue

<details>
<summary>Đáp án</summary>

**C. Athena** — Athena cho phép chạy SQL trực tiếp trên dữ liệu trong S3, hoàn toàn serverless, trả tiền theo lượng dữ liệu query quét.

Trong nhóm Analytics, hãy phân biệt theo "cần cluster hay không" và "làm gì": Athena = SQL serverless trên S3, Redshift = data warehouse cần cluster, EMR = cụm Hadoop/Spark, Glue = ETL + catalog. Bộ ba từ khóa "SQL + S3 + không quản lý server" chốt thẳng Athena.

- **A. Redshift** sai: Redshift là data warehouse chạy trên cluster do mình cấp phát; không phải "không server".
- **B. EMR** sai: EMR dựng cụm máy Hadoop/Spark, có server để quản lý, và dùng framework big data chứ không đơn thuần là SQL trên S3.
- **D. Glue** sai: Glue là ETL serverless + Data Catalog, dùng để chuẩn bị/biến đổi dữ liệu, không phải công cụ để ad-hoc query SQL.

📌 Nhớ cho đề: "SQL serverless trực tiếp trên S3" = **Athena**.

</details>

---

**Câu 7 (multiple choice).** Nhóm data engineer cần một dịch vụ ETL serverless kèm data catalog để phát hiện và quản lý schema dữ liệu. Dịch vụ nào?

A. Glue
B. Athena
C. Data Pipeline
D. QuickSight

<details>
<summary>Đáp án</summary>

**A. Glue** — Glue là dịch vụ ETL serverless, kèm Glue Data Catalog và các crawler tự phát hiện (discover) schema của dữ liệu.

Athena và Glue hay bị trộn vì thường đi chung một pipeline, nhưng vai trò khác nhau: Glue *chuẩn bị và biến đổi* dữ liệu (ETL) rồi ghi metadata vào catalog, còn Athena *query* dữ liệu đã sẵn sàng. Hai từ khóa "ETL" và "data catalog" là dấu hiệu riêng của Glue.

- **B. Athena** sai: Athena để query SQL, không phải công cụ ETL hay nơi quản lý/discover schema.
- **C. Data Pipeline** sai: Data Pipeline là dịch vụ điều phối (orchestration) di chuyển/xử lý dữ liệu theo lịch, không cung cấp data catalog serverless kiểu Glue.
- **D. QuickSight** sai: QuickSight là công cụ BI/dashboard ở cuối luồng, không phải ETL.

📌 Nhớ cho đề: "ETL serverless + data catalog / crawler phát hiện schema" = **Glue**.

</details>

---

**Câu 8 (multiple choice).** Công ty muốn dựng dashboard BI để trực quan hóa dữ liệu bán hàng cho lãnh đạo xem. Dịch vụ nào?

A. Athena
B. QuickSight
C. OpenSearch
D. Kendra

<details>
<summary>Đáp án</summary>

**B. QuickSight** — QuickSight là dịch vụ Business Intelligence (BI) của AWS, dùng để dựng dashboard và biểu đồ trực quan hóa dữ liệu cho người dùng nghiệp vụ.

QuickSight nằm ở cuối chuỗi Analytics (chuẩn bị → query → trực quan hóa): nó kết nối tới nguồn dữ liệu (kể cả kết quả từ Athena) và vẽ ra dashboard. Từ khóa "BI", "dashboard", "trực quan hóa" gần như chỉ ánh xạ tới QuickSight ở mức CLF-C02.

- **A. Athena** sai: Athena query dữ liệu bằng SQL nhưng không tự vẽ dashboard BI.
- **C. OpenSearch** sai: OpenSearch chuyên tìm kiếm/phân tích log và full-text, không phải công cụ BI cho lãnh đạo.
- **D. Kendra** sai: Kendra là enterprise search trên tài liệu, không dựng dashboard.

📌 Nhớ cho đề: "BI / dashboard / trực quan hóa" = **QuickSight**.

</details>

---

**Câu 9 (multiple choice).** Cần xây một chatbot có thể hiểu ngôn ngữ tự nhiên và trả lời khách hàng. Dịch vụ nào?

A. Polly
B. Comprehend
C. Lex
D. Connect

<details>
<summary>Đáp án</summary>

**C. Lex** — Lex là dịch vụ xây chatbot và giao diện hội thoại, hiểu ý định (intent) người dùng qua giọng nói hoặc chữ; đây là công nghệ đứng sau Alexa.

Trong các dịch vụ liên quan tới ngôn ngữ, Lex là cái duy nhất chuyên *hội thoại hai chiều* (hỏi–đáp theo intent), khác với các dịch vụ chỉ xử lý một tác vụ đơn trên văn bản/giọng nói. Từ khóa "chatbot" chốt thẳng Lex.

- **A. Polly** sai: Polly chỉ đọc văn bản ra giọng nói, không hiểu hội thoại hay quản lý intent.
- **B. Comprehend** sai: Comprehend phân tích văn bản (sentiment/entity), không dẫn dắt một cuộc hội thoại chatbot.
- **D. Connect** sai: Connect là nền tảng call center/contact center; nó có thể tích hợp Lex nhưng bản thân không phải công cụ xây chatbot.

📌 Nhớ cho đề: "chatbot / hiểu ngôn ngữ tự nhiên để hội thoại" = **Lex**.

</details>

---

**Câu 10 (multiple choice).** Phòng kế toán muốn tự động trích các trường dữ liệu từ hàng nghìn hóa đơn scan (PDF ảnh). Dịch vụ nào?

A. Rekognition
B. Textract
C. Comprehend
D. Kendra

<details>
<summary>Đáp án</summary>

**B. Textract** — Textract là dịch vụ OCR nâng cao, trích text cùng dữ liệu có cấu trúc (form, bảng, cặp key-value) từ tài liệu scan như hóa đơn, biểu mẫu.

Khác biệt cốt lõi với Rekognition: Rekognition hiểu *nội dung thị giác* của ảnh (vật thể, khuôn mặt), còn Textract đọc *chữ và cấu trúc tài liệu*. Đề nói "trích các trường dữ liệu từ hóa đơn scan" là đúng mô tả Textract.

- **A. Rekognition** sai: dùng cho ảnh/video nói chung, không chuyên trích text và form từ tài liệu.
- **C. Comprehend** sai: Comprehend phân tích văn bản *đã có*; nó không trích text ra khỏi hình ảnh scan.
- **D. Kendra** sai: Kendra tìm kiếm trong tài liệu, không trích các trường dữ liệu từ ảnh scan.

📌 Nhớ cho đề: "trích text / form / bảng từ tài liệu scan (OCR)" = **Textract**.

</details>

---

**Câu 11 (multiple choice).** Cần chạy workload xử lý big data trên cụm Apache Spark và Hadoop được managed. Dịch vụ nào?

A. Athena
B. Glue
C. EMR
D. Redshift

<details>
<summary>Đáp án</summary>

**C. EMR** — EMR (Elastic MapReduce) dựng và quản lý cụm máy chạy các framework big data như Apache Hadoop và Spark.

Giữa các dịch vụ Analytics, EMR là cái duy nhất cho ta một *cụm* để chạy framework Hadoop/Spark tùy biến. Khi đề nêu đích danh "Hadoop" hoặc "Spark", đáp án gần như luôn là EMR.

- **A. Athena** sai: Athena là SQL serverless trên S3, không chạy Hadoop/Spark trên cụm.
- **B. Glue** sai: Glue dùng Spark ở bên dưới nhưng được đóng gói thành ETL serverless; đề nhấn "cụm Hadoop/Spark managed" là khớp EMR hơn.
- **D. Redshift** sai: Redshift là data warehouse (SQL analytics), không phải nền tảng Hadoop/Spark.

📌 Nhớ cho đề: "cụm Hadoop / Spark managed cho big data" = **EMR**.

</details>

---

**Câu 12 (multiple choice).** Doanh nghiệp muốn triển khai call center trên cloud để nhân viên nhận và xử lý cuộc gọi khách hàng. Dịch vụ nào?

A. Amazon Connect
B. SES
C. Pinpoint
D. Lex

<details>
<summary>Đáp án</summary>

**A. Amazon Connect** — Connect là nền tảng call center / contact center trên cloud, cho agent nhận, định tuyến và xử lý cuộc gọi của khách hàng.

Nhóm dịch vụ "giao tiếp khách hàng" dễ nhầm theo kênh: Connect = thoại/contact center, SES = email, Pinpoint = chiến dịch marketing đa kênh, Lex = chatbot. Từ khóa "call center / cuộc gọi" chốt Connect.

- **B. SES** sai: SES chỉ gửi/nhận email, không xử lý cuộc gọi thoại.
- **C. Pinpoint** sai: Pinpoint nhắm chiến dịch marketing (email/SMS/push) có đối tượng, không phải call center cho agent.
- **D. Lex** sai: Lex là chatbot/intent; nó có thể cắm vào Connect nhưng tự thân không phải nền tảng call center.

📌 Nhớ cho đề: "call center / contact center trên cloud" = **Amazon Connect**.

</details>

---

**Câu 13 (multiple choice).** Nhóm phát triển muốn tự build, train và deploy một mô hình machine learning tùy biến của riêng họ. Dịch vụ nào?

A. Rekognition
B. SageMaker
C. Forecast
D. Comprehend

<details>
<summary>Đáp án</summary>

**B. SageMaker** — SageMaker là nền tảng ML tổng quát để tự build, train và deploy mô hình machine learning tùy biến của riêng mình.

Đây là ranh giới quan trọng trong đề: SageMaker là *nền tảng để tự làm model*, còn Rekognition/Comprehend/Forecast là các AI managed *gọi API có sẵn* cho bài toán cố định. Cụm từ "tự build / train / deploy model tùy biến" là dấu hiệu riêng của SageMaker.

- **A. Rekognition** sai: dịch vụ AI dựng sẵn cho ảnh/video, không cho tự train model của mình.
- **C. Forecast** sai: Forecast là dịch vụ dự báo chuỗi thời gian dựng sẵn, không phải nền tảng tự build model tổng quát.
- **D. Comprehend** sai: dịch vụ NLP dựng sẵn gọi qua API, không dùng để tự train model tùy biến.

📌 Nhớ cho đề: "tự build / train / deploy model ML tùy biến" = **SageMaker** (còn AI managed khác = gọi API sẵn).

</details>

---

**Câu 14 (multiple choice).** Công ty cần gửi lượng lớn email xác nhận giao dịch (transactional email) từ ứng dụng. Dịch vụ nào?

A. Pinpoint
B. SES
C. Connect
D. SNS

<details>
<summary>Đáp án</summary>

**B. SES (Simple Email Service)** — SES là dịch vụ chuyên gửi email ở quy mô lớn, hợp cho email giao dịch (xác nhận, hóa đơn, reset mật khẩu) phát trực tiếp từ ứng dụng.

Phân biệt theo mục đích gửi: SES = hạ tầng gửi email transactional/bulk, Pinpoint = chiến dịch marketing đa kênh có nhắm đối tượng, SNS = pub/sub và thông báo (chủ yếu A2A/push/SMS), Connect = call center thoại.

- **A. Pinpoint** sai: Pinpoint thiên về campaign marketing đa kênh có phân khúc đối tượng, không phải kênh gửi transactional email thuần.
- **C. Connect** sai: Connect là call center thoại, không gửi email.
- **D. SNS** sai: SNS là dịch vụ pub/sub cho thông báo giữa hệ thống (và push/SMS), không phải dịch vụ email transactional chuyên dụng.

📌 Nhớ cho đề: "gửi email (transactional / bulk) từ ứng dụng" = **SES**.

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

**A. Athena** và **C. QuickSight** — Athena query SQL serverless trực tiếp trên S3, còn QuickSight dựng dashboard BI từ kết quả. Đây là hai mắt xích "query" và "trực quan hóa" của luồng Analytics.

Luồng Analytics điển hình là: Glue (ETL/catalog) → Athena (query) → QuickSight (dashboard). Đề yêu cầu đúng hai bước query + visualize nên chọn Athena và QuickSight; Glue là bước ETL/catalog đứng trước nhưng không có trong lựa chọn.

- **B. EMR** sai: EMR là cụm Hadoop/Spark cho big data, không phải SQL-trên-S3 cũng không phải BI.
- **D. MSK** sai: MSK là Managed Streaming for Apache Kafka (hàng đợi streaming), không phải query hay dashboard.
- **E. Data Pipeline** sai: Data Pipeline điều phối di chuyển/xử lý dữ liệu theo lịch, không query SQL trên S3 cũng không vẽ dashboard.

📌 Nhớ cho đề: query SQL trên S3 = **Athena**; dashboard BI = **QuickSight**.

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

**B. Polly** (text → speech) và **D. Transcribe** (speech → text) — cả hai là AI managed chuyên về giọng nói, dựng sẵn và gọi qua API, đúng tiêu chí "ngôn ngữ/giọng nói, không phải ảnh, không tự train".

Cặp Polly/Transcribe là hai chiều đối xứng của cùng một trục âm thanh–văn bản, nên đi chung nhóm "giọng nói". Các lựa chọn còn lại thuộc nhóm khác hẳn (ảnh, tự train model, hoặc BI).

- **A. Rekognition** sai: xử lý ảnh/video, không thuộc nhóm ngôn ngữ/giọng nói.
- **C. SageMaker** sai: là nền tảng để tự build/train model, không phải AI managed gọi API sẵn.
- **E. QuickSight** sai: là dịch vụ BI/dashboard, không liên quan tới AI/ML xử lý giọng nói.

📌 Nhớ cho đề: nhóm giọng nói managed = **Polly** (text → speech) + **Transcribe** (speech → text).

</details>

---

## Related Topics

- [Machine Learning, Analytics & dịch vụ khác (reference)](../reference/ai-ml-and-analytics.md)
- [Trang hub AWS](../index.md)
