---
id: flink
type: module
status: seed
difficulty: 3
prereqs: [kafka]
tags: [flink, streaming, data-engineering, hdos]
updated: 2026-07-30
verified_at:
---

# Flink

## Mục tiêu

Dựng lại job CDC của HDOS: đọc topic Debezium từ Kafka, upsert theo khoá chính vào
`hdos_bronze.patient_cdc` (Iceberg). Đoạn này đã bị gỡ khỏi `kafka-flink` khi thu
gọn repo (27/07/2026).

Đạt **L3** là đủ: job chết, checkpoint fail, dữ liệu trễ thì tự đọc ra nguyên nhân.

## Nó giải quyết vấn đề gì

Đọc Kafka rồi ghi ra đâu đó thì viết tay được — cho tới khi cần: xử lý đúng một lần
dù job chết giữa chừng, gộp theo cửa sổ thời gian, nhớ trạng thái giữa các bản ghi,
và xử lý bản ghi **đến muộn**. Tự làm mấy thứ đó là viết lại Flink, tệ hơn.

Đổi lại: thêm một cụm phải nuôi, và một mô hình tư duy không dễ.

## Mô hình tư duy cốt lõi

**Flink không bán "nhanh", nó bán TRẠNG THÁI CÓ ĐẢM BẢO.**

Điểm cốt lõi là **state + checkpoint**: Flink giữ trạng thái của phép tính (đếm tới
đâu, cửa sổ nào đang mở, khoá nào đã thấy) và định kỳ chụp lại toàn bộ. Job chết →
khôi phục từ checkpoint gần nhất → tiếp tục **như chưa từng chết**.

Hiểu sai chỗ này là đi tìm sai chỗ: coi Flink như "consumer Kafka chạy nhanh" thì
sẽ không hiểu vì sao nó cần state backend, vì sao checkpoint fail là nghiêm trọng,
và vì sao exactly-once lại làm được.

Khác Spark Streaming: Flink là streaming thật (từng bản ghi), Spark là micro-batch
(gom từng lô nhỏ). Vì vậy độ trễ Flink thấp hơn và mô hình thời gian của nó chặt hơn.

## Bản đồ khái niệm

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| job / task / slot | Đơn vị chạy, chia trên TaskManager | Song song bị chặn bởi số slot |
| **state** | Dữ liệu job nhớ giữa các bản ghi | Lý do Flink tồn tại |
| state backend | Nơi giữ state (heap / RocksDB) | State lớn hơn RAM → RocksDB |
| **checkpoint** | Ảnh chụp định kỳ, tự động | Khôi phục sau sự cố |
| savepoint | Ảnh chụp thủ công, có chủ đích | Nâng cấp job, đổi song song |
| **event time** | Thời điểm việc **thật sự xảy ra** | Con số đúng phải dựa vào cái này |
| processing time | Thời điểm Flink **nhận được** | Dễ nhưng sai khi có trễ |
| **watermark** | "Không còn bản ghi nào cũ hơn mốc này" | Cách Flink biết khi nào đóng cửa sổ |
| window | Gom theo khoảng thời gian | tumbling / sliding / session |
| allowed lateness | Chờ thêm bao lâu cho bản ghi muộn | Đánh đổi độ trễ ↔ độ đúng |
| exactly-once | Mỗi bản ghi tính đúng một lần | Cần sink hỗ trợ 2PC |
| backpressure | Hạ nguồn chậm, ngược dòng lên | Dấu hiệu đầu tiên khi job ốm |

**Event time vs processing time là khái niệm khó nhất và là nguồn gốc của hầu hết
lỗi.** Bệnh nhân nhập viện 23:58 nhưng bản ghi CDC tới Flink lúc 00:03 — tính theo
processing time thì ca đó rơi sang ngày hôm sau, và báo cáo ngày sai mà không ai
biết. Watermark tồn tại để giải quyết đúng chuyện này.

## Lộ trình

- [ ] **L1 Hiểu** — nói được state/checkpoint để làm gì, và event time khác processing time ra sao
- [ ] **L2 Chạy được** — job đọc Kafka ghi ra Iceberg, checkpoint bật, thấy trong Flink UI
- [ ] **L3 Sửa được** — gỡ được checkpoint fail, backpressure, dữ liệu trễ bị bỏ (≥3 lỗi)
- [ ] **L4 Thiết kế được** — chọn watermark, allowed lateness, chu kỳ checkpoint cho luồng CDC HDOS và bảo vệ được

