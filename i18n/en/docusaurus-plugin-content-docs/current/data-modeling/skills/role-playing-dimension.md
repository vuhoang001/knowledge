---
title: Role-playing dimension
i18n_status: untranslated
sidebar_position: 5
description: Một dimension đóng nhiều vai trong cùng một fact — dùng view có tên rõ nghĩa, đừng nhân bản bảng.
tags: [role-playing-dimension, dimension, data-modeling, kimball]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Role-playing dimension

> **Chốt:** Cùng một dimension được fact tham chiếu nhiều lần với **ý nghĩa khác nhau**
> (ngày đặt, ngày giao, ngày thanh toán). Giải pháp là **view có tên rõ nghĩa**, không
> phải copy bảng, cũng không phải đặt alias lúc query.

## Mục tiêu

Trả lời câu hỏi rất hay gặp: fact có ba cột ngày, có phải dựng ba `dim_thoi_gian` không?
Không. Nhưng cũng đừng để người viết query tự xoay xở.

## Vấn đề

```text
fct_don_hang
ma_don | ngay_dat_sk | ngay_giao_sk | ngay_thanh_toan_sk | thanh_tien
```

Ba cột đều trỏ về `dim_thoi_gian`. Nếu để nguyên như vậy thì mỗi query phải tự viết:

```sql
FROM fct_don_hang f
JOIN dim_thoi_gian d1 ON f.ngay_dat_sk = d1.ngay_sk
JOIN dim_thoi_gian d2 ON f.ngay_giao_sk = d2.ngay_sk
```

`d1`, `d2` không nói lên điều gì. Sáu tháng sau đọc lại, hoặc người khác đọc, là nhầm.
Và mỗi người tự đặt alias một kiểu — BI tool thì thường **không** đặt được.

## Ba cách, chỉ một cách đúng

| Cách | Đánh giá |
|---|---|
| Copy `dim_thoi_gian` thành ba bảng vật lý | **Sai.** Ba bản dữ liệu phải đồng bộ; sửa định nghĩa quý là sửa ba chỗ |
| Để nguyên, mỗi query tự alias | **Sai.** Đẩy việc đặt tên sang người đọc; BI tool không làm được |
| **View có tên rõ nghĩa trên cùng một bảng** | Đúng |

## Ví dụ xuyên suốt

Chạy được trên DuckDB.

### Bước 1 — dimension gốc, một bảng duy nhất

```sql
CREATE TABLE dim_thoi_gian AS
SELECT
  CAST(strftime(d, '%Y%m%d') AS INTEGER) AS ngay_sk,
  d                                      AS ngay,
  year(d)                                AS nam,
  quarter(d)                             AS quy,
  month(d)                               AS thang,
  dayofweek(d) IN (0, 6)                 AS la_cuoi_tuan
FROM range(DATE '2026-01-01', DATE '2027-01-01', INTERVAL 1 DAY) AS t(d);
```

### Bước 2 — mỗi vai một view

```sql
CREATE VIEW dim_ngay_dat AS
SELECT ngay_sk AS ngay_dat_sk, ngay AS ngay_dat, nam AS nam_dat,
       quy AS quy_dat, thang AS thang_dat, la_cuoi_tuan AS dat_cuoi_tuan
FROM dim_thoi_gian;

CREATE VIEW dim_ngay_giao AS
SELECT ngay_sk AS ngay_giao_sk, ngay AS ngay_giao, nam AS nam_giao,
       quy AS quy_giao, thang AS thang_giao, la_cuoi_tuan AS giao_cuoi_tuan
FROM dim_thoi_gian;
```

**Đổi tên cột trong view là phần quan trọng nhất**, không phải chuyện thẩm mỹ. Nhờ nó
mà `SELECT *` không đụng tên trùng, và người đọc query thấy `quy_dat` là hiểu ngay —
không phải lần ngược lên xem `d1` là gì.

Trong dbt, mỗi view là một model `materialized: view` trỏ về `ref('dim_thoi_gian')`.

### Bước 3 — query đọc được không cần chú thích

```sql
SELECT dd.quy_dat, dg.thang_giao, count(*) AS so_don
FROM fct_don_hang f
JOIN dim_ngay_dat  dd USING (ngay_dat_sk)
JOIN dim_ngay_giao dg USING (ngay_giao_sk)
GROUP BY dd.quy_dat, dg.thang_giao
ORDER BY dd.quy_dat;
```

```text
┌─────────┬────────────┬────────┐
│ quy_dat │ thang_giao │ so_don │
├─────────┼────────────┼────────┤
│       1 │          1 │      1 │
│       1 │          3 │      2 │
│       2 │          4 │      1 │
└─────────┴────────────┴────────┘
```

Đọc được ngay: quý 1 đặt nhưng có 2 đơn mãi tháng 3 mới giao. Cùng kết quả với bản dùng
alias `d1`/`d2`, nhưng câu này **tự giải thích**.

So với bản dùng alias `d1`/`d2`: cùng một kết quả, nhưng câu này **tự giải thích**.

### Trước và sau

| | Alias trong query | Role-playing view |
|---|---|---|
| Số bảng dữ liệu | 1 | 1 — view không tốn chỗ |
| Người đọc query hiểu ngay | không | có |
| BI tool kéo thả được | khó | được |
| Sửa định nghĩa quý | một chỗ | một chỗ |

## Khi nào KHÔNG cần

Fact chỉ tham chiếu dimension **một lần** thì không có vai nào để phân biệt — dựng view
chỉ thêm một lớp gián tiếp vô ích.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Copy dimension thành nhiều bảng vật lý | Ba bản phải đồng bộ; sớm muộn lệch nhau |
| Tạo view nhưng **không** đổi tên cột | `SELECT *` đụng tên trùng, và vẫn không biết cột nào của vai nào |
| Đặt tên view theo bảng (`dim_thoi_gian_2`) | Không giải quyết gì — tên vẫn không mang nghĩa |
| Quên `dim_ngay_giao` cho đơn **chưa giao** | Join mất dòng; cần dòng "chưa xác định" trong dimension hoặc `LEFT JOIN` có chủ ý |

Dòng cuối là bẫy thật: đơn chưa giao có `ngay_giao_sk` null. `JOIN` thường sẽ **loại
sạch** các đơn đang xử lý khỏi báo cáo, và không có lỗi nào báo.

## Related Topics

- [Fact và Dimension](../reference/fact-and-dimension.md) — vì sao cần `dim_thoi_gian` thay vì cột ngày
- [Conformed dimension](conformed-dimension.md) — dùng chung giữa nhiều **fact**, khác với nhiều **vai** trong một fact
- [Surrogate key](../reference/surrogate-key.md) — khoá mà các vai cùng trỏ về
- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — view vai vẫn là star, không thành snowflake
