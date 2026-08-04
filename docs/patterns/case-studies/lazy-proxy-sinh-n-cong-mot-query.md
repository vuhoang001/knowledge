---
title: Một dòng truy cập property thành 501 truy vấn
sidebar_position: 11
description: "Lazy proxy làm chi phí I/O vô hình — vòng lặp cộng tổng 500 đơn chạy 501 truy vấn thay vì 1, và code không có dấu hiệu gì."
tags: [case-study, proxy, lazy-loading, n-plus-one, performance]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Một dòng truy cập property thành 501 truy vấn

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run cs-nplus1.cs`
> trên .NET 11.0.0.

## Bối cảnh

ORM bật lazy loading. Đơn hàng có quan hệ tới dòng chi tiết:

```csharp
sealed class DonHang(string ma, GiaLapCsdl db)
{
    private List<Dong>? _chiTiet;
    public List<Dong> ChiTiet => _chiTiet ??= db.NapChiTiet(ma);   // lazy: nap khi cham toi
}
```

Ban đầu điều này rất có lợi: màn hình danh sách đơn chỉ hiện mã và ngày, không chạm chi
tiết, nên không tốn truy vấn nào.

```text
=== 1. Lazy proxy: tot khi khong dung toi ===
  Liet ke 3 don, khong cham chi tiet: 1 truy van
```

Rồi sản phẩm thêm cột **"Tổng tiền"** vào bảng danh sách. Một dòng code:

```csharp
foreach (var d in ds) tong += d.ChiTiet.Sum(c => c.Tien);
```

## Triệu chứng

Màn hình danh sách đơn từ 200ms lên 1,2 giây. Không lỗi, không timeout, chỉ chậm — và chậm
**tỷ lệ thuận với số dòng hiển thị**, nên trang 1 (10 đơn) vẫn ổn còn bộ lọc "cả tháng"
thì treo.

```text
   10 don -> lazy    11 truy van | eager   1 truy van | gap   11.0x | tong khop: True
  100 don -> lazy   101 truy van | eager   1 truy van | gap  101.0x | tong khop: True
  500 don -> lazy   501 truy van | eager   1 truy van | gap  501.0x | tong khop: True
```

```text
Neu moi truy van mat 2ms round-trip:
   10 don -> lazy     22 ms | eager   2 ms
  100 don -> lazy    202 ms | eager   2 ms
  500 don -> lazy   1002 ms | eager   2 ms
```

Chú ý cột `tong khop: True` — **kết quả hoàn toàn đúng**. Đây không phải lỗi tính toán;
chỉ là cái giá.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| CSDL thiếu index | Chậm = thiếu index, phản xạ đầu tiên | `EXPLAIN` trên truy vấn: dùng index, 0,4ms |
| Truy vấn danh sách đơn quá nặng | Đúng chỗ chậm | Truy vấn đó vẫn 2ms như trước |
| Cần thêm cache | Giải quyết triệu chứng | Cache 501 truy vấn vẫn là 501 lần tra cache |
| Mạng tới CSDL có vấn đề | Chậm tỷ lệ với số dòng | Đúng hướng: **số lượng** round-trip, không phải tốc độ mỗi cái |

Ba giả thuyết đầu đều nhìn vào *một truy vấn chạy nhanh hay chậm*. Không truy vấn nào
chậm. Vấn đề là **có 501 cái**.

Bằng chứng quyết định: bật log truy vấn của ORM và đếm dòng. 501 dòng gần như giống hệt
nhau, khác đúng tham số `ma_don`.

## Nguyên nhân thật

`d.ChiTiet` trông như một lần đọc property. Thực ra nó là một
[Proxy](../skills/proxy.md) virtual: lần chạm đầu tiên kích hoạt một truy vấn.

Trong vòng lặp 500 phần tử, đó là 500 truy vấn — cộng 1 cho danh sách gốc.

**Điểm mù cố hữu: proxy thành công tới mức người đọc không thấy có I/O ở đó.**

```csharp
foreach (var d in ds) tong += d.ChiTiet.Sum(c => c.Tien);
//                             ^^^^^^^^ 500 vong mang o day
```

So sánh với bản nạp sẵn, nơi chi phí **hiện ra trong code**:

```csharp
var ds = db.LayDonHangKemChiTiet(...);    // .Include(d => d.ChiTiet) — nhin thay duoc
```

```text
=== 3. Nap san (eager): 1 truy van ===
  Cong tong 750,000: 1 truy van
