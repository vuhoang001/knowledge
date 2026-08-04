---
title: SOLID — năm nguyên lý, năm ca hỏng chạy được
sidebar_position: 2
description: "Năm nguyên lý mà phần lớn design pattern là hệ quả trực tiếp — mỗi nguyên lý kèm một vi phạm chạy ra lỗi thật, không phải mô tả suông."
tags: [solid, srp, ocp, lsp, isp, dip, oop]
domain: backend
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# SOLID — năm nguyên lý, năm ca hỏng chạy được

> **Chốt:** SOLID không phải năm luật rời rạc. Cả năm cùng phục vụ đúng một mục tiêu:
> **thu hẹp bán kính ảnh hưởng của một thay đổi**. Học pattern trước SOLID là học ngọn;
> hơn nửa số pattern GoF chỉ là một cách cụ thể để giữ **O** và **D**.

## Mục tiêu

Trả lời câu *"vì sao code này khó sửa"* bằng năm chẩn đoán cụ thể thay vì một câu cảm
tính. Mỗi nguyên lý dưới đây đi kèm một đoạn **chạy ra lỗi thật** — vì SOLID bị dạy
bằng ẩn dụ quá nhiều, và ẩn dụ không debug được.

## Tổng quan

| Chữ | Tên | Câu hỏi chẩn đoán | Vi phạm lộ ra khi nào |
|---|---|---|---|
| **S** | Single Responsibility | Lớp này đổi vì **mấy lý do** khác nhau? | Sửa định dạng báo cáo làm hỏng phép tính |
| **O** | Open/Closed | Thêm một loại mới có phải **sửa** code cũ không? | `switch` ném ở nhánh `default` |
| **L** | Liskov Substitution | Thay lớp cha bằng lớp con, code gọi có còn đúng? | Test pass với cha, fail với con |
| **I** | Interface Segregation | Lớp cài interface có phải ném `NotSupported` không? | `NotSupportedException` lúc chạy |
| **D** | Dependency Inversion | Lớp này tự đi tìm phụ thuộc hay được đưa vào? | Không viết nổi unit test |

**Đọc bảng theo cột thứ ba.** Đó là năm câu hỏi mang ra dùng được trong code review; ba
cột còn lại chỉ là tên gọi.

## Ví dụ xuyên suốt

Toàn bộ code dưới đây nằm trong **một** file, chạy bằng `dotnet run 02-solid.cs` trên
.NET 11.0.0. Mỗi mục có phần vi phạm và phần sửa, chạy cạnh nhau để so thẳng.

### S — Single Responsibility

**Vi phạm:** một lớp vừa tính tiền vừa ghi file.

```csharp
sealed class HoaDonGopChung((decimal gia, int sl)[] dong)
{
    public decimal TinhVaXuat(string duong)
    {
        decimal t = 0;
        foreach (var d in dong) t += d.gia * d.sl;
        File.WriteAllText(duong, $"TONG: {t}");   // I/O tron vao phep tinh
        return t;
    }
}
```

**Sửa:** tách phép tính ra khỏi I/O.

```csharp
static class HoaDonTach
{
    public static decimal Tong((decimal gia, int sl)[] dong)
    {
        decimal t = 0;
        foreach (var d in dong) t += d.gia * d.sl;
        return t;
    }
}
```

```text
=== S — Single Responsibility ===
Tong (tinh chung voi I/O): 350,000
File duoc ghi ra chua? True  <- de test phep cong phai ghi file
Tong (tach): 350,000  — test duoc khong cham dia
```

Hai số bằng nhau. **Cái khác nhau không phải kết quả, mà là cái giá để kiểm chứng kết
quả đó.** Dòng `File duoc ghi ra chua? True` là bằng chứng: muốn test phép cộng thì
buộc phải chạm đĩa, dọn file, và test trở nên chậm và giòn.

