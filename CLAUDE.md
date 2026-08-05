# Hướng dẫn cho Claude Code

Repo này là **kho kiến thức cá nhân bằng markdown**, kèm một site
[Docusaurus](https://docusaurus.io/) để đọc. Nội dung là thứ chính; site chỉ là cách
hiển thị. Đừng thêm code ứng dụng, API hay pipeline dữ liệu vào đây.

**Nguồn sự thật là các file `.md`.** `build/`, `.docusaurus/`, `node_modules/` đều là
sản phẩm dẫn xuất, đã gitignore — đừng sửa tay, đừng commit.

## Tìm gì ở đâu

| Cần | Đọc |
|---|---|
| Thứ tôi cần nằm ở file nào | [`docs/index.md`](docs/index.md) — manifest phẳng của mọi file |
| **Kiến thức mới đi vào đâu, mang metadata gì** | [`ROUTING.md`](ROUTING.md) — ba trục phân loại + rule linter cưỡng chế |
| Thêm một file mới đúng quy trình | skill [`kb-add`](.claude/skills/kb-add/SKILL.md) — chạy ba trục, sinh frontmatter, cập nhật 4 mục lục, lint |
| **Quy trình từ "vừa học được" tới "đã thuộc"** | [`WORKFLOW.md`](WORKFLOW.md) — ba tầng, toàn bộ lệnh, vòng lặp thường ngày, khi hỏng thì làm gì |
| Sinh thẻ Anki từ một file docs | skill [`kb-cards`](.claude/skills/kb-cards/SKILL.md) — sinh vào `anki/_pending.tsv` để duyệt trước khi gộp |
| Bản đồ tri thức tổng | [`README.md`](README.md) |
| Bản đồ khái niệm của một công nghệ | `docs/<lĩnh vực>/<công nghệ>/index.md` |
| Khuôn để viết file mới | `templates/full-topic.md` (chủ đề lớn) · `templates/short-topic.md` (ngắn) |

Corpus hiện ~1.8 MB / 179 file — **đọc thẳng file, đừng dựng index hay RAG.** Toàn bộ
kho nhét vừa context window nhiều lần; grep + read luôn cho kết quả tốt hơn retrieval.
Chỉ tính lại lựa chọn này khi kho vượt vài trăm file, hoặc khi cần tra cứu ngữ nghĩa
từ **ngoài** agent (web app, bot).

Thư mục giữ chỗ mang `category: placeholder` trong frontmatter — Docusaurus báo lỗi nếu
một category rỗng, nên chúng tồn tại để site build được, không phải vì có nội dung:

```bash
grep -rl 'category: placeholder' docs/     # những gì chưa viết
```

## Luật cứng

**1. Không bao giờ tự điền `verified_at`.** Trường này nghĩa là *"đã chạy tay và tận
mắt thấy output"*. Chỉ chủ repo điền, sau khi chạy thật. Trống = chưa tin được — đó là
cột sống của kho, và nội dung do AI sinh chính là thứ nó tồn tại để phòng.

**2. Chạy thật trước đã — DuckDB có sẵn, đừng để trống "chưa chạy".**

Ví dụ SQL tự chứa thì **chạy rồi dán output thật**, đừng ghi *chưa chạy*:

```bash
~/Documents/learn-lab/dbt/.venv/bin/python -c "
import duckdb; print(duckdb.connect().sql('SELECT 1'))"
```

Chỉ khi thật sự không chạy được (cần Trino, Kafka, dữ liệu nội bộ) mới được **minh hoạ**
— và lúc đó phải ghi nhãn rõ ràng ngay cạnh, ví dụ *"số minh hoạ, chưa chạy"*. Người đọc
phải phân biệt được ngay đâu là output thật.

**Ngoại lệ tuyệt đối không nới:** chi tiết **môi trường** — tên catalog, host, port,
tên schema, phiên bản, đường dẫn — **cấm bịa trong mọi trường hợp**. Đây đúng là chỗ đã
mất một buổi ngày 30/07/2026 vì AI bịa tên catalog Trino nghe rất hợp lý; xem
[case study](docs/etl/dbt/case-studies/ai-sinh-sai-ten-catalog-trino.md). Loại này chỉ
được lấy từ output của lệnh chạy thật (`SHOW CATALOGS`, `dbt debug`).

**3. Trước khi tạo file mới, tìm xem đã có chưa.** Một kiến thức một chỗ; trùng thì
cập nhật file cũ.

```bash
grep -ril "slowly changing" docs/
```

**4. Tạo file mới thì phải cập nhật mục lục.** Ít nhất `index.md` của thư mục chứa nó,
và `docs/index.md`. Không có ghi chú mồ côi.

**5. File mới phải có `sidebar_position`, khớp cột `#` của mục lục.** Thiếu nó là
Docusaurus sắp sidebar theo alphabet — im lặng, không lỗi nào báo. Xem [`ROUTING.md`](ROUTING.md).

**6. Note giải thích một quyết định thì phải có ví dụ xuyên suốt.** Một bài toán cụ thể
đi hết từ dữ liệu nguồn → bước quyết định → SQL dựng bảng → query kiểm chứng → bảng so
sánh trước/sau. Bảng đánh đổi không kèm ví dụ chạy được thì sáu tháng sau đọc lại không
dựng lại được. Ô *Kết quả* để trống ghi *chưa chạy* — xem luật #2.

## Quy ước viết

| Thứ | Quy tắc |
|---|---|
| Ngôn ngữ | Nội dung tiếng Việt; **giữ nguyên thuật ngữ tiếng Anh** (`grain`, `incremental`, `rebalance`, `watermark`) — đừng dịch |
| Tên file/thư mục | Tiếng Anh, kebab-case, không dấu: `surrogate-key.md` |
| Số thứ tự học | Nằm ở **cột `#` của bảng mục lục**, không nhét vào tên file |
| Độ sâu | Tối đa 3 thư mục: `docs/<lĩnh vực>/<công nghệ>/<nhóm>/<file>.md`. Tầng thứ ba **chỉ** cho nhóm `doc_type` (`tutorials/`, `case-studies/`, `cheatsheets/`) hoặc tầng học. Component kỹ thuật cần thêm tầng = nên tách thành công nghệ riêng |
| Trang chủ thư mục | `index.md` |
| Nhãn sidebar | `_category_.json` — `label` + `position`. Thư mục mới **phải** có file này |
| Giọng văn | Trực tiếp, có ý kiến. Nói rõ đánh đổi và cái bẫy, không liệt kê tính năng |

Mỗi file lý thuyết nên mở bằng một dòng **Chốt** — nếu sáu tháng sau chỉ nhớ được một
câu thì câu đó là đây.

## Frontmatter bắt buộc

```yaml
---
title: Grain
sidebar_position: 1             # khớp cột # trong index.md — xem luật cứng #5
description: Một câu — đây là thứ dùng để tìm lại file này
tags: [grain, data-modeling, kimball]
domain: data-engineering        # data-engineering | backend | devops | ai | ...
category: concept               # TRI THỨC: concept | technology | pattern | tool
doc_type: reference             # TÀI LIỆU: quyết định thư mục, phải khớp (linter R12)
status: draft                   # draft | review | stable
difficulty: beginner            # beginner | intermediate | advanced
verified_at:                    # TRỐNG — xem luật cứng #1
updated: 2026-07-31             # cập nhật khi sửa nội dung
---
```

Ký hiệu trạng thái dùng trong bảng mục lục:
✅ đã chạy tay · 📝 lý thuyết chưa kiểm chứng · 🔄 đang làm · 🟡 mới có khung · ⬜ chưa viết · 🗂️ mục lục

## Lab sống ngoài repo

Code thực hành ở `~/Documents/learn-lab/` (ví dụ `~/Documents/learn-lab/dbt` — venv
riêng, `dbt-duckdb`). **Đừng tạo file lab trong repo này.** `.gitignore` đã chặn
`*.duckdb`, `target/`, `dbt_packages/`, `logs/` phòng khi lỡ tay.

Lab chọn công cụ đơn giản nhất chạy được (DuckDB thay vì Trino) để mỗi lỗi chỉ có một
nghi phạm.

## Site Docusaurus

```bash
npm start          # dev server localhost:3000, hot reload khi sửa .md
npm run lint       # bộ rule định tuyến — bắt cái build không thấy
npm run check      # lint + build, chạy cái này trước khi commit
npm run build      # build tĩnh
npm run serve      # xem thử bản build
```

`npm run lint` bắt **file mồ côi, thiếu `sidebar_position`, `sidebar_position` trùng,
frontmatter thiếu trường, sai độ sâu** — build không thấy những thứ này. Rule và lý do
từng rule ở [`ROUTING.md`](ROUTING.md).

Search chỉ có ở bản build (`npm run build && npm run serve`), **không có ở `npm start`**.

`npm run build` là thứ duy nhất kiểm chứng tự động trong repo. Nó **chặn** bốn lỗi:

| Lỗi | Vì sao build chết |
|---|---|
| Link markdown trỏ tới file không tồn tại | `onBrokenLinks: 'throw'` |
| Front matter YAML hỏng | `description` chứa `:` mà không quote là chết — **quote lại** |
| `<details>` viết một dòng | MDX v3 cần `<details>` và `<summary>` tách dòng, có dòng trống trước `</details>` |
| Thư mục có `_category_.json` nhưng không có `.md` nào | Category rỗng — thêm `index.md` giữ chỗ |

Sửa nội dung xong mà chưa chạy `npm run build` thì chưa biết nó có hỏng gì không.

## Git

Commit message tiếng Việt không dấu, mô tả thay đổi nội dung — theo lịch sử sẵn có:

```
note: data quality trong dbt co 3 tang
dbt: tach lab khoi HDOS, dung DuckDB
```

Nhánh hiện tại là `master`. Chỉ commit/push khi được yêu cầu.
