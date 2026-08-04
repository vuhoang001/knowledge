---
title: Một file nạp hai lần, xoá 10 dòng để diệt 5 dòng rác
sidebar_position: 14
description: "Fact không mang dấu vết lần chạy ETL, nên cách xoá duy nhất là theo khoảng ngày — và một nửa số dòng bị xoá là dòng tốt."
tags: [case-study, audit-dimension, data-quality, lineage, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Một file nạp hai lần, xoá 10 dòng để diệt 5 dòng rác

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** dữ liệu sẽ sai. Thứ quyết định sự cố mất mười phút hay nửa ngày là **fact có
> mang dấu vết của lần chạy đã sinh ra nó hay không** — xem
> [audit dimension](../skills/audit-dimension.md).

## Bối cảnh

Job nạp đêm chạy 02:00 mỗi ngày, mỗi lần một file. Hôm 02/03 job lỗi giữa chừng, người
trực chạy lại tay lúc 09:15 — nhưng chạy lại **file của hôm trước** vì gõ nhầm tên.

Fact có `ngay`, `doanh_thu`, và không có gì khác. Không cột nào cho biết dòng này từ lần
chạy nào ra.

```sql
CREATE TABLE fct_ban AS
  SELECT 'B' || i AS ma_ban, (DATE '2026-01-01' + INTERVAL (i-1) DAY)::DATE AS ngay,
         100 AS doanh_thu, 1 AS audit_sk FROM range(1, 11) t(i)
  UNION ALL
  SELECT 'B' || i, (DATE '2026-01-01' + INTERVAL (i-1) DAY)::DATE, 100, 2 FROM range(11, 21) t(i)
  UNION ALL
  SELECT 'B' || i, (DATE '2026-01-01' + INTERVAL (i-1) DAY)::DATE, 100, 3 FROM range(6, 11) t(i);
```

*(Cột `audit_sk` ở đây chỉ để bài này kiểm chứng được — trong hiện trường nó **không tồn
tại**, và đó chính là vấn đề.)*

## Triệu chứng

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

Doanh thu **phồng 25%**. Nguyên nhân được đoán ra khá nhanh — có người nhớ mình đã chạy
lại tay hôm đó.

Phần đắt tiền không phải chẩn đoán, mà là câu hỏi tiếp theo: **xoá cái gì?**

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Hệ nguồn phát trùng | Đối chiếu file gốc: mỗi file 10 dòng, sạch |
| Có đơn bị ghi nhận hai lần từ đầu | `ma_ban` trong file không trùng nhau |
| Job đêm chạy hai lần | Log scheduler: đúng một lần |
| Ai đó chạy lại tay | **Đúng** — nhưng chạy lại *cái gì*, và *dòng nào* đã vào? |

Ba giả thuyết đầu mất khoảng một giờ. Giả thuyết đúng lại **không giải quyết được gì**:
biết là do chạy lại tay, vẫn không biết dòng nào trong kho là của lần chạy đó.

## Nguyên nhân thật

`ma_ban` **không** duy nhất trên toàn hệ thống — nó chỉ duy nhất trong một file. Nên
`DELETE ... WHERE ma_ban IN (...)` sẽ xoá cả bản gốc lẫn bản trùng.

Không có cột nào phân biệt hai lần nạp. Thông tin duy nhất còn lại trong fact là **ngày
giao dịch**, nên cách xoá duy nhất là theo khoảng ngày:

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

**Xoá 10 dòng để diệt 5 dòng rác — một nửa là dòng tốt.** Sau đó phải nạp lại phần xoá
nhầm, và trong khoảng thời gian đó báo cáo bị hụt. Một sự cố nhỏ thành nửa ngày.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` trên mọi cột | ✅ xanh |
| `unique` trên `ma_ban` | ❌ đỏ — **nhưng chỉ báo "có trùng"** |
| `relationships` sang dimension | ✅ xanh |
| `doanh_thu > 0` | ✅ xanh |
| Số dòng khớp tổng số dòng các file nguồn | ❌ — **không ai viết test này** |

Test `unique` **có** đỏ. Nó nói được *"có trùng"* và không nói được *"dòng nào là bản
thừa"*. Với hai dòng giống hệt nhau ở mọi cột, không có thông tin nào trong bảng phân
biệt được chúng.

Đó là điểm cốt lõi: đây **không phải lỗi thiếu test**, mà là lỗi **thiếu metadata**. Test
chỉ phát hiện được thứ có mặt trong dữ liệu.

## Cách sửa

### Sửa 1 — audit dimension

Mỗi lần chạy ETL sinh một dòng; mỗi dòng fact mang khoá trỏ về lần chạy đã tạo ra nó.

```sql
CREATE TABLE dim_audit AS
SELECT * FROM (VALUES
  (1, 'run-2026-03-01-01', TIMESTAMP '2026-03-01 02:00:00', 'file_A.csv', 'v1.4.2', 10, 'ok'),
  (2, 'run-2026-03-02-01', TIMESTAMP '2026-03-02 02:00:00', 'file_B.csv', 'v1.4.2', 10, 'ok'),
  (3, 'run-2026-03-02-02', TIMESTAMP '2026-03-02 09:15:00', 'file_A.csv', 'v1.4.2', 10, 'chay lai tay')
) t(audit_sk, ma_lan_chay, thoi_diem_chay, file_nguon, phien_ban_code, so_dong_nguon, ghi_chu);

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

Sửa thành một câu lệnh, chính xác 5 dòng:

```sql
DELETE FROM fct_ban WHERE audit_sk = 3;
```

```text
┌──────────────┬───────────┐
│ dong_con_lai │ doanh_thu │
├──────────────┼───────────┤
│           20 │      2000 │
└──────────────┴───────────┘
```

### Sửa 2 — phát hiện tự động, không cần ai nghi ngờ trước

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

Test này chạy được **ngay sau khi nạp**, trước khi ai kịp nhìn dashboard.

### Sửa 3 — đẳng thức khép kín nạp + loại = nguồn

Kèm theo audit dimension là error event schema cho các dòng bị loại:

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

Đẳng thức này không thể đúng một cách tình cờ. Nó bắt được cả nạp trùng lẫn mất dòng âm
thầm.

| | Trước | Sau |
|---|---|---|
| Thời gian xử lý sự cố | Nửa ngày | Một câu lệnh |
| Dòng tốt bị xoá nhầm | 5 | 0 |
| Phát hiện nạp trùng bằng | Người dùng báo số lạ | Test sau mỗi lần nạp |
| Chi phí thường trực | 0 | Một cột `INT` + một bảng nhỏ |

## Dấu hiệu nhận ra sớm

1. Bảng fact **không có** cột nào kiểu `ma_lan_chay` / `_run_id` / `_loaded_at`. Kiểm một
   phút:

```sql
DESCRIBE fct_ban;
```

2. Quy trình xử lý sự cố có câu *"xoá theo khoảng ngày rồi nạp lại"*. Đó là dấu hiệu chắc
   chắn không có audit dimension — nếu có thì đã xoá theo lần chạy.

3. Không ai trả lời được câu *"dòng này do lần chạy nào tạo ra"* trong dưới một phút.

4. Không có test đếm `count(*)` của mỗi lần nạp so với `so_dong_nguon` khai báo.

Trong dbt, gắn cột audit vào model tốn đúng hai dòng:

```sql
SELECT ...,
       '{{ invocation_id }}'  AS ma_lan_chay,
       '{{ run_started_at }}' AS thoi_diem_chay
FROM {{ ref('stg_ban') }}
```

## Related Topics

- [Audit dimension và error event schema](../skills/audit-dimension.md) — kỹ thuật bị bỏ qua ở đây
- [Six dimensions of data quality](../../data-quality/six-dimensions.md) — bộ nhãn cho lý do loại dòng
- [Triển khai test trong dbt](../../etl/dbt/skills/implementing-tests.md) — hai tầng chặn và phát hiện
- [CS: bảng tổng hợp lệch số](bang-tong-hop-lech-so.md) — cũng cần nạp lại có kiểm soát
