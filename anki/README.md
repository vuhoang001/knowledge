# Bộ thẻ Anki sinh từ kho

313 thẻ (390 card), sinh từ nội dung `docs/`. Thư mục này nằm **ngoài** `docs/` nên không
lên site Docusaurus — nó là học liệu dẫn xuất, không phải nguồn sự thật.

| File | Note type | Deck | Số thẻ |
|---|---|---|---|
| `data-modeling-basic.tsv` | Basic | `KB::Data Modeling` | 143 |
| `data-modeling-cloze.tsv` | Cloze | `KB::Data Modeling` | 19 |
| `dbt-basic.tsv` | Basic | `KB::dbt` | 125 |
| `dbt-cloze.tsv` | Cloze | `KB::dbt` | 26 |

Cloze sinh nhiều card mỗi thẻ nên tổng card (390) lớn hơn tổng thẻ (313).

## Chuẩn viết thẻ

Bốn luật, áp cho mọi thẻ. Bản đầu tiên của bộ thẻ này vi phạm cả bốn và phải viết lại.

**1. Một thẻ một ý.** Không nhồi "bốn câu hỏi phải trả lời trước khi chọn `incremental`"
vào một mặt sau — tách thành bốn thẻ, mỗi thẻ một cái bẫy. Nhớ được 3/4 thì tự chấm đúng
hay sai? Không quyết được, và thẻ mất tác dụng đo lường.

**2. Không câu hỏi đoán được.** Cấm yes/no và cấm nhị phân "A hay B" — đoán bừa vẫn đúng
50%. Đổi thành câu hỏi có đáp án cụ thể:

> ❌ Bridge table có làm đổi grain của fact không?
> ✅ Thêm bridge table vào mô hình thì grain của fact thay đổi thế nào?

**3. Đề bài không được lộ đáp án.** Đây là lỗi tinh vi nhất:

> ❌ Đặt test `unique` lên `don_hang_id` → FAIL 4. Dữ liệu sai hay test sai?
> ✅ Test `unique` trên `don_hang_id` trả 4 dòng, mà dữ liệu seed hoàn toàn đúng. Sai ở đâu?

Bản sai vừa nhị phân vừa tự lộ hướng — thấy "FAIL 4" là đoán ra ngay "test sai".

**4. Mặt sau ngắn.** Trung bình hiện tại 150 ký tự, không thẻ nào vượt 300. Mặt sau dài
là dấu hiệu thẻ đang gánh nhiều ý — quay lại luật 1.

Câu hỏi tốt thường có dạng **tình huống → nguyên nhân/cách sửa**: đưa triệu chứng quan
sát được, bắt người học tái tạo lại cơ chế. Danh sách và cú pháp thì dùng Cloze thay vì
bắt liệt kê trong Basic.

## Import

**File → Import** trong Anki, chọn từng file. Header `#separator:tab`, `#notetype:`,
`#deck:`, `#tags column:3` nằm sẵn trong file nên Anki tự cấu hình.

Mặt sau mỗi thẻ có đường dẫn file nguồn ở dòng cuối, để lần ngược về kho khi thẻ chưa rõ.

## Quy ước nội dung

Thẻ bám sát nguồn, **không thêm kiến thức ngoài kho**:

- Số liệu đo được là **output thật** đã ghi trong `docs/`: OBT/STAR 0.76× và 10.23×,
  bridge table 1.800.000 vs 4.400.000, test grain `FAIL 4`, `state:modified+` 3 thay vì 4,
  `manifest.json` 16 node / 605 macro.
- Không thẻ nào chứa chi tiết môi trường bịa — tên catalog, host, port, phiên bản.
  Xem [luật cứng #2](../CLAUDE.md) và
  [case study](../docs/etl/dbt/case-studies/ai-sinh-sai-ten-catalog-trino.md).

## Cập nhật khi kho đổi

Sửa nội dung trong `docs/` thì thẻ ở đây **không tự đổi theo**. Sửa file `.tsv` rồi import
lại — Anki khớp theo trường đầu tiên, nên sửa **mặt sau** thì thẻ được cập nhật, còn sửa
**mặt trước** sẽ tạo thẻ mới và để lại thẻ cũ.

Chưa phủ: `data-quality`, Kafka, Flink, Iceberg, Trino, Airflow, SQL, Python — các file
đó mới ở mức khung.

## Kiểm tra trước khi import

```bash
cd anki

# moi dong dung 3 cot
awk -F'\t' 'FNR>5 && NF!=3 {print FILENAME": dong "FNR}' *.tsv

# moi the cloze co {{c1::...}}
awk -F'\t' 'FNR>5 && $1 !~ /\{\{c[0-9]+::/ {print FILENAME": dong "FNR}' *cloze.tsv

# mat sau qua dai — dau hieu the ganh nhieu y
awk -F'\t' 'FNR>5 && length($2)>300 {print FILENAME": dong "FNR}' *basic.tsv

# cau hoi yes/no — doan bua van dung 50%
awk -F'\t' 'FNR>5{print $1}' *basic.tsv | grep -E '(có|được|phải) [^?]*không\?$'
```
