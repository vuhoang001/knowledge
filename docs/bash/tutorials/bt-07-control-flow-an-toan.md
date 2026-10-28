---
title: "Bộ 7 — Control flow và script an toàn"
sidebar_position: 11
description: "15 bài tự chấm: set -e không bắt lỗi trong if, set -u exit code thật là 127 không phải 1, while read mất dòng cuối, trap EXIT, for loop không quote mất an toàn với khoảng trắng."
tags: [tutorial, bash, set-e, trap, safety]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-10-28
---

# Bộ 7 — Control flow và script an toàn

> **Chạy thật 2026-10-28.** Bộ khó nhất — mỗi câu đều là một cạm bẫy thật đã từng làm
> hỏng script của ai đó trong thực tế, không phải bài tập lý thuyết suông.
> `verified_at` để trống.

Yêu cầu: đã làm [Bộ 1, 6](bt-01-nen-tang.md). Lý thuyết:
[Viết script an toàn](../skills/viet-script-an-toan.md),
[Conditionals và loops](../skills/conditionals-va-loops.md).

## Câu 1 — không có `set -e`, lỗi giữa script không dừng gì cả

```bash
bash -c '
false
echo "van toi day"
'
echo "exit=$?"
```

**Đáp số:**

```text
van toi day
exit=0
```

<details>
<summary>Lời giải</summary>

Mặc định, bash **không dừng** khi một lệnh thất bại giữa script — nó chạy tiếp dòng
sau, và exit code cuối cùng của script là exit code của **lệnh cuối cùng** (`echo`,
luôn thành công), che mất việc `false` đã thất bại ở giữa.

</details>

## Câu 2 — `set -e`: lỗi giữa script dừng ngay

```bash
bash -c '
set -e
false
echo "khong bao gio toi day"
'
echo "exit=$?"
```

**Đáp số:**

```text
exit=1
```

<details>
<summary>Lời giải</summary>

`set -e` làm script **thoát ngay** tại lệnh đầu tiên thất bại (không bắt bằng `||`,
không trong điều kiện `if`/`while`/`&&`). Dòng `echo` sau đó không bao giờ chạy.

</details>

## Câu 3 — bẫy: `set -e` KHÔNG bắt lỗi trong điều kiện `if`

```bash
bash -c '
set -e
if false; then echo x; fi
echo "van toi day du co set -e"
'
echo "exit=$?"
```

**Đáp số:**

```text
van toi day du co set -e
exit=0
```

<details>
<summary>Lời giải</summary>

Đây là **ngoại lệ quan trọng nhất** của `set -e`: lệnh đóng vai trò **điều kiện** của
`if`/`while`/`until`, hoặc đứng trước `&&`/`||`, **không** kích hoạt `set -e` dù thất
bại — vì thất bại ở đó là *có chủ đích* (để rẽ nhánh), không phải lỗi. Code dựa vào
`set -e` để "bắt mọi lỗi" mà quên ngoại lệ này sẽ bỏ lỡ lỗi nằm trong điều kiện phức tạp.

</details>

## Câu 4 — `set -u` và exit code thật của biến chưa khai báo

```bash
bash -c '
set -u
echo "$undefined_var"
' 2>&1
echo "exit=$?"
```

**Đáp số:**

```text
bash: line 3: undefined_var: unbound variable
exit=127
```

<details>
<summary>Lời giải</summary>

