---
title: "Bài tập bộ 3 — Cột và bảng: junk, degenerate, con rết, thuộc tính, NULL"
sidebar_position: 12
description: "23 bài tự viết: gộp cờ thành junk dimension, chứng minh degenerate phải ở lại fact, gỡ fact 19 khoá ngoại, và bắt NULL nuốt dòng bằng NOT IN."
tags: [tutorial, bai-tap, junk-dimension, degenerate-dimension, centipede-fact, dimension-attribute-design, null-handling, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Bài tập bộ 3 — Cột và bảng

> **Chốt:** bộ này trả lời một câu duy nhất — **cột này nên nằm ở đâu**. Để thẳng trong
> fact, gộp lại một bảng, tách ra riêng, hay bỏ đi. Bốn lựa chọn, và chọn sai thì không
> có lỗi nào báo.

## Kỹ thuật được luyện trong bộ này

| # | Kỹ thuật | Tài liệu gốc | Số bài |
|---|---|---|---|
| 1 | Junk dimension | [Junk dimension](../skills/junk-dimension.md) | 5 |
| 2 | Degenerate dimension | [Degenerate dimension](../skills/degenerate-dimension.md) | 4 |
| 3 | Centipede fact table | [Centipede fact table](../skills/centipede-fact.md) | 4 |
| 4 | Thiết kế thuộc tính dimension | [Thiết kế thuộc tính dimension](../skills/dimension-attribute-design.md) | 5 |
| 5 | NULL trong fact và dimension | [NULL trong fact và dimension](../skills/null-handling.md) | 5 |

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Bộ này dùng `don_hang` (cờ trạng thái) và `giao_dich_tai_chinh` (rừng `NULL`) — xem
[phụ lục seed](bt-00-seed.md).

---

## Bộ A — Junk dimension

### Bài A.1 — Đo cardinality trước khi quyết định

**Đề:** đếm số giá trị phân biệt của bốn cờ cấp đơn: `trang_thai`, `da_giao`
(`ngay_giao is not null`), `da_nhan` (`ngay_nhan is not null`), `phi_ship_cao`
(`phi_ship >= 60000`).

**Đáp số phải ra:**

```text
┌──────────────┬────────────┐
│      co      │ so_gia_tri │
├──────────────┼────────────┤
│ trang_thai   │          3 │
│ da_giao      │          2 │
│ da_nhan      │          2 │
│ phi_ship_cao │          2 │
└──────────────┴────────────┘
```

Cả bốn đều **cardinality thấp**. Đó là điều kiện cần của junk dimension — nhưng chưa đủ.

<details>
<summary>Lời giải</summary>

```sql
select 'trang_thai' co, count(distinct trang_thai) so_gia_tri from don_hang
union all select 'da_giao', count(distinct (ngay_giao is not null)) from don_hang
union all select 'da_nhan', count(distinct (ngay_nhan is not null)) from don_hang
union all select 'phi_ship_cao', count(distinct (phi_ship >= 60000)) from don_hang;
```

Cardinality thấp là **điều kiện cần**, không phải điều kiện đủ. Còn hai câu nữa phải hỏi
trước khi gộp:

1. **Các cờ có thuộc cùng một thực thể không?** Cả bốn đều mô tả *một đơn hàng*. Nếu một
   cờ mô tả khách và một cờ mô tả mặt hàng thì gộp chung là sai — chúng thuộc hai
   dimension khác nhau.
2. **Có cờ nào thật sự là dimension riêng đang lớn dần không?** `trang_thai` hôm nay 3
   giá trị; nếu nghiệp vụ sắp thêm quy trình đổi trả với 12 trạng thái con và cả thuộc
   tính riêng, thì nó là `dim_trang_thai`, không phải mảnh của junk.

Ngưỡng thực dụng: **≤ ~20 giá trị và không có thuộc tính riêng** thì là ứng viên junk.
Trên ngưỡng đó thì dựng dimension riêng.

</details>

### Bài A.2 — 4 tổ hợp thật, 24 tổ hợp lý thuyết

**Đề:** đếm số tổ hợp bốn cờ **thực tế xuất hiện** trong dữ liệu, đặt cạnh số tổ hợp
**lý thuyết** (3 × 2 × 2 × 2).

**Đáp số phải ra:**

```text
┌────────┬────────────────┬──────────────────┐
│ so_don │ to_hop_thuc_te │ to_hop_ly_thuyet │
├────────┼────────────────┼──────────────────┤
│     10 │              4 │               24 │
└────────┴────────────────┴──────────────────┘
```

**4 trên 24.** Đây là con số quyết định cách dựng junk dimension.

<details>
<summary>Lời giải</summary>

```sql
with co as (select trang_thai,
                   ngay_giao is not null da_giao,
                   ngay_nhan is not null da_nhan,
                   phi_ship >= 60000 phi_cao
            from don_hang)
select count(*) so_don,
       count(distinct (trang_thai, da_giao, da_nhan, phi_cao)) to_hop_thuc_te,
       3*2*2*2 to_hop_ly_thuyet
from co;
```

Tỷ lệ 4/24 = **17%** không phải ngẫu nhiên — các cờ **phụ thuộc lẫn nhau**:

```text
trang_thai='moi'        →  da_giao PHAI la false, da_nhan PHAI la false
trang_thai='dang_giao'  →  da_giao PHAI la true,  da_nhan PHAI la false
trang_thai='hoan_thanh' →  da_giao PHAI la true,  da_nhan PHAI la true
```

Ba trạng thái đã khoá chặt `da_giao` và `da_nhan`, nên chỉ còn `phi_cao` tự do → tối đa
6 tổ hợp hợp lệ, và dữ liệu này dùng 4.

Hai cách dựng junk dimension, chọn theo tỷ lệ này:

| Cách | Khi nào | Rủi ro |
|---|---|---|
| **Chỉ tổ hợp đã thấy** (4 dòng) | tổ hợp thưa như ở đây | phải **thêm dòng khi gặp tổ hợp mới** lúc nạp |
| **Sinh sẵn mọi tổ hợp** (24 dòng) | tổ hợp dày, số cờ ít | bảng có dòng vô nghĩa (`moi` + `da_nhan`) |

Với 17% thì sinh sẵn là lãng phí và gây nhầm — 20 dòng không bao giờ dùng nằm chình ình
trong bộ lọc BI. Chọn cách thứ nhất.

</details>

### Bài A.3 — Dựng junk dimension

**Đề:** dựng `dim_junk_don` chứa đúng các tổ hợp thực tế, có `junk_key`.

**Đáp số phải ra:**

```text
┌──────────┬────────────┬─────────┬─────────┬─────────┐
│ junk_key │ trang_thai │ da_giao │ da_nhan │ phi_cao │
├──────────┼────────────┼─────────┼─────────┼─────────┤
│        1 │ dang_giao  │ true    │ false   │ false   │
│        2 │ hoan_thanh │ true    │ true    │ false   │
│        3 │ hoan_thanh │ true    │ true    │ true    │
│        4 │ moi        │ false   │ false   │ false   │
└──────────┴────────────┴─────────┴─────────┴─────────┘
```

<details>
<summary>Lời giải</summary>

```sql
create or replace table dim_junk_don as
select row_number() over (order by trang_thai, da_giao, da_nhan, phi_cao) junk_key, *
from (select distinct trang_thai,
             ngay_giao is not null da_giao,
             ngay_nhan is not null da_nhan,
             phi_ship >= 60000 phi_cao
      from don_hang);

select * from dim_junk_don order by junk_key;
```

Bảng đọc được ngay: `hoan_thanh` xuất hiện hai lần vì phí ship cao/thấp; `moi` chỉ có
một dạng vì chưa giao thì không thể đã nhận.

**Một lỗi phải tránh:** cột `da_giao`, `da_nhan`, `phi_cao` đang là `boolean`. Trên báo
cáo, `true`/`false` là thứ khó đọc và không dịch được. Thay bằng chữ:

```sql
case when ngay_giao is not null then 'Da giao' else 'Chua giao' end da_giao
```

Nghe nhỏ nhặt, nhưng đó là khác biệt giữa bộ lọc BI ghi *"da_giao: true"* và
*"Trạng thái giao: Đã giao"*. Bài A.5 và bài D.2 nói kỹ hơn.

**Lỗi thứ hai, nặng hơn:** `phi_cao = phi_ship >= 60000` chôn ngưỡng 60.000 vào
dimension. Ngưỡng đổi là **mọi `junk_key` cũ đổi nghĩa**, và fact cũ trỏ vào nghĩa cũ.
Ngưỡng nghiệp vụ hay đổi thì đừng đưa vào junk — để `phi_ship` trong fact và phân
ngưỡng lúc đọc.

</details>

### Bài A.4 — Bốn cách lưu, bốn chi phí

**Đề:** so số dòng phải lưu giữa: bốn dimension riêng, một junk dimension tổ hợp thực tế,
một junk dimension mọi tổ hợp, và để thẳng bốn cột trong fact.

**Đáp số phải ra:**

```text
┌───────────────────────────────────────┬─────────┐
│                 cach                  │ so_dong │
├───────────────────────────────────────┼─────────┤
│ bon dim rieng                         │       9 │
│ mot junk dim (to hop thuc te)         │       4 │
│ mot junk dim (moi to hop)             │      24 │
│ de thang trong fact (15 dong x 4 cot) │      60 │
└───────────────────────────────────────┴─────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select 'bon dim rieng' cach, 3+2+2+2 so_dong
union all select 'mot junk dim (to hop thuc te)', (select count(*) from dim_junk_don)
union all select 'mot junk dim (moi to hop)', 24
union all select 'de thang trong fact (15 dong x 4 cot)', 15*4;
```

Nhưng **số dòng không phải lý do thật**. Bốn dimension riêng chỉ tốn 9 dòng — rẻ hơn junk
24 dòng. Lý do thật nằm ở **fact table**:

| Cách | Cột trong fact | Join để lọc cả 4 cờ |
|---|---|---|
| 4 dim riêng | 4 khoá ngoại | **4 join** |
| 1 junk dim | **1 khoá ngoại** | **1 join** |
| Để thẳng | 4 cột chuỗi | 0 join, nhưng lặp chuỗi mọi dòng |

Với fact 500 triệu dòng, bốn khoá ngoại `int` là **8 GB** chỉ riêng khoá. Một khoá là
2 GB. Và mỗi join là một lần shuffle.

Junk dimension đổi **bốn dimension bé xíu và bốn join** lấy **một bảng bé xíu và một
join**. Đó mới là mục đích — dọn bớt khoá ngoại khỏi fact, dẫn thẳng sang bài toán con
rết ở bộ C.

Cách "để thẳng trong fact" (60 ô) không sai với dữ liệu bé, và thực tế nhiều lakehouse
chọn nó vì cột hoá + nén làm chi phí lặp gần bằng 0. Đánh đổi: mất chỗ tập trung để định
nghĩa nhãn, và mỗi truy vấn tự viết `case when` một kiểu.

</details>

### Bài A.5 — Thêm một trạng thái mới thì hỏng ở đâu

**Đề:** không có SQL. Nghiệp vụ thêm trạng thái `da_huy`. Junk dimension dựng theo "tổ
hợp thực tế" sẽ hỏng thế nào, và sửa ra sao?

<details>
<summary>Lời giải</summary>

Chuỗi sự kiện, theo đúng thứ tự nó xảy ra:

1. Đơn `DH011` về với `trang_thai = 'da_huy'`, `da_giao = false`, `phi_cao = false`.
2. Tổ hợp `('da_huy', false, false, false)` **chưa có** trong `dim_junk_don`.
3. Job nạp fact `left join` vào junk dim → không khớp → `junk_key = -1`.
4. Báo cáo theo trạng thái hiện `Khong xac dinh`, hoặc đơn biến mất nếu ai đó dùng
   `inner join`.

**Không có lỗi nào được ném ra.** Đơn huỷ chỉ đơn giản là không xuất hiện đúng chỗ.

Cách sửa, theo thứ tự ưu tiên:

```sql
-- 1. NAP JUNK DIM TRUOC FACT, moi lan chay: them to hop moi neu chua co
insert into dim_junk_don
select (select coalesce(max(junk_key),0) from dim_junk_don)
         + row_number() over (order by trang_thai, da_giao, da_nhan, phi_cao),
       s.*
from (select distinct trang_thai, ngay_giao is not null da_giao,
             ngay_nhan is not null da_nhan, phi_ship >= 60000 phi_cao
      from don_hang) s
where not exists (select 1 from dim_junk_don d
                  where d.trang_thai = s.trang_thai and d.da_giao = s.da_giao
                    and d.da_nhan = s.da_nhan and d.phi_cao = s.phi_cao);

-- 2. TEST CHAN: co dong nao mo coi khong
select count(*) so_dong_mo_coi from fct_ban_hang where junk_key = -1;
```

Thứ tự ở bước 1 là bắt buộc: **dimension luôn nạp trước fact**. Đảo lại là mọi tổ hợp mới
đều thành `-1` trong lần chạy đó, và lần chạy sau không tự sửa.

Bước 2 là thứ biến lỗi im lặng thành lỗi ồn ào. Junk dimension không có test này thì
sớm muộn cũng có một trạng thái mới lọt qua mà không ai biết.

Đây chính là hình dạng của
[case study thêm trạng thái thứ tám](../case-studies/them-trang-thai-thu-tam.md).

</details>

---

## Bộ B — Degenerate dimension

### Bài B.1 — Chứng minh `don_hang_id` không có thuộc tính nào

**Đề:** chứng minh bằng SQL rằng nếu dựng `dim_don_hang` từ `don_hang_id`, bảng đó sẽ có
**đúng số dòng bằng** bảng header — tức tỷ lệ 1:1.

**Đáp số phải ra:**

```text
┌─────────────┬─────────────────────┬───────────┐
│ so_dong_dim │ so_dong_fact_header │ ty_le_1_1 │
├─────────────┼─────────────────────┼───────────┤
│          10 │                  10 │ true      │
└─────────────┴─────────────────────┴───────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select count(*) so_dong_dim,
       (select count(*) from don_hang) so_dong_fact_header,
       count(*) = (select count(*) from don_hang) ty_le_1_1
from (select distinct don_hang_id from don_hang);
```

**1:1 là bằng chứng kết tội.** Một dimension có ý nghĩa khi nó **gom nhiều dòng fact về
ít dòng thuộc tính** — 500 triệu dòng bán hàng về 10.000 khách. Tỷ lệ 1:1 nghĩa là nó
không gom gì cả.

Dựng `dim_don_hang` thì được cái bảng này:

```sql
-- dim_don_hang, neu dung dai
don_hang_key | don_hang_id
-------------|------------
           1 | DH001
           2 | DH002
```

Một cột khoá trỏ tới một cột mã. Không thuộc tính nào để lọc, để nhóm, để mô tả. Đổi lại
là **một join** cho mọi truy vấn cần số đơn hàng.

Chú ý phân biệt với `don_hang` (bảng header): bảng đó **có** thuộc tính (`trang_thai`,
`phi_ship`, ba cột ngày) nhưng chúng thuộc về ba nơi khác nhau — junk dimension,
số đo, và role-playing `dim_ngay`. Sau khi chia hết, `don_hang_id` **còn lại một mình**.

Đó chính là định nghĩa degenerate dimension: mã nghiệp vụ **sống sót sau khi mọi thuộc
tính đã được đưa về đúng chỗ**. Nó ở lại fact, không cần bảng.

</details>

### Bài B.2 — Không có degenerate thì đếm sai

**Đề:** tính giá trị trung bình một đơn hàng, **có** và **không có** `don_hang_id` trong
fact. Chỉ ra cái sai.

**Đáp số phải ra:**

```text
┌───────────┬────────┬─────────────┬─────────┬────────────────────┐
│ doanh_thu │ so_don │ gio_hang_tb │ so_dong │ neu_khong_co_ma_don│
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
       round(sum(so_luong*don_gia)*1.0/count(*), 0) neu_khong_co_ma_don
from don_hang_chi_tiet;
```

**1.021.500 hay 681.000** — chênh 33%, và cả hai đều là "giá trị trung bình" nếu chỉ đọc
tên cột.

Không có `don_hang_id` trong fact thì `count(distinct don_hang_id)` không viết được, nên
mẫu số duy nhất còn lại là `count(*)` = số **dòng hàng**. Câu trả lời thành "giá trị
trung bình một dòng hàng", trong khi câu hỏi là "một đơn hàng".

Đây là lý do degenerate dimension **phải nằm trong fact**, không phải chuyện tiện tay:

| Câu hỏi | Cần |
|---|---|
| Giỏ hàng trung bình | `count(distinct don_hang_id)` |
| Số mặt hàng trung bình mỗi đơn | `count(*) / count(distinct don_hang_id)` |
| Tỷ lệ đơn có trên 1 mặt hàng | nhóm theo `don_hang_id` |
| Truy vết về hệ thống nguồn | `don_hang_id` để tra OLTP |

Cả bốn đều **không làm được** nếu bỏ mã đơn ra khỏi fact. Xem
[Degenerate dimension](../skills/degenerate-dimension.md).

</details>

### Bài B.3 — Một fact có mấy degenerate dimension

**Đề:** liệt kê mọi cột trong `don_hang_chi_tiet` là degenerate dimension, và giải thích
vì sao `dong` cũng là một.

**Đáp số phải ra:**

```text
┌─────────────┬─────────────────────────────────┐
│     cot     │            phan_loai            │
├─────────────┼─────────────────────────────────┤
│ don_hang_id │ degenerate (ma don)             │
│ dong        │ degenerate (so thu tu trong don)│
│ ma_hang     │ khoa ngoai -> dim_hang_hoa      │
│ ngay        │ khoa ngoai -> dim_ngay          │
│ so_luong    │ so do                           │
│ don_gia     │ so do                           │
└─────────────┴─────────────────────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select column_name cot,
       case column_name
         when 'don_hang_id' then 'degenerate (ma don)'
         when 'dong'        then 'degenerate (so thu tu trong don)'
         when 'ma_hang'     then 'khoa ngoai -> dim_hang_hoa'
         when 'ngay'        then 'khoa ngoai -> dim_ngay'
         else 'so do' end phan_loai
from information_schema.columns
where table_schema='main' and table_name='don_hang_chi_tiet'
order by ordinal_position;
```

`dong` là degenerate vì nó thoả đúng hai điều kiện: **là mã nghiệp vụ** và **không có
thuộc tính nào đi kèm**. "Dòng số 2" không có màu, không có nhóm, không có mô tả — nó chỉ
là số thứ tự trong đơn.

Và nó có ích thật: `(don_hang_id, dong)` là khoá tự nhiên của fact, dùng cho phép kiểm
grain ở [bộ 1 bài A.1](bt-01-nen-tang.md#bài-a1--khai-grain-cho-cả-bảy-bảng-và-chứng-minh)
và cho việc đối chiếu ngược về hệ thống nguồn.

Một fact có **nhiều** degenerate là bình thường. Fact bán lẻ thật thường có: số hoá đơn,
số dòng, số ca bán hàng, mã giao dịch thẻ, số phiếu giảm giá. Năm cột mã, không cột nào
đáng dựng thành bảng.

**Cách nhận ra nhanh:** cột kết thúc bằng `_id` / `_no` / `_ma` mà bạn **không mô tả
được thuộc tính thứ hai của nó** thì đó là degenerate.

</details>

### Bài B.4 — Khi nào degenerate **phải** thành dimension thật

**Đề:** không có SQL. Nêu ba tình huống mà `don_hang_id` nên được nâng lên thành
dimension thật.

<details>
<summary>Lời giải</summary>

**1. Khi đơn hàng có thuộc tính riêng mà không nơi nào chứa được.** Ví dụ: kênh đặt hàng,
mã khuyến mãi áp cho cả đơn, ghi chú của khách, loại hợp đồng. Lúc đó nó không còn
"trần trụi" nữa — đã có thuộc tính thì đã là dimension.

Ranh giới cần cẩn thận: `trang_thai` và `phi_ship` **không** tính, vì chúng có chỗ khác
đúng hơn (junk dimension và số đo).

**2. Khi có nhiều fact ở nhiều grain cùng trỏ về đơn.** Bán hàng (grain dòng), giao hàng
(grain đơn), thanh toán (grain giao dịch), trả hàng (grain lần trả). Bốn fact cùng cần
thuộc tính cấp đơn thì để chung một `dim_don_hang` là hợp lý — nếu không thì thuộc tính
đó bị chép bốn lần và bốn bản sẽ lệch nhau.

**3. Khi đơn hàng cần Type 2.** Nếu nghiệp vụ hỏi *"lúc giao thì đơn thuộc loại hợp đồng
nào"*, cần lịch sử theo thời gian → cần dimension có khoảng hiệu lực. Degenerate không
giữ được lịch sử vì nó chỉ là một chuỗi trong fact.

Ngược lại, cái bẫy phổ biến nhất là **dựng dimension chỉ để có chỗ đặt khoá ngoại cho
đẹp sơ đồ**. Kết quả là bảng 1:1 với fact, thêm một join cho mọi truy vấn, và không trả
lời thêm được câu nào — chính là
[case study dim đơn hàng làm phồng doanh thu](../case-studies/dim-don-hang-lam-phong-doanh-thu.md).

**Phép thử một câu:** *"Bảng dimension này có ít dòng hơn hẳn bảng fact không?"* Không thì
đừng dựng.

</details>

---

## Bộ C — Centipede fact table

### Bài C.1 — Dựng một con rết 19 khoá ngoại

**Đề:** dựng `fct_con_ret` — fact bán hàng với **19 cột kết thúc bằng `_key`**, kiểu mà
người ta hay dựng khi "chiều nào cũng cần khoá riêng".

**Đáp số phải ra:**

```text
┌─────────────┬───────────────┬─────────────┐
│ so_cot_tong │ so_khoa_ngoai │ so_cot_khac │
├─────────────┼───────────────┼─────────────┤
│          24 │            19 │           5 │
└─────────────┴───────────────┴─────────────┘
```

**19 khoá ngoại, 5 cột còn lại.** Fact này gần như toàn khoá.

<details>
<summary>Lời giải</summary>

```sql
create or replace table fct_con_ret as
select ct.don_hang_id, ct.dong,
  cast(strftime(h.ngay_dat,'%Y%m%d') as int) ngay_dat_key,
  coalesce(cast(strftime(h.ngay_giao,'%Y%m%d') as int),-1) ngay_giao_key,
  coalesce(cast(strftime(h.ngay_nhan,'%Y%m%d') as int),-1) ngay_nhan_key,
  cast(strftime(h.ngay_dat,'%Y') as int) nam_key,
  cast(quarter(h.ngay_dat) as int) quy_key,
  cast(strftime(h.ngay_dat,'%Y%m') as int) thang_key,
  cast(week(h.ngay_dat) as int) tuan_key,
  cast(dayofweek(h.ngay_dat) as int) thu_key,
  h.khach_id khach_key, k.khu_vuc khu_vuc_key, k.hang hang_khach_key,
  ct.ma_hang ma_hang_key, hh.nhom nhom_key, hn.nhom_id nhom_id_key,
  nd.nv_id nv_key, nv.phong_ban phong_ban_key, nv.cap_bac cap_bac_key,
  h.trang_thai trang_thai_key, (h.ngay_giao is not null) da_giao_key,
  ct.so_luong, ct.don_gia, ct.so_luong*ct.don_gia tien_hang
from don_hang_chi_tiet ct join don_hang h using (don_hang_id)
join khach_hang k using (khach_id) join hang_hoa hh using (ma_hang)
join hang_hoa_nhom hn using (ma_hang)
left join (select don_hang_id, min(nv_id) nv_id from nhan_vien_don group by 1) nd using (don_hang_id)
left join nhan_vien nv on nv.nv_id = nd.nv_id;

select count(*) so_cot_tong,
       count(*) filter (where column_name like '%_key') so_khoa_ngoai,
       count(*) filter (where column_name not like '%_key') so_cot_khac
from information_schema.columns where table_name='fct_con_ret';
```

Từng cột đều **có lý do hợp lý riêng** khi nó được thêm vào — đó chính là cách con rết
mọc chân. Không ai ngồi thiết kế một fact 19 khoá; nó lớn dần, mỗi sprint một cột, và
mỗi cột đều được biện minh bằng "báo cáo cần lọc theo quý".

Chú ý `left join` cho nhân viên kèm `min(nv_id)`: bảng `nhan_vien_don` là nhiều-nhiều
nên phải ép về một dòng, và **việc ép đó đã làm mất dữ liệu** — chỉ giữ nhân viên có mã
nhỏ nhất. Đó là triệu chứng phụ của con rết: cố nhét quan hệ nhiều-nhiều vào một khoá
ngoại.

</details>

### Bài C.2 — 19 khoá thật ra là 5 dimension

**Đề:** nhóm 19 khoá về các dimension thật mà chúng thuộc về.

**Đáp số phải ra:**

```text
┌───────────────┬──────────────┬────────────────────────────────────────────────────────────┐
│   dimension   │ khoa_bi_tach │                          cac_khoa                          │
├───────────────┼──────────────┼────────────────────────────────────────────────────────────┤
│ dim_ngay      │            8 │ ngay_dat, ngay_giao, ngay_nhan, nam, quy, thang, tuan, thu │
│ dim_khach     │            3 │ khach, khu_vuc, hang_khach                                 │
│ dim_hang_hoa  │            3 │ ma_hang, nhom, nhom_id                                     │
│ dim_nhan_vien │            3 │ nv, phong_ban, cap_bac                                     │
│ junk_don      │            2 │ trang_thai, da_giao                                        │
│ TONG          │           19 │ 19 khoa ngoai -> 5 dimension that                          │
└───────────────┴──────────────┴────────────────────────────────────────────────────────────┘
```

**19 → 5.** Và trong 5 đó, chỉ 3 là vai độc lập của `dim_ngay`.

<details>
<summary>Lời giải</summary>

```sql
select 'dim_ngay' dimension, 8 khoa_bi_tach,
       'ngay_dat, ngay_giao, ngay_nhan, nam, quy, thang, tuan, thu' cac_khoa
union all select 'dim_khach', 3, 'khach, khu_vuc, hang_khach'
union all select 'dim_hang_hoa', 3, 'ma_hang, nhom, nhom_id'
union all select 'dim_nhan_vien', 3, 'nv, phong_ban, cap_bac'
union all select 'junk_don', 2, 'trang_thai, da_giao'
union all select 'TONG', 19, '19 khoa ngoai -> 5 dimension that';
```

Ba kiểu "chân thừa", mỗi kiểu sinh ra từ một hiểu nhầm khác nhau:

**Kiểu 1 — thuộc tính bị nâng thành khoá.** `nam_key`, `quy_key`, `thang_key`,
`tuan_key`, `thu_key` đều là **cột của `dim_ngay`**, không phải dimension. Có
`ngay_dat_key` là truy được cả năm cột kia bằng một join. Đây là kiểu phổ biến nhất, và
là 5 trong 19 chân.

**Kiểu 2 — thuộc tính dimension bị kéo lên fact.** `khu_vuc_key`, `hang_khach_key` là
cột của `dim_khach`; `nhom_key`, `nhom_id_key` là cột của `dim_hang_hoa`;
`phong_ban_key`, `cap_bac_key` là cột của `dim_nhan_vien`. Sáu chân nữa.

Kiểu này còn tệ hơn kiểu 1 vì nó **phá Type 2**: `khu_vuc_key` trong fact là khu vực nào
— lúc đặt hàng hay hiện tại? Không ai trả lời được, vì nó được chép lúc nạp mà không ghi
lại theo phiên bản nào.

**Kiểu 3 — vai thật.** `ngay_dat`, `ngay_giao`, `ngay_nhan` là **role-playing hợp lệ** —
ba khoá cùng trỏ `dim_ngay` nhưng mang ba ý nghĩa khác nhau. Giữ nguyên.

Sau khi dọn, fact còn **6 khoá ngoại**: ba vai ngày, khách, mặt hàng, nhân viên, cộng
`junk_key`. Từ 19 xuống 7.

</details>

### Bài C.3 — Gỡ con rết, kiểm số không đổi

**Đề:** dựng `fct_sach` chỉ với 7 khoá ngoại, rồi chứng minh nó trả lời được **cùng** câu
hỏi mà con rết trả lời — doanh thu theo quý và phòng ban.

**Đáp số phải ra:**

```text
┌───────┬────────────┬───────────┐
│  quy  │ phong_ban  │ doanh_thu │
├───────┼────────────┼───────────┤
│     3 │ Kinh doanh │   7515000 │
│     3 │ Ho tro     │   2700000 │
└───────┴────────────┴───────────┘
```

Tổng hai dòng = **10.215.000**. Chú ý con số này chỉ đúng vì mọi đơn đều có nhân viên;
`nv_key` là `NULL` ở dòng nào là dòng đó rơi khỏi `inner join`.

<details>
<summary>Lời giải</summary>

```sql
-- fact sach: 7 khoa ngoai thay vi 19
create or replace table fct_sach as
select ct.don_hang_id, ct.dong,
  cast(strftime(h.ngay_dat,'%Y%m%d') as int) ngay_dat_key,
  coalesce(cast(strftime(h.ngay_giao,'%Y%m%d') as int),-1) ngay_giao_key,
  coalesce(cast(strftime(h.ngay_nhan,'%Y%m%d') as int),-1) ngay_nhan_key,
  h.khach_id khach_key, ct.ma_hang ma_hang_key, nd.nv_id nv_key,
  j.junk_key,
  ct.so_luong, ct.don_gia, ct.so_luong*ct.don_gia tien_hang
from don_hang_chi_tiet ct join don_hang h using (don_hang_id)
left join (select don_hang_id, min(nv_id) nv_id from nhan_vien_don group by 1) nd using (don_hang_id)
left join dim_junk_don j on j.trang_thai = h.trang_thai
                        and j.da_giao = (h.ngay_giao is not null)
                        and j.da_nhan = (h.ngay_nhan is not null)
                        and j.phi_cao = (h.phi_ship >= 60000);

-- cau hoi cu, tra loi bang join thay vi bang cot san
select d.quy, nv.phong_ban, sum(f.tien_hang) doanh_thu
from fct_sach f
join (select ngay_key, quarter(ngay) quy from dim_ngay) d on d.ngay_key = f.ngay_dat_key
join nhan_vien nv on nv.nv_id = f.nv_key
group by 1,2 order by 3 desc;
```

Cùng câu trả lời, **7 khoá thay vì 19**. Cái mất là hai join; cái được:

| | Con rết (19 khoá) | Sạch (7 khoá) |
|---|---|---|
| Rộng mỗi dòng | ~19 khoá | ~7 khoá |
| Đổi định nghĩa "quý tài chính" | sửa **cả fact** | sửa **1 dòng `dim_ngay`** |
| `khu_vuc` là as-was hay as-is | **không xác định** | do `khach_key` quyết định, rõ ràng |
| Thêm thuộc tính mới cho khách | thêm cột vào fact | thêm cột vào dim, fact không đụng |

Dòng thứ hai đáng giá nhất. Quý tài chính bắt đầu từ tháng 4 chứ không phải tháng 1 là
chuyện rất thường; với con rết thì `quy_key` đã đóng cứng trong 500 triệu dòng. Xem
[case study báo cáo quý tài chính lệch](../case-studies/bao-cao-quy-tai-chinh-lech.md).

</details>

### Bài C.4 — Ngưỡng nào là quá nhiều

**Đề:** không có SQL. Bao nhiêu khoá ngoại thì fact bị coi là con rết?

<details>
<summary>Lời giải</summary>

**Không có ngưỡng theo số lượng.** Fact 25 khoá vẫn có thể sạch nếu 25 dimension đó thật
sự độc lập; fact 8 khoá vẫn là con rết nếu 5 trong số đó là thuộc tính của cùng một
dimension.

Phép thử đúng là hỏi từng khoá **một** câu:

> *Khoá này có thể suy ra từ một khoá khác trong cùng fact không?*

Suy ra được → nó là **thuộc tính**, không phải dimension. Vứt đi.

```text
thang_key   suy ra tu ngay_dat_key   →  VUT
khu_vuc_key suy ra tu khach_key      →  VUT
ngay_giao   KHONG suy ra tu ngay_dat →  GIU (vai doc lap)
```

Ba dấu hiệu nhận biết sớm, trước cả khi đếm:

1. **Nhiều khoá cùng tiền tố** (`ngay_*`, `khach_*`, `sp_*`) — trừ role-playing thật.
2. **Khoá là mức tổng hợp của khoá khác** (`nam`, `quy`, `thang` cạnh `ngay`).
3. **Thêm cột vào fact mỗi lần có yêu cầu lọc mới** — dấu hiệu nghiệp vụ nhất, và là
   nguyên nhân gốc.

Dấu hiệu 3 quan trọng hơn hai cái kia: con rết là **triệu chứng của quy trình**, không
phải của thiết kế. Đội nào cũng thêm cột thay vì thêm thuộc tính vào dimension thì fact
sẽ mọc chân đều đặn, dù người thiết kế ban đầu làm đúng.

Xem [Centipede fact table](../skills/centipede-fact.md) và
[case study fact hai chục khoá ngoại](../case-studies/fact-hai-chuc-khoa-ngoai.md).

</details>

---

## Bộ D — Thiết kế thuộc tính dimension

### Bài D.1 — Mã bí hiểm thành chữ đọc được

**Đề:** với `don_hang.trang_thai`, sinh thêm hai cột: mô tả đầy đủ và nhóm báo cáo cấp
cao hơn.

**Đáp số phải ra:**

```text
┌────────────┬────────┬──────────────────────┬──────────────┐
│ trang_thai │ so_don │        mo_ta         │ nhom_bao_cao │
├────────────┼────────┼──────────────────────┼──────────────┤
│ hoan_thanh │      6 │ Da giao thanh cong   │ Da chot      │
│ dang_giao  │      2 │ Dang van chuyen      │ Chua chot    │
│ moi        │      2 │ Moi tao - chua xu ly │ Chua chot    │
└────────────┴────────┴──────────────────────┴──────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select trang_thai, count(*) so_don,
       case trang_thai when 'moi' then 'Moi tao - chua xu ly'
                       when 'dang_giao' then 'Dang van chuyen'
                       when 'hoan_thanh' then 'Da giao thanh cong' end mo_ta,
       case when trang_thai='hoan_thanh' then 'Da chot' else 'Chua chot' end nhom_bao_cao
from don_hang group by 1 order by 2 desc;
```

Hai cột thêm vào giải quyết hai vấn đề khác nhau:

**`mo_ta`** để người đọc không phải đoán. `dang_giao` với `moi` còn suy được; nhưng dữ
liệu thật đầy mã kiểu `ST_03`, `PND`, `X`. Người viết code biết, người đọc báo cáo thì
không, và họ sẽ đoán sai.

**`nhom_bao_cao`** là *rollup* — nhiều mã gom về một nhóm. Đây là thứ để ban giám đốc
nhìn "đã chốt / chưa chốt" mà không cần biết có ba trạng thái.

**Điểm mấu chốt: cả hai cột phải nằm trong `dim`, không phải trong query.** Viết
`case when` trong từng báo cáo thì mỗi báo cáo một cách gom, và sáu tháng sau có bốn định
nghĩa "đã chốt" khác nhau. Để trong dimension thì chỉ có một, và sửa một chỗ.

Đó là lý do dimension nên **rộng và nhiều cột mô tả**. Dimension 50 cột là bình thường
và tốt; nó vẫn nhỏ vì ít dòng.

</details>

### Bài D.2 — Cờ phải là chữ, không phải `true`/`false`

**Đề:** so hai cách biểu diễn cùng một cờ, rồi nhóm doanh thu theo nó.

**Đáp số phải ra:**

```text
┌──────────────┬────────────────────┬────────┬───────────┐
│ dang_boolean │    dang_chu        │ so_don │ doanh_thu │
├──────────────┼────────────────────┼────────┼───────────┤
│ true         │ Da giao            │      8 │   8445000 │
│ false        │ Chua giao          │      2 │   1770000 │
└──────────────┴────────────────────┴────────┴───────────┘
```

<details>
<summary>Lời giải</summary>

```sql
with t as (
  select h.don_hang_id, h.ngay_giao is not null dang_boolean,
         case when h.ngay_giao is not null then 'Da giao' else 'Chua giao' end dang_chu,
         sum(ct.so_luong*ct.don_gia) tien
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1,2,3)
select dang_boolean, dang_chu, count(*) so_don, sum(tien) doanh_thu
from t group by 1,2 order by 1 desc;
```

Ba lý do dùng chữ, xếp theo mức độ nghiêm trọng:

**1. Bộ lọc BI hiện đúng thứ người dùng cần chọn.** Danh sách `true`/`false` buộc người
dùng phải nhớ `true` nghĩa là gì cho **từng** cột. Với 10 cột cờ trong một dimension, đó
là 10 quy ước phải nhớ.

**2. Đảo nghĩa cột là lỗi câm.** Đổi `da_giao` thành `chua_giao` mà quên đảo giá trị thì
mọi báo cáo sai 100% và **không có gì thay đổi trên màn hình** — vẫn là `true`/`false`.
Với chữ, `'Da giao'` nằm ở dòng sai là thấy ngay.

**3. Ba trạng thái, không phải hai.** `boolean` không có chỗ cho "không xác định".
`ngay_giao is null` nghĩa là *chưa giao*, hay *đã giao nhưng chưa ghi nhận*? Với chữ thì
thêm `'Khong ro'` là xong; với `boolean` thì phải cho phép `NULL`, và `NULL` kéo theo
toàn bộ vấn đề của bộ E.

Quy ước thực dụng: cột cờ đặt tên theo **câu hỏi**, giá trị là **câu trả lời**:

```text
trang_thai_giao_hang : 'Da giao' | 'Chua giao' | 'Khong ro'
```

</details>

### Bài D.3 — Nhiều cây phân cấp trong một dimension

**Đề:** `dim_hang_hoa` cần **hai** cây phân cấp song song: cây nhóm sản phẩm
(`cay_nhom_hang`) và cây theo giá (`Cao cap` / `Pho thong`). Dựng dimension có cả hai và
tính doanh thu theo từng cây.

**Đáp số phải ra:**

```text
┌─────────┬──────────────────┬───────────────────┬───────────┬───────────┐
│ ma_hang │     ten_hang     │   nhom_san_pham   │ phan_khuc │ doanh_thu │
├─────────┼──────────────────┼───────────────────┼───────────┼───────────┤
│ SP-A    │ Bàn phím cơ      │ Thiet bi nhap     │ Pho thong │   3300000 │
│ SP-B    │ Màn hình 24 inch │ Man hinh          │ Pho thong │   3000000 │
│ SP-C    │ Laptop 14 inch   │ Laptop van phong  │ Cao cap   │   3600000 │
│ SP-D    │ Chuột không dây  │ Thiet bi ngoai vi │ Pho thong │    315000 │
└─────────┴──────────────────┴───────────────────┴───────────┴───────────┘
```

Tổng = **10.215.000**.

<details>
<summary>Lời giải</summary>

```sql
select hh.ma_hang, hh.ten_hang, cn.ten_nhom nhom_san_pham,
       case when max(ct.don_gia) >= 500000 then 'Cao cap' else 'Pho thong' end phan_khuc,
       sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang_chi_tiet ct
join hang_hoa hh using (ma_hang)
join hang_hoa_nhom hn using (ma_hang)
join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id
group by 1,2,3 order by 1;
```

Hai cây **cùng tồn tại trong một dimension**, không mâu thuẫn, vì chúng là hai cách nhóm
độc lập của cùng một tập mặt hàng:

```text
Cay san pham : Cong nghe > May tinh > Laptop > Laptop van phong
Cay phan khuc: Cao cap | Pho thong
```

Đây là chỗ nhiều người sai: thấy hai cây thì tách hai dimension. Tách ra là **sai**, vì
cả hai đều mô tả *mặt hàng* — grain của chúng giống hệt nhau. Hai dimension cùng grain là
hai bảng phải giữ đồng bộ mà không được lợi gì.

Dimension thật thường có 3–5 cây song song: nhóm sản phẩm, phân khúc giá, nhà cung cấp,
vòng đời (mới/đang bán/ngừng), nhóm marketing. Mỗi cây là vài cột, tất cả trong một bảng.

**Cái phải cẩn thận:** ngưỡng `500000` trong `case when` là ngưỡng nghiệp vụ được chôn
vào code. Nếu nó hay đổi, nó phải là **bảng tra**, không phải hằng số — cùng một lý do
với ngưỡng `phi_cao` ở bài A.3.

</details>

### Bài D.4 — Thuộc tính rỗng: `Khong xac dinh`, không phải `NULL`

**Đề:** đếm số mặt hàng theo nhóm, dùng `left join` để giữ cả mặt hàng chưa được gán
nhóm, và thay `NULL` bằng chữ.

**Đáp số phải ra:**

```text
┌───────────────────┬─────────┐
│       nhom        │ so_hang │
├───────────────────┼─────────┤
│ Laptop van phong  │       1 │
│ Man hinh          │       1 │
│ Thiet bi ngoai vi │       1 │
│ Thiet bi nhap     │       1 │
└───────────────────┴─────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select coalesce(cn.ten_nhom, 'Khong xac dinh') nhom, count(*) so_hang
from hang_hoa hh
left join hang_hoa_nhom hn using (ma_hang)
left join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id
group by 1 order by 2 desc, 1;
```

Ở dữ liệu này cả 4 mặt hàng đều có nhóm nên `Khong xac dinh` chưa xuất hiện. Thử bỏ một
dòng khỏi `hang_hoa_nhom` là thấy nó hiện ra ngay — và **đó mới là điều cần chứng minh**:
mặt hàng chưa gán nhóm vẫn được đếm.

Luật cho mọi thuộc tính dimension: **không bao giờ để `NULL`**. Thay bằng chữ, và chọn
chữ theo **lý do** rỗng:

| Chữ thay thế | Nghĩa |
|---|---|
| `Khong xac dinh` | có giá trị nhưng ta chưa biết |
| `Khong ap dung` | thuộc tính này không có nghĩa với dòng này |
| `Chua gan` | đang chờ nghiệp vụ điền |

Phân biệt ba trường hợp này quan trọng vì cách xử lý khác nhau: `Chua gan` là việc phải
làm, `Khong ap dung` thì không.

Vì sao không để `NULL`: nó biến mất khỏi bộ lọc BI, làm hỏng `group by` ở một số công cụ,
và kéo theo toàn bộ logic ba trị của bộ E. Trong **fact** thì `NULL` ở số đo lại chấp
nhận được — phân biệt này là nội dung bài E.1.

</details>

### Bài D.5 — Drill down không cần đổi câu truy vấn

**Đề:** viết **một** câu duy nhất trả về doanh thu ở **cả ba** mức — toàn bộ, theo nhóm,
theo mặt hàng — dùng `grouping sets`.

**Đáp số phải ra:**

```text
┌───────────────────┬─────────┬───────────┬──────────┐
│       nhom        │ ma_hang │ doanh_thu │   muc    │
├───────────────────┼─────────┼───────────┼──────────┤
│ Laptop van phong  │ SP-C    │   3600000 │ mat hang │
│ Man hinh          │ SP-B    │   3000000 │ mat hang │
│ Thiet bi ngoai vi │ SP-D    │    315000 │ mat hang │
│ Thiet bi nhap     │ SP-A    │   3300000 │ mat hang │
│ Laptop van phong  │ NULL    │   3600000 │ nhom     │
│ Man hinh          │ NULL    │   3000000 │ nhom     │
│ Thiet bi ngoai vi │ NULL    │    315000 │ nhom     │
│ Thiet bi nhap     │ NULL    │   3300000 │ nhom     │
│ NULL              │ NULL    │  10215000 │ tong     │
└───────────────────┴─────────┴───────────┴──────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select cn.ten_nhom nhom, ct.ma_hang, sum(ct.so_luong*ct.don_gia) doanh_thu,
       case when grouping(cn.ten_nhom)=1 then 'tong'
            when grouping(ct.ma_hang)=1 then 'nhom'
            else 'mat hang' end muc
from don_hang_chi_tiet ct
join hang_hoa_nhom hn using (ma_hang)
join cay_nhom_hang cn on cn.nhom_id = hn.nhom_id
group by grouping sets ((), (cn.ten_nhom), (cn.ten_nhom, ct.ma_hang))
order by muc, nhom;
```

Dòng `tong` = **10.215.000**, và tổng bốn dòng `nhom` cũng bằng đúng số đó. Đây là phép
kiểm miễn phí: nếu ba mức không cộng khớp thì cây phân cấp có mặt hàng bị gán hai nhóm,
hoặc có mặt hàng không nhóm nào.

`grouping sets` cho phép **một** truy vấn phục vụ cả ba mức, thay vì ba truy vấn hoặc ba
bảng tổng hợp. Với BI, đó là dữ liệu cho một biểu đồ có thể bấm để đi sâu mà không phải
gọi lại backend.

`grouping(cot)` trả 1 khi cột đó **bị gộp** ở dòng này — đó là cách duy nhất phân biệt
"NULL vì đang tổng hợp" với "NULL vì dữ liệu rỗng". Không có cột `muc`, hai loại `NULL`
đó lẫn vào nhau và người đọc không phân biệt được.

Xem [Thiết kế thuộc tính dimension](../skills/dimension-attribute-design.md) và
[Cây phân cấp](../skills/hierarchy.md) — luyện kỹ ở [bộ 4](bt-04-quan-he-va-cay.md).

</details>

---

## Bộ E — NULL trong fact và dimension

### Bài E.1 — Một cột, năm phép đếm, năm kết quả

**Đề:** với `giao_dich_tai_chinh.phi_giao_dich` (9 trên 12 dòng là `NULL`), tính: số
dòng, số dòng có giá trị, tổng, trung bình theo SQL, và trung bình nếu coi `NULL` là 0.

**Đáp số phải ra:**

```text
┌─────────┬────────────┬────────┬────────────┬──────────────────┐
│ so_dong │ co_gia_tri │  tong  │ tb_bo_null │ tb_coi_null_la_0 │
├─────────┼────────────┼────────┼────────────┼──────────────────┤
│      12 │          3 │  77000 │    25666.7 │           6416.7 │
└─────────┴────────────┴────────┴────────────┴──────────────────┘
```

**25.666,7 hay 6.416,7?** Chênh **4 lần**, và cả hai đều gọi là "phí giao dịch trung
bình".

<details>
<summary>Lời giải</summary>

```sql
select count(*) so_dong, count(phi_giao_dich) co_gia_tri, sum(phi_giao_dich) tong,
       round(avg(phi_giao_dich),1) tb_bo_null,
       round(sum(phi_giao_dich)*1.0/count(*),1) tb_coi_null_la_0
from giao_dich_tai_chinh;
```

Hai chi tiết SQL phải thuộc:

**`count(*)` đếm dòng, `count(cot)` đếm giá trị không `NULL`.** 12 so với 3. Đây là nguồn
sai lệch mẫu số phổ biến nhất trong mọi báo cáo.

**`avg()` bỏ qua `NULL` ở cả tử lẫn mẫu.** `avg` = 77.000/3, không phải 77.000/12. SQL
không hỏi bạn có muốn thế không.

Con số nào đúng phụ thuộc `NULL` **nghĩa là gì**:

| `NULL` nghĩa là | Số đúng | Vì |
|---|---|---|
| "Giao dịch này **không có** phí" | 6.416,7 | không có phí = phí 0 |
| "Phí **chưa biết**" | 25.666,7 | không được bịa 0 cho cái chưa biết |

Ở bảng này, `nap_tien` và `gui_tiet_kiem` **thật sự không có** phí — nên 6.416,7 là số
đúng cho câu "phí trung bình mỗi giao dịch", còn 25.666,7 đúng cho "phí trung bình mỗi
giao dịch **có tính phí**".

**Luật cho fact:** số đo mà `NULL` nghĩa là "không có" thì **để 0 ngay lúc nạp**. Để
`NULL` là bắt mọi người đọc phải tự đoán, và họ sẽ đoán khác nhau.

Chỉ giữ `NULL` khi nó thật sự nghĩa là "chưa biết" — và khi đó phải ghi rõ trong tài
liệu bảng.

</details>

### Bài E.2 — Bộ lọc âm thầm nuốt 9 dòng

**Đề:** đếm số dòng thoả `phi_giao_dich <> 22000`, số thoả `= 22000`, và số `NULL`.
Chứng minh ba số **không** cộng lại thành tổng.

**Đáp số phải ra:**

```text
┌────────┬────────────┬────────────┬─────────┐
│ tat_ca │ khac_22000 │ bang_22000 │ la_null │
├────────┼────────────┼────────────┼─────────┤
│     12 │          2 │          1 │       9 │
└────────┴────────────┴────────────┴─────────┘
```

**2 + 1 = 3, không phải 12.** Chín dòng không thuộc nhóm nào.

<details>
<summary>Lời giải</summary>

```sql
select (select count(*) from giao_dich_tai_chinh) tat_ca,
       (select count(*) from giao_dich_tai_chinh where phi_giao_dich <> 22000) khac_22000,
       (select count(*) from giao_dich_tai_chinh where phi_giao_dich = 22000) bang_22000,
       (select count(*) from giao_dich_tai_chinh where phi_giao_dich is null) la_null;
```

`NULL <> 22000` không trả `TRUE`, cũng không trả `FALSE` — nó trả **`UNKNOWN`**. Và
`WHERE` chỉ giữ dòng khi điều kiện là `TRUE`. Nên 9 dòng `NULL` **bị loại khỏi cả hai
nhánh**.

Trực giác thông thường nói "khác 22000" là phần bù của "bằng 22000". SQL nói không:

```text
bang_22000  ∪  khac_22000  ≠  tat_ca
3           ≠  12
```

Đây là dạng nguy hiểm nhất vì nó **im lặng và có vẻ hợp lý**. Báo cáo "giao dịch phí bất
thường" lọc `<> 22000` sẽ ra 2 dòng, và không ai nghi ngờ con số 2.

Viết đúng, ba cách:

```sql
where phi_giao_dich is distinct from 22000        -- 11 dong, coi NULL la khac
where coalesce(phi_giao_dich, -1) <> 22000        -- 11 dong, ro y do
where phi_giao_dich <> 22000 or phi_giao_dich is null  -- 11 dong, dai nhung ro nhat
```

Cả ba ra **11**, và 11 + 1 = 12. Khép kín.

Xem [case study lọc khác huỷ mất một phần tư](../case-studies/loc-khac-huy-mat-mot-phan-tu.md).

</details>

### Bài E.3 — `NOT IN` trả về 0 dòng

**Đề:** đếm số đơn hàng **không** có giao dịch tài chính nào, bằng ba cách: `not in`,
`not in` có lọc `NULL`, và `not exists`.

**Đáp số phải ra:**

```text
┌────────────────┬───────────────┬─────────────────┐
│ not_in_co_null │ not_in_da_loc │ dung_not_exists │
├────────────────┼───────────────┼─────────────────┤
│              0 │             7 │               7 │
└────────────────┴───────────────┴─────────────────┘
```

**`NOT IN` trả 0 khi đáp án đúng là 7.** Không phải sai lệch — sai hoàn toàn.

<details>
<summary>Lời giải</summary>

```sql
select
  (select count(*) from don_hang
    where don_hang_id not in (select don_hang_id from giao_dich_tai_chinh)) not_in_co_null,
  (select count(*) from don_hang
    where don_hang_id not in (select don_hang_id from giao_dich_tai_chinh
                              where don_hang_id is not null)) not_in_da_loc,
  (select count(*) from don_hang h
    where not exists (select 1 from giao_dich_tai_chinh g
                      where g.don_hang_id = h.don_hang_id)) dung_not_exists;
```

`giao_dich_tai_chinh` có 9 dòng `don_hang_id` là `NULL` (nạp tiền, rút tiền, gửi tiết
kiệm không gắn đơn nào). `NOT IN` với tập chứa `NULL` **luôn** trả rỗng, vì:

```text
'DH001' not in ('DH002', NULL, ...)
  = 'DH001' <> 'DH002'  AND  'DH001' <> NULL  AND ...
  = TRUE                AND  UNKNOWN          AND ...
  = UNKNOWN                                     ← khong bao gio TRUE
```

Chỉ **một** `NULL` trong tập con là đủ để giết toàn bộ kết quả. Và 9 `NULL` hay 1 `NULL`
thì hậu quả y hệt.

Đáng sợ ở chỗ: query chạy trong 5ms, không lỗi, trả về `0`. Và `0` là một câu trả lời
**hoàn toàn hợp lý** cho câu hỏi "có bao nhiêu đơn chưa thanh toán" — nên không ai kiểm
lại.

**Quy tắc thực dụng: đừng dùng `NOT IN` với subquery. Dùng `NOT EXISTS`.**

`NOT EXISTS` xử lý `NULL` đúng vì nó hỏi "có dòng nào khớp không", và `NULL = 'DH001'`
không khớp. `LEFT JOIN ... WHERE ... IS NULL` cũng đúng và thường nhanh hơn trên engine
phân tán.

</details>

### Bài E.4 — `NULL` không join được với `NULL`

**Đề:** tự join `don_hang` trên `ngay_giao` bằng `=` và bằng `is not distinct from`. So
số dòng.

**Đáp số phải ra:**

```text
┌───────────┬──────────────────────┐
│ join_bang │ join_is_not_distinct │
├───────────┼──────────────────────┤
│        10 │                   14 │
└───────────┴──────────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select (select count(*) from don_hang a join don_hang b
          on a.ngay_giao = b.ngay_giao) join_bang,
       (select count(*) from don_hang a join don_hang b
          on a.ngay_giao is not distinct from b.ngay_giao) join_is_not_distinct;
```

`=` bỏ hẳn 2 đơn chưa giao (`DH006`, `DH009`); `is not distinct from` coi
`NULL = NULL` là khớp nên 2 đơn đó khớp với nhau **và với chính chúng** → 2 × 2 = 4 dòng
thêm vào.

Hai kết luận trái ngược, cả hai đều có thể là cái bạn muốn:

| Toán tử | `NULL` khớp `NULL`? | Dùng khi |
|---|---|---|
| `=` | Không | join khoá ngoại — **mặc định đúng** |
| `is not distinct from` | Có | so sánh phiên bản, phát hiện thay đổi |

Trong nạp dữ liệu, cả hai đều cần, ở hai chỗ khác nhau:

```sql
-- JOIN khoa ngoai: dung '=' (NULL khong nen khop gi ca)
left join dim_khach d on d.khach_id = f.khach_id

-- SO SANH doi/khong doi: dung 'is distinct from' (bo 2 SCD da luyen)
case when lag(khu_vuc) over w is distinct from khu_vuc then 1 else 0 end
```

Dùng `<>` ở dòng thứ hai là **bỏ sót mọi thay đổi liên quan tới `NULL`** — cột từ rỗng
thành có giá trị sẽ không sinh phiên bản Type 2 mới. Đây đúng là bẫy của
[bộ 1 bài C.2](bt-01-nen-tang.md#bài-c2--dựng-dimension-type-2-từ-bản-trích-hàng-ngày).

</details>

### Bài E.5 — `NULL` ở đâu được phép, ở đâu cấm

**Đề:** không có SQL. Lập bảng: `NULL` được phép ở vị trí nào trong mô hình chiều.

<details>
<summary>Lời giải</summary>

| Vị trí | `NULL` được phép? | Thay bằng | Vì sao |
|---|---|---|---|
| **Khoá ngoại trong fact** | **Cấm tuyệt đối** | khoá `-1` | join mất dòng, `count` tụt, không lọc được |
| **Số đo trong fact — "không có"** | Không nên | `0` | `avg`/`sum` cho hai kết quả khác nhau (bài E.1) |
| **Số đo trong fact — "chưa biết"** | **Được** | giữ `NULL` | `0` là bịa số; `avg` bỏ qua là hành vi đúng |
| **Thuộc tính dimension** | Không nên | `'Khong xac dinh'` | biến mất khỏi bộ lọc BI (bài D.4) |
| **Khoá chính dimension** | **Cấm tuyệt đối** | — | không phải khoá nữa |
| **`hieu_luc_den` của Type 2** | Không nên | `9999-12-31` | `between` không bắt được `NULL` |

Dòng thứ hai và thứ ba trông mâu thuẫn nhưng không phải — chúng phân biệt theo **ý
nghĩa**, và đó là toàn bộ vấn đề: `NULL` trong SQL gộp chung *"không có"*, *"chưa biết"*,
*"không áp dụng"* thành một ký hiệu. Mô hình chiều tách chúng ra bằng cách **quy ước
trước, ghi lại, và cưỡng chế bằng test**.

Ba test đáng đặt cho mọi fact table:

```sql
-- 1. khong khoa ngoai nao NULL
select count(*) from fct_ban_hang where khach_key is null or ngay_dat_key is null;

-- 2. khong khoa ngoai nao mo coi (tro toi dong khong ton tai)
select count(*) from fct_ban_hang f
left join dim_khach_t2 d on d.khach_key = f.khach_key where d.khach_key is null;

-- 3. ty le -1 khong vuot nguong
select round(100.0*count(*) filter (where khach_key = -1)/count(*),2) ty_le_mo_coi
from fct_ban_hang;
```

Test 3 quan trọng nhất và hay bị bỏ: `-1` đúng là chỗ chứa hợp lệ, nhưng `-1` **tăng dần**
là dấu hiệu pipeline dimension đang hỏng. Không đo thì không biết.

Xem [NULL trong fact và dimension](../skills/null-handling.md).

</details>

---

## Bảng đối chiếu nhanh

| Số | Nghĩa | Bài |
|---|---|---|
| 4 / 24 | tổ hợp cờ thực tế so với lý thuyết | A.2 |
| 9 / 4 / 24 / 60 | bốn cách lưu cờ, bốn chi phí | A.4 |
| 10 = 10, tỷ lệ 1:1 | bằng chứng `don_hang_id` là degenerate | B.1 |
| 1.021.500 vs 681.000 | mất degenerate là sai mẫu số 33% | B.2 |
| 19 → 5 dimension | con rết: 19 khoá thuộc 5 dimension thật | C.2 |
| 25.666,7 vs 6.416,7 | `avg` bỏ `NULL` so với coi `NULL` là 0 | E.1 |
| 2 + 1 ≠ 12 | bộ lọc `<>` nuốt 9 dòng `NULL` | E.2 |
| **0 thay vì 7** | `NOT IN` gặp `NULL` trả rỗng | E.3 |
| 10 vs 14 | `=` so với `is not distinct from` | E.4 |

## Related Topics

- [Bài tập bộ 2 — Dimension theo thời gian](bt-02-dimension-thoi-gian.md) — bộ trước
- [Bài tập bộ 4 — Quan hệ và cây](bt-04-quan-he-va-cay.md) — bộ tiếp theo
- [Phụ lục seed](bt-00-seed.md) — `giao_dich_tai_chinh` và rừng `NULL`
- [Kỹ năng — Data Modeling](../skills/index.md) — lý thuyết của năm kỹ thuật trên
