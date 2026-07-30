# Meta — khuôn mẫu và script

## Khuôn

| File | Dùng cho |
|---|---|
| [`tmpl-daily.md`](tmpl-daily.md) | Nhật ký ngày → `01-daily/` |
| [`tmpl-note.md`](tmpl-note.md) | Ghi chú một ý → `02-notes/` |
| [`tmpl-topic.md`](tmpl-topic.md) | Học một công nghệ → `03-topics/` |

Sao chép nội dung khuôn sang file mới. Không cần plugin nào.

## Script — `kb.py`

Learning OS giai đoạn 1. Chỉ thư viện chuẩn, không dịch vụ, không cài gì.
Kiến trúc đầy đủ: [learning-os.md](learning-os.md).

```bash
python3 99-meta/kb.py index              # quét .md → kb.sqlite
python3 99-meta/kb.py due                # hôm nay ôn gì
python3 99-meta/kb.py review <id> <0-3>  # 0 quên · 1 khó · 2 được · 3 dễ
python3 99-meta/kb.py path <id>          # thứ tự học để tới được <id>
python3 99-meta/kb.py doctor             # chu trình · mồ côi · seed cũ · stale
python3 99-meta/kb.py stats
```

**`kb.sqlite` KHÔNG vào git** — nó dẫn xuất. Xoá đi rồi `index` là dựng lại y nguyên.
Nguồn sự thật chỉ có hai: các file `.md` và `review-log.jsonl`.

**`review-log.jsonl` THÌ VÀO git** — quý, không suy ra được từ Markdown, và vì chỉ
ghi thêm nên diff luôn sạch. Trạng thái ôn tập là kết quả *phát lại* log này, nên
đổi thuật toán lúc nào cũng được mà không mất dữ liệu.

**Cách ôn cho đúng:** gấp tài liệu → trả lời mục *Tự kiểm* bằng miệng → mới mở đối
chiếu. Đọc lại cho cảm giác đã hiểu; cảm giác đó sai.

```bash
alias kb='python3 ~/Documents/knowledge/99-meta/kb.py'
```
