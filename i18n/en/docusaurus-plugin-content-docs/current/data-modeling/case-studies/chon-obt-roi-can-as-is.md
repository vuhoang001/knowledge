---
title: Chọn OBT xong, sáu tháng sau sếp hỏi câu as-is
i18n_status: untranslated
sidebar_position: 7
description: One Big Table cho as-was miễn phí, nhưng câu hỏi "theo khu vực hiện tại" thì không có cách nào trả lời.
tags: [case-study, obt, star-schema, scd, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: review
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Chọn OBT xong, sáu tháng sau sếp hỏi câu as-is

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. **Con số chạy thật trên DuckDB.**

> **Chốt:** [OBT](../reference/star-snowflake-obt.md) trả lời as-was miễn phí và **mất
> hẳn** as-is. Chọn OBT làm nơi lưu trữ duy nhất là khoá mình vào đúng một loại câu hỏi
> — mà bạn không biết trước mình sẽ cần loại nào.

## Bối cảnh

Lakehouse, Parquet, cột nén tốt. Đo thấy OBT không tốn chỗ hơn star bao nhiêu, query lại
nhanh vì không join. Quyết định: **dẹt hết vào một bảng**.

```sql
CREATE TABLE obt AS SELECT * FROM (VALUES
 ('DH1',DATE '2026-01-10','KH01','Nguyễn A','Miền Bắc',5000000),
 ('DH2',DATE '2026-02-15','KH01','Nguyễn A','Miền Bắc',3000000),
 ('DH3',DATE '2026-06-20','KH01','Nguyễn A','Miền Nam',2000000),
 ('DH4',DATE '2026-06-25','KH02','Trần B',  'Miền Nam',4000000))
 AS t(ma_don, ngay, khach_id, ho_ten, khu_vuc, tien);
```

Sáu tháng đầu chạy tốt. Câu hỏi as-was trả lời miễn phí:

```text
┌──────────┬───────────┐
│ khu_vuc  │ doanh_thu │
├──────────┼───────────┤
│ Miền Bắc │   8000000 │
│ Miền Nam │   6000000 │
└──────────┴───────────┘
```

Đúng — `KH01` mua ở Bắc rồi chuyển vào Nam, và OBT giữ nguyên khu vực **lúc mua**.

## Triệu chứng

Sếp hỏi:

> *"Nhóm khách hiện đang ở Miền Nam, tổng cộng từ trước tới nay họ mua bao nhiêu?"*

Đây là câu **as-is** — gom theo khu vực *hiện tại*, không phải lúc mua. Thử:

```sql
SELECT khach_id, count(DISTINCT khu_vuc) AS so_khu_vuc_khac_nhau
FROM obt GROUP BY 1;
```

```text
┌──────────┬──────────────────────┐
│ khach_id │ so_khu_vuc_khac_nhau │
├──────────┼──────────────────────┤
│ KH01     │                    2 │
│ KH02     │                    1 │
└──────────┴──────────────────────┘
```

`KH01` có **hai** khu vực trong OBT. Cái nào là hiện tại? **OBT không biết.** Nó chỉ có
những ảnh chụp rời rạc, không có khái niệm "phiên bản hiện hành".

## Giả thuyết sai lúc đầu

**"Lấy dòng mới nhất của mỗi khách là ra khu vực hiện tại."** Nghe rất hợp lý:

```sql
SELECT khach_id, khu_vuc, ngay FROM obt
WHERE (khach_id, ngay) IN (SELECT khach_id, max(ngay) FROM obt GROUP BY 1);
```

```text
┌──────────┬──────────┬────────────┐
│ khach_id │ khu_vuc  │    ngay    │
├──────────┼──────────┼────────────┤
│ KH01     │ Miền Nam │ 2026-06-20 │
│ KH02     │ Miền Nam │ 2026-06-25 │
└──────────┴──────────┴────────────┘
```

Trông đúng. **Nhưng chỉ đúng với khách vẫn còn mua.**

Khách ngừng mua từ 2024 thì "dòng mới nhất" là khu vực **năm 2024** — không phải hiện
tại. Họ có thể đã chuyển nhà hai lần từ đó. Và OBT **không có cách nào biết**, vì thông
tin đó chỉ đi vào OBT khi có giao dịch.

Đây là chỗ giả thuyết nguy hiểm: nó **đúng với đa số dòng**, nên kiểm mẫu vài khách là
thấy hợp lý — và sai đúng với nhóm khách đã rời bỏ, tức nhóm mà câu hỏi hay nhắm tới.

## Nguyên nhân thật

OBT nhúng thuộc tính vào fact **tại thời điểm ghi**. Hệ quả:

| | OBT có | OBT không có |
|---|---|---|
| Giá trị lúc giao dịch | ✅ | |
| Giá trị hiện tại | | ❌ |
| Thời điểm giá trị thay đổi | | ❌ |
| Giá trị tại một ngày bất kỳ | | ❌ |

Ba dòng cuối cần khái niệm **phiên bản** — `valid_from` / `valid_to` — mà OBT không có
và không thể suy ra. Xem [SCD](../skills/scd.md).

**Columnar không cứu được.** Nén giải quyết chi phí lưu trữ; nó không tạo ra thông tin
chưa từng được ghi.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` mọi cột | ✅ xanh |
| `unique` trên `ma_don` | ✅ xanh |
| Tổng doanh thu | ✅ đúng |

Không có gì sai với OBT. Nó làm chính xác thứ nó được thiết kế để làm.

Đây là loại "lỗi" mà test **về nguyên tắc** không bắt được: dữ liệu cần thiết **chưa bao
giờ được ghi vào**. Không có bất biến nào bị phá — chỉ có một câu hỏi không trả lời được.

## Cách sửa

Không sửa được bằng query. Phải **đổi mô hình**, và đó là lý do nó đắt.

Cách đúng — mô hình lai:

```text
nguồn → silver: star schema, dim Type 2 đầy đủ    ← nguồn sự thật
      → gold:   OBT dẹt cho từng use case BI      ← sản phẩm dẫn xuất
```

Với silver có `dim_khach_hang` Type 2, cả hai câu hỏi đều trả lời được:

```sql
-- as-was: khu vuc luc mua
JOIN dim_khach_hang d ON f.khach_sk = d.khach_sk

-- as-is: khu vuc hien tai
JOIN dim_khach_hang d ON f.khach_id = d.khach_id AND d.is_current
```

**Chi phí sửa muộn:** không có nguồn nào dựng lại lịch sử đã mất. Sáu tháng qua chỉ có
ảnh chụp rời rạc — Type 2 dựng từ hôm nay chỉ có lịch sử **từ hôm nay**. Phần trước đó
mất vĩnh viễn.

Còn một chi phí nhỏ hơn nhưng dai dẳng: sửa một lỗi chính tả tên khách phải viết lại mọi
dòng của khách đó.

```text
┌──────────────────┐
│ so_dong_phai_sua │
├──────────────────┤
│                3 │
└──────────────────┘
```

Ba dòng trong ví dụ đồ chơi. Ở quy mô thật là hàng triệu.

## Dấu hiệu nhận ra sớm

1. Đang có **OBT là nơi lưu trữ duy nhất**, không có star schema đứng sau.
2. Chưa ai hỏi *"cột này cần as-was hay as-is"* cho từng thuộc tính.
3. Có thuộc tính mô tả (khu vực, hạng, phân khúc) nhúng thẳng vào OBT mà **không** có
   dimension tương ứng ở tầng dưới.

**Phép thử một câu, làm được ngay hôm nay:**

```sql
SELECT count(*) AS so_khach_da_doi_thuoc_tinh FROM (
  SELECT khach_id FROM obt GROUP BY 1 HAVING count(DISTINCT khu_vuc) > 1
);
```

Ra số lớn hơn 0 nghĩa là thuộc tính đó **có thay đổi theo thời gian** — và bạn đang không
lưu được lịch sử của nó ở dạng truy vấn được.

## Related Topics

- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — ba cách bố trí, đo thật chi phí
- [SCD](../skills/scd.md) — thứ OBT không có: khái niệm phiên bản
- [Báo cáo quá khứ tự đổi số](bao-cao-qua-khu-tu-doi-so.md) — ca ngược lại: chỉ có as-is, mất as-was
- [Grain](../reference/grain.md) — OBT không đổi grain của fact, chỉ đổi cách lưu thuộc tính
