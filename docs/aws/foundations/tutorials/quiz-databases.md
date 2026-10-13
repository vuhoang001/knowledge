---
title: "Câu hỏi: Databases"
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

**B. Multi-AZ deployment.** Multi-AZ tạo một standby ở AZ khác, replication synchronous, và **tự động failover** khi primary/AZ hỏng. Read Replica (A) là để scale đọc, không tự failover. DAX và ElastiCache là cache.

</details>

---

**Câu 2 (multiple choice).** Database RDS PostgreSQL đang bị nghẽn vì **lượng query đọc rất lớn** (read-heavy). Muốn giảm tải đọc cho primary. Giải pháp phù hợp nhất?

- A. Multi-AZ deployment
- B. Tăng kích thước instance lớn hơn mãi
- C. Read Replica
- D. Chuyển sang DynamoDB

<details>
<summary>Đáp án</summary>

**C. Read Replica.** Read Replica là bản read-only phục vụ query đọc, chia tải khỏi primary — đúng cho workload read-heavy. Multi-AZ (A) không phục vụ traffic nên không giúp scale đọc.

</details>

---

**Câu 3 (multiple choice).** Cần một database **NoSQL, serverless, fully managed**, scale cực lớn với độ trễ single-digit millisecond cho backend một ứng dụng di động. Chọn?

- A. RDS
- B. Aurora
- C. DynamoDB
- D. Redshift

<details>
<summary>Đáp án</summary>

**C. DynamoDB.** NoSQL key-value, serverless, fully managed, millisecond latency, scale lớn. RDS/Aurora là relational; Redshift là data warehouse.

</details>

---

**Câu 4 (multiple choice).** Công ty cần một **data warehouse** để chạy query phân tích SQL phức tạp trên hàng tỷ dòng phục vụ báo cáo BI. Dịch vụ nào?

- A. DynamoDB
- B. Redshift
- C. RDS
- D. ElastiCache

<details>
<summary>Đáp án</summary>

**B. Redshift.** Redshift là data warehouse cho OLAP/analytics, column-oriented, tối ưu cho query phân tích trên dữ liệu lớn.

</details>

---

**Câu 5 (multiple choice).** Ứng dụng web đọc đi đọc lại cùng một tập dữ liệu từ RDS, gây tải lớn lên database. Muốn **giảm tải đọc bằng in-memory cache** đặt trước DB. Dịch vụ nào?

- A. ElastiCache
- B. DAX
- C. Read Replica
- D. S3

<details>
<summary>Đáp án</summary>

**A. ElastiCache.** ElastiCache (Redis/Memcached) là in-memory cache đa dụng đặt trước database relational để giảm tải đọc. DAX (B) chỉ dành cho DynamoDB.

</details>

---

**Câu 6 (multiple choice).** Ứng dụng dùng DynamoDB và cần tăng tốc đọc xuống mức **microsecond** bằng cache chuyên dụng. Dùng gì?

- A. ElastiCache for Redis
- B. DAX
- C. Read Replica
- D. CloudFront

<details>
<summary>Đáp án</summary>

**B. DAX (DynamoDB Accelerator).** Đây là in-memory cache chuyên cho DynamoDB, đưa độ trễ đọc xuống microsecond. ElastiCache không gắn trực tiếp với DynamoDB như DAX.

</details>

---

**Câu 7 (multiple choice).** Cần database relational **tương thích MySQL/PostgreSQL**, cloud-native, hiệu năng cao, do AWS phát triển. Đó là?

- A. RDS for MySQL
- B. Aurora
- C. DocumentDB
- D. Neptune

<details>
<summary>Đáp án</summary>

**B. Aurora.** Aurora tương thích MySQL và PostgreSQL, hiệu năng cao, cloud-native. RDS for MySQL (A) là MySQL chuẩn do AWS quản, không phải engine Aurora.

</details>

---

**Câu 8 (multiple choice).** Workload có lưu lượng **biến động, khó đoán trước**; muốn một database relational **tự scale capacity lên/xuống** và trả tiền theo lượng dùng. Chọn?

- A. Aurora Serverless
- B. RDS Multi-AZ
- C. DynamoDB provisioned
- D. Redshift

<details>
<summary>Đáp án</summary>

**A. Aurora Serverless.** Tự scale compute theo tải và trả theo lượng dùng — hợp với workload biến động/không đoán trước.

</details>

---

**Câu 9 (multiple choice).** Phân biệt đúng về **Multi-AZ** trong RDS?

