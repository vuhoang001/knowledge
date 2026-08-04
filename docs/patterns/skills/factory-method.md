---
title: Factory Method
sidebar_position: 2
description: "Gom việc quyết định new lớp nào về một chỗ — vì hai switch song song sớm muộn cũng lệch nhau, và output ở dưới cho thấy nó lệch thế nào."
tags: [factory-method, creational, gof, open-closed]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Factory Method

> **Chốt:** Vấn đề không phải `switch` — vấn đề là `switch` **thứ hai** trên cùng một mã
> loại, ở file khác, do người khác sửa. Factory gom quyết định "tạo cái gì" về một chỗ
> để không thể có cái thứ hai.

## Mục tiêu

Chặn lỗi *shotgun surgery*: thêm một loại mới phải nhớ sửa đúng bảy chỗ, và người thêm
loại không biết bảy chỗ đó ở đâu.

## Ý định gốc (GoF)

Định nghĩa một interface để tạo đối tượng, nhưng để lớp con quyết định lớp nào được tạo.

Trong C# hiện đại, bản GoF gốc (lớp cha trừu tượng + `override CreateProduct()`) ít gặp
hơn hẳn hai biến thể thực dụng:

| Biến thể | Hình dạng | Dùng khi |
|---|---|---|
| **Static factory method** | `DonHang.TuGioHang(...)` | Đặt tên cho một cách tạo; nhiều constructor cùng chữ ký |
| **Factory + bảng đăng ký** | `Xuong.Tao("pdf")` | Loại được chọn bằng **dữ liệu** lúc chạy |
| **GoF thuần** | `abstract IBoXuat Tao();` + lớp con override | Khung (framework) muốn lớp con quyết định |

Phần dưới đi theo biến thể thứ hai, vì đó là biến thể giải quyết đúng cái đau ở mục
*Mục tiêu*.

## Ví dụ xuyên suốt — xuất báo cáo ba định dạng

Chạy bằng `dotnet run 07-factory-method.cs` trên .NET 11.0.0.

### Trước — hai `switch` song song trên cùng một mã

```csharp
string XuatSwitch(string m) => m switch
{
    "pdf"   => "%PDF-1.7 (pdf)",
    "excel" => "PK.. xlsx (excel)",
    "csv"   => "a,b,c (csv)",
    _       => throw new NotSupportedException(m)
};

// switch thu hai — them "csv" o tren nhung quen o day
string TenHienThiSwitch(string m) => m switch
{
    "pdf"   => "PDF",
    "excel" => "Excel",
    _       => "Khong ro"
};
```

Người thêm `csv` sửa hàm thứ nhất, chạy thử, thấy file xuất ra đúng, merge. Hàm thứ hai
nằm ở file khác — nó **không lỗi**, nó có nhánh `_` và trả về `"Khong ro"`.

```text
=== Truoc: hai switch song song, mot cai quen cap nhat ===
ma      xuat                        ten hien thi        khop?
------------------------------------------------------------------
pdf     %PDF-1.7 (pdf)              PDF                 OK
excel   PK.. xlsx (excel)           Excel               OK
csv     a,b,c (csv)                 Khong ro            LECH
So dong lech: 1
```

**Không có exception nào.** Người dùng thấy một dòng "Khong ro" trên giao diện và báo
lỗi ba tuần sau.

### Sau — một bảng đăng ký

```csharp
interface IBoXuat { string Xuat(); string TenHienThi { get; } }

sealed class XuatPdf   : IBoXuat { public string Xuat() => "%PDF-1.7 (pdf)";    public string TenHienThi => "pdf"; }
sealed class XuatExcel : IBoXuat { public string Xuat() => "PK.. xlsx (excel)"; public string TenHienThi => "excel"; }
sealed class XuatCsv   : IBoXuat { public string Xuat() => "a,b,c (csv)";       public string TenHienThi => "csv"; }

static class Xuong
{
    private static readonly Dictionary<string, Func<IBoXuat>> _bang = new()
    {
        ["pdf"]   = () => new XuatPdf(),
        ["excel"] = () => new XuatExcel(),
        ["csv"]   = () => new XuatCsv(),
    };
    public static void DangKy(string ma, Func<IBoXuat> tao) => _bang[ma] = tao;
    public static IBoXuat Tao(string ma) =>
        _bang.TryGetValue(ma, out var f) ? f() : throw new NotSupportedException($"chua dang ky dinh dang: {ma}");
}
```

```text
=== Sau: mot dang ky, khong the lech ===
ma      xuat                        ten hien thi        khop?
------------------------------------------------------------------
pdf     %PDF-1.7 (pdf)              pdf                 OK
excel   PK.. xlsx (excel)           excel               OK
csv     a,b,c (csv)                 csv                 OK
So dong lech: 0
```

**Không thể lệch, vì không còn hai chỗ để lệch.** Cả nội dung lẫn tên hiển thị nằm trong
cùng một lớp; thêm định dạng là thêm một lớp cài đủ cả hai — trình biên dịch bắt buộc.

### Thêm định dạng thứ tư

```csharp
Xuong.DangKy("json", () => new XuatJson());
```

```text
=== Them dinh dang thu tu: json ===
  json -> {"a":1} (json) / json   (khong sua dong nao cua code cu)
  So dinh dang dang co: 4
```

