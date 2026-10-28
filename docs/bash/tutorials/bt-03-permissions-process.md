---
title: "Bộ 3 — File permissions và process control"
sidebar_position: 7
description: "10 bài tự chấm: chmod octal, umask, background job, wait, kill -TERM, trap bắt signal, PPID — mỗi bài có đáp số thật từ máy chạy."
tags: [tutorial, bash, permissions, process]
domain: devops
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Bộ 3 — File permissions và process control

> **Chạy thật 2026-10-28** — bash 5.x, GNU coreutils, trên Linux. `verified_at` để
> trống. PID trong đáp số là PID thật của máy lúc viết — PID của bạn sẽ khác, phần còn
> lại phải khớp.

Yêu cầu: đã làm [Bộ 1](bt-01-nen-tang.md). Lý thuyết:
[File permissions](../reference/file-permissions.md),
[Process và job control](../reference/process-va-job-control.md).

## Câu 1 — permission mặc định của file mới

```bash
touch demo.txt
ls -l demo.txt | awk '{print $1}'
```

**Đáp số:**

```text
-rw-rw-r--
```

<details>
<summary>Lời giải</summary>

File mới **không bao giờ** có bit execute mặc định (khác thư mục). Ba nhóm quyền
`rw-|rw-|r--` là `666` (mặc định hệ thống) đã bị `umask` của máy này trừ đi — máy có
`umask 002` thì group giữ được quyền write; `umask 022` sẽ ra `-rw-r--r--`.

</details>

## Câu 2 — `chmod` bằng số octal

```bash
chmod 644 demo.txt; ls -l demo.txt | awk '{print $1}'
chmod 755 demo.txt; ls -l demo.txt | awk '{print $1}'
```

**Đáp số:**

```text
-rw-r--r--
-rwxr-xr-x
```

<details>
<summary>Lời giải</summary>

Mỗi chữ số octal là tổng của `r=4, w=2, x=1` cho một trong ba nhóm (owner/group/other).
`644` = owner `rw-` (6), group `r--` (4), other `r--` (4). `755` = owner `rwx` (7),
group/other `r-x` (5) — thêm execute cho tất cả, vẫn giữ read, bỏ write ở group/other.

</details>

## Câu 3 — `chmod` ký hiệu, chỉ đổi owner

```bash
chmod u+x demo.txt
ls -l demo.txt | awk '{print $1}'
```

**Đáp số:**

```text
-rwxr-xr-x
```

<details>
<summary>Lời giải</summary>

`u+x` chỉ thêm execute cho **owner**, không đụng tới group/other — khác `chmod +x` (
không ký hiệu nhóm) sẽ thêm execute cho **cả ba** nhóm cùng lúc theo `umask` hiện tại.

</details>

## Câu 4 — `umask` quyết định permission của file mới tạo ra sao

```bash
(umask 022; touch newfile_022.txt; ls -l newfile_022.txt | awk '{print $1}')
(umask 077; touch newfile_077.txt; ls -l newfile_077.txt | awk '{print $1}')
```

**Đáp số:**

```text
-rw-r--r--
-rw-------
```

<details>
<summary>Lời giải</summary>

`umask` là **mặt nạ trừ bit**, không phải permission trực tiếp: permission cuối =
`666` (mặc định file) **AND NOT** umask, theo từng bit. `umask 022` trừ write của
group/other → `644`. `umask 077` trừ sạch group/other → `600`. Dùng subshell `( ... )`
để đổi `umask` tạm thời, không ảnh hưởng shell cha.

</details>

## Câu 5 — chạy nền và `jobs`

```bash
sleep 3 &
echo "PID vua tao: $!"
jobs
```

**Đáp số (PID là ví dụ, của bạn sẽ khác):**

```text
PID vua tao: 628724
[1]+  Running                 sleep 3 &
```

<details>
<summary>Lời giải</summary>

`&` đưa lệnh chạy **nền**, trả lại quyền điều khiển terminal ngay. `$!` là PID của
tiến trình nền **vừa tạo gần nhất**. `jobs` liệt kê các job nền của **session shell
hiện tại** — số `[1]` là job number, khác PID.

