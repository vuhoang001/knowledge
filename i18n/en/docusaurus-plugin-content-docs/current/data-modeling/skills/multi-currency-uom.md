---
title: Nhiều loại tiền tệ và nhiều đơn vị đo
i18n_status: untranslated
sidebar_position: 12
description: "Số đo có đơn vị thì cột số một mình là vô nghĩa: chốt cả giá trị gốc lẫn giá trị quy đổi vào fact, đừng quy đổi lúc đọc."
tags: [multi-currency, unit-of-measure, fact, additivity, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Nhiều loại tiền tệ và nhiều đơn vị đo

> **Chốt:** một cột số không kèm đơn vị thì `SUM` của nó **luôn chạy** và **thường vô
> nghĩa**. Cách chữa giống nhau cho cả tiền tệ lẫn đơn vị đo: fact chốt **hai số** —
> giá trị gốc theo đơn vị nghiệp vụ, và giá trị đã quy đổi theo đơn vị chuẩn, quy đổi
> bằng hệ số **tại thời điểm giao dịch**.

## Vấn đề — hai lỗi khác nhau

### Lỗi 1: cộng thẳng qua nhiều đơn vị

```sql
CREATE TABLE fct_ban_tho AS
SELECT * FROM (VALUES
  ('O1', DATE '2026-01-10', 'VND', 24000000.0),
  ('O2', DATE '2026-01-15', 'USD',     1000.0),
  ('O3', DATE '2026-02-20', 'VND', 48000000.0)
) t(so_don, ngay, tien_te, so_tien);

SELECT sum(so_tien) AS "tong_(khong_co_don_vi)", count(DISTINCT tien_te) AS so_loai_tien
FROM fct_ban_tho;
```

```text
┌────────────────────────┬──────────────┐
│ tong_(khong_co_don_vi) │ so_loai_tien │
├────────────────────────┼──────────────┤
│             72001000.0 │            2 │
└────────────────────────┴──────────────┘
```

**72.001.000** — đơn vị của con số này là gì? Không là gì cả. Nhưng nó là một số hợp lệ,
render đẹp trên dashboard, và không có gì cảnh báo. Đây là lỗi nguy hiểm nhất trong nhóm
này vì nó **không bao giờ lỗi**.

### Lỗi 2: quy đổi lúc đọc, bằng tỷ giá hôm nay

Tránh được lỗi 1 rồi, cách chữa thường thấy là để tỷ giá ở một bảng riêng và join lúc
chạy báo cáo. Nếu join nhầm sang tỷ giá **hiện tại**, quá khứ bắt đầu di động.

```sql
CREATE TABLE ty_gia AS
SELECT * FROM (VALUES
  (DATE '2026-01-01', 'VND', 24000.0),
  (DATE '2026-02-01', 'VND', 25000.0),
  (DATE '2026-08-01', 'VND', 30000.0),
  (DATE '2026-01-01', 'USD',     1.0),
  (DATE '2026-02-01', 'USD',     1.0),
  (DATE '2026-08-01', 'USD',     1.0)
) t(thang, tien_te, doi_ra_usd);
```

Doanh thu tháng 1 quy ra USD, tính hai kiểu:

```sql
WITH luc_gd AS (
  SELECT sum(f.so_tien / g.doi_ra_usd) AS usd
  FROM fct_ban_tho f JOIN ty_gia g
    ON g.tien_te = f.tien_te AND g.thang = date_trunc('month', f.ngay)
  WHERE date_trunc('month', f.ngay) = DATE '2026-01-01'
), hom_nay AS (
  SELECT sum(f.so_tien / g.doi_ra_usd) AS usd
  FROM fct_ban_tho f JOIN ty_gia g
    ON g.tien_te = f.tien_te AND g.thang = DATE '2026-08-01'
  WHERE date_trunc('month', f.ngay) = DATE '2026-01-01'
)
SELECT round((SELECT usd FROM luc_gd), 2)  AS thang1_usd_luc_gd,
       round((SELECT usd FROM hom_nay), 2) AS thang1_usd_ty_gia_hom_nay,
       round(100.0 * ((SELECT usd FROM hom_nay) - (SELECT usd FROM luc_gd))
             / (SELECT usd FROM luc_gd), 1) AS lech_pct;
```

```text
┌───────────────────┬───────────────────────────┬──────────┐
│ thang1_usd_luc_gd │ thang1_usd_ty_gia_hom_nay │ lech_pct │
├───────────────────┼───────────────────────────┼──────────┤
│            2000.0 │                    1800.0 │    -10.0 │
└───────────────────┴───────────────────────────┴──────────┘
```

Doanh thu tháng 1 **tự giảm 10%** mà không có giao dịch nào thay đổi. Tháng sau tỷ giá
nhích tiếp, con số lại đổi. Cùng một cơ chế với
[báo cáo quá khứ tự đổi số](../case-studies/bao-cao-qua-khu-tu-doi-so.md), chỉ khác là ở
đó thủ phạm là SCD Type 1, ở đây là tỷ giá.

## Cách làm — fact chốt cả hai số

Kimball nói thẳng: fact table lưu **cả giá trị theo tiền tệ giao dịch lẫn giá trị theo
tiền tệ chuẩn của tập đoàn**, quy đổi ngay lúc nạp.

```sql
CREATE TABLE fct_ban AS
SELECT f.so_don, f.ngay, f.tien_te,
       f.so_tien                          AS so_tien_ban_dia,
       round(f.so_tien / g.doi_ra_usd, 2) AS so_tien_usd,
       g.doi_ra_usd                       AS ty_gia_ap_dung
FROM fct_ban_tho f JOIN ty_gia g
  ON g.tien_te = f.tien_te AND g.thang = date_trunc('month', f.ngay);
```

```text
┌─────────┬────────────┬─────────┬─────────────────┬─────────────┬────────────────┐
│ so_don  │    ngay    │ tien_te │ so_tien_ban_dia │ so_tien_usd │ ty_gia_ap_dung │
├─────────┼────────────┼─────────┼─────────────────┼─────────────┼────────────────┤
│ O1      │ 2026-01-10 │ VND     │      24000000.0 │      1000.0 │        24000.0 │
│ O2      │ 2026-01-15 │ USD     │          1000.0 │      1000.0 │            1.0 │
│ O3      │ 2026-02-20 │ VND     │      48000000.0 │      1920.0 │        25000.0 │
└─────────┴────────────┴─────────┴─────────────────┴─────────────┴────────────────┘
```

Ba cột, ba vai trò khác nhau:

| Cột | Trả lời cho ai | Vì sao phải có |
|---|---|---|
| `so_tien_ban_dia` | Kế toán chi nhánh, đối chiếu hệ nguồn | Đây mới là **số thật** của giao dịch |
| `so_tien_usd` | Tập đoàn, so sánh giữa các nước | Cộng được qua mọi quốc gia |
| `ty_gia_ap_dung` | Người đi kiểm chứng | Không có nó thì không ai tái lập được phép tính |

`tien_te` là một [degenerate dimension](degenerate-dimension.md), hoặc trỏ tới
`dim_tien_te` nếu cần thêm tên, ký hiệu, số chữ số thập phân.

Báo cáo tập đoàn giờ **bất biến** — chạy lại sau bao lâu vẫn ra một số:

```sql
SELECT date_trunc('month', ngay)::DATE AS thang, sum(so_tien_usd) AS doanh_thu_usd
FROM fct_ban GROUP BY 1 ORDER BY 1;
```

```text
┌────────────┬───────────────┐
│   thang    │ doanh_thu_usd │
├────────────┼───────────────┤
│ 2026-01-01 │        2000.0 │
│ 2026-02-01 │        1920.0 │
└────────────┴───────────────┘
```

Mà câu hỏi bản địa vẫn nguyên vẹn:

```sql
SELECT tien_te, sum(so_tien_ban_dia) AS tong_ban_dia
FROM fct_ban GROUP BY 1 ORDER BY 1;
```

```text
┌─────────┬───────────────┐
│ tien_te │ tong_ban_dia  │
├─────────┼───────────────┤
│ USD     │        1000.0 │
│ VND     │    72000000.0 │
└─────────┴───────────────┘
```

Luật kèm theo: **không bao giờ `SUM(so_tien_ban_dia)` mà thiếu `GROUP BY tien_te`.**

### Nếu nghiệp vụ cần cả hai kiểu quy đổi

Tài chính đôi khi cần cả *"tỷ giá lúc giao dịch"* (theo chuẩn kế toán) lẫn *"tỷ giá cố
định của kỳ ngân sách"* (để so kế hoạch–thực hiện, loại bỏ ảnh hưởng biến động tỷ giá).
Đó là **hai fact khác nhau** — thêm cột, không thay cột:

```text
so_tien_ban_dia                 -- goc, khong cong qua tien te
so_tien_usd_luc_gd              -- ty gia ngay giao dich
so_tien_usd_ty_gia_ngan_sach    -- ty gia chot dau nam
```

Đừng để hai định nghĩa tranh nhau một cột. Đó là cách nhanh nhất để không ai còn tin bảng.

## Nhiều đơn vị đo — cùng bài toán, khác vỏ

Kho hàng đo bằng thùng, bán lẻ đếm bằng lon, sản xuất tính bằng lít. Ba phòng ban, ba đơn
vị, cùng một sự kiện.

Cách sai phổ biến: **mỗi đơn vị đo một dòng fact**.

```sql
WITH tach_dong AS (
  SELECT ma_giao, 'thung' AS don_vi, so_thung::DOUBLE AS so_luong FROM fct_giao_hang
  UNION ALL SELECT ma_giao, 'lon', so_thung * lon_moi_thung FROM fct_giao_hang
  UNION ALL SELECT ma_giao, 'lit', so_thung * lon_moi_thung * lit_moi_lon FROM fct_giao_hang
)
SELECT count(*) AS so_dong, round(sum(so_luong), 1) AS "sum(so_luong)_vo_nghia"
FROM tach_dong;
```

```text
┌─────────┬────────────────────────┐
│ so_dong │ sum(so_luong)_vo_nghia │
├─────────┼────────────────────────┤
│       9 │                  523.0 │
└─────────┴────────────────────────┘
```

3 lô hàng thành 9 dòng, và `SUM` ra 523 — cộng thùng với lon với lít. [Grain](../reference/grain.md)
của fact vừa bị phá: một dòng không còn là một lô hàng nữa.

Cách Kimball: **một bộ số duy nhất + các hệ số quy đổi nằm ngay trong dòng fact.**

```sql
CREATE TABLE fct_giao_hang AS
SELECT * FROM (VALUES
  ('G1', 10, 24, 0.33),
  ('G2',  3, 24, 0.33),
  ('G3',  5, 12, 0.50)
) t(ma_giao, so_thung, lon_moi_thung, lit_moi_lon);

SELECT sum(so_thung)                                         AS thung,
       sum(so_thung * lon_moi_thung)                         AS lon,
       round(sum(so_thung * lon_moi_thung * lit_moi_lon), 1) AS lit
FROM fct_giao_hang;
```

```text
┌────────┬────────┬───────────────┐
│ thung  │  lon   │      lit      │
├────────┼────────┼───────────────┤
│     18 │    372 │         133.0 │
└────────┴────────┴───────────────┘
```

Grain giữ nguyên **một dòng một lô hàng**, mỗi phòng ban lấy đơn vị của mình bằng một
phép nhân. Chú ý `G3` có 12 lon/thùng chứ không phải 24 — hệ số **thuộc về từng dòng**,
không phải hằng số toàn cục. Đó chính là lý do nó phải nằm trong fact: quy cách đóng gói
đổi theo lô, và lô cũ phải giữ hệ số cũ của nó.

Đóng gói lại thành view cho người dùng cuối:

```sql
CREATE VIEW v_giao_hang AS
SELECT ma_giao, so_thung,
       so_thung * lon_moi_thung               AS so_lon,
       so_thung * lon_moi_thung * lit_moi_lon AS so_lit
FROM fct_giao_hang;
```

## Trade-offs

| Được | Mất |
|---|---|
| Báo cáo quá khứ bất biến | Fact rộng thêm vài cột |
| Cộng được qua mọi quốc gia / phòng ban | Phải có bảng tỷ giá đúng tại thời điểm nạp |
| Truy ngược được phép quy đổi (`ty_gia_ap_dung`) | Tỷ giá sửa hồi tố thì phải nạp lại fact |
| Grain không bị phá | Người đọc phải biết cột nào cộng được |

Về dòng thứ ba: nếu tỷ giá tháng 1 bị sửa lại vào tháng 3, fact tháng 1 phải nạp lại. Đó
là đánh đổi có ý thức — đổi lấy việc **mọi lần chạy khác đều cho cùng kết quả**. Ghi lại
lần nạp lại đó bằng [audit dimension](audit-dimension.md).

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| `SUM` thẳng cột tiền qua nhiều loại tiền tệ | Số vô nghĩa, không có gì báo lỗi |
| Quy đổi lúc đọc bằng tỷ giá hiện tại | Quá khứ đổi số — [case study](../case-studies/doanh-thu-doi-theo-ty-gia.md) |
| Chỉ lưu số đã quy đổi, bỏ số bản địa | Không đối chiếu được với hệ nguồn và kế toán chi nhánh |
| Không lưu `ty_gia_ap_dung` | Không ai tái lập được phép tính khi có tranh cãi |
| Mỗi đơn vị đo một dòng fact | Grain bị phá, `SUM` cộng lẫn các đơn vị |
| Coi hệ số quy đổi là hằng số toàn cục | Quy cách đóng gói đổi → toàn bộ lịch sử sai |

## Related Topics

- [Fact và Dimension](../reference/fact-and-dimension.md) — additivity: cột nào được phép `SUM`
- [Grain](../reference/grain.md) — tách dòng theo đơn vị đo là phá grain
- [Degenerate dimension](degenerate-dimension.md) — `tien_te` thường không cần bảng riêng
- [Audit dimension](audit-dimension.md) — ghi lại lần nạp lại khi tỷ giá bị sửa hồi tố
- [CS: doanh thu tháng 1 tự đổi theo tỷ giá](../case-studies/doanh-thu-doi-theo-ty-gia.md)

## References

- Kimball Group — [Multiple Currency Facts / Multiple Units of Measure Facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 6 và 12
