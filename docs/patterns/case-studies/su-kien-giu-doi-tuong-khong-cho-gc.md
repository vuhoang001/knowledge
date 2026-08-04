---
title: 8,4 MB rò rỉ sau 2000 lần mở màn hình
sidebar_position: 14
description: "Nguồn sự kiện giữ tham chiếu tới observer, không phải ngược lại — quên -= là mọi màn hình từng mở đều sống mãi và vẫn nhận thông báo."
tags: [case-study, observer, memory-leak, event, garbage-collection]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# 8,4 MB rò rỉ sau 2000 lần mở màn hình

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng
> `dotnet run cs-observer-leak.cs` và `dotnet run 24-observer.cs` trên .NET 11.0.0.

## Bối cảnh

Ứng dụng desktop nội bộ. Một service bộ lọc toàn cục phát sự kiện khi người dùng đổi điều
kiện lọc; mỗi màn hình đăng ký để tự cập nhật:

```csharp
sealed class BoLoc
{
    public event Action<string>? Doi;
    public void Phat(string s) => Doi?.Invoke(s);
}

// trong ManHinhVm
_boLoc.Doi += CapNhat;
```

Service `BoLoc` là singleton, sống suốt đời ứng dụng. Màn hình thì mở ra đóng vào liên
tục.

## Triệu chứng

Ba dấu hiệu, xuất hiện dần theo ca làm việc:

1. Bộ nhớ tăng đều, không bao giờ giảm — sau 6 tiếng làm việc, ứng dụng chiếm 2,3 GB.
2. Ứng dụng chậm dần: đổi bộ lọc lúc 9h mất 20ms, lúc 16h mất 400ms.
3. Thỉnh thoảng có lỗi lạ từ một màn hình **đã đóng** — stack trace trỏ tới ViewModel của
   một tab người dùng đóng từ sáng.

```text
=== Mo va dong man hinh 2000 lan, KHONG huy dang ky ===
  so nguoi dang ky con lai : 2,000
  bo nho tang             : 8,384,400 bytes

=== Cung 2000 lan, CO huy dang ky ===
  so nguoi dang ky con lai : 0
  bo nho tang             : 4,344 bytes
```

**8.384.400 bytes so với 4.344 bytes** — chênh gần 2000 lần, đúng bằng số lần mở màn hình.

Dấu hiệu thứ hai được giải thích ở đây:

```text
=== Chi phi moi lan phat su kien ===
  mot lan Phat() goi 2,000 handler — trong do phan lon la man hinh da dong
```

Mỗi lần đổi bộ lọc, hệ thống gọi 2000 handler — 1999 trong đó thuộc về màn hình không còn
hiển thị.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Cache ảnh không giới hạn | Bộ nhớ tăng đều là mùi của cache | Tắt cache ảnh: vẫn tăng y hệt |
| GC không chạy vì máy còn nhiều RAM | Giải thích được "không bao giờ giảm" | Ép `GC.Collect()`: không giảm |
| Có `static` list giữ ViewModel | Đúng loại nguyên nhân | `grep static` không thấy gì liên quan |
| Vòng tham chiếu giữa View và ViewModel | Hợp lý với MVVM | .NET GC xử lý được vòng tham chiếu — đó **không** phải nguyên nhân rò rỉ trong .NET |

Giả thuyết cuối đáng nói: nhiều người mang kinh nghiệm từ đếm tham chiếu (COM,
Objective-C cũ) sang. GC của .NET là mark-and-sweep, **vòng tham chiếu tự nó không gây rò
rỉ** — chỉ tham chiếu từ một gốc còn sống mới gây.

Và đó chính là manh mối: cái gì đang là "gốc còn sống"?

## Nguyên nhân thật

**Nguồn sự kiện giữ tham chiếu tới observer, không phải ngược lại.**

```text
BoLoc (singleton, song mai)
   └── event Doi
          └── delegate
                 └── Target = ManHinhVm   ← tham chieu MANH
```

Chừng nào `BoLoc` còn sống, mọi `ManHinhVm` từng đăng ký đều không thể bị thu hồi.

Hướng phụ thuộc này **ngược với trực giác**. Lập trình viên nghĩ "màn hình dùng service,
nên màn hình phụ thuộc service". Về mặt bộ nhớ thì ngược lại.

Chứng minh trực tiếp bằng `WeakReference`:

```csharp
WeakReference TaoRoiBo(GiaCoPhieu n, bool huy)
{
    var ob = new BangDieuKhien();
    n.Doi += ob.Nhan;
    n.Dat(100m);
    if (huy) n.Doi -= ob.Nhan;
    return new WeakReference(ob);
}
```

```text
=== Ro ri bo nho: quen huy dang ky ===
  Sau GC, observer con song? True  <- true nghia la BI RO RI
  So nguoi dang ky con lai: 1
  Co huy dang ky, con song? False
  So nguoi dang ky con lai: 0
```

