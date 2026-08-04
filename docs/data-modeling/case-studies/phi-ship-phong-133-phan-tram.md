---
title: Phí ship phồng 133% — một cột đúng, một cột sai, cùng một bảng
sidebar_position: 18
description: "Số đo ở cấp đơn hàng bị nhân bản xuống từng dòng đơn; tiền hàng vẫn khớp nên không ai nghi cả bảng."
tags: [case-study, allocated-facts, header-line, grain, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Phí ship phồng 133% — một cột đúng, một cột sai, cùng một bảng

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** đơn hàng có số đo ở hai cấp. Kéo số cấp đơn xuống từng dòng đơn là nhân nó
> lên bằng số dòng — xem [header/line và phân bổ fact](../skills/allocated-facts.md).

## Bối cảnh

Grain của `fct_ban` là **một dòng đơn hàng** — quyết định đúng, mịn nhất mà nguồn cho
phép. Nhưng phí ship nằm ở **cấp đơn**, không ở cấp dòng.

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

Sự thật: phí ship **150.000**, tiền hàng 1.500.000.

Cách nạp: join header vào line để "có đủ thông tin trong một bảng".

```sql
CREATE TABLE fct_sai AS
SELECT l.so_don, l.dong_so, l.san_pham, l.tien_hang, h.phi_ship
FROM src_line l JOIN src_header h USING (so_don);
```

## Triệu chứng

Báo cáo chi phí vận chuyển tháng ghi **350.000**; hoá đơn của hãng vận chuyển ghi 150.000.

```sql
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

Điểm làm ca này khó chịu: **`tien_hang` hoàn toàn đúng** (1.500.000, khớp nguồn). Một cột
đúng, một cột sai, trong cùng một bảng, cùng một `SELECT`.

Người kiểm mở bảng, thấy doanh thu khớp, kết luận bảng ổn.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Hãng vận chuyển tính thiếu | Đối chiếu vận đơn: hãng đúng |
| Có đơn ship nhiều lần | Kiểm: mỗi đơn một lần giao |
| Có phụ phí chưa vào hoá đơn | Không có phụ phí nào |
| ETL nạp trùng | `count(*)` = 4 dòng, đúng bằng số dòng đơn |
| Sai ở bảng header | `sum(phi_ship)` trên header = 150.000, đúng |

Chỗ mất thời gian: giả thuyết "ETL nạp trùng" bị loại quá sớm, vì **số dòng đúng**. Không
có dòng nào thừa — chỉ có một **giá trị** bị lặp qua nhiều dòng.

Câu hỏi rẽ hướng: *"phí ship là số đo của cái gì — của dòng đơn hay của đơn?"*

## Nguyên nhân thật

Grain của `fct_sai` là **một dòng đơn**. `phi_ship` là số đo ở grain **một đơn**.

Trộn hai grain vào một bảng nghĩa là số của grain thô bị lặp lại ở mọi dòng của grain
mịn. `DH-001` có 3 dòng → phí ship 100.000 được đếm ba lần.

350.000 = 100.000 × 3 + 50.000 × 1.

Đây là biến thể của cùng một bệnh với
[join hai fact làm phồng tổng](join-hai-fact-lam-phong-tong.md) — chỉ khác là ở đây việc
trộn grain xảy ra **lúc nạp**, nên không ai thấy câu join nguy hiểm trong lớp báo cáo.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `unique_combination_of_columns [so_don, dong_so]` | ✅ xanh — grain **đúng** |
| `not_null` trên mọi cột | ✅ xanh |
| `sum(tien_hang)` khớp nguồn | ✅ xanh |
| `relationships` sang `dim_san_pham` | ✅ xanh |
| `sum(phi_ship)` khớp `src_header` | ❌ — **không ai viết** |

Dòng đầu là cái bẫy: test grain **xanh**, vì grain của bảng thật sự là `(so_don, dong_so)`
và nó duy nhất. Grain đúng không bảo đảm **mọi cột đều thuộc grain đó**.

Đây là loại lỗi cần một test cho **từng cột số đo đến từ cấp cao hơn**, không phải một
test cho cả bảng.

## Cách sửa — phân bổ theo tỷ trọng

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

```text
┌──────────────┬───────────┬────────────────┐
│ tong_phan_bo │ tong_that │ chenh_lam_tron │
├──────────────┼───────────┼────────────────┤
│     150000.0 │    150000 │            0.0 │
└──────────────┴───────────┴────────────────┘
```

**150.000, khớp hoá đơn.** Và giờ cộng theo chiều nào cũng đúng — kể cả chiều mà trước
đây không hỏi được:

```text
┌──────────┬───────────┬──────────┬───────────────┐
│ san_pham │ tien_hang │ phi_ship │ ty_le_phi_pct │
├──────────┼───────────┼──────────┼───────────────┤
│ SP-A     │   1100000 │ 110000.0 │          10.0 │
│ SP-B     │    300000 │  30000.0 │          10.0 │
│ SP-C     │    100000 │  10000.0 │          10.0 │
└──────────┴───────────┴──────────┴───────────────┘
```

| | Trước | Sau |
|---|---|---|
| Phí ship báo cáo | 350.000 (**phồng 133%**) | 150.000 |
| Đổi tên cột | `phi_ship` | `phi_ship_phan_bo` — tên nói rõ đây là số đã phân bổ |
| Phí ship theo sản phẩm | Không tính được | Tính được |

Đổi tên cột là phần dễ bỏ qua nhưng quan trọng: `phi_ship_phan_bo` cho người đọc biết đây
là con số **theo một quy ước**, không phải số đo trực tiếp.

## Dấu hiệu nhận ra sớm

1. **Bất biến cho mỗi cột đến từ cấp cao hơn** — đây là test phải có:

```sql
SELECT (SELECT sum(phi_ship_phan_bo) FROM fct_dung) AS trong_fact,
       (SELECT sum(phi_ship) FROM src_header)       AS trong_nguon;
```

2. Trong fact có cột nào **giống nhau ở mọi dòng cùng một đơn** không:

```sql
SELECT so_don, count(*) AS so_dong, count(DISTINCT phi_ship) AS so_gia_tri_phi_ship
FROM fct_sai GROUP BY 1 HAVING count(*) > 1;
```

`so_gia_tri_phi_ship = 1` với `so_dong > 1` là dấu hiệu của số đo cấp cao hơn đang bị lặp.

3. Hỏi cho từng cột số đo: *"số này là số đo của một dòng đơn, hay của cả đơn?"* Câu trả
   lời "của cả đơn" mà cột vẫn nằm trong bảng grain dòng đơn = phải phân bổ hoặc bỏ ra.

## Related Topics

- [Header/line và phân bổ fact](../skills/allocated-facts.md) — kỹ thuật bị bỏ qua ở đây
- [Grain](../reference/grain.md) — mọi cột số đo phải thuộc đúng grain đã khai
- [Bridge table](../skills/bridge-table.md) — cùng cơ chế hệ số phân bổ
- [CS: join hai fact làm phồng tổng](join-hai-fact-lam-phong-tong.md) — cùng bệnh trộn grain
