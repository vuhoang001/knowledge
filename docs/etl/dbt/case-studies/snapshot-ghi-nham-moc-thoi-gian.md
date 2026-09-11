---
title: "Fintech — snapshot ghi mốc theo giờ chạy, báo cáo as-was lệch 25%"
sidebar_position: 3
description: "dbt snapshot bật đúng, chạy đúng, join đúng cú pháp — mà báo cáo lịch sử vẫn sai, vì dbt_valid_from là giờ chạy job chứ không phải giờ nghiệp vụ."
tags: [dbt, snapshot, scd2, case-study, as-was, fintech, lich-su]
domain: data-engineering
category: pattern
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-09-11
---

# Fintech — snapshot ghi mốc theo giờ chạy

> **Chốt:** `dbt snapshot` ghi `dbt_valid_from` bằng **thời điểm chạy snapshot**, không
> phải thời điểm nghiệp vụ. Khi câu hỏi là *"lúc khách đặt đơn, họ thuộc vùng nào"* thì
> snapshot trả lời sai — hoặc trả lời rỗng — và cú pháp join thì không có gì để sửa.

> **Về tính xác thực.** Bối cảnh doanh nghiệp là dựng lại. **Output snapshot và hai bảng
> doanh thu as-was/as-is là số thật**, chạy trên lab `~/Documents/learn-lab/dbt`
> (dbt-core 1.12.0 + dbt-duckdb 1.10.1). `verified_at` trống vì chủ repo chưa chạy lại.

## Bối cảnh

Một công ty fintech phân chia khách theo **khu vực** và **hạng thành viên**. Cả hai đổi
theo thời gian: khách chuyển nhà, khách lên hạng.

Báo cáo doanh thu theo khu vực được hai phòng dùng theo hai nghĩa khác nhau — và không
ai viết ra sự khác nhau đó:

| Phòng | Câu hỏi thật | Cần |
|---|---|---|
| Kinh doanh | "vùng nào bán được?" | **as-was** — vùng của khách *tại ngày giao dịch* |
| Marketing | "gửi khuyến mãi cho vùng nào?" | **as-is** — vùng *hiện tại* |

Đội dữ liệu bật `dbt snapshot` cho bảng khách hàng, nghĩ rằng thế là xong phần as-was.

## Triệu chứng

Sau khi dựng xong, báo cáo as-was trả về **0 dòng**. Không lỗi, không cảnh báo — chỉ là
bảng rỗng.

## Giả thuyết sai lúc đầu

**Giả thuyết 1: join thiếu `coalesce`.** Đây là lỗi số một khi dùng snapshot —
`dbt_valid_to` của dòng hiện hành là `NULL`, và `x < NULL` cho ra `NULL` chứ không phải
`true`, nên mất sạch dòng mới nhất.

```sql
-- thiếu coalesce: mất dòng hiện hành
and f.ngay_dat < k.dbt_valid_to
```

Thêm `coalesce` vào:

```sql
and f.ngay_dat < coalesce(k.dbt_valid_to, timestamp '9999-12-31')
```

Vẫn **0 dòng**. Giả thuyết đúng về mặt kỹ thuật nhưng không phải nguyên nhân ở đây.

**Giả thuyết 2: snapshot chưa chạy lần nào.** Kiểm: bảng có dữ liệu, có 2 phiên bản cho
khách đã đổi vùng. Loại.

**Giả thuyết 3: sai kiểu dữ liệu khi so `date` với `timestamp`.** Ép kiểu tường minh
hai phía. Vẫn 0 dòng. Loại.

Bước ngoặt là khi ai đó in thẳng hai cột thời gian ra xem.

## Dựng lại

```yaml
# snapshots/snap_khach_hang.yml
snapshots:
  - name: snap_khach_hang
    relation: ref('khach_hang')
    config:
      unique_key: khach_id
      strategy: check
      check_cols: [khu_vuc, hang]
```

Chạy lần một, đổi dữ liệu (`C1`: *Mien Nam → Mien Bac*, hạng *Bac → Vang*), chạy lần
hai:

```text
02:40:27  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.09s]
02:40:34  1 of 1 OK snapshotted main.snap_khach_hang ..................................... [OK in 0.16s]
```

```text
┌──────────┬──────────┬─────────┬────────────────────────────┬────────────────────────────┐
│ khach_id │ khu_vuc  │  hang   │       dbt_valid_from       │        dbt_valid_to        │
├──────────┼──────────┼─────────┼────────────────────────────┼────────────────────────────┤
│ C1       │ Mien Nam │ Bac     │ 2026-09-11 09:40:27.653852 │ 2026-09-11 09:40:34.225211 │
│ C1       │ Mien Bac │ Vang    │ 2026-09-11 09:40:34.225211 │ NULL                       │
└──────────┴──────────┴─────────┴────────────────────────────┴────────────────────────────┘
```

**Đó là nguyên nhân, nhìn thẳng vào mặt.** `09:40:27` và `09:40:34` cách nhau **7
giây** — đúng khoảng cách giữa hai lệnh tôi gõ. Khách hàng không chuyển vùng lúc 9 giờ
40 sáng ngày 11/09.

Mọi đơn hàng trong hệ thống đều thuộc **tháng 7**. Khoảng hiệu lực của snapshot bắt đầu
từ **tháng 9**. Không đơn nào rơi vào khoảng nào cả → join ra 0 dòng.

## Nguyên nhân gốc

`dbt snapshot` là **máy ghi âm, không phải máy thời gian**. Nó chỉ biết *"giữa hai lần
tôi nhìn, giá trị đã khác"*. Hai hệ quả:

1. **Không hồi tố.** Bật ngày nào thì lịch sử bắt đầu ngày đó. Toàn bộ quá khứ trước đó
   bị nén thành một dòng mang giá trị hiện tại.
