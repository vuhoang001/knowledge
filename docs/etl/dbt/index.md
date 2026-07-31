---
title: dbt (data build tool)
description: Transform SQL có DAG và test — chữ T trong ELT. dbt sinh SQL, warehouse chạy SQL.
tags: [dbt, elt, transformation, data-engineering]
domain: data-engineering
category: technology
status: review
difficulty: intermediate
verified_at: 2026-07-30
lab: ~/Documents/learn-lab/dbt
updated: 2026-07-31
---
# dbt (data build tool)

**dbt không có engine và không chuyển dữ liệu.** Nó biên dịch SQL + Jinja thành SQL
thuần rồi gửi cho warehouse chạy. Là chữ **T** trong ELT — không phải E, không phải L.

Hiểu sai chỗ này là mọi thứ sai theo: sẽ đi tìm "dbt chạy chậm" trong khi phải tìm
ở warehouse, và sẽ tưởng dbt thay được Spark/Flink.

**Lab:** `~/Documents/learn-lab/dbt` — venv riêng, `dbt-duckdb`, seed sẵn.
Chạy: `.venv/bin/dbt <lệnh> --profiles-dir .`

## Mục lục — các component của dbt

| # | Component | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | [dbt là gì](what-is-dbt.md) | Nó thật sự làm gì, `ref()` và test là gì | ✅ đã chạy |
| 02 | [Cấu trúc project](project-structure.md) | `dbt_project.yml`, `profiles.yml`, `target/` | ⬜ chưa viết |
| 03 | [Model và `ref()`](models-and-ref.md) | Đơn vị cơ bản, DAG mọc ra từ đâu | ⬜ chưa viết |
| 04 | [Source, seed, snapshot](sources-seeds-snapshots.md) | Dữ liệu vào từ đâu khi không phải model | ⬜ chưa viết |
| 05 | [Materialization](materializations.md) | `view` / `table` / `incremental` / `ephemeral` | ⬜ chưa viết |
| 06 | [Test và data quality](testing.md) | 3 tầng: test · contract · unit test | 📝 lý thuyết, chưa chạy |
| 07 | [Macro, Jinja, package](macros-jinja-packages.md) | Khi SQL bắt đầu bị copy-paste | ⬜ chưa viết |
| 08 | [Docs và lineage](docs-and-lineage.md) | `dbt docs`, rà tác động khi sửa cột | ⬜ chưa viết |
| 09 | [Bài tập](../../tutorials/dbt-lab-duckdb.md) | Chạy thật, có output dán lại | 🔄 đang làm |

Ký hiệu: ✅ đã chạy tay · 📝 lý thuyết chưa kiểm chứng · 🔄 đang làm · ⬜ chưa viết

## Bản đồ khái niệm

| Khái niệm | Là gì | Khi nào dùng |
|---|---|---|
| `model` | Một file `.sql` = một `SELECT` → thành view/table | Đơn vị cơ bản, mọi thứ xoay quanh nó |
| `ref()` | Trỏ tới model khác | **Luôn luôn** thay vì viết tên bảng — thứ dựng nên DAG |
| `source()` | Trỏ tới bảng có sẵn dbt không tạo ra | Bảng do Spark/Flink/ingest ghi vào |
| materialization | `view` / `table` / `incremental` / `ephemeral` | Quyết định dbt tạo ra cái gì |
| `incremental` | Chỉ xử lý dòng mới, không build lại cả bảng | Bảng fact lớn |
| generic test | `unique`, `not_null`, `accepted_values`, `relationships` | Khai trong YAML, 90% nhu cầu |
| singular test | File `.sql` trả về **các dòng sai** | Luật nghiệp vụ riêng |
| `seed` | CSV nhỏ → bảng | Bảng tra cứu tay |
| `snapshot` | Bắt thay đổi theo thời gian (SCD2) | Dimension đổi chậm |
| macro / Jinja | Hàm sinh SQL | Khi bắt đầu copy-paste SQL |
| `dbt_utils` | Gói test/macro cộng đồng | `unique_combination_of_columns` — cần ngay |
| `dbt docs` | Sinh trang web + sơ đồ lineage | Bàn giao, rà tác động |

## Lộ trình

