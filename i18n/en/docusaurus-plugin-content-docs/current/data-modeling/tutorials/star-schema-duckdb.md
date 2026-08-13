---
title: Dựng một star schema từ đầu bằng DuckDB
i18n_status: untranslated
sidebar_position: 1
description: "Đi hết bốn bước thiết kế của Kimball trên dữ liệu thật: dim_ngay, dimension Type 2, transaction fact, accumulating snapshot, rồi drill-across — có output dán lại được."
tags: [tutorial, star-schema, duckdb, kimball, data-modeling]
domain: data-engineering
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Dựng một star schema từ đầu bằng DuckDB

> **Chốt:** đọc mười file lý thuyết không bằng dựng một mô hình chạy được rồi tự tay phá
> nó. Bài này đi từ ba bảng nguồn thô tới một star schema kiểm chứng được, trong khoảng
> 20 phút, không cần cài gì ngoài DuckDB.

## Chuẩn bị

Lab nằm **ngoài repo** này (xem `CLAUDE.md`). Chạy bằng venv sẵn có:

```bash
~/Documents/learn-lab/dbt/.venv/bin/python -c "import duckdb; print(duckdb.__version__)"
```

```text
1.5.5
```

Mọi câu SQL bên dưới chạy được nguyên trạng trong một session DuckDB in-memory. Cách
nhanh nhất là dán từng khối vào một file `.py` với `duckdb.connect()`, hoặc mở DuckDB CLI
rồi dán thẳng.

**Ô *Kết quả của bạn* để trống là chưa chạy.** Chạy rồi thì dán output vào, và chỉ khi đó
mới điền `verified_at` ở đầu file.

## Bài toán

Một cửa hàng online. Nghiệp vụ đặt ba câu hỏi:

1. Doanh thu theo khu vực khách hàng — **theo khu vực lúc mua**, không phải lúc này.
2. Đơn hàng đang kẹt ở khâu nào, trung bình bao lâu thì tới tay khách.
3. Tỷ lệ trả hàng theo khu vực.

Ba câu, ba hình dạng bảng khác nhau. Đó là lý do bài này không dừng ở một fact.

## Bước 0 — dữ liệu nguồn

Ba bảng, đúng như hệ nguồn hay có: một bảng header đơn, một bảng dòng đơn, một bảng khách
hàng đã có sẵn lịch sử thay đổi.

```sql
CREATE TABLE src_don AS
SELECT * FROM (VALUES
  ('DH-001', 'C1', DATE '2026-01-10', DATE '2026-01-12', DATE '2026-01-15', 'hoan_thanh', 'web'),
  ('DH-002', 'C1', DATE '2026-02-05', DATE '2026-02-06', NULL,              'dang_giao',  'app'),
  ('DH-003', 'C2', DATE '2026-01-20', NULL,              NULL,              'moi',        'web'),
  ('DH-004', 'C3', DATE '2026-02-18', DATE '2026-02-19', DATE '2026-02-25', 'hoan_thanh', 'app')
) t(so_don, khach_id, ngay_dat, ngay_giao, ngay_nhan, trang_thai, kenh);

CREATE TABLE src_dong_don AS
SELECT * FROM (VALUES
  ('DH-001', 1, 'SP-A', 2, 150000),
  ('DH-001', 2, 'SP-B', 1, 300000),
  ('DH-002', 1, 'SP-A', 3, 150000),
  ('DH-003', 1, 'SP-C', 1, 900000),
  ('DH-004', 1, 'SP-B', 2, 300000),
  ('DH-004', 2, 'SP-C', 1, 900000)
) t(so_don, dong_so, san_pham_id, so_luong, don_gia);

-- C1 chuyen tu Mien Bac sang Mien Nam tu 01/02/2026
CREATE TABLE src_khach AS
SELECT * FROM (VALUES
  ('C1', 'Nguyen A', 'Mien Bac',   DATE '2025-01-01', DATE '2026-02-01'),
  ('C1', 'Nguyen A', 'Mien Nam',   DATE '2026-02-01', DATE '9999-12-31'),
  ('C2', 'Tran B',   'Mien Nam',   DATE '2025-01-01', DATE '9999-12-31'),
  ('C3', 'Le C',     'Mien Trung', DATE '2025-06-01', DATE '9999-12-31')
) t(khach_id, ho_ten, khu_vuc, hieu_luc_tu, hieu_luc_den);
```

Ghi lại con số nguồn **trước khi bắt đầu** — đây là mốc đối chiếu cho mọi bước sau:

