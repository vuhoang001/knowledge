---
title: 'set -e bật nhưng script vẫn chạy tiếp sau lỗi'
sidebar_position: 4
description: "set -e không kích hoạt trong if, while, sau và-và hoặc-hoặc, trong hàm gọi ở điều kiện, hay lệnh không phải cuối pipe — nên script tưởng an toàn mà không dừng."
tags: [case-study, set-e, exit-code, scripting, bash]
domain: devops
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-05
---

# set -e bật nhưng script vẫn chạy tiếp sau lỗi

> **Tình huống dựng lại**, không phải sự cố đã gặp ở đây. **Mọi lệnh và output chạy thật trên bash 5.3.9.**

> **Chốt:** `set -e` chỉ dừng khi lệnh lỗi là một *lệnh đơn giản* nằm ở vị trí **không được kiểm tra**. Đặt lệnh trong `if`/`while`, sau `||`/`&&`, giữa một pipe, hay bên trong một hàm được gọi ở điều kiện — `set -e` im lặng bỏ qua. Đừng tin mình `set -e`; kiểm lỗi tường minh cộng `pipefail` cộng `trap ... ERR`.

## Bối cảnh

Một script deploy mở đầu bằng `set -e`. Người viết yên tâm: "có lỗi là dừng, không bao giờ deploy trên một build hỏng." Script gọi build trong một hàm, kiểm kết quả bằng `if`, và có vài chỗ dùng `cmd || fallback` cho gọn. Chạy nhãn: **Chạy thật 2026-08-05 · bash 5.3.9(1).**

## Triệu chứng

Build fail giữa chừng, nhưng script vẫn chạy tới cuối và **deploy artifact hỏng**. Exit code cuối cùng thậm chí là 0 ở vài ca, nên CI cũng báo xanh. `set -e` rõ ràng đang bật — mà không dừng.

Dựng lại từng ca. Điều khiển trước đã: một lệnh đơn giản lỗi ở vị trí thường **có** dừng.

```bash
$ cat > cok.sh <<'EOF'
set -e
false
echo "KHONG in dong nay"
EOF
$ bash cok.sh; echo "exit=$?"
exit=1
```

Đúng như kỳ vọng — không in "KHONG in dong nay", exit=1. Giờ tới năm ca **không** dừng.

**Ca 1 — lệnh trong điều kiện `if`:**

```bash
$ cat > c1.sh <<'EOF'
set -e
if false; then echo "khong vao"; fi
echo "van chay sau if"
EOF
$ bash c1.sh; echo "exit=$?"
van chay sau if
exit=0
```

**Ca 2 — sau `||` và `&&`:**

```bash
$ cat > c2.sh <<'EOF'
set -e
false || true
echo "van chay sau ||"
true && false
echo "van chay sau && (a=true, b=false)"
EOF
$ bash c2.sh; echo "exit=$?"
van chay sau ||
van chay sau && (a=true, b=false)
exit=1
```

Cả `false || true` lẫn `true && false` đều không dừng script (exit=1 là do lệnh cuối `false`, nhưng dòng echo sau nó vẫn in — script không hề dừng ở giữa).

**Ca 3 — lệnh không phải cuối trong pipe (không `pipefail`):**

```bash
$ cat > c3.sh <<'EOF'
set -e
false | cat
echo "van chay sau pipe (khong pipefail)"
EOF
$ bash c3.sh; echo "exit=$?"
van chay sau pipe (khong pipefail)
exit=0
```

`set -e` chỉ nhìn exit code của **cuối pipe** (`cat`, thành công). Bật `pipefail` mới đổi:

```bash
$ cat > c3b.sh <<'EOF'
set -e
set -o pipefail
false | cat
echo "KHONG in dong nay vi pipefail dung set -e"
EOF
$ bash c3b.sh; echo "exit=$?"
exit=1
```

**Ca 4 — hàm gọi trong ngữ cảnh điều kiện:** bên trong hàm, `set -e` bị vô hiệu.

```bash
$ cat > c4.sh <<'EOF'
set -e
f() { false; echo "van chay TRONG f sau false"; }
if f; then echo "f tra ve 0"; fi
echo "van chay sau if f"
EOF
$ bash c4.sh; echo "exit=$?"
van chay TRONG f sau false
f tra ve 0
van chay sau if f
exit=0
```

`false` bên trong `f` không dừng gì cả vì `f` được gọi ở điều kiện `if`. `f` trả về 0 (exit của lệnh cuối `echo`), nên `if` cũng vào nhánh then.

**Ca 5 — command substitution:** đây là ca có sắc thái, và bash 5.3 hành xử khác cái người ta hay nghĩ. Gán `x=$(false)` **ở top-level lại có dừng**:

```bash
$ cat > c5a.sh <<'EOF'
set -e
x=$(false)
echo "van chay? x='$x'"
EOF
$ bash c5a.sh; echo "exit=$?"
exit=1
```

Không in "van chay" — dừng. Nhưng nhét `$(false)` **inline vào lệnh khác**, hoặc `local x=$(false)` **trong hàm**, thì lại chạy tiếp:

