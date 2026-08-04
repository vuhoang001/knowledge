---
title: Bridge
sidebar_position: 7
description: "Hai trục biến thiên tách thành hai cây độc lập — 8 báo cáo × 6 định dạng là 48 lớp với kế thừa, 14 với bridge."
tags: [bridge, structural, gof, composition]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Bridge

> **Chốt:** Khi tên lớp con ghép từ **hai danh mục** (`DoanhThuPdf`, `TonKhoExcel`), bạn
> đang có hai trục biến thiên trong một cây kế thừa. Bridge tách chúng thành hai cây và
> nối bằng một tham chiếu — `n × m` lớp thành `n + m`.

## Mục tiêu

Chặn bùng nổ tổ hợp **trước khi nó xảy ra**, ở chỗ mà cấu trúc bài toán đã lộ ra hai
chiều độc lập ngay từ đầu.

## Ý định gốc (GoF)

Tách một trừu tượng khỏi hiện thực của nó, để hai bên đổi độc lập.

Cách phát biểu đó khó dùng. Cách dùng được: **tìm hai danh từ trong tên lớp con.**

```text
DoanhThuPdf     →  {DoanhThu, TonKho, CongNo} × {Pdf, Excel, Csv}
TonKhoExcel        └── truc "noi dung"          └── truc "dinh dang"
```

Hai trục đó không phụ thuộc nhau: thêm định dạng không liên quan gì tới nội dung báo cáo,
và ngược lại. Đó là điều kiện cần để Bridge có nghĩa.

## Ví dụ xuyên suốt — báo cáo × định dạng xuất

Chạy bằng `dotnet run 12-bridge.cs` trên .NET 11.0.0.

### Trước — mỗi tổ hợp một lớp

```csharp
abstract class BaoCaoKeThua { public abstract string Xuat(); }

sealed class DoanhThuPdf   : BaoCaoKeThua { public override string Xuat() => "%PDF <doanh thu>"; }
sealed class DoanhThuExcel : BaoCaoKeThua { public override string Xuat() => "PK.. <doanh thu>"; }
sealed class TonKhoPdf     : BaoCaoKeThua { public override string Xuat() => "%PDF <ton kho>"; }
sealed class TonKhoExcel   : BaoCaoKeThua { public override string Xuat() => "PK.. <ton kho>"; }
```

```text
=== Truoc: moi to hop mot lop ===
  DoanhThuPdf        -> %PDF <doanh thu>
  DoanhThuExcel      -> PK.. <doanh thu>
  TonKhoPdf          -> %PDF <ton kho>
  TonKhoExcel        -> PK.. <ton kho>
  So lop: 4
```

Chú ý chuỗi `"%PDF "` nằm ở **hai** lớp. Logic đóng gói PDF bị chép đôi — và với báo cáo
thứ ba thì thành ba bản.

### Sau — nội dung cắm vào bộ xuất

```csharp
interface IBoXuat { string Boc(string noiDung); }
sealed class XuatPdf   : IBoXuat { public string Boc(string n) => $"%PDF <{n}>"; }
sealed class XuatExcel : IBoXuat { public string Boc(string n) => $"PK.. <{n}>"; }

abstract class BaoCao(IBoXuat bo)
{
    protected IBoXuat Bo => bo;              // <- day la "cay cau"
    public abstract string Xuat();
}
sealed class BaoCaoDoanhThu(IBoXuat bo) : BaoCao(bo) { public override string Xuat() => Bo.Boc("doanh thu"); }
sealed class BaoCaoTonKho(IBoXuat bo)   : BaoCao(bo) { public override string Xuat() => Bo.Boc("ton kho"); }
```

```text
=== Sau: noi dung cam vao bo xuat ===
  BaoCaoDoanhThu     -> %PDF <doanh thu>
  BaoCaoDoanhThu     -> PK.. <doanh thu>
  BaoCaoTonKho       -> %PDF <ton kho>
  BaoCaoTonKho       -> PK.. <ton kho>
  So lop: 6
```

**Ở quy mô 2×2, Bridge có nhiều lớp hơn (6 so với 4).** Đây là điểm cần nói thẳng: với
hai trục mỗi trục hai giá trị, Bridge *lỗ*. Nó chỉ có lãi từ 3×3 trở lên.

### Chỗ nó có lãi

```text
n bao cao x m dinh dang      ke thua    bridge
----------------------------------------------
2 x 2                              4         4
3 x 3                              9         6
5 x 4                             20         9
8 x 6                             48        14
```

(Cột "bridge" là `n + m`; cột "kế thừa" là `n × m`.)

### Thêm một định dạng và một báo cáo

```text
=== Them mot dinh dang (CSV) va mot bao cao (Cong no) ===
  csv: cong no
  csv: doanh thu
  %PDF <cong no>
```

Thêm `XuatCsv` (1 lớp) và `BaoCaoCongNo` (1 lớp) — hai lớp — và ngay lập tức có **6** tổ
hợp dùng được. Với kế thừa, sáu tổ hợp là sáu lớp phải viết tay.

### Trước và sau

| | Kế thừa tổ hợp | Bridge |
|---|---|---|
| Số lớp với 8 × 6 | 48 | 14 |
| Logic đóng gói PDF nằm ở | 8 lớp | 1 lớp |
| Thêm định dạng thứ 7 | +8 lớp | +1 lớp |
| Chọn định dạng lúc chạy | không — tổ hợp cố định | có |
| Số lớp với 2 × 2 | 4 | 6 |
| Đọc lần đầu | phẳng, thấy hết ngay | phải theo tham chiếu qua cây kia |

