---
title: Hai phòng, hai con số doanh thu, cùng một cột tên "doanh_thu"
i18n_status: untranslated
sidebar_position: 16
description: "Mart bán hàng và mart tài chính đều đúng theo định nghĩa của mình; ghép lại lệch 11,9% và tỷ lệ tính ra từ hai nguồn thì vô nghĩa."
tags: [case-study, conformed-facts, metric, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Hai phòng, hai con số doanh thu, cùng một cột tên `doanh_thu`

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** [conformed dimension](../skills/conformed-dimension.md) làm hai mart **ghép
> được**. Không có [conformed fact](../skills/conformed-facts.md) thì chúng ghép được mà
> **không so được** — và đó là trạng thái nguy hiểm hơn hẳn bế tắc.

## Bối cảnh

Hai mart, dựng cách nhau sáu tháng, hai đội khác nhau, cùng một bảng nguồn.

```sql
CREATE TABLE src_don AS
SELECT * FROM (VALUES
  ('D1', 1000.0, 100.0,  50.0, 30.0),
  ('D2', 2000.0, 200.0,   0.0, 30.0),
  ('D3', 1500.0, 150.0, 150.0,  0.0)
) t(so_don, tien_hang, vat, giam_gia, phi_ship);

CREATE VIEW mart_ban_hang  AS SELECT so_don, tien_hang - giam_gia AS doanh_thu FROM src_don;
CREATE VIEW mart_tai_chinh AS SELECT so_don, tien_hang - giam_gia + vat + phi_ship AS doanh_thu FROM src_don;
```

Cả hai đội đều làm đúng việc của mình. Bán hàng không tính VAT vì đó không phải tiền của
công ty; tài chính tính tổng tiền thực vào tài khoản. **Không ai sai.**

## Triệu chứng

Họp giao ban, hai slide, hai con số cho tháng vừa rồi:

```text
┌─────────────────────────┬──────────────────────────┬───────┬──────────┐
│ doanh_thu_mart_ban_hang │ doanh_thu_mart_tai_chinh │ chenh │ lech_pct │
├─────────────────────────┼──────────────────────────┼───────┼──────────┤
│                  4300.0 │                   4810.0 │ 510.0 │     11.9 │
└─────────────────────────┴──────────────────────────┴───────┴──────────┘
```

Chênh **11,9%**. Nhưng đây chưa phải phần tệ nhất.

Một tuần sau, có người dựng dashboard "tỷ lệ chuyển đổi doanh thu", lấy tử số từ mart bán
hàng, mẫu số từ mart tài chính:

```text
┌────────────────────────────┐
│ ty_le_%_tuong_nhu_co_nghia │
├────────────────────────────┤
│                       89.4 │
└────────────────────────────┘
```

**89,4%** — nằm gọn trong khoảng người ta kỳ vọng, ổn định qua các tháng, và **không đo
cái gì cả**. Nó chỉ đang đo tỷ trọng VAT và phí ship trong tổng tiền.

Chỉ số này chạy sáu tháng trước khi có người hỏi công thức của nó.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Một mart nạp thiếu đơn | `count(*)` hai bên bằng nhau, khớp nguồn |
| Khác kỳ dữ liệu (một bên trễ 1 ngày) | Cùng khoảng ngày, cùng số dòng |
| Một bên lọc bỏ đơn huỷ | Không có đơn huỷ trong kỳ |
| Lỗi làm tròn | Chênh 510 trên 4.300 — quá lớn cho làm tròn |
| Một bên tính sai | **Sai** — cả hai đều tính đúng công thức của mình |

Chỗ mất thời gian dài nhất: mọi người đi tìm **bên nào sai**. Không bên nào sai. Câu hỏi
đúng phải là *"hai bên đang đo hai thứ khác nhau à?"* — và câu đó chỉ đặt được khi có
người mở cả hai định nghĩa ra đặt cạnh nhau.

## Nguyên nhân thật

Hai cột cùng tên `doanh_thu`, hai công thức:

```text
mart_ban_hang  : tien_hang - giam_gia
mart_tai_chinh : tien_hang - giam_gia + vat + phi_ship
```

Chênh lệch **510 = VAT 450 + phí ship 60** — giải thích được 100%.

Vấn đề không phải hai định nghĩa tồn tại; doanh nghiệp nào cũng có nhiều khái niệm doanh
thu. Vấn đề là **chúng cùng tên**, nên không ai nghĩ phải kiểm.

Nếu hai cột tên `doanh_thu_thuan` và `tong_tien_khach_tra` thì người dựng dashboard đã
dừng lại ở giây đầu tiên.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| Mỗi mart khớp bảng nguồn | ✅ xanh cả hai |
| `not_null`, `unique` trên khoá | ✅ xanh |
| `doanh_thu > 0` | ✅ xanh |
| Tỷ lệ chuyển đổi nằm trong `[0, 100]` | ✅ xanh — **89,4 hoàn toàn hợp lệ** |
| Hai mart cùng định nghĩa `doanh_thu` | ❌ — **không có khái niệm test này** |

Dòng thứ tư là điểm cốt lõi: một chỉ số **sai nhưng nằm trong khoảng hợp lý** thì không
test kiểu ngưỡng nào bắt được. Test dữ liệu kiểm dữ liệu; nó không kiểm được **ý nghĩa**.

## Cách sửa

### Bước 1 — hai khái niệm, hai tên, một bảng

```sql
CREATE TABLE fct_ban AS
SELECT so_don, tien_hang, giam_gia, vat, phi_ship,
       tien_hang - giam_gia                  AS doanh_thu_thuan,
       tien_hang - giam_gia + vat + phi_ship AS tong_tien_khach_tra
FROM src_don;
```

```text
┌─────────────────┬─────────────────────┬───────┬──────────┬──────────┐
│ doanh_thu_thuan │ tong_tien_khach_tra │  vat  │ phi_ship │ giam_gia │
├─────────────────┼─────────────────────┼───────┼──────────┼──────────┤
│          4300.0 │              4810.0 │ 450.0 │     60.0 │    200.0 │
└─────────────────┴─────────────────────┴───────┴──────────┴──────────┘
```

Giữ luôn các thành phần cấu thành — nhờ đó định nghĩa thứ ba trong tương lai không phải
sửa nguồn.

### Bước 2 — biến chênh lệch thành một phép trừ

```sql
SELECT sum(tong_tien_khach_tra) - sum(doanh_thu_thuan) AS chenh_thuc_te,
       sum(vat) + sum(phi_ship)                        AS chenh_giai_thich_duoc,
       sum(tong_tien_khach_tra) - sum(doanh_thu_thuan)
     - (sum(vat) + sum(phi_ship))                      AS con_lai_khong_giai_thich_duoc
FROM fct_ban;
```

```text
┌───────────────┬───────────────────────┬───────────────────────────────┐
│ chenh_thuc_te │ chenh_giai_thich_duoc │ con_lai_khong_giai_thich_duoc │
├───────────────┼───────────────────────┼───────────────────────────────┤
│         510.0 │                 510.0 │                           0.0 │
└───────────────┴───────────────────────┴───────────────────────────────┘
```

Cột cuối bằng 0 là **test nên đặt**. Nó không thể bằng 0 tình cờ, và nó biến câu chuyện
"hai đội cãi nhau" thành một dòng CI.

### Bước 3 — sổ đăng ký chỉ số

```text
┌─────────────────────┬───────────────────────────────────────┬─────────────────────┐
│     ten_chi_so      │               cong_thuc               │       ai_dung       │
├─────────────────────┼───────────────────────────────────────┼─────────────────────┤
│ doanh_thu_thuan     │ tien_hang - giam_gia                  │ Ban hang, Marketing │
│ tong_tien_khach_tra │ tien_hang - giam_gia + vat + phi_ship │ Tai chinh, CSKH     │
│ vat                 │ thue GTGT dau ra                      │ Tai chinh           │
└─────────────────────┴───────────────────────────────────────┴─────────────────────┘
```

## Dấu hiệu nhận ra sớm

1. **Cùng tên cột xuất hiện ở nhiều mart** — kiểm bằng metadata, không cần đọc code:

```sql
SELECT column_name, count(DISTINCT table_name) AS so_bang, list(table_name) AS o_dau
FROM information_schema.columns
WHERE column_name IN ('doanh_thu','revenue','gmv')
GROUP BY 1 HAVING count(DISTINCT table_name) > 1;
```

2. Hỏi hai người ở hai phòng *"doanh thu có gồm VAT không"* và nhận hai câu trả lời.

3. Có chỉ số nào là **tỷ lệ giữa hai bảng khác nhau** — mỗi cái như vậy đều đáng kiểm.

4. Không tìm được chỗ nào ghi công thức của một chỉ số ngoài code SQL.

## Related Topics

- [Conformed facts](../skills/conformed-facts.md) — bốn điều kiện để hai fact so được
- [Conformed dimension](../skills/conformed-dimension.md) — nửa còn lại của bài toán
- [Bus architecture và bus matrix](../reference/bus-architecture.md) — nơi khai báo cái gì phải conform
- [CS: hai mart không ghép được](hai-mart-khong-ghep-duoc.md) — thiếu conformed dimension
