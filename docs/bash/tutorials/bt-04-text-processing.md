---
title: "Bộ 4 — Text processing: grep, awk, sed, cut, sort"
sidebar_position: 8
description: "17 bài tự chấm trên một access.log mẫu — đếm, lọc, thay thế, dễ dính bẫy chọn sai cột — mỗi bài có đáp số thật."
tags: [tutorial, bash, awk, sed, grep]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Bộ 4 — Text processing: grep, awk, sed, cut, sort

> **Chạy thật 2026-10-28.** `verified_at` để trống.

Yêu cầu: đã làm [Bộ 1-3](bt-01-nen-tang.md). Lý thuyết:
[Xử lý văn bản bằng pipeline](../skills/text-processing.md). Dữ liệu dùng chung cho cả
bộ — tạo một lần:

```bash
cat > access.log << 'EOF'
10.0.0.1 - - [01/Jul/2026] "GET /index.html HTTP/1.1" 200 512
10.0.0.2 - - [01/Jul/2026] "GET /api/users HTTP/1.1" 404 128
10.0.0.1 - - [01/Jul/2026] "POST /api/login HTTP/1.1" 200 256
10.0.0.3 - - [01/Jul/2026] "GET /index.html HTTP/1.1" 500 64
10.0.0.1 - - [01/Jul/2026] "GET /api/users HTTP/1.1" 200 1024
10.0.0.2 - - [01/Jul/2026] "GET /favicon.ico HTTP/1.1" 404 0
EOF
```

## Câu 1 — đếm dòng có "404"

```bash
grep -c "404" access.log
```

**Đáp số:**

```text
2
```

<details>
<summary>Lời giải</summary>

`grep -c` đếm **số dòng khớp**, không phải số lần khớp — một dòng có hai lần "404"
vẫn chỉ tính một.

</details>

## Câu 2 — lấy danh sách IP, bỏ trùng

```bash
cut -d' ' -f1 access.log | sort -u
```

**Đáp số:**

```text
10.0.0.1
10.0.0.2
10.0.0.3
```

<details>
<summary>Lời giải</summary>

`cut -d' ' -f1` lấy cột đầu tiên khi tách bằng khoảng trắng. `sort -u` vừa sort vừa bỏ
trùng trong một lệnh — tương đương `sort | uniq` nhưng ngắn hơn.

</details>

## Câu 3 — đếm request theo IP, nhiều nhất lên trước

```bash
awk '{print $1}' access.log | sort | uniq -c | sort -rn
```

**Đáp số:**

```text
      3 10.0.0.1
      2 10.0.0.2
      1 10.0.0.3
```

<details>
<summary>Lời giải</summary>

`uniq -c` **chỉ** đếm đúng khi các dòng trùng nhau đã **đứng liền kề** — đó là lý do
luôn phải `sort` trước `uniq -c`. `sort -rn` sort số giảm dần (`-n` số, `-r` ngược).

</details>

## Câu 4 — tổng số byte (cột cuối)

```bash
awk '{sum += $NF} END {print sum}' access.log
```

**Đáp số:**

```text
1984
```

<details>
<summary>Lời giải</summary>

`$NF` luôn là **cột cuối cùng**, bất kể dòng có bao nhiêu cột — an toàn hơn đếm cứng
`$9` khi số cột có thể đổi. `END { }` chạy đúng một lần, sau khi đã đọc hết mọi dòng.

</details>

## Câu 5 — `sed` thay chuỗi, chỉ xem dòng đầu

```bash
sed 's/ 200 / OK /' access.log | head -1
```

**Đáp số:**

```text
10.0.0.1 - - [01/Jul/2026] "GET /index.html HTTP/1.1" OK 512
```

<details>
<summary>Lời giải</summary>

`sed 's/cu/moi/'` (không có `g`) chỉ thay **lần khớp đầu tiên trên mỗi dòng**. Bọc
khoảng trắng quanh `200` để tránh thay nhầm một số khác chứa `"200"` như một chuỗi con
(ví dụ `12003`).

</details>

## Câu 6 — bẫy: lọc theo regex 3 chữ số dễ dính nhầm cột byte

```bash
echo "--- SAI: regex /^[0-9]{3}$/ khop ca cot status va cot byte ---"
awk '{for(i=1;i<=NF;i++) if ($i ~ /^[0-9]{3}$/) print NR": cot "i" = "$i}' access.log
echo "--- DUNG: biet truoc status luon o cot 8 ---"
awk '$8+0 >= 400' access.log
```

