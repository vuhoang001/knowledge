---
title: Đưa hành vi vào dimension
sidebar_position: 20
description: "Số tổng hợp làm thuộc tính dimension, phân khoảng động, nhóm nghiên cứu và step dimension — bốn cách phân khúc, cùng một cái bẫy cộng trùng."
tags: [behavior-tag, study-group, value-banding, step-dimension, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Đưa hành vi vào dimension

> **Chốt:** *"khách chi tiêu nhiều"* là một câu hỏi về **fact**, nhưng người ta muốn dùng
> nó để **lọc và nhóm** — tức là dùng như dimension. Bốn kỹ thuật dưới đây giải bài toán
> đó, và cả bốn dính chung một cái bẫy: **số tổng hợp nằm trong dimension thì không được
> `SUM` sau khi join fact.**

## Dữ liệu chung

```sql
CREATE TABLE fct_ban AS
SELECT * FROM (VALUES
  ('C1', DATE '2026-01-10',  2000), ('C1', DATE '2026-03-15',  6000),
  ('C2', DATE '2026-02-01',   300),
  ('C3', DATE '2026-01-20', 50000), ('C3', DATE '2026-05-11', 30000),
  ('C4', DATE '2026-06-01',   900)
) t(khach_id, ngay, doanh_thu);
```

## 1. Aggregated facts as dimension attributes

Đưa số tổng hợp lên dimension để lọc/nhóm mà không phải quét fact:

```sql
CREATE TABLE dim_khach AS
SELECT khach_id, sum(doanh_thu) AS tong_chi_tieu, count(*) AS so_lan_mua,
       max(ngay) AS lan_mua_gan_nhat
FROM fct_ban GROUP BY 1;
```

```text
┌──────────┬───────────────┬────────────┬──────────────────┐
│ khach_id │ tong_chi_tieu │ so_lan_mua │ lan_mua_gan_nhat │
├──────────┼───────────────┼────────────┼──────────────────┤
│ C1       │          8000 │          2 │ 2026-03-15       │
│ C2       │           300 │          1 │ 2026-02-01       │
│ C3       │         80000 │          2 │ 2026-05-11       │
│ C4       │           900 │          1 │ 2026-06-01       │
└──────────┴───────────────┴────────────┴──────────────────┘
```

Rất tiện: *"doanh thu từ khách có tổng chi tiêu trên 5.000"* thành một `WHERE` trên
dimension, không phải subquery gộp fact.

### Cái bẫy

Cộng cột này **trong dimension** thì đúng:

```text
┌───────────────┬───────────────────┐
│ sum_trong_dim │ tong_that_tu_fact │
├───────────────┼───────────────────┤
│         89200 │             89200 │
└───────────────┴───────────────────┘
```

Cộng **sau khi join fact** thì hỏng:

```sql
SELECT sum(d.tong_chi_tieu) AS sum_sau_khi_join_fact,
       (SELECT sum(doanh_thu) FROM fct_ban) AS tong_that,
       round(1.0 * sum(d.tong_chi_tieu)
             / (SELECT sum(doanh_thu) FROM fct_ban), 2) AS phong_may_lan
FROM fct_ban f JOIN dim_khach d USING (khach_id);
```

```text
┌───────────────────────┬───────────┬───────────────┐
│ sum_sau_khi_join_fact │ tong_that │ phong_may_lan │
├───────────────────────┼───────────┼───────────────┤
│                177200 │     89200 │          1.99 │
└───────────────────────┴───────────┴───────────────┘
```

**Phồng gần 2 lần** — mỗi khách được đếm bằng đúng số dòng fact của họ. Đây là cùng cơ
chế fan-out với [dim đơn hàng phồng doanh thu](../case-studies/dim-don-hang-lam-phong-doanh-thu.md),
chỉ khác là bên nhân bản là *fact*, và cột bị nhân là cột *tổng hợp trong dimension*.

Ba cách phòng, dùng cả ba:

- **Đặt tên tự tố cáo**: `tong_chi_tieu_khong_cong` hoặc tiền tố `attr_`.
- **Ghi rõ trong mô tả cột** rằng nó chỉ dùng để lọc và nhóm.
- **Test bất biến**: `sum(cot_tong_hop)` trong dimension phải bằng `sum(cot_goc)` trong
  fact; nếu người dùng cộng sau join, con số sẽ khác.

### Nhịp cập nhật

Cột này **đổi mỗi ngày**. Bật [SCD](scd.md) Type 2 cho nó là con đường thẳng tới
[dimension phồng 365 lần](../case-studies/dimension-phinh-365-lan.md). Hai lựa chọn đúng:
Type 1 (ghi đè, chỉ giữ giá trị hiện tại), hoặc tách sang
[mini-dimension](mini-dimension.md) nếu thật sự cần as-was.

## 2. Dynamic value banding

Phân khách thành nhóm theo ngưỡng. Cách sai là `CASE WHEN` rải khắp dashboard; cách đúng
là **một bảng ngưỡng**:

```sql
CREATE TABLE dai_gia_tri AS
SELECT * FROM (VALUES
  ('Nho',     0,    1000),
  ('Vua',  1000,   10000),
  ('Lon', 10000, 1000000)
) t(ten_dai, tu, den);

SELECT b.ten_dai, count(*) AS so_khach, sum(d.tong_chi_tieu) AS chi_tieu
FROM dim_khach d JOIN dai_gia_tri b
  ON d.tong_chi_tieu >= b.tu AND d.tong_chi_tieu < b.den
GROUP BY 1 ORDER BY 3 DESC;
```

```text
┌─────────┬──────────┬──────────┐
│ ten_dai │ so_khach │ chi_tieu │
├─────────┼──────────┼──────────┤
│ Lon     │        1 │    80000 │
│ Vua     │        1 │     8000 │
│ Nho     │        2 │     1200 │
└─────────┴──────────┴──────────┘
```

Marketing muốn tách nhóm giữa? **Sửa bảng, không sửa một dòng SQL nào**:

```sql
UPDATE dai_gia_tri SET den = 5000 WHERE ten_dai = 'Vua';
INSERT INTO dai_gia_tri VALUES ('Lon vua', 5000, 10000);
```

```text
┌─────────┬──────────┬──────────┐
│ ten_dai │ so_khach │ chi_tieu │
├─────────┼──────────┼──────────┤
│ Lon     │        1 │    80000 │
│ Lon vua │        1 │     8000 │
│ Nho     │        2 │     1200 │
└─────────┴──────────┴──────────┘
```

Bảng ngưỡng cần đúng bất biến như [timespan](ytd-timespan-facts.md) — không hở, không
chồng:

```text
┌─────────┬─────────┬────────────┬────────────┐
│ ten_dai │   den   │ dai_sau_tu │ tinh_trang │
├─────────┼─────────┼────────────┼────────────┤
│ Nho     │    1000 │       1000 │ lien tuc   │
│ Vua     │    5000 │       5000 │ lien tuc   │
│ Lon vua │   10000 │      10000 │ lien tuc   │
│ Lon     │ 1000000 │       NULL │ dai cuoi   │
└─────────┴─────────┴────────────┴────────────┘
```

Hở một khoảng thì khách rơi vào đó **biến mất khỏi báo cáo phân khúc**; chồng lấn thì họ
bị đếm hai lần. Cả hai đều không báo lỗi.

**Đánh đổi phải nói rõ:** sửa bảng ngưỡng làm **báo cáo cũ đổi số**. Nếu cần so sánh theo
thời gian thì bảng ngưỡng phải có `hieu_luc_tu`/`hieu_luc_den` — cùng cách xử lý với SCD.

## 3. Behavior study group

Một **tập khoá cố định**, chọn theo hành vi tại một thời điểm, rồi theo dõi về sau.

```sql
CREATE TABLE nhom_nghien_cuu AS
SELECT 'Khach mua thang 1/2026' AS ten_nhom, khach_id
FROM (SELECT DISTINCT khach_id FROM fct_ban
      WHERE date_trunc('month', ngay) = DATE '2026-01-01');
```

```text
┌────────────────────────┬──────────┐
│        ten_nhom        │ khach_id │
├────────────────────────┼──────────┤
│ Khach mua thang 1/2026 │ C1       │
│ Khach mua thang 1/2026 │ C3       │
└────────────────────────┴──────────┘
```

```sql
SELECT date_trunc('month', f.ngay)::DATE AS thang, sum(f.doanh_thu) AS chi_tieu_cua_nhom
FROM fct_ban f JOIN nhom_nghien_cuu n USING (khach_id)
GROUP BY 1 ORDER BY 1;
```

```text
┌────────────┬───────────────────┐
│   thang    │ chi_tieu_cua_nhom │
├────────────┼───────────────────┤
│ 2026-01-01 │             52000 │
│ 2026-03-01 │              8000 │
│ 2026-05-01 │             30000 │
└────────────┴───────────────────┘
```

Đây là phân tích cohort, và điểm mấu chốt là bảng chỉ chứa **khoá**, không copy dữ liệu.
Nhờ vậy nó join được với **mọi** fact — bán hàng, trả hàng, chăm sóc khách — mà không bao
giờ lệch khỏi nguồn.

Nếu thay vì lưu khoá mà lưu điều kiện (`WHERE thang = 1`), thì mỗi lần chạy lại tập thành
viên sẽ khác đi khi dữ liệu quá khứ được sửa — và toàn bộ so sánh cohort mất ý nghĩa.

## 4. Step dimension

Vị trí của một sự kiện trong **chuỗi sự kiện của cùng một thực thể**:

```sql
CREATE TABLE fct_buoc AS
SELECT khach_id, ngay, doanh_thu,
       row_number() OVER (PARTITION BY khach_id ORDER BY ngay) AS buoc_thu_may,
       count(*)     OVER (PARTITION BY khach_id)               AS tong_so_buoc
FROM fct_ban;

SELECT buoc_thu_may, count(*) AS so_don, sum(doanh_thu) AS doanh_thu,
       round(avg(doanh_thu), 0) AS gia_tri_tb
FROM fct_buoc GROUP BY 1 ORDER BY 1;
```

```text
┌──────────────┬────────┬───────────┬────────────┐
│ buoc_thu_may │ so_don │ doanh_thu │ gia_tri_tb │
├──────────────┼────────┼───────────┼────────────┤
│            1 │      4 │     53200 │    13300.0 │
│            2 │      2 │     38000 │    19000.0 │
└──────────────┴────────┴───────────┴────────────┘
```

Câu hỏi *"đơn thứ hai có lớn hơn đơn đầu không"* — ở đây 19.000 so với 13.300 — chỉ trả
lời được khi có cột này. Không có nó, người dùng phải tự viết window function, và mỗi
người viết một kiểu.

Ứng dụng chuẩn: bước thứ mấy trong phễu bán hàng, trang thứ mấy trong phiên, lần khám thứ
mấy của bệnh nhân.

`tong_so_buoc` cho phép hỏi ngược: *"trong các phiên có đúng 3 bước, bước 2 là gì"*.

**Lưu ý:** cả hai cột phải tính lại khi có [dữ liệu về muộn](late-arriving.md) — một giao
dịch lùi ngày về sẽ đẩy số thứ tự của mọi giao dịch sau nó.

## Behavior tag time series

Biến thể của (1): thay vì một số, lưu **một chuỗi nhãn theo thời gian** —
`'AABBCA'` nghĩa là 6 tháng gần nhất khách ở các mức A, A, B, B, C, A.

Điểm mạnh: tìm mẫu hành vi bằng so khớp chuỗi (`LIKE '%CC%'` = hai tháng liên tiếp tụt
hạng). Điểm yếu: chuỗi phải cập nhật mỗi kỳ, và mọi phân tích trên nó **không cộng được**
— y hệt cái bẫy ở mục 1.

Chỉ nên dựng khi thật sự có bài toán phát hiện mẫu; nếu không, một fact hạng khách theo
tháng vừa đơn giản hơn vừa cộng được.

## Trade-offs

| Được | Mất |
|---|---|
| Lọc/nhóm theo hành vi không phải quét fact | Cột tổng hợp không được cộng sau join |
| Bảng ngưỡng: đổi phân khúc không sửa code | Đổi ngưỡng làm báo cáo cũ đổi số |
| Study group: cohort ổn định, join được mọi fact | Phải sinh và đặt tên rõ ràng |
| Step dimension: phân tích chuỗi thành `GROUP BY` | Phải tính lại khi có dữ liệu về muộn |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| `SUM` cột tổng hợp sau khi join fact | Phồng theo số dòng — [case study](../case-studies/cong-cot-tong-hop-trong-dim.md) |
| Type 2 cho cột tổng hợp đổi hằng ngày | Dimension phồng — [case study](../case-studies/dimension-phinh-365-lan.md) |
| `CASE WHEN` phân khoảng rải khắp dashboard | Mỗi dashboard một định nghĩa phân khúc |
| Bảng ngưỡng hở hoặc chồng lấn | Khách biến mất hoặc bị đếm hai lần |
| Study group lưu điều kiện thay vì khoá | Tập thành viên đổi mỗi lần chạy |
| Không tính lại step khi có dữ liệu về muộn | Số thứ tự sai từ điểm chèn trở đi |

## Related Topics

- [Mini-dimension](mini-dimension.md) — chỗ đúng cho thuộc tính đổi nhanh cần as-was
- [SCD](scd.md) — vì sao Type 1 là lựa chọn cho cột tổng hợp
- [Aggregate fact table](aggregate-fact-table.md) — cùng luật về số cộng được
- [Year-to-date và timespan](ytd-timespan-facts.md) — bảng ngưỡng cần cùng bất biến với timespan
- [CS: cộng cột tổng hợp trong dimension](../case-studies/cong-cot-tong-hop-trong-dim.md)

## References

- Kimball Group — [Aggregated Facts as Dimension Attributes · Dynamic Value Banding · Behavior Study Groups · Behavior Tag Time Series · Step Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 8