- [x] **Hiểu** — giải thích được vì sao dbt không thay Spark, và `ref()` để làm gì
- [ ] **Chạy được** — model chạy trên lab DuckDB, `dbt run` + `dbt test` xanh (bài 1–3)
- [ ] **Sửa được** — tự gỡ ≥3 lỗi thật, đọc được `target/compiled/` (bài 4–6)
- [ ] **Thiết kế được** — chuyển cùng model đó sang Trino, chọn được materialization và bảo vệ được lựa chọn (bài 7)

## Tự kiểm

Gấp tài liệu, trả lời miệng, rồi mới mở đáp án.

<details>
<summary>1. dbt có chuyển dữ liệu không?</summary>

Không. Nó biên dịch SQL rồi gửi cho warehouse chạy. Không có engine tính toán riêng.
Là chữ T trong ELT.

</details>

<details>
<summary>2. Vì sao phải dùng <code>ref()</code> thay vì viết thẳng tên bảng?</summary>

`ref()` là thứ duy nhất cho dbt biết phụ thuộc. Viết thẳng tên bảng thì DAG mất một
cạnh → dbt có thể chạy sai thứ tự, và lineage nói dối. Nguy hiểm ở chỗ **model vẫn
chạy được**, không báo lỗi gì.

</details>

<details>
<summary>3. Khác nhau giữa <code>source()</code> và <code>ref()</code>?</summary>

`source()` = bảng dbt KHÔNG tạo ra (Spark/Flink ghi vào). `ref()` = model do chính
dbt tạo. Nhầm chỗ này là dbt tưởng nó sở hữu bảng của người khác, và mất luôn
`dbt source freshness`.

</details>

<details>
<summary>4. Khi nào <code>view</code>, khi nào <code>table</code>, khi nào <code>incremental</code>?</summary>

`view` — rẻ, luôn tươi, nhưng tính lại mỗi lần query; hợp tầng staging.
`table` — build lại toàn bộ mỗi lần chạy; hợp mart nhỏ/vừa.
`incremental` — chỉ thêm dòng mới; hợp fact lớn, đổi lại phải tự lo dữ liệu sửa muộn.

</details>

<details>
<summary>5. Test <code>unique</code> pass nhưng số vẫn sai — nghi gì trước?</summary>

Nghi mình test sai grain. `unique` trên đúng một cột không nói gì về bảng có grain
tổ hợp. Xác định grain TRƯỚC khi viết test.

</details>

<details>
<summary>6. Muốn biết dbt thật sự gửi câu SQL nào đi thì xem đâu?</summary>

`target/compiled/`. Đó là SQL sau khi Jinja đã render — thứ warehouse thật sự nhận.

</details>

## Sai lầm đã mắc

<!-- Ghi cả cái SAI lúc đầu, không chỉ cách đúng cuối cùng. -->

### 30/07/2026 — nội dung AI sinh ghi sai tên catalog Trino

Bản đầu của module ghi *"profiles.yml trỏ 192.168.100.60:8080, catalog Iceberg"*.
Chạy `SHOW CATALOGS` trên Trino `.60` thì catalog thật là `hdos_silver`, `polaris`,
`polaris_silver`, `system` — **không hề có catalog tên `iceberg`**.

Làm theo y nguyên là `dbt debug` fail, và mất một buổi nghi cấu hình dbt trong khi
lỗi nằm ở chỗ khác hẳn.

**Bài học không phải về dbt, mà về chính kho này.** Nội dung AI sinh đọc rất thuyết
phục và sai ở đúng chỗ khó kiểm nhất — chi tiết cụ thể của môi trường. Đây là lý do
mỗi file có `verified_at`, và trống nghĩa là chưa tin được.

### 30/07/2026 — `unique` trên `don_hang_id`, và đổ tại dữ liệu

Xem [06-test-va-data-quality.md](testing.md) §5. Grain thật là *cặp*
`(don_hang_id, dong)`; test sai chứ dữ liệu không sai.

## Nguồn

- [ ] docs.getdbt.com — phần *Build your DAG* (đọc hết, đừng nhảy cóc)
- [ ] `dbt_utils` — đọc danh sách test có sẵn trước khi tự viết
- [ ] `dbt-trino` README — phần cấu hình Iceberg (để dành bài 7)

## Liên kết

- [Trino](../../query-engines/trino/index.md) — đích chuyển sang ở bài 7
- [Iceberg](../../storage/iceberg/index.md) — table format dưới Trino
- [SQL](../../databases/sql/index.md) — nền của mọi thứ ở đây
