---
title: Quoting và expansion
sidebar_position: 3
description: "Bash nở biến rồi cắt từ rồi khớp glob — không bọc nháy kép quanh biến là mời word splitting và glob phá code."
tags: [quoting, expansion, word-splitting, glob, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Quoting và expansion

> **Chốt:** Bash **nở biến trước**, rồi mới **word splitting** theo `IFS`, rồi mới **glob** — hai bước cuối làm việc trên *kết quả* của bước nở. `"$var"` tắt đúng hai bước cuối đó. Quy tắc một dòng: **luôn bọc nháy kép quanh biến trừ khi bạn cố ý muốn split hoặc glob.**

## Mục tiêu

- Phân biệt ba mức nháy: `'...'`, `"..."`, và không nháy — chúng bật/tắt các bước expansion khác nhau.
- Hiểu **thứ tự** các bước expansion, và vì sao word splitting + glob xảy ra *sau* khi nở biến.
- Biết chính xác khi nào `"$var"` cứu bạn và khi nào bỏ nháy là bug im lặng.

## Tổng quan

Khi bash gặp một dòng lệnh, nó không đưa thẳng cho chương trình. Nó chạy một **pipeline expansion** theo thứ tự cố định:

1. **Brace expansion** — `{a,b,c}` → `a b c`
2. **Tilde expansion** — `~` → `$HOME`
3. **Parameter expansion** — `$var`, `${var}`
4. **Command substitution** — `$(...)`, `` `...` ``
5. **Arithmetic expansion** — `$(( ... ))`
6. **Word splitting** — cắt kết quả các bước trên theo `IFS`
7. **Pathname expansion (globbing)** — `*`, `?`, `[...]` khớp tên file

Điểm mấu chốt nằm ở thứ tự: **word splitting (6) và globbing (7) chạy SAU parameter expansion (3).** Nghĩa là bash nở `$var` thành nội dung của nó *trước*, rồi mới nhìn vào nội dung đó xem có dấu cách để cắt, có `*` để khớp file. Đó chính là lý do `"$var"` cứu bạn: nháy kép **không** chặn bước 3 (biến vẫn nở), nhưng **chặn** bước 6 và 7 trên kết quả.

Ba mức nháy, tóm gọn:

| Dạng | `$var` nở? | word split? | glob? |
|---|---|---|---|
| `'...'` (nháy đơn) | ❌ literal tuyệt đối | ❌ | ❌ |
| `"..."` (nháy kép) | ✅ | ❌ | ❌ |
| không nháy | ✅ | ✅ | ✅ |

`"$var"` là điểm ngọt: giữ được giá trị biến, nhưng khoá luôn hai cái bẫy phía sau.

## Ví dụ

> Chạy thật 2026-08-05 · bash 5.3.9(1) trên Ubuntu. Coreutils ở máy này là uutils 0.8.0, không phải GNU — output có thể lệch nhỏ so với GNU coreutils.
>
> Các ví dụ chạy trong `env -i bash --noprofile --norc` để `IFS` và các option ở mặc định sạch — shell tương tác có thể đã đổi `IFS`, làm word splitting không tái hiện đúng.

### 1. Ba mức nháy

```bash
name="Bash"
echo 'single: $name khong no'
echo "double: $name co no"
echo brace: {a,b,c}
echo "arith: $(( 2 + 3 * 4 ))"
echo "cmdsub: $(date +%Y)"
```

```
single: $name khong no
double: Bash co no
brace: a b c
arith: 14
cmdsub: 2026
```

Nháy đơn giữ `$name` nguyên chữ; nháy kép nở nó. `{a,b,c}` nở dù không có nháy vì brace expansion đứng đầu pipeline.

### 2. Word splitting theo IFS

`IFS` mặc định là space + tab + newline. Đây là mấu chốt nên xem tận byte:

```bash
printf '%s' "$IFS" | od -An -c
#       \t  \n     ← space, tab, newline
```

Cho biến chứa **nhiều dấu cách**, rồi lặp qua nó có nháy và không nháy — đếm số vòng lặp là thấy split:

```bash
var="hello    world"
i=0; for x in $var;   do i=$((i+1)); echo "  no-quote [$i] <$x>"; done
i=0; for x in "$var"; do i=$((i+1)); echo "  quote    [$i] <$x>"; done
```

```
  no-quote [1] <hello>
  no-quote [2] <world>
  quote    [1] <hello    world>
```

Không nháy: bash cắt `$var` thành **2 từ** theo `IFS`, và các dấu cách liên tiếp gộp thành một dải cắt (mất luôn khoảng trắng thừa). Có nháy: **1 từ duy nhất**, nguyên vẹn cả bốn dấu cách. `echo $var` một mình *không* để lộ điều này vì `echo` in các đối số cách nhau bằng một dấu cách — dùng vòng lặp mới thấy rõ.

### 3. Biến chứa dấu cách với `rm` (dùng `echo` thay `rm` cho an toàn)

```bash
touch "my file.txt" other.txt
f="my file.txt"
echo rm $f      # khong nhay
echo rm "$f"    # co nhay
```

```
rm my file.txt
rm my file.txt
```

Output nhìn giống nhau nhưng **ý nghĩa khác hẳn**. Không nháy, `rm` nhận **hai** đối số: `my` và `file.txt` — nó sẽ cố xoá hai file không tồn tại (hoặc tệ hơn, xoá nhầm nếu tình cờ có). Có nháy, `rm` nhận **một** đối số `my file.txt` đúng như tên file. Đây là lớp bug kinh điển; xem [case study](../case-studies/bien-khong-nhay-word-splitting.md).

### 4. Glob nở biến chứa `*`

```bash
star="*"
echo $star      # khong nhay
echo "$star"    # co nhay
```

```
my file.txt other.txt
*
```

Không nháy: bash nở `$star` thành `*` (bước 3), rồi glob (bước 7) khớp `*` với mọi file trong thư mục → danh sách file. Có nháy: glob bị tắt, `*` giữ nguyên là ký tự. Nếu bạn định in một dấu sao mà quên nháy, bạn in ra cả thư mục.

### 5. Glob không khớp thì để nguyên literal

```bash
echo *.txt    # co file khop
echo *.md     # khong co file .md nao
```

```
my file.txt other.txt
*.md
```

Đây là cạm bẫy lớn: khi **không có file nào khớp**, bash (mặc định) **không báo lỗi** mà trả về **chính pattern chưa nở**. Vòng lặp `for f in *.md` sẽ chạy đúng một vòng với `$f` bằng chuỗi literal `*.md` — không phải "không vòng nào". Xem [glob không khớp](../case-studies/glob-khong-khop.md).

### 6. Command substitution cũng bị word-split nếu không nháy

```bash
v="a b"
i=0; for x in $(echo "$v");   do i=$((i+1)); echo "  [$i] <$x>"; done
i=0; for x in "$(echo "$v")"; do i=$((i+1)); echo "  [$i] <$x>"; done
echo "backtick: `echo old`"
echo "dollar:   $(echo new)"
```

```
  [1] <a>
  [2] <b>
  [1] <a b>
backtick: old
dollar:   new
```

Kết quả của `$(...)` đi qua đúng pipeline như biến: không nháy thì bị cắt theo `IFS`. Dùng `$(...)` thay `` `...` `` — cú pháp cũ khó lồng nhau và khó đọc dấu escape.

### 7. Ranh giới biến với `${var}`, và bằng chứng thứ tự expansion

```bash
pre="my"
echo "a[$pre_file]b"     # bash tim bien ten "pre_file" -> rong
echo "a[${pre}_file]b"   # {} cat ranh gioi -> "my_file"

g="*.txt"
echo $g                  # bien no ra "*.txt" TRUOC, glob chay SAU
```

```
a[]b
a[my_file]b
my file.txt other.txt
```

Hai dòng đầu: không có `{}`, bash coi `pre_file` là một tên biến (rỗng). `${pre}_file` cắt ranh giới rõ ràng. Dòng cuối là bằng chứng thứ tự: `$g` nở thành chuỗi `*.txt`, *rồi* bước glob khớp nó với file — nếu glob chạy trước khi nở biến thì `$g` đã không thể thành pattern.

## Trade-offs

| Lựa chọn | Được | Mất / khi nào cố tình bỏ |
|---|---|---|
| `"$var"` (mặc định nên dùng) | An toàn với dấu cách, `*`, ký tự lạ | Không split được — nếu bạn *muốn* tách một chuỗi thành nhiều đối số thì đừng nháy |
| `$var` không nháy | Tận dụng word split + glob khi bạn chủ đích | Bug im lặng khi giá trị chứa space/glob ngoài dự tính |
| `'...'` nháy đơn | Literal tuyệt đối, an toàn nhất cho chuỗi cố định | Không nở được biến nào — vô dụng khi cần `$var` |
| `$(...)` | Dễ đọc, lồng nhau được | (không có nhược điểm thực sự so với backtick) |
| Bỏ nháy quanh `$(cmd)` để split output | Lấy nhiều token từ một dòng | Mất kiểm soát nếu output chứa space bất ngờ — cân nhắc `mapfile`/`read -a` |

## Common Mistakes

- **`for f in $(ls)`** — output `ls` bị word-split theo `IFS`, vỡ ngay với tên file có dấu cách. Dùng glob trực tiếp: `for f in *`.
- **`rm $file`** thay vì `rm "$file"` — tên file có dấu cách biến thành nhiều đối số. Lớp bug xoá nhầm nguy hiểm nhất.
- **`if [ $x = "y" ]`** với `$x` rỗng hoặc chứa space → cú pháp `[` vỡ. Luôn `[ "$x" = "y" ]` (hoặc dùng `[[ ]]`).
- **Tưởng `'...'` nở biến** — nháy đơn *không bao giờ* nở `$`. `echo 'PATH=$PATH'` in nguyên chữ.
- **Tưởng glob không khớp trả về rỗng** — mặc định nó trả về pattern literal. Vòng `for f in *.md` chạy với `$f="*.md"` khi không có file `.md`. Bật `shopt -s nullglob` nếu muốn rỗng.
- **Dùng `${var}` ở mọi nơi cho "an toàn"** — chỉ cần `{}` khi có ranh giới mập mờ (`${pre}_file`). Dùng bừa làm code rối; cái *thật sự* an toàn là nháy kép, không phải ngoặc nhọn.

## FAQ

<details>
<summary>`"$var"` và `$&#123;var&#125;` khác nhau chỗ nào?</summary>

Hai chuyện độc lập. `${var}` chỉ là **ranh giới cú pháp** — cần khi ký tự sau tên biến có thể bị hiểu nhầm là một phần của tên (`${pre}_file`). Nó **không** chống word splitting hay glob. `"$var"` (nháy kép) mới là thứ tắt word splitting + glob. Muốn cả hai thì viết `"${var}"`. Nếu chỉ được chọn một để phòng bug, chọn **nháy kép**.

</details>

<details>
<summary>Vậy có bao giờ nên bỏ nháy quanh biến không?</summary>

Có, khi bạn **cố ý** muốn split hoặc glob. Ví dụ một biến chứa nhiều flag: `opts="-l -a"; ls $opts` — muốn nó thành hai đối số riêng. Nhưng đây là con dao hai lưỡi; với dữ liệu thật sự nhiều token, `mapfile` hoặc mảng (`arr=(-l -a); ls "${arr[@]}"`) an toàn hơn vì không phụ thuộc vào giá trị không chứa space/glob ngoài ý muốn.

</details>

<details>
<summary>Tại sao `echo $var` với biến hai từ vẫn in ra như bình thường?</summary>

Vì `echo` in các đối số cách nhau bằng một dấu cách, nên `echo hello world` (hai đối số) và `echo "hello world"` (một đối số) *nhìn* giống hệt trên màn hình. Word splitting vẫn xảy ra — bạn chỉ không thấy hậu quả. Muốn thấy, đếm đối số bằng vòng `for`, hoặc dùng `printf '<%s>\n' $var` để mỗi đối số một dòng.

</details>

<details>
<summary>Làm sao tắt globbing hoàn toàn?</summary>

`set -f` (hay `set -o noglob`) tắt pathname expansion cho cả shell. Hữu ích trong script xử lý pattern như dữ liệu (ví dụ truyền `*` cho một chương trình khác) và không muốn bash "giúp". Bật lại bằng `set +f`. Ở chiều ngược lại, `shopt -s nullglob` khiến glob không khớp trả về **rỗng** thay vì pattern literal — sửa đúng cạm bẫy ở ví dụ 5.

</details>

## Related Topics

- [Shell là gì](shell-la-gi.md)
- [Streams và redirection](streams-va-redirection.md)
- [Biến, mảng và expansion](../skills/variables-arrays-expansion.md)
- [Biến không nháy — word splitting](../case-studies/bien-khong-nhay-word-splitting.md)
- [Glob không khớp](../case-studies/glob-khong-khop.md)

## References

- Bash Reference Manual — [Shell Expansions](https://www.gnu.org/software/bash/manual/html_node/Shell-Expansions.html) (thứ tự chính thức của pipeline)
- Bash Reference Manual — [Word Splitting](https://www.gnu.org/software/bash/manual/html_node/Word-Splitting.html)
- Bash Reference Manual — [Filename Expansion](https://www.gnu.org/software/bash/manual/html_node/Filename-Expansion.html) (`nullglob`, `failglob`)
- Greg's Wiki — [Quotes](https://mywiki.wooledge.org/Quotes) và [BashPitfalls](https://mywiki.wooledge.org/BashPitfalls)