```bash
$ cat > c5b.sh <<'EOF'
set -e
echo "ket qua: $(false)"
echo "van chay sau echo chua \$(false)"
EOF
$ bash c5b.sh; echo "exit=$?"
ket qua: 
van chay sau echo chua $(false)
exit=0

$ cat > c5c.sh <<'EOF'
set -e
f() { local x=$(false); echo "van chay TRONG f sau local x=\$(false)"; }
f
echo "van chay sau f"
EOF
$ bash c5c.sh; echo "exit=$?"
van chay TRONG f sau local x=$(false)
van chay sau f
exit=0
```

`local x=$(false)` là bẫy kinh điển: exit code bị `local` (một builtin thành công) nuốt mất, `set -e` chỉ thấy `local` trả về 0.

## Giả thuyết sai lúc đầu

| Nghi | Kiểm tra | Kết quả |
|---|---|---|
| `set -e` chưa được bật | `set -o \| grep errexit` → `errexit on` | Bật thật, không phải nguyên nhân |
| Bug của bash version này | Chạy trên nhiều máy, cùng hành vi; đúng đặc tả POSIX/bash | Không phải bug — là *thiết kế* |
| Lệnh không thật sự trả lỗi | `false; echo $?` → `1`; lệnh có fail thật | Lệnh fail thật, `set -e` vẫn bỏ qua |
| `local x=$(...)` giữ được lỗi | Ca 5c chạy tiếp, exit=0 | `local` nuốt exit code — sai giả thuyết |

## Nguyên nhân thật

Đặc tả `set -e` (errexit) có một **danh sách ngoại lệ dài**. Nó chỉ khiến shell thoát khi một *lệnh đơn giản*, *pipeline*, hay *lệnh phức hợp* lỗi mà **không** nằm trong các ngữ cảnh sau:

- Toán hạng của `if`, `elif`, `while`, `until`.
- Phần **không phải vế cuối** của một chuỗi `&&` hoặc `||`.
- **Bất kỳ lệnh nào trong pipe trừ lệnh cuối** (trừ khi bật `pipefail`).
- Lệnh bị phủ định bằng `!`.
- **Bên trong một hàm hay `( )` được gọi trong bất kỳ ngữ cảnh nào ở trên** — `set -e` bị "tắt ngữ cảnh" cho toàn bộ thân hàm đó.

Nói cách khác: `set -e` được thiết kế để **không** cản trở khi bạn đang *chủ động kiểm tra* exit code. Vấn đề là ranh giới "đang kiểm tra" rộng hơn nhiều so với trực giác, và nó **lan xuống** cả thân hàm.

## Vì sao khó phát hiện

- Ca điều khiển (`false` trần) **có** dừng, nên test nhanh củng cố niềm tin sai rằng "`set -e` hoạt động".
- Nhiều ca cho exit code cuối = 0 (ca 1, 3, 4, 5b, 5c) → CI báo xanh, không ai nhìn lại.
- Sắc thái command substitution (`x=$(false)` dừng, nhưng `local x=$(false)` không) khiến việc suy luận bằng đầu gần như bất khả — phải chạy thật mới biết.
- Bẫy hàm là tệ nhất: `f` chạy đúng khi gọi trực tiếp (`f` ở dòng riêng có dừng), nhưng đổi thành `if f` là im lặng vô hiệu toàn bộ `set -e` bên trong.

## Cách sửa

Không phụ thuộc mình `set -e`. Bốn lớp cộng dồn:

1. **`set -o pipefail`** — để lỗi giữa pipe không bị nuốt (ca 3).
2. **Kiểm lỗi tường minh** ở các vị trí `set -e` bỏ qua: `cmd || { echo "loi X"; exit 1; }`.
3. **`trap ... ERR`** để bắt và log, thay vì thoát âm thầm.
4. Tránh `local x=$(cmd)` một dòng; tách thành `local x; x=$(cmd)` để `set -e` thấy exit của `cmd`.

Chạy thật bản có `trap ERR` + kiểm tường minh:

```bash
$ cat > cfix.sh <<'EOF'
set -e
set -o pipefail
trap 'echo "loi dong $LINENO (exit=$?)"' ERR
build() { return 1; }
build || { echo "build fail, dung deploy"; exit 1; }
echo "deploy (khong nen den day)"
EOF
$ bash cfix.sh; echo "exit=$?"
build fail, dung deploy
exit=1
```

Không in "deploy", exit=1 — lỗi được bắt và deploy bị chặn đúng như mong muốn.

## Dấu hiệu nhận ra sớm

- Script **chỉ** có `set -e` mà không có `pipefail`, không `trap ERR`, không kiểm tường minh.
- Lệnh quan trọng (build, migrate, health-check) nằm trong `if`, sau `||`/`&&`, giữa pipe, hoặc trong `$( )`.
- Có hàm được gọi bằng `if f`/`while f` mà bên trong hàm dựa vào `set -e` để dừng.
- `local x=$(cmd)` với `cmd` có thể lỗi.
- Exit code cuối = 0 nhưng log giữa chừng có dấu vết lỗi — kinh điển của "chạy tiếp sau lỗi".

## Related Topics

- [Exit code và control flow](../reference/exit-code-va-control-flow.md)
- [Viết script an toàn](../skills/viet-script-an-toan.md)
- [Pipe nuốt exit code](pipe-nuot-exit-code.md)
- [Hàm trong bash](../skills/functions.md)
