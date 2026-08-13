---
title: Doanh thu tháng 1 tự giảm 10% vào tháng 8, không giao dịch nào thay đổi
i18n_status: untranslated
sidebar_position: 13
description: "Fact chỉ lưu số tiền bản địa; báo cáo quy đổi lúc đọc bằng tỷ giá hiện tại — quá khứ di động theo tỷ giá."
tags: [case-study, multi-currency, fact, additivity, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Doanh thu tháng 1 tự giảm 10% vào tháng 8, không giao dịch nào thay đổi

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** số tiền chỉ có nghĩa khi đi kèm đơn vị **và** thời điểm quy đổi. Fact chỉ lưu
> số bản địa thì mọi báo cáo tập đoàn phải tự quy đổi — và nếu nó quy đổi bằng tỷ giá hôm
> nay, quá khứ sẽ đổi số mỗi tháng. Xem
> [nhiều loại tiền tệ](../skills/multi-currency-uom.md).

## Bối cảnh

Công ty bán ở Việt Nam và Mỹ. Fact lưu đúng thứ hệ nguồn phát ra: số tiền theo tiền tệ
giao dịch, kèm mã tiền tệ.

```sql
CREATE TABLE fct_ban_tho AS
SELECT * FROM (VALUES
  ('O1', DATE '2026-01-10', 'VND', 24000000.0),
  ('O2', DATE '2026-01-15', 'USD',     1000.0),
  ('O3', DATE '2026-02-20', 'VND', 48000000.0)
) t(so_don, ngay, tien_te, so_tien);

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

Báo cáo tập đoàn quy ra USD, join sang bảng tỷ giá lúc chạy.

## Triệu chứng thứ nhất — con số vô nghĩa nhưng trông bình thường

Trước khi chuyện tỷ giá lộ ra, có một dashboard hiển thị **72.001.000** với nhãn "Tổng
doanh thu".

```sql
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

24 triệu VND + 1.000 USD + 48 triệu VND = 72.001.000 **cái gì?** Không là gì cả. Nhưng nó
là số hợp lệ, format đẹp, và không có gì cảnh báo.

## Triệu chứng thứ hai — quá khứ di động

Báo cáo tháng 1 chạy hồi tháng 2 cho **2.000 USD**. Cùng báo cáo đó, chạy lại tháng 8, ra
**1.800 USD**.

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

Tháng đã đóng sổ, đã báo cáo lên hội đồng, **tự giảm 10%**. Và tháng sau tỷ giá nhích
tiếp thì nó lại đổi lần nữa.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Có đơn tháng 1 bị huỷ sau đó | Kiểm: không có đơn nào bị huỷ, `count(*)` không đổi |
| ETL xoá nhầm dòng khi nạp lại | So số dòng giữa hai lần chạy: y hệt |
| Có đơn trả hàng ghi giảm doanh thu | Không có fact trả hàng trong kỳ |
| Bảng tỷ giá bị sửa dữ liệu lịch sử | **Sai** — bảng tỷ giá không sửa gì, chỉ **thêm** dòng tháng 8 |

Chỗ mất thời gian: mọi người tìm dòng **bị thay đổi**. Không dòng nào đổi. Số dòng như cũ,
số tiền bản địa như cũ. Cái đổi là **hệ số nhân được chọn lúc chạy query**.

Câu hỏi rẽ hướng: *"tổng theo VND có đổi không?"* Không. Vậy vấn đề nằm ở bước quy đổi,
không nằm ở dữ liệu.

## Nguyên nhân thật

Fact không lưu giá trị quy đổi. Nên mỗi báo cáo phải tự join sang `ty_gia`, và điều kiện
join là thứ do người viết query quyết định.

Ai đó viết `g.thang = (SELECT max(thang) FROM ty_gia)` — lấy tỷ giá mới nhất. Câu này
**đúng cho câu hỏi "nếu quy đổi hôm nay thì bao nhiêu"**, và **sai cho mọi báo cáo lịch
sử**.

Sai lầm gốc nằm sâu hơn một tầng: quyết định *"tỷ giá nào áp cho giao dịch này"* là một
**dữ kiện của giao dịch**, phải chốt một lần lúc nạp. Đẩy nó ra thời điểm đọc là để mỗi
người đọc tự chọn một câu trả lời khác nhau.

Cùng cơ chế với [báo cáo quá khứ tự đổi số](bao-cao-qua-khu-tu-doi-so.md) — ở đó thủ phạm
là SCD Type 1, ở đây là tỷ giá. Cả hai đều là *"giá trị quá khứ được tra bằng trạng thái
hiện tại"*.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` trên `so_tien`, `tien_te` | ✅ xanh |
| `accepted_values` cho `tien_te` — `[VND, USD]` | ✅ xanh |
| `so_tien > 0` | ✅ xanh |
| `relationships` fact → `ty_gia` | ✅ xanh |
| Tổng theo VND khớp hệ nguồn | ✅ xanh |

Mọi bất biến đều giữ. Bảng tỷ giá cũng đúng — nó chỉ có thêm dòng mới, đúng như nhiệm vụ
của nó.

Lỗi nằm ở **câu join trong lớp báo cáo**, chỗ mà test dữ liệu không với tới. Test duy nhất
bắt được: chụp lại tổng của kỳ đã đóng sổ và so mỗi lần chạy.

## Cách sửa

Fact chốt **cả hai số** ngay lúc nạp, kèm tỷ giá đã dùng:

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

Báo cáo tập đoàn giờ bất biến — chạy lại bao nhiêu lần cũng một số:

```text
┌────────────┬───────────────┐
│   thang    │ doanh_thu_usd │
├────────────┼───────────────┤
│ 2026-01-01 │        2000.0 │
│ 2026-02-01 │        1920.0 │
└────────────┴───────────────┘
```

Mà câu hỏi bản địa của kế toán chi nhánh vẫn trả lời được:

```text
┌─────────┬───────────────┐
│ tien_te │ tong_ban_dia  │
├─────────┼───────────────┤
│ USD     │        1000.0 │
│ VND     │    72000000.0 │
└─────────┴───────────────┘
```

Cột `ty_gia_ap_dung` là thứ dễ bị coi là thừa nhất và có giá trị nhất khi có tranh cãi:
không có nó thì không ai tái lập được phép tính đã dùng.

| | Trước | Sau |
|---|---|---|
| Doanh thu tháng 1 (USD) | Đổi theo ngày chạy báo cáo | 2.000, cố định |
| `SUM` cột tiền | Ra số vô nghĩa | Ra tổng theo từng tiền tệ |
| Tái lập phép quy đổi | Không được | `ty_gia_ap_dung` |
| Nơi quyết định tỷ giá | Lớp báo cáo, mỗi người một kiểu | Lớp nạp, một lần |

## Dấu hiệu nhận ra sớm

1. Fact có cột tiền mà **không có** cột đã quy đổi:

```sql
SELECT count(DISTINCT tien_te) AS so_loai_tien FROM fct_ban_tho;
```

Lớn hơn 1 mà bảng chỉ có một cột số tiền là đã mắc.

2. Grep lớp báo cáo tìm chỗ join tỷ giá bằng giá trị mới nhất:

```bash
grep -rn "max(thang)\|current_date\|order by thang desc limit 1" models/marts/
```

3. Chụp tổng của các kỳ đã đóng sổ, so mỗi lần chạy — đây là test bắt được cả ca này lẫn
   [ca SCD Type 1](bao-cao-qua-khu-tu-doi-so.md):

```sql
-- luu lai, so voi lan chay truoc
SELECT date_trunc('month', ngay)::DATE AS thang, sum(so_tien_usd) AS doanh_thu_usd
FROM fct_ban WHERE ngay < date_trunc('month', current_date) GROUP BY 1;
```

4. Có ai đó `SUM` cột tiền mà không `GROUP BY tien_te`.

## Related Topics

- [Nhiều loại tiền tệ và đơn vị đo](../skills/multi-currency-uom.md) — kỹ thuật bị bỏ qua ở đây
- [Fact và Dimension](../reference/fact-and-dimension.md) — additivity: cột nào được `SUM`
- [CS: báo cáo quá khứ tự đổi số](bao-cao-qua-khu-tu-doi-so.md) — cùng bệnh "tra quá khứ bằng hiện tại"
- [Audit dimension](../skills/audit-dimension.md) — ghi lại lần nạp lại khi tỷ giá bị sửa hồi tố
