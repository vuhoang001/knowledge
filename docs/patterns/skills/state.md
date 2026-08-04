---
title: State
sidebar_position: 20
description: "Enum cộng if không có chỗ nào giữ luật chuyển trạng thái — đơn chưa thanh toán vẫn giao được, đã giao vẫn huỷ được, và không có lỗi nào."
tags: [state, behavioral, gof, state-machine, workflow]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# State

> **Chốt:** Khác biệt giữa `enum` và State không phải "ít `if` hơn". Là chỗ **giữ luật
> chuyển trạng thái**. Với `enum`, luật đó không nằm ở đâu cả — nên đơn hàng chưa thanh
> toán vẫn giao được, đã giao vẫn huỷ được, và không có gì báo.

## Mục tiêu

Biến "đơn hàng đi từ trạng thái nào sang trạng thái nào" từ một quy ước ngầm mà mọi người
phải nhớ, thành một thứ **code cưỡng chế được**.

## Ý định gốc (GoF)

Cho phép một đối tượng thay đổi hành vi khi trạng thái nội tại của nó thay đổi. Đối tượng
trông như đã đổi lớp.

```csharp
interface ITrangThai { string Ten { get; } ITrangThai Lam(string thao); }
```

Chi tiết quan trọng: `Lam` **trả về trạng thái kế tiếp**. Đó là chỗ luật chuyển nằm — mỗi
trạng thái tự biết mình đi đâu được.

## Ví dụ xuyên suốt — vòng đời đơn hàng

Chạy bằng `dotnet run 25-state.cs` trên .NET 11.0.0.

Quy trình đúng: `Moi → DaThanhToan → DaGiao`, và huỷ được ở hai trạng thái đầu.

### Trước — `enum` cộng `if`

```csharp
sealed class DonEnum
{
    public string TrangThai { get; private set; } = "Moi";
    public void Lam(string thao)
    {
        if (thao == "ThanhToan") TrangThai = "DaThanhToan";
        if (thao == "Giao") TrangThai = "DaGiao";        // khong kiem tra gi
        if (thao == "Huy") TrangThai = "DaHuy";          // khong kiem tra gi
    }
}
```

```text
=== Enum + if: khong ai giu luat chuyen ===
  giao khi chua thanh toan     -> trang thai = DaGiao
  huy khi da giao              -> trang thai = DaHuy
  giao lai lan hai             -> trang thai = DaGiao
```

**Ba chuyển trạng thái trái phép liên tiếp, không lỗi nào.** Hàng được giao trước khi
trả tiền, đơn đã giao bị huỷ, rồi lại giao lần hai.

Chú ý đây **không** phải lỗi cài đặt cẩu thả. Muốn chặn thì mỗi `if` phải kèm điều kiện
trạng thái hiện tại — và điều kiện đó phải lặp ở **mọi** method chạm tới trạng thái: huỷ,
hoàn tiền, in hoá đơn, xuất kho. Bỏ sót một chỗ là thủng.

### Sau — mỗi trạng thái biết mình đi đâu được

```csharp
sealed class Moi : ITrangThai
{
    public string Ten => "Moi";
    public ITrangThai Lam(string t) => t switch
    {
        "ThanhToan" => new DaThanhToan(),
        "Huy" => new DaHuy(),
        _ => throw new InvalidOperationException($"tu \"Moi\" khong lam duoc \"{t}\"")
    };
}
```

```text
=== State: moi trang thai biet minh di dau duoc ===
  giao khi chua thanh toan     -> TU CHOI: tu "Moi" khong lam duoc "Giao"
  thanh toan                   -> DaThanhToan
  giao                         -> DaGiao
  huy khi da giao              -> TU CHOI: tu "DaGiao" khong lam duoc "Huy" — day la trang thai cuoi
  giao lai lan hai             -> TU CHOI: tu "DaGiao" khong lam duoc "Giao" — day la trang thai cuoi
```

Ba thao tác trái phép bị chặn, hai thao tác hợp lệ chạy. **Luật nằm trong lớp trạng thái,
không nằm trong người gọi** — nên không có chỗ nào để bỏ sót.

