---
title: Year-to-date và timespan trong fact
i18n_status: untranslated
sidebar_position: 19
description: "Cột luỹ kế lưu sẵn trong fact là bẫy cộng trùng; ngược lại, khoảng hiệu lực lưu trong fact là thứ giữ cho giá quá khứ không đổi."
tags: [year-to-date, timespan, additivity, fact, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Year-to-date và timespan trong fact

> **Chốt:** hai kỹ thuật đều nhét *thời gian* vào fact và cho kết quả ngược nhau. Cột
> **luỹ kế** (`YTD`) là số **không cộng được** nằm giữa các số cộng được — gần như luôn
> nên bỏ. Cột **khoảng hiệu lực** thì ngược lại: thiếu nó là quá khứ tự đổi số.

## Year-to-date: đừng lưu, hãy tính lúc đọc

```sql
CREATE TABLE fct_thang AS
SELECT thang, doanh_thu,
       sum(doanh_thu) OVER (ORDER BY thang) AS doanh_thu_ytd
FROM (VALUES (1, 100), (2, 200), (3, 150), (4, 300)) t(thang, doanh_thu);
```

```text
┌───────┬───────────┬───────────────┐
│ thang │ doanh_thu │ doanh_thu_ytd │
├───────┼───────────┼───────────────┤
│     1 │       100 │           100 │
│     2 │       200 │           300 │
│     3 │       150 │           450 │
│     4 │       300 │           750 │
└───────┴───────────┴───────────────┘
```

Bảng này **đúng**. Mọi dòng đều chính xác. Nó hỏng ở thao tác tự nhiên nhất mà người dùng
BI làm với một cột số: kéo vào ô "tổng".

```sql
SELECT sum(doanh_thu)     AS doanh_thu_that,
       sum(doanh_thu_ytd) AS sum_cua_cot_ytd,
       round(1.0 * sum(doanh_thu_ytd) / sum(doanh_thu), 2) AS phong_may_lan
FROM fct_thang;
```

```text
┌────────────────┬─────────────────┬───────────────┐
│ doanh_thu_that │ sum_cua_cot_ytd │ phong_may_lan │
├────────────────┼─────────────────┼───────────────┤
│            750 │            1600 │          2.13 │
└────────────────┴─────────────────┴───────────────┘
```

**Phồng 2,13 lần** — và với 12 tháng thì phồng khoảng 6,5 lần. Tháng 1 được đếm 4 lần,
tháng 2 ba lần, và cứ thế.

`doanh_thu_ytd` là **non-additive theo chiều thời gian**, giống hệt số dư trong
[periodic snapshot](../reference/fact-and-dimension.md). Nhưng có một điểm khác làm nó
nguy hiểm hơn: số dư *trông như* không cộng được (ai cũng biết cộng số dư 12 tháng là vô
lý), còn `doanh_thu_ytd` **trông y hệt** `doanh_thu`.

Lấy đúng thì phải đọc **một dòng**, không được gộp:

```sql
SELECT thang, doanh_thu_ytd FROM fct_thang WHERE thang = 4;
```

```text
┌───────┬───────────────┐
│ thang │ doanh_thu_ytd │
├───────┼───────────────┤
│     4 │           750 │
└───────┴───────────────┘
```

### Cách làm — bỏ cột, dùng window function

```sql
SELECT thang, doanh_thu,
       sum(doanh_thu) OVER (ORDER BY thang) AS ytd_tinh_luc_doc
FROM fct_thang ORDER BY thang;
```

```text
┌───────┬───────────┬──────────────────┐
│ thang │ doanh_thu │ ytd_tinh_luc_doc │
├───────┼───────────┼──────────────────┤
│     1 │       100 │              100 │
│     2 │       200 │              300 │
│     3 │       150 │              450 │
│     4 │       300 │              750 │
└───────┴───────────┴──────────────────┘
```

Cùng kết quả, nhưng cột luỹ kế **không tồn tại trong bảng** nên không ai cộng nhầm được.
Mọi engine hiện đại đều có window function; đây không còn là lý do chính đáng để lưu sẵn.

**Ngoại lệ duy nhất:** BI không hỗ trợ window function và tập dữ liệu quá lớn để tính lại.
Khi đó lưu YTD trong một **bảng riêng, tên nói rõ** (`agg_ytd_thang`), không trộn vào fact
atomic, và ghi trong mô tả bảng rằng cột này không được `SUM`.

Cùng lập luận với việc không lưu `avg` trong
[bảng tổng hợp](aggregate-fact-table.md): **lưu số cộng được, tính phần còn lại lúc đọc.**

## Timespan tracking: cái này thì phải lưu

Hướng ngược lại. Fact ghi lại **một trạng thái có hiệu lực trong một khoảng thời gian** —
giá bán, hạn mức tín dụng, mức phí — với `hieu_luc_tu` / `hieu_luc_den` ngay trong fact.

```sql
CREATE TABLE fct_gia AS
SELECT * FROM (VALUES
  ('SP-A', 100, DATE '2026-01-01', DATE '2026-03-01'),
  ('SP-A', 150, DATE '2026-03-01', DATE '2026-06-01'),
  ('SP-A', 300, DATE '2026-06-01', DATE '9999-12-31'),
  ('SP-B', 500, DATE '2026-01-01', DATE '9999-12-31')
) t(san_pham, gia, hieu_luc_tu, hieu_luc_den);
```

Giá tại thời điểm bán:

```sql
SELECT b.san_pham, b.ngay, b.so_luong, g.gia, b.so_luong * g.gia AS thanh_tien
FROM fct_ban b JOIN fct_gia g
  ON g.san_pham = b.san_pham
 AND b.ngay >= g.hieu_luc_tu AND b.ngay < g.hieu_luc_den
ORDER BY b.ngay;
```

```text
┌──────────┬────────────┬──────────┬───────┬────────────┐
│ san_pham │    ngay    │ so_luong │  gia  │ thanh_tien │
├──────────┼────────────┼──────────┼───────┼────────────┤
│ SP-A     │ 2026-02-10 │        3 │   100 │        300 │
│ SP-A     │ 2026-04-15 │        2 │   150 │        300 │
│ SP-B     │ 2026-05-05 │        1 │   500 │        500 │
│ SP-A     │ 2026-07-20 │        4 │   300 │       1200 │
└──────────┴────────────┴──────────┴───────┴────────────┘
```

Nếu thay bằng giá hiện tại:

```text
┌──────────────────┬───────────────────┬──────────┐
│ dung_gia_luc_ban │ dung_gia_hien_tai │ lech_pct │
├──────────────────┼───────────────────┼──────────┤
│             2300 │              3200 │     39.1 │
└──────────────────┴───────────────────┴──────────┘
```

**Lệch 39,1%.** Cùng cơ chế với [SCD](scd.md) Type 2 và với
[tỷ giá](multi-currency-uom.md), chỉ khác là áp lên chính fact thay vì dimension.

### Hai bất biến phải kiểm

Khoảng hiệu lực chỉ đáng tin khi **không hở và không chồng lấn**. Sai một trong hai thì
join theo ngày sẽ mất dòng hoặc nhân đôi dòng.

```sql
SELECT san_pham, count(*) AS so_khoang,
       count(*) FILTER (WHERE hieu_luc_tu >= hieu_luc_den) AS khoang_nguoc,
       max(hieu_luc_den) AS phu_toi
FROM fct_gia GROUP BY 1 ORDER BY 1;
```

```text
┌──────────┬───────────┬──────────────┬────────────┐
│ san_pham │ so_khoang │ khoang_nguoc │  phu_toi   │
├──────────┼───────────┼──────────────┼────────────┤
│ SP-A     │         3 │            0 │ 9999-12-31 │
│ SP-B     │         1 │            0 │ 9999-12-31 │
└──────────┴───────────┴──────────────┴────────────┘
```

Và kiểm tính liên tục bằng `lead()`:

```sql
WITH x AS (
  SELECT san_pham, hieu_luc_tu, hieu_luc_den,
         lead(hieu_luc_tu) OVER (PARTITION BY san_pham ORDER BY hieu_luc_tu) AS ke_tiep_tu
  FROM fct_gia
)
SELECT san_pham, hieu_luc_den, ke_tiep_tu,
       CASE WHEN ke_tiep_tu IS NULL THEN 'cuoi chuoi'
            WHEN ke_tiep_tu = hieu_luc_den THEN 'lien tuc'
            WHEN ke_tiep_tu > hieu_luc_den THEN 'CO KHOANG TRONG'
            ELSE 'CHONG LAN' END AS tinh_trang
FROM x ORDER BY san_pham, hieu_luc_tu;
```

```text
┌──────────┬──────────────┬────────────┬────────────┐
│ san_pham │ hieu_luc_den │ ke_tiep_tu │ tinh_trang │
├──────────┼──────────────┼────────────┼────────────┤
│ SP-A     │ 2026-03-01   │ 2026-03-01 │ lien tuc   │
│ SP-A     │ 2026-06-01   │ 2026-06-01 │ lien tuc   │
│ SP-A     │ 9999-12-31   │ NULL       │ cuoi chuoi │
│ SP-B     │ 9999-12-31   │ NULL       │ cuoi chuoi │
└──────────┴──────────────┴────────────┴────────────┘
```

Câu này đáng đặt thành test dbt — nó bắt được cả khoảng trống lẫn chồng lấn bằng một lần
quét.

### Quy ước nửa mở `[tu, den)`

`hieu_luc_den` của khoảng trước **bằng đúng** `hieu_luc_tu` của khoảng sau, và điều kiện
join dùng `>= tu AND < den`. Quy ước này loại bỏ mọi tranh cãi về "ngày đổi giá thì tính
giá nào" và làm phép kiểm liên tục thành một phép so sánh bằng.

Dùng `<=` ở cả hai đầu là tự tạo ra chồng lấn một ngày ở mỗi mốc — lỗi kinh điển, và nó
nhân đôi đúng những dòng rơi vào ngày chuyển tiếp.

## Fact table surrogate key

Kimball để riêng một kỹ thuật nhỏ hay bị bỏ qua: **thêm một khoá thay thế cho chính dòng
fact** (`ban_sk BIGINT`, tự tăng).

| Khi nào đáng thêm | Vì sao |
|---|---|
| Fact bị `UPDATE` (accumulating snapshot, timespan) | Có mốc duy nhất để trỏ tới khi sửa |
| Cần nạp lại từng dòng, không theo lô | `DELETE ... WHERE ban_sk IN (...)` |
| Có bảng con trỏ ngược về dòng fact | Cần một khoá đơn thay vì khoá tổ hợp 6 cột |
| Truy vết trong quy trình nạp | Ghép với [audit dimension](audit-dimension.md) |

Khi nào **không** cần: fact chỉ `INSERT`, không có bảng nào trỏ tới. Thêm khoá lúc đó chỉ
tốn 8 byte mỗi dòng mà không dùng đến.

Lưu ý: khoá này **không** thay thế việc khai grain. `ban_sk` duy nhất không chứng minh
grain đúng — hai dòng trùng grain vẫn có hai `ban_sk` khác nhau. Phép kiểm grain vẫn phải
chạy trên tổ hợp khoá nghiệp vụ, xem [grain](../reference/grain.md).

## Trade-offs

| Được | Mất |
|---|---|
| Bỏ cột YTD: không ai cộng nhầm được | Mỗi query phải viết window function |
| Timespan trong fact: giá quá khứ bất biến | Join bất đẳng thức, chậm hơn join khoá |
| Quy ước `[tu, den)` | Phải kỷ luật ở mọi chỗ ghi và mọi chỗ đọc |
| Fact surrogate key: sửa/nạp lại từng dòng | 8 byte mỗi dòng, và một chuỗi phải sinh |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Lưu cột YTD trong fact atomic | `SUM` phồng 2–6 lần — [case study](../case-studies/cong-cot-luy-ke.md) |
| Đặt tên cột luỹ kế giống cột thường | Không ai biết cột nào được cộng |
| Timespan dùng `<=` ở cả hai đầu | Chồng lấn một ngày, nhân đôi dòng ở mốc chuyển |
| Không kiểm khoảng trống / chồng lấn | Join theo ngày mất dòng, không báo lỗi |
| Join giá bằng bản ghi hiện tại | Doanh thu quá khứ lệch 39% |
| Tin `ban_sk` duy nhất là grain đúng | Grain trùng vẫn qua được test `unique` |

## Related Topics

- [Fact và Dimension](../reference/fact-and-dimension.md) — additivity, và periodic snapshot cũng non-additive theo thời gian
- [Aggregate fact table](aggregate-fact-table.md) — cùng luật: chỉ lưu số cộng được
- [SCD](scd.md) — khoảng hiệu lực áp cho dimension
- [Nhiều tiền tệ](multi-currency-uom.md) — chốt giá trị tại thời điểm giao dịch
- [CS: cộng cột luỹ kế](../case-studies/cong-cot-luy-ke.md)

## References

- Kimball Group — [Year-to-Date Facts · Timespan Tracking in Fact Tables · Fact Table Surrogate Keys](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 3 và 4
