---
title: "26 bài tập có đáp số — tự viết, tự chấm"
sidebar_position: 8
description: "Mỗi bài có đề, đáp số phải ra, và lời giải giấu đi. Viết SQL của bạn trước, so số, rồi mới mở lời giải."
tags: [tutorial, bai-tap, grain, scd, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# 26 bài tập có đáp số — tự viết, tự chấm

> **Chốt:** bảy lab kia là **chẩn đoán** — tôi bày sẵn bẫy rồi giải thích. File này ngược
> lại: **bạn viết, đáp số cho trước, tự biết đúng sai mà không cần hỏi ai**.

## Cách dùng

Mỗi bài có ba phần:

1. **Đề** — việc phải làm
2. **Đáp số phải ra** — con số chính xác; trùng thì bạn đúng
3. **Lời giải** — giấu trong `<details>`, **chỉ mở sau khi đã thử**

Mở lời giải trước khi viết là đọc, không phải luyện. Sai vài lần rồi mới đúng thì nhớ
được sáu tháng; đọc lời giải thì quên sau sáu phút.

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Dữ liệu và mốc đối chiếu ở [trang bài tập](index.md#dữ-liệu-dùng-chung-cho-lab-27).
**10 đơn · 15 dòng · 10.215.000 · phí ship 400.000.**

---

## Bộ 1 — Grain và fact/dimension

### Bài 1.1 — Chứng minh grain bằng SQL, không bằng lời

**Đề:** viết **một** câu trả về ba số: số dòng, số `don_hang_id` phân biệt, số khoá tổ
hợp phân biệt — cộng một cột boolean kết luận grain có đúng không.

**Đáp số:**

```text
┌─────────┬────────┬─────────────┬────────────┐
│ so_dong │ so_don │ khoa_to_hop │ grain_dung │
├─────────┼────────┼─────────────┼────────────┤
│      15 │     10 │          15 │ true       │
└─────────┴────────┴─────────────┴────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select count(*) so_dong,
       count(distinct don_hang_id) so_don,
       count(distinct (don_hang_id, dong)) khoa_to_hop,
       count(*) = count(distinct (don_hang_id, dong)) grain_dung
from don_hang_chi_tiet;
```

`so_don` = 10 ≠ 15 chứng minh `don_hang_id` **không** phải khoá. Đặt `unique` lên nó là
test sai, không phải dữ liệu sai — xem [Grain](../reference/grain.md).

</details>

### Bài 1.2 — Đơn nào nhiều dòng nhất

**Đề:** ba đơn có nhiều dòng hàng nhất, kèm giá trị đơn.

**Đáp số:**

```text
┌─────────────┬─────────┬─────────┐
│ don_hang_id │ so_dong │ gia_tri │
├─────────────┼─────────┼─────────┤
│ DH003       │       3 │ 1950000 │
│ DH001       │       2 │  600000 │
│ DH005       │       2 │ 2700000 │
└─────────────┴─────────┴─────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select don_hang_id, count(*) so_dong, sum(so_luong*don_gia) gia_tri
from don_hang_chi_tiet group by 1 order by 2 desc, 1 limit 3;
```

`DH003` ba dòng — nhớ con số này, nó là thủ phạm của mọi bài phồng số về sau.

</details>

### Bài 1.3 — Giỏ hàng trung bình, và cái bẫy mẫu số

**Đề:** tính giá trị trung bình **một đơn hàng**. Rồi tính lại bằng `count(*)` thay vì
`count(distinct ...)` và so hai số.

**Đáp số:**

```text
┌───────────┬────────┬─────────────┬─────────┬────────────────────┐
│ doanh_thu │ so_don │ gio_hang_tb │ so_dong │ neu_dung_count_sao │
├───────────┼────────┼─────────────┼─────────┼────────────────────┤
│  10215000 │     10 │   1021500.0 │      15 │           681000.0 │
└───────────┴────────┴─────────────┴─────────┴────────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select sum(so_luong*don_gia) doanh_thu,
       count(distinct don_hang_id) so_don,
       round(sum(so_luong*don_gia)*1.0/count(distinct don_hang_id), 0) gio_hang_tb,
       count(*) so_dong,
       round(sum(so_luong*don_gia)*1.0/count(*), 0) neu_dung_count_sao
from don_hang_chi_tiet;
```

**1.021.500 hay 681.000?** Grain là *dòng đơn*, nên `count(*)` đếm dòng chứ không đếm
đơn. Đây chính là lý do [degenerate dimension](../skills/degenerate-dimension.md) phải ở
lại trong fact — không có `don_hang_id` thì không tính được số đơn.

</details>

### Bài 1.4 — Đếm đơn theo trạng thái: `count(*)` sai ở đâu

**Đề:** join `don_hang` với `don_hang_chi_tiet`, đếm số đơn theo trạng thái bằng **cả
hai** cách và đặt cạnh nhau.

**Đáp số:**

```text
┌────────────┬─────────┬──────────┐
│ trang_thai │ dem_sao │ dem_dung │
├────────────┼─────────┼──────────┤
│ hoan_thanh │      11 │        6 │
│ dang_giao  │       2 │        2 │
│ moi        │       2 │        2 │
└────────────┴─────────┴──────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select h.trang_thai, count(*) dem_sao, count(distinct h.don_hang_id) dem_dung
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
group by 1 order by 3 desc;
```

`hoan_thanh` phồng từ 6 lên **11** vì các đơn hoàn thành là những đơn nhiều dòng nhất.
Hai nhóm kia không lệch — nên nếu chỉ nhìn `dang_giao` và `moi` thì bạn kết luận query
đúng. Lỗi chỉ hiện ở nhóm bạn không kiểm.

</details>

### Bài 1.5 — Doanh thu theo khách, không được phồng

**Đề:** doanh thu và số đơn theo từng khách.

**Đáp số:**

```text
┌──────────┬───────────┬────────┐
│ khach_id │ doanh_thu │ so_don │
├──────────┼───────────┼────────┤
│ C2       │   3720000 │      3 │
│ C1       │   2745000 │      3 │
│ C3       │   2100000 │      2 │
│ C4       │   1650000 │      2 │
└──────────┴───────────┴────────┘
```

Tổng bốn dòng = **10.215.000**. Không khớp là join của bạn đang nhân bản.

<details>
<summary>Lời giải</summary>

```sql
select h.khach_id, sum(ct.so_luong*ct.don_gia) doanh_thu,
       count(distinct h.don_hang_id) so_don
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
group by 1 order by 2 desc;
```

Join `don_hang` (grain đơn) với `chi_tiet` (grain dòng) **an toàn cho cột tiền**, vì tiền
nằm ở grain mịn. Nó chỉ hỏng khi bạn cộng cột thuộc grain thô — xem bài 4.1.

</details>

---

## Bộ 2 — Dimension

### Bài 2.1 — Dựng `dim_ngay` có dòng `-1`

**Đề:** sinh lịch từ 01/07/2026, 62 ngày, cộng một dòng `-1` cho mốc *chưa xảy ra*.

**Đáp số:** `63` dòng, trong đó `1` dòng có `ngay_key = -1`.

<details>
<summary>Lời giải</summary>

```sql
create or replace table dim_ngay as
with lich as (select (date '2026-07-01' + interval (i) day)::date ngay from range(0,62) t(i))
select cast(strftime(ngay,'%Y%m%d') as integer) ngay_key, ngay, month(ngay) thang,
       dayofweek(ngay) not in (0,6) la_ngay_lam_viec
from lich
union all select -1, null, null, null;
```

Dòng `-1` phải tồn tại **trước** khi nạp fact — nếu chưa có, ETL buộc phải để `NULL` ở
cột khoá và `JOIN` sẽ ném dòng. Xem [date dimension](../reference/date-dimension.md).

</details>

### Bài 2.2 — Ngày làm việc tháng 7

**Đề:** tháng 7/2026 có bao nhiêu ngày, bao nhiêu là ngày làm việc?

**Đáp số:**

```text
┌─────────┬───────────────┐
│ so_ngay │ ngay_lam_viec │
├─────────┼───────────────┤
│      31 │            23 │
└─────────┴───────────────┘
```

### Bài 2.3 — Hai mẫu số, hai kết luận

**Đề:** doanh thu trung bình mỗi ngày tháng 7 — tính hai lần, một lần chia cho số ngày
lịch, một lần chia cho số ngày làm việc.

**Đáp số:**

```text
┌──────────┬──────────────────┬──────────────────┐
│   tong   │ tb_moi_ngay_lich │ tb_ngay_lam_viec │
├──────────┼──────────────────┼──────────────────┤
│ 10215000 │         329516.0 │         444130.0 │
└──────────┴──────────────────┴──────────────────┘
```

<details>
<summary>Lời giải và vì sao nó quan trọng</summary>

```sql
select sum(ct.so_luong*ct.don_gia) tong,
       round(sum(ct.so_luong*ct.don_gia)*1.0
             /(select count(*) from dim_ngay where thang=7), 0) tb_moi_ngay_lich,
       round(sum(ct.so_luong*ct.don_gia)*1.0
             /(select count(*) from dim_ngay where thang=7 and la_ngay_lam_viec), 0) tb_ngay_lam_viec
from don_hang_chi_tiet ct join dim_ngay d on d.ngay = ct.ngay;
```

**329.516 hay 444.130?** Chênh **35%**, và cả hai đều "đúng" — chỉ khác mẫu số. Đem so
tháng có nhiều ngày lễ với tháng thường bằng cột đầu thì tháng lễ luôn trông tệ.

Không có `dim_ngay` thì con số 444.130 **không tồn tại**, và cũng không ai biết là nó
thiếu.

</details>

### Bài 2.4 — Đơn chưa giao rơi vào đâu

**Đề:** doanh thu theo `ngay_giao_key`, dùng `coalesce(..., -1)`. Nhóm `-1` gồm bao nhiêu
dòng và bao nhiêu tiền?

**Đáp số:**

```text
┌───────────────┬─────────┬───────────┐
│ ngay_giao_key │ so_dong │ doanh_thu │
├───────────────┼─────────┼───────────┤
│            -1 │       2 │   1770000 │
│      20260702 │       1 │    750000 │
│      20260703 │       2 │    600000 │
└───────────────┴─────────┴───────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select coalesce(cast(strftime(h.ngay_giao,'%Y%m%d') as integer), -1) ngay_giao_key,
       count(*) so_dong, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
group by 1 order by 1;
```

**1.770.000 — 17,3% doanh thu** nằm ở nhóm *chưa giao*. Bỏ `coalesce` đi thì `JOIN` với
`dim_ngay` sẽ nuốt sạch chúng, và báo cáo trông hoàn toàn bình thường. Xem
[case study một nửa số đơn biến mất](../case-studies/don-dang-giao-bien-mat.md).

</details>

---

## Bộ 3 — SCD

Cần `scd_khach_hang` từ [lab SCD](scd-bang-dbt-snapshot.md).

### Bài 3.1 — Grain của snapshot

**Đề:** snapshot có bao nhiêu dòng, ứng với bao nhiêu khách? Khách nào có nhiều hơn một
phiên bản?

**Đáp số:** `5` dòng / `4` khách. `C1` có `2` phiên bản.

<details>
<summary>Lời giải</summary>

```sql
select count(*) so_dong, count(distinct khach_id) so_khach from scd_khach_hang;
select khach_id, count(*) so_phien_ban from scd_khach_hang group by 1 having count(*) > 1;
```

Grain là *một phiên bản của một khách* — nên `unique(khach_id)` phải FAIL, và đó là fail
đúng.

</details>

### Bài 3.2 — As-was và as-is: cùng số tiền, khác kết luận

**Đề:** doanh thu của riêng `C1`, tính hai lần — theo khu vực **lúc mua** và theo khu vực
**hiện tại**.

**Đáp số:**

```text
┌──────────────────┬──────────┬─────────┐
│       cach       │ khu_vuc  │   dt    │
├──────────────────┼──────────┼─────────┤
│ as-was (luc mua) │ Mien Bac │ 2745000 │
│ as-is (hien tai) │ Mien Nam │ 2745000 │
└──────────────────┴──────────┴─────────┘
```

<details>
<summary>Lời giải và điểm mấu chốt</summary>

```sql
-- as-is: ban hien tai
join scd_khach_hang d on d.khach_id = h.khach_id and d.dbt_valid_to is null

-- as-was: phien ban co hieu luc tai ngay dat (kem backfill ban dau tien)
with d as (select *, dbt_valid_from = min(dbt_valid_from) over (partition by khach_id) la_ban_dau
           from scd_khach_hang)
join d on d.khach_id = h.khach_id
 and h.ngay_dat >= case when d.la_ban_dau then timestamp '1900-01-01' else d.dbt_valid_from end
 and h.ngay_dat <  coalesce(d.dbt_valid_to, timestamp '9999-12-31')
```

**Số tiền y hệt — 2.745.000. Chỉ khu vực đổi.**

Đó là điều làm lớp lỗi này nguy hiểm nhất: mọi test đối soát **tổng** đều xanh, vì không
đồng nào mất. Tiền chỉ bị gán sai chiều. Muốn bắt được thì phải có một test *as-was*
riêng: doanh thu tháng 7 của `C1` phải nằm ở Miền Bắc.

</details>

### Bài 3.3 — Kiểm khoảng hiệu lực

**Đề:** viết query phát hiện khoảng chồng lấn trong snapshot.

**Đáp số:** `0` khoảng chồng lấn.

<details>
<summary>Lời giải</summary>

```sql
with x as (select khach_id, dbt_valid_to,
                  lead(dbt_valid_from) over (partition by khach_id order by dbt_valid_from) ke
           from scd_khach_hang)
select count(*) so_khoang_chong_lan from x where ke is not null and ke <> dbt_valid_to;
```

Câu này bắt **cả hai** lỗi bằng một lần quét: `ke > dbt_valid_to` là khoảng hở (fact rơi
vào đó mất dòng), `ke < dbt_valid_to` là chồng lấn (nhân đôi dòng).

</details>

---

## Bộ 4 — Fact nâng cao

### Bài 4.1 — Phân bổ phí ship theo mặt hàng

**Đề:** phân bổ `phi_ship` (cấp đơn) về từng dòng theo tỷ trọng tiền hàng, rồi gộp theo
mặt hàng. Tính cả tỷ lệ phí ship trên doanh thu.

**Đáp số:**

```text
┌─────────┬───────────┬──────────────────┬───────────┐
│ ma_hang │ tien_hang │ phi_ship_phan_bo │ ty_le_pct │
├─────────┼───────────┼──────────────────┼───────────┤
│ SP-A    │   3300000 │         160000.0 │      4.85 │
│ SP-B    │   3000000 │         117692.0 │      3.92 │
│ SP-C    │   3600000 │          86538.0 │       2.4 │
│ SP-D    │    315000 │          35769.0 │     11.36 │
└─────────┴───────────┴──────────────────┴───────────┘
```

<details>
<summary>Lời giải — và cái nhìn ra được</summary>

```sql
with pb as (
  select ct.ma_hang, ct.so_luong*ct.don_gia tien_hang,
         h.phi_ship::double * (ct.so_luong*ct.don_gia)
           / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id) phi
  from don_hang_chi_tiet ct join don_hang h using (don_hang_id))
select ma_hang, sum(tien_hang) tien_hang, round(sum(phi),0) phi_ship_phan_bo,
       round(100.0*sum(phi)/sum(tien_hang),2) ty_le_pct
from pb group by 1 order by 3 desc;
```

**`SP-D` gánh phí ship 11,36% doanh thu** — gấp gần 5 lần `SP-C` (2,4%). Đây là kết luận
nghiệp vụ **không tồn tại** nếu phí ship còn nằm ở cấp đơn: chuột không dây giá rẻ nhưng
tốn ship tương đương hàng đắt.

Lưu ý cửa sổ `over (partition by ct.don_hang_id)` nằm **trong CTE**, không lồng trong
`sum()` — DuckDB (và mọi engine) cấm gọi window bên trong aggregate.

</details>

### Bài 4.2 — YTD tính lúc đọc

**Đề:** doanh thu theo ngày, kèm cột luỹ kế — **không** lưu cột đó vào bảng.

**Đáp số:**

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

<details>
<summary>Lời giải</summary>

```sql
select ngay, sum(so_luong*don_gia) dt,
       sum(sum(so_luong*don_gia)) over (order by ngay) dt_ytd
from don_hang_chi_tiet group by ngay order by ngay;
```

`sum(sum(...)) over (...)` trông lạ nhưng đúng: `sum()` bên trong là aggregate của
`GROUP BY`, `sum() over` bên ngoài chạy **sau** khi gộp.

Dòng cuối bằng đúng tổng — đó là cách kiểm nhanh. Và vì cột này **không nằm trong bảng**,
không ai kéo nhầm nó vào ô tổng để phồng 3,38 lần như
[lab fact nâng cao](lab-fact-nang-cao.md) bài 3.

</details>

### Bài 4.3 — Bảng tổng hợp: lưu gì để trung bình vẫn đúng

**Đề:** dựng `agg_ngay` lưu `sum` và `count`. Từ đó tính trung bình mỗi dòng hai cách —
đúng và sai — rồi so.

**Đáp số:**

```text
┌───────────┬─────────┬──────────┬────────────────────┐
│ doanh_thu │ so_dong │ tb_dung  │ tb_sai_avg_cua_avg │
├───────────┼─────────┼──────────┼────────────────────┤
│  10215000 │      15 │ 681000.0 │           642500.0 │
└───────────┴─────────┴──────────┴────────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
with agg as (select ngay, sum(so_luong*don_gia) dt, count(*) n
             from don_hang_chi_tiet group by 1)
select sum(dt) doanh_thu, sum(n) so_dong,
       round(sum(dt)*1.0/sum(n), 0) tb_dung,
       round(avg(dt*1.0/n), 0)      tb_sai_avg_cua_avg
from agg;
```

Lệch **5,7%**. `avg(dt/n)` cho mỗi **ngày** trọng số bằng nhau, bất kể ngày đó có 4 dòng
hay 2 dòng. Luật: bảng tổng hợp **chỉ lưu số cộng được**, chia lúc đọc. Xem
[aggregate fact table](../skills/aggregate-fact-table.md).

</details>

---

## Bộ 5 — Tích hợp

### Bài 5.1 — Tỷ lệ trả hàng theo mặt hàng

**Đề:** `tra_hang` chỉ có `don_hang_id`, không có `ma_hang`. Phân bổ giá trị trả về từng
mặt hàng theo tỷ trọng, rồi tính tỷ lệ trả trên doanh thu.

**Đáp số:**

```text
┌─────────┬───────────┬─────────────┬───────────────┐
│ ma_hang │ doanh_thu │ tra_phan_bo │ ty_le_tra_pct │
├─────────┼───────────┼─────────────┼───────────────┤
│ SP-C    │   3600000 │   1107692.0 │          30.8 │
│ SP-A    │   3300000 │    253846.0 │           7.7 │
│ SP-B    │   3000000 │    138462.0 │           4.6 │
│ SP-D    │    315000 │         0.0 │           0.0 │
└─────────┴───────────┴─────────────┴───────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
with pb as (
  select ct.ma_hang, ct.don_hang_id, ct.so_luong*ct.don_gia tien_hang,
         (ct.so_luong*ct.don_gia)*1.0
           / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id) ty_trong
  from don_hang_chi_tiet ct),
ban as (select ma_hang, sum(tien_hang) dt from pb group by 1),
tra as (select pb.ma_hang, sum(t.gia_tri_tra * pb.ty_trong) tra
        from tra_hang t join pb using (don_hang_id) group by 1)
select coalesce(ban.ma_hang, tra.ma_hang) ma_hang, ban.dt doanh_thu,
       round(coalesce(tra.tra,0),0) tra_phan_bo,
       round(100.0*coalesce(tra.tra,0)/nullif(ban.dt,0),1) ty_le_tra_pct
from ban full join tra on ban.ma_hang = tra.ma_hang
order by 4 desc nulls last;
```

**`SP-C` bị trả 30,8%** — gần một phần ba doanh thu. Đó là tín hiệu chất lượng sản phẩm,
và nó chỉ hiện ra khi ghép hai fact qua một dimension chung
([drill-across](../skills/conformed-dimension.md)).

Chú ý `FULL JOIN` + `coalesce` + `nullif` — ba thứ bắt buộc ở lượt ghép, thiếu cái nào
cũng mất nhóm hoặc chia cho 0.

</details>

### Bài 5.2 — Đối soát conformed fact khép kín

**Đề:** viết một câu chứng minh `tong_tien_khach_tra − doanh_thu_thuan` được giải thích
**hoàn toàn** bởi `phi_ship`.

**Đáp số:** `0`.

<details>
<summary>Lời giải</summary>

```sql
with ban as (select don_hang_id, sum(so_luong*don_gia) tien_hang
             from don_hang_chi_tiet group by 1)
select sum(b.tien_hang + h.phi_ship) - sum(b.tien_hang) - sum(h.phi_ship) con_lai
from ban b join don_hang h using (don_hang_id);
```

Bằng 0 **không thể xảy ra tình cờ**. Đặt câu này thành test là biến cuộc tranh cãi "hai
đội ra hai số" thành một phép trừ trong CI. Xem
[conformed facts](../skills/conformed-facts.md).

</details>

---

## Bộ 6 — Vận hành

### Bài 6.1 — Phát hiện nạp trùng khi *chưa biết* lô nào sai

Dựng tình huống:

```sql
create or replace table fct_audit as select *, 1 audit_sk from don_hang_chi_tiet;
insert into fct_audit select *, 3 from don_hang_chi_tiet where don_hang_id in ('DH001','DH003');
```

**Đề:** giả sử bạn **không** biết `audit_sk = 3` là lô thừa. Viết query tìm ra đơn nào có
số bản ghi nhiều hơn thực tế.

**Đáp số:**

```text
┌─────────────┬────────────┐
│ don_hang_id │ so_ban_ghi │
├─────────────┼────────────┤
│ DH001       │          4 │
│ DH003       │          6 │
└─────────────┴────────────┘
```

`DH001` thật có 2 dòng, `DH003` có 3 — cả hai đang gấp đôi.

<details>
<summary>Lời giải</summary>

```sql
select don_hang_id, count(*) so_ban_ghi
from fct_audit group by 1
having count(*) > (select count(*) from don_hang_chi_tiet ct
                   where ct.don_hang_id = fct_audit.don_hang_id)
order by 1;
```

Query này **chỉ chạy được vì còn bảng nguồn để đối chiếu**. Trong production, nguồn
thường đã bị ghi đè — đó là lý do phải có `audit_sk` **trước** khi sự cố xảy ra, chứ
không phải điều tra sau. Xem [audit dimension](../skills/audit-dimension.md).

</details>

### Bài 6.2 — Xoá đúng, không xoá thừa

**Đề:** xoá lô thừa rồi chứng minh kho đã về đúng.

**Đáp số:**

```text
┌──────────────┬───────────┐
│ dong_con_lai │ doanh_thu │
├──────────────┼───────────┤
│           15 │  10215000 │
└──────────────┴───────────┘
```

<details>
<summary>Lời giải</summary>

```sql
delete from fct_audit where audit_sk = 3;
select count(*) dong_con_lai, sum(so_luong*don_gia) doanh_thu from fct_audit;
```

**Một câu lệnh, đúng 5 dòng.** So với cách xoá theo khoảng ngày ở
[lab vận hành](lab-van-hanh.md) bài 2 — xoá 10 dòng, một nửa là dòng tốt.

</details>

---

## Bảng đối chiếu nhanh

Sau khi làm hết, tự kiểm bằng bảng này. Số nào lệch thì quay lại bài tương ứng.

| Con số | Giá trị | Bài |
|---|---|---|
| Grain `don_hang_chi_tiet` | `(don_hang_id, dong)` — 15 dòng / 10 đơn | 1.1 |
| Giỏ hàng trung bình | 1.021.500 (không phải 681.000) | 1.3 |
| Đơn `hoan_thanh` | 6 (không phải 11) | 1.4 |
| Ngày làm việc tháng 7 | 23 / 31 | 2.2 |
| TB mỗi ngày làm việc | 444.130 (không phải 329.516) | 2.3 |
| Doanh thu chưa giao | 1.770.000 — **17,3%** | 2.4 |
| `C1` as-was vs as-is | cùng 2.745.000, khác vùng | 3.2 |
| `SP-D` gánh phí ship | **11,36%** doanh thu | 4.1 |
| TB mỗi dòng | 681.000 (không phải 642.500) | 4.3 |
| `SP-C` tỷ lệ trả hàng | **30,8%** | 5.1 |
| Đối soát conformed fact | 0 | 5.2 |

## Related Topics

- [Bảy lab chẩn đoán](index.md) — bày sẵn bẫy rồi giải thích; file này ngược lại
- [Grain](../reference/grain.md) · [Fact và Dimension](../reference/fact-and-dimension.md) — bộ 1
- [Date dimension](../reference/date-dimension.md) · [NULL trong fact và dimension](../skills/null-handling.md) — bộ 2
- [SCD](../skills/scd.md) · [Dữ liệu về muộn](../skills/late-arriving.md) — bộ 3
- [Header/line và phân bổ fact](../skills/allocated-facts.md) · [Aggregate fact table](../skills/aggregate-fact-table.md) — bộ 4
- [Conformed dimension](../skills/conformed-dimension.md) · [Conformed facts](../skills/conformed-facts.md) — bộ 5
- [Audit dimension](../skills/audit-dimension.md) — bộ 6
