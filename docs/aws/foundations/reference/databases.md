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
updated: 2026-10-13
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

## Giải thích cặn kẽ

### OLTP ⇄ OLAP: hai thế giới truy vấn khác nhau

Đây là ranh giới gốc quyết định "nên dùng database nào". Đừng học thuộc tên service
trước — hiểu hai kiểu tải này rồi tên service tự rơi vào chỗ.

**OLTP — Online Transaction Processing.** Rất nhiều giao dịch **nhỏ, nhanh, ghi/đọc
realtime**. Mỗi giao dịch chạm vài dòng. Ví dụ: một web bán hàng ghi đơn hàng mới,
trừ tồn kho, cập nhật giỏ hàng — mỗi lần khách bấm "Đặt hàng" là một transaction phải
xong trong vài chục mili giây. Hàng nghìn khách làm việc đó cùng lúc.

→ OLTP đi về **RDS / Aurora** (quan hệ, cần join và transaction ACID) hoặc **DynamoDB**
(khi truy cập theo khoá, cần độ trễ ổn định ở quy mô cực lớn).

**OLAP — Online Analytical Processing.** Ít truy vấn hơn nhiều, nhưng mỗi truy vấn
**quét hàng triệu tới hàng tỉ dòng** để tổng hợp. Ví dụ: "doanh thu theo từng tỉnh,
từng tháng, trong 3 năm qua, cho 400 triệu đơn hàng" — một câu query chạy vài giây tới
vài phút, và chỉ chạy khi có người mở báo cáo BI.

→ OLAP đi về **Redshift** (data warehouse, lưu theo cột để quét nhanh trên khối lượng
lớn).

Hình ảnh dễ nhớ: OLTP là **quầy thu ngân** — nhiều khách, mỗi người mua ít, phải nhanh.
OLAP là **kế toán cuối tháng** — một người, ngồi cộng toàn bộ sổ của cả quý. Bắt quầy
thu ngân đi cộng sổ cả quý (dùng RDS làm analytics) thì nghẽn; bắt kế toán đứng quầy
bán lẻ từng món (dùng Redshift ghi đơn realtime) thì sai công cụ.

### Multi-AZ ⇄ read replica — mổ xẻ vì hay ra đề

Cả hai đều là "bản sao của database", nên đề cố tình để cạnh nhau. Nhưng **mục đích
ngược nhau** và không thay thế được cho nhau.

**RDS Multi-AZ = để FAILOVER tự động (high availability).**

- AWS dựng một bản **standby** ở một Availability Zone **khác**.
- Nhân bản **đồng bộ**: mọi ghi vào primary được ghi sang standby trước khi xác nhận ⇒
  standby không bao giờ tụt dữ liệu.
- Standby **không phục vụ đọc**, không phục vụ ghi — nó chỉ nằm chờ. Bạn vẫn chỉ nói
  chuyện với một endpoint.
- Khi primary chết (lỗi phần cứng, lỗi AZ, bảo trì), AWS **tự** trỏ endpoint sang
  standby trong vài chục giây tới ~1–2 phút. Ứng dụng không phải đổi connection string.
- Analogy: tài xế dự bị ngồi ghế sau, không lái, chỉ chực nhảy lên thay khi tài xế
  chính ngất. Có hai người nhưng xe vẫn chỉ chạy bằng một người.

**Read Replica = để SCALE ĐỌC.**

- Bản sao **đọc được**, ứng dụng trỏ các truy vấn đọc (báo cáo, dashboard) vào đó để
  gánh bớt cho primary.
- Nhân bản **không đồng bộ** ⇒ replica có thể **trễ** một chút so với primary (đọc ra
  dữ liệu cũ vài giây là bình thường).
- Có thể dựng **nhiều** replica, và đặt **khác Region** (cross-Region) — hữu ích cho
  người dùng ở châu lục khác đọc gần hơn.
