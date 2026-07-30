# Meta — khuôn mẫu và script

## Khuôn

| File | Dùng cho |
|---|---|
| [`tmpl-daily.md`](tmpl-daily.md) | Nhật ký ngày → `01-daily/` |
| [`tmpl-note.md`](tmpl-note.md) | Ghi chú một ý → `02-notes/` |
| [`tmpl-topic.md`](tmpl-topic.md) | Học một công nghệ → `03-topics/` |

Sao chép nội dung khuôn sang file mới. Không cần plugin nào.

## Script

### `on-tap.py` — hôm nay ôn gì

```bash
python3 99-meta/on-tap.py          # cái đã đến hạn
python3 99-meta/on-tap.py --all    # kèm lịch sắp tới
```

Quét `next-review: YYYY-MM-DD` trong frontmatter của mọi file `.md` trong kho, so
với hôm nay. Chỉ dùng thư viện chuẩn của Python — không cài gì.

Mốc giãn cách **1 → 3 → 7 → 21 → 60 ngày**. Nhớ được thì đẩy sang mốc sau, quên thì
lùi về mốc đầu.

**Cách ôn cho đúng:** gấp tài liệu, trả lời mục *Tự kiểm* bằng miệng, rồi mới mở đối
chiếu. Đọc lại cho cảm giác đã hiểu — cảm giác đó sai.

Gợi ý: thêm vào `~/.zshrc` để mỗi sáng mở terminal là thấy.

```bash
alias ontap='python3 ~/Documents/knowledge/99-meta/on-tap.py'
```
