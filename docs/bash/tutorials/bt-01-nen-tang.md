---
title: "Bộ 1 — Nền tảng: exit code, streams, short-circuit"
sidebar_position: 5
description: "15 bài tự chấm: exit code của && và ||, pipefail, redirect stdout/stderr riêng rẽ, command substitution — mỗi bài có đáp số thật, lời giải giấu trong <details>."
tags: [tutorial, bash, exit-code, streams]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Bộ 1 — Nền tảng: exit code, streams, short-circuit

> **Chạy thật 2026-10-28** — bash 5.x trên Linux. Mỗi câu: đọc đề, tự chạy, so với
> **Đáp số**, rồi mới mở lời giải. `verified_at` để trống — chờ chủ repo chạy lại tay.

Yêu cầu: đã đọc [Shell là gì](../reference/shell-la-gi.md),
[Streams và redirection](../reference/streams-va-redirection.md),
[Exit code và control flow](../reference/exit-code-va-control-flow.md).

## Câu 1 — exit code của lệnh có sẵn

```bash
false; echo "exit=$?"
```

**Đáp số:**

```text
exit=1
```

<details>
<summary>Lời giải</summary>

`false` là một lệnh có sẵn **chỉ làm một việc**: trả exit code `1`. `$?` đọc exit code
của lệnh **ngay trước nó** — đọc muộn một lệnh là đọc nhầm số.

</details>

## Câu 2 — short-circuit `&&`: lệnh sau có chạy không

```bash
rm -f ok.txt
false && touch ok.txt
ls ok.txt
```

**Đáp số:**

```text
ls: cannot access 'ok.txt': No such file or directory
```

<details>
<summary>Lời giải</summary>

`&&` chỉ chạy lệnh bên phải khi lệnh bên trái **thành công** (exit 0). `false` thất bại
→ `touch ok.txt` **không hề chạy** → file không tồn tại. Đây là lý do `cmd1 && cmd2`
dùng được như một "if ngắn", không phải cú pháp nối lệnh thông thường.

</details>

## Câu 3 — short-circuit `||`: lệnh sau có chạy không

```bash
true || echo "khong bao gio in"
echo "sau day van chay"
```

**Đáp số:**

```text
sau day van chay
```

<details>
<summary>Lời giải</summary>

`||` chỉ chạy lệnh bên phải khi lệnh bên trái **thất bại**. `true` thành công → dòng
`echo "khong bao gio in"` không chạy, chỉ dòng độc lập sau cùng in ra.

</details>

## Câu 4 — pipe không `pipefail`: exit code của ai thắng

```bash
set +o pipefail
false | true
echo "exit=$?"
```

**Đáp số:**

```text
exit=0
```

<details>
<summary>Lời giải</summary>

Theo mặc định, exit code của một pipeline là exit code của **lệnh cuối cùng** —
`true` → `0`, dù `false` (lệnh đầu) đã thất bại. Đây là lỗi kinh điển làm một pipeline
"xanh" trong khi bước đầu đã hỏng.

</details>

## Câu 5 — cùng pipe đó, bật `pipefail`

```bash
set -o pipefail
false | true
echo "exit=$?"
set +o pipefail
```

**Đáp số:**

```text
exit=1
```

<details>
<summary>Lời giải</summary>

`set -o pipefail` đổi luật: exit code của cả pipeline là exit code **khác 0 cuối
cùng** xuất hiện trong chuỗi, nếu có. `false` thất bại → cả pipeline báo thất bại, dù
`true` ở cuối vẫn chạy bình thường. Đây là một trong ba cờ của bộ ba `set -euo pipefail`
— xem [Lab: viết script bash đầu tiên](bash-lab-first-script.md).

</details>

## Câu 6 — redirect stdout và stderr vào hai file khác nhau

```bash
ls /khong-ton-tai 1>out.txt 2>err.txt
echo "---stdout---"; cat out.txt
echo "---stderr---"; cat err.txt
```

**Đáp số:**

```text
---stdout---
---stderr---
ls: cannot access '/khong-ton-tai': No such file or directory
```

<details>
<summary>Lời giải</summary>

`ls` trên một path không tồn tại **không in gì ra stdout** — toàn bộ thông báo lỗi đi
ra stderr. `1>out.txt` chỉ tóm stdout (rỗng), `2>err.txt` tóm đúng dòng lỗi. Dồn cả hai
vào một file (`> file 2>&1`) sẽ trộn lẫn, mất khả năng tách riêng log lỗi.

</details>

## Câu 7 — thứ tự `>` và `2>&1` quyết định kết quả

```bash
{ echo "stdout"; echo "stderr" >&2; } > log.txt 2>&1
cat log.txt
```

**Đáp số:**

```text
stdout
stderr
```

<details>
<summary>Lời giải</summary>

`> log.txt 2>&1` đọc **từ trái qua phải**: trước tiên stdout trỏ vào `log.txt`, sau đó
`2>&1` nói "stderr trỏ vào **chỗ stdout đang trỏ**" — tức cũng vào `log.txt`. Viết
ngược lại (`2>&1 > log.txt`) sẽ cho kết quả khác: `2>&1` trỏ stderr vào nơi stdout
**đang** trỏ lúc đó (terminal), rồi mới đổi stdout sang file — stderr vẫn ra terminal.

</details>

## Câu 8 — here-string và `read`

```bash
read -r a b <<< "mot hai"
echo "a=$a b=$b"
```

**Đáp số:**

```text
a=mot b=hai
```

<details>
<summary>Lời giải</summary>

