---
title: SCD Type 2 bằng dbt snapshot — và cái bẫy không sách nào nói
i18n_status: untranslated
sidebar_position: 2
description: "Dựng SCD Type 2 bằng dbt snapshot, rồi tự tay phá nó: as-was join đúng lý thuyết lại trả về 0 dòng, và vì sao."
tags: [tutorial, scd, dbt, snapshot, duckdb, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# SCD Type 2 bằng dbt snapshot — và cái bẫy không sách nào nói

> **Chốt:** dbt lo phần cơ bắp của [SCD](../skills/scd.md) Type 2 — bốn cột
> `dbt_valid_from` / `dbt_valid_to` / `dbt_scd_id` / `dbt_updated_at` sinh tự động.
> Nhưng nó **chỉ ghi lịch sử từ lần bạn chạy đầu tiên**. Mọi fact có trước mốc đó không
> được phiên bản nào phủ — và as-was join sẽ trả về **rỗng** thay vì báo lỗi.

## Chuẩn bị

Lab nằm **ngoài repo** (xem `CLAUDE.md`): `~/Documents/learn-lab/dbt`.

```bash
cd ~/Documents/learn-lab/dbt
./.venv/bin/dbt --version      # dbt-core 1.12.0 · dbt-duckdb 1.10.1
```

Bốn seed dùng trong bài — `khach_hang` là nguồn của snapshot:

```csv
# seeds/khach_hang.csv
khach_id,ho_ten,khu_vuc,hang
C1,Nguyen Van A,Mien Bac,Bac
C2,Tran Thi B,Mien Nam,Vang
C3,Le Van C,Mien Trung,Bac
C4,Pham Thi D,Mien Bac,Kim cuong
```

`don_hang` (10 đơn, có `khach_id` và `ngay_dat` trong **tháng 7**) và
`don_hang_chi_tiet` (15 dòng, tổng **10.215.000**) là fact. Nhớ con số tổng — mọi bài
dưới đây đối chiếu với nó.

```bash
./.venv/bin/dbt seed --profiles-dir .
```

## Bài 1 — Khai snapshot, và ba quyết định của *người*

dbt sinh cột hộ bạn. Ba thứ nó **không** quyết được:

| Khai gì | Nghĩa là gì | Sai thì sao |
|---|---|---|
| `unique_key` | Natural key của thực thể | Sai khoá → mỗi lần chạy sinh phiên bản mới cho mọi dòng |
| `check_cols` | Cột **nào** đang được giữ lịch sử | Khai `'all'` là bật Type 2 cho cả cột đổi hằng ngày |
| `strategy` | `check` (so cột) hay `timestamp` (tin `updated_at` của nguồn) | `timestamp` mà nguồn nói dối → [mất thay đổi vĩnh viễn](../skills/scd-change-detection.md) |

```sql
-- snapshots/scd_khach_hang.sql
{% snapshot scd_khach_hang %}
{{ config(
     target_schema='main',
     unique_key='khach_id',
     strategy='check',
     check_cols=['khu_vuc', 'hang'],
     invalidate_hard_deletes=True
) }}
select khach_id, ho_ten, khu_vuc, hang from {{ ref('khach_hang') }}
{% endsnapshot %}
```

Thêm `snapshot-paths: ['snapshots']` vào `dbt_project.yml`, rồi:

```bash
./.venv/bin/dbt snapshot --profiles-dir .
```

```text
┌──────────┬────────────┬────────────────────────────┬──────────────┐
│ khach_id │  khu_vuc   │       dbt_valid_from       │ dbt_valid_to │
├──────────┼────────────┼────────────────────────────┼──────────────┤
│ C1       │ Mien Bac   │ 2026-08-04 14:56:48.759859 │ NULL         │
│ C2       │ Mien Nam   │ 2026-08-04 14:56:48.759859 │ NULL         │
│ C3       │ Mien Trung │ 2026-08-04 14:56:48.759859 │ NULL         │
│ C4       │ Mien Bac   │ 2026-08-04 14:56:48.759859 │ NULL         │
└──────────┴────────────┴────────────────────────────┴──────────────┘
```

**Nhìn kỹ `dbt_valid_from`: đó là *lúc bạn chạy lệnh*, không phải lúc dữ liệu phát sinh.**
Ghi nhớ điều này — bài 4 sẽ quay lại.

| Kết quả của bạn |
|---|
| |

## Bài 2 — Đổi một giá trị, chạy lại, xem phiên bản sinh ra

Sửa `seeds/khach_hang.csv`, đổi `C1` từ `Mien Bac` thành `Mien Nam`:

```bash
./.venv/bin/dbt seed --profiles-dir . -s khach_hang
./.venv/bin/dbt snapshot --profiles-dir .
```

```text
┌──────────┬────────────┬──────────┬────────────┐
│ khach_id │  khu_vuc   │    tu    │    den     │
├──────────┼────────────┼──────────┼────────────┤
│ C1       │ Mien Bac   │ 14:56:48 │ 14:57:12   │
│ C1       │ Mien Nam   │ 14:57:12 │ (hien tai) │
│ C2       │ Mien Nam   │ 14:56:48 │ (hien tai) │
│ C3       │ Mien Trung │ 14:56:48 │ (hien tai) │
│ C4       │ Mien Bac   │ 14:56:48 │ (hien tai) │
└──────────┴────────────┴──────────┴────────────┘
```

`C1` có **hai dòng**. Grain của bảng vừa đổi từ *một khách* thành
*[một phiên bản của một khách](../reference/grain.md)* — và `unique` trên `khach_id`
từ giờ sẽ FAIL, đúng như nó phải thế.

| Kết quả của bạn |
|---|
| |

## Bài 3 — Join sai: `dbt_valid_to is null`

Đây là câu ai cũng viết theo bản năng, vì nó ngắn và chạy được:

```sql
join scd_khach_hang d on d.khach_id = h.khach_id and d.dbt_valid_to is null
```

```text
┌────────────┬───────────┬────────┐
│  khu_vuc   │ doanh_thu │ so_don │
├────────────┼───────────┼────────┤
│ Mien Nam   │   6465000 │      6 │
│ Mien Trung │   2100000 │      2 │
│ Mien Bac   │   1650000 │      2 │
└────────────┴───────────┴────────┘
```

Tổng **10.215.000** — khớp nguồn. Không dòng nào mất, không test nào đỏ.

Nhưng cả ba đơn tháng 7 của `C1` bị gán vào **Miền Nam**, trong khi tháng 7 `C1` còn ở
Miền Bắc. Đây chính là [case study "Miền Bắc bằng 0"](../case-studies/fact-den-muon-gan-sai-khu-vuc.md),
tái hiện bằng tay.

**Câu hỏi:** một mệnh đề `and d.dbt_valid_to is null` đã vô hiệu hoá thứ gì mà bạn vừa
bỏ công dựng ở bài 1–2?

## Bài 4 — Join "đúng", và nó trả về **0 dòng**

Sửa lại cho đúng lý thuyết — khớp phiên bản có hiệu lực **tại ngày đặt hàng**:

```sql
join scd_khach_hang d on d.khach_id = h.khach_id
 and h.ngay_dat >= d.dbt_valid_from
 and h.ngay_dat <  coalesce(d.dbt_valid_to, timestamp '9999-12-31')
```

```text
┌─────────┬───────────┬────────┐
│ khu_vuc │ doanh_thu │ so_don │
├─────────┼───────────┼────────┤
└─────────┴───────────┴────────┘
             0 rows
```

**Không một dòng nào.** SQL đúng, mô hình đúng, và kết quả rỗng.

Dừng lại tự trả lời trước khi đọc tiếp: *vì sao?*

<details>
<summary>Đáp án</summary>

`dbt_valid_from` của **mọi** phiên bản đầu tiên là `2026-08-04` — lúc bạn chạy
`dbt snapshot` lần đầu. Còn đơn hàng nằm ở **tháng 7**.

Mọi fact đều có trước mốc đó, nên **không phiên bản nào phủ chúng**.

> dbt snapshot **không** dựng lại lịch sử quá khứ. Nó bắt đầu ghi từ lần chạy đầu tiên.
> Bạn chỉ có lịch sử kể từ ngày bạn nhớ ra là phải bật nó.

Đây là lý do thật để chạy `dbt snapshot` **ngay từ ngày đầu của dự án**, kể cả khi chưa
ai hỏi câu as-was nào — mỗi ngày trễ là một ngày lịch sử mất vĩnh viễn, và không có cách
lấy lại.

</details>

| Kết quả của bạn |
|---|
| |

## Bài 5 — Sửa: phiên bản đầu tiên có hiệu lực từ vô cực quá khứ

Cách xử lý chuẩn khi bật snapshot muộn — coi bản ghi **sớm nhất** của mỗi thực thể là đã
đúng từ trước khi kho tồn tại:

```sql
with d as (
  select *,
         dbt_valid_from = min(dbt_valid_from) over (partition by khach_id) as la_ban_dau
  from scd_khach_hang
)
...
join d on d.khach_id = h.khach_id
 and h.ngay_dat >= case when d.la_ban_dau then timestamp '1900-01-01' else d.dbt_valid_from end
 and h.ngay_dat <  coalesce(d.dbt_valid_to, timestamp '9999-12-31')
```

```text
┌────────────┬───────────┬────────┐
│  khu_vuc   │ doanh_thu │ so_don │
├────────────┼───────────┼────────┤
│ Mien Bac   │   4395000 │      5 │
│ Mien Nam   │   3720000 │      3 │
│ Mien Trung │   2100000 │      2 │
└────────────┴───────────┴────────┘
```

Kiểm bắt buộc — tổng và số dòng phải khớp nguồn:

```text
┌──────────┬─────────┐
│   tong   │ so_dong │
├──────────┼─────────┤
│ 10215000 │      15 │
└──────────┴─────────┘
```

### Ba con số đáng nhớ

| | Bài 3 (sai) | Bài 5 (đúng) | Chênh |
|---|---|---|---|
| Miền Bắc | 1.650.000 | **4.395.000** | thiếu **62%** |
| Miền Nam | 6.465.000 | 3.720.000 | phồng 74% |
| Tổng | 10.215.000 | 10.215.000 | **khớp cả hai** |

Dòng cuối là bài học: **tổng khớp không chứng minh gì cả.** Doanh thu chỉ bị *gán sai
chiều*, không bị mất — nên mọi test đối soát tổng đều xanh.

| Kết quả của bạn |
|---|
| |

## Bài 6 — `check_cols` và cái bẫy `'all'`

Đổi `check_cols=['khu_vuc', 'hang']` thành `check_cols='all'`, rồi sửa `ho_ten` của một
khách (thêm dấu, sửa chính tả) và chạy lại snapshot.

**Dự đoán trước khi chạy:** có sinh phiên bản mới không? Nên hay không nên?

Đối chiếu với [SCD](../skills/scd.md#khi-nào-nên-dùng): sửa lỗi chính tả tên là **Type 1**
— không ai chia báo cáo theo tên. Khai `'all'` là bắt cả cột đó giữ lịch sử, và
dimension phình theo nhịp của cột đổi nhiều nhất. Xem
[dimension phồng 365 lần](../case-studies/dimension-phinh-365-lan.md).

| Kết quả của bạn |
|---|
| |

## Bài 7 — Xoá ở nguồn thì sao?

`invalidate_hard_deletes=True` đã bật ở bài 1. Xoá dòng `C4` khỏi seed, chạy lại
snapshot, rồi kiểm:

```sql
select khach_id, khu_vuc, dbt_valid_to from scd_khach_hang where khach_id = 'C4';
```

**Câu hỏi:** dòng đó bị **xoá** hay bị **đóng lại**? Và vì sao lựa chọn đó quan trọng với
các fact đang trỏ vào nó?

| Kết quả của bạn |
|---|
| |

## Tự kiểm trước khi sang bài khác

Bốn phép kiểm nên chạy sau **mỗi** lần dựng lại mô hình:

```sql
-- 1. Grain cua snapshot: mot phien ban cua mot khach
select count(*) = count(distinct (khach_id, dbt_valid_from)) as grain_dung from scd_khach_hang;

-- 2. Khong chong lan khoang hieu luc
with x as (select khach_id, dbt_valid_to,
                  lead(dbt_valid_from) over (partition by khach_id order by dbt_valid_from) ke
           from scd_khach_hang)
select count(*) as so_khoang_chong_lan from x where ke is not null and ke <> dbt_valid_to;

-- 3. Tong fact khop nguon (10.215.000)
-- 4. Khong dong fact nao mat sau join (15 dong)
```

Ba và bốn là hai câu quan trọng nhất, và chúng **không** phát hiện được lỗi ở bài 3 —
đó là lý do phải có thêm một phép kiểm *as-was* riêng: doanh thu tháng 7 của `C1` phải
nằm ở Miền Bắc.

## Related Topics

- [SCD](../skills/scd.md) — Type 0–7 và cây quyết định cho từng cột
- [Phát hiện thay đổi cho SCD 2](../skills/scd-change-detection.md) — `strategy` chọn thế nào, bốn bẫy của hash
- [Dữ liệu về muộn](../skills/late-arriving.md) — vì sao `la_hien_tai` phá as-was
- [Grain](../reference/grain.md) — snapshot làm đổi grain của dimension
- [CS: Miền Bắc bằng 0](../case-studies/fact-den-muon-gan-sai-khu-vuc.md) — bài 3 chính là ca này
- [CS: dimension phồng 365 lần](../case-studies/dimension-phinh-365-lan.md) — bài 6 chính là ca này
- [Lab star schema bằng SQL thuần](star-schema-duckdb.md) — cùng mô hình, không qua dbt
