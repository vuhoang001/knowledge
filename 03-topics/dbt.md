---
id: dbt
type: module
status: seed
difficulty: 3
prereqs: [sql]
tags: [dbt, data-engineering]
updated: 2026-07-30
verified_at:
lab: ~/Documents/learn-lab/dbt
---

# dbt (data build tool)

## Mục tiêu

Học **chính dbt**, tách rời khỏi HDOS. Đích trước mắt: hiểu `ref()`, viết được model,
và viết được test bắt đúng lỗi grain. Đạt **L3** là đủ.

Ứng dụng về sau là mang test trở lại lakehouse HDOS (dbt từng có trong `kafka-flink`,
bị gỡ khi thu gọn repo 27/07/2026) — nhưng đó là **việc sau**, không phải cách học.

> **Vì sao lab dùng DuckDB chứ không phải Trino `.60`.** Học dbt trên Trino là học ba
> thứ cùng lúc — dbt, Trino, Iceberg — và lỗi nào cũng có ba nghi phạm, không phân
> biệt được lỗi hiểu sai dbt với lỗi cấu hình cụm. DuckDB không server, cả kho là
> một file, xoá đi là về trắng. Lộ trình cũng thông: `trino` và `iceberg` đều còn
> `seed`, học dbt chồng lên hai module chưa kiểm chứng là chồng nợ lên nợ.
>
> Chuyển sang Trino ở bài 6, khi dbt đã không còn là biến số.

**Lab:** `~/Documents/learn-lab/dbt` — venv riêng, `dbt-duckdb`, đã có seed sẵn.
Chạy dbt bằng `.venv/bin/dbt <lệnh> --profiles-dir .`

## Nó giải quyết vấn đề gì

Trước dbt, transform trong warehouse là một đống file SQL rời chạy theo thứ tự ghi
trong đầu ai đó, không ai biết bảng nào phụ thuộc bảng nào, sửa một cột thì phải tự
đoán cái gì gãy, và không có test.

dbt lấy chính SQL đó, thêm hai thứ: `ref()` để khai báo phụ thuộc (từ đó tự dựng DAG
và tự biết thứ tự chạy), và test khai báo bằng YAML. Đổi lại phải chấp nhận cấu trúc
thư mục và Jinja của nó.

## Mô hình tư duy cốt lõi

**dbt KHÔNG chuyển dữ liệu và KHÔNG có engine tính toán.** Nó biên dịch
SQL + Jinja thành SQL thuần rồi gửi cho warehouse chạy. Toàn bộ sức nặng nằm ở
Trino/Spark, dbt chỉ là thứ sinh câu lệnh và xếp thứ tự.

Hiểu sai chỗ này là mọi thứ sai theo: sẽ đi tìm "dbt chạy chậm" trong khi phải tìm
ở Trino, và sẽ tưởng dbt thay được Spark/Flink (không — nó là chữ **T** trong ELT,
không phải E hay L).

Hệ quả thực tế: xem `target/compiled/` để biết dbt thật sự gửi câu SQL nào đi. Gần
như mọi lỗi khó đều sáng ra ở đó.

## Bản đồ khái niệm

| Khái niệm | Là gì | Khi nào dùng |
|---|---|---|
| `model` | Một file `.sql` = một `SELECT` → thành view/table | Đơn vị cơ bản, mọi thứ khác xoay quanh nó |
| `ref()` | Trỏ tới model khác | **Luôn luôn** thay vì viết tên bảng — đây là thứ dựng nên DAG |
| `source()` | Trỏ tới bảng có sẵn dbt không tạo ra | `hdos_bronze` do Spark/Flink ghi vào |
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

- [ ] **L1 Hiểu** — giải thích được vì sao dbt không thay Spark, và `ref()` để làm gì
- [ ] **L2 Chạy được** — model chạy trên lab DuckDB, `dbt run` + `dbt test` xanh (bài 1–2)
- [ ] **L3 Sửa được** — tự gỡ ≥3 lỗi thật (xem "Sai lầm"), đọc được `target/compiled/` (bài 3–5)
- [ ] **L4 Thiết kế được** — chuyển cùng model đó sang Trino, chọn được materialization và bảo vệ được lựa chọn (bài 6)