```sql
SELECT (SELECT count(*) FROM src_don)                    AS don,
       (SELECT count(*) FROM src_dong_don)               AS dong_don,
       (SELECT sum(so_luong * don_gia) FROM src_dong_don) AS doanh_thu_nguon;
```

```text
┌───────┬──────────┬─────────────────┐
│  don  │ dong_don │ doanh_thu_nguon │
├───────┼──────────┼─────────────────┤
│     4 │        6 │         3450000 │
└───────┴──────────┴─────────────────┘
```

| Kết quả của bạn |
|---|
| |

## Bốn bước thiết kế trước khi gõ DDL

Theo [quy trình thiết kế 4 bước](../reference/design-process.md), làm xong bảng này rồi
mới viết `CREATE TABLE`:

| Bước | Quyết định |
|---|---|
| 1. Quy trình nghiệp vụ | **Bán hàng** (không phải "báo cáo doanh thu" — báo cáo là đầu ra, không phải quy trình) |
| 2. Grain | **Một dòng của một đơn hàng** — mịn nhất mà nguồn cho phép |
| 3. Dimension | Ngày (đóng nhiều vai), Khách hàng (Type 2 — nghiệp vụ hỏi "lúc mua"), Sản phẩm, Kênh |
| 4. Fact | `so_luong`, `don_gia`, `thanh_tien` — cả ba additive |

Câu hỏi 2 (đơn kẹt ở khâu nào) có **grain khác**: một dòng một *đơn*, không phải một
*dòng đơn*. Grain khác nghĩa là fact khác — đó là bước 5.

## Bước 1 — dim_ngay

```sql
CREATE TABLE dim_ngay AS
WITH lich AS (
  SELECT (DATE '2026-01-01' + INTERVAL (i) DAY)::DATE AS ngay FROM range(0, 365) t(i)
)
SELECT CAST(strftime(ngay, '%Y%m%d') AS INTEGER)                 AS ngay_key,
       ngay,
       strftime(ngay, '%d/%m/%Y')                                AS ngay_hien_thi,
       ['CN','T2','T3','T4','T5','T6','T7'][dayofweek(ngay) + 1] AS thu_ten,
       month(ngay)                                               AS thang,
       'Thang ' || month(ngay) || '/' || year(ngay)               AS thang_ten,
       quarter(ngay)                                             AS quy,
       dayofweek(ngay) NOT IN (0, 6)                             AS la_ngay_lam_viec
FROM lich
UNION ALL
SELECT -1, NULL, 'Chua xay ra', NULL, NULL, 'Chua xay ra', NULL, NULL;
```

Dòng `UNION ALL` cuối là thứ hay bị quên: khoá `-1` cho mốc **chưa xảy ra**. Đơn `DH-003`
chưa giao, và nếu để `NULL` thì `JOIN` sẽ ném cả đơn đó ra khỏi báo cáo.

```sql
SELECT ngay_key, ngay_hien_thi, thu_ten, thang_ten, la_ngay_lam_viec
FROM dim_ngay WHERE ngay_key IN (-1, 20260110, 20260215) ORDER BY ngay_key;
```

```text
┌──────────┬───────────────┬─────────┬──────────────┬──────────────────┐
│ ngay_key │ ngay_hien_thi │ thu_ten │  thang_ten   │ la_ngay_lam_viec │
├──────────┼───────────────┼─────────┼──────────────┼──────────────────┤
│       -1 │ Chua xay ra   │ NULL    │ Chua xay ra  │ NULL             │
│ 20260110 │ 10/01/2026    │ T7      │ Thang 1/2026 │ false            │
│ 20260215 │ 15/02/2026    │ CN      │ Thang 2/2026 │ false            │
└──────────┴───────────────┴─────────┴──────────────┴──────────────────┘
```

| Kết quả của bạn |
|---|
| |

Chi tiết vì sao lịch phải là bảng: [Date dimension](../reference/date-dimension.md).

## Bước 2 — dim_khach Type 2

```sql
CREATE TABLE dim_khach AS
SELECT row_number() OVER (ORDER BY khach_id, hieu_luc_tu) AS khach_sk,
       khach_id, ho_ten, khu_vuc, hieu_luc_tu, hieu_luc_den,
       hieu_luc_den = DATE '9999-12-31' AS la_hien_tai
FROM src_khach
UNION ALL
SELECT 0, '(chua biet)', '(chua biet)', '(chua biet)',
       DATE '1900-01-01', DATE '9999-12-31', true;
```

