---
title: Hoàn tác hai lệnh, tồn kho từ 10 thành 24
sidebar_position: 13
description: "HoanTac tính ngược bằng số yêu cầu thay vì số đã thực hiện — chỉ sai khi có chặn trên, nên dữ liệu test đẹp không bao giờ bắt được."
tags: [case-study, command, memento, undo, inventory]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Hoàn tác hai lệnh, tồn kho từ 10 thành 24

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 19-command.cs`
> trên .NET 11.0.0.

## Bối cảnh

Màn hình xuất kho cho phép undo. Mỗi thao tác là một
[Command](../skills/command.md):

```csharp
sealed class XuatKhoTinhNguoc(TonKho kho, int yeuCau) : ILenh
{
    public void ThucThi() { DaXuat = Math.Min(yeuCau, kho.So); kho.So -= DaXuat; }
    public void HoanTac() => kho.So += yeuCau;          // SAI: cong lai so YEU CAU
}
```

`ThucThi` có kẹp giá trị (`Math.Min`) vì không thể xuất nhiều hơn số đang có.
`HoanTac` cộng lại số **yêu cầu**.

## Triệu chứng

Kiểm kê cuối tháng lệch: tồn kho hệ thống cao hơn tồn kho thực tế ở một số mã hàng.

```text
=== Undo sai: tinh nguoc bang cong thuc ===
  xuat 4  -> ton 6
  xuat 20 -> ton 0  (chi xuat duoc 6)
  undo    -> ton 20  <- ky vong 6
  undo    -> ton 24  <- ky vong 10
```

**Bắt đầu ở 10, kết thúc ở 24.** Mười bốn đơn vị hàng hoá được tạo ra từ hư không.

Triệu chứng không xuất hiện đều: phần lớn mã hàng vẫn khớp. Chỉ những mã **đã từng hết
hàng** mới lệch — và đội mất một tuần trước khi nhận ra mối liên hệ đó.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Nhập kho bị ghi hai lần | Tồn kho **cao** hơn thực tế | Đối chiếu phiếu nhập: số phiếu khớp |
| Đua giữa hai người cùng xuất một mã | Lệch không đều giữa các mã | Xảy ra cả khi chỉ một người thao tác |
| Kiểm kê thực tế đếm sót | Đổ lỗi cho con người | Đếm lại ba lần, vẫn lệch |
| Lỗi làm tròn | Kinh điển | Số nguyên, không có làm tròn nào |

Bước ngoặt: một người để ý rằng **mọi mã hàng lệch đều nằm trong danh sách "đã từng báo
hết hàng"**. Từ đó tới `Math.Min` là một bước ngắn.

## Nguyên nhân thật

`ThucThi()` có một **nhánh**: khi yêu cầu vượt tồn, nó chỉ xuất phần còn lại.

```csharp
DaXuat = Math.Min(yeuCau, kho.So);      // yeuCau = 20, kho.So = 6 -> DaXuat = 6
kho.So -= DaXuat;                       // ton = 0
```

`HoanTac()` không biết về nhánh đó. Nó cộng lại `yeuCau = 20`.

**Quy tắc bị vi phạm: `HoanTac()` phải dựa trên *cái đã xảy ra*, không phải *cái được yêu
cầu*.**

Chi tiết làm lỗi này sống lâu: khi `yeuCau <= kho.So` thì `yeuCau == DaXuat` và mọi thứ
khớp hoàn hảo. Lệch **chỉ xuất hiện ở biên** — đúng chỗ mà dữ liệu test hiếm khi chạm tới.

So sánh với một command viết đúng trong cùng hệ thống:

```csharp
sealed class VietHoaTatCa(VanBan vb) : ILenh
{
    private string _cu = "";
    public void ThucThi() { _cu = vb.NoiDung; vb.NoiDung = vb.NoiDung.ToUpperInvariant(); }
    public void HoanTac() => vb.NoiDung = _cu;
}
```

```text
=== Undo dung: luu trang thai cu ===
  sau 3 lenh : "XIN CHAO THE GIOI"
  undo       : "Xin chao the gioi"
  undo       : "Xin chao"
  undo       : ""
