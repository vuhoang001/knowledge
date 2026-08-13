---
title: "Bài tập bộ 5 — Fact nâng cao: phân bổ, luỹ kế, bảng tổng hợp, hành vi"
i18n_status: untranslated
sidebar_position: 14
description: "19 bài tự viết: phân bổ mất 1 đồng rồi khép kín lại, cột YTD phồng 3,38 lần, avg-của-avg lệch 5,7%, và khách Kim cương chi tiêu thấp nhất."
tags: [tutorial, bai-tap, allocated-facts, ytd-timespan-facts, aggregate-fact-table, behavior-dimension, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Bài tập bộ 5 — Fact nâng cao

> **Chốt:** bốn kỹ thuật ở đây đều là **số nằm sai grain**. Không số nào sai giá trị;
> chúng chỉ không cộng được theo cách người ta sẽ cộng — và `sum()` không bao giờ từ chối.

## Kỹ thuật được luyện trong bộ này

| # | Kỹ thuật | Tài liệu gốc | Số bài |
|---|---|---|---|
| 1 | Header/line và phân bổ fact | [Header/line và phân bổ fact](../skills/allocated-facts.md) | 5 |
| 2 | Year-to-date và timespan | [Year-to-date và timespan](../skills/ytd-timespan-facts.md) | 5 |
| 3 | Aggregate fact table | [Aggregate fact table](../skills/aggregate-fact-table.md) | 4 |
| 4 | Đưa hành vi vào dimension | [Đưa hành vi vào dimension](../skills/behavior-dimension.md) | 5 |

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Mốc: **10 đơn · 15 dòng · doanh thu 10.215.000 · phí ship 400.000**.

---

## Bộ A — Phân bổ số đo cấp header

### Bài A.1 — Phân bổ theo tiền hàng, và một đồng biến mất

**Đề:** `phi_ship` nằm ở cấp **đơn**, số đo khác ở cấp **dòng**. Phân bổ phí ship xuống
từng dòng theo tỷ trọng tiền hàng, rồi cộng lại và so với 400.000.

**Đáp số phải ra:**

```text
┌──────────────┬───────────┬────────┐
│ tong_phan_bo │ tong_that │ chenh  │
├──────────────┼───────────┼────────┤
│     399999.0 │    400000 │   -1.0 │
└──────────────┴───────────┴────────┘
```

**Thiếu đúng một đồng.** Nghe vô hại — bài A.2 giải thích vì sao không phải.

<details>
<summary>Lời giải</summary>

```sql
with pb as (
  select ct.don_hang_id, ct.dong, ct.so_luong*ct.don_gia tien_hang,
         round(h.phi_ship::double * (ct.so_luong*ct.don_gia)
               / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id)) phi_pb
  from don_hang_chi_tiet ct join don_hang h using (don_hang_id))
select sum(phi_pb) tong_phan_bo, 400000 tong_that, sum(phi_pb) - 400000 chenh from pb;
```

Thủ phạm là `round()`. `DH003` có phí 90.000 chia cho ba dòng theo tỷ lệ 900k : 450k :
600k:

```text
41538,46...  →  round  →  41538
20769,23...  →  round  →  20769
27692,30...  →  round  →  27692
                          ------
                          89999   ← thieu 1
```

Không có cách chọn số nguyên nào cho ba dòng mà tổng bằng đúng 90.000 **và** mỗi dòng
đều là làm tròn của tỷ lệ đúng. Đó là **tính chất toán học**, không phải bug — nên không
sửa được bằng cách viết `round` khéo hơn.

Vì sao 1 đồng lại nghiêm trọng: nó làm test đối soát **đỏ mỗi lần chạy**. Và test đỏ
thường xuyên thì trong vòng một tháng sẽ có người nới ngưỡng lên `abs(chenh) < 100`, rồi
`< 10000` — và từ đó test không bắt được gì nữa.

Bài A.2 sửa cho khép kín tuyệt đối.

</details>

### Bài A.2 — Gom sai số về dòng lớn nhất

**Đề:** sửa để `sum(phi_phan_bo)` bằng **đúng** 400.000, bằng cách dồn phần dư vào dòng
có tiền hàng lớn nhất của mỗi đơn.

**Đáp số phải ra:**

```text
┌──────────────┬───────────┬────────┐
│ tong_phan_bo │ tong_that │ chenh  │
├──────────────┼───────────┼────────┤
│     400000.0 │    400000 │    0.0 │
└──────────────┴───────────┴────────┘
```

<details>
<summary>Lời giải</summary>

```sql
with pb as (
  select ct.don_hang_id, ct.dong, ct.so_luong*ct.don_gia tien_hang, h.phi_ship,
         round(h.phi_ship::double * (ct.so_luong*ct.don_gia)
               / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id)) phi_pb,
         row_number() over (partition by ct.don_hang_id
                            order by ct.so_luong*ct.don_gia desc, ct.dong) hang
  from don_hang_chi_tiet ct join don_hang h using (don_hang_id)),
sua as (
  select *, case when hang = 1
                 then phi_pb + (phi_ship - sum(phi_pb) over (partition by don_hang_id))
                 else phi_pb end phi_cuoi
  from pb)
select sum(phi_cuoi) tong_phan_bo, 400000 tong_that, sum(phi_cuoi) - 400000 chenh from sua;
```

Kỹ thuật này có tên: **largest remainder** — chọn một dòng làm "dòng gánh", đẩy toàn bộ
sai số làm tròn vào đó.

Ba yêu cầu, thiếu cái nào cũng hỏng:

**1. Dòng gánh phải lớn nhất.** Dồn 1 đồng vào dòng 41.538 là sai lệch 0,002%; dồn vào
dòng 100 đồng là sai lệch 1%. Chọn dòng lớn nhất là tối thiểu hoá sai lệch tương đối.

**2. Thứ tự phải tất định.** `order by tien_hang desc, dong` — cột `dong` là để phá hoà.
Không có nó thì hai dòng cùng tiền hàng có thể đổi chỗ giữa các lần chạy, và **cùng một
dữ liệu cho hai kết quả khác nhau**. Trên bảng incremental, đó là dữ liệu tự đổi số.

**3. Phải chốt vào bảng, không tính lại lúc đọc.** Cột `phi_ship_phan_bo` là dữ liệu đã
quyết định, phải nằm trong fact. Tính lại mỗi lần đọc là mỗi báo cáo tự chọn dòng gánh
riêng.

Bây giờ test đối soát mới dùng được:

```sql
-- test: phan bo phai khep kin TUYET DOI
select don_hang_id from fct_ban_hang
group by 1 having sum(phi_ship_phan_bo) <> max(phi_ship_goc);
```

`<>` chứ không phải `abs(...) < nguong` — vì giờ đã khép kín thật.

</details>

### Bài A.3 — Đổi tiêu chí phân bổ, đổi kết quả

**Đề:** phân bổ phí ship theo **số lượng** thay vì theo tiền hàng, rồi so hai kết quả
theo mặt hàng.

**Đáp số phải ra:**

```text
┌─────────┬───────────┬───────────────┬──────────┐
│ ma_hang │ theo_tien │ theo_so_luong │  chenh   │
├─────────┼───────────┼───────────────┼──────────┤
│ SP-A    │  160000.0 │      187500.0 │  27500.0 │
│ SP-B    │  117692.0 │      110000.0 │  -7692.0 │
│ SP-C    │   86538.0 │       60000.0 │ -26538.0 │
│ SP-D    │   35769.0 │       42500.0 │   6731.0 │
└─────────┴───────────┴───────────────┴──────────┘
```

`SP-C` chênh **-26.538** — giảm 31%. Cùng một khoản 400.000, hai cách chia, hai kết luận
về lãi lỗ theo sản phẩm.

<details>
<summary>Lời giải</summary>

```sql
with tien as (
  select ct.don_hang_id, ct.ma_hang, ct.so_luong, ct.so_luong*ct.don_gia th, h.phi_ship
  from don_hang_chi_tiet ct join don_hang h using (don_hang_id)),
pb as (
  select ma_hang,
         phi_ship::double * th / sum(th) over (partition by don_hang_id) theo_tien,
         phi_ship::double * so_luong / sum(so_luong) over (partition by don_hang_id) theo_so_luong
  from tien)
select ma_hang, round(sum(theo_tien)) theo_tien, round(sum(theo_so_luong)) theo_so_luong,
       round(sum(theo_so_luong) - sum(theo_tien)) chenh
from pb group by 1 order by 1;
```

Cả hai cột đều cộng lại bằng 400.000. Cả hai đều "đúng". Nhưng chúng trả lời hai câu khác
nhau, và **quyết định nghiệp vụ dựa trên chúng sẽ ngược nhau**:

`SP-C` (Laptop, 900.000/cái, bán 3 cái) gánh **86.538** theo tiền nhưng chỉ **60.000**
theo số lượng. Nếu biên lợi nhuận của SP-C mỏng, hai cách chia này quyết định nó lãi hay
lỗ trên báo cáo P&L theo sản phẩm.

Chọn tiêu chí là **quyết định nghiệp vụ**, và mỗi loại chi phí có tiêu chí riêng:

| Số đo ở header | Tiêu chí | Vì sao |
|---|---|---|
| Phí vận chuyển | **trọng lượng / thể tích** | hãng tính theo cân, không theo tiền |
| Chiết khấu toàn đơn | **tiền hàng** | chiết khấu tính trên giá trị |
| Chi phí đóng gói | **số lượng món** | mỗi món một thao tác |
| Phí xử lý đơn | **chia đều** | chi phí không phụ thuộc nội dung |

Ở lab này không có `trong_luong_kg` nên phân bổ theo tiền là xấp xỉ. **Ghi lý do chọn
ngay cạnh code** — sáu tháng sau không ai nhớ vì sao chọn tiền hàng, và người kế nhiệm sẽ
đổi nó vì "theo cân hợp lý hơn", rồi mọi báo cáo lịch sử đổi số.

</details>

### Bài A.4 — Không phân bổ: giữ hai fact table

**Đề:** không có SQL bắt buộc. Thay vì phân bổ, giữ hai fact ở hai grain. Nêu cách làm và
khi nào nên chọn.

<details>
<summary>Lời giải</summary>

```sql
-- fact 1: grain DONG — chi so do cap dong
create or replace table fct_dong as
select don_hang_id, dong, ma_hang, ngay, so_luong, don_gia, so_luong*don_gia tien_hang
from don_hang_chi_tiet;

-- fact 2: grain DON — chi so do cap don
create or replace table fct_don as
select don_hang_id, khach_id, ngay_dat, ngay_giao, ngay_nhan, phi_ship
from don_hang;
```

Mỗi số đo nằm đúng **một** chỗ, ở đúng grain của nó. Không phân bổ, không sai số làm
tròn, không phải chọn tiêu chí.

Câu hỏi cắt ngang hai grain thì gom **trước khi** join:

```sql
-- DUNG: gom moi ben ve grain don, roi moi ghep
select d.khach_id, sum(l.tien_hang) tien_hang, sum(d.phi_ship) phi_ship
from fct_don d
join (select don_hang_id, sum(tien_hang) tien_hang from fct_dong group by 1) l
  using (don_hang_id)
group by 1;
```

**Khi nào chọn cách này:**

| | Phân bổ | Hai fact |
|---|---|---|
| Cần P&L **theo sản phẩm** | **bắt buộc** | không làm được |
| Chỉ cần tổng chi phí theo đơn/khách/tháng | thừa | **đúng và rẻ** |
| Tiêu chí phân bổ **gây tranh cãi** | mỗi phòng một số | **né được tranh cãi** |
| Đối soát với sổ kế toán | phải kiểm khép kín | **luôn khớp** |

Dòng thứ ba đáng cân nhắc nhất. Phân bổ luôn kèm một giả định nghiệp vụ, và giả định đó
sẽ bị chất vấn — thường là vào lúc báo cáo đang được dùng để đánh giá ai đó.

**Quy tắc:** đừng phân bổ cho tới khi có người **thật sự hỏi** câu cần phân bổ mới trả
lời được. Phân bổ sẵn "cho đủ" là tự tạo ra một con số phải bảo vệ mãi mãi. Xem
[case study phí ship phồng 133%](../case-studies/phi-ship-phong-133-phan-tram.md).

</details>

### Bài A.5 — Ba phép kiểm bắt buộc cho mọi phân bổ

**Đề:** viết ba test cho cột phân bổ: khép kín theo đơn, không âm, và không mất dòng.

<details>
<summary>Lời giải</summary>

```sql
-- 1. KHEP KIN: tong phan bo cua moi don = so goc
select don_hang_id, sum(phi_ship_phan_bo) tong_pb, max(phi_ship_goc) goc
from fct_ban_hang group by 1 having sum(phi_ship_phan_bo) <> max(phi_ship_goc);

-- 2. KHONG AM: he so am hoac mau so 0 sinh gia tri vo nghia
select don_hang_id, dong, phi_ship_phan_bo
from fct_ban_hang where phi_ship_phan_bo < 0;

-- 3. KHONG MAT DONG: moi dong fact deu co gia tri phan bo
select count(*) so_dong_thieu from fct_ban_hang where phi_ship_phan_bo is null;
```

Test 3 bắt cái bẫy tinh vi nhất: **đơn có tổng tiền hàng bằng 0**. Lúc đó mẫu số của tỷ
lệ phân bổ là 0, và:

```text
90000 * 0 / 0  →  NaN hoac NULL, tuy engine
```

Đơn tiền hàng 0 nghe vô lý nhưng có thật: đơn quà tặng, đơn đổi bảo hành, đơn giá trị
100% chiết khấu. Chúng vẫn có phí ship.

Cách chữa phải quyết định **trước**:

```sql
case when sum(tien_hang) over (partition by don_hang_id) = 0
     then phi_ship / count(*) over (partition by don_hang_id)   -- chia deu
     else phi_ship * tien_hang / sum(tien_hang) over (partition by don_hang_id)
end
```

Chia đều là lựa chọn hợp lý cho trường hợp này, nhưng **phải là lựa chọn có ý thức**,
không phải `NULL` rơi ra rồi ai đó `coalesce(..., 0)` cho hết đỏ.

Ba test này phải chạy **trước** khi bảng được công bố, không phải sau khi có người báo
số lệch.

</details>

---

## Bộ B — Year-to-date và timespan

### Bài B.1 — Cột luỹ kế phồng 3,38 lần

**Đề:** dựng bảng theo ngày có sẵn cột `dt_ytd`, rồi cộng cột đó lại — đúng thao tác mà
mọi công cụ BI làm khi kéo cột vào ô tổng.

**Đáp số phải ra:**

```text
┌────────────────┬─────────────┬───────────────┐
│ doanh_thu_that │ sum_cot_ytd │ phong_may_lan │
├────────────────┼─────────────┼───────────────┤
│       10215000 │    34560000 │          3.38 │
└────────────────┴─────────────┴───────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
with theo_ngay as (select ngay, sum(so_luong*don_gia) dt from don_hang_chi_tiet group by 1),
     ytd as (select ngay, dt, sum(dt) over (order by ngay) dt_ytd from theo_ngay)
select (select sum(dt) from theo_ngay) doanh_thu_that,
       sum(dt_ytd) sum_cot_ytd,
       round(sum(dt_ytd) * 1.0 / (select sum(dt) from theo_ngay), 2) phong_may_lan
from ytd;
```

Bảng `ytd` **đúng ở mọi dòng** — ngày 05/07 luỹ kế 10.215.000, chính xác. Nó chỉ hỏng khi
bị cộng.

Hệ số phồng 3,38 với 5 ngày. Với `n` kỳ, hệ số xấp xỉ `(n+1)/2` — 12 tháng cho **~6,5
lần**, 365 ngày cho **~183 lần**. Và vì hệ số **đổi theo số kỳ đang xem**, không có tỷ lệ
cố định nào để nhận ra bằng mắt.

So sánh với số dư ngân hàng — cũng non-additive theo thời gian — cho thấy vì sao YTD nguy
hiểm hơn:

| | Số dư tài khoản | `doanh_thu_ytd` |
|---|---|---|
| Cộng qua thời gian | vô nghĩa | vô nghĩa |
| Người dùng **nhận ra** là vô nghĩa | có — "cộng số dư 5 ngày" nghe sai ngay | **không** — trông y hệt `doanh_thu` |

Đó là khác biệt chí mạng. Tên cột `doanh_thu_ytd` gợi ý nó là doanh thu, và doanh thu thì
cộng được. Xem [case study cộng cột luỹ kế](../case-studies/cong-cot-luy-ke.md).

</details>

### Bài B.2 — Tính luỹ kế lúc đọc

**Đề:** bỏ cột YTD khỏi bảng, tính bằng window function lúc đọc.

**Đáp số phải ra:**

```text
┌────────────┬─────────┬──────────┐
│    ngay    │   dt    │  dt_ytd  │
├────────────┼─────────┼──────────┤
│ 2026-07-01 │ 1350000 │  1350000 │
│ 2026-07-02 │ 3150000 │  4500000 │
│ 2026-07-03 │ 4200000 │  8700000 │
│ 2026-07-04 │ 1095000 │  9795000 │
│ 2026-07-05 │  420000 │ 10215000 │
└────────────┴─────────┴──────────┘
```

Dòng cuối = **10.215.000**. Đó là phép kiểm: luỹ kế cuối kỳ phải bằng tổng.

<details>
<summary>Lời giải</summary>

```sql
with theo_ngay as (select ngay, sum(so_luong*don_gia) dt from don_hang_chi_tiet group by 1)
select ngay, dt, sum(dt) over (order by ngay) dt_ytd from theo_ngay order by ngay;
```

Cùng con số, khác chỗ tính. Và khác biệt quan trọng: **cột `dt` cộng được, cột `dt_ytd`
không** — nhưng giờ `dt_ytd` chỉ tồn tại trong kết quả truy vấn, không nằm trong bảng để
ai đó kéo nhầm.

Luật cho mọi số luỹ kế:

```text
Luy ke (YTD, MTD, running total)  →  DUNG luu. Tinh luc doc.
Khoang hieu luc (tu ... den ...)  →  PHAI luu. Khong tinh lai duoc.
```

Hai vế ngược nhau và đó là lý do chúng nằm chung một bài. Luỹ kế là **hàm của dữ liệu đã
có**, tính lại lúc nào cũng ra; khoảng hiệu lực là **sự thật lịch sử**, mất là mất vĩnh
viễn.

Nếu YTD thật sự cần vì lý do hiệu năng, thì đặt tên cho nó không thể cộng nhầm:

```text
doanh_thu_ytd                    ← nguy hiem
doanh_thu_luy_ke_khong_duoc_cong ← xau, nhung an toan
```

Hoặc tốt hơn: để nó trong một view riêng mà công cụ BI không import.

</details>

### Bài B.3 — Timespan: khoảng hiệu lực cứu đơn `DN03`

**Đề:** `ty_gia` **thiếu dòng EUR ngày 04/07**, nên `join` bằng làm mất đơn `DN03`. Dựng
tỷ giá dạng **khoảng hiệu lực** rồi join `between`.

**Đáp số phải ra:**

```text
┌──────────────┬────────────┬─────────┬─────────┬────────┬─────────────┬──────────────┬─────────────┐
│ don_ngoai_id │  ngay_dat  │ tien_te │ so_tien │ ty_gia │ hieu_luc_tu │ hieu_luc_den │ quy_doi_vnd │
├──────────────┼────────────┼─────────┼─────────┼────────┼─────────────┼──────────────┼─────────────┤
│ DN01         │ 2026-07-01 │ USD     │     400 │  25400 │ 2026-07-01  │ 2026-07-01   │    10160000 │
│ DN02         │ 2026-07-02 │ EUR     │     250 │  27650 │ 2026-07-02  │ 2026-07-02   │     6912500 │
│ DN03         │ 2026-07-04 │ EUR     │     300 │  27700 │ 2026-07-03  │ 2026-07-04   │     8310000 │
│ DN04         │ 2026-07-05 │ USD     │     150 │  25500 │ 2026-07-05  │ 2026-07-05   │     3825000 │
│ DN05         │ 2026-07-08 │ USD     │     220 │  25550 │ 2026-07-08  │ 2026-07-08   │     5621000 │
│ DN06         │ 2026-07-09 │ EUR     │     180 │  27900 │ 2026-07-09  │ 2026-07-09   │     5022000 │
│ DN07         │ 2026-07-03 │ VND     │ 1500000 │   NULL │ NULL        │ NULL         │        NULL │
└──────────────┴────────────┴─────────┴─────────┴────────┴─────────────┴──────────────┴─────────────┘
```

`DN03` **được cứu** — nó lấy tỷ giá ngày 03/07, có hiệu lực tới hết 04/07. `DN07` vẫn
`NULL`, và đó là bài của [bộ 6](bt-06-tich-hop.md).

<details>
<summary>Lời giải</summary>

```sql
with tg as (
  select tien_te, ngay hieu_luc_tu,
         coalesce((lead(ngay) over (partition by tien_te order by ngay) - interval 1 day)::date,
                  date '9999-12-31') hieu_luc_den,
         ty_gia
  from ty_gia)
select d.don_ngoai_id, d.ngay_dat, d.tien_te, d.so_tien, tg.ty_gia,
       tg.hieu_luc_tu, tg.hieu_luc_den, d.so_tien * tg.ty_gia quy_doi_vnd
from don_hang_ngoai_te d
left join tg on tg.tien_te = d.tien_te
            and d.ngay_dat between tg.hieu_luc_tu and tg.hieu_luc_den
order by d.don_ngoai_id;
```

Đây là **biến bảng sự kiện thành bảng khoảng** — cùng kỹ thuật đã dùng để dựng
[dim Type 2 ở bộ 1](bt-01-nen-tang.md#bài-c2--dựng-dimension-type-2-từ-bản-trích-hàng-ngày),
lần này áp cho tỷ giá.

Chú ý dòng `DN03`: `hieu_luc_tu = 03/07`, `hieu_luc_den = 04/07` — khoảng **dài hai
ngày**, vì ngày 04/07 không có dòng tỷ giá mới. Đó chính xác là ngữ nghĩa đúng của tỷ
giá: **giữ nguyên cho tới khi có giá mới**.

Nếu dùng `join` bằng `on tg.ngay = d.ngay_dat`, `DN03` biến mất **không dấu vết**. Và đây
là hình dạng chung của cả một lớp lỗi:

| Loại dữ liệu | Bản chất | Join đúng |
|---|---|---|
| Tỷ giá, giá bán, thuế suất | **khoảng** — có hiệu lực tới khi đổi | `between` |
| Giao dịch, sự kiện | **điểm** — xảy ra một lần | `=` |

Nhầm khoảng thành điểm là mất dòng mỗi khi nguồn không gửi giá trị cho một ngày — cuối
tuần, ngày lễ, hoặc đơn giản là job nguồn lỗi một hôm.

</details>

### Bài B.4 — Số dư: semi-additive theo thời gian

**Đề:** với `kho_hang` (tồn cuối ngày), tính ba cách gộp theo thời gian và chỉ ra cách
nào dùng được.

**Đáp số phải ra:**

```text
┌─────────┬───────────────┬─────────────┬────────┐
│ ma_hang │ cong_bay_ngay │ ton_cuoi_ky │ ton_tb │
├─────────┼───────────────┼─────────────┼────────┤
│ SP-A    │           420 │          78 │   84.0 │
│ SP-B    │           217 │          41 │   43.4 │
│ SP-C    │            87 │          16 │   17.4 │
│ SP-D    │           992 │         193 │  198.4 │
└─────────┴───────────────┴─────────────┴────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select ma_hang, sum(ton_cuoi_ngay) cong_bay_ngay,
       max_by(ton_cuoi_ngay, ngay) ton_cuoi_ky,
       round(avg(ton_cuoi_ngay),1) ton_tb
from kho_hang group by 1 order by 1;
```

Bài này lặp lại [bộ 1 bài A.4](bt-01-nen-tang.md#bài-a4--snapshot-cộng-dọc-thời-gian-là-vô-nghĩa)
có chủ ý — vì `ton_cuoi_ngay` và `doanh_thu_ytd` là **cùng một loại bệnh**, và nhận ra
điều đó quan trọng hơn nhớ từng ca:

```text
Additive        : cong duoc theo MOI chieu           (doanh_thu, so_luong)
Semi-additive   : cong duoc TRU chieu thoi gian      (ton kho, so du, YTD)
Non-additive    : khong cong duoc theo chieu nao     (ty le, don gia, lai suat)
```

Ba loại này phải được **ghi vào tài liệu bảng cho từng cột số**, vì SQL không phân biệt.
Cách thực dụng nhất là ghi ngay trong `schema.yml` của dbt:

```yaml
columns:
  - name: ton_cuoi_ngay
    description: >
      SEMI-ADDITIVE. Cong duoc theo mat hang/kho.
      KHONG cong duoc theo ngay — dung max_by(ngay) hoac avg.
```

Và cưỡng chế ở tầng BI bằng cách khai `aggregation: last_value` cho cột đó, nếu công cụ
hỗ trợ. Không cưỡng chế được thì ít nhất phải có tài liệu — vì cột này sẽ bị cộng nhầm,
vấn đề chỉ là khi nào.

</details>

### Bài B.5 — Số nào lưu, số nào tính

**Đề:** không có SQL. Lập bảng quyết định cho sáu số đo.

<details>
<summary>Lời giải</summary>

| Số đo | Lưu hay tính | Vì sao |
|---|---|---|
| `tien_hang` (số lượng × đơn giá) | **lưu** | atomic, additive, là nguồn của mọi thứ khác |
| `doanh_thu_ytd` | **tính** | hàm của dữ liệu đã có; lưu là mời người ta cộng nhầm |
| `phi_ship_phan_bo` | **lưu** | kết quả của một **quyết định** (tiêu chí, dòng gánh) — tính lại có thể ra khác |
| `ty_le_tra_hang` | **tính** | non-additive; lưu tỷ lệ là mất tử số/mẫu số |
| `hieu_luc_tu` / `hieu_luc_den` | **lưu** | sự thật lịch sử, mất là không dựng lại được |
| `ton_cuoi_ngay` | **lưu** | không suy ra được từ giao dịch nếu có nhập/xuất ngoài hệ thống |

Quy tắc rút ra, ba câu:

**Lưu thứ không tính lại được.** Khoảng hiệu lực, snapshot, kết quả của quyết định nghiệp
vụ.

**Tính thứ tính lại được.** Luỹ kế, tỷ lệ, xếp hạng, phân vị.

**Nghi ngờ thì lưu tử số và mẫu số, đừng lưu thương.** `ty_le_tra_hang` = 0,12 là ngõ
cụt; lưu `gia_tri_tra` và `doanh_thu` thì tính được tỷ lệ ở **mọi** mức tổng hợp. Bài
C.2 chứng minh bằng số.

Ngoại lệ duy nhất cho "tính thứ tính lại được": khi tính lại quá đắt và kết quả **bất
biến**. Lúc đó lưu, nhưng phải đặt tên cột và ghi tài liệu sao cho không ai cộng nhầm.

</details>

---

## Bộ C — Aggregate fact table

### Bài C.1 — Bảng tổng hợp lưu `avg`: lệch 5,7%

**Đề:** dựng bảng tổng hợp theo ngày lưu sẵn `avg`, rồi tính trung bình toàn kỳ từ đó và
so với số tính từ bảng atomic.

**Đáp số phải ra:**

```text
┌────────────────────────────────┬─────────────┐
│             nguon              │ tb_moi_dong │
├────────────────────────────────┼─────────────┤
│ tu atomic                      │    681000.0 │
│ tu agg: sum(tong)/sum(so_dong) │    681000.0 │
│ tu agg: avg(tong/so_dong) SAI  │    642500.0 │
└────────────────────────────────┴─────────────┘
```

**642.500 so với 681.000 — lệch 5,7%.**

<details>
<summary>Lời giải</summary>

```sql
create or replace table agg_ngay as
select ngay, sum(so_luong*don_gia) tong_tien, count(*) so_dong,
       count(distinct don_hang_id) so_don
from don_hang_chi_tiet group by 1;

select 'tu atomic' nguon, round(avg(so_luong*don_gia),1) tb_moi_dong from don_hang_chi_tiet
union all select 'tu agg: sum(tong)/sum(so_dong)', round(sum(tong_tien)*1.0/sum(so_dong),1) from agg_ngay
union all select 'tu agg: avg(tong/so_dong) SAI', round(avg(tong_tien*1.0/so_dong),1) from agg_ngay;
```

**Avg-của-avg sai vì mỗi ngày có số dòng khác nhau.** Ngày 05/07 chỉ có 2 dòng nhưng
được tính trọng số bằng ngày 02/07 có 4 dòng.

```text
avg(a/b) ≠ sum(a)/sum(b)   khi b khong deu nhau
```

Đây là lý do bảng tổng hợp **phải lưu tử số và mẫu số riêng**, không lưu thương:

| Lưu gì | Tính lại được `avg` đúng? |
|---|---|
| `avg_tien` | **không** — đã mất mẫu số |
| `tong_tien` + `so_dong` | **có** — `sum/sum` |

Nguyên tắc tổng quát: **bảng tổng hợp chỉ được lưu số additive**. `sum`, `count`, `min`,
`max` thì được. `avg`, tỷ lệ, phần trăm, phân vị thì không — chúng phải được **suy ra**
từ các số additive lúc đọc.

`count(distinct ...)` là trường hợp ranh giới đáng nhớ: cột `so_don` trong `agg_ngay`
**không cộng qua các ngày được** nếu một đơn trải nhiều ngày. Ở đây mỗi đơn nằm gọn một
ngày nên `sum(so_don)` = 10 tình cờ đúng — bài C.2 kiểm.

</details>

### Bài C.2 — Đối soát bảng tổng hợp với atomic

**Đề:** kiểm `agg_ngay` khớp với bảng atomic, cả tổng tiền lẫn số đơn.

**Đáp số phải ra:**

```text
┌──────────┬───────────┬────────┬─────────────┬─────────────┐
│  tu_agg  │ tu_atomic │ chenh  │ cong_so_don │ so_don_that │
├──────────┼───────────┼────────┼─────────────┼─────────────┤
│ 10215000 │  10215000 │      0 │          10 │          10 │
└──────────┴───────────┴────────┴─────────────┴─────────────┘
```

Cả hai cặp đều khớp. Nhưng cặp thứ hai khớp vì **may**, không vì đúng.

<details>
<summary>Lời giải</summary>

```sql
select (select sum(tong_tien) from agg_ngay) tu_agg,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) tu_atomic,
       (select sum(tong_tien) from agg_ngay)
         - (select sum(so_luong*don_gia) from don_hang_chi_tiet) chenh,
       (select sum(so_don) from agg_ngay) cong_so_don,
       (select count(distinct don_hang_id) from don_hang_chi_tiet) so_don_that;
```

`sum(tong_tien)` khớp vì tiền là **additive** — cộng theo ngày rồi cộng các ngày luôn
bằng cộng thẳng.

`sum(so_don)` khớp **chỉ vì trong dữ liệu này mọi đơn nằm gọn trong một ngày**. Thêm một
đơn có dòng ở hai ngày là hai bên lệch ngay: `agg` đếm nó hai lần, atomic đếm một lần.

Đó là lý do `count(distinct)` **không được lưu trong bảng tổng hợp** — hoặc nếu lưu thì
phải ghi rõ nó chỉ dùng được ở đúng mức đã gom, không được cộng lên mức cao hơn.

Ba lối ra khi thật sự cần đếm phân biệt ở nhiều mức:

| Cách | Đánh đổi |
|---|---|
| Bảng tổng hợp riêng cho **mỗi** mức cần | nhiều bảng, tốn chỗ, đúng tuyệt đối |
| Lưu HyperLogLog sketch | cộng được, sai số ~2% |
| Về atomic khi cần `distinct` | chậm, nhưng luôn đúng |

Và test đối soát này phải **chạy mỗi lần build bảng tổng hợp**. Bảng tổng hợp lệch so với
atomic là loại lỗi tệ nhất: hai báo cáo cùng chủ đề cho hai con số, và người dùng mất
lòng tin vào cả hai — đúng
[case study bảng tổng hợp lệch số](../case-studies/bang-tong-hop-lech-so.md).

</details>

### Bài C.3 — Dimension rút gọn phải sinh từ dimension gốc

**Đề:** không có SQL bắt buộc. Bảng tổng hợp theo `nhom` cần một `dim_nhom` rút gọn. Vì
sao nó **phải** sinh từ `dim_hang_hoa` chứ không dựng riêng?

<details>
<summary>Lời giải</summary>

```sql
-- DUNG: sinh tu dim goc
create or replace table dim_nhom as
select distinct nhom_id, ten_nhom from cay_nhom_hang
where nhom_id in (select nhom_id from hang_hoa_nhom);

-- SAI: dung rieng tu nguon khac
create or replace table dim_nhom_sai as
select * from (values ('N5','Thiet bi nhap'), ('N6','Man hinh')) t(nhom_id, ten_nhom);
```

Bảng thứ hai **hôm nay đúng**. Nó sai vào ngày ai đó đổi tên nhóm trong `cay_nhom_hang`
mà quên đổi ở đây. Từ hôm đó:

```text
Bao cao chi tiet (tu dim_hang_hoa)  →  "Thiet bi hien thi"
Bao cao tong hop (tu dim_nhom_sai)  →  "Man hinh"
```

Hai báo cáo, hai nhãn cho cùng một nhóm, và **không ai biết cái nào đúng**. Tệ hơn: nếu
`nhom_id` cũng lệch thì tổng hai báo cáo khác nhau, và cuộc điều tra sẽ mất vài ngày.

Đây là nguyên tắc **shrunken dimension** của Kimball: dimension của bảng tổng hợp phải là
**tập con thật sự** của dimension chi tiết — cùng khoá, cùng nhãn, sinh ra bằng
`select distinct` từ bảng gốc.

Ba điều kiện để bảng tổng hợp gọi là **hợp lệ**:

1. **Dimension rút gọn sinh từ dimension gốc**, không dựng riêng.
2. **Chỉ chứa số additive** (bài C.1).
3. **Có test đối soát với atomic** (bài C.2).

Thiếu bất kỳ điều nào thì bảng tổng hợp không phải "bản nhanh hơn của sự thật" — nó là
**một sự thật thứ hai**, và hai sự thật thì luôn có một cái sai.

</details>

### Bài C.4 — Bảng tổng hợp có đáng dựng không

**Đề:** không có SQL. Nêu điều kiện để bảng tổng hợp đáng công.

<details>
<summary>Lời giải</summary>

**Đo trước, dựng sau.** Bảng tổng hợp là tối ưu hoá, và tối ưu hoá chưa đo là nợ kỹ thuật
trả trước.

Ba số cần đo:

| Đo gì | Ngưỡng đáng dựng |
|---|---|
| **Hệ số nén** = dòng atomic / dòng tổng hợp | ≥ 10× |
| **Tần suất** truy vấn ở đúng mức đó | hàng ngày trở lên |
| **Thời gian truy vấn** hiện tại | đủ chậm để người dùng phàn nàn |

Với lab này: 15 dòng atomic → 5 dòng theo ngày. Hệ số **3×**. Không đáng — và đó là câu
trả lời trung thực, dù bài tập vừa dựng nó.

Chi phí thật của bảng tổng hợp không phải dung lượng, mà là **ba thứ phải duy trì mãi**:

1. **Pipeline thứ hai** phải chạy đúng thứ tự sau atomic, và fail được.
2. **Test đối soát** phải chạy mỗi lần, và ai đó phải xử lý khi nó đỏ.
3. **Câu hỏi "dùng bảng nào"** với mọi người viết báo cáo, mãi mãi.

Điểm 3 là thứ hay bị bỏ qua nhất. Người dùng không biết chọn bảng nào sẽ chọn sai, và
báo cáo sai sẽ được tin vì "nó ra từ kho dữ liệu".

**Thứ tự nên thử, trước khi dựng bảng tổng hợp:**

```text
1. Phan vung theo ngay + cot hoa (Parquet/Iceberg)  →  thuong du
2. Sap xep/cluster theo cot hay loc                  →  re, khong them bang
3. Materialized view engine tu duy tri               →  khong co pipeline thu hai
4. Bang tong hop tu quan ly                          →  chi khi 1-3 khong du
```

Ba bước đầu **không tạo ra sự thật thứ hai**. Chỉ xuống bước 4 khi đã đo và ba bước trên
không đủ. Xem [Aggregate fact table](../skills/aggregate-fact-table.md).

</details>

---

## Bộ D — Đưa hành vi vào dimension

### Bài D.1 — Thuộc tính hành vi tổng hợp từ fact

**Đề:** dựng `dim_khach_hanh_vi` — dimension khách hàng có thêm thuộc tính **tính từ
fact**: số đơn, tổng chi, lần mua cuối, phân khúc chi tiêu, số ngày không mua.

**Đáp số phải ra:**

```text
┌──────────┬───────────┬────────┬──────────┬─────────────────────┬───────────────────┐
│ khach_id │   hang    │ so_don │ tong_chi │    phan_khuc_chi    │ so_ngay_khong_mua │
├──────────┼───────────┼────────┼──────────┼─────────────────────┼───────────────────┤
│ C2       │ Vang      │      3 │  3720000 │ Chi tieu cao        │                 0 │
│ C1       │ Bac       │      3 │  2745000 │ Chi tieu trung binh │                 1 │
│ C3       │ Bac       │      2 │  2100000 │ Chi tieu trung binh │                 1 │
│ C4       │ Kim cuong │      2 │  1650000 │ Chi tieu thap       │                 0 │
└──────────┴───────────┴────────┴──────────┴─────────────────────┴───────────────────┘
```

**`C4` hạng Kim cương nhưng chi tiêu thấp nhất.** Đó không phải lỗi dữ liệu — đó là toàn
bộ lý do kỹ thuật này tồn tại.

<details>
<summary>Lời giải</summary>

```sql
create or replace table dim_khach_hanh_vi as
with tk as (
  select h.khach_id, count(distinct h.don_hang_id) so_don,
         sum(ct.so_luong*ct.don_gia) tong_chi, max(h.ngay_dat) lan_cuoi
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1)
select k.khach_id, k.ho_ten, k.hang, tk.so_don, tk.tong_chi, tk.lan_cuoi,
       case when tk.tong_chi >= 3000000 then 'Chi tieu cao'
            when tk.tong_chi >= 2000000 then 'Chi tieu trung binh'
            else 'Chi tieu thap' end phan_khuc_chi,
       date '2026-07-05' - tk.lan_cuoi so_ngay_khong_mua
from khach_hang k join tk using (khach_id);

select khach_id, hang, so_don, tong_chi, phan_khuc_chi, so_ngay_khong_mua
from dim_khach_hanh_vi order by tong_chi desc;
```

Hai cột `hang` và `phan_khuc_chi` là **hai loại thuộc tính khác hẳn nhau**:

| | `hang` | `phan_khuc_chi` |
|---|---|---|
| Nguồn | **gán** bởi nghiệp vụ | **tính** từ fact |
| Đổi khi | có người quyết định | dữ liệu đổi |
| Tin được không | có, là chính sách | có, là sự thật đo được |

`C4` mâu thuẫn giữa hai cột chính là **phát hiện có giá trị**: khách được xếp Kim cương
(có thể do lịch sử cũ, do quan hệ, do một đơn lớn năm ngoái) nhưng hiện chi tiêu thấp
nhất. Không có cột hành vi thì mâu thuẫn này không nhìn thấy được.

**Ba cái bẫy phải biết trước khi làm:**

1. **`date '2026-07-05'` bị chôn cứng.** Ngày mai chạy lại, `so_ngay_khong_mua` không đổi
   — sai. Phải là ngày chạy, hoặc phải là cột tính lúc đọc.
2. **Dimension giờ phụ thuộc fact.** Thứ tự nạp đảo ngược: fact trước, dimension sau. Đó
   là ngoại lệ so với luật thường và phải ghi rõ trong pipeline.
3. **Nó đổi mỗi ngày.** Đúng vấn đề của [bộ 2 bài B.5](bt-02-dimension-thoi-gian.md) —
   nếu bật Type 2 trên các cột này thì dim phình. Bài D.2 là lối ra.

</details>

### Bài D.2 — Phân khoảng động lúc đọc

**Đề:** thay vì chốt phân khúc vào dimension, tính **lúc đọc** bằng `ntile` và
`percent_rank`.

**Đáp số phải ra:**

```text
┌──────────┬──────────┬───────────────┬─────────┐
│ khach_id │ tong_chi │ nua_tren_duoi │ phan_vi │
├──────────┼──────────┼───────────────┼─────────┤
│ C2       │  3720000 │             1 │   100.0 │
│ C1       │  2745000 │             1 │    67.0 │
│ C3       │  2100000 │             2 │    33.0 │
│ C4       │  1650000 │             2 │     0.0 │
└──────────┴──────────┴───────────────┴─────────┘
```

<details>
<summary>Lời giải</summary>

```sql
with tk as (
  select h.khach_id, sum(ct.so_luong*ct.don_gia) tong_chi
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1)
select khach_id, tong_chi,
       ntile(2) over (order by tong_chi desc) nua_tren_duoi,
       round(100.0 * percent_rank() over (order by tong_chi), 0) phan_vi
from tk order by tong_chi desc;
```

Khác biệt căn bản với bài D.1:

| | Ngưỡng cố định (D.1) | Phân vị động (D.2) |
|---|---|---|
| `C4` là gì | "Chi tiêu thấp" **vĩnh viễn** trong dim | "nửa dưới" **so với tập hiện tại** |
| Lạm phát làm mọi người vượt ngưỡng | tất cả thành "Chi tiêu cao" | tỷ lệ giữ nguyên |
| So sánh giữa hai kỳ | **được** | **không** — "nửa trên" mỗi kỳ một nghĩa |
| Lưu vào dim | được | **không nên** |

Dòng thứ ba là lý do quyết định. Phân vị **không so sánh được qua thời gian**: "top 25%
tháng 6" và "top 25% tháng 7" là hai tập khác nhau với hai ngưỡng khác nhau, và biểu đồ
đường nối hai điểm đó là biểu đồ vô nghĩa.

**Quy tắc:**

```text
Nguong CO DINH (nghiep vu dat)  →  chot vao dim, so sanh duoc qua thoi gian
Phan vi DONG   (tinh tu du lieu) →  tinh luc doc, KHONG chot vao dim
```

Chốt phân vị vào dimension là lỗi nghiêm trọng vì nó **tự thay đổi khi bảng được dựng
lại**: khách không làm gì cả mà nhảy từ "top 25%" xuống "top 50%" chỉ vì có khách mới
vào. Báo cáo lịch sử đổi số, và không ai truy được nguyên nhân.

</details>

### Bài D.3 — Step dimension: vị trí trong phễu

**Đề:** với `su_kien_web`, đánh số bước của từng sự kiện trong phiên (một khách một
ngày), rồi thống kê loại sự kiện theo từng bước.

**Đáp số phải ra:**

```text
┌───────┬────────────┬───────┬──────────┬────────────┐
│ buoc  │ so_su_kien │  xem  │ them_gio │ thanh_toan │
├───────┼────────────┼───────┼──────────┼────────────┤
│     1 │         13 │    13 │        0 │          0 │
│     2 │         10 │     0 │       10 │          0 │
│     3 │         10 │     3 │        1 │          6 │
│     4 │          5 │     1 │        3 │          1 │
│     5 │          3 │     1 │        0 │          2 │
│     6 │          1 │     0 │        1 │          0 │
│     7 │          1 │     0 │        0 │          1 │
└───────┴────────────┴───────┴──────────┴────────────┘
```

**Bước 1 luôn là `xem`, bước 2 luôn là `them_gio`.** Từ bước 3 mới phân nhánh.

<details>
<summary>Lời giải</summary>

```sql
with b as (
  select khach_id, cast(thoi_diem as date) ngay, loai_su_kien, thoi_diem,
         row_number() over (partition by khach_id, cast(thoi_diem as date)
                            order by thoi_diem) buoc,
         count(*) over (partition by khach_id, cast(thoi_diem as date)) tong_buoc
  from su_kien_web)
select buoc, count(*) so_su_kien,
       count(*) filter (where loai_su_kien='xem') xem,
       count(*) filter (where loai_su_kien='them_gio') them_gio,
       count(*) filter (where loai_su_kien='thanh_toan') thanh_toan
from b group by 1 order by 1;
```

`buoc` là một **step dimension** — thuộc tính mô tả *vị trí của sự kiện trong chuỗi*,
không phải bản thân sự kiện.

Nó trả lời được lớp câu hỏi mà bảng sự kiện thô không trả lời được:

| Câu hỏi | Cần `buoc` |
|---|---|
| Khách bỏ cuộc ở bước thứ mấy? | có |
| Bao nhiêu bước trước khi chốt đơn? | có |
| Bước nào rụng nhiều nhất? | có |
| Tổng số lượt xem | không |

Cột `tong_buoc` (đếm ngược) cũng đáng lưu: nó cho phép hỏi *"sự kiện này cách kết thúc
phiên mấy bước"* — hữu ích để phân tích cái gì xảy ra ngay trước khi bỏ.

**Bẫy:** `buoc` phụ thuộc **định nghĩa phiên**. Ở đây phiên = khách × ngày; đổi sang cắt
theo khoảng lặng 30 phút (như
[bộ 1 bài B.4](bt-01-nen-tang.md#bài-b4--grain-của-phiên-quyết-định-con-số-bỏ-giỏ)) là mọi
số trong bảng đổi. Nên định nghĩa phiên phải chốt **trước**, và ghi vào tài liệu bảng.

</details>

### Bài D.4 — Nhóm nghiên cứu: tập khách bị đóng băng

**Đề:** không có SQL bắt buộc. Marketing muốn theo dõi *"nhóm khách đã mua trong tháng
7"* suốt 6 tháng tới. Vì sao không được dùng bộ lọc động?

<details>
<summary>Lời giải</summary>

```sql
-- SAI: bo loc dong — tap khach doi moi lan chay
select ... from fct_ban_hang f join dim_khach k using (khach_key)
where k.lan_mua_cuoi between '2026-07-01' and '2026-07-31';

-- DUNG: dong bang tap khach thanh mot bang
create or replace table nhom_nc_thang7 as
select distinct khach_id, date '2026-08-01' ngay_chot,
       'Da mua trong thang 7/2026' tieu_chi
from don_hang where ngay_dat between date '2026-07-01' and date '2026-07-31';
```

Bộ lọc động hỏng vì **tập khách tự thay đổi**:

- Fact về muộn (bộ 2 bài E.1) thêm khách vào nhóm sau khi nghiên cứu đã bắt đầu.
- Khách bị xoá/gộp ở nguồn rơi khỏi nhóm.
- Ai đó sửa định nghĩa `lan_mua_cuoi` là cả nhóm đổi.

Và khi tập đổi, **so sánh "trước/sau" mất ý nghĩa** — bạn không biết chênh lệch đến từ
hành vi khách hay từ việc tập đã khác.

Đây gọi là **study group** hay *static cohort*: một bảng chỉ chứa khoá, đóng băng tại một
thời điểm, kèm tiêu chí và ngày chốt.

```sql
-- dung: join nhu mot dimension
select d.thang, count(distinct f.khach_id) khach_con_hoat_dong, sum(f.tien_hang)
from fct_ban_hang f
join nhom_nc_thang7 n on n.khach_id = f.khach_id
join dim_ngay d on d.ngay_key = f.ngay_dat_key
group by 1 order by 1;
```

Ba thứ **bắt buộc** phải lưu cùng: `ngay_chot`, `tieu_chi` bằng lời, và câu SQL đã sinh
ra nó. Không có ba thứ đó thì sáu tháng sau không ai tái lập được nhóm, và kết quả nghiên
cứu không kiểm chứng được.

Bảng nhóm nghiên cứu là **bất biến**. Cần nhóm mới thì tạo bảng mới, không sửa bảng cũ.

</details>

### Bài D.5 — Hành vi vào dimension hay để trong fact

**Đề:** không có SQL. Khi nào đưa thuộc tính hành vi vào dimension, khi nào để nguyên
trong fact?

<details>
<summary>Lời giải</summary>

| Câu hỏi | Chỗ đúng |
|---|---|
| "Doanh thu theo **phân khúc chi tiêu**" | **dimension** — cần lọc/nhóm |
| "Khách này đã chi bao nhiêu" | **tính từ fact** — đừng lưu |
| "Doanh thu của khách **lúc mua là VIP**" | dimension **Type 2** |
| "Diễn biến chi tiêu của khách theo tháng" | **fact riêng** — grain khách × tháng |

Phép thử: **thuộc tính hành vi chỉ nên vào dimension khi nó được dùng để *cắt* dữ liệu,
không phải để *xem*.**

Cắt (`group by`, `where`) → dimension. Xem (một con số cho một khách) → tính từ fact.

Ba rủi ro khi đưa hành vi vào dimension, xếp theo mức nguy hiểm:

**1. Vòng phụ thuộc.** Dimension phụ thuộc fact, fact join dimension. Sai thứ tự nạp là
báo cáo dùng phân khúc của **hôm qua** trên fact của **hôm nay** — lệch một ngày, im
lặng.

**2. Số tự đổi.** Phân khúc tính từ dữ liệu đến hiện tại, nên báo cáo tháng 6 chạy hôm
nay khác báo cáo tháng 6 chạy tháng trước. Đây là
[case study báo cáo quá khứ tự đổi số](../case-studies/bao-cao-qua-khu-tu-doi-so.md) dưới
dạng khác.

**3. Dim phình nếu bật Type 2.** Cột đổi mỗi ngày trong dim Type 2 = một phiên bản mỗi
ngày cho mỗi khách.

Cách né cả ba: **chốt phân khúc vào fact lúc nạp**, như một cột `phan_khuc_luc_mua`. Fact
bất biến, dimension không phình, và câu *"lúc mua thì khách thuộc phân khúc nào"* trả lời
được — cùng lời giải với
[mini-dimension ở bộ 2](bt-02-dimension-thoi-gian.md#bài-c3--fact-trỏ-hai-khoá-và-câu-hỏi-mà-một-dim-không-trả-được).

Xem [Đưa hành vi vào dimension](../skills/behavior-dimension.md).

</details>

---

## Bảng đối chiếu nhanh

| Số | Nghĩa | Bài |
|---|---|---|
| 399.999 (thiếu 1 đồng) | làm tròn khi phân bổ | A.1 |
| 400.000 khép kín | gom sai số về dòng lớn nhất | A.2 |
| `SP-C` −26.538 | đổi tiêu chí phân bổ, đổi kết luận lãi lỗ | A.3 |
| 34.560.000 / **3,38 lần** | cộng cột YTD | B.1 |
| `DN03` được cứu | timespan `between` thay cho join bằng | B.3 |
| 420 / 78 / 84,0 | semi-additive theo thời gian | B.4 |
| 681.000 vs **642.500** (−5,7%) | avg-của-avg | C.1 |
| `sum(so_don)` = 10 | khớp vì may, không vì đúng | C.2 |
| `C4` Kim cương / chi tiêu thấp | hạng gán ≠ hành vi đo được | D.1 |
| bước 1 = `xem`, bước 2 = `them_gio` | step dimension | D.3 |

## Related Topics

- [Bài tập bộ 4 — Quan hệ và cây](bt-04-quan-he-va-cay.md) — bộ trước
- [Bài tập bộ 6 — Tích hợp](bt-06-tich-hop.md) — bộ tiếp theo
- [Lab fact nâng cao](lab-fact-nang-cao.md) — bản chẩn đoán của cùng bốn kỹ thuật
- [Kỹ năng — Data Modeling](../skills/index.md) — lý thuyết của bốn kỹ thuật trên
