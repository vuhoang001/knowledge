---
type: topic
level: L0
started:
next-review:
tags: [airflow, orchestration, data-engineering, hdos]
updated: 2026-07-30
---

# Apache Airflow

## Mục tiêu

Điều phối luồng batch HDOS: Spark đọc HIS Postgres qua JDBC → `hdos_bronze` →
`hdos_silver` → `hdos_gold`, rồi chạy test dbt. Airflow đã bị gỡ khỏi `kafka-flink`
khi thu gọn repo (27/07/2026); hiện các bước chạy tay qua `make`.

Đạt **L3** là đủ: DAG không chạy, task treo, backfill sai thì tự đọc ra nguyên nhân.

## Nó giải quyết vấn đề gì

Chuỗi bước phụ thuộc nhau chạy hằng ngày, trong đó bước 3 chỉ được chạy khi bước 2
xong. Làm bằng cron thì: không biết bước trước xong chưa, một bước hỏng là các bước
sau vẫn chạy trên dữ liệu thiếu, chạy lại một ngày cũ phải sửa tay, và không có chỗ
nào nhìn thấy toàn cảnh.

Airflow cho khai báo phụ thuộc, tự thử lại, chạy bù ngày cũ, và một giao diện thấy
được cái gì đang hỏng. Đổi lại: thêm một hệ thống có database riêng phải nuôi.

## Mô hình tư duy cốt lõi

**Airflow là NHẠC TRƯỞNG, không phải nhạc công. Nó không xử lý dữ liệu.**

Airflow chỉ nói "chạy cái này, xong rồi chạy cái kia". Việc nặng do Spark/Trino/dbt
làm. Kéo xử lý dữ liệu vào trong task Airflow là sai kiến trúc — worker Airflow không
sinh ra để làm việc đó, và nó sẽ chết vì hết bộ nhớ.

Và điều hay hiểu sai nhất, gần như ai cũng vấp một lần:

**DAG chạy cho khoảng thời gian ĐÃ QUA.** Một DAG `@daily` với logical date
`2026-07-30` **không chạy trong ngày 30** — nó chạy vào đầu ngày **31**, khi ngày 30
đã trọn vẹn. Hợp lý khi nghĩ kỹ (muốn tổng kết một ngày thì phải đợi ngày đó xong),
nhưng trái trực giác, và là nguồn của mọi lỗi "sao số liệu lệch một ngày".

Hệ quả thứ hai: **task phải idempotent** — chạy lại phải ra cùng kết quả. Airflow sẽ
thử lại và sẽ backfill; task nào cộng dồn kiểu `INSERT` không kiểm tra thì chạy lại
là nhân đôi dữ liệu.

## Bản đồ khái niệm

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| DAG | Đồ thị các bước, không có vòng lặp | Đơn vị điều phối |
| task / operator | Một bước / khuôn để tạo bước | `BashOperator`, `PythonOperator`… |
| sensor | Task ngồi chờ một điều kiện | Chờ file, chờ DAG khác — dễ chiếm slot |
| **logical date** | Khoảng thời gian DAG đang xử lý | **Không phải lúc nó chạy** |
| schedule / catchup | Nhịp chạy / có chạy bù quá khứ không | `catchup=True` bật lên là chạy hàng trăm lần |
| backfill | Chạy lại một dải ngày quá khứ | Chỉ đúng nếu task idempotent |
| **idempotency** | Chạy lại ra cùng kết quả | Điều kiện sống còn |
| XCom | Truyền giá trị nhỏ giữa task | **Nhỏ thôi** — không phải để chuyền dữ liệu |
| scheduler / executor | Quyết định chạy gì / chạy ở đâu | Local, Celery, Kubernetes |
| pool / concurrency | Giới hạn số task chạy song song | Chống giết database nguồn |

**Đừng để logic nặng ở top-level file DAG.** Scheduler đọc lại file DAG liên tục
(mặc định vài chục giây một lần); đặt một truy vấn database ở cấp module là bắn query
đó mãi mãi. Mọi thứ nặng phải nằm **trong** hàm của task.

## Lộ trình

