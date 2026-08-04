---
title: Singleton
sidebar_position: 1
description: "Đúng một thể hiện dùng chung — và ba lý do đo được vì sao gần như luôn nên thay bằng vòng đời singleton của DI container."
tags: [singleton, creational, gof, dependency-injection]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Singleton

> **Chốt:** Singleton giải quyết *"chỉ được có một"*, nhưng cách nó giải quyết là **biến
> toàn cục có vỏ bọc**. Trong C# hiện đại, thứ bạn cần gần như luôn là
> `services.AddSingleton<T>()` — cùng "một thể hiện", nhưng không kèm ba tác dụng phụ ở
> dưới.

## Mục tiêu

Biết phân biệt hai câu hỏi bị gộp làm một:

1. *"Hệ thống nên có đúng một thể hiện của thứ này"* — thường là yêu cầu đúng.
2. *"Lớp đó tự quản lý việc chỉ có một, và ai cũng gọi thẳng được"* — đây là phần gây hại.

Pattern Singleton trả lời cả hai cùng lúc. DI container trả lời cái thứ nhất và bỏ cái
thứ hai — đó là lý do nó thắng.

## Ý định gốc (GoF)

Đảm bảo một lớp chỉ có một thể hiện, và cung cấp một điểm truy cập toàn cục tới nó.

```csharp
sealed class CauHinhSingleton
{
    private static readonly CauHinhSingleton _i = new();
    public static CauHinhSingleton Instance => _i;
    private CauHinhSingleton() { }
}
```

`private` constructor chặn `new`, `static` field giữ thể hiện duy nhất. Bản này
**an toàn đa luồng** nhờ đảm bảo của CLR về khởi tạo static field — bản tự viết `if
(_i is null)` thì không, xem mục 2 ở dưới.

## Ví dụ xuyên suốt — ba kiểu hỏng, chạy ra được cả ba

Chạy bằng `dotnet run 06-singleton.cs` trên .NET 11.0.0.

### 1. Rò rỉ trạng thái giữa các test

```csharp
void TestA() { CauHinhSingleton.Instance.Dat("moi_truong", "test"); }
void TestB() { /* ky vong doc ra null */ }
```

```text
=== 1. Ro ri trang thai giua cac test ===
 Chay rieng TestB:
  TestB doc: (khong co)  <- ky vong (khong co)
 Chay TestA roi TestB (thu tu alphabet cua test runner):
  TestA doc: test
  TestB doc: test  <- ky vong (khong co)
```

**Cùng một `TestB`, hai kết quả.** Nó xanh khi chạy riêng và đỏ khi chạy sau `TestA` —
loại lỗi tốn thời gian nhất, vì triệu chứng phụ thuộc **thứ tự** chứ không phụ thuộc
code. Đổi tên một test cũng đủ làm nó xuất hiện hoặc biến mất.

Ca đầy đủ: [Test xanh khi chạy riêng, đỏ khi chạy chung](../case-studies/test-xanh-rieng-do-chung.md).

### 2. Lazy tự viết không an toàn đa luồng

Bản `if (_i is null)` mà nhiều tài liệu vẫn chép:

```csharp
public static KetNoiNgayTho Instance
{
    get
    {
        if (_i is null)
        {
            Thread.Sleep(20);            // gia lap khoi tao cham: mo dung cua so dua
            Interlocked.Increment(ref SoLanTao);
            _i = new KetNoiNgayTho();
        }
        return _i;
    }
}
```

```text
=== 2. Lazy khong khoa — bao nhieu the hien that su duoc tao? ===
  Kieu ngay tho : da goi constructor 8 lan (mong doi 1)
  Dung Lazy<T>  : da goi constructor 1 lan (mong doi 1)
```

**Tám thể hiện.** Tám luồng cùng qua cửa `if` trước khi bất kỳ luồng nào kịp gán. Nếu
constructor mở kết nối, mở file, hoặc đăng ký vào một registry, bạn vừa làm việc đó tám
lần — và bảy thể hiện kia trôi nổi cho tới khi GC dọn.

