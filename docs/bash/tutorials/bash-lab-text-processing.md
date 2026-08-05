---
title: 'Lab: xử lý văn bản bằng pipeline'
sidebar_position: 1
description: "Bài lab chạy thật trên một access.log mẫu — grep, awk, sort, uniq ghép thành pipeline trả lời câu hỏi thật, có output dán lại."
tags: [tutorial, text-processing, awk, grep, bash]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Lab: xử lý văn bản bằng pipeline

> **Chốt:** Luyện ghép `grep | awk | sort | uniq -c | sort -rn | head` thành một pipeline trả lời câu hỏi thật trên một access log — mỗi lệnh làm một việc, dấu `|` nối output của lệnh này thành input của lệnh sau.

## Mục tiêu

Sau lab này bạn làm được:

- Đếm dòng bằng `wc -l`, tách cột bằng `awk '{print $N}'`.
- Dựng idiom kinh điển "đếm rồi xếp hạng": `sort | uniq -c | sort -rn | head`.
- Lọc dòng theo điều kiện bằng cả `grep` (khớp text) lẫn `awk` (so sánh số).
- Cộng dồn một cột số bằng `awk '{sum+=$N} END{print sum}'`.

## Chuẩn bị dữ liệu

Tạo thư mục nháp và một `access.log` mẫu 18 dòng, format `IP - - [date] "GET /path" status bytes`:

```bash
mkdir -p /tmp/bashlab-tut-text && cd /tmp/bashlab-tut-text
cat > access.log <<'EOF'
10.0.0.1 - - [05/Aug/2026:10:00:01 +0700] "GET /index.html" 200 1024
10.0.0.2 - - [05/Aug/2026:10:00:03 +0700] "GET /about.html" 200 512
10.0.0.1 - - [05/Aug/2026:10:00:05 +0700] "GET /style.css" 200 256
192.168.1.5 - - [05/Aug/2026:10:00:07 +0700] "GET /login" 401 128
10.0.0.1 - - [05/Aug/2026:10:00:09 +0700] "GET /missing" 404 64
10.0.0.3 - - [05/Aug/2026:10:00:11 +0700] "GET /index.html" 200 1024
192.168.1.5 - - [05/Aug/2026:10:00:13 +0700] "GET /admin" 403 96
10.0.0.1 - - [05/Aug/2026:10:00:15 +0700] "GET /api/data" 500 0
10.0.0.2 - - [05/Aug/2026:10:00:17 +0700] "GET /about.html" 200 512
10.0.0.1 - - [05/Aug/2026:10:00:19 +0700] "GET /index.html" 200 1024
10.0.0.4 - - [05/Aug/2026:10:00:21 +0700] "GET /contact" 200 300
192.168.1.5 - - [05/Aug/2026:10:00:23 +0700] "GET /secret" 404 64
10.0.0.1 - - [05/Aug/2026:10:00:25 +0700] "GET /style.css" 200 256
10.0.0.3 - - [05/Aug/2026:10:00:27 +0700] "GET /api/data" 500 0
10.0.0.2 - - [05/Aug/2026:10:00:29 +0700] "GET /index.html" 200 1024
10.0.0.1 - - [05/Aug/2026:10:00:31 +0700] "GET /logout" 302 48
192.168.1.5 - - [05/Aug/2026:10:00:33 +0700] "GET /admin" 403 96
10.0.0.4 - - [05/Aug/2026:10:00:35 +0700] "GET /contact" 200 300
EOF
cat access.log
```

Chạy thật 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0, GNU awk 5.3.2, GNU sed 4.9.

```
10.0.0.1 - - [05/Aug/2026:10:00:01 +0700] "GET /index.html" 200 1024
10.0.0.2 - - [05/Aug/2026:10:00:03 +0700] "GET /about.html" 200 512
10.0.0.1 - - [05/Aug/2026:10:00:05 +0700] "GET /style.css" 200 256
192.168.1.5 - - [05/Aug/2026:10:00:07 +0700] "GET /login" 401 128
10.0.0.1 - - [05/Aug/2026:10:00:09 +0700] "GET /missing" 404 64
10.0.0.3 - - [05/Aug/2026:10:00:11 +0700] "GET /index.html" 200 1024
192.168.1.5 - - [05/Aug/2026:10:00:13 +0700] "GET /admin" 403 96
10.0.0.1 - - [05/Aug/2026:10:00:15 +0700] "GET /api/data" 500 0
10.0.0.2 - - [05/Aug/2026:10:00:17 +0700] "GET /about.html" 200 512
10.0.0.1 - - [05/Aug/2026:10:00:19 +0700] "GET /index.html" 200 1024
10.0.0.4 - - [05/Aug/2026:10:00:21 +0700] "GET /contact" 200 300
192.168.1.5 - - [05/Aug/2026:10:00:23 +0700] "GET /secret" 404 64
10.0.0.1 - - [05/Aug/2026:10:00:25 +0700] "GET /style.css" 200 256
10.0.0.3 - - [05/Aug/2026:10:00:27 +0700] "GET /api/data" 500 0
10.0.0.2 - - [05/Aug/2026:10:00:29 +0700] "GET /index.html" 200 1024
10.0.0.1 - - [05/Aug/2026:10:00:31 +0700] "GET /logout" 302 48
192.168.1.5 - - [05/Aug/2026:10:00:33 +0700] "GET /admin" 403 96
10.0.0.4 - - [05/Aug/2026:10:00:35 +0700] "GET /contact" 200 300
```

Mỗi dòng có các cột (tách theo khoảng trắng): `$1` = IP, `$7` = `"GET`... — thực ra `$6="GET`, `$7=/path"`, `$(NF-1)` = status, `$NF` = bytes. Dùng `$(NF-1)` và `$NF` để đếm từ cuối lên thì không sợ path có khoảng trắng làm lệch số cột.

