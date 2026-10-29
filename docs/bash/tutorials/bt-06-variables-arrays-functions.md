---
title: "Bộ 6 — Variables, arrays và functions"
sidebar_position: 10
description: "15 bài tự chấm: local vs global trong function, return chỉ trả exit code, associative array, unset một phần tử array giữa danh sách, export vào subshell."
tags: [tutorial, bash, variable, array, function]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Bộ 6 — Variables, arrays và functions

> **Chạy thật 2026-10-28.** `verified_at` để trống.

Yêu cầu: đã làm [Bộ 1-2](bt-01-nen-tang.md). Lý thuyết:
[Biến, mảng và parameter expansion](../skills/variables-arrays-expansion.md),
[Functions](../skills/functions.md).

## Câu 1 — `local` giữ biến trong phạm vi function

**Dự đoán:** hai dòng `echo` in ra `x=` mấy — bên trong `f` và sau khi `f` chạy xong?

```bash
x=10
f() { local x=20; echo "trong f: x=$x"; }
f
echo "ngoai f: x=$x"
```

**Đáp số:**

```text
trong f: x=20
ngoai f: x=10
```

<details>
<summary>Lời giải</summary>

`local` tạo một biến **chỉ tồn tại trong function**, che (shadow) biến toàn cục cùng
tên. Ra khỏi function, biến toàn cục `x=10` không hề bị đổi.

</details>

## Câu 2 — bẫy: quên `local`, function đổi biến ngoài

**Dự đoán:** sau khi gọi `g` (không có `local`), biến `y` ở ngoài còn là `100` hay đã bị đổi thành `999`?

```bash
y=100
g() { y=999; echo "trong g: y=$y"; }
g
echo "sau g (khong co local): y=$y"
```

**Đáp số:**

```text
trong g: y=999
sau g (khong co local): y=999
```

<details>
<summary>Lời giải</summary>

Không có `local`, gán biến trong function **mặc định là toàn cục** trong bash — khác
hẳn hầu hết ngôn ngữ lập trình (nơi biến trong function mặc định là local). Quên
`local` là nguyên nhân phổ biến của lỗi "biến bị đổi giá trị không hiểu từ đâu" trong
script dài nhiều function.

</details>

## Câu 3 — `return` chỉ trả exit code (0-255), không trả "giá trị"

**Dự đoán:** `$?` sau khi gọi `h` là mấy?

```bash
h() { return 7; }
h
echo "exit cua h=$?"
```

**Đáp số:**

```text
exit cua h=7
```

<details>
<summary>Lời giải</summary>

`return N` giống `exit N` nhưng chỉ thoát khỏi **function**, không thoát cả script.
`N` giới hạn `0-255` (tràn số sẽ bị modulo 256) — dùng để báo **thành/bại**, không phải
để trả dữ liệu tính toán.

</details>

## Câu 4 — muốn "trả giá trị" thật thì dùng `echo` + command substitution

**Dự đoán:** biến `result` cuối cùng mang giá trị gì?

```bash
sum() { echo $(( $1 + $2 )); }
result=$(sum 3 4)
echo "result=$result"
```

**Đáp số:**

```text
result=7
```

<details>
<summary>Lời giải</summary>

Bash không có khái niệm "return value" như hàm trong C/Python. Mẫu chuẩn để "trả dữ
liệu" là function `echo` ra stdout, caller bắt lại bằng `$(...)`. `return` (câu 3) và
`echo` (câu 4) phục vụ hai mục đích khác nhau, dễ nhầm vì cả hai đều hay gọi là "trả
về".

</details>

## Câu 5 — khai báo và truy cập array

**Dự đoán:** dòng `echo` in ra ba giá trị gì — phần tử đầu, phần tử cuối, và số phần tử?

```bash
arr=(mot hai ba)
echo "${arr[0]} ${arr[-1]} ${#arr[@]}"
```

**Đáp số:**

```text
mot ba 3
```

<details>
<summary>Lời giải</summary>

`${arr[0]}` là phần tử đầu (index từ 0). `${arr[-1]}` là phần tử **cuối** (bash ≥ 4.3
hỗ trợ index âm). `${#arr[@]}` là **số phần tử**, không nhầm với `${#arr}` (độ dài
chuỗi của phần tử đầu nếu không có `[@]`).

</details>

## Câu 6 — associative array (`declare -A`)

**Dự đoán:** `${map[a]} ${map[b]}` in ra gì, và sau khi `sort`, hai dòng `key=` xuất hiện theo thứ tự nào?

