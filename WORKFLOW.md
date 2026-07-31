# Quy trình làm việc — từ "vừa học được" tới "đã thuộc"

Repo này có **ba tầng**, và mỗi tầng có một việc riêng:

| Tầng | Là gì | Nguồn sự thật? |
|---|---|---|
| `docs/**.md` | Kiến thức, viết đầy đủ, có ví dụ chạy được | ✅ **Đây là nguồn sự thật** |
| Site Docusaurus | Cách *đọc* lại kiến thức đó | ❌ dẫn xuất, build lại được |
| `anki/*.tsv` → Anki | Cách *nhớ* kiến thức đó | ❌ dẫn xuất, sinh lại được |

Nguyên tắc xuyên suốt: **sửa ở `docs/`, hai tầng kia sinh lại theo.** Không bao giờ sửa
ngược chiều.

---

## Toàn bộ lệnh

```bash
# ---- NỘI DUNG ----
npm start              # dev server localhost:3000, hot reload khi sửa .md
npm run lint           # bắt file mồ côi, thiếu sidebar_position, sai độ sâu
npm run build          # build tĩnh — chặn link gãy, YAML hỏng, category rỗng
npm run check          # lint + build, chạy trước khi commit
npm run catalog        # sinh lại docs/catalog.md

# ---- BỘ THẺ ANKI ----
npm run anki:check     # độ phủ + chất lượng thẻ + lỗi kỹ thuật
npm run anki:accept    # gộp thẻ đã duyệt từ _pending.tsv vào bộ chính
npm run anki:push      # đẩy thẳng vào Anki đang mở (không cần import tay)
npm run anki:push -- --dry     # xem trước, không ghi gì
npm run anki:push -- --prune   # đẩy + xoá thẻ trong Anki không còn trong .tsv
```

Hai skill dùng trong Claude Code:

| Lệnh | Làm gì |
|---|---|
| `/kb-add` | Thêm kiến thức mới vào `docs/` — định tuyến thư mục, sinh frontmatter, cập nhật mục lục |
| `/kb-cards` | Sinh thẻ Anki từ một file docs → `anki/_pending.tsv` để bạn duyệt |

---

## Vòng lặp thường ngày

```
  học được cái gì đó
        ↓
  /kb-add ─────────────► docs/<chủ đề>/<file>.md        ← nguồn sự thật
        ↓
  npm run check                                          ← site không gãy
        ↓
  /kb-cards ───────────► anki/_pending.tsv               ← thẻ chờ duyệt
        ↓
  MỞ _pending.tsv, XOÁ DÒNG DỞ, SỬA DÒNG CẦN SỬA         ← việc của bạn
        ↓
  npm run anki:accept ─► anki/*.tsv                      ← vào bộ chính
        ↓
  npm run anki:push ───► Anki đang mở                    ← học được ngay
```

Bước duyệt `_pending.tsv` là bước **không tự động hoá được**, và đó là chủ ý. Thẻ tự sinh
trôi chất lượng rất nhanh nếu không có ai chặn.

### 1. Thêm kiến thức

```
/kb-add
```

Skill chạy ba trục định tuyến của [`ROUTING.md`](ROUTING.md), sinh frontmatter, cập nhật
bốn mục lục, chạy lint. Xem [`CLAUDE.md`](CLAUDE.md) cho các luật cứng — nhất là luật
**không tự điền `verified_at`** và **chạy thật trước khi viết output**.

### 2. Sinh thẻ

```
/kb-cards
```

Không chỉ file nào thì nó chạy `anki:check` trước để hỏi bạn chọn. Nó ghi vào
`anki/_pending.tsv` — **không** ghi thẳng vào bộ thẻ chính.

Skill từ chối sinh thẻ cho file còn là khung (mục "Cần trả lời" chưa viết), và không sinh
thẻ cho `doc_type: cheatsheet` (trùng nội dung file gốc) hay `tutorial` (bài tập để *làm*,
không phải kiến thức để *nhớ*).

### 3. Duyệt — bước quan trọng nhất

Mở `anki/_pending.tsv`. Mỗi dòng là một thẻ, **4 cột** phân cách bằng tab:

```
mặt trước    mặt sau    tags    file-đích.tsv
```

- Thẻ dở → **xoá cả dòng**
- Thẻ gần đúng → **sửa thẳng trong file**
- Thẻ vào nhầm deck → sửa cột thứ 4

Không phải giải thích với ai. Xoá là xong.

### 4. Gộp và đẩy

