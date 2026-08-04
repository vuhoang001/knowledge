---
title: "Lab dimension — ngày, vai, NULL và cờ: bốn cách làm mất dòng"
sidebar_position: 4
description: "Đơn chưa giao biến mất khỏi báo cáo, bộ lọc phủ định nuốt dòng, cờ dạng mã chia sai nhóm — tái hiện rồi sửa."
tags: [tutorial, date-dimension, role-playing-dimension, null-handling, junk-dimension, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Lab dimension — ngày, vai, NULL và cờ: bốn cách làm mất dòng

> **Chốt:** lab trước làm số **phồng**. Lab này làm số **hụt** — nguy hiểm hơn, vì thiếu
> thì không ai thấy. Dòng biến mất không để lại dấu vết nào trên báo cáo.

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Mốc đối chiếu: **10 đơn · 15 dòng · 10.215.000**.

Điều đáng chú ý trong `don_hang`: hai đơn **chưa giao**.

```text
┌─────────────┬──────────┬────────────┬───────────┬────────────┐
│ don_hang_id │ khach_id │  ngay_dat  │ ngay_giao │ trang_thai │
├─────────────┼──────────┼────────────┼───────────┼────────────┤
│ DH006       │ C4       │ 2026-07-03 │ NULL      │ moi        │
│ DH009       │ C2       │ 2026-07-05 │ NULL      │ moi        │
└─────────────┴──────────┴────────────┴───────────┴────────────┘
```

Hai dòng `NULL` này là nguồn của ba bài đầu.

## Bài 1 — Join theo ngày giao: mất 17,3% doanh thu

Câu hỏi nghiệp vụ hoàn toàn bình thường: *"doanh thu theo tháng giao hàng"*.

```sql
select count(*) dong_con_lai, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
where h.ngay_giao is not null;
```

```text
┌──────────────┬───────────┬───────────┬────────────────┬─────────┐
│ dong_con_lai │ dong_that │ doanh_thu │ doanh_thu_that │ hut_pct │
├──────────────┼───────────┼───────────┼────────────────┼─────────┤
│           13 │        15 │   8445000 │       10215000 │   -17.3 │
└──────────────┴───────────┴───────────┴────────────────┴─────────┘
```

Bỏ `where` đi mà join thẳng `dim_ngay` theo `ngay_giao` thì **kết quả y hệt** — `JOIN`
thường tự loại dòng có khoá `NULL`, không cần ai viết điều kiện.

> Doanh thu hụt **17,3%** và báo cáo trông hoàn toàn bình thường: không dòng lạ, không ô
> trống, không cảnh báo.

**Việc cần làm:** đây là [case study "một nửa số đơn biến mất"](../case-studies/don-dang-giao-bien-mat.md).
Sửa bằng dòng `-1` trong [date dimension](../reference/date-dimension.md): thêm một dòng
nhãn *"Chưa xảy ra"*, và fact **không bao giờ** để `NULL` ở cột khoá.

| Kết quả của bạn |
|---|
| |

## Bài 2 — Dựng `dim_ngay` có dòng `-1`

```sql
create or replace table dim_ngay as
with lich as (select (date '2026-07-01' + interval (i) day)::date ngay from range(0,62) t(i))
select cast(strftime(ngay,'%Y%m%d') as integer) ngay_key, ngay,
       strftime(ngay,'%d/%m/%Y') ngay_hien_thi,
       ['CN','T2','T3','T4','T5','T6','T7'][dayofweek(ngay)+1] thu_ten,
       dayofweek(ngay) not in (0,6) la_ngay_lam_viec
from lich
union all
select -1, null, 'Chua xay ra', null, null;
```

Rồi nạp fact với `coalesce`, không để `NULL` lọt vào khoá:

```sql
coalesce(cast(strftime(h.ngay_giao,'%Y%m%d') as integer), -1) as ngay_giao_key
```

**Việc cần làm:** chạy lại bài 1 với `dim_ngay` mới. Tổng phải quay về **10.215.000**, và
hai đơn chưa giao hiện thành nhóm *"Chưa xảy ra"* thay vì biến mất.

| Kết quả của bạn |
|---|
| |

## Bài 3 — Ba vai của cùng một `dim_ngay`

`don_hang` có `ngay_dat`, `ngay_giao`, `ngay_nhan` — cùng trỏ về một bảng lịch.

**Đừng** copy `dim_ngay` thành ba bảng. Dựng ba **view có tên rõ nghĩa**:

```sql
create or replace view dim_ngay_dat as
  select ngay_key ngay_dat_key, ngay ngay_dat, thu_ten thu_dat,
         la_ngay_lam_viec dat_ngay_lam_viec from dim_ngay;

create or replace view dim_ngay_giao as
  select ngay_key ngay_giao_key, ngay ngay_giao, thu_ten thu_giao,
         la_ngay_lam_viec giao_ngay_lam_viec from dim_ngay;
```

**Đổi tên cột là phần quan trọng nhất**, không phải chuyện thẩm mỹ: nhờ nó `select *`
không đụng tên trùng, và người đọc query thấy `thu_giao` là hiểu ngay.

**Việc cần làm:** viết query *"đơn đặt thứ mấy thì hay giao vào cuối tuần nhất"*. Nếu
phải lần ngược lên xem `d1` là bảng nào thì bạn đang thiếu view. Xem
[role-playing dimension](../skills/role-playing-dimension.md).

| Kết quả của bạn |
|---|
| |

## Bài 4 — Bộ lọc phủ định nuốt dòng NULL

`trang_thai` trong `don_hang` không có `NULL`, nên trước hết **tự tạo ra một cái**:

```sql
update don_hang set trang_thai = null where don_hang_id = 'DH009';
```

Giờ chạy hai câu, cùng ý nghĩa tiếng Việt *"các đơn chưa hoàn thành"*:

```sql
select count(*) from don_hang where trang_thai <> 'hoan_thanh';
select count(*) from don_hang where trang_thai is distinct from 'hoan_thanh';
```

**Dự đoán trước khi chạy:** hai số có bằng nhau không?

<details>
<summary>Vì sao khác nhau</summary>

`NULL <> 'hoan_thanh'` trả về `UNKNOWN`, không phải `TRUE`. Mà `WHERE` chỉ giữ dòng
`TRUE` — nên `DH009` bị loại khỏi **cả hai** nhóm: nó không phải "hoàn thành", cũng không
lọt vào "khác hoàn thành".

Cộng hai nhóm lại **không** ra tổng bảng. Đó là bất biến đáng đặt thành test.

</details>

Xem [NULL trong fact và dimension](../skills/null-handling.md) và
[case study lọc "khác huỷ"](../case-studies/loc-khac-huy-mat-mot-phan-tu.md).

Nhớ khôi phục: `update don_hang set trang_thai='moi' where don_hang_id='DH009';`

| Kết quả của bạn |
|---|
| |

## Bài 5 — Một cột trạng thái: để thẳng hay tách dimension?

```text
┌────────────┬────────┐        ┌───────────┬──────────┐
│ trang_thai │ so_don │        │   hang    │ so_khach │
├────────────┼────────┤        ├───────────┼──────────┤
│ hoan_thanh │      6 │        │ Bac       │        2 │
│ dang_giao  │      2 │        │ Kim cuong │        1 │
│ moi        │      2 │        │ Vang      │        1 │
└────────────┴────────┘        └───────────┴──────────┘
```

Ba giá trị, không thuộc tính đi kèm. Theo [junk dimension](../skills/junk-dimension.md):
**để thẳng trong fact** — tạo bảng 3 dòng rồi join ở mọi query là trả phí mà không mua
được gì.

Ngưỡng đảo chiều là lúc xuất hiện câu hỏi *"doanh thu từ đơn **hợp lệ**"*. Lúc đó trạng
thái đã có thuộc tính:

```sql
create or replace table dim_trang_thai as
select * from (values
  ('moi',        true,  false),
  ('dang_giao',  true,  false),
  ('hoan_thanh', true,  true),
  ('huy',        false, false)
) t(trang_thai, la_don_hop_le, la_don_chot);
```

**Việc cần làm:** thêm trạng thái thứ tư `huy` cho một đơn, rồi trả lời *"doanh thu từ
đơn hợp lệ"* — một lần bằng `where trang_thai in (...)` hardcode, một lần bằng
`where la_don_hop_le`. Cái nào sống sót khi có trạng thái thứ năm? Xem
[case study thêm trạng thái thứ tám](../case-studies/them-trang-thai-thu-tam.md).

| Kết quả của bạn |
|---|
| |

## Bài 6 — Cờ dạng mã và cây phân cấp

`khach_hang.hang` đang là chữ đọc được (`Bac`, `Vang`, `Kim cuong`) — đúng chuẩn
[thiết kế thuộc tính dimension](../skills/dimension-attribute-design.md). Thử làm hỏng:

```sql
create or replace table dim_khach_ma as
select khach_id, ho_ten,
       case hang when 'Bac' then 'B' when 'Vang' then 'V' else 'K' end hang_ma
from khach_hang;
```

Chạy báo cáo theo `hang_ma` rồi tự hỏi: người đọc có biết `K` là gì không? Và nếu nguồn
gõ lẫn `k` thường thì sao?

**Cây phân cấp:** `hang_hoa.nhom` mới có một tầng. Dựng cây hai tầng có nhánh nông:

```sql
create or replace table danh_muc as
select * from (values
  (1,'Thiet bi',null),(2,'Thiet bi nhap',1),(3,'Man hinh',1),(4,'May tinh',null)
) t(dm_id, ten, cha_id);
```

Gắn `SP-C` (laptop) thẳng vào `May tinh` (cấp 1), còn `SP-A`/`SP-D` vào `Thiet bi nhap`
(cấp 2). Dẹt thành `cap_1`/`cap_2` rồi báo cáo theo `cap_2` — bao nhiêu phần trăm doanh
thu rơi vào ô `NULL`? Xem [cây phân cấp](../skills/hierarchy.md) và
[case study báo cáo cấp 3](../case-studies/bao-cao-cap-3-mat-mot-nua.md).

| Kết quả của bạn |
|---|
| |

## Điểm chung: lỗi ở lab này đều làm **hụt**

| Bài | Hụt | Vì sao không ai thấy |
|---|---|---|
| 1 · khoá `NULL` | −17,3% | `JOIN` loại dòng, không báo |
| 4 · lọc `<>` | mất dòng `NULL` | Logic ba trị, `WHERE` chỉ giữ `TRUE` |
| 6 · cây dẹt | nhánh nông rơi vào `NULL` | BI ẩn nhóm `NULL` mặc định |

**Bất biến chung cho cả ba:** tổng của mọi nhóm phải bằng tổng của bảng. Không cộng lại
được nghĩa là có dòng đang rơi ra ngoài.

## Related Topics

- [Date dimension](../reference/date-dimension.md) — bài 1, 2
- [Role-playing dimension](../skills/role-playing-dimension.md) — bài 3
- [NULL trong fact và dimension](../skills/null-handling.md) — bài 4
- [Junk dimension](../skills/junk-dimension.md) — bài 5
- [Thiết kế thuộc tính dimension](../skills/dimension-attribute-design.md) · [Cây phân cấp](../skills/hierarchy.md) — bài 6
- [Lab nền tảng](lab-nen-tang-grain-fact-dim.md) — bốn cách làm phồng số
