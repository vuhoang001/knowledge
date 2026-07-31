---
title: Dimension phồng 365 lần sau một năm
sidebar_position: 3
description: Bật SCD Type 2 cho cột đổi hằng ngày — 100 nghìn khách thành 36,5 triệu dòng, query chậm dần đều.
tags: [case-study, scd, mini-dimension, fact, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Dimension phồng 365 lần sau một năm

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Phép tính bên dưới chạy thật.

> **Chốt:** [SCD](../skills/scd.md) Type 2 phình theo **nhịp của cột đổi nhanh nhất**
> trong bảng. Bật Type 2 cho một cột đổi hằng ngày là biến dimension thành fact.

## Bối cảnh

`dim_khach_hang`, 100 nghìn khách. Yêu cầu nghiệp vụ: *"báo cáo phải phản ánh hạng khách
tại thời điểm mua"*. Hoàn toàn chính đáng — đó là as-was, đúng việc của Type 2.

Bật Type 2 cho cả bảng. Trong bảng có:

| Cột | Nhịp đổi |
|---|---|
| `ho_ten`, `ngay_sinh` | gần như không đổi |
| `khu_vuc` | vài năm một lần |
| `hang_khach` | **hằng ngày** — tính lại theo chi tiêu 30 ngày gần nhất |

## Triệu chứng

Ba tháng sau: query chậm dần, không đột ngột. Sáu tháng: báo cáo chạy quá giờ. Phép tính
cho thấy vì sao:

```sql
WITH tham_so AS (SELECT 100000 AS so_khach, 365 AS so_ngay)
SELECT so_khach                 AS dong_neu_type1,
       so_khach * so_ngay       AS dong_neu_type2_doi_hang_ngay,
       so_khach * 2             AS dong_neu_type2_doi_2_lan_nam
FROM tham_so;
```

```text
┌────────────────┬──────────────────────────────┬──────────────────────────────┐
│ dong_neu_type1 │ dong_neu_type2_doi_hang_ngay │ dong_neu_type2_doi_2_lan_nam │
├────────────────┼──────────────────────────────┼──────────────────────────────┤
│         100000 │                     36500000 │                       200000 │
└────────────────┴──────────────────────────────┴──────────────────────────────┘
```

**36,5 triệu dòng** thay vì 100 nghìn. Trong khi nếu chỉ `khu_vuc` là Type 2 thì chỉ
**200 nghìn**.

Chênh lệch **182 lần** — và nó đến từ đúng một cột đặt sai chỗ.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Thiếu index / partition | Thêm vào, nhanh hơn chút, vẫn chậm dần |
| Warehouse cần nâng cấp | Nâng, mua thêm thời gian vài tháng |
| Query viết kém | Tối ưu được ít, vấn đề không nằm ở đó |
| Dữ liệu tăng tự nhiên | **Sai** — số khách không tăng, chỉ số dòng dimension tăng |

Chẩn đoán sai kinh điển: coi đây là **vấn đề hạ tầng**. Nâng cấp mua được thời gian
nhưng số dòng vẫn tăng tuyến tính theo ngày, nên chỉ hoãn chứ không giải.

Câu hỏi tách bạch: *"số khách hàng có tăng không?"* Không. Vậy đây không phải chuyện dữ
liệu tăng — mà là **mô hình sinh dòng**.

## Nguyên nhân thật

`hang_khach` **không phải thuộc tính dimension**. Nó là **số đo tính lại liên tục** —
tức là fact.

Phép thử ở [Fact và Dimension](../reference/fact-and-dimension.md): *cột này bạn sẽ `SUM`
hay `GROUP BY`?* `hang_khach` thì `GROUP BY` — nghe như dimension. Nhưng có một phép thử
thứ hai quan trọng hơn:

> **Cột này đổi nhanh tới mức nào?** Đổi nhanh hơn nhịp người ta hỏi về nó thì nó không
> thuộc dimension.

Không ai hỏi *"hạng khách hôm 14/03 lúc 9 giờ sáng"*. Nhưng Type 2 thì ghi lại **mọi**
lần đổi, kể cả những lần không ai cần.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `unique` trên `khach_sk` | ✅ xanh |
| `unique_combination_of_columns [khach_id, valid_from]` | ✅ xanh |
| `valid_from < valid_to` | ✅ xanh |
| Không có khoảng chồng lấn | ✅ xanh |

**Dimension hoàn toàn đúng.** Nó làm chính xác thứ được yêu cầu: ghi lại mọi thay đổi.
Không có bất biến nào bị phá.

Đây là loại lỗi không test nào bắt được vì nó **không phải lỗi dữ liệu** — nó là lỗi
quyết định thiết kế, và hậu quả xuất hiện dần theo thời gian chứ không xuất hiện ngay.

## Cách sửa

Ba lựa chọn, theo bản chất của cột:

| Cột thật ra là gì | Cách xử lý |
|---|---|
| Số đo đổi liên tục | Chuyển sang **fact** — mỗi dòng fact ghi giá trị lúc đó |
| Vài cột đổi nhanh, phần còn lại ổn định | [Mini-dimension](../skills/mini-dimension.md) |
| Chỉ cần giá trị hiện tại | Type 1 cho cột đó, Type 2 cho phần còn lại |

Với `hang_khach`, cách gọn nhất là **mini-dimension**:

```text
dim_khach_hang        100.000 dòng, Type 2 chỉ cho khu_vuc  → 200.000 sau 1 năm
dim_khach_hang_hang        ~5 dòng, bất biến — mọi hạng có thể có
fct_don_hang               khach_sk + khach_hang_sk
```

Lịch sử hạng khách chuyển từ dimension sang **fact**: mỗi đơn ghi lại khách lúc đó hạng
nào. Vẫn trả lời được as-was, mà dimension không phình.

**36,5 triệu → 200 nghìn dòng**, cùng một khả năng phân tích.

## Dấu hiệu nhận ra sớm

1. Có cột trong dimension được **tính lại theo lịch** (điểm số, hạng, phân khúc, dự báo).
2. Số dòng dimension tăng **đều đặn theo ngày**, không theo số thực thể.
3. Tỷ lệ `số dòng dimension / số thực thể phân biệt` lớn hơn ~10 và vẫn tăng.

Kiểm nhanh:

```sql
SELECT count(*) AS so_dong,
       count(DISTINCT khach_id) AS so_khach,
       round(1.0 * count(*) / count(DISTINCT khach_id), 1) AS dong_moi_khach
FROM dim_khach_hang;
```

`dong_moi_khach` tăng theo tháng là dấu hiệu chắc chắn. Đặt câu này thành một test
`severity: warn` với ngưỡng, xem [Triển khai test](../../etl/dbt/skills/implementing-tests.md).

## Related Topics

- [SCD](../skills/scd.md) — Type 2 và bảng chọn Type nào
- [Mini-dimension](../skills/mini-dimension.md) — cách sửa cụ thể, có ví dụ chạy được
- [Fact và Dimension](../reference/fact-and-dimension.md) — phép thử cột thuộc bảng nào
- [Grain](../reference/grain.md) — grain của dim Type 2 là *một phiên bản*, không phải *một khách*
