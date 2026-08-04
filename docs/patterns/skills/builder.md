---
title: Builder
sidebar_position: 4
description: "Constructor nhiều tham số cùng kiểu thì hoán vị nhầm vẫn biên dịch được — 183 tờ giấy thành 242, và không có cảnh báo nào."
tags: [builder, creational, gof, fluent-api]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Builder

> **Chốt:** Builder mua hai thứ mà constructor không cho: **tên cho từng tham số** và
> **một chỗ để kiểm tra chéo trước khi object ra đời**. Nếu chỉ cần thứ nhất thì C# đã có
> object initializer với `required` — rẻ hơn nhiều.

## Mục tiêu

Chặn hai lỗi của constructor nhiều tham số:

1. **Hoán vị nhầm hai tham số cùng kiểu** — biên dịch sạch, chạy sai.
2. **Object ra đời ở trạng thái không hợp lệ** — vì không có chỗ nào kiểm tra tổ hợp các
   tham số.

## Ví dụ xuyên suốt — đơn in tài liệu

Chạy bằng `dotnet run 09-builder.cs` trên .NET 11.0.0.

### Trước — constructor 6 tham số, 4 cái cùng kiểu `int`

```csharp
sealed class DonInCu(string tep, int soTrang, int soBan, int tuTrang, bool haiMat, bool mauSac)
{
    public int SoToGiay() => (int)Math.Ceiling(soTrang / (haiMat ? 2.0 : 1.0)) * soBan;
}
```

Gọi đúng và gọi nhầm chỗ hai tham số:

```csharp
var dung = new DonInCu("bao-cao.pdf", 121, 3, 1, true, false);
var nham = new DonInCu("bao-cao.pdf", 3, 121, 1, true, false);   // hoan vi soTrang <-> soBan
```

```text
=== Truoc: constructor 6 tham so, 4 cai cung kieu int ===
  y dinh : tep=bao-cao.pdf soTrang=121 soBan=3 tuTrang=1 haiMat=True mau=False
  go nham: tep=bao-cao.pdf soTrang=3 soBan=121 tuTrang=1 haiMat=True mau=False
  Trinh bien dich bao gi? khong gi ca — ca hai deu hop le
  So to giay: dung=183  nham=242
```

**183 tờ giấy thành 242**, không một cảnh báo. Với `bool` còn tệ hơn — `true, false` và
`false, true` nhìn giống nhau tới mức review code cũng trượt.

### Sau — builder, mỗi bước có tên

```csharp
sealed class DonInBuilder(string tep)
{
    private int _soTrang = -1, _soBan = 1;
    private bool _haiMat, _mau;

    public DonInBuilder SoTrang(int n)   { _soTrang = n; return this; }
    public DonInBuilder SoBan(int n)     { _soBan = n; return this; }
    public DonInBuilder MatTruocSau()    { _haiMat = true; return this; }
    public DonInBuilder InMau()          { _mau = true; return this; }

    public DonIn Build()
    {
        if (_soTrang < 0) throw new InvalidOperationException("chua khai SoTrang");
        if (_soBan <= 0) throw new ArgumentOutOfRangeException(nameof(_soBan), "SoBan phai >= 1");
        return new DonIn { Tep = tep, SoTrangIn = _soTrang, SoBanIn = _soBan, HaiMat = _haiMat, MauSac = _mau };
    }
}
```

```text
=== Sau: builder, moi buoc co ten ===
  tep=bao-cao.pdf soTrang=121 soBan=3 haiMat=True mau=False
  So to giay: 183
```

Hoán vị `SoTrang` và `SoBan` giờ là chuyện không diễn đạt được — tên method chính là
tên tham số.

### `Build()` là chỗ đặt kiểm tra bắt buộc

```text
=== Build() la cho kiem tra bat buoc ===
  nem: InvalidOperationException: chua khai SoTrang
  nem: ArgumentOutOfRangeException: SoBan phai >= 1 (Parameter '_soBan')
```

Đây là giá trị mà object initializer **không** có: một điểm duy nhất thấy toàn bộ trạng
thái, chạy sau khi mọi bước đã gọi. Kiểm tra chéo kiểu *"nếu `HaiMat` thì `SoTrang` phải
chẵn"* chỉ đặt được ở đây.

### Nhưng C# đã có sẵn một nửa giải pháp

```csharp
var qua2 = new DonIn { Tep = "bao-cao.pdf", SoTrangIn = 121, SoBanIn = 3, HaiMat = true, MauSac = false };
```

```text
=== C# co san: object initializer + required ===
  tep=bao-cao.pdf soTrang=121 soBan=3 haiMat=True mau=False   <- du cho truong hop khong can kiem tra cheo
```

`required string Tep` bắt buộc phải gán — trình biên dịch chặn nếu thiếu. Mọi property
đều có tên tại chỗ gọi. **Với phần lớn trường hợp, đây là câu trả lời đúng, không phải
Builder.**

### Bảng chọn

