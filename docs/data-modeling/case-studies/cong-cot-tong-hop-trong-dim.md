---
title: Cột "tổng chi tiêu" trong dimension, cộng sau khi join fact — phồng gần 2 lần
sidebar_position: 21
description: "Số tổng hợp đặt làm thuộc tính dimension rất tiện để lọc, và phồng theo số dòng fact ngay khi có người cộng nó."
tags: [case-study, behavior-tag, dimension, additivity, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Cột "tổng chi tiêu" trong dimension, cộng sau khi join fact — phồng gần 2 lần

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** đưa số tổng hợp lên dimension để **lọc và nhóm** là kỹ thuật đúng. Nó thành
> bẫy ngay khi có người **cộng** nó sau khi join fact — xem
> [đưa hành vi vào dimension](../skills/behavior-dimension.md).

## Bối cảnh

Marketing cần lọc *"khách có tổng chi tiêu trên 5.000"* trong mọi báo cáo. Viết subquery
gộp fact mỗi lần thì chậm và ai cũng viết một kiểu, nên đội dữ liệu đưa sẵn lên dimension.

```sql
CREATE TABLE fct_ban AS
SELECT * FROM (VALUES
  ('C1', DATE '2026-01-10',  2000), ('C1', DATE '2026-03-15',  6000),
  ('C2', DATE '2026-02-01',   300),
  ('C3', DATE '2026-01-20', 50000), ('C3', DATE '2026-05-11', 30000),
  ('C4', DATE '2026-06-01',   900)
) t(khach_id, ngay, doanh_thu);

CREATE TABLE dim_khach AS
SELECT khach_id, sum(doanh_thu) AS tong_chi_tieu, count(*) AS so_lan_mua,
       max(ngay) AS lan_mua_gan_nhat
FROM fct_ban GROUP BY 1;
```

```text
┌──────────┬───────────────┬────────────┬──────────────────┐
│ khach_id │ tong_chi_tieu │ so_lan_mua │ lan_mua_gan_nhat │
├──────────┼───────────────┼────────────┼──────────────────┤
│ C1       │          8000 │          2 │ 2026-03-15       │
│ C2       │           300 │          1 │ 2026-02-01       │
│ C3       │         80000 │          2 │ 2026-05-11       │
│ C4       │           900 │          1 │ 2026-06-01       │
└──────────┴───────────────┴────────────┴──────────────────┘
```

Sự thật: **89.200**. Và cột trong dimension cộng lại cũng ra đúng con số đó:

```text
┌───────────────┬───────────────────┐
│ sum_trong_dim │ tong_that_tu_fact │
├───────────────┼───────────────────┤
│         89200 │             89200 │
└───────────────┴───────────────────┘
```

Cột này **đúng**. Đó là điều làm bước sau khó ngờ.

## Triệu chứng

Một phân tích viên dựng báo cáo *"doanh thu theo phân khúc khách"*. Họ cần cả doanh thu
lẫn thuộc tính khách, nên join fact với dim — và cộng cột trong dim vì nó có sẵn tên
"tổng chi tiêu".

```sql
SELECT sum(d.tong_chi_tieu) AS sum_sau_khi_join_fact,
       (SELECT sum(doanh_thu) FROM fct_ban) AS tong_that,
       round(1.0 * sum(d.tong_chi_tieu)
             / (SELECT sum(doanh_thu) FROM fct_ban), 2) AS phong_may_lan
FROM fct_ban f JOIN dim_khach d USING (khach_id);
```

```text
┌───────────────────────┬───────────┬───────────────┐
│ sum_sau_khi_join_fact │ tong_that │ phong_may_lan │
├───────────────────────┼───────────┼───────────────┤
│                177200 │     89200 │          1.99 │
└───────────────────────┴───────────┴───────────────┘
```

**Phồng gần 2 lần.** Hệ số phồng bằng **số lần mua trung bình** của tập khách trong báo
cáo — nên nó khác nhau ở mỗi bộ lọc, mỗi khoảng thời gian. Không có tỷ lệ cố định để nhận
ra.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| `dim_khach` có khách trùng | `count(*)` = `count(DISTINCT khach_id)` = 4 |
| Fact bị nạp trùng | Đối chiếu nguồn: 6 dòng, đúng |
| Join sai điều kiện | `USING (khach_id)` — đúng khoá |
| Cột trong dim tính sai | Cộng riêng trong dim ra **đúng** 89.200 |

Giả thuyết cuối là chỗ làm mọi người bối rối nhất: **cột đúng, join đúng, fact đúng** —
mà kết quả sai.

Câu hỏi rẽ hướng: *"sau khi join, mỗi khách xuất hiện mấy dòng?"*

## Nguyên nhân thật

`tong_chi_tieu` là **thuộc tính của một khách**, grain của nó là *một khách*. Sau khi
join với fact, grain của kết quả là *một giao dịch* — khách `C1` có 2 giao dịch nên
`8000` xuất hiện 2 lần, `C3` cũng vậy.

177.200 = 8.000×2 + 300×1 + 80.000×2 + 900×1.

Đây là fan-out kinh điển, cùng cơ chế với
[dim đơn hàng phồng doanh thu](dim-don-hang-lam-phong-doanh-thu.md), nhưng ngược chiều:
ở đó **dimension** nhân bản dòng fact; ở đây **fact** nhân bản giá trị của dimension.

Điểm chung của cả hai: một giá trị ở grain thô bị cộng ở grain mịn.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `unique` trên `dim_khach.khach_id` | ✅ xanh |
| `sum(tong_chi_tieu)` trong dim = `sum(doanh_thu)` trong fact | ✅ xanh — **và đây là test đúng!** |
| `relationships` fact → dim | ✅ xanh |
| `not_null` mọi cột | ✅ xanh |
| Grain của fact | ✅ xanh |

Dòng thứ hai là điều đáng nhớ nhất của ca này: **test bất biến đúng vẫn xanh**, vì bất
biến đó chỉ đúng khi cộng *trong dimension*. Không có test nào kiểm được người dùng cộng
nó **ở đâu**.

Đây là loại lỗi phải chặn bằng **thiết kế và đặt tên**, không phải bằng test.

## Cách sửa

### Sửa 1 — đặt tên tự tố cáo

```sql
CREATE TABLE dim_khach AS
SELECT khach_id,
       sum(doanh_thu) AS attr_tong_chi_tieu,     -- tien to attr_: chi de loc/nhom
       count(*)       AS attr_so_lan_mua,
       max(ngay)      AS attr_lan_mua_gan_nhat
FROM fct_ban GROUP BY 1;
```

Tiền tố `attr_` (hoặc hậu tố `_khong_cong`) là hàng rào rẻ nhất: người kéo cột vào ô tổng
sẽ khựng lại một giây — đủ để hỏi.

### Sửa 2 — dùng đúng mục đích: lọc, không cộng

```sql
-- DUNG: loc theo thuoc tinh, cong cot cua FACT
SELECT sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_khach d USING (khach_id)
WHERE d.attr_tong_chi_tieu > 5000;

-- DUNG: cong cot cua DIM, khong join fact
SELECT count(*) AS so_khach, sum(attr_tong_chi_tieu) AS tong
FROM dim_khach WHERE attr_tong_chi_tieu > 5000;
```

Luật một câu: **join fact rồi thì chỉ cộng cột của fact.**

### Sửa 3 — ghi vào mô tả cột

Trong dbt, `schema.yml` là chỗ để câu này sống cùng code:

```yaml
- name: attr_tong_chi_tieu
  description: >
    Tong chi tieu tich luy cua khach. CHI dung de LOC va NHOM.
    KHONG duoc SUM sau khi join voi fact — se phong theo so giao dich.
```

| | Trước | Sau |
|---|---|---|
| Tổng trên báo cáo | 177.200 (**phồng 1,99 lần**) | 89.200 |
| Tên cột | `tong_chi_tieu` | `attr_tong_chi_tieu` |
| Cảnh báo cho người dùng | Không có | Tên cột + mô tả |

## Một bẫy đi kèm

`attr_tong_chi_tieu` **đổi mỗi ngày**. Bật [SCD](../skills/scd.md) Type 2 cho nó là con
đường thẳng tới [dimension phồng 365 lần](dimension-phinh-365-lan.md).

Dùng Type 1 (ghi đè), hoặc tách sang [mini-dimension](../skills/mini-dimension.md) nếu
thật sự cần as-was.

## Dấu hiệu nhận ra sớm

1. Tìm cột trong dimension có tên mang nghĩa tổng hợp:

```bash
grep -rn "sum(\|count(\|max(\|avg(" models/marts/dim_*.sql
```

Mỗi kết quả là một cột cần đặt tên và mô tả cẩn thận.

2. **Bất biến hai chiều** — chạy cả hai, chúng phải khác nhau:

```sql
SELECT (SELECT sum(attr_tong_chi_tieu) FROM dim_khach) AS cong_trong_dim,
       (SELECT sum(d.attr_tong_chi_tieu) FROM fct_ban f
        JOIN dim_khach d USING (khach_id))            AS cong_sau_join;
```

Biết trước hai số này khác nhau là biết trước cái bẫy.

3. Trên dashboard, có ô nào cộng một cột đến từ bảng dimension không.

## Related Topics

- [Đưa hành vi vào dimension](../skills/behavior-dimension.md) — kỹ thuật bị dùng sai ở đây
- [Grain](../reference/grain.md) — join làm grain kết quả đổi
- [Mini-dimension](../skills/mini-dimension.md) — chỗ đúng cho thuộc tính đổi nhanh
- [CS: dim đơn hàng làm phồng doanh thu](dim-don-hang-lam-phong-doanh-thu.md) — fan-out chiều ngược lại
- [CS: dimension phồng 365 lần](dimension-phinh-365-lan.md) — bẫy Type 2 đi kèm
