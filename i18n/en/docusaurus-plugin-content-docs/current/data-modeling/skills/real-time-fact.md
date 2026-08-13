---
title: Real-time fact table — phân vùng nóng
i18n_status: untranslated
sidebar_position: 22
description: "Ngày hôm nay chưa đầy nhưng vẫn được đếm là một ngày trọn vẹn — mọi chỉ số trung bình nhảy suốt ngày rồi ổn định lúc nửa đêm."
tags: [real-time, streaming, partition, fact, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Real-time fact table — phân vùng nóng

> **Chốt:** dữ liệu thời gian thực không phá mô hình chiều, nó phá một **giả định ngầm**
> mà mọi báo cáo đều dựa vào: *"mỗi ngày trong bảng là một ngày đã đầy"*. Ngày hôm nay
> chưa đầy, nhưng mẫu số vẫn đếm nó là 1.

## Vấn đề

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

Dashboard *"doanh thu trung bình mỗi ngày"*, chạy lúc **11h**:

```text
┌─────────┬────────┬─────────────┐
│ so_ngay │  tong  │ tb_moi_ngay │
├─────────┼────────┼─────────────┤
│       4 │   3450 │       862.5 │
└─────────┴────────┴─────────────┘
```

Cùng dashboard, cùng query, chạy lúc **21h**:

```text
┌─────────┬────────┬─────────────┐
│ so_ngay │  tong  │ tb_moi_ngay │
├─────────┼────────┼─────────────┤
│       4 │   4200 │      1050.0 │
└─────────┴────────┴─────────────┘
```

**862,5 → 1.050,0.** Không ai sửa gì. Người xem lúc sáng và người xem lúc tối tranh luận
về hai con số khác nhau của cùng một chỉ số.

Nguyên nhân nhìn thấy ngay khi tách theo ngày:

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

Ngày 04/08 mới đầy một phần, nhưng mẫu số `count(DISTINCT ngay)` vẫn đếm nó là **1 ngày
trọn vẹn**. Mọi chỉ số dạng "trung bình mỗi ngày", "tỷ lệ trên tổng", "so với hôm qua"
đều bị kéo lệch bởi ngày dở dang này — và mức lệch **thay đổi theo giờ**.

## Cách làm

### 1. Đánh dấu phân vùng nóng

Kimball tách **hot partition** — phần dữ liệu chưa chốt — khỏi phần lịch sử, cả về vật lý
lẫn về ngữ nghĩa. Cột `da_chot` phải đi kèm dữ liệu tới tận lớp báo cáo:

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

**1.033,3 không đổi theo giờ.** Số hôm nay vẫn hiện, nhưng ở một cột riêng có nhãn *tạm
tính* — người xem biết mình đang nhìn cái gì.

### 2. So sánh cùng khung giờ, không so cả ngày

Muốn biết hôm nay tốt hay xấu thì so *tới cùng thời điểm* của các ngày trước, không so
tổng ngày:

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

Điều kiện để làm được: fact phải có **giờ**, không chỉ ngày. Đó là lý do real-time fact
cần một [dimension giờ trong ngày](../reference/date-dimension.md) tách riêng khỏi
`dim_ngay`.

### 3. Mốc chốt sổ phải là dữ liệu, không phải quy ước

Ngày được coi là "chốt" khi nào? Nửa đêm theo múi giờ nào? Sau khi job nạp chạy xong hay
sau khi kế toán duyệt? Câu trả lời phải nằm trong một bảng:

```text
dim_ky_bao_cao(ngay, da_chot, thoi_diem_chot, ai_chot)
```

Không có bảng đó thì mỗi báo cáo tự định nghĩa "hôm nay" một kiểu, và chúng lệch nhau vào
đúng lúc giao ca — cùng bệnh với
[định nghĩa quý nằm trong query](../case-studies/bao-cao-quy-tai-chinh-lech.md).

## Đánh đổi kiến trúc

| Cách | Được | Mất |
|---|---|---|
| Chỉ báo cáo tới ngày đã chốt | Số ổn định tuyệt đối | Không có gì cho hôm nay |
| Phân vùng nóng riêng, gắn nhãn | Có cả hai, người xem biết đang nhìn gì | Query phải lọc đúng; hai đường nạp |
| Trộn thẳng vào fact chính | Đơn giản nhất | Mọi chỉ số nhảy theo giờ |
| Hai kho riêng (streaming + batch) | Mỗi bên tối ưu cho việc của mình | Hai định nghĩa chỉ số — phá [conformed fact](conformed-facts.md) |

Dòng cuối là cái bẫy kiến trúc đắt nhất: dựng một hệ thống thời gian thực tách hẳn khỏi
kho, và sáu tháng sau phát hiện *"doanh thu real-time"* không bao giờ khớp *"doanh thu
kho"*, vì hai bên xử lý đơn huỷ khác nhau.

Nếu buộc phải có hai đường, thì phải có **một query đối soát chạy hằng ngày** so hai bên
sau khi ngày đã chốt — giống query đối soát của
[bảng tổng hợp](aggregate-fact-table.md).

## Quan hệ với dữ liệu về muộn

Phân vùng nóng chỉ giải quyết *"dữ liệu chưa tới đủ trong ngày hôm nay"*. Nó **không**
giải quyết *"dữ liệu của tuần trước mới về"* — đó là [dữ liệu về muộn](late-arriving.md),
và nó làm cả những ngày đã chốt cũng đổi số.

Hai vấn đề, hai cách xử lý, thường xuất hiện cùng nhau:

| | Phân vùng nóng | Dữ liệu về muộn |
|---|---|---|
| Ảnh hưởng | Ngày hôm nay | Ngày đã chốt trong quá khứ |
| Xử lý | Gắn nhãn `da_chot` | Nạp lại theo cửa sổ + audit |
| Người dùng thấy | "Số tạm tính" | Báo cáo cũ đổi số |

## Trade-offs

| Được | Mất |
|---|---|
| Chỉ số không nhảy theo giờ | Query phải phân biệt hai vùng |
| Vẫn có số hôm nay, có nhãn rõ | Hai đường nạp phải giữ đồng bộ |
| So cùng khung giờ chính xác | Fact phải lưu tới giờ, không chỉ ngày |
| Mốc chốt sổ là dữ liệu | Thêm một bảng phải duy trì |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Trộn dữ liệu chưa chốt vào fact chính | Trung bình nhảy suốt ngày — [case study](../case-studies/so-hom-nay-nhay-suot-ngay.md) |
| `count(DISTINCT ngay)` làm mẫu số | Ngày dở dang tính bằng ngày đầy |
| So tổng hôm nay với tổng hôm qua | Luôn thấy "giảm" cho tới cuối ngày |
| Fact chỉ có ngày, không có giờ | Không so được cùng khung giờ |
| Hai hệ thống, hai định nghĩa chỉ số | Số real-time không bao giờ khớp số kho |
| Không có mốc "đã chốt" trong dữ liệu | Mỗi báo cáo tự hiểu "hôm nay" một kiểu |

## Related Topics

- [Dữ liệu về muộn](late-arriving.md) — vấn đề song song, ảnh hưởng ngày đã chốt
- [Conformed facts](conformed-facts.md) — hai hệ thống thì định nghĩa chỉ số phải conform
- [Aggregate fact table](aggregate-fact-table.md) — query đối soát giữa hai lớp
- [Date dimension](../reference/date-dimension.md) — dimension giờ trong ngày tách riêng
- [CS: số hôm nay nhảy suốt ngày](../case-studies/so-hom-nay-nhay-suot-ngay.md)

## References

- Kimball Group — [Real-Time Fact Tables](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 20
