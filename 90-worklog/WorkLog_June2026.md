# BẢNG KÊ CÔNG VIỆC THÁNG 6/2026
**Nhân viên:** Vũ Hoàng  
**Phòng ban:** R&D / Backend  
**Dự án chính:** Hệ thống HDOS (Healthcare Data Operation System)  
**Tổng ngày làm:** 22 ngày | **Tổng giờ:** 176 giờ

---

## TUẦN 1 — 01/06 đến 05/06/2026

---

### Thứ Hai, 01/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Họp sprint planning tuần đầu tháng: review backlog, phân công task DynamicFormService | 1.5h |
| 2 | Khởi tạo `DynamicFormService` — thiết kế kiến trúc Backend-Driven UI, setup project .NET, cấu hình DbContext | 2h |
| 3 | Implement `FormPage` với layout multi-row/span, thêm EF Core initial migration | 2h |
| 4 | Wire `DynamicFormService` vào CI/CD pipeline (GitHub Actions), cấu hình `docker-compose.server.yml` | 1.5h |
| 5 | Viết tài liệu API reference cho DynamicFormService (doc 30) | 1h |

**Tổng:** 8h  
**Output:** DynamicFormService khởi tạo thành công, chạy được trên môi trường dev, CI/CD build pass.

---

### Thứ Ba, 02/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + sync với team về tiến độ auth module | 0.5h |
| 2 | Implement license management cho `AuthService` — thêm JWT claims, phân quyền theo license | 2.5h |
| 3 | Tích hợp OCR service vào nginx: thêm routing, fix upstream hostname, rewrite Swagger spec URL | 2h |
| 4 | Restore GitHub Actions làm CI/CD chính (rollback từ self-hosted runner), fix Prometheus port conflict 9090→9091 | 1.5h |
| 5 | Gộp và chuẩn hóa 7 file docs thành 6, thêm AI spec format guide cho DynamicFormService | 1.5h |

**Tổng:** 8h  
**Output:** Auth license hoàn thiện, OCR routing hoạt động qua nginx, CI/CD ổn định.

---

### Thứ Tư, 03/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + review PR từ teammate | 0.5h |
| 2 | Thiết kế và implement `WidgetCatalog` — seed 31 dashboard widgets vào DB, tạo entity + migration | 2h |
| 3 | Thêm `AdminPagesController` — CRUD pages qua `/forms/admin/{moduleCode}/pages`, thêm `pageStatus` filter | 2h |
| 4 | Implement SDUI Screen Designer (thay thế FormPage cũ) — drag-and-drop widget layout | 2h |
| 5 | Fix nginx OCR: split location swagger vs API, remove trailing slash proxy_pass, inject servers field vào OpenAPI spec | 1.5h |

**Tổng:** 8h  
**Output:** WidgetCatalog live với 31 widgets, Screen Designer có thể thêm/xóa widget qua API.

---

### Thứ Năm, 04/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + sync với FE team về contract SDUI | 1h |
| 2 | Implement full flow `DataMatching → auto-generate DynamicForm` (Expression Data Binding Approach 2) | 2.5h |
| 3 | Tạo `demo-fresher-flow.sh` — end-to-end demo DataMatching → DynamicForm có thể chạy được | 1h |
| 4 | Tạo unified Swagger Hub tại `/swagger` với dropdown chọn 7 services, viết FE guide (doc 38) | 1.5h |
| 5 | Khởi tạo `LakehouseService` — nhận data từ Lakehouse qua RabbitMQ, lưu snapshot JSONB, expose REST API cho DynamicFormService; thêm vào CI/CD và `docker-compose.server.yml` | 2h |

**Tổng:** 8h  
**Output:** Demo flow DataMatching → DynamicForm hoạt động end-to-end, LakehouseService deploy lên server thành công.

---

