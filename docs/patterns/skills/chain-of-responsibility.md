---
title: Chain of Responsibility
sidebar_position: 13
description: "Chuỗi người xử lý, ai nhận được thì dừng — và hai cái bẫy: không ai nhận thì im lặng, và đảo thứ tự làm mọi yêu cầu rơi vào mắt xích đầu."
tags: [chain-of-responsibility, behavioral, gof, middleware]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Chain of Responsibility

> **Chốt:** Người gửi không biết ai sẽ xử lý — đó là cả sức mạnh lẫn bẫy. Hai thứ phải
> quyết định tường minh: **thứ tự** các mắt xích, và **chuyện gì xảy ra khi không ai
> nhận**. Bỏ qua cái thứ hai là yêu cầu biến mất không dấu vết.

## Mục tiêu

Thay chuỗi `if/else if` dài — trong đó mỗi nhánh là một *người xử lý* khác nhau — bằng
một danh sách ghép được lúc chạy.

## Ý định gốc (GoF)

Tránh gắn chặt người gửi yêu cầu với người nhận, bằng cách cho nhiều đối tượng cơ hội xử
lý. Nối chúng thành chuỗi và chuyển yêu cầu dọc chuỗi cho tới khi có người xử lý.

```csharp
abstract class NguoiXuLy : INguoiXuLy
{
    public INguoiXuLy? Tiep { get; set; }
    public string? Xu(YeuCau y) => Nhan(y) ? $"{GetType().Name} duyet" : Tiep?.Xu(y);
    protected abstract bool Nhan(YeuCau y);
}
```

## Ví dụ xuyên suốt — duyệt hoàn tiền theo hạn mức

Chạy bằng `dotnet run 18-chain.cs` trên .NET 11.0.0.

| Người duyệt | Nhận khi |
|---|---|
| `TruongCa` | hoàn tiền ≤ 1.000.000 |
| `QuanLy` | hoàn tiền ≤ 10.000.000 |
| `GiamDoc` | hoàn tiền, không giới hạn |

### Bẫy 1 — không ai nhận, và không có gì báo

```text
=== Chuoi khong co nguoi chot ===
  hoan tien       200,000 -> TruongCa duyet
  hoan tien     8,000,000 -> QuanLy duyet
  hoan tien    90,000,000 -> GiamDoc duyet
  doi hang         50,000 -> (khong ai xu ly — im lang)
```

Ba dòng đầu đúng. Dòng thứ tư là yêu cầu *đổi hàng* — không mắt xích nào của chuỗi này
nhận nó, và `Tiep?.Xu(y)` ở mắt xích cuối trả về `null`.

**`null` đó đi thẳng ra ngoài.** Nếu người gọi không kiểm tra, yêu cầu đổi hàng biến mất:
không lỗi, không log, không hàng đợi chết. Khách chờ mãi không thấy phản hồi.

### Cách sửa — luôn có mắt xích chốt

```csharp
var chuoi2 = Noi(new TruongCa(), new QuanLy(), new GiamDoc(), new ChotSo());
```

```text
=== Chuoi co nguoi chot o cuoi ===
  hoan tien       200,000 -> TruongCa duyet
  hoan tien     8,000,000 -> QuanLy duyet
  hoan tien    90,000,000 -> GiamDoc duyet
  doi hang         50,000 -> ChotSo duyet
```

`ChotSo` nhận mọi thứ. Trong code thật nó nên **ghi log rồi ném** hoặc đẩy vào hàng đợi
xử lý tay — điều quan trọng không phải nó xử lý được, mà là **không có gì rơi ra ngoài
im lặng**.

Kiểu trả về cũng nên nói lên điều đó: `string?` mời gọi việc quên kiểm tra `null`. Một
kiểu `KetQua` có hai nhánh rõ ràng (`DaXuLy` / `KhongAiNhan`) buộc người gọi phải xử lý
cả hai.

### Bẫy 2 — thứ tự quyết định kết quả

```csharp
var chuoi3 = Noi(new GiamDoc(), new TruongCa(), new QuanLy(), new ChotSo());
```

```text
=== Thu tu doi ket qua: dat GiamDoc len dau ===
  hoan tien       200,000 -> GiamDoc duyet
  hoan tien     8,000,000 -> GiamDoc duyet
  hoan tien    90,000,000 -> GiamDoc duyet
  doi hang         50,000 -> ChotSo duyet
```

**Mọi khoản hoàn tiền giờ do giám đốc duyệt**, kể cả 200.000 đồng. Không lỗi nào, không
cảnh báo nào — chuỗi vẫn hoạt động đúng theo định nghĩa của nó, chỉ là quy trình nghiệp
vụ đã sai.

Quy tắc: **mắt xích hẹp nhất đứng trước.** Và vì thứ tự là một quyết định nghiệp vụ vô
hình trong code nối dây, nó cần một test riêng.

Ca hỏng đầy đủ: [Yêu cầu rơi qua hết chuỗi](../case-studies/request-roi-qua-het-chain.md).

### Trước và sau

| | `if/else if` | Chuỗi |
|---|---|---|
| Thêm cấp duyệt | sửa hàm | thêm 1 lớp + 1 dòng nối |
| Đổi thứ tự | sửa hàm | đổi thứ tự nối dây |
| Cấu hình theo chi nhánh | không | nối chuỗi khác nhau cho mỗi chi nhánh |
| Không nhánh nào khớp | `else` — trình biên dịch nhắc bạn nghĩ tới | trả `null` **im lặng** |
| Đọc luồng | thấy hết trong một hàm | phải tìm chỗ nối dây |

