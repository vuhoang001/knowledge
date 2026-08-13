---
title: "Bài tập bộ 4 — Quan hệ và cây: bridge, phân cấp, thực thể không đồng nhất"
i18n_status: untranslated
sidebar_position: 13
description: "16 bài tự viết: bridge nhiều-nhiều phồng 72%, tìm đơn có hệ số 0,9, cây ragged cắt mất nhánh sâu, và 63,9% ô trống của bảng supertype."
tags: [tutorial, bai-tap, bridge-table, hierarchy, heterogeneous-schema, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Bài tập bộ 4 — Quan hệ và cây

> **Chốt:** ba kỹ thuật ở đây đều xử lý cùng một thứ mà star schema không có chỗ chứa —
> **quan hệ không phải nhiều-một**. Nhiều-nhiều, sâu không đều, và các loại không chung
> thuộc tính. Nhét bừa vào star là phồng số hoặc mất dòng.

## Kỹ thuật được luyện trong bộ này

| # | Kỹ thuật | Tài liệu gốc | Số bài |
|---|---|---|---|
| 1 | Bridge table | [Bridge table](../skills/bridge-table.md) | 6 |
| 2 | Cây phân cấp | [Cây phân cấp](../skills/hierarchy.md) | 5 |
| 3 | Thực thể không đồng nhất | [Thực thể không đồng nhất](../skills/heterogeneous-schema.md) | 5 |

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Ba bảng chính: `nhan_vien_don` (bridge, có **một đơn hệ số không khép kín**),
`cay_nhom_hang` (cây **hai gốc, sâu 1→4**), `giao_dich_tai_chinh` (bốn loại, mỗi loại
điền cột khác nhau). Xem [phụ lục seed](bt-00-seed.md).

---

## Bộ A — Bridge table

### Bài A.1 — Join thẳng qua bridge: phồng 72%

**Đề:** đo thiệt hại khi join `don_hang_chi_tiet` với `nhan_vien_don` mà **không** nhân
hệ số.

**Đáp số phải ra:**

```text
┌──────────┬──────────┬──────────┬────────────┐
│ dong_goc │ sau_join │ tien_goc │ tien_phong │
├──────────┼──────────┼──────────┼────────────┤
│       15 │       26 │ 10215000 │   17565000 │
└──────────┴──────────┴──────────┴────────────┘
```

Phồng **72%**. Và như mọi lần, hệ số phồng không tròn nên trông không giống lỗi.

<details>
<summary>Lời giải</summary>

```sql
select (select count(*) from don_hang_chi_tiet) dong_goc,
       (select count(*) from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id)) sau_join,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) tien_goc,
       (select sum(ct.so_luong*ct.don_gia)
        from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id)) tien_phong;
```

Khác biệt với các kiểu phồng đã gặp ở bộ 1: ở đây **không có lỗi nào trong câu SQL**.
Join đúng khoá, đúng điều kiện. Vấn đề nằm ở chỗ quan hệ *đơn hàng → nhân viên* là
**nhiều-nhiều**, và star schema không có cách nào biểu diễn nó bằng một khoá ngoại.

Ba cách sai thường gặp, và vì sao mỗi cách vẫn sai:

| Cách | Vấn đề |
|---|---|
| Lấy `min(nv_id)` cho mỗi đơn | mất dữ liệu — 7 dòng phân công biến mất |
| Thêm `nv_1_key`, `nv_2_key`, `nv_3_key` vào fact | đơn có 4 người thì sao; và không nhóm được |
| Nhân bản dòng fact cho mỗi nhân viên | chính là 26 dòng ở trên — phồng |

Cách đúng là **giữ bridge và mang theo hệ số phân bổ**, bài A.2.

</details>

### Bài A.2 — Nhân hệ số, và phát hiện tổng vẫn sai

**Đề:** tính doanh thu phân bổ theo từng nhân viên bằng cách nhân `he_so`. Rồi cộng lại
và so với 10.215.000.

**Đáp số phải ra:**

```text
┌───────────┬───────────────────┐
│  ho_ten   │ doanh_thu_phan_bo │
├───────────┼───────────────────┤
│ Bui Van G │         3660000.0 │
│ Vu Van E  │         3345000.0 │
│ Do Thi F  │         2400000.0 │
│ Ngo Thi H │          720000.0 │
└───────────┴───────────────────┘
```

```text
┌──────────────┬───────────┬──────────┐
│ tong_phan_bo │ tong_that │  chenh   │
├──────────────┼───────────┼──────────┤
│   10125000.0 │  10215000 │ -90000.0 │
└──────────────┴───────────┴──────────┘
```

Nhân hệ số rồi mà vẫn **thiếu 90.000**. Tìm cho ra vì sao.

<details>
<summary>Lời giải</summary>

```sql
select nv.ho_ten, round(sum(ct.so_luong*ct.don_gia * nd.he_so)) doanh_thu_phan_bo
from don_hang_chi_tiet ct
join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id)
group by 1 order by 2 desc;

select round(sum(ct.so_luong*ct.don_gia * nd.he_so)) tong_phan_bo, 10215000 tong_that,
       round(sum(ct.so_luong*ct.don_gia * nd.he_so)) - 10215000 chenh
from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id);
```

Hệ số **sửa được phồng** nhưng **không tự đảm bảo khép kín**. Nhân hệ số là điều kiện
cần, không phải điều kiện đủ.

Đây là chỗ bridge table nguy hiểm hơn hẳn các kỹ thuật khác: sau khi nhân hệ số, con số
**trông đã đúng** — không còn phồng 72%, tổng gần bằng tổng thật, mọi thứ có vẻ ổn. Sai
số 0,88% chìm nghỉm trong bất kỳ báo cáo nào.

Và nó chỉ lộ ra khi bạn **chủ động đối chiếu với tổng độc lập**. Không đối chiếu thì
không bao giờ biết.

Bài A.3 tìm thủ phạm.

</details>

### Bài A.3 — Tìm đơn có hệ số không khép kín

**Đề:** viết câu tìm mọi đơn có `sum(he_so)` khác 1.

**Đáp số phải ra:**

```text
┌─────────────┬────────────┬───────┐
│ don_hang_id │ tong_he_so │ so_nv │
├─────────────┼────────────┼───────┤
│ DH008       │        0.9 │     2 │
└─────────────┴────────────┴───────┘
```

Một đơn duy nhất. `DH008` trị giá 900.000, thiếu 10% = **90.000** — khớp đúng chênh lệch
ở bài A.2.

<details>
<summary>Lời giải</summary>

```sql
select don_hang_id, round(sum(he_so),2) tong_he_so, count(*) so_nv
from nhan_vien_don
group by 1
having abs(sum(he_so) - 1.0) > 0.001
order by 1;
```

Hai chi tiết quyết định câu này có dùng được không:

**`abs(...) > 0.001` chứ không phải `<> 1.0`.** `he_so` là số thực; `0.5 + 0.3 + 0.2`
trong IEEE 754 **không** bằng đúng `1.0`. So sánh bằng là báo động giả cho những đơn hoàn
toàn bình thường — và rồi ai đó tắt cảnh báo, và từ đó không bắt được gì nữa.

**`having` chứ không phải `where`.** Điều kiện áp lên nhóm, không lên dòng.

Câu này phải là **test chạy mỗi lần build**, không phải query chạy một lần:

```sql
-- dbt: tests/bridge_he_so_khep_kin.sql
select don_hang_id, sum(he_so) tong
from {{ ref('nhan_vien_don') }}
group by 1
having abs(sum(he_so) - 1.0) > 0.001
```

dbt coi test là fail khi truy vấn **trả về dòng**. Nên câu trên trả 1 dòng → build đỏ →
không ai kịp dựng báo cáo trên dữ liệu sai.

Không có test này thì `DH008` sống trong hệ thống mãi mãi, và mỗi tháng ai đó lại mất
nửa ngày tìm xem 0,88% đi đâu.

</details>

### Bài A.4 — Sửa hệ số: chuẩn hoá lúc đọc hay lúc ghi

**Đề:** sửa để tổng phân bổ bằng đúng 10.215.000, **hai cách**: chuẩn hoá hệ số lúc đọc,
và vá dữ liệu nguồn.

**Đáp số phải ra (cả hai cách):**

```text
┌──────────────┬───────────┬───────┐
│ tong_phan_bo │ tong_that │ chenh │
├──────────────┼───────────┼───────┤
│     10215000 │  10215000 │     0 │
└──────────────┴───────────┴───────┘
```

<details>
<summary>Lời giải</summary>

```sql
-- CACH 1: chuan hoa luc doc — chia cho tong he so cua chinh don do
with he_so_chuan as (
  select don_hang_id, nv_id,
         he_so / sum(he_so) over (partition by don_hang_id) he_so_chuan
  from nhan_vien_don)
select round(sum(ct.so_luong*ct.don_gia * h.he_so_chuan)) tong_phan_bo,
       10215000 tong_that,
       round(sum(ct.so_luong*ct.don_gia * h.he_so_chuan)) - 10215000 chenh
from don_hang_chi_tiet ct join he_so_chuan h using (don_hang_id);
```

```sql
-- CACH 2: va nguon — nang he_so cua NV03 tren DH008 tu 0.4 len 0.5
update nhan_vien_don set he_so = 0.5 where don_hang_id='DH008' and nv_id='NV03';
```

**Cách nào đúng phụ thuộc `0,9` nghĩa là gì** — và đó là câu hỏi nghiệp vụ, không phải
câu hỏi kỹ thuật:

| `0,9` nghĩa là | Cách đúng | Vì sao |
|---|---|---|
| **Lỗi nhập liệu** — lẽ ra phải là 1,0 | vá nguồn | sửa gốc, không che triệu chứng |
| **10% thuộc về kênh khác** (đối tác, tự động) | thêm dòng `nv_id = 'KHAC'` hệ số 0,1 | tổng khép kín và **giữ đúng sự thật** |
| **Tỷ trọng tương đối**, không phải phần trăm | chuẩn hoá lúc đọc | hệ số vốn không nhằm cộng thành 1 |

Chuẩn hoá lúc đọc là **cám dỗ nguy hiểm nhất** trong ba cách: nó làm mọi con số khớp
ngay lập tức, nên trông như đã sửa xong. Nhưng nếu `0,9` thật sự là lỗi nhập, bạn vừa
**giấu lỗi đi** — và tháng sau có đơn hệ số `2,5` thì nó cũng bị chuẩn hoá âm thầm thành
hợp lệ.

Quy tắc: **chuẩn hoá lúc đọc thì vẫn phải giữ test ở bài A.3.** Chuẩn hoá là để báo cáo
dùng được ngay, test là để có người đi sửa gốc.

</details>

### Bài A.5 — Hai câu hỏi, hai cách dùng bridge

**Đề:** tính cho mỗi nhân viên: doanh thu **phân bổ** (nhân hệ số) và doanh thu
**ảnh hưởng** (mọi đơn có tham gia, không nhân hệ số). Đặt cạnh nhau.

**Đáp số phải ra:**

```text
┌───────────┬─────────────────┬─────────────────────┐
│  ho_ten   │ so_don_tham_gia │ doanh_thu_anh_huong │
├───────────┼─────────────────┼─────────────────────┤
│ Vu Van E  │               6 │             5850000 │
│ Bui Van G │               3 │             5100000 │
│ Do Thi F  │               5 │             4245000 │
│ Ngo Thi H │               3 │             2370000 │
└───────────┴─────────────────┴─────────────────────┘
```

Tổng cột `doanh_thu_anh_huong` = **17.565.000** — đúng bằng con số "phồng 72%" ở bài A.1.

<details>
<summary>Lời giải</summary>

```sql
select nv.ho_ten, count(distinct nd.don_hang_id) so_don_tham_gia,
       sum(ct.so_luong*ct.don_gia) doanh_thu_anh_huong
from don_hang_chi_tiet ct
join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id)
group by 1 order by 3 desc;
```

**Con số "phồng" ở bài A.1 hoá ra là một con số hợp lệ** — cho một câu hỏi khác:

| Câu hỏi | Phép tính | Tổng |
|---|---|---|
| "Mỗi NV **mang về** bao nhiêu doanh thu?" | nhân hệ số | 10.215.000 ✅ |
| "Mỗi NV **đụng tay vào** bao nhiêu doanh thu?" | không nhân | 17.565.000 |

Cột thứ hai gọi là **impact analysis**, và nó **cố ý** không cộng lại được. Đó là điều
phải ghi rõ ngay cạnh nó, vì người đọc luôn có phản xạ kéo cột vào ô tổng.

Chú ý thứ tự xếp hạng đổi: theo doanh thu ảnh hưởng thì `Bui Van G` đứng nhì với chỉ 3
đơn; theo phân bổ thì anh ta **đứng nhất** (3.660.000). Vì `Bui Van G` làm một mình đơn
`DH005` — đơn to nhất, 2.700.000.

Hai bảng xếp hạng khác nhau từ cùng một bridge. Nếu dùng để tính thưởng, phải chốt trước
dùng cột nào — và đó là quyết định của phòng nhân sự, không phải của người viết SQL.

</details>

### Bài A.6 — Bridge có khoảng hiệu lực

**Đề:** không có SQL. `nhan_vien_don` hiện không có thời gian. Chuyện gì xảy ra khi nhân
viên **chuyển phòng ban** giữa kỳ, và sửa mô hình thế nào?

<details>
<summary>Lời giải</summary>

`NV01` đang ở *Kinh doanh*. Giả sử ngày 04/07 chuyển sang *Hỗ trợ*. Bây giờ hỏi *"doanh
thu theo phòng ban"*:

```sql
select nv.phong_ban, round(sum(ct.so_luong*ct.don_gia * nd.he_so))
from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id) group by 1;
```

Câu này gán **toàn bộ** doanh thu của `NV01`, kể cả các đơn từ 01/07, vào phòng ban
**hiện tại**. Đúng là bài toán as-was/as-is của [bộ 2](bt-02-dimension-thoi-gian.md), lần
này núp trong bridge.

Ba tầng sửa, và phải phân biệt rõ chúng chữa bệnh khác nhau:

**Tầng 1 — `dim_nhan_vien` thành Type 2.** Sửa vấn đề "phòng ban lúc nào". Fact chốt
`nv_key` (phiên bản) chứ không phải `nv_id`.

**Tầng 2 — bridge có khoảng hiệu lực.** Sửa vấn đề khác: *phân công* cũng đổi theo thời
gian. Đơn `DH003` ban đầu do `NV01` phụ trách 0,5, sau bàn giao lại còn 0,3:

```csv
don_hang_id,nv_id,he_so,hieu_luc_tu,hieu_luc_den
DH003,NV01,0.5,2026-07-02,2026-07-09
DH003,NV01,0.3,2026-07-10,9999-12-31
```

Lúc này bridge **tự nó là một Type 2**, và mọi truy vấn phải thêm điều kiện thời gian —
kể cả phép kiểm khép kín ở bài A.3, giờ phải kiểm khép kín **tại mỗi thời điểm**.

**Tầng 3 — chốt hệ số vào fact lúc nạp.** Bỏ hẳn join lúc đọc: mỗi dòng fact mang sẵn
`nv_key` và `he_so_da_chot`. Đắt lúc ghi, nhưng báo cáo quá khứ **bất biến vĩnh viễn**, và
không ai có cơ hội join sai.

Tầng 3 là cách các hệ thống tính hoa hồng dùng, vì lý do rất thực tế: **hoa hồng đã trả
thì không được đổi**. Xem [Bridge table](../skills/bridge-table.md).

</details>

---

## Bộ B — Cây phân cấp

### Bài B.1 — Dẹt cố định ba cấp: mất nhánh sâu, hở nhánh nông

**Đề:** làm phẳng `cay_nhom_hang` thành **đúng ba cột** `cap1`, `cap2`, `cap3`, rồi chỉ
ra mặt hàng nào bị cắt và mặt hàng nào bị hở.

**Đáp số phải ra:**

```text
┌─────────┬────────┬───────────┬───────────────────┬───────────────┬──────────────────────────┐
│ ma_hang │ do_sau │   cap1    │       cap2        │     cap3      │          mat_gi          │
├─────────┼────────┼───────────┼───────────────────┼───────────────┼──────────────────────────┤
│ SP-D    │      2 │ Cong nghe │ Thiet bi ngoai vi │ (khong co)    │ -                        │
│ SP-A    │      3 │ Cong nghe │ Thiet bi ngoai vi │ Thiet bi nhap │ -                        │
│ SP-B    │      3 │ Cong nghe │ Thiet bi ngoai vi │ Man hinh      │ -                        │
│ SP-C    │      4 │ Cong nghe │ May tinh          │ Laptop        │ BI CAT: Laptop van phong │
└─────────┴────────┴───────────┴───────────────────┴───────────────┴──────────────────────────┘
```

**Hai bệnh cùng lúc:** `SP-D` hở cấp 3, `SP-C` bị cắt mất cấp 4.

<details>
<summary>Lời giải</summary>

```sql
with recursive duong as (
  select nhom_id, ten_nhom, nhom_cha_id, 1 cap, [ten_nhom] duong
  from cay_nhom_hang where nhom_cha_id is null
  union all
  select c.nhom_id, c.ten_nhom, c.nhom_cha_id, d.cap+1, list_append(d.duong, c.ten_nhom)
  from cay_nhom_hang c join duong d on c.nhom_cha_id = d.nhom_id)
select hh.ma_hang, d.cap do_sau,
       d.duong[1] cap1,
       coalesce(d.duong[2],'(khong co)') cap2,
       coalesce(d.duong[3],'(khong co)') cap3,
       case when d.cap > 3 then 'BI CAT: ' || d.duong[4] else '-' end mat_gi
from hang_hoa hh join hang_hoa_nhom hn using (ma_hang)
join duong d on d.nhom_id = hn.nhom_id
order by d.cap;
```

Đây là cách **phần lớn** kho dữ liệu làm cây phân cấp, và nó hỏng theo hai hướng ngược
nhau:

**Nhánh nông hơn số cấp cố định → hở.** `SP-D` chỉ có 2 cấp. Cột `cap3` để `NULL` thì
`group by cap3` gom nó vào nhóm `NULL`; điền `'(khong co)'` thì báo cáo hiện một nhóm giả.
Cách duy nhất đúng là **kéo giá trị cấp cha xuống** (`cap3 = 'Thiet bi ngoai vi'`) — gọi
là *ragged fill-down*, và nó làm tổng vẫn đúng nhưng nhãn thì lặp.

**Nhánh sâu hơn số cấp cố định → mất.** `SP-C` thuộc *Laptop van phong* nhưng cột chỉ tới
*Laptop*. Doanh thu **không mất** — nó vẫn nằm trong *Laptop*. Cái mất là **khả năng
nhìn sâu hơn**, và nó mất **im lặng**: báo cáo vẫn cộng đủ 10.215.000, chỉ là không ai
biết còn một cấp nữa tồn tại.

Cái sâu xa hơn: **số cấp là dữ liệu, không phải hằng số.** Hôm nay 4, năm sau nghiệp vụ
thêm một cấp là phải sửa schema, sửa mọi báo cáo, và nạp lại lịch sử. Bài B.2 là lối ra.

</details>

### Bài B.2 — Bridge đường đi: một bảng cho mọi cấp

**Đề:** dựng `bridge_nhom` — mọi cặp *(tổ tiên, con cháu)* kèm khoảng cách, **có cả cặp
tự trỏ** (khoảng cách 0).

**Đáp số phải ra:**

```text
┌────────┬────────────┬────────┐
│ so_cap │ so_to_tien │ tu_tro │
├────────┼────────────┼────────┤
│     19 │          8 │      8 │
└────────┴────────────┴────────┘
```

8 nhóm sinh ra **19 cặp** quan hệ, trong đó 8 cặp tự trỏ.

<details>
<summary>Lời giải</summary>

```sql
create or replace table bridge_nhom as
with recursive tt as (
  select nhom_id to_tien, nhom_id con, 0 khoang_cach from cay_nhom_hang
  union all
  select t.to_tien, c.nhom_id, t.khoang_cach + 1
  from tt t join cay_nhom_hang c on c.nhom_cha_id = t.con)
select * from tt;

select count(*) so_cap, count(distinct to_tien) so_to_tien,
       count(*) filter (where khoang_cach = 0) tu_tro
from bridge_nhom;
```

Cấu trúc này có tên: **path enumeration bridge**, hay *closure table*. Nó lưu **mọi
đường đi** trong cây, không chỉ quan hệ cha–con trực tiếp.

Cặp tự trỏ (`khoang_cach = 0`) là chi tiết dễ quên nhất và bỏ nó là hỏng: không có nó thì
`Man hinh` không phải tổ tiên của chính nó, nên câu *"doanh thu của Man hinh và mọi nhóm
con"* sẽ **không tính doanh thu của chính `Man hinh`**.

Ba tính chất làm nó ăn đứt cách dẹt cố định:

| | Dẹt cố định | Bridge đường đi |
|---|---|---|
| Số cấp | **đóng cứng** trong schema | không giới hạn |
| Thêm một cấp | sửa schema + nạp lại | thêm dòng vào cây, dựng lại bridge |
| Cây sâu không đều | hở hoặc cắt | xử lý đúng, không cần fill-down |
| Cái giá | — | bảng lớn hơn, `join` thêm một bước |

Kích thước bridge tăng theo **độ sâu × số nút**, không phải bình phương — cây 100.000 nút
sâu 6 cấp cho khoảng 400.000 dòng. Vẫn nhỏ so với fact.

</details>

### Bài B.3 — Cộng dồn lên mọi cấp bằng bridge

**Đề:** dùng `bridge_nhom` tính doanh thu cho **mọi** nhóm, mỗi nhóm gồm cả con cháu.

**Đáp số phải ra:**

```text
┌─────────┬───────────────────┬────────┬───────────┐
│ to_tien │     ten_nhom      │ so_don │ doanh_thu │
├─────────┼───────────────────┼────────┼───────────┤
│ N1      │ Cong nghe         │     10 │  10215000 │
│ N3      │ Thiet bi ngoai vi │      9 │   6615000 │
│ N4      │ Laptop            │      2 │   3600000 │
│ N8      │ Laptop van phong  │      2 │   3600000 │
│ N2      │ May tinh          │      2 │   3600000 │
│ N5      │ Thiet bi nhap     │      6 │   3300000 │
│ N6      │ Man hinh          │      4 │   3000000 │
└─────────┴───────────────────┴────────┴───────────┘
```

Bảy dòng chứ không phải tám. **`N7` đi đâu?**

<details>
<summary>Lời giải</summary>

```sql
select b.to_tien, cn.ten_nhom,
       count(distinct ct.don_hang_id) so_don,
       sum(ct.so_luong*ct.don_gia) doanh_thu
from bridge_nhom b
join cay_nhom_hang cn on cn.nhom_id = b.to_tien
join hang_hoa_nhom hn on hn.nhom_id = b.con
join don_hang_chi_tiet ct on ct.ma_hang = hn.ma_hang
group by 1,2 order by 4 desc;
```

**`N7` (Hang thanh ly) không có mặt hàng nào**, nên `inner join` loại nó. Đó là hành vi
đúng của SQL nhưng **sai với nghiệp vụ**: báo cáo cần hiện *Hang thanh ly — 0 đồng*, chứ
không phải giấu nó đi. Người đọc không phân biệt được "nhóm doanh thu 0" với "nhóm không
tồn tại". Sửa bằng `left join` từ `cay_nhom_hang`.

Ba điều đọc ra từ bảng này:

**`N1` = 10.215.000 = toàn bộ doanh thu.** Đúng, vì mọi mặt hàng đều nằm dưới *Cong nghe*.
Đây là phép kiểm miễn phí cho cây: **gốc phải bằng tổng**.

**`N2` = `N4` = `N8` = 3.600.000.** Ba cấp liên tiếp cùng số vì chỉ có một mặt hàng
(`SP-C`) trong nhánh đó. Nhánh một con là bình thường, không phải lỗi.

**Các dòng KHÔNG cộng lại thành tổng.** 6.615.000 + 3.600.000 + … lớn hơn 10.215.000 rất
nhiều, vì mỗi mặt hàng được đếm ở **mọi cấp tổ tiên của nó**. Đó là bản chất của rollup
cây — và là lý do bảng này **không được** đưa cho công cụ BI mà không khoá lại mức xem.

Đây chính là [case study cộng cột luỹ kế](../case-studies/cong-cot-luy-ke.md) ở dạng
không gian thay vì thời gian.

</details>

### Bài B.4 — Cây tổ chức: cộng doanh thu cả nhánh dưới quyền

**Đề:** dùng recursive CTE trên `nhan_vien.nv_quan_ly_id`, tính cho mỗi người: doanh thu
phân bổ của **chính họ và toàn bộ cấp dưới**.

**Đáp số phải ra:**

```text
┌───────────┬─────────────┬──────────────────┬───────────────┐
│  ho_ten   │   cap_bac   │ doanh_thu_ca_nha │ so_nguoi_duoi │
├───────────┼─────────────┼──────────────────┼───────────────┤
│ Ngo Thi H │ Giam doc    │       10125000.0 │             4 │
│ Do Thi F  │ Truong nhom │        5745000.0 │             2 │
│ Bui Van G │ Nhan vien   │        3660000.0 │             1 │
│ Vu Van E  │ Nhan vien   │        3345000.0 │             1 │
└───────────┴─────────────┴──────────────────┴───────────────┘
```

`Ngo Thi H` ra **10.125.000** — không phải 10.215.000. Vẫn là `DH008` của bài A.3.

<details>
<summary>Lời giải</summary>

```sql
with recursive cay as (
  select nv_id goc, nv_id duoi from nhan_vien
  union all
  select c.goc, nv.nv_id from cay c join nhan_vien nv on nv.nv_quan_ly_id = c.duoi),
phan_bo as (
  select nd.nv_id, sum(ct.so_luong*ct.don_gia * nd.he_so) tien
  from don_hang_chi_tiet ct join nhan_vien_don nd using (don_hang_id)
  group by 1)
select nv.ho_ten, nv.cap_bac,
       round(sum(p.tien),1) doanh_thu_ca_nha,
       count(distinct c.duoi) so_nguoi_duoi
from cay c
join nhan_vien nv on nv.nv_id = c.goc
left join phan_bo p on p.nv_id = c.duoi
group by 1,2 order by 3 desc;
```

Đây là **hai bridge lồng nhau**, và thứ tự làm việc quan trọng:

1. `cay` — bridge đường đi trên cây tổ chức (giống bài B.2, khác dữ liệu).
2. `phan_bo` — gom doanh thu về từng nhân viên **trước**, đã nhân hệ số.
3. Nối hai cái.

**Gom trước là bắt buộc.** Nếu join `cay` thẳng vào `nhan_vien_don` rồi mới `sum`, mỗi
dòng phân công bị nhân lên theo số tổ tiên trong cây → phồng lần nữa, chồng lên phồng
của bài A.1.

Quy tắc chung khi có nhiều quan hệ nhiều-nhiều: **gom về grain đơn trước mỗi lần, không
bao giờ join hai bridge rồi mới gom.**

Và sai số `DH008` vẫn còn — nó lan qua mọi phép tính phía sau. Một dòng seed sai làm lệch
cả báo cáo hoa hồng của giám đốc. Đó là lý do test ở bài A.3 phải chạy **trước** mọi thứ.

</details>

### Bài B.5 — Phát hiện vòng lặp trong cây

**Đề:** không có SQL bắt buộc. `NV01` quản lý `NV02`, `NV02` quản lý `NV04`, và giả sử ai
đó đặt `NV04` quản lý `NV01`. Chuyện gì xảy ra, và phát hiện thế nào?

<details>
<summary>Lời giải</summary>

Recursive CTE ở bài B.4 sẽ **chạy vô hạn** — hoặc chính xác hơn: chạy tới khi hết bộ nhớ,
hoặc tới giới hạn đệ quy của engine. DuckDB và Postgres không tự phát hiện vòng.

Hai cách chặn, và nên có **cả hai**:

```sql
-- CACH 1: gioi han do sau, chan ngay luc chay
with recursive cay as (
  select nv_id goc, nv_id duoi, 0 sau from nhan_vien
  union all
  select c.goc, nv.nv_id, c.sau + 1
  from cay c join nhan_vien nv on nv.nv_quan_ly_id = c.duoi
  where c.sau < 10)                    -- <- chan
select * from cay;

-- CACH 2: mang theo duong di, bo dong nao quay lai
with recursive cay as (
  select nv_id goc, nv_id duoi, [nv_id] duong from nhan_vien
  union all
  select c.goc, nv.nv_id, list_append(c.duong, nv.nv_id)
  from cay c join nhan_vien nv on nv.nv_quan_ly_id = c.duoi
  where not list_contains(c.duong, nv.nv_id))   -- <- phat hien vong
select * from cay;
```

Cách 1 rẻ và luôn chặn được, nhưng **im lặng cắt cụt** cây sâu hơn 10 cấp thật. Cách 2
đúng về ngữ nghĩa nhưng tốn hơn.

Và cả hai đều chỉ **chặn**, không **báo**. Phải có test riêng:

```sql
-- test: khong ai la to tien cua chinh minh qua duong dai hon 0
select goc from cay where goc = duoi and sau > 0;
```

Vòng lặp trong cây tổ chức nghe như chuyện không thể xảy ra, nhưng nó xảy ra thật mỗi
khi có tái cấu trúc: A tạm quản lý B trong lúc B đang là quản lý của A, rồi ai đó quên
gỡ. Cây danh mục sản phẩm còn dễ hơn — chỉ cần một lần kéo-thả nhầm trong giao diện quản
trị.

**Luật:** mọi cây tự tham chiếu phải có test không-vòng, và test đó phải chạy **trước**
mọi recursive CTE dùng nó. Xem [Cây phân cấp](../skills/hierarchy.md).

</details>

---

## Bộ C — Thực thể không đồng nhất

### Bài C.1 — Đo rừng `NULL`: 63,9% ô trống

**Đề:** với `giao_dich_tai_chinh`, đếm số ô có dữ liệu trên **sáu cột biến thiên**
(`so_tien`, `ky_han_thang`, `lai_suat`, `ma_the`, `phi_giao_dich`, `don_hang_id`), theo
từng `loai_gd`. Rồi tính tỷ lệ ô trống toàn bảng.

**Đáp số phải ra:**

```text
┌────────────────┬─────────┬─────────┬────────┬──────────┬────────┬───────┬──────────┐
│    loai_gd     │ so_dong │ so_tien │ ky_han │ lai_suat │ ma_the │  phi  │ don_hang │
├────────────────┼─────────┼─────────┼────────┼──────────┼────────┼───────┼──────────┤
│ gui_tiet_kiem  │       2 │       2 │      2 │        2 │      0 │     0 │        0 │
│ nap_tien       │       3 │       3 │      0 │        0 │      0 │     0 │        0 │
│ rut_tien       │       3 │       3 │      0 │        0 │      0 │     3 │        0 │
│ thanh_toan_the │       4 │       4 │      0 │        0 │      4 │     0 │        3 │
└────────────────┴─────────┴─────────┴────────┴──────────┴────────┴───────┴──────────┘
```

```text
┌───────────────────┬────────┬─────────┐
│ phan_tram_o_trong │ tong_o │ so_dong │
├───────────────────┼────────┼─────────┤
│              63.9 │     72 │      12 │
└───────────────────┴────────┴─────────┘
```

**Gần hai phần ba bảng là ô trống.** Và có một ô "đáng lẽ phải đầy mà lại trống" — tìm ra.

<details>
<summary>Lời giải</summary>

```sql
select loai_gd, count(*) so_dong,
       count(so_tien) so_tien, count(ky_han_thang) ky_han, count(lai_suat) lai_suat,
       count(ma_the) ma_the, count(phi_giao_dich) phi, count(don_hang_id) don_hang
from giao_dich_tai_chinh group by 1 order by 1;

select round(100.0 * (count(*)*6 -
         (count(so_tien)+count(ky_han_thang)+count(lai_suat)
          +count(ma_the)+count(phi_giao_dich)+count(don_hang_id)))
       / (count(*)*6), 1) phan_tram_o_trong,
       count(*)*6 tong_o, count(*) so_dong
from giao_dich_tai_chinh;
```

**Ô bất thường: `thanh_toan_the` có 4 dòng nhưng chỉ 3 `don_hang_id`.** Đó là `GD12` —
thanh toán thẻ không gắn đơn hàng nào (ngoài hệ thống).

Chi tiết này quan trọng vì nó phân biệt hai loại `NULL` trông giống hệt nhau:

| Loại `NULL` | Ví dụ | Nghĩa |
|---|---|---|
| **Cấu trúc** | `ky_han_thang` của `nap_tien` | thuộc tính **không áp dụng** cho loại này |
| **Dữ liệu** | `don_hang_id` của `GD12` | thuộc tính **có áp dụng** nhưng thiếu |

`NULL` cấu trúc là hệ quả tất yếu của việc nhét nhiều loại vào một bảng — không sửa được
bằng cách điền dữ liệu. `NULL` dữ liệu là **lỗi** hoặc **trường hợp nghiệp vụ hợp lệ**, và
phải điều tra riêng.

Bảng một-bảng-rộng **không phân biệt được hai loại này**, và đó là khuyết điểm lớn nhất
của nó — lớn hơn chuyện tốn chỗ. Bài C.2 và C.3 là hai lối ra.

</details>

### Bài C.2 — Ba cách lưu, ba chi phí ô

**Đề:** so ba kiến trúc — một bảng rộng (supertype), tách bốn bảng (subtype), và
measure-type (EAV) — theo số ô cấp phát, ô có dữ liệu, ô trống.

**Đáp số phải ra:**

```text
┌───────────────────────────┬────────────┬──────────────┬─────────┐
│           cach            │ o_cap_phat │ o_co_du_lieu │ o_trong │
├───────────────────────────┼────────────┼──────────────┼─────────┤
│ mot bang rong (supertype) │         72 │           26 │      46 │
│ tach 4 bang (subtype)     │         27 │           26 │       1 │
│ measure-type (EAV)        │         38 │           19 │       0 │
└───────────────────────────┴────────────┴──────────────┴─────────┘
```

EAV có **19** ô dữ liệu chứ không phải 26. Bảy ô đi đâu?

<details>
<summary>Lời giải</summary>

```sql
create or replace table gd_eav as
select gd_id, ngay, khach_id, loai_gd, 'so_tien' thuoc_tinh, so_tien::double gia_tri
  from giao_dich_tai_chinh where so_tien is not null
union all select gd_id, ngay, khach_id, loai_gd, 'ky_han_thang', ky_han_thang::double
  from giao_dich_tai_chinh where ky_han_thang is not null
union all select gd_id, ngay, khach_id, loai_gd, 'lai_suat', lai_suat::double
  from giao_dich_tai_chinh where lai_suat is not null
union all select gd_id, ngay, khach_id, loai_gd, 'phi_giao_dich', phi_giao_dich::double
  from giao_dich_tai_chinh where phi_giao_dich is not null;
```

**Bảy ô mất đi là `ma_the` (4) và `don_hang_id` (3)** — chúng là **chuỗi**, còn cột
`gia_tri` của EAV là `double`.

Đó là khuyết điểm chí mạng của EAV, và nó hay bị bỏ qua khi người ta bị con số "0 ô
trống" hấp dẫn. Ba cách chữa, cả ba đều xấu:

| Cách chữa | Vấn đề |
|---|---|
| Thêm cột `gia_tri_chu` | mỗi dòng lại có một ô trống → mất luôn ưu điểm |
| Ép mọi thứ về chuỗi | mất kiểu, `sum()` phải `cast`, sai kiểu không ai bắt |
| Giữ chuỗi ở bảng riêng | thành hai bảng, phức tạp hơn subtype |

Cho nên **EAV chỉ hợp khi mọi thuộc tính cùng kiểu** — điển hình là chỉ số đo lường
(cảm biến, chỉ số y tế, số liệu tài chính). Có thuộc tính chuỗi trộn vào là EAV mất lợi
thế.

Bảng so sánh đầy đủ:

| | Supertype | Subtype | EAV |
|---|---|---|---|
| Ô trống | **46 (63,9%)** | 1 | 0 |
| Truy vấn *"tổng theo loại"* | 1 bảng, dễ | **`union` 4 bảng** | 1 bảng, cần `pivot` |
| Thêm một loại mới | thêm cột, sửa mọi query | **thêm bảng** | **không đụng schema** |
| Kiểu dữ liệu | đúng | đúng | **mất** |
| Ràng buộc "loại X phải có cột Y" | không cưỡng chế được | **`NOT NULL` cưỡng chế** | không |

</details>

### Bài C.3 — Tách subtype, và cái giá của `union`

**Đề:** tách `giao_dich_tai_chinh` thành bốn bảng subtype, rồi viết lại câu *"tổng tiền
theo khách"* — vốn là một dòng SQL trên bảng rộng.

**Đáp số phải ra:**

```text
┌──────────┬───────────┬───────┐
│ khach_id │ tong_tien │ so_gd │
├──────────┼───────────┼───────┤
│ C1       │  27195000 │     4 │
│ C3       │  13900000 │     3 │
│ C4       │   9500000 │     2 │
│ C2       │   3900000 │     3 │
└──────────┴───────────┴───────┘
```

<details>
<summary>Lời giải</summary>

```sql
create or replace table gd_nap_tien as
  select gd_id, ngay, khach_id, so_tien from giao_dich_tai_chinh where loai_gd='nap_tien';
create or replace table gd_rut_tien as
  select gd_id, ngay, khach_id, so_tien, phi_giao_dich from giao_dich_tai_chinh where loai_gd='rut_tien';
create or replace table gd_tiet_kiem as
  select gd_id, ngay, khach_id, so_tien, ky_han_thang, lai_suat
  from giao_dich_tai_chinh where loai_gd='gui_tiet_kiem';
create or replace table gd_the as
  select gd_id, ngay, khach_id, so_tien, ma_the, don_hang_id
  from giao_dich_tai_chinh where loai_gd='thanh_toan_the';

-- cau hoi cat ngang: phai union lai
with tat_ca as (
  select khach_id, so_tien from gd_nap_tien
  union all select khach_id, so_tien from gd_rut_tien
  union all select khach_id, so_tien from gd_tiet_kiem
  union all select khach_id, so_tien from gd_the)
select khach_id, sum(so_tien) tong_tien, count(*) so_gd
from tat_ca group by 1 order by 2 desc;
```

Đây là **đánh đổi thật** của subtype, và nó ngược với trực giác: tách bảng làm
*mỗi loại* sạch hơn, nhưng làm *mọi câu hỏi cắt ngang các loại* khó hơn.

```text
Cau hoi trong MOT loai   ("ky han gui tiet kiem trung binh")  →  subtype THANG
Cau hoi CAT NGANG loai   ("tong tien theo khach")             →  supertype THANG
```

Và tỷ lệ hai loại câu hỏi này quyết định kiến trúc. Nếu 90% báo cáo là cắt ngang thì tách
bốn bảng là tự làm khổ mình mỗi ngày để tiết kiệm 46 ô trống.

**Giải pháp thực dụng mà phần lớn kho dữ liệu dùng: cả hai.**

```sql
-- bang rong lam nguon su that, view subtype cho tung loai
create or replace view v_gd_tiet_kiem as
  select gd_id, ngay, khach_id, so_tien, ky_han_thang, lai_suat
  from giao_dich_tai_chinh where loai_gd = 'gui_tiet_kiem';
```

Lưu một bảng rộng (chấp nhận `NULL` cấu trúc), rồi tạo view cho từng subtype. Câu cắt
ngang đọc bảng gốc; câu theo loại đọc view và **không thấy cột nào không áp dụng**.

Cái mất: view không cưỡng chế được `NOT NULL`. Bù bằng test:

```sql
-- moi giao dich tiet kiem phai co ky han va lai suat
select gd_id from giao_dich_tai_chinh
where loai_gd = 'gui_tiet_kiem' and (ky_han_thang is null or lai_suat is null);
```

</details>

### Bài C.4 — Truy vấn trên dạng EAV

**Đề:** với `gd_eav`, thống kê theo `thuoc_tinh`, rồi `pivot` ngược về dạng bảng rộng cho
riêng `gui_tiet_kiem`.

**Đáp số phải ra:**

```text
┌───────────────┬─────────┬────────────┐
│  thuoc_tinh   │ so_dong │    tong    │
├───────────────┼─────────┼────────────┤
│ ky_han_thang  │       2 │       18.0 │
│ lai_suat      │       2 │       12.3 │
│ phi_giao_dich │       3 │    77000.0 │
│ so_tien       │      12 │ 54495000.0 │
└───────────────┴─────────┴────────────┘
```

Dòng `lai_suat` tổng **12,3** — con số đó có nghĩa gì không?

<details>
<summary>Lời giải</summary>

```sql
select thuoc_tinh, count(*) so_dong, round(sum(gia_tri),1) tong
from gd_eav group by 1 order by 1;

-- pivot nguoc ve dang rong
select gd_id, khach_id,
       max(gia_tri) filter (where thuoc_tinh='so_tien') so_tien,
       max(gia_tri) filter (where thuoc_tinh='ky_han_thang') ky_han_thang,
       max(gia_tri) filter (where thuoc_tinh='lai_suat') lai_suat
from gd_eav where loai_gd='gui_tiet_kiem'
group by 1,2 order by 1;
```

**`sum(lai_suat)` = 12,3 là số vô nghĩa** — nó cộng 5,8% với 6,5%. Lãi suất là tỷ lệ,
non-additive, giống hệt bài toán avg-của-avg ở [bộ 5](bt-05-fact-nang-cao.md).

Và đây là **khuyết điểm nguy hiểm nhất của EAV**, hơn cả chuyện mất kiểu dữ liệu: mọi
thuộc tính nằm chung một cột `gia_tri`, nên `sum(gia_tri)` **luôn chạy được** dù bạn đang
cộng tiền với lãi suất với kỳ hạn.

Ở dạng bảng rộng, cộng nhầm hai cột đó cần cố ý. Ở dạng EAV, quên một dòng `where
thuoc_tinh = ...` là đủ:

```sql
-- TRONG NHU DUNG, thuc ra cong tien + ky han + lai suat + phi
select khach_id, sum(gia_tri) from gd_eav group by 1;
```

Chống lại bằng cách bắt buộc: **không bao giờ `sum(gia_tri)` mà không có `where
thuoc_tinh`**, và thêm cột `don_vi` (`VND`, `thang`, `phan_tram`) để lỗi lộ ra khi nhóm.

Xem [Thực thể không đồng nhất](../skills/heterogeneous-schema.md).

</details>

### Bài C.5 — Chọn cách nào

**Đề:** không có SQL. Cho ba tình huống, chọn kiến trúc và giải thích.

1. Bốn loại giao dịch, ổn định nhiều năm, 90% báo cáo cắt ngang các loại.
2. Sản phẩm bảo hiểm, mỗi loại 20–40 thuộc tính riêng, mỗi quý ra loại mới.
3. Cảm biến IoT, 200 chỉ số, chỉ số mới thêm liên tục, tất cả đều là số.

<details>
<summary>Lời giải</summary>

**1 → Supertype (một bảng rộng).** Loại ổn định nên số cột không tăng; 90% cắt ngang nên
`union` sẽ xuất hiện trong hầu hết truy vấn. 46 ô trống là cái giá rẻ nhất trong ba cách.
Thêm view cho từng loại như bài C.3.

**2 → Subtype (tách bảng).** 20–40 thuộc tính riêng × 4 loại là bảng rộng **160 cột**,
trong đó mỗi dòng chỉ điền 1/4. Tệ hơn: mỗi quý một loại mới nghĩa là **thêm 30 cột vào
bảng đang có** — thao tác đắt trên bảng lớn, và mọi `select *` đều rộng thêm.

Với subtype, loại mới là **bảng mới**, không đụng gì đang chạy. Đó là ưu điểm quan trọng
nhất ở đây, chứ không phải ô trống.

**3 → EAV (measure-type).** Đây là trường hợp EAV **được thiết kế cho**: mọi giá trị cùng
kiểu số, số lượng thuộc tính lớn và mở, thuộc tính mới không được phép làm đổi schema.
Khuyết điểm mất kiểu ở bài C.2 không áp dụng vì không có thuộc tính chuỗi.

Vẫn phải có `don_vi` và cấm `sum(gia_tri)` trần như bài C.4.

**Cây quyết định rút gọn:**

```text
Thuoc tinh moi co lam DOI SCHEMA khong duoc chap nhan?
├─ Co  → EAV, neu MOI gia tri cung kieu
│         khong cung kieu → subtype
└─ Khong
   ├─ It thuoc tinh rieng (<10) + hay cat ngang  → SUPERTYPE
   └─ Nhieu thuoc tinh rieng (>20)               → SUBTYPE
```

Điều cần nhớ: **cả ba đều đúng**, và chọn sai không làm số sai — nó chỉ làm mọi việc về
sau đắt hơn. Đó là loại quyết định khó sửa nhất, vì không có triệu chứng nào báo rằng
bạn chọn sai.

</details>

---

## Bảng đối chiếu nhanh

| Số | Nghĩa | Bài |
|---|---|---|
| 15 → 26 dòng, +72% | join bridge không nhân hệ số | A.1 |
| 10.125.000, thiếu 90.000 | nhân hệ số rồi vẫn sai vì `DH008` | A.2 |
| `DH008` tổng hệ số 0,9 | thủ phạm, tìm bằng `having` | A.3 |
| 17.565.000 | doanh thu **ảnh hưởng** — cố ý không cộng được | A.5 |
| `SP-D` hở, `SP-C` bị cắt | dẹt cố định hỏng hai đầu | B.1 |
| 19 cặp / 8 tự trỏ | bridge đường đi cho cây | B.2 |
| `N1` = 10.215.000 | gốc cây phải bằng tổng | B.3 |
| 63,9% ô trống | rừng `NULL` của bảng supertype | C.1 |
| 72 / 27 / 38 ô | supertype vs subtype vs EAV | C.2 |
| `sum(lai_suat)` = 12,3 | EAV cho phép cộng nhầm đơn vị | C.4 |

## Related Topics

- [Bài tập bộ 3 — Cột và bảng](bt-03-cot-va-bang.md) — bộ trước
- [Bài tập bộ 5 — Fact nâng cao](bt-05-fact-nang-cao.md) — bộ tiếp theo
- [Phụ lục seed](bt-00-seed.md) — `nhan_vien_don`, `cay_nhom_hang`, `giao_dich_tai_chinh`
- [Kỹ năng — Data Modeling](../skills/index.md) — lý thuyết của ba kỹ thuật trên