Cách phát biểu SRP dễ hiểu nhất không phải "một lớp làm một việc" — câu đó quá mơ hồ để
dùng. Bản gốc của Robert Martin là: **"một lớp chỉ nên có một lý do để thay đổi"**. Lớp
trên có hai: kế toán đổi công thức, và IT đổi định dạng file.

### O — Open/Closed

**Vi phạm:** thêm hình mới phải sửa `switch`.

```csharp
decimal DienTichSwitch(object h) => h switch
{
    ChuNhat r => r.Rong * r.Cao,
    // quen bo sung TamGiac
    _ => throw new NotSupportedException($"chua ho tro {h.GetType().Name}")
};
```

```text
=== O — Open/Closed ===
switch nem: NotSupportedException: chua ho tro TamGiac
da hinh: TamGiac = 12
```

**Trình biên dịch không cảnh báo gì cả.** Lỗi nổ lúc chạy, ở production, với kiểu mà
người thêm `TamGiac` không biết là mình phải sửa. Đó chính xác là thứ OCP tồn tại để
chặn: *mở để mở rộng* (thêm lớp), *đóng để sửa đổi* (không đụng code cũ).

Đây cũng là bài toán mà [Factory Method](../skills/factory-method.md),
[Strategy](../skills/strategy.md) và [Visitor](../skills/visitor.md) giải theo ba hướng
khác nhau.

### L — Liskov Substitution

Ví dụ kinh điển hình vuông / hình chữ nhật. Về toán học hình vuông **là** hình chữ nhật,
nên kế thừa nghe rất hợp lý:

```csharp
class ChuNhat { public virtual int Rong { get; set; } public virtual int Cao { get; set; } public int DienTich => Rong * Cao; }

class Vuong : ChuNhat
{
    public override int Rong { get => base.Rong; set { base.Rong = value; base.Cao = value; } }
    public override int Cao  { get => base.Cao;  set { base.Rong = value; base.Cao = value; } }
}

void KiemTraDienTich(ChuNhat h)
{
    h.Rong = 5;
    h.Cao = 4;
    // ky vong 20
}
```

```text
=== L — Liskov Substitution ===
ChuNhat  rong=5 cao=4 -> ky vong 20, thuc te 20  OK
Vuong    rong=5 cao=4 -> ky vong 20, thuc te 16  VI PHAM LSP
```

**20 và 16.** Hàm `KiemTraDienTich` nhận `ChuNhat`, không biết gì về `Vuong`, và vẫn sai.
Đó là định nghĩa của vi phạm Liskov: lớp con **thu hẹp** hợp đồng của lớp cha (ở đây:
"đặt `Rong` không đụng tới `Cao`").

Bài học rút ra không phải "đừng dùng kế thừa" mà: **quan hệ "là một" trong toán học
không tự động là quan hệ "thay thế được" trong code.** Hợp đồng của lớp cha gồm cả
những thứ không viết trong chữ ký hàm.

### I — Interface Segregation

**Vi phạm:** một interface béo, máy in rẻ tiền buộc phải cài cả `Fax`.

```csharp
interface IMayInDayDu { void In(string s); void Fax(string s); void Quet(string s); }

sealed class MayInGiaRe : IMayInDayDu
{
    public void In(string s) => Console.WriteLine($"in: {s}");
    public void Fax(string s) => throw new NotSupportedException("may nay khong co fax");
    public void Quet(string s) => throw new NotSupportedException("may nay khong co scanner");
}
```

```text
=== I — Interface Segregation ===
in: bao cao
nem luc chay: NotSupportedException: may nay khong co fax
```

**`throw new NotSupportedException` trong một lớp cài interface là dấu hiệu ISP bị vi
phạm, gần như không có ngoại lệ.** Nó nói rằng interface đang mô tả một thiết bị tưởng
tượng chứ không mô tả các thiết bị thật.

Sửa: tách thành `IMayIn`, `IMayFax`, `IMayQuet`. Máy đa năng cài cả ba, máy rẻ cài một.
Lúc đó *trình biên dịch* chặn việc gọi `Fax` trên máy không có fax — lỗi dời từ runtime
về compile time.

