---
title: Tiến trình chết không để lại log nào
sidebar_position: 7
description: "Một thư mục trỏ ngược về cha tạo chu trình trong cây composite — StackOverflowException không bắt được, không chạy finally, không ghi log."
tags: [case-study, composite, iterator, recursion, stack-overflow]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Tiến trình chết không để lại log nào

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 13-composite.cs`
> trên .NET 11.0.0.

## Bối cảnh

Dịch vụ quản lý tài liệu dùng [Composite](../skills/composite.md) cho cây thư mục:

```csharp
interface INut { string Ten { get; } int KichThuoc(); int DemTep(); }

sealed class ThuMuc(string ten) : INut
{
    private readonly List<INut> _con = [];
    public void Them(INut n) => _con.Add(n);
    public int KichThuoc() => _con.Sum(c => c.KichThuoc());
}
```

Hoạt động tốt:

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

Một tính năng mới cho phép người dùng **kéo thả** thư mục để sắp xếp lại.

## Triệu chứng

Worker tính dung lượng thư mục chạy đêm bắt đầu chết. Triệu chứng:

- Tiến trình biến mất khỏi danh sách process.
- **Không có dòng log nào** ở mức `Error` hay `Fatal`.
- Dòng log cuối cùng là `"bat dau tinh dung luong"`.
- Không có `finally` nào chạy — kết nối CSDL bị bỏ dở, khoá phân tán không được nhả.
- Health check báo dịch vụ chết sau 30 giây.

Trên môi trường dev, không tái hiện được.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| OOM killer của container | Tiến trình biến mất không log | `dmesg` không có gì; giới hạn RAM còn dư nhiều |
| Deadlock rồi bị health check giết | Không log là đặc trưng của treo | Dump thread cho thấy **một** thread đang chạy rất sâu |
| Kết nối CSDL bị đứt | Log cuối là ngay trước truy vấn | Truy vấn đó thành công — có trong log của CSDL |
| Bug trong `Sum()` của LINQ | Tuyệt vọng | Không |

Bằng chứng quyết định là **dump thread**: một call stack với hàng nghìn khung `KichThuoc`
lồng nhau. Đó là lúc `StackOverflowException` vào tầm ngắm — và cùng lúc giải thích được
vì sao không có log.

## Nguyên nhân thật

Tính năng kéo thả cho phép người dùng thả thư mục `a` **vào bên trong** thư mục `b`, trong
khi `b` đã nằm trong `a`.

```csharp
var a = new ThuMuc("a");
var b = new ThuMuc("b");
a.Them(b);
b.Them(a);                       // chu trinh: b tro nguoc ve a
```

Cấu trúc không còn là cây. `KichThuoc()` gọi đệ quy vô hạn.

```text
=== Chu trinh: thu muc con tro nguoc ve cha ===
  nem: InvalidOperationException: do sau vuot 200 — nghi co chu trinh (that su se la StackOverflow)
```

*(Ví dụ ở trên cố tình đặt bộ đếm chặn ở độ sâu 200 để in ra được thông báo. Trong code
thật không có bộ đếm đó.)*

**Vì sao không có log:** `StackOverflowException` trong .NET (từ 2.0 trở đi) **không bắt
được**. Không `catch`, không `finally`, không `AppDomain.UnhandledException`. Runtime kết
thúc tiến trình ngay lập tức — vì không còn stack để chạy handler.

Đó là lý do triệu chứng trông giống bị `kill -9`, và là lý do ba giả thuyết đầu đều nhắm
vào hạ tầng.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test `KichThuoc()` | Xanh | Dữ liệu test là cây thật, không có chu trình |
| Test tính năng kéo thả | Xanh | Kiểm "thư mục có được chuyển không", không kiểm cấu trúc kết quả |
| Kiểu dữ liệu | Không giúp | `List<INut>` cho phép chứa bất cứ gì, kể cả tổ tiên |
| Trình biên dịch | Im lặng | Không có khái niệm "cây" trong hệ kiểu |
| Test tải | Xanh | Sinh cây ngẫu nhiên hợp lệ |

Điểm mù thật sự: **`Them()` là chỗ lỗi được tạo ra, nhưng `KichThuoc()` là chỗ nó nổ.**
Hai chỗ cách nhau nhiều giờ và một lần restart — nên không ai nối chúng lại.

## Cách sửa

### Sửa gấp — chặn khi duyệt

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

350 = 100 + 250: mỗi tệp đếm đúng một lần dù cấu trúc có vòng. Tiến trình không chết nữa.

Nhưng dữ liệu vẫn hỏng — chỉ là không nổ.

### Sửa đúng — chặn khi **thêm**

```csharp
public void Them(INut n)
{
    if (n is ThuMuc t && (t == this || t.ChuaSau(this)))
        throw new InvalidOperationException($"khong the them \"{n.Ten}\" vao \"{Ten}\": tao chu trinh");
    _con.Add(n);
}
```

Lỗi giờ xuất hiện **tại thao tác kéo thả**, với thông báo người dùng hiểu được, thay vì
lúc 2 giờ sáng trong một worker khác.

### Ba mức phòng, chọn theo ngữ cảnh

| Mức | Cách | Chi phí | Chọn khi |
|---|---|---|---|
| Chặn lúc thêm | Kiểm tổ tiên trong `Them()` | O(độ sâu) mỗi lần thêm | **Mặc định** |
| Chặn lúc duyệt | `HashSet` nút đã thăm | O(số nút) bộ nhớ mỗi lần duyệt | Cây đến từ nguồn không kiểm soát được |
| Chặn bằng kiểu | Cây bất biến, dựng từ dưới lên | Không sửa cây tại chỗ được | Cấu trúc dựng một lần |

Nên làm **cả hai mức đầu**: mức một chặn dữ liệu hỏng, mức hai bảo vệ khỏi dữ liệu hỏng đã
có sẵn trong CSDL từ trước.

### Và: bỏ đệ quy cho cây từ nguồn ngoài

```csharp
var stack = new Stack<INut>([goc]);
while (stack.Count > 0) { ... }
```

Bộ nhớ chuyển từ call stack (~1 MB) sang heap. Với cây do **người dùng** nạp lên, đệ quy
là một vector DoS: một cây sâu 100.000 tầng đủ giết tiến trình mà không cần chu trình nào.

## Dấu hiệu nhận ra sớm

```sql
-- Neu cay luu trong CSDL: tim chu trinh bang de quy co gioi han
WITH RECURSIVE duong(id, cha, sau) AS (
  SELECT id, cha_id, 1 FROM thu_muc WHERE cha_id IS NULL
  UNION ALL
  SELECT t.id, t.cha_id, d.sau + 1 FROM thu_muc t JOIN duong d ON t.cha_id = d.id
  WHERE d.sau < 100
)
SELECT count(*) FROM duong WHERE sau >= 100;   -- > 0 la nghi co chu trinh
```

Ba câu hỏi cho code review:

1. `Them()` có kiểm tra nút mới có phải tổ tiên của mình không?
2. Có hàm đệ quy nào chạy trên cấu trúc do **người dùng** dựng không?
3. Nếu tiến trình chết vì `StackOverflow`, bạn có bằng chứng gì? (Câu trả lời đúng:
   *không có gì* — nên phải phòng, không thể phát hiện sau.)

## Related Topics

- [Composite](../skills/composite.md) — pattern gây ra ca này, và ba mức phòng chu trình
- [Iterator](../skills/iterator.md) — duyệt bằng stack tường minh thay vì đệ quy
- [Case study — Design Patterns](index.md)
