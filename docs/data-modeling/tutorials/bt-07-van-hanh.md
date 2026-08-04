---
title: "Bài tập bộ 7 — Vận hành: date dimension, audit, real-time"
sidebar_position: 16
description: "14 bài tự viết: dòng -1 của dim_ngay, nạp trùng phồng 45,5% và phải xoá 10 dòng để diệt 5, ngày hôm nay chưa đầy kéo trung bình xuống 4,4%."
tags: [tutorial, bai-tap, date-dimension, audit-dimension, real-time-fact, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Bài tập bộ 7 — Vận hành

> **Chốt:** sáu bộ trước lo **mô hình đúng**. Bộ này lo **mô hình đúng vẫn cho số sai khi
> chạy thật** — vì lịch là dữ liệu chứ không phải hàm, vì job chạy hai lần, và vì hôm nay
> chưa hết mà đã bị đếm là một ngày đủ.

## Kỹ thuật được luyện trong bộ này

| # | Kỹ thuật | Tài liệu gốc | Số bài |
|---|---|---|---|
| 1 | Date dimension | [Date dimension](../reference/date-dimension.md) | 5 |
| 2 | Audit dimension | [Audit dimension](../skills/audit-dimension.md) | 5 |
| 3 | Real-time fact table | [Real-time fact table](../skills/real-time-fact.md) | 4 |

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Bộ này dùng `dim_ngay` (dựng ở [lab 1](star-schema-duckdb.md)), `kho_hang` (**có một dòng
lệch lan sang ngày sau**) và `su_kien_web` (**ngày 05/07 cắt lúc 10:00**). Xem
[phụ lục seed](bt-00-seed.md).

---

## Bộ A — Date dimension

### Bài A.1 — Dòng `-1` trong `dim_ngay`

**Đề:** tìm dòng đặc biệt trong `dim_ngay` và giải thích nó tồn tại để làm gì.

**Đáp số phải ra:**

```text
┌──────────┬──────┬───────┬──────────────────┐
│ ngay_key │ ngay │ thang │ la_ngay_lam_viec │
├──────────┼──────┼───────┼──────────────────┤
│       -1 │ NULL │  NULL │ NULL             │
└──────────┴──────┴───────┴──────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select * from dim_ngay where thang is null;
```

Đây là **unknown member**, và nó phải tồn tại từ ngày đầu tiên của `dim_ngay`. Lý do:
`don_hang` có 2 đơn chưa giao (`ngay_giao` rỗng), và fact **không được phép** có khoá
ngoại `NULL`.

Chuỗi hệ quả nếu không có nó:

```text
ngay_giao_key = NULL
  → join dim_ngay mat dong (bo 1 bai C.4)
  → count(*) tren fact tut ma khong ai biet
  → "don dang giao" bien mat khoi moi bao cao
```

Một chi tiết dễ sai: các cột **mô tả** của dòng `-1` nên là chữ, không phải `NULL`:

```sql
-- tot hon
insert into dim_ngay values (-1, null, null, null, 'Chua giao', 'Khong xac dinh');
```

Cột `ngay` để `NULL` là đúng (không có ngày nào cả), nhưng cột hiển thị nên có chữ để báo
cáo hiện *"Chưa giao"* thay vì ô trống. Người đọc phân biệt được "chưa giao" với "lỗi dữ
liệu".

Nhiều kho dữ liệu dùng nhiều dòng đặc biệt, mỗi dòng một lý do:

| Khoá | Nghĩa |
|---|---|
| `-1` | Chưa xảy ra (chưa giao, chưa nhận) |
| `-2` | Không áp dụng (đơn huỷ thì không có ngày giao) |
| `-3` | Lỗi dữ liệu nguồn (ngày không parse được) |

Ba khoá thay vì một cho phép **đếm riêng từng loại**, và `-3` tăng đột biến là tín hiệu
nguồn đang hỏng.

</details>

### Bài A.2 — Ngày làm việc là dữ liệu, không phải hàm

**Đề:** đếm số ngày, ngày làm việc và ngày nghỉ theo tháng trong `dim_ngay`.

**Đáp số phải ra:**

```text
┌───────┬─────────┬───────────────┬───────────┐
│ thang │ so_ngay │ ngay_lam_viec │ ngay_nghi │
├───────┼─────────┼───────────────┼───────────┤
│     7 │      31 │            23 │         8 │
│     8 │      31 │            21 │        10 │
│  NULL │       1 │             0 │         0 │
└───────┴─────────┴───────────────┴───────────┘
```

Dòng `NULL` chính là dòng `-1` của bài A.1 — nhớ loại nó khi tính tổng.

<details>
<summary>Lời giải</summary>

```sql
select thang, count(*) so_ngay,
       count(*) filter (where la_ngay_lam_viec) ngay_lam_viec,
       count(*) filter (where not la_ngay_lam_viec) ngay_nghi
from dim_ngay group by 1 order by 1;
```

Tháng 7 có **23** ngày làm việc, tháng 8 có **21**. Không hàm SQL nào tính ra được hai
con số đó, vì chúng phụ thuộc:

- Cuối tuần — suy được từ ngày.
- **Ngày lễ quốc gia** — không suy được, khác nhau theo nước.
- **Ngày nghỉ riêng của công ty** — càng không suy được.
- **Lịch nghỉ bù** — quy tắc phức tạp, đổi theo năm.

Đó là toàn bộ lý do `dim_ngay` phải là **bảng**. Viết `dayofweek(ngay) not in (0,6)` là
đúng cho cuối tuần và sai cho mọi thứ còn lại — và cái sai đó **không lộ ra** cho tới khi
ai đó tính SLA giao hàng qua dịp lễ.

Bảng `dim_ngay` thật nên có 20–40 cột, tất cả đều là **dữ liệu tra sẵn**:

```text
ngay_key, ngay, thu, tuan_trong_nam, thang, ten_thang, quy,
quy_tai_chinh, nam_tai_chinh, la_ngay_lam_viec, la_ngay_le,
ten_ngay_le, ngay_lam_viec_thu_may_trong_thang, la_cuoi_thang,
la_cuoi_quy, ngay_truoc_do_cung_ky, ...
```

Mỗi cột ở đây là một `case when` **không** phải viết lại trong hàng trăm truy vấn. Đó là
dimension duy nhất mà "càng nhiều cột càng tốt" gần như luôn đúng — nó chỉ có vài nghìn
dòng.

**Dựng trước 5–10 năm**, đừng sinh theo nhu cầu. Fact có ngày nằm ngoài phạm vi
`dim_ngay` là rơi vào `-1`, và không ai để ý cho tới khi sang năm mới.

</details>

### Bài A.3 — Ngày không có giao dịch vẫn phải xuất hiện

**Đề:** liệt kê doanh thu từ 01/07 đến 08/07, **kể cả** ngày không bán được gì.

**Đáp số phải ra:**

```text
┌────────────┬───────────┐
│    ngay    │ doanh_thu │
├────────────┼───────────┤
│ 2026-07-01 │   1350000 │
│ 2026-07-02 │   3150000 │
│ 2026-07-03 │   4200000 │
│ 2026-07-04 │   1095000 │
│ 2026-07-05 │    420000 │
│ 2026-07-06 │         0 │
│ 2026-07-07 │         0 │
│ 2026-07-08 │         0 │
└────────────┴───────────┘
```

**Tám dòng, không phải năm.**

<details>
<summary>Lời giải</summary>

```sql
select d.ngay, coalesce(sum(ct.so_luong*ct.don_gia), 0) doanh_thu
from dim_ngay d
left join don_hang_chi_tiet ct on ct.ngay = d.ngay
where d.ngay between date '2026-07-01' and date '2026-07-08'
group by 1 order by 1;
```

`dim_ngay` **đi trước** trong `left join` — đó là điểm mấu chốt. Query bắt đầu từ fact sẽ
chỉ ra 5 dòng, và ba ngày không bán được gì **biến mất khỏi biểu đồ**.

Hậu quả cụ thể, không phải lý thuyết:

| Phép tính | Từ 5 dòng | Từ 8 dòng | Đúng |
|---|---|---|---|
| Doanh thu trung bình/ngày | 2.043.000 | 1.276.875 | tuỳ câu hỏi |
| Biểu đồ đường | **liền mạch, che mất 3 ngày trống** | có 3 điểm 0 rõ ràng | 8 dòng |
| "Có ngày nào không bán được gì?" | không trả lời được | trả lời được | 8 dòng |

Biểu đồ đường là chỗ nguy hiểm nhất: nối 05/07 thẳng sang 09/07 trông y hệt một đường
giảm dần bình thường, và **không có gì trên hình chỉ ra ba ngày đã bị bỏ qua**.

Đây là ứng dụng phổ biến nhất của `dim_ngay`, và cũng là lý do nó phải phủ **liên tục**
mọi ngày — không được có lỗ hổng.

Với các chiều khác, kỹ thuật tương đương là `cross join` hai dimension rồi `left join`
fact:

```sql
select k.khu_vuc, h.nhom, coalesce(sum(f.tien_hang),0) doanh_thu
from (select distinct khu_vuc from khach_hang) k
cross join (select distinct nhom from hang_hoa) h
left join ... group by 1,2;
```

Đó là cách hiện đủ 9 tổ hợp thay vì 5 như
[bộ 1 bài D.1](bt-01-nen-tang.md#bài-d1--cùng-một-câu-hỏi-ba-cách-bố-trí).

</details>

### Bài A.4 — Quý tài chính không phải quý lịch

**Đề:** không có SQL bắt buộc. Công ty có năm tài chính bắt đầu từ **tháng 4**. Vì sao
`quarter(ngay)` là sai, và sửa thế nào?

<details>
<summary>Lời giải</summary>

```sql
-- SAI: quy lich
select quarter(ngay) quy from dim_ngay;    -- thang 7 -> quy 3

-- DUNG: cot tra san trong dim_ngay
alter table dim_ngay add column quy_tai_chinh int;
alter table dim_ngay add column nam_tai_chinh int;
update dim_ngay set
  quy_tai_chinh = ((month(ngay) - 4 + 12) % 12) / 3 + 1,
  nam_tai_chinh = case when month(ngay) >= 4 then year(ngay) else year(ngay) - 1 end
where ngay is not null;
```

Với năm tài chính bắt đầu tháng 4: tháng 7 thuộc **quý 2** tài chính, không phải quý 3.
Chênh **một quý** trên mọi báo cáo tài chính.

Ba lý do phải để thành cột trong `dim_ngay` thay vì viết công thức mỗi lần:

**1. Công thức dễ sai và sai im lặng.** `((month - 4 + 12) % 12) / 3 + 1` là biểu thức
không ai kiểm bằng mắt được. Viết nó ở 50 chỗ là 50 cơ hội sai.

**2. Quy tắc đổi được.** Công ty đổi năm tài chính sang tháng 1, hoặc mua lại công ty
khác có năm tài chính khác. Sửa một bảng, không sửa 50 truy vấn.

**3. Không phải mọi năm tài chính đều chia đều theo tháng.** Lịch 4-4-5 của bán lẻ chia
quý thành các tuần 4-4-5, và **không có công thức nào** từ ngày ra quý — nó là bảng tra
thuần tuý.

Điểm 3 là lý do quyết định: chừng nào còn tin rằng "quý tính được từ ngày", bạn còn chưa
gặp lịch bán lẻ.

Xem [case study báo cáo quý tài chính lệch](../case-studies/bao-cao-quy-tai-chinh-lech.md).

</details>

### Bài A.5 — `dim_ngay` và `dim_thoi_gian` là hai bảng

**Đề:** không có SQL. `su_kien_web` có `thoi_diem` tới giây. Vì sao không thêm giờ/phút
vào `dim_ngay`?

<details>
<summary>Lời giải</summary>

Số dòng nếu gộp:

```text
10 nam x 365 ngay x 86.400 giay  =  315 trieu dong
```

315 triệu dòng cho một *dimension*. Đó không còn là dimension, đó là một fact table.

Tách hai bảng:

| Bảng | Grain | Số dòng (10 năm) | Cột |
|---|---|---|---|
| `dim_ngay` | một ngày | ~3.650 | `thang`, `quy`, `la_ngay_le`, `nam_tai_chinh` |
| `dim_thoi_gian` | một giây trong ngày | **86.400, cố định** | `gio`, `phut`, `ca_lam_viec`, `khung_gio_cao_diem` |

`dim_thoi_gian` **không phụ thuộc ngày** — nó là 86.400 dòng, mãi mãi, dù dữ liệu kéo dài
100 năm.

Fact giữ hai khoá:

```sql
select su_kien_id, khach_id,
       cast(strftime(thoi_diem,'%Y%m%d') as int) ngay_key,
       hour(thoi_diem)*3600 + minute(thoi_diem)*60 + second(thoi_diem) thoi_gian_key
from su_kien_web;
```

Với dữ liệu này, `dim_thoi_gian` trả lời được câu mà `dim_ngay` không đụng tới:
*"khách hoạt động mạnh nhất vào khung giờ nào"* — và đó chính là loại câu hỏi khiến người
ta muốn lưu giờ ngay từ đầu.

**Khi nào không cần `dim_thoi_gian`:** khi chỉ cần giờ/phút thô, không cần thuộc tính như
"ca sáng", "giờ cao điểm", "giờ hành chính". Lúc đó để nguyên cột `timestamp` trong fact
và dùng hàm — vì bạn không cần **tra** gì cả.

Phép thử giống hệt `dim_ngay`: có thuộc tính **không suy ra được từ giá trị** (ca làm
việc, khung giờ khuyến mãi) thì cần bảng; không có thì dùng hàm.

</details>

---

## Bộ B — Audit dimension

### Bài B.1 — Nạp trùng phồng 45,5%

**Đề:** dựng `fct_nap` mô phỏng nạp hai lô, trong đó lô 2 **nạp lại** `DH003` và `DH005`.
Đo thiệt hại.

**Đáp số phải ra:**

```text
┌─────────┬───────────┬────────────────┬─────────────────┐
│ so_dong │ doanh_thu │ doanh_thu_that │ phong_phan_tram │
├─────────┼───────────┼────────────────┼─────────────────┤
│      20 │  14865000 │       10215000 │            45.5 │
└─────────┴───────────┴────────────────┴─────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
create or replace table fct_nap as
select don_hang_id, dong, ma_hang, so_luong, don_gia, ngay,
       1 lo_nap, timestamp '2026-07-06 02:00:00' nap_luc
from don_hang_chi_tiet
union all
select don_hang_id, dong, ma_hang, so_luong, don_gia, ngay,
       2, timestamp '2026-07-06 06:00:00'
from don_hang_chi_tiet where don_hang_id in ('DH003','DH005');

select count(*) so_dong, sum(so_luong*don_gia) doanh_thu, 10215000 doanh_thu_that,
       round(100.0*(sum(so_luong*don_gia)-10215000)/10215000, 1) phong_phan_tram
from fct_nap;
```

Chỉ 5 dòng thừa trên 15, nhưng doanh thu phồng **45,5%** — vì `DH003` (1.950.000) và
`DH005` (2.700.000) là hai đơn to nhất.

Đó là tính chất chung của nạp trùng: **tỷ lệ phồng doanh thu không bằng tỷ lệ phồng số
dòng**. 33% số dòng thừa nhưng 45,5% tiền thừa. Nên ước lượng thiệt hại bằng cách đếm
dòng là sai.

Ba nguyên nhân thật của nạp trùng, không cái nào hiếm:

| Nguyên nhân | Hoàn cảnh |
|---|---|
| Job chạy lại sau lỗi | lỗi ở bước 9/10, chạy lại từ đầu, 8 bước đầu nạp hai lần |
| Nguồn gửi lại file | đối tác gửi lại vì "file trước thiếu", nhưng thực ra đủ |
| Backfill chồng lịch | nạp bù tháng 6 trong khi job hàng ngày vẫn chạy |

Không cách nào trong ba cái trên báo lỗi. Bài B.2 phát hiện.

</details>

### Bài B.2 — Phát hiện trùng khi chưa biết lô nào sai

**Đề:** tìm mọi khoá xuất hiện nhiều hơn một lần, kèm số lô liên quan.

**Đáp số phải ra:**

```text
┌─────────────┬───────┬────────┬───────┐
│ don_hang_id │ dong  │ so_ban │ so_lo │
├─────────────┼───────┼────────┼───────┤
│ DH003       │     1 │      2 │     2 │
│ DH003       │     2 │      2 │     2 │
│ DH003       │     3 │      2 │     2 │
│ DH005       │     1 │      2 │     2 │
│ DH005       │     2 │      2 │     2 │
└─────────────┴───────┴────────┴───────┘
```

<details>
<summary>Lời giải</summary>

```sql
select don_hang_id, dong, count(*) so_ban, count(distinct lo_nap) so_lo
from fct_nap group by 1,2
having count(*) > 1
order by 1,2;
```

Cột `so_lo` là cột quan trọng và hay bị bỏ. Nó phân biệt hai chuyện hoàn toàn khác nhau:

| `so_ban` | `so_lo` | Chẩn đoán |
|---|---|---|
| 2 | **2** | **nạp trùng** — cùng dòng từ hai lô |
| 2 | **1** | **grain sai** — khoá bạn khai không duy nhất trong nguồn |

Cả hai đều làm `count(*) > 1`, nhưng cách chữa ngược nhau: cái đầu xoá bớt dữ liệu, cái
sau sửa lại định nghĩa grain. Chữa nhầm là hoặc xoá dữ liệu đúng, hoặc giữ dữ liệu sai.

Câu này nên là **test chạy mỗi lần build**, và trong dbt nó là test có sẵn:

```yaml
models:
  - name: fct_ban_hang
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [don_hang_id, dong]
```

Test này bắt cả hai trường hợp trên. Nó là test **rẻ nhất và giá trị nhất** trong mọi
fact table — và nó chính là phép kiểm grain của
[bộ 1 bài A.1](bt-01-nen-tang.md#bài-a1--khai-grain-cho-cả-bảy-bảng-và-chứng-minh), lần
này chạy tự động.

</details>

### Bài B.3 — Không có audit: xoá 10 dòng để diệt 5

**Đề:** đo xem nếu **không** có cột `lo_nap`, việc xoá "các dòng trùng" sẽ đụng vào bao
nhiêu dòng.

**Đáp số phải ra:**

```text
┌───────────────┬──────────────────┬──────────────┐
│ truoc_khi_xoa │ so_dong_dinh_liu │ so_dong_lo_2 │
├───────────────┼──────────────────┼──────────────┤
│            20 │               10 │            5 │
└───────────────┴──────────────────┴──────────────┘
```

**10 dòng dính líu, nhưng chỉ 5 dòng đáng xoá.**

<details>
<summary>Lời giải</summary>

```sql
select (select count(*) from fct_nap) truoc_khi_xoa,
       (select count(*) from fct_nap f
        where exists (select 1 from fct_nap g
                      where g.don_hang_id = f.don_hang_id and g.dong = f.dong
                        and g.lo_nap <> f.lo_nap)) so_dong_dinh_liu,
       (select count(*) from fct_nap where lo_nap = 2) so_dong_lo_2;
```

Không có cột đánh dấu lô, hai bản sao của cùng một dòng là **giống hệt nhau về mọi
mặt** — không có cách nào phân biệt bản gốc với bản trùng.

```sql
-- SAI: xoa het ca hai ban -> mat luon du lieu dung
delete from fct_nap f
where exists (select 1 from fct_nap g
              where g.don_hang_id = f.don_hang_id and g.dong = f.dong
                and g.lo_nap <> f.lo_nap);
-- 10 dong bien mat, DH003 va DH005 mat sach
```

Lối thoát duy nhất khi không có audit là `row_number()` giữ lại một bản:

```sql
delete from fct_nap where rowid in (
  select rowid from (select rowid, row_number() over
    (partition by don_hang_id, dong order by rowid) rn from fct_nap) where rn > 1);
```

Nó **hoạt động**, nhưng có ba vấn đề nghiêm trọng:

1. **Giữ lại bản nào là tuỳ tiện** — `rowid` không có ý nghĩa nghiệp vụ. Nếu hai lô có
   dữ liệu khác nhau (lô 2 là bản sửa), bạn có thể vừa giữ lại bản cũ.
2. **Không truy được** đã xoá gì, vì sao.
3. **Không lặp lại được** — chạy lại trên bản sao khác có thể cho kết quả khác.

Bài B.4 làm đúng.

</details>

### Bài B.4 — Có audit: xoá chính xác 5 dòng

**Đề:** dùng `lo_nap` xoá đúng lô 2 và chứng minh doanh thu về đúng.

**Đáp số phải ra:**

```text
┌─────────┬───────────┬─────────┐
│ so_dong │ doanh_thu │  khop   │
├─────────┼───────────┼─────────┤
│      15 │  10215000 │ true    │
└─────────┴───────────┴─────────┘
```

<details>
<summary>Lời giải</summary>

```sql
create or replace table fct_da_sua as select * from fct_nap where lo_nap <> 2;

select count(*) so_dong, sum(so_luong*don_gia) doanh_thu,
       sum(so_luong*don_gia) = 10215000 khop
from fct_da_sua;
```

**Một điều kiện `where`.** Đó là toàn bộ giá trị của audit dimension — và nó chỉ có giá
trị nếu cột đó **đã có sẵn từ trước khi sự cố xảy ra**. Thêm audit sau khi phát hiện nạp
trùng là quá muộn.

Audit dimension đầy đủ nên có sáu cột, mỗi cột trả lời một câu:

```sql
create or replace table dim_audit (
  audit_key    int primary key,
  lo_nap       int,           -- lo nao
  nap_luc      timestamp,     -- chay luc nao
  nguon        varchar,       -- tu he thong nao
  phien_ban_code varchar,     -- git sha cua pipeline
  so_dong_doc  int,           -- doc bao nhieu
  so_dong_ghi  int            -- ghi bao nhieu
);
```

Bốn câu hỏi audit dimension trả lời mà không có nó thì **không trả lời được**:

| Câu hỏi | Cột |
|---|---|
| "Xoá lô hỏng mà không đụng dữ liệu đúng" | `lo_nap` |
| "Số này được sinh lúc nào" | `nap_luc` |
| "Sau khi sửa code, số có đổi không" | `phien_ban_code` |
| "Nguồn gửi thiếu dòng nào không" | `so_dong_doc` vs `so_dong_ghi` |

Cột `phien_ban_code` là cột hay bị quên và cứu được nhiều nhất: khi có người hỏi *"vì sao
số tháng 6 giờ khác tháng 6 hồi tháng trước"*, so hai `phien_ban_code` là ra ngay.

Chi phí: **một cột `int` trên mỗi dòng fact**. Xem
[case study nạp hai lần không truy được](../case-studies/nap-hai-lan-khong-truy-duoc.md).

</details>

### Bài B.5 — Đối soát tồn kho: một nguyên nhân, hai triệu chứng

**Đề:** đối soát `kho_hang` với số bán ra, tìm **dòng lệch đầu tiên** của mỗi mặt hàng.
Tồn đầu kỳ 01/07: `SP-A` 100 · `SP-B` 50 · `SP-C` 20 · `SP-D` 200.

**Đáp số phải ra:**

```text
┌─────────┬────────────────────┬──────────────────┐
│ ma_hang │ ngay_lech_dau_tien │ so_dong_bao_lech │
├─────────┼────────────────────┼──────────────────┤
│ SP-B    │ 2026-07-04         │                2 │
└─────────┴────────────────────┴──────────────────┘
```

**Hai dòng báo lệch, nhưng chỉ một nguyên nhân.**

<details>
<summary>Lời giải</summary>

```sql
with ban as (select ngay, ma_hang, sum(so_luong) da_ban
             from don_hang_chi_tiet group by 1,2),
     dau as (select * from (values ('SP-A',100),('SP-B',50),('SP-C',20),('SP-D',200))
             t(ma_hang, ton_dau)),
     luy as (select k.ngay, k.ma_hang, k.ton_cuoi_ngay,
                    d.ton_dau - sum(coalesce(b.da_ban,0))
                      over (partition by k.ma_hang order by k.ngay) ton_tinh
             from kho_hang k join dau d using (ma_hang)
             left join ban b on b.ngay = k.ngay and b.ma_hang = k.ma_hang)
select ma_hang, min(ngay) ngay_lech_dau_tien, count(*) so_dong_bao_lech
from luy where ton_cuoi_ngay <> ton_tinh
group by 1;
```

`SP-B` ngày 04/07 ghi 41 nhưng tính ra 40. Và vì tồn kho là **luỹ kế**, sai số **lan sang
mọi ngày sau** — ngày 05/07 cũng báo lệch dù dữ liệu ngày đó hoàn toàn đúng.

Đây là đặc tính của mọi đối soát trên số luỹ kế, và nó đổi hẳn cách đọc kết quả:

```text
So dong bao loi  ≠  So loi that
```

Trên dữ liệu thật với 400 ngày, một sai số ngày thứ 3 làm **398 dòng** báo đỏ. Nhìn báo
cáo thấy "398 lỗi" là hoảng và bắt đầu sửa từng dòng — sai hoàn toàn.

**Luật: với số luỹ kế, luôn tìm dòng lệch ĐẦU TIÊN, không đếm tổng số dòng lệch.**
`min(ngay)` trong câu trên chính là chỗ đó. Sửa dòng đầu là toàn bộ dòng sau tự hết.

Cách trình bày đúng cho báo cáo đối soát:

```sql
select ma_hang, min(ngay) lech_tu_ngay,
       arg_min(ton_cuoi_ngay - ton_tinh, ngay) chenh_ban_dau
from luy where ton_cuoi_ngay <> ton_tinh group by 1;
```

Một dòng cho mỗi mặt hàng, chỉ ra ngày và mức chênh gốc — không phải 398 dòng.

</details>

---

## Bộ C — Real-time fact table

### Bài C.1 — Ngày hôm nay chưa đầy

**Đề:** với `su_kien_web`, đếm sự kiện mỗi ngày kèm thời điểm đầu/cuối và số phút được
phủ sóng.

**Đáp số phải ra:**

```text
┌────────────┬────────────┬─────────────────────┬─────────────────────┬───────────────┐
│    ngay    │ so_su_kien │         dau         │        cuoi         │ phut_phu_song │
├────────────┼────────────┼─────────────────────┼─────────────────────┼───────────────┤
│ 2026-07-01 │          8 │ 2026-07-01 09:00:00 │ 2026-07-01 14:10:00 │           310 │
│ 2026-07-02 │         11 │ 2026-07-02 08:00:00 │ 2026-07-02 16:00:00 │           480 │
│ 2026-07-03 │          8 │ 2026-07-03 10:00:00 │ 2026-07-03 13:00:00 │           180 │
│ 2026-07-04 │          9 │ 2026-07-04 09:00:00 │ 2026-07-04 20:00:00 │           660 │
│ 2026-07-05 │          7 │ 2026-07-05 08:00:00 │ 2026-07-05 09:50:00 │           110 │
└────────────┴────────────┴─────────────────────┴─────────────────────┴───────────────┘
```

Ngày 05/07 dừng lúc **09:50**. Nó là "hôm nay", và nó chưa xong.

<details>
<summary>Lời giải</summary>

```sql
with theo_ngay as (
  select cast(thoi_diem as date) ngay, count(*) so_su_kien,
         min(thoi_diem) dau, max(thoi_diem) cuoi
  from su_kien_web group by 1)
select ngay, so_su_kien, dau, cuoi,
       date_diff('minute', dau, cuoi) phut_phu_song
from theo_ngay order by ngay;
```

Cột `so_su_kien` **không nói cho bạn biết điều đó**. Ngày 05/07 có 7 sự kiện, ngày 03/07
có 8 — nhìn qua thì hai ngày tương đương. Nhưng 05/07 mới chạy được **110 phút** còn
03/07 đã xong cả ngày.

Đây là vấn đề của mọi bảng real-time: **kỳ hiện tại là kỳ chưa đầy, nhưng nó nằm chung
bảng với các kỳ đã đầy** — và không có cột nào phân biệt.

Chú ý cột `phut_phu_song` cũng không phải thước đo tin cậy: 03/07 chỉ phủ 180 phút vì
khách không hoạt động, không phải vì dữ liệu thiếu. **Khoảng phủ sóng ≠ độ đầy đủ.**

Bài C.2 đo hậu quả, bài C.3 là lối ra.

</details>

### Bài C.2 — Ngày chưa đầy kéo trung bình xuống 4,4%

**Đề:** tính số sự kiện trung bình mỗi ngày, **có** và **không có** ngày cuối.

**Đáp số phải ra:**

```text
┌───────────────┬──────────────────┬────────────────┐
│ avg_ca_5_ngay │ avg_bo_ngay_cuoi │ lech_phan_tram │
├───────────────┼──────────────────┼────────────────┤
│           8.6 │              9.0 │           -4.4 │
└───────────────┴──────────────────┴────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
with theo_ngay as (select cast(thoi_diem as date) ngay, count(*) n from su_kien_web group by 1)
select round(avg(n),2) avg_ca_5_ngay,
       round(avg(n) filter (where ngay < '2026-07-05'),2) avg_bo_ngay_cuoi,
       round(100.0*(avg(n) - avg(n) filter (where ngay < '2026-07-05'))
             / avg(n) filter (where ngay < '2026-07-05'), 1) lech_phan_tram
from theo_ngay;
```

Lệch **4,4%** với dữ liệu chỉ cắt 14 tiếng cuối. Với dữ liệu cắt sớm hơn — báo cáo chạy
lúc 9h sáng — ngày hôm nay chỉ có ~1/10 lượng sự kiện, và trung bình 5 ngày lệch ~18%.

Nhưng con số lệch **không phải** vấn đề chính. Ba hậu quả nặng hơn:

**1. Số "hôm nay" nhảy suốt ngày.** Chạy báo cáo lúc 9h và 15h cho hai kết quả khác nhau,
và người dùng kết luận "báo cáo không đáng tin". Đúng
[case study số hôm nay nhảy suốt ngày](../case-studies/so-hom-nay-nhay-suot-ngay.md).

**2. So sánh với kỳ trước luôn âm.** "Hôm nay so với hôm qua: −85%" là báo động giả mỗi
sáng — và sau vài tuần thì không ai đọc cảnh báo nữa.

**3. Đường xu hướng luôn gãy ở điểm cuối.** Mọi biểu đồ đều tụt ở ngày cuối, tạo ấn tượng
sai về xu hướng giảm.

Ba cái này cùng một gốc: **kỳ chưa đầy bị đối xử như kỳ đã đầy.**

</details>

### Bài C.3 — Cột `ngay_da_day_du` và ba cách dùng

**Đề:** thêm cột đánh dấu ngày đã đầy đủ dữ liệu, rồi nêu ba cách báo cáo dùng nó.

**Đáp số phải ra:**

```text
┌────────────┬───────┬─────────────────────┬────────────────┐
│    ngay    │   n   │        cuoi         │ ngay_da_day_du │
├────────────┼───────┼─────────────────────┼────────────────┤
│ 2026-07-01 │     8 │ 2026-07-01 14:10:00 │ false          │
│ 2026-07-02 │    11 │ 2026-07-02 16:00:00 │ false          │
│ 2026-07-03 │     8 │ 2026-07-03 13:00:00 │ false          │
│ 2026-07-04 │     9 │ 2026-07-04 20:00:00 │ true           │
│ 2026-07-05 │     7 │ 2026-07-05 09:50:00 │ false          │
└────────────┴───────┴─────────────────────┴────────────────┘
```

Kết quả này **sai** — chỉ 04/07 được đánh dấu đầy đủ, còn 01–03/07 thì không. Tìm ra vì
sao, và sửa.

<details>
<summary>Lời giải</summary>

```sql
-- CACH SAI: suy tu du lieu
with theo_ngay as (
  select cast(thoi_diem as date) ngay, count(*) n, max(thoi_diem) cuoi,
         max(thoi_diem) >= cast(thoi_diem as date) + interval 20 hour ngay_da_day_du
  from su_kien_web group by 1)
select * from theo_ngay order by ngay;
```

Câu này suy "ngày đã đầy" từ *"có sự kiện sau 20h không"* — và nó sai vì **vắng sự kiện
buổi tối không có nghĩa là dữ liệu thiếu**. Ngày 01/07 chỉ đơn giản là không có ai truy
cập sau 14h.

**Không thể suy độ đầy đủ từ chính dữ liệu.** Đó là bài học chính của bài này, và nó
đúng cho mọi bảng real-time: dữ liệu không tự biết nó có thiếu hay không.

Độ đầy đủ là **metadata của quá trình nạp**, phải do pipeline ghi:

```sql
create or replace table trang_thai_nap (
  ngay date primary key,
  da_chot boolean,          -- pipeline ghi 'true' khi da nap xong ca ngay
  chot_luc timestamp,
  nguon varchar
);
-- pipeline ghi vao day sau khi nap xong ngay hom truoc
insert into trang_thai_nap values
  ('2026-07-01', true, '2026-07-02 02:00:00', 'web-events'),
  ('2026-07-02', true, '2026-07-03 02:00:00', 'web-events'),
  ('2026-07-03', true, '2026-07-04 02:00:00', 'web-events'),
  ('2026-07-04', true, '2026-07-05 02:00:00', 'web-events'),
  ('2026-07-05', false, null, 'web-events');     -- hom nay, chua chot
```

Ba cách báo cáo dùng cột đó, chọn theo đối tượng đọc:

| Cách | Làm gì | Hợp với |
|---|---|---|
| **Loại kỳ chưa chốt** | `where da_chot` | báo cáo quản trị, KPI, so sánh kỳ |
| **Hiện nhưng đánh dấu** | vẽ nét đứt, ghi *"đang cập nhật"* | dashboard vận hành |
| **Ngoại suy** | `n / phan_ngay_da_troi_qua` | dự báo trong ngày |

Cách 3 nguy hiểm nhất và phải ghi nhãn rõ nhất — nó tạo ra một con số **không có thật**,
và người đọc sẽ nhớ con số chứ không nhớ nhãn.

**Mặc định nên là cách 1.** Người dùng hỏi được "sao chưa có số hôm nay" thì tốt hơn là
họ tin một con số sai.

</details>

### Bài C.4 — Hai bảng: nóng và nguội

**Đề:** không có SQL. Nêu kiến trúc tách bảng real-time và bảng lịch sử.

<details>
<summary>Lời giải</summary>

```text
fct_su_kien_nong    ← hom nay, ghi lien tuc, khong phan vung, khong nen
fct_su_kien_nguoi   ← da chot, phan vung theo ngay, nen chat, sap xep
v_su_kien           ← view union hai cai
```

```sql
create or replace view v_su_kien as
select *, false la_du_lieu_nong from fct_su_kien_nguoi
union all
select *, true from fct_su_kien_nong;
```

Bốn khác biệt buộc phải tách:

| | Bảng nóng | Bảng nguội |
|---|---|---|
| Ghi | liên tục, độ trễ giây | một lần/ngày |
| Nén / phân vùng | **không** — làm chậm ghi | nén chặt, phân vùng theo ngày |
| Sửa lại | thường xuyên | **gần như không** |
| Tối ưu cho | ghi nhanh | đọc nhanh |

Bảng nóng tối ưu cho **ghi**, bảng nguội tối ưu cho **đọc** — hai mục tiêu mâu thuẫn, nên
một bảng không thể làm tốt cả hai.

Nửa đêm, dữ liệu hôm qua **chuyển từ nóng sang nguội**: ghi vào bảng nguội, xoá khỏi bảng
nóng, cập nhật `trang_thai_nap.da_chot = true`. Ba thao tác phải **cùng một transaction**,
hoặc theo đúng thứ tự đó — sai thứ tự là dữ liệu bị đếm hai lần hoặc biến mất trong vài
phút.

Cột `la_du_lieu_nong` trong view là chi tiết quan trọng: nó cho phép mọi báo cáo lọc kỳ
chưa chốt bằng **một** điều kiện, mà không cần biết gì về kiến trúc hai bảng.

Trên lakehouse hiện đại (Iceberg, Delta), ranh giới này mờ đi vì engine tự làm compaction.
Nhưng **khái niệm** thì không mất: vẫn phải biết dữ liệu nào đã chốt, và đó vẫn là
metadata do pipeline ghi, không phải thứ suy được từ dữ liệu.

Xem [Real-time fact table](../skills/real-time-fact.md).

</details>

---

## Bảng đối chiếu nhanh

| Số | Nghĩa | Bài |
|---|---|---|
| `ngay_key = -1`, `ngay = NULL` | unknown member của `dim_ngay` | A.1 |
| 23 và 21 ngày làm việc | lịch là dữ liệu, không phải hàm | A.2 |
| 8 dòng chứ không 5 | ngày không giao dịch vẫn phải hiện | A.3 |
| 20 dòng · 14.865.000 · **+45,5%** | nạp trùng 5 dòng, phồng 45,5% tiền | B.1 |
| `so_lo` = 2 | phân biệt nạp trùng với grain sai | B.2 |
| **10 dòng dính líu / 5 dòng đáng xoá** | không có audit thì xoá thừa gấp đôi | B.3 |
| 15 dòng · 10.215.000 | có audit: một `where` là xong | B.4 |
| 2 dòng báo lệch / 1 nguyên nhân | sai số luỹ kế lan sang ngày sau | B.5 |
| 8,6 vs 9,0 (−4,4%) | ngày chưa đầy kéo trung bình xuống | C.2 |
| chỉ 04/07 `true` | **không suy được độ đầy đủ từ dữ liệu** | C.3 |

## Related Topics

- [Bài tập bộ 6 — Tích hợp](bt-06-tich-hop.md) — bộ trước
- [Bài tập — Data Modeling](index.md) — mục lục toàn bộ
- [Lab vận hành](lab-van-hanh.md) — bản chẩn đoán của cùng chủ đề
- [Kỹ năng — Data Modeling](../skills/index.md) — lý thuyết của ba kỹ thuật trên
