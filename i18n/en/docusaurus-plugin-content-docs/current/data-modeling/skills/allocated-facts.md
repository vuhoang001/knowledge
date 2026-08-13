---
title: Header/line và phân bổ fact
i18n_status: untranslated
sidebar_position: 17
description: "Số đo ở cấp đơn hàng nhân bản xuống dòng đơn thì SUM phồng theo số dòng; phân bổ theo tỷ trọng giữ tổng đúng và mở ra P&L theo sản phẩm."
tags: [allocated-facts, header-line, profit-and-loss, grain, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Header/line và phân bổ fact

> **Chốt:** đơn hàng có số đo ở **hai cấp** — phí ship thuộc cả đơn, tiền hàng thuộc từng
> dòng. Nhân bản số cấp trên xuống cấp dưới là bảo đảm `SUM` sai. Cách duy nhất giữ cả
> grain mịn lẫn tổng đúng là **phân bổ theo tỷ trọng**.

## Vấn đề

```sql
CREATE TABLE src_header AS
SELECT * FROM (VALUES ('DH-001', 100000), ('DH-002', 50000)) t(so_don, phi_ship);

CREATE TABLE src_line AS
SELECT * FROM (VALUES
  ('DH-001', 1, 'SP-A', 600000),
  ('DH-001', 2, 'SP-B', 300000),
  ('DH-001', 3, 'SP-C', 100000),
  ('DH-002', 1, 'SP-A', 500000)
) t(so_don, dong_so, san_pham, tien_hang);
```

Sự thật: **phí ship 150.000**, tiền hàng 1.500.000.

Ba cách dựng, và chỉ một cách đúng:

| Cách | Grain | Vấn đề |
|---|---|---|
| Hai fact riêng, join khi cần | Hai grain | Join hai fact khác grain → phồng, xem [case study](../case-studies/join-hai-fact-lam-phong-tong.md) |
| Một fact grain dòng, **nhân bản** header | Dòng đơn | `SUM(phi_ship)` phồng theo số dòng |
| Một fact grain dòng, **phân bổ** header | Dòng đơn | Cách Kimball khuyên |

### Cách nhân bản hỏng như thế nào

```sql
CREATE TABLE fct_sai AS
SELECT l.so_don, l.dong_so, l.san_pham, l.tien_hang, h.phi_ship
FROM src_line l JOIN src_header h USING (so_don);

SELECT sum(tien_hang) AS tien_hang, sum(phi_ship) AS phi_ship_bao_cao,
       sum(phi_ship) - (SELECT sum(phi_ship) FROM src_header) AS phong_them,
       round(100.0 * (sum(phi_ship) - (SELECT sum(phi_ship) FROM src_header))
             / (SELECT sum(phi_ship) FROM src_header), 1) AS phong_pct
FROM fct_sai;
```

```text
┌───────────┬──────────────────┬────────────┬───────────┐
│ tien_hang │ phi_ship_bao_cao │ phong_them │ phong_pct │
├───────────┼──────────────────┼────────────┼───────────┤
│   1500000 │           350000 │     200000 │     133.3 │
└───────────┴──────────────────┴────────────┴───────────┘
```

`tien_hang` đúng, `phi_ship` **phồng 133%**. Cùng một bảng, một cột đúng một cột sai —
đó là điều làm nó khó phát hiện: người kiểm thấy doanh thu khớp nên tin cả bảng.

Đơn `DH-001` có 3 dòng nên phí ship 100.000 được đếm ba lần.

## Cách làm — phân bổ theo tỷ trọng

```sql
CREATE TABLE fct_dung AS
SELECT l.so_don, l.dong_so, l.san_pham, l.tien_hang,
       round(h.phi_ship::DOUBLE * l.tien_hang
             / sum(l.tien_hang) OVER (PARTITION BY l.so_don), 0) AS phi_ship_phan_bo
FROM src_line l JOIN src_header h USING (so_don);
```

```text
┌─────────┬─────────┬──────────┬───────────┬──────────────────┐
│ so_don  │ dong_so │ san_pham │ tien_hang │ phi_ship_phan_bo │
├─────────┼─────────┼──────────┼───────────┼──────────────────┤
│ DH-001  │       1 │ SP-A     │    600000 │          60000.0 │
│ DH-001  │       2 │ SP-B     │    300000 │          30000.0 │
│ DH-001  │       3 │ SP-C     │    100000 │          10000.0 │
│ DH-002  │       1 │ SP-A     │    500000 │          50000.0 │
└─────────┴─────────┴──────────┴───────────┴──────────────────┘
```

```sql
SELECT sum(phi_ship_phan_bo) AS tong_phan_bo,
       (SELECT sum(phi_ship) FROM src_header) AS tong_that,
       sum(phi_ship_phan_bo) - (SELECT sum(phi_ship) FROM src_header) AS chenh_lam_tron
FROM fct_dung;
```

```text
┌──────────────┬───────────┬────────────────┐
│ tong_phan_bo │ tong_that │ chenh_lam_tron │
├──────────────┼───────────┼────────────────┤
│     150000.0 │    150000 │            0.0 │
└──────────────┴───────────┴────────────────┘
```

**Cộng theo chiều nào cũng đúng** — theo sản phẩm, theo tháng, theo khu vực. Số đo giờ
additive ở grain dòng đơn, đúng như [additivity](../reference/fact-and-dimension.md) đòi
hỏi.

Và câu hỏi trước đây không trả lời được, giờ trả lời được:

```sql
SELECT san_pham, sum(tien_hang) AS tien_hang, sum(phi_ship_phan_bo) AS phi_ship,
       round(100.0 * sum(phi_ship_phan_bo) / sum(tien_hang), 2) AS ty_le_phi_pct
FROM fct_dung GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌──────────┬───────────┬──────────┬───────────────┐
│ san_pham │ tien_hang │ phi_ship │ ty_le_phi_pct │
├──────────┼───────────┼──────────┼───────────────┤
│ SP-A     │   1100000 │ 110000.0 │          10.0 │
│ SP-B     │    300000 │  30000.0 │          10.0 │
│ SP-C     │    100000 │  10000.0 │          10.0 │
└──────────┴───────────┴──────────┴───────────────┘
```

### Chọn tiêu chí phân bổ

Tỷ trọng tiền hàng là mặc định, không phải luôn đúng. Tiêu chí phải phản ánh **cái gì
thật sự gây ra chi phí**:

| Số đo header | Tiêu chí hợp lý | Vì sao |
|---|---|---|
| Phí vận chuyển | Trọng lượng hoặc thể tích | Hãng vận chuyển tính theo cân, không theo tiền |
| Chiết khấu toàn đơn | Tiền hàng | Chiết khấu tính trên giá trị |
| Chi phí đóng gói | Số lượng món | Mỗi món một thao tác |
| Hoa hồng nhân viên | Tiền hàng | Đúng cách tính hoa hồng |

Chọn tiêu chí là **quyết định nghiệp vụ**, không phải kỹ thuật. Ghi lại lý do ngay cạnh
code — sáu tháng sau không ai nhớ vì sao chọn tiền hàng thay vì trọng lượng.

**Luật bất di:** dù chọn tiêu chí nào, `sum(phan_bo)` phải bằng tổng gốc. Sai số làm tròn
gom về dòng lớn nhất của mỗi đơn.

## P&L theo sản phẩm — phân bổ chồng phân bổ

Kimball xếp *profit and loss fact tables using allocations* thành mục riêng vì nó là ứng
dụng khó nhất của kỹ thuật này: **chi phí chung không thuộc về đơn hàng nào cả** (lương
văn phòng, thuê kho, marketing thương hiệu) mà vẫn phải xuất hiện trong lợi nhuận từng
sản phẩm.

```sql
CREATE TABLE chi_phi_chung AS SELECT 300000 AS chi_phi_van_hanh;
CREATE TABLE gia_von AS
SELECT * FROM (VALUES ('SP-A', 0.60), ('SP-B', 0.75), ('SP-C', 0.50)) t(san_pham, ty_le_gia_von);
```

```text
┌──────────┬───────────┬───────────────┬──────────┬───────────────────────┬───────────┐
│ san_pham │ doanh_thu │    gia_von    │ phi_ship │ chi_phi_chung_phan_bo │ loi_nhuan │
├──────────┼───────────┼───────────────┼──────────┼───────────────────────┼───────────┤
│ SP-A     │   1100000 │        660000 │ 110000.0 │              220000.0 │  110000.0 │
│ SP-C     │    100000 │         50000 │  10000.0 │               20000.0 │   20000.0 │
│ SP-B     │    300000 │        225000 │  30000.0 │               60000.0 │  -15000.0 │
└──────────┴───────────┴───────────────┴──────────┴───────────────────────┴───────────┘
```

**`SP-B` lỗ 15.000** dù doanh thu 300.000 — giá vốn 75% cộng chi phí chung đẩy nó xuống
âm. Đây chính là loại kết luận mà chỉ P&L có phân bổ mới đưa ra được, và nó thường làm
đảo lộn quyết định danh mục sản phẩm.

Đối soát bắt buộc — tổng lợi nhuận theo sản phẩm phải bằng lợi nhuận tính một cục:

```text
┌───────────┬───────────────┬──────────┬───────────────┬────────────────┐
│ doanh_thu │    gia_von    │ phi_ship │ chi_phi_chung │ loi_nhuan_tong │
├───────────┼───────────────┼──────────┼───────────────┼────────────────┤
│   1500000 │        935000 │ 150000.0 │        300000 │       115000.0 │
└───────────┴───────────────┴──────────┴───────────────┴────────────────┘
```

110.000 + 20.000 − 15.000 = **115.000**. Khớp.

**Cảnh báo Kimball nhấn mạnh:** con số lợi nhuận theo sản phẩm chỉ đáng tin **bằng đúng
tiêu chí phân bổ**. Đổi tiêu chí, `SP-B` có thể thành có lãi. Vì thế bảng P&L phân bổ
phải luôn đi kèm cột `chi_phi_chung_phan_bo` hiện rõ — để người đọc thấy phần nào là thực
tế đo được và phần nào là quy ước.

## Trade-offs

| Được | Mất |
|---|---|
| Một fact, một grain, cộng theo chiều nào cũng đúng | Phải chọn và bảo vệ tiêu chí phân bổ |
| P&L tới cấp sản phẩm | Con số phụ thuộc quy ước, dễ bị tranh cãi |
| Không phải join hai fact khác grain | Sai số làm tròn phải xử lý |
| Số header vẫn tra được (giữ bảng gốc) | Hai nơi lưu cùng một số đo |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Nhân bản số header xuống mọi dòng | `SUM` phồng theo số dòng — [case study](../case-studies/phi-ship-phong-133-phan-tram.md) |
| Phân bổ xong không đối soát tổng | Sai số làm tròn tích luỹ |
| Chia đều thay vì theo tỷ trọng | Dòng 10.000đ gánh phí bằng dòng 1 triệu |
| Không ghi lại lý do chọn tiêu chí | Sáu tháng sau không ai bảo vệ được con số |
| Trộn chi phí phân bổ với chi phí trực tiếp trong một cột | Không tách được phần đo được và phần quy ước |
| Coi P&L phân bổ là sự thật tuyệt đối | Quyết định cắt sản phẩm dựa trên một quy ước |

## Related Topics

- [Grain](../reference/grain.md) — vì sao không được trộn hai grain trong một bảng
- [Degenerate dimension](degenerate-dimension.md) — `so_don` là thứ nối header với line
- [Bridge table](bridge-table.md) — cùng cơ chế hệ số phân bổ cho quan hệ nhiều-nhiều
- [Fact và Dimension](../reference/fact-and-dimension.md) — additivity sau khi phân bổ
- [CS: phí ship phồng 133%](../case-studies/phi-ship-phong-133-phan-tram.md)
- [CS: join hai fact làm phồng tổng](../case-studies/join-hai-fact-lam-phong-tong.md)

## References

- Kimball Group — [Header/Line Fact Tables · Allocated Facts · Profit and Loss Fact Tables Using Allocations](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 6 và 7
