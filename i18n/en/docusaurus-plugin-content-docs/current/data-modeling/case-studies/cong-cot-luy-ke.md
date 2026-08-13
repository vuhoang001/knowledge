---
title: Cột luỹ kế bị kéo vào ô "tổng" — doanh thu phồng 2,13 lần
i18n_status: untranslated
sidebar_position: 20
description: "Cột YTD lưu sẵn trong fact trông y hệt cột doanh thu thường, và người dùng BI kéo cả hai vào cùng một chỗ."
tags: [case-study, year-to-date, additivity, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Cột luỹ kế bị kéo vào ô "tổng" — doanh thu phồng 2,13 lần

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** `doanh_thu_ytd` là số **non-additive theo thời gian** nằm ngay cạnh một số
> additive, và **trông y hệt nó**. Xem
> [year-to-date và timespan](../skills/ytd-timespan-facts.md).

## Bối cảnh

Ban giám đốc muốn xem luỹ kế từ đầu năm. Công cụ BI đang dùng không hỗ trợ window
function, nên đội dữ liệu tính sẵn và lưu vào fact — một quyết định hợp lý ở thời điểm đó.

```sql
CREATE TABLE fct_thang AS
SELECT thang, doanh_thu,
       sum(doanh_thu) OVER (ORDER BY thang) AS doanh_thu_ytd
FROM (VALUES (1, 100), (2, 200), (3, 150), (4, 300)) t(thang, doanh_thu);
```

```text
┌───────┬───────────┬───────────────┐
│ thang │ doanh_thu │ doanh_thu_ytd │
├───────┼───────────┼───────────────┤
│     1 │       100 │           100 │
│     2 │       200 │           300 │
│     3 │       150 │           450 │
│     4 │       300 │           750 │
└───────┴───────────┴───────────────┘
```

Bảng này **đúng ở mọi dòng**. Dashboard luỹ kế chạy tốt sáu tháng.

## Triệu chứng

Một dashboard mới ra đời. Người dựng kéo `doanh_thu_ytd` vào ô tổng — vì tên nó có chữ
"doanh thu", và nó là một cột số.

```sql
SELECT sum(doanh_thu)     AS doanh_thu_that,
       sum(doanh_thu_ytd) AS sum_cua_cot_ytd,
       round(1.0 * sum(doanh_thu_ytd) / sum(doanh_thu), 2) AS phong_may_lan
FROM fct_thang;
```

```text
┌────────────────┬─────────────────┬───────────────┐
│ doanh_thu_that │ sum_cua_cot_ytd │ phong_may_lan │
├────────────────┼─────────────────┼───────────────┤
│            750 │            1600 │          2.13 │
└────────────────┴─────────────────┴───────────────┘
```

**Phồng 2,13 lần** trên 4 tháng. Với 12 tháng, hệ số phồng khoảng 6,5 — và nó **thay đổi
theo số tháng đang xem**, nên không có tỷ lệ cố định nào để nhận ra.

Lọc 3 tháng thì phồng khác, lọc 12 tháng thì phồng khác. Đây là lý do không ai phát hiện
bằng cách "thấy con số quen thuộc bị lệch một tỷ lệ cố định".

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Fact bị nạp trùng | `count(*)` = 4, đúng |
| Join nào đó gây fan-out | Query chỉ có một bảng, không join gì |
| Có đơn hàng bị ghi hai lần | Đối chiếu nguồn: sạch |
| Bộ lọc ngày bị chồng lấn | Không có bộ lọc ngày |

Chỗ mất thời gian: phản xạ "phồng số = nhân bản dòng" dẫn cả cuộc điều tra đi tìm dòng
thừa. Không có dòng thừa nào — **cột mới là thứ sai**, và nó sai theo bản chất chứ không
theo dữ liệu.

Câu hỏi rẽ hướng: *"cột này cộng lên thì có nghĩa gì không?"*

## Nguyên nhân thật

`doanh_thu_ytd` đã **chứa sẵn** giá trị của các tháng trước. Cộng cả cột lại là đếm tháng
1 bốn lần, tháng 2 ba lần, tháng 3 hai lần.

1.600 = 100 + 300 + 450 + 750.

Về mặt phân loại, đây là số **non-additive theo chiều thời gian** — cùng loại với số dư
của [periodic snapshot](../reference/fact-and-dimension.md). Nhưng có một khác biệt làm
nó nguy hiểm hơn nhiều:

> Ai cũng biết cộng **số dư** 12 tháng là vô lý. Không ai nghĩ cộng **doanh thu luỹ kế**
> là vô lý — vì cái tên chứa chữ "doanh thu".

Tên cột đã che mất tính chất của nó.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` trên `doanh_thu_ytd` | ✅ xanh |
| `doanh_thu_ytd >= doanh_thu` | ✅ xanh |
| `doanh_thu_ytd` tăng dần theo tháng | ✅ xanh |
| Giá trị tháng 12 khớp tổng năm | ✅ xanh |
| Người dùng có cộng cột này không | ❌ — **không kiểm được từ phía dữ liệu** |

Bốn test đầu đều xanh vì **cột hoàn toàn đúng**. Lỗi phát sinh ở nơi người dùng quyết
định làm gì với nó — chỗ mà không test dữ liệu nào với tới.

Cách phòng duy nhất là **thiết kế sao cho không thể dùng sai**.

## Cách sửa

### Sửa gốc — bỏ cột, tính lúc đọc

```sql
SELECT thang, doanh_thu,
       sum(doanh_thu) OVER (ORDER BY thang) AS ytd_tinh_luc_doc
FROM fct_thang ORDER BY thang;
```

```text
┌───────┬───────────┬──────────────────┐
│ thang │ doanh_thu │ ytd_tinh_luc_doc │
├───────┼───────────┼──────────────────┤
│     1 │       100 │              100 │
│     2 │       200 │              300 │
│     3 │       150 │              450 │
│     4 │       300 │              750 │
└───────┴───────────┴──────────────────┘
```

Cùng kết quả cho dashboard luỹ kế, nhưng cột **không tồn tại trong bảng** nên không ai
kéo nhầm được. Công cụ BI ngày nay đều hỗ trợ window function — lý do ban đầu để lưu sẵn
đã hết hiệu lực.

### Nếu buộc phải lưu

Ba biện pháp, làm cả ba:

1. **Tách sang bảng riêng** `agg_ytd_thang`, không trộn vào fact atomic.
2. **Đặt tên tự tố cáo**: `doanh_thu_luy_ke_khong_cong`.
3. **Chỉ đọc một dòng, không gộp**:

```sql
SELECT thang, doanh_thu_ytd FROM fct_thang WHERE thang = 4;
```

```text
┌───────┬───────────────┐
│ thang │ doanh_thu_ytd │
├───────┼───────────────┤
│     4 │           750 │
└───────┴───────────────┘
```

| | Trước | Sau |
|---|---|---|
| Tổng trên dashboard mới | 1.600 (**phồng 2,13 lần**) | 750 |
| Cột non-additive trong fact | Có, không nhãn | Không có |
| Dashboard luỹ kế | Chạy | Vẫn chạy |

## Dấu hiệu nhận ra sớm

1. Tìm cột non-additive nằm trong fact — luỹ kế, số dư, trung bình, tỷ lệ:

```bash
grep -rn "ytd\|luy_ke\|running_\|cumulative\|_avg\|_rate\|_pct" models/marts/*.sql
```

2. **Phép thử một câu cho mọi cột số mới:** *"cộng cột này qua hai dòng bất kỳ thì kết
   quả có nghĩa gì không?"* Không có nghĩa → không được nằm cạnh cột additive mà không có
   nhãn.

3. Đối chiếu tổng của mọi cột số với nguồn:

```sql
SELECT sum(doanh_thu) AS cong_duoc, sum(doanh_thu_ytd) AS khong_cong_duoc
FROM fct_thang;
```

Cột nào cộng ra số không khớp bất kỳ con số nghiệp vụ nào = cột đó không nên được cộng.

## Related Topics

- [Year-to-date và timespan](../skills/ytd-timespan-facts.md) — kỹ thuật bị bỏ qua ở đây
- [Fact và Dimension](../reference/fact-and-dimension.md) — ba mức additivity
- [Aggregate fact table](../skills/aggregate-fact-table.md) — cùng luật: chỉ lưu số cộng được
- [CS: bảng tổng hợp lệch số](bang-tong-hop-lech-so.md) — cùng bệnh với cột `avg`
