---
title: Adapter
sidebar_position: 6
description: "Dịch API bên thứ ba sang hình dạng mình cần — và cái bẫy lớn nhất là adapter nuốt lỗi, biến sự cố hệ thống thành không có dữ liệu."
tags: [adapter, structural, gof, anti-corruption-layer]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-04
---

# Adapter

> **Chốt:** Adapter dịch *hình dạng* của một API sang hình dạng mình cần. Phần khó không
> phải dịch kiểu dữ liệu — mà là dịch **lỗi**. Adapter nuốt exception biến một sự cố hệ
> thống thành "không có dữ liệu", và báo cáo thiếu tiền mà không ai biết.

## Mục tiêu

Cô lập mọi chỗ code của bạn chạm vào một thư viện hoặc dịch vụ ngoài, để đổi nhà cung cấp
không phải sửa khắp nơi — và để lỗi của họ không lẫn vào logic của bạn.

## Ý định gốc (GoF)

Chuyển interface của một lớp thành interface mà người gọi mong đợi, cho phép hai thứ vốn
không khớp làm việc với nhau.

```csharp
// Cai minh CAN
interface ITyGia { decimal? LayTyGia(string ma); }

// Cai ben thu ba CO — tra chuoi, nem kieu exception rieng
sealed class ThuVienTyGiaBenThuBa
{
    public string FetchRate(string code) => ...;   // nem ExternalRateApiException
}
```

Adapter đứng giữa. Ba thứ nó dịch, theo thứ tự dễ quên dần: **kiểu dữ liệu** (`string` →
`decimal`), **tên gọi** (`FetchRate` → `LayTyGia`), và **lỗi**.

## Ví dụ xuyên suốt — tỷ giá từ dịch vụ ngoài

Chạy bằng `dotnet run 11-adapter.cs` trên .NET 11.0.0.

### Adapter nuốt lỗi — kiểu viết phổ biến nhất, và sai

```csharp
sealed class AdapterNuotLoi(ThuVienTyGiaBenThuBa tv) : ITyGia
{
    public decimal? LayTyGia(string ma)
    {
        try { return decimal.Parse(tv.FetchRate(ma)); }
        catch { return null; }                       // nuot sach moi thu
    }
}
```

```text
=== Adapter nuot loi ===
  USD: 25,400.50
  JPY: 165.20
  XXX: (khong co du lieu)
```

Trông rất hợp lý: mã không tồn tại thì trả `null`. Vấn đề là `catch { }` không phân biệt
được *"mã tiền tệ không tồn tại"* với *"dịch vụ đang sập"*, *"hết hạn token"*, hay
*"parse hỏng vì họ đổi định dạng số"*. Cả bốn đều thành `null`.

### Hậu quả trên báo cáo

```csharp
decimal Tong(ITyGia tg, (string ma, decimal tien)[] dong)
{
    decimal t = 0;
    foreach (var d in dong) t += d.tien * (tg.LayTyGia(d.ma) ?? 0m);
    return t;
}
```

```text
=== Hau qua tren bao cao ===
  Tong voi adapter nuot loi : 4,192,050 VND   <- thieu tien, khong bao gi
  Tong voi adapter dich loi : dung lai — khong tra duoc ty gia cho "XXX"
```

**Con số 4.192.050 là một con số sai trông như số đúng.** Nó không có cờ cảnh báo, không
có dòng log, không có `null` để ai đó kiểm. Dòng `("XXX", 50m)` đơn giản đóng góp 0 đồng.

### Adapter dịch lỗi sang ngôn ngữ của mình

```csharp
sealed class AdapterDichLoi(ThuVienTyGiaBenThuBa tv) : ITyGia
{
    public decimal? LayTyGia(string ma)
    {
        try { return decimal.Parse(tv.FetchRate(ma)); }
        catch (ExternalRateApiException e) { throw new KhongTraCuuDuocTyGia($"khong tra duoc ty gia cho \"{ma}\"", e); }
    }
}
```

```text
=== Adapter dich loi sang ngon ngu cua minh ===
  USD: 25,400.50
  JPY: 165.20
  XXX: nem KhongTraCuuDuocTyGia: khong tra duoc ty gia cho "XXX"
```

Hai điểm quan trọng trong bốn dòng code này:

1. **`catch` đúng kiểu cụ thể**, không `catch` trống. Lỗi lạ (hết bộ nhớ, huỷ tác vụ) đi
   thẳng lên trên, đúng chỗ.
2. **Giữ exception gốc làm inner exception.** Không giữ là mất stack trace của bên kia —
   và bạn sẽ debug mù.

### Trước và sau

| | Nuốt lỗi | Dịch lỗi |
|---|---|---|
| Mã tiền tệ sai | `null` | exception có tên mã |
| Dịch vụ sập | `null` | exception, dừng pipeline |
| Họ đổi định dạng số | `null` | exception `FormatException` bọc lại |
| Báo cáo | ra số thiếu, trông bình thường | dừng, có thông báo |
| Người đọc code gọi | tưởng `null` nghĩa là "không có" | biết rõ hai trạng thái khác nhau |
| Cảnh báo giám sát | không có gì để cảnh báo | exception đếm được, alert được |

Ca hỏng đầy đủ:
[Adapter nuốt lỗi thành danh sách rỗng](../case-studies/adapter-nuot-loi-thanh-danh-sach-rong.md).

## Ba biến thể hay gặp

| Biến thể | Hình dạng | Dùng khi |
|---|---|---|
| **Object adapter** | Adapter *chứa* đối tượng đích | Mặc định. Composition, đổi được lúc chạy |
| **Class adapter** | Adapter *kế thừa* đối tượng đích | C# chỉ kế thừa đơn nên hiếm dùng; và kéo theo [vấn đề của kế thừa](../reference/composition-over-inheritance.md) |
| **Two-way adapter** | Cài cả hai interface | Khi hai hệ cùng phải nhìn thấy nhau; hiếm, và khó bảo trì |