```text
┌──────────┬─────────────┬─────────────┬─────────────┬──────────────┬─────────────┐
│ khach_sk │  khach_id   │   khu_vuc   │ hieu_luc_tu │ hieu_luc_den │ la_hien_tai │
├──────────┼─────────────┼─────────────┼─────────────┼──────────────┼─────────────┤
│        0 │ (chua biet) │ (chua biet) │ 1900-01-01  │ 9999-12-31   │ true        │
│        1 │ C1          │ Mien Bac    │ 2025-01-01  │ 2026-02-01   │ false       │
│        2 │ C1          │ Mien Nam    │ 2026-02-01  │ 9999-12-31   │ true        │
│        3 │ C2          │ Mien Nam    │ 2025-01-01  │ 9999-12-31   │ true        │
│        4 │ C3          │ Mien Trung  │ 2025-06-01  │ 9999-12-31   │ true        │
└──────────┴─────────────┴─────────────┴─────────────┴──────────────┴─────────────┘
```

| Kết quả của bạn |
|---|
| |

Hai chi tiết đáng nhớ:

- `C1` có **hai dòng** — cùng một khách, hai phiên bản. Grain của dimension Type 2 là
  *một phiên bản*, không phải *một khách*. Xem [SCD](../skills/scd.md).
- Dòng `khach_sk = 0` là chỗ trú cho khoá không khớp
  ([inferred member](../skills/late-arriving.md)) — nhờ nó, fact không bao giờ cần khoá
  `NULL`.

## Bước 3 — fact giao dịch

Chỗ quyết định nằm ở điều kiện join: **hiệu lực tại ngày đặt hàng**, không phải
`la_hien_tai`.

```sql
CREATE TABLE fct_ban AS
SELECT d.so_don,                                              -- degenerate dimension
       dd.dong_so,
       CAST(strftime(d.ngay_dat, '%Y%m%d') AS INTEGER)        AS ngay_dat_key,
       coalesce(k.khach_sk, 0)                                AS khach_sk,
       dd.san_pham_id,
       d.kenh,
       dd.so_luong,
       dd.don_gia,
       dd.so_luong * dd.don_gia                               AS thanh_tien
FROM src_don d
JOIN src_dong_don dd USING (so_don)
LEFT JOIN dim_khach k
  ON k.khach_id = d.khach_id
 AND d.ngay_dat >= k.hieu_luc_tu AND d.ngay_dat < k.hieu_luc_den;
```

```text
┌─────────┬─────────┬──────────────┬──────────┬─────────────┬──────────┬────────────┐
│ so_don  │ dong_so │ ngay_dat_key │ khach_sk │ san_pham_id │ so_luong │ thanh_tien │
├─────────┼─────────┼──────────────┼──────────┼─────────────┼──────────┼────────────┤
│ DH-001  │       1 │     20260110 │        1 │ SP-A        │        2 │     300000 │
│ DH-001  │       2 │     20260110 │        1 │ SP-B        │        1 │     300000 │
│ DH-002  │       1 │     20260205 │        2 │ SP-A        │        3 │     450000 │
│ DH-003  │       1 │     20260120 │        3 │ SP-C        │        1 │     900000 │
│ DH-004  │       1 │     20260218 │        4 │ SP-B        │        2 │     600000 │
│ DH-004  │       2 │     20260218 │        4 │ SP-C        │        1 │     900000 │
└─────────┴─────────┴──────────────┴──────────┴─────────────┴──────────┴────────────┘
```

| Kết quả của bạn |
|---|
| |

Để ý `DH-001` mang `khach_sk = 1` (Miền Bắc) còn `DH-002` mang `khach_sk = 2` (Miền Nam)
— **cùng một khách `C1`**. Đó là as-was đang hoạt động.

Và `so_don` ở lại trong fact như một cột thường, không có `dim_don_hang`:
[degenerate dimension](../skills/degenerate-dimension.md).

## Bước 4 — bốn phép kiểm bắt buộc

Đây là phần hay bị bỏ, và cũng là phần đáng giữ lại nhất. Chạy sau **mỗi lần** dựng lại
mô hình.

### 4.1 Grain có thật sự duy nhất không

```sql
SELECT count(*) AS so_dong,
       count(DISTINCT (so_don, dong_so)) AS so_khoa_phan_biet,
       count(*) = count(DISTINCT (so_don, dong_so)) AS grain_dung
FROM fct_ban;
```

