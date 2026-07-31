---
title: Bridge table
sidebar_position: 6
description: Quan hệ nhiều-nhiều giữa fact và dimension — bảng cầu nối kèm hệ số phân bổ để tổng không bị nhân đôi.
tags: [bridge-table, many-to-many, dimension, data-modeling, kimball]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Bridge table

> **Chốt:** Fact và dimension quan hệ **nhiều-nhiều** thì join thẳng là nhân bản dòng và
> tổng tiền phồng lên. Bridge table giải quyết được, nhưng chỉ khi có thêm **hệ số phân
> bổ** — và phải chọn trước: cộng đúng tổng, hay cộng đúng theo từng thành viên.

## Mục tiêu

Xử lý tình huống mà mô hình chiều cơ bản không chịu được: một dòng fact thuộc về **nhiều**
giá trị dimension cùng lúc.

## Khi nào gặp

| Tình huống | Nhiều-nhiều ở đâu |
|---|---|
| Một tài khoản có nhiều chủ sở hữu | `fct_giao_dich` ↔ `dim_khach_hang` |
| Một sản phẩm thuộc nhiều danh mục | `fct_ban_hang` ↔ `dim_danh_muc` |
| Một bệnh án có nhiều chẩn đoán | `fct_kham_benh` ↔ `dim_chan_doan` |

Dấu hiệu nhận ra: câu hỏi *"một dòng fact ứng với **mấy** giá trị dimension"* trả lời là
"không cố định".

## Vì sao không join thẳng

Giao dịch 1.000.000đ của tài khoản có 3 chủ. Nếu `fct_giao_dich` join trực tiếp bảng
`tai_khoan_chu_so_huu`:

```text
giao_dich | khach   | so_tien
GD001     | KH001   | 1.000.000
GD001     | KH002   | 1.000.000
GD001     | KH003   | 1.000.000
```

`SUM(so_tien)` = **3.000.000**. Giao dịch chỉ có một triệu.

Đây là lỗi khó bắt vì `count(*)` fact vẫn đúng nếu đếm trước join, và không test nào
dựng sẵn cho nó.

## Ví dụ xuyên suốt

Chạy được trên DuckDB.

### Bước 1 — dữ liệu nguồn

```sql
CREATE TABLE fct_giao_dich (giao_dich_id VARCHAR, tai_khoan_id VARCHAR, so_tien DECIMAL(18,2));
INSERT INTO fct_giao_dich VALUES
  ('GD001','TK01', 1000000),
  ('GD002','TK02',  500000),
  ('GD003','TK01',  300000);

-- TK01 co 3 chu, TK02 co 1 chu
CREATE TABLE tai_khoan_chu (tai_khoan_id VARCHAR, ma_khach VARCHAR);
INSERT INTO tai_khoan_chu VALUES
  ('TK01','KH001'), ('TK01','KH002'), ('TK01','KH003'), ('TK02','KH004');
```

### Bước 2 — bridge table kèm hệ số phân bổ

Cột `he_so` là thứ phân biệt bridge table với một bảng nối thường:

```sql
CREATE TABLE bridge_tai_khoan_khach AS
SELECT
  tai_khoan_id,
  ma_khach,
  1.0 / count(*) OVER (PARTITION BY tai_khoan_id) AS he_so
FROM tai_khoan_chu;
```

`TK01` → mỗi chủ hệ số `0.333…`; `TK02` → hệ số `1.0`. Tổng hệ số của mỗi tài khoản
luôn bằng 1 — đó là bất biến cần giữ.

### Bước 3 — hai cách cộng, cho hai câu hỏi khác nhau

Đây là chỗ phải **chọn**, không phải chỗ có đáp án duy nhất:

