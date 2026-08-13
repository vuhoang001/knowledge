---
title: "Lab vận hành — khi số sai, mất bao lâu để biết dòng nào sai"
i18n_status: untranslated
sidebar_position: 7
description: "Nạp trùng phồng 25%; không có audit dimension thì xoá theo ngày mất 5 dòng tốt trên 10; phân vùng nóng và bảng nhiều loại thực thể."
tags: [tutorial, audit-dimension, real-time, heterogeneous-schema, data-quality, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Lab vận hành — khi số sai, mất bao lâu để biết dòng nào sai

> **Chốt:** năm lab trước hỏi *"mô hình đúng chưa"*. Lab này hỏi câu khác: **dữ liệu sẽ
> sai — khi đó bạn mất bao lâu để biết dòng nào sai và xoá đúng chừng đó?**

## Bài 1 — Nạp trùng: phồng 25%

Mô phỏng đúng ca thật: job đêm lỗi giữa chừng, người trực chạy lại tay nhưng nhầm lô.

```sql
create or replace table fct_audit as select *, 1 as audit_sk from don_hang_chi_tiet;
insert into fct_audit select *, 3 from don_hang_chi_tiet where don_hang_id in ('DH001','DH003');
```

```text
┌────────────────┬───────────┬───────────┬────────────────┬───────────┐
│ dong_trong_kho │ dong_that │ doanh_thu │ doanh_thu_that │ phong_pct │
├────────────────┼───────────┼───────────┼────────────────┼───────────┤
│             20 │        15 │  12765000 │       10215000 │      25.0 │
└────────────────┴───────────┴───────────┴────────────────┴───────────┘
```

Chẩn đoán thường nhanh — có người nhớ mình đã chạy lại tay. **Phần đắt là câu tiếp
theo: xoá cái gì?**

## Bài 2 — Không có `audit_sk`: xoá 10 dòng để diệt 5

Nếu fact không mang dấu vết lần chạy, thông tin duy nhất còn lại là **đơn hàng nào**.
Nên cách xoá duy nhất là theo khoảng:

```sql
select count(*) dong_bi_xoa,
       count(*) filter (where audit_sk = 3)  thuc_su_la_rac,
       count(*) filter (where audit_sk <> 3) xoa_nham_dong_tot
from fct_audit where don_hang_id in ('DH001','DH003');
```

```text
┌─────────────┬────────────────┬───────────────────┐
│ dong_bi_xoa │ thuc_su_la_rac │ xoa_nham_dong_tot │
├─────────────┼────────────────┼───────────────────┤
│          10 │              5 │                 5 │
└─────────────┴────────────────┴───────────────────┘
```

**Một nửa số dòng bị xoá là dòng tốt.** Rồi phải nạp lại phần xoá nhầm, và trong lúc đó
báo cáo hụt. Sự cố nhỏ thành nửa ngày.

**Lưu ý:** `unique` trên khoá **có** đỏ trong ca này — nhưng nó chỉ nói *"có trùng"*,
không nói **dòng nào là bản thừa**. Với hai dòng giống hệt nhau ở mọi cột, không thông
tin nào trong bảng phân biệt được chúng. Đây **không phải lỗi thiếu test mà là lỗi thiếu
metadata**.

| Kết quả của bạn |
|---|
| |

## Bài 3 — Có `audit_sk`: một câu lệnh, đúng 5 dòng

```sql
select audit_sk, count(*) dong, sum(so_luong*don_gia) doanh_thu
from fct_audit group by 1 order by 1;
```

```text
┌──────────┬───────┬───────────┐
│ audit_sk │ dong  │ doanh_thu │
├──────────┼───────┼───────────┤
│        1 │    15 │  10215000 │
│        3 │     5 │   2550000 │
└──────────┴───────┴───────────┘
```

```sql
delete from fct_audit where audit_sk = 3;   -- dung 5 dong, khong dung dong nao khac
```

**Việc cần làm:** dựng `dim_audit(audit_sk, ma_lan_chay, thoi_diem_chay, file_nguon,
so_dong_nguon)`, rồi viết query **phát hiện tự động** một lô bị nạp hai lần:

```sql
select file_nguon, count(*) so_lan_nap from dim_audit group by 1 having count(*) > 1;
```

Câu này chạy được **ngay sau khi nạp**, trước khi ai kịp nhìn dashboard. Xem
[audit dimension](../skills/audit-dimension.md) và
[case study nạp hai lần](../case-studies/nap-hai-lan-khong-truy-duoc.md).

| Kết quả của bạn |
|---|
| |

## Bài 4 — Đẳng thức khép kín: nạp + loại = nguồn

Dựng `fct_loi` cho dòng bị loại, với `chieu_chat_luong` theo
[sáu chiều chất lượng](../../data-quality/six-dimensions.md):

```sql
create or replace table fct_loi as
select * from (values
  (1,'DH-X1','khach_id rong','completeness'),
  (2,'DH-X2','so_tien am','validity')
) t(audit_sk, ma_dong, ly_do, chieu_chat_luong);
```

Rồi kiểm bất biến mạnh nhất của cả pipeline:

```sql
select (select count(*) from fct_audit) da_nap,
       (select count(*) from fct_loi)   bi_loai,
       (select count(*) from fct_audit) + (select count(*) from fct_loi) cong_lai;
```

Nó **không thể đúng một cách tình cờ**. `WHERE cot IS NOT NULL` rồi đi tiếp thì dữ liệu
bị loại **bốc hơi không dấu vết** — không ai biết mất bao nhiêu, và tỷ lệ có tăng không.

| Kết quả của bạn |
|---|
| |

## Bài 5 — Phân vùng nóng: chỉ số nhảy suốt ngày

Thêm dữ liệu "hôm nay chưa chốt":

```sql
create or replace table fct_hom_nay as
select 'DH999' don_hang_id, current_date ngay, 500000 doanh_thu, false da_chot;
```

Rồi tính "doanh thu trung bình mỗi ngày" gộp cả lịch sử lẫn hôm nay.

**Việc cần làm:** chạy câu đó, ghi lại kết quả. Thêm một dòng nữa cho hôm nay, chạy lại.
Con số đổi — dù không ngày lịch sử nào thay đổi.

Nguyên nhân: mẫu số `count(distinct ngay)` đếm hôm nay là **một ngày trọn vẹn**, trong
khi nó mới đầy một phần. Cách sửa: mang cột `da_chot` tới tận lớp báo cáo, và chỉ tính
chỉ số ổn định trên ngày đã chốt.

Xem [real-time fact table](../skills/real-time-fact.md) và
[case study số hôm nay nhảy suốt ngày](../case-studies/so-hom-nay-nhay-suot-ngay.md).

| Kết quả của bạn |
|---|
| |

## Bài 6 — Bảng gộp nhiều loại thực thể

`hang_hoa` hiện chỉ có hàng vật lý. Thêm một **dịch vụ** — nó không có trọng lượng, còn
hàng vật lý thì không có thời hạn:

```sql
create or replace table san_pham_gop as
select * from (values
  ('SP-A','Ban phim co','Hang hoa',   0.9,  null),
  ('SP-C','Laptop',     'Hang hoa',   1.8,  null),
  ('DV-1','Bao hanh 12t','Dich vu',   null, 12),
  ('DV-2','Cai dat tai nha','Dich vu',null, 1)
) t(ma, ten, loai, trong_luong_kg, thoi_han_thang);
```

**Việc cần làm:** đo tỷ lệ ô trống. Rồi tách supertype (`ma`, `ten`, `loai` — mọi loại
đều có) và subtype (mỗi loại một bảng, thuộc tính riêng). Sau khi tách, câu ràng buộc nào
mới đặt được mà trước không?

<details>
<summary>Đáp án</summary>

`NOT NULL` trên `trong_luong_kg` của bảng hàng hoá, và trên `thoi_han_thang` của bảng
dịch vụ. Trên bảng gộp thì **không cột nào** đặt được, vì `NULL` hợp lệ ở phần lớn cột —
mất tầng kiểm tra rẻ nhất trong kho.

</details>

Xem [thực thể không đồng nhất](../skills/heterogeneous-schema.md) và
[case study dim_san_pham 67% ô trống](../case-studies/bang-san-pham-hai-phan-ba-o-trong.md).

| Kết quả của bạn |
|---|
| |

## Ba tầng bảo vệ — lab này là tầng thứ ba

| Tầng | Công cụ | Trả lời |
|---|---|---|
| Chặn trước | `contract`, `not_null`, `unique` | Dữ liệu sai có được vào không |
| Phát hiện | `dbt test` | Sau khi nạp, có bất thường không |
| **Truy vết** | **audit dimension + error schema** | **Dòng nào, do lần chạy nào, vì sao bị loại** |

Hai tầng đầu là câu hỏi có/không. Tầng ba quyết định sự cố mất **mười phút hay nửa ngày**.

## Related Topics

- [Audit dimension và error event schema](../skills/audit-dimension.md) — bài 1–4
- [Real-time fact table](../skills/real-time-fact.md) — bài 5
- [Thực thể không đồng nhất](../skills/heterogeneous-schema.md) — bài 6
- [Six dimensions of data quality](../../data-quality/six-dimensions.md) — nhãn cho `fct_loi`
- [Triển khai test trong dbt](../../etl/dbt/skills/implementing-tests.md) — hai tầng đầu
