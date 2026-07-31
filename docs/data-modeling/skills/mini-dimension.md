---
title: Mini-dimension
sidebar_position: 4
description: Tách vài cột đổi nhanh khỏi một dimension lớn, để Type 2 không làm cả bảng phình theo nhịp cột nhanh nhất.
tags: [mini-dimension, scd, dimension, data-modeling, kimball]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Mini-dimension

> **Chốt:** Một dimension lớn có vài cột đổi nhanh thì Type 2 làm **cả bảng** phình theo
> nhịp của cột nhanh nhất. Tách đúng mấy cột đó ra một bảng nhỏ chứa **mọi tổ hợp giá
> trị**, fact giữ hai khoá thay vì một.

## Mục tiêu

Xử lý mâu thuẫn: cần lịch sử cho vài thuộc tính, nhưng bật [SCD](scd.md) Type 2 cho cả
dimension thì số dòng nổ.

## Bài toán

`dim_khach_hang` có 5 triệu dòng. Trong đó:

| Cột | Nhịp đổi |
|---|---|
| `ho_ten`, `ngay_sinh`, `ngay_mo_tk` | gần như không đổi |
| `nhom_thu_nhap`, `nhom_tuoi` | **mỗi quý** |

Bật Type 2 cho cả bảng: mỗi quý sinh thêm ~5 triệu dòng. Sau ba năm là 60 triệu dòng
cho 5 triệu khách — và 90% dòng chỉ khác nhau ở hai cột.

## Cách làm

Tách hai cột hay đổi ra bảng riêng chứa **mọi tổ hợp có thể**, không phải mọi khách:

```text
dim_khach_hang        5.000.000 dòng, Type 1 — ổn định
dim_khach_hang_nhom          20 dòng, bất biến — 5 nhóm thu nhập × 4 nhóm tuổi
fct_don_hang                 khach_sk + khach_nhom_sk
```

Lịch sử **không** nằm ở dimension nữa mà nằm ở **fact**: mỗi dòng fact ghi lại khách
lúc đó thuộc nhóm nào. Đó là điểm đảo chiều so với Type 2 — và cũng là lý do kỹ thuật
này khó hiểu lần đầu.

## Ví dụ xuyên suốt

Chạy được trên DuckDB.

### Bước 1 — đo trước khi quyết

Con số ở đây chọn hộ bạn, không phải bước kiểm tra cho có:

```sql
SELECT
  count(*)                                        AS so_khach,
  count(DISTINCT nhom_thu_nhap || '|' || nhom_tuoi) AS so_to_hop,
  count(*) FILTER (WHERE nhom_thu_nhap IS NOT NULL) AS co_du_lieu
FROM dim_khach_hang_raw;
```

Với 6 khách mẫu:

```text
┌──────────┬───────────┬────────────┐
│ so_khach │ so_to_hop │ co_du_lieu │
├──────────┼───────────┼────────────┤
│        6 │         5 │          6 │
└──────────┴───────────┴────────────┘
```

Ở quy mô thật con số là *vài triệu khách / vài chục tổ hợp* — chênh lệch đó mới là thứ
làm mini-dimension đáng làm.

| Thấy gì | Làm gì |
|---|---|
| Số tổ hợp **rất nhỏ** so với số khách (vài chục vs vài triệu) | Mini-dimension đáng làm |
| Số tổ hợp xấp xỉ số khách | Không tách được — thuộc tính đó gần như là khoá |
| Cột đổi chậm như phần còn lại | Không cần mini-dimension, Type 2 bình thường |

### Bước 2 — dựng mini-dimension

Sinh mọi tổ hợp, **không** phụ thuộc dữ liệu khách hiện có — vì tổ hợp chưa xuất hiện
hôm nay vẫn có thể xuất hiện tháng sau:

```sql
CREATE TABLE dim_khach_hang_nhom AS
SELECT
  row_number() OVER (ORDER BY tn.nhom, tuoi.nhom) AS khach_nhom_sk,
  tn.nhom   AS nhom_thu_nhap,
  tuoi.nhom AS nhom_tuoi
FROM (VALUES ('Dưới 10tr'),('10-20tr'),('20-50tr'),('50-100tr'),('Trên 100tr')) AS tn(nhom)
CROSS JOIN (VALUES ('18-25'),('26-35'),('36-50'),('Trên 50')) AS tuoi(nhom);
```