## Bài tập

Làm trong `~/Documents/learn-lab/dbt`. Mỗi bài **chạy thật, dán output vào ô Kết quả**.
Đọc hiểu không tính — đó là quy tắc của chính kho này (learning-os.md §0.2).

Dữ liệu seed sẵn: `don_hang_chi_tiet.csv` (15 dòng, đơn hàng nhiều dòng hàng) và
`hang_hoa.csv` (4 mặt hàng). Nhỏ để soi được bằng mắt — cố ý.

### Bài 1 — Nối được (L2)

**Làm gì:**
```bash
cd ~/Documents/learn-lab/dbt
.venv/bin/dbt debug --profiles-dir .
.venv/bin/dbt seed  --profiles-dir .
```

**Xong khi:** `All checks passed!` và hai bảng seed vào `lab.duckdb`. Mở file đó bằng
`duckdb lab.duckdb` rồi `SELECT * FROM don_hang_chi_tiet;` để tự thấy dữ liệu.

**Kết quả:**

### Bài 2 — Model đầu tiên, và xem dbt SINH RA gì (L2)

**Làm gì:** tạo `models/stg_don_hang.sql`, chỉ `SELECT` từ seed, đổi tên cột, thêm
cột tính `thanh_tien = so_luong * don_gia`. Chạy `dbt run`, rồi **mở
`target/compiled/dbt_lab/models/stg_don_hang.sql`**.

**Xong khi:** so được file mình viết với file dbt sinh ra, và nói được dbt đã thay
đổi đúng những gì.

> Đây là chỗ mô hình tư duy cốt lõi trở thành thứ nhìn thấy được, không còn là câu
> chữ. Đừng bỏ bước mở `target/compiled/`.

**Kết quả:**

### Bài 3 — Test bắt lỗi grain (L2→L3)

**Làm gì:** thêm `models/schema.yml`, đặt test `unique` lên `don_hang_id` của
`stg_don_hang`. Chạy `dbt test`.

**Xong khi:** test **FAIL** — và bạn giải thích được vì sao đó là test sai chứ không
phải dữ liệu sai. Sau đó sửa cho đúng grain (gợi ý: grain thật là *cặp* cột nào?).

> Bài quan trọng nhất của cả module. Đây đúng là lớp lỗi làm lệch số trên dashboard
> mà không ai thấy — xem [[phan-trang-client-vs-server]] cho cùng lớp sai ở chỗ khác.

**Kết quả:**

### Bài 4 — `ref()` dựng nên DAG (L3)

**Làm gì:** thêm `stg_hang_hoa.sql`, rồi `mart_doanh_thu_theo_nhom.sql` join hai
model qua `ref()`. Chạy `dbt run`, sau đó `dbt docs generate && dbt docs serve`.

**Xong khi:** đổi tên `stg_don_hang.sql` và thấy dbt **báo lỗi phụ thuộc** chứ không
chạy bừa. Rồi thử thay `ref()` bằng tên bảng thẳng — xem DAG mất cạnh ra sao.

**Kết quả:**

### Bài 5 — Materialization (L3)

**Làm gì:** đổi mart sang `table`, rồi `incremental` với `is_incremental()`. Chạy
hai lần, so số dòng và thời gian.

**Xong khi:** nói được điều gì xảy ra khi một đơn hàng **cũ** bị sửa lại, và
`--full-refresh` giải quyết gì.

**Kết quả:**

### Bài 6 — Chuyển sang Trino (L3→L4)

**Chỉ làm sau khi bài 1–5 xong.** Đổi `profiles.yml` sang `dbt-trino` trỏ `.60:8080`.
Chạy lại chính các model đó.

**Xong khi:** nói được cái gì phải đổi và cái gì giữ nguyên — đó là câu trả lời thật
cho "dbt độc lập với warehouse tới mức nào".

> ⚠ Catalog trên `.60` tên là `hdos_silver` / `polaris_silver`, **không có catalog
> tên `iceberg`**. Xem mục "Sai lầm đã mắc".

**Kết quả:**

## Tự kiểm

Gấp tài liệu, trả lời miệng, rồi mới mở đáp án.

