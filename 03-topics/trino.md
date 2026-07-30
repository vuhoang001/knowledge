---
type: topic
level: L0
started:
next-review:
tags: [trino, sql, data-engineering, hdos]
updated: 2026-07-30
---

# Trino

## Mục tiêu

Đọc được **vì sao một query chậm** và sửa được. `hdos-serving` phục vụ toàn bộ
dashboard bằng SQL trên Trino `.60:8080`; query chậm là API chậm là màn hình chậm.
Hiện mình viết query theo cảm giác, không biết Trino làm gì với nó.

Đạt **L3**: mở `EXPLAIN ANALYZE` ra là chỉ được chỗ tốn thời gian.

## Nó giải quyết vấn đề gì

Dữ liệu nằm rải: Iceberg trên MinIO, Postgres của HIS, có thể thêm nguồn khác. Muốn
hỏi một câu bắc qua nhiều nguồn thì hoặc phải gom hết về một database (chậm, trùng
lặp, luôn lỗi thời), hoặc viết code gom tay.

Trino cho hỏi bằng SQL thẳng tại chỗ dữ liệu đang nằm, nhiều nguồn trong cùng một
câu. Đổi lại: không có index của riêng nó, và hiệu năng phụ thuộc **hoàn toàn** vào
cách dữ liệu bên dưới được sắp.

## Mô hình tư duy cốt lõi

**Trino là engine truy vấn KHÔNG CÓ KHO. Nó không lưu gì cả.**

Không có bảng của riêng nó, không có index của riêng nó, không có thống kê tự thu
thập như database truyền thống. Mỗi query là: chia việc ra nhiều **split**, phát cho
worker, gom kết quả trong **bộ nhớ**.

Hai hệ quả quyết định mọi thứ:

1. **Query chậm thường không phải lỗi Trino** — mà là layout dữ liệu bên dưới. Nghìn
   file Parquet bé, hoặc partition sai, thì SQL viết thế nào cũng chậm. Chữa ở
   [Iceberg](iceberg.md), không chữa ở đây.
2. **Trino tính trong RAM.** JOIN hai bảng lớn sai thứ tự là hết bộ nhớ, không phải
   chậm dần — mà là query chết.

## Bản đồ khái niệm

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| coordinator | Nhận SQL, lập kế hoạch, điều phối | Một cái; nghẽn ở đây là nghẽn tất cả |
| worker | Thực thi task | Thêm worker = thêm song song |
| catalog | Một nguồn dữ liệu đã cấu hình | `iceberg`, `postgresql`… |
| connector | Cách nói chuyện với nguồn đó | Quyết định pushdown làm được tới đâu |
| split | Một mẩu dữ liệu để một task xử lý | Đơn vị song song thật sự |
| stage / task | Các bậc của kế hoạch | Đọc `EXPLAIN` là đọc cái này |
| exchange | Chuyển dữ liệu giữa các stage | Thường là chỗ đắt nhất |
| **predicate pushdown** | Đẩy `WHERE` xuống tận nguồn | Lọc trước khi đọc — thắng lớn nhất |
| dynamic filtering | Dùng bảng nhỏ lọc bảng lớn lúc chạy | Cứu các JOIN sao (star schema) |
| broadcast vs partitioned join | Gửi bảng nhỏ đi khắp nơi, hay băm cả hai | Chọn sai là hết RAM |
| spill | Tràn ra đĩa khi hết RAM | Cứu được nhưng rất chậm |

**`EXPLAIN ANALYZE` là công cụ quan trọng nhất**, và nó là thứ phân biệt người đoán
với người biết. Nó cho biết mỗi stage tốn bao lâu, đọc bao nhiêu dòng, và bao nhiêu
dữ liệu chạy qua exchange.

## Lộ trình

- [ ] **L1 Hiểu** — nói được vì sao Trino không phải database, và pushdown là gì
- [ ] **L2 Chạy được** — đọc được `EXPLAIN` của một query `hdos-serving` đang dùng
- [ ] **L3 Sửa được** — tăng tốc ≥3 query thật, biết nguyên nhân từng cái
- [ ] **L4 Thiết kế được** — viết query cho mart mới, biết trước nó sẽ chạy ra sao

