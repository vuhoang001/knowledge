---
title: Design pattern là gì — và khi nào đừng dùng
sidebar_position: 1
description: "Pattern là từ vựng chung cho một cách sắp xếp quan hệ giữa các lớp đã được kiểm chứng — không phải thư viện để gọi, cũng không phải mục tiêu để đạt."
tags: [design-pattern, gof, oop, refactoring]
domain: backend
category: pattern
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Design pattern là gì — và khi nào đừng dùng

> **Chốt:** Pattern là **tên gọi chung** cho một cách sắp xếp quan hệ giữa các lớp mà
> nhiều người đã đâm đầu vào cùng một vấn đề rồi rút ra. Giá trị lớn nhất của nó là
> **từ vựng**, không phải code. Áp pattern khi chưa thấy đau thật là tự tạo ra đau.

## Mục tiêu

Chặn hai lỗi ngược chiều nhau, cùng tốn tiền như nhau:

1. **Không biết pattern** → viết lại một giải pháp đã có tên, sai đúng những chỗ người
   ta đã cảnh báo từ 1994.
2. **Biết pattern quá sớm** → dựng `IThingFactory` + `AbstractThingProvider` cho đúng
   một hiện thực duy nhất, và ba năm sau vẫn chỉ có một.

Lỗi thứ hai phổ biến hơn ở người vừa đọc xong sách pattern, và khó chữa hơn — vì code
"trông chuyên nghiệp".

## Tổng quan

Năm 1994, bốn tác giả (**Gang of Four** — Gamma, Helm, Johnson, Vlissides) không phát
minh ra gì cả. Họ đi đọc code C++ và Smalltalk có sẵn, thấy 23 cách sắp xếp lặp đi lặp
lại, rồi **đặt tên** cho chúng.

Đó là toàn bộ chuyện. Một pattern gồm bốn phần:

| Phần | Trả lời | Ví dụ với Strategy |
|---|---|---|
| **Tên** | Gọi nó là gì trong cuộc họp | "Strategy" |
| **Vấn đề** | Khi nào thì nghĩ tới nó | Có nhiều thuật toán cùng mục đích, chọn lúc chạy |
| **Lời giải** | Sắp xếp lớp thế nào | Tách mỗi thuật toán thành một lớp cài chung interface |
| **Hệ quả** | Được gì, mất gì | Được: thêm thuật toán không sửa code cũ. Mất: nhiều lớp hơn, và người gọi phải biết chọn cái nào |

**Phần "Hệ quả" mới là phần đáng đọc.** Phần lớn tài liệu trên mạng chỉ chép hai phần
đầu kèm sơ đồ UML — đọc xong biết vẽ, không biết *khi nào đừng vẽ*.

### Ba nhóm

| Nhóm | Trả lời câu hỏi | Số pattern | Đại diện |
|---|---|---|---|
| **Creational** | Đối tượng này được **tạo ra** thế nào | 5 | Factory Method, Builder |
| **Structural** | Các đối tượng **ghép lại** với nhau ra sao | 7 | Adapter, Decorator |
| **Behavioral** | Chúng **nói chuyện** với nhau thế nào | 11 | Strategy, Observer |

Cách nhớ: creational trả lời *"lấy đâu ra"*, structural trả lời *"lắp vào nhau kiểu gì"*,
behavioral trả lời *"ai gọi ai"*.

## Vì sao cần — giá trị thật nằm ở từ vựng

Thử so hai câu nói trong một buổi review code:

> *"Chỗ này tao nghĩ nên có một cái interface, rồi mỗi loại phí một lớp cài nó, rồi
> ở trên có cái dictionary map từ mã loại sang lớp, rồi khi cần thì tra dictionary…"*

> *"Chỗ này dùng Strategy."*

Câu thứ hai truyền đạt **nhiều hơn** câu thứ nhất — vì nó kéo theo cả phần "hệ quả" mà
người nghe đã biết: sẽ có thêm lớp, sẽ cần chỗ quyết định chọn lớp nào, và việc thêm
loại mới sẽ không phải sửa code cũ.

Đó là lý do đáng học pattern. Không phải để dùng nhiều hơn, mà để **nói ngắn hơn**.

## Ví dụ xuyên suốt — phí vận chuyển ba loại khách

Cùng một bài toán, hai cách sắp xếp. Code chạy được nguyên trạng bằng
`dotnet run <file>.cs` trên .NET 11.0.0.

### Bài toán

Phí vận chuyển tuỳ loại khách:

| Loại | Công thức |
|---|---|
| `thuong` | 15.000 đ/kg |
| `than` (thân thiết) | 15.000 đ/kg, giảm 10% |
| `vip` | Miễn phí nếu đơn từ 500.000 đ, không thì 10.000 đ/kg |

### Cách A — `if-else`, và nó **không sai**