Ca hỏng đầy đủ:
[Một trăm lớp con cho một tính năng](../case-studies/mot-tram-lop-con-cho-mot-tinh-nang.md).

## Bridge và Strategy nhìn giống hệt nhau

Cả hai đều là "cắm một object vào object khác". Khác ở **ý định**, và ý định quyết định
lúc nào bạn nhận ra cần chúng:

| | Bridge | [Strategy](strategy.md) |
|---|---|---|
| Nhận ra khi nào | Lúc **thiết kế** — thấy trước hai trục | Lúc **sửa** — thấy chuỗi `if` chọn thuật toán |
| Phần cắm vào là | Cả một hệ hiện thực, thường có nhiều method | Một thuật toán, thường một method |
| Có đổi lúc chạy không | Thường không — chọn một lần lúc dựng | Có, đó là mục đích |
| Bên trừu tượng | Có cây kế thừa riêng, giàu logic | Thường chỉ một lớp ngữ cảnh |

Trong thực tế ranh giới mờ, và điều đó **không quan trọng** — cả hai dẫn tới cùng một
code. Điều quan trọng là nhận ra có hai trục.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Chỉ có một trục biến thiên | Kế thừa thường hoặc Strategy đủ; Bridge thêm tầng vô ích |
| Hai trục nhưng một trục có đúng **một** giá trị | Đợi tới khi có giá trị thứ hai — Rule of Three |
| Quy mô 2×2 và không dự kiến tăng | 6 lớp so với 4; lỗ ròng |
| Hai trục **phụ thuộc nhau** (một số tổ hợp vô nghĩa) | Bridge cho phép mọi tổ hợp; tổ hợp cấm phải chặn lúc chạy |

Dòng cuối đáng chú ý: nếu `BaoCaoLuong` **không được phép** xuất ra CSV, Bridge không
diễn đạt được ràng buộc đó — bạn phải kiểm tra lúc chạy, và trình biên dịch mất khả năng
giúp.

## Trade-offs

| Được | Mất |
|---|---|
| `n + m` lớp thay vì `n × m` | Ở quy mô nhỏ thì nhiều lớp hơn |
| Mỗi trục đổi độc lập, hai người sửa hai file khác nhau | Một lần nhảy tham chiếu khi đọc |
| Chọn tổ hợp lúc chạy | Tổ hợp không hợp lệ không bị trình biên dịch chặn |
| Hiện thực (bộ xuất) tái dùng được ở chỗ khác | Phải thiết kế interface cầu nối cho đúng ngay từ đầu |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Áp Bridge khi mới có một trục | Tầng thừa, và trục thứ hai có thể không bao giờ xuất hiện |
| Interface cầu nối quá rộng (lộ chi tiết của một hiện thực) | Hiện thực khác phải ném `NotSupported` — vi phạm [ISP](../reference/solid.md#i--interface-segregation) |
| Để bên trừu tượng biết kiểu cụ thể của hiện thực | Cầu nối bị vô hiệu; quay lại phụ thuộc chặt |
| Nhầm Bridge với Adapter | Adapter chữa cháy cho API có sẵn; Bridge là thiết kế chủ động |
| Dùng Bridge cho hai trục phụ thuộc nhau | Sinh ra tổ hợp vô nghĩa mà không có gì chặn |

## FAQ

<details>
<summary>Làm sao biết mình đang có hai trục chứ không phải một?</summary>

Viết tên tất cả lớp con ra rồi tìm phần lặp:

```text
DoanhThuPdf, DoanhThuExcel, TonKhoPdf, TonKhoExcel
```

Hai nhóm từ (`DoanhThu|TonKho` và `Pdf|Excel`) ghép **chéo đầy đủ** là hai trục. Nếu chỉ
có `DoanhThuPdf` và `TonKhoExcel` mà không có hai tổ hợp còn lại, có thể chúng thật sự
phụ thuộc nhau — kiểm tra lại với nghiệp vụ trước khi tách.

</details>

<details>
<summary>Ba trục thì sao?</summary>

Bridge lồng Bridge: `BaoCao` → `IBoXuat` → `INenLuuTru`. Nó chạy, nhưng ba tầng gián tiếp
là ngưỡng mà phần lớn người đọc bỏ cuộc.

Với ba trục trở lên, cân nhắc chuyển sang mô hình **dữ liệu**: một object cấu hình mô tả
tổ hợp, và một hàm thực thi đọc cấu hình đó. Ít lớp hơn, và tổ hợp trở thành thứ kiểm tra
được bằng dữ liệu.

</details>

<details>
<summary>Trong C# có cần lớp trừu tượng <code>BaoCao</code> không, hay interface là đủ?</summary>

Interface đủ khi bên trừu tượng không có code dùng chung. Lớp trừu tượng đáng giá khi có
phần chung thật (ví dụ logic phân trang, đánh số) mà mọi báo cáo đều cần.

Ví dụ ở trên dùng `abstract class` để giữ tham chiếu `Bo` một chỗ. Nếu chỉ có một dòng
như thế, primary constructor trên từng lớp cũng đủ.

</details>

## Related Topics

- [Composition over inheritance](../reference/composition-over-inheritance.md) — cùng bài toán, nhìn từ nguyên tắc
- [Strategy](strategy.md) — cùng hình dạng, khác ý định
- [Abstract Factory](abstract-factory.md) — hay dùng để tạo đúng cặp (trừu tượng, hiện thực)
- [Adapter](adapter.md) — chữa cháy cho API có sẵn, không phải thiết kế chủ động
- [Decorator](decorator.md) — cũng bọc, nhưng cùng interface và xếp chồng được

## References

- GoF — *Design Patterns*, Bridge
