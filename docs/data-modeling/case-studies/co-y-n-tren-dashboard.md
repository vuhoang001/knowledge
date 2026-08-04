---
title: Dashboard đầy Y, N và y — một khái niệm nhị phân thành ba nhóm
sidebar_position: 17
description: "Cờ dạng mã đi thẳng từ hệ nguồn ra báo cáo; hoa thường và hoa hoa tách thành hai dòng, và không ai đọc được cột nào nghĩa gì."
tags: [case-study, dimension, attribute, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Dashboard đầy `Y`, `N` và `y` — một khái niệm nhị phân thành ba nhóm

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** dimension là **giao diện người dùng của kho dữ liệu**. Chuyển thẳng mã hệ
> nguồn ra báo cáo là bắt mọi người đọc báo cáo phải học ngôn ngữ của hệ nguồn — xem
> [thiết kế thuộc tính dimension](../skills/dimension-attribute-design.md).

## Bối cảnh

`dim_san_pham` được nạp bằng `SELECT *` từ bảng sản phẩm của hệ ERP. Nhanh, ít code, và
mọi cột nguồn đều có mặt.

```sql
CREATE TABLE dim_sp_ma AS
SELECT * FROM (VALUES
  (1, 'SP-A', 'Y', 1, 'A'), (2, 'SP-B', 'N', 0, 'B'),
  (3, 'SP-C', 'Y', 1, 'A'), (4, 'SP-D', 'y', 0, 'C')
) t(sp_sk, san_pham, hang_moi, khuyen_mai, phan_loai_abc);
```

## Triệu chứng

Báo cáo *"doanh thu theo tình trạng hàng và khuyến mãi"*:

```text
┌──────────┬────────────┬───────────┐
│ hang_moi │ khuyen_mai │ doanh_thu │
├──────────┼────────────┼───────────┤
│ Y        │          1 │       700 │
│ N        │          0 │       300 │
│ y        │          0 │       100 │
└──────────┴────────────┴───────────┘
```

Ba vấn đề trong ba dòng:

1. **`Y` và `y` là hai nhóm riêng.** Cùng một khái niệm, doanh thu bị chia đôi.
2. `khuyen_mai` là `1`/`0` — người đọc phải đoán chiều nào là "có".
3. Không dòng nào tự giải thích. `N` nghĩa là "không phải hàng mới" hay "chưa xác định"?

Giám đốc kinh doanh hỏi *"hàng mới đóng góp bao nhiêu"*. Câu trả lời trên dashboard là
700 — thiếu 100 của dòng `y`.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Có sản phẩm chưa gán cờ | Kiểm: cả 4 sản phẩm đều có giá trị |
| BI tự tách nhóm do khoảng trắng | `trim()` không đổi gì |
| ETL nạp lỗi một dòng | Đối chiếu nguồn: nguồn đúng là `'y'` |
| Hệ nguồn có hai trường tương tự | Chỉ có một cột |

Chỗ mất thời gian: mọi người tìm **lỗi kỹ thuật**. Không có lỗi kỹ thuật nào — hệ nguồn
thật sự chứa `'y'` viết thường ở một dòng, do người nhập liệu gõ tay từ nhiều năm trước.

```sql
SELECT count(DISTINCT hang_moi) AS so_gia_tri_hang_moi,
       list(DISTINCT hang_moi)  AS cac_gia_tri
FROM dim_sp_ma;
```

```text
┌─────────────────────┬─────────────────────┐
│ so_gia_tri_hang_moi │     cac_gia_tri     │
├─────────────────────┼─────────────────────┤
│                   3 │ [Y, N, y]           │
└─────────────────────┴─────────────────────┘
```

**Ba giá trị cho một khái niệm nhị phân.** Câu query này là thứ nên chạy ngay từ đầu.

## Nguyên nhân thật

Dimension được nạp **nguyên trạng** từ hệ nguồn, không có tầng chuẩn hoá.

Hệ nguồn được phép lộn xộn — nó tối ưu cho việc ghi, và nó đã sống 10 năm với dữ liệu
nhập tay. Kho dữ liệu **không** được phép lộn xộn, vì nó tối ưu cho việc đọc và mỗi giá
trị lạ là một dòng thừa trên báo cáo của giám đốc.

Chỗ chuẩn hoá đúng là **tầng dimension**, một lần, cho mọi báo cáo về sau.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` trên `hang_moi` | ✅ xanh |
| `unique` trên `sp_sk` | ✅ xanh |
| `relationships` fact → dim | ✅ xanh |
| `accepted_values: ['Y','N']` | ❌ đỏ — **nếu có ai đặt** |
| Tổng doanh thu khớp nguồn | ✅ xanh |

Dòng thứ tư là test duy nhất bắt được, và nó gần như không bao giờ được đặt cho cột cờ —
người ta đặt `accepted_values` cho trạng thái đơn hàng, hiếm khi cho một cột `Y/N` trông
có vẻ hiển nhiên.

Tổng doanh thu vẫn đúng 1.100. Không có dòng nào mất; chúng chỉ bị **chia sai nhóm**.

## Cách sửa

### Giải mã ngay ở tầng dimension

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

`upper()` gộp `Y` và `y`. Câu trả lời cho giám đốc giờ là **800**, và không cần chú thích
kèm theo.

| | Trước | Sau |
|---|---|---|
| Doanh thu "hàng mới" | 700 (thiếu 100) | **800** |
| Số nhóm cho một khái niệm nhị phân | 3 | 2 |
| Người đọc cần bảng chú thích | Có | Không |
| Chỗ giải mã | Mỗi dashboard tự làm | Một chỗ, tầng dimension |

Kèm theo: **giữ cột mã gốc** (`ma_hang_moi`) trong dimension để đối chiếu hệ nguồn, nhưng
không đưa cho người dùng cuối.

## Dấu hiệu nhận ra sớm

1. Liệt kê giá trị phân biệt của mọi cột cờ trong dimension — chạy một lần khi dựng, và
   đặt thành test sau đó:

```sql
SELECT 'hang_moi' AS cot, count(DISTINCT hang_moi) AS so_gia_tri,
       list(DISTINCT hang_moi) AS cac_gia_tri
FROM dim_sp_ma;
```

Số giá trị lớn hơn kỳ vọng = đã có phân mảnh.

2. Có `accepted_values` cho mọi cột cờ và cột mã trong dimension.

3. Grep tìm `CASE WHEN` trong lớp dashboard — mỗi cái là một định nghĩa nằm sai chỗ:

```bash
grep -rn "CASE WHEN" dashboards/ | wc -l
```

4. Nhìn một báo cáo bất kỳ: có ô nào cần bảng chú thích để đọc không?

## Related Topics

- [Thiết kế thuộc tính dimension](../skills/dimension-attribute-design.md) — kỹ thuật bị bỏ qua ở đây
- [Junk dimension](../skills/junk-dimension.md) — chỗ gom nhiều cờ cardinality thấp
- [NULL trong fact và dimension](../skills/null-handling.md) — nhãn cho giá trị trống
- [CS: thêm trạng thái thứ tám](them-trang-thai-thu-tam.md) — cùng bệnh: mã nghiệp vụ không được quản
