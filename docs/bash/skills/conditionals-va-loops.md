---
title: Điều kiện và vòng lặp
sidebar_position: 4
description: "Trong bash dùng [[ ]] thay cho [ ], số so bằng -eq còn chuỗi so bằng dấu bằng, và đọc file theo dòng phải dùng while read chứ đừng for line in cat."
tags: [conditionals, loops, test, if, for, while, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Điều kiện và vòng lặp

> **Chốt:** Trong bash mặc định dùng `[[ ]]` chứ đừng `[ ]` — nó không word-split biến bên trong nên không gãy khi biến rỗng. Số so bằng `-eq`/`-lt`, chuỗi so bằng `=`/`!=`; nhầm hai bộ này là lỗi kinh điển. Và đọc file theo dòng thì `while IFS= read -r line`, tuyệt đối đừng `for line in $(cat file)`.

## Mục tiêu

Viết được `if`/`case` và các loại vòng lặp trong bash mà không dính ba cái bẫy hay gặp nhất: `[ ]` gãy khi biến rỗng, nhầm toán tử so sánh số với chuỗi, và word-split khi lặp qua các dòng của file.

## Tổng quan

`if` trong bash **không** kiểm tra "true/false" như ngôn ngữ khác — nó chạy một lệnh và nhìn **exit code**: `0` là thành công (chạy nhánh `then`), khác `0` là thất bại. `grep -q ...`, `[[ ... ]]`, `(( ... ))` đều chỉ là các lệnh trả exit code.

```bash
if lệnh; then ...; elif lệnh; then ...; else ...; fi
```

Ba "lệnh điều kiện" hay dùng:

| Cú pháp | Là gì | Khi nào dùng |
|---|---|---|
| `[ ... ]` | `test`, builtin POSIX | Cần chạy được trên `sh` thuần. Trong bash thì tránh. |
| `[[ ... ]]` | keyword của bash | **Mặc định trong bash** — an toàn hơn, mạnh hơn. |
| `(( ... ))` | số học của bash | Mọi so sánh và tính toán trên **số**. |

Vì sao `[[ ]]` an toàn hơn `[ ]`: bên trong `[[ ]]` bash **không** word-split và **không** glob-expand các biến, nên `[[ $x = y ]]` vẫn chạy đúng khi `$x` rỗng hoặc chứa dấu cách. `[[ ]]` còn hỗ trợ `&&`, `||`, và `=~` (regex). Đổi lại nó là bashism — không portable sang `sh`.

Toán tử `test` chia làm ba nhóm, và **không được trộn**:

- File: `-f` (file thường), `-d` (thư mục), `-e` (tồn tại), `-r`/`-w`/`-x` (đọc/ghi/chạy được).
- Chuỗi: `-z` (rỗng), `-n` (không rỗng), `=` / `!=` (bằng/khác), `=~` (khớp regex, chỉ `[[ ]]`).
- Số: `-eq -ne -lt -le -gt -ge`.

Nhấn mạnh cái bẫy trung tâm: **số dùng `-eq`/`-lt`, chuỗi dùng `=`/`!=`**. Viết `[[ $a > $b ]]` không so sánh số mà so sánh **chuỗi** theo thứ tự từ điển. Muốn so sánh số, dùng `(( a > b ))`.

## Ví dụ

> Chạy thật 2026-08-05 · Ubuntu, bash 5.3.9(1).

### `if` chạy trên exit code

```bash
if grep -q alpha words.txt; then echo "co alpha"; else echo "khong"; fi
```

```
co alpha
```

### `[ ]` gãy khi biến rỗng — `[[ ]]` thì không

```bash
x=""
bash -c 'x=""; if [ $x = y ]; then echo yes; else echo no; fi'   # [ ]
if [[ $x = y ]]; then echo yes; else echo "no (an toan)"; fi     # [[ ]]
```

```
bash: line 1: [: =: unary operator expected
no
no (an toan)
```

Với `[ ]`, sau khi word-split thì `[ $x = y ]` trở thành `[ = y ]` — `test` thấy hai toán hạng, báo lỗi cú pháp. Với `[[ ]]` biến rỗng vẫn được giữ nguyên là một chuỗi rỗng, so sánh chạy đúng.

### Số vs chuỗi — cái bẫy kinh điển

```bash
a=10; b=9
if [[ $a -gt $b ]]; then echo "$a -gt $b (so: 10>9)"; fi
if [[ $a > $b ]]; then echo "..."; else echo "[[ $a > $b ]] chuoi: false"; fi
if (( a > b )); then echo "(( a > b )) so hoc: dung"; fi
```

```
10 -gt 9 (so: 10>9)
[[ 10 > 9 ]] chuoi: false
(( a > b )) so hoc: dung
```

`[[ 10 > 9 ]]` cho **false** vì so sánh chuỗi: ký tự `"1"` đứng trước `"9"`. Đây là loại lỗi im lặng — không báo lỗi, chỉ cho kết quả sai. Với số: `-gt` hoặc `(( ))`.

### Regex với `=~`

```bash
email="ngoc@example.com"
if [[ $email =~ ^[^@]+@[^@]+$ ]]; then echo "khop email"; fi
```

```
khop email
```

### Các kiểu vòng lặp

```bash
for i in {1..3}; do printf '%s ' "$i"; done; echo   # brace range
for i in $(seq 1 3); do printf '%s ' "$i"; done; echo
for ((i=0; i<3; i++)); do printf '%s ' "$i"; done; echo  # C-style
n=3; until (( n == 0 )); do printf '%s ' "$n"; ((n--)); done; echo
```

```
1 2 3 
1 2 3 
0 1 2 
3 2 1 
```

`break`/`continue`:

```bash
for i in 1 2 3 4 5; do
  (( i == 2 )) && continue
  (( i == 4 )) && break
  printf '%s ' "$i"
done; echo
```

```
1 3 
```

### Đọc file theo dòng: cách SAI vs cách ĐÚNG

File `words.txt` có dòng chứa dấu cách:

```
alpha one
beta two three
gamma
```

```bash
# SAI
for line in $(cat words.txt); do echo "[$line]"; done
# DUNG
while IFS= read -r line; do echo "[$line]"; done < words.txt
```

```
=== SAI: for line in $(cat words.txt) ===
[alpha]
[one]
[beta]
[two]
[three]
[gamma]

=== DUNG: while IFS= read -r line ===
[alpha one]
[beta two three]
[gamma]
```

`for line in $(cat file)` **không** lặp theo dòng — nó lấy output của `cat`, word-split theo **mọi** khoảng trắng (space, tab, newline), nên `"beta two three"` bị xé thành ba. `while IFS= read -r line` đọc đúng từng dòng: `IFS=` tắt cắt khoảng trắng đầu/cuối, `-r` không cho backslash thành escape. Đây là cách đúng duy nhất để duyệt dòng.

### Ví dụ xuyên suốt: duyệt danh sách file, kiểm tra tồn tại, phân loại bằng `case`

File `files.txt` (một dòng có dấu cách trong tên):

```
config.yaml
data report.csv
notes.txt
```

```bash
while IFS= read -r f; do
  if [[ -f $f ]]; then
    case "$f" in
      *.yaml|*.yml) kind="config" ;;
      *.csv)        kind="du lieu" ;;
      *.txt)        kind="ghi chu" ;;
      *)            kind="khac" ;;
    esac
    echo "CO   $f -> $kind"
  else
    echo "THIEU $f"
  fi
done < files.txt
```

```
CO   config.yaml -> config
CO   data report.csv -> du lieu
CO   notes.txt -> ghi chu
```

Ghép cả ba: `while read` đọc đúng dòng `data report.csv` (không bị xé), `[[ -f ]]` kiểm tra tồn tại, `case` phân loại theo pattern gọn hơn hẳn `if` lồng nhiều tầng.

## Trade-offs

| Chọn | Được | Mất |
|---|---|---|
| `[[ ]]` (bash) | Không word-split biến, có `=~`/`&&`/`||`, an toàn với biến rỗng | Bashism — không chạy trên `sh` thuần |
| `[ ]` (POSIX) | Portable sang mọi shell POSIX | Gãy khi biến rỗng/nhiều từ nếu không quote cẩn thận |
| `(( ))` cho số | Cú pháp toán học tự nhiên, so sánh số đúng | Chỉ dùng cho số nguyên; không có số thực |
| `case` | Nhiều nhánh theo pattern rõ ràng | Chỉ khớp glob pattern, không regex |
| `while read` | Đọc dòng đúng, kể cả dòng có dấu cách | Dài dòng hơn `for`; subshell nếu đặt sau pipe |

## Common Mistakes

- **Dùng `>` `<` để so sánh số trong `[[ ]]`.** `[[ 10 > 9 ]]` là so sánh chuỗi và cho false. Số: `-gt` hoặc `(( ))`.
- **`[ $x = y ]` không quote.** Gãy khi `$x` rỗng hoặc nhiều từ. Dùng `[[ ]]`, hoặc nếu buộc `[ ]` thì quote: `[ "$x" = y ]`.
- **`for line in $(cat file)`.** Word-split theo mọi khoảng trắng, không theo dòng. Luôn `while IFS= read -r line; do ...; done < file`.
- **Quên `-r` trong `read`.** Không có `-r` thì backslash bị nuốt làm escape, tên file/đường dẫn có `\` hỏng.
- **Nhầm số dùng `=`.** `[[ $n = 0 ]]` so sánh chuỗi: `"00"` khác `"0"`. Số: `[[ $n -eq 0 ]]` hoặc `(( n == 0 ))`.

## FAQ

<details>
<summary>`[ ]` với `[[ ]]` khác nhau ở đâu, khi nào tôi phải dùng `[ ]`?</summary>

`[[ ]]` là keyword của bash: không word-split, không glob-expand biến bên trong, hỗ trợ `=~`, `&&`, `||`. `[ ]` là lệnh `test` POSIX, các toán hạng bị word-split như đối số bình thường nên phải quote cẩn thận. Chỉ dùng `[ ]` khi script phải chạy trên `sh` thuần (dash, busybox). Trong bash: luôn `[[ ]]`.

</details>

<details>
<summary>Vì sao `for line in $(cat file)` lại sai còn `while read` thì đúng?</summary>

`$(cat file)` cho ra một chuỗi, rồi `for ... in` word-split chuỗi đó theo `IFS` — mặc định gồm space, tab, newline. Nên mỗi **từ** thành một phần tử, không phải mỗi dòng. `while IFS= read -r line` gọi `read` một lần cho mỗi dòng: `IFS=` giữ nguyên khoảng trắng, `-r` giữ nguyên backslash. Đây là ranh giới đúng theo dòng.

</details>

<details>
<summary>So sánh số nên dùng `[[ -gt ]]` hay `(( > ))`?</summary>

Cả hai đúng cho số nguyên. `(( a > b ))` đọc tự nhiên hơn và cho phép cả biểu thức (`(( a + 1 > b ))`), nên ưu tiên nó cho tính toán và so sánh số. `[[ $a -gt $b ]]` tiện khi đang viết trong một chuỗi điều kiện `[[ ]]` có lẫn test chuỗi/file. Tuyệt đối đừng dùng `>` trong `[[ ]]` cho số — đó là so sánh chuỗi.

</details>

## Related Topics

- [Exit code và control flow](../reference/exit-code-va-control-flow.md)
- [Quoting và expansion](../reference/quoting-va-expansion.md)
- [Biến, mảng và parameter expansion](variables-arrays-expansion.md)
- [Cheatsheet toán tử test và expansion](../cheatsheets/test-operators-va-expansion.md)
- [Glob không khớp](../case-studies/glob-khong-khop.md)

## References

- `man bash` — mục *CONDITIONAL EXPRESSIONS*, *Compound Commands* (`[[`, `((`, `case`, `for`, `while`, `until`).
- `help test`, `help read`, `help case` — trợ giúp builtin ngay trong bash.
- Bash Reference Manual §3.2.5 (Conditional Constructs), §3.5.7 (Word Splitting).