### Lợi ích không ngờ — bảng chuyển trở thành thứ liệt kê được

```text
=== Bang chuyen trang thai hop le ===
tu            thao tac    toi
----------------------------------------
Moi           ThanhToan   DaThanhToan
Moi           Huy         DaHuy
DaThanhToan   Giao        DaGiao
DaThanhToan   Huy         DaHuy
```

Bảng này **sinh ra từ chính code**, không phải viết tay tài liệu:

```csharp
foreach (var tt in ds)
    foreach (var thao in new[] { "ThanhToan", "Giao", "Huy" })
    { try { toi = tt.Lam(thao); } catch (InvalidOperationException) { } ... }
```

Đó là thứ `enum + if` không cho: một máy trạng thái **tự mô tả được**. Bảng này đem đi
đối chiếu với nghiệp vụ, đem vào tài liệu, hoặc đem làm test.

### Trước và sau

| | `enum` + `if` | State |
|---|---|---|
| Chuyển trái phép | chạy bình thường | ném, có thông báo rõ |
| Nơi giữ luật chuyển | không có | trong từng lớp trạng thái |
| Thêm trạng thái mới | tìm mọi `if` liên quan | thêm 1 lớp; các lớp cũ tự từ chối |
| Liệt kê bảng chuyển | đọc code đoán | sinh tự động |
| Số lớp | 1 | 1 + số trạng thái |
| Đọc lần đầu | thấy hết trong một file | phải mở từng trạng thái |
| Lưu vào CSDL | một cột `varchar` | một cột + ánh xạ sang lớp |

Ca hỏng đầy đủ: [Chuyển trạng thái trái phép](../case-studies/chuyen-trang-thai-trai-phep.md).

## Ba cách hiện thực, chọn theo quy mô

| Cách | Số trạng thái | Ưu | Nhược |
|---|---|---|---|
| **`enum` + `switch` tập trung** | 2–3, luật đơn giản | Ít code nhất, thấy hết một chỗ | Không cưỡng chế nếu có nhiều điểm vào |
| **Bảng chuyển** `Dictionary<(TT, Thao), TT>` | 4–10 | Luật là **dữ liệu**, in ra được, cấu hình được | Không gắn được hành vi riêng vào từng trạng thái |
| **Lớp State (GoF)** | Nhiều, mỗi trạng thái có hành vi riêng | Hành vi và luật chuyển cùng chỗ | Nhiều lớp; trạng thái chia sẻ dữ liệu phải qua context |

**Bảng chuyển là điểm ngọt bị bỏ quên nhất.** Nếu các trạng thái chỉ khác nhau ở *đi đâu
được*, chứ không khác ở *làm gì*, thì bảng chuyển gọn hơn hẳn và vẫn cưỡng chế được:

```csharp
private static readonly Dictionary<(string, string), string> _chuyen = new()
{
    [("Moi", "ThanhToan")] = "DaThanhToan",
    [("Moi", "Huy")] = "DaHuy",
    [("DaThanhToan", "Giao")] = "DaGiao",
    [("DaThanhToan", "Huy")] = "DaHuy",
};
```

## Khi nào KHÔNG dùng lớp State

| Tình huống | Vì sao |
|---|---|
| 2–3 trạng thái, một điểm vào duy nhất | `switch` đủ và đọc nhanh hơn |
| Trạng thái không có hành vi riêng | Bảng chuyển gọn hơn |
| Không có luật chuyển (mọi trạng thái đi được tới mọi trạng thái) | Đó là một field, không phải máy trạng thái |
| "Trạng thái" thật ra là thuật toán chọn được | Đó là [Strategy](strategy.md) |

## Trade-offs

