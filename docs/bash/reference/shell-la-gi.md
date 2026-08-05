---
title: Shell là gì
sidebar_position: 1
description: "Shell là chương trình biến văn bản thành tiến trình — bash, sh, zsh khác nhau ở cú pháp nào chạy được."
tags: [shell, bash, process, shebang]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Shell là gì

> **Chốt:** Shell là một chương trình đọc dòng lệnh rồi `fork+exec` ra tiến trình — nó là REPL của hệ điều hành, và "shell" nào bạn đang chạy quyết định cú pháp nào hợp lệ.

## Mục tiêu

Hiểu shell là process đọc lệnh và tạo process con, và biết vì sao cùng một script chạy khác nhau dưới `sh`, `bash`, `zsh` — để không mất buổi debug vì một cái shebang.

## Tổng quan

Shell không phải là terminal. Terminal là cửa sổ vẽ chữ; shell là chương trình chạy **bên trong** nó, làm đúng một vòng lặp: đọc một dòng → phân tích → nếu là builtin thì tự làm, nếu là lệnh ngoài thì `fork` một process con rồi `exec` file thực thi → chờ nó xong → in prompt và lặp lại. Đó là một REPL (read–eval–print loop) cho cả hệ điều hành.

Chỗ hay gây nhầm: có hai loại lệnh.

| Loại | Là gì | Ví dụ | Tại sao phải phân biệt |
|---|---|---|---|
| **builtin** | Hàm nằm trong chính process shell, không đẻ process con | `cd`, `type`, `echo` (bản builtin) | `cd` **bắt buộc** là builtin — một process con không thể đổi thư mục của process cha |
| **external** | File thực thi trên đĩa, shell `fork+exec` để chạy | `/bin/ls`, `/usr/bin/python3` | Shell phải dò `$PATH` để tìm file; chạy nó tốn một process mới |

Còn "shell" là cả một họ chương trình khác nhau:

| Shell | Vai trò | Cạm bẫy |
|---|---|---|
| `bash` | Shell tương tác phổ biến trên Linux; nhiều mở rộng ngoài POSIX | `[[ ]]`, array, `${var:-default}` chỉ có ở đây/zsh |
| `sh` | Chuẩn POSIX tối giản. Trên Ubuntu `/bin/sh` **là dash** | Viết `#!/bin/sh` mà xài cú pháp bash → chết ngay |
| `zsh` | Mặc định trên macOS; siêu nhiều tính năng tương tác | Cú pháp gần bash nhưng array đánh index từ 1, khác biệt tinh vi |
| `dash` | Shell POSIX nhỏ, nhanh, dùng để chạy script hệ thống | Không có `[[ ]]`, không có array — thấy `(` là báo lỗi cú pháp |

### login / interactive / non-interactive → đọc file nào

Bash đọc file khởi động khác nhau tùy nó được gọi kiểu nào — đây là lý do "sửa `.bashrc` mà đăng nhập SSH không thấy áp dụng".

| Kiểu shell | Khi nào | File đọc |
|---|---|---|
| **login** | Đăng nhập SSH, `bash -l`, TTY thật | `/etc/profile` → `~/.bash_profile` (hoặc `~/.bash_login` / `~/.profile`) |
| **interactive non-login** | Mở tab terminal mới trên desktop | `~/.bashrc` |
| **non-interactive** | Chạy `bash script.sh` | Không đọc gì (trừ `$BASH_ENV` nếu đặt) |

Mẹo thực dụng: nhét cấu hình vào `~/.bashrc`, rồi cho `~/.bash_profile` `source ~/.bashrc` — thế thì cả login lẫn non-login đều nhận.

## Ví dụ

Tất cả khối dưới đây: **Chạy thật 2026-08-05 · bash 5.3.9(1) trên Ubuntu. Coreutils ở máy này là uutils 0.8.0, không phải GNU — output có thể lệch nhỏ so với GNU coreutils.**

### `type` phân biệt builtin với external

