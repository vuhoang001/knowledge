---
title: NULL trong fact và trong dimension
sidebar_position: 14
description: "NULL ở cột số đo, cột khoá và thuộc tính dimension hỏng theo ba kiểu khác nhau — và logic ba trị làm bộ lọc âm thầm nuốt dòng."
tags: [null-handling, fact, dimension, data-quality, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# NULL trong fact và trong dimension

> **Chốt:** SQL không dùng logic hai trị mà dùng **ba trị** — đúng, sai, và *không biết*.
> `WHERE trang_thai <> 'huy'` loại luôn dòng `NULL`, vì "không biết có phải `huy` không"
> **không phải** là "đúng". Không có gì báo lỗi, chỉ có tổng bị hụt.

## Ba chỗ NULL xuất hiện, ba hậu quả khác nhau

| NULL ở đâu | Kimball nói gì | Hậu quả nếu để nguyên |
|---|---|---|
| **Cột số đo trong fact** | Được phép, và thường đúng | `SUM` bỏ qua — đúng; `AVG` bỏ qua — thường **sai ý người hỏi** |
| **Cột khoá ngoại trong fact** | **Cấm tuyệt đối** | `JOIN` ném cả dòng đi |
| **Thuộc tính trong dimension** | Nên thay bằng nhãn rõ nghĩa | Bộ lọc BI ẩn nhóm, `NOT IN` trả về rỗng |

Hai dòng cuối là chỗ mất số. Dòng đầu là chỗ hiểu sai số.

## Ví dụ xuyên suốt

Năm đơn hàng, một đơn chưa xác định trạng thái, ba đơn không có khái niệm giảm giá.

```sql
CREATE TABLE fct_don AS
SELECT * FROM (VALUES
  ('D1', 'hoan_thanh', 200, 50),
  ('D2', 'hoan_thanh', 300, 0),
  ('D3', 'huy',        200, NULL),
  ('D4', NULL,         200, NULL),   -- trang thai chua xac dinh
  ('D5', 'hoan_thanh', 100, NULL)
) t(so_don, trang_thai, doanh_thu, giam_gia);
```

Sự thật: **5 đơn, 1.000 doanh thu.**

### Bẫy 1 — `<>` nuốt dòng NULL

Câu hỏi nghiệp vụ: *"doanh thu của các đơn không bị huỷ"*. Câu SQL ai cũng viết:

```sql
SELECT count(*) AS so_dong, sum(doanh_thu) AS doanh_thu
FROM fct_don WHERE trang_thai <> 'huy';
```

```text
┌─────────┬───────────┐
│ so_dong │ doanh_thu │
├─────────┼───────────┤
│       3 │       600 │
└─────────┴───────────┘
```

Đơn `D3` bị huỷ (200) — loại đúng. Nhưng `D4` (200) **cũng biến mất**, dù nó không hề bị
huỷ. `NULL <> 'huy'` cho ra `UNKNOWN`, và `WHERE` chỉ giữ dòng `TRUE`.

Đáng lẽ phải là 800. Hụt **25%**.

```sql
SELECT count(*) AS so_dong, sum(doanh_thu) AS doanh_thu
FROM fct_don WHERE trang_thai IS DISTINCT FROM 'huy';
```

```text
┌─────────┬───────────┐
│ so_dong │ doanh_thu │
├─────────┼───────────┤
│       4 │       800 │
└─────────┴───────────┘
```

`IS DISTINCT FROM` coi `NULL` là một giá trị so sánh được. Cách khác: `WHERE
coalesce(trang_thai,'(chua xac dinh)') <> 'huy'` — dài hơn nhưng ai đọc cũng hiểu ý đồ.

**Cách chắc nhất là không để lọt vào tình huống đó:** nhóm rồi nhìn, đừng lọc rồi tin.

```sql
SELECT coalesce(trang_thai, '(chua xac dinh)') AS trang_thai,
       count(*) AS so_don, sum(doanh_thu) AS doanh_thu
FROM fct_don GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌─────────────────┬────────┬───────────┐
│   trang_thai    │ so_don │ doanh_thu │
├─────────────────┼────────┼───────────┤
│ hoan_thanh      │      3 │       600 │
│ huy             │      1 │       200 │
│ (chua xac dinh) │      1 │       200 │
└─────────────────┴────────┴───────────┘
```

Ba nhóm, cộng lại đúng 1.000. Nhóm thứ ba **hiện ra** thay vì biến mất.

### Bẫy 2 — NULL trong số đo: `SUM` và `AVG` không cùng quan điểm

```sql
SELECT count(*)                            AS so_dong,
       count(giam_gia)                     AS so_dong_co_giam_gia,
       sum(giam_gia)                       AS tong_giam_gia,
       round(avg(giam_gia), 1)             AS avg_bo_qua_null,
       round(avg(coalesce(giam_gia,0)), 1) AS avg_coi_null_la_0
FROM fct_don;
```

```text
┌─────────┬─────────────────────┬───────────────┬─────────────────┬───────────────────┐
│ so_dong │ so_dong_co_giam_gia │ tong_giam_gia │ avg_bo_qua_null │ avg_coi_null_la_0 │
├─────────┼─────────────────────┼───────────────┼─────────────────┼───────────────────┤
│       5 │                   2 │            50 │            25.0 │              10.0 │
└─────────┴─────────────────────┴───────────────┴─────────────────┴───────────────────┘
```

**25,0 hay 10,0?** Cả hai đều đúng — cho hai câu hỏi khác nhau:

- 25,0 = *"trong các đơn **có áp dụng** giảm giá, trung bình giảm bao nhiêu"*
- 10,0 = *"tính trên **mọi** đơn, trung bình mỗi đơn được giảm bao nhiêu"*

`AVG` mặc định chọn vế đầu. Không ai trên dashboard biết điều đó.

Và đây là chỗ phải phân biệt cho rõ:

```sql
SELECT count(*) FILTER (WHERE giam_gia = 0)     AS co_do_va_bang_0,
       count(*) FILTER (WHERE giam_gia IS NULL) AS khong_co_khai_niem_giam_gia,
       count(*) FILTER (WHERE giam_gia > 0)     AS co_giam_gia
FROM fct_don;
```

```text
┌─────────────────┬─────────────────────────────┬─────────────┐
│ co_do_va_bang_0 │ khong_co_khai_niem_giam_gia │ co_giam_gia │
├─────────────────┼─────────────────────────────┼─────────────┤
│               1 │                           3 │           1 │
└─────────────────┴─────────────────────────────┴─────────────┘
```

> **`0` nghĩa là "đã đo, kết quả bằng không". `NULL` nghĩa là "không có gì để đo".**

Đơn `D2` được xét giảm giá và giảm 0 đồng. Ba đơn kia không thuộc chương trình khuyến mãi
nào. Thay hết `NULL` thành `0` là **xoá mất sự phân biệt đó**, và mẫu số của mọi tỷ lệ
khuyến mãi sẽ sai vĩnh viễn.

Nguyên tắc: **giữ `NULL` trong cột số đo khi phép đo thật sự không tồn tại**; ép về `0`
chỉ khi `0` đúng là sự thật nghiệp vụ.

### Bẫy 3 — NULL trong thuộc tính dimension

```sql
CREATE TABLE dim_khach AS
SELECT * FROM (VALUES (1,'C1','Mien Bac'), (2,'C2',NULL), (3,'C3','Mien Nam'))
  t(khach_sk, khach_id, khu_vuc);
CREATE TABLE fct_ban AS
SELECT * FROM (VALUES (1,100), (2,500), (3,400)) t(khach_sk, doanh_thu);
```

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ NULL     │       500 │
│ Mien Nam │       400 │
│ Mien Bac │       100 │
└──────────┴───────────┘
```

Nhóm lớn nhất — **500/1.000, tức một nửa doanh thu** — mang nhãn `NULL`. Trên phần lớn
công cụ BI, nhóm này bị ẩn mặc định hoặc hiển thị là ô trống mà người xem lướt qua.

Tệ hơn, danh sách giá trị để dựng bộ lọc cũng thiếu:

```sql
SELECT count(DISTINCT khu_vuc) AS so_khu_vuc_BI_thay,
       count(DISTINCT coalesce(khu_vuc, '(chua co)')) AS so_nhom_that
FROM dim_khach;
```

```text
┌────────────────────┬──────────────┐
│ so_khu_vuc_BI_thay │ so_nhom_that │
├────────────────────┼──────────────┤
│                  2 │            3 │
└────────────────────┴──────────────┘
```

`COUNT(DISTINCT)` bỏ qua `NULL`. Bộ lọc có 2 lựa chọn cho 3 nhóm thật, và **chọn hết cả
hai vẫn không ra tổng đúng**.

Cách sửa là một câu `UPDATE`, và nó đáng làm ngay từ lúc dựng dimension:

```sql
UPDATE dim_khach SET khu_vuc = '(chua co)' WHERE khu_vuc IS NULL;
```

```text
┌───────────┬───────────┐
│  khu_vuc  │ doanh_thu │
├───────────┼───────────┤
│ (chua co) │       500 │
│ Mien Nam  │       400 │
│ Mien Bac  │       100 │
└───────────┴───────────┘
```

Nhãn nên **nói rõ vì sao trống**, vì các lý do khác nhau cần hành động khác nhau:
`(chua co)` · `(khong ap dung)` · `(loi du lieu nguon)`. Ba nhãn đó dẫn tới ba việc phải
làm khác hẳn nhau; một chữ `NULL` thì không dẫn tới việc gì.

### Bẫy 4 — `NOT IN` gặp NULL trả về rỗng

```sql
SELECT count(*) AS so_dong_tra_ve
FROM fct_ban f
WHERE f.khach_sk NOT IN (SELECT khach_sk FROM dim_khach WHERE ... UNION ALL SELECT NULL);
```

```text
┌────────────────┐
│ so_dong_tra_ve │
├────────────────┤
│              0 │
└────────────────┘
```

Chỉ cần **một** `NULL` trong danh sách con là `NOT IN` trả về rỗng cho mọi dòng — không
lỗi, không cảnh báo. Đây là lý do câu "tìm dòng mồ côi" hay im lặng báo *"không có dòng
nào mồ côi"* trong khi thực tế đầy.

Dùng `NOT EXISTS` hoặc `LEFT JOIN ... WHERE x IS NULL` thay cho `NOT IN`. Luôn luôn.

## Khoá ngoại trong fact thì tuyệt đối không NULL

Ba bẫy trên còn cứu được. Khoá `NULL` thì mất dòng ngay ở `JOIN`:

| Thay vì `NULL` | Dùng dòng đặc biệt |
|---|---|
| Chưa biết là ai | `khach_sk = 0` → `"(chua biet)"` — [inferred member](late-arriving.md) |
| Chưa xảy ra | `ngay_key = -1` → `"Chua xay ra"` — [date dimension](../reference/date-dimension.md) |
| Không áp dụng | `sk = -2` → `"(khong ap dung)"` |

Chi tiết ca hỏng ở [case study một nửa số đơn biến mất](../case-studies/don-dang-giao-bien-mat.md).

## Trade-offs

| Được | Mất |
|---|---|
| Nhãn rõ nghĩa: nhóm thiếu dữ liệu hiện ra | Dimension có nhãn "giả", phải giải thích |
| Không dòng nào mất ở `JOIN` | Phải quản dòng khoá đặc biệt (0, −1, −2) |
| Giữ `NULL` trong số đo: phân biệt được "0" và "không đo" | Người viết query phải biết `AVG` bỏ qua `NULL` |
| `IS DISTINCT FROM` an toàn | Dài hơn, ít người biết |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| `WHERE cot <> 'x'` khi cột cho phép `NULL` | Mất dòng âm thầm — [case study](../case-studies/loc-khac-huy-mat-mot-phan-tu.md) |
| `NOT IN (subquery)` mà subquery có `NULL` | Trả về rỗng, không lỗi |
| Thay hết `NULL` thành `0` trong số đo | Mất phân biệt "đo được bằng 0" và "không đo" |
| Để `NULL` ở thuộc tính dimension | BI ẩn nhóm; bộ lọc thiếu lựa chọn |
| Để `NULL` ở khoá ngoại của fact | `JOIN` ném dòng |
| Tin `COUNT(DISTINCT)` để đếm số nhóm | Thiếu đúng nhóm `NULL` |

## Dấu hiệu nhận ra sớm

```sql
-- 1. Cot dimension nao dang co NULL, va bao nhieu %
SELECT 'khu_vuc' AS cot,
       count(*) FILTER (WHERE khu_vuc IS NULL) AS so_null,
       round(100.0 * count(*) FILTER (WHERE khu_vuc IS NULL) / count(*), 1) AS pct
FROM dim_khach;

-- 2. Khoa ngoai NULL trong fact — phai luon bang 0
SELECT count(*) FROM fct_ban WHERE khach_sk IS NULL;

-- 3. Tong sau khi loc + tong bi loc = tong truoc khi loc
```

Câu 3 là bất biến đáng đặt thành test: mọi bộ lọc trong mart đều phải cộng lại ra tổng
gốc. Không cộng lại được nghĩa là có nhóm đang rơi ra ngoài.

## Related Topics

- [Dữ liệu về muộn](late-arriving.md) — inferred member cho khoá chưa biết
- [Date dimension](../reference/date-dimension.md) — dòng `-1` cho mốc chưa xảy ra
- [Six dimensions of data quality](../../data-quality/six-dimensions.md) — completeness đo đúng thứ này
- [CS: lọc "khác huỷ" mất một phần tư doanh thu](../case-studies/loc-khac-huy-mat-mot-phan-tu.md)
- [CS: một nửa số đơn biến mất](../case-studies/don-dang-giao-bien-mat.md)

## References

- Kimball Group — [Nulls in Fact Tables / Null Attributes in Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 3