```

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test tính tổng | Xanh | Kết quả đúng — `tong khop: True` |
| Test tích hợp | Xanh | Dữ liệu test có 3 đơn → 4 truy vấn, không ai để ý |
| Code review | Trượt | Một dòng `foreach` + `Sum`, trông như code sạch |
| Test hiệu năng | Không có | Ít dự án có; và nếu có thì thường chạy trên dữ liệu nhỏ |
| Trình biên dịch | Im lặng | Truy cập property là hợp lệ |

Dòng thứ hai là bài học chính: **với 3 đơn, lazy chỉ tốn 4 truy vấn.** Chênh lệch quá nhỏ
để ai đó chú ý. Lỗi này chỉ lộ ra ở quy mô, và bộ test hiếm khi chạy ở quy mô.

## Cách sửa

### Sửa gấp — nạp sẵn

```csharp
var ds = db.DonHang.Include(d => d.ChiTiet).Where(...).ToList();
```

1 truy vấn thay vì 501.

**Cẩn thận `Include` quá tay:** nạp sẵn ba quan hệ một-nhiều trong một truy vấn tạo tích
Descartes, và một truy vấn khổng lồ có thể tệ hơn vài truy vấn nhỏ. EF Core có
`AsSplitQuery()` cho đúng trường hợp đó.

### Sửa gốc — tắt lazy loading mặc định

| Cách | Hiệu quả |
|---|---|
| Không bật `UseLazyLoadingProxies` | Thiếu `Include` thành lỗi rõ ràng thay vì tải ngầm |
| Chỉ trả DTO từ tầng truy vấn, không trả entity | Không có navigation property để ai đó chạm nhầm |
| Truy vấn chiếu thẳng (`Select` ra DTO) | CSDL tính tổng; không tải dòng chi tiết lên bộ nhớ chút nào |

Cách thứ ba thường tốt nhất cho ca này: `Select(d => new { d.Ma, Tong = d.ChiTiet.Sum(c => c.Tien) })`
đẩy phép cộng xuống CSDL, một truy vấn và không tải dòng nào.

### Chặn tái diễn — đếm truy vấn trong test

```csharp
[Fact] async Task Man_hinh_danh_sach_khong_duoc_vuot_2_truy_van()
{
    var dem = new DemTruyVan();                    // DbCommandInterceptor
    await _mh.Tai(soDong: 500, dem);
    Assert.True(dem.So <= 2, $"chay {dem.So} truy van");
}
```

Đây là loại test rẻ nhất bắt được cả một lớp lỗi. Điều bắt buộc: **chạy với số dòng đủ
lớn**. Test với 3 đơn cho 4 truy vấn và ngưỡng nào cũng qua.

### Bảng đánh đổi

| | Lazy | Eager (`Include`) | Chiếu ra DTO |
|---|---|---|---|
| Chỉ cần danh sách, không cần chi tiết | 1 truy vấn | 1 truy vấn (thừa dữ liệu) | 1 truy vấn |
| Cần tổng của chi tiết | **N+1** | 1 truy vấn | 1 truy vấn, ít dữ liệu nhất |
| Chi phí hiện trong code | **không** | có | có |
| Nguy cơ tích Descartes | không | có (nhiều `Include`) | không |

## Dấu hiệu nhận ra sớm

```bash
# Truy cap navigation property trong vong lap
grep -rnE "foreach.*\{[^}]*\.(ChiTiet|Dong|Items)\b" --include=*.cs src/

# Lazy loading co dang bat khong
grep -rn "UseLazyLoadingProxies" --include=*.cs src/
```

Ba câu hỏi cho code review:

1. Dòng này có chạm navigation property **bên trong vòng lặp** không?
2. Truy vấn tương ứng có `Include` không, hay đang dựa vào lazy?
3. Với 500 dòng thay vì 5, đoạn này chạy bao nhiêu truy vấn? Nếu không trả lời được ngay,
   bật log truy vấn và đếm.

Câu thứ ba trả lời được trong hai phút và bắt được gần như mọi ca N+1.

## Related Topics

- [Proxy](../skills/proxy.md) — virtual proxy và cách phát hiện N+1
- [Decorator](../skills/decorator.md) — cùng hình dạng, khác ý định
- [Case study — Design Patterns](index.md)
