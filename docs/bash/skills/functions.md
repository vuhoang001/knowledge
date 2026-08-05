---
title: Hàm trong bash
sidebar_position: 5
description: "Hàm trả kết quả qua echo và bắt bằng dollar-ngoặc, còn return chỉ trả exit code từ 0 tới 255 — và luôn khai local kẻo giẫm biến ngoài."
tags: [functions, arguments, local, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Hàm trong bash

> **Chốt:** `return` trong bash **không** trả dữ liệu — nó chỉ trả một exit code từ 0 tới 255. Muốn trả về chuỗi hay số, `echo` ra rồi bắt bằng `result=$(myfunc)`. Và mặc định biến trong hàm là **global**: quên `local` là âm thầm giẫm lên biến ngoài.

## Mục tiêu

- Định nghĩa và gọi hàm đúng cú pháp (không ngoặc khi gọi).
- Hiểu tham số chạy qua `$1 $2 ... $@ $#`, không khai ở dấu ngoặc.
- Phân biệt dứt khoát hai đường trả kết quả: `return` (exit code) vs `echo` (dữ liệu).
- Dùng `local` để hàm không rò biến ra ngoài.
- Biết hàm che được external command, và `command` gọi lại lệnh thật.

## Tổng quan

Hai kiểu định nghĩa:

```bash
name() { ...; }        # kiểu ưa dùng — POSIX, ngắn
function name { ...; }  # kiểu ksh, dài hơn, không thêm gì
```

Dùng `name() { ...; }`. Gọi hàm bằng **tên trần**, không ngoặc:

```bash
name        # đúng
name()      # SAI — cái này là định nghĩa lại hàm rỗng
```

Không khai tham số ở dấu ngoặc — dấu ngoặc luôn rỗng. Tham số vào hàm y hệt tham số vào script: đọc qua các biến vị trí.

| Biến | Nghĩa |
|---|---|
| `$1 $2 ...` | tham số thứ 1, 2, ... |
| `$#` | số tham số |
| `$@` | tất cả tham số; `"$@"` giữ nguyên ranh giới từng tham số |
| `$0` | tên script (không phải tên hàm) |
| `shift` | bỏ `$1`, dồn các tham số còn lại lên |

Hai đường trả kết quả — **đây là chỗ hay nhầm nhất:**

- `return n` → đặt **exit code** của hàm (0–255). Dùng để báo thành công/thất bại, đọc qua `$?` hoặc trực tiếp trong `if`. **Không** truyền dữ liệu.
- `echo ...` → in ra stdout; caller bắt bằng `$(...)`. Đây mới là cách "trả về" chuỗi/số.

## Ví dụ

> Chạy thật 2026-08-05 · Ubuntu, bash 5.3.9(1).

### Ví dụ xuyên suốt: to_upper trả chuỗi qua echo

```bash
to_upper() {
  echo "${1^^}"
}
result=$(to_upper "hello world")
echo "bat duoc: $result"
```

Output thật:

```
bat duoc: HELLO WORLD
```

Chuỗi đi ra qua `echo`, `$(...)` bắt lại. Đây là cách duy nhất trả dữ liệu.

### is_valid trả exit code, dùng trong if

```bash
is_valid() {
  [[ "$1" =~ ^[0-9]+$ ]]
}
if is_valid "42"; then echo "42 la so"; fi
if is_valid "4a2"; then echo "4a2 la so"; else echo "4a2 KHONG phai so"; fi
```

Output thật:

```
42 la so
4a2 KHONG phai so
```

Hàm không có `return` tường minh — exit code của nó là exit code của lệnh cuối (`[[ ... ]]`). `if` đọc chính exit code đó.

### return chỉ trả exit code 0–255 — và bị wrap

```bash
get_num() {
  return 300
}
get_num
echo "return 300 -> \$? = $?"    # 300 % 256 = 44

add() {
  echo $(( $1 + $2 ))
}
sum=$(add 40 60)
echo "add 40 60 = $sum"
```

Output thật:

```
return 300 -> $? = 44
add 40 60 = 100
```

`return 300` bị wrap modulo 256 thành 44 — bằng chứng `return` **không** dùng để mang số về. Muốn con số 100 thật thì phải `echo` rồi bắt bằng `$(...)`.

### local cứu biến ngoài

```bash
name="ngoai"

clobber() {
  name="bi giam"
}
clobber
echo "sau clobber: name = $name"

name="ngoai"
safe() {
  local name="trong ham"
  echo "trong safe: name = $name"
}
safe
echo "sau safe:   name = $name"
```

Output thật:

```
sau clobber: name = bi giam
trong safe: name = trong ham
sau safe:   name = ngoai
```

`clobber` không khai `local` nên gán vào **đúng biến toàn cục** `name` — giẫm mất. `safe` có `local` nên biến trong hàm tách riêng, biến ngoài còn nguyên.

### $@, $#, shift

```bash
show() {
  echo "so tham so \$# = $#"
  echo "tat ca \$@   = $@"
  echo "tham so 1    = $1"
  shift
  echo "sau shift, \$1 = $1"
}
show one "hai ba" four
```

Output thật:

```
so tham so $# = 3
tat ca $@   = one hai ba four
tham so 1    = one
sau shift, $1 = hai ba
```

`"hai ba"` là **một** tham số (`$#` = 3), và sau `shift` nó trở thành `$1`.

### "$@" giữ ranh giới, $@ không

```bash
count_args() { echo "nhan $# tham so"; }
set -- "a b" c
echo -n 'voi $@:  '; count_args $@
echo -n 'voi "$@": '; count_args "$@"
```

Output thật:

```
voi $@:  nhan 3 tham so
voi "$@": nhan 2 tham so
```

`$@` không nháy tách `"a b"` thành hai từ (3 tham số). `"$@"` giữ đúng ranh giới (2 tham số). **Luôn dùng `"$@"`** khi chuyển tiếp tham số.

### Hàm che external command, command gọi lệnh thật

```bash
ls() { echo "ham ls gia da chay"; }
ls
command ls /tmp/bashlab-func >/dev/null && echo "command ls: goi binary that OK"
```

Output thật:

```
ham ls gia da chay
command ls: goi binary that OK
```

Định nghĩa hàm tên `ls` che luôn lệnh `ls` thật. `command ls` bỏ qua hàm, gọi binary trong `PATH`.

## Trade-offs

| Cách | Được | Mất |
|---|---|---|
| `return n` | Nhanh, hợp với `if`/`&&`; đúng ngữ nghĩa "thành/bại" | Chỉ 0–255, wrap modulo 256; không mang dữ liệu |
| `echo` + `$(...)` | Trả chuỗi/số bất kỳ | `$(...)` chạy subshell, `echo` lẫn vào stdout — hàm không được in gì thừa ra stdout |
| Không `local` | Ngắn; cố ý để export biến ra ngoài | Rò và giẫm biến toàn cục — bug âm thầm |
| `local` mọi biến | An toàn, hàm thành hộp kín | Dài hơn vài ký tự; đôi khi bạn *muốn* sửa biến ngoài |
| `name() {}` | Chuẩn POSIX, portable | — |
| `function name {}` | Quen mắt dân ksh | Không portable sang `sh`, không lợi gì |

## Common Mistakes

- **`return "chuoi"` để trả dữ liệu.** `return` chỉ nhận số 0–255. `return 300` thành 44. Trả dữ liệu thì `echo` + `$(...)`.
- **Quên `local`.** Biến trong hàm mặc định global; gán trong hàm giẫm biến trùng tên ở ngoài. Khai `local` mọi biến nội bộ.
- **Gọi hàm có ngoặc: `myfunc()`.** Cú pháp đó là *định nghĩa lại* hàm thành rỗng. Gọi bằng tên trần.
- **Khai tham số trong ngoặc: `myfunc(a, b)`.** Bash bỏ qua, dấu ngoặc luôn rỗng. Đọc qua `$1 $2`.
- **Dùng `$@` không nháy khi chuyển tiếp.** Tham số chứa khoảng trắng bị tách. Luôn `"$@"`.
- **`echo` thừa trong hàm rồi bắt bằng `$(...)`.** Mọi dòng in ra stdout đều lọt vào biến. Debug thì in ra stderr: `echo "log" >&2`.
- **Định nghĩa hàm sau khi gọi.** Bash đọc tuần tự — hàm phải được định nghĩa trước dòng gọi.

## FAQ

<details>
<summary>Làm sao trả nhiều giá trị từ một hàm?</summary>

`echo` chúng ra cách nhau bởi khoảng trắng rồi `read` lại, hoặc echo một dòng rồi tách. Ví dụ: `read -r a b < <(myfunc)`. Hoặc dùng biến global đã `declare` sẵn, hoặc nameref (`local -n out=$1`) để hàm ghi thẳng vào biến do caller chỉ định.

</details>

<details>
<summary>Hàm có "return" ngầm không nếu tôi không viết return?</summary>

Có. Exit code của hàm là exit code của **lệnh cuối cùng** chạy trong nó. Vì thế `is_valid` ở trên hoạt động dù không có `return` — exit code của `[[ ... ]]` chính là kết quả.

</details>

<details>
<summary>local có tác dụng với hàm được gọi bên trong không?</summary>

Có, và đây là điểm dễ sập: bash dùng dynamic scope. Biến `local` trong hàm cha **vẫn nhìn thấy được** ở hàm con mà nó gọi. Nó "local" theo ngăn xếp lời gọi, không phải theo phạm vi từ vựng như nhiều ngôn ngữ khác.

</details>

<details>
<summary>Muốn gọi lệnh thật khi tên bị hàm che thì làm sao?</summary>

`command ls` bỏ qua hàm và alias, gọi external command hoặc builtin. Còn `builtin cd` ép gọi builtin. Đường tuyệt đối như `/bin/ls` cũng bỏ qua hàm.

</details>

## Related Topics

- [Exit code và control flow](../reference/exit-code-va-control-flow.md)
- [Biến, mảng và parameter expansion](variables-arrays-expansion.md)
- [Viết script an toàn](viet-script-an-toan.md)
- [Streams và redirection](../reference/streams-va-redirection.md)

## References

- Bash Reference Manual — Shell Functions: https://www.gnu.org/software/bash/manual/bash.html#Shell-Functions
- Bash Reference Manual — `local`, `return`, `command`, `shift` builtins: https://www.gnu.org/software/bash/manual/bash.html#Bash-Builtins
- BashFAQ/084 — trả dữ liệu từ hàm: https://mywiki.wooledge.org/BashFAQ/084
