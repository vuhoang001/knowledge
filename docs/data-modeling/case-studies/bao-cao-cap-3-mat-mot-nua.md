---
title: Báo cáo theo danh mục cấp 3 chỉ thấy một nửa doanh thu
sidebar_position: 10
description: "Cây danh mục sâu 1–3 cấp bị dẹt thành ba cột cố định; sản phẩm gắn ở cấp 1 và 2 rơi vào ô NULL rồi bị lọc mất."
tags: [case-study, hierarchy, ragged-hierarchy, bridge-table, data-modeling]
domain: data-engineering
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Báo cáo theo danh mục cấp 3 chỉ thấy một nửa doanh thu

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. Mọi con số bên dưới chạy thật
> trên DuckDB.

> **Chốt:** cây có độ sâu không đều mà dẹt thành cột cố định thì các nhánh nông rơi vào
> `NULL`. `NULL` bị BI lọc mặc định, và dữ liệu **biến mất không tiếng động**. Xem
> [cây phân cấp](../skills/hierarchy.md).

## Bối cảnh

Cây danh mục sản phẩm của một cửa hàng bán lẻ. Ngành hàng lâu năm được chia sâu; ngành
hàng mới thì chưa ai chia.

```text
Dien tu (cap 1)
├── Dien thoai (cap 2)
│   └── Smartphone (cap 3)     ← SP-01, doanh thu 500
└── Phu kien (cap 2)           ← SP-02, doanh thu 300
Thoi trang (cap 1)             ← SP-03, doanh thu 200
```

```sql
CREATE TABLE danh_muc AS
SELECT * FROM (VALUES
  (1, 'Dien tu', NULL), (2, 'Dien thoai', 1), (3, 'Smartphone', 2),
  (4, 'Phu kien', 1),   (5, 'Thoi trang', NULL)
) t(dm_id, ten, cha_id);

CREATE TABLE fct_ban AS
SELECT * FROM (VALUES ('SP-01', 3, 500), ('SP-02', 4, 300), ('SP-03', 5, 200))
  t(san_pham, dm_id, doanh_thu);
```

Tổng thật: **1.000**.

Dimension được dẹt thành ba cột — cách chuẩn cho cây phân cấp, và là cách duy nhất công cụ
BI drill-down hiểu được:

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

## Triệu chứng

Báo cáo *"doanh thu theo danh mục cấp 3"* hiển thị đúng **một dòng**: Smartphone 500.

Ban đầu không ai thắc mắc — nhìn thì có vẻ công ty chỉ bán smartphone ở cấp chi tiết
nhất. Vấn đề lộ ra khi ai đó so tổng của báo cáo này với tổng doanh thu công ty.

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

**Một nửa doanh thu không có mặt trong báo cáo.**

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Sản phẩm chưa được gán danh mục | Kiểm: mọi sản phẩm đều có `dm_id` hợp lệ |
| `JOIN` loại dòng vì khoá mồ côi | `LEFT JOIN` cho cùng kết quả — không mất dòng ở join |
| Fact thiếu dữ liệu | `sum(doanh_thu)` trên fact = 1.000, đủ |
| BI cấu hình sai bộ lọc | **Gần đúng** — BI lọc `NULL`, nhưng `NULL` từ đâu ra mới là câu hỏi |

Chỗ mất thời gian: ai cũng đi tìm **dòng bị mất**. Không dòng nào mất cả — cả 3 dòng fact
đều tham gia join. Cái mất là **nhãn**: hai trong ba dòng không có giá trị ở cột dùng để
`GROUP BY`.

Câu hỏi tách bạch: *"đếm số dòng sau join có bằng số dòng fact không?"* Bằng. Vậy vấn đề
không nằm ở join, mà ở cột được nhóm theo.

## Nguyên nhân thật

Cây **ragged** (độ sâu 1–3) bị mô hình hoá bằng cấu trúc **fixed depth** (đúng 3 cấp).

Sản phẩm gắn ở node cấp 2 (`Phu kien`) hay cấp 1 (`Thoi trang`) không có giá trị `cap_3`.
Chúng nhận `NULL`, và:

- BI mặc định ẩn nhóm `NULL`, hoặc
- người viết query thêm `WHERE cap_3 IS NOT NULL` cho "sạch báo cáo".

