---
title: "Bộ 2 — Quoting và expansion"
i18n_status: untranslated
sidebar_position: 6
description: "15 bài tự chấm: word splitting, glob không khớp, nullglob, parameter expansion, @ vs * trong array, [ vs [[ với chuỗi có khoảng trắng."
tags: [tutorial, bash, quoting, expansion]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Bộ 2 — Quoting và expansion

> **Chạy thật 2026-10-28** — bash 5.x trên Linux. `verified_at` để trống.

Yêu cầu: đã làm [Bộ 1](bt-01-nen-tang.md), đã đọc
[Quoting và expansion](../reference/quoting-va-expansion.md).

## Câu 1 — word splitting khi quên quote

```bash
touch "file one.txt"
f="file one.txt"
cp $f /tmp/copied
```

**Đáp số:**

```text
cp: target '/tmp/copied': No such file or directory
```

<details>
<summary>Lời giải</summary>

`$f` không quote bị tách theo `IFS` (khoảng trắng) thành **hai từ**: `file` và
`one.txt`. `cp` nhận ba tham số (`file`, `one.txt`, `/tmp/copied`) và hiểu
`/tmp/copied` là đích — nhưng vì có *hai* nguồn mà đích không phải thư mục, lệnh báo
lỗi "No such file or directory" thay vì copy nhầm.

</details>

## Câu 2 — sửa đúng bằng quote

```bash
cp "$f" /tmp/copied_ok
echo "OK: $(ls /tmp/copied_ok)"
```

**Đáp số:**

```text
OK: /tmp/copied_ok
```

<details>
<summary>Lời giải</summary>

`"$f"` luôn là **một từ duy nhất**, dù bên trong có bao nhiêu khoảng trắng. Quy tắc an
toàn: **luôn** bọc `"$var"` trừ khi có lý do rõ ràng để không làm vậy (ví dụ cố tình
muốn word-split).

</details>

## Câu 3 — glob không khớp file nào thì giữ nguyên literal

```bash
rm -f *.bak
echo "danh sach: *.bak -> "*.bak
```

**Đáp số:**

```text
danh sach: *.bak -> *.bak
```

<details>
<summary>Lời giải</summary>

Mặc định, bash **không** báo lỗi khi glob không khớp file nào — nó giữ nguyên pattern
dưới dạng chuỗi literal. Script tưởng `*.bak` đã được mở rộng thành danh sách file thật
sẽ nhận một chuỗi vô nghĩa thay vì danh sách rỗng.

</details>

## Câu 4 — `nullglob` đổi hành vi đó

```bash
shopt -s nullglob
arr=(*.bak)
echo "so phan tu: ${#arr[@]}"
shopt -u nullglob
```

**Đáp số:**

```text
so phan tu: 0
```

<details>
<summary>Lời giải</summary>

`shopt -s nullglob` làm glob không khớp trả về **danh sách rỗng** thay vì chuỗi
literal. Bật cờ này trước khi gán glob vào array là cách an toàn để `for f in *.bak`
không lặp một lần "giả" khi không có file nào khớp.

</details>

## Câu 5 — parameter expansion: giá trị mặc định

```bash
unset myvar
echo "${myvar:-default_value}"
echo "sau do myvar=[${myvar:-chua gan}]"
```

**Đáp số:**

```text
default_value
sau do myvar=[chua gan]
```

<details>
<summary>Lời giải</summary>

`${var:-default}` **trả về** `default` khi `var` trống/chưa khai báo, nhưng **không
gán** gì vào `var` — lần in thứ hai vẫn thấy `myvar` trống.

</details>

## Câu 6 — parameter expansion: gán luôn giá trị mặc định

```bash
unset myvar2
echo "${myvar2:=gan_roi}"
echo "myvar2=$myvar2"
```

**Đáp số:**

```text
gan_roi
myvar2=gan_roi
```

<details>
<summary>Lời giải</summary>

