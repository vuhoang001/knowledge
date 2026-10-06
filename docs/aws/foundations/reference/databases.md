---
title: Database
sidebar_position: 12
description: "RDS, Aurora, DynamoDB, MemoryDB, Neptune, Redshift — chọn theo hình dạng dữ liệu và kiểu truy vấn. Kèm cặp DMS/SCT và ranh giới Multi-AZ với read replica."
tags: [aws, clf-c02, rds, aurora, dynamodb, elasticache, dms, redshift, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Database

> **Chốt:** Chọn database theo **hình dạng dữ liệu và kiểu truy vấn**, không theo "cái nào
> mạnh hơn". Quan hệ + SQL → **RDS/Aurora**. Khoá–giá trị, độ trễ một chữ số ms, quy mô
> lớn → **DynamoDB**. Phân tích trên hàng tỉ dòng → **Redshift**. Đồ thị → **Neptune**.
> Trong bộ nhớ → **ElastiCache / MemoryDB**.

## Mục tiêu

Task 3.4 đòi: quyết định **EC2 tự dựng ⇄ managed**, nhận ra database **quan hệ**,
**NoSQL**, **trong bộ nhớ**, và nhận ra công cụ **migration** (DMS, SCT).

## Tổng quan

### Chọn theo loại

| Loại | Service | Dấu hiệu trong đề |
|---|---|---|
| **Quan hệ (OLTP)** | **Amazon RDS** — MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2 | *relational*, *SQL*, *existing MySQL app* |
| Quan hệ, hiệu năng cao | **Amazon Aurora** — tương thích MySQL/PostgreSQL | *MySQL-compatible but faster*, *cloud-native relational* |
| **Khoá–giá trị / document** | **Amazon DynamoDB** | *NoSQL*, *single-digit millisecond*, *serverless*, *massive scale* |
| **Trong bộ nhớ** | **Amazon ElastiCache** (Redis/Memcached) · **Amazon MemoryDB for Redis** | *cache*, *session store*, *microsecond read* |
| **Đồ thị** | **Amazon Neptune** | *relationships*, *social network*, *fraud ring*, *knowledge graph* |
| **Kho phân tích (OLAP)** | **Amazon Redshift** | *data warehouse*, *complex queries over petabytes*, *BI* |

Hai cặp hay lẫn:

- **ElastiCache ⇄ MemoryDB.** Cache (dữ liệu có thể mất, nguồn thật nằm chỗ khác) ⇄
  **database trong bộ nhớ có độ bền** (dùng làm nguồn chính). Câu hỏi nói *durable
  in-memory* thì là MemoryDB.
- **RDS ⇄ Redshift.** OLTP (nhiều giao dịch nhỏ) ⇄ OLAP (ít truy vấn, quét rất nhiều).
  Redshift thuộc nhóm [analytics](ai-ml-and-analytics.md) trong exam guide, không thuộc
  nhóm Database — nhưng đề vẫn đặt chúng cạnh nhau để thử.

### Managed ⇄ tự dựng trên EC2

| | RDS (managed) | Database trên EC2 |
|---|---|---|
| Vá OS và engine | **AWS** | Bạn |
| Backup, snapshot, point-in-time restore | Có sẵn | Tự dựng |
| Multi-AZ failover | Một tuỳ chọn, bật là có | Tự dựng |
| Quyền ở tầng OS, engine lạ, cấu hình sâu | **Không có** | Có |

Chọn EC2 khi: cần engine RDS không hỗ trợ, cần quyền `root` ở tầng OS, hoặc licence buộc
như vậy. Mọi trường hợp khác, cụm **"reduce operational overhead"** trong đề đẩy đáp án về
**RDS**.

### Multi-AZ ⇄ read replica: hai thứ khác nhau hoàn toàn

| | RDS Multi-AZ | Read replica |
|---|---|---|
| Để làm gì | **High availability** — chuyển sang standby khi primary lỗi | **Scale đọc** — phân tải truy vấn đọc |
| Nhân bản | **Đồng bộ** | **Không đồng bộ** (có độ trễ) |
| Có nhận traffic thường không | **Không** — standby chỉ chờ | **Có** — đọc được |
| Khác Region được không | Trong Region (Multi-AZ) | **Được** — cross-Region replica |

Đây là một trong những cặp bị trộn nhiều nhất. *"Giảm tải cho database khi báo cáo chạy
nặng"* → read replica. *"Database còn chạy khi một AZ sập"* → Multi-AZ.

### Migration

| Service | Việc |
|---|---|
| **AWS DMS** | Chuyển dữ liệu, **nguồn vẫn đang chạy**; cùng engine hoặc khác engine |
| **AWS SCT** | Đổi **schema và code** sang engine khác (Oracle → PostgreSQL) |

Nguyên tắc nhớ: **khác engine ⇒ SCT trước, DMS sau.** Cùng engine ⇒ chỉ DMS.

### Service liên quan nên nhận ra tên

| Service | Một dòng |
|---|---|
| **Amazon Aurora Serverless** | Aurora tự scale dung lượng theo tải, kể cả về 0 |
| **Amazon DynamoDB Accelerator (DAX)** | Cache trước DynamoDB, đưa đọc về mức micro giây |
| **Amazon RDS Proxy** | Gom connection pool trước RDS — hợp với Lambda |

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn **Multi-AZ** để giảm tải đọc | Standby không phục vụ traffic ⇒ dùng **read replica** |
| Chọn **read replica** để đạt HA | Nhân bản **không đồng bộ**, có thể mất dữ liệu ⇒ dùng Multi-AZ |
| Chọn **RDS** cho "khoá–giá trị, hàng triệu request/giây" | Đó là **DynamoDB** |
| Chọn **DynamoDB** cho "join nhiều bảng, báo cáo SQL phức tạp" | Đó là quan hệ hoặc Redshift |
| Chọn **ElastiCache** làm nguồn dữ liệu chính cần bền | Đó là **MemoryDB** |
| Chọn **Redshift** cho ứng dụng web ghi liên tục | Redshift là OLAP, không phải OLTP |
| Dùng **DMS** một mình cho Oracle → PostgreSQL | Thiếu **SCT** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| RDS thay EC2 tự dựng | Hết vá, hết dựng backup, Multi-AZ một nút bấm | Không có quyền OS; engine và phiên bản bị giới hạn |
| Aurora thay RDS MySQL | Thông lượng cao hơn, storage tự lớn, failover nhanh | Đắt hơn ở tải nhỏ; chỉ tương thích MySQL/PostgreSQL |
| DynamoDB thay quan hệ | Scale gần như vô hạn, độ trễ ổn định | Phải thiết kế theo access pattern **trước**; join và truy vấn linh hoạt thì khó |
| Thêm cache (ElastiCache/DAX) | Giảm độ trễ và tải cho DB | Thêm vấn đề **dữ liệu cũ** và invalidation |
| Multi-AZ | Chịu lỗi AZ | Gần như nhân đôi chi phí database |

## Related Topics

- [Compute](compute.md) — nơi ứng dụng gọi vào database này chạy
- [Storage](storage.md) — RDS nằm trên EBS; snapshot đi vào S3
- [AI/ML và analytics](ai-ml-and-analytics.md) — Redshift, Athena, Glue nằm ở đó
- [Migration và AWS CAF](migration-and-caf.md) — DMS và SCT trong mạch migration
- [Global infrastructure](global-infrastructure.md) — Multi-AZ, cross-Region replica
- [AWS · Foundations](../index.md)