2. **Độ phân giải bằng nhịp chạy.** Chạy hằng ngày thì hai lần đổi trong cùng một ngày
   chỉ ghi được một.

## Cách sửa — dựng SCD2 từ mốc nghiệp vụ

Nguồn ở đây **đã có sẵn lịch sử**: bảng `khach_hang_lich_su` là ảnh chụp hằng ngày, có
cột `ngay_trich` — một mốc nghiệp vụ thật. Nén ảnh chụp thành khoảng hiệu lực:

```sql
-- models/marts/dim_khach_hang_scd2.sql
with anh_chup as (
    select khach_id, ngay_trich, khu_vuc,
           lag(khu_vuc) over (partition by khach_id order by ngay_trich) as khu_vuc_truoc
    from {{ ref('khach_hang_lich_su') }}
),
moc_doi as (
    select * from anh_chup
    where khu_vuc_truoc is null or khu_vuc_truoc <> khu_vuc
)
select
    khach_id,
    khu_vuc,
    ngay_trich as valid_from,
    lead(ngay_trich) over (partition by khach_id order by ngay_trich) as valid_to
from moc_doi
```

```text
┌──────────┬────────────┬────────────┬────────────┐
│ khach_id │  khu_vuc   │ valid_from │  valid_to  │
├──────────┼────────────┼────────────┼────────────┤
│ C1       │ Mien Bac   │ 2026-07-01 │ 2026-07-03 │
│ C1       │ Mien Nam   │ 2026-07-03 │ NULL       │
│ C2       │ Mien Nam   │ 2026-07-01 │ NULL       │
│ C3       │ Mien Trung │ 2026-07-01 │ NULL       │
│ C4       │ Mien Bac   │ 2026-07-01 │ NULL       │
└──────────┴────────────┴────────────┴────────────┘
```

Mốc giờ là **01/07 và 03/07** — ngày nghiệp vụ thật, nằm cùng khoảng thời gian với đơn
hàng.

```sql
-- as-was
select d.khu_vuc, sum(ct.thanh_tien) as doanh_thu
from {{ ref('stg_don_hang') }} o
join {{ ref('stg_don_hang_chi_tiet') }} ct using (don_hang_id)
join {{ ref('dim_khach_hang_scd2') }} d
  on  d.khach_id = o.khach_id
  and o.ngay_dat >= d.valid_from
  and o.ngay_dat <  coalesce(d.valid_to, date '9999-12-31')
group by 1 order by 1
```

## Kết quả — và con số làm hai phòng cãi nhau

```text
-- AS-WAS                          -- AS-IS
┌────────────┬───────────┐         ┌────────────┬───────────┐
│  khu_vuc   │ doanh_thu │         │  khu_vuc   │ doanh_thu │
├────────────┼───────────┤         ├────────────┼───────────┤
│ Mien Bac   │   4200000 │         │ Mien Bac   │   1650000 │
│ Mien Nam   │   3915000 │         │ Mien Nam   │   6465000 │
│ Mien Trung │   2100000 │         │ Mien Trung │   2100000 │
└────────────┴───────────┘         └────────────┴───────────┘
```

| | Mien Bac | Mien Nam | Mien Trung | Tổng |
|---|---|---|---|---|
| as-was | 4.200.000 | 3.915.000 | 2.100.000 | 10.215.000 |
| as-is | 1.650.000 | 6.465.000 | 2.100.000 | 10.215.000 |
| **Chênh** | **−2.550.000** | **+2.550.000** | 0 | 0 |

**Chênh 2.550.000 trên tổng 10.215.000 — 25%.** Chỉ với **một** khách chuyển vùng
**một** lần. Tổng không đổi: tiền không mất đi, nó nằm ở vùng khác.

Trên dữ liệu thật với hàng nghìn khách, đây đúng là loại chênh làm hai phòng ban họp
với nhau ba buổi mà không ai sai.

## Bài học

1. **`dbt_valid_from` là giờ chạy job.** Câu này phải nói ra trước khi ai đó xây báo cáo
   lịch sử lên snapshot.
2. **Nguồn đã giữ lịch sử thì dựng SCD2 tay.** `dbt snapshot` là phương án khi nguồn
   **không giữ gì cả** — nó không phải lựa chọn mặc định cho mọi nhu cầu lịch sử.
3. **Bật snapshot cho mọi dimension quan trọng NGAY.** Nó không hồi tố; ngày bị hỏi mới
   bật là đã muộn mất vài tháng dữ liệu.
4. **as-was hay as-is là quyết định nghiệp vụ, không phải kỹ thuật.** Cả hai đều đúng
   cho câu hỏi của mình. Việc của đội dữ liệu là **ghi rõ vào `description`** model đang
   trả lời câu nào — và tốt nhất là dựng cả hai với tên khác nhau.
5. **`coalesce(valid_to, '9999-12-31')` là bắt buộc**, dù nó không phải nguyên nhân ở
   ca này. `x < NULL` ra `NULL` chứ không ra `true`.
6. **Bảng snapshot không sinh lại được.** Nó phải nằm trong lịch backup, và
   `dbt build --full-refresh` phải kèm `--exclude resource_type:snapshot`.

## Related Topics

- [Snapshot — bắt lịch sử thay đổi](../skills/snapshot-scd2.md) — cách làm đúng
- [SCD — Slowly Changing Dimension](../../../data-modeling/skills/scd.md) — as-was và as-is
- [SCD bằng dbt snapshot](../../../data-modeling/tutorials/scd-bang-dbt-snapshot.md) — lab đã chạy
- [Bài tập nâng cao](../tutorials/bt-03-nang-cao.md) — bài N2 dựng lại nguyên ca này
