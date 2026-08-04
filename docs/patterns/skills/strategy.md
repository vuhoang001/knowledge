---
title: Strategy
sidebar_position: 21
description: "Nhiều thuật toán cùng mục đích, chọn một lúc chạy — và phép thử thật là chọn bằng dữ liệu hay vẫn còn một if để chọn strategy."
tags: [strategy, behavioral, gof, open-closed, delegate]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Strategy

> **Chốt:** Tách thuật toán ra thành lớp **chưa phải là Strategy**. Phép thử thật:
> *thêm một thuật toán mới có phải sửa code cũ không?* Nếu vẫn còn một `switch` để chọn
> strategy thì bạn vừa dời `if` sang chỗ khác, không bỏ được nó.

## Mục tiêu

Cho phép cách tính một thứ (giảm giá, phí ship, thứ tự sắp xếp, cách nén) trở thành **dữ
liệu cấu hình được**, thay vì một nhánh cứng trong code.

## Ý định gốc (GoF)

Định nghĩa một họ thuật toán, đóng gói từng cái, và làm chúng thay thế được cho nhau.
Strategy cho phép thuật toán thay đổi độc lập với người dùng nó.

```csharp
interface IGiamGia { decimal Ap(decimal gia); string MoTa { get; } }
```

## Ví dụ xuyên suốt — chương trình giảm giá

Chạy bằng `dotnet run 26-strategy.cs` trên .NET 11.0.0. Giá gốc 1.000.000.

### Ba cách viết cùng một thứ

```text
=== Ba cach viet cung mot thu ===
  if-else       : 800,000
  lop Strategy  : 800,000
  Func (delegate): 800,000
```

Cùng kết quả. Nên câu hỏi không phải "cách nào đúng" mà "cách nào trả được phí của nó" —
xem bảng chọn ở dưới.

### Phần **là** Strategy: chọn bằng dữ liệu

```csharp
var bang = new Dictionary<string, IGiamGia>
{
    ["khong"] = new KhongGiam(),
    ["thanh_vien"] = new GiamPhanTram(10),
    ["vip"] = new GiamVip(),
    ["combo"] = new GiamTheoNguong(500_000m, 100_000m),
};
```

```text
=== Phan Strategy: chon bang DU LIEU, khong bang if ===
  khong        khong giam                          1,000,000
  thanh_vien   giam 10%                              900,000
  vip          giam 20% cho VIP                      800,000
  combo        tru 100,000 khi tu 500,000            900,000
```

### Lợi ích thật — nạp từ cấu hình, không biên dịch lại

```csharp
var cauHinh = "phan_tram:15";
var moi = TuCauHinh(cauHinh);
bang["khuyen_mai_thang_8"] = moi;
```

```text
=== Them chuong trinh moi tu CAU HINH, khong bien dich lai ===
  nap "phan_tram:15" -> giam 15%: 850,000
  so chuong trinh dang co: 5
```

Chương trình khuyến mãi tháng 8 xuất hiện mà **không có dòng code nào được sửa**. Đây là
lằn ranh giữa Strategy thật và Strategy hình thức.

### Phần **không phải** Strategy: vẫn còn `if` để chọn

```csharp
IGiamGia ChonBangIf(string loai) => loai switch
{
    "thanh_vien" => new GiamPhanTram(10),
    "vip" => new GiamVip(),
    _ => new KhongGiam()
};
```

```text
=== Phan KHONG phai Strategy: van con if chon strategy ===
  giam 20% cho VIP   <- them loai moi van phai sua ham nay
  giam 20% cho VIP   <- them loai moi chi them mot dong dang ky
```

