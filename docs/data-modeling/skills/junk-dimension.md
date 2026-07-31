---
title: Junk dimension và cột cardinality thấp
sidebar_position: 2
description: "Cột trạng thái vài giá trị: để thẳng trong fact, tách dimension riêng, hay gộp chung — và cách quyết định."
tags: [junk-dimension, degenerate-dimension, dimension, data-modeling, kimball]
domain: data-engineering
category: concept
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Junk dimension và cột cardinality thấp

> **Chốt:** Một cột bảy giá trị **không** đáng một bảng dimension riêng — trừ khi nó
> mang thuộc tính đi kèm. Nhiều cột như thế thì gộp hết vào **một** junk dimension,
> đừng tạo mỗi cột một bảng.

## Mục tiêu

Cho một quy tắc quyết định được với loại cột hay gặp nhất mà sách ít nói: `trang_thai`,
`kenh_ban`, `loai_thanh_toan`, `co_khuyen_mai` — vài giá trị, lặp lại trên triệu dòng
fact, và không rõ nên nhét đâu.

## Hỏi grain trước, đừng hỏi tách hay gộp trước

Câu "tách dimension riêng hay gộp vào" hỏi **sau**. Câu hỏi đầu tiên là *trạng thái này
thuộc về ai* — trả lời sai chỗ này thì mọi lựa chọn phía dưới đều sai.

