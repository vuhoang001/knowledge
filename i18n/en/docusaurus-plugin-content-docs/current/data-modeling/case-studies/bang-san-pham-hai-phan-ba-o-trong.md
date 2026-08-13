---
title: dim_san_pham 67% ô trống — và không cột nào đặt được NOT NULL
i18n_status: untranslated
sidebar_position: 22
description: "Sổ tiết kiệm, bảo hiểm và điện thoại nhét chung một dimension; mỗi dòng sản phẩm mới thêm một nhúm cột mà 90% dòng cũ không dùng."
tags: [case-study, supertype, subtype, null-handling, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# `dim_san_pham` 67% ô trống — và không cột nào đặt được `NOT NULL`

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** khi các "sản phẩm" trong cùng một dimension không chung thuộc tính, nhét
> chung một bảng là chọn cách tệ nhất trong các cách tệ — xem
> [thực thể không đồng nhất](../skills/heterogeneous-schema.md).

## Bối cảnh

Một tập đoàn tài chính bán sổ tiết kiệm, bảo hiểm nhân thọ và điện thoại trả góp. Quy tắc
Kimball được áp đúng chữ: *"một conformed `dim_san_pham` cho toàn doanh nghiệp"*.

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

Ý định đúng: mọi fact trỏ về một dimension, nên drill-across được giữa mọi quy trình.

## Triệu chứng

Không có số nào sai. Triệu chứng là bảng **không dùng được**, và nó xấu đi theo thời gian.

```sql
SELECT count(*) AS so_dong,
       count(lai_suat)         AS lai_suat,
       count(so_tien_bao_hiem) AS so_tien_bao_hiem,
       count(trong_luong_kg)   AS trong_luong,
       round(100.0 * (count(*)*6 - count(lai_suat) - count(ky_han_thang)
                    - count(so_tien_bao_hiem) - count(tuoi_toi_da)
                    - count(trong_luong_kg) - count(mau_sac))
             / (count(*)*6), 1) AS pct_o_trong
FROM dim_sp_gop;
```

```text
┌─────────┬──────────┬──────────────────┬─────────────┬─────────────┐
│ so_dong │ lai_suat │ so_tien_bao_hiem │ trong_luong │ pct_o_trong │
├─────────┼──────────┼──────────────────┼─────────────┼─────────────┤
│       4 │        2 │                1 │           1 │        66.7 │
└─────────┴──────────┴──────────────────┴─────────────┴─────────────┘
```

**66,7% số ô trống**, và sau ba năm với 40 cột thì con số đó lên trên 90%.

Hậu quả theo thứ tự xuất hiện:

1. Người dùng mở bảng, thấy 40 cột, không biết cột nào áp dụng cho sản phẩm nào.
2. **Không cột đặc thù nào đặt được `NOT NULL`** — mất tầng kiểm tra rẻ nhất trong kho.
3. `NULL` ở đây nghĩa *"không áp dụng"* nhưng trông y hệt *"thiếu dữ liệu"* — không phân
   biệt được lỗi nạp với lỗi thiết kế.
4. Mỗi dòng sản phẩm mới là một `ALTER TABLE` trên bảng mà mọi báo cáo đang dùng.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| ETL nạp thiếu thuộc tính | Kiểm nguồn: hệ bảo hiểm **không có** khái niệm lãi suất |
| Cần bổ sung dữ liệu từ hệ nguồn khác | Không hệ nào có — thuộc tính đó không tồn tại cho loại đó |
| Thiếu quy trình quản lý dữ liệu chủ | Có ích, nhưng không giải quyết ô trống |
| Nên thêm giá trị mặc định cho NULL | **Tệ hơn** — lãi suất 0 cho bảo hiểm là số sai, không phải số trống |

Chỗ mất thời gian: coi ô trống là **vấn đề chất lượng dữ liệu**. Nó không phải. Không có
dữ liệu nào thiếu — thuộc tính đó **không tồn tại** cho loại sản phẩm đó.

Câu hỏi rẽ hướng: *"lãi suất của một cái điện thoại là bao nhiêu?"* Câu hỏi vô nghĩa, và
đó chính là câu trả lời.

## Nguyên nhân thật

Một dimension đang cố mô tả **nhiều loại thực thể có tập thuộc tính rời nhau**.

Kimball có tên riêng cho tình huống này — *heterogeneous products* — và cách xử lý không
phải là chọn một trong hai thái cực (một bảng gộp / mỗi loại một bảng độc lập), mà là
**cả hai cùng lúc**: supertype cho phần chung, subtype cho phần riêng.

Quy tắc "một conformed dimension" vẫn đúng — nó chỉ áp cho **phần thuộc tính chung**.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `unique` trên `sp_sk` | ✅ xanh |
| `not_null` trên `ma_sp`, `loai_sp` | ✅ xanh |
| `not_null` trên `lai_suat` | ❌ — **không ai đặt được**, vì `NULL` là hợp lệ |
| `relationships` fact → dim | ✅ xanh |
| Tổng doanh thu khớp nguồn | ✅ xanh |

Dòng thứ ba là toàn bộ vấn đề: vì `NULL` hợp lệ ở phần lớn cột, **không đặt được ràng
buộc nào có ý nghĩa**. Bảng đúng theo mọi test, và không test nào phát biểu được điều
người ta thật sự muốn: *"sản phẩm tiết kiệm thì bắt buộc phải có lãi suất"*.

Sau khi tách subtype, câu đó **đặt được**, và đó là lợi ích lớn nhất của việc tách.

## Cách sửa

### Supertype — chỉ thuộc tính mọi loại đều có

```sql
CREATE TABLE dim_sp AS
SELECT sp_sk, ma_sp, loai_sp, nhom_lon FROM dim_sp_gop;
```

Fact trỏ vào bảng này. Câu hỏi cắt ngang chạy trên đây, mọi loại đều có mặt:

```text
┌───────────┬────────────┬───────────┐
│ nhom_lon  │  loai_sp   │ doanh_thu │
├───────────┼────────────┼───────────┤
│ Tai chinh │ Bao hiem   │      5000 │
│ Tai chinh │ Tiet kiem  │      3000 │
│ Hang hoa  │ Dien thoai │       800 │
└───────────┴────────────┴───────────┘
```

### Subtype — một bảng mỗi loại, cùng khoá

```sql
CREATE TABLE dim_sp_tiet_kiem AS
SELECT sp_sk, ma_sp, lai_suat, ky_han_thang FROM dim_sp_gop WHERE loai_sp = 'Tiet kiem';

CREATE TABLE dim_sp_bao_hiem AS
SELECT sp_sk, ma_sp, so_tien_bao_hiem, tuoi_toi_da FROM dim_sp_gop WHERE loai_sp = 'Bao hiem';
```

```text
┌─────────┬──────────────┬──────────────┬───────────┐
│  ma_sp  │   lai_suat   │ ky_han_thang │ doanh_thu │
├─────────┼──────────────┼──────────────┼───────────┤
│ TK-001  │        0.055 │           12 │      1000 │
│ TK-002  │        0.062 │           24 │      2000 │
└─────────┴──────────────┴──────────────┴───────────┘
```

**Không còn ô trống nào**, và `NOT NULL` đặt được cho cả `lai_suat` lẫn `ky_han_thang`.

### Bất biến bắt buộc

```text
┌───────────────┬───────────┐
│ qua_supertype │ tong_fact │
├───────────────┼───────────┤
│          8800 │      8800 │
└───────────────┴───────────┘
```

Supertype phải phủ **100%** sản phẩm. Thiếu một loại là loại đó biến mất khỏi mọi báo cáo
cắt ngang.

| | Trước | Sau |
|---|---|---|
| Tỷ lệ ô trống | 66,7% (và tăng) | 0% ở mỗi bảng |
| `NOT NULL` đặt được | Không cột đặc thù nào | Mọi cột trong subtype |
| Thêm dòng sản phẩm mới | `ALTER TABLE` bảng chung | Thêm một bảng subtype |
| Câu hỏi cắt ngang | Được | Được (qua supertype) |
| Câu hỏi chuyên sâu | Được, nhưng đầy `NULL` | Được, bảng sạch |

## Dấu hiệu nhận ra sớm

1. **Đo tỷ lệ ô trống của dimension** — chạy định kỳ, đặt ngưỡng cảnh báo:

```sql
SELECT count(*) AS so_dong,
       count(lai_suat) AS co_lai_suat,
       round(100.0 * (count(*) - count(lai_suat)) / count(*), 1) AS pct_trong
FROM dim_sp_gop;
```

Cột nào trống trên 50% là ứng viên tách subtype.

2. Trong dimension có cột `loai_*` mà **cụm cột khác chỉ có giá trị khi `loai_*` bằng một
   giá trị nhất định** — đó chính là định nghĩa của subtype.

3. Đếm số cột đặt được `NOT NULL`. Rất ít = bảng đang mô tả nhiều loại thực thể.

4. Mỗi lần ra sản phẩm mới lại phải `ALTER TABLE` bảng dimension chung.

## Related Topics

- [Thực thể không đồng nhất](../skills/heterogeneous-schema.md) — kỹ thuật bị bỏ qua ở đây
- [NULL trong fact và dimension](../skills/null-handling.md) — "không áp dụng" khác "thiếu dữ liệu"
- [Conformed dimension](../skills/conformed-dimension.md) — supertype mới là phần phải conform
- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — subtype là snowflake có chủ đích
