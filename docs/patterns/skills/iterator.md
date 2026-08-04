---
title: Iterator
sidebar_position: 16
description: "Duyệt mà không lộ cấu trúc bên trong — trong C# pattern này đã nằm trong ngôn ngữ, nên phần đáng học là hai cái bẫy của nó."
tags: [iterator, behavioral, gof, ienumerable, lazy, linq]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Iterator

> **Chốt:** Trong C#, Iterator **đã là một phần của ngôn ngữ** — `IEnumerable<T>`,
> `foreach`, `yield return`. Nên phần đáng học không phải "cách cài" mà là hai cái bẫy:
> **sửa collection đang duyệt** và **duyệt lại là tính lại**.

## Mục tiêu

Duyệt một tập hợp mà người duyệt không cần biết nó là mảng, cây, hay kết quả trả về dần
từ một API — và biết hai chỗ cơ chế đó cắn ngược.

## Ý định gốc (GoF)

Cung cấp cách truy cập tuần tự các phần tử của một tập hợp mà không lộ biểu diễn bên trong.

C# hiện thực hoá sẵn:

```csharp
interface IEnumerable<out T> { IEnumerator<T> GetEnumerator(); }
interface IEnumerator<out T> { T Current { get; } bool MoveNext(); void Reset(); }
```

`foreach` là đường cú pháp cho `GetEnumerator()` + `MoveNext()` + `Current`. Viết
`IEnumerator` tay gần như không bao giờ cần — `yield return` sinh nó hộ.

## Ví dụ xuyên suốt

Chạy bằng `dotnet run 21-iterator.cs` trên .NET 11.0.0.

### Bẫy 1 — sửa collection đang duyệt

```csharp
var ds = new List<string> { "a", "b", "c" };
foreach (var x in ds) if (x == "b") ds.Remove(x);
```

```text
=== Sua collection dang duyet ===
  nem: InvalidOperationException: Collection was modified; enumeration operation may not execute.
```

`List<T>` giữ một `_version` tăng mỗi lần sửa; enumerator so nó mỗi lần `MoveNext()`.
**Đây là hành vi tốt** — nó biến một lỗi âm thầm (bỏ sót phần tử, duyệt hai lần) thành
một exception rõ ràng.

Hai cách sửa đều chạy ra kết quả đúng:

```csharp
foreach (var x in ds2.ToArray()) if (x == "b") ds2.Remove(x);          // duyet ban sao
for (var i = ds3.Count - 1; i >= 0; i--) if (ds3[i] == "b") ds3.RemoveAt(i);   // duyet nguoc
```

```text
=== Cach dung: duyet ban sao, hoac duyet nguoc bang chi so ===
  con lai: [a, c]
  con lai: [a, c]
```

Duyệt ngược bằng chỉ số không cần cấp phát thêm — nên nó là lựa chọn mặc định cho
collection lớn.

**Cảnh báo:** không phải collection nào cũng ném. `ConcurrentDictionary` cho phép sửa
trong lúc duyệt và bạn nhận về một ảnh chụp **không xác định** — phần tử thêm vào giữa
chừng có thể xuất hiện hoặc không. Ở đó không có exception nào cứu bạn.

### Iterator tự viết — duyệt cây

```csharp
public IEnumerable<int> ThuTuGiua()
{
    if (trai is not null) foreach (var v in trai.ThuTuGiua()) yield return v;
    yield return giaTri;
    if (phai is not null) foreach (var v in phai.ThuTuGiua()) yield return v;
}
```

```text
=== Iterator tu viet: duyet cay theo thu tu giua ===
  giua : [1, 3, 4, 5, 7, 8, 9]
  truoc: [5, 3, 1, 4, 8, 7, 9]
  Nguoi goi khong biet gi ve con trai / con phai
```

Đây là giá trị gốc của pattern: **hai thứ tự duyệt khác nhau trên cùng một cấu trúc**, và
người gọi chỉ thấy `IEnumerable<int>`. Không có `if` nào về hình dạng cây ở phía người
dùng.

### Lazy — chỉ tính khi lấy

```csharp
IEnumerable<int> DaySo() { for (var i = 1; ; i++) { demGoi++; yield return i * i; } }
var baCaiDau = DaySo().Take(3).ToList();
```

```text
=== Lazy: chi tinh khi lay, dung khi du ===
  3 phan tu dau: [1, 4, 9], so lan sinh = 3
```

Vòng lặp **vô hạn** nhưng chỉ chạy 3 lần. Đây là thứ mảng không làm được.

### Bẫy 2 — duyệt lại là tính lại

```text
=== Bay cua lazy: duyet lai la tinh lai ===
  Count() = 5, so lan tinh = 5
  Sum()   = 30, so lan tinh = 10   <- tinh lai tu dau
  Sau ToList(): so lan tinh = 15 (khong tang tu 15)
```

**`Count()` rồi `Sum()` chạy phép tính hai lần.** Với `Select(x => x * 2)` thì vô hại; với
`Select(x => GoiApi(x))` thì đó là gấp đôi số lời gọi mạng, và không có gì trong code nói
ra điều đó.

Quy tắc: **chốt một lần bằng `ToList()`/`ToArray()` nếu định duyệt từ hai lần trở lên.**
Sau khi chốt, số lần tính không tăng nữa — dòng cuối của output.

Ca hỏng đầy đủ: [Sửa danh sách đang duyệt](../case-studies/sua-list-dang-duyet.md).

### Trước và sau