| Được | Mất |
|---|---|
| Chuyển trái phép bị chặn tại nguồn | Số lớp tăng theo số trạng thái |
| Luật chuyển ở một chỗ cho mỗi trạng thái | Nhìn toàn bộ máy trạng thái phải mở nhiều file |
| Thêm trạng thái không sửa trạng thái cũ | Thêm **thao tác** mới phải sửa mọi trạng thái |
| Bảng chuyển sinh tự động, đối chiếu được với nghiệp vụ | Lưu/nạp từ CSDL cần ánh xạ chuỗi ↔ lớp |

Dòng thứ ba là đánh đổi hai chiều quen thuộc: State dễ thêm *trạng thái*, khó thêm *thao
tác* — đúng ngược với [Visitor](visitor.md).

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Dùng `enum` cho quy trình có luật chuyển | Chuyển trái phép chạy im lặng — output đầu tiên |
| Để người gọi tự kiểm tra trạng thái trước khi gọi | Luật rải khắp nơi; sót một chỗ là thủng |
| Trạng thái giữ tham chiếu tới trạng thái kế tiếp lúc dựng | Vòng phụ thuộc; nên tạo trạng thái mới trong `Lam` |
| Trạng thái chứa dữ liệu nghiệp vụ (số tiền, mã đơn) | Chuyển trạng thái làm mất dữ liệu; dữ liệu thuộc về context |
| Quên xử lý nạp trạng thái từ CSDL | Đơn nạp lên bắt đầu ở `Moi` dù đã giao |
| Cho phép chuyển về chính nó mà không nghĩ | `DaGiao → DaGiao` là idempotent hay là lỗi? Phải quyết định rõ |

Dòng cuối đáng nghĩ trước khi viết dòng code đầu: gọi `Giao` hai lần là lỗi, hay là thao
tác lặp vô hại? Câu trả lời khác nhau cho hệ thống có retry và hệ thống không có.

## FAQ

<details>
<summary>State khác Strategy chỗ nào?</summary>

Xem bảng đầy đủ ở [Chọn pattern nào](../reference/choosing-a-pattern.md#ví-dụ-xuyên-suốt--bằng-chứng-ba-pattern-không-thay-thế-nhau).

Tóm tắt: State **biết trạng thái kế tiếp** và tự chuyển; Strategy không biết gì về các
strategy khác và người gọi chọn. Gọi cùng một method hai lần: Strategy cho cùng kết quả,
State cho kết quả khác.

</details>

<details>
<summary>Lưu trạng thái vào CSDL thế nào?</summary>

Lưu **tên trạng thái** dạng chuỗi, và có một hàm ánh xạ chuỗi → lớp khi nạp:

```csharp
private static ITrangThai Tu(string ten) => ten switch
{
    "Moi" => new Moi(), "DaThanhToan" => new DaThanhToan(),
    "DaGiao" => new DaGiao(), "DaHuy" => new DaHuy(),
    _ => throw new InvalidOperationException($"trang thai la: {ten}")
};
```

Hai điều bắt buộc: **đừng lưu số thứ tự enum** (chèn giá trị mới vào giữa là đổi nghĩa dữ
liệu cũ), và **nhánh mặc định phải ném** — trạng thái lạ trong CSDL là dấu hiệu dữ liệu
hỏng, không phải thứ để bỏ qua.

</details>

<details>
<summary>Có thư viện máy trạng thái cho .NET không?</summary>

Có (Stateless là phổ biến nhất). Chúng cho khai báo luật chuyển dưới dạng cấu hình, kèm
sẵn guard condition, hành động khi vào/ra trạng thái, và trạng thái lồng nhau.

Đáng dùng khi máy trạng thái có trên ~6 trạng thái hoặc cần các tính năng trên. Dưới mức
đó, bảng chuyển tự viết ít phụ thuộc hơn và đủ tốt.

</details>

## Related Topics

- [Strategy](strategy.md) — cùng hình dạng, không có luật chuyển
- [Memento](memento.md) — lưu và khôi phục trạng thái của máy trạng thái
- [Command](command.md) — thao tác gây chuyển trạng thái, hoàn tác được
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng phân biệt State/Strategy/Command
- [SOLID](../reference/solid.md) — thêm trạng thái không sửa code cũ là O

## References

- GoF — *Design Patterns*, State
