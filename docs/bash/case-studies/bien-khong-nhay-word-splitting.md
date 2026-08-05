---
title: Tên file có dấu cách xoá nhầm cả thư mục
sidebar_position: 1
description: "Biến chứa tên file có dấu cách không bọc nháy kép bị word splitting thành nhiều đối số — vòng lặp for over ls và rem dollar-f xoá nhầm thứ khác."
tags: [case-study, quoting, word-splitting, bash]
domain: devops
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Tên file có dấu cách xoá nhầm cả thư mục

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. **Mọi lệnh và output chạy thật trên bash 5.3.9.**

> **Chốt:** `$var` không nháy đứng ở vị trí đối số bị shell cắt theo `IFS` rồi glob lại. Một cái tên → nhiều đối số. Ngày nào cũng có một file tên có dấu cách, và ngày đó script `rm` của bạn xoá nhầm thứ khác.

## Bối cảnh

Một script cron dọn log cũ, chạy êm nhiều tháng:

```bash
for f in $(ls *.log); do rm $f; done
```

Nó đúng vì lý do sai: **chưa từng có file log nào tên có dấu cách**. Mỗi tên chỉ là một
"từ", nên word splitting không cắt gì, glob không mở rộng thêm gì. Cái sai nằm im.

Rồi một job xuất báo cáo bắt đầu ghi ra `báo cáo tháng 8.log`.

## Triệu chứng

Dựng lại đúng thư mục đó — vài log thường, một file tên có dấu cách, và (xui) một file
vô can tên `báo`:

```
=== truoc khi chay vong lap loi ===
app.log
báo
báo cáo tháng 8.log
error.log
```

Chạy đúng vòng lặp cũ:

```bash
for f in $(ls *.log); do rm $f; done
```

Kết quả thật:

```
rm: cannot remove 'cáo': No such file or directory
rm: cannot remove 'tháng': No such file or directory
rm: cannot remove '8.log': No such file or directory

=== sau khi chay ===
báo cáo tháng 8.log
```

> Chạy thật 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

Đọc kỹ cái output này, nó tệ theo ba cách cùng lúc:

- File đáng xoá — `báo cáo tháng 8.log` — **vẫn còn**. Chưa ai đụng được vào nó.
- `app.log`, `error.log` bị xoá đúng như mọi hôm (không thấy trong danh sách còn lại).
- File vô can **`báo` biến mất** — bị `rm báo` xoá, dù nó chẳng phải `.log`.
- Ba dòng lỗi `No such file` cho `cáo`, `tháng`, `8.log`.

Thay `rm` bằng `echo "rm $f"` cho thấy shell thật ra gọi cái gì:

```
rm app.log
rm báo
rm cáo
rm tháng
rm 8.log
rm error.log
```

Một cái tên `báo cáo tháng 8.log` nở thành **bốn** đối số: `báo`, `cáo`, `tháng`,
`8.log`.

## Giả thuyết sai lúc đầu

| Nghi | Kết quả |
|---|---|
| Tên file mã hoá lỗi (UTF-8 hỏng) | Sai. `command ls -1` in ra `báo cáo tháng 8.log` đọc được, không có ký tự lạ. |
| `rm` bản uutils lỗi, hiểu sai đối số | Sai. `rm` nhận đúng cái nó được đưa — `cáo`, `tháng` thật sự không tồn tại nên báo lỗi đúng. |
| Ổ đĩa / inode hỏng nên "No such file" | Sai. File vẫn ở đó, `ls` thấy. Lỗi là do tên đã bị cắt trước khi tới `rm`. |
| Glob `*.log` khớp nhầm | Sai. `*.log` khớp đúng file; vấn đề nằm sau đó, ở chỗ `$f` không nháy. |

Cả bốn nghi đều nhìn về phía `rm`, ổ đĩa, mã hoá — tức là phía **hệ thống**. Thủ phạm
là **quoting**, một tầng cao hơn, trước khi lệnh kịp chạy.

## Nguyên nhân thật

Hai lỗi quoting chồng lên nhau.

**Lỗi 1 — `for f in $(ls *.log)`:** output của `ls` là một chuỗi, shell cắt nó theo
`IFS` (mặc định gồm space, tab, newline) thành các "từ". Tên có dấu cách bị cắt ngay tại
đây.

```
$ printf '%q\n' "$IFS"
\ $'\t'$'\n'$'\0'
```

`IFS` mặc định chứa dấu cách — đó là con dao.

**Lỗi 2 — `rm $f`:** kể cả nếu `f` giữ nguyên được một tên có dấu cách, `$f` không nháy
lại bị word-split **lần nữa** ở vị trí đối số của `rm`. Bằng chứng: chỉ cần nháy là hết
cắt.

