---
title: Một nửa số đơn biến mất khỏi báo cáo
sidebar_position: 6
description: Fact có ba cột ngày, join cả ba vào dim_thoi_gian — mọi đơn chưa giao xong bị loại sạch, không lỗi nào báo.
tags: [case-study, role-playing-dimension, join, null-handling, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Một nửa số đơn biến mất khỏi báo cáo

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. **Con số chạy thật trên DuckDB.**

> **Chốt:** `JOIN` thường với dimension **loại bỏ mọi dòng có khoá `NULL`**. Fact có cột
> ngày chưa xảy ra (ngày giao của đơn đang giao) thì join là mất sạch nhóm đó — và nhóm
> bị mất thường là nhóm **quan trọng nhất**.

## Bối cảnh

`fct_don_hang` có ba vai của `dim_thoi_gian`: ngày đặt, ngày giao, ngày thanh toán —
đúng mô hình [role-playing dimension](../skills/role-playing-dimension.md).

```sql
CREATE TABLE fct AS SELECT * FROM (VALUES
 ('DH1',20260701,20260705),
 ('DH2',20260702,20260706),
 ('DH3',20260703,NULL),        -- dang giao
 ('DH4',20260704,NULL))        -- dang giao
 AS t(ma_don, ngay_dat_sk, ngay_giao_sk);
```

Bốn đơn:

```text
┌──────────┐
│ tong_don │
├──────────┤
│        4 │
└──────────┘
```

## Triệu chứng

Báo cáo "đơn theo tháng đặt và tháng giao" — join cả hai vai:

```sql
SELECT count(*) AS con_lai FROM fct f
JOIN dim_ngay d1 ON f.ngay_dat_sk = d1.ngay_sk
JOIN dim_ngay d2 ON f.ngay_giao_sk = d2.ngay_sk;
```

```text
┌─────────┐
│ con_lai │
├─────────┤
│       2 │
└─────────┘
```

**Bốn đơn thành hai.** Mất đúng 50%.

Và nhóm bị mất không ngẫu nhiên — đó là **toàn bộ đơn đang giao**. Tức là báo cáo vận
hành, thứ dùng để theo dõi việc đang chạy, lại là báo cáo **không thấy việc đang chạy**.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| `dim_thoi_gian` thiếu ngày | Kiểm: có đủ dải ngày |
| Fact nạp thiếu | `count(*)` fact = 4, đúng |
| Bộ lọc ngày trong báo cáo | Không có bộ lọc nào |
| Đơn bị xoá ở nguồn | Không |

Rất khó nghi vì **cả hai bảng đều đầy đủ**. Số chỉ hụt *sau khi join*, mà join thì trông
hoàn toàn bình thường — không ai đọc `JOIN ... ON` mà nghĩ tới `NULL`.

Bẫy phụ: nếu chỉ join **một** vai thì số vẫn đúng. Lỗi chỉ xuất hiện khi join vai thứ
hai — vai của sự kiện **chưa xảy ra**.

## Nguyên nhân thật

`ngay_giao_sk` là `NULL` với đơn chưa giao. `JOIN ... ON f.ngay_giao_sk = d2.ngay_sk`
không bao giờ khớp với `NULL` — `NULL = bất kỳ` cho ra `NULL`, không phải `true`.

Đây là hệ quả trực tiếp của luật ba trị trong SQL, cùng gốc với bẫy `<>` ở
[Phát hiện thay đổi cho SCD 2](../skills/scd-change-detection.md).

Điểm khiến nó thành lỗi thiết kế chứ không chỉ lỗi query: **mô hình chiều cổ điển giả
định mọi khoá ngoại đều có giá trị.** Fact ghi lại một quy trình *đang diễn ra* thì giả
định đó sai — và không có gì trong mô hình cảnh báo điều đó.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` trên `ngay_giao_sk` | ❌ **không khai được** — null là hợp lệ ở đây |
| `relationships` `ngay_giao_sk` → `dim_ngay` | ✅ xanh — dbt bỏ qua null |
| `count(*)` của fact | ✅ đúng 4 |
| `count(*)` của dimension | ✅ đúng |

Cả hai bảng đều hoàn hảo. Lỗi sinh ra **lúc đọc**, không lúc ghi — giống hệt ca
[join hai fact](join-hai-fact-lam-phong-tong.md).

Đó là lý do mart nên được dựng sẵn đúng cách thay vì để mỗi người tự join.

## Cách sửa

**Cách 1 — `LEFT JOIN` cho vai của sự kiện chưa chắc xảy ra:**

```sql
SELECT count(*) AS con_lai FROM fct f
JOIN      dim_ngay d1 ON f.ngay_dat_sk  = d1.ngay_sk   -- ngày đặt: luôn có
LEFT JOIN dim_ngay d2 ON f.ngay_giao_sk = d2.ngay_sk;  -- ngày giao: có thể chưa
```

```text
┌─────────┐
│ con_lai │
├─────────┤
│       4 │
└─────────┘
```

**Cách 2 — dòng "chưa xác định" trong dimension.** Thêm một dòng khoá `-1` nghĩa là
*chưa xảy ra*, và fact dùng `-1` thay cho `NULL`:

```text
ngay_sk | ngay       | ghi_chu
-1      | NULL       | Chưa xảy ra
20260701| 2026-07-01 | ...
```

Cách 2 tốt hơn cho hệ thống lớn: `JOIN` thường vẫn dùng được ở mọi nơi, không phụ thuộc
người viết query nhớ dùng `LEFT JOIN`. Đổi lại phải xử lý `-1` lúc nạp fact.

**Quy tắc chung:** vai nào ứng với sự kiện **có thể chưa xảy ra** thì hoặc `LEFT JOIN`,
hoặc có dòng "chưa xác định". Không có lựa chọn thứ ba.

## Dấu hiệu nhận ra sớm

1. Fact có cột khoá ngoại **cho phép `NULL`** — nhất là các cột `ngay_*_sk` của bước sau
   trong quy trình.
2. Fact là **accumulating snapshot** (theo dõi một quy trình nhiều bước) — loại fact này
   gần như luôn có cột chưa điền.
3. Báo cáo vận hành ra số **nhỏ hơn** cảm nhận, nhưng không ai chứng minh được.

Kiểm rẻ nhất, chạy trước mọi báo cáo dùng nhiều vai:

```sql
SELECT count(*) AS tong,
       count(ngay_giao_sk) AS co_ngay_giao,
       count(*) - count(ngay_giao_sk) AS chua_giao
FROM fct;
```

`chua_giao > 0` nghĩa là mọi `JOIN` thường trên cột đó đang âm thầm lọc bỏ nhóm này.

## Related Topics

- [Role-playing dimension](../skills/role-playing-dimension.md) — nhiều vai trong một fact
- [Fact và Dimension](../reference/fact-and-dimension.md) — accumulating snapshot và cột chưa điền
- [Phát hiện thay đổi cho SCD 2](../skills/scd-change-detection.md) — cùng gốc: `NULL` trong so sánh
- [Doanh thu phồng vì join hai fact](join-hai-fact-lam-phong-tong.md) — cũng là lỗi sinh lúc đọc