## Bài 1 — Tổng số request là bao nhiêu?

Mỗi request là một dòng, nên đếm dòng là xong. `< access.log` để `wc` không in kèm tên file:

```bash
wc -l < access.log
```

```
18
```

Đúng bằng số dòng ta vừa tạo. Nếu gõ `wc -l access.log` (không redirect) thì output sẽ là `18 access.log` — thừa tên file.

## Bài 2 — IP nào gọi nhiều nhất?

Đây là idiom "đếm rồi xếp hạng". Tách cột IP (`$1`), `sort` để gom các dòng giống nhau kề nhau, `uniq -c` đếm mỗi nhóm, rồi `sort -rn` xếp giảm dần theo số:

```bash
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head
```

```
      7 10.0.0.1
      4 192.168.1.5
      3 10.0.0.2
      2 10.0.0.4
      2 10.0.0.3
```

`uniq -c` **bắt buộc** phải có `sort` đứng trước vì nó chỉ gộp các dòng trùng **liền kề**. `sort -rn`: `-n` so sánh theo số (không thì `10` xếp trước `7`), `-r` đảo ngược để lớn nhất lên đầu.

## Bài 3 — Mỗi status code xuất hiện mấy lần?

Cùng idiom, chỉ đổi cột. Status là cột áp chót, lấy bằng `$(NF-1)`:

```bash
awk '{print $(NF-1)}' access.log | sort | uniq -c | sort -rn
```

```
     10 200
      2 500
      2 404
      2 403
      1 401
      1 302
```

`NF` là số cột của dòng hiện tại, `$(NF-1)` là cột kế cuối — cách này miễn nhiễm với path dài ngắn khác nhau. 10 request thành công, 6 lỗi, 1 redirect, 1 xác thực (401).

## Bài 4 — Chỉ các request lỗi (4xx và 5xx)

Hai cách, chọn theo nhu cầu.

**Cách grep** — khớp status 4xx/5xx bằng regex ở gần cuối dòng (` [45]` + 2 chữ số + khoảng trắng + bytes cuối dòng):

```bash
grep -E ' [45][0-9]{2} [0-9]+$' access.log
```

```
192.168.1.5 - - [05/Aug/2026:10:00:07 +0700] "GET /login" 401 128
10.0.0.1 - - [05/Aug/2026:10:00:09 +0700] "GET /missing" 404 64
192.168.1.5 - - [05/Aug/2026:10:00:13 +0700] "GET /admin" 403 96
10.0.0.1 - - [05/Aug/2026:10:00:15 +0700] "GET /api/data" 500 0
192.168.1.5 - - [05/Aug/2026:10:00:23 +0700] "GET /secret" 404 64
10.0.0.3 - - [05/Aug/2026:10:00:27 +0700] "GET /api/data" 500 0
192.168.1.5 - - [05/Aug/2026:10:00:33 +0700] "GET /admin" 403 96
```

**Cách awk** — so sánh số trực tiếp (`status >= 400`), gọn hơn khi muốn lọc theo ngưỡng, và tiện in đúng cột cần. `gsub` xoá dấu `"` còn dính ở path:

```bash
awk '$(NF-1) >= 400 {gsub(/"/, "", $7); print $1, $7, $(NF-1)}' access.log
```

```
192.168.1.5 /login 401
10.0.0.1 /missing 404
192.168.1.5 /admin 403
10.0.0.1 /api/data 500
192.168.1.5 /secret 404
10.0.0.3 /api/data 500
192.168.1.5 /admin 403
```

`grep` khớp text nên nhanh và ngắn khi điều kiện là "chứa mẫu này"; `awk` hiểu số nên tự nhiên hơn với "cột này ≥ 400" và còn chọn được cột để in ra.

## Bài 5 — Tổng số bytes đã phục vụ

Cột bytes là `$NF` (cột cuối). Cộng dồn vào biến `sum`, in ở khối `END` sau khi đọc hết file:

```bash
awk '{sum += $NF} END {print sum}' access.log
```

```
6728
```

`sum` mặc định bằng 0 khi chưa gán, nên không cần khởi tạo. `END{}` chạy đúng một lần, sau dòng cuối — đó là chỗ để in kết quả tổng hợp.

## Tự kiểm

Tự dựng pipeline trả lời, rồi mở đáp án đối chiếu.

1. Có bao nhiêu request trả về **đúng** status 404?
2. IP `192.168.1.5` gọi tổng cộng mấy request?
3. Bytes trung bình của riêng các request status 200 là bao nhiêu?

<details>
<summary>Đáp án</summary>

```bash
# 1) chi status == 404
awk '$(NF-1) == 404' access.log | wc -l
# -> 2

# 2) request cua mot IP cu the (^ neo dau dong de khong khop nham)
grep -c '^192.168.1.5 ' access.log
# -> 4

# 3) bytes trung binh cua request 200: cong don roi chia so dong
awk '$(NF-1) == 200 {sum += $NF; n++} END {print sum/n}' access.log
# -> 623.2
```

Câu 3 đọc là: chỉ với dòng status 200 mới cộng bytes vào `sum` và tăng bộ đếm `n`; cuối cùng in `sum/n`. Có 10 request 200, tổng 6232 bytes → trung bình 623.2.

</details>

## Related Topics

- [Xử lý văn bản bằng pipeline](../skills/text-processing.md)
- [Streams và redirection](../reference/streams-va-redirection.md)
- [Lab: script đầu tiên](bash-lab-first-script.md)
- [Cheatsheet lệnh bash](../cheatsheets/commands.md)