Trong .NET, `Extension method` là một dạng adapter nhẹ: nó "thêm" method vào kiểu có sẵn
mà không sửa kiểu đó. Nhưng nó không đổi được hiện thực lúc chạy, nên không thay thế
được adapter thật khi cần cắm bản giả trong test.

## Adapter và anti-corruption layer

Adapter một lớp là chiến thuật. Khi cả một hệ ngoài đổ vào, thứ bạn cần là **anti-corruption
layer** (thuật ngữ DDD): một tầng gồm nhiều adapter + mô hình riêng, đảm bảo *khái niệm*
của họ không rò vào mô hình của bạn.

Dấu hiệu cần leo thang từ adapter lên tầng ACL:

| Dấu hiệu | Nghĩa là |
|---|---|
| Kiểu DTO của họ xuất hiện trong chữ ký hàm nghiệp vụ của bạn | Mô hình của họ đã rò vào |
| Bạn phải copy enum của họ vào code mình để so sánh | Từ vựng của họ đang thành từ vựng của bạn |
| Đổi nhà cung cấp phải sửa hơn 3 file ngoài thư mục tích hợp | Ranh giới đã thủng |

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Bạn sở hữu cả hai phía và sửa được | Sửa thẳng interface, đừng thêm tầng dịch vĩnh viễn |
| Thư viện đã có interface hợp lý | Adapter chỉ chuyển tiếp 1:1 là code chết |
| Chỉ dùng ở đúng một chỗ, một lần | Gọi thẳng; adapter đáng khi có từ 2 chỗ gọi trở lên |

## Trade-offs

| Được | Mất |
|---|---|
| Đổi nhà cung cấp chỉ sửa một lớp | Thêm một tầng, thêm một lần nhảy khi debug |
| Test được logic mà không cần dịch vụ ngoài | Phải bảo trì ánh xạ khi API bên kia đổi |
| Kiểu và exception của họ không rò vào code mình | Có thể mất thông tin nếu ánh xạ không đủ giàu |
| Một chỗ duy nhất để thêm retry, cache, log | Dễ phình thành nơi chứa logic nghiệp vụ |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| `catch { return null; }` | Sự cố hệ thống thành "không có dữ liệu" — báo cáo 4.192.050 ở trên |
| `catch (Exception)` thay vì kiểu cụ thể | Nuốt cả `OperationCanceledException`, `OutOfMemoryException` |
| Ném exception mới mà không giữ inner | Mất stack trace của bên kia; debug bằng cách đoán |
| Để kiểu DTO của bên kia lọt ra ngoài adapter | Đổi nhà cung cấp phải sửa khắp nơi — adapter mất hết giá trị |
| Nhét logic nghiệp vụ vào adapter | Logic nằm ở tầng tích hợp, không ai tìm ra |
| Adapter chỉ chuyển tiếp 1:1 không dịch gì | Một tầng thừa hoàn toàn |

## FAQ

<details>
<summary>Adapter khác Facade chỗ nào?</summary>

Adapter đổi **hình dạng** của *một* thứ cho khớp cái bạn cần — số lượng thứ không đổi,
interface đổi.

[Facade](facade.md) **giấu bớt** *nhiều* thứ sau một cửa vào đơn giản hơn — số lượng
giảm, và interface mới là do bạn nghĩ ra chứ không phải khớp với cái có sẵn.

Phép thử: nếu bỏ lớp trung gian đi mà người gọi vẫn viết được cùng một dòng code (chỉ
khác tên method) thì đó là Adapter. Nếu người gọi phải viết 7 dòng thì đó là Facade.

</details>

<details>
<summary>Trả <code>null</code> hay ném exception khi không tìm thấy?</summary>

Phân biệt hai câu hỏi khác nhau:

- *"Không tìm thấy"* là **kết quả hợp lệ** → trả `null` hoặc `Option`/`Result`, và đặt
  tên method rõ (`ThuLayTyGia`).
- *"Không tra cứu được"* là **sự cố** → ném.

Sai lầm ở ví dụ trên không phải trả `null`, mà là **gộp cả hai** vào cùng một `null`.
Nếu API bên kia không phân biệt được hai ca đó, adapter chính là chỗ bạn phải phân biệt —
bằng cách đọc mã lỗi HTTP, mã lỗi của họ, hay bất cứ tín hiệu nào có.

</details>

<details>
<summary>Có nên viết adapter cho thư viện chuẩn (<code>HttpClient</code>, <code>DateTime</code>) không?</summary>

Có, cho những thứ **không xác định**: thời gian, ngẫu nhiên, hệ thống tệp, mạng. Không
phải để đổi nhà cung cấp, mà để test — xem
[DIP](../reference/solid.md#d--dependency-inversion).

Không, cho những thứ thuần tính toán và bất biến (`Math`, `string`). Chúng không có gì
để giả lập.

</details>

## Related Topics

- [Facade](facade.md) — giấu nhiều thứ, không phải đổi hình dạng một thứ
- [Decorator](decorator.md) — cùng hình dạng bọc ngoài, nhưng **giữ nguyên** interface
- [Proxy](proxy.md) — cũng giữ nguyên interface, nhưng để kiểm soát truy cập
- [Bridge](bridge.md) — thiết kế trước hai trục; Adapter là chữa cháy sau khi đã có
- [SOLID](../reference/solid.md) — hiện thân của D và I

## References

- GoF — *Design Patterns*, Adapter
- Eric Evans — *Domain-Driven Design*, "Anticorruption Layer"
