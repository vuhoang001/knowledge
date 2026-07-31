---
name: kb-add
description: Thêm kiến thức mới vào kho — định tuyến đúng thư mục theo ROUTING.md, sinh frontmatter, cập nhật mục lục, chạy lint. Dùng khi người dùng nói "ghi cái này vào kho", "thêm note về X", "cái này nên để đâu", "vừa học được X", hoặc dọn một mẩu từ inbox/.
---

# Thêm kiến thức vào kho

Quy trình này tồn tại vì việc thêm một file chạm **bốn chỗ**, và quên một chỗ thì
hỏng im lặng: sidebar sắp sai thứ tự, hoặc file thành mồ côi. Cả hai đều không làm
build đỏ.

**Nguồn rule là [`ROUTING.md`](../../../ROUTING.md) — đọc nó, đừng nhớ theo trí nhớ.**
Rule đổi thì file đó đổi, skill này không chép lại để khỏi lệch.

## Bước 1 — Tìm trùng trước, luôn luôn

Luật cứng #3 của kho: một kiến thức một chỗ.

```bash
grep -ril "<từ khoá chính>" docs/
grep -ril "<từ khoá tiếng Anh>" docs/
```

Có kết quả liên quan thì **cập nhật file đó**, không tạo file mới. Nếu chủ đề mới chỉ
là một nhánh của file cũ, cân nhắc thêm mục vào file cũ và chỉ tách ra khi nó đủ dài để
đứng riêng.

## Bước 2 — Chạy ba trục của ROUTING.md

Đọc `ROUTING.md` và áp lần lượt:

1. **Loại tài liệu** → `doc_type` → thư mục gốc. Có output thật dán vào thì là
   `tutorials/`, không thì là `docs/`. Đây là chỗ hay nhầm nhất. `doc_type` và thư mục
   **phải khớp** — linter R12 chặn nếu lệch, nên không có chuyện dán nhãn cho có.
2. **Lĩnh vực** → `docs/<domain>/` hoặc `docs/<domain>/<công nghệ>/`.
   Rồi vào **một trong năm nhóm chuẩn**: `reference/` `skills/` `tutorials/`
   `cheatsheets/` `case-studies/`. Ranh giới hay nhầm nhất là reference ↔ skill:
   thuộc `skills/` khi nó **giả định** phần reference đã nắm và chỉ xử lý một tình
   huống cụ thể.
3. **Thứ tự trong nhóm** → `sidebar_position` đánh lại từ 1 **trong từng nhóm**, khớp
   cột `#` của `index.md` nhóm đó. Chèn vào giữa thì đánh số lại các file sau nó.

Nói rõ cho người dùng kết luận của từng trục kèm lý do, trước khi tạo file.

## Bước 3 — Chọn template và viết

| Chủ đề | Template |
|---|---|
| Lớn, nhiều thành phần | `templates/full-topic.md` |
| Đọc trong 5 phút | `templates/short-topic.md` |

Bắt buộc:

- Mở bằng một dòng **Chốt** — câu duy nhất còn nhớ sau sáu tháng.
- **`verified_at` để TRỐNG.** Luật cứng #1, không có ngoại lệ. Chỉ chủ repo điền sau
  khi chạy tay và thấy output.
- **Chạy thật rồi dán output.** Luật cứng #2 — DuckDB có sẵn ở
  `~/Documents/learn-lab/dbt/.venv/bin/python`. Đừng để ô *Kết quả* trống.
  Không chạy được thì minh hoạ nhưng **phải ghi nhãn**. Chi tiết môi trường (tên
  catalog, host, version) thì cấm bịa tuyệt đối.
- Note giải thích một **quyết định** (chọn A hay B) phải có **ví dụ xuyên suốt**: dữ
  liệu nguồn → bước đo để quyết → SQL dựng bảng → query kiểm chứng → bảng so sánh
  trước/sau. Luật cứng #6. SQL chạy được trên DuckDB.
- Có mục `## Related Topics`, trỏ hai chiều với các file liên quan.
- Nội dung tiếng Việt, **giữ nguyên thuật ngữ tiếng Anh** (`grain`, `incremental`,
  `watermark`). Tên file tiếng Anh kebab-case không dấu.

## Bước 4 — Cập nhật đủ bốn chỗ

Bỏ sót chỗ nào thì linter bắt chỗ đó, nhưng sửa trước rẻ hơn:

| # | Chỗ | Bỏ sót thì |
|---|---|---|
| 1 | `sidebar_position` trong frontmatter file mới | R5 — sidebar sắp theo alphabet |
| 2 | Cột `#` trong `index.md` cùng thư mục | R6 — file mồ côi |
| 3 | Một dòng trong manifest `docs/index.md` | R7 cảnh báo |
| 4 | `README.md` nếu là chủ đề đáng lên bản đồ tổng | không có rule bắt — tự cân nhắc |

`sidebar_position` **phải khớp** cột `#`. Chèn vào giữa thì đánh số lại các file sau nó.

## Bước 5 — Kiểm

```bash
npm run check                   # lint + build, phải 0 error
npm run lint -- --inventory     # kho đang có gì, theo doc_type × domain
```

Phải **0 error**. Warning thì đọc xem có phải do file vừa thêm không.

Xong thì báo cáo: file đã tạo, ba trục đã kết luận ra sao, những chỗ đã cập nhật, kết
quả `npm run check`.

## Không tự làm

- **Không commit/push** trừ khi được yêu cầu rõ ràng.
- **Không điền `verified_at`.**
- **Không sửa `build/`, `.docusaurus/`, `node_modules/`** — đều là sản phẩm dẫn xuất.
- **Không tạo file lab trong repo này** — lab sống ở `~/Documents/learn-lab/`.