| Trạng thái thuộc về | Ví dụ | Đi hướng nào |
|---|---|---|
| **Thực thể**, đổi theo thời gian | Khách hàng: hoạt động → tạm khoá → đóng | [SCD](scd.md) Type 2 trên dim chủ. Không phải chuyện ở trang này |
| **Sự kiện**, chốt cứng lúc ghi | Đơn hàng lúc thanh toán: thành công / thất bại | Đọc tiếp trang này |
| **Quy trình**, đổi liên tục trong vòng đời | Đơn: đặt → đóng gói → giao → nhận | Accumulating snapshot fact, mỗi bước một cột mốc thời gian. Xem [Fact và Dimension](../reference/fact-and-dimension.md#ba-loại-fact) |

Bẫy hay gặp nhất là hàng thứ ba bị xử như hàng thứ hai: nhét `trang_thai` hiện tại vào
một cột trong fact rồi `UPDATE` mỗi lần đơn chuyển bước. Lúc đó fact không còn là bản
ghi sự kiện nữa, và **báo cáo tháng trước tự đổi số** khi đơn cũ chuyển trạng thái.

## Bốn lựa chọn

Giả sử đã xác định đây là thuộc tính của sự kiện, chốt cứng lúc ghi.

| Cách | Khi nào chọn | Cái giá |
|---|---|---|
| **Để thẳng trong fact** (degenerate dimension) | Đúng một cột, chỉ là nhãn, không thuộc tính đi kèm | Đổi tên nhãn phải `UPDATE` triệu dòng; text lặp lại tốn chỗ |
| **Dimension nhỏ riêng** | Trạng thái **mang thuộc tính**: nhóm, thứ tự sắp xếp, cờ "có tính doanh thu" | Thêm một join vào mọi query |
| **Junk dimension** | Có từ ~3 cột cardinality thấp trở lên | Phải sinh và bảo trì bảng tổ hợp; đọc lần đầu khó hiểu |
| **SCD Type 2 trên dim chủ** | Trạng thái là thuộc tính của thực thể và cần lịch sử | Dim phình theo nhịp đổi trạng thái |

**Với đúng một cột bảy giá trị và không có thuộc tính nào đi kèm: để thẳng trong fact.**
Tạo bảng bảy dòng rồi join nó ở mọi query chỉ để đổi `3` thành `"Đã giao"` là trả phí
join mà không mua được gì — không có thuộc tính nào để lọc, không có nhóm nào để cuộn.

Ngưỡng đảo chiều là lúc xuất hiện câu hỏi kiểu *"doanh thu theo nhóm trạng thái"* hoặc
*"chỉ tính các trạng thái được coi là chốt đơn"*. Lúc đó trạng thái đã có thuộc tính, và
dimension riêng trả được phí của nó.

## Junk dimension là gì

Khi fact có bốn cột cardinality thấp, cách ngây thơ là bốn bảng dimension bé và bốn khoá
trong fact. Junk dimension gộp chúng thành **một** bảng tổ hợp và **một** khoá:

```text
dim_junk_don_hang
junk_sk | trang_thai   | kenh_ban | loai_thanh_toan | co_khuyen_mai
1       | Đã giao      | Online   | Thẻ             | false
2       | Đã giao      | Online   | Thẻ             | true
3       | Đã giao      | Online   | COD             | false
...
```

Fact giữ đúng `junk_sk` thay cho bốn cột. Bảy trạng thái × ba kênh × bốn loại thanh
toán × hai cờ = 168 dòng — nhỏ hơn cả một dimension khách hàng loại bé nhất.

**Chỉ sinh những tổ hợp thật sự xuất hiện trong dữ liệu**, không sinh sẵn toàn bộ tích
Descartes. Với bốn cột thì hai cách như nhau, nhưng thêm một cột 50 giá trị vào là tích
Descartes nổ lên 8400 dòng trong đó phần lớn không bao giờ dùng tới.

## Ví dụ xuyên suốt — đơn hàng bán lẻ

Chạy được nguyên trạng trên DuckDB. Cùng một bài toán đi hết từ dữ liệu thô tới query
kiểm chứng, để thấy quyết định đổi cái gì chứ không chỉ nghe mô tả.

### Dữ liệu nguồn

```sql
CREATE TABLE don_hang_raw (
  ma_don          VARCHAR,
  ngay            DATE,
  ma_khach        VARCHAR,
  trang_thai      VARCHAR,   -- 7 giá trị
  kenh_ban        VARCHAR,   -- 3 giá trị
  loai_thanh_toan VARCHAR,   -- 4 giá trị
  co_khuyen_mai   BOOLEAN,   -- 2 giá trị
  thanh_tien      DECIMAL(18,2)
);

INSERT INTO don_hang_raw VALUES
  ('DH001','2026-07-01','KH01','Đã giao',      'Online','Thẻ', false, 300000),
  ('DH002','2026-07-01','KH02','Đã giao',      'Online','COD', true,  150000),
  ('DH003','2026-07-02','KH01','Đã huỷ',       'Cửa hàng','Tiền mặt', false, 90000),
  ('DH004','2026-07-02','KH03','Đang giao',    'App','Ví điện tử', true, 220000),
  ('DH005','2026-07-03','KH02','Hoàn hàng',    'Online','Thẻ', false, 300000);
```

### Bước 1 — đếm cardinality trước khi quyết

Đây là bước quyết định, không phải bước kiểm tra. Con số ở đây chọn hộ bạn phương án:

```sql
SELECT
  count(DISTINCT trang_thai)      AS n_trang_thai,
  count(DISTINCT kenh_ban)        AS n_kenh,
  count(DISTINCT loai_thanh_toan) AS n_thanh_toan,
  count(DISTINCT co_khuyen_mai)   AS n_co_km,
  count(*)                        AS n_dong
FROM don_hang_raw;
```

**Kết quả:** _chưa chạy_

Đọc kết quả theo luật này:

| Thấy gì | Làm gì |
|---|---|
| Chỉ một cột cardinality thấp, không thuộc tính đi kèm | Để thẳng trong fact, dừng ở đây |
| Một cột nhưng cần nhóm/thứ tự/cờ | Dimension nhỏ riêng |
| Từ ba cột trở lên, mỗi cột dưới ~20 giá trị | Junk dimension — đi tiếp bước 2 |
| Có cột vượt vài trăm giá trị | Cột đó **không** vào junk, tách dimension riêng cho nó |

### Bước 2 — dựng junk dimension từ tổ hợp thật

`SELECT DISTINCT` trên dữ liệu thật, **không** `CROSS JOIN` các danh mục:

```sql
CREATE TABLE dim_junk_don_hang AS
SELECT
  row_number() OVER (ORDER BY trang_thai, kenh_ban, loai_thanh_toan, co_khuyen_mai) AS junk_sk,
  trang_thai,
  kenh_ban,
  loai_thanh_toan,
  co_khuyen_mai,
  -- thuộc tính suy diễn: thứ đáng tiền của một dimension, fact không tự có
  trang_thai IN ('Đã giao','Đang giao')            AS la_don_hop_le,
  trang_thai IN ('Đã huỷ','Hoàn hàng','Thất bại')  AS la_don_that_bai
FROM (SELECT DISTINCT trang_thai, kenh_ban, loai_thanh_toan, co_khuyen_mai
      FROM don_hang_raw);
```

Hai cột cuối là lý do junk dimension đáng làm. `la_don_hop_le` được định nghĩa **một
lần ở một chỗ**; không có nó thì mỗi báo cáo tự viết lại danh sách trạng thái trong
`WHERE`, và đến lúc thêm trạng thái thứ tám thì mỗi báo cáo sai một kiểu.

### Bước 3 — fact trỏ vào một khoá

```sql
CREATE TABLE fct_don_hang AS
SELECT
  r.ma_don,
  r.ngay,
  r.ma_khach,
  j.junk_sk,          -- thay cho bốn cột
  r.thanh_tien
FROM don_hang_raw r
JOIN dim_junk_don_hang j
  ON  r.trang_thai      = j.trang_thai
  AND r.kenh_ban        = j.kenh_ban
  AND r.loai_thanh_toan = j.loai_thanh_toan
  AND r.co_khuyen_mai   = j.co_khuyen_mai;
```

`JOIN` chứ không `LEFT JOIN` là cố ý: nếu có dòng fact không khớp tổ hợp nào thì
số dòng tụt xuống và bạn biết ngay. `LEFT JOIN` sẽ giấu lỗi đó thành `junk_sk` null.

### Trước và sau

| | Trước | Sau |
|---|---|---|
| Cột mô tả trong fact | 4 (`trang_thai`, `kenh_ban`, `loai_thanh_toan`, `co_khuyen_mai`) | 1 (`junk_sk`) |
| Kiểu dữ liệu lặp trên mỗi dòng | 3 chuỗi + 1 boolean | 1 số nguyên |
| Định nghĩa "đơn hợp lệ" | nằm rải trong `WHERE` của từng báo cáo | một cột trong dimension |
| Thêm trạng thái thứ 8 | mỗi báo cáo sửa một kiểu | thêm dòng vào dimension |

### Bước 4 — query kiểm chứng

Câu hỏi nghiệp vụ *"doanh thu từ đơn hợp lệ, tách theo kênh"* — thứ mà phương án
"để thẳng trong fact" không trả lời được nếu không hardcode danh sách trạng thái:

```sql
SELECT j.kenh_ban, sum(f.thanh_tien) AS doanh_thu
FROM fct_don_hang f
JOIN dim_junk_don_hang j USING (junk_sk)
WHERE j.la_don_hop_le
GROUP BY j.kenh_ban
ORDER BY doanh_thu DESC;
```

**Kết quả:** _chưa chạy_

Và một test bắt buộc — số dòng fact phải bằng số dòng nguồn, lệch là join nhân bản:

```sql
SELECT
  (SELECT count(*) FROM don_hang_raw)  AS nguon,
  (SELECT count(*) FROM fct_don_hang)  AS fact;
```

**Kết quả:** _chưa chạy_

## Trade-offs

| Được | Mất |
|---|---|
| Fact hẹp lại — bốn khoá còn một | Thêm một tầng gián tiếp, người mới đọc không hiểu ngay |
| Thêm cột cờ mới không phải đổi schema fact | Phải có bước sinh/bổ sung tổ hợp trong pipeline |
| Lọc nhiều điều kiện chỉ quét một dimension bé | Không dùng lại được ở fact khác có bộ cột khác |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Tạo dimension bảy dòng cho một cột nhãn thuần | Join thừa ở mọi query, không đổi lấy khả năng phân tích nào |
| Sinh full tích Descartes rồi thêm cột cardinality cao | Bảng nổ, phần lớn dòng không khớp fact nào |
| Nhét trạng thái đang đổi vào dim khách hàng Type 2 | Mỗi lần đổi trạng thái sinh một version khách mới — dim phình, và grain của dim không còn là "một khách" |
| Coi trạng thái vòng đời là thuộc tính dimension | Báo cáo quá khứ tự đổi số, không lỗi nào báo |
| Dùng thẳng mã trạng thái nghiệp vụ làm khoá | Nghiệp vụ đánh lại mã là hỏng khoá — xem [Surrogate key](../reference/surrogate-key.md) |

## FAQ

<details>
<summary>Bảy trạng thái thì có cần surrogate key không?</summary>

Nếu để thẳng trong fact thì không có khoá nào cả — chỉ là một cột text hoặc mã.

Nếu tách thành dimension thì có: giữ `trang_thai_sk` làm khoá, và giữ **cả** mã nghiệp
vụ lẫn tên hiển thị làm cột thường. Lý do giống mọi dimension khác, xem
[Surrogate key](../reference/surrogate-key.md).

</details>

<details>
<summary>Thêm trạng thái thứ tám thì phải làm gì?</summary>

Để thẳng trong fact: không phải làm gì.

Dimension riêng: thêm một dòng.

Junk dimension: thêm các tổ hợp mới của trạng thái đó với các cột còn lại. Đây là lý do
nên sinh tổ hợp theo dữ liệu thật thay vì khai cứng — bước sinh tự bắt được giá trị mới.

</details>

<details>
<summary>Fact đã có cột trạng thái rồi, giờ đổi sang junk dimension có đáng không?</summary>

Chỉ khi đã có từ ba cột cardinality thấp trở lên và fact đủ lớn để độ rộng dòng thành
vấn đề thật. Một cột thì không đáng — đổi schema fact là việc tốn, và đổi lại đúng một
join thêm.

</details>

## Related Topics

- [Fact và Dimension](../reference/fact-and-dimension.md) — quy tắc gốc: cột nào thuộc bảng nào
- [Grain](../reference/grain.md) — phải chốt grain trước khi hỏi tách hay gộp
- [SCD](scd.md) — khi trạng thái thuộc về thực thể và cần lịch sử
- [Surrogate key](../reference/surrogate-key.md) — khoá cho dimension tách ra
- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — junk dimension vẫn là star, không phải snowflake
- [Quy trình thiết kế](../reference/design-process.md) — bước 3 chọn dimension

## References

- Kimball & Ross — *The Data Warehouse Toolkit*, chương 3 (junk dimension) và chương 4