## Bài tập

### Bài 1 — Job tối thiểu đọc Kafka (L2)

**Làm gì:** Flink SQL đọc topic Kafka, in ra console.

**Xong khi:** thấy bản ghi chảy qua Flink UI, đọc được sơ đồ job.

**Kết quả:**

### Bài 2 — Giết job giữa chừng (L2→L3)

**Làm gì:** bật checkpoint 10s. Job đang đếm thì `docker kill` TaskManager. Cho sống lại.

**Xong khi:** bộ đếm **tiếp tục từ chỗ cũ**, không về 0 và không đếm trùng. Đây là
lúc hiểu checkpoint để làm gì.

**Kết quả:**

### Bài 3 — Event time và bản ghi đến muộn (L3)

**Làm gì:** cửa sổ 1 phút theo event time. Gửi một bản ghi có timestamp **cũ 5 phút**
sau khi cửa sổ đã đóng.

**Xong khi:** thấy nó bị bỏ, rồi chỉnh `allowed lateness` cho nó được tính, và nói
được cái giá phải trả.

> Bài quan trọng nhất. Đây đúng là ca nhập viện lúc 23:58.

**Kết quả:**

### Bài 4 — Upsert vào Iceberg theo khoá (L3)

**Làm gì:** đọc topic Debezium, ghi upsert theo PK vào bảng Iceberg.

**Xong khi:** `UPDATE` cùng một dòng ở Postgres 3 lần → bảng Iceberg có **một** dòng
với giá trị mới nhất, không phải ba dòng.

**Kết quả:**

### Bài 5 — Savepoint để nâng cấp job (L3→L4)

**Làm gì:** dừng job có savepoint, sửa code, khởi động lại từ savepoint đó.

**Xong khi:** nói được vì sao đổi cấu trúc state có thể làm khôi phục thất bại.

**Kết quả:**

## Tự kiểm

<details><summary>1. Checkpoint và savepoint khác nhau ở đâu?</summary>

Checkpoint: tự động, định kỳ, để khôi phục sau sự cố, Flink tự dọn.
Savepoint: thủ công, có chủ đích, để nâng cấp/đổi song song, mình tự giữ.
</details>

<details><summary>2. Event time vs processing time — vì sao chọn sai là hỏng?</summary>

Processing time là lúc Flink *nhận*, phụ thuộc độ trễ mạng và tình trạng cụm. Ca lúc
23:58 tới muộn 5 phút sẽ bị tính sang ngày hôm sau. Con số nghiệp vụ phải theo event time.
</details>

<details><summary>3. Watermark để làm gì?</summary>

Nói với Flink "không còn bản ghi nào cũ hơn mốc này nữa" → đủ cơ sở đóng cửa sổ và
phát kết quả. Không có watermark thì cửa sổ event time không bao giờ biết khi nào xong.
</details>

<details><summary>4. Backpressure nghĩa là gì, nghi gì trước?</summary>

Hạ nguồn xử lý chậm hơn thượng nguồn, áp lực dội ngược. Nghi: sink chậm (ghi Iceberg
quá nhiều file nhỏ) → phép tính nặng → song song quá thấp.
</details>

<details><summary>5. Khi nào phải đổi state backend sang RocksDB?</summary>

Khi state lớn hơn bộ nhớ heap. RocksDB tràn ra đĩa được, đổi lại chậm hơn.
</details>

<details><summary>6. Exactly-once cần điều kiện gì ở sink?</summary>

Sink phải hỗ trợ giao dịch hai pha (2PC) hoặc ghi idempotent. Flink một mình không
đủ — chỉ đảm bảo được tới ranh giới của sink.
</details>

## Sai lầm đã mắc

<!-- ≥3 mục thật thì nâng L3. -->

## Nguồn

- [ ] Flink docs — *Concepts → Stateful Stream Processing* và *Timely Stream Processing*
- [ ] Flink SQL — phần Kafka connector và Iceberg connector

## Ghi chú thuộc chủ đề này

## Liên kết

- [Kafka](kafka.md) — nguồn của job
- [Iceberg](iceberg.md) — đích của job
- Repo `kafka-flink` — job CDC bị gỡ 27/07/2026, lịch sử git còn giữ
