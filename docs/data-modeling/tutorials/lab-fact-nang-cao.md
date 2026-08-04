---
title: "Lab fact nâng cao — phân bổ, luỹ kế, bảng tổng hợp, con rết"
sidebar_position: 5
description: "Phân bổ phí ship rồi phát hiện lệch 1 đồng do làm tròn; cộng cột luỹ kế phồng 3,38 lần; avg-của-avg lệch 5,7%."
tags: [tutorial, allocated-facts, ytd-timespan-facts, aggregate-fact-table, centipede, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Lab fact nâng cao — phân bổ, luỹ kế, bảng tổng hợp, con rết

> **Chốt:** ba bài đầu đều là **cột số nằm sai chỗ trong fact**. Không cột nào sai giá
> trị; chúng chỉ không cộng được theo cách người ta sẽ cộng.

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Mốc: **10 đơn · 15 dòng · doanh thu 10.215.000 · phí ship 400.000**.

## Bài 1 — Phân bổ phí ship, và một đồng biến mất

Ở [lab nền tảng](lab-nen-tang-grain-fact-dim.md) bài 2, nhân bản `phi_ship` xuống mọi
dòng làm nó phồng **77,5%**. Cách đúng là phân bổ theo tỷ trọng tiền hàng:

```sql
select ct.dong, ct.so_luong*ct.don_gia tien_hang,
       round(h.phi_ship::double * (ct.so_luong*ct.don_gia)
             / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id), 0) phi_ship_phan_bo
from don_hang_chi_tiet ct join don_hang h using (don_hang_id)
where ct.don_hang_id = 'DH003' order by ct.dong;
```

`DH003` có phí ship 90.000 và ba dòng hàng:

```text
┌───────┬───────────┬──────────────────┐
│ dong  │ tien_hang │ phi_ship_phan_bo │
├───────┼───────────┼──────────────────┤
│     1 │    900000 │          41538.0 │
│     2 │    450000 │          20769.0 │
│     3 │    600000 │          27692.0 │
└───────┴───────────┴──────────────────┘
```

41.538 + 20.769 + 27.692 = **89.999**. Thiếu **một đồng**.

Kiểm trên toàn bảng:

```text
┌──────────────┬───────────┬────────────────┐
│ tong_phan_bo │ tong_that │ chenh_lam_tron │
├──────────────┼───────────┼────────────────┤
│     399999.0 │    400000 │           -1.0 │
└──────────────┴───────────┴────────────────┘
```

**Luật bất di của phân bổ: `sum(phan_bo)` phải bằng tổng gốc.** Lệch 1 đồng nghe vô hại,
nhưng nó làm test đối soát **đỏ mỗi lần chạy** — và rồi ai đó sẽ nới ngưỡng test, và từ
đó test không bắt được gì nữa.

**Việc cần làm:** sửa để tổng khớp tuyệt đối — gom sai số làm tròn về dòng lớn nhất của
mỗi đơn:

```sql
-- goi y: dung sum(...) over (partition by don_hang_id) roi lay hieu cho dong cuoi
```

Xem [header/line và phân bổ fact](../skills/allocated-facts.md) và
[case study phí ship phồng 133%](../case-studies/phi-ship-phong-133-phan-tram.md).

| Kết quả của bạn |
|---|
| |

## Bài 2 — Chọn tiêu chí phân bổ: quyết định nghiệp vụ, không phải kỹ thuật

Bài 1 chia theo **tiền hàng**. Nhưng hãng vận chuyển tính theo **cân**, không theo tiền.

**Việc cần làm:** thêm cột `trong_luong_kg` vào `hang_hoa`, phân bổ lại theo trọng lượng,
rồi so hai bảng kết quả. Sản phẩm nào đổi hạng nhiều nhất?

| Số đo ở header | Tiêu chí hợp lý | Vì sao |
|---|---|---|
| Phí vận chuyển | Trọng lượng / thể tích | Hãng tính theo cân |
| Chiết khấu toàn đơn | Tiền hàng | Chiết khấu tính trên giá trị |
| Chi phí đóng gói | Số lượng món | Mỗi món một thao tác |

Ghi lý do chọn **ngay cạnh code** — sáu tháng sau không ai nhớ vì sao chọn tiền hàng.

| Kết quả của bạn |
|---|
| |

## Bài 3 — Cột luỹ kế: phồng 3,38 lần

Dựng bảng có sẵn cột YTD, đúng như nhiều nơi vẫn làm:

```sql
with theo_ngay as (select ngay, sum(so_luong*don_gia) dt from don_hang_chi_tiet group by 1)
select ngay, dt, sum(dt) over (order by ngay) dt_ytd from theo_ngay;
```

Bảng này **đúng ở mọi dòng**. Nó hỏng ở thao tác tự nhiên nhất — kéo cột vào ô tổng:

```text
┌────────────────┬─────────────┬───────────────┐
│ doanh_thu_that │ sum_cot_ytd │ phong_may_lan │
├────────────────┼─────────────┼───────────────┤
│       10215000 │    34560000 │          3.38 │
└────────────────┴─────────────┴───────────────┘
```

Phồng **3,38 lần** trên 5 ngày. Với 12 tháng thì khoảng 6,5 lần — và hệ số **thay đổi
theo số kỳ đang xem**, nên không có tỷ lệ cố định nào để nhận ra.

`dt_ytd` non-additive theo thời gian, giống số dư. Khác biệt chí mạng: số dư *trông như*
không cộng được, còn `doanh_thu_ytd` **trông y hệt** `doanh_thu`.

**Việc cần làm:** bỏ cột đi, tính bằng window function lúc đọc. Xem
[year-to-date và timespan](../skills/ytd-timespan-facts.md) và
[case study cộng cột luỹ kế](../case-studies/cong-cot-luy-ke.md).

| Kết quả của bạn |
|---|
| |

## Bài 4 — Bảng tổng hợp lưu `avg`: lệch 5,7%

```sql
with theo_ngay as (select ngay, avg(so_luong*don_gia) tb from don_hang_chi_tiet group by 1)
select (select avg(so_luong*don_gia) from don_hang_chi_tiet) tu_atomic, avg(tb) avg_cua_avg
from theo_ngay;
```

```text
┌───────────┬─────────────┬──────────┐
│ tu_atomic │ avg_cua_avg │ lech_pct │
├───────────┼─────────────┼──────────┤
│  681000.0 │    642500.0 │     -5.7 │
└───────────┴─────────────┴──────────┘
```

avg-của-avg cho mỗi **ngày** trọng số bằng nhau, bất kể ngày đó có 4 dòng hay 2 dòng.

Cách sửa: bảng tổng hợp **chỉ lưu số cộng được** — `sum` và `count`, chia lúc đọc.

**Việc cần làm:** dựng `agg_ngay(ngay, doanh_thu, so_dong)`, rồi thêm một dòng lùi ngày
vào `don_hang_chi_tiet` mà **không** dựng lại bảng tổng hợp. Viết query đối soát tìm ra
ngày bị lệch. Xem [aggregate fact table](../skills/aggregate-fact-table.md) và
[case study bảng tổng hợp lệch số](../case-studies/bang-tong-hop-lech-so.md).

| Kết quả của bạn |
|---|
| |

## Bài 5 — Con rết: đếm khoá ngoại

Dựng fact theo kiểu chuẩn hoá quá tay — mỗi cấp thời gian một dimension:

```sql
create or replace table fct_centipede as
select ct.don_hang_id, ct.dong,
       cast(strftime(ct.ngay,'%Y%m%d') as int) ngay_key,
       cast(strftime(ct.ngay,'%Y%W')  as int)  tuan_key,
       cast(strftime(ct.ngay,'%Y%m')  as int)  thang_key,
       year(ct.ngay)*10+quarter(ct.ngay)       quy_key,
       year(ct.ngay)                           nam_key,
       ct.ma_hang, h.khach_id,
       ct.so_luong*ct.don_gia thanh_tien
from don_hang_chi_tiet ct join don_hang h using (don_hang_id);
```

Bảy khoá ngoại cho **ba chiều thật** (thời gian, hàng hoá, khách).

**Phép thử:** bốn khoá thời gian ngoài `ngay_key` có mang thông tin gì mới không? Viết
query chứng minh chúng suy ra được hoàn toàn từ `ngay_key`.

Gộp lại thành một `dim_ngay` đầy đủ, rồi so: số khoá ngoại, số bảng phải join, và số cách
join **sai** có thể xảy ra. Xem [centipede fact table](../skills/centipede-fact.md) và
[case study fact tám khoá ngoại](../case-studies/fact-hai-chuc-khoa-ngoai.md).

| Kết quả của bạn |
|---|
| |

## Bài 6 — Nhiều đơn vị đo và nhiều tiền tệ

`don_gia` đang là VND. Thêm một đơn hàng bằng USD:

```sql
insert into don_hang_chi_tiet values ('DH011',1,'SP-C',1,40,'2026-07-06');
```

Giờ `sum(so_luong*don_gia)` cộng lẫn VND với USD — ra một số **hợp lệ và vô nghĩa**.

**Việc cần làm:** thêm cột `tien_te` và `ty_gia_ap_dung`, chốt **hai số** trong fact
(bản địa + quy đổi). Rồi thử quy đổi lúc đọc bằng tỷ giá hôm nay và xem doanh thu tháng 7
đổi bao nhiêu. Xem [nhiều tiền tệ và đơn vị đo](../skills/multi-currency-uom.md) và
[case study doanh thu đổi theo tỷ giá](../case-studies/doanh-thu-doi-theo-ty-gia.md).

Nhớ dọn: `delete from don_hang_chi_tiet where don_hang_id='DH011';`

| Kết quả của bạn |
|---|
| |

## Điểm chung: cột đúng, phép cộng sai

| Bài | Con số | Cột có sai giá trị không |
|---|---|---|
| 1 · phân bổ | lệch 1 đồng do làm tròn | Không |
| 3 · cột YTD | phồng 3,38 lần | Không — mọi dòng đều đúng |
| 4 · avg trong agg | lệch 5,7% | Không — đúng ở grain của nó |
| 6 · cộng lẫn tiền tệ | vô nghĩa | Không |

**Phép thử một câu trước khi đưa bất kỳ cột số nào vào fact:** *"cộng cột này qua hai
dòng bất kỳ, kết quả có nghĩa không?"*

## Related Topics

- [Header/line và phân bổ fact](../skills/allocated-facts.md) — bài 1, 2
- [Year-to-date và timespan](../skills/ytd-timespan-facts.md) — bài 3
- [Aggregate fact table](../skills/aggregate-fact-table.md) — bài 4
- [Centipede fact table](../skills/centipede-fact.md) — bài 5
- [Nhiều tiền tệ và đơn vị đo](../skills/multi-currency-uom.md) — bài 6
- [Fact và Dimension](../reference/fact-and-dimension.md) — additivity, nền của cả lab