```bash
type cd        # builtin
type -a echo   # tất cả nơi tên này trỏ tới
```

```text
cd is a shell builtin
echo is a shell builtin
echo is /usr/bin/echo
echo is /bin/echo
```

`type -a` liệt kê **mọi** nghĩa của một cái tên theo thứ tự shell chọn. Ở đây `echo` vừa là builtin (cái được chạy) vừa là hai file ngoài — biết điều này để không ngạc nhiên khi `echo` trong script khác `echo` bạn tưởng.

`type` là builtin của bash nên chính xác nhất. `command -v` cho tên POSIX-portable. `which` là một **file ngoài** dò `$PATH` — nó không biết gì về builtin/alias, nên hay nói dối:

```bash
command -v cd        # -> cd
which cd             # which: no cd in (...) — không thấy vì cd không phải file
type ls              # trên box này ls bị alias
```

```text
cd
ls is an alias for lsd
```

### PATH lookup theo thứ tự

```bash
echo "$PATH"
type -a python3
```

```text
/home/hoanggggf/.local/bin:...:/usr/local/bin:/usr/bin:/bin:...
python3 is /usr/bin/python3
python3 is /bin/python3
```

Shell duyệt `$PATH` **trái sang phải**, dùng cái đầu tiên khớp. Nhét thư mục của bạn lên đầu `$PATH` là cách "đè" một lệnh hệ thống — cũng là cách một `PATH` bẩn khiến bạn chạy nhầm binary.

### Script có shebang

```bash
cat > greet.sh <<'EOF'
#!/usr/bin/env bash
name=${1:-world}
if [[ "$name" == "root" ]]; then
  echo "hello, superuser"
else
  echo "hello, $name"
fi
EOF
chmod +x greet.sh
./greet.sh Thang
```

```text
hello, Thang
```

`#!` (shebang) ở dòng đầu bảo kernel dùng interpreter nào chạy file. `chmod +x` bật quyền thực thi — thiếu nó thì `./greet.sh` báo *Permission denied*. Dùng `${1:-world}` (giá trị mặc định) và `[[ ]]` — cả hai đều là cú pháp bash, sẽ gãy dưới `sh`, xem ngay dưới.

### Cùng một script, `sh` khác `bash`

```bash
cat > arr.sh <<'EOF'
#!/bin/sh
arr=(a b c)
echo "${arr[1]}"
EOF
chmod +x arr.sh
./arr.sh      # kernel đọc shebang -> chạy bằng /bin/sh = dash
bash arr.sh   # ép chạy bằng bash
```

```text
./arr.sh: 2: Syntax error: "(" unexpected
exit=2
b
exit=0
```

Đây là cạm bẫy kinh điển. Array `arr=(a b c)` là cú pháp bash. Vì shebang ghi `#!/bin/sh` mà `/bin/sh` trên Ubuntu là **dash**, dash thấy `(` liền báo lỗi. Đổi shebang thành `#!/usr/bin/env bash` là chạy được. `[[ ]]` cũng vậy:

```bash
sh   -c '[[ 1 == 1 ]] && echo ok'   # dash: [[: not found (exit 127)
bash -c '[[ 1 == 1 ]] && echo ok'   # ok
```

## Trade-offs

