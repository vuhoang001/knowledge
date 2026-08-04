---
title: Command
sidebar_position: 14
description: "Vật hoá yêu cầu thành đối tượng để undo, xếp hàng, ghi lại — và cái bẫy là undo tính ngược bằng công thức thay vì lưu giá trị cũ."
tags: [command, behavioral, gof, undo, cqrs]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Command

> **Chốt:** Command biến một *lời gọi hàm* thành một *đối tượng* — nhờ đó nó lưu được,
> xếp hàng được, hoàn tác được. Bẫy lớn nhất: `HoanTac()` tính ngược bằng công thức thay
> vì lưu **giá trị thật sự đã thay đổi**. Output ở dưới cho thấy tồn kho 10 thành 24.

## Mục tiêu

Tách *ai yêu cầu* khỏi *ai thực hiện*, để có thể làm ba việc mà lời gọi hàm thường không
cho: hoãn thực hiện, thực hiện lại, và đảo ngược.

## Ý định gốc (GoF)

Đóng gói một yêu cầu thành đối tượng, nhờ đó tham số hoá được người gọi với các yêu cầu
khác nhau, xếp hàng hoặc ghi nhật ký yêu cầu, và hỗ trợ hoàn tác.

```csharp
interface ILenh { void ThucThi(); void HoanTac(); }
```

Hai method đó là toàn bộ pattern. Mọi thứ còn lại — stack lịch sử, hàng đợi, macro — là
hệ quả.

## Ví dụ xuyên suốt — soạn thảo và xuất kho

Chạy bằng `dotnet run 19-command.cs` trên .NET 11.0.0.

### Undo đúng — lưu trạng thái cũ

```csharp
sealed class VietHoaTatCa(VanBan vb) : ILenh
{
    private string _cu = "";
    public void ThucThi() { _cu = vb.NoiDung; vb.NoiDung = vb.NoiDung.ToUpperInvariant(); }
    public void HoanTac() => vb.NoiDung = _cu;
}
```

```text
=== Undo dung: luu trang thai cu ===
  sau 3 lenh : "XIN CHAO THE GIOI"
  undo       : "Xin chao the gioi"
  undo       : "Xin chao"
  undo       : ""
```

Chú ý `VietHoaTatCa` **không** thử "viết thường lại" — đó là phép tính ngược không tồn
tại (`"Xin chao"` viết hoa rồi viết thường ra `"xin chao"`, sai chữ X). Nó lưu chuỗi cũ.

### Undo sai — tính ngược bằng công thức

```csharp
sealed class XuatKhoTinhNguoc(TonKho kho, int yeuCau) : ILenh
{
    public void ThucThi() { DaXuat = Math.Min(yeuCau, kho.So); kho.So -= DaXuat; }
    public void HoanTac() => kho.So += yeuCau;          // SAI: cong lai so YEU CAU
}
```

```text
=== Undo sai: tinh nguoc bang cong thuc ===
  xuat 4  -> ton 6
  xuat 20 -> ton 0  (chi xuat duoc 6)
  undo    -> ton 20  <- ky vong 6
  undo    -> ton 24  <- ky vong 10
```

**Tồn kho bắt đầu ở 10 và kết thúc ở 24.** Lệnh yêu cầu xuất 20 nhưng chỉ xuất được 6
(hết hàng); `HoanTac` cộng lại 20. Mười bốn đơn vị hàng hoá được tạo ra từ hư không.

Lỗi này ẩn kỹ vì nó **chỉ xuất hiện khi có chặn trên** — với dữ liệu bình thường
(`yeuCau <= kho.So`) thì `yeuCau == DaXuat` và mọi thứ khớp. Test viết bằng dữ liệu đẹp
sẽ xanh mãi mãi.

### Sửa — lưu cái đã thật sự xảy ra

```csharp
sealed class XuatKhoLuuThat(TonKho kho, int yeuCau) : ILenh
{
    private int _daXuat;
    public void ThucThi() { _daXuat = Math.Min(yeuCau, kho.So); kho.So -= _daXuat; }
    public void HoanTac() => kho.So += _daXuat;         // DUNG: cong lai so DA XUAT
}
```

```text
=== Undo dung: luu so da xuat that su ===
  sau 2 lenh -> ton 0
  undo       -> ton 6  <- ky vong 6
  undo       -> ton 10  <- ky vong 10
```

**Quy tắc:** `HoanTac()` phải dựa trên *cái đã xảy ra*, không phải *cái được yêu cầu*.
Nếu `ThucThi()` có bất kỳ nhánh nào (kẹp giá trị, bỏ qua, thất bại một phần), tính ngược
bằng công thức là sai.

Ca hỏng đầy đủ: [Undo không trả lại trạng thái cũ](../case-studies/undo-khong-tra-lai-trang-thai-cu.md).

### Command còn dùng để xếp hàng

```text
=== Command con dung de xep hang va chay lai ===
  3 lenh trong hang doi, chua chay: ""
  sau khi chay het: "AB"
```

Lệnh tồn tại như dữ liệu **trước khi** chạy — đó là thứ lời gọi hàm không làm được. Từ đây
mở ra: chạy sau, chạy trên máy khác, thử lại khi lỗi, ghi nhật ký để dựng lại trạng thái.

### Trước và sau

| | Gọi hàm thẳng | Command |
|---|---|---|
| Hoàn tác | tự viết logic ngược ở mỗi chỗ | `HoanTac()` cạnh `ThucThi()` |
| Xếp hàng, chạy sau | không | lệnh là dữ liệu |
| Ghi lại để chạy lại | phải log tay theo định dạng riêng | serialize lệnh |
| Gộp nhiều thao tác thành một undo | không | macro command |
| Số lớp | 0 | 1 lớp / thao tác |
| Đọc luồng | thấy ngay | phải mở lớp lệnh |

