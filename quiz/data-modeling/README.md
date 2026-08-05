# Bộ câu hỏi ôn tập — Data Modeling

29 chủ đề, mỗi chủ đề **60 câu** (10 dễ / 20 trung bình / 30 khó) = **1.740 câu**.

Thư mục này nằm **ngoài `docs/`** nên không lên site Docusaurus — giống `anki/`, nó phục
vụ việc ôn tập chứ không phải nội dung tri thức.

## Cấu trúc file

Mỗi chủ đề một file `<topic>.json`, khớp một-một với file trong `docs/data-modeling/`:

```json
{
  "topic": "junk-dimension",
  "title": "Junk dimension và cột cardinality thấp",
  "group": "skills",
  "source": "docs/data-modeling/skills/junk-dimension.md",
  "counts": { "easy": 10, "medium": 20, "hard": 30 },
  "questions": [
    {
      "id": "junk-e01",
      "level": "easy",
      "question": "Junk dimension là gì?",
      "answer": "Một bảng gộp nhiều cột cardinality thấp thành một bảng tổ hợp và một khoá trong fact."
    }
  ]
}
```

| Trường | Nghĩa |
|---|---|
| `topic` | Khớp tên file trong `docs/data-modeling/` |
| `group` | `reference` hoặc `skills` |
| `source` | File gốc — mọi câu hỏi rút từ đó, không bịa thêm |
| `id` | `<topic>-<e\|m\|h><số>` — ổn định, dùng làm khoá khi chấm điểm |
| `level` | `easy` · `medium` · `hard` |

## Ba mức khó nghĩa là gì

| Mức | Kiểm cái gì |
|---|---|
| `easy` | Nhớ định nghĩa, nhận diện khái niệm, đọc lại được luật |
| `medium` | Áp dụng vào tình huống, so sánh đánh đổi, chỉ ra lỗi |
| `hard` | Chẩn đoán có số cụ thể, giải thích *vì sao test không bắt được*, quyết định thiết kế |

Phần lớn câu `hard` lấy số từ các case study đã chạy thật trên DuckDB — trả lời được
nghĩa là nhớ được **con số**, không chỉ nhớ khái niệm.

Tỷ lệ 10-20-30 là có chủ ý: phần `easy` chỉ để khởi động, còn giá trị thật nằm ở hai
tầng sau. Nhiều câu `hard` là **tình huống chẩn đoán** ("cho triệu chứng X, ba giả thuyết
và cách loại trừ") hoặc **thiết kế** ("trình bày lộ trình sửa trên hệ đang chạy") — chúng
không có đáp án tra được trong một dòng của notes.

## Danh sách chủ đề

Xem [`index.json`](index.json) — có đường dẫn file và số câu từng mức.

**Tài liệu (7):** grain · fact-and-dimension · surrogate-key · design-process ·
star-snowflake-obt · date-dimension · bus-architecture

**Kỹ năng (22):** scd · scd-change-detection · junk-dimension · mini-dimension ·
role-playing-dimension · conformed-dimension · bridge-table · degenerate-dimension ·
hierarchy · late-arriving · aggregate-fact-table · multi-currency-uom · audit-dimension ·
null-handling · conformed-facts · dimension-attribute-design · allocated-facts ·
centipede-fact · ytd-timespan-facts · behavior-dimension · heterogeneous-schema ·
real-time-fact

## Dùng thế nào

```bash
# doc 5 cau kho ngau nhien cua mot chu de
jq -r '.questions[] | select(.level=="hard") | "\(.id)  \(.question)"' quiz/data-modeling/scd.json | shuf -n 5

# gop toan bo thanh mot file
jq -s '{total: (map(.questions | length) | add), topics: .}' quiz/data-modeling/*.json > /tmp/all.json

# dem cau theo muc tren toan bo
jq -r '.questions[].level' quiz/data-modeling/*.json | sort | uniq -c
```

## Quan hệ với `anki/`

| | `anki/` | `quiz/` |
|---|---|---|
| Mục đích | Nhớ lại chủ động, lặp ngắt quãng | Tự kiểm tra, phỏng vấn |
| Định dạng | TSV, nạp vào Anki | JSON, đọc bằng script |
| Độ dài đáp án | Một ý ngắn | 1–3 câu, có số |
| Phân mức khó | Không | Có |

Hai bộ **không thay thế nhau**: thẻ Anki để thuộc, bộ câu hỏi này để biết mình đã hiểu
tới đâu.
