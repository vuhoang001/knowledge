---
title: Decorator
sidebar_position: 9
description: "Thêm hành vi mà không sửa lớp gốc — và thứ tự bọc đổi ngữ nghĩa: đặt cache ngoài kiểm quyền là thực tập sinh đọc được bảng lương."
tags: [decorator, structural, gof, composition, cross-cutting]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Decorator

> **Chốt:** Decorator thêm hành vi bằng cách bọc, giữ nguyên interface — nên bọc được
> nhiều lớp chồng lên nhau. Cái giá là **thứ tự bọc trở thành một quyết định thiết kế
> vô hình**: cả hai thứ tự đều biên dịch, đều chạy, và một trong hai làm thủng kiểm quyền.

## Mục tiêu

Thêm các mối quan tâm cắt ngang — log, cache, retry, đo thời gian, kiểm quyền — vào một
dịch vụ mà không sửa lớp dịch vụ đó, và không nhân số lớp lên theo tổ hợp.

## Ý định gốc (GoF)

Gắn thêm trách nhiệm cho một đối tượng **lúc chạy**. Decorator là một lựa chọn linh hoạt
thay cho việc kế thừa để mở rộng chức năng.

```csharp
interface IKho { string Doc(string nguoiDung, string ma); }

sealed class BocCache(IKho trong) : IKho          // cai vao cung interface
{
    private readonly Dictionary<string, string> _cache = [];
    public string Doc(string nguoiDung, string ma) { ... trong.Doc(...) ... }
}
```

Ba đặc điểm bắt buộc: **cài cùng interface** với thứ nó bọc, **giữ một tham chiếu** tới
thứ đó, và **gọi tiếp** vào trong.

## Ví dụ xuyên suốt — kho dữ liệu bảng lương

Chạy bằng `dotnet run 14-decorator.cs` trên .NET 11.0.0. Hai decorator: `BocCache` và
`BocKiemQuyen`. Chỉ `ke_toan` và `giam_doc` được xem bảng lương.

### Thứ tự A — Cache bọc **ngoài** KiemQuyen

```csharp
IKho a = new BocCache(new BocKiemQuyen(kho));
```

```text
=== Thu tu A: Cache boc NGOAI KiemQuyen  (cache truoc, kiem sau) ===
  ke toan  doc BL-01: bang luong BL-01 = 82.500.000
  thuc tap doc BL-01: bang luong BL-01 = 82.500.000  [cache]
  so lan kiem quyen that su chay: 1
```

**Thực tập sinh đọc được bảng lương.** Kế toán đọc trước, kết quả vào cache; lần sau cache
trả lời ngay và **lớp kiểm quyền không bao giờ được gọi** — bộ đếm dừng ở 1.

Đây không phải lỗi cài đặt. Cả `BocCache` lẫn `BocKiemQuyen` đều đúng theo đặc tả riêng
của chúng. Lỗi nằm ở **thứ tự**, và thứ tự nằm ở một dòng trong `Program.cs` mà không có
test nào nhìn tới.

### Thứ tự B — KiemQuyen bọc **ngoài** Cache

```csharp
IKho b = new BocKiemQuyen(new BocCache(kho));
```

```text
=== Thu tu B: KiemQuyen boc NGOAI Cache  (kiem truoc, cache sau) ===
  ke toan  doc BL-01: bang luong BL-01 = 82.500.000
  thuc tap doc BL-01: TU CHOI (thuc_tap khong duoc xem BL-01)
  so lan kiem quyen that su chay: 2
```

Kiểm quyền chạy **mỗi lần**, cache vẫn hoạt động ở tầng dưới:

```text
=== So lan cham kho that (cache co chay khong) ===
  thu tu A: 1   thu tu B: 1
```

Cả hai thứ tự đều chỉ chạm kho thật một lần — **cache không mất hiệu quả gì** khi đặt bên
trong. Đây là điểm quan trọng: thứ tự B không đánh đổi hiệu năng lấy an toàn, nó chỉ đúng
hơn.

### Quy tắc rút ra

| Nhóm decorator | Vị trí | Vì sao |
|---|---|---|
| Kiểm quyền, xác thực, kiểm tra đầu vào | **Ngoài cùng** | Phải chạy cho mọi lời gọi, không được cache bỏ qua |
| Log, đo thời gian, tracing | Ngoài, ngay sau kiểm quyền | Muốn thấy cả lời gọi bị từ chối |
| Cache | Giữa | Sau kiểm quyền, trước retry |
| Retry, circuit breaker, timeout | **Trong cùng**, sát nguồn | Chỉ thử lại thao tác thật, không thử lại phần đã cache |

### Thứ tự cũng đổi số dòng log

```text
=== Log ngoai vs trong Retry: dem so dong log ===
  Log(Retry(kho)) -> ton kho SP-9 = 42, so dong log = 1
  Retry(Log(kho)) -> ton kho SP-9 = 42, so dong log = 3
```

Cùng một cặp decorator, cùng kết quả trả về, **1 dòng log so với 3**. Cái nào đúng tuỳ
câu hỏi bạn muốn log trả lời: *"có bao nhiêu yêu cầu"* (ngoài) hay *"có bao nhiêu lần
chạm hệ ngoài"* (trong).

### Trước và sau

| | Sửa thẳng lớp gốc | Decorator |
|---|---|---|
| Thêm cache | sửa `KhoThat` | thêm 1 lớp, không đụng `KhoThat` |
| Bật cache cho môi trường này, tắt ở môi trường kia | thêm cờ `if` trong lớp gốc | đổi một dòng nối dây |
| Test `KhoThat` riêng | phải tắt cache bằng cờ | `KhoThat` không biết cache tồn tại |
| Số tổ hợp cache × retry × log | 2³ = 8 nhánh `if` | 3 lớp, ghép lúc chạy |
| Thứ tự áp dụng | hiện rõ trong code | **vô hình**, nằm ở chỗ nối dây |