### Thứ Sáu, 05/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + demo cuối tuần cho tech lead: show unified Swagger Hub + demo flow | 1h |
| 2 | Thiết kế và implement kiến trúc `Provider Catalog` — tách bạch 3 tầng Producer/Catalog/Consumer cho DataSource (loose coupling), viết doc 41 | 2h |
| 3 | Thêm `Schema Discovery` endpoint cho DataMatching/Lakehouse, thêm `SchemaPath` cho DataSource; refactor `AdminControllers` tách thành 5 controllers theo SRP | 2h |
| 4 | Implement `Lakehouse Phase 2` — full 6 view + RabbitMQ trigger qua `WarehouseRefreshed` event; demo `WarehouseViewSyncer` pull view `encounter_activity_daily` | 2h |
| 5 | Update nginx swagger-hub theo cấu hình services mới, viết doc 43 (Warehouse Sync → Lakehouse pattern) | 1h |

**Tổng:** 8h  
**Output:** Provider Catalog architecture hoàn thiện, Lakehouse Phase 2 live với 6 views, WarehouseViewSyncer hoạt động.

---

## TUẦN 2 — 08/06 đến 12/06/2026

---

### Thứ Hai, 08/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Sprint planning tuần 2: review kết quả tuần 1, lên kế hoạch Charts system + DataContracts | 1h |
| 2 | Implement `SduiEngine` + `DashboardEngine` — fix race condition DbContext (chuyển sang sequential fetch), thêm `BedOccupancySduiConfig` | 2h |
| 3 | Xây dựng Lakehouse direct-query charts — `finance-daily` Path A (từ raw tables) + Path B (từ Lakehouse view), SDUI page | 2h |
| 4 | Refactor `FinanceDailyLakehouseChart` sang raw tables + demo mode; viết doc 48-52 (FE guide, system overview charts) | 1.5h |
| 5 | Tối ưu `MatchingWorker` — tăng batch size 50 → 1000, configurable qua appsettings | 0.5h |
| 6 | Code review + merge PR của teammate, cập nhật test | 1h |

**Tổng:** 8h  
**Output:** Charts system hoạt động với 2 path (raw + Lakehouse), MatchingWorker throughput tăng ~20x.

---

### Thứ Ba, 09/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + trao đổi với team về thiết kế Data Contract Engine | 1h |
| 2 | Nghiên cứu và thiết kế kiến trúc `Data Contract Engine` (2h research + whiteboard) | 2h |
| 3 | Implement `Data Contract Engine` — 2 pilot contracts, bỏ feature flag `DataContracts.EnableNewEndpoint` | 2.5h |
| 4 | Viết `SDUI vs DynamicForm` contract handbook (doc 57) cho FE — phân biệt rõ 2 luồng, thêm §0 | 1.5h |
| 5 | Tạo PR, review + merge, cập nhật CHANGELOG | 1h |

**Tổng:** 8h  
**Output:** Data Contract Engine hoàn thiện với 2 pilot contracts, FE handbook sẵn sàng để FE team triển khai.

---

### Thứ Tư, 10/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + sync FE team về tiến độ Data Contracts | 0.5h |
| 2 | Implement Data Contracts Phase 4: `auto-sync Provider catalog Lakehouse → DynamicForm` qua gRPC | 2h |
| 3 | Implement bridge `Lakehouse contract ↔ DynamicForm catalog`, demo `finance.monthly.row` + FE integration guide (doc 60) | 2h |
| 4 | Thêm `Lakehouse Phase 2 schema endpoint` + `PatientDaily form-prefill` + script demo | 2h |
| 5 | Implement `DataSource defaultParams` cho `{param}` placeholder trong DynamicForm (doc 61) | 1h |
| 6 | Update tài liệu, chạy regression test toàn bộ endpoints | 0.5h |

**Tổng:** 8h  
**Output:** Auto-sync hoạt động end-to-end, FE có thể bind dữ liệu từ Lakehouse vào DynamicForm qua param placeholder.

---

### Thứ Năm, 11/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + họp kỹ thuật với Data team về demo use case Lakehouse | 1.5h |
| 2 | Implement demo `pharmacy.dispense.daily.row` — Data Contract cho dược, 5-chart consumer | 2.5h |
| 3 | Viết FE guide hoàn chỉnh cho 4 API Data Contracts (doc 63) — bao gồm call sequence, payload mẫu, error handling | 2h |
| 4 | Họp review tiến độ tháng với team lead, chuẩn bị slide demo | 1.5h |
| 5 | Fix minor bugs từ feedback FE team, update Postman collection | 0.5h |

