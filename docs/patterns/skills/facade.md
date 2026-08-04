---
title: Facade
sidebar_position: 10
description: "Một cửa vào cho một hệ con nhiều bước — hạ fan-out của người gọi từ 5 xuống 1, và cái bẫy là facade tự phình thành god object."
tags: [facade, structural, gof, coupling]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Facade

> **Chốt:** Facade hạ fan-out của **người gọi**, không hạ độ phức tạp của hệ thống — độ
> phức tạp chỉ chuyển chỗ. Nó đáng làm khi có nhiều người gọi cùng lặp lại một trình tự;
> nó thành gánh nặng khi trở thành cửa vào duy nhất cho mọi thứ.

## Mục tiêu

Chặn tình trạng mỗi chỗ gọi phải tự nhớ *"gọi 5 hệ con theo đúng thứ tự này"* — và mỗi
chỗ nhớ sai một kiểu.

## Ý định gốc (GoF)

Cung cấp một interface hợp nhất cho một tập hợp interface trong một hệ con. Facade định
nghĩa một interface ở mức cao hơn, giúp hệ con **dễ dùng hơn**.

Chú ý hai chữ "dễ dùng hơn", không phải "che giấu hoàn toàn". Facade **không cấm** truy
cập thẳng vào hệ con — đó là khác biệt cốt lõi so với một tầng đóng gói.

## Ví dụ xuyên suốt — đặt hàng qua 5 hệ con

Chạy bằng `dotnet run 15-facade.cs` trên .NET 11.0.0.

### Trước — người gọi tự ghép

```csharp
log.Ghi("bat dau");
if (!kho.Giu("SP-01", 2)) Console.WriteLine("  het hang");
var maGd = tt.Tru("KH-9", 600_000m);
var maVd = vc.Dat("KH-9", "SP-01", 2);
kho.ChotGiu("SP-01", 2);
mail.Gui("kh9@example.com", $"don da dat, van don {maVd}");
log.Ghi("xong");
```

```text
=== Truoc: nguoi goi phai biet 5 lop va dung thu tu ===
  ket qua: gd=GD-1001 vd=VD-77
  Fan-out cua nguoi goi: 5 he con, 7 loi goi, thu tu bat buoc
```

Bảy lời gọi, và **thứ tự là bắt buộc nhưng không được diễn đạt ở đâu cả**: giữ hàng phải
trước trừ tiền, chốt giữ phải sau đặt vận chuyển. Người gọi thứ hai sẽ đảo hai dòng, và
không có gì báo.

### Sau — một cửa vào

```csharp
sealed class CuaDatHang(HeKho kho, HeThanhToan tt, HeVanChuyen vc, HeMail mail, HeLog log)
{
    public string DatHang(string kh, string sku, int sl, decimal tien, string email)
    {
        log.Ghi("bat dau");
        if (!kho.Giu(sku, sl)) throw new HetHangException($"het hang: {sku}");
        var maGd = tt.Tru(kh, tien);
        var maVd = vc.Dat(kh, sku, sl);
        kho.ChotGiu(sku, sl);
        mail.Gui(email, $"don da dat, van don {maVd}");
        log.Ghi("xong");
        return $"gd={maGd} vd={maVd}";
    }
}
```

```text
=== Sau: mot cua vao ===
  ket qua: gd=GD-1001 vd=VD-77
  Fan-out cua nguoi goi: 1 he con, 1 loi goi
```

```text
=== Do fan-out bang reflection ===
  CuaDatHang: nhan 5 he con, lo ra 1 method cong khai
```

**5 vào, 1 ra.** Đó là hình dạng của một facade khoẻ mạnh: nhiều phụ thuộc, ít bề mặt.
Xem [coupling và cohesion](../reference/coupling-cohesion.md) để biết vì sao fan-out 5 ở
đây là chấp nhận được — nó là composition, không phải god class.

### Facade không giấu được lỗi của hệ con

```text
=== Facade KHONG giau duoc loi cua he con ===
  nem: HetHangException: het hang: SP-01
```

