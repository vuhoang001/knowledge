---
title: In 183 tờ giấy thành 242
sidebar_position: 3
description: "Hai tham số int liền nhau bị hoán vị trong constructor — biên dịch sạch, chạy được, và mỗi đơn in dư 59 tờ giấy."
tags: [case-study, builder, constructor, type-safety]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# In 183 tờ giấy thành 242

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 09-builder.cs`
> trên .NET 11.0.0.

## Bối cảnh

Dịch vụ in tài liệu nội bộ. Lớp đơn in có sáu tham số, bốn trong đó cùng kiểu `int`:

```csharp
sealed class DonInCu(string tep, int soTrang, int soBan, int tuTrang, bool haiMat, bool mauSac)
{
    public int SoToGiay() => (int)Math.Ceiling(soTrang / (haiMat ? 2.0 : 1.0)) * soBan;
}
```

Một tính năng mới gọi nó từ chỗ khác:

```csharp
var don = new DonInCu("bao-cao.pdf", 3, 121, 1, true, false);
```

## Triệu chứng

Phòng hành chính báo: *"máy in hết giấy giữa buổi, và số tờ trên báo cáo chi phí không
khớp."*

```text
  y dinh : tep=bao-cao.pdf soTrang=121 soBan=3 tuTrang=1 haiMat=True mau=False
  go nham: tep=bao-cao.pdf soTrang=3 soBan=121 tuTrang=1 haiMat=True mau=False
  Trinh bien dich bao gi? khong gi ca — ca hai deu hop le
  So to giay: dung=183  nham=242
```

**183 tờ thành 242** — dư 59 tờ mỗi đơn, 32%.

Điều làm nó khó lần: hệ thống **vẫn in ra tài liệu đúng**. Nội dung không sai, chỉ số bản
và số trang mỗi bản bị đảo. Với tài liệu ngắn thì không ai để ý.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Driver máy in đếm sai | Con số lệch nằm ở phần đếm giấy | Đếm tay một đơn: đúng bằng số hệ thống báo |
| Công thức `Math.Ceiling` sai với số lẻ | 121 là số lẻ, in hai mặt | Chạy công thức riêng với 121 và 3: ra 183, đúng |
| Người dùng nhập nhầm | Dễ đổ lỗi nhất | Log đầu vào cho thấy người dùng nhập đúng 121 trang, 3 bản |
| Có hai đường tạo đơn in, một đường mới thêm | Gần đúng | Đúng — nhưng phải đọc kỹ mới thấy hai tham số đảo chỗ |

Ba giả thuyết đầu đều nhắm vào *phép tính*, vì con số sai nên phép tính có vẻ là nghi
phạm. Phép tính hoàn toàn đúng; **đầu vào của nó sai**.

## Nguyên nhân thật

`soTrang` và `soBan` cùng kiểu `int`, đứng cạnh nhau, và bị gọi ngược thứ tự.

```csharp
new DonInCu("bao-cao.pdf", 3, 121, ...)   // 3 trang, 121 ban
new DonInCu("bao-cao.pdf", 121, 3, ...)   // 121 trang, 3 ban
```

Trình biên dịch không có gì để phản đối: cả hai đều là `int`, cả hai đều trong khoảng hợp
lệ. Không có kiểu nào phân biệt "số trang" với "số bản".

Chi tiết làm nó sống sót qua review: `ceil(121/2)*3 = 183` và `ceil(3/2)*121 = 242` — hai
số **cùng bậc độ lớn**. Không có gì trông bất thường.

Với `bool` thì còn tệ hơn: `haiMat` và `mauSac` đảo nhau cho ra một tài liệu in màu một
mặt thay vì đen trắng hai mặt — và chi phí gấp nhiều lần 32%.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test `SoToGiay()` | Xanh | Test gọi constructor đúng thứ tự |
| Trình biên dịch | Im lặng | Bốn tham số cùng kiểu `int` |
| Code review | Trượt | Sáu số trong một dòng, không ai đối chiếu vị trí |
| Test tích hợp | Xanh | Nó kiểm nội dung tài liệu, không kiểm số bản |
| Analyzer | Im lặng | Không có luật nào về thứ tự tham số cùng kiểu |

**Không có công cụ nào trong chuỗi có thông tin để bắt lỗi này**, vì thông tin đó (tham số
nào là gì) chỉ tồn tại trong *tên* tham số, mà tên tham số không có mặt tại chỗ gọi.

## Cách sửa

### Cách rẻ nhất — tham số có tên

```csharp
var don = new DonInCu("bao-cao.pdf", soTrang: 121, soBan: 3, tuTrang: 1, haiMat: true, mauSac: false);
```

Không đổi một dòng nào trong lớp. Mua được ngay tính đọc được, nhưng **không cưỡng chế**:
người gọi tiếp theo vẫn có quyền không dùng tên.

### Cách chắc hơn — object initializer với `required`

```csharp
var don = new DonIn { Tep = "bao-cao.pdf", SoTrangIn = 121, SoBanIn = 3, HaiMat = true, MauSac = false };
```

```text
=== C# co san: object initializer + required ===
  tep=bao-cao.pdf soTrang=121 soBan=3 haiMat=True mau=False
