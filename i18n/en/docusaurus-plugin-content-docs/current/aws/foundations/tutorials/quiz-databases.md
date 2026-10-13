---
title: "Câu hỏi: Databases"
i18n_status: untranslated
sidebar_position: 6
description: "Tự chấm phần database managed của AWS — RDS/Aurora/DynamoDB/Redshift."
tags: [aws, clf-c02, quiz, database]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-13
---

> **Chốt:** Hầu hết câu database trong CLF-C02 là "mô tả nhu cầu → chọn dịch vụ". Nhận ra từ khóa (failover, read-heavy, NoSQL serverless, cache, analytics) là xong nửa bài.

Tự chấm: đọc câu hỏi, chọn đáp án, rồi mở phần giải thích. Mỗi câu ghi rõ loại — **multiple choice** (chọn 1) hay **multiple response** (chọn nhiều).

---

**Câu 1 (multiple choice).** Một ứng dụng dùng RDS MySQL. Yêu cầu: nếu database primary hoặc cả Availability Zone của nó hỏng thì phải **tự động failover** sang bản dự phòng với downtime tối thiểu. Nên dùng gì?

- A. Read Replica
- B. Multi-AZ deployment
- C. DAX
- D. ElastiCache

<details>
<summary>Đáp án</summary>

**B. Multi-AZ deployment** — đây là tính năng high availability của RDS, dựng sẵn cho đúng kịch bản "primary hoặc AZ hỏng → tự failover".

Multi-AZ tạo một bản **standby** ở một Availability Zone khác, replication **synchronous** (mọi ghi vào primary được sao chép đồng bộ sang standby). Khi primary hoặc cả AZ của nó hỏng, RDS **tự chuyển endpoint** sang standby mà không cần đổi connection string — downtime chỉ cỡ thời gian failover, không mất dữ liệu đã commit. Từ khóa nhận diện: "failover", "high availability", "AZ hỏng".

- A — Read Replica là bản read-only để **scale đọc**, không được thiết kế để tự failover; nó chủ yếu phục vụ workload read-heavy, không phải HA.
- C — DAX là in-memory cache **chỉ dành cho DynamoDB**, không liên quan tới RDS hay failover.
- D — ElastiCache là lớp cache in-memory đặt trước database, cũng không cung cấp cơ chế failover cho RDS primary.

📌 Nhớ cho đề: "failover / high availability" trong RDS = **Multi-AZ**; "scale đọc" = **Read Replica**. Đừng lẫn hai cái.

</details>

---

**Câu 2 (multiple choice).** Database RDS PostgreSQL đang bị nghẽn vì **lượng query đọc rất lớn** (read-heavy). Muốn giảm tải đọc cho primary. Giải pháp phù hợp nhất?

- A. Multi-AZ deployment
- B. Tăng kích thước instance lớn hơn mãi
- C. Read Replica
- D. Chuyển sang DynamoDB

<details>
<summary>Đáp án</summary>

**C. Read Replica** — tạo bản sao read-only để gánh bớt query đọc, đúng bài toán read-heavy.

Read Replica là một hoặc nhiều bản **read-only** của database, replication **asynchronous** từ primary. Ứng dụng gửi các query đọc sang replica để chia tải khỏi primary, giúp scale throughput đọc theo chiều ngang. Từ khóa nhận diện: "read-heavy", "giảm tải đọc", "scale đọc".

- A — Multi-AZ chỉ để high availability/failover; standby **không phục vụ traffic** nên không giúp scale đọc chút nào.
- B — Scale up (tăng instance) có giới hạn và tốn kém, không bền vững khi tải đọc tăng mãi; đề muốn hướng scale-out hợp lý hơn.
- D — Chuyển sang DynamoDB là đổi toàn bộ mô hình dữ liệu sang NoSQL, quá mức và không cần thiết chỉ để giảm tải đọc trên một DB relational đang chạy.

📌 Nhớ cho đề: "read-heavy / scale đọc" = **Read Replica**; đừng chọn Multi-AZ vì standby không nhận traffic.

</details>

---

**Câu 3 (multiple choice).** Cần một database **NoSQL, serverless, fully managed**, scale cực lớn với độ trễ single-digit millisecond cho backend một ứng dụng di động. Chọn?

- A. RDS
- B. Aurora
- C. DynamoDB
- D. Redshift

<details>
<summary>Đáp án</summary>

**C. DynamoDB** — NoSQL key-value serverless của AWS, khớp đủ mọi từ khóa trong đề.