| | Trả `List<T>` | Trả `IEnumerable<T>` |
|---|---|---|
| Tính toán | ngay lập tức, toàn bộ | khi lấy, từng phần |
| Duyệt hai lần | rẻ | **tính lại từ đầu** |
| Dãy vô hạn | không | có |
| Bộ nhớ | giữ cả tập | chỉ phần tử hiện tại |
| Người gọi sửa được kết quả không | có — lộ cấu trúc trong | không |
| Ngoại lệ xảy ra lúc nào | lúc gọi hàm | lúc duyệt — **xa chỗ gây lỗi** |

Dòng cuối là bẫy hay gặp thứ ba: một hàm `IEnumerable<T> Doc(string tep)` với
`yield return` sẽ **không ném** khi tệp không tồn tại cho tới khi ai đó bắt đầu duyệt —
có thể là ở một tầng khác, sau một `try/catch` đã đóng.

## Khi nào KHÔNG trả `IEnumerable<T>`

| Tình huống | Trả gì |
|---|---|
| Người gọi gần như chắc chắn duyệt nhiều lần | `IReadOnlyList<T>` |
| Cần biết số lượng | `IReadOnlyCollection<T>` — có `Count` không phải duyệt |
| Kết quả đến từ CSDL và kết nối sẽ đóng | Chốt bằng `ToList()` trước khi trả |
| Muốn ngoại lệ xảy ra tại chỗ gọi | Chốt, hoặc tách phần kiểm tra ra khỏi phần `yield` |

Dòng cuối cùng có kỹ thuật riêng: tách hàm làm hai, hàm ngoài kiểm tra tham số rồi gọi
hàm trong (`private IEnumerable<T> DocLoi(...)`) chứa `yield`. Kiểm tra chạy ngay, phần
duyệt vẫn lazy.

## Trade-offs

| Được | Mất |
|---|---|
| Người duyệt không biết cấu trúc bên trong | Không truy cập ngẫu nhiên; không có `[i]` |
| Nhiều thứ tự duyệt trên cùng cấu trúc | Mỗi thứ tự là một method, dễ trôi ra nhiều chỗ |
| Lazy — dãy vô hạn, tiết kiệm bộ nhớ | Duyệt lại là tính lại; ngoại lệ xảy ra xa chỗ gọi |
| Ghép được với LINQ | Chi phí allocation cho state machine mỗi lần duyệt |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Sửa collection trong `foreach` | `InvalidOperationException` (may) hoặc kết quả không xác định (rủi) |
| Duyệt `IEnumerable` nhiều lần | Tính lại — gấp đôi lời gọi API/CSDL, im lặng |
| Trả `IEnumerable` từ repository rồi đóng kết nối | Duyệt sau khi kết nối đóng → ném ở chỗ không ai ngờ |
| `yield return` trong hàm có kiểm tra tham số | Kiểm tra không chạy cho tới khi duyệt |
| Duyệt đệ quy cây bằng `yield` lồng nhiều tầng | Chi phí O(độ sâu) cho **mỗi** phần tử; cây sâu thì rất chậm |
| Cài `IEnumerator` tay | Gần như luôn không cần; `yield return` đúng hơn và ngắn hơn |

Dòng áp chót đáng nhớ với cây sâu: mỗi `yield return` lồng phải đi qua tất cả các tầng
enumerator ở trên. Với cây sâu, dùng stack tường minh thay vì đệ quy.

## FAQ

<details>
<summary>Khi nào dùng <code>IAsyncEnumerable&lt;T&gt;</code>?</summary>

Khi mỗi phần tử cần một thao tác bất đồng bộ để lấy: đọc từng dòng từ mạng, phân trang
API, đọc stream.

```csharp
await foreach (var d in DocTungTrang(ct)) { ... }
```

Nó giữ đúng ưu điểm lazy mà không chặn luồng. Và giữ nguyên cả hai cái bẫy ở trên — duyệt
lại vẫn là gọi lại API.

</details>

<details>
<summary><code>yield return</code> có tốn kém không?</summary>

Trình biên dịch sinh ra một lớp state machine; mỗi lần gọi `GetEnumerator()` cấp phát một
thể hiện. Với vòng lặp nóng chạy hàng triệu lần, chi phí đó đo được.

Lối thoát khi thật sự cần: trả về một struct enumerator tự viết (như `List<T>.Enumerator`
làm), hoặc dùng `Span<T>` nếu dữ liệu liền kề. Chỉ làm sau khi đã đo.

</details>

<details>
<summary>Vì sao <code>Reset()</code> có trong interface mà không ai dùng?</summary>

Nó là di sản từ COM interop. Với iterator sinh bởi `yield return`, `Reset()` ném
`NotSupportedException`.

Cách "reset" đúng là gọi lại `GetEnumerator()` — tức là bắt đầu một `foreach` mới. Đó
cũng chính là lý do "duyệt lại là tính lại".

</details>

## Related Topics

- [Composite](composite.md) — cấu trúc cây mà Iterator hay dùng để duyệt
- [Visitor](visitor.md) — thao tác trên cây; Iterator lo *thứ tự*, Visitor lo *việc làm gì*
- [Strategy](strategy.md) — nhiều thứ tự duyệt là nhiều strategy duyệt
- [Interpreter](interpreter.md) — duyệt cây biểu thức
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng tra triệu chứng

## References

- GoF — *Design Patterns*, Iterator
- Microsoft — *Iterators* (C# programming guide)