| Nhu cầu | Cách rẻ nhất |
|---|---|
| Chỉ cần tên cho tham số | Object initializer |
| Bắt buộc phải có vài field | `required` — kiểm tra lúc **biên dịch** |
| Kiểm tra chéo giữa các field | Builder với `Build()`, hoặc validate trong constructor |
| Dựng nhiều bước, ở nhiều chỗ khác nhau trong code | Builder |
| Cùng builder dựng nhiều *biểu diễn* khác nhau (HTML/PDF từ một mô tả) | Builder GoF thuần, có `Director` |
| Object bất biến, cấu hình phức tạp, tái dùng cấu hình gốc | Builder |

Hàng áp chót là bản GoF gốc, hiếm gặp trong code ứng dụng. Bản hay gặp nhất trong .NET
là hàng cuối: `WebApplication.CreateBuilder(args)`, `new DbContextOptionsBuilder()`,
`new HttpRequestMessage` với chuỗi `.With...()`.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Dưới 4 tham số, khác kiểu nhau | Constructor đọc thẳng, không nhầm được |
| Không có kiểm tra chéo nào | `required` + object initializer làm được hết, ít code hơn hẳn |
| Object có thể thay đổi sau khi tạo | Builder chỉ đáng khi kết quả bất biến; không thì cứ gán property |
| Chỉ để "trông chuyên nghiệp" | Gấp đôi lượng code cho cùng một object |

## Trade-offs

| Được | Mất |
|---|---|
| Mỗi giá trị có tên tại chỗ gọi | Viết gấp đôi: mỗi field một method |
| Một chỗ kiểm tra chéo trước khi object ra đời | Lỗi "thiếu field" dời từ compile time sang runtime |
| Giữ được object đích bất biến | Builder tự nó có trạng thái thay đổi được — không dùng chung giữa luồng |
| Dựng dần qua nhiều hàm, nhiều lớp | Người đọc phải tìm `Build()` mới biết object hoàn chỉnh trông thế nào |

**Dòng thứ hai là đánh đổi ngược chiều đáng chú ý:** `required` bắt lỗi lúc biên dịch,
`Build()` bắt lúc chạy. Builder chỉ thắng khi luật kiểm tra phức tạp hơn "phải có mặt".

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Không có `Build()`, trả thẳng object đang dựng | Mất chỗ kiểm tra — object nửa vời lọt ra ngoài |
| `Build()` trả về cùng một thể hiện mỗi lần gọi | Hai chỗ tưởng có object riêng lại dùng chung; sửa cái này đổi cái kia |
| Builder dùng chung giữa nhiều luồng | Trạng thái nội bộ đua nhau, object ra sai lẫn lộn |
| Method trả `void` thay vì `this` | Mất chuỗi gọi — mà đó là gần hết lý do dùng builder |
| Dùng builder cho object 3 field | Gấp đôi code, không mua thêm gì |
| Copy giá trị mặc định vào cả builder lẫn lớp đích | Hai nguồn sự thật, lệch nhau lúc nào không biết |

## FAQ

<details>
<summary>Builder và <code>with</code> của record dùng chung được không?</summary>

Được, và đó là kết hợp gọn nhất khi cần "lấy cấu hình chuẩn rồi sửa vài chỗ":

```csharp
var chuan = CauHinhChuan();          // record bat bien
var rieng = chuan with { SoBan = 5 };
```

Builder vào cuộc khi việc dựng cần nhiều bước có điều kiện (`if (coLogo) b.ThemLogo()`) —
`with` không diễn đạt được luồng đó gọn.

Lưu ý `with` là sao chép **nông** — xem [Prototype](prototype.md).

</details>

<details>
<summary>Có nên để builder ẩn trong lớp đích (<code>DonIn.Builder</code>) không?</summary>

Có, nếu builder chỉ dùng để dựng đúng lớp đó. Lợi ích thật: builder được phép chạm vào
`private` setter của lớp đích, nên lớp đích không cần để `init` công khai — không ai
ngoài builder dựng được object nửa vời.

Cái mất là file dài hơn và hai lớp buộc phải đổi cùng nhau.

</details>

<details>
<summary>Builder GoF gốc có <code>Director</code> — có cần không?</summary>

Hiếm khi. `Director` tồn tại để tái sử dụng **trình tự dựng** với nhiều builder khác
nhau: cùng một trình tự "đọc mô tả → dựng tiêu đề → dựng thân → dựng chân" áp cho
`BuilderHtml` và `BuilderPdf`.

Nếu chỉ có một biểu diễn đầu ra thì `Director` là một lớp không làm gì ngoài gọi lần lượt
mấy method. Bỏ.

</details>

## Related Topics

- [Prototype](prototype.md) — nhân bản một object đã dựng thay vì dựng lại từ đầu
- [Factory Method](factory-method.md) — chọn *lớp nào*, không phải dựng *nhiều bước*
- [Abstract Factory](abstract-factory.md) — một họ object, không phải một object phức tạp
- [Composite](composite.md) — builder hay dùng để dựng cây composite
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng tra triệu chứng

## References

- GoF — *Design Patterns*, Builder
- Joshua Bloch — *Effective Java*, "Consider a builder when faced with many constructor parameters"
