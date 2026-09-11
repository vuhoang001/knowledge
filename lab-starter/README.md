# lab-starter — dữ liệu nguồn để bắt đầu

Thư mục này là **bộ dữ liệu nguồn** của toàn bộ bài tập trong `docs/`. Nó tồn tại để
người đọc dựng lại được lab từ số không, không phải đoán xem các bảng trong bài tập
lấy ở đâu ra.

## Chạy

```bash
./lab-starter/setup.sh                 # dựng vào ~/learn-lab/dbt
./lab-starter/setup.sh /duong/dan/khac # hoặc chỗ bạn chọn
```

Script tự làm: tạo venv → cài `dbt-duckdb` → copy seed → `dbt seed` → in bốn số mốc.
Cần sẵn `python3` (3.9+) và khoảng 300 MB đĩa. Lần đầu mất 1–3 phút vì phải tải package.

## Vì sao lab nằm ngoài repo

`dbt run` sinh ra `target/`, `logs/`, `lab.duckdb` — rác build, không nên lẫn vào kho
kiến thức. `setup.sh` copy dữ liệu ra ngoài rồi làm việc ở đó. Repo chỉ giữ phần
**nguồn**: 15 file CSV cộng hai file cấu hình.

Làm hỏng thoải mái — `rm -rf ~/learn-lab/dbt` rồi chạy lại `setup.sh` là về trắng.

## Có gì trong đây

| File | Vai trò |
|---|---|
| `seeds/*.csv` | 15 bảng nguồn — 5 bảng nền + 10 bảng dạy kỹ thuật nâng cao |
| `dbt_project.yml` | Khai báo project, bố cục `staging` / `intermediate` / `marts` |
| `profiles.yml` | Trỏ dbt vào DuckDB, cả kho là một file `lab.duckdb` |
| `setup.sh` | Dựng tất cả từ số không |

Giải thích từng bảng — **bẫy cố ý** của nó và kỹ thuật nó dùng để dạy — ở
[`docs/data-modeling/tutorials/bt-00-seed.md`](../docs/data-modeling/tutorials/bt-00-seed.md).

## Bốn số mốc

Mọi bài tập neo vào bốn con số này. Lệch một trong bốn là seed đã bị sửa:

```text
10 đơn · 15 dòng · doanh thu 10.215.000 · phí ship 400.000
```

Kiểm bất cứ lúc nào:

```sql
select (select count(*) from don_hang)                       so_don,
       (select count(*) from don_hang_chi_tiet)              so_dong,
       (select sum(so_luong*don_gia) from don_hang_chi_tiet) doanh_thu,
       (select sum(phi_ship) from don_hang)                  phi_ship;
```

Về gốc: `dbt seed --full-refresh --profiles-dir .`