**Tổng:** 8h  
**Output:** Pilot Data Contract cho dược phẩm hoàn thiện, FE guide đủ để FE team tự triển khai.

---

### Thứ Sáu, 12/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Demo cuối sprint cho stakeholder: Charts, Data Contracts, Lakehouse Phase 2 | 1.5h |
| 2 | Viết sprint retrospective, cập nhật task board | 1h |
| 3 | Tắt scope validation `Lakehouse/DataMatching` ở local-dev để FE dễ test, comment upstream OCR không dùng | 0.5h |
| 4 | Code review toàn bộ PR của tuần, để lại comment, approve 3 PRs | 2h |
| 5 | Nghiên cứu Apache Superset — đánh giá khả năng tích hợp vào hệ thống làm BI layer | 2h |
| 6 | Cập nhật tài liệu kỹ thuật, sync với DevOps về server capacity | 1h |

**Tổng:** 8h  
**Output:** Sprint review thành công, backlog tuần sau đã được chuẩn bị, đánh giá Superset feasibility xong.

---

## TUẦN 3 — 15/06 đến 19/06/2026

---

### Thứ Hai, 15/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Sprint planning tuần 3: lên kế hoạch tích hợp Superset + chuẩn bị hạ tầng | 1.5h |
| 2 | Nghiên cứu Apache Superset architecture — đọc docs, thử nghiệm cấu hình SSO OIDC/OAuth2 | 3h |
| 3 | Thiết kế kiến trúc Superset integration với hệ thống HDOS: luồng SSO qua AuthService, embedded guest token | 2h |
| 4 | Setup môi trường Superset dev trên local: cấu hình Docker, kết nối thử với PostgreSQL | 1.5h |

**Tổng:** 8h  
**Output:** Thiết kế kiến trúc Superset integration hoàn chỉnh, môi trường dev ready.

---

### Thứ Ba, 16/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + review design Superset với tech lead | 1h |
| 2 | Viết Dockerfile cho Superset custom image — cài thêm dependencies, cấu hình `HdosSecurityManager` | 2.5h |
| 3 | Cấu hình nginx reverse proxy cho Superset, xác định port strategy (dedicated 8444) | 1.5h |
| 4 | Viết GitHub Actions pipeline để build + push Superset image lên GHCR | 2h |
| 5 | Test thử CI pipeline trên branch dev, debug build errors | 1h |

**Tổng:** 8h  
**Output:** Dockerfile và CI pipeline cho Superset hoàn chỉnh, image build thành công trên CI.

---

### Thứ Tư, 17/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + báo cáo tiến độ Superset cho team | 0.5h |
| 2 | Deploy Superset Phase 1 — standalone behind nginx, viết doc 64; fix nginx config (KHÔNG strip prefix, STATIC_ASSETS_PREFIX) | 2h |
| 3 | Implement `HdosSecurityManager` Phase 2 — SSO qua AuthService: chỉ intercept GET, skip `/login/`, try-except defensive; viết doc 65 | 2h |
| 4 | Implement Phase 4 embedded guest token cho iframe embed vào HDOS frontend, viết doc 66 | 1.5h |
| 5 | Fix CD pipeline: untrack broken gitlink, tăng timeout pull GHCR 15→30→240 phút (mạng VN chậm), fix dockerfile path | 2h |

**Tổng:** 8h  
**Output:** Superset Phase 1+2+4 live trên server, SSO hoạt động, FE có thể embed dashboard qua guest token.

---

### Thứ Năm, 18/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + họp với Data team về nhu cầu Data Warehouse nội bộ | 1h |
| 2 | Khởi tạo project `sql-data-warehouse-project` — thiết kế schema, tạo `init_table.sql` cho DW | 2h |
| 3 | Cấu hình `docker-compose.yml` cho môi trường DW dev (PostgreSQL + pgAdmin) | 1.5h |
| 4 | Thiết kế và import dữ liệu nguồn: `source_crm` + `source_erp` — mapping fields, tạo staging tables | 2.5h |
| 5 | Viết README, chuẩn bị tài liệu hướng dẫn setup cho team | 1h |

