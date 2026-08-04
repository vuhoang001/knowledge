---
title: "Lab: leo thang từ switch tới Strategy + Decorator"
sidebar_position: 1
description: "Bốn bước leo thang trên cùng một bài toán phí giao hàng, dừng lại ở bước rẻ nhất giải quyết được vấn đề — chạy thật bằng dotnet run."
tags: [tutorial, strategy, decorator, refactoring, dotnet]
domain: backend
category: pattern
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Lab: leo thang từ `switch` tới Strategy + Decorator

> **Mục tiêu:** không phải "học cách viết Strategy", mà **học cách dừng lại đúng bậc**.
> Bốn bước dưới đây giải cùng một bài toán với chi phí tăng dần; bậc đúng là bậc đầu tiên
> giải quyết được vấn đề bạn **thật sự** đang có.

## Chuẩn bị

Cần .NET 10 trở lên (hỗ trợ chạy thẳng một file `.cs`). Kiểm tra:

```bash
dotnet --version
```

```text
11.0.100-preview.1.26104.118
```

Ô của bạn:

```text

```

Tạo một thư mục làm việc bất kỳ **ngoài repo này** — ví dụ `~/Documents/learn-lab/patterns`.
Mỗi bước là một file độc lập, chạy bằng `dotnet run <ten>.cs`.

Lần chạy đầu mất ~40 giây (khôi phục gói); các lần sau dưới 1 giây.

## Bài toán

Tính phí giao hàng theo loại dịch vụ:

| Loại | Công thức |
|---|---|
| `thuong` | 15.000 đ/kg |
| `nhanh` | 25.000 đ/kg |
| `hoa toc` | 40.000 đ/kg + phụ phí 20.000 |

Yêu cầu sẽ **lớn dần** qua từng bước. Đó là điểm của bài này.

---

## Bước 1 — `switch` tại chỗ

**Yêu cầu:** ba loại, cố định, dùng ở một chỗ.

`lab1.cs`:

```csharp
decimal Phi(string loai, decimal tien, int kg) => loai switch
{
    "thuong" => kg * 15000m,
    "nhanh"  => kg * 25000m,
    "hoa toc" => kg * 40000m + 20000m,
    _ => throw new ArgumentException($"khong biet loai: {loai}")
};

string[] loai = ["thuong", "nhanh", "hoa toc"];
Console.WriteLine($"{"loai",-10}{"2kg",12}{"5kg",12}");
Console.WriteLine(new string('-', 34));
foreach (var l in loai) Console.WriteLine($"{l,-10}{Phi(l, 300000m, 2),12:N0}{Phi(l, 300000m, 5),12:N0}");

try { Phi("duong bien", 300000m, 2); }
catch (Exception e) { Console.WriteLine($"\nloai chua ho tro -> {e.GetType().Name}: {e.Message}"); }
```

```bash
dotnet run lab1.cs
```

```text
loai               2kg         5kg
----------------------------------
thuong          30,000      75,000
nhanh           50,000     125,000
hoa toc        100,000     220,000

loai chua ho tro -> ArgumentException: khong biet loai: duong bien
```

Ô của bạn:

```text

```