```text
┌─────────┬───────────────────┬────────────┐
│ so_dong │ so_khoa_phan_biet │ grain_dung │
├─────────┼───────────────────┼────────────┤
│       6 │                 6 │ true       │
└─────────┴───────────────────┴────────────┘
```

`grain_dung = false` nghĩa là có join nào đó đã nhân bản dòng — dừng lại, đừng đi tiếp.

### 4.2 Tổng có khớp nguồn không

```sql
SELECT (SELECT sum(thanh_tien) FROM fct_ban)              AS tong_fact,
       (SELECT sum(so_luong * don_gia) FROM src_dong_don) AS tong_nguon,
       (SELECT sum(thanh_tien) FROM fct_ban)
     - (SELECT sum(so_luong * don_gia) FROM src_dong_don) AS chenh;
```

```text
┌───────────┬────────────┬────────┐
│ tong_fact │ tong_nguon │ chenh  │
├───────────┼────────────┼────────┤
│   3450000 │    3450000 │      0 │
└───────────┴────────────┴────────┘
```

### 4.3 Có khoá mồ côi không

```sql
SELECT count(*) FILTER (WHERE khach_sk = 0)      AS khoa_khong_khop,
       count(*) FILTER (WHERE d.ngay_key IS NULL) AS ngay_khong_khop
FROM fct_ban f LEFT JOIN dim_ngay d ON d.ngay_key = f.ngay_dat_key;
```

```text
┌─────────────────┬─────────────────┐
│ khoa_khong_khop │ ngay_khong_khop │
├─────────────────┼─────────────────┤
│               0 │               0 │
└─────────────────┴─────────────────┘
```

### 4.4 As-was có đúng không

```sql
SELECT f.so_don, k.khach_id, k.khu_vuc, sum(f.thanh_tien) AS thanh_tien
FROM fct_ban f JOIN dim_khach k USING (khach_sk)
WHERE k.khach_id = 'C1'
GROUP BY 1,2,3 ORDER BY 1;
```

```text
┌─────────┬──────────┬──────────┬────────────┐
│ so_don  │ khach_id │ khu_vuc  │ thanh_tien │
├─────────┼──────────┼──────────┼────────────┤
│ DH-001  │ C1       │ Mien Bac │     600000 │
│ DH-002  │ C1       │ Mien Nam │     450000 │
└─────────┴──────────┴──────────┴────────────┘
```

| Kết quả của bạn (4.1 → 4.4) |
|---|
| |

**Bài tập phá mô hình:** đổi điều kiện join ở bước 3 thành `AND k.la_hien_tai`, dựng lại,
rồi chạy 4.4. Cả hai đơn sẽ về Miền Nam — 1.050.000 gán sai khu vực, mà 4.1, 4.2, 4.3 vẫn
xanh hết. Đó chính là [case study fact về muộn](../case-studies/fact-den-muon-gan-sai-khu-vuc.md).

## Bước 5 — accumulating snapshot cho câu hỏi thứ hai

Câu *"đơn kẹt ở khâu nào"* không trả lời được từ `fct_ban`, vì grain ở đó là **dòng đơn**.
Cần một fact thứ hai, grain **một đơn**, có các mốc thời gian và các *lag fact*.

```sql
CREATE TABLE fct_don_vong_doi AS
SELECT d.so_don,
       CAST(strftime(d.ngay_dat, '%Y%m%d') AS INTEGER)                AS ngay_dat_key,
       coalesce(CAST(strftime(d.ngay_giao, '%Y%m%d') AS INTEGER), -1) AS ngay_giao_key,
       coalesce(CAST(strftime(d.ngay_nhan, '%Y%m%d') AS INTEGER), -1) AS ngay_nhan_key,
       coalesce(k.khach_sk, 0)                                        AS khach_sk,
       date_diff('day', d.ngay_dat, d.ngay_giao)                      AS ngay_cho_giao,
       date_diff('day', d.ngay_giao, d.ngay_nhan)                     AS ngay_van_chuyen,
       date_diff('day', d.ngay_dat, d.ngay_nhan)                      AS tong_thoi_gian,
       (SELECT sum(so_luong * don_gia) FROM src_dong_don x
        WHERE x.so_don = d.so_don)                                    AS gia_tri_don
FROM src_don d
LEFT JOIN dim_khach k
  ON k.khach_id = d.khach_id
 AND d.ngay_dat >= k.hieu_luc_tu AND d.ngay_dat < k.hieu_luc_den;
```

