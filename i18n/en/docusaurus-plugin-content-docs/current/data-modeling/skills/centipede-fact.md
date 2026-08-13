---
title: Centipede fact table và dimension-to-dimension join
i18n_status: untranslated
sidebar_position: 18
description: "Fact có hai chục khoá ngoại vì mỗi cấp của một cây được tách thành một dimension riêng — dấu hiệu chuẩn hoá nhầm chỗ."
tags: [centipede, dimension, snowflake, outrigger, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Centipede fact table và dimension-to-dimension join

> **Chốt:** fact có 20–30 khoá ngoại gần như luôn là **một cây phân cấp bị chẻ thành
> nhiều dimension**. Ngày, tuần, tháng, quý, năm không phải năm dimension — chúng là năm
> **cột của một** dimension.

## Nhận ra một centipede

Kimball gọi là *centipede* — con rết — vì sơ đồ có hàng chục chân toả ra từ fact.

```sql
CREATE TABLE fct_centipede AS
SELECT 20260110 AS ngay_key, 202602 AS tuan_key, 202601 AS thang_key,
       20261 AS quy_key, 2026 AS nam_key,
       1 AS sp_key, 1 AS nhom_key, 1 AS nganh_key,
       1000 AS doanh_thu;
```

```text
┌───────────────┐
│ so_khoa_ngoai │
├───────────────┤
│             8 │
└───────────────┘
```

Tám khoá ngoại cho một fact bán hàng đơn giản. Mà thực chất chỉ có **hai chiều**: thời
gian và sản phẩm.

Báo cáo đơn giản nhất phải join ba bảng:

```sql
SELECT t.thang_ten, n.nganh_ten, sum(f.doanh_thu) AS doanh_thu
FROM fct_centipede f
JOIN dim_thang t ON t.thang_key = f.thang_key
JOIN dim_nganh n ON n.nganh_key = f.nganh_key
GROUP BY 1,2;
```

```text
┌──────────────┬───────────┬───────────┐
│  thang_ten   │ nganh_ten │ doanh_thu │
├──────────────┼───────────┼───────────┤
│ Thang 1/2026 │ Dien tu   │      1000 │
└──────────────┴───────────┴───────────┘
```

### Phép thử: cột này có suy ra được từ cột kia không?

```sql
SELECT ngay,
       strftime(ngay, '%Y-W%W')        AS tuan_suy_ra,
       strftime(ngay, '%Y%m')::INT     AS thang_suy_ra,
       year(ngay) * 10 + quarter(ngay) AS quy_suy_ra,
       year(ngay)                      AS nam_suy_ra
FROM dim_ngay;
```

```text
┌────────────┬─────────────┬──────────────┬────────────┬────────────┐
│    ngay    │ tuan_suy_ra │ thang_suy_ra │ quy_suy_ra │ nam_suy_ra │
├────────────┼─────────────┼──────────────┼────────────┼────────────┤
│ 2026-01-10 │ 2026-W01    │       202601 │      20261 │       2026 │
└────────────┴─────────────┴──────────────┴────────────┴────────────┘
```

Bốn khoá kia **suy ra được từ `ngay_key`**. Chúng không mang thông tin mới — chúng chỉ
làm fact rộng ra và bắt mọi query join thêm.

> **Phép thử một câu:** nếu khoá B luôn xác định được từ khoá A, thì B là **thuộc tính
> của dimension A**, không phải một dimension riêng.

## Cách sửa — gộp về một dimension cho mỗi chiều thật

```sql
CREATE TABLE dim_ngay_day_du AS
SELECT 20260110 AS ngay_key, DATE '2026-01-10' AS ngay,
       'Tuan 02/2026' AS tuan_ten, 'Thang 1/2026' AS thang_ten,
       'Q1/2026' AS quy_ten, 2026 AS nam;

CREATE TABLE dim_sp_day_du AS
SELECT 1 AS sp_key, 'SP-A' AS san_pham, 'Dien thoai' AS nhom_ten, 'Dien tu' AS nganh_ten;

CREATE TABLE fct_gon AS
SELECT 20260110 AS ngay_key, 1 AS sp_key, 1000 AS doanh_thu;
```

```sql
SELECT d.thang_ten, s.nganh_ten, sum(f.doanh_thu) AS doanh_thu
FROM fct_gon f
JOIN dim_ngay_day_du d USING (ngay_key)
JOIN dim_sp_day_du   s USING (sp_key)
GROUP BY 1,2;
```

```text
┌──────────────┬───────────┬───────────┐
│  thang_ten   │ nganh_ten │ doanh_thu │
├──────────────┼───────────┼───────────┤
│ Thang 1/2026 │ Dien tu   │      1000 │
└──────────────┴───────────┴───────────┘
```

Cùng kết quả, **hai khoá ngoại thay vì tám**, hai join thay vì ba, và fact hẹp hơn ở bảng
lớn nhất trong kho.

| | Trước | Sau |
|---|---|---|
| Khoá ngoại trong fact | 8 | **2** |
| Bảng cho chiều thời gian | 5 | **1** |
| Bảng cho chiều sản phẩm | 3 | **1** |
| Drill từ tháng xuống ngày | Join thêm bảng | Thêm một cột vào `GROUP BY` |

Điểm cuối là lợi ích lớn nhất mà người ta hay quên: gộp lại thì **drill down thành miễn
phí** — xem [thiết kế thuộc tính dimension](dimension-attribute-design.md).

## Bao nhiêu khoá ngoại là quá nhiều?

Kimball đưa ra một con số thực dụng: **hầu hết fact table nên có dưới 20 khoá ngoại**,
và phần lớn nằm trong khoảng 5–15. Vượt ngưỡng thì kiểm ba thứ theo thứ tự:

1. **Có cây phân cấp bị chẻ không?** (ngày/tuần/tháng, sản phẩm/nhóm/ngành, quận/tỉnh/vùng)
   → gộp lại. Đây là nguyên nhân của phần lớn ca.
2. **Có nhóm cờ cardinality thấp không?** → gom thành [junk dimension](junk-dimension.md).
3. **Có nhiều khoá thật sự độc lập không?** → có thể grain đang trộn nhiều quy trình
   nghiệp vụ vào một bảng; tách fact.

Ba câu này giải quyết gần hết mọi centipede.

## Dimension-to-dimension join

Khi gộp, thỉnh thoảng gặp trường hợp một dimension **trỏ tới dimension khác** thay vì dẹt
hết vào — Kimball gọi là *dimension-to-dimension join*, và khi bảng được trỏ tới nhỏ thì
gọi là *outrigger*.

```sql
CREATE TABLE dim_khu_vuc AS
SELECT * FROM (VALUES (1,'Mien Bac','Bac'), (2,'Mien Nam','Nam')) t(kv_key, khu_vuc, mien);
CREATE TABLE dim_khach AS
SELECT * FROM (VALUES (1,'C1',1), (2,'C2',2), (3,'C3',1)) t(khach_sk, khach_id, kv_key);
```

```sql
SELECT kv.mien, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban2 f
JOIN dim_khach k USING (khach_sk)
JOIN dim_khu_vuc kv USING (kv_key)
GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌─────────┬───────────┐
│  mien   │ doanh_thu │
├─────────┼───────────┤
│ Bac     │       400 │
│ Nam     │       200 │
└─────────┴───────────┘
```

Chạy đúng. Nhưng có một cái bẫy về **thời gian** mà cấu trúc này giấu đi:

```sql
SELECT count(*) AS so_dong_fact_bi_anh_huong
FROM fct_ban2 f JOIN dim_khach k USING (khach_sk) WHERE k.kv_key = 1;
```

```text
┌───────────────────────────┐
│ so_dong_fact_bi_anh_huong │
├───────────────────────────┤
│                         2 │
└───────────────────────────┘
```

Nếu `dim_khu_vuc` sửa nhãn `'Mien Bac'` thành `'Khu vuc 1'`, **toàn bộ lịch sử báo cáo
đổi theo** — dù `dim_khach` có [SCD](scd.md) Type 2 đầy đủ. Type 2 chỉ bảo vệ những cột
**nằm trong chính nó**; cột ở bảng outrigger nằm ngoài vùng bảo vệ đó.

Đây là biến thể của [báo cáo quá khứ tự đổi số](../case-studies/bao-cao-qua-khu-tu-doi-so.md),
và nó khó thấy hơn vì mô hình *trông như* đã làm đúng Type 2.

### Khi nào chấp nhận outrigger, khi nào dẹt

| Chấp nhận outrigger | Nên dẹt vào dimension |
|---|---|
| Bảng được trỏ tới **hầu như không đổi** (danh mục hành chính, mã quốc gia) | Thuộc tính thay đổi và cần as-was |
| Nhiều dimension dùng chung nó → thành conformed | Chỉ một dimension dùng |
| Nó có cây phân cấp riêng, sâu | Chỉ vài cột |
| Cập nhật tập trung là mục tiêu | Báo cáo lịch sử là mục tiêu |

Mặc định của Kimball vẫn là **dẹt**. Outrigger là ngoại lệ có lý do, không phải mặc định
— cùng lập luận với [snowflake](../reference/star-snowflake-obt.md).

## Trade-offs

| Được | Mất |
|---|---|
| Fact hẹp, ít join, query nhanh | Dimension rộng, lặp dữ liệu |
| Drill down thành thêm cột `GROUP BY` | Sửa nhãn phải sửa nhiều dòng |
| Sơ đồ đọc được | Mất tính "chuẩn hoá" mà DBA quen |
| Outrigger: cập nhật một chỗ | Outrigger: phá as-was của Type 2 |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Mỗi cấp thời gian một dimension | Fact 8+ khoá ngoại, query nào cũng join 3–5 bảng — [case study](../case-studies/fact-hai-chuc-khoa-ngoai.md) |
| Mỗi cấp sản phẩm một dimension | Không drill được nếu thiếu một join |
| Đưa cột hay đổi vào outrigger | Type 2 mất tác dụng, lịch sử đổi số |
| Chuẩn hoá fact như chuẩn hoá OLTP | Đúng lý thuyết CSDL, sai mục đích phân tích |
| Coi số khoá ngoại lớn là "mô hình giàu chiều" | Thường chỉ là một cây bị chẻ nhỏ |

## Related Topics

- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — outrigger là snowflake cục bộ
- [Junk dimension](junk-dimension.md) — gom cờ cardinality thấp, giảm số khoá ngoại
- [Date dimension](../reference/date-dimension.md) — một bảng cho mọi cấp thời gian
- [Thiết kế thuộc tính dimension](dimension-attribute-design.md) — drill down chỉ là thêm cột
- [CS: fact hai chục khoá ngoại](../case-studies/fact-hai-chuc-khoa-ngoai.md)

## References

- Kimball Group — [Centipede Fact Tables / Dimension-to-Dimension Table Joins / Outrigger Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 3 và 6