**Đây là code đúng cho yêu cầu đã cho.** Sáu dòng, một chỗ, đọc một lượt là hiểu. Ai bảo
bạn phải thay nó bằng pattern thì người đó đang áp dụng pattern như nghi lễ — xem
[khi nào đừng dùng pattern](../reference/what-is-a-pattern.md#khi-nào-không-nên-dùng-pattern).

**Chỉ leo lên bước 2 khi có yêu cầu mới.**

---

## Bước 2 — bảng tra delegate

**Yêu cầu mới:** *"marketing muốn thêm loại dịch vụ mà không đợi đợt release sau."*

Yêu cầu này `switch` không đáp ứng được — danh sách loại phải trở thành **dữ liệu**.

`lab2.cs`:

```csharp
var bang = new Dictionary<string, Func<decimal, int, decimal>>
{
    ["thuong"]  = (tien, kg) => kg * 15000m,
    ["nhanh"]   = (tien, kg) => kg * 25000m,
    ["hoa toc"] = (tien, kg) => kg * 40000m + 20000m,
};

decimal Phi(string loai, decimal tien, int kg) =>
    bang.TryGetValue(loai, out var f) ? f(tien, kg) : throw new ArgumentException($"khong biet loai: {loai}");

// them loai moi ma KHONG sua dong nao o tren
bang["duong bien"] = (tien, kg) => kg * 8000m;
```

```text
loai               2kg         5kg
----------------------------------
thuong          30,000      75,000
nhanh           50,000     125,000
hoa toc        100,000     220,000

sau khi them "duong bien": 40,000
so loai dang co: 4
```

Ô của bạn:

```text

```

**Không một lớp nào được tạo ra.** Đây đã là Strategy về mặt cấu trúc — `Func<>` chính là
strategy. Ba dòng đầu vẫn ra số y hệt bước 1: refactor không được đổi hành vi.

Cái vừa mất: `switch` trên `enum` được trình biên dịch kiểm tính đầy đủ, bảng tra thì
không. Đổi lại: thêm loại lúc chạy.

**Chỉ leo lên bước 3 khi `Func<>` không đủ.**

---

## Bước 3 — Strategy có lớp

**Yêu cầu mới:** *"giao diện phải hiển thị tên chương trình dịch vụ, và cấu hình đọc từ
file."*

Giờ mỗi strategy cần **hai** thứ (`Tinh` và `MoTa`) và mang **trạng thái cấu hình** — hai
điều kiện để lớp thắng delegate.

`lab3.cs`:

```csharp
interface IPhiShip { decimal Tinh(decimal tien, int kg); string MoTa { get; } }

sealed class TheoCan(decimal donGia, string ten) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => kg * donGia;
    public string MoTa => $"{ten} ({donGia:N0}/kg)";
}

sealed class TheoCanCongPhuPhi(decimal donGia, decimal phuPhi, string ten) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => kg * donGia + phuPhi;
    public string MoTa => $"{ten} (+{phuPhi:N0})";
}
```

Nạp từ chuỗi cấu hình:

```csharp
(string, IPhiShip) Nap(string dong)
{
    var p = dong.Split('|');
    return p[1] switch
    {
        "theo can" => (p[0], new TheoCan(decimal.Parse(p[2]), p[3])),
        "phu phi"  => (p[0], new TheoCanCongPhuPhi(decimal.Parse(p[2]), decimal.Parse(p[3]), p[4])),
        _ => throw new NotSupportedException(p[1])
    };
}
```

```text
ma        mo ta                          2kg         5kg
--------------------------------------------------------
thuong    Giao thuong (15,000/kg)      30,000      75,000
nhanh     Giao nhanh (25,000/kg)      50,000     125,000
hoa toc   Hoa toc (+20,000)          100,000     220,000
nap "duong bien|theo can|8000|Duong bien" -> Duong bien (8,000/kg): 40,000
nap "sieu toc|phu phi|60000|30000|Sieu toc" -> Sieu toc (+30,000): 330,000
so loai dang co: 5
```

Ô của bạn:

```text

```

Chú ý **hai lớp phục vụ năm loại dịch vụ**. `TheoCan` được dùng lại ba lần với ba cấu
hình khác nhau — đó là điểm khác biệt so với "mỗi loại một lớp", và là chỗ Strategy thật
sự trả lãi.

### Lấy lại thứ đã mất: kiểm tra lúc khởi động

Bước 2 và 3 đánh đổi kiểm tra lúc biên dịch lấy tính linh hoạt. Lấy lại một phần bằng cách
kiểm tra **lúc khởi động** thay vì lúc dùng:

```text
=== Kiem tra luc khoi dong: ma trong cau hinh phai da dang ky ===
  nhanh        OK
  duong bo     CHUA DANG KY — nem ngay luc khoi dong
```

Ô của bạn:

```text

```

Lỗi cấu hình giờ nổ ở lần chạy đầu tiên, không phải ở đơn hàng đầu tiên của khách.

---

## Bước 4 — Decorator chồng lên Strategy

**Yêu cầu mới:** *"miễn phí ship cho đơn từ 500.000, và phí không vượt quá 80.000, và hai
luật đó bật tắt được độc lập."*

Nhét vào từng strategy là nhân đôi code ở mọi lớp. Đây đúng chỗ của
[Decorator](../skills/decorator.md).

`lab4.cs`:

```csharp
sealed class MienPhiTuNguong(IPhiShip trong, decimal nguong) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => tien >= nguong ? 0m : trong.Tinh(tien, kg);
    public string MoTa => $"{trong.MoTa} + mien phi tu {nguong:N0}";
}

sealed class TranPhi(IPhiShip trong, decimal tran) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => Math.Min(trong.Tinh(tien, kg), tran);
    public string MoTa => $"{trong.MoTa} + tran {tran:N0}";
}

sealed class GiamPhanTram(IPhiShip trong, int pt) : IPhiShip
{
    public decimal Tinh(decimal tien, int kg) => trong.Tinh(tien, kg) * (100 - pt) / 100m;
    public string MoTa => $"{trong.MoTa} + giam {pt}%";
}
```

```text
cau hinh              300k/2kg    300k/5kg    600k/2kg    600k/5kg
------------------------------------------------------------------
goc                     50,000     125,000      50,000     125,000
mien phi >=500k         50,000     125,000           0           0
tran 80k                50,000      80,000      50,000      80,000
tran(giam 50%)          25,000      62,500      25,000      62,500
giam 50%(tran)          25,000      40,000      25,000      40,000
```

Ô của bạn:

```text

```

### Bài học chính của bước 4 — thứ tự bọc là một quyết định nghiệp vụ

Hai dòng cuối dùng **cùng một bộ decorator**, khác đúng thứ tự:

```text
Hai dong cuoi cung mot bo decorator, khac thu tu:
    300,000/2kg  tran(giam)=   25,000  giam(tran)=   25,000  khop
    300,000/5kg  tran(giam)=   62,500  giam(tran)=   40,000  LECH 22,500
    600,000/2kg  tran(giam)=   25,000  giam(tran)=   25,000  khop
    600,000/5kg  tran(giam)=   62,500  giam(tran)=   40,000  LECH 22,500
```

Ô của bạn:

```text

```

**Lệch 22.500 đồng mỗi đơn**, và cả hai thứ tự đều biên dịch được, chạy được, không cảnh
báo gì.

Chú ý hai dòng "khop": ở 2kg thì phí gốc (50.000) chưa chạm trần nên hai thứ tự trùng
nhau. **Một test viết bằng đơn 2kg sẽ xanh cho cả hai thứ tự** — và đó là lý do cần chọn
ca kiểm thử ở đúng ranh giới.

Câu hỏi nghiệp vụ: *giảm giá áp trước hay sau khi chặn trần?* Không có câu trả lời kỹ
thuật; phải hỏi. Và khi đã có câu trả lời thì **viết một test khoá nó lại**.

---

## Tổng kết — dừng ở đâu

| Bước | Cách | Mua được gì | Trả bằng gì | Dừng ở đây khi |
|---|---|---|---|---|
| 1 | `switch` | Đơn giản nhất, biên dịch kiểm đầy đủ | Thêm loại phải sửa code | Danh sách cố định, một chỗ dùng |
| 2 | Bảng `Func<>` | Thêm loại lúc chạy | Mất kiểm tra lúc biên dịch | Strategy chỉ cần một phép tính |
| 3 | Lớp Strategy | Nhiều method, trạng thái cấu hình, nạp từ file | Nhiều kiểu hơn, phải nhảy file | Cần `MoTa`, cần cấu hình |
| 4 | + Decorator | Luật cắt ngang bật tắt độc lập | **Thứ tự thành quyết định vô hình** | Có ≥2 luật cắt ngang |

**Mỗi bước chỉ leo lên khi bước trước không đáp ứng được một yêu cầu cụ thể.** Leo lên
luôn dễ; tụt xuống thì không, vì cả đội đã quen với abstraction.

## Bài tập tự làm

1. Thêm loại `"tiet kiem"` (10.000/kg, giảm 5.000 cho đơn từ 3kg) vào **bước 1** và
   **bước 3**. Đếm số dòng phải sửa ở mỗi bên.
2. Ở bước 4, viết một test khẳng định thứ tự `tran(giam)` là đúng, dùng ca 5kg. Kiểm tra
   test đó có đỏ khi bạn đảo thứ tự không.
3. Ở bước 3, làm gì để `Nap()` không còn `switch`? Gợi ý: xem
   [Factory Method](../skills/factory-method.md) — và tự hỏi việc đó có đáng không.
4. Đo thời gian chạy 1 triệu lần `Phi()` ở bước 1 và bước 3. Chênh lệch có đủ để đưa vào
   quyết định thiết kế không?

Bài 4 đáng làm nhất: phần lớn tranh luận "pattern làm chậm" biến mất khi có số.

## Related Topics

- [Strategy](../skills/strategy.md) — pattern chính của bước 2 và 3
- [Decorator](../skills/decorator.md) — pattern của bước 4, và bẫy thứ tự
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — tra ngược từ triệu chứng
- [Design pattern là gì](../reference/what-is-a-pattern.md) — Rule of Three
- [Cheatsheet 23 GoF](../cheatsheets/gof-23.md) — bảng một trang
