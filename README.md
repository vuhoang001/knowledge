# Kho kiến thức — Vũ Hoàng

Repo git chứa Markdown thuần. Đọc/ghi bằng **VS Code**, duyệt bằng **GitLab**
(GitLab tự render `README.md` của mỗi thư mục, nên đi trong repo là đi trong wiki),
và Claude Code đọc trực tiếp được vì tất cả chỉ là file text.

Không khoá vào công cụ nào. Không cần cài gì để bắt đầu.

## Quy tắc sống còn

**Ngày ghi thô vào `10-daily/`. Cuối tuần nhấc thứ đáng giữ lên `20-notes/` và viết
lại cho "chính mình 6 tháng sau" đọc.**

Cái gì không nhấc lên nổi thì để nó chết trong daily — đó là tính năng, không phải
lỗi. Kho kiến thức chết là vì thiếu đúng bước "nhấc lên" này: ghi nhật ký thuần thì
ba tuần sau đọc lại chẳng thấy giá trị, rồi bỏ.

## Thư mục

| Thư mục | Chứa gì | Sửa lại? |
|---|---|---|
| [`00-inbox/`](00-inbox/) | Quăng thô vào, chưa cần phân loại. Dọn định kỳ. | — |
| [`10-daily/`](10-daily/) | Nhật ký `YYYY-MM-DD.md`. Hôm nay làm gì, vướng gì. | Không — chỉ thêm |
| [`20-notes/`](20-notes/) | Kiến thức đọng lại. Sống lâu hơn dự án sinh ra nó. | Có, thoải mái |
| [`30-projects/`](30-projects/) | Một file một dự án: mục tiêu, quyết định, trạng thái. | Có |
| [`40-runbook/`](40-runbook/) | Thao tác lặp lại: deploy, seed, khôi phục. Có lệnh chạy được. | Có |
| [`50-learning/`](50-learning/) | **Học một công nghệ mới**: lộ trình, bài tập, tự kiểm, lịch ôn. | Có |
| [`90-worklog/`](90-worklog/) | Kê khai công việc theo tháng. **Sinh từ `10-daily/`**, không phải nguồn. | — |
| [`99-templates/`](99-templates/) | Khuôn cho daily note và cho một chủ đề học. | — |

## Cái gì KHÔNG bỏ vào đây

Tài liệu kỹ thuật của một dự án cụ thể — `docs/06-deployment.md` của `hdos-v3`,
`docs/hdos/` của `kafka-flink`. Chúng phải khớp với code và chết theo code, nên ở
lại trong repo của chúng. Bê sang đây là chắc chắn lệch bản.

Ở đây chỉ giữ thứ **xuyên dự án**: hiểu biết về dbt/Iceberg/Flink, cách mình giải
một lớp vấn đề, bài học rút ra. Muốn trỏ tới doc trong repo thì ghi đường dẫn, đừng
chép nội dung.

## Ba loại tài liệu, đừng trộn

| Loại | Vòng đời | Ở đâu |
|---|---|---|
| Tài liệu dự án | Chết theo code | Trong repo dự án |
| Nhật ký | Đóng băng theo ngày | `10-daily/` |
| Kiến thức đọng | Sống lâu, viết lại được | `20-notes/`, `50-learning/` |

## Cách dùng hằng ngày

Mở cả thư mục này trong VS Code: `code ~/Documents/knowledge`

- `Ctrl+Shift+V` — xem bản render của file đang mở
- `Ctrl+P` rồi gõ tên file — nhảy nhanh
- `Ctrl+Shift+F` — tìm toàn văn cả kho

Xem hôm nay cần ôn gì:

```bash
python3 tools/on-tap.py
```

Muốn có `[[liên kết]]`, backlink và graph ngay trong VS Code thì cài extension
**Foam** (`foam.foam-vscode`) — cùng triết lý, cùng file Markdown, không đổi gì
trong repo. Không cài cũng chạy bình thường, `[[...]]` chỉ thành chữ thường.

## Đồng bộ

```bash
cd ~/Documents/knowledge
git add -A && git commit -m "notes: <ghi gì đó>" && git push
```