DynamoDB là database **NoSQL** (key-value và document), **serverless** (không quản instance, tự scale), fully managed, cho độ trễ **single-digit millisecond** ở quy mô rất lớn. Nó hợp với backend mobile/web cần throughput cao và lược đồ linh hoạt. Từ khóa nhận diện: "NoSQL", "serverless", "single-digit millisecond", "scale cực lớn".

- A — RDS là database **relational**, chạy trên instance (không serverless theo nghĩa này), không phải NoSQL.
- B — Aurora cũng **relational** (tương thích MySQL/PostgreSQL); không phải NoSQL.
- D — Redshift là **data warehouse** cho OLAP/analytics, không phải DB giao dịch độ trễ thấp cho app.

📌 Nhớ cho đề: "NoSQL + serverless + millisecond" = **DynamoDB**. Relational thì nghĩ RDS/Aurora, analytics thì nghĩ Redshift.

</details>

---

**Câu 4 (multiple choice).** Công ty cần một **data warehouse** để chạy query phân tích SQL phức tạp trên hàng tỷ dòng phục vụ báo cáo BI. Dịch vụ nào?

- A. DynamoDB
- B. Redshift
- C. RDS
- D. ElastiCache

<details>
<summary>Đáp án</summary>

**B. Redshift** — dịch vụ data warehouse của AWS, dành riêng cho query phân tích quy mô lớn.

Redshift là **data warehouse** cho workload **OLAP/analytics**: lưu trữ **column-oriented** và xử lý song song (MPP), tối ưu để quét và tổng hợp trên hàng tỷ dòng phục vụ BI/báo cáo. Từ khóa nhận diện: "data warehouse", "analytics", "BI", "query phức tạp trên dữ liệu lớn".

- A — DynamoDB là NoSQL cho truy cập theo key độ trễ thấp (OLTP), không hợp để quét-tổng hợp phân tích diện rộng.
- C — RDS là relational cho workload giao dịch (OLTP), không phải warehouse OLAP cho hàng tỷ dòng.
- D — ElastiCache là in-memory cache, không phải nơi lưu và phân tích dữ liệu lớn.

📌 Nhớ cho đề: "data warehouse / OLAP / analytics / BI" = **Redshift**. Giao dịch hằng ngày (OLTP) mới là RDS/Aurora/DynamoDB.

</details>

---

**Câu 5 (multiple choice).** Ứng dụng web đọc đi đọc lại cùng một tập dữ liệu từ RDS, gây tải lớn lên database. Muốn **giảm tải đọc bằng in-memory cache** đặt trước DB. Dịch vụ nào?

- A. ElastiCache
- B. DAX
- C. Read Replica
- D. S3

<details>
<summary>Đáp án</summary>

**A. ElastiCache** — lớp cache in-memory đa dụng đặt trước database relational.

ElastiCache (engine **Redis** hoặc **Memcached**) giữ dữ liệu nóng trong bộ nhớ để ứng dụng đọc từ cache thay vì đi tới DB, cắt phần lớn truy vấn lặp lại khỏi RDS và giảm độ trễ. Từ khóa nhận diện: "in-memory cache", "đọc lặp lại", "giảm tải đọc đặt trước DB".

- B — DAX là in-memory cache **chỉ cho DynamoDB**, không dùng trước RDS.
- C — Read Replica cũng giảm tải đọc nhưng nó là một bản DB relational (vẫn là query DB), không phải "in-memory cache" như đề yêu cầu.
- D — S3 là object storage, không phải cache in-memory đặt trước database.

📌 Nhớ cho đề: cache in-memory trước DB **relational** = **ElastiCache**; cache cho **DynamoDB** = **DAX**.

</details>

---

**Câu 6 (multiple choice).** Ứng dụng dùng DynamoDB và cần tăng tốc đọc xuống mức **microsecond** bằng cache chuyên dụng. Dùng gì?

- A. ElastiCache for Redis
- B. DAX
- C. Read Replica
- D. CloudFront

<details>
<summary>Đáp án</summary>

**B. DAX (DynamoDB Accelerator)** — cache in-memory tích hợp sẵn, chuyên cho DynamoDB.

DAX là lớp cache in-memory **fully managed dành riêng cho DynamoDB**, hạ độ trễ đọc từ mức millisecond xuống **microsecond** mà hầu như không phải sửa code (API tương thích DynamoDB). Từ khóa nhận diện: "DynamoDB" + "microsecond" + "cache".

