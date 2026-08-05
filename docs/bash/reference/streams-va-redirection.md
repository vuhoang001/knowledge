---
title: Streams và redirection
sidebar_position: 2
description: "Mọi lệnh có ba dòng dữ liệu stdin/stdout/stderr — redirection là nối lại các dòng đó, sai thứ tự là mất log lỗi."
tags: [streams, redirection, pipe, stdout, stderr, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Streams và redirection

> **Chốt:** Mỗi lệnh có ba dòng dữ liệu — stdin (fd 0), stdout (fd 1), stderr (fd 2). Redirection chỉ là nối lại các dòng đó vào file/pipe. Cạm bẫy chết người: `cmd >file 2>&1` gộp lỗi vào file, nhưng đảo thành `cmd 2>&1 >file` thì stderr vẫn phun ra terminal — vì redirection đọc trái→phải và `2>&1` copy đích **hiện tại** của fd 1, không phải đích tương lai.

## Mục tiêu

- Hiểu vì sao stdout và stderr là hai dòng tách biệt, và khi nào cần tách/gộp.
- Dùng đúng `>`, `>>`, `<`, `2>`, `2>&1`, `&>`, `/dev/null`.
- Không bao giờ mất log lỗi vì viết sai thứ tự redirection.
- Nối lệnh bằng pipe `|`, và giữ một bản sao bằng `tee`.
- Nạp input inline bằng here-doc `<<EOF` và here-string `<<<`.

## Tổng quan

Ba stream mặc định gắn với mọi process. `fd` là *file descriptor* — một số nguyên hệ điều hành dùng để chỉ một dòng dữ liệu.

| Stream | fd | Mặc định đi đâu | Dùng để |
|---|---|---|---|
| stdin | 0 | bàn phím | dữ liệu **vào** lệnh |
| stdout | 1 | terminal | kết quả **bình thường** |
| stderr | 2 | terminal | **thông báo lỗi**, log tiến trình |

Vì sao tách stdout khỏi stderr? Để bạn **pipe kết quả đi xử lý tiếp mà không dính rác lỗi**, đồng thời vẫn **thấy lỗi ngay trên terminal**. Nếu lỗi cũng đi vào stdout thì `cmd | grep foo` sẽ nuốt luôn cả dòng lỗi vào bộ lọc — bạn mất cảnh báo. Tách hai dòng cho bạn quyền: giữ, ném đi, hay gộp — tuỳ ý.

## Ví dụ

> Chạy thật 2026-08-05 · bash 5.3.9(1) trên Ubuntu. Coreutils ở máy này là uutils 0.8.0, không phải GNU — output có thể lệch nhỏ so với GNU coreutils.
> Trong box `ls` là alias của `lsd`; các ví dụ gọi `command ls` để lấy hành vi `ls` thật.

Một lệnh sinh **cả hai** dòng: `ls` in tên file tồn tại ra stdout, và báo file thiếu ra stderr.

```bash
touch existing.txt
command ls existing.txt missing.txt
```

```
ls: cannot access 'missing.txt': No such file or directory
existing.txt
```

Dòng lỗi (stderr) và dòng kết quả (stdout) đang trộn trên terminal. Giờ tách chúng ra.

**Nuốt stderr, chỉ giữ stdout** — `2>/dev/null` ném dòng lỗi vào thùng rác:

```bash
command ls existing.txt missing.txt 2>/dev/null
```

```
existing.txt
```

**Nuốt stdout, chỉ giữ stderr** — `1>/dev/null` (viết tắt `>/dev/null`):

```bash
command ls existing.txt missing.txt 1>/dev/null
```

```
ls: cannot access 'missing.txt': No such file or directory
```

### Cạm bẫy thứ tự: `2>&1` trước hay sau `>file`?

Đây là chỗ sai nhiều nhất. Ký hiệu `2>&1` nghĩa là *"cho fd 2 trỏ tới **đích hiện tại** của fd 1"*. Bash đọc redirection **từ trái sang phải**, nên vị trí quyết định tất cả.

**ĐÚNG** — `>out 2>&1`: fd 1 chuyển vào file trước, rồi fd 2 copy đích đó → cả hai vào file:

```bash
command ls existing.txt missing.txt >out-correct.txt 2>&1
cat out-correct.txt
```

```
ls: cannot access 'missing.txt': No such file or directory
existing.txt
```

Terminal im lặng — không dòng lỗi nào lọt ra ngoài.

**SAI** — `2>&1 >out`: fd 2 copy đích của fd 1 khi nó **vẫn đang là terminal**, rồi mới đổi fd 1 sang file. Kết quả: stdout vào file, còn **stderr vẫn phun ra terminal**:

```bash
command ls existing.txt missing.txt 2>&1 >out-wrong.txt
```

```
ls: cannot access 'missing.txt': No such file or directory
```

```bash
cat out-wrong.txt
```

```
existing.txt
```

Thấy chưa: dòng lỗi in ra màn hình, và file **chỉ có stdout**. Nếu bạn tưởng lệnh đã "gộp hết vào log" thì bạn vừa mất toàn bộ log lỗi mà không biết. Hãy nghĩ `2>&1` là *"copy đích của fd 1 tại thời điểm này"*, không phải *"buộc fd 2 dính theo fd 1 mãi mãi"*.

**Gộp cả hai gọn hơn** — `&>` (bash) làm việc của `>file 2>&1` trong một token, khỏi lo thứ tự:

```bash
command ls existing.txt missing.txt &>out-both.txt
cat out-both.txt
```

```
ls: cannot access 'missing.txt': No such file or directory
existing.txt
```

### Ghi đè, append, đọc

`>` ghi đè (cắt file về rỗng rồi ghi); `>>` nối vào cuối; `<` nạp file làm stdin:

```bash
echo "dong 1" > log.txt
echo "dong 2" >> log.txt
cat log.txt
```

```
dong 1
dong 2
```

```bash
printf 'ba\nhai\nmot\n' > nums.txt
sort < nums.txt
```

```
ba
hai
mot
```

### Pipe và tee

`|` nối **stdout** của lệnh trái vào **stdin** của lệnh phải. `tee` xen giữa pipe: ghi ra file **và** đẩy tiếp xuống dòng:

```bash
printf 'apple\nbanana\napple\ncherry\n' | sort | uniq -c | tee counts.txt
```

```
      2 apple
      1 banana
      1 cherry
```

File `counts.txt` giữ y hệt bản đã lưu song song. Lưu ý pipe chỉ nối **stdout**; muốn lọc cả stderr qua pipe phải `2>&1 |` (hoặc `|&` trong bash).

### here-doc và here-string

here-doc `<<EOF ... EOF` nạp nhiều dòng làm stdin. Không nháy → có expand biến và `$(...)`:

```bash
cat <<EOF
Xin chao $USER
Hom nay la $(date +%Y-%m-%d)
EOF
```

```
Xin chao hoanggggf
Hom nay la 2026-08-05
```

Nháy delimiter `<<'EOF'` → **tắt** mọi expansion, nội dung nguyên văn:

```bash
cat <<'EOF'
Khong expand: $USER va $(date)
EOF
```

```
Khong expand: $USER va $(date)
```

here-string `<<<` nạp **một chuỗi** làm stdin — gọn hơn `echo ... |`:

```bash
wc -w <<< "mot hai ba bon nam"
```

```
5
```

## Trade-offs

- **`&>` gọn nhưng là bashism.** `&>file` và `|&` là mở rộng của bash/zsh; script `#!/bin/sh` (dash/POSIX) không có. Cần chạy được ở mọi shell thì viết dài `>file 2>&1`. Đổi lại độ dài lấy tính di động.
- **`>` ghi đè là một lần bấm mất dữ liệu.** `> quan-trong.log` xoá sạch file trước cả khi lệnh chạy. Muốn an toàn dùng `>>`; muốn chặn ghi đè bật `set -o noclobber` (rồi `>|` để cố tình ghi đè).
- **`tee` đổi một lần đọc lấy hai đích.** Vừa xem trên màn hình vừa lưu log rất tiện, nhưng thêm một process và một lần ghi đĩa. Với dữ liệu lớn qua pipe nóng, đó là chi phí thật.
- **here-string `<<<` thêm newline cuối.** Bash gắn một `\n` vào cuối here-string; lệnh nhạy byte (`wc -c`, hashing) sẽ đếm dư một byte so với `printf '%s'`.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| `cmd 2>&1 >file` (đảo thứ tự) | stderr vẫn ra terminal, file chỉ có stdout — **mất log lỗi** mà tưởng đã lưu |
| `cmd > file` rồi tưởng gộp cả lỗi | stderr chưa được chuyển, vẫn ra terminal — file thiếu nửa dữ liệu |
| `cmd &>file` trong script `#!/bin/sh` | dash không hiểu `&>`, hành vi khác lạ hoặc lỗi cú pháp |
| `> file.log` để "xem lại" trước khi chạy lệnh | file bị cắt rỗng ngay lập tức — mất nội dung cũ |
| `cmd 2>/dev/null` khi debug | nuốt luôn lỗi đang cần đọc — im lặng giả tạo, tưởng chạy tốt |
| Pipe qua `grep` rồi mất dòng lỗi | pipe chỉ nối stdout; stderr đi thẳng terminal, không qua bộ lọc, dễ bỏ sót |
| `cmd | tee log` để "bắt cả lỗi" | `tee` chỉ nhận stdout; muốn cả lỗi phải `cmd 2>&1 | tee log` |

## FAQ

<details>
<summary>`>/dev/null` có tắt luôn exit code lỗi không?</summary>

Không. Redirection chỉ chuyển hướng **dữ liệu**, không đụng exit code. Chạy thật ở trên: `command ls ... &>/dev/null` nuốt hết output nhưng `$?` vẫn là `2`. Muốn quyết định luồng theo thành/bại thì đọc exit code, đừng dựa vào việc có in gì ra hay không.

</details>

<details>
<summary>Khác nhau giữa `>` và `1>`?</summary>

Không có. `>` là viết tắt của `1>` — fd mặc định của output redirection là 1 (stdout). Viết `1>` chỉ để nhấn mạnh cho rõ khi đứng cạnh `2>`. Tương tự `<` là `0<`.

</details>

<details>
<summary>Vì sao `cmd 2>&1 | grep x` bắt được lỗi mà `cmd | grep x 2>&1` thì không?</summary>

Pipe nối stdout của `cmd` sang `grep`. `2>&1` phải đặt **trước** dấu `|`, ở phía `cmd`, để gộp stderr vào stdout **trước khi** dòng đó chảy vào pipe. Đặt `2>&1` sau `grep` là gộp stderr của **grep**, không phải của `cmd` — sai địa chỉ. Bash có lối gọn `cmd |& grep x` làm đúng việc gộp-rồi-pipe này.

</details>

<details>
<summary>here-doc và here-string chọn cái nào?</summary>

here-doc `<<EOF` cho khối **nhiều dòng** (config, đoạn SQL, thư). here-string `<<<` cho **một chuỗi ngắn** một dòng — thay cho `echo "..." |`, đỡ đẻ ra một process `echo`. Nhớ `<<<` thêm một newline cuối; nếu byte-count phải chính xác thì dùng `printf '%s' ... |`.

</details>

## Related Topics

- [Shell là gì](shell-la-gi.md)
- [Quoting và expansion](quoting-va-expansion.md)
- [Xử lý văn bản](../skills/text-processing.md)
- [Exit code và control flow](exit-code-va-control-flow.md)
- [Pipe nuốt exit code](../case-studies/pipe-nuot-exit-code.md)

## References

- Bash Reference Manual — [Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)
- POSIX Shell Command Language — [Redirection](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_07)