```

`required` bắt buộc gán — trình biên dịch chặn nếu thiếu. Mọi giá trị đều có tên tại chỗ
gọi, **không thể** không có.

### Khi cần kiểm tra chéo — [Builder](../skills/builder.md)

```csharp
var qua = new DonInBuilder("bao-cao.pdf").SoTrang(121).SoBan(3).MatTruocSau().Build();
```

```text
=== Build() la cho kiem tra bat buoc ===
  nem: InvalidOperationException: chua khai SoTrang
  nem: ArgumentOutOfRangeException: SoBan phai >= 1 (Parameter '_soBan')
```

`Build()` là chỗ duy nhất thấy toàn bộ trạng thái — nơi đặt được luật kiểu *"nếu in hai
mặt thì số trang phải chẵn"*.

### Cách triệt để nhất — kiểu riêng cho từng đại lượng

```csharp
readonly record struct SoTrang(int Gia Tri);
readonly record struct SoBan(int GiaTri);
```

Giờ hoán vị **không biên dịch được**. Đắt hơn (nhiều kiểu nhỏ, phải `.GiaTri` khắp nơi),
nhưng đúng chỗ cho các đại lượng hay bị lẫn: tiền tệ, đơn vị đo, id của các thực thể khác
nhau.

### Bảng chọn

| Cách | Cưỡng chế | Công sức | Chọn khi |
|---|---|---|---|
| Tham số có tên | không | 0 | Sửa nhanh, một chỗ gọi |
| `required` + initializer | có (bắt buộc gán) | thấp | **Mặc định** |
| Builder | có + kiểm tra chéo | trung bình | Có luật giữa các field |
| Kiểu riêng | có (chống hoán vị) | cao | Đại lượng hay lẫn, dùng khắp hệ thống |

## Dấu hiệu nhận ra sớm

```bash
# Constructor tu 4 tham so tro len co tham so cung kieu lien nhau
grep -rnE 'public [A-Z][A-Za-z]*\((int|decimal|bool|string)[^)]*(int|decimal|bool|string)[^)]*\)' --include=*.cs src/
```

Ba câu hỏi cho code review:

1. Có hai tham số **cùng kiểu** đứng cạnh nhau không? Đó là chỗ hoán vị được.
2. Chỗ gọi có tên tham số không? Nếu chỉ có số trần thì người đọc không kiểm được.
3. Nếu hoán vị hai tham số này, có test nào đỏ không? Không → viết test đó trước.

Câu thứ ba là phép thử tốt nhất và rẻ nhất: **cố tình hoán vị, chạy test.** Nếu tất cả
vẫn xanh, bạn vừa tìm ra một lỗ hổng thật.

## Related Topics

- [Builder](../skills/builder.md) — dựng nhiều bước và chỗ đặt kiểm tra chéo
- [Prototype](../skills/prototype.md) — dựng biến thể từ cấu hình mẫu
- [Case study — Design Patterns](index.md)