- A — ElastiCache for Redis là cache đa dụng, không gắn trực tiếp vào DynamoDB; muốn dùng phải tự viết logic cache-aside, không "chuyên dụng" như DAX.
- C — Read Replica là khái niệm của RDS (DB relational), không áp dụng cho DynamoDB.
- D — CloudFront là CDN để cache nội dung web ở biên, không phải cache cho truy vấn database.

📌 Nhớ cho đề: thấy "DynamoDB + microsecond" là chọn **DAX** ngay.

</details>

---

**Câu 7 (multiple choice).** Cần database relational **tương thích MySQL/PostgreSQL**, cloud-native, hiệu năng cao, do AWS phát triển. Đó là?

- A. RDS for MySQL
- B. Aurora
- C. DocumentDB
- D. Neptune

<details>
<summary>Đáp án</summary>

**B. Aurora** — engine relational cloud-native của AWS, tương thích cả MySQL và PostgreSQL.

Aurora là database relational do AWS tự phát triển, **tương thích MySQL và PostgreSQL** (dùng được driver/công cụ sẵn có), với lớp storage phân tán cho hiệu năng và độ bền cao hơn so với engine chuẩn. Từ khóa nhận diện: "cloud-native", "AWS phát triển", "tương thích MySQL/PostgreSQL", "hiệu năng cao".

- A — RDS for MySQL chạy engine **MySQL chuẩn** do AWS quản lý, không phải engine Aurora của AWS.
- C — DocumentDB là **document database** tương thích MongoDB (NoSQL), không phải relational tương thích MySQL/PostgreSQL.
- D — Neptune là **graph database**, không phải relational.

📌 Nhớ cho đề: "AWS tự làm, tương thích MySQL/PostgreSQL, hiệu năng cao" = **Aurora**.

</details>

---

**Câu 8 (multiple choice).** Workload có lưu lượng **biến động, khó đoán trước**; muốn một database relational **tự scale capacity lên/xuống** và trả tiền theo lượng dùng. Chọn?

- A. Aurora Serverless
- B. RDS Multi-AZ
- C. DynamoDB provisioned
- D. Redshift

<details>
<summary>Đáp án</summary>

**A. Aurora Serverless** — Aurora ở chế độ serverless, tự co giãn compute theo tải.

Aurora Serverless **tự động scale compute lên/xuống** theo lưu lượng và cho phép **trả tiền theo lượng dùng**, nên hợp với workload biến động hoặc khó dự đoán mà vẫn giữ mô hình relational. Từ khóa nhận diện: "relational" + "biến động/khó đoán" + "tự scale" + "trả theo lượng dùng".

- B — RDS Multi-AZ là cấu hình **high availability**, không tự scale capacity theo tải.
- C — DynamoDB **provisioned** là NoSQL và ở chế độ provisioned bạn phải cấp capacity cố định (đề muốn relational + tự scale, nên cái này sai cả hai điểm).
- D — Redshift là data warehouse cho analytics, không phải DB relational giao dịch tự co giãn theo app traffic.

📌 Nhớ cho đề: "relational + serverless/tự scale + pay-per-use" = **Aurora Serverless**.

</details>

---

**Câu 9 (multiple choice).** Phân biệt đúng về **Multi-AZ** trong RDS?

- A. Standby phục vụ query đọc để scale
- B. Replication bất đồng bộ
- C. Standby ở AZ khác, synchronous, tự failover khi primary hỏng
- D. Chỉ dùng để giảm chi phí

<details>
<summary>Đáp án</summary>

**C. Standby ở AZ khác, synchronous, tự failover khi primary hỏng** — đúng bản chất Multi-AZ.

Multi-AZ là cơ chế **high availability** của RDS: một standby đặt ở **Availability Zone khác**, replication **synchronous**, và khi primary hoặc AZ của nó hỏng thì RDS **tự failover** sang standby. Điểm mấu chốt dễ bị gài: standby **không phục vụ traffic đọc**.

- A — Sai, đây là đặc điểm của **Read Replica** (scale đọc), không phải Multi-AZ; standby Multi-AZ không nhận query.
- B — Sai, Multi-AZ dùng replication **synchronous** (để không mất dữ liệu khi failover), còn asynchronous là của Read Replica.
- D — Sai, Multi-AZ là để **tăng độ sẵn sàng**, thực tế còn tốn thêm chi phí cho standby, không phải để giảm chi phí.

📌 Nhớ cho đề: Multi-AZ = standby AZ khác + **synchronous** + tự failover + **không phục vụ đọc**.

</details>

---

**Câu 10 (multiple choice).** Cần di chuyển một database Oracle on-premises lên AWS với **downtime tối thiểu**, source vẫn chạy trong lúc migrate. Dịch vụ nào?

