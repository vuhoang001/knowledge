---
title: Giao hàng trước khi khách trả tiền
sidebar_position: 15
description: "enum cộng if không có chỗ nào giữ luật chuyển — đơn chưa thanh toán vẫn giao được, đã giao vẫn huỷ được, rồi giao lại lần hai."
tags: [case-study, state, strategy, state-machine, workflow]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Giao hàng trước khi khách trả tiền

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 25-state.cs`
> trên .NET 11.0.0.

## Bối cảnh

Vòng đời đơn hàng có bốn trạng thái, lưu trong một cột `varchar`:

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

Quy trình đúng theo nghiệp vụ: `Moi → DaThanhToan → DaGiao`, huỷ được ở hai trạng thái
đầu, `DaGiao` và `DaHuy` là trạng thái cuối.

Quy trình đó nằm trong tài liệu Confluence. Không nằm trong code.

## Triệu chứng

Ba sự cố riêng lẻ trong một quý, ban đầu không ai nối chúng lại:

| Sự cố | Số lượng |
|---|---|
| Đơn được giao khi chưa thanh toán | 34 đơn, tổng 41 triệu chưa thu |
| Đơn đã giao bị huỷ, khách được hoàn tiền nhưng vẫn giữ hàng | 6 đơn |
| Đơn được tạo phiếu giao **hai lần**, kho xuất hàng hai lần | 11 đơn |

```text
=== Enum + if: khong ai giu luat chuyen ===
  giao khi chua thanh toan     -> trang thai = DaGiao
  huy khi da giao              -> trang thai = DaHuy
  giao lai lan hai             -> trang thai = DaGiao
```

**Ba chuyển trạng thái trái phép liên tiếp, không exception nào.**

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Nhân viên thao tác sai quy trình | Ba sự cố khác nhau, đều liên quan người dùng | Đúng là họ bấm nhầm — nhưng hệ thống **cho phép** nên đó không phải nguyên nhân gốc |
| Thiếu đào tạo | Hệ quả tự nhiên của giả thuyết trên | Đào tạo lại: số sự cố giảm 60%, không về 0 |
| Cần thêm hộp thoại xác nhận | Giải pháp phổ biến nhất | Người dùng bấm OK theo phản xạ; sự cố quay lại sau ba tuần |
| Đua giữa hai tab | Giải thích được ca "giao hai lần" | Xảy ra cả khi một người, một tab |

Ba giả pháp đầu đều nhắm vào **con người**. Chúng giảm được triệu chứng nhưng không loại
bỏ được, vì chúng không đụng tới thứ cho phép sự cố xảy ra.

Câu hỏi mở ra hướng đúng: *"chỗ nào trong code nói rằng không được giao đơn chưa thanh
toán?"* Câu trả lời: **không có chỗ nào.**

## Nguyên nhân thật

Luật chuyển trạng thái **không tồn tại trong code**. Nó tồn tại trong đầu người và trong
tài liệu.

Muốn cưỡng chế bằng `enum + if`, mỗi thao tác phải tự kiểm trạng thái hiện tại:

```csharp
if (thao == "Giao")
{
    if (TrangThai != "DaThanhToan") throw ...;
    TrangThai = "DaGiao";
}
```

Và điều kiện đó phải lặp ở **mọi** chỗ chạm tới trạng thái: giao hàng, huỷ, hoàn tiền, in
hoá đơn, xuất kho, gửi thông báo. Sáu chỗ, sáu người viết, sáu thời điểm khác nhau.

**Bỏ sót một chỗ là thủng** — và không có gì liệt kê được danh sách sáu chỗ đó.

Đây cùng một họ với ca [sáu `switch` song song](them-loai-thu-nam-sua-bay-cho.md): một khái
niệm không có một chỗ nào sở hữu nó.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Test "thanh toán rồi giao" | Xanh | Đường đi hạnh phúc, đúng quy trình |
| Test "huỷ đơn mới" | Xanh | Cũng hợp lệ |
| Test cho các chuyển **trái phép** | **Không có** | Không ai viết test cho thứ lẽ ra không xảy ra được |
| Trình biên dịch | Im lặng | `TrangThai = "DaGiao"` là gán chuỗi hợp lệ |
| Kiểu dữ liệu | `string` | Không có ràng buộc nào |

Dòng thứ ba là điểm mấu chốt. Bộ test phủ **những gì hệ thống làm được**, không phủ
**những gì nó không được phép làm**. Với máy trạng thái, số chuyển **trái phép** thường
nhiều hơn số chuyển hợp lệ — và chúng là phần không được test.

Với 4 trạng thái × 3 thao tác = 12 chuyển có thể; chỉ 4 hợp lệ. Tám chuyển còn lại là tám
lỗ hổng chưa ai nhìn tới.

## Cách sửa

### Đưa luật vào từng trạng thái

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

Cả ba sự cố ở phần Triệu chứng đều bị chặn, và **người gọi không cần biết luật gì** — nên
không có chỗ nào để bỏ sót.

### Lợi ích kèm theo: bảng chuyển trở thành thứ liệt kê được

```text
=== Bang chuyen trang thai hop le ===
tu            thao tac    toi
----------------------------------------
Moi           ThanhToan   DaThanhToan
Moi           Huy         DaHuy
DaThanhToan   Giao        DaGiao
DaThanhToan   Huy         DaHuy
```

Bảng này **sinh ra từ code**, không viết tay. Đem đối chiếu với nghiệp vụ là kiểm được
ngay: bốn dòng, đúng bốn chuyển hợp lệ. Trước đó, không ai có cách nào khẳng định hệ thống
đang cho phép đúng những gì.

### Nếu không muốn 4 lớp — bảng chuyển

Khi các trạng thái chỉ khác nhau ở *đi đâu được*, không khác ở *làm gì*:

```csharp
private static readonly Dictionary<(string, string), string> _chuyen = new()
{
    [("Moi", "ThanhToan")] = "DaThanhToan",
    [("Moi", "Huy")] = "DaHuy",
    [("DaThanhToan", "Giao")] = "DaGiao",
    [("DaThanhToan", "Huy")] = "DaHuy",
};

