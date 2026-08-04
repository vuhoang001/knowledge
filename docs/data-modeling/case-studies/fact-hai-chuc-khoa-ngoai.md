---
title: Fact tám khoá ngoại cho hai chiều thật
sidebar_position: 19
description: "Mỗi cấp thời gian và mỗi cấp sản phẩm được tách thành một dimension riêng; mọi báo cáo phải join 3–5 bảng để hỏi một câu đơn giản."
tags: [case-study, centipede, dimension, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Fact tám khoá ngoại cho hai chiều thật

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** ngày, tuần, tháng, quý, năm không phải năm dimension — chúng là năm **cột của
> một** dimension. Xem [centipede fact table](../skills/centipede-fact.md).

## Bối cảnh

Mô hình được thiết kế bởi một DBA quen chuẩn hoá OLTP. Nguyên tắc áp dụng: *"mỗi thực thể
một bảng, không lặp dữ liệu"*. Áp lên kho dữ liệu, nó cho ra thế này:

```sql
CREATE TABLE fct_centipede AS
SELECT 20260110 AS ngay_key, 202602 AS tuan_key, 202601 AS thang_key,
       20261 AS quy_key, 2026 AS nam_key,
       1 AS sp_key, 1 AS nhom_key, 1 AS nganh_key,
       1000 AS doanh_thu;
```

```text
┌───────────────┐
│ so_khoa_ngoai │
├───────────────┤
│             8 │
└───────────────┘
```

Tám khoá ngoại, tám bảng dimension. Về mặt chuẩn hoá thì không chê được: không giá trị
nào bị lặp.

## Triệu chứng

Không có sự cố số liệu. Triệu chứng là **ma sát**, tích lũy dần và không ai quy được cho
nguyên nhân nào:

- Câu hỏi đơn giản nhất cũng phải join 3 bảng:

```sql
SELECT t.thang_ten, n.nganh_ten, sum(f.doanh_thu) AS doanh_thu
FROM fct_centipede f
JOIN dim_thang t ON t.thang_key = f.thang_key
JOIN dim_nganh n ON n.nganh_key = f.nganh_key
GROUP BY 1,2;
```

```text
┌──────────────┬───────────┬───────────┐
│  thang_ten   │ nganh_ten │ doanh_thu │
├──────────────┼───────────┼───────────┤
│ Thang 1/2026 │ Dien tu   │      1000 │
└──────────────┴───────────┴───────────┘
```

- Người dùng BI mở model, thấy 8 bảng, không biết bắt đầu từ đâu.
- Muốn drill từ tháng xuống ngày phải **thêm một join**, không phải thêm một cột.
- Mỗi phân tích viên tự chọn join khác nhau; hai người ra hai kết quả vì một người quên
  join `dim_nhom`.

Cái mất là **tốc độ trả lời câu hỏi**, thứ không hiện lên bất kỳ dashboard vận hành nào.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Query chậm do thiếu index | Thêm index, nhanh hơn chút, ma sát vẫn nguyên |
| Người dùng chưa được đào tạo | Đào tạo xong, tuần sau lại hỏi cách join |
| Cần một semantic layer để che bớt | Có ích, nhưng chỉ **giấu** vấn đề đi |
| Warehouse cần nâng cấp | Không phải vấn đề tài nguyên |

Chỗ mất thời gian: coi đây là **vấn đề công cụ hoặc con người**. Cả hai hướng đều tốn
tiền và không giải quyết gốc.

Câu hỏi rẽ hướng: *"tám khoá này có thật sự là tám chiều độc lập không?"*

## Nguyên nhân thật

```sql
SELECT ngay,
       strftime(ngay, '%Y-W%W')        AS tuan_suy_ra,
       strftime(ngay, '%Y%m')::INT     AS thang_suy_ra,
       year(ngay) * 10 + quarter(ngay) AS quy_suy_ra,
       year(ngay)                      AS nam_suy_ra
FROM dim_ngay;
```

```text
┌────────────┬─────────────┬──────────────┬────────────┬────────────┐
│    ngay    │ tuan_suy_ra │ thang_suy_ra │ quy_suy_ra │ nam_suy_ra │
├────────────┼─────────────┼──────────────┼────────────┼────────────┤
│ 2026-01-10 │ 2026-W01    │       202601 │      20261 │       2026 │
└────────────┴─────────────┴──────────────┴────────────┴────────────┘
```

Bốn khoá thời gian **suy ra được hoàn toàn** từ `ngay_key`. Ba khoá sản phẩm cũng vậy:
`nhom_key` và `nganh_key` suy ra từ `sp_key`.

Tám khoá ngoại đại diện cho **đúng hai chiều**: thời gian và sản phẩm.

Chuẩn hoá là đúng cho hệ giao dịch, nơi mục tiêu là **ghi nhanh và không mâu thuẫn**. Kho
dữ liệu tối ưu cho **đọc và hiểu**, nên nó cố tình chấp nhận lặp dữ liệu trong dimension.
Áp nguyên tắc của bên này sang bên kia là nguồn gốc của mọi centipede.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `relationships` cho cả 8 khoá | ✅ xanh hết |
| `not_null` cho cả 8 khoá | ✅ xanh |
| `unique` trên mỗi dimension | ✅ xanh |
| Tổng doanh thu khớp nguồn | ✅ xanh |
| Số khoá ngoại có hợp lý không | ❌ — **không phải loại test dữ liệu** |

Mọi số đều đúng. Đây không phải lỗi dữ liệu mà là lỗi **cấu trúc**, và hậu quả của nó đo
bằng thời gian người, không đo bằng con số trong bảng.

Thứ bắt được nó là **review thiết kế**, hoặc một quy tắc lint đơn giản: *"fact có trên 20
khoá ngoại thì phải giải trình"*.

## Cách sửa

Gộp về một dimension cho mỗi chiều thật:

```sql
CREATE TABLE dim_ngay_day_du AS
SELECT 20260110 AS ngay_key, DATE '2026-01-10' AS ngay,
       'Tuan 02/2026' AS tuan_ten, 'Thang 1/2026' AS thang_ten,
       'Q1/2026' AS quy_ten, 2026 AS nam;

CREATE TABLE dim_sp_day_du AS
SELECT 1 AS sp_key, 'SP-A' AS san_pham, 'Dien thoai' AS nhom_ten, 'Dien tu' AS nganh_ten;

CREATE TABLE fct_gon AS
SELECT 20260110 AS ngay_key, 1 AS sp_key, 1000 AS doanh_thu;
```

```sql
SELECT d.thang_ten, s.nganh_ten, sum(f.doanh_thu) AS doanh_thu
FROM fct_gon f
JOIN dim_ngay_day_du d USING (ngay_key)
JOIN dim_sp_day_du   s USING (sp_key)
GROUP BY 1,2;
```

```text
┌──────────────┬───────────┬───────────┐
│  thang_ten   │ nganh_ten │ doanh_thu │
├──────────────┼───────────┼───────────┤
│ Thang 1/2026 │ Dien tu   │      1000 │
└──────────────┴───────────┴───────────┘
```

Cùng kết quả.

| | Trước | Sau |
|---|---|---|
| Khoá ngoại trong fact | 8 | **2** |
| Bảng cho chiều thời gian | 5 | 1 |
| Bảng cho chiều sản phẩm | 3 | 1 |
| Drill tháng → ngày | Thêm một join | Thêm một cột `GROUP BY` |
| Số cách join sai có thể | Nhiều | Gần như không |

Điểm cuối là lợi ích thật sự: khi chỉ còn hai bảng để join, **không còn chỗ để join sai**.

## Dấu hiệu nhận ra sớm

1. Đếm khoá ngoại của mỗi fact — trên 20 là phải giải trình:

```sql
SELECT table_name, count(*) AS so_cot_key
FROM information_schema.columns
WHERE column_name LIKE '%_key' OR column_name LIKE '%_sk'
GROUP BY 1 ORDER BY 2 DESC;
```

2. Tìm các dimension mà **khoá của cái này suy ra được từ cái kia**. Có `dim_thang` và
   `dim_ngay` cùng lúc là dấu hiệu chắc chắn.

3. Hỏi một người dùng BI viết câu query đơn giản nhất — đếm số bảng họ phải join.

4. Trong sơ đồ, đếm số "chân" toả ra từ fact. Trên 20 chân là con rết.

## Related Topics

- [Centipede fact table](../skills/centipede-fact.md) — kỹ thuật bị bỏ qua ở đây
- [Date dimension](../reference/date-dimension.md) — một bảng cho mọi cấp thời gian
- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — vì sao dimension nên dẹt
- [Junk dimension](../skills/junk-dimension.md) — cách khác để giảm số khoá ngoại
