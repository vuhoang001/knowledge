---
title: Tô đỏ một ô, cả bảng đỏ theo
sidebar_position: 10
description: "Đối tượng kiểu dùng chung của flyweight có setter — sửa một ô là sửa cho tất cả những ai đang trỏ tới, 6 trên 6 ô đổi màu."
tags: [case-study, flyweight, immutability, shared-state]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Tô đỏ một ô, cả bảng đỏ theo

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng
> `dotnet run cs-flyweight-mutable.cs` trên .NET 11.0.0.

## Bối cảnh

Bảng tính trên web, 500.000 ô. Bộ nhớ là vấn đề thật, và
[Flyweight](../skills/flyweight.md) đã giải quyết đúng:

```text
=== 500,000 o du lieu, moi o co dinh dang hien thi ===
  Khong flyweight: 111,986,656 bytes  (224.0 bytes/o)
  Co flyweight   : 23,996,928 bytes  (48.0 bytes/o)
  Ty le: 4.67x
```

112 MB xuống 24 MB. Kho kiểu:

```csharp
sealed class KieuO { public required string DinhDang { get; set; } public required string Mau { get; set; } }

sealed class KhoKieu
{
    private readonly Dictionary<string, KieuO> _kho = [];
    public KieuO Lay(string dd, string mau) { ... return _kho[k] = new KieuO { DinhDang = dd, Mau = mau }; }
}
```

Sprint sau, tính năng "đổi màu chữ của ô" được thêm vào.

## Triệu chứng

Người dùng tô đỏ **một** ô. Toàn bộ cột — thực ra là mọi ô đang dùng cùng định dạng —
chuyển sang đỏ.

```text
=== Truoc khi doi ===
          0.00 [#333333]
      1,000.00 [#333333]
      2,000.00 [#333333]
  so doi tuong kieu: 1

=== Nguoi dung to DO o thu 3 ===
          0.00 [#ff0000]
      1,000.00 [#ff0000]
      2,000.00 [#ff0000]
      3,000.00 [#ff0000]
  so o bi doi mau: 6 / 6   <- ky vong 1
```

**6 trên 6 ô đổi màu**, kỳ vọng là 1.

Trên bảng thật với 500.000 ô, một thao tác tô màu làm đổi hàng trăm nghìn ô — và người
dùng không có cách nào undo về đúng trạng thái cũ, vì thông tin "ô nào vốn màu gì" đã bị
ghi đè.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Chọn nhầm vùng — người dùng bôi đen cả cột | Dễ nhất | Tái hiện với đúng một ô được chọn, `selection.length == 1` trong log |
| Render dùng chung style ở tầng CSS | Đúng loại triệu chứng | Kiểm DOM: mỗi ô có inline style riêng, và **giá trị đó đã là đỏ** |
| Sự kiện đổi màu phát cho nhiều ô | Hợp lý với kiến trúc event | Đếm handler: đúng một lần gọi |
| Cache render không được vô hiệu hoá | Kinh điển | Tắt cache render, vẫn đỏ |

Ba giả thuyết đầu đều nhắm vào **tầng hiển thị**, vì triệu chứng là chuyện màu sắc. Dữ
liệu đã sai từ tầng mô hình.

## Nguyên nhân thật

`KieuO` là đối tượng **dùng chung** giữa 500.000 ô, và nó có **setter**.

```csharp
o[2].Kieu.Mau = "#ff0000";           // sua doi tuong DUNG CHUNG
```

Dòng này không sửa ô số 2. Nó sửa **đối tượng kiểu mà mọi ô đang trỏ tới**.

Đây là mặt trái trực tiếp của thứ đã tiết kiệm 88 MB: nếu 500.000 ô cùng trỏ vào một
object, thì sửa object đó là sửa cho cả 500.000.

**Toàn bộ giá trị của Flyweight đặt trên một giả định: đối tượng dùng chung là bất biến.**
Giả định đó không được viết ra ở đâu cả, và người thêm tính năng đổi màu không có cách nào
biết.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Test tiết kiệm bộ nhớ | Xanh | Vẫn tiết kiệm 4,67x — thậm chí **tiết kiệm hơn** vì không sinh kiểu mới |
| Test "đổi màu ô thì ô đó đổi màu" | Xanh | Ô đó **có** đổi màu. Assertion đúng, nhưng thiếu |
| Test flyweight trả về cùng thể hiện | Xanh | `ReferenceEquals` vẫn `True` — đúng như thiết kế |
| Trình biên dịch | Im lặng | `set` trên property là hợp lệ |
| Code review PR đổi màu | Trượt | Một dòng gán, trông vô hại |

