---
title: Lab dbt trên DuckDB
description: Bảy bài tập chạy thật từ dbt debug tới chuyển sang Trino — mỗi bài có ô dán output.
tags: [dbt, duckdb, tutorial, lab, hands-on]
domain: data-engineering
category: tutorial
status: review
difficulty: beginner
verified_at: 2026-07-30       # bài 1–3 đã chạy
lab: ~/Documents/learn-lab/dbt
updated: 2026-07-31
---
# Bài tập dbt

Làm trong `~/Documents/learn-lab/dbt`. Mỗi bài **chạy thật, dán output vào ô Kết quả**.
Đọc hiểu không tính.

> **Vì sao lab dùng DuckDB chứ không phải Trino `.60`.** Học dbt trên Trino là học ba
> thứ cùng lúc — dbt, Trino, Iceberg — và lỗi nào cũng có ba nghi phạm, không phân
> biệt được lỗi hiểu sai dbt với lỗi cấu hình cụm. DuckDB không server, cả kho là
> một file, xoá đi là về trắng. Chuyển sang Trino ở bài 7, khi dbt đã không còn là biến số.

Dữ liệu seed sẵn: `don_hang_chi_tiet.csv` (15 dòng, đơn hàng nhiều dòng hàng) và
`hang_hoa.csv` (4 mặt hàng). Nhỏ để soi được bằng mắt — cố ý.

---

## Bài 1 — Nối được

**Làm gì:**

```bash
cd ~/Documents/learn-lab/dbt
.venv/bin/dbt debug --profiles-dir .
.venv/bin/dbt seed  --profiles-dir .
```

**Xong khi:** `All checks passed!` và hai bảng seed vào `lab.duckdb`. Mở file đó bằng
`duckdb lab.duckdb` rồi `SELECT * FROM don_hang_chi_tiet;` để tự thấy dữ liệu.

**Kết quả:** ✅ 30/07/2026 — pass.

---

## Bài 2 — Model đầu tiên, và xem dbt SINH RA gì

**Làm gì:** tạo `models/stg_don_hang.sql`, chỉ `SELECT` từ seed, đổi tên cột, thêm
cột tính `thanh_tien = so_luong * don_gia`. Chạy `dbt run`, rồi **mở
`target/compiled/dbt_lab/models/stg_don_hang.sql`**.

**Xong khi:** so được file mình viết với file dbt sinh ra, và nói được dbt đã thay
đổi đúng những gì.

> Đây là chỗ mô hình tư duy cốt lõi trở thành thứ nhìn thấy được, không còn là câu
> chữ. Đừng bỏ bước mở `target/compiled/`.

**Kết quả:** ✅ 30/07/2026 — khác đúng một chỗ: `{{ ref(...) }}` → `"lab"."main"."don_hang_chi_tiet"`.
Chi tiết ở [01-dbt-la-gi.md](../etl/dbt/what-is-dbt.md) §2.

---

## Bài 3 — Test bắt lỗi grain

**Làm gì:** thêm `models/schema.yml`, đặt test `unique` lên `don_hang_id` của
`stg_don_hang`. Chạy `dbt test`.

**Xong khi:** test **FAIL** — và bạn giải thích được vì sao đó là test sai chứ không
phải dữ liệu sai. Sau đó sửa cho đúng grain (gợi ý: grain thật là *cặp* cột nào?).

> Bài quan trọng nhất của cả module. Đúng lớp lỗi làm lệch số trên dashboard mà
> không ai thấy.

**Kết quả:** ✅ 30/07/2026 — `FAIL 4`, grain thật là `(don_hang_id, dong)`.
Output đầy đủ ở [06-test-va-data-quality.md](../etl/dbt/testing.md) §5.

---

## Bài 4 — `ref()` dựng nên DAG

**Làm gì:** thêm `stg_hang_hoa.sql`, rồi `mart_doanh_thu_theo_nhom.sql` join hai
model qua `ref()`. Chạy `dbt run`, sau đó `dbt docs generate && dbt docs serve`.

**Xong khi:** đổi tên `stg_don_hang.sql` và thấy dbt **báo lỗi phụ thuộc** chứ không
chạy bừa. Rồi thử thay `ref()` bằng tên bảng thẳng — xem DAG mất cạnh ra sao.

**Kết quả:**

---

## Bài 5 — Materialization

**Làm gì:** đổi mart sang `table`, rồi `incremental` với `is_incremental()`. Chạy
hai lần, so số dòng và thời gian.

**Xong khi:** nói được điều gì xảy ra khi một đơn hàng **cũ** bị sửa lại, và
`--full-refresh` giải quyết gì.

**Kết quả:**

---

## Bài 6 — Ba tầng data quality

**Làm gì:** thêm một singular test trong `tests/`, bật `contract: enforced` cho mart,
rồi viết một unit test cho công thức `thanh_tien`.

**Xong khi:** cố tình làm sai từng tầng một và thấy **đúng tầng đó** bắt được:
sai dữ liệu → test bắt; sai kiểu cột → contract chặn trước khi build; sai công thức
→ unit test bắt dù dữ liệu hợp lệ.

**Kết quả:**

---

## Bài 7 — Chuyển sang Trino

**Chỉ làm sau khi bài 1–6 xong.** Đổi `profiles.yml` sang `dbt-trino` trỏ `.60:8080`.
Chạy lại chính các model đó.

**Xong khi:** nói được cái gì phải đổi và cái gì giữ nguyên — đó là câu trả lời thật
cho "dbt độc lập với warehouse tới mức nào".

> ⚠ Catalog trên `.60` tên là `hdos_silver` / `polaris_silver`, **không có catalog
> tên `iceberg`**. Xem mục "Sai lầm đã mắc" ở [README](../etl/dbt/index.md).

**Kết quả:**

## Liên kết

- [Mục lục dbt](../etl/dbt/index.md)
- [Trino](../query-engines/trino/index.md) — cần cho bài 7
