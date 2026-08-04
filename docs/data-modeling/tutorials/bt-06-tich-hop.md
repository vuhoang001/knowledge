---
title: "Bài tập bộ 6 — Tích hợp: conformed dimension, conformed facts, bus matrix, đa tiền tệ"
sidebar_position: 15
description: "18 bài tự viết: join tên nhóm trả 0 dòng vì dấu tiếng Việt, drill-across đúng cách, join hai fact vừa mất vừa phồng, và 2/7 đơn ngoại tệ bốc hơi."
tags: [tutorial, bai-tap, conformed-dimension, conformed-facts, bus-architecture, multi-currency-uom, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Bài tập bộ 6 — Tích hợp

> **Chốt:** năm bộ trước dựng **một** mô hình cho đúng. Bộ này hỏi câu khó hơn — **hai mô
> hình dựng riêng có ghép được không, và ghép rồi thì hai con số có so được với nhau
> không.** Hai câu đó khác nhau, và câu thứ hai mới là câu giết người.

## Kỹ thuật được luyện trong bộ này

| # | Kỹ thuật | Tài liệu gốc | Số bài |
|---|---|---|---|
| 1 | Conformed dimension | [Conformed dimension](../skills/conformed-dimension.md) | 5 |
| 2 | Conformed facts | [Conformed facts](../skills/conformed-facts.md) | 4 |
| 3 | Bus architecture và bus matrix | [Bus architecture](../reference/bus-architecture.md) | 4 |
| 4 | Nhiều tiền tệ và đơn vị đo | [Nhiều tiền tệ và đơn vị đo](../skills/multi-currency-uom.md) | 5 |

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Bộ này dùng `hang_hoa` ⟷ `cay_nhom_hang` (**hai cách viết cùng một tên nhóm**),
`don_hang` ⟷ `tra_hang` (hai fact khác grain), và `don_hang_ngoai_te` ⟷ `ty_gia`
(**thiếu một ngày, thiếu một đồng tiền**). Xem [phụ lục seed](bt-00-seed.md).

---

## Bộ A — Conformed dimension

### Bài A.1 — Join trả 0 dòng, không lỗi nào

**Đề:** join `hang_hoa` với `cay_nhom_hang` bằng tên nhóm. Đếm kết quả, và đếm số nhóm
phân biệt ở mỗi bên.

**Đáp số phải ra:**

```text
┌───────────────┬──────────────────┬─────────────┐
│ join_bang_ten │ so_nhom_hang_hoa │ so_nhom_cay │
├───────────────┼──────────────────┼─────────────┤
│             0 │                3 │           8 │
└───────────────┴──────────────────┴─────────────┘
```

**0 dòng.** Cả hai bảng đều có dữ liệu, join không lỗi, kết quả rỗng.

<details>
<summary>Lời giải</summary>

```sql
select (select count(*) from hang_hoa hh
          join cay_nhom_hang cn on cn.ten_nhom = hh.nhom) join_bang_ten,
       (select count(distinct nhom) from hang_hoa) so_nhom_hang_hoa,
       (select count(*) from cay_nhom_hang) so_nhom_cay;
```

Đây là **hình dạng chuẩn của lỗi conformance**, và ba tính chất của nó làm nó nguy hiểm
hơn mọi lỗi đã gặp:

1. **Không có lỗi nào được ném ra.** SQL hợp lệ, kiểu dữ liệu khớp, join chạy xong.
2. **`0` là một câu trả lời hợp lý.** "Không có mặt hàng nào thuộc nhóm đã phân loại" —
   nghe có thể tin được.
3. **Nó chỉ lộ ra khi có người đối chiếu với một nguồn khác.**

So với các lỗi trước: phồng số thì tổng lệch nên có cơ hội bị bắt; mất dòng thì `count`
tụt. Ở đây **không có gì để so** — trừ khi bạn chủ động đi tìm.

Bài A.2 tìm nguyên nhân.

</details>

### Bài A.2 — *"Màn hình"* không phải *"Man hinh"*

**Đề:** chỉ ra chính xác vì sao join hỏng, bằng cách bỏ dấu rồi so lại.

**Đáp số phải ra:**

```text
┌────────────────┬───────────────┬─────────────────────┐
│ ten_o_hang_hoa │   ten_o_cay   │ khop_sau_khi_bo_dau │
├────────────────┼───────────────┼─────────────────────┤
│ Màn hình       │ Man hinh      │ true                │
│ Máy tính       │ May tinh      │ true                │
│ Thiết bị nhập  │ Thiet bi nhap │ true                │
└────────────────┴───────────────┴─────────────────────┘
```

Cả ba nhóm khớp **sau khi bỏ dấu**. Hai hệ thống, hai quy ước viết, cùng một thực thể.

<details>
<summary>Lời giải</summary>

```sql
select hh.nhom ten_o_hang_hoa, cn.ten_nhom ten_o_cay,
       strip_accents(hh.nhom) = cn.ten_nhom khop_sau_khi_bo_dau
from (select distinct nhom from hang_hoa) hh
left join cay_nhom_hang cn on strip_accents(hh.nhom) = cn.ten_nhom
order by 1;
```

**Đừng sửa bằng `strip_accents` trong câu join.** Nó chữa triệu chứng và tạo ra ba vấn
đề mới:

- Phải nhớ dùng nó ở **mọi** truy vấn, mãi mãi. Quên một chỗ là lỗi quay lại.
- Không có index nào dùng được → mọi join thành full scan.
- Nó không xử lý được các biến thể khác: `"Màn Hình"`, `"MÀN HÌNH"`, `"Man hinh "` (thừa
  dấu cách), `"Màn hình LCD"`.

Cách chữa đúng là **conform ở tầng khoá, không ở tầng nhãn**:

```sql
-- 1. hai he thong join bang MA, khong bang TEN
select ... from hang_hoa hh
join hang_hoa_nhom hn using (ma_hang)         -- <- anh xa bang ma
join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id;

-- 2. bo cot nhan trung lap khoi hang_hoa
alter table hang_hoa drop column nhom;
```

Bảng `hang_hoa_nhom` chính là **conformed dimension key mapping**, và bước 2 quan trọng
ngang bước 1: chừng nào `hang_hoa.nhom` còn tồn tại thì còn có người join bằng nó.

**Luật:** nhãn để **đọc**, mã để **join**. Hai hệ thống chỉ conform khi chúng dùng chung
**mã**; dùng chung nhãn là ảo giác conform, và nó vỡ vào ngày ai đó sửa chính tả.

Xem [case study hai mart không ghép được](../case-studies/hai-mart-khong-ghep-duoc.md).

</details>

### Bài A.3 — Test bắt lỗi conformance trước khi nó lan

**Đề:** viết ba test phát hiện dimension không conform.

<details>
<summary>Lời giải</summary>

```sql
-- 1. MO COI: co ma nao trong bang anh xa khong ton tai o dim goc
select hn.nhom_id from hang_hoa_nhom hn
left join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id
where cn.nhom_id is null;

-- 2. PHU KIN: co mat hang nao chua duoc gan nhom
select hh.ma_hang from hang_hoa hh
left join hang_hoa_nhom hn using (ma_hang)
where hn.ma_hang is null;

-- 3. NHAN LECH: cung ma nhung khac nhan giua hai nguon
select cn.nhom_id, cn.ten_nhom ten_chuan, hh.nhom ten_o_nguon_khac
from cay_nhom_hang cn
join hang_hoa_nhom hn on hn.nhom_id = cn.nhom_id
join hang_hoa hh on hh.ma_hang = hn.ma_hang
where strip_accents(hh.nhom) is distinct from cn.ten_nhom
  and hh.nhom is not null;
```

Ba test bắt ba giai đoạn khác nhau của cùng một bệnh:

| Test | Bắt gì | Nếu bỏ qua |
|---|---|---|
| Mồ côi | mã trỏ tới dòng không tồn tại | join mất dòng |
| Phủ kín | thực thể chưa được ánh xạ | báo cáo thiếu nhóm |
| Nhãn lệch | **conformance đang trôi** | hai báo cáo hai nhãn |

Test 3 là quan trọng nhất và hay bị bỏ nhất, vì nó bắt lỗi **trước khi** nó gây hậu quả.
Mã vẫn khớp nên mọi join vẫn chạy; chỉ có nhãn bắt đầu lệch. Đến khi ai đó join bằng nhãn
thì đã muộn.

Trong dbt, cả ba là `relationships` test và `singular test`:

```yaml
models:
  - name: hang_hoa_nhom
    columns:
      - name: nhom_id
        tests:
          - relationships:
              to: ref('cay_nhom_hang')
              field: nhom_id
      - name: ma_hang
        tests: [not_null, unique]
```

Test `relationships` của dbt chính là test 1. Hai test còn lại phải tự viết.

</details>

### Bài A.4 — Conformed nghĩa là gì cho chính xác

**Đề:** không có SQL. Hai mart đều có `dim_khach`. Điều kiện nào để gọi là conformed?

<details>
<summary>Lời giải</summary>

**Conformed không có nghĩa là "giống hệt nhau".** Nó có nghĩa là **một cái là tập con
đúng của cái kia, ở phần chung**.

Ba điều kiện, xếp theo thứ tự bắt buộc:

**1. Cùng khoá, cùng nghĩa.** `khach_key = 1001` phải là **cùng một khách** ở cả hai
mart. Đây là điều kiện tuyệt đối — thiếu nó thì mọi thứ khác vô nghĩa.

**2. Thuộc tính chung phải cùng giá trị và cùng nhãn.** Nếu cả hai có `khu_vuc`, giá trị
phải giống nhau, và cách viết cũng phải giống nhau (bài A.2).

**3. Được phép có thuộc tính riêng.** Mart marketing có `phan_khuc_quang_cao`, mart bán
hàng không có — **vẫn conformed**. Đó là ý nghĩa của *shrunken dimension*.

Cái **không** phải điều kiện:

| Hiểu nhầm | Thực tế |
|---|---|
| "Phải cùng số dòng" | mart vùng chỉ chứa khách vùng đó — vẫn conformed |
| "Phải cùng số cột" | thuộc tính riêng được phép |
| "Phải cùng một bảng vật lý" | copy được, miễn sinh từ **một nguồn** |
| "Phải cùng độ tươi" | được lệch, nhưng **phải biết là đang lệch** |

Dòng cuối là cái bẫy thực tế nhất: hai mart cùng conform về cấu trúc nhưng một cái nạp
lúc 2h, một cái lúc 6h. Báo cáo chạy lúc 4h cho hai con số khác nhau, và **không có gì
sai trong thiết kế** — sai ở chỗ không ai công bố độ tươi.

Cách kiểm rẻ nhất: thêm `nap_luc` vào mọi dimension và **bắt buộc hiện nó trên báo cáo**.

</details>

### Bài A.5 — Ai sở hữu conformed dimension

**Đề:** không có SQL. Ba đội cùng cần `dim_khach`. Ai dựng, ai sửa?

<details>
<summary>Lời giải</summary>

**Một đội sở hữu, các đội khác dùng.** Không có cách nào khác hoạt động được — và đây là
vấn đề tổ chức, không phải vấn đề kỹ thuật.

Ba mô hình thường gặp, và kết cục của mỗi cái:

| Mô hình | Cách làm | Kết cục |
|---|---|---|
| **Mỗi đội tự dựng** | ai cần thì tự làm | 3 `dim_khach` lệch nhau trong 6 tháng |
| **Đội trung tâm sở hữu** | một đội dựng, các đội đăng ký | chậm, nhưng **conform thật** |
| **Liên bang có hợp đồng** | một đội sở hữu, hợp đồng schema công khai | cân bằng nhất |

Mô hình 1 là mặc định khi **không ai quyết định gì** — và nó luôn thắng nếu không có
người chủ động chặn. Đó chính là
[case study mỗi mart một dim khách](../case-studies/moi-mart-mot-dim-khach.md).

Với mô hình 3, "hợp đồng" phải nói rõ bốn thứ:

```yaml
# contracts/dim_khach.yml
so_huu: team-crm
khoa: khach_key            # KHONG BAO GIO doi nghia
scd: type-2 tren (khu_vuc, hang)
nap: hang ngay 02:00 UTC+7
thuoc_tinh_cam_doi:        # doi thi phai bao truoc 1 sprint
  - khach_key
  - khach_id
  - khu_vuc
```

Và điều quan trọng nhất, thường bị quên: **đội sở hữu phải có nghĩa vụ trả lời** khi đội
khác cần thêm thuộc tính. Sở hữu mà không phục vụ thì các đội khác sẽ tự dựng bản riêng —
và bạn quay về mô hình 1, chỉ là chậm hơn.

</details>

---

## Bộ B — Conformed facts

### Bài B.1 — Drill-across: gom trước, ghép sau

**Đề:** ghép `don_hang` (bán hàng) với `tra_hang` (trả hàng) theo khách, tính tỷ lệ trả
hàng. Hai fact **khác grain**.

**Đáp số phải ra:**

```text
┌──────────┬───────────┬─────────────┬────────────┬───────────┐
│ khach_id │ doanh_thu │ gia_tri_tra │ so_lan_tra │ ty_le_tra │
├──────────┼───────────┼─────────────┼────────────┼───────────┤
│ C1       │   2745000 │      450000 │          2 │      16.4 │
│ C2       │   3720000 │      900000 │          1 │      24.2 │
│ C3       │   2100000 │           0 │          0 │       0.0 │
│ C4       │   1650000 │      150000 │          1 │       9.1 │
└──────────┴───────────┴─────────────┴────────────┴───────────┘
```

Cột `doanh_thu` cộng lại = **10.215.000**, cột `gia_tri_tra` = **1.500.000**. Cả hai khớp
tổng gốc.

<details>
<summary>Lời giải</summary>

```sql
with ban as (
  select h.khach_id, sum(ct.so_luong*ct.don_gia) doanh_thu,
         count(distinct h.don_hang_id) so_don
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1),
tra as (
  select h.khach_id, sum(t.gia_tri_tra) gia_tri_tra, count(*) so_lan_tra
  from tra_hang t join don_hang h using (don_hang_id) group by 1)
select coalesce(b.khach_id, r.khach_id) khach_id,
       coalesce(b.doanh_thu,0) doanh_thu,
       coalesce(r.gia_tri_tra,0) gia_tri_tra,
       coalesce(r.so_lan_tra,0) so_lan_tra,
       round(100.0 * coalesce(r.gia_tri_tra,0) / nullif(b.doanh_thu,0), 1) ty_le_tra
from ban b full join tra r using (khach_id)
order by 1;
```

Đây là **drill-across**, và ba chi tiết quyết định nó đúng:

**1. Gom mỗi fact về grain chung TRƯỚC khi ghép.** Hai CTE `ban` và `tra` đều gom về
grain *một khách*. Chỉ khi hai bên cùng grain mới được ghép.

**2. `full join`, không phải `inner join`.** `C3` không trả hàng lần nào. `inner join`
là mất `C3` khỏi báo cáo — và báo cáo "tỷ lệ trả hàng theo khách" mà thiếu khách có tỷ lệ
0% thì mọi trung bình đều sai.

**3. `nullif(...,0)` ở mẫu số.** Khách có trả hàng nhưng doanh thu 0 (đơn quà tặng) sẽ
làm chia cho 0. `nullif` biến nó thành `NULL` thay vì lỗi.

So sánh với cách sai ở bài B.2 để thấy vì sao ba chi tiết này không phải chuyện nhỏ.

</details>

### Bài B.2 — Join thẳng hai fact: vừa mất vừa phồng

**Đề:** join thẳng `don_hang_chi_tiet` với `tra_hang`, đo cả hai phía.

**Đáp số phải ra:**

```text
┌────────────────┬────────────────┬──────────┬────────────────────┐
│ doanh_thu_that │ neu_join_thang │ tra_that │ tra_neu_join_thang │
├────────────────┼────────────────┼──────────┼────────────────────┤
│       10215000 │        6750000 │  1500000 │            3300000 │
└────────────────┴────────────────┴──────────┴────────────────────┘
```

**Doanh thu MẤT 34%, giá trị trả PHỒNG 120% — trong cùng một câu truy vấn.**

<details>
<summary>Lời giải</summary>

```sql
select (select sum(so_luong*don_gia) from don_hang_chi_tiet) doanh_thu_that,
       (select sum(ct.so_luong*ct.don_gia)
        from don_hang_chi_tiet ct join tra_hang t using (don_hang_id)) neu_join_thang,
       (select sum(gia_tri_tra) from tra_hang) tra_that,
       (select sum(t.gia_tri_tra)
        from don_hang_chi_tiet ct join tra_hang t using (don_hang_id)) tra_neu_join_thang;
```

Hai lỗi ngược chiều, cùng lúc:

**Mất 34% doanh thu** — `inner join` loại 7 đơn không có lần trả nào. Chỉ 3 đơn (`DH003`,
`DH005`, `DH010`) sống sót.

**Phồng 120% giá trị trả** — `DH003` có **2 lần trả** và **3 dòng hàng** → 6 dòng kết
quả, nên mỗi lần trả bị đếm 3 lần.

Đây là điều làm join thẳng hai fact nguy hiểm hơn mọi lỗi khác trong loạt bài này: **hai
lỗi che nhau**. Người kiểm tra nhìn tổng thấy "gần đúng" và không nghi ngờ, vì một lỗi
kéo xuống còn lỗi kia đẩy lên.

**Luật tuyệt đối: không bao giờ join hai fact table trực tiếp.** Luôn:

```text
1. Gom moi fact ve grain chung        (bang cac dimension chung)
2. Ghep bang FULL JOIN tren grain do
```

Ngoại lệ duy nhất: hai fact **cùng grain chính xác** và có quan hệ 1:1 — nhưng khi đó
chúng nên là một bảng.

Xem [case study join hai fact làm phồng tổng](../case-studies/join-hai-fact-lam-phong-tong.md).

</details>

### Bài B.3 — Ghép được không có nghĩa là so được

**Đề:** không có SQL. Hai fact đã conform về dimension và ghép được. Còn điều kiện gì để
hai **số đo** so sánh được với nhau?

<details>
<summary>Lời giải</summary>

Đây là phần mà bus matrix **không** đảm bảo. Conformed *dimension* cho phép **ghép**;
conformed *facts* cho phép **so sánh**. Bốn điều kiện:

**1. Cùng định nghĩa nghiệp vụ.** `doanh_thu` của bán hàng có gồm phí ship không? Có trừ
chiết khấu không? `gia_tri_tra` có gồm phí ship hoàn lại không? Hai định nghĩa lệch là
tỷ lệ trả hàng sai mà **không cách nào phát hiện từ dữ liệu**.

**2. Cùng đơn vị.** Cả hai là VND chưa thuế, hay một cái đã thuế? Bộ D là toàn bộ bài này.

**3. Cùng cách xử lý ngoại lệ.** Đơn huỷ có tính vào doanh thu không? Trả hàng của đơn
huỷ tính thế nào?

**4. Cùng mốc thời gian.** Bán hàng tính theo `ngay_dat`, trả hàng theo `ngay_tra` — tỷ
lệ trả tháng 7 gồm cả hàng bán tháng 6 trả trong tháng 7. Đó có thể là ý muốn, nhưng
**phải là ý muốn có ý thức**.

Cách cưỡng chế duy nhất hoạt động: **cùng tên thì cùng nghĩa, khác nghĩa thì khác tên**.

```text
doanh_thu_gop          = tien hang, chua tru gi
doanh_thu_thuan        = tru chiet khau va tra hang
doanh_thu_co_phi_ship  = cong phi ship
```

Ba cột, ba tên, không ai nhầm. Đối lập với việc cả ba đều tên `doanh_thu` ở ba mart khác
nhau — lúc đó cuộc họp đối soát sẽ kéo dài vài buổi và không ai sai.

Xem [Conformed facts](../skills/conformed-facts.md) và
[case study hai phòng hai doanh thu](../case-studies/hai-phong-hai-doanh-thu.md).

</details>

### Bài B.4 — Đối soát khép kín giữa hai fact

**Đề:** viết phép kiểm chứng minh drill-across ở bài B.1 không làm mất hay phồng số nào.

<details>
<summary>Lời giải</summary>

```sql
with ban as (select h.khach_id, sum(ct.so_luong*ct.don_gia) doanh_thu
             from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1),
     tra as (select h.khach_id, sum(t.gia_tri_tra) gia_tri_tra
             from tra_hang t join don_hang h using (don_hang_id) group by 1),
     ghep as (select coalesce(b.khach_id, r.khach_id) khach_id,
                     coalesce(b.doanh_thu,0) doanh_thu,
                     coalesce(r.gia_tri_tra,0) gia_tri_tra
              from ban b full join tra r using (khach_id))
select sum(doanh_thu) tu_ghep_doanh_thu,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) goc_doanh_thu,
       sum(gia_tri_tra) tu_ghep_tra,
       (select sum(gia_tri_tra) from tra_hang) goc_tra,
       sum(doanh_thu) = (select sum(so_luong*don_gia) from don_hang_chi_tiet)
         and sum(gia_tri_tra) = (select sum(gia_tri_tra) from tra_hang) khep_kin
from ghep;
```

Cột `khep_kin` phải là `true`. Đây là **phép kiểm bắt buộc cho mọi drill-across**, và lý
do nó bắt buộc: bài B.2 cho thấy sai lệch có thể xảy ra ở **cả hai chiều cùng lúc**, nên
kiểm một chiều là không đủ.

Ba biến thể cần nhớ:

| Kiểm gì | Bắt lỗi |
|---|---|
| Tổng mỗi số đo **sau ghép** = tổng gốc | phồng hoặc mất do join |
| Số dòng sau ghép = số phần tử **hợp** của hai bên | `inner join` thay vì `full join` |
| Không có `NULL` ở cột khoá ghép | khoá không conform |

Với dbt, viết thành một test so sánh hai `ref()`:

```sql
-- tests/drill_across_khep_kin.sql
select 'doanh_thu' so_do, sum(doanh_thu) tu_ghep,
       (select sum(tien_hang) from {{ ref('fct_ban_hang') }}) goc
from {{ ref('rpt_ban_va_tra') }}
having sum(doanh_thu) <> (select sum(tien_hang) from {{ ref('fct_ban_hang') }})
```

Test kiểu này phải chạy **trên bảng báo cáo cuối**, không chỉ trên fact. Fact đúng mà
báo cáo sai là chuyện thường xuyên nhất.

</details>

---

## Bộ C — Bus architecture và bus matrix

### Bài C.1 — Bus matrix đo được bằng SQL

**Đề:** dựng bus matrix cho sáu quy trình × năm dimension, dạng bảng `true`/`false`.

**Đáp số phải ra:**

```text
┌──────────────┬──────────┬───────────┬──────────┬─────────┬─────────────┐
│  quy_trinh   │ dim_ngay │ dim_khach │ dim_hang │ dim_nv  │ dim_tien_te │
├──────────────┼──────────┼───────────┼──────────┼─────────┼─────────────┤
│ Ban hang     │ true     │ true      │ true     │ true    │ false       │
│ Tra hang     │ true     │ true      │ false    │ false   │ false       │
│ Giao hang    │ true     │ true      │ false    │ false   │ false       │
│ Ton kho      │ true     │ false     │ true     │ false   │ false       │
│ Su kien web  │ true     │ true      │ true     │ false   │ false       │
│ Don ngoai te │ true     │ true      │ false    │ false   │ true        │
└──────────────┴──────────┴───────────┴──────────┴─────────┴─────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select 'Ban hang' quy_trinh, true dim_ngay, true dim_khach, true dim_hang,
       true dim_nv, false dim_tien_te
union all select 'Tra hang',     true, true,  false, false, false
union all select 'Giao hang',    true, true,  false, false, false
union all select 'Ton kho',      true, false, true,  false, false
union all select 'Su kien web',  true, true,  true,  false, false
union all select 'Don ngoai te', true, true,  false, false, true;
```

Ba thứ đọc ra ngay, và mỗi thứ là một quyết định kiến trúc:

**Cột `dim_ngay` toàn `true`.** Nó là conformed dimension quan trọng nhất — dựng một lần,
dùng chung, và **không mart nào được có bản riêng**. Nếu có hai `dim_ngay` với hai định
nghĩa quý tài chính thì mọi báo cáo theo quý đều phải hỏi "quý của ai".

**`dim_hang` vắng ở "Trả hàng".** Đây không phải lựa chọn thiết kế — nó là **lỗ hổng dữ
liệu nguồn**: `tra_hang` chỉ ghi ở cấp đơn, không ghi mặt hàng nào bị trả. Bus matrix làm
lỗ hổng đó lộ ra **trước khi** có người hỏi "tỷ lệ trả hàng theo mặt hàng".

**`dim_tien_te` chỉ có một `true`.** Dimension chỉ một quy trình dùng thì **chưa cần
conform** — không có gì để ghép nó với. Đầu tư công sức conform nó lúc này là sớm.

Bus matrix không phải sơ đồ trang trí. Nó là **kế hoạch xây dựng**: mỗi ô `true` là một
khoá ngoại phải tồn tại, và mỗi cột nhiều `true` là một dimension phải conform trước
tiên.

</details>

### Bài C.2 — Đọc ra cặp quy trình nào drill-across được

**Đề:** từ bus matrix, xác định cặp quy trình nào ghép được và theo trục nào.

**Đáp số phải ra:**

```text
┌─────────────────────────┬──────────────────────┬────────────────┐
│          cap            │      dim_chung       │ drill_across   │
├─────────────────────────┼──────────────────────┼────────────────┤
│ Ban hang / Tra hang     │ ngay, khach          │ duoc, 2 truc   │
│ Ban hang / Ton kho      │ ngay, hang           │ duoc, 2 truc   │
│ Ban hang / Su kien web  │ ngay, khach, hang    │ duoc, 3 truc   │
│ Tra hang / Ton kho      │ ngay                 │ chi theo ngay  │
│ Ton kho / Don ngoai te  │ ngay                 │ chi theo ngay  │
└─────────────────────────┴──────────────────────┴────────────────┘
```

<details>
<summary>Lời giải</summary>

Đọc từ bus matrix: hai quy trình ghép được theo **giao** của các dimension chúng cùng có.

```sql
-- kiem "Ban hang / Su kien web" ghep duoc theo 3 truc
with ban as (select h.khach_id, ct.ma_hang, h.ngay_dat ngay,
                    sum(ct.so_luong*ct.don_gia) doanh_thu
             from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
             group by 1,2,3),
     xem as (select khach_id, ma_hang, cast(thoi_diem as date) ngay, count(*) so_luot_xem
             from su_kien_web where loai_su_kien='xem' group by 1,2,3)
select coalesce(b.khach_id,x.khach_id) khach_id,
       coalesce(b.ma_hang,x.ma_hang) ma_hang,
       coalesce(b.doanh_thu,0) doanh_thu, coalesce(x.so_luot_xem,0) so_luot_xem
from ban b full join xem x using (khach_id, ma_hang, ngay)
order by 3 desc limit 5;
```

Hai điều quan trọng hơn bảng trên:

**Số trục chung quyết định câu hỏi trả lời được.** "Bán hàng / Sự kiện web" chung 3 trục
nên hỏi được *"khách này xem sản phẩm này bao nhiêu lần trước khi mua"*. "Trả hàng / Tồn
kho" chỉ chung `ngay` nên chỉ hỏi được *"ngày nào trả nhiều mà tồn cũng cao"* — thô hơn
nhiều.

**Chung `dim_ngay` là mức tối thiểu, và nó luôn có.** Nên câu "hai quy trình có ghép được
không" gần như luôn là "có". Câu đúng phải là **"ghép được ở mức chi tiết nào"**, và bảng
trên trả lời đúng câu đó.

Và ghép được vẫn chưa phải so được — đó là bộ B.

</details>

### Bài C.3 — Value chain: thứ tự dựng

**Đề:** không có SQL. Sáu quy trình nên dựng theo thứ tự nào?

<details>
<summary>Lời giải</summary>

Xếp theo **value chain** — dòng chảy giá trị qua doanh nghiệp:

```text
Ton kho  →  Su kien web  →  Ban hang  →  Giao hang  →  Tra hang
   (co hang)   (khach xem)   (chot don)   (van chuyen)  (hoan)
```

Nhưng **không** dựng theo thứ tự đó. Thứ tự dựng theo ba tiêu chí, xếp giảm dần:

**1. Quy trình nào có nhiều dimension nhất → dựng trước.** *Bán hàng* dùng cả 4 dimension.
Dựng nó là conform luôn 4 dimension, và mọi quy trình sau chỉ việc dùng lại. Dựng *Tồn
kho* trước thì chỉ conform được 2, rồi vẫn phải conform thêm 2 nữa.

**2. Quy trình nào nghiệp vụ đau nhất → ưu tiên.** Kho dữ liệu không có người dùng thì
chết, dù thiết kế đẹp.

**3. Quy trình nào dữ liệu nguồn sẵn sàng nhất → làm sớm.** *Sự kiện web* 43 dòng/5 ngày
là nguồn lớn nhất và bẩn nhất — để sau.

Thứ tự đề xuất: **Bán hàng → Trả hàng → Giao hàng → Tồn kho → Sự kiện web → Đơn ngoại tệ**.

Cái **không** được làm: dựng cả sáu song song bởi sáu đội. Đó là cách chắc chắn nhất để
có sáu `dim_khach` khác nhau — và conform sau khi đã có sáu bản thì đắt gấp nhiều lần
conform ngay từ đầu.

**Bus matrix chính là công cụ để tránh chuyện đó**: nó cho phép dựng **từng quy trình
một** mà vẫn đảm bảo ghép lại được, vì mỗi quy trình mới chỉ được dùng dimension đã
conform hoặc phải conform dimension mới của nó.

Xem [Bus architecture](../reference/bus-architecture.md).

</details>

### Bài C.4 — Ô `true` mới xuất hiện

**Đề:** không có SQL. Nghiệp vụ yêu cầu *"tỷ lệ trả hàng theo mặt hàng"* — tức ô
`Tra hang × dim_hang` phải thành `true`. Làm gì?

<details>
<summary>Lời giải</summary>

Ô đó `false` vì **dữ liệu nguồn không có**, không phải vì mô hình thiếu. Nên không có
cách nào sửa bằng SQL. Bốn lựa chọn, xếp theo mức độ trung thực:

**1. Sửa hệ thống nguồn** — thêm chi tiết mặt hàng vào phiếu trả. Đúng nhất, chậm nhất,
và **không có dữ liệu quá khứ**. Từ ngày sửa trở đi mới có.

**2. Phân bổ theo tỷ trọng đơn** — chia `gia_tri_tra` xuống mặt hàng theo tỷ lệ tiền hàng
trong đơn, đúng kỹ thuật của [bộ 5 bài A.1](bt-05-fact-nang-cao.md):

```sql
select ct.ma_hang,
       sum(t.gia_tri_tra * ct.so_luong*ct.don_gia
           / sum(ct.so_luong*ct.don_gia) over (partition by ct.don_hang_id)) tra_uoc_tinh
from tra_hang t join don_hang_chi_tiet ct using (don_hang_id) group by 1;
```

Con số này là **ước tính**, và phải mang tên nói rõ điều đó: `tra_uoc_tinh` chứ không
phải `gia_tri_tra`. Nếu khách trả đúng cái laptop 900.000 trong đơn `DH003`, phân bổ vẫn
rải đều cho cả bàn phím — sai hoàn toàn ở mức mặt hàng.

**3. Chấp nhận không trả lời được**, và nói rõ vì sao. Lựa chọn này bị đánh giá thấp:
"chúng tôi không có dữ liệu này, đây là cách để có" trung thực hơn một con số ước tính
mà sáu tháng sau không ai nhớ là ước tính.

**4. Kết hợp 1 + 3** — trả lời "chưa có, đang sửa nguồn, từ tháng sau sẽ có", và trong
lúc chờ thì cung cấp số ở mức đơn.

**Điều cấm:** dựng số phân bổ ở lựa chọn 2 rồi đặt tên như số thật. Đó là cách một con số
ước tính trở thành "sự thật" trong toàn công ty, và không ai truy được nguồn gốc.

Bus matrix có giá trị ở đây vì nó **ghi lại ô đó là `false` từ đầu** — nên khi có người
hỏi, câu trả lời sẵn sàng ngay, không phải điều tra.

</details>

---

## Bộ D — Nhiều tiền tệ và đơn vị đo

### Bài D.1 — Ba cách join tỷ giá, ba số đơn

**Đề:** đếm số đơn ngoại tệ còn lại sau khi join tỷ giá, theo hai cách: join bằng
`(ngay, tien_te)`, và join theo **khoảng hiệu lực có thêm dòng `VND` = 1**.

**Đáp số phải ra:**

```text
┌─────────┬──────────────┬────────────────────┐
│ don_goc │ c1_join_bang │ c2_timespan_co_VND │
├─────────┼──────────────┼────────────────────┤
│       7 │            5 │                  7 │
└─────────┴──────────────┴────────────────────┘
```

**5 trên 7 — mất 28,6%.** Hai đơn mất vì hai lý do khác nhau.

<details>
<summary>Lời giải</summary>

```sql
with tg as (
  select tien_te, ngay hieu_luc_tu,
         coalesce((lead(ngay) over (partition by tien_te order by ngay) - interval 1 day)::date,
                  date '9999-12-31') hieu_luc_den, ty_gia
  from ty_gia
  union all select 'VND', date '2000-01-01', date '9999-12-31', 1)   -- <- dong quan trong nhat
select (select count(*) from don_hang_ngoai_te) don_goc,
       (select count(*) from don_hang_ngoai_te d
          join ty_gia t on t.ngay = d.ngay_dat and t.tien_te = d.tien_te) c1_join_bang,
       (select count(*) from don_hang_ngoai_te d
          join tg on tg.tien_te = d.tien_te
                 and d.ngay_dat between tg.hieu_luc_tu and tg.hieu_luc_den) c2_timespan_co_VND;
```

Hai đơn mất, hai nguyên nhân:

**`DN03` (EUR, 04/07)** — bảng `ty_gia` **không có dòng EUR ngày 04/07**. Chữa bằng
khoảng hiệu lực: tỷ giá 03/07 có hiệu lực tới hết 04/07.

**`DN07` (VND, 1.500.000)** — **đồng tiền gốc không nằm trong bảng tỷ giá**. Đây là lỗi
kinh điển và rất dễ bỏ sót, vì nó nghe hiển nhiên: "VND thì cần tỷ giá làm gì".

Cần, vì mọi đơn phải đi qua **cùng một** đường quy đổi. Không có dòng `VND = 1` thì phải
viết `case when tien_te='VND' then so_tien else so_tien*ty_gia end` ở **mọi** truy vấn,
và ai đó sẽ quên.

**Luật:** bảng tỷ giá phải chứa **đồng tiền báo cáo với tỷ giá 1**, có hiệu lực từ trước
mọi dữ liệu tới `9999-12-31`. Một dòng, và nó xoá bỏ cả một lớp lỗi.

</details>

### Bài D.2 — Chốt cả số gốc lẫn số quy đổi

**Đề:** dựng fact ngoại tệ giữ **cả ba**: số tiền gốc, tỷ giá đã dùng, và số quy đổi.

**Đáp số phải ra:**

```text
┌──────────────┬─────────┬─────────────┬────────┬─────────────┐
│ don_ngoai_id │ tien_te │ so_tien_goc │ ty_gia │ so_tien_vnd │
├──────────────┼─────────┼─────────────┼────────┼─────────────┤
│ DN01         │ USD     │         400 │  25400 │    10160000 │
│ DN02         │ EUR     │         250 │  27650 │     6912500 │
│ DN03         │ EUR     │         300 │  27700 │     8310000 │
│ DN04         │ USD     │         150 │  25500 │     3825000 │
│ DN05         │ USD     │         220 │  25550 │     5621000 │
│ DN06         │ EUR     │         180 │  27900 │     5022000 │
│ DN07         │ VND     │     1500000 │      1 │     1500000 │
└──────────────┴─────────┴─────────────┴────────┴─────────────┘
```

Tổng quy đổi = **41.350.500 VND**, đủ 7 đơn.

<details>
<summary>Lời giải</summary>

```sql
with tg as (
  select tien_te, ngay hieu_luc_tu,
         coalesce((lead(ngay) over (partition by tien_te order by ngay) - interval 1 day)::date,
                  date '9999-12-31') hieu_luc_den, ty_gia
  from ty_gia
  union all select 'VND', date '2000-01-01', date '9999-12-31', 1)
select d.don_ngoai_id, d.tien_te, d.so_tien so_tien_goc, tg.ty_gia,
       d.so_tien * tg.ty_gia so_tien_vnd
from don_hang_ngoai_te d
join tg on tg.tien_te = d.tien_te and d.ngay_dat between tg.hieu_luc_tu and tg.hieu_luc_den
order by 1;
```

**Ba cột, không phải một.** Mỗi cột phục vụ một mục đích không thay thế được:

| Cột | Dùng cho | Mất nó thì |
|---|---|---|
| `so_tien_goc` | đối soát với hệ thống nguồn, khách hàng | không đối soát được |
| `ty_gia` | **truy vết** — vì sao ra con số này | không giải thích được |
| `so_tien_vnd` | cộng, báo cáo tổng | phải quy đổi lúc đọc |

Cột `ty_gia` là cột hay bị bỏ nhất và cần nhất. Không có nó, khi có người hỏi *"vì sao
đơn này ra 8.310.000"*, bạn phải đi tra lại bảng tỷ giá — mà bảng tỷ giá có thể đã được
sửa (nguồn gửi lại, hiệu chỉnh cuối tháng). Lúc đó **không tái lập được** con số cũ.

**Luật: quy đổi lúc nạp, không lúc đọc.** Quy đổi lúc đọc nghĩa là báo cáo hôm nay và
báo cáo hôm qua cho số khác nhau vì tỷ giá đã cập nhật — đúng
[case study doanh thu đổi theo tỷ giá](../case-studies/doanh-thu-doi-theo-ty-gia.md).

</details>

### Bài D.3 — Tỷ giá nào: lúc giao dịch hay cuối kỳ

**Đề:** tính tổng quy đổi **hai cách** — theo tỷ giá ngày giao dịch, và theo tỷ giá ngày
10/07 — rồi so.

**Đáp số phải ra:**

```text
┌─────────┬──────────┬──────────────┬─────────────────────┬────────┐
│ tien_te │ tong_goc │ theo_ngay_gd │ theo_ty_gia_cuoi_ky │ chenh  │
├─────────┼──────────┼──────────────┼─────────────────────┼────────┤
│ EUR     │      730 │     20244500 │            20403500 │ 159000 │
│ USD     │      770 │     19606000 │            19712000 │ 106000 │
│ VND     │  1500000 │      1500000 │             1500000 │      0 │
└─────────┴──────────┴──────────────┴─────────────────────┴────────┘
```

Chênh **265.000 VND** trên 41,35 triệu — 0,64%. Nhỏ, nhưng nó **không phải sai số**.

<details>
<summary>Lời giải</summary>

```sql
with tg as (
  select tien_te, ngay hieu_luc_tu,
         coalesce((lead(ngay) over (partition by tien_te order by ngay) - interval 1 day)::date,
                  date '9999-12-31') hieu_luc_den, ty_gia
  from ty_gia union all select 'VND', date '2000-01-01', date '9999-12-31', 1),
cuoi_ky as (select tien_te, ty_gia from ty_gia where ngay = date '2026-07-10'
            union all select 'VND', 1)
select d.tien_te, sum(d.so_tien) tong_goc,
       sum(d.so_tien * tg.ty_gia) theo_ngay_gd,
       sum(d.so_tien * ck.ty_gia) theo_ty_gia_cuoi_ky,
       sum(d.so_tien * ck.ty_gia) - sum(d.so_tien * tg.ty_gia) chenh
from don_hang_ngoai_te d
join tg on tg.tien_te = d.tien_te and d.ngay_dat between tg.hieu_luc_tu and tg.hieu_luc_den
join cuoi_ky ck on ck.tien_te = d.tien_te
group by 1 order by 1;
```

Cả hai số đều đúng, cho hai câu hỏi khác nhau — và **kế toán dùng cả hai, có tên riêng**:

| Cách | Tên | Trả lời |
|---|---|---|
| Tỷ giá **ngày giao dịch** | *transaction rate* | "lúc bán, đơn này đáng bao nhiêu VND" |
| Tỷ giá **cuối kỳ** | *closing rate* | "hôm nay, khoản này đáng bao nhiêu VND" |
| Chênh lệch | **lãi/lỗ tỷ giá** | tác động của biến động tỷ giá |

Cột `chenh` = 265.000 **không phải sai số cần sửa** — nó là **lãi tỷ giá**, một con số có
ý nghĩa kế toán và phải được báo cáo riêng.

Đó là lý do fact phải giữ `so_tien_goc` và `ty_gia` (bài D.2): có hai cột đó thì tính
được **cả hai** cách bất cứ lúc nào. Chỉ giữ `so_tien_vnd` là mất vĩnh viễn khả năng
tính lại theo tỷ giá khác.

Với kỳ báo cáo dài, còn cách thứ ba: **tỷ giá bình quân kỳ**. Ba cách, và chọn cái nào là
chính sách kế toán — phải hỏi, không được đoán.

</details>

### Bài D.4 — Đơn vị đo: cùng bài toán, khác vẻ ngoài

**Đề:** không có SQL bắt buộc. `so_luong` của `SP-A` (bàn phím) và `SP-C` (laptop) đều là
"cái". Nhưng nếu nguồn gửi một số theo **thùng 10 cái**, chuyện gì xảy ra?

<details>
<summary>Lời giải</summary>

```sql
select sum(so_luong) tong_so_luong from don_hang_chi_tiet;   -- 43 "cai"?
```

Con số 43 chỉ có nghĩa nếu **mọi dòng cùng đơn vị**. Một dòng ghi theo thùng là 43 trở
thành số vô nghĩa — và **không có gì trong dữ liệu chỉ ra điều đó**.

Đây là **cùng một bài toán với tiền tệ**, chỉ khác vẻ ngoài:

| | Tiền tệ | Đơn vị đo |
|---|---|---|
| Số gốc | `so_tien` + `tien_te` | `so_luong` + `don_vi` |
| Hệ số quy đổi | tỷ giá, **đổi theo ngày** | hệ số, **thường cố định** |
| Số chuẩn hoá | `so_tien_vnd` | `so_luong_cai` |
| Bẫy | thiếu tỷ giá một ngày | **thiếu cột `don_vi`** |

Bẫy của đơn vị đo **tệ hơn** bẫy tiền tệ ở một điểm: tiền tệ thường có cột `tien_te` nên
lỗi lộ ra khi join; đơn vị đo thường **không có cột nào cả**, vì "ai cũng biết là cái".

Cấu trúc đúng, giống hệt bài D.2:

```sql
create or replace table fct_ban_hang as
select ..., so_luong so_luong_goc, don_vi_goc, he_so_quy_doi,
       so_luong * he_so_quy_doi so_luong_cai
from ...;
```

Và với sản phẩm bán theo nhiều đơn vị (cân, mét, lít), hệ số quy đổi là **thuộc tính của
mặt hàng**, nằm trong `dim_hang_hoa` — không phải hằng số trong code.

**Cái bẫy cuối, khó nhất:** hệ số quy đổi **có thể đổi theo thời gian** (nhà sản xuất đổi
quy cách đóng gói từ 10 sang 12 cái/thùng). Lúc đó nó cần khoảng hiệu lực, y hệt tỷ giá —
và bài toán đơn vị đo trở thành **đúng** bài toán tiền tệ, không còn khác gì.

</details>

### Bài D.5 — Ba test cho mọi fact đa tiền tệ

**Đề:** viết ba test bảo vệ fact có quy đổi.

<details>
<summary>Lời giải</summary>

```sql
-- 1. KHONG DONG NAO THIEU TY GIA
select don_ngoai_id, tien_te, ngay_dat from fct_ngoai_te where ty_gia is null;

-- 2. QUY DOI DUNG: so_tien_vnd phai bang so_tien_goc * ty_gia
select don_ngoai_id, so_tien_goc, ty_gia, so_tien_vnd,
       so_tien_goc * ty_gia du_kien
from fct_ngoai_te
where abs(so_tien_vnd - so_tien_goc * ty_gia) > 1;

-- 3. TY GIA TRONG NGUONG HOP LY: bat loi don vi (nghin dong vs dong)
select tien_te, min(ty_gia) nho_nhat, max(ty_gia) lon_nhat,
       round(max(ty_gia)*1.0/min(ty_gia), 2) bien_dong
from fct_ngoai_te group by 1
having max(ty_gia)*1.0/min(ty_gia) > 1.5;
```

Test 3 là test đáng giá nhất và ít người viết nhất. Nó bắt loại lỗi mà hai test kia không
thấy: **nguồn đổi đơn vị**.

Nếu một hôm nguồn gửi tỷ giá USD là `25,4` thay vì `25400` (đổi từ VND sang nghìn VND),
thì:

- Test 1 qua — `ty_gia` không `NULL`.
- Test 2 qua — `so_tien_vnd = so_tien_goc * 25,4`, khớp phép nhân.
- **Doanh thu tụt 1000 lần**, và không test nào chặn.

Test 3 bắt được vì biên độ `max/min` nhảy vọt. Ngưỡng `1.5` là ví dụ — phải đặt theo biến
động thật của từng đồng tiền, và với đồng tiền ổn định thì ngưỡng nên chặt hơn nhiều
(`1.1`).

Nguyên tắc chung, dùng được cho mọi số đo có hệ số nhân: **test cả giá trị lẫn *độ lớn*.**
Kiểm tra công thức đúng là chưa đủ — phải kiểm tra kết quả nằm trong khoảng người ta
mong đợi. Xem [Nhiều tiền tệ và đơn vị đo](../skills/multi-currency-uom.md).

</details>

---

## Bảng đối chiếu nhanh

| Số | Nghĩa | Bài |
|---|---|---|
| **0 dòng** | *"Màn hình"* ≠ *"Man hinh"* — join bằng nhãn | A.1, A.2 |
| 16,4 / 24,2 / 0,0 / 9,1 % | drill-across đúng: gom trước, `full join` sau | B.1 |
| 6.750.000 (−34%) và 3.300.000 (+120%) | join thẳng hai fact: mất và phồng cùng lúc | B.2 |
| `dim_ngay` toàn `true` | conformed dimension quan trọng nhất | C.1 |
| `Tra hang × dim_hang` = `false` | lỗ hổng dữ liệu nguồn, không phải lỗi mô hình | C.1, C.4 |
| 5 / 7 đơn (−28,6%) | thiếu tỷ giá một ngày + thiếu dòng `VND` = 1 | D.1 |
| 41.350.500 VND | tổng quy đổi đủ 7 đơn | D.2 |
| chênh 265.000 | **lãi tỷ giá**, không phải sai số | D.3 |

## Related Topics

- [Bài tập bộ 5 — Fact nâng cao](bt-05-fact-nang-cao.md) — bộ trước
- [Bài tập bộ 7 — Vận hành](bt-07-van-hanh.md) — bộ cuối
- [Lab tích hợp](lab-tich-hop.md) — bản chẩn đoán của cùng chủ đề
- [Kỹ năng — Data Modeling](../skills/index.md) — lý thuyết của bốn kỹ thuật trên