**Đáp số:**

```text
--- SAI: regex /^[0-9]{3}$/ khop ca cot status va cot byte ---
1: cot 8 = 200
1: cot 9 = 512
2: cot 8 = 404
2: cot 9 = 128
3: cot 8 = 200
3: cot 9 = 256
4: cot 8 = 500
5: cot 8 = 200
6: cot 8 = 404
--- DUNG: biet truoc status luon o cot 8 ---
10.0.0.2 - - [01/Jul/2026] "GET /api/users HTTP/1.1" 404 128
10.0.0.3 - - [01/Jul/2026] "GET /index.html HTTP/1.1" 500 64
10.0.0.2 - - [01/Jul/2026] "GET /favicon.ico HTTP/1.1" 404 0
```

<details>
<summary>Lời giải</summary>

**Bài học chính của câu này:** đoán cột bằng "trông giống số 3 chữ số" là sai —
`512`, `128`, `256` cũng là số 3 chữ số, và bị regex khớp nhầm thành "status". Biết
trước cấu trúc log (status luôn ở cột cố định `$8`) và dùng thẳng chỉ số cột **luôn
đáng tin hơn** đoán bằng hình dạng dữ liệu.

</details>

## Câu 7 — sort theo một cột cụ thể

```bash
awk '{print $1, $8}' access.log | sort -k2 -n
```

**Đáp số:**

```text
10.0.0.1 200
10.0.0.1 200
10.0.0.2 404
10.0.0.2 404
10.0.0.1 200
10.0.0.3 500
```

<details>
<summary>Lời giải</summary>

`sort -k2` sort theo **cột thứ hai** (sau khi đã dùng `awk` rút gọn chỉ còn 2 cột) —
`-n` để sort theo giá trị số (`200 < 404 < 500`), không theo thứ tự chữ (`"200" <
"404"` tình cờ đúng cả hai cách ở đây, nhưng không phải luôn vậy, ví dụ `9` so `10`).

</details>

## Câu 8 — `tr` đổi hoa thành thường

```bash
echo "XIN CHAO" | tr 'A-Z' 'a-z'
```

**Đáp số:**

```text
xin chao
```

<details>
<summary>Lời giải</summary>

`tr` thay **từng ký tự** theo cặp vị trí tương ứng giữa hai tập — ký tự thứ N của tập
nguồn đổi thành ký tự thứ N của tập đích. Không hiểu regex, không hiểu "từ", chỉ ký tự.

</details>

## Câu 9 — IP xuất hiện nhiều request nhất

```bash
cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -1
```

**Đáp số:**

```text
      3 10.0.0.1
```

<details>
<summary>Lời giải</summary>

Ghép lại đúng chuỗi của câu 3, thêm `head -1` lấy dòng đầu sau khi đã sort giảm dần —
mẫu pipeline rất phổ biến: "top-N theo số lần xuất hiện".

</details>

## Câu 10 — `paste` ghép hai danh sách theo cột

```bash
printf 'a\nb\nc\n' > left.txt
printf '1\n2\n3\n' > right.txt
paste left.txt right.txt
```

**Đáp số:**

```text
a	1
b	2
c	3
```

<details>
<summary>Lời giải</summary>

`paste` ghép **theo dòng tương ứng** của nhiều file, ngăn bởi tab (`\t`) — khác `cat`
(nối file theo chiều dọc) hay `join` (ghép theo khoá chung, cần dữ liệu đã sort).

</details>

## Câu 11 — `wc -l` khi file không có newline cuối

```bash
printf 'line1\nline2' > nonewline.txt
wc -l < nonewline.txt
grep -c '' nonewline.txt
```

**Đáp số:**

```text
1
2
```

<details>
<summary>Lời giải</summary>

**Bẫy kinh điển:** `wc -l` đếm **ký tự newline**, không đếm "dòng" theo nghĩa thông
thường — file có 2 dòng nhưng chỉ 1 dấu `\n` (dòng cuối không kết thúc bằng newline)
nên `wc -l` báo `1`, thiếu một dòng. `grep -c ''` (khớp mọi dòng, kể cả dòng không có
newline cuối) đếm đúng `2`. Khi cần đếm dòng chính xác bất kể newline cuối, `grep -c ''`
đáng tin hơn `wc -l`.

</details>

## Câu 12 — `NR` và `NF` trong awk

```bash
awk '{print NR, NF}' access.log | head -2
```

**Đáp số:**

```text
1 9
2 9
```

