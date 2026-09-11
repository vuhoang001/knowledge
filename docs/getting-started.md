---
title: Bắt đầu từ đâu
sidebar_position: 0
description: "Dựng lab trong 5 phút rồi đi theo lộ trình — từ chưa cài gì tới chạy được bài tập đầu tiên."
tags: [getting-started, setup, duckdb, dbt]
domain: data-engineering
category: concept
doc_type: index
status: stable
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Bắt đầu từ đâu

> **Chốt:** kho này viết để **chạy**, không để đọc. Dựng lab trước — mọi con số trong
> mọi bài tập đều đến từ một bộ 15 bảng mà bạn tự nạp được trong năm phút.

Bạn không cần cụm Kafka, không cần warehouse, không cần tài khoản cloud nào. Cả kho dữ
liệu là **một file** trên máy bạn, xoá đi là về trắng.

## Bước 1 — Kiểm cái bạn đã có

```bash
python3 --version    # cần 3.9 trở lên
git --version
```

Thiếu `python3` thì cài trước: `sudo apt install python3 python3-venv` (Debian/Ubuntu),
`brew install python` (macOS). Ngoài hai thứ đó ra không cần gì thêm.

## Bước 2 — Dựng lab

```bash
git clone https://github.com/vuhoang001/knowledge.git
cd knowledge
./lab-starter/setup.sh
```

Script làm bốn việc: tạo venv → cài `dbt-duckdb` → copy 15 file CSV ra `~/learn-lab/dbt`
→ chạy `dbt seed`. Lần đầu mất 1–3 phút vì phải tải package.

Muốn để lab chỗ khác thì truyền đường dẫn: `./lab-starter/setup.sh ~/chỗ/tôi/thích`.

## Bước 3 — Xác nhận đúng

Script tự in bảng này ở cuối. Nếu bốn số khớp thì lab của bạn **giống hệt** lab dùng để
viết mọi bài tập trong kho:

```text
┌────────┬─────────┬───────────┬──────────┐
│ so_don │ so_dong │ doanh_thu │ phi_ship │
│ int64  │  int64  │  int128   │  int128  │
├────────┼─────────┼───────────┼──────────┤
│     10 │      15 │  10215000 │   400000 │
└────────┴─────────┴───────────┴──────────┘
```

**Bốn số này là mốc neo của cả kho.** Bài tập nào ra khác bốn số này thì lỗi nằm ở câu
SQL của bạn, không phải ở dữ liệu. Về gốc bất cứ lúc nào:

```bash
cd ~/learn-lab/dbt && ./.venv/bin/dbt seed --full-refresh --profiles-dir .
```

## Bước 4 — Chạy câu SQL đầu tiên

```bash
cd ~/learn-lab/dbt
./.venv/bin/python -c "
import duckdb
print(duckdb.connect('lab.duckdb').sql('''
  select ma_hang, sum(so_luong) sl, sum(so_luong*don_gia) tien
  from don_hang_chi_tiet group by 1 order by tien desc
'''))"
```

```text
┌─────────┬────────┬─────────┐
│ ma_hang │   sl   │  tien   │
│ varchar │ int128 │ int128  │
├─────────┼────────┼─────────┤
│ SP-C    │      4 │ 3600000 │
│ SP-A    │     22 │ 3300000 │
│ SP-B    │     10 │ 3000000 │
│ SP-D    │      7 │  315000 │
└─────────┴────────┴─────────┘
```

Ra đúng bảng trên là xong phần cài đặt. Từ đây mọi câu SQL trong kho đều dán thẳng vào
được.

## Đi theo thứ tự nào

Kho có hơn 230 file. Đừng đọc tuần tự — đi theo lộ trình này:

| Thứ tự | Đọc gì | Vì sao ở đây |
|---|---|---|
| 1 | [Grain](data-modeling/reference/grain.md) | Khái niệm mọi thứ khác dựa vào. Sai grain là sai hết, và không có gì báo lỗi |
| 2 | [Fact và Dimension](data-modeling/reference/fact-and-dimension.md) | Hai loại bảng, hai cách nghĩ khác nhau |
| 3 | [Dựng star schema bằng DuckDB](data-modeling/tutorials/star-schema-duckdb.md) | Bài chạy thật đầu tiên — đi hết bốn bước thiết kế |
| 4 | [Lab nền tảng — bốn cách làm phồng số](data-modeling/tutorials/lab-nen-tang-grain-fact-dim.md) | Tái hiện bốn lỗi kinh điển rồi tự sửa |
| 5 | [dbt là gì](etl/dbt/reference/what-is-dbt.md) → [Lab dbt](etl/dbt/tutorials/dbt-lab-duckdb.md) | Công cụ dựng model trên chính bộ seed vừa nạp |
| 6 | [26 bài tập có đáp số](data-modeling/tutorials/bai-tap-co-dap-so.md) | Tự chấm — đáp số cho trước, lời giải giấu đi |

Xong sáu bước đó thì mở [mục lục đầy đủ](index.md) và chọn theo nhu cầu. Thứ tự phụ
thuộc giữa các chủ đề ở cuối trang đó.

**Bộ bài tập tầng 3** (135 bài, phủ 29 kỹ thuật) dùng thêm 10 bảng nữa — đã nạp sẵn ở
bước 2. Bẫy cố ý của từng bảng giải thích ở [phụ lục seed](data-modeling/tutorials/bt-00-seed.md).

## Đọc một file thế nào

Mỗi file mở bằng một dòng **Chốt** — nếu sáu tháng sau chỉ nhớ được một câu thì là câu đó.

Ký hiệu trạng thái trong bảng mục lục:

| | Nghĩa |
|---|---|
| ✅ | Đã chạy tay, output trong file là output thật |
| 📝 | Lý thuyết, **chưa** kiểm chứng — đọc với thái độ nghi ngờ |
| 🔄 | Đang viết |
| 🟡 | Mới có khung |
| ⬜ | Chưa viết |
| 🗂️ | Mục lục |

Trường `verified_at` trong frontmatter **trống nghĩa là chưa ai chạy tay**. Đó là quy
ước cố ý: nội dung chưa kiểm chứng được đánh dấu rõ chứ không trộn lẫn với nội dung đã
chạy.

Ô **Kết quả** để trống trong bài tập cũng vậy — nghĩa là bài đó chưa được chạy thật.

## Khi hỏng

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `python3: command not found` | Chưa cài Python. Xem bước 1 |
| `ensurepip is not available` | Thiếu gói venv: `sudo apt install python3-venv` |
| `dbt debug` báo lỗi profile | Chạy dbt ngoài thư mục lab. Phải `cd ~/learn-lab/dbt` và luôn kèm `--profiles-dir .` |
| Bốn số mốc không khớp | Seed đã bị sửa. `dbt seed --full-refresh --profiles-dir .` |
| Muốn làm lại từ đầu | `rm -rf ~/learn-lab/dbt` rồi chạy lại `./lab-starter/setup.sh` |

Lab cố tình để **hỏng thoải mái** — không có gì trong đó không dựng lại được bằng một lệnh.

## Related Topics

- [Mục lục `docs/`](index.md) — manifest phẳng mọi file trong kho
- [Thư viện theo loại tài liệu](catalog.md) — cắt theo dạng thay vì theo chủ đề
- [Phụ lục seed](data-modeling/tutorials/bt-00-seed.md) — 15 bảng nguồn và bẫy cố ý của từng bảng