- A. DMS (Database Migration Service)
- B. Snowball
- C. DataSync
- D. DynamoDB

<details>
<summary>Đáp án</summary>

**A. DMS (Database Migration Service)** — dịch vụ chuyên di chuyển database vào AWS.

DMS di chuyển dữ liệu database vào AWS với **downtime tối thiểu**: nó sao chép dữ liệu ban đầu rồi **replicate liên tục các thay đổi**, nên **source vẫn chạy** trong khi migrate. Khi chuyển giữa hai engine khác nhau (ví dụ Oracle → PostgreSQL), DMS thường dùng kèm **SCT** (Schema Conversion Tool) để chuyển schema. Từ khóa nhận diện: "migrate database", "downtime tối thiểu", "source vẫn chạy".

- B — Snowball là thiết bị vật lý để chuyển **khối lượng dữ liệu lớn** offline, không phải công cụ migrate database đang chạy với downtime tối thiểu.
- C — DataSync dùng để **chuyển file/object** (file shares, S3, EFS...), không phải để migrate database relational.
- D — DynamoDB là một database NoSQL, không phải dịch vụ migration.

📌 Nhớ cho đề: "migrate database vào AWS, downtime tối thiểu" = **DMS** (đổi engine thì kèm **SCT**).

</details>

---

**Câu 11 (multiple choice).** Dữ liệu có cấu trúc **đồ thị** — quan hệ giữa các thực thể (mạng xã hội, recommendation, fraud detection). Database phù hợp?

- A. DynamoDB
- B. Neptune
- C. Timestream
- D. QLDB

<details>
<summary>Đáp án</summary>

**B. Neptune** — graph database của AWS, dành cho dữ liệu dạng đồ thị.

Neptune là **graph database** tối ưu cho quan hệ nhiều-nhiều phức tạp giữa các thực thể — nên hợp với mạng xã hội, recommendation engine, fraud detection. Từ khóa nhận diện: "graph", "quan hệ giữa các thực thể", "social network / recommendation / fraud".

- A — DynamoDB là NoSQL key-value/document, không tối ưu để duyệt quan hệ dạng đồ thị.
- C — Timestream là **time-series database** (dữ liệu theo thời gian, IoT/metrics), không phải graph.
- D — QLDB là **ledger database** (sổ cái bất biến, có thể kiểm chứng), không phải graph.

📌 Nhớ cho đề: "graph / mạng quan hệ" = **Neptune**; time-series = Timestream; ledger = QLDB.

</details>

---

**Câu 12 (multiple choice).** Dịch vụ nào tương thích **MongoDB**?

- A. Keyspaces
- B. DocumentDB
- C. DynamoDB
- D. MemoryDB

<details>
<summary>Đáp án</summary>

**B. DocumentDB** — document database của AWS, tương thích MongoDB.

DocumentDB là **document database** (lưu trữ kiểu JSON) **tương thích MongoDB**, nên ứng dụng dùng driver/API MongoDB có thể chạy với ít thay đổi. Mẹo: mỗi dịch vụ "tương thích" một hệ nguồn khác nhau, cần nhớ đúng cặp.

- A — Keyspaces tương thích **Apache Cassandra**, không phải MongoDB.
- C — DynamoDB là NoSQL của AWS với API riêng, không tương thích MongoDB.
- D — MemoryDB tương thích **Redis**, không phải MongoDB.

📌 Nhớ cho đề: DocumentDB↔MongoDB, Keyspaces↔Cassandra, MemoryDB/ElastiCache for Redis↔Redis.

</details>

---

**Câu 13 (multiple choice).** Khi nào nên chọn **tự cài database trên EC2** thay vì RDS?

- A. Khi muốn giảm công vận hành (patching, backup tự động)
- B. Khi cần quyền truy cập OS hoặc một cấu hình/engine mà RDS không hỗ trợ
- C. Khi cần Multi-AZ failover tự động
- D. Khi muốn AWS lo mọi thứ quản lý

<details>
<summary>Đáp án</summary>

**B. Khi cần quyền truy cập OS hoặc một cấu hình/engine mà RDS không hỗ trợ** — đó là lý do chính đáng duy nhất để tự quản.

RDS là **managed service**: AWS lo patching, backup, Multi-AZ, high availability — đổi lại bạn **không có quyền OS** và bị giới hạn ở các engine/cấu hình RDS hỗ trợ. Tự cài DB trên **EC2** chỉ đáng khi bạn cần toàn quyền hệ điều hành hoặc một engine/tinh chỉnh mà RDS không cho. Đây là câu về mô hình **shared responsibility** và đánh đổi managed vs self-managed.

