---
title: Snapshot — bắt lịch sử thay đổi (SCD Type 2)
sidebar_position: 7
description: "dbt snapshot chỉ ghi được lịch sử KỂ TỪ lần chạy đầu, và dbt_valid_from là giờ chạy chứ không phải giờ nghiệp vụ — hai sự thật quyết định mọi thứ còn lại."
tags: [dbt, snapshot, scd2, slowly-changing-dimension, lich-su]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-11
---

# Snapshot — bắt lịch sử thay đổi (SCD Type 2)

> **Chốt:** `dbt snapshot` là **máy ghi âm, không phải máy thời gian**. Nó chỉ ghi được
> thay đổi xảy ra *sau* lần chạy đầu tiên, và mốc thời gian nó ghi là **giờ chạy
> snapshot**, không phải giờ sự việc xảy ra ở nghiệp vụ. Hai câu này quyết định toàn bộ
> cách dùng.

## Mục tiêu học

Dựng được một snapshot SCD2, chạy hai lần với dữ liệu đổi ở giữa, đọc được
`dbt_valid_from`/`dbt_valid_to`, và nói được chính xác snapshot **không** trả lời được
câu hỏi nào.

## Bước 1 — Khai snapshot (cú pháp YAML, dbt 1.9+)

Từ dbt 1.9, snapshot khai trong file `.yml` thay vì khối `{% snapshot %}` trong `.sql`.
Cú pháp cũ vẫn chạy nhưng đã deprecated.

```yaml
# snapshots/snap_khach_hang.yml
snapshots:
  - name: snap_khach_hang
    relation: ref('khach_hang')      # hoặc source('erp', 'customers')
    config:
      unique_key: khach_id
      strategy: check
      check_cols: [khu_vuc, hang]
```

Bốn trường bắt buộc phải hiểu:

| Trường | Nghĩa | Sai thì sao |
|---|---|---|
| `relation` | bảng cần theo dõi | — |
| `unique_key` | khoá **nghiệp vụ**, không phải surrogate key | Trùng khoá → snapshot sinh dòng rác |
| `strategy` | `check` hoặc `timestamp` | xem Bước 4 |
| `check_cols` | cột nào đổi thì coi là phiên bản mới | Liệt kê thừa cột đổi liên tục → bảng phình |

## Bước 2 — Chạy lần đầu

```bash
dbt snapshot --profiles-dir .
```

```text
02:40:27  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.09s]
02:40:27  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

Bảng snapshot giờ có 4 dòng — đúng bằng số khách trong nguồn, tất cả đều
`dbt_valid_to = NULL`.

## Bước 3 — Đổi dữ liệu, chạy lần hai

Khách `C1` chuyển từ *Mien Nam* sang *Mien Bac* và lên hạng *Vang*:

```bash
dbt seed -s khach_hang --profiles-dir .
dbt snapshot --profiles-dir .
```

```text
02:40:34  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.16s]
02:40:34  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1
```

```text
┌──────────┬──────────┬─────────┬────────────────────────────┬────────────────────────────┐
│ khach_id │ khu_vuc  │  hang   │       dbt_valid_from       │        dbt_valid_to        │
├──────────┼──────────┼─────────┼────────────────────────────┼────────────────────────────┤
│ C1       │ Mien Nam │ Bac     │ 2026-09-11 09:40:27.653852 │ 2026-09-11 09:40:34.225211 │
│ C1       │ Mien Bac │ Vang    │ 2026-09-11 09:40:34.225211 │ NULL                       │
└──────────┴──────────┴─────────┴────────────────────────────┴────────────────────────────┘
```

Tổng bảng: 5 dòng (4 khách, `C1` có 2 phiên bản).

**Nhìn kỹ hai mốc thời gian.** `09:40:27` và `09:40:34` là giờ tôi chạy hai lệnh
`dbt snapshot`, cách nhau 7 giây. Khách hàng không chuyển vùng lúc 9 giờ 40 sáng —
snapshot không biết và không thể biết điều đó. Nó chỉ biết *"giữa hai lần tôi nhìn,
giá trị đã khác"*.

## Bước 4 — Bốn cột `dbt_*` và cách join

| Cột | Nghĩa |
|---|---|
| `dbt_scd_id` | hash của khoá + mốc thời gian — **surrogate key** của phiên bản |
| `dbt_updated_at` | mốc dbt dùng để so sánh |
| `dbt_valid_from` | phiên bản này bắt đầu có hiệu lực |
| `dbt_valid_to` | hết hiệu lực. `NULL` = **đang hiện hành** |

Join *as-was* — giá trị **tại thời điểm sự kiện**:

```sql
select f.don_hang_id, f.ngay_dat, k.khu_vuc
from {{ ref('fct_don_hang') }} f
join {{ ref('snap_khach_hang') }} k
  on  f.khach_id = k.khach_id
  and f.ngay_dat >= k.dbt_valid_from
  and f.ngay_dat <  coalesce(k.dbt_valid_to, timestamp '9999-12-31')
