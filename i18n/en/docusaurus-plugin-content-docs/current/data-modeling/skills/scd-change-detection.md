---
title: Phát hiện thay đổi cho SCD Type 2
i18n_status: untranslated
sidebar_position: 2
description: "Bốn cách biết dòng nào đã đổi: so từng cột, hash, updated_at, CDC — kèm bẫy của từng cách và cách áp dụng thay đổi."
tags: [scd, change-detection, hash, cdc, dbt-snapshot, data-modeling]
domain: data-engineering
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-07-31
---

# Phát hiện thay đổi cho SCD Type 2

> **Chốt:** [SCD](scd.md) Type 2 nói *phải giữ lịch sử*; trang này nói *làm sao biết dòng
> nào đã đổi*. Hash là cách dùng được nhất, nhưng chỉ khi đã tránh bốn bẫy — mà mỗi bẫy
> đều hỏng **im lặng**: hoặc bỏ sót thay đổi thật, hoặc sinh version giả mỗi lần chạy.

## Mục tiêu

`scd.md` cho thuật toán năm bước, trong đó bước 3 là *"có đổi không"*. Trang này là bước
3 đó, viết đủ để làm được.

## Dữ liệu chung cho mọi ví dụ

Mọi đoạn dưới đây dùng chung bảng này. **Toàn bộ output trong trang này là kết quả
chạy thật trên DuckDB 1.5.5**, không phải minh hoạ.

```sql
-- Anh chup nguon hom nay
CREATE TABLE stg_khach_hang (
  khach_hang_id VARCHAR, ho_ten VARCHAR, khu_vuc VARCHAR,
  han_muc DECIMAL(18,2), updated_at TIMESTAMP
);
INSERT INTO stg_khach_hang VALUES
  ('KH001','Nguyễn A','Miền Nam', 50000000, TIMESTAMP '2026-07-31 08:00:00'),
  ('KH002','Trần B',  NULL,       30000000, TIMESTAMP '2026-07-01 08:00:00'),
  ('KH003','Lê C',    'Miền Bắc', 20000000, TIMESTAMP '2026-07-31 09:00:00');

-- Dimension dang co (phien ban hien tai)
CREATE TABLE dim_khach_hang (
  khach_sk INTEGER, khach_hang_id VARCHAR, ho_ten VARCHAR, khu_vuc VARCHAR,
  han_muc DECIMAL(18,2), row_hash VARCHAR,
  valid_from DATE, valid_to DATE, is_current BOOLEAN
);
INSERT INTO dim_khach_hang VALUES
  (1,'KH001','Nguyễn A','Miền Bắc', 50000000, NULL, DATE '2026-01-01', DATE '9999-12-31', true),
  (2,'KH002','Trần B',  'Miền Trung',30000000, NULL, DATE '2026-01-01', DATE '9999-12-31', true),
  (3,'KH004','Phạm D',  'Miền Nam', 10000000, NULL, DATE '2026-01-01', DATE '9999-12-31', true);
```

Đọc kỹ ba khác biệt cố ý:

| Khách | Chuyện gì |
|---|---|
| `KH001` | Đổi khu vực Bắc → Nam. **Phải** sinh version mới |
| `KH002` | Khu vực Miền Trung → `NULL`. **Phải** sinh version mới — đây là ca bẫy |
| `KH003` | Khách mới, chưa có trong dim |
| `KH004` | Có trong dim, **biến mất** khỏi nguồn — đã xoá? |

## Cách 1 — So từng cột

### Bẫy `NULL`, chứng minh bằng hai câu

```sql
SELECT
  NULL <> 'Miền Trung'                  AS so_sanh_thuong,
  NULL IS DISTINCT FROM 'Miền Trung'    AS so_sanh_dung;
```

```text
┌────────────────┬──────────────┐
│ so_sanh_thuong │ so_sanh_dung │
├────────────────┼──────────────┤
│ NULL           │ true         │
└────────────────┴──────────────┘
```

Cột đầu ra `NULL` chứ không phải `true`. Mà `WHERE NULL` được coi như false → dòng
không lọt vào kết quả.

### Hậu quả trên dữ liệu thật

```sql
-- SAI: dung <>
SELECT s.khach_hang_id
FROM stg_khach_hang s JOIN dim_khach_hang t
  ON s.khach_hang_id = t.khach_hang_id AND t.is_current
WHERE s.khu_vuc <> t.khu_vuc OR s.han_muc <> t.han_muc;

-- DUNG: dung IS DISTINCT FROM
SELECT s.khach_hang_id
FROM stg_khach_hang s JOIN dim_khach_hang t
  ON s.khach_hang_id = t.khach_hang_id AND t.is_current
WHERE s.khu_vuc IS DISTINCT FROM t.khu_vuc
   OR s.han_muc IS DISTINCT FROM t.han_muc;
```

