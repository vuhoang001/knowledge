---
title: Hai mart đúng, ghép lại thì không trả lời được câu nào
sidebar_position: 4
description: Team bán hàng và team CSKH mỗi bên dựng một dim_khach_hang — câu hỏi cắt ngang hai bên thành bất khả thi.
tags: [case-study, conformed-dimension, bus-matrix, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Hai mart đúng, ghép lại thì không trả lời được câu nào

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. **Mọi con số chạy thật.**

> **Chốt:** Hai mart mỗi bên tự dựng dimension riêng thì **mỗi bên chạy đúng**, nhưng
> câu hỏi cắt ngang hai bên là bất khả thi. Đây là nợ kỹ thuật đắt nhất trong data
> warehouse, và nó **không có triệu chứng** cho tới lúc ai đó hỏi câu đầu tiên.

## Bối cảnh

Hai team, hai quý, hai dự án độc lập. Không ai làm gì sai.

```sql
-- Team ban hang, quy 1
CREATE TABLE dim_kh_ban AS SELECT * FROM (VALUES
 ('KH01','Miền Bắc'),('KH02','Miền Nam'),('KH03','Miền Nam')) AS t(ma_khach, khu_vuc);

-- Team CSKH, quy 2 — khong biet team kia da lam gi
CREATE TABLE dim_kh_cskh AS SELECT * FROM (VALUES
 ('C-01','HN'),('C-02','HCM'),('C-03','HCM')) AS t(ma_kh_cskh, khu_vuc);
```

Mỗi mart chạy hoàn hảo. Team bán hàng:

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ Miền Bắc │   5000000 │
│ Miền Nam │   5000000 │
└──────────┴───────────┘
```

Team CSKH:

```text
┌─────────┬───────────┐
│ khu_vuc │ so_ticket │
├─────────┼───────────┤
│ HCM     │        13 │
│ HN      │        12 │
└─────────┴───────────┘
```

Cả hai đều được nghiệm thu. Cả hai đều đúng.

## Triệu chứng

Sáu tháng sau, sếp hỏi một câu rất bình thường:

> *"Khu vực nào doanh thu cao mà số ticket hỗ trợ cũng cao? Có phải chúng ta đang bán
> nhiều ở chỗ phục vụ kém không?"*

Thử ghép hai tập giá trị khu vực:

```sql
SELECT b.khu_vuc AS kv_ban_hang, h.khu_vuc AS kv_cskh
FROM (SELECT DISTINCT khu_vuc FROM dim_kh_ban) b
FULL OUTER JOIN (SELECT DISTINCT khu_vuc FROM dim_kh_cskh) h ON b.khu_vuc = h.khu_vuc;
```

```text
┌─────────────┬─────────┐
│ kv_ban_hang │ kv_cskh │
├─────────────┼─────────┤
│ Miền Bắc    │ NULL    │
│ Miền Nam    │ NULL    │
│ NULL        │ HCM     │
│ NULL        │ HN      │
└─────────────┴─────────┘
```

**Không một giá trị nào khớp.** Bốn dòng, không dòng nào có cả hai cột.

Và tệ hơn: khoá khách cũng khác nhau (`KH01` vs `C-01`) — không có cách nào biết `KH01`
và `C-01` có phải cùng một người không.

Câu hỏi của sếp **không trả lời được**, dù dữ liệu đã có đủ từ sáu tháng trước.

## Giả thuyết sai lúc đầu

| Đề xuất | Vì sao không giải quyết được |
|---|---|
| "Viết một bảng ánh xạ khu vực" | HN thuộc Miền Bắc — nhưng "Khác" thuộc miền nào? Ánh xạ **không tồn tại** |
| "Join theo tên khách" | Tên trùng, viết hoa khác nhau, có dấu / không dấu |
| "Chuẩn hoá lại một bên cho khớp bên kia" | Đúng hướng, nhưng bên nào chuẩn? Cả hai đều đang phục vụ báo cáo chạy thật |
| "Dựng mart thứ ba gộp cả hai" | Vẫn phải trả lời câu "khu vực nghĩa là gì" trước |

Mấu chốt: đây **không phải vấn đề kỹ thuật**. Nó là vấn đề **hai team chưa bao giờ thoả
thuận định nghĩa**, và không SQL nào giải được chuyện đó.

## Nguyên nhân thật

Hai dimension **không conformed**. Chúng vi phạm cả ba điều kiện:

| Điều kiện | Trạng thái |
|---|---|
| Cùng surrogate key | ❌ `KH01` vs `C-01` |
| Cùng tập giá trị thuộc tính | ❌ Bắc/Trung/Nam vs HN/HCM/Khác |
| Cùng định nghĩa nghiệp vụ | ❌ nơi giao hàng vs nơi đăng ký hỗ trợ |

Điều kiện thứ ba là gốc rễ, và là điều kiện **không kiểm được bằng SQL**. Hai bên dùng
chung một từ — "khu vực" — cho hai khái niệm khác nhau.

Đáng chú ý: nếu hai bên tình cờ dùng **cùng tập giá trị** nhưng khác định nghĩa, tình
huống còn **nguy hiểm hơn** — số sẽ cộng được, ra kết quả trông hợp lý, và sai. Ở đây ít
nhất nó gãy lộ liễu.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| Mọi test của mart bán hàng | ✅ xanh |
| Mọi test của mart CSKH | ✅ xanh |
| `relationships` trong từng mart | ✅ xanh |

Không có test nào **chạy ngang hai mart**, vì chúng là hai dự án riêng, hai file
`schema.yml` riêng, thường là hai repo riêng.

Đây là loại lỗi mà công cụ không giúp được — chỉ có **quy trình** giúp được.

## Cách sửa

Một dimension dùng chung, định nghĩa thống nhất một lần:

```sql
CREATE TABLE dim_khach_hang AS
SELECT row_number() OVER (ORDER BY ma_khach) AS khach_sk,
       ma_khach, ho_ten,
       khu_vuc            -- MỘT định nghĩa duy nhất
FROM khach_hang_raw;
```

Cả hai fact trỏ về bảng này bằng `khach_sk`. Team nào cần thuộc tính riêng thì **thêm
cột**, không dựng bảng thứ hai.

Sau đó câu hỏi của sếp trả lời được bằng *drill-across* — xem
[Conformed dimension](../skills/conformed-dimension.md).

**Chi phí sửa muộn:** phải nạp lại cả hai fact để gán `khach_sk`, sửa mọi báo cáo đang
chạy, và thuyết phục hai team bỏ bảng của mình. Làm từ đầu thì đó chỉ là **một cuộc họp**.

## Dấu hiệu nhận ra sớm

1. Có **hai bảng cùng mô tả một thực thể** với tên khác nhau (`dim_khach_hang_ban_hang`,
   `dim_kh_cskh`).
2. Mart mới dựng mà **không dùng lại** dimension nào có sẵn.
3. Chưa ai kẻ **bus matrix** — bảng fact × dimension.

Kiểm rẻ nhất, chạy được ngay hôm nay:

```sql
-- hai dimension co cung tap gia tri khong?
SELECT 'ban_hang' AS nguon, khu_vuc FROM dim_kh_ban
UNION ALL SELECT 'cskh', khu_vuc FROM dim_kh_cskh
ORDER BY 2;
```

Tập giá trị khác nhau là bằng chứng cứng. **Giống nhau vẫn chưa đủ** — phải hỏi định
nghĩa.

**Việc nên làm trước khi dựng mart thứ hai:** kẻ bus matrix. Ô trống trong đó là chỗ sẽ
đau sáu tháng sau.

## Related Topics

- [Conformed dimension](../skills/conformed-dimension.md) — ba điều kiện, bus matrix, drill-across
- [Quy trình thiết kế 4 bước](../reference/design-process.md) — bus matrix nằm ở bước 1
- [Surrogate key](../reference/surrogate-key.md) — khoá chung là điều kiện đầu tiên
- [Sáu chiều chất lượng](../../data-quality/six-dimensions.md) — chiều *consistency*
