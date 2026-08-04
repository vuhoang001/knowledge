---
title: Degenerate dimension
sidebar_position: 8
description: "Số đơn hàng, số hoá đơn, mã vận đơn — khoá nghiệp vụ không có thuộc tính nào đi kèm thì ở lại trong fact, không dựng bảng dimension."
tags: [degenerate-dimension, fact, grain, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Degenerate dimension

> **Chốt:** khi tách hết thuộc tính của một khoá nghiệp vụ ra các dimension khác mà
> **không còn gì ngoài chính con số đó**, thì nó ở lại trong fact như một cột bình thường.
> Dựng bảng dimension cho nó là tạo một bảng có cùng grain với fact — tức là một fact thứ
> hai đội lốt dimension.

## Vấn đề

`fct_ban` có cột `so_don = 'DH-001'`. Phản xạ Kimball: *"mọi khoá trong fact phải trỏ tới
một dimension"*. Nên dựng `dim_don_hang`.

Nhưng thử liệt kê xem `dim_don_hang` có gì:

| Thuộc tính của đơn hàng | Đã ở đâu |
|---|---|
| Ngày đặt | `dim_ngay` |
| Khách hàng | `dim_khach_hang` |
| Kênh bán | `dim_kenh` (hoặc [junk dimension](junk-dimension.md)) |
| Trạng thái | `dim_trang_thai` / junk dimension |
| Nhân viên bán | `dim_nhan_vien` |
| **Số đơn** | **… chính nó** |

Bảng còn lại chỉ có `don_sk` và `so_don`. Đó là **degenerate dimension** — dimension đã
bị "rút cạn": khoá vẫn còn giá trị phân tích, nhưng không còn thuộc tính nào để mô tả.

Kimball ký hiệu là `DD` trong sơ đồ. Cách xử lý: **để nguyên trong fact**, không có bảng
dimension, không có surrogate key.

## Vì sao dựng bảng cho nó là sai

Điểm quyết định nằm ở [grain](../reference/grain.md): grain của `dim_don_hang` là *một
đơn hàng* — đúng bằng (hoặc gần bằng) grain của fact. Một dimension đúng nghĩa phải **thô
hơn** fact: 100 nghìn khách cho 50 triệu dòng bán hàng.

```sql
CREATE TABLE fct_lon     AS SELECT i AS so_don, 100 AS doanh_thu FROM range(1, 5000001) t(i);
CREATE TABLE dim_don_lon AS SELECT i AS don_sk, i AS so_don      FROM range(1, 5000001) t(i);

SELECT (SELECT count(*) FROM fct_lon)     AS dong_fact,
       (SELECT count(*) FROM dim_don_lon) AS dong_dim,
       round(1.0 * (SELECT count(*) FROM dim_don_lon)
                 / (SELECT count(*) FROM fct_lon), 2) AS ty_le;
```

```text
┌───────────┬──────────┬────────┐
│ dong_fact │ dong_dim │ ty_le  │
├───────────┼──────────┼────────┤
│   5000000 │  5000000 │    1.0 │
└───────────┴──────────┴────────┘
```

Tỷ lệ **1.0**. Bảng dimension này không nén gì, không mô tả gì, chỉ thêm một join vào mọi
query. Bất kỳ dimension nào có tỷ lệ tiến về 1 đều đáng nghi.

## Ví dụ xuyên suốt — chỗ nó chuyển từ thừa sang sai

Bảng thừa thì chỉ tốn chỗ. Nó thành **sai số** khi có người thấy `dim_don_hang` trống
trải quá và nhét trạng thái đơn vào, rồi bật [SCD](scd.md) Type 2 để giữ lịch sử trạng
thái — nghe rất hợp lý.

### Bước 1 — mô hình sau khi "hoàn thiện"

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

Dimension giờ **nhiều dòng hơn fact**. Đây là dấu hiệu nhìn thấy được bằng mắt.

### Bước 2 — báo cáo đầu tiên đã sai

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

Doanh thu thật là **1.000**. Báo cáo ra **1.400** — phồng 40%, vì `DH-001` có ba phiên
bản trạng thái nên được đếm ba lần.

Nhìn qua bảng phân tích thì càng khó ngờ, vì mỗi dòng đều trông hợp lý:

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

Ba dòng, số nào cũng "có vẻ đúng", tổng lại thành 1.400. Không có đơn nào đang ở trạng
thái `moi` với doanh thu 600 cả — 600 là tổng của những đơn **từng đi qua** trạng thái
`moi`. Hai câu hỏi khác nhau, không ai phân biệt trên dashboard.

### Bước 3 — sửa: degenerate + dimension trạng thái riêng

```sql
CREATE TABLE dim_trang_thai AS
SELECT * FROM (VALUES (1,'moi'),(2,'dang_giao'),(3,'hoan_thanh')) t(trang_thai_sk, trang_thai);

CREATE TABLE fct_ban_dung AS
SELECT * FROM (VALUES
  ('DH-001', 3, 100), ('DH-002', 2, 200), ('DH-003', 1, 300), ('DH-004', 3, 400)
) t(so_don, trang_thai_sk, doanh_thu);
```

`so_don` ở lại fact như một cột thường — đó là degenerate dimension. Trạng thái thành
dimension thật (vài dòng, dùng lại được, có nhãn tiếng Việt).

```sql
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

```sql
SELECT sum(doanh_thu) AS tong, count(DISTINCT so_don) AS so_don FROM fct_ban_dung;
```

```text
┌────────┬────────┐
│  tong  │ so_don │
├────────┼────────┤
│   1000 │      4 │
└────────┴────────┘
```

### Trước và sau

| | Có `dim_don_hang` Type 2 | Degenerate |
|---|---|---|
| Doanh thu báo cáo | 1.400 | **1.000** |
| Số bảng phải join | 2 | 2 (nhưng dim chỉ 3 dòng) |
| Dòng dimension | 7 và tăng theo mỗi lần đổi trạng thái | 3, bất biến |
| Đếm số đơn | `count(DISTINCT so_don)` — dễ quên `DISTINCT` | `count(*)` |

**Còn lịch sử trạng thái thì để đâu?** Đó là một quy trình có các mốc — thuộc về
**accumulating snapshot**, xem [Fact và Dimension](../reference/fact-and-dimension.md) và
[bài lab](../tutorials/star-schema-duckdb.md) bước 5. Lịch sử của một quy trình là fact,
không phải dimension.

## Nhận ra một degenerate dimension

Ba câu hỏi, cả ba đều "có" thì nó là degenerate:

1. Cột này có phải **khoá nghiệp vụ** người ta thật sự dùng để tra cứu không? (`so_don`
   có; `id` tự tăng nội bộ thì không — cái đó chỉ là khoá kỹ thuật)
2. Tách hết thuộc tính sang các dimension khác rồi thì **còn lại gì ngoài chính nó**?
3. Số giá trị phân biệt của nó có xấp xỉ số dòng fact không?

Ứng viên hay gặp: số đơn hàng, số hoá đơn, mã vận đơn, số phiếu khám, mã giao dịch, số
hợp đồng, mã lô hàng.

## Nó dùng để làm gì trong fact

Degenerate dimension không phải cột chết. Nó là thứ:

- **Gom nhóm dòng cùng một giao dịch**: `count(DISTINCT so_don)` cho ra số đơn khi grain
  là dòng đơn — chỉ số "giỏ hàng trung bình" sống nhờ nó.
- **Truy ngược về hệ nguồn** khi có người cãi số.
- **Nối header với line** — xem mục dưới.

```sql
-- gia tri gio hang trung binh, grain fact la mot DONG don
SELECT round(sum(thanh_tien) * 1.0 / count(DISTINCT so_don), 0) AS gio_hang_tb
FROM fct_ban_chi_tiet;
```

## Header/line — nơi degenerate dimension hay xuất hiện

Đơn hàng có phần đầu (header: ngày, khách, phí ship) và các dòng (line: sản phẩm, số
lượng). Ba cách dựng:

| Cách | Mô tả | Vấn đề |
|---|---|---|
| Hai fact riêng | `fct_don_header` + `fct_don_line` | Join hai fact khác grain → phồng, xem [case study](../case-studies/join-hai-fact-lam-phong-tong.md) |
| Một fact grain line, header nhân bản | Phí ship lặp ở mọi dòng | `sum(phi_ship)` sai gấp số dòng |
| **Một fact grain line, header phân bổ** | Phí ship chia theo tỷ trọng tiền hàng | Cách Kimball khuyên |

Ở cả ba, `so_don` là degenerate dimension nối các dòng lại. Cách 3 dùng đúng kỹ thuật hệ
số phân bổ ở [bridge table](bridge-table.md):

```sql
SELECT so_don, dong_so, thanh_tien,
       round(phi_ship * thanh_tien / sum(thanh_tien) OVER (PARTITION BY so_don), 0)
         AS phi_ship_phan_bo
FROM fct_don_line;
```

Sau khi phân bổ, `sum(phi_ship_phan_bo)` trên toàn bảng bằng đúng tổng phí ship thật —
cộng theo chiều nào cũng đúng.

## Trade-offs

| Được | Mất |
|---|---|
| Không thêm bảng, không thêm join | Cột `VARCHAR` dài nằm trong bảng lớn nhất |
| Grain của fact giữ nguyên, không phồng | Không nén được như surrogate key `INT` |
| Truy ngược hệ nguồn dễ | Không có chỗ treo thuộc tính nếu sau này phát sinh |

Về chi phí lưu trữ: `so_don` kiểu chuỗi trong 500 triệu dòng là đáng kể, nhưng format cột
(Parquet/Iceberg) nén dictionary rất tốt cho cột này. Đo trước khi tối ưu.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Dựng `dim_don_hang` rồi nhét trạng thái + Type 2 | Fan-out, doanh thu phồng 40% — [case study](../case-studies/dim-don-hang-lam-phong-doanh-thu.md) |
| Bỏ hẳn `so_don` khỏi fact "cho gọn" | Mất khả năng đếm số đơn và truy ngược hệ nguồn |
| Đếm đơn bằng `count(*)` khi grain là dòng đơn | Số đơn = số dòng, phồng theo số mặt hàng |
| Coi mọi khoá trong fact đều phải có dimension | Đẻ ra bảng có grain bằng fact |
| Nhét phí ship của header vào mọi dòng rồi `SUM` | Phí ship nhân lên bằng số dòng đơn |

## Related Topics

- [Grain](../reference/grain.md) — phép thử "dimension có thô hơn fact không"
- [Junk dimension](junk-dimension.md) — chỗ đúng cho các cờ cardinality thấp bị bỏ lại
- [Fact và Dimension](../reference/fact-and-dimension.md) — accumulating snapshot cho lịch sử quy trình
- [Bridge table](bridge-table.md) — hệ số phân bổ cho header/line
- [CS: dim đơn hàng làm phồng doanh thu 40%](../case-studies/dim-don-hang-lam-phong-doanh-thu.md)
- [Lab dựng star schema](../tutorials/star-schema-duckdb.md) — bước 3 giữ `so_don` trong fact

## References

- Kimball Group — [Degenerate Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 3 và 6