```
name="báo cáo tháng 8.log"
-- khong nhay, IFS mac dinh --
  <báo cáo tháng 8.log>
-- co nhay --
  <báo cáo tháng 8.log>
```

Vòng lặp `for x in $name` (không nháy) cho **một** kết quả ở đây chỉ vì `name` là một
biến đơn không qua `ls` — nhưng ở script gốc, `$(ls)` đã cắt sẵn rồi. Điểm chốt: **mỗi
lần một `$var` không nháy đứng ở vị trí đối số là một lần shell được phép cắt lại.**

## Vì sao khó phát hiện

- **Nhiều tháng chạy đúng.** Test viết với `foo.log`, `bar.log` — không tên nào có dấu
  cách, nên word splitting là no-op. Test xanh mãi.
- **Mắt thường bỏ qua.** `rm $f` trông y hệt `rm "$f"`; khác đúng hai ký tự nháy. Không
  có gì đỏ lên.
- **Lỗi lệch pha với thủ phạm.** Cái nổ ra là `rm: No such file` cho `cáo`, `tháng` —
  toàn tên bạn chưa từng gõ. Bản năng đầu tiên là đi soi `rm`, ổ đĩa, mã hoá; không ai
  soi ngay hai dấu nháy thiếu.
- **Nó âm thầm xoá nhầm.** File `báo` bị xoá **không** kèm lỗi nào — nó tồn tại thật nên
  `rm báo` thành công. Thiệt hại lặng lẽ hơn cả dòng báo lỗi.

## Cách sửa

Glob trực tiếp (bỏ hẳn `ls`), nháy kép biến, thêm `--` để tên bắt đầu bằng `-` không bị
hiểu thành cờ:

```bash
for f in *.log; do rm -- "$f"; done
```

Dựng lại đúng thư mục cũ, chạy thật:

```
=== truoc ===
app.log
báo
báo cáo tháng 8.log
error.log

=== cach sua: for f in *.log; do echo rm -- "$f"; done ===
rm -- <app.log>
rm -- <báo cáo tháng 8.log>
rm -- <error.log>

=== sau ===
báo
```

> Chạy thật 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

Đối chứng trước/sau:

| | Vòng lặp cũ `$(ls)` + `rm $f` | Vòng lặp sửa `*.log` + `rm -- "$f"` |
|---|---|---|
| Đối số cho mỗi tên có dấu cách | 4 mảnh (`báo` `cáo` `tháng` `8.log`) | 1 tên nguyên |
| `báo cáo tháng 8.log` | Không xoá được | Xoá đúng |
| File vô can `báo` | Bị xoá nhầm | Còn nguyên |
| Lỗi `No such file` | 3 dòng | 0 dòng |

Glob `*.log` trả thẳng danh sách tên, **không** qua chuỗi trung gian nào nên không có
chỗ để cắt. Nháy `"$f"` chặn lần cắt thứ hai. Không đụng `báo` vì nó không khớp `*.log`.

Một điểm phụ: nếu glob không khớp gì, bash mặc định để nguyên `*.log` làm literal. Script
thật nên bật `shopt -s nullglob` để vòng lặp chạy 0 lần thay vì thử `rm -- '*.log'`.

## Dấu hiệu nhận ra sớm

Kiểm được ngay bằng mắt hoặc bằng công cụ:

- Bất kỳ `$var` **không nháy** đứng ở vị trí đối số — đặc biệt `rm $f`, `cp $x $y`,
  `[ $a = $b ]`. Quy tắc phòng thân: **luôn** `"$var"` trừ khi cố ý muốn tách.
- `for x in $(ls ...)` — antipattern kinh điển. Duyệt file thì dùng glob (`for f in
  *.log`), đừng parse `ls`. (`ls` để cho người xem, không phải cho script đọc.)
- Chạy **ShellCheck**: `rm $f` ăn **SC2086** (*Double quote to prevent globbing and word
  splitting*), `for f in $(ls ...)` ăn **SC2045** (*Iterating over ls output is
  fragile*). Cắm ShellCheck vào CI là bắt được cả lớp lỗi này trước khi merge.
- Test có chủ đích với một tên **có dấu cách** (`touch "a b.log"`). Nếu chỉ test
  `foo.log` thì bug ngủ mãi.

## Related Topics

- [Quoting và expansion](../reference/quoting-va-expansion.md)
- [Điều kiện và vòng lặp](../skills/conditionals-va-loops.md)
- [Tìm file với find và xargs](../skills/find-va-xargs.md)
- [Viết script an toàn](../skills/viet-script-an-toan.md)
