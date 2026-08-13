---
title: "Bài tập bộ 1 — Nền tảng: grain, fact/dim, surrogate key, star/OBT"
i18n_status: untranslated
sidebar_position: 10
description: "23 bài tự viết cho 5 kỹ thuật nền: khai grain 7 bảng, phân loại số đo, sinh surrogate key, so star với OBT, chạy đủ quy trình 4 bước."
tags: [tutorial, bai-tap, grain, fact-and-dimension, surrogate-key, star-schema, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Bài tập bộ 1 — Nền tảng

> **Chốt:** năm kỹ thuật trong bộ này là thứ mọi bài sau đều giả định bạn đã có. Không
> khai được grain thì mọi con số phía sau đều là số may rủi.

## Kỹ thuật được luyện trong bộ này

| # | Kỹ thuật | Tài liệu gốc | Số bài |
|---|---|---|---|
| 1 | Grain | [Grain](../reference/grain.md) | 5 |
| 2 | Fact và Dimension | [Fact và Dimension](../reference/fact-and-dimension.md) | 5 |
| 3 | Surrogate key | [Surrogate key và Natural key](../reference/surrogate-key.md) | 5 |
| 4 | Star / Snowflake / OBT | [Star, Snowflake và One Big Table](../reference/star-snowflake-obt.md) | 4 |
| 5 | Quy trình thiết kế 4 bước | [Quy trình thiết kế 4 bước](../reference/design-process.md) | 4 |

## Cách dùng

Mỗi bài có ba phần: **Đề** → **Đáp số phải ra** → **Lời giải** giấu trong `<details>`.

Viết SQL của bạn trước. So số. Trùng thì mở lời giải để đối chiếu cách làm; lệch thì
sửa cho tới khi trùng. **Mở lời giải trước khi thử là đọc, không phải luyện.**

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

Dữ liệu: [seed dùng chung](index.md#dữ-liệu-dùng-chung-cho-lab-27) cộng mười bảng mới ở
[phụ lục seed](bt-00-seed.md). Bốn số mốc không đổi:

```text
10 don · 15 dong · doanh thu 10.215.000 · phi ship 400.000
```

---

## Bộ A — Grain

### Bài A.1 — Khai grain cho cả bảy bảng, và chứng minh

**Đề:** viết **một** câu duy nhất trả về, cho mỗi bảng: số dòng, số khoá tổ hợp phân
biệt, và cột boolean kết luận grain đã khai có đúng không. Bảy bảng: `don_hang`,
`don_hang_chi_tiet`, `nhan_vien_don`, `kho_hang`, `ty_gia`, `khach_hang_lich_su`,
`su_kien_web`.

Trước khi viết SQL, tự khai grain bằng lời cho từng bảng — **một dòng của bảng này đại
diện cho cái gì**. Rồi mới dịch câu đó thành `count(distinct ...)`.

**Đáp số phải ra:**

```text
┌────────────────────┬─────────┬─────────┬────────────┐
│        bang        │ so_dong │ so_khoa │ grain_dung │
├────────────────────┼─────────┼─────────┼────────────┤
│ don_hang           │      10 │      10 │ true       │
│ don_hang_chi_tiet  │      15 │      15 │ true       │
│ khach_hang_lich_su │      20 │      20 │ true       │
│ kho_hang           │      20 │      20 │ true       │
│ nhan_vien_don      │      17 │      17 │ true       │
│ su_kien_web        │      43 │      43 │ true       │
│ ty_gia             │      19 │      19 │ true       │
└────────────────────┴─────────┴─────────┴────────────┘
```

Cả bảy cột `grain_dung` phải là `true`. Cái nào `false` nghĩa là **grain bạn khai sai**,
không phải dữ liệu sai.

<details>
<summary>Lời giải</summary>

```sql
select 'don_hang' bang, count(*) so_dong, count(distinct don_hang_id) so_khoa,
       count(*)=count(distinct don_hang_id) grain_dung from don_hang
union all select 'don_hang_chi_tiet', count(*), count(distinct (don_hang_id,dong)),
       count(*)=count(distinct (don_hang_id,dong)) from don_hang_chi_tiet
union all select 'nhan_vien_don', count(*), count(distinct (don_hang_id,nv_id)),
       count(*)=count(distinct (don_hang_id,nv_id)) from nhan_vien_don
union all select 'kho_hang', count(*), count(distinct (ngay,ma_hang)),
       count(*)=count(distinct (ngay,ma_hang)) from kho_hang
union all select 'ty_gia', count(*), count(distinct (ngay,tien_te)),
       count(*)=count(distinct (ngay,tien_te)) from ty_gia
union all select 'khach_hang_lich_su', count(*), count(distinct (ngay_trich,khach_id)),
       count(*)=count(distinct (ngay_trich,khach_id)) from khach_hang_lich_su
union all select 'su_kien_web', count(*), count(distinct su_kien_id),
       count(*)=count(distinct su_kien_id) from su_kien_web
order by 1;
```

Grain bằng lời, đối chiếu với khoá:

| Bảng | Một dòng là | Khoá |
|---|---|---|
| `don_hang` | một đơn hàng | `don_hang_id` |
| `don_hang_chi_tiet` | một dòng hàng trong một đơn | `(don_hang_id, dong)` |
| `nhan_vien_don` | một nhân viên tham gia một đơn | `(don_hang_id, nv_id)` |
| `kho_hang` | tồn cuối ngày của một mặt hàng | `(ngay, ma_hang)` |
| `ty_gia` | tỷ giá của một đồng tiền một ngày | `(ngay, tien_te)` |
| `khach_hang_lich_su` | ảnh chụp một khách một ngày | `(ngay_trich, khach_id)` |
| `su_kien_web` | một sự kiện | `su_kien_id` |

**Câu quan trọng nhất:** ba bảng có khoá tổ hợp gồm một cột thời gian
(`kho_hang`, `ty_gia`, `khach_hang_lich_su`). Đó là dấu hiệu bảng **snapshot** — cùng
một thực thể lặp lại mỗi kỳ. Cộng thẳng qua các kỳ là sai, xem bài A.4.

</details>

### Bài A.2 — Khoá tưởng duy nhất mà không phải

**Đề:** với năm ứng viên khoá dưới đây, viết một câu kiểm xem cái nào thật sự duy nhất:

```text
su_kien_web (khach_id, thoi_diem)
tra_hang (don_hang_id)
nhan_vien_don (don_hang_id)
kho_hang (ma_hang)
khach_hang_lich_su (khach_id)
```

**Đáp số phải ra:**

```text
┌──────────────────────────────────┬─────────┬─────────┬──────────┐
│             ung_vien             │ so_dong │ so_khoa │ duy_nhat │
├──────────────────────────────────┼─────────┼─────────┼──────────┤
│ khach_hang_lich_su (khach_id)    │      20 │       4 │ false    │
│ kho_hang (ma_hang)               │      20 │       4 │ false    │
│ nhan_vien_don (don_hang_id)      │      17 │      10 │ false    │
│ su_kien_web (khach_id,thoi_diem) │      43 │      43 │ true     │
│ tra_hang (don_hang_id)           │       4 │       3 │ false    │
└──────────────────────────────────┴─────────┴─────────┴──────────┘
```

**Chỉ một trong năm là duy nhất.** Bốn cái còn lại là bốn kiểu bội khác nhau — gọi tên
được cả bốn kiểu thì bạn đã hiểu grain.

<details>
<summary>Lời giải</summary>

```sql
select 'su_kien_web (khach_id,thoi_diem)' ung_vien, count(*) so_dong,
       count(distinct (khach_id,thoi_diem)) so_khoa,
       count(*)=count(distinct (khach_id,thoi_diem)) duy_nhat from su_kien_web
union all select 'tra_hang (don_hang_id)', count(*), count(distinct don_hang_id),
       count(*)=count(distinct don_hang_id) from tra_hang
union all select 'nhan_vien_don (don_hang_id)', count(*), count(distinct don_hang_id),
       count(*)=count(distinct don_hang_id) from nhan_vien_don
union all select 'kho_hang (ma_hang)', count(*), count(distinct ma_hang),
       count(*)=count(distinct ma_hang) from kho_hang
union all select 'khach_hang_lich_su (khach_id)', count(*), count(distinct khach_id),
       count(*)=count(distinct khach_id) from khach_hang_lich_su
order by 1;
```

Bốn kiểu bội, bốn hậu quả khác nhau:

| Ứng viên | Bội theo | Nếu join bằng nó |
|---|---|---|
| `tra_hang (don_hang_id)` | `DH003` bị trả **2 lần** | nhân đôi dòng đơn hàng |
| `nhan_vien_don (don_hang_id)` | 1 đơn tới **3 nhân viên** | nhân bản doanh thu theo NV |
| `kho_hang (ma_hang)` | mỗi mặt hàng **5 ngày** | nhân 5 — xem bài A.3 |
| `khach_hang_lich_su (khach_id)` | mỗi khách **5 bản chụp** | nhân 5 lịch sử khách |

`su_kien_web (khach_id, thoi_diem)` duy nhất là **may**, không phải thiết kế: dữ liệu
này chưa có hai sự kiện trùng giây. Đó chính là lý do bảng vẫn phải có `su_kien_id` —
đừng dựa vào timestamp làm khoá.

</details>

### Bài A.3 — Trộn grain: nhân đúng 5 lần

**Đề:** ai đó cần *"doanh thu kèm tồn kho"* nên join `don_hang_chi_tiet` với `kho_hang`
bằng `ma_hang`. Đo thiệt hại: số dòng trước/sau và doanh thu trước/sau.

**Đáp số phải ra:**

```text
┌──────────┬──────────┬──────────┬────────────┐
│ dong_goc │ sau_join │ tien_goc │ tien_phong │
├──────────┼──────────┼──────────┼────────────┤
│       15 │       75 │ 10215000 │   51075000 │
└──────────┴──────────┴──────────┴────────────┘
```

Đúng **5 lần**. Tự trả lời: vì sao là 5 mà không phải số khác?

<details>
<summary>Lời giải</summary>

```sql
select (select count(*) from don_hang_chi_tiet) dong_goc,
       (select count(*) from don_hang_chi_tiet ct join kho_hang k using (ma_hang)) sau_join,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) tien_goc,
       (select sum(ct.so_luong*ct.don_gia)
        from don_hang_chi_tiet ct join kho_hang k using (ma_hang)) tien_phong;
```

Vì `kho_hang` có **5 ngày** cho mỗi mặt hàng. Join bỏ mất cột ngày nên mỗi dòng bán
khớp với cả 5 bản chụp tồn kho.

Hệ số 5 ở đây trông rõ vì dữ liệu bé. Trên thật, `kho_hang` có 400 ngày thì hệ số là
400 — nhưng **không ai nhìn ra 400**, người ta chỉ thấy "doanh thu tháng này to bất
thường". Cách sửa là join đủ khoá:

```sql
-- dung: join du (ma_hang, ngay)
select ct.don_hang_id, ct.dong, ct.so_luong*ct.don_gia tien_hang, k.ton_cuoi_ngay
from don_hang_chi_tiet ct
join kho_hang k on k.ma_hang = ct.ma_hang and k.ngay = ct.ngay;
```

**Luật:** join hai bảng thì khoá join phải **phủ hết grain của bảng thô hơn**. Thiếu
một cột khoá là nhân bản, không phải lọc. Xem [Grain](../reference/grain.md).

</details>

### Bài A.4 — Snapshot: cộng dọc thời gian là vô nghĩa

**Đề:** với `kho_hang`, tính ba số cho mỗi mặt hàng: tổng `ton_cuoi_ngay` qua 5 ngày,
tồn cuối kỳ, và tồn trung bình. Chỉ **hai trong ba** là số dùng được.

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
select ma_hang,
       sum(ton_cuoi_ngay) cong_bay_ngay,
       max_by(ton_cuoi_ngay, ngay) ton_cuoi_ky,
       round(avg(ton_cuoi_ngay),1) ton_tb
from kho_hang group by 1 order by 1;
```

`cong_bay_ngay` là số **rác**: "SP-D tồn 992 cái" không đúng ở bất kỳ thời điểm nào —
kho chưa bao giờ có quá 200 cái SP-D. Đó là cộng cùng một số hàng năm lần.

Đây là **semi-additive**: cộng được theo mặt hàng, theo kho, theo khu vực — nhưng
**không cộng được theo thời gian**. Theo thời gian thì lấy giá trị cuối kỳ, hoặc trung
bình, tuỳ câu hỏi nghiệp vụ:

| Câu hỏi | Số đúng |
|---|---|
| "Giờ còn bao nhiêu?" | `ton_cuoi_ky` |
| "Bình quân kỳ này giữ bao nhiêu hàng?" | `ton_tb` |
| "Tổng tồn 5 ngày là bao nhiêu?" | **câu hỏi sai** — không có ý nghĩa nghiệp vụ |

Cái bẫy: `sum()` **không báo lỗi**. Kéo cột vào ô tổng của BI là ra 992, và không có gì
trên màn hình nói rằng con số đó vô nghĩa. Xem
[Fact và Dimension](../reference/fact-and-dimension.md).

</details>

### Bài A.5 — Đổi grain từ dòng lên đơn: cột nào theo được

**Đề:** dựng bảng ở grain **một dòng một đơn** từ `don_hang` ⋈ `don_hang_chi_tiet`, giữ
bốn số: số đơn, tổng tiền hàng, tổng phí ship, tổng số dòng. Cả bốn phải khớp mốc gốc.

**Đáp số phải ra:**

```text
┌────────┬────────────────┬───────────────┬──────────────┐
│ so_don │ tong_tien_hang │ tong_phi_ship │ tong_so_dong │
├────────┼────────────────┼───────────────┼──────────────┤
│     10 │       10215000 │        400000 │           15 │
└────────┴────────────────┴───────────────┴──────────────┘
```

Ra `phi_ship` = 775.000 nghĩa là bạn đã dùng `sum` ở chỗ phải dùng `max`.

<details>
<summary>Lời giải</summary>

```sql
select count(*) so_don, sum(tien_hang) tong_tien_hang,
       sum(phi_ship) tong_phi_ship, sum(so_dong) tong_so_dong
from (select h.don_hang_id,
             max(h.phi_ship)              phi_ship,   -- grain don: LAY MOT
             sum(ct.so_luong*ct.don_gia)  tien_hang,  -- grain dong: CONG
             count(*)                     so_dong
      from don_hang h join don_hang_chi_tiet ct using (don_hang_id)
      group by 1);
```

Khi gom từ grain mịn lên grain thô, mỗi cột đi theo **một trong hai đường**, và chọn sai
đường là sai số:

| Cột thuộc grain | Phép gom | Sai thì thành |
|---|---|---|
| Dòng (`so_luong*don_gia`) | `sum` | — |
| Đơn (`phi_ship`, `trang_thai`, `khach_id`) | `max` / `any_value` | `sum` → phồng 77,5% |

400.000 và 775.000 chênh đúng vì các đơn nhiều dòng bị đếm phí ship nhiều lần. `DH003`
ba dòng nên 90.000 thành 270.000. Xem [lab nền tảng bài 2](lab-nen-tang-grain-fact-dim.md)
và [case study phí ship phồng 133%](../case-studies/phi-ship-phong-133-phan-tram.md).

</details>

---

## Bộ B — Fact và Dimension

### Bài B.1 — Phân loại từng cột của `don_hang`

**Đề:** lấy danh sách cột của `don_hang` từ `information_schema`, rồi tự phân mỗi cột vào
một trong bốn nhóm: **khoá ngoại dimension**, **degenerate dimension**, **số đo (fact)**,
**thuộc tính nên tách sang dimension**.

**Đáp số phải ra (danh sách cột):**

```text
┌─────────────┬───────────┐
│ column_name │ data_type │
├─────────────┼───────────┤
│ don_hang_id │ VARCHAR   │
│ khach_id    │ VARCHAR   │
│ ngay_dat    │ DATE      │
│ ngay_giao   │ DATE      │
│ ngay_nhan   │ DATE      │
│ trang_thai  │ VARCHAR   │
│ phi_ship    │ INTEGER   │
└─────────────┴───────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select column_name, data_type from information_schema.columns
where table_schema='main' and table_name='don_hang' order by ordinal_position;
```

Phân loại đúng:

| Cột | Nhóm | Vì sao |
|---|---|---|
| `don_hang_id` | **degenerate dimension** | mã nghiệp vụ, không có thuộc tính nào đi kèm → ở lại fact, đừng dựng bảng |
| `khach_id` | khoá ngoại dimension | trỏ sang `dim_khach` |
| `ngay_dat` / `ngay_giao` / `ngay_nhan` | khoá ngoại dimension | ba **vai** của cùng một `dim_ngay` → role-playing |
| `trang_thai` | thuộc tính nên tách | cardinality thấp (3 giá trị) → junk dimension |
| `phi_ship` | **số đo** | cộng được, nhưng ở grain **đơn** — bẫy của bài A.5 |

Ba cột ngày cùng trỏ một dimension là [role-playing](../skills/role-playing-dimension.md);
`trang_thai` gộp với các cờ khác thành [junk dimension](../skills/junk-dimension.md);
`don_hang_id` là [degenerate dimension](../skills/degenerate-dimension.md). Ba kỹ thuật,
một bảng bảy cột.

</details>

### Bài B.2 — Semi-additive: cộng ngang được, cộng dọc không

**Đề:** với `kho_hang`, tính tổng tồn và **giá trị tồn** (`ton_cuoi_ngay * gia_von`) theo
từng ngày. Đây là chiều cộng **hợp lệ** — ngược với bài A.4.

**Đáp số phải ra:**

```text
┌────────────┬──────────┬─────────────┐
│    ngay    │ tong_ton │ gia_tri_ton │
├────────────┼──────────┼─────────────┤
│ 2026-07-01 │      362 │    37170000 │
│ 2026-07-02 │      352 │    35050000 │
│ 2026-07-03 │      339 │    32200000 │
│ 2026-07-04 │      335 │    31680000 │
│ 2026-07-05 │      328 │    31410000 │
└────────────┴──────────┴─────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select ngay, sum(ton_cuoi_ngay) tong_ton, sum(ton_cuoi_ngay*gia_von) gia_tri_ton
from kho_hang group by 1 order by 1;
```

Cùng cột `ton_cuoi_ngay`, cùng hàm `sum` — bài A.4 cho số rác, bài này cho số dùng được.
Khác nhau ở **chiều cộng**:

```text
cong theo MAT HANG trong mot ngay  →  hop le   (362 = tong ton kho ngay 01/07)
cong theo NGAY cho mot mat hang    →  vo nghia (420 = cong 5 lan cung mot dong hang)
```

Nên bảng semi-additive phải **ghi rõ chiều cấm cộng ngay trong tài liệu bảng** — vì SQL
không có cách nào cấm được. Một số nơi đặt tên cột là `ton_cuoi_ngay_khong_cong_theo_ngay`;
xấu, nhưng nó cứu được nhiều buổi chiều.

`gia_tri_ton` giảm đều từ 37,17 triệu xuống 31,41 triệu qua 5 ngày — đó là hàng bán ra.

</details>

### Bài B.3 — Factless fact table: bảng không có số đo nào

**Đề:** thống kê `su_kien_web` theo `loai_su_kien`, kèm số khách phân biệt và **số dòng
có `ma_hang`**, **số dòng có `don_hang_id`**. Chỉ ra bảng này không có cột số đo nào.

**Đáp số phải ra:**

```text
┌──────────────┬────────────┬──────────┬────────────┬────────┐
│ loai_su_kien │ so_su_kien │ so_khach │ co_ma_hang │ co_don │
├──────────────┼────────────┼──────────┼────────────┼────────┤
│ xem          │         18 │        4 │         18 │      0 │
│ them_gio     │         15 │        4 │         15 │      0 │
│ thanh_toan   │         10 │        4 │          0 │     10 │
└──────────────┴────────────┴──────────┴────────────┴────────┘
```

**43 sự kiện, không một cột tiền nào.** Vậy nó là fact hay dimension?

<details>
<summary>Lời giải</summary>

```sql
select loai_su_kien, count(*) so_su_kien, count(distinct khach_id) so_khach,
       count(ma_hang) co_ma_hang, count(don_hang_id) co_don
from su_kien_web group by 1 order by 2 desc;
```

Nó là **fact** — factless fact table. Dấu hiệu nhận biết không phải "có cột số" mà là
**"mỗi dòng là một sự kiện xảy ra tại một thời điểm, trỏ tới nhiều dimension"**.

Số đo của nó là `count(*)`. Chính vì thế nó trả lời được những câu mà bảng có tiền không
trả lời được: *bao nhiêu lượt xem không dẫn tới mua*, *khách xem mấy sản phẩm trước khi
chốt*. Xem [Fact và Dimension](../reference/fact-and-dimension.md).

Chú ý cấu trúc cột: `ma_hang` chỉ có ở `xem`/`them_gio`, `don_hang_id` chỉ có ở
`thanh_toan` — **không dòng nào có cả hai**. Đó là mùi của
[thực thể không đồng nhất](../skills/heterogeneous-schema.md), luyện ở bộ 4.

</details>

### Bài B.4 — Grain của "phiên" quyết định con số bỏ giỏ

**Đề:** đếm số phiên, số phiên có mua, số phiên **bỏ giỏ** (có `them_gio` mà không
`thanh_toan`), số phiên **chỉ xem**. Làm **hai lần**: (a) coi một phiên = một khách một
ngày; (b) cắt phiên theo khoảng lặng **30 phút**.

**Đáp số phải ra — cách (a), phiên theo ngày:**

```text
┌──────────┬──────────────┬────────┬─────────┐
│ so_phien │ phien_co_mua │ bo_gio │ chi_xem │
├──────────┼──────────────┼────────┼─────────┤
│       13 │           10 │      0 │       3 │
└──────────┴──────────────┴────────┴─────────┘
```

**Cách (b), phiên theo khoảng lặng 30 phút:**

```text
┌──────────┬────────┬────────┬─────────┐
│ so_phien │ co_mua │ bo_gio │ chi_xem │
├──────────┼────────┼────────┼─────────┤
│       14 │     10 │      0 │       4 │
└──────────┴────────┴────────┴─────────┘
```

<details>
<summary>Lời giải</summary>

Cách (a) — phiên = khách × ngày:

```sql
with phien as (
  select khach_id, cast(thoi_diem as date) ngay,
         max(case when loai_su_kien='thanh_toan' then 1 else 0 end) co_mua,
         sum(case when loai_su_kien='them_gio' then 1 else 0 end) so_them_gio
  from su_kien_web group by 1,2)
select count(*) so_phien, sum(co_mua) phien_co_mua,
       sum(case when so_them_gio>0 and co_mua=0 then 1 else 0 end) bo_gio,
       sum(case when so_them_gio=0 and co_mua=0 then 1 else 0 end) chi_xem
from phien;
```

Cách (b) — cắt theo khoảng lặng:

```sql
with co_khoang as (
  select *, case when thoi_diem - lag(thoi_diem) over w > interval 30 minute
                   or lag(thoi_diem) over w is null then 1 else 0 end phien_moi
  from su_kien_web window w as (partition by khach_id order by thoi_diem)),
danh_so as (select *, sum(phien_moi) over (partition by khach_id order by thoi_diem) phien
            from co_khoang),
tom as (select khach_id, phien,
               max(case when loai_su_kien='thanh_toan' then 1 else 0 end) co_mua,
               sum(case when loai_su_kien='them_gio' then 1 else 0 end) so_them_gio
        from danh_so group by 1,2)
select count(*) so_phien, sum(co_mua) co_mua,
       sum(case when so_them_gio>0 and co_mua=0 then 1 else 0 end) bo_gio,
       sum(case when so_them_gio=0 and co_mua=0 then 1 else 0 end) chi_xem
from tom;
```

**13 phiên hay 14 phiên?** Cả hai đều đúng — với hai định nghĩa *phiên* khác nhau. Đó
chính là bài học: **grain của "phiên" là một quyết định nghiệp vụ, không phải một sự
thật có sẵn trong dữ liệu.**

Dòng lệch là `C3` ngày 02/07: mua lúc 15:10, rồi 16:00 quay lại xem `SP-C`. Cách (a) gộp
thành một phiên "có mua"; cách (b) tách thành hai — phiên sau là **chỉ xem**.

`bo_gio` = 0 ở cả hai cách: trong bộ dữ liệu này, hễ đã `them_gio` là chốt đơn. Số 0 đó
là kết quả thật, không phải query hỏng — hãy kiểm chứng bằng cách liệt kê từng phiên
trước khi tin.

Bảng phải chốt định nghĩa phiên **trong tài liệu**, vì không có gì trong dữ liệu chỉ ra
30 phút hay 24 giờ là đúng.

</details>

### Bài B.5 — Số đo trốn trong dimension

**Đề:** với `khach_hang_lich_su`, đếm cho mỗi khách: bao nhiêu giá trị `diem_tin_dung`
khác nhau, min/max, và bao nhiêu tổ hợp `(khu_vuc, hang)` khác nhau.

**Đáp số phải ra:**

```text
┌──────────┬────────────┬──────────┬──────────┬────────────────┐
│ khach_id │ so_gia_tri │ nho_nhat │ lon_nhat │ so_to_hop_cham │
├──────────┼────────────┼──────────┼──────────┼────────────────┤
│ C1       │          4 │      700 │      712 │              2 │
│ C2       │          4 │      780 │      788 │              1 │
│ C3       │          4 │      650 │      702 │              2 │
│ C4       │          5 │      820 │      840 │              1 │
└──────────┴────────────┴──────────┴──────────┴────────────────┘
```

**Câu hỏi:** `diem_tin_dung` nằm trong bảng khách hàng. Nó là thuộc tính dimension hay
là số đo?

<details>
<summary>Lời giải</summary>

```sql
select khach_id, count(distinct diem_tin_dung) so_gia_tri,
       min(diem_tin_dung) nho_nhat, max(diem_tin_dung) lon_nhat,
       count(distinct khu_vuc||'|'||hang) so_to_hop_cham
from khach_hang_lich_su group by 1 order by 1;
```

Nó là **số đo trá hình**. Bằng chứng nằm ngay ở hai cột cuối: qua 5 ngày, thuộc tính
chậm (`khu_vuc`, `hang`) chỉ đổi **1–2** tổ hợp, còn `diem_tin_dung` đổi **4–5** giá trị
— tức là gần như **mỗi ngày một lần**.

Hậu quả nếu để nguyên trong dim và bật Type 2: dimension khách hàng sinh 4–5 dòng cho
**mỗi** khách chỉ vì điểm tín dụng nhích vài đơn vị. Với 1 triệu khách và 365 ngày, dim
phình lên hàng trăm triệu dòng — đúng
[case study dimension phình 365 lần](../case-studies/dimension-phinh-365-lan.md).

Ba lối ra, luyện kỹ ở bộ 2:

| Cách | Kết quả |
|---|---|
| Tách ra [mini-dimension](../skills/mini-dimension.md) theo khoảng (`700-749`, `750-799`…) | dim chính đứng yên |
| Đưa vào fact như một số đo tại thời điểm giao dịch | truy được lịch sử theo đơn |
| Type 1 — ghi đè, không giữ lịch sử | mất khả năng trả lời "lúc đó điểm bao nhiêu" |

Dấu hiệu tổng quát: **thuộc tính dimension mà đổi gần bằng nhịp fact thì không phải
thuộc tính dimension.**

</details>

---

## Bộ C — Surrogate key

### Bài C.1 — Sinh surrogate key kèm dòng "không xác định"

**Đề:** dựng `dim_khach_sk` từ `khach_hang`: surrogate key chạy từ **1001**, cộng một
dòng khoá **-1** cho giá trị không xác định.

**Đáp số phải ra:**

```text
┌───────────┬──────────┬────────────────┬────────────────┬────────────────┐
│ khach_key │ khach_id │     ho_ten     │    khu_vuc     │      hang      │
├───────────┼──────────┼────────────────┼────────────────┼────────────────┤
│        -1 │ N/A      │ Khong xac dinh │ Khong xac dinh │ Khong xac dinh │
│      1001 │ C1       │ Nguyen Van A   │ Mien Nam       │ Bac            │
│      1002 │ C2       │ Tran Thi B     │ Mien Nam       │ Vang           │
│      1003 │ C3       │ Le Van C       │ Mien Trung     │ Bac            │
│      1004 │ C4       │ Pham Thi D     │ Mien Bac       │ Kim cuong      │
└───────────┴──────────┴────────────────┴────────────────┴────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
create or replace table dim_khach_sk as
select 1000 + row_number() over (order by khach_id) khach_key,
       khach_id, ho_ten, khu_vuc, hang
from khach_hang
union all
select -1, 'N/A', 'Khong xac dinh', 'Khong xac dinh', 'Khong xac dinh';

select * from dim_khach_sk order by khach_key;
```

Hai chi tiết dễ bỏ qua:

**Bắt đầu từ 1001, không phải 1.** Khoá một chữ số trông giống mã nghiệp vụ, và rồi ai
đó sẽ join `khach_key = 1` với `khach_id = '1'`. Bắt đầu từ một số không thể nhầm là quy
ước rẻ tiền mà hiệu quả.

**Dòng -1 phải tồn tại từ ngày đầu.** Nó không phải rác — nó là chỗ để fact trỏ vào khi
dimension chưa có bản ghi tương ứng, và nhờ nó mà **mọi khoá ngoại trong fact đều
`NOT NULL`**. Có ràng buộc đó thì `count(*)` trên fact không bao giờ tụt vì join.

</details>

### Bài C.2 — Dựng dimension Type 2 từ bản trích hàng ngày

**Đề:** từ `khach_hang_lich_su` (20 bản chụp), dựng `dim_khach_t2` giữ lịch sử **chỉ
theo hai cột chậm** `khu_vuc` và `hang`. Mỗi phiên bản có `hieu_luc_tu`, `hieu_luc_den`,
`la_hien_tai`. Phiên bản đang hiệu lực đóng bằng `9999-12-31`.

**Đáp số phải ra:**

```text
┌───────────┬──────────┬────────────┬───────────┬─────────────┬──────────────┬─────────────┐
│ khach_key │ khach_id │  khu_vuc   │   hang    │ hieu_luc_tu │ hieu_luc_den │ la_hien_tai │
├───────────┼──────────┼────────────┼───────────┼─────────────┼──────────────┼─────────────┤
│         1 │ C1       │ Mien Bac   │ Bac       │ 2026-07-01  │ 2026-07-02   │ false       │
│         2 │ C1       │ Mien Nam   │ Bac       │ 2026-07-03  │ 9999-12-31   │ true        │
│         3 │ C2       │ Mien Nam   │ Vang      │ 2026-07-01  │ 9999-12-31   │ true        │
│         4 │ C3       │ Mien Trung │ Bac       │ 2026-07-01  │ 2026-07-03   │ false       │
│         5 │ C3       │ Mien Trung │ Vang      │ 2026-07-04  │ 9999-12-31   │ true        │
│         6 │ C4       │ Mien Bac   │ Kim cuong │ 2026-07-01  │ 9999-12-31   │ true        │
└───────────┴──────────┴────────────┴───────────┴─────────────┴──────────────┴─────────────┘
```

**4 khách → 6 dòng.** Ra 20 dòng nghĩa là bạn đang giữ lịch sử theo *mọi* cột, kể cả
`diem_tin_dung` — xem lại bài B.5.

<details>
<summary>Lời giải</summary>

```sql
create or replace table dim_khach_t2 as
with danh_dau as (
  select ngay_trich, khach_id, ho_ten, khu_vuc, hang,
         case when lag(khu_vuc) over w is distinct from khu_vuc
                or lag(hang)    over w is distinct from hang then 1 else 0 end doi
  from khach_hang_lich_su
  window w as (partition by khach_id order by ngay_trich)),
ver as (select *, sum(doi) over (partition by khach_id order by ngay_trich) v from danh_dau),
gom as (select khach_id, v, any_value(ho_ten) ho_ten, any_value(khu_vuc) khu_vuc,
               any_value(hang) hang, min(ngay_trich) tu
        from ver group by khach_id, v)
select row_number() over (order by khach_id, tu) khach_key,
       khach_id, ho_ten, khu_vuc, hang, tu hieu_luc_tu,
       coalesce((lead(tu) over (partition by khach_id order by tu) - interval 1 day)::date,
                date '9999-12-31') hieu_luc_den,
       lead(tu) over (partition by khach_id order by tu) is null la_hien_tai
from gom;
```

Ba kỹ thuật ghép lại:

1. **`is distinct from`** thay cho `<>` — `<>` trả `NULL` khi một vế `NULL`, nên dòng đổi
   từ `NULL` sang có giá trị sẽ **không** được đánh dấu. Đây là lỗi im lặng kinh điển.
2. **`sum(doi) over (...)`** biến cờ đổi thành **số phiên bản** — mẹo gap-and-islands.
3. **`lead(...) - 1 day`** đóng khoảng của phiên bản trước bằng ngày liền trước phiên bản
   sau, nên các khoảng **không chồng lấn và không hở**.

Chỉ chọn hai cột `khu_vuc`, `hang` vào điều kiện đổi là quyết định quan trọng nhất — đó
là danh sách **cột kích hoạt Type 2**, và nó phải được viết ra tường minh. Xem
[SCD](../skills/scd.md) và [phát hiện thay đổi](../skills/scd-change-detection.md).

</details>

### Bài C.3 — Join bằng natural key vào dim Type 2: phồng 47%

**Đề:** đo thiệt hại khi join `don_hang` với `dim_khach_t2` **chỉ bằng `khach_id`**, bỏ
qua khoảng hiệu lực.

**Đáp số phải ra:**

```text
┌─────────┬──────────┬──────────┬────────────┐
│ don_goc │ sau_join │ tien_goc │ tien_phong │
├─────────┼──────────┼──────────┼────────────┤
│      10 │       15 │ 10215000 │   15060000 │
└─────────┴──────────┴──────────┴────────────┘
```

Doanh thu phồng **47,4%**. Tự trả lời: vì sao không phồng đều 2 lần?

<details>
<summary>Lời giải</summary>

```sql
select (select count(*) from don_hang) don_goc,
       (select count(*) from don_hang h join dim_khach_t2 d using (khach_id)) sau_join,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) tien_goc,
       (select sum(ct.so_luong*ct.don_gia)
        from don_hang h
        join don_hang_chi_tiet ct using (don_hang_id)
        join dim_khach_t2 d on d.khach_id = h.khach_id) tien_phong;
```

Vì **chỉ `C1` và `C3` có hai phiên bản**; `C2` và `C4` có một. Đơn của C1/C3 nhân đôi,
đơn của C2/C4 giữ nguyên → hệ số phồng là 1,474, một con số **không tròn và không đoán
được**. Đó mới là chỗ nguy hiểm: phồng 2 lần thì ai cũng nghi, phồng 47% thì trông như
"tháng này bán tốt".

Ba cách join đúng, tuỳ câu hỏi:

```sql
-- as-was: trang thai khach TAI THOI DIEM dat hang
join dim_khach_t2 d on d.khach_id = h.khach_id
                   and h.ngay_dat between d.hieu_luc_tu and d.hieu_luc_den

-- as-is: trang thai khach HIEN TAI
join dim_khach_t2 d on d.khach_id = h.khach_id and d.la_hien_tai

-- dung nhat: fact luu san surrogate key, khong join lai theo ngay
join dim_khach_t2 d on d.khach_key = f.khach_key
```

Cách thứ ba là lý do surrogate key tồn tại: **chốt phiên bản vào fact lúc nạp**, để lúc
đọc không ai có cơ hội join sai. Xem
[Surrogate key](../reference/surrogate-key.md) và
[case study báo cáo quá khứ tự đổi số](../case-studies/bao-cao-qua-khu-tu-doi-so.md).

</details>

### Bài C.4 — Khoá -1 làm cho "chưa giao" đếm được

**Đề:** `don_hang` có 2 đơn chưa giao (`ngay_giao` rỗng). Dựng `ngay_giao_key` dạng
`YYYYMMDD`, cho `-1` khi chưa giao. Chứng minh `= -1` cộng `<> -1` bằng đúng tổng số đơn.

**Đáp số phải ra:**

```text
┌──────────┬───────────┬─────────┐
│ tong_don │ chua_giao │ da_giao │
├──────────┼───────────┼─────────┤
│       10 │         2 │       8 │
└──────────┴───────────┴─────────┘
```

```text
┌────────┬───────────────┬─────────┬───────────────┐
│ tat_ca │ loc_khac_tru1 │ la_tru1 │ neu_dung_null │
├────────┼───────────────┼─────────┼───────────────┤
│     10 │             8 │       2 │             8 │
└────────┴───────────────┴─────────┴───────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select count(*) tong_don,
       sum(case when ngay_giao is null then 1 else 0 end) chua_giao,
       count(ngay_giao) da_giao
from don_hang;

with f as (select don_hang_id,
                  coalesce(cast(strftime(ngay_giao,'%Y%m%d') as int), -1) ngay_giao_key
           from don_hang)
select count(*) tat_ca,
       (select count(*) from f where ngay_giao_key <> -1) loc_khac_tru1,
       (select count(*) from f where ngay_giao_key = -1)  la_tru1,
       (select count(*) from don_hang where ngay_giao <> date '9999-12-31') neu_dung_null
from f;
```

**8 + 2 = 10. Khép kín.** Đó là toàn bộ giá trị của khoá `-1`: hai nhóm bù nhau, không
dòng nào bốc hơi, và `chua_giao` **hiện thành một nhóm trên báo cáo** thay vì biến mất.

Cột `neu_dung_null` = 8 là bằng chứng của mặt còn lại: `ngay_giao <> '9999-12-31'` trả
`NULL` cho 2 đơn chưa giao, mà `NULL` không phải `TRUE` nên chúng **bị loại lặng lẽ**.
Không lỗi, không cảnh báo — chỉ là hai đơn không bao giờ xuất hiện.

Với `NULL`, mọi phép so sánh đều nuốt dòng. Với `-1`, mọi phép so sánh đều giữ dòng.
Xem [NULL trong fact và dimension](../skills/null-handling.md) và
[case study đơn đang giao biến mất](../case-studies/don-dang-giao-bien-mat.md).

</details>

### Bài C.5 — Hash key: được gì, mất gì

**Đề:** sinh khoá bằng `md5` trên `(khach_id, khu_vuc, hang)` cho `dim_khach_t2`, đặt
cạnh surrogate key dạng số. Rồi trả lời: hash key **hỏng** ở đâu với bảng này?

**Đáp số phải ra:**

```text
┌──────────┬────────────┬───────────┬──────────────────────────────────┐
│ khach_id │  khu_vuc   │   hang    │             hash_key             │
├──────────┼────────────┼───────────┼──────────────────────────────────┤
│ C1       │ Mien Bac   │ Bac       │ 9fa39d984b7aa21f983b58e0a1f0bf56 │
│ C1       │ Mien Nam   │ Bac       │ eb643a852689a4f2f0d3e9dc21e591f0 │
│ C2       │ Mien Nam   │ Vang      │ eae98a48319cf3c079705e6222c0f58e │
│ C3       │ Mien Trung │ Bac       │ e6ff8cc98395ad32d9227e1aeaf283ca │
│ C3       │ Mien Trung │ Vang      │ a326bd8326b9a904483aa5ad0450e0dc │
│ C4       │ Mien Bac   │ Kim cuong │ 78abe1707b6d9ed027d60e9f3e28ff2e │
└──────────┴────────────┴───────────┴──────────────────────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select khach_id, khu_vuc, hang, md5(khach_id||'|'||khu_vuc||'|'||hang) hash_key
from dim_khach_t2 order by khach_id, hieu_luc_tu limit 6;
```

**Được:** khoá tính được **song song, không cần đọc bảng đích** — nạp lại lô cũ vẫn ra
đúng khoá đó, nên không cần sequence tập trung. Rất hợp lakehouse.

**Mất, và mất nặng với bảng này:** hash trên `(khach_id, khu_vuc, hang)` **không phân
biệt được hai phiên bản có cùng giá trị**. Nếu C1 đổi `Mien Bac` → `Mien Nam` → quay lại
`Mien Bac`, phiên bản 1 và phiên bản 3 sẽ **cùng một hash**, và Type 2 gãy.

Sửa: đưa mốc thời gian vào hash — `md5(khach_id||'|'||hieu_luc_tu)`. Lúc này khoá phụ
thuộc phiên bản chứ không phụ thuộc nội dung.

Ba khác biệt cần nhớ:

| | Sequence | Hash |
|---|---|---|
| Tính song song không cần khoá tập trung | không | **có** |
| Ổn định khi nạp lại | không | **có** |
| Rộng | 8 byte | 16–32 byte, join chậm hơn |
| Bẫy | — | **trùng khoá khi giá trị quay lại** |

Còn một cái bẫy chung cho cả `md5` lẫn `||`: nếu một cột `NULL` thì cả chuỗi thành
`NULL` và hash thành `NULL`. Luôn bọc `coalesce(cot, '')` trước khi nối.

</details>

---

## Bộ D — Star, Snowflake, One Big Table

### Bài D.1 — Cùng một câu hỏi, ba cách bố trí

**Đề:** tính doanh thu theo `khu_vuc` × `nhom` **hai lần**: (a) từ star schema —
`don_hang_chi_tiet` join `don_hang`, `khach_hang`, `hang_hoa`; (b) từ bảng `obt_ban_hang`
dựng ở bài D.3, không join gì. Hai kết quả phải trùng từng dòng.

**Đáp số phải ra (cả hai cách):**

```text
┌────────────┬───────────────┬───────────┐
│  khu_vuc   │     nhom      │ doanh_thu │
├────────────┼───────────────┼───────────┤
│ Mien Nam   │ Máy tính      │   3600000 │
│ Mien Trung │ Màn hình      │   2100000 │
│ Mien Nam   │ Thiết bị nhập │   1965000 │
│ Mien Bac   │ Thiết bị nhập │   1650000 │
│ Mien Nam   │ Màn hình      │    900000 │
└────────────┴───────────────┴───────────┘
```

Tổng 5 dòng = 10.215.000.

<details>
<summary>Lời giải</summary>

```sql
-- (a) star: 3 join tu fact
select k.khu_vuc, hh.nhom, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang_chi_tiet ct
join don_hang   h  using (don_hang_id)
join khach_hang k  using (khach_id)
join hang_hoa   hh using (ma_hang)
group by 1,2 order by 3 desc;

-- (b) OBT: 0 join
select khu_vuc, nhom, sum(tien_hang) doanh_thu
from obt_ban_hang group by 1,2 order by 3 desc;
```

Trùng khít. Nên **kết quả không phải tiêu chí chọn giữa star và OBT** — cả hai đều ra
đúng. Tiêu chí nằm ở chỗ khác, đo ở bài D.3 và D.4.

Một chi tiết: chỉ có **5** tổ hợp `khu_vuc × nhom` chứ không phải 3 × 3 = 9. Star schema
không sinh dòng cho tổ hợp không bán được gì. Nếu báo cáo cần hiện cả tổ hợp doanh thu 0
thì phải `cross join` hai dimension rồi `left join` fact — bài đó ở bộ 6.

</details>

### Bài D.2 — Snowflake: làm phẳng cây phân cấp bằng recursive CTE

**Đề:** `cay_nhom_hang` lưu quan hệ cha–con (`nhom_cha_id`). Viết recursive CTE trả về
mỗi nhóm kèm **cấp** và **đường dẫn đầy đủ** từ gốc.

**Đáp số phải ra:**

```text
┌─────────┬───────┬──────────────────────────────────────────────────┐
│ nhom_id │  cap  │                    duong_dan                     │
├─────────┼───────┼──────────────────────────────────────────────────┤
│ N1      │     1 │ Cong nghe                                        │
│ N2      │     2 │ Cong nghe > May tinh                             │
│ N4      │     3 │ Cong nghe > May tinh > Laptop                    │
│ N8      │     4 │ Cong nghe > May tinh > Laptop > Laptop van phong │
│ N3      │     2 │ Cong nghe > Thiet bi ngoai vi                    │
│ N6      │     3 │ Cong nghe > Thiet bi ngoai vi > Man hinh         │
│ N5      │     3 │ Cong nghe > Thiet bi ngoai vi > Thiet bi nhap    │
│ N7      │     1 │ Hang thanh ly                                    │
└─────────┴───────┴──────────────────────────────────────────────────┘
```

Chú ý: **hai gốc** (`N1`, `N7`) và cấp sâu nhất là **4**.

<details>
<summary>Lời giải</summary>

```sql
with recursive duong as (
  select nhom_id, ten_nhom, nhom_cha_id, 1 cap, ten_nhom duong_dan
  from cay_nhom_hang where nhom_cha_id is null
  union all
  select c.nhom_id, c.ten_nhom, c.nhom_cha_id, d.cap+1, d.duong_dan || ' > ' || c.ten_nhom
  from cay_nhom_hang c join duong d on c.nhom_cha_id = d.nhom_id)
select nhom_id, cap, duong_dan from duong order by duong_dan;
```

Neo (`anchor`) là `nhom_cha_id is null` — bắt **mọi** gốc, nên `N7` không bị bỏ sót dù nó
không nằm dưới `N1`. Viết neo thành `where nhom_id = 'N1'` là mất luôn nhánh `Hang thanh ly`,
và không có gì báo.

Đây là hình dạng **snowflake**: dimension nhóm hàng được chuẩn hoá thành bảng riêng có
khoá cha. Đọc thì phải đệ quy; đổi tên thì sửa **một** dòng — đối lập hoàn toàn với OBT
ở bài D.4.

</details>

### Bài D.3 — Dựng OBT và đo cái giá của nó

**Đề:** dựng `obt_ban_hang` — một bảng phẳng gộp chi tiết đơn, đơn hàng, khách, mặt hàng
và đường dẫn nhóm đầy đủ. Rồi đo: số dòng, doanh thu, **số cột**, và mỗi chuỗi mô tả mặt
hàng bị lặp bao nhiêu lần.

**Đáp số phải ra:**

```text
┌─────────┬───────────┬────────┐
│ so_dong │ doanh_thu │ so_cot │
├─────────┼───────────┼────────┤
│      15 │  10215000 │     17 │
└─────────┴───────────┴────────┘
```

```text
┌──────────────────┬────────────┬───────────────────────────────────────────────────────────────────┐
│     ten_hang     │ so_lan_lap │                             mau_chuoi                             │
├──────────────────┼────────────┼───────────────────────────────────────────────────────────────────┤
│ Bàn phím cơ      │          6 │ Bàn phím cơ | Cong nghe > Thiet bi ngoai vi > Thiet bi nhap       │
│ Màn hình 24 inch │          4 │ Màn hình 24 inch | Cong nghe > Thiet bi ngoai vi > Man hinh       │
│ Laptop 14 inch   │          3 │ Laptop 14 inch | Cong nghe > May tinh > Laptop > Laptop van phong │
│ Chuột không dây  │          2 │ Chuột không dây | Cong nghe > Thiet bi ngoai vi                   │
└──────────────────┴────────────┴───────────────────────────────────────────────────────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
create or replace table obt_ban_hang as
with recursive duong as (
  select nhom_id, ten_nhom, nhom_cha_id, 1 cap, ten_nhom duong_dan
  from cay_nhom_hang where nhom_cha_id is null
  union all
  select c.nhom_id, c.ten_nhom, c.nhom_cha_id, d.cap+1, d.duong_dan || ' > ' || c.ten_nhom
  from cay_nhom_hang c join duong d on c.nhom_cha_id = d.nhom_id)
select ct.don_hang_id, ct.dong, h.ngay_dat, h.trang_thai, h.phi_ship,
       k.khach_id, k.ho_ten, k.khu_vuc, k.hang khach_hang_muc,
       hh.ma_hang, hh.ten_hang, hh.nhom, d.duong_dan nhom_day_du, d.cap do_sau_nhom,
       ct.so_luong, ct.don_gia, ct.so_luong*ct.don_gia tien_hang
from don_hang_chi_tiet ct
join don_hang   h  using (don_hang_id)
join khach_hang k  using (khach_id)
join hang_hoa   hh using (ma_hang)
join hang_hoa_nhom hn using (ma_hang)
join duong      d  on d.nhom_id = hn.nhom_id;

select count(*) so_dong, sum(tien_hang) doanh_thu,
       (select count(*) from information_schema.columns
        where table_name='obt_ban_hang') so_cot
from obt_ban_hang;

select ten_hang, count(*) so_lan_lap, ten_hang || ' | ' || nhom_day_du mau_chuoi
from obt_ban_hang group by 1,3 order by 2 desc;
```

**15 dòng, 17 cột** — đúng số dòng của fact gốc. OBT **không** làm phồng dòng, miễn là
mọi join đều là nhiều-một. Đó là điều kiện sống còn: chỉ cần một quan hệ nhiều-nhiều
(như `nhan_vien_don`) lọt vào là OBT phồng ngay, và bộ 4 sẽ chứng minh.

Cái giá nằm ở cột `so_lan_lap`: chuỗi *"Cong nghe > May tinh > Laptop > Laptop van phong"*
được lưu **3 lần**, *"Bàn phím cơ …"* lưu **6 lần**. Với 15 dòng thì không sao. Với 500
triệu dòng fact thì đó là hàng chục GB lặp lại — và quan trọng hơn là bài D.4.

</details>

### Bài D.4 — Đổi tên một nhóm hàng: sửa bao nhiêu dòng

**Đề:** nghiệp vụ đổi tên *"Man hinh"* thành *"Thiet bi hien thi"*. Đếm số dòng phải sửa
ở ba nơi: `obt_ban_hang`, `cay_nhom_hang`, và cột `nhom` dẹt trong `hang_hoa`.

**Đáp số phải ra:**

```text
┌─────────────────────────┬───────────────┐
│          bang           │ dong_phai_sua │
├─────────────────────────┼───────────────┤
│ obt_ban_hang            │             4 │
│ cay_nhom_hang           │             1 │
│ hang_hoa (cot nhom det) │             0 │
└─────────────────────────┴───────────────┘
```

Dòng cuối ra **0** — đó không phải lỗi query. Tìm cho ra vì sao.

<details>
<summary>Lời giải</summary>

```sql
select 'obt_ban_hang' bang, count(*) dong_phai_sua
from obt_ban_hang where nhom_day_du like '%Man hinh%'
union all select 'cay_nhom_hang', count(*) from cay_nhom_hang where ten_nhom='Man hinh'
union all select 'hang_hoa (cot nhom det)', count(*) from hang_hoa where nhom='Man hinh';
```

**4 dòng so với 1 dòng** — trên dữ liệu thật là *"vài trăm triệu dòng"* so với *"một
dòng"*. Đây mới là đánh đổi thật của OBT, chứ không phải dung lượng:

| | Star / Snowflake | OBT |
|---|---|---|
| Đọc | 1–3 join | 0 join |
| Đổi một nhãn dimension | `update` 1 dòng | `update` toàn bảng fact |
| Áp dụng SCD Type 2 | tự nhiên | gần như không làm được |

**Còn dòng cuối bằng 0:** `hang_hoa.nhom` ghi *"Màn hình"* — **có dấu tiếng Việt**, còn
`cay_nhom_hang.ten_nhom` ghi *"Man hinh"* — **không dấu**. Hai hệ thống, hai cách viết
cùng một nhóm, và `=` không khớp.

Đây chính là bệnh mà [conformed dimension](../skills/conformed-dimension.md) sinh ra để
chữa, và bộ 6 sẽ bắt nó bằng SQL. Nhớ lấy hình dạng của nó: **query chạy, không lỗi, trả
0 dòng, và 0 dòng trông y hệt "không có gì để sửa".**

</details>

---

## Bộ E — Quy trình thiết kế 4 bước

### Bài E.1 — Bước 1 & 2: liệt kê quy trình nghiệp vụ và khai grain

**Đề:** kho này có sáu quy trình nghiệp vụ. Với mỗi cái, khai: tên, grain bằng lời, số
dòng hiện có, và **loại fact** (transaction / periodic snapshot / accumulating snapshot /
factless / bridge).

**Đáp số phải ra:**

```text
┌──────────────┬─────────────────────────────┬─────────┬────────────────────────┐
│  quy_trinh   │            grain            │ so_dong │       loai_fact        │
├──────────────┼─────────────────────────────┼─────────┼────────────────────────┤
│ Ban hang     │ mot dong hang trong mot don │      15 │ transaction            │
│ Tra hang     │ mot lan tra cua mot don     │       4 │ transaction            │
│ Giao hang    │ mot don hang                │      10 │ accumulating snapshot  │
│ Ton kho      │ mot mat hang mot ngay       │      20 │ periodic snapshot      │
│ Su kien web  │ mot su kien                 │      43 │ transaction (factless) │
│ Phan cong NV │ mot NV tren mot don         │      17 │ bridge                 │
└──────────────┴─────────────────────────────┴─────────┴────────────────────────┘
```

<details>
<summary>Lời giải</summary>

```sql
select 'Ban hang' quy_trinh, 'mot dong hang trong mot don' grain,
       (select count(*) from don_hang_chi_tiet) so_dong, 'transaction' loai_fact
union all select 'Tra hang', 'mot lan tra cua mot don',
       (select count(*) from tra_hang), 'transaction'
union all select 'Giao hang', 'mot don hang',
       (select count(*) from don_hang), 'accumulating snapshot'
union all select 'Ton kho', 'mot mat hang mot ngay',
       (select count(*) from kho_hang), 'periodic snapshot'
union all select 'Su kien web', 'mot su kien',
       (select count(*) from su_kien_web), 'transaction (factless)'
union all select 'Phan cong NV', 'mot NV tren mot don',
       (select count(*) from nhan_vien_don), 'bridge';
```

Chi tiết đáng dừng lại: **`don_hang` xuất hiện ở hai vai**. Là *nguồn* của quy trình
"Bán hàng" (cấp header), và là *fact* của quy trình "Giao hàng" — accumulating snapshot
với ba mốc `ngay_dat` → `ngay_giao` → `ngay_nhan`, mỗi mốc được cập nhật khi đơn tiến
bước.

Đó là lý do bước 1 phải làm **trước** bước 2: cùng một bảng nguồn có thể sinh ra hai
fact table với hai grain khác nhau, và chỉ khi đã chọn quy trình thì mới khai được grain.

Nhầm thứ tự — khai grain trước khi chọn quy trình — là cách nhanh nhất để dựng một bảng
"tổng hợp mọi thứ" mà không trả lời được câu hỏi nào cho ra hồn.

</details>

### Bài E.2 — Bước 3: dimension nào dùng được cho quy trình nào

**Đề:** dựng **bus matrix** dạng bảng: sáu quy trình × các dimension (`Ngay`, `Khach`,
`Hang hoa`, `Nhan vien`, `Tien te`), đánh dấu `X` nếu dimension đó áp dụng được.

Bài này không có SQL — **viết bảng bằng tay** rồi so với lời giải. Điền sai chỗ nào thì
đó chính là chỗ bạn sẽ dựng sai mô hình.

<details>
<summary>Lời giải</summary>

| Quy trình | Ngay | Khach | Hang hoa | Nhan vien | Tien te |
|---|---|---|---|---|---|
| Bán hàng | X | X | X | X | — |
| Trả hàng | X | X | — | — | — |
| Giao hàng | X | X | — | — | — |
| Tồn kho | X | — | X | — | — |
| Sự kiện web | X | X | X | — | — |
| Đơn ngoại tệ | X | X | — | — | X |

Ba điều đọc ra được từ bảng này:

**`Ngay` có mặt ở mọi dòng.** Đó là dấu hiệu nó là conformed dimension quan trọng nhất —
và cũng là lý do `dim_ngay` phải được dựng một lần, dùng chung, không mỗi mart một bản.

**`Hang hoa` vắng ở "Trả hàng".** Không phải vì nghiệp vụ không cần, mà vì `tra_hang`
chỉ ghi ở cấp **đơn**, không ghi mặt hàng nào bị trả. Đó là một **lỗ hổng dữ liệu nguồn**
— bus matrix làm nó lộ ra. Hệ quả: không trả lời được "tỷ lệ trả hàng theo mặt hàng" mà
không phân bổ, và bộ 5 sẽ làm đúng chuyện đó.

**Hai quy trình dùng chung ≥2 dimension thì so được số với nhau.** "Bán hàng" và "Trả
hàng" chung `Ngay` + `Khach` → drill-across được. "Tồn kho" và "Sự kiện web" chỉ chung
`Ngay` + `Hang hoa` → vẫn ghép được, nhưng theo hai trục đó thôi.

Xem [Bus architecture](../reference/bus-architecture.md); luyện kỹ ở bộ 6.

</details>

### Bài E.3 — Bước 4: fact table chỉ được chứa hai loại cột

**Đề:** kiểm `obt_ban_hang` xem nó có thoả luật *"fact table chỉ chứa khoá ngoại + số
đo"* không. Liệt kê những cột **vi phạm**, và giải thích vì sao OBT được phép vi phạm.

<details>
<summary>Lời giải</summary>

```sql
select column_name, data_type from information_schema.columns
where table_schema='main' and table_name='obt_ban_hang' order by ordinal_position;
```

Trong 17 cột, chỉ **5** hợp lệ theo luật fact:

| Nhóm | Cột |
|---|---|
| Khoá ngoại | `khach_id`, `ma_hang`, `ngay_dat` |
| Degenerate | `don_hang_id`, `dong` |
| **Số đo** | `so_luong`, `don_gia`, `tien_hang`, `phi_ship` |
| **Vi phạm — thuộc tính dimension** | `ho_ten`, `khu_vuc`, `khach_hang_muc`, `ten_hang`, `nhom`, `nhom_day_du`, `do_sau_nhom`, `trang_thai` |

Tám cột vi phạm. Đó **là định nghĩa** của OBT chứ không phải lỗi: OBT cố tình nhét thuộc
tính dimension vào fact để khỏi join.

Được phép, với đúng ba điều kiện — thiếu một là hỏng:

1. Mọi join dựng ra nó là **nhiều-một** (bài D.3).
2. Không cần lịch sử thuộc tính — **không Type 2** (bài D.4).
3. Thuộc tính **hiếm khi đổi tên** (bài D.4 lần nữa).

Với `star`, thay vì kiểm bằng mắt thì kiểm bằng test:

```sql
-- moi cot khong phai khoa/so do deu la vi pham
select count(*) so_cot_vi_pham from information_schema.columns
where table_name = 'fct_ban_hang'
  and column_name not like '%_key'
  and column_name not in ('don_hang_id','dong','so_luong','don_gia','tien_hang');
```

Đặt câu này thành test chạy mỗi lần build thì không ai lén thêm `ten_khach` vào fact
được nữa. Xem [Quy trình thiết kế 4 bước](../reference/design-process.md).

</details>

### Bài E.4 — Chạy đủ 4 bước cho một yêu cầu mới

**Đề:** yêu cầu nghiệp vụ: *"Cho tôi xem mỗi nhân viên bán được bao nhiêu, theo tháng."*
Đi đủ bốn bước, viết ra từng bước, rồi mới viết SQL.

Đây là bài **thiết kế**, không phải bài SQL. Viết bốn bước ra giấy trước.

<details>
<summary>Lời giải</summary>

**Bước 1 — Quy trình nghiệp vụ:** Bán hàng. *Không phải* "báo cáo nhân viên" — báo cáo là
đầu ra, quy trình là thứ sinh ra dữ liệu.

**Bước 2 — Grain:** một dòng hàng trong một đơn. Giữ grain mịn nhất, **đừng** khai
"một nhân viên một tháng" — gom sẵn theo tháng là mất khả năng trả lời mọi câu hỏi khác.

**Bước 3 — Dimension:** `Ngay`, `Khach`, `Hang hoa`, `Nhan vien`.

**Bước 4 — Số đo:** `so_luong`, `tien_hang`.

Và đây là chỗ bài này gài bẫy: **`Nhan vien` không phải quan hệ nhiều-một với đơn hàng.**
Bài A.2 đã đo rồi — 17 dòng `nhan_vien_don` cho 10 đơn. Join thẳng là phồng:

```sql
-- SAI: phong vi mot don co nhieu nhan vien
select nv.ho_ten, sum(ct.so_luong*ct.don_gia) doanh_thu
from don_hang_chi_tiet ct
join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id)
group by 1;
```

Đúng thì phải qua **bridge table có hệ số phân bổ**:

```sql
-- DUNG: nhan he so, tong khong phong
select nv.ho_ten, round(sum(ct.so_luong*ct.don_gia * nd.he_so)) doanh_thu
from don_hang_chi_tiet ct
join nhan_vien_don nd using (don_hang_id)
join nhan_vien nv using (nv_id)
group by 1 order by 2 desc;
```

Chạy thử cả hai và so tổng — bạn sẽ thấy tổng của bản "đúng" **vẫn chưa** bằng
10.215.000. Vì sao thì để bộ 4 trả lời: có một đơn trong `nhan_vien_don` có tổng hệ số
**không bằng 1**. Đó là bài [bridge table](../skills/bridge-table.md).

Bài học của bước 4: **xác định số đo là lúc phát hiện ra quan hệ nhiều-nhiều**, không
phải lúc viết báo cáo.

</details>

---

## Bảng đối chiếu nhanh

| Số | Nghĩa | Bài |
|---|---|---|
| 10 · 15 · 10.215.000 · 400.000 | bốn mốc gốc, mọi bài phải khớp | A.5 |
| 75 dòng · 51.075.000 | trộn grain với `kho_hang` → nhân 5 | A.3 |
| 420 / 78 / 84,0 | semi-additive: cộng dọc / cuối kỳ / trung bình | A.4 |
| 13 hay 14 phiên | grain của "phiên" là quyết định nghiệp vụ | B.4 |
| 4–5 giá trị vs 1–2 tổ hợp | `diem_tin_dung` là số đo trá hình | B.5 |
| 4 khách → 6 dòng | Type 2 chỉ theo cột chậm | C.2 |
| 15 dòng · 15.060.000 (+47,4%) | join Type 2 bằng natural key | C.3 |
| 8 + 2 = 10 | khoá `-1` khép kín, `NULL` thì không | C.4 |
| 4 vs 1 dòng phải sửa | OBT vs snowflake khi đổi nhãn | D.4 |
| 0 dòng | *"Màn hình"* ≠ *"Man hinh"* — bẫy conformed | D.4 |

## Related Topics

- [Bài tập — Data Modeling](index.md) — mục lục bộ bài tập
- [Bài tập bộ 2 — Dimension theo thời gian](bt-02-dimension-thoi-gian.md) — bộ tiếp theo
- [Phụ lục seed](bt-00-seed.md) — nội dung bảy bảng mới
- [Tài liệu — Data Modeling](../reference/index.md) — lý thuyết của năm kỹ thuật trên
