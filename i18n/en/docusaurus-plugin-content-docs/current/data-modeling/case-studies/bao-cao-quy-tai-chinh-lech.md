---
title: Quý 1 trong họp hội đồng lệch 202% so với quý 1 trên dashboard
i18n_status: untranslated
sidebar_position: 8
description: "Không có date dimension, dashboard dùng quarter() của SQL — trong khi năm tài chính công ty bắt đầu 01/04."
tags: [case-study, date-dimension, calendar, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Quý 1 trong họp hội đồng lệch 202% so với quý 1 trên dashboard

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** `quarter()` trả lời quý **dương lịch**. Không doanh nghiệp nào hỏi câu đó.
> Không có [date dimension](../reference/date-dimension.md) thì hai phòng ban dùng hai
> định nghĩa "quý" mà không ai biết.

## Bối cảnh

Công ty bán hàng theo mùa, cao điểm tháng 4–6. **Năm tài chính bắt đầu 01/04** — điều
này ghi trong điều lệ, ai trong phòng tài chính cũng biết, và không có ở đâu trong kho dữ
liệu.

Mô hình đơn giản nhất có thể: một fact, một cột `ngay DATE`. Không có `dim_ngay` vì "đã
có cột ngày rồi, thêm bảng làm gì".

```sql
CREATE TABLE fct_ban AS
SELECT ngay,
       CASE WHEN month(ngay) BETWEEN 4 AND 6 THEN 3 ELSE 1 END
       * (100 + (day(ngay) * 7) % 50) AS doanh_thu
FROM (SELECT (DATE '2026-01-01' + INTERVAL (i) DAY)::DATE AS ngay
      FROM range(0, 181) t(i));
```

```text
┌─────────┬────────┐
│ so_ngay │  tong  │
├─────────┼────────┤
│     181 │  45432 │
└─────────┴────────┘
```

## Triệu chứng

Họp hội đồng tháng 7. Slide của phòng tài chính: *"doanh thu quý 1 đạt 34.146"*.
Dashboard trên màn hình lớn: **11.286**.

Không ai sai chính tả, không ai gõ nhầm. Hai con số cùng nhãn "Quý 1", chênh nhau ba lần.

```sql
SELECT sum(doanh_thu) FILTER (WHERE quarter(ngay) = 1) AS quy1_theo_lich,
       sum(doanh_thu) FILTER (WHERE ngay BETWEEN '2026-04-01' AND '2026-06-30')
                                                      AS quy1_tai_chinh,
       round(100.0 * (sum(doanh_thu) FILTER (WHERE ngay BETWEEN '2026-04-01' AND '2026-06-30')
                    - sum(doanh_thu) FILTER (WHERE quarter(ngay) = 1))
             / sum(doanh_thu) FILTER (WHERE quarter(ngay) = 1), 1) AS lech_pct
FROM fct_ban;
```

```text
┌────────────────┬────────────────┬──────────┐
│ quy1_theo_lich │ quy1_tai_chinh │ lech_pct │
├────────────────┼────────────────┼──────────┤
│          11286 │          34146 │    202.6 │
└────────────────┴────────────────┴──────────┘
```

**Lệch 202,6%** — và đây là quý mùa cao điểm, tức là dashboard đang báo cáo mùa thấp điểm
dưới tên "quý 1".

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Dashboard lọc thiếu đơn hàng | Đếm dòng: khớp nguồn 100% |
| Có đơn huỷ bị tính vào một bên | Không có đơn huỷ trong kỳ |
| Múi giờ làm lệch ngày ở biên | Kiểm biên tháng: đúng cả hai bên |
| Phòng tài chính cộng nhầm | **Sai** — họ cộng đúng, chỉ là cộng tháng 4,5,6 |

Mất nửa buổi vì cả hai bên đều đi tìm **lỗi dữ liệu**. Không có lỗi dữ liệu nào. Cùng một
tập dòng, cùng một phép `SUM`, chỉ khác nhau ở **những dòng nào được coi là thuộc quý 1**.

Câu hỏi tách bạch đúng ra phải là câu đầu tiên: *"quý 1 của bạn gồm những tháng nào?"*

## Nguyên nhân thật

Dashboard viết `GROUP BY quarter(ngay)`. Hàm này của SQL chỉ biết lịch dương: quý 1 =
tháng 1, 2, 3.

Với công ty này, quý 1 của FY2026 là **tháng 4, 5, 6**. Tháng 1/2026 thực ra thuộc
**quý 4 của FY2025**.

Không có nơi nào trong kho dữ liệu ghi lại điều đó. Lịch tài chính tồn tại trong đầu
người, trong file Excel của phòng tài chính, và trong điều lệ công ty — ba chỗ mà SQL
không đọc được.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` trên `ngay` | ✅ xanh |
| Tổng doanh thu khớp hệ nguồn | ✅ xanh |
| `accepted_values` cho `quarter(ngay)` — `[1,2,3,4]` | ✅ xanh |
| Số dòng khớp | ✅ xanh |

Mọi thứ xanh, vì **dữ liệu không sai**. Sai ở chỗ một khái niệm nghiệp vụ ("quý") được
suy ra bằng một hàm kỹ thuật thay vì được khai báo thành dữ liệu.

Không test nào bắt được một định nghĩa **không tồn tại trong kho**.

## Cách sửa

Đưa lịch tài chính vào [`dim_ngay`](../reference/date-dimension.md) — biến nó từ tri thức
ngầm thành một cột:

```sql
CREATE TABLE dim_ngay AS
SELECT (DATE '2026-01-01' + INTERVAL (i) DAY)::DATE                   AS ngay,
       (((month((DATE '2026-01-01' + INTERVAL (i) DAY)) + 8) % 12) // 3) + 1
                                                                      AS quy_tai_chinh,
       CASE WHEN month((DATE '2026-01-01' + INTERVAL (i) DAY)) >= 4
            THEN year((DATE '2026-01-01' + INTERVAL (i) DAY))
            ELSE year((DATE '2026-01-01' + INTERVAL (i) DAY)) - 1 END AS nam_tai_chinh
FROM range(0, 365) t(i);

SELECT d.nam_tai_chinh, d.quy_tai_chinh, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_ngay d USING (ngay)
GROUP BY 1, 2 ORDER BY 1, 2;
```

```text
┌───────────────┬───────────────┬───────────┐
│ nam_tai_chinh │ quy_tai_chinh │ doanh_thu │
├───────────────┼───────────────┼───────────┤
│          2025 │             4 │     11286 │
│          2026 │             1 │     34146 │
└───────────────┴───────────────┴───────────┘
```

Hai con số cũ vẫn còn nguyên, nhưng giờ **mang nhãn khác nhau**: 11.286 là FY2025-Q4,
34.146 là FY2026-Q1. Không còn hai thứ cùng tên "Quý 1".

### Trước và sau

| | Trước | Sau |
|---|---|---|
| Định nghĩa quý nằm ở | Hàm `quarter()` + trí nhớ người | Một cột trong `dim_ngay` |
| Đổi lịch tài chính | Sửa mọi query có `quarter()` | Sửa một bảng |
| Hai phòng ban ra hai số | Có, không ai phát hiện | Không thể — cùng một bảng |
| "Ngày làm việc", "ngày lễ" | Không trả lời được | Thêm cột là xong |

## Dấu hiệu nhận ra sớm

1. Trong codebase có **bất kỳ** chỗ nào gọi `quarter()`, `year()`, `week()` để phân kỳ
   báo cáo.
2. Có ngày tháng hardcode kiểu `BETWEEN '2026-04-01' AND '2026-06-30'` trong query.
3. Không có bảng nào tên `dim_ngay` / `dim_date` trong kho.
4. Hỏi hai người ở hai phòng *"quý 1 gồm tháng nào"* và nhận hai câu trả lời.

Kiểm nhanh trong repo:

```bash
grep -rn "quarter(\|date_trunc('quarter'\|EXTRACT(QUARTER" models/ | wc -l
```

Kết quả lớn hơn 0 mà kho không có `dim_ngay` thì gần như chắc chắn đang mắc ca này.

## Related Topics

- [Date dimension](../reference/date-dimension.md) — kỹ thuật bị bỏ qua ở đây
- [Conformed dimension](../skills/conformed-dimension.md) — một định nghĩa dùng chung mọi mart
- [Aggregate fact table](../skills/aggregate-fact-table.md) — `dim_quy` phải sinh từ `dim_ngay`
- [CS: thêm trạng thái thứ tám](them-trang-thai-thu-tam.md) — cùng bệnh: định nghĩa nghiệp vụ nằm trong query
