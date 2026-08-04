---
title: Composite
sidebar_position: 8
description: "Xử lý một cái và một nhóm cái bằng cùng một interface — và cái bẫy là cây có chu trình thì đệ quy không bao giờ dừng."
tags: [composite, structural, gof, tree, recursion]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Composite

> **Chốt:** Composite xoá bỏ câu `if (la nhom) ... else ...` ở **mọi** chỗ dùng, bằng
> cách cho lá và nhánh cài chung một interface. Cái giá: cấu trúc cây trở thành dữ liệu
> lúc chạy, và **không có gì đảm bảo nó là cây** — chu trình làm đệ quy chạy tới
> `StackOverflow`.

## Mục tiêu

Chặn kiểu code trong đó mỗi thao tác trên một cấu trúc lồng nhau phải tự hỏi *"cái này là
một phần tử hay một nhóm?"* — vì câu hỏi đó bị lặp ở mọi hàm, và quên một chỗ là sai một
kiểu.

## Ý định gốc (GoF)

Ghép các đối tượng thành cấu trúc cây để biểu diễn quan hệ toàn thể–bộ phận. Composite cho
phép người dùng xử lý đối tượng đơn lẻ và nhóm đối tượng **như nhau**.

```csharp
interface INut { string Ten { get; } int KichThuoc(); int DemTep(); }

sealed class Tep(string ten, int bytes) : INut { ... }      // la
sealed class ThuMuc(string ten) : INut { ... }              // nhanh, chua List<INut>
```

Điểm mấu chốt: `ThuMuc` chứa `List<INut>` — tức là nó có thể chứa cả `Tep` lẫn `ThuMuc`
khác, và nó **không cần biết** phân biệt.

## Ví dụ xuyên suốt — cây thư mục

Chạy bằng `dotnet run 13-composite.cs` trên .NET 11.0.0.

### Cùng một lời gọi cho lá và cho nhánh

```csharp
foreach (INut n in new INut[] { new Tep("README.md", 800), src, goc })
    Console.WriteLine($"  {n.Ten,-12} kich thuoc = {n.KichThuoc(),6}  so tep = {n.DemTep()}");
```

```text
=== Cung mot loi goi cho la va cho nhanh ===
  README.md    kich thuoc =    800  so tep = 1
  src          kich thuoc =   3500  so tep = 2
  du-an        kich thuoc =   7500  so tep = 4
```

Vòng lặp này **không có một câu `if` nào** về loại nút. `Tep.DemTep()` trả `1`,
`ThuMuc.DemTep()` cộng dồn con — đa hình lo phần còn lại.

### Đệ quy đi qua toàn cây

```csharp
public int KichThuoc() => _con.Sum(c => c.KichThuoc());
```

```text
=== Cay ===
du-an/  (7500 bytes, 4 tep)
  src/  (3500 bytes, 2 tep)
    Program.cs  (2400 bytes)
    Xuong.cs  (1100 bytes)
  test/  (3200 bytes, 1 tep)
    XuongTest.cs  (3200 bytes)
  README.md  (800 bytes)
```

Một dòng `Sum` xử lý cây sâu bao nhiêu tầng cũng được. Đây là phần bán được của Composite.

### Cái bẫy — chu trình

Không có gì trong kiểu ngăn `b` chứa `a` trong khi `a` đã chứa `b`:

```csharp
var a = new ThuMuc("a");
var b = new ThuMuc("b");
a.Them(new Tep("a.txt", 100));
b.Them(new Tep("b.txt", 250));
a.Them(b);
b.Them(a);                       // chu trinh: b tro nguoc ve a
```

```text
=== Chu trinh: thu muc con tro nguoc ve cha ===
  nem: InvalidOperationException: do sau vuot 200 — nghi co chu trinh (that su se la StackOverflow)
```

