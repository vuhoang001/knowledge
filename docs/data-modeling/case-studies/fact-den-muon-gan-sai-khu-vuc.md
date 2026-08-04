---
title: Doanh thu Miền Bắc bằng 0, và 28% doanh thu biến mất
sidebar_position: 11
description: "ETL join dimension bằng la_hien_tai: giao dịch về muộn bị gán khu vực hiện tại, còn khách chưa có hồ sơ thì bị JOIN ném đi."
tags: [case-study, late-arriving, scd, etl, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Doanh thu Miền Bắc bằng 0, và 28% doanh thu biến mất

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** một dòng `AND d.la_hien_tai` trong ETL vứt bỏ toàn bộ giá trị của SCD Type 2,
> và một `INNER JOIN` với dimension vứt bỏ mọi fact đến trước hồ sơ của nó. Hai lỗi này
> gần như luôn đi cùng nhau — xem [dữ liệu về muộn](../skills/late-arriving.md).

## Bối cảnh

Kho đã làm đúng phần khó: `dim_khach` là [SCD](../skills/scd.md) Type 2, giữ đầy đủ lịch
sử khu vực. Khách `C1` chuyển từ Miền Bắc sang Miền Nam ngày 01/02/2026, cả hai phiên bản
đều còn nguyên trong bảng.

```sql
CREATE TABLE dim_khach AS
SELECT * FROM (VALUES
  (1, 'C1', 'Mien Bac', DATE '2025-01-01', DATE '2026-02-01', false),
  (2, 'C1', 'Mien Nam', DATE '2026-02-01', DATE '9999-12-31', true),
  (3, 'C2', 'Mien Nam', DATE '2025-01-01', DATE '9999-12-31', true)
) t(khach_sk, khach_id, khu_vuc, hieu_luc_tu, hieu_luc_den, la_hien_tai);

CREATE TABLE stg_ban AS
SELECT * FROM (VALUES
  ('B1', 'C1', DATE '2026-01-10', DATE '2026-03-05', 1000),  -- ve muon 54 ngay
  ('B2', 'C1', DATE '2026-02-15', DATE '2026-02-15',  500),
  ('B3', 'C2', DATE '2026-01-20', DATE '2026-01-20',  300),
  ('B4', 'C3', DATE '2026-01-25', DATE '2026-01-25',  700)   -- C3 chua co ho so
) t(ma_ban, khach_id, ngay_gd, ngay_nhan, doanh_thu);
```

Sự thật: **2.500** trên 4 dòng.

Hai chi tiết đời thường: chi nhánh gửi dữ liệu chậm nên `B1` xảy ra 10/01 mà 05/03 mới về
kho; và `B4` thuộc khách `C3` mà hệ CRM chưa đồng bộ hồ sơ sang.

## Triệu chứng

Báo cáo doanh thu theo khu vực, tháng 3:

```text
┌──────────┬───────────┬─────────┐
│ khu_vuc  │ doanh_thu │ so_dong │
├──────────┼───────────┼─────────┤
│ Mien Nam │      1800 │       3 │
└──────────┴───────────┴─────────┘
```

Ba thứ sai cùng lúc, và không thứ nào tự tố cáo mình:

1. **Miền Bắc biến mất khỏi báo cáo** — không phải bằng 0, mà là không có dòng nào.
2. Tổng chỉ còn 1.800 trên 2.500 — **hụt 28%**.
3. Doanh thu tháng 1 của Miền Bắc đã bị chuyển sang Miền Nam, nên Miền Nam trông tốt lên.

```sql
SELECT sum(s.doanh_thu) AS tong_vao_kho, 4 - count(*) AS dong_bi_mat
FROM stg_ban s JOIN dim_khach d ON d.khach_id = s.khach_id AND d.la_hien_tai;
```

```text
┌──────────────┬─────────────┐
│ tong_vao_kho │ dong_bi_mat │
├──────────────┼─────────────┤
│         1800 │           1 │
└──────────────┴─────────────┘
```

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Miền Bắc thật sự không bán được gì | Hỏi chi nhánh: tháng 1 có bán, có hoá đơn |
| Bộ lọc trên dashboard chặn Miền Bắc | Bỏ hết bộ lọc, vẫn không có dòng nào |
| `dim_khach` mất dòng Miền Bắc | `SELECT * FROM dim_khach` — dòng còn nguyên, `khach_sk = 1` |
| Fact chưa nạp đủ | `count(*) FROM stg_ban` = 4, staging đủ |

Chỗ mất thời gian dài nhất: **dimension có đủ dữ liệu, staging có đủ dữ liệu, nhưng kho
thì không.** Nghĩa là mất mát xảy ra ở chính bước nạp — nơi ít ai nghĩ tới vì nó "chỉ là
một câu join".

Câu hỏi rẽ hướng: *"vì sao dòng Miền Bắc trong `dim_khach` không được dùng lần nào?"*

## Nguyên nhân thật

Câu join của ETL:

```sql
FROM stg_ban s JOIN dim_khach d
  ON d.khach_id = s.khach_id AND d.la_hien_tai
```

Hai chữ trong câu đó gây ra cả hai lỗi:

**`AND d.la_hien_tai`** — ETL hỏi *"C1 **bây giờ** ở khu vực nào"*. Với `B1` (giao dịch
10/01), câu trả lời đúng phải là *"lúc đó C1 ở Miền Bắc"*. Toàn bộ mục đích của Type 2 bị
vô hiệu hoá bằng một mệnh đề.

Lỗi này chỉ lộ ra với fact về muộn: `B1` được nạp ngày 05/03, sau khi `C1` đã chuyển vùng.
Nếu dữ liệu về đúng ngày, mệnh đề sai này vẫn cho kết quả đúng — nên nó **sống sót qua
mọi lần kiểm thử**.

**`JOIN`** (inner) — `C3` chưa có trong `dim_khach`, nên `B4` không khớp dòng nào và bị
ném đi lặng lẽ. Cùng cơ chế với [một nửa số đơn biến mất](don-dang-giao-bien-mat.md).

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `unique` trên `dim_khach.khach_sk` | ✅ xanh |
| `not_null` trên mọi khoá của fact | ✅ xanh |
| `relationships` fact → `dim_khach` | ✅ xanh — **các dòng bị loại không còn ở đó để kiểm** |
| Không chồng lấn khoảng hiệu lực | ✅ xanh |
| `accepted_values` cho `khu_vuc` | ✅ xanh |

Dòng thứ ba là cái bẫy đáng nhớ nhất: test toàn vẹn tham chiếu chỉ kiểm **những dòng đã
vào kho**. Dòng bị `INNER JOIN` loại đi không bao giờ được kiểm, vì nó không tồn tại.

Test duy nhất bắt được: **đối chiếu số dòng và tổng tiền giữa staging và kho** — thứ phải
tự viết, không có sẵn trong bộ test chuẩn.

## Cách sửa

### Sửa 1 — join theo ngày giao dịch

```sql
SELECT d.khu_vuc, sum(s.doanh_thu) AS doanh_thu, count(*) AS so_dong
FROM stg_ban s JOIN dim_khach d
  ON d.khach_id = s.khach_id
 AND s.ngay_gd >= d.hieu_luc_tu AND s.ngay_gd < d.hieu_luc_den
GROUP BY 1 ORDER BY 1;
```

```text
┌──────────┬───────────┬─────────┐
│ khu_vuc  │ doanh_thu │ so_dong │
├──────────┼───────────┼─────────┤
│ Mien Bac │      1000 │       1 │
│ Mien Nam │       800 │       2 │
└──────────┴───────────┴─────────┘
```

Miền Bắc quay lại với đúng 1.000.

### Sửa 2 — inferred member cho khách chưa có hồ sơ

```sql
INSERT INTO dim_khach VALUES
  (4, 'C3', 'Chua biet', DATE '1900-01-01', DATE '9999-12-31', true);
```

```text
┌───────────┬───────────┬─────────┐
│  khu_vuc  │ doanh_thu │ so_dong │
├───────────┼───────────┼─────────┤
│ Chua biet │       700 │       1 │
│ Mien Bac  │      1000 │       1 │
│ Mien Nam  │       800 │       2 │
└───────────┴───────────┴─────────┘
```

```text
┌────────┬─────────┐
│  tong  │ so_dong │
├────────┼─────────┤
│   2500 │       4 │
└────────┴─────────┘
```

**2.500 / 4 dòng** — khớp nguồn.

Điểm quan trọng: nhóm `Chua biet` **hiện trên báo cáo**. Dữ liệu thiếu trở thành thứ nhìn
thấy được, thay vì một khoảng trống không ai biết. Khi hồ sơ `C3` về, ghi đè tại chỗ
(Type 1) và fact không phải nạp lại:

```sql
UPDATE dim_khach SET khu_vuc = 'Mien Trung' WHERE khach_id = 'C3';
```

```text
┌────────────┬───────────┐
│  khu_vuc   │ doanh_thu │
├────────────┼───────────┤
│ Mien Bac   │      1000 │
│ Mien Nam   │       800 │
│ Mien Trung │       700 │
└────────────┴───────────┘
```

### Trước và sau

| | Trước | Sau |
|---|---|---|
| Tổng doanh thu | 1.800 (**hụt 28%**) | 2.500 |
| Miền Bắc | Không có dòng | 1.000 |
| Khách chưa có hồ sơ | Mất dòng | Hiện thành `Chua biet` |
| Giá trị của Type 2 | Bị vô hiệu hoá | Được dùng đúng mục đích |

## Dấu hiệu nhận ra sớm

1. **Grep cả codebase** — đây là kiểm tra rẻ nhất và bắt được nhiều nhất:

```bash
grep -rn "la_hien_tai\|is_current\|dbt_valid_to is null" models/
```

Mỗi lần xuất hiện trong một model **fact** đều đáng xem lại. Trong model *view hiện
trạng* thì đúng; trong model nạp fact lịch sử thì gần như luôn sai.

2. Đo độ trễ dữ liệu — biến giả định "về đúng lúc" thành một con số:

```sql
SELECT round(100.0 * sum(doanh_thu) FILTER (WHERE date_trunc('month', ngay_nhan)
                                               > date_trunc('month', ngay_gd))
             / sum(doanh_thu), 1) AS pct_ve_sau_khi_chot_ky
FROM stg_ban;
```

```text
┌────────────────────────┐
│ pct_ve_sau_khi_chot_ky │
├────────────────────────┤
│                   40.0 │
└────────────────────────┘
```

**40% doanh thu về sau khi kỳ đã chốt.** Con số này quyết định cửa sổ nạp lại của mô hình
incremental — xem [materializations](../../etl/dbt/reference/materializations.md).

3. Đối chiếu staging ↔ kho sau mỗi lần nạp:

```sql
SELECT (SELECT count(*) FROM stg_ban) AS staging,
       (SELECT count(*) FROM fct_ban) AS kho;
```

Lệch một dòng là có dòng bị `JOIN` ném đi.

4. Chụp tổng của các kỳ **đã đóng sổ** và so mỗi lần chạy. Đổi = có dữ liệu về muộn.

## Related Topics

- [Dữ liệu về muộn](../skills/late-arriving.md) — kỹ thuật bị bỏ qua ở đây
- [SCD](../skills/scd.md) — Type 2 chỉ có giá trị nếu ETL join theo ngày giao dịch
- [Date dimension](../reference/date-dimension.md) — dòng `-1` cho mốc chưa xảy ra
- [CS: một nửa số đơn biến mất](don-dang-giao-bien-mat.md) — cùng cơ chế `INNER JOIN` loại dòng
- [CS: báo cáo quá khứ tự đổi số](bao-cao-qua-khu-tu-doi-so.md) — hậu quả ngược lại của cùng một quyết định