```

Join *as-is* — giá trị **hiện tại**:

```sql
join {{ ref('snap_khach_hang') }} k
  on f.khach_id = k.khach_id and k.dbt_valid_to is null
```

`coalesce(..., '9999-12-31')` là bắt buộc: `dbt_valid_to` của dòng hiện hành là `NULL`,
và `x < NULL` cho ra `NULL` chứ không phải `true` → mất sạch dòng mới nhất. Đây là lỗi
số một khi dùng snapshot.

## Bước 5 — `check` hay `timestamp`

| | `strategy: check` | `strategy: timestamp` |
|---|---|---|
| Cách phát hiện đổi | so từng cột trong `check_cols` | so cột `updated_at` của nguồn |
| Cần nguồn có gì | không cần gì | **phải có** cột `updated_at` đáng tin |
| Chi phí | đắt hơn (so nhiều cột) | rẻ |
| Rủi ro | bỏ sót cột không khai trong `check_cols` | nguồn quên cập nhật `updated_at` → **mất thay đổi im lặng** |

```yaml
config:
  unique_key: khach_id
  strategy: timestamp
  updated_at: cap_nhat_luc
```

`check_cols: all` tồn tại nhưng hiếm khi đúng — nó biến mọi cột kỹ thuật
(`_fivetran_synced`, `etl_batch_id`) thành lý do sinh phiên bản mới, và bảng phình theo
số lần chạy pipeline chứ không theo số thay đổi thật.

## Bước 6 — Hai sự thật phải nói ra trước khi ai đó tin vào snapshot

**1. Snapshot không hồi tố được.** Chạy lần đầu hôm nay thì lịch sử bắt đầu từ hôm nay.
Toàn bộ quá khứ trước đó bị nén thành một dòng duy nhất mang giá trị hiện tại. Không có
cách nào lấy lại — trừ khi nguồn còn giữ lịch sử ở đâu đó.

Hệ quả thực dụng: **bật snapshot cho mọi dimension quan trọng NGAY, kể cả khi chưa ai
hỏi tới lịch sử.** Ngày bị hỏi mới bật là muộn mất vài tháng dữ liệu.

**2. Snapshot là dữ liệu không sinh lại được.** Mọi thứ khác trong dbt đều dựng lại
được từ nguồn: xoá bảng, `dbt build`, xong. Bảng snapshot thì không — nó là bản ghi duy
nhất của những gì nguồn *từng* trông như thế nào.

| Hệ quả | Việc phải làm |
|---|---|
| `dbt build --full-refresh` xoá luôn snapshot | Loại snapshot ra: `dbt build --exclude resource_type:snapshot` |
| Snapshot phải nằm trong lịch backup | Coi như bảng nghiệp vụ, không phải bảng dẫn xuất |
| Không để snapshot ghi vào schema cá nhân của dev | Cho nó schema riêng, quyền ghi hạn chế |
| Nhịp chạy quyết định độ phân giải lịch sử | Chạy hằng ngày → không bao giờ biết có hai lần đổi trong một ngày |

## Lỗi thường gặp

| Lỗi | Triệu chứng | Cách sửa |
|---|---|---|
| Join quên `coalesce(dbt_valid_to, ...)` | mất sạch dòng hiện hành, as-was ra 0 dòng | Thêm `coalesce` |
| Tưởng `dbt_valid_from` là giờ nghiệp vụ | báo cáo lịch sử lệch theo lịch chạy job | Muốn giờ nghiệp vụ thì phải dựng SCD2 tay từ nguồn có `updated_at` |
| `unique_key` không unique ở nguồn | snapshot sinh dòng rác, không lỗi | Test `unique` trên nguồn **trước** khi snapshot |
| `check_cols: all` | bảng phình theo số lần chạy ETL | Liệt kê đúng cột nghiệp vụ |
| `--full-refresh` cả project | **mất vĩnh viễn lịch sử** | `--exclude resource_type:snapshot` |
| Snapshot đọc từ một model đã lọc | lịch sử chỉ có phần dữ liệu lọt lọc | Snapshot trỏ thẳng vào `source()` khi có thể |
| Chạy snapshot sau `dbt run` trong cùng job | model đọc snapshot cũ hơn một nhịp | `dbt snapshot` **trước**, rồi `dbt run` |

Thứ tự đúng trong job production:

```bash
dbt source freshness      # nguồn ôi thì dừng sớm
dbt snapshot              # ghi lịch sử TRƯỚC
dbt build                 # rồi mới build model đọc nó
```

## Related Topics

- [SCD — Slowly Changing Dimension](../../../data-modeling/skills/scd.md) — lý thuyết tám Type
- [Source, seed và snapshot](../reference/sources-seeds-snapshots.md)
- [SCD bằng dbt snapshot](../../../data-modeling/tutorials/scd-bang-dbt-snapshot.md) — lab đã chạy
- [Case study — snapshot chạy sau khi nguồn đã ghi đè](../case-studies/snapshot-ghi-nham-moc-thoi-gian.md)
- [Bài tập trung bình](../tutorials/bt-02-trung-binh.md) — bài T5
