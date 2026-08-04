---
title: Conformed facts — cùng tên phải cùng nghĩa
sidebar_position: 15
description: "Conformed dimension cho phép ghép số theo chiều; conformed fact quyết định hai con số đó có so được với nhau không."
tags: [conformed-facts, conformed-dimension, metric, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Conformed facts — cùng tên phải cùng nghĩa

> **Chốt:** [conformed dimension](conformed-dimension.md) làm hai fact **ghép được** theo
> chiều. Conformed fact quyết định hai con số ghép ra có **so được** hay không. Hai cột
> cùng tên `doanh_thu` với hai công thức khác nhau là lỗi tệ hơn hai cột khác tên, vì
> không ai nghĩ phải kiểm.

## Vấn đề

Hai mart, hai đội, cùng một cột tên `doanh_thu`:

```sql
CREATE TABLE src_don AS
SELECT * FROM (VALUES
  ('D1', 1000.0, 100.0,  50.0, 30.0),
  ('D2', 2000.0, 200.0,   0.0, 30.0),
  ('D3', 1500.0, 150.0, 150.0,  0.0)
) t(so_don, tien_hang, vat, giam_gia, phi_ship);

-- Mart Ban hang: doanh thu = tien hang - giam gia
CREATE VIEW mart_ban_hang AS
SELECT so_don, tien_hang - giam_gia AS doanh_thu FROM src_don;

-- Mart Tai chinh: doanh thu = tien hang - giam gia + VAT + phi ship
CREATE VIEW mart_tai_chinh AS
SELECT so_don, tien_hang - giam_gia + vat + phi_ship AS doanh_thu FROM src_don;
```

Cả hai định nghĩa đều **đúng trong bối cảnh của nó**. Đội bán hàng không tính VAT vì VAT
không phải tiền của công ty; đội tài chính tính tổng tiền vào tài khoản. Không ai sai.

```sql
SELECT (SELECT sum(doanh_thu) FROM mart_ban_hang)  AS doanh_thu_mart_ban_hang,
       (SELECT sum(doanh_thu) FROM mart_tai_chinh) AS doanh_thu_mart_tai_chinh,
       (SELECT sum(doanh_thu) FROM mart_tai_chinh)
     - (SELECT sum(doanh_thu) FROM mart_ban_hang)  AS chenh,
       round(100.0 * ((SELECT sum(doanh_thu) FROM mart_tai_chinh)
                    - (SELECT sum(doanh_thu) FROM mart_ban_hang))
             / (SELECT sum(doanh_thu) FROM mart_ban_hang), 1) AS lech_pct;
```

```text
┌─────────────────────────┬──────────────────────────┬───────┬──────────┐
│ doanh_thu_mart_ban_hang │ doanh_thu_mart_tai_chinh │ chenh │ lech_pct │
├─────────────────────────┼──────────────────────────┼───────┼──────────┤
│                  4300.0 │                   4810.0 │ 510.0 │     11.9 │
└─────────────────────────┴──────────────────────────┴───────┴──────────┘
```

**Lệch 11,9%** giữa hai bảng của cùng một công ty, cho cùng một tháng, từ cùng một nguồn.

### Chỗ nó chuyển từ khó chịu sang nguy hiểm

Chênh lệch còn nhìn thấy được. Cái không nhìn thấy được là khi ai đó **lấy tử số từ mart
này, mẫu số từ mart kia**:

```sql
WITH x AS (
  SELECT (SELECT sum(doanh_thu) FROM mart_ban_hang)  AS ban_hang,
         (SELECT sum(doanh_thu) FROM mart_tai_chinh) AS tai_chinh
)
SELECT round(100.0 * ban_hang / tai_chinh, 1) AS "ty_le_%_tuong_nhu_co_nghia" FROM x;
```

```text
┌────────────────────────────┐
│ ty_le_%_tuong_nhu_co_nghia │
├────────────────────────────┤
│                       89.4 │
└────────────────────────────┘
```

**89,4%** — một con số trông rất hợp lý, nằm trong khoảng người ta kỳ vọng, và **không đo
cái gì cả**. Nó chỉ đang đo tỷ trọng của VAT và phí ship, khoác nhãn "tỷ lệ chuyển đổi".

Không có test nào bắt được một tỷ lệ nằm trong khoảng hợp lý.

## Điều kiện để gọi là conformed fact

Theo Kimball, hai fact **conform** khi cả bốn điều sau đúng:

| Điều kiện | Kiểm bằng cách nào |
|---|---|
| Cùng **định nghĩa nghiệp vụ** | Viết công thức ra, đặt cạnh nhau, đọc to |
| Cùng **đơn vị** | Tiền tệ, đơn vị đo — xem [nhiều tiền tệ](multi-currency-uom.md) |
| Cùng **thời điểm ghi nhận** | Lúc đặt hàng, lúc giao, hay lúc thu tiền |
| Cùng **cách xử lý ngoại lệ** | Đơn huỷ, đơn trả, đơn nội bộ có tính không |

Không thoả **một** điều nào thì **bắt buộc đổi tên**. Đây là luật ngắn gọn nhất trong cả
mô hình chiều:

> **Không conform thì không được cùng tên.**

Đổi tên không phải thất bại — nó là cách duy nhất để người đọc biết mình đang cầm cái gì.

## Cách làm

### Bước 1 — hai khái niệm, hai tên, cùng một bảng

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

Cả hai chỉ số cùng nằm một chỗ, sinh từ cùng một tập dòng, và **các thành phần cấu thành
cũng có mặt**. Đó là điểm quan trọng: giữ `vat`, `phi_ship`, `giam_gia` làm cột riêng cho
phép mọi định nghĩa tương lai được tính lại mà không phải sửa nguồn.

### Bước 2 — đối soát khép kín

Hai chỉ số phải lệch **đúng bằng** các thành phần giải thích được, không hơn không kém:

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

Cột cuối bằng 0 là thứ đáng đặt thành test. Nó không thể bằng 0 một cách tình cờ, và nó
biến câu *"hai đội ra hai số"* từ một cuộc tranh cãi thành một phép trừ.

### Bước 3 — sổ đăng ký chỉ số

Định nghĩa chỉ số phải là **dữ liệu tra cứu được**, không phải tri thức truyền miệng:

```sql
CREATE TABLE dang_ky_chi_so AS
SELECT * FROM (VALUES
  ('doanh_thu_thuan',     'tien_hang - giam_gia',                  'Ban hang, Marketing'),
  ('tong_tien_khach_tra', 'tien_hang - giam_gia + vat + phi_ship', 'Tai chinh, CSKH'),
  ('vat',                 'thue GTGT dau ra',                      'Tai chinh')
) t(ten_chi_so, cong_thuc, ai_dung);
```

```text
┌─────────────────────┬───────────────────────────────────────┬─────────────────────┐
│     ten_chi_so      │               cong_thuc               │       ai_dung       │
├─────────────────────┼───────────────────────────────────────┼─────────────────────┤
│ doanh_thu_thuan     │ tien_hang - giam_gia                  │ Ban hang, Marketing │
│ tong_tien_khach_tra │ tien_hang - giam_gia + vat + phi_ship │ Tai chinh, CSKH     │
│ vat                 │ thue GTGT dau ra                      │ Tai chinh           │
└─────────────────────┴───────────────────────────────────────┴─────────────────────┘
```

Trong dbt, chỗ tự nhiên của bảng này là `schema.yml` (mô tả cột) hoặc semantic layer —
miễn là nó nằm **cùng repo với code tính ra chỉ số**, để hai thứ không trôi khỏi nhau.

## Quan hệ với conformed dimension

Hai kỹ thuật giải hai nửa của cùng một bài toán:

| | Conformed dimension | Conformed fact |
|---|---|---|
| Trả lời | Hai fact có **ghép được** không | Hai số ghép ra có **so được** không |
| Sai thì | Câu hỏi cắt ngang bất khả thi | Câu trả lời có, và sai |
| Phát hiện | Dễ — join không ra dòng nào | **Khó** — số vẫn đẹp |
| Xem | [Conformed dimension](conformed-dimension.md) | File này |

Vế thứ hai nguy hiểm hơn, đúng vì lý do đó: thiếu conformed dimension thì bạn *biết* mình
đang bế tắc. Thiếu conformed fact thì bạn có một con số và tin nó.

## Trade-offs

| Được | Mất |
|---|---|
| Số của hai đội so được với nhau | Phải đàm phán định nghĩa — việc của người, không phải của SQL |
| Đổi tên làm rõ ý, không ai nhầm | Tên dài hơn (`doanh_thu_thuan` thay vì `doanh_thu`) |
| Giữ các thành phần cấu thành | Fact rộng thêm vài cột |
| Đối soát khép kín thành test | Phải viết và duy trì test đó |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Hai mart cùng cột `doanh_thu`, khác công thức | Số lệch 12%, không ai biết nên tin cái nào — [case study](../case-studies/hai-phong-hai-doanh-thu.md) |
| Lấy tử số mart này, mẫu số mart kia | Ra tỷ lệ hợp lý và vô nghĩa |
| Chỉ lưu kết quả, bỏ các thành phần | Không tính lại được khi định nghĩa đổi |
| Định nghĩa nằm trong đầu người | Người nghỉ việc là mất định nghĩa |
| Conform dimension rồi coi như xong | Ghép được nhưng không so được |
| Cùng tên nhưng khác thời điểm ghi nhận | Lệch theo mùa, tưởng là biến động nghiệp vụ |

## Related Topics

- [Conformed dimension](conformed-dimension.md) — nửa còn lại của bài toán tích hợp
- [Bus architecture và bus matrix](../reference/bus-architecture.md) — nơi khai báo cái gì phải conform
- [Nhiều tiền tệ và đơn vị đo](multi-currency-uom.md) — cùng đơn vị là một trong bốn điều kiện
- [CS: hai phòng, hai con số doanh thu](../case-studies/hai-phong-hai-doanh-thu.md)
- [CS: hai mart không ghép được](../case-studies/hai-mart-khong-ghep-duoc.md)

## References

- Kimball Group — [Conformed Facts](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 4
