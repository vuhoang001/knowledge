---
title: "Lab tích hợp — ghép được nhưng có so được không"
i18n_status: untranslated
sidebar_position: 6
description: "Hai định nghĩa doanh thu lệch 3,9%; drill-across đúng cho tỷ lệ trả hàng theo khu vực; bus matrix thành bảng đo được."
tags: [tutorial, conformed-dimension, conformed-facts, bus-matrix, drill-across, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Lab tích hợp — ghép được nhưng có so được không

> **Chốt:** conformed dimension làm hai fact **ghép được**. Conformed fact quyết định hai
> con số ghép ra có **so được** không. Thiếu vế đầu thì bạn biết mình bế tắc; thiếu vế
> sau thì bạn có một con số và tin nó.

## Chuẩn bị

Cần `scd_khach_hang` từ [lab SCD](scd-bang-dbt-snapshot.md). Mốc: **10.215.000**.

## Bài 1 — Hai định nghĩa "doanh thu", lệch 3,9%

Đội bán hàng tính tiền hàng. Đội tài chính tính tổng tiền khách trả (gồm phí ship).

```sql
with ban as (select don_hang_id, sum(so_luong*don_gia) tien_hang from don_hang_chi_tiet group by 1)
select sum(b.tien_hang) doanh_thu_thuan,
       sum(b.tien_hang + h.phi_ship) tong_tien_khach_tra
from ban b join don_hang h using (don_hang_id);
```

```text
┌─────────────────┬─────────────────────┬────────┬──────────┐
│ doanh_thu_thuan │ tong_tien_khach_tra │ chenh  │ lech_pct │
├─────────────────┼─────────────────────┼────────┼──────────┤
│        10215000 │            10615000 │ 400000 │      3.9 │
└─────────────────┴─────────────────────┴────────┴──────────┘
```

Cả hai đều **đúng trong bối cảnh của nó**. Vấn đề không phải hai định nghĩa cùng tồn tại
— doanh nghiệp nào cũng có nhiều khái niệm doanh thu. Vấn đề là khi chúng **cùng tên
`doanh_thu`**, không ai nghĩ phải kiểm.

**Việc cần làm:** đặt hai tên khác nhau, giữ luôn `phi_ship` làm cột riêng, rồi viết
query đối soát khép kín:

```sql
-- chenh thuc te - chenh giai thich duoc = 0
select sum(tong_tien_khach_tra) - sum(doanh_thu_thuan) - sum(phi_ship) as con_lai from ...;
```

Cột cuối bằng 0 là test đáng đặt: nó **không thể bằng 0 tình cờ**. Xem
[conformed facts](../skills/conformed-facts.md) và
[case study hai phòng hai doanh thu](../case-studies/hai-phong-hai-doanh-thu.md).

| Kết quả của bạn |
|---|
| |

## Bài 2 — Drill-across: tỷ lệ trả hàng theo khu vực

Câu hỏi cắt ngang hai fact (`don_hang_chi_tiet` và `tra_hang`) qua một dimension chung
(`scd_khach_hang`). Ba lượt, đúng thứ tự:

```sql
with d as (select *, dbt_valid_from = min(dbt_valid_from) over (partition by khach_id) la_ban_dau
           from scd_khach_hang),
kv as (select h.don_hang_id, d.khu_vuc from don_hang h join d on d.khach_id = h.khach_id
       and h.ngay_dat >= case when d.la_ban_dau then timestamp '1900-01-01' else d.dbt_valid_from end
       and h.ngay_dat <  coalesce(d.dbt_valid_to, timestamp '9999-12-31')),
ban as (select kv.khu_vuc, sum(ct.so_luong*ct.don_gia) dt        -- luot 1
        from don_hang_chi_tiet ct join kv using (don_hang_id) group by 1),
tra as (select kv.khu_vuc, sum(t.gia_tri_tra) tra                -- luot 2
        from tra_hang t join kv using (don_hang_id) group by 1)
select coalesce(ban.khu_vuc, tra.khu_vuc) khu_vuc,               -- luot 3
       coalesce(ban.dt,0) doanh_thu, coalesce(tra.tra,0) gia_tri_tra,
       round(100.0*coalesce(tra.tra,0)/nullif(ban.dt,0),1) ty_le_tra_pct
from ban full join tra on ban.khu_vuc = tra.khu_vuc order by 2 desc;
```

```text
┌────────────┬───────────┬─────────────┬───────────────┐
│  khu_vuc   │ doanh_thu │ gia_tri_tra │ ty_le_tra_pct │
├────────────┼───────────┼─────────────┼───────────────┤
│ Mien Bac   │   4395000 │      600000 │          13.7 │
│ Mien Nam   │   3720000 │      900000 │          24.2 │
│ Mien Trung │   2100000 │           0 │           0.0 │
└────────────┴───────────┴─────────────┴───────────────┘
```

Doanh thu cộng lại = **10.215.000**, khớp nguồn. Và câu trả lời nghiệp vụ hiện ra: Miền
Nam có tỷ lệ trả hàng **gấp gần đôi** Miền Bắc.

**Ba điều dễ sai ở lượt 3:**

| Sai | Hậu quả |
|---|---|
| `INNER JOIN` thay `FULL JOIN` | Miền Trung (không có trả hàng) **biến mất** |
| Quên `coalesce(...,0)` | Nhóm thiếu thành `NULL`, không cộng được |
| Quên `nullif` ở mẫu số | Chia cho 0 nếu có khu vực chỉ có trả hàng |

**Việc cần làm:** thử cả ba lỗi, xem kết quả đổi thế nào. Xem
[conformed dimension](../skills/conformed-dimension.md#kỹ-thuật-này-có-tên-multipass-sql).

| Kết quả của bạn |
|---|
| |

## Bài 3 — Bus matrix thành một bảng, không phải slide

```sql
create or replace table bus_matrix as
select * from (values
  ('Ban hang','Ngay',true), ('Ban hang','Khach hang',true),
  ('Ban hang','Hang hoa',true), ('Ban hang','Don hang',true),
  ('Tra hang','Ngay',true), ('Tra hang','Khach hang',true),
  ('Tra hang','Hang hoa',false), ('Tra hang','Don hang',true),
  ('Giao hang','Ngay',true), ('Giao hang','Khach hang',true),
  ('Giao hang','Hang hoa',false), ('Giao hang','Don hang',true)
) t(quy_trinh, dimension, co_dung);
```

Ba câu hỏi bảng này trả lời ngay:

```sql
-- 1. Dimension nao phai conform TRUOC?
select dimension, count(*) filter (where co_dung) so_quy_trinh
from bus_matrix group by 1 order by 2 desc;

-- 2. Do phu conformed cua kho
select count(*) filter (where co_dung) o_can_conform, count(*) o_toi_da,
       round(100.0*count(*) filter (where co_dung)/count(*),1) mat_do_pct from bus_matrix;

-- 3. Cau hoi nao BAT KHA THI? -> cac o false
select quy_trinh, dimension from bus_matrix where not co_dung;
```

Ô `false` **không phải việc cần làm** — nó cho biết câu hỏi nào bất khả thi về bản chất
(trả hàng không gắn với mặt hàng nào cụ thể trong dữ liệu này).

**Việc cần làm:** thêm quy trình thứ tư (`Nhap kho`) vào ma trận và tính lại mật độ. Nó
tăng hay giảm? Nghĩa là gì? Xem [bus architecture](../reference/bus-architecture.md).

| Kết quả của bạn |
|---|
| |

## Bài 4 — Phá conformed dimension rồi tự sửa

Dựng hai dimension khách hàng "của hai đội", khác cách chia vùng:

```sql
create or replace table dim_khach_ban_hang as
  select khach_id, khu_vuc from khach_hang;                    -- Mien Bac/Nam/Trung

create or replace table dim_khach_cskh as
  select khach_id,
         case when khu_vuc='Mien Bac' then 'HN' else 'Khac' end kv_cskh
  from khach_hang;                                             -- HN/Khac
```

**Việc cần làm:** thử trả lời *"khu vực nào tỷ lệ trả hàng cao nhất"* khi mỗi fact dùng
một dimension. Bạn sẽ thấy nó **không phải khó — mà là bất khả thi**: hai bên không nói
cùng một ngôn ngữ về "khu vực".

Ba điều kiện để gọi là conformed — kiểm từng cái:

| Điều kiện | Kiểm bằng |
|---|---|
| Cùng surrogate key | Hai fact trỏ về **cùng một bảng** |
| Cùng tập giá trị | `SELECT DISTINCT` hai bên, `EXCEPT` hai chiều = 0 dòng |
| Cùng định nghĩa nghiệp vụ | **Hỏi người** — SQL không kiểm được |

Xem [case study hai mart không ghép được](../case-studies/hai-mart-khong-ghep-duoc.md)
và [năm mart không ghép được](../case-studies/moi-mart-mot-dim-khach.md).

| Kết quả của bạn |
|---|
| |

## Related Topics

- [Conformed dimension](../skills/conformed-dimension.md) — bài 2, 4
- [Conformed facts](../skills/conformed-facts.md) — bài 1
- [Bus architecture, bus matrix và value chain](../reference/bus-architecture.md) — bài 3
- [Lab SCD](scd-bang-dbt-snapshot.md) — dựng `scd_khach_hang` dùng ở bài 2