```

Lớp này **không thử tính ngược** (viết thường lại là phép nghịch không tồn tại). Nó lưu
chuỗi cũ. Người viết nó buộc phải nghĩ tới điều đó vì phép nghịch rõ ràng là bất khả;
người viết `XuatKho` thì không, vì phép nghịch *trông như* tồn tại.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Test "xuất rồi undo trả về số cũ" | Xanh | Dùng tồn kho 100, xuất 10 — không chạm biên |
| Test "xuất quá tồn thì chỉ xuất phần còn lại" | Xanh | Kiểm `ThucThi`, không kiểm `HoanTac` sau đó |
| Test tích hợp | Xanh | Dữ liệu seed luôn dư hàng |
| Trình biên dịch | Im lặng | `kho.So += yeuCau` hợp lệ |
| Kiểm kê tự động hằng đêm | Không có | Đây là thứ lẽ ra bắt được |

Dòng đầu là bài học: **test đúng kịch bản, sai dữ liệu.** Kịch bản "xuất rồi undo" có
trong bộ test; nó chỉ không bao giờ chạy với `yeuCau > kho.So`.

Test bắt được lỗi này là một *property test*:

```csharp
[Property] void Thuc_thi_roi_hoan_tac_luon_ve_trang_thai_ban_dau(int ton, int yeuCau)
{
    var kho = new TonKho(Math.Abs(ton) % 100);
    var truoc = kho.So;
    var l = new XuatKho(kho, Math.Abs(yeuCau) % 200);   // co the vuot ton
    l.ThucThi(); l.HoanTac();
    Assert.Equal(truoc, kho.So);
}
```

Bất biến *"thực thi rồi hoàn tác đưa về trạng thái ban đầu"* đúng cho **mọi** command, nên
viết một lần dùng cho tất cả.

## Cách sửa

### Lưu cái đã thật sự xảy ra

```csharp
sealed class XuatKhoLuuThat(TonKho kho, int yeuCau) : ILenh
{
    private int _daXuat;
    public void ThucThi() { _daXuat = Math.Min(yeuCau, kho.So); kho.So -= _daXuat; }
    public void HoanTac() => kho.So += _daXuat;         // DUNG: cong lai so DA XUAT
}
```

```text
=== Undo dung: luu so da xuat that su ===
  sau 2 lenh -> ton 0
  undo       -> ton 6  <- ky vong 6
  undo       -> ton 10  <- ky vong 10
```

### Hoặc: chuyển sang ảnh chụp

```csharp
public void ThucThi() { _truoc = kho.So; kho.So -= Math.Min(yeuCau, kho.So); }
public void HoanTac() => kho.So = _truoc;
```

[Memento](../skills/memento.md) **luôn đúng**, không cần suy luận về phép nghịch. Cái giá
là bộ nhớ theo kích thước trạng thái — với một số nguyên thì bằng không.

**Quy tắc thực dụng: bắt đầu bằng ảnh chụp; chuyển sang lệnh nghịch chỉ khi đã đo thấy bộ
nhớ là vấn đề.**

### Bảng quyết định

| `ThucThi()` có | `HoanTac()` viết thế nào |
|---|---|
| Không nhánh, phép toán khả nghịch | Lệnh nghịch được, nhưng ảnh chụp vẫn an toàn hơn |
| Có kẹp giá trị (`Min`, `Max`, `Clamp`) | **Bắt buộc** lưu giá trị đã dùng, hoặc ảnh chụp |
| Có nhánh `if` | Phải lưu nhánh nào đã chạy, hoặc ảnh chụp |
| Có thể thất bại một phần | Ảnh chụp |
| Tác dụng phụ ra ngoài (email, API) | **Không undo được** — thiết kế hành động bù trừ |

## Dấu hiệu nhận ra sớm

```bash
# HoanTac tham chieu tham so constructor thay vi field da luu
grep -rnA3 "public void HoanTac" --include=*.cs src/ | grep -E "\+= (yeuCau|soLuong|tien)\b"
```

Ba câu hỏi cho code review:

1. `ThucThi()` có nhánh nào không (`if`, `Min`, `Max`, try/catch)? Nếu có, `HoanTac()`
   có biết nhánh nào đã chạy không?
2. `HoanTac()` dùng **tham số** hay **field đã lưu lúc thực thi**? Tham số là mùi.
3. Có property test "thực thi rồi hoàn tác về trạng thái cũ" chạy với dữ liệu **ở biên**
   không?

Câu thứ hai là câu nhanh nhất: đọc `HoanTac()`, xem nó tham chiếu cái gì.

## Related Topics

- [Command](../skills/command.md) — hai chiến lược undo và khi nào dùng cái nào
- [Memento](../skills/memento.md) — undo bằng ảnh chụp, luôn đúng
- [Case study — Design Patterns](index.md)