- Không tự failover: read replica không phải cơ chế HA. (Có thể *promote* thủ công một
  replica thành database độc lập, nhưng đó là thao tác riêng, không tự động.)
- Analogy: photocopy một tập tài liệu để nhiều phòng ban cùng đọc. Bản gốc vẫn là nơi
  duy nhất được sửa; các bản copy chỉ để đọc và có thể lệch bản gốc chút ít.

**Chốt phân biệt:** câu hỏi nhắc tới *availability / failover / chịu lỗi AZ* → Multi-AZ.
Câu hỏi nhắc tới *performance đọc / báo cáo nặng làm chậm app / phân tải read* → read
replica. Nếu đề muốn **cả hai** (vừa HA vừa scale đọc) thì dùng **đồng thời** — Multi-AZ
cho standby, cộng thêm vài read replica.

### DynamoDB — NoSQL serverless key-value, chọn khi nào

DynamoDB là database **NoSQL, dạng khoá–giá trị / document, serverless** (không có
server để bạn chọn kích thước hay vá — AWS lo hết). Đọc/ghi theo khoá cho độ trễ **một
chữ số mili giây**, ổn định kể cả khi lưu lượng tăng đột biến.

**Chọn DynamoDB khi:**

- **Scale cực lớn, cực đột biến** — ví dụ game, IoT, giỏ hàng ngày sale lớn, nơi lượng
  request nhảy từ nghìn lên hàng triệu/giây. DynamoDB giãn theo mà không phải tự dựng
  shard.
- **Schema linh hoạt** — mỗi item có thể mang các thuộc tính khác nhau; không phải định
  nghĩa cột cứng như bảng quan hệ.
- **Truy cập theo khoá là chính** — lấy theo `user_id`, `order_id`. Bạn biết trước
  **access pattern** và thiết kế quanh nó.

**Không chọn DynamoDB khi:** cần join nhiều bảng, cần truy vấn ad-hoc linh hoạt, cần
transaction phức tạp trên nhiều thực thể — đó là địa hạt của quan hệ (RDS/Aurora) hoặc
analytics (Redshift).

**DAX (DynamoDB Accelerator)** là **cache nằm trước DynamoDB**. Khi cùng một item bị
đọc đi đọc lại rất nhiều, DAX trả lời từ bộ nhớ, đưa độ trễ đọc từ mili giây xuống
**micro giây** và giảm chi phí đọc trên DynamoDB. Điểm cần nhớ cho đề: cache của
DynamoDB có tên riêng là **DAX**, không phải ElastiCache.

### ElastiCache — giảm tải đọc cho database

**ElastiCache** (Redis hoặc Memcached) là một lớp **cache trong bộ nhớ** đặt **trước**
database. Ý tưởng: phần lớn truy vấn đọc là **lặp lại** (cùng trang sản phẩm, cùng
profile, cùng kết quả). Thay vì mỗi lần đều đánh vào RDS, ứng dụng hỏi cache trước:

- **Cache hit** — có trong ElastiCache → trả về ngay từ RAM, không chạm DB.
- **Cache miss** — không có → đọc từ RDS, rồi **lưu lại vào cache** cho lần sau.

Ví dụ: trang chi tiết sản phẩm được 100.000 người xem mỗi phút nhưng nội dung gần như
không đổi. Cache nó trong ElastiCache ⇒ RDS chỉ bị hỏi một lần mỗi vài phút thay vì
100.000 lần/phút. DB nhẹ tải, trang tải nhanh hơn. Dùng điển hình khác: **session
store** cho web, **leaderboard** game.

Đánh đổi là **dữ liệu cũ** (stale): cache có thể giữ bản cũ sau khi DB đã đổi, nên phải
có chiến lược hết hạn (TTL) hoặc invalidation.

Phân biệt nhanh cho đề: **ElastiCache = cache trước RDS/bất kỳ DB nào** · **DAX = cache
riêng cho DynamoDB** · **MemoryDB = in-memory nhưng là nguồn dữ liệu bền, không phải
cache**.