```bash
declare -A map
map[a]=1
map[b]=2
echo "${map[a]} ${map[b]}"
for k in "${!map[@]}"; do echo "key=$k"; done | sort
```

**Đáp số:**

```text
1 2
key=a
key=b
```

<details>
<summary>Lời giải</summary>

`declare -A` bắt buộc trước khi dùng associative array — thiếu nó, `map[a]=1` tạo một
**indexed array** thường với index là kết quả `((a))` (coi `a` như biểu thức số học,
thường ra `0`), không phải lỗi bạn mong đợi. `"${!map[@]}"` lấy danh sách **key**,
khác `"${map[@]}"` lấy danh sách **value**.

</details>

## Câu 7 — `unset` một phần tử giữa array, chỉ số có dồn lại không

**Dự đoán:** sau `unset 'arr2[1]'`, danh sách index (`${!arr2[@]}`) và danh sách value (`${arr2[@]}`) còn lại là gì — chỉ số có dồn lại hay để lỗ?

```bash
arr2=(a b c d)
unset 'arr2[1]'
echo "indices: ${!arr2[@]}"
echo "values: ${arr2[@]}"
```

**Đáp số:**

```text
indices: 0 2 3
values: a c d
```

<details>
<summary>Lời giải</summary>

`unset` một phần tử giữa indexed array để lại một **lỗ** — chỉ số **không** dồn lại
(`1` biến mất, không phải `b` đổi thành `c`). Lặp `for i in "${!arr2[@]}"` (duyệt
index) an toàn hơn `for i in $(seq 0 ${#arr2[@]})` (giả định chỉ số liên tục) sau khi
đã `unset` một phần tử.

</details>

## Câu 8 — giá trị mặc định cho tham số function

**Dự đoán:** hai lần gọi `greet` (không tham số, rồi với `"An"`) in ra gì?

```bash
greet() { local name="${1:-Khach}"; echo "Xin chao, $name"; }
greet
greet "An"
```

**Đáp số:**

```text
Xin chao, Khach
Xin chao, An
```

<details>
<summary>Lời giải</summary>