<details><summary>1. dbt có chuyển dữ liệu không?</summary>

Không. Nó biên dịch SQL rồi gửi cho warehouse chạy. Không có engine tính toán riêng.
Là chữ T trong ELT.
</details>

<details><summary>2. Vì sao phải dùng <code>ref()</code> thay vì viết thẳng tên bảng?</summary>

`ref()` là thứ duy nhất cho dbt biết phụ thuộc. Viết thẳng tên bảng thì DAG mất một
cạnh → dbt có thể chạy sai thứ tự, và lineage nói dối.
</details>

<details><summary>3. Khác nhau giữa <code>source()</code> và <code>ref()</code>?</summary>

`source()` = bảng dbt KHÔNG tạo ra (Spark/Flink ghi vào, ví dụ `hdos_bronze`).
`ref()` = model do chính dbt tạo. Nhầm chỗ này là dbt tưởng nó sở hữu bảng của người khác.
</details>

<details><summary>4. Khi nào <code>view</code>, khi nào <code>table</code>, khi nào <code>incremental</code>?</summary>

`view` — rẻ, luôn tươi, nhưng tính lại mỗi lần query; hợp tầng staging.
`table` — build lại toàn bộ mỗi lần chạy; hợp mart nhỏ/vừa.
`incremental` — chỉ thêm dòng mới; hợp fact lớn, đổi lại phải tự lo dữ liệu sửa muộn.
</details>

<details><summary>5. Test <code>unique</code> pass nhưng số vẫn sai — nghi gì trước?</summary>

Nghi mình test sai grain. `unique` trên đúng một cột không nói gì về bảng có grain
tổ hợp. Xác định grain TRƯỚC khi viết test.
</details>

<details><summary>6. Muốn biết dbt thật sự gửi câu SQL nào đi thì xem đâu?</summary>

`target/compiled/`. Đó là SQL sau khi Jinja đã render.
</details>

## Sai lầm đã mắc

<!-- Điền dần khi gặp. Đây là bằng chứng cho L3 — có ≥3 mục thật thì nâng bậc.
     Ghi cả cái SAI lúc đầu, không chỉ cách đúng cuối cùng. -->

### 30/07/2026 — module `seed` này ghi sai tên catalog

Bài 1 bản đầu ghi *"profiles.yml trỏ 192.168.100.60:8080, catalog Iceberg"*. Chạy
`SHOW CATALOGS` trên Trino `.60` thì catalog thật là `hdos_silver`, `polaris`,
`polaris_silver`, `system` — **không hề có catalog tên `iceberg`**.

Làm theo y nguyên là `dbt debug` fail, và mất một buổi nghi cấu hình dbt trong khi
lỗi nằm ở chỗ khác hẳn.

**Bài học không phải về dbt, mà về chính kho này.** Nội dung `seed` do AI sinh đọc
rất thuyết phục và sai ở đúng chỗ khó kiểm nhất — chi tiết cụ thể của môi trường.
Đây là lý do `seed` không được tự lên `learning` (learning-os.md §0.2). Nếu module
này đã mang nhãn "đã học" thì con số sai sẽ đi thẳng vào việc thật.

## Nguồn

- [ ] docs.getdbt.com — phần *Build your DAG* (đọc hết, đừng nhảy cóc)
- [ ] `dbt-trino` README — phần cấu hình Iceberg
- [ ] `dbt_utils` — đọc danh sách test có sẵn trước khi tự viết

## Ghi chú thuộc chủ đề này

<!-- MỤC LỤC. Mọi note trong ../02-notes/ về dbt phải có mặt ở đây, nếu không nó mồ côi. -->

- [Phân trang client hay server](../02-notes/phan-trang-client-vs-server.md) — cùng
  một lớp sai: áp khuôn chung lên dữ liệu có grain khác nhau

## Liên kết

- [Deploy FE lên .60](../04-runbook/deploy-fe-len-60.md) — Trino chạy ở `.60:8080`
- Repo `kafka-flink` — dbt bị gỡ ở lần thu gọn 27/07/2026, lịch sử git còn giữ
- [[bay-mart-doanh-thu-partner]] — bẫy grain ở mart HDOS *(chưa viết)*
