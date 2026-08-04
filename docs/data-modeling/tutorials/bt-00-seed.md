---
title: "Phụ lục seed — mười bảng cho bộ bài tập"
sidebar_position: 9
description: "Nội dung đầy đủ mười seed CSV mới, kèm bẫy cố ý của từng bảng và kỹ thuật nó phục vụ."
tags: [tutorial, seed, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Phụ lục seed — mười bảng cho bộ bài tập

> **Chốt:** năm seed cũ đủ để dạy grain và SCD, nhưng không đủ để dạy bridge, cây phân
> cấp, đa tiền tệ hay thực thể không đồng nhất. Mười bảng dưới đây bù đúng phần thiếu —
> và **không bảng nào làm đổi bốn số mốc gốc**.

## Bốn số mốc không được đổi

```text
10 don · 15 dong · doanh thu 10.215.000 · phi ship 400.000
```

Kiểm bất cứ lúc nào:

```sql
select count(distinct don_hang_id) so_don,
       (select count(*) from don_hang_chi_tiet) so_dong,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) doanh_thu,
       (select sum(phi_ship) from don_hang) phi_ship
from don_hang;
```

```text
┌────────┬─────────┬───────────┬──────────┐
│ so_don │ so_dong │ doanh_thu │ phi_ship │
├────────┼─────────┼───────────┼──────────┤
│     10 │      15 │  10215000 │   400000 │
└────────┴─────────┴───────────┴──────────┘
```

Lệch một trong bốn số là seed đã bị sửa — `dbt seed --full-refresh` để về gốc.

## Nạp toàn bộ

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

```text
Done. PASS=15 WARN=0 ERROR=0 SKIP=0 NO-OP=0 TOTAL=15
```

Mười lăm seed = năm bảng cũ + mười bảng dưới đây.

## Bảng tra: bảng nào dạy kỹ thuật nào

| Seed | Dòng | Kỹ thuật chính | Bẫy cố ý |
|---|---|---|---|
| `nhan_vien` | 4 | role-playing, cây tự tham chiếu | `NV04` không có quản lý → `NULL` |
| `nhan_vien_don` | 17 | bridge table | `DH008` tổng hệ số **0,9** |
| `cay_nhom_hang` | 8 | hierarchy sâu không đều | hai gốc; sâu 1→4 |
| `hang_hoa_nhom` | 4 | hierarchy, snowflake | `SP-D` treo ở cấp 2 |
| `khach_hang_lich_su` | 20 | SCD, phát hiện thay đổi, mini-dim | ba kiểu `updated_at` nói dối |
| `ty_gia` | 19 | đa tiền tệ | **thiếu EUR ngày 04/07** |
| `don_hang_ngoai_te` | 7 | đa tiền tệ | `DN07` là `VND`, không có trong `ty_gia` |
| `kho_hang` | 20 | semi-additive, periodic snapshot | `SP-B` từ 04/07 lệch **+1**, lan sang 05/07 |
| `su_kien_web` | 43 | factless, real-time, behavior | ngày 05/07 **cắt lúc 10:00** |
| `giao_dich_tai_chinh` | 12 | thực thể không đồng nhất | mỗi loại điền cột khác nhau |

---

## `nhan_vien.csv`

Dimension nhân viên, có khoá tự tham chiếu `nv_quan_ly_id` — dùng cho bài cây tổ chức.

```csv
nv_id,ho_ten,phong_ban,cap_bac,nv_quan_ly_id
NV01,Vu Van E,Kinh doanh,Nhan vien,NV02
NV02,Do Thi F,Kinh doanh,Truong nhom,NV04
NV03,Bui Van G,Ho tro,Nhan vien,NV04
NV04,Ngo Thi H,Kinh doanh,Giam doc,
```

**Bẫy:** `NV04` có `nv_quan_ly_id` rỗng. Recursive CTE lấy neo `where nv_quan_ly_id is null`
thì chạy đúng; lấy neo `where cap_bac = 'Giam doc'` thì hỏng ngay khi có giám đốc thứ hai.

## `nhan_vien_don.csv`

Bridge nhiều-nhiều: một đơn có thể do nhiều nhân viên cùng chốt, mỗi người một hệ số.

```csv
don_hang_id,nv_id,vai_tro,he_so
DH001,NV01,chinh,1.0
DH002,NV01,chinh,0.5
DH002,NV02,ho_tro,0.5
DH003,NV01,chinh,0.5
DH003,NV02,ho_tro,0.3
DH003,NV04,ho_tro,0.2
DH004,NV02,chinh,1.0
DH005,NV03,chinh,1.0
DH006,NV01,chinh,0.6
DH006,NV03,ho_tro,0.4
DH007,NV02,chinh,1.0
DH008,NV01,chinh,0.5
DH008,NV03,ho_tro,0.4
DH009,NV04,chinh,1.0
DH010,NV01,chinh,0.3
DH010,NV02,ho_tro,0.3
DH010,NV04,ho_tro,0.4
```

**Bẫy:** `DH008` có hệ số **0,5 + 0,4 = 0,9**. Chín đơn kia khép kín ở 1,0. Nhân hệ số
rồi cộng lại sẽ **thiếu 10% giá trị của DH008** — và không có gì báo lỗi. Đây là bài
"kiểm hệ số khép kín" của bộ 4.

17 dòng cho 10 đơn cũng là bằng chứng `don_hang_id` **không** phải khoá của bảng này.

## `cay_nhom_hang.csv`

Cây phân cấp nhóm hàng, kiểu cha–con.

```csv
nhom_id,ten_nhom,nhom_cha_id
N1,Cong nghe,
N2,May tinh,N1
N3,Thiet bi ngoai vi,N1
N4,Laptop,N2
N5,Thiet bi nhap,N3
N6,Man hinh,N3
N7,Hang thanh ly,
N8,Laptop van phong,N4
```

Hình cây:

```text
N1 Cong nghe
├── N2 May tinh
│   └── N4 Laptop
│       └── N8 Laptop van phong      cap 4
└── N3 Thiet bi ngoai vi
    ├── N5 Thiet bi nhap             cap 3
    └── N6 Man hinh                  cap 3
N7 Hang thanh ly                     cap 1, goc rieng
```

**Hai bẫy:** cây có **hai gốc** (`N1` và `N7`) — neo recursive sai là mất nguyên nhánh;
và độ sâu chạy từ 1 tới 4 — dẹt cố định ba cấp là hỏng.

## `hang_hoa_nhom.csv`

Nối mặt hàng vào cây. Tách riêng khỏi `hang_hoa` để cột `nhom` dẹt cũ vẫn còn, phục vụ
bài so sánh.

```csv
ma_hang,nhom_id
SP-A,N5
SP-B,N6
SP-C,N8
SP-D,N3
```

**Bẫy:** `SP-D` treo ở **cấp 2**, trong khi `SP-C` ở cấp 4. Cây ragged đúng nghĩa.

**Bẫy thứ hai, nặng hơn:** `hang_hoa.nhom` ghi *"Màn hình"* **có dấu**, còn
`cay_nhom_hang.ten_nhom` ghi *"Man hinh"* **không dấu**. Join hai bảng bằng tên nhóm trả
**0 dòng**, không lỗi. Đó là bài conformed dimension của bộ 6.

## `khach_hang_lich_su.csv`

Bản trích khách hàng **mỗi ngày một lần**, 4 khách × 5 ngày. Đây là nguồn để tự dựng SCD
Type 2 mà không cần `dbt snapshot`.

```csv
ngay_trich,khach_id,ho_ten,khu_vuc,hang,nhom_tuoi,khoang_thu_nhap,diem_tin_dung,updated_at
2026-07-01,C1,Nguyen Van A,Mien Bac,Bac,25-34,10-20tr,700,2026-06-28
2026-07-01,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,780,2026-06-30
2026-07-01,C3,Le Van C,Mien Trung,Bac,45-54,5-10tr,650,2026-06-25
2026-07-01,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,820,2026-06-20
2026-07-02,C1,Nguyen Van A,Mien Bac,Bac,25-34,10-20tr,705,2026-06-28
2026-07-02,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,782,2026-06-30
2026-07-02,C3,Le Van C,Mien Trung,Bac,45-54,5-10tr,655,2026-06-25
2026-07-02,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,825,2026-06-20
2026-07-03,C1,Nguyen Van A,Mien Nam,Bac,25-34,10-20tr,705,2026-06-28
2026-07-03,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,782,2026-07-03
2026-07-03,C3,Le Van C,Mien Trung,Bac,45-54,5-10tr,655,2026-06-25
2026-07-03,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,830,2026-06-20
2026-07-04,C1,Nguyen Van A,Mien Nam,Bac,25-34,20-30tr,710,2026-07-04
2026-07-04,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,785,2026-07-03
2026-07-04,C3,Le Van C,Mien Trung,Vang,45-54,10-20tr,700,2026-07-04
2026-07-04,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,835,2026-06-20
2026-07-05,C1,Nguyen Van A,Mien Nam,Bac,25-34,20-30tr,712,2026-07-04
2026-07-05,C2,Tran Thi B,Mien Nam,Vang,35-44,20-30tr,788,2026-07-03
2026-07-05,C3,Le Van C,Mien Trung,Vang,45-54,10-20tr,702,2026-07-04
2026-07-05,C4,Pham Thi D,Mien Bac,Kim cuong,25-34,tren-30tr,840,2026-06-20
```

Đây là bảng nhiều bẫy nhất trong kho. **Ba kiểu `updated_at` nói dối**, mỗi kiểu hỏng
một cách khác nhau:

| Khách | Chuyện xảy ra | `updated_at` | Hỏng cái gì |
|---|---|---|---|
| `C1` | 03/07 `khu_vuc` **đổi thật** `Mien Bac`→`Mien Nam` | **không nhích** | tin `updated_at` → **bỏ sót** thay đổi |
| `C2` | 03/07 **không cột nào đổi** | **nhích** lên `2026-07-03` | tin `updated_at` → sinh **phiên bản thừa** |
| `C4` | `diem_tin_dung` đổi **mỗi ngày** | đứng yên từ 20/06 | tin cột → dim phình **5×** vì một cột |
| `C3` | 04/07 `hang` `Bac`→`Vang` | nhích đúng | trường hợp duy nhất chạy êm |

Hai cột `nhom_tuoi` và `khoang_thu_nhap` là nguyên liệu mini-dimension;
`diem_tin_dung` là số đo trá hình.

## `ty_gia.csv`

Tỷ giá theo ngày, hai đồng tiền.

```csv
ngay,tien_te,ty_gia
2026-07-01,USD,25400
2026-07-02,USD,25400
2026-07-03,USD,25450
2026-07-04,USD,25450
2026-07-05,USD,25500
2026-07-06,USD,25500
2026-07-07,USD,25500
2026-07-08,USD,25550
2026-07-09,USD,25600
2026-07-10,USD,25600
2026-07-01,EUR,27600
2026-07-02,EUR,27650
2026-07-03,EUR,27700
2026-07-05,EUR,27750
2026-07-06,EUR,27800
2026-07-07,EUR,27800
2026-07-08,EUR,27850
2026-07-09,EUR,27900
2026-07-10,EUR,27950
```

**Bẫy:** **không có dòng `EUR` ngày `2026-07-04`** — 19 dòng chứ không phải 20. `inner join`
theo `(ngay, tien_te)` sẽ **nuốt lặng** đơn `DN03`. Cách chữa là as-of join lấy tỷ giá
gần nhất trước đó, không phải join bằng.

## `don_hang_ngoai_te.csv`

Đơn hàng ghi bằng ngoại tệ, tách khỏi `don_hang` để bốn số mốc không đổi.

```csv
don_ngoai_id,khach_id,ngay_dat,tien_te,so_tien
DN01,C1,2026-07-01,USD,400
DN02,C2,2026-07-02,EUR,250
DN03,C3,2026-07-04,EUR,300
DN04,C4,2026-07-05,USD,150
DN05,C1,2026-07-08,USD,220
DN06,C2,2026-07-09,EUR,180
DN07,C3,2026-07-03,VND,1500000
```

**Hai bẫy:** `DN03` rơi đúng ngày thiếu tỷ giá EUR; `DN07` ghi bằng `VND` — **đồng tiền
gốc không có trong `ty_gia`**, nên inner join làm mất nốt dòng này. Đúng là 2 trong 7
đơn bốc hơi, tức **28,6%** doanh thu ngoại tệ.

## `kho_hang.csv`

Periodic snapshot: tồn cuối ngày của từng mặt hàng, kèm giá vốn.

```csv
ngay,ma_hang,ton_cuoi_ngay,gia_von
2026-07-01,SP-A,93,90000
2026-07-01,SP-B,49,200000
2026-07-01,SP-C,20,650000
2026-07-01,SP-D,200,30000
2026-07-02,SP-A,90,90000
2026-07-02,SP-B,43,200000
2026-07-02,SP-C,19,650000
2026-07-02,SP-D,200,30000
2026-07-03,SP-A,80,90000
2026-07-03,SP-B,43,200000
2026-07-03,SP-C,16,650000
2026-07-03,SP-D,200,30000
2026-07-04,SP-A,79,90000
2026-07-04,SP-B,41,200000
2026-07-04,SP-C,16,650000
2026-07-04,SP-D,199,30000
2026-07-05,SP-A,78,90000
2026-07-05,SP-B,41,200000
2026-07-05,SP-C,16,650000
2026-07-05,SP-D,193,30000
```

Tồn đầu kỳ 01/07: `SP-A` 100 · `SP-B` 50 · `SP-C` 20 · `SP-D` 200.

**Bẫy:** tồn giảm **khớp đúng** số bán ra ở mọi dòng, trừ `SP-B` ngày 04/07 — phải là 40
nhưng ghi 41.

Đối soát sẽ báo **hai** dòng lệch chứ không phải một: 04/07 và 05/07, vì sai số cộng dồn
sang ngày sau. Một nguyên nhân, hai triệu chứng. Bài của bộ 7 là tìm ra **dòng đầu tiên**
lệch — sửa nó là hai triệu chứng cùng biến mất.

Bảng này còn là ví dụ semi-additive chuẩn: cộng theo mặt hàng thì đúng, cộng theo ngày
thì ra số vô nghĩa.

## `su_kien_web.csv`

Factless fact — 43 sự kiện, không cột tiền nào.

```csv
su_kien_id,khach_id,thoi_diem,loai_su_kien,ma_hang,don_hang_id
E001,C1,2026-07-01 09:00:00,xem,SP-A,
E002,C1,2026-07-01 09:05:00,them_gio,SP-A,
E003,C1,2026-07-01 09:10:00,xem,SP-B,
E004,C1,2026-07-01 09:12:00,them_gio,SP-B,
E005,C1,2026-07-01 09:20:00,thanh_toan,,DH001
E006,C2,2026-07-01 14:00:00,xem,SP-A,
E007,C2,2026-07-01 14:03:00,them_gio,SP-A,
E008,C2,2026-07-01 14:10:00,thanh_toan,,DH002
E009,C1,2026-07-02 08:00:00,xem,SP-C,
E010,C1,2026-07-02 08:04:00,them_gio,SP-C,
E011,C1,2026-07-02 08:10:00,xem,SP-A,
E012,C1,2026-07-02 08:11:00,them_gio,SP-A,
E013,C1,2026-07-02 08:15:00,xem,SP-B,
E014,C1,2026-07-02 08:16:00,them_gio,SP-B,
E015,C1,2026-07-02 08:30:00,thanh_toan,,DH003
E016,C3,2026-07-02 15:00:00,xem,SP-B,
E017,C3,2026-07-02 15:02:00,them_gio,SP-B,
E018,C3,2026-07-02 15:10:00,thanh_toan,,DH004
E019,C3,2026-07-02 16:00:00,xem,SP-C,
E020,C2,2026-07-03 10:00:00,xem,SP-C,
E021,C2,2026-07-03 10:05:00,them_gio,SP-C,
E022,C2,2026-07-03 10:06:00,them_gio,SP-C,
E023,C2,2026-07-03 10:20:00,thanh_toan,,DH005
E024,C4,2026-07-03 11:00:00,xem,SP-A,
E025,C4,2026-07-03 11:02:00,them_gio,SP-A,
E026,C4,2026-07-03 11:15:00,thanh_toan,,DH006
E027,C1,2026-07-03 13:00:00,xem,SP-D,
E028,C1,2026-07-04 09:00:00,xem,SP-D,
E029,C1,2026-07-04 09:02:00,them_gio,SP-D,
E030,C1,2026-07-04 09:05:00,xem,SP-A,
E031,C1,2026-07-04 09:06:00,them_gio,SP-A,
E032,C1,2026-07-04 09:15:00,thanh_toan,,DH007
E033,C3,2026-07-04 10:00:00,xem,SP-B,
E034,C3,2026-07-04 10:01:00,them_gio,SP-B,
E035,C3,2026-07-04 10:10:00,thanh_toan,,DH008
E036,C2,2026-07-04 20:00:00,xem,SP-C,
E037,C2,2026-07-05 08:00:00,xem,SP-D,
E038,C2,2026-07-05 08:02:00,them_gio,SP-D,
E039,C2,2026-07-05 08:10:00,thanh_toan,,DH009
E040,C4,2026-07-05 09:00:00,xem,SP-A,
E041,C4,2026-07-05 09:01:00,them_gio,SP-A,
E042,C4,2026-07-05 09:30:00,thanh_toan,,DH010
E043,C1,2026-07-05 09:50:00,xem,SP-C,
```

Số sự kiện theo ngày: 01/07 **8** · 02/07 **11** · 03/07 **8** · 04/07 **9** · 05/07 **7**.

**Bẫy:** ngày 05/07 **cắt lúc 10:00** — nó là "hôm nay", chưa đầy. Nhưng nó vẫn được đếm
là một ngày đủ, nên mọi phép `avg` theo ngày đều bị nó kéo xuống. Đó là bài real-time
fact của bộ 7.

`ma_hang` chỉ có ở `xem`/`them_gio`, `don_hang_id` chỉ có ở `thanh_toan` — không dòng
nào có cả hai.

## `giao_dich_tai_chinh.csv`

Bốn loại giao dịch trong một bảng, mỗi loại điền một bộ cột khác nhau.

```csv
gd_id,ngay,khach_id,loai_gd,so_tien,ky_han_thang,lai_suat,ma_the,phi_giao_dich,don_hang_id
GD01,2026-07-01,C1,nap_tien,5000000,,,,,
GD02,2026-07-01,C2,thanh_toan_the,2400000,,,THE-9012,,DH002
GD03,2026-07-02,C1,gui_tiet_kiem,20000000,6,5.8,,,
GD04,2026-07-02,C3,nap_tien,3000000,,,,,
GD05,2026-07-03,C2,rut_tien,1000000,,,,22000,
GD06,2026-07-03,C4,thanh_toan_the,1500000,,,THE-3344,,DH006
GD07,2026-07-04,C1,thanh_toan_the,195000,,,THE-1122,,DH007
GD08,2026-07-04,C3,gui_tiet_kiem,10000000,12,6.5,,,
GD09,2026-07-05,C2,rut_tien,500000,,,,11000,
GD10,2026-07-05,C4,nap_tien,8000000,,,,,
GD11,2026-07-06,C1,rut_tien,2000000,,,,44000,
GD12,2026-07-06,C3,thanh_toan_the,900000,,,THE-5566,,
```

Cột nào thuộc loại nào:

| `loai_gd` | Cột được điền | Cột luôn rỗng |
|---|---|---|
| `nap_tien` | `so_tien` | `ky_han_thang`, `lai_suat`, `ma_the`, `phi_giao_dich` |
| `rut_tien` | `so_tien`, `phi_giao_dich` | `ky_han_thang`, `lai_suat`, `ma_the` |
| `gui_tiet_kiem` | `so_tien`, `ky_han_thang`, `lai_suat` | `ma_the`, `phi_giao_dich` |
| `thanh_toan_the` | `so_tien`, `ma_the`, `don_hang_id` | `ky_han_thang`, `lai_suat`, `phi_giao_dich` |

**Bẫy:** `GD12` là `thanh_toan_the` nhưng **không có `don_hang_id`** — thanh toán ngoài
hệ thống đơn hàng. Ai giả định "mọi thanh toán thẻ đều khớp một đơn" sẽ mất dòng này khi
inner join.

Đây là bài supertype/subtype của bộ 4: giữ một bảng rừng `NULL`, hay tách bốn bảng, hay
dùng measure type.

## Related Topics

- [Bài tập — Data Modeling](index.md) — mục lục bộ bài tập
- [Bài tập bộ 1 — Nền tảng](bt-01-nen-tang.md) — bộ đầu tiên dùng các bảng này
