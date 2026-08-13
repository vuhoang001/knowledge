# Bộ rule định tuyến

Trả lời đúng một câu hỏi: **một mẩu kiến thức mới thì đi vào đâu, và mang metadata gì.**

Cưỡng chế bằng `npm run lint` ([`scripts/lint-docs.mjs`](scripts/lint-docs.mjs)), chạy
trong CI trước `npm run build`. Rule không có thứ cưỡng chế thì sáu tháng nữa lại lệch —
sidebar sắp theo alphabet suốt bốn tháng mà không ai biết là ví dụ.

## Ba trục phân loại

Sai lầm dễ nhất là nhét mọi thứ vào một trường rồi tưởng đã phân loại. Ba trục dưới đây
**độc lập nhau** — một file luôn có cả ba, và không trục nào suy ra được trục khác.

| Trục | Trả lời | Quyết định | Trường |
|---|---|---|---|
| **Loại tài liệu** | Nó là *dạng* gì? | **Thư mục gốc** | `doc_type` |
| **Lĩnh vực** | Nó thuộc mảng nào? | Thư mục con cấp 1 | `domain` |
| **Loại tri thức** | Nó là *kiểu* hiểu biết nào? | Không quyết định chỗ — dùng để lọc | `category` |

`doc_type` và thư mục **phải khớp** — linter R12 chặn nếu khai một đằng để một nẻo.
Nhờ đó phân loại là thứ kiểm chứng được, không phải nhãn dán tuỳ hứng.

| `doc_type` | Bắt buộc nằm ở |
|---|---|
| `reference` | `docs/<chủ đề>/reference/` |
| `skill` | `docs/<chủ đề>/skills/` |
| `tutorial` | `docs/<chủ đề>/tutorials/` |
| `cheatsheet` | `docs/<chủ đề>/cheatsheets/` |
| `case-study` | `docs/<chủ đề>/case-studies/` |
| `faq` | `docs/faqs/` — toàn cục |
| `glossary` | `docs/glossary/` — toàn cục |
| `index` | trang chủ của bất kỳ thư mục nào |

## Trục 1 — Loại tài liệu quyết định thư mục gốc

Đi từ trên xuống, dừng ở dòng đầu tiên đúng:

| Hỏi | Đúng thì vào |
|---|---|
| Chưa hiểu, mới quăng về? | `inbox/` |
| Chạy được, có output dán lại được? | `docs/<chủ đề>/tutorials/` |
| Một sự cố thật đã debug xong? | `docs/<chủ đề>/case-studies/` |
| Bảng tra khi **đang làm**? | `docs/<chủ đề>/cheatsheets/` |
| Đoạn code chạy nguyên trạng, để copy? | `docs/<chủ đề>/examples/` |
| Định nghĩa một câu cho một thuật ngữ? | `docs/glossary/` |
| Câu hỏi cắt ngang **nhiều** chủ đề? | `docs/faqs/` |
| Giải thích *nó là gì, vì sao, đánh đổi ra sao*? | `docs/<chủ đề>/` |

Dòng cuối là mặc định. Nếu phân vân giữa `docs/` và `tutorials/`: có **output thật dán
vào** thì là tutorial, không thì là docs.

## Trục 2 — Lĩnh vực quyết định thư mục con

`docs/<domain>/` với `domain` khớp trường frontmatter cùng tên: `data-engineering`,
`backend`, `devops`, `ai`, …

Gắn với một công nghệ cụ thể thì xuống một tầng: `docs/<domain>/<công nghệ>/`.
Ví dụ `docs/etl/dbt/`.

**Tối đa 3 thư mục dưới `docs/`** (R9) — `docs/<lĩnh vực>/<công nghệ>/<component>.md`.
Tầng thứ ba **chỉ dành cho nhóm `doc_type`** (`tutorials/`, `case-studies/`,
`cheatsheets/`) hoặc tầng học — không dành cho component kỹ thuật. Một component kỹ
thuật cần thêm tầng nghĩa là nó nên **tách thành công nghệ riêng, ngang hàng**:
`docs/etl/kafka-connect/` chứ không phải `docs/etl/kafka/connect/`.

**Đánh đổi đã chấp nhận:** trước đây trần là 2 thư mục. Nới lên 3 để mỗi công nghệ có
`tutorials/`, `case-studies/`, `cheatsheets/` của riêng nó — mở dbt là thấy luôn bài tập
và case study của dbt, không phải đi tìm ở thư mục toàn cục. Cái mất là cây thư mục sâu
hơn một tầng.

## Trục 3 — Năm nhóm chuẩn, giống nhau ở mọi chủ đề

Mỗi chủ đề — `data-modeling`, `etl/dbt`, `etl/kafka`, `storage/iceberg` — dùng **đúng
một bộ năm nhóm**. Không có chủ đề nào tự nghĩ ra cách chia riêng.

