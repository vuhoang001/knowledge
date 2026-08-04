---
title: Template Method
sidebar_position: 22
description: "Khung cố định, vài bước để lớp con quyết định — và cái bẫy là lớp con override một bước có logic chung rồi quên gọi base, làm luật kiểm tra biến mất."
tags: [template-method, behavioral, gof, inheritance, hook]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Template Method

> **Chốt:** Template Method là Strategy cắm bằng **kế thừa** thay vì bằng đối tượng — nên
> nó thừa hưởng cả điểm yếu của kế thừa. Bẫy cụ thể: lớp con `override` một bước có logic
> chung rồi quên gọi `base`, và luật kiểm tra biến mất mà **trình biên dịch không nói gì**.

## Mục tiêu

Giữ khung xương của một quy trình ở một chỗ, cho phép biến thể chỉ ở vài bước — mà không
để biến thể xoá mất phần bất biến của khung.

## Ý định gốc (GoF)

Định nghĩa bộ khung của một thuật toán trong một thao tác, hoãn một số bước cho lớp con.
Template Method cho lớp con định nghĩa lại vài bước mà **không đổi cấu trúc** thuật toán.

Cụm từ "không đổi cấu trúc" là lời hứa của pattern, và cũng đúng là chỗ nó hay thất hứa.

## Ví dụ xuyên suốt — nạp dữ liệu, lọc dòng hỏng

Chạy bằng `dotnet run 27-template-method.cs` trên .NET 11.0.0.

Dữ liệu: ba dòng, trong đó `",thieu ma"` thiếu mã và **phải bị loại**.

### Khung dễ vỡ — bước có logic chung là `virtual`

```csharp
abstract class NapDeVo
{
    public (int nhan, int loai) Chay(string[] dong) { ... KiemTra(d) ... }
    protected virtual bool KiemTra(string d) => !string.IsNullOrWhiteSpace(LayMa(d));   // luat chung
    protected abstract string LayMa(string d);
}

sealed class NapJsonDeVo : NapDeVo
{
    protected override string LayMa(string d) => d.Split(',')[0];
    protected override bool KiemTra(string d) => d.Length > 0;      // QUEN goi base -> mat luat chung
}
```

```text
=== Khung de vo: lop con override va quen goi base ===
  NapCsvDeVo       nhan 2 dong, loai 1 dong hong
  NapJsonDeVo      nhan 3 dong, loai 0 dong hong
```

**Hai lớp con, hai kết quả khác nhau trên cùng dữ liệu.** `NapJsonDeVo` nhận cả dòng
thiếu mã, vì nó thêm luật riêng (`d.Length > 0`) và **thay thế** luật chung thay vì cộng
vào.

Người viết `NapJsonDeVo` không cố ý phá gì cả — họ thấy cần một điều kiện riêng và
`override` là cách hiển nhiên. Không có cảnh báo, không có lỗi. Dữ liệu hỏng chảy vào hệ
thống.

### Khung chắc — bước biến thiên là `abstract`, luật chung không `virtual`

```csharp
abstract class NapChac
{
    public (int nhan, int loai) Chay(string[] dong)
    {
        foreach (var d in dong)
        {
            var ma = LayMa(d);                                        // buoc bien thien
            if (string.IsNullOrWhiteSpace(ma)) { loai++; continue; }   // luat chung, lop con khong voi toi
            nhan++;
        }
        ...
    }
    protected abstract string LayMa(string d);
}
```

```text
=== Khung chac: template method sealed, buoc bien thien la abstract ===
  NapCsv           nhan 2 dong, loai 1 dong hong
  NapJson          nhan 2 dong, loai 1 dong hong
```

**Hai lớp con giờ cho cùng kết quả** trên phần luật chung. Lớp con chỉ được quyết định
*cách lấy mã*, không được quyết định *mã rỗng có hợp lệ không*.

Ba quy tắc rút ra:

| Quy tắc | Vì sao |
|---|---|
| Template method (`Chay`) là `public` và **không** `virtual` | Lớp con không đổi được trình tự |
| Bước **bắt buộc** biến thiên là `abstract` | Trình biên dịch buộc cài; không có `base` để quên |
| Bước **tuỳ chọn** là `virtual` với thân rỗng (hook) | Không có logic chung nên không có gì để mất |

Quy tắc thứ ba là mấu chốt: **`virtual` chỉ dành cho hook rỗng.** Bước nào có logic chung
mà vẫn `virtual` là cái bẫy ở output đầu tiên.

Ca hỏng đầy đủ: [Lớp con quên gọi base](../case-studies/lop-con-quen-goi-base.md).

### Cùng khung đó, viết bằng delegate

```csharp
static class NapBangHam
{
    public static (int nhan, int loai) Chay(string[] dong, Func<string, string> layMa) { ... }
}
```

```text
=== Cung khung do, viet bang delegate thay vi ke thua ===
  ham thuan       nhan 2 dong, loai 1 dong hong
```

Cùng kết quả, **không lớp nào cả**. Không có `base` để quên, không có cây kế thừa, và bước
biến thiên truyền vào lúc gọi — chọn được lúc chạy.

**Với một hoặc hai bước biến thiên, đây gần như luôn là lựa chọn tốt hơn trong C# hiện
đại.** Template Method bằng kế thừa chỉ thắng khi có nhiều bước liên quan chặt và chia sẻ
trạng thái với nhau.

### Trước và sau