## Bài tập

Toàn bộ làm trên Trino `.60:8080` với dữ liệu HDOS thật.

### Bài 1 — Đọc kế hoạch một query đang chạy thật (L2)

**Làm gì:** lấy một câu SQL trong `hdos-serving`, chạy `EXPLAIN ANALYZE`.

**Xong khi:** chỉ được stage nào tốn nhiều thời gian nhất và vì sao.

**Kết quả:**

### Bài 2 — Chứng minh predicate pushdown (L2→L3)

**Làm gì:** cùng một query, một lần `WHERE` trên cột partition, một lần trên cột
thường. So số dòng đã đọc trong `EXPLAIN ANALYZE`.

**Xong khi:** thấy chênh lệch **số dòng đọc từ đĩa**, không chỉ thời gian.

> Bài quan trọng nhất. Đây là chỗ 90% khác biệt hiệu năng nằm ở.

**Kết quả:**

### Bài 3 — Thứ tự JOIN (L3)

**Làm gì:** JOIN một fact lớn với vài dim nhỏ theo hai thứ tự khác nhau. So kế hoạch.

**Xong khi:** giải thích được broadcast join xảy ra khi nào và vì sao nó nhanh hơn
— cho tới khi "bảng nhỏ" không còn nhỏ.

**Kết quả:**

### Bài 4 — Query chết vì hết bộ nhớ (L3)

**Làm gì:** cố ý JOIN hai bảng lớn không điều kiện lọc.

**Xong khi:** đọc được thông báo lỗi bộ nhớ và nói được ba cách chữa.

**Kết quả:**

### Bài 5 — Nối hai catalog trong một câu (L3→L4)

**Làm gì:** JOIN một bảng Iceberg với một bảng Postgres trong cùng một query.

**Xong khi:** nói được dữ liệu Postgres được kéo về lúc nào và vì sao đó có thể là
bẫy hiệu năng.

**Kết quả:**

## Tự kiểm

<details><summary>1. Trino lưu dữ liệu ở đâu?</summary>

Không lưu gì. Nó chỉ đọc từ các catalog đã cấu hình và tính trong bộ nhớ.
</details>

<details><summary>2. Query chậm — nghi gì trước tiên?</summary>

Layout dữ liệu bên dưới: file nhỏ quá nhiều, hoặc `WHERE` không rơi vào cột partition
nên không pushdown được. Nghi SQL sau, nghi cụm sau nữa.
</details>

<details><summary>3. Predicate pushdown là gì và vì sao quan trọng nhất?</summary>

Đẩy điều kiện lọc xuống tận nguồn để **không đọc** dữ liệu không cần. Lọc sau khi đọc
thì đã trả giá đọc rồi.
</details>

<details><summary>4. Broadcast join sai lúc nào?</summary>

Khi bảng "nhỏ" thật ra không nhỏ — gửi bản sao tới mọi worker sẽ nổ bộ nhớ. Lúc đó
cần partitioned join.
</details>

<details><summary>5. Vì sao file nhỏ giết Trino?</summary>

Mỗi file là một lần mở + đọc metadata. Chi phí cố định vượt chi phí đọc dữ liệu. Chữa
ở tầng Iceberg bằng `rewrite_data_files`, không chữa được bằng SQL.
</details>

<details><summary>6. Công cụ đầu tiên khi gỡ query chậm?</summary>

`EXPLAIN ANALYZE`. Trước nó thì mọi phán đoán chỉ là đoán.
</details>

## Sai lầm đã mắc

<!-- ≥3 mục thật thì nâng L3. -->

## Nguồn

- [ ] Trino docs — *Concepts* (coordinator/worker/split/stage)
- [ ] Trino docs — Iceberg connector, phần pushdown
- [ ] `EXPLAIN ANALYZE` — đọc kỹ cách hiểu output

## Ghi chú thuộc chủ đề này

## Liên kết

- [Iceberg](iceberg.md) — layout dữ liệu quyết định hiệu năng ở đây
- [dbt](dbt.md) — dbt sinh SQL rồi để Trino chạy
- [Deploy FE lên .60](../04-runbook/deploy-fe-len-60.md) — Trino ở `.60:8080`