Ca hỏng đầy đủ: [Đổi thứ tự decorator, thủng kiểm quyền](../case-studies/doi-thu-tu-decorator-mat-cache.md).

## Decorator trong .NET thực tế

| Chỗ gặp | Ví dụ |
|---|---|
| `Stream` | `new GZipStream(new BufferedStream(new FileStream(...)))` — chính là chuỗi decorator |
| ASP.NET Core middleware | Mỗi middleware bọc middleware kế tiếp; thứ tự `app.Use...` chính là thứ tự bọc |
| `HttpClient` `DelegatingHandler` | Retry, log, thêm header — cùng cơ chế |
| DI container | Scrutor: `services.Decorate<IKho, BocCache>()` |

Middleware của ASP.NET Core là ví dụ đáng nhớ nhất, vì tài liệu chính thức của nó dành hẳn
một mục cảnh báo về **thứ tự** — cùng bài học ở trên, ở quy mô framework.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Chỉ có một hành vi thêm vào, và nó luôn bật | Viết thẳng vào lớp gốc đọc dễ hơn |
| Cần thêm **method mới**, không phải sửa method có sẵn | Decorator giữ nguyên interface; xem [Visitor](visitor.md) hoặc extension method |
| Bọc quá 4–5 tầng | Không ai suy được thứ tự đúng; gom thành factory dựng sẵn cấu hình chuẩn |
| Hành vi thêm cần trạng thái chung giữa các lớp bọc | Decorator độc lập nhau theo thiết kế; dùng [Mediator](mediator.md) hoặc gộp lại |

## Trade-offs

| Được | Mất |
|---|---|
| Lớp gốc không biết gì về cache/log/retry | Thứ tự bọc là quyết định vô hình, không test nào bắt tự nhiên |
| Bật/tắt từng mối quan tâm bằng cấu hình | Stack trace dài, khó đọc |
| Tổ hợp `2ⁿ` cấu hình từ `n` lớp | Debug phải đi qua n tầng chuyển tiếp |
| Mỗi mối quan tâm test được riêng | Không có chỗ nào nhìn thấy toàn bộ hành vi cuối cùng |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Đặt cache ngoài kiểm quyền | Thủng phân quyền — đúng output thứ tự A ở trên |
| Đặt retry ngoài cache | Thử lại cả phần đã cache; vô nghĩa và làm sai số đo |
| Decorator đổi interface (thêm method) | Không còn bọc được nữa; đó là Adapter, không phải Decorator |
| Quên gọi `trong.Doc(...)` ở một nhánh | Chuỗi đứt im lặng, hành vi biến mất |
| Decorator có trạng thái mà đăng ký vòng đời sai | Cache singleton bọc dịch vụ scoped → rò dữ liệu giữa request |
| Không có test cho **thứ tự** nối dây | Thứ tự là chỗ dễ sai nhất và là chỗ ít được test nhất |

Dòng cuối là hành động cụ thể nên làm: viết một test dựng đúng chuỗi từ composition root
thật, rồi khẳng định *"người không có quyền bị từ chối kể cả khi dữ liệu đã có trong
cache"*.

## FAQ

<details>
<summary>Decorator khác Proxy chỗ nào?</summary>

Về hình dạng: giống hệt — cùng interface, giữ tham chiếu, gọi tiếp.

Về ý định: Decorator **thêm hành vi** và người gọi *chủ động chọn* bọc mấy lớp.
[Proxy](proxy.md) **kiểm soát truy cập** và người gọi thường *không biết* mình đang cầm
proxy.

Phép thử: bọc hai lớp cùng loại có ý nghĩa không? `Cache(Cache(x))` vô nghĩa → Proxy.
`Log(Retry(x))` có nghĩa → Decorator.

</details>

<details>
<summary>Nhiều decorator thì nối dây ở đâu cho gọn?</summary>

Dùng Scrutor với DI container:

```csharp
services.AddScoped<IKho, KhoThat>();
services.Decorate<IKho, BocCache>();        // boc lan 1
services.Decorate<IKho, BocKiemQuyen>();    // boc lan 2 — nam NGOAI cung
```

Thứ tự `Decorate` là **từ trong ra ngoài**: lời gọi cuối cùng là lớp ngoài cùng. Đây đúng
là chỗ hay sai, nên viết một comment ngay đó ghi rõ thứ tự mong muốn.

</details>

<details>
<summary>Interface có 15 method thì decorator phải viết 15 method chuyển tiếp?</summary>

Đúng, và đó là dấu hiệu interface quá rộng — xem
[ISP](../reference/solid.md#i--interface-segregation). Hai lối ra:

1. Tách interface theo nhu cầu người gọi, decorate cái nhỏ.
2. Dùng `DispatchProxy` (có sẵn trong .NET) để sinh proxy động — trả giá bằng reflection,
   mất kiểm tra lúc biên dịch, và khó với AOT.

Lối 1 gần như luôn tốt hơn.

</details>

## Related Topics

- [Proxy](proxy.md) — cùng hình dạng, khác ý định
- [Composite](composite.md) — cũng là cây, nhưng nhiều con thay vì một
- [Composition over inheritance](../reference/composition-over-inheritance.md) — Decorator là hiện thân của nguyên tắc này
- [Adapter](adapter.md) — bọc nhưng **đổi** interface
- [Chain of Responsibility](chain-of-responsibility.md) — cũng là chuỗi, nhưng mỗi mắt xích có quyền dừng

## References

- GoF — *Design Patterns*, Decorator
- Microsoft — *ASP.NET Core Middleware*, mục "Middleware order"