Dòng thứ tư là điều cần nhớ: chuỗi **mất** đi thứ mà `if/else` cho không — sự chú ý bắt
buộc vào nhánh cuối.

## Hai biến thể

| Biến thể | Hành vi | Dùng khi |
|---|---|---|
| **Dừng ở người đầu tiên nhận** | Như ví dụ trên | Duyệt, định tuyến, phân quyền |
| **Đi hết chuỗi, ai cũng chạy** | Không có `return` sớm | Pipeline xử lý: xác thực → ghi log → nén |

Biến thể thứ hai chính là **middleware** của ASP.NET Core, và nó gần với
[Decorator](decorator.md) hơn là Chain of Responsibility gốc. Khác biệt: middleware có
quyền *không* gọi tiếp (short-circuit), nên nó nằm giữa hai pattern.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Chỉ có 2–3 nhánh cố định | `switch` đọc thẳng, trình biên dịch kiểm tính đầy đủ |
| Luôn biết chắc ai xử lý | Gọi thẳng; chuỗi chỉ thêm gián tiếp |
| Cần **nhiều** người cùng xử lý và biết kết quả của nhau | Xem [Mediator](mediator.md) hoặc pipeline có trạng thái |
| Thứ tự không được phép sai và không ai nhớ nó | Nếu vẫn dùng, phải có test khoá thứ tự |

## Trade-offs

| Được | Mất |
|---|---|
| Thêm/bớt/đổi thứ tự người xử lý mà không sửa code cũ | Thứ tự thành quyết định vô hình ở chỗ nối dây |
| Người gửi không biết ai xử lý | Debug khó: phải lần theo chuỗi mới biết ai đã nhận |
| Chuỗi cấu hình được theo môi trường, theo tenant | Không có gì đảm bảo có người nhận |
| Mỗi người xử lý test được riêng | Chi phí duyệt chuỗi tuyến tính theo độ dài |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Không có mắt xích chốt ở cuối | Yêu cầu biến mất im lặng — đúng output đầu tiên |
| Trả `null` cho "không ai nhận" | Người gọi quên kiểm tra; dùng kiểu kết quả tường minh hơn |
| Xếp mắt xích rộng lên trước | Mọi thứ rơi vào nó — đúng output thứ ba |
| Mắt xích giữ trạng thái riêng giữa các yêu cầu | Yêu cầu này ảnh hưởng yêu cầu kia; mắt xích nên không trạng thái |
| Chuỗi có vòng (A → B → A) | Đệ quy vô hạn |
| Một mắt xích vừa xử lý vừa gọi tiếp | Hai mắt xích cùng xử lý; ngữ nghĩa "ai nhận thì dừng" bị phá |

## FAQ

<details>
<summary>Chain of Responsibility khác Decorator chỗ nào?</summary>

Quyền dừng. Trong [Decorator](decorator.md), mọi lớp bọc đều chạy và đều gọi tiếp — bỏ
qua một lớp là lỗi. Trong chuỗi, **dừng sớm là hành vi bình thường**.

Hệ quả: decorator không đổi kết quả nghiệp vụ (chỉ thêm log, cache); chuỗi thì chính nó
quyết định kết quả.

</details>

<details>
<summary>Nối chuỗi bằng <code>Tiep</code> hay bằng <code>List</code>?</summary>

`List` + vòng lặp gần như luôn tốt hơn trong code ứng dụng:

```csharp
foreach (var h in _danhSach) { var r = h.Thu(y); if (r is not null) return r; }
throw new KhongAiXuLy(y);
```

Lý do: thứ tự **hiện rõ** ở một chỗ, không phải suy ra bằng cách lần theo con trỏ; không
tạo được vòng; và không có trạng thái `Tiep` trên chính người xử lý (nên chúng dùng lại
được ở nhiều chuỗi).

Bản con trỏ `Tiep` của GoF hợp lý hơn khi chuỗi được dựng động, từng phần, ở nhiều nơi.

</details>

<details>
<summary>Làm sao test được thứ tự chuỗi?</summary>

Viết test nhắm vào **chuỗi thật dựng từ composition root**, không phải từng mắt xích:

```csharp
[Fact] void Hoan_tien_nho_phai_do_truong_ca_duyet()
    => Assert.Equal("TruongCa duyet", ChuoiThat().Xu(new YeuCau("hoan tien", 200_000m)));
```

Một test cho mỗi ngưỡng nghiệp vụ. Đây là loại test rẻ và bắt đúng lỗi đảo thứ tự — loại
lỗi mà unit test từng mắt xích không bao giờ thấy.

</details>

## Related Topics

- [Decorator](decorator.md) — cũng là chuỗi, nhưng mọi mắt xích đều chạy
- [Command](command.md) — yêu cầu vật hoá thành đối tượng, hay đi cùng chuỗi
- [Mediator](mediator.md) — khi cần điều phối chứ không chỉ chuyển tiếp
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng tra triệu chứng
- [SOLID](../reference/solid.md) — hiện thân của O

## References

- GoF — *Design Patterns*, Chain of Responsibility
- Microsoft — *ASP.NET Core Middleware*
