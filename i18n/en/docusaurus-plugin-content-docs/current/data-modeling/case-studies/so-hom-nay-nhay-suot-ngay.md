---
title: Doanh thu trung bình mỗi ngày nhảy từ 862 lên 1.050 trong cùng một ngày
i18n_status: untranslated
sidebar_position: 23
description: "Ngày hôm nay chưa đầy nhưng mẫu số vẫn đếm nó là một ngày trọn vẹn; chỉ số ổn định lúc nửa đêm rồi sáng hôm sau lại tụt."
tags: [case-study, real-time, partition, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Doanh thu trung bình mỗi ngày nhảy từ 862 lên 1.050 trong cùng một ngày

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** dữ liệu thời gian thực không phá mô hình chiều, nó phá một giả định ngầm mà
> mọi báo cáo dựa vào — *"mỗi ngày trong bảng là một ngày đã đầy"*. Xem
> [real-time fact table](../skills/real-time-fact.md).

## Bối cảnh

Kho vừa nối thêm luồng streaming để lãnh đạo xem doanh thu trong ngày. Cách nối đơn giản
nhất: đẩy sự kiện vào cùng bảng fact mà báo cáo đang dùng.

```sql
CREATE TABLE fct_ban_chot AS       -- lich su, da chot
SELECT * FROM (VALUES
  (DATE '2026-08-01', 1000), (DATE '2026-08-02', 1200), (DATE '2026-08-03', 900)
) t(ngay, doanh_thu);

CREATE TABLE fct_ban_nong AS       -- hom nay, van dang chay vao
SELECT * FROM (VALUES
  (DATE '2026-08-04', TIME '09:00:00', 200),
  (DATE '2026-08-04', TIME '11:00:00', 150)
) t(ngay, gio, doanh_thu);
```

## Triệu chứng

Dashboard *"doanh thu trung bình mỗi ngày"*, chụp lúc **11h**:

```text
┌─────────┬────────┬─────────────┐
│ so_ngay │  tong  │ tb_moi_ngay │
├─────────┼────────┼─────────────┤
│       4 │   3450 │       862.5 │
└─────────┴────────┴─────────────┘
```

Cùng dashboard, cùng query, chụp lúc **21h**:

```text
┌─────────┬────────┬─────────────┐
│ so_ngay │  tong  │ tb_moi_ngay │
├─────────┼────────┼─────────────┤
│       4 │   4200 │      1050.0 │
└─────────┴────────┴─────────────┘
```

**862,5 → 1.050,0** trong cùng một ngày, không ai sửa gì.

Hệ quả vận hành: cuộc họp sáng dùng một con số, báo cáo gửi tối dùng con số khác. Và mỗi
sáng chỉ số lại "tụt" so với tối hôm trước — nên đội kinh doanh liên tục hỏi *"hôm qua có
chuyện gì?"* trong khi không có chuyện gì cả.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Luồng streaming mất dữ liệu buổi sáng | Đếm sự kiện: không mất, chỉ là chưa tới |
| Có job xoá rồi nạp lại giữa ngày | Log: không có job nào chạy giữa hai lần chụp |
| Cache của BI trả số cũ | Xoá cache: không đổi |
| Múi giờ lệch giữa hai nguồn | Kiểm: cùng múi giờ |
| Doanh thu thật sự biến động mạnh | Đúng — nhưng đó là **bản chất trong ngày**, không phải lỗi |

Chỗ mất thời gian dài nhất: giả thuyết "mất dữ liệu". Cả đội đi kiểm luồng streaming ba
ngày, và luồng hoàn toàn khoẻ.

Câu hỏi rẽ hướng: *"mẫu số của phép chia này là gì?"*

## Nguyên nhân thật

```text
┌────────────┬───────────┬────────────┐
│    ngay    │ doanh_thu │ trang_thai │
├────────────┼───────────┼────────────┤
│ 2026-08-01 │      1000 │ da chot    │
│ 2026-08-02 │      1200 │ da chot    │
│ 2026-08-03 │       900 │ da chot    │
│ 2026-08-04 │      1100 │ DANG CHAY  │
└────────────┴───────────┴────────────┘
```

Mẫu số `count(DISTINCT ngay)` = 4. Nhưng ngày 04/08 **mới đầy một phần** — lúc 11h nó mới
có 350 trên tổng 1.100 cuối ngày.

Tử số tăng suốt ngày, mẫu số đứng yên ở 4 → thương số tăng suốt ngày.

Đây không phải lỗi dữ liệu và cũng không phải lỗi query. Nó là **một giả định ngầm bị phá
vỡ**: mọi công thức dạng "trung bình mỗi ngày", "tỷ lệ trên tổng", "so với kỳ trước" đều
ngầm giả định mọi ngày trong tập đều đã kết thúc.

Giả định đó đúng suốt nhiều năm khi kho chỉ nạp theo lô hằng đêm — và nó chết ngay ngày
nối luồng streaming.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` trên mọi cột | ✅ xanh |
| Không thiếu ngày nào trong chuỗi | ✅ xanh |
| `doanh_thu > 0` | ✅ xanh |
| Tổng khớp luồng nguồn | ✅ xanh |
| Dữ liệu hôm nay đã đầy chưa | ❌ — **không có khái niệm này trong kho** |

Bốn test đầu xanh vì dữ liệu đúng. Dòng cuối không tồn tại vì kho **không lưu ở đâu** cái
mốc "ngày này đã chốt".

Test chạy lúc 2h sáng cũng xanh, và lúc đó nó thậm chí đúng — vì ngày hôm trước đã đầy.

## Cách sửa

### Sửa 1 — đánh dấu phân vùng nóng, mang nhãn tới tận báo cáo

```sql
WITH tat_ca AS (
  SELECT ngay, doanh_thu, true AS da_chot FROM fct_ban_chot
  UNION ALL SELECT ngay, doanh_thu, false FROM fct_ban_nong
)
SELECT count(DISTINCT ngay) FILTER (WHERE da_chot)      AS so_ngay_da_chot,
       sum(doanh_thu) FILTER (WHERE da_chot)            AS tong_da_chot,
       round(sum(doanh_thu) FILTER (WHERE da_chot) * 1.0
             / count(DISTINCT ngay) FILTER (WHERE da_chot), 1) AS tb_moi_ngay_on_dinh,
       sum(doanh_thu) FILTER (WHERE NOT da_chot)        AS hom_nay_tam_tinh
FROM tat_ca;
```

```text
┌─────────────────┬──────────────┬─────────────────────┬──────────────────┐
│ so_ngay_da_chot │ tong_da_chot │ tb_moi_ngay_on_dinh │ hom_nay_tam_tinh │
├─────────────────┼──────────────┼─────────────────────┼──────────────────┤
│               3 │         3100 │              1033.3 │             1100 │
└─────────────────┴──────────────┴─────────────────────┴──────────────────┘
```

**1.033,3 không đổi theo giờ.** Số hôm nay vẫn hiện, nhưng ở cột riêng có nhãn *tạm tính*
— lãnh đạo vẫn theo dõi được trong ngày mà không nhầm nó với chỉ số ổn định.

### Sửa 2 — so cùng khung giờ, không so cả ngày

```sql
SELECT 'hom nay den 11h' AS moc,
       (SELECT sum(doanh_thu) FROM fct_ban_nong WHERE gio <= TIME '11:00:00') AS doanh_thu
UNION ALL
SELECT 'hom nay den 21h',
       (SELECT sum(doanh_thu) FROM fct_ban_nong WHERE gio <= TIME '21:00:00');
```

```text
┌─────────────────┬───────────┐
│       moc       │ doanh_thu │
├─────────────────┼───────────┤
│ hom nay den 11h │       350 │
│ hom nay den 21h │      1100 │
└─────────────────┴───────────┘
```

Muốn biết hôm nay tốt hay xấu thì so **tới cùng thời điểm** của các ngày trước. Điều kiện:
fact phải có **giờ**, không chỉ ngày.

### Sửa 3 — mốc chốt sổ phải là dữ liệu

```text
dim_ky_bao_cao(ngay, da_chot, thoi_diem_chot, ai_chot)
```

Không có bảng này thì mỗi báo cáo tự định nghĩa "hôm nay" một kiểu.

| | Trước | Sau |
|---|---|---|
| Chỉ số buổi sáng vs buổi tối | 862,5 vs 1.050,0 | **1.033,3 cả ngày** |
| Số hôm nay | Trộn lẫn, không nhãn | Cột riêng, nhãn *tạm tính* |
| So với hôm qua | Luôn thấy "giảm" tới cuối ngày | So cùng khung giờ |

## Dấu hiệu nhận ra sớm

1. Chạy cùng một dashboard hai lần cách nhau vài giờ, so số. Chỉ số ổn định phải **không
   đổi**.

2. Tìm mọi chỗ dùng `count(DISTINCT ngay)` hay `count(*)` ngày làm mẫu số:

```bash
grep -rn "count(distinct.*ngay\|count(distinct.*date" models/marts/
```

3. Kiểm ngày cuối cùng trong fact có phải hôm nay không:

```sql
SELECT max(ngay) AS ngay_moi_nhat, current_date AS hom_nay,
       max(ngay) = current_date AS co_du_lieu_chua_chot
FROM fct_ban;
```

`true` mà không có cột `da_chot` = đang mắc ca này.

4. Hỏi: *"kho có chỗ nào ghi ngày nào đã chốt không?"* Không có = mỗi báo cáo tự đoán.

## Related Topics

- [Real-time fact table](../skills/real-time-fact.md) — kỹ thuật bị bỏ qua ở đây
- [Dữ liệu về muộn](../skills/late-arriving.md) — vấn đề song song, ảnh hưởng ngày đã chốt
- [Date dimension](../reference/date-dimension.md) — dimension giờ trong ngày tách riêng
- [Conformed facts](../skills/conformed-facts.md) — hai hệ thống thì chỉ số phải conform
