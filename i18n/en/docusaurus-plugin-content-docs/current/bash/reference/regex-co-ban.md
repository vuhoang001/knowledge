---
title: Regex cơ bản
i18n_status: untranslated
sidebar_position: 7
description: "grep mặc định là BRE nên + ? | ( ) { } là ký tự thường, không phải toán tử — thiếu -E là lý do số một pattern 'không khớp gì cả' mà không báo lỗi."
tags: [regex, grep, bre, ere, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Regex cơ bản

> **Chốt:** `grep` mặc định dùng **BRE** (Basic Regular Expression), ở đó `+ ? | ( ) { }`
> là ký tự **thường**, không phải toán tử. Thêm cờ `-E` (ERE) để chúng có nghĩa. Sai lầm
> tốn thời gian nhất không phải là quên một ký hiệu — mà là viết pattern tưởng đúng,
> `grep` không báo lỗi gì, chỉ lặng lẽ trả về rỗng hoặc khớp nhầm dòng khác.

## Mục tiêu

Sau bài này bạn phân biệt được:

- Vì sao `grep 'a+'` không tìm "một hoặc nhiều a" — và khi nào cần `-E`.
- Bảng ký hiệu cốt lõi: `. ^ $ [] | * + ?` và quantifier `{n,m}`.
- Khi nào `.` là bẫy chết người (IP, path chứa dấu chấm) và `-F` giải quyết thế nào.
- Vì sao `\d`/`\w` ngắn gọn nhưng **không portable** — và nên dùng thay cho cái gì.

Bài này giả định bạn đã nắm [quoting và expansion](quoting-va-expansion.md) (khi nào cần
nháy đơn quanh pattern). Phần ghép `grep`/`sed`/`awk` thành pipeline thật thì xem
[Xử lý văn bản bằng pipeline](../skills/text-processing.md) — ở đây chỉ bàn cú pháp
regex, chưa ghép lệnh.

## Tổng quan

| Ký hiệu | Ý nghĩa | Cần `-E`? |
|---|---|---|
| `.` | Bất kỳ **một** ký tự nào (trừ newline) | Không |
| `^` | Đầu dòng | Không |
| `$` | Cuối dòng | Không |
| `[...]` | Một ký tự trong tập (ví dụ `[0-9]`, `[A-Za-z]`) | Không |
| `*` | Ký tự trước nó, 0 lần hoặc nhiều hơn | Không |
| `+` | Ký tự trước nó, 1 lần hoặc nhiều hơn | **Có** (hoặc escape `\+` trong BRE) |
| `?` | Ký tự trước nó, 0 hoặc 1 lần | **Có** (hoặc `\?`) |
| `\|` | HOẶC | **Có** (hoặc `\|`) |
| `(...)` | Nhóm | **Có** (hoặc `\(...\)`) |
| `{n,m}` | Lặp đúng n tới m lần | **Có** (hoặc `\{n,m\}`) |

Cột cuối là lý do bảng này đáng nhớ hơn cả: `* . ^ $ []` hoạt động giống nhau ở cả BRE
(mặc định) và ERE (`-E`), nhưng `+ ? | ( ) {}` thì **đổi hẳn ý nghĩa** tùy có `-E` hay
không — chúng là ký tự *thường* trong BRE.

## Ví dụ

> Chạy thật 2026-10-28 · `grep` trên máy này là **ugrep 7.8.4** (tương thích cờ GNU
> grep, `-P` chạy qua `pcre2jit`), `sed` là GNU sed 4.9. Trên máy dùng BSD/busybox grep,
> `-P` có thể không tồn tại — xem phần Trade-offs.

### BRE vs ERE — bằng chứng, không phải lý thuyết

```bash
printf 'aaa\na+b\n' > plus_demo.txt
grep 'a+' plus_demo.txt        # BRE: '+' là ký tự thường
grep -E 'a+' plus_demo.txt     # ERE: '+' là quantifier
```

```text
-- grep thường (BRE) --
a+b
-- grep -E (ERE) --
aaa
a+b
```

`grep 'a+'` chỉ tìm được dòng có **chuỗi `a+` thật**, bỏ sót dòng `aaa` — vì trong BRE,
`+` chỉ là chữ `+`. Thêm `-E`, nó mới hiểu "một hoặc nhiều `a`" và khớp cả hai dòng.

### Anchor `^`/`$` và OR `|` trên dữ liệu thật

Dữ liệu mẫu:

```bash
cat > messy_data.txt <<'EOF'
ID, Name, Salary, Code
1, John Doe, $5000, A12
2, Jane_Smith, 6000, B-99
3, Bob, $450, A1
ERROR: Missing User Data
4, Alice   Jones, 8000, C44
EOF
```

Chỉ lấy dòng dữ liệu thật (bắt đầu bằng số, bỏ header và dòng `ERROR`):

```bash
grep -E '^[0-9]' messy_data.txt
```

```text
1, John Doe, $5000, A12
2, Jane_Smith, 6000, B-99
3, Bob, $450, A1
4, Alice   Jones, 8000, C44
```

Tìm số tiền có `$` (phải escape `\$` vì `$` là anchor cuối dòng, không phải ký tự
tiền tệ):

```bash
grep -E '\$[0-9]+' messy_data.txt
```

```text
1, John Doe, $5000, A12
3, Bob, $450, A1
```

OR hai mã cụ thể (`|` cần `-E`, hoặc escape `\|`):

```bash
grep -E 'A12|C44' messy_data.txt
```

```text
1, John Doe, $5000, A12
4, Alice   Jones, 8000, C44
```

### Bẫy `.`: wildcard khớp nhầm cả chuỗi KHÔNG phải mẫu định tìm

`.` khớp **mọi** ký tự — kể cả khi bạn chỉ muốn tìm một dấu chấm thật, ví dụ địa chỉ IP:

```bash
cat > staff.dat <<'EOF'
EMP_01 :: Alice | 192.168.9.9 :: ACTIVE
EMP_02 :: Bob | 192X168X9X9 :: ACTIVE
EOF
grep '192.168.9.9' staff.dat
```

```text
EMP_01 :: Alice | 192.168.9.9 :: ACTIVE
EMP_02 :: Bob | 192X168X9X9 :: ACTIVE
```

Cả hai dòng đều khớp — vì `.` trong pattern khớp luôn ký tự `X`. Đây là bẫy kinh điển
khi tìm IP, version number, hoặc bất kỳ chuỗi có dấu chấm. Sửa bằng `-F` (fixed string,
**tắt hẳn** cơ chế regex, so khớp nguyên văn):

```bash
grep -F '192.168.9.9' staff.dat
```

```text
EMP_01 :: Alice | 192.168.9.9 :: ACTIVE
```

Chỉ còn đúng một dòng. `-F` không hiểu `. * [ ] ^ $` gì cả — nó chỉ tìm chuỗi y nguyên,
nên luôn là lựa chọn an toàn khi pattern là một chuỗi cụ thể (IP, tên file, token) chứ
không phải một khuôn mẫu.

## Trade-offs

| Cách gọi | Được | Mất / cạm bẫy |
|---|---|---|
| `grep` (BRE, mặc định) | Luôn có, không cần nhớ cờ | `+ ? \| ( ) {}` là ký tự thường — viết sai mà không báo lỗi |
| `grep -E` (ERE) | `+ ? \| ( ) {}` thành toán tử, chuẩn POSIX, có ở hầu hết hệ thống | Vẫn không có `\d` `\w` `\s` |
| `grep -P` (PCRE) | `\d` `\w` `\s` ngắn gọn, mạnh nhất | **Không portable** — BSD grep (macOS mặc định), busybox, một số distro tối giản không có `-P` |
| `grep -F` (fixed string) | Tắt hẳn regex, an toàn tuyệt đối với chuỗi có `. * [ ] $` | Mất khả năng dùng mẫu — chỉ so khớp nguyên văn |

**Quy tắc chọn:** biết chắc chuỗi cần tìm (IP, path, token cụ thể) → `-F`. Cần một
khuôn mẫu (nhiều dòng khác nhau cùng hình dạng) → `-E` với `[0-9]`/`[A-Za-z]` để chắc
chạy được ở mọi máy; chỉ dùng `-P`/`\d`/`\w` khi biết chắc môi trường đích có GNU grep
hoặc ugrep.

## Common Mistakes

- **Quên `-E` cho `+ ? | ( ) {}`.** Pattern không lỗi cú pháp, chỉ lặng lẽ không khớp —
  đây là lỗi khó phát hiện nhất vì không có thông báo gì cả.
- **Quên `-F` hoặc quên escape `.` khi tìm IP/version.** `.` khớp bất kỳ ký tự, dễ
  trúng một chuỗi gần giống nhưng sai (ví dụ `192X168X9X9` khớp nhầm pattern
  `192.168.9.9`, xem ví dụ trên).
- **Quên anchor `^`/`$`.** Thiếu `$` ở cuối pattern, dòng có thêm hậu tố (ví dụ
  `_SIMULATION`, `_TEST`, `_BACKUP`) vẫn khớp dù không phải dòng định tìm.
- **Dùng `\d`/`\w` rồi mang script sang máy khác chạy BSD grep.** Script chạy tốt trên
  máy viết, lỗi `unsupported option -P` khi chạy trên macOS/CI runner khác.

## FAQ

<details>
<summary>Khi nào thật sự cần `\d`/`\w` (`-P`) thay vì `[0-9]`/`[A-Za-z0-9_]` (`-E`)?</summary>

Hầu như không bao giờ **bắt buộc** — `[0-9]` và `[A-Za-z0-9_]` làm được mọi việc `\d`
và `\w` làm, chỉ dài hơn vài ký tự. `-P` đáng dùng khi cần tính năng PCRE thật sự không
có ở ERE: lookahead/lookbehind (`(?=...)`, `(?<=...)`), non-greedy (`*?`), hoặc named
group. Nếu chỉ cần digit/word character đơn giản, `-E` với character class là lựa chọn
portable hơn.

</details>

<details>
<summary>`grep -F` có nhanh hơn `grep` thường không?</summary>

Có, vì nó không cần dựng máy trạng thái regex — chỉ so khớp chuỗi trực tiếp (thuật toán
kiểu Boyer-Moore/Aho-Corasick). Với file lớn và pattern là chuỗi cố định (không có
`. * []`), `-F` vừa đúng vừa nhanh hơn. Chỉ bỏ `-F` khi thật sự cần một khuôn mẫu.

</details>

## Related Topics

- [Xử lý văn bản bằng pipeline](../skills/text-processing.md) — ghép `grep` vào pipeline thật với `awk`/`sed`/`sort`
- [Lab: regex và sed](../tutorials/bash-lab-regex-va-sed.md) — bài thực hành có đáp số
- [Quoting và expansion](quoting-va-expansion.md) — khi nào cần nháy đơn quanh pattern

## References

- `man grep`, `man 7 regex` — BRE vs ERE theo POSIX
- `man pcre2syntax` — cú pháp PCRE mà `-P` dùng