Lặp lại đúng bẫy ở [Bộ 1 câu 10](bt-01-nen-tang.md#câu-10--set--u-và-biến-chưa-khai-báo-exit-code-là-bao-nhiêu)
— nhắc lại ở đây vì nó liên quan trực tiếp tới việc kết hợp `set -euo pipefail`: nếu
script kiểm tra `$? -eq 1` để phân biệt loại lỗi, nhánh lỗi do `set -u` sẽ **không**
rơi vào đúng nhánh mong đợi.

</details>

## Câu 5 — `pipefail` cần thiết khi lỗi nằm giữa đường ống

```bash
bash -c '
set -o pipefail
false | wc -l
'
echo "exit=$?"
```

**Đáp số:**

```text
0
exit=1
```

<details>
<summary>Lời giải</summary>

`wc -l` vẫn in `0` (đếm được 0 dòng từ input rỗng của `false`) — **in ra bình thường**,
không có dấu hiệu lỗi nào trên output. Chỉ `pipefail` mới làm exit code của toàn
pipeline phản ánh đúng việc `false` đã thất bại. Không có `pipefail`, `set -e` sẽ
**không** dừng script ở đây, vì nó chỉ nhìn exit code cuối (`wc`, luôn `0`).

</details>

## Câu 6 — `case` pattern matching

```bash
check() {
  case "$1" in
    *.txt) echo "van ban";;
    *.sh) echo "script";;
    *) echo "khong ro";;
  esac
}
check "a.txt"; check "b.sh"; check "c.bin"
```

**Đáp số:**

```text
van ban
script
khong ro
```

<details>
<summary>Lời giải</summary>

`case` khớp theo **glob pattern** (không phải regex) — `*.txt` nghĩa là "kết thúc bằng
`.txt`". Các nhánh được thử **theo thứ tự viết**, dừng ở nhánh khớp đầu tiên; `*)` là
nhánh "mặc định", nên luôn đặt **cuối cùng**.

</details>

## Câu 7 — `while read` đọc đúng cách, không mất dòng cuối thiếu newline

```bash
printf 'line1\nline2\nline3' > nolast.txt
while IFS= read -r line || [[ -n "$line" ]]; do echo "doc: $line"; done < nolast.txt
```

**Đáp số:**

```text
doc: line1
doc: line2
doc: line3
```

<details>
<summary>Lời giải</summary>

`read` trả về thất bại (`exit ≠ 0`) khi gặp **EOF**, dù nó vẫn đọc được phần dữ liệu
còn sót (dòng cuối không có `\n`) vào biến. `|| [[ -n "$line" ]]` là mẹo chuẩn: nếu
`read` "thất bại" vì EOF nhưng `$line` vẫn còn nội dung, vòng lặp chạy thêm một lần
cuối để không bỏ sót dòng đó.

</details>

## Câu 8 — bẫy: `while read` không có mẹo trên, mất dòng cuối

```bash
while IFS= read -r line; do echo "doc: $line"; done < nolast.txt
```

**Đáp số:**

```text
doc: line1
doc: line2
```

<details>
<summary>Lời giải</summary>

Không có `|| [[ -n "$line" ]]`, vòng lặp dừng ngay khi `read` thất bại (EOF) —
`line3` (không có `\n` cuối) **bị đọc vào `$line` nhưng vòng lặp đã thoát trước khi
chạy `echo`**. Đây là lý do rất nhiều script "xử lý từng dòng file" bị thiếu đúng dòng
cuối một cách âm thầm, đặc biệt với file do công cụ khác tạo ra mà không thêm newline
cuối.

</details>

## Câu 9 — `trap EXIT` đảm bảo dọn dẹp chạy dù thoát bằng cách nào

```bash
bash -c '
trap "echo DON_DEP" EXIT
echo "lam viec"
exit 3
'
echo "exit=$?"
```

**Đáp số:**

```text
lam viec
DON_DEP
exit=3
```

<details>
<summary>Lời giải</summary>

`trap "lệnh" EXIT` chạy `lệnh` đó **ngay trước khi shell thoát**, bất kể thoát bằng
`exit N` tường minh, chạy hết script bình thường, hay bị `set -e` cắt giữa đường. Mẫu
chuẩn cho "luôn xoá file tạm / nhả lock dù script có lỗi ở đâu" — đáng tin hơn đặt lệnh
dọn dẹp ở cuối script (chỗ đó sẽ **không chạy** nếu `set -e` đã cắt trước đó).

</details>

## Câu 10 — bẫy: `for` loop trên output lệnh không quote, mất an toàn với khoảng trắng

```bash
touch "file one.txt" "file two.txt"
for f in $(ls); do echo "xu ly: [$f]"; done
echo "---dung cach, dung glob---"
for f in *; do echo "xu ly: [$f]"; done
```

**Đáp số:**

```text
xu ly: [file]
xu ly: [one.txt]
xu ly: [file]
xu ly: [two.txt]
---dung cach, dung glob---
xu ly: [file one.txt]
xu ly: [file two.txt]
```

<details>
<summary>Lời giải</summary>

`$(ls)` không quote trong `for f in $(ls)` bị **word-split** theo khoảng trắng —
"file one.txt" tách thành hai phần tử giả `file` và `one.txt`, script tưởng xử lý 2
file thật ra xử lý 4 "từ" vô nghĩa. Dùng glob trực tiếp (`for f in *`) để bash tự liệt
kê **tên file thật** làm từng phần tử, giữ nguyên khoảng trắng bên trong mỗi tên — quy
tắc chung: **không bao giờ** `for x in $(ls ...)`.

</details>

## Câu 11 — `until`: ngược với `while`

```bash
i=1
until [ "$i" -gt 3 ]; do echo "i=$i"; i=$((i+1)); done
```

**Đáp số:**

```text
i=1
i=2
i=3
```

<details>
<summary>Lời giải</summary>

`while cond; do ...; done` lặp **khi `cond` còn đúng**. `until cond; do ...; done`
lặp **khi `cond` còn SAI**, dừng ngay khi `cond` đúng — ngược hoàn toàn. `until [ i
-gt 3 ]` đọc là "lặp tới khi i > 3", đúng ý nghĩa tên gọi của nó.

</details>

## Câu 12 — heredoc thường CÓ giãn biến

```bash
name="An"
cat << EOF
Xin chao $name
EOF
```

**Đáp số:**

```text
Xin chao An
```

<details>
<summary>Lời giải</summary>

Heredoc với delimiter **không quote** (`<< EOF`) hoạt động như một chuỗi trong nháy
kép — `$var`, `` `cmd` ``, `$(...)` đều được mở rộng trước khi đưa vào stdin của lệnh.

</details>

## Câu 13 — heredoc với delimiter trong quote KHÔNG giãn biến

```bash
cat << 'EOF'
Xin chao $name
EOF
```

**Đáp số:**

```text
Xin chao $name
```

<details>
<summary>Lời giải</summary>

Bọc delimiter trong nháy đơn (`<< 'EOF'`) tắt mọi expansion bên trong heredoc — hoạt
động như chuỗi nháy đơn literal. Dùng khi heredoc là một **template** hay **script
mẫu** mà `$` trong đó phải giữ nguyên (ví dụ in ra một đoạn script bash khác, có biến
`$1`, `$HOME` muốn giữ nguyên ký tự, không muốn bash hiện tại thay vào).

</details>

## Câu 14 — `getopts`: phân tích flag kiểu `-v -o file.txt`

```bash
parse() {
  local verbose=0 outfile=""
  while getopts "vo:" opt; do
    case "$opt" in
      v) verbose=1 ;;
      o) outfile="$OPTARG" ;;
      *) echo "flag khong ro" ;;
    esac
  done
  echo "verbose=$verbose outfile=$outfile"
}
parse -v -o ket_qua.txt
```

**Đáp số:**

```text
verbose=1 outfile=ket_qua.txt
```

<details>
<summary>Lời giải</summary>

Chuỗi `"vo:"` khai hai flag: `v` (cờ bật/tắt, không có giá trị theo sau) và `o:`
(dấu `:` sau `o` nghĩa là **bắt buộc có giá trị theo sau**, nhận vào `OPTARG`).
`getopts` là cách chuẩn POSIX để parse flag kiểu CLI thật, đáng tin hơn tự viết
`while`/`case` tay trên `$@` — tự động xử lý đúng cả `-vo file.txt` (gộp) và
`-v -o file.txt` (tách), cũng như báo lỗi khi thiếu giá trị cho `o:`.

</details>

## Câu 15 — `set -x`: in lệnh ra trước khi chạy (trace debug)

```bash
bash -x -c '
a=1
b=2
echo $((a+b))
'
```

**Đáp số:**

```text
+ a=1
+ b=2
+ echo 3
3
```

<details>
<summary>Lời giải</summary>

`-x` (hay `set -x` trong script) in **mỗi lệnh ra stderr trước khi thực thi nó**,
tiền tố bằng `+` (đổi được qua biến `PS4`). Lưu ý dòng `+ echo 3` — bash in lệnh
**sau khi đã expand** (`$((a+b))` đã tính thành `3`), không in nguyên văn code gốc.
Đây là công cụ debug mạnh nhất cho script dài: chạy `bash -x script.sh` để thấy chính
xác từng bước đã expand ra sao, không cần đặt `echo` thủ công rải khắp script.

</details>

## Đáp số đối chiếu nhanh — ba lớp bảo vệ của `set -euo pipefail`

| Cờ | Bắt được | KHÔNG bắt được |
|---|---|---|
| `-e` | Lệnh đơn lẻ giữa script thất bại | Lệnh điều kiện trong `if`/`while`, lệnh trước `&&`/`\|\|` (câu 3) |
| `-u` | Đọc biến chưa khai báo (exit **127**, không phải 1 — câu 4) | Biến đã khai báo nhưng rỗng (`x=""`) |
| `-o pipefail` | Lệnh giữa pipeline thất bại (câu 5) | Không liên quan tới `if`/`while` — vẫn cần `-e` đi kèm |

Ba cờ bổ sung cho nhau, không cờ nào thay được cờ khác — xem đủ cả bộ ở
[Viết script an toàn](../skills/viet-script-an-toan.md).

## Related Topics

- [Viết script an toàn](../skills/viet-script-an-toan.md) · [Conditionals và loops](../skills/conditionals-va-loops.md) — lý thuyết cho bộ này
- [Lab: viết script bash đầu tiên](bash-lab-first-script.md) — lab chạy thật dùng `set -euo pipefail`
- [Bộ 6 — Variables, arrays, functions](bt-06-variables-arrays-functions.md)
- [Bài tập — Bash](index.md) — mục lục bộ bài tập
