---
title: Visitor
sidebar_position: 23
description: "Thêm thao tác mới lên cây kiểu cố định mà không sửa lớp nút — đổi lại thêm kiểu nút mới là mọi visitor không biên dịch được, và đó là đặc điểm tốt."
tags: [visitor, behavioral, gof, double-dispatch, expression-tree]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Visitor

> **Chốt:** Visitor đảo chiều đánh đổi: **thêm thao tác rẻ, thêm kiểu nút đắt** — ngược
> hẳn với kế thừa thường. Chỉ chọn nó khi tập kiểu nút **ổn định** và số thao tác còn
> tăng. Đoán sai chiều này là mỗi lần thêm một kiểu phải sửa mọi visitor.

## Mục tiêu

Thêm thao tác mới lên một cây (AST, cây tài liệu, cây biểu thức) mà không phải sửa vào các
lớp nút mỗi lần — vì mỗi thao tác nhét thêm vào lớp nút là một trách nhiệm không thuộc về
nó.

## Ý định gốc (GoF)

Biểu diễn một thao tác cần thực hiện trên các phần tử của một cấu trúc. Visitor cho phép
định nghĩa thao tác mới mà không đổi lớp của các phần tử.

```csharp
interface IVisitor<T> { T Tham(So n); T Tham(Cong n); T Tham(Nhan n); T Tham(Tru n); }
interface INut { T ChoTham<T>(IVisitor<T> v); }

sealed class So(decimal giaTri) : INut
{
    public T ChoTham<T>(IVisitor<T> v) => v.Tham(this);   // <- day la nua thu hai cua double dispatch
}
```

Dòng cuối là toàn bộ cơ chế: **double dispatch**. Lời gọi đầu chọn *kiểu nút* (đa hình
thường), lời gọi thứ hai chọn *thao tác* (nạp chồng theo kiểu tham số). C# không có
multiple dispatch sẵn, nên phải viết tay bước lòng vòng này.

## Ví dụ xuyên suốt — cây biểu thức số học

Chạy bằng `dotnet run 28-visitor.cs` trên .NET 11.0.0. Cây: `3 + (4 * 5)`.

### Một cây, nhiều thao tác — không lớp nút nào bị sửa

```text
=== Mot cay, ba thao tac — khong lop nut nao bi sua ===
  danh gia : 23
  in       : (3 + (4 * 5))
  dem nut  : 5
```

Ba việc hoàn toàn khác nhau — tính toán, sinh chuỗi, thống kê — và lớp `So`, `Cong`,
`Nhan` không biết cái nào tồn tại. Chúng chỉ có đúng một method: `ChoTham`.

### Thêm thao tác thứ tư — một lớp

```csharp
sealed class DoSau : IVisitor<int>
{
    public int Tham(So n) => 1;
    public int Tham(Cong n) => 1 + Math.Max(n.Trai.ChoTham(this), n.Phai.ChoTham(this));
    ...
}
```

```text
=== Them thao tac thu tu: do sau — chi them MOT lop ===
  do sau   : 3
```

**Không sửa một dòng nào trong các lớp nút.** Đây là chiều mà Visitor tối ưu.

### Chiều ngược lại — thêm kiểu nút mới

```text
=== Them KIEU NUT moi (Tru) — moi visitor phai bo sung ===
  in: (10 - 4)
  danh gia: 6
  dem nut : 3
  do sau  : 2
  -> them Tru vao IVisitor<T> lam MOI visitor khong bien dich duoc cho toi khi bo sung
     (do la dac diem tot: trinh bien dich bat, khong phai runtime)
```

Thêm `Tru` nghĩa là thêm `T Tham(Tru n)` vào `IVisitor<T>` — và **cả bốn visitor lập tức
không biên dịch được** cho tới khi bổ sung.

Đó là chi phí, nhưng nó là **chi phí lúc biên dịch**, tức là loại rẻ nhất. So với:

