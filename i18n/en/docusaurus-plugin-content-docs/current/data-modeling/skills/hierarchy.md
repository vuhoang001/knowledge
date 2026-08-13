---
title: Cây phân cấp — cố định, hơi lệch và lệch hẳn
i18n_status: untranslated
sidebar_position: 9
description: "Cây danh mục hay sơ đồ tổ chức có độ sâu không đều: bảng dẹt cố định làm mất dòng, bridge đường đi thì rollup ở mọi cấp đều đúng."
tags: [hierarchy, ragged-hierarchy, bridge-table, dimension, kimball, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Cây phân cấp — cố định, hơi lệch và lệch hẳn

> **Chốt:** cây có độ sâu **đều** thì dẹt thành cột (`cap_1`, `cap_2`, `cap_3`) là cách
> nhanh và dễ hiểu nhất. Cây có độ sâu **không đều** mà vẫn dẹt thì mỗi báo cáo theo cấp
> lá lại âm thầm bỏ rơi một phần dữ liệu — và tổng vẫn trông hợp lý.

## Ba loại cây, ba cách xử lý

Kimball tách rõ ba trường hợp; chọn sai ngay từ đầu là nguồn gốc của mọi rắc rối sau đó:

| Loại | Đặc điểm | Cách dựng |
|---|---|---|
| **Fixed depth** — cố định | Mọi nhánh đúng N cấp, cấp nào cũng có tên riêng | Dẹt thành N cột trong dimension |
| **Slightly ragged** — hơi lệch | Độ sâu 2–4, chênh ít, biết trước cận trên | Dẹt tới cấp sâu nhất + kéo cấp cha xuống lấp chỗ trống |
| **Ragged** — lệch hẳn | Độ sâu tuỳ ý, thay đổi theo thời gian (sơ đồ tổ chức, cây tài khoản) | **Bridge đường đi** (closure table) |

Phép thử một câu: *"nếu ngày mai thêm một cấp giữa thì phải sửa gì?"* Nếu câu trả lời là
"sửa DDL và sửa mọi báo cáo" thì bạn đang dùng fixed depth cho một cây ragged.

## Ví dụ xuyên suốt

Cây danh mục sản phẩm, độ sâu 1 đến 3 — hoàn toàn bình thường ở bán lẻ: ngành hàng lớn
được chia nhỏ, ngành hàng mới thì chưa.

```text
Dien tu (1)
├── Dien thoai (2)
│   └── Smartphone (3)     ← SP-01, doanh thu 500
└── Phu kien (2)           ← SP-02, doanh thu 300
Thoi trang (1)             ← SP-03, doanh thu 200
```

```sql
CREATE TABLE danh_muc AS
SELECT * FROM (VALUES
  (1, 'Dien tu',    NULL),
  (2, 'Dien thoai', 1),
  (3, 'Smartphone', 2),
  (4, 'Phu kien',   1),
  (5, 'Thoi trang', NULL)
) t(dm_id, ten, cha_id);

CREATE TABLE fct_ban AS
SELECT * FROM (VALUES
  ('SP-01', 3, 500),   -- gan o la cap 3
  ('SP-02', 4, 300),   -- gan o la cap 2
  ('SP-03', 5, 200)    -- gan o la cap 1
) t(san_pham, dm_id, doanh_thu);
```

Tổng thật: **1.000**.

### Cách 1 — dẹt cố định 3 cấp

```sql
CREATE TABLE dim_dm_det AS
SELECT l3.dm_id,
       coalesce(l1.ten, l2.ten, l3.ten) AS cap_1,
       CASE WHEN l1.ten IS NOT NULL THEN l2.ten
            WHEN l2.ten IS NOT NULL THEN l3.ten END AS cap_2,
       CASE WHEN l1.ten IS NOT NULL THEN l3.ten END  AS cap_3
FROM danh_muc l3
LEFT JOIN danh_muc l2 ON l3.cha_id = l2.dm_id
LEFT JOIN danh_muc l1 ON l2.cha_id = l1.dm_id;
```

```text
┌───────┬────────────┬────────────┬────────────┐
│ dm_id │   cap_1    │   cap_2    │   cap_3    │
├───────┼────────────┼────────────┼────────────┤
│     1 │ Dien tu    │ NULL       │ NULL       │
│     2 │ Dien tu    │ Dien thoai │ NULL       │
│     3 │ Dien tu    │ Dien thoai │ Smartphone │
│     4 │ Dien tu    │ Phu kien   │ NULL       │
│     5 │ Thoi trang │ NULL       │ NULL       │
└───────┴────────────┴────────────┴────────────┘
```

Bảng trông ổn. Vấn đề xuất hiện ở báo cáo đầu tiên theo cấp lá:

```sql
SELECT coalesce(d.cap_3, '(khong co cap 3)') AS cap_3, sum(f.doanh_thu) AS doanh_thu
FROM fct_ban f JOIN dim_dm_det d USING (dm_id)
GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌──────────────────┬───────────┐
│      cap_3       │ doanh_thu │
├──────────────────┼───────────┤
│ Smartphone       │       500 │
│ (khong co cap 3) │       500 │
└──────────────────┴───────────┘
```

```sql
SELECT sum(f.doanh_thu) FILTER (WHERE d.cap_3 IS NOT NULL) AS vao_bao_cao,
       sum(f.doanh_thu) FILTER (WHERE d.cap_3 IS NULL)     AS bi_bo_ra,
       round(100.0 * sum(f.doanh_thu) FILTER (WHERE d.cap_3 IS NULL)
             / sum(f.doanh_thu), 1)                        AS mat_pct
FROM fct_ban f JOIN dim_dm_det d USING (dm_id);
```

```text
┌─────────────┬──────────┬─────────┐
│ vao_bao_cao │ bi_bo_ra │ mat_pct │
├─────────────┼──────────┼─────────┤
│         500 │      500 │    50.0 │
└─────────────┴──────────┴─────────┘
```

**Một nửa doanh thu** rơi vào ô `NULL`. Trên BI, ô `NULL` thường bị lọc mặc định hoặc bị
người xem lướt qua — nên báo cáo hiển thị 500 và không ai thấy 500 còn lại đã đi đâu.

### Cách 2 — kéo cấp cha xuống (slightly ragged)

Cách chữa rẻ nhất cho cây **hơi** lệch: lấp `NULL` bằng chính giá trị cấp trên.

```sql
CREATE TABLE dim_dm_keo AS
SELECT dm_id, cap_1,
       coalesce(cap_2, cap_1)        AS cap_2,
       coalesce(cap_3, cap_2, cap_1) AS cap_3
FROM dim_dm_det;
```

```text
┌────────────┬───────────┐
│   cap_3    │ doanh_thu │
├────────────┼───────────┤
│ Smartphone │       500 │
│ Phu kien   │       300 │
│ Thoi trang │       200 │
└────────────┴───────────┘
```

Tổng khớp lại 1.000, `NULL` biến mất, mọi công cụ BI drill-down đều chạy.

**Cái phải chấp nhận:** cột `cap_3` giờ chứa cả node không phải cấp 3 thật. Câu *"có bao
nhiêu danh mục cấp 3"* không còn trả lời được từ bảng này. Đánh đổi hợp lý khi độ sâu
chênh 1–2 cấp và biết trước cận trên; sai hẳn khi cây có thể sâu tuỳ ý.

### Cách 3 — bridge đường đi, cho cây lệch hẳn

Sinh mọi cặp (tổ tiên → con cháu), kể cả chính nó ở khoảng cách 0:

```sql
CREATE TABLE bridge_dm AS
WITH RECURSIVE duong_di(to_tien_id, con_id, so_cap) AS (
    SELECT dm_id, dm_id, 0 FROM danh_muc
  UNION ALL
    SELECT d.cha_id, p.con_id, p.so_cap + 1
    FROM duong_di p JOIN danh_muc d ON p.to_tien_id = d.dm_id
    WHERE d.cha_id IS NOT NULL
)
SELECT * FROM duong_di;
```

```text
┌────────────┬────────────┬────────┬────────────┬────────┐
│ to_tien_id │  to_tien   │ con_id │    con     │ so_cap │
├────────────┼────────────┼────────┼────────────┼────────┤
│          1 │ Dien tu    │      1 │ Dien tu    │      0 │
│          1 │ Dien tu    │      2 │ Dien thoai │      1 │
│          1 │ Dien tu    │      4 │ Phu kien   │      1 │
│          1 │ Dien tu    │      3 │ Smartphone │      2 │
│          2 │ Dien thoai │      2 │ Dien thoai │      0 │
│          2 │ Dien thoai │      3 │ Smartphone │      1 │
│          3 │ Smartphone │      3 │ Smartphone │      0 │
│          4 │ Phu kien   │      4 │ Phu kien   │      0 │
│          5 │ Thoi trang │      5 │ Thoi trang │      0 │
└────────────┴────────────┴────────┴────────────┴────────┘
```

Giờ rollup cho **bất kỳ node nào**, sâu bao nhiêu cấp cũng được, bằng đúng một câu:

```sql
SELECT t.ten AS danh_muc, sum(f.doanh_thu) AS doanh_thu_ca_nhanh
FROM fct_ban f
JOIN bridge_dm b ON b.con_id = f.dm_id
JOIN danh_muc t  ON t.dm_id  = b.to_tien_id
GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌────────────┬────────────────────┐
│  danh_muc  │ doanh_thu_ca_nhanh │
├────────────┼────────────────────┤
│ Dien tu    │                800 │
│ Smartphone │                500 │
│ Dien thoai │                500 │
│ Phu kien   │                300 │
│ Thoi trang │                200 │
└────────────┴────────────────────┘
```

`Dien tu` = 800 = 500 (Smartphone, cách 2 cấp) + 300 (Phu kien, cách 1 cấp). Không cấu
hình gì thêm.

**Lưu ý quan trọng:** bảng này **cố tình** nhân bản dòng — cộng cả cột `doanh_thu_ca_nhanh`
lại sẽ ra 2.300, không phải 1.000. Đó là bản chất của bridge, giống hệt cảnh báo ở
[bridge table](bridge-table.md). Muốn tổng đúng thì lọc về đúng một mức:

```sql
SELECT sum(f.doanh_thu) AS tong_qua_bridge
FROM fct_ban f
JOIN bridge_dm b ON b.con_id = f.dm_id
JOIN danh_muc t  ON t.dm_id  = b.to_tien_id
WHERE t.cha_id IS NULL;          -- chi cac node goc
```

```text
┌─────────────────┐
│ tong_qua_bridge │
├─────────────────┤
│            1000 │
└─────────────────┘
```

### Bảng so sánh ba cách

| | Dẹt cố định | Kéo cấp cha | Bridge đường đi |
|---|---|---|---|
| Doanh thu báo cáo cấp lá | 500 (**mất 50%**) | 1.000 | 1.000 |
| Rollup cho node giữa cây | Chỉ node có cấp riêng | Có, nhưng nhãn lẫn lộn | Mọi node |
| Thêm một cấp mới | Sửa DDL + mọi báo cáo | Sửa DDL | **Không sửa gì** |
| SQL của báo cáo | `GROUP BY cap_2` | `GROUP BY cap_2` | Thêm một join |
| Nguy cơ đếm trùng | Không | Không | **Có** — phải lọc `so_cap` hoặc mức |
| BI drill-down có sẵn | Có | Có | Phải cấu hình |

## Khi nào chọn cái nào

```text
Do sau co co dinh va on dinh khong?
├── Co  → det co dinh (cap_1..cap_N). Don gian nhat, dung nhat.
└── Khong
     ├── Chenh 1–2 cap, biet truoc can tren, it doi
     │    → keo cap cha xuong. Re, BI dung duoc ngay.
     └── Sau tuy y, hoac cau truc doi theo thoi gian
          → bridge duong di. Ton mot join, doi lai khong bao gio phai sua DDL.
```

Sơ đồ tổ chức nhân sự và cây tài khoản kế toán **luôn** thuộc nhánh cuối. Đừng thử dẹt
chúng.

## Cây thay đổi theo thời gian

Bridge giải quyết độ sâu, không giải quyết thời gian. Nếu tháng sau `Phu kien` được
chuyển sang `Thoi trang` thì báo cáo tháng trước ra sao?

Đây đúng là câu hỏi của [SCD](scd.md), áp lên bảng bridge: thêm `hieu_luc_tu` /
`hieu_luc_den` cho mỗi cặp đường đi, rồi join theo ngày giao dịch.

```sql
SELECT t.ten, sum(f.doanh_thu)
FROM fct_ban f
JOIN bridge_dm b ON b.con_id = f.dm_id
                AND f.ngay >= b.hieu_luc_tu AND f.ngay < b.hieu_luc_den
JOIN danh_muc t ON t.dm_id = b.to_tien_id
GROUP BY 1;
```

Không có hai cột đó thì cây được sắp lại một lần là **toàn bộ lịch sử báo cáo đổi số** —
cùng cơ chế với [case study báo cáo quá khứ tự đổi số](../case-studies/bao-cao-qua-khu-tu-doi-so.md).

## Trade-offs

| Được | Mất |
|---|---|
| Bridge: rollup đúng ở mọi cấp, không sửa DDL | Thêm một join, và **phải hiểu rủi ro đếm trùng** |
| Dẹt: BI drill-down chạy ngay, không dạy ai gì | Chết khi cây lệch — mất dữ liệu âm thầm |
| Kéo cấp cha: rẻ, tổng khớp | Nhãn cấp không còn nghĩa thật |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Dẹt cố định cho cây lệch | Báo cáo cấp lá mất 50% doanh thu — [case study](../case-studies/bao-cao-cap-3-mat-mot-nua.md) |
| Lọc `WHERE cap_3 IS NOT NULL` cho "sạch" | Chính thức hoá việc mất dữ liệu |
| `SUM` toàn bảng sau khi join bridge | Đếm trùng — 2.300 thay vì 1.000 |
| Bridge không có cột hiệu lực | Sắp lại cây một lần, lịch sử báo cáo đổi hết |
| Đệ quy không chặn vòng | Cây có vòng thì query chạy mãi |

## Related Topics

- [Bridge table](bridge-table.md) — cùng cơ chế nhân bản dòng, cho quan hệ nhiều-nhiều
- [SCD](scd.md) — khi chính cấu trúc cây thay đổi theo thời gian
- [Star, Snowflake, OBT](../reference/star-snowflake-obt.md) — dẹt cây là một dạng denormalize
- [Grain](../reference/grain.md) — join bridge làm grain kết quả đổi, phải khai lại
- [CS: báo cáo cấp 3 mất một nửa doanh thu](../case-studies/bao-cao-cap-3-mat-mot-nua.md)

## References

- Kimball Group — [Ragged/Variable Depth Hierarchies](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 7
