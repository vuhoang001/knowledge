---
title: Facade một method thành 31 method
sidebar_position: 9
description: "Mỗi tính năng mới thêm một method vào cửa vào cho tiện — hai năm sau fan-out là 7 và mọi thay đổi đều đi qua một file."
tags: [case-study, facade, mediator, coupling, god-object]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Facade một method thành 31 method

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 04-coupling.cs` và
> `dotnet run 15-facade.cs` trên .NET 11.0.0.

## Bối cảnh

Đặt hàng cần gọi năm hệ con theo đúng thứ tự. Đội dựng một
[Facade](../skills/facade.md) — đúng chỗ, đúng lý do:

```csharp
sealed class CuaDatHang(HeKho kho, HeThanhToan tt, HeVanChuyen vc, HeMail mail, HeLog log)
{
    public string DatHang(string kh, string sku, int sl, decimal tien, string email) { ... }
}
```

```text
=== Sau: mot cua vao ===
  Fan-out cua nguoi goi: 1 he con, 1 loi goi
```

```text
=== Do fan-out bang reflection ===
  CuaDatHang: nhan 5 he con, lo ra 1 method cong khai
```

**5 vào, 1 ra.** Đây là hình dạng của một facade khoẻ mạnh.

Rồi hai năm trôi qua. Huỷ đơn, hoàn tiền, đổi hàng, tách đơn, gộp đơn, đặt trước, đăng ký
định kỳ… mỗi tính năng thêm một method *"cho tiện, người gọi đã biết `CuaDatHang` rồi"*.

## Triệu chứng

Không có sự cố. Có bốn dấu hiệu, tất cả đều là chuyện tốc độ chứ không phải lỗi:

| Dấu hiệu | Con số |
|---|---|
| Method công khai của `CuaDatHang` | 31 |
| Hệ con nó phụ thuộc | 12 |
| Số PR mỗi tháng có đụng file này | 18 / 22 |
| Số lần merge conflict trên file này trong quý | 41 |
| Thời gian chạy test của lớp này | 3 phút 40 |

Đội mô tả cảm giác là *"mọi thứ đều đi qua `CuaDatHang`, và không ai dám sửa nó."*

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Cần tách file cho bớt conflict | Conflict là triệu chứng rõ nhất | Tách file mà giữ nguyên lớp (partial class) không giảm được gì |
| Cần thêm test | Test chậm và giòn | Test chậm **vì** lớp cần 12 mock, không phải vì thiếu test |
| Cần bỏ facade, gọi thẳng hệ con | Phản ứng "pattern là thủ phạm" | Quay lại đúng vấn đề mà facade đã giải: fan-out của người gọi |
| Đội cần quy ước "không thêm method vào facade" | Gần đúng | Quy ước không có gì cưỡng chế; nó đã bị vi phạm 30 lần |

Giả thuyết thứ ba đáng chú ý: **facade không phải thủ phạm.** Nó vẫn đang làm đúng việc
của nó cho `DatHang`. Vấn đề là nó bị dùng làm chỗ chứa cho 30 việc khác.

## Nguyên nhân thật

Facade được phân chia theo **hệ con** (*"mọi thứ liên quan tới đơn hàng"*), không theo
**ca dùng** (*"đặt một đơn hàng"*).

Danh mục "mọi thứ liên quan tới đơn hàng" **không có giới hạn tự nhiên**. Số ca dùng thì
có — mỗi ca là một việc người dùng muốn làm, và danh sách đó hữu hạn.

Đo được bằng fan-out ([coupling](../reference/coupling-cohesion.md)):

```text
DichVuDonHangGop           fan-out = 7   [IKhoHang, IThanhToan, IGuiMail, IGuiSms, IGhiLog, IDoiTien, IKhoDonHang]
DatHangUseCase             fan-out = 3   [IKhoHang, IThanhToan, IKhoDonHang]
GuiThongBaoSauDatHang      fan-out = 2   [IGuiMail, IGuiSms]
```

**7 so với 3.** Con số này chính là số mock phải dựng cho một test — nên nó giải thích
luôn cả 3 phút 40 giây kia.

Và bán kính thay đổi:

```text
Doi chu ky IKhoHang -> so lop phai sua:
  2 lop: DichVuDonHangGop, DatHangUseCase
