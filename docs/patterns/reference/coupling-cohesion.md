---
title: Coupling và cohesion — thước đo pattern thật sự phục vụ
sidebar_position: 4
description: "Fan-out đếm được bằng reflection và bằng số test double phải dựng — một con số cụ thể thay cho cảm giác code này rối."
tags: [coupling, cohesion, fan-out, testing, refactoring]
domain: backend
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Coupling và cohesion — thước đo pattern thật sự phục vụ

> **Chốt:** Mọi pattern GoF đều đang mua **coupling thấp** bằng cách trả **số lớp cao**.
> Biết đo coupling thì biết mình đang mua có hời không. Thước đo rẻ nhất và trung thực
> nhất: **số phụ thuộc trong constructor** — cũng đúng bằng số test double phải dựng.

## Mục tiêu

Thay câu *"code này rối"* bằng một con số kiểm được, để tranh luận trong code review có
chỗ dừng.

## Tổng quan

Hai khái niệm ngược chiều, đo hai thứ khác nhau:

| | Coupling | Cohesion |
|---|---|---|
| Đo cái gì | Lớp này **biết bao nhiêu** lớp khác | Các phần bên trong lớp có **thuộc về nhau** không |
| Muốn | Thấp | Cao |
| Triệu chứng khi sai | Sửa một chỗ vỡ năm chỗ | Lớp tên `Manager`, `Helper`, `Utils` |
| Đo bằng | Fan-out, fan-in | Field nào được method nào dùng |

**Chúng không đánh đổi lẫn nhau.** Cohesion cao thường *kéo theo* coupling thấp — một
lớp làm đúng một việc thì cần ít thứ hơn. Chỗ đánh đổi thật là giữa coupling và **số
lượng lớp**.

## Ví dụ xuyên suốt — tách một god class

Chạy bằng `dotnet run 04-coupling.cs` trên .NET 11.0.0.

### Trước — một lớp làm tất cả

```csharp
sealed class DichVuDonHangGop(
    IKhoHang kho, IThanhToan tt, IGuiMail mail, IGuiSms sms,
    IGhiLog log, IDoiTien doi, IKhoDonHang khoDon)
{
    public void DatHang(string sku, int sl, decimal tien) { }
    public void HuyHang(string ma) { }
    public void HoanTien(string ma) { }
}
```

### Sau — tách theo lý do thay đổi

```csharp
sealed class DatHangUseCase(IKhoHang kho, IThanhToan tt, IKhoDonHang khoDon)
{
    public void ThucThi(string sku, int sl, decimal tien) { }
}

sealed class GuiThongBaoSauDatHang(IGuiMail mail, IGuiSms sms)
{
    public void ThucThi(string ma) { }
}
```

### Đo fan-out bằng reflection, không đếm tay

```csharp
int FanOut(Type t)
{
    var ctor = t.GetConstructors().OrderByDescending(c => c.GetParameters().Length).First();
    return ctor.GetParameters().Select(p => p.ParameterType).Distinct().Count();
}
```

```text
DichVuDonHangGop           fan-out = 7   [IKhoHang, IThanhToan, IGuiMail, IGuiSms, IGhiLog, IDoiTien, IKhoDonHang]
DatHangUseCase             fan-out = 3   [IKhoHang, IThanhToan, IKhoDonHang]
GuiThongBaoSauDatHang      fan-out = 2   [IGuiMail, IGuiSms]
```

**7 so với 3.** Con số này không phải chuyện thẩm mỹ — nó chính là số mock phải dựng để
viết một unit test cho lớp đó. Một test cho `DichVuDonHangGop` bắt đầu bằng bảy dòng
`Substitute.For<...>()` trước khi chạm tới dòng nào có nghĩa.

### Đo bán kính thay đổi

Câu hỏi thật khi review: *"đổi chữ ký `IKhoHang` thì phải sửa mấy lớp?"*

```csharp
var canSua = new[] { typeof(DichVuDonHangGop), typeof(DatHangUseCase), typeof(GuiThongBaoSauDatHang) }
    .Where(t => TenPhuThuoc(t).Contains(nameof(IKhoHang))).Select(t => t.Name).ToArray();
```

