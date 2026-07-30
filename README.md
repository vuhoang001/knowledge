# Kho kiến thức — Vũ Hoàng

Markdown thuần trong git. Đọc/ghi bằng **VS Code**, duyệt bằng **GitLab** (GitLab
tự render `README.md` của mỗi thư mục, nên đi trong repo là đi trong wiki), và
Claude Code đọc trực tiếp được vì tất cả chỉ là file text.

Kho này tồn tại để trả lời **hai** câu hỏi. Mọi thứ bên dưới phục vụ đúng hai câu đó:

- **Tìm lại** — sáu tháng sau cần thứ mình từng biết, đi đường nào tới nó?
- **Ôn lại** — giữ cho khỏi quên, ai nhắc và nhắc lúc nào?

## Cấu trúc

Chia theo **loại ghi chú**, không theo chủ đề. Chủ đề luôn chồng lấn và luôn đổi
(ghi chú về test dbt trên Iceberg bỏ vào `dbt/` hay `iceberg/`?); loại ghi chú thì
không. Chủ đề để cho **tag và liên kết** lo.

| Thư mục | Chứa gì | Sửa lại? |
|---|---|---|
| [`00-inbox/`](00-inbox/) | Quăng thô, chưa phân loại. Dọn hằng tuần. | — |
| [`01-daily/`](01-daily/) | Nhật ký `YYYY-MM-DD.md`. Hôm nay làm gì, vướng gì. | Không — chỉ thêm |
| [`02-notes/`](02-notes/) | **Một ý một file.** Lớp giá trị cao nhất. | Có, thoải mái |
| [`03-topics/`](03-topics/) | **Một công nghệ một file.** Bản đồ + lộ trình + bài tập + tự kiểm. | Có |
| [`04-runbook/`](04-runbook/) | Thao tác lặp lại, có lệnh chạy được. | Có |
| [`09-worklog/`](09-worklog/) | Kê khai tháng. **Sinh từ `01-daily`**, không phải nguồn. | — |
| [`99-meta/`](99-meta/) | Khuôn mẫu + script. | — |

Phân vân bỏ đâu thì hỏi một câu:

| Vừa có | Hỏi | Vào |
|---|---|---|
| Đọc được cái hay | Đã hiểu chưa? **Chưa** | `00-inbox` |
| Debug 3 tiếng | Gắn với một ngày cụ thể? **Có** | `01-daily` |
| Hiểu ra một điều | Đúng cả ngoài dự án này? **Có** | `02-notes` |
| Bắt đầu học Kafka | Là cả một công nghệ? **Có** | `03-topics` |
| Deploy lên .60 | Sẽ làm lại y hệt? **Có** | `04-runbook` |

Đắn đo quá 3 giây là dấu hiệu chưa rõ mình đang ghi cái gì — cứ quăng vào `00-inbox`
rồi cuối tuần tính.

## Ba đường tìm lại — phải sống cả ba

| Đường | Khi bạn nhớ | Cách đi |
|---|---|---|
| **Toàn văn** | Nhớ *từ khoá* | `Ctrl+Shift+F` |
| **Mục lục** | Nhớ *công nghệ* | Mở [`03-topics/`](03-topics/) |
| **Thời gian** | Nhớ *hồi đó* | Mở [`01-daily/`](01-daily/) |

Hệ quả cho cách viết: **giữ nguyên thuật ngữ tiếng Anh trong nội dung.** Sáu tháng
sau bạn sẽ gõ `incremental`, `rebalance`, `grain` — không gõ "gia tăng". Diễn giải
bằng tiếng Việt, từ khoá để nguyên.

## Quy ước đặt tên

Tên file **không dấu, kebab-case** — gõ trong `Ctrl+P` mà phải bỏ dấu tiếng Việt
thì rất khổ. Nội dung có dấu thoải mái.

| Loại | Dạng | Ví dụ |
|---|---|---|
| Ghi chú | `<chu-de>-<ket-luan>.md` | `phan-trang-client-vs-server.md` |
| Nhật ký | `YYYY-MM-DD.md` | `2026-07-30.md` |
| Chủ đề | `<cong-nghe>.md` | `dbt.md` |
| Runbook | `<viec>-<o-dau>.md` | `deploy-fe-len-60.md` |

**Tên là kết luận, không phải nhãn chủ đề.** `dbt-test-unique-sai-grain.md` tốt hơn
`dbt-notes.md` — nhìn tên đã biết bên trong nói gì, đó là 80% khả năng tìm lại.

## Frontmatter

Mỗi file mở đầu bằng metadata. Đây là thứ cho phép script đọc được kho:

```yaml
---
type: note          # note | topic | runbook | daily
tags: [dbt, testing]
level: L2           # chỉ topic — xem 03-topics/README.md
next-review: 2026-08-06
updated: 2026-07-30
---
```

## Vòng đời một ghi chú

```
Bắt gặp   →  00-inbox hoặc 01-daily     ghi thô, không dừng lại trau chuốt
Cuối tuần →  02-notes                    viết lại cho mình-6-tháng-sau
Ngay đó   →  03-topics/<x>.md trỏ tới    không thì nó mồ côi
Định kỳ   →  on-tap.py nhắc              ôn bằng cách tự kiểm
```

Bước hay bị bỏ là **cuối tuần**, và bỏ nó là kho chết. Ghi nhật ký thuần thì ba
tuần sau đọc lại chẳng thấy giá trị, rồi bỏ luôn cả thói quen ghi.

## Dùng hằng ngày

```bash
code ~/Documents/knowledge      # mở cả kho
python3 99-meta/on-tap.py       # hôm nay ôn gì
```

- `Ctrl+Shift+V` — xem bản render
- `Ctrl+P` — nhảy nhanh tới file
- `Ctrl+Shift+F` — tìm toàn văn cả kho

Muốn có `[[liên kết]]`, backlink và graph ngay trong VS Code thì cài extension
**Foam** (`foam.foam-vscode`). Không cài cũng chạy bình thường.

## Đồng bộ

```bash
git add -A && git commit -m "notes: ..." && git push
```

## Bắt đầu từ đâu

Đừng dựng hết một lúc — thói quen phải có trước hệ thống.

| Giai đoạn | Làm | **Không** làm |
|---|---|---|
| Tuần 1–2 | Chỉ ghi `01-daily`, mỗi ngày 5 phút | Chưa đụng notes/topics/ôn tập |
| Tuần 3 | Cuối tuần nhấc 2–3 thứ lên `02-notes` | Chưa cần hoàn hảo |
| Tuần 4 | Nối các note vào `03-topics/dbt.md` | Chưa thêm công nghệ thứ hai |
| Tháng 2 | Bật `next-review`, chạy `on-tap.py` mỗi sáng | |
| Tháng 3 | Sinh worklog tháng **từ** daily | |

**Chỉ tiêu duy nhất của tuần 1: 7 file trong `01-daily/`.** Không gì khác quan trọng bằng.
