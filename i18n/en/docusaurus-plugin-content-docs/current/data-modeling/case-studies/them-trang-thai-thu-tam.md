---
title: Thêm trạng thái thứ tám, năm báo cáo sai năm kiểu
i18n_status: untranslated
sidebar_position: 5
description: Danh sách trạng thái hardcode trong WHERE của từng báo cáo — nghiệp vụ thêm một trạng thái là mỗi báo cáo sai một kiểu.
tags: [case-study, junk-dimension, dimension, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: beginner
verified_at:
updated: 2026-07-31
---

# Thêm trạng thái thứ tám, năm báo cáo sai năm kiểu

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. **Con số chạy thật trên DuckDB.**

> **Chốt:** Định nghĩa nghiệp vụ nằm rải trong `WHERE` của từng báo cáo thì nó **không có
> chủ**. Thêm một giá trị là mỗi báo cáo sai một kiểu, và không ai biết báo cáo nào đã sửa.

## Bối cảnh

`trang_thai` để thẳng trong fact — đúng lời khuyên ở
[Junk dimension](../skills/junk-dimension.md) khi chỉ có một cột nhãn.

Mỗi báo cáo tự viết điều kiện "đơn nào tính vào doanh thu":

```sql
SELECT sum(tien) AS doanh_thu FROM don
WHERE trang_thai IN ('Đã giao','Đang giao');
```

```text
┌───────────────────┐
│ doanh_thu_bao_cao │
├───────────────────┤
│           1500000 │
└───────────────────┘
```

Chạy đúng suốt hai năm.

## Triệu chứng

Nghiệp vụ thêm trạng thái **"Giao một phần"** — khách nhận một phần đơn, phần còn lại
đang về. Doanh thu phần đã nhận **vẫn phải tính**.

Không ai sửa báo cáo. Số đúng phải là:

```text
┌────────────────┐
│ doanh_thu_dung │
├────────────────┤
│        1900000 │
└────────────────┘
```

**Thiếu 400.000 — hụt 21%.** Và không có lỗi nào.

Điều làm nó tệ hơn một con số sai: **năm báo cáo, năm người viết, năm danh sách trạng
thái khác nhau**. Sau khi phát hiện, phải đi tìm từng câu `WHERE` trong từng dashboard,
từng notebook, từng model — và không có cách nào chắc đã tìm hết.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Mất đơn hàng lúc nạp | `count(*)` fact khớp nguồn |
| Sai tỷ giá / đơn vị tiền | Không, sai đúng một nhóm đơn |
| Bộ lọc ngày lệch | Không |
| Có người sửa dữ liệu | Không |

Hướng nghi ngờ tập trung vào **dữ liệu**. Dữ liệu đầy đủ — **định nghĩa** mới là chỗ cũ.

Chẩn đoán đúng chỉ đến khi ai đó chạy `SELECT DISTINCT trang_thai` và thấy một giá trị
chưa từng gặp.

## Nguyên nhân thật

Câu hỏi *"đơn nào tính vào doanh thu"* là một **định nghĩa nghiệp vụ**. Nó đang được
lưu ở nơi tệ nhất có thể: **lặp lại trong mỗi câu query**.

Hệ quả:

- Không có một chỗ nào để sửa.
- Không có cách nào liệt kê "những nơi cần sửa".
- Không có test nào bảo vệ, vì mỗi bản sao đều tự nhất quán.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `accepted_values` trên `trang_thai` | ⚠️ **bắt được** — nếu có khai, và nếu ai đó cập nhật danh sách |
| `not_null`, `unique` | ✅ xanh |
| Tổng doanh thu so nguồn | ❌ không ai dựng, vì "nguồn" cũng dùng định nghĩa cũ |

`accepted_values` là test **duy nhất** có cơ hội — nhưng nó chỉ báo *"có giá trị lạ"*,
không báo *"báo cáo của bạn đang bỏ sót giá trị đó"*. Và nếu người thêm trạng thái cũng
cập nhật luôn `accepted_values` thì test lại xanh, im lặng như cũ.

## Cách sửa

Đưa định nghĩa vào **dimension**, dưới dạng một cột cờ:

```sql
CREATE TABLE dim_tt AS SELECT * FROM (VALUES
 ('Đã giao',true),('Đang giao',true),('Giao một phần',true),
 ('Đã huỷ',false),('Hoàn hàng',false)) AS t(trang_thai, la_don_hop_le);
```

Mọi báo cáo đổi thành:

```sql
SELECT sum(d.tien) AS doanh_thu
FROM don d JOIN dim_tt t USING (trang_thai)
WHERE t.la_don_hop_le;
```

```text
┌───────────┐
│ doanh_thu │
├───────────┤
│   1900000 │
└───────────┘
```

**Đúng, và tự đúng.** Thêm trạng thái thứ chín chỉ cần thêm một dòng vào dimension —
mọi báo cáo cập nhật theo, không ai phải nhớ gì.

Đây chính là ngưỡng đảo chiều mà [Junk dimension](../skills/junk-dimension.md) nói tới:
*cột trạng thái đáng tách khi nó **mang thuộc tính***. `la_don_hop_le` là thuộc tính đó.

## Dấu hiệu nhận ra sớm

1. Cùng một danh sách giá trị xuất hiện trong `WHERE` của **nhiều hơn hai** query.
2. Có người phải hỏi *"trạng thái nào thì tính doanh thu?"* — nghĩa là câu trả lời không
   nằm trong dữ liệu.
3. `SELECT DISTINCT` cột phân loại ra giá trị mà bạn không nhận ra.

Kiểm rẻ nhất, chạy định kỳ:

```sql
SELECT trang_thai, count(*) FROM don GROUP BY 1 ORDER BY 2 DESC;
```

Giá trị lạ xuất hiện là tín hiệu đi rà mọi báo cáo — **trước khi** ai đó phát hiện số hụt.

## Related Topics

- [Junk dimension](../skills/junk-dimension.md) — khi nào cột trạng thái đáng tách ra
- [Fact và Dimension](../reference/fact-and-dimension.md) — thuộc tính suy diễn thuộc về dimension
- [Triển khai test](../../etl/dbt/skills/implementing-tests.md) — `accepted_values` và giới hạn của nó
