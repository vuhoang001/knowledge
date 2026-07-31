---
name: kb-cards
description: Sinh thẻ Anki từ một file docs vừa viết hoặc vừa sửa — theo chuẩn 4 luật, ghi vào anki/_pending.tsv để duyệt trước khi gộp. Dùng khi người dùng nói "sinh thẻ cho file X", "làm câu hỏi cho note vừa viết", "cập nhật bộ thẻ Anki", hoặc sau khi thêm/sửa nội dung trong docs/.
---

# Sinh thẻ Anki từ kho

Quy trình này tồn tại vì thẻ tự sinh **trôi chất lượng rất nhanh**: bản đầu tiên của bộ
thẻ này có 15 câu yes/no đoán bừa vẫn đúng 50%, 34 thẻ bắt liệt kê nhiều ý không tự chấm
được, và 20 thẻ mặt sau dài quá 400 ký tự. Phải viết lại toàn bộ.

**Nguồn chuẩn là [`anki/README.md`](../../../anki/README.md) — đọc mục "Chuẩn viết thẻ"
trước khi sinh dòng đầu tiên.** Chuẩn đổi thì file đó đổi; skill này không chép lại để
khỏi lệch.

## Bước 1 — Xác định file cần làm

```bash
npm run anki:check
```

Nó in ra hai danh sách: file docs **chưa có thẻ nào** trỏ tới, và file **sửa sau lần sinh
thẻ gần nhất** (thẻ cũ có thể đã lệch nội dung).

Người dùng chỉ tên file cụ thể thì làm file đó. Không chỉ gì thì hỏi họ chọn trong danh
sách trên — đừng tự ôm hết.

## Bước 2 — Đọc trọn file nguồn

Đọc **toàn bộ** file, không đọc lướt. Thẻ tốt bám vào:

- dòng **Chốt** ở đầu — hầu như luôn thành một thẻ
- bảng **Trade-offs**, **Common Mistakes** — mỗi hàng thường là một thẻ tình huống
- **output thật** đã chạy (số đo, thông báo lỗi, kết quả truy vấn) — thẻ có số cụ thể là
  thẻ đáng nhớ nhất
- mục **FAQ** — vốn đã là câu hỏi, nhưng phải viết lại cho hết dạng yes/no

Bỏ qua: mục lục, Related Topics, References, phần "Cần trả lời" còn là checklist trống.

## Bước 3 — Sinh thẻ

Áp bốn luật trong `anki/README.md`. Ba lỗi hay mắc nhất khi sinh tự động:

| Đừng viết | Viết thế này |
|---|---|
| `Fact có join thẳng fact khác được không?` | `Cần ghép số của hai fact khác grain — làm thế nào cho đúng?` |
| `Bốn câu hỏi trước khi chọn incremental?` | tách thành 4 thẻ, mỗi thẻ một bẫy |
| `Test unique → FAIL 4. Dữ liệu sai hay test sai?` | `Test unique trả 4 dòng mà dữ liệu seed hoàn toàn đúng. Sai ở đâu?` |

Dạng câu hỏi cho ra thẻ tốt nhất: **triệu chứng quan sát được → hỏi nguyên nhân hoặc cách
sửa**. Người học phải tái tạo lại cơ chế, không nhận diện.

Danh sách và cú pháp thì làm **Cloze**, đừng bắt liệt kê trong Basic.

**Mặt sau bắt buộc kết thúc bằng đường dẫn nguồn**, rút gọn từ thư mục công nghệ:

```html
<br><small>reference/grain.md</small>
```

`anki:check` dựa vào đó để tính độ phủ. Thiếu là bị cảnh báo.

## Bước 4 — Ghi vào `anki/_pending.tsv`

**Không ghi thẳng vào file thẻ chính.** File chờ có **4 cột**, cột cuối là file đích:

```
mặt trước<TAB>mặt sau<TAB>tags<TAB>data-modeling-basic.tsv
```

Chọn file đích theo hai trục:

| Nội dung thuộc | Loại thẻ | File đích |
|---|---|---|
| `docs/data-modeling/**` | hỏi–đáp | `data-modeling-basic.tsv` |
| `docs/data-modeling/**` | danh sách, cú pháp | `data-modeling-cloze.tsv` |
| `docs/etl/dbt/**` | hỏi–đáp | `dbt-basic.tsv` |
| `docs/etl/dbt/**` | danh sách, cú pháp | `dbt-cloze.tsv` |

Chủ đề mới chưa có file thì tạo file mới với đủ 5 dòng header — chép mẫu từ file có sẵn,
đổi `#deck:` thành `KB::<Tên chủ đề>`.

Kỹ thuật, sai là Anki nhận hỏng:

- Phân cách bằng **tab thật**, mỗi thẻ đúng **một dòng** — xuống dòng dùng `<br>`
- Dấu `<` trong nội dung phải escape thành `&lt;` (`valid_from &lt; valid_to`)
- Trong file Cloze, dấu ngoặc nhọn Jinja phải viết entity: `&#123;&#123; ref() &#125;&#125;`
- Tags cách nhau bằng dấu cách, không dấu tiếng Việt

## Bước 5 — Kiểm rồi giao lại cho người dùng duyệt

```bash
npm run anki:check
```

Sửa hết lỗi và cảnh báo trước khi báo xong. Rồi nói rõ với người dùng:

- sinh bao nhiêu thẻ, từ file nào
- **mở `anki/_pending.tsv` để duyệt: xoá dòng nào không thích, sửa dòng nào cần sửa**
- duyệt xong thì `npm run anki:accept` rồi `npm run anki:push`

**Đừng tự chạy `anki:accept`.** Bước duyệt là của người dùng — đó là lý do file chờ tồn tại.

## Luật cứng

1. **Chỉ lấy từ file nguồn.** Không thêm kiến thức "bên ngoài" dù đúng — kho có luật một
   kiến thức một chỗ, và thẻ không phải chỗ để kiến thức mới xuất hiện lần đầu.
2. **Số liệu phải là output thật đã ghi trong docs.** Không làm tròn, không đoán, không
   tự tính lại. Chi tiết môi trường (tên catalog, host, port, phiên bản) tuyệt đối không
   bịa — xem [case study](../../../docs/etl/dbt/case-studies/ai-sinh-sai-ten-catalog-trino.md).
3. **File nguồn còn là khung** (mục "Cần trả lời" chưa viết) thì **không sinh thẻ** cho
   phần đó. Báo người dùng biết file đó chưa đủ chín.
