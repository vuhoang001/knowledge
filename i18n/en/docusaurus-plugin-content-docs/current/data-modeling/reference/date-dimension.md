---
title: Date dimension
i18n_status: untranslated
sidebar_position: 6
description: "Vì sao lịch phải là một bảng chứ không phải một cột date — quý tài chính, ngày lễ, ngày làm việc là dữ liệu, không phải hàm."
tags: [date-dimension, dimension, calendar, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Date dimension

> **Chốt:** hàm ngày tháng của SQL chỉ biết **lịch dương**. Mọi thứ doanh nghiệp thật sự
> hỏi — quý tài chính, tuần bán hàng, ngày lễ, ngày làm việc, mùa cao điểm — là **dữ
> liệu của tổ chức đó**, không suy ra được từ bản thân con số ngày. Nên nó phải nằm
> trong một bảng.

## Mục tiêu

Trả lời câu hỏi hay bị coi là thừa: *"đã có cột `ngay DATE` rồi, cần thêm `dim_ngay`
làm gì?"*

Câu trả lời ngắn: vì `quarter('2026-01-15')` trả về `1`, còn công ty có năm tài chính bắt
đầu 01/04 thì tháng 1/2026 là **quý 4 của FY2025**. SQL không có cách nào biết điều đó.

## Tổng quan

Date dimension là dimension **duy nhất** trong mô hình chiều mà bạn *sinh ra* thay vì
*trích xuất*: không hệ nguồn nào phát cho bạn bảng này, và nó cũng không bao giờ đổi sau
khi sinh. Kimball xếp nó vào nhóm kỹ thuật dimension cơ bản, và trong thực tế nó là bảng
được join nhiều nhất trong cả kho.

| Nếu chỉ có cột `ngay DATE` | Nếu có `dim_ngay` |
|---|---|
| `quarter(ngay)` — quý dương lịch | `quy_tai_chinh` — quý của **công ty này** |
| Không biết ngày nào là lễ | `la_ngay_le`, `ten_ngay_le` |
| Không biết ngày làm việc | `la_ngay_lam_viec` |
| Nhãn hiển thị phải format ở mọi query | `ngay_hien_thi`, `thang_ten` — gõ sẵn một lần |
| Ngày "chưa xảy ra" phải là `NULL` | Dòng khoá `-1`, join vẫn giữ được dòng |
| Lọc `WHERE ngay >= …` thì mỗi báo cáo tự tính lại | `la_30_ngay_gan_nhat` — một cột |

Điểm cuối cùng là điểm quan trọng nhất về mặt tổ chức: **định nghĩa nghiệp vụ có một chỗ
ở duy nhất**. Đổi lịch tài chính là sửa một bảng, không phải đi tìm 40 câu `WHERE`. Đây
đúng cái bẫy đã mô tả ở [case study "thêm trạng thái thứ tám"](../case-studies/them-trang-thai-thu-tam.md).

## Ví dụ xuyên suốt

Một công ty bán hàng theo mùa, **năm tài chính bắt đầu 01/04**. Doanh thu tháng 4–6 gấp
ba lần các tháng đầu năm.

### Bước 1 — dữ liệu nguồn

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

### Bước 2 — câu hỏi giết chết cách làm không có dim_ngay

*"Quý 1 vừa rồi doanh thu bao nhiêu?"*

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

Cùng một câu hỏi tiếng Việt, hai con số **lệch 202,6%**. `quarter()` không sai — nó trả
lời đúng câu hỏi *"quý dương lịch"*, chỉ là không ai hỏi câu đó.

Cách chữa tạm bợ là gõ thẳng `BETWEEN '2026-04-01' AND '2026-06-30'` vào query. Nó chạy
đúng đúng một lần, cho đúng một quý, và **không ai tìm lại được** khi tháng sau cần quý
khác.

### Bước 3 — dựng dim_ngay

```sql
CREATE TABLE dim_ngay AS
WITH lich AS (
  SELECT (DATE '2026-01-01' + INTERVAL (i) DAY)::DATE AS ngay FROM range(0, 365) t(i)
), le AS (
  SELECT unnest([DATE '2026-01-01', DATE '2026-02-16', DATE '2026-02-17', DATE '2026-02-18',
                 DATE '2026-02-19', DATE '2026-02-20', DATE '2026-04-26', DATE '2026-04-30',
                 DATE '2026-05-01', DATE '2026-09-02']) AS ngay
)
SELECT
  CAST(strftime(ngay, '%Y%m%d') AS INTEGER)                        AS ngay_key,
  ngay,
  strftime(ngay, '%d/%m/%Y')                                       AS ngay_hien_thi,
  ['CN','T2','T3','T4','T5','T6','T7'][dayofweek(ngay) + 1]        AS thu_ten,
  month(ngay)                                                      AS thang,
  quarter(ngay)                                                    AS quy_lich,
  (((month(ngay) + 8) % 12) // 3) + 1                              AS quy_tai_chinh,
  CASE WHEN month(ngay) >= 4 THEN year(ngay) ELSE year(ngay) - 1 END AS nam_tai_chinh,
  dayofweek(ngay) IN (0, 6)                                        AS la_cuoi_tuan,
  ngay IN (SELECT ngay FROM le)                                    AS la_ngay_le,
  NOT (dayofweek(ngay) IN (0, 6) OR ngay IN (SELECT ngay FROM le)) AS la_ngay_lam_viec
FROM lich;
```

```text
┌──────────┬───────────────┬─────────┬──────────┬───────────────┬────────────┬──────────────────┐
│ ngay_key │ ngay_hien_thi │ thu_ten │ quy_lich │ quy_tai_chinh │ la_ngay_le │ la_ngay_lam_viec │
├──────────┼───────────────┼─────────┼──────────┼───────────────┼────────────┼──────────────────┤
│ 20260101 │ 01/01/2026    │ T5      │        1 │             4 │ true       │ false            │
│ 20260102 │ 02/01/2026    │ T6      │        1 │             4 │ false      │ true             │
│ 20260103 │ 03/01/2026    │ T7      │        1 │             4 │ false      │ false            │
│ 20260104 │ 04/01/2026    │ CN      │        1 │             4 │ false      │ false            │
│ 20260105 │ 05/01/2026    │ T2      │        1 │             4 │ false      │ true             │
└──────────┴───────────────┴─────────┴──────────┴───────────────┴────────────┴──────────────────┘
```

Chú ý `quy_lich` = 1 nhưng `quy_tai_chinh` = 4 ở cùng một dòng. Đó chính là thứ SQL không
tự biết.

### Bước 4 — câu hỏi cũ, giờ trả lời được bằng GROUP BY

```sql
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

Không còn ngày tháng hardcode ở đâu cả. Đổi lịch tài chính = sửa `dim_ngay`, mọi báo cáo
tự đúng theo.

### Bước 5 — thứ chỉ dim_ngay làm được: ngày làm việc

*"Tháng 2 trung bình mỗi ngày bán được bao nhiêu?"* — Tết nằm trong tháng 2, cửa hàng
đóng cửa 5 ngày.

```sql
SELECT count(*)                                          AS ngay_trong_thang,
       count(*) FILTER (WHERE d.la_ngay_lam_viec)        AS ngay_lam_viec,
       sum(f.doanh_thu)                                  AS tong,
       round(sum(f.doanh_thu) * 1.0 / count(*), 1)       AS tb_moi_ngay,
       round(sum(f.doanh_thu) * 1.0
             / count(*) FILTER (WHERE d.la_ngay_lam_viec), 1) AS tb_ngay_lam_viec
FROM fct_ban f JOIN dim_ngay d USING (ngay)
WHERE d.thang = 2;
```

```text
┌──────────────────┬───────────────┬────────┬─────────────┬──────────────────┐
│ ngay_trong_thang │ ngay_lam_viec │  tong  │ tb_moi_ngay │ tb_ngay_lam_viec │
├──────────────────┼───────────────┼────────┼─────────────┼──────────────────┤
│               28 │            15 │   3542 │       126.5 │            236.1 │
└──────────────────┴───────────────┴────────┴─────────────┴──────────────────┘
```

**126,5 hay 236,1?** Đem so hiệu suất tháng 2 với tháng 3 mà dùng cột đầu thì tháng 2
luôn trông tệ — không phải vì bán kém, mà vì mẫu số đếm cả ngày đóng cửa. Không có
`dim_ngay` thì con số 236,1 **không tồn tại**, và cũng không ai biết là nó thiếu.

## Những cột nên có

| Nhóm | Cột | Vì sao |
|---|---|---|
| Khoá | `ngay_key INT` dạng `YYYYMMDD` | Xem phần smart key bên dưới |
| Lịch | `ngay`, `thang`, `quy_lich`, `nam` | Nền |
| Hiển thị | `ngay_hien_thi`, `thu_ten`, `thang_ten` | Format một lần, không format ở 40 query |
| Tài chính | `nam_tai_chinh`, `quy_tai_chinh`, `tuan_tai_chinh` | Thứ SQL không suy ra được |
| Lịch làm việc | `la_cuoi_tuan`, `la_ngay_le`, `ten_ngay_le`, `la_ngay_lam_viec` | Mẫu số của mọi chỉ số trung bình |
| Điều hướng | `ngay_lam_viec_thu_may_trong_thang`, `ngay_cuoi_thang` | Báo cáo "ngày làm việc thứ 3" |
| Tương đối | `la_30_ngay_gan_nhat`, `la_thang_hien_tai` | Cần **cập nhật lại theo lịch chạy** |

Nhóm cuối là ngoại lệ duy nhất của luật "date dimension không bao giờ đổi": cột tương đối
phải được tính lại mỗi ngày. Đánh đổi: tiện cho BI, nhưng làm bảng mất tính bất biến —
báo cáo cũ chạy lại sẽ ra khác. Nếu điều đó không chấp nhận được thì để BI tự tính.

### Smart key `YYYYMMDD` — ngoại lệ được phép của surrogate key

[Surrogate key](surrogate-key.md) nói khoá dimension nên vô nghĩa. Date dimension là
**ngoại lệ Kimball công nhận**: khoá là số nguyên `20260110`.

| Được | Mất |
|---|---|
| Partition fact theo `ngay_key` mà không phải join | Khoá mang nghĩa — vi phạm nguyên tắc chung |
| Đọc dữ liệu thô vẫn hiểu được | Không tự đổi được lịch (không ai đổi) |
| Dòng đặc biệt dễ đặt: `-1` = chưa xảy ra | |

Đổi lại: **date dimension không bao giờ có Type 2** — ngày 10/01/2026 không có phiên bản
thứ hai.

### Dòng đặc biệt cho ngày "chưa xảy ra"

Accumulating snapshot (xem [Fact và Dimension](fact-and-dimension.md)) có cột như
`ngay_giao` còn trống vì đơn chưa giao. Để `NULL` thì `JOIN` thường ném cả dòng đi — đúng
kiểu hỏng ở [case study "một nửa số đơn biến mất"](../case-studies/don-dang-giao-bien-mat.md).

Cách làm: thêm một dòng khoá `-1` nhãn `"Chưa xảy ra"` và **không bao giờ để `NULL` trong
cột khoá của fact**.

```sql
INSERT INTO dim_ngay
SELECT -1, NULL, 'Chua xay ra', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL;
```

### Giờ trong ngày tách thành dimension riêng

Đừng nhét 86.400 giây vào date dimension. Một năm 365 dòng; một năm × giây trong ngày là
31,5 triệu dòng. Tách thành `dim_gio_trong_ngay` (1.440 dòng nếu grain là phút) với các
cột như `ca_lam_viec`, `khung_gio_cao_diem`, rồi fact mang hai khoá.

### Nhiều múi giờ — một sự kiện, hai ngày

Chuỗi bán lẻ có cửa hàng ở Hà Nội và ở Berlin. Một giao dịch lúc 23:30 giờ Hà Nội là
17:30 cùng ngày ở Berlin — nhưng lúc 00:30 giờ Hà Nội thì ở Berlin vẫn là **ngày hôm
trước**.

Câu hỏi *"doanh thu ngày 10/01 là bao nhiêu"* có hai câu trả lời đúng, và chúng phục vụ
hai người khác nhau:

| Ai hỏi | Cần | Vì sao |
|---|---|---|
| Quản lý cửa hàng | Giờ **địa phương** | Ca làm việc, giờ cao điểm của cửa hàng đó |
| Tập đoàn | Một mốc **thống nhất** (UTC hoặc giờ trụ sở) | Cộng doanh thu toàn cầu phải cùng ranh giới ngày |

Cách Kimball khuyên giống hệt cách xử lý [nhiều loại tiền tệ](../skills/multi-currency-uom.md):
**fact mang cả hai bộ khoá**, chốt lúc nạp.

```sql
CREATE TABLE fct_ban (
  ngay_key_dia_phuong  INTEGER,   -- quan ly cua hang dung
  gio_key_dia_phuong   INTEGER,
  ngay_key_utc         INTEGER,   -- tap doan dung, cong duoc toan cau
  gio_key_utc          INTEGER,
  cua_hang_sk          INTEGER,
  doanh_thu            DECIMAL
);
```

Cả hai cùng trỏ vào **một** `dim_ngay` — nó vẫn là conformed dimension, chỉ là fact đóng
hai vai ([role-playing](../skills/role-playing-dimension.md)).

Múi giờ của từng cửa hàng là **thuộc tính của `dim_cua_hang`**, không phải của `dim_ngay`
— lịch không biết nó đang được đọc ở đâu. Và phải lưu tên vùng IANA (`Asia/Ho_Chi_Minh`),
không lưu độ lệch số (`+07:00`): độ lệch thay đổi theo giờ mùa hè ở nhiều nước, còn tên
vùng thì không.

Luật kèm theo: **không bao giờ trộn hai bộ khoá trong một câu `GROUP BY`**, và mọi báo
cáo phải ghi rõ đang dùng bộ nào. Thiếu dòng ghi chú đó là nguồn gốc của tranh cãi
"doanh thu ngày 10 rốt cuộc là bao nhiêu".

## Trade-offs

| Được | Mất |
|---|---|
| Định nghĩa lịch tài chính có một chỗ ở duy nhất | Thêm một bảng phải sinh và bảo trì |
| Câu hỏi "ngày làm việc", "ngày lễ" trả lời được | Ngày lễ phải nạp tay hằng năm (âm lịch không có công thức) |
| Nhãn hiển thị thống nhất mọi báo cáo | Cột tương đối làm mất tính bất biến |
| Join vào một bảng nhỏ, gần như luôn nằm trong cache | Thêm một join vào mọi query |

Chi phí join gần như bằng không: 365 dòng/năm, 20 năm là 7.300 dòng — engine nào cũng
broadcast.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Không có `dim_ngay`, dùng thẳng `quarter()` | Quý tài chính sai — xem [case study](../case-studies/bao-cao-quy-tai-chinh-lech.md) |
| Chỉ sinh tới hết năm nay | Đơn hàng giao năm sau rơi ra khỏi mọi báo cáo |
| Để `NULL` ở cột khoá ngày trong fact | `JOIN` loại sạch dòng, tổng hụt âm thầm |
| Nhét giờ/phút/giây vào cùng bảng | 31,5 triệu dòng thay vì 365 |
| Nhồi cột tương đối rồi coi bảng là bất biến | Báo cáo cũ chạy lại ra số khác |
| Mỗi mart tự dựng lịch riêng | Hai mart cùng "quý 1" khác nghĩa — xem [conformed dimension](../skills/conformed-dimension.md) |

## FAQ

<details>
<summary>Cần sinh sẵn tới năm nào?</summary>

Quá khứ: lùi tới ngày giao dịch đầu tiên của dữ liệu. Tương lai: ít nhất **2–3 năm**, vì
hợp đồng, lịch giao hàng, dự báo đều trỏ tới ngày chưa đến. Sinh 20 năm cũng chỉ 7.300
dòng — rẻ hơn nhiều so với lúc phát hiện thiếu.

</details>

<details>
<summary>Ngày lễ Việt Nam theo âm lịch thì tính thế nào?</summary>

Không có công thức trong SQL. Đây chính là lý do nó phải là **dữ liệu**: nạp từ một bảng
lịch nghỉ do người duy trì, mỗi năm một lần. Cột `la_ngay_le` sinh từ bảng đó, không sinh
từ hàm.

</details>

<details>
<summary>Nếu dùng OBT thì có cần date dimension không?</summary>

Có — chỉ đổi cách gắn: các cột lịch được **dẹt thẳng vào bảng lớn** thay vì join. Nhưng
định nghĩa vẫn phải sinh từ một chỗ, nếu không mỗi bảng lớn lại có một cách hiểu "quý"
riêng. Xem [Star, Snowflake, OBT](star-snowflake-obt.md).

</details>

<details>
<summary>Date dimension có bao giờ là role-playing không?</summary>

Gần như luôn luôn. Một fact đơn hàng có `ngay_dat_key`, `ngay_giao_key`, `ngay_nhan_key`
— cùng một `dim_ngay` đóng ba vai. Cách gắn tên cho từng vai nằm ở
[Role-playing dimension](../skills/role-playing-dimension.md).

</details>

## Related Topics

- [Role-playing dimension](../skills/role-playing-dimension.md) — một `dim_ngay` đóng nhiều vai trong cùng fact
- [Fact và Dimension](fact-and-dimension.md) — accumulating snapshot và các mốc ngày còn trống
- [Surrogate key](surrogate-key.md) — vì sao `ngay_key` được phép mang nghĩa
- [Aggregate fact table](../skills/aggregate-fact-table.md) — `dim_thang` phải sinh *từ* `dim_ngay`
- [CS: báo cáo quý tài chính lệch 202%](../case-studies/bao-cao-quy-tai-chinh-lech.md)
- [Lab dựng star schema](../tutorials/star-schema-duckdb.md) — bước 1 là dựng `dim_ngay`

## References

- Kimball Group — [Calendar Date Dimension](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 3
