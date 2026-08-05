---
title: Pipeline xanh giả — lỗi giữa pipe bị nuốt
sidebar_position: 2
description: "Exit code của pipeline mặc định là của lệnh cuối nên lỗi ở giữa bị nuốt — script báo thành công trong khi bước quan trọng đã hỏng."
tags: [case-study, exit-code, pipefail, bash]
domain: devops
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-05
---

# Pipeline xanh giả — lỗi ở giữa pipe bị nuốt

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. **Mọi lệnh và output chạy thật trên bash 5.3.9.**

> **Chốt:** exit code của một pipeline mặc định là exit code của lệnh **cuối** — nên nếu bước quan trọng nằm ở **giữa** pipe và nó hỏng, pipeline vẫn "xanh" (exit 0). `set -e` không cứu được vì nó chỉ nhìn exit code cuối cùng đó. Cần `set -o pipefail`.

## Bối cảnh

Một script backup có `set -e` ở đầu, tác giả coi như "đã an toàn — lỗi nào cũng dừng". Bước cốt lõi là dump database rồi nén:

```bash
#!/usr/bin/env bash
set -e

pg_dump -h db.internal -U app appdb | gzip > backup.sql.gz
aws s3 cp backup.sql.gz s3://backups/appdb/
echo "Backup thanh cong"
```

Nhìn thì hợp lý: `set -e` dừng script khi có lỗi, nên nếu `pg_dump` chết thì script sẽ dừng trước khi upload file rỗng lên S3. Trên thực tế thì không.

## Triệu chứng

`pg_dump` thất bại (sai tham số, DB không tồn tại, mất kết nối) nhưng script **vẫn chạy tiếp**: nó upload `backup.sql.gz` — một file gần như rỗng — lên S3, in `Backup thanh cong`, và thoát với exit code 0. Cron coi là thành công. Sáu tháng sau cần restore mới phát hiện toàn bộ backup là rác.

Không cần Postgres để tái hiện lõi của vấn đề — thay `pg_dump` bằng `false` (lệnh luôn hỏng):

```bash
false | gzip > out.gz; echo "exit=$?"
```

Chạy thật:

```
exit=0
```

Pipeline "thành công" dù `false` hỏng. File nén ra vẫn có kích thước — nó nén một stream rỗng:

```bash
stat -c '%s' out.gz
```

```
20
```

20 byte: đó là header gzip của một file rỗng. Đúng thứ mà `backup.sql.gz` chứa khi `pg_dump` chết. Một biến thể khác cho thấy điều tương tự — lệnh giữa hỏng, `cat` cuối thành công, exit về 0:

```bash
ls /khong-ton-tai-xyz 2>/dev/null | cat; echo "exit=$?"
```

```
exit=0
```

## Giả thuyết sai lúc đầu

| Giả thuyết | Vì sao nghĩ vậy | Vì sao sai |
|---|---|---|
| `gzip` bị lỗi | File ra rỗng/hỏng, nghi thằng cuối pipe | `gzip` chạy đúng — nó nén thành công cái stream rỗng nhận được |
| Ổ đĩa đầy nên ghi hụt | File nhỏ bất thường | `df` còn trống; file nhỏ vì **đầu vào** rỗng, không phải ghi hụt |
| Sai quyền ghi | File "không có nội dung" | Ghi được bình thường, exit 0 chứng minh không phải quyền |
| `set -e` bị tắt ở đâu đó | Script không dừng dù có lỗi | `set -e` vẫn bật — nó chỉ **không thấy** lỗi ở giữa pipe |

Tất cả đều nhìn vào thằng cuối pipe hoặc môi trường ghi file. Thủ phạm là **ngữ nghĩa exit code của pipeline**.

## Nguyên nhân thật

Exit code của một pipeline `a | b | c` mặc định bằng exit code của **lệnh cuối cùng** (`c`). POSIX quy định vậy, bash theo mặc định. `gzip` nhận được EOF sớm, nén xong, thoát 0 → cả pipeline thoát 0. Lỗi của `pg_dump` (hay `false`) ở giữa **bị nuốt hoàn toàn**.

Vì `set -e` chỉ hành động dựa trên exit code của cả pipeline, và exit code đó là 0, nên `set -e` không có gì để bắt:

```bash
bash -c 'set -e; false | gzip > out.gz; echo "sau pipe van chay, exit=$?"'
```

```
sau pipe van chay, exit=0
```

Dòng sau pipe vẫn in ra. `set -e` không cứu được vì không có "lỗi" nào theo góc nhìn của nó.

### Biến thể anh em: biến gán trong `while` của pipe rồi mất

