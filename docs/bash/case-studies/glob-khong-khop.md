---
title: Vòng lặp chạy một lần với dấu sao literal
sidebar_position: 3
description: "Khi glob không khớp file nào, bash để nguyên chuỗi sao literal nên vòng lặp for chạy đúng một lần với giá trị vô nghĩa."
tags: [case-study, glob, nullglob, loops, bash]
domain: devops
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Vòng lặp chạy một lần với dấu sao literal

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. **Mọi lệnh và output chạy thật trên bash 5.3.9.**

> **Chốt:** Trong bash mặc định, glob không khớp file nào thì **không** biến thành rỗng — nó ở lại nguyên dạng chuỗi `*.csv`, nên `for f in *.csv` vẫn chạy đúng **một** vòng với `f` là pattern literal, và `process "$f"` đi thao tác trên một file không tồn tại.

## Bối cảnh

Một script gom dữ liệu, đoạn lõi kinh điển:

```bash
for f in *.csv; do
  process "$f"
done
```

Chạy trong thư mục có vài file `.csv` thì đúng như mong đợi: mỗi file một vòng. Script qua CI, qua staging, chạy hàng tuần không sao. Rồi một hôm nó chạy trên một thư mục **chưa** có file `.csv` nào (job chạy sớm hơn producer, hoặc thư mục vừa được dọn), và bắt đầu sinh ra lỗi khó hiểu — hoặc tệ hơn, tạo file rác tên đúng bằng `*.csv`.

## Triệu chứng

Chạy thật trong thư mục rỗng, thay `process` bằng `echo` để nhìn rõ giá trị `f`:

```
$ for f in *.csv; do echo "xu ly: [$f]"; done
xu ly: [*.csv]
```

Vòng lặp **chạy đúng một lần**, và `f` là chuỗi literal `*.csv` — không phải danh sách rỗng như trực giác mách bảo. `process` sẽ nhận một "file" tên `*.csv`.

Hai biến thể cùng gốc, cũng chạy thật trong thư mục rỗng:

```
$ ls *.csv
ls: cannot access '*.csv': No such file or directory
exit=2

$ rm *.csv
rm: cannot remove '*.csv': No such file or directory
exit=1
```

`ls`/`rm` nhận đúng chuỗi `*.csv`, đi tìm file tên literal đó, không thấy, báo lỗi. Nếu vô phúc thư mục **có** một file tên đúng `*.csv` (do lần chạy hỏng trước tạo ra) thì `rm *.csv` xóa đúng nó — đúng một file, không phải "mọi file csv".

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Có file ẩn `.csv` nào đó | `ls` thường không hiện file ẩn | `ls -a` cho thấy thư mục thật sự rỗng; giá trị `f` là `*.csv` chứ không phải tên file thật |
| Hàm `process` có bug | Lỗi bắn ra từ trong `process` | `echo "[$f]"` in ra `[*.csv]` — bug nằm ở giá trị truyền vào, không phải ở `process` |
| Biến môi trường / `$IFS` bị chỉnh | Word splitting hay bị đổ lỗi | Thử shell sạch vẫn y hệt — không liên quan splitting |
| `$f` bị mất nháy đâu đó | Quen với bug word-splitting | `f` đã được nháy `"$f"`; vấn đề là bản thân `f` mang giá trị pattern |

Tất cả đều đi tìm bug ở sai chỗ. Đây không phải bug của script — là **hành vi mặc định** của glob khi không khớp.

## Nguyên nhân thật

Theo POSIX, khi một pattern glob không khớp file nào, shell để nguyên pattern **không thay đổi**. Bash theo mặc định giữ đúng quy tắc này. Kiểm tra công tắc điều khiển việc đó, chạy thật:

```
$ shopt nullglob
nullglob            	off
```