`${var:=default}` vừa trả về `default` **vừa gán** nó vào `var` — khác `:-` ở đúng
điểm này. Dễ nhầm hai toán tử vì chỉ khác một ký tự.

</details>

## Câu 7 — cắt chuỗi: `#` (từ đầu) và `%` (từ cuối)

```bash
s="Xin chao the gioi"
echo "${s#Xin }"
echo "${s%% *}"
```

**Đáp số:**

```text
chao the gioi
Xin
```

<details>
<summary>Lời giải</summary>

`${s#pattern}` cắt phần khớp **ngắn nhất** tính từ **đầu** chuỗi; `${s%%pattern}` cắt
phần khớp **dài nhất** tính từ **cuối**. `#` và `%` (một dấu) là "ngắn nhất", `##` và
`%%` (hai dấu) là "dài nhất" — bốn biến thể, bốn kết quả khác nhau trên cùng một input.

</details>

## Câu 8 — `"$@"` vs `"$*"` khi array có phần tử chứa khoảng trắng

```bash
arr=("a b" "c d")
f1() { echo "so arg voi \"\$@\": $#"; }
f2() { echo "so arg voi \"\$*\": $#"; }
f1 "${arr[@]}"
f2 "${arr[*]}"
```

**Đáp số:**

```text
so arg voi "$@": 2
so arg voi "$*": 1
```

<details>
<summary>Lời giải</summary>

`"${arr[@]}"` mở rộng thành **từng phần tử riêng** (giữ nguyên khoảng trắng bên trong
mỗi phần tử) → 2 tham số đúng như mảng gốc. `"${arr[*]}"` nối **tất cả phần tử** thành
**một chuỗi duy nhất** (ngăn bởi `IFS`) → luôn chỉ 1 tham số. Dùng `"$*"` khi muốn
"forward" một mảng nguyên vẹn qua một lệnh khác là lỗi rất thường gặp.

</details>

## Câu 9 — `[` vs `[[` khi so sánh chuỗi có khoảng trắng, không quote

```bash
v="a b"
if [ $v = "a b" ]; then echo "single bracket: PASS"; else echo "single bracket: FAIL"; fi
if [[ $v = "a b" ]]; then echo "double bracket: PASS"; else echo "double bracket: FAIL"; fi
```

**Đáp số:**

```text
[: too many arguments
single bracket: FAIL
double bracket: PASS
```

<details>
<summary>Lời giải</summary>

`[` là một **lệnh thật** (`test`) — tham số của nó bị word-split như lệnh bình thường,
nên `$v` không quote tách thành hai từ `a` và `b`, biến `[ a b = "a b" ]` thành
`[` nhận **4 tham số** → lỗi "too many arguments" → điều kiện coi là false. `[[` là cú
pháp **built-in của shell**, không word-split nội dung bên trong, nên `$v` không quote
vẫn an toàn. Dù vậy, quy tắc chung vẫn nên **luôn quote** biến dù dùng `[` hay `[[`.

</details>

## Câu 10 — `IFS` tuỳ chỉnh khi tách chuỗi theo dấu phân cách khác

```bash
line="a:b:c"
IFS=: read -ra parts <<< "$line"
echo "parts0=${parts[0]} parts2=${parts[2]} count=${#parts[@]}"
```

**Đáp số:**

```text
parts0=a parts2=c count=3
```

<details>
<summary>Lời giải</summary>

`IFS=: read -ra parts` chỉ đổi `IFS` **cho riêng lệnh `read` đó** (cú pháp
`VAR=value command` là gán biến môi trường tạm thời cho một lệnh), không ảnh hưởng gì
tới `IFS` của phần script còn lại — cách an toàn hơn nhiều so với `IFS=:` rồi quên đổi
lại.

</details>

## Câu 11 — brace expansion: sinh nhiều từ, KHÔNG phải glob

