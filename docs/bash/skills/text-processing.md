---
title: Xử lý văn bản bằng pipeline
sidebar_position: 1
description: "Mỗi lệnh làm một việc và pipe nối lại — chín phần mười việc xử lý text là grep lọc dòng, cut hoặc awk cắt cột, rồi sort với uniq đếm."
tags: [text-processing, grep, awk, sed, sort, uniq, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Xử lý văn bản bằng pipeline

> **Chốt:** Mỗi lệnh làm đúng một việc, `|` nối stdout của lệnh trước vào stdin lệnh sau. Chín phần mười việc xử lý text gói gọn trong: `grep` lọc dòng → `cut`/`awk` cắt cột → `sort | uniq -c` đếm. Học thuộc idiom `sort | uniq -c | sort -rn` là làm được nửa việc.

## Mục tiêu

Gặp một file log, một CSV, một dump text — trả lời được các câu kiểu "dòng nào khớp?", "cột thứ mấy?", "cái gì xuất hiện nhiều nhất?" bằng một pipeline dựng tại chỗ, không mở editor, không viết script.

Tài liệu này giả định bạn đã nắm [streams và redirection](../reference/streams-va-redirection.md) (stdin/stdout/stderr, `|`, `>`) và [quoting](../reference/quoting-va-expansion.md) (khi nào cần nháy đơn cho pattern). Ở đây chỉ bàn "gặp tình huống X thì ghép lệnh nào".

## Tổng quan

Mỗi lệnh một việc chính. Đừng cố nhớ hết cờ — nhớ việc chính, tra cờ khi cần.

| Lệnh | Việc chính | Cờ hay dùng | Cạm bẫy một câu |
|---|---|---|---|
| `grep` | Lọc **dòng** khớp pattern | `-i -v -r -w -c -o -n -E` | Mặc định là BRE — `+ ? {}` phải escape hoặc dùng `-E` |
| `cut` | Cắt **cột** theo delimiter cố định | `-d -f` | Không gộp nhiều delimiter liền → hỏng với cột căn bằng space |
| `awk` | Xử lý theo **trường**, tính toán | `-F` `$1 $NF NR NF` | Dao đa năng; whitespace liền coi là một sep (đúng cái `cut` thiếu) |
| `sed` | Thay thế / xoá / in dòng | `s/x/y/g` `-n` `p` `d` | `s///` không có `g` chỉ đổi lần đầu mỗi dòng |
| `sort` | Sắp xếp dòng | `-n -r -k -t -u` | Mặc định so sánh **chuỗi**: `10` đứng trước `9` nếu quên `-n` |
| `uniq` | Gộp/đếm dòng **liền kề** trùng | `-c -d -u` | **Phải `sort` trước** — nó chỉ nhìn dòng kề nhau |
| `tr` | Đổi/xoá **ký tự** | `-d -s` | Không hiểu regex, chỉ set ký tự |
| `wc` | Đếm dòng/từ/byte | `-l -w -c` | `-c` là byte, `-m` mới là ký tự (khác nhau ở UTF-8) |
| `head`/`tail` | Lấy N dòng đầu/cuối | `-n` `tail -f` | `tail -f` bám file đang ghi, không tự thoát |

## Ví dụ

*Chạy thật 2026-08-05 · Ubuntu, bash 5.3.9(1), GNU awk 5.3.2, GNU sed 4.9, coreutils uutils 0.8.0.*

Bài toán xuyên suốt: có một access.log, cần hai câu trả lời — **top 5 IP gửi nhiều request nhất** và **mỗi status code xuất hiện bao nhiêu lần**. Dựng pipeline từng bước, đọc output rồi mới nối tiếp.

Dữ liệu mẫu (tự chế, 15 dòng, định dạng combined log):

```
203.0.113.5 - - [05/Aug/2026:10:00:01 +0700] "GET /index.html HTTP/1.1" 200 1043
198.51.100.22 - - [05/Aug/2026:10:00:02 +0700] "GET /style.css HTTP/1.1" 200 512
203.0.113.5 - - [05/Aug/2026:10:00:03 +0700] "GET /app.js HTTP/1.1" 200 8021
10.0.0.7 - - [05/Aug/2026:10:00:05 +0700] "POST /api/login HTTP/1.1" 401 91
...
198.51.100.22 - - [05/Aug/2026:10:00:22 +0700] "GET /style.css HTTP/1.1" 304 0
```

### Câu 1 — top 5 IP

IP là cột đầu tiên, phân tách bằng space. Dựng dần.

**Bước 1** — `cut` lấy cột 1:

```bash
cut -d' ' -f1 access.log
```

```
203.0.113.5
198.51.100.22
203.0.113.5
10.0.0.7
203.0.113.5
...
```

Ra một dòng một IP, còn trùng lặp. `cut` dùng được ở đây vì cột IP luôn cách phần sau đúng **một** space — chỗ này delimiter cố định, không có space kép.

**Bước 2** — `sort` để gom các IP giống nhau về cạnh nhau (điều kiện bắt buộc cho `uniq`):

```bash
cut -d' ' -f1 access.log | sort
```

```
10.0.0.7
10.0.0.7
10.0.0.7
172.16.0.99
172.16.0.99
198.51.100.22
198.51.100.22
198.51.100.22
198.51.100.22
203.0.113.5
203.0.113.5
203.0.113.5
203.0.113.5
203.0.113.5
203.0.113.5
```

**Bước 3** — `uniq -c` gộp dòng kề trùng và đếm:

```bash
cut -d' ' -f1 access.log | sort | uniq -c
```

```
      3 10.0.0.7
      2 172.16.0.99
      4 198.51.100.22
      6 203.0.113.5
```

**Bước 4** — sắp giảm dần theo số (`-rn`) rồi lấy 5 đầu:

```bash
cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -n 5
```

```
      6 203.0.113.5
      4 198.51.100.22
      3 10.0.0.7
      2 172.16.0.99
```

Đây là idiom kinh điển **`sort | uniq -c | sort -rn`** — đếm tần suất rồi xếp hạng. `-n` bắt buộc: không có nó thì `10` xếp trước `4` vì so sánh chuỗi.

### Câu 2 — đếm mỗi status code

Status code không nằm ở vị trí cắt được bằng `cut` an toàn: phần `"GET /... HTTP/1.1"` có số space thay đổi (đường dẫn có thể chứa space, method dài ngắn khác nhau). Đây là chỗ chuyển sang `awk`, đếm từ cuối bằng trường cố định. Trong combined log, status code là cột 9:

```bash
awk '{print $9}' access.log
```

```
200
200
200
401
404
...
304
```

`awk` tách theo **cụm** whitespace (nhiều space liền = một separator), nên `$9` luôn trúng status code dù các cột trước có căn lệch. Nối idiom đếm:

```bash
awk '{print $9}' access.log | sort | uniq -c | sort -rn
```

```
      8 200
      2 404
      2 403
      1 500
      1 401
      1 304
```

Muốn đếm nhanh **một** mã cụ thể, khỏi cần pipeline — `grep -c` đủ:

```bash
grep -c ' 404 ' access.log
```

```
2
```

`awk` còn tính được ngay trong lúc quét. Tổng bytes của các request thành công:

```bash
awk '$9 == 200 {sum += $10} END {print sum}' access.log
```

```
112088
```

Và lọc các request lỗi (status ≥ 400) kèm IP — pattern thuần awk, không cần grep:

```bash
awk '$9 >= 400 {print $1, $9}' access.log
```

```
10.0.0.7 401
203.0.113.5 404
172.16.0.99 403
198.51.100.22 404
172.16.0.99 403
203.0.113.5 500
```

## Trade-offs

- **`cut` vs `awk` cho cắt cột.** `cut` gõ ngắn, nhanh, nhưng chỉ đúng khi delimiter cố định đúng một ký tự. Cột căn bằng space kép → `cut` hỏng, dùng `awk`. Quy tắc: CSV/TSV sạch dùng `cut`; log căn cột, cần tính toán, cần trường từ cuối (`$NF`) thì `awk`.
- **`grep` vs `awk` cho lọc.** Lọc theo nội dung dòng: `grep` ngắn hơn. Lọc theo giá trị **một cột cụ thể** (status ≥ 400, cột 3 bằng "error"): `awk` chính xác hơn vì grep không biết ranh giới cột, dễ khớp nhầm chuỗi ở cột khác.
- **Pipeline vs script.** Pipeline dài 4-5 lệnh vẫn đọc được và dựng tại chỗ. Quá 5-6 lệnh, hoặc cần vòng lặp/điều kiện phức tạp → viết một block `awk` hoặc chuyển sang Python. Đừng cố nhồi mọi thứ vào một dòng đến mức không đọc lại được.
- **`sort` là điểm nghẽn.** `sort` phải đọc hết đầu vào và giữ trong bộ nhớ/temp trước khi xuất — không stream được. Với file khổng lồ đây là chỗ chậm và tốn RAM; cân nhắc `awk` với mảng associative để đếm mà không cần sort.

## Common Mistakes

- **`uniq` mà quên `sort` trước.** `uniq` chỉ gộp dòng **kề nhau**. `cut ... | uniq -c` không sort trước sẽ đếm sai vì các dòng trùng nằm rải rác. Luôn `sort | uniq`.
- **`sort` quên `-n` khi so số.** Mặc định so chuỗi: `100` xếp trước `9`. Đếm tần suất mà quên `-rn` thì bảng xếp hạng sai bét.
- **`cut -d' '` trên cột căn bằng nhiều space.** `cut` coi mỗi space là một delimiter, hai space liền tạo một field rỗng ở giữa:

  ```bash
  printf 'alice   30   hanoi\n' | cut -d' ' -f2   # ra dong TRONG
  printf 'alice   30   hanoi\n' | awk '{print $2}' # ra "30"
  ```

  ```
  
  30
  ```

- **Quên grep mặc định là BRE.** `+ ? { } |` là ký tự **thường** trong BRE, không phải toán tử. `grep 'a+'` tìm chuỗi `a+`, không phải "một hoặc nhiều a":

  ```bash
  printf 'aaa\na+b\n' | grep 'a+'      # chi khop dong co dau + that
  printf 'aaa\na+b\n' | grep -E 'a+'   # khop ca hai
  ```

  ```
  a+b
  aaa
  a+b
  ```

  Cần `+ ? |` làm toán tử thì thêm `-E` (ERE), hoặc escape `\+` trong BRE.
- **`sed 's/x/y/'` quên `g`.** Không có cờ `g`, `sed` chỉ đổi **lần khớp đầu tiên trên mỗi dòng**. `echo 'foo=1;foo=2' | sed 's/foo/bar/'` chỉ đổi `foo` đầu.

## FAQ

<details>
<summary>Khi nào dùng cut, khi nào awk?</summary>

Delimiter là đúng một ký tự cố định và không lặp (CSV với `,`, `/etc/passwd` với `:`) → `cut -d',' -f2,7` ngắn gọn. Ngay khi có space kép, cần cột đếm từ cuối (`$NF`), cần lọc theo giá trị cột, hoặc cần cộng/đếm → `awk`. Thực tế nhiều người chỉ dùng `awk '{print $2}'` cho mọi thứ vì nó không bao giờ hỏng với whitespace.

</details>

<details>
<summary>Tại sao uniq đếm sai dù tôi có dùng nó?</summary>

Vì bạn chưa `sort`. `uniq` gộp các dòng **giống nhau và nằm kề nhau**. Nếu ba dòng `10.0.0.7` rải rác ở dòng 4, 9, 14 thì `uniq -c` báo ba nhóm riêng, mỗi nhóm 1. Luôn đặt `sort` ngay trước: `sort | uniq -c`. (Nếu chỉ cần đếm không cần thứ tự, `awk '{c[$1]++} END{for(k in c)print c[k],k}'` làm một mạch, khỏi sort.)

</details>

<details>
<summary>grep của tôi không hiểu (foo|bar), sai ở đâu?</summary>

`grep` mặc định dùng BRE, ở đó `|` và `()` là ký tự thường. Dùng `grep -E 'foo|bar'` (ERE) hoặc `grep 'foo\|bar'` (escape trong BRE). Nói chung nếu pattern có `+ ? | ( ) { }` làm toán tử thì cứ thêm `-E` cho nhẹ đầu.

</details>

<details>
<summary>Làm sao đếm request theo thời gian thực khi log đang ghi?</summary>

`tail -f access.log | grep --line-buffered ' 500 '` — `tail -f` bám đuôi file và tuôn dòng mới ra ngay. Cần `--line-buffered` cho grep để nó xuất từng dòng thay vì gom buffer. Lưu ý pipeline này **không tự thoát**, phải Ctrl-C; và `sort`/`uniq` không dùng được ở đây vì chúng cần đọc hết đầu vào.

</details>

## Related Topics

- [Streams và redirection](../reference/streams-va-redirection.md) — stdin/stdout/stderr và `|` nối chúng thế nào
- [Quoting và expansion](../reference/quoting-va-expansion.md) — khi nào cần nháy đơn cho pattern grep/sed
- [Tìm file với find và xargs](find-va-xargs.md) — cấp file vào pipeline, không chỉ nội dung
- [Lab: xử lý văn bản](../tutorials/bash-lab-text-processing.md) — bài thực hành có đáp số
- [Cheatsheet lệnh bash](../cheatsheets/commands.md) — tra cờ nhanh

## References

- `man grep`, `man awk`, `man sed`, `man sort`, `man uniq`, `man cut`, `man tr`, `man wc`
- GNU Coreutils manual — sort, uniq, cut, tr, wc
- The AWK Programming Language (Aho, Kernighan, Weinberger) — sách gốc về awk