Cùng gốc rễ "vế của pipe chạy tách biệt", một cái bẫy hay đi kèm: đếm dòng bằng `while` sau pipe.

```bash
bash -c 'count=0; seq 1 5 | while read x; do count=$((count+1)); done; echo "count = $count"'
```

```
count = 0
```

`count` vẫn là 0 dù vòng lặp chạy 5 lần. Lý do: mỗi vế của pipe chạy trong **subshell** riêng. Vế `while` tăng `count` trong subshell của nó; subshell thoát, biến biến mất, `count` của shell cha không đổi. (Lưu ý: bash có `shopt -s lastpipe` chạy vế cuối trong shell cha — nhưng nó chỉ bật khi job control tắt, nên đừng dựa vào nó.)

## Vì sao khó phát hiện

- **Không có lỗi nào in ra.** Exit 0, không stderr từ pipeline, cron báo xanh. Không có gì để mà cảnh giác.
- **`set -e` tạo cảm giác an toàn giả.** Ai cũng nghĩ "có `set -e` rồi, lỗi tự dừng" — đúng cho lệnh đơn, sai cho pipeline.
- **File ra vẫn tồn tại và có kích thước.** 20 byte trông giống "file nhỏ" hơn là "file hỏng"; `ls -l` không tố cáo gì.
- **Nghi phạm hiển nhiên là thằng cuối.** Output hỏng → nhìn lệnh tạo ra output (`gzip`), trong khi lỗi ở thằng đầu.
- **Triệu chứng lệch thời gian.** Backup hỏng hôm nay, chỉ lộ khi cần restore nhiều tháng sau.

## Cách sửa

**1. Bật `set -o pipefail`.** Với `pipefail`, exit code của pipeline là exit code của lệnh **cuối cùng khác 0** — tức bất kỳ vế nào hỏng cũng làm cả pipeline hỏng.

```bash
bash -c 'set -o pipefail; false | gzip > out.gz; echo "exit=$?"'
```

```
exit=1
```

Giờ ghép với `set -e` thì script dừng đúng lúc:

```bash
bash -c 'set -e -o pipefail; false | gzip > out.gz; echo "dong nay KHONG in ra"'; echo "script chet, exit=$?"
```

```
script chet, exit=1
```

Dòng echo trong pipe không in ra — script chết ngay tại pipeline. Đây là combo nên đặt đầu mọi script:

```bash
set -euo pipefail
```

**2. Cần biết vế nào hỏng thì đọc `${PIPESTATUS[@]}`.** Mảng này giữ exit code của **từng** vế pipeline vừa chạy, theo thứ tự:

```bash
bash -c 'false | gzip > out.gz; echo "PIPESTATUS = ${PIPESTATUS[@]}"'
```

```
PIPESTATUS = 1 0
```

`1 0` = vế đầu (`false`) hỏng, vế sau (`gzip`) ổn. Dùng để log chính xác bước nào chết.

**3. Với `while` mất biến, tránh pipe — đưa nguồn vào bằng redirect hoặc process substitution.** Khi đó `while` chạy trong shell chính, không subshell:

```bash
# process substitution
bash -c 'count=0; while read x; do count=$((count+1)); done < <(seq 1 5); echo "count = $count"'
```

```
count = 5
```

```bash
# hoac doc tu file
bash -c 'seq 1 5 > nums.txt; count=0; while read x; do count=$((count+1)); done < nums.txt; echo "count = $count"'
```

```
count = 5
```

Cả hai đều cho `count = 5` — biến giữ được giá trị vì không còn subshell.

## Dấu hiệu nhận ra sớm

- Bất kỳ pipeline nào mà **lệnh không-phải-cuối** là bước quan trọng: `pg_dump | gzip`, `curl | tar`, `generate | tee`, `mysqldump | ssh`. Vế đầu là cái đáng lo, nhưng exit code lại nghe theo vế cuối.
- Script **không có `set -o pipefail`** ở đầu (kiểm nhanh: `grep pipefail script.sh`).
- Biến được gán bên trong `while ... done` đặt **sau một pipe** rồi đọc lại ở ngoài thì bằng rỗng/0.
- File output "thành công" nhưng **kích thước bất thường nhỏ** — với gzip là quanh 20 byte (header của stream rỗng).
- Cron/CI báo xanh nhưng sản phẩm đầu ra không dùng được — kinh điển của exit code bị nuốt.

## Related Topics

- [Exit code và control flow](../reference/exit-code-va-control-flow.md)
- [Viết script an toàn](../skills/viet-script-an-toan.md)
- [Streams và redirection](../reference/streams-va-redirection.md)
- [set -e không bắt](set-e-khong-bat.md)
