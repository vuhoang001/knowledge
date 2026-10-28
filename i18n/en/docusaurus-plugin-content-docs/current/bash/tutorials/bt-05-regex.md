---
title: "Bộ 5 — Regex: BRE vs ERE"
i18n_status: untranslated
sidebar_position: 9
description: "16 bài tự chấm: + là literal trong BRE nhưng là quantifier trong ERE, bẫy của dấu . khớp bất kỳ ký tự, [0-9]{3} không kiểm tra giá trị ≤255 — mỗi bài có đáp số thật."
tags: [tutorial, bash, regex]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Bộ 5 — Regex: BRE vs ERE

> **Chạy thật 2026-10-28**, `grep` (GNU grep) trên Linux. `verified_at` để trống.

Yêu cầu: đã đọc [Regex cơ bản](../reference/regex-co-ban.md). Dữ liệu dùng chung:

```bash
cat > data.txt << 'EOF'
192.168.1.1
10.0.0.256
user@example.com
not-an-email
file_01.txt
file_002.txt
colour
color
2026-07-01
01/07/2026
EOF
```

## Câu 1 — BRE: `+` là ký tự literal, không phải quantifier

```bash
echo "a+b" | grep -c '+'
echo "aab" | grep -c 'a+b'
```

**Đáp số:**

```text
1
0
```

<details>
<summary>Lời giải</summary>

Trong **BRE** (Basic Regular Expression — chế độ mặc định của `grep`), `+` không có
nghĩa đặc biệt, nó khớp đúng ký tự `+`. Dòng `"a+b"` chứa đúng ký tự `+` → khớp. Dòng
`"aab"` không chứa ký tự `+` nào → không khớp `a+b` dù có nghĩa "a lặp lại rồi b" theo
trực giác của người quen regex hiện đại.

</details>

## Câu 2 — ERE (`grep -E`): `+` trở thành quantifier thật

```bash
echo "aab" | grep -cE 'a+b'
```

**Đáp số:**

```text
1
```

<details>
<summary>Lời giải</summary>

`-E` chuyển sang **Extended Regular Expression**, nơi `+` nghĩa là "một hoặc nhiều lần
ký tự trước nó". `a+b` giờ khớp `aab` (`aa` rồi `b`). Đây là khác biệt lớn nhất và hay
gây bug nhất giữa BRE và ERE.

</details>

## Câu 3 — BRE muốn `+` là quantifier thì phải escape

```bash
echo "aab" | grep -c 'a\+b'
```

**Đáp số:**

```text
1
```

<details>
<summary>Lời giải</summary>