Chú ý ISP cũng là một dạng vi phạm LSP: `MayInGiaRe` không thay thế được `IMayInDayDu`
ở mọi chỗ. Năm nguyên lý này chồng lấn nhau nhiều hơn cách chúng thường được dạy.

### D — Dependency Inversion

**Vi phạm:** lớp tự đi lấy giờ hệ thống.

```csharp
sealed class ChaoBuocCung
{
    public string Chao() => DateTime.Now.Hour < 12 ? "Chao buoi sang" : "Chao buoi chieu";
}
```

**Sửa:** nhận nguồn giờ từ ngoài.

```csharp
interface IDongHo { int Gio { get; } }
sealed class ChaoTiemPhuThuoc(IDongHo dh)
{
    public string Chao() => dh.Gio < 12 ? "Chao buoi sang" : "Chao buoi chieu";
}
```

```text
=== D — Dependency Inversion ===
Buoc cung DateTime.Now -> chao: "Chao buoi sang"  (doi theo gio chay may)
Tiem IDongHo 6h  -> chao: "Chao buoi sang"
Tiem IDongHo 20h -> chao: "Chao buoi chieu"
```

Dòng đầu là dòng đáng sợ: **kết quả của nó phụ thuộc vào lúc bạn chạy.** Một test cho
`ChaoBuocCung` sẽ xanh vào buổi sáng và đỏ vào buổi chiều — và người gặp nó lúc 13h sẽ
mất nửa tiếng đổ tại máy CI.

Hai dòng sau chạy ra hai kết quả khác nhau **trong cùng một lần chạy chương trình**, vì
nguồn giờ đã trở thành tham số.

`DateTime.Now`, `Guid.NewGuid()`, `Random`, `Environment.MachineName`, và mọi lời gọi
mạng đều là cùng một loại phụ thuộc ẩn. Chúng là lý do phổ biến nhất của test chập chờn.

## Quan hệ giữa SOLID và pattern GoF

| Nguyên lý | Pattern là hiện thân của nó |
|---|---|
| **O** | [Strategy](../skills/strategy.md), [Factory Method](../skills/factory-method.md), [Decorator](../skills/decorator.md), [Visitor](../skills/visitor.md) |
| **D** | [Abstract Factory](../skills/abstract-factory.md), [Bridge](../skills/bridge.md), [Adapter](../skills/adapter.md) |
| **S** | [Command](../skills/command.md), [Mediator](../skills/mediator.md), [Facade](../skills/facade.md) |
| **I** | [Adapter](../skills/adapter.md), [Facade](../skills/facade.md) |
| **L** | Không có pattern nào "cài đặt" L — nó là ràng buộc lên mọi lần dùng kế thừa |

Bảng này giải thích vì sao nên đọc trang này **trước** khi đọc 23 pattern: pattern là
*công thức*, SOLID là *lý do*.

## Trade-offs

| Được | Mất |
|---|---|
| Bán kính một thay đổi hẹp lại | Số file tăng — SRP luôn tạo ra nhiều lớp hơn |
| Test được từng mảnh, không cần hạ tầng | Phải dựng DI container, hoặc truyền tay rất nhiều tham số |
| Lỗi dời từ runtime về compile time (I, O) | Kiểu và interface phình ra, đọc lần đầu chậm hơn |
| Thay hiện thực không sửa lớp gọi (D) | Một lần nhảy file khi debug; stack trace dài hơn |

