---
title: Doanh thu phồng 67% vì join hai bảng fact
sidebar_position: 2
description: Đối chiếu đơn hàng với thanh toán bằng một câu join — tổng đơn hàng nhảy từ 1,5 triệu lên 2,5 triệu.
tags: [case-study, fact, grain, fan-trap, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Doanh thu phồng 67% vì join hai bảng fact

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. **Mọi con số chạy thật trên
> DuckDB.**

> **Chốt:** Hai fact khác grain join trực tiếp là **nhân bản dòng**. Bên "một" bị lặp
> theo số dòng của bên "nhiều", và mọi `sum()` trên bên đó phồng lên.

## Bối cảnh

Cần báo cáo *"đơn hàng nào đã thu đủ tiền chưa"*. Có hai bảng fact:

```sql
CREATE TABLE fct_don_hang AS SELECT * FROM (VALUES
 ('DH001', DATE '2026-07-01', 1000000),
 ('DH002', DATE '2026-07-02',  500000))
 AS t(ma_don, ngay, thanh_tien);          -- grain: MỘT ĐƠN

CREATE TABLE fct_thanh_toan AS SELECT * FROM (VALUES
 ('DH001','TT-1', 400000),
 ('DH001','TT-2', 600000),                 -- DH001 trả làm 2 lần
 ('DH002','TT-3', 500000))
 AS t(ma_don, ma_tt, so_tien);            -- grain: MỘT LẦN THANH TOÁN
```

Tổng thật, kiểm riêng từng bảng:

```text
┌──────────┬─────────┐
│ tong_don │ tong_tt │
├──────────┼─────────┤
│  1500000 │ 1500000 │
└──────────┴─────────┘
```

Khớp. Cả hai bên đều đúng.

## Triệu chứng

Câu join nghe hoàn toàn hợp lý:

```sql
SELECT sum(d.thanh_tien) AS tong_don_hang, sum(t.so_tien) AS tong_thanh_toan
FROM fct_don_hang d JOIN fct_thanh_toan t USING (ma_don);
```

```text
┌───────────────────┬─────────────────┐
│ tong_don_hang_SAI │ tong_thanh_toan │
├───────────────────┼─────────────────┤
│           2500000 │         1500000 │
└───────────────────┴─────────────────┘
```

**Doanh thu 1.500.000 thành 2.500.000** — phồng 67%. Trong khi tổng thanh toán vẫn đúng.

Điều làm nó khó chịu: *một* trong hai cột đúng. Nếu cả hai cùng sai thì đã nghi ngay.

## Giả thuyết sai lúc đầu

| Nghi | Vì sao nghĩ vậy | Thực tế |
|---|---|---|
| Dữ liệu thanh toán bị nhân bản | Tổng đơn hàng phồng | Không — tổng thanh toán vẫn đúng 1,5tr |
| Có đơn hàng trùng trong nguồn | Số cao hơn dự kiến | `count(distinct ma_don)` = 2, đúng |
| `JOIN` sai điều kiện | Phản xạ đầu tiên | `ma_don` đúng là khoá nối |
| Sai kiểu dữ liệu tiền | Hay gặp | Không liên quan |

Mất thời gian vì đi tìm **dữ liệu bẩn**. Dữ liệu sạch hoàn toàn — **câu query** mới sai.

## Nguyên nhân thật

Bung câu join ra để nhìn từng dòng:

```text
ma_don | thanh_tien | ma_tt | so_tien
DH001  |  1000000   | TT-1  | 400000    ← 1.000.000 xuất hiện lần 1
DH001  |  1000000   | TT-2  | 600000    ← 1.000.000 xuất hiện lần 2
DH002  |   500000   | TT-3  | 500000
```

`DH001` có **hai** lần thanh toán, nên dòng đơn hàng của nó bị lặp **hai** lần. `sum()`
cộng 1.000.000 hai lần → 2.000.000, cộng thêm 500.000 → 2.500.000.

Đây là **fan trap**: join một-nhiều rồi cộng ở phía "một".

Gốc rễ là [grain](../reference/grain.md): `fct_don_hang` có grain *một đơn*,
`fct_thanh_toan` có grain *một lần thanh toán*. Chúng **không cùng grain**, nên không
join trực tiếp được.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `unique` trên `ma_don` của `fct_don_hang` | ✅ xanh |
| `unique` trên `ma_tt` của `fct_thanh_toan` | ✅ xanh |
| `relationships` thanh toán → đơn hàng | ✅ xanh |
| `not_null` mọi cột | ✅ xanh |

Cả hai **bảng** đều hoàn hảo. Lỗi nằm ở **câu query đọc chúng** — mà test dbt chỉ kiểm
bảng, không kiểm query của người dùng cuối.

Đây là lý do bảng mart phải được dựng sẵn đúng cách, thay vì để mỗi người tự join.

## Cách sửa

**Cộng về cùng grain trước, rồi mới ghép:**

```sql
WITH tt AS (
  SELECT ma_don, sum(so_tien) AS da_tra
  FROM fct_thanh_toan GROUP BY 1        -- đưa về grain MỘT ĐƠN
)
SELECT sum(d.thanh_tien) AS tong_don_hang, sum(tt.da_tra) AS tong_thanh_toan
FROM fct_don_hang d JOIN tt USING (ma_don);
```

```text
┌───────────────┬─────────────────┐
│ tong_don_hang │ tong_thanh_toan │
├───────────────┼─────────────────┤
│       1500000 │         1500000 │
└───────────────┴─────────────────┘
```

Đúng cả hai. Nguyên tắc: **gộp bên "nhiều" về grain của bên "một" trước khi join.**

Cách thứ hai, khi cần so nhiều chiều: cộng riêng mỗi fact về **cùng một mức**, rồi ghép
theo dimension chung — gọi là *drill-across*, xem
[Conformed dimension](../skills/conformed-dimension.md).

## Dấu hiệu nhận ra sớm

1. Câu query có **hai bảng tên bắt đầu bằng `fct_`** trong cùng một `FROM`.
2. Có `sum()` trên cột của bảng ở phía "một" của quan hệ một-nhiều.
3. Tổng ra **lớn hơn** kỳ vọng nhưng là bội số kỳ lạ, không tròn.

**Phép thử rẻ nhất:** đếm số dòng trước và sau join. Tăng lên là đã nhân bản.

```sql
SELECT (SELECT count(*) FROM fct_don_hang) AS truoc,
       (SELECT count(*) FROM fct_don_hang d JOIN fct_thanh_toan t USING (ma_don)) AS sau;
```

## Related Topics

- [Grain](../reference/grain.md) — gốc rễ: hai fact khác grain
- [Fact và Dimension](../reference/fact-and-dimension.md) — vì sao không join fact với fact
- [Conformed dimension](../skills/conformed-dimension.md) — drill-across, cách ghép đúng
- [Bridge table](../skills/bridge-table.md) — nhân bản có chủ ý, và hệ số phân bổ để sửa
