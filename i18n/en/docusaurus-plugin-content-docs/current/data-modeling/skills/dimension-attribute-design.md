---
title: Thiết kế thuộc tính dimension
i18n_status: untranslated
sidebar_position: 16
description: "Cờ Y/N và mã 1/0 làm báo cáo không đọc được; nhiều cây phân cấp song song sống chung một dimension; chỗ đúng cho ghi chú tự do."
tags: [dimension, attribute, hierarchy, drill-down, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Thiết kế thuộc tính dimension

> **Chốt:** dimension không phải chỗ lưu dữ liệu, nó là **giao diện người dùng của kho
> dữ liệu**. Mọi nhãn trên báo cáo đều đến từ đây. `Y`, `1`, `A` là ngôn ngữ của hệ
> nguồn; báo cáo phải nói tiếng người.

## Ba việc thuộc tính dimension phải làm

| Việc | Kimball gọi là | Hỏng thì |
|---|---|---|
| Đặt nhãn để lọc và gộp | Flags & indicators as textual attributes | Báo cáo đầy `Y`/`N`/`1`/`0` |
| Cho đường đi từ tổng quát xuống chi tiết | Drilling down · multiple hierarchies | Không drill được, hoặc chỉ một hướng |
| Chứa mô tả tự do | Text comments | Ghi chú nằm trong fact, phá grain |

## Bẫy 1 — cờ dạng mã

```sql
CREATE TABLE dim_sp_ma AS
SELECT * FROM (VALUES
  (1, 'SP-A', 'Y', 1, 'A'), (2, 'SP-B', 'N', 0, 'B'),
  (3, 'SP-C', 'Y', 1, 'A'), (4, 'SP-D', 'y', 0, 'C')
) t(sp_sk, san_pham, hang_moi, khuyen_mai, phan_loai_abc);
```

Báo cáo chạy ra thế này:

```text
┌──────────┬────────────┬───────────┐
│ hang_moi │ khuyen_mai │ doanh_thu │
├──────────┼────────────┼───────────┤
│ Y        │          1 │       700 │
│ N        │          0 │       300 │
│ y        │          0 │       100 │
└──────────┴────────────┴───────────┘
```

Ba vấn đề trong một bảng ba dòng:

1. **`Y` và `y` thành hai nhóm.** Cùng một khái niệm, hai dòng riêng.
2. **`1` và `0` ở cột `khuyen_mai`** — người đọc phải đoán `1` là có hay không.
3. **Không tự giải thích.** Cột tên `hang_moi`, giá trị `N` — "không phải hàng mới"? Hay
   "chưa xác định"?

```sql
SELECT count(DISTINCT hang_moi) AS so_gia_tri_hang_moi,
       list(DISTINCT hang_moi)  AS cac_gia_tri
FROM dim_sp_ma;
```

```text
┌─────────────────────┬─────────────┐
│ so_gia_tri_hang_moi │ cac_gia_tri │
├─────────────────────┼─────────────┤
│                   3 │ [Y, N, y]   │
└─────────────────────┴─────────────┘
```

**Ba giá trị cho một khái niệm nhị phân.** Đây là chỗ dữ liệu bắt đầu phân mảnh, và nó
lan ra mọi báo cáo dùng cột đó.

### Cách sửa — giải mã ngay ở tầng dimension

```sql
CREATE TABLE dim_sp AS
SELECT sp_sk, san_pham,
       CASE upper(hang_moi) WHEN 'Y' THEN 'Hang moi' ELSE 'Hang thuong' END AS tinh_trang_hang,
       CASE khuyen_mai WHEN 1 THEN 'Dang khuyen mai' ELSE 'Khong khuyen mai' END AS tinh_trang_km,
       CASE phan_loai_abc WHEN 'A' THEN 'A - ban chay'
                          WHEN 'B' THEN 'B - trung binh'
                          ELSE 'C - ban cham' END AS nhom_abc
FROM dim_sp_ma;
```

```text
┌─────────────────┬──────────────────┬───────────┐
│ tinh_trang_hang │  tinh_trang_km   │ doanh_thu │
├─────────────────┼──────────────────┼───────────┤
│ Hang moi        │ Dang khuyen mai  │       700 │
│ Hang thuong     │ Khong khuyen mai │       300 │
│ Hang moi        │ Khong khuyen mai │       100 │
└─────────────────┴──────────────────┴───────────┘
```

Cùng dữ liệu, báo cáo giờ đọc được mà không cần chú thích. `Y` và `y` gộp lại đúng.

Ba luật rút ra:

- **Giải mã một lần, ở tầng dimension** — không phải trong từng câu query hay từng
  dashboard. Đây cũng là lý do dashboard không nên chứa `CASE WHEN`.
- **Nhãn phải tự giải thích khi đứng một mình.** `Hang thuong` đọc được; `N` thì không.
- **Giữ cả mã gốc trong một cột riêng** (`ma_hang_moi`) để đối chiếu hệ nguồn — nhưng
  người dùng cuối không thấy nó.

Cờ có ít giá trị và hay đi cùng nhau thì gom vào [junk dimension](junk-dimension.md).

## Nhiều cây phân cấp trong cùng một dimension

Một sản phẩm được nhìn theo nhiều cách, tuỳ ai hỏi. Đội bán hàng phân theo ngành hàng;
đội kế toán phân theo loại tài khoản. Kimball gọi là **multiple hierarchies**, và cách xử
lý đơn giản hơn người ta tưởng: **thêm cột, không thêm bảng.**

```sql
CREATE TABLE dim_sp_2cay AS
SELECT * FROM (VALUES
  (1, 'SP-A', 'Dien tu',    'Dien thoai', 'Hang hoa', 'Tai san ngan han'),
  (2, 'SP-B', 'Dien tu',    'Phu kien',   'Hang hoa', 'Tai san ngan han'),
  (3, 'SP-C', 'Dich vu',    'Bao hanh',   'Dich vu',  'Doanh thu khac'),
  (4, 'SP-D', 'Thoi trang', 'Ao',         'Hang hoa', 'Tai san ngan han')
) t(sp_sk, san_pham, nganh_hang, nhom_hang, loai_ke_toan, muc_bao_cao_tc);
```

Cây bán hàng:

```text
┌────────────┬───────────┐
│ nganh_hang │ doanh_thu │
├────────────┼───────────┤
│ Dien tu    │       800 │
│ Dich vu    │       200 │
│ Thoi trang │       100 │
└────────────┴───────────┘
```

Cây kế toán — **cùng một dimension, cùng một fact, không join thêm gì**:

```text
┌──────────────┬───────────┐
│ loai_ke_toan │ doanh_thu │
├──────────────┼───────────┤
│ Hang hoa     │       900 │
│ Dich vu      │       200 │
└──────────────┴───────────┘
```

Bất biến phải kiểm: hai cây chia nhóm khác nhau nhưng **tổng phải bằng nhau**.

```sql
SELECT (SELECT sum(f.doanh_thu) FROM fct_ban f JOIN dim_sp_2cay d USING (sp_sk)) AS tong,
       (SELECT count(DISTINCT nganh_hang)   FROM dim_sp_2cay) AS so_nhom_cay_ban_hang,
       (SELECT count(DISTINCT loai_ke_toan) FROM dim_sp_2cay) AS so_nhom_cay_ke_toan;
```

```text
┌────────┬──────────────────────┬─────────────────────┐
│  tong  │ so_nhom_cay_ban_hang │ so_nhom_cay_ke_toan │
├────────┼──────────────────────┼─────────────────────┤
│   1100 │                    3 │                   2 │
└────────┴──────────────────────┴─────────────────────┘
```

800 + 200 + 100 = 900 + 200 = **1.100**. Hai cách chia, một tổng. Cây nào cộng ra số khác
là cây đó có sản phẩm chưa được gán, hoặc gán vào hai nhánh.

**Điều kiện:** mỗi cây phải **phủ hết và không chồng lấn** — mỗi sản phẩm thuộc đúng một
nhánh trong mỗi cây. Nếu một sản phẩm thuộc nhiều nhánh của cùng một cây thì đó không còn
là cây phân cấp nữa, mà là quan hệ nhiều-nhiều → [bridge table](bridge-table.md).

Cây có độ sâu không đều thì xem [cây phân cấp](hierarchy.md).

## Drilling down thật ra không phải một tính năng

Kimball nhấn mạnh điều dễ bị bỏ qua: **drill down chỉ là thêm một cột vào `GROUP BY`.**

```sql
GROUP BY nganh_hang                        -- muc tong quat
GROUP BY nganh_hang, nhom_hang             -- drill xuong mot cap
GROUP BY nganh_hang, nhom_hang, san_pham   -- toi chi tiet
```

Không cần cấu hình gì, không cần OLAP engine. Hệ quả thực tế: **dimension càng nhiều
thuộc tính mô tả thì càng drill được sâu**. Một dimension 5 cột hạn chế người dùng nhiều
hơn bất kỳ giới hạn công cụ nào.

Đây là lý do Kimball khuyên dimension **rộng và dẹt** — 50–100 cột là bình thường, không
phải dấu hiệu thiết kế kém.

## Text comments — ghi chú tự do để đâu

Trường ghi chú (`ly_do_huy`, `ghi_chu_giao_hang`) hay bị nhét thẳng vào fact. Ba vấn đề:
nó là chuỗi dài trong bảng lớn nhất, nó không gộp được, và nó thường trùng lặp.

| Trường hợp | Chỗ đúng |
|---|---|
| Ghi chú lặp lại, ít giá trị phân biệt | Một dimension nhỏ, fact trỏ khoá tới |
| Ghi chú gần như duy nhất mỗi dòng | Một bảng riêng khoá theo degenerate dimension (`so_don`) |
| Cần lọc/gộp theo nội dung | **Trích thành thuộc tính có cấu trúc** — đừng gộp theo chuỗi tự do |

Dòng cuối là quan trọng nhất: nếu người dùng muốn *"đếm đơn huỷ theo lý do"* thì lý do
phải là **danh mục** có mã, không phải chữ người nhập tay. Chuỗi tự do dùng để đọc, không
dùng để gộp.

## Trade-offs

| Được | Mất |
|---|---|
| Nhãn dạng chữ: báo cáo đọc được ngay | Tốn chỗ hơn mã một ký tự (nén dictionary lo phần này) |
| Nhiều cây trong một dimension | Dimension rộng; phải giữ mỗi cây phủ hết, không chồng |
| Dimension rộng → drill sâu | Nhiều cột phải bảo trì và mô tả |
| Ghi chú tách khỏi fact | Thêm một join khi cần đọc |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Để `Y`/`N`/`1`/`0` tới tận báo cáo | Không đọc được; `Y` và `y` thành hai nhóm — [case study](../case-studies/co-y-n-tren-dashboard.md) |
| Giải mã bằng `CASE WHEN` trong từng dashboard | Mỗi dashboard một cách hiểu, sửa một chỗ sót chín chỗ |
| Dựng bảng riêng cho mỗi cây phân cấp | Snowflake không cần thiết — thêm cột là đủ |
| Dimension chỉ có vài cột "cho gọn" | Người dùng không drill được, phải mở ticket xin cột |
| Gộp báo cáo theo chuỗi ghi chú tự do | Mỗi lỗi chính tả thành một nhóm |
| Nhét ghi chú dài vào fact | Bảng lớn nhất phình vì cột không ai gộp |

## Related Topics

- [Junk dimension](junk-dimension.md) — gom nhiều cờ cardinality thấp vào một chỗ
- [Cây phân cấp](hierarchy.md) — khi cây có độ sâu không đều
- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — vì sao dimension nên dẹt
- [NULL trong fact và dimension](null-handling.md) — thuộc tính trống thì gắn nhãn gì
- [CS: dashboard đầy Y, N và y](../case-studies/co-y-n-tren-dashboard.md)

## References

- Kimball Group — [Flags and Indicators as Textual Attributes / Multiple Hierarchies / Drilling Down / Text Comments](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 3
