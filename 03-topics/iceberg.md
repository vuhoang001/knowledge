---
type: topic
level: L0
started:
next-review:
tags: [iceberg, lakehouse, data-engineering, hdos]
updated: 2026-07-30
---

# Apache Iceberg

## Mục tiêu

Làm chủ table format **đang chạy thật** dưới toàn bộ HDOS: `hdos_bronze` →
`hdos_silver` → `hdos_gold` đều là bảng Iceberg trên MinIO, Trino và Spark cùng đọc.
Hiện tại mình dùng nó mà chưa hiểu nó — mọi thứ chạy được là nhờ cấu hình có sẵn.

Đạt **L4** cho cái này, khác các chủ đề còn lại: đây là nền của cả kho dữ liệu, và
quyết định sai về partition sẽ trả giá nhiều tháng sau.

## Nó giải quyết vấn đề gì

Trước Iceberg, "bảng" trên object store chỉ là một thư mục Parquet, và mọi thứ khác
là quy ước ngầm: partition nằm trong tên thư mục, ghi đồng thời thì đọc được nửa
vời, đổi schema là viết lại tất cả, và không ai biết trạng thái bảng lúc 3 giờ trước.

Iceberg thêm một lớp **metadata** lên chính đống Parquet đó: danh sách file nào
thuộc bảng ở thời điểm nào. Từ đó có ACID, time travel, đổi schema không viết lại
dữ liệu.

## Mô hình tư duy cốt lõi

**Iceberg là ĐỊNH DẠNG BẢNG, không phải nơi lưu và cũng không phải engine.**

Nó không lưu dữ liệu (MinIO lưu), không chạy query (Trino/Spark chạy). Nó chỉ là
tập metadata trả lời một câu: *"tại snapshot này, bảng gồm đúng những file nào."*

Từ đó suy ra mọi thứ khác:
- Ghi mới **không sửa file cũ** — tạo file mới + snapshot mới trỏ tới tập file mới.
- Đọc luôn khoá vào **một snapshot**, nên không bao giờ thấy trạng thái nửa vời.
- Time travel không phải tính năng thêm vào — nó là hệ quả tự nhiên của việc snapshot cũ vẫn còn.

Hệ quả thực tế đau nhất: **snapshot cũ không tự biến mất.** Không `expire_snapshots`
định kỳ thì bảng phình mãi, dù số dòng không tăng. Đây là chi phí ẩn của lakehouse.

## Bản đồ khái niệm

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| catalog | Nơi biết bảng nào ở đâu (Nessie/Hive/REST) | Điểm vào; đổi catalog là đổi cả cách truy cập |
| **snapshot** | Trạng thái bảng tại một thời điểm | Nền của ACID và time travel |
| manifest | Danh sách file dữ liệu + thống kê | Cho phép **bỏ qua file** khi query |
| manifest list | Danh sách manifest của một snapshot | Một tầng nữa để cắt bớt |
| **hidden partitioning** | Iceberg tự suy partition từ cột | Không phải viết `WHERE thang='2026-07'` như Hive |
| partition spec | Quy tắc chia partition | **Đổi được** mà không viết lại dữ liệu cũ |
| schema evolution | Thêm/xoá/đổi tên cột | An toàn vì cột định danh bằng **ID**, không bằng tên |
| copy-on-write | Sửa → viết lại cả file | Đọc nhanh, ghi chậm |
| merge-on-read | Sửa → ghi file delta | Ghi nhanh, đọc chậm hơn |
| `expire_snapshots` | Xoá snapshot cũ | **Bắt buộc chạy định kỳ** |
| `rewrite_data_files` | Gộp file nhỏ | Chống "small files problem" |

**Vấn đề file nhỏ là kẻ giết hiệu năng số một** ở lakehouse. Flink ghi liên tục sinh
ra hàng nghìn file bé, mỗi query phải mở từng cái. Không compaction định kỳ thì Trino
chậm dần đều mà nhìn query chẳng thấy gì sai.

## Lộ trình

- [ ] **L1 Hiểu** — nói được Iceberg khác "thư mục Parquet" ở chỗ nào, snapshot là gì
- [ ] **L2 Chạy được** — tạo bảng, ghi, time travel về snapshot cũ trên Trino `.60`
- [ ] **L3 Sửa được** — gỡ được file nhỏ, bảng phình, đổi schema (≥3 lỗi thật)
- [ ] **L4 Thiết kế được** — chọn partition spec + chiến lược compaction cho `hdos_silver`/`hdos_gold` và bảo vệ được

## Bài tập