Đây là điểm hay bị hiểu nhầm. Facade đơn giản hoá **cách gọi**, không làm hệ con hết lỗi.
Một facade nuốt lỗi để "trông đơn giản" là lặp lại đúng sai lầm của
[adapter nuốt lỗi](adapter.md#adapter-nuốt-lỗi--kiểu-viết-phổ-biến-nhất-và-sai).

### Trước và sau

| | Người gọi tự ghép | Facade |
|---|---|---|
| Fan-out của người gọi | 5 | 1 |
| Số lời gọi | 7 | 1 |
| Thứ tự các bước | mỗi chỗ gọi tự nhớ | một chỗ duy nhất |
| Thêm bước (ghi nhận điểm thưởng) | sửa mọi chỗ gọi | sửa 1 chỗ |
| Vẫn gọi thẳng hệ con được | — | **có**, và đó là đặc điểm chứ không phải khiếm khuyết |
| Số lớp | 5 | 6 |

## Facade không phải là tầng đóng gói

Phân biệt này quan trọng vì hai thứ hay bị gộp:

| | Facade | Tầng đóng gói (encapsulation layer) |
|---|---|---|
| Truy cập thẳng hệ con | Được phép | Bị chặn (`internal`, module) |
| Mục đích | Tiện lợi cho ca phổ biến | Bảo vệ bất biến nghiệp vụ |
| Ca hiếm gặp | Người gọi tự xuống hệ con | Phải bổ sung method vào tầng |

**Facade là tiện lợi, không phải luật.** Nếu bạn *cần* cấm truy cập thẳng (ví dụ để đảm
bảo mọi lần trừ kho đều ghi audit), facade không đủ — phải dùng khả năng hiển thị của
ngôn ngữ và ranh giới module.

## Cái bẫy — facade phình thành god object

Facade bắt đầu với 1 method. Sáu tháng sau nó có 30, vì mọi tính năng mới đều "thêm một
method vào cửa vào cho tiện".

| Dấu hiệu | Ngưỡng đáng lo |
|---|---|
| Số method công khai | Trên ~7 |
| Số hệ con phụ thuộc | Trên ~7 |
| Có method nào chỉ được gọi từ đúng một chỗ | Nó không phải "ca phổ biến" — không thuộc facade |
| Tên lớp có `Manager`, `Service`, `Helper` không kèm danh từ nghiệp vụ | Đang gom theo tầng, không gom theo ca dùng |

**Cách chữa: tách theo ca dùng, không theo hệ con.** `CuaDatHang`, `CuaHuyDon`,
`CuaHoanTien` — mỗi cái fan-out 2–4, mỗi cái một lý do để thay đổi. Đó cũng chính là
[SRP](../reference/solid.md#s--single-responsibility) áp lên facade.

Ca hỏng đầy đủ: [Facade phình thành god object](../case-studies/facade-phinh-thanh-god-object.md).

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Hệ con chỉ có 1–2 lớp và trình tự hiển nhiên | Facade chỉ chuyển tiếp — một tầng thừa |
| Chỉ có **một** chỗ gọi | Trình tự đã nằm ở đúng một chỗ rồi |
| Mỗi người gọi cần một trình tự khác nhau | Facade sẽ mọc tham số cờ; xem [Command](command.md) |
| Bạn cần *cấm* truy cập thẳng hệ con | Facade không cấm được — dùng ranh giới module |

## Trade-offs

| Được | Mất |
|---|---|
| Fan-out người gọi giảm mạnh | Thêm một lớp; độ phức tạp chuyển chỗ chứ không mất |
| Trình tự các bước có đúng một chủ | Facade dễ phình thành god object |
| Đổi hệ con không ảnh hưởng người gọi | Facade trở thành nút thắt: mọi thay đổi đi qua nó |
| Ca phổ biến gọn một dòng | Ca hiếm phải xuống thẳng hệ con — hai đường vào cùng tồn tại |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Để facade nuốt exception của hệ con | Lỗi thành "không làm gì cả"; xem [Adapter](adapter.md) |
| Nhét logic nghiệp vụ vào facade | Facade thành nơi chứa luật nghiệp vụ mà không ai nghĩ tới việc tìm ở đó |
| Một facade cho toàn ứng dụng | God object; fan-out 20+, mọi thay đổi đụng vào nó |
| Thêm tham số cờ để phục vụ nhiều biến thể | Control coupling; `DatHang(..., bool guiMail, bool tinhDiem)` |
| Facade gọi facade gọi facade | Ba tầng chuyển tiếp, không tầng nào thêm giá trị |
| Dùng facade như cách duy nhất để dùng hệ con, rồi ngạc nhiên khi ai đó gọi thẳng | Facade không cấm; nếu cần cấm thì dùng `internal` |

## FAQ

<details>
<summary>Facade khác Adapter chỗ nào?</summary>

Adapter đổi **hình dạng** của một API cho khớp cái bạn cần — interface đích do người khác
quy định. Facade tạo ra một interface **mới, đơn giản hơn** do bạn nghĩ ra, đứng trước
nhiều thứ.

Phép thử: bỏ lớp trung gian đi, người gọi vẫn viết được một dòng (chỉ khác tên) → Adapter.
Phải viết bảy dòng → Facade.

</details>

<details>
<summary>Facade có nên là interface không?</summary>

Có, nếu bạn cần thay bằng bản giả trong test của lớp gọi. Không, nếu facade chỉ là chỗ
gom trình tự và test của bạn nhắm vào chính nó.

Đừng tạo `ICuaDatHang` chỉ vì "phải có interface" — với đúng một hiện thực thì đó là một
lần nhảy file thừa, xem
[khi nào đừng dùng pattern](../reference/what-is-a-pattern.md#khi-nào-không-nên-dùng-pattern).

</details>

<details>
<summary>Facade và use case / application service có phải một không?</summary>

Rất gần nhau, và trong Clean Architecture chúng thường trùng: một application service
điều phối nhiều thứ để hoàn thành một ca dùng, đúng như facade.

Khác biệt là **quy tắc phân chia**. Facade GoF gom theo *hệ con*; use case gom theo *việc
người dùng muốn làm*. Cách thứ hai chống phình tốt hơn hẳn — vì số ca dùng có giới hạn tự
nhiên, còn "mọi thứ liên quan tới đơn hàng" thì không.

</details>

## Related Topics

- [Adapter](adapter.md) — đổi hình dạng một API, không giấu bớt nhiều API
- [Mediator](mediator.md) — cũng đứng giữa, nhưng hai chiều và các bên biết nó
- [Coupling và cohesion](../reference/coupling-cohesion.md) — fan-out, và ngưỡng god object
- [SOLID](../reference/solid.md) — SRP là thứ chặn facade phình
- [Command](command.md) — khi mỗi người gọi cần một trình tự khác nhau

## References

- GoF — *Design Patterns*, Facade