```csharp
decimal PhiIfElse(string loai, decimal tien, int kg) => loai switch
{
    "thuong" => kg * 15000m,
    "than"   => kg * 15000m * 0.9m,
    "vip"    => tien >= 500000m ? 0m : kg * 10000m,
    _        => throw new ArgumentException($"khong biet loai: {loai}")
};
```

Sáu dòng, đọc một lượt là hiểu hết, không phải mở file nào khác. **Với ba loại và một
chỗ dùng, đây là code đúng.** Ai bảo bạn phải thay nó bằng pattern thì người đó đang
áp dụng pattern như nghi lễ.

### Cách B — Strategy

```csharp
interface IPhiShip { decimal Tinh(decimal tien, int kg); }

sealed class PhiThuong    : IPhiShip { public decimal Tinh(decimal tien, int kg) => kg * 15000m; }
sealed class PhiThanThiet : IPhiShip { public decimal Tinh(decimal tien, int kg) => kg * 15000m * 0.9m; }
sealed class PhiVip       : IPhiShip { public decimal Tinh(decimal tien, int kg) => tien >= 500000m ? 0m : kg * 10000m; }

var bang = new Dictionary<string, IPhiShip>
{
    ["thuong"] = new PhiThuong(),
    ["than"]   = new PhiThanThiet(),
    ["vip"]    = new PhiVip(),
};
decimal PhiStrategy(string loai, decimal tien, int kg) => bang[loai].Tinh(tien, kg);
```

### Kiểm chứng — cùng đầu vào, cùng đầu ra

Đây là phép kiểm bắt buộc của **mọi** lần áp pattern: refactor mà đổi hành vi thì
không phải refactor, là viết lại.

```csharp
foreach (var c in cases)
{
    var a = PhiIfElse(c.loai, c.tien, c.kg);
    var b = PhiStrategy(c.loai, c.tien, c.kg);
    Console.WriteLine($"{c.loai,-8}{c.tien,12:N0}{c.kg,4}{a,12:N0}{b,12:N0}   {(a == b ? "OK" : "LECH"),-5}");
}
```

```text
loai       tien hang  kg     if-else    strategy   khop
---------------------------------------------------------
thuong       200,000   2      30,000      30,000   OK
than         200,000   2      27,000      27,000   OK
vip          200,000   2      20,000      20,000   OK
vip          600,000   2           0           0   OK
---------------------------------------------------------
So dong lech: 0

if-else : 1 ham, 3 nhanh, 0 kieu moi
strategy: 1 interface, 3 lop, 0 nhanh
```

### Trước và sau

| | `if-else` | Strategy |
|---|---|---|
| Số kiểu phải mở ra để hiểu | 1 | 4 |
| Thêm loại thứ tư | sửa 1 hàm | thêm 1 lớp + 1 dòng đăng ký |
| Test riêng công thức VIP | phải gọi qua hàm chung | `new PhiVip().Tinh(...)` |
| Loại phí do người dùng cấu hình lúc chạy | không làm được | làm được |
| Đọc lần đầu | 6 dòng, một chỗ | 4 chỗ, phải nhảy qua lại |

**Ngưỡng đảo chiều nằm ở hai dòng cuối.** Chừng nào danh sách loại còn do lập trình
viên quyết định và chỉ dùng ở một chỗ, `if-else` thắng. Khi loại phí trở thành **dữ
liệu** — cấu hình được, bật tắt được, mỗi chi nhánh một kiểu — thì `switch` bắt đầu
lan ra nhiều file và Strategy trả được phí của nó.

Ca hỏng cụ thể của việc để `switch` lan ra: [Thêm loại thứ năm, sửa bảy chỗ](../case-studies/them-loai-thu-nam-sua-bay-cho.md).
Ca hỏng ngược lại — dựng abstraction cho đúng một hiện thực:
[Abstract Factory cho một hiện thực](../case-studies/abstract-factory-cho-mot-hien-thuc.md).

## Khi nào KHÔNG nên dùng pattern

Mục này quan trọng ngang phần trên. Ba dấu hiệu bạn đang áp pattern quá sớm:

| Dấu hiệu | Vì sao đó là mùi |
|---|---|
| Interface có **đúng một** lớp cài, và không có kế hoạch nào cho lớp thứ hai | Interface tồn tại để có nhiều hiện thực. Một hiện thực thì nó chỉ là một lần nhảy file thừa |
| Bạn đặt tên lớp là `XxxFactory`, `XxxStrategy`, `XxxManager` **trước khi** viết logic | Tên pattern là thứ *nhận ra sau*, không phải thứ *quyết định trước* |
| Phải vẽ sơ đồ mới giải thích nổi cho đồng nghiệp một luồng vốn chỉ có một nhánh | Chi phí nhận thức đã vượt chi phí bài toán |

**Quy tắc thực dụng — Rule of Three.** Viết thẳng lần đầu. Lần thứ hai gặp cùng vấn đề,
copy và chịu đựng. Lần thứ ba mới trừu tượng hoá — lúc đó bạn đã có ba mẫu thật để biết
trục biến thiên nằm ở đâu. Trừu tượng hoá từ **một** mẫu gần như luôn chọn sai trục.

