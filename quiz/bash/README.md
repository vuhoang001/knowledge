# Bộ câu hỏi ôn tập — Bash

12 chủ đề, mỗi chủ đề **60 câu** (10 dễ / 20 trung bình / 30 khó) = **720 câu**.

Thư mục này nằm **ngoài `docs/`** nên không lên site Docusaurus — giống `anki/`, nó phục
vụ việc ôn tập chứ không phải nội dung tri thức. Mỗi chủ đề khớp một-một với một file
trong `docs/bash/reference/` hoặc `docs/bash/skills/`.

## Cấu trúc file

```json
{
  "topic": "quoting-va-expansion",
  "title": "Quoting và expansion",
  "group": "reference",
  "source": "docs/bash/reference/quoting-va-expansion.md",
  "counts": { "easy": 10, "medium": 20, "hard": 30 },
  "questions": [
    {
      "id": "quote-e01",
      "level": "easy",
      "question": "Ba mức nháy trong bash là gì?",
      "answer": "Nháy đơn (literal tuyệt đối), nháy kép ($var vẫn nở nhưng không word-split/glob), và không nháy (nở + word-split + glob)."
    }
  ]
}
```

| Trường | Nghĩa |
|---|---|
| `topic` | Khớp tên file trong `docs/bash/` |
| `group` | `reference` hoặc `skills` |
| `source` | File gốc — mọi câu hỏi rút từ đó, không bịa thêm |
| `id` | `<prefix>-<e\|m\|h><số>` — ổn định, dùng làm khoá khi chấm điểm |
| `level` | `easy` · `medium` · `hard` |

## Ba mức khó nghĩa là gì

| Mức | Kiểm cái gì |
|---|---|
| `easy` | Nhớ định nghĩa, nhận diện cú pháp, đọc lại được quy tắc |
| `medium` | Áp dụng vào tình huống, so sánh đánh đổi, chỉ ra lỗi trong đoạn code |
| `hard` | Chẩn đoán có chi tiết cụ thể, giải thích *vì sao script hỏng trong im lặng*, hoặc **dự đoán chính xác output/exit code** |

Phần lớn câu `hard` lấy hành vi và con số **chạy thật** từ file nguồn (bash 5.3.9) — trả
lời được nghĩa là nhớ được *bash làm gì thật*, không chỉ nhớ khái niệm. Ví dụ: `return
300` trả về gì? `false | true; echo $?` in ra gì? `for line in $(cat)` sai ở đâu?

## Danh sách chủ đề

Xem [`index.json`](index.json) — có đường dẫn file và số câu từng mức.

**Tài liệu (6):** shell-la-gi · streams-va-redirection · quoting-va-expansion ·
exit-code-va-control-flow · file-permissions · process-va-job-control

**Kỹ năng (6):** text-processing · find-va-xargs · variables-arrays-expansion ·
conditionals-va-loops · functions · viet-script-an-toan

## Dùng thế nào

```bash
# doc 5 cau kho ngau nhien cua mot chu de
jq -r '.questions[] | select(.level=="hard") | "\(.id)  \(.question)"' quiz/bash/quoting-va-expansion.json | shuf -n 5

# gop toan bo thanh mot file
jq -s '{total: (map(.questions | length) | add), topics: .}' quiz/bash/*.json > /tmp/all.json

# dem cau theo muc tren toan bo
jq -r '.questions[].level' quiz/bash/*.json | sort | uniq -c
```

## Quan hệ với `anki/`

| | `anki/` | `quiz/` |
|---|---|---|
| Mục đích | Nhớ lại chủ động, lặp ngắt quãng | Tự kiểm tra, phỏng vấn |
| Định dạng | TSV, nạp vào Anki | JSON, đọc bằng script |
| Độ dài đáp án | Một ý ngắn | 1–3 câu, có cú pháp/output |
| Phân mức khó | Không | Có |

Hai bộ **không thay thế nhau**: thẻ Anki để thuộc, bộ câu hỏi này để biết mình đã hiểu
tới đâu.