**Chỗ SOLID phản tác dụng:** script một lần, prototype, và code có đúng một hiện thực
mãi mãi. Áp DIP lên một hàm `Main` 40 dòng là tự tạo việc.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Hiểu SRP là "một lớp một method" | Nổ ra hàng trăm lớp một method, và *cohesion* tụt chứ không tăng |
| Dựng interface cho mọi lớp để "theo DIP" | `IOrderService` có đúng một `OrderService` — thêm một lần nhảy file, không thêm khả năng nào |
| Coi kế thừa là cách mặc định để tái sử dụng | Vi phạm L như ví dụ hình vuông; xem [Composition over inheritance](composition-over-inheritance.md) |
| Cài interface rồi ném `NotSupportedException` | Vi phạm I; lỗi dời từ compile time sang runtime, đúng chiều ngược |
| Dùng `DateTime.Now` trong logic nghiệp vụ | Test chập chờn theo giờ chạy, như output mục D ở trên |
| Áp SOLID lên code chưa có test | Refactor không lưới an toàn — đổi hành vi mà không ai biết |

## FAQ

<details>
<summary>SRP nói "một lý do để thay đổi" — làm sao đếm được lý do?</summary>

Đếm theo **người**, không theo kỹ thuật. Hỏi: *"ai là người sẽ yêu cầu sửa lớp này?"*

Lớp `HoaDonGopChung` ở trên có hai người: kế toán (đổi công thức) và IT (đổi định dạng
file). Hai người khác nhau, hai nhịp thay đổi khác nhau, hai lý do. Tách.

Nếu chỉ có một người và một nhịp thì dù lớp làm năm việc, nó vẫn có một lý do để đổi.

</details>

<details>
<summary>Vi phạm LSP thì sửa thế nào, ngoài việc bỏ kế thừa?</summary>

Ba hướng, theo thứ tự ưu tiên:

1. **Bỏ quan hệ kế thừa.** `Vuong` và `ChuNhat` đều cài `IHinh` với method `DienTich()`,
   không ai kế thừa ai. Đây là cách đúng trong hầu hết trường hợp.
2. **Làm lớp cha bất biến (immutable).** Nếu `ChuNhat` không có setter thì bài toán biến
   mất — vi phạm LSP ở đây sinh ra từ *mutation*, không từ hình học.
3. **Nới hợp đồng của lớp cha.** Ghi rõ "đặt `Rong` có thể đổi `Cao`". Ít khi làm được,
   vì nó đẩy gánh nặng sang mọi người gọi.

</details>

<details>
<summary>DIP và Dependency Injection có phải một không?</summary>

Không. DIP là **nguyên lý** (module cấp cao đừng phụ thuộc module cấp thấp; cả hai phụ
thuộc vào abstraction). DI là một **kỹ thuật** để đạt được nó (đưa phụ thuộc vào qua
constructor). DI container là một **công cụ** để tự động hoá kỹ thuật đó.

Bạn có thể theo DIP mà không dùng container nào — truyền tay qua constructor trong
`Program.cs` là đủ, và với dự án nhỏ thì đó là lựa chọn tốt hơn.

</details>

<details>
<summary>Có nên tách interface tới mức mỗi method một interface không?</summary>

Không. ISP nói interface phải khớp với **nhu cầu của người gọi**, không nói càng nhỏ
càng tốt. Nếu mọi người gọi đều dùng cả `Doc` và `Ghi` thì `IKho` gộp cả hai là đúng.

Phép thử: có lớp cài nào phải ném `NotSupportedException` không? Không thì interface
đang vừa.

</details>

## Related Topics

- [Design pattern là gì](what-is-a-pattern.md) — pattern là công thức, SOLID là lý do
- [Composition over inheritance](composition-over-inheritance.md) — lối thoát cho vi phạm LSP
- [Coupling và cohesion](coupling-cohesion.md) — thứ SOLID thật sự đang tối ưu
- [Strategy](../skills/strategy.md) · [Factory Method](../skills/factory-method.md) — hiện thân của O
- [Adapter](../skills/adapter.md) — hiện thân của D và I

## References

- Robert C. Martin — *Agile Software Development: Principles, Patterns, and Practices*
- Barbara Liskov — *Data Abstraction and Hierarchy* (1987), nguồn của chữ L
