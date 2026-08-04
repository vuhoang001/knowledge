---
title: Test xanh khi chạy riêng, đỏ khi chạy chung
sidebar_position: 1
description: "Singleton giữ trạng thái giữa các test — cùng một test cho hai kết quả tuỳ thứ tự chạy, và đổi tên test là đủ làm nó xuất hiện hoặc biến mất."
tags: [case-study, singleton, testing, coupling]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Test xanh khi chạy riêng, đỏ khi chạy chung

> **Nhãn: tình huống dựng lại.** Không phải sự cố đã gặp trong kho này. Bù lại, mọi con
> số đều chạy thật bằng `dotnet run 06-singleton.cs` trên .NET 11.0.0.

## Bối cảnh

Dịch vụ đặt hàng đọc cấu hình qua một singleton kinh điển:

```csharp
sealed class CauHinhSingleton
{
    private static readonly CauHinhSingleton _i = new();
    public static CauHinhSingleton Instance => _i;
    private readonly Dictionary<string, string> _kho = new();
    private CauHinhSingleton() { }
    public void Dat(string k, string v) => _kho[k] = v;
    public string? Doc(string k) => _kho.TryGetValue(k, out var v) ? v : null;
}
```

Bộ test có hai bài. `TestA` đặt môi trường thành `"test"` rồi kiểm tra đọc lại được.
`TestB` kiểm tra rằng khi chưa ai đặt gì thì `Doc("moi_truong")` trả `null`.

## Triệu chứng

Chạy riêng `TestB` — xanh:

```text
 Chay rieng TestB:
  TestB doc: (khong co)  <- ky vong (khong co)
```

Chạy cả hai theo thứ tự alphabet (mặc định của phần lớn test runner) — `TestB` đỏ:

```text
 Chay TestA roi TestB (thu tu alphabet cua test runner):
  TestA doc: test
  TestB doc: test  <- ky vong (khong co)
```

**Cùng một dòng code, hai kết quả.** Và trên CI nó đỏ, trên máy dev (chạy một test bằng
nút "Run this test") nó xanh.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| CI có biến môi trường khác máy dev | Triệu chứng chỉ xuất hiện trên CI | Đặt cùng biến trên máy dev, vẫn xanh khi chạy một test |
| Test chạy song song, đua nhau | Test runner mặc định chạy song song theo class | Tắt song song, vẫn đỏ — vì đây là **thứ tự**, không phải đua |
| `Dictionary` không an toàn đa luồng | Đúng là nó không an toàn | Chạy tuần tự vẫn đỏ |
| Cache của build | Cổ điển | `dotnet clean` không đổi gì |

Chỗ mất thời gian nhất là giả thuyết đầu tiên: nó đúng về *nơi* triệu chứng xuất hiện,
nên có vẻ đang đi đúng hướng. Nhưng nó nhầm nguyên nhân với hoàn cảnh.

## Nguyên nhân thật

`CauHinhSingleton.Instance` là **một thể hiện cho cả tiến trình**. Test runner chạy mọi
test trong cùng một tiến trình, nên `TestA` và `TestB` dùng chung đúng một `Dictionary`.

Điều `TestA` ghi vào, `TestB` đọc ra.

Bằng chứng quyết định: đổi tên `TestA` thành `TestZ`. Thứ tự alphabet đảo lại, và `TestB`
xanh trở lại — **không sửa một dòng code sản phẩm nào**.

Khi một lỗi thay đổi hành vi vì bạn đổi *tên* một test, nguyên nhân gần như chắc chắn là
trạng thái dùng chung giữa các test.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test từng lớp | Xanh | Mỗi test đúng khi chạy một mình |
| Code review | Không nhận ra | `Instance` là mẫu quen thuộc, "ai cũng viết thế" |
| Phân tích phụ thuộc qua constructor | **Fan-out = 0** | Singleton không hiện trong chữ ký hàm |
| Analyzer tĩnh | Im lặng | Không có luật nào cấm `static` |

Bảng đo được:

```text
=== 3. Phu thuoc an — fan-out khong hien trong constructor ===
  Fan-out theo constructor : 0
  Phu thuoc that su        : 1 (CauHinhSingleton, goi ben trong method)
```

**Fan-out đo được là 0, fan-out thật là 1.** Đây là loại
[coupling](../reference/coupling-cohesion.md#bảy-mức-coupling-từ-lỏng-tới-chặt) nguy hiểm
nhất: mức *common*, và vô hình với mọi công cụ đọc chữ ký.

## Cách sửa

### Sai lầm thường gặp: thêm cửa hậu `Reset()`

```csharp
public void Reset() => _kho.Clear();      // dung trong test
```

Nó làm test xanh, nhưng: cửa hậu này **sẽ** bị gọi từ code production sớm hay muộn, và
mọi test mới phải nhớ gọi nó ở `Setup`. Bạn vừa đổi một lỗi im lặng lấy một quy ước mà
không có gì cưỡng chế.

### Cách đúng: đưa phụ thuộc vào qua constructor

```csharp
// Program.cs
services.AddSingleton<ICauHinh, CauHinh>();

// Lop dung
sealed class DichVuDatHang(ICauHinh cauHinh)
{
    public string MoTa() => $"...{cauHinh.Doc("moi_truong")}...";
}
```

| | Trước | Sau |
|---|---|---|
| Số thể hiện lúc chạy production | 1 | 1 |
| Số thể hiện trong bộ test | 1 (dùng chung) | 1 **mỗi test** |
| Fan-out đo được | 0 | 1 — đúng bằng thật |
| Đổi tên test làm đổi kết quả | có | không |

**Hai dòng đầu là điểm chính:** yêu cầu "chỉ có một thể hiện" không hề mất. Phạm vi của
"một" chuyển từ *một tiến trình* sang *một container* — mà trong production vẫn chỉ có
một container.

## Dấu hiệu nhận ra sớm

Chạy được ngay hôm nay:

```bash
# 1. Dao thu tu test — bo test tot phai xanh o moi thu tu
dotnet test --  xunit.execution.DisableParallelization=true

# 2. Tim moi trang thai tinh thay doi duoc
grep -rn "static.*Dictionary\|static.*List\|public static.*{ get; set; }" --include=*.cs src/
```

Ba câu hỏi cho code review:

1. Lớp này có `static` field nào **thay đổi được** không?
2. Test của nó có phụ thuộc thứ tự chạy không — thử đổi tên xem?
3. Fan-out đếm theo constructor có bằng fan-out thật không, hay có lời gọi `X.Instance`
   nào bên trong method?

Câu thứ ba là câu bắt được nhiều nhất, vì nó nhắm vào chỗ mà công cụ không nhìn tới.

## Related Topics

- [Singleton](../skills/singleton.md) — pattern gây ra ca này, và khi nào nó vẫn đúng
- [Coupling và cohesion](../reference/coupling-cohesion.md) — common coupling và fan-out ẩn
- [SOLID](../reference/solid.md) — DIP là lối ra
- [Case study — Design Patterns](index.md)
