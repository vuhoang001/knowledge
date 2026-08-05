---
title: Tìm file với find và xargs
sidebar_position: 2
description: "find là vòng lặp qua cây thư mục, ghép với xargs để chạy lệnh hàng loạt — luôn dùng -print0 và -0 vì tên file có dấu cách sẽ phá mọi thứ."
tags: [find, xargs, files, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Tìm file với find và xargs

> **Chốt:** `find` là một vòng lặp đệ quy qua cây thư mục: *duyệt → lọc → làm gì đó*. Khi cần chạy lệnh hàng loạt trên kết quả, nối với `xargs`. Và **luôn** đi cặp `-print0` với `-0` — một cái tên file có dấu cách là đủ để `find | xargs` mặc định cắt sai đường dẫn và xoá nhầm.

## Mục tiêu

Sau khi đọc, bạn dựng lại được:

- Cú pháp ba phần của `find`: `find <path> <điều kiện> <hành động>`.
- Các điều kiện hay dùng: tên, loại, thời gian, kích thước, độ sâu, và cách ghép `-a`/`-o`/`!`.
- Khác biệt giữa `-exec cmd {} \;` (mỗi file một lần) và `-exec cmd {} +` (gộp).
- Vì sao `-print0 | xargs -0` là mặc định an toàn, còn `find | xargs` và `ls | xargs` là bẫy.

## Tổng quan

`find` đọc theo mô hình ba phần, trái sang phải:

```
find   logs        -name '*.log' -type f        -exec wc -l {} +
       ^path        ^điều kiện (lọc)             ^hành động
```

- **path**: nơi bắt đầu duyệt. `find` đi đệ quy xuống mọi thư mục con.
- **điều kiện**: các test lọc lại. Nhiều điều kiện đứng cạnh nhau mặc định là **AND**.
- **hành động**: làm gì với mỗi file khớp. Mặc định là `-print` nếu bạn không ghi hành động nào.

Các test hay dùng:

| Test | Nghĩa |
|---|---|
| `-name '*.log'` | tên khớp glob — **phải nháy**, xem cạm bẫy dưới |
| `-iname '*.LOG'` | như `-name` nhưng không phân biệt hoa thường |
| `-type f` / `-type d` | chỉ file thường / chỉ thư mục |
| `-mtime -7` | sửa **trong** 7 ngày qua (`+7` = cũ hơn 7 ngày) |
| `-size +10M` | lớn hơn 10 MB (`-size -1k` = nhỏ hơn 1 KB) |
| `-maxdepth 2` | không duyệt sâu quá 2 tầng |
| `! -name '*.log'` | phủ định — mọi thứ **không** phải `.log` |
| `\( A -o B \)` | HOẶC, nhớ escape ngoặc cho shell |

`xargs` đọc stdin, cắt thành các đối số, rồi nối vào cuối một lệnh và chạy. Đây là cách biến một danh sách tên file (từ `find`, `grep -l`, ...) thành đối số cho lệnh không đọc stdin (như `rm`, `wc`, `cp`).

## Ví dụ

Tất cả output dưới là **Chạy thật 2026-08-05 · bash 5.3.9(1) trên Ubuntu.** `find` ở máy này là bfs 4.1.1 (tương thích GNU find), không phải GNU findutils — output có thể lệch nhỏ.

Dựng cây mẫu — cố tình có một file tên `báo cáo.log` (có dấu cách) để lát nữa phá `xargs`:

```bash
mkdir -p /tmp/bashlab-find && cd /tmp/bashlab-find
mkdir -p logs/app logs/sys src
printf 'a\nb\nc\n'  > logs/app/error.log
printf 'x\ny\n'     > logs/sys/kernel.log
printf 'z\n'        > logs/app/old.log
printf 'hello\n'    > "logs/app/báo cáo.log"   # tên có dấu cách
printf 'code\n'     > src/main.py
touch -d '2026-08-04' logs/app/error.log       # sửa gần đây
touch -d '2025-01-01' logs/app/old.log         # sửa lâu rồi
```

### 1. Lọc: mọi `*.log`

```console
$ find logs -type f -name '*.log'
logs/sys/kernel.log
logs/app/báo cáo.log
logs/app/old.log
logs/app/error.log
```

### 2. Thêm điều kiện thời gian: chỉ file sửa trong 7 ngày

Các điều kiện đứng cạnh nhau là AND. `old.log` (chỉnh về 2025-01-01) bị loại:

```console
$ find logs -name '*.log' -mtime -7
logs/sys/kernel.log
logs/app/báo cáo.log
logs/app/error.log
```

### 3. Hành động `-exec {} +` — gộp nhiều file vào một lệnh

Ví dụ xuyên suốt: tìm mọi `*.log` rồi đếm dòng. `{}` là chỗ chèn tên file, `+` gộp tất cả vào **một** lần gọi `wc` (nên có dòng `total`):

```console
$ find logs -name '*.log' -type f -exec wc -l {} +
 2 logs/sys/kernel.log
 1 logs/app/báo cáo.log
 1 logs/app/old.log
 3 logs/app/error.log
 7 total
```

### 4. Hành động `-exec {} \;` — mỗi file một lần

Đổi `+` thành `\;` thì `find` gọi lệnh **riêng cho từng file**. Chậm hơn (fork nhiều process), nhưng bắt buộc khi lệnh chỉ nhận đúng một đối số:

```console
$ find logs -name 'error.log' -exec wc -l {} \;
3 logs/app/error.log
```

> `\;` mỗi file một process; `+` gộp tối đa file vào một process (giống `xargs`, nhanh hơn nhiều với danh sách lớn). Chọn `+` mặc định; chỉ dùng `\;` khi cần một-file-một-lần. Cả `\;` lẫn `{}` phải escape để shell không nuốt mất.

### 5. Vì sao phải `-print0 | xargs -0` — demo file gãy

Đây là lý do cả trang này tồn tại. `xargs` mặc định tách đối số theo **khoảng trắng**, nên `báo cáo.log` bị xé thành hai token `báo` và `cáo.log`:

```console
$ find logs -name '*.log' | xargs wc -l
 2 logs/sys/kernel.log
wc: logs/app/báo: No such file or directory
wc: cáo.log: No such file or directory
 1 logs/app/old.log
 3 logs/app/error.log
 6 total
```

Trong đời thật, nếu lệnh là `rm` thay vì `wc`, nó vừa cố xoá hai đường dẫn không tồn tại — và tệ hơn, nếu tình cờ có file tên `báo` thật thì xoá nhầm.

Sửa: `find ... -print0` phân cách kết quả bằng **byte NUL** (ký tự không bao giờ xuất hiện trong tên file), và `xargs -0` cắt theo đúng NUL đó:

```console
$ find logs -name '*.log' -print0 | xargs -0 wc -l
 2 logs/sys/kernel.log
 1 logs/app/báo cáo.log
 1 logs/app/old.log
 3 logs/app/error.log
 7 total
```

Đủ 4 file, `báo cáo.log` nguyên vẹn, `total` đúng.

### 6. Cạm bẫy glob không nháy — shell nở trước khi `find` nhận

Chạy trong `bash` (login shell của lab là zsh nên phản ứng hơi khác — xem Common Mistakes). Trong CWD có sẵn `top.log`:

```console
$ find . -name *.log        # KHÔNG nháy
./top.log
$ find . -name '*.log'      # CÓ nháy
./top.log
./logs/sys/kernel.log
./logs/app/báo cáo.log
./logs/app/old.log
./logs/app/error.log
```

Không nháy, bash nở `*.log` thành `top.log` **tại thư mục hiện tại** *trước khi* `find` chạy, nên `find` nhận `-name top.log` và chỉ tìm được đúng một file. Nháy lại thì `find` mới nhận đúng chuỗi `*.log` và tự khớp trên toàn cây.

## Trade-offs

| Lựa chọn | Khi nào |
|---|---|
| `-exec {} +` | Mặc định. Danh sách lớn, lệnh nhận nhiều đối số. Nhanh nhất. |
| `-exec {} \;` | Lệnh chỉ nhận một file, hoặc cần chèn `{}` vào giữa (không phải cuối). |
| `find -print0 \| xargs -0` | Khi cần cờ của `xargs`: `-P` song song, `-n1`, `-I{}`. Vẫn an toàn tên file. |
| `find \| xargs` (không `-0`) | **Gần như không bao giờ.** Chỉ chấp nhận khi chắc chắn tên file không có khoảng trắng/newline — mà bạn hiếm khi chắc được. |

- `-exec {} +` và `xargs -0` ngang nhau về tốc độ và độ an toàn với tên file. Khác biệt: `xargs` cho thêm `-P` (song song) và `-I{}`; `-exec +` gọn hơn, không cần pipe.
- `-delete` tiện nhưng không hoàn tác. Chạy thử với `-print` trước, thấy đúng danh sách rồi mới đổi thành `-delete`.

## Common Mistakes

- **`find . -name *.log` không nháy.** Shell nở glob trước, `find` nhận sai đối số (xem ví dụ 6). Luôn `-name '*.log'`.
- **`ls | xargs` với tên có dấu cách.** Cùng bệnh với `find | xargs`: `ls` in tên phân cách bằng newline nhưng `xargs` mặc định cũng cắt theo khoảng trắng, tên có dấu cách gãy. Không phân tích output của `ls` bằng script — dùng `find -print0`.
- **Quên `-type f`.** `-name '*.log'` cũng khớp thư mục tên `*.log`. Nếu định thao tác lên file, thêm `-type f`.
- **Lab này chạy zsh, không phải bash.** Trong zsh, `find . -name *.log` mà không có file `.log` nào ở CWD sẽ báo `no matches found` và **không chạy find** (zsh mặc định `nomatch`). Cùng một lệnh, hai shell hai hành vi — đó chính là lý do phải nháy: nháy thì kết quả giống nhau ở mọi shell.
- **Nhầm `-mtime -7` với `+7`.** `-7` là *mới hơn* 7 ngày; `+7` là *cũ hơn* 7 ngày; `7` (không dấu) là đúng ngày thứ 7.

## FAQ

<details>
<summary>-print0 và -0 khác gì -exec &#123;&#125; + ? Chọn cái nào?</summary>

Cả hai đều an toàn với tên file và đều gộp nhiều file vào một lần gọi lệnh. Dùng `-exec {} +` khi bạn chỉ cần chạy một lệnh thẳng. Dùng `find -print0 | xargs -0` khi cần các cờ của `xargs` mà `-exec` không có: `-P4` (chạy 4 process song song), `-n1` (một file mỗi lần gọi), hay `-I{}` (chèn tên vào giữa lệnh).

</details>

<details>
<summary>Tại sao là NUL mà không phải newline làm dấu phân cách?</summary>

Vì tên file trên Linux được phép chứa **mọi** byte trừ đúng hai thứ: `/` và byte NUL (`\0`). Newline, dấu cách, tab đều hợp lệ trong tên file, nên bất kỳ dấu phân cách nào là ký tự in được đều có thể trùng nội dung tên. NUL là byte duy nhất không bao giờ nằm trong tên, nên `-print0`/`-0` là cách phân tách duy nhất không thể nhầm.

</details>

<details>
<summary>Muốn chèn tên file vào giữa lệnh chứ không phải cuối thì sao?</summary>

`xargs` mặc định nối đối số vào **cuối** lệnh. Khi cần chèn vào giữa (ví dụ `mv <file> backup/`), dùng `-I{}`:

```bash
find logs -name '*.log' -print0 | xargs -0 -I{} mv {} /tmp/backup/
```

Lưu ý `-I{}` ngầm bật `-n1` (mỗi lần một file), nên mất lợi thế gộp — chậm hơn với danh sách lớn.

</details>

<details>
<summary>find nói "paths must precede expression" là lỗi gì?</summary>

Bạn đặt một path (hoặc một glob đã bị shell nở thành nhiều path) **sau** phần điều kiện. Thường do quên nháy `-name`: shell nở `*.log` thành nhiều tên, cái đầu bị coi là path, các cái sau `find` không biết xếp vào đâu. Nháy `-name '*.log'` lại là hết.

</details>

## Related Topics

- [Quoting và expansion](../reference/quoting-va-expansion.md) — vì sao `'*.log'` phải nháy, shell nở glob lúc nào
- [Xử lý văn bản bằng pipeline](text-processing.md) — thứ bạn thường chạy trên các file `find` ra
- [Tên file có dấu cách xoá nhầm cả thư mục](../case-studies/bien-khong-nhay-word-splitting.md) — cùng gốc bệnh với `find | xargs` thiếu `-print0`
- [Cheatsheet lệnh bash](../cheatsheets/commands.md) — tra nhanh `find`/`xargs` và cờ hay dùng

## References

- `man find` — mục `EXPRESSIONS`, và so sánh `-exec ... ;` với `-exec ... +`
- `man xargs` — cờ `-0`, `-I`, `-n`, `-P`
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
