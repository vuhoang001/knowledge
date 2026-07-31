---
title: Glossary
description: Thuật ngữ dùng xuyên suốt kho — định nghĩa một câu, kèm link tới tài liệu đầy đủ.
tags: [glossary]
category: reference
updated: 2026-07-31
---

# Glossary

Định nghĩa **một câu**. Cần hiểu sâu thì theo link. Giữ nguyên thuật ngữ tiếng Anh —
sáu tháng sau bạn sẽ gõ `grain`, `incremental`, `rebalance`, không gõ "hạt mịn".

## Data Modeling

| Thuật ngữ | Một câu | Chi tiết |
|---|---|---|
| **Grain** | Một dòng của bảng đại diện cho cái gì | [→](../data-modeling/grain.md) |
| **Fact** | Bảng chứa số đo được, dài và hẹp, mọc thêm mỗi ngày | [→](../data-modeling/fact-and-dimension.md) |
| **Dimension** | Bảng mô tả thực thể, ngắn và rộng, đổi chậm | [→](../data-modeling/fact-and-dimension.md) |
| **SCD** | Cách xử lý lịch sử khi thuộc tính dimension thay đổi | [→](../data-modeling/scd.md) |
| **as-was / as-is** | Báo cáo dùng giá trị *lúc đó* / giá trị *bây giờ* | [→](../data-modeling/scd.md) |
| **Natural key** | Mã do hệ nguồn sinh ra (`KH001`) | [→](../data-modeling/surrogate-key.md) |
| **Surrogate key** | Mã do warehouse sinh ra, không mang nghĩa nghiệp vụ | [→](../data-modeling/surrogate-key.md) |
| **Conformed dimension** | Dimension dùng chung cho nhiều quy trình nghiệp vụ | [→](../data-modeling/design-process.md) |
| **Bus matrix** | Ma trận quy trình × dimension, để thấy cái gì dùng chung | [→](../data-modeling/design-process.md) |
| **Star schema** | Fact ở giữa, dimension dẹt bao quanh | [→](../data-modeling/star-snowflake-obt.md) |
| **OBT** | One Big Table — nhúng hết thuộc tính vào fact, không join | [→](../data-modeling/star-snowflake-obt.md) |
| **Additive** | Số đo cộng được theo mọi chiều | [→](../data-modeling/fact-and-dimension.md) |
| **Semi-additive** | Số đo không cộng được theo thời gian (số dư cuối ngày) | [→](../data-modeling/fact-and-dimension.md) |
| **Late-arriving dimension** | Fact tới trước dimension → chưa tra được surrogate key | [→](../data-modeling/scd.md) |

## Data Quality

| Thuật ngữ | Một câu | Chi tiết |
|---|---|---|
| **Accuracy** | Số có khớp sự thật không — chiều duy nhất không có test dựng sẵn | [→](../data-quality/six-dimensions.md) |
| **Timeliness** | Dữ liệu có cũ quá không — nguồn chết mà test vẫn xanh | [→](../data-quality/six-dimensions.md) |
| **Contract** | Khai kiểu cột để warehouse **từ chối build** khi model sai schema | [→](../data-quality/index.md) |
| **Singular test** | File `.sql` trả về **các dòng sai**; trả 0 dòng = pass | [→](../etl/dbt/testing.md) |

## dbt

| Thuật ngữ | Một câu | Chi tiết |
|---|---|---|
| **model** | Một file `.sql` = một `SELECT` → thành view/table | [→](../etl/dbt/models-and-ref.md) |
| **`ref()`** | Cách duy nhất khai báo phụ thuộc — thứ dựng nên DAG | [→](../etl/dbt/models-and-ref.md) |
| **`source()`** | Trỏ tới bảng dbt **không** tạo ra | [→](../etl/dbt/sources-seeds-snapshots.md) |
| **materialization** | dbt bọc gì quanh câu `SELECT` của bạn | [→](../etl/dbt/materializations.md) |
| **incremental** | Chỉ xử lý dòng mới thay vì build lại cả bảng | [→](../etl/dbt/materializations.md) |
| **snapshot** | Công cụ dbt hiện thực SCD Type 2 — **không build lại được** | [→](../etl/dbt/sources-seeds-snapshots.md) |
| **`target/compiled/`** | SQL sau khi render Jinja — thứ warehouse thật sự nhận | [→](../etl/dbt/what-is-dbt.md) |

## Lakehouse

| Thuật ngữ | Một câu | Chi tiết |
|---|---|---|
| **Table format** | Lớp metadata cho biết file nào thuộc bảng ở thời điểm nào | [→](../storage/iceberg/index.md) |
| **Time travel** | Đọc bảng ở trạng thái của một thời điểm quá khứ | [→](../storage/iceberg/index.md) |
| **Catalog** | Nơi giữ con trỏ tới metadata hiện tại của bảng | [→](../storage/iceberg/index.md) |
| **Consumer group** | Nhóm consumer Kafka chia nhau partition, giữ offset riêng | [→](../etl/kafka/index.md) |
| **Watermark** | Mốc Flink coi là "đã đủ dữ liệu tới thời điểm này" | [→](../etl/flink/index.md) |
| **`logical_date`** | Kỳ dữ liệu Airflow đang xử lý — **không phải** lúc chạy | [→](../orchestration/airflow/index.md) |

---

**Quy tắc thêm mục:** một thuật ngữ vào glossary khi nó xuất hiện ở **≥2 tài liệu**.
Chỉ dùng một chỗ thì định nghĩa tại chỗ, đừng làm glossary phình.
