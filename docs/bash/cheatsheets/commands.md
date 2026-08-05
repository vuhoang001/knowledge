---
title: Cheatsheet lệnh bash
sidebar_position: 1
description: "Bảng tra nhanh lệnh bash theo nhóm — file, văn bản, hệ thống, mạng, job, redirect và phím tắt dòng lệnh."
tags: [cheatsheet, commands, bash]
domain: devops
category: tool
doc_type: cheatsheet
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Cheatsheet lệnh bash

> **Chốt:** Đây là bảng tra khi đang gõ lệnh — cú pháp cốt lõi + một dòng để làm gì. Học sâu cơ chế thì sang `reference/` và `skills/`.

## Thao tác file

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `cat` | `cat f1 f2` | Nối và in nội dung file. File lớn dùng `less` thay vì `cat`. |
| `cp` | `cp -r src/ dst/` | Copy; `-r` cho thư mục, `-a` giữ nguyên metadata, `-i` hỏi trước khi ghi đè. |
| `mv` | `mv a b` | Di chuyển / đổi tên. Không có `-r`; ghi đè im lặng, thêm `-i` cho an toàn. |
| `rm` | `rm -rf dir/` | Xoá. `-rf` không hỏi và không hoàn tác — cẩn thận với biến rỗng và `*`. |
| `touch` | `touch f` | Tạo file rỗng hoặc cập nhật timestamp. |
| `ls` | `ls -lah` | Liệt kê; `-l` chi tiết, `-a` cả file ẩn, `-h` dung lượng dễ đọc, `-t` sắp theo thời gian. |
| `find` | `find . -name '*.log' -mtime +7` | Tìm file theo tên/thời gian/loại; `-exec ... {} \;` chạy lệnh trên mỗi kết quả. |
| `head` | `head -n 20 f` | In N dòng đầu (mặc định 10). |
| `tail` | `tail -f log` | In N dòng cuối; `-f` theo dõi file đang ghi (log). |
| `chmod` | `chmod 755 f` / `chmod +x f` | Đổi quyền; số bát phân hoặc `u/g/o + rwx`. |
| `chown` | `chown user:group f` | Đổi chủ sở hữu; thường cần `sudo`, `-R` đệ quy. |
| `ln` | `ln -s target link` | `-s` tạo symlink; không `-s` là hard link. |
| `mkdir` | `mkdir -p a/b/c` | Tạo thư mục; `-p` tạo cả cây cha và không lỗi nếu đã có. |
| `rmdir` | `rmdir d` | Xoá thư mục RỖNG; có nội dung thì dùng `rm -r`. |
| `du` | `du -sh dir/` | Dung lượng thư mục; `-s` tổng, `-h` dễ đọc. |
| `df` | `df -h` | Dung lượng đĩa còn trống theo mount point. |
| `file` | `file x` | Đoán loại file thật theo nội dung, không theo đuôi. |
| `diff` | `diff -u a b` | So sánh 2 file; `-u` dạng unified (như git diff). |

## Thao tác văn bản

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `grep` | `grep -rin 'pat' .` | Tìm dòng khớp; `-r` đệ quy, `-i` bỏ hoa/thường, `-n` số dòng, `-v` đảo, `-l` chỉ tên file. |
| `grep -E` | `grep -E 'a|b' f` | Regex mở rộng (bằng `egrep`); cho `+ ? { } |` không cần escape. |
| `sed` | `sed 's/a/b/g' f` | Thay thế theo dòng; `-i` sửa tại chỗ, `-n '5p'` in dòng 5. |
| `awk` | `awk '{print $2}' f` | Xử lý theo cột; `-F,` đặt dấu phân cách, `$0` cả dòng, `NR` số dòng. |
| `cut` | `cut -d, -f1,3 f` | Cắt cột; `-d` delimiter, `-f` số field, `-c` theo ký tự. |
| `sort` | `sort -k2 -n -r f` | Sắp xếp; `-n` số, `-r` ngược, `-k` theo cột, `-u` bỏ trùng. |
| `uniq` | `sort f | uniq -c` | Gộp dòng trùng LIỀN kề; `-c` đếm. Phải `sort` trước. |
| `tr` | `tr 'a-z' 'A-Z'` | Đổi/xoá ký tự; `-d` xoá, `-s` gộp lặp. Đọc từ stdin. |
| `wc` | `wc -l f` | Đếm; `-l` dòng, `-w` từ, `-c` byte. |
| `nl` | `nl f` | Đánh số dòng (bỏ qua dòng trống). |
| `tee` | `cmd | tee f` | Ghi stdin ra file VÀ ra stdout; `-a` nối thêm. |
| `fmt` | `fmt -w 80 f` | Gói lại đoạn văn theo độ rộng cột. |

## Thư mục & điều hướng

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `cd` | `cd path` / `cd` / `cd -` | Đổi thư mục; không tham số về `$HOME`, `-` về thư mục trước. |
| `pwd` | `pwd` | In đường dẫn tuyệt đối hiện tại. |
| `mkdir` | `mkdir -p a/b` | Tạo thư mục kèm cây cha. |
| `pushd` | `pushd dir` | Đổi thư mục và đẩy vào stack. |
| `popd` | `popd` | Quay lại thư mục ở đỉnh stack. |

