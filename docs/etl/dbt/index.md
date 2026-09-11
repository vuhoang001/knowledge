---
title: dbt (data build tool)
description: Transform SQL có DAG và test — chữ T trong ELT. dbt sinh SQL, warehouse chạy SQL.
tags: [dbt, elt, transformation, data-engineering]
domain: data-engineering
category: technology
doc_type: index
status: review
difficulty: intermediate
verified_at: 2026-07-30
lab: ~/Documents/learn-lab/dbt
updated: 2026-09-11
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
| 01 | [dbt là gì](reference/what-is-dbt.md) | Nó thật sự làm gì, `ref()` và test là gì | ✅ đã chạy |
| 02 | [Cấu trúc project](reference/project-structure.md) | `dbt_project.yml`, `profiles.yml`, `target/` | 📝 có output thật |
| 03 | [Model và `ref()`](reference/models-and-ref.md) | Đơn vị cơ bản, DAG mọc ra từ đâu | 📝 có output thật |
| 04 | [Source, seed, snapshot](reference/sources-seeds-snapshots.md) | Dữ liệu vào từ đâu khi không phải model | 📝 có output thật |
| 05 | [Materialization](reference/materializations.md) | `view` / `table` / `incremental` / `ephemeral` | 📝 có output thật |
| 06 | [Test và data quality](reference/testing.md) | 3 tầng: test · contract · unit test | 📝 lý thuyết, chưa chạy |
| 07 | [Macro, Jinja, package](reference/macros-jinja-packages.md) | Khi SQL bắt đầu bị copy-paste | 📝 có output thật |
| 08 | [Docs và lineage](reference/docs-and-lineage.md) | `dbt docs`, rà tác động khi sửa cột | 📝 có output thật |
| 09 | [dbt Core và dbt Cloud](reference/dbt-core-vs-cloud.md) | Cùng engine, khác vỏ — chọn theo mảnh đội mình thiếu | 🟡 draft |
| 10 | [Tổ chức layer và đặt tên](reference/layer-va-dat-ten.md) | staging → intermediate → marts: ba luật, grep được | 📝 có output thật |

## Mục lục — kỹ năng (làm được, không chỉ hiểu)

| # | Kỹ năng | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| 01 | [Khởi tạo project](skills/khoi-tao-dbt-project.md) | Từ `pip install` tới `dbt debug` xanh | 📝 có output thật |
| 02 | [Model đầu tiên với `ref()`](skills/model-dau-tien-voi-ref.md) | Một `SELECT`, không `create`, không `;` | 📝 có output thật |
| 03 | [Khai báo source](skills/khai-bao-source.md) | `source()` + `freshness`, và vì sao `STALE` không phải lúc nào cũng là lỗi | 📝 có output thật |
| 04 | [Incremental model](skills/viet-incremental-model.md) | Bốn câu hỏi phải trả lời trước khi bật | 📝 có output thật |
| 05 | [Triển khai test](skills/implementing-tests.md) | Sáu loại test, khai ở đâu, ra output nào | 📝 có output thật |
| 06 | [Macro và Jinja](skills/macro-va-jinja.md) | Jinja chạy trước, debug ở `target/compiled/` | 📝 có output thật |
| 07 | [Snapshot SCD2](skills/snapshot-scd2.md) | Máy ghi âm, không phải máy thời gian | 📝 có output thật |
| 08 | [Quản lý package](skills/quan-ly-package.md) | `dbt_utils` và vì sao phải commit lock file | 📝 có output thật |
| 09 | [Viết documentation](skills/viet-documentation.md) | Grain, đơn vị, cảnh báo — thứ máy không suy ra được | 🟡 draft |
| 10 | [CI/CD cho dbt](skills/ci-cd-cho-dbt.md) | `state:modified+ --defer` | 📝 có output thật |

## Mục lục — bài tập, tra cứu, sự cố