### Các database chuyên dụng — "dùng khi"

| Service | Dùng khi |
|---|---|
| **Amazon Aurora** | Cần quan hệ MySQL/PostgreSQL nhưng muốn thông lượng cao hơn, storage tự lớn, failover nhanh hơn RDS thường |
| **Amazon DocumentDB** | Cần database **document** tương thích MongoDB (lưu JSON linh hoạt) |
| **Amazon Neptune** | Dữ liệu là **đồ thị quan hệ** — mạng xã hội, phát hiện vòng gian lận, knowledge graph |
| **Amazon Timestream** | Dữ liệu **chuỗi thời gian** — đo lường IoT, metric theo timestamp |
| **Amazon QLDB** | Cần **sổ cái bất biến**, có lịch sử đổi dữ liệu kiểm chứng được bằng mật mã (ledger) |
| **Amazon MemoryDB for Redis** | Cần tốc độ **in-memory** nhưng dùng làm **nguồn dữ liệu chính bền**, không chỉ là cache |

### DMS — di chuyển dữ liệu khi đang chạy

**AWS Database Migration Service (DMS)** chuyển dữ liệu từ database nguồn sang đích **mà
nguồn vẫn đang phục vụ** (downtime tối thiểu). Dùng để đưa database on-premises lên AWS,
hoặc đổi từ engine này sang engine khác.

- **Cùng engine** (MySQL → MySQL, Oracle → Oracle): chỉ cần **DMS**.
- **Khác engine** (Oracle → PostgreSQL): dùng **SCT** đổi schema và code lưu trữ trước,
  rồi **DMS** chép dữ liệu. Nhớ: *khác engine ⇒ SCT trước, DMS sau.*

## Ví dụ cụ thể — tình huống đề thi mẫu

Bốn tình huống này chính là bốn kiểu câu hỏi hay gặp. Đọc đề, nhặt từ khoá, ánh xạ sang
service.

**1. "Ứng dụng phải còn chạy khi một Availability Zone bị sập, failover tự động, không
cần can thiệp thủ công."**
→ **RDS Multi-AZ.** Từ khoá là *availability / failover / AZ sập*. Standby ở AZ khác,
AWS tự chuyển endpoint. Không phải read replica (replica không tự failover và nhân bản
không đồng bộ).

**2. "Báo cáo chạy vào giờ cao điểm làm database chính chậm hẳn, cần giảm tải đọc mà
không ảnh hưởng ghi."**
→ **RDS Read Replica.** Từ khoá là *giảm tải đọc / báo cáo làm chậm app*. Trỏ các truy
vấn đọc nặng vào replica, primary lo phần ghi. Không phải Multi-AZ vì standby không
phục vụ đọc.

**3. "Cùng một dữ liệu bị đọc đi đọc lại rất nhiều lần, cần hạ độ trễ và giảm số lần
đánh vào database."**
→ **ElastiCache** (nếu DB phía sau là RDS/bất kỳ) hoặc **DAX** (nếu phía sau là
DynamoDB). Từ khoá là *đọc lặp lại / cache / microsecond*. Nếu đề nói rõ "DynamoDB",
đáp án là **DAX**.

**4. "Cần phân tích hàng tỉ dòng lịch sử giao dịch để làm báo cáo BI, truy vấn phức tạp
quét toàn bộ dữ liệu."**
→ **Amazon Redshift.** Từ khoá là *data warehouse / analytics / petabytes / complex
queries / BI*. Đây là OLAP, không phải OLTP — đừng chọn RDS.

**Bonus — migration:** "Chuyển database Oracle on-premises sang Amazon Aurora PostgreSQL
với downtime tối thiểu." → **SCT** (đổi schema Oracle → PostgreSQL) **+ DMS** (chép dữ
liệu khi nguồn vẫn chạy). Khác engine nên cần cả hai.

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
| Chọn **ElastiCache** làm cache cho DynamoDB | Cache riêng của DynamoDB là **DAX** |

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
