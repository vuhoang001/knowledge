---
title: Process và job control
sidebar_position: 6
description: "Dấu & chỉ đẩy job xuống nền của shell hiện tại nên logout là nó chết — muốn sống dai phải nohup hoặc disown; kill mặc định là xin lịch sự, -9 là cưỡng bức."
tags: [process, job-control, signal, kill, nohup, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Process và job control

> **Chốt:** `cmd &` chỉ đẩy job xuống nền của **shell hiện tại** — job đó là con của shell, nên khi shell chết (logout, đóng terminal) nó nhận SIGHUP và chết theo. Muốn sống dai thì `nohup` hoặc `disown`. Còn `kill` mặc định gửi SIGTERM — *xin* process dừng, cho nó cơ hội dọn dẹp; `kill -9` gửi SIGKILL — cưỡng bức, không dọn được và không process nào chặn được. Luôn thử SIGTERM trước, `-9` là biện pháp cuối.

## Mục tiêu

Sau bài này bạn phân biệt được:

- **Foreground vs background**, `&`, `jobs`, `fg`, `bg`, và job number `%1` khác PID thế nào.
- Vì sao job nền **chết khi logout**, và hai cách giữ nó sống: `nohup` với `disown` khác nhau ở đâu.
- Xem process với `ps`, `pgrep`, `top`.
- Bốn signal cần thuộc — SIGTERM, SIGKILL, SIGHUP, SIGINT — và vì sao thứ tự thử là TERM trước, KILL sau.

## Tổng quan

Mỗi lệnh chạy là một **process**, định danh bằng **PID** (số toàn hệ thống). Khi bạn thêm `&`, shell chạy lệnh ở **background** và ghi nó vào **bảng job** của riêng shell đó — mỗi job có một **job number** dạng `%1`, `%2`, chỉ có nghĩa trong shell đang mở.

| Khái niệm | Phạm vi | Ví dụ tham chiếu |
|---|---|---|
| **PID** | Toàn hệ thống, mọi process | `kill 128505` |
| **Job number** | Chỉ shell hiện tại | `kill %1`, `fg %1` |

Đây là điểm hay nhầm: `%1` **không** phải PID. `%1` là "job thứ nhất trong shell này"; đóng shell là bảng job biến mất, `%1` vô nghĩa, nhưng process (nếu còn sống) vẫn giữ PID.

**Signal** là cách gửi tín hiệu cho process. `kill` không "giết" — nó *gửi signal*; tên lệnh gây hiểu lầm. Signal mặc định là SIGTERM (15), tức "xin dừng đi".

## Ví dụ

> Chạy thật 2026-08-05 · bash 5.3.9(1) trên Ubuntu. Coreutils ở máy này là uutils 0.8.0, không phải GNU — output có thể lệch nhỏ so với GNU coreutils.
> Nháp: `mkdir -p /tmp/bashlab-proc && cd /tmp/bashlab-proc`.

### Ví dụ xuyên suốt: đẩy nền → tìm PID → kill bằng job number

```bash
sleep 300 &          # đẩy xuống nền
jobs                 # liệt kê job của shell này
jobs -l              # kèm PID
ps -ef | grep '[s]leep 300'   # thấy PID toàn cục
kill %1              # gửi SIGTERM tới job %1
jobs                 # kiểm chứng đã dừng
```

Output thật:

```text
--- jobs ---
[1]+  Running                    sleep 300 &
--- jobs -l (PID) ---
[1]+ 124718 Running                    sleep 300 &
--- ps thay PID ---
hoanggg+  124718  124717  0 20:45 ?  00:00:00 sleep 300
--- kill %1 ---
--- jobs sau kill ---
[1]+  Terminated                 sleep 300
```

Đọc từng bước: `jobs` cho `[1]+ Running` — dấu `+` là job "hiện hành" (mặc định của `fg`/`bg`/`kill %` khi không ghi số). `jobs -l` lộ PID **124718**. `ps -ef` xác nhận cùng PID đó ở góc nhìn toàn hệ thống — cột thứ 3 (`124717`) là PPID, tức shell cha. `kill %1` gửi SIGTERM; `jobs` cuối in `Terminated` — job đã chết.

> **Mẹo `[s]leep`:** viết `grep '[s]leep 300'` thay vì `grep sleep` để chính dòng `grep` không tự khớp — ký tự lớp `[s]` khớp `s` nhưng chuỗi grep trong `ps` là `[s]leep` nên không self-match.

### `ps`: mặc định hẹp, `-ef` rộng

`ps` trần chỉ liệt kê process của **terminal hiện tại**. Các biến thể hay dùng:

| Lệnh | Cho gì |
|---|---|
| `ps` | Process của terminal này |
| `ps -ef` | **Mọi** process, đầy đủ (PID, PPID, lệnh) |
| `ps -u $USER` | Mọi process của bạn |
| `pgrep -a sleep` | Tìm nhanh theo tên, kèm dòng lệnh |

`pgrep` thật:

```text
$ pgrep -a sleep
127892 sleep 250
$ pgrep sleep        # chỉ PID
127892
```

### Foreground / background: `fg`, `bg`, Ctrl-Z, Ctrl-C

Bốn thao tác dưới đây là **tương tác, minh hoạ** (Ctrl-Z / Ctrl-C cần terminal thật, không chạy được trong môi trường không tương tác):

```text
$ sleep 300          # đang chạy foreground, chiếm terminal
^Z                   # Ctrl-Z: gửi SIGTSTP → job DỪNG (stopped), trả prompt
[1]+  Stopped        sleep 300
$ bg %1              # cho chạy tiếp ở BACKGROUND
$ fg %1              # kéo lại FOREGROUND
^C                   # Ctrl-C: gửi SIGINT tới job foreground → kết thúc
```

Phân biệt hai phím:

- **Ctrl-Z** = SIGTSTP → **dừng** (stopped, chưa chết). Dùng khi lỡ chạy foreground việc lâu, muốn tạm treo để làm việc khác rồi `bg`/`fg` sau.
- **Ctrl-C** = SIGINT → **ngắt** (thường là chết). Là "hủy việc đang chạy".

### Vì sao job nền chết khi logout — và cách giữ nó sống

Job nền là **con của shell**. Khi shell thoát, nó gửi **SIGHUP** (hangup) xuống các con → job nền chết theo. Hai cách thoát khỏi số phận đó:

**`disown` — gỡ job khỏi bảng của shell:**

```text
$ sleep 200 &
PID job: 127393
$ disown %1
jobs sau disown:
[bang job cua shell da rong]
```

Sau `disown`, `jobs` rỗng — shell không còn "sở hữu" nó nên lúc logout không gửi SIGHUP tới nó nữa. Nhưng vì đã gỡ khỏi bảng job, **không dùng `%1` được nữa** — muốn kill phải dùng PID.

**`nohup` — bọc từ đầu, bỏ qua SIGHUP + chuyển hướng output:**

```text
$ nohup sleep 240 >/dev/null 2>nohup.err &
nohup sleep 240, PID=128505 — bo qua SIGHUP, doc lap voi shell
$ ps -o pid,stat,comm -p 128505
    PID STAT COMMAND
 128505 S    sleep
```

`nohup` làm hai việc: đặt process **lờ SIGHUP**, và (vì tiến trình mất terminal) ghi output vào `nohup.out` nếu không chuyển hướng.

**Chọn cái nào:**

| Tình huống | Dùng |
|---|---|
| Biết trước sẽ chạy lâu, muốn thoát terminal | `nohup cmd &` (quyết định từ đầu) |
| Đã lỡ chạy `cmd &`, giờ muốn cứu nó | `disown %1` (cứu job đang chạy) |
| Cần chạy dai + xem lại được, quay lại được | `tmux` / `screen` (hơn cả hai — bài riêng) |

### Signal: SIGTERM vs SIGKILL — bằng chứng chạy thật

Số hiệu signal (chạy thật `kill -l TERM` v.v.):

| Signal | Số | Ý nghĩa | Chặn/trap được? |
|---|---|---|---|
| SIGHUP | 1 | Shell/terminal đóng | Có |
| SIGINT | 2 | Ctrl-C, ngắt | Có |
| SIGKILL | 9 | Cưỡng bức chết | **Không** |
| SIGTERM | 15 | Xin dừng (mặc định `kill`) | Có |

Vì SIGTERM **trap được**, process có thể lờ nó đi. Demo thật — một script `trap "..." TERM` từ chối chết khi nhận SIGTERM, nhưng SIGKILL thì bó tay:

```text
=== SIGTERM vs SIGKILL: process bat SIGTERM de tu choi dung ===
pid la 128514
gui SIGTERM (15):
process 128514 VAN SONG — no trap SIGTERM
gui SIGKILL (9) — khong the trap:
bash: line 27: 128514 Killed
process 128514 da chet
```

Đó chính là lý do quy trình chuẩn là: **`kill PID` (SIGTERM) trước** — cho process cơ hội đóng file, flush buffer, ghi log, xóa lock. Chỉ khi nó lì mới `kill -9 PID` (SIGKILL). Đảo ngược thứ tự = mất dữ liệu, để lại lock file, DB corrupt.

Các dạng gọi:

```bash
kill 128514        # = kill -15, gửi SIGTERM theo PID
kill -9 128514     # SIGKILL
kill %1            # theo job number
killall sleep      # theo TÊN (mọi process trùng tên)
pkill -f "sleep 300"   # theo pattern trong dòng lệnh đầy đủ
```

### `top` / `htop`

`top` (có sẵn) và `htop` (đẹp hơn, cần cài) là màn hình **tương tác** theo dõi CPU/RAM/PID theo thời gian thực; trong `top` gõ `k` rồi nhập PID để kill. Dùng để xem "cái gì đang ăn CPU"; không dán output ở đây vì nó tương tác và thay đổi liên tục.

## Trade-offs

| Lựa chọn | Được | Mất / cạm bẫy |
|---|---|---|
| `cmd &` | Nhanh, một ký tự | Chết khi logout; output vẫn đổ ra terminal |
| `nohup cmd &` | Sống qua logout, gom output vào file | Phải nhớ chuyển hướng, mất tương tác |
| `disown` | Cứu được job đã chạy | Mất `%n`, phải quản bằng PID |
| `tmux`/`screen` | Dai + quay lại được | Phải học công cụ, cài thêm |
| SIGTERM (`kill`) | Sạch, cho dọn dẹp | Process có thể phớt lờ / treo |
| SIGKILL (`-9`) | Chắc chắn chết | Không dọn được → lock, dữ liệu dở, zombie con |

## Common Mistakes

- **Nhầm `%1` với PID.** `kill 1` gửi tới **init/systemd** (PID 1) chứ không phải job 1 — cực nguy hiểm trên máy thật. Job number phải có `%`: `kill %1`.
- **Dùng `kill -9` phản xạ đầu tiên.** Cướp mất cơ hội dọn dẹp → lock file kẹt, ghi dở, con thành orphan. `-9` là **biện pháp cuối**.
- **Tưởng `cmd &` là chạy nền vĩnh viễn.** Không — nó gắn với shell, logout là chết. Muốn dai: `nohup`/`disown`/`tmux`.
- **`grep` tự khớp chính nó** trong `ps -ef | grep sleep` (thấy cả dòng grep). Dùng `grep '[s]leep'` hoặc `pgrep`.
- **`killall` khớp theo tên** → dễ giết nhầm nhiều process trùng tên. Kiểm bằng `pgrep -a name` trước khi bắn.
- **Quên output của `nohup`** đổ vào `nohup.out` giữa thư mục hiện tại nếu không chuyển hướng.

## FAQ

<details>
<summary>`kill %1` với `kill <PID>` khác gì? Khi nào phải dùng PID?</summary>

`%1` chỉ hiểu được trong **shell đang chạy job đó**. Sang terminal khác, hoặc sau khi `disown`, hoặc với process do người khác/tiến trình khác đẻ ra — `%1` vô nghĩa, phải dùng **PID** (số toàn hệ thống, lấy từ `ps`/`pgrep`/`jobs -l`/`$!`). `$!` là PID của lệnh nền **vừa chạy gần nhất**.

</details>

<details>
<summary>Vì sao SIGKILL không trap được còn SIGTERM thì được?</summary>

Kernel cố tình để SIGKILL (9) và SIGSTOP không thể bị process bắt, chặn hay lờ — nếu không thì một process lỗi/độc có thể tự làm mình bất tử. SIGTERM (15) thì process **được phép** cài handler (`trap`) để dọn dẹp rồi mới thoát — đó là tính năng, không phải lỗ hổng. Cái giá: process có thể lạm dụng để phớt lờ SIGTERM, nên mới cần `-9` dự phòng.

</details>

<details>
<summary>`nohup` hay `disown` — chọn thế nào cho đúng?</summary>

Quyết theo thời điểm: **biết trước** sẽ chạy lâu và rời terminal → `nohup cmd &` ngay từ đầu (được bonus gom output vào file). **Đã lỡ** gõ `cmd &` rồi mới nhận ra cần thoát → `disown %1` để gỡ nó khỏi bảng job, khỏi ăn SIGHUP. Cả hai đều không cho bạn *quay lại* xem tiến trình — cần thế thì dùng `tmux`/`screen`.

</details>

<details>
<summary>Job của tôi "Stopped" chứ không "Running" — nghĩa là gì?</summary>

`Stopped` = process bị **dừng** (thường do Ctrl-Z gửi SIGTSTP), còn sống nhưng không được cấp CPU. Cho chạy tiếp: `bg %1` (chạy nền) hoặc `fg %1` (kéo lên foreground). Đừng nhầm với `Terminated`/`Done` — đó mới là đã chết.

</details>

## Related Topics

- [Shell là gì](shell-la-gi.md)
- [Exit code và control flow](exit-code-va-control-flow.md)
- [File permissions](file-permissions.md)
- [Viết script an toàn](../skills/viet-script-an-toan.md)
- [Cheatsheet lệnh bash](../cheatsheets/commands.md)

## References

- `man 7 signal` — danh sách signal và ngữ nghĩa.
- `man kill`, `man ps`, `man pgrep`, `help jobs` (builtin của bash).
- `man nohup`, `help disown`.
