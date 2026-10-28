---
title: 'Lab: regex và sed'
sidebar_position: 3
description: "Luyện grep -E/-F trên dữ liệu bẩn, rồi dựng sed để chuẩn hoá CSV — và thấy tận mắt vì sao sed 's/O/0/g' trên cả dòng phá luôn chữ CLEARED_OK."
tags: [tutorial, regex, grep, sed, bash]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Lab: regex và sed

> **Chốt:** `grep -E`/`-F` lọc đúng **dòng**, `sed 's/x/y/g'` thay đúng **chuỗi** — nhưng
> `sed` không biết ngữ nghĩa cột. Thay lan ra cả dòng (`s/O/0/g` áp cho toàn bộ text) là
> cách phổ biến nhất để tự phá dữ liệu của chính mình mà không có lỗi nào báo.

## Mục tiêu

Lab này giả định bạn đã đọc [Regex cơ bản](../reference/regex-co-ban.md). Ở đây luyện
tay ba việc:

- Lọc dòng bằng `grep -E` (khuôn mẫu) và `grep -F` (chuỗi cố định, tránh bẫy `.`).
- Chuẩn hoá delimiter hỗn loạn (`;`, `,,`, khoảng trắng dư) về một CSV sạch bằng `sed`.
- Thấy tận mắt bẫy "thay lan ra cả dòng" và cách tránh: nhắm `sed` đúng vào phần cần
  sửa trước khi strip ký tự bọc ngoài.

Nháp cho toàn bài:

```bash
mkdir -p /tmp/bashlab-tut-regex && cd /tmp/bashlab-tut-regex
```

## Bài 1 — Lọc dòng hợp lệ bằng anchor

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

Chạy thật 2026-10-28 · `grep` trên máy này là ugrep 7.8.4 (tương thích cờ GNU grep).

```bash
grep -E '^[0-9]' messy_data.txt
```

```text
1, John Doe, $5000, A12
2, Jane_Smith, 6000, B-99
3, Bob, $450, A1
4, Alice   Jones, 8000, C44
```

`^[0-9]` neo đầu dòng vào một chữ số — loại được cả header và dòng `ERROR` mà không
cần biết nội dung chính xác của chúng.

## Bài 2 — Tránh bẫy `.` khi tìm chuỗi cụ thể

```bash
cat > staff.dat <<'EOF'
EMP_01 :: Alice | 192.168.9.9 :: ACTIVE
EMP_02 :: Bob | 192X168X9X9 :: ACTIVE
EMP_03 :: Carol | 192.168.9.9 :: TERMINATED
EOF
```

Tìm theo IP mà **không** dùng `-F`:

```bash
grep '192.168.9.9' staff.dat
```

```text
EMP_01 :: Alice | 192.168.9.9 :: ACTIVE
EMP_02 :: Bob | 192X168X9X9 :: ACTIVE
EMP_03 :: Carol | 192.168.9.9 :: TERMINATED
```

Ba dòng, dù chỉ hai dòng có IP thật — `.` khớp nhầm `X`. Thêm `-F`:

```bash
grep -F '192.168.9.9' staff.dat
```

```text
EMP_01 :: Alice | 192.168.9.9 :: ACTIVE
EMP_03 :: Carol | 192.168.9.9 :: TERMINATED
```

Đúng hai dòng. Muốn loại tiếp người đã `TERMINATED`, ghép thêm `grep -v`:

```bash
grep -F '192.168.9.9' staff.dat | grep -v TERMINATED
```

```text
EMP_01 :: Alice | 192.168.9.9 :: ACTIVE
```

## Bài 3 — Chuẩn hoá delimiter hỗn loạn bằng `sed`

CSV thật thường không sạch: vài dòng dùng `;` thay `,`, vài dòng có `,,` do cột rỗng,
vài dòng có khoảng trắng dư quanh dấu phẩy.

```bash
cat > dirty.csv <<'EOF'
ID,REGION,AMOUNT,STATUS
TX1,,SE_Asia,$1OOUSD,CLEARED_OK
TX2;E_Asia;$2SOUSD;CLEARED_OK
TX3 , SE_Asia , $3OOUSD , CLEARED_OK
EOF
```

Ba lớp `sed` nối tiếp: đổi `;` thành `,`, gộp `,,` thành `,`, rồi xoá khoảng trắng
quanh dấu phẩy:

```bash
tail -n +2 dirty.csv | sed -E 's/;/,/g; s/,,/,/g; s/ *, */,/g'
```

```text
TX1,SE_Asia,$1OOUSD,CLEARED_OK
TX2,E_Asia,$2SOUSD,CLEARED_OK
TX3,SE_Asia,$3OOUSD,CLEARED_OK
```

Ba kiểu lỗi khác nhau, cùng về một dạng 4 cột. Chú ý `$1OOUSD`/`$2SOUSD`/`$3OOUSD`
vẫn còn nguyên — đó là chuyện của Bài 4.

