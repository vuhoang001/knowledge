---
title: Abstract Factory
sidebar_position: 3
description: "Tạo cả một họ sản phẩm phải khớp nhau — vì trộn hai họ không ném exception nào, chỉ ra giao diện nửa sáng nửa tối."
tags: [abstract-factory, creational, gof, dependency-inversion]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Abstract Factory

> **Chốt:** Dùng khi các sản phẩm **phải khớp nhau theo họ** và việc trộn nhầm không gây
> lỗi nào cả — chỉ gây kết quả sai. Không có ràng buộc "phải khớp" thì
> [Factory Method](factory-method.md) là đủ, và Abstract Factory chỉ là tầng thừa.

## Mục tiêu

Chặn loại lỗi không có exception: mỗi thành phần đúng riêng lẻ, ghép lại thì sai — nút
theme tối cạnh ô nhập theme sáng, hoặc `SqlOrderRepo` cạnh `MongoCustomerRepo` trong cùng
một transaction.

## Ý định gốc (GoF)

Cung cấp một interface để tạo **các họ** đối tượng liên quan, mà không chỉ rõ lớp cụ thể.

```csharp
interface IXuongGiaoDien
{
    IThanhPhan TaoNut();
    IThanhPhan TaoONhap();
    IThanhPhan TaoMenu();
}
```

Điểm khác Factory Method nằm ở chỗ interface có **nhiều** method tạo. Đó không phải chi
tiết cú pháp — đó là toàn bộ ý nghĩa: một xưởng cam kết rằng ba thứ nó tạo ra đi được
với nhau.

## Ví dụ xuyên suốt — theme giao diện

Chạy bằng `dotnet run 08-abstract-factory.cs` trên .NET 11.0.0.

### Trước — người gọi tự chọn từng mảnh

```csharp
var manhRoi = new IThanhPhan[] { new NutSang(), new ONhapToi(), new MenuSang() };
```

```text
=== Truoc: nguoi goi tu chon tung manh ===
tron tay         [Nut:sang, ONhap:toi, Menu:sang]
                 so theme khac nhau = 2  TRON HO
```

Ba dòng `new`, cả ba đều biên dịch được, cả ba đều chạy. Chỉ có người dùng nhìn màn hình
mới phát hiện ra. **Không có chỗ nào trong code để đặt một `Assert`** — vì không có chỗ
nào biết cả ba thành phần cùng lúc.

### Sau — một xưởng cho mỗi họ

```csharp
sealed class XuongSang : IXuongGiaoDien
{
    public IThanhPhan TaoNut()   => new NutSang();
    public IThanhPhan TaoONhap() => new ONhapSang();
    public IThanhPhan TaoMenu()  => new MenuSang();
}

sealed class XuongToi : IXuongGiaoDien
{
    public IThanhPhan TaoNut()   => new NutToi();
    public IThanhPhan TaoONhap() => new ONhapToi();
    public IThanhPhan TaoMenu()  => new MenuToi();
}
```

```text
=== Sau: xuong dung mot ho ===
XuongSang        [Nut:sang, ONhap:sang, Menu:sang]
                 so theme khac nhau = 1  OK
XuongToi         [Nut:toi, ONhap:toi, Menu:toi]
                 so theme khac nhau = 1  OK
```

Người gọi giờ nhận `IXuongGiaoDien` và **không có cách nào** trộn họ, vì nó không còn
biết tên lớp cụ thể nào.

### Thêm họ thứ ba

```text
=== Them ho thu ba: tuong phan cao ===
XuongTuongPhan   [Nut:tuong-phan, ONhap:tuong-phan, Menu:tuong-phan]
                 so theme khac nhau = 1  OK
```

Thêm một lớp xưởng + ba lớp thành phần. **Không sửa dòng nào ở phía người gọi.**

### Trước và sau

| | Chọn tay từng mảnh | Abstract Factory |
|---|---|---|
| Trộn nhầm họ | biên dịch được, chạy được, sai | không diễn đạt được |
| Thêm họ thứ ba | sửa mọi chỗ `new` | thêm 1 xưởng, người gọi không đổi |
| Thêm **loại thành phần** thứ tư (ví dụ `TaoBang`) | thêm một `new` ở mỗi chỗ | **sửa interface → sửa cả 3 xưởng** |
| Người gọi biết bao nhiêu lớp cụ thể | 3 × số họ | 0 |

**Dòng thứ ba là nhược điểm cố hữu của pattern này**, và không có cách né. Abstract
Factory làm việc thêm *họ* rẻ và việc thêm *loại sản phẩm* đắt. Chọn nó khi bạn tin số
họ sẽ tăng và danh sách loại sản phẩm ổn định — đoán sai chiều này là đau.

## Nhận ra nó ngoài giao diện người dùng

Ví dụ theme là ví dụ SGK, nhưng chỗ gặp thật nhiều hơn hẳn:

| Ngữ cảnh | Họ sản phẩm | Trộn nhầm thì sao |
|---|---|---|
| Nhiều loại CSDL | `IKetNoi`, `ILenh`, `IGiaoDich` cùng một provider | Giao dịch của provider A không bao được lệnh của provider B |
| Nhiều môi trường | `IKho`, `IHangDoi`, `ILuuTru` bản thật / bản trong bộ nhớ | Test dùng kho thật, hàng đợi giả — kết quả vô nghĩa |
| Đa vùng | Định dạng ngày + tiền tệ + thứ tự sắp xếp | Ngày kiểu Mỹ cạnh tiền kiểu Việt |
| Multi-tenant | Bộ quy tắc tính phí + hạn mức + mẫu email theo tenant | Tính phí tenant A gửi mẫu email tenant B |

Dòng thứ hai là lý do `IXuongHaTang` xuất hiện nhiều trong code test — và cũng là lý do
nó thường **không** cần tồn tại: DI container đã làm đúng việc đó khi bạn đăng ký một bộ
service khác cho môi trường test.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Các sản phẩm **không** bắt buộc khớp nhau | Dùng [Factory Method](factory-method.md) riêng cho từng loại |
| Chỉ có một họ, và chưa thấy họ thứ hai | Tầng thừa — xem [ca hỏng](../case-studies/abstract-factory-cho-mot-hien-thuc.md) |
| Danh sách loại sản phẩm còn đang thay đổi nhiều | Mỗi lần thêm loại phải sửa mọi xưởng |
| Đã có DI container và mỗi môi trường một module đăng ký | Container chính là abstract factory, viết lại là trùng lặp |

## Trade-offs

| Được | Mất |
|---|---|
| Không thể trộn nhầm họ — sai lệch bị chặn từ thiết kế | Thêm loại sản phẩm phải sửa interface và **mọi** xưởng |
| Người gọi không biết lớp cụ thể nào | Nhiều lớp: `số họ × số loại` + số xưởng |
| Đổi cả họ bằng một dòng đăng ký | Khó nhìn ra sản phẩm thật nào đang chạy khi debug |
| Thêm họ mới không sửa người gọi | Nếu chỉ có một họ thì mọi chi phí trên là lỗ ròng |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Dùng khi các sản phẩm độc lập nhau | Ràng buộc giả — buộc phải tạo cả ba khi chỉ cần một |
| Để lọt một chỗ `new` lớp cụ thể | Đủ để tái tạo lỗi trộn họ; và nó sẽ không bị test nào bắt |
| Xưởng tự chứa logic nghiệp vụ | Xưởng chỉ nên *tạo*; logic ở đó không ai tìm ra |
| Một interface xưởng với 12 method tạo | Đa số người gọi chỉ cần 2 — vi phạm [ISP](../reference/solid.md#i--interface-segregation) |
| Dựng abstract factory cho đúng một hiện thực | Bốn kiểu mới, không thêm khả năng nào |

## FAQ

<details>
<summary>DI container đã làm việc này rồi, còn cần Abstract Factory không?</summary>

Thường là không. `AddScoped<IKho, KhoSql>()` cho môi trường thật và `KhoTrongBoNho` cho
test đã đảm bảo cả bộ khớp nhau, vì cả bộ được đăng ký cùng một chỗ.

Abstract Factory vẫn cần khi việc chọn họ xảy ra **lúc chạy, theo dữ liệu** — ví dụ chọn
bộ quy tắc theo tenant của request hiện tại. Container quyết định lúc khởi động; xưởng
quyết định lúc chạy.

</details>

<details>
<summary>Có thể dùng generic để đỡ phải viết nhiều xưởng không?</summary>

Được một phần: `IXuong<TTheme>` với ràng buộc kiểu giảm được code lặp. Nhưng nó chuyển
việc chọn họ về **lúc biên dịch**, mất đúng khả năng chọn lúc chạy vốn là lý do dùng
pattern này.

Dùng generic khi họ được biết ở compile time; dùng xưởng thường khi họ đến từ cấu hình.

</details>

<details>
<summary>Làm sao chặn được việc ai đó vẫn <code>new NutSang()</code> trực tiếp?</summary>

Ba mức, tăng dần độ cứng:

1. Đặt lớp cụ thể là `internal`, chỉ để interface `public` — người ngoài assembly không
   `new` được.
2. Thêm một analyzer/luật kiến trúc (ví dụ `NetArchTest`) chặn tham chiếu tới namespace
   lớp cụ thể từ ngoài.
3. Đặt lớp thành `private nested` bên trong chính xưởng — cứng nhất, và khó test riêng
   nhất.

Mức 1 là điểm cân bằng tốt cho phần lớn dự án.

</details>

## Related Topics

- [Factory Method](factory-method.md) — khi chỉ cần một sản phẩm, không phải một họ
- [Builder](builder.md) — một object phức tạp nhiều bước, không phải nhiều object
- [Bridge](bridge.md) — cũng tách hai trục, nhưng ở phía cấu trúc chứ không phía tạo
- [Singleton](singleton.md) — xưởng thường được đăng ký với vòng đời singleton
- [SOLID](../reference/solid.md) — hiện thân của D

## References

- GoF — *Design Patterns*, Abstract Factory