```

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test | Xanh (chậm) | Mọi method đều đúng |
| Code review từng PR | Trượt | Mỗi PR thêm **một** method — không PR nào là giọt nước tràn ly |
| Trình biên dịch | Im lặng | Lớp 31 method là hợp lệ |
| Analyzer độ phức tạp | Im lặng | Độ phức tạp *mỗi method* thấp; vấn đề nằm ở *số lượng* method |

Dòng thứ hai là cơ chế thật của mọi god object: **không ai tạo ra nó, nó tích tụ.** Không
có PR nào để từ chối.

Dòng thứ tư đáng nhớ: các thước đo phổ biến (cyclomatic complexity, độ dài method) đều
nhìn *bên trong* method. God object là vấn đề *giữa* các method — cần thước đo khác:
fan-out và số method công khai.

## Cách sửa

### Bước 1 — tách theo ca dùng

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

| | `DichVuDonHangGop` | Sau khi tách |
|---|---|---|
| Fan-out | 7 | 3 và 2 |
| Mock cần cho một test | 7 | 3 |
| Đổi cách gửi SMS → sửa lớp nào | lớp chứa cả logic đặt hàng | lớp chỉ chứa việc gửi thông báo |
| Chạy lại test khi đổi SMS | mọi test đặt hàng, huỷ, hoàn tiền | chỉ test thông báo |
| Số lớp | 1 | 2 |

Dòng cuối là cái giá, và nó rẻ.

### Bước 2 — đặt ngưỡng có thể cưỡng chế

Quy ước không đủ — nó đã thất bại 30 lần. Cần một luật kiểm được:

| Ngưỡng | Hành động khi vượt |
|---|---|
| Fan-out > 5 | Cảnh báo trong CI |
| Method công khai > 7 | Cảnh báo trong CI |
| Tên lớp kết thúc bằng `Manager`, `Service` không kèm danh từ ca dùng | Từ chối |

Luật kiến trúc viết bằng `NetArchTest` hoặc một analyzer nhỏ; nó chạy mỗi PR và không phụ
thuộc trí nhớ của ai.

### Ngoại lệ hợp lệ

**Composition root** (`Program.cs`, module DI) tồn tại đúng để biết mọi thứ — fan-out 40 ở
đó là bình thường. Ngưỡng trên chỉ áp cho lớp nghiệp vụ.

## Dấu hiệu nhận ra sớm

Không phải câu hỏi *"lớp này có to không"* — mà là *"nó to nhanh không"*:

```bash
# So dong cua file nay qua 12 thang
git log --format="%ad" --date=short -- src/DonHang/CuaDatHang.cs |
  while read d; do echo "$d $(git show $(git rev-list -1 --before="$d" HEAD):src/DonHang/CuaDatHang.cs 2>/dev/null | wc -l)"; done | uniq
```

Ba câu hỏi cho code review:

1. Method mới này có dùng chung phụ thuộc nào với các method có sẵn không? Không → nó
   không thuộc lớp này.
2. Fan-out sau khi thêm là bao nhiêu? Trên 5 thì đặt câu hỏi.
3. Tên lớp mô tả **một ca dùng** hay **một danh mục**? Danh mục thì không có giới hạn tự
   nhiên.

Câu thứ nhất là câu bắt được sớm nhất, ngay ở method thứ ba — trước khi có gì để sửa.

## Related Topics

- [Facade](../skills/facade.md) — cách giữ facade không phình
- [Coupling và cohesion](../reference/coupling-cohesion.md) — fan-out và ngưỡng god object
- [Mediator](../skills/mediator.md) — cùng rủi ro, và nó mắc dễ hơn vì phải biết tất cả
- [Case study — Design Patterns](index.md)