Dòng thứ hai là bài học: **assertion đúng nhưng không đủ.** Test cần thêm vế phủ định —
*"các ô khác không đổi"*:

```csharp
[Fact] void Doi_mau_mot_o_khong_dung_toi_o_khac()
{
    var bang = TaoBang(6);
    bang[2].DoiMau("#ff0000");
    Assert.Equal(1, bang.Count(o => o.Mau == "#ff0000"));   // <- ve bi thieu
}
```

Dòng đầu tiên còn đáng chú ý hơn: chỉ số bộ nhớ **cải thiện** khi lỗi xảy ra, vì không có
kiểu mới nào được tạo. Chỉ số bạn dùng để chứng minh pattern đang hoạt động lại là chỉ số
che mất lỗi.

## Cách sửa

### Làm đối tượng dùng chung bất biến

```csharp
record KieuOBatBien(string DinhDang, string Mau);

sealed class KhoKieuBatBien
{
    private readonly Dictionary<KieuOBatBien, KieuOBatBien> _kho = [];
    public KieuOBatBien Lay(string dd, string mau)
    {
        var mau2 = new KieuOBatBien(dd, mau);
        if (_kho.TryGetValue(mau2, out var v)) return v;
        return _kho[mau2] = mau2;
    }
}
```

Đổi màu giờ là **xin một kiểu khác**, không phải sửa kiểu đang có:

```csharp
o2[2] = o2[2] with { Kieu = kho2.Lay("#,##0.00", "#ff0000") };
```

```text
=== Cach dung: kieu bat bien, xin kieu MOI ===
          0.00 [#333333]
      1,000.00 [#333333]
      2,000.00 [#ff0000]
      3,000.00 [#333333]
  so o bi doi mau: 1 / 6
  so doi tuong kieu: 2
```

**1 trên 6 ô đổi màu**, và kho kiểu tăng từ 1 lên 2 — đúng như mong đợi.

`record` ở đây làm hai việc cùng lúc: bất biến, và có `Equals`/`GetHashCode` theo giá trị
nên dùng trực tiếp làm khoá `Dictionary`, không cần ghép chuỗi khoá tay.

### Cưỡng chế bất biến, đừng dựa vào quy ước

| Mức | Cách |
|---|---|
| Yếu | Comment `// KHONG duoc sua — dung chung` |
| Vừa | `init`-only property, hoặc `readonly` field |
| Mạnh | `record` với property chỉ đọc, hoặc `readonly record struct` |
| Mạnh nhất | Kho trả về interface chỉ có getter, lớp cài là `internal` |

Comment không phải một cơ chế. Mức "vừa" trở lên làm trình biên dịch từ chối dòng
`o[2].Kieu.Mau = ...`.

### Theo dõi kích thước kho

Với kiểu bất biến, mỗi tổ hợp mới sinh một object. Nếu người dùng chọn màu tự do
(16 triệu giá trị), kho có thể phình hơn thứ nó tiết kiệm:

```csharp
if (_kho.Count > NGUONG) { /* canh bao, hoac chuyen sang khong flyweight */ }
```

Đây là đánh đổi phải theo dõi, không phải chọn một lần.

## Dấu hiệu nhận ra sớm

```bash
# Doi tuong dung chung co setter
grep -rnB3 "Dictionary<.*, Kieu\|_kho\[" --include=*.cs src/ | grep "set;"
```

Ba câu hỏi cho code review:

1. Object này có được **dùng chung** giữa nhiều chủ không? Nếu có, nó có `set` nào không?
2. Có test nào khẳng định **các phần tử khác không đổi** sau một thao tác không?
3. Kho flyweight có giới hạn kích thước không, và khoá của nó đến từ đâu?

Câu thứ hai là câu bắt được ca này, và nó áp dụng được cho cả
[Prototype](../skills/prototype.md) lẫn [Memento](../skills/memento.md) — cùng một họ lỗi.

## Related Topics

- [Flyweight](../skills/flyweight.md) — tách trạng thái nội tại và ngoại lai
- [Prototype](../skills/prototype.md) — cùng họ lỗi: chia sẻ tham chiếu ngoài ý muốn
- [Case study — Design Patterns](index.md)