**Hai dòng ra cùng kết quả, khác nhau ở chi phí thay đổi.** Bản `switch` vẫn phải sửa mỗi
lần thêm loại — tức là vẫn vi phạm [Open/Closed](../reference/solid.md#o--openclosed), chỉ
là bây giờ có thêm bốn lớp.

Nếu đây là toàn bộ những gì bạn làm, `if-else` ban đầu **tốt hơn**: cùng chi phí thay đổi,
ít hơn bốn lớp. Ca hỏng:
[Abstract Factory cho một hiện thực](../case-studies/abstract-factory-cho-mot-hien-thuc.md).

### Kiểm chứng trên nhiều mức giá

```text
=== So sanh ket qua ba cach tren cung bo du lieu ===
         gia       khong    thanh_vien         vip       combo
--------------------------------------------------------------
     100,000     100,000        90,000      80,000     100,000
     400,000     400,000       360,000     320,000     400,000
     600,000     600,000       540,000     480,000     500,000
   2,000,000   2,000,000     1,800,000   1,600,000   1,900,000
```

Cột `combo` cho thấy vì sao strategy cần là **đối tượng có trạng thái** chứ không chỉ một
hàm: `GiamTheoNguong(500_000m, 100_000m)` mang theo hai tham số cấu hình của nó.

### Trước và sau

| | `if-else` | Strategy + bảng đăng ký |
|---|---|---|
| Thêm cách giảm giá | sửa hàm | thêm 1 lớp + 1 dòng đăng ký |
| Nạp từ cấu hình lúc chạy | không | có |
| Test riêng một công thức | qua hàm chung | `new GiamVip().Ap(...)` |
| Mỗi chi nhánh một bộ chương trình | không | có |
| Số kiểu | 0 | 1 interface + n lớp |
| Trình biên dịch kiểm tính đầy đủ | có (với `enum`) | không |

## Lớp hay `Func<>`? Bảng chọn

| Dùng | Khi |
|---|---|
| `Func<decimal, decimal>` | Một phép tính, không trạng thái, không metadata |
| Lớp cài interface | Cần **nhiều method** (`Ap` + `MoTa`), cần trạng thái cấu hình, cần DI tạo cùng phụ thuộc |
| `record` cài interface | Như trên, và muốn so sánh/serialize được strategy |

Trong ví dụ này, `MoTa` là lý do chọn lớp: giao diện cần hiển thị tên chương trình khuyến
mãi, và delegate không mang được thông tin đó.

**Đừng mặc định chọn lớp.** Nếu strategy chỉ có một method và không có trạng thái,
`Func<>` là câu trả lời đúng và ngắn hơn ba lần.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Danh sách thuật toán cố định, do lập trình viên quản | `switch` trên `enum` — trình biên dịch kiểm tính đầy đủ |
| Chỉ có một thuật toán | Không có gì để thay thế cho nhau |
| Thuật toán cần biết cái kế tiếp / có luật chuyển | Đó là [State](state.md) |
| Vẫn phải `switch` để chọn strategy, và danh sách không đến từ dữ liệu | Không được gì so với `if-else` |
| Cần hoàn tác | Đó là [Command](command.md) |

## Trade-offs

| Được | Mất |
|---|---|
| Thêm thuật toán không sửa code cũ | Mất kiểm tra tính đầy đủ lúc biên dịch |
| Thuật toán nạp được từ cấu hình, plugin | Mã sai chỉ nổ lúc chạy |
| Test riêng từng thuật toán | Nhiều lớp nhỏ; đọc lần đầu phải nhảy file |
| Đổi thuật toán lúc chạy, theo tenant | Người gọi phải biết chọn cái nào — trách nhiệm chuyển sang họ |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Giữ `switch` để chọn strategy | Không bỏ được `if`, chỉ dời nó — và cộng thêm n lớp |
| Dựng interface + n lớp cho 2 nhánh cố định | Nhiều code hơn, cùng chi phí thay đổi |
| Strategy có trạng thái thay đổi được, dùng chung | Yêu cầu này ảnh hưởng yêu cầu kia; strategy nên bất biến |
| Interface strategy quá rộng | Vài lớp phải cài method vô nghĩa |
| Nhánh mặc định trả về strategy "không làm gì" | Mã cấu hình sai thành im lặng không giảm giá |
| Người gọi ép kiểu về strategy cụ thể | Phá bỏ toàn bộ tính thay thế được |

## FAQ

<details>
<summary>Nếu dùng DI container thì đăng ký strategy thế nào?</summary>

.NET 8+ có keyed services, đúng cho việc này:

```csharp
services.AddKeyedSingleton<IGiamGia, GiamVip>("vip");
services.AddKeyedSingleton<IGiamGia, GiamPhanTram>("thanh_vien");
// noi dung
var s = sp.GetRequiredKeyedService<IGiamGia>(maChuongTrinh);
```

Container trở thành bảng đăng ký, và bạn không phải tự viết `Dictionary`. Với strategy nạp
từ cấu hình lúc chạy (như ví dụ `"phan_tram:15"`), vẫn cần một factory riêng.

</details>

<details>
<summary>Làm sao biết mã strategy trong cấu hình là hợp lệ?</summary>

Kiểm tra lúc **khởi động**, không phải lúc dùng:

```csharp
foreach (var ma in cauHinh.MaChuongTrinh)
    if (!bang.ContainsKey(ma)) throw new InvalidOperationException($"chua dang ky: {ma}");
```

Đây là cách lấy lại một phần thứ đã mất khi bỏ `switch` trên `enum`: lỗi cấu hình nổ ngay
lúc chạy đầu tiên chứ không phải lúc khách hàng đầu tiên đặt hàng.

</details>

<details>
<summary>Chồng nhiều strategy lên nhau được không (vừa giảm % vừa trừ tiền)?</summary>

Được, và có hai cách với ý nghĩa khác nhau:

- **Composite strategy**: một lớp chứa danh sách strategy, áp lần lượt. Thứ tự quan trọng —
  giảm 10% rồi trừ 100k khác trừ 100k rồi giảm 10%.
- **[Decorator](decorator.md)**: mỗi strategy bọc strategy khác.

Cả hai đều đúng; điều bắt buộc là **thứ tự phải là quyết định tường minh**, có test.

</details>

## Related Topics

- [State](state.md) — cùng hình dạng, nhưng có luật chuyển
- [Bridge](bridge.md) — cùng hình dạng, nhận ra lúc thiết kế thay vì lúc sửa
- [Factory Method](factory-method.md) — thứ tạo ra strategy
- [Template Method](template-method.md) — cắm bằng kế thừa thay vì bằng đối tượng
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng phân biệt Strategy/State/Command

## References

- GoF — *Design Patterns*, Strategy
- Microsoft — *Keyed services in dependency injection* (.NET 8+)
