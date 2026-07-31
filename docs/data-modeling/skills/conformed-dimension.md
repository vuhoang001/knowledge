---
title: Conformed dimension
sidebar_position: 5
description: Dimension dùng chung giữa nhiều fact với cùng khoá và cùng nghĩa — điều kiện để cộng số từ hai quy trình nghiệp vụ khác nhau.
tags: [conformed-dimension, bus-matrix, dimension, data-modeling, kimball]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Conformed dimension

> **Chốt:** Hai fact chỉ so sánh được với nhau khi chúng dùng **cùng một** dimension —
> cùng khoá **và cùng định nghĩa**. Thiếu điều kiện đó thì mọi báo cáo ghép hai quy
> trình nghiệp vụ đều là cộng hai thứ khác nhau, và không có lỗi nào báo.

## Mục tiêu

Trả lời câu hỏi: vì sao "doanh thu theo khu vực" và "tỷ lệ trả hàng theo khu vực" ghép
lại thì ra số vô nghĩa, dù cả hai đều chạy đúng.

## Vấn đề

Hai team dựng hai mart:

```text
Team bán hàng:  fct_don_hang    →  dim_khach_hang_ban_hang  (khu_vuc: Bắc/Trung/Nam)
Team CSKH:      fct_tra_hang    →  dim_khach_hang_cskh      (khu_vuc: HN/HCM/Khác)
```

Mỗi mart chạy đúng. Nhưng câu hỏi *"khu vực nào có tỷ lệ trả hàng cao nhất"* thì
**không trả lời được** — hai bên không nói cùng một ngôn ngữ về "khu vực", và khoá khách
cũng khác nhau.

Đây không phải lỗi kỹ thuật. Không SQL nào sai, không test nào đỏ. Sai từ lúc hai team
mỗi bên tự dựng một dimension.

## Điều kiện để gọi là conformed

Một dimension conformed giữa hai fact khi thoả **cả ba**:

| Điều kiện | Kiểm bằng |
|---|---|
| Cùng surrogate key | `khach_sk` ở fact A và fact B trỏ về cùng một bảng |
| Cùng tập thuộc tính, cùng tên | `khu_vuc` có cùng danh sách giá trị ở cả hai |
| Cùng **định nghĩa nghiệp vụ** | "khu vực" = nơi giao hàng, hay nơi đăng ký? Phải là một |

Điều kiện thứ ba khó nhất vì nó không kiểm được bằng SQL — phải hỏi người.

**Dạng rút gọn cũng tính:** một dimension ở grain thô hơn vẫn conformed nếu tập thuộc
tính của nó là **tập con đúng** của bản đầy đủ. `dim_thang` conformed với `dim_ngay` nếu
`thang`, `quy`, `nam` định nghĩa y hệt.

## Bus matrix — công cụ để thấy chỗ thiếu

Kẻ ma trận fact × dimension. Ô trống là chỗ chưa conform:

| | dim_khach_hang | dim_hang_hoa | dim_thoi_gian | dim_kho |
|---|---|---|---|---|
| `fct_don_hang` | ✅ | ✅ | ✅ | — |
| `fct_tra_hang` | ✅ | ✅ | ✅ | ✅ |
| `fct_ton_kho` | — | ✅ | ✅ | ✅ |

Đọc theo **cột**: `dim_hang_hoa` phủ cả ba fact → so sánh được doanh thu, trả hàng, tồn
kho theo cùng một mặt hàng. `dim_khach_hang` không phủ `fct_ton_kho` — và đúng, tồn kho
không có khách nào cả.

Kẻ bảng này **trước** khi dựng mart thứ hai. Kẻ sau là đã phải sửa.

## Ví dụ xuyên suốt

### Bước 1 — phát hiện chưa conform

```sql
-- hai dimension co cung tap gia tri khong?
SELECT 'ban_hang' AS nguon, khu_vuc, count(*) FROM dim_khach_hang_ban_hang GROUP BY khu_vuc
UNION ALL
SELECT 'cskh', khu_vuc, count(*) FROM dim_khach_hang_cskh GROUP BY khu_vuc
ORDER BY khu_vuc;
```

