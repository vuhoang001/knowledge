---
topic: dbt
level: L0
started:
next-review:
tags: [learning, data-engineering, hdos]
---

# dbt (data build tool)

## Mục tiêu

Mang **test dữ liệu** trở lại lakehouse HDOS. dbt từng có trong `kafka-flink` nhưng
bị gỡ khi thu gọn repo (27/07/2026) — giờ tầng `hdos_silver` → `hdos_gold` không có
gì canh, sai grain hay trùng khoá chỉ lộ ra khi số trên dashboard đã lệch.

Đích cụ thể: dbt chạy trên **Trino** đọc Iceberg, test được các mart mà `hdos-serving`
đang phục vụ. Đạt **L3** là đủ.

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
- [ ] **L2 Chạy được** — `dbt-trino` nối vào Trino `.60`, chạy `dbt run` + `dbt test` xanh
- [ ] **L3 Sửa được** — tự gỡ ≥3 lỗi thật (xem "Sai lầm"), đọc được `target/compiled/`
- [ ] **L4 Thiết kế được** — chọn được materialization + chiến lược incremental cho mart HDOS và bảo vệ được lựa chọn

## Bài tập

Mỗi bài phải **chạy thật** và dán được output. Đọc hiểu không tính.

### Bài 1 — Nối được vào Trino (L2)

**Làm gì:** `pip install dbt-trino`, viết `profiles.yml` trỏ `192.168.100.60:8080`,
catalog Iceberg. `dbt debug` phải xanh.

**Xong khi:** `dbt debug` báo `All checks passed!`

**Kết quả:**

### Bài 2 — Một model đọc source thật (L2)

**Làm gì:** khai `hdos_silver` làm `source`, viết một model `stg_*` chỉ `SELECT` +
đổi tên cột. Materialize `view` trước.

**Xong khi:** `dbt run` tạo được view, query nó bằng Trino ra dữ liệu.

**Kết quả:**

### Bài 3 — Test bắt được lỗi thật (L2→L3)

**Làm gì:** thêm `unique` + `not_null` cho khoá của model đó. **Cố ý** đặt `unique`
lên một cột mà bạn *tưởng* là khoá nhưng không phải, xem nó fail ra sao.

**Xong khi:** đọc được output fail và nói được vì sao — grain của bảng khác với điều
mình tưởng.

> Đây là bài quan trọng nhất. Bẫy hay gặp nhất ở HDOS là đặt test `unique` sai grain:
> mart gộp theo lô/theo kỳ thì mã hàng trùng là **đúng**, phải dùng
> `dbt_utils.unique_combination_of_columns`. Xem [[bay-mart-doanh-thu-partner]].

**Kết quả:**

### Bài 4 — Nối hai model bằng `ref()` (L3)

**Làm gì:** thêm model thứ hai đọc model đầu qua `ref()`. Chạy `dbt docs generate &&
dbt docs serve`, nhìn sơ đồ lineage.

**Xong khi:** xoá model đầu và thấy dbt báo lỗi phụ thuộc chứ không chạy bừa.

**Kết quả:**

### Bài 5 — Incremental trên bảng fact (L3→L4)

**Làm gì:** đổi một model fact sang `materialized='incremental'`, dùng
`is_incremental()` để lọc theo ngày. Chạy 2 lần, so thời gian và số dòng.

**Xong khi:** nói được điều gì xảy ra khi dữ liệu cũ bị sửa lại (gợi ý: `--full-refresh`),
và vì sao Iceberg khiến chuyện này khác với warehouse thường.

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

## Nguồn

- [ ] docs.getdbt.com — phần *Build your DAG* (đọc hết, đừng nhảy cóc)
- [ ] `dbt-trino` README — phần cấu hình Iceberg
- [ ] `dbt_utils` — đọc danh sách test có sẵn trước khi tự viết

## Liên kết

- [[bay-mart-doanh-thu-partner]] — bẫy grain ở mart HDOS
- Repo: `kafka-flink` — dbt bị gỡ ở lần thu gọn 27/07/2026, lịch sử git còn giữ
- [[deploy-fe-len-60]] — Trino chạy ở `.60:8080`
