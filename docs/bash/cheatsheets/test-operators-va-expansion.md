---
title: Cheatsheet toán tử test và expansion
sidebar_position: 2
description: "Tra nhanh toán tử test file/chuỗi/số, khác biệt giữa ngoặc vuông đơn đôi, parameter expansion và các biến đặc biệt."
tags: [cheatsheet, test, parameter-expansion, bash]
domain: devops
category: tool
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Cheatsheet toán tử test và expansion

> **Chốt:** So sánh số dùng `-eq`/`-lt`/…, so sánh chuỗi dùng `=`/`!=`, và luôn ưu tiên `[[ ]]` hơn `[ ]` vì nó không bị word-split hay globbing.

## Test file

`[[ -f "$path" ]]` — trả về đúng khi điều kiện thỏa.

| Toán tử | Đúng khi |
|---|---|
| `-e f` | `f` tồn tại (bất kỳ loại nào) |
| `-f f` | `f` tồn tại và là file thường |
| `-d f` | `f` tồn tại và là thư mục |
| `-r f` | `f` tồn tại và đọc được |
| `-w f` | `f` tồn tại và ghi được |
| `-x f` | `f` tồn tại và thực thi được (thư mục: vào được) |
| `-s f` | `f` tồn tại và kích thước lớn hơn 0 |
| `-L f` | `f` là symbolic link |
| `-h f` | `f` là symbolic link (giống `-L`) |
| `f1 -nt f2` | `f1` mới hơn `f2` (newer than), hoặc `f1` có mà `f2` không |
| `f1 -ot f2` | `f1` cũ hơn `f2` (older than), hoặc `f2` có mà `f1` không |

## Test chuỗi

| Toán tử | Đúng khi |
|---|---|
| `-z s` | `s` rỗng (độ dài 0) |
| `-n s` | `s` khác rỗng |
| `s1 = s2` | hai chuỗi bằng nhau (POSIX) |
| `s1 == s2` | bằng nhau; trong `[[ ]]` vế phải là pattern glob |
| `s1 != s2` | khác nhau |
| `s1 < s2` | `s1` đứng trước theo thứ tự từ điển (trong `[[ ]]`) |
| `s1 > s2` | `s1` đứng sau theo thứ tự từ điển (trong `[[ ]]`) |
| `s =~ re` | `s` khớp regex `re` — **chỉ trong `[[ ]]`**, regex không bọc nháy |

Trong `[ ]`, `<` và `>` bị hiểu là redirect — phải escape `\<`, `\>`. Đây là lý do dùng `[[ ]]`.

## Test số

| Toán tử | Đúng khi |
|---|---|
| `-eq` | bằng (equal) |
| `-ne` | khác (not equal) |
| `-lt` | nhỏ hơn (less than) |
| `-le` | nhỏ hơn hoặc bằng |
| `-gt` | lớn hơn (greater than) |
| `-ge` | lớn hơn hoặc bằng |

Các toán tử này dùng cho **SỐ** (`[[ $a -lt $b ]]`). So sánh chuỗi thì dùng `=`/`!=`, không dùng `-eq`. `[[ "01" -eq "1" ]]` đúng (số) nhưng `[[ "01" = "1" ]]` sai (chuỗi).

## `[ ]` vs `[[ ]]` vs `(( ))`

| | `[ ]` (test) | `[[ ]]` | `(( ))` |
|---|---|---|---|
| Bản chất | lệnh POSIX | từ khóa bash | ngữ cảnh số học |
| Word-split biến | **có** — phải bọc nháy | không | không |
| Glob vế phải `==` | không | có (pattern) | — |
| Regex `=~` | không | có | — |
| Toán tử logic | `-a` / `-o` (dễ lỗi) | `&&` / `||` | `&&` / `||` |
| So sánh số | `-lt` … | `-lt` … | `<` `>` `==` (số học thật) |
| Biến rỗng | `[ $x = a ]` **lỗi cú pháp** nếu `x` rỗng | an toàn | `$x` rỗng coi như 0 |

Cạm bẫy `[ ]`: `[ $var = foo ]` khi `var="a b"` bung thành `[ a b = foo ]` → lỗi. Trong `[[ ]]` không cần bọc nháy vẫn an toàn. Dùng `(( ))` cho số học: `(( count > 10 ))`.

## Parameter expansion

Giả sử `v` là biến; `p` là pattern glob.

| Cú pháp | Kết quả |
|---|---|
| `${v:-x}` | trả `v`, nếu unset/rỗng thì trả `x` (không gán) |
| `${v:=x}` | trả `v`, nếu unset/rỗng thì **gán** `v=x` rồi trả |
| `${v:+x}` | trả `x` nếu `v` có giá trị, ngược lại rỗng |
| `${v:?msg}` | trả `v`, nếu unset/rỗng thì in `msg` ra stderr và thoát |
| `${v:off:len}` | substring từ vị trí `off`, dài `len` ký tự |
| `${#v}` | độ dài của `v` |
| `${v#p}` | xóa `p` khớp **ngắn nhất** ở **đầu** |
| `${v##p}` | xóa `p` khớp **dài nhất** ở **đầu** (lấy basename) |
| `${v%p}` | xóa `p` khớp **ngắn nhất** ở **cuối** |
| `${v%%p}` | xóa `p` khớp **dài nhất** ở **cuối** |
| `${v/p/s}` | thay lần khớp `p` **đầu tiên** bằng `s` |
| `${v//p/s}` | thay **mọi** lần khớp `p` bằng `s` |
| `${v^^}` | chuyển toàn bộ sang HOA |
| `${v,,}` | chuyển toàn bộ sang thường |

Mẹo nhớ: `#` ở đầu (như đầu dòng comment `#`), `%` ở cuối (như `%` sau số); nhân đôi ký tự = khớp tham lam nhất.

## Biến đặc biệt

| Biến | Ý nghĩa |
|---|---|
| `$0` | tên script (hoặc shell) |
| `$1` | tham số vị trí thứ 1 (`$2`, `$3`, …) |
| `$#` | số lượng tham số vị trí |
| `$@` | tất cả tham số, dạng danh sách |
| `$*` | tất cả tham số, dạng một chuỗi (nối bằng ký tự đầu của `IFS`) |
| `$?` | exit code của lệnh vừa chạy |
| `$$` | PID của shell hiện tại |
| `$!` | PID của lệnh chạy nền (background) gần nhất |
| `$_` | tham số cuối của lệnh trước |
| `"$@"` | mỗi tham số là **một** từ riêng, giữ nguyên khoảng trắng — **luôn dùng cái này** |
| `$@` (không nháy) | bị word-split và glob — hỏng khi tham số có khoảng trắng |

Quy tắc vàng: lặp qua đối số thì `for a in "$@"`, không bao giờ `for a in $@`.

## Related Topics

- [Điều kiện và vòng lặp](../skills/conditionals-va-loops.md)
- [Biến, mảng và parameter expansion](../skills/variables-arrays-expansion.md)
- [Exit code và control flow](../reference/exit-code-va-control-flow.md)
- [Cheatsheet lệnh bash](commands.md)
