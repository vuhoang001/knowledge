---
title: Năm quy trình, năm mart, và không mart nào ghép được với mart nào
i18n_status: untranslated
sidebar_position: 24
description: "Mỗi đội dựng mart của mình rất nhanh; đến khi cần một câu hỏi cắt ngang chuỗi giá trị thì phải làm lại từ đầu."
tags: [case-study, bus-matrix, conformed-dimension, value-chain, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Năm quy trình, năm mart, và không mart nào ghép được với mart nào

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** dựng từng mart một là đúng. Dựng từng mart một **mà không thống nhất dimension
> trước** là mua tốc độ hôm nay bằng việc phải làm lại toàn bộ sau một năm — xem
> [bus architecture](../reference/bus-architecture.md).

## Bối cảnh

Công ty bán lẻ, năm quy trình nghiệp vụ: mua hàng, nhập kho, tồn kho, bán hàng, trả hàng.

Cách làm được chọn: mỗi đội dựng mart của mình, giao nhanh, chứng minh giá trị. Không có
bước thống nhất dimension — bước đó "làm chậm dự án đầu tiên".

Sau một năm: năm mart, năm dashboard, tất cả đều chạy, tất cả đều được dùng. Mỗi mart có
`dim_san_pham` riêng và `dim_khach` riêng, sinh từ nguồn riêng, khoá riêng.

## Triệu chứng

Ban giám đốc hỏi ba câu:

1. *"Mua 100 cái, bán được bao nhiêu, còn tồn bao nhiêu, hao hụt bao nhiêu?"*
2. *"Biên tệ theo sản phẩm là bao nhiêu?"*
3. *"Sản phẩm nào bị trả nhiều nhất so với lượng bán?"*

Cả ba đều **không trả lời được**. Mỗi mart trả lời được một mảnh, và các mảnh không ghép
lại được vì khoá sản phẩm ở mart mua hàng không khớp khoá ở mart bán hàng.

Ước lượng ban đầu cho câu 1: "hai ngày". Thực tế: phải dựng lại `dim_san_pham` chung, ánh
xạ khoá cũ, nạp lại năm fact — vài tháng.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Chỉ cần một câu join giữa các mart | Khoá không khớp — mỗi mart một hệ khoá |
| Ánh xạ khoá bằng bảng trung gian | Làm được, nhưng phải làm cho **mọi cặp mart** |
| Dùng mã sản phẩm nghiệp vụ để join | Mỗi mart chuẩn hoá mã một kiểu (viết hoa, khoảng trắng, tiền tố) |
| Dựng một mart tổng hợp mới | Chính là phải làm lại — chỉ đặt tên khác |

Chỗ mất thời gian: hai tháng đầu tin rằng đây là **vấn đề tích hợp** giải bằng ánh xạ.
Với 5 mart, số cặp phải ánh xạ là 10, và mỗi ánh xạ phải bảo trì mãi mãi. Chi phí đó lớn
hơn việc dựng conformed dimension ngay từ đầu.

## Nguyên nhân thật

Không có bước **thiết kế dimension trước fact**.

Bus matrix — nếu có — sẽ cho thấy ngay từ tuần đầu rằng `San pham` gắn cả 5 quy trình:

```sql
SELECT dimension, count(*) FILTER (WHERE co_dung) AS so_quy_trinh_dung
FROM bus_matrix GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌──────────────┬───────────────────┐
│  dimension   │ so_quy_trinh_dung │
├──────────────┼───────────────────┤
│ Ngay         │                 5 │
│ San pham     │                 5 │
│ Kho          │                 4 │
│ Khach hang   │                 2 │
│ Nha cung cap │                 2 │
└──────────────┴───────────────────┘
```

`Ngay` và `San pham` là **xương sống của cả kho**. Làm hỏng hai cái này là hỏng mọi câu
hỏi cắt ngang — và chúng đáng được thiết kế một lần cho toàn doanh nghiệp trước khi ai
viết fact đầu tiên.

Chi phí của bước đó: có lẽ hai tuần ở dự án đầu tiên. Chi phí bỏ qua nó: vài tháng sau
một năm.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| Mỗi mart khớp hệ nguồn của nó | ✅ xanh cả năm |
| `unique`, `not_null` mọi khoá | ✅ xanh |
| `relationships` trong từng mart | ✅ xanh |
| Grain đúng ở từng fact | ✅ xanh |
| Các mart có dùng chung dimension không | ❌ — **không phải test dữ liệu** |

Mọi mart đều **đúng một cách hoàn hảo trong phạm vi của nó**. Đây là lỗi kiến trúc, và nó
chỉ lộ ra khi có người hỏi một câu vượt qua ranh giới mart.

Thứ bắt được nó là bus matrix, và bus matrix phải tồn tại **trước** khi có mart.

## Cách sửa

### Bước 1 — bus matrix thành một bảng trong kho

```sql
CREATE TABLE bus_matrix AS
SELECT * FROM (VALUES
  ('Mua hang','Ngay',true), ('Mua hang','Nha cung cap',true), ('Mua hang','San pham',true),
  ('Mua hang','Khach hang',false), ('Mua hang','Kho',true),
  ('Nhap kho','Ngay',true), ('Nhap kho','Nha cung cap',true), ('Nhap kho','San pham',true),
  ('Nhap kho','Khach hang',false), ('Nhap kho','Kho',true),
  ('Ton kho','Ngay',true), ('Ton kho','Nha cung cap',false), ('Ton kho','San pham',true),
  ('Ton kho','Khach hang',false), ('Ton kho','Kho',true),
  ('Ban hang','Ngay',true), ('Ban hang','Nha cung cap',false), ('Ban hang','San pham',true),
  ('Ban hang','Khach hang',true), ('Ban hang','Kho',true),
  ('Tra hang','Ngay',true), ('Tra hang','Nha cung cap',false), ('Tra hang','San pham',true),
  ('Tra hang','Khach hang',true), ('Tra hang','Kho',false)
) t(quy_trinh, dimension, co_dung);

PIVOT bus_matrix ON dimension USING bool_or(co_dung) GROUP BY quy_trinh;
```

```text
┌───────────┬────────────┬─────────┬─────────┬──────────────┬──────────┐
│ quy_trinh │ Khach hang │   Kho   │  Ngay   │ Nha cung cap │ San pham │
├───────────┼────────────┼─────────┼─────────┼──────────────┼──────────┤
│ Mua hang  │ false      │ true    │ true    │ true         │ true     │
│ Nhap kho  │ false      │ true    │ true    │ true         │ true     │
│ Tra hang  │ true       │ false   │ true    │ false        │ true     │
│ Ton kho   │ false      │ true    │ true    │ false        │ true     │
│ Ban hang  │ true       │ true    │ true    │ false        │ true     │
└───────────┴────────────┴─────────┴─────────┴──────────────┴──────────┘
```

Bảng này cũng trả lời luôn câu *"câu hỏi nào bất khả thi"*: không thể hỏi "tồn kho theo
khách hàng" — ô đó `false` vì tồn kho không có chiều khách hàng.

### Bước 2 — độ phủ thành chỉ số theo dõi được

```sql
SELECT count(*) FILTER (WHERE co_dung) AS o_can_conform,
       count(*)                        AS o_toi_da,
       round(100.0 * count(*) FILTER (WHERE co_dung) / count(*), 1) AS mat_do_pct
FROM bus_matrix;
```

```text
┌───────────────┬──────────┬────────────┐
│ o_can_conform │ o_toi_da │ mat_do_pct │
├───────────────┼──────────┼────────────┤
│            18 │       25 │       72.0 │
└───────────────┴──────────┴────────────┘
```

### Bước 3 — sau khi conform, ba câu hỏi trả lời được bằng drill-across

```text
┌──────────┬───────┬──────────┬─────────┬────────┬────────┬────────────────────┬──────────────────────┐
│ san_pham │  mua  │ nhap_kho │ con_ton │ da_ban │ bi_tra │ hao_hut_van_chuyen │ chua_giai_thich_duoc │
├──────────┼───────┼──────────┼─────────┼────────┼────────┼────────────────────┼──────────────────────┤
│ SP-A     │   100 │       98 │      30 │     68 │      4 │                  2 │                    0 │
│ SP-B     │    50 │       50 │      12 │     38 │      0 │                  0 │                    0 │
└──────────┴───────┴──────────┴─────────┴────────┴────────┴────────────────────┴──────────────────────┘
```

`hao_hut_van_chuyen = 2` cho `SP-A` — mua 100, nhập kho 98 — là câu hỏi **không quy trình
đơn lẻ nào trả lời được**. Nó chỉ xuất hiện khi đặt hai fact cạnh nhau qua một dimension
chung.

```text
┌──────────┬──────────┬───────────────┬───────┬──────────┐
│ san_pham │ tien_mua │ doanh_thu_ban │ chenh │ bien_pct │
├──────────┼──────────┼───────────────┼───────┼──────────┤
│ SP-B     │    40000 │         76000 │ 36000 │     90.0 │
│ SP-A     │    60000 │        108000 │ 48000 │     80.0 │
└──────────┴──────────┴───────────────┴───────┴──────────┘
```

| | Trước | Sau |
|---|---|---|
| Ba câu hỏi cắt ngang | Bất khả thi | Trả lời bằng drill-across |
| Số ánh xạ khoá phải bảo trì | 10 cặp | 0 |
| Thêm quy trình thứ sáu | Thêm 5 ánh xạ mới | Cắm vào bus có sẵn |
| Chi phí trả trước | 0 | ~2 tuần ở dự án đầu |

## Dấu hiệu nhận ra sớm

1. **Đếm số bảng có tên giống nhau ở các schema khác nhau** — dấu hiệu rõ nhất:

```sql
SELECT table_name, count(DISTINCT table_schema) AS so_schema, list(table_schema) AS o_dau
FROM information_schema.tables
WHERE table_name LIKE 'dim_%'
GROUP BY 1 HAVING count(DISTINCT table_schema) > 1;
```

Có `dim_san_pham` ở ba schema = ba định nghĩa sản phẩm.

2. Hỏi: *"kho có bus matrix không, và nó cập nhật lần cuối khi nào?"*

3. Thử một câu hỏi cắt ngang hai mart bất kỳ. Không trả lời được trong một ngày = chưa
   conform.

4. Trước khi dựng mart mới, hỏi *"mart này dùng dimension nào, và những dimension đó đã
   tồn tại chưa?"* — nếu câu trả lời là "sẽ dựng mới", dừng lại.

## Related Topics

- [Bus architecture, bus matrix và value chain](../reference/bus-architecture.md) — kỹ thuật bị bỏ qua ở đây
- [Conformed dimension](../skills/conformed-dimension.md) — thứ mà "bus" thật sự là
- [Conformed facts](../skills/conformed-facts.md) — ghép được rồi còn phải so được
- [CS: hai mart không ghép được](hai-mart-khong-ghep-duoc.md) — cùng bệnh, quy mô nhỏ hơn
- [CS: hai phòng hai doanh thu](hai-phong-hai-doanh-thu.md) — conform dimension rồi vẫn lệch số