**Tổng:** 8h  
**Output:** DW project skeleton hoàn chỉnh với 2 nguồn dữ liệu CRM/ERP, môi trường dev có thể chạy ngay.

---

### Thứ Sáu, 19/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + demo nhanh DW project cho tech lead | 1h |
| 2 | Khởi tạo `hdos-data` — pilot dataset cho hệ thống HDOS, cấu hình CI tắt cho môi trường dev | 2h |
| 3 | Thêm use cases demo và tài liệu mô tả cấu trúc dữ liệu pilot | 2h |
| 4 | Viết sprint review, chuẩn bị demo tuần sau | 1h |
| 5 | Code review + merge 2 PRs từ teammate (module auth, module notification) | 2h |

**Tổng:** 8h  
**Output:** Pilot dataset sẵn sàng để team dùng test, 2 PRs được review và merge.

---

## TUẦN 4 — 22/06 đến 26/06/2026

---

### Thứ Hai, 22/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Sprint planning tuần 4: lên kế hoạch Real-time Data Pipeline (Kafka + Flink) cho internal R&D | 1.5h |
| 2 | Nghiên cứu kiến trúc Medallion (Bronze/Silver/Gold) — đánh giá Iceberg vs Delta Lake vs Hudi cho use case HDOS | 3h |
| 3 | Nghiên cứu Debezium CDC connector — cách capture changes từ PostgreSQL sang Kafka | 2h |
| 4 | Vẽ architecture diagram cho real-time streaming pipeline, review với tech lead | 1.5h |

**Tổng:** 8h  
**Output:** Architecture design cho data streaming pipeline được approve, chọn stack Kafka + Flink + Iceberg + Trino.

---

### Thứ Ba, 23/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + họp kỹ thuật về Debezium configuration với DBA | 1h |
| 2 | Thiết kế Kafka topic strategy, partition scheme cho các service của HDOS | 2h |
| 3 | Nghiên cứu Apache Flink — Job topology, Checkpoint mechanism, State backend | 2.5h |
| 4 | Nghiên cứu Apache Iceberg + Nessie catalog — table format, snapshot isolation | 2.5h |

**Tổng:** 8h  
**Output:** Tài liệu thiết kế chi tiết cho toàn bộ pipeline, POC plan được phê duyệt.

---

### Thứ Tư, 24/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + review tài liệu thiết kế với team | 1h |
| 2 | Setup môi trường local cho Kafka + Zookeeper + Kafka UI qua Docker Compose | 2h |
| 3 | Cấu hình Debezium connector cho PostgreSQL, test CDC capture | 2.5h |
| 4 | Setup MinIO làm object storage cho Iceberg, cấu hình bucket và policies | 1.5h |
| 5 | Debug kết nối Debezium → Kafka, fix advertised listener hostname | 1h |

**Tổng:** 8h  
**Output:** Debezium CDC từ PostgreSQL → Kafka hoạt động cơ bản, MinIO ready.

---

### Thứ Năm, 25/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + sync với Data Engineering team về tiến độ | 0.5h |
| 2 | Viết Flink job đầu tiên — đọc từ Kafka topic, xử lý raw Debezium JSON (filesystem append-only sink) | 3h |
| 3 | Cấu hình Iceberg catalog với Nessie, setup Spark để viết Bronze layer | 2.5h |
| 4 | Test và debug pipeline Kafka → Flink → MinIO (Iceberg format) | 1.5h |
| 5 | Chuẩn bị demo plan cho ngày mai | 0.5h |

**Tổng:** 8h  
**Output:** Luồng Kafka → Flink → MinIO/Iceberg hoạt động cơ bản ở Bronze layer.

---