- A. Standby phục vụ query đọc để scale
- B. Replication bất đồng bộ
- C. Standby ở AZ khác, synchronous, tự failover khi primary hỏng
- D. Chỉ dùng để giảm chi phí

<details>
<summary>Đáp án</summary>

**C.** Multi-AZ = standby ở AZ khác, replication synchronous, tự động failover. Standby **không** phục vụ traffic (loại A); replication là synchronous chứ không async (loại B).

</details>

---

**Câu 10 (multiple choice).** Cần di chuyển một database Oracle on-premises lên AWS với **downtime tối thiểu**, source vẫn chạy trong lúc migrate. Dịch vụ nào?

- A. DMS (Database Migration Service)
- B. Snowball
- C. DataSync
- D. DynamoDB

<details>
<summary>Đáp án</summary>

**A. DMS.** Database Migration Service chuyển database vào AWS với downtime tối thiểu, source tiếp tục hoạt động trong khi migrate. (Di chuyển schema khác engine dùng kèm SCT.)

</details>

---

**Câu 11 (multiple choice).** Dữ liệu có cấu trúc **đồ thị** — quan hệ giữa các thực thể (mạng xã hội, recommendation, fraud detection). Database phù hợp?

- A. DynamoDB
- B. Neptune
- C. Timestream
- D. QLDB

<details>
<summary>Đáp án</summary>

**B. Neptune.** Neptune là graph database, tối ưu cho dữ liệu quan hệ dạng đồ thị.

</details>

---

**Câu 12 (multiple choice).** Dịch vụ nào tương thích **MongoDB**?

- A. Keyspaces
- B. DocumentDB
- C. DynamoDB
- D. MemoryDB

<details>
<summary>Đáp án</summary>

**B. DocumentDB.** DocumentDB là document database tương thích MongoDB. Keyspaces (A) tương thích Cassandra; MemoryDB (D) tương thích Redis.

</details>

---

**Câu 13 (multiple choice).** Khi nào nên chọn **tự cài database trên EC2** thay vì RDS?

- A. Khi muốn giảm công vận hành (patching, backup tự động)
- B. Khi cần quyền truy cập OS hoặc một cấu hình/engine mà RDS không hỗ trợ
- C. Khi cần Multi-AZ failover tự động
- D. Khi muốn AWS lo mọi thứ quản lý

<details>
<summary>Đáp án</summary>

**B.** Tự cài trên EC2 chỉ hợp lý khi cần toàn quyền OS hoặc cấu hình/engine RDS không hỗ trợ. Mọi lý do còn lại (A, C, D) đều nghiêng về RDS vì giảm operational overhead.

</details>

---

**Câu 14 (multiple response — chọn 2).** Những phát biểu nào **đúng** về RDS?

- A. RDS là dịch vụ managed, AWS lo patching và backup tự động
- B. RDS hỗ trợ MySQL, PostgreSQL, MariaDB, Oracle và SQL Server
- C. RDS là database NoSQL serverless
- D. RDS được thiết kế cho workload OLAP/data warehouse

<details>
<summary>Đáp án</summary>

**A và B.** RDS là relational managed, lo patching/backup (A), hỗ trợ 5 engine kể trên (B). RDS không phải NoSQL (C sai — đó là DynamoDB) và không phải data warehouse OLAP (D sai — đó là Redshift).

</details>

---

**Câu 15 (multiple response — chọn 2).** Chọn hai dịch vụ là **in-memory cache**.

- A. ElastiCache
- B. DAX
- C. Redshift
- D. Neptune

<details>
<summary>Đáp án</summary>

**A và B.** ElastiCache (Redis/Memcached) là in-memory cache đa dụng; DAX là in-memory cache chuyên cho DynamoDB. Redshift là data warehouse, Neptune là graph database.

</details>

---

**Câu 16 (multiple choice).** Cần một kho dữ liệu **in-memory nhưng durable** (bền, không mất khi restart) để làm database chính tốc độ cao, tương thích Redis. Chọn?

- A. ElastiCache for Redis
- B. MemoryDB
- C. DAX
- D. DynamoDB

<details>
<summary>Đáp án</summary>

**B. MemoryDB.** MemoryDB tương thích Redis nhưng **durable**, dùng làm database chính. ElastiCache for Redis (A) thiên về cache (dữ liệu có thể mất), không phải nguồn lưu trữ chính bền vững.

</details>

---

## Related Topics

- [Databases — RDS, Aurora, DynamoDB, ElastiCache, Redshift](../reference/databases.md)
- [AWS — trang chủ chủ đề](../index.md)