`IsAlive == True` sau `GC.Collect()` là bằng chứng không thể chối: object đã ra khỏi mọi
phạm vi mà vẫn không được thu hồi.

Dấu hiệu thứ ba (lỗi từ màn hình đã đóng) cũng theo đó: handler vẫn được gọi, và nó chạm
vào tài nguyên đã bị `Dispose`.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test ViewModel | Xanh | Mỗi test tạo một VM và kết thúc; không ai kiểm nó có được thu hồi không |
| Test UI đóng/mở màn hình | Xanh | Kiểm giao diện, không kiểm bộ nhớ |
| Trình biên dịch | Im lặng | `+=` không có `-=` là hợp lệ |
| Analyzer mặc định | Im lặng | Không có luật nào yêu cầu cân bằng `+=`/`-=` |
| Profiler | **Bắt được** | Nhưng chỉ khi ai đó chủ động chạy nó |

Dòng cuối là điểm quan trọng: công cụ để thấy lỗi này tồn tại và hoạt động tốt. Nó chỉ
không nằm trong quy trình tự động.

Test bắt được:

```csharp
[Fact] void ViewModel_phai_duoc_thu_hoi_sau_khi_dong()
{
    var yeu = Tao_roi_dong();                 // tao VM, dang ky, Dispose, roi bo
    GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect();
    Assert.False(yeu.IsAlive);
}
```

Một test như thế cho mỗi loại màn hình, chạy trong CI.

## Cách sửa

### Cách chuẩn — huỷ đăng ký trong `Dispose`

```csharp
sealed class ManHinhVm : IDisposable
{
    private readonly BoLoc _boLoc;
    public ManHinhVm(BoLoc boLoc) { _boLoc = boLoc; _boLoc.Doi += CapNhat; }
    public void Dispose() => _boLoc.Doi -= CapNhat;
}
```

**Quy tắc: lớp nào đăng ký sự kiện thì lớp đó phải `IDisposable`.** Đây là luật kiểm được
bằng analyzer, không cần dựa vào trí nhớ.

Một bẫy đi kèm: `-=` phải gỡ **đúng delegate**. Nếu đăng ký bằng lambda thì phải giữ lại
biến:

```csharp
_handler = s => CapNhat(s);
_boLoc.Doi += _handler;
// ...
_boLoc.Doi -= _handler;        // dung lambda moi thi KHONG go duoc gi
```

### Cách an toàn hơn — API buộc phải nghĩ tới việc dừng

```csharp
_dangKy = _boLoc.Subscribe(CapNhat);   // tra ve IDisposable
// ...
_dangKy.Dispose();
```

`IObservable<T>` (Rx) trả `IDisposable` từ `Subscribe`. Khác biệt không nằm ở cơ chế mà ở
**thiết kế API**: bạn cầm một thứ trong tay và trình biên dịch/analyzer nhắc bạn xử lý nó.
`-=` thì không có gì để cầm.

### Khi không kiểm soát được vòng đời — weak event

Nguồn giữ `WeakReference` tới observer. Chỉ dùng khi thật sự không kiểm soát được vòng đời
(một số framework UI), vì nó đổi lấy một hành vi khó chịu: observer có thể **ngừng nhận
thông báo** ở một thời điểm không xác định, do GC quyết định.

### Bảng chọn

| Tình huống | Cách |
|---|---|
| Vòng đời observer ngắn hơn nguồn | `Dispose` + `-=` — **mặc định** |
| Vòng đời hai bên bằng nhau (cả hai singleton) | Không cần huỷ |
| Cần lọc, gộp, throttle luồng sự kiện | `IObservable<T>` + `IDisposable` |
| Không kiểm soát được vòng đời observer | Weak event |

## Dấu hiệu nhận ra sớm

```bash
# Dang ky su kien ma lop khong IDisposable
grep -rln "+= " --include=*.cs src/ | xargs grep -L "IDisposable"

# Dang ky bang lambda — khong go duoc
grep -rnE "\.\w+ \+= (\(|\w+ =>)" --include=*.cs src/
```

Ba câu hỏi cho code review:

1. Lớp này có `+=` không? Nếu có, nó có `IDisposable` và `-=` tương ứng không?
2. Nguồn sự kiện sống **lâu hơn** người đăng ký không? (singleton, `static`) Nếu có, rò rỉ
   là chắc chắn chứ không phải rủi ro.
3. Đăng ký bằng method group hay lambda? Lambda thì `-=` không gỡ được gì.

Câu thứ hai là câu quyết định: **vòng đời nguồn dài hơn observer** chính là điều kiện đủ
để có rò rỉ.

## Related Topics

- [Observer](../skills/observer.md) — ba bẫy của event trong C#
- [Mediator](../skills/mediator.md) — trung gian singleton mắc đúng vấn đề này
- [Case study — Design Patterns](index.md)