</details>

## Câu 6 — `wait` một PID cụ thể

```bash
sleep 3 &
PID=$!
wait $PID
echo "job xong, exit=$?"
```

**Đáp số:**

```text
job xong, exit=0
```

<details>
<summary>Lời giải</summary>

`wait $PID` chặn shell hiện tại cho tới khi đúng tiến trình đó kết thúc, và `$?` sau
`wait` là **exit code của tiến trình được wait**, không phải của `wait` bản thân nó.
`sleep` luôn thành công nên `exit=0`.

</details>

## Câu 7 — `kill -TERM` và kiểm tra tiến trình còn sống

```bash
sleep 10 &
PID=$!
sleep 0.3
kill -TERM "$PID"
sleep 0.3
if kill -0 "$PID" 2>/dev/null; then echo "van con song"; else echo "da chet"; fi
```

**Đáp số:**

```text
da chet
```

<details>
<summary>Lời giải</summary>

`kill -TERM` (signal mặc định của `kill`, số 15) yêu cầu tiến trình **tự thoát gọn
gàng** — `sleep` không có handler riêng nên thoát ngay. `kill -0` là mẹo kiểm tra tồn
tại: nó **không gửi signal nào thật**, chỉ trả về thành/bại tuỳ PID đó còn tồn tại và
bạn có quyền gửi signal tới nó hay không.

</details>

## Câu 8 — `trap` bắt `SIGTERM` để dọn dẹp trước khi thoát

```bash
bash -c '
trap "echo TRAP_HIT; exit 42" TERM
sleep 5 &
CPID=$!
kill -TERM $$
wait $CPID
'
echo "exit cua subshell=$?"
```

**Đáp số:**

```text
TRAP_HIT
exit cua subshell=42
```

<details>
<summary>Lời giải</summary>

`trap "lệnh" TERM` đăng ký một handler: khi process nhận `SIGTERM`, nó chạy `lệnh` đó
**thay vì** hành vi mặc định (thoát ngay, không kịp dọn dẹp). `$$` là PID của chính
shell hiện tại — `kill -TERM $$` tự gửi signal cho bản thân để demo. Đây là cơ chế
đứng sau mọi script "dọn file tạm trước khi exit" dù bị `Ctrl+C` hay bị `kill`.

</details>

## Câu 9 — chạy nền rồi `disown`, tiến trình sống độc lập khỏi shell

```bash
( sleep 1; echo "con chay xong" > /tmp/q9.out ) &
disown
sleep 1.3
cat /tmp/q9.out
```

**Đáp số:**

```text
con chay xong
```

<details>
<summary>Lời giải</summary>

`disown` xoá job khỏi bảng job của shell hiện tại — shell không còn "chịu trách
nhiệm" quản lý nó (không tự động `SIGHUP` nó khi shell thoát). Đây là ý tưởng nền của
`nohup`: tách tiến trình con khỏi vòng đời của shell cha, để nó sống tiếp dù terminal
đóng.

</details>

## Câu 10 — PID và PPID

```bash
bash -c 'echo "PID=$$ PPID=$PPID"'
```

**Đáp số (số thật tuỳ máy, nhưng PPID phải khác PID, và PPID phải là shell đang gọi lệnh này):**

```text
PID=631009 PPID=628702
```

<details>
<summary>Lời giải</summary>

`$$` là PID của **chính process bash đang chạy đoạn script đó**. `$PPID` là PID của
**process cha** — ở đây là shell/terminal đã gọi `bash -c`. Mọi tiến trình trên Linux
(trừ `init`/PID 1) đều có đúng một cha, tạo thành cây tiến trình mà `ps --forest` vẽ ra
được.

</details>

## Related Topics

- [File permissions](../reference/file-permissions.md) · [Process và job control](../reference/process-va-job-control.md) — lý thuyết cho bộ này
- [Bộ 2 — Quoting và expansion](bt-02-quoting-expansion.md) · [Bộ 4 — Text processing](bt-04-text-processing.md)
- [Bài tập — Bash](index.md) — mục lục bộ bài tập