## Hệ thống, mạng, SSH

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `ps` | `ps aux` | Liệt kê tiến trình; lọc bằng `ps aux | grep name`. |
| `top` | `top` / `htop` | Xem tiến trình theo thời gian thực; `htop` dễ nhìn hơn. |
| `kill` | `kill PID` | Gửi tín hiệu (mặc định `TERM`); dừng tiến trình theo PID. |
| `killall` | `killall name` | Kill theo TÊN tiến trình thay vì PID. |
| `df` | `df -h` | Dung lượng đĩa còn trống. |
| `du` | `du -sh .` | Dung lượng thư mục hiện tại. |
| `uname` | `uname -a` | Thông tin kernel/OS; `-r` phiên bản kernel. |
| `date` | `date +%Y-%m-%d` | In / định dạng ngày giờ. |
| `cal` | `cal` | In lịch tháng. |
| `ssh` | `ssh user@host -p 22` | Đăng nhập từ xa; `-i key` chỉ định private key. |
| `scp` | `scp f user@host:/path` | Copy file qua SSH; `-r` cho thư mục. |
| `wget` | `wget -O f url` | Tải file; `-c` tiếp tục dở dang, `-O` đặt tên output. |
| `curl` | `curl -sSL url` | Gọi HTTP; `-o f` lưu file, `-I` chỉ header, `-X POST -d` gửi data. |
| `ping` | `ping -c 4 host` | Kiểm tra kết nối; `-c` giới hạn số gói. |
| `dig` | `dig A example.com` | Tra DNS; `+short` chỉ lấy kết quả gọn. |
| `whois` | `whois domain` | Thông tin đăng ký domain. |
| `uptime` | `uptime` | Thời gian chạy máy và load average. |
| `whoami` | `whoami` | In user hiện tại. |
| `man` | `man cmd` | Đọc tài liệu lệnh; `man -k word` tìm theo từ khoá. |
| `which` | `which cmd` / `type cmd` | Tìm đường dẫn lệnh; `type` còn báo alias/builtin/function. |

## Nén

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `gzip` | `gzip f` | Nén thành `f.gz`; XOÁ file gốc. `-k` giữ lại gốc. |
| `gunzip` | `gunzip f.gz` | Giải nén `.gz`. |
| `tar` | `tar -czf a.tgz dir/` | Gói + nén; `c` tạo, `x` giải, `t` liệt kê, `z` gzip, `f` tên file. |
| `zcat` | `zcat f.gz` | In nội dung `.gz` mà không cần giải nén ra đĩa. |

## Job & tiến trình

| Lệnh | Cú pháp | Để làm gì / cạm bẫy |
|---|---|---|
| `&` | `cmd &` | Chạy nền, trả prompt ngay; log vẫn đổ ra terminal. |
| `jobs` | `jobs -l` | Liệt kê job nền của shell hiện tại kèm PID. |
| `fg` | `fg %1` | Đưa job về foreground. |
| `bg` | `bg %1` | Cho job đang dừng (`Ctrl-Z`) chạy tiếp ở nền. |
| `nohup` | `nohup cmd &` | Chạy bất chấp đóng terminal; log vào `nohup.out`. |
| `disown` | `disown %1` | Tách job khỏi shell để không bị kill khi thoát. |
| `kill` | `kill %1` / `kill PID` | Gửi `SIGTERM` — xin tiến trình tự dừng gọn. |
| `kill -9` | `kill -9 PID` | Gửi `SIGKILL` — ép chết ngay, không cleanup. Chỉ khi `TERM` không ăn. |

## Chuyển hướng & pipe nhanh

| Ký hiệu | Để làm gì |
|---|---|
| `>` | Ghi stdout ra file, GHI ĐÈ. |
| `>>` | Ghi stdout ra file, NỐI THÊM. |
| `<` | Lấy stdin từ file. |
| `2>` | Chuyển hướng stderr (ví dụ `2> err.log`). |
| `2>&1` | Gộp stderr vào chung nơi stdout đang trỏ. Đặt SAU `>`. |
| `&>` | Gộp cả stdout + stderr vào file (bash). |
| `|` | Nối stdout lệnh này vào stdin lệnh kế. |
| `tee` | Rẽ đôi: vừa ra file vừa ra stdout. |
| `/dev/null` | Hố đen: `cmd > /dev/null 2>&1` vứt mọi output. |
| `<<EOF` | Heredoc: cấp nhiều dòng text làm stdin cho tới `EOF`. |
| `<<<` | Here-string: cấp một chuỗi làm stdin, ví dụ `grep x <<< "$var"`. |

## Phím tắt dòng lệnh

| Phím | Để làm gì |
|---|---|
| `!!` | Lặp lại lệnh vừa chạy. |
| `!$` | Chèn tham số CUỐI của lệnh trước. |
| `sudo !!` | Chạy lại lệnh trước với `sudo` (khi quên). |
| `Ctrl-R` | Tìm ngược trong lịch sử lệnh. |
| `Ctrl-C` | Ngắt (gửi `SIGINT`) lệnh đang chạy. |
| `Ctrl-Z` | Tạm dừng lệnh, đẩy xuống nền (dùng `fg`/`bg` để tiếp). |
| `Ctrl-A` / `Ctrl-E` | Nhảy về đầu / cuối dòng. |
| `Ctrl-U` / `Ctrl-K` | Xoá từ con trỏ về đầu / về cuối dòng. |
| `cd -` | Về thư mục vừa rời khỏi. |

## Related Topics

- [Xử lý văn bản bằng pipeline](../skills/text-processing.md)
- [Tìm file với find và xargs](../skills/find-va-xargs.md)
- [Process và job control](../reference/process-va-job-control.md)
- [Streams và redirection](../reference/streams-va-redirection.md)
- [Cheatsheet toán tử test và expansion](test-operators-va-expansion.md)
