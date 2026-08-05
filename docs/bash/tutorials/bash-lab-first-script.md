---
title: 'Lab: viết script bash đầu tiên'
sidebar_position: 2
description: "Từ script hello tối thiểu tới script có tham số, khung set -euo pipefail, hàm và debug bằng bash -x — mỗi bước chạy thật, dán output."
tags: [tutorial, scripting, set-e, debugging, bash]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Lab: viết script bash đầu tiên

> **Chốt:** Một script bash chạy được cần ba thứ ai cũng quên: execute bit
> (`chmod +x`), kiểm tra tham số đầu vào, và khung `set -euo pipefail` để lỗi
> gào lên thay vì trôi qua im lặng. Bài này dựng từng thứ đó bằng tay, chạy
> thật, thấy cả lúc hỏng lẫn lúc chạy.

## Mục tiêu

Đi từ `echo` một dòng tới một script nhỏ nhưng đủ vững để dùng lại: có shebang,
có execute bit, nhận tham số và từ chối đầu vào rỗng, bật khung an toàn để bắt
biến gõ nhầm, dùng hàm + vòng lặp làm một việc thật, và debug được khi hỏng.

Mỗi bước dưới đây có một khối **Chạy thật** — đó là output đúng như terminal
in ra trên máy lab, không phải minh hoạ.

Nháp cho toàn bài:

```bash
mkdir -p /tmp/bashlab-tut-script && cd /tmp/bashlab-tut-script
```

## Bước 1 — script tối thiểu

Một file `.sh` chỉ cần hai dòng: một **shebang** nói cho kernel biết lấy trình
thông dịch nào, và phần thân.

```bash
cat > hello.sh <<'EOF'
#!/usr/bin/env bash
echo "Xin chào từ script bash!"
EOF
```

`#!/usr/bin/env bash` tìm `bash` trong `PATH` thay vì đóng cứng `/bin/bash` —
hợp với những máy để bash ở chỗ khác (macOS, Nix). Bẫy đầu tiên: file mới tạo
**không có** execute bit, nên gọi `./hello.sh` bị từ chối.

**Chạy thật** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ command ls -l hello.sh
-rw-rw-r-- 1 hoanggggf hoanggggf 55 Aug  5 21:02 hello.sh

$ ./hello.sh
bash: line 2: ./hello.sh: Permission denied
$ echo $?
126
```

Exit code **126** nghĩa là "tìm thấy lệnh nhưng không chạy được" — ở đây là
thiếu quyền thực thi. Thêm bit đó rồi chạy lại:

```console
$ chmod +x hello.sh
$ command ls -l hello.sh
-rwxrwxr-x 1 hoanggggf hoanggggf 55 Aug  5 21:02 hello.sh

$ ./hello.sh
Xin chào từ script bash!
$ echo $?
0
```

Chú ý ba dấu `x` mới xuất hiện trong `-rwxrwxr-x`. Đó là toàn bộ khác biệt giữa
"permission denied" và chạy được.

> Alias `ls` trên máy này trỏ sang `lsd`, nên bài dùng `command ls` để lấy
> đúng `ls` chuẩn — output cột quyền mới đọc được như trên.

## Bước 2 — thêm tham số và kiểm tra đầu vào

Script hữu ích thì nhận đầu vào. Tham số vị trí là `$1`, `$2`, … Nhưng người
gọi *sẽ* quên truyền, nên phải kiểm tra rỗng trước khi dùng — nếu không script
chạy tiếp với chuỗi rỗng và cho kết quả vô nghĩa.

Cách rõ ràng: kiểm `${1:-}` rỗng, in usage ra **stderr**, thoát với mã khác 0.

```bash
cat > greet.sh <<'EOF'
#!/usr/bin/env bash
if [[ -z "${1:-}" ]]; then
  echo "Cách dùng: $0 <tên>" >&2
  exit 2