<details>
<summary>Lời giải</summary>

`NR` là số thứ tự dòng đang xử lý (toàn file, không reset giữa các khối). `NF` là số
cột của **dòng hiện tại** — có thể khác nhau giữa các dòng nếu định dạng không đều,
không phải một hằng số cố định cho cả file.

</details>

Chuẩn bị thêm một file CSV cho các câu 13-17:

```bash
cat > data.csv << 'EOF'
name,age,city
An,25,HCM
Binh,30,HN
Chi,22,DN
EOF
```

## Câu 13 — `awk -F` đổi delimiter, đọc CSV

```bash
awk -F',' 'NR>1 {print $1, $2}' data.csv
```

**Đáp số:**

```text
An 25
Binh 30
Chi 22
```

<details>
<summary>Lời giải</summary>

`-F','` đổi field separator mặc định (khoảng trắng) thành dấu phẩy — cần thiết cho
CSV, nơi cột ngăn bởi `,` không phải khoảng trắng. `NR>1` bỏ qua dòng header.

</details>

## Câu 14 — `sed -i` sửa trực tiếp file, giữ bản backup

```bash
cp data.csv data.csv.orig
sed -i.bak 's/HCM/Ho Chi Minh/' data.csv
cat data.csv
echo "--- file backup ---"
cat data.csv.bak
```

**Đáp số:**

```text
name,age,city
An,25,Ho Chi Minh
Binh,30,HN
Chi,22,DN
--- file backup ---
name,age,city
An,25,HCM
Binh,30,HN
Chi,22,DN
```

<details>
<summary>Lời giải</summary>

`-i` sửa file **tại chỗ** (in-place) — không giống các lệnh trước chỉ in ra stdout.
`-i.bak` còn giữ lại **bản gốc** với đuôi `.bak` trước khi sửa — luôn dùng `-i.bak`
(có đuôi) thay vì `-i` trần khi còn chưa chắc regex đúng, vì `-i` trần sửa xong là
mất bản gốc vĩnh viễn nếu regex sai.

</details>

## Câu 15 — `grep -v`: loại bỏ dòng khớp

```bash
grep -v "^name" data.csv
```

**Đáp số:**

```text
An,25,Ho Chi Minh
Binh,30,HN
Chi,22,DN
```

<details>
<summary>Lời giải</summary>

`-v` đảo ngược logic: in **những dòng KHÔNG khớp** pattern — ở đây dùng để bỏ dòng
header mà không cần biết số dòng cụ thể, miễn header luôn bắt đầu bằng `name`.

</details>

## Câu 16 — `sort -t` kết hợp `-k`: sort theo cột của một file có delimiter riêng

```bash
sort -t',' -k2 -n data.csv
```

**Đáp số:**

```text
name,age,city
Chi,22,DN
An,25,Ho Chi Minh
Binh,30,HN
```

<details>
<summary>Lời giải</summary>

`-t','` nói cho `sort` biết cột ngăn bởi dấu phẩy (giống `-F` của `awk`). `-k2 -n`
sort theo cột 2, kiểu số. Dòng header `name,age,city` vẫn lẫn vào vì `sort` không tự
biết "dòng đầu là header" — muốn loại nó phải `tail -n +2` trước khi `sort`.

</details>

## Câu 17 — `comm`: so sánh hai file đã sort theo dòng chung/riêng

```bash
printf 'a\nb\nc\n' | sort > left2.txt
printf 'b\nc\nd\n' | sort > right2.txt
comm left2.txt right2.txt
```

**Đáp số:**

```text
a
		b
		c
	d
```

<details>
<summary>Lời giải</summary>

`comm` in **3 cột** (ngăn bởi tab): cột 1 = dòng chỉ có ở file đầu (`a`), cột 2 = dòng
chỉ có ở file thứ hai (`d`), cột 3 = dòng có ở **cả hai** (`b`, `c`). Yêu cầu bắt buộc:
cả hai file phải **đã sort** trước, `comm` không tự sort giúp.

</details>

## Related Topics

- [Xử lý văn bản bằng pipeline](../skills/text-processing.md) — lý thuyết cho bộ này
- [Lab: xử lý văn bản bằng pipeline](bash-lab-text-processing.md) — lab chạy thật, chi tiết hơn câu 1-3 ở đây
- [Bộ 3 — Permissions và process](bt-03-permissions-process.md) · [Bộ 5 — Regex](bt-05-regex.md)
- [Bài tập — Bash](index.md) — mục lục bộ bài tập