Đây là [nguyên lý Open/Closed](../reference/solid.md#o--openclosed) hiện ra bằng số:
mở rộng bằng cách **thêm**, không phải bằng cách **sửa**.

### Trước và sau

| | Hai `switch` | Factory + đăng ký |
|---|---|---|
| Chỗ phải sửa khi thêm định dạng | mọi `switch` trên mã đó — không ai biết có mấy cái | 1 lớp mới + 1 dòng đăng ký |
| Quên một chỗ thì sao | trả về giá trị mặc định, **im lặng** | không có "một chỗ" để quên |
| Định dạng do plugin cung cấp | không làm được | `DangKy` lúc khởi động |
| Mã sai (`"pdff"`) | rơi vào nhánh `_` | ném `NotSupportedException` kèm tên mã |
| Trình biên dịch kiểm được tính đầy đủ | có, nếu dùng `enum` + `switch` biểu thức | không — lỗi dời sang runtime |

**Dòng cuối là cái giá thật.** Với `enum` và `switch` biểu thức, C# cảnh báo khi thiếu
nhánh. Bảng đăng ký đánh đổi điều đó lấy khả năng mở rộng lúc chạy. Nếu danh sách loại
là cố định và do lập trình viên quản, `switch` trên `enum` **an toàn hơn** factory.

Ca hỏng đầy đủ: [Thêm loại thứ năm, sửa bảy chỗ](../case-studies/them-loai-thu-nam-sua-bay-cho.md).

## Khi nào KHÔNG dùng

| Tình huống | Làm gì thay thế |
|---|---|
| Đúng một hiện thực, không thấy cái thứ hai | `new` thẳng. Xem [ca hỏng](../case-studies/abstract-factory-cho-mot-hien-thuc.md) |
| Danh sách loại cố định, chỉ dùng ở một chỗ | `switch` trên `enum` — trình biên dịch kiểm tính đầy đủ |
| Đã có DI container | `IServiceProvider.GetRequiredKeyedService<IBoXuat>("pdf")` — .NET 8+ có keyed service sẵn |
| Chỉ cần đặt tên cho một cách khởi tạo | Static factory method, không cần interface |

Dòng thứ ba đáng nhớ: trong ASP.NET Core, **keyed services đã là factory pattern có
sẵn**. Viết lại `Xuong` bằng tay thường là dựng lại thứ container đã có.

## Trade-offs

| Được | Mất |
|---|---|
| Một chỗ duy nhất biết "mã nào ra lớp nào" | Thêm một tầng gián tiếp khi đọc code |
| Thêm loại không sửa code cũ (OCP) | Mất kiểm tra tính đầy đủ lúc biên dịch |
| Loại nạp được từ cấu hình, plugin | Lỗi "chưa đăng ký" chỉ nổ lúc chạy |
| Test được từng loại riêng | Nhiều lớp nhỏ hơn hẳn `switch` một hàm |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Vẫn giữ `switch` thứ hai ở nơi khác (tên hiển thị, icon, quyền) | Đúng lỗi ở output đầu tiên — lệch im lặng |
| Factory trả về kiểu cụ thể thay vì interface | Người gọi lại phải `switch` trên kiểu — không được gì |
| Nhánh mặc định trả về giá trị "an toàn" thay vì ném | Lỗi cấu hình biến thành dữ liệu sai, khó lần ra gấp bội |
| Factory tự đi `new` cả phụ thuộc của sản phẩm | Factory thành composition root ngầm; nên nhận `IServiceProvider` hoặc `Func<>` |
| Dùng factory cho lớp không có biến thể nào | Một tầng nhảy file thừa |

## FAQ

<details>
<summary>Factory Method khác Abstract Factory chỗ nào?</summary>

Factory Method tạo **một** sản phẩm. Abstract Factory tạo **một họ** sản phẩm phải khớp
nhau (nút + ô nhập + menu của cùng một theme).

Phép thử: nếu tạo sai lẻ tẻ một món mà hệ thống vẫn chạy đúng thì bạn cần Factory Method.
Nếu trộn lẫn hai họ gây hỏng thì bạn cần [Abstract Factory](abstract-factory.md).

</details>

<details>
<summary>Dùng <code>Func&lt;IBoXuat&gt;</code> hay đăng ký kiểu <code>Type</code>?</summary>

`Func<>` gần như luôn tốt hơn: nó cho phép truyền phụ thuộc vào sản phẩm bằng closure, và
không cần reflection.

Đăng ký `Type` rồi `Activator.CreateInstance` chỉ hợp lý khi danh sách loại nạp từ cấu
hình dạng chuỗi. Đổi lại: mất kiểm tra lúc biên dịch, chậm hơn, và không thân thiện với
trimming/AOT.

</details>

<details>
<summary>Có nên để factory là <code>static</code> không?</summary>

Trong ví dụ trên `Xuong` là `static` cho gọn, nhưng nó kéo theo đúng vấn đề của
[Singleton](singleton.md): bảng đăng ký là trạng thái toàn cục, và test nào gọi `DangKy`
sẽ ảnh hưởng test khác.

Trong code thật, làm nó thành một lớp thường đăng ký `AddSingleton<IXuongBoXuat>` — cùng
hiệu quả, không kèm rò rỉ giữa test.

</details>

## Related Topics

- [Abstract Factory](abstract-factory.md) — khi cần cả một họ khớp nhau
- [Builder](builder.md) — khi việc tạo có nhiều bước chứ không nhiều loại
- [Strategy](strategy.md) — factory tạo ra chúng, strategy dùng chúng
- [SOLID](../reference/solid.md) — hiện thân trực tiếp của O
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng tra triệu chứng

## References

- GoF — *Design Patterns*, Factory Method
- Microsoft — *Keyed services in dependency injection* (.NET 8+)
