---
title: File permissions
sidebar_position: 5
description: "Quyền là ba nhóm rwx cho user/group/other — đọc được -rwxr-xr-x và đổi bằng octal là đủ chín phần mười công việc."
tags: [permissions, chmod, chown, umask, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# File permissions

> **Chốt:** Mỗi file có ba nhóm quyền — user (owner), group, other — mỗi nhóm ba bit `rwx`. Đọc được chuỗi `-rwxr-xr-x` trong `ls -l` và đổi bằng octal (`chmod 644`) là xong chín phần mười công việc. Cái bẫy hay nhất: `x` trên **thư mục** không phải "chạy" mà là "được đi vào".

## Mục tiêu

- Nhìn `-rwxr-xr-x` là bóc ra ngay: loại gì, ai đọc/ghi/chạy được.
- Đổi quyền bằng cả hai kiểu: octal (`chmod 755`) và symbolic (`chmod u+x`).
- Hiểu vì sao file mới mặc định không cho ghi bởi mọi người (`umask`), và vì sao `chmod 777` gần như luôn là dấu hiệu làm sai.
- Phân biệt `x` trên file với `x` trên thư mục — chỗ nhầm kinh điển.

## Tổng quan

Chuỗi 10 ký tự đầu dòng của `ls -l`, ví dụ `-rwxr-xr-x`, tách thành:

```
-      rwx        r-x        r-x
loại   user       group      other
```

- **Ký tự đầu — loại đối tượng:** `-` file thường · `d` directory · `l` symlink (còn `c`, `b`, `s`, `p` cho device/socket/pipe, ít gặp).
- **Ba nhóm ba bit còn lại** — theo thứ tự **user → group → other**:
  - `r` (read) = 4
  - `w` (write) = 2
  - `x` (execute) = 1
  - `-` = bit đó tắt.

Cộng ba bit trong một nhóm ra một chữ số octal. Ba nhóm ra ba chữ số:

| Octal | Chuỗi | Nghĩa | Dùng cho |
|---|---|---|---|
| `644` | `rw-r--r--` | owner đọc+ghi, còn lại chỉ đọc | file dữ liệu, config thường |
| `600` | `rw-------` | chỉ owner đọc+ghi | secret, SSH key, `.env` |
| `755` | `rwxr-xr-x` | owner làm tất, còn lại đọc+chạy | script, chương trình, thư mục dùng chung |
| `700` | `rwx------` | chỉ owner, toàn quyền | thư mục/script riêng tư |

Nhớ mẹo: `7=rwx`, `6=rw-`, `5=r-x`, `4=r--`, `0=---`.

**`x` trên thư mục KHÁC hẳn `x` trên file.** Trên file, `x` = "được thực thi như chương trình". Trên thư mục, `x` = "được **đi vào / truy cập** vào bên trong" (traverse). Không có `x` trên thư mục thì dù có `r` bạn cũng không đọc được nội dung file bên trong, không `cd` được vào. Xem [Ví dụ](#ví-dụ).

## Ví dụ

*Chạy thật 2026-08-05 · bash 5.3.9(1) trên Ubuntu. Coreutils ở máy này là uutils 0.8.0, không phải GNU — output có thể lệch nhỏ so với GNU coreutils.*
Box này có alias `ls`→`lsd` nên phải gọi `command ls -l` để lấy định dạng `-rwxr-xr-x` chuẩn coreutils.

### chmod bằng octal

```bash
$ touch data.csv
$ command ls -l data.csv
-rw-rw-r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod 644 data.csv; command ls -l data.csv
-rw-r--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod 600 data.csv; command ls -l data.csv
-rw------- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod 755 data.csv; command ls -l data.csv
-rwxr-xr-x 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod 700 data.csv; command ls -l data.csv
-rwx------ 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv
```

Một lệnh `chmod 644` đặt **cả ba nhóm cùng lúc** — đây là lý do octal nhanh và không mơ hồ khi bạn muốn đặt trạng thái tuyệt đối.

### chmod bằng symbolic

Symbolic sửa **tương đối** (thêm/bớt so với hiện tại), dễ đọc khi chỉ muốn động một bit:

```bash
$ chmod 644 data.csv; command ls -l data.csv
-rw-r--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod u+x data.csv; command ls -l data.csv     # thêm x cho user
-rwxr--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod go-r data.csv; command ls -l data.csv     # bỏ r của group + other
-rwx------ 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod a+r data.csv; command ls -l data.csv       # a = all, thêm r cho mọi nhóm
-rwxr--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv
```

Cú pháp: `[ugoa][+-=][rwx]`. `u`=user, `g`=group, `o`=other, `a`=all. `+` thêm, `-` bớt, `=` đặt đúng bằng.

### Ví dụ xuyên suốt: script không chạy vì thiếu execute bit

Đây là tình huống gặp mỗi ngày. Vừa tạo một script, chạy thì báo "permission denied".

```bash
$ cat > hello.sh <<'EOF'
#!/usr/bin/env bash
echo "hello tu script"
EOF

$ command ls -l hello.sh
-rw-rw-r-- 1 hoanggggf hoanggggf 43 Aug  5 20:48 hello.sh
```

Không có ký tự `x` nào — file không được đánh dấu là chạy được. Thử chạy:

```bash
$ ./hello.sh
(eval):9: permission denied: ./hello.sh
[exit code: 126]
```

**Exit code 126 = "tìm thấy lệnh nhưng không có quyền chạy"** (khác 127 = "không tìm thấy lệnh"). Sửa bằng cách bật execute bit rồi chạy lại:

```bash
$ chmod +x hello.sh
$ command ls -l hello.sh
-rwxrwxr-x 1 hoanggggf hoanggggf 43 Aug  5 20:48 hello.sh

$ ./hello.sh
hello tu script
```

Giờ đã có `x` ở cả ba nhóm và script chạy. (Muốn chỉ owner chạy được thì dùng `chmod u+x` thay vì `chmod +x`.)

### Execute bit trên THƯ MỤC nghĩa là "được đi vào"

Bỏ `x` của một thư mục và xem điều gì xảy ra dù file bên trong vẫn `r`:

```bash
$ mkdir -p vault && echo "bi mat" > vault/secret.txt
$ chmod 644 vault          # rw-r--r--: thư mục KHÔNG còn x
$ command ls -ld vault
drw-r--r-- 2 hoanggggf hoanggggf 60 Aug  5 20:48 vault

$ cat vault/secret.txt
cat: vault/secret.txt: Permission denied
```

Không có `x` trên thư mục thì không **truy cập** được file bên trong — dù bản thân file cho đọc. Trả lại `x`:

```bash
$ chmod 755 vault
$ command ls -ld vault
drwxr-xr-x 2 hoanggggf hoanggggf 60 Aug  5 20:48 vault

$ cat vault/secret.txt
bi mat
```

Rút ra: với thư mục, `r` = "liệt kê được tên file", `x` = "đi vào / truy cập được đường dẫn bên trong". Muốn dùng thư mục bình thường bạn cần **cả hai**; thiếu `x` là cụt.

### umask: vì sao file mới không phải 666

File mới về lý thuyết bắt đầu từ `666` (`rw-rw-rw-`, không bao giờ có `x` khi tạo mới), thư mục từ `777`. `umask` là mặt nạ **tắt bớt** bit:

```bash
$ umask
002

$ touch file-002.txt
$ command ls -l file-002.txt
-rw-rw-r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 file-002.txt   # 666 - 002 = 664
```

Đổi umask sang `022` (mặc định phổ biến trên nhiều bản Linux) thì file mới ra `644`:

```bash
$ umask 022
$ touch file-022.txt
$ command ls -l file-022.txt
-rw-r--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 file-022.txt   # 666 - 022 = 644

$ mkdir dir-022
$ command ls -ld dir-022
drwxr-xr-x 2 hoanggggf hoanggggf 40 Aug  5 20:48 dir-022        # 777 - 022 = 755
```

`umask 022` là lý do file mới thường ra `644` chứ không `666`: nó **tắt bit write của group và other** cho mọi file mới. Đây là hàng rào mặc định để bạn không vô tình tạo file ai cũng ghi được.

### chown: đổi owner (thường cần root)

`chown user:group file` đổi chủ sở hữu. Đổi **sang user khác** cần root — không chạy được ở đây, số minh hoạ:

```bash
# cần root, số minh hoạ, chưa chạy
$ sudo chown alice:developers data.csv
```

Đổi về **chính mình** thì không cần root, chạy được thật:

```bash
$ touch owned.txt
$ command ls -l owned.txt
-rw-rw-r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 owned.txt

$ chown "$(whoami)":"$(id -gn)" owned.txt
$ command ls -l owned.txt
-rw-rw-r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 owned.txt       # owner/group giu nguyen hoanggggf
```

## Trade-offs

- **Octal vs symbolic.** Octal (`chmod 644`) đặt trạng thái **tuyệt đối** — nhanh, không mơ hồ, dễ dùng trong script vì kết quả không phụ thuộc quyền cũ. Symbolic (`chmod u+x`) sửa **tương đối** — đọc rõ ý định khi chỉ động một bit, nhưng kết quả phụ thuộc trạng thái hiện tại. Dùng octal khi muốn "đặt đúng thế này", symbolic khi muốn "thêm/bớt đúng cái này".
- **umask chặt vs lỏng.** `022` an toàn (không ai ngoài owner ghi được) nhưng khi làm việc nhóm trên thư mục chung, group không ghi được file bạn tạo — phải chỉnh tay. `002` cho group ghi (tiện team) nhưng lỏng hơn. Chọn theo bối cảnh, đừng để mặc định quyết hộ.
- **`chmod +x` cho mọi người vs `u+x` cho riêng owner.** `+x` (không nêu nhóm) bật execute cho cả group và other — thường thừa. Script riêng chỉ cần `u+x`.

## Common Mistakes

- **`chmod 777` để "cho nó chạy".** `777` = `rwxrwxrwx` = ai cũng đọc/ghi/chạy được → không còn bảo vệ nào. Bất kỳ user/process nào trên máy cũng sửa hoặc thay được file. Gần như luôn là dấu hiệu chẩn sai vấn đề: cái bạn cần thường chỉ là `+x` cho một file, hoặc `x` cho một thư mục, không phải mở toang cho cả thế giới. Nếu định gõ `777`, dừng lại hỏi "ai thực sự cần ghi?".
- **Quên `x` trên thư mục.** Cấp `r` cho thư mục mà quên `x` → liệt kê được tên nhưng không mở được file nào bên trong. Thư mục dùng được cần cả `r` lẫn `x`.
- **Nhầm 126 với 127.** Chạy `./script.sh` báo permission denied (exit 126) là **thiếu execute bit** — `chmod +x`. Exit 127 là **không tìm thấy lệnh** (sai đường dẫn / chưa cài) — hoàn toàn khác, đừng đi chmod.
- **`chmod` đệ quy nhầm lên thư mục.** `chmod -R 644 thumuc/` bỏ `x` của **cả các thư mục con** → không đi vào được nữa. Với cây thư mục hỗn hợp, dùng `find thumuc -type f -exec chmod 644 {} +` và `find thumuc -type d -exec chmod 755 {} +` để tách file và thư mục.
- **Sửa quyền khi vấn đề là owner.** Không ghi được file không phải lúc nào cũng do `w` — có khi file thuộc user khác. Đọc kỹ cột owner/group trong `ls -l` trước khi `chmod`.

## FAQ

<details>
<summary>chmod với chown khác nhau chỗ nào?</summary>

`chmod` đổi **quyền** (`rwx` — ai được làm gì). `chown` đổi **chủ sở hữu** (owner/group — *ai* là user/group đó). Chúng phối hợp: quyền `rw-` của nhóm "user" chỉ có nghĩa khi bạn biết owner là ai. Đổi quyền hầu như không cần root; đổi owner sang người khác thì cần.

</details>

<details>
<summary>Vì sao file mới không bao giờ có execute bit dù umask lỏng?</summary>

Điểm xuất phát khi tạo file là `666` chứ không `777` — hệ thống cố tình **không** cấp `x` cho file mới, bất kể umask. Đó là lý do bạn luôn phải `chmod +x` thủ công cho script mới. Chỉ thư mục mới xuất phát từ `777` (có `x`), vì thư mục cần `x` để truy cập được.

</details>

<details>
<summary>Số thứ tư trong chmod (như 4755, 2755, 1777) là gì?</summary>

Chữ số đứng trước ba số quyền là **special bits**: `4`=setuid, `2`=setgid, `1`=sticky bit. Ví dụ `1777` trên `/tmp` là sticky bit — ai cũng ghi được nhưng chỉ owner của từng file mới xoá được file đó. setuid/setgid làm chương trình chạy với quyền của owner/group file, là chủ đề riêng và là bề mặt tấn công cần cẩn trọng — dùng khi thật hiểu.

</details>

<details>
<summary>Đọc nhanh `-rwxr-xr-x` thành octal thế nào?</summary>

Chia làm ba cụm sau ký tự loại: `rwx`=4+2+1=7, `r-x`=4+0+1=5, `r-x`=5. Ghép lại: `755`. Ngược lại, `644` → tách `6=rw-`, `4=r--`, `4=r--` → `rw-r--r--`. Làm vài lần là thuộc bảng `7=rwx / 6=rw- / 5=r-x / 4=r--`.

</details>

## Related Topics

- [Shell là gì](shell-la-gi.md)
- [Process và job control](process-va-job-control.md)
- [Viết script an toàn](../skills/viet-script-an-toan.md)
- [Cheatsheet lệnh bash](../cheatsheets/commands.md)

## References

- `man chmod`, `man chown`, `man umask` — trang man GNU coreutils.
- `info coreutils 'File permissions'` — chương chi tiết về mô hình quyền.
