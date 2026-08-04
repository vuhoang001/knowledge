---
title: Dựng dim_don_hang cho "đúng chuẩn Kimball", doanh thu phồng 40%
sidebar_position: 9
description: "Số đơn hàng được tách thành dimension riêng rồi bật Type 2 cho trạng thái — mỗi đơn nhân lên bằng số lần đổi trạng thái."
tags: [case-study, degenerate-dimension, scd, grain, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Dựng `dim_don_hang` cho "đúng chuẩn Kimball", doanh thu phồng 40%

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** không phải khoá nào trong fact cũng cần một dimension. Khoá đã bị rút hết
> thuộc tính thì ở lại fact — đó là
> [degenerate dimension](../skills/degenerate-dimension.md). Dựng bảng cho nó là tạo một
> bảng có cùng grain với fact, và bảng đó sẽ nhân bản dòng.

## Bối cảnh

Review thiết kế. Một người nhận xét: *"`fct_ban` có cột `so_don` mà không trỏ tới
dimension nào — chưa chuẩn hoá xong."* Nghe rất thuyết phục, và nó đúng với mọi khoá còn
lại trong bảng.

`dim_don_hang` ra đời. Nhưng bảng chỉ có `don_sk` và `so_don` — trống trải. Nên `trang_thai`
được chuyển từ fact sang đây, và vì trạng thái thay đổi theo thời gian, [SCD](../skills/scd.md)
Type 2 được bật lên để giữ lịch sử. Mỗi quyết định trong chuỗi này đều hợp lý.

```sql
CREATE TABLE dim_don_hang AS
SELECT * FROM (VALUES
  (1, 'DH-001', 'moi',        DATE '2026-01-01', DATE '2026-01-03'),
  (2, 'DH-001', 'dang_giao',  DATE '2026-01-03', DATE '2026-01-06'),
  (3, 'DH-001', 'hoan_thanh', DATE '2026-01-06', DATE '9999-12-31'),
  (4, 'DH-002', 'moi',        DATE '2026-01-02', DATE '2026-01-05'),
  (5, 'DH-002', 'dang_giao',  DATE '2026-01-05', DATE '9999-12-31'),
  (6, 'DH-003', 'moi',        DATE '2026-01-04', DATE '9999-12-31'),
  (7, 'DH-004', 'hoan_thanh', DATE '2026-01-04', DATE '9999-12-31')
) t(don_sk, so_don, trang_thai, hieu_luc_tu, hieu_luc_den);

CREATE TABLE fct_ban AS
SELECT * FROM (VALUES ('DH-001', 100), ('DH-002', 200), ('DH-003', 300), ('DH-004', 400))
  t(so_don, doanh_thu);
```

Doanh thu thật: **1.000** trên 4 đơn.

## Triệu chứng

Dashboard báo doanh thu **1.400**.

```sql
SELECT count(*) AS dong_sau_join, sum(f.doanh_thu) AS doanh_thu_bao_cao
FROM fct_ban f JOIN dim_don_hang d USING (so_don);
```

```text
┌───────────────┬───────────────────┐
│ dong_sau_join │ doanh_thu_bao_cao │
├───────────────┼───────────────────┤
│             7 │              1400 │
└───────────────┴───────────────────┘
```

**Phồng 40%.** Điều làm ca này khó chịu hơn hẳn: bảng chi tiết vẫn trông hoàn toàn hợp lý.

```sql
SELECT d.trang_thai, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_don_hang d USING (so_don)
GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌────────────┬───────────┐
│ trang_thai │ doanh_thu │
├────────────┼───────────┤
│ moi        │       600 │
│ hoan_thanh │       500 │
│ dang_giao  │       300 │
└────────────┴───────────┘
```

Ba dòng, ba con số tròn trịa. Chỉ tổng của chúng là sai. Và không ai cộng ba dòng trong
đầu khi nhìn dashboard.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Dữ liệu nguồn có đơn trùng | `count(DISTINCT so_don)` trong nguồn = 4, sạch |
| ETL chạy hai lần | Kiểm log: chạy đúng một lần |
| `fct_ban` bị nạp trùng | `count(*) FROM fct_ban` = 4, đúng |
| Có join nào đó thiếu điều kiện | **Gần đúng** — nhưng điều kiện join *có vẻ* đủ: `USING (so_don)` |

Cả buổi soi `fct_ban` vì phản xạ mặc định là "phồng số thì fact bị trùng". Fact hoàn toàn
sạch — **dimension mới là bên nhân bản**.

Một câu hỏi rẽ hướng cả cuộc điều tra:

```sql
SELECT (SELECT count(*) FROM fct_ban)                    AS dong_fact,
       (SELECT count(*) FROM dim_don_hang)               AS dong_dim,
       (SELECT count(DISTINCT so_don) FROM dim_don_hang) AS so_don_phan_biet;
```

```text
┌───────────┬──────────┬──────────────────┐
│ dong_fact │ dong_dim │ so_don_phan_biet │
├───────────┼──────────┼──────────────────┤
│         4 │        7 │                4 │
└───────────┴──────────┴──────────────────┘
```

**Dimension nhiều dòng hơn fact.** Với một dimension đúng nghĩa, con số này phải nhỏ hơn
fact hàng trăm lần.

## Nguyên nhân thật

Hai lỗi chồng lên nhau:

1. **`so_don` không đáng có dimension riêng.** Tách hết thuộc tính của đơn hàng ra
   (`dim_ngay`, `dim_khach`, `dim_kenh`) thì `dim_don_hang` không còn gì ngoài chính con
   số đơn. Grain của nó bằng grain của fact — nó là một fact thứ hai đội lốt dimension.

2. **Type 2 trên bảng đó biến 1 đơn thành N dòng.** Join `USING (so_don)` không có điều
   kiện thời gian, nên mỗi đơn khớp với mọi phiên bản trạng thái của nó. `DH-001` có 3
   phiên bản → 3 lần được đếm.

Đây là fan-out cùng loại với [join hai fact làm phồng tổng](join-hai-fact-lam-phong-tong.md),
chỉ khác là bên phồng đội tên "dimension" nên không ai nghi.

Con số 1.400 = 100×3 + 200×2 + 300×1 + 400×1.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `unique` trên `dim_don_hang.don_sk` | ✅ xanh |
| `not_null` trên `so_don` cả hai bảng | ✅ xanh |
| `relationships` fact → dim | ✅ xanh |
| `unique_combination_of_columns [so_don, hieu_luc_tu]` | ✅ xanh |
| `unique` trên `fct_ban.so_don` | ✅ xanh |

Từng bảng đều đúng. Cái sai chỉ xuất hiện **sau khi join** — và không có test mặc định
nào chạy trên kết quả join.

Test duy nhất bắt được là loại ít ai viết: *"tổng doanh thu sau khi join dimension phải
bằng tổng doanh thu trong fact"*.

## Cách sửa

`so_don` về lại fact như một cột thường. Trạng thái thành dimension thật — vài dòng, dùng
lại được.

```sql
CREATE TABLE dim_trang_thai AS
SELECT * FROM (VALUES (1,'moi'),(2,'dang_giao'),(3,'hoan_thanh')) t(trang_thai_sk, trang_thai);

CREATE TABLE fct_ban_dung AS
SELECT * FROM (VALUES
  ('DH-001', 3, 100), ('DH-002', 2, 200), ('DH-003', 1, 300), ('DH-004', 3, 400)
) t(so_don, trang_thai_sk, doanh_thu);

SELECT t.trang_thai, count(*) AS so_don, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban_dung f JOIN dim_trang_thai t USING (trang_thai_sk)
GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌────────────┬────────┬───────────┐
│ trang_thai │ so_don │ doanh_thu │
├────────────┼────────┼───────────┤
│ hoan_thanh │      2 │       500 │
│ moi        │      1 │       300 │
│ dang_giao  │      1 │       200 │
└────────────┴────────┴───────────┘
```

```text
┌────────┬────────┐
│  tong  │ so_don │
├────────┼────────┤
│   1000 │      4 │
└────────┴────────┘
```

**Còn lịch sử trạng thái?** Nó không mất đi — nó chuyển sang đúng chỗ của nó là một
**accumulating snapshot**: một dòng một đơn, các cột mốc thời gian, cập nhật tại chỗ khi
đơn đi tiếp. Xem [Fact và Dimension](../reference/fact-and-dimension.md) và
[bài lab bước 5](../tutorials/star-schema-duckdb.md).

Lịch sử của một **quy trình** là fact. Lịch sử của một **thực thể** mới là dimension
Type 2.

| | Trước | Sau |
|---|---|---|
| Doanh thu báo cáo | 1.400 | **1.000** |
| Dòng dimension | 7, tăng mỗi lần đổi trạng thái | 3, bất biến |
| Trả lời "đơn kẹt khâu nào" | Có, nhưng số sai | Có, ở accumulating snapshot |

## Dấu hiệu nhận ra sớm

1. **Tỷ lệ dòng dimension / dòng fact tiến về 1.** Đây là dấu hiệu mạnh nhất:

```sql
SELECT 'dim_don_hang' AS bang,
       count(*) AS dong_dim,
       (SELECT count(*) FROM fct_ban) AS dong_fact,
       round(1.0 * count(*) / (SELECT count(*) FROM fct_ban), 2) AS ty_le
FROM dim_don_hang;
```

Tỷ lệ > 0.5 là đáng nghi; ≥ 1 thì gần như chắc chắn sai.

2. Có bảng tên `dim_<danh từ số ít của giao dịch>`: `dim_don_hang`, `dim_hoa_don`,
   `dim_giao_dich`.

3. Test bất biến nên có sẵn: tổng sau join phải bằng tổng trước join.

```sql
SELECT (SELECT sum(doanh_thu) FROM fct_ban)                      AS truoc_join,
       (SELECT sum(f.doanh_thu) FROM fct_ban f
        JOIN dim_don_hang d USING (so_don))                      AS sau_join;
```

Hai số khác nhau là có fan-out, bất kể bảng bên kia tên là gì.

## Related Topics

- [Degenerate dimension](../skills/degenerate-dimension.md) — kỹ thuật đúng cho ca này
- [Grain](../reference/grain.md) — phép thử "dimension có thô hơn fact không"
- [SCD](../skills/scd.md) — Type 2 dùng đúng chỗ thì không gây fan-out
- [Fact và Dimension](../reference/fact-and-dimension.md) — accumulating snapshot cho lịch sử quy trình
- [CS: join hai fact làm phồng tổng](join-hai-fact-lam-phong-tong.md) — cùng cơ chế nhân bản dòng