| | `virtual` có logic chung | `abstract` + khung khoá | Delegate |
|---|---|---|---|
| Lớp con xoá được luật chung | **có** | không | không có luật để xoá |
| Trình biên dịch bắt lỗi thiếu bước | không | **có** | có (tham số bắt buộc) |
| Chọn biến thể lúc chạy | không | không | **có** |
| Nhiều bước chia sẻ trạng thái | dễ | dễ | phải truyền hoặc đóng gói |
| Số lớp cho n biến thể | n+1 | n+1 | 0 |

## Template Method và Strategy — chọn cái nào

| | Template Method | [Strategy](strategy.md) |
|---|---|---|
| Cắm bằng | Kế thừa (compile time) | Đối tượng (runtime) |
| Đổi được lúc chạy | không | có |
| Chia sẻ code chung | qua lớp cha, dễ | phải tự sắp xếp |
| Số bước biến thiên | Nhiều, liên quan nhau | Thường một |
| Rủi ro | Lớp con phá khung | Người gọi chọn sai strategy |

Quy tắc thực dụng: **một bước biến thiên → delegate hoặc Strategy. Từ ba bước liên quan
chặt trở lên → Template Method.** Vùng giữa thì chọn theo việc có cần đổi lúc chạy không.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Chỉ một bước biến thiên | Delegate ngắn hơn và không có bẫy `base` |
| Cần đổi biến thể lúc chạy | Kế thừa cố định lúc biên dịch |
| Các biến thể chỉ dùng một phần khung | Lớp con phải cài bước vô nghĩa; xem [ISP](../reference/solid.md#i--interface-segregation) |
| Cây kế thừa đã sâu 3 tầng trở lên | Không ai lần được bước nào chạy ở tầng nào |

## Trade-offs

| Được | Mất |
|---|---|
| Trình tự các bước có đúng một chủ | Kế thừa — coupling chặt nhất giữa hai lớp |
| Code chung không lặp lại | Lớp con phụ thuộc chi tiết cài đặt của lớp cha |
| Thêm biến thể chỉ cần cài các bước | Không đổi được lúc chạy |
| Đọc lớp cha là thấy toàn bộ quy trình | Đọc lớp con **không** thấy quy trình — phải mở lớp cha |

Dòng cuối là chi phí nhận thức thật: người sửa `NapJson` không thấy `Chay` ở đâu cả. Đó là
lý do Hollywood Principle ("đừng gọi chúng tôi, chúng tôi sẽ gọi bạn") vừa là ưu điểm vừa
là chỗ gây bối rối.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Cho bước có logic chung là `virtual` | Lớp con quên `base` → luật biến mất, không cảnh báo |
| Template method là `virtual` | Lớp con override cả trình tự — pattern mất hết ý nghĩa |
| Quá nhiều hook (8–10 điểm mở rộng) | Không ai biết bước nào chạy khi nào |
| Lớp cha gọi method `virtual` trong constructor | Lớp con chạy trước khi field của nó được khởi tạo |
| Bước `protected` bị đổi thành `public` | Bước nội bộ thành API công khai; không rút lại được |
| Dùng kế thừa chỉ để tái sử dụng code | Xem [Composition over inheritance](../reference/composition-over-inheritance.md) |

Dòng thứ tư là bẫy riêng của C#/.NET và rất khó lần: gọi method ảo trong constructor chạy
bản của lớp con, lúc đó field của lớp con vẫn là `null`/`0`.

## FAQ

<details>
<summary>Làm sao ngăn lớp con override template method?</summary>

Không đánh dấu `virtual` — mặc định trong C# method đã không ảo. Nếu template method
override từ một lớp cha khác, dùng `sealed override`:

```csharp
public sealed override void Chay() { ... }
```

Và nếu lớp chỉ có đúng một tầng con, `sealed class` cho các lớp con để không ai kế thừa
tiếp.

</details>

<details>
<summary>Hook rỗng hay bước abstract — chọn thế nào?</summary>

Hỏi: *lớp con không cài thì quy trình còn đúng không?*

- Còn đúng → **hook** `virtual` thân rỗng (`protected virtual void TruocKhiNap() { }`).
- Không đúng → **`abstract`**, để trình biên dịch bắt buộc.

Sai lầm phổ biến là dùng `virtual` với thân **có logic** cho trường hợp thứ hai — đúng cái
bẫy ở đầu trang.

</details>

<details>
<summary>Async thì Template Method viết thế nào?</summary>

Bước biến thiên trả `Task<T>`, template method là `async`:

```csharp
public async Task<KetQua> ChayAsync(CancellationToken ct)
{
    var ma = await LayMaAsync(d, ct);
    ...
}
protected abstract Task<string> LayMaAsync(string d, CancellationToken ct);
```

Nhớ truyền `CancellationToken` xuống mọi bước — quên một bước là quy trình không huỷ được,
và đó là loại lỗi chỉ lộ ra khi hệ thống đang tắt.

</details>

## Related Topics

- [Strategy](strategy.md) — cắm bằng đối tượng thay vì kế thừa
- [Composition over inheritance](../reference/composition-over-inheritance.md) — vì sao delegate thường thắng
- [Factory Method](factory-method.md) — thường là một bước trong template method
- [Decorator](decorator.md) — thêm hành vi mà không đụng tới kế thừa
- [SOLID](../reference/solid.md) — vi phạm LSP là rủi ro chính của pattern này

## References

- GoF — *Design Patterns*, Template Method
