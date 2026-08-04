---
title: Observer
sidebar_position: 19
description: "Một chỗ đổi, nhiều chỗ biết — và hai cái bẫy chạy ra được: quên huỷ đăng ký thì đối tượng không bao giờ được GC thu hồi, một observer ném thì các observer sau không chạy."
tags: [observer, behavioral, gof, event, memory-leak]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Observer

> **Chốt:** Trong C#, Observer là `event` — cài đặt không phải vấn đề. Hai vấn đề thật:
> **quên `-=` là rò rỉ bộ nhớ** (chứng minh bằng `WeakReference` ở dưới), và **một
> observer ném thì các observer sau không bao giờ chạy**.

## Mục tiêu

Cho phép nhiều chỗ phản ứng khi một chỗ thay đổi, mà nguồn không cần biết có bao nhiêu
chỗ đang nghe — và không tự tay tạo ra hai lỗi kinh điển kèm theo.

## Ý định gốc (GoF)

Định nghĩa quan hệ một–nhiều giữa các đối tượng, sao cho khi một đối tượng đổi trạng thái,
mọi đối tượng phụ thuộc được thông báo và cập nhật tự động.

```csharp
sealed class GiaCoPhieu
{
    public event Action<decimal>? Doi;
    public void Dat(decimal g) => Doi?.Invoke(g);
}
```

`event` của C# **là** Subject + danh sách Observer, có sẵn `+=` và `-=`.

## Ví dụ xuyên suốt — giá cổ phiếu

Chạy bằng `dotnet run 24-observer.cs` trên .NET 11.0.0.

### Bẫy 1 — rò rỉ bộ nhớ, chứng minh bằng GC

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

Hàm này tạo observer, đăng ký, rồi trả về — biến `ob` ra khỏi phạm vi. Sau `GC.Collect()`,
nếu không còn ai giữ nó thì `WeakReference.IsAlive` phải là `false`.

```text
=== Ro ri bo nho: quen huy dang ky ===
  Sau GC, observer con song? True  <- true nghia la BI RO RI
  So nguoi dang ky con lai: 1
  Co huy dang ky, con song? False
  So nguoi dang ky con lai: 0
```

**`True` nghĩa là GC không thu hồi được.** Nguồn (`GiaCoPhieu`) giữ delegate, delegate giữ
`this` của observer — nên chừng nào nguồn còn sống, mọi observer từng đăng ký đều còn
sống.

Đây là loại rò rỉ nguy hiểm vì hướng phụ thuộc **ngược với trực giác**: bạn nghĩ observer
phụ thuộc nguồn, nhưng chính nguồn đang giữ observer. Một `static event` hoặc một service
singleton là đủ để giữ sống mọi ViewModel từng mở trong suốt đời ứng dụng.

Ca hỏng đầy đủ:
[Sự kiện giữ đối tượng không cho GC](../case-studies/su-kien-giu-doi-tuong-khong-cho-gc.md).

### Bẫy 2 — một observer ném, các observer sau bị bỏ qua

```csharp
n3.Doi += g => log.Add($"A thay {g}");
n3.Doi += g => throw new InvalidOperationException("B hong");
n3.Doi += g => log.Add($"C thay {g}");
```

```text
=== Mot observer nem -> cac observer sau bi bo qua ===
  nem: InvalidOperationException: B hong
  observer da chay: [A thay 101]   <- C khong bao gio chay
```

`Doi?.Invoke(g)` gọi lần lượt các delegate trong danh sách; ngoại lệ ở delegate thứ hai
làm phần còn lại **không bao giờ chạy**. Observer `C` hoàn toàn vô tội và hoàn toàn bị bỏ
qua.

Hậu quả thực tế: bên gửi thông báo bị lỗi của bên nhận làm chết, và những bên nhận đăng ký
sau (thường là các tính năng thêm vào muộn) im lặng biến mất.

### Sửa — cô lập từng observer

```csharp
foreach (var a in _ds)
{
    try { a(g); }
    catch { loi++; }        // co lap: mot observer hong khong chan cac observer sau
}
```

```text
=== Cach lam: co lap tung observer ===
  observer da chay: [A thay 101, C thay 101]
  so observer nem loi: 1
```

Trong code thật, `catch` đó phải **ghi log** chứ không nuốt — nhưng nguyên tắc giữ nguyên:
lỗi của một người nghe không được lan sang người nghe khác, và không được làm chết nguồn.

### Bẫy 3 — thứ tự gọi là thứ tự đăng ký

```text
=== Thu tu goi = thu tu dang ky (khong duoc dua vao) ===
  thu ba -> thu nhat
```

Delegate thứ nhất đăng ký in `"thu ba"`, delegate thứ hai in `"thu nhat"` — và chúng chạy
đúng theo thứ tự đăng ký, không theo tên. Nghe hiển nhiên, nhưng thứ tự đăng ký phụ thuộc
thứ tự khởi tạo module, và **không phải hợp đồng nào cả**.

Nếu logic của bạn cần B chạy sau A, Observer là pattern sai. Dùng
[Chain of Responsibility](chain-of-responsibility.md) hoặc gọi tuần tự tường minh.

### Trước và sau

| | Gọi thẳng | Observer |
|---|---|---|
| Nguồn biết ai nghe | có | không |
| Thêm người nghe | sửa nguồn | `+=` ở chỗ khác |
| Thứ tự chạy | rõ trong code | theo thứ tự đăng ký, không đảm bảo |
| Một người nghe lỗi | chỉ nó lỗi | **chặn cả những người sau** |
| Vòng đời | không liên quan | nguồn giữ người nghe — rò rỉ nếu quên `-=` |
| Lần luồng khi debug | đọc thẳng | phải tìm mọi chỗ `+=` |