- [ ] **L1 Hiểu** — nói được logical date khác thời điểm chạy ra sao, vì sao cần idempotency
- [ ] **L2 Chạy được** — Airflow bằng Docker, một DAG 3 task có phụ thuộc chạy xanh
- [ ] **L3 Sửa được** — gỡ được DAG không chạy, task treo, backfill nhân đôi dữ liệu (≥3 lỗi)
- [ ] **L4 Thiết kế được** — dựng DAG cho luồng batch HDOS, chọn nhịp/pool/retry và bảo vệ được

## Bài tập

### Bài 1 — DAG ba bước phụ thuộc (L2)

**Làm gì:** `a >> b >> c`, mỗi task chỉ `echo`. Cho `b` fail.

**Xong khi:** thấy `c` **không chạy**, và `b` tự thử lại đúng số lần đã cấu hình.

**Kết quả:**

### Bài 2 — Logical date (L1→L2)

**Làm gì:** DAG `@daily` in ra logical date và thời điểm thực tế đang chạy.

**Xong khi:** thấy tận mắt hai giá trị **lệch nhau một ngày** và giải thích được vì sao.

> Bài quan trọng nhất. Không qua bài này thì sớm muộn sẽ có báo cáo lệch một ngày.

**Kết quả:**

### Bài 3 — Backfill nhân đôi dữ liệu (L3)

**Làm gì:** task `INSERT` vào một bảng. Backfill 3 ngày. Backfill **lại** 3 ngày đó.

**Xong khi:** thấy dữ liệu nhân đôi, rồi sửa cho idempotent (xoá-rồi-ghi theo
partition ngày) và backfill lại vẫn đúng.

**Kết quả:**

### Bài 4 — `catchup` (L2→L3)

**Làm gì:** DAG có `start_date` cách đây 30 ngày, `catchup=True`. Bật lên.

**Xong khi:** hiểu vì sao vừa bật đã có 30 lần chạy xếp hàng, và khi nào thì mình
thật sự muốn điều đó.

**Kết quả:**

### Bài 5 — Điều phối luồng HDOS thật (L3→L4)

**Làm gì:** DAG: Spark ingest → build silver → build gold → `dbt test`. Dùng pool để
không bắn quá nhiều kết nối vào HIS Postgres.

**Xong khi:** một bước hỏng thì bước sau không chạy, và chạy lại một ngày cũ ra đúng
kết quả cũ.

**Kết quả:**

## Tự kiểm

<details><summary>1. DAG <code>@daily</code> logical date 30/07 chạy lúc nào?</summary>

Đầu ngày **31/07**, sau khi ngày 30 đã trọn vẹn. DAG xử lý khoảng thời gian đã qua.
</details>

<details><summary>2. Vì sao task phải idempotent?</summary>

Airflow sẽ tự thử lại và sẽ backfill. Task không idempotent thì mỗi lần chạy lại là
một lần nhân dữ liệu.
</details>

<details><summary>3. XCom dùng để làm gì, và không dùng để làm gì?</summary>

Truyền **giá trị nhỏ** giữa task (đường dẫn file, số dòng). Không phải để chuyền dữ
liệu — nó nằm trong metadata database của Airflow.
</details>

<details><summary>4. Vì sao không đặt truy vấn database ở top-level file DAG?</summary>

Scheduler đọc lại file DAG liên tục, nên truy vấn đó bị bắn mãi mãi. Mọi thứ nặng
phải nằm trong hàm của task.
</details>

<details><summary>5. Bật <code>catchup=True</code> với start_date cách đây 1 năm — chuyện gì xảy ra?</summary>

Airflow xếp hàng chạy bù toàn bộ số lần đã lỡ. Có thể là hàng trăm lần, đủ để giết
nguồn dữ liệu.
</details>

<details><summary>6. Airflow có nên tự xử lý dữ liệu không?</summary>

Không. Nó điều phối; việc nặng để Spark/Trino/dbt làm. Worker Airflow không sinh ra
cho việc đó.
</details>

## Sai lầm đã mắc

<!-- ≥3 mục thật thì nâng L3. -->

## Nguồn

- [ ] Airflow docs — *Core Concepts*, đặc biệt phần *DAG Runs* và logical date
- [ ] Airflow docs — *Best Practices* (phần top-level code)

## Ghi chú thuộc chủ đề này

## Liên kết

- [dbt](dbt.md) — bước test cuối trong DAG
- [Iceberg](iceberg.md) — đích ghi của các bước batch
- Repo `kafka-flink` — Airflow bị gỡ 27/07/2026, lịch sử git còn giữ