| # | Tài liệu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|
| BT | [Lab dbt trên DuckDB](tutorials/dbt-lab-duckdb.md) | Bảy bài từ `dbt debug` tới Trino | ✅ đã chạy tay |
| BT | [Bài tập — Cơ bản](tutorials/bt-01-co-ban.md) | 5 bài, có đáp số phải ra | 📝 có output thật |
| BT | [Bài tập — Trung bình](tutorials/bt-02-trung-binh.md) | 5 bài về lỗi không báo lỗi | 📝 có output thật |
| BT | [Bài tập — Nâng cao](tutorials/bt-03-nang-cao.md) | 5 bài chỉ lộ ra ở production | 📝 có output thật |
| CS | [Tra nhanh dbt](cheatsheets/tra-nhanh-dbt.md) | CLI, selector, Jinja, YAML, materialization, đặt tên | 📝 có output thật |
| SC | [Incremental đánh rơi đơn sửa muộn](case-studies/incremental-mat-don-sua-muon.md) | Lệch 300k, số dòng vẫn khớp | 📝 có output thật |
| SC | [Snapshot ghi nhầm mốc thời gian](case-studies/snapshot-ghi-nham-moc-thoi-gian.md) | as-was lệch 25% | 📝 có output thật |
| SC | [Phí ship cộng lặp sau join](case-studies/phi-ship-cong-lap-sau-join.md) | Phồng 7% vì join đổi grain | 📝 có output thật |

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

Chi tiết nằm ở [`case-studies/`](case-studies/index.md) — trang này chỉ liệt kê.

| Ngày | Sự cố | Bài học |
|---|---|---|
| 30/07/2026 | [AI sinh sai tên catalog Trino](case-studies/ai-sinh-sai-ten-catalog-trino.md) | Chi tiết môi trường phải kiểm bằng lệnh, không bằng cách đọc |
| 30/07/2026 | [`unique` trên `don_hang_id`](reference/testing.md#5-trường-hợp-thật--test-fail-vì-test-sai-không-phải-dữ-liệu-sai) | Xác định grain trước khi viết test — test sai chứ dữ liệu không sai |
| 11/09/2026 | [Incremental đánh rơi đơn sửa muộn](case-studies/incremental-mat-don-sua-muon.md) | Số dòng khớp không chứng minh dữ liệu đúng — phải đối chiếu tổng số đo |
| 11/09/2026 | [Snapshot ghi nhầm mốc thời gian](case-studies/snapshot-ghi-nham-moc-thoi-gian.md) | `dbt_valid_from` là giờ chạy job, không phải giờ nghiệp vụ |
| 11/09/2026 | [Phí ship cộng lặp sau join](case-studies/phi-ship-cong-lap-sau-join.md) | Sau mỗi join phải hỏi lại: một dòng bây giờ là gì |

## Nguồn

- [ ] docs.getdbt.com — phần *Build your DAG* (đọc hết, đừng nhảy cóc)
- [ ] `dbt_utils` — đọc danh sách test có sẵn trước khi tự viết
- [ ] `dbt-trino` README — phần cấu hình Iceberg (để dành bài 7)

## Liên quan trong kho

Tài liệu về dbt nhưng **không nằm trong thư mục này** — chúng ở theo *dạng tài liệu*
(`doc_type`), không theo chủ đề:

| Dạng | Tài liệu | Dùng khi |
|---|---|---|
| Bài tập | [Cơ bản](tutorials/bt-01-co-ban.md) · [Trung bình](tutorials/bt-02-trung-binh.md) · [Nâng cao](tutorials/bt-03-nang-cao.md) · [lab DuckDB](tutorials/dbt-lab-duckdb.md) | chạy thật, có đáp số phải ra |
| Case study | [ba sự cố đã dựng lại](case-studies/index.md) | đã debug xong một sự cố dbt thật |
| Cheatsheet | [Tra nhanh dbt](cheatsheets/tra-nhanh-dbt.md) | đang làm, cần tra nhanh cú pháp |
| Kỹ năng | [mười kỹ năng](skills/index.md) | cần làm được, không phải hiểu khái niệm |

Xem đầy đủ mọi thứ mang tag này: **[`/tags/dbt`](/tags/dbt)** — trang đó gom tất cả bất
kể thư mục.

## Liên kết

- [Trino](../../query-engines/trino/index.md) — đích chuyển sang ở bài 7
- [Iceberg](../../storage/iceberg/index.md) — table format dưới Trino
- [SQL](../../databases/sql/index.md) — nền của mọi thứ ở đây
