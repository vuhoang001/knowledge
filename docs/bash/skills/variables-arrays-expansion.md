---
title: Biến, mảng và parameter expansion
sidebar_position: 3
description: "Dấu bằng không được có dấu cách, luôn bọc biến trong nháy kép, và parameter expansion làm được default hoặc substring hoặc thay chuỗi mà không cần gọi sed."
tags: [variables, array, parameter-expansion, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Biến, mảng và parameter expansion

> **Chốt:** Gán biến thì `x=1` — **không** dấu cách quanh `=`, vì `x = 1` bị hiểu là chạy lệnh `x`. Đọc biến thì luôn `"$x"` trong nháy kép. Và trước khi với tay tới `sed`/`cut`/`basename`, hỏi xem parameter expansion (`${v##*/}`, `${v%.*}`, `${v:-default}`) đã làm được chưa — thường là được, và nhanh hơn vì không fork process.

## Mục tiêu

- Gán và đọc biến đúng cách, hiểu vì sao `x = 1` báo lỗi.
- Phân biệt shell variable với environment variable — cái gì con process thừa hưởng, cái gì không.
- Dùng indexed array và associative array: đếm phần tử, duyệt, và bẫy `[@]` vs `[*]`.
- Dùng parameter expansion cho default value, substring, và cắt/thay chuỗi mà không gọi lệnh ngoài.

## Tổng quan

Biến trong bash mặc định là **string** và có phạm vi cả shell. Ba khái niệm hay bị lẫn:

| Loại | Khai báo | Ai thấy được |
|---|---|---|
| Shell variable | `x=1` | chỉ shell hiện tại |
| Environment variable | `export x=1` | shell hiện tại **và** mọi con process |
| Local variable | `local x=1` (trong hàm) | chỉ trong hàm đó |

Parameter expansion là cú pháp `${...}` — một ngôn ngữ nhỏ nằm ngay trong shell để lấy default, cắt substring, xoá tiền tố/hậu tố, thay chuỗi, đổi hoa thường. Nó **không fork process** như `sed`/`cut`, nên vừa nhanh vừa không phụ thuộc lệnh ngoài.

Cạm bẫy lớn nhất xuyên suốt: bash rất nhạy với **dấu cách** và **nháy kép**. Một dấu cách sai chỗ quanh `=` là lỗi; thiếu nháy kép quanh `"$x"` là bug âm thầm khi giá trị có khoảng trắng.

## Ví dụ

> Nhãn: **Chạy thật 2026-08-05 · Ubuntu, bash 5.3.9(1)-release.** Mọi output dưới đây là dán nguyên từ terminal.

### 1. Gán biến — cạm bẫy dấu cách

```bash
x=1
echo "  x=$x  ${x}=${x}"
x = 1            # co dau cach quanh =
```

```text
=== gan bien ===
  x=1  ${x}=1
  --- x = 1 (co dau cach):
bash: line 7: x: command not found
  (exit 127)
```

`x = 1` bị bash tách thành lệnh `x` với argument `=` và `1` → không có lệnh tên `x` → `command not found`. Gán **luôn dính liền**: `x=1`.

### 2. Shell variable vs environment variable vs local

```bash
myvar="chi shell nay"
export myexp="da export"
bash -c 'echo "  con thay: myexp=[$myexp] myvar=[$myvar]"'

f() { local loc="trong ham"; g="global tu ham"; echo "  $loc"; }
f
echo "  ngoai ham: loc=[${loc-KHONG THAY}] g=[$g]"
```

```text
=== shell var vs environment var ===
  con thay: myexp=[da export] myvar=[]
  trong ham
  ngoai ham: loc=[KHONG THAY] g=[global tu ham]
```

Con process (`bash -c ...`) chỉ thấy `myexp` vì nó được `export`; `myvar` rỗng ở đó. Trong hàm, `loc` khai bằng `local` nên biến mất khi hàm trả về, còn `g` (không `local`) rò ra global.

### 3. Mảng — indexed và associative

```bash
arr=(alpha beta gamma)
echo "  arr[0]=${arr[0]}"
echo "  moi phan tu: ${arr[@]}"
echo "  so phan tu: ${#arr[@]}"
saved=$IFS; IFS=,
echo "  \"\${arr[*]}\" (gop bang IFS=,): ${arr[*]}"
IFS=$saved
printf "  phan tu qua @: [%s]\n" "${arr[@]}"

declare -A cap
cap[vn]=hanoi
cap[jp]=tokyo
echo "  cap[jp]=${cap[jp]}"
echo "  keys=${!cap[@]}"
```

```text
=== mang (bash that) ===
  arr[0]=alpha
  moi phan tu: alpha beta gamma
  so phan tu: 3
  "${arr[*]}" (gop bang IFS=,): alpha,beta,gamma
  phan tu qua @: [alpha]
  phan tu qua @: [beta]
  phan tu qua @: [gamma]
--- associative array ---
  cap[jp]=tokyo
  keys=vn jp
```

Chỉ số **từ 0**. `${arr[@]}` là mọi phần tử, `${#arr[@]}` là số phần tử. `"${arr[@]}"` giữ từng phần tử tách rời (đúng khi phần tử có khoảng trắng); `"${arr[*]}"` gộp tất cả thành **một** chuỗi nối bằng ký tự đầu của `IFS` — thấy rõ ở dòng nối bằng dấu phẩy. Associative array cần `declare -A`, và `${!cap[@]}` lấy danh sách key.

### 4. Parameter expansion — default value và substring

```bash
unset v
echo "  \${v:-x}     = ${v:-mac_dinh}   (v van rong: [${v-CHUA GAN}])"
echo "  \${v:=x}     = ${v:=da_gan}     (v gio la: [$v])"
w=co_gia_tri
echo "  \${w:+y}     = ${w:+CO_thi_dung_y}"
( unset e; echo "${e:?bien e bat buoc}" )
s="abcdefgh"
echo "  \${s:2:3}    = ${s:2:3}"
```

```text
=== parameter expansion default ===
  ${v:-x}     = mac_dinh   (v van rong: [CHUA GAN])
  ${v:=x}     = da_gan     (v gio la: [da_gan])
  ${w:+y}     = CO_thi_dung_y
  ${empty:?}  se bao loi:
(eval):9: e: bien e bat buoc
    (exit 1)
  ${s:2:3}    = cde   (substring offset 2 len 3)
```

- `${v:-x}` — dùng `x` nếu `v` rỗng/chưa đặt, **không gán** (v vẫn rỗng sau đó).
- `${v:=x}` — như trên nhưng **gán luôn** `v=x`.
- `${v:+x}` — dùng `x` nếu `v` **có** giá trị (ngược lại `:-`).
- `${v:?msg}` — in `msg` ra stderr và thoát non-zero nếu `v` rỗng; dùng để bắt biến bắt buộc.
- `${v:offset:len}` — substring, offset đếm từ 0.

### 5. String manipulation — cắt và thay

```bash
p="a.b.c.txt"
echo "  \${p#*.}   xoa dau ngan  = ${p#*.}"
echo "  \${p##*.}  xoa dau dai   = ${p##*.}"
echo "  \${p%.*}   xoa cuoi ngan = ${p%.*}"
echo "  \${p%%.*}  xoa cuoi dai  = ${p%%.*}"
echo "  \${p/./-}  thay 1        = ${p/./-}"
echo "  \${p//./-} thay tat ca   = ${p//./-}"
echo "  \${#p}     do dai        = ${#p}"
u="Hello World"
echo "  \${u^^}    HOA           = ${u^^}"
echo "  \${u,,}    thuong        = ${u,,}"
```

```text
=== string manipulation (bash that) ===
  ${p#*.}   xoa dau ngan  = b.c.txt
  ${p##*.}  xoa dau dai   = txt
  ${p%.*}   xoa cuoi ngan = a.b.c
  ${p%%.*}  xoa cuoi dai  = a
  ${p/./-}  thay 1        = a-b.c.txt
  ${p//./-} thay tat ca   = a-b-c-txt
  ${#p}     do dai        = 9
  ${u^^}    HOA           = HELLO WORLD
  ${u,,}    thuong        = hello world
```

Nhớ theo hình dạng ký tự: `#` nằm bên trái bàn phím → xoá từ **đầu**; `%` → xoá từ **cuối**. Nhân đôi (`##`, `%%`) = khớp **dài nhất** (greedy), một cái = ngắn nhất. `^^`/`,,` đổi hoa/thường (chỉ bash ≥ 4).

### 6. Ví dụ xuyên suốt — tách một đường dẫn file bằng expansion

```bash
f="/var/log/nginx/access.log.gz"
echo "  full     = $f"
echo "  dirname  \${f%/*}   = ${f%/*}"
echo "  basename \${f##*/}  = ${f##*/}"
base="${f##*/}"
echo "  ten khong duoi \${base%.*}  = ${base%.*}"
echo "  duoi cuoi \${f##*.}         = ${f##*.}"
echo "  default: \${LOGDIR:-/tmp/logs} = ${LOGDIR:-/tmp/logs}"
files=("$f" /etc/hosts /tmp/x.csv)
echo "  demo mang: co ${#files[@]} file"
```

```text
=== VI DU XUYEN SUOT: tach 1 duong dan file ===
  full     = /var/log/nginx/access.log.gz
  dirname  ${f%/*}   = /var/log/nginx
  basename ${f##*/}  = access.log.gz
  ten khong duoi ${base%.*}  = access.log
  duoi cuoi ${f##*.}         = gz
  default cho bien rong: ${LOGDIR:-/tmp/logs} = /tmp/logs
  demo mang: co 3 file
```

Cả `dirname`, `basename`, tách phần mở rộng, và default value — không gọi lệnh ngoài nào. `${f##*.}` lấy phần mở rộng (đuôi), `${f%.*}` bỏ đuôi, `${f##*/}` là basename, `${f%/*}` là dirname.

## Trade-offs

| Chọn | Khi nào | Đánh đổi |
|---|---|---|
| Parameter expansion (`${f##*/}`) | tách/thay chuỗi đơn giản, chạy trong vòng lặp | nhanh, không fork; nhưng cú pháp khó đọc, chỉ glob (không regex) |
| `basename`/`dirname`/`sed`/`cut` | cần regex, hoặc muốn code dễ đọc | rõ ràng hơn nhưng fork một process mỗi lần gọi — chậm khi lặp nghìn lần |
| `"${arr[@]}"` | duyệt phần tử, giữ khoảng trắng | đúng đắn — gần như luôn là cái bạn muốn |
| `"${arr[*]}"` | cần một chuỗi nối lại | chỉ dùng khi cố tình join; dễ mất ranh giới phần tử |
| `${v:-x}` (không gán) | default tạm cho một lần đọc | không thay đổi state |
| `${v:=x}` (gán luôn) | muốn set default bền cho các lần sau | có side effect — dễ quên là nó đã đổi biến |

## Common Mistakes

- **Dấu cách quanh `=`.** `x = 1` báo `command not found`; `x =1` và `x= 1` cũng sai theo cách khác. Gán phải dính liền: `x=1`.
- **Quên nháy kép.** `cp $src $dst` vỡ ngay khi đường dẫn có khoảng trắng — nó tách thành nhiều argument. Luôn `cp "$src" "$dst"`.
- **`${arr[*]}` thay vì `${arr[@]}` khi duyệt.** `for x in "${arr[*]}"` chỉ chạy **một** vòng với cả mảng gộp làm một chuỗi. Duyệt phải `"${arr[@]}"`.
- **Tưởng `${v:=x}` không đổi gì.** Nó **gán** `v=x` luôn — khác hẳn `${v:-x}`. Đọc nhầm hai cái này là bug âm thầm.
- **Nhầm `#` với `%`.** `${f#*/}` xoá từ đầu, `${f%/*}` xoá từ cuối. Đảo là ra kết quả sai mà không báo lỗi.
- **Chạy trong `sh` thay vì `bash`.** `${u^^}`, `declare -A`, mảng... là bashism. Trên `dash`/`sh` (hoặc dòng shebang `#!/bin/sh`) chúng im lặng sai hoặc báo `bad substitution`.

## FAQ

<details>
<summary>Khi nào dùng <code>$&#123;x&#125;</code> thay vì <code>$x</code>?</summary>

Khi cần ranh giới rõ để bash không hiểu nhầm tên biến kéo dài sang ký tự sau: `"${x}_backup"` — nếu viết `"$x_backup"` bash tìm biến tên `x_backup`. Với parameter expansion (`${x:-y}`, `${x##*/}`) thì bắt buộc phải có ngoặc nhọn.

</details>

<details>
<summary>Mảng bash 1-based hay 0-based? Tôi thấy nơi ghi khác nhau.</summary>

Bash indexed array **0-based**: `${arr[0]}` là phần tử đầu. Zsh mới 1-based — đó là lý do cùng một script cho kết quả khác nhau khi chạy nhầm shell. Kiểm bằng `echo "${arr[0]}"`: nếu ra rỗng mà mảng có phần tử thì bạn đang ở zsh.

</details>

<details>
<summary>Làm sao lấy phần mở rộng file mà không gọi lệnh ngoài?</summary>

`${f##*.}` cho phần mở rộng (xoá tham lam đến dấu chấm cuối), `${f%.*}` cho tên bỏ đuôi. Cạm bẫy: file không có dấu chấm thì `${f##*.}` trả về **cả tên** (vì không có gì để khớp) — kiểm `[[ "$f" == *.* ]]` trước nếu cần chắc chắn.

</details>

<details>
<summary><code>$&#123;v:-x&#125;</code> và <code>$&#123;v-x&#125;</code> khác gì nhau?</summary>

Có dấu `:` thì áp dụng cả khi `v` **rỗng** lẫn **chưa đặt**. Không có `:` (`${v-x}`) chỉ áp dụng khi `v` **chưa đặt** — nếu `v=""` (đã đặt nhưng rỗng) thì nó trả về chuỗi rỗng, không dùng default. Đa số trường hợp bạn muốn bản có `:`.

</details>

## Related Topics

- [Quoting và expansion](../reference/quoting-va-expansion.md)
- [Hàm trong bash](functions.md)
- [Điều kiện và vòng lặp](conditionals-va-loops.md)
- [Cheatsheet toán tử test và expansion](../cheatsheets/test-operators-va-expansion.md)

## References

- Bash Reference Manual — Shell Parameters & Shell Parameter Expansion: https://www.gnu.org/software/bash/manual/bash.html#Shell-Parameter-Expansion
- Bash Reference Manual — Arrays: https://www.gnu.org/software/bash/manual/bash.html#Arrays
- `man bash` mục *Parameter Expansion* (bản trên máy: bash 5.3.9)
