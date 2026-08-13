---
title: Dashboard báo 800, query tay ra 1.000 — và trung bình lệch 50%
i18n_status: untranslated
sidebar_position: 12
description: "Bảng tổng hợp lưu sẵn avg rồi bị cộng lên một cấp, và không được nạp lại khi có đơn lùi ngày về."
tags: [case-study, aggregate, additivity, late-arriving, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Dashboard báo 800, query tay ra 1.000 — và trung bình lệch 50%

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** [bảng tổng hợp](../skills/aggregate-fact-table.md) là bản sao có thể sai lệch
> của fact chi tiết. Nó sai theo hai cách độc lập: lưu số **không cộng được**, và **trôi
> khỏi** atomic khi dữ liệu về muộn. Ca này dính cả hai.

## Bối cảnh

`fct_don` chi tiết chạy chậm cho dashboard, nên có thêm `agg_ngay` gộp theo ngày. Bảng
tổng hợp lưu doanh thu và **giá trị đơn trung bình** — vì dashboard hiển thị cả hai, tính
sẵn cho nhanh.

```sql
CREATE TABLE fct_don AS
SELECT * FROM (VALUES
  ('D1', DATE '2026-01-05', 100),
  ('D2', DATE '2026-01-05', 100),
  ('D3', DATE '2026-01-05', 100),
  ('D4', DATE '2026-01-06', 500)
) t(so_don, ngay, doanh_thu);

CREATE TABLE agg_ngay_sai AS
SELECT ngay, sum(doanh_thu) AS doanh_thu, avg(doanh_thu) AS tb_moi_don
FROM fct_don GROUP BY ngay;
```

```text
┌────────────┬───────────┬────────────┐
│    ngay    │ doanh_thu │ tb_moi_don │
├────────────┼───────────┼────────────┤
│ 2026-01-05 │       300 │      100.0 │
│ 2026-01-06 │       500 │      500.0 │
└────────────┴───────────┴────────────┘
```

Bảng này **đúng ở grain của nó**. Đó là điều làm ca này khó chịu.

## Triệu chứng thứ nhất — giá trị đơn trung bình lệch 50%

Dashboard tuần hiển thị giá trị đơn trung bình **300**. Phân tích viên query tay ra
**200**.

```sql
SELECT (SELECT round(avg(doanh_thu), 1) FROM fct_don)       AS tu_atomic,
       (SELECT round(avg(tb_moi_don), 1) FROM agg_ngay_sai) AS tu_agg_avg_cua_avg,
       round(100.0 * ((SELECT avg(tb_moi_don) FROM agg_ngay_sai)
                    - (SELECT avg(doanh_thu) FROM fct_don))
             / (SELECT avg(doanh_thu) FROM fct_don), 1)     AS lech_pct;
```

```text
┌───────────┬────────────────────┬──────────┐
│ tu_atomic │ tu_agg_avg_cua_avg │ lech_pct │
├───────────┼────────────────────┼──────────┤
│     200.0 │              300.0 │     50.0 │
└───────────┴────────────────────┴──────────┘
```

## Triệu chứng thứ hai — tổng cũng lệch

Ba tuần sau, một đơn lùi ngày về 05/01 mới vào kho ([late arriving fact](../skills/late-arriving.md)).
Fact atomic được nạp lại; bảng tổng hợp thì không ai đụng tới.

```sql
INSERT INTO fct_don VALUES ('D5', DATE '2026-01-05', 200);

SELECT (SELECT sum(doanh_thu) FROM fct_don)      AS atomic,
       (SELECT sum(doanh_thu) FROM agg_ngay_sai) AS bang_tong_hop,
       (SELECT sum(doanh_thu) FROM fct_don)
     - (SELECT sum(doanh_thu) FROM agg_ngay_sai) AS chenh,
       round(100.0 * ((SELECT sum(doanh_thu) FROM agg_ngay_sai)
                    - (SELECT sum(doanh_thu) FROM fct_don))
             / (SELECT sum(doanh_thu) FROM fct_don), 1) AS lech_pct;
```

```text
┌────────┬───────────────┬────────┬──────────┐
│ atomic │ bang_tong_hop │ chenh  │ lech_pct │
├────────┼───────────────┼────────┼──────────┤
│   1000 │           800 │    200 │    -20.0 │
└────────┴───────────────┴────────┴──────────┘
```

Dashboard: **800**. Query tay: **1.000**. Cả hai đều "chạy đúng trên bảng của mình".

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Phân tích viên viết query sai | Đọc lại: `avg(doanh_thu)` trên atomic — không có gì sai |
| Dashboard lọc thiếu ngày | Bỏ bộ lọc thời gian, vẫn lệch |
| Bảng tổng hợp nạp lỗi hôm đó | Log xanh, `agg_ngay` chạy đúng lịch mọi hôm |
| Múi giờ làm dòng rơi sang ngày khác | Kiểm biên ngày: không lệch |
| Cache của BI | Xoá cache: không đổi |

Chỗ mất thời gian: hai triệu chứng có **hai nguyên nhân khác nhau**, nhưng cùng xuất hiện
trên một dashboard nên bị điều tra như một sự cố. Mãi tới khi tách riêng "vì sao trung
bình lệch" khỏi "vì sao tổng lệch" thì mới ra.

## Nguyên nhân thật

### Nguyên nhân 1 — trung bình không cộng được

`avg` không phải fact additive. Cộng trung bình của các ngày lại rồi chia cho số ngày là
cho **mỗi ngày trọng số bằng nhau**, bất kể ngày đó có 3 đơn hay 1 đơn.

- Đúng: (100+100+100+500) / 4 = **200**
- Bảng tổng hợp: (100 + 500) / 2 = **300**

Ngày 05/01 có 3 đơn nhưng bị tính ngang một ngày có 1 đơn. Xem phần additivity ở
[Fact và Dimension](../reference/fact-and-dimension.md).

### Nguyên nhân 2 — cửa sổ nạp lại không khớp nhau

`fct_don` nạp lại 30 ngày gần nhất; `agg_ngay` chỉ dựng cho ngày hôm qua. Mọi dòng về
muộn quá một ngày đều vào atomic mà không bao giờ vào bảng tổng hợp. Hai lớp **trôi dần
khỏi nhau**, và độ lệch chỉ tăng chứ không tự sửa.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null`, `unique` trên `agg_ngay.ngay` | ✅ xanh |
| `agg_ngay` có đủ mọi ngày trong kỳ | ✅ xanh |
| `doanh_thu > 0` | ✅ xanh |
| `fct_don` khớp hệ nguồn | ✅ xanh |
| `agg_ngay` khớp `fct_don` | ❌ — **không ai viết test này** |

Bốn test đầu kiểm `agg_ngay` **tự nó**. Không cái nào kiểm quan hệ giữa hai bảng — và đó
chính là chỗ duy nhất lỗi tồn tại.

Đây là đặc điểm chung của mọi dữ liệu dẫn xuất: **bất biến nằm ở quan hệ với nguồn, không
nằm trong bản thân bảng.**

## Cách sửa

### Sửa 1 — chỉ lưu số cộng được

Dựng lại bảng tổng hợp, lần này chỉ với số cộng được:

```sql
CREATE TABLE agg_ngay AS
SELECT ngay, sum(doanh_thu) AS doanh_thu, count(*) AS so_don
FROM fct_don GROUP BY ngay;

SELECT sum(doanh_thu) AS doanh_thu, sum(so_don) AS so_don,
       round(sum(doanh_thu) * 1.0 / sum(so_don), 1) AS tb_moi_don
FROM agg_ngay;
```

```text
┌───────────┬────────┬────────────┐
│ doanh_thu │ so_don │ tb_moi_don │
├───────────┼────────┼────────────┤
│      1000 │      5 │      200.0 │
└───────────┴────────┴────────────┘
```

Đối chiếu với atomic:

```sql
SELECT round(avg(doanh_thu), 1) AS tb_tu_atomic FROM fct_don;
```

```text
┌──────────────┐
│ tb_tu_atomic │
├──────────────┤
│        200.0 │
└──────────────┘
```

Lưu **tử số và mẫu số**, chia lúc đọc. Trung bình giờ khớp atomic ở mọi cấp gộp.

### Sửa 2 — query đối soát, chạy sau mỗi lần nạp

Bảng vừa dựng lại nên đang khớp. Giả lập dòng về muộn **tiếp theo** — vì sẽ luôn có dòng
tiếp theo:

```sql
INSERT INTO fct_don VALUES ('D6', DATE '2026-01-06', 400);

SELECT a.ngay, a.doanh_thu AS agg, f.doanh_thu AS atomic,
       f.doanh_thu - a.doanh_thu AS chenh
FROM agg_ngay a
FULL JOIN (SELECT ngay, sum(doanh_thu) AS doanh_thu FROM fct_don GROUP BY ngay) f
  USING (ngay)
WHERE coalesce(a.doanh_thu, 0) <> coalesce(f.doanh_thu, 0);
```

```text
┌────────────┬────────┬────────┬────────┐
│    ngay    │  agg   │ atomic │ chenh  │
├────────────┼────────┼────────┼────────┤
│ 2026-01-06 │    500 │    900 │    400 │
└────────────┴────────┴────────┴────────┘
```

Không trả về dòng nào là hai lớp khớp. Trả về dòng nào thì đó chính là ngày phải nạp lại.
Đặt thành test dbt `severity: error` — xem
[Triển khai test](../../etl/dbt/skills/implementing-tests.md).

### Sửa 3 — cửa sổ nạp lại của bảng tổng hợp ≥ cửa sổ của atomic

Nếu atomic nạp lại 30 ngày thì bảng tổng hợp cũng phải dựng lại 30 ngày. Hẹp hơn là **bảo
đảm sẽ trôi**.

| | Trước | Sau |
|---|---|---|
| Giá trị đơn trung bình | 300 (**lệch 50%**) | 200 |
| Tổng trên dashboard | 800 (**lệch −20%**) | 1.000 |
| Phát hiện lệch bằng | Người dùng báo | Test CI |
| Cột lưu trong agg | `sum`, `avg` | `sum`, `count` |

## Dấu hiệu nhận ra sớm

1. Trong DDL của bất kỳ bảng `agg_`/`rollup_` nào có `avg(`, `median(`, hoặc
   `count(DISTINCT`. Cả ba đều không cộng được:

```bash
grep -rn "avg(\|median(\|count(distinct" models/marts/agg_*.sql
```

2. Có bảng tổng hợp mà **không có** query đối soát với atomic.

3. Cửa sổ nạp lại của bảng tổng hợp hẹp hơn của fact atomic.

4. Người dùng hỏi *"sao số trên dashboard khác số tôi query"* — câu hỏi này gần như luôn
   là triệu chứng của lệch giữa hai lớp, không phải của lỗi query.

## Related Topics

- [Aggregate fact table](../skills/aggregate-fact-table.md) — hai luật bị vi phạm ở đây
- [Fact và Dimension](../reference/fact-and-dimension.md) — additivity: cột nào được vào bảng tổng hợp
- [Dữ liệu về muộn](../skills/late-arriving.md) — nguyên nhân làm hai lớp trôi khỏi nhau
- [CS: fact về muộn bị gán sai khu vực](fact-den-muon-gan-sai-khu-vuc.md) — cùng gốc, khác hậu quả