```bash
echo file{1,2,3}.txt
echo "---so sanh voi glob tren file khong ton tai---"
echo file[1-3].txt
```

**Đáp số:**

```text
file1.txt file2.txt file3.txt
---so sanh voi glob tren file khong ton tai---
file[1-3].txt
```

<details>
<summary>Lời giải</summary>

`{1,2,3}` là **brace expansion** — thuần cú pháp sinh chuỗi, xảy ra **trước** khi shell
nhìn vào filesystem, luôn ra kết quả dù file có tồn tại hay không. `[1-3]` là **glob**
— chỉ khớp file **thật sự tồn tại**; không có file khớp thì giữ nguyên dạng literal
(đã học ở [Câu 3](#câu-3--glob-không-khớp-file-nào-thì-giữ-nguyên-literal)). Hai cú
pháp trông giống nhau nhưng cơ chế hoàn toàn khác.

</details>

## Câu 12 — arithmetic expansion `$(( ))` vs nối chuỗi nhầm

```bash
a=5; b=3
echo "$a+$b"
echo "$((a+b))"
```

**Đáp số:**

```text
5+3
8
```

<details>
<summary>Lời giải</summary>

`"$a+$b"` chỉ là **nối chuỗi** — `$a`, dấu `+` literal, `$b` — ra `"5+3"`.
`$((a+b))` mới thực sự **tính toán số học**, ra `8`. Quên cặp `$(( ))` là lý do một
script "tính tổng" chỉ in ra chuỗi ghép số, không tính gì cả.

</details>

## Câu 13 — quote lồng nhau, đơn trong kép

```bash
echo "gia tri la 'khong doi' va $((1+1))"
```

**Đáp số:**

```text
gia tri la 'khong doi' va 2
```

<details>
<summary>Lời giải</summary>

Trong cặp nháy kép, nháy đơn **mất tác dụng đặc biệt** — nó chỉ còn là ký tự literal,
in ra nguyên văn. Nhưng `$(( ))` (và `$var`, `` `cmd` ``) vẫn được **mở rộng** bình
thường bên trong nháy kép. Nháy kép tắt word-splitting/glob, không tắt expansion.

</details>

## Câu 14 — `printf '%q'`: escape chuỗi để dùng lại an toàn

```bash
v="co khoang trang va \$dollar"
printf '%q\n' "$v"
```

**Đáp số:**

```text
co\ khoang\ trang\ va\ \$dollar
```

<details>
<summary>Lời giải</summary>

`%q` sinh ra một chuỗi **đã escape đúng cách** để dán lại vào dòng lệnh bash mà chạy
ra đúng giá trị gốc — hữu ích khi script tự sinh lệnh để log lại hoặc ghi vào một
script khác, tránh phải tự đoán ký tự nào cần `\`.

</details>

## Câu 15 — `${var//pattern/replacement}`: thay toàn bộ vs chỉ lần đầu

```bash
s="one two one two one"
echo "${s//one/ONE}"
echo "---chi thay LAN DAU voi mot dau /---"
echo "${s/one/ONE}"
```

**Đáp số:**

```text
ONE two ONE two ONE
---chi thay LAN DAU voi mot dau /---
ONE two one two one
```

<details>
<summary>Lời giải</summary>

Một dấu `/` chỉ thay **lần khớp đầu tiên**; hai dấu `//` thay **mọi lần khớp** — y
hệt sự khác biệt `s///` vs `s///g` trong `sed`, nhưng viết hoàn toàn bằng parameter
expansion, không cần gọi process `sed` riêng cho một thay thế đơn giản.

</details>

## Related Topics

- [Quoting và expansion](../reference/quoting-va-expansion.md) — lý thuyết cho bộ này
- [Bộ 1 — Nền tảng](bt-01-nen-tang.md) · [Bộ 3 — Permissions và process](bt-03-permissions-process.md)
- [Bài tập — Bash](index.md) — mục lục bộ bài tập