public void Lam(string thao) =>
    TrangThai = _chuyen.TryGetValue((TrangThai, thao), out var toi)
        ? toi
        : throw new InvalidOperationException($"tu \"{TrangThai}\" khong lam duoc \"{thao}\"");
```

Bốn dòng dữ liệu, cưỡng chế đầy đủ, in ra được. **Với 4–10 trạng thái đây thường là điểm
cân bằng tốt nhất** — và nó là lựa chọn hay bị bỏ quên giữa `enum + if` và lớp State.

### Nhớ xử lý nạp từ CSDL

```csharp
private static ITrangThai Tu(string ten) => ten switch
{
    "Moi" => new Moi(), "DaThanhToan" => new DaThanhToan(),
    "DaGiao" => new DaGiao(), "DaHuy" => new DaHuy(),
    _ => throw new InvalidOperationException($"trang thai la: {ten}")
};
```

Nhánh mặc định **phải ném**. Trạng thái lạ trong CSDL là dấu hiệu dữ liệu hỏng — có thể
chính là 51 đơn ở phần Triệu chứng — không phải thứ để bỏ qua.

## Dấu hiệu nhận ra sớm

```sql
-- Dem cac chuyen trang thai da tung xay ra trong lich su
SELECT tu, thao_tac, toi, count(*) AS so_lan
FROM lich_su_don_hang
GROUP BY 1, 2, 3
ORDER BY so_lan;
```

So bảng này với bảng chuyển hợp lệ. Dòng nào xuất hiện trong dữ liệu mà không có trong
bảng hợp lệ là một lỗ hổng **đã bị khai thác**.

Ba câu hỏi cho code review:

1. Chỗ nào trong code nói rằng chuyển này hợp lệ? Nếu không chỉ ra được một dòng thì luật
   không tồn tại.
2. Có bao nhiêu chỗ gán `TrangThai =`? Trên 1 là luật đã phân tán.
3. Có test nào cho chuyển **trái phép** không? Số chuyển trái phép thường nhiều gấp đôi
   số hợp lệ.

## Related Topics

- [State](../skills/state.md) — ba cách hiện thực và chọn theo quy mô
- [Strategy](../skills/strategy.md) — cùng hình dạng, và vì sao không thay thế được ở đây
- [Case study — Design Patterns](index.md)
