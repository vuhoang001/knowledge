---
title: Exit code và control flow
sidebar_position: 4
description: "Bash điều khiển luồng bằng exit code chứ không phải true/false — if cmd nghĩa là cmd chạy thành công không, 0 mới là true."
tags: [exit-code, control-flow, test, pipefail, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Exit code và control flow

> **Chốt:** Bash không có boolean cho control flow — nó chỉ đọc **exit code**. `if cmd`
> không hỏi "cmd có trả về `true` không" mà hỏi "cmd có **chạy thành công** không", và
> thành công nghĩa là exit code `0`. Đây là chỗ ngược đời nhất với ai quen ngôn ngữ khác:
> **`0` là true**, mọi số khác `0` là false.

## Mục tiêu

- Hiểu exit code là gì, đọc nó bằng `$?`, và tại sao `0` = thành công.
- Đọc được `if cmd; then`, `&&`, `||` theo đúng ngữ nghĩa exit code chứ không phải boolean.
- Biết `test` / `[ ]` / `[[ ]]` đều chỉ là lệnh **trả exit code**.
- Nắm cạm bẫy `pipefail`: exit code của pipeline mặc định chỉ là của lệnh **cuối**.
- Biết quy ước code thông dụng (1, 2, 126, 127, 130) để đọc lỗi nhanh.

## Tổng quan

Mỗi lệnh khi kết thúc để lại một số nguyên `0..255` gọi là **exit code** (hay exit status).
Quy ước POSIX:

- `0` = **thành công**.
- khác `0` (1–255) = **lỗi**, và con số nói loại lỗi gì.

Biến đặc biệt `$?` giữ exit code của lệnh **vừa chạy xong**. Nó thay đổi sau *mỗi* lệnh,
nên muốn dùng lại phải bắt ngay:

```bash
some_command
code=$?          # bắt liền, đừng để lệnh khác ghi đè
```

Toàn bộ control flow của bash xây trên con số này. `if`, `while`, `&&`, `||` đều chỉ nhìn
exit code của lệnh, không có khái niệm "giá trị boolean" nào cả. Vì thế `if grep ...` là
idiom chuẩn — bạn không so sánh output, bạn hỏi "grep có tìm thấy không" (tìm thấy → `0` →
nhánh `then`).

## Ví dụ

> Chạy thật 2026-08-05 · bash 5.3.9(1) trên Ubuntu. Coreutils ở máy này là uutils 0.8.0, không phải GNU — output có thể lệch nhỏ so với GNU coreutils.

**1. Exit code cơ bản và `$?`.** `true`/`false` là hai lệnh chỉ để trả code:

```bash
true;  echo "true -> $?"
false; echo "false -> $?"
ls /khong-ton-tai 2>/dev/null; echo "ls fail -> $?"
```

```
true -> $?=0
false -> $?=1
ls fail -> $?=2
```

`false` trả `1` (lỗi chung), còn `ls` trả `2` — mỗi lệnh tự định nghĩa bảng code của nó.

**2. `if` chạy theo exit code, không theo boolean.** Dùng `grep -q` (im lặng, chỉ đặt code):

```bash
printf 'apple\nbanana\ncherry\n' > fruit.txt
if grep -q banana fruit.txt; then echo "tim thay banana"; else echo "khong thay"; fi
if grep -q durian fruit.txt; then echo "tim thay durian"; else echo "khong thay durian"; fi
grep -q durian fruit.txt; echo "grep durian -> $?"
```

```
tim thay banana
khong thay durian
grep durian -> $?=1
```

`grep` trả `0` khi có match, `1` khi không — `if` biến chính con số đó thành nhánh rẽ.

**3. `&&` và `||`, và cạm bẫy chuỗi ba lệnh.**

```bash
true  && echo "chay vi true thanh cong"
false || echo "chay vi false that bai"
true && false || echo "cmd3 chay du cmd1 (true) da thanh cong"
```

```
chay vi true thanh cong
chay vi false that bai
cmd3 chay du cmd1 (true) da thanh cong
```

Dòng ba là cái bẫy kinh điển: người ta đọc `cmd1 && cmd2 || cmd3` như "if cmd1 then cmd2
else cmd3", **sai**. Thực tế `||` chạy `cmd3` bất cứ khi nào **vế trái** (`cmd1 && cmd2`)
thất bại — kể cả khi `cmd1` thành công nhưng `cmd2` lỗi. Ở trên `true` thành công, `false`
lỗi, nên `cmd3` vẫn chạy.

**4. `test` / `[ ]` / `[[ ]]` chỉ là lệnh trả exit code.**

```bash
[[ 5 -gt 3 ]]; echo "[[ 5 -gt 3 ]] -> $?"
[[ 5 -gt 9 ]]; echo "[[ 5 -gt 9 ]] -> $?"
[ -f fruit.txt ]; echo "[ -f fruit.txt ] -> $?"
```

```
[[ 5 -gt 3 ]] -> $?=0
[[ 5 -gt 9 ]] -> $?=1
[ -f fruit.txt ] -> $?=0
```

Điều kiện đúng → `0`, sai → `1`. `[[ ]]` là **builtin** của bash (an toàn hơn với biến rỗng
và khoảng trắng), `[ ]` là `test` cổ điển. Chi tiết khác biệt xem cheatsheet toán tử test.

**5. `pipefail` — exit code của pipeline mặc định chỉ là lệnh cuối.**

```bash
false | true; echo "false | true -> $?"
true | false; echo "true | false -> $?"
set -o pipefail
false | true; echo "false | true (pipefail) -> $?"
set +o pipefail
```

```
false | true -> $?=0
true | false -> $?=1
false | true (pipefail) -> $?=1
```

Mặc định `false | true` trả `0` — lỗi của `false` bị **nuốt** vì bash chỉ lấy code của lệnh
cuối (`true`). Bật `set -o pipefail`, cùng pipeline đó trả `1`: pipeline thất bại nếu **bất
kỳ** lệnh nào trong pipe thất bại. Đây là lý do script production gần như luôn bật nó.

**6. `126` và `127` — không chạy được vs không tìm thấy.**

```bash
lenh-khong-ton-tai 2>/dev/null; echo "lenh khong tim thay -> $?"
echo -e '#!/bin/bash\necho hi' > noexec.sh; chmod -x noexec.sh
./noexec.sh 2>/dev/null; echo "khong co quyen exec -> $?"
```

```
lenh khong tim thay -> $?=127
khong co quyen exec -> $?=126
```

**`exit n`** trong script kết thúc script với code `n`. Quy ước hay gặp:

| Code | Nghĩa |
|---|---|
| `0` | thành công |
| `1` | lỗi chung, không phân loại |
| `2` | dùng sai (sai cú pháp, thiếu tham số) |
| `126` | tìm thấy lệnh nhưng **không chạy được** (thiếu quyền exec) |
| `127` | **không tìm thấy** lệnh (sai tên, không có trong `PATH`) |
| `130` | bị **Ctrl-C** (`128 + SIGINT(2)`) |

Nhìn `128 + n` là biết bị signal `n` giết — `137` = `128 + 9` (SIGKILL, thường do OOM).

## Trade-offs

- **`0` = true rất ngược trực giác** nhưng nhất quán với "một loại thành công, nhiều loại
  lỗi" — chỉ một code nói "ổn", còn `1..255` để phân biệt từng kiểu hỏng. Đổi lại, người
  mới hay viết `if [ $? == 0 ]` thừa thãi thay vì `if cmd`.
- **`pipefail` chặt hơn nhưng có thể gây "lỗi giả".** Ví dụ `cmd | head` có thể khiến `cmd`
  nhận SIGPIPE và trả code khác `0` khi `head` đóng sớm — với `pipefail` pipeline thành
  "thất bại" dù bạn cố ý chỉ lấy vài dòng đầu. Cần cân nhắc theo từng pipeline.
- **`[[ ]]` an toàn hơn `[ ]`** (không cần quote biến, có `=~`, `&&`) nhưng là bashism —
  không chạy trên `sh`/dash thuần POSIX. Script cần portable thì phải quay lại `[ ]`.

## Common Mistakes

- **Đọc `cmd1 && cmd2 || cmd3` như if/else.** Nếu `cmd2` lỗi, `cmd3` vẫn chạy dù `cmd1`
  đúng — xem ví dụ 3. Muốn if/else thật thì dùng `if ... then ... else ... fi`.
- **Bắt `$?` muộn.** `$?` đổi sau mỗi lệnh, kể cả `echo`. `cmd; echo "..."; if [ $? ...]`
  đang kiểm tra code của `echo`, không phải `cmd`. Gán `code=$?` ngay dòng sau `cmd`.
- **Tưởng pipeline báo lỗi khi lệnh giữa hỏng.** Không, mặc định chỉ lấy lệnh cuối —
  `curl ... | jq ...` mà `curl` chết vẫn có thể trả `0`. Bật `set -o pipefail`.
- **Quên non-zero là "lỗi" nhưng nhiều lệnh dùng non-zero làm tín hiệu bình thường.** `grep`
  trả `1` khi "không tìm thấy" — hoàn toàn hợp lệ. Nếu bật `set -e`, một `grep` không match
  vô hại có thể làm chết cả script (xem case-study set -e).
- **So sánh số bằng `==` trong `[ ]`.** `[ 5 -gt 3 ]` mới đúng cho số; `==`/`<` trong `[ ]`
  là so chuỗi. `[[ ]]` khoan dung hơn nhưng vẫn nên dùng `-gt`, `-eq` cho số.

## FAQ

<details>
<summary>Tại sao `0` lại là "true" trong bash mà `1` là "false", ngược mọi ngôn ngữ khác?</summary>

Vì bash không đánh giá **giá trị boolean**, nó đánh giá **sự thành công của một tiến trình**.
Một chương trình chỉ có một cách "chạy xong ổn" (`exit 0`) nhưng vô số cách hỏng (file
không thấy, sai tham số, hết bộ nhớ...), nên non-zero được dành để mã hoá *loại* lỗi.
`if`/`&&`/`||` xây trên ngữ nghĩa "thành công", nên `0` tự nhiên trở thành nhánh "đúng".

</details>

<details>
<summary>`test`, `[ ]` và `[[ ]]` khác nhau thế nào, khi nào dùng cái nào?</summary>

`test EXPR` và `[ EXPR ]` là **cùng một lệnh** (POSIX `test`, `[` chỉ là tên khác cần `]`
đóng). `[[ EXPR ]]` là **builtin của bash**: không word-split/glob biến nên an toàn hơn với
khoảng trắng và biến rỗng, hỗ trợ `&&`, `||`, `=~` (regex). Dùng `[[ ]]` cho script bash;
chỉ quay lại `[ ]` khi cần chạy trên `sh`/dash thuần POSIX. Bảng toán tử đầy đủ ở cheatsheet
test-operators.

</details>

<details>
<summary>Bật `set -o pipefail` xong pipeline `cmd | head` tự dưng báo lỗi, sao vậy?</summary>

Khi `head` lấy đủ dòng và đóng đầu đọc, `cmd` ghi tiếp vào pipe đã đóng sẽ nhận `SIGPIPE`
và kết thúc với code `141` (`128 + 13`). Mặc định code này bị lệnh cuối (`head`, `0`) che
đi; với `pipefail` nó nổi lên và pipeline thành "thất bại". Đây là hành vi đúng nhưng gây
phiền — với những pipeline cố ý cắt sớm, có thể tách `head` ra hoặc chấp nhận và kiểm tra
`PIPESTATUS` để phân biệt lỗi thật.

</details>

<details>
<summary>Làm sao biết một script bị người dùng Ctrl-C hay bị hệ thống giết?</summary>

Quy ước exit code bị signal là `128 + số_signal`. `130` = `128 + 2` (SIGINT, Ctrl-C);
`137` = `128 + 9` (SIGKILL, thường là OOM killer); `143` = `128 + 15` (SIGTERM, bị
`kill` bình thường). Thấy code `> 128` là gần như chắc chắn tiến trình bị signal chứ không
tự `exit`.

</details>

## Related Topics

- [Điều kiện và vòng lặp](../skills/conditionals-va-loops.md)
- [Viết script an toàn](../skills/viet-script-an-toan.md)
- [Cheatsheet toán tử test](../cheatsheets/test-operators-va-expansion.md)
- [Pipe nuốt exit code](../case-studies/pipe-nuot-exit-code.md)
- [set -e không bắt](../case-studies/set-e-khong-bat.md)

## References

- `man bash` — mục *EXIT STATUS*, *Pipelines*, *Compound Commands* (`[[ ]]`), `set` (`pipefail`).
- `help test`, `help [[`, `help set` — trợ giúp builtin trong bash.
- Advanced Bash-Scripting Guide — *Exit Codes With Special Meanings* (bảng 1/2/126/127/130).