Ví dụ này **cố tình** đặt bộ đếm độ sâu chặn ở 200 để in ra được thông báo. Trong code
thật không có bộ đếm đó, và kết quả là `StackOverflowException` — loại exception
**không bắt được** trong .NET: tiến trình chết ngay, không chạy `finally`, không ghi log
nào của bạn.

### Cách chặn — nhớ node đã thăm

```csharp
public int KichThuocAnToan(HashSet<INut> daTham)
{
    if (!daTham.Add(this)) return 0;
    return _con.Sum(c => c is ThuMuc t ? t.KichThuocAnToan(daTham) : c.KichThuoc());
}
```

```text
=== Co chan chu trinh ===
  kich thuoc = 350
```

350 = 100 + 250, mỗi tệp đếm đúng một lần dù cấu trúc có vòng.

### Ba mức phòng chu trình

| Mức | Cách | Chi phí |
|---|---|---|
| **Chặn lúc thêm** | `Them()` kiểm tra nút mới có phải tổ tiên của mình không | O(độ sâu) mỗi lần thêm; đây là mức nên chọn mặc định |
| **Chặn lúc duyệt** | `HashSet` nút đã thăm, như trên | O(số nút) bộ nhớ mỗi lần duyệt |
| **Chặn bằng kiểu** | Cây bất biến, dựng từ dưới lên — con phải tồn tại trước cha | Không tạo được chu trình; nhưng khó sửa cây tại chỗ |

Ca hỏng đầy đủ: [Duyệt cây không bao giờ dừng](../case-studies/duyet-cay-khong-bao-gio-dung.md).

## Đánh đổi thiết kế quan trọng nhất — `Them()` nằm ở đâu

Đây là chỗ GoF nói thẳng là không có câu trả lời đúng:

