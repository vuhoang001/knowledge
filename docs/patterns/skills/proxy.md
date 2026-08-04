---
title: Proxy
sidebar_position: 12
description: "Chen vào trước khi chạm đối tượng thật — lazy proxy tiết kiệm 1 truy vấn khi không dùng tới, và sinh N+1 khi có dùng tới."
tags: [proxy, structural, gof, lazy-loading, n-plus-one]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Proxy

> **Chốt:** Proxy giữ nguyên interface và chen vào giữa — nên người gọi **không biết**
> mình đang cầm proxy. Đó vừa là sức mạnh vừa là bẫy: lazy proxy biến một vòng lặp trông
> vô hại thành N+1 truy vấn, và code không có dấu hiệu gì.

## Mục tiêu

Thêm kiểm soát quanh việc truy cập một đối tượng — hoãn tạo, kiểm quyền, đếm, gọi qua
mạng — mà không sửa đối tượng đó và không sửa người gọi.

## Ý định gốc (GoF)

Cung cấp một đối tượng thay thế hoặc đại diện cho một đối tượng khác để kiểm soát truy cập
tới nó.

Bốn biến thể kinh điển:

| Loại | Kiểm soát cái gì | Ví dụ trong .NET |
|---|---|---|
| **Virtual** | Hoãn tạo/nạp tới khi thật sự cần | Lazy loading của EF Core, `Lazy<T>` |
| **Protection** | Ai được gọi | Kiểm quyền trước khi vào |
| **Remote** | Vị trí — object nằm ở tiến trình/máy khác | gRPC client, HTTP client sinh tự động |
| **Smart** | Việc phụ khi truy cập | Đếm tham chiếu, log, đo thời gian |

## Ví dụ xuyên suốt — đơn hàng và chi tiết

Chạy bằng `dotnet run 17-proxy.cs` trên .NET 11.0.0. `GiaLapCsdl` đếm số truy vấn.

### 1. Virtual proxy khi **không** chạm tới

```csharp
sealed class DonHang(string ma, GiaLapCsdl db)
{
    private List<Dong>? _chiTiet;
    public List<Dong> ChiTiet => _chiTiet ??= db.NapChiTiet(ma);   // lazy: nap khi cham toi
}
```

```text
=== 1. Lazy proxy: tot khi khong dung toi ===
  Liet ke 3 don, khong cham chi tiet: 1 truy van
```

Đúng như quảng cáo: chỉ liệt kê mã đơn thì không tốn truy vấn nào cho chi tiết.

### 2. Cùng proxy đó, khi **có** chạm tới

```csharp
foreach (var d in ds) tong += d.ChiTiet.Sum(c => c.Tien);   // moi lan cham -> 1 truy van
```

```text
=== 2. Cung lazy proxy: N+1 khi co cham toi ===
  Cong tong 750,000: 4 truy van  (1 + 3 = N+1)
```

**Bốn truy vấn cho ba đơn.** Với 500 đơn thì là 501 — và dòng code gây ra nó
(`d.ChiTiet`) trông y hệt một lần truy cập property bình thường.

Đây là điểm mù cố hữu: proxy thành công tới mức người đọc **không thấy** có I/O ở đó.
Trên một danh sách 500 phần tử, một property lookup vô hại thành 500 vòng mạng.

### 3. Nạp sẵn

```text
=== 3. Nap san (eager): 1 truy van ===
  Cong tong 750,000: 1 truy van
```

Cùng kết quả `750.000`, **1 truy vấn thay vì 4**. Trong EF Core đây là
`.Include(d => d.ChiTiet)`.

### 4. Protection proxy

```csharp
sealed class ProxyKiemQuyen(ITaiLieu that, string nguoiDung) : ITaiLieu
{
    private static readonly HashSet<string> _duocPhep = ["giam_doc", "ke_toan"];
    public string Doc() => _duocPhep.Contains(nguoiDung)
        ? that.Doc()
        : throw new UnauthorizedAccessException($"{nguoiDung} khong duoc doc");
}
```

```text
=== 4. Protection proxy ===
  giam_doc  : noi dung cua bang-luong.xlsx
  thuc_tap  : TU CHOI (thuc_tap khong duoc doc)
```

### 5. Smart proxy

```text
=== 5. Smart proxy: dem va do ===
  so lan doc: 4
```

### Trước và sau

| | Không proxy (nạp sẵn) | Virtual proxy |
|---|---|---|
| Liệt kê 3 đơn, không xem chi tiết | 1 truy vấn (thừa dữ liệu) | 1 truy vấn |
| Cộng tổng 3 đơn | 1 truy vấn | **4 truy vấn** |
| Cộng tổng 500 đơn | 1 truy vấn | **501 truy vấn** |
| Chỗ gây tải nhìn thấy trong code | `.Include(...)` — rõ | `d.ChiTiet` — vô hình |
| Bộ nhớ khi chỉ cần danh sách | tải cả chi tiết | chỉ danh sách |

Ca hỏng đầy đủ: [Lazy proxy sinh N+1 truy vấn](../case-studies/lazy-proxy-sinh-n-cong-mot-query.md).

## Cách phát hiện N+1 do proxy

| Cách | Làm gì |
|---|---|
| **Đếm truy vấn trong test** | Interceptor của EF Core đếm `CommandExecuted`; assert số truy vấn ≤ ngưỡng |
| **Tắt lazy loading mặc định** | EF Core: không bật `UseLazyLoadingProxies`. Thiếu `Include` thành lỗi rõ ràng thay vì tải ngầm |
| **Log truy vấn ở môi trường dev** | Nhìn thấy 501 dòng giống nhau là nhận ra ngay |
| **Cấm truy cập navigation property ngoài repository** | Ranh giới rõ: chỗ nào được I/O, chỗ nào không |