```csharp
decimal DanhGiaBangSwitch(INut n) => n switch
{
    So s => s.GiaTri,
    Cong c => ...,
    Nhan m => ...,
    // quen Tru
    _ => throw new NotSupportedException($"chua ho tro {n.GetType().Name}")
};
```

```text
=== So sanh: switch tren kieu thi khong ai bat thieu nhanh ===
  DanhGiaBangSwitch(cay)  = 23
  DanhGiaBangSwitch(cay2) -> NotSupportedException: chua ho tro Tru
```

**Cùng một thiếu sót, hai thời điểm phát hiện.** Visitor báo lúc build; `switch` báo lúc
chạy, ở production, với dữ liệu thật.

### Trước và sau

| | Method trong lớp nút | `switch` trên kiểu | Visitor |
|---|---|---|---|
| Thêm thao tác | sửa **mọi** lớp nút | thêm 1 hàm | thêm 1 lớp |
| Thêm kiểu nút | thêm 1 lớp | sửa mọi `switch`, **không ai nhắc** | sửa mọi visitor, **trình biên dịch nhắc** |
| Lớp nút biết gì về thao tác | tất cả | không | chỉ `ChoTham` |
| Thao tác cần trạng thái tích luỹ | khó | được | dễ (field của visitor) |
| Đọc lần đầu | dễ | dễ | khó — double dispatch không trực giác |

## Ba chiều mở rộng — chọn theo cái nào hay đổi

Đây là *expression problem* kinh điển, và không có lời giải hoàn hảo:

| Cách | Thêm **kiểu** | Thêm **thao tác** |
|---|---|---|
| Method trong lớp nút | rẻ | **đắt** — sửa mọi lớp |
| `switch` trên kiểu | **đắt và im lặng** | rẻ |
| Visitor | **đắt nhưng ồn ào** | rẻ |

**Chọn theo trục nào ổn định hơn.** Cây AST của một ngôn ngữ có tập nút cố định và thao
tác tăng mãi (kiểm kiểu, tối ưu, sinh mã, format) → Visitor. Một hệ thống đang thêm loại
sản phẩm mới hàng tháng nhưng chỉ có hai thao tác → đừng.

## C# hiện đại đã thu hẹp khoảng cách

Pattern matching với `switch` biểu thức trên hierarchy đóng đã tốt hơn nhiều so với thời
GoF:

```csharp
decimal DanhGia(INut n) => n switch
{
    So s => s.GiaTri,
    Cong c => DanhGia(c.Trai) + DanhGia(c.Phai),
    Nhan m => DanhGia(m.Trai) * DanhGia(m.Phai),
    Tru t => DanhGia(t.Trai) - DanhGia(t.Phai),
};
```

Ngắn hơn hẳn, đọc được ngay. Cái vẫn thiếu là **kiểm tra tính đầy đủ**: C# chưa có union
type đóng nên trình biên dịch không khẳng định được bạn đã phủ hết. Nó chỉ cảnh báo khi
không có nhánh mặc định — và cảnh báo đó dễ bị bỏ qua.

**Khuyến nghị:** với 3–5 kiểu nút và vài thao tác, dùng `switch` biểu thức + bật
`TreatWarningsAsErrors`. Chỉ leo lên Visitor khi số thao tác vượt số kiểu, hoặc khi thao
tác đến từ assembly khác (plugin).

Ca hỏng đầy đủ: [Thêm node mới, sửa mọi visitor](../case-studies/them-node-moi-sua-moi-visitor.md).

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Tập kiểu nút còn đang thay đổi | Mỗi kiểu mới sửa mọi visitor |
| Chỉ có 1–2 thao tác | Method trong lớp nút hoặc `switch` đơn giản hơn nhiều |
| Đội chưa quen double dispatch | Chi phí giải thích vượt lợi ích |
| Thao tác cần truy cập `private` của nút | Visitor chỉ thấy public API — phải mở rộng bề mặt nút |
| Cấu trúc không phải cây/đồ thị | Visitor sinh ra cho cấu trúc phân cấp |

## Trade-offs

