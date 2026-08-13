---
title: Doanh thu phồng 67% vì join hai bảng fact
i18n_status: untranslated
sidebar_position: 2
description: Đối chiếu đơn hàng với thanh toán bằng một câu join — tổng nhảy từ 1,5 lên 2,5 triệu. Kèm ba dạng fan trap, header-detail và chasm trap.
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

## Ba dạng, nhận ra để tránh

Ca ở trên là dạng 1. Hai dạng còn lại cùng gốc nhưng triệu chứng khác nhau.

### Dạng 1 — Fan trap: một-nhiều, cộng ở phía "một"

Đã trình bày ở trên. Đặc điểm: **chỉ một trong hai cột sai**, nên dễ bị bỏ qua.

### Dạng 2 — Header ↔ detail: dạng hay gặp nhất thực tế

Đơn hàng có phí ship ở mức **đơn**, và các dòng hàng ở mức **dòng**:

```sql
CREATE TABLE fct_don  AS SELECT * FROM (VALUES
 ('DH1',30000),('DH2',50000)) AS t(ma_don, phi_ship);          -- grain: MỘT ĐƠN

CREATE TABLE fct_dong AS SELECT * FROM (VALUES
 ('DH1','SP-A',300000),('DH1','SP-B',200000),('DH1','SP-C',100000),
 ('DH2','SP-A',400000)) AS t(ma_don, ma_hang, thanh_tien);     -- grain: MỘT DÒNG
```

Phí ship thật: **80.000**. Join rồi cộng:

```text
┌──────────────┬───────────────┐
│ phi_ship_SAI │ hang_hoa_dung │
├──────────────┼───────────────┤
│       140000 │       1000000 │
└──────────────┴───────────────┘
```

`DH1` có 3 dòng hàng nên phí ship 30.000 bị cộng **ba lần**. Tiền hàng thì đúng, vì nó
vốn ở grain dòng.

Đây là dạng nguy hiểm nhất trong thực tế vì **hai bảng trông như phải join với nhau** —
chúng cùng mô tả một đơn hàng. Nhưng chúng ở hai grain khác nhau.

**Cách sửa:** không nhét phí ship vào cùng báo cáo với chi tiết hàng. Hoặc phân bổ phí
ship về mức dòng (theo tỷ trọng tiền hàng) — cùng ý tưởng với
[hệ số của bridge table](../skills/bridge-table.md).

### Dạng 3 — Chasm trap: hai fact **không liên quan**, nối qua dimension chung

Dạng tệ nhất, và cũng khó nhận ra nhất.

```sql
CREATE TABLE fct_ban    AS SELECT * FROM (VALUES
 ('KH1',1000000),('KH1',2000000),('KH2',500000)) AS t(ma_khach, doanh_thu);

CREATE TABLE fct_ho_tro AS SELECT * FROM (VALUES
 ('KH1',1),('KH1',1),('KH1',1),('KH2',1))       AS t(ma_khach, ticket);
```

Hai fact này **không có quan hệ gì với nhau** — một cái ghi giao dịch bán, một cái ghi
ticket hỗ trợ. Chúng chỉ tình cờ cùng tham chiếu `dim_khach_hang`.

Giá trị thật: doanh thu **3.500.000**, ticket **4**.

```sql
SELECT sum(b.doanh_thu), sum(h.ticket), count(*) AS so_dong_sau_join
FROM dim_kh k JOIN fct_ban b USING (ma_khach) JOIN fct_ho_tro h USING (ma_khach);
```

```text
┌───────────────┬────────────┬──────────────────┐
│ doanh_thu_SAI │ ticket_SAI │ so_dong_sau_join │
├───────────────┼────────────┼──────────────────┤
│       9500000 │          7 │                7 │
└───────────────┴────────────┴──────────────────┘
```

**Cả hai cột đều sai.** `KH1` có 2 dòng bán × 3 dòng hỗ trợ = **6 dòng tích Descartes**.

Khác biệt then chốt so với fan trap:

| | Fan trap | Chasm trap |
|---|---|---|
| Quan hệ hai fact | có (một-nhiều) | **không có** |
| Số cột bị sai | một | **cả hai** |
| Số dòng sau join | tổng | **tích** |
| Dễ nhận ra | vừa | **khó** — vì một cột sai thì còn nghi, hai cột cùng sai thì tưởng dữ liệu bẩn |

**Cách sửa** — cộng riêng từng fact về mức khách, rồi mới ghép:

```sql
WITH b AS (SELECT ma_khach, sum(doanh_thu) AS doanh_thu FROM fct_ban    GROUP BY 1),
     h AS (SELECT ma_khach, sum(ticket)    AS ticket    FROM fct_ho_tro GROUP BY 1)
SELECT sum(b.doanh_thu) AS doanh_thu, sum(h.ticket) AS ticket
FROM b FULL OUTER JOIN h USING (ma_khach);
```

```text
┌───────────┬────────┐
│ doanh_thu │ ticket │
├───────────┼────────┤
│   3500000 │      4 │
└───────────┴────────┘
```

`FULL OUTER JOIN` chứ không `JOIN`: khách chỉ mua mà chưa từng gọi hỗ trợ, hoặc ngược
lại, vẫn phải xuất hiện. Đây chính là **drill-across** — xem
[Conformed dimension](../skills/conformed-dimension.md).

### Luật chung cho cả ba dạng

> **Không bao giờ đặt hai bảng `fct_` trong cùng một `FROM` mà chưa gộp.**
> Cộng mỗi fact về cùng một mức trước, rồi mới ghép theo dimension chung.

## Dấu hiệu nhận ra sớm

1. Câu query có **hai bảng tên bắt đầu bằng `fct_`** trong cùng một `FROM` — dấu hiệu
   mạnh nhất, đúng cho cả ba dạng.
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