Đây là chỗ **khác junk dimension**: junk dimension chỉ sinh tổ hợp *thật sự xuất hiện*;
mini-dimension sinh *toàn bộ tích Descartes* vì tập giá trị nhỏ và cố định.

### Bước 3 — fact giữ hai khoá

```sql
CREATE TABLE fct_don_hang AS
SELECT
  d.ma_don,
  d.ngay,
  k.khach_sk,           -- ai
  n.khach_nhom_sk,      -- lúc đó thuộc nhóm nào
  d.thanh_tien
FROM don_hang_raw d
JOIN dim_khach_hang k  ON d.ma_khach = k.ma_khach
JOIN dim_khach_hang_nhom n
  ON  d.nhom_thu_nhap_luc_dat = n.nhom_thu_nhap
  AND d.nhom_tuoi_luc_dat     = n.nhom_tuoi;
```

`nhom_..._luc_dat` phải lấy từ hệ nguồn **tại thời điểm phát sinh đơn**. Lấy giá trị
hiện tại là mất sạch lịch sử — và đó chính là lỗi mà mini-dimension sinh ra để tránh.

### Bước 4 — query kiểm chứng

Câu hỏi *as-was*: "doanh thu theo nhóm thu nhập **tại thời điểm mua**".

```sql
SELECT n.nhom_thu_nhap, sum(f.thanh_tien) AS doanh_thu
FROM fct_don_hang f
JOIN dim_khach_hang_nhom n USING (khach_nhom_sk)
GROUP BY n.nhom_thu_nhap
ORDER BY doanh_thu DESC;
```

```text
┌───────────────┬───────────┐
│ nhom_thu_nhap │ doanh_thu │
├───────────────┼───────────┤
│ 50-100tr      │   2000000 │
│ 20-50tr       │    800000 │
│ 10-20tr       │    450000 │
└───────────────┴───────────┘
```

Mini-dimension đầy đủ là **20 dòng** (5 nhóm thu nhập × 4 nhóm tuổi) dù dữ liệu mẫu chỉ
dùng 5 tổ hợp — đúng chủ ý sinh toàn bộ tích Descartes.

### Trước và sau

| | Type 2 cả bảng | Mini-dimension |
|---|---|---|
| Số dòng dimension sau 3 năm | ~60.000.000 | 5.000.000 + 20 |
| Trả lời câu hỏi *as-was* | được | được |
| Trả lời *"khách này giờ thuộc nhóm nào"* | được | **phải tra hệ nguồn** hoặc thêm cột Type 1 |
| Độ khó hiểu | thấp | cao — lịch sử nằm ở fact, không ở dim |

## Trade-offs

| Được | Mất |
|---|---|
| Dimension chính không phình | Fact có thêm một khoá, thêm một join |
| Tổ hợp cố định, không cần bảo trì | Không trả lời được "nhóm hiện tại" nếu không thêm cột |
| Lịch sử chính xác tới từng giao dịch | Người mới đọc mô hình không hiểu ngay vì sao có hai khoá khách |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Lấy `nhom_thu_nhap` **hiện tại** khi nạp fact | Mất toàn bộ lịch sử — đúng thứ mini-dimension sinh ra để giữ |
| Nhét cột cardinality cao vào mini-dimension | Tích Descartes nổ, mini-dimension to hơn dimension chính |
| Dùng mini-dimension khi cột đổi chậm | Thêm một join mà không đổi lấy gì — [SCD](scd.md) Type 2 là đủ |
| Bỏ luôn khoá `khach_sk`, chỉ giữ `khach_nhom_sk` | Không biết đơn của **ai** nữa |

## Related Topics

- [SCD](scd.md) — mini-dimension chính là Type 4 trong bảng phân loại đó
- [Junk dimension](junk-dimension.md) — cũng gộp cột nhỏ, nhưng chỉ sinh tổ hợp có thật
- [Fact và Dimension](../reference/fact-and-dimension.md) — vì sao thuộc tính đổi nhanh là dấu hiệu của fact
- [Grain](../reference/grain.md) — thêm khoá vào fact **không** đổi grain