| Lựa chọn | Được | Mất |
|---|---|---|
| Shebang `#!/bin/sh` (POSIX) | Portable tối đa, chạy trên mọi Unix, script hệ thống | Không array, không `[[ ]]`, không `${var:-x}` — cú pháp nghèo nàn |
| Shebang `#!/usr/bin/env bash` | Có đủ đồ chơi bash; `env` tìm bash trong `$PATH` nên hợp máy lạ (macOS để bash ở `/usr/local/bin`) | Phụ thuộc `$PATH`; cần bash cài sẵn |
| Shebang `#!/bin/bash` (đường dẫn cứng) | Rõ ràng, không phụ thuộc `$PATH`, an toàn hơn khi chạy setuid | Chết trên hệ mà bash không ở `/bin/bash` |
| builtin | Nhanh, không đẻ process, sửa được trạng thái shell (`cd`) | Ít, cố định theo shell |
| external command | Vô số công cụ, độc lập ngôn ngữ | Tốn một `fork+exec` mỗi lần; phải nằm trong `$PATH` |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Viết `#!/bin/sh` nhưng dùng array / `[[ ]]` | Trên Ubuntu `/bin/sh` là dash → `Syntax error: "(" unexpected`, script chết |
| Tưởng `sh script.sh` và `bash script.sh` như nhau | `sh` bỏ qua shebang và ép dùng POSIX shell — cú pháp bash gãy dù dòng đầu ghi `#!/bin/bash` |
| Dùng `which` để kiểm tra một builtin hay alias | `which` là file ngoài, mù với builtin/alias → báo "không tìm thấy" dù lệnh chạy tốt |
| Quên `chmod +x` rồi `./script.sh` | `Permission denied` — file có nội dung đúng vẫn không chạy |
| Cho rằng `cd` trong script con đổi được thư mục shell cha | Không thể — `cd` là builtin, mỗi process có cwd riêng, con không sửa được cha |
| Sửa `~/.bashrc` rồi ngạc nhiên vì login SSH không áp dụng | Login shell đọc `~/.bash_profile`, không đọc `~/.bashrc` |

## FAQ

<details>
<summary>Shell với terminal khác nhau chỗ nào?</summary>

Terminal (hay terminal emulator: GNOME Terminal, iTerm, Kitty) là chương trình vẽ chữ và nhận phím. Shell (`bash`, `zsh`) là chương trình chạy bên trong đó, làm việc đọc lệnh và tạo process. Bạn có thể chạy shell không cần terminal (qua SSH pipe, cron), và terminal không cần shell (chạy thẳng một chương trình khác).

</details>

<details>
<summary>Nên dùng `#!/usr/bin/env bash` hay `#!/bin/bash`?</summary>

`#!/usr/bin/env bash` portable hơn vì `env` dò `$PATH` tìm bash — quan trọng trên macOS/BSD nơi bash không nằm ở `/bin/bash`. Đổi lại nó phụ thuộc `$PATH` và không nhận tham số interpreter tốt. `#!/bin/bash` chắc chắn hơn cho script chạy trên Linux server cố định, và bắt buộc khi lo về bảo mật (setuid). Mặc định nên dùng `env`; chỉ hardcode khi bạn kiểm soát được môi trường.

</details>

<details>
<summary>Vì sao `cd` phải là builtin mà không phải một chương trình ngoài?</summary>

Đổi thư mục làm việc (cwd) là thay đổi **trạng thái của process**. Nếu `cd` là file ngoài, shell phải `fork` một process con để chạy nó; process con đổi cwd của chính nó rồi chết — cwd của shell cha không nhúc nhích. Muốn `cd` có tác dụng, nó phải chạy **trong** chính process shell, tức là builtin.

</details>

<details>
<summary>Làm sao biết mình đang ở shell nào?</summary>

`echo "$0"` in tên shell đang chạy (ví dụ `-bash` cho login shell). `echo "$BASH_VERSION"` có giá trị nếu là bash, rỗng nếu là dash/sh. Cẩn thận: `$SHELL` chỉ là shell **đăng nhập mặc định** trong `/etc/passwd`, không phải shell bạn đang gõ — đừng tin nó để phân nhánh logic.

</details>

## Related Topics

- [Streams và redirection](streams-va-redirection.md)
- [Quoting và expansion](quoting-va-expansion.md)
- [Exit code và control flow](exit-code-va-control-flow.md)
- [Viết script an toàn](../skills/viet-script-an-toan.md)
- [Cheatsheet lệnh bash](../cheatsheets/commands.md)

## References

- `man bash` — mục *INVOCATION* (login/interactive), *SHELL BUILTIN COMMANDS*
- POSIX Shell Command Language: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html
- `man 2 execve` — cách kernel xử lý dòng shebang `#!`
