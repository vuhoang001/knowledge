---
title: Viết script an toàn
sidebar_position: 6
description: "Bốn dòng đầu mọi script — shebang, set -euo pipefail, bọc nháy kép mọi biến, và trap dọn dẹp — chặn phần lớn lỗi script kinh điển."
tags: [scripting, set-e, pipefail, trap, shellcheck, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-05
---

# Viết script an toàn

> **Chốt:** Bốn dòng đầu — `#!/usr/bin/env bash`, `set -euo pipefail`, bọc `"$var"` mọi nơi, `trap 'cleanup' EXIT` — chặn phần lớn lỗi script kinh điển. Nhưng `set -e` có nhiều lỗ (trong `if`, sau `||`, giữa pipe), nên đừng tin nó tuyệt đối: viết cẩn thận vẫn cần, và chạy `shellcheck` để bắt phần còn lại.

## Mục tiêu

- Biết bộ khung an toàn đặt ở đầu mọi script và **từng cờ** làm gì.
- Hiểu vì sao `set -e` không phải viên đạn bạc — nó im lặng ở đúng những chỗ hay sai.
- Dùng `trap` + `mktemp` để dọn dẹp đáng tin, dù script thoát kiểu gì.
- Kiểm tra tham số đầu vào để script chết sớm với thông báo rõ, không chạy nửa vời.
- Dùng `shellcheck`, `bash -n`, `bash -x` để bắt lỗi trước khi chúng cắn.

## Tổng quan

Một script bash mặc định chạy theo triết lý "cứ tiếp tục dù có chuyện gì". Lệnh lỗi ở
giữa? Nó kệ, chạy tiếp lệnh sau — với dữ liệu sai. Biến gõ nhầm tên? Nó nở thành chuỗi
rỗng, và `rm -rf "$dir/"` thành `rm -rf /`. Pipeline lỗi ở khúc giữa? Exit code vẫn là 0
vì bash chỉ lấy code của lệnh **cuối** pipe.

Bốn dòng đầu đảo ngược mặc định đó:

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'          # tuỳ chọn — xem Trade-offs
```

- **`#!/usr/bin/env bash`** — shebang. Tìm `bash` trong `PATH` thay vì hard-code
  `/bin/bash`. Quan trọng trên macOS (bash `/bin/bash` là bản 3.2 cổ lỗ; bản mới nằm
  chỗ khác) hoặc NixOS. Không có shebang, script chạy bằng `sh` của hệ thống — có thể là
  `dash`, không có array, không có `[[ ]]`.
- **`set -e`** (errexit) — thoát ngay khi một lệnh trả exit code khác 0. Đây là cái
  giá trị nhất và cũng **rò rỉ nhất** — xem Cạm bẫy bên dưới.
- **`set -u`** (nounset) — dùng biến chưa khai báo là lỗi. Bắt gõ nhầm tên biến, thứ
  im lặng nhất và nguy hiểm nhất trong bash.
- **`set -o pipefail`** — pipeline lấy exit code của lệnh **lỗi đầu tiên**, không phải
  lệnh cuối. Không có nó, `curl ... | grep ...` báo thành công dù `curl` chết.

Ba cờ này gộp thành `set -euo pipefail`. Cộng với bọc nháy kép mọi biến và một `trap`
dọn dẹp, đó là toàn bộ bộ khung.

## Ví dụ

> Chạy thật 2026-08-05 · Ubuntu, bash 5.3.9(1). Nháp trong `/tmp/bashlab-safe`.

### `set -u` bắt biến gõ nhầm

Đây là lý do lớn nhất để bật `set -u`. Không có nó, `$naem` nở thành rỗng và script chạy
tiếp với dữ liệu sai.

```bash
set -euo pipefail
name="Alice"
echo "Xin chao $naem"    # gõ nhầm: naem thay vì name
echo "khong bao gio toi day"
```

```text
bash: line 4: naem: unbound variable
exit code: 1
```

Script chết ngay tại dòng gõ nhầm, không in dòng sau. Không có `set -u`, nó in
`Xin chao ` rồi tiếp tục — im lặng.

### `pipefail` trả lại exit code bị pipe nuốt

```bash
# KHONG pipefail
set -e; false | echo "ok"; echo "exit=$?"
```

```text
ok
exit=0
```

```bash
# CO pipefail
set -eo pipefail; false | echo "ok"; echo "exit=$?"
```

```text
ok
script exit: 1
```

Không `pipefail`, `false` (lỗi) bị `echo` (thành công) ở cuối pipe che mất — exit=0,
`set -e` không kích hoạt. Có `pipefail`, exit code lỗi lộ ra và script chết. Chi tiết ở
case study [Pipe nuốt exit code](../case-studies/pipe-nuot-exit-code.md).

### `set -e` KHÔNG bắt ở đâu — cạm bẫy cốt lõi

Đây là phần quan trọng nhất của cả bài. `set -e` im lặng ở đúng những chỗ ta hay đặt
lệnh có thể lỗi:

```bash
set -e
if false; then :; fi              # false trong if khong lam thoat
echo "A: qua duoc if false"
false || echo "B: qua duoc ||"
out=$(false; echo "sau false")    # command subst: lenh khong-cuoi khong bat
echo "C: out=[$out]"
false                             # day moi lam thoat
echo "D: KHONG in"
```

```text
A: qua duoc if false
B: qua duoc || 
C: out=[sau false]
exit cuoi: 1
```

Ba lần `false` đầu **không** làm thoát, chỉ lần cuối (đứng độc lập) mới thoát. `set -e`
tắt trong: điều kiện của `if`/`while`/`until`, bất kỳ lệnh nào bên trái `&&`/`||`, lệnh
không phải lệnh cuối trong một chuỗi/pipe, và (kinh điển) trong command substitution.
Đây là lý do đừng tin `set -e` là tấm khiên tuyệt đối. Xem case study
[set -e không bắt](../case-studies/set-e-khong-bat.md).

### `trap cleanup EXIT` — dọn dẹp dù thoát kiểu gì

Script tạo file tạm rồi lỗi giữa chừng. Không có `trap`, file tạm rác lại. Có `trap`,
nó biến mất kể cả khi `set -e` đá script ra giữa đường:

```bash
#!/usr/bin/env bash
set -euo pipefail

tmp=$(mktemp)
trap 'echo "  [cleanup] xoa $tmp"; rm -f "$tmp"' EXIT

echo "  tao temp: $tmp"
echo "du lieu" > "$tmp"
ls -l "$tmp" | awk '{print "  ton tai:", $NF}'

false          # loi giua chung -> set -e thoat
echo "  KHONG bao gio in dong nay"
```

```text
  tao temp: /tmp/tmp.0F7X3trkDq
  ton tai: /tmp/tmp.0F7X3trkDq
  [cleanup] xoa /tmp/tmp.0F7X3trkDq
script exit: 1
so file tmp.* con lai: 0
```

`trap ... EXIT` chạy khi shell thoát vì **bất kỳ** lý do gì — thành công, `set -e`,
`exit`, hay Ctrl-C. Đây là cách đáng tin duy nhất để xoá temp / kill job nền / tháo lock.
Đừng đặt `rm` ở cuối script: nếu script chết trước đó, dòng `rm` không bao giờ chạy.

`mktemp` (và `mktemp -d` cho thư mục) sinh tên duy nhất do kernel cấp — tránh đụng tên,
race condition và symlink attack mà tên cố định như `/tmp/mytemp` gặp phải.

### Script hoàn chỉnh: khung an toàn + trap + kiểm tham số

Ghép tất cả. Script này kiểm tham số, tạo vùng tạm, dọn qua `trap`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# kiem tra tham so
[[ $# -lt 1 ]] && { echo "usage: $0 <ten-file>" >&2; exit 2; }
src=${1:?can duong dan file nguon}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

cp "$src" "$work/"
count=$(ls -1 "$work" | wc -l)
echo "da sao chep $count file vao vung tam"
echo "OK: backup xong cho $src"
```

Case thành công:

```text
=== CASE 1: thanh cong ===
da sao chep 1 file vao vung tam
OK: backup xong cho input.txt
exit: 0
```

Case thiếu tham số — chết sớm, thông báo rõ, exit code 2:

```text
=== CASE 2: thieu tham so ===
usage: ./backup.sh <ten-file>
exit: 2
```

Hai lớp kiểm tra bổ sung nhau: `[[ $# -lt 1 ]]` cho thông báo `usage` thân thiện; còn
`${1:?can duong dan file nguon}` là chốt chặn cuối — nếu vì lý do nào đó lọt qua, bash tự
in `bash: 1: can duong dan file nguon` và thoát. Chọn exit code khác 0 và khác 1 (ở đây
là `2`) để phân biệt "lỗi dùng sai" với "lỗi khi chạy".

### `bash -n` (kiểm cú pháp) và `bash -x` (trace)

`bash -n` phân tích cú pháp mà **không chạy** — bắt lỗi thiếu `fi`, `done`, ngoặc lệch
trước khi script làm gì nguy hiểm:

```text
syntax-err.sh: line 5: syntax error: unexpected end of file from `if' command on line 2
exit: 2
```

`bash -x` in mỗi lệnh (sau khi nở biến) trước khi chạy — vũ khí debug số một khi không
hiểu vì sao biến ra giá trị lạ:

```text
+ x=2
+ y=3
+ echo 5
5
```

### ShellCheck

`shellcheck` là linter bắt tự động phần lớn lỗi trên: biến chưa quote, `$(ls)` trong
`for`, dùng biến chưa gán. **Trên máy chạy bài này chưa cài `shellcheck`** (`command -v
shellcheck` trả rỗng), nên phần dưới là **minh hoạ, chưa chạy** — output thật tuỳ phiên
bản. Cài bằng `sudo apt install shellcheck`.

Với script cố tình sai:

```bash
#!/usr/bin/env bash
rm -rf $dir/temp          # $dir chua quote, chua set
for f in $(ls *.txt); do  # parse ls -> vo cung nhieu bug
  echo $f
done
```

ShellCheck sẽ báo đại loại (minh hoạ, chưa chạy):

```text
In bad.sh line 2:
rm -rf $dir/temp
       ^--^ SC2154: dir is referenced but not assigned.
       ^--^ SC2086: Double quote to prevent globbing and word splitting.

In bad.sh line 3:
for f in $(ls *.txt); do
         ^--------^ SC2045: Iterating over ls output is fragile. Use globs.
```

Chạy `shellcheck script.sh` như một bước trong workflow (hoặc CI) bắt được lỗi mà mắt bỏ
sót — nó biết cả những lỗ của `set -e`.

## Trade-offs

| Lựa chọn | Được | Mất / Cạm bẫy |
|---|---|---|
| `set -e` | Thoát sớm khi lỗi, không chạy tiếp với dữ liệu sai | Im lặng trong `if`/`while`/`\|\|`/pipe giữa/command subst. Không thay được việc kiểm lỗi tường minh cho code quan trọng |
| `set -u` | Bắt gõ nhầm tên biến ngay | Biến tuỳ chọn phải viết `${VAR:-default}` nếu không sẽ chết. `"$@"` với 0 tham số vẫn an toàn, nhưng `$1` thì không |
| `set -o pipefail` | Không nuốt exit code trong pipe | `cmd \| head` giờ báo lỗi 141 (SIGPIPE) vì `head` đóng pipe sớm — đôi khi phải xử lý riêng |
| `IFS=$'\n\t'` | Loại space khỏi word-splitting, an toàn hơn với tên file có dấu cách | Đổi hành vi mặc định, dễ gây bất ngờ ở chỗ **có ý** tách theo space. Tuỳ chọn, không bắt buộc |
| `trap ... EXIT` | Dọn dẹp đáng tin dù thoát kiểu gì | Chỉ nên có một handler EXIT; `trap` sau ghi đè `trap` trước. Handler chạy trong ngữ cảnh lỗi, giữ nó đơn giản |
| ShellCheck trong CI | Bắt lỗi tự động, cả những lỗ `set -e` không thấy | Thêm một bước; đôi khi cảnh báo phải `# shellcheck disable=` khi bạn cố ý |

Quy tắc ngón cái: `set -euo pipefail` là mặc định đúng cho script mới. `IFS` thì cân
nhắc. Và đừng để `set -e` ru ngủ — với thao tác nguy hiểm (xoá, ghi đè, deploy), vẫn
kiểm exit code tường minh bằng `if ! cmd; then ...`.

## Common Mistakes

- **Tin `set -e` bắt mọi lỗi.** Nó không bắt trong `if`, sau `||`/`&&`, ở lệnh
  không-cuối trong pipe (trừ khi có `pipefail`), và trong command substitution. Code
  quan trọng vẫn phải kiểm tường minh.
- **Không quote biến.** `rm -rf $dir/` với `$dir` rỗng (do `set -u` chưa bật) hoặc chứa
  dấu cách là thảm hoạ. Luôn `"$var"`, `"$@"` (không phải `$*`). Xem
  [Quoting và expansion](../reference/quoting-va-expansion.md).
- **Dùng tên temp cố định** như `/tmp/myapp.tmp`. Đụng khi chạy song song, và mở đường
  cho symlink attack. Luôn `mktemp` / `mktemp -d`.
- **Đặt `rm` dọn dẹp ở cuối script** thay vì trong `trap`. Nếu script chết giữa chừng
  (rất dễ với `set -e`), dòng dọn dẹp không bao giờ chạy → rác temp.
- **`${1}` không kiểm tra.** Với `set -u`, `$1` thiếu là lỗi nhưng thông báo khó hiểu.
  Thêm `${1:?...}` hoặc kiểm `$#` để có thông báo `usage` rõ ràng.
- **Quên shebang hoặc dùng `#!/bin/sh`** rồi xài tính năng bash (`[[ ]]`, array).
  `sh` có thể là `dash` — script chết với lỗi cú pháp khó hiểu.
- **Exit code 1 cho mọi thứ.** Dùng code khác nhau (2 cho lỗi tham số, ...) để caller
  phân biệt được. Xem [Exit code và control flow](../reference/exit-code-va-control-flow.md).

## FAQ

<details>
<summary>Có nên luôn bật <code>set -euo pipefail</code> không?</summary>

Cho script bạn viết và kiểm soát: có, đó là mặc định tốt. Cho script tương tác nguồn
(sourced) vào shell của người khác, hoặc script dài đã ổn định mà `set -e` gây thoát bất
ngờ ở chỗ bạn cố ý cho lệnh lỗi: cân nhắc. `set -e` có tiếng là "vừa cứu mạng vừa gây
bất ngờ". Nhiều người kỳ cựu bật `set -uo pipefail` nhưng thay `set -e` bằng kiểm lỗi
tường minh ở chỗ quan trọng. Không có câu trả lời đúng tuyệt đối — quan trọng là hiểu nó
im lặng ở đâu.

</details>

<details>
<summary>Vì sao <code>IFS=$'\n\t'</code> là tuỳ chọn còn ba cờ kia thì nên có?</summary>

Đổi `IFS` loại dấu cách khỏi word-splitting, an toàn hơn khi lặp qua tên file có dấu
cách. Nhưng nó đổi một hành vi nền mà nhiều đoạn code (kể cả thư viện bạn source vào)
ngầm dựa vào. Ba cờ `set` chỉ làm bash **nghiêm hơn** — hiếm khi phá code đúng. `IFS`
thì đổi ngữ nghĩa tách chuỗi, dễ gây bất ngờ hơn. Nếu dùng, đặt sớm và biết rõ mình đang
làm gì.

</details>

<details>
<summary><code>trap</code> nhiều tín hiệu cùng lúc thì sao?</summary>

`trap 'cleanup' EXIT` là đủ cho hầu hết trường hợp vì EXIT chạy dù thoát vì lý do gì,
kể cả sau khi nhận SIGINT/SIGTERM (bash chạy EXIT sau handler tín hiệu). Nếu cần phản
ứng riêng với Ctrl-C (ví dụ in "đang huỷ..."), thêm `trap 'echo huy; exit 130' INT`.
Nhưng nhớ: mỗi lần `trap` cho một tín hiệu **ghi đè** handler cũ của tín hiệu đó, nên
gom logic dọn dẹp vào một hàm `cleanup()` và trỏ mọi trap về nó.

</details>

<details>
<summary>ShellCheck báo lỗi ở dòng tôi cố ý viết vậy thì sao?</summary>

Thêm comment `# shellcheck disable=SCxxxx` ngay trên dòng đó, với mã lỗi cụ thể. Đừng
tắt cả file. Ví dụ khi bạn **thật sự** muốn word-splitting: `# shellcheck disable=SC2086`.
Việc phải viết mã lỗi ra buộc bạn xác nhận mình hiểu cảnh báo và cố ý bỏ qua — khác với
tắt mù quáng.

</details>

## Related Topics

- [Exit code và control flow](../reference/exit-code-va-control-flow.md)
- [Quoting và expansion](../reference/quoting-va-expansion.md)
- [Hàm trong bash](functions.md)
- [set -e không bắt](../case-studies/set-e-khong-bat.md)
- [Pipe nuốt exit code](../case-studies/pipe-nuot-exit-code.md)
- [Lab: script đầu tiên](../tutorials/bash-lab-first-script.md)

## References

- [Bash Reference Manual — The Set Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
- [Bash Reference Manual — Bourne Shell Builtins (trap)](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html)
- [ShellCheck](https://www.shellcheck.net/)
- [BashFAQ/105 — Why doesn't set -e do what I expected?](https://mywiki.wooledge.org/BashFAQ/105)
- [mktemp(1) man page](https://man7.org/linux/man-pages/man1/mktemp.1.html)