```text
Doi chu ky IKhoHang -> so lop phai sua:
  2 lop: DichVuDonHangGop, DatHangUseCase
```

Đây là **fan-in** của `IKhoHang` — số lớp phụ thuộc vào nó. Fan-in cao không xấu (một
abstraction tốt thì nhiều nơi dùng), nhưng nó cho biết đổi interface đó đắt tới đâu.

### Trước và sau

| | `DichVuDonHangGop` | Sau khi tách |
|---|---|---|
| Fan-out | 7 | 3 và 2 |
| Mock cần cho một test | 7 | 3 |
| Đổi cách gửi SMS → sửa lớp nào | lớp chứa cả logic đặt hàng | lớp chỉ chứa việc gửi thông báo |
| Chạy lại test khi đổi SMS | mọi test đặt hàng, huỷ, hoàn tiền | chỉ test thông báo |
| Số lớp | 1 | 2 |

Dòng cuối là cái giá. **Mua coupling thấp bằng số lớp cao** — và đó là toàn bộ mô hình
kinh tế của design pattern.

Ca hỏng cụ thể khi để fan-out trôi tự do:
[Facade phình thành god object](../case-studies/facade-phinh-thanh-god-object.md).

## Bảng chẩn đoán theo con số

Ngưỡng dưới đây là kinh nghiệm, không phải luật — dùng để **mở cuộc nói chuyện**, không
để chặn merge.

| Fan-out | Đọc là |
|---|---|
| 0–2 | Bình thường |
| 3–4 | Vẫn ổn nếu các phụ thuộc cùng một tầng |
| 5–7 | Đáng hỏi: lớp này có mấy lý do để thay đổi? |
| 8+ | Gần như chắc chắn là god class hoặc là composition root đặt nhầm chỗ |

Ngoại lệ hợp lệ cho fan-out cao: **composition root** (`Program.cs`, module DI) tồn tại
đúng để biết mọi thứ. Đừng tách nó ra.

## Bảy mức coupling, từ lỏng tới chặt

Xếp theo thứ tự càng xuống càng khó gỡ:

| Mức | Nghĩa | Ví dụ C# |
|---|---|---|
| **Data** | Truyền đúng dữ liệu cần | `Tinh(decimal gia, int sl)` |
| **Stamp** | Truyền cả object nhưng chỉ dùng vài field | `Tinh(DonHang d)` mà chỉ đọc `d.Tien` |
| **Control** | Truyền cờ điều khiển nhánh của bên kia | `Xuat(bool laPdf)` |
| **Common** | Cùng ghi vào trạng thái toàn cục | `static` mutable, [Singleton](../skills/singleton.md) |
| **Content** | Chạm vào ruột của lớp khác | `protected` field, reflection vào private |

**Ba mức đầu sửa được bằng đổi chữ ký hàm.** Hai mức cuối phải đổi thiết kế — và
`Singleton` nằm ở mức thứ tư là lý do nó bị coi là phản pattern trong phần lớn ngữ cảnh.
Ca hỏng: [Test xanh khi chạy riêng, đỏ khi chạy chung](../case-studies/test-xanh-rieng-do-chung.md).

## Cohesion — đo bằng "field nào method nào dùng"

Không có công cụ sẵn trong .NET đo LCOM, nhưng phép thử bằng mắt thì rẻ:

1. Liệt kê field của lớp.
2. Với mỗi method, đánh dấu field nó chạm.
3. Nếu tách được thành **hai nhóm rời nhau** thì đó là hai lớp bị dán vào nhau.

```text
class BaoCao
  field: dbConn, cache          method: LayDuLieu()    -> dbConn, cache
  field: mau, fontChu           method: VeBieuDo()     -> mau, fontChu
                                method: XuatPdf()      -> mau, fontChu
```