`nullglob` **off** nghĩa là: glob không khớp → giữ nguyên chuỗi. Vậy `for f in *.csv` khi không có file khớp trở thành `for f in '*.csv'` — một danh sách một phần tử, nên vòng lặp chạy một lần với giá trị đó. Không có gì huyền bí; chỉ là mặc định đi ngược trực giác "không khớp thì bỏ qua".

## Vì sao khó phát hiện

- **Script đúng suốt nhiều tháng.** Bug chỉ lộ ở đúng một điều kiện biên: thư mục không có file khớp. Test và chạy thường ngày luôn có file, nên không bao giờ chạm biên.
- **Lỗi bắn ra ở tầng dưới.** `process`/`rm`/`ls` mới là nơi văng lỗi, nên phản xạ là đi debug chúng, không ngờ dữ liệu vào đã hỏng từ vòng `for`.
- **Không có cảnh báo nào.** Bash im lặng tuyệt đối — không warning, không exit code khác thường ở bước expand. Đúng "im lặng, không lỗi nào báo".
- **Trực giác từ ngôn ngữ khác.** Ở Python/JS, lặp trên danh sách rỗng thì không chạy vòng nào. Bash làm ngược lại, và đây là bẫy dễ mang theo.

## Cách sửa

**Cách 1 — bật `nullglob`:** glob không khớp trở thành danh sách rỗng, vòng lặp không chạy lần nào. Chạy thật so sánh trước/sau trong thư mục rỗng:

```
$ # TRUOC: nullglob off
$ for f in *.csv; do echo "chay voi f=[$f]"; done
chay voi f=[*.csv]

$ # SAU:
$ shopt -s nullglob
$ for f in *.csv; do echo "chay voi f=[$f]"; done
$   # (khong in gi = vong lap khong chay lan nao)
```

Cạm bẫy: `nullglob` là công tắc **toàn cục** cho phần script còn lại. Một glob khác trong cùng script mà bạn *muốn* nó báo lỗi khi không khớp giờ sẽ âm thầm thành rỗng. Bật có chủ đích, và cân nhắc `shopt -u nullglob` sau đoạn cần.

**Cách 2 — guard đầu vòng, không đụng công tắc toàn cục:**

```
$ for f in *.csv; do [[ -e "$f" ]] || continue; echo "chay voi f=[$f]"; done
$   # (khong in gi = guard chan chuoi literal)
```

`[[ -e "$f" ]]` kiểm tra file có tồn tại thật không; chuỗi literal `*.csv` không tồn tại nên bị `continue` bỏ qua. Cục bộ, không ảnh hưởng glob khác.

**Cách 3 — `failglob` khi muốn hỏng thẳng, to tiếng:**

```
$ shopt -s failglob
$ for f in *.csv; do echo "chay voi f=[$f]"; done
bash: line 14: no match: *.csv
exit=1
```

Glob không khớp → lỗi ngay, không chạy vòng nào, không âm thầm. Hợp khi "không có file để xử lý" đáng coi là bất thường cần dừng.

## Dấu hiệu nhận ra sớm

- Vòng `for x in *.ext; do ...` mà thân vòng **không** kiểm tra file có tồn tại (`[[ -e "$x" ]]`).
- Lỗi thao tác trên một file có tên **đúng bằng pattern** (`*.csv`, `*.log`) — dấu hiệu chắc chắn glob đã không khớp và trôi xuống nguyên dạng.
- ShellCheck bắn **SC2045** ("iterating over `ls` output is fragile") và nhóm cảnh báo glob liên quan — chạy `shellcheck` trên script trước khi tin.
- Job mới, thư mục có thể rỗng ở lần chạy đầu: luôn tự hỏi "nếu không có file khớp thì sao?".

## Related Topics

- [Quoting và expansion](../reference/quoting-va-expansion.md)
- [Điều kiện và vòng lặp](../skills/conditionals-va-loops.md)
- [Biến không nháy — word splitting](bien-khong-nhay-word-splitting.md)
- [Viết script an toàn](../skills/viet-script-an-toan.md)