fi
echo "Chào $1!"
EOF
chmod +x greet.sh
```

`${1:-}` là "giá trị của `$1`, hoặc rỗng nếu chưa đặt" — viết vậy để dòng này
không nổ ngay cả khi sau này bật `set -u` (Bước 3). `>&2` đẩy thông báo lỗi ra
stderr, tách khỏi output thật ở stdout. `exit 2` báo cho caller biết là lỗi
dùng sai (quy ước quen thuộc: 2 = sai cú pháp dòng lệnh).

**Chạy thật** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ ./greet.sh Thắng
Chào Thắng!
$ echo $?
0

$ ./greet.sh
Cách dùng: ./greet.sh <tên>
$ echo $?
2
```

Case thiếu tham số thoát **2** và không in "Chào" — đúng ý.

Có một lối viết ngắn hơn cho "bắt buộc phải có, không thì chết": phép mở rộng
`${1:?thông điệp}`. Nếu `$1` rỗng hoặc chưa đặt, bash tự in thông điệp ra
stderr và thoát ngay.

```bash
cat > greet2.sh <<'EOF'
#!/usr/bin/env bash
name="${1:?cần một tên làm tham số}"
echo "Chào $name!"
EOF
chmod +x greet2.sh
```

```console
$ ./greet2.sh
./greet2.sh: line 2: 1: cần một tên làm tham số
$ echo $?
1
```

Ngắn hơn, nhưng exit code là **1** (bash tự chọn) và thông điệp kém thân thiện
hơn usage tự viết. Dùng `${1:?}` cho script nội bộ nhanh gọn; viết khối `if` +
usage khi script có người khác chạy.

## Bước 3 — khung an toàn

Bash mặc định rất khoan dung: biến chưa đặt thành chuỗi rỗng, lệnh giữa chừng
fail vẫn chạy tiếp. Điều đó biến lỗi gõ nhầm thành bug im lặng. Dòng chuẩn để
mở đầu mọi script:

```bash
set -euo pipefail
```

- `set -e` — thoát ngay khi một lệnh trả mã khác 0.
- `set -u` — coi việc dùng biến chưa đặt là lỗi (không âm thầm thành rỗng).
- `set -o pipefail` — pipe fail nếu **bất kỳ** khâu nào fail, không chỉ khâu cuối.

Xem `set -u` bắt một biến gõ nhầm. Script này định in `$greeting` nhưng gõ
thiếu chữ `i` thành `$greetng`:

```bash
cat > safe.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

greeting="Xin chào"
echo "$greetng thế giới"
EOF
chmod +x safe.sh
```

**Chạy thật** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ ./safe.sh
./safe.sh: line 5: greetng: unbound variable
$ echo $?
1
```

Bash chỉ đúng dòng, đúng tên biến sai. Giờ bỏ `set -u` ra, cùng cái lỗi gõ
nhầm đó:

```bash
cat > unsafe.sh <<'EOF'
#!/usr/bin/env bash
greeting="Xin chào"
echo "$greetng thế giới"
EOF
chmod +x unsafe.sh
```

```console
$ ./unsafe.sh
 thế giới
$ echo $?
0
```

Không lỗi, exit **0**, "thành công" — nhưng "Xin chào" biến mất và chẳng ai
báo. Đây chính là loại bug ăn mất cả buổi chiều. `set -u` biến nó thành lỗi
hiện ra ngay.

<details>
<summary>Vì sao không phải lúc nào cũng bật cả ba</summary>

`set -e` có những chỗ ngoại lệ khó chịu: nó **không** kích hoạt cho lệnh nằm
trong điều kiện `if`, trong `&&`/`||`, hay lệnh có `!` phía trước. Với script
có logic phân nhánh phức tạp, nhiều người thay `set -e` bằng cách kiểm exit
code tường minh (`if ! cmd; then ...`). Nhưng cho script nhỏ, `set -euo
pipefail` là mặc định đúng — bật trước, tinh chỉnh sau khi thật sự vướng.

</details>

## Bước 4 — hàm + vòng lặp làm việc thật

Gộp lại thành một script có ích: đếm số dòng của từng file `*.txt` trong một
thư mục và cộng tổng. Dùng một **hàm** cho phần đếm, một **vòng `for`** để
duyệt.

Dựng vài file mẫu — chú ý `c.txt` cố tình **không** có newline ở cuối:

```bash
printf 'một\nhai\nba\n' > a.txt
printf 'x\ny\n' > b.txt
printf 'chỉ một dòng không newline cuối' > c.txt
```

```bash
cat > count-lines.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