`<<< "chuỗi"` là here-string — biến chuỗi thành input của `read` mà không cần tạo file
tạm. `read -r a b` tách theo `IFS` (mặc định là khoảng trắng) và gán lần lượt vào `a`,
`b`. `-r` tắt việc hiểu `\` như ký tự escape — luôn dùng khi không chắc input có `\`.

</details>

## Câu 9 — command substitution và dòng trống cuối

```bash
x=$(printf 'line1\nline2\n')
echo "$x" | wc -l
```

**Đáp số:**

```text
2
```

<details>
<summary>Lời giải</summary>

`$(...)` **cắt bỏ mọi newline ở cuối** kết quả, dù `printf` có in `\n` cuối hay không.
`$x` chứa đúng `"line1\nline2"` (không có `\n` thừa ở cuối) — `echo "$x"` thêm lại một
newline khi in, rồi `wc -l` đếm đúng 2 dòng.

</details>

## Câu 10 — `set -u` và biến chưa khai báo: exit code là bao nhiêu

```bash
bash -c '
set -u
echo "$undefined_var"
'
echo "exit=$?"
```

**Đáp số:**

```text
bash: line 3: undefined_var: unbound variable
exit=127
```

<details>
<summary>Lời giải</summary>

**Bẫy hay đoán sai:** phần lớn người mới đoán exit code là `1`. Thật ra bash trả về
`127` cho lỗi "unbound variable" dưới `set -u` — cùng mã dùng cho "command not found".
Đừng dựa vào số exit code cụ thể để phân loại loại lỗi; đọc **thông báo lỗi** mới là
cách chắc.

</details>

## Câu 11 — `$?` bị reset bởi MỌI lệnh, kể cả `echo`

```bash
false
echo "lenh chen giua"
echo "exit sau do=$?"
```

**Đáp số:**

```text
lenh chen giua
exit sau do=0
```

<details>
<summary>Lời giải</summary>

Bẫy hay gặp: viết `false` rồi vài dòng sau mới kiểm `$?`, quên rằng **bất kỳ lệnh nào**
chạy giữa đó — kể cả `echo` vô hại — đã ghi đè `$?`. Muốn kiểm tra exit code của một
lệnh cụ thể, phải đọc `$?` **ngay sau** lệnh đó, hoặc lưu lại vào một biến riêng.

</details>

## Câu 12 — subshell `()` không đổi biến của shell cha, group `{}` thì có

```bash
x=1
(x=2); echo "sau subshell (): x=$x"
{ x=3; }; echo "sau group {}: x=$x"
```

**Đáp số:**

```text
sau subshell (): x=1
sau group {}: x=3
```

<details>
<summary>Lời giải</summary>

`(...)` chạy trong một **process con riêng** — mọi thay đổi biến bên trong biến mất
khi subshell kết thúc. `{...}` (group command, cần khoảng trắng sau `{` và `;` trước
`}`) chạy **trong chính shell hiện tại** — thay đổi biến có hiệu lực thật. Nhầm hai
cú pháp này là lý do phổ biến của "sao tôi gán biến trong `(...)` mà ra ngoài không
thấy gì".

</details>

## Câu 13 — chuỗi `&&`/`||` ba lệnh, đánh giá trái sang phải

```bash
true && echo "A" && false && echo "B"
echo "exit cuoi cung=$?"
```

**Đáp số:**

```text
A
exit cuoi cung=1
```

<details>
<summary>Lời giải</summary>

Chuỗi được đánh giá **tuần tự từ trái sang phải**: `true` → chạy `echo "A"` (in `A`)
→ `false` → dừng lại, **không chạy** `echo "B"` nữa. Exit code cuối cùng của toàn
chuỗi là exit code của lệnh **cuối cùng thực sự chạy** (`false` → `1`), không phải
lệnh viết cuối cùng trên dòng.

</details>

## Câu 14 — `PIPESTATUS`: lấy exit code của từng lệnh trong pipe

```bash
false | true | false
echo "PIPESTATUS=${PIPESTATUS[@]}"
```

**Đáp số:**

```text
PIPESTATUS=1 0 1
```

<details>
<summary>Lời giải</summary>

`PIPESTATUS` là array built-in, giữ **exit code của từng lệnh** trong pipeline cuối
cùng vừa chạy, theo đúng thứ tự — không cần `pipefail` mới xem được. Hữu ích khi cần
biết **cụ thể lệnh nào** trong một pipe dài đã thất bại, thay vì chỉ biết "có lệnh nào
đó thất bại" như `pipefail` cho biết.

</details>

## Câu 15 — `tee` trong pipe không tự "sửa" vấn đề của `pipefail`

```bash
false | tee /tmp/q15.log > /dev/null
echo "exit=$?"
```

**Đáp số:**

```text
exit=0
```

<details>
<summary>Lời giải</summary>

Không có `pipefail`, exit code của pipeline vẫn là exit code của lệnh **cuối cùng**
(`tee`, luôn thành công nếu ghi file được) — `false` ở đầu vẫn bị "nuốt" dù `tee` nằm
giữa chừng không phải cuối thật sự theo nghĩa thông thường. `tee` không đổi luật, chỉ
là một lệnh nữa trong chuỗi.

</details>

## Related Topics

- [Shell là gì](../reference/shell-la-gi.md) · [Streams và redirection](../reference/streams-va-redirection.md) · [Exit code và control flow](../reference/exit-code-va-control-flow.md) — lý thuyết cho bộ này
- [Bộ 2 — Quoting và expansion](bt-02-quoting-expansion.md) — bộ tiếp theo
- [Bài tập — Bash](index.md) — mục lục bộ bài tập