| Nhóm | Trả lời câu hỏi | `doc_type` |
|---|---|---|
| `reference/` | Nó **là gì**, vì sao, đánh đổi ra sao | `reference` |
| `skills/` | Gặp tình huống X thì **xử lý ra sao** | `skill` |
| `tutorials/` | Chạy thật, có output dán lại | `tutorial` |
| `cheatsheets/` | Tra nhanh khi **đang làm** | `cheatsheet` |
| `case-studies/` | Sự cố thật đã debug, kèm giả thuyết sai lúc đầu | `case-study` |

**Ranh giới Tài liệu ↔ Kỹ năng.** Một file thuộc `skills/` khi nó **giả định** phần
`reference/` đã nắm và chỉ xử lý một tình huống cụ thể. Ví dụ ở data-modeling: `grain`
và `fact-and-dimension` là reference — không biết chúng thì không đọc được gì tiếp;
`SCD` và `junk dimension` là skill — cả hai đều bắt đầu bằng câu "đã có fact và dimension
rồi, giờ gặp trường hợp này thì làm gì".

Thứ tự học nằm ở `sidebar_position` **trong từng nhóm**, đánh lại từ 1.

**Chỉ tạo thư mục khi có nội dung.** Chủ đề chưa có case study thì chưa cần
`case-studies/` — R11 chặn thư mục có `_category_.json` mà rỗng.

## Thứ tự học phải khai ở hai chỗ, và phải khớp

| Chỗ | Cách khai |
|---|---|
| Bảng mục lục trong `index.md` | cột `#` |
| Sidebar | `sidebar_position` trong frontmatter |

Thiếu `sidebar_position` là Docusaurus sắp theo alphabet — im lặng, không lỗi nào báo.
Linter chặn (R5, R10).

## Frontmatter

```yaml
---
title: Junk dimension và cột cardinality thấp
sidebar_position: 2              # khớp cột # trong index.md
description: "Một câu — thứ dùng để tìm lại file này"
tags: [junk-dimension, dimension, kimball]
domain: data-engineering
category: concept                # TRI THUC: concept | technology | pattern | tool
doc_type: reference              # TAI LIEU: quyet dinh thu muc, phai khop (R12)
status: draft                    # draft | review | stable
difficulty: intermediate         # beginner | intermediate | advanced
verified_at:                     # TRỐNG cho tới khi chạy tay và thấy output
updated: 2026-07-31
---
```

`description` chứa dấu `:` thì **phải quote** — không quote là build chết (R3).

## Rule linter cưỡng chế

**ERROR — chặn CI:**

| # | Rule |
|---|---|
| R1 | Frontmatter đủ trường bắt buộc |
| R2 | `category` thuộc trục tri thức; `status`/`difficulty` hợp lệ |
| R12 | `doc_type` có, hợp lệ, và **khớp thư mục** |
| R3 | `description` chứa `:` phải quote |
| R4 | `verified_at` trống hoặc đúng dạng `YYYY-MM-DD` |
| R5 | File nội dung phải có `sidebar_position` |
| R6 | Không mồ côi — `index.md` cùng thư mục phải trỏ tới |
| R9 | Tối đa 3 thư mục dưới `docs/` |
| R10 | `sidebar_position` không trùng trong cùng thư mục |
| R11 | Thư mục có `_category_.json` phải có ít nhất một `.md` |

**WARN — không chặn, là nợ cần trả dần:**

| # | Rule |
|---|---|
| R15 | Mỗi file `reference/`/`skills/` có ít nhất một case study minh hoạ |
| R7 | File có trong manifest `docs/index.md` |
| R8 | File có mục `## Related Topics` |

## Bản dịch tiếng Anh — `npm run lint:i18n`

`lint-docs.mjs` chỉ `walk('docs')`, nên **cây `i18n/en/` vô hình với toàn bộ R1–R16 ở
trên.** `scripts/lint-i18n.mjs` bù đúng chỗ đó, với bộ rule riêng:

**ERROR:**

| # | Rule | Vì sao |
|---|---|---|
| I1 | Mỗi file `docs/` phải có file tương ứng trong `i18n/en/…/current/` | Nội dung thì fallback về vi, **nhưng link `.md` tương đối thì không** — file en đã dịch trỏ tới file en không tồn tại là `onBrokenLinks:'throw'` giết build |
| I2 | `updated` của bản en phải khớp bản vi | Sửa bản vi mà không sửa bản en = bản en thành tài liệu sai, im lặng |
| I4 | `sidebar_position` phải khớp | Lệch thì sidebar en sắp khác vi, không lỗi nào báo — cùng cái bẫy của R5 |
| I5 | Khối code phải copy **nguyên byte**, chỉ dòng comment được dịch | Luật cứng #2. Đây đúng là chỗ AI "giúp" viết lại `SHOW CATALOGS` thành `SHOW SCHEMAS` |
| I6 | `verified_at` phải bằng bản vi | Luật cứng #1 — bản dịch không tạo ra bằng chứng mới |
| I7 | File en không được mồ côi | Bản vi đã đổi tên hoặc bị xoá |
| I9 | Số `<details>` phải cân, và khớp bản vi | `<details>` thiếu thẻ đóng là MDX chết — nhưng chỉ `npm run build` thấy, mà build mất 30 giây. Rule này bắt trong 1 giây. Nhắc `<details>` trong backtick không tính |