Cả hai đường đều dẫn tới cùng kết quả: dữ liệu bị loại một cách hợp lệ về mặt SQL, và
không có gì báo.

Điểm cốt lõi: **`NULL` ở đây không có nghĩa "thiếu dữ liệu"**, nó có nghĩa "nhánh này chỉ
sâu tới đó". Hai nghĩa hoàn toàn khác nhau bị nhét vào cùng một giá trị.

## Vì sao không test nào bắt được

| Test | Kết quả |
|---|---|
| `not_null` trên `dm_id` của fact | ✅ xanh |
| `relationships` fact → dim danh mục | ✅ xanh |
| `not_null` trên `cap_1` | ✅ xanh |
| `not_null` trên `cap_3` | ❌ — nên **không ai đặt test này**, vì `NULL` là hợp lệ |
| Tổng fact khớp nguồn | ✅ xanh |

Dòng thứ tư là mấu chốt. Ai cũng biết `cap_3` được phép `NULL`, nên không có test nào ở
đó. Và vì `NULL` hợp lệ, không có ngưỡng nào để báo động khi tỷ lệ `NULL` là 50%.

Test đúng phải hỏi ở tầng khác: *"tổng của báo cáo phân nhóm có bằng tổng của fact
không?"*

## Cách sửa

Hai đường, tuỳ cây lệch tới đâu.

### Nếu cây chỉ hơi lệch — kéo cấp cha xuống

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

Tổng khớp 1.000, BI chạy nguyên như cũ. Cái mất: cột `cap_3` giờ chứa cả node không phải
cấp 3 thật, nên *"có bao nhiêu danh mục cấp 3"* không còn hỏi được từ bảng này.

### Nếu cây sâu tuỳ ý — bridge đường đi

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

Rollup đúng cho **mọi node**, ở mọi độ sâu. `Dien tu` = 800 = 500 (cách 2 cấp) + 300
(cách 1 cấp).

Đổi lại phải nhớ: bảng bridge **cố tình nhân bản dòng**, nên `SUM` toàn bảng ra 2.300.
Muốn tổng đúng thì lọc về một mức:

```sql
SELECT sum(f.doanh_thu) AS tong_qua_bridge
FROM fct_ban f
JOIN bridge_dm b ON b.con_id = f.dm_id
JOIN danh_muc t  ON t.dm_id  = b.to_tien_id
WHERE t.cha_id IS NULL;
```

```text
┌─────────────────┐
│ tong_qua_bridge │
├─────────────────┤
│            1000 │
└─────────────────┘
```

| | Dẹt cố định | Kéo cấp cha | Bridge |
|---|---|---|---|
| Doanh thu báo cáo cấp lá | 500 (**mất 50%**) | 1.000 | 1.000 |
| Thêm một cấp mới | Sửa DDL + mọi báo cáo | Sửa DDL | Không sửa gì |
| Rủi ro đếm trùng | Không | Không | **Có** |

## Dấu hiệu nhận ra sớm

1. Đo tỷ lệ `NULL` ở cấp sâu nhất — con số này đáng đặt thành test `severity: warn`:

```sql
SELECT count(*)                                  AS tong,
       count(*) FILTER (WHERE cap_3 IS NULL)     AS thieu_cap_3,
       round(100.0 * count(*) FILTER (WHERE cap_3 IS NULL) / count(*), 1) AS pct
FROM dim_dm_det;
```

2. Đối chiếu tổng của báo cáo phân nhóm với tổng của fact. Lệch = có nhóm bị lọc mất.

3. Hỏi nghiệp vụ: *"cây này có nhánh nào nông hơn nhánh khác không?"* Có = đừng dẹt cố
   định.

4. Trong codebase xuất hiện `WHERE cap_N IS NOT NULL` — đó là chỗ mất dữ liệu được viết
   thành code.

## Related Topics

- [Cây phân cấp](../skills/hierarchy.md) — ba loại cây và cách dựng từng loại
- [Bridge table](../skills/bridge-table.md) — cùng cơ chế nhân bản dòng
- [Grain](../reference/grain.md) — join bridge làm grain kết quả đổi
- [CS: một nửa số đơn biến mất](don-dang-giao-bien-mat.md) — cũng là dữ liệu mất âm thầm, khác cơ chế
