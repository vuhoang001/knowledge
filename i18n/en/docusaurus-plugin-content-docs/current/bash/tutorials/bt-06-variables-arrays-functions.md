---
title: "Bộ 6 — Variables, arrays và functions"
i18n_status: untranslated
sidebar_position: 10
description: "10 bài tự chấm: local vs global trong function, return chỉ trả exit code, associative array, unset một phần tử array giữa danh sách, export vào subshell."
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

## Related Topics

- [Biến, mảng và parameter expansion](../skills/variables-arrays-expansion.md) · [Functions](../skills/functions.md) — lý thuyết cho bộ này
- [Bộ 2 — Quoting và expansion](bt-02-quoting-expansion.md) · [Bộ 7 — Control flow và script an toàn](bt-07-control-flow-an-toan.md)
- [Bài tập — Bash](index.md) — mục lục bộ bài tập