**WARN:**

| # | Rule |
|---|---|
| I8 | File còn là stub (`i18n_status: untranslated`) — thước đo tiến độ |
| I3 | `description` còn nguyên tiếng Việt trong file đã bỏ nhãn stub |

Ba ngoại lệ của I5, cả ba đều có lý do:

- **`mermaid`** được miễn — nhãn node là văn xuôi nằm trong fence, không phải output thật.
  Nhưng số lượng và thứ tự khối vẫn bị bắt.
- **Comment được dịch** — cả dòng lẫn cuối dòng (`which cd   # không thấy vì cd không phải file`).
  Lệnh thì không. Dấu comment **theo ngôn ngữ của fence**: `#` cho bash/python/yaml,
  `--` cho sql, `//` cho js/cs. Cố ý không bỏ bừa `--` ở mọi nơi — nếu không thì
  `npm run lint -- --locale en` trong khối bash bị cắt mất một nửa.
- **Khối ```` ```text ```` và khối không khai ngôn ngữ bị so nguyên văn**, không bỏ comment
  gì cả — đó là output thật dán lại, output không có comment.
- **Fence đánh nhãn `i18n-prose`** được miễn — dành cho sơ đồ ASCII, learning path, thứ
  nằm trong ```` ```text ```` nhưng là văn xuôi chứ không phải output. Mặc định **không**
  được miễn; phải gõ nhãn vào **cả bản vi lẫn bản en**:

  ````text
  ```text i18n-prose
  Shell là gì   ← bắt đầu ở đây
  ```
  ````

  Nhãn không lọt ra HTML. Bắt tác giả khai báo ý định ngay trong nguồn là cố ý — mặc định
  phải là "khối code là bằng chứng, cấm sửa".

`catalog.md` được miễn các rule nội dung vì `scripts/gen-catalog.mjs` sinh nó — dịch tay
sẽ bị ghi đè lần chạy `npm run catalog` tiếp theo. Nó **vẫn phải tồn tại** trong cây en
vì `docs/index.md` trỏ tới.

### Anchor vỡ trong lúc dịch dở — bình thường, nhưng phải về 0

Dịch một tiêu đề là đổi anchor của nó (`#khi-nào-không-nên-dùng-pattern` →
`#when-not-to-use-a-pattern`). Các file **còn là stub** vẫn trỏ anchor tiếng Việt, nên
`npm run build` sẽ báo `broken anchors` cho tới khi dịch xong hết. `onBrokenAnchors: 'warn'`
nên build không chết.

**Tiêu chí nghiệm thu cuối:** dịch hết 235 file rồi build phải **không còn** cảnh báo
anchor nào. Còn cảnh báo = có file dịch mà quên sửa anchor trỏ tới tiêu đề đã đổi tên.

```bash
npm run build 2>&1 | grep -A100 "broken anchors"
```

### Thêm file mới thì phải sinh stub

```bash
npm run i18n:stub     # copy mọi file docs/ chưa có bản en, dán nhãn untranslated
npm run lint:i18n     # 0 error, và xem còn bao nhiêu stub
```

Chạy lại bao nhiêu lần cũng được — file đã có thì bỏ qua, **không ghi đè bản dịch**.
Dịch xong một file thì **xoá dòng `i18n_status: untranslated`** — đó là cách linter biết.

### Ràng buộc mới trên `index.md` của các nhóm

30 file `index.md` trong `reference/`, `skills/`, `tutorials/`, `cheatsheets/`,
`case-studies/` giờ có thêm `sidebar_key` (ví dụ `kafka-reference`). Sáu subtree dùng lại
cùng nhãn category (`Tài liệu`, `Kỹ năng`, `Bài tập`…) nên không có key này thì Docusaurus
**không sinh nổi** file dịch sidebar và `write-translations` chết. Thêm nhóm mới cho một
công nghệ mới thì phải thêm `sidebar_key` cho nó.

## Ví dụ áp dụng — khi bắt đầu viết Kafka

Kafka đã có mục lục dự kiến 10 mục trong [`docs/etl/kafka/index.md`](docs/etl/kafka/index.md).
Chạy bộ rule lên nó:

**Bước 1 — Trục 1 tách mục 10 ra khỏi `docs/`.** "Bài tập, chạy thật có output" là
`tutorials/`, không phải `docs/`. Nên mục 10 thành `docs/tutorials/kafka-lab.md`, còn
`kafka/index.md` chỉ trỏ tới — đúng như dbt đang làm với `dbt-lab-duckdb.md`.

**Bước 2 — Trục 2 xác định chỗ.** `domain: data-engineering`, gắn với một công nghệ cụ
thể → `docs/etl/kafka/<component>.md`. Đã là 2 thư mục, hết quota R9.

**Bước 3 — Trục 3 hỏi có cần chia tầng không. Câu trả lời là KHÔNG.** Chín component còn
lại là các bộ phận song song của cùng một công cụ, đọc 01→09; không cái nào là nền của
cái nào theo kiểu `fact-and-dimension` ↔ `junk-dimension`. Cộng thêm R9 đã hết quota.
Kafka giữ **phẳng**, giống dbt.

```text
docs/etl/kafka/
  index.md                      # cột # 01–09, trỏ sang tutorials cho bài tập
  what-is-kafka.md              sidebar_position: 1
  topic-partition-offset.md     sidebar_position: 2
  producer.md                   sidebar_position: 3
  consumer-groups.md            sidebar_position: 4
  replication-durability.md     sidebar_position: 5
  retention-compaction.md       sidebar_position: 6
  schema-registry.md            sidebar_position: 7
  kafka-connect-cdc.md          sidebar_position: 8
  operations.md                 sidebar_position: 9
docs/tutorials/kafka-lab.md     sidebar_position: 2
```

**Mỗi lần thêm một file, sửa đúng ba chỗ:**

1. `sidebar_position` trong frontmatter của file mới
2. cột `#` trong `docs/etl/kafka/index.md` — phải khớp số ở bước 1
3. một dòng trong manifest `docs/index.md`

Quên bước 1 → sidebar sắp alphabet (R5 chặn). Quên bước 2 → mồ côi (R6 chặn). Quên bước
3 → R7 cảnh báo.

**Khi nào Kafka mới cần tách:** nếu `schema-registry.md` hay `kafka-connect-cdc.md` phình
tới mức cần nhiều file, chúng **không** thành thư mục con của `kafka/` — R9 chặn, và
đúng về bản chất: Schema Registry và Kafka Connect là hệ thống triển khai riêng, không
phải bộ phận bên trong broker. Chúng lên thành `docs/etl/schema-registry/` và
`docs/etl/kafka-connect/`, **ngang hàng** với `kafka/`.

## Rule phủ case study (R15)

Mỗi file trong `reference/` và `skills/` **nên có ít nhất một case study minh hoạ**.

Lý do: file kỹ thuật bao giờ cũng có bảng *Trade-offs* và *Common Mistakes* — nhưng bảng
đánh đổi đọc xong quên ngay. Thứ nhớ được là **một ca hỏng cụ thể có số**. Case study là
chỗ biến một dòng cảnh báo thành một câu chuyện có triệu chứng đo được.

**Cách linter đối chiếu:** nó đọc mọi link trong `case-studies/*.md`; file nào trong
`reference/` hoặc `skills/` **không được case study nào trỏ tới** thì bị cảnh báo. Nghĩa
là case study **bắt buộc phải link tới kỹ thuật nó minh hoạ** — không link thì coi như
chưa phủ.

Mức WARN chứ không ERROR: viết case study là việc nội dung, không phải việc cấu trúc.
Nhưng nó hiện trong mỗi lần chạy CI nên khoảng trống không biến mất khỏi tầm mắt.

Khuôn một case study — theo đúng mạch này để đọc bài nào cũng thấy quen:

| Mục | Nội dung |
|---|---|
| Nhãn | Sự cố thật hay tình huống dựng lại — **ghi rõ** |
| Bối cảnh | Mô hình và dữ liệu, chạy được |
| Triệu chứng | Con số sai, **chạy thật** |
| Giả thuyết sai lúc đầu | Đã nghi gì, vì sao sai — chỗ mất thời gian nằm ở đây |
| Nguyên nhân thật | Có bằng chứng |
| Vì sao không test nào bắt được | Bảng test và kết quả |
| Cách sửa | Chạy thật, có số đối chứng |
| Dấu hiệu nhận ra sớm | Query kiểm được ngay hôm nay |

## Kiểm kê kho

```bash
npm run lint -- --inventory
```

Trả lời "kho đang có gì" theo hai trục — bao nhiêu case study, bao nhiêu reference thuộc
data-engineering, và **bao nhiêu file đã thật sự kiểm chứng bằng tay**. Con số cuối là
thứ đáng nhìn nhất: `verified_at` có ngày mới tính.
