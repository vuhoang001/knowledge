---
title: Báo cáo tháng 1 tự đổi số vào tháng 4
i18n_status: untranslated
sidebar_position: 1
description: Cùng một báo cáo, cùng một kỳ đã đóng sổ, chạy lại ra số khác — vì dimension là Type 1.
tags: [case-study, scd, data-modeling, as-was]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: beginner
verified_at:
updated: 2026-07-31
---

# Báo cáo tháng 1 tự đổi số vào tháng 4

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Nhưng **mọi con số dưới đây
> chạy thật trên DuckDB** — bạn dán lại là ra y hệt.

> **Chốt:** Dimension Type 1 làm báo cáo về **quá khứ đã đóng sổ** thay đổi theo thời
> điểm chạy. Không exception, không test đỏ, không log. Nó giống hệt có người sửa số.

## Bối cảnh

Mart doanh thu theo khu vực. `dim_khach_hang` là Type 1 — cập nhật thì **ghi đè**.

```sql
CREATE TABLE fct_don AS SELECT * FROM (VALUES
 ('DH001', DATE '2026-01-10','KH001',5000000),
 ('DH002', DATE '2026-01-15','KH002',3000000),
 ('DH003', DATE '2026-05-20','KH001',2000000))
 AS t(ma_don, ngay, khach_id, thanh_tien);

CREATE TABLE dim_t1 AS SELECT * FROM (VALUES
 ('KH001','Miền Bắc'),('KH002','Miền Nam')) AS t(khach_id, khu_vuc);
```

Báo cáo doanh thu tháng 1, chạy vào **tháng 2**:

```sql
SELECT d.khu_vuc, sum(f.thanh_tien) AS doanh_thu
FROM fct_don f JOIN dim_t1 d USING (khach_id)
WHERE f.ngay < DATE '2026-02-01'
GROUP BY 1 ORDER BY 1;
```

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ Miền Bắc │   5000000 │
│ Miền Nam │   3000000 │
└──────────┴───────────┘
```

Sếp duyệt. Tháng 1 đóng sổ.

## Triệu chứng

Ngày 15/03, `KH001` chuyển vào Nam. Nhân viên sửa hồ sơ — đúng nghiệp vụ, không ai sai.

```sql
UPDATE dim_t1 SET khu_vuc = 'Miền Nam' WHERE khach_id = 'KH001';
```

Tháng 4, chạy lại **đúng báo cáo đó, đúng kỳ đó**:

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ Miền Nam │   8000000 │
└──────────┴───────────┘
```

**Miền Bắc biến mất khỏi báo cáo tháng 1.** Miền Nam từ 3.000.000 thành 8.000.000.

Không có đơn hàng nào mới. Tháng 1 không đổi một dòng nào trong fact.

## Giả thuyết sai lúc đầu

Thứ tự người ta thường nghi, và vì sao đều sai:

| Nghi | Kiểm bằng | Kết quả |
|---|---|---|
| Có đơn hàng mới của tháng 1 nạp muộn | `count(*)` fact trong kỳ | Không đổi |
| Có ai sửa `fct_don` | so số dòng và tổng | Không đổi |
| Bộ lọc ngày sai | đọc lại `where` | Đúng |
| Pipeline chạy lỗi | log dbt | Xanh hết |

Mất thời gian vì mọi nghi ngờ đều hướng vào **fact**. Fact không hề đổi — **dimension**
mới là chỗ đổi, và không ai nghĩ dimension ảnh hưởng tới quá khứ.

## Nguyên nhân thật

Báo cáo lọc theo `f.ngay` — **thời điểm bán**. Nhưng `khu_vuc` lấy từ dimension ở
**trạng thái hiện tại**. Câu query đang trộn hai mốc thời gian khác nhau.

Nói cách khác: query hỏi *"doanh thu tháng 1"* nhưng vô tình trả lời *"doanh thu tháng 1,
gom theo khu vực **hôm nay**"*.

Với Type 1, "khu vực hôm nay" là thứ duy nhất tồn tại — giá trị cũ đã bị ghi đè, không có
cách nào lấy lại.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `unique` trên `khach_id` | ✅ xanh |
| `not_null` mọi cột | ✅ xanh |
| `relationships` fact → dim | ✅ xanh |
| Số dòng fact | ✅ không đổi |
| Tổng doanh thu toàn hệ thống | ✅ vẫn 10.000.000 |

**Tổng đúng, chi tiết sai.** Tiền không mất đi đâu — nó chỉ chuyển từ nhóm này sang nhóm
khác. Không có bất biến nào bị phá, nên không test dựng sẵn nào chạm tới.

Chiều duy nhất bắt được là **accuracy** — đối chiếu với một bản chốt sổ đã lưu ngoài hệ
thống. Xem [sáu chiều chất lượng](../../data-quality/six-dimensions.md).

## Cách sửa

Chuyển `khu_vuc` sang [SCD](../skills/scd.md) Type 2, và fact giữ **surrogate key của
phiên bản đúng tại thời điểm bán**:

```sql
-- dim Type 2
khach_sk | khach_id | khu_vuc  | valid_from | valid_to   | is_current
1        | KH001    | Miền Bắc | 2024-06-01 | 2026-03-15 | false
2        | KH001    | Miền Nam | 2026-03-15 | 9999-12-31 | true

-- fact tro toi khach_sk, khong phai khach_id
SELECT d.khu_vuc, sum(f.thanh_tien)
FROM fct_don f JOIN dim_scd2 d USING (khach_sk)
WHERE f.ngay < DATE '2026-02-01' GROUP BY 1;
```

Gán `khach_sk` đúng lúc nạp fact (*dimension lookup*):

```sql
JOIN dim_scd2 d
  ON  f.khach_id = d.khach_id
  AND f.ngay >= d.valid_from
  AND f.ngay <  d.valid_to
```

Bây giờ `DH001` khoá cứng vào phiên bản Miền Bắc. Chạy lại sau bao lâu cũng ra 5.000.000.

## Dấu hiệu nhận ra sớm

Nếu chưa gặp sự cố, ba dấu hiệu cho biết bạn đang có rủi ro này:

1. Fact join dimension bằng **mã nghiệp vụ** (`khach_id`) chứ không phải surrogate key.
2. Dimension không có cột `valid_from` / `valid_to`.
3. Chưa ai hỏi *"cột này cần as-was hay as-is"* — nghĩa là câu hỏi đó chưa được đặt ra,
   và mặc định đang là as-is.

**Phép thử một câu:** *"Chạy lại báo cáo quý trước vào năm sau, có ra đúng số cũ không?"*
Không trả lời chắc chắn được thì đang có rủi ro.

## Related Topics

- [SCD](../skills/scd.md) — Type 1 vs Type 2, và khi nào chọn cái nào
- [Phát hiện thay đổi cho SCD 2](../skills/scd-change-detection.md) — dựng Type 2 thế nào
- [Surrogate key](../reference/surrogate-key.md) — vì sao fact phải giữ SK
- [Sáu chiều chất lượng](../../data-quality/six-dimensions.md) — chiều *accuracy*