| Cách | Được | Mất |
|---|---|---|
| `Them`/`Xoa` ở **interface chung** | Người gọi xử lý mọi nút như nhau, hoàn toàn trong suốt | `Tep.Them()` phải ném `NotSupportedException` — vi phạm [ISP](../reference/solid.md#i--interface-segregation) |
| `Them`/`Xoa` chỉ ở **lớp nhánh** | Kiểu an toàn, không có method vô nghĩa | Người gọi phải ép kiểu / kiểm tra kiểu khi muốn sửa cây |

**Khuyến nghị thực dụng:** đặt ở lớp nhánh. Lý do: phần *đọc* cây (`KichThuoc`,
`DemTep`) là phần được gọi ở khắp nơi và cần đồng nhất; phần *sửa* cây thường chỉ xảy ra
ở một chỗ dựng, và chỗ đó biết rõ mình đang cầm nhánh hay lá.

Ví dụ ở trang này theo hướng đó — `Them` chỉ có trên `ThuMuc`.

## Nhận ra nó ngoài cây thư mục

| Ngữ cảnh | Lá | Nhánh |
|---|---|---|
| Điều kiện lọc | `Cot > 5` | `And(...)`, `Or(...)` |
| Quyền | Một quyền đơn | Nhóm quyền / vai trò |
| Giao diện | Nút, nhãn | Panel, layout |
| Cơ cấu tổ chức | Nhân viên | Phòng ban |
| Đơn hàng | Sản phẩm | Combo / bộ sản phẩm |

Dòng đầu là chỗ Composite và [Interpreter](interpreter.md) gặp nhau: cây biểu thức lọc
vừa là Composite (cấu trúc) vừa là Interpreter (ngữ nghĩa).

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Cấu trúc chỉ có **một** tầng lồng | `List<T>` thường là đủ; Composite thêm interface không mua gì |
| Lá và nhánh có tập thao tác khác hẳn nhau | Ép chung một interface sinh ra hàng loạt `NotSupported` |
| Cần thao tác theo kiểu nút, không đồng nhất | Xem [Visitor](visitor.md) |
| Cây rất sâu (nghìn tầng) | Đệ quy tràn stack; phải viết duyệt bằng vòng lặp + stack tường minh |

## Trade-offs

| Được | Mất |
|---|---|
| Không còn `if (la nhom)` ở mọi chỗ dùng | Interface chung phải là mẫu số chung — dễ trở nên quá rộng hoặc quá hẹp |
| Thêm loại nút mới không sửa code duyệt | Không có gì đảm bảo cấu trúc thật sự là cây |
| Đệ quy một dòng xử lý mọi độ sâu | Chu trình → `StackOverflow`, không bắt được |
| Cấu trúc dựng lúc chạy, từ cấu hình | Khó biết cây đang có hình gì khi debug |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Không chặn chu trình | Tiến trình chết vì `StackOverflowException` — không log, không `finally` |
| Đặt `Them`/`Xoa` ở interface chung rồi ném trong lá | Lỗi dời từ compile time sang runtime |
| Tính lại `KichThuoc()` mỗi lần gọi trên cây lớn | O(n) mỗi lần đọc; cần cache và **vô hiệu hoá cache khi sửa cây** |
| Cho nút con giữ tham chiếu ngược lên cha mà không quản lý | Rò rỉ khi cây bị bỏ; và tạo chu trình rất dễ |
| Đệ quy trên cây do người dùng nạp lên | Người dùng cấp cây sâu 100.000 tầng là một vector DoS |

Dòng thứ ba đáng chú ý trong ví dụ trên: hàm `In()` gọi `KichThuoc()` và `DemTep()` ở mỗi
nút, nên cây được duyệt lại nhiều lần. Với cây nhỏ thì không sao; với cây thật thì đó là
O(n × độ sâu).

## FAQ

<details>
<summary>Composite khác Decorator chỗ nào? Cả hai đều bọc.</summary>

Số con. [Decorator](decorator.md) bọc **đúng một** đối tượng và mục đích là *thêm hành
vi*. Composite chứa **nhiều** con và mục đích là *gộp cấu trúc*.

Hệ quả thực tế: chuỗi decorator luôn là một đường thẳng; cây composite phân nhánh.

</details>

<details>
<summary>Duyệt cây rất sâu mà không tràn stack thì làm sao?</summary>

Thay đệ quy bằng vòng lặp với stack tường minh:

```csharp
var stack = new Stack<INut>([goc]);
var tong = 0;
while (stack.Count > 0)
{
    var n = stack.Pop();
    if (n is ThuMuc t) foreach (var c in t.Con) stack.Push(c);
    else tong += n.KichThuoc();
}
```

Bộ nhớ chuyển từ call stack (giới hạn ~1 MB) sang heap. Kèm luôn `HashSet` chặn chu trình
là bạn có bản an toàn cho dữ liệu từ ngoài vào.

</details>

<details>
<summary>Có nên cache kích thước ở mỗi nhánh không?</summary>

Có, khi cây được đọc nhiều hơn sửa — trường hợp phổ biến. Nhưng phải giải quyết việc **vô
hiệu hoá cache**: `Them()` phải xoá cache của mình *và của mọi tổ tiên*, nên nhánh cần
tham chiếu lên cha.

Tham chiếu lên cha lại làm việc tạo chu trình dễ hơn. Nếu chọn hướng này, chặn chu trình
ngay trong `Them()` là bắt buộc chứ không còn là tuỳ chọn.

</details>

## Related Topics

- [Decorator](decorator.md) — bọc một, không phải chứa nhiều
- [Iterator](iterator.md) — cách duyệt cây mà không lộ cấu trúc bên trong
- [Visitor](visitor.md) — thêm thao tác mới lên cây mà không sửa các lớp nút
- [Interpreter](interpreter.md) — cây composite mang ngữ nghĩa của một ngôn ngữ nhỏ
- [Builder](builder.md) — hay dùng để dựng cây composite gọn gàng

## References

- GoF — *Design Patterns*, Composite
