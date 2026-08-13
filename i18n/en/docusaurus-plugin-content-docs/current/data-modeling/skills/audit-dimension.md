---
title: Audit dimension và error event schema
i18n_status: untranslated
sidebar_position: 13
description: "Mỗi dòng fact mang một khoá trỏ về lần chạy đã sinh ra nó — khi số sai, bạn xoá đúng thứ phải xoá thay vì xoá theo khoảng ngày."
tags: [audit-dimension, error-event, data-quality, lineage, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Audit dimension và error event schema

> **Chốt:** dữ liệu sẽ sai. Câu hỏi không phải *"làm sao để không bao giờ sai"* mà là
> *"khi sai thì mất bao lâu để biết dòng nào sai và xoá đúng chừng đó"*. Audit dimension
> là câu trả lời: mỗi dòng fact mang một khoá trỏ về **lần chạy ETL đã sinh ra nó**.

## Vấn đề

Sáng ra, doanh thu tháng 1 nhảy từ 2.000 lên 2.500. Không ai sửa gì. Không có test nào
đỏ.

```sql
SELECT count(*) AS dong_trong_kho, sum(doanh_thu) AS doanh_thu_kho,
       20 AS dong_that, 2000 AS doanh_thu_that,
       round(100.0 * (sum(doanh_thu) - 2000) / 2000, 1) AS phong_pct
FROM fct_ban;
```

```text
┌────────────────┬───────────────┬───────────┬────────────────┬───────────┐
│ dong_trong_kho │ doanh_thu_kho │ dong_that │ doanh_thu_that │ phong_pct │
├────────────────┼───────────────┼───────────┼────────────────┼───────────┤
│             25 │          2500 │        20 │           2000 │      25.0 │
└────────────────┴───────────────┴───────────┴────────────────┴───────────┘
```

**Phồng 25%.** Nguyên nhân hoá ra rất tầm thường: một file nguồn được nạp hai lần vì có
người chạy lại tay sau khi job đêm lỗi giữa chừng.

Giờ tới phần đắt: **xoá cái gì?** Nếu fact không mang dấu vết của lần chạy, thông tin duy
nhất còn lại là ngày giao dịch. Nên cách xoá duy nhất là theo khoảng ngày:

```sql
SELECT count(*) AS dong_bi_xoa,
       count(*) FILTER (WHERE audit_sk = 3)  AS thuc_su_la_rac,
       count(*) FILTER (WHERE audit_sk <> 3) AS xoa_nham_dong_tot
FROM fct_ban WHERE ngay BETWEEN DATE '2026-01-06' AND DATE '2026-01-10';
```

```text
┌─────────────┬────────────────┬───────────────────┐
│ dong_bi_xoa │ thuc_su_la_rac │ xoa_nham_dong_tot │
├─────────────┼────────────────┼───────────────────┤
│          10 │              5 │                 5 │
└─────────────┴────────────────┴───────────────────┘
```

Xoá 10 dòng để diệt 5 dòng rác — **một nửa là dòng tốt**. Rồi phải nạp lại phần đã xoá
nhầm, và trong lúc nạp lại thì báo cáo hụt. Mỗi sự cố nhỏ thành nửa ngày.

## Audit dimension

Một dimension mô tả **lần chạy ETL**, không mô tả nghiệp vụ. Mỗi lần chạy sinh một dòng;
mỗi dòng fact do lần chạy đó tạo ra mang `audit_sk` tương ứng.

```sql
CREATE TABLE dim_audit AS
SELECT * FROM (VALUES
  (1, 'run-2026-03-01-01', TIMESTAMP '2026-03-01 02:00:00', 'file_A.csv', 'v1.4.2', 10, 'ok'),
  (2, 'run-2026-03-02-01', TIMESTAMP '2026-03-02 02:00:00', 'file_B.csv', 'v1.4.2', 10, 'ok'),
  (3, 'run-2026-03-02-02', TIMESTAMP '2026-03-02 09:15:00', 'file_A.csv', 'v1.4.2', 10, 'chay lai tay')
) t(audit_sk, ma_lan_chay, thoi_diem_chay, file_nguon, phien_ban_code, so_dong_nguon, ghi_chu);
```

Cùng câu hỏi "số sai ở đâu", giờ trả lời bằng một `GROUP BY`:

```sql
SELECT a.audit_sk, a.ma_lan_chay, a.file_nguon, a.ghi_chu,
       count(*) AS dong_nap, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_audit a USING (audit_sk)
GROUP BY 1,2,3,4 ORDER BY 1;
```

```text
┌──────────┬───────────────────┬────────────┬──────────────┬──────────┬───────────┐
│ audit_sk │    ma_lan_chay    │ file_nguon │   ghi_chu    │ dong_nap │ doanh_thu │
├──────────┼───────────────────┼────────────┼──────────────┼──────────┼───────────┤
│        1 │ run-2026-03-01-01 │ file_A.csv │ ok           │       10 │      1000 │
│        2 │ run-2026-03-02-01 │ file_B.csv │ ok           │       10 │      1000 │
│        3 │ run-2026-03-02-02 │ file_A.csv │ chay lai tay │        5 │       500 │
└──────────┴───────────────────┴────────────┴──────────────┴──────────┴───────────┘
```

`file_A.csv` xuất hiện hai lần. Và điều đó phát hiện được **tự động**, không cần ai nghi
ngờ trước:

```sql
SELECT file_nguon, count(*) AS so_lan_nap, list(ma_lan_chay) AS cac_lan
FROM dim_audit GROUP BY 1 HAVING count(*) > 1;
```

```text
┌────────────┬────────────┬────────────────────────────────────────┐
│ file_nguon │ so_lan_nap │                cac_lan                 │
├────────────┼────────────┼────────────────────────────────────────┤
│ file_A.csv │          2 │ [run-2026-03-01-01, run-2026-03-02-02] │
└────────────┴────────────┴────────────────────────────────────────┘
```

Sửa là một câu lệnh, **chính xác 5 dòng, không đụng dòng nào khác**:

```sql
DELETE FROM fct_ban WHERE audit_sk = 3;

SELECT count(*) AS dong_con_lai, sum(doanh_thu) AS doanh_thu FROM fct_ban;
```

```text
┌──────────────┬───────────┐
│ dong_con_lai │ doanh_thu │
├──────────────┼───────────┤
│           20 │      2000 │
└──────────────┴───────────┘
```

**Nửa ngày → một câu lệnh.** Đó là toàn bộ giá trị của kỹ thuật này.

### Những cột đáng có

| Cột | Dùng để |
|---|---|
| `ma_lan_chay` | Nối với log của orchestrator (`run_id` của Airflow / dbt `invocation_id`) |
| `thoi_diem_chay` | Phân biệt job đêm với lần chạy lại tay |
| `file_nguon` / `bang_nguon` | Phát hiện nạp trùng |
| `phien_ban_code` | *"Số đổi từ hôm deploy"* — trả lời được bằng dữ liệu |
| `so_dong_nguon` | Mẫu số để tính tỷ lệ lỗi |
| `so_dong_loi`, `diem_chat_luong` | Đánh cờ lô dữ liệu đáng ngờ |
| `la_nap_lai` | Tách lần chạy bình thường khỏi lần sửa chữa |

Ba cột đầu là mức tối thiểu. Nếu chỉ làm được một cột duy nhất thì làm `ma_lan_chay`.

**Audit dimension là dimension hay fact?** Kimball xếp là dimension vì fact trỏ tới nó
bằng khoá ngoại và người ta lọc/gộp theo nó. Nhưng grain của nó là *một lần chạy*, và số
lần chạy tăng theo thời gian — nên đừng ngạc nhiên khi nó lớn hơn dimension nghiệp vụ.
Nó thuộc loại Type 0: một lần chạy đã xong thì không bao giờ sửa lại mô tả của nó.

## Error event schema

Audit dimension nói **dòng nào đã vào kho**. Câu hỏi còn lại: **dòng nào không vào được,
và vì sao?**

Cách xử lý mặc định của mọi pipeline — `WHERE cot IS NOT NULL` rồi đi tiếp — làm dữ liệu
bị loại **bốc hơi không dấu vết**. Không ai biết đã mất bao nhiêu, mất cái gì, và tỷ lệ
mất có tăng không.

Error event schema là một fact riêng cho **sự kiện lỗi**:

```sql
CREATE TABLE fct_loi AS
SELECT * FROM (VALUES
  (1, 'file_A.csv', 'B-X1', 'khach_id rong',          'completeness'),
  (2, 'file_B.csv', 'B-X2', 'so_tien am',             'validity'),
  (2, 'file_B.csv', 'B-X3', 'khach_id khong ton tai', 'integrity')
) t(audit_sk, file_nguon, ma_ban, ly_do, chieu_chat_luong);

SELECT chieu_chat_luong, count(*) AS so_dong, list(ly_do) AS ly_do
FROM fct_loi GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌──────────────────┬─────────┬──────────────────────────┐
│ chieu_chat_luong │ so_dong │          ly_do           │
├──────────────────┼─────────┼──────────────────────────┤
│ integrity        │       1 │ [khach_id khong ton tai] │
│ completeness     │       1 │ [khach_id rong]          │
│ validity         │       1 │ [so_tien am]             │
└──────────────────┴─────────┴──────────────────────────┘
```

Cột `chieu_chat_luong` dùng đúng bộ [sáu chiều chất lượng](../../data-quality/six-dimensions.md)
— để chất lượng dữ liệu đo được bằng cùng một thước ở mọi bảng.

Kèm theo là phép đối soát khép kín, thứ mà không có error schema thì không tồn tại:

```sql
SELECT (SELECT count(*) FROM fct_ban) AS da_nap,
       (SELECT count(*) FROM fct_loi) AS bi_loai,
       (SELECT count(*) FROM fct_ban) + (SELECT count(*) FROM fct_loi) AS cong_lai,
       (SELECT sum(so_dong_nguon) FROM dim_audit WHERE audit_sk IN (1,2)) + 3 AS dong_nguon;
```

```text
┌────────┬─────────┬──────────┬────────────┐
│ da_nap │ bi_loai │ cong_lai │ dong_nguon │
├────────┼─────────┼──────────┼────────────┤
│     20 │       3 │       23 │         23 │
└────────┴─────────┴──────────┴────────────┘
```

**Nạp + loại = nguồn.** Đẳng thức này là bất biến mạnh nhất của cả pipeline: nó không thể
đúng một cách tình cờ. Đặt nó thành test là bắt được mọi kiểu mất dòng âm thầm — kể cả
kiểu ở [case study một nửa số đơn biến mất](../case-studies/don-dang-giao-bien-mat.md).

Và vì lỗi giờ là dữ liệu, chất lượng thành một chỉ số theo dõi được theo thời gian:

```sql
SELECT a.ma_lan_chay, coalesce(l.so_loi, 0) AS so_loi, a.so_dong_nguon,
       round(100.0 * coalesce(l.so_loi, 0) / a.so_dong_nguon, 1) AS ty_le_loi_pct
FROM dim_audit a
LEFT JOIN (SELECT audit_sk, count(*) AS so_loi FROM fct_loi GROUP BY 1) l USING (audit_sk)
ORDER BY ty_le_loi_pct DESC;
```

```text
┌───────────────────┬────────┬───────────────┬───────────────┐
│    ma_lan_chay    │ so_loi │ so_dong_nguon │ ty_le_loi_pct │
├───────────────────┼────────┼───────────────┼───────────────┤
│ run-2026-03-02-01 │      2 │            10 │          20.0 │
│ run-2026-03-01-01 │      1 │            10 │          10.0 │
│ run-2026-03-02-02 │      0 │            10 │           0.0 │
└───────────────────┴────────┴───────────────┴───────────────┘
```

Ngưỡng cảnh báo đặt trên cột cuối. Test dbt thường trả lời *"có lỗi hay không"*; cột này
trả lời *"lỗi đang nhiều lên hay ít đi"* — câu hỏi hữu ích hơn hẳn khi vận hành lâu dài.

## Quan hệ với ba tầng của dbt

| Tầng | Công cụ | Trả lời |
|---|---|---|
| Chặn trước | `contract`, `not_null`, `unique` | Dữ liệu sai có được vào không |
| Phát hiện | `dbt test` | Sau khi nạp, có gì bất thường không |
| **Truy vết** | **audit dimension + error schema** | **Dòng nào, do lần chạy nào, vì sao bị loại** |

Hai tầng đầu là câu hỏi có/không. Tầng ba là thứ quyết định sự cố mất mười phút hay nửa
ngày. Chi tiết hai tầng đầu ở [Triển khai test](../../etl/dbt/skills/implementing-tests.md).

Trong dbt, cột audit gắn vào model bằng đúng vài dòng:

```sql
SELECT ...,
       '{{ invocation_id }}'          AS ma_lan_chay,
       '{{ run_started_at }}'         AS thoi_diem_chay
FROM {{ ref('stg_ban') }}
```

## Trade-offs

| Được | Mất |
|---|---|
| Xoá đúng thứ phải xoá — một câu lệnh | Mỗi fact rộng thêm 1 cột khoá |
| Phát hiện nạp trùng tự động | Phải sinh và giữ `dim_audit` |
| *"Số đổi từ hôm deploy nào"* trả lời được | Dòng audit tăng theo số lần chạy, không theo nghiệp vụ |
| Dữ liệu bị loại không biến mất | Thêm một bảng lỗi phải dọn định kỳ |

Chi phí thật sự thấp: một cột `INT` trong fact, và một bảng nhỏ. So với nửa ngày mỗi lần
có sự cố thì nó hoàn vốn ngay lần đầu.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Không có dấu vết lần chạy trong fact | Xoá theo khoảng ngày, mất luôn dòng tốt — [case study](../case-studies/nap-hai-lan-khong-truy-duoc.md) |
| Chỉ ghi log ra file, không ghi vào bảng | Không join được với fact, không truy được dòng nào |
| `WHERE … IS NOT NULL` rồi đi tiếp | Dữ liệu bị loại bốc hơi, không ai biết mất bao nhiêu |
| Có bảng lỗi nhưng không ai nhìn | Thành bãi rác — phải có ngưỡng cảnh báo trên tỷ lệ |
| Ghi audit vào dimension nghiệp vụ | Trộn metadata kỹ thuật với thuộc tính nghiệp vụ |
| Không lưu `so_dong_nguon` | Không có mẫu số, không tính được tỷ lệ lỗi |

## Related Topics

- [Six dimensions of data quality](../../data-quality/six-dimensions.md) — bộ nhãn cho `chieu_chat_luong`
- [Triển khai test trong dbt](../../etl/dbt/skills/implementing-tests.md) — hai tầng chặn và phát hiện
- [Dữ liệu về muộn](late-arriving.md) — nguyên nhân hay gặp của việc nạp lại
- [Aggregate fact table](aggregate-fact-table.md) — nạp lại bảng tổng hợp cũng cần dấu vết
- [CS: nạp hai lần, không truy được dòng nào](../case-studies/nap-hai-lan-khong-truy-duoc.md)

## References

- Kimball Group — [Audit Dimensions / Error Event Schemas](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 19