## Undo: hai chiến lược

| Cách | Lưu gì | Hợp khi |
|---|---|---|
| **Lệnh nghịch** (như trên) | Đủ thông tin để đảo ngược | Thao tác nhỏ, trạng thái lớn |
| **Ảnh chụp** ([Memento](memento.md)) | Toàn bộ trạng thái trước khi chạy | Thao tác phức tạp, trạng thái nhỏ |

Ảnh chụp **luôn đúng** nhưng tốn bộ nhớ theo kích thước trạng thái. Lệnh nghịch rẻ nhưng
phải viết đúng — và output ở trên cho thấy "viết đúng" khó hơn vẻ ngoài.

**Quy tắc thực dụng:** bắt đầu bằng ảnh chụp. Chuyển sang lệnh nghịch chỉ khi đã đo thấy
bộ nhớ là vấn đề.

## Command trong .NET ngày nay

| Chỗ gặp | Hình dạng |
|---|---|
| MediatR / CQRS | `record TaoDonHang(...) : IRequest<KetQua>` + một handler |
| Message queue | Message chính là command đã serialize |
| `ICommand` của WPF/MAUI | `Execute` + `CanExecute` |
| Background job (Hangfire) | Job được lưu vào DB rồi chạy sau — command persist |

Chú ý CQRS dùng Command **không kèm undo**: nó lấy phần "yêu cầu là dữ liệu" và bỏ phần
"hoàn tác được". Đó là cách dùng hợp lệ và phổ biến nhất hiện nay.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Không cần undo, không cần xếp hàng, không cần ghi lại | Một lời gọi hàm là đủ; command chỉ thêm một lớp |
| Mỗi lệnh có `HoanTac()` rỗng | Dấu hiệu rõ nhất là bạn không cần pattern này |
| Thao tác không thể đảo ngược (gửi email, gọi API bên ngoài) | Undo là lời hứa không giữ được; phải thiết kế bù trừ (compensating action) |
| Chỉ có 1–2 thao tác | `Action` delegate rẻ hơn hẳn một cây lớp |

Dòng thứ ba đáng nhớ: một `HoanTac()` "gửi email xin lỗi" **không** phải undo — nó là
hành động bù trừ, và nên được đặt tên như vậy.

## Trade-offs

| Được | Mất |
|---|---|
| Undo/redo có chỗ đặt tự nhiên | Mỗi thao tác một lớp — số lớp tăng theo số thao tác |
| Yêu cầu lưu được, gửi đi được, chạy lại được | Phải nghĩ về serialize và tương thích phiên bản |
| Người gọi không biết ai thực hiện | Luồng thực thi khó lần khi debug |
| Gộp thành macro, chạy theo lô | Stack lịch sử ăn bộ nhớ; phải giới hạn độ sâu |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| `HoanTac()` tính ngược bằng công thức | Tồn kho 10 thành 24 — đúng output ở trên |
| Lệnh giữ tham chiếu tới đối tượng đã bị thay thế | Undo tác động lên object cũ, không ai thấy |
| Stack undo không giới hạn | Rò rỉ bộ nhớ trong ứng dụng chạy lâu |
| Undo một lệnh giữa stack thay vì từ đỉnh | Trạng thái không nhất quán; undo phải theo LIFO |
| `HoanTac()` cho thao tác không đảo ngược được | Lời hứa sai; người dùng bấm undo và không có gì xảy ra |
| Nhét logic nghiệp vụ vào lệnh thay vì gọi domain | Logic phân tán vào tầng ứng dụng |

## FAQ

<details>
<summary>Có nên dùng <code>Action</code> thay cho một lớp lệnh không?</summary>

Được, khi **không cần undo và không cần serialize**. `Queue<Action>` là một hàng đợi lệnh
hoàn toàn hợp lệ.

Lớp thắng khi cần: cặp `ThucThi`/`HoanTac`, trạng thái đã lưu để undo, metadata (tên lệnh
để hiển thị "Hoàn tác: Viết hoa"), hoặc khả năng serialize để gửi qua hàng đợi.

</details>

<details>
<summary>Redo làm thế nào?</summary>

Hai stack. `HoanTac()` pop khỏi `undo` và push vào `redo`; một lệnh mới thì **xoá sạch**
stack `redo`.

Bước xoá đó hay bị quên, và hậu quả là redo áp một lệnh cũ lên một trạng thái đã khác —
kết quả sai mà không có lỗi nào.

</details>

<details>
<summary>Macro command (gộp nhiều lệnh) thì undo thế nào?</summary>

Undo theo **thứ tự ngược**:

```csharp
public void HoanTac() { for (var i = _ds.Count - 1; i >= 0; i--) _ds[i].HoanTac(); }
```

Và nếu `ThucThi()` của macro thất bại giữa chừng, phải hoàn tác những lệnh **đã chạy**
trước khi ném — nếu không trạng thái nằm ở giữa chừng, tệ hơn cả hai đầu.

</details>

## Related Topics

- [Memento](memento.md) — chiến lược undo bằng ảnh chụp
- [Chain of Responsibility](chain-of-responsibility.md) — lệnh đi qua chuỗi người xử lý
- [Strategy](strategy.md) — cũng đóng gói hành vi, nhưng không có undo và không lưu được
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng phân biệt Strategy/State/Command
- [Prototype](prototype.md) — sao chép sâu là thứ macro undo hay cần

## References

- GoF — *Design Patterns*, Command