| Được | Mất |
|---|---|
| Thêm thao tác không sửa lớp nút | Thêm kiểu nút sửa mọi visitor |
| Thao tác gom về một chỗ, dễ đọc trọn vẹn | Logic tách khỏi dữ liệu — phải nhảy qua lại |
| Visitor giữ trạng thái tích luỹ dễ dàng | Double dispatch khó hiểu với người mới |
| Trình biên dịch bắt khi thiếu nhánh | Lớp nút phải lộ đủ public để visitor làm việc |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Dùng Visitor khi tập kiểu còn thay đổi | Mỗi kiểu mới là một đợt sửa toàn bộ |
| Thêm nhánh mặc định vào visitor "cho an toàn" | Mất đúng lợi ích chính — trình biên dịch không bắt nữa |
| Nút tự quyết định duyệt con hay để visitor quyết | Trộn hai kiểu duyệt; nên chọn một và nhất quán |
| Visitor có trạng thái mà dùng lại cho cây khác | Trạng thái từ lần duyệt trước rò sang |
| Dùng reflection thay double dispatch | Chậm, mất kiểm tra kiểu, và không thân thiện AOT |
| `ChoTham` không generic, mỗi kiểu trả về một visitor riêng | Nhân đôi số interface; dùng `IVisitor<T>` |

Dòng thứ ba đáng quyết định sớm: **ai điều khiển việc duyệt cây?** Nếu nút tự duyệt con
(`Cong.ChoTham` gọi `Trai.ChoTham`), visitor không kiểm soát được thứ tự và không dừng
sớm được. Nếu visitor duyệt (như ví dụ này), mỗi visitor phải tự viết phần đi xuống — lặp
code nhưng linh hoạt hơn.

## FAQ

<details>
<summary>Vì sao phải double dispatch, không gọi thẳng <code>visitor.Tham(nut)</code>?</summary>

Vì C# chọn method nạp chồng theo kiểu **tĩnh** của tham số. Với `INut nut`, lời gọi
`v.Tham(nut)` không biên dịch được (không có `Tham(INut)`) — hoặc nếu có thì luôn gọi
đúng cái đó, bất kể kiểu thực.

`nut.ChoTham(v)` đi qua đa hình **động** để tới đúng lớp nút, và ở đó `this` đã có kiểu
tĩnh cụ thể (`So`), nên `v.Tham(this)` chọn được đúng overload. Hai bước, mỗi bước một
kiểu dispatch — nên gọi là *double dispatch*.

</details>

<details>
<summary>.NET có Visitor sẵn ở đâu không?</summary>

Có: `System.Linq.Expressions.ExpressionVisitor`. EF Core dùng nó để dịch cây biểu thức
LINQ thành SQL, và bạn kế thừa nó để can thiệp vào truy vấn.

Đó cũng là ví dụ điển hình cho điều kiện dùng đúng: tập kiểu node của `Expression` **rất
ổn định** (do .NET định nghĩa), còn số thao tác trên nó thì vô hạn.

</details>

<details>
<summary>Visitor có dùng được với <code>record</code> và pattern matching không?</summary>

Được, và kết hợp thường tốt: `record` cho các nút (bất biến, có destructuring), Visitor
cho các thao tác nặng, `switch` biểu thức cho các thao tác nhẹ.

Không có luật bắt phải chọn một. Điều nên tránh là **cả hai cùng làm một việc** — hai
đường code cho cùng một thao tác thì sớm muộn lệch nhau.

</details>

## Related Topics

- [Composite](composite.md) — cấu trúc cây mà Visitor đi trên đó
- [Interpreter](interpreter.md) — Visitor là cách thêm thao tác cho cây biểu thức
- [Iterator](iterator.md) — lo *thứ tự duyệt*; Visitor lo *làm gì ở mỗi nút*
- [Strategy](strategy.md) — visitor cũng là một thuật toán cắm được
- [SOLID](../reference/solid.md) — O theo chiều thao tác, vi phạm O theo chiều kiểu

## References

- GoF — *Design Patterns*, Visitor
- Microsoft — *ExpressionVisitor Class*