`Thread.Sleep(20)` chỉ để **mở rộng** cửa sổ đua cho nó xảy ra chắc chắn mỗi lần chạy.
Không có nó thì lỗi vẫn tồn tại, chỉ hiếm hơn — tức là khó tái hiện hơn, không phải an
toàn hơn.

Cách viết đúng nếu vẫn phải lazy:

```csharp
private static readonly Lazy<KetNoiLazy> _i = new(() => new KetNoiLazy());
public static KetNoiLazy Instance => _i.Value;
```

`Lazy<T>` mặc định dùng `LazyThreadSafetyMode.ExecutionAndPublication` — đúng một lần
gọi factory, các luồng còn lại chờ.

### 3. Phụ thuộc ẩn — không hiện trong constructor

```csharp
sealed class DichVuDatHang
{
    public string MoTa() => $"...{CauHinhSingleton.Instance.Doc("moi_truong")}...";
}
```

```text
=== 3. Phu thuoc an — fan-out khong hien trong constructor ===
  Fan-out theo constructor : 0
  Phu thuoc that su        : 1 (CauHinhSingleton, goi ben trong method)
  doc cau hinh tu singleton: moi_truong=test
```

**Fan-out đo được là 0, fan-out thật là 1.** Mọi công cụ phân tích phụ thuộc — kể cả
mắt người đọc chữ ký hàm — đều bỏ sót. Đây là loại coupling tệ nhất trong thang
[coupling](../reference/coupling-cohesion.md#bảy-mức-coupling-từ-lỏng-tới-chặt): mức
*common coupling*, và nó vô hình.

### Trước và sau — thay bằng DI

```csharp
// Program.cs
services.AddSingleton<ICauHinh, CauHinh>();

// Lop dung
sealed class DichVuDatHang(ICauHinh cauHinh)
{
    public string MoTa() => $"...{cauHinh.Doc("moi_truong")}...";
}
```

| | Singleton tự quản | `AddSingleton` |
|---|---|---|
| Số thể hiện lúc chạy | 1 | 1 |
| Phụ thuộc hiện trong chữ ký | không | **có** |
| Thay bằng bản giả trong test | phải thêm cửa hậu `Reset()` | truyền thẳng vào constructor |
| Trạng thái rò giữa test | có | không — mỗi test dựng container riêng |
| Đổi thành "một thể hiện mỗi tenant" | viết lại lớp | đổi một dòng đăng ký |

**Hai dòng đầu giống nhau — đó là điểm chính.** Bạn không mất gì về yêu cầu "chỉ có
một"; chỉ bỏ đi phần "ai cũng gọi thẳng được".

## Khi nào Singleton (tự quản) vẫn đúng

| Trường hợp | Vì sao chấp nhận được |
|---|---|
| Đối tượng **bất biến** không trạng thái, ví dụ bảng tra hằng số | Không có gì để rò rỉ giữa test |
| Code không có DI container và không định có (script, tool nhỏ) | Chi phí dựng container vượt lợi ích |
| Framework bắt buộc (một số điểm mở rộng cũ của .NET) | Không có lựa chọn |

Chú ý cả ba đều xoay quanh **không có trạng thái thay đổi được**. Chừng nào Singleton
còn `set` được cái gì đó, ba vấn đề ở trên còn nguyên.

## Trade-offs

| Được | Mất |
|---|---|
| Chắc chắn đúng một thể hiện | Trạng thái toàn cục — rò giữa test, giữa request |
| Truy cập ở đâu cũng được, không phải truyền qua tham số | Phụ thuộc không hiện trong chữ ký; fan-out đo được sai |
| Khởi tạo trễ, chỉ tốn khi thật sự dùng | Tự viết lazy là mở cửa sổ đua — 8 thể hiện như output trên |
| Ít code hơn DI cho dự án nhỏ | Đổi vòng đời (per-request, per-tenant) phải viết lại lớp |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Viết lazy bằng `if (_i is null)` không khoá | Nhiều thể hiện dưới tải song song — 8/8 lần trong output trên |
| Cho Singleton giữ trạng thái thay đổi được | Test phụ thuộc thứ tự chạy; lỗi chỉ xuất hiện trên CI |
| Thêm `Reset()` để test được | Cửa hậu này bị gọi nhầm trong code production sớm hay muộn |
| Dùng Singleton làm chỗ chứa mọi thứ dùng chung | Thành *service locator* — mọi lớp phụ thuộc mọi thứ, không đo được |
| `AddSingleton` một lớp giữ `DbContext` (vốn scoped) | Rò dữ liệu giữa request, và `DbContext` không an toàn đa luồng |
| Dùng double-checked locking tự viết mà quên `volatile` | Trên kiến trúc bộ nhớ yếu có thể thấy object chưa khởi tạo xong |

Dòng áp chót là bẫy riêng của .NET và hay gặp: **vòng đời của phụ thuộc không được dài
hơn vòng đời của thứ chứa nó.**

## FAQ

<details>
<summary>Vậy <code>static readonly</code> có phải Singleton không?</summary>

Về hiệu ứng thì có: một thể hiện, truy cập toàn cục. Về vấn đề cũng có: cùng ba tác dụng
phụ ở trên.

Khác biệt duy nhất là `static readonly` trung thực hơn — nó không giả vờ là một pattern
thiết kế. Nếu đối tượng bất biến thì cả hai đều ổn; nếu nó có trạng thái thì cả hai đều
là vấn đề.

</details>

<details>
<summary>Vì sao <code>AddSingleton</code> lại không bị rò trạng thái giữa test?</summary>

Vì phạm vi "một thể hiện" là **một container**, không phải một tiến trình. Mỗi test dựng
`ServiceProvider` riêng, nên mỗi test có `CauHinh` riêng.

Cùng lúc đó, trong ứng dụng chạy thật chỉ có một container, nên vẫn đúng một thể hiện.
Đây chính là chỗ DI tách được hai câu hỏi ở mục *Mục tiêu*.

</details>

<details>
<summary>Singleton có an toàn đa luồng thì có phải lo gì nữa không?</summary>

Có. "Khởi tạo an toàn đa luồng" chỉ đảm bảo **chỉ tạo một lần**. Nó không nói gì về việc
nhiều luồng cùng đọc/ghi trạng thái bên trong sau đó.

`CauHinhSingleton` ở ví dụ trên dùng `Dictionary` — an toàn khi chỉ đọc, hỏng khi nhiều
luồng cùng ghi. Muốn an toàn thì phải là `ConcurrentDictionary`, hoặc bất biến.

</details>

<details>
<summary>Logger dùng Singleton có sao không?</summary>

Logger là ca dễ chấp nhận nhất, vì nó gần như không trạng thái và không ai viết assertion
lên nó. Nhưng `ILogger<T>` tiêm qua constructor vẫn tốt hơn ở một điểm cụ thể: nó cho bạn
**bắt log trong test** để kiểm chứng "có ghi cảnh báo khi gặp X" — thứ không làm được
với logger toàn cục.

</details>

## Related Topics

- [Coupling và cohesion](../reference/coupling-cohesion.md) — common coupling, mức thứ tư
- [SOLID](../reference/solid.md) — Singleton vi phạm D một cách có hệ thống
- [Abstract Factory](abstract-factory.md) — bản thân xưởng thường được đăng ký singleton
- [Facade](facade.md) — hay bị làm thành singleton, và hay phình vì thế
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng tra triệu chứng

## References

- GoF — *Design Patterns*, Singleton
- Microsoft — *Dependency injection in .NET*, mục "Service lifetimes"