```text
┌─────────┬──────────────┬───────────────┬───────────────┬──────────┬────────────┬───────┐
│ so_don  │ ngay_dat_key │ ngay_giao_key │ ngay_nhan_key │ cho_giao │ van_chuyen │ tong  │
├─────────┼──────────────┼───────────────┼───────────────┼──────────┼────────────┼───────┤
│ DH-001  │     20260110 │      20260112 │      20260115 │        2 │          3 │     5 │
│ DH-002  │     20260205 │      20260206 │            -1 │        1 │       NULL │  NULL │
│ DH-003  │     20260120 │            -1 │            -1 │     NULL │       NULL │  NULL │
│ DH-004  │     20260218 │      20260219 │      20260225 │        1 │          6 │     7 │
└─────────┴──────────────┴───────────────┴───────────────┴──────────┴────────────┴───────┘
```

Ba đặc điểm khiến bảng này khác hẳn transaction fact:

- **Dòng bị `UPDATE`**, không chỉ `INSERT`. Đơn giao xong thì dòng cũ được cập nhật.
- Mốc chưa xảy ra mang khoá `-1` chứ không `NULL` — nhờ dòng đã thêm ở bước 1.
- `ngay_cho_giao`, `ngay_van_chuyen` là **lag fact**: khoảng cách giữa hai mốc, tính sẵn
  lúc nạp để không ai phải tự trừ ngày trong BI.

Phiếu đo quy trình, thứ mà nghiệp vụ thật sự cần:

```sql
SELECT count(*)                                            AS tong_don,
       count(*) FILTER (WHERE ngay_giao_key = -1)          AS chua_giao,
       count(*) FILTER (WHERE ngay_giao_key <> -1
                          AND ngay_nhan_key = -1)          AS dang_tren_duong,
       count(*) FILTER (WHERE ngay_nhan_key <> -1)         AS da_nhan,
       round(avg(tong_thoi_gian), 1)                       AS tb_ngay_hoan_tat
FROM fct_don_vong_doi;
```

```text
┌──────────┬───────────┬─────────────────┬─────────┬──────────────────┐
│ tong_don │ chua_giao │ dang_tren_duong │ da_nhan │ tb_ngay_hoan_tat │
├──────────┼───────────┼─────────────────┼─────────┼──────────────────┤
│        4 │         1 │               1 │       2 │              6.0 │
└──────────┴───────────┴─────────────────┴─────────┴──────────────────┘
```

| Kết quả của bạn |
|---|
| |

`tb_ngay_hoan_tat = 6.0` chỉ tính trên 2 đơn đã nhận — `avg` bỏ qua `NULL`. Đó là hành vi
**đúng** ở đây (không thể biết đơn chưa xong mất bao lâu), nhưng phải nói rõ trên báo cáo,
nếu không người đọc tưởng nó là trung bình của cả 4 đơn.

## Bước 6 — drill-across cho câu hỏi thứ ba

Thêm fact trả hàng, dùng chung `dim_khach`:

```sql
CREATE TABLE fct_tra_hang AS
SELECT * FROM (VALUES
  ('DH-001', CAST(20260120 AS INTEGER), 1, 150000),
  ('DH-001', CAST(20260125 AS INTEGER), 1, 150000),
  ('DH-004', CAST(20260301 AS INTEGER), 4, 900000)
) t(so_don, ngay_tra_key, khach_sk, gia_tri_tra);
```

**Cách sai — join thẳng hai fact:**

```sql
SELECT count(*) AS dong_sau_join,
       sum(f.thanh_tien) AS doanh_thu_sau_khi_join_thang,
       (SELECT sum(thanh_tien) FROM fct_ban) AS doanh_thu_that
FROM fct_ban f JOIN fct_tra_hang t USING (so_don);
```

```text
┌───────────────┬──────────────────────────────┬────────────────┐
│ dong_sau_join │ doanh_thu_sau_khi_join_thang │ doanh_thu_that │
├───────────────┼──────────────────────────────┼────────────────┤
│             6 │                      2700000 │        3450000 │
└───────────────┴──────────────────────────────┴────────────────┘
```

Hai lỗi cùng lúc: `DH-001` bị nhân đôi vì có hai lần trả, còn `DH-002` và `DH-003` biến
mất vì không có dòng trả nào. Con số 2.700.000 không phải doanh thu của bất kỳ thứ gì.

**Cách đúng — gộp từng fact về cùng grain trước, rồi mới ghép:**

