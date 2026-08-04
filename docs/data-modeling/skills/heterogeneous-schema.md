---
title: Thực thể không đồng nhất — supertype, subtype và measure type
sidebar_position: 21
description: "Sản phẩm bảo hiểm và điện thoại không chung thuộc tính; nhét vào một bảng thì 67% ô trống. Supertype cho câu hỏi cắt ngang, subtype cho câu hỏi riêng."
tags: [supertype, subtype, measure-type, abstract-dimension, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Thực thể không đồng nhất — supertype, subtype và measure type

> **Chốt:** khi các "sản phẩm" trong cùng một dimension **không chung thuộc tính**, mọi
> lựa chọn đều tệ theo một kiểu. Kimball chọn kiểu tệ ít nhất: **một bảng chung chỉ chứa
> thuộc tính chung** cho câu hỏi cắt ngang, cộng **một bảng riêng cho mỗi loại** cho câu
> hỏi chuyên sâu.

## Vấn đề

Một tập đoàn tài chính bán cả sổ tiết kiệm, bảo hiểm nhân thọ, lẫn điện thoại trả góp.
Nhét hết vào một `dim_san_pham`:

```sql
CREATE TABLE dim_sp_gop AS
SELECT * FROM (VALUES
  (1,'TK-001','Tiet kiem', 'Tai chinh', 0.055, 12,   NULL, NULL,  NULL,  NULL),
  (2,'TK-002','Tiet kiem', 'Tai chinh', 0.062, 24,   NULL, NULL,  NULL,  NULL),
  (3,'BH-001','Bao hiem',  'Tai chinh', NULL,  NULL, 500000000, 65, NULL, NULL),
  (4,'DT-001','Dien thoai','Hang hoa',  NULL,  NULL, NULL, NULL, 0.35, 'Den')
) t(sp_sk, ma_sp, loai_sp, nhom_lon,
    lai_suat, ky_han_thang, so_tien_bao_hiem, tuoi_toi_da, trong_luong_kg, mau_sac);
```

```text
┌─────────┬──────────┬──────────────────┬─────────────┬─────────────┐
│ so_dong │ lai_suat │ so_tien_bao_hiem │ trong_luong │ pct_o_trong │
├─────────┼──────────┼──────────────────┼─────────────┼─────────────┤
│       4 │        2 │                1 │           1 │        66.7 │
└─────────┴──────────┴──────────────────┴─────────────┴─────────────┘
```

**66,7% số ô là trống.** Và tỷ lệ này chỉ tăng: thêm một dòng sản phẩm mới là thêm 5–10
cột mà 90% dòng cũ không dùng.

Hậu quả không chỉ là chỗ trống:

- Người dùng mở bảng, thấy 40 cột, không biết cột nào áp dụng cho sản phẩm nào.
- `NOT NULL` không đặt được cho cột nào cả — mất luôn tầng kiểm tra rẻ nhất.
- Mỗi loại sản phẩm mới là một lần `ALTER TABLE` trên bảng mọi báo cáo đang dùng.
- `NULL` ở đây nghĩa là *"không áp dụng"*, nhưng trông y hệt *"thiếu dữ liệu"* — xem
  [NULL trong fact và dimension](null-handling.md).

## Cách làm — supertype + subtype

**Supertype**: chỉ những thuộc tính **mọi loại đều có**. Fact trỏ vào bảng này.

```sql
CREATE TABLE dim_sp AS
SELECT sp_sk, ma_sp, loai_sp, nhom_lon FROM dim_sp_gop;
```

**Subtype**: một bảng cho mỗi loại, chỉ thuộc tính của riêng loại đó, **cùng khoá** với
supertype.

```sql
CREATE TABLE dim_sp_tiet_kiem AS
SELECT sp_sk, ma_sp, lai_suat, ky_han_thang FROM dim_sp_gop WHERE loai_sp = 'Tiet kiem';

CREATE TABLE dim_sp_bao_hiem AS
SELECT sp_sk, ma_sp, so_tien_bao_hiem, tuoi_toi_da FROM dim_sp_gop WHERE loai_sp = 'Bao hiem';
```

Câu hỏi cắt ngang — dùng supertype, mọi loại đều có mặt:

```sql
SELECT s.nhom_lon, s.loai_sp, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_sp s USING (sp_sk)
GROUP BY 1,2 ORDER BY 3 DESC;
```

```text
┌───────────┬────────────┬───────────┐
│ nhom_lon  │  loai_sp   │ doanh_thu │
├───────────┼────────────┼───────────┤
│ Tai chinh │ Bao hiem   │      5000 │
│ Tai chinh │ Tiet kiem  │      3000 │
│ Hang hoa  │ Dien thoai │       800 │
└───────────┴────────────┴───────────┘
```

Câu hỏi riêng của một loại — dùng subtype, **không còn cột `NULL` nào**:

```sql
SELECT t.ma_sp, t.lai_suat, t.ky_han_thang, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_sp_tiet_kiem t USING (sp_sk)
GROUP BY 1,2,3 ORDER BY 1;
```

```text
┌─────────┬──────────────┬──────────────┬───────────┐
│  ma_sp  │   lai_suat   │ ky_han_thang │ doanh_thu │
├─────────┼──────────────┼──────────────┼───────────┤
│ TK-001  │        0.055 │           12 │      1000 │
│ TK-002  │        0.062 │           24 │      2000 │
└─────────┴──────────────┴──────────────┴───────────┘
```

Bất biến bắt buộc: **tổng qua supertype phải bằng tổng fact** — supertype phải phủ 100%
sản phẩm, không sót loại nào.

```text
┌───────────────┬───────────┐
│ qua_supertype │ tong_fact │
├───────────────┼───────────┤
│          8800 │      8800 │
└───────────────┴───────────┘
```

### Ba luật khi dùng supertype/subtype

1. **Fact luôn trỏ vào supertype**, không bao giờ trỏ vào subtype. Trỏ vào subtype là
   phải có N fact cho N loại sản phẩm.
2. **Subtype dùng chung khoá thay thế** với supertype. Không sinh khoá riêng.
3. **Không bao giờ `UNION` các subtype lại rồi phân tích** — đó là quay lại bảng gộp với
   toàn `NULL`. Muốn cắt ngang thì dùng supertype.

## Measure type dimension

Cùng bài toán, phía fact: mỗi sản phẩm có một bộ **số đo** khác nhau (lãi suất thực nhận,
số lượng, tỷ lệ trả hàng…). Thay vì 50 cột mà mỗi dòng dùng 3, chuyển sang **fact dạng
dài** — một dòng cho mỗi loại số đo:

```sql
CREATE TABLE dim_loai_so_do AS
SELECT * FROM (VALUES
  (1, 'Doanh thu',      'VND', true),
  (2, 'So luong',       'cai', true),
  (3, 'Ty le tra hang', '%',   false)
) t(so_do_sk, ten_so_do, don_vi, cong_duoc);
```

Cột `cong_duoc` là phần quan trọng nhất, vì nếu không có nó thì:

```sql
SELECT round(sum(gia_tri), 1) AS "sum_tat_ca_vo_nghia", count(*) AS so_dong FROM fct_dai;
```

```text
┌─────────────────────┬─────────┐
│ sum_tat_ca_vo_nghia │ so_dong │
├─────────────────────┼─────────┤
│              3033.0 │       6 │
└─────────────────────┴─────────┘
```

**3.033** = tiền + số lượng cái + phần trăm. Cùng loại lỗi với
[cộng nhiều loại tiền tệ](multi-currency-uom.md), nhưng dễ mắc hơn vì fact dạng dài
**mời gọi** người ta `SUM` cả cột.

Có `cong_duoc` thì lọc được trước khi cộng:

```sql
SELECT l.ten_so_do, l.don_vi, l.cong_duoc,
       CASE WHEN l.cong_duoc THEN round(sum(f.gia_tri),1) END AS tong,
       CASE WHEN NOT l.cong_duoc THEN round(avg(f.gia_tri),1) END AS trung_binh
FROM fct_dai f JOIN dim_loai_so_do l USING (so_do_sk)
GROUP BY 1,2,3 ORDER BY 1;
```

```text
┌────────────────┬─────────┬───────────┬───────────────┬────────────┐
│   ten_so_do    │ don_vi  │ cong_duoc │     tong      │ trung_binh │
├────────────────┼─────────┼───────────┼───────────────┼────────────┤
│ Doanh thu      │ VND     │ true      │        3000.0 │       NULL │
│ So luong       │ cai     │ true      │          13.0 │       NULL │
│ Ty le tra hang │ %       │ false     │          NULL │       10.0 │
└────────────────┴─────────┴───────────┴───────────────┴────────────┘
```

### Dài hay rộng?

| | Fact dạng dài (measure type) | Fact dạng rộng (mỗi số đo một cột) |
|---|---|---|
| Thêm loại số đo | Thêm dòng, không đổi DDL | `ALTER TABLE` |
| Kiểu dữ liệu | Một cột `DOUBLE` cho mọi thứ — mất kiểm soát | Đúng kiểu cho từng cột |
| `SUM` nhầm | **Rất dễ** | Khó — tên cột nói rõ |
| Số dòng | Gấp N lần | 1 |
| Đọc bằng mắt | Khó | Dễ |

```text
┌──────────┬──────────────┬──────────────┬────────────────┐
│ san_pham │  doanh_thu   │   so_luong   │ ty_le_tra_hang │
├──────────┼──────────────┼──────────────┼────────────────┤
│ SP-A     │       1000.0 │          5.0 │           12.5 │
│ SP-B     │       2000.0 │          8.0 │            7.5 │
└──────────┴──────────────┴──────────────┴────────────────┘
```

**Mặc định nên là dạng rộng.** Chỉ chuyển sang dạng dài khi tập số đo thật sự thưa và hay
thay đổi — ví dụ dữ liệu cảm biến IoT, chỉ số xét nghiệm y tế, nơi mỗi thực thể chỉ có
một nhúm trong hàng trăm chỉ tiêu khả dĩ.

## Abstract generic dimension và hot swappable — hai kỹ thuật nên cân nhắc kỹ

Kimball liệt kê thêm hai biến thể mà thực tế hiếm khi là lựa chọn đúng:

**Abstract generic dimension** — một dimension "vạn năng" kiểu `dim_thuc_the(loai, ma,
ten)` cho cả khách, nhà cung cấp, nhân viên. Được: một bảng. Mất: mọi câu hỏi đều phải
lọc `WHERE loai = ...`, không đặt được ràng buộc, và người dùng không đọc nổi. Chỉ dùng
khi các loại thực thể **thật sự** thay thế nhau được trong cùng một vai trò.

**Hot swappable dimension** — nhiều phiên bản của cùng một dimension, mỗi nhóm người dùng
gắn một phiên bản (ví dụ mỗi công ty môi giới nhìn cùng danh mục chứng khoán theo cách
phân loại riêng). Được: mỗi bên có cách nhìn của mình. Mất: **không còn conformed**, số
của hai bên không so được với nhau — trực tiếp phá thứ mà
[conformed dimension](conformed-dimension.md) tồn tại để bảo vệ.

Trước khi chọn hai cái này, kiểm xem supertype/subtype có giải được không. Thường là có.

## Trade-offs

| Được | Mất |
|---|---|
| Supertype: câu hỏi cắt ngang chạy trên bảng gọn | Thêm một join khi cần thuộc tính riêng |
| Subtype: `NOT NULL` đặt được, bảng đọc được | Nhiều bảng hơn phải bảo trì |
| Thêm loại sản phẩm = thêm bảng subtype | Bảng mới phải nối vào quy trình nạp |
| Measure type: thêm số đo không đổi DDL | Rất dễ `SUM` nhầm; mất kiểu dữ liệu |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Một bảng gộp cho mọi loại sản phẩm | 67% ô trống, không đặt được ràng buộc — [case study](../case-studies/bang-san-pham-hai-phan-ba-o-trong.md) |
| Fact trỏ vào subtype | Phải có N fact cho N loại |
| `UNION` các subtype để phân tích cắt ngang | Quay lại bảng gộp đầy `NULL` |
| Fact dạng dài không có cột `cong_duoc` | `SUM` cộng lẫn tiền, số lượng và phần trăm |
| Dùng abstract generic dimension cho tiện | Không ai đọc được, không ràng buộc được |
| Hot swappable mà vẫn muốn so số giữa các bên | Mất conformed, số không so được |

## Related Topics

- [NULL trong fact và dimension](null-handling.md) — "không áp dụng" khác "thiếu dữ liệu"
- [Nhiều tiền tệ và đơn vị đo](multi-currency-uom.md) — cùng lỗi cộng lẫn đơn vị
- [Conformed dimension](conformed-dimension.md) — thứ hot swappable đánh đổi mất
- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — subtype là snowflake có chủ đích
- [CS: bảng sản phẩm hai phần ba ô trống](../case-studies/bang-san-pham-hai-phan-ba-o-trong.md)

## References

- Kimball Group — [Supertype and Subtype Schemas · Measure Type Dimensions · Abstract Generic Dimensions · Hot Swappable Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 10 và 14
