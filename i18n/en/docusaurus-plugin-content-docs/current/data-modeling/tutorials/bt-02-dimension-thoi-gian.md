---
title: "Bài tập bộ 2 — Dimension theo thời gian: SCD, phát hiện thay đổi, mini-dim, role-playing, về muộn"
i18n_status: untranslated
sidebar_position: 11
description: "22 bài tự viết: dựng Type 2 từ bản trích ngày, bắt ba kiểu updated_at nói dối, tách mini-dimension, ba vai của dim_ngay, và gán khoá cho fact về muộn."
tags: [tutorial, bai-tap, scd, scd-change-detection, mini-dimension, role-playing-dimension, late-arriving, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Bài tập bộ 2 — Dimension theo thời gian

> **Chốt:** năm kỹ thuật trong bộ này trả lời **một** câu hỏi duy nhất từ năm góc —
> *thuộc tính đổi rồi, báo cáo về quá khứ phải dùng giá trị nào?* Sai góc nào cũng ra số
> đúng, chỉ là đúng cho câu hỏi khác.

## Kỹ thuật được luyện trong bộ này

| # | Kỹ thuật | Tài liệu gốc | Số bài |
|---|---|---|---|
| 1 | SCD Type 1/2/3/6 | [SCD](../skills/scd.md) | 5 |
| 2 | Phát hiện thay đổi | [Phát hiện thay đổi cho SCD 2](../skills/scd-change-detection.md) | 5 |
| 3 | Mini-dimension | [Mini-dimension](../skills/mini-dimension.md) | 4 |
| 4 | Role-playing dimension | [Role-playing dimension](../skills/role-playing-dimension.md) | 4 |
| 5 | Dữ liệu về muộn | [Dữ liệu về muộn](../skills/late-arriving.md) | 4 |

## Chuẩn bị

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Bộ này sống trên `khach_hang_lich_su` — 4 khách × 5 ngày, xem
[phụ lục seed](bt-00-seed.md#khach_hang_lich_sucsv). Nhiều bài dùng lại `dim_khach_t2`
dựng ở [bộ 1 bài C.2](bt-01-nen-tang.md#bài-c2--dựng-dimension-type-2-từ-bản-trích-hàng-ngày);
chưa có thì quay lại dựng trước.

---

## Bộ A — SCD Type 1, 2, 3, 6

### Bài A.1 — Ba kiểu SCD, ba số dòng

**Đề:** đếm số dòng dimension khách hàng theo ba cách xử lý: Type 1 (ghi đè, không giữ
lịch sử), Type 2 **chỉ theo cột chậm** (`khu_vuc`, `hang`), và Type 2 **theo mọi cột**.

**Đáp số phải ra:**

```text
┌───────────────────┬─────────┐
│       kieu        │ so_dong │
├───────────────────┼─────────┤
│ Type 1 (ghi de)   │       4 │
│ Type 2 (cot cham) │       6 │
│ Type 2 (moi cot)  │      18 │
└───────────────────┴─────────┘
```

**4 → 6 → 18.** Chỉ đổi danh sách cột kích hoạt mà dim to gấp ba.

<details>
<summary>Lời giải</summary>

```sql
select 'Type 1 (ghi de)' kieu, count(distinct khach_id) so_dong from khach_hang_lich_su
union all select 'Type 2 (cot cham)', count(*) from dim_khach_t2
union all select 'Type 2 (moi cot)', count(*)
  from (select distinct khach_id, khu_vuc, hang, nhom_tuoi, khoang_thu_nhap, diem_tin_dung
        from khach_hang_lich_su);
```

Với 5 ngày, chênh lệch 6 và 18 nghe không đáng sợ. Nhân lên quy mô thật thì nó đổi hẳn
bản chất bài toán:

| | 4 khách × 5 ngày | 1 triệu khách × 3 năm |
|---|---|---|
| Type 1 | 4 | 1 triệu |
| Type 2 cột chậm | 6 | ~3 triệu |
| Type 2 mọi cột | 18 | **~1 tỷ** |

Con số 1 tỷ không phải doạ — nó là hệ quả số học của việc để một cột đổi hàng ngày
(`diem_tin_dung`) vào danh sách kích hoạt. Xem
[case study dimension phình 365 lần](../case-studies/dimension-phinh-365-lan.md).

**Việc phải làm mỗi lần dựng Type 2:** viết ra danh sách cột kích hoạt, tường minh,
ngay trong code — và bảo vệ nó bằng review. Danh sách đó là quyết định thiết kế đắt
nhất của cả dimension.

</details>

### Bài A.2 — As-was và as-is: 2,55 triệu đi từ Bắc vào Nam

**Đề:** tính doanh thu theo `khu_vuc` **hai lần**: (a) *as-was* — khu vực của khách **tại
thời điểm đặt hàng**; (b) *as-is* — khu vực **hiện tại**. Đặt cạnh nhau kèm cột chênh.

**Đáp số phải ra:**

```text
┌────────────┬─────────┬─────────┬──────────┐
│  khu_vuc   │ as_was  │  as_is  │  chenh   │
├────────────┼─────────┼─────────┼──────────┤
│ Mien Bac   │ 4200000 │ 1650000 │ -2550000 │
│ Mien Nam   │ 3915000 │ 6465000 │  2550000 │
│ Mien Trung │ 2100000 │ 2100000 │        0 │
└────────────┴─────────┴─────────┴──────────┘
```

Cả hai cột đều cộng lại bằng **10.215.000**. Không cột nào sai — nhưng Miền Bắc chênh
**2,55 triệu**, tức **154%** so với chính nó.

<details>
<summary>Lời giải</summary>

```sql
with tien as (
  select h.don_hang_id, h.khach_id, h.ngay_dat, sum(ct.so_luong*ct.don_gia) tien
  from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1,2,3)
select coalesce(w.khu_vuc, i.khu_vuc) khu_vuc,
       coalesce(w.as_was,0) as_was, coalesce(i.as_is,0) as_is,
       coalesce(i.as_is,0)-coalesce(w.as_was,0) chenh
from (select d.khu_vuc, sum(t.tien) as_was
      from tien t join dim_khach_t2 d
        on d.khach_id = t.khach_id
       and t.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den
      group by 1) w
full join (select d.khu_vuc, sum(t.tien) as_is
           from tien t join dim_khach_t2 d
             on d.khach_id = t.khach_id and d.la_hien_tai
           group by 1) i using (khu_vuc)
order by 1;
```

Toàn bộ chênh lệch đến từ **một** khách: `C1` chuyển từ Miền Bắc vào Miền Nam ngày
03/07, mang theo hai đơn cũ `DH001` (600.000) và `DH003` (1.950.000) = **2.550.000**.

Câu hỏi nào dùng số nào:

| Câu hỏi nghiệp vụ | Dùng |
|---|---|
| "Tháng 7 chi nhánh Miền Bắc bán được bao nhiêu?" | **as-was** — chi nhánh đó thật sự đã bán |
| "Khách Miền Nam hiện nay đã từng mua bao nhiêu?" | **as-is** — phân tích theo tập khách hiện tại |
| "Vì sao báo cáo tháng 6 tháng này khác tháng trước?" | đang dùng **as-is** mà tưởng as-was |

Cái nguy hiểm không phải chọn sai, mà là **không biết mình đang dùng cái nào**. Báo cáo
as-is thì con số quá khứ **tự đổi** mỗi lần dimension cập nhật — xem
[case study báo cáo quá khứ tự đổi số](../case-studies/bao-cao-qua-khu-tu-doi-so.md).

Ghi thẳng vào tên cột hoặc tiêu đề báo cáo: `doanh_thu_theo_khu_vuc_luc_dat_hang`.

</details>

### Bài A.3 — Ba phép kiểm toàn vẹn cho Type 2

**Đề:** viết **một** câu trả ba số phải bằng 0: số cặp phiên bản **chồng lấn** khoảng
hiệu lực, số khách có **số bản hiện tại khác 1**, và số **chỗ hở** giữa hai phiên bản
liên tiếp.

**Đáp số phải ra:**

```text
┌──────────────────┬───────────────────────────┬───────────┐
│ so_cap_chong_lan │ khach_sai_so_ban_hien_tai │ so_cho_ho │
├──────────────────┼───────────────────────────┼───────────┤
│                0 │                         0 │         0 │
└──────────────────┴───────────────────────────┴───────────┘
```

Ba số 0 này nên là **test chạy mỗi lần build**, không phải câu query chạy một lần rồi
quên.

<details>
<summary>Lời giải</summary>

```sql
select
  (select count(*) from dim_khach_t2 a join dim_khach_t2 b
     on a.khach_id = b.khach_id and a.khach_key < b.khach_key
    and a.hieu_luc_tu <= b.hieu_luc_den and b.hieu_luc_tu <= a.hieu_luc_den) so_cap_chong_lan,
  (select count(*) from (select khach_id, count(*) filter (where la_hien_tai) n
                         from dim_khach_t2 group by 1) where n <> 1) khach_sai_so_ban_hien_tai,
  (select count(*) from (select khach_id, hieu_luc_den,
                                lead(hieu_luc_tu) over (partition by khach_id order by hieu_luc_tu) tiep
                         from dim_khach_t2)
    where tiep is not null and tiep <> hieu_luc_den + interval 1 day) so_cho_ho;
```

Ba phép kiểm bắt ba lỗi khác nhau, và mỗi lỗi hỏng theo một kiểu:

| Kiểm | Bắt lỗi gì | Triệu chứng nếu bỏ qua |
|---|---|---|
| **Chồng lấn** | hai phiên bản cùng hiệu lực một ngày | as-was join trả **2 dòng** → doanh thu nhân đôi |
| **Số bản hiện tại ≠ 1** | quên đóng bản cũ, hoặc đóng hết | as-is trả **nhân đôi** hoặc **0 dòng** |
| **Chỗ hở** | có ngày không phiên bản nào phủ | fact ngày đó rơi vào `-1`, **mất khỏi báo cáo** |

Điều kiện chồng lấn `a.tu <= b.den and b.tu <= a.den` là dạng chuẩn của giao hai khoảng.
Viết `a.tu between b.tu and b.den` là **thiếu một nửa** trường hợp — khoảng b nằm gọn
trong a sẽ lọt lưới.

Trong dbt, ba câu này thành ba `singular test` trong `tests/`. Xem
[SCD](../skills/scd.md) và [lab SCD bằng dbt snapshot](scd-bang-dbt-snapshot.md).

</details>

### Bài A.4 — Type 3: một cột "giá trị trước"

**Đề:** với mỗi khách, lấy phiên bản **hiện tại** kèm một cột `khu_vuc_truoc` — giá trị
ngay trước đó — và ngày đổi. Đó chính là Type 3.

**Đáp số phải ra:**

```text
┌──────────┬──────────────────┬───────────────┬────────────┐
│ khach_id │ khu_vuc_hien_tai │ khu_vuc_truoc │  ngay_doi  │
├──────────┼──────────────────┼───────────────┼────────────┤
│ C1       │ Mien Nam         │ Mien Bac      │ 2026-07-03 │
│ C2       │ Mien Nam         │ NULL          │ 2026-07-01 │
│ C3       │ Mien Trung       │ Mien Trung    │ 2026-07-04 │
│ C4       │ Mien Bac         │ NULL          │ 2026-07-01 │
└──────────┴──────────────────┴───────────────┴────────────┘
```

Hai dòng trong bảng này **phơi bày đúng chỗ Type 3 gãy**. Tìm ra cả hai.

<details>
<summary>Lời giải</summary>

```sql
select khach_id, khu_vuc khu_vuc_hien_tai,
       lag(khu_vuc) over (partition by khach_id order by hieu_luc_tu) khu_vuc_truoc,
       hieu_luc_tu ngay_doi
from dim_khach_t2 qualify la_hien_tai order by khach_id;
```

**Chỗ gãy thứ nhất — `C3`:** `khu_vuc_truoc` = `Mien Trung`, y hệt giá trị hiện tại. Vì
`C3` đổi `hang` (Bạc → Vàng) chứ không đổi `khu_vuc`. Type 3 có **một cột `_truoc` cho
mỗi thuộc tính**, và cột đó bị "tiêu" bởi bất kỳ thay đổi nào của bản ghi. Nhìn vào bảng
này người đọc kết luận "C3 từng ở Miền Trung rồi chuyển về Miền Trung" — vô nghĩa.

**Chỗ gãy thứ hai — `C2` và `C4`:** `khu_vuc_truoc` là `NULL` vì chưa từng đổi. Mọi
query kiểu `where khu_vuc_truoc <> khu_vuc` sẽ **lặng lẽ loại** hai khách này (logic ba
trị). Phải là `is distinct from`.

Và chỗ gãy thứ ba, không hiện ra ở đây vì dữ liệu quá ngắn: Type 3 chỉ nhớ **một** bước.
Khách đổi khu vực lần thứ hai là bước đầu tiên biến mất vĩnh viễn.

Nên Type 3 chỉ hợp một tình huống hẹp: **thay đổi hiếm, có kế hoạch, và cần so song song
cũ/mới** — ví dụ tái cấu trúc vùng bán hàng một lần trong năm, khi báo cáo cần xem cả
theo vùng cũ lẫn vùng mới. Ngoài trường hợp đó thì dùng Type 2.

</details>

### Bài A.5 — Type 6: lịch sử và hiện tại trên cùng một dòng

**Đề:** mở rộng `dim_khach_t2` thành Type 6 — mỗi dòng có **cả** `khu_vuc_luc_do` (giá
trị của phiên bản đó) **và** `khu_vuc_hien_tai` (giá trị mới nhất của khách).

**Đáp số phải ra:**

```text
┌───────────┬──────────┬────────────────┬──────────────────┬─────────────┬──────────────┐
│ khach_key │ khach_id │ khu_vuc_luc_do │ khu_vuc_hien_tai │ hieu_luc_tu │ hieu_luc_den │
├───────────┼──────────┼────────────────┼──────────────────┼─────────────┼──────────────┤
│         1 │ C1       │ Mien Bac       │ Mien Nam         │ 2026-07-01  │ 2026-07-02   │
│         2 │ C1       │ Mien Nam       │ Mien Nam         │ 2026-07-03  │ 9999-12-31   │
│         3 │ C2       │ Mien Nam       │ Mien Nam         │ 2026-07-01  │ 9999-12-31   │
│         4 │ C3       │ Mien Trung     │ Mien Trung       │ 2026-07-01  │ 2026-07-03   │
│         5 │ C3       │ Mien Trung     │ Mien Trung       │ 2026-07-04  │ 9999-12-31   │
│         6 │ C4       │ Mien Bac       │ Mien Bac         │ 2026-07-01  │ 9999-12-31   │
└───────────┴──────────┴────────────────┴──────────────────┴─────────────┴──────────────┘
```

Chỉ **dòng 1** có hai cột khác nhau. Đó là toàn bộ giá trị của Type 6.

<details>
<summary>Lời giải</summary>

```sql
select d.khach_key, d.khach_id, d.khu_vuc khu_vuc_luc_do,
       (select c.khu_vuc from dim_khach_t2 c
        where c.khach_id = d.khach_id and c.la_hien_tai) khu_vuc_hien_tai,
       d.hieu_luc_tu, d.hieu_luc_den
from dim_khach_t2 d order by d.khach_id, d.hieu_luc_tu;
```

Type 6 = Type 1 + Type 2 + Type 3 trong một bảng. Fact chỉ join **một lần** bằng
`khach_key`, rồi người đọc **tự chọn cột**:

```sql
-- cung mot join, hai cach nhin
select khu_vuc_luc_do,    sum(tien) from ... -- as-was, ra 4.200.000 cho Mien Bac
select khu_vuc_hien_tai,  sum(tien) from ... -- as-is,  ra 1.650.000
```

Đó là ưu điểm thật: bài A.2 phải viết **hai** kiểu join khác nhau, còn ở đây chỉ đổi tên
cột. Người dùng BI không bao giờ viết đúng được điều kiện `between ... and ...`, nhưng
đổi cột thì ai cũng làm được.

Cái giá: cột `_hien_tai` phải **cập nhật lại toàn bộ phiên bản cũ** mỗi lần khách đổi.
`C1` đổi một lần là phải `update` cả 2 dòng của C1. Đó là ghi đè hàng loạt trên bảng
lớn — trên Iceberg/Delta thì là rewrite file, không rẻ.

**Quy tắc chọn:** thuộc tính mà **cả hai cách nhìn đều được hỏi thường xuyên** thì Type
6. Còn lại thì Type 2 và ép người dùng nói rõ họ muốn gì.

</details>

---

## Bộ B — Phát hiện thay đổi

### Bài B.1 — Ba cách phát hiện, một sự thật

**Đề:** với hai cột chậm `khu_vuc` và `hang`, đếm số thay đổi thật từ 02/07 trở đi, rồi
so với số mà **`updated_at`** báo và số mà **hash** báo. Kèm số lần `updated_at` **bỏ
sót** và **báo thừa**.

**Đáp số phải ra:**

```text
┌─────────┬────────────────┬──────────┬───────────────────┬─────────────────────┬──────────┐
│ su_that │ updated_at_bao │ hash_bao │ updated_at_BO_SOT │ updated_at_BAO_THUA │ hash_sai │
├─────────┼────────────────┼──────────┼───────────────────┼─────────────────────┼──────────┤
│       2 │              3 │        2 │                 1 │                   2 │        0 │
└─────────┴────────────────┴──────────┴───────────────────┴─────────────────────┴──────────┘
```

**`updated_at` báo 3 khi sự thật là 2 — và trong 3 cái đó chỉ 1 cái đúng.** Hash đúng
tuyệt đối.

<details>
<summary>Lời giải</summary>

```sql
with x as (
  select ngay_trich, khach_id,
    (lag(khu_vuc) over w is distinct from khu_vuc
     or lag(hang) over w is distinct from hang) su_that,
    (lag(updated_at) over w is distinct from updated_at) theo_updated_at,
    (lag(md5(khu_vuc||'|'||hang)) over w is distinct from md5(khu_vuc||'|'||hang)) theo_hash
  from khach_hang_lich_su window w as (partition by khach_id order by ngay_trich))
select count(*) filter (where su_that) su_that,
       count(*) filter (where theo_updated_at) updated_at_bao,
       count(*) filter (where theo_hash) hash_bao,
       count(*) filter (where su_that and not theo_updated_at) updated_at_BO_SOT,
       count(*) filter (where not su_that and theo_updated_at) updated_at_BAO_THUA,
       count(*) filter (where su_that <> theo_hash) hash_sai
from x where ngay_trich > '2026-07-01';
```

Hash **không bao giờ** sai, vì nó tính trên chính nội dung cần theo dõi — nó không thể
bất đồng với sự thật, nó *là* sự thật được nén lại.

`updated_at` sai vì nó là **lời hứa của hệ thống nguồn**, và hệ thống nguồn không hứa
với kho dữ liệu. Một `UPDATE` chạy tay quên trigger, một job batch `touch` cả bảng — là
lời hứa gãy.

Điều kiện duy nhất để tin `updated_at`: nó do **CDC đọc từ transaction log** sinh ra
(Debezium, binlog). Lúc đó nó không phải cột ứng dụng ghi, mà là dấu vết database ghi —
khác hẳn về độ tin cậy.

</details>

### Bài B.2 — Chỉ mặt từng dòng `updated_at` nói dối

**Đề:** liệt kê **từng dòng** mà `updated_at` bất đồng với sự thật, kèm nhãn `BO SOT` /
`BAO THUA` / `khop`.

**Đáp số phải ra:**

```text
┌────────────┬──────────┬────────────┬─────────┬─────────┬─────────────────┬──────────┐
│ ngay_trich │ khach_id │  khu_vuc   │  hang   │ su_that │ theo_updated_at │ ket_luan │
├────────────┼──────────┼────────────┼─────────┼─────────┼─────────────────┼──────────┤
│ 2026-07-03 │ C1       │ Mien Nam   │ Bac     │ true    │ false           │ BO SOT   │
│ 2026-07-04 │ C1       │ Mien Nam   │ Bac     │ false   │ true            │ BAO THUA │
│ 2026-07-03 │ C2       │ Mien Nam   │ Vang    │ false   │ true            │ BAO THUA │
│ 2026-07-04 │ C3       │ Mien Trung │ Vang    │ true    │ true            │ khop     │
└────────────┴──────────┴────────────┴─────────┴─────────┴─────────────────┴──────────┘
```

<details>
<summary>Lời giải</summary>

```sql
with x as (
  select ngay_trich, khach_id, khu_vuc, hang, updated_at,
    (lag(khu_vuc) over w is distinct from khu_vuc
     or lag(hang) over w is distinct from hang) su_that,
    (lag(updated_at) over w is distinct from updated_at) theo_updated_at
  from khach_hang_lich_su window w as (partition by khach_id order by ngay_trich))
select ngay_trich, khach_id, khu_vuc, hang, su_that, theo_updated_at,
       case when su_that and not theo_updated_at then 'BO SOT'
            when not su_that and theo_updated_at then 'BAO THUA' else 'khop' end ket_luan
from x where ngay_trich > '2026-07-01' and (su_that or theo_updated_at)
order by khach_id, ngay_trich;
```

Ba câu chuyện, ba hậu quả:

**`C1` ngày 03/07 — `BO SOT`.** Khách chuyển vùng thật, `updated_at` đứng im ở `2026-06-28`.
Pipeline tin `updated_at` sẽ **không tạo phiên bản mới**, và mọi đơn từ 03/07 bị gán vào
Miền Bắc. Lỗi này **im lặng tuyệt đối** — không dòng nào thiếu, không tổng nào lệch,
chỉ là gán sai vùng.

**`C1` ngày 04/07 — `BAO THUA`.** `updated_at` nhích lên `2026-07-04` nhưng hai cột chậm
không đổi (đổi `khoang_thu_nhap`). Pipeline tin `updated_at` sẽ tạo phiên bản thứ ba
thừa. Từ đó `C1` có 3 phiên bản, as-was join vẫn ra một dòng nên **không ai phát hiện** —
dim cứ thế phình.

**`C2` ngày 03/07 — `BAO THUA` thuần tuý.** Không một cột nào đổi, `updated_at` vẫn nhích.
Đây là dấu vết của batch job `touch` cả bảng — rất phổ biến ở hệ thống nguồn cũ.

Chú ý `C1` xuất hiện ở **cả hai** loại lỗi, ngày liền nhau. Nên thống kê kiểu *"độ chính
xác của `updated_at` là 90%"* là vô nghĩa: cái sai và cái đúng không phân bố ngẫu nhiên,
chúng bám vào đúng những khách hay thay đổi nhất.

</details>

### Bài B.3 — Chọn cột kích hoạt: một quyết định, ba kết quả

**Đề:** đếm số phiên bản Type 2 sinh ra ứng với **ba** danh sách cột kích hoạt khác nhau:
chỉ `khu_vuc`; `khu_vuc` + `hang`; và toàn bộ 5 cột nghiệp vụ.

**Đáp số phải ra:**

```text
┌──────────────────────────────┬─────────┐
│           kich_hoat          │ so_dong │
├──────────────────────────────┼─────────┤
│ 1. chi khu_vuc               │       5 │
│ 2. khu_vuc + hang            │       6 │
│ 3. toan bo 5 cot nghiep vu   │      18 │
└──────────────────────────────┴─────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select '1. chi khu_vuc' kich_hoat, count(*) so_dong
  from (select distinct khach_id, khu_vuc from khach_hang_lich_su)
union all select '2. khu_vuc + hang', count(*)
  from (select distinct khach_id, khu_vuc, hang from khach_hang_lich_su)
union all select '3. toan bo 5 cot nghiep vu', count(*)
  from (select distinct khach_id, khu_vuc, hang, nhom_tuoi, khoang_thu_nhap, diem_tin_dung
        from khach_hang_lich_su);
```

Cách chọn không phải "cột nào quan trọng" mà là **"thuộc tính nào mà báo cáo về quá khứ
cần đúng theo thời điểm"**. Hỏi từng cột đúng một câu:

> *Nếu cột này đổi, báo cáo tháng trước có được phép đổi số theo không?*

| Cột | Trả lời | Type |
|---|---|---|
| `khu_vuc` | Không — doanh thu chi nhánh cũ phải giữ nguyên | **2** |
| `hang` | Không — chương trình ưu đãi tính theo hạng lúc đó | **2** |
| `ho_ten` | Được — sửa lỗi chính tả thì sửa hết | **1** |
| `nhom_tuoi`, `khoang_thu_nhap` | Cần lịch sử, nhưng đổi nhanh | **mini-dimension** |
| `diem_tin_dung` | Đây là số đo, không phải thuộc tính | **đưa vào fact** |

Số 18 ở dòng 3 là cái giá của việc **không hỏi câu đó** — nhét hết vào Type 2 cho "an
toàn". Nó không an toàn, nó chỉ đắt.

</details>

### Bài B.4 — Hash: hai cái bẫy khi ghép chuỗi

**Đề:** tính hash cho hai bộ giá trị khác nhau nhưng ghép chuỗi ra **giống hệt nhau**,
và một bộ có `NULL`. Chứng minh cả hai đều làm hash sai.

**Đáp số phải ra:**

```text
┌─────────┬─────────┬─────────┬──────────────────────────────────┐
│    a    │    b    │   noi   │             hash_sai             │
├─────────┼─────────┼─────────┼──────────────────────────────────┤
│ Mien    │ Bac     │ MienBac │ 20a4935c32b2fe4c8ab55965e6d4ea4d │
│ M       │ ienBac  │ MienBac │ 20a4935c32b2fe4c8ab55965e6d4ea4d │
└─────────┴─────────┴─────────┴──────────────────────────────────┘
```

Hai dòng, hai bộ giá trị khác nhau, **cùng một hash**. Và bẫy thứ hai:

```text
┌───────────┐
│ hash_null │
├───────────┤
│ NULL      │
└───────────┘
```

<details>
<summary>Lời giải</summary>

```sql
-- BAY 1: noi khong co dau phan cach
select a, b, a||b noi, md5(a||b) hash_sai
from (values ('Mien','Bac'), ('M','ienBac')) t(a,b);

-- BAY 2: mot cot NULL lam ca hash thanh NULL
select md5('Mien Bac' || '|' || null) hash_null;
```

**Bẫy 1 — thiếu dấu phân cách.** `'Mien'||'Bac'` và `'M'||'ienBac'` ra cùng chuỗi
`MienBac`, nên cùng hash. Hai bản ghi khác nhau bị coi là giống nhau → **bỏ sót thay
đổi**. Trên dữ liệu thật, chuyện này xảy ra với mã sản phẩm và mã kho ghép liền.

**Bẫy 2 — `NULL` nuốt cả chuỗi.** `'abc' || NULL` là `NULL` trong SQL, nên `md5(...)`
cũng `NULL`. Và `NULL <> NULL` không bao giờ `true` → mọi dòng có `NULL` đều **không bao
giờ được coi là đã đổi**.

Cách viết đúng, đủ cả hai:

```sql
md5(coalesce(khu_vuc,'~') || '|' || coalesce(hang,'~'))
```

Dấu `|` phải là ký tự **không thể xuất hiện trong dữ liệu**; `~` cho `NULL` phải khác
chuỗi rỗng, vì nếu không thì `NULL` và `''` sẽ cùng hash.

Trong dbt có sẵn macro làm đúng chuyện này:

```sql
{{ dbt_utils.generate_surrogate_key(['khu_vuc', 'hang']) }}
```

Dùng macro thay vì tự nối là cách rẻ nhất để không dẫm phải cả hai bẫy. Xem
[phát hiện thay đổi](../skills/scd-change-detection.md).

</details>

### Bài B.5 — Phát hiện bản ghi **biến mất**

**Đề:** bản trích ngày 05/07 giả sử **không còn** `C4` (khách bị xoá ở nguồn). Viết câu
phát hiện bản ghi biến mất, và trả lời: Type 2 phải làm gì với nó?

**Đáp số phải ra:**

```text
┌──────────┬─────────────┬────────────┐
│ khach_id │ lan_cuoi_co │  ket_luan  │
├──────────┼─────────────┼────────────┤
│ C4       │ 2026-07-04  │ BIEN MAT   │
└──────────┴─────────────┴────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
with ngay_cuoi as (select max(ngay_trich) d from khach_hang_lich_su),
     gia_lap as (select * from khach_hang_lich_su
                 where not (ngay_trich = (select d from ngay_cuoi) and khach_id = 'C4'))
select khach_id, max(ngay_trich) lan_cuoi_co, 'BIEN MAT' ket_luan
from gia_lap group by 1
having max(ngay_trich) < (select d from ngay_cuoi);
```

Đây là lỗ hổng mà **mọi** cách phát hiện thay đổi ở trên đều bỏ lọt. `updated_at`, hash,
so cột — cả ba đều so *dòng hiện có* với *dòng trước*. Dòng **không còn** thì không có gì
để so, nên không có gì được báo.

Hệ quả: khách bị xoá ở nguồn vẫn `la_hien_tai = true` trong dim, **mãi mãi**. Báo cáo
"số khách đang hoạt động" cứ tăng đều và không bao giờ giảm.

Ba cách xử lý, chọn theo nghiệp vụ:

| Cách | Làm gì | Khi nào |
|---|---|---|
| **Soft delete** | đóng phiên bản (`hieu_luc_den` = ngày cuối thấy), `la_hien_tai=false` | mặc định — giữ được lịch sử fact cũ |
| **Cột cờ** | thêm `da_xoa = true`, giữ `la_hien_tai` | khi cần đếm cả khách đã xoá |
| **Xoá thật** | `delete` khỏi dim | **gần như không bao giờ** — fact cũ mất khoá ngoại |

Điều kiện để làm được bất kỳ cách nào: bản trích phải là **full snapshot**. Nếu nguồn chỉ
gửi bản ghi đã đổi (incremental) thì "vắng mặt" không có nghĩa là "bị xoá" — nó chỉ có
nghĩa là "không đổi". Nhầm hai thứ này là xoá sạch dimension.

**Luôn ghi rõ nguồn là full hay incremental, ngay cạnh code nạp.** Xem
[dữ liệu về muộn](../skills/late-arriving.md).

</details>

---

## Bộ C — Mini-dimension

### Bài C.1 — Chứng minh phải tách: 6 × 6 hay 6 + 6

**Đề:** đếm số tổ hợp phân biệt của **cột chậm** (`khu_vuc`, `hang`) và của **cột nhân
khẩu đổi nhanh** (`nhom_tuoi`, `khoang_thu_nhap`, dải `diem_tin_dung`). Rồi so hai kiến
trúc: nhét chung một dim, hay tách hai dim.

**Đáp số phải ra:**

```text
┌───────────────────────────────┬─────────────┬───────┐
│             cach              │ so_dong_dim │ tong  │
├───────────────────────────────┼─────────────┼───────┤
│ Type 2 moi cot (mot dim)      │          18 │    18 │
│ dim cham + mini-dim (hai dim) │           6 │    12 │
└───────────────────────────────┴─────────────┴───────┘
```

18 so với 12 chưa ấn tượng. Câu hỏi thật: **hai con số này lớn lên theo quy luật nào?**

<details>
<summary>Lời giải</summary>

```sql
select 'Type 2 moi cot (mot dim)' cach, 18 so_dong_dim, 18 tong
union all select 'dim cham + mini-dim (hai dim)', 6, (select 6 + count(*) from dim_nhan_khau);
```

Đây là chỗ dữ liệu bé che mất bản chất. Quy luật lớn lên khác hẳn nhau:

```text
mot dim  :  so_ban_cham  ×  so_to_hop_nhan_khau     ← NHAN
hai dim  :  so_ban_cham  +  so_to_hop_nhan_khau     ← CONG
```

Với `S` bản chậm và `M` tổ hợp nhân khẩu:

| | 6 × 6 | 1 triệu khách × 50 tổ hợp |
|---|---|---|
| Một dim (nhân) | 36 | **50 triệu dòng** |
| Hai dim (cộng) | 12 | **1.000.050 dòng** |

Nhân so với cộng — đó mới là lý do mini-dimension tồn tại, không phải "tiết kiệm 6 dòng".

Và tổ hợp nhân khẩu **có trần**: `nhom_tuoi` (5) × `khoang_thu_nhap` (4) × dải điểm (5)
= tối đa 100 dòng, **bất kể có bao nhiêu khách**. Mini-dimension là bảng nhỏ và đứng yên,
trong khi dim khách vẫn to.

</details>

### Bài C.2 — Dựng mini-dimension bằng cách phân khoảng

**Đề:** dựng `dim_nhan_khau` chứa mọi tổ hợp phân biệt của `nhom_tuoi`,
`khoang_thu_nhap`, và `diem_tin_dung` **đã phân dải** (`600-699`, `700-749`, `750-799`,
`800-849`).

**Đáp số phải ra:**

```text
┌───────────────┬───────────┬─────────────────┬──────────┐
│ nhan_khau_key │ nhom_tuoi │ khoang_thu_nhap │ dai_diem │
├───────────────┼───────────┼─────────────────┼──────────┤
│             1 │ 25-34     │ 10-20tr         │ 700-749  │
│             2 │ 25-34     │ 20-30tr         │ 700-749  │
│             3 │ 25-34     │ tren-30tr       │ 800-849  │
│             4 │ 35-44     │ 20-30tr         │ 750-799  │
│             5 │ 45-54     │ 10-20tr         │ 700-749  │
│             6 │ 45-54     │ 5-10tr          │ 600-699  │
└───────────────┴───────────┴─────────────────┴──────────┘
```

**6 dòng.** Nếu không phân dải mà để `diem_tin_dung` thô, bạn sẽ ra 18.

<details>
<summary>Lời giải</summary>

```sql
create or replace table dim_nhan_khau as
select row_number() over (order by nhom_tuoi, khoang_thu_nhap, dai_diem) nhan_khau_key, *
from (select distinct nhom_tuoi, khoang_thu_nhap,
             case when diem_tin_dung < 700 then '600-699'
                  when diem_tin_dung < 750 then '700-749'
                  when diem_tin_dung < 800 then '750-799'
                  else '800-849' end dai_diem
      from khach_hang_lich_su);

select * from dim_nhan_khau order by nhan_khau_key;
```

**Phân dải là cả kỹ thuật.** `diem_tin_dung` thô có 18 giá trị trong 5 ngày và sẽ có
hàng trăm giá trị trong một năm — mini-dimension mất luôn tính "nhỏ và đứng yên". Phân
thành 4 dải thì trần cố định vĩnh viễn.

Ba luật khi phân dải:

1. **Dải phải do nghiệp vụ đặt, không do phân vị dữ liệu.** Dải theo `ntile(4)` sẽ **đổi
   ranh giới mỗi lần chạy lại**, và báo cáo cũ không dựng lại được.
2. **Dải phải phủ kín, kể cả ngoài biên.** `else '800-849'` ở trên là bug chờ nổ — điểm
   900 sẽ rơi nhầm vào dải đó. Viết `else 'tren-800'`.
3. **Đổi dải là đổi khoá.** Thêm một dải là sinh khoá mới cho mọi tổ hợp liên quan; fact
   cũ vẫn trỏ khoá cũ. Nên bảng dải cũng cần lịch sử phiên bản nếu nghiệp vụ hay đổi.

</details>

### Bài C.3 — Fact trỏ hai khoá, và câu hỏi mà một dim không trả được

**Đề:** dựng fact bán hàng trỏ **cả hai** khoá — `khach_key` (dim chậm) và
`nhan_khau_key` (mini-dim) tại thời điểm đặt hàng. Rồi tính doanh thu theo `dai_diem`.

**Đáp số phải ra:**

```text
┌──────────┬────────┬───────────┐
│ dai_diem │ so_don │ doanh_thu │
├──────────┼────────┼───────────┤
│ 600-699  │      1 │   1200000 │
│ 700-749  │      4 │   3645000 │
│ 750-799  │      3 │   3720000 │
│ 800-849  │      2 │   1650000 │
└──────────┴────────┴───────────┘
```

Tổng 4 dòng = **10.215.000**, và tổng `so_don` = 10. Thiếu dải `600-699` nghĩa là bạn
đang join theo dải **hiện tại** của khách chứ không phải dải lúc đặt hàng.

<details>
<summary>Lời giải</summary>

```sql
with lich as (
  select ngay_trich, khach_id,
         case when diem_tin_dung < 700 then '600-699'
              when diem_tin_dung < 750 then '700-749'
              when diem_tin_dung < 800 then '750-799'
              else '800-849' end dai_diem,
         nhom_tuoi, khoang_thu_nhap
  from khach_hang_lich_su),
tien as (select h.don_hang_id, h.khach_id, h.ngay_dat, sum(ct.so_luong*ct.don_gia) tien
         from don_hang h join don_hang_chi_tiet ct using (don_hang_id) group by 1,2,3)
select nk.dai_diem, count(*) so_don, sum(t.tien) doanh_thu
from tien t
join lich l on l.khach_id = t.khach_id and l.ngay_trich = t.ngay_dat
join dim_nhan_khau nk on nk.nhom_tuoi = l.nhom_tuoi
                     and nk.khoang_thu_nhap = l.khoang_thu_nhap
                     and nk.dai_diem = l.dai_diem
group by 1 order by 1;
```

Điểm mấu chốt: fact chốt `nhan_khau_key` **tại ngày đặt hàng**, giống hệt cách nó chốt
`khach_key`. Nhờ đó câu *"khách lúc mua thuộc dải điểm nào"* trả lời được **mà dim khách
không phải phình một dòng nào**.

Đây cũng là câu mà Type 1 trên `diem_tin_dung` **không** trả lời được: ghi đè thì chỉ còn
điểm hiện tại, và mọi đơn cũ đều bị gán theo điểm hôm nay.

Ba khả năng, ba kiến trúc:

| Câu hỏi | Cần gì |
|---|---|
| "Khách này **giờ** thuộc dải nào?" | Type 1 là đủ |
| "Lúc **mua** thì thuộc dải nào?" | mini-dim + khoá trong fact |
| "Điểm của khách này **diễn biến ra sao**?" | fact riêng cho điểm tín dụng |

Dòng thứ ba là lời nhắc: khi câu hỏi bắt đầu bằng *"diễn biến"*, thứ bạn cần là một
**fact table**, không phải dimension.

</details>

### Bài C.4 — Mini-dimension làm mất khả năng gì

**Đề:** không có SQL. Trả lời: sau khi tách `nhom_tuoi` sang mini-dimension, câu truy vấn
nào **khó hơn hẳn** so với để chung một bảng?

<details>
<summary>Lời giải</summary>

Ba thứ mất đi:

**1. Lọc kết hợp chậm × nhanh không còn một bảng.** Câu *"khách hạng Kim cương thuộc
nhóm tuổi 25-34"* trước chỉ cần `where` trên một dim; giờ phải qua fact để nối hai dim:

```sql
-- khong con lam duoc truc tiep tren dim
select count(distinct f.khach_key)
from fct_ban_hang f
join dim_khach_t2 d  on d.khach_key = f.khach_key
join dim_nhan_khau n on n.nhan_khau_key = f.nhan_khau_key
where d.hang = 'Kim cuong' and n.nhom_tuoi = '25-34';
```

Và câu này chỉ đếm được khách **có giao dịch**. Khách hạng Kim cương chưa mua gì thì
không có dòng fact nào, nên **biến mất khỏi kết quả**. Đó là thay đổi ngữ nghĩa, không
chỉ là cú pháp dài hơn.

**2. Người dùng BI phải hiểu vì sao có hai bảng khách.** Đây là cái giá thật và hay bị
bỏ qua. Trong công cụ kéo-thả, hai dimension cùng nói về khách hàng là nguồn nhầm lẫn
vĩnh viễn.

**3. Trạng thái nhân khẩu "hiện tại" của một khách không còn nằm ở đâu cả.** Nó chỉ tồn
tại như khoá trên các dòng fact.

Cách chữa cho cả ba: thêm `nhan_khau_key_hien_tai` vào dim khách — con trỏ tới tổ hợp
mới nhất. Đó là **Type 4 với outrigger**, và nó phục hồi cả ba khả năng trên với giá là
một cột phải cập nhật.

**Kết luận thực dụng:** mini-dimension là **giải pháp cho vấn đề quy mô**. Chưa đo được
dim phình thì đừng tách — bạn đang trả giá phức tạp cho một vấn đề chưa có.
Xem [Mini-dimension](../skills/mini-dimension.md).

</details>

---

## Bộ D — Role-playing dimension

### Bài D.1 — Một `dim_ngay`, ba vai trong một câu

**Đề:** join `don_hang` với `dim_ngay` **ba lần** — `ngay_dat`, `ngay_giao`, `ngay_nhan` —
rồi tính số ngày xử lý và số ngày vận chuyển.

**Đáp số phải ra:**

```text
┌─────────────┬────────────┬────────────┬────────────┬────────────┬─────────────────┐
│ don_hang_id │  ngay_dat  │ ngay_giao  │ ngay_nhan  │ ngay_xu_ly │ ngay_van_chuyen │
├─────────────┼────────────┼────────────┼────────────┼────────────┼─────────────────┤
│ DH001       │ 2026-07-01 │ 2026-07-03 │ 2026-07-05 │          2 │               2 │
│ DH002       │ 2026-07-01 │ 2026-07-02 │ 2026-07-04 │          1 │               2 │
│ DH003       │ 2026-07-02 │ 2026-07-05 │ 2026-07-09 │          3 │               4 │
│ DH004       │ 2026-07-02 │ 2026-07-04 │ NULL       │          2 │            NULL │
│ DH005       │ 2026-07-03 │ 2026-07-06 │ 2026-07-08 │          3 │               2 │
│ DH006       │ 2026-07-03 │ NULL       │ NULL       │       NULL │            NULL │
│ DH007       │ 2026-07-04 │ 2026-07-07 │ 2026-07-10 │          3 │               3 │
│ DH008       │ 2026-07-04 │ 2026-07-06 │ NULL       │          2 │            NULL │
│ DH009       │ 2026-07-05 │ NULL       │ NULL       │       NULL │            NULL │
│ DH010       │ 2026-07-05 │ 2026-07-08 │ 2026-07-11 │          3 │               3 │
└─────────────┴────────────┴────────────┴────────────┴────────────┴─────────────────┘
```

Dùng `left join`. Đổi sang `join` thường là mất bao nhiêu đơn?

<details>
<summary>Lời giải</summary>

```sql
select h.don_hang_id, dd.ngay ngay_dat, dg.ngay ngay_giao, dn.ngay ngay_nhan,
       dg.ngay - dd.ngay ngay_xu_ly, dn.ngay - dg.ngay ngay_van_chuyen
from don_hang h
left join dim_ngay dd on dd.ngay = h.ngay_dat
left join dim_ngay dg on dg.ngay = h.ngay_giao
left join dim_ngay dn on dn.ngay = h.ngay_nhan
order by 1;
```

Đổi sang `join` thường thì **mất 4 đơn** — mọi đơn chưa nhận (`DH004`, `DH006`, `DH008`,
`DH009`) biến khỏi báo cáo. Với accumulating snapshot, đơn *chưa hoàn tất* chính là đơn
người ta quan tâm nhất, nên `inner join` ở đây là lỗi nghiêm trọng.

Hai cách làm role-playing sạch hơn viết alias mỗi lần:

```sql
-- (a) view cho tung vai — nguoi dung BI thay ba bang ro rang
create or replace view dim_ngay_dat as
  select ngay_key ngay_dat_key, ngay ngay_dat, thang thang_dat,
         la_ngay_lam_viec ngay_dat_la_ngay_lam_viec from dim_ngay;

-- (b) khoa -1 thay cho NULL, roi join thuong duoc an toan
select coalesce(cast(strftime(ngay_giao,'%Y%m%d') as int), -1) ngay_giao_key from don_hang;
```

Cách (a) quan trọng hơn vẻ ngoài: nếu ba vai cùng dùng tên cột `thang`, người dùng kéo
"Tháng" vào báo cáo mà **không biết mình đang lấy tháng nào**. Đổi tên cột theo vai là
cách duy nhất để lỗi đó không xảy ra. Xem
[Role-playing dimension](../skills/role-playing-dimension.md).

</details>

### Bài D.2 — Ngày lịch và ngày làm việc: `DH003` chênh 3 lần

**Đề:** với các đơn đã giao, tính **song song** số ngày lịch và số **ngày làm việc** giữa
đặt và giao, dùng cột `la_ngay_lam_viec` của `dim_ngay`.

**Đáp số phải ra:**

```text
┌─────────────┬────────────┬────────────┬───────────┬───────────────┐
│ don_hang_id │  ngay_dat  │ ngay_giao  │ ngay_lich │ ngay_lam_viec │
├─────────────┼────────────┼────────────┼───────────┼───────────────┤
│ DH001       │ 2026-07-01 │ 2026-07-03 │         2 │             2 │
│ DH002       │ 2026-07-01 │ 2026-07-02 │         1 │             1 │
│ DH003       │ 2026-07-02 │ 2026-07-05 │         3 │             1 │
│ DH004       │ 2026-07-02 │ 2026-07-04 │         2 │             1 │
│ DH005       │ 2026-07-03 │ 2026-07-06 │         3 │             1 │
│ DH007       │ 2026-07-04 │ 2026-07-07 │         3 │             2 │
│ DH008       │ 2026-07-04 │ 2026-07-06 │         2 │             1 │
│ DH010       │ 2026-07-05 │ 2026-07-08 │         3 │             3 │
└─────────────┴────────────┴────────────┴───────────┴───────────────┘
```

`DH003` mất **3 ngày lịch nhưng chỉ 1 ngày làm việc**. Hai con số này dẫn tới hai kết
luận trái ngược về hiệu suất giao hàng.

<details>
<summary>Lời giải</summary>

```sql
select h.don_hang_id, h.ngay_dat, h.ngay_giao,
       h.ngay_giao - h.ngay_dat ngay_lich,
       (select count(*) from dim_ngay d
        where d.ngay > h.ngay_dat and d.ngay <= h.ngay_giao and d.la_ngay_lam_viec) ngay_lam_viec
from don_hang h where h.ngay_giao is not null order by 1;
```

Đây là lý do **`dim_ngay` phải là một bảng, không phải hàm ngày tháng**. Không hàm SQL
nào biết 04/07 và 05/07 là ngày nghỉ — đó là **dữ liệu**, và nó khác nhau theo từng
quốc gia, từng công ty, từng năm.

Trung bình cộng phơi bày rõ hơn nữa: `avg(ngay_lich)` = 2,5 còn `avg(ngay_lam_viec)`
= 1,5. Cam kết SLA *"giao trong 2 ngày"* — đạt hay không đạt hoàn toàn phụ thuộc vào việc
đếm kiểu nào, và **hợp đồng thường không nói rõ**.

Chú ý điều kiện `d.ngay > h.ngay_dat and d.ngay <= h.ngay_giao`: mở đầu, đóng cuối. Dùng
`between` là đếm cả ngày đặt → mọi đơn dôi thêm 1 ngày. Sai lệch một đơn vị kiểu này
không bao giờ lộ ra khi nhìn tổng.

Xem [Date dimension](../reference/date-dimension.md).

</details>

### Bài D.3 — Dimension tự đóng hai vai: nhân viên và quản lý

**Đề:** `nhan_vien` có `nv_quan_ly_id` trỏ về chính bảng đó. Liệt kê mỗi nhân viên kèm
tên và cấp bậc quản lý.

**Đáp số phải ra:**

```text
┌─────────┬───────────┬─────────────┬────────────┬─────────────┐
│  nv_id  │ nhan_vien │   cap_bac   │  quan_ly   │ cap_bac_ql  │
├─────────┼───────────┼─────────────┼────────────┼─────────────┤
│ NV01    │ Vu Van E  │ Nhan vien   │ Do Thi F   │ Truong nhom │
│ NV02    │ Do Thi F  │ Truong nhom │ Ngo Thi H  │ Giam doc    │
│ NV03    │ Bui Van G │ Nhan vien   │ Ngo Thi H  │ Giam doc    │
│ NV04    │ Ngo Thi H │ Giam doc    │ (khong co) │ -           │
└─────────┴───────────┴─────────────┴────────────┴─────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select nv.nv_id, nv.ho_ten nhan_vien, nv.cap_bac,
       coalesce(ql.ho_ten,'(khong co)') quan_ly,
       coalesce(ql.cap_bac,'-') cap_bac_ql
from nhan_vien nv
left join nhan_vien ql on ql.nv_id = nv.nv_quan_ly_id
order by nv.nv_id;
```

Khác biệt với `dim_ngay` ba vai: ở đây hai vai nằm trên **cùng một bảng**, nối bằng khoá
tự tham chiếu. Kỹ thuật giống nhau (alias + `left join`), nhưng cái bẫy khác:

**`left join` là bắt buộc.** `NV04` không có quản lý; `inner join` là mất giám đốc khỏi
mọi báo cáo — và giám đốc thường chính là dòng người ta muốn xem.

**Chỉ đi được một cấp.** Câu này trả lời "quản lý trực tiếp là ai", không trả lời được
"tất cả cấp trên" hay "tổng doanh thu cả cây dưới quyền NV04". Cho việc đó cần recursive
CTE hoặc bridge cây phân cấp — bài của [bộ 4](bt-04-quan-he-va-cay.md).

Trong mô hình chiều, `nv_quan_ly_id` nên là **outrigger** trỏ tới cùng `dim_nhan_vien`.
Đừng chuẩn hoá thành bảng `dim_quan_ly` riêng — đó là cùng một tập thực thể, và tách ra
là hai bảng phải giữ đồng bộ.

</details>

### Bài D.4 — Vai nào cũng đúng, chỉ là trả lời câu khác

**Đề:** đếm số đơn theo tháng **ba lần**, mỗi lần theo một vai ngày khác nhau. Ba kết quả
phải khác nhau — giải thích mỗi con số trả lời câu hỏi nào.

**Đáp số phải ra:**

```text
┌───────────────┬────────┐
│      vai      │ so_don │
├───────────────┼────────┤
│ theo ngay dat │     10 │
│ theo ngay giao│      8 │
│ theo ngay nhan│      6 │
└───────────────┴────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select 'theo ngay dat' vai, count(ngay_dat) so_don from don_hang
union all select 'theo ngay giao', count(ngay_giao) from don_hang
union all select 'theo ngay nhan', count(ngay_nhan) from don_hang;
```

**10 / 8 / 6.** Ba con số, không con nào sai:

| Vai | Trả lời | Ai hỏi |
|---|---|---|
| `ngay_dat` | "Tháng 7 nhận được bao nhiêu đơn?" | kinh doanh, marketing |
| `ngay_giao` | "Tháng 7 xuất kho bao nhiêu đơn?" | vận hành, kho |
| `ngay_nhan` | "Tháng 7 ghi nhận doanh thu mấy đơn?" | kế toán |

Đây là nguồn của một loại tranh cãi rất tốn thời gian: kế toán bảo tháng 7 có 6 đơn,
kinh doanh bảo có 10, và **cả hai đều đúng**. Cuộc họp đó chỉ kết thúc khi ai đó hỏi
"chúng ta đang đếm theo ngày nào".

Cách phòng, rẻ và hiệu quả: **không bao giờ để một cột tên là `ngay` hay `thang` trên
báo cáo**. Luôn là `thang_dat_hang`, `thang_giao_hang`, `thang_ghi_nhan`. Tên dài hơn
đổi lấy việc không ai phải hỏi lại.

Xem [case study hai phòng hai doanh thu](../case-studies/hai-phong-hai-doanh-thu.md).

</details>

---

## Bộ E — Dữ liệu về muộn

### Bài E.1 — Fact về muộn: gán khoá theo thời điểm nào

**Đề:** ba dòng fact về muộn (`DHX1` C1 ngày 02/07, `DHX2` C3 ngày 01/07, `DHX3` C9 ngày
03/07). Gán `khach_key` **hai cách** — as-of theo `ngay_dat`, và theo bản hiện tại — rồi
đặt cạnh nhau.

```sql
create or replace table fct_den_muon as
select * from (values ('DHX1','C1', date '2026-07-02', 500000),
                      ('DHX2','C3', date '2026-07-01', 300000),
                      ('DHX3','C9', date '2026-07-03', 700000))
t(don_hang_id, khach_id, ngay_dat, tien);
```

**Đáp số phải ra:**

```text
┌─────────────┬──────────┬────────────┬────────────┬──────────────┬────────────────┬──────────────────┐
│ don_hang_id │ khach_id │  ngay_dat  │ as_of_DUNG │ hien_tai_SAI │ khu_vuc_as_of  │ khu_vuc_hien_tai │
├─────────────┼──────────┼────────────┼────────────┼──────────────┼────────────────┼──────────────────┤
│ DHX1        │ C1       │ 2026-07-02 │          1 │            2 │ Mien Bac       │ Mien Nam         │
│ DHX2        │ C3       │ 2026-07-01 │          4 │            5 │ Mien Trung     │ Mien Trung       │
│ DHX3        │ C9       │ 2026-07-03 │         -1 │           -1 │ Khong xac dinh │ Khong xac dinh   │
└─────────────┴──────────┴────────────┴────────────┴──────────────┴────────────────┴──────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select f.don_hang_id, f.khach_id, f.ngay_dat,
  coalesce((select d.khach_key from dim_khach_t2 d
            where d.khach_id = f.khach_id
              and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den), -1) as_of_DUNG,
  coalesce((select d.khach_key from dim_khach_t2 d
            where d.khach_id = f.khach_id and d.la_hien_tai), -1) hien_tai_SAI,
  coalesce((select d.khu_vuc from dim_khach_t2 d
            where d.khach_id = f.khach_id
              and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den), 'Khong xac dinh') khu_vuc_as_of,
  coalesce((select d.khu_vuc from dim_khach_t2 d
            where d.khach_id = f.khach_id and d.la_hien_tai), 'Khong xac dinh') khu_vuc_hien_tai
from fct_den_muon f order by 1;
```

Ba dòng, ba bài học:

**`DHX1` — chỗ sai duy nhất, và nó im lặng.** Đơn xảy ra 02/07, lúc đó C1 còn ở Miền Bắc
(`khach_key` = 1). Gán theo bản hiện tại là `khach_key` = 2, Miền Nam. Doanh thu 500.000
chạy nhầm chi nhánh — **không lỗi, không cảnh báo, tổng vẫn đúng**.

**`DHX2` — hai cách ra khoá khác nhau nhưng khu vực giống nhau.** C3 có 2 phiên bản
(khoá 4 và 5) nhưng đổi `hang`, không đổi `khu_vuc`. Báo cáo theo khu vực không thấy
khác biệt; báo cáo theo hạng khách thì có. **Lỗi chỉ hiện trên báo cáo bạn không kiểm.**

**`DHX3` — khách không tồn tại.** Cả hai cách đều ra `-1`, và đó là hành vi đúng: dòng
fact vẫn được nạp, tiền vẫn vào tổng, chỉ là chưa quy được về khách nào.

Luật: **fact về muộn phải tra dimension theo ngày của sự kiện, không phải ngày nạp.** Đó
chính là lý do dimension Type 2 phải giữ khoảng hiệu lực — không có nó thì không có
"lúc đó" để tra.

Xem [Dữ liệu về muộn](../skills/late-arriving.md) và
[case study fact đến muộn gán sai khu vực](../case-studies/fact-den-muon-gan-sai-khu-vuc.md).

</details>

### Bài E.2 — `inner join` nuốt mất 46,7% tiền

**Đề:** đo thiệt hại khi nạp `fct_den_muon` bằng `inner join` vào dimension thay vì
`left join` + khoá `-1`.

**Đáp số phải ra:**

```text
┌──────────┬────────────┬──────────┬────────────────┐
│ fact_goc │ inner_join │ tien_goc │ tien_sau_inner │
├──────────┼────────────┼──────────┼────────────────┤
│        3 │          2 │  1500000 │         800000 │
└──────────┴────────────┴──────────┴────────────────┘
```

**700.000 trên 1.500.000 bốc hơi — 46,7%.**

<details>
<summary>Lời giải</summary>

```sql
select (select count(*) from fct_den_muon) fact_goc,
       (select count(*) from fct_den_muon f join dim_khach_t2 d
         on d.khach_id = f.khach_id
        and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den) inner_join,
       (select sum(tien) from fct_den_muon) tien_goc,
       (select sum(f.tien) from fct_den_muon f join dim_khach_t2 d
         on d.khach_id = f.khach_id
        and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den) tien_sau_inner;
```

`DHX3` (khách `C9`) không có trong dimension nên `inner join` loại thẳng. Trên hệ thống
thật, `C9` là khách vừa đăng ký sáng nay mà job nạp dimension chạy lúc nửa đêm — **không
hiếm chút nào, mà là chuyện thường ngày**.

Cách nạp đúng, hai bước:

```sql
-- 1. luon left join, khong khop thi -1
insert into fct_ban_hang
select f.don_hang_id, coalesce(d.khach_key, -1) khach_key, f.tien
from staging_fact f
left join dim_khach_t2 d on d.khach_id = f.khach_id
                        and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den;

-- 2. test canh bao khi -1 vuot nguong
select count(*) so_dong_mo_coi from fct_ban_hang where khach_key = -1;
```

Bước 2 mới là phần quan trọng: `-1` **không phải chỗ giấu rác**. Nó là hàng đợi. Có
`-1` thì phải có cảnh báo, và phải có job đối chiếu lại khi dimension bắt kịp
(*late-arriving dimension*).

Không có cảnh báo thì `-1` âm thầm nuốt dữ liệu y hệt `inner join`, chỉ khác là tổng
tiền vẫn đúng nên còn khó phát hiện hơn.

</details>

### Bài E.3 — Dimension về muộn: vá lại khoá `-1`

**Đề:** giả sử `C9` xuất hiện trong dimension **sau khi** fact đã nạp với `-1`. Viết câu
`update` vá lại đúng phiên bản theo `ngay_dat`, và câu kiểm trước/sau.

<details>
<summary>Lời giải</summary>

```sql
-- 1. dimension bat kip: C9 xuat hien
insert into dim_khach_t2
select 7, 'C9', 'Khach moi', 'Mien Nam', 'Bac', date '2026-07-01', date '9999-12-31', true;

-- 2. dem truoc khi va
select count(*) filter (where khach_key = -1) mo_coi_truoc from fct_den_muon_da_gan;

-- 3. va lai, van theo as-of chu khong lay ban hien tai
update fct_den_muon_da_gan f
set khach_key = (select d.khach_key from dim_khach_t2 d
                 where d.khach_id = f.khach_id
                   and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den)
where f.khach_key = -1
  and exists (select 1 from dim_khach_t2 d
              where d.khach_id = f.khach_id
                and f.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den);

-- 4. dem lai
select count(*) filter (where khach_key = -1) mo_coi_sau from fct_den_muon_da_gan;
```

Ba chi tiết quyết định đúng/sai:

**Vẫn phải as-of ở bước 3.** Cám dỗ lớn nhất khi vá là lấy đại bản hiện tại cho xong.
Làm thế là tái lập đúng lỗi của bài E.1, chỉ chậm hơn vài ngày.

**`exists` là bắt buộc.** Thiếu nó thì những dòng vẫn chưa khớp bị `update` thành `NULL`
— tệ hơn `-1`, vì `-1` còn đếm được.

**Khoảng hiệu lực của bản ghi đến muộn phải lùi về quá khứ.** `hieu_luc_tu` là ngày khách
**thật sự bắt đầu tồn tại** (01/07), không phải ngày dimension biết về khách (hôm nay).
Đặt sai là fact cũ mãi mãi không khớp được.

Điểm cuối cùng: `update` trên fact table lớn là thao tác đắt. Nên nhiều nơi chọn cách
khác — **để nguyên `-1`, và join qua một bảng ánh xạ** cập nhật hàng ngày. Đổi chi phí
ghi lấy chi phí đọc; chọn cái nào tuỳ tần suất hai bên.

</details>

### Bài E.4 — Fact về muộn làm báo cáo đã chốt đổi số

**Đề:** không có SQL. Đơn `DHX1` (500.000, ngày 02/07) về vào ngày 10/07, sau khi báo cáo
tháng đã gửi cho ban giám đốc. Liệt kê các lựa chọn và hệ quả.

<details>
<summary>Lời giải</summary>

Ba lựa chọn, không cái nào miễn phí:

| Cách | Báo cáo 02/07 | Ưu | Nhược |
|---|---|---|---|
| **Nạp về đúng ngày sự kiện** | đổi từ X thành X+500.000 | số luôn phản ánh sự thật | báo cáo đã gửi **tự đổi số** |
| **Nạp vào ngày phát hiện (10/07)** | giữ nguyên | báo cáo đã gửi bất biến | 02/07 sai vĩnh viễn |
| **Hai cột ngày** | tuỳ cột người đọc chọn | đúng cả hai | mô hình phức tạp hơn, phải dạy người dùng |

Cách thứ ba là cách các hệ thống tài chính dùng, và nó có tên: **bi-temporal**. Fact giữ
hai trục thời gian độc lập:

```text
ngay_su_kien   = 2026-07-02   ← chuyen do xay ra khi nao
ngay_ghi_nhan  = 2026-07-10   ← ta biet ve no khi nao
```

Có hai cột đó thì trả lời được cả ba câu, kể cả câu khó nhất:

```sql
-- "bao cao 02/07 nhu ta da thay no vao ngay 05/07" — dung lai bao cao da gui
select sum(tien) from fct_ban_hang
where ngay_su_kien = date '2026-07-02' and ngay_ghi_nhan <= date '2026-07-05';
```

Câu trên là thứ cứu bạn khi có người hỏi *"tuần trước báo cáo này ghi số khác, ai sửa?"*.
Không có `ngay_ghi_nhan` thì câu hỏi đó **không trả lời được** — và đó là một cuộc điều
tra vô vọng, không phải một truy vấn.

**Quy tắc:** fact có thể về muộn (thanh toán, trả hàng, điều chỉnh kế toán) thì cần cả
hai trục ngay từ đầu. Thêm `ngay_ghi_nhan` sau khi đã có 2 năm dữ liệu là không thể — dữ
liệu quá khứ không có thông tin đó.

Xem [Dữ liệu về muộn](../skills/late-arriving.md) và
[case study số hôm nay nhảy suốt ngày](../case-studies/so-hom-nay-nhay-suot-ngay.md).

</details>

---

## Bảng đối chiếu nhanh

| Số | Nghĩa | Bài |
|---|---|---|
| 4 / 6 / 18 | Type 1 / Type 2 cột chậm / Type 2 mọi cột | A.1 |
| 4.200.000 vs 1.650.000 | Miền Bắc as-was vs as-is, lệch 2,55 triệu | A.2 |
| 0 / 0 / 0 | chồng lấn / sai số bản hiện tại / chỗ hở | A.3 |
| 2 thật · 3 báo · 1 sót · 2 thừa | `updated_at` so với sự thật | B.1 |
| 6 tổ hợp nhân khẩu | mini-dim: cộng thay vì nhân | C.1, C.2 |
| 10 / 8 / 6 | đếm đơn theo ba vai ngày | D.4 |
| 3 vs 1 ngày | `DH003` lịch so với ngày làm việc | D.2 |
| khoá 1 chứ không phải 2 | fact về muộn phải tra as-of | E.1 |
| 700.000 / 46,7% | `inner join` nuốt fact mồ côi | E.2 |

## Related Topics

- [Bài tập bộ 1 — Nền tảng](bt-01-nen-tang.md) — bộ trước
- [Bài tập bộ 3 — Cột và bảng](bt-03-cot-va-bang.md) — bộ tiếp theo
- [Phụ lục seed](bt-00-seed.md) — `khach_hang_lich_su` và ba kiểu `updated_at` nói dối
- [Kỹ năng — Data Modeling](../skills/index.md) — lý thuyết của năm kỹ thuật trên