- A — "Giảm công vận hành" chính là lý do chọn **RDS**, không phải EC2 (tự cài thì bạn gánh patching/backup).
- C — "Multi-AZ failover tự động" là tính năng sẵn của **RDS**; tự dựng trên EC2 bạn phải tự làm, nên không phải lý do chọn EC2.
- D — "AWS lo mọi thứ" cũng là ưu điểm của **RDS**, ngược hẳn với tự quản trên EC2.

📌 Nhớ cho đề: chọn EC2 cho DB chỉ khi cần **OS access** hoặc engine/cấu hình RDS không hỗ trợ; mọi lý do "đỡ việc vận hành" đều nghiêng về RDS.

</details>

---

**Câu 14 (multiple response — chọn 2).** Những phát biểu nào **đúng** về RDS?

- A. RDS là dịch vụ managed, AWS lo patching và backup tự động
- B. RDS hỗ trợ MySQL, PostgreSQL, MariaDB, Oracle và SQL Server
- C. RDS là database NoSQL serverless
- D. RDS được thiết kế cho workload OLAP/data warehouse

<details>
<summary>Đáp án</summary>

**A và B** — RDS là dịch vụ relational managed, và nó hỗ trợ đúng bộ engine nêu ở B.

RDS là dịch vụ **relational database managed**: AWS lo patching, backup tự động, Multi-AZ, Read Replica (A đúng). Nó hỗ trợ các engine **MySQL, PostgreSQL, MariaDB, Oracle, SQL Server** (và Aurora) — nên B đúng. RDS phục vụ workload giao dịch (**OLTP**).

- C — Sai. RDS là **relational**, không phải NoSQL; database NoSQL serverless của AWS là **DynamoDB**.
- D — Sai. RDS cho **OLTP**, không phải data warehouse OLAP; dịch vụ OLAP/warehouse là **Redshift**.

📌 Nhớ cho đề: RDS = relational, managed, 5 engine + Aurora, dùng cho OLTP. NoSQL→DynamoDB, OLAP→Redshift.

</details>

---

**Câu 15 (multiple response — chọn 2).** Chọn hai dịch vụ là **in-memory cache**.

- A. ElastiCache
- B. DAX
- C. Redshift
- D. Neptune

<details>
<summary>Đáp án</summary>

**A và B** — ElastiCache và DAX đều là cache in-memory.

**ElastiCache** (Redis/Memcached) là in-memory cache **đa dụng** đặt trước bất kỳ database nào để giảm tải đọc; **DAX** là in-memory cache **chuyên cho DynamoDB**, hạ độ trễ đọc xuống microsecond. Cả hai giữ dữ liệu trong RAM để trả lời nhanh.

- C — Redshift là **data warehouse** (OLAP), không phải cache.
- D — Neptune là **graph database**, không phải cache.

📌 Nhớ cho đề: hai cache in-memory cần nhớ = **ElastiCache** (đa dụng) và **DAX** (cho DynamoDB).

</details>

---

**Câu 16 (multiple choice).** Cần một kho dữ liệu **in-memory nhưng durable** (bền, không mất khi restart) để làm database chính tốc độ cao, tương thích Redis. Chọn?

- A. ElastiCache for Redis
- B. MemoryDB
- C. DAX
- D. DynamoDB

<details>
<summary>Đáp án</summary>

**B. MemoryDB** — database in-memory **durable**, tương thích Redis, dùng làm database chính.

MemoryDB là database **in-memory tương thích Redis** nhưng được thiết kế **durable** (bền): dữ liệu không mất khi restart nhờ lưu bền vững, nên có thể dùng làm **primary database** tốc độ cao chứ không chỉ là cache. Từ khóa nhận diện: "in-memory" + "durable/bền" + "database chính" + "Redis".

- A — ElastiCache for Redis thiên về **cache** (dữ liệu có thể mất), không được xem là nguồn lưu trữ chính bền vững như MemoryDB.
- C — DAX là cache chuyên cho DynamoDB, không phải database chính tương thích Redis.
- D — DynamoDB là NoSQL trên disk của AWS (durable), nhưng không phải in-memory tương thích Redis như đề yêu cầu.

📌 Nhớ cho đề: "in-memory + durable + database chính + Redis" = **MemoryDB**; còn ElastiCache for Redis chỉ là cache.

</details>

---

## Related Topics

- [Databases — RDS, Aurora, DynamoDB, ElastiCache, Redshift](../reference/databases.md)
- [AWS — trang chủ chủ đề](../index.md)
