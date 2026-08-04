---
title: Interpreter
sidebar_position: 15
description: "Một ngôn ngữ nhỏ thành cây đối tượng tự đánh giá — cùng cây đó sinh ra được cả SQL, và đó là lý do thật để dùng nó."
tags: [interpreter, behavioral, gof, expression-tree, dsl]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Interpreter

> **Chốt:** Interpreter là pattern **ít dùng nhất** trong GoF, và gần như luôn sai chỗ khi
> được dùng — trừ một trường hợp: khi bạn cần **cùng một biểu thức cho ra nhiều đầu ra**.
> Ở dưới, cùng một cây lọc vừa đánh giá trong bộ nhớ vừa sinh ra `WHERE` của SQL.

## Mục tiêu

Cho người dùng (hoặc cấu hình) diễn đạt được một quy tắc mà lập trình viên không biết
trước — bộ lọc, công thức tính, điều kiện cảnh báo — và biến quy tắc đó thành thứ chạy
được.

## Ý định gốc (GoF)

Cho một ngôn ngữ, định nghĩa biểu diễn cho ngữ pháp của nó cùng một trình thông dịch dùng
biểu diễn đó để diễn giải câu trong ngôn ngữ.

Cấu trúc luôn là một cây [Composite](composite.md): nút lá là *biểu thức đầu cuối* (hằng,
tên cột), nút nhánh là *biểu thức không đầu cuối* (`VA`, `HOAC`, `KHONG`).

```csharp
interface IBieuThuc { bool Danh(Don d); string MoTa(); string SangSql(); }

sealed class Va(IBieuThuc t, IBieuThuc p) : IBieuThuc
{
    public bool Danh(Don d) => t.Danh(d) && p.Danh(d);
    ...
}
```

## Ví dụ xuyên suốt — bộ lọc đơn hàng cấu hình được

Chạy bằng `dotnet run 20-interpreter.cs` trên .NET 11.0.0.

Biểu thức: `(khu_vuc = "Ha Noi" HOẶC tien > 2.000.000) VÀ da_thanh_toan`

```csharp
IBieuThuc loc = new Va(
    new Hoac(new BangChuoi(d => d.KhuVuc, "Ha Noi"), new LonHon(d => d.Tien, 2_000_000m)),
    new La(d => d.DaThanhToan));
```

```text
Bieu thuc: ((khu_vuc = "Ha Noi" HOAC tien > 2,000,000) VA da_thanh_toan)

ma    khu vuc           tien   da tt   khop?
------------------------------------------------
DH01  Ha Noi       1,200,000    True   CO
DH02  Da Nang        300,000   False   khong
DH03  Ha Noi         250,000   False   khong
DH04  TP HCM       5,000,000    True   CO
```

### Thêm toán tử mới — một lớp

```csharp
sealed class Khong(IBieuThuc t) : IBieuThuc
{
    public bool Danh(Don d) => !t.Danh(d);
    public string MoTa() => $"KHONG {t.MoTa()}";
    public string SangSql() => $"NOT ({t.SangSql()})";
}
```

```text
=== Them toan tu moi: KHONG ===
Bieu thuc: KHONG khu_vuc = "Ha Noi"
  DH01 -> khong
  DH02 -> CO
  DH03 -> khong
  DH04 -> CO
```

### Lý do thật sự để dùng — một cây, nhiều đầu ra

```text
=== Cung cay do, sinh ra SQL thay vi danh gia ===
  WHERE ((khu_vuc = 'Ha Noi' OR tien > 2000000) AND da_thanh_toan = TRUE)
```

**Đây là chỗ Interpreter trả được phí của nó.** Cùng một biểu thức người dùng cấu hình:

- đánh giá trong bộ nhớ cho dữ liệu đã tải,
- đẩy xuống CSDL thành `WHERE` cho dữ liệu chưa tải,
- hiển thị lại cho người dùng bằng tiếng Việt,
- và (nếu cần) sinh ra biểu thức cho engine tìm kiếm.

Bốn đầu ra từ **một** cấu trúc. Không có cách nào làm việc đó với một `Func<Don, bool>` —
delegate chạy được nhưng không **đọc** được, nên không dịch sang SQL được.

### So với LINQ có sẵn

```text
=== So sanh voi LINQ co san ===
  LINQ      : [DH01, DH04]
  Interpreter: [DH01, DH04]
  Khop: True
```

Kết quả giống hệt. Nên câu hỏi đúng là: *vậy tại sao không dùng LINQ?*

| | `Func<Don, bool>` (LINQ to Objects) | `Expression<Func<Don, bool>>` | Interpreter tự viết |
|---|---|---|---|
| Đánh giá trong bộ nhớ | có | có (sau `Compile()`) | có |
| Dịch sang SQL | **không** | có (EF Core làm việc này) | có, do bạn viết |
| Dựng từ chuỗi người dùng nhập | không | khó | **có** |
| Hiển thị lại cho người dùng | không | khó đọc | có |
| Toán tử riêng của nghiệp vụ | không | không | có |
| Công sức | 0 | thấp | **cao** |

**Nếu biểu thức do lập trình viên viết, dùng `Expression<T>` — .NET đã có sẵn cây biểu
thức và EF Core đã biết dịch nó.** Interpreter tự viết chỉ thắng ở hai dòng in đậm: khi
biểu thức đến từ **người dùng** lúc chạy, và khi bạn cần **toán tử của riêng nghiệp vụ**
(`trong_ky_khuyen_mai`, `thuoc_nhom_khach_hang`).

