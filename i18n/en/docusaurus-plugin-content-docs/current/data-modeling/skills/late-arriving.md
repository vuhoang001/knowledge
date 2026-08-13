---
title: Dữ liệu về muộn — late arriving fact và dimension
i18n_status: untranslated
sidebar_position: 10
description: "Fact về sau khi dimension đã đổi, hoặc dimension về sau fact: hai ca ngược nhau, hai cách xử lý khác nhau, cùng một hậu quả nếu bỏ qua."
tags: [late-arriving, scd, etl, dimension, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Dữ liệu về muộn — late arriving fact và dimension

> **Chốt:** ETL nào cũng ngầm giả định *"dữ liệu về đúng lúc nó xảy ra"*. Giả định đó sai
> ở mọi hệ thống thật. Hai kiểu về muộn — fact về sau, dimension về sau — hỏng theo hai
> cách ngược nhau, và cả hai đều **không sinh lỗi**.

## Hai ca, phân biệt bằng cái gì về muộn

| | Late arriving **fact** | Late arriving **dimension** |
|---|---|---|
| Chuyện gì xảy ra | Giao dịch ngày 10/01 mãi 05/03 mới về kho | Fact tham chiếu khách hàng mà dimension chưa có |
| Hỏng ra sao | Gán vào **phiên bản dimension hiện tại** thay vì phiên bản lúc giao dịch | `JOIN` loại sạch dòng fact, hoặc khoá mồ côi |
| Triệu chứng | Số của kỳ cũ đổi, thuộc tính bị gán sai | Tổng hụt mà không ai biết hụt bao nhiêu |
| Cách xử lý | Join theo **ngày giao dịch**, không theo `la_hien_tai` | **Inferred member** — dòng giữ chỗ |

Cả hai đều là hệ quả của việc mô hình có [SCD](scd.md) Type 2: nếu dimension không giữ
lịch sử thì không có "phiên bản đúng" nào để chọn sai.

## Ví dụ xuyên suốt

Khách `C1` chuyển từ Miền Bắc sang Miền Nam ngày 01/02/2026. Bốn giao dịch, trong đó `B1`
xảy ra 10/01 nhưng **54 ngày sau mới về kho**, và `B4` thuộc về khách `C3` mà hồ sơ chưa
kịp về.

```sql
CREATE TABLE dim_khach AS
SELECT * FROM (VALUES
  (1, 'C1', 'Mien Bac', DATE '2025-01-01', DATE '2026-02-01', false),
  (2, 'C1', 'Mien Nam', DATE '2026-02-01', DATE '9999-12-31', true),
  (3, 'C2', 'Mien Nam', DATE '2025-01-01', DATE '9999-12-31', true)
) t(khach_sk, khach_id, khu_vuc, hieu_luc_tu, hieu_luc_den, la_hien_tai);

-- ngay_gd = luc viec xay ra; ngay_nhan = luc dong du lieu ve toi kho
CREATE TABLE stg_ban AS
SELECT * FROM (VALUES
  ('B1', 'C1', DATE '2026-01-10', DATE '2026-03-05', 1000),  -- fact ve muon 54 ngay
  ('B2', 'C1', DATE '2026-02-15', DATE '2026-02-15',  500),
  ('B3', 'C2', DATE '2026-01-20', DATE '2026-01-20',  300),
  ('B4', 'C3', DATE '2026-01-25', DATE '2026-01-25',  700)   -- C3 chua co trong dim
) t(ma_ban, khach_id, ngay_gd, ngay_nhan, doanh_thu);
```

Sự thật: **2.500** trên **4 dòng**.

### Bước 1 — ETL viết theo bản năng

Cách join hay gặp nhất trong mọi codebase: lấy bản hiện tại của dimension.

```sql
SELECT d.khu_vuc, sum(s.doanh_thu) AS doanh_thu, count(*) AS so_dong
FROM stg_ban s JOIN dim_khach d
  ON d.khach_id = s.khach_id AND d.la_hien_tai
GROUP BY 1 ORDER BY 1;
```

```text
┌──────────┬───────────┬─────────┐
│ khu_vuc  │ doanh_thu │ so_dong │
├──────────┼───────────┼─────────┤
│ Mien Nam │      1800 │       3 │
└──────────┴───────────┴─────────┘
```

Hai lỗi cùng lúc, không lỗi nào báo:

1. **Miền Bắc biến mất khỏi báo cáo.** 1.000 doanh thu tháng 1 của `C1` bị gán cho Miền
   Nam, vì ETL hỏi *"C1 bây giờ ở đâu"* thay vì *"C1 lúc đó ở đâu"*.
2. **Mất hẳn một dòng**: `B4` không tìm được `C3`, `JOIN` ném đi 700.

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

**1.800 / 2.500 — hụt 28%.** Pipeline xanh, không exception, không test đỏ.

### Bước 2 — sửa ca fact về muộn: join theo ngày giao dịch

Bỏ `la_hien_tai`, dùng khoảng hiệu lực:

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

Miền Bắc quay lại với đúng 1.000. Đây là *as-was* — thứ Type 2 sinh ra để phục vụ, và
cũng là thứ bị vứt đi ngay khi ETL viết `WHERE la_hien_tai`.

`B4` vẫn còn thiếu.

### Bước 3 — sửa ca dimension về muộn: inferred member

Khi fact trỏ tới một khoá chưa tồn tại, **đừng bỏ dòng fact và đừng chờ**. Chèn một dòng
dimension giữ chỗ — Kimball gọi là *inferred member*:

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

```sql
SELECT sum(s.doanh_thu) AS tong, count(*) AS so_dong
FROM stg_ban s JOIN dim_khach d
  ON d.khach_id = s.khach_id
 AND s.ngay_gd >= d.hieu_luc_tu AND s.ngay_gd < d.hieu_luc_den;
```

```text
┌────────┬─────────┐
│  tong  │ so_dong │
├────────┼─────────┤
│   2500 │       4 │
└────────┴─────────┘
```

**2.500 / 4 dòng.** Khớp nguồn.

Điểm quan trọng: `Chua biet` **hiện trên báo cáo**. Dữ liệu thiếu trở thành một dòng nhìn
thấy được thay vì một khoảng trống vô hình — đó mới là điều làm nó khác hẳn việc bỏ dòng.

### Bước 4 — khi hồ sơ thật về

Inferred member được lấp bằng **Type 1 tại chỗ**, không tạo phiên bản mới:

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

Fact **không phải nạp lại** — nó vẫn trỏ `khach_sk = 4`. Đây chính là lý do inferred
member phải giữ nguyên surrogate key thay vì tạo khoá mới khi hồ sơ về.

Nếu dùng Type 2 cho lần lấp này, bạn sẽ có một phiên bản `Chua biet` tồn tại vĩnh viễn
trong lịch sử — vô nghĩa, vì `Chua biet` chưa bao giờ là sự thật, nó chỉ là trạng thái
của **kho dữ liệu**, không phải của khách hàng.

## Đo độ trễ — biến giả định thành số

Không thể xử lý thứ không đo. Thêm `ngay_nhan` (hoặc `_loaded_at`) vào staging và đo:

```sql
SELECT ma_ban, ngay_gd, ngay_nhan, ngay_nhan - ngay_gd AS tre_ngay
FROM stg_ban ORDER BY tre_ngay DESC;
```

```text
┌─────────┬────────────┬────────────┬──────────┐
│ ma_ban  │  ngay_gd   │ ngay_nhan  │ tre_ngay │
├─────────┼────────────┼────────────┼──────────┤
│ B1      │ 2026-01-10 │ 2026-03-05 │       54 │
│ B2      │ 2026-02-15 │ 2026-02-15 │        0 │
│ B3      │ 2026-01-20 │ 2026-01-20 │        0 │
│ B4      │ 2026-01-25 │ 2026-01-25 │        0 │
└─────────┴────────────┴────────────┴──────────┘
```

Con số quyết định cửa sổ nạp lại của mô hình incremental:

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

**40% doanh thu về sau khi kỳ đã chốt.** Với con số này, mô hình incremental chỉ nạp lại
7 ngày gần nhất sẽ vĩnh viễn thiếu — xem [materializations](../../etl/dbt/reference/materializations.md).
Cửa sổ nạp lại phải rộng hơn độ trễ ở phân vị 99, không phải rộng hơn độ trễ trung bình.

## Ảnh hưởng tới bảng tổng hợp

Fact về muộn còn làm lệch [aggregate fact table](aggregate-fact-table.md): bảng tổng hợp
tháng 1 đã chạy xong từ 01/02, dòng về ngày 05/03 không có ai tính lại. Hai lớp phải nạp
lại cùng một cửa sổ, nếu không chúng trôi khỏi nhau.

## Trade-offs

| Được | Mất |
|---|---|
| Join theo khoảng hiệu lực → as-was đúng | Join bất đẳng thức, chậm hơn join khoá thường |
| Inferred member → không mất dòng nào | Báo cáo có nhóm `Chua biet` phải giải thích |
| Đo `tre_ngay` → cửa sổ nạp lại có căn cứ | Phải mang `ngay_nhan` suốt pipeline |
| Nạp lại cửa sổ rộng | Tốn tính toán mỗi lần chạy |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| `JOIN … AND d.la_hien_tai` cho fact lịch sử | Gán sai thuộc tính, kỳ cũ đổi số — [case study](../case-studies/fact-den-muon-gan-sai-khu-vuc.md) |
| `INNER JOIN` với dimension | Fact có khoá chưa biết bị ném đi âm thầm |
| Bỏ dòng fact vào bảng "chờ" rồi quên | Dữ liệu nằm đó mãi, tổng không bao giờ khớp |
| Inferred member dùng Type 2 khi lấp | Phiên bản `Chua biet` tồn tại vĩnh viễn trong lịch sử |
| Cửa sổ incremental hẹp hơn độ trễ thật | Dòng về muộn không bao giờ được nạp |
| Không phân biệt `ngay_gd` và `ngay_nhan` | Không đo được độ trễ, mọi quyết định thành phỏng đoán |

## Dấu hiệu nhận ra sớm

```sql
-- 1. Fact tro toi khoa khong co trong dimension
SELECT count(*) FROM fct_ban f
LEFT JOIN dim_khach d ON d.khach_id = f.khach_id
WHERE d.khach_id IS NULL;

-- 2. Bao nhieu dong roi vao inferred member va co giam khong
SELECT date_trunc('month', ngay_gd) AS thang, count(*) AS dong_chua_biet
FROM fct_ban WHERE khach_sk IN (SELECT khach_sk FROM dim_khach WHERE khu_vuc = 'Chua biet')
GROUP BY 1 ORDER BY 1;

-- 3. Tong cua mot ky da chot co doi giua hai lan chay khong
```

Câu 3 là câu đáng đặt thành test định kỳ: chụp lại tổng của các kỳ đã đóng sổ, so mỗi
lần chạy. Đổi = có dữ liệu về muộn, và bạn biết ngay ngày nào.

## Related Topics

- [SCD](scd.md) — Type 2 và khoảng hiệu lực là nền của cách sửa
- [Phát hiện thay đổi cho SCD 2](scd-change-detection.md) — biết dòng nào đã đổi
- [Date dimension](../reference/date-dimension.md) — dòng `-1` cho mốc chưa xảy ra
- [Aggregate fact table](aggregate-fact-table.md) — bảng tổng hợp trôi vì fact về muộn
- [CS: fact về muộn bị gán sai khu vực](../case-studies/fact-den-muon-gan-sai-khu-vuc.md)
- [CS: một nửa số đơn biến mất](../case-studies/don-dang-giao-bien-mat.md) — cùng cơ chế `JOIN` loại dòng

## References

- Kimball Group — [Late Arriving Facts / Late Arriving Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 19