```sql
-- A. Có phân bổ: tổng toàn hệ thống ĐÚNG, số của từng khách là phần được chia
SELECT b.ma_khach, sum(f.so_tien * b.he_so) AS gia_tri_phan_bo
FROM fct_giao_dich f
JOIN bridge_tai_khoan_khach b USING (tai_khoan_id)
GROUP BY b.ma_khach
ORDER BY gia_tri_phan_bo DESC;

-- B. Không phân bổ: mỗi khách thấy TOÀN BỘ giao dịch mình liên quan,
--    nhưng KHÔNG được cộng tổng lại
SELECT b.ma_khach, sum(f.so_tien) AS gia_tri_lien_quan
FROM fct_giao_dich f
JOIN bridge_tai_khoan_khach b USING (tai_khoan_id)
GROUP BY b.ma_khach;
```

**Kết quả:** _chưa chạy_

| Câu hỏi nghiệp vụ | Dùng cách |
|---|---|
| "Tổng doanh số toàn hệ thống" | **A** — B sẽ phồng |
| "Khách này liên quan tới bao nhiêu tiền" | **B** — A chia nhỏ, không phản ánh mức liên quan |
| Báo cáo có cả hai | Hai cột riêng, **đặt tên khác nhau** |

Đặt tên là phần quan trọng nhất. Gọi cả hai là `doanh_thu` thì sớm muộn ai đó cộng nhầm.

### Bước 4 — test bắt buộc

Bất biến phải kiểm, không phải tin:

```sql
-- 1. tong he so moi tai khoan phai bang 1
SELECT tai_khoan_id, sum(he_so) AS tong
FROM bridge_tai_khoan_khach GROUP BY tai_khoan_id HAVING abs(sum(he_so) - 1.0) > 1e-9;

-- 2. tong sau phan bo phai bang tong goc
SELECT
  (SELECT sum(so_tien) FROM fct_giao_dich)                               AS goc,
  (SELECT sum(f.so_tien * b.he_so) FROM fct_giao_dich f
     JOIN bridge_tai_khoan_khach b USING (tai_khoan_id))                 AS sau_phan_bo;
```

**Kết quả:** _chưa chạy_

Test 1 trả về dòng nào là bridge hỏng. Test 2 lệch là mất hoặc nhân giao dịch — thường
do tài khoản không có chủ nào trong bridge.

### Trước và sau

| | Join thẳng | Bridge có hệ số |
|---|---|---|
| `SUM` tổng hệ thống | 3× với tài khoản 3 chủ | đúng |
| Lọc theo một khách | được | được |
| Số dòng trả về | nhân bản | nhân bản (bản chất nhiều-nhiều) |
| Có test bảo vệ | không | tổng hệ số = 1 |

## Khi nào KHÔNG dùng

- **Số lượng cố định và nhỏ** (luôn đúng 2 chủ) → hai cột `chu_1_sk`, `chu_2_sk` đơn giản hơn.
- **Chỉ cần một giá trị đại diện** (chủ tài khoản chính) → một khoá thường, không cần bridge.
- **Nhiều-nhiều giữa hai dimension**, không liên quan fact → bảng phân cấp riêng.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Bridge không có `he_so` | Tổng phồng, và không có cách sửa sau |
| Cộng cột không phân bổ rồi báo cáo là doanh thu | Số sai, không lỗi nào báo — nguy hiểm nhất |
| Hệ số không tổng về 1 | Tổng lệch âm thầm; phải có test |
| Dùng bridge khi số lượng cố định | Phức tạp hoá vô ích |
| Tài khoản không có chủ nào trong bridge | `JOIN` làm mất giao dịch — dùng `LEFT JOIN` hoặc thêm dòng "chưa xác định" |

## Related Topics

- [Fact và Dimension](../reference/fact-and-dimension.md) — mô hình cơ bản giả định một-nhiều
- [Grain](../reference/grain.md) — bridge **không** đổi grain của fact
- [Junk dimension](junk-dimension.md) — cũng thêm bảng phụ, nhưng cho cột cardinality thấp
- [Sáu chiều chất lượng](../../data-quality/six-dimensions.md) — chiều *accuracy*, chỗ duy nhất bắt được lỗi cộng phồng