Hai nhóm rời hẳn — `BaoCao` là hai lớp: một lấy dữ liệu, một trình bày. Đây cũng chính
là SRP nhìn từ góc đo lường, xem [SOLID](solid.md#s--single-responsibility).

**Tên lớp là chỉ báo sớm nhất.** `OrderManager`, `DataHelper`, `Utils`, `CommonService`
— những cái tên không nói được lớp *làm gì* thường vì nó làm nhiều việc không liên quan.

## Trade-offs

| Được khi hạ coupling | Mất |
|---|---|
| Bán kính một thay đổi hẹp lại | Nhiều lớp hơn, nhiều file hơn |
| Test nhanh và ít mock | Phải dựng DI, phải nối dây ở composition root |
| Thay hiện thực không đụng lớp gọi | Một lần nhảy file khi debug |
| Chạy song song việc trong team dễ hơn | Người mới mất nhiều thời gian dựng bản đồ tổng thể |

**Chỗ hạ coupling phản tác dụng:** khi hai lớp *thật sự* luôn đổi cùng nhau. Ép chúng
qua một interface chỉ tạo ra ảo giác độc lập — mỗi lần đổi vẫn phải sửa cả hai, cộng
thêm interface.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Hạ coupling bằng cách thêm interface cho mọi lớp | Fan-out không giảm, chỉ thêm một tầng gián tiếp |
| Đếm fan-out mà bỏ qua `static` và singleton | Phụ thuộc ẩn không hiện trong constructor — đó là loại nguy hiểm nhất |
| Gộp nhiều lớp nhỏ lại "cho gọn" | Cohesion tụt; lớp mới có hai lý do để thay đổi |
| Truyền cờ `bool` điều khiển nhánh bên trong | Control coupling — người gọi phải biết logic bên trong |
| Dùng event để "hạ coupling" giữa hai thứ luôn đi cùng nhau | Luồng thực thi biến mất khỏi code; debug bằng cách đoán |

## FAQ

<details>
<summary>Fan-out 7 nhưng tất cả đều là interface thì có sao không?</summary>

Vẫn là 7 thứ phải hiểu để đọc lớp đó, và vẫn là 7 mock trong test. Interface hạ **mức**
coupling (từ content xuống data) chứ không hạ **số lượng** coupling.

Hai câu hỏi khác nhau: *"tôi phụ thuộc chặt tới đâu"* (interface giúp) và *"tôi phụ
thuộc vào bao nhiêu thứ"* (chỉ tách lớp mới giúp).

</details>

<details>
<summary>Composition root có fan-out 40 thì sửa thế nào?</summary>

Không sửa. Đó là chỗ **duy nhất** nên biết mọi thứ, vì nó tồn tại để nối dây. Tách nó
ra thành nhiều module đăng ký (`AddDonHang()`, `AddThanhToan()`) là được, nhưng đó là
chuyện tổ chức file, không phải chuyện coupling.

Ngưỡng ở bảng trên áp cho lớp **nghiệp vụ**, không áp cho hạ tầng nối dây.

</details>

<details>
<summary>Có đo được coupling tự động trong dự án .NET không?</summary>

Có vài hướng, không cái nào miễn phí hoàn toàn:

- **Roslyn analyzer** tự viết — đếm số kiểu tham chiếu trong mỗi file, chính xác nhất.
- **NDepend** — có sẵn metric fan-in/fan-out, thương mại.
- **Reflection lúc chạy** như ví dụ ở trang này — chỉ thấy phụ thuộc qua constructor,
  bỏ sót `static` và `new` bên trong method. Rẻ và đủ để mở cuộc nói chuyện.

Điểm mù của cách thứ ba chính là điều đáng nhớ: **phụ thuộc nguy hiểm nhất là phụ thuộc
không hiện trong chữ ký.**

</details>

## Related Topics

- [SOLID](solid.md) — SRP là cohesion, DIP là coupling, nhìn từ góc nguyên lý
- [Design pattern là gì](what-is-a-pattern.md) — pattern mua coupling thấp bằng số lớp
- [Facade](../skills/facade.md) — hạ fan-out của **người gọi**, không hạ của hệ thống
- [Mediator](../skills/mediator.md) — đổi n×n quan hệ thành n, và cái bẫy kèm theo
- [Singleton](../skills/singleton.md) — common coupling, mức thứ tư trong bảng trên
- [Composition over inheritance](composition-over-inheritance.md) — kế thừa là coupling chặt nhất

## References

- Larry Constantine — *Structured Design* (1974), nguồn gốc thang bảy mức coupling
- Robert C. Martin — *Clean Architecture*, phần "Component Coupling"
