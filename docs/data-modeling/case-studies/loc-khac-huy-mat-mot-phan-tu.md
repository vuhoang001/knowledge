---
title: Lọc "khác huỷ" làm mất một phần tư doanh thu
sidebar_position: 15
description: "WHERE trang_thai <> 'huy' loại luôn các dòng NULL, vì logic ba trị coi 'không biết' khác 'đúng'."
tags: [case-study, null-handling, filter, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Lọc "khác huỷ" làm mất một phần tư doanh thu

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** `NULL <> 'huy'` không trả về `TRUE`, nó trả về `UNKNOWN` — và `WHERE` chỉ
> giữ `TRUE`. Xem [NULL trong fact và dimension](../skills/null-handling.md).

## Bối cảnh

Năm đơn hàng. Một đơn (`D4`) mới tạo, chưa qua bước duyệt nên `trang_thai` còn trống.

```sql
CREATE TABLE fct_don AS
SELECT * FROM (VALUES
  ('D1', 'hoan_thanh', 200, 50),
  ('D2', 'hoan_thanh', 300, 0),
  ('D3', 'huy',        200, NULL),
  ('D4', NULL,         200, NULL),
  ('D5', 'hoan_thanh', 100, NULL)
) t(so_don, trang_thai, doanh_thu, giam_gia);
```

Sự thật: **5 đơn, 1.000 doanh thu**. Trong đó đúng 1 đơn bị huỷ (200), nên doanh thu
"không bị huỷ" phải là **800**.

## Triệu chứng

Dashboard doanh thu ghi **600**. Báo cáo của kế toán ghi 800.

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

Ba dòng thay vì bốn. Hụt **25%**, và độ hụt thay đổi mỗi ngày theo số đơn đang chờ duyệt
— nên không ai tìm ra quy luật.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Có đơn bị huỷ mà kế toán chưa cập nhật | Đối chiếu: đúng 1 đơn huỷ ở cả hai bên |
| Dashboard lọc thêm điều kiện ngày | Bỏ hết bộ lọc khác, vẫn 600 |
| ETL chưa nạp đủ | `count(*) FROM fct_don` = 5, đủ |
| Có đơn trùng bị dedupe nhầm | Không có đơn trùng |

Chỗ mất thời gian: cả buổi soi **dữ liệu**, trong khi lỗi nằm ở **câu lọc**. Ai đọc
`WHERE trang_thai <> 'huy'` cũng gật đầu — nó đọc y hệt câu tiếng Việt "trạng thái khác
huỷ".

Câu hỏi rẽ hướng: *"cộng doanh thu của mọi nhóm trạng thái lại có ra 1.000 không?"*

## Nguyên nhân thật

SQL dùng **logic ba trị**: `TRUE`, `FALSE`, `UNKNOWN`.

`NULL <> 'huy'` không phải `TRUE` mà là `UNKNOWN` — vì không biết trạng thái là gì thì
không khẳng định được nó khác `'huy'`. Mệnh đề `WHERE` chỉ giữ dòng cho `TRUE`, nên `D4`
bị loại cùng với `D3`.

Điều này **không phải lỗi của SQL** — nó nhất quán với logic. Nó chỉ không khớp với cách
người đọc câu lệnh đó hiểu.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` trên `doanh_thu` | ✅ xanh |
| `not_null` trên `trang_thai` | ❌ — nhưng **không ai đặt**, vì trống là hợp lệ |
| `accepted_values` cho `trang_thai` | ✅ xanh (bỏ qua `NULL` mặc định) |
| Tổng `fct_don` khớp nguồn | ✅ xanh |
| Số dòng khớp nguồn | ✅ xanh |

Dòng thứ ba đáng nhớ: `accepted_values` của dbt **bỏ qua `NULL`** trừ khi cấu hình khác.
Nên ngay cả test danh sách giá trị cũng không thấy vấn đề.

Bảng nguồn hoàn toàn đúng. Lỗi sinh ra ở lớp báo cáo, nơi test dữ liệu không với tới.

## Cách sửa

### Sửa ngay — nói rõ NULL đi đâu

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

### Sửa gốc — nhóm rồi nhìn, đừng lọc rồi tin

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

600 + 200 + 200 = 1.000. Nhóm `(chua xac dinh)` **hiện ra** thay vì biến mất, và người
xem tự quyết định nó thuộc về đâu.

### Sửa tận gốc — đừng để NULL vào dimension

Trạng thái chưa xác định nên là **một giá trị** (`'cho_duyet'`), không phải `NULL`. Xem
[thiết kế thuộc tính dimension](../skills/dimension-attribute-design.md).

| | Trước | Sau |
|---|---|---|
| Doanh thu báo cáo | 600 (**hụt 25%**) | 800 |
| Đơn chờ duyệt | Biến mất | Hiện thành một nhóm |
| Phát hiện lệch bằng | Kế toán đối chiếu | Tổng các nhóm khớp tổng bảng |

## Dấu hiệu nhận ra sớm

1. **Bất biến quan trọng nhất:** tổng của mọi nhóm phải bằng tổng của bảng.

```sql
SELECT (SELECT sum(doanh_thu) FROM fct_don) AS tong_bang,
       (SELECT sum(doanh_thu) FROM fct_don WHERE trang_thai <> 'huy')
     + (SELECT sum(doanh_thu) FROM fct_don WHERE trang_thai = 'huy') AS tong_cac_nhom;
```

Hai số khác nhau = có dòng đang rơi ra ngoài mọi nhóm.

2. Grep tìm bộ lọc phủ định trên cột cho phép `NULL`:

```bash
grep -rn "<>\|!=\|NOT IN" models/marts/ | head
```

3. Đếm `NULL` ở mọi cột dùng để lọc — đặt thành test `severity: warn` với ngưỡng.

## Related Topics

- [NULL trong fact và dimension](../skills/null-handling.md) — bốn bẫy của logic ba trị
- [Thiết kế thuộc tính dimension](../skills/dimension-attribute-design.md) — nhãn thay cho `NULL`
- [Six dimensions of data quality](../../data-quality/six-dimensions.md) — completeness
- [CS: một nửa số đơn biến mất](don-dang-giao-bien-mat.md) — cùng họ: dòng mất âm thầm