Dòng thứ hai là biện pháp mạnh nhất và cũng là khuyến nghị mặc định: **lazy loading tắt
thì N+1 không xảy ra âm thầm được** — nó chuyển thành exception hoặc danh sách rỗng, cả
hai đều bị test bắt.

## Proxy và Decorator giống hệt nhau về hình dạng

| | Proxy | [Decorator](decorator.md) |
|---|---|---|
| Ý định | Kiểm soát truy cập | Thêm hành vi |
| Người gọi biết không | Thường không | Có — chính họ chọn bọc |
| Số lớp bọc | Thường 1 | Nhiều, xếp chồng có nghĩa |
| Ai tạo ra đối tượng thật | Thường là proxy | Người gọi tạo rồi đưa vào |

Dòng cuối là phép thử rõ nhất: nếu lớp bọc **tự quyết định khi nào tạo** đối tượng bên
trong thì đó là Proxy; nếu nó nhận đối tượng đã có thì thiên về Decorator.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Tạo đối tượng thật vốn đã rẻ | Lazy chỉ thêm một lần kiểm tra `null` và một điểm mù |
| Cần thấy rõ chi phí I/O tại chỗ gọi | Proxy giấu đúng thứ bạn muốn thấy |
| Kiểm quyền cần ngữ cảnh phong phú (ai, cái gì, khi nào) | Proxy chỉ biết mình bọc gì; dùng tầng authorization riêng |
| Đối tượng nhỏ và luôn được dùng tới | Nạp sẵn đơn giản hơn và ít truy vấn hơn |

## Trade-offs

| Được | Mất |
|---|---|
| Hoãn được chi phí tới lúc thật sự cần | Chi phí trở nên **vô hình** tại chỗ gọi → N+1 |
| Thêm kiểm quyền / log không sửa lớp gốc | Một tầng gián tiếp khi debug |
| Người gọi không cần biết gì | Không biết cũng là không kiểm soát được |
| Đối tượng ở xa dùng như đối tượng gần | Lỗi mạng xuất hiện ở chỗ trông như truy cập bộ nhớ |

Dòng cuối là bẫy của remote proxy, và là lý do
[Fallacies of Distributed Computing](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing)
mở đầu bằng "mạng đáng tin cậy": một property lookup không có `try/catch`, nhưng một lời
gọi mạng thì cần.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Bật lazy loading mặc định trên toàn dự án | N+1 xuất hiện khắp nơi, không ai thấy tới khi production chậm |
| Truy cập navigation property trong vòng lặp | 1 + N truy vấn — đúng output mục 2 ở trên |
| Proxy nuốt lỗi của đối tượng thật | Giống [adapter nuốt lỗi](adapter.md); dữ liệu thiếu mà không ai biết |
| Lazy proxy không an toàn đa luồng | Hai luồng cùng chạm → hai lần nạp, hoặc trạng thái hỏng |
| Kiểm quyền đặt sau cache | Xem [Decorator](decorator.md#thứ-tự-a--cache-bọc-ngoài-kiemquyen) — thủng phân quyền |
| Proxy giữ tham chiếu tới đối tượng nặng sau khi hết cần | Rò rỉ bộ nhớ; đối tượng thật không được thu hồi |

## FAQ

<details>
<summary><code>Lazy&lt;T&gt;</code> có phải là proxy không?</summary>

Đúng loại virtual proxy, ở dạng thư viện. Khác biệt: `Lazy<T>` **không cài interface của
T**, nên người gọi phải viết `.Value` — chi phí trở nên **nhìn thấy được**.

Đó là ưu điểm chứ không phải khiếm khuyết. `lazy.Value` trong vòng lặp trông đáng ngờ;
`d.ChiTiet` thì không.

</details>

<details>
<summary>EF Core lazy loading có nên bật không?</summary>

Mặc định là **không**, và đó là lựa chọn đúng cho phần lớn dự án. Lý do đã ở output mục 2:
nó biến chi phí thành thứ vô hình.

Bật khi: mô hình miền phức tạp, phần lớn đường dẫn không chạm tới quan hệ, và bạn **đã có**
test đếm số truy vấn để chặn hồi quy. Thiếu vế cuối thì đừng bật.

</details>

<details>
<summary>Viết proxy cho interface 20 method thì phải gõ 20 lần?</summary>

Ba lối:

1. **Tách interface nhỏ hơn** — thường là câu trả lời đúng, xem
   [ISP](../reference/solid.md#i--interface-segregation).
2. **`DispatchProxy`** có sẵn trong .NET — sinh proxy lúc chạy bằng reflection. Trả giá:
   chậm hơn, mất kiểm tra lúc biên dịch, không thân thiện AOT.
3. **Source generator** — sinh code lúc biên dịch, giữ được cả tốc độ lẫn kiểm tra kiểu.

</details>

## Related Topics

- [Decorator](decorator.md) — cùng hình dạng, khác ý định
- [Adapter](adapter.md) — bọc nhưng **đổi** interface
- [Facade](facade.md) — cửa vào đơn giản hơn cho nhiều thứ
- [Flyweight](flyweight.md) — cũng đứng giữa, nhưng để tiết kiệm bộ nhớ
- [Singleton](singleton.md) — `Lazy<T>` là cách khởi tạo an toàn cho cả hai

## References

- GoF — *Design Patterns*, Proxy
- Microsoft — *Lazy Loading of Related Data* (EF Core)
