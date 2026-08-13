---
title: "Lab nền tảng — grain, fact/dimension, khoá: bốn cách làm phồng số"
i18n_status: untranslated
sidebar_position: 3
description: "Tự tay tái hiện bốn ca phồng số kinh điển trên cùng một bộ dữ liệu, rồi sửa từng cái — mọi con số chạy thật."
tags: [tutorial, grain, fact, dimension, surrogate-key, degenerate-dimension, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Lab nền tảng — grain, fact/dimension, khoá: bốn cách làm phồng số

> **Chốt:** bốn bài dưới đây đều làm doanh thu phồng lên, đều **không có lỗi nào báo**,
> và đều bắt nguồn từ một câu chưa trả lời: *một dòng của bảng này là cái gì*.

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt
./.venv/bin/dbt seed --profiles-dir .
```

Bốn số gốc — **chép ra giấy**, mọi bài dưới đây đối chiếu với chúng:

```text
┌───────┬──────────┬───────────┬──────────┐
│  don  │ dong_don │ doanh_thu │ phi_ship │
├───────┼──────────┼───────────┼──────────┤
│    10 │       15 │  10215000 │   400000 │
└───────┴──────────┴───────────┴──────────┘
```

Mở DuckDB trên chính file lab:

```bash
./.venv/bin/python -c "import duckdb; duckdb.connect('lab.duckdb').sql('...').show()"
```

## Bài 1 — Đo grain, đừng đoán

Đừng nhìn tên bảng rồi suy. Đếm:

```sql
select count(*) so_dong,
       count(distinct don_hang_id) so_don,
       count(distinct (don_hang_id, dong)) so_khoa_to_hop
from don_hang_chi_tiet;
```

```text
┌─────────┬────────┬────────────────┐
│ so_dong │ so_don │ so_khoa_to_hop │
├─────────┼────────┼────────────────┤
│      15 │     10 │             15 │
└─────────┴────────┴────────────────┘
```

`so_khoa_to_hop` bằng `so_dong` → grain là **`(don_hang_id, dong)`**.
`so_don` chỉ 10 → `don_hang_id` **không** phải khoá.

Viết grain thành một câu tiếng Việt rồi mới đi tiếp:

> *"Một dòng của `don_hang_chi_tiet` là **một dòng hàng trong một đơn hàng**."*

| Kết quả của bạn |
|---|
| |

**Việc cần làm:** đặt test `unique` lên `don_hang_id` trong `schema.yml`, chạy
`dbt test`. Nó FAIL. Dữ liệu sai hay test sai? Xem [Grain](../reference/grain.md).

## Bài 2 — Trộn hai grain: phí ship phồng 77,5%

`don_hang` có `phi_ship` ở **cấp đơn**. `don_hang_chi_tiet` ở **cấp dòng**. Join rồi cộng:

```sql
select sum(h.phi_ship) phi_ship_bao_cao
from don_hang h join don_hang_chi_tiet ct using (don_hang_id);
```

```text
┌──────────────────┬───────────────┬───────────┐
│ phi_ship_bao_cao │ phi_ship_that │ phong_pct │
├──────────────────┼───────────────┼───────────┤
│           710000 │        400000 │      77.5 │
└──────────────────┴───────────────┴───────────┘
```

Nhưng `sum(so_luong*don_gia)` trong cùng câu đó vẫn **đúng** 10.215.000.

> **Một cột đúng, một cột sai, trong cùng một bảng.** Người kiểm thấy doanh thu khớp
> nên tin cả bảng.

**Việc cần làm:** đơn nào bị nhân nhiều nhất? (gợi ý: `DH003` có 3 dòng). Cách sửa là
phân bổ theo tỷ trọng — xem [header/line và phân bổ fact](../skills/allocated-facts.md)
và [case study phí ship phồng 133%](../case-studies/phi-ship-phong-133-phan-tram.md).

| Kết quả của bạn |
|---|
| |

## Bài 3 — Join thẳng hai fact: vừa phồng vừa mất

```sql
select count(*) dong_sau_join, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang_chi_tiet ct join tra_hang t using (don_hang_id);
```

```text
┌───────────────┬────────────────────┬────────────────┐
│ dong_sau_join │ doanh_thu_sau_join │ doanh_thu_that │
├───────────────┼────────────────────┼────────────────┤
│             9 │            6750000 │       10215000 │
└───────────────┴────────────────────┴────────────────┘
```

Con số 6.750.000 **không phải doanh thu của bất kỳ thứ gì**:

- `DH003` bị trả **hai lần** → các dòng của nó đếm đôi
- 7 đơn **không có** dòng trả hàng → biến mất khỏi kết quả

Hai lỗi ngược chiều, nên tổng vừa phồng vừa hụt, và không ai đoán được hướng.

Cách đúng — gộp riêng từng bên **về cùng một mức** rồi mới ghép:

```sql
with ban as (select don_hang_id, sum(so_luong*don_gia) dt from don_hang_chi_tiet group by 1),
     tra as (select don_hang_id, sum(gia_tri_tra) tra from tra_hang group by 1)
select coalesce(sum(ban.dt),0) doanh_thu, coalesce(sum(tra.tra),0) gia_tri_tra
from ban full join tra using (don_hang_id);
```

```text
┌───────────┬─────────────┐
│ doanh_thu │ gia_tri_tra │
├───────────┼─────────────┤
│  10215000 │     1500000 │
└───────────┴─────────────┘
```

Khớp nguồn. Đây là **multipass SQL** — xem
[conformed dimension](../skills/conformed-dimension.md#kỹ-thuật-này-có-tên-multipass-sql)
và [case study join hai fact](../case-studies/join-hai-fact-lam-phong-tong.md).

**Việc cần làm:** đổi `FULL JOIN` thành `INNER JOIN` rồi chạy lại. Mất mấy đơn? Vì sao
`FULL` mới đúng?

| Kết quả của bạn |
|---|
| |

## Bài 4 — Dựng dimension cho số đơn hàng: phồng 44,1%

Phản xạ "mọi khoá trong fact phải trỏ tới một dimension" dẫn tới `dim_don_hang`. Đo trước:

```sql
select (select count(*) from don_hang) dong_dim,
       (select count(*) from don_hang_chi_tiet) dong_fact;
```

```text
┌──────────┬───────────┬────────┐
│ dong_dim │ dong_fact │ ty_le  │
├──────────┼───────────┼────────┤
│       10 │        15 │   0.67 │
└──────────┴───────────┴────────┘
```

Tỷ lệ **0,67** — một dimension đúng nghĩa phải nhỏ hơn fact vài bậc độ lớn. Đã đáng nghi.

Giờ làm điều ai cũng làm tiếp: bảng trống trải quá nên nhét `trang_thai` vào, và vì
trạng thái đổi theo thời gian nên bật Type 2:

```sql
create or replace table dim_don_type2 as
select * from (values
 ('DH003','moi'),('DH003','dang_giao'),('DH003','hoan_thanh'),
 ('DH001','moi'),('DH001','hoan_thanh'),
 ('DH002','hoan_thanh'),('DH004','dang_giao'),('DH005','hoan_thanh'),
 ('DH006','moi'),('DH007','hoan_thanh'),('DH008','dang_giao'),
 ('DH009','moi'),('DH010','hoan_thanh')
) t(don_hang_id, trang_thai);
```

```text
┌──────────┬─────────────┬────────────────────┬────────────────┬───────────┐
│ dong_dim │ so_don_that │ doanh_thu_sau_join │ doanh_thu_that │ phong_pct │
├──────────┼─────────────┼────────────────────┼────────────────┼───────────┤
│       13 │          10 │           14715000 │       10215000 │      44.1 │
└──────────┴─────────────┴────────────────────┴────────────────┴───────────┘
```

**Dimension giờ nhiều dòng hơn số đơn thật** (13 vs 10) — dấu hiệu nhìn thấy bằng mắt.

Cách sửa: `don_hang_id` ở lại fact như một cột thường
([degenerate dimension](../skills/degenerate-dimension.md)); trạng thái thành dimension
nhỏ riêng; còn lịch sử quy trình thì thuộc về **accumulating snapshot**, không thuộc
dimension. Xem [case study dim đơn hàng phồng 40%](../case-studies/dim-don-hang-lam-phong-doanh-thu.md).

| Kết quả của bạn |
|---|
| |

## Bài 5 — Join dimension Type 2 bằng natural key: phồng 26,9%

Cần làm [lab SCD](scd-bang-dbt-snapshot.md) trước để có `scd_khach_hang` với `C1` hai
phiên bản.

```sql
select sum(ct.so_luong*ct.don_gia) doanh_thu, count(*) dong_sau_join
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
join scd_khach_hang d on d.khach_id = h.khach_id;   -- thieu dieu kien thoi gian
```

```text
┌────────────────────┬────────────────┬───────────────┬───────────┐
│ doanh_thu_sau_join │ doanh_thu_that │ dong_sau_join │ dong_that │
├────────────────────┼────────────────┼───────────────┼───────────┤
│           12960000 │       10215000 │            22 │        15 │
└────────────────────┴────────────────┴───────────────┴───────────┘
```

Xem lỗi rơi vào ai:

```text
┌──────────┬──────────────┬───────────────┐
│ khach_id │ so_phien_ban │ dong_sau_join │
├──────────┼──────────────┼───────────────┤
│ C1       │            2 │            14 │  ← 7 dong that, nhan doi
│ C2       │            1 │             4 │
│ C3       │            1 │             2 │
│ C4       │            1 │             2 │
└──────────┴──────────────┴───────────────┘
```

Chỉ `C1` bị nhân đôi — đúng bằng số phiên bản của nó. Đó là lý do fact phải trỏ vào
**surrogate key của đúng phiên bản**, không phải natural key. Xem
[Surrogate key](../reference/surrogate-key.md).

| Kết quả của bạn |
|---|
| |

## Điểm chung của cả năm bài

| Bài | Phồng | Có gì báo lỗi không |
|---|---|---|
| 2 · trộn hai grain | +77,5% (chỉ cột `phi_ship`) | Không — cột kia vẫn đúng |
| 3 · join hai fact | vừa phồng vừa hụt | Không |
| 4 · dim có grain bằng fact | +44,1% | Không |
| 5 · join Type 2 bằng natural key | +26,9% | Không |

**Không ca nào có test đỏ.** SQL chạy, pipeline xanh, số sai. Đó là lý do phép kiểm
`count(*) = count(distinct <khoá grain>)` phải chạy **trước** mọi phép cộng.

## Related Topics

- [Grain](../reference/grain.md) — bài 1 và bài 2
- [Fact và Dimension](../reference/fact-and-dimension.md) — cột nào thuộc bảng nào
- [Degenerate dimension](../skills/degenerate-dimension.md) — bài 4
- [Surrogate key](../reference/surrogate-key.md) — bài 5
- [SCD Type 2 bằng dbt snapshot](scd-bang-dbt-snapshot.md) — dựng `scd_khach_hang` dùng ở bài 5
- [Star schema bằng SQL thuần](star-schema-duckdb.md) — dựng lại mô hình đúng từ đầu
