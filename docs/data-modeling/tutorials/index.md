---
title: Bài tập — Data Modeling
sidebar_position: 0
description: "Chạy thật, có ô dán output. Chưa chạy được thì chưa gọi là học."
tags: [tutorial, data-modeling]
domain: data-engineering
category: index
doc_type: index
updated: 2026-07-31
---

# Bài tập — Data Modeling

Chạy thật, có ô dán output. Chưa chạy được thì chưa gọi là học.

> **Bài 1–7 là lab chẩn đoán** — bày sẵn bẫy rồi giải thích. **Bài 8 ngược lại**: bạn tự
> viết, có đáp số để tự chấm. Làm lab trước, rồi kiểm bằng bài 8.

| # | Bài | Làm được gì sau khi xong | Thời lượng |
|---|---|---|---|
| 1 | [Dựng một star schema từ đầu bằng DuckDB](star-schema-duckdb.md) | Đi hết bốn bước thiết kế trên dữ liệu thật: `dim_ngay`, dimension Type 2, transaction fact, accumulating snapshot, drill-across — kèm bốn phép kiểm bắt buộc | ~20 phút |
| 2 | [SCD Type 2 bằng dbt snapshot](scd-bang-dbt-snapshot.md) | Dựng Type 2 bằng `dbt snapshot`, rồi tự phá: as-was join đúng lý thuyết trả về **0 dòng** — và vì sao | ~30 phút |
| 3 | [Lab nền tảng — bốn cách làm phồng số](lab-nen-tang-grain-fact-dim.md) | Tái hiện rồi sửa: trộn grain (+77,5%), join hai fact, dim có grain bằng fact (+44,1%), join Type 2 bằng natural key (+26,9%) | ~40 phút |
| 4 | [Lab dimension — bốn cách làm mất dòng](lab-dimension.md) | Khoá `NULL` làm hụt 17,3%, lọc `<>` nuốt dòng, cây dẹt bỏ rơi nhánh nông | ~40 phút |
| 5 | [Lab fact nâng cao — phân bổ, luỹ kế, bảng tổng hợp](lab-fact-nang-cao.md) | Sai số làm tròn 1 đồng, cột YTD phồng 3,38 lần, avg-của-avg lệch 5,7%, con rết 7 khoá | ~50 phút |
| 6 | [Lab tích hợp — ghép được nhưng có so được không](lab-tich-hop.md) | Hai định nghĩa doanh thu lệch 3,9%; drill-across ba lượt; bus matrix thành bảng đo được | ~40 phút |
| 7 | [Lab vận hành — khi số sai thì mất bao lâu để biết](lab-van-hanh.md) | Nạp trùng phồng 25%; không có audit thì xoá 10 dòng để diệt 5; phân vùng nóng | ~40 phút |
| 8 | [**26 bài tập có đáp số**](bai-tap-co-dap-so.md) | **Bạn viết, đáp số cho trước, lời giải giấu đi** — tự chấm không cần hỏi ai | ~90 phút |

Lab chạy bằng venv ngoài repo: `~/Documents/learn-lab/dbt/.venv/bin/python`. Mọi câu SQL
tự chứa, dán thẳng vào DuckDB là chạy.

**Ô *Kết quả của bạn* để trống nghĩa là chưa chạy.** Chạy rồi mới điền `verified_at`.

## Dữ liệu dùng chung cho lab 2–7

Lab code sống **ngoài repo** (`~/Documents/learn-lab/dbt`, xem `CLAUDE.md`), nên nội dung
seed chép lại đây để dựng lại được từ số không. Bốn số gốc phải nhớ:

```text
10 don · 15 dong · doanh thu 10.215.000 · phi ship 400.000
```

<details>
<summary><code>seeds/khach_hang.csv</code> — nguồn của snapshot SCD</summary>

```csv
khach_id,ho_ten,khu_vuc,hang
C1,Nguyen Van A,Mien Bac,Bac
C2,Tran Thi B,Mien Nam,Vang
C3,Le Van C,Mien Trung,Bac
C4,Pham Thi D,Mien Bac,Kim cuong
```

`C1` là khách dùng để diễn Type 2 — lab 2 sẽ đổi `Mien Bac` → `Mien Nam`.

</details>

<details>
<summary><code>seeds/don_hang.csv</code> — header, có phí ship và đơn chưa giao</summary>

```csv
don_hang_id,khach_id,ngay_dat,ngay_giao,ngay_nhan,trang_thai,phi_ship
DH001,C1,2026-07-01,2026-07-03,2026-07-05,hoan_thanh,60000
DH002,C2,2026-07-01,2026-07-02,2026-07-04,hoan_thanh,30000
DH003,C1,2026-07-02,2026-07-05,2026-07-09,hoan_thanh,90000
DH004,C3,2026-07-02,2026-07-04,,dang_giao,30000
DH005,C2,2026-07-03,2026-07-06,2026-07-08,hoan_thanh,45000
DH006,C4,2026-07-03,,,moi,30000
DH007,C1,2026-07-04,2026-07-07,2026-07-10,hoan_thanh,25000
DH008,C3,2026-07-04,2026-07-06,,dang_giao,30000
DH009,C2,2026-07-05,,,moi,30000
DH010,C4,2026-07-05,2026-07-08,2026-07-11,hoan_thanh,30000
```

Hai bẫy cố ý: `phi_ship` ở **cấp đơn** (lab 3 bài 2, lab 5 bài 1), và `DH006`/`DH009`
**chưa giao** → `ngay_giao` rỗng (lab 4 bài 1).

</details>

<details>
<summary><code>seeds/tra_hang.csv</code> — fact thứ hai để drill-across</summary>

```csv
ma_tra,don_hang_id,ngay_tra,gia_tri_tra
TR01,DH003,2026-07-12,300000
TR02,DH003,2026-07-15,150000
TR03,DH005,2026-07-14,900000
TR04,DH010,2026-07-16,150000
```

Bẫy: `DH003` bị trả **hai lần** → join thẳng hai fact là nhân đôi (lab 3 bài 3).

</details>

`seeds/don_hang_chi_tiet.csv` (15 dòng) và `seeds/hang_hoa.csv` đã có sẵn trong lab từ
trước — xem [bài tập dbt](../../etl/dbt/tutorials/dbt-lab-duckdb.md).

```bash
cd ~/Documents/learn-lab/dbt && ./.venv/bin/dbt seed --profiles-dir .
```

## Related Topics

- [Data Modeling](../index.md) — chủ đề chứa thư mục này