**Kết quả:** _chưa chạy_

Tập giá trị khác nhau là bằng chứng cứng: chưa conform. Giống tập giá trị **chưa đủ** —
vẫn phải hỏi định nghĩa.

### Bước 2 — một dimension dùng chung

```sql
CREATE TABLE dim_khach_hang AS
SELECT
  row_number() OVER (ORDER BY ma_khach) AS khach_sk,
  ma_khach,
  ho_ten,
  khu_vuc            -- MỘT định nghĩa duy nhất, thống nhất giữa hai team
FROM khach_hang_raw;
```

Cả hai fact trỏ về bảng này. Team nào cần thuộc tính riêng thì **thêm cột**, không dựng
bảng thứ hai.

### Bước 3 — drill-across, thứ mà conformed dimension mở khoá

Gộp hai fact khác grain: cộng riêng từng bên về **cùng một mức**, rồi mới ghép.

```sql
WITH ban AS (
  SELECT k.khu_vuc, sum(f.thanh_tien) AS doanh_thu
  FROM fct_don_hang f JOIN dim_khach_hang k USING (khach_sk)
  GROUP BY k.khu_vuc
),
tra AS (
  SELECT k.khu_vuc, sum(t.gia_tri_tra) AS gia_tri_tra
  FROM fct_tra_hang t JOIN dim_khach_hang k USING (khach_sk)
  GROUP BY k.khu_vuc
)
SELECT b.khu_vuc, b.doanh_thu, COALESCE(t.gia_tri_tra, 0) AS gia_tri_tra,
       ROUND(100.0 * COALESCE(t.gia_tri_tra, 0) / b.doanh_thu, 2) AS ty_le_tra_pct
FROM ban b LEFT JOIN tra t USING (khu_vuc)
ORDER BY ty_le_tra_pct DESC;
```

**Kết quả:** _chưa chạy_

**Không** join thẳng `fct_don_hang` với `fct_tra_hang`. Hai fact khác grain join trực
tiếp là nhân bản dòng — xem [Fact và Dimension](../reference/fact-and-dimension.md).

### Trước và sau

| | Hai dimension riêng | Conformed |
|---|---|---|
| Mỗi mart chạy đúng | có | có |
| Ghép hai mart | **không làm được** | drill-across |
| Sửa định nghĩa khu vực | hai chỗ, dễ lệch | một chỗ |
| Phát hiện lệch | không có gì báo | test `relationships` bắt được |

## Trade-offs

| Được | Mất |
|---|---|
| Ghép được số giữa các quy trình nghiệp vụ | Phải thoả thuận định nghĩa **trước** — việc của người, không phải của SQL |
| Một chỗ sửa | Một team đổi là ảnh hưởng team khác |
| Bus matrix cho thấy khoảng trống | Bảng dùng chung dễ thành nơi ai cũng thêm cột |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Cùng tên cột, khác định nghĩa | Nguy hiểm nhất — số cộng được nhưng **sai nghĩa**, không gì báo |
| Mỗi mart tự dựng dimension "cho nhanh" | Nợ kỹ thuật lớn nhất trong data warehouse; càng để lâu càng đắt |
| Join thẳng hai fact vì đã có dimension chung | Nhân bản dòng — phải cộng về cùng mức trước |
| Coi conformed là "cùng tên bảng" | Cùng tên mà khác giá trị thì vẫn chưa conform |

## Related Topics

- [Fact và Dimension](../reference/fact-and-dimension.md) — vì sao không join thẳng fact với fact
- [Quy trình thiết kế 4 bước](../reference/design-process.md) — bus matrix nằm ở bước chọn quy trình nghiệp vụ
- [Surrogate key](../reference/surrogate-key.md) — khoá chung là điều kiện đầu tiên
- [Role-playing dimension](role-playing-dimension.md) — nhiều **vai** trong một fact, khác nhiều **fact** dùng chung
- [Sáu chiều chất lượng](../../data-quality/six-dimensions.md) — chiều *consistency* chính là chuyện này