dir="${1:?cần thư mục làm tham số}"

dem_dong() {
  local file="$1"
  # grep -c '' đếm cả dòng cuối thiếu newline; wc -l thì không
  grep -c '' "$file"
}

shopt -s nullglob
tong=0
for f in "$dir"/*.txt; do
  n=$(dem_dong "$f")
  printf '%-8s %3d dòng\n' "$(basename "$f")" "$n"
  tong=$(( tong + n ))
done
printf '%-8s %3d dòng\n' "TỔNG" "$tong"
EOF
chmod +x count-lines.sh
```

Ba chi tiết đáng nhớ:

- `local file="$1"` — biến trong hàm phải khai `local`, nếu không nó rò ra
  scope toàn cục và đè lên biến trùng tên bên ngoài.
- `shopt -s nullglob` — nếu thư mục **không** có `.txt` nào, mặc định bash để
  nguyên chuỗi `*.txt` và vòng lặp chạy một lần với tên file ma. `nullglob`
  làm glob rỗng nở ra **không có** phần tử nào, vòng lặp bỏ qua sạch.
- `grep -c ''` thay `wc -l`: `wc -l` đếm ký tự newline, nên dòng cuối thiếu
  newline (`c.txt`) bị đếm hụt. `grep -c ''` khớp mọi dòng kể cả dòng cuối cụt.

**Chạy thật** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ ./count-lines.sh .
a.txt      3 dòng
b.txt      2 dòng
c.txt      1 dòng
TỔNG     6 dòng
$ echo $?
0
```

`c.txt` được tính **1 dòng** dù thiếu newline cuối — đúng như chọn `grep -c ''`.
Nếu dùng `wc -l` nó sẽ ra 0, và tổng lệch. Bẫy này quay lại cắn bạn mỗi khi xử
lý file do chương trình khác sinh ra.

## Bước 5 — debug

Hai công tắc gắn liền với mọi phiên gỡ lỗi bash: `bash -n` kiểm cú pháp mà
**không chạy**, `bash -x` in ra từng lệnh trước khi thực thi.

Dựng một script hỏng — thiếu `fi` đóng khối `if`:

```bash
cat > broken.sh <<'EOF'
#!/usr/bin/env bash
x=5
if [[ "$x" -gt 3 ]]; then
  echo "lớn hơn 3"
EOF
```

`bash -n` (no-exec) phát hiện lỗi cú pháp mà không chạy dòng nào — an toàn để
chạy trên script còn dở:

**Chạy thật** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ bash -n broken.sh
broken.sh: line 5: syntax error: unexpected end of file from `if' command on line 3
$ echo $?
2

$ bash -n count-lines.sh
$ echo $?
0
```

Script hỏng: chỉ đúng dòng và nói `if` ở dòng 3 chưa được đóng. Script tốt: im
lặng, exit 0. Chạy `bash -n` trước khi commit một script là thói quen rẻ tiền
mà chặn được cả lớp lỗi ngớ ngẩn.

Còn khi script *chạy được* nhưng ra kết quả sai, `bash -x` (xtrace) in mỗi lệnh
đã mở rộng biến, kèm tiền tố `+`:

```console
$ bash -x greet.sh Thắng
+ [[ -z Thắng ]]
+ echo 'Chào Thắng!'
Chào Thắng!
$ echo $?
0
```

Thấy rõ điều kiện `[[ -z Thắng ]]` đã được đánh giá (với giá trị `$1` đã thay
vào) rồi tới `echo`. Với script dài, `bash -x` cho biết chính xác biến mang giá
trị gì tại từng bước — thứ mà đọc code tĩnh đoán không ra. Bật giữa chừng bằng
`set -x`, tắt bằng `set +x` nếu chỉ muốn trace một đoạn.

## Related Topics

- [Viết script an toàn](../skills/viet-script-an-toan.md)
- [Hàm trong bash](../skills/functions.md)
- [Exit code và control flow](../reference/exit-code-va-control-flow.md)
- [Lab: xử lý văn bản](bash-lab-text-processing.md)