`${1:-Khach}` dùng đúng cú pháp "giá trị mặc định" đã học ở
[Bộ 2 câu 5](bt-02-quoting-expansion.md#câu-5--parameter-expansion-giá-trị-mặc-định),
áp cho tham số vị trí của function — không cần `if [ -z "$1" ]` dài dòng.

</details>

## Câu 9 — `$#` đếm đúng số tham số của function, không phải của script

**Dự đoán:** `so arg=` bên trong `count_args a b c` là mấy?

```bash
count_args() { echo "so arg=$#"; }
count_args a b c
```

**Đáp số:**

```text
so arg=3
```

<details>
<summary>Lời giải</summary>

`$#` trong function đếm tham số **truyền cho function đó**, che tạm `$#` của script
ngoài (nếu script được gọi với tham số khác). Bên trong function, `$1 $2 $3 ... $#`
luôn là bộ tham số riêng của lần gọi hiện tại.

</details>

## Câu 10 — `export` để biến môi trường "thấy được" trong subshell

**Dự đoán:** process con (`bash -c`) đọc được `MYVAR` là gì trước khi `unset`, và là gì sau khi `unset`?

```bash
export MYVAR="hello"
bash -c 'echo "con doc duoc: $MYVAR"'
unset MYVAR
bash -c 'echo "con doc duoc sau unset: [$MYVAR]"'
```

**Đáp số:**

```text
con doc duoc: hello
con doc duoc sau unset: []
```

<details>
<summary>Lời giải</summary>

Biến thường (không `export`) chỉ tồn tại trong **shell hiện tại**, không "thấy được"
từ process con (`bash -c` tạo một process bash mới). `export` đưa biến vào **danh sách
biến môi trường**, được kế thừa sang mọi process con sinh ra sau đó. `unset` xoá biến
khỏi cả shell hiện tại và môi trường — process con sau đó không còn thấy gì.

</details>

## Câu 11 — function đệ quy

**Dự đoán:** `fact 5` in ra số gì?

```bash
fact() {
  local n=$1
  if (( n <= 1 )); then echo 1; return; fi
  local sub=$(fact $((n-1)))
  echo $((n * sub))
}
fact 5
```

**Đáp số:**

```text
120
```

<details>
<summary>Lời giải</summary>

Bash function gọi được chính nó như mọi ngôn ngữ khác, miễn có **điều kiện dừng**
(`n <= 1`). Mỗi lớp gọi đệ quy dùng command substitution `$(fact $((n-1)))` để lấy
"giá trị trả về" — đúng mẫu đã học ở
[Câu 4](#câu-4--muốn-trả-giá-trị-thật-thì-dùng-echo--command-substitution), vì
`return` không trả được số lớn/biểu thức.

</details>

## Câu 12 — truyền array vào function bằng `declare -n` (nameref)

**Dự đoán:** sau khi gọi `double_all nums`, `echo "${nums[@]}"` in ra gì — mảng gốc có bị sửa thật không?

```bash
double_all() {
  local -n arr_ref=$1
  for i in "${!arr_ref[@]}"; do arr_ref[$i]=$(( arr_ref[i] * 2 )); done
}
nums=(1 2 3)
double_all nums
echo "${nums[@]}"
```

**Đáp số:**

```text
2 4 6
```

<details>
<summary>Lời giải</summary>

Bash không truyền array trực tiếp qua tham số function (`$1` chỉ nhận được tên biến
dạng chuỗi `"nums"`, không phải nội dung array). `local -n arr_ref=$1` tạo một
**nameref** — `arr_ref` trở thành một "bí danh" trỏ tới biến có tên đúng bằng giá trị
`$1`, nên sửa `arr_ref` là sửa thẳng `nums` ở ngoài, không cần `echo`/command
substitution.

</details>

## Câu 13 — `shift`: xử lý tham số vị trí kiểu hàng đợi

**Dự đoán:** `process a b c` in ra các dòng "dang xu ly" theo thứ tự nào?

```bash
process() {
  while (( $# > 0 )); do
    echo "dang xu ly: $1"
    shift
  done
}
process a b c
```

**Đáp số:**

```text
dang xu ly: a
dang xu ly: b
dang xu ly: c
```

<details>
<summary>Lời giải</summary>

`shift` đẩy toàn bộ tham số vị trí lùi một bậc: `$2` trở thành `$1`, `$3` thành `$2`,
và `$#` giảm đi 1. Mẫu `while (( $# > 0 )); do ...; shift; done` là cách chuẩn để
"ăn" từng tham số một mà không cần biết trước tổng số bao nhiêu — nền tảng của cách
`getopts` xử lý flag (xem [Bộ 7 câu 14](bt-07-control-flow-an-toan.md)).

</details>

## Câu 14 — `readonly`: biến không thể gán lại

**Dự đoán:** dòng gán lại `RO_VAR="thu doi"` gây ra kết quả gì?

```bash
readonly RO_VAR="khong doi"
RO_VAR="thu doi"
```

**Đáp số:**

```text
bash: line N: RO_VAR: readonly variable
```

<details>
<summary>Lời giải</summary>

`readonly` khoá biến **vĩnh viễn** cho tới khi shell/subshell đó kết thúc — không có
lệnh "unreadonly". Dùng cho hằng số trong script (ví dụ đường dẫn config cố định) để
tự bắt lỗi nếu có dòng code nào sau đó vô tình gán đè.

</details>

## Câu 15 — liệt kê tên biến theo tiền tố (`${!prefix*}`)

**Dự đoán:** `${!FOO_*}` in ra danh sách tên biến nào — `BAR_C` có xuất hiện không?

```bash
FOO_A=1
FOO_B=2
BAR_C=3
echo "${!FOO_*}"
```

**Đáp số:**

```text
FOO_A FOO_B
```

<details>
<summary>Lời giải</summary>

`${!prefix*}` (hoặc `${!prefix@}`) trả về **danh sách tên biến** (không phải giá trị)
bắt đầu bằng `prefix` đang tồn tại trong scope hiện tại — `BAR_C` không khớp tiền tố
`FOO_` nên không xuất hiện. Hữu ích để kiểm tra nhanh "có bao nhiêu biến cấu hình bắt
đầu bằng `APP_`" mà không cần `env | grep`.

</details>

## Related Topics

- [Biến, mảng và parameter expansion](../skills/variables-arrays-expansion.md) · [Functions](../skills/functions.md) — lý thuyết cho bộ này
- [Bộ 2 — Quoting và expansion](bt-02-quoting-expansion.md) · [Bộ 7 — Control flow và script an toàn](bt-07-control-flow-an-toan.md)
- [Bài tập — Bash](index.md) — mục lục bộ bài tập