```bash
npm run anki:accept    # gộp vào bộ chính, tự bỏ thẻ trùng mặt trước
npm run anki:check     # kiểm lần cuối
npm run anki:push      # vào Anki, Anki vẫn đang mở
```

---

## Bốn luật viết thẻ

Chi tiết và ví dụ trước/sau ở [`anki/README.md`](anki/README.md). Tóm tắt:

1. **Một thẻ một ý** — "bốn câu hỏi trước khi chọn `incremental`" phải là bốn thẻ
2. **Không câu hỏi đoán được** — cấm yes/no, cấm "A hay B"
3. **Đề không lộ đáp án** — đừng viết "→ FAIL 4" rồi hỏi "test sai hay dữ liệu sai"
4. **Mặt sau ngắn** — trung bình 150 ký tự, trần 300

`npm run anki:check` cưỡng chế cả bốn. Vi phạm là exit code khác 0.

---

## `anki:check` báo cáo những gì

```
KY THUAT        số cột, cú pháp cloze, ký tự < chưa escape, file đích không tồn tại
CHAT LUONG      yes/no, nhị phân, mặt sau quá dài, thiếu đường dẫn nguồn
DO PHU          file docs chưa có thẻ nào · file sửa sau lần sinh thẻ gần nhất
```

Mục **DO PHU** là thứ trả lời câu "tôi còn thiếu gì" — nó dò ngược từ dòng
`<small>đường-dẫn</small>` ở mặt sau mỗi thẻ. Vì thế mọi thẻ **bắt buộc** có dòng đó.

---

## Cài đặt lần đầu trên máy mới

```bash
# 1. Site
npm install

# 2. Anki desktop — bản chính thức, KHÔNG dùng apt (bản Ubuntu quá cũ)
cd /tmp
curl -L -o anki.tar.zst https://github.com/ankitects/anki/releases/download/25.02.7/anki-25.02.7-linux-qt6.tar.zst
tar --use-compress-program=unzstd -xf anki.tar.zst
cd anki-25.02.7-linux-qt6 && PREFIX="$HOME/.local" bash install.sh

# 3. Add-on AnkiConnect (để anki:push chạy được)
curl -L -o /tmp/ac.zip "https://ankiweb.net/shared/download/2055492159?v=2.1&p=66"
mkdir -p ~/.local/share/Anki2/addons21/2055492159
cd ~/.local/share/Anki2/addons21/2055492159 && unzip -o /tmp/ac.zip

# 4. Import bộ thẻ lần đầu: mở Anki, rồi
npm run anki:push
```

Kiểm AnkiConnect đã chạy: `ss -tlnp | grep 8765` phải thấy tiến trình `anki`.

---

## Khi hỏng

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `anki:push` báo không kết nối được | Anki chưa mở, hoặc chưa cài AnkiConnect. Kiểm `ss -tlnp \| grep 8765` |
| Bật Anki lên là tắt ngay | Đã có một bản đang chạy ẩn ở workspace khác. `pkill -f local/bin/anki` rồi mở lại |
| Mở Anki không thấy cửa sổ | Nó ở workspace khác — `hyprctl clients \| grep -i anki` để tìm |
| Deck chỉ hiện `KB`, không thấy deck con | Bấm dấu `+` bên trái chữ `KB` để xổ ra |
| Sửa mặt trước thẻ xong Anki có hai bản | Dùng `npm run anki:push -- --prune` để dọn bản cũ |
| Anki mở lên trống trơn | Sai profile. Anki bản tiếng Việt tạo profile tên `Người dùng 1`, không phải `User 1` |

Backup collection trước khi làm gì rủi ro:

```bash
cp ~/.local/share/Anki2/"Người dùng 1"/collection.anki2 ~/anki-backup/$(date +%F-%H%M).anki2
```

---

## Đồng bộ nhiều máy

Hai đường **khác nhau**, đừng nhầm:

| Đồng bộ gì | Bằng gì |
|---|---|
| Nội dung thẻ (nguồn) | `git` — file `.tsv` nằm trong repo |
| Tiến độ học, lịch ôn | **AnkiWeb** — nút *Đồng bộ* trong Anki |

Máy mới: `git clone` để có `.tsv`, đăng nhập AnkiWeb để có lịch học. Lần sync AnkiWeb đầu
tiên sẽ hỏi Upload hay Download — chọn nhầm là ghi đè mất một bên.

---

## Trạng thái hiện tại

- **313 thẻ** (390 card) — `KB::Data Modeling` 194 · `KB::dbt` 196
- **30/30 file docs** có nội dung đều đã có thẻ trỏ tới
- Anki 25.02.7 + AnkiConnect, cài ở `~/.local` (không cần sudo)
