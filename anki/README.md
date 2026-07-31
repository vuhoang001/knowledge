# Bộ thẻ Anki sinh từ kho

215 thẻ, sinh từ nội dung `docs/`. Thư mục này nằm **ngoài** `docs/` nên không lên site
Docusaurus — nó là học liệu dẫn xuất, không phải nguồn sự thật.

| File | Note type | Deck | Số thẻ |
|---|---|---|---|
| `data-modeling-basic.tsv` | Basic | `KB::Data Modeling` | 111 |
| `data-modeling-cloze.tsv` | Cloze | `KB::Data Modeling` | 31 |
| `dbt-basic.tsv` | Basic | `KB::dbt` | 54 |
| `dbt-cloze.tsv` | Cloze | `KB::dbt` | 19 |

## Import

**File → Import** trong Anki, chọn từng file. Header `#separator:tab`, `#notetype:`,
`#deck:`, `#tags column:3` nằm sẵn trong file nên Anki tự cấu hình — không phải chọn tay.

Import **cả 4 file**; hai file cloze cần note type **Cloze** có sẵn (Anki tạo mặc định).

Mặt sau mỗi thẻ có đường dẫn file nguồn ở dòng cuối, để lần ngược về kho khi thẻ chưa đủ rõ.

## Quy ước nội dung

Thẻ bám sát nguồn, **không thêm kiến thức ngoài kho**:

- Số liệu đo được (OBT/STAR = 0.76× và 10.23×, bridge table 1.800.000 vs 4.400.000,
  test grain FAIL 4) là **output thật** đã ghi trong `docs/`.
- Không thẻ nào chứa chi tiết môi trường bịa — tên catalog, host, port, phiên bản.
  Xem [luật cứng #2](../CLAUDE.md) và
  [case study](../docs/etl/dbt/case-studies/ai-sinh-sai-ten-catalog-trino.md).
- Bốn file dbt còn ở dạng khung (`project-structure`, `sources-seeds-snapshots`,
  `macros-jinja-packages`, `docs-and-lineage`) chỉ được rút thẻ ở phần đã viết chắc,
  không rút từ mục *Cần trả lời*.

## Cập nhật khi kho đổi

Sửa nội dung trong `docs/` thì thẻ ở đây **không tự đổi theo**. Sửa file `.tsv` tương ứng
rồi import lại — Anki khớp theo trường đầu tiên, nên sửa **mặt sau** thì thẻ được cập
nhật, còn sửa **mặt trước** sẽ tạo thẻ mới và để lại thẻ cũ.

Chưa phủ: `data-quality`, Kafka, Flink, Iceberg, Trino, Airflow, SQL, Python — các file
đó mới ở mức khung.

## Kiểm tra file trước khi import

```bash
# moi dong phai co dung 3 cot
awk -F'\t' 'FNR>5 && NF!=3 {print FILENAME": dong "FNR" co "NF" cot"}' anki/*.tsv

# moi the cloze phai co {{c1::...}}
awk -F'\t' 'FNR>5 && $1 !~ /\{\{c[0-9]+::/ {print FILENAME": dong "FNR}' anki/*cloze.tsv
```
