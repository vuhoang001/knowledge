---
title: Aggregate fact table và shrunken rollup dimension
i18n_status: untranslated
sidebar_position: 11
description: "Bảng tổng hợp làm query nhanh lên, nhưng chỉ đúng khi nó cộng được và khi dimension rút gọn sinh ra từ chính dimension gốc."
tags: [aggregate, shrunken-dimension, conformed-dimension, additivity, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Aggregate fact table và shrunken rollup dimension

> **Chốt:** bảng tổng hợp là **bản sao có thể sai lệch** của fact chi tiết. Hai luật giữ
> nó không sai: chỉ lưu số **cộng được** (`sum`, `count` — không bao giờ `avg`), và
> dimension rút gọn phải **sinh ra từ** dimension gốc chứ không gõ lại.

## Vì sao có bảng tổng hợp

Fact atomic có 5 tỷ dòng; dashboard chỉ hỏi doanh thu theo tháng × khu vực. Quét 5 tỷ
dòng để trả về 200 con số là lãng phí. Bảng tổng hợp ở grain thô hơn giải quyết đúng việc
đó.

Kimball nhấn mạnh một điều dễ bị bỏ qua: **bảng tổng hợp không thay thế atomic**. Nó là
lớp tăng tốc, đứng cạnh, và **phải rút được ra từ atomic bất cứ lúc nào**. Bỏ atomic đi
để "tiết kiệm" là mất khả năng trả lời mọi câu hỏi chưa được dự đoán trước — cùng loại
đánh đổi ở [Star, Snowflake, OBT](../reference/star-snowflake-obt.md).

## Luật 1 — chỉ lưu số cộng được

Đây là chỗ hỏng phổ biến nhất, và nó hỏng ngay ở dòng đầu tiên.

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

Bảng này đúng. Nó thành sai ngay khi có người cộng lên một cấp:

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

**200 hay 300?** Trung bình của trung bình cho mỗi ngày trọng số bằng nhau, bất kể ngày
đó có 3 đơn hay 1 đơn. Lệch 50% trên một tập 4 dòng — trên tập thật thì lệch bao nhiêu
không ai đoán được, và không ai phát hiện.

Cách sửa là bỏ `avg`, lưu **tử số và mẫu số**:

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
│       800 │      4 │      200.0 │
└───────────┴────────┴────────────┘
```

Luật rút ra: **bảng tổng hợp chỉ chứa fact additive**. Tỷ lệ, trung bình, phần trăm được
tính **lúc đọc** từ hai cột cộng được. Xem thêm phần additivity ở
[Fact và Dimension](../reference/fact-and-dimension.md).

| Muốn có chỉ số | Lưu trong bảng tổng hợp |
|---|---|
| Giá trị đơn trung bình | `sum(doanh_thu)`, `count(*)` |
| Tỷ lệ chuyển đổi | `sum(so_don)`, `sum(so_luot_xem)` |
| Biên lợi nhuận % | `sum(doanh_thu)`, `sum(gia_von)` |
| Số khách phân biệt | **Không cộng được** — xem FAQ |

## Luật 2 — shrunken rollup dimension phải sinh từ dimension gốc

Bảng tổng hợp theo quý cần một `dim_quy`. Cám dỗ: gõ tay một bảng 4 dòng, 30 giây là
xong. Hậu quả: hai định nghĩa "quý" tồn tại song song, và chúng lệch nhau vào đúng lúc
không ai ngờ — nhất là khi công ty có [năm tài chính riêng](../reference/date-dimension.md).

Shrunken rollup dimension là dimension gốc **rút gọn về grain thô hơn**, và nó phải được
sinh ra bằng `SELECT DISTINCT` từ chính dimension gốc:

```sql
CREATE TABLE dim_quy AS
SELECT DISTINCT nam_tai_chinh, quy_tai_chinh,
       'FY' || nam_tai_chinh || '-Q' || quy_tai_chinh AS ten_quy
FROM dim_ngay;
```

```text
┌───────────────┬───────────────┬───────────┐
│ nam_tai_chinh │ quy_tai_chinh │  ten_quy  │
├───────────────┼───────────────┼───────────┤
│          2025 │             4 │ FY2025-Q4 │
│          2026 │             1 │ FY2026-Q1 │
│          2026 │             2 │ FY2026-Q2 │
│          2026 │             3 │ FY2026-Q3 │
└───────────────┴───────────────┴───────────┘
```

Kiểm tra điều kiện conform — cùng một tháng phải mang cùng một nhãn ở cả hai bảng:

```sql
SELECT DISTINCT 'tu dim_ngay' AS nguon,
       'FY' || nam_tai_chinh || '-Q' || quy_tai_chinh AS nhan
FROM dim_ngay WHERE month(ngay) = 1
UNION ALL
SELECT 'tu dim_quy', ten_quy FROM dim_quy
WHERE nam_tai_chinh = 2025 AND quy_tai_chinh = 4;
```

```text
┌─────────────┬───────────┐
│    nguon    │   nhan    │
├─────────────┼───────────┤
│ tu dim_ngay │ FY2025-Q4 │
│ tu dim_quy  │ FY2025-Q4 │
└─────────────┴───────────┘
```

Một dòng kết quả duy nhất sau `DISTINCT` nghĩa là hai bảng đồng ý. Đây chính là điều kiện
conform ở [conformed dimension](conformed-dimension.md), áp cho cặp chi tiết ↔ tổng hợp:
**tập giá trị của dimension rút gọn phải là tập con đúng nghĩa của dimension gốc.**

Không có nó thì báo cáo quý và báo cáo ngày cộng ra hai con số khác nhau, và tranh cãi sẽ
kéo dài vì cả hai đều "chạy đúng" — đúng như [case study hai mart không ghép được](../case-studies/hai-mart-khong-ghep-duoc.md).

## Luật 3 — bảng tổng hợp trôi khỏi atomic

Hai luật trên lo tính đúng đắn tại thời điểm dựng. Luật này lo thứ xảy ra sau đó.

Bảng tổng hợp tháng 1 chạy xong ngày 01/02. Ngày 05/03 một đơn hàng lùi ngày về 05/01 mới
về kho ([late arriving fact](late-arriving.md)):

```sql
INSERT INTO fct_don VALUES ('D5', DATE '2026-01-05', 200);

SELECT (SELECT sum(doanh_thu) FROM fct_don)  AS atomic,
       (SELECT sum(doanh_thu) FROM agg_ngay) AS bang_tong_hop,
       (SELECT sum(doanh_thu) FROM fct_don)
     - (SELECT sum(doanh_thu) FROM agg_ngay) AS chenh,
       round(100.0 * ((SELECT sum(doanh_thu) FROM agg_ngay)
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

Dashboard đọc bảng tổng hợp hiển thị **800**; ai query thẳng atomic thấy **1.000**. Cả
hai đều "đúng theo bảng của mình", và cuộc họp sẽ mất một buổi.

Cách phát hiện — một query đối soát, chạy sau mỗi lần nạp:

```sql
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
│ 2026-01-05 │    300 │    500 │    200 │
└────────────┴────────┴────────┴────────┘
```

Nó chỉ thẳng vào ngày phải nạp lại. Biến câu này thành một test dbt `severity: error` là
cách duy nhất giữ hai lớp đồng bộ lâu dài — xem
[Triển khai test](../../etl/dbt/skills/implementing-tests.md).

**Luật vận hành:** cửa sổ nạp lại của bảng tổng hợp phải **bằng hoặc rộng hơn** cửa sổ
của fact atomic. Hẹp hơn là bảo đảm trôi.

## Consolidated fact table — họ hàng gần, khác bản chất

Aggregate và consolidated dễ bị nhầm vì cả hai đều "gộp về grain thô hơn". Khác biệt nằm
ở **cái gì được gộp**:

| | Aggregate fact table | Consolidated fact table |
|---|---|---|
| Gộp cái gì | **Một** quy trình nghiệp vụ, grain thô hơn | **Nhiều** quy trình, về cùng một grain |
| Ví dụ | Bán hàng theo ngày → theo tháng | Doanh thu thực tế **và** kế hoạch, ở grain tháng × sản phẩm |
| Rút lại được từ | Fact atomic của chính nó | Nhiều fact khác nhau |
| Mục đích | Tốc độ | **Tiện cho người dùng** — khỏi tự drill-across |

Consolidated fact ra đời vì một câu hỏi lặp đi lặp lại: *"thực tế so kế hoạch chênh bao
nhiêu"*. Người dùng có thể tự [drill-across](conformed-dimension.md) hai fact mỗi lần,
nhưng nếu câu hỏi đó xuất hiện hằng ngày thì dựng sẵn một bảng là hợp lý.

```text
fct_ban_thang_hop_nhat
  thang_key | san_pham_sk | doanh_thu_thuc_te | doanh_thu_ke_hoach | chenh_lech
```

**Ba điều kiện bắt buộc**, thiếu một là bảng thành nguồn sai số:

1. **Các quy trình phải có [conformed dimension](conformed-dimension.md)** — nếu không thì
   dòng nào ghép với dòng nào cũng không xác định được.
2. **Chỉ số phải [conformed fact](conformed-facts.md)** — "doanh thu" bên thực tế và bên
   kế hoạch phải cùng công thức. Nếu kế hoạch tính gồm VAT còn thực tế thì không, cột
   `chenh_lech` đo sai lệch định nghĩa chứ không đo sai lệch kinh doanh.
3. **Phải xử lý độ trễ khác nhau.** Kế hoạch có sẵn từ đầu năm; thực tế về theo ngày. Ô
   tháng 12 sẽ có kế hoạch mà chưa có thực tế — và `chenh_lech` ở đó là −100%, một con số
   đúng về mặt số học và vô nghĩa về mặt nghiệp vụ.

Điều kiện 3 là chỗ hỏng thường gặp nhất. Cách xử lý: thêm cột `co_du_lieu_thuc_te` và
**không tính** `chenh_lech` khi nó `false` — cùng nguyên tắc với nhãn `da_chot` ở
[real-time fact table](real-time-fact.md).

## Khi nào nên dựng bảng tổng hợp

| Dấu hiệu | Nên dựng? |
|---|---|
| Cùng một `GROUP BY` chạy hàng trăm lần mỗi ngày | Có |
| Tỷ lệ nén ≥ 10 lần (5 tỷ dòng → 200 triệu) | Có |
| Nén chỉ 2–3 lần | Không — không bù được chi phí bảo trì |
| Câu hỏi thay đổi liên tục, chưa ổn định | Chưa — đợi mẫu truy vấn định hình |
| Engine đã có kết quả cache / materialized view tự quản | Cân nhắc dùng cái sẵn có |

Nguyên tắc: **bảng tổng hợp là tối ưu hoá, và tối ưu hoá thì phải đo trước.** Dựng vì
"chắc sẽ nhanh hơn" là tự thêm một bảng phải giữ đồng bộ mãi mãi.

## Trade-offs

| Được | Mất |
|---|---|
| Query nhanh lên bậc độ lớn | Thêm một bảng phải nạp và đối soát |
| Chi phí compute giảm cho dashboard | Rủi ro hai lớp lệch nhau |
| Grain thô, dễ đọc | Không trả lời được câu hỏi dưới grain đó |
| Nếu conform đúng, người dùng không cần biết nó tồn tại | Conform sai thì lỗi lan sang mọi báo cáo |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Lưu `avg` trong bảng tổng hợp | Trung bình của trung bình — lệch 50% |
| Lưu `count(DISTINCT khach)` | Không cộng được, cộng lên là đếm trùng |
| Gõ tay `dim_thang` / `dim_quy` | Nhãn lệch với `dim_ngay`, hai báo cáo hai số |
| Cửa sổ nạp lại hẹp hơn atomic | Bảng trôi dần — [case study](../case-studies/bang-tong-hop-lech-so.md) |
| Xoá fact atomic sau khi có bảng tổng hợp | Mất khả năng trả lời câu hỏi mới, không khôi phục được |
| Không có query đối soát | Phát hiện lệch khi người dùng báo, không phải khi CI báo |

## FAQ

<details>
<summary>Vậy `count(DISTINCT khach)` để đâu?</summary>

Không lưu được trong bảng tổng hợp theo cách thường, vì số khách phân biệt của tháng 1 và
tháng 2 **không cộng lại thành** số khách của quý.

Hai đường: (a) tính lại từ atomic khi cần — chấp nhận chậm; (b) lưu cấu trúc xấp xỉ cộng
được như HyperLogLog sketch, engine hiện đại (DuckDB, Trino, BigQuery) đều có. Cách (b)
cho sai số vài phần trăm, đổi lại cộng được ở mọi cấp.

</details>

<details>
<summary>Bảng tổng hợp có nên để người dùng nhìn thấy không?</summary>

Kimball khuyên: **không**. Lý tưởng là query rewrite tự chọn bảng phù hợp, người viết
query chỉ biết fact atomic. Nếu nền tảng không làm được (phần lớn lakehouse hiện nay),
thì đặt tên rõ ràng (`agg_`) và ghi grain vào mô tả bảng — để không ai vô tình join bảng
tổng hợp với fact chi tiết rồi phồng số, như [case study join hai fact](../case-studies/join-hai-fact-lam-phong-tong.md).

</details>

<details>
<summary>Bảng tổng hợp có thay thế được fact atomic không?</summary>

Không. Bảng tổng hợp chỉ trả lời được câu hỏi **ở hoặc trên** grain của nó. Bỏ atomic đi
là mất khả năng trả lời mọi câu hỏi chưa được dự đoán trước — và câu hỏi mới là thứ luôn
xuất hiện.

Kimball nói thẳng: aggregate là **lớp tăng tốc đứng cạnh** atomic, không phải lớp thay
thế. Lý tưởng là người viết query chỉ biết fact atomic, còn engine tự chọn bảng phù hợp.

</details>

## Related Topics

- [Fact và Dimension](../reference/fact-and-dimension.md) — additivity quyết định cột nào được vào bảng tổng hợp
- [Conformed dimension](conformed-dimension.md) — điều kiện conform áp cho dimension rút gọn
- [Date dimension](../reference/date-dimension.md) — `dim_quy` phải sinh từ `dim_ngay`
- [Dữ liệu về muộn](late-arriving.md) — nguyên nhân số một làm bảng tổng hợp trôi
- [CS: bảng tổng hợp lệch số](../case-studies/bang-tong-hop-lech-so.md)

## References

- Kimball Group — [Aggregate Fact Tables / Shrunken Rollup Dimensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 15