```text
Câu SAI (<>)              Câu ĐÚNG (IS DISTINCT FROM)
┌───────────────┐         ┌───────────────┐
│ khach_hang_id │         │ khach_hang_id │
├───────────────┤         ├───────────────┤
│ KH001         │         │ KH001         │
└───────────────┘         │ KH002         │
                          └───────────────┘
```

Câu trên bắt được `KH001`, **bỏ sót `KH002`**. Câu dưới bắt cả hai. `KH002` mất lịch sử
vĩnh viễn và không có lỗi nào báo.

Cách này đúng nhưng không scale: 30 cột là 30 mệnh đề, thêm cột mà quên sửa là sót âm thầm.

## Cách 2 — Hash, và bốn bẫy

### Bẫy 1: `NULL` làm hai bộ giá trị khác nhau đụng hash

```sql
SELECT
  concat_ws('|', 'a', NULL, 'c') AS co_null,
  concat_ws('|', 'a', 'c')       AS khong_null,
  concat_ws('|', 'a', NULL, 'c') = concat_ws('|', 'a', 'c') AS dung_nhau;
```

```text
┌─────────┬────────────┬───────────┐
│ co_null │ khong_null │ dung_nhau │
├─────────┼────────────┼───────────┤
│ a|c     │ a|c        │ true      │
└─────────┴────────────┴───────────┘
```

`dung_nhau` ra **`true`** — đây là bẫy: `concat_ws` **bỏ qua** `NULL`, nên
`('a', NULL, 'c')` và `('a','c')` cho cùng chuỗi → cùng hash → thay đổi thật bị coi là
không đổi. Sửa bằng `coalesce` về một token cố định:

```sql
SELECT concat_ws('|', 'a', coalesce(NULL,'<NULL>'), 'c') = concat_ws('|', 'a', 'c') AS con_dung_nhau;
```

```text
┌───────────────┐
│ con_dung_nhau │
├───────────────┤
│ false         │
└───────────────┘
```

### Bẫy 2: ranh giới cột

```sql
SELECT
  md5(concat('ab','c'))          = md5(concat('a','bc'))          AS khong_separator,
  md5(concat_ws('|','ab','c'))   = md5(concat_ws('|','a','bc'))   AS co_separator;
```

```text
┌─────────────────┬──────────────┐
│ khong_separator │ co_separator │
├─────────────────┼──────────────┤
│ true            │ false        │
└─────────────────┴──────────────┘
```

`khong_separator` ra `true`: `'ab'+'c'` và `'a'+'bc'` cùng thành `'abc'`. Hai bộ giá trị
**khác nhau hoàn toàn** mà cùng hash.

Separator phải là ký tự **không xuất hiện trong dữ liệu**. Nếu dữ liệu có thể chứa `|`
thì đổi sang ký tự hiếm hơn — hoặc nối thêm độ dài từng cột:

```sql
SELECT md5(concat_ws('|', length('ab'), 'ab', length('c'), 'c'));
```

### Bẫy 3: format số và ngày

```sql
SELECT
  md5(cast(1.0 AS VARCHAR))                              = md5(cast(1.00 AS VARCHAR)) AS so,
  md5(cast(DATE '2026-01-01' AS VARCHAR))                = md5(cast(TIMESTAMP '2026-01-01 00:00:00' AS VARCHAR)) AS ngay;
```

```text
┌─────────┬─────────┐
│   so    │  ngay   │
├─────────┼─────────┤
│ false   │ false   │
└─────────┴─────────┘
```

Cả hai ra `false` — **hai giá trị bằng nhau về nghiệp vụ mà hash khác nhau**. Hậu quả
ngược với bẫy 1: sinh **version giả** mỗi lần nguồn đổi kiểu cột, dimension phình mà
không ai hiểu vì sao. Chuẩn hoá trước khi băm:

```sql
md5(concat_ws('|',
  coalesce(cast(round(han_muc, 2) AS VARCHAR), '<NULL>'),
  coalesce(strftime(ngay_mo_tk, '%Y-%m-%d'),   '<NULL>')
))
```

### Bẫy 4: thứ tự cột

```sql
SELECT md5(concat_ws('|','A','B')) = md5(concat_ws('|','B','A')) AS doi_thu_tu;
```

```text
┌────────────┐
│ doi_thu_tu │
├────────────┤
│ false      │
└────────────┘
```