> Pattern là **thuốc**, không phải **vitamin**. Kê thuốc cho người khoẻ là làm hại họ.

Đầy đủ hơn về cách đi từ triệu chứng tới pattern: [Chọn pattern nào](choosing-a-pattern.md).

## Trade-offs

| Được | Mất |
|---|---|
| Từ vựng chung — nói một từ thay cho một đoạn mô tả | Người chưa biết từ đó đọc code chậm hơn |
| Chỗ biến thiên được cô lập, thêm biến thể không sửa code cũ | Thêm kiểu, thêm file, thêm một lần nhảy khi debug |
| Kiểm thử được từng mảnh riêng | Luồng thực thi rải ra nhiều lớp, stack trace dài hơn |
| Cấu hình được lúc chạy | Lỗi chuyển từ *compile time* sang *runtime* (tra dictionary không thấy khoá) |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Học pattern bằng cách học sơ đồ UML | Vẽ đúng hình, dùng sai chỗ — vì phần "hệ quả" không nằm trong hình |
| Coi số pattern dùng được là thước đo chất lượng code | Code phình gấp ba, không giải quyết thêm bài toán nào |
| Dùng tên pattern làm hậu tố cho mọi lớp (`OrderManagerFactoryStrategy`) | Tên nói về *cách cài đặt*, không nói về *việc nó làm* — sáu tháng sau không tìm ra |
| Refactor sang pattern mà không có test giữ hành vi | Đổi hành vi mà không ai biết; xem cột "khop" ở ví dụ trên |
| Cho rằng pattern là chuyện của OOP nên ngôn ngữ hàm không cần | Strategy trong C# thường chỉ là một `Func<decimal, decimal>`; pattern vẫn còn, chỉ là tên gọi khác |

## FAQ

<details>
<summary>C# có delegate rồi thì Strategy có còn cần lớp không?</summary>

Thường là không. `Func<decimal, int, decimal>` làm đúng việc của `IPhiShip` với ít code
hơn hẳn.

Lớp chỉ thắng khi strategy cần **nhiều hơn một method** (ví dụ `Tinh` và `MoTa`), cần
**trạng thái riêng** (ngưỡng, cấu hình), hoặc cần được **DI container tạo ra** cùng các
phụ thuộc của nó. Nếu không rơi vào ba trường hợp đó thì delegate là lựa chọn mặc định.

</details>

<details>
<summary>23 pattern GoF có còn đúng năm 2026 không?</summary>

Phần lớn còn, nhưng **không đều**. Ba nhóm:

- **Còn nguyên giá trị:** Strategy, Observer, Decorator, Adapter, Composite, Command.
- **Ngôn ngữ đã nuốt mất:** Iterator (`IEnumerable` + `foreach`), Template Method
  (thường thay bằng delegate), Prototype (`record` với `with`).
- **Đã thành phản pattern trong đa số ngữ cảnh:** Singleton — xem
  [Singleton](../skills/singleton.md), gần như luôn nên thay bằng vòng đời singleton
  của DI container.

</details>

<details>
<summary>Nên học 23 cái một lượt hay học theo nhu cầu?</summary>

Đọc lướt cả 23 một lần để **biết chúng tồn tại và tên là gì** — đó là phần từ vựng, rẻ
và có ích ngay. Đừng cố nhớ chi tiết.

Học sâu thì theo nhu cầu: khi gặp một triệu chứng cụ thể trong code của mình, mở
[Chọn pattern nào](choosing-a-pattern.md) tra từ triệu chứng sang pattern, rồi đọc kỹ
đúng cái đó.

</details>

<details>
<summary>Pattern và kiến trúc (MVC, Clean Architecture) khác nhau chỗ nào?</summary>

Khác ở **quy mô**. GoF pattern nói về quan hệ giữa vài lớp — đọc một file là thấy hết.
Kiến trúc nói về quan hệ giữa các tầng và module — đọc một file không thấy gì.

Chúng chồng lên nhau chứ không loại trừ: một hệ Clean Architecture bên trong vẫn đầy
Strategy, Adapter và Command.

</details>

## Related Topics

- [SOLID](solid.md) — năm nguyên lý mà phần lớn pattern là hệ quả trực tiếp
- [Composition over inheritance](composition-over-inheritance.md) — nguyên tắc gốc GoF nhắc đi nhắc lại
- [Coupling và cohesion](coupling-cohesion.md) — thước đo thật sự pattern phục vụ
- [Chọn pattern nào](choosing-a-pattern.md) — đi từ triệu chứng code tới tên pattern
- [Strategy](../skills/strategy.md) — pattern dùng làm ví dụ ở trang này
- [Cheatsheet 23 GoF](../cheatsheets/gof-23.md) — bảng tra một trang

## References

- Gamma, Helm, Johnson, Vlissides — *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), chương 1
- Fowler — *Refactoring*, phần "When should we refactor" (Rule of Three)