## Cách chặn rò rỉ, theo thứ tự ưu tiên

| Cách | Khi nào |
|---|---|
| **Huỷ đăng ký trong `Dispose`** | Mặc định. Nếu lớp đăng ký sự kiện thì nó nên `IDisposable` |
| **Vòng đời observer dài bằng nguồn** | Không cần huỷ — ví dụ cả hai là singleton |
| **Weak event pattern** | Khi không kiểm soát được vòng đời observer (framework UI) |
| **`IObservable<T>` + `IDisposable`** | Rx trả về `IDisposable` từ `Subscribe` — buộc bạn nghĩ về việc dừng |

Cách cuối đáng chú ý: `IObservable<T>` thiết kế API sao cho **huỷ đăng ký là thứ bạn cầm
trong tay**, thay vì một lời gọi `-=` dễ quên ở nơi khác.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Chỉ có một người nghe, cố định | Gọi thẳng — luồng đọc được, không rò rỉ |
| Thứ tự các phản ứng quan trọng | Observer không đảm bảo thứ tự |
| Cần biết kết quả của người nghe | Sự kiện là một chiều; dùng lời gọi có trả về |
| Phản ứng phải nằm trong cùng giao dịch | Người nghe chạy đồng bộ nhưng lỗi khó gộp vào transaction |
| Chuỗi sự kiện dây chuyền (A → B → C → A) | Vòng lặp sự kiện, rất khó lần |

## Trade-offs

| Được | Mất |
|---|---|
| Nguồn không biết ai nghe — thêm bớt tự do | Luồng thực thi biến mất khỏi code; debug bằng cách tìm `+=` |
| Nhiều phản ứng cho một thay đổi | Thứ tự không đảm bảo |
| Ghép module lỏng lẻo | Rò rỉ bộ nhớ nếu quên `-=` |
| Có sẵn trong ngôn ngữ (`event`) | Một observer lỗi chặn phần còn lại |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Quên `-=` khi observer hết vòng đời | Rò rỉ — `IsAlive` vẫn `True` như output trên |
| Đăng ký vào `static event` | Observer sống suốt đời tiến trình |
| Không cô lập ngoại lệ của người nghe | Người nghe đăng ký sau không bao giờ chạy |
| `+=` cùng một handler hai lần | Handler chạy hai lần; `-=` chỉ gỡ một |
| Dựa vào thứ tự đăng ký | Đổi thứ tự khởi tạo module là đổi hành vi |
| Người nghe làm việc nặng đồng bộ | Nguồn bị chặn; cân nhắc đẩy sang hàng đợi |
| `Doi.Invoke(g)` không có `?.` | `NullReferenceException` khi chưa ai đăng ký |

Dòng thứ tư đáng nhớ: `+=` cùng handler hai lần là chuyện thường gặp khi một view được
khởi tạo lại — và triệu chứng là "email gửi hai lần", không phải "lỗi".

## FAQ

<details>
<summary>Dùng <code>event</code>, <code>IObservable&lt;T&gt;</code>, hay message bus?</summary>

| | Phạm vi | Huỷ đăng ký | Hợp khi |
|---|---|---|---|
| `event` | Trong tiến trình, một–nhiều | `-=`, dễ quên | Đơn giản, ít người nghe |
| `IObservable<T>` (Rx) | Trong tiến trình | Trả `IDisposable` — khó quên hơn | Cần lọc, gộp, throttle luồng sự kiện |
| Message bus / hàng đợi | Nhiều tiến trình | Cấu hình | Cần bền bỉ, thử lại, nhiều dịch vụ |

Đi từ trên xuống, chọn cái đầu tiên đủ dùng.

</details>

<details>
<summary>Weak event pattern hoạt động thế nào?</summary>

Nguồn giữ `WeakReference` tới observer thay vì tham chiếu mạnh. Khi observer bị GC thu
hồi, mục tương ứng trong danh sách trở nên rỗng và bị dọn ở lần phát tiếp theo.

Cái giá: phức tạp hơn hẳn, và **hành vi phụ thuộc GC** — observer có thể ngừng nhận thông
báo ở một thời điểm không xác định. Chỉ dùng khi thật sự không kiểm soát được vòng đời;
với code mình sở hữu, `Dispose` đúng cách luôn tốt hơn.

</details>

<details>
<summary>Observer khác Mediator chỗ nào?</summary>

Xem [Mediator](mediator.md#faq): Observer là một chiều và nguồn không biết ai nghe;
Mediator hai chiều và trung gian biết tất cả, có luật điều phối.

Nếu bạn thấy mình viết `if` trong handler để quyết định "trường hợp này thì đừng làm gì" —
logic điều phối đang rò vào observer, và Mediator có thể là chỗ đúng cho nó.

</details>

## Related Topics

- [Mediator](mediator.md) — hai chiều, có luật điều phối
- [Chain of Responsibility](chain-of-responsibility.md) — khi thứ tự và quyền dừng quan trọng
- [Command](command.md) — sự kiện vật hoá thành đối tượng, xếp hàng được
- [Coupling và cohesion](../reference/coupling-cohesion.md) — event hạ coupling nhưng làm luồng vô hình
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng tra triệu chứng

## References

- GoF — *Design Patterns*, Observer
- Microsoft — *Observer Design Pattern* (.NET), `IObservable<T>` / `IObserver<T>`