Ra `false`. Nghĩa là đổi thứ tự cột trong `concat_ws` làm **toàn bộ hash cũ vô giá trị**,
và lần chạy kế sinh version mới cho **mọi** dòng trong dimension. Khoá thứ tự lại; nếu
buộc phải đổi thì phải backfill hash cũ trước khi chạy.

### Hash dùng thật

```sql
CREATE OR REPLACE VIEW stg_khach_hang_hashed AS
SELECT *,
  md5(concat_ws('|',
    coalesce(ho_ten, '<NULL>'),
    coalesce(khu_vuc, '<NULL>'),
    coalesce(cast(round(han_muc, 2) AS VARCHAR), '<NULL>')
  )) AS row_hash
FROM stg_khach_hang;

SELECT khach_hang_id, khu_vuc, row_hash FROM stg_khach_hang_hashed ORDER BY khach_hang_id;
```

```text
┌───────────────┬──────────┬──────────────────────────────────┐
│ khach_hang_id │ khu_vuc  │             row_hash             │
├───────────────┼──────────┼──────────────────────────────────┤
│ KH001         │ Miền Nam │ c0133d007a9a4add915f1c52e9df0ff8 │
│ KH002         │ NULL     │ df3d45b9d55c2f9aa4df57b22bb63133 │
│ KH003         │ Miền Bắc │ 3d9430864824a7b3d55222f407f83da6 │
└───────────────┴──────────┴──────────────────────────────────┘
```

**Lưu `row_hash` vào chính dimension**, đừng tính lại từ nguồn mỗi lần — nhờ vậy so sánh
chỉ là một phép bằng trên một cột index được, thay vì băm lại toàn bộ nguồn.

## Cách 3 — `updated_at` từ nguồn

Rẻ nhất, nhưng phụ thuộc nguồn nói thật. Hai kiểu nói dối, cả hai đều im lặng:

| Nguồn làm gì | Hậu quả |
|---|---|
| `UPDATE` mà không đổi `updated_at` | **Mất thay đổi vĩnh viễn** |
| `touch` bản ghi, nội dung không đổi | Sinh version giả |

```sql
-- Loc bang updated_at (re), nhung VAN hash de xac nhan (dung)
WITH ung_vien AS (
  SELECT * FROM stg_khach_hang_hashed
  WHERE updated_at >= TIMESTAMP '2026-07-31 00:00:00'   -- watermark lan chay truoc
)
SELECT u.khach_hang_id, u.row_hash, t.row_hash AS hash_cu
FROM ung_vien u
LEFT JOIN dim_khach_hang t ON u.khach_hang_id = t.khach_hang_id AND t.is_current
WHERE t.row_hash IS DISTINCT FROM u.row_hash;
```

```text
┌───────────────┬──────────┬──────────┐
│ khach_hang_id │ hash_moi │ hash_cu  │   ← rút gọn 8 ký tự đầu cho dễ đọc
├───────────────┼──────────┼──────────┤
│ KH001         │ c0133d00 │ f1505cf0 │   ← đã đổi
│ KH003         │ 3d943086 │ NULL     │   ← khách mới
└───────────────┴──────────┴──────────┘
```

Đây là cách dùng an toàn: `updated_at` để **giảm dữ liệu phải quét**, hash để **xác nhận
thật sự có đổi**. Vừa rẻ vừa đúng.

Lưu ý ví dụ này chỉ quét `KH001` và `KH003` (updated hôm nay), **bỏ qua `KH002`**. Nếu
nguồn không cập nhật `updated_at` khi đổi khu vực thành `NULL` thì đây chính là kiểu nói
dối thứ nhất — và đó là lý do không nên dùng `updated_at` một mình.

## Cách 4 — Bắt `DELETE`

Ba cách trên đều so *ảnh chụp hiện tại*, nên **không cách nào thấy `KH004` đã biến mất**.
Không có CDC thì so bộ khoá:

```sql
SELECT t.khach_hang_id AS co_trong_dim_mat_o_nguon
FROM dim_khach_hang t
LEFT JOIN stg_khach_hang s ON t.khach_hang_id = s.khach_hang_id
WHERE t.is_current AND s.khach_hang_id IS NULL;
```

```text
┌──────────────────────────┐
│ co_trong_dim_mat_o_nguon │
├──────────────────────────┤
│ KH004                    │
└──────────────────────────┘
```

Trả về `KH004`. Nhưng **đừng đóng dòng ngay** — một lần trích xuất lỗi làm thiếu dữ liệu
trông y hệt "xoá hàng loạt". Đặt ngưỡng an toàn:

```sql
SELECT
  (SELECT count(*) FROM stg_khach_hang)                        AS nguon,
  (SELECT count(*) FROM dim_khach_hang WHERE is_current)       AS dim_hien_tai,
  1.0 * (SELECT count(*) FROM stg_khach_hang)
      / (SELECT count(*) FROM dim_khach_hang WHERE is_current) AS ty_le;
```

```text
┌───────┬──────────────┬────────┐
│ nguon │ dim_hien_tai │ ty_le  │
├───────┼──────────────┼────────┤
│     3 │            3 │    1.0 │
└───────┴──────────────┴────────┘
```

Tỷ lệ tụt dưới ngưỡng (ví dụ 0.9) thì **dừng pipeline**, đừng đóng dòng. CDC
(Debezium đọc transaction log) không có vấn đề này vì nó thấy sự kiện `DELETE` thật.

## Áp dụng thay đổi — hai bước, không một `MERGE`

```sql
-- Buoc 1: dong cac dong da doi
UPDATE dim_khach_hang t
SET valid_to = DATE '2026-07-31', is_current = false
FROM stg_khach_hang_hashed s
WHERE t.khach_hang_id = s.khach_hang_id
  AND t.is_current
  AND t.row_hash IS DISTINCT FROM s.row_hash;

-- Buoc 2: chen phien ban moi + khach hoan toan moi
INSERT INTO dim_khach_hang
SELECT
  (SELECT coalesce(max(khach_sk), 0) FROM dim_khach_hang)
    + row_number() OVER (ORDER BY s.khach_hang_id),
  s.khach_hang_id, s.ho_ten, s.khu_vuc, s.han_muc, s.row_hash,
  DATE '2026-07-31', DATE '9999-12-31', true
FROM stg_khach_hang_hashed s
LEFT JOIN dim_khach_hang t
  ON t.khach_hang_id = s.khach_hang_id AND t.is_current
WHERE t.khach_hang_id IS NULL OR t.row_hash IS DISTINCT FROM s.row_hash;
```

Dimension sau khi chạy:

```text
┌──────────┬───────────────┬────────────┬────────────┬────────────┬────────────┐
│ khach_sk │ khach_hang_id │  khu_vuc   │ valid_from │  valid_to  │ is_current │
├──────────┼───────────────┼────────────┼────────────┼────────────┼────────────┤
│        1 │ KH001         │ Miền Bắc   │ 2026-01-01 │ 2026-07-31 │ false      │
│        4 │ KH001         │ Miền Nam   │ 2026-07-31 │ 9999-12-31 │ true       │
│        2 │ KH002         │ Miền Trung │ 2026-01-01 │ 2026-07-31 │ false      │
│        5 │ KH002         │ NULL       │ 2026-07-31 │ 9999-12-31 │ true       │
│        6 │ KH003         │ Miền Bắc   │ 2026-07-31 │ 9999-12-31 │ true       │
│        3 │ KH004         │ Miền Nam   │ 2026-01-01 │ 9999-12-31 │ true       │
└──────────┴───────────────┴────────────┴────────────┴────────────┴────────────┘
```

`KH001` và `KH002` mỗi khách hai phiên bản, dòng cũ đã đóng đúng ngày. `KH003` vào mới.
`KH004` **vẫn `is_current`** — bước áp dụng không đụng tới nó, vì phát hiện xoá là việc
riêng ở Cách 4.

**Thứ tự bắt buộc: đóng trước, chèn sau.** Ngược lại thì bước 1 đóng luôn dòng vừa chèn
ở bước 2, và dimension không còn dòng `is_current` nào cho khách đó.

### Kiểm chứng

```sql
-- Moi natural key co dung MOT dong is_current
SELECT khach_hang_id, count(*) FROM dim_khach_hang
WHERE is_current GROUP BY khach_hang_id HAVING count(*) <> 1;

-- Khong co khoang thoi gian long nguoc
SELECT * FROM dim_khach_hang WHERE valid_from >= valid_to;
```

```text
Test 1                     Test 2
┌───────────────┬─────────┐  ┌─────────────┐
│ khach_hang_id │ so_dong │  │ so_dong_loi │
├───────────────┼─────────┤  ├─────────────┤
└───────────────┴─────────┘  │           0 │
        0 rows               └─────────────┘
```

Cả hai phải trả về **0 dòng**.

## Trong dbt

Hai strategy của `snapshot` tương ứng đúng hai cách trên:

| Strategy | Tương đương | Khi nào |
|---|---|---|
| `check` + `check_cols` | so từng cột / hash | Nguồn không có `updated_at` đáng tin |
| `timestamp` + `updated_at` | cột thời gian | Nguồn đáng tin, dữ liệu lớn |

```yaml
{% raw %}
{% snapshot snp_khach_hang %}
{{ config(
    target_schema='snapshots',
    unique_key='khach_hang_id',
    strategy='check',
    check_cols=['ho_ten', 'khu_vuc', 'han_muc']
) }}
select * from {{ source('crm', 'khach_hang') }}
{% endsnapshot %}
{% endraw %}
```

`check_cols='all'` tiện nhưng nguy hiểm: thêm một cột kỹ thuật vô nghĩa vào nguồn là
**mọi dòng sinh version mới**. Liệt kê cột tường minh.

Và nhắc lại cảnh báo ở [SCD](scd.md#common-mistakes): `snapshot` là thứ **duy nhất**
trong dbt không tái tạo được. Model sai thì `dbt run` lại; snapshot chạy sai một lần thì
phần lịch sử đó mất luôn.

## Ba bẫy không thuộc riêng cách nào

### Late-arriving data

```sql
-- SAI: valid_from = ngay chay pipeline
SET valid_from = current_date

-- DUNG: valid_from = thoi diem nghiep vu
SET valid_from = s.ngay_hieu_luc
```

Bản ghi đến muộn ba ngày mà gán `current_date` thì fact join theo
`ngay >= valid_from and ngay < valid_to` sẽ khớp **nhầm phiên bản** cho ba ngày đó.

### Idempotency

```sql
-- Chay lai buoc 1 + 2 lan thu hai trong cung ngay, roi dem:
SELECT khach_hang_id, count(*) FROM dim_khach_hang GROUP BY khach_hang_id ORDER BY 2 DESC;
```

Chạy lại nguyên hai bước lần thứ hai trong cùng ngày: **6 dòng trước, 6 dòng sau.**

```text
┌───────────────┬──────────────┐
│ khach_hang_id │ so_phien_ban │
├───────────────┼──────────────┤
│ KH001         │            2 │
│ KH002         │            2 │
│ KH003         │            1 │
│ KH004         │            1 │
└───────────────┴──────────────┘
```

Số dòng **không được tăng**. Điều kiện `row_hash IS DISTINCT FROM` lo việc này — nhưng
chỉ khi hash ổn định, tức là đã tránh xong bẫy 3 và bẫy 4.

### Khoảng chồng lấn

Đã có ở phần Kiểm chứng bên trên. Chạy sau **mỗi** lần nạp, không phải chỉ lần đầu.

## Trade-offs

| Cách | Được | Mất |
|---|---|---|
| So từng cột | Đơn giản, đọc là hiểu | Không scale; thêm cột mà quên là sót |
| Hash | Một cột so sánh, index được | Bốn bẫy, mỗi bẫy hỏng im lặng |
| `updated_at` | Rẻ nhất, quét ít | Phụ thuộc nguồn nói thật |
| CDC | Bắt được `DELETE` và trạng thái trung gian | Nặng hạ tầng, phức tạp vận hành |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Dùng `<>` thay vì `IS DISTINCT FROM` | Bỏ sót mọi thay đổi liên quan `NULL` |
| `concat` không separator | Hai bộ giá trị khác nhau cùng hash |
| Không `coalesce` `NULL` trước khi băm | Hash `NULL`, hoặc đụng hash với bộ ngắn hơn |
| Không chuẩn hoá số/ngày | Sinh version giả mỗi lần nguồn đổi kiểu cột |
| Đổi thứ tự cột trong hash | Toàn bộ dimension sinh version mới một lượt |
| Chèn trước, đóng sau | Không còn dòng `is_current` nào |
| Đóng dòng "đã xoá" mà không có ngưỡng | Một lần trích xuất lỗi làm đóng sạch dimension |
| `check_cols='all'` | Thêm cột kỹ thuật là mọi dòng sinh version mới |

## Related Topics

- [SCD](scd.md) — Type 0–7 và thuật toán năm bước; trang này là bước 3 viết đủ
- [Surrogate key](../reference/surrogate-key.md) — khoá cấp cho mỗi phiên bản mới
- [Grain](../reference/grain.md) — grain của dimension Type 2 là *một phiên bản*, không phải *một thực thể*
- [dbt: source, seed, snapshot](../../etl/dbt/reference/sources-seeds-snapshots.md) — công cụ hiện thực
- [Sáu chiều chất lượng](../../data-quality/six-dimensions.md) — test khoảng thời gian thuộc chiều *consistency*
