# KÊ KHAI CÔNG VIỆC THÁNG 6/2026
**Nhân viên:** Vũ Hoàng | **Dự án:** HDOS / Internal R&D

---

| Ngày | Thứ | Nội dung công việc | Số giờ |
|------|-----|-------------------|--------|
| 01/06 | Hai | Họp sprint planning đầu tháng. Khởi tạo `DynamicFormService` — thiết kế kiến trúc Backend-Driven UI, setup project .NET, implement `FormPage` layout, EF Core migration, wire vào CI/CD pipeline. Viết API reference doc. | 8h |
| 02/06 | Ba | Implement license management cho `AuthService` (JWT claims, phân quyền theo license). Tích hợp OCR service vào nginx (routing, fix upstream hostname, rewrite Swagger spec). Restore GitHub Actions CI/CD. Chuẩn hoá tài liệu kỹ thuật. | 8h |
| 03/06 | Tư | Thiết kế và implement `WidgetCatalog` — seed 31 dashboard widgets vào DB. Thêm `AdminPagesController` CRUD pages. Implement SDUI Screen Designer thay thế FormPage cũ. Fix nginx OCR (split location swagger vs API). | 8h |
| 04/06 | Năm | Họp sync với FE team về SDUI contract. Implement full flow `DataMatching → auto-generate DynamicForm` (Expression Data Binding). Tạo script demo end-to-end. Xây dựng unified Swagger Hub 7 services. Khởi tạo `LakehouseService`, wire vào CI/CD và server compose. | 8h |
| 05/06 | Sáu | Demo cuối tuần cho tech lead. Thiết kế kiến trúc `Provider Catalog` (3 tầng Producer/Catalog/Consumer). Thêm Schema Discovery endpoint. Refactor AdminControllers → 5 controllers theo SRP. Implement Lakehouse Phase 2 (6 views + RabbitMQ trigger). Viết doc 41–43. | 8h |
| 06/06 | Bảy | *Nghỉ* | — |
| 07/06 | CN | *Nghỉ* | — |
| 08/06 | Hai | Sprint planning tuần 2. Implement `SduiEngine` + `DashboardEngine` (fix race condition DbContext). Xây dựng Lakehouse direct-query charts — finance-daily Path A + B, SDUI page. Viết doc 48–52. Tối ưu `MatchingWorker` batch size 50→1000. Code review PR teammate. | 8h |
| 09/06 | Ba | Họp thiết kế Data Contract Engine với team. Research kiến trúc. Implement `Data Contract Engine` core + 2 pilot contracts. Viết SDUI vs DynamicForm handbook (doc 57) cho FE team. Tạo + merge PR. | 8h |
| 10/06 | Tư | Implement Data Contracts Phase 4 — auto-sync Provider catalog Lakehouse → DynamicForm qua gRPC. Bridge Lakehouse contract ↔ DynamicForm catalog. Demo `finance.monthly.row`. Thêm Lakehouse schema endpoint + PatientDaily form-prefill. Implement `DataSource defaultParams` cho `{param}` placeholder. | 8h |
| 11/06 | Năm | Họp với Data team về use case Lakehouse. Implement demo `pharmacy.dispense.daily.row` — Data Contract cho dược, 5-chart consumer. Viết FE guide đầy đủ cho 4 API Data Contracts (doc 63). Họp review tiến độ tháng với team lead. | 8h |
| 12/06 | Sáu | Demo sprint cho stakeholder: Charts, Data Contracts, Lakehouse Phase 2. Sprint retrospective. Tắt scope validation local-dev cho FE test dễ hơn. Code review + approve 3 PRs. Research Apache Superset — đánh giá feasibility tích hợp vào HDOS. | 8h |
| 13/06 | Bảy | *Nghỉ* | — |
| 14/06 | CN | *Nghỉ* | — |
| 15/06 | Hai | Sprint planning tuần 3, lên kế hoạch tích hợp Superset. Nghiên cứu Superset architecture, SSO OIDC/OAuth2. Thiết kế kiến trúc integration: luồng SSO qua AuthService, embedded guest token. Setup môi trường Superset dev local. | 8h |
| 16/06 | Ba | Viết Dockerfile Superset custom image, cấu hình `HdosSecurityManager`. Cấu hình nginx reverse proxy, xác định port strategy (port 8444 dedicated). Viết GitHub Actions pipeline build + push image lên GHCR. Test + debug CI pipeline trên branch dev. | 8h |
| 17/06 | Tư | Deploy Superset Phase 1 standalone behind nginx (doc 64). Fix nginx config (không strip prefix, STATIC_ASSETS_PREFIX đúng). Implement SSO Phase 2 qua AuthService + `HdosSecurityManager` defensive (doc 65). Implement Phase 4 embedded guest token cho iframe embed (doc 66). Fix CD pipeline: timeout GHCR 15→240 phút, fix dockerfile path. | 8h |
| 18/06 | Năm | Họp với Data team về nhu cầu Data Warehouse nội bộ. Khởi tạo `sql-data-warehouse-project` — thiết kế schema, viết `init_table.sql`. Cấu hình docker-compose DW (PostgreSQL + pgAdmin). Thiết kế và import `source_crm` + `source_erp`, tạo staging tables. Viết README. | 8h |
| 19/06 | Sáu | Demo DW project cho tech lead. Khởi tạo `hdos-data` — pilot dataset cho HDOS, thêm use cases demo, viết docs. Sprint review. Code review + merge 2 PRs của teammate. | 8h |
| 20/06 | Bảy | *Nghỉ* | — |
| 21/06 | CN | *Nghỉ* | — |
| 22/06 | Hai | Sprint planning tuần 4: lên kế hoạch Real-time Data Pipeline (Kafka + Flink) R&D. Research kiến trúc Medallion (Bronze/Silver/Gold). Đánh giá Iceberg vs Delta Lake. Vẽ architecture diagram, review + approve với tech lead. | 8h |
| 23/06 | Ba | Họp kỹ thuật về Debezium CDC với DBA. Thiết kế Kafka topic strategy, partition scheme cho HDOS services. Research Apache Flink — Job topology, Checkpoint, State backend. Research Iceberg + Nessie catalog — table format, snapshot isolation. | 8h |
| 24/06 | Tư | Setup môi trường local Kafka + Zookeeper + Kafka UI qua Docker Compose. Cấu hình Debezium connector cho PostgreSQL, test CDC capture. Setup MinIO làm object storage cho Iceberg. Debug kết nối Debezium → Kafka, fix advertised listener hostname. | 8h |
| 25/06 | Năm | Viết Flink job đầu tiên — đọc Kafka topic, xử lý raw Debezium JSON (filesystem append-only sink). Cấu hình Iceberg catalog với Nessie, setup Spark cho Bronze layer. Test và debug pipeline Kafka → Flink → MinIO. Chuẩn bị demo cho ngày hôm sau. | 8h |
| 26/06 | Sáu | Demo POC pipeline cho tech lead + management, được approve tiếp tục. Refactor docker-compose streaming platform thành file thống nhất. Push lên repo `kafka-flink`. Sprint review + retrospective tuần 4. Code review PRs, cập nhật task board, chuẩn bị backlog tuần 5. | 8h |
| 27/06 | Bảy | *Nghỉ* | — |
| 28/06 | CN | *Nghỉ* | — |
| 29/06 | Hai | Sprint planning tuần 5. Implement Medallion architecture đầy đủ với PySpark (Bronze/Silver/Gold + Iceberg). Fix hạ tầng: Postgres port conflict, Debezium md5 auth, bundle Kafka connector JAR vào image. Fix Flink + Iceberg: enable checkpointing MinIO, fix Hadoop shaded JAR, add `hadoop-hdfs-client`. Fix Spark: dùng `apache/spark:3.5.1`, fix `spark-class` commands, disable Nessie OIDC. Thêm topic `users_created`. | 8h |
| 30/06 | Ba | Refactor Kafka consumer — error handling, retry logic, consumer group config. Refactor Flink job — tách operators độc lập, cải thiện parallelism, thêm metrics. Viết tài liệu Ingestion pipeline + Trino component. Tổng hợp báo cáo công việc tháng 6. | 8h |

---

## TỔNG CỘNG
- **Ngày làm việc:** 22 ngày
- **Tổng giờ:** 176 giờ
- **Ngày nghỉ:** 8 ngày (thứ Bảy + Chủ Nhật)

## TỔNG KẾT CÔNG VIỆC

| Hạng mục | Kết quả |
|----------|---------|
| DynamicFormService — SDUI, WidgetCatalog (31 widgets), Screen Designer | Hoàn thành |
| AuthService — License Management với JWT | Hoàn thành |
| LakehouseService + Provider Catalog Architecture (3 tầng) | Hoàn thành |
| Schema Discovery endpoint | Hoàn thành |
| Charts System — Lakehouse direct-query, finance-daily Path A/B | Hoàn thành |
| Data Contract Engine + 2 pilot contracts (finance, pharmacy) | Hoàn thành |
| Apache Superset Integration — SSO + Embedded Guest Token + CI/CD | Hoàn thành |
| SQL Data Warehouse (CRM + ERP sources, staging) | Hoàn thành |
| Real-time Streaming Pipeline — Kafka + Flink + Iceberg + Trino | 90% |
| Tài liệu kỹ thuật (doc 30 → doc 66, ~37 tài liệu) | Hoàn thành |