### Thứ Sáu, 26/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Demo POC pipeline cho tech lead + management | 1.5h |
| 2 | Refactor toàn bộ docker-compose cho streaming platform — tổng hợp tất cả services vào một file quản lý được | 2h |
| 3 | Push code lên repo `kafka-flink`, setup README và hướng dẫn run | 1.5h |
| 4 | Sprint review + retrospective tuần 4 | 1h |
| 5 | Code review PRs cuối tuần, cập nhật task board, chuẩn bị backlog tuần 5 | 2h |

**Tổng:** 8h  
**Output:** POC được approve để tiếp tục phát triển, docker-compose platform hoàn chỉnh, repo có tài liệu.

---

## TUẦN 5 — 29/06 đến 30/06/2026

---

### Thứ Hai, 29/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Sprint planning tuần 5: hoàn thiện streaming pipeline — Medallion architecture + Trino query layer | 1h |
| 2 | Implement Medallion architecture đầy đủ — Bronze/Silver/Gold layers với PySpark (thay dbt cho đơn giản hơn), cấu hình Iceberg table format | 2h |
| 3 | Fix nhiều issues hạ tầng: Postgres port conflict (5432→5433→5555), auth method md5 cho Debezium, bundle Kafka connector JAR vào image thay vì download runtime | 2h |
| 4 | Fix Flink + Iceberg: enable checkpointing để flush files lên MinIO, fix Hadoop shaded JAR (replace `flink-shaded-hadoop` với `hadoop-common`), add `hadoop-hdfs-client` cho `HdfsConfiguration` | 2h |
| 5 | Fix Spark: dùng `apache/spark:3.5.1` official image, fix `spark-class` commands; disable Nessie OIDC fix unhealthy container; thêm topic `users_created` qua connector-init | 1h |

**Tổng:** 8h  
**Output:** Full pipeline Postgres → Debezium → Kafka → Flink → MinIO (Iceberg) → Trino hoạt động ổn định, Medallion 3 lớp hoàn chỉnh.

---

### Thứ Ba, 30/06/2026

| # | Nội dung công việc | Giờ |
|---|---|---|
| 1 | Daily standup + báo cáo tiến độ streaming pipeline cho team | 0.5h |
| 2 | Refactor Kafka consumer — cải thiện error handling, retry logic, cấu hình consumer group | 2.5h |
| 3 | Refactor Flink job — tách thành các operator độc lập, cải thiện parallelism config, thêm metrics | 2.5h |
| 4 | Viết tài liệu component-level cho Ingestion pipeline + Trino query layer | 1.5h |
| 5 | Tổng hợp báo cáo công việc tháng 6, chuẩn bị cho sprint review cuối tháng | 1h |

**Tổng:** 8h *(đang tiếp tục)*  
**Output:** Pipeline được refactor sạch hơn, tài liệu component hoàn chỉnh.

---

## TỔNG KẾT THÁNG 6/2026

| Module / Hạng mục | Tuần | Kết quả |
|---|---|---|
| DynamicFormService (SDUI, WidgetCatalog, Screen Designer) | T1 | Hoàn thành |
| AuthService — License Management | T1 | Hoàn thành |
| LakehouseService + Provider Catalog Architecture | T1 | Hoàn thành |
| Charts System (Lakehouse direct-query, finance-daily) | T2 | Hoàn thành |
| Data Contract Engine (2 pilot contracts + docs) | T2 | Hoàn thành |
| Apache Superset Integration (SSO + Guest Token) | T3 | Hoàn thành |
| SQL Data Warehouse Project (CRM/ERP sources) | T3 | Hoàn thành |
| Real-time Streaming Pipeline (Kafka + Flink + Iceberg) | T4–T5 | ~90% |

**Tổng số docs/tài liệu kỹ thuật:** ~30 tài liệu (doc 30 → doc 66)  
**Tổng số PRs:** ~12 PRs (tạo + review)  
**Stack chính:** .NET 8, C#, Docker, GitHub Actions, RabbitMQ, PostgreSQL, Apache Kafka, Apache Flink, Apache Iceberg, Trino, MinIO, Apache Superset, Nessie Catalog