BRE đảo ngược quy tắc so với ERE: ký tự **thường** (`+`, `?`, `|`, `(`, `)`) là
literal; thêm `\` phía trước mới biến chúng thành ký tự đặc biệt. ERE thì ngược lại —
ký tự đặc biệt mặc định là special, thêm `\` để biến thành literal.

</details>

## Câu 4 — anchor `^` và `$`

```bash
grep -n '^file' data.txt
echo "---"
grep -n 'txt$' data.txt
```

**Đáp số:**

```text
5:file_01.txt
6:file_002.txt
---
5:file_01.txt
6:file_002.txt
```

<details>
<summary>Lời giải</summary>

`^pattern` khớp dòng **bắt đầu** bằng pattern; `pattern$` khớp dòng **kết thúc** bằng
pattern. Cả hai dòng này vừa bắt đầu bằng `file` vừa kết thúc bằng `txt`, nên khớp cả
hai lệnh.

</details>

## Câu 5 — character class số, có escape dấu chấm chưa

```bash
grep -nE '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' data.txt
```

**Đáp số:**

```text
1:192.168.1.1
2:10.0.0.256
```

<details>
<summary>Lời giải</summary>

Pattern này khớp "4 nhóm 1-3 chữ số, ngăn bởi dấu chấm literal" — và nó khớp **cả**
`10.0.0.256`, dù `256` không phải octet IPv4 hợp lệ (tối đa `255`). Regex chỉ kiểm tra
**hình dạng** chuỗi số, không kiểm tra **giá trị**.

</details>

## Câu 6 — bẫy: `.` không escape khớp bất kỳ ký tự

```bash
grep -n '192.168.1.1' data.txt
```

**Đáp số:**

```text
1:192.168.1.1
```

<details>
<summary>Lời giải</summary>

Kết quả **trông đúng**, nhưng là trùng hợp — `.` không escape nghĩa là "bất kỳ một ký
tự", nên pattern này cũng khớp `"192x168x1x1"` hay `"192-168-1-1"` nếu có trong dữ
liệu. Test với đúng một dòng dữ liệu "sạch" dễ che mất bug này.

</details>

## Câu 7 — escape dấu chấm cho đúng nghĩa IP literal

```bash
grep -nE '192\.168\.1\.1' data.txt
```

**Đáp số:**

```text
1:192.168.1.1
```

<details>
<summary>Lời giải</summary>

`\.` khớp **đúng** ký tự chấm, không khớp ký tự nào khác. Chuỗi `"192x168x1x1"` (nếu
có) sẽ **không** khớp pattern này — khác câu 6. Quên escape `.` khi tìm địa chỉ IP/URL
là một trong các lỗi regex phổ biến nhất.

</details>

## Câu 8 — `{3}` không kiểm tra khoảng giá trị

```bash
echo "10.0.0.256" | grep -cE '^([0-9]{1,3}\.){3}[0-9]{1,3}$'
```

**Đáp số:**

```text
1
```

<details>
<summary>Lời giải</summary>

Vẫn khớp `256` dù giá trị vượt `255` — như câu 5. Muốn kiểm tra đúng octet IPv4 hợp lệ
phải viết alternation theo khoảng (`25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?`), dài và dễ
sai hơn nhiều — đây là lý do thực tế hầu như không ai validate IPv4 bằng regex thuần,
mà dùng hàm có sẵn của ngôn ngữ/thư viện.

</details>

## Câu 9 — alternation trong ERE

```bash
grep -nE 'colour|color' data.txt
```

**Đáp số:**

```text
7:colour
8:color
```

<details>
<summary>Lời giải</summary>

`|` trong ERE là "hoặc" không cần escape — khớp dòng chứa `colour` **hoặc** `color`.

</details>

## Câu 10 — alternation trong BRE phải escape

```bash
grep -n 'colour\|color' data.txt
```

**Đáp số:**

```text
7:colour
8:color
```

<details>
<summary>Lời giải</summary>

Cùng kết quả câu 9, nhưng BRE cần `\|` — một ví dụ khác của quy tắc "BRE: ký tự đặc
biệt phải escape, ERE: ký tự đặc biệt mặc định sẵn" ở câu 1-3.

</details>

## Câu 11 — capture group và số lần lặp trong ERE

```bash
grep -nE '(file)_[0-9]{2,3}\.txt' data.txt
```

**Đáp số:**

```text
5:file_01.txt
6:file_002.txt
```

<details>
<summary>Lời giải</summary>

`(file)` là một group (dù ở đây không dùng lại backreference, group vẫn hợp lệ cho
mục đích gom nhóm). `[0-9]{2,3}` khớp 2 **hoặc** 3 chữ số — khớp cả `01` (2 chữ số) và
`002` (3 chữ số).

</details>

## Câu 12 — `grep -P` (PCRE) hỗ trợ lookahead, `-E` thuần thì không

```bash
echo "foo123bar" | grep -oP '\d+(?=bar)'
echo "---thu voi -E, khong co lookahead---"
echo "foo123bar" | grep -oE '[0-9]+(?=bar)'
```

**Đáp số:**

```text
123
---thu voi -E, khong co lookahead---
grep: warning: ? at start of expression
```

<details>
<summary>Lời giải</summary>

`(?=bar)` là **lookahead** — "khớp vị trí mà *ngay sau* nó là `bar`, nhưng không ăn
vào kết quả khớp". Đây là tính năng của **PCRE** (Perl-Compatible Regular Expression,
cần cờ `-P`), **không tồn tại** trong BRE hay ERE. Dùng `(?=...)` mà quên `-P` không
báo lỗi "cú pháp lạ" rõ ràng — `grep -E` cố hiểu nó theo luật ERE thông thường
(`?` ngay sau `(` không có ký tự đứng trước để lặp) và chỉ cảnh báo mập mờ.

</details>

## Câu 13 — `grep -o`: chỉ in phần khớp, không in cả dòng

```bash
echo "user@example.com" | grep -oE '[a-z]+@[a-z.]+'
```

**Đáp số:**

```text
user@example.com
```

<details>
<summary>Lời giải</summary>

Mặc định `grep` in **toàn bộ dòng** chứa phần khớp. `-o` chỉ in **chính phần khớp**
— quan trọng khi dòng có nhiều nội dung khác và chỉ cần trích ra đúng mẩu tìm được
(ví dụ trích email từ một dòng log dài).

</details>

## Câu 14 — bẫy đã sửa: `\b` (word boundary) hoạt động cả khi KHÔNG có `-P`

```bash
echo "cat catalog category" | grep -oP '\bcat\b'
echo "---thu lai voi -E, khong co -P---"
echo "cat catalog category" | grep -oE '\bcat\b'
```

**Đáp số:**

```text
cat
---thu lai voi -E, khong co -P---
cat
```

<details>
<summary>Lời giải</summary>

**Ngược với suy nghĩ phổ biến:** nhiều người tưởng `\b` chỉ chạy được với `-P`. Thật
ra GNU `grep` hỗ trợ `\b`, `\w`, `\<`, `\>` như **phần mở rộng riêng của GNU**, hoạt
động cả trong BRE và ERE, không cần `-P`. Chỉ những tính năng PCRE *thật sự đặc thù*
— lookahead/lookbehind (câu 12), named group, backreference phức tạp — mới bắt buộc
`-P`. Đừng thêm `-P` "cho chắc" khi không cần; nó chậm hơn và không hỗ trợ trên mọi
bản `grep` (BSD/macOS `grep` không có `-P`).

</details>

## Câu 15 — `grep -i`: không phân biệt hoa thường

```bash
printf 'Error\nerror\nERROR\nInfo\n' | grep -ci 'error'
```

**Đáp số:**

```text
3
```

<details>
<summary>Lời giải</summary>

`-i` khớp bất kể hoa/thường — `Error`, `error`, `ERROR` đều tính, chỉ `Info` không
khớp. Hữu ích khi lọc log mà quy ước viết hoa không nhất quán giữa các hệ thống.

</details>

## Câu 16 — `?` trong ERE: 0 hoặc 1 lần

```bash
printf 'color\ncolour\ncolouur\n' | grep -nE 'colou?r'
```

**Đáp số:**

```text
1:color
2:colour
```

<details>
<summary>Lời giải</summary>

`u?` nghĩa "có `u` hoặc không, tối đa một lần" — khớp `color` (0 lần `u`) và `colour`
(1 lần `u`), nhưng **không** khớp `colouur` (2 lần `u` — vượt quá "tối đa một"). Muốn
khớp cả `colouur` cần `u*` (0 hoặc nhiều) hoặc `u+` (1 hoặc nhiều), không phải `u?`.

</details>

## Đáp số đối chiếu nhanh

| Câu | Bài học chính |
|---|---|
| 1-3 | `+`/`\|` ngược nghĩa literal/special giữa BRE và ERE |
| 4 | `^`/`$` là anchor vị trí, không phải ký tự |
| 5, 8 | Regex kiểm tra hình dạng, không kiểm tra giá trị (`256` vẫn khớp pattern IP) |
| 6-7 | `.` không escape là bẫy khớp nhầm phổ biến nhất |
| 9-10 | alternation cũng ngược quy tắc escape như quantifier |
| 11 | `{m,n}` cho khoảng số lần lặp, không chỉ số cố định |
| 12 | Lookahead `(?=...)` chỉ có ở PCRE (`-P`), không có ở BRE/ERE |
| 13 | `-o` trích đúng phần khớp, không in cả dòng |
| 14 | `\b`/`\w` là GNU extension, chạy được cả khi KHÔNG có `-P` |
| 15 | `-i` bỏ phân biệt hoa/thường |
| 16 | `?` là 0-hoặc-1 lần, khác `*` (0-hoặc-nhiều) và `+` (1-hoặc-nhiều) |

## Related Topics

- [Regex cơ bản](../reference/regex-co-ban.md) — lý thuyết cho bộ này
- [Lab: regex và sed](bash-lab-regex-va-sed.md) — lab chạy thật áp dụng regex vào CSV
- [Bộ 4 — Text processing](bt-04-text-processing.md) · [Bộ 6 — Variables, arrays, functions](bt-06-variables-arrays-functions.md)
- [Bài tập — Bash](index.md) — mục lục bộ bài tập