## Bài 4 — Bẫy "thay lan ra cả dòng"

Số tiền trên bị mã hoá: chữ `O` thay cho số `0`, chữ `S` thay cho số `5`
(`$1OOUSD` = 100, `$2SOUSD` = 250, `$3OOUSD` = 300). Phản xạ đầu tiên là:

```bash
echo "CLEARED_OK" | sed 's/O/0/g'
```

```text
CLEARED_0K
```

**Hỏng.** `sed 's/O/0/g'` không biết "chỉ sửa trong số tiền" — nó thay **mọi** chữ `O`
trên dòng, nên `CLEARED_OK` (một trạng thái, không phải số) biến thành `CLEARED_0K`. Với
dữ liệu thật, điều này âm thầm phá luôn các cột chữ như `REGION` (`SE_Asia` chứa chữ
hoa không bị ảnh hưởng ở ví dụ này, nhưng status/region khác chứa `O`/`S` thì dính
chắc).

Cách đúng: chỉ thay số **trong đúng token tiền tệ** (`$...USD`), trước khi bóc lớp
`$`/`USD` ra. `perl -pe` với `/e` cho phép chạy code Perl ngay trong phần thay thế —
dùng `tr///` chỉ trên phần đã bắt được bởi group `()`, không đụng gì ra ngoài:

```bash
echo 'TX1,SE_Asia,$1OOUSD,CLEARED_OK' \
  | perl -pe 's/\$([A-Za-z0-9]+)USD/my $x=$1; $x=~tr\/O\/0\/; "\$${x}USD"/ge'
```

```text
TX1,SE_Asia,$100USD,CLEARED_OK
```

`CLEARED_OK` giữ nguyên, chỉ `$1OOUSD` → `$100USD`. Bài học: khi cần "thay ký tự X
thành Y", luôn hỏi lại *"X này chỉ nên đổi ở đâu"* trước khi viết `s/X/Y/g` áp cho cả
dòng.

## Tự kiểm

Dữ liệu mới, tự dựng pipeline rồi mới mở đáp án.

```bash
cat > self_check.csv <<'EOF'
ID,REGION,AMOUNT,STATUS
R1;N_Asia;$8OOUSD;CLEARED_OK
R2,,S_Asia,$4SOUSD,CLEARED_OK
R3 , N_Asia , $1OOUSD , REVERSED
EOF
```

1. Chuẩn hoá cả 3 dòng về đúng 4 cột, ngăn cách bằng `,` (không còn `;`, không còn
   khoảng trắng dư).
2. Giải mã đúng số tiền của R1 và R2 (chữ `O`→`0`, `S`→`5`) **mà không** làm hỏng chữ
   `CLEARED_OK`/`REVERSED`.
3. Chỉ giữ lại các dòng có `STATUS` là `CLEARED_OK` — dùng `grep` hoặc `awk`, tổng số
   tiền còn lại là bao nhiêu?

<details>
<summary>Đáp án</summary>

```bash
# 1) chuan hoa delimiter
tail -n +2 self_check.csv | sed -E 's/;/,/g; s/,,/,/g; s/ *, */,/g'
```

```text
R1,N_Asia,$8OOUSD,CLEARED_OK
R2,S_Asia,$4SOUSD,CLEARED_OK
R3,N_Asia,$1OOUSD,REVERSED
```

```bash
# 2) giai ma tien te, chi trong token $...USD
tail -n +2 self_check.csv \
  | sed -E 's/;/,/g; s/,,/,/g; s/ *, */,/g' \
  | perl -pe 's/\$([A-Za-z0-9]+)USD/my $x=$1; $x=~tr\/OS\/05\/; "\$${x}USD"/ge'
```

```text
R1,N_Asia,$800USD,CLEARED_OK
R2,S_Asia,$450USD,CLEARED_OK
R3,N_Asia,$100USD,REVERSED
```

```bash
# 3) chi giu CLEARED_OK, cong tien
tail -n +2 self_check.csv \
  | sed -E 's/;/,/g; s/,,/,/g; s/ *, */,/g' \
  | perl -pe 's/\$([A-Za-z0-9]+)USD/my $x=$1; $x=~tr\/OS\/05\/; "\$${x}USD"/ge' \
  | awk -F',' '$4=="CLEARED_OK" {gsub(/[$]|USD/,"",$3); sum+=$3} END{print sum}'
```

```text
1250
```

`R1` (800) + `R2` (450) = 1250. `R3` bị loại vì `REVERSED`.

</details>

## Related Topics

- [Regex cơ bản](../reference/regex-co-ban.md) — lý thuyết cho lab này
- [Xử lý văn bản bằng pipeline](../skills/text-processing.md)
- [Lab: xử lý văn bản bằng pipeline](bash-lab-text-processing.md)
- [Lab: mock kiểm tra CLI tổng hợp](bash-lab-forensics-mock.md) — ghép kỹ năng này vào một chuỗi dài hơn