### Bài 1 — Nhìn vào ruột một bảng đang chạy (L1→L2)

**Làm gì:** trên Trino `.60`, chọn một bảng `hdos_gold`, chạy
`SELECT * FROM "<bảng>$snapshots"` và `"<bảng>$files"`.

**Xong khi:** đối chiếu được số snapshot với số lần job ghi, và thấy tận mắt danh
sách file dữ liệu.

> Bài này làm trước tiên. Nó biến Iceberg từ khái niệm thành thứ nhìn được.

**Kết quả:**

### Bài 2 — Time travel (L2)

**Làm gì:** ghi thêm dữ liệu, rồi `SELECT ... FOR VERSION AS OF <snapshot_id>`.

**Xong khi:** đọc được trạng thái bảng **trước** lần ghi đó.

**Kết quả:**

### Bài 3 — Đổi schema không viết lại (L2→L3)

**Làm gì:** thêm cột, đổi tên một cột, rồi đọc lại dữ liệu cũ.

**Xong khi:** dữ liệu cũ vẫn đọc được bình thường, và giải thích được vì sao — cột
định danh bằng ID chứ không bằng tên.

**Kết quả:**

### Bài 4 — Tạo ra rồi dọn vấn đề file nhỏ (L3)

**Làm gì:** ghi 200 lần, mỗi lần vài dòng. Đếm file. Đo thời gian query. Chạy
`rewrite_data_files`. Đo lại.

**Xong khi:** có hai con số trước/sau và giải thích được chênh lệch.

**Kết quả:**

### Bài 5 — Dọn snapshot (L3)

**Làm gì:** xem dung lượng bảng trên MinIO, chạy `expire_snapshots`, xem lại.

**Xong khi:** nói được mình vừa **đánh mất** khả năng gì khi làm vậy.

**Kết quả:**

### Bài 6 — Chọn partition cho một mart HDOS (L4)

**Làm gì:** chọn một bảng `hdos_gold`, đề xuất partition spec. Thử 2 phương án, đo query thật.

**Xong khi:** bảo vệ được lựa chọn bằng số, không bằng cảm giác.

**Kết quả:**

## Tự kiểm

<details><summary>1. Iceberg lưu dữ liệu ở đâu?</summary>

Không lưu. MinIO/S3 lưu file Parquet; Iceberg chỉ giữ metadata nói file nào thuộc
bảng ở snapshot nào.
</details>

<details><summary>2. Vì sao đọc Iceberg không bao giờ thấy dữ liệu nửa vời?</summary>

Mỗi lần đọc khoá vào một snapshot cố định. Ghi mới tạo snapshot khác, không đụng vào
file mà snapshot đang đọc trỏ tới.
</details>

<details><summary>3. Hidden partitioning khác Hive ở điểm nào?</summary>

Hive: phải tự viết `WHERE thang='2026-07'`, quên là quét toàn bảng. Iceberg: tự suy
partition từ `WHERE ngay = ...`, và **đổi partition spec được** mà không viết lại dữ liệu cũ.
</details>

<details><summary>4. Bảng không tăng dòng mà dung lượng cứ phình — vì sao?</summary>

Snapshot cũ vẫn giữ file cũ. Phải `expire_snapshots` định kỳ. Cái giá là mất time
travel về trước mốc đó.
</details>

<details><summary>5. Copy-on-write vs merge-on-read chọn thế nào?</summary>

CoW: ghi chậm, đọc nhanh — hợp bảng ít sửa, đọc nhiều (mart gold).
MoR: ghi nhanh, đọc chậm hơn — hợp bảng CDC upsert liên tục (bronze).
</details>

<details><summary>6. Vì sao file nhỏ giết hiệu năng?</summary>

Mỗi file là một lần mở + đọc metadata. Nghìn file bé thì chi phí cố định vượt xa chi
phí đọc dữ liệu thật. Chữa bằng `rewrite_data_files`.
</details>

## Sai lầm đã mắc

<!-- ≥3 mục thật thì nâng L3. -->

## Nguồn

- [ ] Iceberg docs — *Table Spec* (phần snapshot/manifest, đọc kỹ)
- [ ] Iceberg docs — *Maintenance*: `expire_snapshots`, `rewrite_data_files`
- [ ] Trino docs — Iceberg connector, phần bảng metadata `$snapshots` / `$files`

## Ghi chú thuộc chủ đề này

## Liên kết

- [Trino](trino.md) — engine đọc Iceberg ở `.60:8080`
- [Flink](flink.md) — ghi CDC vào `hdos_bronze`
- [dbt](dbt.md) — test chạy trên chính các bảng này