```sql
WITH ban AS (
  SELECT k.khu_vuc, sum(f.thanh_tien) AS doanh_thu
  FROM fct_ban f JOIN dim_khach k USING (khach_sk) GROUP BY 1
), tra AS (
  SELECT k.khu_vuc, sum(t.gia_tri_tra) AS gia_tri_tra
  FROM fct_tra_hang t JOIN dim_khach k USING (khach_sk) GROUP BY 1
)
SELECT coalesce(ban.khu_vuc, tra.khu_vuc)   AS khu_vuc,
       coalesce(ban.doanh_thu, 0)           AS doanh_thu,
       coalesce(tra.gia_tri_tra, 0)         AS gia_tri_tra,
       round(100.0 * coalesce(tra.gia_tri_tra, 0)
             / nullif(ban.doanh_thu, 0), 1) AS ty_le_tra_pct
FROM ban FULL JOIN tra ON ban.khu_vuc = tra.khu_vuc
ORDER BY 2 DESC;
```

```text
┌────────────┬───────────┬─────────────┬───────────────┐
│  khu_vuc   │ doanh_thu │ gia_tri_tra │ ty_le_tra_pct │
├────────────┼───────────┼─────────────┼───────────────┤
│ Mien Trung │   1500000 │      900000 │          60.0 │
│ Mien Nam   │   1350000 │           0 │           0.0 │
│ Mien Bac   │    600000 │      300000 │          50.0 │
└────────────┴───────────┴─────────────┴───────────────┘
```

| Kết quả của bạn |
|---|
| |

Doanh thu cộng lại = 3.450.000, khớp nguồn. `FULL JOIN` giữ được cả khu vực không có dòng
trả nào. Đây là **drill-across**, và điều kiện để nó chạy được là hai fact dùng **cùng
một** `dim_khach` — xem [conformed dimension](../skills/conformed-dimension.md).

## Mô hình cuối

```text
                  dim_ngay ────┬──── ngay_dat_key
                     │         ├──── ngay_giao_key    (role-playing)
                     │         ├──── ngay_nhan_key
                     │         └──── ngay_tra_key
                     │
   fct_ban ──────────┼────────── dim_khach (Type 2, conformed)
   (grain: dong don) │                │
                     │                │
   fct_don_vong_doi ─┘                │
   (grain: mot don, accumulating)     │
                                      │
   fct_tra_hang ──────────────────────┘
   (grain: mot lan tra)

   so_don: degenerate dimension, co mat trong ca ba fact
```

Ba fact, một bộ dimension dùng chung. Đó là hình dạng của một
[star schema](../reference/star-snowflake-obt.md) trưởng thành: fact mọc thêm theo từng
quy trình nghiệp vụ, dimension thì dùng lại.

## Bài tập tự làm

| # | Đề | Kỹ thuật cần |
|---|---|---|
| 1 | Đổi join ở bước 3 sang `la_hien_tai`, chạy lại 4.4 và giải thích chênh lệch | [Dữ liệu về muộn](../skills/late-arriving.md) |
| 2 | Thêm đơn `DH-005` của khách `C9` chưa có trong `src_khach` — giữ cho tổng vẫn khớp | [Inferred member](../skills/late-arriving.md) |
| 3 | Dựng `agg_thang_khu_vuc`, rồi thêm một đơn lùi ngày và tìm chênh lệch | [Aggregate fact table](../skills/aggregate-fact-table.md) |
| 4 | Thêm phí ship ở cấp header, phân bổ về dòng đơn sao cho `SUM` đúng | [Degenerate dimension](../skills/degenerate-dimension.md) |
| 5 | Thêm `dim_audit`, gắn `audit_sk` vào cả ba fact, nạp `src_don` hai lần rồi xoá đúng lần thứ hai | [Audit dimension](../skills/audit-dimension.md) |

Bài 1 và 5 là hai bài đáng làm nhất — chúng cho thấy mô hình hỏng khi nào, chứ không chỉ
cho thấy nó chạy khi nào.

## Related Topics

- [Quy trình thiết kế 4 bước](../reference/design-process.md) — khung của toàn bài
- [Grain](../reference/grain.md) — quyết định ở bước 2, chi phối mọi thứ sau đó
- [Date dimension](../reference/date-dimension.md) — bước 1
- [SCD](../skills/scd.md) — bước 2
- [Degenerate dimension](../skills/degenerate-dimension.md) — `so_don` trong bước 3
- [Conformed dimension](../skills/conformed-dimension.md) — điều kiện của bước 6
- [dbt lab với DuckDB](../../etl/dbt/tutorials/dbt-lab-duckdb.md) — dựng lại mô hình này bằng dbt