## Khi nào KHÔNG dùng

| Tình huống | Làm gì thay thế |
|---|---|
| Ngữ pháp phức tạp (có ưu tiên toán tử, hàm, biến) | Dùng bộ sinh parser (ANTLR) hoặc thư viện biểu thức có sẵn |
| Chỉ cần đánh giá trong bộ nhớ | `Func<T, bool>` |
| Biểu thức do lập trình viên viết | `Expression<Func<T, bool>>` |
| Chỉ có 3–4 quy tắc cố định | Bảng tra `Dictionary<string, Func<...>>` |
| Cần hiệu năng cao trong vòng lặp nóng | Cây đối tượng chậm hơn code biên dịch nhiều lần |

Dòng đầu là lý do Interpreter hiếm gặp: ngữ pháp thật hiếm khi đơn giản như ví dụ SGK, và
ngay khi có ưu tiên toán tử thì viết parser tay là việc dễ sai.

## Trade-offs

| Được | Mất |
|---|---|
| Một cấu trúc, nhiều đầu ra (đánh giá, SQL, hiển thị) | Mỗi toán tử là một lớp — ngữ pháp 20 luật là 20 lớp |
| Quy tắc trở thành **dữ liệu**, sửa không cần build lại | Phải viết cả parser nếu đầu vào là chuỗi |
| Người dùng cuối cấu hình được | Biểu thức người dùng gửi lên là bề mặt tấn công (độ sâu, độ phức tạp) |
| Thêm toán tử không sửa toán tử cũ | Thêm **thao tác** mới (ví dụ `SangJson`) phải sửa mọi lớp — trừ khi dùng [Visitor](visitor.md) |

Dòng cuối là quan hệ quan trọng nhất: **Interpreter cộng Visitor** giải quyết được cả hai
chiều mở rộng. Cây biểu thức của chính C# (`System.Linq.Expressions`) làm đúng vậy —
`ExpressionVisitor` là lớp cơ sở công khai.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Nhét cả parser vào các lớp biểu thức | Trộn hai việc; parser nên tách riêng, chỉ sinh ra cây |
| Không giới hạn độ sâu cây từ đầu vào người dùng | `StackOverflowException` — vector DoS |
| Ghép chuỗi SQL trực tiếp từ giá trị người dùng | SQL injection; phải sinh **tham số**, không sinh giá trị |
| Thêm method mới vào `IBieuThuc` mỗi lần cần đầu ra mới | Sửa mọi lớp; dùng [Visitor](visitor.md) |
| Dùng Interpreter cho biểu thức lập trình viên viết | `Expression<T>` có sẵn, đã có EF Core dịch |
| Đánh giá lại cây trong vòng lặp nóng | Chậm; cân nhắc biên dịch cây thành delegate một lần |

Dòng thứ ba đáng chú ý trong chính ví dụ này: `SangSql()` ghép `'{giaTri}'` vào chuỗi.
Với dữ liệu người dùng thì đó là lỗ hổng — bản dùng được phải trả về `(sql, thamSo[])`.

## FAQ

<details>
<summary>Biên dịch cây thành delegate để chạy nhanh hơn được không?</summary>

Được, và đó là cách thực dụng nhất khi cần cả tính cấu hình lẫn tốc độ:

```csharp
Func<Don, bool> daBienDich = d => loc.Danh(d);   // van la cay
// hoac: dung LINQ Expression de sinh IL that su
```

Cách mạnh hơn là dựng `Expression` tree rồi `.Compile()` — lúc đó bạn được JIT sinh mã
máy. Đổi lại: code dựng cây khó đọc hơn hẳn, và không thân thiện với AOT.

</details>

<details>
<summary>Có thư viện .NET nào làm sẵn việc này không?</summary>

Có vài hướng phổ biến, tuỳ nhu cầu:

- **Cây biểu thức LINQ** (`System.Linq.Expressions`) — có sẵn trong BCL, EF Core dịch được.
- **Dynamic LINQ** — nhận chuỗi kiểu `"KhuVuc == \"Ha Noi\""` và dựng expression.
- **Bộ máy quy tắc** (rules engine) — khi quy tắc là thứ nghiệp vụ quản lý, không phải kỹ thuật.

Viết Interpreter tay chỉ nên khi ngữ pháp là **của riêng nghiệp vụ** và nhỏ. Đó là điều
kiện hẹp, và là lý do pattern này ít gặp.

</details>

<details>
<summary>Làm sao chặn biểu thức độc hại từ người dùng?</summary>

Ba lớp bảo vệ, cần cả ba:

1. **Giới hạn độ sâu và số nút** khi parse — chặn cây gây tràn stack.
2. **Danh sách trắng toán tử và cột** — người dùng không được nhắc tới cột họ không có
   quyền.
3. **Sinh SQL có tham số**, không ghép chuỗi — chặn injection.

Lớp thứ hai hay bị quên và là lỗ hổng phân quyền thật: bộ lọc `luong > 0` trên bảng nhân
sự lộ thông tin dù người dùng không được xem cột lương.

</details>

## Related Topics

- [Composite](composite.md) — Interpreter là Composite mang ngữ nghĩa
- [Visitor](visitor.md) — cách thêm thao tác mới lên cây mà không sửa lớp nút
- [Iterator](iterator.md) — duyệt cây biểu thức
- [Strategy](strategy.md) — khi quy tắc chỉ cần chọn từ danh sách có sẵn
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng tra triệu chứng

## References

- GoF — *Design Patterns*, Interpreter
- Microsoft — *Expression Trees* (C# programming guide)
